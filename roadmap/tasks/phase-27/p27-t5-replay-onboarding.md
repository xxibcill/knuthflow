# P27-T5 - Replay Onboarding

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Add a settings or help action that lets operators replay onboarding without resetting their local Ralph data.

## Deliverables

- Add a visible "Replay onboarding" or equivalent action in settings/help.
- Reset only onboarding UI state, not projects, workspaces, settings, runs, or artifacts.
- Allow exiting replay mode back to the current Ralph dashboard.
- Ensure dependency checklist and sample brief paths behave the same in replay mode.
- Document replay behavior in operator guidance.

## Dependencies

- P27-T1 onboarding state exists.
- Settings/help surface is available.

## Acceptance Criteria

- Operators can replay onboarding after completing it.
- Replay mode does not create duplicate projects unless the operator explicitly creates one.
- Exiting replay mode returns to the prior app context when possible.
- The action is discoverable but not intrusive.
