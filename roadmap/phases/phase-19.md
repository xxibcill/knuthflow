# Phase 19 - Autonomous Post-Delivery Iteration

## Functional Feature Outcome

Delivered apps are monitored for regressions, and Ralph autonomously schedules iteration loops to fix discovered issues, publish updates, and maintain delivered apps without operator initiation.

## Why This Phase Exists

After Phase 18, a delivered app is static. Bugs discovered in production, new platform requirements, or changing dependencies require manual re-engagement. Ralph is designed for autonomous operation, so keeping delivered apps current should not require the operator to repeatedly kick off new runs. This phase adds a monitoring layer that detects issues and autonomously triggers targeted fix loops.

## Scope

- Add post-delivery monitoring service that watches delivered app health (build errors, lint regressions, test failures, dependency vulnerabilities)
- Implement autonomous iteration scheduling: when monitoring detects regressions, automatically create a new Ralph run targeting the specific regression
- Add version management: track delivered app versions, release notes, and update history
- Implement staged rollout support: deliver to internal/beta channels first, promote to stable after validation
- Add operator-configurable maintenance policies: auto-update dependencies on schedule, patch security vulnerabilities within 24 hours
- Surface maintenance runs in desktop UI with clear distinction from fresh app builds

## Tasks

| Task | Summary |
| --- | --- |
| [P19-T1](../tasks/phase-19/p19-t1-monitoring-service.md) | Build post-delivery monitoring service for regression detection |
| [P19-T2](../tasks/phase-19/p19-t2-autonomous-scheduling.md) | Implement autonomous iteration scheduling when regressions detected |
| [P19-T3](../tasks/phase-19/p19-t3-version-management.md) | Add version management, release notes, and update history tracking |
| [P19-T4](../tasks/phase-19/p19-t4-staged-rollout.md) | Implement staged rollout support (internal → beta → stable) |
| [P19-T5](../tasks/phase-19/p19-t5-maintenance-ui.md) | Add maintenance run surfacing in desktop UI |

## Dependencies

- Phase 18 (Cross-Platform Packaging Engine) should be complete for multi-platform monitoring

## Exit Criteria

- [Observable outcome 1] Monitoring service detects regressions and creates targeted fix runs automatically
- [Observable outcome 2] Version history shows all delivered releases with change summaries
- [Observable outcome 3] Staged rollout distributes to internal channel before stable promotion
- [Observable outcome 4] Maintenance runs are visually distinguished from fresh builds in the UI