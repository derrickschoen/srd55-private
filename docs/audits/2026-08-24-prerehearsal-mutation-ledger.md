# D377.7-D377.9 prerehearsal mutation ledger

Each mutation was applied alone, run only against its named killing test, and
restored before the next mutation.

| Mutation | Temporary defect | Named killing test | Observed result |
|---|---|---|---|
| `revivify_window_off_by_one` | Allowed the next initiative boundary after the exact ten-round limit. | `revivify_window_off_by_one: refuses the next initiative boundary after exactly one minute with the cited typed refusal` | `exit 1`; the cast did not throw. Tests: 1 failed, 129 skipped (130). |
| `revivify_full_hp` | Returned the target at its 47 HP maximum instead of the spell's 1 HP. | `revivify_full_hp: Revivify returns the target at exactly 1 HP` | `exit 1`; received 47 HP instead of 1 at both tested in-window boundaries. Tests: 2 failed, 128 skipped (130). |
| `autosave_prunes_named` | Applied autosave retention to named and file saves as well as autosaves. | `autosave_prunes_named: named and file saves survive 25 autosaves` | `exit 1`; both permanent saves were absent. Tests: 1 failed, 8 skipped (9). |
| `partial_applies_all` | Applied every Long Rest benefit regardless of the DM checklist. | `partial_applies_all: partial_per_dm applies exactly the checked benefits` | `exit 1`; unchecked Hit Point Dice, spell slots, and Exhaustion changed. Tests: 1 failed, 20 skipped (21). |

All four mutations were restored. Restored focused verification:
`Tests 161 passed (161)`.
