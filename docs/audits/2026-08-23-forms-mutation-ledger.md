# D348.1 form and stat replacement mutation ledger

Each production mutation below was applied alone against a green focused baseline. Its named test
was run, the observed nonzero result was recorded, and production was restored and re-run before the
next mutation. The restored focused file finished with `Tests  8 passed (8)`.

## Form model and source basis

- `EncounterCombatantState.form` owns a distinct form-HP pool, its maximum, the original profile,
  the replacement action list, equipment disposition, casting restriction, and lifecycle effect id.
  Original HP remains in `EncounterCombatantState.hitPoints`; it is neither overwritten nor reduced
  until damage exceeds the form pool.
- Polymorph replaces game statistics while retaining alignment, personality, creature type, Hit
  Points, and Hit Point Dice (`docs/srd/source/spell-descriptions.txt:5952-5959`). Its form Temporary
  Hit Points end the spell when depleted (`docs/srd/source/spell-descriptions.txt:5958-5963`), and
  leftover damage carries to actual Hit Points (`docs/srd/full/srd-5.2.1.txt:1126-1131`).
- Form anatomy limits actions and prevents casting (`docs/srd/source/spell-descriptions.txt:5965-5967`).
  The imported form's action declarations are retained on the form state and reducer-validated before
  an attack is accepted.
- Polymorph gear melds and cannot be used or benefited from
  (`docs/srd/source/spell-descriptions.txt:5971-5973`). The operation also has an explicit
  `dropped_at_origin` disposition for authored forms; no implicit equipment choice exists.
- `true-polymorph-permanence-not-modelled` and `object-to-creature-not-modelled` are record-isolated
  named refusals. The measured traces did not establish either shape for this reversible creature-form
  operation.

## Restored mutations

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `carryover_lost` | Replaced the computed excess past depleted form HP with zero. | `carryover_lost and carryover_boundary_exact_vs_one_over: exactly the remaining form HP reverts without original damage; one over carries exactly one` | exit 1; the one-over case retained 20 original HP instead of 19 |
| `revert_keeps_form_stats` | Cleared form state on effect end without restoring the saved original profile. | `original_hp_touched_in_form and revert_keeps_form_stats: partial form damage drains only the form pool and effect-end reversion differs from zero-HP reversion` | exit 1; reversion retained form AC 12 and Speed 40 instead of original AC 14 and Speed 30 |
| `original_hp_touched_in_form` | Subtracted incoming form damage directly from original HP while also reducing the form pool. | `original_hp_touched_in_form and revert_keeps_form_stats: partial form damage drains only the form pool and effect-end reversion differs from zero-HP reversion` | exit 1; four form damage reduced original HP from 20 to 16 |
| `unknown_form_id_transforms` | Disabled the post-monster-load missing-form lookup so an absent statblock reference loaded. | `unknown_form_id_transforms: rejects only the missing-id form record and loads the rest of the pack` | exit 1; `missing-form` loaded beside the healthy spell instead of producing `missing_form_reference` |

## Independent boundary mutation

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `carryover_one_short_boundary` | Subtracted one from computed carryover after form depletion. | `carryover_lost and carryover_boundary_exact_vs_one_over: exactly the remaining form HP reverts without original damage; one over carries exactly one` | exit 1; the exactly-at case still reverted cleanly, while the one-over case retained 20 original HP instead of 19 |

All four required controls and the independent boundary mutation were restored. No test, assertion,
fixture expectation, or import diagnostic was weakened or regenerated from mutated output.
