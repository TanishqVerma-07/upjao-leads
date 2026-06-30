"""
Run from backend/: python seed.py
Creates demo users, capabilities, leads, tickets, and comments.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, timedelta, datetime
from app.database import SessionLocal, engine
from app.models import (
    Base, User, Lead, Ticket, Comment, StatusHistory, Capability, Notification,
    UserRole, WinProbability, Priority, CapabilityMatch, LeadStatus,
    TicketType, TeamTarget, CommentVisibility, EntityType,
)
import bcrypt


def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def seed():
    db = SessionLocal()

    # ── Users ──────────────────────────────────────────────────────────────────
    admin = User(name="Admin User", email="admin@upjao.com",
                 password_hash=hash_pw("admin123"), role=UserRole.admin)
    sales1 = User(name="Priya Sharma", email="priya@upjao.com",
                  password_hash=hash_pw("sales123"), role=UserRole.sales)
    sales2 = User(name="Ravi Kumar", email="ravi@upjao.com",
                  password_hash=hash_pw("sales123"), role=UserRole.sales)
    siddhi = User(name="Siddhi Rao", email="siddhi@upjao.com",
                  password_hash=hash_pw("sales123"), role=UserRole.sales)
    pratamesh = User(name="Pratamesh", email="pratamesh@upjao.com",
                      password_hash=hash_pw("sales123"), role=UserRole.sales)
    product1 = User(name="Ananya Singh", email="ananya@upjao.com",
                    password_hash=hash_pw("product123"), role=UserRole.product)
    product2 = User(name="Dev Patel", email="dev@upjao.com",
                    password_hash=hash_pw("product123"), role=UserRole.product)
    sindhuja = User(name="Sindhuja", email="sindhuja@upjao.com",
                     password_hash=hash_pw("product123"), role=UserRole.product)
    hemali = User(name="Hemali", email="hemali@upjao.com",
                  password_hash=hash_pw("product123"), role=UserRole.product)
    # Tech / ML-engineering team — owns model training, formula fixes, deploys
    tech1 = User(name="Pranav Asthana", email="pranav@upjao.com",
                 password_hash=hash_pw("tech123"), role=UserRole.tech)
    tech2 = User(name="Pramod Swain", email="pramod@upjao.com",
                 password_hash=hash_pw("tech123"), role=UserRole.tech)

    db.add_all([admin, sales1, sales2, siddhi, pratamesh,
                product1, product2, sindhuja, hemali, tech1, tech2])
    db.flush()

    priya, ravi = sales1, sales2  # readable aliases used in later demo leads

    # ── Capabilities ───────────────────────────────────────────────────────────
    caps = [
        Capability(crop="Rice", variety="IR64", added_by=product1.id),
        Capability(crop="Wheat", variety="Default", added_by=product1.id),
        Capability(crop="Maize", variety="Default", added_by=product2.id),
        Capability(crop="Paddy", variety="Default", added_by=product2.id),
        Capability(crop="Soybean", variety="Default", added_by=product1.id),
        Capability(crop="Mustard", variety="Default", added_by=product2.id),
    ]
    db.add_all(caps)
    db.flush()

    # ── Lead 1 — Rice, active with tickets ────────────────────────────────────
    lead1 = Lead(
        client_name="AgroTech Solutions",
        crop="Rice",
        variety="IR64",
        deadline=date.today() + timedelta(days=14),
        value_mt=50,
        value_inr=2500000,
        win_probability=WinProbability.high,
        priority=Priority.P1,
        suggested_priority=Priority.P1,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.active,
        lead_source="Referral",
        contact_name="Suresh Mehta",
        contact_phone="+91-9876543210",
        created_by=sales1.id,
    )
    db.add(lead1)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead1.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=sales1.id, note="Lead created",
    ))

    ticket1 = Ticket(
        lead_id=lead1.id,
        type=TicketType.analysis_request,
        to_team=TeamTarget.product,
        status="New",
        body="Please analyse IR64 rice sample for moisture and protein content.",
        created_by=sales1.id,
    )
    db.add(ticket1)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket1.id,
        from_status=None, to_status="New",
        changed_by=sales1.id,
    ))

    db.add(Comment(
        lead_id=lead1.id, author_id=sales1.id,
        body="Client is expecting results within 2 weeks.",
        visibility=CommentVisibility.shared,
    ))
    db.add(Comment(
        lead_id=lead1.id, author_id=sales1.id,
        body="Internal note: client has budget approved, high close probability.",
        visibility=CommentVisibility.sales_private,
    ))
    db.add(Comment(
        lead_id=lead1.id, attached_ticket_id=ticket1.id, author_id=product1.id,
        body="Accepted. Will begin AI analysis tomorrow.",
        visibility=CommentVisibility.shared,
    ))

    # ── Lead 2 — Wheat, new with no tickets ────────────────────────────────────
    lead2 = Lead(
        client_name="GreenField Exports",
        crop="Wheat",
        variety="Default",
        deadline=date.today() + timedelta(days=30),
        value_mt=120,
        value_inr=6000000,
        win_probability=WinProbability.medium,
        priority=Priority.P2,
        suggested_priority=Priority.P2,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.new,
        lead_source="Cold Call",
        contact_name="Nita Joshi",
        contact_email="nita@greenfield.com",
        created_by=sales2.id,
    )
    db.add(lead2)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead2.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=sales2.id, note="Lead created",
    ))

    db.add(Comment(
        lead_id=lead2.id, author_id=sales2.id,
        body="Initial call went well. Following up next week.",
        visibility=CommentVisibility.shared,
    ))

    # ── Lead 3 — Siddhi — Quinoa, brand new commodity ───────────────────────────
    lead3 = Lead(
        client_name="Sunrise Foods",
        crop="Quinoa",
        variety="White Quinoa",
        deadline=date.today() + timedelta(days=21),
        value_mt=18,
        value_inr=1800000,
        win_probability=WinProbability.medium,
        priority=Priority.P2,
        suggested_priority=Priority.P2,
        capability_match=CapabilityMatch.needs_model,
        status=LeadStatus.active,
        lead_source="Inbound Web",
        contact_name="Karan Bhatia",
        contact_email="karan@sunrisefoods.in",
        created_by=siddhi.id,
    )
    db.add(lead3)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead3.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=siddhi.id, note="Lead created",
    ))

    ticket3 = Ticket(
        lead_id=lead3.id,
        type=TicketType.new_commodity,
        to_team=TeamTarget.product,
        status="Under Review",
        body="Client wants Quinoa graded — we don't have this commodity in the capability catalog yet. Can Product add support?",
        created_by=siddhi.id,
    )
    db.add(ticket3)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket3.id,
        from_status=None, to_status="New",
        changed_by=siddhi.id,
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket3.id,
        from_status="New", to_status="Under Review",
        changed_by=product1.id,
    ))

    db.add(Comment(
        lead_id=lead3.id, attached_ticket_id=ticket3.id, author_id=product1.id,
        body="Reviewing — checking if our grading model generalizes to Quinoa or needs retraining.",
        visibility=CommentVisibility.shared,
    ))

    # ── Lead 4 — Siddhi — Wheat, new variety of an existing commodity ──────────
    lead4 = Lead(
        client_name="Bharat Grains Co",
        crop="Wheat",
        variety="Lokwan",
        deadline=date.today() + timedelta(days=25),
        value_mt=80,
        value_inr=4200000,
        win_probability=WinProbability.high,
        priority=Priority.P1,
        suggested_priority=Priority.P1,
        capability_match=CapabilityMatch.needs_model,
        status=LeadStatus.active,
        lead_source="Referral",
        contact_name="Mahesh Iyer",
        contact_phone="+91-9823456710",
        created_by=siddhi.id,
    )
    db.add(lead4)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead4.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=siddhi.id, note="Lead created",
    ))

    ticket4 = Ticket(
        lead_id=lead4.id,
        type=TicketType.new_variety,
        to_team=TeamTarget.product,
        status="New",
        body="We only support Wheat/Default in the catalog — client is specifically growing Lokwan variety. Need this added.",
        created_by=siddhi.id,
    )
    db.add(ticket4)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket4.id,
        from_status=None, to_status="New",
        changed_by=siddhi.id,
    ))

    # ── Lead 5 — Siddhi — Rice, conflicting grading reports ────────────────────
    lead5 = Lead(
        client_name="Coastal Agro Exports",
        crop="Rice",
        variety="IR64",
        deadline=date.today() + timedelta(days=10),
        value_mt=60,
        value_inr=3000000,
        win_probability=WinProbability.high,
        priority=Priority.P1,
        suggested_priority=Priority.P1,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.active,
        lead_source="Referral",
        contact_name="Geeta Nair",
        contact_phone="+91-9845098450",
        created_by=siddhi.id,
    )
    db.add(lead5)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead5.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=siddhi.id, note="Lead created",
    ))

    # Currently sitting in the Tech queue (In Progress) — showcases the handoff.
    ticket5 = Ticket(
        lead_id=lead5.id,
        type=TicketType.quality_mismatch,
        to_team=TeamTarget.tech,
        status="In Progress",
        body="Client sent two grading reports for the same IR64 sample with conflicting moisture % — one says 12.1%, the other 14.8%. Need a re-test.",
        created_by=siddhi.id,
    )
    db.add(ticket5)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket5.id,
        from_status=None, to_status="New",
        changed_by=siddhi.id,
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket5.id,
        from_status="New", to_status="Under Review",
        changed_by=product2.id, note="Reproduced the discrepancy on our side",
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket5.id,
        from_status="Under Review", to_status="In Progress",
        changed_by=product2.id, note="Handed to Tech for an independent re-test",
    ))

    db.add(Comment(
        lead_id=lead5.id, attached_ticket_id=ticket5.id, author_id=siddhi.id,
        body="Client is anxious — please prioritise, deadline is only 10 days out.",
        visibility=CommentVisibility.shared,
    ))
    db.add(Comment(
        lead_id=lead5.id, attached_ticket_id=ticket5.id, author_id=tech1.id,
        body="Re-running the sample through a fresh annotation pass — will report numbers by tomorrow.",
        visibility=CommentVisibility.shared,
    ))

    # ── Lead 6 — Siddhi — Maize, AI accuracy questioned (resolved example) ─────
    lead6 = Lead(
        client_name="Himalayan Pulses Pvt Ltd",
        crop="Maize",
        variety="Default",
        deadline=date.today() + timedelta(days=5),
        value_mt=35,
        value_inr=1400000,
        win_probability=WinProbability.medium,
        priority=Priority.P3,
        suggested_priority=Priority.P3,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.idle,
        lead_source="Cold Call",
        contact_name="Rajesh Bansal",
        contact_email="rajesh@himalayanpulses.in",
        created_by=siddhi.id,
    )
    db.add(lead6)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.lead, entity_id=lead6.id,
        from_status=None, to_status=LeadStatus.new,
        changed_by=siddhi.id, note="Lead created",
    ))

    # Full lifecycle example — went all the way through Tech and back to Resolved.
    ticket6 = Ticket(
        lead_id=lead6.id,
        type=TicketType.accuracy_issue,
        to_team=TeamTarget.product,
        status="Resolved",
        body="Client compared our AI grading against a third-party lab and saw a 6% gap on protein content — flagging for review.",
        created_by=siddhi.id,
    )
    db.add(ticket6)
    db.flush()

    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6.id,
        from_status=None, to_status="New",
        changed_by=siddhi.id,
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6.id,
        from_status="New", to_status="Under Review",
        changed_by=product1.id, note="Confirmed the gap against our reference set",
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6.id,
        from_status="Under Review", to_status="In Progress",
        changed_by=product1.id, note="Handed to Tech to recalibrate the protein model",
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6.id,
        from_status="In Progress", to_status="Deployed",
        changed_by=tech2.id, note="Recalibrated on this batch — gap closed to 1.2%, pushed to PROD",
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6.id,
        from_status="Deployed", to_status="Resolved",
        changed_by=product1.id, note="Client confirmed the new numbers match — closing out",
    ))

    db.add(Comment(
        lead_id=lead6.id, attached_ticket_id=ticket6.id, author_id=tech2.id,
        body="Recalibrated and re-ran — within tolerance now. Deployed to production.",
        visibility=CommentVisibility.shared,
    ))
    db.add(Comment(
        lead_id=lead6.id, attached_ticket_id=ticket6.id, author_id=product1.id,
        body="Shared the updated report with the client — they're happy. Resolved.",
        visibility=CommentVisibility.shared,
    ))

    # Direct-to-Tech request on the same lead — Product asks Tech to retrain a
    # parameter, straight to the Tech queue (no triage). Sits at In Progress.
    ticket6b = Ticket(
        lead_id=lead6.id,
        type=TicketType.tech_request,
        to_team=TeamTarget.tech,
        status="In Progress",
        body="Please retrain the Maize model to better detect the water-damage parameter — current accuracy is low on that class.",
        created_by=sindhuja.id,
    )
    db.add(ticket6b)
    db.flush()
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6b.id,
        from_status=None, to_status="New", changed_by=sindhuja.id,
    ))
    db.add(StatusHistory(
        entity_type=EntityType.ticket, entity_id=ticket6b.id,
        from_status="New", to_status="In Progress",
        changed_by=tech1.id, note="Picked up — collecting water-damage samples for retraining",
    ))
    db.add(Comment(
        lead_id=lead6.id, attached_ticket_id=ticket6b.id, author_id=tech1.id,
        body="On it. Need ~200 more labelled water-damage samples; sourcing from the NDDB set.",
        visibility=CommentVisibility.shared,
    ))

    # ── Lead 7 — Won — Paddy, deal closed ───────────────────────────────────────
    lead7 = Lead(
        client_name="Spice Traders Ltd",
        crop="Paddy",
        variety="Default",
        deadline=date.today() - timedelta(days=2),
        value_mt=90,
        value_inr=4500000,
        win_probability=WinProbability.high,
        priority=Priority.P2,
        suggested_priority=Priority.P2,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.won,
        terminal_reason="Contract signed — 90 MT order confirmed for Q3 delivery.",
        lead_source="Referral",
        contact_name="Anil Khanna",
        contact_phone="+91-9812345670",
        created_by=ravi.id,
    )
    db.add(lead7)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead7.id, from_status=None, to_status=LeadStatus.new, changed_by=ravi.id, note="Lead created"))
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead7.id, from_status=LeadStatus.active.value, to_status=LeadStatus.won.value, changed_by=ravi.id, note="Contract signed"))

    ticket7 = Ticket(
        lead_id=lead7.id, type=TicketType.sample_request, to_team=TeamTarget.sales,
        status="Received", body="Grade the 90 MT Paddy batch ahead of contract signing.",
        sample_raw_kg=5, sample_cleaned_g=220, created_by=product1.id,
        needed_by=date.today() - timedelta(days=5),
        sla_clock_started_at=datetime.utcnow() - timedelta(days=6),
    )
    db.add(ticket7)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket7.id, from_status=None, to_status="New", changed_by=product1.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket7.id, from_status="New", to_status="Contacted Lead", changed_by=ravi.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket7.id, from_status="Contacted Lead", to_status="Received", changed_by=ravi.id))
    db.add(Comment(lead_id=lead7.id, author_id=ravi.id, body="Client signed! Closing this out as a win.", visibility=CommentVisibility.shared))

    # ── Lead 8 — Lost — Rice, lost to competitor pricing ────────────────────────
    lead8 = Lead(
        client_name="Northern Agro Mills",
        crop="Rice",
        variety="IR64",
        deadline=date.today() - timedelta(days=10),
        value_mt=70,
        value_inr=3500000,
        win_probability=WinProbability.medium,
        priority=Priority.P2,
        suggested_priority=Priority.P2,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.lost,
        terminal_reason="Client went with a competitor offering a lower quote.",
        lead_source="Cold Call",
        contact_name="Harpreet Singh",
        contact_phone="+91-9888112233",
        created_by=sales1.id,
    )
    db.add(lead8)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead8.id, from_status=None, to_status=LeadStatus.new, changed_by=sales1.id, note="Lead created"))
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead8.id, from_status=LeadStatus.active.value, to_status=LeadStatus.lost.value, changed_by=sales1.id, note="Lost to competitor"))

    ticket8 = Ticket(
        lead_id=lead8.id, type=TicketType.analysis_request, to_team=TeamTarget.product,
        status="Rejected", body="Analyse rice sample for export quality grading.",
        rejected_reason="Lead went cold — client signed with a competitor before analysis began.",
        created_by=sales1.id,
    )
    db.add(ticket8)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket8.id, from_status=None, to_status="New", changed_by=sales1.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket8.id, from_status="New", to_status="Rejected", changed_by=sales1.id, note="Lead went cold — client signed with a competitor before analysis began."))
    db.add(Comment(lead_id=lead8.id, author_id=sales1.id, body="Internal note: their final quote was 8% below ours, couldn't match without losing margin.", visibility=CommentVisibility.sales_private))

    # ── Lead 9 — Dropped — Wheat, procurement paused ────────────────────────────
    lead9 = Lead(
        client_name="Valley Fresh Produce",
        crop="Wheat",
        variety="Default",
        deadline=date.today() + timedelta(days=40),
        value_mt=45,
        value_inr=2100000,
        win_probability=WinProbability.low,
        priority=Priority.P4,
        suggested_priority=Priority.P4,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.dropped,
        terminal_reason="Client paused all procurement for the quarter due to budget freeze.",
        lead_source="Inbound Web",
        contact_name="Sunita Rao",
        contact_email="sunita@valleyfresh.com",
        created_by=sales2.id,
    )
    db.add(lead9)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead9.id, from_status=None, to_status=LeadStatus.new, changed_by=sales2.id, note="Lead created"))
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead9.id, from_status=LeadStatus.new.value, to_status=LeadStatus.dropped.value, changed_by=sales2.id, note="Client paused procurement"))
    db.add(Comment(lead_id=lead9.id, author_id=sales2.id, body="Client asked us to check back next quarter. Dropping for now.", visibility=CommentVisibility.shared))

    # ── Lead 10 — At-risk SLA — Maize, sample sitting past breach window ────────
    lead10 = Lead(
        client_name="Metro Exports",
        crop="Maize",
        variety="Default",
        deadline=date.today() + timedelta(days=3),
        value_mt=55,
        value_inr=2750000,
        win_probability=WinProbability.high,
        priority=Priority.P1,
        suggested_priority=Priority.P1,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.active,
        lead_source="Referral",
        contact_name="Vikram Desai",
        contact_phone="+91-9900112244",
        created_by=ravi.id,
    )
    db.add(lead10)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead10.id, from_status=None, to_status=LeadStatus.new, changed_by=ravi.id, note="Lead created"))

    ticket10 = Ticket(
        lead_id=lead10.id, type=TicketType.sample_request, to_team=TeamTarget.sales,
        status="Contacted Lead", body="Need a 4kg raw sample of Maize for export-grade analysis — deadline is tight.",
        sample_raw_kg=4, needed_by=date.today() + timedelta(days=3),
        sla_clock_started_at=datetime.utcnow() - timedelta(hours=60),
        at_risk=True, created_by=product2.id,
    )
    db.add(ticket10)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket10.id, from_status=None, to_status="New", changed_by=product2.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket10.id, from_status="New", to_status="Contacted Lead", changed_by=ravi.id))
    db.add(Comment(lead_id=lead10.id, attached_ticket_id=ticket10.id, author_id=ravi.id, body="Lead isn't picking up calls — chasing again today.", visibility=CommentVisibility.shared))

    # ── Lead 11 — On hold — Rice, paused mid-flow ───────────────────────────────
    lead11 = Lead(
        client_name="Delta Foods Pvt Ltd",
        crop="Rice",
        variety="IR64",
        deadline=date.today() + timedelta(days=18),
        value_mt=40,
        value_inr=2000000,
        win_probability=WinProbability.medium,
        priority=Priority.P3,
        suggested_priority=Priority.P3,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.idle,
        lead_source="Cold Call",
        contact_name="Manoj Tiwari",
        contact_phone="+91-9876001122",
        created_by=priya.id,
    )
    db.add(lead11)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead11.id, from_status=None, to_status=LeadStatus.new, changed_by=priya.id, note="Lead created"))

    ticket11 = Ticket(
        lead_id=lead11.id, type=TicketType.sample_request, to_team=TeamTarget.sales,
        status="New", body="Sample needed for IR64 rice — client requested we hold until their warehouse audit finishes.",
        is_on_hold=True, created_by=product1.id,
    )
    db.add(ticket11)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket11.id, from_status=None, to_status="New", changed_by=product1.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket11.id, from_status="New", to_status="New", changed_by=priya.id, note="Placed on hold"))
    db.add(Comment(lead_id=lead11.id, author_id=priya.id, body="Client's warehouse audit runs another 2 weeks — paused until then.", visibility=CommentVisibility.shared))

    # ── Lead 12 — Snoozed (hold-until) — Wheat ──────────────────────────────────
    lead12 = Lead(
        client_name="Coastal Spices Co",
        crop="Wheat",
        variety="Default",
        deadline=date.today() + timedelta(days=22),
        value_mt=65,
        value_inr=3100000,
        win_probability=WinProbability.medium,
        priority=Priority.P2,
        suggested_priority=Priority.P2,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.idle,
        lead_source="Referral",
        contact_name="Fatima Sheikh",
        contact_email="fatima@coastalspices.com",
        created_by=sales2.id,
    )
    db.add(lead12)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead12.id, from_status=None, to_status=LeadStatus.new, changed_by=sales2.id, note="Lead created"))

    ticket12 = Ticket(
        lead_id=lead12.id, type=TicketType.analysis_request, to_team=TeamTarget.product,
        status="New", body="Analyse Wheat sample once client confirms volume next week.",
        is_on_hold=True, hold_until_days_left=15, created_by=sales2.id,
    )
    db.add(ticket12)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket12.id, from_status=None, to_status="New", changed_by=sales2.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket12.id, from_status="New", to_status="New", changed_by=sales2.id, note="Snoozed until 15 days left"))

    # ── Lead 13 — General tickets both directions ───────────────────────────────
    lead13 = Lead(
        client_name="Urban Mart Wholesale",
        crop="Paddy",
        variety="Default",
        deadline=date.today() + timedelta(days=12),
        value_mt=30,
        value_inr=1500000,
        win_probability=WinProbability.medium,
        priority=Priority.P3,
        suggested_priority=Priority.P3,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.active,
        lead_source="Inbound Web",
        contact_name="Deepak Malhotra",
        contact_phone="+91-9911223344",
        created_by=priya.id,
    )
    db.add(lead13)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead13.id, from_status=None, to_status=LeadStatus.new, changed_by=priya.id, note="Lead created"))

    ticket13a = Ticket(
        lead_id=lead13.id, type=TicketType.general, to_team=TeamTarget.product,
        status="Closed", body="Can Product confirm turnaround time for Paddy grading this month?",
        created_by=priya.id,
    )
    db.add(ticket13a)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket13a.id, from_status=None, to_status="Open", changed_by=priya.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket13a.id, from_status="Open", to_status="Closed", changed_by=product2.id, note="Confirmed — 3-day turnaround this month"))

    ticket13b = Ticket(
        lead_id=lead13.id, type=TicketType.general, to_team=TeamTarget.sales,
        status="Open", body="Need updated contact details for this client — last number bounced.",
        created_by=product2.id,
    )
    db.add(ticket13b)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket13b.id, from_status=None, to_status="Open", changed_by=product2.id))
    db.add(Comment(lead_id=lead13.id, author_id=priya.id, body="Got their new number, updating the lead now.", visibility=CommentVisibility.shared))

    # ── Lead 14 — Partial sample in progress ────────────────────────────────────
    lead14 = Lead(
        client_name="Greenline Agro",
        crop="Maize",
        variety="Default",
        deadline=date.today() + timedelta(days=9),
        value_mt=28,
        value_inr=1300000,
        win_probability=WinProbability.medium,
        priority=Priority.P3,
        suggested_priority=Priority.P3,
        capability_match=CapabilityMatch.supported,
        status=LeadStatus.active,
        lead_source="Cold Call",
        contact_name="Aarti Joshi",
        contact_phone="+91-9822334455",
        created_by=ravi.id,
    )
    db.add(lead14)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead14.id, from_status=None, to_status=LeadStatus.new, changed_by=ravi.id, note="Lead created"))

    ticket14 = Ticket(
        lead_id=lead14.id, type=TicketType.sample_request, to_team=TeamTarget.product,
        status="Partial Sample",
        body="Need a 5kg raw Maize sample for grading.",
        sample_raw_kg=5, partial_note="Lead can only send 3kg this week, will top up the remaining 2kg next week.",
        created_by=product1.id,
    )
    db.add(ticket14)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket14.id, from_status=None, to_status="New", changed_by=product1.id))
    db.add(StatusHistory(entity_type=EntityType.ticket, entity_id=ticket14.id, from_status="New", to_status="Partial Sample", changed_by=ravi.id, note="Lead can only send 3kg this week, will top up the remaining 2kg next week."))
    db.add(Comment(lead_id=lead14.id, attached_ticket_id=ticket14.id, author_id=product1.id, body="3kg works for an initial grading pass — go ahead and send it.", visibility=CommentVisibility.shared))

    # ── Lead 15 — Fresh, untouched, new commodity not yet ticketed ──────────────
    lead15 = Lead(
        client_name="Spring Valley Co",
        crop="Barley",
        variety="Default",
        deadline=date.today() + timedelta(days=35),
        value_mt=22,
        value_inr=950000,
        win_probability=WinProbability.low,
        priority=Priority.P4,
        suggested_priority=Priority.P4,
        capability_match=CapabilityMatch.needs_model,
        status=LeadStatus.new,
        lead_source="Inbound Web",
        contact_name="Joseph Mathew",
        contact_email="joseph@springvalley.co",
        created_by=sales1.id,
    )
    db.add(lead15)
    db.flush()
    db.add(StatusHistory(entity_type=EntityType.lead, entity_id=lead15.id, from_status=None, to_status=LeadStatus.new, changed_by=sales1.id, note="Lead created"))
    db.add(Comment(lead_id=lead15.id, author_id=sales1.id, body="Just came in — Barley isn't in our catalog yet, will raise a new_commodity ticket if this looks promising.", visibility=CommentVisibility.sales_private))

    db.flush()

    # ── Notifications — mix of read/unread across users ─────────────────────────
    notifs = [
        Notification(recipient_id=product1.id, type="new_ticket", lead_id=lead1.id, ticket_id=ticket1.id,
                     message=f"New analysis request from {sales1.name} on {lead1.client_name}", is_read=True),
        Notification(recipient_id=product1.id, type="new_ticket", lead_id=lead3.id, ticket_id=ticket3.id,
                     message=f"New commodity request from {siddhi.name} on {lead3.client_name}", is_read=False),
        Notification(recipient_id=product2.id, type="new_ticket", lead_id=lead4.id, ticket_id=ticket4.id,
                     message=f"New variety request from {siddhi.name} on {lead4.client_name}", is_read=False),
        Notification(recipient_id=tech1.id, type="status_change", lead_id=lead5.id, ticket_id=ticket5.id,
                     message=f"Ticket handed to Tech on {lead5.client_name} — now In Progress", is_read=False),
        Notification(recipient_id=siddhi.id, type="status_change", lead_id=lead6.id, ticket_id=ticket6.id,
                     message="Ticket status updated to 'Resolved'", is_read=True),
        Notification(recipient_id=ravi.id, type="sla_breach", lead_id=lead10.id, ticket_id=ticket10.id,
                     message=f"SLA at risk on {lead10.client_name} — sample request approaching 48h business-hour limit", is_read=False),
        Notification(recipient_id=admin.id, type="sla_breach", lead_id=lead10.id, ticket_id=ticket10.id,
                     message=f"SLA at risk on {lead10.client_name} — sample request approaching 48h business-hour limit", is_read=False),
        Notification(recipient_id=priya.id, type="hold_resurfaced", lead_id=lead11.id, ticket_id=ticket11.id,
                     message=f"Ticket on {lead11.client_name} placed on hold", is_read=True),
        Notification(recipient_id=product2.id, type="comment", lead_id=lead13.id, ticket_id=ticket13b.id,
                     message=f"New comment from {priya.name} on {lead13.client_name}", is_read=False),
        Notification(recipient_id=ravi.id, type="status_change", lead_id=lead14.id, ticket_id=ticket14.id,
                     message="Ticket status updated to 'Partial Sample'", is_read=False),
    ]
    db.add_all(notifs)

    db.commit()
    print("✓ Seed complete.")
    print(f"  Sales   : priya@ / ravi@ / siddhi@ / pratamesh@  (sales123)")
    print(f"  Product : ananya@ / dev@ / sindhuja@ / hemali@   (product123)")
    print(f"  Tech    : pranav@ / pramod@                      (tech123)")
    print(f"  Admin   : admin@upjao.com                        (admin123)")
    print(f"  Leads   : 15 total — covering new/active/idle/won/lost/dropped statuses")
    print(f"  Tickets : analysis_request, sample_request, general, new_commodity, new_variety, "
          f"quality_mismatch, accuracy_issue, tech_request — incl. at-risk, on-hold, snoozed, "
          f"partial-sample, and Tech-queue examples")
    print(f"  Notifications: {len(notifs)} seeded across read/unread states")
    db.close()


if __name__ == "__main__":
    seed()
