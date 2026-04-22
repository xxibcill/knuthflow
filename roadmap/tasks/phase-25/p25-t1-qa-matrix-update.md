# P25-T1 - QA Matrix Update

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Update QA documentation around Ralph-first workflows, compatibility checks, safety gates, delivery, portfolio, and blueprint coverage.

## Deliverables

- Rewrite QA matrix sections so Ralph app-building workflows are primary.
- Add checks for first launch, app brief, blueprint review, workspace bootstrap, readiness validation, run start, artifact review, and delivery reachability.
- Add compatibility checks for existing data and deprecated API aliases.
- Add safety checks for approval gates, stop, pause, resume, stale runs, failed validation, and missing dependencies.
- Add portfolio and blueprint regression coverage.
- Identify checks that are automated, manual, platform-specific, or deferred.
- Link QA checks back to relevant PRD requirements where possible.

## Dependencies

- Phase 21 requirements are written.
- Phase 22-24 implementation decisions are known.

## Acceptance Criteria

- QA docs describe Ralph as the primary product workflow.
- Each major Ralph workflow has at least one QA check.
- Compatibility and safety are included as release-blocking areas.
- Manual-only checks are clearly marked with environment requirements.
