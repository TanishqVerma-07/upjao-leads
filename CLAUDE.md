# Upjao Leads — Conventions

## Banned words
- The word **"tender"** is banned everywhere: code, comments, UI text, table names, variable names.

## Archive rule
- `status_history` is **append-only**. Never write UPDATE or DELETE against it.
- Every status change on a lead or ticket must write a new row to `status_history`.

## State change rules
- Every state change must be stamped with who changed it (`changed_by`) and when (`changed_at`).
- Every state change → one `status_history` row + relevant `notifications` rows.

## Service layer
- Service layer owns all transition validation and side effects (archive write + notifications).
- Keep routes thin — no business logic in route handlers.

## Datetimes
- All datetimes stored as UTC in the database.
- Format for IST (Asia/Kolkata) in the UI.

## UI
- Before any UI work, invoke the `frontend-design` skill.

## graphify

This project has a knowledge graph at `graphify-out/` and an Obsidian vault at `Sales Product/`.

### Context rules (ALWAYS follow this order)
1. For any codebase question, run `graphify query "<question>"` FIRST — do not grep or read raw files until graphify has oriented you.
2. For relationships between two things: `graphify path "<A>" "<B>"`
3. For a focused explanation: `graphify explain "<concept>"`
4. For architecture overview: read `graphify-out/GRAPH_REPORT.md`
5. Only read raw source files when you need to edit a specific line or the graph doesn't have enough detail.

### Auto-update
- The post-commit hook auto-rebuilds `graph.json` and re-exports to the Obsidian vault after every commit.
- After manual code edits (no commit yet): run `graphify update .` to refresh graph.json without LLM cost.
- After adding docs/images/new files: run `/graphify . --update` (uses LLM for semantic extraction).

### Obsidian vault
- Vault path: `Sales Product/` (already registered in Obsidian)
- Canvas: `Sales Product/graph.canvas` — open in Obsidian for the visual community graph
- 501 notes auto-generated, one per node; backlinks are real wikilinks Obsidian can traverse
- To force a full re-export after a manual graphify update: `graphify export obsidian --dir "Sales Product/"`
