import enum
from datetime import datetime, date

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, ForeignKey,
    Integer, Numeric, Text, event
)
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.utcnow()


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    sales = "sales"
    product = "product"
    tech = "tech"
    admin = "admin"


class WinProbability(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Priority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class CapabilityMatch(str, enum.Enum):
    supported = "supported"
    needs_model = "needs_model"
    unknown = "unknown"


class LeadStatus(str, enum.Enum):
    new = "new"
    active = "active"
    idle = "idle"
    won = "won"
    lost = "lost"
    dropped = "dropped"


class TicketType(str, enum.Enum):
    analysis_request = "analysis_request"
    sample_request = "sample_request"
    general = "general"
    new_commodity = "new_commodity"
    new_variety = "new_variety"
    quality_mismatch = "quality_mismatch"
    accuracy_issue = "accuracy_issue"


class TeamTarget(str, enum.Enum):
    sales = "sales"
    product = "product"
    tech = "tech"


class CommentVisibility(str, enum.Enum):
    shared = "shared"
    sales_private = "sales_private"


class EntityType(str, enum.Enum):
    lead = "lead"
    ticket = "ticket"


class AttachmentKind(str, enum.Enum):
    general = "general"
    grading_report = "grading_report"


# ── Models ─────────────────────────────────────────────────────────────────────

def _enum(py_enum, **kw):
    """Create a native_enum=False Enum column type for SQLite+Postgres compat."""
    return Enum(py_enum, native_enum=False, **kw)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(_enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(Text, nullable=False)
    crop = Column(Text, nullable=False)
    variety = Column(Text, nullable=False)
    deadline = Column(Date, nullable=False)
    value_mt = Column(Numeric, nullable=True)
    value_inr = Column(Numeric, nullable=True)
    win_probability = Column(_enum(WinProbability), nullable=False)
    priority = Column(_enum(Priority), nullable=False)
    suggested_priority = Column(_enum(Priority), nullable=True)
    capability_match = Column(_enum(CapabilityMatch), default=CapabilityMatch.unknown, nullable=False)
    status = Column(_enum(LeadStatus), default=LeadStatus.new, nullable=False)
    terminal_reason = Column(Text, nullable=True)
    lead_source = Column(Text, nullable=True)
    contact_name = Column(Text, nullable=True)
    contact_phone = Column(Text, nullable=True)
    contact_email = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    tickets = relationship("Ticket", back_populates="lead", order_by="Ticket.created_at")
    comments = relationship("Comment", back_populates="lead", order_by="Comment.created_at")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    type = Column(_enum(TicketType), nullable=False)
    to_team = Column(_enum(TeamTarget), nullable=False)
    status = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    sample_raw_kg = Column(Numeric, nullable=True)
    sample_cleaned_g = Column(Numeric, nullable=True)
    needed_by = Column(Date, nullable=True)
    is_on_hold = Column(Boolean, default=False, nullable=False)
    hold_until_days_left = Column(Integer, nullable=True)
    rejected_reason = Column(Text, nullable=True)
    partial_note = Column(Text, nullable=True)
    at_risk = Column(Boolean, default=False, nullable=False)
    sla_clock_started_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    lead = relationship("Lead", back_populates="tickets")
    creator = relationship("User", foreign_keys=[created_by])
    comments = relationship("Comment", back_populates="ticket")
    attachments = relationship("Attachment", back_populates="ticket")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    attached_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    visibility = Column(_enum(CommentVisibility), default=CommentVisibility.shared, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    lead = relationship("Lead", back_populates="comments")
    ticket = relationship("Ticket", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


class StatusHistory(Base):
    """Append-only archive. Never UPDATE or DELETE rows from this table."""
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(_enum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=False, index=True)
    from_status = Column(Text, nullable=True)
    to_status = Column(Text, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime, default=_utcnow, nullable=False)
    note = Column(Text, nullable=True)

    changer = relationship("User", foreign_keys=[changed_by])


class Capability(Base):
    __tablename__ = "capabilities"

    id = Column(Integer, primary_key=True, index=True)
    crop = Column(Text, nullable=False)
    variety = Column(Text, nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    adder = relationship("User", foreign_keys=[added_by])


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    kind = Column(_enum(AttachmentKind), default=AttachmentKind.general, nullable=False)
    file_name = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=_utcnow, nullable=False)

    lead = relationship("Lead", foreign_keys=[lead_id])
    ticket = relationship("Ticket", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Text, nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    recipient = relationship("User", foreign_keys=[recipient_id])


# ── Guard: block UPDATE/DELETE on status_history at the ORM level ──────────────

@event.listens_for(StatusHistory, "before_update")
def _block_status_history_update(mapper, connection, target):
    raise RuntimeError("status_history is append-only — UPDATE is forbidden.")


@event.listens_for(StatusHistory, "before_delete")
def _block_status_history_delete(mapper, connection, target):
    raise RuntimeError("status_history is append-only — DELETE is forbidden.")
