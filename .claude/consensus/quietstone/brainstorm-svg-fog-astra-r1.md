# SVG-fog brainstorm, astra round 1 (2026-09-13, read-only, dnd-wt-quietstone at 46dbc344)

Source: .tmp/runs/fanout/brainstorm-svg-fog-r1.log (verbatim final message)

I recommend testing **a cell-contained fog signature authored as SVG and rasterised to PNG**, with floors unchanged. The likely benefit is the geometry that reaches the screenshot. SVG authoring itself cannot help when the resulting pixels are identical.

The first paid pilot should compare **a 5-pixel-stroke version of Option A against unchanged Quietstone**, over the same 24 states with Sol high: **48 Q9 calls total**. Keep the literal 3-pixel Option A as a deterministic control: a local mask check already exposes a downsampling problem.

This is a brainstorm for the supervisor’s critique and the owner’s experiment selection. I verified HEAD `46dbc344`; made no edits, git writes, agent/model calls, or suite runs.

**What the evidence establishes**

The [diagnosis](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-diagnosis.md:23) confirms a substantial change in floor texture:

| Measurement | Baseline | Quietstone |
|---|---:|---:|
| Median interior luminance SD, five selected regressions | 0.0505 | 0.0099 |
| Median interior luminance SD, other 19 observations | 0.0505 | 0.0193 |
| Median edge density, five selected regressions | 0.1492 | 0.0000 |
| Median edge density, other 19 observations | 0.1492 | 0.0001 |

The plan reports Sol Q9 falling **0.239→0.127**, fog predictions increasing **173→450**, and only **24 true fog cells** across the 24 boards. The fog asset itself did not change, and direct floor/fog contrast increased. Those observations argue against “make fog darker” as the primary remedy.

They do **not** establish that floor flatness caused the classification failure:

- The primary match retained only **16 pairs**. Pooled coverage was **0.48% exposed / 0.81% unexposed**, against the required 70% in each arm of every base. The stricter sensitivity match retained zero pairs.
- Obscurement collisions are real, but their causal verdict is also inconclusive. Only two bases exceeded the predeclared +0.10 collision-rate increase; one improved substantially. Collision-cell obscurement-template NCC was **0.8866**, but the matched comparison was `NA`.
- Your new intervention results—**0.303** for candidate art with baseline floors versus **0.203** for baseline art with candidate floors—support investigating floor context. They do not replace the pending per-base rate and omission verdict.

There is a reporting discrepancy to reconcile: the diagnosis’s obscured-only table sums to **76→112 fog false positives**, whereas the plan quotes **59→105 “obscured read as fogged.”** Treat these as distinct reported quantities until their accounting is reconciled.

My causal hypothesis is:

> Quietstone removes familiar floor structure. Sol sometimes assigns the resulting broad field to the semantic category “fog”; existing grey legend samples and veil-like overlays provide weak evidence against that interpretation. Shared diagonal structure then encourages fog/obscurement/darkness confusion.

That remains conjecture. Astra’s much smaller regression also suggests a model-dependent classification boundary.

A useful fog signature should supply several independent cues:

- **Boundary ownership:** repeated inset marks identify individual cells, including adjacent fog cells.
- **Geometry:** broken orthogonal frame and inward ticks, distinct from ordinary flagstone seams and obscurement’s closed shapes.
- **Contained hatch:** one diagonal, terminating well inside the cell.
- **Local contrast:** frame edges remain visible over every floor and illumination treatment; average darkness alone is insufficient.
- **Colour family:** neutral fog versus saturated cool obscurement, with geometry still distinguishing them in grayscale.
- **Legend consistency:** actual composited samples at the real swatch sizes.
- **Stable glyph behaviour:** the texture works under `none`; `full` adds one cloud mark without replacing or doubling the veil.
- **Independent overlap recognition:** fog and obscurement both remain detectable when they occupy the same cell.

The confounds are floor texture, illumination and shade, source alpha multiplied by CSS opacity, tile sampling phase, whole-image resizing by the vision pipeline, legend size, glyph mode, overlapping layers, and DM-only projection.

**Important implementation findings**

The procedural painting lives in [pixel-art.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/pixel-art.ts:1010); the generator tool materialises its outputs. Current fog uses neutral-0 fill at alpha 250, with a one-pixel, pitch-6 hatch whose pixels **replace** the fill with neutral-1/alpha-150 pixels. A naïve SVG background plus translucent hatch would produce different pixels through alpha stacking.

The effective fog CSS opacity is **0.78**: the later rule overrides 0.72. Fog has z-index 4; obscurement has z-index 3. Outside hatch pixels, the fog therefore contributes approximately `250/255 × 0.78 = 0.765` effective opacity. That can suppress obscurement beneath it.

Under `full`, CSS currently hides `.encounter-art-fog`, and the fog glyph supplies hatching. Shipping the plan’s cloud-only glyph therefore requires changing that CSS behaviour too.

Finally, SVG does not remove sampling limits. A straightforward 3-pixel horizontal rail can disappear when sampled every fourth source pixel. My small Node mask check found:

| Draft geometry | 32-pixel phases losing the top rail or hatch |
|---|---:|
| 3-pixel frame and hatch | 7/16 |
| 5-pixel frame and hatch | 0/16 |

This checks those particular masks only. It does **not** establish the full reduction, contrast, legend, or D516 contracts.

**Common experiment protocol**

Every paid native-size comparison uses:

`seed=20260910`, 24 states, `gpt-5.6-sol:high`, `primer=general`, `boardGlyphs=none`, `captureTilePx=128`, `boardInput=png`, unchanged Q9/prompt/scorer/normaliser.

For recompositions, generation must contain `intervention`; it cannot remain the acceptance generation unchanged.

Measure mean per-state Q9 Jaccard, paired changes by all five base seeds, every leave-one-base-out result—including removal of `5763040`—and the plan’s complete TP/FP/FN accounting. Report ordinary-floor fog FP separately from obscured-as-fog collisions. Preserve both recognition bits on overlap cells.

Use the [plan’s frozen deterministic gates](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-11-quietstone-fog-legibility-plan.md:113):

- Target NCC **≥0.60**, structural margin `S` **≥0.20** for single-class composites.
- Plain/uniform-grey/grid negatives: fog NCC **≤0.35**.
- Overlap: each independently masked class NCC **≥0.55**, each margin **≥0.15**.
- Zero-variance NCC is `NA` and fails.
- Native 128; nearest and area 64 at four phases each; nearest and area 32 at sixteen phases each; actual browser legend composites at **28 and 14 pixels**.
- Preserve gutter, runs, breaks, notches, adjacency, and the named negative controls and mutants.

Include magical darkness among competing masks and negatives, without changing its pixels.

For positive rendering candidates, I propose this **pilot promotion threshold**, distinct from merge acceptance:

1. Q9 improvement **≥0.05 absolute** over the paired control.
2. Positive within-base mean improvement in at least **four of five bases**, with positive mean improvement after removing `5763040`.
3. No newly omitted control-detected fog cell or lost overlap label; neither aggregate class FN increases.
4. Ordinary-floor fog FP and obscured-as-fog collisions do not increase; at least one falls by **≥25%**, provided its control count is nonzero.
5. All deterministic gates pass.

A transport/coverage/authentication failure invalidates the comparison. Mixed base results or smaller gains are inconclusive. Improved IoU obtained by suppressing correct fog predictions fails.

Shipping still requires the stricter existing gate: baseline-relative Q9, **all 24 boards green**, anti-suppression checks, and the full specified verification. A pilot does not waive those requirements.

Costs below are estimates for experiment implementation, excluding review and shipping work. Shared authentication/recomposition infrastructure is approximately **6–10 hours**. Each additional arm costs **24 model calls**; a fresh two-arm comparison costs 48.

**Nine candidate experiments**

1. **Literal Option A, SVG→PNG — the grammar control**

   **Hypothesis:** a bounded, repeated frame changes fog from a broad field into a countable cell mark.

   Use `viewBox="0 0 128 128"`. Define geometry using filled shapes to avoid stroke-centre ambiguity:

   - Frame’s outer extent: `[12,116)` on both axes.
   - Three runs per side: `[12,40)`, `[48,80)`, `[88,116)`—88 marked positions and two 8-pixel breaks.
   - Frame thickness: **3 px**, directed inward.
   - One **3-pixel-wide tick per side**, extending inward to coordinate 24, with mirrored placement on opposite sides.
   - Hatch clipped to `[28,100)²`; diagonal bands corresponding to `(x+y) mod 16 < 3`, with no second diagonal.
   - Palette: neutral-0 veil at alpha 250; neutral-7 frame at alpha 255; neutral-4 hatch at alpha 150. Regions are disjoint, so their alpha meaning is explicit.
   - Outer gutter contains veil but no frame or hatch.

   Rasterise the transparent SVG in pinned Chromium at 128×128, DPR 1. Use crisp, palette-preserving masks; inspect decoded RGBA for accidental antialias colours.

   **Fixed:** floors, obscurement, darkness, CSS opacity, projection, chrome and prompts. A paired truthful legend is a declared additional component if included.

   **Measurement/threshold:** common protocol and positive pilot threshold. This is the required control geometry for later variants. Its straightforward 3-pixel construction already fails part of the phase gate; do not spend calls merely to rediscover that failure. A 128-only model gain would establish a useful native-size result, not a shippable solution.

   **Cost:** 2–4 hours; zero calls for deterministic screening, optionally 24 as a purchased control arm.

   **Shipping consequences:** plan’s `5.0.0→5.1.0`, two fog-related output pins, fixed-input/preview pins, truthful legend and full-mode changes. The physical fog must pass D516; authored-floor ledger stays unchanged.

2. **Conversion path only — pixel-identical legacy SVG**

   **Hypothesis:** converting the current art through SVG provides no recognition gain unless it changes the visible pixels.

   Encode the **existing** fog exactly as disjoint SVG rectangles: neutral-0/250 where `(x+y)%6 !== 0`, neutral-1/150 where it equals zero. Merge consecutive equal pixels into row rectangles; no geometry, colour, pitch, alpha or legend changes.

   Compare the shipping pure-TS raster with Chromium’s SVG raster, using identical final PNG encoding. This is the cleanest isolation of source format from grammar.

   **Fixed:** everything visible, including legend, should be identical.

   **Measurement/threshold:** require exhaustive RGBA equality, then identical recomposed board digests. Structural scores and reductions must match exactly. **Zero calls if equal**: the same authenticated Q9 inputs can be reused. Optional duplicate submissions only measure model repeatability.

   Any pixel difference makes this a rasterisation experiment, not evidence for “vector authoring.” Any Q9 difference on identical bytes is model variability.

   **Cost:** 1–2 hours; normally zero calls.

   **Shipping consequences:** none if discarded. Byte-identical assets need no output repin. There is little reason to ship an additional conversion step that changes nothing.

3. **Five-pixel Option A — recommended substantive candidate**

   **Hypothesis:** Option A needs thicker structural marks to survive reduction.

   Use experiment 1’s geometry, palette, pitch, gutters and opacity, changing frame, hatch and tick widths from **3 to 5 px**, expanding inward. Preserve the 8-pixel breaks and the tick endpoint at 24.

   **Path:** Chromium SVG→PNG at 128 for the experiment. If it wins, evaluate a small pure-TS rasteriser for this restricted geometry as the production path.

   **Fixed:** everything else. Against experiment 1 this isolates stroke thickness; against shipping Quietstone it tests the new grammar as a whole. Keep legend pixels unchanged for the first board-only pilot.

   **Measurement/threshold:** common positive threshold and full reduction gate. The local mask result removes one known failure, but 14-pixel legend disappearance or insufficient composite contrast still rejects it.

   **Cost:** 1–2 incremental hours; 24 calls against an already purchased control, or 48 for the recommended fresh shipping-versus-candidate pilot.

   **Shipping consequences:** same surface as experiment 1, plus an explicit amendment to the plan’s **3-pixel** requirement. Do not quietly rewrite that invariant after observing results.

4. **Inline SVG in the DOM**

   **Hypothesis:** rasterising the geometry directly at its display size preserves structure better than shrinking a 128-pixel bitmap.

   Insert experiment 3’s exact SVG into the existing fog-layer position, `viewBox="0 0 128 128"`, full cell size, pointer-events disabled, same group opacity and z-order. Use ordinary scaling strokes; no `non-scaling-stroke`, since that would change the thickness experiment.

   Compare against experiment 3’s PNG background at the same dimensions. At 128, establish pixel equivalence or document every rasterisation difference before model scoring.

   **Fixed:** geometry, colour, opacity, layer ordering, legend policy and state.

   **Measurement/threshold:** native Q9 should be noninferior within **0.02**, with no recognition losses. To justify this extra production path, require a reduction defect to disappear and a **≥0.05** paired Q9 gain at 64. Otherwise prefer PNG. It is inconclusive if differences arise from positioning, antialiasing or altered strokes that were not declared.

   **Cost:** 4–7 hours; zero native calls if captures are identical, otherwise 48 for a fresh paired size comparison.

   **Shipping consequences:** broader renderer/CSS/legend work and browser contracts. It also changes how the fog asset inventory, preview and D516 obligations apply; inline SVG cannot silently bypass those contracts.

5. **Re-author obscurement into a distinct round grammar**

   **Hypothesis:** fog’s new frame still competes with obscurement’s diagonals; removing shared orientation improves class assignment.

   Hold experiment 3 fog fixed. Replace the three diamonds with **three concentric circles**, centre `(64,64)`, radii **48,32,16**, stroke width **6 px**. No hatch, square frame or ticks. The outermost marked extent is 13 pixels from the edge.

   Use the existing cool palette family: opaque bright cool skeleton; existing light/heavy fill alphas **120/180**. Both strengths share geometry. Use a crisp integer mask expressed as SVG row rectangles, avoiding antialiased intermediate colours.

   **Path:** Chromium SVG→PNG initially; restricted pure-TS circle-mask rasterisation if promoted.

   **Fixed:** fog, floors, illumination, magical darkness, glyph mode. Obscurement’s matching legend sample changes only in the declared legend version.

   **Measurement/threshold:** common positive threshold, plus obscured-only-as-fog FP reduction **≥50%** and no obscurement recall loss. Must pass grayscale geometry separation and both overlap-strength fixtures. Failure includes circles being interpreted as another game symbol or creating new floor positives.

   **Cost:** 3–5 hours; 24 incremental calls.

   **Shipping consequences:** expands the exact two-output change inventory to include light/heavy obscurement; requires separately reviewed scope, oracles, preserved-ID accounting, preview and legend changes. Keep magical darkness byte-identical.

6. **Tile-size robustness using the same SVG**

   **Hypothesis:** benefits persist under actual display reduction, rather than depending on large native marks.

   Compare experiment 3 PNG with experiment 4 inline SVG at **64 CSS pixels**, using the same SVG coordinates and no adaptive restyling. Reuse their native 128 measurements. Test both through the complete deterministic 32-pixel matrix.

   **Fixed:** within each size comparison, states, complete board layout rules, model, legend policy and grammar.

   **Measurement/threshold:** require each candidate’s 64 Q9 to remain within **0.05** of its own 128 result, without new fog omissions, and retain its advantage over the size-matched shipping control. All 32-pixel deterministic phases must pass.

   The current harness accepts **64 or 128 only**. A real 32-pixel Q9 board run needs an explicitly extended dimension/capture contract. Do not resize an entire screenshot and call it a 32-pixel production capture; that changes chrome and fails the current dimension contract.

   **Cost:** 2–4 hours for existing-size work; 48 calls per fresh paired 64 comparison; zero for deterministic 32 screening.

   **Shipping consequences:** none for a diagnostic-only run. Supporting actual 32-pixel captures is additional harness/chrome work, separate from the fog asset change.

7. **Destructive raster negative control**

   **Hypothesis:** recognition depends on retained structure, not the fact that SVG was somewhere upstream.

   Take experiment 3’s rasterised overlay; area-downsample **128→16**, then bilinear-upsample **16→128**. Process premultiplied colour/alpha, changing only the overlay. Preserve its placement and constrain processing to the intended region. Leave the clean experiment-3 legend unchanged.

   **Fixed:** source SVG, floors, browser composition, CSS opacity, all non-fog pixels and model input settings.

   **Measurement/threshold:** this is a successful negative control if structural margin falls by **≥0.10** and Q9 falls by **≥0.05** versus clean experiment 3. Check average alpha/luminance changes; differences exceeding a predeclared **1%** tolerance make it an opacity/brightness-confounded control.

   No Q9 degradation despite verified structural destruction would weaken the proposed mechanism, especially if fog recall is unchanged. If the treatment fails to destroy measured structure, it is inconclusive.

   **Cost:** 1–2 hours; 24 incremental calls after a clean arm exists.

   **Shipping consequences:** none; these degraded assets are experimental artifacts only.

8. **Legend-only correction**

   **Hypothesis:** incorrect legend exemplars drive more confusion than the board tiles.

   Keep every board cell unchanged. Replace the two flat Fog/Obscured swatches with **actual floor-plus-current-overlay composites**, including fog’s effective CSS opacity. Render at the existing **28-pixel** native legend size and verify 14 pixels separately. Preserve labels, allocated rectangles, row positions and all other chrome.

   **Path:** browser-composited legend patches. Use the current geometry, not the proposed frame.

   **Fixed:** all board pixels and current fog/obscurement art.

   **Measurement/threshold:** common Q9/error threshold; board structural scores must remain identical. If this obtains an improvement within **0.02** of the new-grammar pilot’s improvement, the legend may explain most of the benefit. That comparison is exploratory until independently repeated.

   A legend win does not repair missing cell structure; it shows where the information is coming from.

   **Cost:** 1–3 hours; 24 incremental calls against the unchanged control.

   **Shipping consequences:** legend implementation/contracts and browser expectations only; no procedural art version or output hashes. Combining it later with new geometry requires a distinct combined-arm evaluation.

9. **Preserve obscurement through a lighter fog interior**

   **Hypothesis:** fog’s upper layer hides the obscurement skeleton even when their grammars differ.

   Start with experiment 3. Keep frame, ticks and hatch unchanged. In the inner `[28,100)²` region, reduce **only the veil** alpha from 250 to **96**; retain the original veil alpha elsewhere. Apply this same fog tile to every fog cell, regardless of obscurement truth.

   **Path:** SVG→PNG, using disjoint alpha regions; CSS remains 0.78.

   **Fixed:** obscurement art, z-order, all geometry and non-fog layers.

   **Measurement/threshold:** both overlap detectors must pass, neither overlap label may be lost, and overlap obscurement recognition must improve where the control missed it. Common Q9 and anti-FP gates still apply. The probe contains too few overlaps for a strong standalone causal claim; synthetic light/heavy overlap fixtures are essential.

   This is a bounded occlusion experiment, not the rejected global “darker fog” remedy. If it only alters broad-field interpretation without improving overlap recognition, the intended mechanism is unproven.

   **Cost:** 2–3 hours; 24 incremental calls.

   **Shipping consequences:** fog output/oracle and permitted-alpha changes; a reviewed addition to Option A’s rendering specification. No truth-dependent rendering exceptions.

**How to run these cheaply without production changes**

The new [manifest schema and harness](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:507) already support this shape:

```json
{
  "kind": "svg-fog-frame5-board-only",
  "version": "qsfog-svg-recomposition-v1",
  "states": {
    "<state-id>": {
      "file": "<sha256>.png",
      "sha256": "<64 lowercase hex characters>",
      "width": 0,
      "height": 0
    }
  },
  "manipulationValidation": {}
}
```

The displayed zero dimensions are placeholders: real values must be positive and match the authenticated source capture. Top-level and state-entry schemas are strict; provenance belongs inside `manipulationValidation`.

The existing [recomposition script](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py:1478) copies authenticated paired cell composites where the layer inventory proves that only floors differ. It does **not** provide a general fog-layer replacement operation.

An SVG-fog script should:

1. **Authenticate inputs:** source PNG, state/truth, captured DOM/HTML, dimensions, asset inventory and their digests. Record SVG hash, arm parameters, renderer version, DPR, colour settings and composition method.
2. **Recover the layer stack:** obtain a fog-free underlay plus unchanged foreground layers from the frozen DOM or an independently validated reconstruction.
3. **Prove a no-op:** reinsert the old fog and require exact decoded-RGBA equality with the original capture before inserting new fog.
4. **Replace at the existing layer position:** change fog on exactly the true fog cells, using existing geometry. The authenticated origin is `(52,52)` at tile 128; verify it from DOM rather than assuming it at other sizes.
5. **Preserve unaffected pixels:** copy original decoded pixels outside the declared mutation masks; update legend patches only in legend arms.
6. **Write content-addressed PNGs and a manifest:** include source capture SHA, truth SHA, SVG SHA, renderer metadata, exact changed-pixel counts, outside-mask changes, no-op results and per-layer invariants.

**Captured PNGs plus truth lists alone are insufficient for exact replacement of translucent fog.** The old fog cannot generally be removed losslessly from a flattened composite. Painting new fog over it doubles the intervention.

“Byte-identical preservation” also needs two precise meanings:

- Unchanged screenshot regions—chrome, roster, coordinates, unaffected cells and foreground tokens—must have identical **decoded pixel bytes**.
- Walls or obscurement underneath changed translucent fog retain identical **source layer bytes and ordering**, but their final visible pixels necessarily change. Requiring those final pixels to remain identical would prevent a correct fog replacement.

PNG compression bytes for the whole file will change; that is why both file digests and decoded-region checks matter.

A future supervisor invocation can use:

```text
npx vite-node tools/ai-dm-screenshot-probe.ts
  --models gpt-5.6-sol:high
  --states 24
  --seed 20260910
  --primer general
  --board-glyphs none
  --capture-tile-px 128
  --board-input png
  --questions Q9
  --generation quietstone-svg-fog-intervention-r1
  --image-override-manifest <worktree-local-manifest>
  --images-root <worktree-local-output>
  --out <worktree-local-jsonl>
```

Run separate manifests for control and candidate. The current harness:

- skips original capture for override runs;
- requires PNG input and `intervention` in generation;
- rejects `--compare`;
- checks image digests and dimensions;
- records `originalPngSha256: null`;
- records runtime worktree HEAD, which does **not** authenticate the source capture.

Therefore the manipulation manifest must carry source provenance, and paired analysis must happen separately. The manifest’s validation metadata is evidence supplied by the script, not a substitute for those assertions.

**Ranking and first experiment**

| Priority | Experiment | Information per cost |
|---|---|---|
| 1 | Conversion-only equality control | Cheaply eliminates “SVG itself” as an explanation; usually zero calls |
| 2 | Five-pixel frame versus unchanged Quietstone | Direct test of the owner’s practical hypothesis |
| 3 | Legend-only correction | Separates cell recognition from legend-driven interpretation |
| 4 | Blurred raster negative control | Tests whether retained structure explains any win |
| 5 | Literal three-pixel Option A | Essential geometry reference; screen deterministically first |
| 6 | Tile-size robustness | Necessary before promotion; most early work is deterministic |
| 7 | Lighter fog interior | Targets the verified layer-order concern |
| 8 | Obscurement re-authoring | Useful if collisions persist; expands art scope |
| 9 | Inline SVG | Worth its larger surface only if PNG reduction remains deficient |

The **first paid experiment** is experiment 3 versus unchanged Quietstone, one model, the same 24 states, **48 calls**. Freeze the old legend in both arms to isolate cell rendering. First require the no-op reconstruction and deterministic gates. If the 5-pixel candidate fails those gates, revise or reject it before paying for Q9.

Use experiment 1 as the literal-plan control during deterministic development and any later thickness comparison. Its identified sampling defect makes it a poor first expenditure of model calls.

If the board-only pilot wins, test truthful legend integration separately, then freeze the combined candidate for acceptance. Keep floors unchanged unless the supervisor’s two-direction intervention licenses Option B.

**Smallest shippable path after a win**

Prefer a **PNG asset through the existing renderer**. Use Chromium for experimental rasterisation; for shipping, a small pure-TS rasteriser for the chosen closed geometry avoids making every asset generation depend on Chromium.

That should be a restricted vector grammar, not a new general SVG parser. SVG authoring and TS rasterisation must be checked against independently specified masks.

Expected files and pin movement:

- [pixel-art.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/pixel-art.ts:1010): separate legacy darkness hatch, fog grammar and cloud-only glyph.
- `starter-art-inputs.ts`: generator `5.0.0→5.1.0`; retain `starter-art-inputs-v5` if its schema is unchanged.
- `board-chrome.ts`: truthful floor-plus-overlay samples.
- [styles.css](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/styles.css:1358): retain the fog layer under `full`, with one cloud glyph.
- Exactly two procedural PNGs/output digests for fog-only shipping; corresponding preview embeddings, fixed-input digest, expected hashes and preserved-ID accounting.
- No authored-floor payload or authored-floor ledger changes.
- No prompt, truth, scorer, normaliser or semantic contract changes.

A browser raster and the TS renderer sharing geometry are **not independent pin oracles**. Follow the [plan’s independent oracle/encoder contract](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-11-quietstone-fog-legibility-plan.md:154): independently specified pixel masks, independently encoded expected PNGs, frozen unchanged encoder vectors, and independently transformed preview bytes. Never promote screenshot-derived hashes into expectations.

Verification remains the plan’s targeted asset, glyph, legend, projection and probe contracts; full phase matrix and mutants; zero/one/several/adjacent/overlap fixtures; DM/player projection checks; no doubled veil; unchanged magical darkness; D516 palette, alpha and detail checks; generator check; typecheck; and the two specified browser specs. The eventual supervisor acceptance run also checks other question classes for collateral regressions.

**What could make this direction unhelpful**

- **Legend dominance:** a legend-only correction matches the geometry gain.
- **Structure is irrelevant:** blurred and clean overlays score similarly despite verified structural degradation.
- **PNG already retains everything useful:** inline SVG provides no advantage at matched display size.
- **Opacity dominates:** the frame works alone but both overlap labels cannot survive the existing stack.
- **Sampling defeats the design:** five-pixel strokes still lose required marks at 14-pixel legend size or in area reductions.
- **D516 conflicts:** antialiasing introduces excess colours, or coarse geometry fails native detail. Do not add noise merely to clear the metric.
- **Renderer drift:** Chromium versions change edge coverage or PNG encoding. Pin the environment and compare repeated decoded RGBA as well as file hashes.
- **Model-side resizing:** direct DOM vectors still become a PNG and may be resized again before interpretation.
- **Evaluation overfitting:** all 24 probe boards have one true fog cell and only five base layouts. Extra deterministic fixtures remain necessary.
- **Wrong product objective:** the production model path may use semantic board input. The probe explicitly supplies semantics under `semantic`/`both`, which can obscure a visual improvement. PNG-only remains necessary to test this hypothesis.
- **Projection leakage:** SVG insertion must remain downstream of the existing DM projection; it must never manufacture a fog layer for players.

SVG-FOG BRAINSTORM R1 DONE