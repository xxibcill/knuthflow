# P17-T4 - Automated Prompt Injection

## Phase

[Phase 17 - Delivery Intelligence and Loop Learning](../../phases/phase-17.md)

## Objective

Add automated PROMPT.md countermeasure injection when repeated mistake patterns are detected, so Ralph self-corrects without operator intervention.

## Deliverables

- Threshold-based injection: when a mistake pattern repeats N times (configurable, default 3), auto-inject countermeasure into PROMPT.md
- Countermeasure format: comment block at top of PROMPT.md listing active countermeasures
- Countermeasure removal: if pattern stops repeating for M consecutive runs, flag countermeasure for removal
- Version tracking of PROMPT.md modifications
- Operator approval toggle: auto-inject vs. operator-must-approve before injection

## Dependencies

- P17-T1 (Learning Pipeline) complete

## Acceptance Criteria

- Repeated mistake patterns trigger PROMPT.md countermeasure injection automatically
- Operator can view all active countermeasures in PROMPT.md
- Auto-inject can be toggled on/off per project
- Countermeasures trackable and reversible