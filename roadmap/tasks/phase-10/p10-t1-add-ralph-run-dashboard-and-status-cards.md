# P10-T1 - Add Ralph Run Dashboard and Status Cards

## Phase

[Phase 10 - Operator Console](../../phases/phase-10-operator-console.md)

## Objective

Surface Ralph runs in the renderer with clear status cards so operators can see health, progress, and safety state without digging through logs.

## Deliverables

- A Ralph dashboard view for active, paused, failed, and completed runs
- Status cards showing workspace, current phase, selected item, loop count, and safety state
- Filtering or grouping for multiple Ralph-enabled workspaces
- Empty, loading, and invalid-project states for the dashboard

## Dependencies

- [P7-T4](../phase-07/p7-t4-expose-ralph-project-apis-through-ipc.md)
- [P8-T1](../phase-08/p8-t1-build-ralph-loop-runtime-manager.md)

## Acceptance Criteria

- Operators can identify the active Ralph state for each workspace at a glance
- Dashboard status updates as loop state changes without manual refresh
- Invalid or not-yet-bootstrapped workspaces are represented clearly
- The dashboard adds value even when only one Ralph run exists
