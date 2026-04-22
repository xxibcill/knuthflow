# P24-T7 - IPC Contract Docs

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Update IPC contract documentation to describe the Ralph API names, compatibility aliases, and secure bridge boundaries.

## Deliverables

- Rename or reframe the documented preload API around Ralph.
- Document `window.ralph` as the preferred renderer API.
- Document `window.knuthflow` as a deprecated compatibility alias if retained.
- Keep security boundary documentation for main process, preload, and renderer.
- Update examples from `window.knuthflow.*` to `window.ralph.*` where appropriate.
- Document that IPC channel names may remain unchanged internally during compatibility.

## Dependencies

- Runtime and type aliases are implemented.
- Compatibility policy is finalized.

## Acceptance Criteria

- IPC docs tell new contributors to use `window.ralph`.
- Deprecated alias behavior is documented accurately.
- Security guidance remains intact.
- Examples are consistent with implemented API names.
