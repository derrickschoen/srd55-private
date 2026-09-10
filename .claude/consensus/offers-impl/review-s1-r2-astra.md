No new findings. Round-1 F1 is resolved.

**Verified claims**

- **Independent oracle:** Expected bodies, IDs, count, and generation order are fixed literals at [standard-offer-generator.test.ts:14](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:14). Current production code supplies only the actual values at lines 202–203.
- **Sound parent extraction:** The archived registry differs from `79ab36f4` only by the import and dump instrumentation. The dump captures completed `values` before classification at [parent registry:812](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp/parent-79ab36f4/src/vtt/turn-option-registry.ts:812), correctly retaining stationary Disengage. All six literal bodies, IDs, and their ordered inventory match that dump. I independently recomputed their canonical hashes without executing production code.
- **Named mutants fail:** At [test:205](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:205), dropping a declaration fails count/inventory; changing a label or Dash’s budget fails literal-body and ID comparisons. Serialized binding also fails.
- **Ordering and rider limits:** Reordering declarations fails the ordered assertions. Merely reordering object properties does **not** fail: deep equality ignores insertion order, and [canonical-json.ts:57](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/commands/canonical-json.ts:57) sorts keys before hashing. Thus this pins canonical bodies, not raw JSON property order. Changing a fixture’s empty `omittedRiders` value fails; globally discarding nonempty riders is outside this fixture’s coverage but fails the retained independent assertion at [monster-omitted-riders.test.ts:58](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/monster-omitted-riders.test.ts:58).
- **Preservation scope:** These are complete independent pins for the six-option fixture, supplementing the retained consumer tests as [plan:496](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:496) requires. They do not alone exhaust every standard action family.
- **No round-1 regression:** Only the specified test file changed. Capability/port assertions remain byte-identical; production code and other preservation pins are untouched. Both supplied hashes still match, no forbidden patterns were introduced, and the working tree is clean.

No tests, builds, agents, or sibling-worktree access were performed.

VERDICT: ACCEPT

review complete