# Phase 08 - Ralph Scheduler and Safety

## Functional Feature Outcome

Users can start, pause, resume, and stop a Ralph loop that selects one item at a time, reuses session context, and halts safely when progress or quota rules fail.

## Why This Phase Exists

Bootstrap alone does not deliver autonomy. This phase turns the saved Ralph project into a live scheduler with explicit run ownership, session continuity, and hard stop conditions.

## Scope

- Loop runtime lifecycle
- One-item scheduler and task selection
- Claude execution adapter with session continuity
- Rate limiting, circuit breaker behavior, and timeout handling

## Tasks

| Task | Summary |
| --- | --- |
| [P8-T1](../tasks/phase-08/p8-t1-build-ralph-loop-runtime-manager.md) | Add the main-process runtime that owns Ralph run lifecycle and persisted state transitions |
| [P8-T2](../tasks/phase-08/p8-t2-implement-one-item-scheduler-and-task-selection.md) | Select one meaningful backlog item per loop and persist its acceptance gate |
| [P8-T3](../tasks/phase-08/p8-t3-add-claude-session-continuity-and-execution-adapter.md) | Build the Claude invocation layer for pinned context, output capture, and session reuse |
| [P8-T4](../tasks/phase-08/p8-t4-enforce-rate-limiting-circuit-breaker-and-timeouts.md) | Enforce the safety gates that stop wasteful or runaway autonomous execution |

## Dependencies

- Phase 07 complete
- Claude launch and PTY execution remain stable enough to support repeated runs

## Exit Criteria

- Ralph can execute multiple iterations against one workspace without losing run state
- Each iteration has one explicit selected item and acceptance gate
- Session reuse works when valid and falls back safely when not
- Safety gates can stop or pause autonomous execution with a clear recorded reason
