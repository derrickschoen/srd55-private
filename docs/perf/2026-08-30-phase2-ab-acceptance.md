# Phase 2 A/B acceptance sample — initiative_segments_v1 vs monster_block_v1

Run 2026-08-30, main @ ae6f7f98, lane checkout dnd-lane-rollout (content-equal).
8 generated rooms (seed 6200001, basis standard), interleaved arms, both
gpt-5.6-luna low, initiative profile derived_v1 on both arms; the only
variable is the combat model. Raw rows: job-tmp `ab-phase2-arena.jsonl`
(16 rows, rlData captured).

| Acceptance target (plan open question 3 default) | Result |
|---|---|
| No authorization regression vs block | 8/8 authorized in BOTH arms |
| Median adjustments ≤ 1 per 3-PC round | 0.5 (per-round: 0,1,0,1,2,0,0,1) |
| Full-context fallback < 5% of adjustments | 0% (0 of 5; all turn_delta) |
| Correction rate < 10% of adjustments | 0% (0 corrections, 0 service-nulls) |

Materiality gate: 5 material PC turns across 8 rounds, each produced
exactly one adjustment call; non-material turns produced zero calls.

Adherence labels across 24 PC turns: 7 followed / 17 altered /
0 plan_invalidated. (The false-invalidation defect was fixed at
ae6f7f98 before this run; `altered` dominance is a party-plan
predictiveness observation, not an acceptance criterion.)

Caveats: n=8 rooms per arm, single rep, one service-weather window
(mitigated by interleaved arms). The default-model flip remains an
owner decision (D416.1 / plan open question 3).
