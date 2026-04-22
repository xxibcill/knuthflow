# P23-T8 - Terminal Linkage

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Label and link Ralph-owned terminal sessions so operators can inspect runtime output without confusing managed runs with ad hoc sessions.

## Deliverables

- Store or derive association between Ralph run ID, session ID, PTY session ID, workspace ID, and tab ID.
- Label Ralph-owned tabs with project/run context.
- Provide "Open runtime terminal" action from the run dashboard.
- Provide "Back to Ralph run" action or context from terminal view where feasible.
- Distinguish ad hoc terminal sessions from Ralph-managed sessions.
- Ensure terminal stop/exit events update Ralph-facing recovery state.

## Dependencies

- Session and run IDs are linked during P23-T6.
- Existing tab and terminal state can carry metadata or derive it from session records.

## Acceptance Criteria

- Operators can identify which terminal belongs to which Ralph run.
- Opening a terminal for a run does not break the Ralph dashboard context.
- Ad hoc terminal sessions remain possible but visually distinct.
- Terminal crashes produce Ralph-aware recovery guidance.
