# P26-T3 - Delivered App Registry

## Phase

[Phase 26 - Post-Release Stability and Iteration Foundation](../../phases/phase-26-post-release-stability-and-iteration-foundation.md)

## Objective

Create a registry of delivered apps with health status, last-seen timestamp, and follow-up signal fields.

## Deliverables

- Define a delivered_app table or equivalent in SQLite with fields: app name, workspace path, delivery date, health status, last-seen timestamp, follow-up signal, and notes.
- Populate the registry when a delivery is confirmed (from delivery completion event in P26-T1).
- Add IPC handlers to read, update health status, update follow-up signal, and query the registry.
- Add a UI panel to view delivered apps, update health status, and record follow-up notes.
- Add a "request follow-up" action that creates a follow-up signal for a specific delivered app.
- Ensure the registry survives app updates and does not lose data between sessions.

## Dependencies

- P26-T1 health instrumentation is in place so delivery events fire correctly.
- Local SQLite is available.
- Phase 15 or Phase 23 delivery flow is implemented enough to trigger the handoff event.

## Acceptance Criteria

- Delivered apps are registered automatically on delivery handoff.
- Registry shows app name, delivery date, health status, and last-seen.
- Operators can update health status and add follow-up notes from the UI.
- Follow-up signal can be raised for a specific delivered app.
- Registry data persists across app restarts and updates.
