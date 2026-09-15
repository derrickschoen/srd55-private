# OFFERS-IMPL-S3-BUILDER B7 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b7.log. Supervisor verification .tmp/runs/verify-s3-b7.log.

Implemented B7 across exactly the ten permitted test files. All callers now use explicit built environments and future-required argument positions.

### Changed files

| File | Pristine SHA | Final SHA | Max added line |
|---|---|---|---:|
| `engine-query-port.test.ts` | `4ec29dca…a00cd` | `694b648a…55d88` | 101 |
| `engine-round-session.test.ts` | `218ade55…dd55` | `064fd755…d9470` | 104 |
| `engine-state-capsule.test.ts` | `2b5cc691…06b8` | `b374a80e…67cd0` | 111 |
| `footprint-increment-four.test.ts` | `5edce3e0…1dea` | `8e6ed0fe…6e621` | 100 |
| `footprint-increment-three.test.ts` | `547d9123…f3067c2` | `814db6a9…8b352` | 114 |
| `hidden-option-boundary.test.ts` | `1cc16605…27072e` | `af1bf67d…40433` | 100 |
| `hypnotic-pattern-probe.test.ts` | `3696b6a7…95c8` | `468fd649…c2f3` | 107 |
| `last-seen.test.ts` | `566d1a83…d847f` | `611dae0f…c114` | 100 |
| `local-session-store.test.ts` | `baa5806a…02135` | `7d7eee67…e9458` | 100 |
| `mixed-kind-multiattack.test.ts` | `d2ceafcc…0cc73e` | `104e2aea…13259` | 111 |

No added line exceeds 120 characters.

### Migration summary

- `engine-query-port.test.ts`: explicit generator/resolver environment at lines 72, 82, 150, 152, 183, 204, 277, 280, 301, 304, and 329.
- `engine-round-session.test.ts`: bound option generation/resolution at 119, 137, 176, 301, 812, and 1056; query forwarding at 722; environment passed to all session constructions at 238, 272, 319, 337, 373, 391, 425, 453, 527, 533, 621, 627, 692, 788, 836, 872, 925, 962, 1006, 1034, 1076, 1103, and 1142.
- `engine-state-capsule.test.ts`: revision-bound environment built at 36–41; explicit board, registry, capsule, option and resolver calls at 154, 159–175, 216, 359, 386–388, 432, 445, 460, 513, 521, 593, and 602.
- `footprint-increment-four.test.ts`: DM projection receives the environment at line 449.
- `footprint-increment-three.test.ts`: query calls route through `environment.queries` at 86, 91, 102, and 205; runtime environments at 109, 149, 202, 219, and 230.
- `hidden-option-boundary.test.ts`: both MCP runtime roots receive the environment at lines 27 and 98.
- `hypnotic-pattern-probe.test.ts`: explicit environment/resolver arguments at 116, 139–140, 163, 235–237, 251, 290, 299, 301, 317, 338, and 343.
- `last-seen.test.ts`: DM projection receives the environment at line 259.
- `local-session-store.test.ts`: all 13 host roots receive the environment at 84, 508, 888, 968, 1009, 1069, 1081, 1098, 1150, 1172, 1206, 1351, and 1385.
- `mixed-kind-multiattack.test.ts`: bound generation/resolution/session calls at 45, 60, 99, and 119.

`canonicalEngineQueryPort` remains only in `engine-query-port.test.ts`, at lines 12, 70, 106, 144, 179, 182, 188, 200, 201, 222, and 257. These references directly test the canonical port and are explicitly permitted by the B15 architecture rule.

No obsolete structural environment type remains. The residual grep for old factories, ambient resolver, convenience registry/capsule construction, and obsolete environment types was empty.

No boundary fixture was reconstructed: the hidden-option and mixed-kind fixtures retained their original public generator/runtime paths and byte-identical assertions.

Actor-knowledge and digest pins left unchanged:

- Capsule binding digest: lines 338–340.
- Capsule observation-history projection key: line 574.
- Footprint actor-knowledge policy and target pins: lines 187–195.
- Last-seen and observation-history pins: lines 80–93, 108–123, 138–151, 161–168, 206–230, and 237–250.

### Mutant evidence

| Control | Production SHA → mutant SHA | Killing result |
|---|---|---|
| Query path geometry | `4344c0f2…131f5` → `4c4013d3…1183b` | Expected legal path/cost 10; received illegal path |
| Round multiattack omission | `c2b5b177…48c86` → `129e0332…d638` | Expected `remaining_attack_target_dead`; received no deviation |
| Capsule digest verification | `7940c27c…0c93` → `f5762683…803ba` | Expected digest mismatch to throw; it did not |
| Pending-placement projection | `281dfa9a…98510` → `c0838928…f2c3` | Expected recovery object; received `null` |
| Footprint distance | `4344c0f2…131f5` → `96903fdc…3c5f` | Expected 25 feet; received 0 |
| Hidden-option refusal | `4bd20ca9…e1a6f` → `0c8f3ef4…af609` | Expected `OPTION_NOT_SHOWN`; received valid proposal |
| Hypnotic Pattern geometry | `7c1c1e2a…22ef9` → `471f9dde…3e90` | Cube control failed with invalid grid geometry |
| Last-seen provenance | `6e6e2fec…b536e` → `9f141d9e…4c4f` | Expected round 1; received round 2 |
| Autosave pruning | `8c7bf0b1…85820` → `f101b295…1dd6` | Expected 10 snapshots; received 11 |
| Mixed-kind suppression | `7c1c1e2a…22ef9` → `c25b9ee0…9dfd` | Expected standalone component absent; received present |

Every mutated production file was restored with `cp`; all restored SHAs matched the pristine values above.

### Final green

Commands and results:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

```text
bash scripts/check-command-outcomes.sh
exit 0
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts,
offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B7 suites:

| Suite | Tests |
|---|---:|
| engine-query-port | 9 |
| engine-round-session | 21 |
| engine-state-capsule | 11 |
| footprint-increment-four | 8 |
| footprint-increment-three | 9 |
| hidden-option-boundary | 4 |
| hypnotic-pattern-probe | 6 |
| last-seen | 8 |
| local-session-store | 58 |
| mixed-kind-multiattack | 3 |
| **Total** | **137/137** |

Environment suites: 3 files, 15/15 tests passed.

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
engine-query-port.test.ts=0
engine-round-session.test.ts=0
engine-state-capsule.test.ts=0
footprint-increment-four.test.ts=0
footprint-increment-three.test.ts=0
hidden-option-boundary.test.ts=0
hypnotic-pattern-probe.test.ts=0
last-seen.test.ts=0
local-session-store.test.ts=0
mixed-kind-multiattack.test.ts=0
```

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b7-after.json
643 discovered files; no new specs

package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status contains exactly the ten allowed B7 files, all modified and no untracked files.

S3 B7 DONE
diff --git a//tmp/s3-b6-forward-overlay.mjs b//tmp/s3-b6-forward-overlay.mjs
index 64e2fd51b5eacbaf2c98ac0b668e663d08c764f7..f52b32c71c2f9561ebaa6cd5d939a5bb8e6f2c2e
--- a//tmp/s3-b6-forward-overlay.mjs
+++ b//tmp/s3-b6-forward-overlay.mjs
@@ -4,16 +4,16 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'tests/unit/vtt/composite-turn-proposals.test.ts',
-  'tests/unit/vtt/controller-assignment.test.ts',
-  'tests/unit/vtt/d466-b4-spell-payloads.test.ts',
-  'tests/unit/vtt/detection-ui.test.ts',
-  'tests/unit/vtt/dm-tactical-intel.test.ts',
-  'tests/unit/vtt/encounter-board-projection.test.ts',
-  'tests/unit/vtt/encounter-projections.test.ts',
-  'tests/unit/vtt/engine-context-integrations.test.ts',
-  'tests/unit/vtt/engine-host-integration.test.ts',
-  'tests/unit/vtt/engine-opportunity-movement-intel.test.ts',
+  'tests/unit/vtt/engine-query-port.test.ts',
+  'tests/unit/vtt/engine-round-session.test.ts',
+  'tests/unit/vtt/engine-state-capsule.test.ts',
+  'tests/unit/vtt/footprint-increment-four.test.ts',
+  'tests/unit/vtt/footprint-increment-three.test.ts',
+  'tests/unit/vtt/hidden-option-boundary.test.ts',
+  'tests/unit/vtt/hypnotic-pattern-probe.test.ts',
+  'tests/unit/vtt/last-seen.test.ts',
+  'tests/unit/vtt/local-session-store.test.ts',
+  'tests/unit/vtt/mixed-kind-multiattack.test.ts',
 ];
 const virtual = new Map();
 
@@ -221,7 +221,12 @@
 for (const diagnostic of diagnostics) {
   if (diagnostic.file === undefined) continue;
   const relative = path.relative(root, diagnostic.file.fileName);
-  if (counts.has(relative)) counts.set(relative, (counts.get(relative) ?? 0) + 1);
+  if (counts.has(relative)) {
+    counts.set(relative, (counts.get(relative) ?? 0) + 1);
+    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
+    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
+    console.log(`DIAG ${relative}:${String(position.line + 1)}:${String(position.character + 1)} TS${String(diagnostic.code)} ${message}`);
+  }
 }
 console.log('providerEdits=66 removedFactories=4');
 for (const relative of group) console.log(`${relative}=${String(counts.get(relative) ?? 0)}`);
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index dd011d750bee53b90e6be41349359e1fc70256e9..4c4b0969b1117e845cf0bdb2ad953f4e487b209e
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -619,7 +619,7 @@
       name: subject.profile.name,
       kind: combatantSide(state, subject.profile.id),
       cell: { ...latest.cell },
-      round: latest.round,
+      round: latest.round + 1,
     }];
   }).sort((left, right) =>
     (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
diff --git a/src/vtt/encounter-projections.ts b/src/vtt/encounter-projections.ts
index 2587c136fff4788269644b519ebf6d6a76a06568..a051e5aef1d5204dda205fe2ec5dd2fac4646c66
--- a/src/vtt/encounter-projections.ts
+++ b/src/vtt/encounter-projections.ts
@@ -515,7 +515,7 @@
     },
     timeline: projectEncounterTimeline(input.view.state, input.history),
     worldObjectControls,
-    pendingPlacementRecovery: recovery,
+    pendingPlacementRecovery: null,
   };
 }
 
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index 08061b7be444f43b02f6f885700898fe19ebf3af..e186c41bc7d9f880ef06ef85ca8f986175f563cf
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -1847,7 +1847,7 @@
       const leftSpace = leftAnchor === undefined
         ? queryCombatantSpace(state, left)
         : queryCombatantSpaceAt(state, left, leftAnchor);
-      return minimumSpaceDistance(leftSpace, queryCombatantSpace(state, right));
+      return 0;
     });
   },
   sameSide: (state, left, right) => combatantsAreAllies(state, left, right),
diff --git a/src/vtt/engine-round-session.ts b/src/vtt/engine-round-session.ts
index 777d2153b690989552eb936c21377adca7b937d6..ba66844166de99f1a966475a52f5bc0f192e420a
--- a/src/vtt/engine-round-session.ts
+++ b/src/vtt/engine-round-session.ts
@@ -612,7 +612,7 @@
         }
         const appliedProposal = applyOneResolvedProposal(state, mechanics, reduce, this.offerEnvironment.queries);
         state = appliedProposal.state;
-        if (appliedProposal.remainingAttackTargetDead) {
+        if (false) {
           reasonCodes.push('remaining_attack_target_dead');
           refusalCodes.push('TARGET_DIED_DURING_OPTION');
         }
diff --git a/src/vtt/engine-state-capsule.ts b/src/vtt/engine-state-capsule.ts
index 425cb7c0e0316a020ac976d282d879a78c6c96e0..b1a6704a14924fd69468079cdaa5a3d5bc160492
--- a/src/vtt/engine-state-capsule.ts
+++ b/src/vtt/engine-state-capsule.ts
@@ -642,7 +642,7 @@
     capsuleText(rule['sourceLocator'], 'sourceLocator', 500);
   });
   const { digest: _digest, generatedAt: _generatedAt, ...body } = record;
-  if (digest !== digestFor(body as unknown as CapsuleDigestInput)) {
+  if (false) {
     throw new EngineStateCapsuleDecodeError('digest_mismatch', 'State capsule digest is invalid.');
   }
   return deepFreeze(structuredClone(record) as unknown as EngineStateCapsule);
diff --git a/src/vtt/local-session-store.ts b/src/vtt/local-session-store.ts
index 6f05f200dad5bc6194c947a6ed6102296960ba00..ab7ef77979848787501d2081166d3b964129ab8c
--- a/src/vtt/local-session-store.ts
+++ b/src/vtt/local-session-store.ts
@@ -529,7 +529,7 @@
           const newest = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
           return newest === 0 ? right.storageId.localeCompare(left.storageId) : newest;
         })
-        .slice(10);
+        .slice(11);
       for (const snapshot of expired) {
         this.#snapshots.delete(snapshot.storageId);
         removed.push(snapshot.storageId);
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index ca9d66e7c5f21b7b9f9938b811221ce7c67db680..90f0c90829d01df36c5003907a22c5624ff4a503
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -496,6 +496,7 @@
   proposal: EngineTurnProposal,
   shownOptionIds: ReadonlySet<EngineOptionId> | undefined,
 ): readonly ProposalContractRefusal[] {
+  return [];
   if (shownOptionIds === undefined) return [];
   return ([
     ['primary', proposal.primaryOptionId],
diff --git a/src/vtt/offers/offer-declarations.ts b/src/vtt/offers/offer-declarations.ts
index 46f4ee452d6cebc5e8d470024755e512db9b4372..a669a31cd8ea1ef02be940d7506e31a5fb376fe7
--- a/src/vtt/offers/offer-declarations.ts
+++ b/src/vtt/offers/offer-declarations.ts
@@ -422,7 +422,7 @@
   const multiattacks = actions.filter(
     (action): action is MonsterMultiattackAction => action.kind === 'multiattack',
   );
-  const attacks = multiattacks.length === 0
+  const attacks = true
     ? actions.filter((action): action is MonsterAttackAction => action.kind === 'attack').flatMap((action) =>
         enemies.map((enemy): MainUseOption => ({
           label: `${action.name} -> ${enemy}`,
diff --git a/tests/unit/vtt/engine-query-port.test.ts b/tests/unit/vtt/engine-query-port.test.ts
index fbc7f8012f134c9534f6372c55a0833350aef379..6f82a5256a204c1b76cd3a5ba6a21150858f95bd
--- a/tests/unit/vtt/engine-query-port.test.ts
+++ b/tests/unit/vtt/engine-query-port.test.ts
@@ -10,16 +10,22 @@
 import { projectDmView } from '../../../src/combat/visibility';
 import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
+import {
+  availableEngineActorOptions,
+  createPureTurnProposalResolver,
+  engineActorOptionsForEnvironment,
+} from '../../../src/vtt/intent-resolver';
 import { engineOptionId } from '../../../src/vtt/turn-proposal';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
-import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { placedToken, playerProfile } from '../combat/fixtures';
 
 const SEED = 3_943_001;
 const ACTOR_ID = combatantId('combatant:generated-3943001-monster-2');
 const TARGET_ID = combatantId('combatant:fighter');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
 function placedState(
   seed: number,
@@ -63,7 +69,7 @@
 
     expect(canonicalEngineQueryPort.actions(state, ACTOR_ID).map((action) => action.id))
       .toEqual(['dissolving-pseudopod']);
-    const options = availableEngineActorOptions(state, ACTOR_ID);
+    const options = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT);
     expect(options.map(({ label }) => label)).toEqual([
       'Dash',
       'Dissolving Pseudopod -> combatant:fighter',
@@ -73,7 +79,8 @@
     expect(options.flatMap(({ actionSlots }) => actionSlots.map(({ use }) => use.kind))).toEqual([
       'dash', 'attack', 'dodge', 'end_turn',
     ]);
-    expect(engineActorOptions(state, ACTOR_ID).humanOnly).toContainEqual(expect.objectContaining({
+    expect(engineActorOptionsForEnvironment(state, ACTOR_ID, OFFER_ENVIRONMENT).humanOnly)
+      .toContainEqual(expect.objectContaining({
       label: 'Disengage',
       noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
     }));
@@ -140,9 +147,10 @@
       movement: 'dash',
       maximumFeet: 60,
     })).toEqual({ legal: false, code: 'destination_unreachable' });
-    expect(availableEngineActorOptions(state, ACTOR_ID).map(({ label }) => label))
+    expect(availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).map(({ label }) => label))
       .toEqual(['Dodge', 'End Turn']);
-    expect(engineActorOptions(state, ACTOR_ID).humanOnly).toContainEqual(expect.objectContaining({
+    expect(engineActorOptionsForEnvironment(state, ACTOR_ID, OFFER_ENVIRONMENT).humanOnly)
+      .toContainEqual(expect.objectContaining({
       label: 'Disengage',
       noModeledEffect: { kind: 'disengage_without_movement', action: 'disengage' },
     }));
@@ -172,7 +180,8 @@
       tier: 'half', sourceIds: [`object:${lowCover.id}`],
     });
     expect(canonicalEngineQueryPort.visibility(partial, actor.id, target.id)).toMatchObject({ visible: true });
-    expect(availableEngineActorOptions(partial, actor.id).some((option) => option.actionSlots.some((slot) =>
+    expect(availableEngineActorOptions(partial, actor.id, OFFER_ENVIRONMENT).some((option) =>
+      option.actionSlots.some((slot) =>
       slot.use.kind === 'attack' && slot.use.target.kind === 'combatant' && slot.use.target.combatantId === target.id))).toBe(true);
     const boardObject = projectEncounterBoard(projectDmView(partial)).worldObjects.find((object) => object.id === lowCover.id);
     expect(boardObject === undefined ? null : terrainKindOfWireBlocking(boardObject.blocking)).toBe('half_cover');
@@ -192,7 +201,8 @@
     expect(canonicalEngineQueryPort.visibility(walled, actor.id, target.id)).toMatchObject({
       visible: false, reason: 'blocked',
     });
-    expect(availableEngineActorOptions(walled, actor.id).some((option) => option.actionSlots.some((slot) =>
+    expect(availableEngineActorOptions(walled, actor.id, OFFER_ENVIRONMENT).some((option) =>
+      option.actionSlots.some((slot) =>
       slot.use.kind === 'attack' && slot.use.target.kind === 'combatant' && slot.use.target.combatantId === target.id))).toBe(false);
     expect(() => reduceEncounter(walled, monsterAttackCommand(attack, actor.id, target.id), () => 0.5))
       .toThrow('Total Cover or is outside line of sight');
@@ -264,10 +274,10 @@
       [TARGET_ID, { column: 4, row: 0 }],
     ]));
 
-    const fallback = availableEngineActorOptions(state, ACTOR_ID).find((option) =>
+    const fallback = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).find((option) =>
       option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'light-hammer'));
     if (fallback === undefined) throw new Error('Fixture omitted the Light Hammer option.');
-    const resolved = pureTurnProposalResolver.resolve(state, {
+    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, {
       actorId: ACTOR_ID, expectedRevision: state.revision,
       primaryOptionId: engineOptionId('option:missing-grab'), fallbackOptionId: fallback.optionId,
       reason: 'Exercise the engine query proposal fixture.',
@@ -288,10 +298,10 @@
       [TARGET_ID, { column: 4, row: 0 }],
     ]));
 
-    const grab = availableEngineActorOptions(state, ACTOR_ID).find((option) =>
+    const grab = availableEngineActorOptions(state, ACTOR_ID, OFFER_ENVIRONMENT).find((option) =>
       option.actionSlots.some((slot) => slot.use.kind === 'attack' && slot.use.actionId === 'grab'));
     if (grab === undefined) throw new Error('Fixture omitted the Grab option.');
-    const resolved = pureTurnProposalResolver.resolve(state, {
+    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, {
       actorId: ACTOR_ID, expectedRevision: state.revision,
       primaryOptionId: grab.optionId, fallbackOptionId: null,
       reason: 'Exercise the engine query grab fixture.', overrideJustification: null,
@@ -316,7 +326,7 @@
         : candidate),
     };
 
-    expect(pureTurnProposalResolver.resolve(state, {
+    expect(TURN_PROPOSAL_RESOLVER.resolve(state, {
       actorId: ACTOR_ID, expectedRevision: state.revision,
       primaryOptionId: engineOptionId('option:dead-target-grab'), fallbackOptionId: null,
       reason: 'Exercise the engine query resolution fixture.',
diff --git a/tests/unit/vtt/engine-round-session.test.ts b/tests/unit/vtt/engine-round-session.test.ts
index 1c62ff216e7bd277ea1553061d19927b19d31cee..e28c0098c3ce10fbae9631f7386f1ce54e7ebf02
--- a/tests/unit/vtt/engine-round-session.test.ts
+++ b/tests/unit/vtt/engine-round-session.test.ts
@@ -36,16 +36,16 @@
 } from '../../../src/vtt/engine-round-session';
 import {
   availableEngineActorOptions,
-  pureTurnProposalResolver,
+  createPureTurnProposalResolver,
   type EngineTurnProposal,
 } from '../../../src/vtt/intent-resolver';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
 import { decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
 import { runCommandBoundaryTransaction } from '../../../src/vtt/engine-round-application';
 import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const REQUEST: EngineRoundCapsuleRequest = {
   runId: encounterSessionId('encounter:engine-round-session-test'),
@@ -63,6 +63,8 @@
 const FOCUS_ID = combatantId('combatant:fighter');
 const CLERIC_ID = combatantId('combatant:cleric');
 const WIZARD_ID = combatantId('combatant:wizard');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
 function recordBoundaryPrefixDraw(rng: TransactionalRollRng): void {
   const component = rng.beginComponent({
@@ -114,7 +116,7 @@
   targetId: CombatantId,
 ): EngineTurnProposal {
   const planningState = projectFutureMonsterTurns(state, [actorId]);
-  const options = availableEngineActorOptions(planningState, actorId);
+  const options = availableEngineActorOptions(planningState, actorId, OFFER_ENVIRONMENT);
   const primary = options.find((option) => option.actionSlots.some((slot) => {
     const use = slot.use;
     if (use.kind === 'attack') return use.actionId === actionId && use.target.kind === 'combatant' && use.target.combatantId === targetId;
@@ -132,7 +134,7 @@
 
 function authorized(state: EncounterState, proposal: EngineTurnProposal): AuthorizedEngineTurnProposal {
   const planningState = projectFutureMonsterTurns(state, [proposal.actorId]);
-  const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
+  const resolution = TURN_PROPOSAL_RESOLVER.resolve(planningState, proposal);
   if (!resolution.valid) throw new Error(`Test proposal was not authorizable: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
   return {
     proposal, option: resolution.option, primaryOption: resolution.primaryOption,
@@ -171,7 +173,7 @@
 
 function dodgeProposal(state: EncounterState, actorId: CombatantId): EngineTurnProposal {
   const planningState = projectFutureMonsterTurns(state, [actorId]);
-  const dodge = availableEngineActorOptions(planningState, actorId)
+  const dodge = availableEngineActorOptions(planningState, actorId, OFFER_ENVIRONMENT)
     .find((option) => option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
   if (dodge === undefined) throw new Error(`Test fixture omitted Dodge for ${actorId}.`);
   return {
@@ -233,6 +235,7 @@
       queued,
       mulberry32(58_410_003),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
 
     const applied = session.applyResolvedMechanics([], null);
@@ -266,7 +269,7 @@
     };
     const session = new EngineRoundSession(killed, mulberry32(46_600_004), {
       kind: 'unattended', askDefault: 'decline',
-    });
+    }, OFFER_ENVIRONMENT);
 
     session.beginRoundWithoutSkipping({ ...REQUEST, revision: killed.revision }, null);
 
@@ -295,7 +298,7 @@
     };
     const lion = authorized(state, attackProposal(state, BRUTE_ID, 'rend', FOCUS_ID));
     expect(lion.mechanics.actionSlots.map((use) => use.kind)).toEqual(['attack', 'attack']);
-    const mixedOption = availableEngineActorOptions(state, BRUTE_ID).find((option) =>
+    const mixedOption = availableEngineActorOptions(state, BRUTE_ID, OFFER_ENVIRONMENT).find((option) =>
       option.label.startsWith('Rend + Roar') && option.actionSlots.some((slot) =>
         slot.slot === 'main' && slot.use.kind === 'multiattack' &&
         slot.use.components.every((component) => component.target.kind === 'combatant' &&
@@ -313,7 +316,7 @@
 
     const session = new EngineRoundSession(state, mulberry32(46_600_002), {
       kind: 'unattended', askDefault: 'decline',
-    });
+    }, OFFER_ENVIRONMENT);
     session.applyResolvedMechanics([mixed], null);
     const events = session.currentState().eventLog.filter((event) =>
       (event.type === 'attack_resolved' && event.actor === BRUTE_ID) ||
@@ -331,6 +334,7 @@
       state,
       mulberry32(8_274_114),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     session.applyResolvedMechanics([archer], null);
 
@@ -366,6 +370,7 @@
       state,
       mulberry32(8_274_115),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     session.applyResolvedMechanics([archer], null);
 
@@ -383,6 +388,7 @@
       segmentedState(),
       mulberry32(8_274_113),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
 
     session.beginRoundWithoutSkipping(REQUEST, null);
@@ -416,6 +422,7 @@
         segmentedState(),
         mulberry32(6_103_921),
         { kind: 'unattended', askDefault: 'decline' },
+        OFFER_ENVIRONMENT,
       );
       session.beginRoundWithoutSkipping(REQUEST, null);
       completeDodge(session, FOCUS_ID);
@@ -443,6 +450,7 @@
       state,
       mulberry32(7_210_411),
       { kind: 'unattended', askDefault: 'take' },
+      OFFER_ENVIRONMENT,
     );
     session.beginRoundWithoutSkipping(REQUEST, null);
     session.completeScriptedPcTurn({
@@ -516,11 +524,13 @@
       started,
       mulberry32(seed),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     const untouchedControl = new EngineRoundSession(
       started,
       mulberry32(seed),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     const beforeFailureBytes = canonicalJson(failedSession.currentState());
 
@@ -608,11 +618,13 @@
       state,
       mulberry32(seed),
       { kind: 'unattended', askDefault: 'take' },
+      OFFER_ENVIRONMENT,
     );
     const untouchedControl = new EngineRoundSession(
       state,
       mulberry32(seed),
       { kind: 'unattended', askDefault: 'take' },
+      OFFER_ENVIRONMENT,
     );
     const beforeFailureBytes = canonicalJson(failedSession.currentState());
 
@@ -677,6 +689,7 @@
       started,
       mulberry32(seed),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     const first = authorized(started, attackProposal(started, KILLER_ID, 'dagger', FOCUS_ID));
 
@@ -706,7 +719,7 @@
       targetId: CombatantId,
       rng: ReturnType<typeof mulberry32>,
     ): EncounterState => {
-      const action = canonicalEngineQueryPort.actions(current, actorId)
+      const action = OFFER_ENVIRONMENT.queries.actions(current, actorId)
         .find((candidate): candidate is MonsterAttackAction =>
           candidate.kind === 'attack' && candidate.id === actionId);
       if (action === undefined) throw new Error(`Direct oracle omitted ${actionId}.`);
@@ -772,6 +785,7 @@
         generateRoom(seed).encounter.state,
         mulberry32(8_274_113),
         { kind: 'unattended', askDefault: 'decline' },
+        OFFER_ENVIRONMENT,
       );
 
       const prepared = session.prepareRound(REQUEST, null);
@@ -795,7 +809,7 @@
         decision.kind === 'death_save')).toBe(false);
       for (const actorId of prepared.snapshot.capsule.request?.actors ?? []) {
         const proposal = dodgeProposal(session.currentState(), actorId);
-        const resolution = pureTurnProposalResolver.resolve(
+        const resolution = TURN_PROPOSAL_RESOLVER.resolve(
           projectFutureMonsterTurns(session.currentState(), [actorId]),
           proposal,
         );
@@ -815,7 +829,12 @@
       started = reduceEncounter(started, { type: 'end_turn', actor: active }, rng).state;
     }
     expect(started.pendingDecisions).toContainEqual(expect.objectContaining({ kind: 'death_save' }));
-    const session = new EngineRoundSession(started, rng, { kind: 'dm_attended' });
+    const session = new EngineRoundSession(
+      started,
+      rng,
+      { kind: 'dm_attended' },
+      OFFER_ENVIRONMENT,
+    );
 
     expect(() => session.prepareRound(REQUEST, null)).toThrow(
       'The turn cannot advance while a pending decision for this boundary is unresolved.',
@@ -846,7 +865,12 @@
     };
     const killer = authorized(state, attackProposal(state, KILLER_ID, 'dagger', FOCUS_ID));
     const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', FOCUS_ID));
-    const session = new EngineRoundSession(state, mulberry32(19), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      state,
+      mulberry32(19),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
 
     const applied = session.applyResolvedMechanics([killer, archer], null);
 
@@ -898,7 +922,7 @@
     const lion = authorized(state, attackProposal(state, BRUTE_ID, 'rend', FOCUS_ID));
     const session = new EngineRoundSession(state, mulberry32(46_600_006), {
       kind: 'unattended', askDefault: 'decline',
-    });
+    }, OFFER_ENVIRONMENT);
 
     const applied = session.applyResolvedMechanics([lion], null);
 
@@ -935,6 +959,7 @@
       state,
       mulberry32(19),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     session.beginRoundWithoutSkipping(REQUEST, null);
     session.completeScriptedPcTurn({
@@ -974,7 +999,12 @@
         : token),
     };
     const earlierDodge = authorized(displacedState, dodgeProposal(displacedState, KILLER_ID));
-    const session = new EngineRoundSession(displacedState, mulberry32(23), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      displacedState,
+      mulberry32(23),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
 
     const applied = session.applyResolvedMechanics([earlierDodge, archer], null);
 
@@ -997,7 +1027,12 @@
       [FOCUS_ID, { column: 4, row: 0 }],
     ]));
     const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', FOCUS_ID));
-    const session = new EngineRoundSession(state, mulberry32(29), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      state,
+      mulberry32(29),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
 
     const applied = session.applyResolvedMechanics([archer], null);
     const attack = session.currentState().eventLog.find((event) =>
@@ -1018,7 +1053,8 @@
       [FOCUS_ID, { column: 4, row: 0 }],
     ]), 130);
     const baseProposal = attackProposal(authorizationState, ARCHER_ID, 'longbow', FOCUS_ID);
-    const secondOffense = availableEngineActorOptions(authorizationState, ARCHER_ID).find((option) =>
+    const secondOffense = availableEngineActorOptions(authorizationState, ARCHER_ID, OFFER_ENVIRONMENT)
+      .find((option) =>
       option.optionId !== baseProposal.primaryOptionId && option.actionSlots.some((slot) =>
         slot.use.kind === 'attack' || slot.use.kind === 'multiattack'));
     if (secondOffense === undefined) throw new Error('Fixture omitted a second offensive option.');
@@ -1033,7 +1069,12 @@
         return token;
       }),
     };
-    const session = new EngineRoundSession(displacedState, mulberry32(31), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      displacedState,
+      mulberry32(31),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
 
     const applied = session.applyResolvedMechanics([archer], null);
 
@@ -1059,6 +1100,7 @@
       positioned,
       mulberry32(58_310_201),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     session.beginRoundWithoutSkipping(REQUEST, null);
     const active = session.currentState();
@@ -1097,6 +1139,7 @@
       prePostPositioned,
       mulberry32(58_310_204),
       { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
     );
     prePostSession.beginRoundWithoutSkipping(REQUEST, null);
     const beforePreBoundary = prePostSession.currentState();
diff --git a/tests/unit/vtt/engine-state-capsule.test.ts b/tests/unit/vtt/engine-state-capsule.test.ts
index 9abf2424e93727a9319abbf14a8b799eee0ae386..e26c2cffb98df68944f8382807126f001f5326a9
--- a/tests/unit/vtt/engine-state-capsule.test.ts
+++ b/tests/unit/vtt/engine-state-capsule.test.ts
@@ -12,7 +12,6 @@
   type ProposalSink,
 } from '../../../src/vtt/engine-envelopes';
 import {
-  createEngineStateCapsule,
   createEngineStateCapsuleForEnvironment,
   decodeEngineStateCapsule,
   EngineStateCapsuleDecodeError,
@@ -23,17 +22,25 @@
   projectEngineEncounterState,
   verifyEngineStateCapsule,
 } from '../../../src/vtt/engine-state-capsule';
-import { canonicalEngineQueryPort, engineActionRegistry } from '../../../src/vtt/engine-query-port';
+import { engineActionRegistryForEnvironment } from '../../../src/vtt/engine-query-port';
 import { projectDmBoard } from '../../../src/vtt/encounter-projections';
-import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
+import { availableEngineActorOptions, createPureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
 import { freshMonsterPlanningState } from '../../../src/vtt/mcp/entrypoint';
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { HAND_AUTHORED_CAPSULE_V3_BODY } from '../../fixtures/vtt/creature-space-migration-fixtures';
-import {
-  createLegacyEngineOptionEnvironmentBinding,
-  createRevisionBoundEngineOptionEnvironment,
-} from '../../../src/vtt/offers/offer-environment';
+import { createDisabledEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const REVISION_BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'revision_bound',
+  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
+  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
+});
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(REVISION_BOUND_OFFER_ENVIRONMENT);
+
 const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
 const authorityBoundaryEntries = [
   resolve(repoRoot, 'src/vtt/engine-state-capsule.ts'),
@@ -144,24 +151,29 @@
     },
     controllers: [],
     history: [],
+    offerEnvironment: REVISION_BOUND_OFFER_ENVIRONMENT,
   });
   const runId = encounterSessionId('encounter:mcp-migration');
   const branchId = encounterBranchId('branch:mcp-migration');
   const requestId = 'request:mcp-migration';
-  const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
   const capsule = createEngineStateCapsuleForEnvironment({
     runId,
     branchId,
     revision: 1,
     generatedAt: '2026-08-27T12:00:00.000Z',
-    offerEnvironment: environment.binding,
+    offerEnvironment: REVISION_BOUND_OFFER_ENVIRONMENT.binding,
     request: {
       requestId,
       phase: 'initial',
       correctionNumber: 0,
       actors: [actor.profile.id],
     },
-    projection: projectEngineDmProjection(board, engineActionRegistry(state), state.observationHistory, 1),
+    projection: projectEngineDmProjection(
+      board,
+      engineActionRegistryForEnvironment(state, REVISION_BOUND_OFFER_ENVIRONMENT),
+      state.observationHistory,
+      1,
+    ),
   });
   return { state, actor: actor.profile.id, target: target.profile.id, requestId, capsule };
 }
@@ -201,7 +213,7 @@
     const body = {
       ...schemaThreeBody,
       schemaVersion: 4,
-      offerEnvironment: createLegacyEngineOptionEnvironmentBinding(),
+      offerEnvironment: OFFER_ENVIRONMENT.binding,
     };
     const fixture = {
       ...body,
@@ -336,7 +348,7 @@
     );
 
     const changedBinding = rehash(capsule);
-    changedBinding['offerEnvironment'] = createLegacyEngineOptionEnvironmentBinding();
+    changedBinding['offerEnvironment'] = OFFER_ENVIRONMENT.binding;
     expect(() => decodeEngineStateCapsule(changedBinding)).toThrowError(
       expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'digest_mismatch' }),
     );
@@ -344,7 +356,7 @@
 
   it('gives board-derived and direct projection paths identical placed and pending semantics', () => {
     const fixture = capsuleFixture();
-    const registry = engineActionRegistry(fixture.state);
+    const registry = engineActionRegistryForEnvironment(fixture.state, REVISION_BOUND_OFFER_ENVIRONMENT);
     const direct = projectEngineEncounterState(fixture.state, registry, fixture.capsule.projection.initiative, 1);
     expect(direct).toEqual(fixture.capsule.projection);
 
@@ -371,8 +383,9 @@
       },
       controllers: [],
       history: [],
+      offerEnvironment: REVISION_BOUND_OFFER_ENVIRONMENT,
     });
-    const pendingRegistry = engineActionRegistry(pendingState);
+    const pendingRegistry = engineActionRegistryForEnvironment(pendingState, REVISION_BOUND_OFFER_ENVIRONMENT);
     const fromBoard = projectEngineDmProjection(pendingBoard, pendingRegistry, pendingState.observationHistory, 1);
     const fromState = projectEngineEncounterState(pendingState, pendingRegistry, fromBoard.initiative, 1);
     expect(fromState).toEqual(fromBoard);
@@ -416,25 +429,27 @@
       })),
       adjustmentBudget: 2 as const,
     };
-    const capsule = createEngineStateCapsule({
+    const capsule = createEngineStateCapsuleForEnvironment({
       runId: fixture.capsule.runId,
       branchId: fixture.capsule.branchId,
       revision: 12,
       generatedAt: '2026-08-29T12:00:00.000Z',
       request,
       projection: fixture.capsule.projection,
+      offerEnvironment: fixture.capsule.offerEnvironment,
     });
 
     expect(engineCapsuleRequestKind(request)).toBe('plan_adjustment');
     expect(capsule.request).toEqual(request);
     expect(verifyEngineStateCapsule(capsule)).toBe(true);
-    expect(() => createEngineStateCapsule({
+    expect(() => createEngineStateCapsuleForEnvironment({
       runId: fixture.capsule.runId,
       branchId: fixture.capsule.branchId,
       revision: 12,
       generatedAt: '2026-08-29T12:00:00.000Z',
       request: { ...request, adjustmentBudget: 1 },
       projection: fixture.capsule.projection,
+      offerEnvironment: fixture.capsule.offerEnvironment,
     })).toThrow('Plan adjustment actors, baseline proposal digests, and budget must match exactly.');
   });
 
@@ -442,7 +457,7 @@
     const fixture = capsuleFixture();
     const actors = fixture.state.combatants.flatMap((combatant) =>
       combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []);
-    const capsule = createEngineStateCapsule({
+    const capsule = createEngineStateCapsuleForEnvironment({
       runId: fixture.capsule.runId,
       branchId: fixture.capsule.branchId,
       revision: 8,
@@ -466,6 +481,7 @@
         adjustmentBudget: 2,
       },
       projection: fixture.capsule.projection,
+      offerEnvironment: fixture.capsule.offerEnvironment,
     });
     const source = new FixedReadonlyStateCapsuleSource(capsule);
     const accepted: EngineProposalEnvelope[] = [];
@@ -494,7 +510,7 @@
       baseline_plan_hash: 'c'.repeat(64),
     })).toThrow('Plan adjustment proposal does not match the baseline plan hash.');
     const updates = actors.map((actorId) => {
-      const option = availableEngineActorOptions(fixture.state, actorId)
+      const option = availableEngineActorOptions(fixture.state, actorId, REVISION_BOUND_OFFER_ENVIRONMENT)
         .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
       if (option === undefined) throw new Error(`Fixture omitted Dodge for ${actorId}.`);
       const proposal = {
@@ -502,7 +518,7 @@
         fallbackOptionId: null,
         reason: 'Exercise the state capsule fixture.', overrideJustification: null,
       };
-      const resolution = pureTurnProposalResolver.resolve(fixture.state, proposal);
+      const resolution = TURN_PROPOSAL_RESOLVER.resolve(fixture.state, proposal);
       if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
       return {
         proposal,
@@ -571,7 +587,11 @@
     const fixture = capsuleFixture();
     const source = new FixedReadonlyStateCapsuleSource(fixture.capsule);
     const stateHandle = engineStateHandle(fixture.capsule);
-    const option = availableEngineActorOptions(fixture.state, fixture.actor)
+    const option = availableEngineActorOptions(
+      fixture.state,
+      fixture.actor,
+      REVISION_BOUND_OFFER_ENVIRONMENT,
+    )
       .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
     if (option === undefined) throw new Error('Fixture omitted Dodge.');
     const proposal = {
@@ -579,7 +599,7 @@
       fallbackOptionId: null,
       reason: 'Exercise the restored capsule fixture.', overrideJustification: null,
     };
-    const resolution = pureTurnProposalResolver.resolve(fixture.state, proposal);
+    const resolution = TURN_PROPOSAL_RESOLVER.resolve(fixture.state, proposal);
     if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
     const envelope: EngineProposalEnvelope = {
       kind: 'round_turn_proposal',
diff --git a/tests/unit/vtt/footprint-increment-four.test.ts b/tests/unit/vtt/footprint-increment-four.test.ts
index 33e2c46ef0b698ccc854afb8542287bf40189849..0c3ed16161a0c19d31f37ae433abc1a7cf0e782b
--- a/tests/unit/vtt/footprint-increment-four.test.ts
+++ b/tests/unit/vtt/footprint-increment-four.test.ts
@@ -37,6 +37,7 @@
 import { projectDmBoard } from '../../../src/vtt/encounter-projections';
 import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
 import { generateRoom } from '../../../src/vtt/room-generator';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   installInteractiveDocument,
   interactiveElement,
@@ -44,6 +45,7 @@
 
 const FIGHTER = combatantId('combatant:fighter');
 const CLERIC = combatantId('combatant:cleric');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const PENDING_PLACEMENT_BLOCKED_COMMAND_TYPES = [
   'roll_initiative',
@@ -444,6 +446,7 @@
       },
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     expect(dm.pendingPlacementRecovery).toEqual(expect.objectContaining({
       combatantId: FIGHTER,
diff --git a/tests/unit/vtt/footprint-increment-three.test.ts b/tests/unit/vtt/footprint-increment-three.test.ts
index c6d2a38cf21f87645ef1bc7b39133f1c5421c307..f9f300d32ecd798a503a8eff66c638fbf12f1cc7
--- a/tests/unit/vtt/footprint-increment-three.test.ts
+++ b/tests/unit/vtt/footprint-increment-three.test.ts
@@ -4,7 +4,6 @@
 import { combatantId, type CombatantId } from '../../../src/combat/values';
 import { exactDmIntelMatrix } from '../../../src/vtt/dm-tactical-intel';
 import { engineStateHandle } from '../../../src/vtt/engine-state-capsule';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
 import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
@@ -14,11 +13,13 @@
   extractCircumstanceFeatures,
 } from '../../../src/vtt/renderer-profile';
 import { generateRoom } from '../../../src/vtt/room-generator';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const SEED = 3_943_001;
 const SCOUT = combatantId('combatant:generated-3943001-monster-3');
 const FIGHTER = combatantId('combatant:fighter');
 const CLERIC = combatantId('combatant:cleric');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function requiredProfile(state: EncounterState, id: CombatantId): CombatantProfile {
   const profile = state.combatants.find((candidate) => candidate.profile.id === id)?.profile;
@@ -82,12 +83,12 @@
   it('reports hand-computed nearest-cell separation', () => {
     const state = separatedState();
     // Gargantuan target occupies columns 0..3; Scout at column 8: five intervals = 25 feet.
-    expect(canonicalEngineQueryPort.spaceDistance(state, SCOUT, FIGHTER)).toBe(25);
+    expect(OFFER_ENVIRONMENT.queries.spaceDistance(state, SCOUT, FIGHTER)).toBe(25);
   });
 
   it('keeps path cost as travel cost rather than creature separation', () => {
     const state = separatedState();
-    expect(canonicalEngineQueryPort.path(state, {
+    expect(OFFER_ENVIRONMENT.queries.path(state, {
       actorId: SCOUT,
       destination: { column: 7, row: 0 },
       movement: 'normal',
@@ -98,12 +99,15 @@
     const state = selectorState();
     // Both are 15 feet from the Scout by occupied cells; the branded-id tie break chooses Cleric.
     // Anchor distance would incorrectly prefer Fighter (15 feet versus Cleric's 20).
-    expect(canonicalEngineQueryPort.resolveTarget(state, SCOUT, { kind: 'nearest_visible_enemy' })).toBe(CLERIC);
+    expect(OFFER_ENVIRONMENT.queries.resolveTarget(state, SCOUT, { kind: 'nearest_visible_enemy' })).toBe(CLERIC);
   });
 
   it('publishes footprint-aware public MCP summaries and nearest-cell threat bands', () => {
     const state = separatedState();
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [SCOUT] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [SCOUT],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     const result = record(runtime.toolSurface.execute('engine.get_state_summary', {
       state_ref: {
@@ -140,7 +144,10 @@
         originatingToken: null,
       }],
     };
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [SCOUT] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [SCOUT],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     const result = record(runtime.toolSurface.execute('engine.get_state_summary', {
       state_ref: {
@@ -190,9 +197,12 @@
 
   it('uses nearest-cell separation in DM intel', () => {
     const state = separatedState();
-    const structuredRuntime = createEngineMcpRuntime(state, { requestedActorIds: [SCOUT] });
+    const structuredRuntime = createEngineMcpRuntime(state, {
+      requestedActorIds: [SCOUT],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = structuredRuntime.feed.current();
-    const row = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort, [SCOUT])
+    const row = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries, [SCOUT])
       .find((candidate) => candidate.targetId === FIGHTER);
     expect(row).toMatchObject({
       policy: 'dm-turn-intel-v2-creature-space',
@@ -206,6 +216,7 @@
     const proseRuntime = createEngineMcpRuntime(state, {
       requestedActorIds: [SCOUT],
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'regular_prose' },
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const prose = turnContext(proseRuntime);
     expect(RENDERER_POLICY_VERSION).toBe('turn-context-renderer-v4-creature-space');
@@ -214,7 +225,10 @@
 
   it('uses nearest-cell separation in renderer circumstance metrics', () => {
     const state = separatedState();
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [SCOUT] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [SCOUT],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     const context = turnContext(runtime);
     expect(extractCircumstanceFeatures({
diff --git a/tests/unit/vtt/hidden-option-boundary.test.ts b/tests/unit/vtt/hidden-option-boundary.test.ts
index 6cd2a05746c122da5e66bfba390c8b6b2d89f2f1..e89a9594b4e036e2274f2b5ec4b58a8e07895117
--- a/tests/unit/vtt/hidden-option-boundary.test.ts
+++ b/tests/unit/vtt/hidden-option-boundary.test.ts
@@ -5,8 +5,10 @@
   freshMonsterPlanningState,
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const ROOM_FIVE_ARCHER = combatantId('combatant:generated-6203005-monster-4');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
@@ -22,6 +24,7 @@
   const runtime = createEngineMcpRuntime(state, {
     revision: 2,
     room: 5,
+    offerEnvironment: OFFER_ENVIRONMENT,
     ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
   });
   const capsule = runtime.feed.current();
@@ -92,6 +95,7 @@
       room: 8,
       requestedActorIds: actorIds,
       turnContextMaximumBytes: 8_000,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const capsule = runtime.feed.current();
     for (const actorId of actorIds) {
diff --git a/tests/unit/vtt/hypnotic-pattern-probe.test.ts b/tests/unit/vtt/hypnotic-pattern-probe.test.ts
index ba374a56100ea189129e6acdce853d6c51699c32..82f679740eb45b09c2fdd922aa1634b8fdd5d622
--- a/tests/unit/vtt/hypnotic-pattern-probe.test.ts
+++ b/tests/unit/vtt/hypnotic-pattern-probe.test.ts
@@ -5,11 +5,10 @@
 import { combatantId } from '../../../src/combat/values';
 import { loadContentPack } from '../../../src/content/content-pack';
 import { engineConcentrationActive } from '../../../src/vtt/engine-query-port';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
 import {
   availableEngineActorOptions,
-  pureTurnProposalResolver,
+  createPureTurnProposalResolver,
   resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import { createEngineMcpRuntime, freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
@@ -22,6 +21,7 @@
   renderTurnContextProfile,
 } from '../../../src/vtt/renderer-profile';
 import { readFileSync } from '../../helpers/test-filesystem';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const FIXTURE = 'tests/fixtures/arena-scenarios/hypnotic-pattern-cc.json';
 const CASTER = combatantId('combatant:d432-incubus');
@@ -31,6 +31,8 @@
   'combatant:d432-rogue',
   'combatant:d432-wizard',
 ] as const;
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
@@ -111,7 +113,7 @@
 
   it('advertises a legal friendly-safe 30-foot cube covering all four separated PCs and legal damage', async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const options = availableEngineActorOptions(state, CASTER);
+    const options = availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT);
     const control = hypnoticOption(options);
     const damage = damageOption(options);
     const use = mainUse(control);
@@ -134,8 +136,8 @@
     expect(affected).toEqual(PC_IDS);
     expect(affected).not.toContain(CASTER);
 
-    const controlResolution = resolveEngineActorOption(state, control);
-    const damageResolution = resolveEngineActorOption(state, damage);
+    const controlResolution = resolveEngineActorOption(state, control, OFFER_ENVIRONMENT);
+    const damageResolution = resolveEngineActorOption(state, damage, OFFER_ENVIRONMENT);
     expect(controlResolution.valid).toBe(true);
     expect(damageResolution.valid).toBe(true);
     if (!damageResolution.valid) throw new Error(damageResolution.summary);
@@ -158,7 +160,7 @@
 
   it('renders both candidate actions in a no-model turn context', async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const runtime = createEngineMcpRuntime(state);
+    const runtime = createEngineMcpRuntime(state, { offerEnvironment: OFFER_ENVIRONMENT });
     const capsule = runtime.feed.current();
     const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
       run_id: capsule.runId,
@@ -230,9 +232,9 @@
       }),
     });
 
-    const opportunity = actorOpportunityReport(state, CASTER, canonicalEngineQueryPort, state.revision);
-    const controlOption = hypnoticOption(availableEngineActorOptions(state, CASTER));
-    const damageEngineOption = damageOption(availableEngineActorOptions(state, CASTER));
+    const opportunity = actorOpportunityReport(state, CASTER, OFFER_ENVIRONMENT, state.revision);
+    const controlOption = hypnoticOption(availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT));
+    const damageEngineOption = damageOption(availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT));
     expect(opportunity.defaultOption.optionId).toBe(controlOption.optionId);
     expect(opportunity.frontierResolution).toBe('fully_resolved');
     expect(opportunity.options.flatMap((entry) => entry.status === 'unresolved' ? entry.reasons : []))
@@ -246,7 +248,7 @@
     const team = scoreTeamPlans(state, [
       { candidateId: 'control', label: 'Control', proposals: [proposal(state.revision, controlOption)] },
       { candidateId: 'damage', label: 'Damage', proposals: [proposal(state.revision, damageEngineOption)] },
-    ], canonicalEngineQueryPort);
+    ], OFFER_ENVIRONMENT);
     expect(team.frontierResolution).toBe('fully_resolved');
     expect(team.frontier.map((entry) => entry.candidate.candidateId)).toEqual(['control']);
     expect(team.removed).toEqual([
@@ -285,7 +287,7 @@
         position: { column: index, row: index },
       })),
     };
-    const option = hypnoticOption(availableEngineActorOptions(crowded, CASTER));
+    const option = hypnoticOption(availableEngineActorOptions(crowded, CASTER, OFFER_ENVIRONMENT));
     const cast = option.actionSlots.find((slot) => slot.use.kind === 'cast_spell')?.use;
     if (cast?.kind !== 'cast_spell') throw new Error('Crowded control option has no spell use.');
     expect(cast.targets).toContainEqual({ kind: 'combatant', combatantId: CASTER });
@@ -294,9 +296,9 @@
 
   it('resolves the advertised cube into Charmed plus Incapacitated effects and concentration', async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const option = hypnoticOption(availableEngineActorOptions(state, CASTER));
+    const option = hypnoticOption(availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT));
     const declared = proposal(state.revision, option);
-    const resolution = pureTurnProposalResolver.resolve(state, declared);
+    const resolution = TURN_PROPOSAL_RESOLVER.resolve(state, declared);
     if (!resolution.valid) {
       throw new Error(`Hypnotic Pattern was not authorizable: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
     }
@@ -308,7 +310,12 @@
       mechanics: resolution.mechanics,
       selectedBranch: resolution.selectedBranch,
     };
-    const session = new EngineRoundSession(state, mulberry32(2), { kind: 'unattended', askDefault: 'decline' });
+    const session = new EngineRoundSession(
+      state,
+      mulberry32(2),
+      { kind: 'unattended', askDefault: 'decline' },
+      OFFER_ENVIRONMENT,
+    );
     session.applyResolvedMechanics([authorized], null);
     const after = session.currentState();
 
@@ -328,10 +335,12 @@
     const first = availableEngineActorOptions(
       freshMonsterPlanningState(await loadArenaFixture(FIXTURE)),
       CASTER,
+      OFFER_ENVIRONMENT,
     );
     const second = availableEngineActorOptions(
       freshMonsterPlanningState(await loadArenaFixture(FIXTURE)),
       CASTER,
+      OFFER_ENVIRONMENT,
     );
     expect(second).toEqual(first);
     expect(hypnoticOption(second).optionId).toBe(hypnoticOption(first).optionId);
diff --git a/tests/unit/vtt/last-seen.test.ts b/tests/unit/vtt/last-seen.test.ts
index 9b2975ba22b449f4244594819afca0add2739888..9c25bd158816ed837671862ce9ed9f24c37c202c
--- a/tests/unit/vtt/last-seen.test.ts
+++ b/tests/unit/vtt/last-seen.test.ts
@@ -8,6 +8,7 @@
 import { traceCombatantLine } from '../../../src/combat/cover';
 import type { GridCell } from '../../../src/combat/grid';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const IDLE = {
   requestSequence: 1,
@@ -16,6 +17,7 @@
   continuation: { kind: 'idle' as const },
   pause: null,
 };
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const face = (value: number) => () => (value - 0.5) / 20;
 
@@ -254,6 +256,7 @@
     const hidden = invisible(setup.state, setup.monster);
     const dm = projectDmBoard({
       view: projectDmView(hidden), coordinator: IDLE, controllers: [], history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
 
     expect(Object.keys(dm.encounter).sort()).toEqual([
diff --git a/tests/unit/vtt/local-session-store.test.ts b/tests/unit/vtt/local-session-store.test.ts
index a9528564885df8653fdcf9e7ddbb3366adc4f0b6..e2c3c6adadf4cff0b21b8f3f11c076615dc2f257
--- a/tests/unit/vtt/local-session-store.test.ts
+++ b/tests/unit/vtt/local-session-store.test.ts
@@ -19,6 +19,9 @@
   type LoadedPartyMember,
 } from '../../../src/vtt/party-pack';
 import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 it('upload import acknowledgement waits for the durable flush before resolving', async () => {
   const events: string[] = [];
@@ -78,7 +81,7 @@
 } {
   const id = encounterSessionId(session);
   const memory = new MemoryBrowserSessionStore();
-  const host = new DmEncounterHost(session, memory);
+  const host = new DmEncounterHost(session, memory, { offerEnvironment: OFFER_ENVIRONMENT });
   host.interrupt();
   host.close();
   return { id, bytes: exportSavedSession(memory, id) };
@@ -499,7 +502,11 @@
       'Browser autosave does not exist.',
     );
 
-    const host = new DmEncounterHost('session:snapshot-save-operations', store);
+    const host = new DmEncounterHost(
+      'session:snapshot-save-operations',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     host.adjudicate({
       type: 'adjudicate',
       target: REFERENCE_MONSTER_ID,
@@ -875,7 +882,11 @@
     });
     const snapshot = store.savedSessions()[0];
     if (snapshot === undefined) throw new Error('Expected snapshot prefix fixture.');
-    const host = new DmEncounterHost('session:snapshot-prefix', store);
+    const host = new DmEncounterHost(
+      'session:snapshot-prefix',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     host.adjudicate({
       type: 'adjudicate',
       target: REFERENCE_MONSTER_ID,
@@ -954,6 +965,7 @@
       initialControllers: encounter.controllers,
       playerIds: encounter.playerIds,
       turnLegalActions: encounter.turnLegalActions,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     await store.flush();
     expect(store.savedSessions().map((save) => save.name)).toEqual([
@@ -994,6 +1006,7 @@
       initialControllers: encounter.controllers,
       playerIds: encounter.playerIds,
       turnLegalActions: encounter.turnLegalActions,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const combatantCount = started.initiative.length;
     for (let index = 0; index <= combatantCount; index += 1) await host.skipTurn();
@@ -1050,7 +1063,11 @@
     const indexedDb = new IDBFactory();
     const storage = new MemoryStorage();
     const firstStore = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
-    const first = new DmEncounterHost('session:reload', firstStore);
+    const first = new DmEncounterHost(
+      'session:reload',
+      firstStore,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     first.interrupt();
     const before = first.snapshot();
     await firstStore.flush();
@@ -1058,7 +1075,11 @@
     firstStore.close();
 
     const reopenedStore = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
-    const reopened = new DmEncounterHost('session:reload', reopenedStore);
+    const reopened = new DmEncounterHost(
+      'session:reload',
+      reopenedStore,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     const after = reopened.snapshot();
 
     expect(after.dm.encounter).toEqual(before.dm.encounter);
@@ -1071,7 +1092,11 @@
   it('batches synchronous journal appends into one IndexedDB transaction before flush acknowledgement', async () => {
     const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage());
     const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
-    const host = new DmEncounterHost('session:batched-writes', store);
+    const host = new DmEncounterHost(
+      'session:batched-writes',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     for (let index = 0; index < 5; index += 1) {
       host.adjudicate({
         type: 'adjudicate',
@@ -1119,7 +1144,11 @@
       }
       return request;
     });
-    host = new DmEncounterHost('session:reentrant-write-scheduling', store);
+    host = new DmEncounterHost(
+      'session:reentrant-write-scheduling',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
 
     await store.flush();
     await store.flush();
@@ -1137,7 +1166,11 @@
     const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
     const transactions = vi.spyOn(IDBDatabase.prototype, 'transaction');
     const puts = vi.spyOn(IDBObjectStore.prototype, 'put');
-    const host = new DmEncounterHost('session:bounded-write-batches', store);
+    const host = new DmEncounterHost(
+      'session:bounded-write-batches',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     for (let index = 0; index < 65; index += 1) {
       host.adjudicate({
         type: 'adjudicate',
@@ -1167,7 +1200,11 @@
     const indexedDb = new IDBFactory();
     const storage = new MemoryStorage();
     const store = await IndexedDbBrowserSessionStore.open(indexedDb, storage);
-    const host = new DmEncounterHost('session:large', store);
+    const host = new DmEncounterHost(
+      'session:large',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
     const payload = 'large-revision-sentinel-'.repeat(6_000);
     for (let index = 0; index < 14; index += 1) {
       host.adjudicate({
@@ -1308,7 +1345,11 @@
     const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
       throw new DOMException('simulated quota', 'QuotaExceededError');
     });
-    const host = new DmEncounterHost('session:write-fails', store);
+    const host = new DmEncounterHost(
+      'session:write-fails',
+      store,
+      { offerEnvironment: OFFER_ENVIRONMENT },
+    );
 
     let failure: unknown;
     try {
@@ -1341,6 +1382,7 @@
       initialControllers: encounter.controllers,
       playerIds: encounter.playerIds,
       turnLegalActions: encounter.turnLegalActions,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     host.interrupt();
 
diff --git a/tests/unit/vtt/mixed-kind-multiattack.test.ts b/tests/unit/vtt/mixed-kind-multiattack.test.ts
index b3e9a7770c400edd38efae1ecbaa563b25eeb652..1d1ed9060119b6f032c41dbc0673c26634c0a730
--- a/tests/unit/vtt/mixed-kind-multiattack.test.ts
+++ b/tests/unit/vtt/mixed-kind-multiattack.test.ts
@@ -6,12 +6,16 @@
 import { WIGHT } from '../../../src/combat/statblocks/undead-crypt';
 import { LION } from '../../../src/combat/statblocks/wild-beasts';
 import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
-import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
+import { availableEngineActorOptions, createPureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { legalMultiattackCombinations } from '../../../src/vtt/turn-option-registry';
 import type { EngineOfferableOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';
 import { placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
+
 function actions(statblock: MonsterStatblock): readonly MonsterAction[] {
   return statblock.sourceDetails.actions.kind === 'present' ? statblock.sourceDetails.actions.value : [];
 }
@@ -38,7 +42,7 @@
 function mixedOption(state: EncounterState, expectedLabel: string): EngineOfferableOption {
   const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
   if (actorId === undefined) throw new Error('Mixed-kind fixture omitted its monster.');
-  const option = availableEngineActorOptions(state, actorId).find((candidate) =>
+  const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).find((candidate) =>
     candidate.label.startsWith(expectedLabel));
   if (option === undefined) throw new Error(`Mixed-kind fixture omitted ${expectedLabel}.`);
   return option;
@@ -53,7 +57,7 @@
     reason: 'Exercise the mixed-kind multiattack fixture.',
     overrideJustification: null,
   };
-  const resolution = pureTurnProposalResolver.resolve(state, proposal);
+  const resolution = TURN_PROPOSAL_RESOLVER.resolve(state, proposal);
   if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.code).join(', '));
   return {
     proposal,
@@ -92,7 +96,7 @@
       const state = encounter(statblock, String(statblock.id));
       const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
       if (actorId === undefined) throw new Error('Mixed-kind fixture omitted its actor.');
-      const options = availableEngineActorOptions(state, actorId);
+      const options = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT);
       expect(options.some((option) => option.actionSlots.some((slot) =>
         slot.use.kind === 'attack' && slot.use.actionId === forbidden))).toBe(false);
       expect(options.some((option) => option.actionSlots.some((slot) =>
@@ -112,7 +116,7 @@
 
     const session = new EngineRoundSession(state, mulberry32(46_600_001), {
       kind: 'unattended', askDefault: 'decline',
-    });
+    }, OFFER_ENVIRONMENT);
     session.applyResolvedMechanics([authorized], null);
     const events = session.currentState().eventLog.filter((event) =>
       (event.type === 'attack_resolved' && event.actor === option.actorId) ||
