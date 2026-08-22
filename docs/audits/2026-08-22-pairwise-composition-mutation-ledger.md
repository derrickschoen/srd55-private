# D335 pairwise composition mutation ledger

Every production mutation below was applied alone, killed by its named imported-pack test, and restored before the next mutation. No expectation was regenerated from production output. The restored focused suite reported `Test Files  1 passed (1)` and `Tests  46 passed (46)`.

| Mutation | Production change | Named killing test | Observed kill | Restoration |
|---|---|---|---|---|
| `save_success_treated_as_refusal` | Counted a target's successful initial save as refused instead of applied. | `save_success_treated_as_refusal: successful initial save is applied and preserves prior damage under abort` | exit 1; Hit Points were 20 instead of 17. | The completed save again reports `applied`. |
| `abort_leaks_rng` | Skipped restoration of the composition-start RNG checkpoint on abort. | `abort_leaks_rng: an aborted rolled pair restores the seeded stream before every subsequent draw` | exit 1; serialized RNG states differed before the subsequent-roll comparison. | Composition abort again restores the serialized RNG checkpoint in place. |
| `outcome_inferred_from_delta` | Recomputed a returned step outcome by comparing canonical semantic state before and after execution. | `outcome_inferred_from_delta: no_op and refused remain observably distinct while continue reaches slot two` | exit 1; the zero-damage `no_op` was emitted as `refused`. | The executor again consumes the outcome returned by the operation arm directly. |
| `nested_composition_accepted` | Bypassed the pre-schema nested-composition refusal. | `nested_composition_accepted: imported nesting has a typed refusal before schema parsing` | exit 1; the result degraded from `nested_composition` to `malformed_record`. | The typed pre-schema nesting refusal was restored. |
| `refusal_propagation_ignored` | Made `continue` take the same rollback-and-return path as `abort`. | `refusal_propagation_ignored: the same refused second slot atomically aborts or continues according to the pack` | exit 1; the continue arm restored Hit Points to 20 instead of retaining 17. | Propagation again branches on the pack's declaration. |
| `composition_order_ignored` | Returned declaration order for an explicitly reversed pair. | `composition_order_ignored and state_not_visible_between_steps: opposite orders deal six versus three damage` | exit 1; the reverse arm dealt 6 instead of 3 damage. | The explicit two-slot permutation was restored. |
| `state_not_visible_between_steps` | Reset reducer state to the pair-start snapshot before slot two. | `composition_order_ignored and state_not_visible_between_steps: opposite orders deal six versus three damage` | exit 1; vulnerability was invisible and the forward arm dealt 3 instead of 6 damage. | Live prior-slot state was restored. |
| `targets_not_reresolved` | Returned inherited targets for the caster selector. | `targets_not_reresolved: inherited and caster selectors damage observably different target sets` | exit 1; both operations damaged the target, producing `[20, 15]` instead of `[18, 17]`. | Caster re-resolution was restored. |
| `single_step_accepted` | Changed the exact pair guard from `length !== 2` to `length > 2`. | `pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse` | exit 1; the one-step pack loaded. | Exact length two was restored. |
| `third_step_accepted` | Changed the exact pair guard from `length !== 2` to `length < 2`. | `pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse` | exit 1; the three-step pack loaded. | Exact length two was restored. |
| `explicit_order_negative_index_accepted` | Admitted the off-by-one permutation `[-1, 0]`. | `pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse` | exit 1; the negative-index pack loaded. | Only `[0, 1]` and `[1, 0]` are accepted again. |
| `explicit_order_past_end_accepted` | Admitted the off-by-one permutation `[0, 2]`. | `pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse` | exit 1; the past-end pack loaded. | Only `[0, 1]` and `[1, 0]` are accepted again. |

## Boundary and distinguishing-input coverage

- Pair count: the accepted edge is exactly 2; both adjacent values 1 and 3 are refused and each off-by-one was applied and killed.
- Explicit indices: the accepted closed set is 0 and 1 in the two valid permutations; adjacent values -1 and 2 are refused and each off-by-one was applied and killed.
- Order was already distinguishable: vulnerability before damage deals 6, while damage before vulnerability deals 3.
- Propagation was already distinguishable: an immune condition after 3 damage restores the damage under `abort` and retains it under `continue`.
- Visibility was already distinguishable: the damage slot sees or does not see the preceding vulnerability.
- Targeting was already distinguishable: inherited targeting damages the selected target, while `re_resolve/caster` damages the caster.

The type-level nesting exclusion is compiled by construction: `CompositionStep.operation` is `NonCompositionSpellOperation`, whose recursive branch fields also use `NonCompositionSpellOperation`. The import-path test supplies untyped external data because an in-process nested value cannot inhabit that TypeScript type without an explicitly forbidden suppression or unsafe escape.
