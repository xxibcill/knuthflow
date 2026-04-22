# P23-T6 - Run Start Flow

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Make "Start Ralph Run" create and track a controlled Claude Code session behind the scenes while keeping the operator in the Ralph dashboard.

## Deliverables

- Validate readiness before run start.
- Launch a Claude Code session with Ralph-appropriate arguments and workspace context.
- Create a session record and Ralph run record.
- Start or register the Ralph runtime for the run.
- Keep the user on the Ralph dashboard instead of switching to terminal by default.
- Show launch progress, success, and failure states.
- Clean up or mark failed records if session launch or runtime start fails midway.

## Dependencies

- Existing `launchClaudeSession` or equivalent flow can be called from Ralph console.
- Ralph runtime start API exists.
- Readiness validation API exists.

## Acceptance Criteria

- Starting a Ralph run does not require manual terminal launch.
- Run, session, and PTY identifiers are linked and visible to the dashboard.
- Launch failure does not leave orphaned active run state.
- The underlying terminal remains reachable as a secondary view.
