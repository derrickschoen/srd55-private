1. **[FALSE-GREEN] One continuous RNG stream must drive every event.** No helper may clone, reseed, cache, or split the supplied closure; attack, damage, saves, reactions, and probability gates are interleaved. **PROVED:** `tools/sim/sim.ts:216-231,373-412`; `tools/sim/homebrew.ts:37,102-123`.

2. **[FALSE-GREEN] `mulberry32` must remain bit-for-bit identical**, including `seed >>> 0`, signed 32-bit coercions, `Math.imul`, constant values, and division by `2^32`. “Equivalent” PRNG code is insufficient. **PROVED:** `tools/sim/sim.ts:223-231`; exact stream tests `tools/sim/rng.test.ts:22-43`.

3. **[FALSE-GREEN] Each ordinary die consumes exactly one RNG draw using `floor(x*sides)+1`.** Rejection sampling, modulo arithmetic, validation, clamping, or allowing `rng() === 1` differently changes parity. Zero dice consume zero draws. **PROVED:** `tools/sim/sim.ts:279-287`; `tools/sim/homebrew.ts:69-77`.

4. **[FALSE-GREEN] Advantage consumes exactly two sequential d20 draws; normal consumes one.** The current sim has no generic disadvantage mode: disadvantage is manually implemented where needed. **PROVED:** `tools/sim/sim.ts:295-298,1161-1166,1829-1835`; `tools/sim/homebrew.ts:80-87`.

5. **[FALSE-GREEN] Attack/save semantics are not one uniform policy.** Most sim attacks use natural 1 as auto-miss, natural 20 as crit/auto-hit; Champion/Veteran use expanded crit floors; homebrew uses fixed `roll >= 8`; saves fail on strict `roll + bonus < DC`, with no natural-1/20 special case. **PROVED:** `tools/sim/sim.ts:351-357,575-583,995-997`; `tools/sim/homebrew.ts:79-87`.

6. **[FALSE-GREEN] JavaScript evaluation order is part of the seeded contract.** Damage is often rolled before its save because it is an earlier argument; target and ally saves may then consume separate later draws against the same damage value. **PROVED:** `tools/sim/sim.ts:1464-1465,1517-1523,1573-1578,1671-1672`.

7. **[FALSE-GREEN] Devotion and Domination have different smite/crit ordering.** Devotion immediately smites the first confirmed hit using that hit’s crit; Domination resolves all attacks, then doubles smite dice if any hit critted. **PROVED:** `tools/sim/sim.ts:397-408,511-529`. Existing constant-RNG tests do not pin Domination’s multi-hit crit choice: `tools/sim/deterministic.test.ts:123-129`.

8. **[FALSE-GREEN] Champion’s draw sequence includes stateful Vex/Studied Advantage, one same-mode Heroic reroll after a miss, and Savage Attacker only on the first hit each turn.** Savage Attacker rolls a complete second weapon pool—crit-expanded—then takes `max`; it is not an individual-die reroll. **PROVED:** `tools/sim/sim.ts:562-617`.

9. **[FALSE-GREEN] Vex is caller state, not generic attack-resolution state.** Its lifetime differs by build: across rounds for Champion/Hunter/open-hand/thief variants, but reset each round in homebrew Cold Open. Consolidating it into a resolver could silently normalize distinct behavior. **PROVED:** `tools/sim/sim.ts:562-564,752-764,855-866,898-909,1274-1284`; `tools/sim/homebrew.ts:327-344`.

10. **[FALSE-GREEN] Thief’s off-turn opportunity chance consumes one raw draw every round before any optional attack/damage draws.** **PROVED:** `tools/sim/sim.ts:643-669`.

11. **[FALSE-GREEN] Veteran’s Deuces reroll is conditional and once-only per die.** A face 2 consumes one extra draw; weapon, Sneak Attack, Old Reserves, and Sure Strike therefore have data-dependent counts. Enemy d20s and prevented-damage dice share that same stream. **PROVED:** `tools/sim/sim.ts:289-293,988-1038`.

12. **[FALSE-GREEN] Berserker paths interleave attack rolls, conditional weapon/Frenzy/Brutal dice, enemy advantaged attacks, damage, and reaction attacks.** Misses skip all associated damage draws. **PROVED:** `tools/sim/sim.ts:694-729,751-776`.

13. **[FALSE-GREEN] Open Hand and Hunter draw counts depend on hit-triggered saves and carried advantage.** Stunning/Topple saves occur immediately after qualifying hits; Hunter’s off-target die occurs only after any marked hit. **PROVED:** `tools/sim/sim.ts:795-833,853-876,897-917,934-954`.

14. **[FALSE-GREEN] Monk has three raw probability gates plus deeply conditional draws.** Goad defiance precedes paired disadvantage d20s; enemy-B presence precedes its attacks; Mirror Image rolls once per remaining image; absorbed/landed damage, retaliation, and concentration then occur in that order. **PROVED:** `tools/sim/sim.ts:1092-1223`.

15. **[FALSE-GREEN] Fiend branches have different attack/damage sequences.** Ray/beam misses skip damage; bladelock dice groups are rolled in array order; Eldritch Smite is rolled after the attack volley and crit-doubled if any hit critted. **PROVED:** `tools/sim/sim.ts:1325-1383`.

16. **[FALSE-GREEN] Fiend Patron’s save can terminate the remaining beam loop and trigger two nested random workloads.** A failed Hurl save adds 8d10 and a sampled enemy turn, then breaks the beam loop. **PROVED:** `tools/sim/sim.ts:1403-1433`.

17. **[FALSE-GREEN] Caster resolution is branch-sensitive beyond attack rolls.** Life/Land/Evoker roll damage before saves; Overchannel consumes no damage-die draws; Chromatic Orb checks duplicate rolled faces and conditionally attacks another target; Draconic/Sorcwiz/Lore interleave attacks, damage, saves, and enemy streams. **PROVED:** `tools/sim/sim.ts:1455-1608,1655-1691,1721-1847`.

18. **[FALSE-GREEN] Homebrew rider dice are consumed immediately after the first qualifying hit**, before later attacks that turn. Crits double rider count, so moving rider resolution to an end-of-turn aggregation changes downstream draws. **PROVED:** `tools/sim/homebrew.ts:102-185,278-318,349-384`.

19. **[FALSE-GREEN] Cutting Chorus has unusual mandatory ordering.** It rolls Inspiration before its d20, conditionally rolls damage, then spends the same RNG stream on a separate hypothetical boosted ally attack for opportunity cost; giving that proxy its own RNG preserves averages but breaks seeded parity. **PROVED:** `tools/sim/homebrew.ts:195-220,246-267`.

20. **[FALSE-GREEN] Cutting Momentum and Broken Tempo have path-specific dice.** Momentum rolls 2d6 only for an expanded-range crit below 20; Tempo rolls its rider only on the first eligible hit per turn, doubles it on crit, and changes later pool state. **PROVED:** `tools/sim/homebrew.ts:408-473`.

21. **Sorcerous Burst is not implemented in either target sim file.** Assuming this extraction already covers exploding dice is **DISPROVED**. Its separate UI implementation rolls base dice, appends one die per promoted 8, and stops at a cap: `src/ui/screens/planner/dice.ts:640-661,674-726`.

22. **[FALSE-GREEN] The repository already has two other incompatible randomness systems.** Planner dice hashes a string into a distinct Mulberry-like generator; VTT dice uses `crypto.getRandomValues` with rejection sampling. Neither is exercised by sim parity. **PROVED:** `src/ui/screens/planner/dice.ts:529-546`; `src/vtt/model.ts:271-299`.

23. **The target files have no `Math.random` or implicit second RNG.** All their stochastic calls reach the injected closure through the listed helpers or three raw probability gates. **PROVED:** `tools/sim/sim.ts:279-357,663,1157,1173`; `tools/sim/homebrew.ts:69-87`.

24. **[FALSE-GREEN] Existing seeded build tests do not pin golden outputs.** They run the post-change implementation twice and compare it with itself; an identically deterministic but reordered stream passes. **PROVED:** `tools/sim/identity.test.ts:95-109,140-148`; `tools/sim/srd-board.test.ts:57-67`.

25. **`rng.test.ts` pins only the generator, not resolution draw order.** It checks five explicit seed-1 values and eight generator draws across several seeds. **PROVED:** `tools/sim/rng.test.ts:22-43`.

26. **[FALSE-GREEN] Exact draw counts are pinned on only seven narrow paths**, chiefly constant/all-miss Champion, Berserker-thrown, Open-Hand-thrown, Hunter, and Sorcwiz cases; no homebrew build has a draw-count assertion. **PROVED:** `tools/sim/deterministic.test.ts:164-198`; `tools/sim/gaps.test.ts:100-107,154-200,225-236`.

27. **[FALSE-GREEN] `scriptedRng` detects overdraw but not underdraw.** A refactor that consumes fewer values can still pass if totals coincide; sim results contain no per-roll trace, and homebrew traces contain state counters rather than dice. **PROVED:** `tools/sim/test-helpers.ts:19-39`; `tools/sim/sim.ts:236-239`; `tools/sim/homebrew.ts:11-35`.

28. **[FALSE-GREEN] Statistical tests cannot enforce identical streams.** They assert bounds/directions and reuse one advancing RNG across thousands of trials; changed counts can still satisfy every tolerance. **PROVED:** `tools/sim/test-helpers.ts:63-92`; `tools/sim/statistical.test.ts:1-5,32-143`.

29. **Importing `src/` from the sim is structurally supported but breaks the documented standalone contract.** A relative `src/combat` adoption test already exists; however the sim config promises no dependency outside its directory. **PROVED/DISPROVED respectively:** `tools/sim/movement-adoption.test.ts:1-17`; `tools/sim/tsconfig.json:2-17`; `tools/sim/vitest.config.ts:1-16`; `tools/sim/README.md:24-27`.

30. **[FALSE-GREEN] `wt/simcore` is only safe as a present snapshot, not a stable baseline.** Its `sim.ts`/`homebrew.ts` currently match these implementations, but its pending planner-dice code adds exhaustive roll-mode/profile switches that an older extraction could overwrite; future branch changes are not provable now. **PROVED current / UNPROVABLE future:** `../dnd-wt-simcore/tools/sim/sim.ts:216-298`; `../dnd-wt-simcore/tools/sim/homebrew.ts:69-98`; `../dnd-wt-simcore/src/ui/screens/planner/dice.ts:152-172,714-750`.