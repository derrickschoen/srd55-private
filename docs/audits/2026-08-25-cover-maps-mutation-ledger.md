# Bundled cover maps mutation ledger — 2026-08-25

Each mutant was applied alone to production source, its changed source was
printed before the test run, the named test killed it with a nonzero exit, and the
original implementation was restored and rerun to `exit 0` before the next
mutation.

| Mutant | Applied fault | Named killing test | Kill evidence | Restoration evidence |
|---|---|---|---|---|
| `cover_no_bonus` | Changed both `half` and `three_quarters` branches of `coverDefenseBonus()` to return 0. | `cover_no_bonus: line-crossing cover grants its cited AC and Dexterity-save bonus` | `exit 1`; the 13 attack total became a hit rather than the expected miss; 1 failed, 8 skipped (9). | Restored +2/+5; named test passed, 8 skipped (9), `exit 0`. |
| `policy_ignores_cover` | Replaced the computed hostile firing-line cover rank with `const cover = 0`. | `policy_ignores_cover: $classId caster selects reachable cover after $spellId` | `exit 1`; Warlock, Cleric, and Wizard each selected open (3,4) rather than covered (3,5); 3 failed, 16 skipped (19). | Restored `coverTierBetweenObjects()` ranking; all 3 cases passed, 16 skipped (19), `exit 0`. |
| `cover_blocks_allies_only` | Forced cover tier `none` when the attack target was a monster while retaining cover for player targets. | `cover_blocks_allies_only: line-crossing cover protects monster and player targets symmetrically` | `exit 1`; the player attack hit the uncovered monster instead of missing; 1 failed, 8 skipped (9). | Restored faction-neutral `coverTierBetween()` resolution; named test passed, 8 skipped (9), `exit 0`. |

All three mutations were restored. The combined cover-focused baseline then
passed before the D375 gate.
