
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-vis-field
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b20e-61fa-7e52-897b-3b01b026c2ff
--------
user
COMMON RULES (binding, restated in full): You are the IMPLEMENTER (gpt-5.6-sol, high, FRESH session; the brief is self-contained). Worktree /home/vagrant/PhpstormProjects/dnd-wt-vis-field (branch claude/vis-field at 6887755f = your fix-r1 candidate, COMMITTED by the supervisor as "WALL-01 (candidate r1, pre-review)"; clean). NOTE: the repository's history was rewritten tonight to purge a 65 MB log blob (D649): commit ids changed, contents did not; do not be surprised that 807d2e3c and 7acb936d no longer exist. Sandbox workspace-write in that worktree ONLY (+ /tmp). No git write commands. No edits under .claude/** or docs/**. No claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply. No Playwright, no full vitest, no npm run build; never port 4173. Model calls WILL fail. Every expected value hand-derived with the geometry in a comment; never delete or weaken a test; never fresh hashes; the D569 protocol (demonstrate-then-normalize: show the old value, the new value, prove exactly what changed and why, normalize only that) is binding. Report exact commands and numbers; end with the named marker. The MAIN repo's .claude/decisions.md D645–D649 is readable — read D648 first: my WALL-F1 (bbox) was RETRACTED (the original map came from the unfiltered candidateEntries; my probe read an aggregate flag as per-ray); your r1 is kept as the candidate; the decisive proof was a FULL stepped wall (column 7 rows 0–3 + column 8 rows 4–7, Medium tokens (13,4)→(1,4)): baseline leaks, WALL-01 and r1 block.

TASK — WALL-01 fix r2: the supervisor's UNTRUNCATED full vitest on your candidate (11492/11541) shows FIVE deterministic reds that are NOT in the frozen-family set and were green before the vertex rule — the sealed corners change sightlines in hand-authored scenes: (1) tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" — the two-room scene's derived fog GAINS cells (8,3) and (9,3); (2) tests/unit/tools/ai-dm-conversation.test.ts "records typed fallbackReason for 'blocked auto-submit' from the stub adapter" and (3) "uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit"; (4) tests/unit/vtt/dm-tactical-intel.test.ts "renders target-specific non-nearest R02 rows in always-on context with exact reasons"; (5) tests/unit/vtt/tactical-evaluator-r02.test.ts "reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter". For EACH: (a) DEMONSTRATE the geometry — the scene's blockers, the observer/target cells, the exact lattice vertex whose diagonal blocking pair now seals the last clear corner ray (name the two cells and the ray's endpoints), and show the pre-change vs post-change trace (tier/blocksSight/first) in memory; (b) DECIDE: is the new outcome the correct consequence of D642 (a crack sealed) — then NORMALIZE the expectation BY HAND from that derivation (comment with the vertex and ray; for scene-snapshot follow the B4/B2 precedent for this exact test — D635.5–.7 — revision checksum / fingerprint re-derived with the derivation printed, fixture regenerated ONLY if the tracked fixture generator is the source of truth and its output diff is exactly the fog cells); or is it a DEFECT (e.g. a corner touched by a single blocker being sealed, an endpoint vertex, a wrong pair) — then FIX the rule and add the witness; state which for each of the five. (c) If a test's SUBJECT disappears under the new geometry (e.g. the 90-foot Scout shots no longer exist), do NOT normalize it into vacuity: propose the minimal scene edit that restores the subject under the solid-wall model and STOP with the proposal (the supervisor rules). Also list, from the full-run titles, the timeouts you consider load-only: node-runtime ws close code, M576-E2-COVER-OVERLAPS-SPAWN, d583 "rejects a deleted committed spec", js-round-plan, vane-tpk — do not touch them. VERIFICATION: tsc app/node; git diff --check; the five suites + tests/unit/combat/visibility-field.test.ts + los-cover; git status --short listing only the files you touched. OUTPUT: per-test derivation table, then "WALL-01-FIX-R2 DONE" (or BLOCKED with the proposal).

codex
I’ll audit each of the five failures against D648 and the current vertex rule, reproduce the exact rays in memory, and only then either patch a demonstrated defect or hand-normalize a proven geometry change. I’ll stop without editing if any test subject requires a scene change to remain meaningful.
exec
/bin/bash -lc "sed -n '/"'^## D648'"\\b/,/"'^## D649'"\\b/p' .claude/decisions.md
sed -n '/"'^## D635'"\\b/,/"'^## D636'"\\b/p' .claude/decisions.md
sed -n '/"'^## D642'"\\b/,/"'^## D643'"\\b/p' .claude/decisions.md
git status --short
git log -1 --oneline" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
6887755f VIS-FIELD WALL-01 (candidate r1, pre-review): solid-wall vertex rule — a corner ray through a lattice vertex shared by two diagonally touching sight-blocking cells is optically blocked

exec
/bin/bash -lc "rg -n \"D648|D649|D635|D642\" .claude/decisions.md
rg -n \"solid-wall|vertex|diagonal\" src tests/unit/combat/visibility-field.test.ts tests/unit -g '*.ts' | head -200" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/unit/combat/visibility-field.test.ts:1055:    const observer = normalProfile('diagonal-crack-observer');
tests/unit/combat/visibility-field.test.ts:1056:    const subject = normalProfile('diagonal-crack-subject');
tests/unit/combat/visibility-field.test.ts:1066:    // The (0,0)->(4,4) ray reaches lattice vertex (2,2) between diagonal blockers TR (2,1)
tests/unit/combat/visibility-field.test.ts:1080:    const observer = normalProfile('diagonal-crack-control-observer');
tests/unit/combat/visibility-field.test.ts:1081:    const subject = normalProfile('diagonal-crack-control-subject');
tests/unit/combat/visibility-field.test.ts:1092:    // Selected ray (0,1)->(4,3) reaches vertex (2,2): TR (2,1) blocks but BL (1,2) is open.
tests/unit/combat/visibility-field.test.ts:1116:    // (13,4)->(1,4) touches upper cell (7,3) and lower cell (8,4) only at vertex (8,4).
tests/unit/combat/visibility-field.test.ts:1120:    // Pre-fix aggregate physical pin: two diagonal cells obstruct two corner rays, yielding Half Cover.
tests/unit/combat/visibility-field.test.ts:1138:    // (13,4)->(1,4) reaches vertex (8,4) between TR (8,3) and BL (7,4).
tests/unit/combat/visibility-field.test.ts:1159:    // (5,0)->(5,6) reaches vertex (5,3) between TL (4,2) and BR (5,3).
tests/unit/combat/visibility-field.test.ts:1180:    // (7,3) and (9,4) leave (8,4) open, so no diagonal pair meets at either lattice vertex.
tests/unit/combat/visibility-field.test.ts:1226:    const observer = normalProfile('diagonal-corner-observer');
tests/unit/combat/visibility-field.test.ts:1240:    // Original pin: (0,0)->(3,3) reaches vertex (1,1) between TR (1,0) and BL (0,1).
tests/unit/combat/visibility-field.test.ts:1253:    const actor = normalProfile('diagonal-cover-actor');
tests/unit/combat/range.test.ts:23:  it('uses shortest-grid-route distance for diagonal ranged attacks', () => {
tests/unit/combat/world-objects.test.ts:63:function diagonalStarted(worldObjects: readonly WorldObject[]): EncounterState {
tests/unit/combat/world-objects.test.ts:64:  const actor = playerProfile('world-diagonal-actor', { initiativeBonus: 20 });
tests/unit/combat/world-objects.test.ts:65:  const target = monsterProfile('world-diagonal-target', { initiativeBonus: -20, hitPoints: 40 });
tests/unit/combat/world-objects.test.ts:170:    const state = diagonalStarted([blocker]);
tests/unit/combat/world-objects.test.ts:176:    const half = diagonalStarted([verticalFeature('half-cover', 'half_cover')]);
tests/unit/combat/world-objects.test.ts:180:    const threeQuarters = diagonalStarted([verticalFeature('three-cover', 'three_quarters_cover')]);
tests/unit/combat/world-objects.test.ts:186:    const halfAttack = diagonalStarted([verticalFeature('half-cover-ac', 'half_cover')]);
tests/unit/combat/world-objects.test.ts:191:    const halfSave = diagonalStarted([verticalFeature('half-cover-dex', 'half_cover')]);
tests/unit/combat/world-objects.test.ts:203:    const threeQuarterSave = diagonalStarted([verticalFeature('three-quarter-cover-dex', 'three_quarters_cover')]);
tests/unit/combat/templates.test.ts:343:      'cube excluded corner origin removes its diagonal-only square',
tests/unit/combat/templates.test.ts:344:      'cube included corner origin adds its diagonal-only square',
tests/unit/combat/templates.test.ts:359:      'diagonal line with excluded origin removes southwest apex-only square',
tests/unit/combat/templates.test.ts:360:      'diagonal line with included origin adds southwest apex-only square',
tests/unit/combat/movement.test.ts:75:  it('prices orthogonal and diagonal shortest-grid-route distance at 5 feet per step', () => {
src/combat/cover.ts:415:  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
src/combat/cover.ts:416:  if (vertex !== null && (first === null || vertex.progress < first.progress ||
src/combat/cover.ts:417:    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
src/combat/cover.ts:424:  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
tests/unit/combat/visibility-field.test.ts:1055:    const observer = normalProfile('diagonal-crack-observer');
tests/unit/combat/visibility-field.test.ts:1056:    const subject = normalProfile('diagonal-crack-subject');
tests/unit/combat/visibility-field.test.ts:1066:    // The (0,0)->(4,4) ray reaches lattice vertex (2,2) between diagonal blockers TR (2,1)
tests/unit/combat/visibility-field.test.ts:1080:    const observer = normalProfile('diagonal-crack-control-observer');
tests/unit/combat/visibility-field.test.ts:1081:    const subject = normalProfile('diagonal-crack-control-subject');
tests/unit/combat/visibility-field.test.ts:1092:    // Selected ray (0,1)->(4,3) reaches vertex (2,2): TR (2,1) blocks but BL (1,2) is open.
tests/unit/combat/visibility-field.test.ts:1116:    // (13,4)->(1,4) touches upper cell (7,3) and lower cell (8,4) only at vertex (8,4).
tests/unit/combat/visibility-field.test.ts:1120:    // Pre-fix aggregate physical pin: two diagonal cells obstruct two corner rays, yielding Half Cover.
tests/unit/combat/visibility-field.test.ts:1138:    // (13,4)->(1,4) reaches vertex (8,4) between TR (8,3) and BL (7,4).
tests/unit/combat/visibility-field.test.ts:1159:    // (5,0)->(5,6) reaches vertex (5,3) between TL (4,2) and BR (5,3).
tests/unit/combat/visibility-field.test.ts:1180:    // (7,3) and (9,4) leave (8,4) open, so no diagonal pair meets at either lattice vertex.
tests/unit/combat/visibility-field.test.ts:1226:    const observer = normalProfile('diagonal-corner-observer');
tests/unit/combat/visibility-field.test.ts:1240:    // Original pin: (0,0)->(3,3) reaches vertex (1,1) between TR (1,0) and BL (0,1).
tests/unit/combat/visibility-field.test.ts:1253:    const actor = normalProfile('diagonal-cover-actor');
src/assets/pixel-art.ts:1030:  // one-direction diagonal hatch used by fog. The opaque cyan skeleton keeps
tests/unit/tools/ai-dm-screenshot-probe.test.ts:283:  it('adjacency_ignores_diagonals: counts creatures whose cells share a corner as adjacent within 5 feet', () => {
tests/unit/tools/ai-dm-screenshot-probe.test.ts:507:      'share an edge or a corner, so diagonals count',
tests/unit/assets/board-glyphs.test.ts:462:      // Fog's diagonal hatch reaches tile edges; the obscured skeleton is a

exec
/bin/bash -lc "ls -l .claude/decisions.md
file .claude/decisions.md
wc -l .claude/decisions.md
head -20 .claude/decisions.md
git show --stat --oneline HEAD
git show --format=fuller --no-ext-diff -- src/combat/cover.ts tests/unit/combat/visibility-field.test.ts | sed -n '1,260p'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
-rw-r--r-- 1 vagrant vagrant 1527919 Sep 16 18:21 .claude/decisions.md
.claude/decisions.md: Unicode text, UTF-8 text
22707 .claude/decisions.md
# Binding scope decisions

G2 VERIFIED AND COMMITTED; MUTATION EVIDENCE CORRECTED (supervisor,
2026-09-03 14:30; lane 2039cf0f). Forced gates: tsc -b --force 0, sg 0,
vitest 544 files / 9535 tests. F against my own work: my first G2
mutation edited the OUTCOME TYPE UNION (removed 'execution_failed'), so
tsc refused it while vitest — which does not type-check — still passed;
I committed with "mutation fails then passes", which was not true of the
tests. Redone on the assignment site (tools/ai-dm-conversation.ts:3862,
`outcome = 'execution_failed'` -> 'authorized'): "never authorizes a row
when execution throws before its first completed turn" fails, restore
proven by cmp; commit message amended to point here. Rule: a mutation
must change runtime behaviour, not a type; if tsc rejects the mutant,
the mutation is void and must be redone. G2.1 (D489 reasons, D490
override relaxation, decision trace helper) dispatched in the lane.

F: MY GATE TRUSTED INCREMENTAL tsc; H1-INDICES DOES NOT COMPILE
(supervisor, 2026-09-03 14:30). After committing H1-indices as "tsc 0",
a mutation run showed `tsc -b` failing at tools/ai-dm-conversation.ts:
1751 (speculative phase not assignable to DecisionPhase); with the
6887755f VIS-FIELD WALL-01 (candidate r1, pre-review): solid-wall vertex rule — a corner ray through a lattice vertex shared by two diagonally touching sight-blocking cells is optically blocked
 src/combat/cover.ts                        | 121 +++++++++++++++--
 tests/unit/combat/visibility-field.test.ts | 207 ++++++++++++++++++++++++++++-
 2 files changed, 310 insertions(+), 18 deletions(-)
commit 6887755fe0f204e4bf6d9a37147fa1476bdbada4
Author:     derrickschoen <deschoe@gmail.com>
AuthorDate: Thu Sep 17 20:43:36 2026 -0400
Commit:     derrickschoen <deschoe@gmail.com>
CommitDate: Thu Sep 17 20:43:36 2026 -0400

    VIS-FIELD WALL-01 (candidate r1, pre-review): solid-wall vertex rule — a corner ray through a lattice vertex shared by two diagonally touching sight-blocking cells is optically blocked
    
    Owner rulings D641/D642: the wall is the union of blocking cells; edges (D635) and
    now shared corners are interior to it. Physical cover tiers are unchanged; outer-face
    grazes and single-blocker corner touches stay clear. Hand-authored witnesses for the
    sealed crack, the stepped wall on straight rays, the mirrored and vertical steps, the
    split-pair and single-blocker controls.
    
    Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01DDGcNXV6HZH7Mgf3d3JToe

diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index f8af9c60..52e68ffc 100644
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -301,11 +301,16 @@ function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainL
     .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
 }
 
-function firstSharedEdgeBlockingCell(
+interface SightBlockingHit {
+  readonly cell: GridCell;
+  readonly progress: number;
+}
+
+function firstSharedEdgeBlockingHit(
   from: CornerPoint,
   to: CornerPoint,
   sightBlockingAt: (cell: GridCell) => boolean,
-): GridCell | null {
+): SightBlockingHit | null {
   if (from.row === to.row && Number.isInteger(from.row)) {
     const direction = from.column < to.column ? 1 : -1;
     for (
@@ -316,7 +321,10 @@ function firstSharedEdgeBlockingCell(
       const upper = { column, row: from.row - 1 };
       const lower = { column, row: from.row };
       // Deterministic pair choice: the flanking cell with the lower row wins.
-      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
+      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {
+        const entryColumn = direction === 1 ? column : column + 1;
+        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };
+      }
     }
   }
   if (from.column === to.column && Number.isInteger(from.column)) {
@@ -329,12 +337,95 @@ function firstSharedEdgeBlockingCell(
       const left = { column: from.column - 1, row };
       const right = { column: from.column, row };
       // Deterministic pair choice: the flanking cell with the lower column wins.
-      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;
+      if (sightBlockingAt(left) && sightBlockingAt(right)) {
+        const entryRow = direction === 1 ? row : row + 1;
+        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };
+      }
+    }
+  }
+  return null;
+}
+
+function greatestCommonDivisor(left: number, right: number): number {
+  let dividend = Math.abs(left);
+  let divisor = Math.abs(right);
+  while (divisor !== 0) {
+    const remainder = dividend % divisor;
+    dividend = divisor;
+    divisor = remainder;
+  }
+  return dividend;
+}
+
+function firstSharedVertexBlockingHit(
+  from: CornerPoint,
+  to: CornerPoint,
+  sightBlockingAt: (cell: GridCell) => boolean,
+): SightBlockingHit | null {
+  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
+  const columnDelta = to.column - from.column;
+  const rowDelta = to.row - from.row;
+  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);
+  if (latticeSteps <= 1) return null;
+  const columnStep = columnDelta / latticeSteps;
+  const rowStep = rowDelta / latticeSteps;
+  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.
+  for (let index = 1; index < latticeSteps; index += 1) {
+    const column = from.column + columnStep * index;
+    const row = from.row + rowStep * index;
+    const topLeft = { column: column - 1, row: row - 1 };
+    const topRight = { column, row: row - 1 };
+    // Check TL/BR first so lower row then lower column wins when both pairs seal.
+    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {
+      return { cell: topLeft, progress: index / latticeSteps };
+    }
+    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {
+      return { cell: topRight, progress: index / latticeSteps };
     }
   }
   return null;
 }
 
+function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
+  let entry = 0;
+  const columnDelta = to.column - from.column;
+  if (columnDelta !== 0) {
+    entry = Math.max(entry, Math.min(
+      (cell.column - from.column) / columnDelta,
+      (cell.column + 1 - from.column) / columnDelta,
+    ));
+  }
+  const rowDelta = to.row - from.row;
+  if (rowDelta !== 0) {
+    entry = Math.max(entry, Math.min(
+      (cell.row - from.row) / rowDelta,
+      (cell.row + 1 - from.row) / rowDelta,
+    ));
+  }
+  return entry;
+}
+
+function firstSightBlockingCell(
+  from: CornerPoint,
+  to: CornerPoint,
+  interveningCells: readonly GridCell[],
+  sightBlockingAt: (cell: GridCell) => boolean,
+): GridCell | null {
+  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
+  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
+  if (vertex !== null && (first === null || vertex.progress < first.progress ||
+    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
+  for (const cell of interveningCells) {
+    if (!sightBlockingAt(cell)) continue;
+    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };
+    if (first === null || hit.progress < first.progress ||
+      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
+  }
+  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
+  // Simultaneous events use lower row, then lower column.
+  return first === null ? null : { ...first.cell };
+}
+
 function traceCornerLine(
   from: CornerPoint,
   to: CornerPoint,
@@ -345,11 +436,13 @@ function traceCornerLine(
   const interveningCells = rasterizeCornerLine(from, to, candidates);
   let tier: CoverTier = 'none';
   let strongest: TerrainLineSource[] = [];
-  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);
+  const firstBlockingCell = firstSightBlockingCell(
+    from,
+    to,
+    interveningCells,
+    sightBlockingAt,
+  );
   for (const cell of interveningCells) {
-    if (sightBlockingAt(cell) && firstBlockingCell === null) {
-      firstBlockingCell = { ...cell };
-    }
     for (const source of sourcesAt(cell)) {
       const comparison = coverRank(source.tier) - coverRank(tier);
       if (comparison > 0) {
@@ -509,13 +602,15 @@ function traceSpaces(
       entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
       entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
     .map((entry) => entry.cell);
-  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
+  const sightBlockingKeys = new Set([
+    ...sightBlockingCells.map(cellKey),
+    ...[...indexedSources]
+      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))
+      .map(([key]) => key),
+  ]);
   const sightBlockingAt = (cell: GridCell): boolean => {
     const key = cellKey(cell);
-    return !exclusions.has(key) && (
-      sightBlockingKeys.has(key) ||
-      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
-    );
+    return !exclusions.has(key) && sightBlockingKeys.has(key);
   };
   const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
     sourceCorner,
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index 783e3c2b..a9849b84 100644
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -1051,18 +1051,215 @@ describe('VIS-FIELD-01 optical tracer separation', () => {
     });
   });
 
-  it('DIAGONAL_CORNER_TOUCH_UNCHANGED', () => {
+  it('DIAGONAL_CRACK_SEALED', () => {
+    const observer = normalProfile('diagonal-crack-observer');
+    const subject = normalProfile('diagonal-crack-subject');
+    const blockers = [{ column: 2, row: 1 }, { column: 1, row: 2 }];
+    const state = fieldState(observer, {
+      bounds: { columns: 5, rows: 5 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 0, 0), placedToken(subject, 3, 3)],
+      blockedCells: blockers,
+    });
+    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
+
+    // The (0,0)->(4,4) ray reaches lattice vertex (2,2) between diagonal blockers TR (2,1)
+    // and BL (1,2). D642 seals that crack and deterministically chooses lower-row cell (2,1).
+    expect(trace).toMatchObject({
+      tier: 'half',
+      blocksSight: true,
+      firstBlockingCell: { column: 2, row: 1 },
+    });
+    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
+      kind: 'unseen',
+      reason: 'blocked',
+    });
+  });
+
+  it('DIAGONAL_CRACK_CONTROL_ONE_BLOCKER', () => {
+    const observer = normalProfile('diagonal-crack-control-observer');
+    const subject = normalProfile('diagonal-crack-control-subject');
+    const state = fieldState(observer, {
+      bounds: { columns: 5, rows: 5 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 0, 0), placedToken(subject, 3, 3)],
+      blockedCells: [{ column: 2, row: 1 }],
+    });
+    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
+    const oneSidedCorner = trace.lines.find((line) =>
+      line.targetCorner.column === 4 && line.targetCorner.row === 3);
+
+    // Selected ray (0,1)->(4,3) reaches vertex (2,2): TR (2,1) blocks but BL (1,2) is open.
+    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
+    expect(oneSidedCorner).toMatchObject({ blocksSight: false, firstBlockingCell: null });
+    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
+      kind: 'visible',
+      grade: 'seen',
+      sense: 'normal_sight',
+    });
+  });
+
+  it('STAIRCASE_WALL_SEALED', () => {
+    const observer = normalProfile('staircase-wall-observer');
+    const subject = normalProfile('staircase-wall-subject');
+    const blockers = [{ column: 7, row: 3 }, { column: 8, row: 4 }];
+    const state = fieldState(observer, {
+      bounds: { columns: 15, rows: 8 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 13, 4), placedToken(subject, 1, 4)],
+      blockedCells: blockers,
+    });
+    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
+    const stepRay = trace.lines.find((line) =>
+      line.targetCorner.column === 1 && line.targetCorner.row === 4);
+
+    // (13,4)->(1,4) touches upper cell (7,3) and lower cell (8,4) only at vertex (8,4).

exec
/bin/bash -lc "LC_ALL=C rg -a -n \"D648|D649|D642|D635\\.5|D635\\.6|D635\\.7\" .claude/decisions.md | tail -80" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc "tail -400 .claude/decisions.md | sed -n '1,260p'
python3 - <<'PY'
from pathlib import Path
p=Path('.claude/decisions.md').read_bytes()
for needle in [b'D648',b'D649',b'D642',b'D635']:
 print(needle, p.find(needle), p.rfind(needle))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:

- Offers Slice 1 (standard-offer composition kernel): Astra r1 REJECT (self-certifying oracle) → r2 replaced it with literals extracted from the parent revision 79ab36f4 (supervisor reproduced the extraction: 6 ids) → Astra r2 ACCEPT at f6f43bb5. Landing merge c3b3d9b0 (main into the branch); full gate green — tsc 0, sg 0, vitest-gate 0 (load flakes passed serially), playwright-gate 0 (`~/dnd-slim-runs/gate-wt-p-offer-help.log`, done 10:36). D586.131 shape held (merge-base → main differed only under `.claude/**`). Merged to main as d2350c57. Slice 2 (immutable environment and process binding) is next.
- VTT handoff S3a–S3e r1 (ea510d9d): Astra REJECT with nine significant findings (F21–F29) on the session service/door transaction semantics — snapshot delivery not gated by durability/outcome, post-apply exceptions classed pre_apply, closure leaves the fresh-offer wait pending, restore freshness keyed only on pendingRequest presence, legal-action catalog escapes by reference, subscriber exceptions break settlement, boundary "graph" is a regex, same-state barrier unproven, stale offers matched by destination. S3a/S3b, the door order/payload, the renamed resume tests and baseline-fixture usage verified clean. Supervisor confirmed F25/F27/F29 in source. r2 dispatched.
- Held-out remediation: r7 REJECT (F23–F27, incl. the default-deny flagging ordinary window/import.meta.env uses) → rule refined to loader-VALUED expressions; r8 REJECT (F28–F33: a regex pre-gate that disables tracking, class-heritage exempted as type, computed destructuring from inert namespaces, alias reassignment, builtinModules false positive, synthetic injected control). r9 dispatched with a binding no-pre-gate rule. Supervisor has asked the owner, non-blocking, whether to cap the unit after r9.

### D586.184 — Late-morning state: S3 r2 reject, D569 fix passes, offers Slice 2 reds, held-out r10–r11, main-checkout hygiene (2026-09-10 11:45 EDT, supervisor)

- VTT handoff S3: r2 (dfe62475) Astra REJECT — F24/F25/F26/F29 resolved; F30–F36 residual (closure not barrier-independent, failed initial-offer flush strands the human wait, auto-refusal/reaction outside the boundary, autonomous steps labelled mutation, door revision lost across refresh, graph pins module pairs not call sites, self-reported counters). r3 dispatched.
- D569 patch r2: lane done after ~3 h (25 files + pre-patch byte fixture). Supervisor writable cumulative 386/392; serial rerun showed four deterministic reds in ai-dm-conversation (literal mismatch + three new tests waiting on real time past 5 s). Fix pass 1 was ineffective (shutdown-grace seam; the lane's sub-second timings were vacuous because its sandbox failed at EROFS before the wait). Fix pass 2 dispatched with the supervisor's failure output and a trace-the-wait requirement.
- Offers Slice 2 (7403f498, merged main 528d1146): supervisor 172-spec cumulative 3183/3213 — 30 reds in 8 files, mostly genuine assertion failures in the MCP-driven conversation/arena/board-delivery specs (capsule digest, authorized outcomes) that the lane's sandbox had masked as EROFS. Supervisor materialised a real node_modules in dnd-wt-p-offer-help (npm ci, 271 packages) so MCP specs are admissible in-lane; fix pass dispatched.
- Held-out: r10 REJECT (F38/F39) → r11 (e9cf5d84) REJECT (F40 plain namespace aliases, F41 destructuring assignments, F42 returned config refs; all bounded) → r12 dispatched with a mandatory flow-position audit table. Findings per round: 6,5,6,4,2,3. Cap question to the owner (D586.183) still open.
- Main-checkout hygiene, findings against own work: (1) the archived baseline capture.ts under .claude/consensus broke the D583 inventory walker (renamed to .ts.txt, a18bb30e); (2) three stale registered agent worktrees from Aug 17–31 under .claude/worktrees (lane/d284-second-tab, lane/d283-boot-stamp, lane/specs-11-12; one dirty fixture each) added 2,564 TypeScript files to every walk — moved with `git worktree move` to ~/dnd-slim-runs/stale-worktrees/ (nothing deleted, still registered); (3) a verification launch with a relative log path after `cd` never ran and printed "launched" — relaunched with absolute paths. D583 on main now 14/15 with one slow test under load; timing check pending.

### D586.185 — VTT handoff S3a–S3e ACCEPTED (r4); S4–S5b dispatched; D569 patch r2 REJECT; offers Slice 2 fix in flight (2026-09-10 12:38 EDT, supervisor)

- Handoff S3: r3 (6f7953ca) REJECT F37–F39; r4 (ef0ef4f6) ACCEPT — "no significant residual in the reviewed S3a–S3e scope". Landed semantics now binding for S4: FIFO terminal outcomes {committed, refused, cancelled, closed, failed}, committed only after apply + revision identification + flush, irrevocable receipt before observers, barrier-independent closure, seat registry UNAUTHORIZED/FORBIDDEN pre-state, detached frozen projections with a private offer catalog, transient restore freshness, north-edge door companions, symbol-resolved reducer graph gate. S4/S5/S5b dispatched as one fresh lane (session 01a08c2e-f9ef-7702-bc99-ef45937030cc) with the wire agreement restated verbatim and the owner-root publication reserved to the supervisor.
- D569 patch r2 (df7531b8): Astra REJECT F13–F22 (refusal vs default-fallback, persist-before-STOP on conflicting startup, mixed readiness, cancellation-after-delivery, cleanup joins, potential infinite loop on incomplete speculation, recalculation phase, v3 validator completeness/hybrid rejection, runbook drift, removed invariants + hand-built packet regression). r3 dispatched. Supervisor note: two fix passes were needed because the lane's first timing evidence was vacuous (EROFS before the wait); the D569 worktree will get a real node_modules after r3 so MCP specs become admissible in-lane.
- Held-out r13: lane BLOCKED correctly on the real vite.config.ts shape; RULE C refined to a reachable-literal set with the every-reference-inside-the-set guard; r13b running.

### D586.186 — Offers Slice 2 r1 REJECT; supervisor-authorized scope deviation for the schema-4 pin (2026-09-10 13:13 EDT, supervisor)

- Astra r1 on 03bdf1ef verified digests (six literals reproduced), schema-3 refusal with no upgrade arm, the E1C raw-context pin move (418b9e16… → 40719437…) as exactly the new state handle, the three mutation assertions, legacy defaults in host/conversation, standard-only registry, authority and preservation. Findings: F1 an eleventh file (tests/unit/tools/ai-dm-board-delivery.test.ts) outside the plan's ten-file Slice 2 list; F2 High — decoded MCP launchers infer legacy mode from an omitted binding (plan:539 forbids implicit missing bindings across the process boundary); F3 Low — preservation ledger lacks line-specific rows for the context pins.
- Supervisor ruling on F1: ACCEPTED as an authorized deviation from the plan's file list. The plan's own Slice 2 decision (capsule schema 4, no compatibility arm) necessarily changes the embedded state handle and therefore that pin; the reviewer confirmed no other bytes changed and the move is paired with an independent state_ref/handle/revision invariant. Not fixing the test would leave a genuine red. Recorded here so the reviewer does not re-raise it.
- r2 dispatched for F2 (explicit binding required in decoded launchers; the test that required the wrong behaviour is corrected) and F3.

## D586.187 — owner request: ChatGPT prompt for regenerating the classic board art (2026-09-10 14:59, supervisor)

Owner (verbatim): "write me a prompt to have chatgpt use my windows computer to use google image ai in my browser to generate imporved replacement art for the classic ui that can be substituted directly for the current art. Tell it to use python to generate svg based on the generated images while creatively adapting the pixel art to the 128x128 pixel budget. Include everything you have learned about making the ui as readable as possible to the ai dm. The classic ui is meant to be a top down view. have sol research prior top down rpg pixel based game ui to use as insperation. put the prompt in an md file in "./art/requests/" for chatgpt to read later."

Delivered: art/requests/2026-09-10-chatgpt-classic-board-art-regeneration.md (left UNCOMMITTED in the owner's art directory per D595; `new-request.mjs --check` ignores non-JSON files). Contents: hard constraints (CC0, licensing wall on prompts, write only art/incoming + art/requests, no public/assets/art, no git, no port 4173, no coordinate changes); reading order (README assessment, both board captures, the Emberkeep rejection example, palette.ts rule, pixel-art/art-sets, board-glyphs/light-glyphs/board-chrome for measured boxes, existing redo-starter-art-v1 requests, capture-screenshots.mjs); the 92-file drop-in inventory by family with camera/footprint rules; pixel and palette discipline; twelve AI-DM readability findings distilled from D519/D523–D525/D536/D561/D562/D568/D573 and the probe primer (one explicit mark per fact class, fixed glyph corners and silhouettes, art must match the primer wording, design for 2–4× downscale, obscured/fog contrast, doors as glyph + legend, HP lane clear, identity from silhouette + badge + roster, floor last, picture beats text at low effort, strict plan view except busts, chrome drawn over art); 35 abstracted prior-art principles from a sol research lane (session 01a08ca8-5c50-73e2-b6fd-eec5f3ade7c7, workspace-write in .tmp/runs/art-research with network, repos read-only; output .tmp/runs/art-research/topdown-pixel-ui-research.md; Part B source list kept OUT of the prompt; four principles annotated where the repository's fixed conventions override them); a four-phase workflow (orientation, browser generation with per-family briefs and a prompt log, Python pipeline emitting crispEdges SVG rectangles + pixel-identical PNG with automated checks, prove-in-place capture, request bookkeeping); acceptance criteria; definition of done.

## D605 — OWNER (2026-09-10 16:50): parallel S7/S9 handoff lanes with a two-round cap

Owner ruling on the supervisor's strategy analysis (asked one question at a time): the remaining VTT handoff steps S7a–S7d (WebSocket) and S9a–S9d (art staging) run as PARALLEL codex lanes, each in its own worktree branched from claude/vtt-handoff, with ONE Astra review per lane at the end of the lane and AT MOST TWO fix rounds per lane; residual findings after round two go to a ledger for the owner's call instead of a third round. D604 ("as many intermediate rounds as you need") stays in force for S0–S6 and S8; this ruling narrows it for S7 and S9 only. Supervisor cumulative verification and the full gate on the integrated revision remain the floor. Merge order into claude/vtt-handoff: S6 (once accepted) first, then S7 and S9 in acceptance order, each with a cumulative rerun on the merged branch.

## D606 — OWNER (2026-09-10 16:55): marginal arena test — raise the wall now, cost-cutting lane later

The D544-named test tests/unit/tools/ai-dm-arena.test.ts "suppresses every intel context surface while attributing off rows and preserving full bytes" measured 25.32 s alone on main HEAD 4335390c against its 30 s wall and has timed out in every concurrent cumulative run since 2026-09-09 01:09 (units txn, D569, reconcile, Room D, offers); it passes only on single-file serial retries. Owner ruling (one question at a time): BOTH — raise its wall to 60 s now under the D544 named-test exception (supervisor commit on main, this record), and queue a cost-cutting lane (make the test cheap: fixture or narrower assertion path, Astra-reviewed) as a follow-up unit. The supervisor had recorded the case as a load flake in offers r2/r3 without checking the pattern; that finding stands in the offers loop-log.

## D607 — OWNER (2026-09-10 17:05): held-out leak wall re-scoped to a runtime guard

Asked one question at a time, with the supervisor's explanation of the wall (static analysis of Vite/Vitest configuration to prove no alias or loader can make ordinary code resolve to the held-out evaluation module; rounds r4–r21 today closed bounded config-shape classes F47–F69 at one to three per round), the owner chose: RE-SCOPE TO A RUNTIME GUARD. Binding reading: (1) no further static-wall review rounds after the r21 review already dispatched? — NO: the r21 lane work (F67–F69) is committed once its chained supervisor verification is green, WITHOUT another Astra round; the static wall lands at that bounded level with Astra r19's verified claims as its record; (2) a new bounded unit HELDOUT-RUNTIME-GUARD-01 plans and implements a guard that resolves the real Vite/Vitest configuration in-process (including projects/extends and plugin hooks, the category (b) exclusion the static wall never covered) and asserts through the real resolver that no specifier reachable from the ordinary graph resolves to the held-out module or reserve paths; (3) planning by codex (sol), reviewed by Astra, D604 applies to the plan; (4) which static rules the runtime guard supersedes and which stay (direct reserve/protocol references) is a plan decision to be justified. Alternatives not chosen: two more rounds then ledger; land now; continue unbounded.

### D607.1 — OWNER (2026-09-10 17:08): "the wall will never be perfect. watch out for diminishing returns"

Binding reading for HELDOUT-RUNTIME-GUARD-01: the plan gets at most two Astra review rounds; the implementation gets one end-of-lane Astra review and at most two fix rounds (the D605 shape); after that the guard lands at its bounded level with the residual classes in a ledger. No further rounds on the static wall. The supervisor stops any unit whose findings-per-round has stopped falling and puts the residual to the owner instead of dispatching another round.

### D607.2 — clock correction (supervisor, 2026-09-10 17:01 EDT)

The headings of D605, D606, D607 and D607.1 carry estimated times (16:50, 16:55, 17:05, 17:08). The machine clock at the moment D607.1 was committed read 17:00 EDT; the four rulings were received between roughly 16:50 and 17:00 in that order. Git commit times on 83011328, 3e3b48e9, 6f958c0a and 289a09d8 are authoritative. Same drift the supervisor already corrected in the loop-logs earlier today; timestamps are now taken from `date` into a variable before writing.

## D608 — Offers Slice 2 LANDED on main (2026-09-10 18:55 EDT, supervisor)

Merge 55d90059: claude/p-offer-help (e83c1784 = Astra-accepted r3 5410f789 + landing reconciliation e75e4a9b accepted by Astra r4 + main merges 848c6983/e83c1784 carrying D606) into main, --no-ff. Landing evidence on e83c1784, two runs of the same gate script on the same revision: tsc 0, sg 0, playwright-gate 0 (gate-wt-p-offer-help-e83c1784-browser-green.log; its vitest stage was discarded because the supervisor had five lanes running during its serial retry) and vitest-gate 0 on a quiet rerun of exactly `npm run test:gate` (gate-offers-vitest-e83c1784-GREEN.log: six load flakes passed serially incl. tests/unit/tools/ai-dm-arena.test.ts, FAILED empty). D586.131 main-shape rule held: merge-base 967f45ba → prior main b7281f6e differs only under .claude/**. Slice 2 content: explicit offerEnvironment binding required across the process boundary (plan:539), ENGINE_MCP_LAUNCHER_FORMAT discriminator before structural validation, malformed claimed launchers throw typed TypeErrors (no fixture fallback), capsule schema 4 with the D545 change register updated (D586.186). Findings against the supervisor recorded in the offers loop-log: the marginal arena case was logged as a load flake in r2/r3 without checking its history; the D545 register provenance was mis-stated in one brief; the first landing gate was scheduled under load. Next: offers roadmap Slice 3, dispatched after the current verification queue drains.

## D609 — Quietstone classic art integration opened; supervisor rulings R1–R11 pending owner override (2026-09-10 19:43)

Owner (verbatim): "read \"C:\\Users\\desch\\Documents\\Codex\\2026-09-08\\computer-plugin-computer-use-openai-bundled\\outputs\\quietstone-classic\\CLAUDE-INTEGRATE.md\" and follow the instructions to integrate the new art into the classic ui". The instructions (sha256 8e2b5758…, identical inside the package) treat the package as a delivered candidate: validate checksums, integrate through the real generator pipeline (the app renders art in memory from recipes; PNG replacement alone is insufficient), keep per-id identity, keep badge/HP boxes clear, resolve the documented geometry conflicts explicitly, run captures on 4590+, run the comprehension probe if model access exists, mark requests accepted only after all checks pass.

Supervisor facts: package integrity verified independently (Pillow decode of every PNG equals the SVG rectangle runs; RGBA digests recorded as the external oracle); the repository's own art invariants fail on the candidate in six places (measured in .claude/consensus/quietstone/diag-metrics-r1.json). Rulings R1–R11 in .claude/consensus/quietstone/plan-r1.md: authored asset class beside the untouched procedural painters; 58 of 59 replacements (terrain-hazard is semantic material and stays procedural); translucent contact shadow permitted only in the shared shadow ink; chrome-aware plate/badge/HP contract replaces paint-under-the-HP-bar; authored token colour budget 50 with a v2 target of 24; palette near-twin pairs pinned and excluded from the distance invariant; native detail > 0 for authored (the 0.04 floor stays procedural); light-direction and near-identical variants recorded as v2 findings; request acceptance and the main landing wait for the full gate AND a same-seed screenshot-probe comparison with no regression; provenance names the image model and the unreviewed service terms truthfully. Any of these the owner can overturn; nothing lands on main under them without the probe comparison.

## D610 — OWNER: Quietstone art is evaluated on the branch under PROVISIONAL relaxations (2026-09-10 20:35)

Question put to the owner (one of three options, after Astra's plan review r1 rejected R5/R6/R8/R9 as requirement changes): the delivered package fails four D516 art invariants (token colours 31–49 vs 20; floors/walls/doors native detail 0.002–0.031 vs 0.04; 37 assets use palette pairs closer than 8 RGB, seven such pairs exist in the generated palette itself; props lack the top-left light bias; cleric/undead 0.01128 and cleric/beast 0.01184 silhouettes vs 0.012). Owner chose: "Evaluate on the branch (Recommended)" — build the pipeline and the authored class with the relaxations recorded as PROVISIONAL and branch-only, run the full gate and a same-revision old-vs-new screenshot probe, then the owner decides on the numbers; nothing lands on main until the owner rules. Astra reviews the plan r2 and the implementation under this ruling: the provisional authored-class thresholds are an owner-authorised evaluation envelope, not a weakening of the procedural invariants, and every procedural assertion stays intact.

## D611 — OWNER: Quietstone probe answered by the full judge panel (2026-09-11 08:21)

Asked (one of three): which models answer the same-revision old-vs-new screenshot comprehension probe (baseline build at 85168bc5 with the shipped art vs the Quietstone build, 24 states, same seed). Owner: "Full judge panel (fable, astra, sol high)". Plan §5/A3 model list becomes the D587.1 judge panel at high effort for BOTH runs; the per model×class decision rule and the strict ≥ 0.9 report apply per model.

## D612 — OWNER: F88 (NODE_ENV leaks into the production build) is fixed in a small standalone lane on main now (2026-09-11 08:22)

Asked (one of three): where to fix the S7 ledger residual F88 — serve.mjs and tools/dist-build-cache.mjs forward the caller's NODE_ENV into the production build, so a caller with NODE_ENV=test (vitest) gets the dev-only capability seam in dist and assert-dist-clean rejects it; the owner's live 4173 serve works only because that shell has NODE_ENV unset. Owner: "Small standalone lane on main now (Recommended)": one lane off main, dist-build-cache forces NODE_ENV=production for its build child, one regression, no other changes, normal gate; unblocks the S7 launch proof for S10 without waiting for the handoff branch.

## D613 — OWNER: raise the marginal tests' walls now; the cost-cutting lane runs after the handoff and D569 land (2026-09-11 08:33)

Asked: the marginal-test family (two other ai-dm-arena cases at 30 s, rl-generate-data "generates an unfrozen seed…" at 30 s, engine-mcp-server "bounds one-to-three blind attempts…" at 5 s — 5099 ms in the D569 lane, timed out again in the supervisor's 21-spec run at load ~3, then 14/14 on a quiet serial rerun) costs a serial rerun on almost every verification. Owner (verbatim): "Raise the timeout for now and dispatch the cost cutting lane after the handoff and d569 land". Supervisor action: walls raised on main in the D606 manner (30 s → 60 s for the two arena cases and rl-generate-data; 5 s → 15 s for the engine-mcp-server case), the four tests re-run, committed with explicit paths; these four join the D544/D606 named list. The D606 cost-cutting lane is queued behind the handoff and D569 landings.

## D614 — OWNER: S8 gets at most one more lane round after r3, then merges regardless with residuals in the ledger (2026-09-11 09:03)

Asked: S8 findings per round went 2 → 2 (r3 review pending), so D607.1's falling-findings rule was not met while D604 allows unlimited rounds. Owner: "One more S8 round, then merge regardless" — a fourth lane round only if the r3 review's findings are correctness (not coverage gaps); anything left after that goes to .claude/consensus/vtt-handoff/ledger.md and S8 merges into claude/vtt-handoff.

## D586.188 — Offers Slice 3A scope deviation: eleventh source file authorized to close S3A-F1 (supervisor, 2026-09-11 10:18)

Astra's 3A review found the production board sequence (encounter-projections.ts generate → project) minting two environments so every moving option lost its path (S3A-F1, high). The only correct fix threads one environment through that file, which is not on the roadmap's ten-file 3A list. The supervisor's fix-round brief required exactly that, so the cumulative 3A diff has eleven source files plus two authorized specs. Ruling: the deviation is authorized and recorded; the roadmap's per-subslice cap is a review-unit boundary, not a licence to leave a reviewer-confirmed production regression in place. 3B's file budget is unchanged; encounter-projections.ts is now listed among 3A's consumers. Astra re-reads under this ruling.

## D612.1 — NODEENV-BUILD-01 LANDED on main (2026-09-11 11:48, supervisor)

Gate wt-nodeenv on the merged revision 7b91dc0c (branch f674b16c + main c860464e): tsc 0, sg 0, vitest-gate 0 (load flakes passed serially), playwright-gate 0 (two load-signature failures — ai-chat readiness at 75 s during "Starting local database", homebrew-import sheet element at 5 s — passed on the runner's retry). Main-shape rule held (merge-base → main differed only under .claude/**). Merged --no-ff into main. Effect: every serve path builds with NODE_ENV=production regardless of the caller's environment; the S7 launch probe can now be re-run on the handoff branch once main is merged in. Ledger F88-b (direct `npm run build` still environment-sensitive) stays open.

## D615 — OWNER: Fable limit reached; the supervisor runs as Opus 5, and the Quietstone probe's Fable seat is unavailable (2026-09-11 14:28)

Owner (verbatim): "fable limit was reached. you will be operating in opus mode until I way otherwise". Supervisor identity is now Claude Opus 5 (commit trailer updated accordingly); codex lanes and the gpt-6-astra reviewer are unaffected.

Consequence for D611: the Quietstone judge panel's Fable seat cannot answer. Verified directly at 2026-09-11 14:28: `claude --model claude-fable-5-1 --effort high -p 'ping'` returns "You've reached your Fable limit." The probe run that started 11:48 keeps the seat in its command line; its Fable calls fail fast and symmetrically on BOTH revisions (baseline 85168bc5 and candidate dc217f23), so the astra-high and sol-high seats still give a valid same-revision comparison. Ruling: let the running probe finish rather than discard ~2 h of baseline capture; at harvest, classify every Fable row (blocked vs a scored zero — Astra's Q-F11 residual warns the harness can classify a missing structured_output as schema_rejected with score 0 BEFORE the image check) and EXCLUDE the Fable seat from the owner's D610 decision, reporting it as unavailable rather than as a score. If the owner restores Fable credits later, the Fable seat can be re-run alone against both revisions with the same seed and merged into the table.

## D611.1 — Quietstone probe harvested; the supervisor computed the comparison because the harness refused to (2026-09-11 16:59, supervisor)

Both probe revisions wrote all 1008 rows (24 states × 14 classes × 3 seats). Baseline 85168bc5 exit 0 at 14:41:15, jsonl sha 460e9537…; candidate dc217f23 exit 1 at 16:51:40 with `TypeError: Blocked transport rows cannot be compared.` from renderProbeSummary — the harness behaving exactly as designed under D615, because the candidate's Fable seat is 336/336 blocked (the baseline seat answered 140 before the limit hit, then blocked 196). The supervisor therefore computed the per model × class comparison directly from the two jsonl files (.claude/consensus/quietstone/analyse-probe.py, output probe-comparison.txt), pairing rows on stateId after verifying the 24 stateIds AND their stateDigests are identical across runs.

Numbers, 24 paired boards per model × class, Fable excluded per D615:
- gpt-6-astra high overall 0.7913 → 0.8126 (+0.0213)
- gpt-5.6-sol high overall 0.7217 → 0.7324 (+0.0107)
- Strict ≥ 0.9 gate: no class that met it at baseline lost it.
- Predeclared rule (candidate ≥ baseline − 0.05 per model × class): exactly one breach, gpt-5.6-sol Q9 0.239 → 0.127 (−0.112). Astra's Q9 is flat (0.284 → 0.272, −0.012).
- Largest gains: astra Q10 +0.187, sol Q12 +0.167, astra Q12 +0.083, sol Q7 +0.050.

Q9 is "List fogged cells and obscured cells separately" and is scored per cell with its fogged/obscured classification. Its truth comes from the board's fog and obscurement REGIONS, which the Quietstone change does not touch — the overlays are unchanged and only the ground under them is new. The class is weak on both revisions: sol's baseline has 11 zeros of 24 boards, and per board the candidate is worse on 11, better on 6, unchanged on 7. Carried to the owner as the one flagged regression in the D610 decision.

## D611.2 — Gate queue was deadlocked for 6.5 h by a circular wait; chain rebuilt (2026-09-11 16:59, supervisor finding against the supervisor's own work)

The quiet-window scripts used two different mechanisms at once: an exit-file dependency AND a `pgrep -f "[v]erify-.*\.sh"` busy check. verify-offers-s3b.sh was queued behind gate-heldout.exit and, while merely sleeping in that wait loop, matched the busy pattern used by gate-quietstone-quiet.sh — which the heldout gate waits on. Circular: quietstone ← offers-waiter ← heldout ← quietstone. Load sat at ~0.9 with nothing running from 12:05 to 16:58 and no gate fired; the three gate monitors reported "waiting" correctly and the supervisor read that as a busy machine rather than checking the condition. Fix: killed the five waiters by PID and relaunched them as a strict linear chain with no pgrep condition — quietstone → heldout → d569b → offers 3B verify → handoff battery, each waiting only on its predecessor's exit file, with the real exit code recorded instead of a hardcoded 0. Quietstone gate started 16:58:39 at load 1.05. Rule: a queue may use exit-file ordering or a process-presence check, never both; a sleeping queued waiter is not a busy machine.

## D616 — OWNER: Quietstone is accepted, but the fog/obscurement contrast is fixed before the merge (2026-09-11 18:59)

Asked with the D611.1 numbers in hand (astra 0.7913 → 0.8126, sol 0.7217 → 0.7324, no class losing the strict ≥ 0.9 bar, one breach at sol Q9 0.239 → 0.127 with astra Q9 flat at −0.012). Owner: "Accept, but fix fog contrast first". Ruling: the art is accepted in principle; claude/quietstone-art does NOT merge yet. A follow-up lane raises the fog and obscurement overlay contrast against the new quieter floor, and the Q9 class is re-run on both revisions with the same seed before the merge. Merge condition: the vitest re-gate green AND the re-run showing sol Q9 back within the predeclared candidate ≥ baseline − 0.05 band (or the owner accepting the residual explicitly). The D516 art invariants and the envelope ledger bind the overlay change exactly as they bind the assets; the overlays are chrome, not authored assets, so any pin they move needs an independent invariant in the same change.

## D617 — HELD-OUT RUNTIME GUARD LANDED on main (2026-09-11 19:05, supervisor)

Gate wt-p-heldout on 726e61ce (branch + main 6b08d6eb): tsc 0, sg 0, vitest-gate 0 (one load flake, ai-dm-screenshot-probe.test.ts, passed on the serial retry), playwright-gate 0. GATES DONE 19:01:58. Main-shape rule verified before merging: `git diff --name-only $(git merge-base main HEAD) main` is entirely under .claude/**, zero source files. Merged --no-ff into main as 41a8ab74. The three recorded residuals stay in .claude/consensus/heldout-rem/ledger.md.

Unrelated working-tree state noted, NOT touched and NOT committed: the main repo has 61 modified and 17 untracked files under art/requests/ with mtimes of 2026-09-09 and 2026-09-10 (status open → delivered plus reformatting, and new emberkeep-* requests). They predate this window, belong to the art-request bookkeeping rather than to any lane, and the merge neither included nor disturbed them.

## D618 — OWNER: the handoff branch is repaired through all six triage families, sequentially (2026-09-11 22:51)

Asked after the §F battery came back red (vitest-gate 1, playwright-gate 1, launch probe 1) and astra's read-only triage classified 16 of the 17 failing cases as stale expectations or a checker gap with one undiagnosed. Owner: "All six families, sequentially" — one codex lane per family in the triage's order, each verified before the next is dispatched, then a full re-gate of the branch. The handoff report is not written until that gate is green; READY remains conditional on it, and anything still open at the end goes to the ledger as a residual. Rationale recorded with the ruling: the branch was declared code-complete S0–S10 on targeted per-step verification that never ran the whole suite, so the repair is the cost of that gap rather than new scope.

## D569.LANDED — the D569 legacy-invariance oracle is on main (2026-09-11 22:55, supervisor)

Gate on the MERGED revision 3050496e (branch 98a41457 + main, reconciled): tsc 0, sg 0, vitest-gate 0 with zero failures, playwright-gate 0 with 187 passed in 51.9 m and zero flakes. Main-shape rule re-checked immediately before merging: `git diff --name-only $(git merge-base main HEAD) main` is entirely under .claude/**. Merged --no-ff into main as 1c8eeb3f. Remaining D569 follow-ups, unchanged by this landing: install tools/d569-v5 and runbook v2 into ~/dnd-slim-runs, and relaunch the broken cells (D590).

## D586.189 — Offers Slice 3B verified; the four post-commit failures were load, proven by a quiet serial rerun (2026-09-11 22:55, supervisor)

The 3B work was committed as 6bd0e757 (ten consumer test files, 176+/20−, no production change). The post-commit rerun on the clean tree showed four failures — two arena cases and two conversation-runner cases — but it ran at load average 13.75 while the §F battery was building and driving a browser suite. The supervisor did NOT report that as a result. A serial rerun (maxWorkers=1) of exactly those two files at load 2.38 passes 129/129. Combined with the quiet verification on the same content (typecheck 0, sg 0, diff-check 0, 326/326 targeted, 174-spec cumulative serial 3222/3222, frozen contract digest unchanged), Slice 3B is verified and the astra review can be dispatched. Recorded because the first rerun would have been a false regression report against the lane.

## D618.1 — the handoff failures are proven to be the branch's, not main's (2026-09-11 22:55, supervisor)

Control run of all SEVEN failing spec files on main at load 1.17, serial: 7 files, 109 tests, all pass, exit 0. The same seven fail on claude/vtt-handoff, where every one of those files is byte-identical to main. This closes the question the triage left implicit: main is healthy and the branch's own source changes are the cause.

## D619 — 2026-09-13 13:53:15 — Token backing: revisit after fog lands

Owner ruling: the baked 2-px outline and flat-bottom silhouette on the Quietstone tokens are not addressed now. Ship the fog fix and the Q9 re-run (D616) first, then judge the tokens against legible fog. No art request is opened. The item stays in the Quietstone ledger as deferred, not closed.

## D620 — VTT HANDOFF LANDED on main (2026-09-13 16:51:54, owner ruling "Merge now, residual in ledger")

claude/vtt-handoff (c3223d15, nine repair families under D618) merged into main at 45f0bc33 with --no-ff. Landing gate on c3223d15, read by the supervisor: tsc 0, ast-grep 0, vitest-gate 0 failed (5 load flakes passed serially; load 8+ was the supervisor's own serve.mjs builds), Playwright initial 185 passed / 2 unexpected, serial retry 2/2 (187 total, equal to main's count), runner verdict failed = none. Main-shape check 0 non-.claude files at merge time. The two Playwright first failures (homebrew-consumer-cutover, homebrew-subclass-authoring) happened at load ~2, so the runner's "load flake" label is not a proven cause; the owner chose to merge on the gate rule and carry them as a residual (ledger). The gate ran twice today because a host reboot killed the 02:09 run mid-Playwright and wiped ~/.cache/ms-playwright; Chromium was reinstalled and only the browser phase rerun on the same SHA. Next per D618: the handoff report (READY, conditional on the owner's Windows probe from the owner checkout) with residuals from the ledger.

## D621 — OWNER (2026-09-13 16:57:13): parallel lane — Fable collaborates with astra to analyse the whole app and propose refactorings and improvements

Owner instruction verbatim: "have a parallel lane where fable collaborates with astra to analyes this whole app and come up with suggested refactorings and improvements". Unit APP-ANALYSIS-01 opened under `.claude/consensus/app-analysis/`. Binding: astra (gpt-6-astra high, read-only on main 45f0bc33) authors the analysis; the supervisor (Fable 5.1) runs an independent analysis pass of its own, then the two critique each other's findings per the consensus loop (≤3 rounds) and a joint ranked report goes to the owner. No code changes in this unit; proposals only, each with file:line evidence, value, risk, effort and a verification plan. Rejected-by-decision items are excluded (decisions.md wins). Runs in parallel with the fog lane, the offers 3B review and the handoff battery.

## D620.1 — VTT HANDOFF REPORT PUBLISHED: READY (2026-09-13 17:04:30, supervisor)

`reports/claude/READY.md` + `handoff.json` published to the owner root `.tmp/vtt-handoff` with `npm run handoff:publish --report` from the owner checkout; `--check` = verified, readiness READY, reasons none. Evidence (.tmp/runs/handoff-report-input.json): all 11 REQUIRED_HANDOFF_GATES PASSED on the landed tree (tsc, sg, unit-gate, build, node-runtime-launch, worker dist/dev, browser-gate 187, cumulative 34 specs 388/388 with one load-marginal serial pass, runtime-parity, top-down-smoke); Windows probe PASSED (run by the supervisor from the owner checkout: powershell 5.1, both byte/hash directions, cleanup); nine art requests published to the owner root's art/outbox (01a09c91-…), no results yet. Distinguished: gate results are the supervisor's own runs; nothing in the report is a lane claim. Residuals carried in the ledger: the two homebrew first-attempt browser failures; the d583 inventory 5 s wall; REQUIRED_HANDOFF_GATES command strings for runtime-parity/top-down-smoke omit VTT_HANDOFF_ARTIFACT (config throws without it; ran with =dev); the 23 pre-existing Windows result bundles in art/inbox answer no request in this outbox. Per D589/OWNER-SPEC, READY means ready for the integration phase, not joined.

## D621.1 — APP-ANALYSIS-01 consensus reached: 14 merged findings, wave 1 = gate integrity (2026-09-13 17:36:48, supervisor)

Two rounds. Astra's 11 findings: 8 confirmed by the supervisor by reading/executing, 3 plausible, 0 refuted. The supervisor's 10: 1 confirmed, 9 partial; the supervisor re-verified and accepts the material corrections (runtime-only import cycles are 4 over 18 files, not 13 over 198; the 778 "string-coded errors" figure was wrong; D583 keys on paths; the resolver fix counted as landed is only on the unmerged Quietstone branch). Joint report: .claude/consensus/app-analysis/joint-report.md; merged list with owners and waves in astra-r2.md. No code changed. Owner decision pending: authorize wave 1 (M-1 gate-integrity lane).

## D622 — OWNER (2026-09-13 18:21:51): app-analysis waves 1 and 2 back to back

Ruling: "Waves 1 and 2 back to back" — M-1 (gate verdict integrity) first, alone; then M-2 (complete build-cache inputs incl. the 97 raw imports and the HEAD stamp; close F88-b) and M-3 (executable required-gate inventory), with M-14's factual documentation corrections alongside. Sequential lanes, each planned (sol) → plan reviewed (astra) → implemented (sol) → reviewed (astra) → supervisor-gated before the next. Nothing else from the analysis is authorized yet.

## D623 — App-analysis waves 3–6 queued behind waves 1–2 (2026-09-13 19:00, owner)

Owner: "queue up to wave 6." All six waves of the APP-ANALYSIS-01 joint report are authorized in sequence: wave 1 M-1 (in plan review); wave 2 M-2, M-3, M-14 facts; wave 3 M-4, M-5, M-11, then M-6's graph and arena seams; wave 4 M-7 and M-8, then M-12 after persistence edits settle; wave 5 M-9 and M-10; wave 6 M-13 and optional symbol tooling for M-14. Each item keeps the D622 cadence: planned (sol) → plan reviewed (astra, ≤3 rounds) → implemented (sol) → reviewed (astra) → supervisor-gated before the next starts. A wave does not start until the previous wave's last item is on main. The do-not-do list in the joint report still binds. M-6 and M-11 fold into the D606/D613 cost-cutting lane where the report assigns them; M-7 waits for offers 3C; M-8 and M-5 land as vtt-handoff residuals. Anything that needs a new owner ruling (a production seam, a pin move, a scope beyond a finding) stops and asks.

## D622.1 — M-1 (gate verdict integrity) plan ACCEPTED after three rounds; implementation dispatched (2026-09-13 20:39:17, supervisor)

Plan: dnd-wt-gate-integrity/.tmp-plans/2026-09-13-gate-verdict-integrity-plan.md, round 3 (1,093 lines; snapshot .claude/consensus/app-analysis/plan-m1-r3-snapshot.md). Astra round 3: ACCEPT PLAN M1 with two nonblocking P3 notes (coverage-cleanup wording in the residual; the bounded Playwright proof must also assert stock.json), folded into the implementation brief. Shape: four-domain phase verdict (process / reporter-global / discovery / per-file), stock JSON reporters KEPT and gate-owned .evidence.json sidecars ADDED, report v2 with passedOnRetry/failedFiles/phaseFailures, onProcessTimeout captured as fatal, individual Playwright test timeouts stay retryable per D544 while global timedout/interrupted/onError are fatal, RED-before-GREEN 3 files / 59 tests plus one bounded real Playwright fixture spec, three real end-to-end proofs. Supervisor follow-up on landing: dnd-slim-runs/gate-wt4.sh:8 and browser-main-queued.sh:6 grep LOAD FLAKES and must switch to the v2 headings (PASSED ON RETRY (cause not inferred) / FAILED FILES / PHASE FAILURES).

## D624 — OWNER (2026-09-13 20:43): try SVG-authored fog converted to PNG for the fog problem; brainstorm experiments with astra

Owner: "try to make svg converted to png to solve the fog problem. brainstorm experiments with astra". Opens unit QSFOG-SVG-01 on the Quietstone lane: first a supervisor + gpt-6-astra brainstorm of experiments (vector-authored fog/obscurement grammar rasterised to PNG at the native tile sizes, or rendered as inline SVG overlays), each with a predeclared measurement on the existing Q9 probe; then the owner picks. The just-landed intervention harness (--image-override-manifest) is the experiment loop: composite candidate fog renderings onto captured boards and run Q9 without touching production or pins. Nothing ships from this unit without a plan (sol) → plan review (astra) → implementation → review → gate, and no pin, generator version or oracle moves without the D516/ledger contract in the fog plan. Wave work under D622/D623 continues in parallel.

## D616.1 — Quietstone fog: two-direction Sol Q9 intervention verdict INCONCLUSIVE; Option B forbidden (2026-09-13 20:51:27, supervisor)

Per the fog plan's predeclared rule (line 87), computed by a sol analysis lane from the scorer's own fact accounting (96 board-arm records, 0 accounting-identity failures; inputs and digests in .tmp/runs/quietstone/intervention-analysis/verdict.md): old floors on the candidate meet the joint FP threshold in 1/5 base seeds (needs 4); new floors on the baseline in 0/5; the old-floor direction also raises aggregate true-fog omissions 18→19/24. Deciding clause: "a one-sided, mixed, blocked or transport-failed result is inconclusive and forbids Option B." SUPERVISOR CROSS-CHECK: per-base sums recomputed from per-board.csv match (5763040: candidate 226/1040 → +old floors 22/1040; baseline 70/1040 → +new floors 9/1040). Observation for the record: ordinary-floor fog FP totals are 280 (original candidate), 83 (original baseline), 33 (candidate + baseline floors), 25 (baseline + candidate floors) — BOTH recomposed sets have far fewer fog false positives than BOTH originals, and the effect is concentrated in base seed 5763040. Floors are therefore not shown to be the cause; run-to-run variance of the model on the same boards is unmeasured and must be measured (a repeat arm) before any rendering experiment can be read. Consequence: Increment 2 proceeds with Option A (or C) only; the D624 SVG brainstorm feeds the choice of fog grammar; nothing is dispatched for Increment 2 until the owner picks from the brainstorm.

## D624.1 — OWNER (2026-09-13 21:08): SVG-fog pilot = repeatability arm + 5-px frame

Owner picked "Repeat arm + 5px frame pilot": (1) the unchanged Quietstone Q9 captures run twice on the same day through the override harness to measure the within-condition spread per base seed; (2) the 5-px SVG-authored Option A fog frame (astra experiment 3, geometry frozen before rendering) against that same-day control, same 24 states / seed 20260910 / gpt-5.6-sol high / primer general / glyphs none / tile 128 / png. Thresholds per the brainstorm's pilot-promotion rule with the supervisor's spread amendment (gain >= max(0.05, 2× measured spread)). Route: DOM re-capture with an asset override, pending astra round 2; the probe change is planned by sol and reviewed by astra before any call is spent; the repeat arm runs as soon as the probe-override fix lands (46dbc344 + fix round 2), on a committed revision with no lane editing the worktree. Nothing ships from the pilot; a win goes to Increment 2 planning with the 3-px invariant amended explicitly.

## D624.2 — SUPERVISOR (2026-09-13 21:53): QSFOG-01 probe override ACCEPTED at 14039ca5; SVG-fog pilot plan to review
Astra review r3 (final) on 14039ca5: ACCEPT PROBE-OVERRIDE, no P1. PO2-F1 RESOLVED (source bytes authenticated, exact source/override dimensions), PO2-F2 RESOLVED (signature/IHDR length-type-CRC/chunk bounds/IEND+CRC), PO2-F3 PARTIAL. Residuals recorded, not fixed now: PO3-F1 (P2) two mutation claims unproven — an optional `sourcePng` schema field would survive (fixture always supplies it) and the capture-avoidance test injects a service so deleting only the startup guard is undetected; PO3-F2 (P3) version label not enforced (v1 manifests fail only because required fields are absent); PO3-F3 (P3) the lane's "exact IHDR equality" claim is width/height only — colour-type equality would reject the authorised artifacts (RGB sources vs opaque RGBA overrides), so the wording is corrected here, not the code. Astra's independent artifact check: 24/24 source digests, 24/24 override digests, 24/24 dimensions per manifest, all 48 overrides decode. Supervisor verification (verify-probe-override-r3.log) as recorded in the quietstone loop-log. The probe override path is now the delivery mechanism for the D624.1 pilot; PO3-F1's two tests go to whichever lane next touches the probe spec.
Sol delivered the pilot plan (.tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md, 855 lines, sha 5634e07f…, zero model/test/git actions). Astra plan review r1 dispatched. C1/C2 cannot start before Increment A: the plan makes the identity manifest a tool output with a validation chain, not a hand-written file, so the repeat arm waits on Increment A landing (D624.1 "as soon as the probe-override fix lands" is satisfied on the probe side; the manifest tool is the remaining dependency).

## D622.2 — SUPERVISOR (2026-09-13 21:53): M-1 implementation r1 REJECTED by astra; five P1 accepted; fix round 1 dispatched
69d8215c (M-1, committed after my own contract verification was green). Astra found five P1 and one P2; I verified before accepting: I1-F1 by reading node_modules/playwright/lib/runner/index.js:3958 (stock spec.file is rootDir-relative, rootDir = tests/browser) against tools/gate-verdict.mjs:12-16 (normalises against cwd) — every REAL Playwright gate run would report stock-evidence-mismatch on complete passing evidence; the fake command's absolute paths hid it, and my bounded proof only asserted reporter counts, never classification. I1-F3 and I1-F4 by installed parseCLI probe: bare `--fileParallelism` does not consume the next token (the gate's initial filter does, swallowing a file and expanding scope); `--isolate false` parses false but the retry retains only `--isolate` (true); `--coverage false` likewise. I1-F2 (unique() before completeness; no duplicate-id or id/file-pair check) and I1-F5 (last-wins Map per path across projects) by reading gate-verdict.mjs:341 and :291. Finding against my own verification: verify-m1.sh proved the contract the plan wrote and nothing the plan did not write; the Playwright classifier proof was missing from the plan and I did not add one. Fix round 1 brief adds that proof (stock+evidence through classifyPhase, asserted) and the four parseCLI argv probes. Brief .tmp/runs/analysis/impl-m1-fix-r1.md; sol session resumed.

## D622.3 — SUPERVISOR (2026-09-13 22:40): M-1 fix round 1 verified and committed 0e9235c8; astra implementation review r2 dispatched
Codex reports RED 18 failed / 52 passed of 70 → GREEN 70/70. My verification (verify-m1.log 22:35, verify-m1-pw-classify.log 22:37): focused 70/70, tsc 0, sg 0, node --check ×6, proofs 1-3 asserted, and the classifier proof the plan lacked: real Playwright stock+evidence through classifyPhase — full fixture failed [execution-unfinished] + discovery missing 1 with NO stock-evidence-mismatch; --grep positive control passed / complete / zero reasons. Finding against the supervisor (recorded in the app-analysis loop-log): my fix brief demanded the deliberately failing fixture classify as passed; the lane correctly stopped BLOCKED; the continuation brief corrected it. Supervisor rule from this: a proof assertion is written only after reading what the fixture does.

## D624.3 — SUPERVISOR (2026-09-13 22:40): SVG-fog plan r2 does not resolve PS1-F1; astra plan review r2 dispatched with the probe
Sol's r2 wrapper (plain object, absolute base import at /tmp) lists 0 tests: the base playwright.config.ts imports ./worker-origin relatively and that import fails when the importing config lives in /tmp. Sol's "proof" overwrote its only writable file (the plan .md) with the wrapper and ran --config=<plan path> from inside the worktree, which exercises a different resolution context; the proof is void and the method is a process finding. Verified fix: the same wrapper under the worktree's gitignored .tmp/ with a relative base import lists 186 tests / 52 files and 1 test with the spec filter. Handed to astra as PS2-F1.

## D617.3 — SUPERVISOR (2026-09-13 22:40): offers 3B at round cap with astra REJECT r3; owner ruling requested
See .claude/pending-questions/offers-s3b-runtime-factory-seam.md (options A/B/C; recommendation A: one cap-exceeding test-only round implementing astra's four minimal changes). No offers dispatch until ruled.

## D622.4 — SUPERVISOR (2026-09-13 23:36): M-1 implementation ACCEPTED by astra (r3, final) at 229962c3; full gate launched on wt-gate-integrity
Astra r3: no P1; I2-F1/F3/F4 + Playwright retry invariant RESOLVED, I2-F2 PARTIAL (non-blocking). Astra re-ran the parser declarations in memory through installed parseCLI: kebab/camel/short/dotted/repeatable forms all retained on retry; `--retries=7` and `--retries 7` stripped in both phases. Executed in-memory kills: duplicate-id guard, association swap, kebab normalisation, negated-flag handling, --retries stripping. Test count 59 → 70 → 76 with every original name present. Residual recorded for the landing note: I3-F1 (P2) the cast guard at tests/unit/tools/gate-evidence-reporters.test.ts:435 is a substring check (misses `as any`, aliased type names, newline-separated casts); the one surviving cast is the JSON.parse boundary at :160. Astra note: dotted option names keep their dots (--browser.name), and replacing dots with hyphens is NOT equivalent in installed parseCLI; the mechanical both-spellings test covers VALUE_OPTIONS, not universal alias equivalence. Gate: new wrapper /home/vagrant/dnd-slim-runs/gate-wt5.sh (v2 headings added to the grep filter; gate-wt4.sh left untouched for older worktrees) on port 4580; box quiet (0 codex lanes, load 0.15). Next on green: main-shape check, merge to main, then browser-main-queued.sh:6 → v2 headings, then wave 2 (M-2, M-3, M-14).

## D624.4 — SUPERVISOR (2026-09-13 23:36): SVG-fog pilot plan REJECTED at the final plan round; owner ruling requested
Astra r3: PS2-F1, F3-F8 RESOLVED, F2 PARTIAL; two P1 remain in Increment B's deterministic measurement — PS3-F1 nearest-reducer degeneracy (constant reference masks in several 32/64-px phases) and PS3-F2 the frozen 5-px frame scores native NCC 0.109 against the 0.60 threshold on the pinned stone floor by astra's two independent implementations of the plan's own equations; the plan's "lawful positive" was a hatch self-correlation that bypasses composition. Plus P2: PS3-F3 freeze-digest ordering, PS3-F4 block-record commands. Question filed: .claude/pending-questions/qsfog-svg-pilot-plan-cap.md (A split the unit and run Increment A now while Increment B's measurement gets one bounded round — recommended; B accept deterministic rejection; C stop). Nothing dispatched on QSFOG-SVG-01 until ruled.

## D622.5 — SUPERVISOR (2026-09-14 00:50): M-1 LANDED on main by fast-forward (d251e716 → 229962c3); wave 1 complete pending the landed vitest verdict
Worktree gate (gate-wt5, 23:36-00:47): tsc 0, sg 0, Playwright browser suite verdict passed (no retries, no failed files, no phase failures, exit 0); vitest gate exit 1 on exactly the three environment-bound handoff specs (14 tests, UNAUTHORIZED_REPOSITORY_ROOT), proven unrelated to M-1: files byte-identical to main, and the identical three files pass 20/20 in the owner checkout (verify-handoff-env-bound.log). Four files passed on retry in the worktree run (js-round-plan-integration, ai-dm-screenshot-probe, d583-contract-inventory, room-generator-los-cover) — reported by the new verdict with "cause not inferred", as designed. Merged --ff-only; the vitest gate is now re-running in the owner checkout (an authorised root) for the landed verdict (gate-main-landed-m1.log). Consumer scripts updated additively: dnd-slim-runs/gate-wt4.sh and browser-main-queued.sh grep the v2 headings (originals kept as *.pre-m1); gate-wt5.sh is the same with HEAD/dirty in the header. Residuals carried: I3-F1 (cast guard substring check); the env-bound handoff specs go to M-3 in wave 2 with the specific fix (construct a temp-root identity policy; publish.ts:148/209 accept one). Wave 2 (M-2 build cache, then M-3, M-14 alongside) begins when the landed vitest verdict is green; M-2 worktree dnd-wt-build-cache (branch claude/build-cache at 229962c3, node_modules symlinked) prepared.

## D623.1 — SUPERVISOR (2026-09-14 02:05): M-14 plan ACCEPTED (astra r2); M-2 plan at round 3 (final)
M-14 (DOCS-FACTS-01): astra r2 ACCEPT with one P3 (PD2-F1: RULES.md:44 cites D237 + the 2026-09-03 finding, not D263 — wording fix folded into the implementation brief). PD1-F1..F4 RESOLVED; BUILD-PLAN historical annotation with 57 evidence paths verified to exist; SpellLevel comment bounded; 640→641 discovery. Implementation dispatch follows. M-2 (BUILD-CACHE-01): astra r2 REJECT with three P1 — unmodelled env interpolation (Vite expands `${VAR}` against the ambient environment), uncovered resource entry points (inline HTML modules/styles, CSS image-set, auto-discovered PostCSS config), and the build split's validation ordering (MISS runs only Vite for direct consumers; artifact stored before the trailing guard). PB1-F2..F6 RESOLVED. Round 3 (final) dispatched with "bypass on any unmodelled input" named as the acceptable scope reduction.

## D623.2 — SUPERVISOR (2026-09-14 02:35): M-14 implementation ACCEPTED by astra (r1) at b9cd6a9e with three non-blocking residuals → test-only fix round before landing; M-2 plan ACCEPTED WITH AMENDMENT after the final plan round
M-14: astra r1 ACCEPT, no P1. Residuals ID1-F1 (P2; my own survivor: the superseded "One suite-running lane at a time." sentence reinserted before the first H2 escapes the section-scoped rejection — astra: reject it anywhere in supervision.md), ID1-F2 (P2; three planned facts unasserted: the lock-serialisation clause, BUILD-PLAN's current-sources sentences, the SheetSpellLevel wording), ID1-F3 (P3; RULES.md:47-50 reference unguarded — retry is line 50). All three are test-only; fix round 1 dispatched with the three docs frozen at b9cd6a9e. Astra reproduced the four lane mutants in an in-memory harness and the 640→641 discovery statically; conformance to the plan text passes for all three targets; BUILD-PLAN's 57 citations over 54 paths all exist.
M-2: astra r3 (final) REJECT on one P1, PB3-F1 — PostCSS config discovery follows Vite's workspace root (config.js:30344-30345, workspace markers at :25356-25390), which is not the scanned repository root as a lookup-time constraint; astra: "The supervisor can adopt this bounded amendment without another plan round." Ruling: PLAN M-2 ACCEPTED WITH AMENDMENT PB3-F1 — before every pointer lookup, BYPASS when Vite's workspace root ≠ repository root; detect and BYPASS a Vite `root` override or any `css.postcss` configuration (unsupported/computed forms bypass); independent repeated-call fixtures for ancestor discovery and redirected configuration asserting validated builds and zero pointer reads/writes. PB2-F1 and PB2-F3 RESOLVED, PB2-F2 PARTIAL only by PB3-F1; PB1-F1..F6 carried. The amendment is binding on the implementation brief.

## D623.3 — SUPERVISOR (2026-09-14 04:20): M-14 LANDED on main by fast-forward (229962c3 → a04a6093); landed vitest verdict running in the authorised handoff root
Worktree gate (gate-wt5 on wt-docs-facts, 03:04-04:16): tsc 0, sg 0, Playwright verdict passed (no retries, no failed files, exit 0); vitest exit 1 only on the three environment-bound handoff specs (same cause as M-1's worktree gate; M-3 residual), three files passed on retry (codec-slot-is-never-an-identity, ai-dm-screenshot-probe, d583-contract-inventory). Contents: supervision.md compile-gate and lock-boundary corrections with a controlling-decisions index; BUILD-PLAN.md historical with evidence column; ids.ts SpellLevel comment; spec tests/unit/docs/operational-guidance-facts.test.ts (astra ACCEPT r1; residuals ID1-F1..F3 closed in the test-only fix round, both supervisor mutants killed). dnd-wt-vtt-handoff detached at a04a6093 for the landed verdict (gate-landed-m14-handoffroot.log).

## D623.4 — SUPERVISOR (2026-09-14 05:50): M-3 plan ACCEPTED WITH AMENDMENT PG2-F1 after astra's round-2 review; implementation dispatched
Astra r2: PG1-F1 (execution vs discovery environment; M-1 runner overrides; Playwright JSON redirection), F3, F4, F5, F6 RESOLVED; F2 PARTIAL only by PG2-F1 (P2): revision-drift classification contradicted the matching/stale rules — astra's minimal change adopted as binding: drift (revisionBefore ≠ revisionAfter) is an outer failure classified `failed` before stale filtering, with the v2 verdict preserved; stale `not-run` only for completed evidence with equal recorded revisions ≠ current HEAD. Astra independently confirmed 11 unchanged gate ids, 34 existing cumulative paths, the M-1 reducer's retry semantics, config.rootDir-relative Playwright identity, and the in-memory default-guard mutant against the real paths.ts. Allowed files per plan §8.1. Landing order stays M-2 then M-3 (D623); M-3's worktree is a04a6093 and will be rebased onto main after M-2 lands (no file overlap expected).

## D623.5 — SUPERVISOR (2026-09-14 06:35): M-2 implementation review r3 (final) REJECT on two config-recogniser P1s; cap reached; owner ruling requested
Astra r3 on 2d659dbc: IB2-F3..F6 RESOLVED, F1/F2 PARTIAL — three env-binding forms (element access, destructuring, parenthesised process alias) and a computed property in a local initializer still yield silent HITs (reproduced through the production cache functions with an injected build callback). Everything else passes: real repository CACHEABLE, empty reason list, 840→939, all 97 omissions present, no false bypass, eight new-detector mutants each killed by their own control, zero removed or weakened assertions, print sites intact. Astra's census note: its instrumented scanner counts 716 scanned executable files / 7 outside src / 111 resource targets vs the lane's 734/24/134 labels (closure membership independently confirmed; the labels need clarification in the landing note). Question filed: .claude/pending-questions/m2-build-cache-review-cap.md (A one cap-exceeding round adopting astra's AST-fingerprint rule for config programs — recommended; B land with residuals; C stop). Nothing dispatched on M-2 until ruled. M-3 implementation continues; its landing order (after M-2) now depends on the ruling.

## D623.6 — SUPERVISOR (2026-09-14 09:35): M-3 implementation ACCEPTED by astra (r3, final) at e7f54462; worktree gate launched; landing order question added for the owner
Astra r3: IG2-F1..F3 RESOLVED; IG1-F4..F8 carried; cumulative expectation audit clean (only the authorised retirement of caller-provided gate claims / preExistingFailures); eight independent reproductions incl. superset retry, initially-passed file in retry, empty discovery with passWithNoTests, missing sidecar / pending / queued modules, sidecar UUID mismatch, D544 individual timeout passed on retry — all classified as expected with M-1 diagnostics preserved. Residual for the landing note: IG3-F1 (P2) — a sidecar rejected by M-1 for invocation mismatch still contributes its module to executedTestIdentities (cannot authorise READY because reconciliation fails); minimal change: require version/kind/phase/invocation identity to match before extracting sidecar accounting. Landing-note facts: the published-vs-built boundary table is faithful to a04a6093; the cumulative command renders all 34 paths verbatim; four pre-existing long package.json lines remain; production identity policy, lockfile and the four M-1 runner files byte-identical to baseline. Gate: gate-wt5 on wt-gate-inventory, port 4750 (the vitest phase is expected to be fully green in this worktree for the first time, because the identity-policy repair is in the branch). D623 ordered M-2 before M-3; M-2 is blocked on the owner's cap ruling and shares no files with M-3; whether M-3 may land first is appended to the M-2 question. No merge until ruled.

## D623.7 — M-2 BUILD-CACHE-01: owner rejects both the AST grammar and the checked-in fingerprint; redesign around automatic content hashing (2026-09-14 12:47, owner via supervisor)

Owner ruling on the M-2 review-cap question (.claude/pending-questions/m2-build-cache-review-cap.md): the reviewer's fingerprint alternative "won't work. I need it automatic." The AST-grammar approach at 2d659dbc is "too complicated"; the requirement is "just recompute files if any contents change." Two owner questions to answer with research: (Q1) can we cache all but the changed files (incremental rebuild)? (Q2) can we take a recursive fingerprint of each level of subfolders and files so we know at a glance where changes are? Owner directed thorough research by opus and sol into how the community solves this.

Effect: options A and B of the cap question are both closed. Branch claude/build-cache stays at 2d659dbc, unmerged, as a reference; the closure walker and config grammar do not land. M-2 returns to planning after the research lands. Landing-order addendum D (M-3 ahead of M-2) is moot in its original form because M-2 is no longer imminent; M-3 landing still needs an explicit yes.

Supervisor action (2026-09-14 12:47): two research lanes dispatched from a scratch clone at fdcd0c44 (no live checkout touched, no builds): sol `codex --search exec` session 01a0a0d1-05b2-7dd0-a121-97498c03dd35 and `claude -p --model claude-opus-4-8` (per D586.40), shared brief .tmp/runs/analysis/research-build-cache-brief.md. Reports will be recorded under .claude/consensus/app-analysis/research-build-cache-{sol,opus}.md.

## D623.8 — OWNER (2026-09-14 13:50): "yes, land M-3" — GATE-INVENTORY-01 merged into main at 40f04e2c

claude/gate-inventory (e7f54462, three commits) merged with --no-ff into main (was fdcd0c44); 6 files, +3853/−288: tools/vtt-handoff/gate-inventory.ts (new, 1855 lines), tools/vtt-handoff/report.ts, the three handoff specs, package.json (`handoff:gate`). No overlap with the owner checkout's dirty files. Ordering: D623's "M-2 then M-3" was a trust ordering, not a code dependency; M-2 is back in planning under D623.7, so M-3 lands first. Residual carried in the landing note: IG3-F1 (P2, rejected sidecar counted in executedTestIdentities while the gate verdict stays failed; no false READY possible) — to be fixed in the next handoff round. Landed verdict: dnd-wt-vtt-handoff detached at 40f04e2c, gate-landed-m3-handoffroot.sh (tsc -b --force, sg scan, npm run test:gate) launched 2026-09-14 13:50; result recorded when read. After this landing every fresh worktree's vitest gate should be free of the 14 UNAUTHORIZED_REPOSITORY_ROOT failures (verify on the next worktree gate).


### Landed gate 2026-09-14 14:03 at 40f04e2c: tsc 0, sg 0, vitest gate exit 0 (two known passed-on-retry files, no failed files). M-3 landing complete.

## D617.4 — OWNER (2026-09-14 14:11): offers 3B — "collaborate with astra to try to figure out how to simplify this situation. do research as well for similar problems people have solved"

Owner did not choose A/B/C on D617.3. Ruling: simplify. Supervisor's hypothesis put to astra for challenge: the identity proofs are complexity spent on the temporary state in which the transitional default still exists; deleting the eight default sites first (3C-zero) makes a missing environment a compile error, leaving one wiring test at the composition root. Astra lane dispatched with web search (brief .tmp/runs/briefs-2026-09-06/simplify-s3b-astra.md; scratch cwd; worktree read-only). Nothing is dispatched on the offers worktree until the owner rules on the resulting proposal.

## D617.5 — OWNER (2026-09-14 14:13): offers — one environment builder module, imported by everyone

Owner (verbatim): "there should only be one possible way to build the environment and then the round runner and the board projection and everything else need to import that env builder module." Binding design target for Slice 3's remainder: a single composition-root module is the only exported way to construct an EngineOptionEnvironment; the four constructors currently exported from src/vtt/offers/offer-environment.ts and called ad hoc from eight modules stop being reachable outside it; mode (legacy_standard / revision_bound) is a caller input to the one builder, never a second builder. Supervisor note: identity in the codebase is already by digest (capsule carries the binding digest; offered-option-paths raises OfferedOptionEnvironmentMismatchError), so the invariant is "one builder + digest equality", not object identity. The astra collaboration lane (D617.4) was stopped after ~5 minutes and restarted with this ruling in its brief (new session id in the loop-log).

## D617.6 — OWNER (2026-09-14 15:18): offers single-builder tranche APPROVED; astra co-authors the plan; parallel audit for other private-builder candidates

Owner: "Yes to this direction, and collaborate with astra write the plan for the tranche with that batching." Astra's recommendation D (.claude/consensus/offers-impl/simplify-s3b-astra.md) is the approved design under D617.5. Role note: astra (gpt-6-astra) authors the plan this round on its design session, because the owner asked for its collaboration on the plan itself; sol reviews independently afterwards (the usual roles are swapped for this plan only, recorded here). Unit OFFERS-IMPL-S3-BUILDER, plan .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md in dnd-wt-p-offer-help (82ae8554), batched ≤10 files per review unit, non-dispatchable tranche.

Owner, second instruction: "In a parallel lane, collaborate with astra to look for more areas where we would benefit from this type of fix … It seems unlikely that this is the only spot where we need to take constructors into private builders." Unit BUILDER-AUDIT-01: astra audit + research lane on a scratch clone of main 40f04e2c (brief .tmp/runs/briefs-2026-09-06/builder-audit-astra.md); output → .claude/consensus/app-analysis/builder-audit-astra.md; ranked candidates with a wrong-result scenario each, rejected candidates listed, enforcement recommendation (gate currently scans src only), suggested unit boundaries. No code is changed by either lane.

## D623.9 — OWNER (2026-09-14 15:21): "A" on the M-2 git-key plan cap — one cap-exceeding plan edit limited to PR6-F1 (whole-line quote bypass) and PR6-F2 (authorise the two script-string assertion rewrites), then implementation with astra's implementation review; no further plan review.

## D623.10 — SUPERVISOR (2026-09-14 15:35): M-2 git-key plan FROZEN at r7 (sha a63d3e903439487b6e2898a37411c7634bb1454b9966f9454d2670b4e560c279, 701 lines); implementation dispatched
Both D623.9 items verified present in r7 (whole-line quote bypass at plan :70/:137/:557 with the two-file control; the two guard-route assertion rewrites named as deliberate at :241-245, files added to the allowlist :334-335). Worktree claude/build-cache fast-forwarded fdcd0c44 → 40f04e2c (clean; plan file retained) so the implementation lands on current main. Implementation lane: sol resume 01a0a0e3…, allowed files exactly five, mutant proof for every named mutant, size contract ≤150/≤250 with BLOCKED rather than a second module. Astra reviews the implementation next; no further plan review.

b'D648' -1 -1
b'D649' -1 -1
b'D642' -1 -1
b'D635' -1 -1

exec
/bin/bash -lc "git rev-parse --git-common-dir
git worktree list --porcelain | sed -n '1,80p'
pwd
ls -ld .git" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.git
worktree /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
HEAD 3be26bd873a8eec95198e1d0cbad1295e15e9e9c
branch refs/heads/main

worktree /home/vagrant/PhpstormProjects/dnd-lane-discord
HEAD 59114da4b738d1687925f41aa2ada4a1ab708db8
branch refs/heads/lane-wt/discord-b1

worktree /home/vagrant/PhpstormProjects/dnd-lane-dspike
HEAD c881ccb910bb28e6d54c66f7d1decf43eb09df69
branch refs/heads/lane-wt/dspike

worktree /home/vagrant/PhpstormProjects/dnd-lane-imports
HEAD 56d0a1884201e240d4663e1acd0ea93f5f0c95f7
branch refs/heads/lane-wt/cycle3-basis

worktree /home/vagrant/PhpstormProjects/dnd-lane-inc4
HEAD bdd54e4784d467078119cdbc2722e97a7a86e060
branch refs/heads/lane-wt/kill-2b

worktree /home/vagrant/PhpstormProjects/dnd-lane-inc6
HEAD 0695ead071fa8fb49ae03373487cb5d01bf0dcdf
branch refs/heads/lane-wt/m3-reaction

worktree /home/vagrant/PhpstormProjects/dnd-lane-kill2b
HEAD 4308021ae30c59c4ec4e5ff8c80131d042e1697f
branch refs/heads/lane-wt/kill2b

worktree /home/vagrant/PhpstormProjects/dnd-lane-kill2c
HEAD 29745ed3f7563c7e538fde06e3d653d6ea84f4e5
branch refs/heads/lane-wt/kill-2c

worktree /home/vagrant/PhpstormProjects/dnd-lane-m2
HEAD f15a2121f25e2bdb5ea706edd1d3c3cdf0afd418
branch refs/heads/lane-wt/room4-diagnosis

worktree /home/vagrant/PhpstormProjects/dnd-lane-m7
HEAD 411874e2ec43ec4abad7aff075b6f538028491d7
branch refs/heads/lane-wt/m7-knowledge

worktree /home/vagrant/PhpstormProjects/dnd-lane-mergefix
HEAD 7845aea67ba374ec420553a749503eb39748862e
branch refs/heads/lane-wt/mergefix

worktree /home/vagrant/PhpstormProjects/dnd-lane-packet
HEAD 25a0b39b264f4da3f18e6c8b960a598f48ddc46b
branch refs/heads/lane-wt/rerun-packet

worktree /home/vagrant/PhpstormProjects/dnd-lane-prose
HEAD ece9515c99d1150e3b4fe4d4c47efe0c786d47fd
branch refs/heads/lane-wt/caveman-prose

worktree /home/vagrant/PhpstormProjects/dnd-lane-rollout
HEAD 298e65e260edc159e70b08c8247c583af5f82cd0
branch refs/heads/lane-wt/ctrl-value

worktree /home/vagrant/PhpstormProjects/dnd-lane-statblocks
HEAD b1914a8c86c3cb57140b59762ee9ce8574f23e95
branch refs/heads/lane-wt/statblocks

worktree /home/vagrant/PhpstormProjects/dnd-lane-trial-idx5
HEAD 6fda4dd7657188f61f6d9b0fa4656cda843d86b3
branch refs/heads/lane-wt/trial-idx5

worktree /home/vagrant/PhpstormProjects/dnd-lane-vtt3a
HEAD a0d98183347b4535dbff75e041d60e9a8d43ea76
branch refs/heads/lane-wt/vtt3a

worktree /home/vagrant/PhpstormProjects/dnd-lane-vtt3b
HEAD 6e6a267280bfaae39e11ccaa6e0c211901c1a7c3
branch refs/heads/lane-wt/vtt3b

worktree /home/vagrant/PhpstormProjects/dnd-lane-vtt3c
HEAD b1cfd18306a302ab56fc8d6d49710e9ad5b3809b
branch refs/heads/lane-wt/vtt3c

worktree /home/vagrant/PhpstormProjects/dnd-lane-vttmove
HEAD 6a1f8a841cfb8a29cc9750391ad9476bdcea12ca
branch refs/heads/lane-wt/contentpack

/home/vagrant/PhpstormProjects/dnd-wt-vis-field
-rw-r--r-- 1 vagrant vagrant 100 Sep 15 13:36 .git

exec
/bin/bash -lc "python3 - <<'PY'
from pathlib import Path
p=Path('/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md')
s=p.read_text()
for start,end in [('D648','D649'),('D642','D643'),('D635','D636')]:
 a=s.find('## '+start)
 b=s.find('## '+end,a+1)
 print('\\n===== '+start+' =====')
 print(s[a:b if b"'!=-1 else None])
PY' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:

===== D648 =====
## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
RETRACTION, at full length. In D645 I rejected WALL-01 as P1 on two grounds, both wrong: (1) I claimed the vertex map was built from the bounding-box-filtered `candidates`; it was built from `candidateEntries` — the UNFILTERED union of indexed sources and blocked cells — so no cell was ever excluded; (2) I read my probe's aggregate blocksSight=false for two isolated diagonal blockers as "the rule is inert", but blocksSight is true only when EVERY corner ray is blocked, and in that geometry the ray along the far face (y=5) is legitimately clear (a graze) — the aggregate false was CORRECT. The decisive test I should have run first: a FULL stepped wall (column 7 rows 0–3, column 8 rows 4–7), Medium tokens (13,4)→(1,4): baseline 807d2e3c leaks (false); ORIGINAL WALL-01 blocks (true, first (7,3)); fix r1 blocks (true). Verified by me tonight on the throwaway checkout, all three trees. So the original WALL-01 was correct; fix r1 replaced a correct precomputed map with equivalent on-the-fly lookups and added per-ray witnesses for my three geometries (valid per-ray, and the split-pair control) — harmless, kept as the candidate, but the "bbox regression" mutant sol reports is a restriction the original never had. Sol did not push back on a false P1; the brief told it what to find. Lesson recorded in memory (aggregate vs per-ray; read the code path before naming a cause).
REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.
PLAN r2 → astra r2 REJECT (saved review-plan-cohort-01-astra-r2.md): F1, F4 closed; F3 still open (astra ran the real planner: the base menu has two candidates not one, the selector key shape is wrong, and under sealed corners A keeps its shot by moving 25 ft to (8,3) so the mutated menu has three entries, not []); F2 partial (search must cover the whole 000–999 namespaces); F5 NEW (v2's ledger drops the five historical namespaces and the own-cohort handling); F6 NEW (membership silently became mandatory offense; 6203001 monsters 3/4 are Dash-only productive). The nine-candidate table verified correct under its stipulated responses. r3 = the final round (planner resumed; brief plan-cohort-01-r3.md; r2 archived).



===== D642 =====
## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.



===== D635 =====
## D635 — OWNER (2026-09-16 13:23): wall-seam ruling for VIS-FIELD — "ray running along an edge shared by two sight-blocking cells is blocked. (Recommended.)"
Owner picked option 1 of the three put to them (2026-09-16 13:23): a corner ray that runs exactly along a grid edge shared by two sight-blocking cells is BLOCKED; a graze along an edge that has a blocker on only one side stays clear (B3's edge-touch pins are untouched). Applied as a pre-B4 step on claude/vis-field: a production change in src/combat/cover.ts (the tracer's boundary-graze rule gains the shared-edge case) with a hand-authored test naming the two-room seam (ray (3,4)→(8,4) between wall (5,3) and door (5,4) is blocked; the same ray with (5,3) open stays clear), then B4 resumes as round 2 with the two-room / protocol-examples fixture bytes normalized under demonstrate-then-normalize (D569): old hashes shown from the pre-change module, only the fog/visibility fields differ, negative controls on unrelated fields.

## D617.47 — SUPERVISOR (2026-09-16 13:36): owner authorized the landing merge; main merged into claude/p-offer-help (1cacd8f0, 0 conflicts); cumulative landing gate launched
Owner: "I authorize git merge." The merge ran cleanly in the offers worktree (1cacd8f0 = 8d5f86fa + main 4a99570d; 0 conflict paths; the art/requests deletions are main's D628 untracking). Merged tip vs main: 127 files, 5384+/873−. Landing gate launched on the merged tip: gate-wt2.sh wt-p-offer-help (tsc -b --force, sg scan, full vitest, Playwright chromium on the pool port, log /home/vagrant/dnd-slim-runs/gate-wt-p-offer-help.log, exit file .tmp/runs/gate-offers-land.exit). Still to run on the same tip once the vis-field seam lane frees the box: check-command-outcomes, the offer-environment architecture self-test, the D630 timing pair (main 33.6 s, ceiling 42 s) and one arena round. Landing = "Land OFFERS …" merge commit into main after every gate is read.



exec
/bin/bash -lc "rg -a -n \"D635\\.5|D635\\.6|D635\\.7|B4|scene-snapshot\" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md | tail -120" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
534:F: B4 COMMITTED WITH A MUTATION CLAIM THAT HAD NOT YET HAPPENED
539:check and wrote it into the B4 lane commit message and the previous
541:real field (baseSizeFeet 20 -> 25): three B4 tests fail
550:B4 VERIFIED AND COMMITTED; C1 DISPATCHED (supervisor, 2026-09-03 01:00):
551:B4 (27 files +606/-49, new tests/unit/vtt/d466-b4-spell-payloads.test.ts).
555:fails the B4 test file, passes after restore proven by grep. Review:
556:Entangle already existed as a persistent area; B4 added the typed
568:confirmed from rendererAttribution. Candidate arm started 00:04:58. B4
571:B3 VERIFIED AND COMMITTED; B4 DISPATCHED (supervisor, 2026-09-02 23:50):
585:test, passes after restore proven by grep. Committed in the lane. B4
1277:increment (A1 6c807fce, A1.1 …, A2, B1–B4, C1–C2, D1–D2) is committed
1289:Consequences for B4: a monster caster's Calm Emotions is modeled as
1332:3. Placement: added to the D466 shift as increment B4 (spell payloads:
1334:   shifts once (D466). Supervisor flags the cost: B4 is the largest single
21592:## D586.155 — room D slice 2: Astra REJECT round 2 (B3 closed; B1, B2, B4 and the control inventory still open); lane resumed for the FINAL round 3 (2026-09-09 09:55)
21725:Closed: B3 (distributions), B4 (the plan's same-start Longbow control —
22617:## D617.12 — SUPERVISOR (2026-09-14 23:50): OFFERS-IMPL-S3-BUILDER B3 ACCEPTED by astra at r1 at 126e44ae (no blocking findings); coverage addendum for B16; B4 dispatched
22620:## D617.13 — SUPERVISOR (2026-09-15 01:05): OFFERS-IMPL-S3-BUILDER B4 ACCEPTED by astra at r1 at e17011e2 (no findings); B5 dispatched
22621:Astra r1: forward-compilation probe with 66 provider edits (B13/B14/B18 contractions + factory deletions) → 0 diagnostics in the ten B4 files (433 elsewhere in the uncontracted tree, 5 deliberate controls); the two changed assertions add the bound environment's queries to validateArenaPlan with matchers and refusal strings unchanged; seven golden lines byte-identical; 8/8 mutants at the report's shas. Cumulative branch: B1 0668fbda → B2 02fda9fc → B3 126e44ae → B4 e17011e2.
22624:B5 lineage: 0f5e3bea (REJECT r1: two forward-compatibility P1s — a scenario-menu caller without its environment, SIMULATED typed with the obsolete structural type; oracle integrity, the two plan-named mutants, merge preservation and scope all PASS) → df7a373b (ACCEPT r2: 66-edit contraction overlay 0 diagnostics in the group; identity assertion proven to reject a fresh same-binding object). Cumulative branch: B1 0668fbda → B2 02fda9fc → B3 126e44ae → B4 e17011e2 → B5 df7a373b.
22627:B6 lineage: 8d562480 (REJECT r1: the migrated multiattack fixture made both components unavailable, losing the "even one illegal component" boundary — astra's first-component shortcut mutant passed the migrated suite) → 423a7505 (ACCEPT r2: Brown Bear Bite + Claw with Dire Wolf swap, standalone Bite independently valid, the same mutant now 1 failed / 9 passed; statblock premises verified at wild-beasts.ts:47/:58). Cumulative branch: B1 0668fbda → B2 02fda9fc → B3 126e44ae → B4 e17011e2 → B5 df7a373b → B6 423a7505.
22630:B7 lineage: 9e032274 (REJECT r1: the query port's own suite kept the canonical import on a plan exemption that does not exist — plan :642) → 038b8b7f (ACCEPT r2: enforcement 0 diagnostics with path allowances, 31 matcher calls byte-identical, no self-comparison, AST identical apart from the substitutions). Cumulative branch: B1 0668fbda → B2 02fda9fc → B3 126e44ae → B4 e17011e2 → B5 df7a373b → B6 423a7505 → B7 038b8b7f.
22633:Astra r1: three assertion subjects changed (rider suite, literal toBe(true) retained); assertion counts before/after identical in all six audited suites; overlay 0 in the group (166 diagnostics remain outside); eight mutants at matching hashes plus two reviewer shortcuts killed; createEngineStateCapsuleForEnvironment is the plan-retained explicit factory (:132); the hand-built play capsule never reaches option resolution. Cumulative branch: B1 0668fbda → B2 02fda9fc → B3 126e44ae → B4 e17011e2 → B5 df7a373b → B6 423a7505 → B7 038b8b7f → B8 9ac0dbe1.
22667:Sol stopped BLOCKED (correct behaviour): after the B13 contractions, tsc node reports exactly one diagnostic — tests/unit/vtt/offer-environment-board-sequence.test.ts(30,39) TS2345, projectDmBoard called without the now-required offerEnvironment. All eight files restored to pristine shas; worktree clean (I checked: 0 dirty). Every other projectDmBoard caller in tests/src/tools (30+) already passes the environment (migrated B4–B12), so the omission is the B1-authored board-sequence suite, which the frozen plan's B13 manifest (:502-510) does not list even though :144 and :775 make that very suite carry the digest-conservation comparison. The plan's own rule (:486) is "A new caller found by the integrated compiler extends the manifest before signature contraction." Amendment (same class as D617.12/D617.20): B13's allowed files become the eight plus tests/unit/vtt/offer-environment-board-sequence.test.ts (9 ≤ 10). Constraints: the suite's existing assertions stay byte-identical; the migration passes the suite's already-built `environment` as offerEnvironment; the BOARD_DIFFERENT_POLICY digest-conservation comparison (plan :144/:775) is added here since B13 is the checkpoint that names that red. Plan file itself stays frozen at fa3c8016… (amendment recorded here, not in the file).
22689:Astra r3 (high): F1 sequencing closed (36/36 audited references; boundary walk B1→B3→B4→B5→B2→B6 sound at the source level); F2 cover/optical decoupling implementable with the unequal-cover corner fixture; F3 D569 demonstrate-then-normalize protocol correct against engine-server.ts:1968-2015 / engine-state-capsule.ts:750-814,924-938; darkness flip, pending/absent observers, compile-control label, nine audit-only files all closed. One BINDING P2 implementation note carried into every batch brief: the SIGHT_TRACER_HAS_SINGLE_OWNER architecture assertion must be stage-aware and call-path-specific — B1 checks the migrated field/detection paths only (engine-query-port.ts:795-800 still traces until B2); B2 extends it to query detection and actor knowledge; B6 to semantic projection/serialization; it enumerates visibility-field.ts, encounter.ts, visibility.ts, engine-query-port.ts, intel/actor-knowledge.ts, semantic-board-payload.ts, allows physical-cover callers (:1223, :1597), and must show actual- and virtual-observer aggregation reach the same internal evaluator (an import-only assertion is insufficient). Plan lineage: r1 fd99c5b4 (REJECT 3 P1) → r2 0d366664 (REJECT 1 P1) → r3 6e8b3237 (ACCEPT). Batches: B1 (10) → B3 (10) → B4 (9) → B5 (7) → [VIS-FIELD-OFFERS-REBASE] → B2 (10) → B6 (10); landing order offers → VIS-FIELD-01 → ACTOR-KNOWLEDGE-01. Implementer sol (the planning session, resumed), reviewer astra at MEDIUM per D627 for implementation batches. Assumption stated for the owner: the pending ordinary-darkness question keeps its plan default (target cell only); if the owner answers "opaque", §7's bounded flip (clause + inverse mutant + oracle rerun) is applied as an amendment to whichever batch is current.
22716:Rounds: r1 REJECT (F1 light obscurement bypass, F2 passive-Perception regression, F3 string-only Perception test) + supervisor F4 (pairwise field cost: replay+detection 33.6 s → 68.6 s, 53 retained timeouts); r2 fix closed F1/F3/F4 (astra: probes green, 16/16 pair-vs-field agreement incl. Large, four mutations killed), residual F2 (Keen Sight in the darkness fallback, pre-existing fixture pinned it) → D626.5 manifest +1; r3 fix closed it (base passive in darkness; fixture re-derived from processHide's >=; literal visible Keen Sight +5 test). Supervisor verification on d341a9fe: tsc 0/0; five suites 77/77; timing pair 36/36 in 33.4 s; tests/unit/combat + visibility consumers 2012/2012; own mutants killed across rounds: ORDINARY_DARKNESS_MADE_INTERVENING, TRUESIGHT_DEFEATS_FOG (×2), DEVILS_SIGHT_UNBOUNDED, SIGHT_BLOCKER_BECOMES_TOTAL_COVER, SENSE_MERGE_TAKES_FIRST, INNATE_SHORTENED_BY_EFFECT, TRUESIGHT_EXEMPT_FROM_LIGHT_OBSCUREMENT, PERCEPTION_PENALIZES_SEEN, KEEN_PLUS_FIVE_IN_DARKNESS. Findings against my own work this unit: hand-picked consumer sweep missed detection-reactions (recorded); fix-r1 brief dispatched without its rules block (killed and re-dispatched). Deferred nit (astra, nonblocking): rename passive_five_shift in detection-reactions.test.ts to describe its darkness/heavy-obscurement cases — take it in the first later batch whose manifest holds that file, else at landing. Execution order continues: B3 → B4 → B5 → [VIS-FIELD-OFFERS-REBASE after offers lands] → B2 → B6.
22725:Sol stopped correctly: B3 must import visibility-field from src/combat/visibility.ts, but SIGHT_TRACER_HAS_SINGLE_OWNER (visibility-field.test.ts:1223) still asserts visibility.ts does NOT import it — the test's own comment (:1227) names visibility.ts as "pending B3", i.e. the assertion was always meant to flip at B3 (D626.2 binding note: stage-aware), but the plan's B3 manifest (:194) omitted the test file. Amendment (plan :266 analogue): tests/unit/combat/visibility-field.test.ts joins B3 for exactly that stage-aware update (visibility.ts moves to the allowed importers; engine-query-port.ts/actor-knowledge.ts stay B2; semantic-board-payload.ts stays B6). Manifest = 10 files. Separately, sol's partial edits DELETED the persisted-byte-baseline pin in tests/unit/vtt/scene-snapshot.test.ts:227-231 (three hard-coded hashes) — a weakened assertion, refused: the foggedCells DECLARATION stays through B5 (:203) and supplying foggedCells in a fixture is not "consumption", so fixtures keep their inputs and every pin stays; if a pin's bytes genuinely change under the plan's required edit, that is a STOP-and-report, never a deletion or a repin from output.
22727:## D626.8 — SUPERVISOR (2026-09-15 19:03): VIS-FIELD B3 r2 BLOCKED by sol on the scene-snapshot byte-baseline pin (correct stop); ruling: the pin's inputs change BY PLAN, so it is normalized under demonstrate-then-normalize (D569), never deleted
22728:Sol restored the pin and the fixture inputs as D626.7 required and showed the pin red: tests/unit/vtt/scene-snapshot.test.ts:227-231 hashes the persisted pending request/coordinator bytes, which embed the player's projected visibleState; B3 makes projectPlayerView derive concealedCells from eligible fields instead of copying the authored fog list, so those bytes legitimately change (pendingRequestHash a0e19e… → fdaf87…, coordinatorHash 336fc5… → c31c02…, revisionChecksum 519a01… → 15ba35…). This is exactly the D569 case: a pin whose inputs the frozen plan changes. Ruling: (1) DEMONSTRATE — dump the persisted visibleState before (at d341a9fe) and after, and show the byte diff is exclusively the concealedCells field; hand-derive the new concealedCells set for that fixture from its eligible observers and geometry (state them) and show it equals the derived value; (2) NORMALIZE — update the three hashes, with a comment recording old → new, "B3 derived concealment (D626.8)", and the fixture's hand-derived concealed set; (3) no other pin in that file or elsewhere moves; if any other byte in the persisted request changed, STOP. The fixture inputs (foggedCells in regret/decision-program/scene-snapshot fixtures) stay as at HEAD.
22737:(1) DEFECT in B3 (fix r5): tests/unit/combat/visibility.test.ts — sol DELETED the D359 ledger-pinned control "omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell" (old :339); tests/unit/vtt/mutation-ledger.test.ts:375 pins that title as one of four restored controls with its killing check. The plan names no removal; COMMON RULES forbid deleting a test the plan does not name. Required: restore the control under its EXACT title with derived-fog geometry (an edge cell made unseen for every eligible observer by darkness/wall, its contents omitted, the adjacent visible boundary cell retained) so the ledger's killing check still kills. (2) INTERMEDIATE REDS owned by later batches, accepted as the plan's sequencing (B3 stops consumption; B4 removes the authored lists that fixtures still carry; B5/B6 migrate the semantic source): tests/unit/vtt/generated-encounter-fixtures.test.ts (B4 manifest), tests/unit/vtt/semantic-board-payload.test.ts ×2 (B5/B6 manifests: semantic source still copies authored fog while the DM board projection is derived), tests/unit/tools/ai-dm-screenshot-probe.test.ts "derives every fact class…" (plan :197 excludes the Q9 suite from B3's gate; tools/ai-dm-screenshot-probe.ts is B5's). (3) PLAN GAP → B4 manifest amendment +2 (plan :266 analogue): tests/unit/vtt/two-room-fixture.test.ts and tests/unit/vtt/handoff-examples.test.ts pin the two-room handoff fixture's projections and tracked scene bytes (fixtures/scenes/two-room.v1.json / two-room.snapshots.v1.json) whose authored foggedCells (src/vtt/handoff/fixtures/two-room.ts:112) B4 removes; they can only go green in B4 and belong to no manifest. Landing rule unchanged: every suite green at landing; the intermediate reds are listed by owner in the vis-field loop-log and re-checked after each batch.
22739:## D626.11 — SUPERVISOR (2026-09-15 19:52): VIS-FIELD-01 Batch 3 ACCEPTED at 78ee31b0 — astra r1 ACCEPT (medium, 7 mutations killed incl. three of its own; pin demonstration reproduced independently: old hashes from the pre-B3 module, only cells + concealedCells changed, concealed {(4,3)}, edge-touch rule clears the blocker rays); next B4 with the D626.10 manifest amendment (+2)
22740:Rounds: four BLOCKED stops (manifest gap D626.7; pin ruling D626.8; my mis-stated invariant D626.9; the deleted/renamed ledger control D626.10) and one fix round. Supervisor verification on 78ee31b0: tsc 0/0; 13 suites 214/214; timing pair 38.0 s (+13% over main, D630 ceiling 42 s); known intermediate reds exactly 7 (B4: generated-encounter-fixtures 1, two-room-fixture 2, handoff-examples 1; B5/B6: semantic-board-payload 2; B5: screenshot-probe fact-class 1); five own mutants killed. Astra noted, nonblocking: projectDmView creates a new state root, so a following board projection repeats equivalent geometry under a different state identity — within the per-state bound, but a candidate for the engine-cache work the owner may schedule (D630 brainstorm rank 6). B4 manifest = plan :206 ten files + tests/unit/vtt/two-room-fixture.test.ts + tests/unit/vtt/handoff-examples.test.ts (D626.10).
22805:Owner picked option 1 of the three put to them (2026-09-16 13:23): a corner ray that runs exactly along a grid edge shared by two sight-blocking cells is BLOCKED; a graze along an edge that has a blocker on only one side stays clear (B3's edge-touch pins are untouched). Applied as a pre-B4 step on claude/vis-field: a production change in src/combat/cover.ts (the tracer's boundary-graze rule gains the shared-edge case) with a hand-authored test naming the two-room seam (ray (3,4)→(8,4) between wall (5,3) and door (5,4) is blocked; the same ray with (5,3) open stays clear), then B4 resumes as round 2 with the two-room / protocol-examples fixture bytes normalized under demonstrate-then-normalize (D569): old hashes shown from the pre-change module, only the fog/visibility fields differ, negative controls on unrelated fields.
22814:Sol (fresh 01a0ab3f…, impl-seam-blocked-sol.md): shared-edge rule implemented in traceCornerLine via firstSharedEdgeBlockingCell (axis-aligned rays on integer grid lines; both flanking cells sight-blocking; lower row/column wins), optical only — cover tier aggregation reads line.tier only, so the seam cannot raise cover by construction; the total-cover-source shortcut was folded into sightBlockingAt (exclusions respected); five hand-authored tests; three mutants red→green (sol's runs). 19 suites 308/312. ATTRIBUTION BY ME (attrib-seam.log; cover.ts swapped to HEAD and restored, sha c8852c97… both ends, dirty=14 unchanged): WITH seam 4 reds (visibility-field LARGE_OBSERVER seen_dim→unseen; scene-snapshot "preserves full persisted request/coordinator bytes…"; dm-tactical-intel "reports both 90-foot Scout shots…" expected [] to equal [(8,1),…]; tactical-evaluator-r02 "renders target-specific non-nearest R02 rows…" reasons). WITHOUT seam: only the two new seam tests red plus scene-snapshot — so scene-snapshot is NOT the seam's (it is the partial-B4 producer edits; added to B4 r2's known reds) and the other three ARE the seam's. DISPOSITIONS: (1) LARGE_OBSERVER_USES_BEST_CELL: the fixture's "clear" ray (2,2)→(4,2) ran along the seam of a full-height fog column — the test leaned on the defect; RE-AUTHOR the geometry so the best footprint cell has a genuinely clear ray (stated in the comment with the cells it crosses) and the plan's BEST_FOOTPRINT_CORNER_IGNORED mutant still dies; no repin. (2)+(3) consumer pins: normalize under D569 ONLY with the geometry named (the ray and its two flanking blockers) and the new expected value hand-derived from that geometry with a negative control, OR re-author if the test's stated purpose needs that visibility; sol proposes per test, I verify the geometry myself before accepting. Fix r1 resumed on the seam session.
22819:## D635.2 — SUPERVISOR (2026-09-16 14:08): SEAM fix r1 harvested; geometry verified by me; committed 5492f782 on claude/vis-field (four files, by path); B4 r2 manifest +1
22820:Sol (resumed 01a0ab3f…, impl-seam-fix-r1-blocked-sol.md): LARGE_OBSERVER re-authored (target (4,3), fog (2,1)/(2,2) only; clear ray (2,0)→(5,3) through open (2,0),(3,1),(4,2)); the two R02 tests re-authored under option (b) — the intended straight 90-ft Scout shot (19,3)→(1,3) ran along row line 3 between blocked cells (10,2) and (10,3); (10,2) moved to (9,2) in the LOADED state (fixture json untouched) so the graze is one-sided; BEST_FOOTPRINT_CORNER_IGNORED red→green on a copy (sol's run). VERIFIED BY ME by hand: every ray from the (0,0)-only footprint (corners (0,0),(1,0),(0,1),(1,1)) to the four target corners of (4,3) enters fog (2,1) or (2,2), and of the full-footprint corners only (2,0)→(5,3) is clear (cells (2,0),(3,1),(4,2), none fog); nearest cell (1,1)→(4,3) is 15 ft = darkvision range → seen_dim; the seed-5117009 fixture has blockedCells (10,2) and (10,3) and no (9,2), scout at (19,3). Sol's BLOCKED reason (tsc node: tests/unit/vtt/regret.test.ts:39 reads foggedCells that the PARTIAL-B4 edit of reference-encounter.ts removed) is a B4 manifest gap, not the seam's: B4 r2 manifest gains tests/unit/vtt/regret.test.ts (+1, same rule as D626.10). Committed 5492f782 with only the four seam files (the 12 partial-B4 files stay uncommitted). My verification runs on a DETACHED throwaway checkout ../dnd-wt-seam-verify at 5492f782 (node_modules symlinked; no B4 dirt): tsc app/node, my own mutants (seam rule removed; either-side; a probe), the 19 suites, the timing pair (box loaded — will be remeasured). Astra review of the seam commit at medium after that; B4 r2 after.
22822:## D635.3 — SUPERVISOR (2026-09-16 14:25): FINDING AGAINST MY OWN ATTRIBUTION in D635.1/D635.2 — scene-snapshot IS the seam's (as well as B4's); ruling: normalize under D569 in seam fix r2; B4 r2 manifest +2
22823:On the DETACHED clean checkout: scene-snapshot.test.ts 8/8 at 78ee31b0 and 7/8 at 5492f782 (attrib-scene.log), so the seam commit changes it. My D635.1 attribution ("scene-snapshot is NOT the seam's") was drawn from the DIRTY worktree, where the same test is red for a second, independent reason (the partial-B4 producer edit removed referenceEncounterSetup().foggedCells, which the test asserts at :227); a test red in both arms of an A/B proves nothing about the variable, and I wrote a conclusion anyway. Recorded at full length. GEOMETRY (verified by me from the test fixture at scene-snapshot.test.ts:35-56 and reference-encounter.ts:113-126): fighter (2,3); the test adds an Oak Door at (6,3) and a Stone Wall at (6,4), both lineOfSight-blocking; the test's own comment names "(3,4)->(8,4)" as a clear ray that "graze[s] no blocker interior" — that ray runs along row line 4, the edge shared by the door (6,3) and the wall (6,4): exactly the two-room seam. Under D635 it is blocked, every other ray from the fighter to (7,4),(8,4),(9,4) enters the door or the wall, so those three cells are now concealed: received {(4,3),(7,4),(8,4),(9,4)} vs pinned {(4,3)}; (7,3)/(8,3) stay visible because row line 3 has the door on one side only. LEGITIMATE under the owner's rule. RULING: seam fix r2 (sol, resumed): normalize scene-snapshot.test.ts:215-243 under D569 exactly as B3 did (D626.8/D626.9): concealed set hand-derived with the ray geometry in the comment; the pre-seam hashes kept in the comment as the demonstration; the demonstration that ONLY concealedCells (and the fields that hash it) differ; new hashes recorded; negative control retained. Proof on a CLEAN copy of 5492f782 (the worktree's B4 dirt keeps the foggedCells assertion red there — that red is B4's). B4 r2 manifest gains tests/unit/vtt/regret.test.ts AND tests/unit/vtt/scene-snapshot.test.ts (+2; the plan's §5 "not repinned" line for scene-snapshot is amended by D635 — the seam changes the pinned input by ruling, the same case as D626.8).
22832:verify-seam-r2.log (detached checkout at 5492f782 + sol's test): scene-snapshot 8/8 with the seam cover.ts (sha c8852c97…), 1 failed / 7 passed with the pre-seam cover.ts (f1a89e61…) — the new pin is not satisfiable by the old module; restored; tsc node 0 on the clean tree; 19 suites 311/312 with the one red a 5.045 s timeout of room-generator-los-cover "retains a productive first-turn option…" while the planner lane loaded the box (rerun isolated: see rerun-timeout.log). Sol's field-level diff claim (concealedCells and its carriers only) is for astra to reproduce; my hand check of the ray groups in the comment: every row-3-corner ray to (c,4) enters the door at y∈(3.75,4) for x∈(6,7); every ray to (c,5) enters the wall; row-4-corner rays to (c,4) are the seam; (7,3)/(8,3) keep the one-sided row-line-3 rays. Committed by path (the 12 partial-B4 files remain uncommitted). ../dnd-wt-seam-verify moved to 9a3235da (clean). Astra (resume 01a0a642…, medium; brief review-seam-astra.md; log review-seam-astra.log) reviews the 5-file diff 78ee31b0..9a3235da, with the exclusions-respecting sightBlockingAt flagged as a possible unruled behaviour change (check 3). B4 r2 follows an ACCEPT, with manifest +2 (regret, scene-snapshot).
22834:## D635.5 — SUPERVISOR (2026-09-16 15:08): SEAM ACCEPTED by astra (medium; 4/4 mutants killed incl. its own; D569 demonstration reproduced independently); two P3 corrections to MY records; A/B timing; B4 r2 ruling (tracked fixtures, manifest 17)
22835:Astra r1 (review-seam-astra-r1.md, 868 k tokens): rule fidelity probed with 16 in-memory endpoint/axis assertions (source-adjacent unit edge included, target-touching edge excluded, reverse/vertical/zero-length/diagonal handled; fractional endpoints unreachable — outerCorners only); optical-only proven (its own tier-raising mutant killed by PHYSICAL_COVER_UNCHANGED_BY_SEAM); my check (3) does NOT reproduce — source/target cells were already removed from candidates before both the optical and the total-cover checks (pre-seam cover.ts:474-477 vs :507-518), seven-assertion probe identical on both implementations; all six scene-snapshot hashes reproduced from in-memory old/new modules; R02 fixture json byte-identical (sha b679f113…); five files 226+/25−; tsc 0/0. CORRECTIONS TO MY RECORD (accepted): SEAM-F1 — D635.2 said (2,0)→(5,3) is the ONLY clear full-footprint ray; there are TWO, the other is (0,2)→(4,4), which touches fog corner (2,3) without entering a fog cell (0/16 clear from the (0,0) footprint, 2/16 from the full one; the test comment never claimed uniqueness). SEAM-F2 — D635.3/D635.4 said only concealedCells and its carriers differ; the complementary visible `cells` array differs too (that is what D626.9 already permits). A/B TIMING (ab-los-cover.log, throwaway checkout, back-to-back A1/B1/A2/B2): room-generator-los-cover 111/111 in 96.0 / 98.4 / 92.3 / 96.4 s — the seam costs ≈3–4 s on ≈94 s (+4%); the single 5 s-budget test sits at 4.76 s (old) vs 4.98 s (seam) isolated in astra's run and 5.18 s in mine under load: a pre-existing narrow margin (decisions.md:20827, 21339), not a seam regression; within D630. claude/vis-field = 9a3235da. B4 r2 RULING: manifest = the 12 (plan :206 + D626.10) + tests/unit/vtt/regret.test.ts + tests/unit/vtt/scene-snapshot.test.ts (D635.3) + the tracked generated fixtures fixtures/scenes/two-room.v1.json, fixtures/scenes/two-room.snapshots.v1.json (if present) and fixtures/protocol/examples.v1.json — 17 files, over the plan's ten because every excess file is a test or a generated fixture forced by rulings; the tracked bytes are regenerated by the real generator (tools/vtt-handoff/generate-fixtures.ts) under D569 demonstrate-then-normalize: the old bytes must reproduce from the pre-B4 producers first, the field-level diff must be limited to the removed foggedCells and the derived visibility/concealment fields, and the two-room protocol example's player snapshots must match a HAND derivation under D635 (adventurer (2,4) and goblin (8,4): every ray crosses column 5; the row-line-4 ray between wall (5,3) and door (5,4) and the row-line-5 ray between door (5,4) and wall (5,5) are two-blocker seams — the pair is NOT mutually visible; state every ray). Dispatch after the offers vitest rerun (quiet box) — the brief is written now.
22843:## D635.6 — SUPERVISOR (2026-09-16 15:36): VIS-FIELD B4 round 2 dispatched (fresh sol, brief impl-vis-field-b4-r2.md, log impl-b4-r2.log) on claude/vis-field @ 9a3235da with the 12 partial edits in place and the RESUME NOTE; manifest 17 per D635.5.
22848:## D635.7 — SUPERVISOR (2026-09-16 15:54): B4 r2 BLOCKED (correct stop); FINDING AGAINST MY D635.5 STEP 1; a seat-visibility contradiction found by me; B4 r3 = read-only investigation
22849:Sol (fresh 01a0abb8…, impl-b4-r2-blocked-sol.md): on a clean archive of HEAD 9a3235da the real generator (vite-node tools/vtt-handoff/generate-fixtures.ts --check) reports FIXTURE_OUT_OF_DATE for fixtures/scenes/two-room.snapshots.v1.json (3c2b7623… → 76f102c4…, eight field paths: players[0].snapshot.{props,vision.explored,vision.visible}, players[1].snapshot.{lights,props,tokens,vision.explored,vision.visible}); two-room.v1.json reproduces; handoff-examples "proves real service behavior…" is red at clean HEAD because player A's regenerated snapshot contains the goblin token. No edits made. MY ERROR: D635.5 step 1 demanded that the old tracked bytes reproduce from the pre-B4 producers; they were last regenerated on 2026-09-10 (5c7f459b, 75fbf004), BEFORE VIS-FIELD B1 replaced the pairwise sight internals and B3 derived seat fog — the D626.10 known reds in handoff-examples / two-room-fixture were exactly this staleness, owned by B4. The demonstration base is therefore the VIS-FIELD branch base (main 75c2f44a), not HEAD. CONTRADICTION FOUND BY ME (two-room-diag on the clean seam checkout): traceCombatantLine adventurer→goblin and goblin→adventurer are BOTH blocksSight=true at 9a3235da (row-line-4 rays flagged at (5,3) by the seam rule; the row-5 rays enter the door (5,4)); by plan §3.3 seat token visibility uses detectCombatant (seen iff any footprint cell is seen|seen_dim by an eligible owned observer), so seat A must NOT list the goblin — yet the regenerated snapshot at the same HEAD lists it. Either the handoff snapshot's token rule is not §3.3's, or B3's seat scope admits an observer it should not, or the light region matters in a way the trace does not model. RULING: B4 r3 is a READ-ONLY INVESTIGATION (resumed r2 session): (1) regenerate on a clean archive of 75c2f44a and confirm the tracked bytes reproduce there (else name the true base); (2) trace the exact code path by which player A's regenerated snapshot at 9a3235da acquires the goblin token (file:line from tools/vtt-handoff/generate-fixtures.ts through the seat projection to the visibility call), and state which observer/field/rule admits it; (3) say whether that path is the plan's §3.3 rule, a B3 defect, or a snapshot rule the plan never covered; (4) hand-derive seat A's and seat B's visible cells / tokens under §3.3 with the ray evidence; NO edits. I rule on B4 after that; the tracked-fixture protocol (D635.5) is restated with base 75c2f44a and the eight-path allowance only for visibility-derived fields.
22851:## D635.8 — SUPERVISOR (2026-09-16 16:06): B4 investigation harvested — MY "contradiction" in D635.7 was a misreading; §3.3 is applied correctly; base 75c2f44a reproduces; B4 r4 (implementation) ruled and dispatched
22852:Sol (impl-b4-r3-investigation-sol.md): (1) all three tracked fixtures reproduce byte-for-byte from an in-memory bundle of 75c2f44a's producers (6c481b2b…, 3c2b7623…, 9fc9a587… equal=true) — the D569 demonstration base is 75c2f44a. (2) Code path traced generate-fixtures.ts:17 → two-room.ts:151-160 projectPlayerBoard(projectPlayerView(state, binding)) → visibility.ts:558-594 (seat-scoped eligible observers, non-owned combatants kept only if some observer canCombatantSee) → encounter.ts:2229-2234 → sightToCreature → visibility-field.ts:295-336 → projections/board/scene-snapshot serialize only the filtered tokens. (3) FINDING AGAINST MY D635.7: the regenerated STATIC snapshot at 9a3235da lists ONLY the owned token for each seat (seat A: adventurer, visible 48 / concealed 48; seat B: goblin, 56/40) — exactly what my trace predicted. The goblin-in-seat-A observation came from the DYNAMIC protocol transcript: tests/unit/vtt/handoff-examples.test.ts:316-318 OPENS the door (canonical opening sets lineOfSight:false, dm-encounter-host.ts:319-322), after which seat A legitimately sees the goblin straight down row 4 (field (8,4) seen; visible 76 / concealed 20); the test's :405-407 assertion that EVERY player-A event lists only the adventurer is an authored-fog-era expectation that B4 must re-author by hand. There is no B3 defect and no uncovered snapshot rule. (4) Hand derivation accepted: closed door — all 16 A→G rays blocked (row-line-4 seam wall (5,3)/door (5,4); row-line-5 seam door (5,4)/wall (5,5); the eight diagonals enter the door), symmetric for G→A; the map is bright outside the torch region (world-objects.ts:230-239), darkvision irrelevant; column 5 visible to both sides as target cells. (5) Every one of the eight changed snapshot paths is visibility-derived (props/lights filtered by visible footprints; tokens by canCombatantSee; vision.visible/explored from the owned field). RULING for B4 r4 (implementation, resumed session, workspace-write): D635.5 stands with base 75c2f44a; the regenerated tracked bytes may differ from 75c2f44a's ONLY in the removed authored fog and in visibility-derived fields (the eight snapshot paths; and in examples.v1.json the player events' tokens/vision/props/lights after the door opens); handoff-examples :405-407 and the two-room-fixture seat pins are re-authored from the hand derivation above (closed: own token only; open: both, with the row-4 doorway ray named); manifest 17 unchanged.
22854:## D635.9 — SUPERVISOR (2026-09-16 16:22): B4 r4 BLOCKED on my stop condition (scene-snapshot revision checksum changes when authored fog leaves the reference setup) — ruled: that change IS B4, normalize under D569 with the field diff proven; r5 dispatched
22855:Sol (impl-b4-r4-blocked-sol.md): base 75c2f44a reconfirmed by the real generator (--check exit 0, three shas identical); scene-snapshot's authored-fog assertion replaced by the derived DM fog pin [(4,3)] (hand-derived: 70 cells, three observers reveal 69); then "preserves full persisted request/coordinator bytes and the actual revision checksum" fails ONLY on revisionChecksum (cd99e1c8… → df6f2cce…); pendingRequestHash and coordinatorHash unchanged. Reading: the persisted revision body embeds the encounter STATE, whose authored foggedCells [(8,1),(8,2)] B4 removes by plan; the request/coordinator payloads do not embed the state's fog and stay put — exactly the shape B4 predicts. The plan's §5 line "scene snapshot pins are not repinned" cannot hold for this fixture once its authored fog is deleted; D569 applies (as D626.8 ruled for B3). RULING: normalize revisionChecksum ONLY after demonstrating that the canonical-JSON field diff of the revision body between the pre-B4 tree (HEAD 9a3235da) and the B4 tree is limited to the state's foggedCells (removed key or derived list — state which); keep the old checksum in the comment as pre-B4; pendingRequest/coordinator hashes must NOT change (hard stop if they do); negative control retained. Everything else in the r2/r4 briefs stands. r5 on the resumed session.
22861:Astra r3 (review-plan-r3-astra.md, 467 k tokens): every r2 finding closed (traversal chain owned; distance endpoints introduced in B6A0 before consumers; the D630 harness is the existing arena test at main ai-dm-arena.test.ts:1709-1755 with per_combatant / initiative_segments_v1 / derived_v1 reaching real reducer transactions; Q1 bounded with empty-set outcomes; D569 primer bound to the DM screenshot; three P2s closed) — two P1s remain, both manifest closure: (1) the traversal overlay union is 90 paths across the three trees, not 89 — claude/p-offer-help:tests/unit/vtt/offer-environment-board-sequence.test.ts:33 reads resolution.mechanics.path and is unowned, so B7A9 cannot end green on the landed base; fix = add it to B7A9 (four files today) and migrate its movement assertion keeping the environment-digest controls; (2) three existing test consumers pass raw CreatureSpace to the distance functions and are outside the distance tranche — tests/unit/combat/creature-space.test.ts:182-215, tests/unit/vtt/footprint-increment-four.test.ts:390(392 on OFFERS), tests/unit/vtt/challenge-room-fixtures.test.ts:294(308) — 8 TS2345 diagnostics; fix = own them inside B6A0–B6A3 with a split to keep ten files. Astra also states a lane cannot execute B0→B5C from this text alone because B1 waits on Q1 (and Q2 shapes B1's model, Q3 shapes B4's assertions) — which is by design: those are owner questions. RULING: the three-round cap is reached; the plan is NOT frozen. It is HELD at sha 7c2cc7ce… pending the owner's answers to Q1 (forced landing: A bounded DM selection with off-board unresolved on an empty set, or B bounded deterministic nearest with removal on an empty set; displacement bound min(fall distance, 30 ft)), Q2 (water: A deep/mandatory swim, B shallow/selectable, C authored shallow|deep — recommended C) and Q3 (player-visible elevation facts: A board labels — recommended, B tier cues only, C none). The answers produce one bounded revision round (r4: incorporate the answers + astra's two manifest fixes, nothing else) and one astra confirmation; implementation remains sequenced after VIS-FIELD-01 lands. Questions go to the owner one at a time; Q1 (amended with the empty-set outcomes) is being asked now.
22863:## D635.10 — SUPERVISOR (2026-09-16 16:37): B4 r5 BLOCKED (correct, on my hard stop) — branchRngStateFingerprint is a DERIVED digest of the mechanical state that still contains foggedCells; allowance widened to it; r6 dispatched
22864:Sol (impl-b4-r5-blocked-sol.md): persisted revision body diff HEAD 9a3235da → B4: $.encounterState.foggedCells [(8,1),(8,2)] → [] (key retained empty, per the B4/B5 split) AND $.branchRngStateFingerprint 8651c928… → 163cf200…; pendingRequestHash and coordinatorHash byte-identical. VERIFIED BY ME: src/vtt/session-persistence.ts:1099-1101 defines branchRngStateFingerprint(encounterState) = sha256(canonicalJson(mechanicalBranchState(encounterState))) — "digest of the persisted, mechanically relevant encounter representation" (:298) — and it changed exactly because the mechanical state's foggedCells changed; deriveBranchRng (:1103-1112) seeds branch RNGs from it, so branch seeds move whenever the fog field moves — an existing property of the design that B5's field deletion will move once more. RULING: the permitted field diff for the scene-snapshot revision body is encounterState.foggedCells AND branchRngStateFingerprint (the latter must be shown equal to sha256(canonicalJson(mechanicalBranchState(B4 state))) — i.e. recomputed, not copied); everything else in D635.9 stands (request/coordinator hashes byte-identical; old checksum kept as pre-B4; negative control). r6 on the resumed session.
22869:## D635.11 — SUPERVISOR (2026-09-16 17:11): VIS-FIELD B4 verified by me and COMMITTED 2e360685 on claude/vis-field; astra medium review dispatched on the detached clean checkout
22870:Sol r6 (impl-b4-sol.md, 467 k tokens across six rounds — four correct stops on my rulings, one investigation): 17 files 267+/4868−; base 75c2f44a reproduces the three tracked fixtures (generator --check 0); regenerated hashes 26e0ddf5… / 76f102c4… / 70cb1ece…; sol's path checker: source 1, snapshot 8, protocol 45 paths, unexpected none; closed-door seat oracle pinned with the 16 rays enumerated (A 48 visible / [adventurer]; B 56 / [goblin]); open-door pin via A's (4,4)→(8,4) row-4 ray (wall (5,3) one flank, open doorway the other); revision-body diff exactly {encounterState.foggedCells, branchRngStateFingerprint}, fingerprint recomputed equal; RED-first 2 failed / 2 passed / 48 skipped; three plan mutants killed with sha-restored files; sol: 124/124 + 276/276, pair 37.96→39.24 s. VERIFIED BY ME (verify-b4.log, dirty tree before commit): tsc app/node 0/0; generator --check 0; 0 forbidden additions; 0 long lines; my REFERENCE_DARK_CELL_REVEALED and VANE_DIM_TREATED_UNSEEN both RED then restored (sha 3d867ad5…, 5b55684b…); 20 suites 399/400 — the one red is room-generator-los-cover's 5.004 s timeout (the known narrow margin, D635.5; isolated rerun on the clean checkout at 2e360685 in progress, rerun-b4-los.log); deferred reds exactly semantic-board-payload ×2 + screenshot-probe fact-class (B5/B6) plus the screenshot D524 5.6 s timeout that sol reproduced at clean 9a3235da (5.38 s); timing pair 36/36 in 41 s wall on a box at load ~1 (ceiling 42 s; main 33.6 s; B4 touches no engine cost path — the drift since the seam's 40 s is load; to be remeasured quiet before landing). My own JSON field diff HEAD→B4: two-room.v1.json foggedCells only; the other two files differ only under players / events / exchanges (coarse list compare; astra reproduces the path-level claim). handoff-examples diff read by me: the event partition (before open / at open / after close) and the ray reasoning are sound; the writeFileSync I flagged in the lane log is pre-existing temp-copy code, not a write to the tracked file. Committed 2e360685 (all 17 files). Astra (resume 01a0a642…, medium; brief review-impl-b4-astra.md; log review-b4-astra-r1.log) on ../dnd-wt-seam-verify moved to 2e360685. Next after ACCEPT: B5 (plan :216-227), then the rebase step (main now carries OFFERS 9f148666), then B2, B6.
22872:## D635.12 — SUPERVISOR (2026-09-16 17:22): VIS-FIELD B4 ACCEPTED at 2e360685 — astra's single P1 (eight protocol exchange-response paths outside the literal allowance) closed by ruling after my own equality check; B5 dispatched
22873:Astra r1 (review-impl-b4-astra-r1.md, 1.05 M tokens): exactly 17 files; every removed authored list named with pre-B4 lines; 42 remaining foggedCells references in 12 files each assigned to B2/B5/B6 or retained projection I/O (the V1 decoder does not yet discard fog — B2, correct); both hand oracles recomputed independently (reference 69/1 via the blocker-edge rays; Vane 140/0 by a constructive proof from the PC at (1,4); zero failed witnesses); the three fixtures regenerate byte-identically at 75c2f44a AND at 2e360685 from in-memory bundles; revision-body diff = {encounterState.foggedCells, branchRngStateFingerprint} with the fingerprint recomputed (8651c928… → 163cf200…); three runtime mutants killed incl. its own (schema/package regaining layout.fog.cells); the compile control's single TS2339 pasted; 20 suites 393/400 with five sandbox /tmp refusals and two los-cover timeouts green isolated; pair 40.1 s. ITS ONE P1: examples.v1.json's exchanges[4]/[5] (the scene.snapshot responses player-a.snapshot / player-b.snapshot) changed in eight visibility-derived paths (A: props, vision.explored, vision.visible; B: lights, props, tokens, vision.explored, vision.visible), which D635.8's wording ("the player EVENTS' tokens/vision/props/lights") did not name; astra: "mechanically justified — each response equals its seat's initial streamed snapshot exactly"; asked for a narrowly scoped ruling rather than a code change. VERIFIED BY ME: in the regenerated file the props/vision/tokens/lights of exchanges[4].response.result equal those of events['player:adventurer'][0].data, and exchanges[5]'s equal events['player:goblin'][0].data (True/True). RULING: the D635.8 allowance is amended to include the scene.snapshot exchange responses' visibility-derived fields (they ARE the seats' initial snapshots); no other path changed (astra: 45 protocol paths = 37 event + 8 response, none else). B4-F1 closed by ruling; no artifact change, so no further astra round. B4 ACCEPTED at 2e360685. Isolated los-cover rerun on the clean checkout at 2e360685: 111/111 in 101.5 s (rerun-b4-los.log). Next: B5 (plan :216-227, 7 files) — dispatched now; then the REBASE step (plan order 1 → 3 → 4 → 5 → rebase → 2 → 6; main now carries OFFERS 9f148666), then B2, B6.
22891:Astra r1 (review-impl-b5-astra-r1.md): 13 files 86+/41−, zero src changes; the screenshot test's only changes are the fog input and the fact-class oracle, D524 bytes identical; DmView substitutions byte-identical downstream; its own overlay: app 10 / node 13 diagnostics, 0 outside B2/B6; FOG_STILL_AUTHORED killed by both titles; the D359 ledger control still discriminating (its own leak mutant red at visibility.test.ts:562); fact-class oracle recomputed independently (22 visible / 2 concealed); semantic 6/8 exactly the two B6 titles; tsc 0/0; pair 39.3 s. B5-F1 (P3, nonblocking, ACCEPTED AS A NOTE): BLIND_BOARD_CHECK_USES_DM_PROJECTION is a source-text proxy — it rejects harmless renames and accepted a `true ||` short-circuit; astra recommends a TypeScript-AST check plus a small behavioural test; carried to B6 (which owns the semantic/blind boundary tests) or a post-landing nit, not a B5 blocker (the named mutant dies and the compile boundary is proven by the overlay). VIS-FIELD branch = 436702cf: B1, B3, SEAM, B4, B5 accepted. NEXT (plan order): the rebase step — merge main 9f148666 (OFFERS landed) into claude/vis-field, then verify tsc ×2 + the retained set + the timing pair on the merged tip (D630 ceiling applies against the post-OFFERS main pair, to be measured), then B2 (:180-190, "post-offers consolidation and final runtime-field removal"), then B6.
22914:Astra r2 (review-rebase-astra-r2.md): in-memory run of the three fixture helpers — hard 5/0, brutal-2 10/0, brutal-3 12/0 opened/closed, zero disagreements with r1 across 54 pairs; all 27 t-ranges recomputed with Fraction, zero mismatches; its own mutant (a tracer that opens one more brutal-2 pair only after the edit) killed at :216 (11 vs 10); sourceAnchor applied to both before and after states; closed-set assertion real; no assertion removed; tsc node 0; no production change. Scope note accepted: these are pair-delta pins, not exhaustive ray pins. P3s (carried, comment-only): REBASE-F2 two representative rays in the comments start outside the named creature's footprint — :277 monster-3 occupies (15..16,3..4) so use (15,5)->(1,3) crossing (8,4) for 3/7<t<1/2; :314 monster-6 occupies (9..10,5..6) so use (9,7)->(3,5) crossing (6,6) for 1/3<t<1/2 (astra verified both replacements); REBASE-F3 sol's report said seven valid goblin relocations, there are six ((9,6) and (10,6) overlap the Large Warhorse Skeleton) — the exhaustion argument stands (astra's probe: all eight neighbouring anchors blocked to all three players). vis-field = ec922c37 = B1, B3, SEAM, B4, B5 + main (OFFERS) + reconciliation. NEXT: B2 (plan :180-190, 10 files) with a comment-only allowance for tests/unit/tools/ai-dm-conversation.test.ts:277,:314 (REBASE-F2); then B6; then the landing gate.
22922:Sol (impl-b2-r2-blocked-sol.md): generated schema diff exactly the three devils_sight additions (57+/0-); B2 suites 50/50; tsc 0/0; OFFERS checks 0/0; semantic 7/8 (the canonical-DM-board-equality red is now GREEN, only M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION stays for B6); all five plan mutants killed with sha-restored files. MUTANT INTEGRITY VERIFIED BY ME: the lane log's closing diff dump showed the mutant bodies (devils_sight removed, codec validation removed, a local detect() wrapper, a fog veto in actor-knowledge) — a snapshot artifact; the worktree files' shas are sol's baselines (1298613c…, ddc0e2fc…, beff0581…, 0c592f65…) and the grep signatures are clean. FOUR CONFLICTS, all real: (A) engine-state-capsule.test.ts:544 forbids any capsule/MCP-runtime import chain reaching combat/random.ts (RNG authority); the plan's B2 replaces the query port's local detect() ladder with detectCombatant, which lives in src/combat/encounter.ts, which imports ./random — so the consolidation the plan demands violates the capsule-purity rule. detectCombatant itself is RNG-free (sightToCreature + hidden/invisible/blinded/tremorsense/web facts, verified by reading encounter.ts:2175-2220). (B) room-generator-los-cover.test.ts:271 and two-room-fixture.test.ts:87 compare RAW generated bytes to frozen/tracked bytes; fresh encoding now omits the key while the frozen V1 inputs must stay byte-identical (plan :247: "only real-decoder equality proves fog is discarded"). (C) scene-snapshot's persisted revision checksum and branchRngStateFingerprint move again (the key leaves the persisted state) — the same D569 case as D635.9/D635.10. (D) visibility-field.test.ts:1303 SIGHT_TRACER_HAS_SINGLE_OWNER is a STAGED boundary test whose own comment says "Pending: engine-query-port.ts and actor-knowledge.ts in B2; semantic-board-payload.ts in B6"; B2's semantic state-source cleanup imported visibility-field directly, which that test reserves for B6. RULING: (A) the canonical detector moves to src/combat/visibility-field.ts (plan §3.1: the one truth is that module; it is state-only and RNG-free) — detectCombatant's body relocates verbatim; encounter.ts re-exports it so no caller churns; engine-query-port.ts imports it from visibility-field.ts (a runtime import that reaches no RNG module); the capsule import-graph test is NOT touched and must pass; sol proves the moved body has no RNG dependency (any such dependency = STOP). (B) the two tests' raw-byte assertions become real-decoder equality (decode the frozen/tracked text with the real V1 decoder and compare canonical states) per plan :247; the los-cover frozen fixtures stay byte-identical; two-room.v1.json is a GENERATED tracked fixture and is regenerated by the real generator under the D635.5 protocol with the diff limited to the removal of the empty foggedCells key (snapshots/examples only if the generator changes them, same limit). (C) normalize scene-snapshot's checksum + fingerprint with the demonstration (diff exactly {encounterState.foggedCells removed, branchRngStateFingerprint recomputed}; request/coordinator hashes unchanged). (D) semantic-board-payload.ts reads derived fog through the DM projection (projectDmView / the board projection), not a direct visibility-field import; the staged test is updated for the B2 stage per its own comment (detection path now sliced from visibility-field.ts; engine-query-port no local ladder; semantic still forbidden). MANIFEST +6 (18): src/combat/visibility-field.ts, tests/unit/combat/visibility-field.test.ts, tests/unit/vtt/room-generator-los-cover.test.ts, tests/unit/vtt/two-room-fixture.test.ts, fixtures/scenes/two-room.v1.json (+ two-room.snapshots.v1.json / examples.v1.json only if regenerated), tests/unit/vtt/scene-snapshot.test.ts. r3 on the resumed session.
22928:Sol (impl-b2-sol.md): all four D635.25 rulings applied — detectCombatant relocated verbatim to visibility-field.ts (state-only: sight evaluation, combat rules/conditions, spaces/distance, affected cells, terrain walls, domain types; no path to combat/random.ts), encounter.ts re-exports, the query port imports it from visibility-field and keeps no ladder (the AST witness now checks the visibility-field import); decoder-equality assertions in los-cover (:271 → the frozen text still contains the legacy key and decodes equal) and two-room (tracked source has no key; decoded state equals the generated one); two-room.v1.json regenerated by the real generator with exactly the empty-key removal (+0/−1), snapshots/examples byte-identical; scene-snapshot normalized again (revision df6f2cce… → 35c96ecc…, fingerprint 163cf200… → dd802783…, request/coordinator hashes unchanged, old values in the comment); semantic-board-payload reads fog via projectDmView; SIGHT_TRACER_HAS_SINGLE_OWNER updated to the Batch 2 stage; content-pack schema regenerated (+57/−0, three devils_sight additions); RED-first 41/8; all five mutants killed with fresh shas and cp-restored; tsc 0/0; OFFERS checks 0/0; pair 39.1 s; B2 suites 50/50; capsule graph 11/11; los-cover 111/111; 29 other core files 476/476; semantic 7/8 (only M576-E3 stays, B6); OFFERS set green EXCEPT engine-mcp-handler "validates emitted adjustment_delta_truncated_board against the handler output schema": expected dropped classes ["light"], received ["light","adjacency","objects"] — the calibration board's semantic bytes grew 7,817 → 9,322 (cap SEMANTIC_BOARD_MAX_BYTES 8,192) because the semantic source now carries the DM-derived fog (106 cells; the fixture had 0 authored fog). All OFFERS digest/identity pins unchanged. RULING: that pin is B6's by plan text — B6 (:228-240) owns "truncation ordering/class/cap is explicit" and tests/unit/tools/engine-mcp-handler.test.ts is in B6's manifest (:230); the red is added to the known intermediate reds (now: semantic-board-payload M576-E3, engine-mcp-handler truncated-board calibration — both B6). B2 is otherwise complete; my verification runs now, then astra at medium.
22931:VERIFIED BY ME (verify-b2.log, dirty tree, 18 files 499+/238-): tsc app/node 0/0; check-offer-environment-architecture 0 and check-command-outcomes 0; 0 forbidden additions, 0 long lines; foggedCells gone from encounter.ts (0 references), the codec's 7 references are the validate-and-discard migration, visibility.ts's 4 are the derived projection output; visibility-field.ts imports no random module; tests/fixtures diff empty (84 legacy fixtures + frozen V1 hashes untouched); two-room.v1.json diff exactly one deleted line; content-pack schema 57+/0- with three substantive lines (the devils_sight consts); MY MUTANTS: V1_FOG_NOT_VALIDATED (unique() dropped) → MALFORMED_LEGACY_FOG_REJECTED duplicate case RED, restored 0c592f65…; ENGINE_QUERY_LOCATED_AS_SEEN (visible = kind !== 'undetected') → the canonical-detector matrix RED, restored c0155868…; 16 suites (B2 three + visibility-field, engine-state-capsule, scene-snapshot, two-room-fixture, room-roster-preflight, session-persistence, the three offer-environment suites, visibility, encounter-projections, mutation-ledger, challenge-room-fixtures) 267/267; the deferred reds exactly two (M576-E3 semantic partition; engine-mcp-handler truncated-board calibration), 135 passed around them; timing pair 36/36 in 39 s. Committed dcca84fd. vis-field = ec922c37 → dcca84fd (B1, B3, SEAM, B4, B5, rebase, B2). Astra (resume 01a0a642…, medium; brief review-impl-b2-astra.md; log review-b2-astra-r1.log) on the detached checkout at dcca84fd with twelve checks incl. the verbatim detector relocation, the import-graph walk, the AST witness, the D569 demonstrations and the B6 attribution of the truncation pin. Next after ACCEPT: B6 (plan :228-240) — the last batch — then the VIS-FIELD landing gate.
22940:Astra r2 (review-impl-b2-astra-r2.md): 3 files 37+/4−; exactly three maxItems 5→6 changes, in-memory generation byte-identical; the six-kind literal asserts zero diagnostics and exact imported + runtime senses; its own .max(6)→.max(5) mutant red at :174; unknown-sense rejection and the byte-for-value pin unchanged; tsc 0/0; content-pack 27/27. vis-field = 4c6a3315: B1, B3, SEAM, B4, B5, REBASE (main 9f148666), B2, B2-F1. B6 dispatched (fresh sol; brief impl-vis-field-b6.md; log impl-b6.log; 10-file manifest per plan :230 with the turn-context schema by generator only; owns the two known reds — the semantic partition and the OFFERS truncation calibration, re-derived by hand from class sizes against the 8,192 cap; six plan mutants; the D569 E1C/FOOTPRINTS demonstration with its hard stops; the §8 checkpoint re-verification by symbols; the final aggregate of every B1–B6 suite and `npx tsc -b --force`). After B6 and astra: the VIS-FIELD landing gate on the branch merged with main (gate-wt2 + the OFFERS checks + the D630 pair and arena round), then "Land VIS-FIELD-01" on main, mirror push (D640), then ELEVATION-02 B0.
22949:Sol r3 (impl-b6-sol.md): re-budget applied exactly as ruled; mechanism traced (44 fact sheets → 88 projection calls → 73 fresh derived-fog evaluations, because each encounter-board clone is a distinct state root — ai-dm-screenshot-probe.ts:829, visibility.ts:524, encounter-board.ts:716, visibility-field.ts:550); cap justified per fixture (with/without visibility bytes and the classes the 8,192 cap would drop from each: all four; 16,384 rejects 5117001/5117002/5117007; 32,768 = half the 65,536 blind base cap); D569 blind fixtures unchanged (10 files, inventory sha 3cb2a649…); E1C/FOOTPRINTS unchanged checks 2/2; six mutants killed; tsc 0/0; tsc -b --force 0; OFFERS checks 0/0; pair 38.7 s; second final aggregate of all 30 plan suites 760/760 in 1,171 s. VERIFIED BY ME (verify-b6.log; dirty tree 11 files 516+/32−): tsc app/node 0; tsc -b --force 0; both OFFERS checks 0; 0 forbidden, 0 long lines; schema generator idempotent (a08a7359… → a08a7359…); tests/fixtures diff empty; MY MUTANT PLAYER_OUTPUT_KEEPS_VISIBILITY (the audience === 'dm' guard dropped at semantic-board-payload.ts:601) → the sentinel/player-omission test RED, restored 77cfdb2d…; 11 B6 suites 328/328 (semantic, blind-turn-context, source-binding, engine-mcp-handler, board-delivery, visibility-field, screenshot-probe, engine-mcp-server, engine-mcp-boundary, stable-dom-render, accessible-board); pair 36/36 in 39 s. Committed 10cc9f5e. vis-field = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6 — every batch of the frozen plan. Astra (resume 01a0a642…, medium; brief review-impl-b6-astra.md; log review-b6-astra-r1.log) reviews the last batch and is asked to state whether the 32,768-byte blind semantic cap is within B6's authority or a product decision; the owner has been told and can rule before landing. Next after ACCEPT: the VIS-FIELD LANDING GATE — merge main into the branch (main has not moved since the rebase: 9f148666), gate-wt2 (tsc -b, sg, full vitest, Playwright), OFFERS checks, D630 pair and one arena round on the merged tip, then "Land VIS-FIELD-01" on main and the mirror push (D640); then ELEVATION-02 B0.
22952:Astra r1 (review-impl-b6-astra-r1.md, 1.72 M tokens): 11 files 516+/32−; schema regenerated in memory byte-identical (159,453 bytes); the strict v2 objects reject unknown keys (schemas.ts:671-683) with the blind validator mirroring them; no DM-semantic-to-player delivery path (projectPlayerBoard builds from PlayerView; serialization requires the DM audience at :601; turn-context delivery rejects player projections at :673; MCP attachment paths DM-only at engine-server.ts:1568-1579); one sight service (visibilityField / cellsThatCanSee at :334/:344; the serializer consumes supplied rows at :604-612); the truncation calibration reproduced exactly (16,120 → 15,167 → 13,168 → 12,259 → 5,492); the semantic partition oracle re-enumerated by rational arithmetic (18 visible, only [(4,0),(3,1)] concealed); the effect-line and Invisible-subject oracles confirmed; the source-binding counts recounted (57 = 3 + 6×5 + 6×4; 12 paths) and all three mutations rejected; the 10 D569 fixtures and the 31,995 / 32,000-byte raw-context pins byte-identical; three own mutants killed; tsc 0/0; pair 39.2 s. Its noted limits: the final single-owner test is a lexical check (no alias bypass found); its sandbox could not execute the D569 pins (sol 2/2 and my board-delivery 17/17 stand as the evidence). BLIND CAP: astra judges 32,768 bytes within B6's explicitly open cap choice, with the owner notification retained; two corrections to sol's account, accepted: blind delivery REJECTS an oversized protected semantic block rather than truncating it (blind-turn-context.ts:1304-1316) — so under the old 8,192 cap every retained hard fixture's blind context would have been refused outright, not thinned — and the semantic allowance is ADDITIONAL to the 65,536-byte base allowance, not within it. The owner may still rule the cap smaller before the landing merge; absent a ruling it lands at 32,768. VIS-FIELD-01 = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6. LANDING GATE launched now (gate-vis-field-land.log): gate-wt2 wt-vis-field (tsc -b --force, sg, full vitest, Playwright chromium) + the two OFFERS checks + the D630 pair twice + one arena round; main 9f148666 is already an ancestor, so the landing is a "Land VIS-FIELD-01" no-ff merge once the gate reads green (timeouts, if any, rerun isolated per the offers precedent D617.50); then the mirror push (D640); then ELEVATION-02 B0 on a fresh worktree from the landed main.
22961:Playwright (1.0 h, port 4450): tests/browser/ai-dm-board-snapshot.spec.ts:258 "captures the full production DM board deterministically through durable save upload/load" (0 ms — "Target page, context or browser has been closed", four times) and tests/browser/vtt-encounter.spec.ts:173 "M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow" (15.0 s — expect(locator).toHaveCount failed). The second is plausibly a legitimate consequence of B4 on the REFERENCE scene (authored fog (8,1),(8,2) replaced by derived fog [(4,3)]) that no batch's manifest covered because the plan named no browser spec; the first may be a crash chain from the same run. Both are being read from the gate's JSON report before any ruling; browser specs that pin the reference scene's fog need a hand-derived re-pin under the same rule as every other pin. LAND-01 (fresh sol 01a0ae59…, brief impl-vis-field-land-01.md, log impl-land-01.log) fixes the two production defects and the helper now.
23027:## D635.50 — SUPERVISOR (2026-09-17 09:22): LAND-04 VERIFIED BY ME and committed 807d2e3c; astra medium review dispatched; the vane-tpk budget red is a branch slowdown, not load
23031:## D635.51 — SUPERVISOR (2026-09-17 09:36): LAND-04 ACCEPTED by astra r1 (medium; saved review-impl-land-04-astra-r1.md; 1 P3 parked); untruncated full vitest launched on 807d2e3c to pin the exact remaining red set
23035:## D635.52 — SUPERVISOR (2026-09-17 09:52): untruncated full vitest on 807d2e3c = 47 reds / 13 files (11485/11532): EXACTLY the predicted 37 + 10 full-run budget timeouts; VIS-FIELD is now blocked only on question 5; perf investigation dispatched
23040:## D635.53 — SUPERVISOR (2026-09-17 10:21): VIS-FIELD slowdown profiled (sol, read-only; saved .claude/consensus/test-perf/investigate-vis-field-slowdown-sol.md); three bounded fixes queued for TEST-PERF-01 / a post-landing VIS-FIELD perf batch
23045:## D635.54 — SUPERVISOR (2026-09-17 11:06): option A costed (sol, read-only; saved investigate-option-a-costing-sol.md); a refinement of the attribution — 40 of the second-family ledger's 47 violations are B2's fog key, not the seam rule
23055:PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).
23077:## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
23079:REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
23080:MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.

exec
/bin/bash -lc "sed -n '22822,22870p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
## D635.3 — SUPERVISOR (2026-09-16 14:25): FINDING AGAINST MY OWN ATTRIBUTION in D635.1/D635.2 — scene-snapshot IS the seam's (as well as B4's); ruling: normalize under D569 in seam fix r2; B4 r2 manifest +2
On the DETACHED clean checkout: scene-snapshot.test.ts 8/8 at 78ee31b0 and 7/8 at 5492f782 (attrib-scene.log), so the seam commit changes it. My D635.1 attribution ("scene-snapshot is NOT the seam's") was drawn from the DIRTY worktree, where the same test is red for a second, independent reason (the partial-B4 producer edit removed referenceEncounterSetup().foggedCells, which the test asserts at :227); a test red in both arms of an A/B proves nothing about the variable, and I wrote a conclusion anyway. Recorded at full length. GEOMETRY (verified by me from the test fixture at scene-snapshot.test.ts:35-56 and reference-encounter.ts:113-126): fighter (2,3); the test adds an Oak Door at (6,3) and a Stone Wall at (6,4), both lineOfSight-blocking; the test's own comment names "(3,4)->(8,4)" as a clear ray that "graze[s] no blocker interior" — that ray runs along row line 4, the edge shared by the door (6,3) and the wall (6,4): exactly the two-room seam. Under D635 it is blocked, every other ray from the fighter to (7,4),(8,4),(9,4) enters the door or the wall, so those three cells are now concealed: received {(4,3),(7,4),(8,4),(9,4)} vs pinned {(4,3)}; (7,3)/(8,3) stay visible because row line 3 has the door on one side only. LEGITIMATE under the owner's rule. RULING: seam fix r2 (sol, resumed): normalize scene-snapshot.test.ts:215-243 under D569 exactly as B3 did (D626.8/D626.9): concealed set hand-derived with the ray geometry in the comment; the pre-seam hashes kept in the comment as the demonstration; the demonstration that ONLY concealedCells (and the fields that hash it) differ; new hashes recorded; negative control retained. Proof on a CLEAN copy of 5492f782 (the worktree's B4 dirt keeps the foggedCells assertion red there — that red is B4's). B4 r2 manifest gains tests/unit/vtt/regret.test.ts AND tests/unit/vtt/scene-snapshot.test.ts (+2; the plan's §5 "not repinned" line for scene-snapshot is amended by D635 — the seam changes the pinned input by ruling, the same case as D626.8).

## D636.1 — SUPERVISOR (2026-09-16 14:37): ELEVATION-02 plan r1 REJECTED by astra HIGH (9 P1, 5 P2); the ones I could check by reading are all confirmed; all accepted; r2 to sol
Astra (fresh 01a0ab75…, review-plan-r1-astra.md): sampled 15/24 assumptions (hold); recomputed five witnesses; in-memory compiler overlay of the B1–B5 cutover → 35 app / 43 node diagnostics, five test files outside the manifest; manifests 124 unique paths, counts pass, completeness fails. VERIFIED BY ME (reading): #5 arithmetic — p(3.5,.4)=3+0.5/0.4=4.25 > p(3.5,.6)=3.833, so the "edited Half default" witness at P:280 is wrong (projected max 4.25, overlap 17/24), and the 0..3 object gives max 3 under entry-only and entry+exit alike, so B6-ENTRY-T-ONLY has no discriminating fixture — CONFIRMED. #7 — SRD 12114-12121 "Changes to Your Speeds": a general Speed change propagates to every special speed; the plan's "effects alter only named kinds" contradicts it; High Jump "minimum of 0 feet" at 11794 omitted — CONFIRMED. #2 — D569's recorded reading (decisions.md:13394-13409) explicitly admits gutter-label coordinates as the blind model's destination grammar; the plan's "sole coordinate exception is query_line" plus a mutant teaching offered IDs would change the D569 boundary — CONFIRMED. #6 (forced landing of a non-hover flyer over mixed support: SRD 11723-11733 settles only the trigger) and #12 (water traversal model) and #13 (player height exposure contradiction P:939-941 vs 955-958) are real decisions the rulings do not settle: they become §14 OWNER QUESTIONS with options and a recommendation each, not plan decisions — I will put them to the owner one at a time. #1, #3, #4, #8, #9, #10, #11, #14 accepted on astra's evidence (file:line given; sol must reproduce #1's overlay and own every diagnostic). Round 2 of 3 to sol (resumed planner session).

## D617.49 — SUPERVISOR (2026-09-16 14:52): landing gate on 1cacd8f0 — Playwright chromium 187 passed (1.0 h), tsc 0, sg 0; vitest phase still owed on a quiet box
gate-wt-p-offer-help.log GATES DONE 14:50:42. The vitest phase's 17 timeout-class reds were discarded (D617.48); the full vitest run is re-launched alone as soon as the elevation planner lane is idle (the only other load on the box); the D630 timing pair and one arena round are measured in the same quiet window. Light checks on the merged tip run now (offers-light.log). Landing = "Land OFFERS single-builder (B1–B19)" merge commit into main after the vitest rerun reads green or only-isolated-green timeouts on a demonstrably quiet box.

## D635.4 — SUPERVISOR (2026-09-16 14:52): seam fix r2 verified by me and COMMITTED 9a3235da; seam = 5492f782 + 9a3235da on claude/vis-field; astra medium review dispatched on the detached clean checkout
verify-seam-r2.log (detached checkout at 5492f782 + sol's test): scene-snapshot 8/8 with the seam cover.ts (sha c8852c97…), 1 failed / 7 passed with the pre-seam cover.ts (f1a89e61…) — the new pin is not satisfiable by the old module; restored; tsc node 0 on the clean tree; 19 suites 311/312 with the one red a 5.045 s timeout of room-generator-los-cover "retains a productive first-turn option…" while the planner lane loaded the box (rerun isolated: see rerun-timeout.log). Sol's field-level diff claim (concealedCells and its carriers only) is for astra to reproduce; my hand check of the ray groups in the comment: every row-3-corner ray to (c,4) enters the door at y∈(3.75,4) for x∈(6,7); every ray to (c,5) enters the wall; row-4-corner rays to (c,4) are the seam; (7,3)/(8,3) keep the one-sided row-line-3 rays. Committed by path (the 12 partial-B4 files remain uncommitted). ../dnd-wt-seam-verify moved to 9a3235da (clean). Astra (resume 01a0a642…, medium; brief review-seam-astra.md; log review-seam-astra.log) reviews the 5-file diff 78ee31b0..9a3235da, with the exclusions-respecting sightBlockingAt flagged as a possible unruled behaviour change (check 3). B4 r2 follows an ACCEPT, with manifest +2 (regret, scene-snapshot).

## D635.5 — SUPERVISOR (2026-09-16 15:08): SEAM ACCEPTED by astra (medium; 4/4 mutants killed incl. its own; D569 demonstration reproduced independently); two P3 corrections to MY records; A/B timing; B4 r2 ruling (tracked fixtures, manifest 17)
Astra r1 (review-seam-astra-r1.md, 868 k tokens): rule fidelity probed with 16 in-memory endpoint/axis assertions (source-adjacent unit edge included, target-touching edge excluded, reverse/vertical/zero-length/diagonal handled; fractional endpoints unreachable — outerCorners only); optical-only proven (its own tier-raising mutant killed by PHYSICAL_COVER_UNCHANGED_BY_SEAM); my check (3) does NOT reproduce — source/target cells were already removed from candidates before both the optical and the total-cover checks (pre-seam cover.ts:474-477 vs :507-518), seven-assertion probe identical on both implementations; all six scene-snapshot hashes reproduced from in-memory old/new modules; R02 fixture json byte-identical (sha b679f113…); five files 226+/25−; tsc 0/0. CORRECTIONS TO MY RECORD (accepted): SEAM-F1 — D635.2 said (2,0)→(5,3) is the ONLY clear full-footprint ray; there are TWO, the other is (0,2)→(4,4), which touches fog corner (2,3) without entering a fog cell (0/16 clear from the (0,0) footprint, 2/16 from the full one; the test comment never claimed uniqueness). SEAM-F2 — D635.3/D635.4 said only concealedCells and its carriers differ; the complementary visible `cells` array differs too (that is what D626.9 already permits). A/B TIMING (ab-los-cover.log, throwaway checkout, back-to-back A1/B1/A2/B2): room-generator-los-cover 111/111 in 96.0 / 98.4 / 92.3 / 96.4 s — the seam costs ≈3–4 s on ≈94 s (+4%); the single 5 s-budget test sits at 4.76 s (old) vs 4.98 s (seam) isolated in astra's run and 5.18 s in mine under load: a pre-existing narrow margin (decisions.md:20827, 21339), not a seam regression; within D630. claude/vis-field = 9a3235da. B4 r2 RULING: manifest = the 12 (plan :206 + D626.10) + tests/unit/vtt/regret.test.ts + tests/unit/vtt/scene-snapshot.test.ts (D635.3) + the tracked generated fixtures fixtures/scenes/two-room.v1.json, fixtures/scenes/two-room.snapshots.v1.json (if present) and fixtures/protocol/examples.v1.json — 17 files, over the plan's ten because every excess file is a test or a generated fixture forced by rulings; the tracked bytes are regenerated by the real generator (tools/vtt-handoff/generate-fixtures.ts) under D569 demonstrate-then-normalize: the old bytes must reproduce from the pre-B4 producers first, the field-level diff must be limited to the removed foggedCells and the derived visibility/concealment fields, and the two-room protocol example's player snapshots must match a HAND derivation under D635 (adventurer (2,4) and goblin (8,4): every ray crosses column 5; the row-line-4 ray between wall (5,3) and door (5,4) and the row-line-5 ray between door (5,4) and wall (5,5) are two-blocker seams — the pair is NOT mutually visible; state every ray). Dispatch after the offers vitest rerun (quiet box) — the brief is written now.

## D636.2 — SUPERVISOR (2026-09-16 15:22): ELEVATION-02 plan r2 REJECTED by astra HIGH (5 P1, 3 P2); a FINDING AGAINST MY DISPATCH (moving artifact); r3 = final round
FINDING AGAINST MYSELF: I copied and hashed plan r2 (1859 lines, a72bcd25…) and dispatched astra on it as soon as the "PLAN R2 DONE" marker appeared in the lane log, before the lane's exit file existed; the planner was still in its "closing audit" replacing PLAN-* anchors with final line numbers, so astra reviewed a moving file and reports the final artifact as 1903 lines, sha ecc863dd1c439ad7e4f267a0e26cb8f84bea4324eb9c7e45ab9298ed0d88ab5e (verified now: 1903 lines, ecc863dd1c439ad7e4f267a0e26cb8f84bea4324eb9c7e45ab9298ed0d88ab5e). The rule already in memory — harvest on the exit file, never on the marker — was not applied. No verdict is affected (astra re-hashed and reviewed the final file), but the r2 record's sha was wrong; the main-repo copy is now the final one (archived as .r2). ASTRA r2 (review-plan-r2-astra.md): #1 P1 traversal contract misses its producer (standard-offer-generator.ts) and executor (engine-round-session.ts:256-268 executes mechanics.path through a cell-only move command) and option-modeling.ts — its declaration probe: 56 app / 207 node diagnostics; #2 P1 Batch 6A's distance policy needs vertical endpoints that creature-space.ts cannot supply (no height/altitude in CreatureSpace — VERIFIED by me at :100-110) and the producer (combat-rules.ts:77-102) is first owned in B7; consumer inventory incomplete (27 modules — VERIFIED: world-object-actions.ts:51 and regret/legal-actions.ts:107 unowned); #3 P1 the second D630 instrument's test title exists in none of the three trees (VERIFIED: only in the plan), so no base measurement is possible with it; #4 P1 Q1 options A/B have no outcome for ZERO legal uniform-support landings and A's pending-state UI is unowned; #5 P1 the D569 primer (decisions.md:13396: the DM board screenshot with its primer) was bound to the PLAYER board's elevation words, so Q3-B/C would suppress guidance for facts the DM screenshot shows — VERIFIED against my own earlier read of 13394-13409. P2: overlay script exit status claim; two batch-name typos; proposal-digest invariance vs traversal identity wording. Closed r1 items stand (#1 four-field overlay: 42 paths owned, 21 batches, 146 paths, max 10; #5 arithmetic recomputed; #7; #9; #10; #11; #14). ALL ACCEPTED. Round 3 of 3 to sol (resumed); the owner question Q1 gains the zero-candidate case (put to the owner in the same message as the r2 result).

## D617.50 — SUPERVISOR (2026-09-16 15:36): OFFERS LANDED on main as 9f148666 (merge --no-ff of claude/p-offer-help @ 1cacd8f0) after the complete landing gate
Gate on the merged tip 1cacd8f0 (all run by me): tsc -b --force 0; sg 0; Playwright chromium 187 passed (1.0 h, gate-wt-p-offer-help.log); check-command-outcomes 0; architecture self-test 0; architecture 0 (offers-light.log); full vitest 637/643 files, 11462/11479 tests, 17 failures ALL timeout-class (16 at 5 s, one at 60 s) under load 4+ from astra's r2 overlay probes (gate-offers-vitest-full.log); the six failed files rerun ONE AT A TIME (gate-offers-isolated.log): ai-dm-arena-interleave 2/2, ai-dm-arena 58/58, ai-dm-board-delivery 17/17, d583-contract-inventory 17/17, experiment-orchestrator 52/52, room-generator-los-cover 111/111 — 257/257; D630 timing pair 35/35 in 32.8 s (main 33.6 s, ceiling 42 s); one arena round 39.7 s (main baseline being measured now for the record: arena-main-baseline.log). The vitest-phase caveat stands as recorded: no quiet-box full run was achievable while lanes ran; every red was a timeout and every file is green alone, the same evidence standard every offers batch met. Owner authorization for the merge: "I authorize git merge" (13:3x). The offers unit is CLOSED; next on that seam: OFFER-ENV-HELP-01 (frozen 6af2b77f + F14) after VIS-FIELD lands, and VIS-FIELD-OFFERS-REBASE (the VIS plan's "rebase" step before B2).

## D635.6 — SUPERVISOR (2026-09-16 15:36): VIS-FIELD B4 round 2 dispatched (fresh sol, brief impl-vis-field-b4-r2.md, log impl-b4-r2.log) on claude/vis-field @ 9a3235da with the 12 partial edits in place and the RESUME NOTE; manifest 17 per D635.5.

## D617.50.1 — SUPERVISOR (2026-09-16 15:37): finding against my own D617.50 record — it was written BEFORE the merge had succeeded
My first landing command used `git merge -F -` (stdin), which git rejects ("could not read file '-'", exit 129); the record-writing step in the same script ran anyway and stamped D617.50 and the offers loop-log with main's OLD tip (4a99570d) as the landing sha. The merge was then run with the message in a file and succeeded: main = 9f148666. Both records were corrected in place to 9f148666. The rule (memory: no `&& git commit` after a gate; read the verdict before recording) applies to a merge too: the record follows the verified result, never the command.

## D635.7 — SUPERVISOR (2026-09-16 15:54): B4 r2 BLOCKED (correct stop); FINDING AGAINST MY D635.5 STEP 1; a seat-visibility contradiction found by me; B4 r3 = read-only investigation
Sol (fresh 01a0abb8…, impl-b4-r2-blocked-sol.md): on a clean archive of HEAD 9a3235da the real generator (vite-node tools/vtt-handoff/generate-fixtures.ts --check) reports FIXTURE_OUT_OF_DATE for fixtures/scenes/two-room.snapshots.v1.json (3c2b7623… → 76f102c4…, eight field paths: players[0].snapshot.{props,vision.explored,vision.visible}, players[1].snapshot.{lights,props,tokens,vision.explored,vision.visible}); two-room.v1.json reproduces; handoff-examples "proves real service behavior…" is red at clean HEAD because player A's regenerated snapshot contains the goblin token. No edits made. MY ERROR: D635.5 step 1 demanded that the old tracked bytes reproduce from the pre-B4 producers; they were last regenerated on 2026-09-10 (5c7f459b, 75fbf004), BEFORE VIS-FIELD B1 replaced the pairwise sight internals and B3 derived seat fog — the D626.10 known reds in handoff-examples / two-room-fixture were exactly this staleness, owned by B4. The demonstration base is therefore the VIS-FIELD branch base (main 75c2f44a), not HEAD. CONTRADICTION FOUND BY ME (two-room-diag on the clean seam checkout): traceCombatantLine adventurer→goblin and goblin→adventurer are BOTH blocksSight=true at 9a3235da (row-line-4 rays flagged at (5,3) by the seam rule; the row-5 rays enter the door (5,4)); by plan §3.3 seat token visibility uses detectCombatant (seen iff any footprint cell is seen|seen_dim by an eligible owned observer), so seat A must NOT list the goblin — yet the regenerated snapshot at the same HEAD lists it. Either the handoff snapshot's token rule is not §3.3's, or B3's seat scope admits an observer it should not, or the light region matters in a way the trace does not model. RULING: B4 r3 is a READ-ONLY INVESTIGATION (resumed r2 session): (1) regenerate on a clean archive of 75c2f44a and confirm the tracked bytes reproduce there (else name the true base); (2) trace the exact code path by which player A's regenerated snapshot at 9a3235da acquires the goblin token (file:line from tools/vtt-handoff/generate-fixtures.ts through the seat projection to the visibility call), and state which observer/field/rule admits it; (3) say whether that path is the plan's §3.3 rule, a B3 defect, or a snapshot rule the plan never covered; (4) hand-derive seat A's and seat B's visible cells / tokens under §3.3 with the ray evidence; NO edits. I rule on B4 after that; the tracked-fixture protocol (D635.5) is restated with base 75c2f44a and the eight-path allowance only for visibility-derived fields.

## D635.8 — SUPERVISOR (2026-09-16 16:06): B4 investigation harvested — MY "contradiction" in D635.7 was a misreading; §3.3 is applied correctly; base 75c2f44a reproduces; B4 r4 (implementation) ruled and dispatched
Sol (impl-b4-r3-investigation-sol.md): (1) all three tracked fixtures reproduce byte-for-byte from an in-memory bundle of 75c2f44a's producers (6c481b2b…, 3c2b7623…, 9fc9a587… equal=true) — the D569 demonstration base is 75c2f44a. (2) Code path traced generate-fixtures.ts:17 → two-room.ts:151-160 projectPlayerBoard(projectPlayerView(state, binding)) → visibility.ts:558-594 (seat-scoped eligible observers, non-owned combatants kept only if some observer canCombatantSee) → encounter.ts:2229-2234 → sightToCreature → visibility-field.ts:295-336 → projections/board/scene-snapshot serialize only the filtered tokens. (3) FINDING AGAINST MY D635.7: the regenerated STATIC snapshot at 9a3235da lists ONLY the owned token for each seat (seat A: adventurer, visible 48 / concealed 48; seat B: goblin, 56/40) — exactly what my trace predicted. The goblin-in-seat-A observation came from the DYNAMIC protocol transcript: tests/unit/vtt/handoff-examples.test.ts:316-318 OPENS the door (canonical opening sets lineOfSight:false, dm-encounter-host.ts:319-322), after which seat A legitimately sees the goblin straight down row 4 (field (8,4) seen; visible 76 / concealed 20); the test's :405-407 assertion that EVERY player-A event lists only the adventurer is an authored-fog-era expectation that B4 must re-author by hand. There is no B3 defect and no uncovered snapshot rule. (4) Hand derivation accepted: closed door — all 16 A→G rays blocked (row-line-4 seam wall (5,3)/door (5,4); row-line-5 seam door (5,4)/wall (5,5); the eight diagonals enter the door), symmetric for G→A; the map is bright outside the torch region (world-objects.ts:230-239), darkvision irrelevant; column 5 visible to both sides as target cells. (5) Every one of the eight changed snapshot paths is visibility-derived (props/lights filtered by visible footprints; tokens by canCombatantSee; vision.visible/explored from the owned field). RULING for B4 r4 (implementation, resumed session, workspace-write): D635.5 stands with base 75c2f44a; the regenerated tracked bytes may differ from 75c2f44a's ONLY in the removed authored fog and in visibility-derived fields (the eight snapshot paths; and in examples.v1.json the player events' tokens/vision/props/lights after the door opens); handoff-examples :405-407 and the two-room-fixture seat pins are re-authored from the hand derivation above (closed: own token only; open: both, with the row-4 doorway ray named); manifest 17 unchanged.

## D635.9 — SUPERVISOR (2026-09-16 16:22): B4 r4 BLOCKED on my stop condition (scene-snapshot revision checksum changes when authored fog leaves the reference setup) — ruled: that change IS B4, normalize under D569 with the field diff proven; r5 dispatched
Sol (impl-b4-r4-blocked-sol.md): base 75c2f44a reconfirmed by the real generator (--check exit 0, three shas identical); scene-snapshot's authored-fog assertion replaced by the derived DM fog pin [(4,3)] (hand-derived: 70 cells, three observers reveal 69); then "preserves full persisted request/coordinator bytes and the actual revision checksum" fails ONLY on revisionChecksum (cd99e1c8… → df6f2cce…); pendingRequestHash and coordinatorHash unchanged. Reading: the persisted revision body embeds the encounter STATE, whose authored foggedCells [(8,1),(8,2)] B4 removes by plan; the request/coordinator payloads do not embed the state's fog and stay put — exactly the shape B4 predicts. The plan's §5 line "scene snapshot pins are not repinned" cannot hold for this fixture once its authored fog is deleted; D569 applies (as D626.8 ruled for B3). RULING: normalize revisionChecksum ONLY after demonstrating that the canonical-JSON field diff of the revision body between the pre-B4 tree (HEAD 9a3235da) and the B4 tree is limited to the state's foggedCells (removed key or derived list — state which); keep the old checksum in the comment as pre-B4; pendingRequest/coordinator hashes must NOT change (hard stop if they do); negative control retained. Everything else in the r2/r4 briefs stands. r5 on the resumed session.

## D636.3 — SUPERVISOR (2026-09-16 16:22): ELEVATION-02 plan r3 (FINAL round) harvested on the exit file: 2373 lines, sha 7c2cc7ceae14284a0185d0b887ccedd2fbbba9a2fb3baf75d8477a8e2852cb14; astra HIGH r3 dispatched
Sol (1.09 M tokens): 33 batches, 217 unique allowed paths, max 10; traversal overlay (typed EngineTraversalBinding replacing cell-only path/finalPosition in events/option-modeling/offer-envelope/turn-proposal) 89/89 diagnostic paths assigned across B7A0–B7A9, 0 outside; 27/27 distance modules assigned across B6A0–B6A3; untouched-tree tsc 0/0; arena probe 1 passed 39.1 s. Main-repo copy updated (archived .r3). Astra reviews the final artifact; the round-3 verdict decides freeze or return-to-owner.

## D636.4 — SUPERVISOR (2026-09-16 16:37): ELEVATION-02 plan r3 (FINAL round) REJECTED by astra HIGH on two mechanical manifest P1s; plan held pending the owner's Q1–Q3 answers; the answers round folds both fixes
Astra r3 (review-plan-r3-astra.md, 467 k tokens): every r2 finding closed (traversal chain owned; distance endpoints introduced in B6A0 before consumers; the D630 harness is the existing arena test at main ai-dm-arena.test.ts:1709-1755 with per_combatant / initiative_segments_v1 / derived_v1 reaching real reducer transactions; Q1 bounded with empty-set outcomes; D569 primer bound to the DM screenshot; three P2s closed) — two P1s remain, both manifest closure: (1) the traversal overlay union is 90 paths across the three trees, not 89 — claude/p-offer-help:tests/unit/vtt/offer-environment-board-sequence.test.ts:33 reads resolution.mechanics.path and is unowned, so B7A9 cannot end green on the landed base; fix = add it to B7A9 (four files today) and migrate its movement assertion keeping the environment-digest controls; (2) three existing test consumers pass raw CreatureSpace to the distance functions and are outside the distance tranche — tests/unit/combat/creature-space.test.ts:182-215, tests/unit/vtt/footprint-increment-four.test.ts:390(392 on OFFERS), tests/unit/vtt/challenge-room-fixtures.test.ts:294(308) — 8 TS2345 diagnostics; fix = own them inside B6A0–B6A3 with a split to keep ten files. Astra also states a lane cannot execute B0→B5C from this text alone because B1 waits on Q1 (and Q2 shapes B1's model, Q3 shapes B4's assertions) — which is by design: those are owner questions. RULING: the three-round cap is reached; the plan is NOT frozen. It is HELD at sha 7c2cc7ce… pending the owner's answers to Q1 (forced landing: A bounded DM selection with off-board unresolved on an empty set, or B bounded deterministic nearest with removal on an empty set; displacement bound min(fall distance, 30 ft)), Q2 (water: A deep/mandatory swim, B shallow/selectable, C authored shallow|deep — recommended C) and Q3 (player-visible elevation facts: A board labels — recommended, B tier cues only, C none). The answers produce one bounded revision round (r4: incorporate the answers + astra's two manifest fixes, nothing else) and one astra confirmation; implementation remains sequenced after VIS-FIELD-01 lands. Questions go to the owner one at a time; Q1 (amended with the empty-set outcomes) is being asked now.

## D635.10 — SUPERVISOR (2026-09-16 16:37): B4 r5 BLOCKED (correct, on my hard stop) — branchRngStateFingerprint is a DERIVED digest of the mechanical state that still contains foggedCells; allowance widened to it; r6 dispatched
Sol (impl-b4-r5-blocked-sol.md): persisted revision body diff HEAD 9a3235da → B4: $.encounterState.foggedCells [(8,1),(8,2)] → [] (key retained empty, per the B4/B5 split) AND $.branchRngStateFingerprint 8651c928… → 163cf200…; pendingRequestHash and coordinatorHash byte-identical. VERIFIED BY ME: src/vtt/session-persistence.ts:1099-1101 defines branchRngStateFingerprint(encounterState) = sha256(canonicalJson(mechanicalBranchState(encounterState))) — "digest of the persisted, mechanically relevant encounter representation" (:298) — and it changed exactly because the mechanical state's foggedCells changed; deriveBranchRng (:1103-1112) seeds branch RNGs from it, so branch seeds move whenever the fog field moves — an existing property of the design that B5's field deletion will move once more. RULING: the permitted field diff for the scene-snapshot revision body is encounterState.foggedCells AND branchRngStateFingerprint (the latter must be shown equal to sha256(canonicalJson(mechanicalBranchState(B4 state))) — i.e. recomputed, not copied); everything else in D635.9 stands (request/coordinator hashes byte-identical; old checksum kept as pre-B4; negative control). r6 on the resumed session.

## D637 — OWNER (2026-09-16 16:59): ELEVATION-02 Q1 — forced landing of a non-hovering flyer = option A, bounded DM landing selection
Owner, verbatim: "A. Bounded DM landing selection (recommended by the plan and by me)". Binding on the plan (.tmp-plans/2026-09-16-elevation-02-plan.md Q1, lines ~1977-2027 at sha 7c2cc7ce…): when a non-hovering flyer must fall (SRD 11723-11733), the reducer removes flying altitude in the triggering transaction and enumerates legal landing anchors (in bounds, unblocked, unoccupied, one uniform support tier under the whole footprint) within horizontal displacement ≤ min(fall distance, 30 ft), ordered by Chebyshev distance then row then column, never widening the bound; the encounter enters a typed forced_landing_pending state and the DM selects one anchor, after which fall damage / Prone / OA / hazard consequences use the selected anchor; an EMPTY candidate set moves the token to a typed off-board forced_landing_unresolved state (not aloft, cannot act or be targeted) with one explicit remove_from_encounter adjudication and deferred damage. Only the Q1A-PENDING-LANDING-* family is authored (Q1B absent, not skipped), with the shared fixture (Large 2×2 flyer over floor/raised/occupied; an anchor exactly at the bound; one foot beyond; an all-blocked board) and the mutants Q1A-ZERO-CANDIDATES-DEADLOCK and Q1-SEARCH-EXCEEDS-BOUND. Q2 (water) and Q3 (player exposure) remain open; asked next, one at a time.

## D635.11 — SUPERVISOR (2026-09-16 17:11): VIS-FIELD B4 verified by me and COMMITTED 2e360685 on claude/vis-field; astra medium review dispatched on the detached clean checkout
Sol r6 (impl-b4-sol.md, 467 k tokens across six rounds — four correct stops on my rulings, one investigation): 17 files 267+/4868−; base 75c2f44a reproduces the three tracked fixtures (generator --check 0); regenerated hashes 26e0ddf5… / 76f102c4… / 70cb1ece…; sol's path checker: source 1, snapshot 8, protocol 45 paths, unexpected none; closed-door seat oracle pinned with the 16 rays enumerated (A 48 visible / [adventurer]; B 56 / [goblin]); open-door pin via A's (4,4)→(8,4) row-4 ray (wall (5,3) one flank, open doorway the other); revision-body diff exactly {encounterState.foggedCells, branchRngStateFingerprint}, fingerprint recomputed equal; RED-first 2 failed / 2 passed / 48 skipped; three plan mutants killed with sha-restored files; sol: 124/124 + 276/276, pair 37.96→39.24 s. VERIFIED BY ME (verify-b4.log, dirty tree before commit): tsc app/node 0/0; generator --check 0; 0 forbidden additions; 0 long lines; my REFERENCE_DARK_CELL_REVEALED and VANE_DIM_TREATED_UNSEEN both RED then restored (sha 3d867ad5…, 5b55684b…); 20 suites 399/400 — the one red is room-generator-los-cover's 5.004 s timeout (the known narrow margin, D635.5; isolated rerun on the clean checkout at 2e360685 in progress, rerun-b4-los.log); deferred reds exactly semantic-board-payload ×2 + screenshot-probe fact-class (B5/B6) plus the screenshot D524 5.6 s timeout that sol reproduced at clean 9a3235da (5.38 s); timing pair 36/36 in 41 s wall on a box at load ~1 (ceiling 42 s; main 33.6 s; B4 touches no engine cost path — the drift since the seam's 40 s is load; to be remeasured quiet before landing). My own JSON field diff HEAD→B4: two-room.v1.json foggedCells only; the other two files differ only under players / events / exchanges (coarse list compare; astra reproduces the path-level claim). handoff-examples diff read by me: the event partition (before open / at open / after close) and the ray reasoning are sound; the writeFileSync I flagged in the lane log is pre-existing temp-copy code, not a write to the tracked file. Committed 2e360685 (all 17 files). Astra (resume 01a0a642…, medium; brief review-impl-b4-astra.md; log review-b4-astra-r1.log) on ../dnd-wt-seam-verify moved to 2e360685. Next after ACCEPT: B5 (plan :216-227), then the rebase step (main now carries OFFERS 9f148666), then B2, B6.

codex
D648 confirms the current rule is the intended solid-wall model and identifies the scene-snapshot change as legitimate. I’m now pinning the remaining four failures to individual rays; the key decision is whether either R02 test has lost its asserted shot entirely, which would require me to stop and propose a scene edit.
exec
/bin/bash -lc 'rg -n -C 30 "preserves full persisted request|blocked auto-submit|unresolved frontier prevents|target-specific non-nearest R02|both 90-foot Scout shots" tests/unit/vtt/scene-snapshot.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts
rg -n "traceTerrainLine|traceCombatantLine|traceCornerLine|firstBlockingCell" src/combat tests/unit | head -120
rg -n "seed-5117009|5117009|Scout|scout" tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts src fixtures | head -240' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/unit/vtt/tactical-evaluator-r02.test.ts-60-const BASE_FAILURE_WEIGHTS = {
tests/unit/vtt/tactical-evaluator-r02.test.ts-61-  priest: { miss: 12, normalHit: 7, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-62-  firstScout: { miss: 15, normalHit: 4, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-63-  secondScout: { miss: 18, normalHit: 1, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-64-  firstBandit: { miss: 16, normalHit: 3, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-65-  secondBandit: { miss: 14, normalHit: 5, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-66-} as const satisfies Readonly<Record<string, FailureWeights>>;
tests/unit/vtt/tactical-evaluator-r02.test.ts-67-
tests/unit/vtt/tactical-evaluator-r02.test.ts-68-const BLESSED_FAILURE_WEIGHTS = {
tests/unit/vtt/tactical-evaluator-r02.test.ts-69-  priest: { miss: 19, normalHit: 19, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-70-  firstScout: { miss: 25, normalHit: 13, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-71-  secondScout: { miss: 31, normalHit: 7, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-72-  firstBandit: { miss: 27, normalHit: 11, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-73-} as const satisfies Readonly<Record<string, FailureWeights>>;
tests/unit/vtt/tactical-evaluator-r02.test.ts-74-
tests/unit/vtt/tactical-evaluator-r02.test.ts-75-async function frozenState(): Promise<EncounterState> {
tests/unit/vtt/tactical-evaluator-r02.test.ts-76-  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts-77-  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts-78-}
tests/unit/vtt/tactical-evaluator-r02.test.ts-79-
tests/unit/vtt/tactical-evaluator-r02.test.ts-80-function reauthoredClearScoutShot(state: EncounterState): EncounterState {
tests/unit/vtt/tactical-evaluator-r02.test.ts-81-  return {
tests/unit/vtt/tactical-evaluator-r02.test.ts-82-    ...state,
tests/unit/vtt/tactical-evaluator-r02.test.ts-83-    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
tests/unit/vtt/tactical-evaluator-r02.test.ts-84-      ? { column: 9, row: 2 }
tests/unit/vtt/tactical-evaluator-r02.test.ts-85-      : cell),
tests/unit/vtt/tactical-evaluator-r02.test.ts-86-  };
tests/unit/vtt/tactical-evaluator-r02.test.ts-87-}
tests/unit/vtt/tactical-evaluator-r02.test.ts-88-
tests/unit/vtt/tactical-evaluator-r02.test.ts-89-describe('R02-like canonical tactical query', () => {
tests/unit/vtt/tactical-evaluator-r02.test.ts:90:  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
tests/unit/vtt/tactical-evaluator-r02.test.ts-91-    const state = reauthoredClearScoutShot(await frozenState());
tests/unit/vtt/tactical-evaluator-r02.test.ts-92-    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
tests/unit/vtt/tactical-evaluator-r02.test.ts-93-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
tests/unit/vtt/tactical-evaluator-r02.test.ts-94-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
tests/unit/vtt/tactical-evaluator-r02.test.ts-95-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
tests/unit/vtt/tactical-evaluator-r02.test.ts-96-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
tests/unit/vtt/tactical-evaluator-r02.test.ts-97-    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
tests/unit/vtt/tactical-evaluator-r02.test.ts-98-    const handGeometry = [
tests/unit/vtt/tactical-evaluator-r02.test.ts-99-      {
tests/unit/vtt/tactical-evaluator-r02.test.ts-100-        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-101-        lineTiers: ['total', 'total', 'none', 'none'], coverTier: 'half',
tests/unit/vtt/tactical-evaluator-r02.test.ts-102-        probabilities: { status: 'resolved', hit: 5 / 20, critical: 1 / 20, miss: 15 / 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-103-        expectedDamage: (4 / 20) * 6.5 + (1 / 20) * 11,
tests/unit/vtt/tactical-evaluator-r02.test.ts-104-      },
tests/unit/vtt/tactical-evaluator-r02.test.ts-105-      {
tests/unit/vtt/tactical-evaluator-r02.test.ts-106-        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-107-        lineTiers: ['total', 'total', 'none', 'total'], coverTier: 'three_quarters',
tests/unit/vtt/tactical-evaluator-r02.test.ts-108-        probabilities: { status: 'resolved', hit: 2 / 20, critical: 1 / 20, miss: 18 / 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-109-        expectedDamage: (1 / 20) * 6.5 + (1 / 20) * 11,
tests/unit/vtt/tactical-evaluator-r02.test.ts-110-      },
tests/unit/vtt/tactical-evaluator-r02.test.ts-111-    ] as const;
tests/unit/vtt/tactical-evaluator-r02.test.ts-112-    const rows = handGeometry.map((geometry) => {
tests/unit/vtt/tactical-evaluator-r02.test.ts-113-      const scoutId = geometry.scoutId;
tests/unit/vtt/tactical-evaluator-r02.test.ts-114-      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
tests/unit/vtt/tactical-evaluator-r02.test.ts-115-        .find((candidate): candidate is MonsterAttackAction =>
tests/unit/vtt/tactical-evaluator-r02.test.ts-116-          candidate.kind === 'attack' && candidate.id === 'longbow');
tests/unit/vtt/tactical-evaluator-r02.test.ts-117-      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
tests/unit/vtt/tactical-evaluator-r02.test.ts-118-      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
tests/unit/vtt/tactical-evaluator-r02.test.ts-119-        actorId: scoutId,
tests/unit/vtt/tactical-evaluator-r02.test.ts-120-        targetId: FIGHTER,
--
tests/unit/tools/ai-dm-conversation.test.ts-2697-        policy: 'actor-knowledge-last-seen-v4',
tests/unit/tools/ai-dm-conversation.test.ts-2698-        actorId: 'combatant:generated-3943001-monster-1',
tests/unit/tools/ai-dm-conversation.test.ts-2699-        targets: projectedTargets([70, 75, 75]),
tests/unit/tools/ai-dm-conversation.test.ts-2700-      },
tests/unit/tools/ai-dm-conversation.test.ts-2701-      {
tests/unit/tools/ai-dm-conversation.test.ts-2702-        policy: 'actor-knowledge-last-seen-v4',
tests/unit/tools/ai-dm-conversation.test.ts-2703-        actorId: 'combatant:generated-3943001-monster-2',
tests/unit/tools/ai-dm-conversation.test.ts-2704-        targets: projectedTargets([65, 70, 70]),
tests/unit/tools/ai-dm-conversation.test.ts-2705-      },
tests/unit/tools/ai-dm-conversation.test.ts-2706-      {
tests/unit/tools/ai-dm-conversation.test.ts-2707-        policy: 'actor-knowledge-last-seen-v4',
tests/unit/tools/ai-dm-conversation.test.ts-2708-        actorId: 'combatant:generated-3943001-monster-3',
tests/unit/tools/ai-dm-conversation.test.ts-2709-        targets: projectedTargets([70, 75, 75]),
tests/unit/tools/ai-dm-conversation.test.ts-2710-      },
tests/unit/tools/ai-dm-conversation.test.ts-2711-    ]);
tests/unit/tools/ai-dm-conversation.test.ts-2712-    expect(result.rows[0]?.authorizedPlan?.some((entry) =>
tests/unit/tools/ai-dm-conversation.test.ts-2713-      entry.resolutionSummary.actionSlots.some((slot) => slot.kind === 'dodge'))).toBe(false);
tests/unit/tools/ai-dm-conversation.test.ts-2714-    expect(result.rows[1]?.proposalId).toContain('round:');
tests/unit/tools/ai-dm-conversation.test.ts-2715-    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
tests/unit/tools/ai-dm-conversation.test.ts-2716-    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
tests/unit/tools/ai-dm-conversation.test.ts-2717-    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
tests/unit/tools/ai-dm-conversation.test.ts-2718-    expect(result.binding?.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
tests/unit/tools/ai-dm-conversation.test.ts-2719-    expect(result.binding).not.toBeNull();
tests/unit/tools/ai-dm-conversation.test.ts-2720-    if (result.binding === null) throw new Error('SIMULATED run lost its agent binding.');
tests/unit/tools/ai-dm-conversation.test.ts-2721-    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
tests/unit/tools/ai-dm-conversation.test.ts-2722-    expect(result.restoredMidRun).toBe(true);
tests/unit/tools/ai-dm-conversation.test.ts-2723-    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
tests/unit/tools/ai-dm-conversation.test.ts-2724-    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
tests/unit/tools/ai-dm-conversation.test.ts-2725-  });
tests/unit/tools/ai-dm-conversation.test.ts-2726-
tests/unit/tools/ai-dm-conversation.test.ts:2727:  it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
tests/unit/tools/ai-dm-conversation.test.ts-2728-    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
tests/unit/tools/ai-dm-conversation.test.ts-2729-    // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spear after its
tests/unit/tools/ai-dm-conversation.test.ts-2730-    // move to (13,1); changing that blocker then exposes monster-5's Longbow at
tests/unit/tools/ai-dm-conversation.test.ts-2731-    // the independent row-line-6 seam (10,5)/(10,6), so both blockers move left.
tests/unit/tools/ai-dm-conversation.test.ts-2732-    // Each move also opens every ray through the old cell interior, pinned above.
tests/unit/tools/ai-dm-conversation.test.ts-2733-    const state = reauthoredHardExhaustionSightlines(
tests/unit/tools/ai-dm-conversation.test.ts-2734-      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/tools/ai-dm-conversation.test.ts-2735-    );
tests/unit/tools/ai-dm-conversation.test.ts-2736-    const config = parseConversationArgs([
tests/unit/tools/ai-dm-conversation.test.ts-2737-      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
tests/unit/tools/ai-dm-conversation.test.ts-2738-      '--capture-rl-data', '--dry-run',
tests/unit/tools/ai-dm-conversation.test.ts-2739-      ...LEGACY_BLOCK_ARGS,
tests/unit/tools/ai-dm-conversation.test.ts-2740-    ]);
tests/unit/tools/ai-dm-conversation.test.ts-2741-
tests/unit/tools/ai-dm-conversation.test.ts-2742-    const result = await runConversation(config, {
tests/unit/tools/ai-dm-conversation.test.ts-2743-      roomStates: [state],
tests/unit/tools/ai-dm-conversation.test.ts-2744-      exhaustInitial: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2745-      failCorrection: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2746-    });
tests/unit/tools/ai-dm-conversation.test.ts-2747-
tests/unit/tools/ai-dm-conversation.test.ts-2748-    const row = result.rows[0];
tests/unit/tools/ai-dm-conversation.test.ts-2749-    expect(row).toEqual(expect.objectContaining({
tests/unit/tools/ai-dm-conversation.test.ts-2750-      outcome: 'authorized',
tests/unit/tools/ai-dm-conversation.test.ts-2751-      plannedBy: null,
tests/unit/tools/ai-dm-conversation.test.ts-2752-      planner: 'sim_controller',
tests/unit/tools/ai-dm-conversation.test.ts-2753-      proposalId: expect.stringContaining('sim-controller:'),
tests/unit/tools/ai-dm-conversation.test.ts-2754-      autoSubmitBlocks: expect.arrayContaining([
tests/unit/tools/ai-dm-conversation.test.ts-2755-        {
tests/unit/tools/ai-dm-conversation.test.ts-2756-          actorId: 'combatant:generated-5117009-monster-1',
tests/unit/tools/ai-dm-conversation.test.ts-2757-          reason: 'auto_submit_blocked_unresolved_frontier',
--
tests/unit/tools/ai-dm-conversation.test.ts-2771-      ]),
tests/unit/tools/ai-dm-conversation.test.ts-2772-    }));
tests/unit/tools/ai-dm-conversation.test.ts-2773-    const priestPlan = row?.authorizedPlan?.find((entry) =>
tests/unit/tools/ai-dm-conversation.test.ts-2774-      entry.actorId === 'combatant:generated-5117009-monster-1');
tests/unit/tools/ai-dm-conversation.test.ts-2775-    expect(priestPlan?.resolutionSummary.actionSlots).toEqual(expect.arrayContaining([
tests/unit/tools/ai-dm-conversation.test.ts-2776-      expect.objectContaining({ kind: 'dodge' }),
tests/unit/tools/ai-dm-conversation.test.ts-2777-    ]));
tests/unit/tools/ai-dm-conversation.test.ts-2778-    expect(row?.projectionRevision).toBeGreaterThan(row?.contextRevision ?? 0);
tests/unit/tools/ai-dm-conversation.test.ts-2779-  });
tests/unit/tools/ai-dm-conversation.test.ts-2780-
tests/unit/tools/ai-dm-conversation.test.ts-2781-  it.each([
tests/unit/tools/ai-dm-conversation.test.ts-2782-    {
tests/unit/tools/ai-dm-conversation.test.ts-2783-      name: 'no proposal',
tests/unit/tools/ai-dm-conversation.test.ts-2784-      expected: 'no_proposal',
tests/unit/tools/ai-dm-conversation.test.ts-2785-      options: {
tests/unit/tools/ai-dm-conversation.test.ts-2786-        exhaustInitial: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2787-        failCorrection: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2788-      },
tests/unit/tools/ai-dm-conversation.test.ts-2789-      hard: false,
tests/unit/tools/ai-dm-conversation.test.ts-2790-    },
tests/unit/tools/ai-dm-conversation.test.ts-2791-    {
tests/unit/tools/ai-dm-conversation.test.ts-2792-      name: 'validation exhaustion',
tests/unit/tools/ai-dm-conversation.test.ts-2793-      expected: 'validation_exhausted',
tests/unit/tools/ai-dm-conversation.test.ts-2794-      options: {
tests/unit/tools/ai-dm-conversation.test.ts-2795-        invalidInitial: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2796-        failCorrection: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2797-      },
tests/unit/tools/ai-dm-conversation.test.ts-2798-      hard: false,
tests/unit/tools/ai-dm-conversation.test.ts-2799-    },
tests/unit/tools/ai-dm-conversation.test.ts-2800-    {
tests/unit/tools/ai-dm-conversation.test.ts:2801:      name: 'blocked auto-submit',
tests/unit/tools/ai-dm-conversation.test.ts-2802-      expected: 'auto_submit_blocked',
tests/unit/tools/ai-dm-conversation.test.ts-2803-      options: {
tests/unit/tools/ai-dm-conversation.test.ts-2804-        exhaustInitial: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2805-        failCorrection: ['room-1-round-1'],
tests/unit/tools/ai-dm-conversation.test.ts-2806-      },
tests/unit/tools/ai-dm-conversation.test.ts-2807-      hard: true,
tests/unit/tools/ai-dm-conversation.test.ts-2808-    },
tests/unit/tools/ai-dm-conversation.test.ts-2809-    {
tests/unit/tools/ai-dm-conversation.test.ts-2810-      name: 'timeout',
tests/unit/tools/ai-dm-conversation.test.ts-2811-      expected: 'timeout',
tests/unit/tools/ai-dm-conversation.test.ts-2812-      options: {
tests/unit/tools/ai-dm-conversation.test.ts-2813-        timeoutInitial: ['room-1-round-2'],
tests/unit/tools/ai-dm-conversation.test.ts-2814-        failCorrection: ['room-1-round-2'],
tests/unit/tools/ai-dm-conversation.test.ts-2815-      },
tests/unit/tools/ai-dm-conversation.test.ts-2816-      hard: false,
tests/unit/tools/ai-dm-conversation.test.ts-2817-    },
tests/unit/tools/ai-dm-conversation.test.ts-2818-  ] as const)('records typed fallbackReason for $name from the stub adapter', { timeout: 60_000 }, async ({
tests/unit/tools/ai-dm-conversation.test.ts-2819-    expected,
tests/unit/tools/ai-dm-conversation.test.ts-2820-    options,
tests/unit/tools/ai-dm-conversation.test.ts-2821-    hard,
tests/unit/tools/ai-dm-conversation.test.ts-2822-  }) => {
tests/unit/tools/ai-dm-conversation.test.ts-2823-    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fallback-${expected}-`));
tests/unit/tools/ai-dm-conversation.test.ts-2824-    const rounds = expected === 'timeout' ? 2 : 1;
tests/unit/tools/ai-dm-conversation.test.ts-2825-    const config = parseConversationArgs([
tests/unit/tools/ai-dm-conversation.test.ts-2826-      '--rooms', '1', '--rounds', String(rounds), '--out', join(directory, 'rows.jsonl'),
tests/unit/tools/ai-dm-conversation.test.ts-2827-      '--dry-run',
tests/unit/tools/ai-dm-conversation.test.ts-2828-      ...LEGACY_BLOCK_ARGS,
tests/unit/tools/ai-dm-conversation.test.ts-2829-    ]);
tests/unit/tools/ai-dm-conversation.test.ts-2830-    const state = hard
tests/unit/tools/ai-dm-conversation.test.ts-2831-      // The typed fallback is reached after monster-2's Spear and monster-5's
--
tests/unit/vtt/dm-tactical-intel.test.ts-39-}
tests/unit/vtt/dm-tactical-intel.test.ts-40-
tests/unit/vtt/dm-tactical-intel.test.ts-41-function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
tests/unit/vtt/dm-tactical-intel.test.ts-42-  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
tests/unit/vtt/dm-tactical-intel.test.ts-43-    throw new TypeError(`${label} must be an object.`);
tests/unit/vtt/dm-tactical-intel.test.ts-44-  }
tests/unit/vtt/dm-tactical-intel.test.ts-45-  return value as Readonly<Record<string, unknown>>;
tests/unit/vtt/dm-tactical-intel.test.ts-46-}
tests/unit/vtt/dm-tactical-intel.test.ts-47-
tests/unit/vtt/dm-tactical-intel.test.ts-48-async function r02Runtime(profile: 'dm' | 'full' = 'dm', turnContextMaximumBytes?: number) {
tests/unit/vtt/dm-tactical-intel.test.ts-49-  const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/dm-tactical-intel.test.ts-50-  const state = freshMonsterPlanningState(loaded);
tests/unit/vtt/dm-tactical-intel.test.ts-51-  const runtime = createEngineMcpRuntime(state, {
tests/unit/vtt/dm-tactical-intel.test.ts-52-    toolProfile: profile,
tests/unit/vtt/dm-tactical-intel.test.ts-53-    offerEnvironment: OFFER_ENVIRONMENT,
tests/unit/vtt/dm-tactical-intel.test.ts-54-    ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
tests/unit/vtt/dm-tactical-intel.test.ts-55-  });
tests/unit/vtt/dm-tactical-intel.test.ts-56-  return { state, runtime, capsule: runtime.feed.current() };
tests/unit/vtt/dm-tactical-intel.test.ts-57-}
tests/unit/vtt/dm-tactical-intel.test.ts-58-
tests/unit/vtt/dm-tactical-intel.test.ts-59-function fullContext(runtime: ReturnType<typeof createEngineMcpRuntime>, capsule: EngineStateCapsule) {
tests/unit/vtt/dm-tactical-intel.test.ts-60-  return record(runtime.toolSurface.execute('engine.get_turn_context', {
tests/unit/vtt/dm-tactical-intel.test.ts-61-    run_id: capsule.runId,
tests/unit/vtt/dm-tactical-intel.test.ts-62-    expected_revision: capsule.revision,
tests/unit/vtt/dm-tactical-intel.test.ts-63-    scope: 'round',
tests/unit/vtt/dm-tactical-intel.test.ts-64-    granularity: 'full',
tests/unit/vtt/dm-tactical-intel.test.ts-65-  }), 'full context');
tests/unit/vtt/dm-tactical-intel.test.ts-66-}
tests/unit/vtt/dm-tactical-intel.test.ts-67-
tests/unit/vtt/dm-tactical-intel.test.ts-68-describe('versioned DM tactical intel', () => {
tests/unit/vtt/dm-tactical-intel.test.ts:69:  it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
tests/unit/vtt/dm-tactical-intel.test.ts-70-    const loaded = reauthoredClearScoutShot(
tests/unit/vtt/dm-tactical-intel.test.ts-71-      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/vtt/dm-tactical-intel.test.ts-72-    );
tests/unit/vtt/dm-tactical-intel.test.ts-73-    const state = freshMonsterPlanningState(loaded);
tests/unit/vtt/dm-tactical-intel.test.ts-74-    const runtime = createEngineMcpRuntime(state, {
tests/unit/vtt/dm-tactical-intel.test.ts-75-      toolProfile: 'dm',
tests/unit/vtt/dm-tactical-intel.test.ts-76-      offerEnvironment: OFFER_ENVIRONMENT,
tests/unit/vtt/dm-tactical-intel.test.ts-77-    });
tests/unit/vtt/dm-tactical-intel.test.ts-78-    const capsule = runtime.feed.current();
tests/unit/vtt/dm-tactical-intel.test.ts-79-    // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
tests/unit/vtt/dm-tactical-intel.test.ts-80-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
tests/unit/vtt/dm-tactical-intel.test.ts-81-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
tests/unit/vtt/dm-tactical-intel.test.ts-82-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
tests/unit/vtt/dm-tactical-intel.test.ts-83-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
tests/unit/vtt/dm-tactical-intel.test.ts-84-    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
tests/unit/vtt/dm-tactical-intel.test.ts-85-    const context = fullContext(runtime, capsule);
tests/unit/vtt/dm-tactical-intel.test.ts-86-    const actors = context['actors'];
tests/unit/vtt/dm-tactical-intel.test.ts-87-    if (!Array.isArray(actors)) throw new TypeError('Actor contexts are absent.');
tests/unit/vtt/dm-tactical-intel.test.ts-88-    const requested = capsule.request?.actors ?? [];
tests/unit/vtt/dm-tactical-intel.test.ts-89-    expect(actors).toHaveLength(requested.length);
tests/unit/vtt/dm-tactical-intel.test.ts-90-    expect(actors.every((value) => {
tests/unit/vtt/dm-tactical-intel.test.ts-91-      const intel = record(record(value, 'actor')['intel'], 'actor intel');
tests/unit/vtt/dm-tactical-intel.test.ts-92-      return intel['policy'] === DM_TURN_INTEL_POLICY &&
tests/unit/vtt/dm-tactical-intel.test.ts-93-        Array.isArray(intel['rows']) && intel['rows'].length > 0;
tests/unit/vtt/dm-tactical-intel.test.ts-94-    })).toBe(true);
tests/unit/vtt/dm-tactical-intel.test.ts-95-
tests/unit/vtt/dm-tactical-intel.test.ts-96-    const scout = capsule.projection.combatants.find((actor) => actor.id === SCOUT);
tests/unit/vtt/dm-tactical-intel.test.ts-97-    const fighter = capsule.projection.combatants.find((actor) => actor.id === FIGHTER);
tests/unit/vtt/dm-tactical-intel.test.ts-98-    if (scout?.placementStatus !== 'placed' || fighter?.placementStatus !== 'placed') {
tests/unit/vtt/dm-tactical-intel.test.ts-99-      throw new Error('Frozen R02 tokens are absent.');
--
tests/unit/vtt/scene-snapshot.test.ts-185-      expect(token).toMatchObject(expected);
tests/unit/vtt/scene-snapshot.test.ts-186-      if (token === undefined) throw new Error('Missing sized token.');
tests/unit/vtt/scene-snapshot.test.ts-187-      expect(groundAnchor({ x: token.x, y: token.y, z: token.z }, token.footprint))
tests/unit/vtt/scene-snapshot.test.ts-188-        .toEqual({ column: 1, row: 1 });
tests/unit/vtt/scene-snapshot.test.ts-189-    }
tests/unit/vtt/scene-snapshot.test.ts-190-  });
tests/unit/vtt/scene-snapshot.test.ts-191-
tests/unit/vtt/scene-snapshot.test.ts-192-  it('removes canonical token identity on a visible-to-hidden player transition', () => {
tests/unit/vtt/scene-snapshot.test.ts-193-    const state = fixtureState();
tests/unit/vtt/scene-snapshot.test.ts-194-    const binding = { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID };
tests/unit/vtt/scene-snapshot.test.ts-195-    const identities = canonicalTokenIdentityIndex(state.tokens);
tests/unit/vtt/scene-snapshot.test.ts-196-    const before = sceneSnapshot({
tests/unit/vtt/scene-snapshot.test.ts-197-      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
tests/unit/vtt/scene-snapshot.test.ts-198-      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
tests/unit/vtt/scene-snapshot.test.ts-199-    }).snapshot;
tests/unit/vtt/scene-snapshot.test.ts-200-    const monsterTokenId = String(state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID)?.id);
tests/unit/vtt/scene-snapshot.test.ts-201-    expect(before.tokens.map((token) => token.id)).toContain(monsterTokenId);
tests/unit/vtt/scene-snapshot.test.ts-202-    const hidden = {
tests/unit/vtt/scene-snapshot.test.ts-203-      ...state,
tests/unit/vtt/scene-snapshot.test.ts-204-      hiddenCombatants: [{
tests/unit/vtt/scene-snapshot.test.ts-205-        combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: '2024' as const,
tests/unit/vtt/scene-snapshot.test.ts-206-      }],
tests/unit/vtt/scene-snapshot.test.ts-207-    };
tests/unit/vtt/scene-snapshot.test.ts-208-    const after = sceneSnapshot({
tests/unit/vtt/scene-snapshot.test.ts-209-      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(hidden, binding), IDLE),
tests/unit/vtt/scene-snapshot.test.ts-210-      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
tests/unit/vtt/scene-snapshot.test.ts-211-    }).snapshot;
tests/unit/vtt/scene-snapshot.test.ts-212-    expect(after.tokens.map((token) => token.id)).not.toContain(monsterTokenId);
tests/unit/vtt/scene-snapshot.test.ts-213-  });
tests/unit/vtt/scene-snapshot.test.ts-214-
tests/unit/vtt/scene-snapshot.test.ts:215:  it('preserves full persisted request/coordinator bytes and the actual revision checksum', () => {
tests/unit/vtt/scene-snapshot.test.ts-216-    const state = fixtureState();
tests/unit/vtt/scene-snapshot.test.ts-217-    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
tests/unit/vtt/scene-snapshot.test.ts-218-    const coordinator: PersistedCoordinatorState = {
tests/unit/vtt/scene-snapshot.test.ts-219-      ...IDLE,
tests/unit/vtt/scene-snapshot.test.ts-220-      pendingRequest: {
tests/unit/vtt/scene-snapshot.test.ts-221-        kind: 'turn' as const,
tests/unit/vtt/scene-snapshot.test.ts-222-        requestId: 'request:handoff-baseline',
tests/unit/vtt/scene-snapshot.test.ts-223-        encounterRevision: state.revision,
tests/unit/vtt/scene-snapshot.test.ts-224-        actorId: REFERENCE_FIGHTER_ID,
tests/unit/vtt/scene-snapshot.test.ts-225-        visibleState: view,
tests/unit/vtt/scene-snapshot.test.ts-226-        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
tests/unit/vtt/scene-snapshot.test.ts-227-      },
tests/unit/vtt/scene-snapshot.test.ts-228-    };
tests/unit/vtt/scene-snapshot.test.ts-229-    const before = persistedByteBaseline(state, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-230-    const projection = projectPlayerBoard(view, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-231-    sceneSnapshot({
tests/unit/vtt/scene-snapshot.test.ts-232-      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
tests/unit/vtt/scene-snapshot.test.ts-233-      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
tests/unit/vtt/scene-snapshot.test.ts-234-    });
tests/unit/vtt/scene-snapshot.test.ts-235-    const after = persistedByteBaseline(state, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-236-    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
tests/unit/vtt/scene-snapshot.test.ts-237-    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
tests/unit/vtt/scene-snapshot.test.ts-238-    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
tests/unit/vtt/scene-snapshot.test.ts-239-    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
tests/unit/vtt/scene-snapshot.test.ts-240-    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
tests/unit/vtt/scene-snapshot.test.ts-241-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
tests/unit/vtt/scene-snapshot.test.ts-242-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
tests/unit/vtt/scene-snapshot.test.ts-243-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
tests/unit/vtt/scene-snapshot.test.ts-244-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
tests/unit/vtt/scene-snapshot.test.ts-245-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
src/combat/visibility-field.ts:8:  traceCombatantLineToCells,
src/combat/visibility-field.ts:9:  traceTerrainLine,
src/combat/visibility-field.ts:294:      return traceTerrainLine(context.state, context.observer.cell, target);
src/combat/visibility-field.ts:296:    return traceTerrainLine(context.state, context.observer.cell, target, {
src/combat/visibility-field.ts:301:    return traceCombatantLineToCells(context.state, context.observer.id, [target]);
src/combat/visibility-field.ts:303:  return traceCombatantLineToCells(context.state, context.observer.id, [target], {
tests/unit/combat/creature-cover.test.ts:2:import { coverBetweenCombatants, traceCombatantLine, type CreatureLineOptions } from '../../../src/combat/cover';
tests/unit/combat/creature-cover.test.ts:88:    const trace = traceCombatantLine(state, source.id, target.id);
tests/unit/combat/creature-cover.test.ts:110:    expect(traceCombatantLine(state, source.id, target.id)).toMatchObject({
tests/unit/combat/terrain.test.ts:3:import { rasterizeCornerLine, traceTerrainLine } from '../../../src/combat/cover';
tests/unit/combat/terrain.test.ts:94:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
tests/unit/combat/terrain.test.ts:111:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
tests/unit/combat/terrain.test.ts:124:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 0 });
tests/unit/combat/terrain.test.ts:126:      tier: 'half', blocksSight: false, sourceIds: ['blocked:2,0'], firstBlockingCell: null,
tests/unit/combat/terrain.test.ts:137:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
tests/unit/combat/terrain.test.ts:140:      firstBlockingCell: { column: 1, row: 0 },
tests/unit/combat/terrain.test.ts:153:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
tests/unit/combat/terrain.test.ts:167:    expect(traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 }))
tests/unit/combat/terrain.test.ts:177:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
tests/unit/combat/terrain.test.ts:203:      const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
src/combat/encounter.ts:53:  traceCombatantLine,
src/combat/encounter.ts:54:  traceCombatantLineToCells,
src/combat/encounter.ts:55:  traceTerrainLine,
src/combat/encounter.ts:2119:  return !traceTerrainLine(state, from, to).blocksSight;
src/combat/encounter.ts:2127:  return traceTerrainLine(state, from, to).tier;
src/combat/encounter.ts:7183:  const attackLine = traceCombatantLine(context.state, command.actor, command.target);
src/combat/encounter.ts:7477:  const selectedLine = traceCombatantLineToCells(context.state, command.actor, [command.square]);
src/combat/encounter.ts:8566:  const selectedLine = traceCombatantLine(context.state, command.actor, target);
src/combat/encounter.ts:9051:  const selectedLine = traceCombatantLineToCells(context.state, command.actor, targetCells);
src/combat/encounter.ts:10685:        const selectedLine = traceCombatantLineToCells(context.state, command.actor, [destination]);
tests/unit/vtt/tactical-evaluator-r02.test.ts:3:import { traceCombatantLine } from '../../../src/combat/cover';
tests/unit/vtt/tactical-evaluator-r02.test.ts:132:      const trace = traceCombatantLine(state, scoutId, FIGHTER);
tests/unit/vtt/challenge-room-fixtures.test.ts:6:import { traceCombatantLine } from '../../../src/combat/cover';
tests/unit/vtt/challenge-room-fixtures.test.ts:217:    expect(traceCombatantLine(state, ogre, 'combatant:fighter' as CombatantId)).toMatchObject({ tier: 'none', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:218:    expect(traceCombatantLine(state, ogre, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'half', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:255:      const fighterTrace = traceCombatantLine(state, 'combatant:fighter' as CombatantId, ogre);
tests/unit/vtt/challenge-room-fixtures.test.ts:256:      const clericTrace = traceCombatantLine(state, 'combatant:cleric' as CombatantId, ogre);
tests/unit/vtt/challenge-room-fixtures.test.ts:263:      expect(traceCombatantLine(state, ogre, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'none', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:288:      expect(traceCombatantLine(approached, 'combatant:fighter' as CombatantId, ogre, {
tests/unit/vtt/challenge-room-fixtures.test.ts:291:      expect(traceCombatantLine(approached, 'combatant:cleric' as CombatantId, ogre, {
tests/unit/vtt/challenge-room-fixtures.test.ts:331:    expect(traceCombatantLine(state, scouts[0]!, 'combatant:fighter' as CombatantId)).toMatchObject({ tier: 'half', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:332:    expect(traceCombatantLine(state, scouts[1]!, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'three_quarters', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:347:    expect(traceCombatantLine(initial, fighter, guard)).toMatchObject({ tier: 'none', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:353:    expect(traceCombatantLine(initial, scout1, fighter)).toMatchObject({ tier: 'half', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:354:    expect(traceCombatantLine(initial, scout2, wizard)).toMatchObject({ tier: 'three_quarters', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:380:    expect(traceCombatantLine(killed.state, scout1, fighter)).toMatchObject({ tier: 'none', blocksSight: false });
tests/unit/vtt/challenge-room-fixtures.test.ts:381:    expect(traceCombatantLine(killed.state, scout2, wizard)).toMatchObject({ tier: 'three_quarters', blocksSight: false });
tests/unit/tools/ai-dm-screenshot-probe.test.ts:9:  traceCombatantLine,
tests/unit/tools/ai-dm-screenshot-probe.test.ts:10:  traceTerrainLine,
tests/unit/tools/ai-dm-screenshot-probe.test.ts:743:    const featureTrace = traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:769:    const threeHalfTrace = traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:792:    const fourHalfTrace = traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:812:      traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:834:      traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:853:    const creatureTrace = traceCombatantLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:877:      traceCombatantLine(deadCreatureState, creatureSource.id, creatureTarget.id),
tests/unit/tools/ai-dm-screenshot-probe.test.ts:894:    const largeTrace = traceCombatantLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:900:      traceTerrainLine(
tests/unit/tools/ai-dm-screenshot-probe.test.ts:1222:      traceCombatantLine: () => {
tests/unit/tools/ai-dm-screenshot-probe.test.ts:1226:      traceCombatantLineToCells: () => {
tests/unit/vtt/dm-tactical-intel.test.ts:21:import { traceCombatantLine } from '../../../src/combat/cover';
tests/unit/vtt/dm-tactical-intel.test.ts:116:    const trace = traceCombatantLine(state, SCOUT, FIGHTER);
tests/unit/vtt/last-seen.test.ts:8:import { traceCombatantLine } from '../../../src/combat/cover';
tests/unit/vtt/last-seen.test.ts:198:    const blockedTrace = traceCombatantLine(state, blocked.id, subject.id);
tests/unit/vtt/last-seen.test.ts:200:    expect(traceCombatantLine(state, seeing.id, subject.id).blocksSight).toBe(false);
tests/unit/vtt/room-generator-los-cover.test.ts:5:  traceCombatantLine,
tests/unit/vtt/room-generator-los-cover.test.ts:6:  traceCombatantLineToCells,
tests/unit/vtt/room-generator-los-cover.test.ts:88:      traceCombatantLine(state, source.profile.id, target.profile.id))),
tests/unit/vtt/room-generator-los-cover.test.ts:90:      traceCombatantLine(state, source.profile.id, target.profile.id))),
tests/unit/vtt/room-generator-los-cover.test.ts:105:          traces.push(traceCombatantLineToCells(state, source.profile.id, [target]));
tests/unit/vtt/room-generator-los-cover.test.ts:188:    const current = traceCombatantLine(state, actor.profile.id, opponent.profile.id);
tests/unit/vtt/room-generator-los-cover.test.ts:199:        const changed = traceCombatantLine(state, actor.profile.id, opponent.profile.id, {
tests/unit/vtt/room-generator-los-cover.test.ts:222:      if (!opponents.some((opponent) => !traceCombatantLine(
tests/unit/vtt/room-generator-los-cover.test.ts:273:    const closedTrace = traceCombatantLine(state, source.id, target.id);
tests/unit/vtt/room-generator-los-cover.test.ts:277:      firstBlockingCell: { column: 8, row: 5 },
tests/unit/vtt/room-generator-los-cover.test.ts:286:    const openedTrace = traceCombatantLine(opened, source.id, target.id);
tests/unit/vtt/engine-query-port.test.ts:10:import { traceCombatantLine } from '../../../src/combat/cover';
tests/unit/vtt/engine-query-port.test.ts:487:    const partialTrace = traceCombatantLine(partial, actor.id, target.id);
tests/unit/vtt/engine-query-port.test.ts:510:    expect(traceCombatantLine(walled, actor.id, target.id)).toMatchObject({ tier: 'total', blocksSight: true });
tests/unit/vtt/engine-query-port.test.ts:529:    expect(traceCombatantLine(closed.state, closed.actorId, closed.targetId)).toMatchObject({
tests/unit/vtt/engine-query-port.test.ts:532:      firstBlockingCell: { column: 8, row: 5 },
tests/unit/vtt/engine-query-port.test.ts:544:    expect(traceCombatantLine(opened.state, opened.actorId, opened.targetId)).toMatchObject({
tests/unit/vtt/engine-query-port.test.ts:561:    expect(traceCombatantLine(blocked.state, blocked.actorId, blocked.targetId)).toMatchObject({
tests/unit/vtt/engine-query-port.test.ts:576:    expect(traceCombatantLine(opened.state, opened.actorId, opened.targetId)).toMatchObject({
tests/unit/vtt/engine-query-port.test.ts:634:              const trace = traceCombatantLine(executionState, monster.profile.id, targetId, {
tests/unit/tools/ai-dm-knowledge-base.test.ts:21:import { traceCombatantLine, traceTerrainLine, type TerrainLineTrace } from '../../../src/combat/cover';
tests/unit/tools/ai-dm-knowledge-base.test.ts:595:      guideTraceSummary('Feature trace', traceTerrainLine(
tests/unit/tools/ai-dm-knowledge-base.test.ts:600:      guideTraceSummary('Creature trace', traceCombatantLine(creatureState, source.id, target.id)),
tests/unit/tools/ai-dm-knowledge-base.test.ts:601:      guideTraceSummary('Large-source trace', traceCombatantLine(largeState, large.id, largeTarget.id)),
tests/unit/tools/los-cover-call-sites.test.ts:43:    expect(source('src/combat/cover.ts')).toContain('export function traceTerrainLine');
tests/unit/tools/los-cover-call-sites.test.ts:44:    expect(source('src/combat/cover.ts')).toContain('export function traceCombatantLine');
tests/unit/combat/visibility-field.test.ts:7:  traceCombatantLineToCells,
tests/unit/combat/visibility-field.test.ts:8:  traceTerrainLine,
tests/unit/combat/visibility-field.test.ts:228:    firstBlockingCell: trace.firstBlockingCell,
tests/unit/combat/visibility-field.test.ts:1015:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
tests/unit/combat/visibility-field.test.ts:1021:      firstBlockingCell: { column: 5, row: 3 },
tests/unit/combat/visibility-field.test.ts:1032:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
tests/unit/combat/visibility-field.test.ts:1035:    expect(trace).toMatchObject({ blocksSight: false, firstBlockingCell: null });
tests/unit/combat/visibility-field.test.ts:1045:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
tests/unit/combat/visibility-field.test.ts:1050:      firstBlockingCell: { column: 5, row: 3 },
tests/unit/combat/visibility-field.test.ts:1064:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
tests/unit/combat/visibility-field.test.ts:1071:      firstBlockingCell: { column: 2, row: 1 },
tests/unit/combat/visibility-field.test.ts:1088:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
tests/unit/combat/visibility-field.test.ts:1093:    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
tests/unit/combat/visibility-field.test.ts:1094:    expect(oneSidedCorner).toMatchObject({ blocksSight: false, firstBlockingCell: null });
tests/unit/combat/visibility-field.test.ts:1112:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
tests/unit/combat/visibility-field.test.ts:1119:    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 7, row: 3 } });
tests/unit/combat/visibility-field.test.ts:1134:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
tests/unit/combat/visibility-field.test.ts:1141:    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 8, row: 3 } });
tests/unit/combat/visibility-field.test.ts:1155:    const trace = traceTerrainLine(state, { column: 5, row: 0 }, { column: 5, row: 6 });
tests/unit/combat/visibility-field.test.ts:1162:    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 4, row: 2 } });
tests/unit/combat/visibility-field.test.ts:1176:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
tests/unit/combat/visibility-field.test.ts:1183:    expect(splitRay).toMatchObject({ blocksSight: false, firstBlockingCell: null });
tests/unit/combat/visibility-field.test.ts:1195:    const trace = traceTerrainLine(state, { column: 0, row: 2 }, { column: 4, row: 2 });
tests/unit/combat/visibility-field.test.ts:1201:    expect(outerFace).toMatchObject({ blocksSight: false, firstBlockingCell: null });
tests/unit/combat/visibility-field.test.ts:1215:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
tests/unit/combat/visibility-field.test.ts:1221:      firstBlockingCell: { column: 1, row: 1 },
tests/unit/combat/visibility-field.test.ts:1231:    const trace = traceTerrainLine(
tests/unit/combat/visibility-field.test.ts:1246:      firstBlockingCell: { column: 1, row: 0 },
tests/unit/combat/visibility-field.test.ts:1249:    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
tests/unit/vtt/tactical-evaluator-r02.test.ts:17:  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
tests/unit/vtt/tactical-evaluator-r02.test.ts:22:  combatantId('combatant:generated-5117009-monster-3'),
tests/unit/vtt/tactical-evaluator-r02.test.ts:23:  combatantId('combatant:generated-5117009-monster-5'),
tests/unit/vtt/tactical-evaluator-r02.test.ts:25:const PRIEST = combatantId('combatant:generated-5117009-monster-1');
tests/unit/vtt/tactical-evaluator-r02.test.ts:27:  combatantId('combatant:generated-5117009-monster-4'),
tests/unit/vtt/tactical-evaluator-r02.test.ts:28:  combatantId('combatant:generated-5117009-monster-6'),
tests/unit/vtt/tactical-evaluator-r02.test.ts:62:  firstScout: { miss: 15, normalHit: 4, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:63:  secondScout: { miss: 18, normalHit: 1, criticalHit: 1, denominator: 20 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:70:  firstScout: { miss: 25, normalHit: 13, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:71:  secondScout: { miss: 31, normalHit: 7, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:76:  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts:77:  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts:80:function reauthoredClearScoutShot(state: EncounterState): EncounterState {
tests/unit/vtt/tactical-evaluator-r02.test.ts:90:  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
tests/unit/vtt/tactical-evaluator-r02.test.ts:91:    const state = reauthoredClearScoutShot(await frozenState());
tests/unit/vtt/tactical-evaluator-r02.test.ts:92:    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
tests/unit/vtt/tactical-evaluator-r02.test.ts:100:        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:106:        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
tests/unit/vtt/tactical-evaluator-r02.test.ts:113:      const scoutId = geometry.scoutId;
tests/unit/vtt/tactical-evaluator-r02.test.ts:114:      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
tests/unit/vtt/tactical-evaluator-r02.test.ts:117:      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
tests/unit/vtt/tactical-evaluator-r02.test.ts:119:        actorId: scoutId,
tests/unit/vtt/tactical-evaluator-r02.test.ts:125:        scoutId,
tests/unit/vtt/tactical-evaluator-r02.test.ts:129:      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
tests/unit/vtt/tactical-evaluator-r02.test.ts:131:      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
tests/unit/vtt/tactical-evaluator-r02.test.ts:132:      const trace = traceCombatantLine(state, scoutId, FIGHTER);
tests/unit/vtt/tactical-evaluator-r02.test.ts:133:      expect(state.tokens.find((token) => token.combatantId === scoutId)?.position).toEqual(geometry.position);
tests/unit/vtt/tactical-evaluator-r02.test.ts:144:        scoutId,
tests/unit/vtt/tactical-evaluator-r02.test.ts:222:    const scoutOptions = SCOUTS.map((actorId) => attacks(actorId, 'longbow', 2));
tests/unit/vtt/tactical-evaluator-r02.test.ts:231:      choices: [priestOption, ...scoutOptions, ...banditOptions].map((option) => ({
tests/unit/vtt/tactical-evaluator-r02.test.ts:239:    const scoutScoutPriest = [PRIEST, ...SCOUTS] as const;
tests/unit/vtt/tactical-evaluator-r02.test.ts:240:    const scoutScoutBandit = [...SCOUTS, BANDITS[0]] as const;
tests/unit/vtt/tactical-evaluator-r02.test.ts:243:      candidate('bless-scout-scout-priest', priestBless, scoutScoutPriest),
tests/unit/vtt/tactical-evaluator-r02.test.ts:244:      candidate('bless-scout-scout-bandit', priestBless, scoutScoutBandit),
tests/unit/vtt/tactical-evaluator-r02.test.ts:246:      candidate('bless-only-priest-no-attacks', priestBlessOnly, scoutScoutBandit),
tests/unit/vtt/tactical-evaluator-r02.test.ts:264:    // Scout m3's (19,3) shot followed row 3 between blockers (10,2)/(10,3), so it is no longer offered
tests/unit/vtt/tactical-evaluator-r02.test.ts:270:    // (3/20 * 5.5) + (1/20 * 10) = 1.325 expected damage. Unchanged Scout m5 contributes 1.75 and
tests/unit/vtt/tactical-evaluator-r02.test.ts:284:    // At Scout m3's (18,4) half/false origin the rows are (14,5,1), (13,6,1), (12,7,1),
tests/unit/vtt/tactical-evaluator-r02.test.ts:287:    // Blessed damage is therefore Priest 2*((19/40*11)+(2/40*22))=12.65, Scout m3
tests/unit/vtt/tactical-evaluator-r02.test.ts:290:    // bless-scout-scout-priest uses the same resolved origins/traces above. In initiative order its weights
tests/unit/vtt/tactical-evaluator-r02.test.ts:296:    expect(probability('bless-scout-scout-priest')).toBeCloseTo(deathSaveKillProbability([
tests/unit/vtt/tactical-evaluator-r02.test.ts:298:      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:299:      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:304:    // bless-scout-scout-bandit resolves P1 at (13,4) none/false, S3 at (18,4) half/false, and B4 at
tests/unit/vtt/tactical-evaluator-r02.test.ts:310:    expect(probability('bless-scout-scout-bandit')).toBeCloseTo(deathSaveKillProbability([
tests/unit/vtt/tactical-evaluator-r02.test.ts:312:      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:313:      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:324:      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:325:      ...repeated(BASE_FAILURE_WEIGHTS.secondScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:337:      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:338:      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:345:    const firstScoutOption = scoutOptions[0];
tests/unit/vtt/tactical-evaluator-r02.test.ts:346:    const secondScoutOption = scoutOptions[1];
tests/unit/vtt/tactical-evaluator-r02.test.ts:350:      firstScoutOption === undefined || secondScoutOption === undefined ||
tests/unit/vtt/tactical-evaluator-r02.test.ts:354:      allocationId: 'bless-after-first-scout',
tests/unit/vtt/tactical-evaluator-r02.test.ts:355:      choices: [firstScoutOption, delayedBlessOption, secondScoutOption, firstBanditOption, secondBanditOption]
tests/unit/vtt/tactical-evaluator-r02.test.ts:357:      modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: scoutScoutPriest }],
tests/unit/vtt/tactical-evaluator-r02.test.ts:369:      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
tests/unit/vtt/tactical-evaluator-r02.test.ts:371:      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
tests/unit/vtt/dm-tactical-intel.test.ts:30:const SCOUT = combatantId('combatant:generated-5117009-monster-3');
tests/unit/vtt/dm-tactical-intel.test.ts:32:function reauthoredClearScoutShot(state: EncounterState): EncounterState {
tests/unit/vtt/dm-tactical-intel.test.ts:49:  const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/dm-tactical-intel.test.ts:70:    const loaded = reauthoredClearScoutShot(
tests/unit/vtt/dm-tactical-intel.test.ts:71:      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/vtt/dm-tactical-intel.test.ts:79:    // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
tests/unit/vtt/dm-tactical-intel.test.ts:96:    const scout = capsule.projection.combatants.find((actor) => actor.id === SCOUT);
tests/unit/vtt/dm-tactical-intel.test.ts:98:    if (scout?.placementStatus !== 'placed' || fighter?.placementStatus !== 'placed') {
tests/unit/vtt/dm-tactical-intel.test.ts:104:        playerDistances.push(gridDistance(scout.position, target.position));
tests/unit/vtt/dm-tactical-intel.test.ts:108:    expect(gridDistance(scout.position, fighter.position)).toBe(90);
tests/unit/vtt/dm-tactical-intel.test.ts:111:    const scoutContext = record(actors.find((value) => record(value, 'actor')['actor_id'] === SCOUT), 'scout context');
tests/unit/vtt/dm-tactical-intel.test.ts:112:    const intel = record(scoutContext['intel'], 'scout intel');
tests/unit/vtt/dm-tactical-intel.test.ts:114:    if (!Array.isArray(rows)) throw new TypeError('Scout intel rows are absent.');
tests/unit/vtt/dm-tactical-intel.test.ts:159:    if (exact === undefined) throw new Error('Exact Scout-to-Fighter row is absent.');
src/authoring/bundled-homebrew-catalog.ts:171:    'Veterans survive through practiced technique, broad experience, and the ability to perform reliably under pressure. Some are retired soldiers, seasoned scouts, professional adventurers, bounty hunters, or survivors who have learned a little about nearly everything.',
src/authoring/bundled-homebrew-catalog.ts:275:  reference_text: 'Veterans survive through practiced technique, broad experience, and the ability to perform reliably under pressure. Some are retired soldiers, seasoned scouts, professional adventurers, bounty hunters, or survivors who have learned a little about nearly everything. A Veteran rarely relies on luck: their attacks find vulnerable openings even when they fall short, and their years of experience eventually make them capable in almost any situation.',
src/combat/statblocks/kb/entries.ts:31:  { ruleId: 'R-MONSTER-021', monsterId: 'statblock:scout', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21130-21164', rulingGuidance: 'Make two Shortsword or Longbow attacks in any combination.' },
src/combat/statblocks/mercenary-company.ts:41:const scoutAbilities = abilityLines([11, 0, 0], [14, 2, 2], [12, 1, 1], [11, 0, 0], [13, 1, 1], [11, 0, 0]);
src/combat/statblocks/mercenary-company.ts:43:  id: 'statblock:scout', name: 'Scout', armorClass: 13, hitPointMaximum: 16, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/mercenary-company.ts:44:  savingThrowBonuses: savingThrowBonuses(scoutAbilities), attacksPerAction: 2, usesDeathSaves: false,
src/combat/statblocks/mercenary-company.ts:46:    ...baseDetails([{ path: SRD_PATH, lineStart: 21130, lineEnd: 21164 }], { sizes: ['Medium', 'Small'], type: 'Humanoid', subtype: null, alignment: 'Neutral' }, { rating: '1/2', experiencePoints: 100, proficiencyBonus: 2 }, { count: 3, sides: 8, modifier: 3 }, 30, scoutAbilities),
src/combat/statblocks/astral-tower.ts:560:const familiarProvenance = cleanRoomProvenance('Familiar', lowGroupAnchor, { armorClass: [10, 16], hitPoints: [4, 12], dpr: [3, 7] }, 'small roaming familiar/scout');
src/combat/statblocks/homebrew-beast-families.ts:48:  readonly druidLevelEquivalent: 'low-cr-flavor-or-scouting' | 3 | 6 | 9 | 12 | 15 | 18;
src/combat/statblocks/homebrew-beast-families.ts:89:const DRUID_LEVEL = ['low-cr-flavor-or-scouting', 'low-cr-flavor-or-scouting', 3, 6, 9, 12, 15, 18] as const;
src/combat/statblocks/homebrew-beast-families.ts:273:    druidLevelEquivalent: DRUID_LEVEL[index] ?? 'low-cr-flavor-or-scouting',
src/combat/statblocks/roster.ts:51:  { id: 'statblock:scout', name: 'Scout', family: 'mercenary_company', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 21130, lineEnd: 21164 }], selectionNote: null, statblock: SCOUT },
src/vtt/d365-sample-dungeon.ts:129:        { statblockId: 'statblock:scout', position: { column: 8, row: 1 } },
src/vtt/room-generator.ts:280:const HARD_RANGED_ID = 'statblock:scout';
src/vtt/room-generator.ts:670:    ['statblock:bandit', 'statblock:guard', 'statblock:scout', 'statblock:tough'].includes(row.id));
src/vtt/challenge-feasibility.ts:185:const D_SCOUT_1 = 'combatant:generated-challenge-d-02-scout-1' as CombatantId;
src/vtt/challenge-feasibility.ts:186:const D_SCOUT_2 = 'combatant:generated-challenge-d-03-scout-2' as CombatantId;
src/vtt/challenge-feasibility.ts:194:  expectedScoutPrimaryTurns: '101/64' as const,
src/vtt/challenge-feasibility.ts:408:  coverProbeCosts: Object.freeze({ livingGuard: 124, deadGuard: 140, scout2EitherState: 124 }),
src/vtt/challenge-feasibility.ts:526:    throw new Error('Room D bounded terminal state must advance to living Scout 1.');
src/vtt/challenge-feasibility.ts:528:  const scout = state.combatants.find((combatant) => combatant.profile.id === D_SCOUT_1);
src/vtt/challenge-feasibility.ts:530:  if (scout?.life !== 'living' || guard === undefined) {
src/vtt/challenge-feasibility.ts:1075:  if (genericSave?.type !== 'force_save') throw new Error('Room D Fighter generic save against Scout 1 is absent.');
src/vtt/challenge-feasibility.ts:1253:        id: `knight-${String(knightHp)}-row-${String(row)}-order-${swapped ? 'cleric-scout' : 'scout-cleric'}`,
src/vtt/challenge-feasibility.ts:1255:          positioned, 'combatant:generated-challenge-a-03-scout' as CombatantId, CLERIC, swapped,
src/vtt/challenge-room-fixture.ts:46:  'scout_followup_execution_probability';
src/vtt/challenge-room-fixture.ts:290:        'allied_followup_execution_probability', 'scout_followup_execution_probability',

exec
/bin/bash -lc "sed -n '1,190p' tests/unit/vtt/dm-tactical-intel.test.ts
sed -n '75,180p' tests/unit/vtt/tactical-evaluator-r02.test.ts
sed -n '2600,2865p' tests/unit/tools/ai-dm-conversation.test.ts
sed -n '1,285p' tests/unit/vtt/scene-snapshot.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import { gridDistance } from '../../../src/combat/grid';
import { combatantId } from '../../../src/combat/values';
import {
  DM_INTEL_CAPTURE_POLICY,
  DM_INTEL_QUERY_POLICY,
  DM_TURN_INTEL_POLICY,
  exactDmIntelMatrix,
  renderDmIntelRow,
  salientInitiativeWindow,
} from '../../../src/vtt/dm-tactical-intel';
import {
  createEngineStateCapsuleForEnvironment,
  type EngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import { ENGINE_FAILURE_MODES_POLICY } from '../../../src/vtt/engine-failure-modes';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { TURN_CONTEXT_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { traceCombatantLine } from '../../../src/combat/cover';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

const FIGHTER = combatantId('combatant:fighter');
const SCOUT = combatantId('combatant:generated-5117009-monster-3');

function reauthoredClearScoutShot(state: EncounterState): EncounterState {
  return {
    ...state,
    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
      ? { column: 9, row: 2 }
      : cell),
  };
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

async function r02Runtime(profile: 'dm' | 'full' = 'dm', turnContextMaximumBytes?: number) {
  const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
  const state = freshMonsterPlanningState(loaded);
  const runtime = createEngineMcpRuntime(state, {
    toolProfile: profile,
    offerEnvironment: OFFER_ENVIRONMENT,
    ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
  });
  return { state, runtime, capsule: runtime.feed.current() };
}

function fullContext(runtime: ReturnType<typeof createEngineMcpRuntime>, capsule: EngineStateCapsule) {
  return record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }), 'full context');
}

describe('versioned DM tactical intel', () => {
  it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
    const loaded = reauthoredClearScoutShot(
      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
    );
    const state = freshMonsterPlanningState(loaded);
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const context = fullContext(runtime, capsule);
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Actor contexts are absent.');
    const requested = capsule.request?.actors ?? [];
    expect(actors).toHaveLength(requested.length);
    expect(actors.every((value) => {
      const intel = record(record(value, 'actor')['intel'], 'actor intel');
      return intel['policy'] === DM_TURN_INTEL_POLICY &&
        Array.isArray(intel['rows']) && intel['rows'].length > 0;
    })).toBe(true);

    const scout = capsule.projection.combatants.find((actor) => actor.id === SCOUT);
    const fighter = capsule.projection.combatants.find((actor) => actor.id === FIGHTER);
    if (scout?.placementStatus !== 'placed' || fighter?.placementStatus !== 'placed') {
      throw new Error('Frozen R02 tokens are absent.');
    }
    const playerDistances: number[] = [];
    for (const target of capsule.projection.combatants) {
      if (target.placementStatus === 'placed' && target.side === 'player_character' && target.life !== 'dead') {
        playerDistances.push(gridDistance(scout.position, target.position));
      }
    }
    const nearestDistance = Math.min(...playerDistances);
    expect(gridDistance(scout.position, fighter.position)).toBe(90);
    expect(nearestDistance).toBe(85);

    const scoutContext = record(actors.find((value) => record(value, 'actor')['actor_id'] === SCOUT), 'scout context');
    const intel = record(scoutContext['intel'], 'scout intel');
    const rows = intel['rows'];
    if (!Array.isArray(rows)) throw new TypeError('Scout intel rows are absent.');
    const fighterRow = record(rows.find((value) => record(value, 'intel row')['target_id'] === FIGHTER), 'fighter row');
    const trace = traceCombatantLine(state, SCOUT, FIGHTER);
    expect({
      sourceCorner: trace.sourceCorner,
      lineTiers: trace.lines.map((line) => line.tier),
      coverTier: trace.tier,
    }).toEqual({
      sourceCorner: { column: 19, row: 3 },
      lineTiers: ['total', 'total', 'none', 'none'],
      coverTier: 'half',
    });
    expect(fighterRow).toMatchObject({
      target_id: FIGHTER,
      attacks: 2,
      visibility: 'VISIBLE',
      cover: 'HALF',
      range: 'NORMAL',
      distance_feet: 90,
      roll_mode: 'STRAIGHT',
      p_hit: '≈1/2',
      ev: 4,
      movement_need_feet: 0,
    });
    expect(fighterRow['reason_codes']).toEqual([
      'unconscious_advantage',
      'prone_ranged_disadvantage',
    ]);
    expect(fighterRow['consequence_codes']).toEqual([
      'death_failure_on_hit',
      'two_death_failures_on_critical',
      'automatic_critical_within_5_feet',
    ]);
    expect(JSON.stringify(context)).toContain('STRAIGHT');
    expect(JSON.stringify(context)).toContain('unconscious_advantage');
    expect(JSON.stringify(context)).toContain('prone_ranged_disadvantage');
    expect(context['known_failure_modes']).toMatchObject({ policy: ENGINE_FAILURE_MODES_POLICY });
    expect(new TextEncoder().encode(JSON.stringify(context)).byteLength).toBeLessThanOrEqual(TURN_CONTEXT_MAX_BYTES);
    expect(state.combatants.find((actor) => actor.profile.id === FIGHTER)?.life).toBe('dying');
  });

  it('keeps exact probability internally while both context and query render coarse values', async () => {
    const { state, runtime, capsule } = await r02Runtime();
    const exact = exactDmIntelMatrix(state, capsule, OFFER_ENVIRONMENT.queries)
      .find((row) => row.actorId === SCOUT && row.targetId === FIGHTER);
    if (exact === undefined) throw new Error('Exact Scout-to-Fighter row is absent.');
    // Half Cover makes each +4 Longbow shot hit AC 20 on 16-20: 5/20.
    // Two independent shots therefore hit at least once with 1 - (15/20)^2 = 7/16.
    expect(exact.hitProbability).toBeCloseTo(7 / 16, 12);
    // Per shot: four normal hits at 6.5 plus one critical at 11, over 20 faces.
    expect(exact.expectedDamage).toBe(2 * ((4 / 20) * 6.5 + (1 / 20) * 11));
    expect(renderDmIntelRow(exact)).toMatchObject({ p_hit: '≈1/2', ev: 4 });

    const first = record(runtime.toolSurface.execute('engine.query_tactical_intel', {
      state_ref: {
        run_id: capsule.runId,
        state_handle: `engine-state:${capsule.digest}`,
        expected_revision: capsule.revision,
      },
      actor_ids: [SCOUT],
      target_ids: [FIGHTER],
      page: { maximum_items: 1 },
      initiative: { mode: 'full' },
    }), 'tactical query');
    expect(first).toMatchObject({
      policy: DM_INTEL_QUERY_POLICY,
      renderer_policy: DM_TURN_INTEL_POLICY,
      evaluator_policy: 'tactical-evaluator-v3',
      truncated: false,
    });
    expect(first['rows']).toEqual([expect.objectContaining({ p_hit: '≈1/2', ev: 4 })]);
    expect(JSON.stringify(first)).not.toContain('0.4375');
  });

  it('paginates the full matrix with a state-bound cursor and advertises the read tool to the DM', async () => {
    const { runtime, capsule } = await r02Runtime();
    expect(runtime.toolSurface.tools.map((tool) => tool.name)).toContain('engine.query_tactical_intel');
async function frozenState(): Promise<EncounterState> {
  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
}

function reauthoredClearScoutShot(state: EncounterState): EncounterState {
  return {
    ...state,
    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
      ? { column: 9, row: 2 }
      : cell),
  };
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
    const state = reauthoredClearScoutShot(await frozenState());
    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const handGeometry = [
      {
        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
        lineTiers: ['total', 'total', 'none', 'none'], coverTier: 'half',
        probabilities: { status: 'resolved', hit: 5 / 20, critical: 1 / 20, miss: 15 / 20 },
        expectedDamage: (4 / 20) * 6.5 + (1 / 20) * 11,
      },
      {
        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
        lineTiers: ['total', 'total', 'none', 'total'], coverTier: 'three_quarters',
        probabilities: { status: 'resolved', hit: 2 / 20, critical: 1 / 20, miss: 18 / 20 },
        expectedDamage: (1 / 20) * 6.5 + (1 / 20) * 11,
      },
    ] as const;
    const rows = handGeometry.map((geometry) => {
      const scoutId = geometry.scoutId;
      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = OFFER_ENVIRONMENT.queries.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      const trace = traceCombatantLine(state, scoutId, FIGHTER);
      expect(state.tokens.find((token) => token.combatantId === scoutId)?.position).toEqual(geometry.position);
      expect({
        sourceCorner: trace.sourceCorner,
        lineTiers: trace.lines.map((line) => line.tier),
        coverTier: trace.tier,
      }).toEqual({
        sourceCorner: geometry.sourceCorner,
        lineTiers: geometry.lineTiers,
        coverTier: geometry.coverTier,
      });
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
        expectedProbabilities: geometry.probabilities,
        expectedDamage: geometry.expectedDamage,
      };
    });

    for (const row of rows) {
      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
      expect(row.minimumMovementFeet).toBe(0);
      expect(row.range).toEqual({
        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
      });
      expect(row.rollMode).toMatchObject({
        mode: 'normal',
        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
      });
      // +4 attacks the hand-counted Half/Three-Quarters adjusted AC above.
      expect(row.probabilities).toEqual(row.expectedProbabilities);
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',
        normalHitAverage: 6.5,
        criticalHitAverage: 11,
        expectedDamage: row.expectedDamage,
      });
      expect(row.consequences).toEqual({
        deathFailureOnHit: true,
        failuresOnHit: 1,
        failuresOnCritical: 2,
        automaticCriticalOnHit: false,
    });
    const firstRoom = await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
    const capturedActorKnowledge = firstRoom.combatants
      .filter((combatant) => combatant.profile.kind === 'monster')
      .map((combatant) => projectActorKnowledge(firstRoom, combatant.profile.id));

    expect(result.rows).toHaveLength(4);
    expect(result.rows.map((row) => row.outcome)).toEqual([
      'authorized', 'authorized', 'authorized', 'authorized',
    ]);
    expect(result.rows.every((row) => row.refusals.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.sessionId === null && row.escalationSessionId === null)).toBe(true);
    expect(new Set(result.rows.map((row) => row.sessionIdHash)).size).toBe(1);
    expect(result.rows[0]?.toolCalls).toBe(2);
    expect(result.rows[0]?.agentDispatched).toBe(true);
    expect(result.rows[0]).toEqual(expect.objectContaining({
      plannedBy: null, planner: 'engine_default', autoSubmitBlocks: [],
      escalated: false, escalationModel: null,
    }));
    expect(result.rows[0]?.chainEvidence).toEqual({
      failedAttempts: expect.arrayContaining([
        expect.objectContaining({ attempt: 'primary' }),
        expect.objectContaining({ attempt: 'fallback' }),
        expect.objectContaining({ attempt: 'correction' }),
      ]),
      autoResolvedTrigger: expect.stringContaining('engine auto-submitted'),
      correctionFinalText: 'SIMULATED — proposal delivered through engine MCP spool',
    });
    expect(result.rows[0]?.proposalId).toContain('engine-default:');
    expect(result.rows[0]?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'engine_default',
      autoSubmitBlocks: [],
      intelPolicyVersions: {
        movement: 'movement-options-v2',
        opportunityCost: 'opportunity-cost-v1',
        teamScorer: 'team-scorer-v1',
        correction: 'dominance-correction-v1',
        materialityContext: 'materiality-context-v1',
        actorKnowledge: 'actor-knowledge-last-seen-v4',
        reactionSpendHold: 'reaction-spend-hold-v1',
        legendaryWindows: 'legendary-windows-v2',
        recoveryCapability: 'recovery-capability-v2',
      },
    }));
    // Fixture bands, hand-computed:
    // cleric hp 52 of max 52 = 100% -> band uninjured; effective AC 18 + 1 = 19 -> heavily_defended.
    // fighter hp 51 of max 67 = 76.1% -> band bloodied; AC 18 -> heavily_defended.
    // wizard hp 38 of max 38 = 100% -> band uninjured; AC 15 -> guarded.
    const projectedTargets = (distances: readonly [number, number, number]) => [
      {
        kind: 'perceived',
        targetId: 'combatant:cleric',
        placementStatus: 'placed',
        position: { column: 2, row: 4 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 2, row: 4 }],
        distanceFeet: distances[0],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:fighter',
        placementStatus: 'placed',
        position: { column: 1, row: 2 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 1, row: 2 }],
        distanceFeet: distances[1],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'heavily_defended' },
        hitPoints: { kind: 'perceived_band', band: 'bloodied' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
      {
        kind: 'perceived',
        targetId: 'combatant:wizard',
        placementStatus: 'placed',
        position: { column: 1, row: 6 },
        effectiveSize: 'Medium',
        placementMode: { kind: 'normal', actual: 'Medium' },
        footprint: [{ column: 1, row: 6 }],
        distanceFeet: distances[2],
        conditions: [],
        armorClass: { kind: 'perceived_band', band: 'guarded' },
        hitPoints: { kind: 'perceived_band', band: 'uninjured' },
        reciprocalVisibility: { kind: 'perceived', targetCanSeeActor: true },
        reaction: { kind: 'unknown' },
      },
    ];
    expect(capturedActorKnowledge).toEqual([
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-1',
        targets: projectedTargets([70, 75, 75]),
      },
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-2',
        targets: projectedTargets([65, 70, 70]),
      },
      {
        policy: 'actor-knowledge-last-seen-v4',
        actorId: 'combatant:generated-3943001-monster-3',
        targets: projectedTargets([70, 75, 75]),
      },
    ]);
    expect(result.rows[0]?.authorizedPlan?.some((entry) =>
      entry.resolutionSummary.actionSlots.some((slot) => slot.kind === 'dodge'))).toBe(false);
    expect(result.rows[1]?.proposalId).toContain('round:');
    expect(result.rows[0]?.projectionRevision).toBeGreaterThan(result.rows[0]?.contextRevision ?? 0);
    expect(result.rows[1]?.contextRevision).toBe(result.rows[0]?.projectionRevision);
    expect(result.rows[2]?.contextRevision).toBeGreaterThan(result.rows[1]?.projectionRevision ?? 0);
    expect(result.binding?.sessionId).toBe('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(result.binding).not.toBeNull();
    if (result.binding === null) throw new Error('SIMULATED run lost its agent binding.');
    expect(result.binding.lastDispatchedRevision).toBeGreaterThan(result.binding.startedAtRevision);
    expect(result.restoredMidRun).toBe(true);
    expect(result.journalExport).toContain('agent-session:SIMULATED:encounter:ai-dm-conversation');
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
    // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spear after its
    // move to (13,1); changing that blocker then exposes monster-5's Longbow at
    // the independent row-line-6 seam (10,5)/(10,6), so both blockers move left.
    // Each move also opens every ray through the old cell interior, pinned above.
    const state = reauthoredHardExhaustionSightlines(
      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
    );
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
      '--capture-rl-data', '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);

    const result = await runConversation(config, {
      roomStates: [state],
      exhaustInitial: ['room-1-round-1'],
      failCorrection: ['room-1-round-1'],
    });

    const row = result.rows[0];
    expect(row).toEqual(expect.objectContaining({
      outcome: 'authorized',
      plannedBy: null,
      planner: 'sim_controller',
      proposalId: expect.stringContaining('sim-controller:'),
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
      chainEvidence: expect.objectContaining({
        autoResolvedTrigger: expect.stringContaining('unresolved frontier competition blocked engine auto-submit'),
      }),
    }));
    expect(row?.rlData).toEqual(expect.objectContaining({
      plannerLabel: 'sim_controller',
      autoSubmitBlocks: expect.arrayContaining([
        {
          actorId: 'combatant:generated-5117009-monster-1',
          reason: 'auto_submit_blocked_unresolved_frontier',
        },
      ]),
    }));
    const priestPlan = row?.authorizedPlan?.find((entry) =>
      entry.actorId === 'combatant:generated-5117009-monster-1');
    expect(priestPlan?.resolutionSummary.actionSlots).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'dodge' }),
    ]));
    expect(row?.projectionRevision).toBeGreaterThan(row?.contextRevision ?? 0);
  });

  it.each([
    {
      name: 'no proposal',
      expected: 'no_proposal',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'validation exhaustion',
      expected: 'validation_exhausted',
      options: {
        invalidInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: false,
    },
    {
      name: 'blocked auto-submit',
      expected: 'auto_submit_blocked',
      options: {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      },
      hard: true,
    },
    {
      name: 'timeout',
      expected: 'timeout',
      options: {
        timeoutInitial: ['room-1-round-2'],
        failCorrection: ['room-1-round-2'],
      },
      hard: false,
    },
  ] as const)('records typed fallbackReason for $name from the stub adapter', { timeout: 60_000 }, async ({
    expected,
    options,
    hard,
  }) => {
    const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fallback-${expected}-`));
    const rounds = expected === 'timeout' ? 2 : 1;
    const config = parseConversationArgs([
      '--rooms', '1', '--rounds', String(rounds), '--out', join(directory, 'rows.jsonl'),
      '--dry-run',
      ...LEGACY_BLOCK_ARGS,
    ]);
    const state = hard
      // The typed fallback is reached after monster-2's Spear and monster-5's
      // Longbow clear their seams; the moves also open the pinned interior rays.
      ? reauthoredHardExhaustionSightlines(
          await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
        )
      : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');

    const result = await runConversation(config, { roomStates: [state], ...options });

    expect(result.rows.at(-1)?.fallbackReason).toBe(expected);
    expect(result.rows.at(-1)?.refusals).toEqual([]);
  });

  it('does not depend on turn-context rendering to resolve a brutal exhaustion frontier', async () => {
    const state = freshMonsterPlanningState(
      await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json'),
    );
    const actorIds = state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
    const resolutions = () => actorIds.map((actorId) =>
      actorOpportunityReport(state, actorId, BOUND_OFFER_ENVIRONMENT, state.revision).frontierResolution);
    const beforeRender = resolutions();
    const firstActorId = actorIds[0];
    if (firstActorId === undefined) throw new Error('Brutal fixture has no first monster actor.');
    const firstActorOptions = engineActorOptionsForEnvironment(
      state,
      firstActorId,
      BOUND_OFFER_ENVIRONMENT,
    );
    expect(firstActorOptions.humanOnly).toContainEqual(expect.objectContaining({
      label: 'spellcasting/detect-evil-and-good',
      declaredOption: {
        kind: 'spell',
        sourceActionId: 'spellcasting',
        spellId: 'detect-evil-and-good',
import { describe, expect, it } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import {
  armorClass, encounterBranchId, encounterSessionId, worldObjectId,
} from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import {
  REFERENCE_FIGHTER_ID, REFERENCE_MONSTER_ID, referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import {
  canonicalTokenIdentityIndex, groundAnchor, groundCenter, sceneSnapshot,
} from '../../../src/vtt/handoff/scene-snapshot';
import { logicalAssetId } from '../../../src/vtt/handoff/asset-id-map';
import {
  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixtureState() {
  const setup = referenceEncounterSetup();
  return createEncounter({
    ...setup,
    worldObjects: [
      {
        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door',
        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier',
        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source',
        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' }, createdRevision: 0,
      },
    ],
  });
}

function sizedSnapshot(size: 'Large' | 'Huge' | 'Gargantuan', squeezed = false) {
  const setup = referenceEncounterSetup();
  const base = setup.combatants.find((profile) => profile.id === REFERENCE_FIGHTER_ID);
  if (base?.kind !== 'player_character') throw new Error('Missing reference fighter.');
  const profile = { ...base, rules: { ...base.rules, sizeCategory: size } };
  const created = createEncounter({
    bounds: setup.bounds, combatants: [profile],
    tokens: [combatToken(profile, { column: 1, row: 1 })],
  });
  if (squeezed && size !== 'Large') throw new Error('Squeezed fixture supports Large only.');
  const state = squeezed
    ? {
        ...created,
        tokens: created.tokens.map((token) => ({
          ...token, placementMode: { kind: 'squeezed' as const, actual: 'Large' as const, sizedFor: 'Medium' as const },
        })),
      }
    : created;
  const projection = projectDmBoard({
    view: projectDmView(state),
    coordinator: IDLE,
    controllers: [],
    history: [],
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  return sceneSnapshot({
    sceneId: 'scene:sizes', projection, art: REFERENCE_ENCOUNTER_ART,
    tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
  }).snapshot.tokens[0];
}

interface PersistedByteBaseline {
  readonly pendingRequestHash: string;
  readonly coordinatorHash: string;
  readonly revisionChecksum: string;
}

function persistedRevisionChecksum(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): string {
  const store = new MemoryBrowserSessionStore();
  const sessionId = encounterSessionId('session:handoff-persistence-baseline');
  EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:handoff-persistence-baseline'),
    encounterState: state,
    coordinatorState,
    controllers: [],
    rng: mulberry32(16_603),
    store,
    mirror: new MemoryMirrorSink(),
  });
  const revision = store.revisions(sessionId)[0];
  if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
  return revision.checksum;
}

function persistedByteBaseline(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): PersistedByteBaseline {
  if (coordinatorState.pendingRequest === null) throw new Error('PERSISTENCE_BASELINE_REQUEST_MISSING');
  return {
    pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
    coordinatorHash: sha256(canonicalJson(coordinatorState)),
    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
  };
}

function assertPersistedHandoffBytesUnchanged(
  expected: PersistedByteBaseline,
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): void {
  const actual = persistedByteBaseline(state, coordinatorState);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error('PERSISTED_HANDOFF_BYTES_CHANGED');
  }
}

describe('renderer-neutral scene snapshot', () => {
  it('pins ground centres and inverse anchors for every controlled span', () => {
    const anchor = { column: 2, row: 3 };
    expect([1, 2, 3, 4].map((span) => groundCenter(anchor, { w: span, h: span }))).toEqual([
      { x: 2, y: 3, z: 0 }, { x: 2.5, y: 3.5, z: 0 },
      { x: 3, y: 4, z: 0 }, { x: 3.5, y: 4.5, z: 0 },
    ]);
    expect(groundCenter(anchor, { w: 1, h: 1 })).toEqual({ x: 2, y: 3, z: 0 });
    expect(groundAnchor({ x: 2.5, y: 3.5, z: 0 }, { w: 2, h: 2 })).toEqual(anchor);
    expect(groundAnchor({ x: 2.25, y: 3.5, z: 0 }, { w: 2, h: 2 })).toBeNull();
    expect(groundAnchor({ x: 2.5, y: 3.5, z: 1 }, { w: 2, h: 2 })).toBeNull();
  });

  it('enriches filtered player combatants with renderer-only ids and omits environment lights', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const projection = projectPlayerBoard(view, IDLE);
    const result = sceneSnapshot({
      sceneId: 'scene:two-room', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    expect(projection.combatants.every((combatant) => !('tokenId' in combatant))).toBe(true);
    const canonicalId = String(state.tokens.find((token) => token.combatantId === REFERENCE_FIGHTER_ID)?.id);
    expect(result.snapshot.tokens.map((token) => token.id)).toContain(canonicalId);
    expect(result.snapshot.tokens.some((token) => token.id === String(REFERENCE_FIGHTER_ID))).toBe(false);
    const hiddenCanonicalIds = state.tokens
      .filter((token) => !projection.combatants.some((combatant) => combatant.id === token.combatantId))
      .map((token) => String(token.id));
    expect(result.snapshot.tokens.every((token) => !hiddenCanonicalIds.includes(token.id))).toBe(true);
    expect(result.snapshot.vision.visible).toEqual(projection.visibleCells.map((cell) => [cell.column, cell.row]));
    expect(result.snapshot.lights.map((light) => light.id)).toEqual(['light:object:object:torch']);
  });

  it('derives real Large, Huge, Gargantuan, and squeezed footprints and ground centres through the adapter', () => {
    const cases = [
      { token: sizedSnapshot('Large'), expected: { footprint: { w: 2, h: 2 }, x: 1.5, y: 1.5, z: 0 } },
      { token: sizedSnapshot('Huge'), expected: { footprint: { w: 3, h: 3 }, x: 2, y: 2, z: 0 } },
      { token: sizedSnapshot('Gargantuan'), expected: { footprint: { w: 4, h: 4 }, x: 2.5, y: 2.5, z: 0 } },
      { token: sizedSnapshot('Large', true), expected: { footprint: { w: 1, h: 1 }, x: 1, y: 1, z: 0 } },
    ];
    for (const { token, expected } of cases) {
      expect(token).toMatchObject(expected);
      if (token === undefined) throw new Error('Missing sized token.');
      expect(groundAnchor({ x: token.x, y: token.y, z: token.z }, token.footprint))
        .toEqual({ column: 1, row: 1 });
    }
  });

  it('removes canonical token identity on a visible-to-hidden player transition', () => {
    const state = fixtureState();
    const binding = { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID };
    const identities = canonicalTokenIdentityIndex(state.tokens);
    const before = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    const monsterTokenId = String(state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID)?.id);
    expect(before.tokens.map((token) => token.id)).toContain(monsterTokenId);
    const hidden = {
      ...state,
      hiddenCombatants: [{
        combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: '2024' as const,
      }],
    };
    const after = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(hidden, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    expect(after.tokens.map((token) => token.id)).not.toContain(monsterTokenId);
  });

  it('preserves full persisted request/coordinator bytes and the actual revision checksum', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const coordinator: PersistedCoordinatorState = {
      ...IDLE,
      pendingRequest: {
        kind: 'turn' as const,
        requestId: 'request:handoff-baseline',
        encounterRevision: state.revision,
        actorId: REFERENCE_FIGHTER_ID,
        visibleState: view,
        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
      },
    };
    const before = persistedByteBaseline(state, coordinator);
    const projection = projectPlayerBoard(view, coordinator);
    sceneSnapshot({
      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const after = persistedByteBaseline(state, coordinator);
    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
    expect(view.concealedCells).toEqual([
      { column: 4, row: 3 },
      { column: 7, row: 4 },
      { column: 8, row: 4 },
      { column: 9, row: 4 },
    ]);
    // Pre-D635 concealed={(4,3)} and hashes were:
    // pendingRequest=fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e;
    // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
    // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
    // Pre-B4 revision=cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767;
    // Pre-B2 revision=df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee;
    // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
    // B2 removes the empty migration key and recomputes the fingerprint as
    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
    expect(before).toEqual({
      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
    });
    expect(coordinator.pendingRequest).toMatchObject({
      kind: 'turn',
      requestId: 'request:handoff-baseline',
      encounterRevision: 0,
      actorId: 'combatant:fighter',
      legalActions: { actions: [{ type: 'end_turn', actor: 'combatant:fighter' }] },
    });
    expect(coordinator.pendingRequest?.visibleState).toBe(view);
    expect(coordinator.pendingRequest?.visibleState !== undefined &&
      'tokenIdentityByCombatant' in coordinator.pendingRequest.visibleState).toBe(false);
    expect(after).toEqual(before);
    assertPersistedHandoffBytesUnchanged(before, state, coordinator);

    if (coordinator.pendingRequest === null) throw new Error('PERSISTENCE_CONTROL_REQUEST_MISSING');
    const enrichedRequest = {
      ...coordinator.pendingRequest,
      visibleState: {
        ...coordinator.pendingRequest.visibleState,
        tokenIdentityByCombatant: { [String(REFERENCE_FIGHTER_ID)]: 'token:fighter' },

exec
/bin/bash -lc "npx vitest run tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/tools/ai-dm-conversation.test.ts --reporter=verbose --testNamePattern='preserves full persisted|blocked auto-submit|unresolved frontier prevents|target-specific non-nearest R02|both 90-foot Scout shots'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 exited 1 in 4353ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > pins ground centres and inverse anchors for every controlled span
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > enriches filtered player combatants with renderer-only ids and omits environment lights
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > derives real Large, Huge, Gargantuan, and squeezed footprints and ground centres through the adapter
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > removes canonical token identity on a visible-to-hidden player transition
 × tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum 29ms
   → expected [ { column: 4, row: 3 }, …(2) ] to deeply equal [ { column: 4, row: 3 } ]
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > emits DM environment lights, exclusive door companions and no door cell wall union
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > uses the object-position north edge for adjacent and multicell doors, open and closed
 ↓ tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > reports deterministic role-aware fallbacks
 × tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter 23ms
   → expected null to be +0 // Object.is equality
 ↓ tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > compares ordered registry allocations with exact post-grant Bless conditioning
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > omits DM-only intel_mode from blind planned context arguments
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists indeterminate artifact and forensic row before raising the typed integrity STOP
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > classifies a timeout after catalog observation but before a tool call without an integrity STOP
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists primary D569 timeout evidence before applying the expired round deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with a contradictory catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with a contradictory catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid malformed catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid wrong_profile catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid malformed catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid wrong_profile catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists a runner forensic row before propagating conflicting startup evidence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists delivered context and process evidence before propagating conflicting startup evidence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a request after the MCP child closes stdin without an unhandled EPIPE
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a readline input error through typed rejection and complete teardown
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects an in-flight MCP request specifically on child exit
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects on stdout closure and terminates a child that remains alive
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > refuses an MCP request issued after the child has exited
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > preserves a request failure through the caller try/finally cleanup path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > reports standalone abnormal MCP termination as a typed error
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized revision-bound Dodge proposal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes targeted Web and non-targeted Dodge through composite options
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > round-trips the End Turn option emitted by the tactical context
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > wall begins before initial without speculation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > speculation uses arm base until trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restricted wall excludes engine work and includes later speculation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 1000 ms remains outside the restricted wall
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 200000 ms remains outside the restricted wall
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired speculative adoption validation cannot adopt or execute that branch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired recalculation authorization cannot retain or execute recalculated entries on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > one rejected submission uses arm-base correction before D474 escalation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > empty structured correction is not D474 validation evidence on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > correction refusal triggers a fresh D474 escalation on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > actual refusal is the only single-attempt D474 trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps tiered primary argv/config byte-identical and isolates escalation from the base session
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'tiered' correction using actual dispatch bookkeeping
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'untiered' correction using actual dispatch bookkeeping
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized MCP attack proposal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > requests full context for round one and a delta for a resumed later round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > preserves accepted suggested composite proposals in the authorized SIMULATED row
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > re-resolves independently specified stored mechanics before reporting divergence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > divergence refuses a stored resolution produced under a different offer environment
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects stored proposal resolutions with missing or non-64-hex environment digests
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects plan adjustment envelopes whose stored updates carry malformed digests
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943004 through the real host after resolving boundary decisions
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943007 through the real host after resolving boundary decisions
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the decline policy and authorizes the SIMULATED arena round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the take policy and authorizes the SIMULATED arena round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > falls back to unattended toggle policy when sticky guidance does not cover the pending trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one SIMULATED session across two rooms, one correction, and a browser restore
 × tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit 22ms
   → expected [] to deeply equal [ …(5) ]
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'no proposal' from the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'validation exhaustion' from the stub adapter
 × tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'blocked auto-submit' from the stub adapter 5ms
   → expected [] to deeply equal [ …(5) ]
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'timeout' from the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not depend on turn-context rendering to resolve a brutal exhaustion frontier
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a three-room three-round model-free brutal smoke with the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retries one SIMULATED service flap and uses the first healthy primary turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > marks three consecutive SIMULATED service flaps as service_null without exhausting the turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not retry a SIMULATED primary turn that called engine tools before rejection
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records when the configured turn-context trimmer fired
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > injects the root and tactics pair byte-for-byte only on cold start and attributes its hash
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > threads a selected skill through every invocation and hashes the exact fixture bytes
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free none instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free kb instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free skill instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > starts the persistent SIMULATED session with the first round plan in one model dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects audited boilerplate at structured-final ingress before accepting a substantive correction
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > passes a persisted final-index row through packet validation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records no chosen indices when no final-index decision is accepted
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects speculative structured-final dispatch at the typed phase boundary (mutation: pass speculative through as a decision phase)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > directs K6 to consume an inline suggestion without fetching the same play again
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > admits the active process and local OpenAI conversation adapters
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > walks an alternating initiative fixture without waking the DM for HP-only drift
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ends a three-round room as party_defeated when all PCs are dead entering the party segment
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs three rounds with a one-round party program by recording typed default turns
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice keep
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice change
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches an adjustment when the retained primary becomes illegal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a speculative context actor mismatch before model dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records partial_execution when execution throws after a completed PC turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards speculation when the actual board invalidates the planned option structure
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts the cell when speculation recalculation infrastructure fails after staging output
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the end-of-round join
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the exception-cleanup join
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > terminates incomplete speculation with a failed rebase without repeating the initiative loop
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts speculative planning at the D407 pacing deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards a speculative proposal staged before timeout without authorizing it
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not spend a second adjustment flap budget when preflight finds no material plan change
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs one adjustment correction and retains the corrected replacement
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > stamps speculation recalculation launchers with the speculative dispatch phase
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps the baseline after three adjustment service nulls and continues the round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores a staged adjustment proposal after timeout and retains the authorized baseline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records adjustment timeout evidence before applying the expired round deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores an adjustment correction proposal staged before timeout and retains the authorized baseline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > treats adjustment correction no-response as protocol exhaustion, not a flap
 × tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > renders target-specific non-nearest R02 rows in always-on context with exact reasons 781ms
   → expected { …(14) } to match object { …(10) }
(4 matching properties omitted from actual)
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > keeps exact probability internally while both context and query render coarse values
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > paginates the full matrix with a state-bound cursor and advertises the read tool to the DM
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > emits a short neutral death-save window only when the top actor precedes the target
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > renders the failure manifest only in the DM profile and retains the 32 KiB trim
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > attaches full-precision offered-set and all intel policy versions to accepted capture

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit
AssertionError: expected [] to deeply equal [ …(5) ]

- Expected
+ Received

- [
-   "combatant:generated-5117009-monster-1->combatant:fighter",
-   "combatant:generated-5117009-monster-2->combatant:fighter",
-   "combatant:generated-5117009-monster-2->combatant:cleric",
-   "combatant:generated-5117009-monster-5->combatant:wizard",
-   "combatant:generated-5117009-monster-6->combatant:wizard",
- ]
+ []

 ❯ pinMonsterPlayerVisibilityDelta tests/unit/tools/ai-dm-conversation.test.ts:216:24
    214| ): void {
    215|   const delta = monsterPlayerVisibilityDelta(before, after, sourceAnch…
    216|   expect(delta.opened).toEqual(expectedOpened);
       |                        ^
    217|   expect(delta.closed).toEqual([]);
    218| }
 ❯ reauthoredHardExhaustionSightlines tests/unit/tools/ai-dm-conversation.test.ts:241:3
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2733:19

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'blocked auto-submit' from the stub adapter
AssertionError: expected [] to deeply equal [ …(5) ]

- Expected
+ Received

- [
-   "combatant:generated-5117009-monster-1->combatant:fighter",
-   "combatant:generated-5117009-monster-2->combatant:fighter",
-   "combatant:generated-5117009-monster-2->combatant:cleric",
-   "combatant:generated-5117009-monster-5->combatant:wizard",
-   "combatant:generated-5117009-monster-6->combatant:wizard",
- ]
+ []

 ❯ pinMonsterPlayerVisibilityDelta tests/unit/tools/ai-dm-conversation.test.ts:216:24
    214| ): void {
    215|   const delta = monsterPlayerVisibilityDelta(before, after, sourceAnch…
    216|   expect(delta.opened).toEqual(expectedOpened);
       |                        ^
    217|   expect(delta.closed).toEqual([]);
    218| }
 ❯ reauthoredHardExhaustionSightlines tests/unit/tools/ai-dm-conversation.test.ts:241:3
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2833:9

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > renders target-specific non-nearest R02 rows in always-on context with exact reasons
AssertionError: expected { …(14) } to match object { …(10) }
(4 matching properties omitted from actual)

- Expected
+ Received

@@ -6,7 +6,7 @@
    "movement_need_feet": 0,
    "p_hit": "≈1/2",
    "range": "NORMAL",
    "roll_mode": "STRAIGHT",
    "target_id": "combatant:fighter",
-   "visibility": "VISIBLE",
+   "visibility": "HIDDEN",
  }

 ❯ tests/unit/vtt/dm-tactical-intel.test.ts:126:24
    124|       coverTier: 'half',
    125|     });
    126|     expect(fighterRow).toMatchObject({
       |                        ^
    127|       target_id: FIGHTER,
    128|       attacks: 2,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
AssertionError: expected [ { column: 4, row: 3 }, …(2) ] to deeply equal [ { column: 4, row: 3 } ]

- Expected
+ Received

  [
    {
      "column": 4,
      "row": 3,
    },
+   {
+     "column": 8,
+     "row": 3,
+   },
+   {
+     "column": 9,
+     "row": 3,
+   },
  ]

 ❯ tests/unit/vtt/scene-snapshot.test.ts:246:52
    244|     // cell except ordinary darkness at (4,3); the door/wall seam does…
    245|     // from all three observers. Derived DM fog is therefore the liter…
    246|     expect(projectDmView(state).state.foggedCells).toEqual([{ column: …
       |                                                    ^
    247|     expect(view.concealedCells).toEqual([
    248|       { column: 4, row: 3 },

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter
AssertionError: expected null to be +0 // Object.is equality

- Expected:
0

+ Received:
null

 ❯ tests/unit/vtt/tactical-evaluator-r02.test.ts:159:39
    157|     for (const row of rows) {
    158|       // Fixture positions differ by 18 columns and at most 3 rows: Ch…
    159|       expect(row.minimumMovementFeet).toBe(0);
       |                                       ^
    160|       expect(row.range).toEqual({
    161|         status: 'resolved', distanceFeet: 90, band: 'normal', legal: t…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  4 failed (4)
      Tests  5 failed | 121 skipped (126)
   Start at  21:09:34
   Duration  4.03s (transform 4.05s, setup 0ms, import 7.30s, tests 863ms, environment 0ms)


exec
/bin/bash -lc "npx vite-node --help | sed -n '1,160p'
rg -n \"function monsterPlayerVisibilityDelta|function reauthoredHardExhaustionSightlines|EXPECTED_HARD|sourceAnch\" tests/unit/tools/ai-dm-conversation.test.ts
sed -n '160,255p' tests/unit/tools/ai-dm-conversation.test.ts
sed -n '1,80p' tests/unit/tools/ai-dm-conversation.test.ts
sed -n '1,220p' src/combat/cover.ts
sed -n '380,480p' src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 139ms:
vite-node/3.2.4

Usage:
  $ vite-node [...files]

Commands:
  [...files]  

For more info, run any command with the `--help` flag:
  $ vite-node --help

Options:
  -r, --root <path>    Use specified root directory 
  -c, --config <path>  Use specified config file 
  -m, --mode <mode>    Set env mode 
  -w, --watch          Restart on file changes, similar to "nodemon" 
  --script             Use vite-node as a script runner 
  --options <options>  Use specified Vite server options 
  -v, --version        Output the version number 
  -h, --help           Display help for command 
  -v, --version        Display version number 
182:function monsterPlayerVisibilityDelta(
185:  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
193:      const sourceAnchor = sourceAnchors.get(monster.profile.id);
194:      const options = sourceAnchor === undefined ? {} : { sourceAnchor };
213:  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
215:  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
220:function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
  };
}

async function validRecalculationRoom(): Promise<EncounterState> {
  const state = await alternatingInitiativeRoom();
  return {
    ...state,
    combatants: state.combatants.map((combatant) => ({
      ...combatant,
      profile: {
        ...combatant.profile,
        rules: {
          ...combatant.profile.rules,
          initiativeBonus: combatant.profile.kind === 'monster' ? -20 : 20,
        },
      },
    })),
  };
}

type VisibilityAnchor = Readonly<{ column: number; row: number }>;

function monsterPlayerVisibilityDelta(
  before: EncounterState,
  after: EncounterState,
  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
): { readonly opened: readonly string[]; readonly closed: readonly string[] } {
  const monsters = before.combatants.filter((combatant) => combatant.profile.kind === 'monster');
  const players = before.combatants.filter((combatant) => combatant.profile.kind === 'player_character');
  const opened: string[] = [];
  const closed: string[] = [];
  for (const monster of monsters) {
    for (const player of players) {
      const sourceAnchor = sourceAnchors.get(monster.profile.id);
      const options = sourceAnchor === undefined ? {} : { sourceAnchor };
      const beforeBlocked = traceCombatantLine(
        before, monster.profile.id, player.profile.id, options,
      ).blocksSight;
      const afterBlocked = traceCombatantLine(
        after, monster.profile.id, player.profile.id, options,
      ).blocksSight;
      const pair = `${monster.profile.id}->${player.profile.id}`;
      if (beforeBlocked && !afterBlocked) opened.push(pair);
      if (!beforeBlocked && afterBlocked) closed.push(pair);
    }
  }
  return { opened, closed };
}

function pinMonsterPlayerVisibilityDelta(
  before: EncounterState,
  after: EncounterState,
  expectedOpened: readonly string[],
  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
): void {
  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
  expect(delta.opened).toEqual(expectedOpened);
  expect(delta.closed).toEqual([]);
}

function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
  const seamRows = new Set([1, 5]);
  const matchingBlockers = state.blockedCells.filter((cell) =>
    cell.column === 10 && seamRows.has(cell.row));
  if (matchingBlockers.length !== seamRows.size) {
    throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
  }
  const reauthored = {
    ...state,
    blockedCells: state.blockedCells.map((cell) =>
      cell.column === 10 && seamRows.has(cell.row)
        ? { column: 9, row: cell.row }
        : cell),
  };
  // Each move opens its targeted seam and every ray through the old cell interior.
  // Representative changed rays, with t from source to target:
  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
  pinMonsterPlayerVisibilityDelta(state, reauthored, [
    'combatant:generated-5117009-monster-1->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:cleric',
    'combatant:generated-5117009-monster-5->combatant:wizard',
    'combatant:generated-5117009-monster-6->combatant:wizard',
  ], new Map([
    [combatantId('combatant:generated-5117009-monster-2'), { column: 13, row: 1 }],
  ]));
  return reauthored;
}

function withoutFixtureBlockers(
  state: EncounterState,
  removed: readonly { readonly column: number; readonly row: number }[],
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  agentSessionIdFromCli,
  contextTokenCount,
  turnInputTotal,
  measuredContextRolloverThreshold,
  engineDispatchId,
  engineDispatchPhaseForCallPhase,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
  type EngineCatalogEvidence,
  type EngineDispatchId,
} from '../../../src/vtt/agent-session';
import {
  AgentSessionLifecycle,
  createConversationRoundDeadline,
  type AgentDispatchDeadline,
} from '../../../src/vtt/agent-session-lifecycle';
import {
  parseConversationArgs,
  proposalResolutionDivergence,
  isPlanAdjustmentProposal,
  isRoundProposal,
  runConversation,
  structuredFinalDecisionPhase,
  createMcpClient,
  McpChildExited,
  mcpRequest,
  stopMcpClient,
  profiledTurnContextArguments,
  persistD569IntegrityStop,
  type ConversationBoardSnapshotService,
  type ConversationRunOptions,
} from '../../../tools/ai-dm-conversation';
import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { armorClass, combatantId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { applyRoomInitiativeProfile, generateRoom } from '../../../src/vtt/room-generator';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
} from '../../../src/vtt/intent-resolver';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
  parseEngineMcpJsonLine,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  importSavedSession,
  exportSavedSession,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import { D569IntegrityStop } from '../../../src/vtt/d569-integrity';
import { decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import {
import { combatantSpace, combatantSpaceAt } from './combat-rules';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import { coverRank, type CoverTier } from './terrain';
import type { CombatantId } from './values';
import type { WorldObject } from './world-objects';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function compareCells(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */
export function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const result: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return result;
}

function objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

export interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */
export function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const first = cells[0];
  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');
  let minimumColumn = first.column;
  let maximumColumn = first.column + 1;
  let minimumRow = first.row;
  let maximumRow = first.row + 1;
  for (let index = 1; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell === undefined) continue;
    minimumColumn = Math.min(minimumColumn, cell.column);
    maximumColumn = Math.max(maximumColumn, cell.column + 1);
    minimumRow = Math.min(minimumRow, cell.row);
    maximumRow = Math.max(maximumRow, cell.row + 1);
  }
  return [
    { column: minimumColumn, row: minimumRow },
    { column: maximumColumn, row: minimumRow },
    { column: minimumColumn, row: maximumRow },
    { column: maximumColumn, row: maximumRow },
  ];
}

/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */
export function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
  const epsilon = 1e-9;
  let entry = 0;
  let exit = 1;
  const columnDelta = to.column - from.column;
  const minimumColumn = cell.column + epsilon;
  const maximumColumn = cell.column + 1 - epsilon;
  if (columnDelta === 0) {
    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;
  } else {
    const first = (minimumColumn - from.column) / columnDelta;
    const second = (maximumColumn - from.column) / columnDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  const rowDelta = to.row - from.row;
  const minimumRow = cell.row + epsilon;
  const maximumRow = cell.row + 1 - epsilon;
  if (rowDelta === 0) {
    if (from.row <= minimumRow || from.row >= maximumRow) return false;
  } else {
    const first = (minimumRow - from.row) / rowDelta;
    const second = (maximumRow - from.row) / rowDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry <= exit && exit > 0 && entry < 1;
}

function lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;
  if (magnitudeSquared === 0) return 0;
  return (
    (cell.column + 0.5 - from.column) * columnDelta +
    (cell.row + 0.5 - from.row) * rowDelta
  ) / magnitudeSquared;
}

/** Rasterizes a corner ray in source-to-target traversal order. */
export function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const crossed: GridCell[] = [];
  for (const cell of candidates) {
    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);
  }
  if (crossed.length > 1) {
    crossed.sort((left, right) =>
      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));
  }
  return crossed;
}

export interface TerrainLineSource {
  readonly kind: 'blocked_cell' | 'world_object' | 'creature';
  readonly id: string;
  readonly tier: Exclude<CoverTier, 'none'>;
}

export interface TerrainCornerLineTrace {
  readonly targetCorner: CornerPoint;
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineTrace {
  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly sourceCorner: CornerPoint;
  readonly lines: readonly TerrainCornerLineTrace[];
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineOptions {
  readonly sourceId?: CombatantId;
  readonly targetId?: CombatantId;
  readonly includeCreatures?: boolean;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

function normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {
  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]
    .sort(compareCells);
}

function sightBlockingSignature(cells: readonly GridCell[]): string {
  return cells.map(cellKey).join(';');
}

function taggedSourceId(source: TerrainLineSource): string {
  switch (source.kind) {
    case 'blocked_cell': return `blocked:${source.id}`;
    case 'world_object': return `object:${source.id}`;
    case 'creature': return `creature:${source.id}`;
  }
}

interface TerrainSourceCell {
  readonly cell: GridCell;
  readonly sources: TerrainLineSource[];
}

function addSource(
  sourceCells: Map<string, TerrainSourceCell>,
  cell: GridCell,
  source: TerrainLineSource,
  exclusions: ReadonlySet<string>,
): void {
  const key = cellKey(cell);
  if (exclusions.has(key)) return;
  const existing = sourceCells.get(key);
  if (existing === undefined) {
    sourceCells.set(key, { cell: { ...cell }, sources: [source] });
  } else {
    existing.sources.push(source);
  }
}

interface TerrainSourceIndexes {
  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;
  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;
}

const terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();
const terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();
const equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();
const EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;

function terrainSourceSignature(
  state: EncounterState,
  includeCreatures: boolean,
  indexedSources: ReadonlyMap<string, TerrainSourceCell>,
): string {
      return { cell: topLeft, progress: index / latticeSteps };
    }
    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {
      return { cell: topRight, progress: index / latticeSteps };
    }
  }
  return null;
}

function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
  let entry = 0;
  const columnDelta = to.column - from.column;
  if (columnDelta !== 0) {
    entry = Math.max(entry, Math.min(
      (cell.column - from.column) / columnDelta,
      (cell.column + 1 - from.column) / columnDelta,
    ));
  }
  const rowDelta = to.row - from.row;
  if (rowDelta !== 0) {
    entry = Math.max(entry, Math.min(
      (cell.row - from.row) / rowDelta,
      (cell.row + 1 - from.row) / rowDelta,
    ));
  }
  return entry;
}

function firstSightBlockingCell(
  from: CornerPoint,
  to: CornerPoint,
  interveningCells: readonly GridCell[],
  sightBlockingAt: (cell: GridCell) => boolean,
): GridCell | null {
  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
  if (vertex !== null && (first === null || vertex.progress < first.progress ||
    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
  for (const cell of interveningCells) {
    if (!sightBlockingAt(cell)) continue;
    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };
    if (first === null || hit.progress < first.progress ||
      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
  }
  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
  // Simultaneous events use lower row, then lower column.
  return first === null ? null : { ...first.cell };
}

function traceCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
  sightBlockingAt: (cell: GridCell) => boolean,
): TerrainCornerLineTrace {
  const interveningCells = rasterizeCornerLine(from, to, candidates);
  let tier: CoverTier = 'none';
  let strongest: TerrainLineSource[] = [];
  const firstBlockingCell = firstSightBlockingCell(
    from,
    to,
    interveningCells,
    sightBlockingAt,
  );
  for (const cell of interveningCells) {
    for (const source of sourcesAt(cell)) {
      const comparison = coverRank(source.tier) - coverRank(tier);
      if (comparison > 0) {
        tier = source.tier;
        strongest = [source];
      } else if (comparison === 0) {
        strongest.push(source);
      }
    }
  }
  const sources = uniqueSources(strongest);
  return {
    targetCorner: { ...to },
    interveningCells,
    tier,
    blocksSight: firstBlockingCell !== null,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell,
  };
}

const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];

function countTier(obstructedLineCount: number): CoverTier {
  if (obstructedLineCount === 0) return 'none';
  if (obstructedLineCount <= 2) return 'half';
  if (obstructedLineCount === 3) return 'three_quarters';
  return 'total';
}

function aggregateCornerLines(
  sourceCorner: CornerPoint,
  lines: readonly TerrainCornerLineTrace[],
  sourceCell: GridCell,

exec
/bin/bash -lc "npm ls tsx --depth=0 || true
node --help | rg \"experimental-strip-types|import\" | head -20
cat package.json | sed -n '1,120p'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 250ms:
srd-55@0.0.0 /home/vagrant/PhpstormProjects/dnd-wt-vis-field
└── (empty)

                              conditional exports and imports
                              experimental import support for addons
  --experimental-import-meta-resolve
                              import.meta.resolve() parentURL support
  --import=...                ES module to preload (option can be
  --experimental-strip-types, --no-strip-types
{
  "name": "srd-55",
  "private": true,
  "license": "MIT",
  "version": "0.0.0",
  "description": "SRD-55 is a local-first character builder",
  "type": "module",
  "scripts": {
    "dev": "vite --configLoader runner",
    "build": "tsc -b && node tools/dist-build-cache.mjs",
    "build:dist": "vite build --configLoader runner",
    "build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs",
    "serve": "node tools/serve.mjs",
    "serve:check": "playwright test --config=tests/serving/playwright.config.ts",
    "typecheck": "scripts/check-command-outcomes.sh && tsc -b",
    "check:command-outcomes": "scripts/check-command-outcomes.sh",
    "typecheck:fast": "tsgo -p tsconfig.app.json --noEmit && tsgo -p tsconfig.node.json --noEmit",
    "test": "vitest run --configLoader runner",
    "test:gate": "node scripts/check-command-outcomes.mjs && node tools/gate-vitest.mjs",
    "test:gate:browser": "node tools/gate-playwright.mjs",
    "test:affected": "node scripts/test-affected.mjs",
    "heldout:guard": "node --experimental-strip-types tools/heldout-leak-check.ts",
    "census:modules": "node scripts/module-state-census.mjs",
    "test:shuffled": "vitest run --configLoader runner --sequence.shuffle --sequence.seed=20260825",
    "test:unit": "vitest run --configLoader runner tests/unit",
    "test:live": "AI_BRIDGE_LIVE=1 vitest run --configLoader runner tests/live",
    "test:browser": "playwright test",
    "test:mutation": "node scripts/patch-stryker-vitest-runner.mjs && node scripts/mutation-loud.mjs",
    "test:mutation:sharded": "node scripts/patch-stryker-vitest-runner.mjs && node scripts/mutation-shard.mjs run-all --shards 8",
    "vtt:replay": "vite-node tools/vtt-replay.ts --",
    "vtt:soak": "vite-node tools/vtt-soak.ts --",
    "vtt:experiment": "vite-node tools/vtt-experiment.ts --",
    "vtt:regret": "vite-node tools/vtt-regret.ts --",
    "rehearse": "vite-node tools/rehearsal/run.ts --",
    "test:all": "npm run test && npm run build && npm run test:browser",
    "scrape": "vite-node tools/scrape/cli.ts --",
    "db:schema": "vite-node scripts/build-schema.ts",
    "db:migrations": "vitest run --configLoader runner tests/unit/db/migrations.test.ts",
    "db:contracts": "vite-node scripts/build-row-contracts.ts",
    "schema:content-pack": "vite-node tools/generate-content-pack-schema.ts",
    "schema:engine-mcp": "vite-node tools/generate-engine-mcp-schemas.ts",
    "attribute:round-input": "vite-node tools/attribute-round-input.ts --",
    "rl:extract-sft": "vite-node tools/rl/extract-sft.ts --",
    "rl:generate-data": "vite-node tools/rl/generate-data.ts --",
    "bootstrap": "node --experimental-strip-types tools/vtt-handoff/bootstrap.ts --",
    "doctor": "node --experimental-strip-types tools/vtt-handoff/doctor.ts --",
    "test:engine": "vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
    "test:runtime-node": "vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts",
    "handoff:gate": "node --experimental-strip-types tools/vtt-handoff/gate-inventory.ts",
    "art:request": "node --experimental-strip-types tools/vtt-handoff/art-request.ts --",
    "art:validate": "node --experimental-strip-types tools/vtt-handoff/art-validator.ts --",
    "art:stage": "node --experimental-strip-types tools/vtt-handoff/art-stage.ts --",
    "windows:probe": "node --experimental-strip-types tools/vtt-handoff/windows-probe.ts --"
  },
  "dependencies": {
    "@sqlite.org/sqlite-wasm": "3.53.0-build1",
    "qrcode": "^1.5.4",
    "trystero": "0.25.3",
    "ws": "8.18.3",
    "yjs": "13.6.32",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@stryker-mutator/core": "9.6.1",
    "@stryker-mutator/typescript-checker": "9.6.1",
    "@stryker-mutator/vitest-runner": "9.6.1",
    "@types/node": "^24.0.0",
    "@types/qrcode": "^1.5.6",
    "@types/ws": "8.18.1",
    "@typescript/native-preview": "7.0.0-dev.20260707.2",
    "ajv": "8.18.0",
    "drizzle-kit": "^0.31.10",
    "drizzle-orm": "^0.45.2",
    "drizzle-zod": "^0.8.3",
    "fake-indexeddb": "^6.2.5",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vite-node": "3.2.4",
    "vitest": "^4.1.10"
  }
}

exec
/bin/bash -lc "rg -n \"export function traceCombatantLineToCells|export function traceTerrainLine|export function traceCombatantLine\" src/combat/cover.ts
sed -n '620,760p' src/combat/cover.ts
rg -n \"REFERENCE_.*_ID|position\" src/vtt/reference-encounter.ts | head -80
sed -n '90,150p' src/vtt/reference-encounter.ts
rg -n '\"blockedCells\"|\"column\": (8|9|10)|\"row\": [0-7]' tests/fixtures/arena-basis-hard/seed-5117009.json | head -100" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
651:export function traceTerrainLine(
665:export function traceCombatantLine(
696:export function traceCombatantLineToCells(
      candidates,
      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
      sightBlockingAt,
    )),
    nearest.sourceCell,
    nearest.targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  const physicalSelected = traces.reduce(
    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,
    first,
  );
  const blocksSight = traces.every((trace) => trace.blocksSight);
  const opticalSelected = blocksSight
    ? traces.reduce(
        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,
        first,
      )
    : null;
  const selected: TerrainLineTrace = {
    ...physicalSelected,
    blocksSight,
    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,
  };
  stateTraces.set(traceKey, selected);
  retainEquivalentTrace(equivalentTraceKey, selected);
  return selected;
}

/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
    sourceId,
    targetId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const targetSignature = targetCells.map(cellKey).join(';');
  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);
  const traceKey = `${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, targetCells, {
    sourceId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  const exclusions = new Set([cellKey(from), cellKey(to)]);
  const candidates = [...new Map(objects
    .flatMap((object) => object.footprint)
    .filter((cell) => !exclusions.has(cellKey(cell)))
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const sourceCell = { ...from };
  const targetCell = { ...to };
  const targetCorners = outerCorners([to]);
  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
    objects.flatMap((object): readonly TerrainLineSource[] =>
      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
        : []);
  const sightBlockingAt = (cell: GridCell): boolean =>
    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      sourcesAt,
      sightBlockingAt,
    )),
    sourceCell,
    targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return traces.reduce((best, candidate) =>
71:export const REFERENCE_FIGHTER_ID = combatantId('combatant:fighter');
72:export const REFERENCE_CLERIC_ID = combatantId('combatant:cleric');
73:export const REFERENCE_WIZARD_ID = combatantId('combatant:wizard');
74:export const REFERENCE_MONSTER_ID = combatantId('combatant:training-brute');
75:export const REFERENCE_PLAYER_IDS: readonly CombatantId[] = [
76:  REFERENCE_FIGHTER_ID,
77:  REFERENCE_CLERIC_ID,
78:  REFERENCE_WIZARD_ID,
111:  const positions: readonly GridCell[] = [
121:    tokens: combatants.map((combatant, index) => combatToken(combatant, positions[index] as GridCell)),
140:function position(state: EncounterState, id: CombatantId): GridCell {
143:  return found.position;
147:  const current = position(state, actor);
240:    targets: [REFERENCE_MONSTER_ID],
254:    if (actor === REFERENCE_MONSTER_ID) {
257:      if (minimumSpaceDistance(combatantSpace(state, actor), combatantSpace(state, REFERENCE_MONSTER_ID)) <= 5) {
258:        actions.push(weaponAttack(actor, REFERENCE_MONSTER_ID));
265:      if (actor === REFERENCE_CLERIC_ID) actions.push(sacredFlame(actor));
266:      if (actor === REFERENCE_WIZARD_ID) actions.push(...shatterActions(state, actor));
279:    reactor !== REFERENCE_FIGHTER_ID ||
280:    mover !== REFERENCE_MONSTER_ID ||
    maximumHp: 67,
    armor: 18,
    initiative: 100,
  });
  const cleric = profile('cleric', 'Reference Cleric', 'player_character', {
    maximumHp: 52,
    armor: 18,
    initiative: 70,
    spellSlots: referencePartySpellSlots('Cleric'),
  });
  const wizard = profile('wizard', 'Reference Wizard', 'player_character', {
    maximumHp: 38,
    armor: 15,
    initiative: 40,
    spellSlots: referencePartySpellSlots('Wizard'),
  });
  const monster = profile('training-brute', 'Training Brute', 'monster', {
    maximumHp: 80,
    armor: 12,
    initiative: 0,
  });
  const positions: readonly GridCell[] = [
    { column: 2, row: 3 },
    { column: 1, row: 4 },
    { column: 1, row: 2 },
    { column: 3, row: 3 },
  ];
  const combatants = [fighter, cleric, wizard, monster];
  return {
    bounds: { columns: 10, rows: 7 },
    combatants,
    tokens: combatants.map((combatant, index) => combatToken(combatant, positions[index] as GridCell)),
    blockedCells: [{ column: 7, row: 2 }],
    environment: {
      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
      obscurementRegions: [],
      difficultTerrainRegions: [],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    dmNotes: ['Training Brute retreats after the three reference PCs act.'],
  };
}

function subject(state: EncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new Error(`Unknown reference combatant ${id}.`);
  return found;
}

function position(state: EncounterState, id: CombatantId): GridCell {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Reference combatant ${id} has no token.`);
  return found.position;
}

function movementActions(state: EncounterState, actor: CombatantId): readonly EncounterCommand[] {
  const current = position(state, actor);
  if (subject(state, actor).turn.movement.remaining < 5) return [];
  const world = encounterMovementWorld(state);
  const actions: EncounterCommand[] = [];
1:{"encounter":{"provenance":{"licenseTag":"MIT","seed":5117009,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"blockedCells":[{"column":10,"row":0},{"column":10,"row":1},{"column":10,"row":2},{"column":10,"row":3},{"column":10,"row":5},{"column":10,"row":6},{"column":10,"row":7},{"column":10,"row":8},{"column":10,"row":9},{"column":10,"row":10},{"column":10,"row":11},{"column":10,"row":12},{"column":10,"row":13},{"column":10,"row":14},{"column":10,"row":15},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"bounds":{"columns":21,"rows":19},"combatants":[{"deathAt":null,"deathSaves":{"failures":0,"successes":1},"hitPoints":0,"life":"dying","profile":{"characterId":1,"id":"combatant:fighter","kind":"player_character","name":"Reference Fighter","rules":{"armorClass":18,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":67,"initiativeBonus":100,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":true},"tokenId":"token:fighter","wildShape":null},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":39,"life":"living","profile":{"characterId":2,"id":"combatant:cleric","kind":"player_character","name":"Reference Cleric","rules":{"armorClass":18,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":70,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:cleric","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":3},{"level":2,"maximum":3,"remaining":0},{"level":3,"maximum":3,"remaining":1},{"level":4,"maximum":1,"remaining":1}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":19,"life":"living","profile":{"characterId":3,"id":"combatant:wizard","kind":"player_character","name":"Reference Wizard","rules":{"armorClass":15,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":40,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:wizard","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":3},{"level":2,"maximum":3,"remaining":3},{"level":3,"maximum":3,"remaining":0},{"level":4,"maximum":1,"remaining":0}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest","remaining":3}],"profile":{"id":"combatant:generated-5117009-monster-1","kind":"monster","name":"Priest","rules":{"abilityScores":{"charisma":13,"constitution":12,"dexterity":10,"intelligence":13,"strength":16,"wisdom":16},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":0,"limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest"}],"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":1,"constitution":1,"dexterity":0,"intelligence":1,"strength":3,"wisdom":3},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"medicine":7,"perception":5,"religion":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:priest","tokenId":"token:generated-5117009-monster-1"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117009-monster-2","kind":"monster","name":"Guard","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":13,"wisdom":11},"armorClass":16,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":12,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":1,"wisdom":0},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"perception":2},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:guard","tokenId":"token:generated-5117009-monster-2"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117009-monster-3","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117009-monster-3"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117009-monster-4","kind":"monster","name":"Bandit","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":11,"wisdom":10},"armorClass":12,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":10,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":0,"wisdom":0},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:bandit","tokenId":"token:generated-5117009-monster-4"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117009-monster-5","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117009-monster-5"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117009-monster-6","kind":"monster","name":"Bandit","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":11,"wisdom":10},"armorClass":12,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":10,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":0,"wisdom":0},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:bandit","tokenId":"token:generated-5117009-monster-6"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null}],"config":{"initiativeMode":"shared_enemy"},"dmNotes":["Deterministic generated room seed 5117009."],"effects":[{"concentrationOwner":"combatant:wizard","createdRevision":0,"damageBreak":null,"duration":{"kind":"permanent"},"id":"effect:generated-1","payload":{"amount":1,"kind":"armor_class_modifier"},"repeatedSave":null,"source":"combatant:wizard","stacking":"replace_same_source","stackingIdentity":"generated:active-concentration","targets":["combatant:wizard"]}],"environment":{"difficultTerrainRegions":[{"cells":[{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":9,"row":3},{"column":9,"row":4},{"column":9,"row":5},{"column":11,"row":3},{"column":11,"row":4},{"column":11,"row":5},{"column":12,"row":3},{"column":12,"row":4},{"column":12,"row":5}],"id":"difficult:generated-5117009-approach"}],"lightRegions":[{"cells":[{"column":13,"row":3},{"column":13,"row":4},{"column":13,"row":5}],"id":"light:world-object:generated-5117009-3","level":"dim"}],"movementRegions":[],"obscurementRegions":[]},"eventLog":[],"foggedCells":[],"hiddenCombatants":[],"hiddenRolls":[],"initiative":[],"nextDecisionSequence":1,"nextEffectSequence":2,"nextEventSequence":1,"nextPersistentAreaSequence":1,"nextWorldObjectSequence":1,"pendingDecisions":[],"persistentAreas":[],"phase":{"kind":"active"},"reactionPolicies":[],"revision":0,"round":0,"rulesEdition":"2024","tokens":[{"combatantId":"combatant:fighter","id":"token:fighter","position":{"column":1,"row":2}},{"combatantId":"combatant:cleric","id":"token:cleric","position":{"column":2,"row":4}},{"combatantId":"combatant:wizard","id":"token:wizard","position":{"column":1,"row":6}},{"combatantId":"combatant:generated-5117009-monster-1","id":"token:generated-5117009-monster-1","position":{"column":19,"row":1}},{"combatantId":"combatant:generated-5117009-monster-2","id":"token:generated-5117009-monster-2","position":{"column":18,"row":1}},{"combatantId":"combatant:generated-5117009-monster-3","id":"token:generated-5117009-monster-3","position":{"column":19,"row":3}},{"combatantId":"combatant:generated-5117009-monster-4","id":"token:generated-5117009-monster-4","position":{"column":18,"row":3}},{"combatantId":"combatant:generated-5117009-monster-5","id":"token:generated-5117009-monster-5","position":{"column":19,"row":5}},{"combatantId":"combatant:generated-5117009-monster-6","id":"token:generated-5117009-monster-6","position":{"column":18,"row":5}}],"worldObjects":[{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":1,"row":5}],"id":"world-object:generated-5117009-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":1,"row":5}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":11,"row":16}],"id":"world-object:generated-5117009-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":11,"row":16}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":18,"row":15}],"id":"world-object:generated-5117009-3","kind":"light-source","name":"Runed Brazier","position":{"column":18,"row":15}}]}},"spec":{"blockedCells":[{"column":10,"row":0},{"column":10,"row":1},{"column":10,"row":2},{"column":10,"row":3},{"column":10,"row":5},{"column":10,"row":6},{"column":10,"row":7},{"column":10,"row":8},{"column":10,"row":9},{"column":10,"row":10},{"column":10,"row":11},{"column":10,"row":12},{"column":10,"row":13},{"column":10,"row":14},{"column":10,"row":15},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"challengeBudgetEighths":30,"challengeSpentEighths":27,"difficultyProfile":"hard","dimensions":{"columns":21,"rows":19},"hardFeatures":{"chokepointCells":[{"column":10,"row":4}],"likelyApproachTerrainRegionIds":["difficult:generated-5117009-approach"],"shape":"single-gate"},"monsterRoster":[{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-5117009-monster-1","statblockId":"statblock:priest","tokenId":"token:generated-5117009-monster-1"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117009-monster-2","statblockId":"statblock:guard","tokenId":"token:generated-5117009-monster-2"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117009-monster-3","statblockId":"statblock:scout","tokenId":"token:generated-5117009-monster-3"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117009-monster-4","statblockId":"statblock:bandit","tokenId":"token:generated-5117009-monster-4"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117009-monster-5","statblockId":"statblock:scout","tokenId":"token:generated-5117009-monster-5"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117009-monster-6","statblockId":"statblock:bandit","tokenId":"token:generated-5117009-monster-6"}],"partyState":[{"combatantId":"combatant:fighter","concentrating":false,"deathSaves":{"failures":0,"successes":1},"hitPointFraction":0,"hitPoints":0,"life":"dying","spellSlots":[]},{"combatantId":"combatant:cleric","concentrating":false,"deathSaves":null,"hitPointFraction":0.75,"hitPoints":39,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":3,"spent":1},{"level":2,"maximum":3,"remaining":0,"spent":3},{"level":3,"maximum":3,"remaining":1,"spent":2},{"level":4,"maximum":1,"remaining":1,"spent":0}]},{"combatantId":"combatant:wizard","concentrating":true,"deathSaves":null,"hitPointFraction":0.5,"hitPoints":19,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":3,"spent":1},{"level":2,"maximum":3,"remaining":3,"spent":0},{"level":3,"maximum":3,"remaining":0,"spent":3},{"level":4,"maximum":1,"remaining":0,"spent":1}]}],"seed":5117009,"terrain":[{"cells":[{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":9,"row":3},{"column":9,"row":4},{"column":9,"row":5},{"column":11,"row":3},{"column":11,"row":4},{"column":11,"row":5},{"column":12,"row":3},{"column":12,"row":4},{"column":12,"row":5}],"id":"difficult:generated-5117009-approach","kind":"difficult-terrain-patch"},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":1,"row":5}],"id":"world-object:generated-5117009-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":1,"row":5}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":11,"row":16}],"id":"world-object:generated-5117009-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":11,"row":16}}},{"cells":[{"column":13,"row":3},{"column":13,"row":4},{"column":13,"row":5}],"kind":"light-source","level":"dim","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":18,"row":15}],"id":"world-object:generated-5117009-3","kind":"light-source","name":"Runed Brazier","position":{"column":18,"row":15}}}]}}

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp/wall-r2-probe.ts
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..04f63765b4f1ed11e9614561464d8068efe0a71d
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,216 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [{ column: 8, row: 3 }, { column: 9, row: 3 }]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..04f63765b4f1ed11e9614561464d8068efe0a71d
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,216 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [{ column: 8, row: 3 }, { column: 9, row: 3 }]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

exec
/bin/bash -lc 'npx vite-node .tmp/wall-r2-probe.ts' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..04f63765b4f1ed11e9614561464d8068efe0a71d
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,216 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [{ column: 8, row: 3 }, { column: 9, row: 3 }]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

 succeeded in 4512ms:
R02_CURRENT [
  {
    "id": "combatant:generated-5117009-monster-3",
    "trace": {
      "sourceCorner": {
        "column": 19,
        "row": 3
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 2
      },
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 3
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 3
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 3
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 2
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 3
              },
              "pair": [
                {
                  "column": 9,
                  "row": 2
                },
                {
                  "column": 10,
                  "row": 3
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 19,
            "row": 3
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 2
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 3
              },
              "pair": [
                {
                  "column": 9,
                  "row": 2
                },
                {
                  "column": 10,
                  "row": 3
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "id": "combatant:generated-5117009-monster-5",
    "trace": {
      "sourceCorner": {
        "column": 19,
        "row": 5
      },
      "tier": "three_quarters",
      "blocksSight": false,
      "firstBlockingCell": null,
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 5
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 3
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 5
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 3
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 5
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "none",
          "blocksSight": false,
          "firstBlockingCell": null,
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 5
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 3
          },
          "vertexHits": []
        }
      ]
    }
  }
]
R02_CANDIDATE {"destination":{"column":8,"row":2},"traces":[{"id":"combatant:generated-5117009-monster-3","trace":{"sourceCorner":{"column":19,"row":3},"tier":"half","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":3},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":8,"row":2},"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":8,"row":2},"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}},{"id":"combatant:generated-5117009-monster-5","trace":{"sourceCorner":{"column":19,"row":5},"tier":"three_quarters","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":5},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":3},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]}]}}]}
R02_CANDIDATE {"destination":{"column":9,"row":1},"traces":[{"id":"combatant:generated-5117009-monster-3","trace":{"sourceCorner":{"column":19,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":3},"to":{"column":1,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}},{"id":"combatant:generated-5117009-monster-5","trace":{"sourceCorner":{"column":19,"row":5},"tier":"three_quarters","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":5},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":3},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]}]}}]}
R02_CANDIDATE {"destination":{"column":9,"row":3},"traces":[{"id":"combatant:generated-5117009-monster-3","trace":{"sourceCorner":{"column":19,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":3},"to":{"column":1,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}},{"id":"combatant:generated-5117009-monster-5","trace":{"sourceCorner":{"column":19,"row":6},"tier":"three_quarters","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":6},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":9,"row":3},"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":1,"row":3},"tier":"half","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":2,"row":3},"tier":"half","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}}]}
R02_CANDIDATE {"destination":{"column":8,"row":1},"traces":[{"id":"combatant:generated-5117009-monster-3","trace":{"sourceCorner":{"column":19,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":3},"to":{"column":1,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}},{"id":"combatant:generated-5117009-monster-5","trace":{"sourceCorner":{"column":19,"row":5},"tier":"three_quarters","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":5},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":5},"to":{"column":2,"row":3},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]}]}}]}
R02_CANDIDATE {"destination":{"column":8,"row":3},"traces":[{"id":"combatant:generated-5117009-monster-3","trace":{"sourceCorner":{"column":19,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":3},"to":{"column":1,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":2},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":1,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":3},"to":{"column":2,"row":3},"tier":"none","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}},{"id":"combatant:generated-5117009-monster-5","trace":{"sourceCorner":{"column":19,"row":6},"tier":"three_quarters","blocksSight":false,"firstBlockingCell":null,"lines":[{"from":{"column":19,"row":6},"to":{"column":1,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":8,"row":3},"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":2,"row":2},"tier":"total","blocksSight":true,"firstBlockingCell":{"column":10,"row":3},"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":1,"row":3},"tier":"half","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]},{"from":{"column":19,"row":6},"to":{"column":2,"row":3},"tier":"half","blocksSight":false,"firstBlockingCell":null,"vertexHits":[]}]}}]}
CONVERSATION_CURRENT [
  {
    "pair": "combatant:generated-5117009-monster-1->combatant:fighter",
    "before": {
      "sourceCorner": {
        "column": 19,
        "row": 2
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 10,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        }
      ]
    },
    "after": {
      "sourceCorner": {
        "column": 19,
        "row": 2
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 1
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 2
              },
              "pair": [
                {
                  "column": 9,
                  "row": 1
                },
                {
                  "column": 10,
                  "row": 2
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 1
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 2
              },
              "pair": [
                {
                  "column": 9,
                  "row": 1
                },
                {
                  "column": 10,
                  "row": 2
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        }
      ]
    }
  },
  {
    "pair": "combatant:generated-5117009-monster-2->combatant:fighter",
    "before": {
      "sourceCorner": {
        "column": 13,
        "row": 2
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 10,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        }
      ]
    },
    "after": {
      "sourceCorner": {
        "column": 13,
        "row": 2
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 1
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 2
              },
              "pair": [
                {
                  "column": 9,
                  "row": 1
                },
                {
                  "column": 10,
                  "row": 2
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 2
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 1
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 2
              },
              "pair": [
                {
                  "column": 9,
                  "row": 1
                },
                {
                  "column": 10,
                  "row": 2
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 1,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 2
          },
          "to": {
            "column": 2,
            "row": 3
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        }
      ]
    }
  },
  {
    "pair": "combatant:generated-5117009-monster-2->combatant:cleric",
    "before": {
      "sourceCorner": {
        "column": 13,
        "row": 1
      },
      "tier": "total",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 10,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 13,
            "row": 1
          },
          "to": {
            "column": 2,
            "row": 4
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 1
          },
          "to": {
            "column": 3,
            "row": 4
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 1
          },
          "to": {
            "column": 2,
            "row": 5
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 13,
            "row": 1
          },
          "to": {
            "column": 3,
            "row": 5
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 1
          },
          "vertexHits": []
        }
      ]
    },
    "after": {
      "sourceCorner": {
        "column": 14,
        "row": 1
      },
      "tier": "three_quarters",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 1
      },
      "lines": [
        {
          "from": {
            "column": 14,
            "row": 1
          },
          "to": {
            "column": 2,
            "row": 4
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 1
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 2
              },
              "pair": [
                {
                  "column": 9,
                  "row": 1
                },
                {
                  "column": 10,
                  "row": 2
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 14,
            "row": 1
          },
          "to": {
            "column": 3,
            "row": 4
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 14,
            "row": 1
          },
          "to": {
            "column": 2,
            "row": 5
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 14,
            "row": 1
          },
          "to": {
            "column": 3,
            "row": 5
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 2
          },
          "vertexHits": []
        }
      ]
    }
  },
  {
    "pair": "combatant:generated-5117009-monster-5->combatant:wizard",
    "before": {
      "sourceCorner": {
        "column": 19,
        "row": 6
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 10,
        "row": 5
      },
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 5
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 5
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        }
      ]
    },
    "after": {
      "sourceCorner": {
        "column": 19,
        "row": 6
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 5
      },
      "lines": [
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 5
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 6
              },
              "pair": [
                {
                  "column": 9,
                  "row": 5
                },
                {
                  "column": 10,
                  "row": 6
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 5
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 6
              },
              "pair": [
                {
                  "column": 9,
                  "row": 5
                },
                {
                  "column": 10,
                  "row": 6
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 19,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        }
      ]
    }
  },
  {
    "pair": "combatant:generated-5117009-monster-6->combatant:wizard",
    "before": {
      "sourceCorner": {
        "column": 18,
        "row": 6
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 10,
        "row": 5
      },
      "lines": [
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 5
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 5
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        }
      ]
    },
    "after": {
      "sourceCorner": {
        "column": 18,
        "row": 6
      },
      "tier": "half",
      "blocksSight": true,
      "firstBlockingCell": {
        "column": 9,
        "row": 5
      },
      "lines": [
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 5
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 6
              },
              "pair": [
                {
                  "column": 9,
                  "row": 5
                },
                {
                  "column": 10,
                  "row": 6
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 6
          },
          "tier": "none",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 9,
            "row": 5
          },
          "vertexHits": [
            {
              "vertex": {
                "column": 10,
                "row": 6
              },
              "pair": [
                {
                  "column": 9,
                  "row": 5
                },
                {
                  "column": 10,
                  "row": 6
                }
              ]
            }
          ]
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 1,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        },
        {
          "from": {
            "column": 18,
            "row": 6
          },
          "to": {
            "column": 2,
            "row": 7
          },
          "tier": "total",
          "blocksSight": true,
          "firstBlockingCell": {
            "column": 10,
            "row": 6
          },
          "vertexHits": []
        }
      ]
    }
  }
]
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":8,"row":3},"changed":[{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":8,"row":3},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":8,"row":3},"changed":[{"from":{"column":1,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":9,"row":3},"changed":[{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":9,"row":3},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":9,"row":3},"changed":[{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_CURRENT {
  "dmFog": [
    {
      "column": 4,
      "row": 3
    },
    {
      "column": 8,
      "row": 3
    },
    {
      "column": 9,
      "row": 3
    }
  ],
  "concealed": [
    {
      "column": 8,
      "row": 2
    },
    {
      "column": 9,
      "row": 2
    },
    {
      "column": 4,
      "row": 3
    },
    {
      "column": 8,
      "row": 3
    },
    {
      "column": 9,
      "row": 3
    },
    {
      "column": 7,
      "row": 4
    },
    {
      "column": 8,
      "row": 4
    },
    {
      "column": 9,
      "row": 4
    }
  ],
  "pendingRequestHash": "0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0",
  "coordinatorHash": "79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd",
  "revisionChecksum": "52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8"
}

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..04f63765b4f1ed11e9614561464d8068efe0a71d
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,216 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [{ column: 8, row: 3 }, { column: 9, row: 3 }]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp/wall-r2-probe.ts
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8859362ee7fe3570c1e9fc4bcba8d6902b43338b
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,219 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8859362ee7fe3570c1e9fc4bcba8d6902b43338b
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,219 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

exec
/bin/bash -lc "npx vite-node .tmp/wall-r2-probe.ts | rg '"'^SCENE_RAYS|''^SCENE_CURRENT|pendingRequestHash|coordinatorHash|revisionChecksum|dmFog|concealed'"'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8859362ee7fe3570c1e9fc4bcba8d6902b43338b
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,219 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

 succeeded in 4480ms:
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":8,"row":2},"changed":[{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":8,"row":2},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":8,"row":2},"changed":[{"from":{"column":1,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":9,"row":2},"changed":[{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":9,"row":2},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":9,"row":2},"changed":[{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":8,"row":3},"changed":[{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":8,"row":3},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":8,"row":3},"changed":[{"from":{"column":1,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":8,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:fighter","source":{"column":2,"row":3},"target":{"column":9,"row":3},"changed":[{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":3,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_RAYS {"observer":"combatant:cleric","source":{"column":1,"row":4},"target":{"column":9,"row":3},"changed":[]}
SCENE_RAYS {"observer":"combatant:wizard","source":{"column":1,"row":2},"target":{"column":9,"row":3},"changed":[{"from":{"column":1,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":1,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":9,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]},{"from":{"column":2,"row":3},"to":{"column":10,"row":3},"old":false,"post":true,"vertices":[{"vertex":{"column":7,"row":3},"pair":[{"column":7,"row":2},{"column":6,"row":3}]}]}]}
SCENE_CURRENT {
  "dmFog": [
  "concealed": [
  "pendingRequestHash": "0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0",
  "coordinatorHash": "79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd",
  "revisionChecksum": "52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8"

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8859362ee7fe3570c1e9fc4bcba8d6902b43338b
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,219 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp/wall-r2-probe.ts
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

exec
/bin/bash -lc "npx vite-node .tmp/wall-r2-probe.ts | rg '"'^CONVERSATION_CANDIDATE'"'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

 succeeded in 4491ms:
CONVERSATION_CANDIDATE {"columns":[8,8],"delta":{"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric","combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}}
CONVERSATION_CANDIDATE {"columns":[8,9],"delta":{"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric"],"closed":[]}}
CONVERSATION_CANDIDATE {"columns":[9,8],"delta":{"opened":["combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}}
CONVERSATION_CANDIDATE {"columns":[8,7],"delta":{"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric","combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}}
CONVERSATION_CANDIDATE {"columns":[7,8],"delta":{"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric","combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}}

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));

codex
The four R02/conversation reds are not rule defects: their earlier D635 “one-cell-left” repairs now create new diagonal blocker pairs at vertices `(10,3)`, `(10,2)`, and `(10,6)`. That removes the tests’ intended visible-shot/frontier subjects. Per your stop rule, I will not normalize those outcomes. I’m validating the minimal re-authoring proposal in memory: shift those already-moved blockers one additional cell left, which removes the diagonal contact while retaining the original cover tiers.
apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

exec
/bin/bash -lc "npx vitest run tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/tools/ai-dm-conversation.test.ts --reporter=verbose --testNamePattern='blocked auto-submit|unresolved frontier prevents|target-specific non-nearest R02|both 90-foot Scout shots'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

exec
/bin/bash -lc "npx vitest run tests/unit/tools/ai-dm-conversation.test.ts --reporter=dot --testNamePattern='blocked auto-submit|unresolved frontier prevents'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

 succeeded in 33685ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
 ✓ tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter 20ms
 ↓ tests/unit/vtt/tactical-evaluator-r02.test.ts > R02-like canonical tactical query > compares ordered registry allocations with exact post-grant Bless conditioning
 ✓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > renders target-specific non-nearest R02 rows in always-on context with exact reasons 795ms
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > keeps exact probability internally while both context and query render coarse values
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > paginates the full matrix with a state-bound cursor and advertises the read tool to the DM
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > emits a short neutral death-save window only when the top actor precedes the target
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > renders the failure manifest only in the DM profile and retains the 32 KiB trim
 ↓ tests/unit/vtt/dm-tactical-intel.test.ts > versioned DM tactical intel > attaches full-precision offered-set and all intel policy versions to accepted capture
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > omits DM-only intel_mode from blind planned context arguments
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists indeterminate artifact and forensic row before raising the typed integrity STOP
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > classifies a timeout after catalog observation but before a tool call without an integrity STOP
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists primary D569 timeout evidence before applying the expired round deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with a contradictory catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with a contradictory catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid malformed catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid wrong_profile catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid malformed catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid wrong_profile catalog
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists a runner forensic row before propagating conflicting startup evidence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists delivered context and process evidence before propagating conflicting startup evidence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a request after the MCP child closes stdin without an unhandled EPIPE
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a readline input error through typed rejection and complete teardown
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects an in-flight MCP request specifically on child exit
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects on stdout closure and terminates a child that remains alive
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > refuses an MCP request issued after the child has exited
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > preserves a request failure through the caller try/finally cleanup path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > reports standalone abnormal MCP termination as a typed error
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized revision-bound Dodge proposal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes targeted Web and non-targeted Dodge through composite options
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > round-trips the End Turn option emitted by the tactical context
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > wall begins before initial without speculation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > speculation uses arm base until trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restricted wall excludes engine work and includes later speculation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 1000 ms remains outside the restricted wall
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 200000 ms remains outside the restricted wall
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired speculative adoption validation cannot adopt or execute that branch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired recalculation authorization cannot retain or execute recalculated entries on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > one rejected submission uses arm-base correction before D474 escalation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > empty structured correction is not D474 validation evidence on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > correction refusal triggers a fresh D474 escalation on the real path
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > actual refusal is the only single-attempt D474 trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps tiered primary argv/config byte-identical and isolates escalation from the base session
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'tiered' correction using actual dispatch bookkeeping
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'untiered' correction using actual dispatch bookkeeping
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized MCP attack proposal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > requests full context for round one and a delta for a resumed later round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > preserves accepted suggested composite proposals in the authorized SIMULATED row
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > re-resolves independently specified stored mechanics before reporting divergence
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > divergence refuses a stored resolution produced under a different offer environment
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects stored proposal resolutions with missing or non-64-hex environment digests
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects plan adjustment envelopes whose stored updates carry malformed digests
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943004 through the real host after resolving boundary decisions
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943007 through the real host after resolving boundary decisions
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the decline policy and authorizes the SIMULATED arena round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the take policy and authorizes the SIMULATED arena round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > falls back to unattended toggle policy when sticky guidance does not cover the pending trigger
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one SIMULATED session across two rooms, one correction, and a browser restore
 ✓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit 14722ms
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'no proposal' from the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'validation exhaustion' from the stub adapter
 ✓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'blocked auto-submit' from the stub adapter 14708ms
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'timeout' from the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not depend on turn-context rendering to resolve a brutal exhaustion frontier
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a three-room three-round model-free brutal smoke with the stub adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retries one SIMULATED service flap and uses the first healthy primary turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > marks three consecutive SIMULATED service flaps as service_null without exhausting the turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not retry a SIMULATED primary turn that called engine tools before rejection
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records when the configured turn-context trimmer fired
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > injects the root and tactics pair byte-for-byte only on cold start and attributes its hash
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > threads a selected skill through every invocation and hashes the exact fixture bytes
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free none instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free kb instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free skill instruction-source smoke through a SIMULATED adapter
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > starts the persistent SIMULATED session with the first round plan in one model dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects audited boilerplate at structured-final ingress before accepting a substantive correction
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > passes a persisted final-index row through packet validation
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records no chosen indices when no final-index decision is accepted
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects speculative structured-final dispatch at the typed phase boundary (mutation: pass speculative through as a decision phase)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > directs K6 to consume an inline suggestion without fetching the same play again
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > admits the active process and local OpenAI conversation adapters
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > walks an alternating initiative fixture without waking the DM for HP-only drift
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ends a three-round room as party_defeated when all PCs are dead entering the party segment
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs three rounds with a one-round party program by recording typed default turns
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice keep
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice change
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches an adjustment when the retained primary becomes illegal
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a speculative context actor mismatch before model dispatch
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop)
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records partial_execution when execution throws after a completed PC turn
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards speculation when the actual board invalidates the planned option structure
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts the cell when speculation recalculation infrastructure fails after staging output
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the end-of-round join
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the exception-cleanup join
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > terminates incomplete speculation with a failed rebase without repeating the initiative loop
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts speculative planning at the D407 pacing deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards a speculative proposal staged before timeout without authorizing it
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not spend a second adjustment flap budget when preflight finds no material plan change
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs one adjustment correction and retains the corrected replacement
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > stamps speculation recalculation launchers with the speculative dispatch phase
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps the baseline after three adjustment service nulls and continues the round
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores a staged adjustment proposal after timeout and retains the authorized baseline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records adjustment timeout evidence before applying the expired round deadline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores an adjustment correction proposal staged before timeout and retains the authorized baseline
 ↓ tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > treats adjustment correction no-response as protocol exhaustion, not a flap

 Test Files  3 passed (3)
      Tests  4 passed | 114 skipped (118)
   Start at  21:14:34
   Duration  33.36s (transform 3.25s, setup 0ms, import 5.74s, tests 30.25s, environment 0ms)


diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

 succeeded in 33566ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
----------------------------------------------------·--·------------------------------------------------------

 Test Files  1 passed (1)
      Tests  2 passed | 108 skipped (110)
   Start at  21:15:02
   Duration  33.23s (transform 1.88s, setup 0ms, import 2.88s, tests 28.81s, environment 0ms)


diff --git a/.tmp/wall-r2-probe.ts b/.tmp/wall-r2-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..21c4418c6d4583693ae62e4c4a854768a4335107
--- /dev/null
+++ b/.tmp/wall-r2-probe.ts
@@ -0,0 +1,251 @@
+import { combatToken } from '../src/combat/combatant';
+import { createEncounter, type EncounterState } from '../src/combat/encounter';
+import { cornerLineCrossesCell, outerCorners, traceCombatantLine } from '../src/combat/cover';
+import { mulberry32 } from '../src/combat/random';
+import { projectDmView, projectPlayerView } from '../src/combat/visibility';
+import {
+  armorClass, combatantId, encounterBranchId, encounterSessionId, worldObjectId,
+  type CombatantId,
+} from '../src/combat/values';
+import { canonicalJson } from '../src/commands/canonical-json';
+import { sha256 } from '../src/crypto/sha256';
+import {
+  REFERENCE_FIGHTER_ID, REFERENCE_PLAYER_IDS, referenceEncounterSetup,
+} from '../src/vtt/reference-encounter';
+import {
+  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
+} from '../src/vtt/session-persistence';
+import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
+
+type Cell = Readonly<{ column: number; row: number }>;
+type Point = Cell;
+
+function key(cell: Cell): string { return `${cell.column},${cell.row}`; }
+
+function gcd(a: number, b: number): number {
+  let left = Math.abs(a);
+  let right = Math.abs(b);
+  while (right !== 0) [left, right] = [right, left % right];
+  return left;
+}
+
+function diagonalPairAt(vertex: Point, blockers: ReadonlySet<string>): readonly Cell[] | null {
+  const tl = { column: vertex.column - 1, row: vertex.row - 1 };
+  const tr = { column: vertex.column, row: vertex.row - 1 };
+  const bl = { column: vertex.column - 1, row: vertex.row };
+  const br = { column: vertex.column, row: vertex.row };
+  if (blockers.has(key(tl)) && blockers.has(key(br))) return [tl, br];
+  if (blockers.has(key(tr)) && blockers.has(key(bl))) return [tr, bl];
+  return null;
+}
+
+function vertexHits(from: Point, to: Point, blockerCells: readonly Cell[]) {
+  const blockers = new Set(blockerCells.map(key));
+  const dc = to.column - from.column;
+  const dr = to.row - from.row;
+  const steps = gcd(dc, dr);
+  const hits = [];
+  for (let i = 1; i < steps; i += 1) {
+    const vertex = { column: from.column + dc * i / steps, row: from.row + dr * i / steps };
+    const pair = diagonalPairAt(vertex, blockers);
+    if (pair !== null) hits.push({ vertex, pair });
+  }
+  return hits;
+}
+
+function lineSummary(state: EncounterState, sourceId: CombatantId, targetId: CombatantId, sourceAnchor?: Cell) {
+  const trace = traceCombatantLine(state, sourceId, targetId, sourceAnchor === undefined ? {} : { sourceAnchor });
+  return {
+    sourceCorner: trace.sourceCorner,
+    tier: trace.tier,
+    blocksSight: trace.blocksSight,
+    firstBlockingCell: trace.firstBlockingCell,
+    lines: trace.lines.map((line) => ({
+      from: trace.sourceCorner,
+      to: line.targetCorner,
+      tier: line.tier,
+      blocksSight: line.blocksSight,
+      firstBlockingCell: line.firstBlockingCell,
+      vertexHits: vertexHits(trace.sourceCorner, line.targetCorner, state.blockedCells),
+    })),
+  };
+}
+
+function rawOldNewRays(source: Cell, target: Cell, blockers: readonly Cell[]) {
+  const oldBlocked = (from: Point, to: Point): boolean => {
+    if (blockers.some((cell) => cornerLineCrossesCell(from, to, cell))) return true;
+    if (from.row === to.row && Number.isInteger(from.row)) {
+      for (let c = Math.min(from.column, to.column); c < Math.max(from.column, to.column); c += 1) {
+        if (blockers.some((x) => x.column === c && x.row === from.row - 1) &&
+            blockers.some((x) => x.column === c && x.row === from.row)) return true;
+      }
+    }
+    if (from.column === to.column && Number.isInteger(from.column)) {
+      for (let r = Math.min(from.row, to.row); r < Math.max(from.row, to.row); r += 1) {
+        if (blockers.some((x) => x.column === from.column - 1 && x.row === r) &&
+            blockers.some((x) => x.column === from.column && x.row === r)) return true;
+      }
+    }
+    return false;
+  };
+  return outerCorners([source]).flatMap((from) => outerCorners([target]).map((to) => {
+    const old = oldBlocked(from, to);
+    const vertices = vertexHits(from, to, blockers);
+    return { from, to, old, post: old || vertices.length > 0, vertices };
+  })).filter((ray) => !ray.old && ray.post);
+}
+
+function sceneState() {
+  const setup = referenceEncounterSetup();
+  return createEncounter({
+    ...setup,
+    worldObjects: [
+      {
+        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door' as const,
+        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier' as const,
+        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: true, lineOfSight: true, cover: 'total' as const }, createdRevision: 0,
+      },
+      {
+        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source' as const,
+        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
+        durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
+        blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
+      },
+    ],
+  });
+}
+
+const hard = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
+const fighter = combatantId('combatant:fighter');
+const scouts = [
+  combatantId('combatant:generated-5117009-monster-3'),
+  combatantId('combatant:generated-5117009-monster-5'),
+];
+const r02 = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
+    ? { column: 9, row: 2 }
+    : cell),
+};
+console.log('R02_CURRENT', JSON.stringify(scouts.map((id) => ({ id, trace: lineSummary(r02, id, fighter) })), null, 2));
+
+for (const destination of [
+  { column: 8, row: 2 }, { column: 9, row: 1 }, { column: 9, row: 3 },
+  { column: 8, row: 1 }, { column: 8, row: 3 },
+]) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 2 ? destination : cell),
+  };
+  console.log('R02_CANDIDATE', JSON.stringify({ destination, traces: scouts.map((id) => ({ id, trace: lineSummary(candidate, id, fighter) })) }));
+}
+
+const conversation = {
+  ...hard,
+  blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && (cell.row === 1 || cell.row === 5)
+    ? { column: 9, row: cell.row }
+    : cell),
+};
+function visibilityDelta(before: EncounterState, after: EncounterState) {
+  const monsters = before.combatants.filter((entry) => entry.profile.kind === 'monster');
+  const players = before.combatants.filter((entry) => entry.profile.kind === 'player_character');
+  const opened: string[] = [];
+  const closed: string[] = [];
+  for (const monster of monsters) {
+    for (const player of players) {
+      const anchor = monster.profile.id === combatantId('combatant:generated-5117009-monster-2')
+        ? { column: 13, row: 1 }
+        : undefined;
+      const beforeBlocked = traceCombatantLine(before, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const afterBlocked = traceCombatantLine(after, monster.profile.id, player.profile.id,
+        anchor === undefined ? {} : { sourceAnchor: anchor }).blocksSight;
+      const pair = `${monster.profile.id}->${player.profile.id}`;
+      if (beforeBlocked && !afterBlocked) opened.push(pair);
+      if (!beforeBlocked && afterBlocked) closed.push(pair);
+    }
+  }
+  return { opened, closed };
+}
+for (const columns of [[8, 8], [8, 9], [9, 8], [8, 7], [7, 8]] as const) {
+  const candidate = {
+    ...hard,
+    blockedCells: hard.blockedCells.map((cell) => cell.column === 10 && cell.row === 1
+      ? { column: columns[0], row: cell.row }
+      : cell.column === 10 && cell.row === 5
+        ? { column: columns[1], row: cell.row }
+        : cell),
+  };
+  console.log('CONVERSATION_CANDIDATE', JSON.stringify({ columns, delta: visibilityDelta(hard, candidate) }));
+}
+const pairs = [
+  ['combatant:generated-5117009-monster-1', 'combatant:fighter', undefined],
+  ['combatant:generated-5117009-monster-2', 'combatant:fighter', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-2', 'combatant:cleric', { column: 13, row: 1 }],
+  ['combatant:generated-5117009-monster-5', 'combatant:wizard', undefined],
+  ['combatant:generated-5117009-monster-6', 'combatant:wizard', undefined],
+] as const;
+console.log('CONVERSATION_CURRENT', JSON.stringify(pairs.map(([s, t, a]) => ({
+  pair: `${s}->${t}`,
+  before: lineSummary(hard, combatantId(s), combatantId(t), a),
+  after: lineSummary(conversation, combatantId(s), combatantId(t), a),
+})), null, 2));
+
+const scene = sceneState();
+const sceneBlockers = [
+  ...scene.blockedCells,
+  ...scene.worldObjects.filter((object) => object.blocking.lineOfSight).flatMap((object) => object.footprint),
+];
+const tokenById = new Map(scene.tokens.map((token) => [token.combatantId, token.position]));
+for (const target of [
+  { column: 8, row: 2 }, { column: 9, row: 2 },
+  { column: 8, row: 3 }, { column: 9, row: 3 },
+]) {
+  for (const observer of REFERENCE_PLAYER_IDS) {
+    const source = tokenById.get(observer);
+    if (source === undefined) continue;
+    console.log('SCENE_RAYS', JSON.stringify({ observer, source, target, changed: rawOldNewRays(source, target, sceneBlockers) }));
+  }
+}
+
+const view = projectPlayerView(scene, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
+const coordinator = {
+  requestSequence: 1,
+  pendingRequest: {
+    kind: 'turn' as const,
+    requestId: 'request:handoff-baseline',
+    encounterRevision: scene.revision,
+    actorId: REFERENCE_FIGHTER_ID,
+    visibleState: view,
+    legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
+  },
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+const store = new MemoryBrowserSessionStore();
+const sessionId = encounterSessionId('session:handoff-persistence-baseline');
+EncounterSessionJournal.create({
+  sessionId,
+  branchId: encounterBranchId('branch:handoff-persistence-baseline'),
+  encounterState: scene,
+  coordinatorState: coordinator,
+  controllers: [],
+  rng: mulberry32(16_603),
+  store,
+  mirror: new MemoryMirrorSink(),
+});
+console.log('SCENE_CURRENT', JSON.stringify({
+  dmFog: projectDmView(scene).state.foggedCells,
+  concealed: view.concealedCells,
+  pendingRequestHash: sha256(canonicalJson(coordinator.pendingRequest)),
+  coordinatorHash: sha256(canonicalJson(coordinator)),
+  revisionChecksum: store.revisions(sessionId)[0]?.checksum,
+}, null, 2));
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..ae85500e449d55e34752aeac5e42be9af1c31ff6
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,7 +228,7 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
   // Each move opens its targeted seam and every ray through the old cell interior.
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..6c83e2eb927cb4fefe7eef355919ca56be13534c
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -80,7 +80,7 @@
     // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
     // cell left to (9,2) opens one side of that edge while preserving the 90-foot
     // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..0a94e2ffcb1d09a83b7ef1fe33ff13a7ade62b5c
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -93,7 +93,7 @@
     // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
     // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
     // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp/wall-r2-probe.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts
codex
The proposed edits are proven: moving the R02 blocker from `(9,2)` to `(8,2)` makes both R02 tests pass, and moving the conversation blockers from `(9,1)/(9,5)` to `(8,1)/(8,5)` restores exactly the five intended visibility openings and makes both conversation tests pass (2/2, 108 skipped). I restored every temporary probe/edit; I’m doing the requested clean-tree checks now, while leaving the repository unchanged as required by the stop condition.
exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 14418ms:
 succeeded in 27982ms:
exec
/bin/bash -lc 'git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc 'git status --short' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc 'npx vitest run tests/unit/combat/visibility-field.test.ts tests/unit/vtt/room-generator-los-cover.test.ts --reporter=dot' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
codex
The compile checks are clean (`tsconfig.app` 0, `tsconfig.node` 0), and both `git diff --check` and `git status --short` are empty. The visibility/LOS verification is still running; its two early `x` marks are the existing 5-second LOS budget tests, so I’m waiting for the final isolated counts before classifying them.
 exited 1 in 110963ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
··························································xx··································································································

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:328:3
    326|   });
    327|
    328|   it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', …
       |   ^
    329|     for (const fixture of FIXTURE_CASES) {
    330|       const room = generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:342:3
    340|   });
    341|
    342|   it('retains a productive first-turn option for every living monster …
       |   ^
    343|     for (const fixture of FIXTURE_CASES) {
    344|       expectProductiveMonsters(generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed | 1 passed (2)
      Tests  2 failed | 156 passed (158)
   Start at  21:17:01
   Duration  110.60s (transform 2.05s, setup 0ms, import 3.07s, tests 107.46s, environment 0ms)


exec
/bin/bash -lc "npx vitest run tests/unit/vtt/room-generator-los-cover.test.ts --reporter=dot --testNamePattern='kills M576-E2-WALL-SEALS-ROOM for every living footprint size'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 exited 1 in 8833ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
------------x---------------------------------------------------------------------------------------------------

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:328:3
    326|   });
    327|
    328|   it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', …
       |   ^
    329|     for (const fixture of FIXTURE_CASES) {
    330|       const room = generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 111 skipped (112)
   Start at  21:19:03
   Duration  8.51s (transform 1.23s, setup 0ms, import 1.78s, tests 5.29s, environment 0ms)


exec
/bin/bash -lc "npx vitest run tests/unit/vtt/room-generator-los-cover.test.ts --reporter=dot --testNamePattern='retains a productive first-turn option for every living monster in the versioned basis'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 exited 1 in 9093ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
-------------x--------------------------------------------------------------------------------------------------

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:342:3
    340|   });
    341|
    342|   it('retains a productive first-turn option for every living monster …
       |   ^
    343|     for (const fixture of FIXTURE_CASES) {
    344|       expectProductiveMonsters(generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 111 skipped (112)
   Start at  21:19:22
   Duration  8.77s (transform 1.23s, setup 0ms, import 1.77s, tests 5.55s, environment 0ms)


exec
/bin/bash -lc 'git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc 'git status --short' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc "rg -n \"ws close code|M576-E2-COVER-OVERLAPS-SPAWN|rejects a deleted committed spec|js-round-plan|vane-tpk\" tests -g '*.ts'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/integration/vtt/pc-algorithm-policy.test.ts:967:  it('vane-tpk-clean-terminates: the doomed composition defeats the party after death saves', async () => {
tests/unit/tools/d583-contract-inventory.test.ts:165:  it('rejects a deleted committed spec discovered through the Git seam', () => {
tests/unit/vtt/mutation-ledger.test.ts:800:    const tests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
tests/unit/vtt/mutation-ledger.test.ts:856:    const bridgeTests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
tests/unit/vtt/mutation-ledger.test.ts:901:    const bridgeTests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
tests/unit/vtt/room-generator-los-cover.test.ts:319:  it('kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture', () => {

exec
/bin/bash -lc "rg -n \"close code|close.*code|it\\(\" tests/unit/vtt/node-runtime.test.ts tests/unit/bridge/js-round-plan-integration.test.ts | head -120" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/unit/bridge/js-round-plan-integration.test.ts:233:    monsters: request.livingMonsterIds.map((monsterId) => ({ monsterId, source: 'emit(endTurn());' })),
tests/unit/bridge/js-round-plan-integration.test.ts:260:      const decoded = decodeRoundPlanReply({ kind, [field]: 'emit(endTurn());' }, request, {
tests/unit/bridge/js-round-plan-integration.test.ts:265:      expect(decoded.jsPrograms).toMatchObject([{ monsterId: f.monster.id, source: 'emit(endTurn());' }]);
tests/unit/bridge/js-round-plan-integration.test.ts:278:      ? { combatantId: monsterId, program: 'emit(endTurn());' }
tests/unit/bridge/js-round-plan-integration.test.ts:279:      : { actorId: monsterId, source: 'emit(endTurn());' });
tests/unit/bridge/js-round-plan-integration.test.ts:294:        monsters: [{ combatantId: f.monster.id, [field]: 'emit(endTurn());' }],
tests/unit/bridge/js-round-plan-integration.test.ts:298:      expect(decoded.jsPrograms[0]).toMatchObject({ monsterId: f.monster.id, source: 'emit(endTurn());' });
tests/unit/bridge/js-round-plan-integration.test.ts:302:  it('normalizes measured object maps both at the body and collection levels', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:306:    const keyed = Object.fromEntries(ids.map((monsterId) => [monsterId, 'emit(endTurn());']));
tests/unit/bridge/js-round-plan-integration.test.ts:317:  it('fills only absent envelope identity fields and reports that rule', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:321:      monsters: [{ monsterId: f.monster.id, source: 'emit(endTurn());' }],
tests/unit/bridge/js-round-plan-integration.test.ts:333:  it('single_program_accepted_for_batch: refuses a bare program for a batch and names every missing association', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:341:        if (this.requests.length === 1) return { program: 'emit(endTurn());' };
tests/unit/bridge/js-round-plan-integration.test.ts:342:        return jsReply(request, 'emit(endTurn());');
tests/unit/bridge/js-round-plan-integration.test.ts:372:  it('refuses an incomplete combatant-keyed batch instead of guessing missing programs', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:376:    expect(() => decodeRoundPlanReply({ [String(ids[0])]: 'emit(endTurn());' }, request, {
tests/unit/bridge/js-round-plan-integration.test.ts:381:  it('refuses the unmeasured per-entry plan alias while retaining the measured root plan alias', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:385:      monsters: [{ monsterId: f.monster.id, plan: 'emit(endTurn());' }],
tests/unit/bridge/js-round-plan-integration.test.ts:389:  it('dts_widens_to_string is killed by actor-visible literal unions and unavailable combatant diagnostics', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:396:    const result = typeCheckJsTurnProgram("emit(attack('combatant:not-present'));", declaration.source);
tests/unit/bridge/js-round-plan-integration.test.ts:406:  it('a spell absent from reducer-enumerated legal casts fails with a compiler diagnostic', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:414:      `emit(castSpell('unprepared-spell', '${String(f.player.id)}'));`,
tests/unit/bridge/js-round-plan-integration.test.ts:423:  it('movement above the branded decision-time budget fails to compile', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:430:      `emit(move('${String(f.player.id)}', 31));`,
tests/unit/bridge/js-round-plan-integration.test.ts:440:  it('numberUnion defensive boundary emits the cap and throws a typed error one foot over', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:459:  it('dts_ordering_nondeterministic is killed by byte-identical declarations with stable unions', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:476:  it('reuses the compiler host/library snapshot within the turn-loop latency budget', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:483:    const source = `emit(attack('claw', '${String(f.player.id)}'));`;
tests/unit/bridge/js-round-plan-integration.test.ts:494:  it('typecheck_result_ignored is killed by refusal before interpretation with verbatim correction diagnostics and telemetry', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:497:    const exchange = new FakeJsExchange(`emit(move('${String(f.player.id)}', 31));`);
tests/unit/bridge/js-round-plan-integration.test.ts:529:  it('arms_share_typecheck: untyped JS bypasses compilation while preserving byte-identical model requests', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:531:    const source = 'emit(move(nearestEnemy(), 31));';
tests/unit/bridge/js-round-plan-integration.test.ts:566:  it('shadow_run_leaks: classifies on a disposable state without adding model exchanges or touching encounter state', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:572:      'emit(endTurn());',
tests/unit/bridge/js-round-plan-integration.test.ts:587:      'emit(attack());',
tests/unit/bridge/js-round-plan-integration.test.ts:599:  it('derives the js_program prompt contract from the interpreter grammar module', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:610:  it('a js_program plan drives a fake-exchange table and replays source plus emitted DecisionProgram byte-for-byte', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:612:    const source = 'const target = nearestEnemy(); emit(focusFire(target));';
tests/unit/bridge/js-round-plan-integration.test.ts:692:  it('interpreter_bypasses_validation rejects an emitted action through DecisionProgram validation', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:694:    const exchange = new FakeJsExchange('emit(retreat(-1, 0));');
tests/unit/bridge/js-round-plan-integration.test.ts:705:  it('rider_searched_independently never considers a fixed rider follow-up when the attached attack is illegal', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:707:    const source = 'const target = nearestEnemy(); emit(attack(target, riderOnCrit(endTurn())));';
tests/unit/bridge/js-round-plan-integration.test.ts:721:  it('js_source_missing_from_replay keeps both source and validated output in the authoritative transcript', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:723:    const source = 'emit(endTurn());';
tests/unit/vtt/node-runtime.test.ts:110:  return new Promise((resolveCode) => socket.once('close', (code) => resolveCode(code)));
tests/unit/vtt/node-runtime.test.ts:258:  it('validates bounded nonsymlink mode-0600 claims before listening', () => {
tests/unit/vtt/node-runtime.test.ts:282:  it('validates token-file identity, permissions, and size on the opened descriptor', () => {
tests/unit/vtt/node-runtime.test.ts:313:  it('refuses a FIFO without blocking and proves removing O_NONBLOCK exceeds the bounded deadline', () => {
tests/unit/vtt/node-runtime.test.ts:348:  it('authenticates before upgrade, echoes only vtt.v1, and binds claims to session.open', async () => {
tests/unit/vtt/node-runtime.test.ts:402:  it('handles fragmentation and ping/pong while rejecting binary, malformed, oversized, and late-open clients', async () => {
tests/unit/vtt/node-runtime.test.ts:437:  it('terminates a physical peer that withholds its close response during factory shutdown', async () => {
tests/unit/vtt/node-runtime.test.ts:451:  it('contains a malformed frame received while a policy-closing peer is still physical', async () => {
tests/unit/vtt/node-runtime.test.ts:467:  it('uses fresh logical sessions and refuses reused wire ids before dispatch', async () => {
tests/unit/vtt/node-runtime.test.ts:491:  it('sends a receipt response before its event and queues a synchronous autonomous reaction in sequence', async () => {
tests/unit/vtt/node-runtime.test.ts:527:  it('binds two player claims independently and refuses cross-seat token authority', async () => {

exec
/bin/bash -lc 'rg -n "function branchRngStateFingerprint|export .*branchRngStateFingerprint|mechanicalBranchState" src/vtt/session-persistence.ts tests/unit/vtt/scene-snapshot.test.ts' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
src/vtt/session-persistence.ts:1044:function mechanicalBranchState(encounterState: EncounterState): unknown {
src/vtt/session-persistence.ts:1099:function branchRngStateFingerprint(encounterState: EncounterState): string {
src/vtt/session-persistence.ts:1100:  return sha256(canonicalJson(mechanicalBranchState(encounterState)));

codex
The vertex rule is correct, but four tests lose their intended subjects. Per the stop condition, I made no changes. The minimal scene edits below were temporarily proven, then fully restored.

| Test | Geometry and pre/post trace | Decision |
|---|---|---|
| `scene-snapshot` persisted bytes | Blockers: cell `(7,2)` and door `(6,3)`, diagonally meeting at vertex `(7,3)`. Fighter `(2,3)` and wizard `(1,2)` previously reached targets `(8,3)/(9,3)` along row-3 corner rays—for example `(3,3)→(8,3)` and `(2,3)→(9,3)`. Cleric `(1,4)` was already blocked by interiors. Each last-clear ray changes from `tier:none / blocksSight:false / first:null` to `tier:none / blocksSight:true / first:(7,2)`. | Correct D642 consequence. DM fog changes `{(4,3)}` → `{(4,3),(8,3),(9,3)}`. Fighter concealment additionally gains `(8,2),(9,2),(8,3),(9,3)`. No fixture generator owns this hand-authored state. Normalization was derived but not applied because later rows trigger the mandatory stop. |
| `blocked auto-submit` fallbackReason | The helper moves blockers `(10,1)→(9,1)` and `(10,5)→(9,5)`. Those now meet existing `(10,2)` and `(10,6)` diagonally at vertices `(10,2)` and `(10,6)`. Last-clear rays include `(19,2)→(1,2)`, `(13,2)→(1,2)`, `(14,1)→(2,4)`, `(19,6)→(1,6)`, and `(18,6)→(1,6)`. Each changes from `none/false/null` to `none/true/(9,1)` or `none/true/(9,5)`. | Correct D642 consequence, but the blocked-auto-submit subject disappears before execution: expected five opened pairs becomes `[]`. Requires scene re-authoring. |
| unresolved-frontier `sim_controller` | Same two vertices and five rays as above. The intended frontier-producing visibility openings are eliminated. | Correct D642 consequence, but the unresolved-frontier subject disappears. Requires the same scene re-authoring. |
| `dm-tactical-intel` R02 row | Scout `(19,3)` targets fighter `(1,2)`. Moving `(10,2)→(9,2)` created a diagonal pair with `(10,3)` at vertex `(10,3)`. Both formerly clear row-3 rays, `(19,3)→(1,3)` and `(19,3)→(2,3)`, change from `none/false/null` to `none/true/(9,2)`. Aggregate physical cover remains `half`, but optical sight changes clear→blocked, so the row becomes `HIDDEN`. | Correct D642 consequence, but the intended visible, non-nearest shot/reason row disappears. Requires scene re-authoring. |
| `tactical-evaluator-r02` two Scout shots | Same `(9,2)/(10,3)` pair at `(10,3)`. First Scout changes from `tier:half / blocksSight:false / first:null` to `half/true/(9,2)`; its reach becomes illegal and `minimumMovementFeet` becomes `null`. Second Scout `(19,5)` remains `three_quarters/false/null`. | Correct D642 consequence, but “both 90-foot Scout shots” is no longer true. Mandatory stop. |

Derived scene-snapshot normalization, not applied:

- `pendingRequestHash`: `78f31379…4049` → `0ec0fbbc…b8e0`
- `coordinatorHash`: `f8fa0780…9c66` → `79b076c9…36cd`
- `revisionChecksum`: `35c96ecc…0385` → `52305455…b3a8`
- `branchRngStateFingerprint`: remains `dd802783…46a`; encounter-state bytes did not change.

Minimal proposal:

- In both R02 helpers, move the re-authored blocker from `(9,2)` to `(8,2)`. This retains the original `half` and `three_quarters` cover tiers while restoring both 90-foot shots.
- In the conversation helper, move `(9,1)/(9,5)` to `(8,1)/(8,5)`. This restores exactly the original five opened monster→player pairs with zero closed pairs.

Temporary proof of that proposal: 3 files, 4 passed, 114 skipped; both conversation tests passed in 14.7 seconds each. All temporary edits were restored.

Verification:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- Current five-red reproduction — 5 failed, 121 skipped, exactly the five named failures.
- Visibility/LOS run — visibility-field 46/46; LOS 110/112. The two LOS 5-second tests also timed out alone at 5.29 and 5.55 seconds, so I did not classify them as load-only.
- `git diff --check` — exit 0.
- `git status --short` — empty; files touched: none.

Full-run timeouts treated as load-only and untouched:

- node-runtime WebSocket close-code case
- `M576-E2-COVER-OVERLAPS-SPAWN`
- `rejects a deleted committed spec discovered through the Git seam`
- `js-round-plan-integration`
- `vane-tpk-clean-terminates`

WALL-01-FIX-R2 BLOCKED
tokens used
163,271
The vertex rule is correct, but four tests lose their intended subjects. Per the stop condition, I made no changes. The minimal scene edits below were temporarily proven, then fully restored.

| Test | Geometry and pre/post trace | Decision |
|---|---|---|
| `scene-snapshot` persisted bytes | Blockers: cell `(7,2)` and door `(6,3)`, diagonally meeting at vertex `(7,3)`. Fighter `(2,3)` and wizard `(1,2)` previously reached targets `(8,3)/(9,3)` along row-3 corner rays—for example `(3,3)→(8,3)` and `(2,3)→(9,3)`. Cleric `(1,4)` was already blocked by interiors. Each last-clear ray changes from `tier:none / blocksSight:false / first:null` to `tier:none / blocksSight:true / first:(7,2)`. | Correct D642 consequence. DM fog changes `{(4,3)}` → `{(4,3),(8,3),(9,3)}`. Fighter concealment additionally gains `(8,2),(9,2),(8,3),(9,3)`. No fixture generator owns this hand-authored state. Normalization was derived but not applied because later rows trigger the mandatory stop. |
| `blocked auto-submit` fallbackReason | The helper moves blockers `(10,1)→(9,1)` and `(10,5)→(9,5)`. Those now meet existing `(10,2)` and `(10,6)` diagonally at vertices `(10,2)` and `(10,6)`. Last-clear rays include `(19,2)→(1,2)`, `(13,2)→(1,2)`, `(14,1)→(2,4)`, `(19,6)→(1,6)`, and `(18,6)→(1,6)`. Each changes from `none/false/null` to `none/true/(9,1)` or `none/true/(9,5)`. | Correct D642 consequence, but the blocked-auto-submit subject disappears before execution: expected five opened pairs becomes `[]`. Requires scene re-authoring. |
| unresolved-frontier `sim_controller` | Same two vertices and five rays as above. The intended frontier-producing visibility openings are eliminated. | Correct D642 consequence, but the unresolved-frontier subject disappears. Requires the same scene re-authoring. |
| `dm-tactical-intel` R02 row | Scout `(19,3)` targets fighter `(1,2)`. Moving `(10,2)→(9,2)` created a diagonal pair with `(10,3)` at vertex `(10,3)`. Both formerly clear row-3 rays, `(19,3)→(1,3)` and `(19,3)→(2,3)`, change from `none/false/null` to `none/true/(9,2)`. Aggregate physical cover remains `half`, but optical sight changes clear→blocked, so the row becomes `HIDDEN`. | Correct D642 consequence, but the intended visible, non-nearest shot/reason row disappears. Requires scene re-authoring. |
| `tactical-evaluator-r02` two Scout shots | Same `(9,2)/(10,3)` pair at `(10,3)`. First Scout changes from `tier:half / blocksSight:false / first:null` to `half/true/(9,2)`; its reach becomes illegal and `minimumMovementFeet` becomes `null`. Second Scout `(19,5)` remains `three_quarters/false/null`. | Correct D642 consequence, but “both 90-foot Scout shots” is no longer true. Mandatory stop. |

Derived scene-snapshot normalization, not applied:

- `pendingRequestHash`: `78f31379…4049` → `0ec0fbbc…b8e0`
- `coordinatorHash`: `f8fa0780…9c66` → `79b076c9…36cd`
- `revisionChecksum`: `35c96ecc…0385` → `52305455…b3a8`
- `branchRngStateFingerprint`: remains `dd802783…46a`; encounter-state bytes did not change.

Minimal proposal:

- In both R02 helpers, move the re-authored blocker from `(9,2)` to `(8,2)`. This retains the original `half` and `three_quarters` cover tiers while restoring both 90-foot shots.
- In the conversation helper, move `(9,1)/(9,5)` to `(8,1)/(8,5)`. This restores exactly the original five opened monster→player pairs with zero closed pairs.

Temporary proof of that proposal: 3 files, 4 passed, 114 skipped; both conversation tests passed in 14.7 seconds each. All temporary edits were restored.

Verification:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- Current five-red reproduction — 5 failed, 121 skipped, exactly the five named failures.
- Visibility/LOS run — visibility-field 46/46; LOS 110/112. The two LOS 5-second tests also timed out alone at 5.29 and 5.55 seconds, so I did not classify them as load-only.
- `git diff --check` — exit 0.
- `git status --short` — empty; files touched: none.

Full-run timeouts treated as load-only and untouched:

- node-runtime WebSocket close-code case
- `M576-E2-COVER-OVERLAPS-SPAWN`
- `rejects a deleted committed spec discovered through the Git seam`
- `js-round-plan-integration`
- `vane-tpk-clean-terminates`

WALL-01-FIX-R2 BLOCKED
