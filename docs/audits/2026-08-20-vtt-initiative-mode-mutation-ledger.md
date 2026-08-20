# VTT initiative-mode mutation ledger

| Mutation | Temporary change | Named killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `shared_block_splits` | Expanded the enemy block into separately ranked monster slots, allowing a PC activation to interleave. | `shared_block_splits keeps every enemy activation in one initiative slot` in `tests/unit/combat/initiative-modes.test.ts` | Killed, exit 1: enemy indexes became `[1, 2, 4]` instead of contiguous `[1, 2, 3]`. | Shared slot construction restored; authorized gate green. |
| `block_order_nondeterministic` | Chose ascending or descending within-block order from an extra RNG draw. | `block_order_nondeterministic keeps within-block ordering stable across replay seeds` in `tests/unit/combat/initiative-modes.test.ts` | Killed, exit 1: the same enemy block reversed across replay seeds. | Bonus-descending/id-ascending ordering restored; authorized gate green. |
| `mode_not_serialized` | Serialized the historical `per_combatant` fallback instead of the encounter's `shared_enemy` configuration. | `mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant` in `tests/unit/vtt/replay.test.ts` | Killed, exit 1: replay diverged at `encounterConfig.initiativeMode`. | Exact encounter configuration serialization restored; authorized gate green. |
