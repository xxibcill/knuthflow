# Ralph Mode Operator Guide

Ralph is Ralph's autonomous desktop mode that uses Claude Code to execute tasks from a `fix_plan.md` file with minimal operator intervention. Ralph replaces the previous Knuthflow branding as the primary product name.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a New Ralph Project](#creating-a-new-ralph-project)
3. [Opening Existing Projects](#opening-existing-projects)
4. [Understanding Loop States](#understanding-loop-states)
5. [Monitoring Ralph Runs](#monitoring-ralph-runs)
6. [Intervening in Runs](#intervening-in-runs)
7. [Reviewing Artifacts and Plans](#reviewing-artifacts-and-plans)
8. [Delivery and Packaging](#delivery-and-packaging)
9. [Recovery and Troubleshooting](#recovery-and-troubleshooting)
10. [Configuration Reference](#configuration-reference)

---

## Getting Started

### Prerequisites

- Claude Code installed and accessible in PATH
- A workspace with `PROMPT.md`, `AGENT.md`, and `fix_plan.md` files (created during bootstrap)
- Node.js and npm (for project-specific dependencies)

### Ralph Console

When you launch Ralph, you see the **Ralph Console** — the primary interface for managing projects and runs. The Console shows:

- **Workspace selector**: Choose which workspace to work with
- **Readiness badge**: Shows if the workspace is ready for Ralph runs
- **Run list**: All Ralph runs across your projects
- **Action buttons**: New App, Bootstrap Ralph, Repair Files, Edit Control Files

### Ralph Control Files

When a workspace is bootstrapped for Ralph, these files are created:

| File | Purpose |
|------|---------|
| `PROMPT.md` | Context and instructions for Claude Code |
| `AGENT.md` | Agent behavior configuration (build/run/test instructions) |
| `fix_plan.md` | Task list to execute |
| `specs/` | (Optional) Additional specification files |
| `.ralph/` | Ralph project metadata directory |

---

## Creating a New Ralph Project

### Step 1: Launch Ralph and Create New App

1. Open Ralph and navigate to the **Ralph Console**
2. Click **New App** to start the intake flow
3. Fill in the app brief describing what you want to build
4. Select target platform (Web, Node.js, etc.)
5. Choose delivery format

### Step 2: Review the Blueprint

Ralph generates a **blueprint** based on your intake:

- App specification with features and architecture
- Initial task breakdown for `fix_plan.md`
- Scaffold template selection
- Build and test commands

Review the blueprint and approve it to proceed.

### Step 3: Bootstrap the Workspace

After blueprint approval:

1. Ralph creates the project structure
2. **Bootstrap Ralph** action is highlighted
3. Click **Bootstrap Ralph** to create the control files
4. Review the generated `PROMPT.md`, `AGENT.md`, and `fix_plan.md`

### Step 4: Verify Readiness

Before starting a run, Ralph validates:

- All control files exist and are properly formatted
- No stale runs from previous sessions
- Claude Code is installed and accessible

The **Readiness** section shows a summary with any validation issues. Resolve issues before starting.

### Step 5: Start the Loop

1. With a ready workspace, click **Start Loop**
2. Ralph creates a new run and begins executing tasks
3. Monitor progress in the **Run Dashboard** tab

---

## Opening Existing Projects

### Opening a Ralph-Enabled Workspace

1. Click **Open Workspace** or use File > Open
2. Select a folder that contains a `.ralph/` directory
3. Ralph automatically detects the Ralph project and loads it
4. The Console updates to show the workspace context and readiness state

### Partially Bootstrapped Projects

If a workspace has some but not all control files:

1. Ralph shows a **Needs Repair** readiness state
2. Click **Repair Files** to regenerate missing control files
3. Backups are created before any changes
4. User-authored files in the workspace are preserved

### Stale Run Recovery

If Ralph detects a stale active run:

1. A recovery dialog appears with options:
   - **Resume**: Continue from the last checkpoint (if possible)
   - **Cleanup**: Mark the run as failed and clean up state
   - **Inspect**: View run details before deciding

2. Choose the appropriate action based on the situation

---

## Understanding Loop States

Ralph transitions through these states during execution:

| State | Description |
|-------|-------------|
| `idle` | No active run |
| `starting` | Initializing run and PTY session |
| `planning` | Analyzing tasks and selecting next item |
| `executing` | Claude is running and producing output |
| `validating` | Running acceptance gate (tests, build, etc.) |
| `paused` | Waiting for operator input |
| `failed` | Unrecoverable error or safety stop |
| `completed` | All tasks done or operator stopped |
| `cancelled` | Operator stopped the run |

### State Transition Diagram

```
idle → starting → planning → executing → validating
                                        ↓            ↓
                                      paused    [continue]
                                        ↓            ↓
                                   planning    [checkpoint]
                                        ↓            ↓
                                    failed    completed
                                         ↓
                                    cancelled
```

---

## Monitoring Ralph Runs

### Run Dashboard

The Run Dashboard shows:

| Metric | Description |
|--------|-------------|
| Run ID | Unique identifier for the run |
| Status | Current loop state |
| Phase | What Ralph is currently doing |
| Iteration | Current iteration / max iterations |
| Elapsed | Time since run started |

### Timeline Tab

The Timeline shows a chronological view of:

- Each iteration with its outcome
- Phase transitions
- Artifact counts
- Error events (if any)

### Safety Indicators

Watch these safety metrics:

| Metric | Warning Threshold |
|--------|-------------------|
| Iteration Count | > 80% of max |
| No Progress Count | > 2 consecutive |
| Rate Limit Usage | < 20% remaining |
| Circuit Breaker | Open state |

### Operator Controls

Use the **Controls** tab to:

- **Pause**: Suspend the run (can be resumed)
- **Resume**: Continue a paused run
- **Stop**: End the run (requires confirmation)

---

## Intervening in Runs

### Pausing a Run

1. Click **Pause** in the Controls tab
2. The run enters `paused` state
3. You can inspect artifacts and plan while paused
4. Click **Resume** to continue

### Stopping a Run

1. Click **Stop** in the Controls tab
2. A confirmation dialog appears
3. Confirm to end the run
4. The run transitions to `cancelled` state

**Note**: Stopped runs cannot be resumed. A new run must be started.

### Inspecting Mid-Run

While a run is active:

1. Navigate to the **Timeline** or **Artifacts** tab
2. View current progress and outputs
3. Check the **Fix Plan** tab to see which task is active
4. **Do not** manually edit control files while a run is active

---

## Reviewing Artifacts and Plans

### Artifacts Tab

Artifacts are outputs captured during the run:

| Type | Description |
|------|-------------|
| `compiler_output` | Build/lint output |
| `test_log` | Test results |
| `diff` | Changes made |
| `generated_file` | Files created by Ralph |
| `validation_result` | Gate pass/fail evidence |
| `loop_summary` | Iteration summary |

### Fix Plan Tab

The Fix Plan shows:

- All tasks with checkboxes
- Current active task highlighted
- Completed tasks marked with `[x]`
- Pending tasks marked with `[ ]`

**Note**: Editing `fix_plan.md` while a run is active is not recommended as it may cause unexpected behavior.

### History Tab

View past iterations:

- Loop summaries with prompt/response excerpts
- Plan snapshots before and after changes
- Use **Compare with previous** to see how plans evolve

---

## Delivery and Packaging

### When a Run Completes

When all tasks are done or the run reaches a terminal state:

1. Navigate to the **Delivery** section
2. Review the delivery manifest
3. Check artifact summary
4. Verify all gates passed

### Running Packaging

1. Click **Package** in the Delivery section
2. Select the delivery format
3. Ralph runs the build and validation gates
4. A delivery manifest is created

### Confirming Release

1. Review the handoff bundle
2. Click **Confirm Release** to mark delivery complete
3. The run transitions to `delivered` state

---

## Recovery and Troubleshooting

### Missing Claude Code

**Symptom**: Ralph shows "Claude Code not found" error

**Resolution**:
1. Install Claude Code on your system
2. Ensure it's in your PATH
3. Click **Recheck** in the readiness section

### Failed Bootstrap

**Symptom**: Bootstrap fails to create control files

**Resolution**:
1. Check workspace permissions
2. Ensure the workspace path exists
3. Click **Repair Files** to retry with force regeneration

### Corrupted Control Files

**Symptom**: Readiness shows "malformed" errors for control files

**Resolution**:
1. Click **Repair Files**
2. Backups are created automatically
3. Control files are regenerated
4. User files in the workspace are preserved

### Stale Run Detection

**Symptom**: "Stale run detected" appears on startup

**Resolution**:
1. Choose **Resume** if the run should continue
2. Choose **Cleanup** if the run should be marked failed
3. Choose **Inspect** to review before deciding

### No Progress Loop

**Symptom**: Run appears stuck with no output

**Resolution**:
1. Check the Fix Plan for oversized tasks
2. Consider editing the task to be smaller
3. Use **Stop** and start a new run with adjusted tasks

### Permission Denied

**Symptom**: Circuit breaker opens with "permission_denied"

**Resolution**:
1. Check git/npm permissions for the workspace
2. Resolve permissions externally
3. Use **Reset Safety** to clear circuit breaker state

### Recovery Commands

```bash
# View active runs
ralph status --project <project-id>

# Reset safety state
ralph reset-safety --project <project-id>

# Force cleanup stale runs
ralph cleanup --project <project-id>

# View checkpoint history
ralph checkpoints --run <run-id>
```

---

## Configuration Reference

### Runtime Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxIterations` | 50 | Maximum loop iterations before forced completion |
| `iterationTimeoutMs` | 300000 (5 min) | Timeout for single iteration |
| `idleTimeoutMs` | 1800000 (30 min) | Timeout for no activity |
| `maxCallCountPerWindow` | 100 | API calls allowed per window |
| `maxTokenCountPerWindow` | 500000 | Tokens allowed per window |
| `rateLimitWindowMs` | 3600000 (1 hr) | Rate limit window duration |
| `circuitBreakerFailureThreshold` | 5 | Failures before circuit opens |
| `circuitBreakerNoProgressThreshold` | 3 | No-progress iterations before stop |
| `circuitBreakerCooldownMs` | 900000 (15 min) | Cooldown period after circuit opens |

### Acceptance Gate Types

| Type | Description | Use Case |
|------|-------------|----------|
| `test` | Runs `npm test` or detected test command | Tasks involving code changes |
| `build` | Runs `npm run build` or `tsc` | Compile/bundling tasks |
| `lint` | Runs `npm run lint` or eslint | Code quality tasks |
| `observable` | Custom command with exit code check | Verification of side effects |
| `manual` | Operator decides | Debugging or exploratory tasks |

### Checkpoint Configuration

| Setting | Description |
|---------|-------------|
| `checkpointEnabled` | Create git commits after successful iterations |
| `checkpointTagPattern` | Optional tag pattern (e.g., `ralph-{runId}-{iteration}`) |
| `excludeUnrelatedChanges` | Never commit files outside Ralph control stack |

---

## Safety Features

### Rate Limiting

- Prevents excessive API calls
- Configurable per-window limits
- Automatic cooldown when limits reached

### Circuit Breaker

Three failure types trigger circuit breaker:
- **Failures**: Errors during execution
- **No Progress**: Iteration completes but task not advanced
- **Permission Denials**: Access issues (immediate open)

### Safety Stops

When a safety stop occurs, the loop:
1. Records the reason and metadata
2. Marks run as paused or failed
3. Stores safety stop for operator review

### Checkpoint Isolation

- Checkpoints only include Ralph control files (PROMPT.md, AGENT.md, fix_plan.md, specs/)
- Unrelated changes in workspace are never swept into Ralph commits
- Preflight check warns if unrelated changes exist

---

## Known Limitations

### Unsupported Workflows

1. **Interactive commands**: Ralph cannot interact with prompts (use `claude --no-input`)
2. **Long-running daemons**: Background processes may cause timeout issues
3. **Multi-session coordination**: Each run is isolated; no inter-run communication
4. **Git operations beyond checkpoint**: Push/pull require external handling

### Risk Boundaries

| Risk | Mitigation |
|------|------------|
| Unintended file modifications | Only modify files referenced in fix_plan.md |
| API cost overrun | Rate limiting and iteration caps |
| Infinite loops | No-progress detection and circuit breaker |
| Permission escalation | Narrow git command whitelist only |

---

## Appendix: File Templates

### PROMPT.md Template

```markdown
# Project Context

[Describe the project, its architecture, and goals]

## Current Focus

[What Ralph should focus on in this session]

## Constraints

- Only modify files related to current task
- Run tests before marking tasks complete
- Report any blockers encountered
```

### fix_plan.md Template

```markdown
# Fix Plan

## Tasks

- [ ] Task 1: [Description]
  - Details and acceptance criteria

- [ ] Task 2: [Description]
  - Details and acceptance criteria
```

### Checkpoint Commit Format

Ralph creates commits with this message format:

```
Ralph checkpoint: <task-title>

Iteration: <n>
Run: <run-id-short>
Timestamp: <ISO-8601>

[skip ci] - Ralph autonomous checkpoint
```