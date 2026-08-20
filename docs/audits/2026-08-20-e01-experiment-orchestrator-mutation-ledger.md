# E01 experiment orchestrator mutation ledger

Date: 2026-08-20

| Control | Killing test | Mutation applied | Kill observed | Restoration |
|---|---|---|---|---|
| Required `arms_unpaired` | `arms_unpaired: every paired seed batch has all three arms adjacent` | Removed two arms from one seed/batch pair. | Pair arm-set and adjacency assertions failed. | Restored the registry-driven three-arm inner loop. |
| Required `shuffle_uses_wallclock` | `shuffle_uses_wallclock: seeded arm shuffle is deterministic and remains a permutation` | Replaced the seeded draw with wall-clock/random ordering. | Repeated schedules for one seed differed. | Restored `mulberry32` seeded from the paired seed and replicate. |
| Required `report_drops_aborted_tables` | `report_drops_aborted_tables: aggregate denominators and token totals retain aborted tables` | Filtered aborted records before aggregation. | Table, abort, completion-rate, median, and token assertions failed. | Restored aggregation over every table status. |
| Own `contract_variant_changes_validator` | `contract_variant_changes_validator: all prompt shapes retain the same strict decoder` | Gave compact/reference arms independent contract identities and permissive decoding. | Shared-id and strict unexpected-field assertions failed. | Restored all variants as delivery forms of `round-plan-json-ast:v1`; production strict decoding remains shared. |

All four mutations were applied one at a time, killed by the named test, and restored before the gate.
