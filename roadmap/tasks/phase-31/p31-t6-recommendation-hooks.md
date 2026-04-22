# P31-T6 - Recommendation Hooks

## Phase

[Phase 31 - Run Analytics and Forecasting](../../phases/phase-31-run-analytics-forecasting.md)

## Objective

Feed analytics recommendations into blueprint and policy workflows.

## Deliverables

- Generate recommendations for blueprint updates, validation gate adjustments, policy changes, and scaffold improvements.
- Surface recommendations in blueprint detail, policy settings, and project dashboard where relevant.
- Require operator approval before applying recommendations.
- Record recommendation acceptance, dismissal, or deferral.
- Track whether accepted recommendations improve future run outcomes.

## Dependencies

- Bottleneck detection produces actionable findings.
- Blueprint and policy editing surfaces exist.

## Acceptance Criteria

- Recommendations appear in the workflow where they can be acted on.
- Applying a recommendation requires explicit approval.
- Dismissed recommendations do not keep reappearing without new evidence.
- Recommendation outcomes are tracked over time.
