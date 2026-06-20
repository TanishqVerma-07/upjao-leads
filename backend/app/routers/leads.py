from typing import List, Optional
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models import (
    Comment, CommentVisibility, EntityType, Lead, LeadStatus,
    Priority, Ticket, User, UserRole,
)
from app.services.notifications import notify
from app.schemas import (
    CommentCreate, CommentOut, FeedItem,
    LeadCreate, LeadOut, LeadOutcome, LeadUpdate, TicketOut,
)
from app.services.tickets import enrich_ticket
from app.ws import manager


def _ticket_out(db: Session, ticket: Ticket) -> TicketOut:
    return TicketOut(
        **{c.name: getattr(ticket, c.name) for c in ticket.__table__.columns},
        **enrich_ticket(db, ticket),
    )
from app.services.leads import (
    archive, compute_capability_match, compute_lead_status,
    compute_suggested_priority, enrich,
)

router = APIRouter(prefix="/leads", tags=["leads"])

_sales_only = require_role(UserRole.sales)
_any_role = get_current_user

_PRIORITY_ORDER = {Priority.P1: 0, Priority.P2: 1, Priority.P3: 2, Priority.P4: 3}


def _to_out(lead: Lead, extra: dict) -> LeadOut:
    return LeadOut(
        **{c.name: getattr(lead, c.name) for c in lead.__table__.columns},
        **extra,
    )


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(
    body: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_sales_only),
):
    suggested = compute_suggested_priority(body.value_inr, body.win_probability)
    cap_match = compute_capability_match(db, body.crop, body.variety)

    lead = Lead(
        client_name=body.client_name,
        crop=body.crop,
        variety=body.variety,
        deadline=body.deadline,
        value_mt=body.value_mt,
        value_inr=body.value_inr,
        win_probability=body.win_probability,
        priority=body.priority,
        suggested_priority=suggested,
        capability_match=cap_match,
        status=LeadStatus.new,
        lead_source=body.lead_source,
        contact_name=body.contact_name,
        contact_phone=body.contact_phone,
        contact_email=body.contact_email,
        created_by=current_user.id,
    )
    db.add(lead)
    db.flush()

    archive(db, EntityType.lead, lead.id, None, LeadStatus.new, current_user.id, "Lead created")

    if body.notes:
        db.add(Comment(
            lead_id=lead.id,
            author_id=current_user.id,
            body=body.notes,
            visibility=CommentVisibility.sales_private,
        ))

    db.commit()
    db.refresh(lead)
    return _to_out(lead, enrich(db, lead))


@router.get("", response_model=List[LeadOut])
def list_leads(
    crop: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(_any_role),
):
    q = db.query(Lead)
    if crop:
        q = q.filter(Lead.crop.ilike(f"%{crop}%"))
    if status:
        q = q.filter(Lead.status == status)
    if priority:
        q = q.filter(Lead.priority == priority)

    leads = q.all()
    enriched = [(_to_out(l, enrich(db, l))) for l in leads]
    enriched.sort(key=lambda x: (_PRIORITY_ORDER.get(x.priority, 9), x.days_left))
    return enriched


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_any_role),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return _to_out(lead, enrich(db, lead))


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_sales_only),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(lead, field, val)

    if body.value_inr is not None or body.win_probability is not None:
        lead.suggested_priority = compute_suggested_priority(lead.value_inr, lead.win_probability)

    if body.crop is not None or body.variety is not None:
        lead.capability_match = compute_capability_match(db, lead.crop, lead.variety)

    db.commit()
    db.refresh(lead)
    return _to_out(lead, enrich(db, lead))


@router.post("/{lead_id}/outcome", response_model=LeadOut)
def set_outcome(
    lead_id: int,
    body: LeadOutcome,
    db: Session = Depends(get_db),
    current_user: User = Depends(_sales_only),
):
    if body.status not in (LeadStatus.won, LeadStatus.lost, LeadStatus.dropped):
        raise HTTPException(400, "status must be won, lost, or dropped")
    if not body.reason or not body.reason.strip():
        raise HTTPException(400, "reason is required")

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    old_status = lead.status
    lead.status = body.status
    lead.terminal_reason = body.reason.strip()
    db.flush()

    archive(db, EntityType.lead, lead.id, old_status, body.status, current_user.id, body.reason.strip())

    db.commit()
    db.refresh(lead)
    return _to_out(lead, enrich(db, lead))


@router.get("/{lead_id}/capability-hint")
def capability_hint(
    lead_id: int = None,
    crop: str = Query(...),
    variety: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(_any_role),
):
    match = compute_capability_match(db, crop, variety)
    return {"capability_match": match, "suggested_priority": None}


@router.get("/{lead_id}/feed", response_model=List[FeedItem])
def get_feed(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_any_role),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    is_product = current_user.role == UserRole.product

    tickets = db.query(Ticket).filter(Ticket.lead_id == lead_id).all()
    comments = db.query(Comment).filter(Comment.lead_id == lead_id).all()

    items: List[FeedItem] = []

    for t in tickets:
        items.append(FeedItem(
            kind="ticket",
            created_at=t.created_at,
            ticket=_ticket_out(db, t),
        ))

    for c in comments:
        if is_product and c.visibility == CommentVisibility.sales_private:
            continue
        author = db.query(User).filter(User.id == c.author_id).first()
        items.append(FeedItem(
            kind="comment",
            created_at=c.created_at,
            comment=CommentOut(
                id=c.id,
                lead_id=c.lead_id,
                attached_ticket_id=c.attached_ticket_id,
                author_id=c.author_id,
                author_name=author.name if author else None,
                body=c.body,
                visibility=c.visibility.value if hasattr(c.visibility, "value") else str(c.visibility),
                created_at=c.created_at,
            ),
        ))

    items.sort(key=lambda x: x.created_at)
    return items


@router.post("/{lead_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    lead_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_any_role),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    if body.visibility == "sales_private" and current_user.role == UserRole.product:
        raise HTTPException(403, "Product team cannot post private notes")

    if body.attached_ticket_id:
        ticket = db.query(Ticket).filter(
            Ticket.id == body.attached_ticket_id, Ticket.lead_id == lead_id
        ).first()
        if not ticket:
            raise HTTPException(400, "Ticket not found on this lead")

    visibility = CommentVisibility(body.visibility) if body.visibility in ("shared", "sales_private") else CommentVisibility.shared

    comment = Comment(
        lead_id=lead_id,
        author_id=current_user.id,
        body=body.body,
        visibility=visibility,
        attached_ticket_id=body.attached_ticket_id,
    )
    db.add(comment)
    db.flush()

    # Notify involved users
    msg = f"New comment on {lead.client_name} ({lead.crop}) by {current_user.name}"
    if visibility == CommentVisibility.sales_private:
        # Private note — notify Sales teammates only
        for u in db.query(User).filter(User.role == UserRole.sales, User.is_active == True, User.id != current_user.id).all():
            notify(db, u.id, "comment", msg, lead_id=lead_id)
    else:
        target_role = UserRole.product if current_user.role == UserRole.sales else UserRole.sales
        for u in db.query(User).filter(User.role == target_role, User.is_active == True, User.id != current_user.id).all():
            notify(db, u.id, "comment", msg, lead_id=lead_id)

    db.commit()
    db.refresh(comment)

    # Broadcast to all connected users (private notes go to sales/admin only)
    if visibility == CommentVisibility.sales_private:
        manager.schedule({"type": "feed_update", "lead_id": lead_id}, only_roles={"sales", "admin"})
    else:
        manager.schedule({"type": "feed_update", "lead_id": lead_id})

    return CommentOut(
        id=comment.id,
        lead_id=comment.lead_id,
        attached_ticket_id=comment.attached_ticket_id,
        author_id=comment.author_id,
        author_name=current_user.name,
        body=comment.body,
        visibility=comment.visibility.value if hasattr(comment.visibility, "value") else str(comment.visibility),
        created_at=comment.created_at,
    )
