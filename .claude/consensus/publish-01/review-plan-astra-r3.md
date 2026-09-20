# PUBLISH-01 — astra HIGH plan review r3 (session 01a0bcd6-36a5-7840-a2ca-92036d819537, final message only; third and final round)

**REJECT — 0 P1, 1 P2, 1 P3.**

All six specific R2 findings are closed in the revised plan. The final source sweep found an additional cleanup gap that prevents the plan from binding.

Verified the supplied 520-line count and SHA-256. All probes were local and read-only; no builds, network requests, writes, or model calls were made.

1. **P2 — Retained source still contains review and owner-decision chronology outside every authorized cleanup batch.**

   [Plan lines 189–193](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:189) require discovery of “decision/review narrative” and say “prose/session evidence is excluded or rewritten.”

   Two included files contradict that requirement:

   - [src/simulation/coverage.ts:888](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/simulation/coverage.ts:888) recounts the “round-16 baseline” and “rounds 1-16”; line 1323 cites “round-10 supervisor/reviewer clause-by-clause enumerations”; line 1416 identifies a dated supervisor transcription; line 2226 recounts a round-2 test correction.
   - [src/builder/background-choices.ts:367](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/builder/background-choices.ts:367) preserves a substantial owner-ruling chronology: the original D61 direction, its reversal by D68, removed constants/locators, and instructions to future sessions.

   These are more than bare decision identifiers or present-tense technical rationale. Neither file appears in batches 1–8, and neither has an authorized public-output transformation. A faithful narrative scan must reject them; silently exempting them would contradict the stated publication boundary.

   **Required disposition:** authorize bounded public comment transformations that preserve the independent-oracle rationale and current background-selection behavior. Preserve the private background note: it expressly records an owner instruction to retain it. Neither file is among the 22 migration checksum inputs. Rebalance the batches or add a bounded cleanup batch, keeping the complete standalone gate last.

2. **P3 — Five retained source citations point into the excluded OGL quarantine without a disposition.**

   These references remain under option A:

   - [src/combat/encounter.ts:2182](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/combat/encounter.ts:2182), also lines 2536 and 4831.
   - [src/combat/statblock.ts:406](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/combat/statblock.ts:406), also line 408.

   All cite `docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt`, which option A excludes. The plan identifies only the frozen skill-grants pointer as its remaining excluded-document exception.

   **Fix or record:** replace these with verified public SRD 5.1 references, or explicitly review and record the exact occurrences as historical citations to an unavailable local source. Their pathname alone does **not** establish an unlicensed-content defect: the retained provenance type and attribution notice identify SRD 5.1 CC-BY material.

The R2 closure assessment is:

| R2 finding | R3 assessment and quoted plan evidence |
|---|---|
| **P2-1: private VTT regression** | **Closed.** Lines 303–307: “Do not edit private `tools/serve.mjs`”; transformations operate “in the public copy,” and the “private supervisor mode/test remain untouched.” Batch 4 excludes private `serve.mjs`, adds public rejection coverage, and runs the existing supervisor launch test. |
| **P2-2: build-ID coverage** | **Closed.** Lines 239–244 specify Git derivation in Vite, independent derivation in Vitest, and a browser expectation derived “from Git, never `BUILD_ID`.” Batch 1 includes `character-sheet.spec.ts` and `vitest.config.ts`; verification includes all sheet-view tests and the print assertion. The installed Vite implementation supports HTML replacement from `define` keys under `import.meta.env`. |
| **P2-3: retained-tool chronology** | **Closed for the named files and complete retained-tool scan.** Lines 198–210 disposition every reproduced scan hit, including both scraper narratives and innocent substring/arithmetic hits. Batch 7 authorizes both scraper edits; batch 1 removes the `PARALLEL-PLAN.md` pointer. The scraper modules and Vite config are outside the checksum input set. Finding 1 above concerns additional **source** files. |
| **P2-4: documentation gate** | **Closed.** Lines 296–301 authorize both document transformations and keep the required attribution blockquote “byte/SHA-identical.” Lines 393–397 distinguish current paths, the enumerated placeholder and exact historical exceptions, and explicitly require both missing-reference mutants to fail. Batch 4 includes these files and witnesses. |
| **P3: stale v17 label** | **Closed.** Lines 296–299 title the document “Historical character share wire schema (v1–v17),” verify registry/example version 21, and prohibit implying that v18–v21 are documented. |
| **P3: dist exception** | **Closed.** Lines 374–378 require decoding JavaScript escapes without `eval`, exactly one canonical pointer tied to the source digest, and subtraction of only that range. “Zero/two copies or any other private pointer fail.” Batch 4 includes duplicate/additional-pointer mutants. The existing dist contains one occurrence. |

Batch structure is otherwise executable:

| Batch | Files | R/V/M and ordering |
|---|---:|---|
| 1 | 10 | Present; D129 remains conditional on owner confirmation. |
| 2 | 1 | Present; expected curator-absence failures are explicit. |
| 3 | 10 | Present; fixture-based policy tests precede real-tree cleanup. |
| 4 | 10 | Present; public transformations and private VTT verification are separated. |
| 5 | 10 | Present; bounded path cleanup. |
| 6 | 10 | Present; registry cleanup and affected tests. |
| 7 | 10 | Present; checksum, narrative and retained-tool verification. Missing the source dispositions in finding 1. |
| 8 | 3 | Present; owner OGL choice, cumulative verification and update witness. |

Lines 406–408 correctly permit intermediate curation failures and place the full standalone gate after batch 8. Forced compilation, exact committed-tree comparison, deletion/rename verification and non-forced updates remain specified.

The allowlist recount matches **1,113 baseline files / 19,726,582 bytes**, comprising 53 docs, seven scripts, 32 tools and 43 tests/helpers. Adding `robots.txt` and five generated files yields **1,119 under A**; the 14-file quarantine yields **1,133 under B**. No newly added category broadens the public selection.

I also read these 10 additional allowlisted files in full:

- `ast-grep-rules/no-alternative-offer-environment-construction.yml`
- `ast-grep-rules/no-inline-party-pack-super-refine.yml`
- `contracts/vtt-handoff/v1/art.schema.json`
- `content/cc0/escape-the-astral-tower/room-14-second-floor-stairwell.json`
- `content/cc0/escape-the-astral-tower/room-25-crystal-caves.json`
- `scripts/build-row-contracts.ts`
- `tools/scrape/robots.ts`
- `src/domain/source-markers.ts`
- `src/pwa/browser-profile-storage.ts`
- `tests/unit/rules/multiclass-prerequisite-house-rule.test.ts`

That sample revealed no additional over-inclusion. The remaining findings came from the broader source sweep. D129 confirmation and OGL A/B remain explicit owner decisions; acceptance would not itself supply either authorization.

PUBLISH-01 PLAN REVIEW R3 DONE
