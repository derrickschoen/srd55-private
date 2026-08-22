# D333.1 composition mutation ledger

Each production mutation below was applied alone, killed by its named imported-pack test, and restored before the next mutation. The restored focused suite reported `Test Files  1 passed (1)` and `Tests  18 passed (18)`.

| Mutation | Production change | Named killing test | Observed kill | Restoration |
|---|---|---|---|---|
| `composition_order_ignored` | Returned declaration indices for an explicitly ordered composition. | `composition_order_ignored and state_not_visible_between_steps: explicit opposite orders produce six versus three damage` | exit 1; reverse order dealt 6 instead of 3 damage. | Explicit zero-based permutation restored. |
| `inner_refusal_swallowed` | Continued past every refused result without applying the composition's declared propagation. | `inner_refusal_swallowed: the same immune step atomically aborts or continues according to the pack` | exit 1; the abort arm dealt 4 instead of rolling back to 0 damage. | Declared abort/continue handling restored. |
| `state_not_visible_between_steps` | Reset reducer state to the composition-start snapshot before every step. | `composition_order_ignored and state_not_visible_between_steps: explicit opposite orders produce six versus three damage` | exit 1; vulnerability was invisible to the following damage step, which dealt 3 instead of 6. | Live prior-step state restored. |
| `depth_limit_off_by_one` | Refused only beyond `MAX_COMPOSITION_DEPTH + 1`. | `depth_limit_off_by_one: depth four loads and depth five has a typed import refusal` | exit 1; depth 5 loaded. | Refusal beyond `MAX_COMPOSITION_DEPTH` restored. |
| `targets_not_reresolved` | The caster selector returned the enclosing inherited targets. | `targets_not_reresolved: inherited and caster re-resolution damage observably different target sets` | exit 1; the target took 3 damage and the caster took 0. | Caster target re-resolution restored. |
| `zero_suboperation_accepted` | Changed the minimum step-count guard from `< 1` to `< 0`. | `composition_boundaries: one step and explicit index zero load while zero steps and index negative one refuse` | exit 1; a zero-step composition loaded. | One-step minimum restored. |
| `explicit_order_negative_index_accepted` | Lowered the minimum explicit index from `0` to `-1`. | `composition_boundaries: one step and explicit index zero load while zero steps and index negative one refuse` | exit 1; index -1 loaded. | Zero lower bound restored. |
| `explicit_order_past_end_accepted` | Changed the upper index check from `< steps.length` to `<= steps.length`. | `composition_boundaries: one step and explicit index zero load while zero steps and index negative one refuse` | exit 1; index `steps.length` loaded. | Exclusive upper bound restored. |
| `depth_limit_rejects_exact_maximum` | Changed the depth refusal comparison from `>` to `>=`. | `depth_limit_off_by_one: depth four loads and depth five has a typed import refusal` | exit 1; depth 4 was refused. | Inclusive accepted maximum restored. |

All nine mutations were proved present one at a time. No expectation was regenerated from production output.
