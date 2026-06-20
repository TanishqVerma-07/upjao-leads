from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import (
    EntityType, Lead, LeadStatus, StatusHistory,
    Ticket, TicketType, User, UserRole,
)

router = APIRouter(prefix="/admin", tags=["admin"])
_admin = require_role(UserRole.admin)


# ── Archive ───────────────────────────────────────────────────────────────────

class ArchiveRow:
    """Simple DTO — we build a plain dict so Pydantic doesn't need a model."""
    pass


@router.get("/archive")
def get_archive(
    entity_type: Optional[str] = Query(None, description="lead or ticket"),
    entity_id:   Optional[int] = Query(None),
    user_id:     Optional[int] = Query(None),
    from_date:   Optional[date] = Query(None),
    to_date:     Optional[date] = Query(None),
    page:        int = Query(1, ge=1),
    size:        int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
):
    q = db.query(StatusHistory)

    if entity_type:
        try:
            q = q.filter(StatusHistory.entity_type == EntityType(entity_type))
        except ValueError:
            pass

    if entity_id is not None:
        q = q.filter(StatusHistory.entity_id == entity_id)

    if user_id is not None:
        q = q.filter(StatusHistory.changed_by == user_id)

    if from_date:
        q = q.filter(StatusHistory.changed_at >= datetime.combine(from_date, datetime.min.time()))

    if to_date:
        q = q.filter(StatusHistory.changed_at <= datetime.combine(to_date, datetime.max.time()))

    total = q.count()
    rows = q.order_by(StatusHistory.changed_at.desc()).offset((page - 1) * size).limit(size).all()

    # Enrich with user name
    user_cache: dict[int, str] = {}
    def user_name(uid: int) -> str:
        if uid not in user_cache:
            u = db.query(User).filter(User.id == uid).first()
            user_cache[uid] = u.name if u else f"User #{uid}"
        return user_cache[uid]

    return {
        "total": total,
        "page": page,
        "size": size,
        "rows": [
            {
                "id": r.id,
                "entity_type": r.entity_type,
                "entity_id": r.entity_id,
                "from_status": r.from_status,
                "to_status": r.to_status,
                "changed_by_id": r.changed_by,
                "changed_by_name": user_name(r.changed_by),
                "changed_at": r.changed_at.isoformat(),
                "note": r.note,
            }
            for r in rows
        ],
    }


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(_admin),
):
    all_leads   = db.query(Lead).all()
    all_tickets = db.query(Ticket).all()

    # ── Lead counts by status ─────────────────────────────────────────────────
    lead_counts = {s.value: 0 for s in LeadStatus}
    for lead in all_leads:
        lead_counts[lead.status.value] = lead_counts.get(lead.status.value, 0) + 1

    # ── Priority breakdown ────────────────────────────────────────────────────
    priority_counts = {"P1": 0, "P2": 0, "P3": 0, "P4": 0}
    for lead in all_leads:
        priority_counts[lead.priority] = priority_counts.get(lead.priority, 0) + 1

    # ── Win rate by crop ──────────────────────────────────────────────────────
    crop_stats: dict[str, dict] = {}
    for lead in all_leads:
        c = lead.crop
        if c not in crop_stats:
            crop_stats[c] = {"crop": c, "total": 0, "won": 0}
        crop_stats[c]["total"] += 1
        if lead.status == LeadStatus.won:
            crop_stats[c]["won"] += 1
    win_rate_by_crop = sorted(
        [
            {**v, "rate": round(v["won"] / v["total"], 2) if v["total"] else 0}
            for v in crop_stats.values()
        ],
        key=lambda x: -x["total"],
    )

    # ── Avg days from lead created → first terminal ticket ────────────────────
    velocity_days = []
    terminal = {"Done", "Received", "Closed"}
    for lead in all_leads:
        done_tickets = [
            t for t in lead.tickets
            if t.status in terminal
        ]
        if done_tickets:
            earliest = min(t.updated_at for t in done_tickets)
            delta = (earliest.date() - lead.created_at.date()).days
            if delta >= 0:
                velocity_days.append(delta)

    avg_velocity = round(sum(velocity_days) / len(velocity_days), 1) if velocity_days else None

    # ── Ticket breakdown ──────────────────────────────────────────────────────
    type_counts = {t.value: 0 for t in TicketType}
    at_risk = 0
    for t in all_tickets:
        type_counts[t.type.value] = type_counts.get(t.type.value, 0) + 1
        if t.at_risk:
            at_risk += 1

    return {
        "lead_counts":      lead_counts,
        "priority_counts":  priority_counts,
        "win_rate_by_crop": win_rate_by_crop,
        "avg_days_to_done": avg_velocity,
        "ticket_type_counts": type_counts,
        "at_risk_count":    at_risk,
        "total_leads":      len(all_leads),
        "total_tickets":    len(all_tickets),
    }
