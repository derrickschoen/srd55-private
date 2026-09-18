63,073
**REJECT — 0 P1, 1 P2, 1 P3.**

- **P2 — Active memory becomes invisible after observation-history pruning.** [actor-knowledge.ts:275](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intel/actor-knowledge.ts:275) skips `unknown` before consulting memory. B0’s `prior.seen` requirement does **not** guarantee retained history: temporary banishment removes the target’s token (`encounter.ts:6125`); history reconciliation prunes that subject (`:2163–2167`); memory reconciliation skips off-board targets without clearing their memory. Consequently, an observed, non-dead target can retain an unexpired memory yet produce `blind_dodge`. Returning while still unseen also leaves this mismatch. This violates §2.2’s active-memory row. Preserve that indication in the single producer and add a reducer-transition regression. The test at [actor-knowledge.test.ts:415](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/actor-knowledge.test.ts:415) incorrectly equates absent history with never observed despite active memory.

- **P3 — Comparator tie-breakers are unreachable.** [actor-knowledge.ts:258](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intel/actor-knowledge.ts:258): each target contributes at most one indication, so neither source nor coordinate tie-breakers distinguish reachable cues. Your source-order mutant equivalence judgment is correct. Simplify with a documented plan clarification, or document the redundancy; don’t manufacture duplicate-target tests merely to kill it. The ordering test proves target ordering only.

Other checks:

- Remaining matrix rows and precedence match the plan.
- Direct memory access inside the single producer is authorized; the new code reads no unseen current position.
- `< expires.round` matches reducer removal at `>=`; round-1 memory expires at round 4.
- Expectations are explicit, with no output-generated expectations apparent. `dying` is a real reducer state, distinct from `dead`; retention is valid.
- Reference sharing matches the plan. Options, nested cells, and coordinates are readonly; no downstream mutation path was found in this candidate.

Candidate and plan hash verified; worktree unchanged. The pruning finding is established by source tracing; an in-memory execution probe could not load the application module graph. I did not rerun the supervisor’s test suite.

BLIND-01 REVIEW B1 DONE
