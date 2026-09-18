
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a0a642-35a1-7082-aba2-eda56ea291c1
--------
user
RULES (binding, restated): You are the REVIEWER (gpt-6-astra, MEDIUM, RESUMED — you reviewed WALL-01 r1 and found WALL-F3). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-ab — DETACHED clean checkout at b94dd732 (= bc6422bf + fix r4 + fix r5). Read-only sandbox; in-memory when /tmp is read-only; no edits, no git writes, no claude / other agents / consensus skills; never port 4173; no full gate / full vitest / Playwright / build. MAIN repo's .claude/decisions.md D654–D660 and .claude/consensus/vis-field/{impl-wall-01-fix-r4-sol.md,impl-wall-01-fix-r5-sol.md} readable. Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: re-review `git diff bc6422bf b94dd732` (src/combat/cover.ts, tests/unit/combat/visibility-field.test.ts, tests/unit/vtt/scene-snapshot.test.ts) = the endpoint-junction rule closing your WALL-F3, in its FINAL form (D657): at an endpoint vertex with a sealed diagonal pair, with Q the endpoint cell's own free quadrant, the ray is clear iff its other endpoint lies in the CLOSED quadrant Q (interior or Q's two boundary half-lines from v); otherwise it passes the pinch and blocks; interior-vertex, shared-edge, cell-interior rules and physical cover unchanged; same path in coverTierBetweenObjects. Supervisor verification (verify-wall-01-r5.log): your 6×6 scene (2,1)→(0,3) blocked first (1,1); reversed blocked; same-side (2,1)→(5,1) clear; adjacent corner (2,1)→(1,2) across the junction AGGREGATE blocked (r4 leaked here via edge-aligned rays ending at the junction — WALL-F4, my rule gap); interior crossing and the full stepped wall blocked; endpoint-rule-null mutant → 8 witnesses red; 15 suites 2277/2312 = exactly the 35 known reds; los-cover 109/112 (three 5 s budget timeouts, perf); pair 39 s; sol's counts and 42 generated rooms unchanged; scene-snapshot fog gains exactly (7,3) (fighter (2,3)→(7,3) and wizard (1,3)→(7,3) were edge rays ending at the sealed junction (7,3) between wall (7,2) and door (6,3)), hashes re-derived, state bytes/fingerprint unchanged.

CHECK: (1) Rational enumeration of the endpoint cases as you did in r1: source endpoint on a sealed vertex with the far endpoint in Q's interior / on each of Q's boundary half-lines / in the opposite quadrant / on the far faces / in an adjacent blocking quadrant (crosses interior anyway) — the rule must block exactly the pinch-crossing ones and keep own-edge grazes clear; the mirrored target-endpoint cases; the zero-length case; a source corner on a sealed vertex whose own cell is NOT free (impossible — state why) ; and the interaction with the shared-edge rule when an edge-aligned ray from v has blockers on BOTH flanks (both rules block; first cell consistent?). (2) Does the closed-quadrant test use exact integer arithmetic (no float)? Is the "own cell quadrant" derived correctly for every outerCorners position of a multi-cell (Large/Huge) space — construct a Large source whose top-left corner sits on a sealed junction. (3) Is any legitimate sightline now over-blocked: e.g. observer corner on a sealed vertex looking along its own cell's edge to a target beyond (Q's boundary) — clear? An observer whose corner is a sealed junction with the TARGET in the diagonal-adjacent quadrant across a single blocker (not a pair) — unaffected? (4) Re-derive the scene-snapshot (7,3) delta and the three hashes by substituting r3's cover.ts vs the candidate in memory; confirm nothing else in the projections changed. (5) Physical cover invariance; counts; generation bytes; the added per-ray cost vs r1 (los-cover productive-option timing). (6) tsc 0/0; suites you can run; no fixture bytes changed. OUTPUT: findings WALL-Fn; "VERDICT: ACCEPT" or "VERDICT: REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll check the endpoint rule against D657, rerun the leaking geometry from r1, and compare the snapshot payloads with r3’s tracer substituted in memory.

exec
/bin/bash -lc "git rev-parse HEAD; git status --short; sha256sum src/combat/cover.ts; git diff bc6422bf b94dd732 -- src/combat/cover.ts; python3 - <<'PY'
p='/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md'
s=open(p).read().splitlines()
for i,l in enumerate(s):
 if l.startswith('## D') and any(l.startswith('## D'+str(n)+' ') for n in range(654,661)):
  j=i+1
  while j<len(s) and not s[j].startswith('## '):j+=1
  print('\\n'.join(f'{k+1}:{s[k]}' for k in range(i,j)))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
b94dd73221697e3d03da8991746726563777fa74
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb  src/combat/cover.ts
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index 52e68ffc..29a577f1 100644
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -44,6 +44,22 @@ export interface CornerPoint {
   readonly row: number;
 }
 
+type QuadrantDirection = -1 | 1;
+
+interface CornerQuadrant {
+  readonly column: QuadrantDirection;
+  readonly row: QuadrantDirection;
+}
+
+interface CornerEndpoint {
+  readonly point: CornerPoint;
+  readonly cellQuadrant: CornerQuadrant;
+}
+
+interface ResolvedCornerEndpoint extends CornerEndpoint {
+  readonly blockingCell: GridCell | null;
+}
+
 /** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */
 export function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
   const first = cells[0];
@@ -68,6 +84,26 @@ export function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[]
   ];
 }
 
+function outerCornerEndpoints(cells: readonly GridCell[]): readonly CornerEndpoint[] {
+  const corners = outerCorners(cells);
+  const topLeft = corners[0];
+  const topRight = corners[1];
+  const bottomLeft = corners[2];
+  const bottomRight = corners[3];
+  if (topLeft === undefined || topRight === undefined ||
+    bottomLeft === undefined || bottomRight === undefined) {
+    throw new RangeError('A line query requires four outer corners.');
+  }
+  // The quadrant names the occupied space relative to its outer corner:
+  // top-left -> BR, top-right -> BL, bottom-left -> TR, bottom-right -> TL.
+  return [
+    { point: topLeft, cellQuadrant: { column: 1, row: 1 } },
+    { point: topRight, cellQuadrant: { column: -1, row: 1 } },
+    { point: bottomLeft, cellQuadrant: { column: 1, row: -1 } },
+    { point: bottomRight, cellQuadrant: { column: -1, row: -1 } },
+  ];
+}
+
 /** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */
 export function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
   const epsilon = 1e-9;
@@ -357,6 +393,51 @@ function greatestCommonDivisor(left: number, right: number): number {
   return dividend;
 }
 
+function sharedVertexBlockingCell(
+  column: number,
+  row: number,
+  sightBlockingAt: (cell: GridCell) => boolean,
+): GridCell | null {
+  const topLeft = { column: column - 1, row: row - 1 };
+  const topRight = { column, row: row - 1 };
+  // Check TL/BR first so lower row then lower column wins when both pairs seal.
+  if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) return topLeft;
+  if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) return topRight;
+  return null;
+}
+
+function endpointSharedVertexBlockingCell(
+  column: number,
+  row: number,
+  ownCellQuadrant: CornerQuadrant,
+  sightBlockingAt: (cell: GridCell) => boolean,
+): GridCell | null {
+  // The endpoint's own cell is excluded from blocking, so only the other diagonal pair can seal.
+  if (ownCellQuadrant.column === ownCellQuadrant.row) {
+    const topRight = { column, row: row - 1 };
+    return sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })
+      ? topRight
+      : null;
+  }
+  const topLeft = { column: column - 1, row: row - 1 };
+  return sightBlockingAt(topLeft) && sightBlockingAt({ column, row }) ? topLeft : null;
+}
+
+function resolveCornerEndpoints(
+  endpoints: readonly CornerEndpoint[],
+  sightBlockingAt: (cell: GridCell) => boolean,
+): readonly ResolvedCornerEndpoint[] {
+  return endpoints.map((endpoint) => ({
+    ...endpoint,
+    blockingCell: endpointSharedVertexBlockingCell(
+      endpoint.point.column,
+      endpoint.point.row,
+      endpoint.cellQuadrant,
+      sightBlockingAt,
+    ),
+  }));
+}
+
 function firstSharedVertexBlockingHit(
   from: CornerPoint,
   to: CornerPoint,
@@ -369,19 +450,52 @@ function firstSharedVertexBlockingHit(
   if (latticeSteps <= 1) return null;
   const columnStep = columnDelta / latticeSteps;
   const rowStep = rowDelta / latticeSteps;
-  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.
+  // Strict-interior vertices exclude t=0 and t=1; the direction-aware endpoint rule handles those separately.
   for (let index = 1; index < latticeSteps; index += 1) {
     const column = from.column + columnStep * index;
     const row = from.row + rowStep * index;
-    const topLeft = { column: column - 1, row: row - 1 };
-    const topRight = { column, row: row - 1 };
-    // Check TL/BR first so lower row then lower column wins when both pairs seal.
-    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {
-      return { cell: topLeft, progress: index / latticeSteps };
-    }
-    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {
-      return { cell: topRight, progress: index / latticeSteps };
-    }
+    const cell = sharedVertexBlockingCell(column, row, sightBlockingAt);
+    if (cell !== null) return { cell, progress: index / latticeSteps };
+  }
+  return null;
+}
+
+function liesInClosedQuadrant(
+  columnDelta: number,
+  rowDelta: number,
+  ownCellQuadrant: CornerQuadrant,
+): boolean {
+  return columnDelta * ownCellQuadrant.column >= 0 &&
+    rowDelta * ownCellQuadrant.row >= 0;
+}
+
+function endpointSharedVertexBlockingHit(
+  from: CornerPoint,
+  to: CornerPoint,
+  sourceCellQuadrant: CornerQuadrant,
+  targetCellQuadrant: CornerQuadrant,
+  sourceBlockingCell: GridCell | null,
+  targetBlockingCell: GridCell | null,
+): SightBlockingHit | null {
+  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
+  const columnDelta = to.column - from.column;
+  const rowDelta = to.row - from.row;
+  if (columnDelta === 0 && rowDelta === 0) {
+    const oppositeSpaces = sourceCellQuadrant.column === -targetCellQuadrant.column &&
+      sourceCellQuadrant.row === -targetCellQuadrant.row;
+    return sourceBlockingCell !== null && oppositeSpaces
+      ? { cell: sourceBlockingCell, progress: 0 }
+      : null;
+  }
+  // D657: the other endpoint must remain inside the endpoint cell's closed quadrant;
+  // either boundary half-line is an own-edge graze, while every other direction crosses the pinch.
+  if (sourceBlockingCell !== null &&
+    !liesInClosedQuadrant(columnDelta, rowDelta, sourceCellQuadrant)) {
+    return { cell: sourceBlockingCell, progress: 0 };
+  }
+  if (targetBlockingCell !== null &&
+    !liesInClosedQuadrant(-columnDelta, -rowDelta, targetCellQuadrant)) {
+    return { cell: targetBlockingCell, progress: 1 };
   }
   return null;
 }
@@ -408,10 +522,24 @@ function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: Gri
 function firstSightBlockingCell(
   from: CornerPoint,
   to: CornerPoint,
+  sourceCellQuadrant: CornerQuadrant,
+  targetCellQuadrant: CornerQuadrant,
+  sourceEndpointBlockingCell: GridCell | null,
+  targetEndpointBlockingCell: GridCell | null,
   interveningCells: readonly GridCell[],
   sightBlockingAt: (cell: GridCell) => boolean,
 ): GridCell | null {
   let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
+  const endpoint = endpointSharedVertexBlockingHit(
+    from,
+    to,
+    sourceCellQuadrant,
+    targetCellQuadrant,
+    sourceEndpointBlockingCell,
+    targetEndpointBlockingCell,
+  );
+  if (endpoint !== null && (first === null || endpoint.progress < first.progress ||
+    (endpoint.progress === first.progress && compareCells(endpoint.cell, first.cell) < 0))) first = endpoint;
   const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
   if (vertex !== null && (first === null || vertex.progress < first.progress ||
     (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
@@ -421,7 +549,7 @@ function firstSightBlockingCell(
     if (first === null || hit.progress < first.progress ||
       (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
   }
-  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
+  // One traversal merges cell-interior, shared-edge, endpoint and strict-interior-vertex events by progress.
   // Simultaneous events use lower row, then lower column.
   return first === null ? null : { ...first.cell };
 }
@@ -429,6 +557,10 @@ function firstSightBlockingCell(
 function traceCornerLine(
   from: CornerPoint,
   to: CornerPoint,
+  sourceCellQuadrant: CornerQuadrant,
+  targetCellQuadrant: CornerQuadrant,
+  sourceEndpointBlockingCell: GridCell | null,
+  targetEndpointBlockingCell: GridCell | null,
   candidates: readonly GridCell[],
   sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
   sightBlockingAt: (cell: GridCell) => boolean,
@@ -439,6 +571,10 @@ function traceCornerLine(
   const firstBlockingCell = firstSightBlockingCell(
     from,
     to,
+    sourceCellQuadrant,
+    targetCellQuadrant,
+    sourceEndpointBlockingCell,
+    targetEndpointBlockingCell,
     interveningCells,
     sightBlockingAt,
   );
@@ -583,8 +719,10 @@ function traceSpaces(
     stateTraces.set(traceKey, equivalent);
     return equivalent;
   }
-  const sourceCorners = outerCorners(sourceCells);
-  const targetCorners = outerCorners(targetCells);
+  const sourceEndpoints = outerCornerEndpoints(sourceCells);
+  const targetEndpoints = outerCornerEndpoints(targetCells);
+  const sourceCorners = sourceEndpoints.map((endpoint) => endpoint.point);
+  const targetCorners = targetEndpoints.map((endpoint) => endpoint.point);
   const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
   const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
   const minimumColumn = Math.min(...cornerColumns);
@@ -612,11 +750,17 @@ function traceSpaces(
     const key = cellKey(cell);
     return !exclusions.has(key) && sightBlockingKeys.has(key);
   };
-  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
-    sourceCorner,
-    targetCorners.map((targetCorner) => traceCornerLine(
-      sourceCorner,
-      targetCorner,
+  const resolvedSourceEndpoints = resolveCornerEndpoints(sourceEndpoints, sightBlockingAt);
+  const resolvedTargetEndpoints = resolveCornerEndpoints(targetEndpoints, sightBlockingAt);
+  const traces = resolvedSourceEndpoints.map((sourceEndpoint) => aggregateCornerLines(
+    sourceEndpoint.point,
+    resolvedTargetEndpoints.map((targetEndpoint) => traceCornerLine(
+      sourceEndpoint.point,
+      targetEndpoint.point,
+      sourceEndpoint.cellQuadrant,
+      targetEndpoint.cellQuadrant,
+      sourceEndpoint.blockingCell,
+      targetEndpoint.blockingCell,
       candidates,
       (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
       sightBlockingAt,
@@ -735,7 +879,8 @@ export function coverTierBetweenObjects(
     .map((cell) => [cellKey(cell), cell] as const)).values()];
   const sourceCell = { ...from };
   const targetCell = { ...to };
-  const targetCorners = outerCorners([to]);
+  const sourceEndpoints = outerCornerEndpoints([from]);
+  const targetEndpoints = outerCornerEndpoints([to]);
   const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
     objects.flatMap((object): readonly TerrainLineSource[] =>
       objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
@@ -743,11 +888,17 @@ export function coverTierBetweenObjects(
         : []);
   const sightBlockingAt = (cell: GridCell): boolean =>
     !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
-  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
-    sourceCorner,
-    targetCorners.map((targetCorner) => traceCornerLine(
-      sourceCorner,
-      targetCorner,
+  const resolvedSourceEndpoints = resolveCornerEndpoints(sourceEndpoints, sightBlockingAt);
+  const resolvedTargetEndpoints = resolveCornerEndpoints(targetEndpoints, sightBlockingAt);
+  const traces = resolvedSourceEndpoints.map((sourceEndpoint) => aggregateCornerLines(
+    sourceEndpoint.point,
+    resolvedTargetEndpoints.map((targetEndpoint) => traceCornerLine(
+      sourceEndpoint.point,
+      targetEndpoint.point,
+      sourceEndpoint.cellQuadrant,
+      targetEndpoint.cellQuadrant,
+      sourceEndpoint.blockingCell,
+      targetEndpoint.blockingCell,
       candidates,
       sourcesAt,
       sightBlockingAt,
23103:## D654 — SUPERVISOR (2026-09-17 22:23): WALL-01 REJECTED by astra r1 (medium; 1 P1: WALL-F3; saved review-impl-wall-01-astra-r1.md) — CONFIRMED BY ME; the defect is MY SPEC: the WALL-01 brief dictated "endpoint vertices are NOT vertex-checked"; fix r4 dispatched
23104:ASTRA (2.49 M tokens): geometry otherwise sound (single-blocker touch and outer-face graze clear; shared edges block; interior diagonal pairs block including TL+BR with a TR→BL ray; three/four-blocker vertices covered; Fraction enumeration matched the gcd enumeration for 600 ordered integer endpoint pairs; ordering/tie-break explicit; physical tier independent — its "total whenever firstBlockingCell" mutant killed); r3 derivations reproduced (fog (4,3) → (4,3),(8,3),(9,3); fighter +(8,2),(9,2),(8,3),(9,3); all three hash transitions reproduced by substituting baseline vs candidate cover.ts in memory; only visibleState.cells/concealedCells changed; fingerprint dd802783…; the three replacement blockers have zero diagonal neighbours; five opened pairs / Half + Three-Quarters / both 90-ft shots asserted); six files 387+/49−; tsc 0/0; 66/66 across the suites it could run; perf: the productive-option los-cover test 4,935 ms baseline → 5,740 ms candidate (gcd + up to four lookups per interior vertex) — deferred perf work, not blocking. WALL-F3 (P1): a COMPLETE stepped wall (6×6; blockers col 1 rows 0–1, col 2 rows 2–5; junction (2,2) between (1,1) and (2,2)) leaks: of the 16 corner rays from observer (2,1) to target (0,3), 10 hit interiors, 2 hit the sealed vertex strictly inside, and 4 START at the sealed junction (the observer's bottom-left corner) and pass through the pinch — the endpoint exclusion lets them through; production says visible/seen. VERIFIED BY ME on seam-ab at bc6422bf: (2,1)→(0,3) tier none / blocksSight FALSE; reversed half / FALSE; same-side (2,1)→(5,1) clear (correct). ROOT CAUSE = my WALL-01 brief: "Endpoint vertices (t = 0 or 1) are NOT vertex-checked — the cell-interior rule governs there"; sol implemented what I specified. Finding against my own work, at full length: I specified a geometric rule from intuition without enumerating the endpoint case; astra's rational enumeration did. RULE (D654): at an endpoint vertex with a sealed pair, the ray blocks iff it passes through the pinch — leaves the source corner into the open quadrant diagonally opposite the source cell's quadrant (or, mirrored, arrives at the target corner from the opposite quadrant); edge-aligned departures fall to the shared-edge rule; same-side departures stay clear; zero-length corner contact across a sealed junction = blocked. Fix r4 dispatched (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r4.md): witnesses for source/target endpoint, same-side control, adjacent-corner zero-length, three mutants; re-run of every scene suite with D569 handling if pins move; counts and generation bytes redone — if generation bytes change, STOP (it would alter the cohort plan's premise).
23105:
23106:## D655 — SUPERVISOR (2026-09-17 22:51): COHORT-01 B2 VERIFIED BY ME and committed 8284a91c on claude/cohort-01; astra medium review dispatched (resumed B1 reviewer)
23107:VERIFIED (verify-b2.log, clean checkout at e92ebc93 + patch): tsc 0/0; diff-check 0; 0 long lines; V-freeze 0 and no fixture files touched; the new v2 suite 30 red, every failure ENOENT on the declared missing fixture; room-generator 56/56; brutal-b 47/47; second-family 50/50. Read by me: the removed code in both frozen suites is exactly the per-monster productivity loop, replaced by the D635/D642/D643 rationale. Generation (Batches 3–5) still gated on WALL-01 (fix r4 in flight).
23108:
23109:## D656 — SUPERVISOR (2026-09-17 23:07): COHORT-01 B2 REJECTED by astra r1 (medium; 0 P1, 1 P2: B2-F1; saved review-b2-astra-r1.md) → fix r1 dispatched; WALL-01 fix r4 harvested (sol; saved impl-wall-01-fix-r4-sol.md) → my verification running
23110:B2-F1 (P2): the 6203 retirement removed the whole brutalRoomMembershipViolations test (difficulty, scaled budget/spend, caster, terrain AND productivity) instead of only the productivity loop; astra's in-memory mutant (budget +1 on 6203010) leaves the suite 56/56 green; the fix restores the ten-seed static assertion filtering only brutal_productivity. Everything else accepted: 6206 retirement exact; 30 v2 declarations through declareTestInputs; PLAN-F6 predicate with the query's own traceCombatantLine at mechanics.finalPosition; membership after decoding with no swallow (an in-memory bad-budget fixture fails with brutal_budget); three mutants killed; tsc 0/0; freeze 0; 229 added lines, 0 over 120. Fix r1 dispatched (resume 01a0b245…).
23111:WALL-01 fix r4 (sol, resume 01a0b20e-61fa…; 2 files 286+/26−): endpoint-junction rule — at a sealed vertex a source ray blocks only when leaving diagonally into the quadrant opposite the source cell (TL→BR, TR→BL, BL→TR, BR→TL ownership), target rays mirrored, axis-aligned rays to the shared-edge rule, zero-length corner contact across opposite free quadrants blocked, progress 0/1, physical cover untouched, same path in coverTierBetweenObjects; witnesses SOURCE/TARGET_ENDPOINT_JUNCTION_SEALED (astra's scene), SAME_SIDE_ENDPOINT_GRAZE_CLEAR, ADJACENT_CORNER_ZERO_LENGTH; DIAGONAL_CORNER_TOUCH_SEALED_D642 re-derived (its source corner (1,1) had been an excluded endpoint — now aggregate blocked, first (1,0), tier none); three mutants killed; visibility-field 50/50; r3 scenes 5/5; ten-suite audit 246 passed + exactly the 35 known frozen reds; counts unchanged (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36); 42 generated rooms byte-identical (7b884bf9…); pair 39.4 s; los-cover budget tests 5.6 s isolated (perf). MY VERIFICATION (verify-wall-01-r4.log, seam-ab at bc6422bf + patch): tsc, six-case probe (A/B endpoint must block; C same-side clear; D adjacent corner blocked; E interior; F stepped wall), endpoint-rule-null mutant, 15 suites, los-cover, pair.
23112:
23113:## D657 — SUPERVISOR (2026-09-17 23:22): WALL-01 fix r4 verified except for ONE aggregate leak that is a gap in MY r4 rule statement (WALL-F4) → fix r5 dispatched; B2 fix r1 harvested → verification running
23114:MY VERIFICATION of r4 (verify-wall-01-r4.log; seam-ab at bc6422bf + patch): tsc 0/0; diff-check 0; probes A (source endpoint) and B (target endpoint) now BLOCK (first (1,1)); C same-side clear; E interior blocked; F the stepped wall blocked (first (7,3)); 15 suites 2273/2308 = exactly the 35 known frozen/behaviour reds; los-cover 109/112 (three 5 s budget timeouts: 5.41/5.64/5.02 s — perf); pair 36/36 in 39 s. My "endpoint rule disabled" mutant hit the wrong function (a python name-grep picked the pre-existing outerCornerEndpoints → the whole suite red, 48/50) — a void mutant, not evidence; the intended one (endpointSharedVertexBlockingHit → null) is re-run in the r5 verification. WALL-F4 (found by my probe D, verified): observer (2,1) and target (1,2) in opposite free quadrants of the sealed junction (2,2) → AGGREGATE blocksSight FALSE. Cause: two EDGE-ALIGNED corner rays that END at the junction — (2,1)→(2,2) down x=2 between blocker (1,1) and the observer's own cell, and (3,2)→(2,2) along y=2 — count as grazes under the shared-edge rule and "reach the target's corner", but that corner is the wall's corner; no interior point of the target is reachable by a straight line. My r4 rule statement explicitly sent edge-aligned endpoint rays to the shared-edge rule: my error again, now stated fully. REFINED RULE (D657): at an endpoint vertex with a sealed pair, with Q the endpoint cell's own free quadrant, the ray is clear iff its other endpoint lies in the CLOSED quadrant Q (interior or Q's two boundary half-lines); otherwise it passes the pinch and is blocked. Same-side grazes stay clear (the far endpoint on Q's boundary); a departure along the wall's far face is blocked. Fix r5 dispatched (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r5.md) with aggregate and per-ray witnesses, three mutants, counts and generation bytes redone.
23115:B2 fix r1 (sol resumed): restored the ten-seed static membership assertion for 6203 filtering only brutal_productivity; harvest saved impl-b2-fix-r1-sol.md; my verification (verify-b2-r1.log) on seam-verify at 8284a91c + patch.
23116:
23117:## D658 — SUPERVISOR (2026-09-17 23:36): COHORT-01 B2 fix r1 VERIFIED BY ME and committed e4c56954; astra r2 (medium, resumed) dispatched
23118:VERIFIED (verify-b2-r1.log; seam-verify at 8284a91c + patch): tsc node 0; diff-check 0; 0 long lines; freeze 0; the restored brutalRoomMembershipViolations assertion present at room-generator.test.ts:588; room-generator 66/66; brutal-b 47/47; second-family 50/50. Sol reports the budget +1 mutant on 6203010 fails with exactly brutal_budget; astra is asked to reproduce it.
23119:
23120:## D659 — SUPERVISOR (2026-09-17 23:51): COHORT-01 B2 (+fix r1) ACCEPTED by astra r2 (medium; saved review-b2-astra-r2.md); claude/cohort-01 = e4c56954 (B1 + B2). Batches 3–5 (generation) wait for WALL-01 acceptance; WALL-01 fix r5 harvested (saved impl-wall-01-fix-r5-sol.md) — my verification running (verify-wall-01-r5.log) with the intended endpoint mutant
23121:
23122:## D660 — SUPERVISOR (2026-09-18 00:07): WALL-01 fix r5 VERIFIED BY ME and committed b94dd732 on claude/vis-field; astra r2 (medium, resumed) dispatched on the endpoint rule
23123:VERIFIED (verify-wall-01-r5.log; seam-ab at bc6422bf + r5 patch): tsc 0/0; diff-check 0; 0 long lines; probes — A source endpoint blocked (first (1,1)), B target endpoint blocked, C same-side clear, D adjacent-corner AGGREGATE blocked (the WALL-F4 case), E interior blocked, F full stepped wall blocked (first (7,3)); the INTENDED mutant this time (endpointSharedVertexBlockingHit → null) → 8 witnesses red (SOURCE/TARGET_ENDPOINT, ADJACENT_CORNER_ZERO_LENGTH, ADJACENT_CORNER_AGGREGATE, EDGE_ARRIVAL, FAR_FACE_DEPARTURE, DIAGONAL_CORNER_TOUCH_SEALED_D642, PHYSICAL_COVER_UNCHANGED_BY_VERTEX) and only probes E/F still block; 15 suites 2277/2312 = exactly the 35 known frozen/behaviour reds; los-cover 109/112 (5.39/5.63/5.02 s budget timeouts — perf); pair 36/36 in 39 s. Sol's r5 report: counts unchanged (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36); 42 generated rooms byte-identical; scene-snapshot fog +(7,3) via the fighter's (2,3)→(7,3) and wizard's (1,3)→(7,3) edge rays ending at the sealed junction (7,3) (wall (7,2) + door (6,3)); hashes 0ec0fbbc→28a1eb7e, 79b076c9→87fc04ad, 52305455→9ee96377; fingerprint dd802783… unchanged. Committed b94dd732 (bc6422bf + r4 + r5). claude/vis-field = 6887755f → bc6422bf → b94dd732. Astra (resume 01a0a642…; brief review-impl-wall-01-astra-r2.md; log review-wall-01-astra-r2.log) re-reviews with rational enumeration of the endpoint cases, Large-space corners, over-blocking checks, the (7,3) re-derivation, cost.

exec
/bin/bash -lc 'tail -60 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r4-sol.md; tail -75 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r5-sol.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:

- Endpoint rule disabled: exactly `SOURCE_ENDPOINT_JUNCTION_SEALED` and `TARGET_ENDPOINT_JUNCTION_SEALED` red; both changed to clear/null.
- Every sealed endpoint blocked regardless of direction: `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` red; mirrored ray became blocked at `(1,1)`.
- Endpoint optical hit raised physical tier: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red; received `total` instead of `none`.
- Production was restored; visibility suite passed 50/50.

### Frozen-family counts

`npx vite-node /tmp/wall01-r4-counts.ts`

| Family | Monsters | `bc6422bf` offers / shotless | Final offers / shotless |
|---|---:|---:|---:|
| hard | 75 | 142 / 35 | 142 / 35 |
| brutal | 44 | 57 / 34 | 57 / 34 |
| brutal-b | 42 | 15 / 41 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 | 58 / 36 |

### Generation-byte check

`npx vite-node /tmp/wall01-r4-generation.ts`

- Rooms: 42
- Before and after aggregate: `7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc`
- Byte-identical: yes
- Changed seeds: none

### Verification

- R3 scene command: 4 files, all five requested tests passed; 121 skipped.
- `npx vitest run tests/unit/combat/visibility-field.test.ts --reporter=dot`: 50/50 passed.
- Frozen ten-suite command: 246 passed, exactly the known 35 frozen reds, wall 34.95 s.
- Red titles remained:

  - Six `d569-blind-experiment` titles: validation, dry-run, 180 hint cells, second-family consumption, model metadata, and decisive-integrity rejection.
  - `d569-second-family-manifest`: ledger title plus seeds `6207002, 6207004–6207009`.
  - `arena-basis-brutal-b`: all ten `pins seed 6206001…6206010` titles.
  - `room-generator`: brutal seeds `6203001–6203004, 6203006, 6203008–6203010`.
  - `projects fresh options for every requested generated-room monster turn`.
  - `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`.
  - `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`.

- LOS/cover full matrix: 109 passed; timeout-only reds were `WALL-SEALS-ROOM`, productive-first-turn, and the marginal `ONE-SIDE-CANNOT-CHANGE-COVER`; no assertion mismatch and no repin.
- Requested isolated 5-second timings:

  - `WALL-SEALS-ROOM`: 5.675 s.
  - Productive-first-turn: 5.643 s.

- Replay+detection: 36/36 passed; Vitest 38.97 s, wall 39.42 s, below 41 s.
- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npx tsc -p tsconfig.node.json --noEmit`: passed.
- `git diff --check`: passed.
- Added lines over 120 characters: zero.
- `git status --short`:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
```

WALL-01-FIX-R4 DONE
Cell `(7,3)` was previously visible only through endpoint-edge rays:

- Fighter: `(2,3)→(7,3)`
- Wizard: `(1,3)→(7,3)`

At sealed vertex `(7,3)`, blocked cell `(7,2)` and Oak Door `(6,3)` form the diagonal pair. Both rays changed from `tier none / false / null` to `tier none / true / first (7,2)`. The cleric was already blocked by the door.

Therefore:

- DM fog gained exactly `(7,3)`.
- Fighter concealment gained exactly `(7,3)`.
- `pendingRequestHash`: `0ec0fbbc… → 28a1eb7e…`
- `coordinatorHash`: `79b076c9… → 87fc04ad…`
- `revisionChecksum`: `52305455… → 9ee96377…`
- Encounter bytes and branch RNG fingerprint remained unchanged: `dd802783…`.

All five r3 consequence tests passed: `5 passed`, `121 skipped`.

### Mutants

- r4 diagonal-only endpoint rule: `ADJACENT_CORNER_AGGREGATE_BLOCKED`, `EDGE_ARRIVAL_AT_JUNCTION_BLOCKED`, and `FAR_FACE_DEPARTURE_BLOCKED` red.
- Block every sealed endpoint: `OWN_EDGE_DEPARTURE_CLEAR` and `SAME_SIDE_ENDPOINT_GRAZE_CLEAR` red.
- Raise physical tier on endpoint hits: `PHYSICAL_COVER_UNCHANGED_BY_VERTEX` red, showing `none → total`.

All mutants were removed.

### Frozen-family counts

| Family | Before `bc6422bf` offers/shotless | After offers/shotless |
|---|---:|---:|
| hard, 75 monsters | 142 / 35 | 142 / 35 |
| brutal, 44 monsters | 57 / 34 | 57 / 34 |
| brutal-b, 42 monsters | 15 / 41 | 15 / 41 |
| brutal-2, 44 monsters | 58 / 36 | 58 / 36 |

The 42-seed generation byte check remained identical:

`count=42`, aggregate SHA-256 `7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc`.

### Verification

- `npx vitest run tests/unit/combat/visibility-field.test.ts --reporter=dot`  
  `54/54 passed`.
- Prescribed ten-suite audit: `246 passed`, exactly `35` known frozen/behaviour reds, `34.63s`.
- Replay+detection: `36/36 passed`, `38.76s`, below the 41-second ceiling.
- Los-cover: `109 passed`, three known load-sensitive 5-second timeouts:
  - `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`: `5365ms`; isolated `5560ms`.
  - `retains a productive first-turn option for every living monster in the versioned basis`: `5593ms`; isolated `5835ms`.
  - `kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side`: `5001ms`.
  No budgets or pins changed.
- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- `npx tsc -p tsconfig.node.json --noEmit`: passed.
- `git diff --check`: passed.
- Lines over 120 characters: `0`.

The exact 35 expected reds remained:

- D569 blind experiment: six titles beginning `validates the exact v5…`, `dry-runs versioned…`, `adds exactly 180…`, `consumes the frozen second encounter family…`, `records exact model effort…`, and `rejects either decisive integrity field…`.
- Second-family manifest: the amended-range pin plus seed titles `6207002`, `6207004`–`6207009`.
- Brutal-b pins: seeds `6206001`–`6206010`.
- Room-generator brutal titles: seeds `6203001`–`6203004`, `6203006`, `6203008`–`6203010`.
- Behaviour titles:
  - `projects fresh options for every requested generated-room monster turn`
  - `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`

Final `git status --short`:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
 M tests/unit/vtt/scene-snapshot.test.ts
```

WALL-01-FIX-R5 DONE

exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\",\"tests/unit/vtt/scene-snapshot.test.ts\",\"tests/unit/vtt/dm-tactical-intel.test.ts\",\"tests/unit/vtt/tactical-evaluator-r02.test.ts\",\"tests/unit/vtt/two-room-fixture.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "git diff bc6422bf b94dd732 -- tests/unit/vtt/scene-snapshot.test.ts; rg -n 'ENDPOINT|EDGE_|ZERO_LENGTH|PHYSICAL_COVER_UNCHANGED_BY_VERTEX' tests/unit/combat/visibility-field.test.ts; sed -n '50,88p' src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index c7a8b722..d1bc9291 100644
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -248,10 +248,15 @@ describe('renderer-neutral scene snapshot', () => {
     // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
     // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
     // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
-    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
-    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    // same sealed row-3 rays, plus (8,3),(9,3). D657 then seals edge-aligned arrivals at
+    // endpoint vertex (7,3): the fighter's (2,3)->(7,3) and wizard's (1,3)->(7,3) rays
+    // were tier none / blocksSight false / first null under the diagonal-only endpoint
+    // rule, and are tier none / blocksSight true / first (7,2) under the closed-quadrant
+    // rule. The cleric's ray was already blocked by Oak Door (6,3), so DM fog and the
+    // fighter's concealment each gain exactly (7,3).
     expect(projectDmView(state).state.foggedCells).toEqual([
       { column: 4, row: 3 },
+      { column: 7, row: 3 },
       { column: 8, row: 3 },
       { column: 9, row: 3 },
     ]);
@@ -259,6 +264,7 @@ describe('renderer-neutral scene snapshot', () => {
       { column: 8, row: 2 },
       { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 7, row: 3 },
       { column: 8, row: 3 },
       { column: 9, row: 3 },
       { column: 7, row: 4 },
@@ -286,10 +292,13 @@ describe('renderer-neutral scene snapshot', () => {
     // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
     // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // D642 -> D657 adds only hand-derived cell (7,3) to DM fog and fighter concealment:
+    // pendingRequest 0ec0fbbc... -> 28a1eb7e..., coordinator 79b076c9... -> 87fc04ad...,
+    // and revision 52305455... -> 9ee96377...; encounter-state bytes remain unchanged.
     expect(before).toEqual({
-      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
-      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
-      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      pendingRequestHash: '28a1eb7efdd80c746bc0bee68beffcc41dd88628f3d9023abc707585cd1deeda',
+      coordinatorHash: '87fc04ad58800bb678aa6ee2e18ec452c043662ec252713f3b7898c719d4824f',
+      revisionChecksum: '9ee9637765265f35eef5dc6f72331ea87405927c78523074079ca6308fdd4b0a',
       branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
     expect(canonicalJson(state)).toBe(encounterStateBytes);
1102:  it('SOURCE_ENDPOINT_JUNCTION_SEALED', () => {
1122:  it('TARGET_ENDPOINT_JUNCTION_SEALED', () => {
1141:  it('SAME_SIDE_ENDPOINT_GRAZE_CLEAR', () => {
1162:  it('ADJACENT_CORNER_ZERO_LENGTH', () => {
1214:  it('EDGE_ARRIVAL_AT_JUNCTION_BLOCKED', () => {
1235:  it('OWN_EDGE_DEPARTURE_CLEAR', () => {
1426:  it('PHYSICAL_COVER_UNCHANGED_BY_VERTEX', () => {
  readonly column: QuadrantDirection;
  readonly row: QuadrantDirection;
}

interface CornerEndpoint {
  readonly point: CornerPoint;
  readonly cellQuadrant: CornerQuadrant;
}

interface ResolvedCornerEndpoint extends CornerEndpoint {
  readonly blockingCell: GridCell | null;
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

function outerCornerEndpoints(cells: readonly GridCell[]): readonly CornerEndpoint[] {
  const corners = outerCorners(cells);

exec
/bin/bash -lc 'git show bc6422bf:src/combat/cover.ts' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
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
  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();
  const cached = stateSignatures.get(includeCreatures);
  if (cached !== undefined) return cached;
  const signature = [...indexedSources].map(([key, entry]) =>
    `${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join(',')}`)
    .join('|');
  stateSignatures.set(includeCreatures, signature);
  if (!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);
  return signature;
}

function retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {
  equivalentTerrainLineTraces.set(key, trace);
  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;
  const oldest = equivalentTerrainLineTraces.keys().next().value;
  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);
}

function buildTerrainSourceIndex(
  state: EncounterState,
  includeCreatures: boolean,
  terrain?: ReadonlyMap<string, TerrainSourceCell>,
): ReadonlyMap<string, TerrainSourceCell> {
  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined
    ? new Map<string, TerrainSourceCell>()
    : new Map([...terrain].map(([key, entry]) => [key, {
        cell: { ...entry.cell }, sources: [...entry.sources],
      }] as const));
  const exclusions = new Set<string>();
  if (terrain === undefined) {
    for (const cell of state.blockedCells) {
      addSource(sourceCells, cell, {
        kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`, tier: 'total',
      }, exclusions);
    }
    for (const object of state.worldObjects) {
      if (object.blocking.cover === 'none') continue;
      for (const cell of object.footprint) {
        addSource(sourceCells, cell, {
          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,
        }, exclusions);
      }
    }
  }
  if (!includeCreatures) return sourceCells;
  for (const candidate of state.combatants) {
    const id = candidate.profile.id;
    if (candidate.life === 'dead') continue;
    if (!state.tokens.some((token) => token.combatantId === id)) continue;
    for (const cell of combatantSpace(state, id).cells) {
      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);
    }
  }
  return sourceCells;
}

function indexedTerrainSources(
  state: EncounterState,
  includeCreatures: boolean,
): ReadonlyMap<string, TerrainSourceCell> {
  const cached = terrainSourceIndexes.get(state);
  if (cached !== undefined) {
    if (!includeCreatures) return cached.terrain;
    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);
    cached.withCreatures = withCreatures;
    return withCreatures;
  }
  const terrain = buildTerrainSourceIndex(state, false);
  const entry: TerrainSourceIndexes = { terrain };
  terrainSourceIndexes.set(state, entry);
  if (!includeCreatures) return terrain;
  const withCreatures = buildTerrainSourceIndex(state, true, terrain);
  entry.withCreatures = withCreatures;
  return withCreatures;
}

function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {
  return sources
    .filter((source, index, all) =>
      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
}

interface SightBlockingHit {
  readonly cell: GridCell;
  readonly progress: number;
}

function firstSharedEdgeBlockingHit(
  from: CornerPoint,
  to: CornerPoint,
  sightBlockingAt: (cell: GridCell) => boolean,
): SightBlockingHit | null {
  if (from.row === to.row && Number.isInteger(from.row)) {
    const direction = from.column < to.column ? 1 : -1;
    for (
      let column = direction === 1 ? from.column : from.column - 1;
      direction === 1 ? column < to.column : column >= to.column;
      column += direction
    ) {
      const upper = { column, row: from.row - 1 };
      const lower = { column, row: from.row };
      // Deterministic pair choice: the flanking cell with the lower row wins.
      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {
        const entryColumn = direction === 1 ? column : column + 1;
        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };
      }
    }
  }
  if (from.column === to.column && Number.isInteger(from.column)) {
    const direction = from.row < to.row ? 1 : -1;
    for (
      let row = direction === 1 ? from.row : from.row - 1;
      direction === 1 ? row < to.row : row >= to.row;
      row += direction
    ) {
      const left = { column: from.column - 1, row };
      const right = { column: from.column, row };
      // Deterministic pair choice: the flanking cell with the lower column wins.
      if (sightBlockingAt(left) && sightBlockingAt(right)) {
        const entryRow = direction === 1 ? row : row + 1;
        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };
      }
    }
  }
  return null;
}

function greatestCommonDivisor(left: number, right: number): number {
  let dividend = Math.abs(left);
  let divisor = Math.abs(right);
  while (divisor !== 0) {
    const remainder = dividend % divisor;
    dividend = divisor;
    divisor = remainder;
  }
  return dividend;
}

function firstSharedVertexBlockingHit(
  from: CornerPoint,
  to: CornerPoint,
  sightBlockingAt: (cell: GridCell) => boolean,
): SightBlockingHit | null {
  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);
  if (latticeSteps <= 1) return null;
  const columnStep = columnDelta / latticeSteps;
  const rowStep = rowDelta / latticeSteps;
  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.
  for (let index = 1; index < latticeSteps; index += 1) {
    const column = from.column + columnStep * index;
    const row = from.row + rowStep * index;
    const topLeft = { column: column - 1, row: row - 1 };
    const topRight = { column, row: row - 1 };
    // Check TL/BR first so lower row then lower column wins when both pairs seal.
    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {
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
  targetCell: GridCell,
): TerrainLineTrace {
  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);
  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');
  const obstructed = lines.filter((line) => line.tier !== 'none');
  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>
    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');
  const tier = physicalBlocksCover
    ? 'total'
    : COVER_TIER_BY_RANK[Math.min(
        coverRank(countTier(obstructed.length)),
        coverRank(strongestLineTier),
        coverRank('three_quarters'),
      )] ?? 'none';
  const sources = tier === 'none'
    ? []
    : uniqueSources(obstructed
        .filter((line) => line.tier === strongestLineTier)
        .flatMap((line) => line.sources));
  const interveningCells = [...new Map(lines
    .flatMap((line) => line.interveningCells)
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;
  return {
    sourceCell: { ...sourceCell },
    targetCell: { ...targetCell },
    sourceCorner: { ...sourceCorner },
    lines,
    interveningCells,
    tier,
    blocksSight,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,
  };
}

function comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return coverRank(left.tier) - coverRank(right.tier) ||
    left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function nearestCells(
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {
  const sources = [...sourceCells].sort(compareCells);
  const targets = [...targetCells].sort(compareCells);
  const firstSource = sources[0];
  const firstTarget = targets[0];
  if (firstSource === undefined || firstTarget === undefined) {
    throw new RangeError('A line query requires non-empty source and target spaces.');
  }
  let selectedSource = firstSource;
  let selectedTarget = firstTarget;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const sourceCell of sources) {
    for (const targetCell of targets) {
      const distance = Math.max(
        Math.abs(sourceCell.column - targetCell.column),
        Math.abs(sourceCell.row - targetCell.row),
      );
      if (distance < selectedDistance) {
        selectedSource = sourceCell;
        selectedTarget = targetCell;
        selectedDistance = distance;
      }
    }
  }
  return { sourceCell: selectedSource, targetCell: selectedTarget };
}

function traceSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  options: TerrainLineOptions,
): TerrainLineTrace {
  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);
  const blockerSignature = sightBlockingSignature(sightBlockingCells);
  const traceKey = `${options.includeCreatures === true ? 'creatures' : 'terrain'}:${sourceCells
    .map(cellKey).join(';')}->${targetCells.map(cellKey).join(';')}#sight:${blockerSignature}`;
  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  const cached = stateTraces.get(traceKey);
  if (cached !== undefined) return cached;
  if (!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);
  const nearest = nearestCells(sourceCells, targetCells);
  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));
  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
  const equivalentTraceKey = `${terrainSourceSignature(
    state,
    options.includeCreatures === true,
    indexedSources,
  )}\0${traceKey}`;
  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
  if (equivalent !== undefined) {
    stateTraces.set(traceKey, equivalent);
    return equivalent;
  }
  const sourceCorners = outerCorners(sourceCells);
  const targetCorners = outerCorners(targetCells);
  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
  const minimumColumn = Math.min(...cornerColumns);
  const maximumColumn = Math.max(...cornerColumns);
  const minimumRow = Math.min(...cornerRows);
  const maximumRow = Math.max(...cornerRows);
  const candidateEntries = sightBlockingCells.length === 0
    ? [...indexedSources.values()]
    : [...new Map([
        ...indexedSources.values(),
        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];
  const candidates = candidateEntries
    .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
    .map((entry) => entry.cell);
  const sightBlockingKeys = new Set([
    ...sightBlockingCells.map(cellKey),
    ...[...indexedSources]
      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))
      .map(([key]) => key),
  ]);
  const sightBlockingAt = (cell: GridCell): boolean => {
    const key = cellKey(cell);
    return !exclusions.has(key) && sightBlockingKeys.has(key);
  };
  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
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
    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
}

export type CreatureCoverOptions = CreatureLineOptions;

export interface CombatantCoverResult {
  readonly tier: CoverTier;
  readonly sourceIds: readonly string[];
}

export function coverBetweenCombatants(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureCoverOptions = {},
): CombatantCoverResult {
  const trace = traceCombatantLine(state, sourceId, targetId, options);
  return { tier: trace.tier, sourceIds: trace.sourceIds };
}

 succeeded in 7897ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ✓ tests/unit/combat/visibility-field.test.ts (54 tests) 58ms
 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests) 92ms
 ✓ tests/unit/vtt/tactical-evaluator-r02.test.ts (2 tests) 399ms
     ✓ compares ordered registry allocations with exact post-grant Bless conditioning  390ms
 ✓ tests/unit/vtt/dm-tactical-intel.test.ts (6 tests) 3470ms
     ✓ renders target-specific non-nearest R02 rows in always-on context with exact reasons  730ms
     ✓ paginates the full matrix with a state-bound cursor and advertises the read tool to the DM  431ms
     ✓ renders the failure manifest only in the DM profile and retains the 32 KiB trim  1162ms
     ✓ attaches full-precision offered-set and all intel policy versions to accepted capture  628ms
 ✓ tests/unit/vtt/two-room-fixture.test.ts (4 tests) 197ms

 Test Files  5 passed (5)
      Tests  74 passed (74)
   Start at  00:07:32
   Duration  7.76s (transform 1.69s, setup 0ms, import 3.44s, tests 4.22s, environment 0ms)


 succeeded in 14254ms:
 succeeded in 28283ms:
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return code+'\\nexport {endpointSharedVertexBlockingHit as __endpoint,outerCornerEndpoints as __corners};';if(id.endsWith('/tests/unit/combat/visibility-field.test.ts'))return code+\"\\nit('REVIEW_ENDPOINT_ENUMERATION',async()=>{\\n const m=await import('../../../src/combat/cover');\\n let count=0;\\n for(const qx of [-1,1])for(const qy of [-1,1])for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){\\n  if("'!dx&&!dy)continue;'"\\n  const q={column:qx,row:qy},v={column:3,row:3},far={column:3+dx,row:3+dy},cell={column:2,row:2};\\n  const own=(qx===1?far.column>=3:far.column<=3)&&(qy===1?far.row>=3:far.row<=3);\\n  const a=m.__endpoint(v,far,q,q,cell,null);\\n  const b=m.__endpoint(far,v,q,q,null,cell);\\n  expect(a===null).toBe(own);expect(b===null).toBe(own);count+=2;\\n }\\n for(const x of [-1,1])for(const y of [-1,1]){\\n const q={column:x,row:y},v={column:3,row:3},cell={column:2,row:2};\\n expect(m.__endpoint(v,v,q,q,cell,cell)).toBeNull();\\n expect(m.__endpoint(v,v,q,{column:-x,row:-y},cell,cell)).toEqual({cell,progress:0});count+=2;\\n }\\n for(const size of [2,3]){\\n const cells=Array.from({length:size*size},(_,i)=>({column:2+i%size,row:2+Math.floor(i/size)}));\\n expect(m.__corners(cells).map(e=>e.cellQuadrant)).toEqual([{column:1,row:1},{column:-1,row:1},{column:1,row:-1},{column:-1,row:-1}]);\\n }\\n console.log('ENUMERATION',count,'endpoint assertions; Large/Huge all four quadrant assignments');\\n});\\nit('REVIEW_LARGE_TOP_LEFT_JUNCTION',()=>{\\n const a=normalProfile('review-large');const p={...a,rules:{...a.rules,sizeCategory:'Large'}};\\n const state=fieldState(p,{bounds:{columns:7,rows:7},tokens:[placedToken(p,2,2)],blockedCells:[{column:2,row:1},{column:1,row:2}]});\\n const trace=traceCombatantLineToCells(state,p.id,[{column:0,row:0}]);\\n console.log('LARGE',JSON.stringify({blocked:trace.blocksSight,first:trace.firstBlockingCell,tier:trace.tier}));\\n expect(trace.blocksSight).toBe(true);\\n const own=traceCombatantLineToCells(state,p.id,[{column:5,row:2}]);\\n expect(own.blocksSight).toBe(false);\\n});\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/scene-snapshot.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"preserves full persisted\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return \"import { combatantSpace, combatantSpaceAt } from './combat-rules';\\nimport type { EncounterState } from './encounter';\\nimport type { GridCell } from './grid';\\nimport { coverRank, type CoverTier } from './terrain';\\nimport type { CombatantId } from './values';\\nimport type { WorldObject } from './world-objects';\\n\\nfunction cellKey(cell: GridCell): string {\\n  return "'`${String(cell.column)},${String(cell.row)}`;'"\\n}\\n\\nfunction compareCells(left: GridCell, right: GridCell): number {\\n  return left.row - right.row || left.column - right.column;\\n}\\n\\n/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */\\nexport function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));\\n  if (steps <= 1) return [];\\n  const result: GridCell[] = [];\\n  const seen = new Set<string>();\\n  for (let step = 1; step < steps; step += 1) {\\n    const cell = {\\n      column: Math.round(from.column + columnDelta * step / steps),\\n      row: Math.round(from.row + rowDelta * step / steps),\\n    };\\n    const key = cellKey(cell);\\n    if ("'!seen.has(key)) {'"\\n      seen.add(key);\\n      result.push(cell);\\n    }\\n  }\\n  return result;\\n}\\n\\nfunction objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {\\n  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));\\n}\\n\\nexport interface CornerPoint {\\n  readonly column: number;\\n  readonly row: number;\\n}\\n\\n/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */\\nexport function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {\\n  const first = cells[0];\\n  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');\\n  let minimumColumn = first.column;\\n  let maximumColumn = first.column + 1;\\n  let minimumRow = first.row;\\n  let maximumRow = first.row + 1;\\n  for (let index = 1; index < cells.length; index += 1) {\\n    const cell = cells[index];\\n    if (cell === undefined) continue;\\n    minimumColumn = Math.min(minimumColumn, cell.column);\\n    maximumColumn = Math.max(maximumColumn, cell.column + 1);\\n    minimumRow = Math.min(minimumRow, cell.row);\\n    maximumRow = Math.max(maximumRow, cell.row + 1);\\n  }\\n  return [\\n    { column: minimumColumn, row: minimumRow },\\n    { column: maximumColumn, row: minimumRow },\\n    { column: minimumColumn, row: maximumRow },\\n    { column: maximumColumn, row: maximumRow },\\n  ];\\n}\\n\\n/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */\\nexport function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {\\n  const epsilon = 1e-9;\\n  let entry = 0;\\n  let exit = 1;\\n  const columnDelta = to.column - from.column;\\n  const minimumColumn = cell.column + epsilon;\\n  const maximumColumn = cell.column + 1 - epsilon;\\n  if (columnDelta === 0) {\\n    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;\\n  } else {\\n    const first = (minimumColumn - from.column) / columnDelta;\\n    const second = (maximumColumn - from.column) / columnDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  const rowDelta = to.row - from.row;\\n  const minimumRow = cell.row + epsilon;\\n  const maximumRow = cell.row + 1 - epsilon;\\n  if (rowDelta === 0) {\\n    if (from.row <= minimumRow || from.row >= maximumRow) return false;\\n  } else {\\n    const first = (minimumRow - from.row) / rowDelta;\\n    const second = (maximumRow - from.row) / rowDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  return entry <= exit && exit > 0 && entry < 1;\\n}\\n\\nfunction lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;\\n  if (magnitudeSquared === 0) return 0;\\n  return (\\n    (cell.column + 0.5 - from.column) * columnDelta +\\n    (cell.row + 0.5 - from.row) * rowDelta\\n  ) / magnitudeSquared;\\n}\\n\\n/** Rasterizes a corner ray in source-to-target traversal order. */\\nexport function rasterizeCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n): readonly GridCell[] {\\n  const crossed: GridCell[] = [];\\n  for (const cell of candidates) {\\n    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);\\n  }\\n  if (crossed.length > 1) {\\n    crossed.sort((left, right) =>\\n      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));\\n  }\\n  return crossed;\\n}\\n\\nexport interface TerrainLineSource {\\n  readonly kind: 'blocked_cell' | 'world_object' | 'creature';\\n  readonly id: string;\\n  readonly tier: Exclude<CoverTier, 'none'>;\\n}\\n\\nexport interface TerrainCornerLineTrace {\\n  readonly targetCorner: CornerPoint;\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineTrace {\\n  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */\\n  readonly sourceCell: GridCell;\\n  readonly targetCell: GridCell;\\n  readonly sourceCorner: CornerPoint;\\n  readonly lines: readonly TerrainCornerLineTrace[];\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineOptions {\\n  readonly sourceId?: CombatantId;\\n  readonly targetId?: CombatantId;\\n  readonly includeCreatures?: boolean;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nfunction normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {\\n  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]\\n    .sort(compareCells);\\n}\\n\\nfunction sightBlockingSignature(cells: readonly GridCell[]): string {\\n  return cells.map(cellKey).join(';');\\n}\\n\\nfunction taggedSourceId(source: TerrainLineSource): string {\\n  switch (source.kind) {\\n    case 'blocked_cell': return "'`blocked:${source.id}`;'"\\n    case 'world_object': return "'`object:${source.id}`;'"\\n    case 'creature': return "'`creature:${source.id}`;'"\\n  }\\n}\\n\\ninterface TerrainSourceCell {\\n  readonly cell: GridCell;\\n  readonly sources: TerrainLineSource[];\\n}\\n\\nfunction addSource(\\n  sourceCells: Map<string, TerrainSourceCell>,\\n  cell: GridCell,\\n  source: TerrainLineSource,\\n  exclusions: ReadonlySet<string>,\\n): void {\\n  const key = cellKey(cell);\\n  if (exclusions.has(key)) return;\\n  const existing = sourceCells.get(key);\\n  if (existing === undefined) {\\n    sourceCells.set(key, { cell: { ...cell }, sources: [source] });\\n  } else {\\n    existing.sources.push(source);\\n  }\\n}\\n\\ninterface TerrainSourceIndexes {\\n  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;\\n  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;\\n}\\n\\nconst terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();\\nconst terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();\\nconst equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();\\nconst EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;\\n\\nfunction terrainSourceSignature(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  indexedSources: ReadonlyMap<string, TerrainSourceCell>,\\n): string {\\n  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();\\n  const cached = stateSignatures.get(includeCreatures);\\n  if (cached "'!== undefined) return cached;'"\\n  const signature = [...indexedSources].map(([key, entry]) =>\\n    "'`${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join('"',')}"'`)'"\\n    .join('|');\\n  stateSignatures.set(includeCreatures, signature);\\n  if ("'!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);'"\\n  return signature;\\n}\\n\\nfunction retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {\\n  equivalentTerrainLineTraces.set(key, trace);\\n  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;\\n  const oldest = equivalentTerrainLineTraces.keys().next().value;\\n  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);\\n}\\n\\nfunction buildTerrainSourceIndex(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  terrain?: ReadonlyMap<string, TerrainSourceCell>,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined\\n    ? new Map<string, TerrainSourceCell>()\\n    : new Map([...terrain].map(([key, entry]) => [key, {\\n        cell: { ...entry.cell }, sources: [...entry.sources],\\n      }] as const));\\n  const exclusions = new Set<string>();\\n  if (terrain === undefined) {\\n    for (const cell of state.blockedCells) {\\n      addSource(sourceCells, cell, {\\n        kind: 'blocked_cell', id: "'`${String(cell.column)},${String(cell.row)}`, tier: '"'total',\\n      }, exclusions);\\n    }\\n    for (const object of state.worldObjects) {\\n      if (object.blocking.cover === 'none') continue;\\n      for (const cell of object.footprint) {\\n        addSource(sourceCells, cell, {\\n          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,\\n        }, exclusions);\\n      }\\n    }\\n  }\\n  if ("'!includeCreatures) return sourceCells;'"\\n  for (const candidate of state.combatants) {\\n    const id = candidate.profile.id;\\n    if (candidate.life === 'dead') continue;\\n    if ("'!state.tokens.some((token) => token.combatantId === id)) continue;'"\\n    for (const cell of combatantSpace(state, id).cells) {\\n      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);\\n    }\\n  }\\n  return sourceCells;\\n}\\n\\nfunction indexedTerrainSources(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const cached = terrainSourceIndexes.get(state);\\n  if (cached "'!== undefined) {'"\\n    if ("'!includeCreatures) return cached.terrain;'"\\n    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);\\n    cached.withCreatures = withCreatures;\\n    return withCreatures;\\n  }\\n  const terrain = buildTerrainSourceIndex(state, false);\\n  const entry: TerrainSourceIndexes = { terrain };\\n  terrainSourceIndexes.set(state, entry);\\n  if ("'!includeCreatures) return terrain;'"\\n  const withCreatures = buildTerrainSourceIndex(state, true, terrain);\\n  entry.withCreatures = withCreatures;\\n  return withCreatures;\\n}\\n\\nfunction uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {\\n  return sources\\n    .filter((source, index, all) =>\\n      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)\\n    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));\\n}\\n\\ninterface SightBlockingHit {\\n  readonly cell: GridCell;\\n  readonly progress: number;\\n}\\n\\nfunction firstSharedEdgeBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if (from.row === to.row && Number.isInteger(from.row)) {\\n    const direction = from.column < to.column ? 1 : -1;\\n    for (\\n      let column = direction === 1 ? from.column : from.column - 1;\\n      direction === 1 ? column < to.column : column >= to.column;\\n      column += direction\\n    ) {\\n      const upper = { column, row: from.row - 1 };\\n      const lower = { column, row: from.row };\\n      // Deterministic pair choice: the flanking cell with the lower row wins.\\n      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {\\n        const entryColumn = direction === 1 ? column : column + 1;\\n        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };\\n      }\\n    }\\n  }\\n  if (from.column === to.column && Number.isInteger(from.column)) {\\n    const direction = from.row < to.row ? 1 : -1;\\n    for (\\n      let row = direction === 1 ? from.row : from.row - 1;\\n      direction === 1 ? row < to.row : row >= to.row;\\n      row += direction\\n    ) {\\n      const left = { column: from.column - 1, row };\\n      const right = { column: from.column, row };\\n      // Deterministic pair choice: the flanking cell with the lower column wins.\\n      if (sightBlockingAt(left) && sightBlockingAt(right)) {\\n        const entryRow = direction === 1 ? row : row + 1;\\n        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };\\n      }\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction greatestCommonDivisor(left: number, right: number): number {\\n  let dividend = Math.abs(left);\\n  let divisor = Math.abs(right);\\n  while (divisor "'!== 0) {'"\\n    const remainder = dividend % divisor;\\n    dividend = divisor;\\n    divisor = remainder;\\n  }\\n  return dividend;\\n}\\n\\nfunction firstSharedVertexBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if ("'![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;'"\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);\\n  if (latticeSteps <= 1) return null;\\n  const columnStep = columnDelta / latticeSteps;\\n  const rowStep = rowDelta / latticeSteps;\\n  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.\\n  for (let index = 1; index < latticeSteps; index += 1) {\\n    const column = from.column + columnStep * index;\\n    const row = from.row + rowStep * index;\\n    const topLeft = { column: column - 1, row: row - 1 };\\n    const topRight = { column, row: row - 1 };\\n    // Check TL/BR first so lower row then lower column wins when both pairs seal.\\n    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {\\n      return { cell: topLeft, progress: index / latticeSteps };\\n    }\\n    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {\\n      return { cell: topRight, progress: index / latticeSteps };\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  let entry = 0;\\n  const columnDelta = to.column - from.column;\\n  if (columnDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.column - from.column) / columnDelta,\\n      (cell.column + 1 - from.column) / columnDelta,\\n    ));\\n  }\\n  const rowDelta = to.row - from.row;\\n  if (rowDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.row - from.row) / rowDelta,\\n      (cell.row + 1 - from.row) / rowDelta,\\n    ));\\n  }\\n  return entry;\\n}\\n\\nfunction firstSightBlockingCell(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  interveningCells: readonly GridCell[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): GridCell | null {\\n  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);\\n  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);\\n  if (vertex "'!== null && (first === null || vertex.progress < first.progress ||'"\\n    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;\\n  for (const cell of interveningCells) {\\n    if ("'!sightBlockingAt(cell)) continue;'"\\n    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };\\n    if (first === null || hit.progress < first.progress ||\\n      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;\\n  }\\n  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.\\n  // Simultaneous events use lower row, then lower column.\\n  return first === null ? null : { ...first.cell };\\n}\\n\\nfunction traceCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): TerrainCornerLineTrace {\\n  const interveningCells = rasterizeCornerLine(from, to, candidates);\\n  let tier: CoverTier = 'none';\\n  let strongest: TerrainLineSource[] = [];\\n  const firstBlockingCell = firstSightBlockingCell(\\n    from,\\n    to,\\n    interveningCells,\\n    sightBlockingAt,\\n  );\\n  for (const cell of interveningCells) {\\n    for (const source of sourcesAt(cell)) {\\n      const comparison = coverRank(source.tier) - coverRank(tier);\\n      if (comparison > 0) {\\n        tier = source.tier;\\n        strongest = [source];\\n      } else if (comparison === 0) {\\n        strongest.push(source);\\n      }\\n    }\\n  }\\n  const sources = uniqueSources(strongest);\\n  return {\\n    targetCorner: { ...to },\\n    interveningCells,\\n    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell,\\n  };\\n}\\n\\nconst COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];\\n\\nfunction countTier(obstructedLineCount: number): CoverTier {\\n  if (obstructedLineCount === 0) return 'none';\\n  if (obstructedLineCount <= 2) return 'half';\\n  if (obstructedLineCount === 3) return 'three_quarters';\\n  return 'total';\\n}\\n\\nfunction aggregateCornerLines(\\n  sourceCorner: CornerPoint,\\n  lines: readonly TerrainCornerLineTrace[],\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n): TerrainLineTrace {\\n  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);\\n  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');\\n  const obstructed = lines.filter((line) => line.tier "'!== '"'none');\\n  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>\\n    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');\\n  const tier = physicalBlocksCover\\n    ? 'total'\\n    : COVER_TIER_BY_RANK[Math.min(\\n        coverRank(countTier(obstructed.length)),\\n        coverRank(strongestLineTier),\\n        coverRank('three_quarters'),\\n      )] ?? 'none';\\n  const sources = tier === 'none'\\n    ? []\\n    : uniqueSources(obstructed\\n        .filter((line) => line.tier === strongestLineTier)\\n        .flatMap((line) => line.sources));\\n  const interveningCells = [...new Map(lines\\n    .flatMap((line) => line.interveningCells)\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;\\n  return {\\n    sourceCell: { ...sourceCell },\\n    targetCell: { ...targetCell },\\n    sourceCorner: { ...sourceCorner },\\n    lines,\\n    interveningCells,\\n    tier,\\n    blocksSight,\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,\\n  };\\n}\\n\\nfunction comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return coverRank(left.tier) - coverRank(right.tier) ||\\n    left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction nearestCells(\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {\\n  const sources = [...sourceCells].sort(compareCells);\\n  const targets = [...targetCells].sort(compareCells);\\n  const firstSource = sources[0];\\n  const firstTarget = targets[0];\\n  if (firstSource === undefined || firstTarget === undefined) {\\n    throw new RangeError('A line query requires non-empty source and target spaces.');\\n  }\\n  let selectedSource = firstSource;\\n  let selectedTarget = firstTarget;\\n  let selectedDistance = Number.POSITIVE_INFINITY;\\n  for (const sourceCell of sources) {\\n    for (const targetCell of targets) {\\n      const distance = Math.max(\\n        Math.abs(sourceCell.column - targetCell.column),\\n        Math.abs(sourceCell.row - targetCell.row),\\n      );\\n      if (distance < selectedDistance) {\\n        selectedSource = sourceCell;\\n        selectedTarget = targetCell;\\n        selectedDistance = distance;\\n      }\\n    }\\n  }\\n  return { sourceCell: selectedSource, targetCell: selectedTarget };\\n}\\n\\nfunction traceSpaces(\\n  state: EncounterState,\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n  options: TerrainLineOptions,\\n): TerrainLineTrace {\\n  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);\\n  const blockerSignature = sightBlockingSignature(sightBlockingCells);\\n  const traceKey = "'`${options.includeCreatures === true ? '"'creatures' : 'terrain'}:"'${sourceCells'"\\n    .map(cellKey).join(';')}->"'${targetCells.map(cellKey).join('"';')}#sight:"'${blockerSignature}`;'"\\n  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  const cached = stateTraces.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  if ("'!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);'"\\n  const nearest = nearestCells(sourceCells, targetCells);\\n  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));\\n  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);\\n  const equivalentTraceKey = "'`${terrainSourceSignature('"\\n    state,\\n    options.includeCreatures === true,\\n    indexedSources,\\n  )}\\\\0"'${traceKey}`;'"\\n  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);\\n  if (equivalent "'!== undefined) {'"\\n    stateTraces.set(traceKey, equivalent);\\n    return equivalent;\\n  }\\n  const sourceCorners = outerCorners(sourceCells);\\n  const targetCorners = outerCorners(targetCells);\\n  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);\\n  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);\\n  const minimumColumn = Math.min(...cornerColumns);\\n  const maximumColumn = Math.max(...cornerColumns);\\n  const minimumRow = Math.min(...cornerRows);\\n  const maximumRow = Math.max(...cornerRows);\\n  const candidateEntries = sightBlockingCells.length === 0\\n    ? [...indexedSources.values()]\\n    : [...new Map([\\n        ...indexedSources.values(),\\n        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),\\n      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];\\n  const candidates = candidateEntries\\n    .filter((entry) => "'!exclusions.has(cellKey(entry.cell)) &&'"\\n      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&\\n      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)\\n    .map((entry) => entry.cell);\\n  const sightBlockingKeys = new Set([\\n    ...sightBlockingCells.map(cellKey),\\n    ...[...indexedSources]\\n      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))\\n      .map(([key]) => key),\\n  ]);\\n  const sightBlockingAt = (cell: GridCell): boolean => {\\n    const key = cellKey(cell);\\n    return "'!exclusions.has(key) && sightBlockingKeys.has(key);'"\\n  };\\n  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],\\n      sightBlockingAt,\\n    )),\\n    nearest.sourceCell,\\n    nearest.targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  const physicalSelected = traces.reduce(\\n    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,\\n    first,\\n  );\\n  const blocksSight = traces.every((trace) => trace.blocksSight);\\n  const opticalSelected = blocksSight\\n    ? traces.reduce(\\n        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,\\n        first,\\n      )\\n    : null;\\n  const selected: TerrainLineTrace = {\\n    ...physicalSelected,\\n    blocksSight,\\n    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,\\n  };\\n  stateTraces.set(traceKey, selected);\\n  retainEquivalentTrace(equivalentTraceKey, selected);\\n  return selected;\\n}\\n\\n/** The canonical 2014 corner-to-corner trace for two bare grid cells. */\\nexport function traceTerrainLine(\\n  state: EncounterState,\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n  options: TerrainLineOptions = {},\\n): TerrainLineTrace {\\n  return traceSpaces(state, [sourceCell], [targetCell], options);\\n}\\n\\nexport interface CreatureLineOptions {\\n  readonly sourceAnchor?: GridCell;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nexport function traceCombatantLine(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const traceKey = "'`${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined'"\\n    ? 'current'\\n    : cellKey(options.sourceAnchor)}#sight:"'${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {\\n    sourceId,\\n    targetId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function traceCombatantLineToCells(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetCells: readonly GridCell[],\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const targetSignature = targetCells.map(cellKey).join(';');\\n  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);\\n  const traceKey = "'`${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, targetCells, {\\n    sourceId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function coverTierBetweenObjects(\\n  objects: readonly WorldObject[],\\n  from: GridCell,\\n  to: GridCell,\\n): CoverTier {\\n  const exclusions = new Set([cellKey(from), cellKey(to)]);\\n  const candidates = [...new Map(objects\\n    .flatMap((object) => object.footprint)\\n    .filter((cell) => "'!exclusions.has(cellKey(cell)))'"\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const sourceCell = { ...from };\\n  const targetCell = { ...to };\\n  const targetCorners = outerCorners([to]);\\n  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>\\n    objects.flatMap((object): readonly TerrainLineSource[] =>\\n      objectOccupiesCell(object, cell) && object.blocking.cover "'!== '"'none'\\n        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]\\n        : []);\\n  const sightBlockingAt = (cell: GridCell): boolean =>\\n    "'!exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === '"'total');\\n  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      sourcesAt,\\n      sightBlockingAt,\\n    )),\\n    sourceCell,\\n    targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  return traces.reduce((best, candidate) =>\\n    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;\\n}\\n\\nexport type CreatureCoverOptions = CreatureLineOptions;\\n\\nexport interface CombatantCoverResult {\\n  readonly tier: CoverTier;\\n  readonly sourceIds: readonly string[];\\n}\\n\\nexport function coverBetweenCombatants(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureCoverOptions = {},\\n): CombatantCoverResult {\\n  const trace = traceCombatantLine(state, sourceId, targetId, options);\\n  return { tier: trace.tier, sourceIds: trace.sourceIds };\\n}\\n\";if(id.endsWith('/tests/unit/vtt/scene-snapshot.test.ts'))return code.replace('const before = persistedByteBaseline(state, coordinator);','const before = persistedByteBaseline(state, coordinator); console.log(\"REVIEW_CAPTURE \"+JSON.stringify({before, state:canonicalJson(state), coordinator})); return;');}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/scene-snapshot.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"preserves full persisted\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/scene-snapshot.test.ts'))return code.replace('const before = persistedByteBaseline(state, coordinator);','const before = persistedByteBaseline(state, coordinator); console.log(\"REVIEW_CAPTURE \"+JSON.stringify({before, state:canonicalJson(state), coordinator})); return;');}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 2779ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/combat/visibility-field.test.ts > REVIEW_ENDPOINT_ENUMERATION
ENUMERATION 200 endpoint assertions; Large/Huge all four quadrant assignments

ENUMERATION 200 endpoint assertions; Large/Huge all four quadrant assignments

stdout | tests/unit/combat/visibility-field.test.ts > REVIEW_LARGE_TOP_LEFT_JUNCTION
LARGE {"blocked":true,"first":{"column":2,"row":1},"tier":"none"}

LARGE {"blocked":true,"first":{"column":2,"row":1},"tier":"none"}

 ✓ tests/unit/combat/visibility-field.test.ts (56 tests | 54 skipped) 13ms

 Test Files  1 passed (1)
      Tests  2 passed | 54 skipped (56)
   Start at  00:08:13
   Duration  2.66s (transform 1.04s, setup 0ms, import 2.56s, tests 13ms, environment 0ms)


 succeeded in 2992ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
REVIEW_CAPTURE {"before":{"pendingRequestHash":"0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0","coordinatorHash":"79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd","revisionChecksum":"52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

REVIEW_CAPTURE {"before":{"pendingRequestHash":"0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0","coordinatorHash":"79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd","revisionChecksum":"52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests | 7 skipped) 19ms

 Test Files  1 passed (1)
      Tests  1 passed | 7 skipped (8)
   Start at  00:08:14
   Duration  2.90s (transform 1.21s, setup 0ms, import 2.80s, tests 19ms, environment 0ms)


 succeeded in 3104ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
REVIEW_CAPTURE {"before":{"pendingRequestHash":"28a1eb7efdd80c746bc0bee68beffcc41dd88628f3d9023abc707585cd1deeda","coordinatorHash":"87fc04ad58800bb678aa6ee2e18ec452c043662ec252713f3b7898c719d4824f","revisionChecksum":"9ee9637765265f35eef5dc6f72331ea87405927c78523074079ca6308fdd4b0a","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

REVIEW_CAPTURE {"before":{"pendingRequestHash":"28a1eb7efdd80c746bc0bee68beffcc41dd88628f3d9023abc707585cd1deeda","coordinatorHash":"87fc04ad58800bb678aa6ee2e18ec452c043662ec252713f3b7898c719d4824f","revisionChecksum":"9ee9637765265f35eef5dc6f72331ea87405927c78523074079ca6308fdd4b0a","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests | 7 skipped) 17ms

 Test Files  1 passed (1)
      Tests  1 passed | 7 skipped (8)
   Start at  00:08:15
   Duration  2.97s (transform 1.24s, setup 0ms, import 2.88s, tests 17ms, environment 0ms)


codex
The five targeted suites pass: 74/74. The source, target, adjacent-corner, and own-edge witnesses are green. Endpoint blockers are resolved once per outer corner; each ray then uses sign comparisons to test the closed quadrant.

exec
/bin/bash -lc "rg -n '42|generation|620|511|576|generateRoom' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r5-sol.md | head -25; sed -n '1,95p' tests/unit/vtt/room-generator-los-cover.test.ts; sed -n '1100,1275p' tests/unit/combat/visibility-field.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
14:RULES (binding, restated): You are the IMPLEMENTER (gpt-5.6-sol, high, RESUMED — WALL-01 fix r2/r3/r4). Worktree /home/vagrant/PhpstormProjects/dnd-wt-vis-field (claude/vis-field at bc6422bf + your uncommitted r4 edits to src/combat/cover.ts and tests/unit/combat/visibility-field.test.ts). Workspace-write in that worktree only; no git writes; no .claude/** or docs/**; no claude / other agents / consensus skills; no Playwright / full vitest / build; never port 4173; every expectation hand-derived with the geometry in a comment; D569 for any scene pin that moves; never fresh hashes. The MAIN repo's .claude/decisions.md D654–D657 is readable.
20:WITNESSES: ADJACENT_CORNER_AGGREGATE_BLOCKED = probe D through traceTerrainLine (Medium tokens): blocksSight true (first = the pair pick); EDGE_ARRIVAL_AT_JUNCTION_BLOCKED = the per-ray (2,1)→(2,2) and (3,2)→(2,2) cases: blocked; OWN_EDGE_DEPARTURE_CLEAR = (2,2)→(2,0) style graze along the own cell's edge: clear; FAR_FACE_DEPARTURE_BLOCKED = (2,2)→(0,2): blocked; keep every r4 witness. MUTANTS: the refined test replaced by r4's diagonal-only test → ADJACENT_CORNER_AGGREGATE_BLOCKED and EDGE_ARRIVAL red; endpoint rule blocking everything → OWN_EDGE_DEPARTURE_CLEAR and SAME_SIDE red; physical tier raised → PHYSICAL_COVER pin red. Then re-run: visibility-field, the r3 scene suites (scene-snapshot, ai-dm-conversation, dm-tactical-intel, tactical-evaluator-r02), two-room-fixture, engine-query-port, room-generator, brutal-b, the three behaviour suites, d569 ×2, screenshot-probe, los-cover, replay+detection (pair ≤41 s); any scene pin that moves → derive (which junction, which edge-aligned ray) and normalize under D569 or stop; REDO the frozen-family counts (before bc6422bf / after) and the 42-seed generation byte check — STOP if generation bytes change. VERIFICATION: tsc app/node; git diff --check; no line > 120; git status --short. OUTPUT: the rule as implemented, per-witness derivations, mutants, counts, byte check, red set by title; then "WALL-01-FIX-R5 DONE" (or BLOCKED).
23:I’ll refine only the endpoint-direction predicate, add the aggregate and edge-aligned witnesses red-first, and preserve the existing endpoint, interior, physical-cover, and r3 scene pins. I’ll stop immediately if the 42 generated-room bytes change.
31:ASTRA (2.49 M tokens): geometry otherwise sound (single-blocker touch and outer-face graze clear; shared edges block; interior diagonal pairs block including TL+BR with a TR→BL ray; three/four-blocker vertices covered; Fraction enumeration matched the gcd enumeration for 600 ordered integer endpoint pairs; ordering/tie-break explicit; physical tier independent — its "total whenever firstBlockingCell" mutant killed); r3 derivations reproduced (fog (4,3) → (4,3),(8,3),(9,3); fighter +(8,2),(9,2),(8,3),(9,3); all three hash transitions reproduced by substituting baseline vs candidate cover.ts in memory; only visibleState.cells/concealedCells changed; fingerprint dd802783…; the three replacement blockers have zero diagonal neighbours; five opened pairs / Half + Three-Quarters / both 90-ft shots asserted); six files 387+/49−; tsc 0/0; 66/66 across the suites it could run; perf: the productive-option los-cover test 4,935 ms baseline → 5,740 ms candidate (gcd + up to four lookups per interior vertex) — deferred perf work, not blocking. WALL-F3 (P1): a COMPLETE stepped wall (6×6; blockers col 1 rows 0–1, col 2 rows 2–5; junction (2,2) between (1,1) and (2,2)) leaks: of the 16 corner rays from observer (2,1) to target (0,3), 10 hit interiors, 2 hit the sealed vertex strictly inside, and 4 START at the sealed junction (the observer's bottom-left corner) and pass through the pinch — the endpoint exclusion lets them through; production says visible/seen. VERIFIED BY ME on seam-ab at bc6422bf: (2,1)→(0,3) tier none / blocksSight FALSE; reversed half / FALSE; same-side (2,1)→(5,1) clear (correct). ROOT CAUSE = my WALL-01 brief: "Endpoint vertices (t = 0 or 1) are NOT vertex-checked — the cell-interior rule governs there"; sol implemented what I specified. Finding against my own work, at full length: I specified a geometric rule from intuition without enumerating the endpoint case; astra's rational enumeration did. RULE (D654): at an endpoint vertex with a sealed pair, the ray blocks iff it passes through the pinch — leaves the source corner into the open quadrant diagonally opposite the source cell's quadrant (or, mirrored, arrives at the target corner from the opposite quadrant); edge-aligned departures fall to the shared-edge rule; same-side departures stay clear; zero-length corner contact across a sealed junction = blocked. Fix r4 dispatched (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r4.md): witnesses for source/target endpoint, same-side control, adjacent-corner zero-length, three mutants; re-run of every scene suite with D569 handling if pins move; counts and generation bytes redone — if generation bytes change, STOP (it would alter the cohort plan's premise).
34:VERIFIED (verify-b2.log, clean checkout at e92ebc93 + patch): tsc 0/0; diff-check 0; 0 long lines; V-freeze 0 and no fixture files touched; the new v2 suite 30 red, every failure ENOENT on the declared missing fixture; room-generator 56/56; brutal-b 47/47; second-family 50/50. Read by me: the removed code in both frozen suites is exactly the per-monster productivity loop, replaced by the D635/D642/D643 rationale. Generation (Batches 3–5) still gated on WALL-01 (fix r4 in flight).
37:B2-F1 (P2): the 6203 retirement removed the whole brutalRoomMembershipViolations test (difficulty, scaled budget/spend, caster, terrain AND productivity) instead of only the productivity loop; astra's in-memory mutant (budget +1 on 6203010) leaves the suite 56/56 green; the fix restores the ten-seed static assertion filtering only brutal_productivity. Everything else accepted: 6206 retirement exact; 30 v2 declarations through declareTestInputs; PLAN-F6 predicate with the query's own traceCombatantLine at mechanics.finalPosition; membership after decoding with no swallow (an in-memory bad-budget fixture fails with brutal_budget); three mutants killed; tsc 0/0; freeze 0; 229 added lines, 0 over 120. Fix r1 dispatched (resume 01a0b245…).
38:WALL-01 fix r4 (sol, resume 01a0b20e-61fa…; 2 files 286+/26−): endpoint-junction rule — at a sealed vertex a source ray blocks only when leaving diagonally into the quadrant opposite the source cell (TL→BR, TR→BL, BL→TR, BR→TL ownership), target rays mirrored, axis-aligned rays to the shared-edge rule, zero-length corner contact across opposite free quadrants blocked, progress 0/1, physical cover untouched, same path in coverTierBetweenObjects; witnesses SOURCE/TARGET_ENDPOINT_JUNCTION_SEALED (astra's scene), SAME_SIDE_ENDPOINT_GRAZE_CLEAR, ADJACENT_CORNER_ZERO_LENGTH; DIAGONAL_CORNER_TOUCH_SEALED_D642 re-derived (its source corner (1,1) had been an excluded endpoint — now aggregate blocked, first (1,0), tier none); three mutants killed; visibility-field 50/50; r3 scenes 5/5; ten-suite audit 246 passed + exactly the 35 known frozen reds; counts unchanged (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36); 42 generated rooms byte-identical (7b884bf9…); pair 39.4 s; los-cover budget tests 5.6 s isolated (perf). MY VERIFICATION (verify-wall-01-r4.log, seam-ab at bc6422bf + patch): tsc, six-case probe (A/B endpoint must block; C same-side clear; D adjacent corner blocked; E interior; F stepped wall), endpoint-rule-null mutant, 15 suites, los-cover, pair.
447:  it('DIAGONAL_CORNER_TOUCH_SEALED_D642', () => {
463:    // D642 seals that exact sight-only ray and picks lower-row cell (1,0); physical tier stays None.
486:    // Pre-D642 physical pin: interior crossings obstruct two target-corner rays, yielding Half Cover.
539:ASTRA r3 (saved review-plan-cohort-01-astra-r3.md): F2 closed (all three namespace commands re-run verbatim, statuses 0/1/0, 1,000/1,000 plain and underscore seeds per namespace + the xxx form); F5 closed (ten-namespace union, own-cohort exceptions, remove-any-row tests, the 6204 mutant); F6 closed (positive movement stays productive; Dash-only witness + movement-arm mutant; sight/cover only on targeted offensive components); F1/F4 closed; counts 3/3/10/10/10/8/4/4/3/1 = 52 paths. F3 resolved by AMENDMENT: with the typed zero-speed effect alone the real planner still offers A a 25-ft move to (8,3) + Longbow (attack declarations read subject.profile.rules.speed, offer-declarations.ts:431
540:465); with the profile's rules.speed also feet(0) the real planner + an in-memory D642 reference gives base = Longbow 
551:; saved impl-wall-01-fix-r2-sol.md; no files changed): all five reds are correct D642 consequences 
578: SUPERVISOR (2026-09-17 22:08): COHORT-01 B1 ACCEPTED by astra r1 (medium; 1 P3; saved review-b1-astra-r1.md); WALL-01 r3 VERIFIED BY ME and committed bc6422bf; astra review of the whole WALL-01 candidate dispatched; COHORT-01 B2 dispatched
581: both generations differ only at \$.encounter.state.foggedCells, 20/20 raw hashes match, v1 validation 0 violations; projection deletes exactly the committed own key, generated bytes untouched; rebound `round` and root changes still fail both regenerations; missing historical keys and v2 legacy keys reject; only frozen brutal productivity retired (integrity/reducer loading, static budget/caster/terrain, hashes, ledger, namespaces, both regenerations enforced); the strict v1/v2 union sound; N2 is a real enforcement witness (runArena rows with synthetic adapters rejected at 32,768 vs v5's 8,192; guard mutant 
582: 2 red); v6 seam correctly deferred; tsc 0/0; freeze 0; 191 added lines, 0 over 120; its runs: second-family 50/50, v5 27/27 (in-memory I/O), ignore-second-generation mutant 49/1. B1-F1 (P3): the brutal_productivity filter at second-family-manifest.test.ts:147 lacks the D635/D642/D643 rationale comment 
583: folded into Batch 2. NOTE for Batch 6 (astra): substituting canonical regeneration in the blind-experiment helper clears the six reds but exposes a whitespace-only expectation at d569-blind-experiment.test.ts:727.
586: perf, D635.53); pair 36/36 in 39 s. Committed bc6422bf on claude/vis-field (6887755f candidate + r3). Astra (resume 01a0a642
587:, medium; brief review-impl-wall-01-astra.md; log review-wall-01-astra-r1.log) reviews the whole candidate on seam-ab at bc6422bf, including the geometry enumeration (endpoint vertices, three/four-blocker vertices, direction of travel), the gcd/progress ordering, physical-cover invariance, the added per-ray cost, and the r3 derivations.
604: the endpoint exclusion lets them through; production says visible/seen. VERIFIED BY ME on seam-ab at bc6422bf: (2,1)
609:; brief impl-vis-field-wall-01-fix-r4.md): witnesses for source/target endpoint, same-side control, adjacent-corner zero-length, three mutants; re-run of every scene suite with D569 handling if pins move; counts and generation bytes redone 
610: if generation bytes change, STOP (it would alter the cohort plan's premise).
613:VERIFIED (verify-b2.log, clean checkout at e92ebc93 + patch): tsc 0/0; diff-check 0; 0 long lines; V-freeze 0 and no fixture files touched; the new v2 suite 30 red, every failure ENOENT on the declared missing fixture; room-generator 56/56; brutal-b 47/47; second-family 50/50. Read by me: the removed code in both frozen suites is exactly the per-monster productivity loop, replaced by the D635/D642/D643 rationale. Generation (Batches 3
619:B2-F1 (P2): the 6203 retirement removed the whole brutalRoomMembershipViolations test (difficulty, scaled budget/spend, caster, terrain AND productivity) instead of only the productivity loop; astra's in-memory mutant (budget +1 on 6203010) leaves the suite 56/56 green; the fix restores the ten-seed static assertion filtering only brutal_productivity. Everything else accepted: 6206 retirement exact; 30 v2 declarations through declareTestInputs; PLAN-F6 predicate with the query's own traceCombatantLine at mechanics.finalPosition; membership after decoding with no swallow (an in-memory bad-budget fixture fails with brutal_budget); three mutants killed; tsc 0/0; freeze 0; 229 added lines, 0 over 120. Fix r1 dispatched (resume 01a0b245
627:TL ownership), target rays mirrored, axis-aligned rays to the shared-edge rule, zero-length corner contact across opposite free quadrants blocked, progress 0/1, physical cover untouched, same path in coverTierBetweenObjects; witnesses SOURCE/TARGET_ENDPOINT_JUNCTION_SEALED (astra's scene), SAME_SIDE_ENDPOINT_GRAZE_CLEAR, ADJACENT_CORNER_ZERO_LENGTH; DIAGONAL_CORNER_TOUCH_SEALED_D642 re-derived (its source corner (1,1) had been an excluded endpoint 
import { describe, expect, it } from 'vitest';
import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
import { createEncounter } from '../../../src/combat/encounter';
import {
  traceCombatantLine,
  traceCombatantLineToCells,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { isCellInside, type GridCell } from '../../../src/combat/grid';
import { findPath } from '../../../src/combat/movement';
import { terrainBlocking, type CoverTier } from '../../../src/combat/terrain';
import { feet, type CombatantId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import {
  generatedLineIsOpen,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const FIXTURE_CASES = [
  { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
  { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
  { difficulty: 'standard', seed: 5_762_003, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json' },
  { difficulty: 'hard', seed: 5_762_101, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json' },
  { difficulty: 'hard', seed: 5_762_102, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json' },
  { difficulty: 'hard', seed: 5_762_103, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json' },
  { difficulty: 'brutal', seed: 5_762_201, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json' },
  { difficulty: 'brutal', seed: 5_762_202, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json' },
  { difficulty: 'brutal', seed: 5_762_203, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json' },
] as const satisfies readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly path: `tests/fixtures/${string}`;
}[];

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json',
    'tests/fixtures/arena-basis-challenge/seed-5831001.json',
  ],
});

const PROPERTY_CASES: readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
}[] = (['standard', 'hard', 'brutal'] as const).flatMap((difficulty) =>
  Array.from({ length: 32 }, (_unused, seed) => ({ difficulty, seed })));

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function livingSides(room: GeneratedRoom) {
  const state = room.encounter.state;
  return {
    party: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'player_character'),
    monsters: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'monster'),
  };
}

function opposingPairTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  const { party, monsters } = livingSides(room);
  return [
    ...party.flatMap((source) => monsters.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
    ...monsters.flatMap((source) => party.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
  ];
}

function creatureToCellTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  });

  it('SOURCE_ENDPOINT_JUNCTION_SEALED', () => {
    const observer = normalProfile('source-endpoint-observer');
    const blockers = [
      { column: 1, row: 0 }, { column: 1, row: 1 },
      { column: 2, row: 2 }, { column: 2, row: 3 },
      { column: 2, row: 4 }, { column: 2, row: 5 },
    ];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 }, blockedCells: blockers });
    const trace = traceTerrainLine(state, { column: 2, row: 1 }, { column: 0, row: 3 });

    // The observer's bottom-left corner is vertex (2,2); its cell lies TR of that vertex.
    // Ray (2,2)->(0,4) leaves into the opposite BL quadrant through the pinch sealed by
    // TL (1,1) + BR (2,2). Lower-row cell (1,1) wins; physical cover remains None.
    expect(trace).toMatchObject({
      tier: 'none',
      blocksSight: true,
      firstBlockingCell: { column: 1, row: 1 },
    });
  });

  it('TARGET_ENDPOINT_JUNCTION_SEALED', () => {
    const observer = normalProfile('target-endpoint-observer');
    const blockers = [
      { column: 1, row: 0 }, { column: 1, row: 1 },
      { column: 2, row: 2 }, { column: 2, row: 3 },
      { column: 2, row: 4 }, { column: 2, row: 5 },
    ];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 }, blockedCells: blockers });
    const trace = traceTerrainLine(state, { column: 0, row: 3 }, { column: 2, row: 1 });

    // Mirrored ray (0,4)->(2,2) arrives from the BL quadrant opposite the target cell's
    // TR quadrant. TL (1,1) + BR (2,2) seal vertex (2,2); physical Half Cover is unchanged.
    expect(trace).toMatchObject({
      tier: 'half',
      blocksSight: true,
      firstBlockingCell: { column: 1, row: 1 },
    });
  });

  it('SAME_SIDE_ENDPOINT_GRAZE_CLEAR', () => {
    const observer = normalProfile('same-side-endpoint-observer');
    const blockers = [
      { column: 1, row: 0 }, { column: 1, row: 1 },
      { column: 2, row: 2 }, { column: 2, row: 3 },
      { column: 2, row: 4 }, { column: 2, row: 5 },
    ];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 }, blockedCells: blockers });
    const trace = traceTerrainLine(state, { column: 2, row: 1 }, { column: 5, row: 1 });
    const reverseTrace = traceTerrainLine(state, { column: 5, row: 1 }, { column: 2, row: 1 });
    const sameSideEndpoint = reverseTrace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);

    // Source corner (2,2) belongs to a cell in its TR quadrant. Rays toward (5,1) stay
    // on that same side or leave along a cell edge; neither crosses the sealed pinch.
    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
    // Mirrored ray (5,1)->(2,2) arrives from the target cell's own TR quadrant, not the
    // opposite BL quadrant. Pin it directly so an indiscriminate sealed-endpoint rule fails.
    expect(sameSideEndpoint).toMatchObject({ blocksSight: false, firstBlockingCell: null });
  });

  it('ADJACENT_CORNER_ZERO_LENGTH', () => {
    const observer = normalProfile('zero-length-endpoint-observer');
    const blockers = [{ column: 1, row: 1 }, { column: 2, row: 2 }];
    const state = fieldState(observer, { bounds: { columns: 4, rows: 4 }, blockedCells: blockers });
    const trace = traceTerrainLine(state, { column: 2, row: 1 }, { column: 1, row: 2 });
    const zeroLength = trace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);
    const diagonal = trace.lines.find((line) =>
      line.targetCorner.column === 1 && line.targetCorner.row === 3);

    // At shared corner (2,2), the source cell is TR and target cell BL: opposite free
    // quadrants around the TL (1,1) + BR (2,2) pair. Their zero-length corner ray is
    // blocked at the solid-wall pinch, as is the ray leaving diagonally into target-side BL.
    expect(trace.sourceCorner).toEqual({ column: 2, row: 2 });
    expect(zeroLength).toMatchObject({
      tier: 'none', blocksSight: true, firstBlockingCell: { column: 1, row: 1 },
    });
    expect(diagonal).toMatchObject({
      tier: 'none', blocksSight: true, firstBlockingCell: { column: 1, row: 1 },
    });
    expect(trace.tier).toBe('none');

    const open = { ...state, blockedCells: [{ column: 1, row: 1 }] };
    const openTrace = traceTerrainLine(open, { column: 2, row: 1 }, { column: 1, row: 2 });
    const openZeroLength = openTrace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);
    // Without BR (2,2), no sealed pair exists: the identical zero-length contact is clear.
    expect(openTrace.sourceCorner).toEqual({ column: 2, row: 2 });
    expect(openZeroLength).toMatchObject({ blocksSight: false, firstBlockingCell: null });
    expect(openTrace.blocksSight).toBe(false);
  });

  it('ADJACENT_CORNER_AGGREGATE_BLOCKED', () => {
    const observer = normalProfile('adjacent-junction-observer');
    const blockers = [
      { column: 1, row: 0 }, { column: 1, row: 1 },
      { column: 2, row: 2 }, { column: 2, row: 3 },
      { column: 2, row: 4 }, { column: 2, row: 5 },
    ];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 }, blockedCells: blockers });
    const trace = traceTerrainLine(state, { column: 2, row: 1 }, { column: 1, row: 2 });

    // The observer is TR and the target BL of sealed vertex (2,2), between TL (1,1)
    // and BR (2,2). The last r4-clear rays end at the pinch along its far faces:
    // (2,1)->(2,2) and (3,2)->(2,2). D657 blocks both, sealing the aggregate at (1,1).
    expect(trace).toMatchObject({
      tier: 'none',
      blocksSight: true,
      firstBlockingCell: { column: 1, row: 1 },
    });
  });

  it('EDGE_ARRIVAL_AT_JUNCTION_BLOCKED', () => {
    const observer = normalProfile('edge-arrival-observer');
    const blockers = [{ column: 1, row: 1 }, { column: 2, row: 2 }];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 } });
    const options = { additionalSightBlockingCells: blockers } as const;
    const verticalTrace = traceTerrainLine(state, { column: 2, row: 1 }, { column: 1, row: 2 }, options);
    const verticalArrival = verticalTrace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);
    const horizontalTrace = traceTerrainLine(state, { column: 3, row: 2 }, { column: 1, row: 2 }, options);
    const horizontalArrival = horizontalTrace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);

    // At target vertex (2,2), its cell lies BL. Other endpoints (2,1) and (3,2)
    // are respectively above and right of the closed BL quadrant, on the wall's far faces.
    // Thus rays (2,1)->(2,2) and (3,2)->(2,2) both stop at TL (1,1) + BR (2,2).
    expect(verticalTrace.sourceCorner).toEqual({ column: 2, row: 1 });
    expect(horizontalTrace.sourceCorner).toEqual({ column: 3, row: 2 });
    expect(verticalArrival).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 1, row: 1 } });
    expect(horizontalArrival).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 1, row: 1 } });
  });

  it('OWN_EDGE_DEPARTURE_CLEAR', () => {
    const observer = normalProfile('own-edge-departure-observer');
    const blockers = [{ column: 1, row: 1 }, { column: 2, row: 2 }];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 } });
    const trace = traceTerrainLine(
      state,
      { column: 2, row: 0 },
      { column: 2, row: 1 },
      { additionalSightBlockingCells: blockers },
    );
    const ownEdge = trace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);

    // At target vertex (2,2), its cell lies TR. Mirrored ray (2,0)->(2,2), equivalent
    // to departure (2,2)->(2,0), lies on closed TR's vertical own-edge boundary.
    expect(trace.sourceCorner).toEqual({ column: 2, row: 0 });
    expect(ownEdge).toMatchObject({ blocksSight: false, firstBlockingCell: null });
  });

  it('FAR_FACE_DEPARTURE_BLOCKED', () => {
    const observer = normalProfile('far-face-departure-observer');
    const blockers = [{ column: 1, row: 1 }, { column: 2, row: 2 }];
    const state = fieldState(observer, { bounds: { columns: 6, rows: 6 } });
    const trace = traceTerrainLine(
      state,
      { column: 0, row: 2 },
      { column: 2, row: 1 },
      { additionalSightBlockingCells: blockers },
    );
    const farFace = trace.lines.find((line) =>
      line.targetCorner.column === 2 && line.targetCorner.row === 2);

    // At target vertex (2,2), its cell lies TR. Mirrored ray (0,2)->(2,2), equivalent
    // to departure (2,2)->(0,2), lies left of closed TR on the wall's far face.
    expect(trace.sourceCorner).toEqual({ column: 0, row: 2 });
    expect(farFace).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 1, row: 1 } });
  });

  it('STAIRCASE_WALL_SEALED', () => {
    const observer = normalProfile('staircase-wall-observer');
    const subject = normalProfile('staircase-wall-subject');

exec
/bin/bash -lc "rg -n 'writeFile|generateRoom\\(|seeds =|families =|620700|5117001' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r4-sol.md | head -30; sed -n '1,72p' tests/unit/vtt/room-generator-los-cover.test.ts; rg -n 'BRUTAL|6206|6207|generateRoom\\(' tests/unit/vtt/arena-basis-brutal-b.test.ts tests/unit/tools/d569-second-family-manifest.test.ts | head -25" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
4285:22969:Sol (impl-land-01-sol.md): engine-query-port.ts:1167 refuses attack/save offers whose trace blocksSight with the new exact code target_outside_line_of_sight, tracing from the proposed origin (execution's sourceAnchor semantics); the targetability audit found no other authorization gate (query-port :1234/:1547 are tactical-scoring cover inputs and :1830 reports physical cover — left alone, and changing them broke valid intel expectations); room-generator.ts:1227 generatedLineIsOpen = tier 'none' && !blocksSight for both opposing-pair and creature-to-cell predicates; the brutal-b helper materializes the first declared legal activation choice (keeps the engine-ranked option). Witnesses: the two-blocker seam fixture (rays (14,6)/(15,6)→(1,6)/(2,6) along row line 6 between (8,5)/(8,6): closed → half/blocksSight true, no attack offered, LOS code; one flank removed → offered); the AGREEMENT PROPERTY over hard 5117001-013, brutal 6203001-010, brutal-b 6206001-010: exactly 214 offered attack/save uses, every one executes through the reducer without the LOS/Total-Cover error; mutant OFFER_IGNORES_BLOCKS_SIGHT → both red (the cardinality would be 451); OPEN_RAY_IGNORES_BLOCKS_SIGHT → red. GENERATOR BYTES: in-memory regeneration of all 42 checked seeds is byte-equal before/after the fix — so the fixed generator does not cure the frozen families; restoring productivity needs a NEW cohort (reselected seeds), which sharpens question 5's option A. Suites: engine-query-port 19/19; los-cover 112/112; brutal-b 37 passed / 10 failed — the ten productivity pins only (the 19 c1 rows and the four helper rows now execute; "rejects rather than skips" is GREEN, contrary to my brief's prediction — the attended pending decision still forms); d569-blind-experiment 46 / 6 retained (frozen-family, owner's decision); OFFERS 11 files 329/329; dm-tactical-intel + challenge-room 23/23; tsc 0/0; OFFERS checks 0/0; pair 38.6 s; 5 files 260+/9−. ONE CONSEQUENCE outside the manifest: tests/unit/vtt/tactical-evaluator-r02.test.ts:262 pins a hand-authored expected-value probability 0.380769180625 that scored three attacks from origins the reducer would have REFUSED (priest m1, scout m3, bandit m4 at {half, blocksSight true}); with the corrected query the offers come from executable origins (priest 30-ft move to (13,4) none/false; scout 5 ft to (18,4) half/false; bandit 5 ft to (17,4) half/false) and the evaluator scores from each option's finalPosition, giving 0.4323649600000002. Legitimate: the old number rated offers that could not execute. RULING: manifest +1 — tests/unit/vtt/tactical-evaluator-r02.test.ts, that ONE expectation, re-derived BY HAND in its comment (each monster's new origin, line tier/sight, hit chance and damage terms, the sum; the old value kept as pre-LAND-01), never copied from the run; r2 on the resumed session; then my verification, astra medium, and LAND-02.
4289:22993:MY ERROR: D635.37/.41/.44 state "exactly the 16 expected reds (ten brutal-b productivity + six D569 manifest)". Gate r2's full vitest on 9a220fce shows EIGHT more deterministic reds in tests/unit/tools/d569-second-family-manifest.test.ts: the ledger pin ("pins the amended exact contiguous ranges…": expected [] got 47 regeneration markers) and seven brutal-2 seeds 6207002, 6207004–6207009 ("satisfies budget, caster, terrain, and productive-offer invariants": a non-empty violation list). Why I missed them: (1) gate-wt2.sh pipes the vitest red list through `head -30`, and gate r1 on 10cc9f5e had 34 brutal-b + 6 D569 + 10 hard-family reds, so the list was truncated at 30 lines — the r1 log has exactly 30 × lines; (2) my own verifications selected suites and never included d569-second-family-manifest. Sol's LAND-03 report DID name these ("expose the same already-ruled frozen-family invalidity earlier: the ledger pin plus seeds 6207002, 6207004–6207009") and I passed it through as "already ruled" without checking that it was in the recorded set. BISECT (verify-gate-r2-reds.log, clean checkout): the same 8 reds at 10cc9f5e, ebfcacaa and 9a220fce — not introduced by LAND-01/02/03; origin being confirmed against main 9f148666 and the SEAM commits (verify-sfm-origin.log). CONSEQUENCE FOR QUESTION 5: the seam rule invalidates BOTH frozen brutal families — brutal-b (10/10 seeds) and brutal-2 = the D569 second family (7/10 seeds + the ledger) — so option A regenerates both cohorts and versions the second-family manifest; the owner's decision is the same shape, larger.
4361:  'tests/fixtures/arena-basis-hard/seed-5117001.json',
4925:tests/unit/vtt/room-generator-los-cover.test.ts:296:    const generated = generateRoom(5_762_001, { terrainProfile: 'los_cover_v1' });
4926:tests/unit/vtt/room-generator-los-cover.test.ts:308:      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
4927:tests/unit/vtt/room-generator-los-cover.test.ts:321:      expectFeatureMembership(generateRoom(fixture.seed, {
4928:tests/unit/vtt/room-generator-los-cover.test.ts:330:      const room = generateRoom(fixture.seed, {
4929:tests/unit/vtt/room-generator-los-cover.test.ts:344:      expectProductiveMonsters(generateRoom(fixture.seed, {
4930:tests/unit/vtt/room-generator-los-cover.test.ts:353:      const room = generateRoom(fixture.seed, {
4931:tests/unit/vtt/room-generator-los-cover.test.ts:366:      const first = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
4932:tests/unit/vtt/room-generator-los-cover.test.ts:367:      const second = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
4933:tests/unit/vtt/room-generator-los-cover.test.ts:382:      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
4937:src/vtt/room-generator.ts:1426:export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
4938:tools/los-cover-era-audit.ts:280:            const room = generateRoom(seed, { difficulty: 'brutal' });
4939:tools/ai-dm-arena.ts:776:      return generateRoom(seed, {
4940:tools/d569-second-family-manifest.ts:289:  sameSeedHard: GeneratedRoom = generateRoom(room.spec.seed, { difficulty: 'hard' }),
4941:tools/d569-second-family-manifest.ts:488:  return `${canonicalJson(generateRoom(seed, { difficulty: difficulty as RoomDifficultyProfile }))}\n`;
4942:tools/ai-dm-screenshot-probe.ts:2448:    state: generateRoom(seed, {
4943:tools/generate-arena-basis.ts:251:    const generated = generateRoom(seed, {
4944:tools/generate-arena-basis.ts:345:  const room = generateRoom(seed, {
4945:tools/blind-context-fixture-report.ts:48:        state: async () => generateRoom(seed, { difficulty: 'brutal' }).encounter.state,
4956:tests/unit/vtt/room-generator.test.ts:139:    'tests/fixtures/arena-basis-hard/seed-5117001.json',
4968:tests/unit/vtt/room-generator.test.ts:456:      const state = generateRoom(seed).encounter.state;
4969:tests/unit/vtt/room-generator.test.ts:470:      expectValidEnvironmentRegions(generateRoom(seed, { difficulty: 'hard' }));
4970:tests/unit/vtt/room-generator.test.ts:479:    expect(`${canonicalJson(generateRoom(seed))}\n`).toBe(expectedCreatureSpaceFixture(fixtureBytes));
4971:tests/unit/vtt/room-generator.test.ts:494:    expect(`${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`).toBe(
4972:tests/unit/vtt/room-generator.test.ts:509:    const generatedBytes = `${canonicalJson(generateRoom(seed, { difficulty: 'brutal' }))}\n`;
4973:tests/unit/vtt/room-generator.test.ts:512:      generateRoom(seed, { difficulty: 'brutal' }),
4974:tests/unit/vtt/room-generator.test.ts:536:      const room = generateRoom(seed, { difficulty: 'brutal' });
4975:tests/unit/vtt/room-generator.test.ts:591:      const brutal = generateRoom(seed, { difficulty: 'brutal' });
import { describe, expect, it } from 'vitest';
import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
import { createEncounter } from '../../../src/combat/encounter';
import {
  traceCombatantLine,
  traceCombatantLineToCells,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { isCellInside, type GridCell } from '../../../src/combat/grid';
import { findPath } from '../../../src/combat/movement';
import { terrainBlocking, type CoverTier } from '../../../src/combat/terrain';
import { feet, type CombatantId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import {
  generatedLineIsOpen,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const FIXTURE_CASES = [
  { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
  { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
  { difficulty: 'standard', seed: 5_762_003, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json' },
  { difficulty: 'hard', seed: 5_762_101, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json' },
  { difficulty: 'hard', seed: 5_762_102, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json' },
  { difficulty: 'hard', seed: 5_762_103, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json' },
  { difficulty: 'brutal', seed: 5_762_201, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json' },
  { difficulty: 'brutal', seed: 5_762_202, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json' },
  { difficulty: 'brutal', seed: 5_762_203, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json' },
] as const satisfies readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly path: `tests/fixtures/${string}`;
}[];

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json',
    'tests/fixtures/arena-basis-challenge/seed-5831001.json',
  ],
});

const PROPERTY_CASES: readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
}[] = (['standard', 'hard', 'brutal'] as const).flatMap((difficulty) =>
  Array.from({ length: 32 }, (_unused, seed) => ({ difficulty, seed })));

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

tests/unit/tools/d569-second-family-manifest.test.ts:31:const BRUTAL_FIXTURE_PATHS = [
tests/unit/tools/d569-second-family-manifest.test.ts:32:  'tests/fixtures/arena-basis-brutal-2/seed-6207001.json',
tests/unit/tools/d569-second-family-manifest.test.ts:33:  'tests/fixtures/arena-basis-brutal-2/seed-6207002.json',
tests/unit/tools/d569-second-family-manifest.test.ts:34:  'tests/fixtures/arena-basis-brutal-2/seed-6207003.json',
tests/unit/tools/d569-second-family-manifest.test.ts:35:  'tests/fixtures/arena-basis-brutal-2/seed-6207004.json',
tests/unit/tools/d569-second-family-manifest.test.ts:36:  'tests/fixtures/arena-basis-brutal-2/seed-6207005.json',
tests/unit/tools/d569-second-family-manifest.test.ts:37:  'tests/fixtures/arena-basis-brutal-2/seed-6207006.json',
tests/unit/tools/d569-second-family-manifest.test.ts:38:  'tests/fixtures/arena-basis-brutal-2/seed-6207007.json',
tests/unit/tools/d569-second-family-manifest.test.ts:39:  'tests/fixtures/arena-basis-brutal-2/seed-6207008.json',
tests/unit/tools/d569-second-family-manifest.test.ts:40:  'tests/fixtures/arena-basis-brutal-2/seed-6207009.json',
tests/unit/tools/d569-second-family-manifest.test.ts:41:  'tests/fixtures/arena-basis-brutal-2/seed-6207010.json',
tests/unit/tools/d569-second-family-manifest.test.ts:43:const ALL_FIXTURE_PATHS = [...HARD_FIXTURE_PATHS, ...BRUTAL_FIXTURE_PATHS] as const;
tests/unit/tools/d569-second-family-manifest.test.ts:98:  it.each(BRUTAL_FIXTURE_PATHS)(
tests/unit/tools/d569-second-family-manifest.test.ts:117:    const brutal = structuredClone(room(BRUTAL_FIXTURE_PATHS[0]));
tests/unit/vtt/arena-basis-brutal-b.test.ts:29:  BRUTAL_CHALLENGE_BUDGET_SCALE,
tests/unit/vtt/arena-basis-brutal-b.test.ts:30:  BRUTAL_CHALLENGE_SPEND_FRACTION_BAND,
tests/unit/vtt/arena-basis-brutal-b.test.ts:31:  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
tests/unit/vtt/arena-basis-brutal-b.test.ts:40:import { BRUTAL_10_B_SEEDS, BRUTAL_10_SEEDS, R1_10_SEEDS } from '../../../tools/ai-dm-rerun-packet';
tests/unit/vtt/arena-basis-brutal-b.test.ts:45:  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:46:  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:47:  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:48:  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:49:  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:50:  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
tests/unit/vtt/arena-basis-brutal-b.test.ts:51:  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"retains a productive first-turn option\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return \"import { combatantSpace, combatantSpaceAt } from './combat-rules';\\nimport type { EncounterState } from './encounter';\\nimport type { GridCell } from './grid';\\nimport { coverRank, type CoverTier } from './terrain';\\nimport type { CombatantId } from './values';\\nimport type { WorldObject } from './world-objects';\\n\\nfunction cellKey(cell: GridCell): string {\\n  return "'`${String(cell.column)},${String(cell.row)}`;'"\\n}\\n\\nfunction compareCells(left: GridCell, right: GridCell): number {\\n  return left.row - right.row || left.column - right.column;\\n}\\n\\n/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */\\nexport function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));\\n  if (steps <= 1) return [];\\n  const result: GridCell[] = [];\\n  const seen = new Set<string>();\\n  for (let step = 1; step < steps; step += 1) {\\n    const cell = {\\n      column: Math.round(from.column + columnDelta * step / steps),\\n      row: Math.round(from.row + rowDelta * step / steps),\\n    };\\n    const key = cellKey(cell);\\n    if ("'!seen.has(key)) {'"\\n      seen.add(key);\\n      result.push(cell);\\n    }\\n  }\\n  return result;\\n}\\n\\nfunction objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {\\n  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));\\n}\\n\\nexport interface CornerPoint {\\n  readonly column: number;\\n  readonly row: number;\\n}\\n\\n/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */\\nexport function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {\\n  const first = cells[0];\\n  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');\\n  let minimumColumn = first.column;\\n  let maximumColumn = first.column + 1;\\n  let minimumRow = first.row;\\n  let maximumRow = first.row + 1;\\n  for (let index = 1; index < cells.length; index += 1) {\\n    const cell = cells[index];\\n    if (cell === undefined) continue;\\n    minimumColumn = Math.min(minimumColumn, cell.column);\\n    maximumColumn = Math.max(maximumColumn, cell.column + 1);\\n    minimumRow = Math.min(minimumRow, cell.row);\\n    maximumRow = Math.max(maximumRow, cell.row + 1);\\n  }\\n  return [\\n    { column: minimumColumn, row: minimumRow },\\n    { column: maximumColumn, row: minimumRow },\\n    { column: minimumColumn, row: maximumRow },\\n    { column: maximumColumn, row: maximumRow },\\n  ];\\n}\\n\\n/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */\\nexport function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {\\n  const epsilon = 1e-9;\\n  let entry = 0;\\n  let exit = 1;\\n  const columnDelta = to.column - from.column;\\n  const minimumColumn = cell.column + epsilon;\\n  const maximumColumn = cell.column + 1 - epsilon;\\n  if (columnDelta === 0) {\\n    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;\\n  } else {\\n    const first = (minimumColumn - from.column) / columnDelta;\\n    const second = (maximumColumn - from.column) / columnDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  const rowDelta = to.row - from.row;\\n  const minimumRow = cell.row + epsilon;\\n  const maximumRow = cell.row + 1 - epsilon;\\n  if (rowDelta === 0) {\\n    if (from.row <= minimumRow || from.row >= maximumRow) return false;\\n  } else {\\n    const first = (minimumRow - from.row) / rowDelta;\\n    const second = (maximumRow - from.row) / rowDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  return entry <= exit && exit > 0 && entry < 1;\\n}\\n\\nfunction lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;\\n  if (magnitudeSquared === 0) return 0;\\n  return (\\n    (cell.column + 0.5 - from.column) * columnDelta +\\n    (cell.row + 0.5 - from.row) * rowDelta\\n  ) / magnitudeSquared;\\n}\\n\\n/** Rasterizes a corner ray in source-to-target traversal order. */\\nexport function rasterizeCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n): readonly GridCell[] {\\n  const crossed: GridCell[] = [];\\n  for (const cell of candidates) {\\n    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);\\n  }\\n  if (crossed.length > 1) {\\n    crossed.sort((left, right) =>\\n      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));\\n  }\\n  return crossed;\\n}\\n\\nexport interface TerrainLineSource {\\n  readonly kind: 'blocked_cell' | 'world_object' | 'creature';\\n  readonly id: string;\\n  readonly tier: Exclude<CoverTier, 'none'>;\\n}\\n\\nexport interface TerrainCornerLineTrace {\\n  readonly targetCorner: CornerPoint;\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineTrace {\\n  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */\\n  readonly sourceCell: GridCell;\\n  readonly targetCell: GridCell;\\n  readonly sourceCorner: CornerPoint;\\n  readonly lines: readonly TerrainCornerLineTrace[];\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineOptions {\\n  readonly sourceId?: CombatantId;\\n  readonly targetId?: CombatantId;\\n  readonly includeCreatures?: boolean;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nfunction normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {\\n  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]\\n    .sort(compareCells);\\n}\\n\\nfunction sightBlockingSignature(cells: readonly GridCell[]): string {\\n  return cells.map(cellKey).join(';');\\n}\\n\\nfunction taggedSourceId(source: TerrainLineSource): string {\\n  switch (source.kind) {\\n    case 'blocked_cell': return "'`blocked:${source.id}`;'"\\n    case 'world_object': return "'`object:${source.id}`;'"\\n    case 'creature': return "'`creature:${source.id}`;'"\\n  }\\n}\\n\\ninterface TerrainSourceCell {\\n  readonly cell: GridCell;\\n  readonly sources: TerrainLineSource[];\\n}\\n\\nfunction addSource(\\n  sourceCells: Map<string, TerrainSourceCell>,\\n  cell: GridCell,\\n  source: TerrainLineSource,\\n  exclusions: ReadonlySet<string>,\\n): void {\\n  const key = cellKey(cell);\\n  if (exclusions.has(key)) return;\\n  const existing = sourceCells.get(key);\\n  if (existing === undefined) {\\n    sourceCells.set(key, { cell: { ...cell }, sources: [source] });\\n  } else {\\n    existing.sources.push(source);\\n  }\\n}\\n\\ninterface TerrainSourceIndexes {\\n  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;\\n  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;\\n}\\n\\nconst terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();\\nconst terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();\\nconst equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();\\nconst EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;\\n\\nfunction terrainSourceSignature(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  indexedSources: ReadonlyMap<string, TerrainSourceCell>,\\n): string {\\n  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();\\n  const cached = stateSignatures.get(includeCreatures);\\n  if (cached "'!== undefined) return cached;'"\\n  const signature = [...indexedSources].map(([key, entry]) =>\\n    "'`${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join('"',')}"'`)'"\\n    .join('|');\\n  stateSignatures.set(includeCreatures, signature);\\n  if ("'!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);'"\\n  return signature;\\n}\\n\\nfunction retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {\\n  equivalentTerrainLineTraces.set(key, trace);\\n  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;\\n  const oldest = equivalentTerrainLineTraces.keys().next().value;\\n  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);\\n}\\n\\nfunction buildTerrainSourceIndex(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  terrain?: ReadonlyMap<string, TerrainSourceCell>,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined\\n    ? new Map<string, TerrainSourceCell>()\\n    : new Map([...terrain].map(([key, entry]) => [key, {\\n        cell: { ...entry.cell }, sources: [...entry.sources],\\n      }] as const));\\n  const exclusions = new Set<string>();\\n  if (terrain === undefined) {\\n    for (const cell of state.blockedCells) {\\n      addSource(sourceCells, cell, {\\n        kind: 'blocked_cell', id: "'`${String(cell.column)},${String(cell.row)}`, tier: '"'total',\\n      }, exclusions);\\n    }\\n    for (const object of state.worldObjects) {\\n      if (object.blocking.cover === 'none') continue;\\n      for (const cell of object.footprint) {\\n        addSource(sourceCells, cell, {\\n          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,\\n        }, exclusions);\\n      }\\n    }\\n  }\\n  if ("'!includeCreatures) return sourceCells;'"\\n  for (const candidate of state.combatants) {\\n    const id = candidate.profile.id;\\n    if (candidate.life === 'dead') continue;\\n    if ("'!state.tokens.some((token) => token.combatantId === id)) continue;'"\\n    for (const cell of combatantSpace(state, id).cells) {\\n      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);\\n    }\\n  }\\n  return sourceCells;\\n}\\n\\nfunction indexedTerrainSources(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const cached = terrainSourceIndexes.get(state);\\n  if (cached "'!== undefined) {'"\\n    if ("'!includeCreatures) return cached.terrain;'"\\n    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);\\n    cached.withCreatures = withCreatures;\\n    return withCreatures;\\n  }\\n  const terrain = buildTerrainSourceIndex(state, false);\\n  const entry: TerrainSourceIndexes = { terrain };\\n  terrainSourceIndexes.set(state, entry);\\n  if ("'!includeCreatures) return terrain;'"\\n  const withCreatures = buildTerrainSourceIndex(state, true, terrain);\\n  entry.withCreatures = withCreatures;\\n  return withCreatures;\\n}\\n\\nfunction uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {\\n  return sources\\n    .filter((source, index, all) =>\\n      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)\\n    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));\\n}\\n\\ninterface SightBlockingHit {\\n  readonly cell: GridCell;\\n  readonly progress: number;\\n}\\n\\nfunction firstSharedEdgeBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if (from.row === to.row && Number.isInteger(from.row)) {\\n    const direction = from.column < to.column ? 1 : -1;\\n    for (\\n      let column = direction === 1 ? from.column : from.column - 1;\\n      direction === 1 ? column < to.column : column >= to.column;\\n      column += direction\\n    ) {\\n      const upper = { column, row: from.row - 1 };\\n      const lower = { column, row: from.row };\\n      // Deterministic pair choice: the flanking cell with the lower row wins.\\n      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {\\n        const entryColumn = direction === 1 ? column : column + 1;\\n        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };\\n      }\\n    }\\n  }\\n  if (from.column === to.column && Number.isInteger(from.column)) {\\n    const direction = from.row < to.row ? 1 : -1;\\n    for (\\n      let row = direction === 1 ? from.row : from.row - 1;\\n      direction === 1 ? row < to.row : row >= to.row;\\n      row += direction\\n    ) {\\n      const left = { column: from.column - 1, row };\\n      const right = { column: from.column, row };\\n      // Deterministic pair choice: the flanking cell with the lower column wins.\\n      if (sightBlockingAt(left) && sightBlockingAt(right)) {\\n        const entryRow = direction === 1 ? row : row + 1;\\n        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };\\n      }\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction greatestCommonDivisor(left: number, right: number): number {\\n  let dividend = Math.abs(left);\\n  let divisor = Math.abs(right);\\n  while (divisor "'!== 0) {'"\\n    const remainder = dividend % divisor;\\n    dividend = divisor;\\n    divisor = remainder;\\n  }\\n  return dividend;\\n}\\n\\nfunction firstSharedVertexBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if ("'![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;'"\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);\\n  if (latticeSteps <= 1) return null;\\n  const columnStep = columnDelta / latticeSteps;\\n  const rowStep = rowDelta / latticeSteps;\\n  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.\\n  for (let index = 1; index < latticeSteps; index += 1) {\\n    const column = from.column + columnStep * index;\\n    const row = from.row + rowStep * index;\\n    const topLeft = { column: column - 1, row: row - 1 };\\n    const topRight = { column, row: row - 1 };\\n    // Check TL/BR first so lower row then lower column wins when both pairs seal.\\n    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {\\n      return { cell: topLeft, progress: index / latticeSteps };\\n    }\\n    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {\\n      return { cell: topRight, progress: index / latticeSteps };\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  let entry = 0;\\n  const columnDelta = to.column - from.column;\\n  if (columnDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.column - from.column) / columnDelta,\\n      (cell.column + 1 - from.column) / columnDelta,\\n    ));\\n  }\\n  const rowDelta = to.row - from.row;\\n  if (rowDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.row - from.row) / rowDelta,\\n      (cell.row + 1 - from.row) / rowDelta,\\n    ));\\n  }\\n  return entry;\\n}\\n\\nfunction firstSightBlockingCell(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  interveningCells: readonly GridCell[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): GridCell | null {\\n  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);\\n  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);\\n  if (vertex "'!== null && (first === null || vertex.progress < first.progress ||'"\\n    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;\\n  for (const cell of interveningCells) {\\n    if ("'!sightBlockingAt(cell)) continue;'"\\n    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };\\n    if (first === null || hit.progress < first.progress ||\\n      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;\\n  }\\n  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.\\n  // Simultaneous events use lower row, then lower column.\\n  return first === null ? null : { ...first.cell };\\n}\\n\\nfunction traceCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): TerrainCornerLineTrace {\\n  const interveningCells = rasterizeCornerLine(from, to, candidates);\\n  let tier: CoverTier = 'none';\\n  let strongest: TerrainLineSource[] = [];\\n  const firstBlockingCell = firstSightBlockingCell(\\n    from,\\n    to,\\n    interveningCells,\\n    sightBlockingAt,\\n  );\\n  for (const cell of interveningCells) {\\n    for (const source of sourcesAt(cell)) {\\n      const comparison = coverRank(source.tier) - coverRank(tier);\\n      if (comparison > 0) {\\n        tier = source.tier;\\n        strongest = [source];\\n      } else if (comparison === 0) {\\n        strongest.push(source);\\n      }\\n    }\\n  }\\n  const sources = uniqueSources(strongest);\\n  return {\\n    targetCorner: { ...to },\\n    interveningCells,\\n    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell,\\n  };\\n}\\n\\nconst COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];\\n\\nfunction countTier(obstructedLineCount: number): CoverTier {\\n  if (obstructedLineCount === 0) return 'none';\\n  if (obstructedLineCount <= 2) return 'half';\\n  if (obstructedLineCount === 3) return 'three_quarters';\\n  return 'total';\\n}\\n\\nfunction aggregateCornerLines(\\n  sourceCorner: CornerPoint,\\n  lines: readonly TerrainCornerLineTrace[],\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n): TerrainLineTrace {\\n  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);\\n  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');\\n  const obstructed = lines.filter((line) => line.tier "'!== '"'none');\\n  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>\\n    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');\\n  const tier = physicalBlocksCover\\n    ? 'total'\\n    : COVER_TIER_BY_RANK[Math.min(\\n        coverRank(countTier(obstructed.length)),\\n        coverRank(strongestLineTier),\\n        coverRank('three_quarters'),\\n      )] ?? 'none';\\n  const sources = tier === 'none'\\n    ? []\\n    : uniqueSources(obstructed\\n        .filter((line) => line.tier === strongestLineTier)\\n        .flatMap((line) => line.sources));\\n  const interveningCells = [...new Map(lines\\n    .flatMap((line) => line.interveningCells)\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;\\n  return {\\n    sourceCell: { ...sourceCell },\\n    targetCell: { ...targetCell },\\n    sourceCorner: { ...sourceCorner },\\n    lines,\\n    interveningCells,\\n    tier,\\n    blocksSight,\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,\\n  };\\n}\\n\\nfunction comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return coverRank(left.tier) - coverRank(right.tier) ||\\n    left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction nearestCells(\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {\\n  const sources = [...sourceCells].sort(compareCells);\\n  const targets = [...targetCells].sort(compareCells);\\n  const firstSource = sources[0];\\n  const firstTarget = targets[0];\\n  if (firstSource === undefined || firstTarget === undefined) {\\n    throw new RangeError('A line query requires non-empty source and target spaces.');\\n  }\\n  let selectedSource = firstSource;\\n  let selectedTarget = firstTarget;\\n  let selectedDistance = Number.POSITIVE_INFINITY;\\n  for (const sourceCell of sources) {\\n    for (const targetCell of targets) {\\n      const distance = Math.max(\\n        Math.abs(sourceCell.column - targetCell.column),\\n        Math.abs(sourceCell.row - targetCell.row),\\n      );\\n      if (distance < selectedDistance) {\\n        selectedSource = sourceCell;\\n        selectedTarget = targetCell;\\n        selectedDistance = distance;\\n      }\\n    }\\n  }\\n  return { sourceCell: selectedSource, targetCell: selectedTarget };\\n}\\n\\nfunction traceSpaces(\\n  state: EncounterState,\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n  options: TerrainLineOptions,\\n): TerrainLineTrace {\\n  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);\\n  const blockerSignature = sightBlockingSignature(sightBlockingCells);\\n  const traceKey = "'`${options.includeCreatures === true ? '"'creatures' : 'terrain'}:"'${sourceCells'"\\n    .map(cellKey).join(';')}->"'${targetCells.map(cellKey).join('"';')}#sight:"'${blockerSignature}`;'"\\n  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  const cached = stateTraces.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  if ("'!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);'"\\n  const nearest = nearestCells(sourceCells, targetCells);\\n  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));\\n  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);\\n  const equivalentTraceKey = "'`${terrainSourceSignature('"\\n    state,\\n    options.includeCreatures === true,\\n    indexedSources,\\n  )}\\\\0"'${traceKey}`;'"\\n  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);\\n  if (equivalent "'!== undefined) {'"\\n    stateTraces.set(traceKey, equivalent);\\n    return equivalent;\\n  }\\n  const sourceCorners = outerCorners(sourceCells);\\n  const targetCorners = outerCorners(targetCells);\\n  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);\\n  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);\\n  const minimumColumn = Math.min(...cornerColumns);\\n  const maximumColumn = Math.max(...cornerColumns);\\n  const minimumRow = Math.min(...cornerRows);\\n  const maximumRow = Math.max(...cornerRows);\\n  const candidateEntries = sightBlockingCells.length === 0\\n    ? [...indexedSources.values()]\\n    : [...new Map([\\n        ...indexedSources.values(),\\n        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),\\n      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];\\n  const candidates = candidateEntries\\n    .filter((entry) => "'!exclusions.has(cellKey(entry.cell)) &&'"\\n      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&\\n      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)\\n    .map((entry) => entry.cell);\\n  const sightBlockingKeys = new Set([\\n    ...sightBlockingCells.map(cellKey),\\n    ...[...indexedSources]\\n      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))\\n      .map(([key]) => key),\\n  ]);\\n  const sightBlockingAt = (cell: GridCell): boolean => {\\n    const key = cellKey(cell);\\n    return "'!exclusions.has(key) && sightBlockingKeys.has(key);'"\\n  };\\n  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],\\n      sightBlockingAt,\\n    )),\\n    nearest.sourceCell,\\n    nearest.targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  const physicalSelected = traces.reduce(\\n    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,\\n    first,\\n  );\\n  const blocksSight = traces.every((trace) => trace.blocksSight);\\n  const opticalSelected = blocksSight\\n    ? traces.reduce(\\n        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,\\n        first,\\n      )\\n    : null;\\n  const selected: TerrainLineTrace = {\\n    ...physicalSelected,\\n    blocksSight,\\n    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,\\n  };\\n  stateTraces.set(traceKey, selected);\\n  retainEquivalentTrace(equivalentTraceKey, selected);\\n  return selected;\\n}\\n\\n/** The canonical 2014 corner-to-corner trace for two bare grid cells. */\\nexport function traceTerrainLine(\\n  state: EncounterState,\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n  options: TerrainLineOptions = {},\\n): TerrainLineTrace {\\n  return traceSpaces(state, [sourceCell], [targetCell], options);\\n}\\n\\nexport interface CreatureLineOptions {\\n  readonly sourceAnchor?: GridCell;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nexport function traceCombatantLine(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const traceKey = "'`${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined'"\\n    ? 'current'\\n    : cellKey(options.sourceAnchor)}#sight:"'${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {\\n    sourceId,\\n    targetId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function traceCombatantLineToCells(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetCells: readonly GridCell[],\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const targetSignature = targetCells.map(cellKey).join(';');\\n  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);\\n  const traceKey = "'`${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, targetCells, {\\n    sourceId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function coverTierBetweenObjects(\\n  objects: readonly WorldObject[],\\n  from: GridCell,\\n  to: GridCell,\\n): CoverTier {\\n  const exclusions = new Set([cellKey(from), cellKey(to)]);\\n  const candidates = [...new Map(objects\\n    .flatMap((object) => object.footprint)\\n    .filter((cell) => "'!exclusions.has(cellKey(cell)))'"\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const sourceCell = { ...from };\\n  const targetCell = { ...to };\\n  const targetCorners = outerCorners([to]);\\n  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>\\n    objects.flatMap((object): readonly TerrainLineSource[] =>\\n      objectOccupiesCell(object, cell) && object.blocking.cover "'!== '"'none'\\n        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]\\n        : []);\\n  const sightBlockingAt = (cell: GridCell): boolean =>\\n    "'!exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === '"'total');\\n  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      sourcesAt,\\n      sightBlockingAt,\\n    )),\\n    sourceCell,\\n    targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  return traces.reduce((best, candidate) =>\\n    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;\\n}\\n\\nexport type CreatureCoverOptions = CreatureLineOptions;\\n\\nexport interface CombatantCoverResult {\\n  readonly tier: CoverTier;\\n  readonly sourceIds: readonly string[];\\n}\\n\\nexport function coverBetweenCombatants(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureCoverOptions = {},\\n): CombatantCoverResult {\\n  const trace = traceCombatantLine(state, sourceId, targetId, options);\\n  return { tier: trace.tier, sourceIds: trace.sourceIds };\\n}\\n\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"PHYSICAL_COVER_UNCHANGED_BY_VERTEX\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return code.replace('    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"','    tier: firstBlockingCell "'!== null ? "total" : tier,'"\\n    blocksSight: firstBlockingCell "'!== null,'"');}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 exited 1 in 2756ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/combat/visibility-field.test.ts (54 tests | 1 failed | 53 skipped) 14ms
     ↓ DIM_LIGHT_RAW_GRADES keeps dim visible and darkness unseen for normal sight
     ↓ LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
     ↓ DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
     ↓ LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE
     ↓ UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN
     ↓ WALL_BLOCKS_TARGET_CELL using the existing corner tracer
     ↓ FOG_CLOUD_BLOCKS_BEYOND_TARGET through a concrete obscured-area effect
     ↓ MAGICAL_DARKNESS_SENSE_MATRIX distinguishes normal, darkvision, Devil's Sight, and truesight
     ↓ HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays
     ↓ SPECIAL_SENSE_RANGE_EDGES checks darkvision 60/65 and Devil's Sight 120/125 feet
     ↓ LARGE_OBSERVER_USES_BEST_CELL for range and target-cell tracing
     ↓ BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog
     ↓ BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE
     ↓ BLINDED_TREMORSENSE_REMAINS_LOCATED
     ↓ ANY_FOOTPRINT_CELL_VISIBLE makes a Large subject visible
     ↓ INVISIBLE_SUBJECT_RETAINS_TRANSPOSE_ELIGIBILITY
     ↓ DETECT_FIELD_ALL_PAIRS_AGREE on every ordered overlay-free fixture pair
     ↓ ALLY_CAST_DARKVISION_APPLIES and SENSE_EFFECT_MAX_RANGE_WINS
     ↓ SENSE_EFFECT_MERGE_IS_ORDER_INDEPENDENT for two darkvision grants
     ↓ INNATE_SENSE_NOT_SHORTENED_BY_EFFECT
     ↓ DEVILS_SIGHT_EFFECT_MERGE_IS_ORDER_INDEPENDENT
     ↓ ALWAYS_ON_DEVILS_SIGHT_FIXTURE_PC initializes a permanent 120-foot grant
     ↓ CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT and keeps the prior state unchanged
     ↓ CACHE_IS_STATE_SCOPED_AFTER_LIGHT_CHANGE
     ↓ CACHE_IS_STATE_SCOPED_AFTER_OBSCUREMENT_END
     ↓ CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL
     ↓ SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS
     ↓ SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR
     ↓ SEAM_BLOCKED_CELL_PAIR
     ↓ DIAGONAL_CRACK_SEALED
     ↓ DIAGONAL_CRACK_CONTROL_ONE_BLOCKER
     ↓ SOURCE_ENDPOINT_JUNCTION_SEALED
     ↓ TARGET_ENDPOINT_JUNCTION_SEALED
     ↓ SAME_SIDE_ENDPOINT_GRAZE_CLEAR
     ↓ ADJACENT_CORNER_ZERO_LENGTH
     ↓ ADJACENT_CORNER_AGGREGATE_BLOCKED
     ↓ EDGE_ARRIVAL_AT_JUNCTION_BLOCKED
     ↓ OWN_EDGE_DEPARTURE_CLEAR
     ↓ FAR_FACE_DEPARTURE_BLOCKED
     ↓ STAIRCASE_WALL_SEALED
     ↓ STAIRCASE_MIRRORED_SEALED
     ↓ VERTICAL_STEP_SEALED
     ↓ STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR
     ↓ OUTER_FACE_GRAZE_STILL_CLEAR
     ↓ SOLID_2x2_BLOCK
     ↓ DIAGONAL_CORNER_TOUCH_SEALED_D642
     × PHYSICAL_COVER_UNCHANGED_BY_VERTEX 13ms
     ↓ PHYSICAL_COVER_UNCHANGED_BY_SEAM
     ↓ EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint
     ↓ SIGHT_ONLY_BLOCKER_PRESERVES_COVER even when fog flips the preferred optical corner
     ↓ PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR
     ↓ UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING
     ↓ SIGHT_TRACER_HAS_SINGLE_OWNER at the final migration stage
     ↓ PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > PHYSICAL_COVER_UNCHANGED_BY_VERTEX
AssertionError: expected 'total' to be 'half' // Object.is equality

Expected: "half"
Received: "total"

 ❯ tests/unit/combat/visibility-field.test.ts:1436:24
    1434|
    1435|     // Pre-D642 physical pin: interior crossings obstruct two target-c…
    1436|     expect(trace.tier).toBe('half');
       |                        ^
    1437|
    1438|     const endpointState = fieldState(actor, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 53 skipped (54)
   Start at  00:09:00
   Duration  2.65s (transform 1.01s, setup 0ms, import 2.56s, tests 14ms, environment 0ms)


 exited 1 in 8755ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/vtt/room-generator-los-cover.test.ts (112 tests | 1 failed | 111 skipped) 5649ms
     ↓ OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
     ↓ generated and authored arena fixtures share one strict decoder
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
     ↓ kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
     ↓ kills M576-E2-WALL-SEALS-ROOM for every living footprint size
     × retains a productive first-turn option for every living monster in the versioned basis 5648ms
     ↓ kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
     ↓ kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

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
   Start at  00:08:59
   Duration  8.62s (transform 1.24s, setup 0ms, import 2.89s, tests 5.65s, environment 0ms)


exec
/bin/bash -lc "rg -n 'generateRoom\\(|const families|const cases|const seeds' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r4-sol.md | tail -12; sed -n '105,145p' tests/unit/vtt/arena-basis-brutal-b.test.ts; sed -n '1,42p' tests/unit/vtt/room-generator-los-cover.test.ts; rg -n 'export function generateRoom|export interface Generated' src/vtt/room-generator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
74474:+  const room = difficulty === 'standard' ? generateRoom(seed) : generateRoom(seed, { difficulty });
74952:+const families = [
75000:+const cases = [
75020:+  const room = difficulty === 'standard' ? generateRoom(seed) : generateRoom(seed, { difficulty });
75592:    330|       const room = generateRoom(fixture.seed, {
75605:    344|       expectProductiveMonsters(generateRoom(fixture.seed, {
75634:+const families = [
75682:+const cases = [
75702:+  const room = difficulty === 'standard' ? generateRoom(seed) : generateRoom(seed, { difficulty });
76246:+const families = [
76294:+const cases = [
76314:+  const room = difficulty === 'standard' ? generateRoom(seed) : generateRoom(seed, { difficulty });
  6_206_007: '1c4c337148afad9aff2a86143bb3156cc446ffabd2ccc8cc29eb004d83034bd9',
  6_206_008: '11a065b490f6e68effaddb0e919b9f9f9f7ae300f19a97f3359d3d4c86658a32',
  6_206_009: '19808aca9fb3ca7e4a77b6222cfae31c4f69a16b9b74ecc0706cb1eee58d4f5e',
  6_206_010: 'a9efe78460c66972d09c6efd1c7cc04409ba6fff5a0028657d2442a0ec2fbc83',
} as const satisfies Readonly<Record<(typeof BRUTAL_10_B_SEEDS)[number], string>>;

const inputs = declareTestInputs({ fixtures: EXECUTION_FIXTURE_PATHS });
const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});
const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);

type RoundExecutionResult =
  | { readonly seed: number; readonly outcome: 'executed'; readonly state: EncounterState }
  | {
      readonly seed: number;
      readonly outcome: 'execution_failed';
      readonly error: string;
      readonly state: EncounterState;
    };

function livingMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living'
      ? [combatant.profile.id]
      : []);
}

function maximalMonsterSegment(state: EncounterState): readonly CombatantId[] {
  if (state.activeInitiativeIndex === null) return [];
  const actors: CombatantId[] = [];
  for (let index = state.activeInitiativeIndex; index < state.initiative.length; index += 1) {
    const initiative = state.initiative[index];
    if (initiative === undefined) throw new Error('Execution invariant encountered a missing initiative entry.');
    const combatant = state.combatants.find((candidate) => candidate.profile.id === initiative.combatant);
    if (combatant === undefined) throw new Error(`Execution invariant cannot find ${initiative.combatant}.`);
    if (combatant.life === 'dead') continue;
    if (combatant.profile.kind === 'player_character') break;
    actors.push(combatant.profile.id);
  }
import { describe, expect, it } from 'vitest';
import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
import { createEncounter } from '../../../src/combat/encounter';
import {
  traceCombatantLine,
  traceCombatantLineToCells,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { isCellInside, type GridCell } from '../../../src/combat/grid';
import { findPath } from '../../../src/combat/movement';
import { terrainBlocking, type CoverTier } from '../../../src/combat/terrain';
import { feet, type CombatantId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import {
  generatedLineIsOpen,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const FIXTURE_CASES = [
  { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
  { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
  { difficulty: 'standard', seed: 5_762_003, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json' },
  { difficulty: 'hard', seed: 5_762_101, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json' },
  { difficulty: 'hard', seed: 5_762_102, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json' },
  { difficulty: 'hard', seed: 5_762_103, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json' },
  { difficulty: 'brutal', seed: 5_762_201, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json' },
  { difficulty: 'brutal', seed: 5_762_202, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json' },
  { difficulty: 'brutal', seed: 5_762_203, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json' },
] as const satisfies readonly {
202:export interface GeneratedRoom {
1426:export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"retains a productive first-turn option\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "sed -n '76235,76328p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r4-sol.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
+import { resolve } from 'node:path';
+import { decodeArenaFixtureText } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint';
+import {
+  availableEngineActorOptions,
+  resolveEngineActorOption,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/intent-resolver';
+import { freshMonsterPlanningState } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/offers/build-offer-environment';
+
+const root = '/home/vagrant/PhpstormProjects/dnd-wt-vis-field';
+const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const families = [
+  { label: 'hard', directory: 'arena-basis-hard', prefix: '5117', first: 1, last: 13 },
+  { label: 'brutal', directory: 'arena-basis-brutal', prefix: '6203', first: 1, last: 10 },
+  { label: 'brutal-b', directory: 'arena-basis-brutal-b', prefix: '6206', first: 1, last: 10 },
+  { label: 'brutal-2', directory: 'arena-basis-brutal-2', prefix: '6207', first: 1, last: 10 },
+] as const;
+
+for (const family of families) {
+  let monsters = 0;
+  let offers = 0;
+  let shotless = 0;
+  for (let suffix = family.first; suffix <= family.last; suffix += 1) {
+    const seed = `${family.prefix}${String(suffix).padStart(3, '0')}`;
+    const path = resolve(root, 'tests/fixtures', family.directory, `seed-${seed}.json`);
+    const state = freshMonsterPlanningState(decodeArenaFixtureText(readFileSync(path, 'utf8')));
+    const living = state.combatants.filter((combatant) =>
+      combatant.profile.kind === 'monster' && combatant.life === 'living');
+    monsters += living.length;
+    for (const monster of living) {
+      let hasAttack = false;
+      for (const option of availableEngineActorOptions(
+        state,
+        monster.profile.id,
+        offerEnvironment,
+        state.revision,
+      )) {
+        const resolution = resolveEngineActorOption(state, option, offerEnvironment);
+        if (!resolution.valid) throw new Error(`${path}: unresolved ${option.optionId}`);
+        const hasAttackOrSave = resolution.mechanics.actionSlots.some((use) =>
+          use.kind === 'attack' || use.kind === 'saving_throw');
+        if (hasAttackOrSave) offers += 1;
+        if (resolution.mechanics.actionSlots.some((use) => use.kind === 'attack')) hasAttack = true;
+      }
+      if (!hasAttack) shotless += 1;
+    }
+  }
+  console.log(JSON.stringify({ family: family.label, monsters, offers, shotless }));
+}
diff --git a//tmp/wall01-r4-generation.ts b//tmp/wall01-r4-generation.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cf9918a28b3a2e76450b0b0ff2d8e9f0d19aa03a
--- /dev/null
+++ b//tmp/wall01-r4-generation.ts
@@ -0,0 +1,28 @@
+import { canonicalJson } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/commands/canonical-json';
+import { sha256 } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/crypto/sha256';
+import { generateRoom } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator';
+
+const cases = [
+  ...Array.from({ length: 12 }, (_unused, index) => ({
+    seed: 3_943_001 + index,
+    difficulty: 'standard' as const,
+  })),
+  ...Array.from({ length: 10 }, (_unused, index) => ({
+    seed: 5_117_001 + index,
+    difficulty: 'hard' as const,
+  })),
+  ...Array.from({ length: 10 }, (_unused, index) => ({
+    seed: 6_203_001 + index,
+    difficulty: 'brutal' as const,
+  })),
+  ...Array.from({ length: 10 }, (_unused, index) => ({
+    seed: 6_206_001 + index,
+    difficulty: 'brutal' as const,
+  })),
+];
+
+const rows = cases.map(({ seed, difficulty }) => {
+  const room = difficulty === 'standard' ? generateRoom(seed) : generateRoom(seed, { difficulty });
+  return { seed, difficulty, sha256: sha256(canonicalJson(room)) };
+});
+console.log(JSON.stringify({ count: rows.length, aggregateSha256: sha256(canonicalJson(rows)), rows }));
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index 52e68ffc1b23938398d59547238db0337374aca0..73a8b753accdc2eadb36cdea432cebfebb6c4806
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -44,6 +44,22 @@
   readonly row: number;
 }
 
+type QuadrantDirection = -1 | 1;
+
+interface CornerQuadrant {

 exited 1 in 8885ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/vtt/room-generator-los-cover.test.ts (112 tests | 1 failed | 111 skipped) 5853ms
     ↓ OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
     ↓ generated and authored arena fixtures share one strict decoder
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
     ↓ kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
     ↓ kills M576-E2-WALL-SEALS-ROOM for every living footprint size
     × retains a productive first-turn option for every living monster in the versioned basis 5852ms
     ↓ kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
     ↓ kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

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
   Start at  00:09:11
   Duration  8.76s (transform 1.21s, setup 0ms, import 2.82s, tests 5.85s, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_GENERATION_AND_COUNTS\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return \"import { combatantSpace, combatantSpaceAt } from './combat-rules';\\nimport type { EncounterState } from './encounter';\\nimport type { GridCell } from './grid';\\nimport { coverRank, type CoverTier } from './terrain';\\nimport type { CombatantId } from './values';\\nimport type { WorldObject } from './world-objects';\\n\\nfunction cellKey(cell: GridCell): string {\\n  return "'`${String(cell.column)},${String(cell.row)}`;'"\\n}\\n\\nfunction compareCells(left: GridCell, right: GridCell): number {\\n  return left.row - right.row || left.column - right.column;\\n}\\n\\n/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */\\nexport function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));\\n  if (steps <= 1) return [];\\n  const result: GridCell[] = [];\\n  const seen = new Set<string>();\\n  for (let step = 1; step < steps; step += 1) {\\n    const cell = {\\n      column: Math.round(from.column + columnDelta * step / steps),\\n      row: Math.round(from.row + rowDelta * step / steps),\\n    };\\n    const key = cellKey(cell);\\n    if ("'!seen.has(key)) {'"\\n      seen.add(key);\\n      result.push(cell);\\n    }\\n  }\\n  return result;\\n}\\n\\nfunction objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {\\n  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));\\n}\\n\\nexport interface CornerPoint {\\n  readonly column: number;\\n  readonly row: number;\\n}\\n\\n/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */\\nexport function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {\\n  const first = cells[0];\\n  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');\\n  let minimumColumn = first.column;\\n  let maximumColumn = first.column + 1;\\n  let minimumRow = first.row;\\n  let maximumRow = first.row + 1;\\n  for (let index = 1; index < cells.length; index += 1) {\\n    const cell = cells[index];\\n    if (cell === undefined) continue;\\n    minimumColumn = Math.min(minimumColumn, cell.column);\\n    maximumColumn = Math.max(maximumColumn, cell.column + 1);\\n    minimumRow = Math.min(minimumRow, cell.row);\\n    maximumRow = Math.max(maximumRow, cell.row + 1);\\n  }\\n  return [\\n    { column: minimumColumn, row: minimumRow },\\n    { column: maximumColumn, row: minimumRow },\\n    { column: minimumColumn, row: maximumRow },\\n    { column: maximumColumn, row: maximumRow },\\n  ];\\n}\\n\\n/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */\\nexport function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {\\n  const epsilon = 1e-9;\\n  let entry = 0;\\n  let exit = 1;\\n  const columnDelta = to.column - from.column;\\n  const minimumColumn = cell.column + epsilon;\\n  const maximumColumn = cell.column + 1 - epsilon;\\n  if (columnDelta === 0) {\\n    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;\\n  } else {\\n    const first = (minimumColumn - from.column) / columnDelta;\\n    const second = (maximumColumn - from.column) / columnDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  const rowDelta = to.row - from.row;\\n  const minimumRow = cell.row + epsilon;\\n  const maximumRow = cell.row + 1 - epsilon;\\n  if (rowDelta === 0) {\\n    if (from.row <= minimumRow || from.row >= maximumRow) return false;\\n  } else {\\n    const first = (minimumRow - from.row) / rowDelta;\\n    const second = (maximumRow - from.row) / rowDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  return entry <= exit && exit > 0 && entry < 1;\\n}\\n\\nfunction lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;\\n  if (magnitudeSquared === 0) return 0;\\n  return (\\n    (cell.column + 0.5 - from.column) * columnDelta +\\n    (cell.row + 0.5 - from.row) * rowDelta\\n  ) / magnitudeSquared;\\n}\\n\\n/** Rasterizes a corner ray in source-to-target traversal order. */\\nexport function rasterizeCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n): readonly GridCell[] {\\n  const crossed: GridCell[] = [];\\n  for (const cell of candidates) {\\n    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);\\n  }\\n  if (crossed.length > 1) {\\n    crossed.sort((left, right) =>\\n      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));\\n  }\\n  return crossed;\\n}\\n\\nexport interface TerrainLineSource {\\n  readonly kind: 'blocked_cell' | 'world_object' | 'creature';\\n  readonly id: string;\\n  readonly tier: Exclude<CoverTier, 'none'>;\\n}\\n\\nexport interface TerrainCornerLineTrace {\\n  readonly targetCorner: CornerPoint;\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineTrace {\\n  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */\\n  readonly sourceCell: GridCell;\\n  readonly targetCell: GridCell;\\n  readonly sourceCorner: CornerPoint;\\n  readonly lines: readonly TerrainCornerLineTrace[];\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineOptions {\\n  readonly sourceId?: CombatantId;\\n  readonly targetId?: CombatantId;\\n  readonly includeCreatures?: boolean;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nfunction normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {\\n  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]\\n    .sort(compareCells);\\n}\\n\\nfunction sightBlockingSignature(cells: readonly GridCell[]): string {\\n  return cells.map(cellKey).join(';');\\n}\\n\\nfunction taggedSourceId(source: TerrainLineSource): string {\\n  switch (source.kind) {\\n    case 'blocked_cell': return "'`blocked:${source.id}`;'"\\n    case 'world_object': return "'`object:${source.id}`;'"\\n    case 'creature': return "'`creature:${source.id}`;'"\\n  }\\n}\\n\\ninterface TerrainSourceCell {\\n  readonly cell: GridCell;\\n  readonly sources: TerrainLineSource[];\\n}\\n\\nfunction addSource(\\n  sourceCells: Map<string, TerrainSourceCell>,\\n  cell: GridCell,\\n  source: TerrainLineSource,\\n  exclusions: ReadonlySet<string>,\\n): void {\\n  const key = cellKey(cell);\\n  if (exclusions.has(key)) return;\\n  const existing = sourceCells.get(key);\\n  if (existing === undefined) {\\n    sourceCells.set(key, { cell: { ...cell }, sources: [source] });\\n  } else {\\n    existing.sources.push(source);\\n  }\\n}\\n\\ninterface TerrainSourceIndexes {\\n  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;\\n  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;\\n}\\n\\nconst terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();\\nconst terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();\\nconst equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();\\nconst EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;\\n\\nfunction terrainSourceSignature(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  indexedSources: ReadonlyMap<string, TerrainSourceCell>,\\n): string {\\n  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();\\n  const cached = stateSignatures.get(includeCreatures);\\n  if (cached "'!== undefined) return cached;'"\\n  const signature = [...indexedSources].map(([key, entry]) =>\\n    "'`${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join('"',')}"'`)'"\\n    .join('|');\\n  stateSignatures.set(includeCreatures, signature);\\n  if ("'!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);'"\\n  return signature;\\n}\\n\\nfunction retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {\\n  equivalentTerrainLineTraces.set(key, trace);\\n  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;\\n  const oldest = equivalentTerrainLineTraces.keys().next().value;\\n  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);\\n}\\n\\nfunction buildTerrainSourceIndex(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  terrain?: ReadonlyMap<string, TerrainSourceCell>,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined\\n    ? new Map<string, TerrainSourceCell>()\\n    : new Map([...terrain].map(([key, entry]) => [key, {\\n        cell: { ...entry.cell }, sources: [...entry.sources],\\n      }] as const));\\n  const exclusions = new Set<string>();\\n  if (terrain === undefined) {\\n    for (const cell of state.blockedCells) {\\n      addSource(sourceCells, cell, {\\n        kind: 'blocked_cell', id: "'`${String(cell.column)},${String(cell.row)}`, tier: '"'total',\\n      }, exclusions);\\n    }\\n    for (const object of state.worldObjects) {\\n      if (object.blocking.cover === 'none') continue;\\n      for (const cell of object.footprint) {\\n        addSource(sourceCells, cell, {\\n          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,\\n        }, exclusions);\\n      }\\n    }\\n  }\\n  if ("'!includeCreatures) return sourceCells;'"\\n  for (const candidate of state.combatants) {\\n    const id = candidate.profile.id;\\n    if (candidate.life === 'dead') continue;\\n    if ("'!state.tokens.some((token) => token.combatantId === id)) continue;'"\\n    for (const cell of combatantSpace(state, id).cells) {\\n      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);\\n    }\\n  }\\n  return sourceCells;\\n}\\n\\nfunction indexedTerrainSources(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const cached = terrainSourceIndexes.get(state);\\n  if (cached "'!== undefined) {'"\\n    if ("'!includeCreatures) return cached.terrain;'"\\n    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);\\n    cached.withCreatures = withCreatures;\\n    return withCreatures;\\n  }\\n  const terrain = buildTerrainSourceIndex(state, false);\\n  const entry: TerrainSourceIndexes = { terrain };\\n  terrainSourceIndexes.set(state, entry);\\n  if ("'!includeCreatures) return terrain;'"\\n  const withCreatures = buildTerrainSourceIndex(state, true, terrain);\\n  entry.withCreatures = withCreatures;\\n  return withCreatures;\\n}\\n\\nfunction uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {\\n  return sources\\n    .filter((source, index, all) =>\\n      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)\\n    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));\\n}\\n\\ninterface SightBlockingHit {\\n  readonly cell: GridCell;\\n  readonly progress: number;\\n}\\n\\nfunction firstSharedEdgeBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if (from.row === to.row && Number.isInteger(from.row)) {\\n    const direction = from.column < to.column ? 1 : -1;\\n    for (\\n      let column = direction === 1 ? from.column : from.column - 1;\\n      direction === 1 ? column < to.column : column >= to.column;\\n      column += direction\\n    ) {\\n      const upper = { column, row: from.row - 1 };\\n      const lower = { column, row: from.row };\\n      // Deterministic pair choice: the flanking cell with the lower row wins.\\n      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {\\n        const entryColumn = direction === 1 ? column : column + 1;\\n        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };\\n      }\\n    }\\n  }\\n  if (from.column === to.column && Number.isInteger(from.column)) {\\n    const direction = from.row < to.row ? 1 : -1;\\n    for (\\n      let row = direction === 1 ? from.row : from.row - 1;\\n      direction === 1 ? row < to.row : row >= to.row;\\n      row += direction\\n    ) {\\n      const left = { column: from.column - 1, row };\\n      const right = { column: from.column, row };\\n      // Deterministic pair choice: the flanking cell with the lower column wins.\\n      if (sightBlockingAt(left) && sightBlockingAt(right)) {\\n        const entryRow = direction === 1 ? row : row + 1;\\n        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };\\n      }\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction greatestCommonDivisor(left: number, right: number): number {\\n  let dividend = Math.abs(left);\\n  let divisor = Math.abs(right);\\n  while (divisor "'!== 0) {'"\\n    const remainder = dividend % divisor;\\n    dividend = divisor;\\n    divisor = remainder;\\n  }\\n  return dividend;\\n}\\n\\nfunction firstSharedVertexBlockingHit(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): SightBlockingHit | null {\\n  if ("'![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;'"\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);\\n  if (latticeSteps <= 1) return null;\\n  const columnStep = columnDelta / latticeSteps;\\n  const rowStep = rowDelta / latticeSteps;\\n  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.\\n  for (let index = 1; index < latticeSteps; index += 1) {\\n    const column = from.column + columnStep * index;\\n    const row = from.row + rowStep * index;\\n    const topLeft = { column: column - 1, row: row - 1 };\\n    const topRight = { column, row: row - 1 };\\n    // Check TL/BR first so lower row then lower column wins when both pairs seal.\\n    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {\\n      return { cell: topLeft, progress: index / latticeSteps };\\n    }\\n    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {\\n      return { cell: topRight, progress: index / latticeSteps };\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  let entry = 0;\\n  const columnDelta = to.column - from.column;\\n  if (columnDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.column - from.column) / columnDelta,\\n      (cell.column + 1 - from.column) / columnDelta,\\n    ));\\n  }\\n  const rowDelta = to.row - from.row;\\n  if (rowDelta "'!== 0) {'"\\n    entry = Math.max(entry, Math.min(\\n      (cell.row - from.row) / rowDelta,\\n      (cell.row + 1 - from.row) / rowDelta,\\n    ));\\n  }\\n  return entry;\\n}\\n\\nfunction firstSightBlockingCell(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  interveningCells: readonly GridCell[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): GridCell | null {\\n  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);\\n  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);\\n  if (vertex "'!== null && (first === null || vertex.progress < first.progress ||'"\\n    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;\\n  for (const cell of interveningCells) {\\n    if ("'!sightBlockingAt(cell)) continue;'"\\n    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };\\n    if (first === null || hit.progress < first.progress ||\\n      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;\\n  }\\n  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.\\n  // Simultaneous events use lower row, then lower column.\\n  return first === null ? null : { ...first.cell };\\n}\\n\\nfunction traceCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): TerrainCornerLineTrace {\\n  const interveningCells = rasterizeCornerLine(from, to, candidates);\\n  let tier: CoverTier = 'none';\\n  let strongest: TerrainLineSource[] = [];\\n  const firstBlockingCell = firstSightBlockingCell(\\n    from,\\n    to,\\n    interveningCells,\\n    sightBlockingAt,\\n  );\\n  for (const cell of interveningCells) {\\n    for (const source of sourcesAt(cell)) {\\n      const comparison = coverRank(source.tier) - coverRank(tier);\\n      if (comparison > 0) {\\n        tier = source.tier;\\n        strongest = [source];\\n      } else if (comparison === 0) {\\n        strongest.push(source);\\n      }\\n    }\\n  }\\n  const sources = uniqueSources(strongest);\\n  return {\\n    targetCorner: { ...to },\\n    interveningCells,\\n    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell,\\n  };\\n}\\n\\nconst COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];\\n\\nfunction countTier(obstructedLineCount: number): CoverTier {\\n  if (obstructedLineCount === 0) return 'none';\\n  if (obstructedLineCount <= 2) return 'half';\\n  if (obstructedLineCount === 3) return 'three_quarters';\\n  return 'total';\\n}\\n\\nfunction aggregateCornerLines(\\n  sourceCorner: CornerPoint,\\n  lines: readonly TerrainCornerLineTrace[],\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n): TerrainLineTrace {\\n  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);\\n  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');\\n  const obstructed = lines.filter((line) => line.tier "'!== '"'none');\\n  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>\\n    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');\\n  const tier = physicalBlocksCover\\n    ? 'total'\\n    : COVER_TIER_BY_RANK[Math.min(\\n        coverRank(countTier(obstructed.length)),\\n        coverRank(strongestLineTier),\\n        coverRank('three_quarters'),\\n      )] ?? 'none';\\n  const sources = tier === 'none'\\n    ? []\\n    : uniqueSources(obstructed\\n        .filter((line) => line.tier === strongestLineTier)\\n        .flatMap((line) => line.sources));\\n  const interveningCells = [...new Map(lines\\n    .flatMap((line) => line.interveningCells)\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;\\n  return {\\n    sourceCell: { ...sourceCell },\\n    targetCell: { ...targetCell },\\n    sourceCorner: { ...sourceCorner },\\n    lines,\\n    interveningCells,\\n    tier,\\n    blocksSight,\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,\\n  };\\n}\\n\\nfunction comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return coverRank(left.tier) - coverRank(right.tier) ||\\n    left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction nearestCells(\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {\\n  const sources = [...sourceCells].sort(compareCells);\\n  const targets = [...targetCells].sort(compareCells);\\n  const firstSource = sources[0];\\n  const firstTarget = targets[0];\\n  if (firstSource === undefined || firstTarget === undefined) {\\n    throw new RangeError('A line query requires non-empty source and target spaces.');\\n  }\\n  let selectedSource = firstSource;\\n  let selectedTarget = firstTarget;\\n  let selectedDistance = Number.POSITIVE_INFINITY;\\n  for (const sourceCell of sources) {\\n    for (const targetCell of targets) {\\n      const distance = Math.max(\\n        Math.abs(sourceCell.column - targetCell.column),\\n        Math.abs(sourceCell.row - targetCell.row),\\n      );\\n      if (distance < selectedDistance) {\\n        selectedSource = sourceCell;\\n        selectedTarget = targetCell;\\n        selectedDistance = distance;\\n      }\\n    }\\n  }\\n  return { sourceCell: selectedSource, targetCell: selectedTarget };\\n}\\n\\nfunction traceSpaces(\\n  state: EncounterState,\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n  options: TerrainLineOptions,\\n): TerrainLineTrace {\\n  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);\\n  const blockerSignature = sightBlockingSignature(sightBlockingCells);\\n  const traceKey = "'`${options.includeCreatures === true ? '"'creatures' : 'terrain'}:"'${sourceCells'"\\n    .map(cellKey).join(';')}->"'${targetCells.map(cellKey).join('"';')}#sight:"'${blockerSignature}`;'"\\n  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  const cached = stateTraces.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  if ("'!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);'"\\n  const nearest = nearestCells(sourceCells, targetCells);\\n  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));\\n  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);\\n  const equivalentTraceKey = "'`${terrainSourceSignature('"\\n    state,\\n    options.includeCreatures === true,\\n    indexedSources,\\n  )}\\\\0"'${traceKey}`;'"\\n  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);\\n  if (equivalent "'!== undefined) {'"\\n    stateTraces.set(traceKey, equivalent);\\n    return equivalent;\\n  }\\n  const sourceCorners = outerCorners(sourceCells);\\n  const targetCorners = outerCorners(targetCells);\\n  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);\\n  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);\\n  const minimumColumn = Math.min(...cornerColumns);\\n  const maximumColumn = Math.max(...cornerColumns);\\n  const minimumRow = Math.min(...cornerRows);\\n  const maximumRow = Math.max(...cornerRows);\\n  const candidateEntries = sightBlockingCells.length === 0\\n    ? [...indexedSources.values()]\\n    : [...new Map([\\n        ...indexedSources.values(),\\n        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),\\n      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];\\n  const candidates = candidateEntries\\n    .filter((entry) => "'!exclusions.has(cellKey(entry.cell)) &&'"\\n      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&\\n      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)\\n    .map((entry) => entry.cell);\\n  const sightBlockingKeys = new Set([\\n    ...sightBlockingCells.map(cellKey),\\n    ...[...indexedSources]\\n      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))\\n      .map(([key]) => key),\\n  ]);\\n  const sightBlockingAt = (cell: GridCell): boolean => {\\n    const key = cellKey(cell);\\n    return "'!exclusions.has(key) && sightBlockingKeys.has(key);'"\\n  };\\n  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],\\n      sightBlockingAt,\\n    )),\\n    nearest.sourceCell,\\n    nearest.targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  const physicalSelected = traces.reduce(\\n    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,\\n    first,\\n  );\\n  const blocksSight = traces.every((trace) => trace.blocksSight);\\n  const opticalSelected = blocksSight\\n    ? traces.reduce(\\n        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,\\n        first,\\n      )\\n    : null;\\n  const selected: TerrainLineTrace = {\\n    ...physicalSelected,\\n    blocksSight,\\n    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,\\n  };\\n  stateTraces.set(traceKey, selected);\\n  retainEquivalentTrace(equivalentTraceKey, selected);\\n  return selected;\\n}\\n\\n/** The canonical 2014 corner-to-corner trace for two bare grid cells. */\\nexport function traceTerrainLine(\\n  state: EncounterState,\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n  options: TerrainLineOptions = {},\\n): TerrainLineTrace {\\n  return traceSpaces(state, [sourceCell], [targetCell], options);\\n}\\n\\nexport interface CreatureLineOptions {\\n  readonly sourceAnchor?: GridCell;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nexport function traceCombatantLine(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const traceKey = "'`${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined'"\\n    ? 'current'\\n    : cellKey(options.sourceAnchor)}#sight:"'${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {\\n    sourceId,\\n    targetId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function traceCombatantLineToCells(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetCells: readonly GridCell[],\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const targetSignature = targetCells.map(cellKey).join(';');\\n  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);\\n  const traceKey = "'`${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, targetCells, {\\n    sourceId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function coverTierBetweenObjects(\\n  objects: readonly WorldObject[],\\n  from: GridCell,\\n  to: GridCell,\\n): CoverTier {\\n  const exclusions = new Set([cellKey(from), cellKey(to)]);\\n  const candidates = [...new Map(objects\\n    .flatMap((object) => object.footprint)\\n    .filter((cell) => "'!exclusions.has(cellKey(cell)))'"\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const sourceCell = { ...from };\\n  const targetCell = { ...to };\\n  const targetCorners = outerCorners([to]);\\n  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>\\n    objects.flatMap((object): readonly TerrainLineSource[] =>\\n      objectOccupiesCell(object, cell) && object.blocking.cover "'!== '"'none'\\n        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]\\n        : []);\\n  const sightBlockingAt = (cell: GridCell): boolean =>\\n    "'!exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === '"'total');\\n  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      sourcesAt,\\n      sightBlockingAt,\\n    )),\\n    sourceCell,\\n    targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  return traces.reduce((best, candidate) =>\\n    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;\\n}\\n\\nexport type CreatureCoverOptions = CreatureLineOptions;\\n\\nexport interface CombatantCoverResult {\\n  readonly tier: CoverTier;\\n  readonly sourceIds: readonly string[];\\n}\\n\\nexport function coverBetweenCombatants(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureCoverOptions = {},\\n): CombatantCoverResult {\\n  const trace = traceCombatantLine(state, sourceId, targetId, options);\\n  return { tier: trace.tier, sourceIds: trace.sourceIds };\\n}\\n\";if(id.endsWith('/tests/unit/vtt/room-generator-los-cover.test.ts'))return code+\"\\nit('REVIEW_GENERATION_AND_COUNTS',async()=>{\\nconst cases=[[3943001,12,'standard'],[5117001,10,'hard'],[6203001,10,'brutal'],[6206001,10,'brutal']].flatMap(([start,n,difficulty])=>Array.from({length:n},(_,i)=>({seed:start+i,difficulty})));\\nconst rows=cases.map(({seed,difficulty})=>({seed,difficulty,sha256:sha256(canonicalJson(generateRoom(seed,difficulty==='standard'?{}:{difficulty})))}));\\nconst counts=[];\\nconst fs=await import('node:fs');\\nfor(const [family,start,n] of [['hard',5117001,13],['brutal',6203001,10],['brutal-b',6206001,10],['brutal-2',6207001,10]]){\\nlet monsters=0,offers=0,shotless=0;\\nfor(let i=0;i<n;i++){\\nconst state=freshMonsterPlanningState(decodeArenaFixtureText(fs.readFileSync('tests/fixtures/arena-basis-'+family+'/seed-'+(start+i)+'.json','utf8')));\\nfor(const m of state.combatants.filter(c=>c.profile.kind==='monster'&&c.life==='living')){\\nmonsters++;let attack=false;\\nfor(const opt of availableEngineActorOptions(state,m.profile.id,OFFER_ENVIRONMENT,state.revision)){\\nconst r=resolveEngineActorOption(state,opt,OFFER_ENVIRONMENT);expect(r.valid).toBe(true);\\nif(r.mechanics.actionSlots.some(u=>u.kind==='attack'||u.kind==='saving_throw'))offers++;\\nif(r.mechanics.actionSlots.some(u=>u.kind==='attack'))attack=true;\\n}if("'!attack)shotless++;'"\\n}}\\ncounts.push({family,monsters,offers,shotless});\\n}\\nconsole.log('GEN_COUNTS '+JSON.stringify({count:rows.length,hash:sha256(canonicalJson(rows)),counts}));\\n},60000);\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"ENDPOINT|ADJACENT_CORNER|EDGE_ARRIVAL|FAR_FACE|DIAGONAL_CORNER_TOUCH|PHYSICAL_COVER_UNCHANGED_BY_VERTEX\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return code.replace('  if ("'![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;'"\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  if (columnDelta === 0 && rowDelta === 0)', '  return null;\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  if (columnDelta === 0 && rowDelta === 0)');}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 exited 1 in 2649ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/combat/visibility-field.test.ts (54 tests | 8 failed | 45 skipped) 24ms
     ↓ DIM_LIGHT_RAW_GRADES keeps dim visible and darkness unseen for normal sight
     ↓ LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
     ↓ DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
     ↓ LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE
     ↓ UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN
     ↓ WALL_BLOCKS_TARGET_CELL using the existing corner tracer
     ↓ FOG_CLOUD_BLOCKS_BEYOND_TARGET through a concrete obscured-area effect
     ↓ MAGICAL_DARKNESS_SENSE_MATRIX distinguishes normal, darkvision, Devil's Sight, and truesight
     ↓ HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays
     ↓ SPECIAL_SENSE_RANGE_EDGES checks darkvision 60/65 and Devil's Sight 120/125 feet
     ↓ LARGE_OBSERVER_USES_BEST_CELL for range and target-cell tracing
     ↓ BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog
     ↓ BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE
     ↓ BLINDED_TREMORSENSE_REMAINS_LOCATED
     ↓ ANY_FOOTPRINT_CELL_VISIBLE makes a Large subject visible
     ↓ INVISIBLE_SUBJECT_RETAINS_TRANSPOSE_ELIGIBILITY
     ↓ DETECT_FIELD_ALL_PAIRS_AGREE on every ordered overlay-free fixture pair
     ↓ ALLY_CAST_DARKVISION_APPLIES and SENSE_EFFECT_MAX_RANGE_WINS
     ↓ SENSE_EFFECT_MERGE_IS_ORDER_INDEPENDENT for two darkvision grants
     ↓ INNATE_SENSE_NOT_SHORTENED_BY_EFFECT
     ↓ DEVILS_SIGHT_EFFECT_MERGE_IS_ORDER_INDEPENDENT
     ↓ ALWAYS_ON_DEVILS_SIGHT_FIXTURE_PC initializes a permanent 120-foot grant
     ↓ CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT and keeps the prior state unchanged
     ↓ CACHE_IS_STATE_SCOPED_AFTER_LIGHT_CHANGE
     ↓ CACHE_IS_STATE_SCOPED_AFTER_OBSCUREMENT_END
     ↓ CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL
     ↓ SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS
     ↓ SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR
     ↓ SEAM_BLOCKED_CELL_PAIR
     ↓ DIAGONAL_CRACK_SEALED
     ↓ DIAGONAL_CRACK_CONTROL_ONE_BLOCKER
     × SOURCE_ENDPOINT_JUNCTION_SEALED 16ms
     × TARGET_ENDPOINT_JUNCTION_SEALED 1ms
     ✓ SAME_SIDE_ENDPOINT_GRAZE_CLEAR 1ms
     × ADJACENT_CORNER_ZERO_LENGTH 1ms
     × ADJACENT_CORNER_AGGREGATE_BLOCKED 1ms
     × EDGE_ARRIVAL_AT_JUNCTION_BLOCKED 1ms
     ↓ OWN_EDGE_DEPARTURE_CLEAR
     × FAR_FACE_DEPARTURE_BLOCKED 1ms
     ↓ STAIRCASE_WALL_SEALED
     ↓ STAIRCASE_MIRRORED_SEALED
     ↓ VERTICAL_STEP_SEALED
     ↓ STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR
     ↓ OUTER_FACE_GRAZE_STILL_CLEAR
     ↓ SOLID_2x2_BLOCK
     × DIAGONAL_CORNER_TOUCH_SEALED_D642 1ms
     × PHYSICAL_COVER_UNCHANGED_BY_VERTEX 1ms
     ↓ PHYSICAL_COVER_UNCHANGED_BY_SEAM
     ↓ EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint
     ↓ SIGHT_ONLY_BLOCKER_PRESERVES_COVER even when fog flips the preferred optical corner
     ↓ PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR
     ↓ UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING
     ↓ SIGHT_TRACER_HAS_SINGLE_OWNER at the final migration stage
     ↓ PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > SOURCE_ENDPOINT_JUNCTION_SEALED
AssertionError: expected { …(10) } to match object { tier: 'none', …(2) }
(13 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
    "tier": "none",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1115:19
    1113|     // Ray (2,2)->(0,4) leaves into the opposite BL quadrant through t…
    1114|     // TL (1,1) + BR (2,2). Lower-row cell (1,1) wins; physical cover …
    1115|     expect(trace).toMatchObject({
       |                   ^
    1116|       tier: 'none',
    1117|       blocksSight: true,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > TARGET_ENDPOINT_JUNCTION_SEALED
AssertionError: expected { …(10) } to match object { tier: 'half', …(2) }
(13 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
    "tier": "half",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1134:19
    1132|     // Mirrored ray (0,4)->(2,2) arrives from the BL quadrant opposite…
    1133|     // TR quadrant. TL (1,1) + BR (2,2) seal vertex (2,2); physical Ha…
    1134|     expect(trace).toMatchObject({
       |                   ^
    1135|       tier: 'half',
    1136|       blocksSight: true,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > ADJACENT_CORNER_ZERO_LENGTH
AssertionError: expected { …(7) } to match object { tier: 'none', …(2) }
(6 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
    "tier": "none",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1176:24
    1174|     // blocked at the solid-wall pinch, as is the ray leaving diagonal…
    1175|     expect(trace.sourceCorner).toEqual({ column: 2, row: 2 });
    1176|     expect(zeroLength).toMatchObject({
       |                        ^
    1177|       tier: 'none', blocksSight: true, firstBlockingCell: { column: 1,…
    1178|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > ADJACENT_CORNER_AGGREGATE_BLOCKED
AssertionError: expected { …(10) } to match object { tier: 'none', …(2) }
(13 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
    "tier": "none",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1207:19
    1205|     // and BR (2,2). The last r4-clear rays end at the pinch along its…
    1206|     // (2,1)->(2,2) and (3,2)->(2,2). D657 blocks both, sealing the ag…
    1207|     expect(trace).toMatchObject({
       |                   ^
    1208|       tier: 'none',
    1209|       blocksSight: true,

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > EDGE_ARRIVAL_AT_JUNCTION_BLOCKED
AssertionError: expected { …(7) } to match object { blocksSight: true, …(1) }
(7 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1231:29
    1229|     expect(verticalTrace.sourceCorner).toEqual({ column: 2, row: 1 });
    1230|     expect(horizontalTrace.sourceCorner).toEqual({ column: 3, row: 2 }…
    1231|     expect(verticalArrival).toMatchObject({ blocksSight: true, firstBl…
       |                             ^
    1232|     expect(horizontalArrival).toMatchObject({ blocksSight: true, first…
    1233|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > FAR_FACE_DEPARTURE_BLOCKED
AssertionError: expected { …(7) } to match object { blocksSight: true, …(1) }
(7 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 1,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1270:21
    1268|     // to departure (2,2)->(0,2), lies left of closed TR on the wall's…
    1269|     expect(trace.sourceCorner).toEqual({ column: 0, row: 2 });
    1270|     expect(farFace).toMatchObject({ blocksSight: true, firstBlockingCe…
       |                     ^
    1271|   });
    1272|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > DIAGONAL_CORNER_TOUCH_SEALED_D642
AssertionError: expected { …(10) } to match object { tier: 'none', …(2) }
(13 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
-   "firstBlockingCell": {
-     "column": 1,
-     "row": 0,
-   },
+   "blocksSight": false,
+   "firstBlockingCell": null,
    "tier": "none",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1423:19
    1421|     // all four rays from (1,1) to target corners (2,2)..(3,3) leave i…
    1422|     // TR (1,0) + BL (0,1) pinch. That last clear source-corner route …
    1423|     expect(trace).toMatchObject({ tier: 'none', blocksSight: true, fir…
       |                   ^
    1424|   });
    1425|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/8]⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > PHYSICAL_COVER_UNCHANGED_BY_VERTEX
AssertionError: expected { …(7) } to match object { tier: 'none', blocksSight: true }
(7 matching properties omitted from actual)

- Expected
+ Received

  {
-   "blocksSight": true,
+   "blocksSight": false,
    "tier": "none",
  }

 ❯ tests/unit/combat/visibility-field.test.ts:1451:26
    1449|     // Ray (0,4)->(2,2) is optically stopped at the TL (1,1) + BR (2,2…
    1450|     // but it crosses no cell interior; the new sight hit therefore le…
    1451|     expect(endpointLine).toMatchObject({ tier: 'none', blocksSight: tr…
       |                          ^
    1452|   });
    1453|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯


 Test Files  1 failed (1)
      Tests  8 failed | 1 passed | 45 skipped (54)
   Start at  00:09:48
   Duration  2.57s (transform 926ms, setup 0ms, import 2.45s, tests 24ms, environment 0ms)


 succeeded in 12465ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/room-generator-los-cover.test.ts > REVIEW_GENERATION_AND_COUNTS
GEN_COUNTS {"count":42,"hash":"7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc","counts":[{"family":"hard","monsters":75,"offers":142,"shotless":35},{"family":"brutal","monsters":44,"offers":57,"shotless":34},{"family":"brutal-b","monsters":42,"offers":15,"shotless":41},{"family":"brutal-2","monsters":44,"offers":58,"shotless":36}]}

GEN_COUNTS {"count":42,"hash":"7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc","counts":[{"family":"hard","monsters":75,"offers":142,"shotless":35},{"family":"brutal","monsters":44,"offers":57,"shotless":34},{"family":"brutal-b","monsters":42,"offers":15,"shotless":41},{"family":"brutal-2","monsters":44,"offers":58,"shotless":36}]}

 ✓ tests/unit/vtt/room-generator-los-cover.test.ts (113 tests | 112 skipped) 9410ms
   ✓ REVIEW_GENERATION_AND_COUNTS  9409ms

 Test Files  1 passed (1)
      Tests  1 passed | 112 skipped (113)
   Start at  00:09:47
   Duration  12.34s (transform 1.24s, setup 0ms, import 2.85s, tests 9.41s, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_SHARED_EDGE\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return code+'\\nexport {firstSightBlockingCell as __first};';if(id.endsWith('/tests/unit/combat/visibility-field.test.ts'))return code+\"\\nit('REVIEW_SHARED_EDGE_ENDPOINT_TIE',async()=>{\\n const m=await import('../../../src/combat/cover');\\n const v={column:2,row:2},to={column:0,row:2},q={column:1,row:1};\\n const blockers=[{column:1,row:1},{column:2,row:1},{column:1,row:2}];\\n const at=c=>blockers.some(b=>b.column===c.column&&b.row===c.row);\\n expect(m.__first(v,to,q,q,{column:2,row:1},null,[],at)).toEqual({column:1,row:1});\\n});\\n\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "git diff --check bc6422bf b94dd732; git diff --numstat bc6422bf b94dd732; git diff bc6422bf b94dd732 -- tests/fixtures fixtures; git diff --unified=0 bc6422bf b94dd732 | python3 -c 'import sys;print(\"Added lines over 120:\",sum(1 for s in sys.stdin if s.startswith(\"+\") and not s.startswith(\"+++\") and len(s.rstrip())>121))'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
175	24	src/combat/cover.ts
191	2	tests/unit/combat/visibility-field.test.ts
14	5	tests/unit/vtt/scene-snapshot.test.ts
Added lines over 120: 0

 succeeded in 2589ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ✓ tests/unit/combat/visibility-field.test.ts (55 tests | 54 skipped) 2ms

 Test Files  1 passed (1)
      Tests  1 passed | 54 skipped (55)
   Start at  00:10:23
   Duration  2.47s (transform 901ms, setup 0ms, import 2.39s, tests 2ms, environment 0ms)


codex
The 200 endpoint checks and the Large-source probe passed. Disabling the endpoint rule in memory makes eight witnesses fail. The snapshot comparison also reproduces all three new hashes: only `(7,3)` moves from visible to concealed; canonical state bytes and the RNG fingerprint remain unchanged.

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_GENERATION_AND_COUNTS\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/room-generator-los-cover.test.ts'))return code+\"\\nit('REVIEW_GENERATION_AND_COUNTS',async()=>{\\nconst cases=[[3943001,12,'standard'],[5117001,10,'hard'],[6203001,10,'brutal'],[6206001,10,'brutal']].flatMap(([start,n,difficulty])=>Array.from({length:n},(_,i)=>({seed:start+i,difficulty})));\\nconst rows=cases.map(({seed,difficulty})=>({seed,difficulty,sha256:sha256(canonicalJson(generateRoom(seed,difficulty==='standard'?{}:{difficulty})))}));\\nconst counts=[];\\nconst fs=await import('node:fs');\\nfor(const [family,start,n] of [['hard',5117001,13],['brutal',6203001,10],['brutal-b',6206001,10],['brutal-2',6207001,10]]){\\nlet monsters=0,offers=0,shotless=0;\\nfor(let i=0;i<n;i++){\\nconst state=freshMonsterPlanningState(decodeArenaFixtureText(fs.readFileSync('tests/fixtures/arena-basis-'+family+'/seed-'+(start+i)+'.json','utf8')));\\nfor(const m of state.combatants.filter(c=>c.profile.kind==='monster'&&c.life==='living')){\\nmonsters++;let attack=false;\\nfor(const opt of availableEngineActorOptions(state,m.profile.id,OFFER_ENVIRONMENT,state.revision)){\\nconst r=resolveEngineActorOption(state,opt,OFFER_ENVIRONMENT);expect(r.valid).toBe(true);\\nif(r.mechanics.actionSlots.some(u=>u.kind==='attack'||u.kind==='saving_throw'))offers++;\\nif(r.mechanics.actionSlots.some(u=>u.kind==='attack'))attack=true;\\n}if("'!attack)shotless++;'"\\n}}\\ncounts.push({family,monsters,offers,shotless});\\n}\\nconsole.log('GEN_COUNTS '+JSON.stringify({count:rows.length,hash:sha256(canonicalJson(rows)),counts}));\\n},60000);\";}}]});await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "nl -ba src/combat/cover.ts | sed -n '460,552p;573,602p;693,705p;743,759p;883,918p'; git status --short; sha256sum src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
   460	  return null;
   461	}
   462	
   463	function liesInClosedQuadrant(
   464	  columnDelta: number,
   465	  rowDelta: number,
   466	  ownCellQuadrant: CornerQuadrant,
   467	): boolean {
   468	  return columnDelta * ownCellQuadrant.column >= 0 &&
   469	    rowDelta * ownCellQuadrant.row >= 0;
   470	}
   471	
   472	function endpointSharedVertexBlockingHit(
   473	  from: CornerPoint,
   474	  to: CornerPoint,
   475	  sourceCellQuadrant: CornerQuadrant,
   476	  targetCellQuadrant: CornerQuadrant,
   477	  sourceBlockingCell: GridCell | null,
   478	  targetBlockingCell: GridCell | null,
   479	): SightBlockingHit | null {
   480	  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
   481	  const columnDelta = to.column - from.column;
   482	  const rowDelta = to.row - from.row;
   483	  if (columnDelta === 0 && rowDelta === 0) {
   484	    const oppositeSpaces = sourceCellQuadrant.column === -targetCellQuadrant.column &&
   485	      sourceCellQuadrant.row === -targetCellQuadrant.row;
   486	    return sourceBlockingCell !== null && oppositeSpaces
   487	      ? { cell: sourceBlockingCell, progress: 0 }
   488	      : null;
   489	  }
   490	  // D657: the other endpoint must remain inside the endpoint cell's closed quadrant;
   491	  // either boundary half-line is an own-edge graze, while every other direction crosses the pinch.
   492	  if (sourceBlockingCell !== null &&
   493	    !liesInClosedQuadrant(columnDelta, rowDelta, sourceCellQuadrant)) {
   494	    return { cell: sourceBlockingCell, progress: 0 };
   495	  }
   496	  if (targetBlockingCell !== null &&
   497	    !liesInClosedQuadrant(-columnDelta, -rowDelta, targetCellQuadrant)) {
   498	    return { cell: targetBlockingCell, progress: 1 };
   499	  }
   500	  return null;
   501	}
   502	
   503	function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
   504	  let entry = 0;
   505	  const columnDelta = to.column - from.column;
   506	  if (columnDelta !== 0) {
   507	    entry = Math.max(entry, Math.min(
   508	      (cell.column - from.column) / columnDelta,
   509	      (cell.column + 1 - from.column) / columnDelta,
   510	    ));
   511	  }
   512	  const rowDelta = to.row - from.row;
   513	  if (rowDelta !== 0) {
   514	    entry = Math.max(entry, Math.min(
   515	      (cell.row - from.row) / rowDelta,
   516	      (cell.row + 1 - from.row) / rowDelta,
   517	    ));
   518	  }
   519	  return entry;
   520	}
   521	
   522	function firstSightBlockingCell(
   523	  from: CornerPoint,
   524	  to: CornerPoint,
   525	  sourceCellQuadrant: CornerQuadrant,
   526	  targetCellQuadrant: CornerQuadrant,
   527	  sourceEndpointBlockingCell: GridCell | null,
   528	  targetEndpointBlockingCell: GridCell | null,
   529	  interveningCells: readonly GridCell[],
   530	  sightBlockingAt: (cell: GridCell) => boolean,
   531	): GridCell | null {
   532	  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
   533	  const endpoint = endpointSharedVertexBlockingHit(
   534	    from,
   535	    to,
   536	    sourceCellQuadrant,
   537	    targetCellQuadrant,
   538	    sourceEndpointBlockingCell,
   539	    targetEndpointBlockingCell,
   540	  );
   541	  if (endpoint !== null && (first === null || endpoint.progress < first.progress ||
   542	    (endpoint.progress === first.progress && compareCells(endpoint.cell, first.cell) < 0))) first = endpoint;
   543	  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
   544	  if (vertex !== null && (first === null || vertex.progress < first.progress ||
   545	    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
   546	  for (const cell of interveningCells) {
   547	    if (!sightBlockingAt(cell)) continue;
   548	    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };
   549	    if (first === null || hit.progress < first.progress ||
   550	      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
   551	  }
   552	  // One traversal merges cell-interior, shared-edge, endpoint and strict-interior-vertex events by progress.
   573	    to,
   574	    sourceCellQuadrant,
   575	    targetCellQuadrant,
   576	    sourceEndpointBlockingCell,
   577	    targetEndpointBlockingCell,
   578	    interveningCells,
   579	    sightBlockingAt,
   580	  );
   581	  for (const cell of interveningCells) {
   582	    for (const source of sourcesAt(cell)) {
   583	      const comparison = coverRank(source.tier) - coverRank(tier);
   584	      if (comparison > 0) {
   585	        tier = source.tier;
   586	        strongest = [source];
   587	      } else if (comparison === 0) {
   588	        strongest.push(source);
   589	      }
   590	    }
   591	  }
   592	  const sources = uniqueSources(strongest);
   593	  return {
   594	    targetCorner: { ...to },
   595	    interveningCells,
   596	    tier,
   597	    blocksSight: firstBlockingCell !== null,
   598	    sourceIds: sources.map(taggedSourceId),
   599	    sources,
   600	    firstBlockingCell,
   601	  };
   602	}
   693	}
   694	
   695	function traceSpaces(
   696	  state: EncounterState,
   697	  sourceCells: readonly GridCell[],
   698	  targetCells: readonly GridCell[],
   699	  options: TerrainLineOptions,
   700	): TerrainLineTrace {
   701	  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);
   702	  const blockerSignature = sightBlockingSignature(sightBlockingCells);
   703	  const traceKey = `${options.includeCreatures === true ? 'creatures' : 'terrain'}:${sourceCells
   704	    .map(cellKey).join(';')}->${targetCells.map(cellKey).join(';')}#sight:${blockerSignature}`;
   705	  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
   743	  const sightBlockingKeys = new Set([
   744	    ...sightBlockingCells.map(cellKey),
   745	    ...[...indexedSources]
   746	      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))
   747	      .map(([key]) => key),
   748	  ]);
   749	  const sightBlockingAt = (cell: GridCell): boolean => {
   750	    const key = cellKey(cell);
   751	    return !exclusions.has(key) && sightBlockingKeys.has(key);
   752	  };
   753	  const resolvedSourceEndpoints = resolveCornerEndpoints(sourceEndpoints, sightBlockingAt);
   754	  const resolvedTargetEndpoints = resolveCornerEndpoints(targetEndpoints, sightBlockingAt);
   755	  const traces = resolvedSourceEndpoints.map((sourceEndpoint) => aggregateCornerLines(
   756	    sourceEndpoint.point,
   757	    resolvedTargetEndpoints.map((targetEndpoint) => traceCornerLine(
   758	      sourceEndpoint.point,
   759	      targetEndpoint.point,
   883	  const targetEndpoints = outerCornerEndpoints([to]);
   884	  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
   885	    objects.flatMap((object): readonly TerrainLineSource[] =>
   886	      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
   887	        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
   888	        : []);
   889	  const sightBlockingAt = (cell: GridCell): boolean =>
   890	    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
   891	  const resolvedSourceEndpoints = resolveCornerEndpoints(sourceEndpoints, sightBlockingAt);
   892	  const resolvedTargetEndpoints = resolveCornerEndpoints(targetEndpoints, sightBlockingAt);
   893	  const traces = resolvedSourceEndpoints.map((sourceEndpoint) => aggregateCornerLines(
   894	    sourceEndpoint.point,
   895	    resolvedTargetEndpoints.map((targetEndpoint) => traceCornerLine(
   896	      sourceEndpoint.point,
   897	      targetEndpoint.point,
   898	      sourceEndpoint.cellQuadrant,
   899	      targetEndpoint.cellQuadrant,
   900	      sourceEndpoint.blockingCell,
   901	      targetEndpoint.blockingCell,
   902	      candidates,
   903	      sourcesAt,
   904	      sightBlockingAt,
   905	    )),
   906	    sourceCell,
   907	    targetCell,
   908	  ));
   909	  const first = traces[0];
   910	  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   911	  return traces.reduce((best, candidate) =>
   912	    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
   913	}
   914	
   915	export type CreatureCoverOptions = CreatureLineOptions;
   916	
   917	export interface CombatantCoverResult {
   918	  readonly tier: CoverTier;
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb  src/combat/cover.ts

 succeeded in 12493ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/room-generator-los-cover.test.ts > REVIEW_GENERATION_AND_COUNTS
GEN_COUNTS {"count":42,"hash":"7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc","counts":[{"family":"hard","monsters":75,"offers":142,"shotless":35},{"family":"brutal","monsters":44,"offers":57,"shotless":34},{"family":"brutal-b","monsters":42,"offers":15,"shotless":41},{"family":"brutal-2","monsters":44,"offers":58,"shotless":36}]}

GEN_COUNTS {"count":42,"hash":"7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc","counts":[{"family":"hard","monsters":75,"offers":142,"shotless":35},{"family":"brutal","monsters":44,"offers":57,"shotless":34},{"family":"brutal-b","monsters":42,"offers":15,"shotless":41},{"family":"brutal-2","monsters":44,"offers":58,"shotless":36}]}

 ✓ tests/unit/vtt/room-generator-los-cover.test.ts (113 tests | 112 skipped) 9493ms
   ✓ REVIEW_GENERATION_AND_COUNTS  9492ms

 Test Files  1 passed (1)
      Tests  1 passed | 112 skipped (113)
   Start at  00:10:34
   Duration  12.36s (transform 1.20s, setup 0ms, import 2.79s, tests 9.49s, environment 0ms)


exec
/bin/bash -lc 'git status --short; sha256sum src/combat/cover.ts; git diff --check bc6422bf b94dd732' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb  src/combat/cover.ts

codex
## Findings

**WALL-F3 closed; WALL-F4 closed. No new findings.**

### Endpoint geometry

[cover.ts:463–499](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:463) implements D657 using integer differences, multiplication by ±1, and comparisons—no floating-point division.

My in-memory enumeration passed **200 assertions** across all four quadrants, mirrored source/target endpoints, and zero-length cases:

| Other endpoint relative to Q | Result |
|---|---|
| Inside Q | Clear |
| Either boundary half-line of Q | Clear |
| Opposite quadrant | Blocked |
| Either far-face half-line | Blocked |
| Adjacent blocking quadrant | Blocked |
| Zero-length, opposite free quadrants | Blocked |
| Zero-length, same quadrant | Clear |

The original full-wall leak, reverse direction, and adjacent-corner aggregate are covered by passing witnesses. The single-blocker control remains clear.

The endpoint’s own footprint cells are excluded by `sightBlockingAt` at [cover.ts:749](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:749). Thus its own quadrant cannot be blocking **for this trace**, even if the underlying cell contains an optical effect.

### Footprints, ties, and physical cover

- Verified all four quadrant assignments for **Large and Huge** footprints.
- Constructed a Large source at `(2,2)` with blockers `(2,1)` and `(1,2)`: sight toward `(0,0)` blocks, first blocker `(2,1)`; sight toward `(5,2)` remains clear.
- A simultaneous endpoint/shared-edge probe passed: both events at progress zero select the lower-row/lower-column cell `(1,1)`.
- Physical tiers still depend only on crossed cover sources at [cover.ts:581–597](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:581). The object-cover path uses the same endpoint machinery and physical-only selection at lines 891–912.
- **Endpoint-disabled mutant:** eight witnesses failed.
- **Optical-hit-raises-cover mutant:** physical-cover witness failed (`total` instead of `half`).

### Snapshot derivation

At `(7,3)`, the target occupies BR. The fighter/wizard rays approach from the west, outside BR’s closed quadrant; the cleric already crosses the door. This adds exactly `(7,3)` to concealment.

Substituting r3’s `cover.ts` versus the candidate in memory reproduced:

| Hash | r3 prefix | Candidate prefix |
|---|---|---|
| Pending request | `0ec0fbbc` | `28a1eb7e` |
| Coordinator | `79b076c9` | `87fc04ad` |
| Revision | `52305455` | `9ee96377` |

Structural comparison found only `(7,3)` removed from `visibleState.cells` and added to `visibleState.concealedCells`. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

### Generation and counts

I reran both versions in memory. **All 42 generated-room hashes matched**, aggregate:

```text
7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc
```

Both versions independently produced:

| Family | Monsters | Offers / shotless |
|---|---:|---:|
| hard | 75 | 142 / 35 |
| brutal | 44 | 57 / 34 |
| brutal-b | 42 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 |

### Commands and validation

Ran:

```text
git diff --check bc6422bf b94dd732
git diff --numstat bc6422bf b94dd732
git diff bc6422bf b94dd732 -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **tsc 0/0; diff-check 0; three files, 380 insertions/31 deletions; no fixture changes; zero added lines over 120 columns; clean checkout.**

Tests used `node --input-type=module` with programmatic `startVitest`, `config:false`, `cache:false`, one thread worker, and in-memory Vite transforms.

| Suite | Result |
|---|---:|
| visibility-field | 54/54 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **74/74** |

The isolated productive-option test measured **5,649 ms with r3** and **5,853 ms with the candidate**; both exceeded its unchanged 5,000 ms budget. Endpoint resolution adds at most two blocker lookups per outer corner, then constant-time checks per ray. This remains the acknowledged deferred performance issue.

Production SHA-256 before/after was identical:

```text
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb
```

VERDICT: ACCEPT
REVIEW DONE.
tokens used
2,557,161
## Findings

**WALL-F3 closed; WALL-F4 closed. No new findings.**

### Endpoint geometry

[cover.ts:463–499](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:463) implements D657 using integer differences, multiplication by ±1, and comparisons—no floating-point division.

My in-memory enumeration passed **200 assertions** across all four quadrants, mirrored source/target endpoints, and zero-length cases:

| Other endpoint relative to Q | Result |
|---|---|
| Inside Q | Clear |
| Either boundary half-line of Q | Clear |
| Opposite quadrant | Blocked |
| Either far-face half-line | Blocked |
| Adjacent blocking quadrant | Blocked |
| Zero-length, opposite free quadrants | Blocked |
| Zero-length, same quadrant | Clear |

The original full-wall leak, reverse direction, and adjacent-corner aggregate are covered by passing witnesses. The single-blocker control remains clear.

The endpoint’s own footprint cells are excluded by `sightBlockingAt` at [cover.ts:749](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:749). Thus its own quadrant cannot be blocking **for this trace**, even if the underlying cell contains an optical effect.

### Footprints, ties, and physical cover

- Verified all four quadrant assignments for **Large and Huge** footprints.
- Constructed a Large source at `(2,2)` with blockers `(2,1)` and `(1,2)`: sight toward `(0,0)` blocks, first blocker `(2,1)`; sight toward `(5,2)` remains clear.
- A simultaneous endpoint/shared-edge probe passed: both events at progress zero select the lower-row/lower-column cell `(1,1)`.
- Physical tiers still depend only on crossed cover sources at [cover.ts:581–597](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:581). The object-cover path uses the same endpoint machinery and physical-only selection at lines 891–912.
- **Endpoint-disabled mutant:** eight witnesses failed.
- **Optical-hit-raises-cover mutant:** physical-cover witness failed (`total` instead of `half`).

### Snapshot derivation

At `(7,3)`, the target occupies BR. The fighter/wizard rays approach from the west, outside BR’s closed quadrant; the cleric already crosses the door. This adds exactly `(7,3)` to concealment.

Substituting r3’s `cover.ts` versus the candidate in memory reproduced:

| Hash | r3 prefix | Candidate prefix |
|---|---|---|
| Pending request | `0ec0fbbc` | `28a1eb7e` |
| Coordinator | `79b076c9` | `87fc04ad` |
| Revision | `52305455` | `9ee96377` |

Structural comparison found only `(7,3)` removed from `visibleState.cells` and added to `visibleState.concealedCells`. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

### Generation and counts

I reran both versions in memory. **All 42 generated-room hashes matched**, aggregate:

```text
7b884bf91213ddaba626ec77b0dbf874c99d5de6cb8e6e190c0be5b7e31c56fc
```

Both versions independently produced:

| Family | Monsters | Offers / shotless |
|---|---:|---:|
| hard | 75 | 142 / 35 |
| brutal | 44 | 57 / 34 |
| brutal-b | 42 | 15 / 41 |
| brutal-2 | 44 | 58 / 36 |

### Commands and validation

Ran:

```text
git diff --check bc6422bf b94dd732
git diff --numstat bc6422bf b94dd732
git diff bc6422bf b94dd732 -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **tsc 0/0; diff-check 0; three files, 380 insertions/31 deletions; no fixture changes; zero added lines over 120 columns; clean checkout.**

Tests used `node --input-type=module` with programmatic `startVitest`, `config:false`, `cache:false`, one thread worker, and in-memory Vite transforms.

| Suite | Result |
|---|---:|
| visibility-field | 54/54 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **74/74** |

The isolated productive-option test measured **5,649 ms with r3** and **5,853 ms with the candidate**; both exceeded its unchanged 5,000 ms budget. Endpoint resolution adds at most two blocker lookups per outer corner, then constant-time checks per ray. This remains the acknowledged deferred performance issue.

Production SHA-256 before/after was identical:

```text
1d5b3d1c3120fc5193e6a9981d62c212ef1e60453879143d1a4652f76df0adeb
```

VERDICT: ACCEPT
REVIEW DONE.
