# P7-T1 - Define Ralph Project Domain Model

## Phase

[Phase 07 - Ralph Project Bootstrap](../../phases/phase-07-ralph-project-bootstrap.md)

## Objective

Introduce the core Ralph project types, filesystem conventions, and persisted state model so the loop runtime, UI, and recovery logic all share one source of truth.

## Deliverables

- Type definitions for Ralph projects, loop runs, selected items, summaries, and plan snapshots
- Storage layout rules for `.ralph/`, `status.json`, `.session_id`, `loop_summary.md`, and plan snapshots
- Database extensions or persisted metadata for Ralph-enabled workspaces and loop history
- A versioning and migration strategy for workspaces that do not yet contain Ralph state

## Dependencies

- [P3-T2](../phase-03/p3-t2-create-session-database-schema.md)
- [P4-T1](../phase-04/p4-t1-persist-settings-and-profiles.md)

## Acceptance Criteria

- Ralph state can be persisted and reloaded without ambiguous file ownership
- The model distinguishes workspace bootstrap data from per-run transient state
- Existing non-Ralph workspaces remain usable without forced migration
- The persisted model is versioned so future schema changes are manageable
