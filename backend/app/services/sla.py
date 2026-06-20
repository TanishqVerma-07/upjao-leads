import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Lead, TeamTarget, Ticket, TicketType, User, UserRole
from app.services.leads import days_left
from app.services.notifications import notify

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")
UTC = ZoneInfo("UTC")

_TERMINAL = {"Done", "Received", "Closed", "Rejected"}
_SLA_CLOCK_STATUSES = {"Contacted Lead", "Partial Sample"}  # open states with an active 48h clock


def business_hours_elapsed(
    start_utc: datetime,
    end_utc: datetime,
    biz_start_h: int = 9,
    biz_end_h: int = 18,
    biz_weekdays: tuple = (0, 1, 2, 3, 4, 5),  # Mon–Sat
) -> float:
    """Return the number of business hours (IST) between two UTC datetimes."""
    if start_utc.tzinfo is None:
        start_utc = start_utc.replace(tzinfo=UTC)
    if end_utc.tzinfo is None:
        end_utc = end_utc.replace(tzinfo=UTC)

    start_ist = start_utc.astimezone(IST)
    end_ist = end_utc.astimezone(IST)

    if end_ist <= start_ist:
        return 0.0

    total = 0.0
    cur_date = start_ist.date()
    end_date = end_ist.date()

    while cur_date <= end_date:
        if cur_date.weekday() in biz_weekdays:
            biz_start = datetime(cur_date.year, cur_date.month, cur_date.day,
                                 biz_start_h, 0, 0, tzinfo=IST)
            biz_end = datetime(cur_date.year, cur_date.month, cur_date.day,
                               biz_end_h, 0, 0, tzinfo=IST)
            window_start = max(start_ist, biz_start)
            window_end = min(end_ist, biz_end)
            if window_end > window_start:
                total += (window_end - window_start).total_seconds() / 3600
        cur_date += timedelta(days=1)

    return total


def _notify_role(db: Session, role: UserRole, notif_type: str, message: str,
                 lead_id: int, ticket_id: int):
    users = db.query(User).filter(
        User.role == role,
        User.is_active == True,
    ).all()
    for u in users:
        notify(db, u.id, notif_type, message, lead_id=lead_id, ticket_id=ticket_id)


def _lead_client(db: Session, lead_id: int) -> str:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    return lead.client_name if lead else f"Lead #{lead_id}"


def _check(db: Session):
    now = datetime.utcnow()

    for t in db.query(Ticket).all():
        if t.status in _TERMINAL:
            continue

        if t.is_on_hold:
            _check_hold_resurfacing(db, t)
            continue

        # ── 48 business-hour SLA (sample requests in active collection) ──────
        if (
            t.type == TicketType.sample_request
            and t.status in _SLA_CLOCK_STATUSES
            and t.sla_clock_started_at is not None
            and not t.at_risk
        ):
            elapsed = business_hours_elapsed(
                t.sla_clock_started_at, now,
                settings.SLA_BIZ_START_H,
                settings.SLA_BIZ_END_H,
            )
            if elapsed >= settings.SLA_HOURS_LIMIT:
                t.at_risk = True
                client = _lead_client(db, t.lead_id)
                msg = (
                    f"⚠ SLA breach: sample request for {client} "
                    f"has been active for {int(elapsed)}+ business hours"
                )
                _notify_role(db, UserRole.sales,   "sla_breach", msg, t.lead_id, t.id)
                _notify_role(db, UserRole.product, "sla_breach", msg, t.lead_id, t.id)
                _notify_role(db, UserRole.admin,   "sla_breach", msg, t.lead_id, t.id)

        # ── 5-day stall (any open ticket past calendar threshold) ─────────────
        if not t.at_risk:
            age_days = (now - t.created_at).days
            if age_days >= settings.SLA_STALL_DAYS:
                t.at_risk = True
                client = _lead_client(db, t.lead_id)
                kind = t.type.value.replace("_", " ")
                msg = (
                    f"⚠ Stalled: {kind} for {client} "
                    f"has been open for {age_days} days"
                )
                target = (
                    UserRole.product
                    if t.to_team == TeamTarget.product
                    else UserRole.sales
                )
                _notify_role(db, target,           "sla_breach", msg, t.lead_id, t.id)
                _notify_role(db, UserRole.admin,   "sla_breach", msg, t.lead_id, t.id)


def _check_hold_resurfacing(db: Session, t: Ticket):
    if t.hold_until_days_left is None:
        return

    lead = db.query(Lead).filter(Lead.id == t.lead_id).first()
    if lead is None:
        return

    dl = days_left(lead.deadline)
    if dl <= t.hold_until_days_left:
        t.is_on_hold = False
        t.hold_until_days_left = None
        kind = t.type.value.replace("_", " ")
        msg = (
            f"\U0001f514 Resurfaced: snoozed {kind} for {lead.client_name} "
            f"is back — {dl} days left until deadline"
        )
        target = (
            UserRole.product
            if t.to_team == TeamTarget.product
            else UserRole.sales
        )
        _notify_role(db, target,         "hold_resurfaced", msg, t.lead_id, t.id)
        _notify_role(db, UserRole.admin, "hold_resurfaced", msg, t.lead_id, t.id)


def run_sla_check():
    """Entry point called by the scheduler. Creates its own DB session."""
    db: Session = SessionLocal()
    try:
        _check(db)
        db.commit()
        logger.debug("SLA check completed")
    except Exception:
        db.rollback()
        logger.exception("SLA check failed")
    finally:
        db.close()
