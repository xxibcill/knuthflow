# P24-T1 - Preload Ralph Alias

## Phase

[Phase 24 - Ralph API Compatibility and Data](../../phases/phase-24-ralph-api-compatibility-and-data.md)

## Objective

Expose the secure preload API as `window.ralph` while preserving `window.knuthflow` as a deprecated compatibility alias.

## Deliverables

- Add `contextBridge.exposeInMainWorld('ralph', api)` in the preload layer.
- Preserve `contextBridge.exposeInMainWorld('knuthflow', api)` unless the compatibility policy changes.
- Ensure both globals point to the same secure API implementation.
- Avoid exposing any additional raw Electron or Node capabilities.
- Add a targeted test that verifies both globals exist during the compatibility window.
- Document the alias behavior in IPC contract docs.

## Dependencies

- Phase 22 brand migration decision keeps compatibility aliases.
- Preload bridge remains context-isolated and typed.

## Acceptance Criteria

- `window.ralph` works in the renderer for existing API calls.
- `window.knuthflow` still works during the documented compatibility window.
- No duplicate IPC handlers are introduced.
- Tests verify the new alias and legacy alias.
