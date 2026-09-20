# D694-INTEL-01 boundary plan — astra HIGH review r5 (session 01a0bbf9-dd0c-74c1-99ba-4f1e5f5fe1db, final message only; freeze round per D767)

**REJECT — 0 P1, 2 P2, 2 P3.** Under D767, freeze the plan with the four tasks below in batch 0; do not open another planning round.

Reviewed HEAD `be09e5757d4c86c8a30a1d4af19186eb06d433d5` and the [520-line plan](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md), SHA `93a8f28ade2424c353dd2ea4bd583a2a9c8f6aedc4b0bd8b5ec1d8c6b2f1637c`. Read r4 first. No repository changes, agent invocations, or model calls.

**Batch-0 tasks**

1. **P2 — Connect failed-interaction observations to the spent-key projection. B14/B15.**

   Plan L83–85 says:

   > “A local spent key is emitted only for the exact event `{objectId,actionId}` when the user is monster-team/perceived, or this actor is an observer and those two digests differ.”

   But L255 requires a privately spent interaction to make **“no reducer call”** while recording a failed observation, and L259–260 requires that observation to remove the offer next revision.

   For the required hidden-use/same-visible-bytes case, neither permitted projection condition becomes true after the failed attempt. The plan needs an explicit third evidence source: the actor’s own failed interaction. Otherwise its next-revision removal promise contradicts its exclusive spent-key predicate.

   **Files:** new `src/vtt/intel/actor-local-encounter-state.ts` spent-key projector; [world-object-actions.ts:20](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/world-object-actions.ts:20); B15 execution/evidence producers. Amend plan L79–88, L255–260 and B14/B15 manifests at L406–417.

   **Close with:** name the typed failed-attempt record, its transaction/revision write point, and its projection consumer. Stage that consumer in B14 or rebalance B15 within its cap. Through real conversation authorization, attempt an authoritatively spent but locally available action; assert zero action/movement/resource cost, the generic receipt, and—after rebuilding the boundary—removal of exactly that object/action offer. No prior spender identity or synthetic successful-use event may be introduced. Replay must preserve the receipt and observation.

2. **P2 — B17 omits a required compile-boundary file. B17.**

   Plan L425–428 assigns the new `EncounterState.allegianceAssignments` field to an eight-file batch excluding `src/combat/visibility.ts`.

   That file contains an exhaustive:

   > `Readonly<Record<keyof EncounterState, EncounterViewClassification>>`

   at [visibility.ts:71](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/visibility.ts:71). An in-memory TypeScript probe adding precisely the proposed optional field produced **exactly one diagnostic: TS1360**, because `allegianceAssignments` is missing from this classification.

   B14’s earlier inclusion of `visibility.ts` does not make the later field addition atomic.

   **Close with:** add `visibility.ts` to B17, making it nine files; classify the field and explicitly handle it in the host projection. Both TypeScript gates must pass. The real assigned monster-profile ally must retain its allegiance through setup/codec/host-state round trip, while the actor-local projection exposes only the resolved faction. The 84-file union remains unchanged because `visibility.ts` already belongs to B14.

3. **P3 — Correct the canonical visibility reference. B14.**

   Plan L79–80 cites `combat/visibility.ts:506+` for actor visibility. That location is [projectDmView](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/visibility.ts:506), an omniscient projection using the `dm_party` observer scope—not the actor-specific cell predicate.

   **Close with:** bind `actorCanObserveWorldObject` explicitly to [visibilityField(state, observerId)](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/visibility-field.ts:423), or name an equivalent existing canonical operation. Pin the accepted cell grades and pre/post footprint handling. The witness must distinguish an object visible to another observer from one visible to this actor, alongside the already-required same-bytes and offscreen negatives.

4. **P3 — D630 timing remains independently unverified. Final gate.**

   I ran plan L469’s Vitest invocation from the specified wrapper cwd with fresh `STATIC_APP_CACHE_DIR=/tmp/d694-boundary-review-d630-9f472a`.

   Vitest **4.1.10** failed before collecting either suite:

   ```text
   ENOENT: no such file or directory, mkdir '/tmp/ZUc-R7n6iUB0Eh314rOCT/ssr'
   Test Files 2 failed
   Tests no tests
   ```

   I stopped the D630 probe there. This is an environment limitation, not a demonstrated regression.

   **Close with:** run the recorded command in an environment permitting its temporary directories and retain **36/36, zero failures, ≤41 seconds** evidence. Plan L464’s **39.24 seconds** remains planner evidence.

**Disposition of all seven r4 findings**

| r4 finding | R5 disposition |
|---|---|
| **P1 authorization bypass** | **Closed at plan level.** L232–241 explicitly removes authoritative divergence/re-resolution for model proposals, retrieves the registered local object, preserves authorization, and replaces capsule-digest binding. L298–301 requires a real conversation-path witness; B15 owns the implementation. |
| **P2 execution-result coverage** | **Outcome coverage closed.** L243–260 specifies absent/indicated obstruction, spent object, stale revision and transactional fault, including public mapping and costs. The spent-object precheck avoids the existing `encounter.ts:11752` throw. Its subsequent observation consumption remains task 1. |
| **P2 observability** | **Substantially closed.** L79–88 supplies actor visibility, event-key association and pre/post projection evidence; L287–288 and B14 pin same-bytes/offscreen negatives. Correct the canonical reference through task 3. |
| **P2 prompt producers** | **Closed at plan level.** B16 L418–424 includes both coordinators, all four conversation calls and deletion of exported authoritative prompt ingress. |
| **P2 allegiance representation** | **Representation closed; atomic compilation remains task 2.** L50–59 supplies the field, setup ingress and validation; B17 supplies codec ownership; L295–297 requires the actual assigned monster-profile witness. |
| **P2 knowledge invalidation/staging** | **Closed at plan level.** L191–199 retains the baseline, names materiality and pre-execution comparisons, and specifies `ACTOR_KNOWLEDGE_CHANGED` plus discarded authorization/replanning. L302–303 supplies positive and hidden-only negative witnesses. L110–114 explicitly stages B1’s safe history contract through B14. |
| **P3 D630** | **Still environment-blocked:** task 4. |

The authorization-copy audit found all seven `segmentMonsterPlan.set` sites: conversation L4930, L5448, L6012, L6124, L6774, L6971 and L6975. Reconstruction also occurs in `rebaseStoredPlanEntries` around L1638, speculative adoption around L1753, and recalculation around L6949. L238–239’s requirement for **“every stored-plan copy”** must cover these, including the sites omitted from its illustrative line list. All reside in B15’s conversation file. Segment execution at L7024 delegates through `applyConsecutiveMonsterSegment` to `applyResolvedMechanics`, so the planned dispatch can cover both execution modes.

The prompt grep additionally found the injected `CorrectionPromptRenderer` alias/default and `this.renderCorrection` call in the turn coordinator. These are inside B16’s manifest; deleting `renderEnginePrompt` provides a compile witness for those references too. I found no additional prompt producer outside the assigned files.

**Batch and evidence audit**

All eighteen declared manifests meet the numerical cap:

`10, 9, 10, 10, 10, 9, 10, 10, 10, 10, 9, 10, 7, 10, 10, 10, 8, 10`.

L327–331 retains both TypeScript checks, both D705 architecture commands, command-outcome checks, serial suites and compile-boundary greps in **every V**. It explicitly requires R before T; L307–323 names mutants and requires applying/reverting each with its recorded killer.

B15 now owns the real authorization path; B16 closes the prompt callers; B18 owns the missing materiality consumer. The remaining concrete batch defects are the B14/B15 observation contract and B17’s omitted classification file. These declarations and static checks do not certify future implementation gates as passed.

Independent verification:

- **D583:** **50 recorded / 84 unit / 105 unique paths; 217 → 218 specs**, no drops, sole addition `tests/unit/vtt/d694-intel-privacy.test.ts`. Closure SHA: `f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb`. Node’s Git subprocess failed with `EPERM`; supplying the separately read Git path list to the unchanged inventory function reproduced the result.
- **Corridor:** an in-memory Vite runner reproduced all three variants: local SHA `f4c1d44ec7351143d7fe840676f1a6268be992df4cc6030c3e6df84fd49c5590`, offer SHA `5d3ae0e2c125fb9b043d08eba2e35f8763a1fec95d718096415068fcb97940c4`, and the four stated labels. Source SHA also matches.
- **Fixtures:** tracked fixture diff is empty. The 43-fixture generation audit was not rerun; its freeze requirements remain in L487–497.
- **Worktree and plan:** clean and unchanged. The supplied fix-brief path is absent; the staged r4 fix log was available.

**VERDICT: REJECT — freeze with 2 P2 and 2 P3 batch-0 tasks under D767.**

D694-INTEL-01 BOUNDARY PLAN REVIEW R5 DONE
