# P11-T4 - Publish Operator Docs and Release Checklist

## Phase

[Phase 11 - Recovery and Release Readiness](../../phases/phase-11-recovery-and-release-readiness.md)

## Objective

Publish the operator-facing guidance, templates, and release checklist needed to dogfood Ralph mode responsibly inside Knuthflow.

## Deliverables

- An operator guide for bootstrapping Ralph projects and interpreting loop state
- Example templates for `PROMPT.md`, `AGENT.md`, `fix_plan.md`, and `specs/`
- A release checklist for autonomous mode
- A decision log of known limits, unsupported workflows, and risk boundaries

## Dependencies

- [P7-T2](../phase-07/p7-t2-bootstrap-ralph-control-stack.md)
- [P11-T3](./p11-t3-build-dry-run-harness-and-loop-test-matrix.md)

## Acceptance Criteria

- Internal operators can bootstrap and run Ralph projects using the published docs
- Example templates match the bootstrap behavior shipped by the app
- Release readiness for autonomous mode is explicit and repeatable
- Known limitations are documented instead of being left implicit
