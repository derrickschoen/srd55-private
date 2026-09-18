# ELEVATION-02 plan r3 — sol report tail (resumed 01a0ab4f…, 1.09 M tokens)

e delta from `5492f782` is only
 `tests/unit/vtt/scene-snapshot.test.ts` (+21/−8); that file was also re-read with
 `git show claude/vis-field:tests/unit/vtt/scene-snapshot.test.ts | nl -ba`.
-Closing branch stats were VIS **214 files, +7,686/−35,989** and OFFERS
-**127 files, +5,384/−873** relative to main. Final pending VIS content is not
-invented: dispatch still records and probes the actually landed revision.
+Those were r2-relative shapes. The r3 closing re-probe returned read-only main
+`9f1486665399571c57fdd82fa3745b1d8fca457a`, VIS
+`9a3235da05b7fff5b3197e83f8c429809903be25`, and OFFERS
+`1cacd8f036dbfc3d34dba34e453cef778d635a4d`; OFFERS is tree-identical to its
+merged main, while `git diff main claude/vis-field --stat` is **337 files,
++8,559/−41,373** because the branches have not yet undergone the required VIS
+OFFERS rebase/landing. Final pending VIS content is not invented: dispatch still
+records and probes the actually combined landed revision.
 
 ```sh
 /usr/bin/time -f 'TSC_APP wall=%e exit=%x' \
@@ -1832,6 +2245,21 @@
 Result: 4 files, 147/147 tests passed, exit 0; Vitest 91.36 s, process wall
 89.75 s.
 
+The proposed second D630 instrument was also proven to exist and complete real
+rounds on the planning main with its exact title:
+
+```sh
+/usr/bin/time -f 'ARENA_SEGMENTS wall=%e exit=%x' \
+  npx vitest run --configLoader runner --maxWorkers=1 --fileParallelism=false \
+  tests/unit/tools/ai-dm-arena.test.ts \
+  -t 'reloads the fixture and full context for each of three SIMULATED reps'
+```
+
+Result: 1 file passed, **1 passed / 56 skipped**, Vitest duration **39.51 s**,
+process wall **39.08 s**, exit **0** (test 99 ms, import 37.97 s). This is an
+existence/shape probe, not the landing baseline; the required base-first quiet-box
+A/B timing occurs after both VIS and OFFERS have landed.
+
 The identical command on historical pre-seam `78ee31b0` produced 3 files passed /
 1 failed, 145/147 tests passed, exit 1; Vitest 95.94 s, wall 94.31 s. On reviewed
 seam baseline `5492f782` it produced 2 files passed / 2 failed, **144/147** tests
@@ -1873,8 +2301,11 @@
 | VIS `5492f782` | 47 / 19 / 16.62 s | 80 / 42 / 32.41 s |
 | OFFERS `1cacd8f0` | 47 / 19 / 16.74 s | 79 / 41 / 32.62 s |
 
-All overlay runs intentionally exit nonzero at the diagnostic layer. The sorted
-union is the 42-path list in §3. This exact read-only manifest audit was run:
+All four-field overlay processes exited **0** because the script prints
+diagnostics as inventory and reserves nonzero for a broken overlay anchor or
+compiler-host failure. The printed diagnostics are the intended declaration-red
+result; only the real final TSC commands are a green gate. The sorted union is
+the 42-path list in §3. This exact read-only manifest audit was run:
 
 ```sh
 node - <<'NODE'
@@ -1884,10 +2315,49 @@
 ```
 
 It printed `overlayPaths: 42`, `assigned: 42`, `outsideTranche: 0`, `missing: []`.
-A second parser counted every `Allowed` paragraph: B0–B6 were
-`10,10,10,10,10,10,10,10,3,10`; B6A was 9; B7/B7A/B8/B9 were 10 each;
-B10–B15 were `9,10,10,10,10,7`. No executable batch exceeds ten files.
 
+The r3 traversal declaration probe is
+`.tmp/elevation-r3-traversal-overlay.mjs`. It declares the structural
+`EngineTraversalBinding` in `movement.ts`, requires that type on
+`EngineOfferEnvelope`, the canonical `EngineOfferableOption`, and
+`ResolvedTurnMechanics`, removes the latter's parallel path/cost/final fields,
+replaces `EncounterCommand.move.path` with required typed `traversal`, and makes
+no checkout edit. Exact commands were:
+
+```sh
+/usr/bin/time -f 'R3_TRAVERSAL_APP wall=%e exit=%x' \
+  node .tmp/elevation-r3-traversal-overlay.mjs <root> tsconfig.app.json
+/usr/bin/time -f 'R3_TRAVERSAL_NODE wall=%e exit=%x' \
+  node .tmp/elevation-r3-traversal-overlay.mjs <root> tsconfig.node.json
+```
+
+| Shape | App diagnostics / paths / wall / exit | Node diagnostics / paths / wall / exit |
+|---|---:|---:|
+| current worktree/main `4a99570d` | 85 / 30 / 13.81 s / 0 | 260 / 89 / 26.52 s / 0 |
+| VIS seam `5492f782` archive | 85 / 30 / 13.88 s / 0 | 260 / 89 / 26.79 s / 0 |
+| OFFERS `1cacd8f0` archive | 85 / 30 / 14.71 s / 0 | 257 / 89 / 26.42 s / 0 |
+
+Astra's minimal overlay reported 56/24 app and 207/73 node on its reviewed
+shape (`review-plan-r2-astra.md:11-17`). This reproduction declares the full
+typed `EngineTraversalBinding`, removes the cell-only command member, and also
+removes the parallel mechanics `path/movementCostFeet/finalPosition` members;
+those deliberate extra declaration changes expose more downstream consumers.
+The acceptance unit is the complete path union, not matching incidental
+contextual-error multiplicity. The shared 89-path superset is listed
+exhaustively by B7A0–B7A9: 30 production paths, 56 test paths, and three tool
+paths. The overlay exits 0 after printing the declaration-red inventory. At the
+B7A9 final declaration, the implementation repeats it with the actual final
+types, requires `outsideTranche: 0`, then runs real T-app/T-node and requires
+exit 0 with **zero diagnostics**.
+
+A closing parser counts every `Allowed` paragraph, asserts each batch contains
+at most ten paths, and compares the 89 traversal paths and 27 distance modules
+against B7A0–B7A9 and B6A0–B6A3 respectively. After the last substantive edit it
+printed: **33 batches; 217 unique allowed paths; maximum 10 files; 0 over-limit;
+89/89 traversal diagnostic paths assigned, 0 outside; 27/27 distance modules
+assigned, 0 outside**. The closing untouched-tree compiler probes were T-app
+exit 0 / **13.19 s** and T-node exit 0 / **28.16 s**.
+
 The fraction probe used exact `BigInt` numerator/denominator arithmetic around
 `p(z,t)=e+(z-e)/t`. It printed:
 
@@ -1900,4 +2370,4 @@
 No model, reviewer, agent, full suite, full gate, Playwright, build, or port 4173
 action was used while authoring.
 
-ELEVATION-02 PLAN R2 DONE
+ELEVATION-02 PLAN R3 DONE
diff --git a/.tmp/elevation-r3-traversal-overlay.mjs b/.tmp/elevation-r3-traversal-overlay.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..d2eaef05a4799e0fc1a5a8799ebfcea5411b78f5
--- /dev/null
+++ b/.tmp/elevation-r3-traversal-overlay.mjs
@@ -0,0 +1,94 @@
+import path from 'node:path';
+import ts from 'typescript';
+
+const [rootArgument, configArgument] = process.argv.slice(2);
+if (rootArgument === undefined || configArgument === undefined) {
+  throw new Error('usage: node elevation-r3-traversal-overlay.mjs <root> <tsconfig>');
+}
+const root = path.resolve(rootArgument);
+const configPath = path.join(root, configArgument);
+
+const replacements = new Map([
+  ['src/combat/movement.ts', [[
+    "import { feet, type Feet } from './values';\n\nexport type CellTraversal =",
+    "import { feet, type Feet } from './values';\nimport type { TokenAltitude } from './elevation';\n\nexport interface EngineMovementPosition { readonly cell: GridCell; readonly altitude: TokenAltitude }\nexport type EngineTraversalMode = 'walk' | 'climb' | 'swim' | 'fly' | 'jump' | 'fall' | 'burrow';\nexport interface EngineTraversalStep { readonly from: EngineMovementPosition; readonly to: EngineMovementPosition; readonly mode: EngineTraversalMode; readonly distanceFeet: Feet; readonly costFeet: Feet }\nexport interface EngineTraversalBinding { readonly initial: EngineMovementPosition; readonly steps: readonly EngineTraversalStep[]; readonly final: EngineMovementPosition; readonly spentFeet: Feet }\n\nexport type CellTraversal =",
+  ]]],
+  ['src/combat/events.ts', [[
+    "import type { SerializedPlacementMode } from './creature-space';",
+    "import type { SerializedPlacementMode } from './creature-space';\nimport type { EngineTraversalBinding } from './movement';",
+  ], [
+    "      readonly path: readonly GridCell[];\n      readonly cause: 'voluntary' | 'reactions_resolved' | 'forced' | 'teleport';",
+    "      readonly traversal: EngineTraversalBinding;\n      readonly cause: 'voluntary' | 'reactions_resolved' | 'forced' | 'teleport';",
+  ]]],
+  ['src/vtt/option-modeling.ts', [[
+    "import type { EncounterState } from '../combat/encounter';",
+    "import type { EncounterState } from '../combat/encounter';\nimport type { EngineTraversalBinding } from '../combat/movement';",
+  ], [
+    '  readonly movement: EngineMovementObjective;\n  readonly actionSlots: readonly EngineActionSlotUse[];',
+    '  readonly movement: EngineMovementObjective;\n  readonly traversal: EngineTraversalBinding;\n  readonly actionSlots: readonly EngineActionSlotUse[];',
+  ]]],
+  ['src/vtt/offers/offer-envelope.ts', [[
+    "import type { EncounterState } from '../../combat/encounter';",
+    "import type { EncounterState } from '../../combat/encounter';\nimport type { EngineTraversalBinding } from '../../combat/movement';",
+  ], [
+    '  readonly movement: EngineMovementObjective;\n  readonly resourceCostLabels: readonly string[];',
+    '  readonly movement: EngineMovementObjective;\n  readonly traversal: EngineTraversalBinding;\n  readonly resourceCostLabels: readonly string[];',
+  ], [
+    '      movement: offer.movement,\n      actionSlots: offer.binding.actionSlots,',
+    '      movement: offer.movement,\n      traversal: offer.traversal,\n      actionSlots: offer.binding.actionSlots,',
+  ]]],
+  ['src/vtt/turn-proposal.ts', [[
+    "import type { GridCell } from '../combat/grid';",
+    "import type { GridCell } from '../combat/grid';\nimport type { EngineTraversalBinding } from '../combat/movement';",
+  ], [
+    '  readonly movementCostFeet: number;\n  readonly path: readonly GridCell[];\n  readonly finalPosition: GridCell;',
+    '  readonly traversal: EngineTraversalBinding;',
+  ]]],
+]);
+
+const touched = new Set();
+function overlaidRead(fileName) {
+  const relative = path.relative(root, fileName).split(path.sep).join('/');
+  const edits = replacements.get(relative);
+  const source = ts.sys.readFile(fileName);
+  if (source === undefined || edits === undefined) return source;
+  let result = source;
+  for (const [before, after] of edits) {
+    const first = result.indexOf(before);
+    if (first < 0 || result.indexOf(before, first + before.length) >= 0) {
+      throw new Error(`${relative}: overlay anchor must occur exactly once`);
+    }
+    result = result.replace(before, after);
+  }
+  touched.add(relative);
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
+const paths = [...new Set(diagnostics.flatMap((diagnostic) => diagnostic.file === undefined
+  ? []
+  : [path.relative(root, diagnostic.file.fileName).split(path.sep).join('/')]))].sort();
+for (const required of replacements.keys()) {
+  if (!touched.has(required)) throw new Error(`${required}: overlay was not read by ${configArgument}`);
+}
+for (const diagnostic of diagnostics) {
+  const location = diagnostic.file === undefined || diagnostic.start === undefined
+    ? '<global>'
+    : `${path.relative(root, diagnostic.file.fileName).split(path.sep).join('/')}:${diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`;
+  process.stdout.write(`${location} TS${String(diagnostic.code)} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}\n`);
+}
+process.stdout.write(`SUMMARY config=${configArgument} diagnostics=${String(diagnostics.length)} paths=${String(paths.length)}\n`);
+for (const diagnosticPath of paths) process.stdout.write(`PATH ${diagnosticPath}\n`);
