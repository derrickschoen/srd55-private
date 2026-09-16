# ACTOR-KNOWLEDGE-01 plan lane — gpt-5.6-sol final message

Session 01a0a1e7-4ac2-7930-9d26-827b39faaed9; log .tmp/runs/fanout/plan-actor-knowledge-r1.log. Plan at dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md (599 lines, sha cb43b354d2221c3979baf266379518ef2c0a6af1265d5c02d2f30f0d8c9a6903).

Created [2026-09-14-actor-knowledge-single-producer-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md).

Report:

- `wc -l -c`: `599 39155`
- Plan SHA-256: `cb43b354d2221c3979baf266379518ef2c0a6af1265d5c02d2f30f0d8c9a6903`
- Review batches: 3 (`B1=9`, `B2=10`, `B3=3`)
- Distinct planned files: 22
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Typechecks: app `0`, node `0`
- Discovery: 641 files, 641 unique
- Focused baseline: actor-knowledge spec passed, 1 file and 8 tests
- Lines over 120 characters: 0

`git status --short --untracked-files=all` produced no output because `.gitignore:32` ignores `.tmp-*`. No tracked file changed. The confirming ignored-status command reported exactly:

```text
!! .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
```

Pins moved:

| Pin | Planned move |
|---|---|
| Intel actor-knowledge policy | v4 → v5 |
| MCP wire policy | literal → derived `+wire-v1` |
| JSON schema consts | derived wire value |
| Actor-knowledge unit pins | v4 → v5 |
| Footprint projection pin | v4 → v5 |
| Last-seen shape | add recency and safe loss evidence |
| Symmetric evaluator | v1 → v2 |
| Symmetric evaluator test | evaluator and intel pins |
| Scripted-party policy | v5 plus imported evaluator identity |
| Legacy-invariance formula | imported evaluator identity |
| Conversation manifest/rows | intel v5 |
| Creature-space register | intel v5 and derived wire |
| Engine context | new wire tag and complete shape |
| Trimmed context | derived empty tag |
| Prose renderer | recency and cause-safe wording |
| Board-delivery normalization | new tag/block; existing hash retained |
| MCP handler | expanded schema-valid wire |

Offers overlap:

- Shared changed file: `src/vtt/mcp/engine-server.ts`.
- Offers touches imports, dependency/query closure, capsule cache, application setup, and blind wiring.
- This unit replaces `actorKnowledgeReports`, removes cached actor rows, and serializes projections after `required` is known.
- Offers alone changes `mcp/entrypoint.ts:337-465`, `545-692`, and `1036-1256`.
- This unit alone changes `mcp/schemas.ts:39`, `448-482`, `922`, and `998-1000`.
- The plan requires rebasing onto landed OFFERS-IMPL-S3-BUILDER and resolving by symbols rather than replaying line patches.

ACTOR KNOWLEDGE PLAN DONE
diff --git a/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
new file mode 100644
index 0000000000000000000000000000000000000000..abae8293c34ba356ac1e26c815516d956deea5b4
--- /dev/null
+++ b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
@@ -0,0 +1,599 @@
+# ACTOR-KNOWLEDGE-01 — one actor-knowledge producer
+
+Date: 2026-09-14.
+Base verified: detached `40f04e2cad4d5d5e170d6caf0adb033e14252990`.
+Worktree: `/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff`.
+Prerequisite: implement only after OFFERS-IMPL-S3-BUILDER lands on `main`.
+Scope: make `projectActorKnowledge` the sole answer to what an actor knows about each living enemy.
+Scope: make the MCP `actor_knowledge` block a lossless snake-case serializer over that answer.
+Scope: keep the MCP turn context on the DM channel and keep actor knowledge off every player board channel.
+Frozen file: `src/vtt/intel/contracts.ts` must remain byte-identical.
+Frozen sha256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
+
+## 1. Verified facts on 40f04e2c
+
+### 1.1 Repository and authority
+
+Verified command: `git rev-parse HEAD`.
+Verified result: `40f04e2cad4d5d5e170d6caf0adb033e14252990`.
+Verified command: `git status --short --untracked-files=all`.
+Verified result before this plan: no output.
+Verified command: `sha256sum src/vtt/intel/contracts.ts`.
+Verified result: the frozen sha256 above.
+Verified command: `sed -n '22535,22625p'` against the main repository decisions file.
+Verified result: D617.5 requires one environment builder imported by all consumers.
+Verified result: D625 requires one actor-knowledge producer and a wire serializer over it.
+Verified result: D625 orders this unit after OFFERS-IMPL-S3-BUILDER because `engine-server.ts` overlaps.
+
+### 1.2 The intel projection is the stronger current model
+
+Verified: `ACTOR_KNOWLEDGE_POLICY` is `actor-knowledge-last-seen-v4` at
+`src/vtt/intel/actor-knowledge.ts:29-32`.
+Verified: the perceived arm owns position, size, placement mode, footprint, distance, conditions, AC, HP,
+reciprocal visibility, and reaction knowledge at `src/vtt/intel/actor-knowledge.ts:42-59`.
+Verified: the suspected and unknown arms currently own only `lastSeen` at
+`src/vtt/intel/actor-knowledge.ts:61-73`.
+Verified: `unlocatedTarget` reads `state.observationHistory` at
+`src/vtt/intel/actor-knowledge.ts:102-127`.
+Verified: target selection uses `combatantsAreAllies` at `src/vtt/intel/actor-knowledge.ts:240-243`.
+Verified: complete-footprint fog causes unlocated knowledge at
+`src/vtt/intel/actor-knowledge.ts:261-265`.
+Verified: partial-footprint fog remains locatable by the `every` predicate at the same lines.
+Verified: `seen` and `located` both become `perceived` at
+`src/vtt/intel/actor-knowledge.ts:267-289`.
+Verified: `located` withholds conditions, AC, and HP at `src/vtt/intel/actor-knowledge.ts:270-286`.
+Verified: the projection sorts target IDs at `src/vtt/intel/actor-knowledge.ts:290-297`.
+Verified: the exact policy-return type is pinned at `src/vtt/intel/actor-knowledge.ts:300-303`.
+
+### 1.3 Observation history already contains safe recency
+
+Verified: `CombatantObservation` contains observer, subject, cell, round, and revision at
+`src/combat/encounter.ts:807-813`.
+Verified: observation history is canonical per observer-subject pair at
+`src/combat/encounter.ts:2256-2274`.
+Verified: history refresh reads a subject token only when the observer sees it at
+`src/combat/encounter.ts:2283-2300`.
+Verified: complete fog prevents a history refresh at `src/combat/encounter.ts:2291-2292`.
+Verified: a refresh records the current round and pre-command revision at
+`src/combat/encounter.ts:2293-2299`.
+Verified: `reduceEncounter` reconciles history before incrementing revision at
+`src/combat/encounter.ts:12925-12944`.
+Verified: the reducer reconciles history again after the command at
+`src/combat/encounter.ts:12953-12965`.
+Verified consequence: an immediately witnessed loss has observation revision `state.revision - 1`.
+Verified consequence: round and revision can express recency without changing persisted state.
+
+### 1.4 The wire is presently a second producer
+
+Verified: `ENGINE_ACTOR_KNOWLEDGE_POLICY` is independently retyped at
+`src/vtt/mcp/schemas.ts:39`.
+Verified: the wire schema omits perceived position, conditions, AC, HP, reciprocal visibility, and reaction at
+`src/vtt/mcp/schemas.ts:448-475`.
+Verified: the wire currently preserves camel-case `lastSeenPosition` at
+`src/vtt/mcp/schemas.ts:465-468`.
+Verified: `actorKnowledgeReports` walks all combatants and all targets at
+`src/vtt/mcp/engine-server.ts:1109-1121`.
+Verified: it selects enemies through `queries.sameSide` at `src/vtt/mcp/engine-server.ts:1119-1121`.
+Verified: it calculates distance before knowing whether the target is perceived at
+`src/vtt/mcp/engine-server.ts:1122-1124`.
+Verified: it uses `queries.visibility` and accepts only `visible === true` at
+`src/vtt/mcp/engine-server.ts:1132-1143`.
+Verified: `EngineQueryPort.visibility` means visible only for detection kind `seen` at
+`src/vtt/engine-query-port.ts:1882-1897`.
+Verified: the wire has no fog decision in `actorKnowledgeReports` at
+`src/vtt/mcp/engine-server.ts:1109-1165`.
+Verified: the wire reads `capsule.projection.observationHistory` at
+`src/vtt/mcp/engine-server.ts:1144-1159`.
+Verified: `CapsuleIntelReports` stores untyped actor-knowledge rows at
+`src/vtt/mcp/engine-server.ts:298-305`.
+Verified: `capsuleIntelReports` computes all monster reports at
+`src/vtt/mcp/engine-server.ts:1314-1338`.
+Verified: full context filters those precomputed reports to `required` later at
+`src/vtt/mcp/engine-server.ts:1953-1959`.
+
+### 1.5 The canonical ally and actor filters already exist
+
+Verified: `combatantsAreAllies` compares canonical factions at `src/combat/allies.ts:39-49`.
+Verified: summon ownership affects canonical side at `src/combat/allies.ts:19-37`.
+Verified: `EngineQueryPort.sameSide` delegates to `combatantsAreAllies` today at
+`src/vtt/engine-query-port.ts:1850`.
+Verified: entrypoint selects living monster IDs at `src/vtt/mcp/entrypoint.ts:454-460`.
+Verified: entrypoint rejects empty, duplicate, non-living, or non-monster request actors at
+`src/vtt/mcp/entrypoint.ts:461-464`.
+Verified: full context narrows the already-validated request actor set at
+`src/vtt/mcp/engine-server.ts:1731-1748`.
+
+### 1.6 Consumers and pins
+
+Verified: `symmetric-pc-evaluator.ts` imports and calls `projectActorKnowledge` at lines 27-30 and 335.
+Verified: its public output embeds both the projection and its policy at lines 66-75 and 361-370.
+Verified: its own policy is `symmetric-pc-evaluator-v1` at line 41.
+Verified: `scripted-party-round.ts` hashes a retyped evaluator label at lines 430-438.
+Verified: `tools/ai-dm-conversation.ts` imports the intel policy at line 161.
+Verified: its RL manifest records that imported policy at lines 346-358 and 2133-2145.
+Verified: the MCP turn context is the DM channel under `EngineMcpToolProfile` at
+`src/vtt/mcp/engine-server.ts:196` and application setup at lines 1424-1477.
+Verified: player boards are distinct entrypoint artifacts at `src/vtt/mcp/entrypoint.ts:280-298`.
+Verified command: `rg -n` for both current actor-knowledge policy literals across `src tests tools docs`.
+Verified result: 22 literal occurrences require review, replacement, or an explicit no-change decision.
+Verified: both wire schema consts occur at `docs/specs/engine-turn-context.schema.json:251,872`.
+Verified: the wire target JSON schema occurs at lines 4032-4272.
+Verified: the current schema uses camel-case `sizedFor` and `lastSeenPosition` at lines 4124 and 4218.
+Verified: generated-schema equality is enforced at `tests/unit/tools/engine-mcp-handler.test.ts:1095-1103`.
+
+### 1.7 Current tests and discovery
+
+Verified command: `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false`.
+Verified result: exit 0 with zero diagnostics.
+Verified command: `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false`.
+Verified result: exit 0 with zero diagnostics.
+Verified precondition: both `tsBuildInfoFile` values are under `/tmp`.
+Verified app path: `/tmp/dnd-multiclass-spells-static-app.tsbuildinfo`.
+Verified node path: `/tmp/dnd-multiclass-spells-static-node.tsbuildinfo`.
+Verified command: `npx vitest list --configLoader runner --filesOnly --json`.
+Verified result: 641 entries and 641 unique files.
+Verified command: `npx vitest run --configLoader runner tests/unit/vtt/actor-knowledge.test.ts`.
+Verified result: 1 file passed and 8 tests passed.
+Verified: existing projection fog cases are at `tests/unit/vtt/actor-knowledge.test.ts:182-227`.
+Verified: the existing never-observed case is at `tests/unit/vtt/actor-knowledge.test.ts:229-245`.
+Verified: the existing wire last-seen expectation is at
+`tests/unit/vtt/engine-context-integrations.test.ts:248-261`.
+Verified: the current prose last-seen expectation is at `tests/unit/vtt/prose-renderer.test.ts:263-289`.
+Verified: the board-delivery byte/hash normalization is at
+`tests/unit/tools/ai-dm-board-delivery.test.ts:669-682`.
+Verified: the structured handler checks actor-knowledge footprints at
+`tests/unit/tools/engine-mcp-handler.test.ts:775-800`.
+Verified: intel-off arena delivery forbids `actor_knowledge` at
+`tests/unit/tools/ai-dm-arena.test.ts:1372-1402`.
+Verified: both policy families are pinned in `tests/unit/combat/creature-space.test.ts:383-411`.
+
+### 1.8 SRD facts that constrain the knowledge model
+
+Verified command: `python3 .ai/rules/srdgrep.py 'frigid beam'`.
+Verified source: `docs/srd/source/spell-descriptions.txt:3551`.
+Verified rule: Ray of Frost is a visible blue-white beam and a ranged spell attack.
+Verified command: `python3 .ai/rules/srdgrep.py 'Invisible [Condition]'`.
+Verified source: `docs/srd/full/srd-5.2.1.txt:11838-11853`.
+Verified rule: Invisible conceals the subject and changes affected attacks.
+Verified rule: the Invisible condition text does not tell observers what effect caused it.
+Verified command: `python3 .ai/rules/srdgrep.py 'You teleport to a location within range'`.
+Verified source: `docs/srd/source/spell-descriptions.txt:9` for Dimension Door.
+Verified rule: Dimension Door states relocation but supplies no universal visible teleport cue.
+Verified command: `python3 .ai/rules/srdgrep.py 'Briefly surrounded by silvery mist'`.
+Verified source: `docs/srd/source/spell-descriptions.txt:7896` for Misty Step.
+Verified rule: Misty Step has a perceivable silvery-mist cue specific to that effect.
+Verified command: `python3 .ai/rules/srdgrep.py 'hide yourself'`.
+Verified source: `docs/srd/full/srd-5.2.1.txt:11775-11802`.
+Verified rule: Hide requires being outside enemy line of sight and then grants Invisible while hidden.
+Verified conclusion: a generic producer cannot expose an exact cause without effect-specific perception evidence.
+
+### 1.9 Offers-plan overlap input
+
+Verified file read: the one permitted sibling plan at sha256
+`fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`.
+Verified size: 999 lines and 79,457 bytes.
+Verified: offers B2 changes `engine-server.ts` and `entrypoint.ts`.
+Verified: offers B14 changes `engine-server.ts` again.
+Verified: offers B18 changes `engine-server.ts` again.
+Verified: offers B13 and B15 change `entrypoint.ts` again.
+Verified: the offers manifest does not change `mcp/schemas.ts`.
+
+## 2. Proposed final knowledge contract
+
+### 2.1 One producer
+
+Proposed: `projectActorKnowledge(state, actorId)` remains the only semantic producer.
+Proposed: all enemy, life, ally, placement, fog, detection, and observation-history decisions remain there.
+Proposed: no MCP actor-knowledge function calls `queries.visibility` or `queries.sameSide`.
+Proposed: no MCP actor-knowledge function calls `queries.spaceDistance`.
+Proposed: no MCP function reads combatants, fog, tokens, or observation history to classify a target.
+Proposed: the wire receives only `ActorKnowledgeProjection` values and serializes them.
+Proposed: target switches are exhaustive and have no default arm.
+Proposed: the wire never repairs, enriches, or second-guesses a projection.
+
+### 2.2 Unlocated knowledge
+
+Proposed: keep the `suspected` arm only when an actor-owned observation exists.
+Proposed: keep the `unknown` arm only when no actor-owned observation exists.
+Proposed: extend resolved `lastSeen` with `observedAt: { round, revision }`.
+Proposed: extend resolved `lastSeen` with `age: { rounds, revisions }`.
+Proposed: calculate age from the current state and the canonical observation.
+Proposed: reject a future-dated observation with `RangeError` rather than clamp or guess.
+Proposed: add a closed `lossOfContact` result to resolved `lastSeen`.
+Proposed perceived shape: `{ status: 'perceived', reason: 'sudden_loss_of_contact' }`.
+Proposed unresolved shape: `{ status: 'unresolved', reason: 'transition_not_observed' }`.
+Proposed: mark loss perceived only when observation revision equals `state.revision - 1`.
+Proposed: this means the actor perceived the target immediately before the current loss of location.
+Proposed: older or synthetic history still gives last-seen recency but not a witnessed-transition claim.
+Proposed: do not expose an engine cause such as `teleportation`, `invisibility`, or `hiding`.
+Proposed: do not expose the current token, destination, distance, or footprint of an unlocated target.
+Proposed: the recent cell plus zero-round and one-revision age expresses “a moment ago.”
+Proposed: the generic loss marker supports a reasonable area-effect choice without asserting a real position.
+Proposed: no suspicion radius is invented because generic teleport distance is not bounded by one rule.
+Proposed: this design uses existing observation history and requires no persistence migration.
+Proposed: this design requires no change to `src/vtt/intel/contracts.ts`.
+
+### 2.3 The owner's hand-authored scenario
+
+Proposed fixture: a sorcerer visibly casts Ray of Frost at the observing monster.
+Proposed fixture: history records the sorcerer at cell `(2, 1)`, round 3, revision 17.
+Proposed fixture: the resulting state is round 3, revision 18, and the sorcerer is unlocated.
+Proposed invisibility variant: the engine truth retains the token and applies Invisible.
+Proposed teleport variant: engine truth moves the token to a different unperceived cell.
+Proposed: the two projection expectations are byte-for-byte identical apart from fixture identity.
+Proposed: the two wire expectations are byte-for-byte identical apart from fixture identity.
+Proposed projection expectation: `kind: 'suspected'` with only the old cell and observation recency.
+Proposed projection expectation: `age` is `{ rounds: 0, revisions: 1 }`.
+Proposed projection expectation: loss is perceived as `sudden_loss_of_contact`.
+Proposed projection expectation: neither current position nor exact cause exists anywhere in the object.
+Proposed wire expectation: the same facts use snake-case names and no extra facts.
+Proposed prose expectation: the monster saw the sorcerer there one revision ago and suddenly lost contact.
+Proposed prose expectation: the text says the exact cause is unknown.
+Proposed: the test never regenerates either expected object from production output.
+
+### 2.4 Which existing rules win
+
+Proposed: intel's `seen | located -> perceived` rule wins.
+Justification: `located` mechanically establishes the position and footprint even when sight details are unavailable.
+Proposed: a located wire target includes position, footprint, size, mode, and distance.
+Proposed: a located wire target retains unknown AC and HP and an empty visible-condition list.
+Proposed: intel's complete-footprint fog downgrade wins.
+Justification: fog is an explicit map-level redaction already applied by the semantic producer.
+Proposed: intel's partial-footprint rule wins and keeps the whole creature locatable.
+Proposed: `combatantsAreAllies` is the one ally rule.
+Justification: it follows summon ownership and canonical factions at `src/combat/allies.ts:19-49`.
+Proposed: `state.observationHistory` is the one observation-history source.
+Justification: it is reducer-owned, actor-keyed, canonical, and already contains safe recency.
+Proposed: the capsule's clone is transport data and never becomes a competing semantic authority.
+
+### 2.5 Exact wire contract
+
+Proposed: `ENGINE_ACTOR_KNOWLEDGE_POLICY` derives from the intel constant.
+Proposed expression: `` `${ACTOR_KNOWLEDGE_POLICY}+wire-v1` ``.
+Proposed intel value: `actor-knowledge-last-seen-v5`.
+Proposed wire value: `actor-knowledge-last-seen-v5+wire-v1`.
+Proposed: an intel semantic bump automatically changes the wire prefix.
+Proposed: bump `wire-v1` only for serialization naming, shape, or selection changes without an intel semantic change.
+Proposed: never retype the full wire literal in production.
+Proposed: export inferred wire row types from `mcp/schemas.ts` for the serializer return types.
+Proposed: top-level `policy` represents each projection policy once rather than repeating it per actor.
+Proposed: `actors` contains only the already-validated `required` monster IDs the DM is playing.
+Proposed: sort those actor IDs before projection and serialization.
+Proposed: do not walk `state.combatants` again to find actors or targets.
+Proposed: serialize `actorId` as `actor_id` and `targetId` as `target_id`.
+Proposed: serialize every perceived field and withhold none.
+Proposed perceived fields: `position`, `effective_size`, `placement_mode`, `footprint`, and `distance_feet`.
+Proposed perceived fields: `conditions`, `armor_class`, `hit_points`, `reciprocal_visibility`, and `reaction`.
+Proposed: serialize `sizedFor` as `sized_for`.
+Proposed: serialize `targetCanSeeActor` as `target_can_see_actor`.
+Proposed: serialize `lastSeenPosition` as `last_seen_position`.
+Proposed: serialize `observedAt` as `observed_at`.
+Proposed: serialize `lossOfContact` as `loss_of_contact`.
+Proposed: status, reason, kind, band, row, column, round, and revision need no spelling change.
+Proposed: serialize placement-pending fields without enrichment.
+Proposed: serialize never-observed fields without enrichment.
+Proposed: clone arrays and cells so the wire cannot alias projection-owned values.
+
+### 2.6 Engine-server restructuring
+
+Proposed: remove `actorKnowledge` from `CapsuleIntelReports`.
+Proposed: remove actor knowledge from `capsuleIntelReports` and its digest-wide precomputation.
+Proposed: replace the current producer with a typed serializer over `ActorKnowledgeProjection`.
+Proposed: add one exhaustive serializer for `ActorTargetKnowledge`.
+Proposed: call `projectActorKnowledge(state, actorId)` exactly once per selected DM actor.
+Proposed: perform that call after `required` is known in `fullTurnContext`.
+Proposed: use the derived top-level tag for full, trimmed, suppressed, and delta contexts.
+Proposed: retain existing cap behavior that may replace the actors array with `[]`.
+Proposed: do not pass `queries` or `capsule` into the actor-knowledge serializer.
+Proposed: keep unrelated visibility calls for tactical options and threats outside the knowledge serializer.
+
+### 2.7 Downstream semantic versions
+
+Proposed: bump `SYMMETRIC_PC_EVALUATOR_POLICY` to `symmetric-pc-evaluator-v2`.
+Justification: `SymmetricPcDecision` publicly embeds the changed projection and policy.
+Proposed: import that evaluator constant into `scripted-party-round.ts` for its policy-hash controller field.
+Proposed: bump `SCRIPTED_PARTY_POLICY_VERSION` to `scripted-party-policy-v5-actor-knowledge`.
+Justification: its default controller identity and observable policy hash change.
+Proposed: retain `ScriptedPcDecisionPolicy` value `symmetric_evaluator_v1` as the selectable algorithm family name.
+Justification: the selection enum names the route, while the evaluator constant versions its semantics.
+Proposed: do not bump the engine capsule schema.
+Justification: the capsule does not embed `ActorKnowledgeProjection` and observation history does not change.
+Proposed: do not bump session or replay schemas.
+Justification: no persisted field changes.
+
+## 3. Hand-authored test matrix
+
+Proposed: add `tests/unit/vtt/actor-knowledge-wire.test.ts` as one new discovered spec.
+Proposed: each row has an independently written projection expectation and wire expectation.
+Proposed: each wire assertion executes `engine.get_turn_context` through the real runtime and schema.
+Proposed: no test calls a production serializer to construct its expected value.
+Proposed: no retained expectation is regenerated from the new output.
+
+| Fixture | Projection invariant | Wire invariant |
+|---|---|---|
+| Tremorsense located | perceived position; AC/HP unknown | same facts present in snake case |
+| Fully fogged | unknown or prior last-seen only | no current position or footprint |
+| Partially fogged Large | perceived with full footprint | exact full footprint and position |
+| Sorcerer invisible | recent suspected; generic loss | same recency; no exact cause |
+| Sorcerer teleported | identical safe knowledge | identical safe wire knowledge |
+| Placement pending | exact pending reason only | exact pending reason only |
+| Never observed | typed unresolved basis | typed unresolved basis |
+| Summoned enemy-side profile | canonical faction decides | same target set as projection |
+
+Proposed: tremorsense uses a hand-authored sense and blocked sight so detection is exactly `located`.
+Proposed: fully fogged uses a one-cell target with its complete footprint fogged.
+Proposed: partially fogged uses a Large target with exactly one of four cells fogged.
+Proposed: the teleport fixture puts engine truth at a unique decoy coordinate.
+Proposed: exact-object and recursive-coordinate assertions prohibit that decoy from either output.
+Proposed: the invisibility fixture asserts no `invisibility` reason is emitted.
+Proposed: the teleport fixture asserts no `teleportation`, spell ID, destination, or current distance is emitted.
+Proposed: the summon fixture uses an ownership effect so profile kind and canonical faction disagree.
+Proposed: player-channel coverage serializes the player board and asserts `actor_knowledge` is absent.
+Proposed: prose coverage asserts recency and generic loss while forbidding both exact cause words.
+
+## 4. Mutation ledger
+
+| Mutant | Required red | Killing test or gate |
+|---|---|---|
+| WIRE_RECOMPUTES_VISIBILITY | serializer calls `queries.visibility` | architecture negative fixture |
+| WIRE_IGNORES_FOG | wire reclassifies fully fogged target | wire matrix `honors complete fog` |
+| WIRE_DROPS_LOCATED | located target becomes suspected | wire matrix `serializes tremorsense location` |
+| ALLY_RULE_DIVERGES | profile kind replaces canonical faction | matrix `uses summon-owner faction` |
+| TAG_NOT_DERIVED | schemas retype a full wire literal | tag relation test plus architecture gate |
+| RECENCY_DROPPED | age or observation time disappears | matrix `retains one-revision recency` |
+| TRUTH_LEAK | unlocated wire emits real destination | matrix `never emits teleport destination` |
+
+Proposed: apply each mutant to the smallest production edit that represents the defect.
+Proposed: run its named killer and record the failing assertion or architecture diagnostic.
+Proposed: restore the production file and rerun the killer green.
+Proposed: record mutant name, changed file, red command, red excerpt, restored sha, and green command.
+Proposed: do not accept a mutant killed only by a snapshot or by a changed policy string.
+Proposed: do not accept a mutant killed only by TypeScript when the claimed witness is behavioral.
+
+## 5. Architecture enforcement
+
+Proposed: add `scripts/check-actor-knowledge-architecture.mjs` using the TypeScript AST.
+Proposed: expose a pure violation finder so unit tests can supply source strings without filesystem tricks.
+Proposed: scan `src/vtt/**/*.ts` in CLI mode from `scripts/check-command-outcomes.sh`.
+Proposed: exempt semantic raw-fact use only in `src/vtt/intel/actor-knowledge.ts`.
+Proposed: inspect functions and initializers whose names or output keys identify actor knowledge.
+Proposed forbidden calls there: `queries.visibility`, `queries.sameSide`, and `queries.spaceDistance`.
+Proposed forbidden calls there: `detectCombatant` and `combatantsAreAllies` outside the canonical producer.
+Proposed forbidden reads there: `.combatants`, `.tokens`, `.foggedCells`, and `.observationHistory`.
+Proposed: forbid a second declaration or export named `projectActorKnowledge` outside the canonical file.
+Proposed: require engine actor-knowledge assembly to call `projectActorKnowledge`.
+Proposed: require schemas to derive the wire tag from `ACTOR_KNOWLEDGE_POLICY` and `wire-vN`.
+Proposed: permit unrelated tactical helpers in the same module to call visibility or scan combatants.
+Proposed: report file, line, semantic owner, and forbidden primitive for every violation.
+
+Positive fixture `CANONICAL_PRODUCER_OWNS_RAW_FACTS` allows raw facts in the canonical producer path.
+Positive fixture `UNRELATED_TACTICAL_VISIBILITY_ALLOWED` allows visibility in a non-knowledge helper.
+Positive fixture `WIRE_SERIALIZES_PROJECTION` accepts an exhaustive projection-only serializer.
+Negative fixture `WIRE_RECOMPUTES_VISIBILITY` calls `queries.visibility` in actor-knowledge assembly.
+Negative fixture `WIRE_RECOMPUTES_ALLIES` calls `queries.sameSide` in actor-knowledge assembly.
+Negative fixture `WIRE_READS_DETECTION` calls `detectCombatant` outside the canonical file.
+Negative fixture `WIRE_READS_HISTORY` reads `.observationHistory` in actor-knowledge assembly.
+Negative fixture `WIRE_READS_FOG` reads `.foggedCells` in actor-knowledge assembly.
+Negative fixture `WIRE_WALKS_COMBATANTS` reads `.combatants` in actor-knowledge assembly.
+Negative fixture `SECOND_KNOWLEDGE_PRODUCER` declares `projectActorKnowledge` in another module.
+Negative fixture `TAG_NOT_DERIVED` initializes the wire policy from a full string literal.
+
+## 6. Pins moved and independent invariants
+
+| File and pin | Move | Independent invariant paired with the move |
+|---|---|---|
+| `intel/actor-knowledge.ts:30,301` | intel v4 to v5 | direct recency and no-truth tests |
+| `mcp/schemas.ts:39` | literal to derived `+wire-v1` | source gate and runtime relation |
+| `engine-turn-context.schema.json:251,872` | derived wire value | Zod-to-JSON equality test |
+| `actor-knowledge.test.ts:46,93` | intel v4 to v5 | exact visible, fog, and history rows |
+| `footprint-increment-three.test.ts:182` | intel v4 to v5 | independently computed nearest-cell distance |
+| `last-seen.test.ts:237-249` | resolved shape gains recency | hidden coordinate non-disclosure |
+| `symmetric-pc-evaluator.ts:41,325` | evaluator v1 to v2 | selection still uses projected facts only |
+| `symmetric-pc-evaluator.test.ts:67-72` | evaluator and intel pins | hand-computed movement optimum |
+| `scripted-party-round.ts:25,56,435` | party v5 and imported evaluator v2 | canonical policy-hash derivation |
+| `ai-dm-legacy-invariance.test.ts:640-647` | imported evaluator identity | unchanged independent hash formula |
+| `ai-dm-conversation.test.ts:2231-2309` | intel v5 in manifest/rows | hand-computed AC, HP, and distance rows |
+| `creature-space.test.ts:389-408` | intel v5 and derived wire | registered-surface extraction plus relation |
+| `engine-context-integrations.test.ts:252-261` | new wire tag and shape | exact real turn-context knowledge |
+| `engine-context-integrations.test.ts:420` | derived empty tag | hard byte cap and empty actors |
+| `prose-renderer.test.ts:263-289` | new wire and recency text | exact safe sentence and cause prohibition |
+| `ai-dm-board-delivery.test.ts:669-682` | new tag/normalizer | retain old independent 32,000-byte hash oracle |
+| `engine-mcp-handler.test.ts:775-800` | expanded exact wire | output-schema validation and no forbidden keys |
+
+Proposed: keep the existing board-delivery baseline hash unchanged.
+Proposed: normalize the entire actor-knowledge block to its hand-authored legacy block before that comparison.
+Proposed: independently assert the new actor-knowledge block before normalization.
+Proposed: never paste a newly observed full-output hash into the test.
+Proposed: `tools/ai-dm-conversation.ts` needs no tag edit because it already imports the intel constant.
+Proposed: `tests/unit/tools/ai-dm-arena.test.ts` needs no pin edit because its invariant is absence in intel-off mode.
+Proposed: run that arena spec because it is a wire behavior consumer.
+Proposed: engine capsule schema remains at 4 because it does not embed the changed projection.
+Proposed: no capsule policy pin moves.
+
+## 7. Compile-safe review batches
+
+The implementation tranche contains three ordered review batches.
+Each batch changes at most ten files.
+The manifest contains 22 distinct files.
+No file appears in more than one batch.
+Every batch ends with both no-emit TypeScript projects green.
+Every batch is reviewed as a cumulative tree.
+
+### B1 — projection semantics and downstream semantic identities (9 files)
+
+- `src/vtt/intel/actor-knowledge.ts`
+- `tests/unit/vtt/actor-knowledge.test.ts`
+- `tests/unit/vtt/last-seen.test.ts`
+- `src/vtt/symmetric-pc-evaluator.ts`
+- `tests/unit/vtt/symmetric-pc-evaluator.test.ts`
+- `src/vtt/scripted-party-round.ts`
+- `tests/unit/vtt/footprint-increment-three.test.ts`
+- `tests/unit/tools/ai-dm-conversation.test.ts`
+- `tests/unit/tools/ai-dm-legacy-invariance.test.ts`
+
+Proposed B1: add recency and loss-of-contact types in `actor-knowledge.ts` only.
+Proposed B1: preserve the existing perceived and placement-pending semantics.
+Proposed B1: bump intel, evaluator, and scripted-party semantic identities.
+Proposed B1: update only hand-authored dependent expectations.
+Proposed B1 tests: actor knowledge, last seen, footprint, symmetric evaluator, conversation, and legacy invariance.
+
+### B2 — wire serializer, schema, renderer, and full-path fixtures (10 files)
+
+- `src/vtt/mcp/schemas.ts`
+- `src/vtt/mcp/engine-server.ts`
+- `docs/specs/engine-turn-context.schema.json`
+- `src/vtt/renderer-profile.ts`
+- `tests/unit/vtt/engine-context-integrations.test.ts`
+- `tests/unit/vtt/prose-renderer.test.ts`
+- `tests/unit/vtt/actor-knowledge-wire.test.ts`
+- `tests/unit/tools/engine-mcp-handler.test.ts`
+- `tests/unit/combat/creature-space.test.ts`
+- `tests/unit/tools/ai-dm-board-delivery.test.ts`
+
+Proposed B2: derive the wire tag and define the exact snake-case schema.
+Proposed B2: replace the second producer with an exhaustive typed serializer.
+Proposed B2: calculate projections only for the selected DM actor set.
+Proposed B2: regenerate the checked-in JSON schema from Zod.
+Proposed B2: render safe recency and generic loss in prose.
+Proposed B2: add the eight-row hand-authored projection/wire matrix.
+Proposed B2 tests: all six listed specs plus schema generation equality.
+
+### B3 — architecture gate and self-test (3 files)
+
+- `scripts/check-actor-knowledge-architecture.mjs`
+- `tests/unit/vtt/actor-knowledge-architecture.test.ts`
+- `scripts/check-command-outcomes.sh`
+
+Proposed B3: add the pure AST checker and all named positive/negative source fixtures.
+Proposed B3: invoke the checker in the existing source architecture gate.
+Proposed B3: prove unrelated visibility consumers remain accepted.
+Proposed B3 tests: architecture self-test, `sg scan`, and all B1/B2 focused specs.
+
+## 8. Offers overlap and rebase rule
+
+| Surface | OFFERS-IMPL-S3-BUILDER | ACTOR-KNOWLEDGE-01 |
+|---|---|---|
+| `engine-server.ts` imports | B2/B14/B18 builder and query imports | projection and wire-type imports |
+| `engine-server.ts:298-305` | B2/B14 dependency/type closure nearby | remove cached actor-knowledge rows |
+| `engine-server.ts:1109-1165` | no named semantic edit | replace producer with serializer |
+| `engine-server.ts:1314-1338` | B14/B18 query forwarding nearby | remove actor report precompute |
+| `engine-server.ts:1424-1457` | B2 launch/query environment | preserve landed environment wiring |
+| `engine-server.ts:1509-1525` | B14 capsule/query cache closure | preserve cache while removing actor rows |
+| `engine-server.ts:1731-1748` | no named semantic edit | consume validated `required` actor IDs |
+| `engine-server.ts:1953-1959` | no named semantic edit | project and serialize selected actors here |
+| `engine-server.ts:2079-2080` | no named semantic edit | use the derived empty-context tag |
+| `engine-server.ts:2272-2279` | B2/B18 blind environment/query wiring | no actor-knowledge edit |
+| `mcp/entrypoint.ts:337-465` | B2/B13/B15 builder input and required env | no planned edit |
+| `mcp/entrypoint.ts:545-692` | B2/B13 environment and blind forwarding | no planned edit |
+| `mcp/entrypoint.ts:1036-1256` | B2/B15 launcher reconstruction | no planned edit |
+| `mcp/schemas.ts:39` | no edit | derive actor-knowledge wire tag |
+| `mcp/schemas.ts:448-482` | no edit | expand actor-knowledge wire schema |
+| `mcp/schemas.ts:922,998-1000` | no edit | consume derived tag in both context arms |
+
+Verified overlap: the only shared changed file is `src/vtt/mcp/engine-server.ts`.
+Verified non-overlap: offers changes `entrypoint.ts`, while this unit does not.
+Verified non-overlap: this unit changes `schemas.ts`, while offers does not.
+Proposed rebase rule: do not begin B1 until OFFERS-IMPL-S3-BUILDER is on `main`.
+Proposed rebase rule: create the implementation branch from that landed `main` commit.
+Proposed rebase rule: rerun all verified inventories against the landed tree before editing.
+Proposed rebase rule: resolve `engine-server.ts` by current symbols, never by line-number patch replay.
+Proposed rebase rule: preserve the landed branded environment, digest, query, and blind-resolver wiring.
+Proposed rebase rule: never restore `canonicalEngineQueryPort` or an optional query fallback.
+Proposed rebase rule: if offers renamed a symbol, update this manifest before changing its replacement.
+Proposed rebase rule: if offers adds a test file, compare discovery to the new pre-edit count plus one.
+
+## 9. Verification contract
+
+### 9.1 Static and type verification
+
+Run `sha256sum src/vtt/intel/contracts.ts` before and after every batch.
+Require the frozen sha256 on every run.
+Run `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false`.
+Run `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false`.
+Run `sg scan --config sgconfig.yml src`.
+Run `node scripts/check-actor-knowledge-architecture.mjs` after B3.
+Run `git diff --check` after every batch.
+Run `rg -n` for all old intel, wire, evaluator, and scripted-party policy literals.
+Require no stale semantic pin except an explicitly named historical baseline string.
+Run the generated-schema equality test after regenerating the engine MCP schema.
+
+### 9.2 Focused behavior verification
+
+Run `npx vitest run --configLoader runner tests/unit/vtt/actor-knowledge.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/actor-knowledge-wire.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/last-seen.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/symmetric-pc-evaluator.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/footprint-increment-three.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/engine-context-integrations.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/prose-renderer.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/tools/engine-mcp-handler.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/tools/ai-dm-board-delivery.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/tools/ai-dm-arena.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/tools/ai-dm-legacy-invariance.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/combat/creature-space.test.ts`.
+Run `npx vitest run --configLoader runner tests/unit/vtt/actor-knowledge-architecture.test.ts`.
+
+### 9.3 Discovery contract
+
+Run `npx vitest list --configLoader runner --filesOnly --json` before implementation.
+Record the post-offers pre-edit count as the implementation baseline.
+This plan's verified baseline is 641 files.
+This plan creates exactly one discovered spec.
+Expected count on unchanged 40f04e2c is 642 files.
+Expected count after offers is the freshly recorded offers-landed baseline plus one.
+Require unique file count to equal total file count.
+Require every new test path to be authorized by this manifest.
+
+### 9.4 Mutant proof
+
+Execute every mutant in section 4 separately.
+Require the named test or architecture check to fail for the intended reason.
+Restore the exact pre-mutant source before the next mutant.
+Require all named killers green after restoration.
+Attach the complete seven-row mutant ledger to the implementation evidence.
+
+### 9.5 Pins-moved audit
+
+Re-run the policy-literal inventory after B2.
+Check every row in section 6 against its independent invariant.
+Require both JSON-schema wire consts to equal the derived runtime value.
+Require the board-delivery historical hash and 32,000-byte oracle to remain unchanged.
+Require the conversation manifest to record intel v5 through its production import.
+Require the symmetric and scripted-party hashes to use imported semantic identities.
+
+## 10. Stopping conditions
+
+Stop if `src/vtt/intel/contracts.ts` would need any edit.
+Stop if its sha256 differs from the frozen value.
+Stop if OFFERS-IMPL-S3-BUILDER has not landed on `main`.
+Stop if rebase conflict resolution would discard any landed offers environment or query invariant.
+Stop if a second visibility, ally, fog, or observation-history decision remains in wire assembly.
+Stop if the serializer needs `EncounterState`, `EngineQueryPort`, or `EngineStateCapsule` to classify a target.
+Stop if exact teleportation, invisibility, hiding, a spell ID, or a real destination reaches actor knowledge.
+Stop if the two vanished variants cannot share the same safe expectation.
+Stop if any unlocated target exposes current position, footprint, distance, or destination.
+Stop if actor knowledge enters a player board, player artifact, or shared narration channel.
+Stop if a moved pin has no independent non-version invariant.
+Stop if a retained golden can pass only by copying a newly observed output hash.
+Stop if the capsule, session, or replay format must change without a newly approved migration unit.
+Stop if any review batch requires more than ten changed files.
+Stop if either no-emit TypeScript project fails at a batch boundary.
+Stop if the architecture self-test accepts any named negative fixture.
+Stop if any mutant survives its named killer.
+Stop if final discovery differs from the post-offers baseline plus one without an explained concurrent addition.
+Stop if final `git status --short --untracked-files=all` includes a file outside the implementation manifest.
+
+## 11. Completion evidence
+
+Record the landed offers base commit and the pre-edit discovery count.
+Record both no-emit TypeScript exit codes for every batch.
+Record the focused spec file and test counts.
+Record `sg scan` and actor-knowledge architecture exit codes.
+Record the seven mutant red/green pairs.
+Record the final pins-moved table with its independent invariants.
+Record the final discovery total and delta from its pre-edit baseline.
+Record the frozen contract sha256.
+Record the final changed-file count and confirm all 22 files belong to the manifest.
+
+ACTOR KNOWLEDGE PLAN DONE
