# Scraper content-pack mutation ledger — 2026-08-22

Every mutation below was applied alone, killed by the named test, and restored
before the next mutation. Each killing run exited 1 with exactly the named test
failing.

## Required negative controls

| Mutant | Applied change | Killing test | Result |
|---|---|---|---|
| `approximate_mapping_accepted` | Removed the attack grammar's end anchor so an extra rider clause was ignored and the near-miss operation emitted. | `approximate_mapping_accepted: refuses an otherwise exact operation with one extra rider clause` | Killed: expected `ambiguous-parameters`, received `emitted`. |
| `refusal_reason_collapsed` | Returned `ambiguous-parameters` for every unemitted record. | `refusal_reason_collapsed: preserves each specific refusal reason` | Killed: expected `unmapped-vocabulary`, received `ambiguous-parameters`. |
| `roundtrip_not_executed` | Emitted zero damage dice while leaving the pack structurally importable. | `roundtrip_not_executed: imports and executes an emitted operation in an encounter` | Killed: imported successfully, but target HP remained 20 instead of becoming 12. |

## Numeric boundary controls

| Boundary mutation | Killing test | Result |
|---|---|---|
| Minimum range 1 → 0 | `numeric metadata boundary: range minimum below` | Killed: `0 feet` emitted. |
| Maximum range 100000 → 100001 | `numeric metadata boundary: range maximum above` | Killed: `100001 feet` emitted. |
| Minimum emitted spell level 1 → 0 | `numeric metadata boundary: level minimum below` | Killed: level 0 emitted without a scaling rule. |
| Maximum emitted spell level 9 → 10 | `numeric metadata boundary: level maximum above` | Killed: level 10 emitted. |
| Minimum dice count 1 → 0 | `numeric operation boundary: dice count minimum below` | Killed: `0d6` emitted. |
| Maximum dice count 100 → 101 | `numeric operation boundary: dice count maximum above` | Killed: `101d6` emitted. |
| Minimum die sides 2 → 1 | `numeric operation boundary: die sides minimum below` | Killed: `2d1` emitted. |
| Maximum die sides 100 → 101 | `numeric operation boundary: die sides maximum above` | Killed: `2d101` emitted. |
