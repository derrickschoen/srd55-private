1. **F1 — §1 and §4: the diagnostic aliases conceal failing silhouettes.**  
   `qsRecipeId()` selects the **first input with the same serialized procedural recipe**. Consequently, ogre is measured using goblin, priest using acolyte, and several archetype assets using named-monster candidates. Recomputing the existing silhouette descriptor directly from the correctly identified delivered PNGs gives:
   
   - cleric/undead: **0.011285**
   - cleric/beast: **0.011835**
   
   Both fail the existing `> 0.012` invariant. Rogue/ranger is therefore not the minimum pair. **Fix:** rerun diagnostics by explicit asset ID, bind each measured bitmap to its external RGBA digest, and resolve these failures without lowering the threshold. Add the mistaken diagnostic mapping and concealed failures to the supervisor’s findings.

2. **F2 — R6 and S3: the proposed two-pair palette invariant is false.**  
   Executing the repository’s palette generator finds **seven** RGB pairs below distance 8, all of which co-occur within delivered assets:
   
   | Palette references, using repository step numbering | Distance |
   |---|---:|
   | stone 1 / metal 0 | 4.690 |
   | stone 2 / metal 1 | 4.472 |
   | stone 3 / metal 2 | 4.243 |
   | wood 0 / earth 0 | 7.550 |
   | moss 0 / neutral 0 | 6.481 |
   | cloth-warm 5 / skin 3 | 6.000 |
   | cloth-warm 6 / skin 4 | 4.690 |
   
   The plan also misnumbers its two listed pairs. Checking only each asset’s *minimum* distance missed the others. There are **29 affected tokens**, not “37 tokens”; only 35 tokens are delivered. **Fix:** correct the evidence and enumerate all offending pairs per asset. Palette membership does not establish perceptual separation; merely exempting all seven would weaken the existing invariant.

3. **F3 — §2: several rulings change requirements to fit the candidate.**  
   Keeping assertions on procedural assets does not preserve their protection of the shipped replacement assets. Under the supplied no-weakened-assertions constraint:
   
   | Ruling | Assessment and required resolution |
   |---|---|
   | **R1** | **KEEP.** The 58-asset scope correctly excludes hazard and the additional low wall. Pin the exact selected and preserved sets. |
   | **R2** | **TIGHTEN.** Authored source is legitimate, but preserve physical-family metadata and run applicable production-art invariants against authored inputs. Retaining procedural tests alone is insufficient. |
   | **R3** | **TIGHTEN.** Half-alpha shadows resolve a real conflict with the request’s ≤60% shadow requirement. Restrict half-alpha to the contact-shadow region as well as its ink; retain the existing strict `> 12` count, rather than changing it to `≥ 12`. |
   | **R4** | **TIGHTEN.** Clear chrome boxes are legitimate. Exclude only the actual HP rectangle from the plate assertion, not every annulus pixel below its top. Preserve strict `> 0.97`, transparent margins, and faction-colour checks. I checked that all delivered tokens have fully opaque annulus pixels outside the exact HP rectangle. |
   | **R5** | **REJECT.** Raising 20 to 50 because the candidate peaks at 49 is budget tuning. A comprehension probe does not preserve the colour-budget assertion. The proposed future target of 24 also exceeds the current budget. |
   | **R6** | **REJECT.** Its factual premise is wrong (F2), and exceptions remove the separation guarantee. Correct the candidate or obtain an explicit requirement change outside this plan’s current constraints. |
   | **R7** | **KEEP.** Hazard is explicitly a semantic-material recipe. Preserve its original output pin too. |
   | **R8** | **REJECT.** `> 0` accepts a 2× enlargement with one altered pixel. It is substantially weaker than `≥ 0.04`; seams and silhouettes do not replace native-detail coverage. |
   | **R9** | **REJECT.** Top-left lighting remains an explicit request requirement. A screenshot-comprehension result does not establish lighting direction. Correct the art or leave the affected family unaccepted. |
   | **R10** | **TIGHTEN.** Require resolved acceptance criteria in addition to the full gate, and specify an executable, comparable probe protocol (F7). |
   | **R11** | **TIGHTEN.** The stated lineage is appropriately qualified, but the tracked provenance and generated metadata must consistently express it (F11). Missing portrait-prompt lineage must remain an explicit unresolved criterion. |
   
   **Fix:** revise the plan around these dispositions. Logging exceptions as supervisor rulings does not override the standing constraints supplied for this review.

4. **F4 — S3 and S5: retained tests and contact sheets can exercise the old art.**  
   Seam, floor, plate, silhouette, and lighting tests frequently construct recipes directly with `tokenRecipe()` or `{ kind: 'floor' | 'wall' | 'door', … }`. After S2, these still paint procedural assets. The contact-sheet tool likewise constructs procedural floors, walls, and composite tokens; only its inventory loop follows `STARTER_ART_INPUTS`. Its output directory is currently hard-coded to `test-results/classic-contact-sheets`, not `.tmp`.
   
   **Fix:** retain procedural technique coverage and add production-ID coverage for all applicable existing invariants, including no-speckle and terrain-overlay visibility on the new floors. Update the review-sheet generation to resolve shipped inputs and explicitly support the intended output directory. List the assertion migration before implementation, with negative controls demonstrating that broken authored art fails.

5. **F5 — S3(c): module identity does not prove actor identity selection.**  
   The repository has **13 fixture-named tokens: four PCs and nine monsters**, not 13 named monsters. Distinct module objects or unequal pixels cannot detect swapped goblin/ogre assignments. Existing runtime selection also deliberately gives generic PCs the fighter archetype; distinct supplied PC portraits do not automatically change that.
   
   The delivered equality relationships extend beyond PC/party twins: ogre/foe-brute, priest/foe-cleric, skeleton/foe-undead, and wolf/foe-beast are also pixel-identical.
   
   **Fix:** freeze an explicit asset-ID → request-ID → RGBA-digest mapping and the intended equality groups. Test actor/package selection through the board model and final resolved image, including named mappings and generic fallbacks. Add an actual-board scene covering the distinct portraits; do not claim the existing selection policy supplies class-specific portraits everywhere.

6. **F6 — S3(e–f): rotation and seam claims need different tests.**  
   The delivered cardinal walls are **not whole-image rotations** of the north wall. `build_art.py` keeps the interior cap pattern fixed and changes the edge treatment; I compared the PNGs against all quarter-turn rotations. Corner pieces also cannot be obtained by rotating a straight wall.
   
   **Fix:** specify orientation through the floor-facing edge treatment, test corners separately, and run the existing wall/corner/door seam relations against production IDs. Test door rotation separately for each state. Add a state-sensitive aperture/leaf assertion and rendered glyph/legend agreement: eight distinct door hashes would still pass if open and closed mappings were swapped.

7. **F7 — R10/S5: the acceptance probe is not operationally specified.**  
   The cited **D573 concerns tactical experiments**, not a concrete screenshot baseline. No baseline path, digest, complete configuration, or comparison command is supplied. Moreover, the probe defaults to `comparison-mode=acceptance`, which requires identical PNG hashes and generation identity; changed art necessarily violates that comparison. Its strict gate checks per-class accuracy ≥0.9, not absence of regression.
   
   **Fix:** identify or capture a baseline on the same application revision with the old art. Pin models/efforts, states, seed, primer, glyph mode, capture size, PNG-only input, and query/truth identity. Use the existing ablation comparison for changed screenshots, while explicitly checking that only art-related dimensions differ. Predeclare the per-class regression decision, require the absolute gate, forbid simulated evidence, and assign a safe snapshot port. Include the promised 128/64/32, filtering, grayscale, and crowded-overlay review matrix.

8. **F8 — S1/S3(b): importer verification cannot depend on an absent ignored package.**  
   A skipped test with a “BLOCKED” message remains a skipped test. Comparing generated modules’ SHA fields to a copy generated into their own index establishes internal consistency, not independent provenance.
   
   **Fix:** keep full-package `--check` as a mandatory supervisor command. Make CI exercise the importer’s pure parsing/serialization core with committed text fixtures, fixed expected results, and malformed-input controls. Specify manifest validation, exact selected-set coverage, unique IDs/targets, PNG and SVG hashes, bounded integer rectangles, supported SVG syntax, opacity handling, overlap semantics, and canonical serialization. Validate everything before writing modules.
   
   The format is feasible: the 58 selections contain **61,149 SVG rectangles**, or **68,849 horizontal runs** when represented as complete rows. Measure generated-source/bundle size and initialization cost; avoid reparsing rows for every render. The PNG limit is already locally resolved: the repository encoder produced a maximum of **2,281 bytes**, comfortably below 12,000.

9. **F9 — S2/S3: the digest and pin migration is incomplete.**  
   The current test hashes only `starter-art-inputs.ts`; it will necessarily fail against the proposed aggregate `fixedInputs`. “Every authored module in id order” also leaves file discovery, index coverage, framing, and helper dependencies unspecified.
   
   **Fix:** define a canonical, versioned digest over explicit relative paths and length-framed bytes, including the authored index and every source input it selects. State which palette/decoder files are generator dependencies rather than fixed data. Replace the single-file assertion with an independent aggregate check and mutation controls for module edits, omissions, and remapping.
   
   The external oracle **does legitimately support reproduction pins**: I verified all 120 delivered SVG/PNG hashes, all 60 Pillow-decoded RGBA digests, and the 33 preserved files. Freeze those expectations by ID independently of the importer. Extend the existing independent PNG-decoding check to the authored outputs, preserve all 34 unchanged pins, and verify preview image identities. The oracle establishes faithful pixels—not acceptance of their visual qualities.

10. **F10 — S1/S2: the proposed type erases information needed by its own contracts.**  
    `{ kind: 'authored'; material: 'authored'; art }` loses token side/archetype, floor variant, wall piece, door state/orientation, and terrain-object identity. `StarterArtKind: 'map'` cannot recover floor/wall/door budgets. Existing `AssetId` validation checks syntax, not membership in the starter inventory.
    
    **Fix:** distinguish source representation from visual family using a discriminated shape retaining the relevant metadata. Use checked constructors for known-ID membership, input/art-ID equality, complete family coverage, immutable validated rows, positive bounded run lengths, and palette-only tokens. Narrow authored recipes before material-response lookup; do not invent a material response solely to satisfy the old table.

11. **F11 — R11/S2–S4: provenance remains contradictory unless existing declarations change.**  
    Appending a section leaves `ART-PROVENANCE.md`’s opening blanket statement that no third-party images were used. The preview generator also emits **`pure-procedural-only; cc-by-4.0`** metadata, which is incompatible with the planned authored CC0 outputs. The new provenance test checks request license and package-name presence but not whether that request actually corresponds to the promoted asset.
    
    **Fix:** scope the existing clean-room statement to procedural assets; correct preview metadata through its generator; preserve common manifest input-ID and redistribution-license validation across both source variants. Validate request ID, `redoOf`, dimensions, and asset mapping together. Record tool identity separately from contributor attribution, preserve the source hashes and available prompt lineage as text, and explicitly track the unavailable portrait prompt against the README’s promotion requirement. No additional tracked rasters are needed.

**REVISE — blocking findings: F1–F11.**