# D344.3 DM board mutation ledger

The full suite was green before mutation work: `Test Files 427 passed (427)` and
`Tests 7990 passed (7990)`. Each production mutation below was applied alone,
verified in the source, killed by its named focused test, restored, and followed
by the same focused test passing (`Tests 1 passed | 8 skipped (9)`).

| Control | Production change applied alone | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `corpse_token_removed` | Dead combatants were filtered out while projecting reducer combatants. | `corpse_token_removed: a dead combatant remains a corpse at the persisted board-edge cell while a dying combatant stays a token` | exit 1; projected corpse was `undefined` | exit 0 |
| `branch_events_collapsed` | Each shared-outcome branch appended a duplicate roll instead of labeling its existing attack/save roll. | `branch_events_collapsed: one shared-outcome roll per target carries its branch label and composition refusal keeps its typed reason` | exit 1; four save-roll rows appeared instead of two | exit 0 |
| `light_radius_unlabeled` | The Daylight overlay label lost its `(descriptive)` marking. | `light_radius_unlabeled: projects object names/blocking and a clipped, explicitly descriptive Daylight overlay distinct from a plain object` | exit 1; label did not contain `(descriptive)` | exit 0 |
| Boundary `boundary_corpse_edge_included` | A token on the last column and row was omitted from the board projection. | `boundary_corpse_edge_included: includes the last in-bounds cell and never invents an outside corpse cell` | exit 1; edge-corpse position list was empty | exit 0 |
| Boundary `boundary_light_radius_clipped` | Every projected light radius gained an out-of-bounds `(-1, 0)` cell. | `boundary_light_radius_clipped: keeps exact in-bounds bright and dim cells while excluding the adjacent outside cells` | exit 1; bright cells contained `(-1, 0)` | exit 0 |

All five mutations were restored. No test, fixture, assertion, or expectation was
weakened or regenerated from mutated output.
