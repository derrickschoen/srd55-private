# D356 / D368.3 detection mutation ledger

Each production mutation was applied alone, killed by the named test, and
restored with the exact inverse edit before the next mutation. No assertion or
fixture was changed while a mutation was active.

| Mutation | Production change applied alone | Killing test | Observed result |
|---|---|---|---|
| `hidden_still_provokes` | Removed the `canCombatantSee` guard from the movement-created Opportunity Attack window. | `hidden_still_provokes: a Hidden mover does not provoke because the reactor cannot see it` | `exit 1`; `Tests  1 failed \| 12 skipped (13)`; an ask decision was queued for the Hidden mover. |
| `stealth_dc_off_by_one` | Changed the 2024 failure comparison from `total < 15` to `total < 14`. | `stealth_dc_off_by_one: 2024 Hide succeeds at exactly 15 and fails at 14` | `exit 1`; `Tests  1 failed \| 12 skipped (13)`; a total of 14 produced `hidden`. |
| `always_policy_silent` | Removed the `reaction_policy_auto_resolved` event emitted by the `always` policy while retaining the attack. | `always_policy_silent: always and never auto-resolve with explicit records` | `exit 1`; `Tests  1 failed \| 12 skipped (13)`; the attack fired without the required auto-fired record. |
| `darkvision_unbounded` | Removed the distance comparison from the Darkvision predicate. | `darkvision_unbounded: darkvision sees a creature at its range edge but not one cell beyond` | `exit 1`; `Tests  1 failed \| 7 skipped (8)`; the creature one cell beyond range remained visible. |
| `advance_past_pending` | Removed the unresolved-boundary decision guard from `end_turn`. | `advance_past_pending: an unresolved ask decision blocks its turn boundary until explicitly resolved` | `exit 1`; `Tests  1 failed \| 12 skipped (13)`; `end_turn` did not throw. |

Restored focused run before mutation testing: `Test Files  2 passed (2)` and
`Tests  21 passed (21)`. All five mutations were restored.
