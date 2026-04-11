# P11-T3 - Build Dry-Run Harness and Loop Test Matrix

## Phase

[Phase 11 - Recovery and Release Readiness](../../phases/phase-11-recovery-and-release-readiness.md)

## Objective

Build a repeatable dry-run and fixture-based test harness so Ralph state transitions can be exercised without paying Claude API cost on every validation cycle.

## Deliverables

- A dry-run or simulation mode for the Ralph scheduler and analyzer
- Fixtures for success, no-progress, permission-denied, stale-plan, and timeout scenarios
- Automated tests around loop state transitions, recovery, and plan regeneration
- A QA matrix for end-to-end autonomous workflows

## Dependencies

- [P8-T4](../phase-08/p8-t4-enforce-rate-limiting-circuit-breaker-and-timeouts.md)
- [P9-T3](../phase-09/p9-t3-implement-output-analysis-and-continue-or-exit-decisions.md)

## Acceptance Criteria

- Core Ralph loop branches are testable without live Claude calls
- Common failure paths can be reproduced from fixtures
- State transition regressions are caught by automated checks
- The QA matrix covers both happy-path and recovery behavior
