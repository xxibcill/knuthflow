# P23-T7 - Run Dashboard Composition

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Reorganize run card, phase timeline, plan, artifacts, alerts, history, and delivery into a cohesive Ralph project dashboard.

## Deliverables

- Define the project dashboard information hierarchy.
- Show current run status, readiness, active task, milestone, and next action prominently.
- Keep plan, artifacts, timeline, alerts, history, and delivery reachable without feeling like unrelated screens.
- Preserve detailed panels for advanced inspection.
- Avoid nested cards and excessive visual framing.
- Ensure loading, empty, failed, and partial-data states are handled for every dashboard section.
- Make the selected run clear when multiple runs exist.

## Dependencies

- Existing Ralph console panels are available.
- Lifecycle model from P23-T1 exists.

## Acceptance Criteria

- The dashboard communicates current Ralph state and next action within the first viewport.
- Operators can move from run status to evidence to delivery without losing project context.
- Empty and error states are explicit for each dashboard section.
- Multiple run history does not obscure the active run.
