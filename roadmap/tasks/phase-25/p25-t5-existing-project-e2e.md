# P25-T5 - Existing Project E2E

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Add or update e2e coverage for opening, repairing, and resuming an existing Ralph-enabled workspace.

## Deliverables

- Create fixture workspaces for ready, partially bootstrapped, and stale-run states.
- Test opening an existing Ralph-ready project and loading dashboard state.
- Test readiness issue display for a partially bootstrapped project.
- Test repair/bootstrap action for missing control files where safe.
- Test resume or recovery path for stale active run state.
- Verify user-authored files are preserved in repair scenarios.

## Dependencies

- Workspace helper utilities can create fixture folders.
- Readiness and repair flows are implemented.

## Acceptance Criteria

- Existing Ralph projects open directly into Ralph project context.
- Repair path identifies missing or malformed pieces before changing files.
- Stale run state produces recovery action.
- Tests confirm preservation of operator-authored files where applicable.
