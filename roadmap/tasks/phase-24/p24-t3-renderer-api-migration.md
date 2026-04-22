# P24-T3 - Renderer API Migration

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Migrate Ralph-facing renderer code from `window.knuthflow` to `window.ralph` in scoped batches.

## Deliverables

- Migrate Ralph console components to `window.ralph`.
- Migrate delivery, maintenance, monitoring, portfolio, and blueprint components to `window.ralph`.
- Leave unrelated low-risk code for later if migration would make the diff too broad.
- Avoid mixed aliases in the same component unless intentionally preserving compatibility behavior.
- Update imports/types where needed.
- Run typecheck or build after migration.

## Dependencies

- P24-T1 and P24-T2 are complete.
- Renderer components have test or build coverage.

## Acceptance Criteria

- New Ralph-facing renderer code uses `window.ralph` by default.
- Migrated components still compile and behave the same.
- `window.knuthflow` remains only where intentionally deferred or compatibility-tested.
- Migration does not change IPC semantics.
