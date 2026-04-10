# P2-T3 - Wire Terminal IO and Resize

## Phase

[Phase 02 - Terminal Runtime](../../phases/phase-02-terminal-runtime.md)

## Objective

Connect the renderer terminal and the main-process PTY manager so input, output, and terminal sizing work end to end.

## Deliverables

- IPC events for PTY output streaming
- Renderer-to-main input forwarding
- Resize synchronization between `xterm.js` and PTY dimensions
- Connection teardown behavior for closed sessions

## Dependencies

- [P2-T1](./p2-t1-integrate-xterm-terminal-view.md)
- [P2-T2](./p2-t2-build-node-pty-manager.md)

## Acceptance Criteria

- Keyboard input reaches the PTY
- PTY output renders correctly in the terminal
- Resizing updates both the UI and the backing PTY
- Disconnected sessions stop streaming without crashing the renderer

## Status

Not Implemented

