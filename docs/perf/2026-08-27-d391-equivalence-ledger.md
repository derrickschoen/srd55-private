# D391 mutation equivalence ledger

| Module | Mutant | One-line proof |
|---|---:|---|
| `src/vtt/session-record.ts` | 6497 | Removing the final switch arm's `break` cannot change control flow because no statement follows the switch and every event iteration proceeds directly to the loop boundary. |
| `src/vtt/stable-dom-render.ts` | 6567 | For every name returned by `getAttributeNames()` (or by keys of the coherent Map fallback), `getAttribute(name)` is non-null, so replacing its non-null guard with `true` cannot change the written attribute value. |
| `src/vtt/stable-dom-render.ts` | 6674 | In the error branch, an unkeyed interactive child stops the loop immediately, while a keyed child can be unstable only below an already-unkeyed ancestor that stops the loop before `root`, so replacing `unkeyed !== root` with `true` cannot change the reported ancestor. |
| `src/vtt/stable-dom-render.ts` | 6720 | The mutant only adds `syncElement(node, node)` for a new or tag-replaced node; attribute, text, child reconciliation, and mutable-state synchronization against the same object are all identity operations. |
| `src/vtt/survival-policy.ts` | 7077 | A selected casting guarantees a living target whose valid nonnegative HP gives `maximum - current >= average`; that target also satisfies `maximum + current >= average`, and every extra target admitted only by `+` has a smaller real deficit, so the unchanged deficit sort selects the same target. |
| `src/combat/controllers.ts` | 16 | While an abort listener is attached, `choose()` forbids replacing its pending request and both resolution paths clear it, so the pending request is either the captured request or absent and forcing the mismatch guard false cannot change the exported result. |
| `src/combat/controllers.ts` | 839 | Every repeated `stableSortKey` denotes the identical generated program and its score is a pure function of that program's target, so always replacing the prior entry writes the same exported candidate. |
| `src/combat/controllers.ts` | 844 | For an existing `stableSortKey`, the regenerated identical program necessarily has the same score, so forcing the strictly-greater comparison false preserves the same exported candidate. |
| `src/combat/controllers.ts` | 845 | For an existing `stableSortKey`, `>=` only replaces an identical program with its identical score, leaving every exported candidate field unchanged. |
| `src/combat/controllers.ts` | 846 | For an existing `stableSortKey`, `<=` only replaces an identical program with its identical score, leaving every exported candidate field unchanged. |
| `src/combat/controllers.ts` | 917 | `proposeRoundProgram()` always enumerates a living PC with score-40 Dash or a living monster with score-20 Dodge, so its exported `top` is never zero and forcing the zero-test false selects the original formula for every valid call. |
| `src/vtt/local-session-store.ts` | 1171 | Database version 1 runs `upgradeneeded` only for a new database whose object-store list is empty, so each unique required store is absent and replacing its absence guard with `true` creates the same three stores. |

The `shouldSpendHitDie` `>=`/`>` boundary mutant (6907) is not ledgered: the exported function accepts finite numeric deficits and modifiers, so `missingHitPoints: 6.5`, `sides: 8`, `constitutionModifier: 2` observably distinguishes `true` from `false`.
