# P9-T2 - Build Artifact Capture and Validation Pipeline

## Phase

[Phase 09 - Evidence and Plan Repair](../../phases/phase-09-evidence-and-plan-repair.md)

## Objective

Capture the artifacts each Ralph iteration produces and run the narrowest useful validation so the loop gets fast backpressure from real evidence.

## Deliverables

- Artifact records for compiler output, test logs, diffs, exit metadata, and generated files
- A validation runner tied to the selected acceptance gate
- Escalation rules that promote from focused validation to broader checks only when needed
- Artifact retention and rotation behavior that preserves useful history without unbounded growth

## Dependencies

- [P8-T2](../phase-08/p8-t2-implement-one-item-scheduler-and-task-selection.md)
- [P8-T3](../phase-08/p8-t3-add-claude-session-continuity-and-execution-adapter.md)

## Acceptance Criteria

- Every iteration stores the validation artifacts that justify its next decision
- Validation starts narrow and broadens intentionally rather than by default
- Local failures can be distinguished from unrelated suite or environment failures
- Artifact retention is explicit enough to support UI inspection and recovery
