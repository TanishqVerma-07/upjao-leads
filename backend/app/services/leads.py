from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models import (
    Capability, CapabilityMatch, Comment, CommentVisibility,
    EntityType, Lead, LeadStatus, Priority, StatusHistory,
    Ticket, WinProbability,
)

_WIN_WEIGHT = {WinProbability.high: 1.0, WinProbability.medium: 0.6, WinProbability.low: 0.3}

# Absolute INR score thresholds (value_inr × win_weight)
_P1_THRESHOLD = 2_000_000
_P2_THRESHOLD = 1_000_000
_P3_THRESHOLD = 400_000


def compute_suggested_priority(value_inr: Optional[Decimal], win_prob: WinProbability) -> Optional[Priority]:
    if value_inr is None:
        return None
    score = float(value_inr) * _WIN_WEIGHT[win_prob]
    if score >= _P1_THRESHOLD:
        return Priority.P1
    if score >= _P2_THRESHOLD:
        return Priority.P2
    if score >= _P3_THRESHOLD:
        return Priority.P3
    return Priority.P4


def compute_capability_match(db: Session, crop: str, variety: str) -> CapabilityMatch:
    exists = db.query(Capability).filter(
        Capability.crop.ilike(crop),
        Capability.variety.ilike(variety),
        Capability.is_active == True,
    ).first()
    return CapabilityMatch.supported if exists else CapabilityMatch.needs_model


def compute_lead_status(db: Session, lead: Lead) -> LeadStatus:
    if lead.status in (LeadStatus.won, LeadStatus.lost, LeadStatus.dropped):
        return lead.status
    tickets = db.query(Ticket).filter(Ticket.lead_id == lead.id).all()
    if not tickets:
        return LeadStatus.new
    open_statuses = {
        "New", "Accepted", "AI Analysing", "Open", "Contacted Lead", "Partial Sample",
        "Under Review", "In Progress", "Deployed",
    }
    has_open = any(t.status in open_statuses and not t.is_on_hold for t in tickets)
    return LeadStatus.active if has_open else LeadStatus.idle


def days_left(deadline: date) -> int:
    return (deadline - date.today()).days


def archive(db: Session, entity_type: EntityType, entity_id: int,
            from_status, to_status, changed_by: int, note: str = None):
    db.add(StatusHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        from_status=str(from_status) if from_status else None,
        to_status=str(to_status),
        changed_by=changed_by,
        changed_at=datetime.utcnow(),
        note=note,
    ))


def enrich(db: Session, lead: Lead) -> dict:
    ticket_count = db.query(Ticket).filter(Ticket.lead_id == lead.id).count()
    return {
        "days_left": days_left(lead.deadline),
        "ticket_count": ticket_count,
        "creator_name": lead.creator.name if lead.creator else None,
    }
