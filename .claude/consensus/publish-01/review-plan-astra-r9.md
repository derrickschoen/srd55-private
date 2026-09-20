# PUBLISH-01 — astra HIGH plan review r9 (session 01a0c06f-f596-7a41-8a6d-d4ac4dc043ad, 183,365 tokens, final message only)

**VERDICT: REJECT — 0 P1 / 3 P2 / 0 P3.**

All three supplied hashes and line counts match. D823’s narrative-scrub closure remains closed.

**P2-1 — Production manifests require a self-referencing Git commit hash.**

[Plan line 363](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:363) requires reading F “from that commit”; D also carries that commit.

The generator:

- Reads F through `git show ${commit}:${path}` and requires `parsed.commit === commit` at [lines 155–167](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:155).
- Reads D from that same commit and requires `document.commit === commit` at [lines 811–819](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:811).

Writing the enclosing commit’s SHA into either committed file changes the enclosing commit. This requires a cryptographic fixed point. An in-memory Git-object probe confirmed that inserting the resulting SHA produces another SHA; neither candidate satisfies the checks.

The stdin fixture succeeds because its manifest lives outside the commit. It does **not** establish production feasibility.

**Required:** bind committed F/D to the selected content vector without embedding their enclosing commit SHA, or explicitly separate source and policy commits. Require a successful committed-production-manifest witness, beyond the stdin fixture.

**P2-2 — Pi’s remaining directory rewrite changes persisted session state.**

[Ledger line 109](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:109) calls Pi line 206 “only a freshly derived temporary MCP directory.”

But [pi.ts:70](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/agent-adapters/pi.ts:70) passes that directory as process `cwd`, and [line 81](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/agent-adapters/pi.ts:81) explicitly states:

> “Pi persists the session cwd. This directory is intentionally stable”

I verified the installed Pi implementation: `SessionManager.open()` restores the header’s `cwd`; print mode exits 1 when it is missing.

For an existing session file whose old MCP directory has disappeared:

- Private code recreates the recorded `dnd-wt-vtt-pi-mcp-<digest>` directory.
- The proposed public code creates `srd55-vtt-pi-mcp-<digest>`.
- Pi still checks the old recorded directory and refuses resume.

An in-memory probe using the actual directory function and installed Pi cwd-check helper passes for the private path and reports missing stored cwd for the proposed replacement. The existing simulated adapter test also requires identical start/resume cwd at [line 723](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/vtt/agent-adapters.SIMULATED.test.ts:723).

**Required:** retain this prefix by exact exception or specify a preservation mechanism. Extend the cross-edition witness to include a persisted Pi session header and recreation of its missing MCP directory. Update inventory counts and keys accordingly.

The three new exceptions themselves are correct: HMAC key, persisted session-file prefix, and MCP wire name.

**P2-3 — Mandatory manifest updates do not fit the batch allowlists.**

[Plan line 371](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:371) requires:

> “Every batch changing selected paths/bytes or occurrence keys updates F/delta in that batch”

[Line 565](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:565) says listed paths alone may change. Yet:

- B5 already lists ten files, changes selected documents, and includes neither F nor D.
- B10–B12 each allocate ten homebrew files and include neither F nor D. Their authorized markers/licence edits change selected blob identities.
- Other affected batches omit F, including B6 and B15.

Adding even F exceeds the ten-file limit in the full batches. Deferring these updates to B17 contradicts the per-batch requirement.

**Required:** reserve policy-update slots and rebalance affected batches. Correct stale “post-B1” references: D129 additions now occur in B3.

The remaining requested checks produced these results:

- **Audit reproduction:** the exact invocation stalled at Git’s batch-input boundary, as in r8. With only batch transport replaced by individual blob reads—and every blob verified against its Git object ID—the unchanged scanner produced **18,630 bytes / 72 lines, byte-identical to the entire ledger marker block**, including its heading.
- **Counts:** **193 occurrences / 175 lines; source 185/173/60 files; archive 8/2/1 member across 135 scanned; 173 retain / 20 rewrite.**
- **Publication delta enforcement:** baseline stdin-manifest publication passes. An in-memory robots.txt addition passes with **1,137 inputs / 26,798,351 bytes**. Adding `# codex review` fails as an unreviewed occurrence; its explicit delta passes with **194 occurrences / 176 lines / 21 rewrites**. These are fixture witnesses, not a committed production run.
- **Keys:** independently recomputed all **193** occurrence hashes.
- **RTF:** actual decoder/scanner results are:

  | Probe | Decoded text | Codex hits |
  |---|---|---:|
  | `codex\emdash private` | `codex—private` | 1 |
  | `codex\cell private\cell\row` | `codex<TAB>private<TAB><NEWLINE>` | 1 |
  | Hyperlink field | `codex` | 1 |

  Real archive split-word witnesses and positive/negative formatting witnesses also reproduce.
- **Remaining rewrites:** fourteen are prose/comment occurrences; OpenCode’s config pathname is removed after execution; both TypeScript paths and Vite/Vitest paths are build/test caches. Pi’s MCP directory is the additional persisted input identified above. No other rewrite changes localStorage/IndexedDB keys, OPFS paths, database names, share codecs, service-worker scopes, or browser-cache names.
- **Selection and identity:** all **1,136** selected blobs match both `76d9553d` and working files; robots plus seven generated files accounts for **1,144**. Both migration checksums reproduce unchanged. The expected artifact hash, aggregate literal, **444 ordered entries**, and entry-vector hash all match.
- **Batch structure:** declared sizes are `1/10/10/3/10/10/10/9/9/10/10/10/8/7/6/5/7`; every batch has R/V/M, generator work is in B2, and B17 is last. Mandatory update allocations remain defective as above.
- **Ten additional full-file samples:** domain contracts `feature-value-storage-limits`, `historical-row-columns`, `json-columns-errors`, `row-rules-errors`, `rows-errors`; domain `computed`, `weapon-damage`; party `client`, `document-state`, `storage/contracts`. Prior r4–r8 logs show inventory references but no full-file reads of these samples. No additional publication finding.

Full database-import/undo and standalone publication remain implementation witnesses. No files were changed, and no agents, network calls, or builds were invoked. Return to the owner under the stated escalation rule.

PUBLISH-01 PLAN REVIEW R9 DONE
