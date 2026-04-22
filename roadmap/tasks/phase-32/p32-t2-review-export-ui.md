# P32-T2 - Review Export UI

## Phase

[Phase 32 - Collaboration and Review Handoff](../../phases/phase-32-collaboration-review-handoff.md)

## Objective

Add review bundle export from Ralph dashboard and delivery views.

## Deliverables

- Add export action for selected project/run.
- Let operator choose bundle destination.
- Show included sections and any exclusions before export.
- Generate bundle using the P32-T1 format.
- Show success/failure with destination path and recovery guidance.
- Add export progress for large artifacts.

## Dependencies

- Review bundle format is defined.
- Filesystem save/export APIs are available.

## Acceptance Criteria

- Operators can export a review bundle from dashboard or delivery view.
- Export preview explains what will be included.
- Failed export does not corrupt partial output.
- Exported bundle validates against the manifest format.
