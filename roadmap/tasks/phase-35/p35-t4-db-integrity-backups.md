# P35-T4 - DB Integrity Backups

## Phase

[Phase 35 - Runtime Resilience and Self-Healing](../../phases/phase-35-runtime-resilience-self-healing.md)

## Objective

Add database integrity checks and backup points for local Ralph state.

## Deliverables

- Run lightweight integrity checks at startup and before risky migrations.
- Create local backup before schema migrations or data path migrations.
- Add restore guidance for failed migration or detected corruption.
- Keep backups bounded by retention policy.
- Exclude secrets from backups unless secure storage policy supports it.

## Dependencies

- Database migration and local data policy are stable.

## Acceptance Criteria

- Integrity check failures are reported clearly.
- Backups are created before risky DB operations.
- Backup retention prevents unbounded disk growth.
- Restore guidance is documented and tested manually or automatically.
