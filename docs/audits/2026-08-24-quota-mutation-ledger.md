# Browser session quota mutation ledger

Date: 2026-08-24

Each mutation below was applied to `src/vtt/local-session-store.ts`, exercised in isolation, killed by the named test, and then restored before the final gate.

| Mutation | Applied defect | Killing test | Observed kill |
|---|---|---|---|
| `migration_deletes_first` | Moved removal of the legacy `srd55:vtt-session:*` key before the IndexedDB revision/metadata transaction completed. | `migration_deletes_first keeps legacy bytes when the IndexedDB copy fails` | Failed because the simulated IndexedDB quota error left the legacy key absent instead of preserving its exact bytes. |
| `truncated_marked_complete` | Forced every migrated legacy session's `migrationStatus` to `complete`. | `truncated_marked_complete preserves a quota-truncated prefix and flags it` | Failed because the migrated save reported `complete` instead of `truncated`. |
| `write_error_swallowed` | Removed the latched write-failure throw from the `flush()` acknowledgement boundary. | `write_error_swallowed returns a typed quota failure from the flush acknowledgement` | Failed because `flush()` returned no `BrowserSessionWriteError`. |
| `prune_cross_pool` | Sorted both autosave pools together and retained only ten snapshots total. | `prune_cross_pool retains exactly 10 snapshots in each IndexedDB autosave pool` | Failed with five per-round saves retained instead of ten (ten total across both pools). |

All four production controls were restored after their killing run.
