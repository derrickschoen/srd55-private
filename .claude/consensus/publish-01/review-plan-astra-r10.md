**VERDICT: REJECT — 0 P1 / 1 P2 / 1 P3.**

All three supplied hashes and line counts match. D823’s narrative-scrub closure remains closed.

**P2-1 — The frozen audit still depends on live worktree metadata.**

The [plan at line 361](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:361) requires stdout to “byte-equal the appendix block.” However, the generator discovers worktrees dynamically at [line 290](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:290) and prints that list at [line 937](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:937).

Current reproduction differs from the [ledger’s worktree row](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:22):

- Actual output: **18,666 bytes**.
- Recorded block: **18,642 bytes**.
- Sole difference: the additional worktree basename **`dnd-wt-dm-best-effort`**.
- Supplying the recorded worktree vocabulary restores complete byte equality.

This also affects the new scratch-clone witness: a simulated ordinary clone named `publish-01-scratch` fails with **“primary worktree basename was not discovered”**, before manifest verification, because of [generator line 295](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:295).

**Required:** make the frozen audit’s discovery vocabulary reproducible independently of checkout location and live worktree registrations. Keep current discovery as a separately reviewed publication check. Merely refreshing the appendix would leave the same failure on the next worktree change.

**P3-1 — Two stale counts remain.**

[Plan lines 252–254](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:252) say **“Exactly 20”** rewrites and **“three”** protocol exceptions while enumerating four. Correct these to **19** and **four**. The generator and ledger already agree.

The requested checks otherwise produced these results:

1. **Content binding:** independently recomputed the selected-vector hash from `git ls-tree`:
   `0903baad152767f2010b0468784a990d70fa329949ce14b64b29d23938e4640b`.
   The [vector calculation](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:202) and [D→F check](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:834) eliminate the enclosing-commit dependency. Production-format F/D passed against two independently serialized in-memory Git commit views; neither file contained its enclosing SHA. A selected-blob byte change, F-byte change, and corrupted D digest each failed. **No real scratch commit was created: filesystem writes and Git writes are prohibited.** The committed-production witness remains an implementation requirement.

2. **Pi:** the [exact exception](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:598) and [missing-cwd resume requirement](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:549) are present. Executing the actual adapter with an in-memory filesystem and mocked runner recreated the recorded cwd before resume; the renamed-prefix mutant failed. This invoked no model. The remaining **19 rewrites** comprise fourteen prose/comment occurrences, one disposable OpenCode config pathname, and four build/test cache identifiers; no additional persisted-format input was identified.

3. **Batches:** **21 batches, maximum ten files, B21 cumulative and last**. F/D slots cover committed selected-input edits. B8–B10 rely on the explicit requirement that their source editions are curator-only transformations and private blobs remain unchanged. No stale `post-B1` reference remains.

4. **Inventory and decoding:** **193 occurrences / 175 lines; 174 retained / 19 rewrites**. All **193 keys** independently recompute. Punctuation, table-cell, hyperlink-field, formatting-boundary and real archive witnesses pass across **135 RTF members**. The exact audit invocation timed out at the Git batch-read boundary; reproduction used verified blobs with only that transport replaced. The worktree-row discrepancy above remains.

5. **Selection and identity:** all **1,136 selected blobs / 26,798,325 bytes** match `76d9553d` and working files. Robots plus seven generated files accounts for **1,144**. Both migration checksums reproduce unchanged; the bundled artifact hash, aggregate, **444 ordered entries**, and entry-vector hash all match.

6. **Ten additional full-file samples:** catalog `catalog-data-migrations-errors`, `catalog-schema-errors`, `content-identity-errors`, `source-catalog-records-errors`; grants `equipment-grants-errors`; access `spell-slot-assignment-errors`, `spell-access-errors`; reports `build-report-errors`; sharing `character-share-errors`; worker `character-command-errors`. Prior logs show inventory references but no identified full-file reads. No additional publication finding.

Return to the owner under the stated escalation rule. No files were changed, and no network or agent calls were made.

PUBLISH-01 PLAN REVIEW R10 DONE