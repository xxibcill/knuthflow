# P2-T2 - Build node-pty Manager

## Phase

[Phase 02 - Terminal Runtime](../../phases/phase-02-terminal-runtime.md)

## Objective

Implement a main-process PTY manager that can create, track, and dispose of terminal processes safely.

## Deliverables

- `node-pty` integration in the trusted process layer
- PTY lifecycle manager with create, write, resize, and dispose operations
- Session-to-PTY identity mapping
- Error handling for launch and teardown failures

## Dependencies

- [P1-T2](../phase-01/p1-t2-define-process-boundaries-and-ipc.md)
- [P1-T4](../phase-01/p1-t4-detect-claude-code-installation.md)

## Acceptance Criteria

- A PTY can be spawned and written to programmatically
- PTY instances can be resized and destroyed cleanly
- Main-process ownership is preserved
- Failure cases do not leave orphaned PTY bookkeeping

## Status

Not Implemented

