from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import (
    EntityType, Lead, Notification, StatusHistory,
    Ticket, TicketType, TeamTarget, User, UserRole,
)
from app.services.leads import archive, days_left

# ── Status transition maps ────────────────────────────────────────────────────

INITIAL_STATUS = {
    TicketType.analysis_request: "New",
    TicketType.sample_request: "New",
    TicketType.general: "Open",
    TicketType.new_commodity: "New",
    TicketType.new_variety: "New",
    TicketType.quality_mismatch: "New",
    TicketType.accuracy_issue: "New",
}

# Each status maps to a list of allowed next statuses
FORWARD_TRANSITIONS = {
    TicketType.analysis_request: {
        "New":          ["Accepted"],
        "Accepted":     ["AI Analysing"],
        "AI Analysing": ["Done"],
    },
    TicketType.sample_request: {
        "New":            ["Contacted Lead", "Partial Sample"],
        "Contacted Lead": ["Received", "Partial Sample"],
        "Partial Sample": ["Received"],
    },
    TicketType.general: {
        "Open": ["Closed"],
    },
    # Sales flags a commodity/variety Product doesn't support yet —
    # Product reviews and decides whether to add it to the capability catalog.
    TicketType.new_commodity: {
        "New":          ["Under Review"],
        "Under Review": ["Approved"],
    },
    TicketType.new_variety: {
        "New":          ["Under Review"],
        "Under Review": ["Approved"],
    },
    # Raised when multiple grading reports on the same sample don't agree —
    # Product re-tests and resolves the discrepancy.
    TicketType.quality_mismatch: {
        "New":        ["Re-Testing"],
        "Re-Testing": ["Resolved"],
    },
    # Raised when a grading/analysis result's accuracy is below the expected bar.
    TicketType.accuracy_issue: {
        "New":          ["Under Review"],
        "Under Review": ["Resolved"],
    },
}

# (ticket_type, from_status, to_status) → roles allowed to make this move
# None means any role is allowed
TRANSITION_ROLES = {
    (TicketType.sample_request, "New",            "Contacted Lead"): [UserRole.sales],
    (TicketType.sample_request, "New",            "Partial Sample"): [UserRole.sales],
    (TicketType.sample_request, "Contacted Lead", "Received"):       [UserRole.sales],
    (TicketType.sample_request, "Contacted Lead", "Partial Sample"): [UserRole.sales],
    (TicketType.sample_request, "Partial Sample", "Received"):       [UserRole.product],
}

TERMINAL_STATUSES = {"Done", "Received", "Closed", "Rejected", "Approved", "Resolved"}

# Statuses that count as "open" for queue/lead-status logic
OPEN_STATUSES = {
    "New", "Accepted", "AI Analysing", "Open",
    "Contacted Lead", "Partial Sample",
    "Under Review", "Re-Testing",
}


def default_to_team(ticket_type: TicketType) -> Optional[TeamTarget]:
    if ticket_type == TicketType.analysis_request:
        return TeamTarget.product
    if ticket_type in (
        TicketType.new_commodity, TicketType.new_variety,
        TicketType.quality_mismatch, TicketType.accuracy_issue,
    ):
        return TeamTarget.product
    if ticket_type == TicketType.sample_request:
        return TeamTarget.sales
    return None


def enrich_ticket(db: Session, ticket: Ticket) -> dict:
    lead = db.query(Lead).filter(Lead.id == ticket.lead_id).first()
    creator = db.query(User).filter(User.id == ticket.created_by).first()
    return {
        "days_left": days_left(lead.deadline) if lead else 0,
        "creator_name": creator.name if creator else None,
        "lead_client": lead.client_name if lead else None,
        "lead_priority": lead.priority if lead else None,
    }


def _notify(db: Session, lead_id: int, ticket_id: int, to_team: TeamTarget,
            msg: str, notif_type: str, excluding_user_id: int):
    users = db.query(User).filter(
        User.role == to_team.value,
        User.is_active == True,
        User.id != excluding_user_id,
    ).all()
    for u in users:
        db.add(Notification(
            recipient_id=u.id,
            type=notif_type,
            lead_id=lead_id,
            ticket_id=ticket_id,
            message=msg,
        ))


def advance_status(
    db: Session,
    ticket: Ticket,
    new_status: str,
    rejected_reason: Optional[str],
    changed_by: int,
    changer_role: Optional[UserRole] = None,
    partial_note: Optional[str] = None,
):
    # ── Reject path ──────────────────────────────────────────────────────────
    if new_status == "Rejected":
        if not rejected_reason or not rejected_reason.strip():
            raise HTTPException(400, "rejected_reason is required when rejecting")
        if ticket.status in TERMINAL_STATUSES:
            raise HTTPException(400, f"Ticket is already terminal ({ticket.status})")
        old = ticket.status
        ticket.status = "Rejected"
        ticket.rejected_reason = rejected_reason.strip()
        archive(db, EntityType.ticket, ticket.id, old, "Rejected", changed_by, rejected_reason.strip())
        return

    # ── Forward path ─────────────────────────────────────────────────────────
    allowed = FORWARD_TRANSITIONS.get(ticket.type, {}).get(ticket.status, [])
    if new_status not in allowed:
        raise HTTPException(
            400,
            f"Invalid transition: {ticket.status} → {new_status}. "
            f"Allowed: {allowed or 'none (terminal)'}",
        )

    # Role check
    role_key = (ticket.type, ticket.status, new_status)
    required_roles = TRANSITION_ROLES.get(role_key)
    if required_roles and changer_role not in required_roles:
        raise HTTPException(403, f"Only {[r.value for r in required_roles]} can make this transition")

    old = ticket.status
    ticket.status = new_status

    if new_status == "Partial Sample":
        ticket.partial_note = (partial_note or "").strip() or None

    # SLA clock starts when Sales first contacts the lead — 48 business hours to complete
    if ticket.type == TicketType.sample_request and new_status == "Contacted Lead":
        ticket.sla_clock_started_at = datetime.utcnow()

    archive(db, EntityType.ticket, ticket.id, old, new_status, changed_by,
            partial_note if new_status == "Partial Sample" else None)

    _notify(db, ticket.lead_id, ticket.id, ticket.to_team,
            f"Ticket status updated to '{new_status}'", "status_change", changed_by)
