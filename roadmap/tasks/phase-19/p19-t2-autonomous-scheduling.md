# P19-T2 - Autonomous Iteration Scheduling

## Phase

[Phase 19 - Autonomous Post-Delivery Iteration](../../phases/phase-19.md)

## Objective

Implement autonomous iteration scheduling so when monitoring detects regressions, a new Ralph run is automatically created targeting the specific issue.

## Deliverables

- Auto-run creator: when regression detected, create new Ralph run scoped to fix the regression
- Regression-to-task mapping: specific failures (lint, test, build) map to specific fix_plan.md tasks
- Run prioritization: regression-triggered runs have elevated priority vs. scheduled maintenance runs
- Concurrency limits: auto-runs respect same limits as operator-initiated runs
- Run outcome tracking: auto-runs tracked separately in metrics with "auto-fix" label

## Dependencies

- P19-T1 (Monitoring Service) complete

## Acceptance Criteria

- Detected regression automatically creates new Ralph run
- New run is scoped to fix the specific regression (not full app rebuild)
- Auto-run outcomes tracked in delivery metrics
- Operator can disable auto-run per app