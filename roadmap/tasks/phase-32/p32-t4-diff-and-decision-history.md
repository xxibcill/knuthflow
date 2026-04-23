# P32-T4 - Diff And Decision History

## Phase

[Phase 32 - Collaboration and Review Handoff](../../phases/phase-32-collaboration-review-handoff.md)

## Objective

Add diff inventory and approval/override decision history to review bundles.

## Deliverables

- Collect changed-file inventory for the run or delivery.
- Include diff summaries and optionally full diffs where policy allows.
- Include approval gates, policy overrides, delivery confirmations, and rejected actions.
- Link decisions to timestamps, run iterations, and artifacts.
- Redact sensitive diff content according to policy.

## Dependencies

- Git or filesystem diff utilities are available.
- Policy audit records exist for overrides and approvals.

## Acceptance Criteria

- Review bundles explain what changed and what decisions were made.
- Diffs respect export policy and redaction rules.
- Decision history is traceable to run evidence.
- Missing diff context is reported clearly.
