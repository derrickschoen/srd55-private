# PUBLISH-01 — astra HIGH plan review r6 (session 01a0bfe4-780a-7fd0-87e5-1813b26b7dfc, 148,525 tokens, final message only)

**VERDICT: REJECT — 0 P1 / 3 P2 / 1 P3.**

Read r5 first and D815/D820 in full. Verified both supplied SHA-256 hashes and line counts. All probes were local and read-only; no agents, network, builds, or writes.

**P2-1 — Default RETAIN still publishes chronology, including another frozen migration input.**

[Ledger lines 27–38](.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:27) say each candidate “starts with the table’s RETAIN disposition” and receives an override where specified. I audited **47 default candidates across 47 files**: 11 decision-reference, 10 round, 10 refused, eight session, and eight date candidates. Several are plainly narrative:

| Source location | Retained narrative |
|---|---|
| `drizzle/0037_background_default_origin_feat_key.sql:1` | “HA-4 fix round 1 / N1” |
| `src/builder/guided-creation.ts:818–819` | “reversed at round 3”; outside ledger line 77’s override ranges |
| `src/assets/board-glyphs.ts:2–5` | Recounts what the D519 comprehension probe showed |
| `src/assets/light-encoding.ts:2–4` | Recounts Luna misreading the earlier representation |
| `src/ui/screens/planner/agent-reference.ts:323–329` | Recounts the obsolete statement, subsequent implementation, and test |
| `src/ui/screens/sheet/sheet-view.ts:87–90` | “THE D20 LESSON” and the earlier defective test |
| `src/commands/level-up-class.ts:17` | “`subclass_required` was struck by D70” |
| `src/pwa/browser-capability.ts:9–11` | “Measured 2026-08-02 on this worktree” |
| `tests/unit/rules/sheet.test.ts:2299` | Test title begins “round 3” |
| `src/catalog/retire-non-srd-bundled-subclasses-v1.ts:5–10` | Dated name-scrub and deployment history |

These are admitted by exact hashes; generating more precise exception keys does not correct their dispositions.

The last example also contradicts [ledger lines 117–118](.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:117): **“The two-source retirement migration has no transformed input.”** Its narrative requires rewriting, which changes that migration’s checksum too. The plan currently authorizes deriving only the reconciliation migration’s public checksum.

The additional ten-file inspection found another omission outside the scanner vocabulary: [sheet-limits.ts:17](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/domain/sheet-limits.ts:17) recounts the previous write/share-cap defect. A complete token inventory is not a complete narrative inventory.

**Required:** correct the default dispositions, complete the bounded transformations, extend D820 derivation to the retirement migration, and rebalance affected batches. Preserve technical explanations and test assertions.

**P2-2 — The bundled-content “independent witness” is circular and does not validate every generated entry.**

[Plan lines 423–430](.tmp-plans/2026-09-19-publish-01-plan.md:423) generate expected values using `verify-bundled-content-digest.ts --print`, then say:

> “Re-run without `--print` as the independent witness.”

Both branches use the same `applicationSeed` and `bundledContentDigestPassV1` result. See [verification script lines 24–42](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/scripts/verify-bundled-content-digest.ts:24).

Moreover, the non-print success condition checks the aggregate digest and **entry count**, not equality of every expected entry. Corrupting an individual expected entry while preserving the aggregate literal and array length can pass this check.

The proposed semantic mutant “changes the pin”; that demonstrates recomputation, not rejection of an incorrect seed.

**Required:** independently constrain the generated result. For these semantics-preserving transformations, compare the aggregate and every ordered entry against the audited private expectation. Any intentional difference needs a separately justified expected delta. Require a semantic seed mutation and individual-entry corruption to fail verification without accepting freshly regenerated expectations.

**P2-3 — The archive inventory reproduces only with a faulty decoder and a different token policy.**

[Ledger lines 618–619](.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:618) promise “RTF decoding … before normalization.”

I independently visited all **135 RTF members**. The planner’s regex-stripping method reproduces **2,228 occurrences in 116 members**, but it preserves RTF source-formatting line breaks inside words:

- `EpicSpells.rtf` contains `dis\r\npatch`; proper decoding yields a `dispatch` occurrence missing from ledger line 681.
- `PsionicRaces.rtf` contains `underg\r\nround`; the stripping method invents the `round` occurrence recorded at ledger line 719.
- `MagicOverview.rtf` has a decoded `session` occurrence missing from ledger line 691.

A group-aware decoder produced **2,246 occurrences in 115 members**. Also, reproducing 2,228 requires case-sensitive `Sol`, whereas ledger lines 10–14 specify case-insensitive matching.

The source-file inventory fares better: **all 456 per-file token-count rows match**, totaling **3,706 occurrences**. However, these occupy **3,287 candidate lines**, not 3,284. The smaller count excludes the three standalone verified-commit hits.

**Required:** specify and validate one decoder/normalizer/token policy, regenerate the archive inventory, correct the source line count, and add witnesses for words split across RTF formatting boundaries. These counts govern a fail-closed compiler, so the discrepancy must be resolved before freezing the plan.

**P3-1 — Strengthen the private-preservation witness.**

[Plan lines 416–418](.tmp-plans/2026-09-19-publish-01-plan.md:416) prescribe before/after capture using `git show <commit>:…`. An immutable commit returns identical bytes even if curation accidentally changes the private working files.

Hash the actual private input files and both expectation/pin holders before and after curation, comparing them with the selected committed blobs. Retain the commit reads as provenance evidence.

The remaining requested checks are addressed as follows:

- **Barbed catalog removal: closed at plan level.** Plan lines 387–397 and ledger lines 110–111 remove V1–V5, helpers/maps, the exported entry, and dependent descriptions from source and dist. Both installer defaults consume `BUNDLED_HOMEBREW_CATALOG`; installation iterates supplied entries without deleting omitted ones. B16 names stored-Barbed preservation, generic import round trips, source/dist anchors, and the merely-hidden-entry mutant. These remain implementation witnesses.
- **Eight r5 sites:** all now have explicit overrides: ledger lines 72, 75, 83–86, 90, and 92.
- **Migration derivation:** independently reproduced the existing two-input and 20-input hashes, including `e649951d…`, using the specified sorted-path/JSON/UTF-8/SHA-256 algorithm. In-memory one-byte mutations in each of the five named inputs changed the hash; restoration recovered it. The missing retirement transformation prevents full closure.
- **Anchor limitation:** correctly recorded in plan lines 210–212 and ledger lines 147–150, with mandatory human review for changed included rule prose.
- **Batches:** declared sizes are `10/1/10/10/8/10/10/10/10/10/10/10/9/10/6/7/10/9/10/7`. Each has R/V/M; B20 is last. B3 carries ledger machinery, and B15 names complete-ledger verification and the equal-count unlisted-hit mutant. Corrections require revised allocations.
- **Selection:** reproduced **1,136 blobs / 26,798,325 bytes**, with every selected working-file blob matching the audited commit. The planned additions yield **1,144** files.
- **Ten additional full-file reads:** domain `background-feat-name`, `character-limits`, `origin-limits`, `sheet-limits`, `exact-table`, `total-map`; party/storage `repository-locator`, `repository-path`, `document-bytes`, `create-storage`. Prior review logs show no full reads of these files. The additional narrative defect is recorded above; no new content-licensing defect was established.

Return to the owner under the stated escalation rule; the plan is not ready to freeze.

PUBLISH-01 PLAN REVIEW R6 DONE
