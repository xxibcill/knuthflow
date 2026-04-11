# P11-T1 - Add Controlled Commit and Checkpoint Workflow

## Phase

[Phase 11 - Recovery and Release Readiness](../../phases/phase-11-recovery-and-release-readiness.md)

## Objective

Let Ralph checkpoint validated progress with a narrow, reviewable git workflow instead of broad shell-level repository power.

## Deliverables

- Whitelisted git actions for stage, commit, and optional tag creation from validated runs
- Checkpoint rules that tie a commit to the selected item and its plan snapshot
- Preflight checks that keep unrelated dirty user changes out of Ralph checkpoints
- Stored checkpoint metadata inside Ralph run history

## Dependencies

- [P8-T2](../phase-08/p8-t2-implement-one-item-scheduler-and-task-selection.md)
- [P9-T2](../phase-09/p9-t2-build-artifact-capture-and-validation-pipeline.md)
- [P10-T4](../phase-10/p10-t4-add-operator-controls-and-safety-alerts.md)

## Acceptance Criteria

- Ralph can create a checkpoint only after the relevant acceptance gate passes
- Unrelated local changes are not swept into autonomous commits
- Checkpoints are traceable back to a loop iteration and selected item
- Git permissions remain intentionally narrower than a general shell
