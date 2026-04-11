# P8-T1 - Build Ralph Loop Runtime Manager

## Phase

[Phase 08 - Ralph Scheduler and Safety](../../phases/phase-08-ralph-scheduler-and-safety.md)

## Objective

Add the main-process runtime that owns Ralph loop lifecycle, concurrency, persisted run state, and transitions between planning, execution, validation, pause, and completion.

## Deliverables

- A Ralph runtime manager service that owns active runs per workspace
- Run states for idle, starting, planning, executing, validating, paused, failed, and completed loops
- Start, pause, resume, stop, and inspect operations with persisted history
- Concurrency rules that prevent overlapping Ralph runs from corrupting one workspace

## Dependencies

- [P2-T4](../phase-02/p2-t4-launch-and-monitor-claude-code-runs.md)
- [P7-T1](../phase-07/p7-t1-define-ralph-project-domain-model.md)
- [P7-T4](../phase-07/p7-t4-expose-ralph-project-apis-through-ipc.md)

## Acceptance Criteria

- One workspace cannot accidentally host multiple competing Ralph runs
- Run lifecycle state survives window refreshes and app restarts
- Operators and later services can query the current loop state deterministically
- Stop and pause semantics leave the workspace in a recoverable state
