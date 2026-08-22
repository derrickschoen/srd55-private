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
