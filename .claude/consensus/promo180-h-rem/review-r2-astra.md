F1 — **Medium, resolved.** The fixture places all players before the three monsters, making the monster segment match the runtime’s complete request ([test:111](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/tests/unit/tools/ai-dm-conversation.test.ts:111)). Expiry now occurs only after mechanics and actor-set validation succeed ([conversation:5456](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/tools/ai-dm-conversation.ts:5456)). The test checks all three validated actor IDs, directly asserts the helper returned `null`, and retains the refused-row/deadline/zero-segment assertions ([test:1110](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/tests/unit/tools/ai-dm-conversation.test.ts:1110)).

No new findings.

**Verified claims**

- The observer receives the helper’s result before fallback replacement ([conversation:5473](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/tools/ai-dm-conversation.ts:5473)). An uncalled observer leaves `undefined`, which cannot satisfy `toBeNull()`.
- The recorded mutation fails specifically at that null assertion with three returned entries; the restored run passes ([mutation log:474](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/.tmp/promo180-h-rem-02-recalc-mutation.log:474), [restored log:6](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/.tmp/promo180-h-rem-02-recalc-restored.log:6)). The current helper retains its post-validation deadline check ([conversation:2516](/home/vagrant/PhpstormProjects/dnd-wt-p-promo180/tools/ai-dm-conversation.ts:2516)).
- The complete round-2 diff matches the supplied artifact and changes only the two stated files for F1. Round-1 escalation fixes, adoption-expiry guards, speculation assertions/receipts, and the arena chain-evidence assertion remain unchanged.
- HEAD is `ced82dc2` on `claude/p-promo180`; the worktree is clean. No forbidden added patterns. Frozen contract hash remains `0f0e1d8f…18e1`; binding plan hash remains `699254a4…8813`.

No tests or builds ran during this review. The 39-file/600-test cumulative pass is supplied supervisor evidence.

VERDICT: ACCEPT
review complete