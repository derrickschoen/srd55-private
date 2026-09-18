# VIS-FIELD SEAM fix r1 — sol report (resumed 01a0ab3f…, BLOCKED on a partial-B4 tsc-node error outside scope)

SEAM fix-round changes are implemented in the four authorized files, but verification is blocked by an unrelated partial-B4 compile error.

Implemented:

- Re-authored `LARGE_OBSERVER_USES_BEST_CELL` with target `(4,3)` and fog `(2,1)/(2,2)`.
  - Clear ray: `(2,0)→(5,3)`.
  - Crosses open cells `(2,0)`, `(3,1)`, `(4,2)`.
  - The first footprint cell alone remains screened.
- Both R02 tests use option (b), re-authoring because visible, straight 90-foot shots are central to their stated purpose.
  - Diagnostic: Scout 3 `(19,3)` → fighter `(1,3)`.
  - Formerly clear ray: `(19,3)→(1,3)`.
  - Flanking blockers: plain blocked cells `(10,2)` and `(10,3)`.
  - `(10,2)` is moved to `(9,2)` within each test fixture, preserving all original expectations.

Focused command:

```text
npx vitest run --configLoader runner tests/unit/combat/visibility-field.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/vtt/dm-tactical-intel.test.ts -t 'LARGE_OBSERVER_USES_BEST_CELL|reports both 90-foot Scout shots|renders target-specific non-nearest R02 rows'
```

Result: 3 files passed, 3 tests passed, 42 skipped, `4.30s`.

`BEST_FOOTPRINT_CORNER_IGNORED` copy: `/tmp/vis-field-best-footprint-mutant.wLZcHz`

- Before SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- Mutant SHA: `e856730738994e84abfa97f329a566300ec8b120de2c5eb5322b5c2e193f9544`
- Mutant result: red, `seen_dim → unseen`, 1 failed / 36 skipped.
- Restored SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- Restored result: 1 passed / 36 skipped.

Compilation:

```text
npx tsc -p tsconfig.app.json --noEmit
```

Exit 0 in `16.03s`.

```text
npx tsc -p tsconfig.node.json --noEmit
```

Exit 1:

```text
tests/unit/vtt/regret.test.ts(39,24): error TS2339:
Property 'foggedCells' does not exist on type ...
```

The cause is the protected partial-B4 edit in `src/vtt/reference-encounter.ts`, which removed `referenceEncounterSetup().foggedCells`; untouched `tests/unit/vtt/regret.test.ts:39` still reads it. Neither file is authorized for this round.

`git diff --check` exits 0. Status contains exactly the 12 protected B4 files plus the four authorized files.

The 19-suite sweep and post-change D630 timing were not run after the compile-gate failure.

BLOCKED: partial-B4 referenceEncounterSetup removal makes tsconfig.node fail at tests/unit/vtt/regret.test.ts:39; both files are outside the authorized SEAM fix scope
diff --git a//tmp/vis-field-large-diag.YCvWSF/src/combat/cover.ts b//tmp/vis-field-large-diag.YCvWSF/src/combat/cover.ts
index f8af9c60737e98e64f6d07fba82b6bb73dd59e40..0308680dd4978b49365fcf373f8236aad6d854c4
--- a//tmp/vis-field-large-diag.YCvWSF/src/combat/cover.ts
+++ b//tmp/vis-field-large-diag.YCvWSF/src/combat/cover.ts
@@ -529,6 +529,17 @@
     nearest.sourceCell,
     nearest.targetCell,
   ));
+  if (sourceCells.length === 4 && targetCells.some((cell) => cell.column === 4 && cell.row === 3)) {
+    console.log('LARGE_DIAGNOSTIC', JSON.stringify(traces.map((trace) => ({
+      sourceCorner: trace.sourceCorner,
+      blocksSight: trace.blocksSight,
+      lines: trace.lines.map((line) => ({
+        targetCorner: line.targetCorner,
+        blocksSight: line.blocksSight,
+        interveningCells: line.interveningCells,
+      })),
+    }))));
+  }
   const first = traces[0];
   if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   const physicalSelected = traces.reduce(
diff --git a//tmp/vis-field-large-diag.YCvWSF/tests/unit/combat/visibility-field.test.ts b//tmp/vis-field-large-diag.YCvWSF/tests/unit/combat/visibility-field.test.ts
index fd3d20ed3c9491660e70d198f43940a2b69465ac..d68b98653c0d344bc104569c6cfc03df155ee9bb
--- a//tmp/vis-field-large-diag.YCvWSF/tests/unit/combat/visibility-field.test.ts
+++ b//tmp/vis-field-large-diag.YCvWSF/tests/unit/combat/visibility-field.test.ts
@@ -479,7 +479,7 @@
         ...EMPTY_ENVIRONMENT,
         obscurementRegions: [{
           id: 'target-fog',
-          cells: [{ column: 4, row: 2 }],
+          cells: [{ column: 4, row: 3 }],
           obscurement: 'heavy',
         }],
       },
@@ -564,7 +564,7 @@
         }],
         obscurementRegions: [{
           id: 'large-best-cell-fog',
-          cells: [0, 1, 3].map((row) => ({ column: 2, row })),
+          cells: [1, 2].map((row) => ({ column: 2, row })),
           obscurement: 'heavy',
         }],
       },
@@ -574,7 +574,7 @@
     // (2,2)->(4,3) crosses only the open cells (2,2) and (3,2), so Darkvision sees the target.
     // From the first occupied cell (0,0) alone, every corner ray remains screened by fog
     // cells (2,0), (2,1), or (2,3); using only that footprint cell therefore stays unseen.
-    expect(gradeAt(state, observer, 4, 2)).toBe('seen_dim');
+    expect(gradeAt(state, observer, 4, 3)).toBe('unseen');
   });
 
   it('BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog', () => {
diff --git a//tmp/vis-field-seam-fix-mutant.RVSdue/src/combat/cover.ts b//tmp/vis-field-seam-fix-mutant.RVSdue/src/combat/cover.ts
index f8af9c60737e98e64f6d07fba82b6bb73dd59e40..6b3d295ffb155de26df328821969e128922483dc
--- a//tmp/vis-field-seam-fix-mutant.RVSdue/src/combat/cover.ts
+++ b//tmp/vis-field-seam-fix-mutant.RVSdue/src/combat/cover.ts
@@ -529,6 +529,17 @@
     nearest.sourceCell,
     nearest.targetCell,
   ));
+  if (targetCells.some((cell) => cell.column === 4 && cell.row === 2)) {
+    console.log('SOURCE_TRACES', JSON.stringify(traces.map((trace) => ({
+      sourceCorner: trace.sourceCorner,
+      blocksSight: trace.blocksSight,
+      lines: trace.lines.map((line) => ({
+        targetCorner: line.targetCorner,
+        blocksSight: line.blocksSight,
+        firstBlockingCell: line.firstBlockingCell,
+      })),
+    }))));
+  }
   const first = traces[0];
   if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   const physicalSelected = traces.reduce(
@@ -615,7 +626,9 @@
   const source = options.sourceAnchor === undefined
     ? combatantSpace(state, sourceId)
     : combatantSpaceAt(state, sourceId, options.sourceAnchor);
-  const trace = traceSpaces(state, source.cells, targetCells, {
+  const firstSourceCell = source.cells[0];
+  if (firstSourceCell === undefined) throw new RangeError('A line query requires a non-empty source space.');
+  const trace = traceSpaces(state, [firstSourceCell], targetCells, {
     sourceId,
     includeCreatures: true,
     ...(options.additionalSightBlockingCells === undefined
diff --git a//tmp/vis-field-seam-fix-mutant.RVSdue/tests/unit/combat/visibility-field.test.ts b//tmp/vis-field-seam-fix-mutant.RVSdue/tests/unit/combat/visibility-field.test.ts
index fd3d20ed3c9491660e70d198f43940a2b69465ac..afbed2b5c924cb54ee3550fe50b2724a27eaf4fd
--- a//tmp/vis-field-seam-fix-mutant.RVSdue/tests/unit/combat/visibility-field.test.ts
+++ b//tmp/vis-field-seam-fix-mutant.RVSdue/tests/unit/combat/visibility-field.test.ts
@@ -553,6 +553,26 @@
       { kind: 'normal_sight' },
       { kind: 'darkvision', rangeFeet: 15 },
     ]);
+    const unseenPatterns: string[] = [];
+    for (let targetRow = 0; targetRow < 4; targetRow += 1) {
+      for (let mask = 1; mask < 16; mask += 1) {
+        const rows = [0, 1, 2, 3].filter((row) => (mask & (1 << row)) !== 0);
+        const candidate = fieldState(observer, {
+          bounds: { columns: 6, rows: 4 },
+          environment: {
+            ...EMPTY_ENVIRONMENT,
+            lightRegions: [{ id: 'search-dark', cells: [{ column: 4, row: targetRow }], level: 'darkness' }],
+            obscurementRegions: [{
+              id: 'search-fog', cells: rows.map((row) => ({ column: 2, row })), obscurement: 'heavy',
+            }],
+          },
+        });
+        if (gradeAt(candidate, observer, 4, targetRow) === 'unseen') {
+          unseenPatterns.push(`${String(targetRow)}:${rows.join(',')}`);
+        }
+      }
+    }
+    expect(unseenPatterns).toEqual([]);
     const state = fieldState(observer, {
       bounds: { columns: 6, rows: 4 },
       environment: {
@@ -570,6 +590,14 @@
       },
     });
 
+    const diagnostic = traceCombatantLineToCells(
+      state,
+      observer.id,
+      [{ column: 4, row: 2 }],
+      { additionalSightBlockingCells: [0, 1, 3].map((row) => ({ column: 2, row })) },
+    );
+    expect(diagnostic).toEqual(null);
+
     // Hand geometry: nearest occupied cell (1,1) is 15 feet away. Its outer-corner ray
     // (2,2)->(4,3) crosses only the open cells (2,2) and (3,2), so Darkvision sees the target.
     // From the first occupied cell (0,0) alone, every corner ray remains screened by fog
diff --git a//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts b//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
index db45a2df23f29a61853abdbeadffc58e27c3d037..19781dcb5cd3214cd62779493167a6dd2c00745e
--- a//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
+++ b//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
@@ -532,6 +532,17 @@
     nearest.sourceCell,
     nearest.targetCell,
   ));
+  if (targetCells.some((cell) => cell.column === 4 && cell.row === 1)) {
+    console.log('SOURCE_TRACES', JSON.stringify(traces.map((trace) => ({
+      sourceCorner: trace.sourceCorner,
+      blocksSight: trace.blocksSight,
+      lines: trace.lines.map((line) => ({
+        targetCorner: line.targetCorner,
+        blocksSight: line.blocksSight,
+        interveningCells: line.interveningCells,
+      })),
+    }))));
+  }
   const first = traces[0];
   if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   const physicalSelected = traces.reduce(
diff --git a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
index 6b2316fd8ee019ed374a49b45f07fa692f2fd2f8..84f198f03fc58fe5947d248776f12258953ad5f4
--- a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
+++ b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
@@ -553,18 +553,38 @@
       { kind: 'normal_sight' },
       { kind: 'darkvision', rangeFeet: 15 },
     ]);
+    const seenPatterns: string[] = [];
+    for (let targetRow = 0; targetRow < 4; targetRow += 1) {
+      for (let mask = 1; mask < 16; mask += 1) {
+        const rows = [0, 1, 2, 3].filter((row) => (mask & (1 << row)) !== 0);
+        const candidate = fieldState(observer, {
+          bounds: { columns: 6, rows: 4 },
+          environment: {
+            ...EMPTY_ENVIRONMENT,
+            lightRegions: [{ id: 'search-dark', cells: [{ column: 4, row: targetRow }], level: 'darkness' }],
+            obscurementRegions: [{
+              id: 'search-fog', cells: rows.map((row) => ({ column: 2, row })), obscurement: 'heavy',
+            }],
+          },
+        });
+        if (gradeAt(candidate, observer, 4, targetRow) === 'seen_dim') {
+          seenPatterns.push(`${String(targetRow)}:${rows.join(',')}`);
+        }
+      }
+    }
+    expect(seenPatterns.length).toBeGreaterThan(0);
     const state = fieldState(observer, {
       bounds: { columns: 6, rows: 4 },
       environment: {
         ...EMPTY_ENVIRONMENT,
         lightRegions: [{
           id: 'large-edge',
-          cells: [{ column: 4, row: 2 }],
+          cells: [{ column: 4, row: 1 }],
           level: 'darkness',
         }],
         obscurementRegions: [{
           id: 'large-best-cell-fog',
-          cells: [0, 1, 2, 3].map((row) => ({ column: 2, row })),
+          cells: [0, 1].map((row) => ({ column: 2, row })),
           obscurement: 'heavy',
         }],
       },
@@ -579,7 +599,7 @@
 
     // Hand geometry: nearest occupied cell (1,1) is 15 feet away and its right edge clears fog column 2.
     // The first occupied cell (0,0) alone has all four rays to (4,2) screened by that full-height column.
-    expect(gradeAt(state, observer, 4, 2)).toBe('seen_dim');
+    expect(gradeAt(state, observer, 4, 1)).toBe('unseen');
   });
 
   it('BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog', () => {
diff --git a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/vtt/tactical-evaluator-r02.test.ts b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/vtt/tactical-evaluator-r02.test.ts
index a3cc6ccec4896ec7137d765bc81162259151883e..919e07ed513d4610416f91b398edd53916a1a137
--- a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -72,7 +72,13 @@
 
 async function frozenState(): Promise<EncounterState> {
   inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
-  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+  const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+  return {
+    ...state,
+    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+      ? { column: 9, row: 2 }
+      : cell),
+  };
 }
 
 describe('R02-like canonical tactical query', () => {
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index 4cb0a9cfcb3b0818e45a22a622db900df20fe65c..5db5943fba5992d08fbaedcea50af496861c2bba
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -559,20 +559,22 @@
         ...EMPTY_ENVIRONMENT,
         lightRegions: [{
           id: 'large-edge',
-          cells: [{ column: 4, row: 2 }],
+          cells: [{ column: 4, row: 3 }],
           level: 'darkness',
         }],
         obscurementRegions: [{
           id: 'large-best-cell-fog',
-          cells: [0, 1, 2, 3].map((row) => ({ column: 2, row })),
+          cells: [1, 2].map((row) => ({ column: 2, row })),
           obscurement: 'heavy',
         }],
       },
     });
 
-    // Hand geometry: nearest occupied cell (1,1) is 15 feet away and its right edge clears fog column 2.
-    // The first occupied cell (0,0) alone has all four rays to (4,2) screened by that full-height column.
-    expect(gradeAt(state, observer, 4, 2)).toBe('seen_dim');
+    // Hand geometry: nearest occupied cell (1,1) is 15 feet away. The Large footprint adds
+    // the genuinely clear corner ray (2,0)->(5,3), crossing open cells (2,0), (3,1), and
+    // (4,2). From the first occupied cell (0,0) alone, every ray is screened by fog cells
+    // (2,1) or (2,2), so ignoring the rest of the footprint makes the target unseen.
+    expect(gradeAt(state, observer, 4, 3)).toBe('seen_dim');
   });
 
   it('BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog', () => {
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 58df094ff3646691669fd0a2cbdf55503e16aa74..6418a86a08dbb5ba70b6b6dfdbfe33077dc26a52
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from 'vitest';
+import type { EncounterState } from '../../../src/combat/encounter';
 import { gridDistance } from '../../../src/combat/grid';
 import { combatantId } from '../../../src/combat/values';
 import {
@@ -20,6 +21,15 @@
 const FIGHTER = combatantId('combatant:fighter');
 const SCOUT = combatantId('combatant:generated-5117009-monster-3');
 
+function reauthoredClearScoutShot(state: EncounterState): EncounterState {
+  return {
+    ...state,
+    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+      ? { column: 9, row: 2 }
+      : cell),
+  };
+}
+
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
     throw new TypeError(`${label} must be an object.`);
@@ -48,7 +58,18 @@
 
 describe('versioned DM tactical intel', () => {
   it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
-    const { state, runtime, capsule } = await r02Runtime();
+    const loaded = reauthoredClearScoutShot(
+      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
+    );
+    const state = freshMonsterPlanningState(loaded);
+    const runtime = createEngineMcpRuntime(state, { toolProfile: 'dm' });
+    const capsule = runtime.feed.current();
+    // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
+    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
+    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
+    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
+    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
     if (!Array.isArray(actors)) throw new TypeError('Actor contexts are absent.');
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index a3cc6ccec4896ec7137d765bc81162259151883e..cea961e35682d0b777ef0ffa53f56eb5902d8977
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -75,9 +75,24 @@
   return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
 }
 
+function reauthoredClearScoutShot(state: EncounterState): EncounterState {
+  return {
+    ...state,
+    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+      ? { column: 9, row: 2 }
+      : cell),
+  };
+}
+
 describe('R02-like canonical tactical query', () => {
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
-    const state = await frozenState();
+    const state = reauthoredClearScoutShot(await frozenState());
+    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
+    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
+    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
+    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
+    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
         scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },

tokens used
234,191
SEAM fix-round changes are implemented in the four authorized files, but verification is blocked by an unrelated partial-B4 compile error.

Implemented:

- Re-authored `LARGE_OBSERVER_USES_BEST_CELL` with target `(4,3)` and fog `(2,1)/(2,2)`.
  - Clear ray: `(2,0)→(5,3)`.
  - Crosses open cells `(2,0)`, `(3,1)`, `(4,2)`.
  - The first footprint cell alone remains screened.
- Both R02 tests use option (b), re-authoring because visible, straight 90-foot shots are central to their stated purpose.
  - Diagnostic: Scout 3 `(19,3)` → fighter `(1,3)`.
  - Formerly clear ray: `(19,3)→(1,3)`.
  - Flanking blockers: plain blocked cells `(10,2)` and `(10,3)`.
  - `(10,2)` is moved to `(9,2)` within each test fixture, preserving all original expectations.

Focused command:

```text
npx vitest run --configLoader runner tests/unit/combat/visibility-field.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/vtt/dm-tactical-intel.test.ts -t 'LARGE_OBSERVER_USES_BEST_CELL|reports both 90-foot Scout shots|renders target-specific non-nearest R02 rows'
```

Result: 3 files passed, 3 tests passed, 42 skipped, `4.30s`.

`BEST_FOOTPRINT_CORNER_IGNORED` copy: `/tmp/vis-field-best-footprint-mutant.wLZcHz`

- Before SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- Mutant SHA: `e856730738994e84abfa97f329a566300ec8b120de2c5eb5322b5c2e193f9544`
- Mutant result: red, `seen_dim → unseen`, 1 failed / 36 skipped.
- Restored SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- Restored result: 1 passed / 36 skipped.

Compilation:

```text
npx tsc -p tsconfig.app.json --noEmit
```

Exit 0 in `16.03s`.

```text
npx tsc -p tsconfig.node.json --noEmit
```

Exit 1:

```text
tests/unit/vtt/regret.test.ts(39,24): error TS2339:
Property 'foggedCells' does not exist on type ...
```

The cause is the protected partial-B4 edit in `src/vtt/reference-encounter.ts`, which removed `referenceEncounterSetup().foggedCells`; untouched `tests/unit/vtt/regret.test.ts:39` still reads it. Neither file is authorized for this round.

`git diff --check` exits 0. Status contains exactly the 12 protected B4 files plus the four authorized files.

The 19-suite sweep and post-change D630 timing were not run after the compile-gate failure.

BLOCKED: partial-B4 referenceEncounterSetup removal makes tsconfig.node fail at tests/unit/vtt/regret.test.ts:39; both files are outside the authorized SEAM fix scope
