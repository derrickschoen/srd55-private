# ELEVATION-02 plan r4 (owner answers + two manifest fixes) — sol report tail (resumed 01a0ab4f…, 1.46 M tokens)

ts
+src/vtt/regret/legal-actions.ts
+src/vtt/regret/rollout.ts
+src/vtt/renderer-profile.ts
+src/vtt/scripted-party-round.ts
+src/vtt/symmetric-pc-evaluator.ts
+src/vtt/vane-warren.ts
+tests/unit/combat/creature-space.test.ts
+tests/unit/vtt/challenge-room-fixtures.test.ts
+tests/unit/vtt/footprint-increment-four.test.ts
+```
+
+The additional compiled-tool path is `tools/los-cover-era-audit.ts`. B6A0–B6A4
+assign all 31; the final declaration and real T-app/T-node boundary is B6A4.
+
 The r3 traversal declaration probe is
 `.tmp/elevation-r3-traversal-overlay.mjs`. It declares the structural
 `EngineTraversalBinding` in `movement.ts`, requires that type on
@@ -2336,6 +2482,7 @@
 | current worktree/main `4a99570d` | 85 / 30 / 13.81 s / 0 | 260 / 89 / 26.52 s / 0 |
 | VIS seam `5492f782` archive | 85 / 30 / 13.88 s / 0 | 260 / 89 / 26.79 s / 0 |
 | OFFERS `1cacd8f0` archive | 85 / 30 / 14.71 s / 0 | 257 / 89 / 26.42 s / 0 |
+| landed main `9f148666` | 85 / 30 / 16.66 s / 0 | 257 / 89 / 27.94 s / 0 |
 
 Astra's minimal overlay reported 56/24 app and 207/73 node on its reviewed
 shape (`review-plan-r2-astra.md:11-17`). This reproduction declares the full
@@ -2343,20 +2490,33 @@
 removes the parallel mechanics `path/movementCostFeet/finalPosition` members;
 those deliberate extra declaration changes expose more downstream consumers.
 The acceptance unit is the complete path union, not matching incidental
-contextual-error multiplicity. The shared 89-path superset is listed
-exhaustively by B7A0–B7A9: 30 production paths, 56 test paths, and three tool
-paths. The overlay exits 0 after printing the declaration-red inventory. At the
+contextual-error multiplicity. Each single-tree node inventory has 89 paths,
+but the planning-main and landed-OFFERS union has **90**: planning main alone
+has `tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts`, while landed
+OFFERS alone has `tests/unit/vtt/offer-environment-board-sequence.test.ts`.
+The union is listed exhaustively by B7A0–B7A9: 30 production paths, 57 test
+paths, and three tool paths. The overlay exits 0 after printing the
+declaration-red inventory. At the
 B7A9 final declaration, the implementation repeats it with the actual final
 types, requires `outsideTranche: 0`, then runs real T-app/T-node and requires
 exit 0 with **zero diagnostics**.
 
-A closing parser counts every `Allowed` paragraph, asserts each batch contains
-at most ten paths, and compares the 89 traversal paths and 27 distance modules
-against B7A0–B7A9 and B6A0–B6A3 respectively. After the last substantive edit it
-printed: **33 batches; 217 unique allowed paths; maximum 10 files; 0 over-limit;
-89/89 traversal diagnostic paths assigned, 0 outside; 27/27 distance modules
-assigned, 0 outside**. The closing untouched-tree compiler probes were T-app
-exit 0 / **13.19 s** and T-node exit 0 / **28.16 s**.
+A closing parser counts every `Allowed` paragraph (including the generated JSON
+schema path), asserts each batch contains at most ten paths, and compares the
+90-path traversal union against B7A0–B7A9 and the 31-path distance compiler
+union against B6A0–B6A4. The exact command was:
+
+```sh
+node .tmp/elevation-r4-manifest-audit.mjs
+```
+
+After the last substantive edit it printed:
+**34 batches; 221 unique allowed paths; maximum 10 files; 0 over-limit; 90/90
+traversal diagnostic paths assigned, 0 outside; 30/30 distance source-and-test
+paths assigned, 0 outside; 31/31 distance compiler paths assigned, 0 outside**.
+The manifest audit exited 0 in **82.07 s**. The final untouched planning-tree
+compiler probes were T-app exit 0 / **14.43 s** and T-node exit 0 /
+**27.11 s**.
 
 The fraction probe used exact `BigInt` numerator/denominator arithmetic around
 `p(z,t)=e+(z-e)/t`. It printed:
@@ -2370,4 +2530,4 @@
 No model, reviewer, agent, full suite, full gate, Playwright, build, or port 4173
 action was used while authoring.
 
-ELEVATION-02 PLAN R3 DONE
+ELEVATION-02 PLAN R4 DONE
diff --git a/.tmp/elevation-r4-distance-overlay.mjs b/.tmp/elevation-r4-distance-overlay.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ea5d4b13d1d06a8b5c8666f8d200a8406195280e
--- /dev/null
+++ b/.tmp/elevation-r4-distance-overlay.mjs
@@ -0,0 +1,69 @@
+import path from 'node:path';
+import ts from 'typescript';
+
+const [rootArgument, configArgument] = process.argv.slice(2);
+if (rootArgument === undefined || configArgument === undefined) {
+  throw new Error('usage: node elevation-r4-distance-overlay.mjs <root> <tsconfig>');
+}
+const root = path.resolve(rootArgument);
+const configPath = path.join(root, configArgument);
+
+const relativeTarget = 'src/combat/creature-space.ts';
+const edits = [[
+  'export function minimumSpaceLine(\n  source: CreatureSpace<KnownCreatureSize>,\n  target: CreatureSpace<KnownCreatureSize>,\n): MinimumSpaceLine {\n  return minimumSpaceLineToCells(source, target.cells);\n}',
+  "export interface SpatialDistanceEndpoint {\n  readonly kind: 'creature' | 'bare_cell' | 'world_object';\n  readonly cells: readonly GridCell[];\n  readonly vertical: { readonly bottom: number; readonly top: number };\n  readonly stableId: string;\n}\n\nexport function minimumSpaceLine(\n  source: SpatialDistanceEndpoint,\n  target: SpatialDistanceEndpoint,\n): MinimumSpaceLine {\n  return minimumSpaceLineToCells(source, target);\n}",
+], [
+  'export function minimumSpaceLineToCells(\n  source: CreatureSpace<KnownCreatureSize>,\n  targetCells: readonly GridCell[],\n): MinimumSpaceLine {\n  const firstSource = source.cells[0];\n  const firstTarget = targetCells[0];',
+  'export function minimumSpaceLineToCells(\n  source: SpatialDistanceEndpoint,\n  target: SpatialDistanceEndpoint,\n): MinimumSpaceLine {\n  const targetCells = target.cells;\n  const firstSource = source.cells[0];\n  const firstTarget = targetCells[0];',
+], [
+  'export function minimumSpaceDistance(\n  left: CreatureSpace<KnownCreatureSize>,\n  right: CreatureSpace<KnownCreatureSize>,\n): Feet {',
+  'export function minimumSpaceDistance(\n  left: SpatialDistanceEndpoint,\n  right: SpatialDistanceEndpoint,\n): Feet {',
+], [
+  'export function minimumSpaceDistanceToCells(\n  source: CreatureSpace<KnownCreatureSize>,\n  targetCells: readonly GridCell[],\n): Feet {\n  return minimumSpaceLineToCells(source, targetCells).distance;\n}',
+  'export function minimumSpaceDistanceToCells(\n  source: SpatialDistanceEndpoint,\n  target: SpatialDistanceEndpoint,\n): Feet {\n  return minimumSpaceLineToCells(source, target).distance;\n}',
+]];
+
+let touched = false;
+function overlaidRead(fileName) {
+  const source = ts.sys.readFile(fileName);
+  if (source === undefined) return source;
+  const relative = path.relative(root, fileName).split(path.sep).join('/');
+  if (relative !== relativeTarget) return source;
+  let result = source;
+  for (const [before, after] of edits) {
+    const first = result.indexOf(before);
+    if (first < 0 || result.indexOf(before, first + before.length) >= 0) {
+      throw new Error(`${relative}: overlay anchor must occur exactly once`);
+    }
+    result = result.replace(before, after);
+  }
+  touched = true;
+  return result;
+}
+
+const configRead = ts.readConfigFile(configPath, ts.sys.readFile);
+if (configRead.error !== undefined) {
+  throw new Error(ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n'));
+}
+const parsed = ts.parseJsonConfigFileContent(configRead.config, ts.sys, root, { noEmit: true }, configPath);
+const host = ts.createCompilerHost(parsed.options);
+host.readFile = overlaidRead;
+const program = ts.createProgram({
+  rootNames: parsed.fileNames,
+  options: parsed.options,
+  projectReferences: parsed.projectReferences,
+  host,
+});
+const diagnostics = ts.getPreEmitDiagnostics(program);
+if (!touched) throw new Error(`${relativeTarget}: overlay was not read by ${configArgument}`);
+const paths = [...new Set(diagnostics.flatMap((diagnostic) => diagnostic.file === undefined
+  ? []
+  : [path.relative(root, diagnostic.file.fileName).split(path.sep).join('/')]))].sort();
+for (const diagnostic of diagnostics) {
+  const location = diagnostic.file === undefined || diagnostic.start === undefined
+    ? '<global>'
+    : `${path.relative(root, diagnostic.file.fileName).split(path.sep).join('/')}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`;
+  process.stdout.write(`${location} TS${String(diagnostic.code)} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}\n`);
+}
+process.stdout.write(`SUMMARY config=${configArgument} diagnostics=${String(diagnostics.length)} paths=${String(paths.length)}\n`);
+for (const diagnosticPath of paths) process.stdout.write(`PATH ${diagnosticPath}\n`);
diff --git a/.tmp/elevation-r4-manifest-audit.mjs b/.tmp/elevation-r4-manifest-audit.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..a52fddd00e07e34c51fbd785235fb32e85d4144d
--- /dev/null
+++ b/.tmp/elevation-r4-manifest-audit.mjs
@@ -0,0 +1,58 @@
+import fs from 'node:fs';
+import { execFileSync } from 'node:child_process';
+
+const planPath = '.tmp-plans/2026-09-16-elevation-02-plan.md';
+const lines = fs.readFileSync(planPath, 'utf8').split('\n');
+const batches = [];
+let header = '';
+for (let index = 0; index < lines.length; index += 1) {
+  if (/^#{3,4} /.test(lines[index])) header = lines[index];
+  if (!/^Allowed(?: files)?:/.test(lines[index])) continue;
+  let block = lines[index];
+  for (let tail = index + 1; tail < lines.length && lines[tail].trim() !== ''; tail += 1) {
+    block += `\n${lines[tail]}`;
+  }
+  const paths = [...block.matchAll(/`((?:docs|src|tests|tools)\/[^`]+)`/g)].map((match) => match[1]);
+  batches.push({ header, paths });
+}
+
+function overlayPaths(script, root) {
+  const output = execFileSync(process.execPath, [script, root, 'tsconfig.node.json'], {
+    encoding: 'utf8',
+    maxBuffer: 64 * 1024 * 1024,
+  });
+  return output.split('\n').filter((line) => line.startsWith('PATH ')).map((line) => line.slice(5));
+}
+
+const traversal = new Set([
+  ...overlayPaths('.tmp/elevation-r3-traversal-overlay.mjs', '.'),
+  ...overlayPaths(
+    '.tmp/elevation-r3-traversal-overlay.mjs',
+    '/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static',
+  ),
+]);
+const distance = new Set(overlayPaths(
+  '.tmp/elevation-r4-distance-overlay.mjs',
+  '/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static',
+));
+const traversalOwned = new Set(batches
+  .filter((batch) => /^#### Batch 7A[0-9]/.test(batch.header))
+  .flatMap((batch) => batch.paths));
+const distanceOwned = new Set(batches
+  .filter((batch) => /^#### Batch 6A[0-4]/.test(batch.header))
+  .flatMap((batch) => batch.paths));
+const outside = (required, owned) => [...required].filter((path) => !owned.has(path)).sort();
+const uniquePaths = new Set(batches.flatMap((batch) => batch.paths));
+const sourceAndTestDistance = [...distance].filter((path) => !path.startsWith('tools/'));
+const overLimit = batches.filter((batch) => batch.paths.length > 10);
+
+console.log(`batches=${batches.length}`);
+console.log(`uniqueAllowedPaths=${uniquePaths.size}`);
+console.log(`maximumFiles=${Math.max(...batches.map((batch) => batch.paths.length))}`);
+console.log(`overLimit=${overLimit.length}`);
+console.log(`traversal=${traversal.size}/${traversal.size - outside(traversal, traversalOwned).length} outside=${outside(traversal, traversalOwned).length}`);
+console.log(`distanceSourceAndTest=${sourceAndTestDistance.length}/${sourceAndTestDistance.filter((path) => distanceOwned.has(path)).length} outside=${sourceAndTestDistance.filter((path) => !distanceOwned.has(path)).length}`);
+console.log(`distanceCompiler=${distance.size}/${distance.size - outside(distance, distanceOwned).length} outside=${outside(distance, distanceOwned).length}`);
+if (overLimit.length > 0 || outside(traversal, traversalOwned).length > 0 || outside(distance, distanceOwned).length > 0) {
+  process.exitCode = 1;
+}
