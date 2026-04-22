# P24-T8 - Deprecation Policy

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Document the compatibility window and removal criteria for legacy Knuthflow API and identity surfaces.

## Deliverables

- Define which names are deprecated: preload global, TypeScript API type, environment variable, database filename, package identity, or docs terminology.
- Define which names are retained indefinitely for data compatibility.
- Define warning strategy, if any, for use of deprecated APIs.
- Define removal criteria and earliest removal phase/release.
- Document how tests should cover compatibility during the window.
- Add migration notes for plugin or external automation authors if applicable.

## Dependencies

- Brand migration and data path policy are complete.
- IPC docs are being updated.

## Acceptance Criteria

- Compatibility behavior is not implicit.
- Deprecated surfaces have clear replacement names.
- Long-lived compatibility surfaces are distinguished from temporary ones.
- Future contributors can tell when it is safe to remove old names.
