# P27-T3 - Guided Sample Brief

## Phase

[Phase 27 - Operator Onboarding and Guided First Run](../../phases/phase-27-operator-onboarding-guided-first-run.md)

## Objective

Add guided first app brief templates and progressive intake defaults so new operators can complete a safe first Ralph project.

## Deliverables

- Provide sample app brief templates for a small web app, desktop utility, and API service where supported.
- Pre-fill safe defaults for success criteria, stack preferences, forbidden patterns, target platforms, and delivery format.
- Let the operator edit sample values before blueprint generation.
- Keep advanced intake options available through progressive disclosure.
- Mark sample-generated projects so support/debugging can identify first-run projects.
- Avoid templates that require unavailable dependencies by default.

## Dependencies

- App intake and blueprint generation APIs are available.
- Phase 23 new project entry flow is stable.

## Acceptance Criteria

- A new operator can create a valid first intake draft in under a few steps.
- Sample templates produce valid blueprints.
- Advanced options do not overwhelm the first-run path.
- The operator can abandon the sample path and enter a custom brief.
