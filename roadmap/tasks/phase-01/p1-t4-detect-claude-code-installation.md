# P1-T4 - Detect Claude Code Installation

## Phase

[Phase 01 - Foundation and Desktop Shell](../../phases/phase-01-foundation-and-desktop-shell.md)

## Objective

Detect whether Claude Code is installed locally, runnable, and compatible enough for Knuthflow to launch.

## Deliverables

- CLI detection routine in the trusted process layer
- Version and executable-path discovery where possible
- User-facing diagnostics for missing or broken CLI state
- Clear failure messages for unsupported launch conditions

## Dependencies

- [P1-T2](./p1-t2-define-process-boundaries-and-ipc.md)
- [P1-T3](./p1-t3-secure-electron-boot-flow.md)

## Acceptance Criteria

- The app can report installed versus missing Claude Code states
- The detected executable path is visible or inspectable
- Failures surface actionable guidance
- Terminal launch work can depend on this result

## Status

Done

## Summary

Implemented Claude Code detection in `src/index.ts`:

- **`detectClaudeCode()` function**: Searches common installation paths and PATH directories for the `claude` executable
- **`claude:detect` IPC handler**: Returns `ClaudeCodeStatus` with installation state, executable path, version, and diagnostic messages
- **Platform-aware**: Checks macOS-specific paths (`/opt/homebrew/bin/claude`) and Linux paths
- **Timeout protection**: 5-second timeout on version detection to prevent hanging
- **Exposed via preload**: `window.knuthflow.claude.detect()` available in renderer

Updated `docs/ipc-contract.md` to document the new `claude:*` channel and `ClaudeCodeStatus` interface.

