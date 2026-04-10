# P2-T1 - Integrate xterm.js Terminal View

## Phase

[Phase 02 - Terminal Runtime](../../phases/phase-02-terminal-runtime.md)

## Objective

Add an embedded terminal view in the renderer that can display a real shell or Claude Code session.

## Deliverables

- `xterm.js` wired into a reusable renderer component
- Theme and sizing defaults that work in the app layout
- Terminal mount and cleanup lifecycle handling
- Empty-state UI before a session is attached

## Dependencies

- [P1-T1](../phase-01/p1-t1-scaffold-electron-shell.md)

## Acceptance Criteria

- The renderer can display a working terminal surface
- The terminal resizes with the window
- Mounting and unmounting do not leak obvious resources
- The component is reusable for later tab support

## Status

Not Implemented

