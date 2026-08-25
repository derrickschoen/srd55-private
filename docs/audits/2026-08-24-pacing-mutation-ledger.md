# Timeline, pacing, rewind, and session-record mutation ledger — 2026-08-24

Each production mutation below was applied alone, killed by its named test, and restored before the next mutation. The mechanically previewed SRD timings are the Legendary Action window and refresh rule at `docs/srd/full/srd-5.2.1.txt:16703-16716` and Web's one-round burn-away rule at `docs/srd/full/srd-5.2.1.txt:11162-11165`.

| Mutation | Isolated production change | Named killing test | Result |
|---|---|---|---|
| `preview_off_by_one_round` | Subtracted one from the typed burning-cell `burnsAwayAt.round` only in the next-event projection. | `preview_off_by_one_round: previews the legendary window and Web burn-away at exact rounds, then drops each once fired` | `exit 1`; expected the burn-away at round 2 but received round 1. `Tests  1 failed \| 4 skipped (5)` |
| `rewind_deletes_revisions` | Filtered void revisions out of session history, making post-target revisions disappear instead of remaining visibly void. | `rewind_deletes_revisions: restores the round boundary, voids later revisions, and derives a distinct branch stream` | `exit 1`; expected 8 retained history entries but received 5. `Tests  1 failed \| 4 skipped (5)` |
| `delay_applies_twice` | Left the delayed initiative order installed at the next round boundary instead of restoring and clearing the one-round snapshot. | `delay_applies_twice: repositions once, survives resume, and restores the original order next round` | `exit 1`; round 2 still began in the delayed order. `Tests  1 failed \| 4 skipped (5)` |
| `summary_drops_overrides` | Omitted `adjudicated` DM override/fiat events from the structured session record. | `summary_drops_overrides: totals a hand-computed fixture and retains the DM fiat ruling card` | `exit 1`; expected the named ruling card but received an empty list. `Tests  1 failed \| 4 skipped (5)` |

All four mutations were restored before the final gate.
