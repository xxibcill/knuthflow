# P12-T3 - Operator Console And Verification

## Phase

[Phase 12 - Ralph Flow Upgrade](../../phases/phase-12-ralph-flow-upgrade.md)

## Objective

Finish the operator-facing Ralph surface and add automated coverage that proves the upgraded loop works in normal and failure scenarios.

## Deliverables

- Implemented IPC handlers for artifact listing, run validation, replanning, and other Ralph console actions that are currently exposed to the renderer.
- Console behavior that reflects real runtime/controller state for pause, resume, stop, replan, validate, and artifact inspection.
- Automated tests for bootstrap, happy-path loop execution, validation failure, stale-plan replan, and recovery or resume scenarios.
- Documentation updates describing the supported Ralph operating model and the test bar for future changes.

## Dependencies

- The loop controller and redesigned control files from P12-T1 and P12-T2 are available to exercise through the operator surface.
- Existing dry-run harness and artifact infrastructure remain available as test and observability building blocks.

## Acceptance Criteria

- Every Ralph console action exposed in preload has a matching main-process implementation and an exercised runtime path.
- Operators can inspect artifacts and trigger validation or replanning without hitting missing-handler or no-op behavior.
- CI-level automated coverage exists for the main Ralph execution path and the highest-risk failure and recovery branches.
