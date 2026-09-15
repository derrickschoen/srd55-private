# QSFOG-SVG-01 plan review r4 (Increment B measurement, D624.5 round) — gpt-6-astra (read-only)

Reviewed plan sha c6206939… (900 lines) on 14039ca5. Session 01a09dee-83ef-7772-8131-dc3c7920afae. Log .tmp/runs/fanout/review-plan-svg-fog-r4.log.

**REJECT PLAN SVG-FOG B.** Blocking findings: **PS4-F1 and PS4-F2**.

Verified HEAD `14039ca5`, 900 plan lines, and SHA-256 `c6206939cb51bf243683c2e3401df8ca76b93ca5af447e008bfdbec126369493`. Neither concurrent Increment A implementation file was read. No writes, tests, builds, browsers, agents, or model calls were used.

1. **PS4-F1 — P1: frame-band masking weakens the separability requirement. [Plan:356](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:356), 360, 370–376.**

   The arithmetic reproduces, and the positive now passes through composition, counterfactual subtraction, colour masking, and edge extraction. It is **not self-correlation**.

   | Native measurement | `n` | `sumX` | `sumY` | `sumXY` | `N` | `Dx` | `Dy` | NCC |
   |---|---:|---:|---:|---:|---:|---:|---:|---:|
   | Unmasked | 16,384 | 3,425 | 2,755 | 848 | 4,457,757 | 44,384,575 | 37,547,895 | 0.109196 |
   | Frame band | 16,384 | 1,800 | 780 | 780 | 11,375,520 | 26,251,200 | 12,171,120 | 0.636402 |

   All 32-pixel ranges also reproduce:

   | Reducer | Unmasked NCC | Frame-band NCC |
   |---|---|---|
   | Nearest | −0.099780–0.117089 | 0.986651–1.000000 |
   | Area | 0.299584–0.447086 | 0.993368–1.000000 |

   **The problem is what the new score means.** Because `B = E AND R`, every observed positive is forced inside the target reference. Writing `m=sum(R)` and `s=sum(B)` gives:

   ```text
   NCC(R,B) = sqrt(s*(n-m) / (m*(n-s)))
   ```

   This measures edge coverage inside the expected band. Arbitrarily many distracting edges outside that band incur no penalty. If edges occur everywhere, `B=R` and NCC becomes `1`.

   My end-to-end adversarial probes over the unchanged pinned stone PNG produced:

   | Arithmetic candidate | Native band NCC | Native margin S | Nearest-32 evidence | Other gates |
   |---|---:|---:|---|---|
   | Quarter source-RGB frame contrast: frame `[64,64,67,255]` | 0.636402 | 0.637183 | Phase `(0,0)`: NCC 0.986651 | Palette rejects it; NCC/margin do not distinguish it from the original. |
   | Retain horizontal sides; remove vertical middle bars/ticks | 0.513294 | 0.513304 | Phase `(0,0)`: NCC 0.797562 | Native geometry and notch requirements reject it. Hatch remains unchanged. |
   | Three-pixel checkerboard, **no frame** | 0.926324 | 0.904916 | **Every phase:** NCC 1.000000; margin 0.949088–1.008610 | Exact geometry, hatch/gutter and tuple-inventory requirements reject it. |

   The checkerboard’s area-32 NCC is **0.888612–0.953133**, with margin **0.820144–0.940844**. Thus neither the target score nor its competitor margin supplies the missing discrimination.

   A separate synthetic arithmetic fixture—busy background plus uniform veil, without a frame—produced NCC **1.000000**, margin **1.000019**. No floor file was changed. This confirms that background-derived edges can receive perfect frame credit.

   The other gates provide useful safeguards, so the *whole suite* is not tautological. But native asset correctness does not make this score a measure of composite separability. Structure-free negatives also do not repair it: with no fog, full and omitted composites coincide, giving `E_fog=0` and automatic absence success.

   **Owner-rule verdict:** the literal `0.60` is retained, but **the inherited acceptance requirement is weakened in substance**. The score discards the false-positive structure that previously depressed it.

   **Minimal change:** retain frame-band NCC as a survival diagnostic, not the replacement separability gate. Preserve an independently observed discrimination requirement that penalises competing structure outside the expected band, and challenge it with the no-frame patterns above. Until that measurement is justified, record deterministic rejection rather than treating this selected positive as closure.

2. **PS4-F2 — P1: mandatory retained gates still reject the exact frozen candidate. [Plan:321–324](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:321), 362, 370, 406, 897.**

   Two independent failures remain beyond the reported fog-only positive.

   **Fourteen-pixel legend:** exact rational area reduction produces:

   ```text
   n=196; sumX=sumY=sumXY=52
   N=Dx=Dy=7488; frame-band NCC=1.000000

   top:    01111111111110
   bottom: 01111111111110
   left:   01111111111110
   right:  01111111111110
   ```

   Each side has **one run and no internal break**, violating line 362. At 28 pixels, all four sides retain three runs. This is a concrete example where the independent visibility gate catches a failure despite perfect frame-band NCC.

   **Obscurement overlap:** on pinned stone, no shade or illumination, nearest-32 phase `(0,0)`:

   | Overlay | `sumX` | `sumY` | `sumXY` | `N` | `Dx` | `Dy` | Obscurement NCC |
   |---|---:|---:|---:|---:|---:|---:|---:|
   | Light | 235 | 233 | 132 | 80,413 | 185,415 | 184,303 | **0.434998** |
   | Heavy | 235 | 702 | 232 | 72,598 | 185,415 | 226,044 | **0.354614** |

   Both fail **0.55**. Across all nearest-32 phases, the ranges are **0.398310–0.558554** and **0.354614–0.558554**, respectively.

   Furthermore, switching `O_light/O_heavy` to footprint references changes obscurement measurement despite line 356 calling it unchanged. Restoring point references alone does **not** clear every overlap phase.

   **Minimal change:** make a faithfully reported deterministic rejection a terminal Increment B outcome, skipping candidate capture/model calls. Keep the thresholds. Positive-only completion requires further authorised measurement/geometry work; the current frozen specification cannot produce all-green evidence.

3. **PS4-F3 — P2: one diff hunk removes frozen-A verification history. [Plan:811–874](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md:811).**

   I reconstructed r3 in memory from the supplied diff. All **14 hunks** match the current plan; reconstructed SHA is exactly `8525e874…5972`. Increment A’s section is byte-identical, with SHA `51a4c6ba…02af`.

   Hunk audit, using new starting lines:

   | Hunks | Classification |
   |---|---|
   | 2 | Round header |
   | 112, 125, 150 | PS3-F3 |
   | 318 | PS3-F1 |
   | 353, 367, 498 | PS3-F1/F2 measurement and verification |
   | 516, 534 | PS3-F3 test/hand-back |
   | 625 | PS3-F4 |
   | 709 | PS3-F3/F4 |
   | 895 | PS3-F3 completion wording and round marker |
   | **808** | **Mixed:** B verification replacement also deletes A-related historical verification, including the exact discovery parser and prior source/protocol checks. |

   No other out-of-scope hunk was found.

   **Minimal change:** retain those A-related records as historical r3 evidence; replace only B-related verification entries.

**PS3-F1 reproduction:** footprint references fix every previously constant phase. Counts below are ordered `(py,px)`:

```text
Darkness 64, previously zero:
(px,py)=(1,0),(0,1) -> 1365,1365 out of 4096

Darkness 32, previously zero:
(1,0),(3,0),(0,1),(2,1),(1,2),(3,2),(0,3),(2,3)
-> 341,331,341,331,331,320,331,320 out of 1024

Grid 32, previously zero:
(1,1),(2,1),(1,2),(2,2) -> 63,63,63,63 out of 1024
```

All six frame5 references—`F_frame`, `F`, both obscurement masks, darkness and grid—were nonconstant across **43 views each**. Darkness still has **2,731** native hatch pixels.

Read-only probes used `git rev-parse HEAD`, `git status --short`, `sha256sum`, `wc -l`, targeted plan/report reads, and the complete `python3 - <<'PY'` integer/Pillow scripts recorded in this review’s tool calls. Those scripts implemented the equations independently and emitted the sums above. The supplied older oracle was read but not executed because it contains a hard-coded output write.

| Dimension | Verdict |
|---|---|
| PS3-F1: formerly constant references | **Resolved**, with the obscurement-reducer consequence noted above |
| PS3-F2: end-to-end arithmetic | **Reproduced** |
| PS3-F2: measurement purpose / substantive threshold preservation | **Not resolved — PS4-F1** |
| Remaining mandatory candidate gates | **Fail — PS4-F2** |
| PS3-F3: immutable candidate path/hash lifecycle | **Resolved:** lines 153, 519, 712–730 |
| PS3-F4: record template, preflight/update, manual attestations | **Resolved:** lines 628–730 |
| Frozen Increment A section | **Unchanged; not re-reviewed** |
| Diff scope | **One verification-history exception — PS4-F3** |
| Frozen contract / production restrictions | **Preserved** |

**REJECT PLAN SVG-FOG B — blocking list: PS4-F1, PS4-F2.**

SVG-FOG PLAN REVIEW R4 DONE