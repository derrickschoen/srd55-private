# D391 mutation equivalence ledger

| Module | Mutant | One-line proof |
|---|---:|---|
| `src/vtt/session-record.ts` | 6497 | Removing the final switch arm's `break` cannot change control flow because no statement follows the switch and every event iteration proceeds directly to the loop boundary. |
| `src/vtt/stable-dom-render.ts` | 6567 | For every name returned by `getAttributeNames()` (or by keys of the coherent Map fallback), `getAttribute(name)` is non-null, so replacing its non-null guard with `true` cannot change the written attribute value. |
| `src/vtt/stable-dom-render.ts` | 6674 | In the error branch, an unkeyed interactive child stops the loop immediately, while a keyed child can be unstable only below an already-unkeyed ancestor that stops the loop before `root`, so replacing `unkeyed !== root` with `true` cannot change the reported ancestor. |
| `src/vtt/stable-dom-render.ts` | 6720 | The mutant only adds `syncElement(node, node)` for a new or tag-replaced node; attribute, text, child reconciliation, and mutable-state synchronization against the same object are all identity operations. |
| `src/vtt/survival-policy.ts` | 7077 | A selected casting guarantees a living target whose valid nonnegative HP gives `maximum - current >= average`; that target also satisfies `maximum + current >= average`, and every extra target admitted only by `+` has a smaller real deficit, so the unchanged deficit sort selects the same target. |

The `shouldSpendHitDie` `>=`/`>` boundary mutant (6907) is not ledgered: the exported function accepts finite numeric deficits and modifiers, so `missingHitPoints: 6.5`, `sides: 8`, `constitutionModifier: 2` observably distinguishes `true` from `false`.
