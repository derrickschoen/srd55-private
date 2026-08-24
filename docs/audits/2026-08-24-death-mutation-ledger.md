# D373.8 death-flow mutation ledger

Each mutation was applied alone to the restored implementation and run against
its named killing test in `tests/unit/combat/death-saves.test.ts`.

| Control | Injected defect | Killing test | Result |
|---|---|---|---|
| `nat20_plain_success` | A natural 20 added one success instead of restoring 1 Hit Point and consciousness. | `nat20_plain_success: a natural 20 restores exactly 1 HP and a playable conscious turn` | `exit 1`; expected living at 1 HP with usable turn resources, received dying at 0 HP with one success. `Tests  1 failed \| 20 skipped (21)` |
| `massive_damage_ignored` | Damage equal to the Hit Point maximum at 0 HP skipped instant death and added one failure. | `massive_damage_ignored: kills at the exact massive-damage boundary while already at 0 HP` | `exit 1`; expected `massiveDamage: true` and dead, received `massiveDamage: false` and dying. `Tests  1 failed \| 20 skipped (21)` |
| `massive_damage_remainder_boundary` *(supervisor-found)* | Changed the drop-to-0 remainder comparison from `>=` to `>`, so remainder equal to the Hit Point maximum survived. | `massive_damage_remainder_boundary: exact-maximum remainder kills while one less leaves the character dying` | `exit 1`; for the SRD example (maximum 12, 6 HP, 18 damage), expected `massiveDamage: true` and dead, received `massiveDamage: false` and dying. `Tests  1 failed \| 21 skipped (22)` |
| `override_unlogged` | A DM death override changed state but returned before emitting its ruling record. | `override_unlogged: every explicit DM death override emits a D357 adjudicated ruling card` | `exit 1`; expected the D357 `adjudicated` envelope, received no event. `Tests  1 failed \| 20 skipped (21)` |
| `hidden_roll_leaks` | Player projection ignored `hideDeathSaveRolls` and emitted the raw number. | `hidden_roll_leaks: the toggle redacts only the number from PlayerView while DmView retains it` | `exit 1`; expected `rollVisibility: dm_only`, received `player_visible`. `Tests  1 failed \| 20 skipped (21)` |

All five mutations were restored. The restored death-flow file finished with
`Test Files  1 passed (1)` and `Tests  22 passed (22)`.

SRD pins used by the killing tests: dropping to 0, monster death, massive
damage, and unconsciousness are at
`docs/srd/full/srd-5.2.1.txt:1051-1083`; start-of-turn saves, three successes or
failures, and counter reset are at
`docs/srd/full/srd-5.2.1.txt:1084-1099`; natural 1/20 and damage at 0 are at
`docs/srd/full/srd-5.2.1.txt:1101-1110`; stabilization and delayed recovery are
at `docs/srd/full/srd-5.2.1.txt:1111-1120`.
