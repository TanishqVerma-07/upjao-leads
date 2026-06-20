# BUILD PLAN — Upjao Leads & Ticket Management Webapp

> **This document is the single source of truth for building this application.**
> It is written for Claude Code. Read it fully before writing any code.

---

## 0. HOW TO USE THIS DOCUMENT (read first)

**Rules of engagement — follow these exactly:**

1. **Build one Part at a time, in order.** Do not start a Part until the previous one is complete and its **Acceptance Checklist** passes. After finishing a Part, stop and report what was built and how to verify it, then wait before continuing.
2. **Invoke the named skill before each task.** Every Part lists a **"Skill to use"** line. Before doing that Part's work, run your skill discovery and invoke the named skill (e.g. `frontend-design` before any UI work). If a named skill is unavailable in your environment, say so and proceed with best practice.
3. **The word "tender" is banned.** This product has no concept of a tender. The core object is a **Lead**. Never use the word "tender" in code, comments, UI text, table names, or variable names.
4. **No email/Gmail ingestion exists.** Leads are created manually by the Sales team. Do not build any email-pulling or scraper integration.
5. **The archive is sacred.** The `status_history` table is **append-only**. Never write an UPDATE or DELETE against it. Every status change on a lead or ticket writes a new row here.
6. **Stamp every state change** with who changed it and when.
7. **Ask before inventing.** If a requirement is ambiguous, stop and ask rather than guessing. The "Open Items" section at the end lists known unknowns — flag them when you reach them.

**Suggested repo layout:**
```
upjao-leads/
├── backend/          # FastAPI (Python)
├── frontend/         # React (Vite)
├── BUILD_PLAN.md     # this file
└── CLAUDE.md         # short conventions file (create in Part 0)
```

---

## 1. PRODUCT OVERVIEW

A role-gated internal webapp that connects the **Sales** team and the **Product** team around **Leads**. Sales manually enters leads (a client wants a specific crop graded). Both teams coordinate through **typed tickets** and **comments** inside each lead, with live updates, status tracking, deadline countdowns, SLA escalation, and a permanent audit archive.

**The loop:** Sales creates a Lead → Sales raises an *Analysis Request* ticket to Product → Product works it, raises a *Sample Request* ticket back to Sales → Sales collects sample → Product runs analysis/training → Sales marks the lead Won / Lost / Dropped. Throughout, both teams talk via comments, everything is timestamped, and nothing is ever lost.

---

## 2. FULL REQUIREMENTS REFERENCE (all locked decisions)

Everything below is decided and must be implemented. Parts in Section 5 tell you *when* to build each.

### 2.1 Roles
- **Sales**, **Product**, **Admin**.
- Real auth: admin creates all accounts (email + password). JWT tokens, bcrypt password hashing.
- **Admin** = observer + user manager. Sees everything (including Sales private notes), manages users, views the full archive and analytics. **Cannot** raise tickets or change lead status.

### 2.2 Leads
- Created manually by Sales. **One Lead = one crop + one variety.**
- **All leads are visible to everyone** (Sales, Product, Admin). A lead with no tickets simply shows "0 tickets" and is still visible to Product.
- **Lead creation fields:**
  - *Required:* client/company name, crop, variety, deadline (needed-by date — drives the days-left countdown), estimated value (MT and ₹), win probability (High / Medium / Low), priority (P1–P4).
  - *Optional:* lead source, notes (Sales-private), attachments, contact person (name + phone/email).
- **Priority** is a lead-level field, **P1–P4**, set by Sales. **Sales' manual priority is authoritative.** The system computes a *suggested* priority from value × win-probability and displays it as a hint only — it never overrides Sales.
- **Lead status is auto-derived** from its tickets: `New` (nothing raised yet) → `Active` (any open ticket) → `Idle` (tickets exist, none open). 
- **Terminal outcome** set deliberately by Sales: **Won / Lost / Dropped**, each with a **mandatory reason**, written to the archive.

### 2.3 Tickets
- A Lead is a **container**; tickets live inside it. A lead can hold many tickets over its life.
- **Typed tickets:**
  - **Analysis Request** — Sales → Product. Fields: crop/variety (inherited from lead), what's needed (text).
  - **Sample Request** — Product → Sales. Fields: raw quantity (kg), cleaned quantity (g), needed-by.
  - **General** — either direction, free text. Escape hatch.
- **Single progressing status per ticket** (exactly one state at a time):
  - Analysis Request: `New → Accepted → AI Analysing → Done`
  - Sample Request: `New → Sample Collection → Collected → Received`
  - General: `Open → Closed`
- **Universal off-ramps** available on any ticket, alongside the forward sequence:
  - **On Hold** — paused; pauses any SLA clock. Resumes manually.
  - **Rejected / Can't Fulfil** — terminal dead end, **mandatory short reason**.
- **Days-left tag** sits next to the status tag on every ticket — a live countdown to the lead's deadline.
- **Hold-until-N-days-left** — clicking the days-left tag lets the user snooze the ticket with a condition (e.g. "hold till 10 days left"). The ticket leaves the active queue and **auto-resurfaces** when the countdown reaches that threshold.
- Every status transition is stamped (who + when) and written to the append-only archive.

### 2.4 The Lead Feed & Two-Button Composer
- Each lead has **one chronological feed**: tickets and comments interleaved in time order (like a GitHub issue).
- A **two-button composer** at the bottom: **Send as Ticket** or **Send as Comment**.
  - **Ticket** → structured, typed, **routed to the other team's queue**, status-tracked, fires a notification.
  - **Comment** → ambient, **lead-level**, visible to both teams, **not** routed to a queue, no status. Can **optionally be attached to a specific ticket** ("reply" to a ticket); otherwise it's general lead chatter.
- **Sales private notes**: Sales-only (also visible to Admin), not visible to Product. Modeled as comments with `visibility = sales_private`.
- All of the above is permanently archived.

### 2.5 Capability Catalog
- A living list of supported **crop + variety** combinations. **Owned by Product** — they add/remove entries.
- When a lead is created, the system checks it against the catalog and tags it: **"Already supported"** vs **"Needs new model"** (display hint, does not block anything).

### 2.6 Notifications
- **In-app only for v1** (bell icon). Email deferred to a later phase (build the trigger points so email can be slotted in later, but do not implement email now).
- **Triggers (all in-app):**
  - New Analysis Request lands in Product's queue.
  - New Sample Request lands in Sales' queue.
  - A comment is added to a lead a user is involved in.
  - A private Sales note is added (notifies Sales team only).
  - A ticket's status changes on a lead a user is involved in.
  - A ticket's hold-until threshold is reached (it resurfaces).
  - SLA breach / escalation events (see 2.7).

### 2.7 SLA Engine
- Background scheduler (runs hourly during business hours).
- **48 business-hour clock**: starts when a Sample Request enters `Sample Collection`. On breach → `At-Risk` flag + escalation notification.
- **5-day stalled flag**: any ticket open 5+ calendar days → `At-Risk` + escalation notification.
- **On Hold pauses all clocks.** Hold-until-days snooze also suppresses the clock until resurface.

### 2.8 Real-time
- **WebSockets** from v1. The feed and the notification bell update **instantly, no refresh.**

### 2.9 Attachments & Grading Reports
- Attach files to a lead or a ticket. A special attachment kind = **grading report** (the Upjao Easy/Ultra PDF), attachable to a Sample Request once a sample is analysed.

### 2.10 Tech Stack
- **Frontend:** React (Vite).
- **Backend:** FastAPI (Python), REST + WebSocket endpoints.
- **Database:** Postgres (production), SQLite (local dev). Use SQLAlchemy + Alembic so both work.
- **Auth:** JWT + bcrypt.
- **Scheduler:** APScheduler (in-process) for the SLA checker.

---

## 3. DATA MODEL (full schema — build in Part 1)

Use SQLAlchemy models + Alembic migrations. Types shown are logical; map to Postgres/SQLite appropriately. All `id` are primary keys. All timestamps UTC.

**`users`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| name | text | |
| email | text unique | login id |
| password_hash | text | bcrypt |
| role | enum(`sales`,`product`,`admin`) | |
| is_active | bool | default true |
| created_at | datetime | |

**`leads`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| client_name | text | required |
| crop | text | required |
| variety | text | required |
| deadline | date | **required**, drives days-left |
| value_mt | numeric | quantity in metric tonnes |
| value_inr | numeric | ₹ value, feeds suggested priority |
| win_probability | enum(`high`,`medium`,`low`) | required |
| priority | enum(`P1`,`P2`,`P3`,`P4`) | Sales-set, authoritative |
| suggested_priority | enum(`P1`..`P4`) | computed hint, nullable |
| capability_match | enum(`supported`,`needs_model`,`unknown`) | computed from catalog |
| status | enum(`new`,`active`,`idle`,`won`,`lost`,`dropped`) | auto-derived except terminal |
| terminal_reason | text | required when status in won/lost/dropped |
| lead_source | text | optional |
| contact_name | text | optional |
| contact_phone | text | optional |
| contact_email | text | optional |
| created_by | int FK→users.id | |
| created_at | datetime | |
| updated_at | datetime | |

**`tickets`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| lead_id | int FK→leads.id | |
| type | enum(`analysis_request`,`sample_request`,`general`) | |
| to_team | enum(`sales`,`product`) | routing target (derived from type for typed; chosen for general) |
| status | text | one of the type's states (see 2.3) |
| body | text | the request / description |
| sample_raw_kg | numeric | sample_request only |
| sample_cleaned_g | numeric | sample_request only |
| needed_by | date | sample_request only; defaults to lead deadline |
| is_on_hold | bool | default false |
| hold_until_days_left | int | nullable; snooze threshold |
| rejected_reason | text | required if status=rejected |
| at_risk | bool | default false; set by SLA engine |
| sla_clock_started_at | datetime | set when entering Sample Collection |
| created_by | int FK→users.id | |
| created_at | datetime | |
| updated_at | datetime | |

> Note: `status` is text because the valid set depends on `type`. Enforce valid transitions in the service layer, not the DB.

**`comments`** (feed entries that are not tickets)
| column | type | notes |
|---|---|---|
| id | int PK | |
| lead_id | int FK→leads.id | |
| attached_ticket_id | int FK→tickets.id | nullable; comment "on" a ticket |
| author_id | int FK→users.id | |
| body | text | |
| visibility | enum(`shared`,`sales_private`) | sales_private = Sales+Admin only |
| created_at | datetime | |

**`status_history`** — **APPEND-ONLY ARCHIVE. NEVER UPDATE OR DELETE.**
| column | type | notes |
|---|---|---|
| id | int PK | |
| entity_type | enum(`lead`,`ticket`) | |
| entity_id | int | |
| from_status | text | nullable (creation) |
| to_status | text | |
| changed_by | int FK→users.id | |
| changed_at | datetime | |
| note | text | e.g. rejection reason, terminal reason |

**`capabilities`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| crop | text | |
| variety | text | |
| added_by | int FK→users.id | Product member |
| is_active | bool | default true |
| created_at | datetime | |

**`attachments`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| lead_id | int FK→leads.id | nullable |
| ticket_id | int FK→tickets.id | nullable |
| kind | enum(`general`,`grading_report`) | |
| file_name | text | |
| file_path | text | stored on disk / object store |
| mime_type | text | |
| uploaded_by | int FK→users.id | |
| uploaded_at | datetime | |

**`notifications`**
| column | type | notes |
|---|---|---|
| id | int PK | |
| recipient_id | int FK→users.id | |
| type | text | e.g. `new_ticket`,`status_change`,`comment`,`hold_resurfaced`,`sla_breach` |
| lead_id | int FK→leads.id | nullable |
| ticket_id | int FK→tickets.id | nullable |
| message | text | |
| is_read | bool | default false |
| created_at | datetime | |

**Derived values (compute, do not store):**
- **days_left** = `lead.deadline − today` (per lead; show on every ticket of that lead).
- **suggested_priority**: map `value_inr × win_weight` to a bucket, where win_weight = {high:1.0, medium:0.6, low:0.3}. Suggested thresholds (tune later): top 25% → P1, next → P2, next → P3, bottom → P4. Recompute on lead create/edit.
- **lead.status** (non-terminal): no open tickets and none ever created → `new`; ≥1 open ticket → `active`; tickets exist but none open → `idle`.

---

## 4. GLOBAL CONVENTIONS (put a short version in CLAUDE.md)

- Word "tender" is banned everywhere.
- `status_history` is append-only.
- Every state change → one `status_history` row + relevant notifications.
- Service layer owns all transition validation and side effects (archive write + notifications). Keep routes thin.
- All datetimes UTC in storage; format for IST (Asia/Kolkata) in the UI.
- Before any UI work, invoke the `frontend-design` skill.

---

## 5. THE BUILD PLAN (sequential parts)

> Build top to bottom. Finish a Part, run its Acceptance Checklist, report, then continue.

---

### PART 0 — Project Setup & Foundations
**Skill to use:** none specific. (Optionally run skill discovery for project scaffolding.)

**Tasks:**
1. Create the repo layout (`backend/`, `frontend/`, `CLAUDE.md`).
2. `CLAUDE.md`: copy the Global Conventions (Section 4) into it.
3. Backend: FastAPI app skeleton, SQLAlchemy + Alembic configured for **both** SQLite (dev) and Postgres (prod) via an env var (`DATABASE_URL`). Add a `/health` endpoint.
4. Frontend: React + Vite skeleton, a single placeholder page hitting `/health`.
5. Document local run steps in `README.md` (how to start backend + frontend, env vars).

**Acceptance Checklist:**
- [ ] Backend starts; `GET /health` returns `{status:"ok"}`.
- [ ] Frontend starts and shows the health status from the backend.
- [ ] `alembic upgrade head` runs cleanly on an empty SQLite DB.

---

### PART 1 — Database Schema & Models
**Skill to use:** none specific.

**Tasks:**
1. Implement every table in Section 3 as SQLAlchemy models.
2. Create the initial Alembic migration.
3. Write a `seed.py` that creates: 1 admin, 2 sales users, 2 product users, a few capabilities (e.g. Rice/IR64, Wheat/default, Maize/default, Paddy/default), and 2 sample leads with a couple of tickets and comments for manual testing.
4. Enforce: `status_history` has no update/delete paths in any model/repo helper.

**Acceptance Checklist:**
- [ ] Migration creates all tables on SQLite and Postgres.
- [ ] `seed.py` populates demo data without errors.
- [ ] A short script can read a lead with its tickets and comments.

---

### PART 2 — Authentication, Users & Role-Gating
**Skill to use:** `frontend-design` (before building login/admin UI).

**Tasks (backend):**
1. `POST /auth/login` → email+password → JWT (bcrypt verify).
2. Auth dependency that resolves the current user + role from the JWT.
3. Role-gating dependency/decorator (`require_role(...)`).
4. Admin-only user CRUD: `POST /users`, `GET /users`, `PATCH /users/{id}` (activate/deactivate, change role). No public signup.

**Tasks (frontend):**
1. Login page.
2. Auth context + token storage (in memory + secure refresh approach; do not use localStorage for the token if avoidable — follow current best practice).
3. Route guard: unauthenticated → login. Role determines which nav/surfaces render (Sales surfaces, Product surfaces, Admin surfaces).
4. Admin "Users" screen (create user, set role, deactivate).

**Acceptance Checklist:**
- [ ] Admin can create a Sales and a Product user.
- [ ] Each role logs in and sees only its own nav.
- [ ] Hitting a Product-only endpoint as Sales returns 403.

---

### PART 3 — Leads: Creation, List, Detail Shell
**Skill to use:** `frontend-design` (before any UI).

**Tasks (backend):**
1. `POST /leads` (Sales only) with all fields from 2.2. Validate required fields; deadline mandatory.
2. On create: compute `suggested_priority` and `capability_match` (against `capabilities`). Write a `status_history` row (`null → new`). Default status `new`.
3. `GET /leads` (all roles) with filters (crop, status, priority) and sort (priority then days-left). Include `days_left` and ticket counts in the response.
4. `GET /leads/{id}` — full lead detail.
5. `PATCH /leads/{id}` (Sales only) — edit fields incl. priority; recompute suggested values; archive any status-affecting change.
6. `POST /leads/{id}/outcome` (Sales only) — set Won/Lost/Dropped with **mandatory reason**; archive it.

**Tasks (frontend):**
1. **Lead creation form** (Sales) — all fields; show the computed *suggested priority* as a hint next to the Sales priority selector; show `capability_match` after crop/variety entered.
2. **Lead list** (all roles) — cards/rows showing client, crop/variety, priority tag, status, days-left, ticket count (0 if none). Sorted priority → days-left.
3. **Lead detail page shell** — header with all lead info, priority (editable by Sales), days-left, capability tag, and an empty area reserved for the feed (Part 5). Won/Lost/Dropped action (Sales) with reason modal.

**Acceptance Checklist:**
- [ ] Sales creates a lead; it appears in the list for all three roles.
- [ ] Suggested priority shows but Sales' chosen priority is what's saved and sorted on.
- [ ] capability_match correctly reads `supported` vs `needs_model`.
- [ ] Won/Lost/Dropped requires a reason and writes to `status_history`.
- [ ] A lead with no tickets shows "0 tickets" and is visible to Product.

---

### PART 4 — Tickets: Types, Lifecycles, Off-ramps, Days-left, Hold-until, Queues
**Skill to use:** `frontend-design` (before any UI).

**Tasks (backend):**
1. `POST /leads/{id}/tickets` — create a typed ticket (analysis_request / sample_request / general). Set `to_team` from type (analysis→product, sample→sales; general→chooser). Initial status per type. Archive (`null → New`/`Open`). Notify the target team (notification rows; real delivery wired in Parts 6–7).
2. `PATCH /tickets/{id}/status` — validate the transition against the type's allowed sequence. On entering `Sample Collection`, set `sla_clock_started_at`. Archive every transition with who+when. Notify involved users.
3. Off-ramps: `On Hold` (set `is_on_hold`, pause clock) and `Rejected` (terminal, **mandatory reason**, archived).
4. Hold-until: `PATCH /tickets/{id}/hold-until` with `days_left` threshold → set `hold_until_days_left`, drop from active queue. (Resurface logic runs in the SLA scheduler, Part 8, but implement the field + queue filter now.)
5. Queues: `GET /queues/sales` (open Sample Requests + General-to-sales across all leads) and `GET /queues/product` (open Analysis Requests + General-to-product), sorted by lead priority then days-left, excluding held/snoozed.

**Tasks (frontend):**
1. Ticket creation UI within a lead (type picker → type-specific fields).
2. Ticket display component: **status tag** + **days-left tag** side by side, type badge, body, and (for sample) quantities.
3. Status controls (advance / On Hold / Rejected-with-reason).
4. Clicking the **days-left tag** opens the **hold-until** control ("hold till N days left").
5. **Sales queue** and **Product queue** screens.

**Acceptance Checklist:**
- [ ] Each ticket type enforces its own status sequence; invalid jumps rejected.
- [ ] Rejected requires a reason; both off-ramps archive correctly.
- [ ] Days-left tag shows correct countdown from the lead deadline.
- [ ] Hold-until removes a ticket from the active queue (resurface verified in Part 8).
- [ ] Queues show the right tickets per team, correctly sorted.

---

### PART 5 — Lead Feed & Two-Button Composer
**Skill to use:** `frontend-design` (this is the centerpiece UI — invoke it and design carefully).

**Tasks (backend):**
1. `GET /leads/{id}/feed` — returns tickets + comments interleaved by `created_at`. Respect visibility: Product never receives `sales_private` comments.
2. `POST /leads/{id}/comments` — body, `visibility` (shared / sales_private — sales_private only allowed for Sales/Admin), optional `attached_ticket_id`. Archive not required for comments, but notify involved users.

**Tasks (frontend):**
1. Render the chronological feed in the lead detail page: ticket entries and comment entries visually distinct, in time order.
2. **Two-button composer**: one text area, two send buttons — **Send as Ticket** (opens the type/fields flow from Part 4) and **Send as Comment** (posts to the feed).
3. Comment options: visibility toggle (Sales sees a "private note" option; Product does not), and optional "attach to ticket" selector.
4. Private notes visually marked and hidden entirely from Product.

**Acceptance Checklist:**
- [ ] Feed interleaves tickets and comments correctly by time.
- [ ] Send-as-Comment posts an ambient comment; Send-as-Ticket creates a routed ticket.
- [ ] A sales_private note is invisible to Product in both API and UI.
- [ ] A comment can be attached to a specific ticket and renders under/with it.

---

### PART 6 — Real-time (WebSockets)
**Skill to use:** none specific (backend); `frontend-design` if adjusting any live UI affordances.

**Tasks:**
1. Backend WebSocket endpoint; on connect, authenticate via JWT and subscribe the user to relevant channels (their queues + leads they're involved in).
2. Broadcast events on: new ticket, status change, new comment (respecting visibility), new notification.
3. Frontend: subscribe; the **feed updates instantly** when the other party posts; the **notification bell** updates live. No manual refresh anywhere.

**Acceptance Checklist:**
- [ ] Two browsers on the same lead: a comment/ticket from one appears in the other within ~1s, no refresh.
- [ ] sales_private notes are never broadcast to a Product socket.

---

### PART 7 — Notifications (in-app)
**Skill to use:** `frontend-design` (before the bell / notification UI).

**Tasks (backend):**
1. Central notification service: create notification rows for every trigger in 2.6 and push them over WebSocket.
2. `GET /notifications` (mine), `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`.
3. Leave clean extension points (a `notify()` interface) so email can be added later **without** touching call sites.

**Tasks (frontend):**
1. Notification bell with unread count (live).
2. Dropdown list; click → navigates to the relevant lead/ticket; mark read / mark all read.

**Acceptance Checklist:**
- [ ] Every trigger in 2.6 produces an in-app notification to the right recipients.
- [ ] Private-note notifications go to Sales only.
- [ ] Unread count updates live; clicking navigates correctly.

---

### PART 8 — SLA Engine & Hold-until Resurfacing
**Skill to use:** none specific.

**Tasks:**
1. APScheduler job, hourly during business hours (window is an Open Item — default 09:00–18:00 Mon–Sat, make it config).
2. **48 business-hour clock**: for Sample Requests in `Sample Collection`, measure business hours since `sla_clock_started_at`; on breach set `at_risk=true` + escalation notification. **On Hold / snoozed tickets are skipped.**
3. **5-day stalled**: any ticket open ≥5 calendar days → `at_risk=true` + escalation notification.
4. **Hold-until resurfacing**: when a snoozed ticket's lead `days_left ≤ hold_until_days_left`, clear the snooze, return it to the active queue, notify.
5. `At-Risk` badge surfaced on tickets/queues in the UI.

**Acceptance Checklist:**
- [ ] A Sample Request left in Sample Collection past the window flips At-Risk + notifies.
- [ ] A held ticket resurfaces exactly when days-left crosses its threshold.
- [ ] On Hold pauses the clock (no false breach).

---

### PART 9 — Capability Catalog & Auto-Tagging
**Skill to use:** `frontend-design` (before catalog UI).

**Tasks (backend):**
1. `GET /capabilities` (all), `POST /capabilities` & `DELETE/PATCH` (**Product only**).
2. Ensure lead create/edit recomputes `capability_match` against the active catalog.

**Tasks (frontend):**
1. Product-only "Capability Catalog" screen: list, add, deactivate crop+variety entries.
2. Show the supported / needs-model tag on leads.

**Acceptance Checklist:**
- [ ] Product can add/remove capabilities; Sales/Admin cannot edit them.
- [ ] Adding a capability flips matching leads to "supported" on next compute.

---

### PART 10 — Attachments & Grading Reports
**Skill to use:** `frontend-design` (before upload UI).

**Tasks (backend):**
1. `POST /attachments` (multipart) tied to a lead or ticket, with `kind` (general / grading_report). Store file safely; record metadata.
2. `GET` download endpoint with role checks (respect lead visibility; grading reports follow the ticket).

**Tasks (frontend):**
1. Attach files when creating a lead or on a ticket.
2. On a Sample Request, allow attaching a **grading report**; show it inline on the ticket.

**Acceptance Checklist:**
- [ ] Files attach to leads and tickets and download correctly.
- [ ] A grading report attached to a Sample Request is visible to both teams on that ticket.

---

### PART 11 — Admin Panel & Analytics
**Skill to use:** `frontend-design` (before dashboards).

**Tasks (backend):**
1. `GET /archive` (Admin) — query `status_history` by entity/date/user.
2. Analytics endpoints: win rate by crop, count by status, average days from lead-created → first ticket Done, etc.

**Tasks (frontend):**
1. Admin: users (from Part 2), archive viewer (filter by lead/ticket/user/date), analytics dashboard (charts).
2. Confirm Admin cannot raise tickets or change lead status anywhere in the UI.

**Acceptance Checklist:**
- [ ] Archive viewer shows full, immutable history for any lead/ticket.
- [ ] Analytics compute correctly against seed data.
- [ ] Admin has no ticket/status-mutation controls.

---

### PART 12 — Final Integration & Acceptance
**Skill to use:** none specific.

**Tasks:**
1. End-to-end walkthrough of the full loop (create lead → analysis ticket → sample ticket → collect → done → Won) across Sales and Product browsers, live.
2. Verify every Acceptance Checklist above still passes.
3. Confirm the word "tender" appears nowhere in the codebase (grep).
4. Confirm no UPDATE/DELETE path touches `status_history`.

**Final Acceptance:**
- [ ] Full loop works end-to-end with live updates.
- [ ] `grep -ri "tender"` returns nothing in source.
- [ ] Archive is provably append-only.

---

## 6. OPEN ITEMS (flag these when reached; ask Tanishq)
1. **Business-hours window** for the SLA clock — default assumed 09:00–18:00 Mon–Sat (Asia/Kolkata). Confirm.
2. **Named team leads** for the escalation ladder (who receives SLA escalations).
3. **"L1 / live leads"** — a possible lowest-bid-ranking field on leads, mentioned early and never resolved. Not built unless confirmed.
