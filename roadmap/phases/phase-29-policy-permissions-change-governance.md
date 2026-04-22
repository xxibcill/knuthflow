# Phase 29 - Policy, Permissions, and Change Governance

## Functional Feature Outcome

Operators can define what Ralph may change, what requires approval, what is forbidden, and how workspace changes are reviewed before execution or delivery.

## Why This Phase Exists

As Ralph becomes more capable, trust depends on explicit boundaries. Existing safety gates and confirmations help at run time, but operators also need durable policies: allowed paths, protected files, command restrictions, dependency update rules, package publishing rules, destructive operation approval, and delivery approval requirements. This phase turns safety from scattered runtime checks into a configurable governance system.

## Scope

- Define a Ralph policy file or database-backed policy model for each workspace.
- Add policy controls for allowed paths, protected files, forbidden commands, risky command approval, dependency update limits, external network access, and delivery/publishing gates.
- Add UI for viewing and editing workspace policy with safe defaults.
- Integrate policy checks into bootstrap, runtime execution, validation, packaging, delivery, and maintenance loops.
- Record policy violations as safety artifacts with actionable explanations.
- Add policy-aware prompt building so Ralph receives constraints before execution.
- Add approval flows for temporary policy overrides.
- Add audit history for policy changes and override decisions.
- Add tests for blocked file paths, forbidden commands, protected control files, and override approval.

## Tasks

| Task | Summary |
| --- | --- |
| [P29-T1](../tasks/phase-29/p29-t1-policy-model.md) | Define workspace policy schema and persistence |
| [P29-T2](../tasks/phase-29/p29-t2-policy-editor-ui.md) | Build policy viewing and editing UI with safe defaults |
| [P29-T3](../tasks/phase-29/p29-t3-runtime-policy-enforcement.md) | Enforce policy during Ralph execution, validation, packaging, and delivery |
| [P29-T4](../tasks/phase-29/p29-t4-policy-aware-prompts.md) | Inject policy constraints into Ralph prompt generation |
| [P29-T5](../tasks/phase-29/p29-t5-policy-overrides.md) | Add approval workflow for temporary policy overrides |
| [P29-T6](../tasks/phase-29/p29-t6-policy-audit-tests.md) | Add audit records and tests for policy violations and overrides |

## Dependencies

- Ralph runtime, safety monitor, execution adapter, and prompt builder must expose policy enforcement points.
- Phase 23 project lifecycle and Phase 25 release workflow must be stable.
- Phase 21 non-functional safety requirements should define governance expectations.

## Exit Criteria

- Each Ralph project has visible policy settings with safe defaults.
- Ralph blocks protected file changes and forbidden commands before execution or delivery.
- Policy violations are shown as safety artifacts with clear recovery options.
- Temporary overrides require explicit operator approval and are audited.
- Tests cover policy enforcement in at least execution, file-change, and delivery paths.
