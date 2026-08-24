# D366 beast-family mutation ledger

All controls were applied one at a time to `src/combat/statblocks/homebrew-beast-families.ts`, killed, and restored by the exact inverse edit before the next control.

| Mutation | Mutated behavior | Killing test/gate | Result |
|---|---|---|---|
| `signature_dropped_at_tier` | Removed `bear_hug` from the CR 2 ursine signature list. | `signature_dropped_at_tier: carries every named family signature with non-decreasing magnitude through all tiers` | `exit 1`; `Tests  1 failed | 8 passed (9)` |
| `dpr_out_of_band` | Raised the Brush Bear row's target DPR from 6 to 20 while retaining Wolf's declared 4–7 band. | `dpr_out_of_band: recomputes each row DPR and keeps AC, HP, and DPR inside the declared comparable bands` | `exit 1`; `Tests  1 failed | 8 passed (9)`; the named balance test reported `Brush Bear DPR band: expected 20 to be less than or equal to 7` |
| `homebrew_masquerades_as_srd` | Replaced the original-homebrew discriminant with `srd_5_2_1_decoded` and a SourceSpan. | `npx tsc -b --pretty false` plus the roster provenance type separation | `exit 1`; TypeScript reported `Type '"srd_5_2_1_decoded"' is not assignable to type '"original_homebrew"'` |
| `ladder_step_missing` | Removed one aquatic ladder element. | `ladder_step_missing: supplies every CR step exactly once for all six families, including both boundaries` | `exit 1`; `Tests  2 failed | 7 passed (9)`; the named completeness test reported 47 rows instead of 48 |

Restored targeted run: `Test Files  1 passed (1)` and `Tests  9 passed (9)`.

All four mutations were restored.
