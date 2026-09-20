# D694-INTEL-01 B7 — astra MEDIUM review r1 (session 01a0c047-0a89-7243-94cc-a8408f374fe1, 96,570 tokens, final message only) on 0d656a82+fe991ace

**REJECT — P1: 1 / P2: 1 / P3: 2.**

Reviewed `0d656a82 + fe991ace` against `0a209799`. The frozen plan hash matches.

1. **P1 — Team scoring combines different actors’ evidence against the first actor’s world.**  
   [team-scorer.ts:573](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/team-scorer.ts:573) accepts candidates using each actor’s cache, but supplies the first local’s mechanics to aggregate evaluation.

   A concrete static witness is two requested monsters: A perceives no PCs and chooses blind Dodge; B perceives P and chooses a cached damaging attack against P. Both proposals pass `actorLocalCandidateIsSafe`. Their individual outcomes use their respective locals, but the shared target set is empty. Combined damage then looks up B’s target in **A’s** mechanics and throws `Damage target … is absent.` at [option-outcome.ts:708](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/option-outcome.ts:708). The new RangeError catch cannot handle this ordinary Error.

   This is production-reachable structurally: `basic_advance` selects options independently from each actor’s perceived targets, and `engine-server` passes that candidate to this scorer. Reversing the locals can change the outcome.

   There is a related boundary violation at [team-scorer.ts:391](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/team-scorer.ts:391): `compareAllocations` calls `availableEngineActorOptions` for every actor using that same first-local state. Thus cached membership is checked initially, but allocation scoring subsequently regenerates options and resolves other actors in the wrong projected world.

   **Required:** preserve actor-specific cached options/mechanics through allocation and aggregation; explicitly handle contributions outside the shared target domain. Add an asymmetric-perception witness through the production context path, reverse actor order, and assert zero post-boundary offer generation. The existing single-actor and fully perceived tests cannot expose this defect.

2. **P2 — The exactness fallback changes behavior outside the frozen plan and lacks a dedicated assertion.**  
   [team-scorer.ts:443](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/team-scorer.ts:443) changes a thrown exception into an unresolved frontier entry, including for `scoreHostTeamPlans`.

   Section 4’s prohibition on plausible values does **not require** this change: the previous throw also exposed no plausible value. Explicit unresolved output is defensible, but it is a separate behavioral decision requiring authorization and a test of its actual contract.

   Reachability is supported by the implementation log: `restricted wall excludes engine work and includes later speculation` reached the original throw through `combinedDamageActionEquivalents → scoreTeamPlans → teamPlanReport → fullTurnContext`. This is evidence from the recorded run, not an independently reproduced probe.

   **Required:** revert this behavior for B7, or obtain an explicit scope amendment and test the exact unresolved reason, absence of numeric results, and propagation of unrelated exceptions. Passing the conversation test does not establish those properties.

3. **P3 — The exported scenario helper silently assumes a contiguous requested monster window.**  
   [speculative-planning.ts:735](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/speculative-planning.ts:735) stops at a requested actor, whereas the host window stops collecting players at the first living monster.

   For `[P1, M1, P2, M2]` with only M2 requested, the helper includes P2; the host window before the next monster does not. The current production scenario caller passes `window.monsters`, so I found no present production violation: its first requested monster is the first living monster. `engine-server:1754` calls the **team scorer**, not this window helper. Nevertheless, the exported helper neither documents nor enforces its narrower input contract.

4. **P3 — Several new witnesses permit vacuous success.**  
   The deletion/frontier tests assert subset membership and equality, without requiring retained evaluations. A uniformly empty report passes those assertions. The MCP hidden-HP witness also permits a constant `null` frontier. Fully perceived host/local equality catches some uniform omissions elsewhere, but not mixed-perception-only suppression.

   Add positive retained-candidate assertions to those specific witnesses. The alternating-window witness is stronger: it proves the widened host menu differs and includes Fighter before requiring exact local/host equality.

The remaining review conclusions are:

- **Window semantics:** both walks skip dead combatants, start at the active index, and do not wrap. Unperceived PCs are omitted intentionally under D748/D755; their influence cannot be reconstructed from the authoritative roster. There is an additional conservative effect: if the active PC is absent from the first local, its projected active index is `null`, so the entire menu is empty—even if a later PC is shared and perceived. That is reduced speculation, not evidence of hidden-state disclosure.
- **Caller closure:** located production menu/scorer entry points take locals. Host menu/scorer calls remain in host tests. Both production frontier render sites consume the local scorer’s report. The compile negatives are meaningful against the branded local type and are included by the node TypeScript configuration. Signature closure does not cure finding 1.
- **D693/B18:** production occurrences of both old symbols are zero; the sole test occurrence is the assigned B18 assertion. Exact empty blind menus are authorized. However, B18 is a real outstanding behavior change, not merely a stale test: current materiality records contain no actor-knowledge digest, and blind-Dodge resolution itself does not reject newly acquired knowledge. An otherwise unchanged stored Dodge can survive a reveal. I found no basis to reassign that explicitly scheduled B18 work to B7.
- **Test changes and ledgers:** all removed test lines are accounted for by API/setup migration or the two D755 expectation changes. Seed 5117001 retains its typed-Dodge assertions and replaces obsolete nonempty/ranking/volatility assertions with exact empty arrays. The advice test legitimately becomes an empty-preflight test, but it no longer exercises serialized advice-request delivery; calling it simply “stronger” overlooks that subject change. The handler’s synthetic initiative is appropriate setup for its handshake subject and retains the exact tool-list assertion plus a nonempty-menu premise.
- **Witness limits:** cached subset checks do not prove completeness; HP 1/50 does not cover other thresholds; fully perceived equality does not cover asymmetric knowledge; the two-monster Dodge witness exercises initiative membership but not damaging attack order. These limits explain why finding 1 survives the reported green suites.
- **Scope/freeze:** exactly the ten B7 manifest files changed. No fixture or documentation diff. All 260 fixture files reproduce the reported aggregate SHA `17bbe2cc…db9f`. Diff check passes; worktree clean.

Validation limitation: my wrapper test attempt stopped before execution with `EROFS` while Vite wrote its temporary config. I inspected the supervisor verification log, including 110/110 conversation tests, but did not independently reproduce tests or mutants. Finding 1 is a static execution-path derivation.

D694-INTEL-01 B7 REVIEW R1 DONE
