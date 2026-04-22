# P29-T4 - Policy-Aware Prompts

## Phase

[Phase 29 - Policy, Permissions, and Change Governance](../../phases/phase-29-policy-permissions-change-governance.md)

## Objective

Inject policy constraints into Ralph prompt generation so the agent plans within allowed boundaries.

## Deliverables

- Add effective policy summary to Ralph prompt builder context.
- Include protected files, forbidden commands, approval requirements, and delivery gates in generated prompts.
- Keep prompt policy text concise and unambiguous.
- Update prompt injection safeguards to prevent workspace content from weakening policy instructions.
- Add tests or snapshots for policy-aware prompt assembly.

## Dependencies

- P29-T1 policy model exists.
- Ralph prompt builder is stable.

## Acceptance Criteria

- Ralph prompts include relevant policy constraints before execution.
- Prompt policy text matches the effective project policy.
- Policy prompt instructions cannot be replaced by operator-authored project content.
- Prompt snapshots or tests cover at least one constrained project.
