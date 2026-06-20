import re
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import Attachment, AttachmentKind, Lead, Ticket, User, UserRole
from app.schemas import AttachmentOut

router = APIRouter(tags=["attachments"])

UPLOAD_BASE = Path(settings.UPLOAD_DIR)
MAX_BYTES = 20 * 1024 * 1024  # 20 MB hard limit


def _safe_name(name: str) -> str:
    return re.sub(r"[^\w.\-]", "_", name)


def _save(upload: UploadFile, subdir: str) -> tuple[str, str]:
    """Persist upload to disk. Returns (relative_path, original_filename)."""
    target = UPLOAD_BASE / subdir
    target.mkdir(parents=True, exist_ok=True)
    original = upload.filename or "file"
    stored = f"{uuid.uuid4().hex}_{_safe_name(original)}"
    contents = upload.file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "File exceeds 20 MB limit")
    (target / stored).write_bytes(contents)
    return str(Path(subdir) / stored), original


def _out(att: Attachment) -> AttachmentOut:
    return AttachmentOut(
        id=att.id,
        lead_id=att.lead_id,
        ticket_id=att.ticket_id,
        kind=att.kind,
        file_name=att.file_name,
        mime_type=att.mime_type,
        uploaded_by=att.uploaded_by,
        uploader_name=att.uploader.name if att.uploader else None,
        uploaded_at=att.uploaded_at,
    )


# ── Lead attachments ──────────────────────────────────────────────────────────

@router.get("/leads/{lead_id}/attachments", response_model=List[AttachmentOut])
def list_lead_attachments(
    lead_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not db.query(Lead).filter(Lead.id == lead_id).first():
        raise HTTPException(404, "Lead not found")
    atts = (
        db.query(Attachment)
        .filter(Attachment.lead_id == lead_id, Attachment.ticket_id == None)
        .order_by(Attachment.uploaded_at.desc())
        .all()
    )
    return [_out(a) for a in atts]


@router.post("/leads/{lead_id}/attachments", response_model=AttachmentOut, status_code=201)
def upload_lead_attachment(
    lead_id: int,
    file: UploadFile = File(...),
    kind: str = Form("general"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Lead).filter(Lead.id == lead_id).first():
        raise HTTPException(404, "Lead not found")
    try:
        att_kind = AttachmentKind(kind)
    except ValueError:
        raise HTTPException(400, f"Invalid kind '{kind}'")

    rel_path, orig = _save(file, f"leads/{lead_id}")
    att = Attachment(
        lead_id=lead_id,
        kind=att_kind,
        file_name=orig,
        file_path=rel_path,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return _out(att)


# ── Ticket attachments ────────────────────────────────────────────────────────

@router.get("/tickets/{ticket_id}/attachments", response_model=List[AttachmentOut])
def list_ticket_attachments(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not db.query(Ticket).filter(Ticket.id == ticket_id).first():
        raise HTTPException(404, "Ticket not found")
    atts = (
        db.query(Attachment)
        .filter(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.uploaded_at.desc())
        .all()
    )
    return [_out(a) for a in atts]


@router.post("/tickets/{ticket_id}/attachments", response_model=AttachmentOut, status_code=201)
def upload_ticket_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    kind: str = Form("general"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    try:
        att_kind = AttachmentKind(kind)
    except ValueError:
        raise HTTPException(400, f"Invalid kind '{kind}'")

    # Grading reports only on sample_request tickets
    if att_kind == AttachmentKind.grading_report and ticket.type != "sample_request":
        raise HTTPException(400, "Grading reports can only be attached to sample request tickets")

    rel_path, orig = _save(file, f"tickets/{ticket_id}")
    att = Attachment(
        lead_id=ticket.lead_id,
        ticket_id=ticket_id,
        kind=att_kind,
        file_name=orig,
        file_path=rel_path,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by=current_user.id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return _out(att)


# ── Download ──────────────────────────────────────────────────────────────────

@router.get("/attachments/{att_id}/download")
def download_attachment(
    att_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    att = db.query(Attachment).filter(Attachment.id == att_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    full = UPLOAD_BASE / att.file_path
    if not full.exists():
        raise HTTPException(404, "File missing from storage")
    return FileResponse(str(full), media_type=att.mime_type, filename=att.file_name)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/attachments/{att_id}", status_code=204)
def delete_attachment(
    att_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    att = db.query(Attachment).filter(Attachment.id == att_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    if att.uploaded_by != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(403, "Only the uploader or an admin can delete this file")
    full = UPLOAD_BASE / att.file_path
    if full.exists():
        full.unlink()
    db.delete(att)
    db.commit()
