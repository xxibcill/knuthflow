# P22-T7 - Terminal Secondary Position

## Phase

[Phase 22 - Ralph Brand and Shell](../../phases/phase-22-ralph-brand-and-shell.md)

## Objective

Keep direct terminal access available while making Ralph run controls the primary way to start managed work.

## Deliverables

- Change CTA hierarchy so `Start Ralph Run` outranks `New Session`.
- Show direct `New Session` only in terminal/debug context or advanced operator areas.
- Label Ralph-owned terminal sessions differently from ad hoc terminal sessions.
- Add navigation from Ralph run details to the associated terminal session.
- Ensure stopping a terminal session does not obscure Ralph run state or recovery guidance.
- Preserve generic terminal functionality for debugging and manual intervention.

## Dependencies

- Existing session launch and tab logic remains available.
- Phase 23 terminal linkage task will add deeper run/session association.

## Acceptance Criteria

- Users are not encouraged to start unmanaged terminal sessions as the main workflow.
- Advanced users can still open and use a terminal when needed.
- Ralph-owned sessions are distinguishable from generic sessions.
- Existing terminal tests continue to pass or are updated for the new CTA placement.
