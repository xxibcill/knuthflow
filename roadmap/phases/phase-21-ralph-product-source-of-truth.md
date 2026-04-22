# Phase 21 - Ralph Product Source of Truth

## Functional Feature Outcome

Ralph has a clear product definition, requirements baseline, and public-facing story that presents the app as a Ralph operator desktop rather than a general Claude Code wrapper.

## Why This Phase Exists

The codebase has evolved into a Ralph-centered app builder and operator console, but the product documents still describe Knuthflow primarily as a terminal-first desktop wrapper for Claude Code CLI. That mismatch makes prioritization ambiguous: terminal polish, generic workspace management, editor expansion, Ralph intake, autonomous loops, delivery, portfolio orchestration, and blueprint reuse all appear to compete as equal product goals. This phase establishes Ralph as the product center of gravity. It does not remove the terminal, PTY runtime, settings, editor, or session history; it reframes them as supporting systems for a Ralph-managed build loop.

## Scope

- Rewrite the top-level product statement so Ralph is described as a local operator desktop for turning app briefs into Ralph-managed builds, validation evidence, delivery artifacts, and post-delivery maintenance.
- Update `PRD.md` from a generic evergreen template into a Ralph-specific product requirements document with concrete personas, jobs to be done, goals, non-goals, requirements, metrics, risks, and decisions.
- Update `README.md` so new contributors understand that Claude Code is the execution engine and PTY sessions are infrastructure, while Ralph intake, planning, safety, execution, evidence, and delivery are the primary product workflow.
- Update roadmap positioning so earlier desktop-wrapper phases are treated as completed platform foundations and later phases are framed around Ralph product maturity.
- Define the primary user as an operator who wants Ralph to build, validate, package, and maintain apps from a local machine with explicit approval gates.
- Define secondary users such as developers inspecting Ralph output, product owners reviewing app briefs and delivery bundles, and maintainers debugging runtime failures.
- Clarify non-goals for the Ralph-focused product, including generic IDE replacement, generic terminal multiplexing, unmanaged background autonomy, and cloud-hosted multi-tenant orchestration.
- Establish terminology for "Ralph project", "app brief", "blueprint", "run", "milestone", "artifact", "delivery bundle", "operator approval", and "runtime terminal".
- Document the role of Claude Code as a local dependency that Ralph drives through controlled sessions rather than as the main user-facing product.
- Identify visible surfaces that must stop using generic Knuthflow/wrapper language, including app title, about screen, package description, screenshots, smoke tests, onboarding copy, and release notes.
- Add acceptance criteria for a Ralph-first release so future work can be judged by observable user outcomes rather than internal module completion.

## Tasks

| Task | Summary |
| --- | --- |
| [P21-T1](../tasks/phase-21/p21-t1-product-definition.md) | Replace the generic product definition with a Ralph-specific one-line description, product summary, target outcome, current phase, and strategic rationale. |
| [P21-T2](../tasks/phase-21/p21-t2-users-and-jobs.md) | Define primary and secondary users, user constraints, and Ralph-specific jobs to be done for app creation, run supervision, delivery, and maintenance. |
| [P21-T3](../tasks/phase-21/p21-t3-goals-and-non-goals.md) | Convert goals and non-goals from placeholder wrapper language into concrete Ralph priorities and explicit boundaries. |
| [P21-T4](../tasks/phase-21/p21-t4-functional-requirements.md) | Write stable Ralph functional requirements for intake, blueprint generation, bootstrapping, run control, safety gates, artifact inspection, packaging, release confirmation, portfolio management, and blueprint reuse. |
| [P21-T5](../tasks/phase-21/p21-t5-non-functional-requirements.md) | Define Ralph reliability, safety, performance, privacy, local data, accessibility, and recovery targets. |
| [P21-T6](../tasks/phase-21/p21-t6-success-metrics.md) | Define success metrics such as time from brief to bootstrapped workspace, run completion rate, validation pass rate, operator intervention rate, delivery bundle success rate, and recovery success rate. |
| [P21-T7](../tasks/phase-21/p21-t7-terminology-and-glossary.md) | Normalize naming across docs for Ralph project concepts and demote terminal-wrapper terms to implementation support language. |
| [P21-T8](../tasks/phase-21/p21-t8-readme-repositioning.md) | Rewrite the README around the Ralph workflow, retaining setup, tech stack, packaging, local data, and testing details. |
| [P21-T9](../tasks/phase-21/p21-t9-roadmap-repositioning.md) | Update roadmap overview and sequencing so the Ralph-focused conversion track is visible after the current blueprint-system phase. |
| [P21-T10](../tasks/phase-21/p21-t10-decision-log.md) | Add decision-log entries documenting why the product shifted from a generic wrapper to Ralph operator desktop and what compatibility will be preserved. |

## Dependencies

- Existing Ralph runtime, scheduler, safety, bootstrap, intake, delivery, portfolio, and blueprint modules must remain discoverable in the codebase.
- The team must agree that Ralph is the primary product name and user-facing workflow for the next release track.
- Current wrapper capabilities must be treated as platform infrastructure rather than deleted scope.
- Any naming change must preserve enough historical context for contributors to understand older Knuthflow references in commit history and existing data.

## Exit Criteria

- `PRD.md` no longer reads as a placeholder or generic terminal-wrapper PRD; it defines Ralph as the product with concrete requirements and release acceptance criteria.
- `README.md` introduces Ralph first and describes Claude Code, PTY sessions, workspaces, settings, editor, and history as supporting runtime capabilities.
- `roadmap/README.md` lists the Ralph-focus phases and explains how they convert the existing desktop platform into a Ralph-first product.
- The product glossary defines core Ralph concepts consistently enough that UI copy, IPC names, tests, and docs can be migrated without inventing new terms.
- There is an explicit decision log entry covering product repositioning, temporary compatibility aliases, and data migration policy.
- A contributor reading only the README and PRD can accurately explain what Ralph does, who it is for, what the first user workflow is, and what is out of scope.
