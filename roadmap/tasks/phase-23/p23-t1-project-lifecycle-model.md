# P23-T1 - Project Lifecycle Model

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Define and implement a Ralph project lifecycle model that drives primary actions, dashboard state, and recovery messaging.

## Deliverables

- Define lifecycle states for no project, folder selected, not Ralph-enabled, needs bootstrap, needs repair, ready, active run, paused run, failed run, completed run, delivery-ready, delivered, and maintenance-tracked.
- Identify the data source for each state, including workspace record, `.ralph` metadata, readiness report, active runs, runtime state, delivery manifest, and maintenance records.
- Map each lifecycle state to one primary action and any secondary actions.
- Add a small typed model or selector in the renderer to avoid duplicating lifecycle logic across components.
- Document ambiguous states such as stale active run, missing folder, malformed metadata, and missing Claude Code dependency.
- Ensure lifecycle state can be tested with fixture workspaces.

## Dependencies

- Phase 21 terminology is available.
- Existing readiness, project, run, runtime, delivery, and maintenance IPC APIs are available.

## Acceptance Criteria

- The Ralph console can derive a single lifecycle state for the selected context.
- Each lifecycle state has an explicit primary action or explicit blocked reason.
- Stale or malformed project states do not fall back to generic terminal behavior.
- Tests or fixtures cover at least no project, not enabled, ready, active run, failed run, and delivery-ready states.
