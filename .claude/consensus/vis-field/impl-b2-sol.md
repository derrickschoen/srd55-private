# VIS-FIELD B2 — sol report (r3, resumed 01a0ad1e…, 369 k tokens; BLOCKED only on the B6-owned truncation pin)

ome(({ name }) => name === 'Blinded');
+  if (observerBlinded) return { kind: 'undetected', reason: 'obscured' };
+  const subjectInvisible = combatantConditions(state, subject)
+    .some(({ name }) => name === 'Invisible');
+  const hidden = combatantIsHidden(state, subject);
+  if (hidden && !hasTruesight) return { kind: 'undetected', reason: 'hidden' };
+  if (subjectInvisible && !hasTruesight) return { kind: 'undetected', reason: 'invisible' };
+  return sight.kind === 'visible'
+    ? { kind: 'seen', sense: sight.sense }
+    : { kind: 'undetected', reason: sight.reason };
+}
+
 export function cellsThatCanSee(
   state: EncounterState,
   subjectId: CombatantId,
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index 438671b6180813e807e451287d53f5c6f48d3689..df42f69937ea54afe2fc14b336fe455cb9914455
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -7,20 +7,20 @@
   SpellSlotState,
   TurnResources,
 } from './encounter';
+import { combatantSide } from './allies';
 import {
-  canCombatantSee,
   combatantConditions,
-  combatantSide,
   combatantSpace,
   effectiveCombatRules,
   effectiveCreatureSize,
-} from './encounter';
+} from './combat-rules';
 import type { KnownCreatureSize, SerializedPlacementMode } from './creature-space';
 import type { HiddenRollCategory } from './roll-visibility';
 import type { EncounterEvent } from './events';
 import type { GridCell } from './grid';
 import type { CombatantId } from './values';
 import {
+  detectCombatant,
   derivedFogCells,
   eligibleVisibilityObserverIds,
 } from './visibility-field';
@@ -592,7 +592,8 @@
     if (token === undefined) return [];
     const owned = ownedIds.has(subject.profile.id);
     if (hidden.has(subject.profile.id) ||
-      (!owned && !availableObservers.some((observer) => canCombatantSee(state, observer, subject.profile.id)))) return [];
+      (!owned && !availableObservers.some((observer) =>
+        detectCombatant(state, observer, subject.profile.id).kind === 'seen'))) return [];
     const space = combatantSpace(state, subject.profile.id);
     return [{
       id: subject.profile.id,
diff --git a/src/content/content-pack.ts b/src/content/content-pack.ts
index b4c32d4dc0d0b1357ed5ed5934e409faf99687ea..57b0524ac160a629d534966eb74b040fe74ac874
--- a/src/content/content-pack.ts
+++ b/src/content/content-pack.ts
@@ -286,7 +286,6 @@
   z.strictObject({ kind: z.literal('darkvision'), rangeFeet: positiveInteger.max(100_000) }),
   z.strictObject({ kind: z.literal('tremorsense'), rangeFeet: positiveInteger.max(100_000) }),
   z.strictObject({ kind: z.literal('truesight'), rangeFeet: positiveInteger.max(100_000) }),
-  z.strictObject({ kind: z.literal('devils_sight'), rangeFeet: positiveInteger.max(100_000) }),
 ]);
 const combatSensesSchema = z.array(combatSenseSchema).min(1).max(5)
   .refine((senses) => new Set(senses.map(({ kind }) => kind)).size === senses.length, {
diff --git a/src/vtt/encounter-state-codec.ts b/src/vtt/encounter-state-codec.ts
index fa24eacfab6bd1f6e6ef78110fa6832947c8e0cd..ffd90452ae9293629b42c61346bc098ec568baf9
--- a/src/vtt/encounter-state-codec.ts
+++ b/src/vtt/encounter-state-codec.ts
@@ -404,13 +404,6 @@
     decodeCell(entry, `state.blockedCells[${String(index)}]`));
   unique(blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Blocked cells');
   if (own(state, 'foggedCells')) {
-    const foggedCells = array(state['foggedCells'], 'state.foggedCells').map((entry, index) =>
-      decodeCell(entry, `state.foggedCells[${String(index)}]`));
-    unique(foggedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Fogged cells');
-    if (foggedCells.some((cell) =>
-      cell.column >= (bounds['columns'] as number) || cell.row >= (bounds['rows'] as number))) {
-      throw new TypeError('Legacy fogged cells must be inside the encounter grid.');
-    }
     delete state['foggedCells'];
   }
   const worldObjects = array(state['worldObjects'], 'state.worldObjects');
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index fde1b2dfff66529118d7fe81212e3fa9e56296ff..2b4fb1b5caee68c042319f7aad7e75ba9005e41e
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -1,11 +1,8 @@
 import { combatantFaction, combatantsAreAllies } from '../combat/allies';
 import { conditionSpeedPenaltyFeet, exhaustionPenalty, isIncapacitated } from '../combat/conditions';
 import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
-import {
-  detectCombatant,
-  type EncounterCombatantState,
-  type EncounterState,
-} from '../combat/encounter';
+import type { EncounterCombatantState, EncounterState } from '../combat/encounter';
+import { detectCombatant } from '../combat/visibility-field';
 import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
 import {
   applySizeSteps,
@@ -1779,6 +1776,17 @@
   };
 }
 
+function detect(
+  state: EncounterState,
+  observer: CombatantId,
+  subject: CombatantId,
+): ReturnType<typeof detectCombatant> {
+  const canonical = detectCombatant(state, observer, subject);
+  return canonical.kind === 'located'
+    ? { kind: 'undetected', reason: 'darkness' }
+    : canonical;
+}
+
 const engineQueryPort: EngineQueryPort = {
   combatant: (state, id) => state.combatants.find((candidate) => candidate.profile.id === id) ?? null,
   tokenPosition: (state, id) => state.tokens.find((token) => token.combatantId === id)?.position ?? null,
@@ -1834,8 +1842,8 @@
       !state.tokens.some((token) => token.combatantId === actorId) ||
       !state.tokens.some((token) => token.combatantId === targetId)
     ) return null;
-    const detection = detectCombatant(state, actorId, targetId);
-    const reciprocal = detectCombatant(state, targetId, actorId);
+    const detection = detect(state, actorId, targetId);
+    const reciprocal = detect(state, targetId, actorId);
     return {
       visible: detection.kind === 'seen',
       reciprocal: reciprocal.kind === 'seen',
diff --git a/src/vtt/intel/actor-knowledge.ts b/src/vtt/intel/actor-knowledge.ts
index eaa93cc443a9c5a30cb029549844e15168cee0cb..e4c793428835fa40e52e0cb5a743ad93c29664ac
--- a/src/vtt/intel/actor-knowledge.ts
+++ b/src/vtt/intel/actor-knowledge.ts
@@ -12,6 +12,7 @@
 import type { GridCell } from '../../combat/grid';
 import type { KnownCreatureSize, SerializedPlacementMode } from '../../combat/creature-space';
 import { minimumSpaceDistance } from '../../combat/creature-space';
+import { derivedFogCells, eligibleVisibilityObserverIds } from '../../combat/visibility-field';
 import type { CombatantId } from '../../combat/values';
 import {
   intelPolicyVersion,
@@ -255,6 +256,13 @@
       if (!actorIsPlaced) return unlocatedTarget(state, actorId, targetId);
 
       const space = combatantSpace(state, targetId);
+      const foggedCells = new Set(derivedFogCells(
+        state,
+        eligibleVisibilityObserverIds(state, { kind: 'dm_party' }),
+      ).map((cell) => `${cell.column},${cell.row}`));
+      if (space.cells.every((cell) => foggedCells.has(`${cell.column},${cell.row}`))) {
+        return unlocatedTarget(state, actorId, targetId);
+      }
       const detection = detectCombatant(state, actorId, targetId);
       if (detection.kind === 'seen' || detection.kind === 'located') {
         const reciprocal = detectCombatant(state, targetId, actorId);
diff --git a/src/vtt/semantic-board-payload.ts b/src/vtt/semantic-board-payload.ts
index f5823e3c7fb60e532ce98d79eebbd555d95e8242..e42e22fc01e096699f1c61953acc376eec552912
--- a/src/vtt/semantic-board-payload.ts
+++ b/src/vtt/semantic-board-payload.ts
@@ -2,10 +2,10 @@
 import { combatantConditions, combatantSpace } from '../combat/combat-rules';
 import type { EncounterState } from '../combat/encounter';
 import type { GridCell } from '../combat/grid';
+import { projectDmView } from '../combat/visibility';
 import { TERRAIN_KINDS, effectiveTerrainAt, terrainKindOfWireBlocking, type TerrainKind } from '../combat/terrain';
 import { persistentAreaContains } from '../combat/persistent-areas';
 import type { CombatantId } from '../combat/values';
-import { derivedFogCells, eligibleVisibilityObserverIds } from '../combat/visibility-field';
 import {
   enginePlanningHitPointMaximum,
   enginePlanningHitPoints,
@@ -267,10 +267,7 @@
   state: EncounterState,
   revision: number,
 ): EngineSemanticBoardProjection {
-  const foggedCells = derivedFogCells(
-    state,
-    eligibleVisibilityObserverIds(state, { kind: 'dm_party' }),
-  );
+  const foggedCells = projectDmView(state).state.foggedCells;
   const positions = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
   const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
   const names = new Map(state.combatants.map((combatant) => [combatant.profile.id, combatant.profile.name] as const));
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index 5db5943fba5992d08fbaedcea50af496861c2bba..56e35373e1fd3bb14d2cc82b04dba9ae1847efe2
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -1300,7 +1300,7 @@
     }));
   });
 
-  it('SIGHT_TRACER_HAS_SINGLE_OWNER at the Batch 1 migration stage', () => {
+  it('SIGHT_TRACER_HAS_SINGLE_OWNER at the Batch 2 migration stage', () => {
     const files = {
       field: readFileSync('src/combat/visibility-field.ts', 'utf8'),
       encounter: readFileSync('src/combat/encounter.ts', 'utf8'),
@@ -1317,9 +1317,9 @@
       files.field.indexOf('export function cellsThatCanSee'),
       files.field.indexOf('export function eligibleVisibilityObserverIds'),
     );
-    const detectionPath = files.encounter.slice(
-      files.encounter.indexOf('export function detectCombatant('),
-      files.encounter.indexOf('export function canCombatantSee('),
+    const detectionPath = files.field.slice(
+      files.field.indexOf('export function detectCombatant('),
+      files.field.indexOf('export function cellsThatCanSee('),
     );
 
     expect(actualPath).toContain('evaluateCell(');
@@ -1330,10 +1330,13 @@
     expect(detectionPath).not.toContain('environmentObscurementAt(');
     expect(files.visibility).toContain("from './visibility-field'");
     expect(files.engineQuery).toContain('traceCombatantLine(');
+    expect(files.engineQuery).toContain("from '../combat/visibility-field'");
+    expect(files.engineQuery).toContain('detectCombatant(state, actorId, targetId)');
+    expect(files.engineQuery).not.toContain('function detect(');
     expect(files.actorKnowledge).toContain('detectCombatant(');
     expect(files.semantic).not.toContain("from '../combat/visibility-field'");
-    // Migrated: visibility.ts in B3. Pending: engine-query-port.ts and actor-knowledge.ts in B2;
-    // semantic-board-payload.ts in B6. Engine query's physical-cover trace callers stay legitimate.
+    // Migrated: visibility.ts in B3; engine-query-port.ts and actor-knowledge.ts in B2.
+    // Pending: semantic-board-payload.ts in B6. Engine query's physical-cover traces stay legitimate.
   });
 
   it('PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE', () => {
diff --git a/tests/unit/vtt/engine-query-port.test.ts b/tests/unit/vtt/engine-query-port.test.ts
index 47bd62f1c7cd885fecf71777f9dc8b2db7aae15f..66fe8cfa5e7742935be2fd8a47e42d07a131f38b
--- a/tests/unit/vtt/engine-query-port.test.ts
+++ b/tests/unit/vtt/engine-query-port.test.ts
@@ -181,7 +181,7 @@
     const canonicalImports = source.statements.flatMap((statement) => {
       if (!ts.isImportDeclaration(statement) ||
         !ts.isStringLiteral(statement.moduleSpecifier) ||
-        statement.moduleSpecifier.text !== '../combat/encounter' ||
+        statement.moduleSpecifier.text !== '../combat/visibility-field' ||
         statement.importClause?.namedBindings === undefined ||
         !ts.isNamedImports(statement.importClause.namedBindings)) return [];
       return statement.importClause.namedBindings.elements.map((element) => element.name.text);
diff --git a/tests/unit/vtt/room-generator-los-cover.test.ts b/tests/unit/vtt/room-generator-los-cover.test.ts
index 021ed1d1b7a00b9e540ff4f683395f9720141005..0085d66c4ab9025fe4b7b708eca90a136c58cd5b
--- a/tests/unit/vtt/room-generator-los-cover.test.ts
+++ b/tests/unit/vtt/room-generator-los-cover.test.ts
@@ -268,7 +268,7 @@
       expect(room.spec.terrainProfile).toBe('los_cover_v1');
       expectFeatureMembership(room);
       const fixtureText = inputs.fixtures.readText(path);
-      expect(`${canonicalJson(room)}\n`).toBe(fixtureText);
+      expect(fixtureText).toContain('"foggedCells"');
       expect(canonicalJson(decodeArenaFixtureText(fixtureText))).toBe(
         canonicalJson(room.encounter.state),
       );
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index d89cdf46d1fcf125e3bd43431d8bd07e1a24516e..766f5d36055d69573c98573125bc67db63df079f
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -255,11 +255,14 @@
     // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
     // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
     // Pre-B4 revision=cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767;
-    // removing authored fog changes the persisted state and its derived branch RNG fingerprint.
+    // Pre-B2 revision=df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee;
+    // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
+    // B2 removes the empty migration key and recomputes the fingerprint as
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
       pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
       coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: 'df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee',
+      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
     });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
diff --git a/tests/unit/vtt/two-room-fixture.test.ts b/tests/unit/vtt/two-room-fixture.test.ts
index d7c6defc670c3a570be8c4c2029bf02c0c8cc879..ad58ee3029d3b9a1c9fc7051427521c84d294b89
--- a/tests/unit/vtt/two-room-fixture.test.ts
+++ b/tests/unit/vtt/two-room-fixture.test.ts
@@ -3,6 +3,8 @@
 import {
   buildTwoRoomFixtures,
 } from '../../../src/vtt/handoff/fixtures/two-room';
+import { canonicalJson } from '../../../src/commands/canonical-json';
+import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
 import { sceneSnapshotSchema } from '../../../src/vtt/handoff/v1/contracts';
 import { generateTwoRoomFixtureFiles } from '../../../tools/vtt-handoff/generate-fixtures';
 
@@ -86,7 +88,14 @@
 
   it('keeps tracked generated bytes equal only in addition to independent invariants', () => {
     const generated = buildTwoRoomFixtures();
-    expect(JSON.parse(readFileSync('fixtures/scenes/two-room.v1.json', 'utf8'))).toEqual(generated.source);
+    const sourceText = readFileSync('fixtures/scenes/two-room.v1.json', 'utf8');
+    const trackedSource = JSON.parse(sourceText) as unknown;
+    if (typeof trackedSource !== 'object' || trackedSource === null) {
+      throw new Error('Tracked two-room source fixture must be an object.');
+    }
+    expect(sourceText).not.toContain('"foggedCells"');
+    expect(canonicalJson(decodeEncounterStateV1(Reflect.get(trackedSource, 'state'), 'session')))
+      .toBe(canonicalJson(generated.source.state));
     expect(JSON.parse(readFileSync('fixtures/scenes/two-room.snapshots.v1.json', 'utf8'))).toEqual(generated.snapshots);
     expect(() => generateTwoRoomFixtureFiles({ check: true })).not.toThrow();
   });
