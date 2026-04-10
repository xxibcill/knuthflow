# Knuthflow Evergreen PRD

## Document Status

| Field | Value |
| --- | --- |
| Product | Knuthflow |
| Document Type | Evergreen Product Requirements Document |
| Status | Active |
| Owner | `[name / team]` |
| Contributors | `[names / functions]` |
| Last Updated | `2026-04-10` |
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

Knuthflow is defined here as an evergreen project. This PRD is intentionally structured so the product can evolve without rewriting the document from scratch each cycle.

Use this section to keep the top-level product story stable:

- **One-line description:** `[What Knuthflow is in one sentence]`
- **Target outcome:** `[What becomes easier, faster, safer, or more valuable for users]`
- **Primary domain:** `[e.g. developer tooling, workflow orchestration, knowledge management, internal ops]`
- **Current phase:** `[discovery / MVP / beta / growth / stabilization]`

### 1.2 Product Summary

Knuthflow should be described in terms of durable user value, not current implementation. Favor statements like:

- Users need a reliable way to `[core job]`.
- Existing workflows break down because `[core failure mode]`.
- Knuthflow improves this by `[core differentiator]`.

### 1.3 Document Scope

This PRD covers:

- Product intent
- User needs
- Functional requirements
- Non-functional expectations
- Delivery sequencing
- Risks, constraints, and decisions

This PRD does not need to duplicate:

- Sprint checklists
- Detailed task breakdowns
- Low-level technical design unless it affects product behavior

---

## 2. Problem Statement

### 2.1 Background

Describe the current state that makes Knuthflow necessary.

Template:

> Teams or users currently rely on `[current behavior / workaround / manual process]`, which leads to `[cost, delay, error, inconsistency, confusion, or risk]`.

### 2.2 Core Problems

Capture the persistent problems the project exists to solve.

| Problem | Who Feels It | Evidence | Business Impact |
| --- | --- | --- | --- |
| `[problem 1]` | `[persona]` | `[qualitative or quantitative signal]` | `[why it matters]` |
| `[problem 2]` | `[persona]` | `[signal]` | `[why it matters]` |
| `[problem 3]` | `[persona]` | `[signal]` | `[why it matters]` |

### 2.3 Opportunity

Summarize the upside if Knuthflow succeeds.

- **User impact:** `[time saved / errors reduced / confidence increased / adoption unlocked]`
- **Business impact:** `[revenue / retention / cost reduction / platform leverage / strategic fit]`
- **Strategic reason now:** `[why this should be built or improved now]`

---

## 3. Users and Jobs To Be Done

### 3.1 Primary Users

| User Type | Context | Primary Need | Frequency |
| --- | --- | --- | --- |
| `[persona]` | `[where they use it]` | `[what they need most]` | `[daily / weekly / occasional]` |
| `[persona]` | `[where they use it]` | `[what they need most]` | `[daily / weekly / occasional]` |

### 3.2 Secondary Users

- `[persona or stakeholder]` and why they matter
- `[persona or stakeholder]` and why they matter

### 3.3 Jobs To Be Done

Use outcome-oriented phrasing.

- When `[situation]`, users want to `[motivation]`, so they can `[expected outcome]`.
- When `[situation]`, users want to `[motivation]`, so they can `[expected outcome]`.

### 3.4 User Constraints

List conditions that materially shape the product.

- `[time pressure / low trust / compliance / limited technical skill / multi-device usage / offline constraints]`
- `[organizational or platform constraints]`

---

## 4. Product Principles

These principles should remain stable unless the product strategy changes.

1. **Solve the core workflow first.**
   Features that do not improve the primary job should not outrank reliability or clarity.
2. **Prefer explicitness over magic.**
   Users should understand what Knuthflow is doing, why, and what happens next.
3. **Reduce operational burden.**
   The product should remove repeated manual work, not shift it elsewhere.
4. **Design for change.**
   Requirements, integrations, and workflows will evolve; the product should absorb change without structural rewrites.
5. **Keep the spec honest.**
   Unknowns, tradeoffs, and limitations belong in this document.

Add or edit principles here only when they materially change roadmap decisions.

---

## 5. Goals and Non-Goals

### 5.1 Product Goals

| Goal | Description | Priority |
| --- | --- | --- |
| `[goal 1]` | `[what success looks like]` | High |
| `[goal 2]` | `[what success looks like]` | High |
| `[goal 3]` | `[what success looks like]` | Medium |

### 5.2 Non-Goals

Use this section aggressively to prevent scope drift.

- Knuthflow will not `[explicitly out-of-scope item]`.
- Knuthflow will not `[nice-to-have that is being deferred]`.
- Knuthflow will not optimize for `[edge audience or use case]` in the current phase.

---

## 6. Scope

### 6.1 In Scope Now

List the committed capabilities for the current planning horizon.

- `[capability or workflow]`
- `[capability or workflow]`
- `[capability or workflow]`

### 6.2 Later / Deferred

- `[important but not current]`
- `[depends on validation or infrastructure]`
- `[blocked by dependency or market signal]`

### 6.3 Out of Scope

- `[clearly excluded item]`
- `[clearly excluded item]`

---

## 7. Requirements

Use stable IDs so requirements can be referenced in issues, designs, and decisions.

### 7.1 Functional Requirements

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-001 | Knuthflow must let users `[core action]`. | Must | `[constraints / assumptions]` |
| FR-002 | Knuthflow must show `[state / result / feedback]` when `[event]`. | Must | `[notes]` |
| FR-003 | Knuthflow must support `[secondary capability]`. | Should | `[notes]` |
| FR-004 | Knuthflow must record or expose `[audit trail / history / metadata]` if needed for trust or support. | Should | `[notes]` |
| FR-005 | Knuthflow should handle `[important edge case]` without requiring manual recovery. | Could | `[notes]` |

### 7.2 Non-Functional Requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-001 | Reliability | `[uptime / failure recovery / data integrity expectation]` |
| NFR-002 | Performance | `[response time / throughput / startup / latency]` |
| NFR-003 | Security | `[auth, authorization, secret handling, data boundaries]` |
| NFR-004 | Usability | `[time to first success / learning curve / support burden]` |
| NFR-005 | Accessibility | `[WCAG target or internal bar]` |
| NFR-006 | Observability | `[logs, metrics, alerts, traces, debugging needs]` |

### 7.3 Compliance or Policy Requirements

Only keep this section if applicable.

- `[regulatory or internal policy requirement]`
- `[data retention or privacy requirement]`
- `[approval or audit requirement]`

---

## 8. User Experience Notes

### 8.1 Key User Flows

Document the flows that must work end to end.

1. `[Entry point]` -> `[user action]` -> `[system response]` -> `[successful outcome]`
2. `[Entry point]` -> `[user action]` -> `[system response]` -> `[successful outcome]`

### 8.2 UX Expectations

- The product should make the next step obvious.
- Empty, loading, error, and success states must be defined for core flows.
- Warnings should be actionable, not generic.
- Where the system makes decisions automatically, users should be able to inspect the outcome.

### 8.3 Content and Messaging

Capture durable content rules here.

- Use plain language over internal jargon.
- Prefer task-oriented labels.
- Explain irreversible actions clearly.
- Document any voice, tone, or terminology constraints.

---

## 9. Success Metrics

Separate leading indicators from outcome metrics.

### 9.1 Outcome Metrics

| Metric | Why It Matters | Baseline | Target | Owner |
| --- | --- | --- | --- | --- |
| `[metric]` | `[reason]` | `[current]` | `[goal]` | `[team]` |
| `[metric]` | `[reason]` | `[current]` | `[goal]` | `[team]` |

### 9.2 Leading Indicators

- `[activation signal]`
- `[engagement signal]`
- `[quality or reliability signal]`

### 9.3 Guardrail Metrics

- `[metric that prevents harmful optimization]`
- `[metric that protects cost / trust / performance]`

---

## 10. Delivery Plan

### 10.1 Milestones

| Milestone | Objective | Exit Criteria | Target Date |
| --- | --- | --- | --- |
| Phase 01 | Establish secure desktop shell foundations | Electron shell runs securely and Claude Code installation can be detected | `[date]` |
| Phase 02 | Ship the PTY-backed terminal runtime | Claude Code runs inside Knuthflow with reliable terminal behavior | `[date]` |
| Phase 03 | Add workspace and session workflows | Users can manage workspaces, tabs, and recent sessions | `[date]` |
| Phase 04 | Add settings, profiles, and diagnostics | Local configuration and troubleshooting are available in-app | `[date]` |
| Phase 05 | Harden the app for release | Packaging, updates, recovery, and QA are defined and usable | `[date]` |
| Phase 06 Optional | Expand into IDE-like workflows | Monaco, diff review, and side panels are justified and stable | `[date]` |

### 10.2 Sequencing Logic

Detailed task breakdown lives in [`roadmap/README.md`](./roadmap/README.md).

- Build the Electron shell and IPC boundary before any runtime feature work.
- Validate PTY-backed Claude Code execution before investing in workspace polish.
- Layer persistence, settings, and diagnostics after the terminal core is reliable.
- Defer Monaco and IDE-like editing until the terminal-first product is stable and justified.

### 10.3 Launch Criteria

Knuthflow is ready for broader release when:

- Core flows work without manual operator intervention.
- Key risks have mitigation or monitoring in place.
- Support and rollback procedures are defined.
- Success metrics can be measured.

---

## 11. Technical Notes

This section exists to preserve essential technical context without turning the PRD into a design doc.

### 11.1 Current Technical Assumptions

- Knuthflow is currently being evaluated as a desktop application that wraps the local Claude Code CLI rather than reimplementing it.
- The product should add desktop UX on top of the CLI: workspace management, session continuity, settings, history, and safe process orchestration.
- Interactive Claude Code behavior depends on real terminal semantics, so PTY support is a core requirement rather than an implementation detail.

### 11.2 Recommended Application Stack

This is the current default stack opinion for a Knuthflow desktop wrapper:

- Electron
- React
- TypeScript
- Tailwind
- xterm.js
- node-pty
- SQLite
- Electron Forge
- Zustand

Additional guidance:

- `node-pty` is required for a reliable interactive Claude Code experience.
- `xterm.js` is the terminal renderer in the UI, not the process manager.
- SQLite is appropriate for local metadata such as sessions, history, workspaces, logs, and cached configuration state.
- Monaco is optional and should be added only if Knuthflow needs to behave like a mini IDE rather than a terminal-first wrapper.

### 11.3 Product Shape Implication

The current technical recommendation implies the following product posture:

- Knuthflow should launch and manage the installed Claude Code CLI locally.
- Knuthflow should not attempt to clone Claude Code behavior or replace its execution engine.
- The first version should prioritize terminal reliability, session management, and local workflow ergonomics over IDE-style editing features.

Two valid product directions remain open:

1. **Terminal-first v1**
   Focus on workspace picker, terminal tabs, session history, config UI, logs, and update flow.
2. **IDE-like version**
   Add Monaco and support file editing, diffs, patch review, prompt and code side-by-side, and richer tool panels.

### 11.4 Architecture Constraints

- PTY spawning and process lifecycle management must live in the Electron main process or another trusted backend boundary.
- The renderer should be responsible for terminal presentation, app chrome, settings UI, and session/workspace views.
- Renderer access to system capabilities should be mediated through preload and IPC with context isolation enabled.
- Secrets must not be stored in plaintext SQLite; use OS-backed secure storage.
- The app must detect and manage the local Claude Code installation instead of assuming a fixed environment.

### 11.5 Data Model Notes

Document only the domain objects that matter to product behavior.

| Entity | Description | Critical Fields |
| --- | --- | --- |
| Workspace | A local project context the user launches Claude Code against. | `id`, `name`, `path`, `last_opened_at`, `preferred_profile` |
| Session | A tracked Claude Code run or conversation within a workspace. | `id`, `workspace_id`, `started_at`, `ended_at`, `status`, `resume_token` |
| Terminal Instance | A live PTY-backed terminal bound to a session or workspace tab. | `id`, `session_id`, `shell`, `cols`, `rows`, `state` |
| App Settings | User-configurable local behavior exposed through GUI. | `theme`, `profiles`, `cli_path`, `default_workspace`, `safety_preferences` |

### 11.6 External Dependencies

| Dependency | Purpose | Risk |
| --- | --- | --- |
| Claude Code CLI | Core agent runtime that Knuthflow wraps locally. | Product coupling to upstream CLI behavior, flags, and installation model |
| Electron runtime | Cross-platform desktop shell and process boundary. | Packaging, security hardening, and platform-specific maintenance |
| node-pty | Real terminal semantics for interactive CLI execution. | Native module compatibility and cross-platform packaging complexity |
| xterm.js | Terminal rendering in the renderer process. | Terminal UX quality depends on correct PTY integration and resize handling |
| SQLite | Local persistence for app metadata. | Schema drift and local data migration over time |

---

## 12. Risks and Dependencies

### 12.1 Major Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| `[risk]` | `[low/med/high]` | `[low/med/high]` | `[plan]` |
| `[risk]` | `[low/med/high]` | `[low/med/high]` | `[plan]` |

### 12.2 Delivery Dependencies

- `[team, vendor, system, approval, or data dependency]`
- `[team, vendor, system, approval, or data dependency]`

### 12.3 Assumptions

- `[assumption that, if false, changes scope]`
- `[assumption that, if false, changes timeline]`

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

Document the minimum test bar for Knuthflow.

| Area | Validation Approach |
| --- | --- |
| Core workflows | `[manual QA / integration tests / end-to-end tests]` |
| Edge cases | `[targeted tests or checklists]` |
| Reliability | `[load, retry, recovery, chaos, soak, or monitoring validation]` |
| UX and copy | `[design review / usability validation / content review]` |

### 13.3 Release Readiness Checks

- Requirements mapped to shipped behavior
- Critical metrics instrumented
- Rollback or recovery documented
- Known issues reviewed and accepted

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
| `2026-04-10` | Adopted Electron + React + TypeScript + Tailwind + xterm.js + node-pty + SQLite + Electron Forge as the default desktop-wrapper stack, with Monaco optional. | Knuthflow is being shaped as a desktop wrapper around Claude Code CLI, so PTY-backed terminal reliability is more important than editor features in the first version. | Product / Engineering |
| `2026-04-10` | Replaced legacy Ralph-specific PRD with a Knuthflow evergreen PRD template. | The prior document described a different product and could not serve as a reliable source of truth for this repository. | Codex |
| `[YYYY-MM-DD]` | `[decision]` | `[why]` | `[owner]` |

---

## 16. Open Questions

Track unresolved items that block clarity or delivery.

| ID | Question | Impact if Unresolved | Owner | Target Resolution |
| --- | --- | --- | --- | --- |
| Q-001 | What is Knuthflow's exact product definition and core user? | High | `[owner]` | `[date]` |
| Q-002 | Will Knuthflow ship first as a terminal-first wrapper, or is Monaco-level editing required in v1? | High | `[owner]` | `[date]` |
| Q-003 | What capabilities are required for the first release versus later phases? | High | `[owner]` | `[date]` |
| Q-004 | What technical constraints are already fixed by the intended deployment environment? | Medium | `[owner]` | `[date]` |

---

## 17. Glossary

| Term | Definition |
| --- | --- |
| Evergreen PRD | A living requirements document that is continuously updated rather than replaced each cycle. |
| Knuthflow | `[define the product once the scope is finalized]` |
| Core flow | The shortest path a primary user takes to achieve the main product outcome. |
