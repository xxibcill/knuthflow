# Changelog

All notable changes to Knuthflow are documented here.

## [Unreleased]

## [1.0.0] - 2026-04-11

### Added

#### Phase 01: Foundation and Desktop Shell
- Electron main, preload, and renderer entry points with React, TypeScript, and Tailwind
- Secure IPC boundary between main and renderer processes
- Claude Code installation detection and environment diagnostics
- Electron Forge configured for development and packaging

#### Phase 02: Terminal Runtime
- xterm.js terminal component integrated in the renderer
- node-pty PTY manager for spawning terminal sessions in the main process
- Terminal input, output, resize, and lifecycle events wired over IPC
- Claude Code process start, stop, and monitoring with status feedback

#### Phase 03: Workspaces and Sessions
- Workspace management (add, remove, select, reopen)
- SQLite-backed session metadata with schema for workspaces, sessions, and related metadata
- Multiple session tabs with clear active-state switching
- Recent session restore and history browsing

#### Phase 04: Settings and Local State
- Local settings model with persistence rules
- GUI settings surface for CLI path, defaults, and safety-related settings
- OS-backed secure storage (Keychain on macOS) for sensitive profile values
- Diagnostics surfaces, log browsing, and export paths

#### Phase 05: Reliability and Distribution
- Process supervision and crash recovery
- Electron Forge packaging with platform-specific installer and signing flow
- Application update handling with version visibility
- QA smoke tests, regression checks, and release readiness checklist

#### Phase 06: IDE Expansion (Optional)
- Decision finalized: IDE features deferred to future release line
- Monaco integration deferred
- Diff and patch review workflows deferred

#### Phase 07: Ralph Project Bootstrap
- Ralph project domain model with control files (PROMPT.md, AGENT.md, fix_plan.md, specs/)
- Bootstrap flow for creating and repairing Ralph control files without destructive overwrites
- SQLite-backed loop state persistence and plan snapshots
- Workspace readiness and integrity validation
- Ralph project APIs exposed through secure IPC

#### Phase 08: Ralph Scheduler and Safety
- Ralph loop runtime with lifecycle management and persisted state transitions
- One-item-at-a-time scheduler with backlog item selection and acceptance gates
- Claude execution adapter with pinned context, output capture, and session reuse
- Rate limiting, circuit breaker behavior, and timeout handling

#### Phase 09: Evidence and Plan Repair
- Bounded research jobs for codebase context gathering
- Artifact capture pipeline for compiler, test, and diff artifacts with validation backpressure
- Output analysis with structured continue, replan, fail, or exit decisions
- Fix plan regeneration and loop learning capture

#### Phase 10: Operator Console
- Ralph run dashboard with status cards for active and historical runs
- Live phase timeline and artifact viewer (prompts, outputs, logs, tests, diffs)
- Fix plan, selected item, and loop history panels
- Operator controls with explicit guardrails: pause, resume, stop, replan with safety alerts

#### Phase 11: Recovery and Release Readiness
- Safe git checkpoint flow tied to validated Ralph iterations
- Interrupted run recovery and stale state cleanup on startup or resume
- Dry-run harness and loop test matrix for core Ralph state transitions
- Operator documentation and release checklist for autonomous mode

#### Phase 12: Refactor Main Process Entry
- `src/index.ts` refactored from 1325 lines to ~237 lines (~82% reduction)
- IPC handlers split into 17 logical modules in `src/main/ipc/`:
  - `processHandlers.ts` — process:spawn, process:send, process:kill, process:list
  - `ptyHandlers.ts` — pty:create, pty:write, pty:resize, pty:kill, pty:list
  - `claudeHandlers.ts` — claude:detect, claude:launch, claude:kill, etc.
  - `workspaceHandlers.ts` — workspace:*
  - `sessionHandlers.ts` — session:*
  - `settingsHandlers.ts` — settings:*
  - `profileHandlers.ts` — profile:*
  - `storageHandlers.ts` — storage:*
  - `filesystemHandlers.ts` — filesystem:* and dialog:*
  - `appHandlers.ts` — app:getVersion
  - `supervisorHandlers.ts` — supervisor:*
  - `secureStorageHandlers.ts` — secureStorage:*
  - `logsHandlers.ts` — logs:* and diagnostics:*
  - `ralphHandlers.ts` — ralph:*
  - `ralphRuntimeHandlers.ts` — ralphRuntime:*
  - `ralphSchedulerHandlers.ts` — ralphScheduler:*
  - `ralphSafetyHandlers.ts` — ralphSafety:*
- TypeScript compilation and lint checks pass

### Fixed
- IPC handler code review issues
- Runtime errors in operator console
- Race conditions and task hierarchy issues
- Memory leaks and path handling bugs
- Codebase search and context gathering job implementation
- Workspace selector path handling and secure storage command execution