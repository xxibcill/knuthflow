# Phase 27 - Operator Onboarding and Guided First Run

## Functional Feature Outcome

New operators can launch Ralph, understand the product, satisfy local dependencies, create a first app brief, bootstrap a workspace, and start a guided first run without reading external documentation.

## Why This Phase Exists

Phase 25 ships a coherent Ralph-focused release, but a coherent product is not automatically easy for a new operator to adopt. Ralph has several necessary concepts: local Claude Code dependency, app brief, blueprint, workspace, control files, readiness, run supervision, artifacts, safety gates, and delivery. Without a guided path, first-time users may still treat Ralph as a terminal wrapper or become blocked before their first successful build. This phase turns the release-ready product into an approachable first-run experience.

## Scope

- Add first-launch detection that shows guided Ralph onboarding only when the operator has not completed a first successful project setup.
- Build a dependency readiness checklist for Claude Code, workspace permissions, local storage, git availability, and packaging prerequisites.
- Add a guided "first app" path with safe sample app brief templates.
- Provide lightweight explanations for Ralph concepts through contextual UI, not long instructional walls.
- Add progressive disclosure for advanced choices such as platform targets, stack preferences, forbidden patterns, and delivery format.
- Add onboarding recovery steps for missing Claude Code, invalid workspace path, blocked file permissions, failed bootstrap, and failed readiness validation.
- Record onboarding completion locally so returning users land directly in the Ralph dashboard.
- Add an option to replay onboarding from settings or help.
- Add onboarding-specific tests for dependency checklist, sample brief, workspace selection, and transition into normal Ralph dashboard.

## Tasks

| Task | Summary |
| --- | --- |
| [P27-T1](../tasks/phase-27/p27-t1-first-launch-state.md) | Add local first-launch and onboarding completion state |
| [P27-T2](../tasks/phase-27/p27-t2-dependency-checklist.md) | Build dependency readiness checklist for local Ralph execution |
| [P27-T3](../tasks/phase-27/p27-t3-guided-sample-brief.md) | Add guided first app brief templates and progressive intake defaults |
| [P27-T4](../tasks/phase-27/p27-t4-onboarding-recovery.md) | Add onboarding recovery states for missing dependencies and workspace problems |
| [P27-T5](../tasks/phase-27/p27-t5-replay-onboarding.md) | Add settings/help action to replay onboarding |
| [P27-T6](../tasks/phase-27/p27-t6-onboarding-tests.md) | Add e2e coverage for first launch through first ready project |

## Dependencies

- Phase 25 must establish the Ralph-focused app shell, release docs, and primary workflow.
- Claude Code detection and workspace validation APIs must be available.
- The Ralph project flow from Phase 23 must be stable enough to drive from onboarding.
- Onboarding copy must use Phase 21 terminology.

## Exit Criteria

- A new operator can reach a Ralph-ready first workspace from first launch without external docs.
- Missing local dependencies are detected and explained with actionable recovery steps.
- Onboarding completion is persisted locally and can be replayed.
- The guided path transitions cleanly into the normal Ralph dashboard.
- Automated or manual QA covers first launch, dependency failure, successful sample brief, and onboarding replay.
