# QSFOG-SVG-01 plan round 4 (Increment B measurement, D624.5) — gpt-5.6-sol final message

Session 01a0930f-bf26-7cf0-92bb-a47796b744fd. Log .tmp/runs/fanout/plan-qsfog-b-r4.log.

Updated [2026-09-13-qsfog-svg-pilot-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md).

- Before: `8525e8746c018845213c5f769db0354b59a076e3144945dc91b48abd8f795972`, 834 lines.
- After: `c6206939cb51bf243683c2e3401df8ca76b93ca5af447e008bfdbec126369493`, 900 lines.
- Diff: 365 lines; `1 file changed, 154 insertions(+), 88 deletions(-)`.
- Increment A remained byte-identical: section hash `51a4c6ba4707bf19106cad71f060740745bf5bc4c5c47303d889b142bc8d02af`.

PS3-F2 decision: option (i) retains `0.60`; frame-band NCC is `0.636402` versus unmasked `0.109196`, with 32-pixel nearest `0.986651–1.000000` and area `0.993368–1.000000`, while unmasked ranges remain `-0.099780–0.117089` and `0.299584–0.447086`.

Required commands completed:

```bash
diff -u /tmp/qsfog-plan-before.md \
  .tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md | head -400

git status --short --untracked-files=all -- \
  .tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md \
  tools/qsfog-intervention-report.ts \
  tests/unit/tools/qsfog-intervention-report.test.ts
```

The status output contained only the concurrent Increment A lane’s untouched files:

```text
?? tests/unit/tools/qsfog-intervention-report.test.ts
?? tools/qsfog-intervention-report.ts
```

The ignored plan itself does not appear in Git status. Frozen contract:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

No TypeScript, Vitest, Playwright, model, reviewer, agent, or Git-write command ran. One discarded Python arithmetic attempt stopped at `ModuleNotFoundError: numpy`; no result from it was used.

QSFOG B PLAN R4 DONE
diff --git a/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md b/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md
index 1896b69d42a282a2686f364615804ffb00ef0b20..daed5587ba0b061f09061c4efcb7049658d2e1dc
--- a/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md
+++ b/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md
@@ -2,39 +2,21 @@
 
 Date: 2026-09-13  
 Worktree: `/home/vagrant/PhpstormProjects/dnd-wt-quietstone`  
-Branch/revision read for round 3: `claude/quietstone-art` at `14039ca5b9f359a7c573375b93294af36f915ccf`  
-Owner authority: D624 and D624.1  
+Branch/revision read for round 4: `claude/quietstone-art` at `14039ca5b9f359a7c573375b93294af36f915ccf`  
+Owner authority: D624, D624.1, and D624.5 (`A. Split`)  
 Order: Increment A, then Increment B  
 Status: plan only; nothing ships
 
-## Round-3 changes
-
-All eight findings in `plan-svg-fog-review-astra-r2.md` are accepted. Line ranges below are filled against this final revision, not the reviewed round-2 artifact.
+## Round-4 changes
 
-| Finding | Plan lines changed | Disposition |
-|---|---:|---|
-| PS2-F1 | 572-614, 760, 800, 802-804 | The only wrapper is worktree-local `.tmp/qsfog-svg/playwright.config.ts`, imports `../../playwright.config.ts`, and is used by both commands. The exact filtered `--list` must show one test. The round-2 plan-as-config result is explicitly void. |
-| PS2-F2 | 331-420, 513-520, 764-795 | Constant alpha masks are gone. Magical darkness uses its exact non-modal hatch tuple, grid uses an any-overlap reducer, and no-structure negatives use an explicit absence verdict. Positive `NA` still fails; no `NA` is coerced to zero. Read-only arithmetic proves non-constant competitors and lawful positive/negative paths. |
-| PS2-F3 | 258-310, 500-512 | Condition 6 again requires both ordinary-floor FP and obscured-as-fog collisions not to increase, and at least one eligible family to fall by at least 25% and strictly more than twice its own measured spread. Denominators, C1/C2 averaging, zero-count semantics, and boundaries are frozen. |
-| PS2-F4 | 335-398, 515-520, 755-795 | The signed RGB-difference luma equation, operation order, exact floor/light/shade fixture catalogue, phase-aware rail/tick coordinate rules, corner exclusion, and independent arithmetic vectors are explicit. |
-| PS2-F5 | 145-177, 494-495, 539, 641, 745 | Freshness covers each arm's derived `<out-stem>-summary.md` as well as JSONL/image roots; a pre-existing C1 summary is an isolated invalid-input test. |
-| PS2-F6 | 152-177, 496, 539, 745 | The block record includes a supervisor attestation spanning C1 start through final-arm end, including gaps. An interruption solely between C1 and C2 invalidates the block. |
-| PS2-F7 | 378-411, 518 | Single-tick removal is assigned to exact native geometry. A separate two-tick removal must fail the retained three-side visible-notch threshold. |
-| PS2-F8 | 10-37, 749-808 | The Markdown plan remains intact. No temporary file was created this round; file-dependent probes are supervisor-verified or marked `UNVERIFIED` with exact future commands. The round-2 temporary-write result is not evidence. |
+D624.5 freezes Increment A as reviewed and authorises this one extra round for Increment B only.
 
-Compact carry-forward of round-1 findings:
+- **PS3-F1:** competitor references use their phase-aligned footprint reducers in nearest views; all 43 views require nonconstant references.
+- **PS3-F2:** option (i) retains `0.60`, measures the cell-local frame band after end-to-end composition and edge extraction, and pins native and 32-pixel evidence.
+- **PS3-F3:** the final candidate path is frozen before capture, its later hash is outside the immutable subset, post-capture freeze equality is asserted, and path mutation is rejected.
+- **PS3-F4:** the hand-back now contains a concrete record template, exact `lstat` preflight/update commands, and labels pause and continuity as manual attestations.
 
-| Finding | Final disposition |
-|---|---|
-| PS1-F1 | Resolved by PS2-F1's worktree-local wrapper and exact-path filtered proof contract. |
-| PS1-F2 | Resolved by PS2-F2/F4/F7 plus the retained thresholds, two distinct 32-phase pins, and named mutation controls. |
-| PS1-F3 | Resolved by PS2-F5/F6 plus committed/current hashes, stale-identity rejection, fresh paths, zoned window, and preserved invalid attempts. |
-| PS1-F4 | Resolved; exact JSON discovery baseline and two-spec delta remain unchanged. |
-| PS1-F5 | Resolved; producer→real-consumer and isolated promotion boundaries remain, extended for restored condition 6. |
-| PS1-F6 | Resolved; live capture still stages below worktree `dnd-slim-runs/` with a `-images` basename. |
-| PS1-F7 | Resolved; row `truth` is canonicalised/recomputed, score facts are local, and accounting dedup/OOB semantics remain. |
-| PS1-F8 | Resolved; pooled rates/headroom and invalid-vs-incomparable precedence remain. |
-| PS1-F9 | Resolved; no-hook options/call counts and effective decode-barrier mutation remain. |
+All PS1 and PS2 findings remain closed without changing Increment A.
 
 ## Goal and non-goals
 
@@ -130,7 +112,7 @@
     diagnosisSha256: string;
     sourceImageSetSha256: string;
     identityManifestSha256: string | null;
-    candidateManifestSha256: string | null;
+    candidateManifestSha256: string | null;  // mutable after capture; excluded from freeze
   };
   invocationPolicy: {
     model: 'gpt-5.6-sol'; effort: 'high'; states: 24; seed: 20260910;
@@ -143,7 +125,7 @@
     compare: null; freshInvocationPerState: true; order: ['C1','C2','frame5'];
   };
   paths: {
-    identityManifest: string; candidateManifest: string | null;
+    identityManifest: string; candidateManifest: string | null; // final path before capture
     c1Jsonl: string; c1ImagesRoot: string; c1Summary: string;
     c2Jsonl: string; c2ImagesRoot: string; c2Summary: string;
     frameJsonl: string; frameImagesRoot: string; frameSummary: string;
@@ -168,7 +150,7 @@
 Rules make this evidence enforceable:
 
 1. At identity creation, resolve current `HEAD`, require it equals `committedRevision`, require the worktree copy and `git show HEAD:tools/ai-dm-screenshot-probe.ts` both equal the recorded harness SHA, require committed probe-test SHA, and require `git status --short --untracked-files=all` empty. Re-hash source rows, diagnosis, and the authenticated source image set. `sourceImageSetSha256` is SHA-256 of sorted UTF-8 lines `relative-path<TAB>file-sha256<LF>` for the exact 24 source PNGs plus terminal snapshot manifest; paths are repository-relative.
-2. `freezeSha256` authenticates canonical `{version,blockId,timezone,committedRevision,gitStatusShort,allLanesPaused,probe/source/diagnosis/source-image hashes,invocationPolicy,paths}` while excluding the subsequently populated identity hash and arm results. The tools recompute it. Candidate path/hash are present before the final model block; both may be null for an Increment-A-only repeatability block.
+2. `freezeSha256` authenticates canonical `{version,blockId,timezone,committedRevision,gitStatusShort,allLanesPaused,probe/source/diagnosis/source-image hashes,invocationPolicy,paths}` while excluding `identityManifestSha256`, `candidateManifestSha256`, and arm results. The tools recompute it. An Increment-B block must set the final non-null repository-relative `paths.candidateManifest` before capture; capture `--out` must derive exactly that path. Only the excluded candidate hash may change after capture, and recomputation must equal the pre-capture `freezeSha256`. Both candidate fields may remain null only for an Increment-A-only repeatability block.
 3. Require the all-lanes-paused attestation before C1. Resolve every path under the repository. `identity-manifest` derives each probe summary exactly as the probe does: replace the JSONL output extension with `-summary.md` (`tools/ai-dm-screenshot-probe.ts:2478`), and require each recorded `c1Summary`/`c2Summary`/`frameSummary` equals that derivation. It performs `lstat` and requires `ENOENT` for ten final-block outputs: identity-manifest directory plus each arm's JSONL, image root, and derived summary. An Increment-A-only block requires the analogous seven paths: identity plus C1/C2 triples. Candidate capture evidence is already present/authenticated. The sorted derived list must exactly equal `unusedPathPreflight.paths`. Identity output uses exclusive writes. The supervisor fills `identityManifestSha256` after creation and rechecks it before C1. This closes both destructive probe writes: JSONL truncation at `:4102-4107` and summary overwrite at `:4395`.
 4. The identity manifest's opaque `manipulationValidation.probeHarnessSha256` must equal both the block record and the current committed harness. This is checked by `identity-manifest` and again by `paired-report`; a stale identity never receives a verdict.
 5. ISO-8601 timestamps must carry the UTC offset produced by IANA `America/New_York` for that instant. A final report requires all six times, ordered `C1 start <= C1 end <= C2 start <= C2 end <= frame5 start <= frame5 end`, on one local calendar date, with `frame5.end - C1.start <= 7,200,000 ms`; a repeatability report analogously ends at C2. “Two hours” means elapsed instants; “date boundary” means local date in that timezone. Each included arm must say `continuous`. In addition, `wholeBlockContinuity` must reproduce the exact C1 start/final end, name the included final arm, be supervisor-attested after that end, say `uninterrupted:true`, and have an empty interruptions array. Its interval is closed over every inter-arm gap: an outage after C1 end but before C2 start invalidates reuse even when all arm-local values say continuous.
@@ -336,9 +318,10 @@
 
 - Native references are 128×128 binary structural arrays, never alpha-presence masks. `F_rail` is the exact three rail rectangles per side without ticks; `F_tick` is the four exact inward ticks; `F_frame=F_rail OR F_tick`; `F_hatch` is the exact clipped diagonal excluding `F_frame`; `F=F_frame OR F_hatch`. `O_light` and `O_heavy` are the pixels in their pinned PNGs equal to either opaque cyan skeleton tuple `[164,202,219,255]` or `[128,174,209,255]`; translucent veil and transparent pixels are excluded. `D_hatch` is exactly magical darkness's non-modal `[42,44,48,150]` tuple; its modal `[17,17,19,235]` veil is excluded. `G` is the analytic one-pixel perimeter `x in {0,127} OR y in {0,127}`. Fog competes with `O_light`, `O_heavy`, `D_hatch`, and `G`; obscurement competes with `F`, `D_hatch`, and `G`.
 - Every decoded reference asset must match its SHA below and each reduced reference used by a positive/margin comparison must have `0 < sum(mask) < pixelCount`; otherwise the gate is invalid and fails. This explicitly replaces the unsatisfiable magical-darkness alpha mask, whose alpha was constant.
-- Nearest reduction factor `k` (`2` to 64, `4` to 32) and phase `(px,py)` samples the exact source coordinate `(px+k*x, py+k*y)`. Binary masks and RGBA use the same coordinates. Integer mask equality/counts have no tolerance.
+- Nearest reduction factor `k` (`2` to 64, `4` to 32) and phase `(px,py)` samples observed RGBA and fog geometry at exact source coordinate `(px+k*x, py+k*y)`. The non-fog references `O_light`, `O_heavy`, `D_hatch`, and `G` instead use the phase-aligned `k×k` footprint and the occupancy rules below in nearest views. This preserves nearest observation/fog geometry while preventing a thin competitor from becoming a constant-zero reference. Integer mask equality/counts have no tolerance.
 - Area RGBA reduction uses the exact `k×k` block starting there. Pad only right/bottom by `k-1` native pixels. RGBA padding repeats the nearest edge pixel. Premultiply, accumulate exact integer/rational numerators, divide once, round ties toward positive infinity, and unpremultiply with the same rule. Phases are `(0..k-1)^2`.
-- Binary reference area reduction uses the same footprint, with out-of-image area unmarked, but freezes a structure-specific occupancy rule rather than the former half-area rule. Let exact rational `A` be the full footprint area including zero padding and `m` the exact marked overlap: rails/ticks/obscurement skeleton/grid mark iff `m>0`; an arm hatch of thickness `w` marks iff `16m >= wA`; `D_hatch` marks iff `6m >= A`. For integer 4×4 blocks the darkness rule is equivalently `m>=3`. Native uses the source bit; nearest uses the sampled bit. These rules preserve thin grid/skeleton lines without saturating the one-in-six darkness hatch.
+- Binary footprint reduction applies to every area reference and to the four non-fog references in nearest views, with out-of-image area unmarked. Let exact rational `A` be the full footprint area including zero padding and `m` the exact marked overlap: rails/ticks/obscurement skeleton/grid mark iff `m>0`; an arm hatch of thickness `w` marks iff `16m >= wA`; `D_hatch` marks iff `6m >= A`. For integer 4×4 blocks the darkness rule is equivalently `m>=3`. Native uses the source bit. Nearest fog geometry alone uses the sampled bit. These rules preserve thin grid/skeleton lines without saturating the one-in-six darkness hatch.
+- Before any positive or margin score, assert every target and competitor reference is nonconstant in each of the 43 views. `NA` remains a failure; reference degeneracy never skips a phase or fixture.
 - Legend reductions are exact area resamples from 128 to 28 and 14. Destination pixel `(x,y)` integrates the half-open source rectangle `[128x/n,128(x+1)/n) × [128y/n,128(y+1)/n)` using rational overlap weights with common denominator `n²`; integer numerators are accumulated before one ties-up rounding. The browser check samples the exact CSS content box: destination centers `(x+0.5,y+0.5)`, no border/padding, at integer top-left coordinates.
 
 #### Frozen fixture catalogue and composition
@@ -370,10 +353,11 @@
 - The operation order is mandatory: (1) construct native full and class-omitted counterfactual composites independently; (2) reduce both RGBA images with the selected phase/footprint; (3) subtract the reduced bytes; (4) derive colour presence and luma-difference; (5) threshold structural edges. Never subtract before reduction or reduce a thresholded mask.
 - At reduced pixel `p`, define signed `Delta_c^k(p)=full_k(p)-omit(c)_k(p)` for each RGBA byte. `C_c(p)=1` iff `max_k |Delta_c^k(p)| >= 8`. Define `Y(r,g,b)=floor((54r+183g+19b+128)/256)` and, explicitly choosing luma of the signed RGB difference, `D_c^Y(p)=floor((54DeltaR+183DeltaG+19DeltaB+128)/256)`. This is not `Y(full)-Y(omit)`. Fog and obscurement counterfactuals are independent, so an overlap pixel may be in both colour masks.
 - `E_c(p)=1` exactly when `C_c(p)=1` and either (a) a four-neighbour difference in full reduced luma reaches 12, or (b) a four-neighbour difference in `D_c^Y` reaches 8. Outside neighbours equal the edge pixel. No morphology, blur, dilation, learned threshold, or post-result tuning is allowed.
+- Define the frame-band observation only after that pipeline: `B_fog(p)=E_fog(p) AND reduce(F_frame)(p)`. The reducer is native identity, nearest sampling for nearest fog geometry, or the declared footprint rule for area/legend. Fog target and fog-margin competitor NCCs use the same `B_fog` observation. Obscurement target measurement remains unchanged and still uses `E_obscurement`; `F` remains its fog competitor. The frame is the classification-bearing cell-local signature; hatch survival stays independently enforced by exact geometry, pitch, gutter, phase-loss, palette, and mutant gates.
 
 #### NCC and visible-structure predicates
 
-For binary arrays length `n`, compute `N=nΣxy-ΣxΣy`, `Dx=nΣx²-(Σx)²`, `Dy=nΣy²-(Σy)²`, then `N/sqrt(Dx*Dy)`. Quantise once to six decimal places using `sign(v)*floor(abs(v)*1_000_000+0.5)/1_000_000`; gates compare this value, never a post-result tolerance. Report raw integer sums and six-decimal NCC. On every positive single-class or overlap comparison, `Dx=0` or `Dy=0` is `NA` and fails. A negative with no fog uses a separate `NEGATIVE_FOG_ABSENCE` gate: `sum(E_fog)=0` passes without computing NCC; if the sum is nonzero, NCC must be defined and `<=0.35`; an undefined nonzero-observation result fails. `NA` is never replaced by zero.
+For binary arrays length `n`, compute `N=nΣxy-ΣxΣy`, `Dx=nΣx²-(Σx)²`, `Dy=nΣy²-(Σy)²`, then `N/sqrt(Dx*Dy)`. Quantise once to six decimal places using `sign(v)*floor(abs(v)*1_000_000+0.5)/1_000_000`; gates compare this value, never a post-result tolerance. Report raw integer sums and six-decimal NCC. Fog target NCC is `NCC(reduce(F_frame),B_fog)`; each fog competitor is `NCC(reduced competitor,B_fog)`, so every margin compares the same post-composition observation. On every positive single-class or overlap comparison, `Dx=0` or `Dy=0` is `NA` and fails. A negative with no fog uses `NEGATIVE_FOG_ABSENCE`: `sum(E_fog)=0` passes without NCC; if nonzero, the frame-band target must be defined and `<=0.35`; undefined nonzero observation fails. `NA` is never replaced by zero.
 
 All rail/tick tests use source-coordinate sets. `R_top`, for example, is the union of `[12,40)`, `[48,80)`, `[88,116)` crossed with `[12,12+w)`, minus pixels also in left/right rail rectangles; the other sides are mirrored. Ticks are the separately frozen rectangles from the geometry section, with membership beyond the rail requiring `y>=12+w` (top), `y<116-w` (bottom), `x>=12+w` (left), or `x<116-w` (right). Thus corners and ticks cannot count as rail. For nearest `(px,py,k)`, destination `(u,v)` belongs when sampled `(px+ku,py+kv)` belongs. For area/legend, its exact phase-aware rational footprint belongs to a rail or tick band under that mask's any-positive overlap rule. Project `E_fog AND reduced(R_side)` on the side axis. A marked run is a maximal consecutive positive projection; a visible break is an internal maximal zero run between marked runs of length at least `max(1,floor(4*n/128))`. A visible notch requires `E_fog` in reduced tick membership strictly beyond that same reduced rail band. Every view needs at least two runs and a break on all four sides and a notch on at least three. Gutter minima are 12/6/3/2/1 pixels at 128/64/32/28/14.
 
@@ -383,11 +367,13 @@
 - `TOP_RAIL_OR_HATCH_32_PHASE_LOSS`: phase fails if the emitted top rail is absent **or** emitted hatch is absent. Literal frame3 must fail exactly `7/16`; frame5 exactly `0/16`. The accepted `7/16` pin names this narrower check.
 - `ANY_RAIL_OR_HATCH_32_PHASE_LOSS`: phase fails if any emitted rail is absent **or** emitted hatch is absent. Literal frame3 must fail exactly `14/16`; frame5 exactly `0/16`. It is not interchangeable with the first count.
 
-The complete matrix is native 128 (1), nearest 64 (4), area 64 (4), nearest 32 (16), area 32 (16), and legend 28/14 (2): 43 views per asset/fixture. Every enumerated fog-only and light/heavy-overlap fixture uses it. Single-class target NCC is `>=0.60` and margin `S=target-max(competing)` is `>=0.20`; negative handling is the explicit absence/NCC rule above; overlap fog and obscurement NCC are each `>=0.55`, with each target's margin over the other class `>=0.15`. Positive `NA` fails.
+The complete matrix is native 128 (1), nearest 64 (4), area 64 (4), nearest 32 (16), area 32 (16), and legend 28/14 (2): 43 views per asset/fixture. Every enumerated fog-only and light/heavy-overlap fixture uses it. Single-class target NCC remains `>=0.60` and margin `S=target-max(competing)` remains `>=0.20`; negative handling is the explicit absence/NCC rule above; overlap fog and obscurement NCC remain `>=0.55`, with each target's margin over the other class `>=0.15`. No threshold is lowered. Positive `NA` fails.
 
 Independent arithmetic vectors are frozen into tests and reports:
 
-- Existing fog's native hatch mask scored against itself has `n=16384, sumX=sumY=sumXY=2731, N=Dx=Dy=37286343, NCC=1.000000`: a lawful positive. No-fog observation has `sumY=0,Dy=0,NCC=NA` and passes only `NEGATIVE_FOG_ABSENCE`: a lawful negative.
+- The exact frame5-over-pinned-stone end-to-end native pipeline first reproduces the rejected whole-structure result `sum(F)=3425`, `sum(E_fog)=2755`, `sum(F AND E_fog)=848`, and `NCC=0.109196`. Scale alone does not rescue it: unmasked 32-nearest spans `[-0.099780,0.117089]` and unmasked 32-area spans `[0.299584,0.447086]` over all phases.
+- The purpose-aligned frame-band result from the same composed pixels is `n=16384`, `sumX=1800`, `sumY=sumXY=780`, `N=11375520`, `Dx=26251200`, `Dy=12171120`, and `NCC=0.636402`. This is the lawful positive because it includes composition, counterfactual subtraction, colour masking, and edge extraction before the band mask.
+- Across all 32-pixel phases, frame-band NCC spans `[0.986651,1.000000]` for nearest and `[0.993368,1.000000]` for area. The unchanged `0.60` threshold therefore tests survival of the declared cell-local frame, while other gates independently test the hatch and reject structure-free or copied-class art.
 - Magical darkness has `2731/16384` exact hatch pixels and nonzero native `Dx=37286343`. Its `ceil(A/6)` area-32 counts over `(py,px)` phases are `[683,341,661,331,341,662,331,651,661,331,641,320,331,651,320,640]`, all strictly between 0 and 1024. Grid any-overlap counts are `[124,94,94,94,94,63,63,63,94,63,63,63,94,63,63,63]`; its possible variances are `111600,87420,60543`, never zero.
 - Luma choice vector: `full=[0,0,1]`, omitted `[0,0,7]`; the specified signed-difference equation returns `0`, whereas separately rounded lumas give `0-1=-1`. The test requires `0`.
 - Order vector: a 2×2 full-vs-omitted red delta `[32,0,0,0]` area-reduces to `8`, so post-reduction threshold 8 marks it. Thresholding the native pixels first would produce `[1,0,0,0]` and is a failing mutation.
@@ -512,9 +498,9 @@
 | Score/rate headroom | Explicit `INCONCLUSIVE_HEADROOM` | Raise spread above available H/R; no threshold relaxation |
 | 3/5 native SVG masks | Exact geometry/disjoint/palette | Change each frozen endpoint/width |
 | Raster repeat/palette | Repeat PNG/RGBA exact; 3 tuples | Inject one antialias tuple |
-| 43-view reducers | Exact coordinates/padding/rounding and nonconstant positive references | Off-by-one sample, symmetric padding, old half-area grid, or alpha-based darkness fails |
+| 43-view reducers | Exact coordinates/padding/rounding; every reference nonconstant in all views | Restore nearest point sampling for darkness/grid: named 64/32 phases become `NA` and fail |
 | 32 diagnostics | frame3 `7/16`,`14/16`; frame5 `0/16`,`0/16` | Conflate diagnostic names/counts |
-| NCC/edges precision | Frozen operation order, signed-difference luma, thresholds, six decimals | Difference rounded lumas, subtract before reduce, change threshold, or five decimals |
+| NCC/edges precision | End-to-end frame-band positive; frozen order/luma/thresholds/six decimals | Whole-structure `0.109196`, self-correlation, pre-edge banding, or altered threshold fails |
 | Named geometry mutants | Named gate in table fails | Remove one tick for native geometry; remove two for three-side notch; disable each detector once |
 | Plain/grey/grid/darkness negatives | Zero observed fog passes absence; nonzero requires defined NCC <=0.35 | Coerce NA to zero, or inject a copied fog reference |
 | Light/heavy overlap | Both NCC >=0.55, margins >=0.15 | Score only fog or share colour mask |
@@ -530,6 +516,7 @@
 | Effective decode barrier | Early mutant fails | Remove decode and settlement together |
 | Player projection | Reject non-DM hook; no fog field added | Present player audience |
 | Candidate manifest | Source/result/state/truth/renderer authenticate | Swap two B files or one DOM digest |
+| Frozen candidate path | Final path set before capture; post-capture freeze identical | Change path after capture; recomputed freeze mismatch rejects |
 | Archived mismatch | Only valid incomparable status | PNG differs while provenance otherwise valid |
 
 ## Implementation steps, in order
@@ -547,7 +534,7 @@
 6. Implement SVG emission, pinned-browser raster, strict RGBA inspection, asset manifest, and deterministic reports. Frame3 must reproduce both exact loss counts; frame5 must pass before capture/model work.
 7. Implement the optional seam and default/hook call-count/options tests.
 8. Implement capture authentication, compliant staging, A→B→A, DOM/inventory/region audits, exclusive digest-copy, archived eligibility, and v2 provenance. Add pure/fake tests and exactly one grep-addressable browser test.
-9. Run the bounded verification. Only after final candidate pixels/captures and a new block freeze does the supervisor run C1, C2, frame5, and report in order.
+9. Run the bounded verification. Only after the final candidate path is frozen, capture leaves that freeze unchanged, and all gates pass does the supervisor run C1, C2, frame5, and report in order.
 
 ## Verification contract
 
@@ -638,7 +625,65 @@
 
 ## Supervisor hand-backs
 
-Choose one concrete unused `<block-id>` in `America/New_York`, create its strict block record, pause all lanes, and populate fresh paths. The following are exact command templates after literal substitution of that one ID. Preflight the identity directory and all three arm triples. In particular, alongside `c1.jsonl`, `c2.jsonl`, and `frame5.jsonl`, the derived paths are exactly `c1-summary.md`, `c2-summary.md`, and `frame5-summary.md`; none of the ten paths may exist.
+Choose one concrete unused `<block-id>` in `America/New_York`, pause all lanes, and populate this record template before capture. Replace every angle-bracket token; unresolved tokens are invalid. `allLanesPaused`, each `serviceContinuity`, and `wholeBlockContinuity` are manual supervisor attestations: commands record them but cannot prove pause or service continuity.
+
+```json
+{
+  "version":"qsfog-supervisor-block-v1", "blockId":"<block-id>",
+  "timezone":"America/New_York", "freezeSha256":"<canonical-freeze-sha256>",
+  "committedRevision":"<40-hex-implementation-head>", "gitStatusShort":"",
+  "allLanesPaused":{"value":true,"at":"<zoned-iso>","supervisor":"<name>"},
+  "hashes":{"probeHarnessSha256":"<sha>","probeTestSha256":"<sha>",
+    "sourceRowsSha256":"f614dd0298d3be2ba41440fdc18cde97ed5f1ffa8500725b820b47da6623adb9",
+    "diagnosisSha256":"13f906b241628d7c16d5c32845845d08587fd3c6bf0fa25b1bc34369e119a19c",
+    "sourceImageSetSha256":"<sha>","identityManifestSha256":null,
+    "candidateManifestSha256":null},
+  "invocationPolicy":{"model":"gpt-5.6-sol","effort":"high","states":24,"seed":20260910,
+    "primer":"general","boardGlyphs":"none","captureTilePx":128,"boardInput":"png",
+    "questions":["Q9"],"generation":"quietstone-svg-fog-intervention-r2",
+    "rowVersion":"d576-screenshot-comprehension-row-v10",
+    "promptVersion":"d576-screenshot-comprehension-v2",
+    "primerVersion":"d576-general-board-primer-v12",
+    "normaliserVersion":"d576-screenshot-vocabulary-normaliser-v4","compare":null,
+    "freshInvocationPerState":true,"order":["C1","C2","frame5"]},
+  "paths":{"identityManifest":".tmp/runs/quietstone/svg-fog/<block-id>/unchanged128/manifest.json",
+    "candidateManifest":".tmp/runs/quietstone/svg-fog/<block-id>/frame5/manifest.json",
+    "c1Jsonl":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c1.jsonl",
+    "c1ImagesRoot":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c1-images",
+    "c1Summary":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c1-summary.md",
+    "c2Jsonl":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c2.jsonl",
+    "c2ImagesRoot":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c2-images",
+    "c2Summary":".tmp/runs/quietstone/svg-fog/<block-id>/answers/c2-summary.md",
+    "frameJsonl":".tmp/runs/quietstone/svg-fog/<block-id>/answers/frame5.jsonl",
+    "frameImagesRoot":".tmp/runs/quietstone/svg-fog/<block-id>/answers/frame5-images",
+    "frameSummary":".tmp/runs/quietstone/svg-fog/<block-id>/answers/frame5-summary.md"},
+  "unusedPathPreflight":{"checkedAt":"<zoned-iso>","allAbsent":true,"paths":["<sorted-ten-paths>"]},
+  "wholeBlockContinuity":{"fromArm":"C1","throughArm":"frame5","startedAt":null,
+    "endedAt":null,"uninterrupted":null,"interruptions":[],"attestedAt":null,
+    "supervisor":"<name>"},
+  "arms":{"C1":{"startedAt":null,"endedAt":null,"serviceContinuity":null,
+    "jsonlSha256":null,"imagesRootSha256":null,"manifestSha256":null,
+    "rows":null,"answered":null},
+    "C2":{"startedAt":null,"endedAt":null,"serviceContinuity":null,
+    "jsonlSha256":null,"imagesRootSha256":null,"manifestSha256":null,
+    "rows":null,"answered":null},
+    "frame5":{"startedAt":null,"endedAt":null,"serviceContinuity":null,
+    "jsonlSha256":null,"imagesRootSha256":null,"manifestSha256":null,
+    "rows":null,"answered":null}}
+}
+```
+
+```bash
+QSF_BLOCK=.tmp/runs/quietstone/svg-fog/blocks/<block-id>.json node <<'NODE'
+const fs=require('fs'),path=require('path');
+const r=JSON.parse(fs.readFileSync(process.env.QSF_BLOCK,'utf8')),p=r.paths;
+const xs=[path.dirname(p.identityManifest),p.c1Jsonl,p.c1ImagesRoot,p.c1Summary,
+  p.c2Jsonl,p.c2ImagesRoot,p.c2Summary,p.frameJsonl,p.frameImagesRoot,p.frameSummary].sort();
+for(const x of xs){try{fs.lstatSync(x);throw new Error(`exists: ${x}`)}
+  catch(e){if(e.code!=='ENOENT')throw e}}
+console.log(JSON.stringify({allAbsent:true,paths:xs}));
+NODE
+```
 
 ### Prepare and authenticate frame5 before the model block
 
@@ -664,8 +709,26 @@
   --out .tmp/runs/quietstone/svg-fog/<block-id>/frame5
 ```
 
-Require frame3 `7/16` and `14/16`, frame5 `0/16` and `0/16`, all other deterministic/capture gates green, then set `candidateManifest`/SHA in the block record and recompute its immutable freeze SHA. The capture occurs before C1 but does not start the two-hour model-arm clock.
+Require frame3 `7/16` and `14/16`, frame5 `0/16` and `0/16`, and every other deterministic/capture gate green. The final `paths.candidateManifest` already names the capture output. Populate only its excluded hash and assert the stored freeze is unchanged:
 
+```bash
+QSF_BLOCK=.tmp/runs/quietstone/svg-fog/blocks/<block-id>.json node <<'NODE'
+const fs=require('fs'),crypto=require('crypto');
+const f=process.env.QSF_BLOCK,r=JSON.parse(fs.readFileSync(f,'utf8'));
+const want=`.tmp/runs/quietstone/svg-fog/${r.blockId}/frame5/manifest.json`;
+if(r.paths.candidateManifest!==want)throw new Error('candidate path changed');
+if(r.hashes.candidateManifestSha256!==null)throw new Error('candidate hash already set');
+const frozen=r.freezeSha256;
+r.hashes.candidateManifestSha256=crypto.createHash('sha256').update(fs.readFileSync(want)).digest('hex');
+fs.writeFileSync(`${f}.next`,`${JSON.stringify(r,null,2)}\n`,{flag:'wx'});
+fs.renameSync(`${f}.next`,f);
+if(JSON.parse(fs.readFileSync(f,'utf8')).freezeSha256!==frozen)throw new Error('freeze changed');
+console.log(JSON.stringify({freezeSha256:frozen,candidateManifestSha256:r.hashes.candidateManifestSha256}));
+NODE
+```
+
+The following `identity-manifest` validation recomputes the canonical subset and must reproduce that same freeze. Capture occurs before C1 and does not start the two-hour model-arm clock.
+
 ### Freeze and identity
 
 ```bash
@@ -745,64 +808,67 @@
 Immediately before C1 the supervisor starts the whole-block continuity attestation. Immediately after frame5, the supervisor closes it over the exact C1-start→frame5-end interval and records every interruption, including gaps. The final record/report must show 24 answered rows per arm, exact command/configuration, hashes, zoned times, arm-local continuity, empty whole-interval interruptions, same local date, and <=2 hours from C1 start to frame end. Reuse both controls, never the easier one. Any state/truth/prompt/normaliser/model/effort/seed/order/glyph/tile/input/generation/harness/source/manifest/image-root change, transport/replacement row, pre-existing JSONL/image/summary path, timing/date/service violation (including an inter-arm gap), deterministic/capture mutation, or provenance/accounting failure invalidates comparison. Preserve it and start a new block. Archived-vs-fresh mismatch alone requests separately authenticated fresh recapture controls; old-fog repeats cannot control a different reference.
 
 ## Assumptions and local verification status
-
-### Verified read-only in round 3
 
-No command in this section wrote a file, launched a browser, started a server, or made a model call.
-
-- Review first: `sed -n '1,220p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/quietstone/plan-svg-fog-review-astra-r2.md` returned exit 0 and covered all 83 lines. `sha256sum .../plan-svg-fog-review-astra-r2.md` returned `358f2518a14f1d672713a818c7b61c285d13af83bf63e65dca9c5e282839a343`; `wc -l` returned `83`.
-- Retained rulings: `nl -ba .../brainstorm-svg-fog-astra-r1.md | sed -n '70,105p'` showed the two non-increase/25% rule at line 94; `nl -ba .../brainstorm-svg-fog-astra-r2.md | sed -n '1,90p'` showed the separate rate-spread rule at line 45 and same-block rule at lines 49-56. Both exited 0.
-- Decision/plan audit: `nl -ba /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md | sed -n '22410,22500p'` confirmed D616, D624, D616.1, and D624.1 at the cited lines. `nl -ba .tmp-plans/2026-09-11-quietstone-fog-legibility-plan.md | sed -n '85,130p;150,210p;255,275p'` confirmed Option A, the matrix/thresholds, later oracle/pin contract, and eight-bucket identities. Both relevant reads exited 0.
-- Source lines: `nl -ba tools/ai-dm-screenshot-probe.ts | sed -n '2468,2485p;4028,4040p;4388,4410p'` confirmed summary derivation at 2478, exclusive rescore output at 4030-4038, and ordinary summary overwrite at 4395-4405. `rg -n "summaryPath|writeFile\\(summaryPath" tools/ai-dm-screenshot-probe.ts` returned lines `368,2478,2601,2619,2655,4035,4396`; `rg -n "worker-origin" playwright.config.ts` returned line 9. All exited 0.
-- Full cited-path audit: one combined `nl -ba ... | sed -n ...` command read `tools/ai-dm-board-snapshot.ts:260-810`, probe schema/scorer/options/order/loader/provenance ranges, `board-chrome.ts`, `board-chrome-layout.ts`, `visibility.ts`, `ai-dm-conversation.ts`, `renderer-profile.ts`, `dm-bridge/contracts.ts`, and `accessible-board.ts`; exit 0. It confirmed the exact line claims in Current behaviour, including the staging validator, screenshot options, decode/two-frame settlement, accessible HTML, strict v2 schema, set scoring, override path rules, default board-image off, PNG attachment branch, semantic-board opt-in, DM projection transport, legend composition/sizes, and player projection shape.
-- Renderer lines: `nl -ba src/vtt/encounter-app.ts | sed -n '680,755p'` confirmed visual board construction and fog `src` at 740. `nl -ba src/vtt/styles.css | sed -n '55,75p;875,960p'` confirmed floor/shade/fog ordering, effective fog opacity 0.78, and illumination/obscurement assets. `nl -ba src/assets/pixel-art.ts | sed -n '990,1045p;1065,1095p;1128,1148p'` confirmed one-in-six pinned darkness hatch, obscurement skeleton, and fog tuples. All exited 0.
-- Package resolution: `node -p "JSON.stringify({pngjs:require.resolve('pngjs'),playwright:require('@playwright/test/package.json').version,vitest:require('vitest/package.json').version})"` returned `{"pngjs":"/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/node_modules/pngjs/lib/png.js","playwright":"1.61.1","vitest":"4.1.10"}` (exit 0).
-- Wrapper evidence was read, not executed: `sed -n '1,220p' .tmp/qsfog-probe/wrapper.config.ts` returned the supervisor-created plain config importing `../../playwright.config.ts`, with absolute `testDir`, root web-server `cwd`, `reuseExistingServer:false`, and fake bridge. The supervisor reports this worktree-depth wrapper listed 186 tests/52 files and one filtered test; its `/tmp` counterpart exited 1 with zero. This round performed no Playwright call.
-- Asset inventory/hash: `rg --files public/assets/art | rg '(fog|magical-darkness|obscurement|floor|shade|light)' | sort` and `sha256sum` over the 15 files in the fixture table exited 0; the exact hashes are pasted in that table. `sha256sum src/vtt/intel/contracts.ts` returned `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
-- Repository identity: `git branch --show-current`, `git rev-parse HEAD`, and `git status --short --untracked-files=all` returned `claude/quietstone-art`, `14039ca5b9f359a7c573375b93294af36f915ccf`, and empty output before/following the read-only probes. The final handoff repeats status after the plan write.
-- Vitest discovery used exactly `npx vitest list --configLoader runner --filesOnly --json | node -e '<parse/canonicalise stdin>'` under `set -o pipefail`; pipeline status was `0 0`. Output was `{rows:599,projectNamePresent:0,canonicalSha256:"54a76a0a317bdfc610e94c49e15214ecd633caf69a7844e309bff1b1c1e023ec",forbidden:[],qsfog:[]}`. This lists files only; it did not execute Vitest tests.
-- A read-only `pngjs` here-doc decoded existing PNG bytes and applied only integer mask arithmetic. It returned magical-darkness alpha `16384`, hatch `2731`, native `Dx=37286343`, area-32 hatch counts `[683,341,661,331,341,662,331,651,661,331,641,320,331,651,320,640]`; grid counts `[124,94,94,94,94,63,63,63,94,63,63,63,94,63,63,63]`; positive NCC `1.000000`; negative `NCC=NA, absence=PASS`; luma vector `0` versus `-1`; and order-vector reduced delta `8`. Exit 0. A separate analytic Node here-doc returned frame3 losses `7/16,14/16` and frame5 `0/16,0/16` (exit 0). These exact values are frozen above.
-
-The exact discovery pipeline, including its parser, was:
-
-```bash
-set -o pipefail
-npx vitest list --configLoader runner --filesOnly --json | node -e 'const fs=require("fs"),crypto=require("crypto"); const rows=JSON.parse(fs.readFileSync(0,"utf8")); const root=process.cwd()+"/"; const paths=rows.map(r=>r.file.startsWith(root)?r.file.slice(root.length):r.file).sort(); const canon=paths.map(p=>p+"\n").join(""); console.log(JSON.stringify({rows:rows.length,projectNamePresent:rows.filter(r=>Object.hasOwn(r,"projectName")).length,canonicalSha256:crypto.createHash("sha256").update(canon).digest("hex"),forbidden:paths.filter(p=>p.startsWith("tests/fixtures/")||p.startsWith(".tmp/runs/quietstone/svg-fog/")),qsfog:paths.filter(p=>p.includes("qsfog"))},null,2));'
-printf 'pipeline_status=%s\n' "${PIPESTATUS[*]}"
-```
-
-The authoritative mask command was this read-only stdin script (the separately reported phase command enumerated `w=3,5`, `(px,py) in [0,3]^2`, and the exact rail/hatch predicates from the deterministic section):
-
-```bash
-node <<'NODE'
-const fs=require('fs'),{PNG}=require('pngjs');
-const p=PNG.sync.read(fs.readFileSync('public/assets/art/map-overlay-magical-darkness-v1.png'));
-const freq=new Map(); for(let i=0;i<p.data.length;i+=4){const k=Buffer.from(p.data.subarray(i,i+4)).toString('hex');freq.set(k,(freq.get(k)||0)+1)}
-const modal=[...freq].sort((a,b)=>b[1]-a[1])[0][0]; const M=Array.from({length:16384},(_,i)=>Buffer.from(p.data.subarray(4*i,4*i+4)).toString('hex')!==modal);
-const reduce=(mask,cut)=>{const out=[];for(let py=0;py<4;py++)for(let px=0;px<4;px++){let n=0;for(let v=0;v<32;v++)for(let u=0;u<32;u++){let c=0;for(let y=py+4*v;y<py+4*v+4;y++)for(let x=px+4*u;x<px+4*u+4;x++)c+=x<128&&y<128&&mask[128*y+x]?1:0;n+=cut(c)}out.push(n)}return out};
-const G=Array.from({length:16384},(_,i)=>{const x=i%128,y=(i/128)|0;return x===0||x===127||y===0||y===127});
-const d=reduce(M,c=>c>=3),g=reduce(G,c=>c>0),n=16384,m=M.filter(Boolean).length,D=n*m-m*m;
-console.log(JSON.stringify({darkness:{alphaNonzero:p.data.filter((_,i)=>i%4===3&&p.data[i]>0).length,hatch:m,Dx:D,area32:d,min:Math.min(...d),max:Math.max(...d)},grid:{area32:g,min:Math.min(...g),max:Math.max(...g),variances:[...new Set(g)].sort((a,b)=>a-b).map(x=>x*(1024-x))},positive:{n,sumX:m,sumY:m,sumXY:m,N:D,Dx:D,Dy:D,NCC:'1.000000'},negative:{n,sumX:m,sumY:0,Dx:D,Dy:0,NCC:'NA',absence:'PASS'},lumaVector:{full:[0,0,1],omitted:[0,0,7],specified:0,separate:-1},orderVector:{nativeDelta:[32,0,0,0],areaDelta:8,postReduceThreshold:1}},null,2));
-NODE
-```
+### Verified read-only in round 4
 
-The exact phase-count command was:
+The round-3 review was read in full; D624.5 and the four pinned PNG hashes were verified from committed files.
+No test, browser, server, model, or source-writing command ran.
+The exact successful detector replay command was:
 
 ```bash
 node <<'NODE'
-function losses(w){let top=0,any=0;for(let py=0;py<4;py++)for(let px=0;px<4;px++){const seen=[false,false,false,false,false];for(let v=0;v<32;v++)for(let u=0;u<32;u++){const x=px+4*u,y=py+4*v,X=(x>=12&&x<40)||(x>=48&&x<80)||(x>=88&&x<116),Y=(y>=12&&y<40)||(y>=48&&y<80)||(y>=88&&y<116);seen[0]||=y>=12&&y<12+w&&X;seen[1]||=y>=116-w&&y<116&&X;seen[2]||=x>=12&&x<12+w&&Y;seen[3]||=x>=116-w&&x<116&&Y;seen[4]||=x>=28&&x<100&&y>=28&&y<100&&(x+y)%16<w}top+=!seen[0]||!seen[4];any+=seen.some(x=>!x)}return {w,TOP_RAIL_OR_HATCH_32_PHASE_LOSS:top,ANY_RAIL_OR_HATCH_32_PHASE_LOSS:any}}
-console.log(JSON.stringify([losses(3),losses(5)]));
+const fs=require('fs'),{PNG}=require('pngjs'),S=128,n=S*S;
+const floor=PNG.sync.read(fs.readFileSync('public/assets/art/map-floor-stone-v1.png')).data;
+const frame=new Uint8Array(n),hatch=new Uint8Array(n);
+const run=z=>z>=12&&z<40||z>=48&&z<80||z>=88&&z<116;
+for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=y*S+x;
+ const rail=run(x)&&(y>=12&&y<17||y>=111&&y<116)||run(y)&&(x>=12&&x<17||x>=111&&x<116);
+ const tick=x>=61&&x<66&&y>=12&&y<24||x>=62&&x<67&&y>=104&&y<116||
+  y>=61&&y<66&&x>=12&&x<24||y>=62&&y<67&&x>=104&&x<116;
+ frame[i]=+(rail||tick);hatch[i]=+(!frame[i]&&x>=28&&x<100&&y>=28&&y<100&&(x+y)%16<5)}
+const F=Uint8Array.from(frame,(v,i)=>+(v||hatch[i])),full=Buffer.alloc(n*4);
+const colors=[[17,17,19,250],[119,122,134,150],[205,206,210,255]];
+for(let i=0;i<n;i++){const c=frame[i]?colors[2]:hatch[i]?colors[1]:colors[0],a=c[3]*78;
+ for(let k=0;k<3;k++)full[4*i+k]=Math.floor((c[k]*a+floor[4*i+k]*(25500-a))/25500+.5);
+ full[4*i+3]=255}
+function edges(q,r,d){const z=d*d,C=new Uint8Array(z),Y=new Int16Array(z),D=new Int16Array(z);
+ const E=new Uint8Array(z);for(let i=0;i<z;i++){const a=q[4*i]-r[4*i],b=q[4*i+1]-r[4*i+1];
+  const c=q[4*i+2]-r[4*i+2];C[i]=+(Math.max(Math.abs(a),Math.abs(b),Math.abs(c))>=8);
+  Y[i]=Math.floor((54*q[4*i]+183*q[4*i+1]+19*q[4*i+2]+128)/256);
+  D[i]=Math.floor((54*a+183*b+19*c+128)/256)}
+ for(let y=0;y<d;y++)for(let x=0;x<d;x++){const i=y*d+x;if(!C[i])continue;
+  for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=Math.max(0,Math.min(d-1,y+b))*d+
+   Math.max(0,Math.min(d-1,x+a));if(Math.abs(Y[i]-Y[j])>=12||Math.abs(D[i]-D[j])>=8){E[i]=1;break}}}
+ return E}
+function stat(X,Y){const z=X.length,sx=X.reduce((a,b)=>a+b,0),sy=Y.reduce((a,b)=>a+b,0);let sxy=0;
+ for(let i=0;i<z;i++)sxy+=X[i]*Y[i];const N=z*sxy-sx*sy,Dx=z*sx-sx*sx,Dy=z*sy-sy*sy;
+ return{n:z,sumX:sx,sumY:sy,sumXY:sxy,N,Dx,Dy,NCC:Dx&&Dy?(N/Math.sqrt(Dx*Dy)).toFixed(6):'NA'}}
+function rgba32(a,px,py,area){const o=Buffer.alloc(4096);for(let y=0;y<32;y++)for(let x=0;x<32;x++)
+ for(let c=0;c<4;c++){let v=0;if(!area)v=a[4*((py+4*y)*S+px+4*x)+c];else{
+  for(let j=0;j<4;j++)for(let i=0;i<4;i++)v+=a[4*(Math.min(127,py+4*y+j)*S+
+   Math.min(127,px+4*x+i))+c];v=Math.floor(v/16+.5)}o[4*(y*32+x)+c]=v}return o}
+function masks32(px,py,area){const fr=new Uint8Array(1024),f=new Uint8Array(1024);
+ for(let y=0;y<32;y++)for(let x=0;x<32;x++){const o=y*32+x;if(!area){const i=(py+4*y)*S+px+4*x;
+  fr[o]=frame[i];f[o]=F[i]}else{let a=0,b=0;for(let j=0;j<4;j++)for(let i=0;i<4;i++){
+   const xx=px+4*x+i,yy=py+4*y+j;if(xx<128&&yy<128){a+=frame[yy*S+xx];b+=hatch[yy*S+xx]}}
+  fr[o]=+(a>0);f[o]=+(a>0||16*b>=80)}}return[fr,f]}
+const E=edges(full,floor,S),B=Uint8Array.from(E,(v,i)=>v&&frame[i]?1:0);
+const out={unmasked:stat(F,E),frameBand:stat(frame,B)};
+for(const area of [false,true]){const a=[],b=[];for(let py=0;py<4;py++)for(let px=0;px<4;px++){
+ const [fr,f]=masks32(px,py,area),e=edges(rgba32(full,px,py,area),rgba32(floor,px,py,area),32);
+ a.push(+stat(f,e).NCC);b.push(+stat(fr,Uint8Array.from(e,(v,i)=>v&&fr[i]?1:0)).NCC)}
+ out[area?'area32':'nearest32']={unmasked:[Math.min(...a),Math.max(...a)],
+  frameBand:[Math.min(...b),Math.max(...b)]}}
+console.log(JSON.stringify(out));
 NODE
 ```
-
-Discarded read-only explorations are recorded rather than hidden: an initial `pngjs` here-doc named nonexistent `public/assets/art/map-overlay-fog-hidden-v1.png`, exited 1 with `ENOENT`, and produced no relied-on fog result; `rg --files public/assets/art | rg '(fog|magical-darkness|obscurement|map-floor-stone-v1)' | sort` then identified `fog-hidden-v1.png`. An initial `rg`/`nl` against nonexistent `tools/generate-starter-art.ts` exited 2/0 with “No such file”; `rg -n "paintFogHatch|paintVeil" tools src` located `src/assets/pixel-art.ts`. A first fog-plan read used nonexistent main-repository `.tmp-plans/...`, printed `No such file or directory`, and made the combined command nonzero; the corrected worktree-local command above succeeded. None changed a file or supports a claim.
 
-Round-2's plan-as-config Playwright run is explicitly void. It temporarily overwrote the review artifact and changed the resolution location. No result from it is carried as evidence.
+Its exact output is the native and 32-pixel vector frozen above.
 
 ### UNVERIFIED until implementation or supervisor execution
 
 - Exact final wrapper path and filtered discovery. After implementation creates `.tmp/qsfog-svg/playwright.config.ts`, the supervisor must run the exact `PLAYWRIGHT_PORT=4460 ... --list` command in Verification and record exit 0, one test/one file/title. Then the supervisor runs the one browser case; this plan round was forbidden to create the wrapper or run Playwright.
-- Actual block ID/record/timestamps, clean committed implementation, all-lanes pause, ten-path absence, whole-interval service continuity, and post-run hashes. The supervisor must run the Freeze/identity commands, `lstat` all recorded paths, and populate the attestation.
+- Actual block ID/record/timestamps, clean committed implementation, ten-path absence, and post-run hashes remain unverified. The supervisor runs the exact template/preflight/update commands above. Lane pause, arm service continuity, and whole-interval continuity remain explicitly manual supervisor attestations.
 - Chromium version/executable SHA, SVG raster palette/repeatability, final candidate hashes/counts, all fixture gate values, and browser pass/duration. The supervisor runs `render-assets`, `deterministic-gates`, and the one bounded seam test exactly as specified.
 - Live A1=A3 and archived=A1, region confinement, and whether fresh-recapture controls are needed. The supervisor runs `capture`; no planning-only arithmetic can verify a future live DOM capture.
 - C1/C2 score/rate spread, thresholds/headroom, candidate answers, and verdict. Only the supervisor makes those model calls and runs `paired-report`.
@@ -829,6 +895,6 @@
 
 ## Completion boundary
 
-Implementation is ready for supervisor model work only after Increment A precedes B; static/focused checks, the one browser seam test, both asset rasters, all 43-view gates, exact frame3 `7/16` and `14/16`, frame5 `0/16`/`0/16`, and all 24 A→B→A captures are green; the block/current freeze and fresh paths validate; and archived controls are eligible. A positive paired report authorises later shipping planning only.
+Implementation is ready for supervisor model work only after Increment A precedes B; static/focused checks, the one browser seam test, both asset rasters, all 43-view gates, exact frame3 `7/16` and `14/16`, frame5 `0/16`/`0/16`, and all 24 A→B→A captures are green; the final candidate path and fresh paths validate; the post-capture recomputed freeze equals its pre-capture value; and archived controls are eligible. A positive paired report authorises later shipping planning only.
 
-PLAN SVG-FOG PILOT R3 DONE
+PLAN SVG-FOG PILOT R4 DONE
