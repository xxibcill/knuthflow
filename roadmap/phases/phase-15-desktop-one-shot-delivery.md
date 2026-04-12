# Phase 15 - Desktop One-Shot Delivery

## Functional Feature Outcome

Users can request an app from Knuthflow, watch Ralph build it, review the result in the desktop UI, and receive a reviewable packaged output with explicit approval gates and final delivery artifacts.

## Why This Phase Exists

Even a successful long-horizon build is not yet a complete "one-shot app from this app" experience if the operator cannot review, approve, package, and hand off the result from the same desktop product. This phase exists to make the final step concrete: the desktop app must expose a coherent delivery workflow that turns Ralph’s autonomous work into something reviewable, runnable, and shippable without dropping back to manual shell choreography.

## Scope

- Add desktop review surfaces for generated app structure, runtime previews, milestone summaries, and release readiness.
- Support packaging/export flows for supported app targets and collect final delivery artifacts in one place.
- Add explicit approval gates for high-impact actions such as dependency installs, packaging, and final handoff.
- Build end-to-end test coverage for the one-shot app workflow from brief intake to packaged output.

## Tasks

| Task | Summary |
| --- | --- |
| [P15-T1](../tasks/phase-15/p15-t1-review-packaging-and-handoff-ui.md) | Build the desktop review and handoff flow for inspecting the generated app, approving packaging, and collecting final outputs. |
| [P15-T2](../tasks/phase-15/p15-t2-delivery-artifacts-and-release-gates.md) | Produce final artifacts such as packaged builds, runbooks, and release checklists with explicit safety and approval gates. |
| [P15-T3](../tasks/phase-15/p15-t3-end-to-end-one-shot-harness.md) | Add scenario coverage proving a user can go from app brief to reviewable output through the Knuthflow desktop workflow. |

## Dependencies

- Phase 14 provides stable long-horizon app-building execution and validation feedback loops.
- The app has a supported set of packaging/export targets with deterministic local commands.
- Operator approvals remain part of the product model for risky or expensive actions.

## Exit Criteria

- A user can run the complete app-generation workflow from the desktop UI without dropping into ad hoc shell steps.
- Knuthflow produces a coherent handoff bundle containing the generated app, validation evidence, and release artifacts for supported targets.
- End-to-end tests cover the one-shot workflow, including at least one happy path and one approval- or validation-blocked path.
