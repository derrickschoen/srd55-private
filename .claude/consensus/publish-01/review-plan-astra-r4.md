# PUBLISH-01 — astra HIGH plan review r4 (session 01a0bf92-3b30-7902-94e5-85db755b438d, 248,832 tokens, final message only; owner-granted round after r3)

**REJECT — 0 P1 / 3 P2 / 2 P3.**

Verified the plan’s **557 lines and supplied SHA-256**. All probes were local and read-only; no network, builds, tests, writes, or other agents were used.

1. **P2 — The homebrew audit misses substantive non-SRD derivations that removing chronology would leave intact.**

   [Plan lines 140–151](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:140) prescribe stripping narrative; the Oath row specifically says **“retain mechanics/SRD; strip owner/ruling arc.”** That is insufficient for these identified passages:

   - [Oath of Domination:197](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/cc-by/2026-08-03-oath-of-domination-subclass.md:197) retains Inevitable Word. The private [rulings:87](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/rulings.md:87) explicitly trace it to Elder Champion’s effect and wording; [rulings:108](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/rulings.md:108) identify the relevant non-SRD paladin sources as PHB.
   - Barbed Goad survives in both Barbed Court documents. [Rulings:2574](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/rulings.md:2574) records the requested Compelled Duel adaptation and acknowledges its absence from SRD 5.2.1; [rulings:1479](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/rulings.md:1479) expressly imports the spell’s escape conditions. Removing that history does not resolve the derivation.
   - The [Barbed Court:273](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/cc-by/2026-08-03-monk-barbed-court.md:273) and [Veteran:207](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/cc-by/2026-08-04-rogue-veteran-subclass.md:207) tables retain Vengeance comparator figures and dependent ratios without an explicit disposition.

   **Required:** identify these operative rules and numerical comparisons in the public-edition policy. Exclude the affected spans or establish an independently supported, permitted replacement. Add a witness covering prohibited material **without the words “PHB” or “Player’s Handbook.”** This is a D815 publication-boundary finding, not a copyright-law determination.

2. **P2 — The occurrence-exact PHB exception inventory is incomplete.**

   [Plan lines 194–209](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:194) claim **“Dispositions for every selected-source hit”** and permit mentions **“only at the exact occurrences above.”** Independent normalization and in-memory archive inspection found five additional occurrences:

   | Location | Disposition needed |
   |---|---|
   | `docs/srd/source/species-descriptions.txt:15–16` | Negative SRD-boundary explanation |
   | 3.0 ZIP → `srdbasiccharacterclassesi.rtf` | Official SRD cross-reference |
   | 3.0 ZIP → `srdmagicitemswondrousitems.rtf` | Official SRD cross-reference |
   | 3.5 ZIP → `Legal.rtf` | Product Identity notice |
   | 3.5 ZIP → `PsionicPowersD-F.rtf` | Official SRD cross-reference |

   These are not evidence of imported PHB rules. However, the specified scanner must reject them under the current closed exception list.

   **Required:** add explicit dispositions keyed by archive/member where applicable, with normalized occurrence identity and count. Ensure RTF decoding precedes text normalization. Preserve rejection of additional occurrences.

3. **P2 — Chronology remains outside the authorized cleanup scope.**

   The plan promises public editions that remove decision/reviewer/session narrative and requires **“chronology inserted outside a span”** to fail ([lines 444–447](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:444)). Remaining examples include:

   - [db/schema/catalog-spells.ts:504](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/db/schema/catalog-spells.ts:504): the former combined table, owner intervention, and resulting split.
   - [docs/srd/source/species-descriptions.txt:19](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/srd/source/species-descriptions.txt:19): the truncation incident and subsequent checksum correction.
   - [tools/assets/emit-starter-art-hashes.ts:3](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/assets/emit-starter-art-hashes.ts:3), also its generated comment at line 34: sanctioned regeneration history and superseded silhouettes.
   - [docs/homebrew/ogl/srd-3.5/SOURCE.md:32](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/ogl/srd-3.5/SOURCE.md:32): the dated conversion commission. Its inventory row says only “INCLUDE.”

   **Required:** authorize bounded transformations preserving present technical rationale and provenance. For the species extract, preserve attribution and the actual SRD body; reconcile public checksum documentation without regenerating behavioral expectations. Rebalance batches and keep standalone verification last.

4. **P3 — Clarify how immutable private files acquire transformation boundaries.**

   [Lines 338–340](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:338) require marker pairs in every transformed source section and reject missing markers. Yet `coverage.ts`, `background-choices.ts`, and `serve.mjs` currently contain none and must remain privately unchanged.

   Specify a separate exact-preimage/hash-bound transformation mechanism for these files, or explain marker insertion exclusively in the public copy. The intended boundaries and token/AST witnesses are otherwise sound.

5. **P3 — Scraper exclusion is a curation choice, not uniformly required by “PHB = NO.”**

   [Lines 99–103](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:99) characterize all 19 files as implementing PHB catalog scraping. Some contain generic infrastructure—for example, `robots.ts` implements robots matching, while cache and queue modules manage fetching state.

   Removing the complete unused subsystem is reasonable for the tidy public cut. Record that rationale rather than implying every module embodies PHB-derived content. Static inspection found **no retained relative import depending on the removed directory**. The mandatory runtime graph check in `assert-dist-clean.mjs` does require the already-planned transformation.

The remaining requested checks passed at plan-review level:

- **Counts:** independently reproduced **1,136 blobs / 26,798,325 bytes**, including 95 docs, seven scripts, 13 tools and 43 tests/helpers. Adding robots.txt and seven generated files gives **1,144**. Every selected worktree blob matched HEAD.
- **Homebrew:** opened all 42 selected files; reviewed original prose and inspected both archives in memory. The six exclusions are justified. Explicit grants remain implementation tasks where the plan identifies them.
- **OGL:** complete 14-file inclusion, holder-entry shape, placeholder rejection, actual 3.0 `Legal.rtf` recovery, notice comparisons and publication gates are concrete. The derivative currently embeds the complete local OGL text exactly.
- **R3 closure:** the five combat citations resolve. Both named source-comment rewrites preserve private files and have witnesses; neither source belongs to the independently recounted **22 migration inputs**.
- **Tidy tree:** all top-level entries are enumerated; templates are modest and conventional. No invented CLA or premature changelog.
- **Batches:** sizes are **10/1/10/10/8/10/10/10/10/10/10/10**; each has R/V/M, and cumulative standalone verification is last. D129 remains conditional.
- **Additional ten-file sample:** guidelines `00`–`05`, plus `anchor-point.md`, `broken-tempo.md`, `broken-tooth.md`, and `patient-volley.md`. No additional over-inclusion beyond the findings above.

**PUBLISH-01 PLAN REVIEW R4 DONE**
