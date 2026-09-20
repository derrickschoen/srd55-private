# PUBLISH-01 — astra HIGH plan review r5 (session 01a0bfad-56e7-7be1-b86e-a32fd4c4f926, 268,155 tokens, final message only)

**VERDICT: REJECT — 0 P1 / 2 P2 / 1 P3.**

Reviewed the specified 580-line [plan](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md), verified its SHA-256, read r4 first, and read D815 in full. All probes were local and read-only.

**P2-1 — The withheld Barbed Goad rules also ship through the production catalog; that copy has no planned disposition.**

Plan lines 196–202 withhold “Barbed Goad in both Court docs” and prohibit its normalized anchors elsewhere. Lines 208–209 then assert that “no other included file contains a traced non-SRD WotC rule.” That assertion is false.

[src/authoring/bundled-homebrew-catalog.ts:463](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/authoring/bundled-homebrew-catalog.ts:463) contains the operative Barbed Goad text. I decoded the TypeScript string and independently confirmed that its first paragraph equals the normalized paragraph in the player document. It contains neither `PHB` nor `Player’s Handbook`.

This is active bundled content:

- V3 inherits V2 at line 506.
- V4 preserves the feature at lines 522–534.
- V5 filters two other features at lines 537–541, retaining Barbed Goad.
- The listed catalog entry exports V1–V5 at lines 819–822.
- [bundled-homebrew-installer.ts:370](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/authoring/bundled-homebrew-installer.ts:370) uses that catalog by default.

Neither catalog nor installer has a named disposition in the plan. The promised anchor scanner should reject this copy, but that leaves implementation without an authorized, bounded resolution.

**Required correction:** specify the public treatment of the catalog’s affected revisions and dependent descriptions, including source and compiled output. Preserve existing user content/import behavior; merely hiding the catalog entry would still publish its source. Add corresponding batch scope and witnesses.

The homebrew document changes otherwise address the identified derivations: Oath’s complete operative skeleton, Court’s dependent references, Vengeance figures and ratios, and the Psionic Fist comparator. Retaining Oath as explicitly non-playable identity/tenets/vision is coherent. Court’s partial edition remains useful if its dependency removals cover the index, resource accounting, guidance and summaries—not just the feature paragraph.

**P2-2 — The chronology inventory remains incomplete, including a checksum-frozen source that cannot receive the proposed ordinary comment rewrite.**

Plan lines 399–402 require that “every process/owner/round/regeneration hit must be a listed rewrite” and permit “No blanket path exception.” The retained set still contains unlisted narratives:

| Retained location | Unplanned chronology |
|---|---|
| [background-choices.ts:2](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/builder/background-choices.ts:2) | Lines 2–28 describe B3 refusing an edit, supervisor ownership, dispatch gaps and ratification. Plan lines 380–383 address only the separate comment at line 367. |
| [srd-extract-provenance.test.ts:7](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/rules/srd-extract-provenance.test.ts:7) | Lines 7–41 recount the truncated extract, a refused first draft and competing tracks’ merge history. |
| [bundled-content-digest-v1.expected.ts:16](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/catalog/bundled-content-digest-v1.expected.ts:16) | Four dated re-pinning narratives, including supervisor review and owner approval. |
| [columns.ts:246](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/db/schema/columns.ts:246) | An implementation incident and a correction of what an earlier commit claimed, including private commit `d4d2871`. |
| [source-instance-state.ts:10](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/domain/source-instance-state.ts:10) | R4 implementation history, the “R4 round 2” sweep, and a discovered failure at lines 34–35. |

Additional examples include `origins-srd.test.ts:103–115`, `tools/assert-dist-clean.mjs:117–124`, and `docs/srd/SOURCE.md:201–206`. The last is separate from the species incident already scoped in plan lines 392–394.

The frozen-source example requires a design decision: [catalog-data-migrations.ts:146](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/catalog/catalog-data-migrations.ts:146) includes `source-instance-state.ts` bytes in the migration checksum. Comment removal changes those bytes. Plan lines 406–411 provide a narrowly bounded exception only for `skill-grants.ts` and state “No checksum is repinned.”

**Required correction:** complete the narrative disposition ledger and allocate the missing transformations. Resolve the frozen-source conflict explicitly before the plan binds; neither silently retaining its narrative nor repinning its checksum satisfies the current plan. Preserve technical explanations and independent test expectations when rewriting surrounding history.

**P3-1 — The no-word witness is real, but anchor matching does not establish semantic exclusion.**

Plan lines 200–202 provide a useful regression test: copied Barbed Goad text must fail even without a PHB label. The production-catalog copy above supplies an authentic fixture.

A paraphrase that changes the selected anchors can nevertheless pass this detector. Record that limitation and require renewed derivation review for changed rule prose. Describe the scanner as detecting known withheld text, not proving that arbitrary wording is free of the same derivation. The fixture and mutants remain planned; I did not execute an implementation that does not yet exist.

**Verification results**

- **Counts reproduced:** 1,136 selected blobs, 26,798,325 bytes, including 42 homebrew files. The proposed additions account for 1,144 final files. Selected worktree bytes matched their committed blobs.
- **PHB inventory reproduced:** 26 current occurrences; the planned `CATALOG-IMPORT.md` replacement removes one, leaving **25**: three legal-text occurrences, eleven official-SRD cross-references, seven negative boundary statements, and four archive-member occurrences.
- **Archives independently inspected:** decoded all 135 RTF members across both ZIPs before normalization. The four hits match the exact archive/member inventory at plan lines 226–231. **r4 P2-2 is closed.**
- **Immutable transformations:** lines 352–358 specify source/preimage hashes, exactly one occurrence, output-only replacement, mismatch rejection and a one-byte mutant. Lines 383–384 add comment-stripped token/AST equality. This is a sound planned mechanism; **r4 P3-1 is closed**, subject to implementation evidence and the additional frozen-source problem above.
- **Scraper rationale:** lines 97–100 now correctly describe a tidy subsystem exclusion without claiming generic infrastructure is PHB-derived. **r4 P3-2 is closed.**
- **Batches:** declared sizes are `10, 1, 10, 10, 8, 10, 10, 10, 10, 10, 10, 10, 9`; each has R/V/M. Lines 479–481 and 563–565 correctly place the cumulative gate last. New findings require revised scope while retaining the limit.
- **Ten additional samples beyond r4’s recorded sample:** `encounter-rule-error.ts`, `movement-speeds.ts`, `range.ts`, `saving-throw-outcomes.ts`, `spells/resources.ts`, `statblocks/beast-family-deferred-upgrades.ts`, `statblocks/cc-by-attribution.ts`, `world-object-controller.ts`, `canonical-json-errors.ts`, and `integrity-errors.ts`. No further inclusion defect was identified in those samples.

The r4 homebrew-document corrections and four specifically reported chronology transformations are addressed, but **r4 P2-1 and P2-3 are not closed across the selected public tree**. Return to the owner under the stated escalation rule.

PUBLISH-01 PLAN REVIEW R5 DONE
