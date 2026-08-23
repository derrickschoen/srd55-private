# CAP-IMP-007 choice and branch mutation ledger

SRD 5.2.1 anchors used by this increment:

- Chromatic Orb — `docs/srd/source/spell-descriptions.txt:1087-1090`, “Choose Acid, Cold, Fire, Lightning, Poison, or Thunder”.
- Command — `docs/srd/source/spell-descriptions.txt:1218-1228`, “Choose the command from these options”.
- Confusion — `docs/srd/source/spell-descriptions.txt:1369-1375`, “roll 1d10 at the start of each of its turns”.
- Hold Person — `docs/srd/source/spell-descriptions.txt:4348-4353`, “Choose a Humanoid”.
- Prismatic Spray — `docs/srd/source/spell-descriptions.txt:6067-6076`, “For each target, roll 1d8”.

Each production mutation below was applied alone, killed by its named test, and restored before the next mutation. The restored focused gate ended with `Test Files  1 passed (1)` and `Tests  8 passed (8)`.

| Mutation | Production change | Named killing test | Mutated result |
|---|---|---|---|
| `branch_table_gap_ignored` | Accepted a random table without checking that its covered-face count equals the die size. | `branch_table_gap_ignored refuses both a gap and an overlap instead of loading either table` | exit 1; 1 failed, 6 skipped; the gapped table loaded. |
| `invalid_mode_defaults` | Fell back to the first declared mode when no mode matched the cast command. | `caster_choice_boundaries: executes the first and last declared modes and invalid_mode_defaults refuses an undeclared mode` | exit 1; 1 failed, 6 skipped; the invalid mode did not throw. |
| `branch_rerolled_from_fresh_rng` | Replaced `context.rng` with `Math.random` for branch rolls. | `branch_rerolled_from_fresh_rng: identical seeds produce byte-identical re-evaluated event streams` | exit 1; 1 failed, 6 skipped; 20 same-seed replays produced 8 distinct streams. |
| `branch_fixed_at_cast` | Rolled a nested random branch once while scheduling and stored that one leaf for every later hook. | `branch_fixed_at_cast: re-rolls the branch on its first and final declared rounds` | exit 1; 1 failed, 6 skipped; both rounds dealt the same fixed branch amount. |
| `caster_mode_first_skipped` | Searched declared modes starting at index 1. | `caster_choice_boundaries: executes the first and last declared modes and invalid_mode_defaults refuses an undeclared mode` | exit 1; 1 failed, 6 skipped; the first mode was refused. |
| `caster_mode_last_skipped` | Searched declared modes with the final entry removed. | `caster_choice_boundaries: executes the first and last declared modes and invalid_mode_defaults refuses an undeclared mode` | exit 1; 1 failed, 6 skipped; the last mode was refused. |
| `random_branch_lower_bound_exclusive` | Changed `roll >= minimum` to `roll > minimum`. | `random_branch_low_face_boundary: selects the first range at face 1` | exit 1; 1 failed, 7 skipped; face 1 found no branch. |
| `random_branch_upper_bound_exclusive` | Changed `roll <= maximum` to `roll < maximum`. | `random_branch_high_face_boundary: selects the last range at the highest face` | exit 1; 1 failed, 7 skipped; face 4 found no branch. |
| `reevaluated_first_hook_delayed` | Swapped `target_start` and `target_end` while scheduling. | `same_hook_order: persistent-area start hooks run before re-evaluated branches and condition removal` | exit 1; 1 failed, 7 skipped; the first declared start hook did not run. |
| `reevaluated_final_round_dropped` | Decremented remaining rounds by 2 instead of 1. | `branch_fixed_at_cast: re-rolls the branch on its first and final declared rounds` | exit 1; 1 failed, 7 skipped; the schedule disappeared after its first round. |
| `target_predicate_inverted` | Changed creature-type equality to inequality. | `target_choice_branch: imported Humanoid metadata selects its branch and an unmatched target does nothing` | exit 1; 1 failed, 7 skipped; the Humanoid branch did not execute. |
