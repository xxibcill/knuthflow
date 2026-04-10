# P4-T1 - Persist Settings and Profiles

## Phase

[Phase 04 - Settings and Local State](../../phases/phase-04-settings-and-local-state.md)

## Objective

Define how user settings and launch profiles are stored locally so the app can provide stable configuration behavior.

## Deliverables

- Settings schema and storage location
- Launch profile model for reusable Claude Code configurations
- Read and write API in the trusted layer
- Defaults and migration behavior

## Dependencies

- [P3-T2](../phase-03/p3-t2-create-session-database-schema.md)

## Acceptance Criteria

- Settings persist across app restarts
- Profiles can represent reusable launch choices
- Defaults are predictable on first run
- Future settings changes can be migrated safely

