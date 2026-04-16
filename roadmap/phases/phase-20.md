# Phase 20 - Skill Library and Blueprint System

## Functional Feature Outcome

Operators can author, share, and reuse app blueprints combining starter templates, spec patterns, and acceptance gates, so common app types are built from curated templates rather than generated from scratch each time.

## Why This Phase Exists

Phase 13 bootstraps from a product brief and generates a blueprint, but every bootstrap starts from the same default templates. Experienced operators developing similar app types repeatedly will develop proven patterns that are not yet reusable. This phase adds a first-class blueprint/pattern library so institutional knowledge is captured as operator-authored templates that can be selected at intake.

## Scope

- Add Blueprint database entity with versioning, and UI for browsing, authoring, and importing blueprints
- Extend app intake to offer blueprint selection as an alternative to freeform brief
- Add BlueprintSpec document format capturing: starter template, spec file templates, task pattern defaults, acceptance gate templates, and learned prompt rules
- Implement blueprint versioning so templates improve over time with operator feedback
- Add community blueprint import/export via tarball or gist sharing
- Integrate learning from Phase 17 into blueprint defaults: patterns that reduce repeated errors become blueprint-embedded countermeasures
- Support blueprint inheritance: extend an existing blueprint with app-specific customizations

## Tasks

| Task | Summary |
| --- | --- |
| [P20-T1](../tasks/phase-20/p20-t1-blueprint-db-schema.md) | Add Blueprint and BlueprintVersion database schema and migrations |
| [P20-T2](../tasks/phase-20/p20-t2-blueprint-ui.md) | Build blueprint browser, author, and import UI in desktop renderer |
| [P20-T3](../tasks/phase-20/p20-t3-blueprint-spec-format.md) | Define BlueprintSpec document format with all captured elements |
| [P20-T4](../tasks/phase-20/p20-t4-blueprint-intake-integration.md) | Integrate blueprint selection into app intake flow |
| [P20-T5](../tasks/phase-20/p20-t5-blueprint-import-export.md) | Add blueprint import/export via tarball and gist |
| [P20-T6](../tasks/phase-20/p20-t6-blueprint-inheritance.md) | Implement blueprint inheritance and versioning |

## Dependencies

- Phase 19 (Autonomous Post-Delivery Iteration) should be complete for feedback-driven blueprint improvement

## Exit Criteria

- [Observable outcome 1] Operator can browse, create, edit, and version blueprints
- [Observable outcome 2] App intake offers blueprint selection alongside freeform brief
- [Observable outcome 3] Blueprint import/export works via tarball or gist URL
- [Observable outcome 4] Learned patterns from Phase 17 appear as blueprint-embedded countermeasures
- [Observable outcome 5] Blueprint inheritance allows extending existing blueprints with customizations