# P34-T2 - Shared Policy Packs

## Phase

[Phase 34 - Enterprise Workspace Governance](../../phases/phase-34-enterprise-workspace-governance.md)

## Objective

Support shared policy packs and required gates across team-managed Ralph workspaces.

## Deliverables

- Define reusable policy pack structure.
- Support required validation gates, protected paths, connector limits, dependency policies, and delivery approval rules.
- Merge team policy with workspace policy using explicit precedence.
- Show inherited and overridden rules in policy UI.
- Block disallowed local overrides when team policy marks rules as required.

## Dependencies

- Phase 29 policy model and editor exist.
- Team profile model exists.

## Acceptance Criteria

- Team-required policy rules are enforced.
- Operators can distinguish team rules from local workspace rules.
- Disallowed overrides are blocked with clear explanation.
- Policy pack version is visible for audit.
