# Knuthflow Roadmap

This roadmap turns the current PRD direction into an execution plan for a desktop wrapper around Claude Code CLI.

Current product bias:

- Terminal-first desktop app first
- PTY-backed Claude Code execution as the core feature
- Monaco and IDE-like editing deferred until the wrapper is stable

## Phase Overview

| Phase | Focus | Functional Feature Outcome |
| --- | --- | --- |
| [Phase 01](./phases/phase-01-foundation-and-desktop-shell.md) | Foundation | App boots securely, renderer and main process are separated, and Claude Code installation can be detected |
| [Phase 02](./phases/phase-02-terminal-runtime.md) | Terminal Runtime | Users can run Claude Code in a real PTY-backed terminal inside the app |
| [Phase 03](./phases/phase-03-workspaces-and-sessions.md) | Workspaces and Sessions | Users can manage workspaces, track sessions, and switch terminal tabs cleanly |
| [Phase 04](./phases/phase-04-settings-and-local-state.md) | Settings and Local State | Users can configure the wrapper through GUI settings, profiles, logs, and secure local state |
| [Phase 05](./phases/phase-05-reliability-and-distribution.md) | Reliability and Distribution | The app is resilient enough to package, update, recover, and ship |
| [Phase 06](./phases/phase-06-ide-expansion-optional.md) | IDE Expansion Optional | The app adds editor, diff, and richer side-panel workflows without replacing the terminal core |
| [Phase 07](./phases/phase-07-ralph-project-bootstrap.md) | Ralph Project Bootstrap | Users can turn a workspace into a Ralph-ready project with control files, persistent loop state, and readiness checks |
| [Phase 08](./phases/phase-08-ralph-scheduler-and-safety.md) | Ralph Scheduler and Safety | Users can run a one-item-at-a-time Ralph loop with session continuity, rate limits, and circuit breakers |
| [Phase 09](./phases/phase-09-evidence-and-plan-repair.md) | Evidence and Plan Repair | Ralph can search the codebase, validate changes, analyze artifacts, and regenerate the fix plan from evidence |
| [Phase 10](./phases/phase-10-operator-console.md) | Operator Console | Users can monitor Ralph runs, inspect backlog and artifacts, and intervene safely from the desktop UI |
| [Phase 11](./phases/phase-11-recovery-and-release-readiness.md) | Recovery and Release Readiness | Autonomous runs can checkpoint, recover, and ship with test harnesses and operator documentation |

## Sequencing Logic

1. Build the Electron shell and security boundary first.
2. Make Claude Code execution reliable through `node-pty` and `xterm.js`.
3. Add workspace and session ergonomics after the runtime is stable.
4. Layer settings, persistence, diagnostics, and secure storage next.
5. Harden packaging, updater, and recovery before wider release.
6. Treat Phase 06 as optional; richer editor and diff surfaces should not block autonomous loop work.
7. Bootstrap the Ralph control stack and persisted workspace state after the wrapper runtime is stable.
8. Add the autonomous scheduler, session continuity, and safety gates next.
9. Layer search, validation backpressure, artifact analysis, and plan repair on top of the scheduler.
10. Expose operator-facing controls and observability once the loop can make grounded decisions.
11. Finish with checkpointing, crash recovery, dry-run testing, and release documentation for autonomous mode.

## Task Structure

Each phase has:

- One phase document with scope, dependencies, and exit criteria
- Multiple task documents with focused deliverables and acceptance criteria

Task naming convention:

- `P1-T1` means Phase 01, Task 01
- `P4-T3` means Phase 04, Task 03
