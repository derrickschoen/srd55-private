# SVG-fog plan review r3 FINAL (astra 01a09dee-83ef-7772-8131-dc3c7920afae), harvested 2026-09-13 23:34

Reviewed plan SHA `8525e874…5972` at HEAD `14039ca5`. Read-only review completed; tracked tree remains clean. No agents, model calls, browser runs, or test runs.

1. **PS3-F1 — P1: required nearest-view competitors still become constant. [Lines 337–341](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:337), 376, 386.**

   Independent PNG arithmetic confirms the reported fixes:

   | Measurement | Reproduced result |
   |---|---:|
   | Darkness `[42,44,48,150]` hatch | 2,731/16,384 |
   | Native `Dx` | 37,286,343 |
   | Darkness area-32, phase `(0,0)` | 683 |
   | Darkness area-32, all phases | 320–683 |
   | Grid area-32, phase `(0,0)` | 124 |
   | Grid area-32, all phases | 63–124 |

   However, the unchanged **nearest** reducer gives:

   - Darkness at 64: `[1366,0,0,1365]`—two constant-zero phases.
   - Darkness at 32: eight constant-zero phases.
   - Grid at 32: zero at `(px,py) ∈ {1,2}²`.

   Each produces `Dx=0`, which the positive/margin contract requires to fail regardless of candidate quality.

   **Smallest correction:** explicitly use the already-defined phase-aligned footprint occupancy reducers for `D_hatch` and `G` references in nearest views too. Preserve nearest sampling for observed RGBA and fog geometry. Add nonconstant-reference assertions across **all 43 views**; retain thresholds and never substitute zero for `NA`. This measurement amendment needs supervisor arbitration.

2. **PS3-F2 — P1: the prescribed candidate already fails the actual native detector; the “lawful positive” bypasses it. [Lines 369–390](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:369), 420, 547, 832.**

   The archived hatch self-correlation reproduces `1.000000`. The no-fog observation reproduces `Dy=0`, `NCC=NA`, with explicit `NEGATIVE_FOG_ABSENCE=PASS`. These are lawful **NCC/absence unit vectors**, but the positive does not exercise composition, counterfactual subtraction, colour masking, or edge extraction.

   I independently implemented the native equations twice—Node arithmetic and Python integer arithmetic over the pinned PNG. Both produced the same result for frame5 over `map-floor-stone-v1.png`, without illumination, shade, or obscurement:

   ```text
   n=16384
   sum(F)=3425
   sum(E_fog)=2755
   sum(F AND E_fog)=848
   N=4457757
   Dx=44384575
   Dy=37547895
   NCC=0.109196 < 0.60
   ```

   Thus independent implementers agree on the equations, but the exact frozen candidate cannot satisfy the required all-green completion.

   **Smallest correction:** retain the geometry and thresholds, pin this end-to-end result, and allow a recorded deterministic rejection to complete Increment B without candidate capture/model calls. If positive-only completion remains mandatory, this candidate/measurement pair needs a supervisor-authorised redesign. Do not lower thresholds or regenerate expectations to obtain green.

3. **PS3-F3 — P2: candidate-path finalisation can invalidate its embedded freeze digest. [Lines 171](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:171), 466, 480, 667.**

   Capture authenticates the block and embeds `blockFreezeSha256`. Line 667 subsequently says to set `candidateManifest` and recompute the immutable digest. Because `paths` is hashed, changing a permitted null candidate path after capture makes the emitted provenance stale.

   **Minimal change:** require the final candidate path before capture; explicitly exclude the subsequently populated candidate-manifest hash from the immutable subset. After capture, populate only that hash and assert the freeze digest remains unchanged. Add a path-change rejection test.

4. **PS3-F4 — P2: the UNVERIFIED inventory is not fully backed by exact supervisor commands. [Lines 804–808](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:804).**

   Discovery/browser execution, rasterisation, deterministic gates, capture, model arms, and reports have command templates. Item 805 still delegates record creation/population, explicit `lstat` checks, and operational attestations through prose; the Freeze commands do not supply all those operations.

   **Minimal change:** add the concrete block-record template and exact preflight/update commands, identifying pause and service-continuity statements as manual supervisor attestations. Commands cannot independently prove service continuity.

   The wrapper itself is corrected: I verified the supervisor-created file matches the plan verbatim. The supplied exact-path discovery evidence establishes resolution. Zero matches for the future seam title today is expected; implementation must subsequently discover exactly one.

| PS2 finding | Disposition | Round-3 plan evidence |
|---|---|---|
| **F1** | **RESOLVED** | 574–614: correct worktree-local wrapper and commands; supervisor verified the exact path. |
| **F2** | **PARTIAL** | 337–391: native/area competitors and explicit negative absence fixed; nearest degeneracy and missing end-to-end positive remain—PS3-F1/F2. |
| **F3** | **RESOLVED** | 271–295, 310, 510: both non-increase checks, ≥25%, same-family strict spread comparison, fixed denominators and boundary cases restored. |
| **F4** | **RESOLVED** | 339–378, 388–394: operation order, signed-difference luma, fixture inputs, phase membership and rounding are specified. Independent arithmetic agrees, including the failing native result. |
| **F5** | **RESOLVED** | 145–172, 495, 539: all derived summaries included; isolated existing-summary rejection specified. |
| **F6** | **RESOLVED** | 152–174, 496, 745: whole-interval attestation includes inter-arm gaps and the isolated gap-interruption mutant. |
| **F7** | **RESOLVED** | 378, 410–411, 518: one removed tick targets exact native geometry; two target three-side notch visibility. |
| **F8** | **RESOLVED** | 749–808: non-equivalent round-2 proof withdrawn; read-only evidence distinguished from supervisor execution. Remaining command completeness is PS3-F4. |

Condition 6 preserves brainstorm r1:94 and r2:45 for nonzero controls: both pooled rates cannot increase; one eligible family must improve by **≥25% and strictly more than twice its own spread**. Denominators are **5,331 ordinary / 348 collision**; C1/C2 averaging permits half-integer counts. Exact 25% can pass; exact `2×spread` fails. A zero-reference family must remain zero and cannot qualify. **Both-zero vacuous success is an explicit interpretation added in r3, not an expressly stated case in the brainstorms**; likewise, maximum per-base rate spread concretises their unspecified aggregation.

**PS1 carry-forward:** Nothing resolved in r2 regressed: F4–F9 retain their discovery, integration, staging, accounting, aggregation and capture-barrier contracts. F1 is now resolved; F2 remains partial; F3’s summary/continuity gaps are closed, with the freeze-order clarification above outstanding. I also reproduced frame3 **7/16 and 14/16**, and frame5 **0/16 and 0/16**.

Production scope remains consistent with D624/D624.1, D616.1 and D516: no floor intervention, Option B, shipping, pin movement, or palette waiver. The two-increment structure is reasonable, but its mandatory successful outcome is not implementable as written.

**REJECT PLAN SVG-FOG**

SVG-FOG PLAN REVIEW R3 DONE