# Phase 23 - Ralph-First Project Flow

## Functional Feature Outcome

Users can start from an app idea or existing folder and move through Ralph intake, blueprint review, project bootstrap, run start, artifact inspection, and delivery without dropping into the generic terminal workflow.

## Why This Phase Exists

Branding Ralph as the product only matters if the main workflow behaves like Ralph is the product. The existing console already contains many pieces: app intake, blueprint generation, bootstrapping, readiness checks, run cards, plan view, artifacts, safety alerts, history, and delivery. Those pieces need to be organized into a clear project flow with resilient states. This phase makes Ralph's end-to-end workflow the default operational path while leaving terminal access available for diagnostics and manual intervention.

## Scope

- Define a Ralph project lifecycle state model: no project selected, folder selected but not Ralph-enabled, Ralph-enabled but not ready, ready with no active run, active run, paused run, failed run, completed run awaiting delivery, delivered app, and maintenance-tracked app.
- Turn the current Ralph console into a guided workflow that selects the correct primary action for each lifecycle state.
- Make "Create app brief" and "Open existing Ralph project" the primary starting actions for new users.
- Support creating a new Ralph project from intake by choosing or creating a workspace folder, generating a blueprint, writing control files, scaffolding starter code, and validating readiness.
- Support converting an existing workspace by detecting freshness, reading existing Ralph files, repairing missing control files, and preserving operator-authored content.
- Improve blueprint review so generated specs, milestones, acceptance gates, target platforms, forbidden patterns, and delivery format are visible before files are written.
- Make run start a Ralph operation that creates or reuses a controlled Claude Code session behind the scenes.
- Ensure terminal tabs created for Ralph runs are labeled and linked to the Ralph run that owns them.
- Make the plan, timeline, artifacts, safety alerts, and delivery panel feel like one project dashboard instead of unrelated tabs.
- Add recovery paths for failed bootstrap, failed blueprint write, missing Claude Code, stale active run, missing workspace folder, malformed `.ralph` metadata, and failed validation gates.
- Add clear boundaries for manual terminal intervention: when it is allowed, how it is recorded, and how the user returns to the Ralph dashboard.
- Update tests to cover the lifecycle states and the primary no-terminal happy path.

## Tasks

| Task | Summary |
| --- | --- |
| [P23-T1](../tasks/phase-23/p23-t1-project-lifecycle-model.md) | Define and implement a Ralph project lifecycle state model that drives primary UI actions and recovery messaging. |
| [P23-T2](../tasks/phase-23/p23-t2-new-project-entry.md) | Build the "Create app brief" entry path, including workspace selection/creation and initial intake state. |
| [P23-T3](../tasks/phase-23/p23-t3-existing-project-entry.md) | Build the "Open existing Ralph project" and "Convert existing workspace" paths with readiness detection and repair actions. |
| [P23-T4](../tasks/phase-23/p23-t4-intake-blueprint-review.md) | Strengthen blueprint review so specs, milestones, gates, platform targets, stack preferences, and forbidden patterns are inspectable before approval. |
| [P23-T5](../tasks/phase-23/p23-t5-bootstrap-and-scaffold-flow.md) | Connect blueprint approval to file writing, workspace scaffolding, Ralph bootstrap, readiness validation, and rollback/error handling. |
| [P23-T6](../tasks/phase-23/p23-t6-run-start-flow.md) | Make "Start Ralph Run" launch the controlled Claude Code session, create run state, register runtime state, and keep the user in the Ralph dashboard. |
| [P23-T7](../tasks/phase-23/p23-t7-run-dashboard-composition.md) | Reorganize run card, phase timeline, plan, artifacts, alerts, history, and delivery into a cohesive project dashboard. |
| [P23-T8](../tasks/phase-23/p23-t8-terminal-linkage.md) | Label Ralph-owned terminal sessions with project/run metadata and provide navigation between terminal and Ralph dashboard. |
| [P23-T9](../tasks/phase-23/p23-t9-recovery-states.md) | Add user-facing recovery states for bootstrap failures, stale runs, malformed metadata, missing folders, failed validation, and missing dependencies. |
| [P23-T10](../tasks/phase-23/p23-t10-end-to-end-tests.md) | Add e2e coverage for new brief to ready project, existing workspace conversion, run start, artifact display, and delivery panel reachability. |

## Dependencies

- Phase 22 must make the Ralph console the default or primary shell destination.
- App intake, blueprint generation, workspace scaffolding, bootstrap, readiness validation, Ralph runtime, artifact listing, and delivery services must remain available through IPC.
- The product must have agreed lifecycle terminology from Phase 21.
- Test helpers must be able to create minimal, bootstrapped, and full scaffolded workspaces.
- Any file-writing path must preserve operator-authored `PROMPT.md`, `AGENT.md`, `fix_plan.md`, `specs/`, and `.ralph` content unless the user explicitly approves replacement or repair.

## Exit Criteria

- A first-time user can start with an app idea and reach a Ralph-ready workspace through intake, blueprint review, bootstrap, scaffold, and readiness validation.
- A user with an existing folder can convert or repair it into a Ralph-ready project without using the generic terminal workflow.
- "Start Ralph Run" launches and tracks the underlying Claude Code session while keeping the user in the Ralph dashboard.
- Plan, timeline, artifacts, alerts, run history, and delivery are reachable from a coherent project dashboard with one clear primary action per lifecycle state.
- Recovery states explain what failed, what data is preserved, and what action the operator can take next.
- E2E tests cover the no-terminal happy path plus at least one recovery path.
