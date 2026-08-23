# D361.1/D363.2 adventuring-day mutation ledger

Each mutation was applied alone to the restored implementation and run against
the named test in `tests/unit/vtt/party-session-state.test.ts`.

| Control | Injected defect | Killing test | Result |
|---|---|---|---|
| `resources_reset_between_rooms` | Room composition returned the fresh stored-character spawn instead of preloading captured party state. | `resources_reset_between_rooms: captures damage and an actual spell spend, then preloads both into room 2` | `exit 1`; expected HP 13, received 20. `Tests  1 failed \| 7 skipped (8)` |
| `short_rest_restores_long_slots` | Short Rest restored every slot pool to maximum. | `short_rest_restores_long_slots and hit_die_ignores_con: distinguishes Wizard/Warlock recovery and hits both die boundaries` | `exit 1`; expected Wizard shared slots remaining 0, received 3. `Tests  1 failed \| 7 skipped (8)` |
| `hit_die_ignores_con` | Hit Point Die healing used only the die face. | `short_rest_restores_long_slots and hit_die_ignores_con: distinguishes Wizard/Warlock recovery and hits both die boundaries` | `exit 1`; expected Wizard HP 17, received 13. `Tests  1 failed \| 7 skipped (8)` |
| `dead_walks` | A dead party member was preloaded as living. | `dead_walks: stabilized-at-zero and dead states both survive the next-room preload without resurrection` | `exit 1`; expected `life: "dead"`, received `life: "living"`. `Tests  1 failed \| 7 skipped (8)` |
| `party_state_leaks` | Player projection treated every party member as seat-owned. | `party_state_leaks: another PC spent-slot detail is absent from a non-owning PlayerView` | `exit 1`; expected one owned character, received three. `Tests  1 failed \| 7 skipped (8)` |

All five mutations were restored. The restored focused file finished with
`Test Files  1 passed (1)` and `Tests  8 passed (8)`; `npx tsc -b` also exited 0.
