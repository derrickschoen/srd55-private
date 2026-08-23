# D347 nested composition mutation ledger

Every production mutation below was applied alone, proved present by direct source inspection, killed by its named imported-pack test, restored, and followed by a green rerun of that same test before the next mutation. No expectation was regenerated from production output. The restored focused suite reported `Test Files  1 passed (1)` and `Tests  50 passed (50)`.

| Mutation | Production change | Named killing test | Observed kill | Restoration |
|---|---|---|---|---|
| `depth_limit_off_by_one` | Refused only beyond `MAX_COMPOSITION_DEPTH + 1`, accepting depth 5. | `depth_limit_off_by_one: depth four loads and depth five has a typed import refusal` | exit 1; the depth-5 `composition_depth_exceeded` diagnostic disappeared. | The strict `depthFound > MAX_COMPOSITION_DEPTH` refusal was restored; the named test returned exit 0. |
| `depth_limit_rejects_exact_maximum` | Refused at `depthFound >= MAX_COMPOSITION_DEPTH`. | `depth_limit_off_by_one: depth four loads and depth five has a typed import refusal` | exit 1; the lawful depth-4 record disappeared from the loaded spell ids. | The inclusive depth-4 acceptance boundary was restored; the named test returned exit 0. |
| `subtree_abort_escapes` | A continuing parent restored its own composition-start state after a nested refusal, erasing its completed first step. | `subtree_abort_escapes, nested_rng_leak, and outcome_not_propagated: depth-three abort is subtree-scoped under continue and whole-tree-scoped under abort` | exit 1; subtree-continue Hit Points were 20 instead of 17. | Continue again retains state outside the refused subtree; the named test returned exit 0. |
| `nested_rng_leak` | The serializable transactional RNG adapter ignored rollback checkpoints. | `subtree_abort_escapes, nested_rng_leak, and outcome_not_propagated: depth-three abort is subtree-scoped under continue and whole-tree-scoped under abort` | exit 1; the nested-abort stream had 3 draws instead of the baseline 2. | Serialized RNG checkpoint restoration was restored; the named test returned exit 0. |
| `outcome_not_propagated` | An aborting composition returned `applied` after restoring its subtree, hiding its refusal from the parent. | `subtree_abort_escapes, nested_rng_leak, and outcome_not_propagated: depth-three abort is subtree-scoped under continue and whole-tree-scoped under abort` | exit 1; whole-tree-abort Hit Points were 17 instead of 20. | Aborting compositions again return `refused`; the named test returned exit 0. |
| `shared_outcome_nesting_accepted` | The shared attack hit branch parsed `SpellOperation`, admitting a composition instead of retaining `BranchSpellOperation`. | `shared_outcome_nesting_accepted: shared outcome is a composition step but composition remains refused inside its branch` | exit 1; the invalid branch's malformed-record diagnostic disappeared. | Shared-outcome branches again parse only branch operations; the named test returned exit 0. |

## Boundary and distinguishing-input coverage

- `MAX_COMPOSITION_DEPTH` is 4. Depth 4 and depth 5 share the same pairwise shape; the former loads and the latter is rejected with `depthFound: 5` and `maximumDepth: 4`. Both comparison mutations were applied and killed.
- The same depth-3 abort tree is nested under parent `continue` and `abort`. Continue retains the parent's completed 3 damage while abort restores it, producing Hit Points 17 and 20 respectively. Both remove subtree world state and damage events, and both restore the serialized RNG cursor.
- At the same depth, a nested `continue` retains 2 damage and reports `applied`, while nested `abort` restores it and reports `refused` to its continuing parent, producing Hit Points 17 and 19.
- `CompositionStep.operation: SpellOperation` is the recursive type seam. `SharedOutcomeOperation` branch arrays remain `BranchSpellOperation` (or the damage-reference node on save success), so a shared outcome can be a composition step while neither composition nor shared outcome can inhabit one of its branches.
- Existing pairwise decisions remain named by `COMPOSITION_EVALUATION_ORDER`, `COMPOSITION_REFUSAL_PROPAGATION`, `COMPOSITION_STATE_VISIBILITY`, and `COMPOSITION_TARGET_RESOLUTION`. D347 adds only `NESTED_COMPOSITION_OUTCOME_PROPAGATION` for the new parent-visible summary decision.

All six mutations were restored.
