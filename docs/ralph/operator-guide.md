# Ralph Mode Operator Guide

Ralph is Knuthflow's autonomous mode that uses an agent to execute tasks from a `fix_plan.md` file with minimal operator intervention.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding Loop States](#understanding-loop-states)
3. [Monitoring Ralph Runs](#monitoring-ralph-runs)
4. [Recovery and Troubleshooting](#recovery-and-troubleshooting)
5. [Configuration Reference](#configuration-reference)

---

## Getting Started

### Prerequisites

- Claude Code installed and accessible in PATH
- A workspace with `PROMPT.md`, `AGENT.md`, and `fix_plan.md` files
- Node.js and npm (for project-specific dependencies)

### Bootstrap a Ralph Project

1. Open Knuthflow and navigate to your workspace
2. Run the bootstrap command from the Ralph menu or CLI
3. Review the generated control files:
   - `PROMPT.md` - Context and instructions for Claude
   - `AGENT.md` - Agent behavior configuration
   - `fix_plan.md` - Task list to execute
   - `specs/` - (Optional) Additional specification files

### Running Ralph

```
# From CLI
knuthflow ralph start --workspace /path/to/workspace

# From UI
1. Open workspace in Knuthflow
2. Select Ralph > Start Loop
3. Monitor progress in the Ralph dashboard
```

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

### State Transition Diagram

```
idle → starting → planning → executing → validating
                                        ↓            ↓
                                      paused    [continue]
                                        ↓            ↓
                                   planning    [checkpoint]
                                        ↓            ↓
                                    failed    completed
```

---

## Monitoring Ralph Runs

### Ralph Dashboard

The Ralph dashboard (accessible from the main UI) shows:

- **Current State**: Active loop state and iteration count
- **Selected Item**: Current task being worked on
- **Progress**: Completed vs pending tasks
- **Safety Indicators**: Rate limit usage, circuit breaker status
- **Recent Output**: Last few lines of Claude output

### Key Metrics

| Metric | Description | Warning Threshold |
|--------|-------------|-------------------|
| Iteration Count | Current iteration / max iterations | > 80% of max |
| No Progress Count | Consecutive iterations without advancement | > 2 |
| Rate Limit Usage | API calls remaining in current window | < 20% |
| Circuit Breaker | Failure/denial tracking | Open state |

---

## Recovery and Troubleshooting

### Interrupted Runs

When Knuthflow restarts or a PTY session dies:

1. **Automatic Recovery**: Ralph detects stale runs on startup
2. **Recovery Options**:
   - **Resume**: If session can be restored, continues from last checkpoint
   - **Cleanup**: If unrecoverable, marks run as failed and cleans state
   - **Manual Intervention**: Operator can inspect and decide

### Stale State Cleanup

Ralph periodically cleans up stale state:

- Runs inactive for > 30 minutes are considered stale
- Stale runs are either resumed (if possible) or cleaned up
- Artifacts from unrecoverable runs are orphaned and can be purged

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "No progress for N iterations" | Task stuck in loop | Check fix_plan.md; may need to skip or adjust task |
| "Circuit breaker open" | Too many failures | Wait for cooldown (15 min) or reset manually |
| "Permission denied" | Git/npm access issue | Operator must resolve permissions externally |
| "Session expired" | PTY session died | Auto-recovery creates new session |
| "Rate limit reached" | Too many API calls | Wait for window to reset |

### Recovery Commands

```bash
# View active runs
knuthflow ralph status --project <project-id>

# Reset safety state
knuthflow ralph reset-safety --project <project-id>

# Force cleanup stale runs
knuthflow ralph cleanup --project <project-id>

# View checkpoint history
knuthflow ralph checkpoints --run <run-id>
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

Checkpoints are created after validated iterations:

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

## Decision Log: Known Limitations

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