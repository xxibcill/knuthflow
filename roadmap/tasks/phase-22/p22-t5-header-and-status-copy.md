# P22-T5 - Header And Status Copy

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Update header, badges, dependency warnings, and status summaries so they report Ralph project and run state before raw terminal state.

## Deliverables

- Replace generic active workspace copy with Ralph project context where possible.
- Add or update badges for Ralph readiness, active run, paused run, failed run, and delivery-ready state.
- Reframe Claude Code dependency warnings as Ralph execution dependency warnings.
- Update run summary language so it distinguishes Ralph run state from raw PTY session state.
- Ensure session crash and recovery notifications explain impact on Ralph work.
- Audit header copy for old wrapper-centric language.

## Dependencies

- Ralph project lifecycle states from Phase 23 may be drafted.
- Existing run-state and readiness data is available in renderer state or IPC.

## Acceptance Criteria

- Header and status areas communicate what Ralph can do next.
- Missing Claude Code messaging explains why Ralph cannot execute locally.
- Raw terminal status is still available when the terminal view is active.
- No status copy implies unmanaged autonomous behavior.
