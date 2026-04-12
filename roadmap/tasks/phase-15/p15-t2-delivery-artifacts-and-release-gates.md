# P15-T2 - Delivery Artifacts And Release Gates

## Phase

[Phase 15 - Desktop One-Shot Delivery](../../phases/phase-15-desktop-one-shot-delivery.md)

## Objective

Make Knuthflow produce a disciplined delivery bundle with explicit release gates instead of ending app generation at “code exists.”

## Deliverables

- Final-artifact generation for supported targets such as packaged builds, startup instructions, release notes, and operator runbooks.
- Release-readiness gates that require validated build/test/package evidence before handoff is marked complete.
- A consistent artifact manifest describing what was produced, where it lives, and which validations back it.

## Dependencies

- Review and packaging UI from `P15-T1`.
- Validation and artifact pipelines from earlier Ralph phases.

## Acceptance Criteria

- Completing an app-generation run yields a coherent delivery bundle rather than only source changes in the workspace.
- Release completion is blocked when required validation or packaging evidence is missing.
- Operators can inspect a manifest showing each final artifact and the gate that approved it.
