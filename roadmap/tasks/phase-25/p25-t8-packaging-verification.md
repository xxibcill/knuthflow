# P25-T8 - Packaging Verification

## Phase

[Phase 25 - Ralph Release Readiness](../../phases/phase-25-ralph-release-readiness.md)

## Objective

Package the app for supported local targets and verify product name, installer names, metadata, and app launch behavior.

## Deliverables

- Run the package or make command appropriate for the local platform.
- Verify app name, title, icon/metadata if present, and about screen after packaging.
- Verify packaged app launches into Ralph-first shell.
- Verify installer or artifact names match the brand policy.
- Verify platform-specific metadata such as bundle id, executable name, Linux package fields, or Windows setup name where available.
- Record packaging warnings or failures.
- Update packaging docs if the brand or identity policy changed commands or artifact names.

## Dependencies

- Package identity follow-through is complete.
- Local environment has required packaging dependencies.

## Acceptance Criteria

- Packaged app launches successfully on the local platform.
- Visible packaged metadata matches the approved Ralph brand policy.
- Artifact names are either Ralph-focused or intentionally legacy per policy.
- Packaging result is recorded for release sign-off.
