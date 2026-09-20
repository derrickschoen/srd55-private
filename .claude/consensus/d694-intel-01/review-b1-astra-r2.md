# D694-INTEL-01 B1 — astra MEDIUM review r2 (session 01a0bc90-f852-7ba3-a7a7-dbf6bb4dfe4f, final message only)

**REJECT — 2 P2; no P1 or P3.**

Reviewed the combined `be09e575..6785c1f5` diff. It contains **9 distinct files**, not 12. The frozen plan SHA matches.

1. **P2 — Encoded combatant references still leak through retained effects and persistent areas.**

   [actor-local-encounter-state.ts:302](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:302) checks sustained effects with:

   > `return payload.boundCombatants.every((id) => retained.has(id));`

   It ignores `payload.consumedEventTurnKeys`. Likewise, [line 509](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:509) checks area owner/origin/filter/members/hooks, but ignores `area.consumedTurnKeys`. Both objects are subsequently cloned.

   These strings encode **both active combatant and target identity**. The reducer constructs them as `${turn}:${String(target)}`, where `turn` includes `activeCombatant`: [encounter.ts:4423](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:4423) and [encounter.ts:5471](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:5471).

   Independent in-memory probes of the committed helpers confirmed:
   - A retained area containing `1:combatant:guard:combatant:absent-fighter` passes.
   - A retained sustained effect containing the equivalent event-turn key passes.
   - Cloning either preserves the absent identity.

   Thus r1 **P2-1 and P2-3 remain partially open**. Project these encoded references safely and add witnesses for absent identities in **both positions** of both key collections, preserving legitimate retained-use semantics.

2. **P2 — Safe adjudication prompts are still erased unconditionally.**

   [actor-local-encounter-state.ts:612](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:612) explicitly says:

   > `case 'adjudication_prompt':`  
   > `// ... this arm is conservatively omitted.`  
   > `return false;`

   This remains contrary to §2’s exhaustive, all-references-retained projection contract and the r1 fix instructions. An in-memory probe with only retained Guard references—including a refusal containing `{type:'end_turn', actor:guard}`—returns `false`.

   Implement the safe command/refusal projection and retain qualifying prompts. The comment explains the omission but does not authorize a contract exception. Add positive retention and absent-reference rejection witnesses.

The six r1 dispositions and requested checks:

- **P2-1: partially closed.** The explicit `againstAttacker`, payload `source`, sourced timings, and `ownedCombatants` checks are present at lines 302–310 and 469–479. Alerting now checks both `caller` and `summoner` against spatial IDs at lines 519–525. Comparing the payload union with the switch found **152 distinct discriminants, all explicitly covered**, with no default or unmatched fallthrough; line 460 has `const unhandled: never = payload`. Exhaustive discriminants do not establish exhaustive embedded-reference handling—the sustained-effect keys above remain unchecked.

- **P2-2: closed.** [Line 198](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:198) constructs a fresh turn, including `spent: feet(0)`; lines 208–223 set remaining pools to their maxima. `spellSlots.maximum` and `limitedResources.maximum` are capability capacities, initialized from profile rules at [encounter.ts:1412](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:1412), with expenditure stored separately as `remaining`. Retaining those capacities agrees with D757; I found no additional live-resource disclosure in this adapter.

- **P2-3: partially closed.** Lines 681–686 now filter areas, branches, and decisions; the positive area/concentration witness is meaningful. The encoded-reference leak and unconditional adjudication omission prevent full closure.

- **P2-4: closed for current B1 ingress.** [intent-resolver.ts:756](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:756) invokes observers before the unchanged builder/filter expression. Production callbacks only increment counters. An isolated probe preserved returned option identity/filtering and counted `[1,0]` for two distinct state objects. Each runtime constructs a fresh planning-state object, and each local projection is fresh, so current requests do not share observer keys. WeakMap alone would not isolate deliberate reuse of one state object. The recorded mutants add actual calls to `availableEngineActorOptions(hostState, …)` and `availableEngineActorOptions(mechanics, …)` without editing instrumentation; the reported `{1,1}` and `{2,0}` failures are valid negative-control shapes.

- **P3-1: closed.** [Line 766](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:766) records “Every monster-side creature remains Whole,” with dead/tokenless members excluded from spatial projections. I accept this reading of §2’s separate combatant/equipment and spatial rows. The tokenless-ally witness supports it. **B4 must verify downstream spatial consumers; B17 must verify assignment/summon classification preserves it.** Neither needs to reopen the policy absent contrary evidence.

- **P3-2: closed.** [Line 549](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:549) reconstructs search memory from the cue, using neutral metadata; line 625 documents conservative offers until B14. [actor-knowledge.ts:249](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-knowledge.ts:249) accepts the reconstructed expiry, lines 264–269 recover the cue, and lines 314–320 select `pursue_indication` when no perceived target exists. An independent extracted-helper probe reproduced that branch with `source:'search_memory'`. The existing cue-source witness also requires a Search offer; the mixed perceived/indicated witness retains normal behavior.

No additional regression found in r1-confirmed branding, cached offer identity, environment authentication, corridor literals, spent-action seam, or forbidden raw-history handling.

Independent validation: both TypeScript projects passed with incremental compilation disabled; architecture scan passed for 1,629 files; combined-diff whitespace check passed. Fresh-cache creation failed with **Read-only file system**, so I did not rerun Vitest. The supervisor log records all 227 tests passing, but its witnesses do not cover the two findings above. No files were modified.

D694-INTEL-01 B1 REVIEW R2 DONE
