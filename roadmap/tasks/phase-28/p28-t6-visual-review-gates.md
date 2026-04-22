# P28-T6 - Visual Review Gates

## Phase

[Phase 28 - Preview Evidence and Visual Validation](../../phases/phase-28-preview-evidence-visual-validation.md)

## Objective

Add visual approval gates before release confirmation so delivery cannot ignore failed or missing preview evidence.

## Deliverables

- Add delivery gate requiring fresh visual evidence for supported app types.
- Block release confirmation on failed visual smoke checks unless an operator approves an override.
- Record visual approval or override decisions with timestamp and reason.
- Support explicit skip when preview validation is not applicable.
- Surface visual gate status in delivery checklist.

## Dependencies

- P28-T5 visual artifact viewer exists.
- Delivery panel supports approval gates.
- Phase 29 policy may later govern override permissions.

## Acceptance Criteria

- Delivery review shows visual gate pass, fail, skipped, or overridden state.
- Failed visual validation blocks release by default.
- Overrides are explicit and auditable.
- Unsupported app types can skip with a documented reason.
