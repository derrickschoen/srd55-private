# JS turn-program mutation ledger

All controls were run only after the allowed baseline suites were green. Each
mutation was applied alone, the named test was run, and the source was restored
before the next mutation.

| Mutation | Injected defect | Killing test | Mutated | Restored |
|---|---|---|---:|---:|
| `forbidden_construct_executes` | Removed `while` from the forbidden-token table | `forbidden_construct_executes rejects while before an executable AST exists` | exit 1 | exit 0 |
| `step_budget_ignored` | Disabled the interpreter step-limit comparison | `step_budget_ignored stops a costly API-array loop at the exact configured bound` | exit 1 | exit 0 |
| `interpreter_bypasses_validation` | Returned emitted programs without calling `decodeRoundPlan` | `interpreter_bypasses_validation rejects an emitted action through DecisionProgram validation` | exit 1 | exit 0 |
| Own `projection_order_changes_query` | Removed the combatant-id tie-break from `nearestEnemy` | `projection_order_changes_query uses combatant id as the stable equidistant tie-break` | exit 1 | exit 0 |
| Own `js_source_missing_from_replay` | Replaced the retained program source with an empty string | `js_source_missing_from_replay keeps both source and validated output in the authoritative transcript` | exit 1 | exit 0 |
