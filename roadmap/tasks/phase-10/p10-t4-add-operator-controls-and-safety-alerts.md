# P10-T4 - Add Operator Controls and Safety Alerts

## Phase

[Phase 10 - Operator Console](../../phases/phase-10-operator-console.md)

## Objective

Give operators explicit controls for pause, resume, stop, replan, and similar actions while keeping dangerous or expensive interventions guarded and auditable.

## Deliverables

- UI controls for pause, resume, stop, replan, and validate-now actions
- Confirmation flows for destructive or high-cost operations
- Alerts for circuit-open events, rate-limit sleep, permission denials, and integrity failures
- An audit trail of operator interventions linked to Ralph run history

## Dependencies

- [P8-T4](../phase-08/p8-t4-enforce-rate-limiting-circuit-breaker-and-timeouts.md)
- [P9-T3](../phase-09/p9-t3-implement-output-analysis-and-continue-or-exit-decisions.md)
- [P10-T1](./p10-t1-add-ralph-run-dashboard-and-status-cards.md)

## Acceptance Criteria

- Operators can intervene without mutating hidden state by hand
- Safety alerts explain what happened and what Ralph will do next
- Expensive or destructive actions require explicit confirmation
- Interventions are recorded so later debugging can distinguish operator action from autonomous behavior
