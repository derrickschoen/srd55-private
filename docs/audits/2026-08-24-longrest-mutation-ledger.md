# D373.7 Long Rest mutation ledger

Each mutation was applied alone to `src/vtt/party-session-state.ts`, run only
against its named killing test, and restored before the next mutation.

| Mutation | Temporary change | Killing test | Observed kill |
|---|---|---|---|
| `half_hit_dice_returned` | Restored only floor-half of total Hit Point Dice, minimum 1, instead of every spent die. | `half_hit_dice_returned: restores every spent Hit Point Die for odd totals` | `exit 1`; `Tests 1 failed \| 15 skipped (16)`; the five-die character received 2 dice instead of 5. |
| `exhaustion_cleared` | Set Exhaustion to 0 instead of subtracting exactly 1. | `exhaustion_cleared: reduces Exhaustion by exactly 1, including the 1-to-0 and 0 floor boundaries` | `exit 1`; `Tests 1 failed \| 15 skipped (16)`; levels `[0, 0, 0]` replaced expected `[0, 0, 4]`. |
| `dead_rises` | Allowed a Dead character through the completion-benefit branch. | `dead_rises: leaves a dead character untouched while a stabilized character wakes at full HP` | `exit 1`; `Tests 1 failed \| 15 skipped (16)`; the Dead character rose to 20 HP and also regained dice, slots, and resources. |

Restored verification: `Tests 16 passed (16)`. All three mutations were restored.

The Hit Point Dice control enforces D373.7 and SRD 5.2.1 RAW: all spent Hit
Point Dice return (`docs/srd/full/srd-5.2.1.txt:11915-11917`). The RAW-derived
Stable-at-0 eligibility path is recorded in
`docs/design/2026-08-24-long-rest-session-boundary.md`.
