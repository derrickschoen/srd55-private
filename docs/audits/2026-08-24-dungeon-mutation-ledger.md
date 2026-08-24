# D365 dungeon mutation ledger

Each production mutation was applied alone after the focused D365 and
optional-feature regressions were green. The named test failed with a nonzero exit,
then the exact inverse edit restored production before the next mutation.

| Mutation | Production defect applied | Named killing test | Observed kill |
|---|---|---|---|
| `rooms_reset_party` | `AdventuringDaySession.enterNextRoom` replaced the carried room-3 party with `createPartySessionState(members)`. | `rooms_reset_party: rest_misplaced: carries deterministic HP, slots, and Hit Dice across all four rooms with the rest after room 2` | `exit 1`; `Tests  1 failed \| 2 skipped (3)`; session replay rejected fresh Hit Points against the persisted carried party. |
| `rest_misplaced` | Changed the bundled schedule from `shortRestAfterRoom: 2` to room 1. | `rooms_reset_party: rest_misplaced: carries deterministic HP, slots, and Hit Dice across all four rooms with the rest after room 2` | `exit 1`; `Tests  1 failed \| 2 skipped (3)`; the post-room-1 refusal assertion observed that the rest was incorrectly accepted. |
| `dungeon_monster_unregistered` | Replaced room 1's first Goblin Warrior id with `statblock:not-registered`. | `dungeon_monster_unregistered: validates all four rooms against the registry and names a missing monster field` | `exit 1`; `Tests  1 failed \| 2 skipped (3)`; load returned `missing_monster_id` at `rooms.0.monsters.0.statblockId` instead of the loaded manifest. |
| `optional_feature_grants_resurrected` | Removed the selected-content-key filter from `namedFeatureGrants`, causing every applicable optional feature row to emit again. | `optional_feature_grants_resurrected: distinguishes unselected Warlock, Fighter Extra Attack, and selected unresolved grant` | `exit 1`; `Tests  1 failed \| 4 skipped (5)`; the explicit-empty Warlock export refused at `attacksPerAction`. |

All four mutations were restored. No test, assertion, fixture expectation, or
import diagnostic was weakened or regenerated from mutated output.
