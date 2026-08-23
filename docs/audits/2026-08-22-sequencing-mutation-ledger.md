# D343 sustained-effect sequencing mutation ledger

Each production mutation below was applied alone, killed by its named imported-pack test, and restored before the next mutation. No behavioral expectation was regenerated from production output. The restored focused suite reported `Test Files  1 passed (1)` and `Tests  9 passed (9)`.

| Mutation | Production change | Named killing test | Observed kill | Restoration |
|---|---|---|---|---|
| `bound_effect_retargets` | Removed the comparison between an activation's object targets and the sustained effect's cast-bound object set. | `bound_effect_retargets and explicit_action_type_normalized: Heat Metal keeps its original object, rejects a different object with a typed code, and spends only its Bonus Action` | exit 1; the different object activated instead of producing `bound_target_mismatch`. | Bound object identities are again compared before action spending. |
| `activation_free` | Removed the sustained activation's `spendCost` call. | `activation_free: an available Magic action activates, but an exactly-spent action refuses without dealing damage` | exit 1; the exactly-spent actor activated without throwing. | Every activation again spends its declared action type before operation execution. |
| `effect_end_leaves_activation` | Excluded sustained effects from concentration termination. | `effect_end_leaves_activation: ending concentration removes the ordinary lifecycle effect and refuses its pending activation` | exit 1; the sustained effect remained in state after concentration ended. | Concentration termination again removes all effects owned by that concentration, including sustained activations. |
| `explicit_action_type_normalized` | Rewrote an explicit Bonus Action activation to spend an action. | `bound_effect_retargets and explicit_action_type_normalized: Heat Metal keeps its original object, rejects a different object with a typed code, and spends only its Bonus Action` | exit 1; the action was spent while the Bonus Action remained available. | Only `magic_action` maps to action; explicit Bonus Action and Reaction values remain unchanged. |
| `sustained_duration_off_by_one` | Prevented sustained-effect clocks from decrementing at their declared source boundary. | `produce-flame shape and sustained_duration_off_by_one: same-turn and post-expiry activation refuse, while first and final later rounds retarget and spend Magic actions` | exit 1; activation remained usable after the final declared round. | Sustained effects again use the ordinary one-per-matching-boundary effect-clock decrement. |

## Boundary and distinguishing-input coverage

- Duration checks cover the unavailable cast turn, first later turn, final later turn, and first post-expiry turn. The production off-by-one above was applied and killed.
- Magic-action and Bonus Action resources each cover exactly available and exactly spent states.
- Produce Flame activates against different combatants on successive turns; Heat Metal submits two distinct object-ID sets, one bound and one foreign.
- Vague phrasing consumes the action resource through `magic_action`; the explicit Heat Metal record consumes the Bonus Action while leaving the action available.
- Concentration termination removes the lifecycle effect itself, so no parallel activation registry can outlive it.
