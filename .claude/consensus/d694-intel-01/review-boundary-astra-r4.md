# D694-INTEL-01 boundary plan — astra HIGH review r4 (session 01a0bbd1-2205-7921-b0e2-e2dcb91a2a21, final message only)

**REJECT — 1 P1, 5 P2, 1 P3.**

Reviewed `be09e5757d4c86c8a30a1d4af19186eb06d433d5` and the [475-line plan](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md), SHA `0247f50833e1554b67146826a694b670c9c695cf606327bb18942ae25ee49586`. I read boundary r3 first, then r1/r2 and the staged fix log. No repository changes, agent invocations, or model calls were made.

The revision closes the mixed-case contradiction and receipt-invariance contradiction. B15 now identifies a feasible reducer mechanism, but its integration and outcome coverage are incomplete.

1. **P1 — B15 does not close the authorization path before the executor.**

   Plan L214–228 now explicitly requires an `authorization:'actor_local'` application, stepwise validation of the issued path, and dispatch before legacy fallback. This is implementable inside the named files: `applyOneResolvedProposal` can apply Dash, issue a prefix `move`, and the encounter reducer can validate obstruction evidence and retain an observation. An empty prefix must still issue the obstruction-bearing command.

   However, the actual conversation path first calls [authorizedMechanics](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:4083). It:
   
   - calls `proposalResolutionDivergence` against authoritative state;
   - rejects differing authoritative resolution;
   - resolves again through `createPureTurnProposalResolver`;
   - constructs applications from those authoritative options and mechanics.

   At conversation L5974 onward, rejection returns `invalid` **before** `applyResolvedMechanics` runs. Stored-plan reconstruction at L6010 also explicitly copies fields without the proposed authorization tag.

   B15 L385 says:

   > “the new actor-local tag has no caller outside this batch/previous MCP migration”

   That is not established by the caller graph: the execution caller and application reconstruction are in `tools/ai-dm-conversation.ts`, outside B15. Earlier batches assign that file scenario menus, captures, prompts, images, and pins, without assigning this authorization transition.

   **Required:** assign the authoritative revalidation removal, registered-local-object retrieval, tag preservation through stored-plan copies, and execution receipt plumbing to concrete batches. Add a witness entering through the real proposal authorization path; a direct session-executor test would miss this rejection.

2. **P2 — The new execution result union excludes conflicts the plan deliberately permits locally.**

   Plan L217–219 permits `hidden_obstacle` only when:

   > “occupancy by a player-side participant absent from that actor's local state is the first failure.”

   Two planned cases fall outside this union:

   - **Indicated blocker:** D757 retains the participant’s capabilities but withholds current position. That participant can obstruct the issued local path while being present in local `combatants`.
   - **Privately spent object:** L67 and L74–75 deliberately keep an unobservably spent action locally available and say to “let private execution discover unavailability.” But L216 privately validates static uses/resources before movement, and the receipt table has no outcome for that failure. The current reducer throws when the action was already used at [encounter.ts:11750](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:11750).

   Neither is a stale revision. Neither satisfies the stated absent-participant occupancy predicate.

   **Required:** define exhaustive private outcomes and public mappings for these cases, including costs, retained legal actions, observations, and no fallback/regeneration. Witness both an indicated blocker and a locally available but authoritatively spent action.

3. **P2 — The spent-object representation is actor-free, but “observable” remains insufficiently defined.**

   The useful repairs are explicit: L58 strips `dmOverride.actor/reasoning` and restricts `controllerPriority`; L67 introduces `{objectId,actionId}`; L71–75 assigns the shared predicate and its offer/validation consumers.

   The remaining definition is:

   > “‘observable’ means its actor-local `WorldObject` projection bytes change; then project spent” — L74–75.

   Yet the object projector itself is defined only as “retain observable geometry/state” at L58. There is no specified actor visibility predicate, before/after observation source, or rule tying an observable change to the particular spent action.

   Consequently, a state change to an object the actor cannot see is not concretely excluded. Nor does an arbitrary visible byte change necessarily disclose which once-use action was spent. Comparing projected bytes is a useful noninterference test; it does not independently establish observability.

   **Required:** define what makes object state observable to this actor and what observation establishes the specific spent key. Pin same-object/same-visible-bytes pairs differing only in hidden usage, plus an offscreen object-change case. Retain no hidden actor, reasoning, event sequence, or unobservable spent key.

4. **P2 — B7’s named callers are repaired, but B9 still leaves model prompt producers outside the migration.**

   The requested scenario-menu callers are accounted for: conversation L4688, handler L758, and server L126 are assigned to B7. The direct speculative submission at `speculative-planning.test.ts:638` remains valid under the explicit additive host/local split. The legacy helper is now in B9.

   But B9 L348–350 says:

   > “Add model-only `renderActorLocalEnginePrompt` … existing host APIs remain additive”

   Two actual model-facing correction producers still call the retained authoritative API:

   - [turn-exhaustion-coordinator.ts:551](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/turn-exhaustion-coordinator.ts:551)
   - [adjustment-exhaustion-coordinator.ts:239](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/adjustment-exhaustion-coordinator.ts:239)

   Both pass an authoritative capsule and send the resulting prompt to correction execution. Neither file appears in any manifest. `renderEnginePrompt` still obtains request metadata and `recentChanges` from that capsule even when given a safe `turnContext`.

   Conversation also has direct prompt calls at L4789, L5063, L5538, and L6888, but is absent from the batch introducing the replacement API.

   **Required:** assign these producers and their contract changes explicitly. An additive host API preserves compilation; it does not establish the promised single model boundary.

5. **P2 — D762 is resolved as policy, but the stated classifier cannot identify every promised player-side ally.**

   The plan correctly states one policy at L50, applies it through the collection table, and supplies side-pair witnesses at L274–275. BND-NPC is no longer presented as open.

   The implementation assumption remains unproved. The cited [combatantSide](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/allies.ts:20) follows `effects[].ownedCombatants` ownership, then falls back to `profile.kind`. `CombatantProfile` has only `monster` and `player_character`; it has no independent hired-NPC allegiance field.

   Therefore, an unowned monster-profile NPC fighting for the players is classified as monster-side and disclosed whole. Snapshotting that classification before redaction preserves the wrong answer.

   **Required:** specify the authoritative allegiance representation for hired NPCs and other nonsummoned player allies, its ingress, and its batch ownership. The witness must use that real representation, rather than merely naming a monster fixture “hired NPC.”

6. **P2 — Knowledge-digest invalidation has no assigned enforcement consumer.**

   Plan L175–179 introduces:

   > `{kind:'actor_knowledge';actorId;stance:'blind_dodge';baselineProjectionDigest}`

   and promises:

   > “boundary rebuild invalidates the stance.”

   The current dependency extractor feeds scenario-menu construction. Filtering the new arm out of `ScenarioFact` candidates does not itself invalidate an already stored plan. Meanwhile:

   - `movementResolution` at [intent-resolver.ts:399](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:399) resolves `blind_dodge` to an empty path without checking changed knowledge.
   - Conversation L6661 evaluates stored-plan materiality through `plan-materiality.ts`, which has no knowledge-digest comparison.
   - `plan-materiality.ts` is absent from the manifests, and no alternative comparison at adoption/rebase/execution is assigned.

   This matters directly after B15 records an obstruction cue: rebuilding local state must affect retained authorization, not merely produce a different digest.

   **Required:** name the comparison site, retained baseline, invalidation outcome, and batch. Add an end-to-end test where a new indication/perception invalidates stored blind Dodge, plus a hidden-only mutation that does not.

7. **P3 — D630’s command is repaired, but its timing gate remains unverified in this review environment.**

   I ran L424’s command with the requested fresh `STATIC_APP_CACHE_DIR` prefix. Vitest **4.1.10** accepted its arguments. Both suites failed before collecting tests because temporary-directory creation failed:

   ```text
   ENOENT: no such file or directory, mkdir '/tmp/.../ssr'
   Test Files 2 failed
   Tests no tests
   ```

   This is an environment limitation, not evidence of a test regression. The reported **36/36 in 38.99 s** remains planner evidence; I cannot independently certify the ≤41 s gate here.

The disposition of every r3 finding is:

| r3 finding | R4 disposition |
|---|---|
| P1 missing host execution increment | **Partially closed:** concrete reducer mechanism added; authorization integration remains P1 above. |
| P2 mixed perceived/indicated Search | **Closed.** L87–93 and L257–260 explicitly retain capabilities and offer no Search when any opponent is perceived. |
| P2 history-dependent availability | **Partially closed:** representation and named consumers supplied; observability and private failure mapping remain unresolved. |
| P2 receipts versus invariance | **Closed for the contradiction.** L238–240 limits equality to pre-execution responses; L240–243 permits post-commit status/own movement differences and next-revision discovery. |
| P2 B7/B9 named callers | **Named repairs closed; broader prompt closure remains P2.** |
| P3 D630 invocation | **Syntax repaired; execution/timing unverified due sandbox failure.** |
| P3 missing evidence/corridor source | **Closed.** Reviews and fix log are staged; exact corridor source exists and reproduced both hashes. |

The receipt clauses now agree. L238–240 requires:

> “Pre-execution non-interference: context/offers/intel/validation/preview/planning/submission IDs and receipts are byte-identical sans `state_ref`”

L240–243 separately permits:

> “after commit, `executed` versus `executed_as_far_as_legal` and own movement facts may differ”

and delays the encountered participant’s appearance until the next revision. The remaining receipt issue is missing outcome coverage, not contradictory equality requirements.

All fifteen manifests meet their numerical limits: **10, 9, 10, 10, 10, 9, 10, 10, 10, 10, 9, 10, 7, 6, 8** files. L298–302 retains both TypeScript checks, D705 architecture self-test/check, command-outcome checks, serial suites, and compile-boundary greps in every V. L280–294 retains red-first witnesses, compile-negative `@ts-expect-error` mutants, and plausible-wrong-value mutants.

Those declarations do not certify all fifteen batches as executable: B7/B8 need the invalidation consumer, B9 lacks prompt producers, B14 needs the complete observation rule, and B15 lacks the upstream authorization transition and exhaustive outcomes. The transition from B1’s omitted raw history to B14’s history predicate also needs an explicit intermediate contract. I found no additional manifest regression in B2–B6 or the additive board/image APIs in B10–B13.

Verification completed:

- **Corridor:** source SHA `13f2d8c89706393c4c7ace7d127fd3dc9cc99db66c6e97fcfabf32a342a1d129`. All three variants reproduced local SHA `f4c1d44ec7351143d7fe840676f1a6268be992df4cc6030c3e6df84fd49c5590` and offer SHA `5d3ae0e2c125fb9b043d08eba2e35f8763a1fec95d718096415068fcb97940c4`. I used an in-memory Vite runner with the existing wrapper config because the ordinary loader attempted a prohibited temporary-file write.
- **D583:** independently reproduced **50 recorded / 76 unit / 98 unique paths; 217 → 218 specs**, no drops, sole addition `d694-intel-privacy.test.ts`. Closure SHA is `f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb`.
- **Fixtures:** working-tree fixture diff is empty. The 43-fixture generation audit was not rerun.
- **Worktree:** remains clean; plan SHA is unchanged.

Under the final-round constraint, this plan should return to the owner with the ranked findings above rather than freeze for implementation.

D694-INTEL-01 BOUNDARY PLAN REVIEW R4 DONE
