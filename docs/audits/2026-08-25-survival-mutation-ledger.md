# D382 survival mutation ledger

Each mutation below was applied to production code, killed by the named focused
test, and restored before the final gates. No expectation was regenerated from
mutated output.

| Mutation | Applied change | Named killing test and observed result | Restoration |
|---|---|---|---|
| `potion_free_refill` | Changed Potion of Healing consumption from `remainingUses - 1` to unchanged `remainingUses`. | `npx vitest run tests/integration/vtt/survival-policy.test.ts --configLoader runner --testNamePattern='potion_free_refill'` → `exit 1`; expected remaining 1, received 2. | Restored decrement-before-healing behavior. |
| `aid_stacks` | Multiplied the +5 Aid bonus by the number of casting target lists containing a PC, making the overlapping target receive +10. | `npx vitest run tests/integration/vtt/survival-policy.test.ts --configLoader runner --testNamePattern='aid_stacks'` → `exit 1`; expected maximum 43, received 48. | Restored one +5 benefit per aided PC regardless of overlapping cast target lists. |
| `bless_without_concentration` | Removed the `endConcentration` call from the `end_concentration` reducer command, leaving Bless active. | `npx vitest run tests/unit/vtt/roll-modifiers-d351.test.ts --configLoader runner --testNamePattern='bless_without_concentration'` → `exit 1`; the unexpected retained d4 exhausted the one-roll RNG. | Restored concentration teardown and effect removal. |
| `detune_ratio_stale` | Left Ridgewing Gallery's recorded ratio at 1.0 after its roster had been reduced to three hostile turns. | `npx vitest run tests/integration/vtt/survival-policy.test.ts --configLoader runner --testNamePattern='detune_ratio_stale'` → `exit 1`; derived 0.75 differed from recorded 1.0. | Restored the honest 0.75 record. |

All four mutations were restored. The final focused suite re-runs all named
controls against the restored code.
