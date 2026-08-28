# D403: speculative AI DM monster-round planning

**Status:** design round 2 for supervisor consensus review  
**Date:** 2026-08-28  
**Builds on:** `docs/design/2026-08-27-engine-mcp-server-design.md`, including its live-interop amendment

## 1. Decision summary

The AI DM plans the next shared-initiative monster round while players act, but the host—not the model—chooses the scenarios worth covering.
The host deterministically ranks volatile facts from `EngineQueryPort`, publishes at most eight fully formed split candidates, and compiles two to four disjoint scenario vectors.

Branch discipline is fixed:

1. branch 1 is the exact “no material change” vector;
2. branches 2 through N each flip exactly one selected candidate in rank order; and
3. the agent supplies intents for those scenario IDs without authoring, composing, reordering, or weakening guards.

At monster-round start the host evaluates every contingent plan against actual state regardless of source revision.
It selects the matching host scenario, validates its intents against a fresh real capsule, and emits a new ordinary proposal.
A contingent plan is prediction data, not a staleable proposal; `STALE_STATE` applies only to the fresh proposal derived from it.

If no scenario matches or an intent is illegal, the same D397.3 session receives a small actor-keyed repair brief containing exact failed facts, selector changes, attributed refusal codes, and already-validated intents to carry forward.
Failure then enters the unchanged primary/fallback, one-correction, deterministic-controller ladder.

The hit path performs no model call after round start.
Its perceived latency is real guard evaluation, validation, authorization, and first-command reduction time.

## 2. Binding substrate and non-goals

### 2.1 Unchanged substrate

- The DM browser journal and reducer remain authoritative.
- MCP remains proposer-only; capsules remain immutable and read-only.
- Real proposals remain run-, branch-, request-, revision-, digest-, handle-, and idempotency-bound.
- `engine.submit_round_intents` and whole-round all-or-nothing authorization are unchanged.
- Semantic intents contain no coordinates, paths, or reducer commands.
- D397.3 still provides one resumed conversation, never a parallel planning session.
- D401 guidance remains closed, sticky, and inert until a real proposal is authorized.
- The increment-5 `TurnExhaustionCoordinator` remains the only correction and auto-resolution authority.
- A selected branch is fully re-resolved against real state; predicted resolution digests are never reused.

### 2.2 Non-goals

- The model does not choose scenario predicates or their rank.
- Speculation does not reserve state, consume RNG, or enter the encounter journal.
- No stale real proposal is rebased.
- No lower scenario substitutes for the host-ranked matching scenario after validation failure.
- No second correction rung is added.
- Player actions never wait for speculation.
- Free text is never executable.
- Ephemeral predictions are not portable user data.

## 3. Speculative capsule and host scenario menu

The capsule request becomes a closed union:

```ts
type EngineCapsuleRequest =
  | { readonly requestId: string; readonly phase: 'initial' | 'correction';
      readonly correctionNumber: 0 | 1; readonly actors: readonly CombatantId[] }
  | { readonly requestId: string; readonly phase: 'speculative'; readonly correctionNumber: 0;
      readonly actors: readonly CombatantId[]; readonly targetRoom: number;
      readonly targetMonsterRound: number; readonly refreshGeneration: 0 | 1 | 2;
      readonly scenarioMenu: readonly HostSplitCandidate[]; readonly scenarios: readonly HostScenario[] };
```

The speculative actor set is the currently living AI-controlled monster set expected in the next request.
Every returned branch has exactly that actor set.
A killed, added, removed, or reclassified actor causes real actor-set repair; v1 never deletes or inserts an intent as an implicit rebase.

### 3.1 Projection additions

`EngineDmProjection` adds canonical facts needed by the menu and evaluator:

```ts
interface EngineProjectionCombatantFacts {
  readonly conditionFlags: readonly GuardConditionIdentity[];
  readonly temporaryHitPoints: number;
  readonly spellSlots: readonly { readonly level: number; readonly remaining: number }[];
  readonly legendaryActionUsesRemaining: number;
  readonly legendaryResistanceUsesRemaining: number;
  readonly concentrating: boolean;
}

interface EngineSemanticZone {
  readonly id: EngineZoneId;
  readonly kind: 'persistent_area' | 'difficult_terrain_region' | 'authored_encounter_zone';
  readonly memberCombatantIds: readonly CombatantId[];
  readonly active: boolean;
}
```

Zones expose opaque registered IDs and membership only, never cells, points, shapes, or polygons.
Persistent-area, terrain-region, and authored-zone membership comes from canonical engine services.

Condition identities come from `combatantConditions`.
Concentration uses one named query, `engineConcentrationActive(state, id)`, which checks every canonical concentration-owned effect and persistent area.
Reaction availability remains the existing `turn.reactionAvailable`; legendary and slot pools come from typed combatant state.

### 3.2 Host menu shape

```ts
interface HostSplitCandidate {
  readonly candidateId: string;
  readonly rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly factKey: string;
  readonly baseline: ScenarioFactAtom;
  readonly flipped: ScenarioFactAtom;
  readonly referencedIntentCount: number;
  readonly influencingPlayerIds: readonly CombatantId[];
  readonly summedMovementRadiusFeet: number;
  readonly volatilityScore: number;
}

interface HostScenario {
  readonly scenarioId: string;
  readonly ordinal: 1 | 2 | 3 | 4;
  readonly kind: 'no_material_change' | 'single_candidate_flip';
  readonly flippedCandidateId: string | null;
  readonly facts: readonly ScenarioFactAtom[];
}
```

All strings are bounded opaque codes or canonical keys; there is no model-authored label or rationale.
The menu contains at most eight candidates.
Only the top `K = min(3, menu.length)` candidates compile into scenarios, yielding `K + 1` branches.
The remaining menu entries expose heuristic evidence and help the agent choose robust intents, but cannot become extra branches.
If the menu is empty, the host records `no_split_candidate` and does not dispatch speculation; the normal live path remains.

## 4. Deterministic split-candidate compiler

### 4.1 Baseline intent set

`HostBaselineIntentPlanner` computes the current best complete intent set without a model.
It uses `EngineQueryPort` legal actions, semantic target resolution, reach, visibility, cover, and the existing deterministic-controller tie-break order.
The baseline is a read-only planning artifact, not an executable controller result or proposal.

`IntentFactDependencyExtractor` then lists the facts that could change whether each baseline intent remains legal or preferred:

- actor and target life;
- living-aware HP band;
- adjacency, reach, and visibility;
- zone membership;
- mechanically typed conditions and concentration; and
- reaction, legendary, or spell-slot resources consumed or relied upon.

This extraction is deterministic and independently testable from agent quality.

### 4.2 Unacted-player influence and volatility

For each unacted player, the host computes `maximumInfluenceRadiusFeet` from canonical remaining movement, legal Dash availability, movement modifiers, and the range of a legal option capable of flipping the fact.
Internal geometry may use canonical cells; the capsule exposes only the resulting feet value and semantic fact.

`canFlip(player, fact)` is one only when engine action domains and movement/reach queries prove that the unacted player can change that fact before the monster boundary.
Unknown or unmodelled influence is zero, not a guess.

```text
volatilityScore(fact)
= referencedIntentCount(fact)
 * sum(maximumInfluenceRadiusFeet(player) * canFlip(player, fact))
```

Candidates with score zero are excluded.
Sort descending by score, then descending referenced-intent count, then canonical `factKey` bytes.
The ranking never depends on model prose or proposed branches.

### 4.3 Scenario compilation and shadow rejection

Let the top K selected candidates have baseline facts `b1..bK` and complements `f1..fK`.
The host compiles:

```text
scenario 1: b1 b2 ... bK
scenario 2: f1 b2 ... bK
scenario 3: b1 f2 ... bK
scenario 4: b1 b2 ... fK
```

Thus branch 1 is Hamming-0 and every specific branch is Hamming-1 from it.
Every scenario has the same flat ordered fact keys, so scenarios are mutually disjoint and order-independent.
Two or more selected flips at round start produce no match and a repair brief; the host does not approximate a nearest branch during execution.

The compiler rejects a candidate before ranking when:

- its selector does not resolve in the source capsule;
- baseline and flipped atoms are not exact complements;
- its canonical fact key duplicates a higher candidate;
- an HP candidate's subject is not living;
- its resource, action, combatant, or zone identifier is not advertised;
- adding it makes two scenario vectors identical; or
- its fact is logically implied by a higher fact and therefore shadows it under the closed evaluator.

The final static shadow check compares canonical fact keys and atom complements, not branch order.
Runtime selector aliasing that was impossible to prove statically yields no match and repair, never overlapping first-match behavior.

### 4.4 Independently measurable heuristic quality

The arena records the menu before any agent response and later compares it with actual final fact flips.
Report top-1/top-3/top-8 realized-flip recall, realized flip rank, Hamming-0/Hamming-1/multi-flip frequency, and `no_split_candidate` rate.
These metrics evaluate host scenario selection independently of whether the model wrote good intents.

## 5. Flat closed scenario facts

The draft's recursive `all`/`any`, model-selected guards, `always`, and custom relative selector are removed.
Every atom is host-formed, flat, strict, and paired with one deterministic complement.

### 5.1 Engine selector grounding

The selector is exactly `EngineTargetSelector` from `src/vtt/engine-query-port.ts`:

```ts
interface EngineSelectorRef {
  readonly actorId: CombatantId;
  readonly selector: EngineTargetSelector;
}
```

Evaluation calls `EngineQueryPort.resolveTarget(state, actorId, selector)` exactly as the source contract requires.
There is no `relative` selector arm and no dependency on `dm-bridge/round-plan-contract.ts`.
An unresolved selector makes its scenario non-matching and is reported in repair.

### 5.2 Atom vocabulary

```ts
type HpComparison = 'at_most' | 'above';
type HpThresholdPercent = 25 | 50 | 75;
type GuardResource =
  | { readonly kind: 'reaction' }
  | { readonly kind: 'legendary_action' }
  | { readonly kind: 'legendary_resistance' }
  | { readonly kind: 'spell_slot'; readonly level: number }; // 1..9

type ScenarioFactAtom =
  | { readonly kind: 'life_state_is'; readonly subject: EngineSelectorRef;
      readonly value: 'living' | 'dying' | 'stable' | 'dead' }
  | { readonly kind: 'hp_percent'; readonly subject: EngineSelectorRef;
      readonly comparison: HpComparison; readonly threshold: HpThresholdPercent }
  | { readonly kind: 'adjacency_is'; readonly left: EngineSelectorRef;
      readonly right: EngineSelectorRef; readonly value: boolean }
  | { readonly kind: 'within_action_reach_is'; readonly actor: EngineSelectorRef;
      readonly actionId: string; readonly target: EngineSelectorRef; readonly value: boolean }
  | { readonly kind: 'visibility_is'; readonly observer: EngineSelectorRef;
      readonly subject: EngineSelectorRef; readonly value: boolean }
  | { readonly kind: 'zone_occupancy_is'; readonly subject: EngineSelectorRef;
      readonly zoneId: EngineZoneId; readonly value: 'inside' | 'outside' }
  | { readonly kind: 'condition_is'; readonly subject: EngineSelectorRef;
      readonly condition: GuardConditionIdentity; readonly present: boolean }
  | { readonly kind: 'resource_available_is'; readonly subject: EngineSelectorRef;
      readonly resource: GuardResource; readonly available: boolean }
  | { readonly kind: 'concentration_is'; readonly subject: EngineSelectorRef;
      readonly active: boolean };
```

Boolean, comparison, presence, occupancy, and active values define exact complements.
Life-state candidates complement one concrete current state with one host-selected reachable state; they are admitted only when `canFlip` proves that transition candidate.

### 5.3 HP identity and temporary HP

HP atoms are living-aware: evaluation first requires the resolved subject's life to be `living`.
Otherwise both `at_most` and `above` return non-match with `SUBJECT_NOT_LIVING`, preventing dead-at-zero from shadowing a life-state scenario.

All capsule projection, menu ranking, guard evaluation, fingerprints, repair values, and arena expectations use one exported denominator function:

```ts
enginePlanningHitPointMaximum(state: EncounterState, subject: CombatantId): number
```

The function owns the engine's active HP lens and maximum modifiers; call sites may not reconstruct maximum HP from profile, form, or wild-shape fields.
The numerator is the matching active-pool `enginePlanningHitPoints` query.
`temporaryHitPoints` is excluded from numerator and denominator because the state stores it as a separate absorption pool; resource dependencies may still reference its presence in future vocabulary, but v1 HP bands do not.

Evaluation uses integer arithmetic:

```text
at_most: currentHP * 100 <= enginePlanningHitPointMaximum(...) * threshold
above:   currentHP * 100 >  enginePlanningHitPointMaximum(...) * threshold
```

A missing/nonpositive maximum yields typed non-match `HP_MAXIMUM_UNAVAILABLE`.

### 5.4 Visibility, resources, and concentration

- `visibility_is` calls `EngineQueryPort.visibility(observerId, subjectId)` and compares only its canonical `visible` boolean.
- reaction availability means `turn.reactionAvailable === true`.
- legendary action/resistance availability means the corresponding remaining pool is greater than zero.
- spell-slot availability means the exact advertised level has `remaining > 0`; no upcast inference is hidden in the atom.
- `concentration_is` calls `engineConcentrationActive`; it never scans effect prose or names.

### 5.5 Source- and level-sensitive conditions

```ts
type GuardConditionIdentity =
  | { readonly name: Exclude<ConditionName,
      'Charmed' | 'Frightened' | 'Grappled' | 'Exhaustion'> }
  | { readonly name: 'Charmed' | 'Frightened' | 'Grappled'; readonly source: CombatantId }
  | { readonly name: 'Exhaustion'; readonly level: 1 | 2 | 3 | 4 | 5 | 6 };
```

`condition_is` compares the full identity.
It does not collapse different sources or exhaustion levels into a name-only flag.
Unknown homebrew prose remains passthrough data but cannot become executable until mapped to a typed mechanical identity.

## 6. Agent branch contract and submission

The host sends `HostScenario[]`; the agent returns only scenario IDs and intents:

```ts
interface SpeculativeRoundPlanV2 {
  readonly kind: 'speculative_round_plan'; readonly schemaVersion: 2;
  readonly runId: EncounterSessionId; readonly encounterBranchId: EncounterBranchId;
  readonly requestId: string; readonly sourceRevision: number; readonly sourceDigest: string;
  readonly stateHandle: string; readonly targetRoom: number; readonly targetMonsterRound: number;
  readonly refreshGeneration: 0 | 1 | 2;
  readonly branches: readonly { readonly scenarioId: string;
    readonly intents: readonly EngineTurnIntent[] }[];
  readonly reactionGuidance: ReactionGuidanceDeclaration | null;
  readonly idempotencyKey: string;
}
```

`engine.submit_speculative_round_plan` requires:

- exact source capsule binding and target key;
- exact host scenario IDs, count, and order;
- branch 1 is the host `no_material_change` scenario;
- remaining branches are host Hamming-1 scenarios in rank order;
- exact speculative actor set in every branch;
- advertised action, selector, zone, condition, and resource IDs only;
- frozen semantic intent/fallback schemas and exact D401 schema;
- no guard payload from the agent;
- no coordinate-shaped or unknown property; and
- byte-identical idempotency reuse.

The tool performs counterfactual-safe structural checks but does not demand that every scenario intent be legal in source state.
It queues prediction data with status `QUEUED-SPECULATIVE`, never an ordinary proposal.

## 7. Prediction queue, re-admission, and materialization

### 7.1 Separate queue

Prediction envelopes use `speculative-plans.jsonl` or an equivalent typed owner-only queue, never `proposals.jsonl`.
Ordinary proposal readers reject the speculative envelope kind.
The active key is `(run, encounterBranch, room, targetMonsterRound)`.

The queue keeps the best admitted plan until a better plan is admitted.
Starting a refresh never removes the current plan, and a rejected refresh never turns a plan into no plan.

### 7.2 A contingent plan is not staleable

`sourceRevision`, `sourceDigest`, and `stateHandle` prove provenance and source-schema validity; they are not a claim that the source remains current at round start.
The read-only capsule source retains bounded speculative capsules by handle until the target round closes so an in-flight tool call can validate its original bytes.
Ordinary query and proposal tools retain frozen `STALE_STATE` behavior; only speculative submission may name a retained source capsule.

A plan from an older source is considered for re-admission when state changes during its invocation.
`SpeculativePlanReadmitter` admits it if and only if:

1. run, encounter branch, room, and target round still match;
2. the speculative actor set is unchanged;
3. every referenced combatant, action, zone, condition identity, and resource remains advertised;
4. every host scenario ID still has the same canonical fact vector; and
5. no queued plan has a strictly better quality key.

The quality key is `(refreshGeneration, sourceRevision, admittedAtSequence)` descending.
An older admissible plan fills an empty queue but never displaces a newer admitted plan.
If a refresh is rejected, the existing plan remains.

### 7.3 Real materialization

At round start the host evaluates the admitted plan's host facts against actual `EncounterState`.
The one matching disjoint scenario is resolved against a fresh real `initial` capsule.
The materializer verifies actual actor set, resolves every intent through unchanged `PureIntentResolver`, and mints fresh resolution digests.

Only then does it emit an ordinary `RoundIntentProposalEnvelope` bound to the real revision/digest/handle and carrying speculative-plan, scenario, and generation provenance.
Any real state change before authorization returns `STALE_STATE`, discards derived digests, and produces a repair brief.
No predicted envelope is mutated or rebased into a proposal.

## 8. Single-session arbitration during player play

Speculation competes with real mid-phase engine decisions on the same D397.3 conversation.
`AgentSessionArbiter` is the sole owner of adapter start/resume/cancel and permits one invocation at a time.

### 8.1 Work classes and priority

```ts
type AgentWorkClass =
  | 'blocking_engine_decision'
  | 'turn_window_decision'
  | 'live_round_repair_or_correction'
  | 'reserved_final_refresh'
  | 'ordinary_speculation';
```

Priority is the order above, except an already-live repair/correction is never preempted by later speculative work.
Within decision work, authoritative `(revision, pendingDecision sequence)` order is FIFO; causally later decisions never overtake earlier ones.

- `legendary_resistance` and `adjudication_prompt` are blocking engine decisions.
- uncovered `reaction_offer` and `legendary_action_window` are turn-window decisions.
- a D401/host-policy-resolved reaction never consumes the session.
- adjudication analysis remains proposer-only; the agent cannot manufacture a raw consequence or bypass the DM tray.

### 8.2 Yield protocol

When agent-required decision work arrives during speculation:

1. enqueue the decision in authoritative order;
2. signal cancellation to the speculative invocation;
3. allow `SPECULATION_YIELD_SLA_MS = 250` for completion and adapter drain;
4. re-admit a complete speculative envelope produced before drain;
5. after the SLA, force-terminate only the invocation process and mark it `abandoned_for_decision` if no complete envelope exists;
6. record measured or best-available usage for all canceled/abandoned tokens; and
7. resume the same session for the highest-priority decision.

No model turn is pausible and no second session is opened.
If force termination makes the binding unresumable, frozen classified session-recovery rules apply; the host does not silently switch providers.

After the decision commits, the arbiter recomputes plan coverage.
It may dispatch a budget-eligible refresh only after the decision queue is empty and the player phase remains active.

## 9. Coordinator state machine

```ts
type SpeculativeRoundState =
  | 'INACTIVE' | 'ELIGIBLE' | 'SPECULATING' | 'SPECULATING_RECHECK'
  | 'YIELDING' | 'DECISION_QUEUED' | 'DECISION_RUNNING' | 'READMITTING'
  | 'QUEUED_SPECULATIVE' | 'SELECTING' | 'VALIDATING_REAL' | 'RECALCULATING'
  | 'LIVE_PROPOSAL_QUEUED' | 'EXHAUSTING' | 'EXECUTING' | 'COMPLETED' | 'ABANDONED';
```

`YIELDING` stores a continuation of either `decision` or `monster_round_start`.
`SPECULATING_RECHECK` replaces the old discard-on-dirty state: changed source state triggers re-admission, not automatic loss.

| From | Event | To | Required action |
|---|---|---|---|
| `INACTIVE` | player phase with nonempty menu | `ELIGIBLE` | Mint generation-0 request. |
| `ELIGIBLE` | arbiter grants session | `SPECULATING` | Resume same binding. |
| `SPECULATING` | plan-relative fact changes | `SPECULATING_RECHECK` | Preserve output eligibility; mark recheck required. |
| `SPECULATING` | complete response | `READMITTING` | Check admission against current host facts. |
| `SPECULATING_RECHECK` | complete response | `READMITTING` | Run full re-admission; do not discard for age. |
| `SPECULATING` or `SPECULATING_RECHECK` | agent decision arrives | `YIELDING` | Cancel/drain with decision continuation. |
| `SPECULATING` or `SPECULATING_RECHECK` | monster round starts | `YIELDING` | Cancel/drain with round-start continuation. |
| `YIELDING` | complete envelope drains | `READMITTING` | Re-admit, count tokens, then follow continuation. |
| `YIELDING` | SLA expires without envelope | continuation state | Force-stop, mark invocation abandoned, count tokens. |
| `READMITTING` | admissible and better/no plan | `QUEUED_SPECULATIVE` | Install atomically. |
| `READMITTING` | inadmissible or inferior | continuation/previous state | Keep prior queued plan; record reason. |
| `DECISION_QUEUED` | arbiter grants | `DECISION_RUNNING` | Resume decision prompt. |
| `DECISION_RUNNING` | decision completes | `ELIGIBLE` | Commit allowed outcome, coverage dry-run, drain next decision first. |
| `QUEUED_SPECULATIVE` | coverage fails and budget allows | `SPECULATING` | Keep queued plan while refreshing. |
| `QUEUED_SPECULATIVE` | coverage passes | `QUEUED_SPECULATIVE` | Spend no refresh. |
| `QUEUED_SPECULATIVE` | monster round starts | `SELECTING` | Evaluate plan against actual state. |
| `SELECTING` | exactly one scenario matches | `VALIDATING_REAL` | Resolve its intents against real capsule. |
| `SELECTING` | no scenario/no plan | `RECALCULATING` | Build actor-keyed repair brief. |
| `VALIDATING_REAL` | all intents valid | `LIVE_PROPOSAL_QUEUED` | Emit fresh ordinary proposal. |
| `VALIDATING_REAL` | actor mismatch/refusal/stale | `RECALCULATING` | Attribute failures and retain valid intents. |
| `RECALCULATING` | complete repaired proposal | `LIVE_PROPOSAL_QUEUED` | Revalidate all-or-nothing. |
| `RECALCULATING` | invalid/malformed/no response | `EXHAUSTING` | Enter unchanged ladder. |
| `LIVE_PROPOSAL_QUEUED` | authorized | `EXECUTING` | Reduce in existing order. |
| `LIVE_PROPOSAL_QUEUED` | invalid/invalidated | `EXHAUSTING` | Existing correction ownership. |
| `EXHAUSTING` | correction/controller succeeds | `EXECUTING` | Preserve existing marks. |
| `EXHAUSTING` | controller fails | `ABANDONED` | Pause for DM adjudication. |
| `EXECUTING` | round ends | `COMPLETED` | Emit metrics and expire retained capsules. |
| any nonterminal | room/branch/encounter ends | `ABANDONED` | Cancel work, count usage, expire target. |

The previously missing non-dirty `SPECULATING × monster_round_starts` transition is explicit above.
Cancellation means a request to yield within SLA; abandonment means no complete envelope survived forced invocation termination.

## 10. Re-speculation and deadline policy

### 10.1 Plan-relative fingerprint

Once a plan is queued, its fingerprint contains only:

- canonical fact keys referenced by its host scenarios;
- its speculative actor set; and
- resources consumed or required by any branch intent.

It excludes unrelated adjacency, reach, visibility, zones, conditions, HP bands, narration, and metadata.
Before the first plan, use only the current host scenario vectors plus actor/resources from `HostBaselineIntentPlanner`.

### 10.2 Coverage before refresh

After each authoritative player turn and each agent-resolved decision, the host constructs a pure next-monster-boundary preview and dry-runs the current plan:

1. evaluate its host scenario vectors;
2. require exactly one match; and
3. validate that branch's current intents without producing a proposal or consuming RNG.

If coverage passes, skip the refresh even when the fingerprint changed.
If coverage fails, refresh only when the turn-position budget permits.

### 10.3 Turn-position budget and reserved last refresh

`MAX_SPECULATION_GENERATIONS = 3`:

- generation 0 starts at player-phase entry;
- generation 1 is the sole opportunistic pre-final refresh; and
- generation 2 is reserved and cannot be spent before the last player's turn commits.

At the final player-turn commit, process higher-priority pending decisions first, then run coverage.
If uncovered, dispatch generation 2 while the phase is still players and before committing `monster_round_started`.
The host never delays the round-start transition to let it finish.

If the boundary arrives in flight, the explicit round-start yield transition applies: cancel/drain for 250 ms, re-admit a complete response, then select; otherwise abandon the invocation and use the best previously queued plan or repair.
No speculation resume begins after `monster_round_started`.
This resolves the earlier contradiction: the reserved late refresh starts before the boundary, while its bounded cancellation may complete at the boundary.

## 11. Actor-keyed repair brief

The generic prediction diff is replaced by a bounded repair contract:

```ts
interface RoundRepairBriefV1 {
  readonly realStateRef: EngineStateReference;
  readonly sourcePlanId: string | null; readonly sourceScenarioId: string | null;
  readonly reason: 'NO_PLAN' | 'NO_SCENARIO_MATCH' | 'ACTOR_SET_CHANGED'
    | 'SELECTED_INTENT_INVALID' | 'STALE_REAL_PROPOSAL';
  readonly failedFacts: readonly FailedScenarioFact[];
  readonly selectorChanges: readonly SelectorResolutionChange[];
  readonly actors: readonly ActorRepairEntry[];
}

interface FailedScenarioFact {
  readonly candidateId: string; readonly factKey: string;
  readonly expected: ScenarioFactAtom; readonly actual: ScenarioFactValue;
  readonly failure: GuardNoMatchReason;
}

interface SelectorResolutionChange {
  readonly selectorRef: EngineSelectorRef;
  readonly sourceResolvedId: CombatantId | null;
  readonly actualResolvedId: CombatantId | null;
}

type ActorRepairEntry =
  | { readonly actorId: CombatantId; readonly disposition: 'retain';
      readonly intent: EngineTurnIntent; readonly realValidationDigest: string }
  | { readonly actorId: CombatantId; readonly disposition: 'repair';
      readonly priorIntent: EngineTurnIntent | null;
      readonly refusals: readonly { readonly intentPath: string;
        readonly codes: readonly ValidationRefusalCode[] }[] }
  | { readonly actorId: CombatantId; readonly disposition: 'removed' };
```

For no scenario match, the host chooses the closest branch only as repair source by minimum Hamming distance then branch ordinal; it never executes that branch.
Each actual required actor's prior intent is independently validated against the real capsule.
Valid intents become `retain`; invalid/missing intents become `repair`; removed speculative actors are explicit.

The repair prompt contains no generic journal diff and no prose refusal summary.
It includes exact failed atoms, selector before/after IDs, and actor-attributed closed refusal codes.
The agent must return a complete ordinary round; every retained actor intent must be byte-identical to the brief.
If real state advances, all retention digests expire and the host rebuilds the brief.

## 12. Failure honesty

- **Matched scenario, illegal intent:** no proposal and no lower scenario; repair only attributed actors while carrying validated intents.
- **Planned actor killed:** actor-set repair marks it removed; the host never deletes it silently.
- **Target/selector changes:** exact source/actual resolutions appear in `selectorChanges`.
- **Multi-flip reality:** disjoint Hamming-1 scenarios yield no match; closest branch is repair source only.
- **Room transition:** cancel or abandon by SLA, count tokens, reject old target key, and resume the same session with ordinary room delta.
- **Session death:** speculation consumes no exhaustion rung; frozen classified retry/recovery rules apply, with no provider switch.
- **Late older plan:** run re-admission; fill an empty queue if admissible, never displace a better plan, and never remove the current plan on rejection.
- **Real proposal state advance:** `STALE_STATE` discards fresh derived digests and rebuilds repair; contingent source age alone is not stale.
- **Malformed/free-text/coordinate payload:** strict schema refusal before prediction queue.
- **Repair failure:** unchanged fallback, one correction with fallback null, deterministic controller, and host-only `auto_resolved`.

## 13. Metrics hardened against gaming

### 13.1 Required per-round record

```ts
interface SpeculationTelemetryV2 {
  readonly arm: 'on' | 'off'; readonly targetRoundKey: string;
  readonly heuristicMenuSize: number; readonly realizedFlipRank: number | null;
  readonly winningPlanId: string | null; readonly winningGeneration: 0 | 1 | 2 | null;
  readonly planAgeMs: number | null; readonly planAgePlayerTurns: number | null;
  readonly overlapMs: number | null; readonly speculativeTokens: number;
  readonly speculativePlanningWallMs: number; readonly liveRepairWallMs: number;
  readonly rawPerceivedLatencyMs: number | null; readonly cappedLatencyMs: number;
  readonly latencyCensorReason: null | 'NO_ACTION' | 'TIMEOUT' | 'ADJUDICATION' | 'CANCELLED';
  readonly selectedBranch: 'default' | 'specific' | null;
  readonly outcome: SpeculationOutcomeV2;
}
```

`overlapMs = monsterRoundStartedAt - winningPlanQueuedAt` for the plan that supplied the executed branch.
Canceled and abandoned speculation contributes tokens and wall even when it supplies no plan.

### 13.2 Default hit, specific hit, and contingency lift

- `default_hit_rate`: branch 1 matches and validates at final real state.
- `specific_guard_hit_rate`: a Hamming-1 branch matches and validates.
- `overall_hit_rate`: either default or specific hit avoids live repair.
- `counterfactual_default_only_hit_rate`: branch 1 is evaluated at final state even when another branch wins.
- `contingency_lift = overall_hit_rate - counterfactual_default_only_hit_rate`.

Report default and specific counts separately.
A high branch-1 rate proves overlap planning value, not contingency value.

### 13.3 Counterfactual refresh value

At final real state, evaluate every superseded or displaced plan's host scenarios and intents without executing or consuming RNG.
Record whether predecessor and successor would hit, their selected branch, validation result, and existing tactical/regret score.

```text
useful_refresh_rate
= refreshes where successor changes miss->hit
  or improves accepted regret beyond the fixed arena threshold
 / completed_refreshes
```

Also report harmful refreshes where a predecessor hit but successor misses or has worse regret.
Counterfactual evaluation never authorizes a proposal.

### 13.4 Age-, generation-, and regret-conditioning

Condition hit rate, default/specific mix, validator failure, and regret by:

- refresh generation 0/1/2;
- plan-age milliseconds buckets;
- plan-age player-turn counts; and
- overlap-time buckets.

Always publish sample counts.
If phase-start generation 0 performs as well as generations 1/2 within the preregistered paired uncertainty bound, delete opportunistic/late refreshes rather than retaining unearned complexity.

### 13.5 Null-inclusive latency and token efficiency

Perceived latency remains monster-round-start commit to first authoritative monster-action commit.
Raw latency is null when no action occurs, but every eligible round enters aggregate latency using:

```text
cappedLatencyMs = min(rawLatencyMs ?? arenaTimeoutMs, arenaTimeoutMs)
```

Report raw/censored outcomes and null-inclusive median, p90, p95, maximum, and count.
No-action, timeout, adjudication, and cancellation rounds therefore cannot disappear or become zero.

For paired A/B trials:

```text
latency_saved_per_1k_speculative_tokens
= (control_capped_latency_ms - treatment_capped_latency_ms)
 * 1000 / treatment_speculative_tokens
```

Zero-token rows report null efficiency rather than division by zero.
Continue reporting speculative/live/correction/total planning wall, correction rate, auto-resolution, adjudication, session failure, and illegal committed actions (which must remain zero).

## 14. Arena and flywheel A/B

Control uses normal live planning with no background calls.
Treatment uses the host compiler, arbiter, re-admission, and repair design.
Model, effort, CLI, KB, fixture, player policy, RNG, reaction policy, and exhaustion remain paired.

Run balanced interleaved order across fresh sessions, such as `on/off`, `off/on`, `off/on`, `on/off` by deterministic seed assignment.
Never share one conversation across arms.

`SimulatedPlayerPhaseDriver` executes legal commands through the real host/reducer and can produce movement, reach, visibility, HP-band/life, zone, condition/source/level, resource, and concentration changes.
It must also produce all four agent-contention decisions: `legendary_action_window`, `legendary_resistance`, `adjudication_prompt`, and uncovered `reaction_offer`.
Player-policy RNG uses an identical named substream across arms; expected commands and fact changes are hand-authored, never regenerated.

Required scenario families include stable default, each atom kind, ranked single flip, multi-flip repair, actor death, selector change, illegal intent, older-plan re-admission, inferior late-plan rejection while retaining the current plan, both in-flight round-start transitions, every decision preemption class, cancellation SLA expiry, session loss, repair exhaustion, and off control.

Promote only when null-inclusive p95 improves without worsening illegal action, correction, auto-resolution, adjudication, session failure, or accepted regret bounds.

## 15. Security and proof strategy

### 15.1 Structural and mutation proofs

- The host—not the model—owns candidate rank, scenario facts, complements, and branch order.
- Speculative sink imports no reducer, journal append, RNG, or override.
- Ordinary proposal readers reject speculative envelopes.
- Retained old capsules are readable only for bounded speculative-source validation.
- Re-admission cannot replace a better plan or clear the queue on rejection.
- Materialization requires fresh real state and fresh resolution digests.
- Flat vectors are disjoint; duplicate/shadow candidates fail compilation.
- `EngineSelectorRef` uses exact `EngineTargetSelector` plus its required actor context.
- HP call sites use `enginePlanningHitPointMaximum`; temporary HP cannot change HP-band results.
- Sourced conditions and exhaustion levels cannot alias.
- Agent decision work preempts speculation without opening another session.
- Canceled tokens remain observable.
- Retained repair intents are real-state validated and byte-locked.
- Coordinate, free-text, unknown, stale-real-proposal, and actor-mismatch payloads fail closed.

Mutation tests remove each boundary and prove a retained test fails.

### 15.2 Deterministic tests and goldens

Table-test menu ranking, tie breaks, influence radii, `canFlip`, complements, shadow rejection, Hamming vectors, every atom/complement, living-aware HP, max-function use, temp-HP exclusion, condition source/level, resource pools, and concentration.

State-machine tests cover every table row, especially non-dirty round start, recheck re-admission, decision preemption, SLA completion/expiry, token capture, prior-plan retention, and reserved final refresh.

Hand-author goldens for capsule menu, exact branch IDs/order, old-source re-admission, real materialization, actor repair carry-forward, each decision class, and null-inclusive telemetry.
Expected values come from independent fixtures, never production output.

## 16. Migration and Codex increment order

### Increment 1: host scenarios and corrected fact system

Implement/export canonical HP/concentration queries; project zones, conditions, resources; add exact `EngineTargetSelector` references; implement flat atoms/complements, baseline dependency extraction, influence radii, deterministic ranking, shadow rejection, menu/scenario compiler, and v2 submission schema.

Gate on independent atom/menu fixtures, Hamming/disjointness proof, temp-HP/source/level tests, coordinate/free-text mutations, and unchanged ordinary MCP goldens.

### Increment 2: queue, arbitration, re-admission, and repair

Implement retained speculative capsule lookup, quality-key re-admission, prior-plan preservation, `AgentSessionArbiter`, decision queues/preemption, 250 ms yield SLA, all state transitions, plan-relative coverage, turn-position budget, reserved final refresh, real materializer, and actor-keyed repair/carry-forward.

Gate on every transition and contention class, both in-flight round-start cases, usage capture, no parallel session, no plan regression, fresh proposal binding, and unchanged exhaustion/D401 behavior.

### Increment 3: arena and hardened metrics

Implement interleaved legal player/decision turns, heuristic-only measurements, default/specific/lift metrics, counterfactual superseded-plan evaluation, age/generation/regret conditioning, useful refresh, overlap, null-inclusive capped latency, token efficiency, and paired reports.

Gate on identical A/B inputs, complete denominators, no null-to-zero conversion, no hidden canceled tokens, independently reproducible counterfactuals, and safety/regret promotion gates.

This is pre-alpha replacement work: delete the draft recursive guards, custom selector family, global fingerprint, stale-discard path, and generic diff rather than adapting them.

## 17. Acceptance criteria

- Host deterministically advertises at most eight ranked fully formed split candidates from baseline-intent dependencies and unacted-player influence radii.
- Host compiles branch 1 Hamming-0 plus up to three rank-ordered Hamming-1 scenarios; the agent cannot alter guards or order.
- Heuristic menu quality is measurable without agent output.
- Facts are flat, disjoint, shadow-rejected, strict, and use exact `EngineTargetSelector` with actor context.
- HP supports `at_most|above`, requires living subjects, uses only `enginePlanningHitPointMaximum`, and excludes temporary HP.
- Visibility, reaction/legendary/slot availability, concentration, sourced Charmed/Frightened/Grappled, and leveled Exhaustion are typed and tested.
- A contingent plan evaluates against actual round-start state regardless of source revision.
- Re-admission requires unchanged actor set and advertised references and never displaces a better plan or removes the current plan on rejection.
- Both dirty/recheck and non-dirty in-flight round-start transitions cancel/drain, re-admit complete output, count tokens, and abandon only after SLA.
- All four agent-needed player-phase decision kinds preempt speculation through one FIFO/priority arbiter on the same session.
- Plan-relative fingerprints, coverage dry-runs, turn-position budget, and one reserved post-final-turn refresh are enforced.
- No speculation starts after `monster_round_started`, and the boundary is never delayed for a refresh.
- Repair contains exact failed atoms, selector changes, actor-attributed refusals, removed actors, and byte-locked validated retained intents.
- A selected branch is re-resolved against a fresh real capsule; stale real proposals fail closed.
- Failed repair enters unchanged fallback, one correction, deterministic controller, and host-only auto-resolution.
- Metrics separate default hits, specific hits, counterfactual default-only hits, and contingency lift.
- Superseded plans receive non-executing final-state counterfactual evaluation; useful/harmful refreshes are reported.
- Hit and regret are conditioned by plan age, generation, and overlap; the winning generation and `overlapMs` are recorded.
- Null-inclusive capped latency includes every eligible round, and latency saved per 1,000 speculative tokens includes canceled usage.
- Arena exercises every fact, re-admission path, contention class, SLA result, repair path, and speculation-off control.
- Illegal committed actions remain zero and no failure disappears from a denominator.
- Work lands in three independently tested and reviewed Codex increments.

## 18. Open questions for the supervisor

1. Keep `SPECULATION_YIELD_SLA_MS = 250`, or parameterize 100/250/500 ms in the first arena without changing the no-parallel invariant?
2. Is generation 0/1/2 the permanent product budget, or should the flywheel first compare generation 0+reserved-final against all three?
3. What paired uncertainty bound defines “phase-start plans win as often as late plans” and therefore deletes refresh generations 1/2?
4. What fixed regret improvement threshold counts a refresh as useful alongside miss-to-hit conversion?
5. Should difficult-terrain regions ship in the first semantic-zone registry or wait until every region has a stable authored ID?

## 19. Dated dissent notes

No dissent on 2026-08-28. All supervisor-arbitrated round-2 changes are adopted as binding design.

## 17. Supervisor resolutions of the round-1 open questions (2026-08-28)

1. Three speculation resumes per phase is the v1 default; two-vs-three is
   a flywheel A/B, not a design blocker.
2. Difficult-terrain zone kinds DEFERRED until they have stable
   registered IDs; ship the other two kinds in v1.
3. Condition-name presence suffices for v1; typed source selectors follow
   the guard-vocabulary v2 revision.
4. D401 guidance declared inside a speculative plan becomes sticky ONLY
   when that plan (or its branch) is authorized — never from unexecuted
   speculation. Fail-closed.
5. Promotion to default requires: p95 perceived latency improved >=40%
   vs no-speculation arm AND tactical quality non-inferior (refusal/
   auto-resolve rates and judge scores within noise). Owner calibration
   session may tighten this.
6. Ephemeral speculation queue loss on restart is ACCEPTED — speculation
   is a cache; the journal stays authoritative and cold rounds fall back
   to live planning.
