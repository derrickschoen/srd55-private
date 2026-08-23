# E04 context-compression and early-stop mutation ledger

Date: 2026-08-21

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `delta_skips_hash_refusal` | `delta_skips_hash_refusal: requests a full snapshot when corrupted delta bytes miss the full-projection hash` | Removed the reconstructed projection's canonical hash comparison while retaining only its revision check. | exit 1; the corrupted delta was accepted as reconstructed instead of requesting a full snapshot. | Restored the hash comparison; exit 0 in the restored gate. |
| `early_stop_before_half` | `early_stop_before_half: stops a clearly separated run at 99% only after 90 tables` | Set the minimum completed-table threshold to zero. | exit 1; the orchestrator stopped after 3 tables instead of the required 90. | Restored `ceil(preregisteredTableCeiling / 2)`; exit 0 in the restored gate. |
| `bytes_counter_constant` | `bytes_counter_constant: records measured, arm-specific wire bytes and zero reconstruction failures` | Replaced each E04 call's measured wire-byte delta with the constant `1`. | exit 1; all three arm totals collapsed to one value. | Restored the measured transport-byte delta; exit 0 in the restored gate. |

Each mutation was applied alone, killed by its named test, and restored before the next mutation.
