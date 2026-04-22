# P26-T4 - Iteration Backlog Structure

## Phase

[Phase 26 - Post-Release Stability and Iteration Foundation](../../phases/phase-26-post-release-stability-and-iteration-foundation.md)

## Objective

Design and implement a structured backlog for capturing improvement ideas from operator signals.

## Deliverables

- Define an iteration_backlog table or equivalent in SQLite with fields: id, title, description, source (operator feedback, health signal, delivered app evidence, internal), priority (high, medium, low), status (open, in-progress, done, dismissed), created_at, updated_at.
- Add IPC handlers to create backlog entries, update status/priority, list entries by status or priority, and dismiss entries.
- Add a UI panel accessible from the operator console to view, create, update, and dismiss backlog entries.
- Populate an initial backlog from known issues from Phase 25 release checklist and known limitations.
- Add a "link to feedback" action so backlog entries can be linked to specific operator feedback submissions.
- Ensure backlog entries can be created programmatically so future health signals can auto-generate items.

## Dependencies

- P26-T2 operator feedback channels are in place so backlog can be populated from real feedback.
- P26-T3 delivered app registry is in place so follow-up signals can generate backlog entries.
- Local SQLite is available.

## Acceptance Criteria

- Operators can view, create, update, and dismiss backlog entries from in-app UI.
- Backlog entries capture title, description, source, priority, and status.
- Backlog can be seeded with initial items from Phase 25 known limitations.
- Feedback submissions can be linked to backlog entries.
- Delivered app follow-up signals can generate backlog entries programmatically.
- Backlog persists across sessions.
