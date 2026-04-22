# P32-T6 - Secret-Safe Export

## Phase

[Phase 32 - Collaboration and Review Handoff](../../phases/phase-32-collaboration-review-handoff.md)

## Objective

Add secret and file exclusion checks for review bundle exports.

## Deliverables

- Define secret scanning and exclusion rules for environment files, credentials, tokens, logs, connector payloads, and local paths.
- Integrate policy export restrictions.
- Show warnings for excluded or redacted content.
- Fail export when required safety checks cannot run.
- Add tests with fixture secrets to ensure redaction.

## Dependencies

- Phase 29 policy rules and Phase 30 connector redaction rules are available.
- Review export pipeline exists.

## Acceptance Criteria

- Review bundles do not include known secret patterns.
- Excluded files are listed without exposing content.
- Operators can see what was redacted.
- Tests cover at least environment files, token-like strings, and connector secrets.
