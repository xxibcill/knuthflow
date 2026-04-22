# P21-T2 - Users And Jobs

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Define Ralph's primary and secondary users, their constraints, and their jobs to be done across app creation, run supervision, delivery, and maintenance.

## Deliverables

- Define the primary user as a local operator responsible for turning app ideas into working deliverables with Ralph.
- Define secondary users such as developers reviewing output, product owners approving briefs, and maintainers handling post-delivery work.
- Replace placeholder user tables in the PRD with real Ralph user types, contexts, needs, and usage frequency.
- Write jobs to be done for creating an app brief, reviewing a blueprint, supervising a run, inspecting evidence, approving delivery, and responding to maintenance signals.
- Document user constraints around trust, local machine dependencies, long-running tasks, interruptibility, and need for visible approval gates.
- Identify what users need to understand before trusting Ralph to make changes in a workspace.

## Dependencies

- Product definition from P21-T1 is drafted or approved.
- Current Ralph workflow modules are known: intake, blueprint, bootstrap, runtime, artifacts, delivery, portfolio, and maintenance.

## Acceptance Criteria

- The PRD has concrete primary and secondary user sections with no placeholder rows.
- Jobs are written as user outcomes, not internal implementation tasks.
- User constraints directly inform later requirements for safety, evidence, approvals, and recovery.
- The documented users match the Ralph-first app flow planned in Phase 23.
