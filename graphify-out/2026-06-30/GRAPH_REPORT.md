# Graph Report - sales product  (2026-06-23)

## Corpus Check
- 76 files · ~34,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 559 nodes · 1630 edges · 42 communities (41 shown, 1 thin omitted)
- Extraction: 52% EXTRACTED · 48% INFERRED · 0% AMBIGUOUS · INFERRED: 781 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a050c188`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Database Models & LeadTicket Logic|Database Models & Lead/Ticket Logic]]
- [[_COMMUNITY_API Schemas & Pydantic Models|API Schemas & Pydantic Models]]
- [[_COMMUNITY_Project Docs & Dependencies|Project Docs & Dependencies]]
- [[_COMMUNITY_Auth, DB Config & Attachments Router|Auth, DB Config & Attachments Router]]
- [[_COMMUNITY_User Auth Middleware & RBAC|User Auth Middleware & RBAC]]
- [[_COMMUNITY_WebSocket & Notifications|WebSocket & Notifications]]
- [[_COMMUNITY_Frontend Package & Build Config|Frontend Package & Build Config]]
- [[_COMMUNITY_Layout & Auth Context|Layout & Auth Context]]
- [[_COMMUNITY_SLA Engine & Notifications Router|SLA Engine & Notifications Router]]
- [[_COMMUNITY_Admin & Attachments UI|Admin & Attachments UI]]
- [[_COMMUNITY_Sales Create Lead UI|Sales Create Lead UI]]
- [[_COMMUNITY_WebSocket Connection Manager|WebSocket Connection Manager]]
- [[_COMMUNITY_Lead Status Badges & Leads Page|Lead Status Badges & Leads Page]]
- [[_COMMUNITY_Ticket Card Component|Ticket Card Component]]
- [[_COMMUNITY_Lead Detail Page|Lead Detail Page]]
- [[_COMMUNITY_Feed Composer & Protected Routes|Feed Composer & Protected Routes]]
- [[_COMMUNITY_Analytics Dashboard UI|Analytics Dashboard UI]]
- [[_COMMUNITY_Capability Catalog UI|Capability Catalog UI]]
- [[_COMMUNITY_Admin Users Management|Admin Users Management]]
- [[_COMMUNITY_App Entry & Scheduler|App Entry & Scheduler]]
- [[_COMMUNITY_Create Ticket Modal|Create Ticket Modal]]
- [[_COMMUNITY_Obsidian Vault Config|Obsidian Vault Config]]
- [[_COMMUNITY_Migration partial_note field|Migration: partial_note field]]
- [[_COMMUNITY_Migration Initial Schema|Migration: Initial Schema]]
- [[_COMMUNITY_Frontend HTML Entry|Frontend HTML Entry]]
- [[_COMMUNITY_App Init|App Init]]
- [[_COMMUNITY_Hero Image Asset|Hero Image Asset]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]
- [[_COMMUNITY_Vite Logo Asset|Vite Logo Asset]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Frontend README|Frontend README]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `UserRole` - 77 edges
2. `User` - 59 edges
3. `Lead` - 57 edges
4. `Ticket` - 52 edges
5. `TicketType` - 49 edges
6. `Priority` - 47 edges
7. `LeadStatus` - 47 edges
8. `TeamTarget` - 45 edges
9. `EntityType` - 39 edges
10. `WinProbability` - 33 edges

## Surprising Connections (you probably didn't know these)
- `WebSocket` --uses--> `User`  [INFERRED]
  backend/app/routers/ws_router.py → backend/app/models.py
- `Session` --uses--> `Notification`  [INFERRED]
  backend/app/services/notifications.py → backend/app/models.py
- `Notification` --uses--> `Notification`  [INFERRED]
  backend/app/services/notifications.py → backend/app/models.py
- `Attachment` --uses--> `UserRole`  [INFERRED]
  backend/app/routers/attachments.py → backend/app/models.py
- `AttachmentOut` --uses--> `UserRole`  [INFERRED]
  backend/app/routers/attachments.py → backend/app/models.py

## Import Cycles
- 1-file cycle: `backend/app/services/sla.py -> backend/app/services/sla.py`
- 1-file cycle: `backend/app/services/leads.py -> backend/app/services/leads.py`
- 2-file cycle: `backend/app/models.py -> backend/app/services/sla.py -> backend/app/models.py`

## Communities (42 total, 1 thin omitted)

### Community 0 - "Database Models & Lead/Ticket Logic"
Cohesion: 0.05
Nodes (46): Config, Settings, get_current_user(), require_role(), _enum(), Create a native_enum=False Enum column type for SQLite+Postgres compat., Session, User (+38 more)

### Community 1 - "API Schemas & Pydantic Models"
Cohesion: 0.30
Nodes (48): CapabilityMatch, LeadStatus, Priority, TeamTarget, TicketType, UserRole, WinProbability, AttachmentOut (+40 more)

### Community 2 - "Project Docs & Dependencies"
Cohesion: 0.17
Nodes (43): Capability, Comment, CommentVisibility, EntityType, Lead, Notification, Append-only archive. Never UPDATE or DELETE rows from this table., StatusHistory (+35 more)

### Community 3 - "Auth, DB Config & Attachments Router"
Cohesion: 0.06
Nodes (31): 0. HOW TO USE THIS DOCUMENT (read first), 1. PRODUCT OVERVIEW, 2.10 Tech Stack, 2.1 Roles, 2.2 Leads, 2.3 Tickets, 2.4 The Lead Feed & Two-Button Composer, 2.5 Capability Catalog (+23 more)

### Community 4 - "User Auth Middleware & RBAC"
Cohesion: 0.08
Nodes (24): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, eslint, @eslint/js (+16 more)

### Community 5 - "WebSocket & Notifications"
Cohesion: 0.56
Nodes (9): Session, User, create_ticket(), hold_until(), list_lead_tickets(), _ticket_out(), toggle_hold(), update_ticket_status() (+1 more)

### Community 6 - "Frontend Package & Build Config"
Cohesion: 0.14
Nodes (12): Layout(), NAV, TYPE_ICON, AuthContext, AuthProvider(), loadSession(), QueuePage(), addWSListener() (+4 more)

### Community 7 - "Layout & Auth Context"
Cohesion: 0.10
Nodes (20): 1. Create a New Canvas, 2. Add a Node to an Existing Canvas, 3. Connect Two Nodes, 4. Edit an Existing Canvas, Colors, Common Workflows, Complete Examples, Edges (+12 more)

### Community 8 - "SLA Engine & Notifications Router"
Cohesion: 0.14
Nodes (12): CreateTicketModal(), inp, sel, TYPE_LABELS, TYPES_BY_ROLE, FeedComposer(), ProtectedRoute(), useAuth() (+4 more)

### Community 9 - "Admin & Attachments UI"
Cohesion: 0.31
Nodes (17): Attachment, AttachmentKind, Attachment, AttachmentOut, Session, User, delete_attachment(), download_attachment() (+9 more)

### Community 10 - "Sales Create Lead UI"
Cohesion: 0.18
Nodes (10): ENTITY_COLORS, pageBtn, sel, iconBtn, KIND_COLORS, KIND_LABEL, getToken(), apiFetch() (+2 more)

### Community 11 - "WebSocket Connection Manager"
Cohesion: 0.20
Nodes (20): Session, User, Session, Notification, capability_hint(), create_comment(), create_lead(), get_feed() (+12 more)

### Community 12 - "Lead Status Badges & Leads Page"
Cohesion: 0.13
Nodes (14): Callouts, Comments, Complete Example, Diagrams (Mermaid), Embeds, Footnotes, Internal Links (Wikilinks), Math (LaTeX) (+6 more)

### Community 13 - "Ticket Card Component"
Cohesion: 0.14
Nodes (8): ghostBtn, inputStyle, labelStyle, primaryBtn, PRIORITIES, PRIORITY_WEIGHT, selectStyle, WIN_PROBS

### Community 14 - "Lead Detail Page"
Cohesion: 0.21
Nodes (5): AbstractEventLoop, ConnectionManager, Broadcast from a sync route handler., Send to a single user from a sync route handler., WebSocket

### Community 15 - "Feed Composer & Protected Routes"
Cohesion: 0.15
Nodes (8): COLORS, COLORS, filterInput, ghostBtn, LeadsPage(), primaryBtn, PRIORITIES, STATUSES

### Community 16 - "Analytics Dashboard UI"
Cohesion: 0.21
Nodes (11): applyBtn, dropdownStyle(), FORWARD_MAP, nextStepRole(), pill(), SAMPLE_SALES_OPTIONS, smallBtn(), TERMINAL (+3 more)

### Community 17 - "Capability Catalog UI"
Cohesion: 0.18
Nodes (9): getCurrentStatus(), ghostBtn, labelStyle, LeadDetailPage(), OUTCOMES, PRIORITIES, selectStyle, TERMINAL (+1 more)

### Community 18 - "Admin Users Management"
Cohesion: 0.17
Nodes (11): Archive rule, Auto-update, Banned words, Context rules (ALWAYS follow this order), Datetimes, graphify, Obsidian vault, Service layer (+3 more)

### Community 19 - "App Entry & Scheduler"
Cohesion: 0.20
Nodes (9): Additional developer commands, Command reference, Common patterns, Develop/test cycle, File targeting, Obsidian CLI, Plugin development, Syntax (+1 more)

### Community 20 - "Create Ticket Modal"
Cohesion: 0.20
Nodes (9): Create a new note, Find index notes, Find related notes, Linking, Naming conventions, Obsidian Vault, Search for notes, Vault location (+1 more)

### Community 21 - "Obsidian Vault Config"
Cohesion: 0.20
Nodes (9): Embed Audio, Embed Bases, Embed Images, Embed Lists, Embed Notes, Embed PDF, Embed Search Results, Embeds Reference (+1 more)

### Community 22 - "Migration: partial_note field"
Cohesion: 0.25
Nodes (3): PRIORITY_COLORS, STATUS_COLORS, TYPE_LABELS

### Community 23 - "Migration: Initial Schema"
Cohesion: 0.25
Nodes (7): Backend, Environment Variables (backend `.env`), Frontend, Local Setup, Stack, Upjao Leads, Verify

### Community 24 - "Frontend HTML Entry"
Cohesion: 0.29
Nodes (5): btnStyle, inputStyle, labelStyle, ROLES, tdStyle

### Community 25 - "App Init"
Cohesion: 0.44
Nodes (10): Session, User, Capability, add_capability(), delete_capability(), _enrich(), list_capabilities(), After catalog changes, refresh capability_match on every non-terminal lead. (+2 more)

### Community 26 - "Hero Image Asset"
Cohesion: 0.29
Nodes (6): Basic Callout, Callouts Reference, Custom Callouts (CSS), Foldable Callouts, Nested Callouts, Supported Callout Types

### Community 27 - "React Logo Asset"
Cohesion: 0.33
Nodes (5): Flowchart, JSON Canvas Complete Examples, Project Board with Groups, Research Canvas with Files and Links, Simple Canvas with Text and Connections

### Community 28 - "Vite Logo Asset"
Cohesion: 0.40
Nodes (4): Default Properties, Properties (Frontmatter) Reference, Property Types, Tags

### Community 29 - "ESLint Config"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (5): CapabilitiesPage(), ghostBtn, inputStyle, labelStyle, primaryBtn

### Community 40 - "Community 40"
Cohesion: 0.38
Nodes (4): shutdown(), startup(), start_scheduler(), stop_scheduler()

## Knowledge Gaps
- **189 isolated node(s):** `TYPES_BY_ROLE`, `TYPE_LABELS`, `inp`, `sel`, `NAV` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRole` connect `API Schemas & Pydantic Models` to `Database Models & Lead/Ticket Logic`, `Project Docs & Dependencies`, `WebSocket & Notifications`, `Admin & Attachments UI`, `WebSocket Connection Manager`, `App Init`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `User` connect `Project Docs & Dependencies` to `Database Models & Lead/Ticket Logic`, `API Schemas & Pydantic Models`, `WebSocket & Notifications`, `Admin & Attachments UI`, `WebSocket Connection Manager`, `App Init`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `ConnectionManager` connect `Lead Detail Page` to `WebSocket Connection Manager`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 75 inferred relationships involving `UserRole` (e.g. with `AttachmentOut` and `CapabilityCreate`) actually correct?**
  _`UserRole` has 75 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `User` (e.g. with `Attachment` and `AttachmentOut`) actually correct?**
  _`User` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 54 inferred relationships involving `Lead` (e.g. with `Attachment` and `AttachmentOut`) actually correct?**
  _`Lead` has 54 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `Ticket` (e.g. with `Attachment` and `AttachmentOut`) actually correct?**
  _`Ticket` has 49 INFERRED edges - model-reasoned connections that need verification._