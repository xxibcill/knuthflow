# P33-T4 - Extension Management UI

## Phase

[Phase 33 - Extension SDK and Automation Hooks](../../phases/phase-33-extension-sdk-automation-hooks.md)

## Objective

Build UI for enabling, disabling, configuring, and diagnosing local extensions.

## Deliverables

- Show installed/discovered extensions with status, version, capabilities, and permissions.
- Provide enable, disable, configure, reload, and remove-from-list actions.
- Show health checks, load errors, and recent diagnostics.
- Warn when extension permissions are broad or risky.
- Link extension capabilities to the workflows they affect.
- Keep core Ralph usable when no extensions are installed.

## Dependencies

- Extension loader exposes extension status.
- Manifest config schema supports UI rendering.

## Acceptance Criteria

- Operators can inspect and manage extensions without editing files manually.
- Risky permissions are visible before enabling.
- Extension configuration validation happens before save.
- Disabled extensions stop affecting Ralph workflows.
