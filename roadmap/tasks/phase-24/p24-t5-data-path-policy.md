# P24-T5 - Data Path Policy

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Decide and implement naming policy for database, userData, logs, secure storage, and test environment variables.

## Deliverables

- Decide whether `knuthflow.db` remains, is renamed to `ralph.db`, or is supported through fallback lookup.
- Decide whether app userData path changes with product identity or remains stable.
- Decide whether `KNUTHFLOW_USER_DATA_DIR` gains a `RALPH_USER_DATA_DIR` alias.
- Decide whether log directory, storage file, and secure storage paths change.
- Implement chosen environment variable alias behavior for tests and local overrides.
- Document the policy in PRD, IPC docs, or release notes as appropriate.

## Dependencies

- Phase 22 brand migration decision is complete.
- Database initialization and test harness userData override points are known.

## Acceptance Criteria

- Data naming policy is explicit and implemented.
- Existing user data is not made inaccessible by a rename.
- Test user data override continues to work.
- Release notes can explain the behavior without ambiguity.
