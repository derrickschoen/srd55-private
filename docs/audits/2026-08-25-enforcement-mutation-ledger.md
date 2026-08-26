# Enforcement mutation ledger — 2026-08-25

Each mutation below was applied to the working implementation, run against its
named test, observed failing for the intended behavioral reason, and restored
before the next mutation. Expectations were not regenerated.

| Mutation | Applied change | Killing test | Observed failure | Restored |
|---|---|---|---|---|
| `slow_keeps_reactions` | Removed the active Slow check from `canTakeReaction` and preserved the target's current reaction when Slow was applied. | `slow_keeps_reactions mutation is killed: the target cannot react while the control can` | The slowed `spend_reaction` call no longer threw; Vitest reported “expected function to throw.” | Yes |
| `sg_damages_twice_per_turn` | Included the area hook name in the once-per-turn consumption key, allowing re-entry and end-turn hooks to consume separate keys. | `sg_damages_twice_per_turn mutation is killed: re-entry and end-turn share one target-turn gate` | Hit Points fell to 21 instead of staying 24 because the end-turn hook dealt a second 3 damage. | Yes |
| `command_flee_ignored` | Removed Flee's path selection and movement while leaving the compelled Dash/turn exhaustion in place. | `command_flee_ignored mutation is killed: Flee moves away and spends the target turn` | The target remained in column 2 instead of moving to column 14. | Yes |
| `end_in_occupied_cell_allowed` | Disabled the final-cell `canEnd` refusal in `planMovement`. | `end_in_occupied_cell_allowed mutation is killed while forced movement pins the willingly boundary` | Voluntary movement into the ally's occupied destination no longer threw; Vitest reported “expected function to throw.” | Yes |

Mutation commands used the single-file runner form:

`npx vitest run tests/unit/combat/enforcement-gaps.test.ts -t '<mutation name>' --configLoader runner`
