# VIS-FIELD SEAM step — sol report (fresh 01a0ab3f-96a8-7fc1-994c-72e9caed0044, BLOCKED on a legitimately changed pin)

Implemented the wall-seam rule in the two authorized files:

- `src/combat/cover.ts`
- `tests/unit/combat/visibility-field.test.ts`

The seam affects only optical blocking. `rasterizeCornerLine` and `interveningCells` are unchanged, and cover tier aggregation still uses only `line.tier`; therefore the seam cannot raise physical cover by construction. The pinned seam fixture remains `half` cover.

Evidence:

- Frozen plan SHA: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`
- Pre-change performance command:
  `npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts`
  - 2 files, 36/36 tests passed
  - Vitest: `40.65s`
  - wall: `40.53s`
- Pre-change pins:
  - diagonal corner touch: clear
  - physical seam cover: `half`
  - 2/2 passed
- RED-first seam contracts:
  - `SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS`: red
  - `SEAM_BLOCKED_CELL_PAIR`: red
  - one-sided control: green
- After implementation: all five new tests passed, 5/5.

Mutation copy: `/tmp/vis-field-seam-mutants.JeSrWz`

- Baseline source SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- `SEAM_RULE_IGNORED`, SHA `530579a2…`: required tests (1) and (3) both red; restored SHA `c8852c…`, 2/2 green.
- `SEAM_ONE_SIDED_BLOCKS`, SHA `7497a8fa…`: test (2) red; restored SHA `c8852c…`, green.
- `SEAM_FIRST_CELL_WRONG`, SHA `f212bebc…`: test (1) red with `(5,4)` instead of `(5,3)`; restored SHA `c8852c…`, green.

The required 19-suite command produced:

- 19 test files
- 312 tests
- 308 passed
- 4 failed
- Duration `97.44s`

A mandatory-stop pin changed legitimately at `tests/unit/combat/visibility-field.test.ts:575`: `seen_dim → unseen`. Geometry diagnostics identify the newly blocking ray `(2,2) → (4,2)`, running along row 2 between the two sight-blocking heavy-obscurement cells `(2,1)` and `(2,2)`. That is precisely D635’s shared-edge rule.

Other observed failures:

- `tactical-evaluator-r02.test.ts`: added unseen-attacker/target reasons.
- `dm-tactical-intel.test.ts`: `VISIBLE → HIDDEN`.
- `scene-snapshot.test.ts`: unrelated partial-B4 authored-fog red.

No pins were repinned. Per the mandatory stop, post-change performance and TypeScript checks were not run.

`git diff --check` exited 0. `git status --short` contains exactly the 12 pre-existing files plus the two authorized files.

BLOCKED: seam rule changes pin tests/unit/combat/visibility-field.test.ts:575 — seen_dim → unseen, geometry: ray (2,2)→(4,2), flanking cells (2,1) and (2,2)
diff --git a//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts b//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
index f8af9c60737e98e64f6d07fba82b6bb73dd59e40..db45a2df23f29a61853abdbeadffc58e27c3d037
--- a//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
+++ b//tmp/vis-field-seam-mutants.JeSrWz/src/combat/cover.ts
@@ -316,7 +316,10 @@
       const upper = { column, row: from.row - 1 };
       const lower = { column, row: from.row };
       // Deterministic pair choice: the flanking cell with the lower row wins.
-      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
+      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {
+        console.log('SEAM_DIAGNOSTIC', { from, to, upper, lower });
+        return upper;
+      }
     }
   }
   if (from.column === to.column && Number.isInteger(from.column)) {
diff --git a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
index 4cb0a9cfcb3b0818e45a22a622db900df20fe65c..6b2316fd8ee019ed374a49b45f07fa692f2fd2f8
--- a//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
+++ b//tmp/vis-field-seam-mutants.JeSrWz/tests/unit/combat/visibility-field.test.ts
@@ -570,6 +570,13 @@
       },
     });
 
+    console.log(JSON.stringify(traceCombatantLineToCells(
+      state,
+      observer.id,
+      [{ column: 4, row: 2 }],
+      { additionalSightBlockingCells: [0, 1, 2, 3].map((row) => ({ column: 2, row })) },
+    ), null, 2));
+
     // Hand geometry: nearest occupied cell (1,1) is 15 feet away and its right edge clears fog column 2.
     // The first occupied cell (0,0) alone has all four rays to (4,2) screened by that full-height column.
     expect(gradeAt(state, observer, 4, 2)).toBe('seen_dim');
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index c6ef04e6bf5665430357c9b1a610ffe3b547c564..f8af9c60737e98e64f6d07fba82b6bb73dd59e40
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -301,23 +301,56 @@
     .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
 }
 
+function firstSharedEdgeBlockingCell(
+  from: CornerPoint,
+  to: CornerPoint,
+  sightBlockingAt: (cell: GridCell) => boolean,
+): GridCell | null {
+  if (from.row === to.row && Number.isInteger(from.row)) {
+    const direction = from.column < to.column ? 1 : -1;
+    for (
+      let column = direction === 1 ? from.column : from.column - 1;
+      direction === 1 ? column < to.column : column >= to.column;
+      column += direction
+    ) {
+      const upper = { column, row: from.row - 1 };
+      const lower = { column, row: from.row };
+      // Deterministic pair choice: the flanking cell with the lower row wins.
+      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
+    }
+  }
+  if (from.column === to.column && Number.isInteger(from.column)) {
+    const direction = from.row < to.row ? 1 : -1;
+    for (
+      let row = direction === 1 ? from.row : from.row - 1;
+      direction === 1 ? row < to.row : row >= to.row;
+      row += direction
+    ) {
+      const left = { column: from.column - 1, row };
+      const right = { column: from.column, row };
+      // Deterministic pair choice: the flanking cell with the lower column wins.
+      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;
+    }
+  }
+  return null;
+}
+
 function traceCornerLine(
   from: CornerPoint,
   to: CornerPoint,
   candidates: readonly GridCell[],
   sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
-  sightBlockingKeys: ReadonlySet<string>,
+  sightBlockingAt: (cell: GridCell) => boolean,
 ): TerrainCornerLineTrace {
   const interveningCells = rasterizeCornerLine(from, to, candidates);
   let tier: CoverTier = 'none';
   let strongest: TerrainLineSource[] = [];
-  let firstBlockingCell: GridCell | null = null;
+  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);
   for (const cell of interveningCells) {
-    if (sightBlockingKeys.has(cellKey(cell)) && firstBlockingCell === null) {
+    if (sightBlockingAt(cell) && firstBlockingCell === null) {
       firstBlockingCell = { ...cell };
     }
     for (const source of sourcesAt(cell)) {
-      if (source.tier === 'total' && firstBlockingCell === null) firstBlockingCell = { ...cell };
       const comparison = coverRank(source.tier) - coverRank(tier);
       if (comparison > 0) {
         tier = source.tier;
@@ -477,6 +510,13 @@
       entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
     .map((entry) => entry.cell);
   const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
+  const sightBlockingAt = (cell: GridCell): boolean => {
+    const key = cellKey(cell);
+    return !exclusions.has(key) && (
+      sightBlockingKeys.has(key) ||
+      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
+    );
+  };
   const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
     sourceCorner,
     targetCorners.map((targetCorner) => traceCornerLine(
@@ -484,7 +524,7 @@
       targetCorner,
       candidates,
       (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
-      sightBlockingKeys,
+      sightBlockingAt,
     )),
     nearest.sourceCell,
     nearest.targetCell,
@@ -601,17 +641,21 @@
   const sourceCell = { ...from };
   const targetCell = { ...to };
   const targetCorners = outerCorners([to]);
+  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
+    objects.flatMap((object): readonly TerrainLineSource[] =>
+      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
+        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
+        : []);
+  const sightBlockingAt = (cell: GridCell): boolean =>
+    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
   const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
     sourceCorner,
     targetCorners.map((targetCorner) => traceCornerLine(
       sourceCorner,
       targetCorner,
       candidates,
-      (cell) => objects.flatMap((object): readonly TerrainLineSource[] =>
-        objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
-          ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
-          : []),
-      new Set<string>(),
+      sourcesAt,
+      sightBlockingAt,
     )),
     sourceCell,
     targetCell,
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index 96d8c7ae286cb5346d0d6e6b70773909937854b8..4cb0a9cfcb3b0818e45a22a622db900df20fe65c
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -3,6 +3,7 @@
 import type { CombatantProfile } from '../../../src/combat/combatant';
 import { combatToken } from '../../../src/combat/combatant';
 import {
+  rasterizeCornerLine,
   traceCombatantLineToCells,
   traceTerrainLine,
   type TerrainLineTrace,
@@ -20,9 +21,11 @@
 import type { CombatSense } from '../../../src/combat/statblock';
 import { feetPoint } from '../../../src/combat/templates';
 import {
+  armorClass,
   effectStackingIdentity,
   encounterEffectId,
   feet,
+  worldObjectId,
 } from '../../../src/combat/values';
 import {
   cellsThatCanSee,
@@ -59,6 +62,7 @@
     readonly combatants?: readonly CombatantProfile[];
     readonly tokens?: readonly ReturnType<typeof placedToken>[];
     readonly blockedCells?: readonly GridCell[];
+    readonly worldObjects?: EncounterState['worldObjects'];
     readonly environment?: EncounterState['environment'];
   } = {},
 ): EncounterState {
@@ -67,10 +71,49 @@
     combatants: options.combatants ?? [observer],
     tokens: options.tokens ?? [combatToken(observer, options.position ?? { column: 0, row: 0 })],
     ...(options.blockedCells === undefined ? {} : { blockedCells: options.blockedCells }),
+    ...(options.worldObjects === undefined ? {} : { worldObjects: options.worldObjects }),
     environment: options.environment ?? EMPTY_ENVIRONMENT,
   });
 }
 
+function seamState(wallAbove: boolean, doorBelow: boolean, blockedDoor = false): {
+  readonly state: EncounterState;
+  readonly observer: CombatantProfile;
+  readonly subject: CombatantProfile;
+} {
+  const observer = normalProfile('seam-observer');
+  const subject = normalProfile('seam-subject');
+  const blockedCells = Array.from({ length: 8 }, (_unused, row) =>
+    row === 4 && !blockedDoor ? null : { column: 5, row })
+    .filter((cell): cell is GridCell => cell !== null)
+    .filter((cell) => wallAbove || cell.row !== 3);
+  const worldObjects: EncounterState['worldObjects'] = doorBelow
+    ? [{
+        id: worldObjectId('object:seam-door'),
+        name: 'Seam Door',
+        kind: 'door',
+        position: { column: 5, row: 4 },
+        footprint: [{ column: 5, row: 4 }],
+        durability: { kind: 'indestructible' },
+        armorClass: armorClass(10),
+        damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' },
+        createdRevision: 0,
+      }]
+    : [];
+  return {
+    observer,
+    subject,
+    state: fieldState(observer, {
+      bounds: { columns: 12, rows: 8 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 2, 4), placedToken(subject, 8, 4)],
+      blockedCells,
+      worldObjects,
+    }),
+  };
+}
+
 function gradeRows(field: readonly VisibilityFieldCell[]): readonly string[] {
   return field.map(({ cell, grade }) => `${String(cell.column)},${String(cell.row)}:${grade}`);
 }
@@ -965,6 +1008,69 @@
 });
 
 describe('VIS-FIELD-01 optical tracer separation', () => {
+  it('SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS', () => {
+    const { state, observer, subject } = seamState(true, true);
+    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
+
+    // Two-room geometry: (3,4)->(8,4) follows the edge between wall (5,3) and door (5,4).
+    expect(trace).toMatchObject({
+      sourceCorner: { column: 3, row: 4 },
+      blocksSight: true,
+      firstBlockingCell: { column: 5, row: 3 },
+    });
+    // The full column-5 wall and closed door leave no clear corner ray from (2,4) to (8,4).
+    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
+      kind: 'unseen',
+      reason: 'blocked',
+    });
+  });
+
+  it('SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR', () => {
+    const { state, observer, subject } = seamState(false, true);
+    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
+
+    // The same edge has door (5,4) below but open cell (5,3) above, so the graze stays clear.
+    expect(trace).toMatchObject({ blocksSight: false, firstBlockingCell: null });
+    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
+      kind: 'visible',
+      grade: 'seen',
+      sense: 'normal_sight',
+    });
+  });
+
+  it('SEAM_BLOCKED_CELL_PAIR', () => {
+    const { state } = seamState(true, false, true);
+    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
+
+    // Plain blocked cells (5,3) and (5,4) flank the first blocked unit edge of the horizontal ray.
+    expect(trace).toMatchObject({
+      blocksSight: true,
+      firstBlockingCell: { column: 5, row: 3 },
+    });
+  });
+
+  it('DIAGONAL_CORNER_TOUCH_UNCHANGED', () => {
+    const observer = normalProfile('diagonal-corner-observer');
+    const blockers = [{ column: 1, row: 0 }, { column: 0, row: 1 }];
+    const state = fieldState(observer, {
+      bounds: { columns: 4, rows: 4 },
+      blockedCells: blockers,
+    });
+    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 2, row: 2 });
+
+    // Pre-change pin: (0,0)->(3,3) only touches both diagonal blockers at corner (1,1), so it is clear.
+    expect(rasterizeCornerLine({ column: 0, row: 0 }, { column: 3, row: 3 }, blockers)).toEqual([]);
+    expect(trace).toMatchObject({ blocksSight: false, firstBlockingCell: null });
+  });
+
+  it('PHYSICAL_COVER_UNCHANGED_BY_SEAM', () => {
+    const { state } = seamState(true, true);
+    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
+
+    // Pre-change pin: two of four target-corner rays cross total-cover cells, producing half cover.
+    expect(trace.tier).toBe('half');
+  });
+
   it('EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint', () => {
     const actor = normalProfile('empty-blocker-actor');
     const coverCases = [

tokens used
120,789
Implemented the wall-seam rule in the two authorized files:

- `src/combat/cover.ts`
- `tests/unit/combat/visibility-field.test.ts`

The seam affects only optical blocking. `rasterizeCornerLine` and `interveningCells` are unchanged, and cover tier aggregation still uses only `line.tier`; therefore the seam cannot raise physical cover by construction. The pinned seam fixture remains `half` cover.

Evidence:

- Frozen plan SHA: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`
- Pre-change performance command:
  `npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts`
  - 2 files, 36/36 tests passed
  - Vitest: `40.65s`
  - wall: `40.53s`
- Pre-change pins:
  - diagonal corner touch: clear
  - physical seam cover: `half`
  - 2/2 passed
- RED-first seam contracts:
  - `SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS`: red
  - `SEAM_BLOCKED_CELL_PAIR`: red
  - one-sided control: green
- After implementation: all five new tests passed, 5/5.

Mutation copy: `/tmp/vis-field-seam-mutants.JeSrWz`

- Baseline source SHA: `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`
- `SEAM_RULE_IGNORED`, SHA `530579a2…`: required tests (1) and (3) both red; restored SHA `c8852c…`, 2/2 green.
- `SEAM_ONE_SIDED_BLOCKS`, SHA `7497a8fa…`: test (2) red; restored SHA `c8852c…`, green.
- `SEAM_FIRST_CELL_WRONG`, SHA `f212bebc…`: test (1) red with `(5,4)` instead of `(5,3)`; restored SHA `c8852c…`, green.

The required 19-suite command produced:

- 19 test files
- 312 tests
- 308 passed
- 4 failed
- Duration `97.44s`

A mandatory-stop pin changed legitimately at `tests/unit/combat/visibility-field.test.ts:575`: `seen_dim → unseen`. Geometry diagnostics identify the newly blocking ray `(2,2) → (4,2)`, running along row 2 between the two sight-blocking heavy-obscurement cells `(2,1)` and `(2,2)`. That is precisely D635’s shared-edge rule.

Other observed failures:

- `tactical-evaluator-r02.test.ts`: added unseen-attacker/target reasons.
- `dm-tactical-intel.test.ts`: `VISIBLE → HIDDEN`.
- `scene-snapshot.test.ts`: unrelated partial-B4 authored-fog red.

No pins were repinned. Per the mandatory stop, post-change performance and TypeScript checks were not run.

`git diff --check` exited 0. `git status --short` contains exactly the 12 pre-existing files plus the two authorized files.

BLOCKED: seam rule changes pin tests/unit/combat/visibility-field.test.ts:575 — seen_dim → unseen, geometry: ray (2,2)→(4,2), flanking cells (2,1) and (2,2)
