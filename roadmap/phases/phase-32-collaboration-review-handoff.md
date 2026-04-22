# Phase 32 - Collaboration and Review Handoff

## Functional Feature Outcome

Ralph can package run context, evidence, diffs, decisions, and delivery artifacts into reviewable handoff bundles for teammates, stakeholders, or future operators.

## Why This Phase Exists

Ralph's operator may not be the only person responsible for accepting an app. Developers may need to inspect diffs, product owners may need to approve scope, QA may need evidence, and maintainers may need run history after handoff. A local desktop product still needs collaboration artifacts that can be shared through files, repositories, or connected tools. This phase makes Ralph output reviewable outside the live desktop session.

## Scope

- Define review bundle format containing brief, blueprint, specs, milestones, plan snapshots, validation evidence, visual evidence, safety decisions, diffs, delivery artifacts, and known limitations.
- Add review bundle export from project dashboard and delivery panel.
- Add role-targeted views or sections for developer review, product review, QA review, and maintenance handoff.
- Add diff summaries and changed-file inventory.
- Add decision history for approvals, overrides, policy violations, and delivery confirmation.
- Add optional connector posting to issue trackers or repositories when configured.
- Add import/open support for review bundles so another operator can inspect context locally.
- Ensure bundles do not include secrets or disallowed local files.

## Tasks

| Task | Summary |
| --- | --- |
| [P32-T1](../tasks/phase-32/p32-t1-review-bundle-format.md) | Define review bundle manifest and content structure |
| [P32-T2](../tasks/phase-32/p32-t2-review-export-ui.md) | Add review bundle export from dashboard and delivery views |
| [P32-T3](../tasks/phase-32/p32-t3-role-targeted-sections.md) | Generate developer, product, QA, and maintenance review sections |
| [P32-T4](../tasks/phase-32/p32-t4-diff-and-decision-history.md) | Add diff inventory and approval/override decision history |
| [P32-T5](../tasks/phase-32/p32-t5-review-bundle-import.md) | Allow Ralph to open review bundles for local inspection |
| [P32-T6](../tasks/phase-32/p32-t6-secret-safe-export.md) | Add secret/file exclusion checks for review exports |

## Dependencies

- Phase 25 delivery artifacts and Phase 28 visual evidence should be available.
- Phase 29 policy should define export restrictions.
- Connector posting depends on Phase 30 if included.

## Exit Criteria

- Ralph can export a review bundle for a completed or in-progress run.
- The bundle includes enough context for a reviewer to understand what Ralph did and why.
- Secrets and disallowed files are excluded.
- Another Ralph instance or operator can open the bundle for inspection.
- Review bundle export is covered by QA or tests.
