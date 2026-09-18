# ELEVATION-02 plan r2 — sol report tail (resumed 01a0ab4f…)

 Q3. Which elevation facts are visible to a player?
+
+- **A — ordinary visible board labels (recommended):** expose ground tier cues
+  and edited public base labels, visible creature ground/flying cue and public
+  height label, and visible object height label through player projection, DOM,
+  accessibility, and screenshot metadata. Never expose provenance, unresolved
+  facts, hidden entities, line/query evidence, routes/scores, or the DM semantic
+  payload. This gives players the same readable geometry they can see on the
+  board while retaining the semantic boundary.
+- **B — tier cues only:** expose pit/floor/raised/flying visual/text categories
+  but omit exact feet and creature/object heights. This reduces leakage but makes
+  edited project values harder to reason about and requires audience-specific
+  labels/legend.
+- **C — no player elevation cues:** redact/substitute ordinary floor rendering
+  and omit elevation text/metadata. This is the strongest concealment but makes
+  player screenshots diverge materially from the battlefield and can obscure
+  legal movement/cover reasons.
+
+The choice is bounded to B4/B12–B15 files:
+`src/vtt/encounter-board.ts`, `src/vtt/encounter-projections.ts`,
+`src/vtt/semantic-board-payload.ts`, `src/vtt/accessible-board.ts`,
+`src/vtt/encounter-app.ts`, and their already-listed projection, stable-DOM,
+semantic, accessibility, screenshot, and browser specs. Author exactly one
+family: `Q3A-PLAYER-BOARD-LABELS-*`, `Q3B-PLAYER-TIERS-ONLY-*`, or
+`Q3C-PLAYER-NO-ELEVATION-*`. Each asserts projection→DOM→accessibility→metadata
+parity and has literal forbidden-field controls. Under all choices the DM
+semantic export never reaches a player channel, and D569 still permits a
+destination copied from the coordinate gutter while excluding offered-option
+information.
+
 ## 15. Planning probes and exact results
 
 Commands run from the planning worktree, with no source/test/docs edits and no
@@ -1191,11 +1754,18 @@
   | sed -n '848,870p;921,954p;11470,11496p;11712,11733p;11791,11812p;11880,11900p;12096,12121p;12192,12202p'
 ```
 
-Result refs: main `4a99570d…`, VIS `78ee31b0…`, OFFERS `1cacd8f0…`. Every
-file:line in §§1–7 was re-read through those commands. Branch-stat results were
-VIS **212 files, +7,477/−35,981** and OFFERS **127 files, +5,384/−873** relative
-to this worktree's main. Final pending VIS content was taken only from its frozen
-plan and D635 decision, not invented as landed code.
+Initial r2 refs: main `4a99570ddcda1d8e9d08dacb7264cb88d262f8c7`,
+reviewed/current-seam VIS `5492f782be1552cb7f6926b720e81508cac9aadf`, and
+OFFERS `1cacd8f036dbfc3d34dba34e453cef778d635a4d`. Every file:line in
+§§1–7 was re-read through those commands. The pre-seam VIS comparison point is
+`78ee31b0`; it is never called current. During the closing probe the moving VIS
+ref advanced to `9a3235da05b7fff5b3197e83f8c429809903be25`. These commands
+proved it is a descendant whose delta from `5492f782` is only
+`tests/unit/vtt/scene-snapshot.test.ts` (+21/−8); that file was also re-read with
+`git show claude/vis-field:tests/unit/vtt/scene-snapshot.test.ts | nl -ba`.
+Closing branch stats were VIS **214 files, +7,686/−35,989** and OFFERS
+**127 files, +5,384/−873** relative to main. Final pending VIS content is not
+invented: dispatch still records and probes the actually landed revision.
 
 ```sh
 /usr/bin/time -f 'TSC_APP wall=%e exit=%x' \
@@ -1204,9 +1774,9 @@
   npx tsc -p tsconfig.node.json --noEmit --pretty false
 ```
 
-Current-main result: app exit 0 / 15.72 s; node exit 0 / 28.50 s. Disposable
-`git archive claude/vis-field` snapshot result: app exit 0 / 14.85 s; node exit 0 /
-28.66 s.
+Current-main closing result: app exit 0 / **14.93 s**; node exit 0 /
+**28.47 s**. The earlier unmodified reviewed-VIS `5492f782` archive also exited
+0/0 (app 14.85 s; node 28.66 s).
 
 ```sh
 npx vitest run --configLoader runner --maxWorkers=1 --fileParallelism=false \
@@ -1218,23 +1788,72 @@
 Result: 4 files, 147/147 tests passed, exit 0; Vitest 91.36 s, process wall
 89.75 s.
 
-The identical command was then run from the disposable
-`.tmp/elevation-vis-probe` archive of `claude/vis-field` under `/usr/bin/time -f
-'VIS_TARGET wall=%e exit=%x'`. Result: 3 files passed / 1 failed, 145/147 tests
-passed, exit 1; Vitest 95.94 s, process wall 94.31 s. The two deterministic reds
-are the two semantic-board titles named in A23; no retry or normalization was
-performed.
+The identical command on historical pre-seam `78ee31b0` produced 3 files passed /
+1 failed, 145/147 tests passed, exit 1; Vitest 95.94 s, wall 94.31 s. On reviewed
+seam baseline `5492f782` it produced 2 files passed / 2 failed, **144/147** tests
+passed, exit 1; Vitest **104.42 s**, wall **102.73 s**: the same two semantic
+cutover reds plus `room generator los/cover > guarantees at least one productive
+action option for every non-incapacitated combatant on its turn` timing out at
+5 s. D544's sole unchanged-budget retry was:
+
+```sh
+/usr/bin/time -f 'VIS_RETRY wall=%e exit=%x' npx vitest run \
+  --configLoader runner --maxWorkers=1 --fileParallelism=false \
+  tests/unit/vtt/room-generator-los-cover.test.ts \
+  -t 'guarantees at least one productive action option for every non-incapacitated combatant on its turn'
+```
+
+It failed again: 1 failed/110 skipped, test 5.082 s, wall 9.04 s, exit 1.
+Therefore it is not labelled a load flake; the final VIS landing must make this
+probe green before ELEVATION dispatch.
+
+The declaration-only overlay is `.tmp/elevation-r2-overlay.mjs`, a TypeScript
+`CompilerHost.readFile` overlay; it does not edit a source checkout. It replaces
+`CombatRulesProfile.speed` with required `movementSpeeds`, requires normalized
+`WorldObject.height`, adds `CombatToken.altitude`, and requires
+`EncounterState.spatial`. Exact invocations, once for each root and each config:
+
+```sh
+/usr/bin/time -f 'OVERLAY wall=%e exit=%x' node .tmp/elevation-r2-overlay.mjs \
+  <root> tsconfig.app.json
+/usr/bin/time -f 'OVERLAY wall=%e exit=%x' node .tmp/elevation-r2-overlay.mjs \
+  <root> tsconfig.node.json
+```
+
+`<root>` was `.`, `.tmp/r2-overlay-vis-5492f782`, and
+`.tmp/r2-overlay-offers-1cacd8f0`. Results were:
+
+| Shape | App diagnostics / paths / wall | Node diagnostics / paths / wall |
+|---|---:|---:|
+| main `4a99570d` | 47 / 19 / 16.43 s | 79 / 41 / 33.11 s |
+| VIS `5492f782` | 47 / 19 / 16.62 s | 80 / 42 / 32.41 s |
+| OFFERS `1cacd8f0` | 47 / 19 / 16.74 s | 79 / 41 / 32.62 s |
+
+All overlay runs intentionally exit nonzero at the diagnostic layer. The sorted
+union is the 42-path list in §3. This exact read-only manifest audit was run:
+
+```sh
+node - <<'NODE'
+// Read the plan; slice Batch 1 through Batch 5C; compare the literal 42-path
+// overlay union with backticked Allowed paths; print counts and missing paths.
+NODE
+```
 
-The declaration-only compile overlay added required spatial/height/altitude/
-movement-set fields and removed scalar speed in disposable `.tmp` archives:
+It printed `overlayPaths: 42`, `assigned: 42`, `outsideTranche: 0`, `missing: []`.
+A second parser counted every `Allowed` paragraph: B0–B6 were
+`10,10,10,10,10,10,10,10,3,10`; B6A was 9; B7/B7A/B8/B9 were 10 each;
+B10–B15 were `9,10,10,10,10,7`. No executable batch exceeds ten files.
 
+The fraction probe used exact `BigInt` numerator/denominator arithmetic around
+`p(z,t)=e+(z-e)/t`. It printed:
+
 ```text
-main: app exit 2, 47 diagnostics; node exit 2, 79 diagnostics; 19 source paths
-VIS:  app exit 2, 47 diagnostics; node exit 2, 79 diagnostics; 19 source paths
+EDITED values=-9/2,-2/1,17/4,23/6 projection=-9/2..17/4 overlap=17/4 fraction=17/24
+FULL values=11/2,14/3,21/2,8/1 projection=14/3..21/2 overlap=16/3 fraction=8/15 tier=Half
+ENTRY values=11/2,21/2 projection=11/2..21/2 overlap=9/2 fraction=9/20 tier=none
 ```
 
-The five approved vertical witness calculations were independently recomputed
-from `p(z,t)` and are recorded in §5.2. No model, reviewer, agent, full suite,
-full gate, Playwright, build, or port 4173 action was used while authoring.
+No model, reviewer, agent, full suite, full gate, Playwright, build, or port 4173
+action was used while authoring.
 
-ELEVATION-02 PLAN DONE
+ELEVATION-02 PLAN R2 DONE
diff --git a/.tmp/elevation-r2-overlay.mjs b/.tmp/elevation-r2-overlay.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..4d185047c034889164ba7d769199d1789cec0b71
--- /dev/null
+++ b/.tmp/elevation-r2-overlay.mjs
@@ -0,0 +1,68 @@
+import path from 'node:path';
+import process from 'node:process';
+import ts from 'typescript';
+
+const [rootArgument, configArgument] = process.argv.slice(2);
+if (rootArgument === undefined || configArgument === undefined) {
+  throw new Error('usage: node elevation-r2-overlay.mjs <root> <tsconfig>');
+}
+const root = path.resolve(rootArgument);
+const configPath = path.join(root, configArgument);
+
+const replacements = new Map([
+  ['src/combat/combatant.ts', [
+    ['  readonly speed: Feet;', '  readonly movementSpeeds: unknown;'],
+    ['  readonly placementMode: SerializedPlacementMode;', '  readonly placementMode: SerializedPlacementMode;\n  readonly altitude: unknown;'],
+  ]],
+  ['src/combat/world-objects.ts', [
+    ['export interface WorldObject extends WorldObjectInput {\n  readonly createdRevision: number;', 'export interface WorldObject extends WorldObjectInput {\n  readonly height: unknown;\n  readonly createdRevision: number;'],
+  ]],
+  ['src/combat/encounter.ts', [
+    ['  readonly bounds: GridBounds;\n  readonly blockedCells:', '  readonly bounds: GridBounds;\n  readonly spatial: unknown;\n  readonly blockedCells:'],
+  ]],
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
+      throw new Error(`${relative}: overlay anchor must occur exactly once: ${before}`);
+    }
+    result = result.replace(before, after);
+  }
+  touched.add(relative);
+  return result;
+}
+
+const configRead = ts.readConfigFile(configPath, ts.sys.readFile);
+if (configRead.error !== undefined) throw new Error(ts.flattenDiagnosticMessageText(configRead.error.messageText, '\n'));
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

