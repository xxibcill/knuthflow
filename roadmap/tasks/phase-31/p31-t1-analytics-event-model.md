# P31-T1 - Analytics Event Model

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Define analytics events, rollups, and local persistence for Ralph run and delivery analysis.

## Deliverables

- Define events for intake, blueprint generation, bootstrap, readiness, run start/end, validation, artifacts, delivery, maintenance, policy decisions, and operator interventions.
- Define rollups by project, blueprint, portfolio, platform target, and time window.
- Store analytics locally with schema versioning.
- Add privacy and retention policy for analytics data.
- Backfill or derive initial metrics from existing run tables where possible.

## Dependencies

- Existing run, delivery, portfolio, and blueprint data is available.
- Phase 21 privacy expectations are documented.

## Acceptance Criteria

- Analytics events have typed schemas and stable names.
- Rollups can be computed without cloud services.
- Existing data can contribute to analytics where feasible.
- Retention and privacy rules are explicit.
