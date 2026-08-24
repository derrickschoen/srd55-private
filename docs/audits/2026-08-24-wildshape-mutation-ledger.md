# Wild Shape mutation ledger — 2026-08-24

Each production mutation below was applied alone, killed by its named test, and restored before the next mutation.

| Mutation | Isolated production change | Named killing test | Result |
|---|---|---|---|
| `mental_stats_replaced` | Made the Wild Shape rules lens use the Beast's Intelligence, Wisdom, and Charisma instead of the druid's. | `mental_stats_replaced: two forms replace physical rules and attacks but retain mental scores and spell save DC` | `exit 1`; expected Intelligence 10, Wisdom 18, and Charisma 10 but received 3, 12, and 6. `Tests  1 failed \| 10 skipped (11)` |
| `excess_damage_dropped` | Forced carryover to zero when the Beast physical layer reached 0 Hit Points. | `excess_damage_dropped: zero Beast-layer excess and exactly one excess revert correctly` | `exit 1`; expected 19 true-form Hit Points after one excess damage but received 20. `Tests  1 failed \| 10 skipped (11)` |
| `unknown_form_allowed` | Disabled the character-sheet known-form membership check. | `unknown_form_allowed: refuses a bundled Beast that is not on the character sheet` | `exit 1`; the eligible but unknown Ridge Runner transformed instead of returning `form_not_known`. `Tests  1 failed \| 10 skipped (11)` |
| `concentration_dropped_on_shift` | Ended the druid's concentration immediately after assuming Wild Shape. | `concentration_dropped_on_shift: concentration, conditions, pending decisions, and policies survive shape and duration reversion` | `exit 1`; the concentration-owned effect disappeared from the shaped state. `Tests  1 failed \| 10 skipped (11)` |

The restored implementation was rerun with its persistence coverage: `Test Files  2 passed (2)` and `Tests  13 passed (13)`. All four mutations were restored.
