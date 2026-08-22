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
