# Typed JS turn-program mutation ledger

All controls were applied to production source one at a time after the restored
scoped gate first passed. Each mutated run used the required scoped Vitest
command, exited 1 with exactly the named killing test below, and left the other
1,753 tests passing. Each source mutation was then restored before the next run.

| Mutation | Production mutation | Named killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `dts_widens_to_string` | Replaced the generated `CombatantId` literal union with `string`. | `dts_widens_to_string is killed by actor-visible literal unions and unavailable combatant diagnostics` | exit 1; 1 failed, 1,753 passed | Restored literal-union generation. |
| `typecheck_result_ignored` | Allowed non-empty compiler diagnostics to continue into interpretation. | `typecheck_result_ignored is killed by refusal before interpretation with verbatim correction diagnostics and telemetry` | exit 1; 1 failed, 1,753 passed | Restored unconditional refusal on failed checks. |
| `dts_ordering_nondeterministic` | Added a changing generation sequence to otherwise identical declarations. | `dts_ordering_nondeterministic is killed by byte-identical declarations with stable unions` | exit 1; 1 failed, 1,753 passed | Restored byte-deterministic generation. |

Final restored gates: scoped unit suite exit 0 with 1,755 tests; standalone sim
suite exit 0 with 176 tests; both `-p` TypeScript configs and `npx tsc -b` exit 0.
