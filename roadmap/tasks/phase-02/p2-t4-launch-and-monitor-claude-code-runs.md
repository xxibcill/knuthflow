# P2-T4 - Launch and Monitor Claude Code Runs

## Phase

[Phase 02 - Terminal Runtime](../../phases/phase-02-terminal-runtime.md)

## Objective

Launch Claude Code inside the PTY, expose run state, and handle normal exits and failures cleanly.

## Deliverables

- Launch flow for Claude Code using the detected executable
- Status model for starting, running, exited, and failed states
- User-facing status UI around the terminal
- Termination and cleanup behavior for intentional stop and unexpected exit

## Dependencies

- [P2-T2](./p2-t2-build-node-pty-manager.md)
- [P2-T3](./p2-t3-wire-terminal-io-and-resize.md)

## Acceptance Criteria

- Users can start Claude Code from the app
- Run state is visible while the process is active
- Normal exit and failure states are distinguishable
- Stopping a run does not leave terminal state inconsistent

## Status

Not Implemented

