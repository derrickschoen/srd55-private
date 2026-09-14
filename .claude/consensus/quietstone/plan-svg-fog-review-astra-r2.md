# SVG-fog plan review r2 (astra 01a09dc9-21cc-7d83-8720-a950c18c52e5), harvested 2026-09-13 22:49

**REJECT PLAN SVG-FOG.** Round 2 fixes several findings, but the browser command remains broken, the deterministic measurement contains unavoidable failures, and the promotion rule omits retained requirements.

Reviewed HEAD `14039ca5`, plan SHA-256 `0a0dc5ab9c4a689942ee347df201ee16bb327815d0eee60e840f65807930495a`. No edits, git writes, agents, model calls, Vitest, or Playwright runs. The worktree remains clean. Line references below refer to the [round-2 plan](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md).

1. **PS2-F1 — P1, blocking: prescribed Playwright wrapper still fails. Lines 514–549.**

   The supervisor’s exact-path probe returned exit 1 and zero discovered tests. The successful worktree-contained probe does not establish `/tmp` resolution. My source inspection confirms the base config’s relative dependency on `tests/browser/fixtures/worker-origin`; `git check-ignore` confirms the proposed worktree `.tmp/` location is ignored.

   **Minimal change:** prescribe `.tmp/qsfog-svg/playwright.config.ts`, importing `../../playwright.config.ts`. Update both commands and require `--list` evidence against that exact pathname, followed by discovery of exactly the intended filtered test. Withdraw the resolution claim at line 542. Round 1’s suggested plain-object fix was insufficient.

2. **PS2-F2 — P1, blocking: frozen masks make required NCC gates unsatisfiable. Lines 313–337.**

   Independent read-only PNG/mask probes found:

   - The pinned magical-darkness PNG has **16,384/16,384 nontransparent pixels**. Its prescribed binary mask is constant: `Dx=0`. Every native comparison against this required competitor is therefore `NA`.
   - The one-pixel grid rectangle, reduced by the prescribed half-area threshold, has **zero marked pixels in all sixteen area-32 phases**. Those competing correlations also become `NA`.
   - For a plain, grey, or grid negative with no fog, omitting fog leaves the composite unchanged. Consequently `D_fog=0`, `C_fog=0`, and `E_fog=0`: negative fog NCC is necessarily `NA`.

   The plan requires `NA` to fail and every candidate gate to pass. These failures are properties of the measurement, independent of candidate quality.

   **Minimal change:** redefine and freeze useful structural competitor masks and their reduction behavior. Separately specify how absence of observed structure rejects a fog classification on negatives, explicitly reconciling that result with the inherited `NA` contract. Prove lawful positive and negative cases before implementation; do not manufacture variance, substitute zero for `NA`, or relax thresholds to obtain green.

3. **PS2-F3 — P1, blocking: promotion omits retained FP/collision requirements. Lines 253–272, 286, 450.**

   The now-readable [brainstorm round 1](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/quietstone/brainstorm-svg-fog-astra-r1.md:89) requires ordinary-floor fog FP **and** obscured-as-fog collisions not to increase, with at least one decreasing **≥25%** when its control count is nonzero. [Round 2](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/quietstone/brainstorm-svg-fog-astra-r2.md:45) adds the spread requirement **alongside** experiment-specific thresholds. D624.1 adopts that protocol.

   Current condition 6 permits an arbitrarily small ordinary-FP reduction when repeat spread is zero, and places no promotion restriction on increasing obscured-as-fog collisions. Improved scores and unchanged FNs do not imply either missing restriction.

   **Minimal change:** restore both non-increase checks and the ≥25% requirement within condition 6. Freeze collision denominators, reference averaging, and the applicable spread comparison. Extend its boundary tests to cover sub-25% improvement, collision regression, zero control counts, and exact thresholds.

4. **PS2-F4 — P1, blocking: remaining measurement choices can change numbers. Lines 315–329, 337.**

   Six-decimal NCC quantisation is explicit, but upstream operations remain incomplete:

   - `D_c^Y` is undefined: subtracting separately rounded lumas can differ from rounding the weighted RGB difference.
   - The sequence of composition, reduction, counterfactual subtraction, and thresholding is not expressly fixed.
   - “Every floor/light combination” does not enumerate the fixtures and shade treatments.
   - “Scaled reference rail band” does not define phase-aware membership and corner exclusion for fractional legend reductions.

   **Minimal change:** give explicit equations/operation order, enumerate the frozen fixture inputs and treatments, and define rail/tick membership through the same precise coordinate system. Add small independently calculated vectors covering these choices. Final NCC rounding cannot remove upstream disagreement.

5. **PS2-F5 — P2: unused-output preflight omits files the probe overwrites. Lines 132–156, 628–657.**

   The exact seven-path list covers JSONLs and image roots, but each invocation also writes `<arm>-summary.md`. The probe derives this at [line 2478](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2478) and overwrites it without exclusive creation at [line 4395](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4395).

   A pre-existing `c1-summary.md` passes the prescribed preflight and is overwritten. Include all three derived summary paths in freshness validation and add that isolated negative case.

6. **PS2-F6 — P2: continuity evidence does not cover inter-arm gaps. Lines 138–154, 685.**

   Three arm-local `serviceContinuity: 'continuous'` attestations cannot represent an interruption after C1 ends but before C2 starts. The timestamps allow that gap, although the protocol invalidates reuse across a service interruption.

   Add a supervisor attestation covering the entire C1-start-to-final-end interval, and test an interruption confined to an inter-arm gap.

7. **PS2-F7 — P2: the named single-tick mutant need not fail its assigned gate. Lines 329, 353, 458.**

   Removing one of four ticks leaves three notched sides, satisfying `VISIBLE_NOTCH_THREE_SIDES`. At native resolution, this mutant does not necessarily fail the named predicate.

   Assign single-tick removal to the exhaustive native geometry gate, or remove enough ticks to violate the three-side visibility requirement. Keep the three-side acceptance threshold unchanged.

8. **PS2-F8 — P2, process: the wrapper proof changed the property under test. Lines 532–542, 689–715; lane report.**

   Temporarily replacing the sole plan document with executable configuration changed the config’s resolution location—the relevant independent variable. Calling that result “direct proof” of the `/tmp` fix is unsupported.

   Preserve the plan as the review artifact. Run future configuration probes from the prescribed final location and record their exact pathname, command, exit status, and discovery count. Distinguish temporary writes from read-only verification.

| Round-1 finding | Disposition | Round-2 evidence |
|---|---|---|
| **PS1-F1** | **NOT RESOLVED** | Lines 514–549. Supervisor’s exact-path failure overrides the non-equivalent successful probe; PS2-F1/F8. |
| **PS1-F2** | **PARTIAL** | Lines 307–362. Many constants are now explicit, but PS2-F2/F4/F7 remain. My independent mask probe reproduced **frame3 7/16 top, 14/16 any-side; frame5 0/16 and 0/16**. Their distinct names are correctly pinned. |
| **PS1-F3** | **PARTIAL** | Lines 100–156. Committed/current harness equality, stale identity rejection, timezone/window rules, and seven-path absence checks are specified. Pre-C1 fields are shell-producible; future arm-result fields must remain null until completion. Summary-path freshness and whole-block continuity remain incomplete: PS2-F5/F6. |
| **PS1-F4** | **RESOLVED** | Lines 560–577. Correct file-discovery command and exact baseline comparison. My read-only enumeration independently yielded **599 files**, no forbidden/qsfog paths, and the exact recorded SHA `54a76a0a…1e023ec`. No Vitest execution was needed. |
| **PS1-F5** | **RESOLVED** | Lines 282–286, 428–452. Builder→real consumer integration and isolated boundaries for all seven stated conditions are present. Condition 6’s restored requirements need additional cases under PS2-F3. |
| **PS1-F6** | **RESOLVED** | Lines 389–426. The worktree-local staging directory satisfies the actual service validator; `git check-ignore` confirms it is ignored. Service-artifact authentication, content-addressed exclusive copies, and re-read digest checks are specified. |
| **PS1-F7** | **RESOLVED** | Lines 181–183, 231–235. Classification-plus-coordinate deduplication matches the scorer; cross-class overlap remains valid. Independently reconstructed all **24** historical scores/hallucinations without mismatch: **549 FPs**, including **280 ordinary fog FPs**, with **5,331** fixed eligible cells and no duplicate diagnosis records. |
| **PS1-F8** | **RESOLVED** | Lines 237–281. Pooled rate, global/per-base headroom, and corrupt-input versus authenticated-recapture-mismatch precedence are explicit. The separate retained-threshold omission is PS2-F3. |
| **PS1-F9** | **RESOLVED** | Lines 364–387, 418, 460–470. Default screenshot options and settlement counts are pinned. The mutant removes both effective decode barriers; the real settlement routine independently decodes images. |

The production scope remains consistent with D624/D624.1 and D616.1: experimental PNGs, live DOM replacement, unchanged floors/legend/projection, Option B forbidden, and no shipping or pin movement. D516 palette preservation remains explicit. The newly accessible prior records remove round 1’s access blocker, but expose the promotion-rule omission above.

**REJECT PLAN SVG-FOG**

SVG-FOG PLAN REVIEW R2 DONE