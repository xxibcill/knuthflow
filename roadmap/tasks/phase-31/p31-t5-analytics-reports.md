# P31-T5 - Analytics Reports

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Add exportable local analytics reports for operator review and planning.

## Deliverables

- Generate project and portfolio analytics reports in markdown or JSON.
- Include summary metrics, trends, bottlenecks, forecasts, and recommendations.
- Let operators choose date range and scope.
- Exclude secrets and raw source data.
- Add report export action from analytics dashboard.

## Dependencies

- Analytics dashboard and bottleneck detection exist.
- Export utilities or filesystem save dialogs are available.

## Acceptance Criteria

- Operators can export analytics reports locally.
- Reports include enough context for planning without exposing secrets.
- Export failures are handled with actionable errors.
- Report content matches dashboard data for the same filters.
