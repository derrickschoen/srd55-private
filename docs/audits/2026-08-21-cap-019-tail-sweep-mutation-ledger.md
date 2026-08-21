# CAP-019 tail-sweep mutation ledger

Scope: D318.1 continuation shapes TYP-003, TYP-004, TYP-005, TYP-007,
TYP-008, TYP-010, and TYP-012.

Each temporary fault was run with `npx vitest run tests/unit/vtt -t "<control>"`,
then restored and re-run with the same named test.

| Control | Temporary fault | Mutated result | Restored result |
|---|---|---|---|
| `banish_return_damage_dropped` | Returned the absent token at the source-start boundary without resolving the typed return damage. | exit 1; named test failed; 1 failed, 144 skipped | exit 0; named test passed; 144 skipped |
| `agonizing_applied_twice_per_turn` | Removed the per-turn used-effect guard from the named-spell damage modifier. | exit 1; named test failed (`[4, 4]` rather than `[4, 1]`); 1 failed, 144 skipped | exit 0; named test passed; 144 skipped |
| `exploding_die_unbounded` | Allowed each added maximum-face die to explode again. | exit 1; named test failed (42 rather than bounded 40); 1 failed, 144 skipped | exit 0; named test passed; 144 skipped |
| `superiority_die_free` | Bypassed the maneuver pool decrement while retaining its die and condition. | exit 1; named test failed (2 remaining rather than 1); 1 failed, 144 skipped | exit 0; named test passed; 144 skipped |

All four source mutations were restored before the final gates.
The restored VTT/combat/bridge gate passed 1,647 tests, the unchanged simulator
gate passed 176 tests, and both TypeScript configurations exited 0.
