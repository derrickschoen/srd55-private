# SVG-fog brainstorm — supervisor critique, round 1 (2026-09-13 21:08, Fable 5.1)

Input: brainstorm-svg-fog-astra-r1.md (nine experiments, ranking, first pilot = 5-px Option A frame vs unchanged Quietstone, 48 calls). Verified myself where marked.

## Accepted as written
- Experiment 2 (conversion-only equality control): correct and important — converting the same pixels through SVG changes nothing; the owner's hypothesis only has content if the geometry changes. Zero-call check.
- The 3-px vs 5-px sampling arithmetic (VERIFIED by hand: nearest-neighbour 32 from 128 samples every fourth source row; a rail on rows 12–14 covers y-phases 0,1,2 and misses phase 3; a 5-px rail on rows 12–16 covers all four). The plan's 3-px invariant must be amended explicitly, not quietly.
- CSS facts (VERIFIED by reading styles.css:68 and :887): the later `.encounter-art-fog { opacity: 0.78 }` wins over 0.72; fog z-index 4 sits above obscurement z-index 3; `full` glyph mode hides the fog art layer. Any grammar change must decide the `full`-mode behaviour explicitly.
- Legend-only arm (exp 8) is cheap and separates "the model reads the legend" from "the model reads the cells". Keep it early.
- Lossless removal of translucent fog from a flattened capture is impossible; painting new fog over old fog doubles the intervention.

## Findings against the brainstorm
- **S-1 (blocks the protocol as written): no repeatability arm.** The two-direction intervention finished after astra's inputs were frozen: ordinary-floor fog FP totals were 280 (original candidate run, 2026-09-11) / 83 (original baseline run) / 33 (candidate + baseline floors, today) / 25 (baseline + candidate floors, today). Both recomposed sets have far fewer false positives than BOTH originals, and 226 of the candidate's 280 sit in one base seed. Astra's protocol reuses the old acceptance run as the paired control ("zero calls if equal") — that is exactly what this data forbids: day-to-day model drift and single-layout concentration can swamp a 0.05 Jaccard threshold. Required experiment 0: run the UNCHANGED Quietstone captures (the original acceptance PNGs via the override harness) twice today, 48 calls; report the within-condition spread per base; every later "≥0.05 absolute" threshold becomes "≥ max(0.05, 2× the measured spread)" and the pairing is always against a same-day control.
- **S-2: the recomposition route is the wrong experiment loop for a layer change.** Pixel recomposition needs a fog-free underlay that does not exist. The capture pipeline already saves the board DOM (`board-html/` in every images root) and the fog art is a CSS-var data URL set at encounter-app.ts:698. The cheap and exact route is a re-capture with an overridden asset: rewrite the saved board HTML's fog asset URL (and legend swatch in legend arms) to the candidate PNG/SVG and screenshot it with the same pinned Chromium at the same viewport — every other layer is composited by the browser exactly as production would. Proposal: a probe/snapshot flag `--asset-override fog.hidden=<file>` (intervention-only, provenance = asset sha + renderer version) instead of the pixel-recomposition script astra sketched. Same override-manifest downstream. Needs astra's view on determinism and what it invalidates.
- **S-3: "48 calls" is the wrong unit of cost.** Set 2 today took 18 min for 24 sol calls without capture; set 1 took 46 min with capture. Cost per arm is ~20 min wall and one sol session; the binding constraint is supervisor gating time and the pin/oracle work on a win, not calls (D381: spend is a non-constraint).
- **S-4: the semantic board-input point is stronger than astra states.** If the production DM path sends the semantic board (`--board-input semantic/both`), the whole fog-legibility question only matters for the PNG-only path. Before any pilot the owner should confirm which input the shipped AI DM uses; if semantic, the experiment's value is the human/board legibility, not the model's.
- **S-5 (minor): manifest provenance placement.** Sol's blocked report proposes top-level `sourceRevision`/`sourceImagesRoot` + per-state `sourcePng{sha,width,height}` with a version bump; astra puts provenance under `manipulationValidation` because the state schema is strict. Sol is editing the schema now (r3b); either placement is fine as long as the probe authenticates the source capture by digest and IHDR.

## Amended ranking (supervisor)
0. Repeatability: unchanged Quietstone ×2, same day (48 calls) — mandatory before any threshold is read.
1. Conversion-only equality control (0 calls).
2. 5-px frame vs same-day unchanged control (24 calls, control shared with 0).
3. Legend-only correction (24 calls).
4. Blurred negative control (24 calls).
5. Tile-size 64 robustness (48 calls) — before promotion.
6. Lighter interior / obscurement re-authoring / inline SVG — only if 2 wins.
Route for 2–6: DOM re-capture with asset override (S-2), not pixel recomposition.
