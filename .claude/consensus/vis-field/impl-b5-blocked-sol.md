# VIS-FIELD B5 r1 — sol BLOCKED (fresh 01a0ac19…, 119 k tokens): Q9 fact-class oracle expects authored fog

Batch 5 is blocked by the mandated Q9 stop condition.

The one permitted Q9 run:

```text
npx vitest run --configLoader runner \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  -t 'derives every fact class from the DM projection with zero-based coordinates'
```

Result: `1 failed | 25 skipped`.

```text
Expected: ['4,3']
Received: ['2,0', '3,1']
```

Deleting the synthetic `state.foggedCells` mutation alone does not affect this test: it calls `everyClassState()` directly. Completing it requires reauthoring the oracle at `tests/unit/tools/ai-dm-screenshot-probe.test.ts:249`, which is outside B5’s seven-file manifest and conflicts with the instruction not to revise Q9 judgments. A supervisor manifest/ruling is required.

Evidence completed before the stop:

- Plan hash verified: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`
- Package lock: `26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867`
- Before timing: `38.07s`, `36/36` passed.
- Red-first run: `3 failed | 67 skipped`.
- Post-implementation targeted witnesses: `3 passed | 67 skipped`.
- `BLIND_BOARD_CHECK_USES_DM_PROJECTION` forbids a runtime `EncounterState` import and direct `state.foggedCells` access. It checks for the type-only import, canonical DM-board projection, and `board.foggedCells`.
- `git diff --check`: exit `0`.
- Status contains exactly the seven allowed files.
- Diff: `56 insertions, 23 deletions`.

Mutants, overlay compilation, after-timing, TSC, semantic-red disposition, and final retained suites were not run because the explicit Q9 stop condition fired.

BLOCKED: the Q9 fact-class oracle still expects authored fog `[(4,3)]`; derived projection returns `[(2,0),(3,1)]`, and its test file is outside the authorized B5 manifest.
diff --git a/tests/unit/vtt/blind-context-source-binding.test.ts b/tests/unit/vtt/blind-context-source-binding.test.ts
index 9ab9f6edafd7599ef89db985ec98083cd742ddac..1dbdfa01dbdd38555223230ad2472f80bcf7529e
--- a/tests/unit/vtt/blind-context-source-binding.test.ts
+++ b/tests/unit/vtt/blind-context-source-binding.test.ts
@@ -683,7 +683,7 @@
   ] as const;
   let monsterIndex = 0;
   return {
-    ...rich, blockedCells: [], worldObjects: [], foggedCells: [], effects: [],
+    ...rich, blockedCells: [], worldObjects: [], effects: [],
     tokens: rich.tokens.map((token) => {
       const combatant = rich.combatants.find((candidate) => candidate.profile.id === token.combatantId);
       if (combatant?.profile.kind !== 'monster') return token;
diff --git a/tests/unit/vtt/challenge-room-fixtures.test.ts b/tests/unit/vtt/challenge-room-fixtures.test.ts
index bccdf3ae78d451e202868a8f7b8fc6a7128d6b7b..94c1a1ad59dcdbf1dcd56dc08ebdff6cd1e40ec5
--- a/tests/unit/vtt/challenge-room-fixtures.test.ts
+++ b/tests/unit/vtt/challenge-room-fixtures.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from 'vitest';
+import { readFileSync } from '../../helpers/test-filesystem';
 import { declareTestInputs } from '../../helpers/test-inputs';
 import { canonicalJson } from '../../../src/commands/canonical-json';
 import { combatantSpace } from '../../../src/combat/combat-rules';
@@ -8,6 +9,7 @@
 import { findPath, findPathToAny } from '../../../src/combat/movement';
 import { feet, type CombatantId } from '../../../src/combat/values';
 import { defaultEncounterAlertingState } from '../../../src/combat/alerting';
+import { projectDmView } from '../../../src/combat/visibility';
 import { decodeArenaBasisEnvelopeV1, decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
 import {
   CHALLENGE_ROOM_IDS,
@@ -20,6 +22,7 @@
   decodeEncounterStateV1,
 } from '../../../src/vtt/encounter-state-codec';
 import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
 import { runCommandBoundaryTransaction } from '../../../src/vtt/engine-round-application';
 import { resolveEngineActorOption, availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
 import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
@@ -126,6 +129,41 @@
 }
 
 describe('D583 challenge room fixtures', () => {
+  it('BLIND_BOARD_CHECK_USES_DM_PROJECTION', () => {
+    const source = readFileSync('tools/ai-dm-blind-board-snapshot-check.ts', 'utf8');
+    const inspection = source.slice(
+      source.indexOf('export function inspectBlindBoardSnapshotFamily('),
+      source.indexOf('export const BLIND_BOARD_SNAPSHOT_FIXTURES'),
+    );
+
+    expect(source).toContain("import type { EncounterState } from '../src/combat/encounter';");
+    expect(source).not.toContain("import { EncounterState } from '../src/combat/encounter';");
+    expect(inspection).toContain('const board = projectEncounterBoard(projectDmView(state));');
+    expect(inspection).toContain('dm.fogMarks === board.foggedCells.length');
+    expect(inspection).not.toContain('state.foggedCells');
+  });
+
+  it('uses the derived DM projection for challenge-room fog', async () => {
+    const state = (await room(5_831_001)).encounter.state;
+    // Hand geometry: the three PCs stand east of the column-7 wall and see west only through
+    // doorway (7,5). The upper shadow has row widths 3+2+1; the lower has 1+3+5+7+7.
+    expect(projectEncounterBoard(projectDmView(state)).foggedCells).toEqual([
+      { column: 4, row: 0 }, { column: 5, row: 0 }, { column: 6, row: 0 },
+      { column: 5, row: 1 }, { column: 6, row: 1 },
+      { column: 6, row: 2 },
+      { column: 6, row: 7 },
+      { column: 4, row: 8 }, { column: 5, row: 8 }, { column: 6, row: 8 },
+      { column: 2, row: 9 }, { column: 3, row: 9 }, { column: 4, row: 9 },
+      { column: 5, row: 9 }, { column: 6, row: 9 },
+      { column: 0, row: 10 }, { column: 1, row: 10 }, { column: 2, row: 10 },
+      { column: 3, row: 10 }, { column: 4, row: 10 }, { column: 5, row: 10 },
+      { column: 6, row: 10 },
+      { column: 0, row: 11 }, { column: 1, row: 11 }, { column: 2, row: 11 },
+      { column: 3, row: 11 }, { column: 4, row: 11 }, { column: 5, row: 11 },
+      { column: 6, row: 11 },
+    ]);
+  });
+
   it('accepts the D583 challenge basis in B C A D seed order', async () => {
     const decoded = await Promise.all(SEEDS.map(async (seed) => ({ room: await room(seed), sidecar: await sidecar(seed) })));
     expect(decoded.map((entry) => entry.sidecar.roomId)).toEqual(CHALLENGE_ROOM_IDS);
diff --git a/tests/unit/vtt/experiment-orchestrator.test.ts b/tests/unit/vtt/experiment-orchestrator.test.ts
index bb498d56605701ac65b504a3e7f35b5dbea4afd5..2be54bebaa1569eab7424f95407a0b727b5660ca
--- a/tests/unit/vtt/experiment-orchestrator.test.ts
+++ b/tests/unit/vtt/experiment-orchestrator.test.ts
@@ -874,6 +874,17 @@
 });
 
 describe('E05B preregistered harder-program rerun', () => {
+  it('EXPERIMENT_RECONSTRUCTION_HAS_NO_FOG_INPUT', () => {
+    const source = readFileSync('tools/vtt-experiment.ts', 'utf8');
+    const reconstruction = source.slice(
+      source.indexOf('export function generateE05Encounter('),
+      source.indexOf('function casterSpellIds('),
+    );
+
+    expect(reconstruction).toContain('blockedCells: source.blockedCells');
+    expect(reconstruction).not.toContain('foggedCells');
+  });
+
   it('registers the declared check-targeted difficulty parameters on E05B without changing E05', () => {
     expect(EXPERIMENT_REGISTRY.E05B.difficultyParameters).toEqual(E05B_DIFFICULTY_PARAMETERS);
     expect(E05B_DIFFICULTY_PARAMETERS).toEqual({
@@ -1099,7 +1110,6 @@
         nextEffectSequence: expect.any(Number),
         bounds: expect.any(Object),
         blockedCells: expect.any(Array),
-        foggedCells: expect.any(Array),
         dmNotes: expect.any(Array),
         combatants: expect.any(Array),
         tokens: expect.any(Array),
diff --git a/tests/unit/vtt/semantic-board-payload.test.ts b/tests/unit/vtt/semantic-board-payload.test.ts
index e6d19fe5f033fb0d4a38462045b7232cdf2c3034..675a2ef427ba27e6592eee51db480fa27af66926
--- a/tests/unit/vtt/semantic-board-payload.test.ts
+++ b/tests/unit/vtt/semantic-board-payload.test.ts
@@ -57,7 +57,6 @@
     combatants: [hero, foe],
     tokens: [placedToken(hero, 1, 1), placedToken(foe, 2, 2)],
     blockedCells: [{ column: 4, row: 3 }],
-    foggedCells: [{ column: 3, row: 3 }],
     worldObjects: [
       worldObject('open-door', 'door', 0, 2, 'open'),
       worldObject('closed-door', 'door', 4, 2, 'wall'),
diff --git a/tools/ai-dm-blind-board-snapshot-check.ts b/tools/ai-dm-blind-board-snapshot-check.ts
index 75cb4f242bcc58681793ae609a105786cc5c80eb..47aa28578b207d0f95689ab1dcd85b99652b59cb
--- a/tools/ai-dm-blind-board-snapshot-check.ts
+++ b/tools/ai-dm-blind-board-snapshot-check.ts
@@ -30,12 +30,6 @@
   if (!condition) throw new Error(message);
 }
 
-function placedCombatants(state: EncounterState): number {
-  return projectEncounterBoard(projectDmView(state)).combatants.filter(
-    (combatant) => combatant.placementStatus === 'placed',
-  ).length;
-}
-
 export function inspectBlindBoardSnapshotFamily(
   state: EncounterState,
   artifacts: readonly BoardImageArtifact[],
@@ -63,7 +57,10 @@
 
   const dm = artifacts[0]?.blindState?.domEvidence;
   if (dm === undefined) throw new Error('DM image omitted DOM evidence.');
-  const creatureCount = placedCombatants(state);
+  const board = projectEncounterBoard(projectDmView(state));
+  const creatureCount = board.combatants.filter(
+    (combatant) => combatant.placementStatus === 'placed',
+  ).length;
   requireCondition(dm.coordinateLabels === 2 * (state.bounds.columns + state.bounds.rows),
     'DM image omitted coordinate gutters.');
   requireCondition(dm.creatureBadges === creatureCount, 'DM image badge count differs from state.');
@@ -113,11 +110,11 @@
     ),
     'DM image light cells differ from state.',
   );
-  requireCondition(dm.fogMarks === state.foggedCells.length, 'DM image fog differs from state.');
+  requireCondition(dm.fogMarks === board.foggedCells.length, 'DM image fog differs from projection.');
   requireCondition(dm.objects >= state.worldObjects.length, 'DM image omitted world-object footprints.');
   requireCondition(dm.doors === state.worldObjects.filter((object) => object.kind === 'door').length,
     'DM image doors differ from state.');
-  requireCondition(dm.hiddenMarks === projectEncounterBoard(projectDmView(state)).combatants.filter(
+  requireCondition(dm.hiddenMarks === board.combatants.filter(
     (combatant) => combatant.placementStatus === 'placed' && combatant.hiddenFromPlayers,
   ).length,
     'DM image hidden marks differ from state.');
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index 38a623de829e6d7f920e645aaafce5c212675c49..ff828f8a9870308f2f22cf93632fa4203e5ebda2
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -2399,19 +2399,9 @@
     state,
     rotatedCells(perimeterCells(state), markerOrdinal),
   );
-  const fogCandidates: GridCell[] = [];
-  for (let row = 1; row < state.bounds.rows - 1; row += 1) {
-    for (let column = 1; column < state.bounds.columns - 1; column += 1)
-      fogCandidates.push({ column, row });
-  }
-  const fogCell = firstFreeCell(
-    state,
-    rotatedCells(fogCandidates, markerOrdinal * 7),
-  );
   const doorOpen = markerOrdinal % 2 === 0;
   return {
     ...state,
-    foggedCells: [...state.foggedCells, fogCell],
     hiddenCombatants: [
       ...state.hiddenCombatants.filter(
         (entry) => entry.combatant !== hiddenSubject.profile.id,
diff --git a/tools/vtt-experiment.ts b/tools/vtt-experiment.ts
index 42f596d3917332027c48231becde317c60587181..1a6df11f3d7edb66c11fef3d749da34430154cc8
--- a/tools/vtt-experiment.ts
+++ b/tools/vtt-experiment.ts
@@ -1336,7 +1336,6 @@
     config: { initiativeMode: 'shared_enemy' },
     bounds: source.bounds,
     blockedCells: source.blockedCells,
-    foggedCells: source.foggedCells,
     dmNotes: source.dmNotes,
     combatants: selected.map((subject) => subject.profile),
     tokens: source.tokens.filter((token) => ids.has(token.combatantId)),
