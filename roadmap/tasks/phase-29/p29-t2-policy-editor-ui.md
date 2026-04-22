# P29-T2 - Policy Editor UI

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Build policy viewing and editing UI with safe defaults and clear explanation of Ralph's allowed actions.

## Deliverables

- Show effective policy for the selected Ralph project.
- Provide controls for protected paths, command rules, dependency update policy, connector access, and delivery gates.
- Distinguish inherited/default rules from project-specific overrides.
- Validate policy edits before saving.
- Warn when edits increase risk.
- Add restore defaults and discard changes actions.

## Dependencies

- P29-T1 policy model exists.
- Settings or project dashboard has an appropriate surface for policy editing.

## Acceptance Criteria

- Operators can inspect and update project policy from the UI.
- Unsafe policy changes require explicit confirmation.
- Invalid policy cannot be saved.
- Policy changes are visible immediately in the project context.
