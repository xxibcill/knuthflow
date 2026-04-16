# P20-T1 - Blueprint Database Schema

## Phase

[Phase 20 - Skill Library and Blueprint System](../../phases/phase-20.md)

## Objective

Add Blueprint and BlueprintVersion database schema for storing, versioning, and managing reusable app templates.

## Deliverables

- `blueprints` table: id, name, description, category, createdAt, updatedAt, isPublished, parentBlueprintId
- `blueprint_versions` table: id, blueprintId, version, specContent (JSON), starterTemplate, acceptanceGates (JSON), createdAt
- Blueprint CRUD IPC handlers
- Blueprint versioning logic (semantic versioning per blueprint)
- Parent-child relationship for blueprint inheritance

## Dependencies

- Phase 19 complete (for feedback-driven blueprint improvement)

## Acceptance Criteria

- Blueprint and blueprint_versions tables created with proper indexes
- Operator can create, read, update blueprints
- Blueprint versioning works with semantic versioning
- Inheritance relationship stored via parentBlueprintId