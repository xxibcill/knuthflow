# Ralph

Ralph is a desktop operator console for app intake, autonomous build loops, validation evidence, delivery artifacts, and maintenance. It controls the local Claude Code CLI to build apps one milestone at a time with explicit operator approval gates and reviewable evidence.

## Primary Workflow

**Brief → Blueprint → Bootstrap → Run → Evidence → Delivery → Maintenance**

1. **Brief** — Describe the app you want to build
2. **Blueprint** — Review the generated plan with milestones and expected artifacts
3. **Bootstrap** — Initialize the workspace with Ralph control files and readiness validation
4. **Run** — Supervise Ralph as it executes one milestone at a time
5. **Evidence** — Inspect validation results, artifact manifests, and milestone summaries
6. **Delivery** — Approve the handoff bundle with release notes and packaged artifacts
7. **Maintenance** — Track delivered apps and surface follow-up work (future phases)

Ralph runs one item at a time, surfaces its current plan and milestone state in real time, and stops cleanly when you pause, stop, or when a run goes stale. Recovery guidance is provided so no workspace is permanently abandoned.

## Tech Stack

- Electron Forge
- React 19
- TypeScript
- Webpack
- Tailwind CSS
- `node-pty` — PTY-backed terminal for Claude Code execution
- `xterm.js` — terminal rendering
- Monaco Editor — artifact inspection (operator support tool, not primary editing surface)
- `better-sqlite3` — local persistence for Ralph state, workspaces, sessions, and delivery records
- Playwright — end-to-end testing

## Prerequisites

- Node.js 18+
- npm 9+
- Claude Code CLI installed and available on `PATH`, or a configured CLI path inside the app

Target platforms:

- macOS 12+ (`x64`, `arm64`)
- Windows 10+ (`x64`)
- Linux `x64` on Ubuntu 20.04+ / Fedora 36+

## Getting Started

```bash
npm install
npm run start
```

On first launch, Ralph checks whether Claude Code CLI is available. If it is installed, you can open a workspace, bootstrap it as a Ralph project, and start a supervised run from the desktop UI.

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

When a workspace is bootstrapped for Ralph, the app creates and validates:

- `PROMPT.md` — Loop instruction prompt
- `AGENT.md` — Agent configuration (build/run/test instructions)
- `fix_plan.md` — Repair plan template
- `specs/` — Feature specifications directory
- `.ralph/` — Ralph project metadata directory

Ralph project metadata and loop run state are stored in the local app database. Readiness validation detects missing files, malformed metadata, and stale run state before a run starts or resumes.

## Architecture

Ralph follows a standard secure Electron split:

- `src/main/`: Electron main-process services — PTY management, Ralph runtime, Ralph scheduler, Ralph safety, supervisor, database, updates, secure storage, logs
- `src/preload.ts`: secure IPC bridge exposed as `window.knuthflow`
- `src/components/`: renderer UI — operator console, terminal, workspaces, settings, history, editor, diff views
- `src/shared/`: shared Ralph and domain types
- `tests/e2e/`: Playwright coverage for packaged app flows

Key architectural decisions:

- PTY-backed terminal execution is the primary runtime Ralph controls for Claude Code sessions
- Main and renderer processes are separated through preload IPC with context isolation
- Ralph loop state, workspace metadata, and session data are stored locally in SQLite
- Logs are written under the Electron `userData` directory
- Secrets use macOS Keychain when available, with an encrypted file fallback on other platforms
- Ralph control files and artifacts live in the workspace under `.ralph/`

## Local Data

Ralph stores its local application data under Electron's `userData` directory, including:

- `knuthflow.db` for workspaces, sessions, settings, profiles, Ralph state, and delivery manifests
- `logs/` for rotating application logs
- `secrets/` for fallback encrypted secret storage when platform keychain support is unavailable

**Environment Variables:**
- `RALPH_USER_DATA_DIR` - Override userData path (for testing)
- `KNUTHFLOW_USER_DATA_DIR` - Legacy alias (still supported for backward compatibility)

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

Ralph's roadmap is phase-based. The primary sequence from Phase 21 onward is:

1. **Phase 21** — Ralph product source of truth (PRD, glossary, requirements)
2. **Phase 22** — Ralph brand and shell (visible product name, navigation, first screen)
3. **Phase 23** — Ralph-first project flow (brief → blueprint → bootstrap → run → delivery without generic terminal fallback)
4. **Phase 24** — Ralph API compatibility and data (Ralph-named APIs alongside existing Knuthflow identifiers)
5. **Phase 25** — Ralph release readiness (docs, packaging, QA, release notes, regression checks)

Foundation phases (01–20) cover the Electron shell, PTY runtime, workspace/session management, settings, packaging, and Ralph bootstrap. See [roadmap/README.md](/Users/jjae/Documents/guthib/knuthflow/roadmap/README.md) for the full phase breakdown.

## License

MIT
