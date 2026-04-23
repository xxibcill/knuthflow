# P33-T3 - Extension Sandboxing

## Phase

[Phase 33 - Extension SDK and Automation Hooks](../../phases/phase-33-extension-sdk-automation-hooks.md)

## Objective

Add execution boundaries, error handling, and diagnostics for extensions.

## Deliverables

- Define the execution model for extensions, including process boundary or restricted API boundary.
- Enforce declared permissions before extension actions.
- Add timeout and cancellation behavior for extension hooks.
- Capture extension logs separately from core logs.
- Convert extension failures into diagnostics and artifacts where relevant.
- Ensure extension exceptions do not crash Ralph runtime or corrupt project state.

## Dependencies

- Extension loader and policy permissions exist.
- Diagnostics and logging infrastructure is available.

## Acceptance Criteria

- Failing extensions are isolated from core Ralph functionality.
- Extension actions cannot exceed declared permissions.
- Extension errors are visible to operators and developers.
- Timeouts prevent extensions from blocking runs indefinitely.
