# Phase 13 - Goal To App Bootstrap

## Functional Feature Outcome

Users can start from a plain-language app goal inside Knuthflow and get a bootstrapped workspace with generated Ralph control files, app specs, scaffold choices, and an execution-ready initial plan.

## Why This Phase Exists

Phase 12 is about making Ralph a real loop inside an existing repository. That still falls short of the user expectation of "make me an app from this app." To close that gap, Knuthflow needs a first-class intake flow that can turn a product brief into a concrete workspace, deterministic spec stack, scaffolded project shape, and machine-usable `fix_plan.md` before autonomous execution begins. Without this phase, Ralph still depends on the operator to do too much setup manually.

## Scope

- Add a desktop workflow for capturing a product brief, stack choices, platform targets, and delivery constraints.
- Generate an operator-reviewable Ralph blueprint including `PROMPT.md`, `AGENT.md`, `specs/`, acceptance gates, and initial task graph.
- Support greenfield workspace initialization and starter app scaffolding for supported app templates.
- Require explicit operator approval before the app-building loop begins from the generated blueprint.

## Tasks

| Task | Summary |
| --- | --- |
| [P13-T1](../tasks/phase-13/p13-t1-product-intake-and-blueprint.md) | Convert a user’s app brief into structured product, technical, and acceptance documents Ralph can execute against. |
| [P13-T2](../tasks/phase-13/p13-t2-workspace-scaffolding-and-templates.md) | Create or prepare a workspace with supported starter templates, dependencies, and deterministic control-file defaults. |
| [P13-T3](../tasks/phase-13/p13-t3-kickoff-review-and-approval.md) | Add a desktop kickoff review that lets the operator inspect, edit, and approve the generated app plan before autonomous build execution starts. |

## Dependencies

- Phase 12 delivers a real Ralph controller, deterministic plan semantics, and working operator actions.
- The app already supports workspace management, editor access, and Ralph console bootstrapping.
- The team agrees on a constrained first set of supported app targets and starter stacks instead of arbitrary framework generation.

## Exit Criteria

- A user can enter an app brief in Knuthflow and generate a complete Ralph-ready workspace plan without manual file setup.
- The generated workspace includes deterministic specs, acceptance gates, and an initial `fix_plan.md` that the loop controller can consume directly.
- The operator can review and approve the generated blueprint before Ralph begins autonomous execution.
