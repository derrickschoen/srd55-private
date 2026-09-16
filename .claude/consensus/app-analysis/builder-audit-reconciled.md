# BUILDER-AUDIT-01 — reconciled memo (supervisor, 2026-09-14 17:22)

Inputs: builder-audit-astra.md (gpt-6-astra, ranked 10 candidates + §2 rejections), builder-audit-claude-fable.md (Claude Fable 5.1 lane, F1–F10 + review of astra's rejections), and my own review of astra's rejections (loop-log, earlier this window: reaction-offer host policy literal and the duplicated model-default expression). Owner instruction: "do not re-examine stuff we already agreed to fix" — the offers single-builder tranche (in flight), BUILDER-COORD and BUILDER-RUN (queued) are taken as given.

## What I verified myself on main 40f04e2c (commands in loop-log)
- Fable F1, CORRECTED after the owner asked (see loop-log): `actor-knowledge-last-seen-v4` (intel module) and `actor-knowledge-v3-last-seen` (MCP schemas) are NOT one policy at two versions. They are two contracts with independent numbering, both bumped in the same commit 7f9b16da (2026-09-05): the intel series went v2 → v3 → last-seen-v4; the MCP wire series went v2-creature-space → v3-last-seen. The wire payload is built by its own function (engine-server.ts:1109 actorKnowledgeReports), not from the intel projection; docs/specs/engine-turn-context.schema.json pins the wire const; tests/unit/combat/creature-space.test.ts:393 pins both under different names. No realised drift. What IS real in F1: the other three tags (legendary-windows-v2, reaction-spend-hold-v1, recovery-capability-v2) are identical strings retyped in schemas.ts:40-42 instead of imported from intel/*.
- Fable F3: 19 same-named zod schema constants exist in both `tools/ai-dm-conversation-row-codec.ts` (19) and `tools/ai-dm-rerun-packet.ts` (23), and rerun-packet imports the codec at :14 anyway. REAL.
- Fable F5: the idle coordinator literal (`requestSequence: 1`) is hand-built in 7 files; `adventuring-day-session.ts` already exports it. REAL.
- The in-flight offers plan (574ae301…) has zero mentions of the three offers format tags, `digestBody` or `deepFreeze` → Fable's "gap" is real; folded into astra's current fix round as a bounded supervisor addition (reversible by the owner).
- Not re-verified: F2, F4, F6–F10 site counts (Fable pasted its commands; sampled none). Treat those counts as reported.

## Where the two lanes agree
- The sweep method differed: astra swept constructors and factory return types; Fable swept literal constants, zod schemas, object-literal shapes and copied helpers. Both found the same thing in different clothes: many hands rebuild one value.
- Both accept the single-builder direction for offers, the coordinator/registry assembly (astra #2), and the run-options/lane-intel-mode item (astra #3).
- Both agree the DB-bound service cluster, handoff paths, UUIDv7, content-pack loading, seeds, session families, worker root, party storage and executor defaults do NOT need a builder (Fable verified each of astra's rejections; two disagreements below).

## Where they disagree (my ruling)
1. Intel policy constants — astra rejected ("they are constants"); Fable: constants in two places, one pair already diverged. Ruling, corrected: three of four are retyped identical strings (Fable right, low-cost import); the fourth is two independently numbered contracts, not drift (astra right). Value: medium, not highest.
2. The 4173 port rule — astra rejected ("central constants exist"); Fable: retyped in 7 files, no central constant. Ruling: Fable is right on the facts; value is medium (drift only when the port moves).

## Reconciled backlog, in proposed order (after the offers tranche lands)
| Unit | Contents | Size |
|---|---|---|
| BUILDER-WIRE (new) | F1 three identical intel tags imported from intel/* by schemas.ts (actor-knowledge wire tag stays a separate contract unless the owner wants it derived); F2 initiative-intel constant + empty-projection helper; F3 delete the 19 schema copies in rerun-packet, move the blind-row extension into the row codec; F7 twelve sites importing existing wire-format constants | ~22 files, three sub-batches |
| BUILDER-COORD (queued, astra #2) | + F5 idle coordinator state exported from coordinator.ts (8 files); + the ControllerAssignment literal (8 sites) already inside this scope | +8 files |
| BUILDER-RUN (queued, astra #3, #6, #10) | + F4 arena tool reuses the conversation CLI parser (30 flags, 3 files); + reaction-offer policy literal (1 line) and the model-default table (3 copies) from my rejection review; + F10 challenge seeds (3 files) | +7 files |
| BUILDER-RNG (astra #4) | includes Fable's mulberry32 snapshot row | unchanged |
| BUILDER-PORT (new, small) | F6 one reserved-port constant, 7 files | 7 files |
| Mechanical, later | F8 sha256/deepFreeze copies (15 + 21 files), F9 exact-keys ×7 / isRecord ×23 (one admits arrays: vtt/model.ts) | low risk, low value |
| Dropped from astra's list | #5 MCP launcher binding (absorbed by the offers tranche), #7 EncounterSetup rules context, #8 EngineStateCapsule, #9 DatabaseContext preparation — both lanes rate these tidiness, not drift | — |

## Decision needed from the owner
- (withdrawn) The "v3 vs v4" question was mis-posed by me; see the corrected F1 above. BUILDER-WIRE's intel item shrinks to: import the three identical tags, and decide whether the wire tag should be DERIVED from the intel tag (one bump moves both) or stay a separately versioned public contract (current state, defensible).
- Whether BUILDER-WIRE goes ahead of BUILDER-COORD (my recommendation: yes — it is the only item with realised drift).

## Addendum (owner question, actor knowledge): the two producers should share one module
Owner: "at its heart each monster is an actor and it has knowledge in both cases." Verified by reading both producers on main: `intel/actor-knowledge.ts:projectActorKnowledge` and `mcp/engine-server.ts:1109 actorKnowledgeReports` answer the same question with different rules and CAN disagree on the same state:
- a target located by tremorsense/web sense is `perceived` in intel (detectCombatant kind 'located') but `suspected`/`unknown` on the wire (queries.visibility reports visible only for kind 'seen', engine-query-port.ts:1893);
- a fully fogged target is downgraded to unlocated in intel (foggedCells check) but the wire producer has no fog check at all (grep foggedCells engine-server.ts = 0);
- ally test: intel uses combatantsAreAllies (faction equality), wire uses queries.sameSide; observation history: intel reads state.observationHistory, wire reads the capsule projection's clone.
Recommendation for BUILDER-WIRE item 1: make the wire producer a serializer over projectActorKnowledge (monsters only, snake_case, drop conditions/AC/HP/reaction/reciprocal), derive the wire tag from the intel tag or keep it as a serialization-only version, and hand-author the located and fogged cases as new wire expectations (5 test files pin wire behaviour today). This is a behaviour change on the DM channel, not a pure refactor.
