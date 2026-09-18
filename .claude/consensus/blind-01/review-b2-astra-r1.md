85,927
**3ae45a69 (B2): REJECT — 0 P1, 2 P2, 0 P3.**  
**cd3cc851 (N2): ACCEPT.**

1. **P2 — Pursuit ignores remaining movement.** At [intent-resolver.ts:383](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intent-resolver.ts:383), pursuit passes the offer’s full-speed `maximumFeet` to the path query. That query overrides, rather than caps against, active-turn movement remaining. An in-memory reproduction with **5 feet remaining** produced valid Search mechanics costing **30 feet**, ending at `(7,0)`; the reducer rejected execution with `over_budget at step 1 (3,0)`. Cap pursuit against the actual available movement and add partially-spent/zero-movement witnesses.

2. **P2 — The blind branch does not produce exactly two menu options.** The return at [offer-declarations.ts:437](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/offers/offer-declarations.ts:437) still passes through bonus-action expansion at line 668. A no-cue Goblin Warrior reproduced **six valid offers**: Dodge and End Turn, each alone or combined with Nimble Escape/Disengage or Hide. This violates frozen §4’s exactly-two-options requirement. Bypass bonus composition for this branch and test a monster with bonus actions.

The remaining requested checks support acceptance:

- **N2 is legitimate.** At `a73cda49`, `livingEnemies` enumerated explicit targets without detection; `resolveTarget` immediately returned explicit combatant IDs. Movement could then make those attacks legal. Reciprocal visibility does not confer actor detection, and the removed saves also used explicit targets. Their fixtures are Dreadweb Weaver (`6203010`, monster 3) and Giant Spider (`6206007`, monster 3), both with empty history/memories.
- **Probe arithmetic independently reconciles:** removed `134/205/4` from 29 blind monsters; retained `80/111/0`; every sighted row unchanged. N2 changes only the explanatory comment and three pins.
- **No-enemy case:** empty knowledge selects blind Dodge under the frozen precedence table; End Turn remains available. This is not a separate B2 defect. Blind Dodge itself safely consumes zero movement mid-turn.
- **Indication selection:** the first ordered indication supplies both movement and Search’s identical target ID; reliance remains `sight`.
- **Two-placement witness:** the hidden PC moves from `(3,1)` to `(10,1)` with identical actor knowledge. Distances from `(1,1)` cross the five-cell threshold, so the specified mutant differs.
- **Execution:** movement precedes Search; `processSearch` spends the action.
- **Identity:** canonical hashing includes movement policy. Independently computed blind/ordinary hash suffixes are `37d283f570b4eade29050bdf16c451f8a468f4b0284411a7` and `0bbc372ee9b864b205cac5303aa7d3499e5f18153980fa1f`. Normal-body construction is unchanged; no existing identity pin was edited.

Verification used read-only inspection, probe arithmetic, hashes, and focused in-memory reproductions; no files were written.

BLIND-01 REVIEW B2 DONE
