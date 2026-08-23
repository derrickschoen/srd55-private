# D348.1 target-selection binding mutation ledger

Each production mutation below was applied alone after the four-command gate was green. Its named
test was run, the observed nonzero exit was recorded, and production code was restored before the
next mutation. The restored focused file finished with `Tests  9 passed (9)`.

## Selection and source basis

- `fixed`, `up_to`, and slot-scaled `exact`/`up_to` count declarations operate on the one outer target
  set inherited by every operation in a record.
- `secondaries_within_primary`, `pair_within`, and `all_within_each_other` are closed geometric
  declarations. Chain Lightning establishes the primary/secondary 30-foot and uniqueness rules at
  `docs/srd/source/spell-descriptions.txt:1008-1016`.
- `projectile_allocation` retains every controller-supplied target entry and resolves it per projectile.
  Magic Missile establishes three per-dart resolutions and one additional dart per higher slot at
  `docs/srd/source/spell-descriptions.txt:5041-5047`.
- The slot-scaled up-to shape is independently present in Bless at
  `docs/srd/source/spell-descriptions.txt:836-840`.
- Acid Splash's requested pair rule is a retained 2014 private-corpus trace. The bundled 2024 SRD
  instead defines an area at `docs/srd/source/spell-descriptions.txt:37-48`; the test names the 2014
  shape so the two editions are not conflated.

## Restored mutations

| Mutation | Production change applied alone | Killing test | Result |
|---|---|---|---|
| `secondary_range_unchecked` | `secondaries_within_primary` accepted every secondary without comparing its grid distance to the primary. | `secondary_range_unchecked: Chain Lightning accepts a secondary exactly 30 feet from the primary and refuses one 35 feet away` | exit 1; the 35-foot secondary was accepted and the expected typed refusal was absent |
| `allocation_count_drifts` | Projectile allocation admitted the exact slot-scaled count plus one. | `allocation_count_drifts and distinguishing_allocation_vs_up_to: Magic Missile allocates exactly 3+slot darts and resolves doubled targets per dart` | exit 1; the fourth level-1 dart was accepted and the expected typed refusal was absent |
| `uniqueness_ignored` | The `unique` declaration skipped its duplicate-target comparison. | `uniqueness_ignored: unique and repeatable declarations distinguish the same doubled target` | exit 1; the unique record accepted the doubled target |
| `upcast_scales_inner_sets` | The second composition sibling inherited only the base target instead of the one outer upcast target set. | `upcast_scales_inner_sets: one slot-scaled outer target set is inherited by both sibling operations` | exit 1; the second upcast target ended at 19 HP instead of 18 |
| `pair_boundary_excludes_exact` | `pair_within` changed its distance comparison from `>` to `>=`. | `acid_pair_boundary: one target and a pair exactly 5 feet apart are legal, while a pair 10 feet apart refuses` | exit 1; the exactly-5-foot pair received `pair_range` |

All five mutations were restored. No test, assertion, fixture expectation, or import diagnostic was
weakened or regenerated from mutated output.
