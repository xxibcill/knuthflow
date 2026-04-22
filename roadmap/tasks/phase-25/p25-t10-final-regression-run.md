# P25-T10 - Final Regression Run

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Run lint, build, package, and e2e checks, record results, and triage any remaining release blockers.

## Deliverables

- Run lint or typecheck according to the repo's available scripts.
- Run renderer/main build or package command.
- Run e2e tests for app shell, Ralph workflow, delivery, portfolio, blueprint, compatibility, and recovery where available.
- Record command names, pass/fail result, and notable output.
- Classify failures as release blockers, documented limitations, or follow-up issues.
- Fix release blockers or explicitly defer release.
- Update QA/release checklist with final status.

## Dependencies

- Release documentation and tests are complete.
- Local environment has dependencies needed for selected checks.

## Acceptance Criteria

- Final regression results are recorded in release checklist or equivalent notes.
- No known release blocker remains unresolved.
- Any skipped check has a documented reason and risk assessment.
- The final status supports shipping or explicitly blocks the release.
