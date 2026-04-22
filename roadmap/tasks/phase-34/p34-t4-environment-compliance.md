# P34-T4 - Environment Compliance

## Phase

[Phase 34 - Enterprise Workspace Governance](../../phases/phase-34-enterprise-workspace-governance.md)

## Objective

Add local environment compliance checks for team-governed Ralph workspaces.

## Deliverables

- Check required tool versions for Claude Code, Node, package managers, git, platform SDKs, and signing tools.
- Check required environment settings and workspace path constraints.
- Show compliance status at onboarding, project dashboard, and pre-run validation.
- Distinguish blockers from warnings.
- Provide exportable compliance report.

## Dependencies

- Diagnostics and dependency checklist infrastructure exist.
- Team profile environment requirements are defined.

## Acceptance Criteria

- Team-required environment checks run before governed work starts.
- Non-compliance blocks only where policy says it must.
- Operators receive actionable setup guidance.
- Compliance status is auditable.
