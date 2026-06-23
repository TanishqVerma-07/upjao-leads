from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_role
from app.models import Lead, Priority, Ticket, TicketType, TeamTarget, User, UserRole
from app.schemas import TicketOut
from app.services.tickets import OPEN_STATUSES, enrich_ticket

router = APIRouter(prefix="/queues", tags=["queues"])

_PRIORITY_ORDER = {Priority.P1: 0, Priority.P2: 1, Priority.P3: 2, Priority.P4: 3}


def _build_queue(db: Session, team: TeamTarget) -> List[TicketOut]:
    tickets = (
        db.query(Ticket)
        .filter(
            Ticket.to_team == team,
            Ticket.is_on_hold == False,
            Ticket.hold_until_days_left == None,
        )
        .all()
    )
    # Keep only open (non-terminal) tickets
    open_tickets = [t for t in tickets if t.status in OPEN_STATUSES]

    results = []
    for t in open_tickets:
        extra = enrich_ticket(db, t)
        results.append(TicketOut(
            **{c.name: getattr(t, c.name) for c in t.__table__.columns},
            **extra,
        ))

    # Sort by lead priority then days_left
    results.sort(key=lambda x: (
        _PRIORITY_ORDER.get(x.lead_priority, 9) if x.lead_priority else 9,
        x.days_left,
    ))
    return results


@router.get("/sales", response_model=List[TicketOut])
def sales_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.sales, UserRole.admin)),
):
    return _build_queue(db, TeamTarget.sales)


@router.get("/product", response_model=List[TicketOut])
def product_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.product, UserRole.admin)),
):
    return _build_queue(db, TeamTarget.product)


@router.get("/tech", response_model=List[TicketOut])
def tech_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.tech, UserRole.admin)),
):
    return _build_queue(db, TeamTarget.tech)
