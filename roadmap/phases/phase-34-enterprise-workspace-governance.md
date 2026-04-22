# Phase 34 - Enterprise Workspace Governance

## Functional Feature Outcome

Teams can standardize Ralph usage across multiple workspaces with shared policies, approved blueprints, audit records, and environment checks while preserving local execution.

## Why This Phase Exists

Individual operators can configure policies and connectors locally, but teams need consistency: approved blueprints, required validation gates, protected paths, dependency rules, audit exports, and onboarding standards. This phase adds governance for team-managed environments without forcing Ralph into a cloud-first product. The goal is repeatable local operation under shared rules.

## Scope

- Add organization or team profile concept stored locally or imported from a signed policy bundle.
- Support shared policy packs for required gates, allowed connectors, protected files, dependency rules, and delivery approvals.
- Support approved blueprint catalogs and required blueprint versions.
- Add environment compliance checks for local tool versions, package managers, git state, signing prerequisites, and platform SDKs.
- Add audit export for policy decisions, approvals, overrides, delivery confirmations, and extension usage.
- Add admin/operator role distinction where applicable to local policy editing.
- Support importing and updating governance bundles from file or connector.
- Preserve solo-operator mode with no required team governance.

## Tasks

| Task | Summary |
| --- | --- |
| [P34-T1](../tasks/phase-34/p34-t1-team-profile-model.md) | Add team profile and governance bundle model |
| [P34-T2](../tasks/phase-34/p34-t2-shared-policy-packs.md) | Support shared policy packs and required gates |
| [P34-T3](../tasks/phase-34/p34-t3-approved-blueprint-catalog.md) | Add approved blueprint catalog and version requirements |
| [P34-T4](../tasks/phase-34/p34-t4-environment-compliance.md) | Add local environment compliance checks |
| [P34-T5](../tasks/phase-34/p34-t5-governance-audit-export.md) | Export governance audit records |
| [P34-T6](../tasks/phase-34/p34-t6-governance-import-update.md) | Import and update governance bundles safely |

## Dependencies

- Phase 29 policy engine and Phase 20 blueprint system must be stable.
- Phase 33 extension permissions should exist if extensions are governed.
- Secure local storage and audit record infrastructure must be available.

## Exit Criteria

- Ralph can import a team governance bundle and apply it to selected workspaces.
- Required policies and blueprint versions are visible and enforced.
- Environment compliance checks report actionable setup gaps.
- Governance audit records can be exported.
- Operators can still use Ralph in solo mode without team governance.
