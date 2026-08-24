# Flammable surfaces mutation ledger — 2026-08-24

Each production mutation below was applied alone, killed by its named test, and restored before the next mutation. The final restored surface file completed with `Tests  8 passed (8)`.

| Mutation | Isolated production change | Named killing test | Result |
|---|---|---|---|
| `cold_ignites` | Removed the `Fire` damage-type predicate so every positive damage term ignited a cell. | `cold_ignites: non-fire damage in the same cell does not ignite while Fire damage does` | `exit 1`; the Cold run unexpectedly contained one burning cell. |
| `burn_lingers` | Removed the exact target-round/initiative expiration branch, leaving expiration only after a later round. | `burn_lingers: an ignited cube burns away after exactly one full round` | `exit 1`; the cell remained in `burningCells` at its exact burn-away boundary. |
| `restraint_survives_burn` | Suppressed membership reevaluation after a cell moved to `burnedAwayCells`. | `restraint_survives_burn: Web restraint ends when its burned cube burns away` | `exit 1`; `Restrained` remained after the web cell was gone. |
| `ignition_ignores_exposure` | Stored the adjacent cell rather than the damage target's exposed cell. | `ignition_ignores_exposure: fire ignites the exact exposed cube but not an unexposed neighbor` | `exit 1`; column 4 burned instead of the exposed column 3. |

The restored implementation was rerun after all four controls: one file passed, `Tests  8 passed (8)`. All four mutations were restored.
