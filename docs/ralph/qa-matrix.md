# Ralph QA Matrix

This document describes the QA coverage for Ralph-focused workflows, compatibility checks, safety gates, delivery, portfolio, and blueprint surfaces.

## Ralph Product Overview

Ralph is the primary product name. The app launches into a Ralph-first shell rather than a generic terminal. The Ralph Console is the primary operator interface for project management, run supervision, and artifact review.

## Test Classification

| Symbol | Meaning |
|--------|---------|
| `A` | Automated E2E test |
| `M` | Manual test procedure |
| `CI` | Platform/environment requirement |
| `DEF` | Deferred (known limitation, not blocking) |

---

## Ralph-First Workflow Coverage

### First Launch

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| RL-1 | A | App launches and displays Ralph Console (not generic terminal) | Required |
| RL-2 | A | Title bar shows "Ralph" | Required |
| RL-3 | M | About screen shows Ralph branding | Required |
| RL-4 | A | Navigation shows Ralph as primary | Required |

### New Project Flow (Ralph-First)

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| NP-1 | A | New App button opens intake form | Required |
| NP-2 | A | Intake form accepts app brief, platform, delivery format | Required |
| NP-3 | A | Blueprint generation produces app specification | Required |
| NP-4 | A | Blueprint review shows before proceeding | Required |
| NP-5 | A | Bootstrap Ralph creates control files (PROMPT.md, AGENT.md, fix_plan.md) | Required |
| NP-6 | A | Bootstrap creates .ralph/ directory with metadata | Required |
| NP-7 | A | Readiness validation passes for bootstrapped workspace | Required |
| NP-8 | M | Scaffolded workspace contains expected structure | Required |

### Run Lifecycle

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| RC-1 | A | Start Loop button activates when workspace is ready | Required |
| RC-2 | A | Run dashboard shows iteration count and phase | Required |
| RC-3 | A | Timeline tab shows iteration events | Required |
| RC-4 | A | Artifacts tab lists captured artifacts | Required |
| RC-5 | A | Fix Plan tab shows task list with checkboxes | Required |
| RC-6 | A | Operator Controls tab shows Pause/Resume/Stop | Required |
| RC-7 | A | Stop requires confirmation dialog | Required |
| RC-8 | A | Pause transitions run to paused state | Required |
| RC-9 | A | Resume continues paused run | Required |
| RC-10 | A | Run completes and transitions to completed state | Required |

### Delivery Path

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| DP-1 | A | Delivery panel reachable from completed run | Required |
| DP-2 | A | Delivery manifest shows artifacts and gates | Required |
| DP-3 | M | Package command builds for target platform | CI |
| DP-4 | A | Release confirmation transitions run to delivered | Required |

### Blueprint Surface

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| BP-1 | A | Blueprint can be created from intake | Required |
| BP-2 | A | Blueprint CRUD operations work | Required |
| BP-3 | A | Blueprint versioning works | Required |
| BP-4 | M | Blueprint can be imported/exported | Required |

### Portfolio Surface

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| PF-1 | A | Portfolio CRUD operations work | Required |
| PF-2 | A | Projects can be added/removed from portfolio | Required |
| PF-3 | A | Portfolio project priority can be updated | Required |
| PF-4 | A | Dependency graph can be stored and retrieved | Required |

---

## Safety and Recovery Coverage

### Approval Gates

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| SG-1 | A | Destructive actions show confirmation dialog | Required |
| SG-2 | A | Stop confirmation prevents accidental run termination | Required |
| SG-3 | M | Approval gate blocks action until confirmed | Required |

### Stop/Pause/Resume

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| SP-1 | A | Pause control works during executing state | Required |
| SP-2 | A | Resume control works during paused state | Required |
| SP-3 | A | Stop control ends active or paused run | Required |
| SP-4 | A | Confirmation prevents accidental stop | Required |

### Circuit Breaker and Safety

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| SB-1 | A | Circuit breaker opens after repeated failures | Required |
| SB-2 | A | No-progress detection triggers after threshold | Required |
| SB-3 | A | Safety alerts display when circuit is open | Required |
| SB-4 | A | Permission denial opens circuit immediately | Required |

### Stale Run Detection

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| ST-1 | A | Stale run detected on startup | Required |
| ST-2 | A | Recovery dialog offers resume/cleanup options | Required |
| ST-3 | A | Resume continues from checkpoint | Required |
| ST-4 | A | Cleanup marks run as failed | Required |

### Failed Validation

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| FV-1 | A | Failed validation shows error state | Required |
| FV-2 | A | Failed validation does not appear as completed | Required |
| FV-3 | A | Failed validation produces actionable feedback | Required |

### Missing Dependencies

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| MD-1 | A | Missing Claude Code shows actionable error (not crash) | Required |
| MD-2 | A | Missing dependency is distinct from project readiness failure | Required |
| MD-3 | A | Install/Configure guidance is shown | Required |

### Failed Bootstrap/File Write

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| FB-1 | A | Failed bootstrap shows repair guidance | Required |
| FB-2 | A | Repair action preserves user-authored files | Required |
| FB-3 | A | File write error shows actionable message | Required |

---

## Compatibility Coverage

### API Compatibility

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| AC-1 | A | `window.ralph` is the preferred API and works | Required |
| AC-2 | A | `window.knuthflow` retained as deprecated alias | Required |
| AC-3 | A | Both APIs return identical data for same calls | Required |
| AC-4 | A | All ralph.* API calls return expected results | Required |

### Data Compatibility

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| DC-1 | A | Existing workspaces load after upgrade | Required |
| DC-2 | A | Existing sessions and settings persist | Required |
| DC-3 | A | `RALPH_USER_DATA_DIR` override works | Required |
| DC-4 | A | `KNUTHFLOW_USER_DATA_DIR` legacy override works | DEF |
| DC-5 | A | Database filename `knuthflow.db` remains accessible | Required |

### Existing Project Path

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| EP-1 | A | Opening workspace with .ralph/ loads Ralph context | Required |
| EP-2 | A | Partially bootstrapped workspace shows readiness issues | Required |
| EP-3 | A | Repair Files regenerates missing control files | Required |
| EP-4 | A | User-authored files preserved during repair | Required |

---

## Platform-Specific Checks

### macOS

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| MC-1 | M | Packaged app launches (no dev server) | CI |
| MC-2 | M | App name matches brand | CI |
| MC-3 | M | Bundle ID follows policy | CI |

### Windows

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| WN-1 | M | Installer name matches brand | CI |
| WN-2 | M | Executable name follows policy | CI |

### Linux

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| LX-1 | M | Package metadata follows policy | CI |

---

## Regression Coverage

### Core App Shell

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| RE-1 | A | App shell renders without errors | Required |
| RE-2 | A | Ralph and Terminal navigation buttons work | Required |

### IPC Surface

| Check | Type | Description | Status |
|-------|------|-------------|--------|
| IP-1 | A | All preload APIs respond correctly | Required |
| IP-2 | A | No unhandled promise rejections | Required |

---

## Known Limitations

| Limitation | Reason | Workaround |
|------------|--------|------------|
| UI tests require display server | Platform constraint | Run with headed browser or skip in CI |
| Replan not implemented | Backend gap | Manual plan editing |
| Artifact listing not wired | Frontend gap | View artifacts via filesystem |
| Session persistence not implemented | Design gap | Runs do not survive app restart |

---

## Test Environment Requirements

### Automated Tests (A)

- Node.js and npm installed
- `npm run test:e2e` or `npm run test:e2e:ci` available
- Playwright configured

### Manual Tests (M)

- Full desktop environment (display server)
- Platform packaging tools installed
- For macOS: no Gatekeeper blocking or `PLAYWRIGHT_DEV_SERVER_URL` set

---

## Test Result Recording

Record results in the release checklist with:

```
Test: [Check ID]
Command/Script: [how to run]
Result: [PASS/FAIL]
Notes: [relevant output or error]
```