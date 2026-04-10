# P4-T4 - Implement Logs and Diagnostics

## Phase

[Phase 04 - Settings and Local State](../../phases/phase-04-settings-and-local-state.md)

## Objective

Make the app supportable by exposing logs, runtime diagnostics, and exportable troubleshooting context.

## Deliverables

- Structured app and session log strategy
- Diagnostics surface for CLI detection, version info, and failure states
- Log viewer or export mechanism
- Privacy-aware rules for what can be exported

## Dependencies

- [P1-T4](../phase-01/p1-t4-detect-claude-code-installation.md)
- [P4-T1](./p4-t1-persist-settings-and-profiles.md)

## Acceptance Criteria

- Useful diagnostics are available without attaching a debugger
- Users can export supportable logs or reports
- Log storage has basic retention or cleanup behavior
- Sensitive data handling is explicitly considered

