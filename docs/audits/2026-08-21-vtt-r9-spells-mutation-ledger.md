# VTT r9 spell mutation ledger

All controls were applied one at a time only after the scoped gate, sim suite,
and both TypeScript configs were green. Each focused run exited 1 with the
named test failing, and each source mutation was restored immediately.

| Mutation | Applied change | Named killing test | Result |
|---|---|---|---|
| `armed_rider_persists_after_hit` | Searing Smite `consumeOnHit: true` → `false` | `armed_rider_persists_after_hit: Searing Smite fires on the next weapon hit only once` | Killed: the armed `damage_rider` remained after the first hit instead of becoming the save-ended ongoing effect. |
| `heal_value_drifted` | Heal `baseAmount: 70` → `60` | `heal_value_drifted: Heal pins and restores the flat 70 HP literal` | Killed: the independent definition and runtime boundary rejected 60. |
| `moonbeam_save_dropped` | Bypassed `resolveTargetSave` in `save_damage_and_effect` | `moonbeam_save_dropped: Moonbeam pins 2d10 Radiant plus Constitution save-half and repeats the save at turn end` | Killed: the expected initial `save_resolved` event was absent. |
