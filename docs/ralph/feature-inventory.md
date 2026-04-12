# Ralph Loop Feature Inventory

This document inventories the Ralph loop as it exists in the current codebase.
It is based on implemented code under `src/main`, `src/shared`, `src/preload.ts`, and `src/components/ralph-console`, not on roadmap intent.

## Summary

Ralph is currently implemented as a set of subsystems:

- Workspace bootstrap and readiness validation
- Loop run persistence and runtime state tracking
- PTY-backed Claude session execution
- Fix-plan parsing and task scheduling helpers
- Safety controls, validation runners, artifact storage, recovery, checkpointing, and learning modules
- A frontend operator console for bootstrapping, starting runs, inspecting runs, and controlling pause/resume/stop

The codebase does **not** currently contain a single end-to-end controller that fully wires scheduler -> execution -> validation -> artifact capture -> plan mutation into one autonomous loop. Some Ralph features exist as backend capabilities or UI shells without full integration.

## Frontend Features

### 1. Ralph Console entry point

Implemented in `src/App.tsx` and `src/components/ralph-console/RalphConsolePanel.tsx`.

Features:

- Dedicated `Console` view in the main app
- Workspace-scoped Ralph operations from the currently selected repository
- Global Ralph run list across all registered workspaces
- Automatic refresh polling for the selected running run every 5 seconds

### 2. Workspace readiness and setup

Implemented in `RalphConsolePanel`.

Features:

- Shows current workspace name, path, readiness badge, and Ralph project id
- Displays readiness summary and up to three validation issues
- `Bootstrap Ralph` action to create Ralph control files and register a Ralph project
- `Repair Files` action to force-regenerate Ralph control files
- `Edit Prompt`, `Edit Agent`, and `Edit Fix Plan` shortcuts that open:
  - `PROMPT.md`
  - `AGENT.md`
  - `fix_plan.md`
- `Start Loop` action gated on readiness, existing project, and no active running loop

### 3. Run inventory and selection

Implemented in `RalphConsolePanel` and `RalphRunCard`.

Features:

- Lists Ralph runs from every workspace that has a Ralph project
- Displays run name, workspace name, status, phase, iteration count, loop count, elapsed time, start time, and error text
- Allows selecting a run to inspect details
- Allows opening the run workspace from the run card
- Resolves runtime state for running/pending runs through `ralphRuntime:getState`

Current limitation:

- `selectedItem` and `safetyState` are defined in UI types, but are not populated from backend state in the current console flow

### 4. Run dashboard tab

Implemented in `RalphConsolePanel`.

Features:

- Summary cards for run id, iterations, status, and phase
- Placeholder display for current task when `selectedItem` is available

### 5. Timeline tab

Implemented in `RalphConsolePanel` and `RalphPhaseTimeline`.

Features:

- Builds timeline events from stored loop summaries plus current runtime phase
- Displays iteration number, phase, timestamp, optional selected item, optional duration, artifact count, and outcome
- Marks the current iteration visually

Current limitation:

- Timeline data is synthesized from summaries and current state; there is no dedicated persisted phase-event stream hooked into the UI

### 6. Artifacts tab

Implemented in `RalphArtifactViewer`.

Features:

- Artifact list UI
- Filter by artifact type
- Severity badges
- Exit code display
- Duration display
- Expand/collapse long artifact payloads
- Selection/highlight support

Current limitation:

- The renderer calls `ralph:listArtifacts`, but no matching IPC handler is registered in `src/main/ipc/ralphHandlers.ts`
- Artifact storage exists in the backend, but artifact listing is not currently wired end-to-end into the console

### 7. Fix Plan tab

Implemented in `RalphConsolePanel` and `RalphFixPlanPanel`.

Features:

- Reads `fix_plan.md` from the selected run workspace
- Parses checkbox-style tasks into a visual task list
- Shows pending, active, completed, and deferred counts
- Displays indentation-based hierarchy
- Lets the operator open `fix_plan.md`
- Lets the operator jump to the exact task line in the editor

Current limitation:

- The frontend uses its own lightweight parser instead of the backend scheduler parser
- Task descriptions and scheduler metadata are mostly absent in the UI representation

### 8. History tab

Implemented in `RalphConsolePanel` and `RalphLoopHistoryPanel`.

Features:

- Shows stored loop summaries by iteration
- Shows stored plan snapshots by iteration
- Displays truncated prompt/response content for summaries
- Displays truncated snapshot content for plan snapshots
- Includes a `Compare with previous` affordance for snapshots

Current limitation:

- Snapshot compare is only a UI callback hook; no compare implementation is connected in `RalphConsolePanel`

### 9. Operator Controls tab

Implemented in `RalphOperatorControls` and `RalphConsolePanel`.

Features:

- Pause active run
- Resume paused run
- Stop active or paused run
- Confirmation flow for destructive stop action
- Current phase, run state, and available-controls summary cards

Current limitation:

- `Replan` and `Validate` buttons are intentionally disabled in the UI

### 10. Alerts tab

Implemented in `RalphSafetyAlerts`.

Features:

- Alert list UI for critical/warning/info safety events
- Dismiss and details callbacks
- Resume-possible messaging

Current limitation:

- `alerts` state is never populated in the current console code, so this tab is presently an empty shell unless future wiring is added

## Backend Features

### 1. Workspace bootstrap

Implemented in `src/main/ralphBootstrap.ts`.

Features:

- Creates a Ralph project record in SQLite
- Creates default Ralph control files:
  - `PROMPT.md`
  - `AGENT.md`
  - `fix_plan.md`
  - `specs/index.md`
  - `specs/example.md`
  - `.ralph`
- Supports force-regeneration of existing control files
- Creates timestamped backups during forced bootstrap
- Reads Ralph control file contents
- Detects whether a workspace is Ralph-enabled by validating `.ralph`

### 2. Readiness validation

Implemented in `src/main/ralphValidator.ts`.

Features:

- Validates workspace existence
- Validates presence and shape of required Ralph files and directories
- Validates `.ralph` JSON shape
- Detects partial/corrupted Ralph state
- Distinguishes fresh workspaces from bootstrapped/corrupted ones
- Detects stale active runs using the stale-run threshold
- Provides:
  - full readiness reports
  - validation before start
  - validation before resume
  - validation before repair
  - fresh/corrupted workspace checks

### 3. Project, run, and history persistence

Implemented in `src/main/database.ts` and migrations.

Features:

- Ralph project storage
- Loop run storage
- Loop summary storage
- Plan snapshot storage
- Artifact storage
- Loop learning storage
- Follow-up storage
- Safety-state storage
- Checkpoint metadata storage

Stored run fields include:

- status
- start/end time
- exit code and signal
- error text
- iteration count
- linked session id
- linked PTY session id

### 4. Runtime state machine

Implemented in `src/main/ralphRuntime.ts`.

Features:

- Starts a run and enforces one active run per project
- Tracks runtime phase:
  - `starting`
  - `planning`
  - `executing`
  - `validating`
  - `paused`
  - terminal states
- Supports pause, resume, stop, and force-stop
- Enforces state-transition rules
- Tracks current iteration context
- Tracks per-run safety stop information
- Increments iteration count
- Enforces max iteration limit
- Detects iteration timeout and idle timeout
- Maintains reverse indexes for fast run/project lookup
- Cleans up terminal-state runs from memory
- Exposes recovery hooks

Important limitation:

- Runtime manages run state, but it is not itself the orchestrator that selects tasks, runs prompts, validates, and advances the loop end-to-end

### 5. PTY-backed execution adapter

Implemented in `src/main/ralphExecution.ts`.

Features:

- Creates a PTY session in the workspace
- Detects Claude Code installation from safe known paths
- Launches Claude in the PTY after shell prompt readiness
- Builds Ralph loop prompts from control files and iteration context
- Writes prompts/commands to the PTY
- Collects output from the PTY
- Emits session-expired signal when the PTY exits
- Supports direct command write and terminal resize
- Supports creating a fresh session when resume fails

Current limitations:

- Session persistence across app restart is explicitly not implemented
- `executeIteration()` resolves on PTY exit, so it is not currently a full conversational loop runner

### 6. Prompt construction

Implemented in `src/main/ralph/ralphPromptBuilder.ts`.

Features:

- Injects iteration number and timestamp
- Injects selected task and acceptance gate when available
- Injects operator-authored `PROMPT.md`
- Injects `AGENT.md`
- Injects a relevant excerpt of `fix_plan.md`
- Adds focused loop instructions:
  - work only on the current task
  - make minimal changes
  - run acceptance verification
  - report blockers
  - exit cleanly

### 7. Scheduler and fix-plan parsing

Implemented in `src/main/ralphScheduler.ts` and `src/main/ralph/*`.

Features:

- Parses `fix_plan.md` checkbox tasks
- Extracts task status, line number, indentation, and derived priority
- Flattens nested task trees
- Selects the highest-priority pending task
- Returns all pending tasks
- Marks tasks completed in `fix_plan.md`
- Defers tasks by appending a deferral note
- Determines acceptance gates from task text
- Writes acceptance-gate annotations back into `fix_plan.md`
- Detects oversized tasks through heuristics
- Creates incremental sub-task wrappers for oversized tasks

Scheduler IPC handlers exist for:

- parse plan
- select next item
- get pending items
- complete item
- defer item
- determine acceptance gate

Current limitation:

- Scheduler APIs are implemented in main process IPC, but are not exposed through the preload bridge or consumed by the current frontend console

### 8. Acceptance gates

Implemented in `src/main/ralph/acceptanceGates.ts`.

Features:

- Infers gate type from task title
- Supports gate types:
  - `test`
  - `build`
  - `lint`
  - `observable`
  - `manual`
- Provides default commands and timeouts for inferred test/build/lint tasks
- Falls back to manual verification when no stronger gate is detected

### 9. Validation runner

Implemented in `src/main/ralph/ralphValidationRunner.ts`.

Features:

- Runs validation for acceptance gates
- Auto-detects test commands from `package.json` and common config files
- Auto-detects build commands from `package.json` and `tsconfig.json`
- Auto-detects lint commands from `package.json` and ESLint config files
- Supports observable and manual gate execution
- Parses validation output into structured errors/warnings
- Recognizes TypeScript, Jest, Vitest, ESBuild, and ESLint-style output patterns
- Supports escalation levels:
  - `focused`
  - `expanded`
  - `full`

### 10. Safety controls

Implemented in `src/main/ralphSafety.ts`.

Features:

- Per-project call-count rate limiting
- Per-project token-count rate limiting
- Rolling rate-limit window reset
- Circuit breaker on repeated failures
- No-progress tracking
- Immediate circuit opening on permission denial
- Timeout classification:
  - productive iteration timeout
  - idle timeout
- Auto-reset of open circuit after cooldown
- Persistence of safety state in SQLite
- Query APIs for rate limit, circuit breaker, and aggregate safety state

Safety IPC handlers exist for:

- can execute
- record call
- record failure
- record no progress
- record permission denial
- get rate-limit state
- get circuit-breaker state
- check if circuit is open
- reset circuit
- get full safety state

Current limitation:

- Safety data is not currently surfaced into the console’s `alerts` or per-run safety badges end-to-end

### 11. Artifact capture and retention

Implemented in `src/main/ralph/ralphArtifact.ts` and `src/main/database.ts`.

Features:

- Stores artifact records by project/run/iteration/item
- Supports artifact types:
  - `compiler_output`
  - `test_log`
  - `diff`
  - `exit_metadata`
  - `generated_file`
  - `validation_result`
  - `loop_summary`
- Captures generated file contents with truncation limits
- Retrieves artifacts by run, iteration, item, and type
- Applies retention policy with special retention for error artifacts

Current limitation:

- Storage exists, but the main-process IPC layer does not currently expose artifact listing to the renderer

### 12. Recovery and orphan cleanup

Implemented in `src/main/ralph/ralphRecovery.ts`.

Features:

- Detects stale running runs
- Checks whether a PTY session is still alive
- Classifies stale runs as resumed, cleaned up, failed, or unrecoverable
- Marks orphaned runs failed and cleans runtime memory
- Performs startup recovery for a project
- Cleans orphaned artifacts not tied to a valid run

### 13. Checkpointing

Implemented in `src/main/ralph/ralphCheckpoint.ts`.

Features:

- Validates git command safety through a whitelist and dangerous-pattern filter
- Checks workspace cleanliness before checkpointing
- Separates Ralph file changes from unrelated dirty files
- Stages only Ralph-related files
- Creates checkpoint commits for loop iterations
- Stores checkpoint metadata in the database
- Supports dry-run checkpoint behavior

Current limitation:

- Checkpointing is implemented as a backend module and is not currently exposed in the console

### 14. Output analysis and decision support

Implemented in `src/main/ralph/ralphOutputAnalyzer.ts`.

Features:

- Extracts completion signals
- Extracts failure signals
- Extracts no-progress signals
- Extracts permission-denial signals
- Detects repeated blockers
- Detects loop-stuck similarity against previous outputs
- Extracts structured JSON-like output when possible
- Produces a distilled summary for decision-making

Decision categories supported:

- `continue`
- `replan`
- `pause`
- `fail`
- `complete`

### 15. Learning and follow-up generation

Implemented in `src/main/ralph/ralphLoopLearner.ts` and database methods.

Features:

- Tracks repeated mistake patterns across iterations
- Detects repeated errors and no-progress patterns
- Persists loop learning patterns and countermeasures
- Generates reusable learning rules
- Generates operator-facing learning summaries
- Stores follow-up items in the database

### 16. Plan regeneration and context search

Implemented in `src/main/ralph/ralphPlanRegenerator.ts` and `src/main/ralph/ralphSearchJob.ts`.

Features:

- Regenerates `fix_plan.md` from current evidence
- Snapshots plan before and after regeneration
- Uses persisted learning during regeneration
- Generates follow-up items from certain plan changes
- Reorders plan tasks by priority
- Runs bounded code/test/docs/spec search jobs
- Caches search results
- Produces distilled search context packs for prompt injection

Current limitation:

- The console disables replan, and the `ralph:replanRun` IPC endpoint currently throws `Replan is not implemented yet`

### 17. Dry-run harness

Implemented in `src/main/ralph/ralphDryRunHarness.ts`.

Features:

- Synthetic fixtures for:
  - success
  - no progress
  - permission denied
  - stale plan
  - timeout
  - validation failure
  - compilation error
  - test failure
- Scenario builders for simulated Ralph decision flows

Current limitation:

- This is a backend support/testing module and is not connected to the UI

## IPC and Renderer Surface

### Exposed to renderer today

Via `src/preload.ts` and `src/shared/preloadTypes.ts`, the renderer can currently access:

- Ralph bootstrap/readiness/project/run/history APIs
- Ralph runtime start/getState
- Pause/resume/stop helpers
- Replan and validate stubs
- Artifact list call shape

### Present in main process but not exposed through preload

- Ralph scheduler APIs
- Ralph safety APIs

This means the backend has more Ralph capability than the current renderer can use directly.

## Notable Gaps and Partial Wiring

These are important for understanding the true state of the Ralph loop:

- No end-to-end autonomous loop controller currently coordinates task selection, prompt execution, validation, and iteration advancement
- `ralph:replanRun` exists as an IPC endpoint but throws `Replan is not implemented yet`
- `ralph:validateRun` exists as an IPC endpoint but throws `Validation is not implemented yet`
- `Replan` and `Validate` buttons are disabled in the operator console
- Artifact listing is called by the renderer but no `ralph:listArtifacts` IPC handler is registered
- Alerts UI exists, but no safety-event ingestion populates it
- Run cards define `selectedItem` and `safetyState`, but the current console loading path does not populate them
- Scheduler and safety backends exist, but are not exposed to the renderer through preload
- Session persistence for Ralph execution is explicitly stubbed and does not survive app restart

## Bottom Line

Ralph already has a substantial implementation footprint in both frontend and backend:

- The frontend supports setup, run inspection, history viewing, and basic operator control
- The backend supports bootstrap, validation, runtime tracking, PTY execution, scheduling helpers, safety, validation, artifact persistence, recovery, checkpointing, learning, and plan-regeneration modules

What is missing is the final integration layer that turns these pieces into a fully wired autonomous loop with complete operator visibility.
