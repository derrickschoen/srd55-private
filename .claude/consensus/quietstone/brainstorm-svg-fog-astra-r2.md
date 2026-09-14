# SVG-fog brainstorm, astra round 2 (2026-09-13, read-only, dnd-wt-quietstone at 46dbc344)

Source: .tmp/runs/fanout/brainstorm-svg-fog-r2.log (verbatim final message)

**Accept S-1, S-3 and S-5. Accept S-4’s value question, with a correction about the defaults. Accept S-2’s browser-compositing approach, but reject its saved-HTML premise.**

The immediate experiment is now **unchanged Quietstone twice**, before testing new fog. D616.1 leaves floor replacement unlicensed.

**S-1 — Accept: add repeatability and replace historical model controls**

The new evidence makes a fixed 0.05 improvement threshold inadequate:

- Ordinary-floor fog FP totals: **280 / 83** in the original candidate/baseline runs, versus **33 / 25** in today’s recompositions.
- **226/280, or 80.7%**, of the original candidate’s ordinary-floor errors come from base `5763040`.
- The [intervention verdict]( /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/quietstone/intervention-analysis/verdict.md) is inconclusive: joint directional thresholds pass in only **1/5** and **0/5** bases; omissions also regress.

These results do not prove model drift: images changed too. They establish that drift and repeatability must be measured before attributing the difference to art.

Run the **exact original Quietstone PNG bytes twice**, with separate fresh model invocations and output directories. Call these C1 and C2. Do not recapture these inputs.

I propose this explicit spread rule, frozen before candidate answers are inspected:

For each base \(b\), with per-state Q9 scores \(q\):

\[
s_b=\operatorname{mean}_{i\in b}|q_{C1,i}-q_{C2,i}|
\]

Also report the absolute difference between the two base means. Using mean absolute per-state differences prevents opposing changes from cancelling.

Define:

\[
s=\max_b s_b,\qquad T=\max(0.05,2s),\qquad T_b=\max(0.05,2s_b)
\]

For a positive candidate A:

- Compare each state against the **predeclared average of its C1/C2 scores**.
- Require the 24-state mean improvement **≥T**.
- Require within-base improvement **≥T_b in at least four of five bases**.
- Require positive improvement in every leave-one-base-out analysis, explicitly including removal of `5763040`.
- Retain exhaustive error accounting, overlap recognition and anti-suppression checks. A higher Jaccard alone is insufficient.

For error rates, separately report repeat differences using their fixed eligible denominators. A claimed error reduction must exceed **twice the measured rate spread** as well as its experiment-specific threshold. Do not apply a Jaccard spread numerically to an FP rate.

Two repeats provide a conservative operational screen, **not a confidence interval or a reliable estimate of the model’s full variance**. If `T` exceeds the available score headroom, the pilot is unable to establish a win under this protocol. Report that as inconclusive; do not lower the threshold.

Pairing rules:

- Same frozen PNGs, state IDs, truth, harness bytes, prompts, normaliser, model/effort and invocation policy.
- Run C1/C2 and the candidate in one scheduled block. Proposed maximum control reuse: **two hours**, and never across a date, model/configuration change or service interruption.
- Prepare and validate candidate images **before** starting that block.
- Reuse both controls; never select whichever produced the easier comparison.
- A later experiment with a different reference—such as blurred versus clean new fog—needs repeats of **that reference**. Old-fog repeatability cannot establish new-fog repeatability.
- Transport failures invalidate coverage; they are not zero scores. Record replacements rather than silently rerunning unfavourable answers.

For pilot anti-suppression, a fog/overlap fact correctly recognised in **both** controls is a stable positive: losing it rejects promotion. Facts on which controls disagree remain explicitly unresolved and require confirmation. This does not relax the plan’s stricter final acceptance contract.

**Can the September 11 acceptance runs serve as any control?**

Yes, as **frozen stimulus sources, historical observations and engineering references**. Their PNGs remain valuable unchanged inputs; their truth and provenance remain useful.

Their **saved model answers cannot be a causal control for today’s experiment**, including when a new conversion produces identical PNGs. My round-1 “reuse the score if equal” statement was too broad. Equality eliminates a conversion comparison’s need for new calls; it does not eliminate today’s repeatability requirement.

Final acceptance should score the frozen baseline and candidate inputs contemporaneously. Report the September 11 numbers alongside them, without claiming that a historical difference isolates the art effect.

**S-2 — Accept browser replacement; reject replaying the existing `board-html`**

The saved HTML is not the graphical board.

At [snapshot line 643](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-board-snapshot.ts:643), the service calls `serializeAccessibleBoard(...)` and saves its output. That serializer produces a [screen-reader document containing tables and textual facts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/accessible-board.ts:278).

I inspected one saved, digest-matching artifact:

- Screen-reader board: present.
- `.encounter-board`: absent.
- `.encounter-art-fog`: absent.
- Image data URLs: absent.

The service uses visual `outerHTML` transiently to check stability, but does not save it as the graphical replay document.

Consequently, **no rewrite of the existing saved HTML can reproduce the original graphical capture**. It has neither the visual structure nor its styles/assets. Screenshotting it would also expose textual cell facts, invalidating a PNG-only legibility experiment.

There is a second correction: [line 698](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/encounter-app.ts:698) installs CSS variables for `OVERLAY_ASSETS`. Ordinary fog is instead rendered at [line 740](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/encounter-app.ts:740) as:

```html
<img class="encounter-art-layer encounter-art-fog"
     data-asset-id="art.fog.hidden.v1"
     src="data:image/png;base64,...">
```

The necessary replacements in a **live visual DOM**, or a newly captured visual replay document, are:

| Arm | Exact rendering surface to replace |
|---|---|
| Fog PNG | `src` of matching fog `<img>` elements |
| Inline fog SVG | Matching fog elements, preserving their position, dimensions, opacity and stacking |
| Obscurement | `--art-overlay-obscurement-light` and `--art-overlay-obscurement-heavy` on `.encounter-board` |
| Magical darkness | Leave its CSS variable and bytes untouched |
| Legend-only | Fog/Obscured swatch elements; preserve labels, boxes and layout |
| Future art-style legend | Its own inline `background-image` URLs; changing a board CSS variable does not automatically update these |
| Full-mode fog glyph | Separate glyph asset/CSS variable; outside the first `none` pilot |

A truthful fog legend must reproduce the overlay’s **effective opacity over its floor**. Merely stacking its PNG at full opacity in `background-image` is not equivalent to the board.

The smallest practical route is therefore:

1. Reconstruct the same generated state through the existing snapshot service.
2. Capture the settled, unchanged graphical board.
3. Replace the selected asset in the **same live DOM**.
4. Decode replacement images, recheck stability and capture again.
5. Restore the original asset and require the restored capture to equal the first.

This lets Chromium composite floors, walls, obscurement and foregrounds. **The pixel-recomposition script is unnecessary for these arms.**

No-op determinism remains a measured gate:

- Require repeated/restored captures in the same environment to match **PNG bytes and decoded RGBA**.
- Compare the new unchanged capture with the archived original.
- If they match, the archived-image repeat controls can also control the new rendering arm.
- If they differ, archived controls cannot control that arm. Diagnose the difference or establish a **fresh recapture control pair**. Do not label it “only fog changed from the archived screenshot.”

Potential differences include Chromium executable/version, Playwright version, OS fonts, font loading, DPR, 1280×1280 viewport, locale, timezone, dark colour scheme, reduced-motion setting, inherited CSS, scrollbar handling, element position and clipping, asynchronous image decoding, animation frames and PNG encoding.

A standalone visual HTML replay would additionally need resolved stylesheets, inherited variables, pseudo-element styles, fonts and resource URLs. That is larger than the first pilot needs.

Required provenance:

- Original PNG digest/dimensions and its source manifest.
- State ID, state digest, truth digest, glyph mode and tile size.
- Original and replacement asset IDs, file SHA and decoded-RGBA SHA; SVG source SHA where applicable.
- **Visual** DOM before/after digests, distinguished from accessible-HTML digest.
- Source revision **plus actual dirty-source/build/style digests**.
- Chromium version and executable SHA, Playwright version, environment/capture settings.
- Unchanged/restored capture results, changed regions, and unchanged asset inventory.

**S-3 — Accept: rank by elapsed work and verification burden**

“24 calls” is coverage, not a useful cost estimate by itself.

Use the supplied observations as scheduling estimates:

- **24 image-override answers:** approximately **20 minutes**.
- **Two repeats:** approximately **40 minutes**.
- **C1+C2+one candidate:** approximately **60 minutes**, after images and deterministic gates are ready.
- Cold capture/build work can materially increase this; the reported 46-minute arm demonstrates that.

“One Sol session” should mean one supervised batch operationally. Preserve the harness’s existing fresh-invocation behaviour; do not introduce conversational memory across boards.

The expensive decision is promotion into independent oracle, pin, renderer and regression work. Batch deterministic checks first, then buy one answer batch for a concrete hypothesis.

**S-4 — Accept the value concern; reject a single unconditional input-mode claim**

The code supplies several paths:

| Path/configuration | What reaches the model |
|---|---|
| Conversation defaults | Structured engine context; `--board-image off`; optional `semantic_board` block absent |
| Conversation with `semanticBoard: true` | Structured context plus semantic board |
| Conversation with `--board-image png` | Context plus PNG and a screen-reader HTML **path/digest reference** |
| Both options enabled | Context, semantic board, PNG and HTML reference |
| `--board-image capture_only` | Captures for evidence; does not bind the PNG for model delivery |
| UI DM bridge | Structured `DmBoardProjection`, transported as JSON/full/compact/delta forms |

Evidence:

- [Conversation defaults](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-conversation.ts:947): default renderer profile and `board-image=off`.
- [Renderer profile](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/renderer-profile.ts:39): semantic board is opt-in; the default omits it.
- [PNG binding](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-conversation.ts:3476): only mode `png` attaches the image.
- [MCP delivery](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/mcp/entrypoint.ts:469): PNG and HTML reference are appended to `engine.get_turn_context`.
- [UI request contract](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/dm-bridge/contracts.ts:163): carries a structured DM projection.

Thus the default conversation runner is neither the probe’s `png` nor its exact `semantic` mode. It already receives structured engine information. The UI bridge likewise does not depend on extracting all board facts from a PNG.

**This unit measures PNG-only comprehension and a proposed visual vocabulary. It does not currently establish improved default AI-DM decision quality.** It may improve human legibility and optional image use, but Q9 alone proves neither.

No owner clarification is needed to discover these defaults. Before committing to substantial shipping work, the supervisor should identify the intended deployment configuration and value claim. Semantic-plus-image delivery would warrant a later test of whether misleading imagery interferes with correct facts.

**S-5 — Accept; use the updated authenticated schema**

The working tree already contains the described r3b provenance changes:

- Top-level `sourceRevision` and `sourceImagesRoot`.
- Per-state `sourcePng.sha256/width/height`.
- Source file SHA and PNG-dimension validation.
- `originalPngSha256` populated from the authenticated source.
- Optional `--image-override-source-root`.

HEAD remains `46dbc344`, but the probe has uncommitted changes. I read probe bytes with SHA:

`79e543a81f5240ca692ec60624dd6c7aae20046aa4d09653208cb2f736895c26`

Freeze the completed harness before running controls; HEAD alone does not identify these bytes.

Use the updated fields for authenticated source provenance. Put extra asset/DOM/renderer evidence in a versioned `manipulationValidation` record, validated by the capture/analysis tool. A free-form metadata object is not itself verification. No competing manifest redesign is needed.

**Amended ranked experiments and commands**

All measurements retain seed `20260910`, 24 states, Sol high, general primer, glyphs none, PNG input and unchanged scoring.

The following command function uses **existing probe flags**; it is a proposed future invocation, not something run in this brainstorm:

```bash
qsfog_root=.tmp/runs/quietstone/svg-fog-r2

qsfog_probe() {
  npx vite-node tools/ai-dm-screenshot-probe.ts \
    --models gpt-5.6-sol:high \
    --states 24 \
    --seed 20260910 \
    --primer general \
    --board-glyphs none \
    --capture-tile-px "$3" \
    --board-input png \
    --questions Q9 \
    --generation quietstone-svg-fog-intervention-r2 \
    --image-override-manifest "$qsfog_root/$1/manifest.json" \
    --images-root "$qsfog_root/answers/$2-images" \
    --out "$qsfog_root/answers/$2.jsonl"
}
```

Do not use `--compare`. Analyze the authenticated rows separately.

A proposed **capture-only tool**, not an existing command, would prepare manifests:

```text
npx vite-node tools/qsfog-capture-intervention.ts
  --source-rows .tmp/runs/quietstone/probe-candidate.jsonl
  --source-images dnd-slim-runs/quietstone-probe-candidate-images
  --states 24
  --seed 20260910
  --board-glyphs none
  --capture-tile-px 128
  --arm frame5
  --asset-override art.fog.hidden.v1=<candidate-png>
  --out .tmp/runs/quietstone/svg-fog-r2/frame5
```

`--asset-override` belongs to that proposed tool, **not the probe**. Only the chosen arm’s explicitly allowed DOM surfaces may change.

| Rank / arm | Probe command(s) and control | Threshold | Decisive deterministic gate before calls |
|---|---|---|---|
| **0. Original Quietstone repeatability** | `qsfog_probe unchanged128 c1 128`, then `… unchanged128 c2 128` | Compute `s_b`, `s`, `T`; no art verdict. If spread consumes headroom, stop promotion | Both manifests deliver the exact original 24 PNG bytes, authenticated against source |
| **1. Conversion-only equality** | No calls when pixel-identical; pair with shipping raster | Exhaustive equality. Today’s C1/C2 still required for other arms | Same geometry/alpha → identical RGBA and final board PNG |
| **2. Five-pixel frame, board-only** | `qsfog_probe frame5 a1 128`; compare with C1/C2 only if its unchanged recapture equals their PNGs | Positive-candidate rule: ≥T overall, ≥T_b in 4/5 bases, anti-suppression and leave-one-out checks | **Authenticated browser A→B→A check:** original/restored identical, changes confined to fog influence regions; full structural matrix also green |
| **3. Current-art legend-only** | `qsfog_probe legend-current l1 128`; same C1/C2 | Same spread-adjusted positive rule; board scores/masks unchanged | Every board-cell pixel unchanged; only the two allocated legend swatches differ |
| **4. Blurred new fog** | Obtain clean repeat `qsfog_probe frame5 a2 128`; then `… frame5-blurred n1 128` | Clean-minus-blurred ≥`max(0.05,2s_clean)`; require structural margin drop ≥0.10 | Structure actually destroyed while mean alpha/luminance stay within declared 1% tolerance |
| **5. Actual 64-pixel robustness** | `… unchanged64 c64-1 64`, `… unchanged64 c64-2 64`, `… frame5-64 a64 64` | Candidate beats size-matched controls by `T64`; size degradation ≤0.05. Larger uncertainty makes preservation inconclusive, not a wider allowed loss | Native 64 DOM dimensions and 14-pixel legend verified; complete 32-pixel deterministic phase matrix passes |
| **6. Lighter interior** | `… frame5-open-interior o1 128`; clean-frame reference repeated in same block | Spread-adjusted positive rule plus improved overlap recognition without lost fog labels | Independent fog and obscurement detectors both pass on light/heavy overlap fixtures |
| **7. Round obscurement grammar** | `… frame5-round-obscurement d1 128`; repeated clean-frame/current-obscurement reference | ≥T; collision reduction ≥50% **and** greater than twice collision-rate spread; no obscurement recall loss | Fog/obscurement/darkness separation in colour and grayscale, including overlap |
| **8. Inline SVG** | `… frame5-inline i1 128`; repeat PNG-frame reference; equivalent paired run at 64 if warranted | Native noninferiority within 0.02, then ≥T advantage at 64 to justify complexity. If repeat spread prevents resolving 0.02, inconclusive | Same geometry, opacity, clipping, layer order and foreground preservation in PNG/inline paths |

For ranks 6–8, preserve round-1 geometry and palette specifications; change only the named factor. Build these only if the first frame pilot establishes a useful result.

Literal **3-pixel Option A remains a zero-call deterministic control**, with its known phase failure recorded. It does not deserve a paid arm before that failure is resolved or the owner explicitly chooses a native-only diagnostic.

Two adjustments to cost and pairing are deliberate:

- A fresh 64 comparison needs **two size-matched controls plus its candidate**: approximately 60 minutes, not an assumed 48-call comparison using 128 controls.
- A blurred comparison needs clean-frame repeatability. Reuse the first clean result only if it satisfies the same-block rules; otherwise repeat that reference afresh.

The full plan’s separability thresholds remain in force: single-class NCC ≥0.60 and margin ≥0.20; negatives ≤0.35; overlap NCC ≥0.55 and margins ≥0.15; all specified reductions/phases; `NA` fails. Each table row names its particularly decisive gate, not a waiver of the others.

**Smallest implementation to dispatch**

Separate the immediate repeatability pilot from the subsequent rendering pilot.

**Immediate first pilot: unchanged PNGs twice**

No asset, renderer or snapshot changes are required.

The implementation needs:

1. A small identity-manifest builder binding the original 24 candidate images to the updated source-provenance schema.
2. A paired report calculating repeatability, per-base rates, exhaustive accounting, leave-one-out results and the frozen thresholds.
3. Focused tests for both utilities: exact state coverage, digest/dimension mismatch rejection, unchanged identity images, non-cancelling spread arithmetic, fixed denominators and missing/error-row rejection.

Suggested files:

- `tools/qsfog-intervention-report.ts` — identity-manifest preparation and repeatability/paired analysis.
- `tests/unit/tools/qsfog-intervention-report.test.ts`.

**No new probe flag.** Finish and freeze the already-owned r3b harness work rather than creating another provenance implementation.

**First fog pilot: five-pixel SVG→PNG in the live browser**

Add only:

- `tools/qsfog-capture-intervention.ts` — prepares the asset, reconstructs the frozen states, captures unchanged/modified/restored boards and writes authenticated manifests.
- A narrow, optional **test/tool capture seam** in `tools/ai-dm-board-snapshot.ts`, allowing the capture tool to replace the fog image after normal rendering and before the final settled capture.
- Focused tool/unit and snapshot browser tests.
- Experiment SVG/PNG files under the local experimental artifact directory.

The seam should be inactive for every existing caller. The tool should resolve the frozen state IDs using the existing candidate catalogue and verify state/truth digests; it should not duplicate room-generation or scoring logic.

Required tests for this seam:

- Original-asset override reproduces original PNG bytes.
- Candidate changes actual fog pixels and no non-fog DOM assets.
- Restore returns the exact original image.
- Zero-fog state accepts the arm and changes nothing.
- Wrong asset ID, undecodable image or wrong native dimensions fails.
- Overlay/legend mutations outside the selected arm fail.
- Obscurement and magical-darkness source bytes remain unchanged.
- Replacement loading is awaited; capture cannot race image decode.
- Player projection acquires no fog.
- The generated manifest authenticates both source and result.

There is **no need for a probe `--asset-override` flag**, a graphical HTML replay format, a general SVG parser, production art edits, a generator bump or pin changes to run this pilot.

The plan dispatch should explicitly state: **browser replacement of live fog images; existing `board-html` is semantic screen-reader evidence and is not a replay source; no floor work; no production promotion from repeatability or Q9 alone.**

SVG-FOG BRAINSTORM R2 DONE