# Wave 1 trust-boundary mutation ledger

Date: 2026-08-22

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `fallback_resurrected` | `fallback_resurrected: every closed operation kind has an explicit schema and no key-presence fallback` | Replaced `attack_damage`'s explicit value schema with a kind-only passthrough object. | Vitest: 1 failed, 23 skipped; the null-dice spell imported. | Restored the strict attack/damage/dice/rider schema; Vitest: 1 passed, 23 skipped. |
| `record_rejection_kills_pack` | `record_rejection_kills_pack: attack damage null dice and invalid conditions reject only their records and execute the healthy record` | Returned a whole-pack `malformed_record` refusal from the first failing spell parse. | Vitest: 1 failed, 23 skipped; the fixture helper observed a wholesale refusal. | Restored diagnostic accumulation plus record-local continuation; Vitest: 1 passed, 23 skipped. |
| `fingerprint_not_checked` | `fingerprint_not_checked: one flipped bundle byte refuses the whole session file` | Removed the saved-bundle SHA fingerprint comparison. | Vitest: 1 failed, 11 skipped; the tampered bundle reached sequence validation instead of the typed fingerprint refusal. | Restored recomputation and mismatch refusal; Vitest: 1 passed, 11 skipped. |
| `namespace_not_enforced` | `namespace_not_enforced: an undeclared source namespace rejects only that record and executes the declared healthy record` | Added each observed `sourceId` to the declaration set during its membership check. | Vitest: 1 failed, 23 skipped; the outside record imported with no diagnostic. | Restored membership against manifest declarations only; Vitest: 1 passed, 23 skipped. |
| `speed_bound_bypassed` | `speed_bound_bypassed: speed at the import cap reaches movement state and one over rejects only that monster` | Raised the monster speed schema maximum from `MAX_IMPORTED_SPEED_FEET` to the constant plus one. | Vitest: 1 failed, 23 skipped; the 501-foot monster imported. | Restored the exact named cap; Vitest: 1 passed, 23 skipped. |

Each mutation is applied alone, killed by its named test, restored, and followed by a passing rerun before the next mutation.

## Numeric boundary probes

| Bound | Off-by-one mutation | Mutated result | Restored result |
|---|---|---|---|
| Imported dice count minimum `1` | Changed `baseCount` from a positive integer to a non-negative integer. | `imported dice count boundary: minimum below`: Vitest 1 failed, 23 skipped; zero dice imported. | Restored positive minimum; Vitest 1 passed, 23 skipped. |
| Imported dice count maximum `100` | Raised the schema maximum to `MAX_IMPORTED_DICE_COUNT + 1`. | `imported dice count boundary: maximum above`: Vitest 1 failed, 23 skipped; 101 dice imported. | Restored the exact named maximum; Vitest 1 passed, 23 skipped. |
| Imported speed maximum `500` | Raised the monster schema maximum to `MAX_IMPORTED_SPEED_FEET + 1`. | `speed_bound_bypassed`: Vitest 1 failed, 23 skipped; 501 feet imported. | Restored the exact named maximum; Vitest 1 passed, 23 skipped. |
| Turn-program literal-union maximum `1,000` | Raised the defensive comparison to `MAX_TURN_PROGRAM_MOVEMENT_FEET + 1`. | `numberUnion defensive boundary emits the cap and throws a typed error one foot over`: Vitest 1 failed, 34 skipped; 1,001 feet did not throw. | Restored the exact typed-error boundary; Vitest 1 passed, 34 skipped. |
