# BLIND-01 B5 fix r1 review (gpt-6-astra MEDIUM, candidate 6a43753d)

tokens used
45,836
**ACCEPT — 0 P1 / 0 P2 / 0 P3.** All three prior findings are closed.

1. **Frozen partition:** [arena-basis-brutal-b.test.ts:468](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/arena-basis-brutal-b.test.ts:468) asserts the exact per-seed partition: 40 blind actors and only `6206002-monster-3/-4` legacy actors. All 40 actor IDs and origins match the original B5 ledger. Candidate-derived `legacyProductive` is asserted against that partition; it no longer selects assertion applicability. The `productive === undefined` guard follows a hard `toBeDefined()` assertion, so it cannot bypass shape checks in a passing test.

   Independently recomputed from the hand-built body using repository canonicalization and Node SHA-256:

   | Seed 6206002 actor | Origin | Expected option ID |
   |---|---|---|
   | monster-1 | (21,1) | `option:0:3423656be6b2a7769966d23138a9912e741a81bce67217d7` |
   | monster-2 | (20,1) | `option:0:49a61c9bc3cf47ca58621992c361342927a1259b69ebab60` |

2. **Stationary Search:** [d569-second-family-manifest.test.ts:280](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/tools/d569-second-family-manifest.test.ts:280) changes only engagement, explicitly checks that equivalence, and passes the identical zero-movement resolution to both calls. The negative assertion is exactly `toBe(false)`.

3. **Numeric scoring:** [team-scorer.test.ts:212](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/team-scorer.test.ts:212) requires `status: 'resolved'`. With the live opposing target present, the scorer must pass its allocation-resolution gate before returning this status and aggregated vectors. Search pins lethality, net-action, and all nine ledger fields to exact `0/1`, with `known_no_effect`. The attack control requires damage evidence and positive lethality/net-action numerators.

4. **Expectation integrity:** No regenerated expectations or weakened assertions found. The five removed lines comprise import changes, loop restructuring, and replacement of the defective guard. Frozen-plan SHA-256 matches.

No writes, model calls, or supervisor verification reruns performed. The reported COHORT-owned failure remains outside this fix.

BLIND-01 REVIEW B5 FIX R1 DONE
