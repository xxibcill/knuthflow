# P33-T1 - Extension Manifest

## Phase

[Phase 33 - Extension SDK and Automation Hooks](../../phases/phase-33-extension-sdk-automation-hooks.md)

## Objective

Define extension manifest, capability, and permission schema for governed local Ralph extensions.

## Deliverables

- Define manifest fields for id, name, version, author, description, entry points, capabilities, permissions, configuration schema, and compatibility range.
- Define supported extension types: blueprint provider, scaffold template, validator, artifact analyzer, delivery target, connector provider, policy check, and run hook.
- Define permission categories for filesystem, command execution, connector access, network, project metadata, and artifact access.
- Add manifest validation and error reporting.
- Document manifest examples for common extension types.

## Dependencies

- Phase 29 policy model exists.
- Phase 30 connector abstractions and Phase 20 blueprint concepts are available.

## Acceptance Criteria

- Extension manifests can be validated before loading code.
- Capabilities and permissions are explicit.
- Invalid manifests produce actionable diagnostics.
- Manifest docs are sufficient to create a minimal extension.
