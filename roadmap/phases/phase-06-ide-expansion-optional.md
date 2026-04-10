# Phase 06 - IDE Expansion Optional

## Functional Feature Outcome

Knuthflow can add an editor, diff review, and richer side-panel workflows without degrading the terminal-first experience.

## Why This Phase Exists

This phase is intentionally optional. It should only happen if the product needs to compete as a lightweight IDE rather than a high-quality desktop wrapper.

## Scope

- Decide whether editor mode is justified
- Add Monaco if needed
- Build patch and diff review flows
- Add richer side panels around the Claude workflow

## Tasks

| Task | Summary |
| --- | --- |
| [P6-T1](../tasks/phase-06/p6-t1-finalize-ide-mode-decision.md) | Decide whether IDE features belong in the next release line |
| [P6-T2](../tasks/phase-06/p6-t2-add-monaco-editor-pane.md) | Integrate Monaco and open files within the app |
| [P6-T3](../tasks/phase-06/p6-t3-build-diff-and-patch-review.md) | Show file diffs and patch review before applying changes |
| [P6-T4](../tasks/phase-06/p6-t4-add-side-by-side-workflow-panels.md) | Support prompt, code, output, and review side panels |

## Dependencies

- Phase 05 complete
- Product leadership confirms that IDE-like workflows are worth the additional complexity

## Exit Criteria

- Editor mode has a clear reason to exist
- Monaco integration does not weaken terminal stability
- Patch review is usable on realistic multi-file changes
- The UI can support richer workflows without becoming cluttered

