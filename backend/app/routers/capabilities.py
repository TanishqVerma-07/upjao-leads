from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_role
from app.models import Capability, Lead, User, UserRole
from app.schemas import CapabilityCreate, CapabilityOut
from app.services.leads import compute_capability_match

router = APIRouter(prefix="/capabilities", tags=["capabilities"])


def _enrich(cap: Capability) -> CapabilityOut:
    return CapabilityOut(
        id=cap.id,
        crop=cap.crop,
        variety=cap.variety,
        is_active=cap.is_active,
        added_by=cap.added_by,
        adder_name=cap.adder.name if cap.adder else None,
        created_at=cap.created_at,
    )


def _recompute_all_leads(db: Session):
    """After catalog changes, refresh capability_match on every non-terminal lead."""
    for lead in db.query(Lead).all():
        lead.capability_match = compute_capability_match(db, lead.crop, lead.variety)


@router.get("", response_model=List[CapabilityOut])
def list_capabilities(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    caps = db.query(Capability).order_by(Capability.crop, Capability.variety).all()
    return [_enrich(c) for c in caps]


@router.post("", response_model=CapabilityOut, status_code=201)
def add_capability(
    body: CapabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.product)),
):
    crop = body.crop.strip()
    variety = body.variety.strip()
    if not crop or not variety:
        raise HTTPException(400, "crop and variety are required")

    # Prevent exact duplicate (case-insensitive)
    existing = db.query(Capability).filter(
        Capability.crop.ilike(crop),
        Capability.variety.ilike(variety),
    ).first()
    if existing:
        if existing.is_active:
            raise HTTPException(409, f"{crop} / {variety} is already in the catalog")
        # Reactivate the soft-deleted entry instead of creating a duplicate
        existing.is_active = True
        db.commit()
        db.refresh(existing)
        _recompute_all_leads(db)
        db.commit()
        return _enrich(existing)

    cap = Capability(crop=crop, variety=variety, added_by=current_user.id)
    db.add(cap)
    db.commit()
    db.refresh(cap)
    _recompute_all_leads(db)
    db.commit()
    return _enrich(cap)


@router.patch("/{cap_id}/toggle", response_model=CapabilityOut)
def toggle_capability(
    cap_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.product)),
):
    cap = db.query(Capability).filter(Capability.id == cap_id).first()
    if not cap:
        raise HTTPException(404, "Capability not found")

    cap.is_active = not cap.is_active
    db.commit()
    db.refresh(cap)
    _recompute_all_leads(db)
    db.commit()
    return _enrich(cap)


@router.delete("/{cap_id}", status_code=204)
def delete_capability(
    cap_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.product)),
):
    cap = db.query(Capability).filter(Capability.id == cap_id).first()
    if not cap:
        raise HTTPException(404, "Capability not found")
    db.delete(cap)
    db.commit()
    _recompute_all_leads(db)
    db.commit()
