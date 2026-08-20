# Turn-program pattern-library mutation ledger

The required gate was green before mutation: bridge/VTT 171 tests, sim 176
tests, and both TypeScript configurations. Each defect below was injected
alone, its named test was run, and the production source was restored before
the next defect.

| Mutation | Injected defect | Killing test | Mutated | Restored |
|---|---|---|---:|---:|
| `helper_bypasses_validation` | Removed non-negative coordinate validation from helper cell expansion | `helper_bypasses_validation rejects an invalid cell before it can become a DecisionProgram` | exit 1 | exit 0 |
| `rider_searched_independently` | Searched fixed rider follow-ups when the attached action was illegal | `rider_searched_independently never considers a fixed rider follow-up when the attached attack is illegal` | exit 1 | exit 0 |
| Own `fraction_hp_not_scaled` | Passed the 0..1 HP fraction directly to the percentage predicate | `fraction_hp_not_scaled converts the 0..1 fraction to the contract percentage exactly once` | exit 1 | exit 0 |

