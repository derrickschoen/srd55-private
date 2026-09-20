# PUBLISH-01 — astra HIGH plan review r7 (session 01a0c01b-9ef2-78a2-b06e-d36b76809904, 147,428 tokens, final message only; first round under D823)

**VERDICT: REJECT — 0 P1 / 3 P2 / 0 P3.**

Verified both supplied hashes and line counts. All checks were local and read-only; no agents, network, builds, or file changes. D823 closes r6 P2-1; ordinary design history is not a finding.

**P2-1 — The mechanical inventory omits five worktree-name occurrences.**

[Ledger lines 24–25](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:24) include **“every basename returned by `git worktree list --porcelain`.”** That includes `dnd-multiclass-spells-static`. Five selected-source occurrences are unlisted:

| File | Line |
|---|---:|
| `src/worker/handlers/commands.ts` | 20 |
| `tsconfig.app.json` | 15 |
| `tsconfig.node.json` | 14 |
| `vite.config.ts` | 215 |
| `vitest.config.ts` | 29 |

These are runtime/cache/build identifiers containing that basename. The ledger’s **“Zero hits … non-prefix worktree basenames”** claim at lines 35–37 is false.

I reproduce **180 occurrences on 168 source lines only when omitting this basename**. Applying the stated policy yields **185 occurrences on 173 source lines**, plus eight archive occurrences: **193 total**. The existing disposition table contains 170 RETAIN and 18 REWRITE entries, leaving five occurrences without dispositions.

**Required:** assign exact dispositions to these five occurrences, update counts and batch scope, and test discovery of the primary worktree basename.

**P2-2 — The occurrence keys do not reproduce under the declared normalization/decoder policy.**

[Ledger lines 39–44](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:39) require the compiler to refuse any **“missing, extra, duplicated or changed key.”** Its own supplied keys would fail:

- Of the 180 source keys, 26 hashes reproduce directly; another 150 require trimming each normalized line, which lines 18–22 do not specify.
- Even allowing that implicit trim, four keys remain incorrect:

| Ledger location | Occurrence | Recorded hash | Recomputed hash |
|---|---|---|---|
| Line 101 | `session-persistence.ts:477`, session-id | `d893dd47fa24e2b3` | `6f3aa2b976766132` |
| Line 101 | `session-persistence.ts:2661`, session-id | `34865a2b97676613` | `34865a2ad20e560c` |
| Line 127 | `plugin.ts:44`, claude | `4a93416fa4aa56dc` | `4a93416fa4ca56dc` |
| Line 142 | `session-persistence.ts:2661`, codex | `34865a2b97676613` | `34865a2ad20e560c` |

Archive counts reproduce: **135 RTF members, eight Codex occurrences on two decoded lines**. However, both hashes in [ledger lines 149–153](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:149) reproduce only when textual controls such as `\emdash`, `\endash`, and `\rquote` are discarded, followed by trimming. Properly decoding punctuation and applying the specified normalization gives line 274’s trimmed hash as `bbfcbfdfb0172485`, not `3d1cc9d537f753ac`.

This affects detection, not merely hashing: discarding `\emdash` turns `codex\emdash private` into `codexprivate`, hiding a mechanical token.

**Required:** specify trimming and textual-control handling explicitly, regenerate all keys mechanically, and add punctuation-boundary witnesses alongside the existing formatting-boundary witnesses. The real `dispatch`/`underground` and synthetic `co{\b}dex` witnesses reproduce correctly.

**P2-3 — Generated provenance conflicts with the fail-closed source scan.**

[Plan line 313](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:313) defines:

> `PUBLIC-SOURCE.txt` — private source SHA

Yet [plan lines 488–491](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:488) require the entire generated source tree to pass the mechanical scan and ledger equality. The private commit SHA is a prohibited token, and the ledger provides no generated-provenance exception.

**Required:** reconcile this explicitly—keep the private mapping in the private sidecar and publish a suitable public identifier, or establish an authorized exact provenance exception represented in the ledger. D779 separately authorizes private-SHA sync commit messages; this finding concerns the generated file and its source gate.

The remaining requested checks pass **at plan level**:

- **Selection:** independently reproduced **1,136 blobs / 26,798,325 bytes**, comprising 1,040 text and 96 binary blobs. Every selected working file matched its committed Git blob. The planned additions account for 1,144 files.
- **18 rewrites:** all sites exist. [Ledger lines 48–70](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:48) bound their treatment; plan lines 361–392 require exact preimages, preserved technical rationale, comment AST equality, and behavioral witnesses for four runtime strings.
- **Migration identity:** independently recomputed both pins over the selected inputs:
  - Two inputs: `69781850c8b75e9e83cffd421f278810986859af07d2366e2e44ac854259eb4a`
  - Twenty inputs: `e649951df8c8177c80ebc6363c6bbc4902e7c82d8e1e7c5a0749ede307b25125`
  
  No input contains a mechanical hit or named transformation. All 22 independent in-memory one-byte mutations changed the applicable checksum.
- **r6 P2-2:** closed at plan level. [Plan lines 425–446](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:425) require the audited private artifact, aggregate, and **all 444 ordered entries**, plus an independent audit seal. All four seal values reproduce. Static import traversal excludes the Barbed catalog from the seed/digest closure. Semantic-seed, individual-entry, and regenerated-expectation rejection remain required implementation witnesses; they have not yet been executed.
- **r6 P3:** closed. Plan lines 448–455 now hash actual private working files before/after and compare them with committed blobs.
- **PHB/catalog:** withholdings and complete Barbed V1–V5 removal remain specified. Independently reproduced 26 current PHB occurrences; the planned import-example replacement leaves 25. OGL holder/notice-chain gates remain.
- **Batches:** sizes are **10/1/10/10/10/10/9/10/10/10/8/7/6/5/7**. Each has R/V/M; ledger generation and equality witnesses are assigned; B15 is last.
- **Ten additional full-file reads beyond the recorded r4–r6 samples:** domain `coin`, `spell-components`, `spell-limits`, `weapon-limits`, `effect-kinds`, `primary-ability`, `attunement`, `spell-range`, `weapon-range`; crypto `sha256`. No additional publication finding.

Return to the owner under the stated escalation rule; the plan should not freeze with an unreproducible fail-closed ledger.

PUBLISH-01 PLAN REVIEW R7 DONE
