# ACTOR-KNOWLEDGE-01 plan round 2 — gpt-5.6-sol final message

Session 01a0a1e7-4ac2-7930-9d26-827b39faaed9; log .tmp/runs/fanout/plan-actor-knowledge-r2.log.

Created the round-2 plan: [actor-knowledge-single-producer-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md).

### Artifact report

| Metric | R1 | R2 |
|---|---:|---:|
| Lines | 599 | 650 |
| Bytes | 39,155 | 44,011 |
| SHA-256 | `cb43b354d222…a6903` | `8a719741f4c7…5b10` |

Full R2 SHA-256:

`8a719741f4c78a58ba6c13a8e9d904260532b5f437fe0ed0073b4adcb4685b10`

`diff -u /tmp/ak-plan-r1.md <plan> | head -300` was executed exactly: 300 lines displayed from a 532-line unified diff. No lines exceed 120 columns, and the final marker check returned `0`.

### Finding dispositions

| Finding | Disposition |
|---|---|
| PAK1-F1 | Accepted; recency is evidence only, with reducer-driven and adversarial controls. |
| PAK1-F2 | Accepted; exhaustive renderer discriminants and eight complete-output cases. |
| PAK1-F3 | Accepted; both 31,995-byte and 32,000-byte goldens are covered. |
| PAK1-F4 | Accepted; discovery is consistently `+2`. |
| PAK1-F5 | Accepted; exact sink, symbol-resolved closure, allowlist, and bypass fixtures. |
| PAK1-F6 | Accepted; corrected to ten shared files. |
| PAK1-F7 | Accepted; schema and registry pins now have behavioral witnesses. |
| PAK1-F8 | Accepted; all three SRD citations corrected. |

### Pins-moved ledger

The plan contains 18 audited rows:

| Pin surface | Planned treatment |
|---|---|
| `intel/actor-knowledge.ts` | Intel v4 → v5 |
| `mcp/schemas.ts` | Derived `+wire-v1` |
| Turn-context JSON schema | Derived wire value |
| `actor-knowledge.test.ts` | Intel v5 |
| `footprint-increment-three.test.ts` | Intel v5 |
| `last-seen.test.ts` | Recency shape |
| `symmetric-pc-evaluator.ts` | Evaluator v1 → v2 |
| `symmetric-pc-evaluator.test.ts` | Evaluator/intel pins |
| `scripted-party-round.ts` | Imported evaluator identity and party bump |
| `ai-dm-legacy-invariance.test.ts` | Imported evaluator identity |
| `ai-dm-conversation.test.ts` | Intel v5 manifest/rows |
| `creature-space.test.ts` | Both policy families |
| `engine-context-integrations.test.ts` | Full wire shape |
| `engine-context-integrations.test.ts` | Empty-context tag |
| `prose-renderer.test.ts` | Wire and prose semantics |
| Board-delivery E1C golden | Preserve 31,995 bytes and `40719437…` |
| Board-delivery footprint golden | Preserve 32,000 bytes and `aa841063…` |
| `engine-mcp-handler.test.ts` | Expanded schema-validated wire |

Current inventory is 22 actor-knowledge policy literal occurrences, or 26 including downstream evaluator/scripted-party identities.

### Counts and overlap

- Review batches: 3
- Batch sizes: 9 / 10 / 3
- Manifest entries: 22
- Distinct files: 22
- New discovered specs: 2
- Discovery: 641 → 643 on unchanged `40f04e2c`
- Offers manifest: 125 distinct files
- Shared files: 10

Shared files:

- `scripts/check-command-outcomes.sh`
- `src/vtt/mcp/engine-server.ts`
- `tests/unit/tools/ai-dm-board-delivery.test.ts`
- `tests/unit/tools/ai-dm-conversation.test.ts`
- `tests/unit/tools/ai-dm-legacy-invariance.test.ts`
- `tests/unit/tools/engine-mcp-handler.test.ts`
- `tests/unit/vtt/engine-context-integrations.test.ts`
- `tests/unit/vtt/footprint-increment-three.test.ts`
- `tests/unit/vtt/last-seen.test.ts`
- `tests/unit/vtt/prose-renderer.test.ts`

### Workspace and frozen contract

`git status --short --untracked-files=all` returned no output because `.gitignore:32` ignores `.tmp-*`.

The explicit checks returned:

```text
!! .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
```

Thus the plan is the sole untracked artifact; it is reported as ignored rather than `??`.

Frozen contract SHA remains:

`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

ACTOR KNOWLEDGE PLAN R2 DONE
diff --git a/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
index abae8293c34ba356ac1e26c815516d956deea5b4..d23baa471a8e506650e300e2cdbcb884257ecc8c
--- a/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
+++ b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
@@ -10,6 +10,19 @@
 Frozen file: `src/vtt/intel/contracts.ts` must remain byte-identical.
 Frozen sha256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
 
+## Round-2 changes
+
+| Finding | Disposition | Plan lines |
+|---|---|---|
+| PAK1-F1 | Accepted: recency evidence only; reducer scenario plus three controls | 61-78, 218-256, 368-369 |
+| PAK1-F2 | Accepted: exhaustive discriminant prose and eight complete-output cases | 142, 312-323 |
+| PAK1-F3 | Accepted: both delivery goldens receive independent normalization and wire assertions | 144-147, 451-463 |
+| PAK1-F4 | Accepted: two new discovered specs make the delta `+2` everywhere | 143, 341, 503, 519, 591-600, 638 |
+| PAK1-F5 | Accepted: exact sink/closure gate, inventory, and bypass controls | 195-205, 390-430, 516-525 |
+| PAK1-F6 | Accepted: manifest intersection is the verified ten-file set | 174-193, 527-557 |
+| PAK1-F7 | Accepted: schema and registry pins now have behavioral invariants | 432-453, 610-617 |
+| PAK1-F8 | Accepted: SRD citations use normalized full-SRD line locations | 154-172 |
+
 ## 1. Verified facts on 40f04e2c
 
 ### 1.1 Repository and authority
@@ -60,8 +73,9 @@
 `src/combat/encounter.ts:12925-12944`.
 Verified: the reducer reconciles history again after the command at
 `src/combat/encounter.ts:12953-12965`.
-Verified consequence: an immediately witnessed loss has observation revision `state.revision - 1`.
-Verified consequence: round and revision can express recency without changing persisted state.
+Verified: Astra's reducer probe found `observation.revision === state.revision - 1` for an already-hidden target.
+Verified conclusion: revision adjacency is recent-observation evidence, not proof of a witnessed disappearance.
+Verified conclusion: round and revision can express recency without changing persisted state.
 
 ### 1.4 The wire is presently a second producer
 
@@ -74,8 +88,6 @@
 Verified: `actorKnowledgeReports` walks all combatants and all targets at
 `src/vtt/mcp/engine-server.ts:1109-1121`.
 Verified: it selects enemies through `queries.sameSide` at `src/vtt/mcp/engine-server.ts:1119-1121`.
-Verified: it calculates distance before knowing whether the target is perceived at
-`src/vtt/mcp/engine-server.ts:1122-1124`.
 Verified: it uses `queries.visibility` and accepts only `visible === true` at
 `src/vtt/mcp/engine-server.ts:1132-1143`.
 Verified: `EngineQueryPort.visibility` means visible only for detection kind `seen` at
@@ -84,12 +96,6 @@
 `src/vtt/mcp/engine-server.ts:1109-1165`.
 Verified: the wire reads `capsule.projection.observationHistory` at
 `src/vtt/mcp/engine-server.ts:1144-1159`.
-Verified: `CapsuleIntelReports` stores untyped actor-knowledge rows at
-`src/vtt/mcp/engine-server.ts:298-305`.
-Verified: `capsuleIntelReports` computes all monster reports at
-`src/vtt/mcp/engine-server.ts:1314-1338`.
-Verified: full context filters those precomputed reports to `required` later at
-`src/vtt/mcp/engine-server.ts:1953-1959`.
 
 ### 1.5 The canonical ally and actor filters already exist
 
@@ -98,27 +104,21 @@
 Verified: `EngineQueryPort.sameSide` delegates to `combatantsAreAllies` today at
 `src/vtt/engine-query-port.ts:1850`.
 Verified: entrypoint selects living monster IDs at `src/vtt/mcp/entrypoint.ts:454-460`.
-Verified: entrypoint rejects empty, duplicate, non-living, or non-monster request actors at
-`src/vtt/mcp/entrypoint.ts:461-464`.
-Verified: full context narrows the already-validated request actor set at
-`src/vtt/mcp/engine-server.ts:1731-1748`.
+Verified: entrypoint validates living monster request actors at `src/vtt/mcp/entrypoint.ts:454-464`.
 
 ### 1.6 Consumers and pins
 
 Verified: `symmetric-pc-evaluator.ts` imports and calls `projectActorKnowledge` at lines 27-30 and 335.
 Verified: its public output embeds both the projection and its policy at lines 66-75 and 361-370.
 Verified: its own policy is `symmetric-pc-evaluator-v1` at line 41.
-Verified: `scripted-party-round.ts` hashes a retyped evaluator label at lines 430-438.
 Verified: `tools/ai-dm-conversation.ts` imports the intel policy at line 161.
 Verified: its RL manifest records that imported policy at lines 346-358 and 2133-2145.
-Verified: the MCP turn context is the DM channel under `EngineMcpToolProfile` at
-`src/vtt/mcp/engine-server.ts:196` and application setup at lines 1424-1477.
+Verified: the MCP turn context is the DM channel at `engine-server.ts:196,1424-1477`.
 Verified: player boards are distinct entrypoint artifacts at `src/vtt/mcp/entrypoint.ts:280-298`.
 Verified command: `rg -n` for both current actor-knowledge policy literals across `src tests tools docs`.
 Verified result: 22 literal occurrences require review, replacement, or an explicit no-change decision.
 Verified: both wire schema consts occur at `docs/specs/engine-turn-context.schema.json:251,872`.
 Verified: the wire target JSON schema occurs at lines 4032-4272.
-Verified: the current schema uses camel-case `sizedFor` and `lastSeenPosition` at lines 4124 and 4218.
 Verified: generated-schema equality is enforced at `tests/unit/tools/engine-mcp-handler.test.ts:1095-1103`.
 
 ### 1.7 Current tests and discovery
@@ -139,8 +139,12 @@
 Verified: the existing wire last-seen expectation is at
 `tests/unit/vtt/engine-context-integrations.test.ts:248-261`.
 Verified: the current prose last-seen expectation is at `tests/unit/vtt/prose-renderer.test.ts:263-289`.
-Verified: the board-delivery byte/hash normalization is at
-`tests/unit/tools/ai-dm-board-delivery.test.ts:669-682`.
+Verified: `renderer-profile.ts:1341-1345` calls every listed target perceived regardless of `kind`.
+Verified: both planned `.test.ts` paths match Vitest's include and are absent, so the delta is `+2`.
+Verified: the E1C golden at `ai-dm-board-delivery.test.ts:555-556` pins 31,995 bytes and sha256
+`4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`.
+Verified: the footprint golden at lines 669-682 normalizes to 32,000 bytes and sha256
+`aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51`.
 Verified: the structured handler checks actor-knowledge footprints at
 `tests/unit/tools/engine-mcp-handler.test.ts:775-800`.
 Verified: intel-off arena delivery forbids `actor_knowledge` at
@@ -150,17 +154,17 @@
 ### 1.8 SRD facts that constrain the knowledge model
 
 Verified command: `python3 .ai/rules/srdgrep.py 'frigid beam'`.
-Verified source: `docs/srd/source/spell-descriptions.txt:3551`.
+Verified source: `docs/srd/full/srd-5.2.1.txt:6434`.
 Verified rule: Ray of Frost is a visible blue-white beam and a ranged spell attack.
 Verified command: `python3 .ai/rules/srdgrep.py 'Invisible [Condition]'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11838-11853`.
 Verified rule: Invisible conceals the subject and changes affected attacks.
 Verified rule: the Invisible condition text does not tell observers what effect caused it.
 Verified command: `python3 .ai/rules/srdgrep.py 'You teleport to a location within range'`.
-Verified source: `docs/srd/source/spell-descriptions.txt:9` for Dimension Door.
+Verified source: `docs/srd/full/srd-5.2.1.txt:2167` for Dimension Door.
 Verified rule: Dimension Door states relocation but supplies no universal visible teleport cue.
 Verified command: `python3 .ai/rules/srdgrep.py 'Briefly surrounded by silvery mist'`.
-Verified source: `docs/srd/source/spell-descriptions.txt:7896` for Misty Step.
+Verified source: `docs/srd/full/srd-5.2.1.txt:5533` for Misty Step.
 Verified rule: Misty Step has a perceivable silvery-mist cue specific to that effect.
 Verified command: `python3 .ai/rules/srdgrep.py 'hide yourself'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11775-11802`.
@@ -177,6 +181,28 @@
 Verified: offers B18 changes `engine-server.ts` again.
 Verified: offers B13 and B15 change `entrypoint.ts` again.
 Verified: the offers manifest does not change `mcp/schemas.ts`.
+Verified command: a read-only Node manifest intersection over both plan bullet lists.
+Verified result: the actor plan has 22 files, the offers plan has 125 distinct files, and 10 intersect.
+Verified intersection: `scripts/check-command-outcomes.sh` and `src/vtt/mcp/engine-server.ts`.
+Verified intersection: `tests/unit/tools/ai-dm-board-delivery.test.ts`.
+Verified intersection: `tests/unit/tools/ai-dm-conversation.test.ts`.
+Verified intersection: `tests/unit/tools/ai-dm-legacy-invariance.test.ts`.
+Verified intersection: `tests/unit/tools/engine-mcp-handler.test.ts`.
+Verified intersection: `tests/unit/vtt/engine-context-integrations.test.ts`.
+Verified intersection: `tests/unit/vtt/footprint-increment-three.test.ts`.
+Verified intersection: `tests/unit/vtt/last-seen.test.ts` and `tests/unit/vtt/prose-renderer.test.ts`.
+
+### 1.10 Current mechanical-consumer inventory
+
+Verified command: `rg -n 'observationHistory|detectCombatant|queries\.visibility' src/vtt --glob '*.ts'`.
+Verified: `detectCombatant` occurs only in `intel/actor-knowledge.ts:4,267,269`.
+Verified: tactical visibility consumers are `speculative-planning.ts:151,416`.
+Verified: tactical visibility consumers are `dm-tactical-intel.ts:198,281`.
+Verified: non-knowledge MCP visibility consumers are `engine-server.ts:941,959,3061`.
+Verified: the competing knowledge uses are `engine-server.ts:1132,1144`; this unit removes both.
+Verified: observation transport/validation occurs in `session-persistence.ts:962,1006,1019,1021,1028,3261`.
+Verified: observation codec defaults occur in `encounter-state-codec.ts:30,44,177,414`.
+Verified: capsule transport occurs in `engine-state-capsule.ts:157,432,562,675,738,812`.
 
 ## 2. Proposed final knowledge contract
 
@@ -184,12 +210,10 @@
 
 Proposed: `projectActorKnowledge(state, actorId)` remains the only semantic producer.
 Proposed: all enemy, life, ally, placement, fog, detection, and observation-history decisions remain there.
-Proposed: no MCP actor-knowledge function calls `queries.visibility` or `queries.sameSide`.
-Proposed: no MCP actor-knowledge function calls `queries.spaceDistance`.
+Proposed: no MCP actor-knowledge function calls query-port semantic methods.
 Proposed: no MCP function reads combatants, fog, tokens, or observation history to classify a target.
 Proposed: the wire receives only `ActorKnowledgeProjection` values and serializes them.
-Proposed: target switches are exhaustive and have no default arm.
-Proposed: the wire never repairs, enriches, or second-guesses a projection.
+Proposed: exhaustive target switches never repair, enrich, or second-guess a projection.
 
 ### 2.2 Unlocated knowledge
 
@@ -197,39 +221,39 @@
 Proposed: keep the `unknown` arm only when no actor-owned observation exists.
 Proposed: extend resolved `lastSeen` with `observedAt: { round, revision }`.
 Proposed: extend resolved `lastSeen` with `age: { rounds, revisions }`.
-Proposed: calculate age from the current state and the canonical observation.
 Proposed: reject a future-dated observation with `RangeError` rather than clamp or guess.
-Proposed: add a closed `lossOfContact` result to resolved `lastSeen`.
-Proposed perceived shape: `{ status: 'perceived', reason: 'sudden_loss_of_contact' }`.
-Proposed unresolved shape: `{ status: 'unresolved', reason: 'transition_not_observed' }`.
-Proposed: mark loss perceived only when observation revision equals `state.revision - 1`.
-Proposed: this means the actor perceived the target immediately before the current loss of location.
-Proposed: older or synthetic history still gives last-seen recency but not a witnessed-transition claim.
+Proposed: do not add `lossOfContact`, `witnessed`, or any transition-provenance field.
+Proposed: revision adjacency means only that the canonical observation is recent.
+Proposed: neither recent nor synthetic history proves that the actor witnessed a disappearance.
 Proposed: do not expose an engine cause such as `teleportation`, `invisibility`, or `hiding`.
 Proposed: do not expose the current token, destination, distance, or footprint of an unlocated target.
 Proposed: the recent cell plus zero-round and one-revision age expresses “a moment ago.”
-Proposed: the generic loss marker supports a reasonable area-effect choice without asserting a real position.
+Proposed: `kind: 'suspected'` plus recent cell and age supports an area-effect choice without asserting truth.
 Proposed: no suspicion radius is invented because generic teleport distance is not bounded by one rule.
 Proposed: this design uses existing observation history and requires no persistence migration.
 Proposed: this design requires no change to `src/vtt/intel/contracts.ts`.
 
 ### 2.3 The owner's hand-authored scenario
 
-Proposed fixture: a sorcerer visibly casts Ray of Frost at the observing monster.
-Proposed fixture: history records the sorcerer at cell `(2, 1)`, round 3, revision 17.
-Proposed fixture: the resulting state is round 3, revision 18, and the sorcerer is unlocated.
-Proposed invisibility variant: the engine truth retains the token and applies Invisible.
-Proposed teleport variant: engine truth moves the token to a different unperceived cell.
+Proposed fixture: create a visible sorcerer and observing monster through the normal encounter fixture builder.
+Proposed fixture: execute a real `cast_spell` Ray of Frost command with deterministic hand-authored rolls.
+Proposed fixture: derive the observation round and revision only from successive `reduceEncounter` results.
+Proposed invisibility variant: reduce an `apply_effect` command that gives the sorcerer Invisible.
+Proposed teleport variant: reduce a `move` command with `cause: 'teleport'` to an unperceived cell.
+Proposed: assert each accepted command and the resulting reducer revision before projecting knowledge.
 Proposed: the two projection expectations are byte-for-byte identical apart from fixture identity.
 Proposed: the two wire expectations are byte-for-byte identical apart from fixture identity.
 Proposed projection expectation: `kind: 'suspected'` with only the old cell and observation recency.
 Proposed projection expectation: `age` is `{ rounds: 0, revisions: 1 }`.
-Proposed projection expectation: loss is perceived as `sudden_loss_of_contact`.
 Proposed projection expectation: neither current position nor exact cause exists anywhere in the object.
 Proposed wire expectation: the same facts use snake-case names and no extra facts.
-Proposed prose expectation: the monster saw the sorcerer there one revision ago and suddenly lost contact.
-Proposed prose expectation: the text says the exact cause is unknown.
-Proposed: the test never regenerates either expected object from production output.
+Proposed prose expectation: the monster last observed the sorcerer there one revision ago.
+Proposed prose expectation: the text says the current location is unknown and makes no transition claim.
+Proposed control: start with a reducer-produced already-unseen target, then run another valid command.
+Proposed control: assert that recent history still creates no witnessed-disappearance fact.
+Proposed control: inject synthetic previous-revision history and assert that it conveys recency only.
+Proposed control: run an unrelated command after disappearance and assert revision age advances exactly once.
+Proposed control: all three cases prohibit `witnessed`, `loss`, and exact-cause keys and prose.
 
 ### 2.4 Which existing rules win
 
@@ -268,11 +292,9 @@
 Proposed: serialize `targetCanSeeActor` as `target_can_see_actor`.
 Proposed: serialize `lastSeenPosition` as `last_seen_position`.
 Proposed: serialize `observedAt` as `observed_at`.
-Proposed: serialize `lossOfContact` as `loss_of_contact`.
 Proposed: status, reason, kind, band, row, column, round, and revision need no spelling change.
 Proposed: serialize placement-pending fields without enrichment.
 Proposed: serialize never-observed fields without enrichment.
-Proposed: clone arrays and cells so the wire cannot alias projection-owned values.
 
 ### 2.6 Engine-server restructuring
 
@@ -287,8 +309,21 @@
 Proposed: do not pass `queries` or `capsule` into the actor-knowledge serializer.
 Proposed: keep unrelated visibility calls for tactical options and threats outside the knowledge serializer.
 
-### 2.7 Downstream semantic versions
+### 2.7 Exhaustive prose semantics
 
+Proposed: `renderer-profile.ts` switches exhaustively on every wire target `kind` with no default arm.
+Proposed: `perceived` alone may use “perceives” and renders all location and mechanical knowledge fields.
+Proposed: `suspected` says “last observed,” renders cell/time/age, and says current location is unknown.
+Proposed: `unknown` says the actor has never observed the target and does not know its location.
+Proposed: `placement_pending` says knowledge cannot be assessed until the named placement issue is resolved.
+Proposed: no unlocated arm uses “perceive,” “sees,” “watched vanish,” or another transition claim.
+Proposed: use an exhaustive `never` assertion so a new discriminant fails compilation.
+Proposed: add exact complete-output cases for each unlocated kind and a mixed list in `regular_prose`.
+Proposed: add the same four exact complete-output cases in `caveman_prose`.
+Proposed: each mixed case includes one perceived and all three unlocated kinds in stable target order.
+
+### 2.8 Downstream semantic versions
+
 Proposed: bump `SYMMETRIC_PC_EVALUATOR_POLICY` to `symmetric-pc-evaluator-v2`.
 Justification: `SymmetricPcDecision` publicly embeds the changed projection and policy.
 Proposed: import that evaluator constant into `scripted-party-round.ts` for its policy-hash controller field.
@@ -314,7 +349,7 @@
 | Tremorsense located | perceived position; AC/HP unknown | same facts present in snake case |
 | Fully fogged | unknown or prior last-seen only | no current position or footprint |
 | Partially fogged Large | perceived with full footprint | exact full footprint and position |
-| Sorcerer invisible | recent suspected; generic loss | same recency; no exact cause |
+| Sorcerer invisible | recent suspected; no transition claim | same recency; no exact cause |
 | Sorcerer teleported | identical safe knowledge | identical safe wire knowledge |
 | Placement pending | exact pending reason only | exact pending reason only |
 | Never observed | typed unresolved basis | typed unresolved basis |
@@ -329,7 +364,9 @@
 Proposed: the teleport fixture asserts no `teleportation`, spell ID, destination, or current distance is emitted.
 Proposed: the summon fixture uses an ownership effect so profile kind and canonical faction disagree.
 Proposed: player-channel coverage serializes the player board and asserts `actor_knowledge` is absent.
-Proposed: prose coverage asserts recency and generic loss while forbidding both exact cause words.
+Proposed: prose coverage asserts recency/current-location uncertainty while forbidding both exact cause words.
+Proposed: the already-unseen, synthetic-history, and unrelated-command controls run through projection and wire.
+Proposed: the owner scenario and controls use literal expected objects, never timestamps copied from output.
 
 ## 4. Mutation ledger
 
@@ -340,7 +377,7 @@
 | WIRE_DROPS_LOCATED | located target becomes suspected | wire matrix `serializes tremorsense location` |
 | ALLY_RULE_DIVERGES | profile kind replaces canonical faction | matrix `uses summon-owner faction` |
 | TAG_NOT_DERIVED | schemas retype a full wire literal | tag relation test plus architecture gate |
-| RECENCY_DROPPED | age or observation time disappears | matrix `retains one-revision recency` |
+| RECENCY_DROPPED | “a moment ago” evidence disappears | matrix `retains reducer-derived recency` |
 | TRUTH_LEAK | unlocated wire emits real destination | matrix `never emits teleport destination` |
 
 Proposed: apply each mutant to the smallest production edit that represents the defect.
@@ -354,28 +391,42 @@
 
 Proposed: add `scripts/check-actor-knowledge-architecture.mjs` using the TypeScript AST.
 Proposed: expose a pure violation finder so unit tests can supply source strings without filesystem tricks.
-Proposed: scan `src/vtt/**/*.ts` in CLI mode from `scripts/check-command-outcomes.sh`.
-Proposed: exempt semantic raw-fact use only in `src/vtt/intel/actor-knowledge.ts`.
-Proposed: inspect functions and initializers whose names or output keys identify actor knowledge.
-Proposed forbidden calls there: `queries.visibility`, `queries.sameSide`, and `queries.spaceDistance`.
-Proposed forbidden calls there: `detectCombatant` and `combatantsAreAllies` outside the canonical producer.
-Proposed forbidden reads there: `.combatants`, `.tokens`, `.foggedCells`, and `.observationHistory`.
-Proposed: forbid a second declaration or export named `projectActorKnowledge` outside the canonical file.
-Proposed: require engine actor-knowledge assembly to call `projectActorKnowledge`.
-Proposed: require schemas to derive the wire tag from `ACTOR_KNOWLEDGE_POLICY` and `wire-vN`.
-Proposed: permit unrelated tactical helpers in the same module to call visibility or scan combatants.
-Proposed: report file, line, semantic owner, and forbidden primitive for every violation.
+Proposed: the checker builds one TypeScript `Program` and resolves symbols, imports, aliases, and property access.
+Proposed: its bounded production root is the `actor_knowledge` property in full turn-context construction.
+Proposed: require that root to map sorted `required` IDs directly through canonical projection then serialization.
+Proposed: reject a wrapper, alias, renamed producer, precomputed report, or helper between that root and projection.
+Proposed: require exactly one canonical projection call per selected actor in that expression.
+Proposed: identify the serializer by the resolved symbol called around `projectActorKnowledge`.
+Proposed: require its input type to be `ActorKnowledgeProjection` and forbid state/query/capsule parameters.
+Proposed: walk the serializer's local helper closure and resolve every free value and accessed property symbol.
+Proposed: allow only the projection parameter, closure locals, safe language built-ins, and the policy constant.
+Proposed: reject direct, aliased, destructured, optional, element, and bracket access to raw mechanical facts.
+Proposed forbidden symbols in that closure include visibility, same-side, distance, detection, and ally queries.
+Proposed forbidden state properties include combatants, tokens, fogged cells, and observation history.
+Proposed: only `intel/actor-knowledge.ts` may construct `targetId` rows with canonical knowledge discriminants.
+Proposed: only the serializer may construct corresponding `target_id` rows for the wire.
+Proposed: require schemas to derive the wire tag from the imported intel constant and literal `+wire-vN` suffix.
+Proposed: compare the live raw-mechanical consumer inventory to the explicit allowlist in section 1.10.
+Proposed: allow seven point-in-time mechanical visibility calls, including `query_visibility`; none may feed the sink.
+Proposed: allow observation history only in canonical intel and the inventoried codec/transport locations.
+Proposed: any new consumer fails with file, line, resolved symbol, and required allowlist classification.
+Proposed: the final post-offers `scripts/check-command-outcomes.sh` must execute this checker.
+Proposed: preserve offers' expanded `sg scan --config sgconfig.yml src tools tests` invocation in that script.
 
-Positive fixture `CANONICAL_PRODUCER_OWNS_RAW_FACTS` allows raw facts in the canonical producer path.
-Positive fixture `UNRELATED_TACTICAL_VISIBILITY_ALLOWED` allows visibility in a non-knowledge helper.
-Positive fixture `WIRE_SERIALIZES_PROJECTION` accepts an exhaustive projection-only serializer.
-Negative fixture `WIRE_RECOMPUTES_VISIBILITY` calls `queries.visibility` in actor-knowledge assembly.
-Negative fixture `WIRE_RECOMPUTES_ALLIES` calls `queries.sameSide` in actor-knowledge assembly.
-Negative fixture `WIRE_READS_DETECTION` calls `detectCombatant` outside the canonical file.
-Negative fixture `WIRE_READS_HISTORY` reads `.observationHistory` in actor-knowledge assembly.
-Negative fixture `WIRE_READS_FOG` reads `.foggedCells` in actor-knowledge assembly.
-Negative fixture `WIRE_WALKS_COMBATANTS` reads `.combatants` in actor-knowledge assembly.
-Negative fixture `SECOND_KNOWLEDGE_PRODUCER` declares `projectActorKnowledge` in another module.
+Positive fixture `CANONICAL_PRODUCER_OWNS_RAW_FACTS` accepts the canonical producer's resolved symbols.
+Positive fixture `UNRELATED_TACTICAL_VISIBILITY_ALLOWED` accepts an inventoried non-knowledge call.
+Positive fixture `WIRE_SERIALIZES_PROJECTION` accepts the exact direct sink and projection-only closure.
+Negative fixture `WIRE_RECOMPUTES_VISIBILITY` uses direct `queries.visibility` in the closure.
+Negative fixture `ALIASED_VISIBILITY` calls `const visible = queries.visibility; visible(...)`.
+Negative fixture `BRACKET_VISIBILITY` calls `queries['visibility'](...)`.
+Negative fixture `DESTRUCTURED_VISIBILITY` calls a destructured visibility alias.
+Negative fixture `HELPER_RECOMPUTES_HISTORY` reaches observation history through a local helper.
+Negative fixture `IMPORTED_HELPER_RECOMPUTES_FOG` reaches fog through an imported helper.
+Negative fixture `WIRE_READS_DETECTION` calls an aliased `detectCombatant` symbol.
+Negative fixture `WIRE_WALKS_COMBATANTS` reads combatants through element access.
+Negative fixture `ALLY_RULE_DIVERGES` calls a same-side alias in the serializer closure.
+Negative fixture `RENAMED_SECOND_PRODUCER` replaces the canonical sink call with `classifyTargets`.
+Negative fixture `SECOND_DISCRIMINANT_CONSTRUCTOR` builds canonical target rows in another module.
 Negative fixture `TAG_NOT_DERIVED` initializes the wire policy from a full string literal.
 
 ## 6. Pins moved and independent invariants
@@ -384,7 +435,7 @@
 |---|---|---|
 | `intel/actor-knowledge.ts:30,301` | intel v4 to v5 | direct recency and no-truth tests |
 | `mcp/schemas.ts:39` | literal to derived `+wire-v1` | source gate and runtime relation |
-| `engine-turn-context.schema.json:251,872` | derived wire value | Zod-to-JSON equality test |
+| `engine-turn-context.schema.json:251,872` | derived wire value | schema-parse located and full-fog fixtures |
 | `actor-knowledge.test.ts:46,93` | intel v4 to v5 | exact visible, fog, and history rows |
 | `footprint-increment-three.test.ts:182` | intel v4 to v5 | independently computed nearest-cell distance |
 | `last-seen.test.ts:237-249` | resolved shape gains recency | hidden coordinate non-disclosure |
@@ -393,16 +444,22 @@
 | `scripted-party-round.ts:25,56,435` | party v5 and imported evaluator v2 | canonical policy-hash derivation |
 | `ai-dm-legacy-invariance.test.ts:640-647` | imported evaluator identity | unchanged independent hash formula |
 | `ai-dm-conversation.test.ts:2231-2309` | intel v5 in manifest/rows | hand-computed AC, HP, and distance rows |
-| `creature-space.test.ts:389-408` | intel v5 and derived wire | registered-surface extraction plus relation |
+| `creature-space.test.ts:389-408` | intel v5 and derived wire | tag relation plus located/fog/history matrix |
 | `engine-context-integrations.test.ts:252-261` | new wire tag and shape | exact real turn-context knowledge |
 | `engine-context-integrations.test.ts:420` | derived empty tag | hard byte cap and empty actors |
 | `prose-renderer.test.ts:263-289` | new wire and recency text | exact safe sentence and cause prohibition |
-| `ai-dm-board-delivery.test.ts:669-682` | new tag/normalizer | retain old independent 32,000-byte hash oracle |
+| `ai-dm-board-delivery.test.ts:555-556` | E1C normalization | retain 31,995-byte and `40719437…` oracle |
+| `ai-dm-board-delivery.test.ts:669-682` | footprint normalization | retain 32,000-byte and `aa841063…` oracle |
 | `engine-mcp-handler.test.ts:775-800` | expanded exact wire | output-schema validation and no forbidden keys |
 
-Proposed: keep the existing board-delivery baseline hash unchanged.
-Proposed: normalize the entire actor-knowledge block to its hand-authored legacy block before that comparison.
-Proposed: independently assert the new actor-knowledge block before normalization.
+Proposed: keep both existing board-delivery lengths and hashes unchanged after normalization.
+Proposed: write a separate literal legacy actor-knowledge block for each fixture, not one shared generated value.
+Proposed: assert each parsed new actor-knowledge block against a separate literal new-wire expectation first.
+Proposed: replace only that parsed block and each fixture's already-approved state-handle field.
+Proposed: canonicalize the normalized full object and compare its original exact byte length and sha256.
+Proposed: independently assert each raw payload's cap/trim flags, top-level keys, actor count, and option count.
+Proposed: this proves whether added wire bytes changed trimming or any other retained field.
+Proposed: if either normalized old oracle changes, stop; do not bless a new length, hash, or trimmed payload.
 Proposed: never paste a newly observed full-output hash into the test.
 Proposed: `tools/ai-dm-conversation.ts` needs no tag edit because it already imports the intel constant.
 Proposed: `tests/unit/tools/ai-dm-arena.test.ts` needs no pin edit because its invariant is absence in intel-off mode.
@@ -412,12 +469,10 @@
 
 ## 7. Compile-safe review batches
 
-The implementation tranche contains three ordered review batches.
-Each batch changes at most ten files.
+The implementation tranche contains three ordered batches of at most ten files.
 The manifest contains 22 distinct files.
 No file appears in more than one batch.
 Every batch ends with both no-emit TypeScript projects green.
-Every batch is reviewed as a cumulative tree.
 
 ### B1 — projection semantics and downstream semantic identities (9 files)
 
@@ -431,7 +486,7 @@
 - `tests/unit/tools/ai-dm-conversation.test.ts`
 - `tests/unit/tools/ai-dm-legacy-invariance.test.ts`
 
-Proposed B1: add recency and loss-of-contact types in `actor-knowledge.ts` only.
+Proposed B1: add recency types, with no transition claim, in `actor-knowledge.ts` only.
 Proposed B1: preserve the existing perceived and placement-pending semantics.
 Proposed B1: bump intel, evaluator, and scripted-party semantic identities.
 Proposed B1: update only hand-authored dependent expectations.
@@ -454,7 +509,7 @@
 Proposed B2: replace the second producer with an exhaustive typed serializer.
 Proposed B2: calculate projections only for the selected DM actor set.
 Proposed B2: regenerate the checked-in JSON schema from Zod.
-Proposed B2: render safe recency and generic loss in prose.
+Proposed B2: render every target discriminant exhaustively in both prose styles.
 Proposed B2: add the eight-row hand-authored projection/wire matrix.
 Proposed B2 tests: all six listed specs plus schema generation equality.
 
@@ -471,36 +526,35 @@
 
 ## 8. Offers overlap and rebase rule
 
-| Surface | OFFERS-IMPL-S3-BUILDER | ACTOR-KNOWLEDGE-01 |
+| Production surface | Offers regions | Actor-knowledge regions |
 |---|---|---|
-| `engine-server.ts` imports | B2/B14/B18 builder and query imports | projection and wire-type imports |
-| `engine-server.ts:298-305` | B2/B14 dependency/type closure nearby | remove cached actor-knowledge rows |
-| `engine-server.ts:1109-1165` | no named semantic edit | replace producer with serializer |
-| `engine-server.ts:1314-1338` | B14/B18 query forwarding nearby | remove actor report precompute |
-| `engine-server.ts:1424-1457` | B2 launch/query environment | preserve landed environment wiring |
-| `engine-server.ts:1509-1525` | B14 capsule/query cache closure | preserve cache while removing actor rows |
-| `engine-server.ts:1731-1748` | no named semantic edit | consume validated `required` actor IDs |
-| `engine-server.ts:1953-1959` | no named semantic edit | project and serialize selected actors here |
-| `engine-server.ts:2079-2080` | no named semantic edit | use the derived empty-context tag |
-| `engine-server.ts:2272-2279` | B2/B18 blind environment/query wiring | no actor-knowledge edit |
-| `mcp/entrypoint.ts:337-465` | B2/B13/B15 builder input and required env | no planned edit |
-| `mcp/entrypoint.ts:545-692` | B2/B13 environment and blind forwarding | no planned edit |
-| `mcp/entrypoint.ts:1036-1256` | B2/B15 launcher reconstruction | no planned edit |
-| `mcp/schemas.ts:39` | no edit | derive actor-knowledge wire tag |
-| `mcp/schemas.ts:448-482` | no edit | expand actor-knowledge wire schema |
-| `mcp/schemas.ts:922,998-1000` | no edit | consume derived tag in both context arms |
+| `engine-server.ts` | 298-305;1314-38;1424-57;1509-25;2272-79 | 1109-65;1314-38;1731-48;1953-59;2079-80 |
+| `entrypoint.ts` | 337-465; 545-692; 1036-1256 | no edit; real serializer tests traverse it |
+| `schemas.ts` | no edit | 39; 448-482; 922; 998-1000 |
 
-Verified overlap: the only shared changed file is `src/vtt/mcp/engine-server.ts`.
-Verified non-overlap: offers changes `entrypoint.ts`, while this unit does not.
-Verified non-overlap: this unit changes `schemas.ts`, while offers does not.
+| Shared manifest file | Offers batch(es) | Actor batch |
+|---|---|---|
+| `scripts/check-command-outcomes.sh` | B1/B15 final form | B3 |
+| `src/vtt/mcp/engine-server.ts` | B2/B14/B18 | B2 |
+| `tests/unit/tools/ai-dm-board-delivery.test.ts` | B4/B16 | B2 |
+| `tests/unit/tools/ai-dm-conversation.test.ts` | B5/B16 | B1 |
+| `tests/unit/tools/ai-dm-legacy-invariance.test.ts` | B11/B15 | B1 |
+| `tests/unit/tools/engine-mcp-handler.test.ts` | B5/B16 | B2 |
+| `tests/unit/vtt/engine-context-integrations.test.ts` | B6 | B2 |
+| `tests/unit/vtt/footprint-increment-three.test.ts` | B7 | B1 |
+| `tests/unit/vtt/last-seen.test.ts` | B7 | B1 |
+| `tests/unit/vtt/prose-renderer.test.ts` | B8 | B2 |
+
+Verified overlap count: 10 shared files; `entrypoint.ts` and `schemas.ts` are not in the intersection.
 Proposed rebase rule: do not begin B1 until OFFERS-IMPL-S3-BUILDER is on `main`.
 Proposed rebase rule: create the implementation branch from that landed `main` commit.
 Proposed rebase rule: rerun all verified inventories against the landed tree before editing.
 Proposed rebase rule: resolve `engine-server.ts` by current symbols, never by line-number patch replay.
 Proposed rebase rule: preserve the landed branded environment, digest, query, and blind-resolver wiring.
 Proposed rebase rule: never restore `canonicalEngineQueryPort` or an optional query fallback.
-Proposed rebase rule: if offers renamed a symbol, update this manifest before changing its replacement.
-Proposed rebase rule: if offers adds a test file, compare discovery to the new pre-edit count plus one.
+Proposed rebase rule: preserve every shared test's landed builder setup and independent oracle.
+Proposed rebase rule: preserve offers' final gate, then append the actor-knowledge checker invocation.
+Proposed rebase rule: compare discovery to the offers-landed pre-edit count plus two.
 
 ## 9. Verification contract
 
@@ -510,7 +564,7 @@
 Require the frozen sha256 on every run.
 Run `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false`.
 Run `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false`.
-Run `sg scan --config sgconfig.yml src`.
+Run `sg scan --config sgconfig.yml src tools tests`.
 Run `node scripts/check-actor-knowledge-architecture.mjs` after B3.
 Run `git diff --check` after every batch.
 Run `rg -n` for all old intel, wire, evaluator, and scripted-party policy literals.
@@ -539,9 +593,9 @@
 Run `npx vitest list --configLoader runner --filesOnly --json` before implementation.
 Record the post-offers pre-edit count as the implementation baseline.
 This plan's verified baseline is 641 files.
-This plan creates exactly one discovered spec.
-Expected count on unchanged 40f04e2c is 642 files.
-Expected count after offers is the freshly recorded offers-landed baseline plus one.
+This plan creates exactly two discovered specs.
+Expected count on unchanged 40f04e2c is 643 files.
+Expected count after offers is the freshly recorded offers-landed baseline plus two.
 Require unique file count to equal total file count.
 Require every new test path to be authorized by this manifest.
 
@@ -558,7 +612,7 @@
 Re-run the policy-literal inventory after B2.
 Check every row in section 6 against its independent invariant.
 Require both JSON-schema wire consts to equal the derived runtime value.
-Require the board-delivery historical hash and 32,000-byte oracle to remain unchanged.
+Require both board-delivery historical lengths and hashes to remain unchanged after normalization.
 Require the conversation manifest to record intel v5 through its production import.
 Require the symmetric and scripted-party hashes to use imported semantic identities.
 
@@ -581,19 +635,16 @@
 Stop if either no-emit TypeScript project fails at a batch boundary.
 Stop if the architecture self-test accepts any named negative fixture.
 Stop if any mutant survives its named killer.
-Stop if final discovery differs from the post-offers baseline plus one without an explained concurrent addition.
+Stop if final discovery differs from the post-offers baseline plus two without an explained concurrent addition.
 Stop if final `git status --short --untracked-files=all` includes a file outside the implementation manifest.
 
 ## 11. Completion evidence
 
 Record the landed offers base commit and the pre-edit discovery count.
-Record both no-emit TypeScript exit codes for every batch.
 Record the focused spec file and test counts.
-Record `sg scan` and actor-knowledge architecture exit codes.
 Record the seven mutant red/green pairs.
-Record the final pins-moved table with its independent invariants.
 Record the final discovery total and delta from its pre-edit baseline.
 Record the frozen contract sha256.
 Record the final changed-file count and confirm all 22 files belong to the manifest.
 
-ACTOR KNOWLEDGE PLAN DONE
+ACTOR KNOWLEDGE PLAN R2 DONE
