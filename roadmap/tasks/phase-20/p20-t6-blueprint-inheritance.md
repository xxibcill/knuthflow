# P20-T6 - Blueprint Inheritance and Versioning

## Phase

[Phase 20 - Skill Library and Blueprint System](../../phases/phase-20.md)

## Objective

Implement blueprint inheritance and versioning so operators can extend existing blueprints with customizations and improve templates over time.

## Deliverables

- Create from existing: new blueprint can extend an existing blueprint, inheriting all fields
- Override mechanism: child blueprint overrides specific fields (starter template, specs, tasks) while keeping rest
- Version history: all versions of a blueprint preserved, operator can roll back
- Version comparison: diff view between any two versions of a blueprint
- Template improvement: operator feedback on blueprint effectiveness feeds into next version
- Blueprint analytics: track which blueprints produce successful apps, flag underperforming templates

## Dependencies

- P20-T1 (Blueprint DB Schema) and P20-T2 (Blueprint UI) complete

## Acceptance Criteria

- New blueprints can extend existing ones with inheritance chain visible
- Override fields correctly shadow parent values
- Version history shows all changes with diffs
- Successful blueprint usage increases its suggested rank
- Failed blueprint flagged for review