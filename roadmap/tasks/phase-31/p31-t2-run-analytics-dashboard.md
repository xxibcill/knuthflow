# P31-T2 - Run Analytics Dashboard

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Build project and portfolio analytics dashboards for historical Ralph performance and delivery trends.

## Deliverables

- Show build time, iteration count, validation pass rate, intervention rate, artifact severity, and delivery success.
- Provide filters by project, portfolio, blueprint, platform, date range, and outcome.
- Show trend views and summary cards.
- Link analytics points back to underlying runs or artifacts.
- Handle sparse data, no data, and partial data states.

## Dependencies

- P31-T1 analytics event model exists.
- Portfolio and project dashboards can host analytics views.

## Acceptance Criteria

- Operators can inspect run trends without exporting data.
- Analytics views link back to source runs.
- Empty states explain what data is needed.
- Dashboard performance is acceptable for expected local data volumes.
