# P24-T6 - Data Migration Safeguards

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Add safeguards for existing local data if any database, userData, log, or storage path changes.

## Deliverables

- Create migration logic only if the data path policy requires a rename or fallback.
- Back up or copy existing database before renaming if needed.
- Prefer read-compatible fallback over destructive moves.
- Ensure workspaces, sessions, settings, Ralph projects, runs, artifacts, portfolios, blueprints, logs, and secrets remain accessible.
- Add tests or fixtures for old-path data opening under the new policy.
- Clearly report migration errors without deleting old data.

## Dependencies

- P24-T5 data path policy is complete.
- Database schema migrations are stable.

## Acceptance Criteria

- Existing local data survives first launch after the policy change.
- Migration errors leave old data intact.
- Tests cover old-path compatibility when a rename/fallback is implemented.
- No destructive data operation runs without explicit policy support.
