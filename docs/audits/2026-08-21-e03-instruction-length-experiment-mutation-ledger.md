# E03 instruction-length experiment mutation ledger

Date: 2026-08-21

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `explainer_contains_tactics` | `explainer_contains_tactics: rejects every pinned tactical-advice phrase from the explanatory arm` | Appended the pinned phrase `focus fire` to the explanatory instruction text. | exit 1; the named lexical-guard test reported the forbidden phrase. | Restored the tactics-free explainer; exit 0 in the restored gate. |
| `shared_block_varies` | `shared_block_varies: keeps grammar, examples, state surface, AST surface, fixture, and round limit byte-identical` | Replaced the explanatory arm's third shared worked example with the branch-rich E02 fixture. | exit 1; the named shared-block test found two serialized contract/example blocks. | Restored the byte-identical three-example tuple; exit 0 in the restored gate. |
| `e03_digest_collides` | `e03_digest_collides: preregistration is stable and distinct from E01 and E02` | Returned E02's preregistration digest for E03. | exit 1; the named digest-collision test found E03 equal to E02. | Restored digesting of E03's canonical preregistration bytes; exit 0 in the restored gate. |

Each mutation is applied alone, killed by its named test, and restored before the next mutation.
