# Phase 2 Implementation Plan — Initiative Segments, Scripted Party, and Delta Adjustment

## Goal

Add an opt-in `initiative_segments_v1` combat model in which:

1. The scripted PC team and DM each create a top-of-round plan.
2. The engine executes the round in true `per_combatant` initiative order.
3. Each PC turn is executed by the existing deterministic party/controller layer.
4. After each PC turn, an engine-computed relevance digest decides whether the DM should be awakened.
5. Material drift opens one constrained `turn_delta` adjustment request covering only monsters that have not acted.
6. Consecutive monster turns execute as one mini-block, retaining the landed per-turn primary → fallback → Dodge re-resolution.
7. The existing monster-block model remains available for same-room arena A/B and remains the default until Phase 2 gates pass.

Phase 3 behavior—LLM PC personas, PC-to-PC communication, human players—is excluded.

## Locally verified current anatomy

| Subsystem | Current anchor and implication |
|---|---|
| Initiative reducer | `src/combat/encounter.ts:368` already defines `per_combatant`; `src/combat/encounter.ts:10373` rolls an individual slot for every combatant. Default remains `shared_enemy` at `src/combat/encounter.ts:474`. |
| Round execution | `src/vtt/engine-round-session.ts:393` owns authoritative state/RNG. `prepareRound()` at `:412` advances to the first monster, skipping PCs. `applyResolvedMechanics()` at `:455` advances to every submitted monster and therefore also skips intervening PCs. |
| Landed live re-resolution | `src/vtt/engine-round-session.ts:455` re-resolves each authorized intent and emits `deviationResolutions`; this must remain the only monster-application path in both models. |
| Capsule request | `src/vtt/engine-state-capsule.ts:98` models only ordinary initial/correction and speculative requests; ordinary requests carry every requested actor. |
| Proposal binding | `src/vtt/engine-envelopes.ts:10` binds proposals to run, branch, request, revision, digest, and phase; `:95` enforces the complete requested actor set. |
| MCP context | `src/vtt/mcp/schemas.ts:106` exposes initial/correction request metadata. `:133` defines anchored `turn_delta`; `src/vtt/mcp/engine-server.ts:497` falls back to full context if the anchor is unavailable or mismatched. |
| MCP submission | `src/vtt/mcp/engine-server.ts:651` requires `engine.submit_round_intents` to contain every requested actor. Correction guidance at `:363` always says to replace the whole round. |
| MCP launcher | `src/vtt/mcp/entrypoint.ts:121` defines `EngineMcpLauncherManifest`; `:260` validates it and `:310` reconstructs the runtime. |
| DM tool profile | `src/vtt/mcp/engine-server.ts:43` defines the five-tool DM surface. Claude’s explicit mirrors are at `src/vtt/agent-adapters/claude-code.ts:17` and `:34`; Codex receives the runtime MCP inventory dynamically. |
| Current correction policy | `src/vtt/turn-exhaustion-coordinator.ts:11` allows one correction. Exhaustion ultimately produces deterministic actor resolutions, which is appropriate for a failed initial plan but not for a failed adjustment. |
| Scripted party | `src/combat/controllers.ts:444` contains deterministic `AlgorithmController` ranking and `:627` can produce priority programs. `src/vtt/survival-harness.ts:114` drives complete encounters with it. |
| Party legal actions | Generic actions are in `src/vtt/regret/legal-actions.ts:205`; loaded-character actions are in `src/vtt/party-pack.ts:3176` and are selected by `src/vtt/d365-sample-dungeon.ts:332`. `src/vtt/d365-sample-party.ts:13` defines the representative party. |
| Plays | `src/vtt/snippets/registry.ts:79` is `plays-v1-runtime-5`; applicability is currently restricted to `phase === 'initial'` at `:357`, `:371`, and `:405`. |
| Conversation driver | `tools/ai-dm-conversation.ts:1252` runs one request per configured round. The initial proposal is dispatched at `:1437`, correction at `:1535`, and authorization immediately applies the entire monster block at `:1592`. |
| Flap policy | The three-attempt, 0–2 retry loop is currently scoped to the round request at `tools/ai-dm-conversation.ts:1437`. |
| Row schema | `ConversationRow` is at `tools/ai-dm-conversation.ts:151`; it already records `rawTurnContext`, granularity, `repoCommit`, session IDs, plan, usage, and chain evidence. |
| Arena | `tools/ai-dm-arena.ts:54` mirrors conversation rows. Its existing `interleave` field at `:47` means interleaving arena arms, not initiative; do not reuse that name. |
| Generation manifests | `tools/rl/generate-data.ts:39` defines `arena-rl-batch-v1`; `:214` fixes Luna low and creates the arena configuration. |
| Training extraction | `tools/rl/extract-sft.ts:12` understands only `arena-rl-capture-v1` and only `engine.submit_round_intents`; adjustment captures must be explicitly separated from initial-plan examples. |
| Persistence | `src/vtt/session-persistence.ts:79` owns engine-host transitions; `:111` is schema version 8 and `:1756` records host-only protocol transitions. |

One important fixture constraint was verified: current frozen arena rooms use synthetic PC initiative bonuses such as 100/70/40. Merely changing `shared_enemy` to `per_combatant` will usually put every PC before every monster and will not exercise genuine alternation.

## Target execution state machine

```text
begin round / roll per-combatant initiative
        |
        +-- build one deterministic scripted-party plan
        +-- obtain and authorize one DM monster plan
        |
walk initiative:
        |
        +-- PC active
        |     execute complete scripted turn
        |     label adherence to party plan
        |     compare before/after plan-relevance digests
        |     if material and monsters remain open:
        |         request constrained DM adjustment using turn_delta
        |
        +-- monster active
              collect maximal consecutive monster segment
              execute segment through live per-turn re-resolution
              stop before the next PC
```

A monster intent becomes closed immediately when that monster’s turn begins. Dead monsters are removed from the open set. No adjustment occurs during a monster mini-block.

## Adjustment protocol v1

### Request model

Extend the ordinary capsule request with a discriminant while retaining the existing phase vocabulary:

```ts
kind: 'round_plan' | 'plan_adjustment'
phase: 'initial' | 'correction'
```

A `plan_adjustment` request additionally carries:

- `parentPlanId` and `baselinePlanHash`.
- `triggerPcTurnId`, before/after revisions, and materiality reason codes.
- `actors`: living monsters whose turns have not started this round.
- Per-open-actor baseline intent digests, not another full suggested plan.
- `adjustmentBudget`: `min(openActorCount, 2)` in v1.

This preserves the meaning of `phase`: an adjustment can itself have one correction without inventing ambiguous phase names.

### Tool surface

Add `engine.submit_plan_adjustment` instead of overloading whole-round submission. Its input contains:

- Exact state/request/phase/idempotency binding.
- Exact `baseline_plan_hash`.
- `updates`, containing zero to `adjustmentBudget` replacement intents.
- Omitted actors implicitly keep their current intent.
- An empty update list is an explicit “keep the remaining plan” decision.

The DM may change only open actors. It may not:

- Add an actor, reopen an executed actor, or update a dead actor.
- Replace the complete remaining plan when more than two actors remain.
- Change initiative, reducer commands, paths, coordinates, dice, or mechanics.
- Change reaction guidance; top-of-round guidance remains sticky.
- Change the scripted party plan.

Initial adjustment replacements may have one fallback. Adjustment corrections require `fallback: null`.

### Refusal and correction behavior

Adjustment validation is per update:

1. Valid replacements are staged.
2. Invalid replacements receive actor-specific refusals.
3. One resumed correction request covers only refused update actors.
4. A successful correction combines corrected and staged updates into one new plan revision.
5. If correction is absent or invalid, staged valid updates are retained and refused actors keep their baseline intents.
6. If no usable update survives, the complete baseline plan remains.
7. Adjustment exhaustion never auto-Dodges. Dodge remains exclusively an execution-time result of primary/fallback re-resolution.

Implement this in a new `src/vtt/adjustment-exhaustion-coordinator.ts`; do not distort `TurnExhaustionCoordinator`, whose deterministic fallback semantics remain correct for initial-plan failure.

### Flap scope

- The initial planning call retains its existing per-round three-attempt budget.
- Every material PC turn receives a fresh adjustment flap key: `room/round/pcTurnOrdinal`.
- A healthy adjustment uses one model call.
- Up to two retries are allowed only when the turn completes with no engine tool activity, proposal, or refusal.
- Three service-null attempts keep the baseline plan and continue combat.
- A flap on one PC turn does not consume retries for the next PC turn.
- Correction refusal/no-response is protocol exhaustion, not a service flap.

## Materiality test: `plan-relevance-v1`

Add `src/vtt/plan-materiality.ts`. Before and after each complete PC turn, compute a canonical relevance record for the remaining monster plan and hash it.

The record includes:

- Open monster actor IDs.
- For every remaining primary and fallback: validity, selected branch, resolved action, resolved target, refusal codes, and movement cost bucketed in 10-foot increments.
- Life state, condition flags, concentration state, and position for open monsters and the union of pre/post resolved targets and explicit engagement anchors.
- Relevant concentration-break and forced-movement events from the PC turn.

Wake the DM when any of these occurs:

1. Any combatant changes life state, including dying/dead transitions.
2. The open monster set changes.
3. Any remaining intent changes validity, selected branch, resolved action, resolved target, refusal codes, or 10-foot movement-cost bucket.
4. An open monster or planned target/anchor gains or loses a mechanically represented condition.
5. Concentration breaks for any combatant.
6. An open monster or planned target/anchor is forcibly displaced by at least 10 feet.
7. A relevant combatant disappears from the board or a referenced semantic zone becomes inactive.

Deliberately ignore in v1:

- Ordinary HP loss/healing that does not change life state or a selector’s resolved target.
- Temporary HP changes alone.
- Voluntary movement under 10 feet unless it changes an intent-resolution signature.
- Forced movement under 10 feet.
- Reaction availability alone unless it changes intent validity.
- Condition changes on combatants unrelated to remaining intents.
- Different legal paths with the same target and movement bucket.
- Narration, hidden-roll presentation, and dice values.
- PC plan deviation by itself when it produces no material state drift.

Persist both digests and explicit reason codes. Never use the whole capsule digest as materiality: every applied command changes it and would wake the DM unconditionally.

## Scripted-party plan and adherence

Add `src/vtt/scripted-party-round.ts` as a small adapter over existing controllers and legal-action providers.

At the top of the round it will:

- Aggregate one `ScriptedPartyPlan` containing a shared objective and one ordered `DecisionProgram` per living PC.
- Use `AlgorithmController.proposeRoundProgram()`; no model call or persona is introduced.
- Use `regretTurnLegalActions` for current generated arena fixtures.
- Permit D365/survival composition to inject `loadedPartyTurnLegalActions`.
- Hash the policy, plan, and per-actor programs for reproducibility.

At each PC turn it materializes legal commands against live state and records:

- `followed`: the planned primary semantic action/target was executed.
- `altered`: the scripted policy deliberately chose another still-legal program.
- `plan_invalidated`: the planned program was no longer legal and a deterministic fallback was used.
- Planned and executed semantic program hashes, actual reducer commands, and reason codes.

Movement path differences alone count as followed when the semantic target and objective are unchanged.

## Dependency-ordered implementation increments

1. **Mechanical: add configuration and era tags.**  
   Files: `tools/ai-dm-conversation.ts`, `tools/ai-dm-arena.ts`, `tools/rl/generate-data.ts`. Add `combatModel: 'monster_block_v1' | 'initiative_segments_v1'`; use `--combat-model`, not the occupied `--interleave`. Default to block.  
   Gate: `tests/unit/tools/ai-dm-conversation.test.ts`, `ai-dm-arena.test.ts`, and `rl-generate-data.test.ts` prove defaults, parsing, propagation, and manifest mismatch on resume.

2. **Define party plan artifacts and deterministic turn runner.**  
   Files: new `src/vtt/scripted-party-round.ts`; reuse `src/combat/controllers.ts`, `src/vtt/regret/legal-actions.ts`, and `src/vtt/party-pack.ts` without changing their block behavior.  
   Gate: new `tests/unit/vtt/scripted-party-round.test.ts`; retain `tests/unit/combat/controllers.test.ts` and `tests/integration/vtt/survival-policy.test.ts`.

3. **Implement and freeze materiality policy.**  
   Files: new `src/vtt/plan-materiality.ts`; use projections from `src/vtt/engine-state-capsule.ts` and the pure resolver.  
   Gate: new `tests/unit/vtt/plan-materiality.test.ts` with one positive and one negative case for every rule above, including 5/10-foot displacement boundaries and HP-only non-triggering.

4. **Add strict initiative-segment primitives.**  
   File: `src/vtt/engine-round-session.ts`. Add begin-round-without-skipping, complete scripted-PC-turn, and strict consecutive-monster-segment methods. Keep `prepareRound()` and `applyResolvedMechanics()` unchanged for block callers. The segment method must assert that it never crosses a PC boundary.  
   Gate: extend `tests/unit/vtt/engine-round-session.test.ts` to prove exact initiative order, no skipped PC, maximal monster mini-blocks, shared RNG determinism, reactions, and unchanged deviation evidence.

5. **Mechanical: extend capsule, envelope, and launcher types.**  
   Files: `src/vtt/engine-state-capsule.ts`, `src/vtt/engine-envelopes.ts`, `src/vtt/mcp/entrypoint.ts`. Add request kind, adjustment metadata, patch envelope, and manifest correlation fields. Preserve old launcher decoding for block mode.  
   Gate: `tests/unit/vtt/engine-state-capsule.test.ts`, `tests/unit/tools/engine-mcp-boundary.test.ts`, and `tests/unit/tools/engine-mcp-server.test.ts`.

6. **Add the constrained MCP adjustment surface.**  
   Files: `src/vtt/mcp/schemas.ts`, `src/vtt/mcp/engine-server.ts`, `src/vtt/agent-adapters/claude-code.ts`, `src/vtt/agent-adapters/local-openai.ts`. Add the tool, request-kind-aware prompts, patch-budget enforcement, and local adapter termination on accepted adjustment. Adjustment contexts expose the current plan summary but no applicable plays or suggested plan.  
   Gate: `tests/unit/tools/engine-mcp-handler.test.ts`, `engine-mcp-golden.test.ts`, `local-openai-conversation.SIMULATED.test.ts`, and `tests/unit/vtt/agent-adapters.SIMULATED.test.ts`.

7. **Implement adjustment correction/exhaustion.**  
   Files: new `src/vtt/adjustment-exhaustion-coordinator.ts`; extend host transitions and strict decoding in `src/vtt/session-persistence.ts`. If resumable interleaved state is persisted, bump schema 8→9 with a lossless v8 migration adding a null interleaved-round field.  
   Gate: new `tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts` plus session export/import/reconstruction tests. Prove partial staging, one correction, keep-on-failure, and idempotent resume.

8. **Gate plays to top-of-round planning.**  
   Files: `src/vtt/snippets/registry.ts`, `src/vtt/mcp/engine-server.ts`. Advertise/expand plays only for `kind: 'round_plan', phase: 'initial'`; reject play expansion during adjustments. Bump runtime to `plays-v1-runtime-6` because observable applicability changes.  
   Gate: extend `tests/unit/vtt/snippets.test.ts` with adjustment capsules while retaining all frozen initial-plan goldens.

9. **Replace immediate application with the interleaved driver.**  
   File: `tools/ai-dm-conversation.ts`. In the new arm only, authorization stores the initial monster plan rather than applying it at `:1592`; then walk initiative, run PCs, test materiality, dispatch adjustments, and execute monster segments. Keep the existing block branch intact.  
   Gate: extend `tests/unit/tools/ai-dm-conversation.test.ts` with scripted multi-PC transcripts covering no-drift, one adjustment, multiple independent adjustment flap scopes, correction, death, and consecutive monsters.

10. **Record the complete Phase 2 trajectory.**  
    Files: `tools/ai-dm-conversation.ts`, `tools/ai-dm-arena.ts`, `tools/rl/generate-data.ts`, `tools/rl/extract-sft.ts`. Add the fields below and teach extraction to separate round-plan and adjustment tasks.  
    Gate: row-shape assertions in `ai-dm-conversation.test.ts` and `ai-dm-arena.test.ts`; manifest totals in `rl-generate-data.test.ts`; v1 compatibility and v2 task separation in `tests/unit/tools/rl-extract-sft.test.ts`.

11. **Add same-room A/B and acceptance gates.**  
    Files: `tools/ai-dm-arena.ts`; new `tests/integration/vtt/ai-dm-combat-model.test.ts`. Allow each arena arm to choose a combat model while receiving the same cloned room. Add a Phase 2 initiative fixture/profile with realistic derived bonuses; do not rewrite existing frozen block fixtures.  
    Gate: prove identical starting room digest, differing execution model, genuine PC/monster alternation, deterministic rerun, and unchanged `tests/integration/vtt/ai-dm-arena-interleave.test.ts`.

12. **Final regression gate.**  
    Run targeted tests above, then `npm run typecheck`, `npm test`, and `npm run build`. Acceptance requires zero changes to existing block golden outputs unless the row gains additive era fields.

## Recording schema

Keep one row per round, preserving the current initial `rawTurnContext` verbatim. Add:

- `combatModel` and `roundProtocolVersion`.
- `initiativeOrder`.
- `partyPolicyHash`, `materialityPolicyHash`, and `adjustmentBudget`.
- `teamPlans.party`: plan ID/hash, shared objective, per-PC planned programs.
- `teamPlans.monsters`: initial proposal ID/hash and authorized intents.
- `pcTurns[]`: actor, initiative index, revisions, planned/executed program hashes, command sequence, adherence label/reasons, before/after relevance digests.
- `adjustments[]`: trigger PC turn, materiality reasons, open actors, request/proposal IDs, baseline/result plan hashes, changed actors, raw context, actual granularity, state bindings, session IDs, usage, tool/model calls, flap retries, refusals/correction chain, and outcome.
- `monsterSegments[]`: actor IDs, revisions, applied plan hash, and `deviationResolutions`.
- Round totals: initial calls, adjustment calls, correction calls, service-null adjustment count, context bytes, and tokens.

Upgrade RL capture to a discriminated v2 shape:

```ts
task: 'round_plan' | 'plan_adjustment'
submissionTool: 'engine.submit_round_intents' | 'engine.submit_plan_adjustment'
```

Every capture retains exact raw context, exact submitted arguments, state digest, request ID, parent plan ID where applicable, `repoCommit`, model/effort, session ID, and protocol/policy hashes. The SFT extractor should continue accepting v1 and must not mix adjustment examples into initial-plan training unless explicitly requested.

## Token economy estimate

For a three-PC arena party, `plan-relevance-v1` should trigger on roughly 20–40% of PC turns: approximately 0.6–1.2 extra healthy DM calls per round. For the five-PC D365 party, expect roughly 1–2. The hard maximum is one opportunity per completed PC turn, but ordinary damage and irrelevant movement deliberately do not trigger it.

Targets to verify in shadow telemetry:

- Median adjustments: ≤1 per three-PC round.
- P90: ≤2.
- Healthy adjustment: one model call and two MCP calls—context plus submission.
- Adjustment context: normally 0.5–4 KiB of delta operations instead of another 10–32 KiB full context.
- Full-context fallback rate: <5%.
- Correction rate: <10% of adjustments.

The persistent model session still carries conversation history; `turn_delta` primarily reduces repeated engine payload and decoding work. Record actual delta/full bytes and input/cache tokens rather than treating these estimates as achieved savings.

## Risks and rollback

- Keep the entire execution change behind `combatModel`; block remains the default during collection.
- Add a separate `adjustmentPolicy: 'disabled' | 'material_v1'` arm so interleaved execution can be measured without DM adjustments.
- Preserve existing block methods and their tests; do not make them wrappers around the new segment coordinator.
- Do not overload arena’s existing `--interleave`, which controls scheduling between experimental arms.
- Synthetic 100/70/40 PC initiative bonuses can falsely “prove” interleaving while producing PC-then-monster blocks. Use a dedicated derived initiative profile for both A/B arms.
- State and RNG must have one owner. PC execution must not instantiate an independently seeded coordinator.
- Persist plan revisions and adjustment correction stages before dispatch so resume cannot duplicate an adjustment or reopen an executed actor.
- Materiality may be too noisy or too quiet. Preserve reason-level telemetry and compare `disabled` versus `material_v1` before changing thresholds.
- Delta anchors may be absent after recovery; full-context fallback is correct, must be recorded, and must not change authorization.
- An adjustment can become stale before authorization. Reject its exact binding and keep the baseline plan; never apply it to a later segment.
- Rollback requires selecting `monster_block_v1`; no schema downgrade or data deletion is required because rows are era-tagged by `repoCommit` and protocol fields.

## Explicitly out of scope

- One LLM persona per PC.
- LLM-generated PC actions or dialogue.
- A PC team communication channel, private messages, or shared conversational memory.
- Human-player turns, latency handling, disconnects, or approval UI.
- DM adjustment after monster turns or inside a monster mini-block.
- Replacing the plays library with dynamic replanning.
- Training or deploying an adjustment-specialist model.
- Changing D&D mechanics, initiative rules, or reaction rules.

## Open questions for the owner

1. **Maximum changed monsters per adjustment?**  
   Recommended default: two. It makes the protocol structurally smaller than a re-plan while execute-time fallback protects all unchanged actors.

2. **How should current arena initiative bonuses be handled?**  
   Recommended default: add a derived, realistic Phase 2 initiative profile and apply it identically to both A/B arms; preserve existing frozen fixtures and block goldens.

3. **When should the default combat model flip?**  
   Recommended default: keep block as default until deterministic integration tests pass and an arena sample shows no authorization regression, median ≤1 adjustment per three-PC round, and <5% full-context fallback.

4. **Should adjustment corrections use the configured escalation model?**  
   Recommended default: no. Resume the same Luna DM session for adjustment and its single correction; escalation would increase cost and weaken attribution for a deliberately small patch.

5. **Should valid staged updates survive when another update exhausts correction?**  
   Recommended default: yes. Commit valid replacements and retain baseline intents only for refused actors; record the outcome as `partially_adjusted`.

6. **Should voluntary 10-foot movement always wake the DM?**  
   Recommended default: no. Wake only when it changes an intent-resolution signature; reserve the unconditional 10-foot threshold for forced displacement of an open actor or planned target.