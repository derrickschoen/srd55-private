# VIS-FIELD REBASE — astra review r2 (medium, resumed 01a0a642…, 1.47 M tokens cumulative): ACCEPT, two P3 comment corrections

REBASE-F1 is closed under D635.20. The exact 27-pair bounds match my r1 enumeration. Two nonblocking documentation findings remain.

### REBASE-F2 — P3: Two representative rays start outside the named creature’s footprint

- [ai-dm-conversation.test.ts:277](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-conversation.test.ts:277): monster-3 occupies `(15..16,3..4)`, so `(15,6)` is not a source corner. Replace the example with **`(15,5)→(1,3)`**, crossing `(8,4)` for **`3/7<t<1/2`**.
- [ai-dm-conversation.test.ts:314](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-conversation.test.ts:314): monster-6 occupies `(9..10,5..6)`, so `(9,8)` is not a source corner. Use **`(9,7)→(3,5)`**, crossing `(6,6)` for **`1/3<t<1/2`**.

I independently checked both replacements: each crosses exactly the removed wall cell before the edit and no wall cell afterward. The pinned pairs are correct; only their explanatory rays need correction.

### REBASE-F3 — P3: Relocation report overcounts valid adjacent positions

[impl-rebase-fix-r3-sol.md:19](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-rebase-fix-r3-sol.md:19) calls seven candidates valid. Both `(9,6)` **and `(10,6)`** overlap the Large Warhorse Skeleton. There are **six unoccupied adjacent positions**.

**Fix:** Correct the count. This does not undermine the exhaustion argument: the reported search includes all six, and my geometric probe found **all eight neighboring anchors blocked to all three players**. I did not rerun the filesystem-dependent three-round simulations.

## Verification

**Ran independently:**

- `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit` — **exit 0**.
- `git diff --check 658e2a23 ec922c37` — **exit 0**.
- `git diff --numstat 658e2a23 ec922c37` — **one test file, 132+/11−**; no production changes.
- Diff audit — **zero removed assertion lines**, **zero added lines over 120 columns**.
- In-memory Vitest probe invoking all three production-backed fixture helpers — **1 passed, 110 skipped**:
  - Hard: **5 opened / 0 closed**.
  - Brutal-2: **10 opened / 0 closed**.
  - Brutal-3: **12 opened / 0 closed**.
  - **Zero pair disagreements** with r1 across the **54 examined pairs**.
- Python `Fraction` arithmetic — checked **all 27 printed t-ranges**, with **zero arithmetic mismatches**. The two invalid source corners are distinguished above.
- In-memory tracer mutant opening the additional brutal-2 `monster-1→fighter` pair only after re-authoring — **killed**, **1 failed / 110 skipped**, at line 216: **11 received pairs versus 10 expected**.

The Vitest commands used `node --input-type=module`, `startVitest`, `config:false`, `cache:false`, one thread worker, and an in-memory transform appending the review callback. No files were edited.

**Read and confirmed:**

- Lines **194–201** pass the same `sourceAnchor` options to both before/after traces. Lines **248–250** supply `(13,1)` for monster-2, matching the documented post-move Spear position.
- Lines **216–217** assert exact opened-list equality and an empty closed list; every fixture calls that helper.
- Comments acknowledge interior openings and no longer claim seam-only changes.
- Existing control-flow assertions are unchanged.

**Pin scope:** An additional *pair opening caused by the fixture edit* fails the exact-list assertion, as my mutant demonstrated. These are pair-delta pins, not exhaustive ray pins: extra rays within an already-visible pair, or identical erroneous visibility changes in both before/after states, can leave the delta unchanged.

Production SHA-256 values remained unchanged before/after:

```text
cover.ts     c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662
encounter.ts 7fcb2f3b9d6977d16a8ba48e2fa0810805ff6236f87e26bc92dc19785537eedb
```

Worktree remained clean. The supervisor’s four full-flow passing titles remain supervisor evidence.

VERDICT: ACCEPT
REVIEW DONE