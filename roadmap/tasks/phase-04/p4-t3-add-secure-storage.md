# P4-T3 - Add Secure Storage

## Phase

[Phase 04 - Settings and Local State](../../phases/phase-04-settings-and-local-state.md)

## Objective

Store sensitive values using OS-backed secure storage rather than plaintext files or database records.

## Deliverables

- Secure storage abstraction for supported platforms
- Mapping between app profiles and secret references
- Fallback behavior for unavailable secure-storage environments
- Clear user messaging around secret handling

## Dependencies

- [P4-T1](./p4-t1-persist-settings-and-profiles.md)

## Acceptance Criteria

- Sensitive values are not stored in plaintext SQLite
- Secret retrieval works when launching relevant flows
- Failures in secure storage surface clearly
- The storage abstraction can support multiple platforms

## Status

Not Implemented

