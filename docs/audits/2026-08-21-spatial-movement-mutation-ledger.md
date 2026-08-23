# Spatial movement mutation ledger

Date: 2026-08-21

## SRD 5.2.1 anchors and explicit product rules

- Teleport destination: `docs/srd/source/spell-descriptions.txt:5523-5534`, Misty Step, “teleport up to 30 feet to an unoccupied space you can see”; and `:2156-2180`, Dimension Door, “arrive at exactly the spot desired” with teleportation failing if the arrival space is occupied or filled.
- Forced movement: `docs/srd/source/spell-descriptions.txt:7868-7884`, Thunderwave, “pushed 10 feet away from you” on a failed save; and `:4027-4042`, Gust of Wind, “pushed 15 feet away from you in a direction following the Line.” Those spell entries are silent about collisions. `FORCED_MOVEMENT_OBSTACLE_RULE` therefore names the product rule: traverse cells in order and stop before the first map edge, occupied cell, or movement blocker.
- Movement modes and immunity: `docs/srd/source/spell-descriptions.txt:3375-3394`, Fly, “gains a Fly Speed of 60 feet”; `:7278-7291`, Spider Climb, “gains a Climb Speed equal to its Speed”; and `:3520-3544`, Freedom of Movement, movement “unaffected by Difficult Terrain,” magical effects cannot “reduce the target’s Speed,” and it gains a Swim Speed equal to its Speed.
- Movement damage: `docs/srd/source/spell-descriptions.txt:7296-7312`, Spike Growth, “2d4 Piercing damage for every 5 feet it travels.” The SRD does not state how to charge a partial 5-foot increment. `MOVEMENT_DAMAGE_PARTIAL_UNIT_RULE` names the product rule `completed_units_only`: each completed entered grid cell charges once; an incomplete increment charges zero.
- Speed changes: `docs/srd/source/spell-descriptions.txt:7140-7153`, Slow, “Speed is halved”; and `:4904-4915`, Longstrider, “Speed increases by 10 feet.” Imported effects resolve in effect-creation order: each set/increase/reduction changes every speed already available, then that effect’s mode grants are added. An active imported magical-reduction immunity suppresses reductions independent of creation order.

## Negative controls

| Control | Production mutation | Named killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `teleport_traverses_cells` | Made teleport move through every geometric intermediate cell and call entered-cell hooks before arrival. | `teleport_traverses_cells: teleports to an occupiable visible cell without firing intervening on_enter hooks` | exit 1; 1 failed, 7 skipped; teleporter HP was 19 instead of 20. | exit 0; 8 passed. |
| `push_ignores_obstacle` | Removed `movementBlocked` from forced-movement cell traversal. | `push_ignores_obstacle: forced movement traverses entered cells and stops before a blocking cell` | exit 1; 1 failed, 7 skipped; target reached column 4 instead of stopping at column 2. | exit 0; 8 passed. |
| `movement_damage_off_by_one` | Skipped entered-cell processing for the first voluntary movement cell. | `movement_damage_off_by_one: charges each completed 5-foot cell and refuses an impassable region` | exit 1; 1 failed, 7 skipped; target retained 19 HP instead of 18. | exit 0; 8 passed. |
| `flight_ignores_immunity` | Removed the flying-mode exemption from difficult-terrain cost. | `flight_ignores_immunity: an imported flying-speed grant pays normal cost in difficult terrain` | exit 1; 1 failed, 7 skipped; movement spent 10 feet instead of 5. | exit 0; 8 passed. |

All four production mutations were restored before the final gates.

Final restored gate: `npx tsc -b` exit 0; `npx vitest run --configLoader runner` exit 0 with 419 files and 7,773 tests passed.

## Round 2 — supervisor-found boundary survivor

The supervisor changed the teleport maximum-range comparison from `>` to `>=`. The mutation survived the increment gate, proving that round 1 had no exact-maximum teleport assertion. This was supervisor-found, not self-found.

### Numeric-boundary audit

- Added: `teleport_range_boundary: accepts a destination exactly at maximumDistanceFeet and refuses one grid step beyond` imports a 30-foot teleport, succeeds at 30 feet, and receives `EncounterRuleError` with the engine's declared-constraint reason at 35 feet.
- Already covered: `orders damaging movement regions before persistent on_enter hooks during forced movement` imports a 5-foot push and asserts the target enters the next cell. Changing the completed-unit comparison from `<=` to `<` killed this existing test.
- Already covered: that same exact 5-foot push enters one imported damaging movement-region cell and asserts its damage before the persistent hook. The `<=` to `<` mutation removed both movement and region damage, killing the existing assertion.
- Added: `movement_damage_partial_unit_boundary: a 4-foot forced move completes zero 5-foot units and deals no region damage` pins the lower side of the completed-unit boundary.
- Added: `speed_reduction_zero_boundary: an imported reduction equal to walking speed reaches exactly 0` distinguishes exact exhaustion from the pre-existing overshoot-to-zero assertion.
- Added: `movement_mode_grant_speed_boundary: uses exactly the imported granted speed and leaves 0 movement` spends all 60 feet supplied by an imported mode grant.

### Round-2 negative controls

| Control | Production mutation | Named killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `teleport_maximum_distance_inclusive` | Changed the teleport refusal comparison from `>` to `>=`. | `teleport_range_boundary: accepts a destination exactly at maximumDistanceFeet and refuses one grid step beyond` | exit 1; 1 failed, 12 skipped; the exact 30-foot teleport threw `EncounterRuleError`. | exit 0; 1 passed, 12 skipped. |
| `forced_movement_exact_distance` | Changed the forced-movement completed-unit comparison from `<=` to `<`. | `orders damaging movement regions before persistent on_enter hooks during forced movement` | exit 1; 1 failed, 12 skipped; the exact 5-foot push produced no entered-cell events. | exit 0; 1 passed, 12 skipped. |
| `movement_damage_partial_unit_rounds_up` | Changed `distance + 5 <= distanceFeet` to `distance < distanceFeet`, rounding a positive partial unit up. | `movement_damage_partial_unit_boundary: a 4-foot forced move completes zero 5-foot units and deals no region damage` | exit 1; 1 failed, 12 skipped; the target moved into the damaging cell. | exit 0; 1 passed, 12 skipped. |
| `speed_reduction_exact_zero_one_step_short` | Added one 5-foot step to fixed-feet reduction arithmetic. | `speed_reduction_zero_boundary: an imported reduction equal to walking speed reaches exactly 0` | exit 1; 1 failed, 12 skipped; effective speed was 5 instead of 0. | exit 0; 1 passed, 12 skipped. |
| `movement_mode_exact_budget_refused` | Changed the movement over-budget comparison from `>` to `>=`. | `movement_mode_grant_speed_boundary: uses exactly the imported granted speed and leaves 0 movement` | exit 1; 1 failed, 12 skipped; the twelfth step was refused as over budget. | exit 0; 1 passed, 12 skipped. |

All five round-2 production mutations were proved present one at a time, killed by the named test, restored, and followed by a green targeted rerun before the next mutation.

Round-2 final restored gate: `npx tsc -b` exit 0; `npx vitest run --configLoader runner` exit 0:

```text
 Test Files  419 passed (419)
      Tests  7777 passed (7777)
```
