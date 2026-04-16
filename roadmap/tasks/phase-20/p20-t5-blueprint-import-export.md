# P20-T5 - Blueprint Import/Export

## Phase

[Phase 20 - Skill Library and Blueprint System](../../phases/phase-20.md)

## Objective

Add blueprint import/export functionality via tarball and gist for community sharing.

## Deliverables

- Export to tarball: packages blueprint spec + starter template into downloadable .tar.gz
- Export to gist: creates anonymous GitHub gist with blueprint spec JSON
- Import from tarball: uploads and validates .tar.gz, imports into local blueprint library
- Import from gist URL: fetches gist, validates BlueprintSpec, imports
- Import conflict resolution: when blueprint with same name exists, offer rename or overwrite
- Community blueprint index: optional public index of shared blueprints (future)

## Dependencies

- P20-T1 (Blueprint DB Schema) and P20-T3 (BlueprintSpec format) complete

## Acceptance Criteria

- Export produces valid .tar.gz that can be re-imported
- Gist export creates valid, importable gist
- Import from tarball and gist URL both work
- Conflicts handled gracefully with rename/overwrite options