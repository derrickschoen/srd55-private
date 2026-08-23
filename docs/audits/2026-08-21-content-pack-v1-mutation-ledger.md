# Content-pack v1 mutation ledger

All controls ran against `tests/unit/vtt`, `tests/unit/combat`, and
`tests/unit/bridge` with the runner config loader required by the read-only
shared `node_modules`. Each mutant was restored before the next run.

| Mutation | Injected fault | Named killing test | Result |
|---|---|---|---|
| `import_collides_with_srd` | Constructed imported ids from `recordId` alone, dropping the required `sourceId:` namespace. | `import_collides_with_srd keeps the namespace and cannot shadow an SRD spell` | Killed: 5 failures, 1,715 passed; the named test observed `cure-wounds` instead of `greenforge:cure-wounds`. |
| `unknown_operation_coerced` | Replaced an unrecognized spell operation with `stabilize` and continued loading. | `unknown_operation_coerced refuses rather than mapping an unknown operation to a default` | Killed: 1 failure, 1,719 passed; the pack loaded with the coerced operation. |
| `imported_content_missing_from_replay` | Removed `contentPacks` from every persisted encounter revision. | `imported_content_missing_from_replay reconstructs imported records byte-exactly` | Killed: 1 failure, 1,719 passed; replay could not resolve `greenforge:prism-pebble`. |
| `provenance_optional` | Synthesized an attribution block when the input omitted provenance. | `provenance_optional refuses a pack whose provenance block is absent` | Killed: 1 failure, 1,719 passed; the unattributed pack loaded. |

Restored baseline: 40 files, 1,720 tests passed.
