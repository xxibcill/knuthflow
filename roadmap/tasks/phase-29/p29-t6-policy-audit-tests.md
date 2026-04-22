# P29-T6 - Policy Audit Tests

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Add audit records and tests for policy violations, policy edits, and override decisions.

## Deliverables

- Persist audit records for policy edits, blocked actions, approvals, rejections, and expired overrides.
- Show audit history in project policy or safety views.
- Add tests for protected file block, forbidden command block, approved override, and rejected override.
- Verify audit records contain enough context without exposing secrets.
- Add export path for audit records if release/QA docs require it.

## Dependencies

- P29-T2 through P29-T5 are implemented.
- Existing log or artifact systems can store audit data.

## Acceptance Criteria

- Policy-related decisions are auditable.
- Tests cover both blocked and approved override paths.
- Audit records avoid secret leakage.
- Operators can inspect policy history from the UI.
