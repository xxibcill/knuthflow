# P14-T1 - Milestone Controller And Task Graph

## Phase

[Phase 14 - Long-Horizon App Builder](../../phases/phase-14-long-horizon-app-builder.md)

## Objective

Upgrade Ralph’s execution model so it can build an application across milestones and dependent task groups instead of only iterating on a flat fix loop.

## Deliverables

- A milestone-aware controller that tracks app goals, milestone state, task dependencies, and completion progress.
- Persisted milestone and task-graph state that survives pause, resume, recovery, and replanning.
- Scheduling rules that can choose the next app-building task based on dependency readiness, validation state, and milestone priorities.

## Dependencies

- Deterministic app blueprints from Phase 13.
- Existing Ralph scheduler and controller modules from Phase 12 as integration points.

## Acceptance Criteria

- Ralph can execute a multi-step app build where tasks unlock in dependency order rather than only by line order in `fix_plan.md`.
- Milestone status is visible and persisted independently from individual loop iterations.
- Recovery after pause or crash resumes from the same milestone/task graph state instead of forcing manual reconstruction.
