# P27-T2 - Dependency Checklist

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Build a dependency readiness checklist that verifies Ralph can run locally before a new operator starts their first project.

## Deliverables

- Check Claude Code installation, executable path, and version.
- Check workspace folder permissions and local storage availability.
- Check git availability for projects that will use checkpointing or delivery review.
- Check package manager availability where scaffolded app templates require it.
- Show dependency status as pass, warning, blocked, or skipped with actionable recovery copy.
- Add retry/recheck behavior after an operator fixes a dependency.
- Preserve the ability to continue only when non-critical checks are warnings rather than blockers.

## Dependencies

- Claude detection, workspace validation, diagnostics, and settings APIs are available.
- Phase 21 terminology defines how dependencies should be described.

## Acceptance Criteria

- Missing Claude Code blocks execution but does not crash onboarding.
- Failed checks explain the next concrete action.
- Rechecking updates the status without restarting the app.
- The checklist distinguishes required dependencies from optional packaging or platform dependencies.
