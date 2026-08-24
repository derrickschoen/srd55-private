# D371.3 / D373.12 / D375 legendary-monster mutation ledger

The first four production mutations were applied alone, killed by the named
focused test, and restored with the exact inverse edit before the next mutation.
The final row records the supervisor-reported pre-fix control, observed against
its new unchanged test before the production guard was corrected.

| Mutation | Production change applied alone | Killing test | Observed result |
|---|---|---|---|
| `pool_never_refreshes` | Retained the depleted Legendary Action pool instead of assigning its maximum at the monster's turn start. | `pool_never_refreshes: refreshes all legendary action uses at the monster turn start` | `exit 1`; `Tests  1 failed \| 9 skipped (10)`; remaining uses were 2 instead of 3. |
| `resistance_free` | Subtracted zero when Legendary Resistance was spent. | `resistance_free: spend converts a failure, restores its damage, and decrements the visible uses` | `exit 1`; `Tests  1 failed \| 9 skipped (10)`; remaining uses were 3 instead of 2. |
| `window_on_own_turn` | Removed the active-monster exclusion from Legendary Action window discovery. | `window_on_own_turn: does not queue a legendary window at the monster own turn end` | `exit 1`; `Tests  1 failed \| 9 skipped (10)`; the monster received its own window. |
| `cost_ignored` | Subtracted one use for every Legendary Action instead of its declared cost. | `cost_ignored: two different legendary actions decrement their distinct declared costs` | `exit 1`; `Tests  1 failed \| 9 skipped (10)`; the cost-2 action left 2 uses instead of 1. |
| `legendary_window_incapacitated` | Omitted the Incapacitated exclusion from Legendary Action window discovery (the supervisor-reported control). | `legendary_window_incapacitated: excludes an Incapacitated monster while queueing its eligible peer` | `exit 1`; `Tests  1 failed \| 10 skipped (11)`; both the Incapacitated monster and its eligible peer received windows. |

Restored focused run: `Test Files  1 passed (1)` and `Tests  11 passed (11)`.
All five controls were restored.
