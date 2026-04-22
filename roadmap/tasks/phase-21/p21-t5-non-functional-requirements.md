# P21-T5 - Non-Functional Requirements

## Phase

[Phase 21 - Ralph Product Source of Truth](../../phases/phase-21-ralph-product-source-of-truth.md)

## Objective

Define reliability, safety, performance, privacy, accessibility, and recovery expectations for a Ralph-focused desktop release.

## Deliverables

- Replace placeholder non-functional requirements with Ralph-specific targets.
- Define reliability expectations for local database integrity, long-running runs, resume/recovery, and crash handling.
- Define safety expectations for explicit operator approval, destructive actions, workspace boundaries, and command execution.
- Define performance targets for app startup, readiness checks, run dashboard refresh, artifact loading, and large project handling.
- Define privacy and local-data expectations for workspaces, secrets, logs, artifacts, and telemetry if any exists.
- Define usability expectations for first-run success, clear lifecycle state, and understandable recovery guidance.
- Define accessibility expectations for keyboard operation, readable status, contrast, focus states, and reduced reliance on color alone.
- Define packaging/update expectations where they affect user trust or data safety.

## Dependencies

- Functional requirements from P21-T4.
- Current platform assumptions for Electron, SQLite, secure storage, logs, and local file access.

## Acceptance Criteria

- `PRD.md` has concrete non-functional requirements with targets or observable expectations.
- Requirements cover safety and recovery as first-class product concerns.
- Targets are realistic for a local desktop app and do not imply unavailable cloud infrastructure.
- QA and release tasks can translate these requirements into checks.
