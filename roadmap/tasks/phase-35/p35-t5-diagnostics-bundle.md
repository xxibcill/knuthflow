# P35-T5 - Diagnostics Bundle

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Export runtime diagnostics bundle for support and operator troubleshooting.

## Deliverables

- Include app version, platform, service health, recent logs, run state summaries, database status, dependency checks, connector health, and extension status.
- Redact secrets, tokens, local-only sensitive paths where policy requires.
- Let operators choose destination and scope.
- Include manifest and generation timestamp.
- Add failed-export handling.

## Dependencies

- Runtime health model and diagnostics services exist.
- Secret redaction rules are available.

## Acceptance Criteria

- Operators can export diagnostics without cloud services.
- Bundle contains enough context for support.
- Secrets are redacted.
- Export does not mutate project state.
