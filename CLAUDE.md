# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ralph is a desktop operator console built with Electron Forge that controls the local Claude Code CLI to build apps autonomously one milestone at a time with explicit operator approval gates and reviewable evidence. The primary workflow is: **Brief → Blueprint → Bootstrap → Run → Evidence → Delivery → Maintenance**.

## Commands

```bash
npm run start         # Start Electron app in development
npm run lint          # Run ESLint
npm run package       # Package app for current platform
npm run make          # Build distributable installers
npm run test:e2e      # Package app then run Playwright e2e tests
npm run test:e2e:headed   # Run e2e tests with visible browser
npm run test:e2e:ci    # Run Playwright tests in CI mode (no packaging)
```

## Architecture

### Electron Process Split
- **Main process** (`src/main/`): PTY management, Ralph runtime, scheduler, safety, database, supervisor, secure storage, logs
- **Preload** (`src/preload.ts`): Secure IPC bridge exposed as `window.knuthflow`
- **Renderer** (`src/components/`): React UI — RalphConsole, terminal, workspace selector, settings, history, editor, diff views
- **Shared** (`src/shared/`): Ralph and domain types used across processes

### Key Services (main process)
- `ptyManager.ts` — PTY-backed terminal for Claude Code execution via `node-pty`
- `ralphRuntime.ts` — Core loop execution state machine (idle → planning → executing → validating → paused/completed/failed)
- `ralphScheduler.ts` — Item scheduling with priority queue and dependency resolution
- `ralphExecution.ts` — Claude Code execution adapter
- `ralphSafety.ts` — Circuit breaker, rate limiting, stop reason tracking
- `database.ts` — SQLite via `better-sqlite3` for Ralph state, workspaces, sessions
- `ralphBootstrap.ts` — Workspace initialization and readiness validation

### Ralph Loop State Machine
States: `idle | starting | planning | executing | validating | paused | failed | cancelled | completed`

### Ralph Control Files (workspace bootstrap)
- `PROMPT.md` — Loop instruction prompt
- `AGENT.md` — Agent configuration (build/run/test instructions)
- `fix_plan.md` — Repair plan template
- `specs/` — Feature specifications directory
- `.ralph/` — Ralph project metadata directory

### Local Storage
- App data lives under Electron's `userData` directory
- `knuthflow.db` — workspaces, sessions, settings, profiles, Ralph state, delivery manifests
- `logs/` — rotating application logs
- `secrets/` — fallback encrypted secret storage when platform keychain unavailable
- Override with `RALPH_USER_DATA_DIR` or `KNUTHFLOW_USER_DATA_DIR` env vars

## Tech Stack

- Electron Forge + Webpack
- React 19 + TypeScript
- Tailwind CSS
- `node-pty` — PTY-backed terminal
- `xterm.js` — terminal rendering
- Monaco Editor — artifact inspection
- `better-sqlite3` — local persistence
- Playwright — e2e testing

## PRD

`PRD.md` is the evergreen product requirements document — the source of truth for product intent, requirements, and decisions. `roadmap/` contains the phased delivery plan (Phases 01–20 are foundation, Phase 21+ covers Ralph product work). `QA.md` has the release checklist.