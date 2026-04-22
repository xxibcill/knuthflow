# P30-T6 - Connector Artifacts

## Phase

[Phase 30 - Tool Connector Hub](../../phases/phase-30-tool-connector-hub.md)

## Objective

Record connector inputs, outputs, and failures as Ralph artifacts for audit and review.

## Deliverables

- Define artifact types for connector input, connector output, connector failure, and connector health.
- Attach connector artifacts to project, run, delivery, or maintenance context.
- Redact secrets and sensitive headers before storage.
- Surface connector artifacts in run dashboard and review bundles.
- Include connector failures in recovery guidance.

## Dependencies

- Artifact storage and viewer are available.
- Secure secret redaction rules are implemented.

## Acceptance Criteria

- Connector operations leave a reviewable evidence trail.
- Artifacts exclude credentials and sensitive raw payloads by default.
- Failed connector operations are visible and recoverable.
- Review bundles can include connector evidence when policy allows.
