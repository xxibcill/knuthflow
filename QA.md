# Knuthflow QA Matrix and Release Checklist

## Overview

This document defines the quality assurance process for Knuthflow releases, including smoke tests, platform coverage, regression checks, and release signoff criteria.

## Version Information

| Field | Value |
|-------|-------|
| Current Version | 1.0.0 |
| Last Updated | 2026-04-11 |
| Release Manager | TBD |

---

## Smoke Tests (Core User Flows)

Smoke tests must pass on **ALL platforms** before any release.

### ST-1: Application Launch

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Launch application | Application window appears within 10 seconds | [] |
| 2. Check for fatal errors in console | No `Uncaught Exception` or `Unhandled Promise Rejection` | [] |
| 3. Verify main window is visible and focused | Window visible, responsive to input | [] |
| 4. Check status indicator | Claude Code status indicator shows (installed/not installed) | [] |

### ST-2: Claude Code Detection

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Verify Claude Code detection runs | Status shows "installed" or "not installed" | [] |
| 2. If installed, verify version displayed | Version number visible (e.g., "1.0.4") | [] |
| 3. If not installed, verify error message | Clear message: "Claude Code CLI not found..." | [] |

### ST-3: Workspace Selection

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Navigate to Workspaces view | Workspace selector visible | [] |
| 2. Select a workspace folder | Folder path validated | [] |
| 3. Confirm workspace selection | Workspace name and path displayed in header | [] |
| 4. Switch to Terminal view | Terminal view activated | [] |

### ST-4: Claude Code Session (if installed)

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Click "New Session" | New tab opened, PTY created | [] |
| 2. Verify terminal displays shell prompt | Shell prompt visible within 10 seconds | [] |
| 3. Type `echo "test"` and press Enter | Output "test" appears | [] |
| 4. Click "Stop" button | Session terminates, status changes | [] |
| 5. Close tab | Tab closes without errors | [] |

### ST-5: Session History

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Navigate to History view | Session history list visible | [] |
| 2. Verify completed sessions listed | Sessions show name, date, status | [] |
| 3. Click on a completed session | Session details visible | [] |
| 4. Attempt to restore completed session | Restoration message shown (if not implemented) | [] |

### ST-6: Settings Persistence

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Store a value using storage API | Value saved successfully | [] |
| 2. Close and reopen application | Value persists across restarts | [] |
| 3. Delete a stored value | Value removed from storage | [] |

### ST-7: Error Handling

| Step | Expected Result | Pass/Fail |
|------|-----------------|-----------|
| 1. Kill a running Claude process externally | App detects crash, shows notification | [] |
| 2. Trigger invalid file system operation | Error handled gracefully | [] |
| 3. Network timeout during update check | Timeout handled, no crash | [] |

---

## Platform Coverage Matrix

### PC-1: Operating System Support

| Platform | Version | Architecture | Support Level | Tested |
|----------|---------|--------------|---------------|--------|
| Windows | Windows 10+ | x64 | Primary | [] |
| macOS | Monterey (12)+ | x64, ARM64 (Apple Silicon) | Primary | [] |
| Linux | Ubuntu 20.04+, Fedora 36+ | x64 | Secondary | [] |

### PC-2: Dependencies

| Dependency | Min Version | Windows | macOS | Linux |
|------------|-------------|---------|-------|-------|
| Node.js | 18.0.0 | [ ] | [ ] | [ ] |
| npm | 9.0.0 | [ ] | [ ] | [ ] |
| Electron | 41.2.0 | [ ] | [ ] | [ ] |
| Claude Code CLI | 1.0.0 | [ ] | [ ] | [ ] |

### PC-3: Shell Compatibility

| Shell | Windows | macOS | Linux |
|-------|---------|-------|-------|
| PowerShell | Native | N/A | N/A |
| Command Prompt (cmd) | Native | N/A | N/A |
| bash | Via Git Bash | Default | Default |
| zsh | Via WSL | Default (macOS 12+) | Available |
| fish | Via WSL | Available | Available |

---

## Regression Checklist

Regression tests should be run when **ANY** of the following change:
- New feature added
- Bug fix in existing functionality
- Dependency update
- Platform-specific code change

### RC-1: PTY and Terminal

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| PTY-1 | Create new PTY session | Session ID returned, PTY spawned | |
| PTY-2 | Write to PTY | Data visible in terminal | |
| PTY-3 | Resize PTY | Terminal resizes correctly | |
| PTY-4 | Kill PTY gracefully | Session cleaned up properly | |
| PTY-5 | PTY exit event fires | Exit code captured | |
| PTY-6 | Multiple concurrent PTYs | Each operates independently | |
| PTY-7 | PTY with long output | No memory leaks, scrolling works | |
| PTY-8 | Unicode in terminal | UTF-8 characters display correctly | |
| PTY-9 | ANSI color codes | Colors render correctly | |

### RC-2: Sessions and History

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| SESS-1 | Create session | Session saved to database | |
| SESS-2 | Session with workspace | Workspace association correct | |
| SESS-3 | Update session end | Status, exit code, signal recorded | |
| SESS-4 | List active sessions | Only active sessions returned | |
| SESS-5 | List recent sessions | Sessions ordered by start_time DESC | |
| SESS-6 | Session restoration on startup | Active sessions restored as tabs | |
| SESS-7 | Session cleanup after 30s | Completed sessions auto-cleaned | |
| SESS-8 | Session limit (100 max) | Oldest completed sessions removed | |

### RC-3: Settings and Storage

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| STOR-1 | storage:get returns stored value | Value matches what was set | |
| STOR-2 | storage:set persists | Value survives app restart | |
| STOR-3 | storage:delete removes value | Key removed, get returns undefined | |
| STOR-4 | Corrupted storage.json | Returns empty object, no crash | |
| STOR-5 | Concurrent storage operations | No race conditions | |

### RC-4: Crash Recovery and Supervision

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| REC-1 | Unexpected PTY exit | Session marked as failed | |
| REC-2 | Orphan session cleanup | Active sessions with dead PTYs cleaned | |
| REC-3 | Crash notification | User sees crash toast | |
| REC-4 | Exit explanation | User-friendly error message shown | |
| REC-5 | Integrity check on startup | Stale sessions cleaned | |
| REC-6 | App restart with active sessions | Sessions properly restored | |

### RC-5: Packaging and Distribution

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| PKG-1 | Windows .exe installer | Installs correctly | |
| PKG-2 | Windows auto-update | Update mechanism works | |
| PKG-3 | macOS app bundle | Runs without Gatekeeper block | |
| PKG-4 | macOS ZIP extraction | App launches from extracted location | |
| PKG-5 | Linux DEB package | Installs via dpkg/apt | |
| PKG-6 | Linux RPM package | Installs via rpm/dnf | |
| PKG-7 | ASAR packaging | App functions with ASAR | |
| PKG-8 | Code signing verification | Signatures valid | |

### RC-6: Update Flow

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| UPD-1 | Version display | Current version shown in UI | |
| UPD-2 | Update check | Correctly queries GitHub API | |
| UPD-3 | Update available notification | User notified of new version | |
| UPD-4 | Download page opens | Browser opens release page | |
| UPD-5 | No update available | Clean "up to date" state | |
| UPD-6 | Network failure | Graceful failure, no crash | |

### RC-7: Workspaces

| ID | Test Case | Expected Result | Related Issues |
|----|-----------|-----------------|----------------|
| WS-1 | Create workspace | Workspace saved to database | |
| WS-2 | List workspaces | All workspaces returned | |
| WS-3 | Recent workspaces | Ordered by last_opened_at | |
| WS-4 | Delete workspace | Removed from database | |
| WS-5 | Path validation | Invalid paths rejected | |
| WS-6 | Update last opened | Timestamp updated correctly | |

---

## Release Signoff Checklist

All items must be checked before releasing.

### Pre-Release

- [ ] **Version bump**: `package.json` version updated (semver)
- [ ] **Changelog**: Release notes drafted with changes
- [ ] **Milestone**: GitHub milestone closed
- [ ] **Branch protection**: Release branch protected

### Build Verification

- [ ] **Clean build**: `npm run make` completes without errors
- [ ] **All platforms**: Builds succeed for Windows, macOS, Linux
- [ ] **Artifacts exist**: All expected output files present
- [ ] **Artifact naming**: Files follow naming convention

### Smoke Tests

- [ ] **ST-1 through ST-7**: All smoke tests pass

### Regression

- [ ] **RC-1 (PTY)**: All PTY tests pass
- [ ] **RC-2 (Sessions)**: All session tests pass
- [ ] **RC-3 (Storage)**: All storage tests pass
- [ ] **RC-4 (Recovery)**: All recovery tests pass
- [ ] **RC-5 (Packaging)**: All packaging tests pass
- [ ] **RC-6 (Updates)**: All update tests pass
- [ ] **RC-7 (Workspaces)**: All workspace tests pass

### Platform-Specific

#### Windows

- [ ] **Code signing**: Authenticode signature valid
- [ ] **SmartScreen**: No SmartScreen warnings (after reputation build-up)
- [ ] **Installer UX**: Squirrel installer completes successfully
- [ ] **Uninstall**: App removed cleanly via Add/Remove Programs

#### macOS

- [ ] **Code signing**: Code signature valid (`codesign -dvvv`)
- [ ] **Notarization**: Ticket stapled, notarization successful
- [ ] **App Sandbox**: Sandbox entitlements correct
- [ ] **DMG**: App runs when extracted from ZIP

#### Linux

- [ ] **DEB**: Installs on Ubuntu 20.04+
- [ ] **RPM**: Installs on Fedora 36+
- [ ] **Desktop entry**: App appears in application menu
- [ ] **Icon**: App icon displays correctly

### Post-Release

- [ ] **Tag created**: Git tag pushed (e.g., `v1.0.0`)
- [ ] **Release published**: GitHub release created with artifacts
- [ ] **Announcement**: Users notified of release
- [ ] **Monitoring**: Error tracking monitored for 48 hours post-release

---

## Test Execution Log

| Test Suite | Date | Tester | Platform | Result | Notes |
|------------|------|--------|----------|--------|-------|
| ST-1 | | | | [] Pass / [] Fail | |
| ST-2 | | | | [] Pass / [] Fail | |
| ST-3 | | | | [] Pass / [] Fail | |
| ST-4 | | | | [] Pass / [] Fail | |
| ST-5 | | | | [] Pass / [] Fail | |
| ST-6 | | | | [] Pass / [] Fail | |
| ST-7 | | | | [] Pass / [] Fail | |

---

## Known Issues

| Issue ID | Description | Workaround | Status |
|----------|-------------|------------|--------|
| - | - | - | - |

---

## Appendix: Test Environment Setup

### Windows Test Environment

```
OS: Windows 10 Pro 22H2
PowerShell: 5.1.19041.1
Node.js: 20.x
Git: 2.40+
```

### macOS Test Environment

```
OS: macOS Monterey 12.6
Terminal: Terminal.app / iTerm2
Node.js: 20.x (arm64)
Git: 2.37+
```

### Linux Test Environment

```
OS: Ubuntu 22.04 LTS
Node.js: 20.x
Git: 2.34+
Desktop: GNOME 42
```
