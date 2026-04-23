# P34-T5 - Governance Audit Export

## Phase

[Phase 34 - Enterprise Workspace Governance](../../phases/phase-34-enterprise-workspace-governance.md)

## Objective

Export governance audit records for policy decisions, approvals, overrides, delivery confirmations, connector use, and extension use.

## Deliverables

- Define governance audit export format.
- Include policy pack version, blueprint version, approvals, overrides, blocked actions, connector actions, extension actions, and delivery decisions.
- Let operators export audit records by project, portfolio, team profile, and date range.
- Redact secrets and sensitive local paths.
- Add checksum or manifest metadata where useful for review.

## Dependencies

- Policy audit records and connector/extension artifacts exist.
- Review bundle export can be reused where appropriate.

## Acceptance Criteria

- Governance audit export includes required decision history.
- Export respects redaction and policy restrictions.
- Export can be generated without cloud connectivity.
- QA can verify a governed run produces audit output.
