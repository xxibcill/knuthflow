# P21-T6 - Success Metrics

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Define metrics that show whether Ralph is successfully helping operators create, supervise, deliver, and maintain apps.

## Deliverables

- Define activation metrics such as time from app brief to Ralph-ready workspace.
- Define execution metrics such as run completion rate, validation pass rate, average iterations per milestone, and interruption/recovery rate.
- Define delivery metrics such as package success rate, handoff bundle completeness, and release confirmation rate.
- Define safety metrics such as operator intervention frequency, blocked unsafe operation count, and stale-run recovery success.
- Define portfolio and blueprint metrics for later phases, such as blueprint reuse rate and portfolio throughput.
- Clarify which metrics can be measured locally today and which require later instrumentation.
- Avoid vanity metrics that do not influence product or release decisions.

## Dependencies

- Requirements from P21-T4 and P21-T5.
- Existing database or runtime data fields are understood enough to know what can be measured.

## Acceptance Criteria

- PRD success metrics are concrete and Ralph-specific.
- Each metric includes the user or operational outcome it represents.
- The metrics do not require cloud telemetry unless explicitly marked as future or optional.
- Release-readiness work can use the metrics to judge product quality.
