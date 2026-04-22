# Ralph Evergreen PRD

## Document Status

| Field | Value |
| --- | --- |
| Product | Ralph |
| Document Type | Evergreen Product Requirements Document |
| Status | Active |
| Owner | `[name / team]` |
| Contributors | `[names / functions]` |
| Last Updated | `2026-04-22` |
| Source of Truth | `PRD.md` |

## How To Use This Document

This file is the living product and delivery specification for Knuthflow. It should answer four questions:

1. What problem are we solving?
2. For whom are we solving it?
3. What must the product do now?
4. What decisions have already been made?

Rules for maintaining this document:

- Update this file when priorities, scope, requirements, or decisions change.
- Prefer editing the current truth over creating parallel planning documents.
- Mark unknowns explicitly rather than implying certainty.
- Keep implementation details lightweight unless they materially affect product scope, risk, or sequencing.
- Append major tradeoffs to the decision log instead of burying them in prose.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Users and Jobs To Be Done](#3-users-and-jobs-to-be-done)
4. [Product Principles](#4-product-principles)
5. [Goals and Non-Goals](#5-goals-and-non-goals)
6. [Scope](#6-scope)
7. [Requirements](#7-requirements)
8. [User Experience Notes](#8-user-experience-notes)
9. [Success Metrics](#9-success-metrics)
10. [Delivery Plan](#10-delivery-plan)
11. [Technical Notes](#11-technical-notes)
12. [Risks and Dependencies](#12-risks-and-dependencies)
13. [Acceptance and Testing](#13-acceptance-and-testing)
14. [Operating Model](#14-operating-model)
15. [Decision Log](#15-decision-log)
16. [Open Questions](#16-open-questions)
17. [Glossary](#17-glossary)

---

## 1. Overview

### 1.1 Purpose

Ralph is a local operator desktop for app intake, Ralph-managed build loops, validation evidence, delivery artifacts, portfolio orchestration, and reusable blueprints.

Use this section to keep the top-level product story stable:

- **One-line description:** Ralph is a desktop operator console that turns app ideas into validated, delivered software through controlled autonomous build loops.
- **Target outcome:** Operators can supervise app creation from brief through delivery without managing the underlying CLI, terminal, or build tooling manually.
- **Primary domain:** Local autonomous app building and operator supervision.
- **Current phase:** `MVP — desktop operator console with Ralph-managed build loops, evidence capture, and delivery artifacts`

### 1.2 Product Summary

Ralph is a desktop operator console that controls the local Claude Code CLI to build apps autonomously one milestone at a time. It gives operators visibility into what Ralph is doing, why, and what happens next.

- Users need a reliable way to turn an app idea into a working delivered artifact without babysitting the build process.
- Existing workflows break down because manual terminal work, undocumented CLI state, and lack of visibility cause builds to go stale, lose context, or ship without validation.
- Ralph improves this by running one-item-at-a-time autonomous loops with explicit operator approval gates, captured evidence, and delivery-ready artifacts.

### 1.3 Document Scope

This PRD covers:

- Product intent
- User needs
- Ralph-specific functional requirements
- Non-functional expectations for a Ralph-focused desktop release
- Delivery sequencing
- Risks, constraints, and decisions

This PRD does not need to duplicate:

- Sprint checklists
- Detailed task breakdowns
- Low-level technical design unless it affects product behavior

---

## 2. Problem Statement

### 2.1 Background

Operators and developers who want to build an application today must manage the full terminal workflow by hand: set up the project, configure Claude Code, run it, monitor output, retry on failures, validate results, and package the output. This requires constant attention even when the work is repetitive or well-understood.

> Teams or users currently rely on `manual CLI orchestration, undocumented session state, and ad-hoc validation`, which leads to `stale runs, lost context, unvalidated deliverables, and operator fatigue from continuous supervision`.

### 2.2 Core Problems

| Problem | Who Feels It | Evidence | Business Impact |
| --- | --- | --- | --- |
| Operators spend too much time supervising individual build steps | Developers using Claude Code for app builds | Repeated manual intervention in long-horizon builds | Time lost; context switching interrupts flow |
| Build evidence is not captured or reviewable | Teams that need to audit or approve deliverables | No artifact evidence in session history | Delivery approval becomes guesswork |
| Autonomous runs go stale with no recovery path | Operators running Ralph loops across many milestones | Stale run state with no clear repair action | Abandoned workspaces; lost progress |
| Delivery artifacts are not organized or guaranteed complete | Product owners receiving app output | Inconsistent handoff; missing release notes or artifacts | Delayed or rejected releases |
| No visibility into Ralph's current plan and milestone state | Operators supervising autonomous work | Unclear what Ralph is doing and why | Low trust in autonomous output |

### 2.3 Opportunity

Summarize the upside if Ralph succeeds.

- **User impact:** `operators save time supervising repetitive builds; teams get reviewable evidence and consistent delivery artifacts`
- **Business impact:** `faster delivery of validated apps; reduced operator fatigue; reusable blueprints reduce future build cost`
- **Strategic reason now:** `Ralph is the intended operator layer for the desktop wrapper; it needs a clear product story before Phase 22 branding and Phase 25 release readiness`

---

## 3. Users and Jobs To Be Done

### 3.1 Primary Users

| User Type | Context | Primary Need | Frequency |
| --- | --- | --- | --- |
| App Developer | Using Ralph to build a personal or team app | Turn an idea into a delivered artifact without babysitting the build | Weekly or project-based |
| Solo Operator | Running Ralph on a local machine | Supervise autonomous build loops with full visibility and approval control | Daily during active runs |
| Technical Product Owner | Reviewing Ralph output for approval | Inspect evidence, validate delivery artifacts, and approve or reject handoff | At milestone completion and delivery |

### 3.2 Secondary Users

- **Developer reviewing output** — May inspect Ralph's plan, artifacts, or logs to understand what changed and why.
- **Maintainer handling post-delivery work** — Receives delivered apps and may need to understand Ralph's artifact bundle and release notes.
- **Contributor setting up or debugging Ralph** — Needs to understand Ralph's bootstrap files, runtime state, and safety gates.

### 3.3 Jobs To Be Done

Use outcome-oriented phrasing.

- When I have an app idea, I want to describe it as a brief so Ralph can turn it into a structured project, so I don't have to manually set up the workspace.
- When I review a blueprint, I want to see the planned milestones and expected artifacts, so I can approve or adjust the direction before work starts.
- When I supervise a run, I want to see Ralph's current plan, active milestone, and validation evidence in real time, so I can trust what is happening in my workspace.
- When something goes wrong, I want clear recovery guidance and a repair plan, so I can resume or restart without losing all context.
- When Ralph completes a milestone, I want to inspect the evidence and decide whether to continue, so I can catch problems before more work is done.
- When an app is ready, I want a complete handoff bundle with release notes and artifacts, so I can deliver with confidence.
- When an app needs maintenance, I want Ralph to surface health signals and suggest follow-up work, so I can keep delivered apps healthy.

### 3.4 User Constraints

List conditions that materially shape the product.

- **Trust requirement:** Operators need to understand what Ralph is doing in their workspace before it makes changes. Ralph must surface its plan, not just execute silently.
- **Local machine dependency:** Ralph runs entirely on the operator's machine. No cloud telemetry is required or expected for core functionality.
- **Interruptibility:** Long-running autonomous work must be pausable, resumable, and recoverable. Operators may need to stop a run mid-loop.
- **Approval gates:** Certain operations — destructive actions, workspace changes, delivery handoff — require explicit operator confirmation before Ralph proceeds.
- **Visible evidence:** Operators need to see validation results, artifact lists, and milestone status before approving delivery.

---

## 4. Product Principles

These principles should remain stable unless the product strategy changes.

1. **Ralph's autonomy is operator-supervised, not operator-absent.**
   The operator is always in control. Ralph executes autonomously between approval gates, but never skips visibility or confirmation for high-impact actions.
2. **Evidence over trust.**
   Operators should be able to verify what Ralph did, not just trust that it did it. Every milestone produces reviewable evidence.
3. **One milestone at a time.**
   Ralph runs one build item per loop iteration. This keeps plans understandable and recovery straightforward.
4. **Recovery is always possible.**
   Stale runs, interrupted loops, and failed milestones have a documented repair path. Operators should never be stuck with an abandoned workspace.
5. **Delivery is a first-class outcome.**
   An app is not done until it is packaged, documented, and handed off with release notes. Ralph tracks this as a workflow, not an afterthought.
6. **Keep the spec honest.**
   Unknowns, tradeoffs, and limitations belong in this document.

---

## 5. Goals and Non-Goals

### 5.1 Product Goals

| Goal | Description | Priority |
| --- | --- | --- |
| Ralph-first product identity | Ralph is the primary product surface; the desktop shell and PTY runtime are supporting infrastructure | High |
| App intake and workspace bootstrap | Operators can describe an app idea, have Ralph bootstrap a project, and validate readiness before a run starts | High |
| Controlled run execution | Ralph runs one-item-at-a-time loops with visible plan, milestone status, and stop/pause/resume control | High |
| Evidence capture and plan visibility | Every milestone produces validation evidence and a reviewable plan; operators can inspect what Ralph did and why | High |
| Delivery artifacts and handoff | Completed apps are packaged with release notes and a complete handoff bundle; operators approve delivery | High |
| Recovery and repair | Stale runs, interrupted loops, and failed milestones have a documented repair path so no workspace is permanently abandoned | High |
| Portfolio coordination | Later phases: operators can manage multiple app builds with portfolio-level priorities and cross-project visibility | Medium |
| Blueprint reuse | Later phases: operators can author, share, and reuse app blueprints so common app types build from curated patterns | Medium |
| Learning feedback | Later phases: Ralph learns from delivered apps and applies pattern-based improvements to future builds | Medium |
| Post-delivery maintenance tracking | Later phases: Ralph tracks delivered apps after handoff and surfaces follow-up work from health, regression, or feedback signals | Medium |

### 5.2 Non-Goals

Use this section aggressively to prevent scope drift.

- Ralph will not replace the Claude Code CLI or reimplement its agent behavior. Ralph controls and observes the CLI, it does not duplicate it.
- Ralph will not act as a general IDE or code editor. Editor, diff, and file browsing are operator support tools, not primary Ralph workflows.
- Ralph will not run cloud orchestration or multi-machine distributed builds. All execution is local to the operator's machine.
- Ralph will not run fully autonomous loops without operator visibility or approval gates for high-impact actions.
- Ralph will not attempt to build apps that require credentials, secrets, or infrastructure it does not have explicit operator approval to access.
- Ralph will not optimize for non-local use cases that require cloud telemetry, shared state, or remote operator oversight in the current phase.

---

## 6. Scope

### 6.1 In Scope Now

List the committed capabilities for the current planning horizon.

- Ralph product definition, requirements baseline, and public-facing story (Phase 21)
- Ralph brand and desktop shell presentation (Phase 22)
- Ralph-first project flow: app brief, blueprint review, workspace bootstrap, run supervision, evidence, delivery (Phase 23)
- Ralph API compatibility and data continuity with existing workspace and session data (Phase 24)
- Ralph release readiness: docs, packaging, QA, release notes, regression checks (Phase 25)
- PTY-backed terminal runtime as the local execution engine Ralph controls
- Workspace and session management as Ralph project contexts
- Settings, logs, and secure local state for Ralph projects
- Safety gates, approval boundaries, and recovery paths for autonomous runs

### 6.2 Later / Deferred

- Portfolio orchestration across multiple concurrent app builds
- Learning feedback from delivered apps to future Ralph prompts
- Post-delivery maintenance tracking and follow-up identification
- Blueprint authoring, sharing, and reuse
- Autonomous post-delivery iteration with safety gates

### 6.3 Out of Scope

- Cloud orchestration, multi-machine distributed builds, or remote operator oversight
- General-purpose IDE features that exceed operator support tool scope
- Claude Code CLI replacement or duplication of agent behavior
- Non-local execution or cloud telemetry requirements

---

## 7. Requirements

Use stable IDs so requirements can be referenced in issues, designs, and decisions.

### 7.1 Functional Requirements

#### App Intake and Workspace Bootstrap

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-001 | Ralph must let an operator create a new Ralph project from a workspace, generating PROMPT.md, AGENT.md, fix_plan.md, specs/, and .ralph/ metadata. | Must | Bootstrap includes file existence checks and malformed metadata detection. |
| FR-002 | Ralph must validate workspace readiness before a run starts: missing bootstrap files, malformed metadata, and stale run state must be reported with recovery guidance. | Must | Validation failure blocks run start and surfaces specific repair action. |
| FR-003 | Ralph must support resuming a project from saved loop state, including resume token, milestone position, and plan context. | Must | Resume requires successful readiness validation before re-entry. |
| FR-004 | Ralph should let an operator import an existing folder as a Ralph project and bootstrap it if it lacks control files. | Should | Import should warn if the folder already has partial Ralph state. |
| FR-005 | Ralph could support blueprint-based project creation where a reusable template provides starter files, default milestones, and expected artifacts. | Could | Depends on Phase 20 blueprint system. |

#### Blueprint and Plan Management

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-006 | Ralph must generate a blueprint from an app brief, producing a plan with milestones, expected artifacts, and delivery criteria. | Must | The blueprint is operator-reviewable before a run starts. |
| FR-007 | Ralph must display the current plan and allow the operator to inspect milestone definitions and artifact expectations. | Must | Plan visibility is available at all times during a run. |
| FR-008 | Ralph must allow the operator to approve, modify, or reject the blueprint before autonomous work begins. | Must | Approval gate prevents work until the plan is accepted. |
| FR-009 | Ralph should regenerate the plan if the operator changes milestone scope or adds/removes items. | Should | Regeneration preserves approved milestone order unless operator requests reordering. |
| FR-010 | Ralph could support blueprint reuse so operators can start new projects from previously approved templates. | Could | Depends on Phase 20 blueprint system. |

#### Run Execution and Control

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-011 | Ralph must run one item at a time per loop iteration, executing one milestone plan and reporting completion or failure. | Must | Single-item execution is the primary safety mechanism. |
| FR-012 | Ralph must surface current plan and milestone status in real time through the operator console. | Must | Status includes active milestone, iteration count, validation result, and next expected action. |
| FR-013 | Ralph must let the operator pause an active run without losing loop state or plan context. | Must | Paused runs are recoverable; pause does not terminate the PTY session. |
| FR-014 | Ralph must let the operator resume a paused run from the exact paused state. | Must | Resume requires successful readiness validation. |
| FR-015 | Ralph must let the operator stop an active run cleanly, preserving evidence and artifact state up to the stop point. | Must | Stop is not the same as kill; evidence gathered before stop is preserved. |
| FR-016 | Ralph must detect stale runs — runs where progress has not advanced for a configured interval — and surface recovery guidance to the operator. | Must | Stale detection applies to both active and paused runs. |
| FR-017 | Ralph should enforce a maximum iteration count per milestone and per run, stopping cleanly if the limit is reached. | Should | Limit is configurable per project; safety limit prevents runaway loops. |
| FR-018 | Ralph should block execution of destructive operations — dropping files, modifying outside workspace, running external scripts — without explicit operator approval. | Should | Approval is per-operation; blocked operations surface with explanation. |

#### Evidence and Artifacts

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-019 | Ralph must capture validation evidence for each milestone: build output, test results, lint results, and any operator-configured checks. | Must | Evidence is stored locally and viewable from the operator console. |
| FR-020 | Ralph must expose a milestone artifact manifest listing files produced, modified, or deleted during the milestone. | Must | Manifest is reviewable at milestone completion. |
| FR-021 | Ralph must store evidence and artifacts in the project workspace with a consistent location pattern under .ralph/artifacts/. | Must | Path structure: `.ralph/artifacts/<milestone-id>/`. |
| FR-022 | Ralph should let the operator inspect and download the full evidence bundle for any completed milestone. | Should | Bundle includes evidence metadata and a summary of checks run. |

#### Delivery and Handoff

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-023 | Ralph must package a completed app as a delivery bundle containing the built application, artifact manifest, evidence summary, and release notes. | Must | Bundle format is local archive (zip/tar) stored in a configurable output location. |
| FR-024 | Ralph must generate release notes for a delivery bundle automatically from milestone summaries and operator input. | Must | Release notes include milestone completion list, artifact inventory, and known issues. |
| FR-025 | Ralph must present the delivery bundle to the operator for explicit approval before final handoff. | Must | Approval gate; bundle is not marked delivered without operator confirmation. |
| FR-026 | Ralph must record a delivery manifest in the project database recording what was delivered, when, and to where. | Must | Manifest enables post-delivery audit and maintenance tracking. |
| FR-027 | Ralph could generate a delivery checklist from the blueprint so the operator knows what was promised vs. what was delivered. | Could | Checklist supports approval review and identifies gaps. |

#### Portfolio and Learning (Future)

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-028 | Ralph could coordinate multiple concurrent app builds with portfolio-level priorities and cross-project visibility. | Could | Depends on Phase 16 portfolio orchestrator. |
| FR-029 | Ralph could learn from delivered apps and apply pattern-based improvements to future blueprints and milestone definitions. | Could | Depends on Phase 17 learning feedback loop. |
| FR-030 | Ralph could track delivered apps after handoff and surface maintenance signals: health check failures, regression indicators, or operator-reported issues. | Could | Depends on Phase 18 maintenance and monitoring. |

### 7.2 Non-Functional Requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-001 | Reliability — Database Integrity | SQLite workspace/session/Ralph state must not corrupt on unexpected app exit; automatic recovery from partial writes via WAL checkpointing |
| NFR-002 | Reliability — Long-Running Runs | A run that runs for hours without operator interaction must maintain loop state, plan context, and artifact collection; no state loss on UI temporarily hidden |
| NFR-003 | Reliability — Resume/Recovery | A project interrupted by crash, kill, or system sleep must resume with all milestone progress intact; resume validation must detect and report any state inconsistency |
| NFR-004 | Reliability — Crash Handling | App crash must not orphan a PTY session; supervisor must clean up orphaned sessions on next launch |
| NFR-005 | Safety — Explicit Operator Approval | Destructive operations, workspace modifications outside approved paths, and delivery handoff require operator confirmation; no silent execution of high-impact actions |
| NFR-006 | Safety — Workspace Boundaries | Ralph must not modify files outside the active workspace path without explicit per-operation approval |
| NFR-007 | Safety — Command Execution | Ralph must surface what terminal commands it will execute and require approval for commands flagged as destructive |
| NFR-008 | Safety — Stale Run Detection | Stale runs detected within 5 minutes of no progress; detection uses a deterministic check interval configurable per project |
| NFR-009 | Performance — App Startup | First launch completes startup checks and presents workspace picker within 10 seconds on standard hardware |
| NFR-010 | Performance — Readiness Checks | Readiness validation (bootstrap files, metadata, run state) completes within 2 seconds for typical projects |
| NFR-011 | Performance — Run Dashboard Refresh | Operator console run dashboard refreshes active status within 1 second of a milestone event |
| NFR-012 | Performance — Artifact Loading | Evidence and artifact manifest load within 2 seconds for projects with up to 50 milestones |
| NFR-013 | Performance — Large Project Handling | Projects with 100+ milestones must remain navigable; artifact loading may take longer but UI must remain responsive |
| NFR-014 | Privacy — Local Data Only | All workspace data, Ralph state, logs, and artifacts remain on the operator's machine; no telemetry or cloud sync required or expected |
| NFR-015 | Privacy — Secrets | Secrets use macOS Keychain when available; encrypted file fallback on other platforms; no plaintext secrets in SQLite |
| NFR-016 | Usability — First-Run Success | New operators can bootstrap a workspace and start a supervised run without reading implementation docs |
| NFR-017 | Usability — Lifecycle State Visibility | Operators can always determine whether Ralph is idle, running, paused, or in a recovery state from the console |
| NFR-018 | Usability — Recovery Guidance | Recovery actions for stale runs, failed milestones, and corrupted state are described in plain language with specific next steps |
| NFR-019 | Accessibility — Keyboard Operation | All operator console actions are accessible via keyboard navigation |
| NFR-020 | Accessibility — Readable Status | Run status, milestone state, and evidence summaries are readable without relying on color alone; contrast ratio meets WCAG AA |
| NFR-021 | Accessibility — Focus States | Focus states are visible and distinguishable for all interactive elements |
| NFR-022 | Packaging — Update Integrity | App updates must not corrupt local Ralph projects or database state; migration path for schema changes must be defined and tested |
| NFR-023 | Packaging — Data Safety | Uninstall/reinstall must not delete workspace folders, artifacts, or delivery bundles without explicit operator confirmation |

---

## 8. User Experience Notes

### 8.1 Key User Flows

Document the flows that must work end to end.

1. **App Brief -> Blueprint -> Bootstrap -> Run**
   Workspace picker -> New Ralph project -> Describe app -> Review generated blueprint -> Approve blueprint -> Bootstrap workspace -> Validate readiness -> Start run -> Monitor milestone -> Approve delivery -> Receive bundle

2. **Supervise Active Run**
   Run dashboard shows active plan and milestone -> Real-time status updates -> Pause/Resume/Stop controls -> Stale detection alert -> Recovery guidance -> Milestone evidence inspection -> Continue or deliver

3. **Repair Stale Run**
   Stale alert surfaces -> Inspect current state -> Choose repair action (resume, restart milestone, restart run) -> Validate repair path -> Execute repair -> Confirm recovery

4. **Deliver Completed App**
   All milestones green -> Request delivery -> Review bundle contents and release notes -> Approve handoff -> Bundle archived -> Delivery manifest recorded

### 8.2 UX Expectations

- The product should make the next step obvious.
- Empty, loading, error, and success states must be defined for core flows.
- Warnings should be actionable, not generic.
- Where the system makes decisions automatically, users should be able to inspect the outcome.
- Ralph's current state (idle, running, paused, recovery) must always be visible and unambiguous.
- Approval gates must clearly state what is being approved and what the consequence is.

### 8.3 Content and Messaging

- Use plain language over internal jargon.
- Prefer task-oriented labels.
- Explain irreversible actions clearly.
- Recovery guidance must be specific, not generic ("something went wrong").
- Status messages must answer "what is Ralph doing now and why?" not just "running".

---

## 9. Success Metrics

Separate leading indicators from outcome metrics.

### 9.1 Outcome Metrics

| Metric | Why It Matters | Baseline | Target | Owner |
| --- | --- | --- | --- | --- |
| App delivery rate | Shows whether Ralph can take an app from brief to delivered bundle | No baseline | 80% of started projects reach delivery approval | Ralph product |
| Run completion rate | Shows whether started runs reach milestone completion without operator restart | No baseline | 90% of runs complete without force-restart | Ralph product |
| Validation pass rate at delivery | Shows whether delivered apps meet build, test, and lint criteria | No baseline | 95% of delivery bundles pass all validation checks | Ralph product |
| Average iterations per milestone | Lower is better; high iteration count signals plan brittleness or execution problems | No baseline | < 3 iterations per milestone | Ralph product |
| Interruption and recovery rate | Shows whether interrupted runs can be resumed vs. restarted from scratch | No baseline | 85% of interrupted runs resume successfully | Ralph product |

### 9.2 Leading Indicators

- **Activation time:** Time from app brief creation to Ralph-ready workspace. Measures how quickly operators can start supervised work.
- **Blueprint approval time:** Time from blueprint generation to operator approval. Measures whether the blueprint is clear enough to approve without extended review.
- **Evidence capture completeness:** Percentage of milestones that produce full validation evidence. Measures whether evidence gathering is working end-to-end.
- **Stale run frequency:** Number of stale run events per active run. Lower is better; high frequency indicates plan or execution problems.

### 9.3 Guardrail Metrics

- **Operator intervention frequency:** Number of times per run the operator must manually intervene (pause, stop, approve, or repair). High frequency indicates insufficient automation or unclear guidance.
- **Blocked unsafe operation count:** Number of destructive or out-of-workspace operations blocked by safety gates. Non-zero is expected; high counts may indicate plan issues.
- **Stale run recovery success rate:** Percentage of stale run events where the operator successfully recovers without abandoning the workspace.

---

## 10. Delivery Plan

### 10.1 Milestones

| Milestone | Objective | Exit Criteria | Target Date |
| --- | --- | --- | --- |
| Phase 01 | Establish secure desktop shell foundations | Electron shell runs securely and Claude Code installation can be detected | `[date]` |
| Phase 02 | Ship the PTY-backed terminal runtime | Claude Code runs inside Ralph's desktop shell with reliable terminal behavior | `[date]` |
| Phase 03 | Add workspace and session workflows | Users can manage workspaces, tabs, and recent sessions as Ralph project contexts | `[date]` |
| Phase 04 | Add settings, profiles, and diagnostics | Local configuration and troubleshooting are available in-app for Ralph projects | `[date]` |
| Phase 05 | Harden the app for release | Packaging, updates, recovery, and QA are defined and usable | `[date]` |
| Phase 06 Optional | Expand into IDE-like workflows | Monaco, diff review, and side panels are available as operator support tools | `[date]` |
| Phase 07 | Ralph project bootstrap | Users can turn a workspace into a Ralph-ready project with control files and readiness validation | `[date]` |
| Phase 08 | Ralph scheduler and safety | Users can run one-item-at-a-time Ralph loops with session continuity, rate limits, and circuit breakers | `[date]` |
| Phase 09 | Evidence and plan repair | Ralph captures validation evidence, analyzes artifacts, and regenerates fix plans from evidence | `[date]` |
| Phase 10 | Operator console | Users can monitor Ralph runs, inspect backlog and artifacts, and intervene safely | `[date]` |
| Phase 11 | Recovery and release readiness | Autonomous runs can checkpoint, recover, and ship with test harnesses and operator documentation | `[date]` |
| Phase 12 | Ralph flow upgrade | Ralph mode becomes a coherent end-to-end loop with deterministic control files and stable plan semantics | `[date]` |
| Phase 13 | Goal to app bootstrap | Users can turn an app idea into a scaffolded Ralph-ready workspace with generated specs and approved initial plan | `[date]` |
| Phase 14 | Long-horizon app builder | Ralph can build a larger application across milestones with resumable context and milestone-aware replanning | `[date]` |
| Phase 15 | Desktop one-shot delivery | Users can request an app, review it in the desktop UI, and receive packaged delivery artifacts with explicit approval gates | `[date]` |
| Phase 16 | Multi-app portfolio orchestrator | Ralph manages a pipeline of multiple concurrent app builds with portfolio goals and cross-project visibility | `[date]` |
| Phase 17 | Learning feedback loop | Ralph learns from delivered apps and applies pattern-based improvements to future builds | `[date]` |
| Phase 18 | Maintenance and monitoring | Ralph tracks delivered apps after handoff and identifies follow-up work from health and feedback signals | `[date]` |
| Phase 19 | Autonomous post-delivery iteration | Ralph can safely plan and execute post-delivery improvements with operator visibility and approval gates | `[date]` |
| Phase 20 | Skill library and blueprint system | Operators can author, share, and reuse app blueprints so common app types are built from curated patterns | `[date]` |
| Phase 21 | Ralph product source of truth | Ralph has a clear product definition, requirements baseline, and public-facing story as an operator desktop | `[date]` |
| Phase 22 | Ralph brand and shell | The installed app, title, about screen, navigation, and first screen present Ralph as the primary product | `[date]` |
| Phase 23 | Ralph-first project flow | Users can move from app idea through intake, bootstrap, run supervision, artifacts, and delivery without dropping into generic terminal flow | `[date]` |
| Phase 24 | Ralph API compatibility and data | New code can use Ralph-named APIs while existing Knuthflow integrations, local data, and projects continue to work | `[date]` |
| Phase 25 | Ralph release readiness | Ralph can ship as a coherent Ralph-focused desktop release with docs, packaging, QA, release notes, and regression checks | `[date]` |

### 10.2 Sequencing Logic

Detailed task breakdown lives in [`roadmap/README.md`](./roadmap/README.md).

- Build the Electron shell and security boundary first.
- Make Claude Code execution reliable through `node-pty` and `xterm.js`.
- Add workspace and session ergonomics after the runtime is stable.
- Layer settings, persistence, diagnostics, and secure storage next.
- Harden packaging, updater, and recovery before wider release.
- Bootstrap the Ralph control stack and persisted workspace state after the wrapper runtime is stable.
- Add the autonomous scheduler, session continuity, and safety gates next.
- Layer search, validation evidence, artifact analysis, and plan repair on top of the scheduler.
- Expose operator-facing controls and observability once the loop can make grounded decisions.
- Finish with checkpointing, crash recovery, dry-run testing, and release documentation for autonomous mode.
- Consolidate the accumulated Ralph modules into a single real loop flow before scaling autonomous usage.
- Add goal-intake and workspace-bootstrap so Ralph can start from an app brief.
- Extend the upgraded Ralph loop into a milestone-aware app builder for long-horizon product work.
- Finish with desktop review, packaging, and end-to-end delivery so the product can support a one-shot app workflow.
- Add portfolio orchestration once a single Ralph app build can be delivered reliably.
- Feed completed-run evidence and delivery outcomes back into future Ralph prompts and operator-visible lessons.
- Track delivered apps after handoff so Ralph can identify maintenance work.
- Allow post-delivery iteration only after maintenance signals, safety gates, and approval boundaries are in place.
- Capture repeated successful patterns as reusable blueprints.
- Re-establish the product source of truth around Ralph so future shell, API, and release work has one consistent target.
- Update the app shell and visible brand after the product definition is agreed.
- Make the Ralph project lifecycle the primary interaction model.
- Add Ralph-named API and data compatibility layers before broad internal renames.
- Run the release-readiness pass only after product story, shell behavior, workflow, API compatibility, and data policy are aligned.

### 10.3 Launch Criteria

Ralph is ready for broader release when:

- Core flows work without manual operator intervention for the happy path.
- Safety gates block destructive operations with clear operator guidance.
- Delivery bundles contain complete artifacts, evidence, and release notes.
- Success metrics can be measured locally.
- Key risks have mitigation or monitoring in place.
- Support and rollback procedures are defined.

---

## 11. Technical Notes

This section exists to preserve essential technical context without turning the PRD into a design doc.

### 11.1 Current Technical Assumptions

- Ralph is a desktop application that controls the local Claude Code CLI rather than reimplementing it.
- The product adds operator UX on top of the CLI: app brief intake, blueprint generation, workspace bootstrap, supervised run execution, evidence capture, and delivery packaging.
- Interactive Claude Code behavior depends on real terminal semantics, so PTY support is a core requirement for the runtime layer.
- Ralph's primary product surface is the operator console; the terminal, editor, and workspace views are supporting tools.

### 11.2 Application Stack

This is the current Ralph desktop application stack:

- Electron Forge — packaging and distribution
- React 19 — renderer UI
- TypeScript — language
- Webpack — bundling
- Tailwind CSS — styling
- `node-pty` — PTY-backed terminal for Claude Code execution
- `xterm.js` — terminal rendering in the renderer process
- Monaco Editor — optional file viewer for artifact inspection
- `better-sqlite3` — local persistence for Ralph state, sessions, workspaces
- Playwright — end-to-end testing

Additional guidance:

- `node-pty` is required for reliable interactive Claude Code execution under Ralph's control.
- `xterm.js` is the terminal renderer, not the process manager.
- SQLite is appropriate for local metadata: workspaces, sessions, Ralph loop state, delivery manifests, and app settings.
- Monaco is optional and used as an operator support tool for file and artifact inspection, not as a primary editing surface.

### 11.3 Ralph Runtime Architecture

The current architecture implies the following product posture:

- Ralph launches and manages the installed Claude Code CLI locally through a PTY session.
- Ralph does not attempt to clone Claude Code behavior or replace its execution engine.
- The first version prioritizes operator visibility, evidence capture, and controlled run execution over IDE-style editing features.
- Ralph's control files (PROMPT.md, AGENT.md, fix_plan.md) and `.ralph/` metadata directory are the primary project interface.
- Loop state (current milestone, iteration count, plan context, resume token) is persisted in SQLite and the `.ralph/` directory.

### 11.4 Architecture Constraints

- PTY spawning and process lifecycle management must live in the Electron main process or another trusted backend boundary.
- The renderer is responsible for operator console presentation, app chrome, settings UI, and Ralph project views.
- Renderer access to system capabilities must be mediated through preload and IPC with context isolation enabled.
- Secrets must not be stored in plaintext SQLite; use OS-backed secure storage.
- Ralph must detect and manage the local Claude Code installation rather than assuming a fixed environment.

### 11.5 Data Model Notes

| Entity | Description | Critical Fields |
| --- | --- | --- |
| Workspace | A local project context that serves as a Ralph project root. | `id`, `name`, `path`, `last_opened_at`, `preferred_profile` |
| Session | A tracked Claude Code run or conversation within a workspace. Ralph uses sessions as the execution context for loop iterations. | `id`, `workspace_id`, `started_at`, `ended_at`, `status`, `resume_token` |
| RalphProject | Ralph-specific project metadata including bootstrap file state, loop configuration, and readiness status. | `id`, `workspace_id`, `loop_state`, `milestone_index`, `max_iterations`, `stale_interval` |
| LoopRun | A single Ralph loop execution record including start time, end time, outcome, iteration count, and associated evidence. | `id`, `ralph_project_id`, `started_at`, `ended_at`, `outcome`, `iterations`, `milestone_id` |
| DeliveryManifest | A record of a completed delivery bundle including artifact inventory, evidence summary, and delivery timestamp. | `id`, `project_id`, `delivered_at`, `output_path`, `artifact_count`, `release_notes` |
| Terminal Instance | A live PTY-backed terminal bound to a session or workspace tab. | `id`, `session_id`, `shell`, `cols`, `rows`, `state` |
| App Settings | User-configurable local behavior exposed through GUI. | `theme`, `profiles`, `cli_path`, `default_workspace`, `safety_preferences` |

### 11.6 External Dependencies

| Dependency | Purpose | Risk |
| --- | --- | --- |
| Claude Code CLI | Core agent runtime that Ralph controls and supervises locally. | Product coupling to upstream CLI behavior, flags, and installation model; Ralph must adapt if CLI behavior changes |
| Electron runtime | Cross-platform desktop shell and process boundary for Ralph. | Packaging, security hardening, and platform-specific maintenance |
| node-pty | Real terminal semantics for interactive CLI execution. | Native module compatibility and cross-platform packaging complexity |
| xterm.js | Terminal rendering in the renderer process. | Terminal UX quality depends on correct PTY integration and resize handling |
| SQLite | Local persistence for Ralph metadata, loop state, and delivery records. | Schema drift and local data migration over time; migrations must preserve existing project data |

---

## 12. Risks and Dependencies

### 12.1 Major Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Claude Code CLI behavior changes break Ralph's control interface | Medium | High | Ralph detects CLI version and flags compatibility issues; operator is notified before run starts |
| Stale run state accumulates and blocks project resume | Medium | Medium | Stale detection and recovery guidance are first-class features; periodic state cleanup is operator-accessible |
| Operator loses trust due to unclear plan visibility or silent execution | Medium | High | Plan and milestone status are always visible; approval gates prevent silent high-impact actions |
| Database migration corrupts Ralph project state on upgrade | Low | High | WAL checkpointing and transactional writes; migration tested on snapshot before shipping |
| Safety gate false positives cause operator fatigue and bypass | Low | Medium | Safety gates are configurable per project; blocked operations surface explanation, not just denial |
| Delivery bundle is incomplete and causes failed handoff | Medium | Medium | Artifact manifest is generated and reviewed before delivery approval; checklist supports gap identification |

### 12.2 Delivery Dependencies

- Claude Code CLI must be installed and available on PATH or configured path for Ralph to function
- Electron platform support (macOS, Windows, Linux) determines where Ralph can run; no mobile or web targets in current phase
- Phase 20 blueprint system is a dependency for blueprint reuse features; these are could-have not must-have in current phase

### 12.3 Assumptions

- Ralph runs on a single machine with local file system access; no distributed or remote execution model is assumed
- Operators have sufficient context to approve or reject blueprint plans; Ralph surfaces information but does not make judgment on business validity
- Local SQLite database is the single source of truth for Ralph state; no cloud sync or multi-device state is expected
- Phase 21 product definition is the basis for Phase 22 brand work and Phase 25 release readiness; scope changes after Phase 21 may require PRD revision

---

## 13. Acceptance and Testing

### 13.1 Acceptance Criteria

Every committed feature should have acceptance criteria that are:

- Observable
- Testable
- User-centered
- Unambiguous

Template:

- Given `[starting context]`, when `[action]`, then `[expected result]`.

### 13.2 Test Strategy

Document the minimum test bar for Ralph.

| Area | Validation Approach |
| --- | --- |
| Core workflows (intake, bootstrap, run, evidence, delivery) | End-to-end Playwright tests covering the full Ralph loop lifecycle |
| Safety gates (approval, destructive operation blocking, workspace boundaries) | Integration tests exercising each gate with operator confirmation and rejection paths |
| Edge cases (stale runs, interrupted resume, database migration, large projects) | Targeted unit and integration tests for each failure mode |
| Reliability (crash recovery, WAL checkpoint, orphaned session cleanup) | Chaos and soak tests; supervisor cleanup verification on restart |
| UX and copy (labeling, error messages, recovery guidance) | Design review and usability validation against glossary and content rules |
| Evidence capture and delivery bundle completeness | Integration tests that run a milestone to completion and verify artifact manifest and release notes |
| Accessibility | Keyboard navigation audit, screen reader verification, WCAG AA contrast check |

### 13.3 Release Readiness Checks

- Requirements mapped to shipped behavior
- Critical metrics instrumented
- Rollback or recovery documented
- Known issues reviewed and accepted
- All Phase 25 exit criteria are satisfied

---

## 14. Operating Model

### 14.1 Ownership

| Area | Owner |
| --- | --- |
| Product direction | `[name / team]` |
| Engineering delivery | `[name / team]` |
| Design / UX | `[name / team]` |
| Operations / support | `[name / team]` |

### 14.2 Review Cadence

- Review this PRD at least once per planning cycle.
- Update milestone status after major releases or scope changes.
- Add new decisions immediately when tradeoffs are made.

### 14.3 Change Management

When scope changes:

1. Update the relevant requirement, scope, or milestone section.
2. Add a decision-log entry explaining the change.
3. Update risks, dependencies, and metrics if they are affected.

---

## 15. Decision Log

Use reverse chronological order.

| Date | Decision | Rationale | Owner |
| --- | --- | --- | --- |
| `2026-04-22` | Ralph is the primary product; the desktop shell, PTY runtime, workspace management, and terminal are supporting infrastructure. | The roadmap track from Phase 07 onward has always been about autonomous Ralph loops. Phase 21 establishes Ralph as the product surface so that Phase 22 branding, Phase 23 workflow, and Phase 25 release readiness have a consistent target. The Electron wrapper and Claude Code runtime are preserved as the execution engine Ralph controls, not discarded scope. | Product |
| `2026-04-22` | Introduce Ralph-first UX before any broad internal rename. | Compatibility with existing workspaces, sessions, and tests is maintained through Phase 24. Renaming internal identifiers before API compatibility work is complete would break existing integrations. Phase 22 updates visible branding; Phase 24 handles internal API renaming with a compatibility layer. | Product / Engineering |
| `2026-04-22` | Retain terminal, PTY, workspace, editor, settings, and history as operator support tools. | These capabilities are already implemented and used by operators for direct Claude Code interaction. They are not primary Ralph workflows but are retained as secondary tools operators use to support their work. | Product |
| `2026-04-22` | Compatibility policy: visible brand names, package identity, preload API names, database names, and user data paths are preserved through Phase 24. | Existing user workspaces, local data, and test suites depend on current identifiers. Phase 24 introduces Ralph-named alternatives while maintaining backward compatibility. Broad internal renames happen only after compatibility work is complete. | Engineering |
| `2026-04-10` | Adopted Electron + React + TypeScript + Tailwind + xterm.js + node-pty + SQLite + Electron Forge as the default desktop-wrapper stack, with Monaco optional. | Ralph is a desktop operator console that controls Claude Code, so PTY-backed terminal reliability is more important than editor features. Monaco remains available as an operator support tool for artifact inspection. | Product / Engineering |
| `2026-04-10` | Replaced legacy Ralph-specific PRD with a Knuthflow evergreen PRD template. | The prior document described a different product and could not serve as a reliable source of truth for this repository. | Codex |
| `2026-04-22` | Known tradeoffs of the Ralph-first refocus: visible UI may temporarily show Knuthflow branding while internal identifiers still use that name; this inconsistency is acceptable until Phase 22 and Phase 24 resolve it. | Brand-visible changes start in Phase 22; internal API rename compatibility is handled in Phase 24. No simultaneous full rename is attempted to avoid breaking existing user workspaces and test suites. | Product |
| `2026-04-22` | Open: Final package name (Ralph.app, Knuthflow.app, or rebranded) is not yet decided. | Depends on Phase 22 brand policy discussion. Package identity affects distribution, app store presence, and existing user expectations. | Open |
| `2026-04-22` | Open: Data migration path for users upgrading from Knuthflow-labeled storage to Ralph-labeled storage is not yet defined. | Phase 24 API compatibility work will address this. No data migration is attempted in Phase 21. | Open |

---

## 16. Open Questions

Track unresolved items that block clarity or delivery.

| ID | Question | Impact if Unresolved | Owner | Target Resolution |
| --- | --- | --- | --- | --- |
| Q-001 | What is the final visible brand name for the installed app? | High — affects product story, packaging, release notes, and operator trust | Product | Phase 22 |
| Q-002 | What is the data migration path for existing Knuthflow user data (workspaces, sessions, settings) when upgrading to Ralph-labeled storage? | High — existing users must not lose data on upgrade; compatibility must be preserved | Engineering | Phase 24 |
| Q-003 | What is the package identity (app bundle name, installer name) for distribution? | Medium — affects macOS app store, Windows installer, Linux packages | Product | Phase 22 |
| Q-004 | What is the scope of Phase 22 UI changes (title bar, about screen, navigation labels, first screen)? | High — Phase 22 brand work depends on agreed scope | Design / Product | Phase 22 |

---

## 17. Glossary

| Term | Definition |
| --- | --- |
| Ralph | The autonomous app-building operator console that is the primary product. Ralph controls the local Claude Code CLI through controlled one-item-at-a-time build loops. Named after Ralph Wiggum ("I'm in danger"): the product surfaces danger and recovery before it becomes catastrophic. |
| Operator | The primary user of Ralph. An operator describes app briefs, reviews blueprints, approves runs, supervises milestones, and approves delivery. Operators are always in supervisory control; Ralph never acts without operator visibility or approval for high-impact actions. |
| Ralph project | A workspace that has been bootstrapped for Ralph with control files (PROMPT.md, AGENT.md, fix_plan.md), metadata (.ralph/), and readiness validation. The Ralph project is the unit of work that Ralph operates on. |
| App brief | The initial operator input that describes what application should be built. The brief is the entry point for the Ralph workflow and drives blueprint generation. |
| Blueprint | The generated plan produced from an app brief, containing milestones, expected artifacts, delivery criteria, and the overall project scope. The operator reviews and approves the blueprint before a run starts. |
| Run | A single execution of the Ralph loop, starting from a given milestone and running until completion, stop, or staleness. Runs are the unit of Ralph execution visibility. |
| Loop | One iteration of the Ralph autonomous cycle: plan, execute, validate, evidence, then repeat. A run consists of one or more loop iterations (one per milestone). |
| Milestone | A discrete step within a blueprint: a unit of build work that produces artifact(s) and validation evidence. Ralph completes milestones one at a time. |
| Plan | The current state of Ralph's execution: active milestone, iteration count, last action, and next expected action. The plan is always visible to the operator. |
| Artifact | A file produced, modified, or deleted during a milestone. Artifacts are tracked in a milestone artifact manifest and preserved in `.ralph/artifacts/<milestone-id>/`. |
| Evidence | Validation results captured during a milestone: build output, test results, lint results, and any operator-configured checks. Evidence is stored with the milestone and viewable from the operator console. |
| Delivery bundle | A packaged output from a completed Ralph project containing the built application, artifact manifest, evidence summary, and release notes. The bundle is presented to the operator for approval before handoff. |
| Approval gate | A pause in the Ralph workflow that requires explicit operator confirmation before Ralph proceeds. Approval gates apply to: blueprint start, destructive operations, and delivery handoff. |
| Workspace | A local directory that serves as the root of a Ralph project. The workspace contains the app source, control files, `.ralph/` metadata, and artifact storage. "Workspace" is used when referring to the file system location; "Ralph project" is used when referring to the bootstrapped, validated Ralph context. |
| Runtime terminal | The PTY-backed terminal tab used by Ralph to execute Claude Code commands. Operators can also use the runtime terminal for direct Claude Code interaction when not in a supervised Ralph run. |
| Claude Code session | A single invocation of the Claude Code CLI within a PTY terminal. Ralph runs one Claude Code session per milestone iteration. "Claude Code session" describes the underlying execution dependency, not the user-facing Ralph workflow. |
| Knuthflow | The original desktop wrapper project name. Retained for compatibility: package identity, preload API names, database names, and user data paths still use Knuthflow identifiers through Phase 24. Phase 22 introduces visible Ralph branding; Phase 24 introduces Ralph-named API alternatives with a compatibility layer. |
| Evergreen PRD | A living requirements document that is continuously updated rather than replaced each cycle. Ralph's PRD is structured as evergreen so product direction can evolve without rewriting the document from scratch. |
