# Phase 01 - Foundation and Desktop Shell

## Functional Feature Outcome

Knuthflow launches as a secure desktop shell with a working Electron main/renderer boundary and can detect whether Claude Code is installed locally.

## Why This Phase Exists

Nothing else in the product matters if the app boundary is unsafe or the wrapper cannot reliably determine whether it can launch the CLI.

## Scope

- Scaffold the desktop app stack
- Establish secure Electron defaults
- Define IPC ownership boundaries
- Detect Claude Code installation and expose diagnostics

## Tasks

| Task | Summary |
| --- | --- |
| [P1-T1](../tasks/phase-01/p1-t1-scaffold-electron-shell.md) | Create the base Electron, React, TypeScript, Tailwind, and Forge application shell |
| [P1-T2](../tasks/phase-01/p1-t2-define-process-boundaries-and-ipc.md) | Define the main, preload, and renderer contract before feature work spreads |
| [P1-T3](../tasks/phase-01/p1-t3-secure-electron-boot-flow.md) | Lock down Electron defaults and safe API exposure |
| [P1-T4](../tasks/phase-01/p1-t4-detect-claude-code-installation.md) | Detect Claude Code, validate executable access, and surface environment diagnostics |

## Dependencies

- Product decision remains terminal-first for v1
- Claude Code is available as a local executable on supported machines

## Exit Criteria

- The app boots on supported development platforms
- Main, preload, and renderer responsibilities are explicitly separated
- Unsafe renderer Node access is not required
- The app can report whether Claude Code is installed and runnable

