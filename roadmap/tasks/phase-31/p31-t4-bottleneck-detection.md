# P31-T4 - Bottleneck Detection

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Detect repeated bottlenecks and failure patterns across Ralph runs.

## Deliverables

- Detect slow validation gates, repeated build failures, frequent policy overrides, repeated operator interventions, and failed packaging steps.
- Group bottlenecks by project, blueprint, platform, and stack.
- Rank bottlenecks by frequency, severity, and release impact.
- Link bottlenecks to example runs and artifacts.
- Generate actionable suggestions such as update blueprint, add policy rule, improve scaffold, or adjust validation gate.

## Dependencies

- Analytics rollups exist.
- Learning and artifact systems provide failure categories.

## Acceptance Criteria

- Repeated bottlenecks are visible in analytics.
- Each bottleneck links to supporting evidence.
- Suggestions are concrete and scoped.
- Operators can dismiss or mark bottlenecks as addressed.
