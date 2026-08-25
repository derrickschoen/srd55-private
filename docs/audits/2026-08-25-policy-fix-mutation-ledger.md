# Run-10 policy-fix mutation ledger

Each mutation was applied alone, killed by the named focused test, and restored
before the next mutation. The final restored controls were rerun together.

| Mutation | Applied defect | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `path_not_clipped` | Replaced the controller's remaining movement budget with an unbounded budget, returning the whole candidate path. | `path_not_clipped: clips a movement candidate to the actor remaining movement budget` | Exit 1; 1 failed, 13 skipped. The returned path contained cells 7–12 beyond the expected 30-foot prefix. | Exit 0; named movement batch: 2 passed, 12 skipped. |
| `dash_budget_ignored` | Set the Dash reducer's extra movement to zero. | `dash_budget_ignored: Dash extends the movement-candidate clipping budget by the actor Speed` | Exit 1; 1 failed, 13 skipped. The post-Dash candidate stopped at cell 6 instead of cell 12. | Exit 0; named movement batch: 2 passed, 12 skipped. |
| `resolved_offer_reissues` | Removed the resolved-boundary event-log guard from opportunity-attack offer queuing. | `resolved_offer_reissues + resolution_leaves_pending: a resolved trigger stays resolved for its turn boundary` | Exit 1; 1 failed, 14 skipped. A second `reaction_offer` remained pending for the same reactor, mover, round, and boundary. | Exit 0; named reaction batch: 1 passed, 14 skipped. |
| `resolution_leaves_pending` | Reversed the pending-decision removal predicate so the resolved decision remained queued. | `resolved_offer_reissues + resolution_leaves_pending: a resolved trigger stays resolved for its turn boundary` | Exit 1; 1 failed, 14 skipped. `decision:1` remained in `pendingDecisions` immediately after resolution. | Exit 0; named reaction batch: 1 passed, 14 skipped. |

Restored commands were `npx vitest run tests/unit/combat/controllers.test.ts
--configLoader runner --testNamePattern='path_not_clipped|dash_budget_ignored'`
and `npx vitest run tests/unit/vtt/detection-reactions.test.ts --configLoader
runner --testNamePattern='resolved_offer_reissues|resolution_leaves_pending'`.

## Deviations

None. No assertion was weakened, and no test was skipped, deleted, or generated
from production output.
