# P11-T2 - Recover Interrupted Ralph Runs and Stale State

## Phase

[Phase 11 - Recovery and Release Readiness](../../phases/phase-11-recovery-and-release-readiness.md)

## Objective

Recover interrupted Ralph runs on startup or resume and clean up stale runtime state before it wedges the workspace permanently.

## Deliverables

- Startup recovery for in-progress Ralph runs
- Resume rules for stale session IDs, partially persisted runtime records, and abandoned locks
- Cleanup paths for orphaned artifacts and invalid runtime state
- Recovery messaging that distinguishes recoverable from unrecoverable failure modes

## Dependencies

- [P5-T1](../phase-05/p5-t1-add-process-supervision-and-recovery.md)
- [P7-T3](../phase-07/p7-t3-add-workspace-readiness-and-integrity-validation.md)
- [P8-T1](../phase-08/p8-t1-build-ralph-loop-runtime-manager.md)

## Acceptance Criteria

- App restart can resume or fail a Ralph run cleanly with no hidden manual cleanup
- Stale locks and stale session metadata do not prevent future runs indefinitely
- Recovery decisions are recorded for later debugging
- Unrecoverable states fail loudly enough for the operator to repair them
