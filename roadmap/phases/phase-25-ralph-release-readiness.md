# Phase 25 - Ralph Release Readiness

## Functional Feature Outcome

Ralph can ship as a coherent Ralph-focused desktop release with updated documentation, packaging, QA coverage, release notes, and regression checks proving the primary app-building workflow works end to end.

## Why This Phase Exists

Product repositioning, shell changes, workflow changes, and API compatibility work must converge into a release that users can trust. This phase closes the loop: it verifies the app behaves like Ralph from install through project creation, run supervision, artifact review, delivery, and recovery. It also updates release-facing documents so the product promise matches the shipped behavior.

## Scope

- Update packaging, release checklist, QA matrix, and operator guide so the release is described as Ralph-focused.
- Verify the primary happy path: launch app, satisfy Claude Code dependency, create app brief, review blueprint, bootstrap/scaffold workspace, start Ralph run, inspect artifacts, package delivery, and confirm release.
- Verify existing-project path: open a workspace with Ralph files, read readiness, resume or repair state, and start or inspect runs.
- Verify compatibility path: existing user data and `window.knuthflow` alias still work if compatibility is retained.
- Verify safety path: approval gates, stop/pause/resume, stale run handling, circuit breakers, and failed validation messaging remain intact.
- Verify delivery path: delivery manifest, release notes, handoff bundle, packaging status, and release confirmation work under Ralph branding.
- Verify portfolio and blueprint surfaces remain coherent under Ralph navigation and API names.
- Update screenshots or visual references if the repo includes or later adds release assets.
- Update changelog and release notes with breaking changes, compatibility aliases, data migration notes, and known limitations.
- Confirm installer/package names, app title, bundle id, update metadata, homepage links, and support docs are consistent with the final brand policy.
- Run lint, build/package, and e2e checks appropriate for the release environment.
- Document unresolved risks and create follow-up phases or tasks only for issues that do not block Ralph-focused release.

## Tasks

| Task | Summary |
| --- | --- |
| [P25-T1](../tasks/phase-25/p25-t1-qa-matrix-update.md) | Update QA documentation around Ralph-first workflows, compatibility checks, safety gates, delivery, portfolio, and blueprint coverage. |
| [P25-T2](../tasks/phase-25/p25-t2-release-checklist-update.md) | Update release checklist items for Ralph branding, package identity, dependency messaging, data compatibility, and primary workflow validation. |
| [P25-T3](../tasks/phase-25/p25-t3-operator-guide-update.md) | Rewrite operator guide sections around app brief, project lifecycle, run supervision, intervention, artifact review, delivery, and recovery. |
| [P25-T4](../tasks/phase-25/p25-t4-primary-e2e-happy-path.md) | Add or update an e2e happy path that proves the Ralph-first no-terminal workflow from intake through delivery reachability. |
| [P25-T5](../tasks/phase-25/p25-t5-existing-project-e2e.md) | Add or update e2e coverage for opening, repairing, and resuming an existing Ralph-enabled workspace. |
| [P25-T6](../tasks/phase-25/p25-t6-safety-and-recovery-e2e.md) | Add coverage for pause, resume, stop, stale run, failed validation, missing dependency, and failed bootstrap states. |
| [P25-T7](../tasks/phase-25/p25-t7-compatibility-verification.md) | Verify old local data, deprecated API alias, environment variable aliases, and package identity decisions behave as documented. |
| [P25-T8](../tasks/phase-25/p25-t8-packaging-verification.md) | Package the app for supported local targets and verify product name, installer names, metadata, and app launch behavior. |
| [P25-T9](../tasks/phase-25/p25-t9-changelog-and-release-notes.md) | Write release notes explaining the Ralph refocus, user-visible changes, compatibility policy, data migration behavior, and known limitations. |
| [P25-T10](../tasks/phase-25/p25-t10-final-regression-run.md) | Run lint/build/package/e2e checks, record results, and triage any remaining release blockers. |

## Dependencies

- Phase 21 must establish the Ralph product source of truth.
- Phase 22 must deliver Ralph-visible branding and shell changes.
- Phase 23 must deliver the Ralph-first project flow.
- Phase 24 must deliver API compatibility and data policy.
- Local packaging and test infrastructure must be functional enough to validate the desktop app.
- Release documentation must identify any platform-specific limitations for macOS, Windows, and Linux.

## Exit Criteria

- QA and release documents describe Ralph as the product and cover the primary Ralph app-building workflow.
- The main Ralph happy path is covered by automated e2e tests or a documented manual test procedure where automation is not feasible.
- Existing Ralph project, recovery, safety, delivery, portfolio, and blueprint flows pass regression checks under the Ralph-focused shell.
- Package metadata, app title, release notes, and operator documentation are consistent with the final brand/data compatibility decisions.
- Existing local data and deprecated compatibility surfaces behave exactly as documented.
- The release has a recorded test result set and a short list of known limitations that do not contradict the Ralph-focused product promise.
