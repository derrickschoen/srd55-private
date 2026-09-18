# ELEVATION-02 plan r1 — astra HIGH review (fresh 01a0ab75-07f5-7393-88d7-2fc31de9768f): REJECT 9 P1 + 5 P2

The plan is not ready to implement. Its hash and **1,240-line count match exactly**. Both unmodified TypeScript projects compile, but the proposed cutover has demonstrable unowned errors, one hand witness is incorrect, and several required behaviors lack an executable contract.

References below: **P** = [reviewed plan](/home/vagrant/PhpstormProjects/dnd-wt-elevation-plan/.tmp-plans/2026-09-16-elevation-02-plan.md); **D** = main repository’s [.claude/decisions.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md). **VIS** and **OFFERS** identify source read through `git show` at `5492f782` and `1cacd8f0`, respectively.

1. **P1 — B1–B5 cannot reach their promised compile-green boundary.**  
   **Plan:** P:551–559, 657–687.  
   **Source:** `tests/integration/vtt/pc-algorithm-policy.test.ts:732`; `tests/unit/tools/ai-dm-conversation.test.ts:2467`; `tests/unit/tools/engine-mcp-handler.test.ts:251–252`; `tests/unit/vtt/content-pack.test.ts:271`; `tests/unit/vtt/room-generator-los-cover.test.ts:174,314–315`.

   A read-only, in-memory compiler overlay replacing only `CombatRulesProfile.speed` with required `movementSpeeds: unknown` produces **35 app diagnostics / 13 paths** and **43 node diagnostics / 18 paths**. Eight node diagnostics occur in those five test files. Four are absent from the entire manifest; `engine-mcp-handler.test.ts` is first editable in B8. Their scalar-speed dependencies also survive on both branches. Requiring normalized object heights additionally affects the explicit `WorldObject` constructor at `terrain.test.ts:17–30`, deferred to B6.

   **Fix:** assign every diagnostic—including tests/tools—to the atomic tranche before approval, redistribute batches to preserve the ten-file limit, and repeat the final-declaration overlay. “Stop and amend when discovered” does not establish the advertised complete manifest.

2. **P1 — The plan changes D569’s blind protocol into offered-ID selection.**  
   **Plan:** P:40–45, 926–934.  
   **Source:** D:13394–13409; `tests/fixtures/ai-dm-kb/d569/protocol.md:4,57` on all three trees; `src/vtt/blind-model-ingress.ts:82–106`.

   D569 explicitly permits gutter-label destinations and excludes offered options. P says the sole coordinate exception is `query_line`, then requires a mutant proving the D569 protocol teaches offered IDs instead of coordinates. That changes the experiment’s model boundary and contradicts its binding ruling.

   **Fix:** distinguish ordinary offered-ID operation from D569 blind intent operation. Preserve the latter’s authorized coordinate grammar and option-information exclusion; add elevation interpretation without changing that authority boundary.

3. **P1 — Mode/altitude preservation has no owned proposal-to-execution type change.**  
   **Plan:** P:414–416, 791–800.  
   **Source:** OFFERS `src/vtt/turn-proposal.ts:120–123,225–232`; OFFERS `src/vtt/offers/offer-envelope.ts:19–27,78–90`; `src/combat/events.ts:79–82`.

   The offer carries `EngineMovementObjective`; resolved mechanics carry only `GridCell[]` and a `GridCell` final position. Neither binds traversal mode or altitude. `turn-proposal.ts` and `offer-envelope.ts` are unowned. B9’s “resolution preserves the offered traversal mode” cannot be fulfilled merely by changing query implementations.

   **Fix:** specify the typed internal movement binding, its contribution to option/resolution identity, and its propagation into reducer commands. Own all affected contract files. Preserve the separate environment digest.

4. **P1 — “Fully incorporate elevation” lacks a distance/reach contract.**  
   **Plan:** P:347–350, 411–413.  
   **Source:** `src/combat/creature-space.ts:533–570`; OFFERS `src/vtt/engine-query-port.ts:1212–1238`; `src/combat/encounter.ts:2579–2585,7957`; VIS `src/combat/visibility-field.ts:135–143`.

   The plan defines movement distance, but not attack reach, spell range, opportunity-attack boundaries, or sense range across elevations. These consumers currently use horizontal cell distance. Consequently, a ground creature can remain “5 feet away” from an adjacent creature at flying base +20 even after cover becomes three-dimensional.

   **Fix:** define the canonical elevation-aware distance policy and endpoint convention, enumerate consumers, and require query/reducer agreement tests for vertically separated melee, ranged, spell, sense, and opportunity-attack cases.

5. **P1 — A mandatory arithmetic oracle is wrong, and its neighboring mutant witness does not discriminate.**  
   **Plan:** P:280, 704–710.  
   **Source:** approved elevation plan:215–220; the formula at P:248–255.

   For the edited object, `p(3.5,.4)=4.25`, which exceeds `p(3.5,.6)=3.833…`. The correct projection is **−4.5..4.25**, overlap **17/24 ≈ .708333**, still capped at Half.

   Moreover, the supplied `0..3` object produces `−4.5..3` and Half using **entry only or entry+exit**. It cannot kill `B6-ENTRY-T-ONLY` through the stated tier expectation.

   **Fix:** correct the arithmetic and provide a discriminating mutant fixture. For example, eye 3, occluder `4..6`, crossing `.4..6`, target `0..10`: full projection gives **8/15 → Half**; entry-only gives **9/20 → none**. Name the exact assertion and mutation.

6. **P1 — Forced falling can enter a state the model forbids, with no resolution.**  
   **Plan:** P:185–188, 357–365, 1126–1133.  
   **Source:** SRD:11723–11733; approved elevation plan:271–277.

   Flying footprints may span mixed tiers, but every grounded footprint requires uniform support. A Large non-hover flyer over mixed floor/raised cells can become Prone and must fall. The plan specifies neither its landing placement nor a representation for the resulting unsupported footprint. Rejecting the fall, retaining flight, or inventing a nearby destination would each make a substantive decision.

   **Fix:** specify deterministic forced-landing behavior, including mixed support, occupied landing cells, and flight removal. Test these reachable cases. The SRD settles the fall trigger, not this grid-model resolution; §14 cannot call it settled.

7. **P1 — The effect policy contradicts the cited Speed rule.**  
   **Plan:** P:194–198, 351–352; also P:370.  
   **Source:** SRD:12114–12121; `src/combat/encounter.ts:1855–1867`; SRD:11794–11804.

   “Active effects alter only named kinds” omits the cited propagation of general Speed increases/decreases to special speeds. Existing structured speed changes already apply across available modes. Separately, the High Jump formula omits the SRD’s **minimum zero** clamp.

   **Fix:** distinguish kind-specific grants/changes from general Speed modifiers, state ordering and condition interactions, and test literal walk/fly/climb outcomes. Write High Jump as `max(0, 3 + Strength modifier)` before standing-distance treatment.

8. **P1 — The D630 arena instrument does not measure the required combat round.**  
   **Plan:** P:1038–1047.  
   **Source:** `tests/unit/tools/ai-dm-arena.test.ts:533–567,657–659,1758–1775`; D:22733–22734 and 3195–3200.

   The selected test exercises scheduling with `OrderingNullAdapter`, which returns empty `finalText`. It also selects `monster_block_v1`/legacy initiative. It does not prove the cost of a completed standard-initiative combat round exercising elevation movement and execution.

   **Fix:** name a deterministic completed-round workload using standard initiative, fixed actions/seed, and actual reducer execution. Keep the quiet-box base/candidate protocol. The **8–18%** estimate currently has a qualitative mechanism but no measured trace fraction or cost calculation supporting that numerical range; label it uncalibrated or supply that calculation.

9. **P1 under this review’s explicit wording rule — §10 contains a positive regeneration instruction.**  
   **Plan:** P:1013.  
   **Source:** `tools/generate-engine-mcp-schemas.ts:8–25`.

   The row says “Regenerated only with…”. This concerns a generated schema artifact, and its independent accept/reject safeguards are sound; it is not evidence of self-generated behavioral expectations. Nevertheless, it meets your explicit “any regenerate language” criterion.

   **Fix:** separate schema-artifact generation from pin normalization, explicitly preserve independent literal expectations, and state the demonstrated schema-field changes under §10.

10. **P2 — VIS composition does not specify distinct cell and creature target identities.**  
    **Plan:** P:285–305, 394–400.  
    **Source:** VIS `src/combat/visibility-field.ts:255–269,339–357,395–433`; frozen VIS plan:232.

    VIS currently evaluates and caches by observer plus target cell; creature sight reduces to those cell evaluations. Elevation requires a target’s actual body/altitude, while a bare cell needs an explicit hypothetical body convention. A flying creature and the ground beneath it cannot necessarily share one cached answer.

    **Fix:** specify a typed target descriptor, endpoint-aware cache keys, and distinct cell-field versus creature-sight semantics through the same VIS evaluator. Add same-cell/different-altitude witnesses. Require `query_line` sight evaluation to obey the existing single-owner import boundary.

11. **P2 — Authored half-foot elevations are reused for fractional computed projections.**  
    **Plan:** P:238–245, 248–260.  
    **Source:** `src/combat/elevation.ts:60–67`; approved elevation plan:203–205.

    `ElevationFeet` enforces half-foot increments, but projections include `94/3`; a Tiny default height also gives a source midpoint of 1.25. Those computed values cannot pass the existing constructor.

    **Fix:** distinguish authored tier-base values from finite computed vertical coordinates/projections. State the precision and boundary policy without weakening authored-input validation or relying on unchecked brand casts.

12. **P2 — Water membership does not settle traversal behavior.**  
    **Plan:** P:354–356, 1132–1133.  
    **Source:** `src/combat/elevation.ts:40–49,74–91`; SRD:12192–12202.

    Water is only an orthogonal cell set. The plan does not say whether membership forbids ordinary walking, where a swimmer’s body base lies, or how mixed wet/dry footprints transition. The SRD specifies swimming expenditure; it does not establish these representation choices.

    **Fix:** explicitly define the supported surface-water model and transitions, or identify the unresolved product choice. Add walk-versus-swim and water-entry/fall witnesses.

13. **P2 — Player height exposure has contradictory acceptance language.**  
    **Plan:** P:939–941 versus 955–958.  
    **Source:** approved elevation plan:337–344; `src/vtt/encounter-board.ts:108–115`.

    “Any player byte containing elevation” is a hard stop, but B15 deliberately permits audience-visible board elevation. These tests can be implemented incompatibly.

    **Fix:** enumerate player-visible tier/height labels separately from forbidden DM-only provenance, unresolved facts, and query semantics. Apply that precise boundary consistently to projection, DOM, accessibility, metadata, and semantic exports.

14. **P2 — The recorded VIS baseline is stale.**  
    **Plan:** P:27–31, 92–96, 1194–1198.  
    **Source:** D:22819–22820; current `git rev-parse claude/vis-field`.

    The branch is **5492f782**, not **78ee31b0**. The historical probe may remain historical evidence, but it should not be identified as the current accepted branch.

    **Fix:** update the baseline and explicitly distinguish pre-seam probe results from current seam evidence.

The remaining checks produced these results:

- **Assumptions:** independently sampled **15**: A1–A8, A11–A14, A20, A22, A24, against local main and both branches. The sampled factual shapes hold, with the documented VIS line shifts. Session/replay/capsule versions are **12/7/4**; protocol/provenance lengths are **60/130**.
- **Geometry:** recomputed five numerical witnesses. Ascend: overlap **0**. Pit entry: **1**. Flying intervener: projection **94/3..121/2**, overlap **0**. Three-foot object: **−9/2..3**, overlap **1/2**. Edited object: incorrect as reported in finding 5.
- **D635:** the conjunction of two independently qualifying optical flanks is consistent with D:22805 and VIS `cover.ts:319,332,513–518`. Keeping a lone collinear face clear is consistent with the one-sided-graze rule. The seam remains optical-only.
- **OFFERS:** the sole builder and canonical query-port design are compatible with elevation. `build-offer-environment.ts:30–40,47–81` and `offer-environment.ts:24–31,99–116` support preserving the environment binding. Its digest also includes the threat catalog, not merely family policy.
- **Manifests:** **16 batches**, counts **10,10,10,10,10,10,10,10,10,10,9,10,10,10,10,7**; **124 unique paths**. Counts pass; completeness fails.
- **Pins:** §10 otherwise states demonstrate-then-normalize, independent expectations, named-field diffs, and negative controls. No permission to generate behavioral expectations from production output was found.
- **VIS’s 145/147 probe:** those semantic-board reds are already within VIS B5/B6 ownership, especially frozen VIS plan:218–238. They are a valid requirement for the eventual landed base to be green, not a new ELEVATION remediation task or an unowned planning blocker.
- **Conventions:** filename/date/length comply. Scalar-speed replacement and typed absence follow project direction; the missing typed movement binding and computed-coordinate distinction need correction.

Principal verification commands and results:

```sh
git status --short
git rev-parse HEAD
git rev-parse main claude/vis-field claude/p-offer-help
wc -l .tmp-plans/2026-09-16-elevation-02-plan.md
sha256sum .tmp-plans/2026-09-16-elevation-02-plan.md
/usr/bin/time -f 'TSC_APP wall=%e exit=%x' npx tsc -p tsconfig.app.json --noEmit --pretty false
/usr/bin/time -f 'TSC_NODE wall=%e exit=%x' npx tsc -p tsconfig.node.json --noEmit --pretty false
```

Results: clean status; HEAD/main **4a99570d**; VIS **5492f782**; OFFERS **1cacd8f0**; **1,240 lines**; SHA-256 **9033ee72323406cc81acd5bd7521a1e2093be6a4021ec780d35da7988bb5b71a**. TSC app **exit 0, 15.07 s**; node **exit 0, 29.48 s**.

Branch evidence used `git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static show <branch>:<path>` with numbered line reads. SRD reads covered exactly **848–870, 921–954, 11470–11496, 11712–11733, 11791–11812, 11880–11900, 12096–12121, 12192–12202**. Arithmetic used Python `fractions.Fraction`; compile mutation used an in-memory TypeScript `CompilerHost.readFile` override, with no file writes. No Vitest, model calls, agents, servers, or git writes were run.

REJECT PLAN — Findings: P1 #1–#9; P2 #10–#14.
REVIEW DONE