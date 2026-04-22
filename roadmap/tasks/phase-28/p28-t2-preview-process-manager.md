# P28-T2 - Preview Process Manager

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Manage preview server lifecycle, port allocation, timeout handling, cleanup, and logs for Ralph visual validation.

## Deliverables

- Start preview commands in the selected workspace with bounded timeout.
- Allocate or validate ports without colliding with existing Ralph services.
- Detect readiness through HTTP response, log pattern, or configured health URL.
- Capture stdout/stderr logs as artifacts.
- Stop preview processes reliably after validation or on cancellation.
- Handle startup failure, timeout, and port conflict as recoverable states.

## Dependencies

- P28-T1 command detection exists.
- Existing process/PTY utilities can launch and stop local commands safely.

## Acceptance Criteria

- Ralph can start and stop a preview server for a supported app.
- Preview failures are reported with logs.
- Orphan preview processes are cleaned up.
- Port conflicts produce actionable recovery guidance.
