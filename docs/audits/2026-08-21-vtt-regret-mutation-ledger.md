# VTT regret oracle mutation ledger

| Mutation | Applied change | Named killing test | Mutated exit | Restored exit |
|---|---|---|---:|---:|
| `comparator_hp_before_win` | Swapped the outcome and HP comparisons, allowing a surviving non-winner with more HP to outrank a win. | `comparator_hp_before_win keeps outcome ahead of HP and HP ahead of resources` — expected `> 0`, received `-998`. | 1 | 0 |
| `rollout_rng_shared` | Reused one RNG stream between candidate branches, making a repeated branch depend on the intervening candidate. | `rollout_rng_shared keeps a repeated rollout byte-identical and independent of candidate evaluation order` — repeated final-state hashes differed. | 1 | 0 |
| `collapse_ignores_movement_order` | Sorted every priority action set, including movement-sensitive programs. | `collapse_ignores_movement_order collapses action-order equivalents but preserves movement-sensitive order` — expected three representatives, received two. | 1 | 0 |

Each mutation was applied and inspected, killed by its named test, then restored. The restored four-test oracle file exited 0.
