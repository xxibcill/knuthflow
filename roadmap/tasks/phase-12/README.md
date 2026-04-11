# Phase 12 Tasks

## Task Index

Placeholder for phase 12 tasks.

### Main Refactoring Tasks

- [ ] **Analyze index.ts structure** — Identify logical IPC handler groups and shared state dependencies
- [ ] **Design extraction approach** — Choose between module-based extraction vs service-based architecture
- [ ] **Extract IPC handler groups** — Split handlers into logical modules (process, pty, claude, workspace, session, settings, ralph)
- [ ] **Refactor to service architecture** (optional) — If chosen, create service classes that own state
- [ ] **Wire up extracted modules** — Update index.ts to import and use extracted modules
- [ ] **Verify functionality** — Ensure all IPC handlers work, app launches, lifecycle events fire correctly

### Verification Tasks

- [ ] **Type check passes** — `npx tsc --noEmit` succeeds
- [ ] **Lint passes** — `npm run lint` succeeds with no new warnings
- [ ] **App launch test** — App starts without errors
- [ ] **IPC functional test** — Verify IPC handlers respond correctly (e.g., via Playwright e2e tests)
