from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models import (
    EntityType, Lead, Ticket, TicketType,
    TeamTarget, User, UserRole,
)
from app.schemas import (
    TicketCreate, TicketHold, TicketHoldUntil, TicketOut, TicketStatusUpdate,
)
from app.services.leads import archive, enrich as lead_enrich
from app.services.tickets import (
    INITIAL_STATUS, OPEN_STATUSES, advance_status, default_to_team, enrich_ticket,
)
from app.services.notifications import notify
from app.ws import manager

router = APIRouter(tags=["tickets"])


def _ticket_out(db: Session, ticket: Ticket) -> TicketOut:
    return TicketOut(
        **{c.name: getattr(ticket, c.name) for c in ticket.__table__.columns},
        **enrich_ticket(db, ticket),
    )


# ── Create ticket inside a lead ───────────────────────────────────────────────

@router.post("/leads/{lead_id}/tickets", response_model=TicketOut, status_code=201)
def create_ticket(
    lead_id: int,
    body: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    to_team = default_to_team(body.type)
    if body.type == TicketType.general:
        if not body.to_team:
            raise HTTPException(400, "to_team is required for general tickets")
        to_team = body.to_team

    # Role restriction: analysis_request only by sales, sample_request only by product
    if body.type == TicketType.analysis_request and current_user.role != UserRole.sales:
        raise HTTPException(403, "Only Sales can raise Analysis Request tickets")
    if body.type == TicketType.sample_request and current_user.role != UserRole.product:
        raise HTTPException(403, "Only Product can raise Sample Request tickets")
    # New commodity/variety requests originate from Sales spotting an unsupported
    # crop or variety on a lead — Product then reviews and decides.
    if body.type in (TicketType.new_commodity, TicketType.new_variety) and current_user.role != UserRole.sales:
        raise HTTPException(403, "Only Sales can raise this ticket type")
    # Tech Requests go straight to the Tech queue — any internal team can raise one.
    if body.type == TicketType.tech_request and current_user.role == UserRole.admin:
        raise HTTPException(403, "Admin cannot raise tickets")

    ticket = Ticket(
        lead_id=lead_id,
        type=body.type,
        to_team=to_team,
        status=INITIAL_STATUS[body.type],
        body=body.body,
        sample_raw_kg=body.sample_raw_kg,
        sample_cleaned_g=body.sample_cleaned_g,
        needed_by=body.needed_by or lead.deadline,
        created_by=current_user.id,
    )
    db.add(ticket)
    db.flush()

    archive(db, EntityType.ticket, ticket.id, None, ticket.status, current_user.id)

    # Notify target team
    msg = f"New {body.type.value.replace('_',' ')} from {current_user.name} on {lead.client_name}"
    for u in db.query(User).filter(User.role == to_team.value, User.is_active == True, User.id != current_user.id).all():
        notify(db, u.id, "new_ticket", msg, lead_id=lead_id, ticket_id=ticket.id)

    db.commit()
    db.refresh(ticket)
    manager.schedule({"type": "feed_update", "lead_id": lead_id})
    manager.schedule({"type": "queue_update"})
    return _ticket_out(db, ticket)


@router.get("/leads/{lead_id}/tickets", response_model=List[TicketOut])
def list_lead_tickets(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = db.query(Ticket).filter(Ticket.lead_id == lead_id).order_by(Ticket.created_at).all()
    return [_ticket_out(db, t) for t in tickets]


# ── Ticket status transition ───────────────────────────────────────────────────

@router.patch("/tickets/{ticket_id}/status", response_model=TicketOut)
def update_ticket_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    advance_status(db, ticket, body.status, body.rejected_reason, current_user.id,
                   changer_role=current_user.role, partial_note=body.partial_note)
    db.commit()
    db.refresh(ticket)
    manager.schedule({"type": "feed_update", "lead_id": ticket.lead_id})
    manager.schedule({"type": "queue_update"})
    return _ticket_out(db, ticket)


# ── On Hold toggle ─────────────────────────────────────────────────────────────

@router.patch("/tickets/{ticket_id}/hold", response_model=TicketOut)
def toggle_hold(
    ticket_id: int,
    body: TicketHold,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    ticket.is_on_hold = body.is_on_hold
    note = "Placed on hold" if body.is_on_hold else "Resumed from hold"
    archive(db, EntityType.ticket, ticket.id, ticket.status, ticket.status, current_user.id, note)
    db.commit()
    db.refresh(ticket)
    return _ticket_out(db, ticket)


# ── Hold-until snooze ─────────────────────────────────────────────────────────

@router.patch("/tickets/{ticket_id}/hold-until", response_model=TicketOut)
def hold_until(
    ticket_id: int,
    body: TicketHoldUntil,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")

    ticket.hold_until_days_left = body.days_left
    ticket.is_on_hold = body.days_left is not None
    note = f"Snoozed until {body.days_left} days left" if body.days_left else "Snooze cleared"
    archive(db, EntityType.ticket, ticket.id, ticket.status, ticket.status, current_user.id, note)
    db.commit()
    db.refresh(ticket)
    return _ticket_out(db, ticket)
