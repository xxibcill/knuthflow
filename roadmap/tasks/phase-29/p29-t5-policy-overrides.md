# P29-T5 - Policy Overrides

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Add approval workflow for temporary policy overrides when an operator explicitly permits a blocked action.

## Deliverables

- Define override request model with rule, action, reason, scope, expiry, and approver.
- Add UI for approving or rejecting override requests.
- Support narrow override scopes such as one command, one file, one run, or one delivery.
- Expire overrides automatically based on scope.
- Record override decisions in audit history.
- Ensure rejected overrides leave the original policy block intact.

## Dependencies

- P29-T3 policy enforcement can produce structured blocked-action details.
- Operator confirmation UI exists.

## Acceptance Criteria

- Overrides are explicit, scoped, and audited.
- Broad or permanent overrides require stronger confirmation than one-action overrides.
- Expired overrides no longer permit blocked actions.
- Rejected override requests do not alter policy.
