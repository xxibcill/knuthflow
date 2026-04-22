# P23-T4 - Intake Blueprint Review

## Phase

[Phase 23 - Ralph-First Project Flow](../../phases/phase-23-ralph-first-project-flow.md)

## Objective

Strengthen blueprint review so the operator can inspect and approve generated specs, milestones, gates, platform targets, and constraints before files are written.

## Deliverables

- Show generated app specs with title, description, priority, acceptance criteria, and relationships.
- Show milestones with order, tasks, and acceptance gates.
- Show target platforms, delivery format, stack preferences, forbidden patterns, and supported browsers.
- Show generated `fix_plan.md` preview or summarized task plan.
- Let the operator return to intake to adjust inputs before approving.
- Validate blueprint shape before file writing.
- Make approval explicit and record enough metadata for later audit/debugging.

## Dependencies

- App intake generation API produces `AppBlueprint`.
- Blueprint review component exists and can be extended.

## Acceptance Criteria

- Files are not written until the operator approves the blueprint.
- Blueprint review shows enough detail to catch wrong scope or platform before bootstrap.
- Invalid blueprint data is blocked with a clear error.
- Approved blueprint data flows into bootstrap/scaffold without losing operator choices.
