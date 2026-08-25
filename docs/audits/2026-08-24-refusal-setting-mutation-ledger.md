# D377.10 refusal-setting mutation ledger

Each production mutation was applied alone, killed by the named focused test, and restored with the exact inverse edit before the next mutation. No test or assertion changed while a mutation was active.

| Mutation | Production change applied alone | Killing test | Observed result |
|---|---|---|---|
| `category_ignores_setting` | Forced `routeActionRefusal` to hard-refuse without reading the selected per-category setting. | `category_ignores_setting: %s routes to its selected hard-refusal and tray behaviors` | `exit 1`; `Tests  3 failed \| 6 skipped (9)`; all three categories returned `hard_refusal` instead of `fiat_prompt`. |
| `boundary_swallowed` | Routed `turn_boundary_blocked` through the validation category before projecting the existing boundary refusal. | `boundary_swallowed: a turn-boundary refusal remains outside category routing` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; an adjudication prompt appeared for the boundary refusal. |
| `default_unlogged` | Removed the documented assumed-resolution sentence from the `default_and_log` ruling reason while retaining its typed no-effect outcome. | `default_unlogged: default_and_log emits the visible assumed-X ruling entry` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; the ruling event no longer contained `Assumed the action has no mechanical effect`. |
| `setting_not_persisted` | Appended the prior party state instead of the updated refusal settings in `updateRefusalHandling`. | `setting_not_persisted: per-category settings survive host resume` | `exit 1`; `Tests  1 failed \| 8 skipped (9)`; both changed categories resumed as `refuse_with_citation`. |

Restored focused run: `Test Files  3 passed (3)` and `Tests  26 passed (26)`.
All four mutations were restored.
