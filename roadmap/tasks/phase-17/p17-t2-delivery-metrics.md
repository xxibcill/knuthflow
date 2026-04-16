# P17-T2 - Delivery Metrics Collection

## Phase

[Phase 17 - Delivery Intelligence and Loop Learning](../../phases/phase-17.md)

## Objective

Add delivery metrics collection and persistence so run outcomes can be analyzed and correlated with intake parameters.

## Deliverables

- New `delivery_metrics` table: runId, buildTimeMs, iterationCount, validationPassRate, operatorInterventionCount, outcome (success/failure/cancelled), createdAt
- Metrics collection at run completion in RalphRuntime.completeIteration and endRun
- Metrics query API for dashboard display
- Success/failure classification based on run status and validation results

## Dependencies

- Phase 16 complete (multi-run for metrics aggregation)

## Acceptance Criteria

- All completed runs have delivery_metrics records
- Dashboard shows historical metrics charts (build time, iteration count over time)
- Success/failure correlates with intake parameters (app type, platform targets, stack)