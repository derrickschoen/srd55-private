# D377.5 flagship encounter mutation ledger

Each mutation below is applied alone after the focused Vane Warren tests are
green. The named test must fail with a nonzero exit, then the exact inverse edit
restores production before the next mutation.

| Mutation | Production defect applied | Named killing test | Observed kill |
|---|---|---|---|
| `alarm_double_wave` | Removed the pending-status guard from due-wave selection, so an already deployed first wave deployed again on the repeated round-2 advancement. | `alarm_double_wave: deploys each fight-local alarm wave once on its listed subsequent round` | `exit 1`; `Tests  1 failed \| 6 skipped (7)`; the repeated round-2 call produced 14 deployed roster ids instead of retaining 10. |
| `ratio_drift` | Removed one standing Cinder Rite Goblin Warrior while leaving the recorded structural target unchanged. | `ratio_drift: derives 3.5x, 2.0x, and 1.5x from each fight roster instead of a copied expectation` | `exit 1`; `Tests  1 failed \| 6 skipped (7)`; the derived numerator fell from 14 to 13 and the ratio from 3.5 to 3.25. |
| `legendary_pool_wrong` | Instantiated Marshal Kett with two Legendary Action uses instead of three. | `legendary_pool_wrong: gives the warlord three landed windows and one Legendary Resistance` | `exit 1`; `Tests  1 failed \| 6 skipped (7)`; both maximum and remaining uses were 2 instead of 3. |
| `ignition_skipped` | Returned the persistent-area list unchanged from brazier ignition, never adding the adjacent cell to `burningCells`. | `ignition_skipped: brazier adjacency converts Grease to burning and its next start deals cited 2d4 Fire damage` | `exit 1`; `Tests  1 failed \| 6 skipped (7)`; the Grease area's burning-cell list remained empty. |

All four mutations were restored. No test, assertion, fixture expectation, or
documentation ratio was weakened or regenerated from mutated output.
