# P8-T2 - Implement One-Item Scheduler and Task Selection

## Phase

[Phase 08 - Ralph Scheduler and Safety](../../phases/phase-08-ralph-scheduler-and-safety.md)

## Objective

Turn `fix_plan.md` into a scheduler frontier that selects one meaningful item per loop and records how that item will be judged complete.

## Deliverables

- A parser for `fix_plan.md` tasks, status markers, and optional metadata
- Selection rules for the highest-value incomplete item
- Logic to split oversized work into loop-safe increments when needed
- Acceptance gate metadata for the selected item such as a focused test, build target, or observable behavior

## Dependencies

- [P7-T2](../phase-07/p7-t2-bootstrap-ralph-control-stack.md)
- [P8-T1](./p8-t1-build-ralph-loop-runtime-manager.md)

## Acceptance Criteria

- Each iteration has one persisted selected item and one acceptance gate
- Completed or deferred tasks stop being re-selected accidentally
- Oversized tasks can be broken down without losing the parent intent
- Side discoveries are captured as follow-ups instead of broadening the active item mid-loop
