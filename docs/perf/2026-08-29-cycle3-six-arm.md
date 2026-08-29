# Cycle 3: six-arm interleaved comparison, hard basis (D402.3/D396.1)

144 rounds (12 hard rooms x 2 reps x 6 arms, interleaved round-robin),
seed 5117001 basis, K6 + plays + auto-exposure, flap-aware. ZERO
service_nulls — clean window, interleave protocol validated.

| arm | authorized | auto_resolved | escalations fired->rescued | wall med | p90 |
|---|---|---|---|---|---|
| luna low | 18/24 | 6 | - | 14.0s | 24.2s |
| luna medium | 18/24 | 6 | - | 14.2s | 25.3s |
| sol low | 5/24 | 19 | - | 13.0s | 25.7s |
| tiered ll->sol | 20/24 | 4 | 7->3 | 15.0s | 27.6s |
| tiered lm->sol | 21/24 | 3 | 6->3 | 16.2s | 32.5s |
| tiered ll->lm | 23/24 | 1 | 6->5 | 14.6s | 26.7s |

Findings:
1. Every tiered arm beats every pure arm; escalations fire on the hard
   basis and rescue (t-ll-lm: 5 of 6).
2. D396.1 leader, second consecutive cycle: TIERED LUNA-LOW -> LUNA-MEDIUM
   (96% authorized, cheapest pairing, 14.6s median).
3. sol low collapses as a PRIMARY on hard rooms: 14/19 failures are
   completed turns that never submitted — low-effort budget exhausted on
   4-7 actor rounds — while it still works as an escalation corrector.
   "Smarter model" does not transfer to the specialist task; supports the
   D410 specialization thesis. Residual real rejections: reach errors (3),
   dead-target (1), occupied destination (1).
4. Quality dimension pending: judge panel on this material next.

## Blind judge panel (t-ll-lm arm, 10 rounds, one per room)

Three judges graded the same blind packet (IDs shuffled, rooms withheld;
escalation flags visible). Fable graded first and sealed before sol/opus
dispatch. Rubric /10 = target priority 3 + action economy 3 +
positioning/terrain 2 + coherence incl. fallbacks 2.

| ID | room | escalated | Fable | sol high | opus | mean |
|---|---|---|---|---|---|---|
| R01 | 2 | no | 8.5 | 9 | 8 | 8.5 |
| R02 | 9 | yes | 1.5 | 1 | 1 | 1.2 |
| R03 | 8 | no | 5 | 5 | 3 | 4.3 |
| R04 | 7 | no | 8 | 9 | 9 | 8.7 |
| R05 | 6 | no | 6 | 6 | 5 | 5.7 |
| R06 | 3 | no | 6.5 | 7 | 5 | 6.2 |
| R07 | 1 | no | 7 | 7 | 6 | 6.7 |
| R08 | 10 | yes | 1.5 | 1 | 1 | 1.2 |
| R09 | 4 | no | 6.5 | 6 | 5 | 5.8 |
| R10 | 5 | no | 7 | 7 | 8 | 7.3 |

Judge means: Fable 5.75, sol 5.8, opus 5.1. Panel mean 5.55.
Inter-judge spread <=2 points on every round; unanimous 1s on the two
collapses.

Convergent findings (all three judges independently):
1. ESCALATED ROUNDS ARE THE QUALITY FLOOR. Both escalated rounds (rooms
   9, 10) are all-Dodge with null fallbacks. Escalation rescues
   AUTHORIZATION, not tactics — the corrector legalizes an inert plan
   instead of producing an offensive one. The cycle-3 "rescue" metric
   (5/6) counted legality only; quality-wise those rescues scored 1.2.
2. One-unit-Dodge tax: most good rounds idle ~15% of the squad on an
   unprovoked Dodge (the play template's non-attacking residue).
3. Positioning/terrain is the floor rubric line EVERYWHERE: no round in
   the sample used terrain, chokepoints, or spread; ranged units shoot
   from spawn.
4. One priority inversion (room 4): six attacks into the fighter
   (highest AC/HP) while enemy casters stand.

Next experiment levers, in expected-value order: (a) escalation repair
brief must demand an OFFENSIVE plan, not merely an authorized one —
target the R02/R08 mode; (b) plays expansion should not emit bare Dodge
for actors with a reachable action; (c) terrain/positioning hinting via
the plays layer (chokepoint anchors) — the untouched 2 rubric points.
