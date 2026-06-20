from typing import Optional
from sqlalchemy.orm import Session

from app.models import Notification
from app.ws import manager


def notify(
    db: Session,
    recipient_id: int,
    notif_type: str,
    message: str,
    lead_id: Optional[int] = None,
    ticket_id: Optional[int] = None,
) -> Notification:
    """Create a notification row and push it to the recipient's WebSocket."""
    n = Notification(
        recipient_id=recipient_id,
        type=notif_type,
        lead_id=lead_id,
        ticket_id=ticket_id,
        message=message,
    )
    db.add(n)
    db.flush()  # assigns n.id before commit

    manager.schedule_to_user(recipient_id, {
        "type": "notification",
        "id": n.id,
        "notif_type": notif_type,
        "message": message,
        "lead_id": lead_id,
        "ticket_id": ticket_id,
        "is_read": False,
    })
    return n
