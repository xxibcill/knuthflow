# P26-T8 - Blueprint Reuse Tracking

## Phase

[Phase 26 - Post-Release Stability and Iteration Foundation](../../phases/phase-26-post-release-stability-and-iteration-foundation.md)

## Objective

Wire blueprint reuse tracking so successful patterns can be identified and captured as reusable assets.

## Deliverables

- Add a blueprint_usage table or equivalent in SQLite to track which blueprints are used in which runs, with outcome data.
- Add IPC handlers to record blueprint usage on run completion and query blueprint effectiveness metrics.
- Connect blueprint usage tracking to the learning feedback loop foundations (P26-T5).
- Create a blueprint performance view in the operator console showing usage count, success rate, and average milestone count per blueprint.
- Ensure blueprint usage data is suitable for identifying high-value blueprints for promotion or curation.
- Verify that Phase 20 (Skill Library and Blueprint System) integration points are present and documented.

## Dependencies

- P26-T5 learning feedback loop foundations are in place.
- Phase 20 design is available for reference.
- Blueprint surface exists from Phase 23 or earlier.

## Acceptance Criteria

- Blueprint usage is recorded on each run completion.
- Blueprint performance view shows usage count, success rate, and outcome distribution.
- High-value blueprints can be identified from usage data.
- Blueprint reuse tracking does not capture project-specific file contents or operator data.
- Phase 20 integration points are documented.
