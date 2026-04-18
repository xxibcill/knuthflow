# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Knuthflow is a desktop wrapper for Claude Code CLI built with Electron. It provides a native desktop shell with PTY-backed terminal sessions, workspace/session management, persistent SQLite storage, and Ralph autonomous loop support.

## Available Scripts

```bash
npm run start        # start Electron app in development
npm run package      # package app for current platform
npm run make         # build distributable installers
npm run lint         # run ESLint
npm run test:e2e     # package app, then run Playwright e2e tests
npm run test:e2e:headed  # run e2e with visible browser
npm run test:e2e:ci  # run Playwright in CI mode (no packaging)
```

## Architecture

### Process Model

- **Main process** (`src/main/`): PTY management, database, Ralph runtime, supervisor, secure storage. Runs Node.js.
- **Preload** (`src/preload.ts`): Secure IPC bridge exposing `window.knuthflow` API to renderer.
- **Renderer** (`src/`): React 19 UI with Tailwind CSS.

### IPC Organization

All IPC handlers are registered in `src/main/ipc/index.ts`. Each domain has its own handler file:
- `processHandlers.ts` - Child process spawning
- `ptyHandlers.ts` - PTY session management via node-pty
- `claudeHandlers.ts` - Claude Code CLI detection and launch
- `workspaceHandlers.ts` / `sessionHandlers.ts` - Workspace/session CRUD
- `ralphHandlers.ts` - Ralph project/loop management
- `ralphRuntimeHandlers.ts` - Active Ralph loop execution
- `milestoneValidationHandlers.ts` - Build/test/lint validation
- `deliveryHandlers.ts` - Packaging and release handoff

### Key Services

| Service | File | Purpose |
|---------|------|---------|
| PtyManager | `main/ptyManager.ts` | Spawns/manages PTY sessions |
| RalphRuntime | `main/ralphRuntime.ts` | Orchestrates autonomous Ralph loops |
| RalphScheduler | `main/ralphScheduler.ts` | Schedules loop iterations |
| RalphSafety | `main/ralphSafety.ts` | Safety monitoring for Ralph operations (max iterations, auto-stop, resource limits) |
| Supervisor | `main/supervisor.ts` | Detects crashes, cleans orphans |
| Database | `main/database.ts` | SQLite via better-sqlite3 |

### Ralph Bootstrap Files

When a workspace is bootstrapped for Ralph, these files are created:
- `PROMPT.md` - Loop instruction prompt
- `AGENT.md` - Agent configuration (build/run/test instructions)
- `fix_plan.md` - Repair plan template
- `specs/` - Feature specifications directory
- `.ralph/` - Ralph project metadata directory

## Data Storage

- **SQLite DB**: `knuthflow.db` in Electron userData - workspaces, sessions, settings, profiles, Ralph state
- **Logs**: `logs/` directory under userData
- **Secrets**: macOS Keychain when available; encrypted file fallback in `secrets/`

## Tech Stack

Electron Forge, React 19, TypeScript, Webpack, Tailwind CSS, node-pty, xterm.js, Monaco Editor, better-sqlite3, Playwright
