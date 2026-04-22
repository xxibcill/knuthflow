# P25-T2 - Release Checklist Update

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Update the release checklist for Ralph branding, package identity, dependency messaging, data compatibility, and primary workflow validation.

## Deliverables

- Add release checklist items for Ralph title, about screen, navigation, and package metadata.
- Add checks for Claude Code dependency messaging under Ralph branding.
- Add checks for existing data opening after the release.
- Add checks for `window.ralph` and compatibility alias behavior.
- Add checks for primary Ralph happy path and existing-project path.
- Add packaging checks for app launch, installer metadata, and platform-specific constraints.
- Add release sign-off criteria for known limitations.

## Dependencies

- QA matrix update is in progress.
- Phase 22 and 24 identity decisions are final.

## Acceptance Criteria

- Release checklist can be followed by someone who did not implement the changes.
- Checklist distinguishes blockers from non-blocking known limitations.
- Package identity and data compatibility checks are explicit.
- Ralph primary workflow validation is required before release.
