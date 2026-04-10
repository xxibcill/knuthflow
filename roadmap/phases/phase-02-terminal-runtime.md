# Phase 02 - Terminal Runtime

## Functional Feature Outcome

Users can launch Claude Code in a PTY-backed embedded terminal and interact with it as if it were running in a native terminal window.

## Why This Phase Exists

The terminal runtime is the product core. If PTY behavior, input handling, output streaming, and resize behavior are weak, the wrapper fails regardless of UI polish.

## Scope

- Render a terminal in the UI
- Spawn PTYs in the trusted process boundary
- Stream terminal input and output
- Launch and stop Claude Code sessions cleanly

## Tasks

| Task | Summary |
| --- | --- |
| [P2-T1](../tasks/phase-02/p2-t1-integrate-xterm-terminal-view.md) | Add the `xterm.js` terminal component in the renderer |
| [P2-T2](../tasks/phase-02/p2-t2-build-node-pty-manager.md) | Implement a PTY manager around `node-pty` in the main process |
| [P2-T3](../tasks/phase-02/p2-t3-wire-terminal-io-and-resize.md) | Connect terminal input, output, resize, and lifecycle events over IPC |
| [P2-T4](../tasks/phase-02/p2-t4-launch-and-monitor-claude-code-runs.md) | Start, stop, and monitor Claude Code processes with usable status feedback |

## Dependencies

- Phase 01 complete
- A stable CLI detection result is available

## Exit Criteria

- A user can open a terminal pane and interact with Claude Code
- Terminal colors, cursor movement, and resize behavior are acceptable
- Process start and stop states are visible to the user
- Broken or missing CLI states fail clearly

