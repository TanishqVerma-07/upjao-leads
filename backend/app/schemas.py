from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models import UserRole, WinProbability, Priority, CapabilityMatch, LeadStatus, TicketType, TeamTarget


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    role: UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Lead schemas ──────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    client_name: str
    crop: str
    variety: str
    deadline: date
    value_mt: Optional[Decimal] = None
    value_inr: Optional[Decimal] = None
    win_probability: WinProbability
    priority: Priority
    lead_source: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None  # stored as sales_private comment


class LeadUpdate(BaseModel):
    client_name: Optional[str] = None
    crop: Optional[str] = None
    variety: Optional[str] = None
    deadline: Optional[date] = None
    value_mt: Optional[Decimal] = None
    value_inr: Optional[Decimal] = None
    win_probability: Optional[WinProbability] = None
    priority: Optional[Priority] = None
    lead_source: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class LeadOutcome(BaseModel):
    status: LeadStatus  # won | lost | dropped
    reason: str


class LeadOut(BaseModel):
    id: int
    client_name: str
    crop: str
    variety: str
    deadline: date
    value_mt: Optional[Decimal]
    value_inr: Optional[Decimal]
    win_probability: WinProbability
    priority: Priority
    suggested_priority: Optional[Priority]
    capability_match: CapabilityMatch
    status: LeadStatus
    terminal_reason: Optional[str]
    lead_source: Optional[str]
    contact_name: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: datetime
    # computed
    days_left: int
    ticket_count: int
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Ticket schemas ────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    type: TicketType
    body: str
    to_team: Optional[TeamTarget] = None   # required for general tickets
    sample_raw_kg: Optional[Decimal] = None
    sample_cleaned_g: Optional[Decimal] = None
    needed_by: Optional[date] = None


class TicketStatusUpdate(BaseModel):
    status: str
    rejected_reason: Optional[str] = None
    partial_note: Optional[str] = None


class TicketHold(BaseModel):
    is_on_hold: bool


class TicketHoldUntil(BaseModel):
    days_left: Optional[int] = None  # None clears the snooze


class TicketOut(BaseModel):
    id: int
    lead_id: int
    type: TicketType
    to_team: TeamTarget
    status: str
    body: str
    sample_raw_kg: Optional[Decimal]
    sample_cleaned_g: Optional[Decimal]
    needed_by: Optional[date]
    is_on_hold: bool
    hold_until_days_left: Optional[int]
    rejected_reason: Optional[str]
    partial_note: Optional[str]
    at_risk: bool
    sla_clock_started_at: Optional[datetime]
    created_by: int
    created_at: datetime
    updated_at: datetime
    # computed
    days_left: int
    creator_name: Optional[str] = None
    lead_client: Optional[str] = None
    lead_priority: Optional[str] = None

    class Config:
        from_attributes = True


# ── Comment schemas ───────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    body: str
    visibility: str = "shared"          # "shared" | "sales_private"
    attached_ticket_id: Optional[int] = None


class CommentOut(BaseModel):
    id: int
    lead_id: int
    attached_ticket_id: Optional[int]
    author_id: int
    author_name: Optional[str] = None
    body: str
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Feed item ─────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: int
    type: str
    lead_id: Optional[int]
    ticket_id: Optional[int]
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Capability schemas ────────────────────────────────────────────────────────

class CapabilityCreate(BaseModel):
    crop: str
    variety: str


class CapabilityOut(BaseModel):
    id: int
    crop: str
    variety: str
    is_active: bool
    added_by: int
    adder_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Attachment schemas ────────────────────────────────────────────────────────

class AttachmentOut(BaseModel):
    id: int
    lead_id: Optional[int]
    ticket_id: Optional[int]
    kind: str
    file_name: str
    mime_type: str
    uploaded_by: int
    uploader_name: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class FeedItem(BaseModel):
    kind: str                           # "ticket" | "comment"
    created_at: datetime
    ticket: Optional[TicketOut] = None
    comment: Optional[CommentOut] = None
