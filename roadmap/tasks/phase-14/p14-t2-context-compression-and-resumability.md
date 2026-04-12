# P14-T2 - Context Compression And Resumability

## Phase

[Phase 14 - Long-Horizon App Builder](../../phases/phase-14-long-horizon-app-builder.md)

## Objective

Preserve app-level intent and progress across long autonomous runs through compact summaries, milestone snapshots, and resumable context packs.

## Deliverables

- Context-compression logic that distills product intent, current architecture, recent changes, blockers, and open milestones into bounded promptable state.
- Milestone and iteration snapshot storage designed for recovery and operator inspection.
- Resume logic that can restore the compressed app-building context after pause, restart, or session expiration.

## Dependencies

- Milestone controller state from `P14-T1`.
- Existing Ralph summary, snapshot, artifact, and recovery primitives from earlier phases.

## Acceptance Criteria

- Long-running app builds can continue after interruption without manually reconstructing the entire plan in control files.
- The prompt context sent to Ralph stays bounded while still preserving milestone intent and recent evidence.
- Operators can inspect the compressed state used for resume and verify why Ralph continued with a given next action.
