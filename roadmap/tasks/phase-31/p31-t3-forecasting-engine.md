# P31-T3 - Forecasting Engine

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Estimate effort, risk, and validation needs for new work based on historical Ralph data.

## Deliverables

- Define forecast inputs such as blueprint, app type, platform targets, stack preferences, delivery format, and prior outcomes.
- Estimate likely duration, iteration count, validation gates, and risk level.
- Include confidence or caveat language with forecasts.
- Surface forecasts before starting a run.
- Fall back to heuristic estimates when historical data is sparse.
- Record forecast versus actual outcome for later calibration.

## Dependencies

- Analytics event model and rollups exist.
- App intake and blueprint data are available before run start.

## Acceptance Criteria

- Forecasts appear for supported new work before run start.
- Forecasts do not imply certainty when data is sparse.
- Actual outcomes are compared against forecasts.
- Operators can use forecast output to adjust scope or validation plans.
