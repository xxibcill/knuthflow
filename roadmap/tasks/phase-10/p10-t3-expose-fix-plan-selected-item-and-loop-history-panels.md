# P10-T3 - Expose Fix Plan, Selected Item, and Loop History Panels

## Phase

[Phase 10 - Operator Console](../../phases/phase-10-operator-console.md)

## Objective

Expose the current backlog frontier, active selected item, and prior iteration summaries so operators can understand why Ralph chose its current work.

## Deliverables

- UI panels for `fix_plan.md`, the selected item, and deferred follow-ups
- A loop-history view with per-iteration summaries and outcomes
- Plan snapshot comparison or diff views
- Quick actions to open the relevant workspace or control files from the console

## Dependencies

- [P7-T2](../phase-07/p7-t2-bootstrap-ralph-control-stack.md)
- [P9-T4](../phase-09/p9-t4-regenerate-fix-plans-and-capture-loop-learning.md)
- [P10-T1](./p10-t1-add-ralph-run-dashboard-and-status-cards.md)

## Acceptance Criteria

- Operators can tell what Ralph is doing now and what it recently did
- Plan revisions can be compared without reading raw files in another tool
- Deferred follow-ups remain visible instead of disappearing into loop logs
- Navigation from the console to the underlying workspace context is direct
