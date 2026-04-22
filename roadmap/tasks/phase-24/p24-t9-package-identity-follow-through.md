# P24-T9 - Package Identity Follow-Through

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Apply the approved package identity decision to executable names, bundle identifiers, installer names, update metadata, and related tests.

## Deliverables

- Update package and Forge identity fields if approved.
- Update macOS bundle id only if migration risk is accepted.
- Update Windows and Linux package names/descriptions if approved.
- Update packaged-app test helpers that derive app path from product metadata.
- Update homepage or repository links only if the project location changes.
- Document any intentionally retained identity values.

## Dependencies

- P22-T2 brand migration decision is complete.
- P24-T5 data path policy accounts for package identity effects.

## Acceptance Criteria

- Package identity matches the documented brand policy.
- Packaged app tests can locate the built application.
- Installer metadata does not conflict with visible product name.
- Retained legacy identifiers are documented.
