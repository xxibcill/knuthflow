# P20-T3 - BlueprintSpec Document Format

## Phase

[Phase 20 - Skill Library and Blueprint System](../../phases/phase-20.md)

## Objective

Define the BlueprintSpec document format that captures all elements of a reusable app template.

## Deliverables

- BlueprintSpec JSON schema: starterTemplate, specFileTemplates[], taskPatternDefaults[], acceptanceGateTemplates[], learnedRules[]
- Starter template: base project structure (package.json, tsconfig, etc.)
- Spec file templates: pre-filled specs/ directory content for common app types
- Task pattern defaults: default fix_plan.md task structures for common workflows
- Acceptance gate templates: reusable gate definitions (e.g., "standard-web-app-gate")
- Learned rules: countermeasures from Phase 17 embedded as template rules
- BlueprintSpec validator: ensures imported blueprints have valid spec format

## Dependencies

- Phase 17 complete (learned rules integration)

## Acceptance Criteria

- BlueprintSpec schema documented and validated
- All existing phases' bootstrap templates convertible to BlueprintSpec
- BlueprintSpec can be imported/exported as valid JSON