# P1-T3 - Secure Electron Boot Flow

## Phase

[Phase 01 - Foundation and Desktop Shell](../../phases/phase-01-foundation-and-desktop-shell.md)

## Objective

Apply secure Electron defaults so Knuthflow does not depend on unsafe renderer privileges.

## Deliverables

- Context isolation enabled
- Renderer Node access disabled unless explicitly justified
- Safe preload bridge aligned with the IPC contract
- Navigation and window-creation behavior constrained

## Dependencies

- [P1-T1](./p1-t1-scaffold-electron-shell.md)
- [P1-T2](./p1-t2-define-process-boundaries-and-ipc.md)

## Acceptance Criteria

- The renderer cannot access unrestricted Node APIs
- Exposed APIs are limited to documented preload methods
- App startup still works after security hardening
- Security-sensitive defaults are captured in project docs

## Status

Done

## Summary

Implemented secure Electron defaults in `src/index.ts`:

- **Context isolation**: `contextIsolation: true` isolates preload and renderer contexts
- **Node access disabled**: `nodeIntegration: false` blocks renderer from Node APIs
- **Sandbox enabled**: `sandbox: true` runs renderer in OS-level sandbox
- **Web security enforced**: `webSecurity: true` + `allowRunningInsecureContent: false`
- **Navigation constraints**: `setWindowOpenHandler` denies window.open, `will-navigate` blocks arbitrary URL navigation
- **DevTools guard**: Only opens DevTools in development (`NODE_ENV === 'development'`)
- **Documentation**: Security configuration captured in `docs/ipc-contract.md`

