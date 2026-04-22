# P25-T3 - Operator Guide Update

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Rewrite operator guide sections around app brief, project lifecycle, run supervision, intervention, artifact review, delivery, and recovery.

## Deliverables

- Update operator guide opening around Ralph-first app building.
- Document how to create a new Ralph project from an app brief.
- Document how to open, repair, or convert an existing project.
- Document how to review blueprints, specs, milestones, and gates before approval.
- Document how to start, pause, resume, stop, and inspect a Ralph run.
- Document how to interpret artifacts, validation evidence, alerts, and plan state.
- Document how to package and confirm delivery.
- Document recovery steps for stale runs, failed bootstrap, failed validation, missing Claude Code, and missing folders.

## Dependencies

- Phase 23 project lifecycle and recovery states are implemented.
- Phase 22 shell labels are final.

## Acceptance Criteria

- The operator guide matches the current Ralph UI labels and workflow.
- A new operator can follow the guide without using generic terminal launch as the default path.
- Recovery guidance is practical and preserves user-authored files by default.
- Guide references to old product names are removed or explicitly historical.
