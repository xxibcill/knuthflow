# P15-T3 - End-To-End One-Shot Harness

## Phase

[Phase 15 - Desktop One-Shot Delivery](../../phases/phase-15-desktop-one-shot-delivery.md)

## Objective

Prove the full desktop workflow works by testing app generation from brief intake through reviewable output under both happy-path and blocked-path conditions.

## Deliverables

- End-to-end scenarios for brief intake, blueprint approval, autonomous build execution, validation, packaging, and handoff.
- Fixtures or supported sample templates that keep the tests deterministic and cheap enough to run in CI or gated local verification.
- Failure-path coverage for approval denial, validation failure, interrupted runs, and packaging blockage.

## Dependencies

- The full one-shot delivery workflow from `P15-T1` and `P15-T2`.
- Stable sample app templates and local test harness support.

## Acceptance Criteria

- At least one supported app target can be exercised from initial brief to reviewable output through an automated test scenario.
- The test suite covers a blocked or failed path in addition to the happy path.
- A regression in intake, controller flow, approval gates, or packaging surfaces as a failing end-to-end test rather than silent manual drift.
