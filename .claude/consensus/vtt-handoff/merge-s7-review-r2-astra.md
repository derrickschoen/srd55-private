**F96 RESOLVED.** In [engine-boundary.test.ts:196](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:196), both `Document` and `HTMLElement` are restored. The controls at [line 778](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:778) and [line 784](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:784) require the exact diagnostics `Document to Document` and `HTMLElement.prototype to HTMLElement`.

The S6 provenance analyzer is unchanged; the shadowed-document control retains its exact empty-array expectation at [line 829](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:829).

The diff contains only these 13 added lines in one file, with no deletions or other changes. No new findings. Review was read-only; no tests were run.

ACCEPT MERGE