# Phase 31 - Run Analytics and Forecasting

## Functional Feature Outcome

Ralph shows operators historical run analytics, delivery trends, bottlenecks, and forecasts for effort, risk, and likely validation needs before starting new work.

## Why This Phase Exists

Once Ralph has delivered multiple projects, operators need more than individual run history. They need to know which project types succeed quickly, which blueprints produce repeated failures, which validation gates are slow, where interventions happen, and how long a new request is likely to take. This phase turns accumulated run data into decision support for planning, prioritization, blueprint improvement, and operator trust.

## Scope

- Define analytics events and rollups for intake, blueprint, bootstrap, validation, runtime, artifacts, delivery, maintenance, and operator interventions.
- Add project-level and portfolio-level analytics views.
- Add delivery trend charts for build time, iteration count, validation pass rate, artifact severity, intervention rate, and delivery success.
- Add forecast estimates for new app briefs based on blueprint, platform targets, app type, and historical outcomes.
- Add bottleneck detection for slow validation gates, repeated error classes, frequent operator approvals, and failed packaging steps.
- Add privacy controls so analytics remain local unless an explicit future sync/export feature is enabled.
- Add exportable analytics reports for operator review.
- Use analytics to recommend blueprint updates, policy changes, or validation improvements.

## Tasks

| Task | Summary |
| --- | --- |
| [P31-T1](../tasks/phase-31/p31-t1-analytics-event-model.md) | Define analytics events, rollups, and local persistence |
| [P31-T2](../tasks/phase-31/p31-t2-run-analytics-dashboard.md) | Build project and portfolio analytics dashboards |
| [P31-T3](../tasks/phase-31/p31-t3-forecasting-engine.md) | Estimate effort, risk, and validation needs for new work |
| [P31-T4](../tasks/phase-31/p31-t4-bottleneck-detection.md) | Detect repeated bottlenecks and failure patterns |
| [P31-T5](../tasks/phase-31/p31-t5-analytics-reports.md) | Add exportable local analytics reports |
| [P31-T6](../tasks/phase-31/p31-t6-recommendation-hooks.md) | Feed analytics recommendations into blueprint and policy workflows |

## Dependencies

- Phase 17 learning metrics and Phase 25 release workflow should provide reliable data sources.
- Portfolio and blueprint systems should be available for cross-project analysis.
- Local data privacy policy must be clear.

## Exit Criteria

- Operators can view project and portfolio run analytics inside Ralph.
- Forecasts are shown before starting supported new work and include confidence or caveat language.
- Repeated bottlenecks are detected and linked to actionable recommendations.
- Analytics remain local by default and can be exported intentionally.
