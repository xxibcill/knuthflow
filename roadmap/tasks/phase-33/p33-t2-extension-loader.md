# P33-T2 - Extension Loader

## Phase

[Phase 33 - Extension SDK and Automation Hooks](../../phases/phase-33-extension-sdk-automation-hooks.md)

## Objective

Implement local extension discovery, loading, and compatibility checks.

## Deliverables

- Discover extensions from configured local directories.
- Validate manifests before loading extension code.
- Check Ralph version compatibility and extension API version.
- Load enabled extensions only.
- Report disabled, incompatible, invalid, and failed-load states.
- Avoid loading extensions from untrusted paths unless the operator explicitly configures them.

## Dependencies

- P33-T1 manifest schema exists.
- Local settings or extension configuration path is available.

## Acceptance Criteria

- Ralph lists discovered extensions and their load status.
- Incompatible extensions are blocked with clear errors.
- Disabled extensions do not execute.
- Loader failures do not crash the app.
