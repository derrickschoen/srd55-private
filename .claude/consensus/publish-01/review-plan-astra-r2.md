# PUBLISH-01 — astra HIGH plan review r2 (session 01a0bcba-671f-7cb1-bc02-bb6db1580938, final message only)

**REJECT — 0 P1, 4 P2, 2 P3.** The major r1 defects are substantially addressed, but the plan still authorizes a private-product regression and cannot pass all its stated gates within the permitted files.

I verified the supplied SHA-256 and 477-line count. All probes were local and read-only; no builds, network requests, writes, or model calls were made.

1. **P2 — Removing `--vtt-runtime` from the private source breaks an existing feature and test.**

   Plan lines 278–281 say: “Edit `tools/serve.mjs` to remove `--vtt-runtime`, its child launch, temp config, and imports.” Batch 4 explicitly permits that source edit.

   However, [node-runtime-launch.launch-test.ts:103](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts:103) launches precisely `npm run serve -- --vtt-runtime --port 0` and verifies runtime startup and shutdown. That test remains in the private repository. Excluding its runtime dependency from the public cut does not justify removing the private capability.

   **Fix:** make this a deterministic **public-output transformation**, bound to the selected commit. Preserve and verify the private launch mode; verify that the curated server rejects it. Alternatively, obtain an explicit decision to retire the private feature and plan that retirement separately. Do not delete the existing test merely to accommodate curation.

2. **P2 — D129’s build-ID change exceeds batch 1’s test allowance.**

   Plan lines 224–226 require replacing the literal with a “Vite-defined `srd55-<12-char-public-HEAD>`.” But [character-sheet.spec.ts:1312](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/browser/character-sheet.spec.ts:1312) independently expects:

   `Printed from SRD-55 srd55-2026-08-01-1`

   The application’s printed notice consumes `BUILD_ID`, so this assertion will fail. Batch 1, lines 373–379, permits only the browser-support unit test and attribution browser spec.

   There is also a test-environment gap: [sheet-view.test.ts:37](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/ui/sheet-view.test.ts:37) imports the build-ID consumer, while the separate `vitest.config.ts` supplies no build-ID definition. Specify how the proposed Vite-defined value works under Vitest.

   **Fix:** extend the bounded batch to cover the existing print assertion and test-environment binding, and run the affected sheet tests. Derive the expected value independently from Git rather than importing the implementation’s value.

   **Cache compatibility is confirmed:** [dist-build-cache.mjs:144](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/dist-build-cache.mjs:144) already incorporates HEAD into its cache key. A commit-derived ID does not create a new cache-key omission.

3. **P2 — The retained tools still contain unhandled reviewer history.**

   Plan lines 120–124 explicitly include both scraper modules below. Lines 188–192 promise that “prose/session evidence is excluded or rewritten,” but neither file appears in the cleanup batches:

   - [feat-grants-bridge.ts:23](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/scrape/feat-grants-bridge.ts:23) recounts the Codex round-1 review of private commit `ab551e25`; lines 39, 57 and 229 retain reviewer finding labels and severities.
   - [cli.ts:546](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/scrape/cli.ts:546) attributes the classification scheme to that review, and line 558 recounts what the reviewer downgraded.

   These are review-history passages, unlike legitimate adapter identifiers or bare decision labels. They need the same treatment already planned for `catalog-data-migrations.ts` and `multiclass-proficiency.ts`.

   **Fix:** authorize bounded comment cleanup that retains the technical rationale and removes the review chronology. Neither scraper file is a migration digest input. Also disposition the remaining `PARALLEL-PLAN.md` pointer in [vite.config.ts:211](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/vite.config.ts:211).

   I found no new whole-document inclusion comparable to r1’s source-aware homebrew documents. This residual is narrower, but the claimed content cleanup is incomplete.

4. **P2 — The documentation gate still rejects retained documents that no batch can repair.**

   The README issue itself **is fixed in the plan**: lines 255–257 explicitly remove both `LOCAL-DEV.md` and `docs/serving.md` links.

   Other retained documents remain incompatible with lines 358–360, which require validating “every documented repository path”:

   - [SCHEMA.md:762](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/sharing/SCHEMA.md:762) instructs readers to update excluded `tests/browser/sharing.spec.ts`.
   - [ATTRIBUTION.md:36](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/srd/ATTRIBUTION.md:36) explains its formatting by reference to excluded `tests/unit/ui/legal.test.ts`.

   Neither document has an authorized public transform or cleanup. The checker also needs to distinguish actual links/current instructions from placeholders such as `vN.ts` and deliberate references to absent historical files.

   **Fix:** specify public editions, conservative exclusions, or narrowly reviewed historical-reference exceptions. Preserve the required attribution text exactly. Add concrete missing-reference witnesses to the curator tests.

5. **P3 — The retained sharing guide incorrectly presents v17 as current.**

   Plan lines 103–105 justify retaining `SCHEMA.md` as a user-facing wire contract. Its opening declares the current version to be 17; [wire-schemas/index.ts:44](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/sharing/wire-schemas/index.ts:44) declares 21, and the included example is also version 21.

   Refresh it, label it explicitly as historical, or record its exclusion. A document accepted as public technical guidance should not silently misidentify the current format.

6. **P3 — Specify how the frozen source exception applies to generated dist.**

   Lines 181–186 define occurrence exceptions by path and exact bytes; lines 339–342 separately scan dist. `skill-grants.ts` is imported with `?raw` for checksum validation, so its permitted private-document pointer also reaches generated JavaScript string content.

   Record how the dist scanner recognizes that precise occurrence despite generated filenames and string escaping. Prove that the frozen occurrence passes while an additional private pointer elsewhere fails. This must not become a broad exception for the containing bundle.

The r1 closure assessment is:

| r1 finding | R2 assessment, with plan evidence |
|---|---|
| **P1-1: content classification** | **Named homebrew defect closed.** Lines 85–91 exclude “all 48 `docs/homebrew/**` files under option A.” Broader cleanup remains incomplete as finding 3 explains. |
| **P1-2: migration checksum** | **Closed.** Lines 294–296 say “do not edit line 64 or any byte in that file.” I reproduced both existing digests: `69781850…` and `e649951d…`. The registry contains 2 + 20 distinct inputs; the other 21 inputs have no overlap with authorized batch-4–7 cleanup files. `catalog-data-migrations.ts` itself is not an input. |
| **P2-3: exact contracts** | **Closed.** Lines 109–152 enumerate 7 scripts, 32 tools, 43 test/helper files and 13 package scripts. Lines 238–241 bind policy, templates and source blobs to “that same commit.” Counts independently match. |
| **P2-4: verification scopes** | **Closed structurally.** Lines 331–342 separate pre-install source, committed tree and dist; lines 181–195 specify occurrence-level exceptions and meaningful-text scanning. Record finding 6’s dist treatment. |
| **P2-5: D129 prerequisite** | **Partial.** Lines 219–227 and 373–379 now provide implementation, files and R/V/M. Finding 2 identifies missing affected tests. |
| **P2-6: OGL B** | **Closed as a blocked option.** Lines 204–210 explicitly require both the original-work holder entry and recovery/verification of the SRD 3.0 notice chain. |
| **P2-7: documentation and serving** | **Partial.** README, short-test claims and NOTICE coverage are addressed at lines 252–281. Findings 1 and 4 remain. |
| **P2-8: order and mutants** | **Closed.** Lines 369–371 put the full gate after batch 8. Lines 384–385 distinguish omitted source blobs from injected output files; lines 405–407 place the private-URL mutation outside the replaced span or inside the replacement template. |
| **P2-9: compilation and updates** | **Closed.** Line 348 explicitly runs `npx tsc -b --force`. Lines 317–325 specify every-main-landing regeneration, clean-clone replacement preserving `.git`, staged deletions, index equality, a deletion/rename witness and non-forced updates. |
| **P3: provenance wording** | **Closed for the named corrections.** Lines 47, 52 and 156–159 correctly describe imported Doomed Zone mechanics and fixture provenance. Lines 298–300 address the two named narratives; lines 407–408 preserve the negative wordmark assertions. Finding 3 extends the narrative cleanup. |

The independent count is **1,113 baseline files / 19,726,582 bytes**, exactly as reported:

`15 root + 8 ast-grep + 32 content + 3 contracts + 95 db/drizzle + 53 docs + 3 fixtures + 98 public + 7 scripts + 724 src + 43 tests/helpers + 32 tools`

Adding `robots.txt` gives **1,114 allowlisted files**; five generated files give **1,119**. The OGL quarantine is independently **14 files / 6,963,727 bytes**, yielding **1,133** under B.

For the requested fresh document sample, I inspected 14 included files not opened in the r1 probe log: the three root technical documents, both guides, `SCHEMA.md`, the sharing example, the die-size probe, and all six JSON schemas. The schemas contain executable contracts; the guides are product instructions. The substantive findings from this sample are the missing references and stale sharing-version claim above.

Excluding `LOCAL-DEV.md` and `docs/serving.md` is a sensible first-publication choice, given the explicit README replacement. I also support the bounded D129 banner/noindex/build-ID prerequisite in the private product: it benefits the friend-facing mirror and does not authorize deployment. That is my recommendation for the owner’s scope decision, not an assertion that D129 already required source publication to wait.

The complete standalone gate is now correctly placed after cleanup. The plan becomes executable batch by batch once the four P2 findings are resolved.

PUBLISH-01 PLAN REVIEW R2 DONE
