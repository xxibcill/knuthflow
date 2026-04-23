# Roadmap

This roadmap turns the current PRD direction into an execution plan for Ralph: a local operator desktop for app intake, Ralph-managed build loops, validation evidence, delivery artifacts, portfolio orchestration, and reusable blueprints.

Current product bias:

- Ralph-first app building and operator supervision
- PTY-backed Claude Code execution as the local runtime Ralph controls
- Terminal, editor, workspaces, settings, and history as supporting operator tools
- Explicit approval gates, evidence, delivery, portfolio coordination, and blueprint reuse over unmanaged autonomy

## Phase Overview

| Phase | Focus | Functional Feature Outcome |
| --- | --- | --- |
| [Phase 01](./phases/phase-01-foundation-and-desktop-shell.md) | Foundation | App boots securely, renderer and main process are separated, and Claude Code installation can be detected |
| [Phase 02](./phases/phase-02-terminal-runtime.md) | Terminal Runtime | Users can run Claude Code in a real PTY-backed terminal inside the app |
| [Phase 03](./phases/phase-03-workspaces-and-sessions.md) | Workspaces and Sessions | Users can manage workspaces, track sessions, and switch terminal tabs cleanly |
| [Phase 04](./phases/phase-04-settings-and-local-state.md) | Settings and Local State | Users can configure the wrapper through GUI settings, profiles, logs, and secure local state |
| [Phase 05](./phases/phase-05-reliability-and-distribution.md) | Reliability and Distribution | The app is resilient enough to package, update, recover, and ship |
| [Phase 06](./phases/phase-06-ide-expansion-optional.md) | IDE Expansion Optional | The app adds editor, diff, and richer side-panel workflows without replacing the terminal core |
| [Phase 07](./phases/phase-07-ralph-project-bootstrap.md) | Ralph Project Bootstrap | Users can turn a workspace into a Ralph-ready project with control files, persistent loop state, and readiness checks |
| [Phase 08](./phases/phase-08-ralph-scheduler-and-safety.md) | Ralph Scheduler and Safety | Users can run a one-item-at-a-time Ralph loop with session continuity, rate limits, and circuit breakers |
| [Phase 09](./phases/phase-09-evidence-and-plan-repair.md) | Evidence and Plan Repair | Ralph can search the codebase, validate changes, analyze artifacts, and regenerate the fix plan from evidence |
| [Phase 10](./phases/phase-10-operator-console.md) | Operator Console | Users can monitor Ralph runs, inspect backlog and artifacts, and intervene safely from the desktop UI |
| [Phase 11](./phases/phase-11-recovery-and-release-readiness.md) | Recovery and Release Readiness | Autonomous runs can checkpoint, recover, and ship with test harnesses and operator documentation |
| [Phase 12](./phases/phase-12-ralph-flow-upgrade.md) | Ralph Flow Upgrade | Ralph mode becomes a coherent end-to-end loop with deterministic control files, stable plan semantics, and implemented operator actions |
| [Phase 13](./phases/phase-13-goal-to-app-bootstrap.md) | Goal To App Bootstrap | Users can turn an app idea into a scaffolded Ralph-ready workspace with generated specs, starter structure, and an approved initial plan |
| [Phase 14](./phases/phase-14-long-horizon-app-builder.md) | Long-Horizon App Builder | Ralph can build a larger application across milestones with resumable context, preview feedback, and milestone-aware replanning |
| [Phase 15](./phases/phase-15-desktop-one-shot-delivery.md) | Desktop One-Shot Delivery | Users can request an app from Ralph, review it in the desktop UI, and receive packaged delivery artifacts with explicit approval gates |
| [Phase 16](./phases/phase-16.md) | Multi-App Portfolio Orchestrator | Ralph manages a pipeline of multiple concurrent app builds with portfolio goals, priorities, and cross-project visibility |
| [Phase 17](./phases/phase-17.md) | Learning Feedback Loop | Ralph learns from delivered apps and applies pattern-based improvements to future builds |
| [Phase 18](./phases/phase-18.md) | Cross-Platform Packaging Engine | Users can target mobile, web, and desktop platforms from the same app build with unified validation and packaging |
| [Phase 19](./phases/phase-19.md) | Autonomous Post-Delivery Iteration | Ralph can safely plan and execute post-delivery improvements with operator visibility and approval gates |
| [Phase 20](./phases/phase-20.md) | Skill Library and Blueprint System | Operators can author, share, and reuse app blueprints so common app types are built from curated patterns |
| [Phase 21](./phases/phase-21-ralph-product-source-of-truth.md) | Ralph Product Source of Truth | Ralph has a clear product definition, requirements baseline, and public-facing story as an operator desktop |
| [Phase 22](./phases/phase-22-ralph-brand-and-shell.md) | Ralph Brand and Shell | The installed app, title, about screen, navigation, and first screen present Ralph as the primary product |
| [Phase 23](./phases/phase-23-ralph-first-project-flow.md) | Ralph-First Project Flow | Users can move from app idea or existing folder through intake, bootstrap, run supervision, artifacts, and delivery without dropping into generic terminal flow |
| [Phase 24](./phases/phase-24-ralph-api-compatibility-and-data.md) | Ralph API Compatibility and Data | New code can use Ralph-named APIs while existing Knuthflow integrations, local data, and projects continue to work |
| [Phase 25](./phases/phase-25-ralph-release-readiness.md) | Ralph Release Readiness | Ralph can ship as a coherent Ralph-focused desktop release with docs, packaging, QA, release notes, and regression checks |
| [Phase 26](./phases/phase-26-post-release-stability-and-iteration-foundation.md) | Post-Release Stability and Iteration Foundation | Ralph ships as a stable desktop release with health monitoring foundations, operator feedback channels, delivered app tracking, and an iteration backlog that lets Ralph learn from completed work |
| [Phase 27](./phases/phase-27-operator-onboarding-guided-first-run.md) | Operator Onboarding and Guided First Run | New operators can complete a guided first Ralph setup, dependency check, app brief, bootstrap, and first run |
| [Phase 28](./phases/phase-28-preview-evidence-visual-validation.md) | Preview Evidence and Visual Validation | Ralph can launch previews, capture screenshots, detect visible regressions, and attach visual evidence to run and delivery review |
| [Phase 29](./phases/phase-29-policy-permissions-change-governance.md) | Policy, Permissions, and Change Governance | Operators can define what Ralph may change, what requires approval, and how workspace changes are governed |
| [Phase 30](./phases/phase-30-tool-connector-hub.md) | Tool Connector Hub | Operators can connect Ralph to approved local and remote tools through scoped, governed connectors |
| [Phase 31](./phases/phase-31-run-analytics-forecasting.md) | Run Analytics and Forecasting | Ralph shows historical run analytics, bottlenecks, and effort/risk forecasts for new work |
| [Phase 32](./phases/phase-32-collaboration-review-handoff.md) | Collaboration and Review Handoff | Ralph can package run context, evidence, diffs, decisions, and artifacts into shareable review bundles |
| [Phase 33](./phases/phase-33-extension-sdk-automation-hooks.md) | Extension SDK and Automation Hooks | Developers can extend Ralph with governed local extensions for blueprints, validators, analyzers, delivery targets, connectors, and hooks |
| [Phase 34](./phases/phase-34-enterprise-workspace-governance.md) | Enterprise Workspace Governance | Teams can standardize Ralph usage with shared policies, approved blueprints, audit records, and environment checks |
| [Phase 35](./phases/phase-35-runtime-resilience-self-healing.md) | Runtime Resilience and Self-Healing | Ralph can detect runtime degradation, recover stuck services, preserve run state, and guide safe recovery |
| [Phase 36](./phases/phase-36-optional-sync-fleet-operations.md) | Optional Sync and Fleet Operations | Operators can optionally sync Ralph configuration, governance, blueprints, reviews, and summaries across machines or teams |

## Sequencing Logic

1. Build the Electron shell and security boundary first.
2. Make Claude Code execution reliable through `node-pty` and `xterm.js`.
3. Add workspace and session ergonomics after the runtime is stable.
4. Layer settings, persistence, diagnostics, and secure storage next.
5. Harden packaging, updater, and recovery before wider release.
6. Treat Phase 06 as optional; richer editor and diff surfaces should not block autonomous loop work.
7. Bootstrap the Ralph control stack and persisted workspace state after the wrapper runtime is stable.
8. Add the autonomous scheduler, session continuity, and safety gates next.
9. Layer search, validation backpressure, artifact analysis, and plan repair on top of the scheduler.
10. Expose operator-facing controls and observability once the loop can make grounded decisions.
11. Finish with checkpointing, crash recovery, dry-run testing, and release documentation for autonomous mode.
12. Consolidate the accumulated Ralph modules into a single real loop flow before scaling autonomous usage further.
13. Add a goal-intake and workspace-bootstrap layer so Ralph can start from an app brief instead of requiring a pre-authored repository setup.
14. Extend the upgraded Ralph loop into a milestone-aware app builder that can stay coherent across long-running product work.
15. Finish with desktop review, packaging, and end-to-end delivery so the product can honestly support a one-shot app workflow for supported targets.
16. Add portfolio orchestration once a single Ralph app build can be delivered reliably.
17. Feed completed-run evidence and delivery outcomes back into future Ralph prompts and operator-visible lessons.
18. Add cross-platform packaging once one-shot desktop delivery is reliable.
19. Allow post-delivery iteration only after maintenance signals, safety gates, and approval boundaries are in place.
20. Capture repeated successful patterns as reusable blueprints so app creation improves over time.
21. Re-establish the product source of truth around Ralph so future shell, API, and release work has one consistent target.
22. Update the app shell and visible brand after the product definition is agreed, keeping lower-level runtime tools available but secondary.
23. Make the Ralph project lifecycle the primary interaction model, from brief to bootstrap to run to delivery.
24. Add Ralph-named API and data compatibility layers before broad internal renames, preserving existing user data and tests.
25. Run the release-readiness pass only after product story, shell behavior, workflow, API compatibility, and data policy are aligned.
26. Instrument health monitoring, feedback channels, and iteration backlog after first release to close the learning loop.
27. Add guided onboarding after the first stable release so new operators can reach first value without reading the docs.
28. Add preview and visual validation once the primary Ralph build and delivery flow is stable.
29. Centralize policy and permissions before adding more external tools, extensions, and team governance.
30. Add connectors after policy boundaries exist so external integrations are scoped and auditable.
31. Turn accumulated run history into analytics and forecasts after enough run, delivery, and learning data is captured.
32. Add collaboration handoff after evidence, visual validation, and delivery artifacts are rich enough to review outside the live app.
33. Add an extension SDK only after core connector, policy, blueprint, validation, and delivery boundaries are stable.
34. Add team governance once policy, blueprints, extensions, and audit records are mature enough to standardize.
35. Harden runtime self-healing after preview services, connectors, policies, and longer-running workflows create more recovery needs.
36. Add optional sync and fleet operations last, after data classification, governance, review bundles, extensions, and resilience are established.

## Creating a New Phase

### 1. Create the Phase Document

Copy `phases/PHASE-TEMPLATE.md` to `phases/phase-XX-[slug].md` and fill in:

- **Phase number and name** — Sequential number based on current phases
- **Functional Feature Outcome** — One sentence describing user value
- **Why This Phase Exists** — Motivation paragraph
- **Scope** — Bullet list of major areas
- **Tasks** — Table linking to task documents
- **Dependencies** — Prerequisites for starting
- **Exit Criteria** — Observable outcomes that mark completion

### 2. Create Task Documents

For each task in the phase:

1. Create `tasks/phase-XX/pX-tX-[slug].md` from the template
2. Fill in the task details
3. Update the phase document's task table

### 3. Update Roadmap README

Add the new phase to the Phase Overview table and Sequencing Logic if needed.

## Task Structure

Each phase has:

- One phase document with scope, dependencies, and exit criteria
- Multiple task documents with focused deliverables and acceptance criteria

Task naming convention:

- `P1-T1` means Phase 01, Task 01
- `P4-T3` means Phase 04, Task 03

## Phase and Task Templates

### Phase Template

```markdown
# Phase XX - [Phase Name]

## Functional Feature Outcome

[One sentence describing what the user gets when this phase is complete]

## Why This Phase Exists

[One paragraph explaining the motivation and why this phase matters to the product]

## Scope

- [Bullet point]
- [Bullet point]

## Tasks

| Task | Summary |
| --- | --- |
| [PX-T1](../tasks/phase-XX/pX-t1-[task-slug].md) | [Task summary] |
| [PX-T2](../tasks/phase-XX/pX-t2-[task-slug].md) | [Task summary] |
| [PX-T3](../tasks/phase-XX/pX-t3-[task-slug].md) | [Task summary] |

## Dependencies

- [What must be true before this phase starts]
- [Any external requirements]

## Exit Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- [Observable outcome 3]
```

### Task Template

```markdown
# PX-TX - [Task Title]

## Phase

[Phase Name](../phases/phase-XX-name.md)

## Objective

[One sentence describing the deliverable]

## Deliverables

- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

## Dependencies

- [What must exist or be completed first]
- [Any external constraints]

## Acceptance Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- [Observable outcome 3]
```
