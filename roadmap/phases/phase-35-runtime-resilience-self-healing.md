# Phase 35 - Runtime Resilience and Self-Healing

## Functional Feature Outcome

Ralph can detect runtime degradation, recover stuck or failed internal services, preserve run state, and guide operators through safe self-healing actions.

## Why This Phase Exists

Long-running local automation depends on many moving pieces: Electron processes, PTY sessions, Claude Code, preview servers, validation commands, database writes, file watchers, connectors, and package tools. Earlier phases add recovery for specific workflows, but mature Ralph needs platform-level resilience. This phase hardens the runtime so failures are detected early, contained, and recoverable without losing project context.

## Scope

- Add health checks for main process services, renderer subscriptions, PTY manager, Ralph runtime, scheduler, preview servers, database, secure storage, and connector health.
- Add stuck-run detection based on heartbeat, output inactivity, phase timeout, and validation timeout.
- Add safe restart paths for failed preview servers, stale PTY sessions, scheduler stalls, and connector timeouts.
- Add database integrity checks and backup/restore points before risky migrations or long runs.
- Add crash recovery that restores project dashboard state and offers run reconciliation.
- Add self-healing actions with operator approval when data or workspace changes are involved.
- Add runtime diagnostics bundle export for support.
- Add chaos-style local tests or harnesses for simulated PTY exit, process crash, DB lock, preview timeout, and connector failure.

## Tasks

| Task | Summary |
| --- | --- |
| [P35-T1](../tasks/phase-35/p35-t1-runtime-health-model.md) | Define runtime health checks and service status model |
| [P35-T2](../tasks/phase-35/p35-t2-stuck-run-detection.md) | Detect stuck runs with heartbeat, output, phase, and timeout signals |
| [P35-T3](../tasks/phase-35/p35-t3-safe-service-restart.md) | Add safe restart/reconcile paths for failed runtime services |
| [P35-T4](../tasks/phase-35/p35-t4-db-integrity-backups.md) | Add database integrity checks and backup points |
| [P35-T5](../tasks/phase-35/p35-t5-diagnostics-bundle.md) | Export runtime diagnostics bundle for support |
| [P35-T6](../tasks/phase-35/p35-t6-resilience-test-harness.md) | Add simulated failure tests for runtime recovery |

## Dependencies

- Phase 25 release workflow and Phase 28 preview services should be stable.
- Existing supervisor, log manager, database, and runtime modules must expose enough state for health checks.
- Policy rules from Phase 29 must govern self-healing actions that affect files or commands.

## Exit Criteria

- Ralph shows runtime health and degraded-service states clearly.
- Stuck or stale runs are detected and can be reconciled.
- Safe recovery actions preserve project context and avoid silent destructive changes.
- Database integrity checks and backups protect local state during risky operations.
- Simulated failure tests prove at least three major recovery paths.
