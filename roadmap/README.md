# Roadmap

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
| [Phase 12](./phases/phase-12-ralph-flow-upgrade.md) | Ralph Flow Upgrade | Ralph mode becomes a coherent end-to-end loop with deterministic control files, stable plan semantics, and implemented operator actions |
| [Phase 13](./phases/phase-13-goal-to-app-bootstrap.md) | Goal To App Bootstrap | Users can turn an app idea into a scaffolded Ralph-ready workspace with generated specs, starter structure, and an approved initial plan |
| [Phase 14](./phases/phase-14-long-horizon-app-builder.md) | Long-Horizon App Builder | Ralph can build a larger application across milestones with resumable context, preview feedback, and milestone-aware replanning |
| [Phase 15](./phases/phase-15-desktop-one-shot-delivery.md) | Desktop One-Shot Delivery | Users can request an app from Knuthflow, review it in the desktop UI, and receive packaged delivery artifacts with explicit approval gates |

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
12. Consolidate the accumulated Ralph modules into a single real loop flow before scaling autonomous usage further.
13. Add a goal-intake and workspace-bootstrap layer so Ralph can start from an app brief instead of requiring a pre-authored repository setup.
14. Extend the upgraded Ralph loop into a milestone-aware app builder that can stay coherent across long-running product work.
15. Finish with desktop review, packaging, and end-to-end delivery so the product can honestly support a one-shot app workflow for supported targets.

## Creating a New Phase

### 1. Create the Phase Document

Copy `phases/PHASE-TEMPLATE.md` to `phases/phase-XX-[slug].md` and fill in:

- **Phase number and name** — Sequential number based on current phases
- **Functional Feature Outcome** — One sentence describing user value
- **Why This Phase Exists** — Motivation paragraph
- **Scope** — Bullet list of major areas
- **Tasks** — Table linking to task documents
- **Dependencies** — Prerequisites for starting
- **Exit Criteria** — Observable outcomes that mark completion

### 2. Create Task Documents

For each task in the phase:

1. Create `tasks/phase-XX/pX-tX-[slug].md` from the template
2. Fill in the task details
3. Update the phase document's task table

### 3. Update Roadmap README

Add the new phase to the Phase Overview table and Sequencing Logic if needed.

## Task Structure

Each phase has:

- One phase document with scope, dependencies, and exit criteria
- Multiple task documents with focused deliverables and acceptance criteria

Task naming convention:

- `P1-T1` means Phase 01, Task 01
- `P4-T3` means Phase 04, Task 03

## Phase and Task Templates

### Phase Template

```markdown
# Phase XX - [Phase Name]

## Functional Feature Outcome

[One sentence describing what the user gets when this phase is complete]

## Why This Phase Exists

[One paragraph explaining the motivation and why this phase matters to the product]

## Scope

- [Bullet point]
- [Bullet point]

## Tasks

| Task | Summary |
| --- | --- |
| [PX-T1](../tasks/phase-XX/pX-t1-[task-slug].md) | [Task summary] |
| [PX-T2](../tasks/phase-XX/pX-t2-[task-slug].md) | [Task summary] |
| [PX-T3](../tasks/phase-XX/pX-t3-[task-slug].md) | [Task summary] |

## Dependencies

- [What must be true before this phase starts]
- [Any external requirements]

## Exit Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- [Observable outcome 3]
```

### Task Template

```markdown
# PX-TX - [Task Title]

## Phase

[Phase Name](../phases/phase-XX-name.md)

## Objective

[One sentence describing the deliverable]

## Deliverables

- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

## Dependencies

- [What must exist or be completed first]
- [Any external constraints]

## Acceptance Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- [Observable outcome 3]
```
