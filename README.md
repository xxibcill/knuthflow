# Knuthflow

Knuthflow is a terminal-first desktop wrapper for Claude Code CLI built with Electron, React, TypeScript, `node-pty`, and `xterm.js`.

It gives Claude Code a native desktop shell with PTY-backed terminal sessions, workspace and session management, persistent local settings, diagnostics, optional editor and diff views, and the foundations for Ralph autonomous project loops.

## Current Scope

Knuthflow is currently biased toward a reliable desktop runtime first:

- Detect Claude Code CLI and report install/version state
- Launch Claude Code inside real PTY-backed terminal tabs
- Manage workspaces and persist session history in SQLite
- Restore active sessions on startup
- Supervise sessions, detect crashes, and clean orphaned state
- Store settings, launch profiles, diagnostics, and secure secrets locally
- Check GitHub releases for app updates
- Expose Monaco-based editor and diff panes in the desktop UI
- Bootstrap a workspace for Ralph with control files and readiness validation

The longer-term roadmap extends this into a safer operator console for autonomous one-item-at-a-time Ralph runs. See [roadmap/README.md](/Users/jjae/Documents/guthib/knuthflow/roadmap/README.md) and [PRD.md](/Users/jjae/Documents/guthib/knuthflow/PRD.md).

## Tech Stack

- Electron Forge
- React 19
- TypeScript
- Webpack
- Tailwind CSS
- `node-pty`
- `xterm.js`
- Monaco Editor
- `better-sqlite3`
- Playwright

## Prerequisites

- Node.js 18+
- npm 9+
- Claude Code CLI installed and available on `PATH`, or a configured CLI path inside the app

Target platforms documented in the repo:

- macOS 12+ (`x64`, `arm64`)
- Windows 10+ (`x64`)
- Linux `x64` on Ubuntu 20.04+ / Fedora 36+

## Getting Started

```bash
npm install
npm run start
```

On first launch, Knuthflow checks whether Claude Code CLI is available. If it is installed, you can open a workspace and start a PTY-backed session from the desktop UI.

## Available Scripts

```bash
npm run start          # start the Electron app in development
npm run package        # package the app for the current platform
npm run make           # build distributable installers/artifacts
npm run publish        # publish via Electron Forge
npm run lint           # run ESLint
npm run test:e2e       # package the app, then run Playwright e2e tests
npm run test:e2e:headed
npm run test:e2e:ci
```

## Ralph Bootstrap

Knuthflow includes the first layer of Ralph project support.

When a workspace is bootstrapped for Ralph, the app creates and validates:

- `PROMPT.md`
- `AGENT.md`
- `fix_plan.md`
- `specs/`
- `.ralph`

Ralph project metadata and loop run state are stored in the local app database. Readiness validation detects missing files, malformed metadata, and stale run state before a run starts or resumes.

## Architecture

Knuthflow follows a standard secure Electron split:

- `src/main/`: Electron main-process services such as PTY management, supervision, database access, updates, secure storage, logs, and Ralph bootstrap/validation
- `src/preload.ts`: secure IPC bridge exposed as `window.knuthflow`
- `src/components/`: renderer UI components including terminal, workspaces, settings, history, editor, and diff views
- `src/shared/`: shared types used across processes
- `tests/e2e/`: Playwright coverage for packaged app flows

Key runtime decisions already reflected in the codebase:

- PTY-backed terminal execution is the primary workflow
- Main and renderer processes are separated through preload IPC
- Workspace/session state is stored locally in SQLite
- Logs are written under the Electron `userData` directory
- Secrets use macOS Keychain when available, with an encrypted file fallback on other platforms

## Local Data

Knuthflow stores its local application data under Electron's `userData` directory, including:

- `knuthflow.db` for workspaces, sessions, settings, profiles, and Ralph state
- `logs/` for rotating application logs
- `secrets/` for fallback encrypted secret storage when platform keychain support is unavailable

## Repository Layout

```text
src/
  components/        renderer UI
  main/              Electron main-process services
  shared/            shared Ralph/domain types
  App.tsx            top-level renderer app
  preload.ts         secure IPC bridge
tests/
  e2e/               packaged application tests
docs/                design and IPC notes
roadmap/             phased delivery plan
PRD.md               evergreen product requirements
QA.md                QA matrix and release checklist
PACKAGING.md         packaging and distribution guide
```

## Packaging And Distribution

Packaging targets and signing expectations are documented in [PACKAGING.md](/Users/jjae/Documents/guthib/knuthflow/PACKAGING.md).

Current documented artifact targets include:

- Windows Squirrel installer
- macOS ZIP bundles
- Linux DEB and RPM packages

## Testing And QA

- End-to-end tests live under [tests/e2e](/Users/jjae/Documents/guthib/knuthflow/tests/e2e)
- Release and regression checklists live in [QA.md](/Users/jjae/Documents/guthib/knuthflow/QA.md)

## Roadmap

The roadmap is phase-based. The near-term sequence is:

1. Reliable Electron shell and secure IPC
2. Stable PTY-backed Claude Code runtime
3. Workspace/session ergonomics and persistence
4. Settings, logs, and secure local state
5. Packaging, updates, and recovery
6. Optional editor/diff expansion
7. Ralph bootstrap, validation, scheduling, evidence gathering, and operator tooling

See [roadmap/README.md](/Users/jjae/Documents/guthib/knuthflow/roadmap/README.md) for the full phase breakdown.

## License

MIT
