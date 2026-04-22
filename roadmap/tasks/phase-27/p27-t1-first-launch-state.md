# P27-T1 - First Launch State

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Add local first-launch and onboarding completion state so Ralph can show guided setup only when it is useful.

## Deliverables

- Add persisted onboarding state for first launch, onboarding started, onboarding completed, and onboarding dismissed.
- Track the first successful Ralph-ready workspace setup separately from simple app launch.
- Add a safe reset path so onboarding can be replayed from settings or help.
- Define how onboarding state behaves when app data is migrated from older Knuthflow/Ralph releases.
- Ensure the default Ralph dashboard still loads when onboarding has already completed.

## Dependencies

- Settings or local storage persistence is available.
- Phase 22 default route and Phase 23 Ralph project flow are stable.

## Acceptance Criteria

- First-time users see onboarding before the normal dashboard.
- Returning users with completed onboarding land directly in Ralph.
- Onboarding state survives app restart.
- Resetting onboarding does not delete projects, settings, runs, or local data.
