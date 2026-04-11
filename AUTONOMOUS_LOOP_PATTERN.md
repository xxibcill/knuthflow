# Autonomous Development Loop Pattern

## Overview

An **autonomous development loop** is a self-directed system that iteratively executes an AI coding assistant, analyzes its output, and determines whether to continue or exit without human intervention per iteration.

This pattern is the foundation of Ralph, but the concepts apply to any autonomous agent system. In Ralph form, the loop is intentionally monolithic: reload the same control stack every turn, choose one meaningful item, apply strong backpressure, then feed the result back into the next turn.

---

## The Loop Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      LOOP ORCHESTRATOR                      │
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────┐    │
│   │  CHECK   │───▶│  EXECUTE  │───▶│     ANALYZE      │    │
│   │  safety  │    │   agent   │    │     output       │    │
│   └──────────┘    └──────────┘    └────────┬─────────┘    │
│        │                                      │           │
│        │                                      ▼           │
│        │                              ┌──────────────┐    │
│        │                              │   DECIDE     │    │
│        │                              │  continue?   │    │
│        │                              └──────┬───────┘    │
│        │                                     │            │
│        │              ┌──────────────────────┼────────────┘
│        │              │                     │
│        │              ▼                     ▼
│        │        ┌──────────┐         ┌───────────┐
│        └───────▶│  BACKUP  │         │    EXIT   │
│                 │ (optional)│         │  with     │
│                 └──────────┘         │  reason   │
│                                      └───────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Safety Gates

Before each loop iteration, the system checks three safety mechanisms:

### 1.1 Rate Limiter

**Purpose:** Prevent API quota exhaustion.

```
Call Count ≤ Max Calls/Hour?
Token Count ≤ Max Tokens/Hour?

If NO → Sleep until reset window OR exit
If YES → Proceed
```

**State persisted:** Call count, token count, window start timestamp.

### 1.2 Circuit Breaker

**Purpose:** Detect runaway loops and halt before waste.

```
CLOSED ──[no progress x3]──▶ OPEN
         [same error x5]
         [output drop >70%]
         [permission denied x2]

OPEN ──[cooldown expires]──▶ HALF_OPEN
HALF_OPEN ──[progress]──▶ CLOSED
            [no progress]──▶ OPEN
```

**Why it exists:** An autonomous agent can loop forever on a mis-specified task. Circuit breaker forces a stop.

### 1.3 File Integrity Check

**Purpose:** Ensure the control files exist before the agent runs.

```
Required files exist?

├── .ralph/ (directory)
├── PROMPT.md (agent instructions)
├── fix_plan.md (task list)
├── specs/ (behavioral specifications)
├── AGENT.md (build/run instructions)
└── .ralphrc (configuration)

If any MISSING → Halt with recovery instructions
```

---

## Phase 2: Execute Agent

### 2.1 Build Command

Construct the agent invocation with:

| Component | Purpose |
|-----------|---------|
| **Prompt** | Task instructions from PROMPT.md |
| **Pinned Stack** | `AGENT.md`, `fix_plan.md`, relevant `specs/*`, last loop summary |
| **System Context** | Loop number, remaining tasks, circuit state |
| **Scheduler Rules** | One item per loop, search before edit, no placeholders |
| **Tool Permissions** | Restrict which tools the agent may use |
| **Session ID** | Resume prior session for continuity |
| **Model/Effort** | Optional overrides |

### 2.2 Execute and Stream

```
┌─────────────────────────────────────────┐
│           AGENT EXECUTION               │
│                                         │
│  Start agent process                    │
│       │                                 │
│       ├──▶ Stream output to terminal    │ (if --monitor)
│       │                                 │
│       ├──▶ Capture output to file       │
│       │                                 │
│       └──▶ Wait for completion         │
│              OR timeout                 │
└─────────────────────────────────────────┘
```

**Timeout behavior:**
- Process killed after N minutes
- If files changed during execution → "productive timeout" (continue)
- If no files changed → "idle timeout" (exit with error)

### 2.3 Capture Session ID

After agent execution, extract the session ID for future continuation.

---

## Phase 3: Analyze Output

### 3.1 Parse Structured Response

If the agent supports structured output (e.g., JSON), extract:

```json
{
  "status": "COMPLETE",
  "exit_signal": true,
  "work_type": "feature",
  "files_modified": ["src/main.rs"],
  "asking_questions": false,
  "question_count": 0,
  "permission_denials": []
}
```

### 3.2 Detect Completion Indicators

Natural language patterns that suggest work is done:

| Indicator | Example |
|-----------|---------|
| Done signals | "complete", "finished", "done" |
| All tasks checked | items in fix_plan.md marked complete |
| Test passage | high test pass percentage |
| File creation | new files created and committed |

### 3.3 Detect Problem Patterns

| Pattern | Problem | Action |
|---------|---------|--------|
| `asking_questions: true` | Agent is waiting, not working | Inject corrective guidance |
| `permission_denials` > 0 | Tool restrictions too tight | Exit with fix instructions |
| `is_error: true` | API-level failure | Reset session, retry |
| Repeated identical errors | Circuit breaker threshold | Open circuit |

---

## Phase 4: Decide Continue/Exit

### 4.1 Exit Conditions (all must be met)

```
Exit = TRUE  if  completion_indicators ≥ 2  AND  exit_signal = true
Exit = TRUE  if  done_signals ≥ 2
Exit = TRUE  if  test_loops ≥ 3
Exit = TRUE  if  all fix_plan.md items complete
Exit = TRUE  if  circuit breaker OPEN
```

**Note:** `exit_signal` is an explicit signal from the agent. Completion indicators are heuristics. Both are required in "strict" mode to avoid false positives.

### 4.2 Exit Reasons

| Reason | Meaning |
|--------|---------|
| `project_complete` | Agent signaled done + work finished |
| `circuit_open` | Safety triggered, no progress |
| `rate_limit_exceeded` | Hourly quota reached |
| `permission_denied` | Agent can't execute needed tools |
| `user_interrupt` | Human killed the loop |
| `idle_timeout` | Agent did nothing for timeout period |

---

## Phase 5: Loop Context (System Prompt)

Each iteration injects context to maintain coherence:

```
=== LOOP #{N} ===
Pinned stack:
- AGENT.md
- fix_plan.md
- relevant specs/*
- operator tuning rules / "signs"

Remaining tasks from fix_plan.md:
- [ ] Task 1
- [ ] Task 2

Circuit breaker: {state} (if not CLOSED)
Last loop: {summary of work done}

If asking questions detected:
"Reminder: Answer with actions, not questions.
Claude Code should make decisions and proceed."
```

---

## Ralph-Specific Expanded Phases

The generic five-phase controller above is sufficient to run an autonomous agent. Ralph adds a stricter operating rhythm so the loop keeps turning without drifting: deterministic stack allocation, one-item execution, aggressive validation, and constant plan repair.

### Phase 0: Allocate the Stack

**Goal:** Rebuild the same decision surface every loop so the agent does not wander.

**Tasks:**
- Load `AGENT.md`, `fix_plan.md`, and the relevant `specs/*`.
- Carry forward a short summary of the prior loop instead of replaying the full transcript.
- Re-inject operator tuning rules such as "search first", "do one thing", and "do not ship placeholders".
- Keep the context window narrow enough that the loop can stay fast.

**Outputs:** `task_brief`, `validation_commands`, `active_signs`

### Phase 1: Refresh the Task Frontier

**Goal:** Repair the plan against current reality before deciding what to build.

**Tasks:**
- Launch search-only subagents to inspect code, tests, docs, and examples.
- Compare current implementation against `specs/*` and the current `fix_plan.md`.
- Search for `TODO`, `FIXME`, `placeholder`, `stub`, `unimplemented`, skipped tests, and temporary hacks.
- Re-sort `fix_plan.md` by importance before selecting work.

**Guardrail:** Never assume an item is missing until the codebase has been searched.

### Phase 2: Select One Item

**Goal:** Narrow the loop to a single increment with a crisp success condition.

**Tasks:**
- Pick the highest-value incomplete item from `fix_plan.md`.
- Split oversized work into a smaller loop-safe increment when necessary.
- Define the exact acceptance signal for this turn: one focused test, one build target, or one observable behavior.
- Refuse "while I'm here" expansions; record side discoveries back into `fix_plan.md`.

**Outputs:** `selected_item`, `acceptance_gate`, `deferred_followups`

### Phase 3: Search Before Edit

**Goal:** Prevent duplicate implementations and bad assumptions.

**Tasks:**
- Use parallel subagents to locate existing implementations, adjacent modules, ownership points, and related tests.
- Allow wide fan-out for search and summarization work.
- Keep validation narrowly serialized; one build or test worker avoids backpressure collapse.
- Confirm module names, file paths, and existing behavior before creating new code.

**Failure mode prevented:** "Ripgrep said no results, so the agent reimplemented the feature in the wrong place."

### Phase 4: Implement the Increment

**Goal:** Produce the smallest complete change that closes the selected gap.

**Tasks:**
- Implement the selected behavior using the project's existing patterns and specifications.
- Prefer full implementations over shims, placeholders, and TODO wrappers.
- Update or add tests for the touched behavior in the same loop.
- When authoring tests or docs, explain why the behavior matters so future loops inherit that reasoning.

**Exit from phase:** code exists, tests exist or were updated, and no intentional placeholder was left behind.

### Phase 5: Apply Backpressure

**Goal:** Reject bad code quickly while keeping the wheel turning.

**Tasks:**
- Run the narrowest relevant test first, then escalate only if necessary.
- Run compiler, typechecker, static analysis, lint, and security checks that meaningfully constrain bad output.
- Distinguish local failures from unrelated suite failures and infrastructure noise.
- Prefer fast, targeted validation over running the entire world on every loop.

**Typical gates:**
- Unit test for the touched module
- Build or typecheck
- Focused integration test
- Static analyzer for dynamically typed projects

### Phase 6: Loop Back on Artifacts

**Goal:** Turn failures and generated output into useful context for the next turn.

**Tasks:**
- Feed compiler errors, test failures, logs, traces, and generated artifacts back into the loop.
- If the raw output is noisy, use subagents to summarize and rank the failure causes.
- Add temporary logging or instrumentation when the failure mode is opaque.
- Preserve distilled diagnoses, not giant raw dumps.

**Principle:** Ralph should loop on evidence, not on vibes.

### Phase 7: Capture Learning and Tune the Loop

**Goal:** Teach the loop what it just learned.

**Tasks:**
- Update `AGENT.md` when a better build, run, or test command is discovered.
- Update `fix_plan.md` for completed items, new bugs, follow-ups, and newly exposed debt.
- Convert recurring mistakes into new prompt rules or operator "signs".
- Keep notes brief so future loops inherit guidance without inheriting noise.

**This is the self-improvement phase.**

### Phase 8: Regenerate the Todo List

**Goal:** Recover when the current plan is stale, wrong, or exhausted.

**Tasks:**
- Fan out research subagents across code, `specs/*`, tests, and examples.
- Rewrite `fix_plan.md` as a priority-sorted backlog of missing behavior, migrations, placeholder debt, and broken assumptions.
- Mark what is complete, partial, blocked, or speculative.
- Switch the next iteration from planning mode back to build mode once a clear frontier exists.

**When to trigger:** no obvious next task, repeated drift, or plan and reality no longer match.

### Phase 9: Commit, Tag, and Decide

**Goal:** Preserve recoverable progress and determine whether the loop continues.

**Tasks:**
- If the selected increment passes its acceptance gate, stage and commit the code together with the updated `fix_plan.md`.
- Push only when the repository is in a recoverable state.
- Tag known-good states when the project reaches a meaningful buildable or testable milestone.
- Exit only when the plan is exhausted, a safety gate trips, or an operator-defined boundary has been reached.

**Outputs:** commit, push, optional tag, or next loop trigger

### Ralph Execution Rules

- The main loop is a scheduler, not a giant all-knowing worker.
- Do one meaningful thing per loop.
- Search before creating.
- Use many subagents for search and summarization, but keep build and test pressure narrow.
- Write down why a test exists while the reasoning is fresh.
- Every repeated failure should become either a new rule, a new plan item, or a new validation gate.

---

## State Persistence

Between invocations, the system maintains:

| File | Purpose | Lifetime |
|------|---------|----------|
| `status.json` | Current loop count, circuit state, rate limits | Until project ends |
| `.session_id` | Agent session for continuation | 24 hours |
| `.exit_signals` | Recent exit signal history | Until project ends |
| `logs/` | Execution logs, agent output | Rotated, 4 files |
| `loop_summary.md` | Short handoff from the last loop | Until replaced |
| `plan_snapshots/` | Previous `fix_plan.md` versions for recovery | Rotated, latest N |

This enables **crash recovery** — if the loop is killed mid-execution, restart picks up where it left off.

---

## Key Design Decisions

### Session Continuity

Resume the agent's session across loops. Without this, each loop starts with zero context. With it, the agent remembers prior work.

**Trade-off:** Session can become stale after many iterations. Expire after 24 hours.

### Rate Limiting

Track both **call count** (requests per hour) and **token count** (input + output per hour). Some APIs count tokens differently than calls.

### Tool Restrictions

Restrict which commands the agent can run. `Bash(git *)` is dangerous because it includes `git clean -fd`. Instead, allow only specific subcommands: `Bash(git commit *)`, `Bash(git push *)`.

### Exit Signal Verification

Agent says "done" but should continue? Natural language heuristics (completion indicators) can trigger false exits. Solution: require BOTH heuristic signals AND explicit `exit_signal: true` from the agent.

---

## Variations

| Variant | When to Use |
|---------|-------------|
| **Live mode** | User wants to watch agent work in real-time |
| **Dry run** | Testing loop logic without API costs |
| **TUI mode** | Embedded terminal UI instead of tmux |
| **Checkpointing** | Save state every N loops for easier rollback |

---

## Anti-Patterns

| Anti-Pattern | Problem | Better |
|--------------|---------|--------|
| No circuit breaker | Agent can loop forever | Always implement |
| Multi-item loops | Diffuse context, ambiguous validation | One item per loop |
| Create before search | Duplicate features and wrong file placement | Search first, then edit |
| Wide parallel test fan-out | Slow noisy validation and resource contention | One validation worker |
| Placeholder implementations | Green build, fake progress | Require full implementations |
| `Bash(git *)` | Allows destructive commands | Whitelist subcommands |
| Exit on single "done" | False positive on documentation | Require dual verification |
| No session expiration | Stale context causes bugs | Expire after 24h |
| No file integrity check | Agent can delete its config | Validate before loop |
| No rate limiting | API quota surprise | Always track calls + tokens |

---

## Template: Implementing Your Own

```python
class RalphLoop:
    def __init__(self, config):
        self.rate_limiter = RateLimiter(config.max_calls, config.max_tokens)
        self.circuit_breaker = CircuitBreaker(config.thresholds)
        self.session_manager = SessionManager()

    def run(self):
        while True:
            # Phase 1: Safety gates
            if not self.rate_limiter.can_proceed():
                return "rate_limit_exceeded"
            if self.circuit_breaker.is_open():
                return "circuit_open"
            if not self.file_integrity.ok():
                return "file_missing"

            # Ralph Phase 0-3: allocate context, refresh plan, select one item
            stack = self.allocate_stack()
            selected_item = self.refresh_plan_and_select_item(stack)

            # Ralph Phase 4-6: implement, validate, and capture artifacts
            output = self.execute_agent(self.build_command(stack, selected_item))
            analysis = self.analyze(output)

            # Ralph Phase 7-8: tune the loop and repair the plan
            self.capture_learning(analysis)
            if analysis.plan_is_stale:
                self.regenerate_fix_plan()

            # Ralph Phase 9: decide whether to continue
            if self.should_exit(analysis):
                return analysis.exit_reason

            # Backup (optional)
            if self.config.backup_enabled:
                self.backup()

            # Update state
            self.circuit_breaker.record(analysis)
            self.rate_limiter.record(analysis.tokens)
```

---

## Summary

An autonomous development loop is a **supervised autonomous system**:

- **Autonomous:** Runs without per-iteration human input
- **Supervised:** Safety mechanisms prevent runaway behavior

In Ralph form, the loop becomes a disciplined scheduler: reload the same stack, choose one important item, search before editing, apply fast backpressure, capture what was learned, and repair the plan continuously. Exit is never unilateral; it is the result of both evidence and explicit policy.
