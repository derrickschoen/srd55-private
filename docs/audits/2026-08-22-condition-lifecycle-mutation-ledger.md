# Condition lifecycle mutation ledger

Capability: `CAP-IMP-010`. Each production mutation below was applied alone,
killed by its named imported-content-pack test, and restored before the next
mutation. Every mutant command exited 1. After restoration, `npx tsc -b` exited
0 and the focused lifecycle suite reported `Tests  12 passed (12)`.

| Mutation | Temporary production change | Named killing test | Mutant result |
|---|---|---|---|
| `save_dc_equal_fails` | `resolveSavingThrow` classified `total === dc` as failure. | `save_dc_boundary: a result exactly at the DC refuses application while one below applies it` | exit 1 |
| `repeat_save_first_round_delayed` | The turn hook skipped a repeated save while a two-round clock still had 2 remaining. | `repeat_save_on_success_persists: repeats on the first and final round and honors both success scopes` | exit 1 |
| `repeat_save_final_round_dropped` | The turn hook ran repeated saves only while more than one round remained. | `repeat_save_on_success_persists: repeats on the first and final round and honors both success scopes` | exit 1 |
| `damage_break_threshold_two` | Damage-break required 2 damage instead of the declared minimum 1. | `damage_break_ignores_region: movement-region damage at exactly zero preserves and exactly one breaks the effect` | exit 1 |
| `immunity_reported_as_save` | Immunity emitted a successful DC 1 save instead of `condition_application_refused`. | `immunity_reported_as_save: an immune target emits a refusal without drawing or reporting a save` | exit 1 |
| `damage_break_ignores_region` | Movement-region damage applied HP loss while bypassing the centralized lifecycle break. | `damage_break_ignores_region: movement-region damage at exactly zero preserves and exactly one breaks the effect` | exit 1 |
| `repeat_save_on_success_persists` | A successful repeated save was recorded but could not remove or end its effect. | `repeat_save_on_success_persists: repeats on the first and final round and honors both success scopes` | exit 1 |
| `duration_off_by_one` | A zero-remaining effect survived until the following declared boundary. | `duration_off_by_one: exactly one round expires on its first declared boundary` | exit 1 |
| `stacking_silently_replaces` | The declared `coexist` policy was interpreted as `replace_any_source`. | `stacking_silently_replaces: imported coexist and replace policies differ across sources` | exit 1 |

Boundary evidence:

- repeated save: the first and final boundaries of a two-round duration were
  separately mutated and killed;
- fixed duration: exactly one round was mutated to survive one boundary late;
- damage break: zero remains non-damage while exactly one was mutated not to
  break;
- save DC: equality was mutated from success to failure while one below
  remained failure.

All source mutations were restored. The final full-gate counts are recorded in
the supervising task handoff rather than copied into this pre-gate ledger.

## Round 2 — supervisor-found

The supervisor deleted the cross-keyed-immunity branch and the original gate
remained green (`Test Files 37 passed (37)`, `Tests 1719 passed (1719)`). The
existing immunity test used `Frightened` for both the applied condition and the
immunity key, so the surviving first branch masked the deletion.

The audit found the same distinguishing-input gap in every requested branch
family, so coverage was added rather than credited to the earlier tests:

- `repeatedSave.onSuccess`: the earlier test distinguished event names on a
  single-target effect, where removing the only target and ending the effect
  leave equivalent state. The new multi-target test proves that
  `remove_target` preserves the other target while `end_effect` removes both.
- `damageBreak.sources`: the earlier restrictive-scope test used outsider
  damage, but the `any` test used movement-region damage in a separate setup.
  The new comparison sends the same non-source, non-ally damage through both
  scopes and proves opposite outcomes.
- stacking `sources`: replacement previously compared `coexist` with
  `any_source`, and duration extension covered only a repeated same-source
  casting. New comparisons vary different casters across `same_source` and
  `any_source` for both replacement and duration extension.

Each production mutation below was applied alone, killed by its named test,
and restored before the next mutation. Every focused mutant command exited 1.

| Mutation | Temporary production change | Named killing test | Mutant result |
|---|---|---|---|
| `cross_keyed_immunity_branch_deleted` | Applied the supervisor's exact mutation: deleted the second `blockingImmunity` branch, leaving `: null`. | `cross_keyed_immunity: applied-condition, keyed-immunity, and unblocked targets emit distinct outcomes` | exit 1 |
| `repeat_save_end_effect_as_remove_target` | Made the `end_effect` success branch unreachable, so both variants removed only the saving target. | `repeat_save_success_scope: remove-target preserves a second target while end-effect removes both` | exit 1 |
| `damage_any_scope_as_restrictive` | Made the `sources === 'any'` branch return false for outsider damage. | `damage_source_scope_comparison: outsider damage breaks any-source but not source-or-allies` | exit 1 |
| `replace_any_source_as_same_source` | Mapped every replace operation to `replace_same_source`. | `stacking_source_scope: different sources coexist for same-source and replace for any-source` | exit 1 |
| `extend_any_source_as_same_source` | Removed the `any_source` alternative when finding an effect to extend. | `extend_duration_source_scope: different sources coexist for same-source and extend for any-source` | exit 1 |

All round-2 source mutations were restored. The focused lifecycle suite then
reported `Tests  17 passed (17)` before the final gates.
