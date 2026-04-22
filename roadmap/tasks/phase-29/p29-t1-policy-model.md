# P29-T1 - Policy Model

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Define workspace policy schema and persistence for Ralph governance.

## Deliverables

- Define policy fields for allowed paths, protected files, command allow/deny rules, dependency update limits, connector permissions, delivery gates, and override behavior.
- Support per-workspace policy with safe defaults.
- Decide whether policy is stored in `.ralph`, database, or both.
- Add policy versioning and migration behavior.
- Add typed validation for malformed or unsupported policy values.

## Dependencies

- Ralph project metadata and readiness validation exist.
- Phase 21 safety requirements are available.

## Acceptance Criteria

- Each Ralph project can resolve an effective policy.
- Missing policy uses safe defaults.
- Invalid policy is surfaced as a readiness or safety issue.
- Policy schema is documented and versioned.
