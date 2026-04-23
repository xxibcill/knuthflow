# Changelog

All notable changes to Ralph (formerly Knuthflow) are documented here.

## [Unreleased]

#### Phase 26: Post-Release Stability and Iteration Foundation
- Health event tracking system (create, list) with timestamp and metadata
- Operator feedback panel with full CRUD for run comments and ratings
- Delivered apps panel with health tracking and follow-up management
- Iteration backlog panel for tracking follow-up work with status management
- Run pattern recording and summary retrieval for improvement insights
- Autonomous maintenance scheduler with health-check-triggered maintenance runs
- Portfolio visibility seeding on delivery confirmation
- Post-release validation E2E tests

#### Phase 27: Operator Onboarding and Guided First Run
- Onboarding state persistence with first launch detection
- Dependency checklist checking Claude Code, Git, npm, and workspace permissions
- Sample brief picker with templates for Web App, Desktop Utility, and API Service
- Recovery copy and retry/recheck behavior for failed dependencies
- "Replay Onboarding" button in Settings > About
- E2E tests for first launch, dependency checks, and onboarding replay

#### Phase 28: Preview Evidence and Visual Validation
- Preview script detection from package.json and framework metadata
- Preview lifecycle management with port allocation, timeout, and cleanup
- Screenshot capture via Playwright for visual evidence
- Visual smoke checks: blank screen detection, console error checks, content verification
- Enhanced artifact viewer with visual evidence display
- Delivery panel with visual approval gates and override workflow

#### Phase 29: Policy, Permissions, and Change Governance
- Policy rules, overrides, and audit log database tables
- Policy settings UI with Rules/Overrides/Audit Log tabs and full CRUD
- Policy enforcement engine with enforcement points for commands, file writes, dependency updates, connector calls, packaging, and delivery
- Policy injection into loop prompt building
- Override workflow with approve/reject, auto-expiry, and audit records
- Policy violation tests

#### Phase 30: Tool Connector Hub
- Connector manifest registry with capability interface
- Connector settings UI with setup, health checks, and scope configuration
- Secure storage for connector secrets
- Built-in stubs for repository, issues, design, registry, and monitoring connectors
- Connector permission checks via policy enforcement
- Artifact capture for connector inputs, outputs, and failures

#### Phase 31: Run Analytics and Forecasting
- Analytics event schemas, rollups, bottlenecks, forecasts, and recommendations (schema v19)
- Analytics dashboard with project/portfolio views, trends, KPIs, filters, and tabbed interface
- Forecasting engine for effort, risk, and validation estimates
- Bottleneck detection with actionable suggestions
- Exportable JSON and Markdown analytics reports
- Recommendation hooks into blueprint and policy workflows

## [2.0.0] - 2026-04-22 - Ralph Refocus Release

### Changed

#### Phase 21: Ralph Product Source of Truth
- Product repositioned from "Knuthflow" to "Ralph" as the primary product name
- PRD rewritten to reflect Ralph as an autonomous desktop app builder
- Terminology updated: "Ralph loop" replaces "autonomous mode", "operator" replaces "developer"
- User jobs and success metrics redefined around Ralph's core value proposition

#### Phase 22: Ralph Brand and Shell
- App title changed from "Knuthflow" to "Ralph"
- Navigation updated: Ralph Console is the primary entry point (not Terminal)
- Default route changed to Ralph-first shell on launch
- Empty states and onboarding flows rewritten for Ralph workflow
- Package metadata (productName, name, etc.) updated to Ralph branding
- UI smoke tests updated to verify Ralph-first launch

#### Phase 23: Ralph-First Project Flow
- Project lifecycle model redesigned around Ralph enablement states:
  - `no_workspace` → `workspace_selected_not_enabled` → `needs_fresh_bootstrap` → `ready_no_active_run` → `active_run` → `delivery_ready` → `delivered`
- New Project entry via "New App" button opens intake form first
- Existing Project entry via Open Folder detects .ralph/ directory
- Intake → Blueprint → Bootstrap/Scaffold → Run → Delivery workflow
- Recovery states for: stale runs, missing control files, failed bootstrap, missing dependencies

#### Phase 24: Ralph API Compatibility and Data
- `window.ralph` is now the preferred API (replaces `window.knuthflow`)
- `window.knuthflow` retained as deprecated alias for backward compatibility
- `RALPH_USER_DATA_DIR` is the preferred env var override
- `KNUTHFLOW_USER_DATA_DIR` retained as legacy alias
- Database filename `knuthflow.db` unchanged for data compatibility
- Preload API exposed both `window.ralph` and `window.knuthflow` pointing to same implementation
- IPC contract documentation updated with Ralph branding

### Added

#### Phase 25: Ralph Release Readiness
- QA matrix documenting Ralph-first workflow coverage, safety checks, compatibility verification
- Release checklist with Ralph branding, package identity, dependency messaging, data compatibility items
- Operator guide rewritten for Ralph-first workflows (no generic terminal as default path)
- E2E tests for primary Ralph happy path (intake → blueprint → bootstrap → run → delivery)
- E2E tests for existing Ralph project open, repair, and recovery
- E2E tests for safety controls (pause/resume/stop), validation failure, missing dependencies
- E2E tests for compatibility (`window.ralph` and `window.knuthflow` alias behavior)
- Changelog updated to reflect Ralph refocus

### Fixed

- IPC handler code review issues
- Runtime errors in operator console
- Race conditions and task hierarchy issues
- Memory leaks and path handling bugs
- Codebase search and context gathering job implementation
- Workspace selector path handling and secure storage command execution
- Blueprint type imports and IPC event type
- Phase 19 monitoring issues (updateMaintenanceRun missing runId field)
- Phase 18 review issues (type consolidation, path validation, error handling)
- Phase 17 bugs (atomic delivery+lessons, id-based lookups, pattern threshold, autoInject precedence)
- CSP blocking Monaco editor CDN
- E2E test runner issues (Linux executable name, CI packaging, UI test skipping on macOS)

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

#### Phase 12: Ralph Flow Upgrade
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
- Ralph execution adapter with PTY session management, prompt building, and iteration execution
- Loop state machine with pause, resume, stop, and state transitions
- Plan parser with task status update functions (markTaskCompleted, markTaskPending)
- Replan handler that preserves completed tasks and regenerates fix_plan.md
- Validate handler that runs build, test, and lint validation
- TypeScript compilation and lint checks pass

#### Phase 13: Goal To App Bootstrap
- App intake form with three-path workflow (choose, blueprint, freeform)
- Blueprint generation from intake form with deterministic versioning
- Workspace scaffolding with four templates (web/React+Vite, electron, api/Express, mobile/React Native+Expo)
- Kickoff review surface showing specs, milestones, scaffold choices, and acceptance gates
- Explicit approval step before autonomous build execution begins

#### Phase 14: Long-Horizon App Builder
- Milestone controller managing app-level milestones, task dependencies, and cross-iteration progress
- Context compression with bounded prompts, milestone snapshots, and resumable compressed state
- Task graph initialization from parsed fix_plan.md with dependency tracking
- Preview, build, test, lint, and milestone validation via IPC handlers
- Feedback decision system (accept, rework, rollback, replan) for validation results
- Milestone management methods in RalphRuntime (initializeMilestones, getMilestones, getActiveMilestone, completeMilestone)

#### Phase 15: Desktop One-Shot Delivery
- Delivery review panel with inspect, run packaging, and confirm release workflows
- Delivery service with handoff bundle generation and artifact collection
- Release gates with base gates (source exists, build output, SPEC.md, fix_plan.md)
- Blueprint acceptance gate evaluation (parses acceptance gate strings and runs validation commands)
- Platform-specific handoffs for iOS/Android (Capacitor), PWA (Lighthouse), desktop smoke tests
- E2E test coverage for delivery workflow (skipped on macOS CI due to Gatekeeper)

#### Phase 16: Multi-App Portfolio Orchestrator
- Portfolio database schema with Portfolio, PortfolioProject, and artifact reference tables
- Ralph runtime extension supporting concurrent runs with priority-based queuing
- Portfolio dashboard UI with project management, active runs display, and dependency graph
- Cross-app dependency resolution with topological sort and cycle detection
- Max concurrent runs control with queue management

#### Phase 17: Delivery Intelligence and Loop Learning
- MistakeTracker pattern detection with countermeasure generation
- Prompt injection manager with auto-inject and auto-remove thresholds
- Delivery metrics collection (build time, iteration count, validation pass rate, operator interventions)
- Lessons learned generator with success/failure/cancellation summaries
- Database tables: delivery_metrics, prompt_countermeasures, lessons_learned

#### Phase 18: Cross-Platform Packaging Engine
- Platform target specification in app intake (mobile, web, desktop)
- Capacitor mobile build pipeline (ios/android) with xcodebuild and gradle
- PWA packaging with manifest.json, service worker, and offline caching strategies
- Platform-specific validation gates: capacitor-init, capacitor-sync, capacitor-build, pwa-lighthouse
- Platform-target-specific spec overrides (specs/mobile-ux.md, specs/pwa-offline.md, specs/desktop-ux.md)

#### Phase 19: Autonomous Post-Delivery Iteration
- Post-delivery monitoring service with health checks (build, lint, tests, vulnerabilities)
- Autonomous scheduler triggering maintenance runs on regression detection
- Version management with app_versions table and channel assignments (internal/beta/stable)
- Staged rollout support with beta testers and promotion workflows
- Maintenance run table and IPC handlers for lifecycle management
- Maintenance panel UI for viewing and managing maintenance runs

#### Phase 20: Skill Library and Blueprint System
- Blueprint database schema with Blueprint, BlueprintVersion, and BlueprintUsageStats tables
- Blueprint browser, author, and detail view UI components
- BlueprintSpec document format with starter templates, spec file templates, task patterns, and acceptance gates
- Blueprint intake integration in app intake form
- Blueprint import/export via GitHub Gist and local .tar.gz files
- Blueprint inheritance with parent_blueprint_id, version tracking, and override mechanism
- Blueprint extension handler (blueprint:extend) for creating child blueprints with overrides
- Blueprint inheritance chain tracking (blueprint:getInheritanceChain)
- Blueprint version comparison (blueprint:compareVersions)

### Fixed
- IPC handler code review issues
- Runtime errors in operator console
- Race conditions and task hierarchy issues
- Memory leaks and path handling bugs
- Codebase search and context gathering job implementation
- Workspace selector path handling and secure storage command execution
- Blueprint type imports and IPC event type
- Phase 19 monitoring issues (updateMaintenanceRun missing runId field)
- Phase 18 review issues (type consolidation, path validation, error handling)
- Phase 17 bugs (atomic delivery+lessons, id-based lookups, pattern threshold, autoInject precedence)
- CSP blocking Monaco editor CDN
- E2E test runner issues (Linux executable name, CI packaging, UI test skipping on macOS)