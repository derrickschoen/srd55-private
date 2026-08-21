# Party-pack v2 typed-effects mutation ledger

All controls ran with `npx vitest run tests/unit/vtt`, then the source mutation was restored.

| Control | Mutation | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `rider_never_fires` | Removed the `on_hit` arm from automatic damage-rider selection | `rider_never_fires makes an on_hit typed rider change the synthetic encounter outcome` | exit 1; 2 failed, 96 passed | exit 0; 98 passed |
| `pool_not_decremented` | Kept a limited pool's remaining count unchanged after use | `pool_not_decremented spends a rider pool and refuses the same hit when the pool is empty` | exit 1; 2 failed, 96 passed | exit 0; 98 passed |
| `passive_off_by_one` | Subtracted one from a present AC passive | `passive_off_by_one applies AC and save passives exactly at their success boundaries` | exit 1; 1 failed, 97 passed | exit 0; 98 passed |
| `out_of_union_accepted` | Removed the mandatory typed refusal for an unknown effect kind | `out_of_union_accepted refuses an unknown effect kind and names the unsupported shape` | exit 1; 1 failed, 97 passed | exit 0; 98 passed |
