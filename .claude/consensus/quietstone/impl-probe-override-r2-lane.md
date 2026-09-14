# Probe-override fix round 1 lane report (sol resumed 01a09cdf…, 2026-09-13)

Source: .tmp/runs/fanout/probe-override-r2.log (verbatim final message)

Implemented all six QSFOG-01 review fixes in the two authorized files.

Key changes:

- Override PNG signature and IHDR dimensions are validated.
- State projection enforces exact board width and minimum chrome height; PNG IHDR authenticates exact dimensions.
- Override runs never start or call `BoardSnapshotService`.
- Provenance now records manifest SHA-256 and runtime Git HEAD.
- `originalPngSha256` is explicitly `null` because no original capture occurs.
- Direct comparison validation rejects override rows on either side.
- Question lists are canonicalized to catalogue order.
- All 13 QSFOG tests identify the production mutant they catch.

Verification:

```text
npx tsc -b --force
```

Exit 0.

```text
sg scan
```

Exit 0.

```text
git diff --check
```

Exit 0.

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-screenshot-probe.test.ts
```

Result: 1 file passed, 43/43 tests passed.

Mutation checks:

| Finding | Representative mutant | Red result | Restored result |
|---|---|---:|---:|
| PO-F1 | Trust manifest dimensions instead of PNG IHDR | 1 failed, 42 skipped | 1 passed |
| PO-F2 | Record PNG digest as manifest digest | 1 failed, 42 skipped | 1 passed |
| PO-F3 | Call supplied snapshot service during override | 1 failed, 42 skipped | 1 passed |
| PO-F4 | Remove direct comparison rejection | 1 failed, 42 skipped | 1 passed |
| PO-F5 | Preserve CLI question order | 1 failed, 42 skipped | 1 passed |
| PO-F6 | Replace state-derived dimensions with manifest entry | 1 failed, 42 skipped | 1 passed |

The first mutation cycle restored production SHA `ececaa9a4d57fbaa742e04c39e5b1a1fcb6c983728894660285364e5926d9388` byte-identically. After the legitimate chrome minimum-height correction, PO-F6 was repeated and restored the final SHA byte-identically:

```text
ba8d8238db56068b83472b1246628145e2c001f5e447e86c2e3d2f432c190826
```

Successful no-snapshot dry run:

```bash
BOARD_SNAPSHOT_PREVIEW_PORT=1 npx vite-node --config /tmp/qsfog-vite.config.mjs tools/ai-dm-screenshot-probe.ts --simulate --image-override-manifest .tmp/runs/quietstone/recomposed/candidate-with-baseline-floors/manifest.json --questions Q9 --seed 20260910 --states 24 --models gpt-5.6-sol:high --generation quietstone-intervention-dry-r2 --images-root dnd-slim-runs/quietstone-intervention-dry-r2-images --out .tmp/runs/quietstone/intervention-dry-r2.jsonl --primer general --board-glyphs none --capture-tile-px 128 --board-input png
```

Results:

- Rows: 24
- Q9 rows: 24
- Rows with `imageOverride`: 24
- Per-state manifest PNG matches: 24
- Manifest digest matches: 24
- Runtime source-revision rows: 24
- Explicit null original-capture rows: 24
- JSONL SHA-256: `b290e63506d19860c57c3bd73a4bb33eca5a335a8e2abfff68d46fef61ea0818`

Final tracked status contains exactly:

```text
 M tests/unit/tools/ai-dm-screenshot-probe.test.ts
 M tools/ai-dm-screenshot-probe.ts
```

Frozen contract remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

PROBE-OVERRIDE R2 DONE
diff --git a//tmp/inspect-qsfog.ts b//tmp/inspect-qsfog.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cdf43a88b5813c09691a41a92ab022044b5ffeb7
--- /dev/null
+++ b//tmp/inspect-qsfog.ts
@@ -0,0 +1,16 @@
+import { defaultProbeStateCandidates } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe';
+import { projectEncounterBoard } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/encounter-board';
+import { projectDmView } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/combat/visibility';
+import { boardChromeDimensions, legendHeightPx } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/vtt/board-chrome-layout';
+
+const candidates = await defaultProbeStateCandidates();
+const manifest = JSON.parse(await (await import('node:fs/promises')).readFile('/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/recomposed/candidate-with-baseline-floors/manifest.json', 'utf8')) as { states: Record<string, { width: number; height: number }> };
+const output = candidates.map((candidate) => {
+  const board = projectEncounterBoard(projectDmView(candidate.state));
+  const combatants = board.combatants.filter((entry) => entry.placementStatus === 'placed');
+  const objects = board.worldObjects ?? [];
+  const dimensions = boardChromeDimensions(board.bounds, { combatants, objects }, 128);
+  const actual = manifest.states[candidate.id];
+  return { id: candidate.id, bounds: board.bounds, combatants: combatants.length, objects: objects.length, legend: legendHeightPx({ combatants, objects }, 128), expected: dimensions, actual, delta: actual === undefined ? null : actual.height - dimensions.height };
+});
+process.stdout.write(JSON.stringify(output, null, 2));
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index b1e05ee08dd0f754f700a5b04fe30bdc6f004aed..3f6a9d04f0ef6e329591c1247c2def35b2287f06
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -1,6 +1,8 @@
 import { join, relative, resolve } from 'node:path';
 import { createHash } from 'node:crypto';
+import { execFileSync } from 'node:child_process';
 import { describe, expect, it } from 'vitest';
+import { encodePng } from '../../../src/assets/png';
 import {
   createEncounter,
   type EncounterState,
@@ -16,6 +18,7 @@
   CELL_GLYPHS,
   GLYPH_FAMILY_CORNER,
 } from '../../../src/assets/board-glyphs';
+import { boardChromeDimensions } from '../../../src/vtt/board-chrome-layout';
 import {
   BOARD_GLYPH_PRIMER,
   GENERAL_PRIMER,
@@ -1947,9 +1950,31 @@
   describe('QSFOG-01 intervention image overrides and question restriction', () => {
     const stateId = 'qsfog-override-fixture';
     const realPngSha256 = 'a'.repeat(64);
-    const fixtureWidth = 192;
-    const fixtureHeight = 192;
+    const fixtureDimensions = boardChromeDimensions(
+      { columns: 6, rows: 4 },
+      {
+        combatants: [
+          { name: 'screenshot-hero' },
+          { name: 'screenshot-foe' },
+        ],
+        objects: [
+          { kind: 'door' },
+          { kind: 'door' },
+          { kind: 'generic' },
+        ],
+      },
+      128,
+    );
+    const fixtureWidth = fixtureDimensions.width;
+    const fixtureHeight = fixtureDimensions.height;
 
+    function fixturePng(
+      width = fixtureWidth,
+      height = fixtureHeight,
+    ): Uint8Array {
+      return encodePng(width, height, new Uint8Array(width * height * 4));
+    }
+
     function args(
       directory: string,
       name: string,
@@ -1999,13 +2024,14 @@
       return manifestPath;
     }
 
-    it('QSFOG-01 override applied preserves truth, semantic payload, and state digest', async () => {
+    // Production mutant caught: omit override provenance or substitute its PNG metadata.
+    it('QSFOG-01 override applied preserves truth, semantic payload, state digest, and authenticated provenance', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
       const directory = await mkdtemp(join(artifactRoot, 'qsfog-override-applied-'));
       try {
         const overrideFile = join(directory, 'override.png');
-        const overrideBytes = await readFile(resolve('public/icons/app-icon-192.png'));
+        const overrideBytes = fixturePng();
         await writeFile(overrideFile, overrideBytes);
         const overrideSha256 = createHash('sha256').update(overrideBytes).digest('hex');
         const manifestPath = await fixtureManifest(directory, {
@@ -2061,9 +2087,17 @@
         });
         expect(overridden.imageOverride).toEqual({
           manifestPath: relative(resolve('.'), manifestPath),
+          manifestSha256: createHash('sha256')
+            .update(await readFile(manifestPath))
+            .digest('hex'),
           kind: 'qsfog-test-recomposition',
           version: 'qsfog-floor-only-recomposition-v1',
-          originalPngSha256: realPngSha256,
+          sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
+            cwd: resolve('.'),
+            encoding: 'utf8',
+          }).trim(),
+          sourceRevisionSource: 'worktree-git-head',
+          originalPngSha256: null,
         });
         expect(overridden.truth).toEqual(plain.truth);
         expect(overridden.semanticPayloadSha256).toBe(
@@ -2084,6 +2118,7 @@
       }
     });
 
+    // Production mutant caught: permit a selected state absent from the override manifest.
     it('QSFOG-01 missing override state errors before any answer', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
@@ -2126,13 +2161,14 @@
       }
     });
 
+    // Production mutant caught: trust a manifest digest without hashing the override file.
     it('QSFOG-01 override digest mismatch errors before any answer', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
       const directory = await mkdtemp(join(artifactRoot, 'qsfog-override-digest-'));
       let answerCalls = 0;
       try {
-        await writeFile(join(directory, 'override.png'), 'digest fixture', 'utf8');
+        await writeFile(join(directory, 'override.png'), fixturePng());
         const manifestPath = await fixtureManifest(directory, {
           [stateId]: {
             file: 'override.png',
@@ -2176,6 +2212,7 @@
       }
     });
 
+    // Production mutant caught: allow overrides outside the intervention-only CLI boundary.
     it('QSFOG-01 override refuses non-intervention, semantic input, and compare', () => {
       const manifestPath = resolve('tests/fixtures/qsfog-manifest.json');
       expect(() =>
@@ -2208,6 +2245,7 @@
       ).toThrow('cannot be used with --compare');
     });
 
+    // Production mutant caught: ignore the requested question subset or omit it from the summary.
     it('QSFOG-01 questions Q9 yields only Q9 rows and names the restriction', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
@@ -2230,6 +2268,7 @@
       }
     });
 
+    // Production mutant caught: accept an empty or out-of-catalogue question selection.
     it('QSFOG-01 unknown and empty question ids are rejected', () => {
       expect(() =>
         parseScreenshotProbeArgs(
@@ -2242,5 +2281,307 @@
         ),
       ).toThrow('one or more question ids');
     });
+
+    // Production mutant caught: let a missing override file reach answer dispatch.
+    it('QSFOG-01 missing override file errors before any answer', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-file-missing-'));
+      let answerCalls = 0;
+      try {
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'absent.png',
+            sha256: 'b'.repeat(64),
+            width: fixtureWidth,
+            height: fixtureHeight,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'file-missing', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        await expect(
+          runScreenshotProbe(config, {
+            candidates: [{ id: stateId, state: everyClassState() }],
+            answerer: {
+              answer(request) {
+                answerCalls += 1;
+                return Promise.resolve({
+                  rawAnswer: JSON.stringify(request.truth),
+                  wallMs: 0,
+                  tokens: null,
+                  error: null,
+                });
+              },
+            },
+          }),
+        ).rejects.toThrow(`Cannot read image override file for ${stateId}`);
+        expect(answerCalls).toBe(0);
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: delete the state-derived board-dimension guard.
+    it('QSFOG-01 manifest dimensions differing from the board are rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-board-dimensions-'));
+      try {
+        const width = fixtureWidth - 1;
+        const bytes = fixturePng(width, fixtureHeight);
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: createHash('sha256').update(bytes).digest('hex'),
+            width,
+            height: fixtureHeight,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'board-dimensions', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        await expect(
+          runScreenshotProbe(config, {
+            candidates: [{ id: stateId, state: everyClassState() }],
+          }),
+        ).rejects.toThrow('differ from the board dimensions');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: trust declared dimensions without reading PNG IHDR dimensions.
+    it('QSFOG-01 actual PNG dimensions differing from the manifest are rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-png-dimensions-'));
+      try {
+        const bytes = fixturePng(fixtureWidth - 1, fixtureHeight);
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: createHash('sha256').update(bytes).digest('hex'),
+            width: fixtureWidth,
+            height: fixtureHeight,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'png-dimensions', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        await expect(
+          runScreenshotProbe(config, {
+            candidates: [{ id: stateId, state: everyClassState() }],
+          }),
+        ).rejects.toThrow('differ from the manifest');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: hash arbitrary bytes without validating the PNG signature/header.
+    it('QSFOG-01 non-PNG override bytes are rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-not-png-'));
+      try {
+        const bytes = Buffer.from('not a PNG', 'utf8');
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: createHash('sha256').update(bytes).digest('hex'),
+            width: fixtureWidth,
+            height: fixtureHeight,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'not-png', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        await expect(
+          runScreenshotProbe(config, {
+            candidates: [{ id: stateId, state: everyClassState() }],
+          }),
+        ).rejects.toThrow('is not a valid PNG');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: start or call BoardSnapshotService during an override run.
+    it('QSFOG-01 override avoids snapshot capture entirely', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-no-capture-'));
+      let captureCalls = 0;
+      try {
+        const bytes = fixturePng();
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: createHash('sha256').update(bytes).digest('hex'),
+            width: fixtureWidth,
+            height: fixtureHeight,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'no-capture', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        const rows = await runScreenshotProbe(config, {
+          candidates: [{ id: stateId, state: everyClassState() }],
+          snapshotService: {
+            capture() {
+              captureCalls += 1;
+              return Promise.reject(new Error('snapshot capture must not run'));
+            },
+            close() {
+              return Promise.resolve();
+            },
+          },
+        });
+        expect(rows).toHaveLength(1);
+        expect(captureCalls).toBe(0);
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: reject overrides only while parsing a comparison file.
+    it('QSFOG-01 direct acceptance comparison rejects override rows on both sides', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-direct-compare-'));
+      try {
+        const bytes = fixturePng();
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: createHash('sha256').update(bytes).digest('hex'),
+            width: fixtureWidth,
+            height: fixtureHeight,
+          },
+        });
+        const candidates = [{ id: stateId, state: everyClassState() }];
+        const overrideConfig = parseScreenshotProbeArgs(
+          args(directory, 'override-rows', [
+            '--questions',
+            'Q9',
+            '--image-override-manifest',
+            manifestPath,
+          ]),
+        );
+        const overrideRows = await runScreenshotProbe(overrideConfig, {
+          candidates,
+        });
+        const plainConfig = parseScreenshotProbeArgs(
+          args(directory, 'plain-rows', ['--questions', 'Q9']),
+        );
+        const plainRows = await runScreenshotProbe(plainConfig, {
+          candidates,
+          snapshotService: new FakeSnapshotService(),
+        });
+
+        expect(() =>
+          renderProbeSummary(
+            overrideRows,
+            plainRows,
+            0,
+            'acceptance',
+            ['Q9'],
+          ),
+        ).toThrow('Image override intervention rows cannot be compared');
+        expect(() =>
+          renderProbeSummary(
+            plainRows,
+            overrideRows,
+            0,
+            'acceptance',
+            ['Q9'],
+          ),
+        ).toThrow('Image override intervention rows cannot be compared');
+        expect(() =>
+          renderProbeSummary(
+            overrideRows,
+            overrideRows,
+            0,
+            'acceptance',
+            ['Q9'],
+          ),
+        ).toThrow('Image override intervention rows cannot be compared');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: preserve CLI ordering and compare it with catalogue ordering.
+    it('QSFOG-01 reordered questions have identical denominators and pass the restricted gate', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-question-order-'));
+      try {
+        const candidates = [{ id: stateId, state: everyClassState() }];
+        const reversedConfig = parseScreenshotProbeArgs(
+          args(directory, 'reversed', ['--questions', 'Q9,Q1']),
+        );
+        const canonicalConfig = parseScreenshotProbeArgs(
+          args(directory, 'canonical', ['--questions', 'Q1,Q9']),
+        );
+        expect(reversedConfig.questions).toEqual(['Q1', 'Q9']);
+        expect(canonicalConfig.questions).toEqual(['Q1', 'Q9']);
+        const reversedRows = await runScreenshotProbe(reversedConfig, {
+          candidates,
+          snapshotService: new FakeSnapshotService(),
+        });
+        const canonicalRows = await runScreenshotProbe(canonicalConfig, {
+          candidates,
+          snapshotService: new FakeSnapshotService(),
+        });
+        expect(reversedRows.map((row) => row.question)).toEqual(['Q1', 'Q9']);
+        expect(canonicalRows.map((row) => row.question)).toEqual(['Q1', 'Q9']);
+        expect(strictProbeGate(reversedRows, reversedConfig.questions)).toBe(true);
+        expect(strictProbeGate(canonicalRows, canonicalConfig.questions)).toBe(true);
+        for (const summaryPath of [
+          reversedConfig.summaryPath,
+          canonicalConfig.summaryPath,
+        ]) {
+          const summary = await readFile(summaryPath, 'utf8');
+          expect(summary).toContain('Question restriction: Q1, Q9.');
+          expect(summary).toContain('Strict selected classes >= 0.9: **PASS**');
+          expect(summary).toContain('| Q1 | 1.000 / 1 |');
+          expect(summary).toContain('| Q9 | 1.000 / 1 |');
+        }
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
   });
 });
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index 2ace43131c5a255982ad3e2b9684525439df39d3..c972a1b9c2249dc1961d71dc9c51ee14e939db1a
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -1,4 +1,4 @@
-import { spawn } from 'node:child_process';
+import { execFileSync, spawn } from 'node:child_process';
 import { createHash } from 'node:crypto';
 import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
 import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
@@ -12,6 +12,7 @@
   type BoardGlyphMode,
   type CornerGlyphFamily,
 } from '../src/assets/board-glyphs';
+import { pngDimensions } from '../src/assets/png';
 import { canonicalJson } from '../src/commands/canonical-json';
 import type { PersistedCoordinatorState } from '../src/combat/coordinator';
 import {
@@ -43,6 +44,7 @@
   type CreatureBadgeNumber,
   type HpBand,
 } from '../src/vtt/board-chrome';
+import { boardChromeDimensions } from '../src/vtt/board-chrome-layout';
 import { generateRoom } from '../src/vtt/room-generator';
 import {
   BoardSnapshotService,
@@ -381,9 +383,14 @@
 
 export interface ProbeImageOverride {
   readonly manifestPath: string;
+  readonly manifestSha256: string;
   readonly kind: string;
   readonly version: string;
-  readonly originalPngSha256: string;
+  /** The recomposition manifest has no revision field, so this is the runtime worktree Git HEAD. */
+  readonly sourceRevision: string;
+  readonly sourceRevisionSource: 'worktree-git-head';
+  /** Override-only runs deliberately perform no original capture. */
+  readonly originalPngSha256: null;
 }
 
 export interface ProbeTokenUsage {
@@ -2539,10 +2546,13 @@
         `--questions contains unknown question id ${unknown[0] ?? ''}.`,
       );
     }
-    questions = requested as readonly ScreenshotQuestionId[];
-    if (new Set(questions).size !== questions.length) {
+    const requestedQuestions = requested as readonly ScreenshotQuestionId[];
+    if (new Set(requestedQuestions).size !== requestedQuestions.length) {
       throw new TypeError('--questions cannot contain duplicate question ids.');
     }
+    questions = SCREENSHOT_QUESTION_IDS.filter((question) =>
+      requestedQuestions.includes(question),
+    );
     const availableQuestions =
       boardInput === 'png'
         ? SCREENSHOT_QUESTION_IDS
@@ -2994,7 +3004,7 @@
 
 interface ProbeTask {
   readonly candidate: ProbeStateCandidate;
-  readonly artifact: BoardImageArtifact;
+  readonly artifact: ProbeImageArtifact;
   readonly model: ProbeModelSpec;
   readonly question: ScreenshotQuestionId;
   readonly truth: ProbeAnswer;
@@ -3006,6 +3016,39 @@
   readonly imageOverride?: ProbeImageOverride;
 }
 
+type ProbeImageArtifact = Pick<
+  BoardImageArtifact,
+  'relativePath' | 'sha256' | 'width' | 'height' | 'source'
+>;
+
+function worktreeGitHead(): string {
+  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
+    cwd: repositoryRoot,
+    encoding: 'utf8',
+  }).trim();
+  if (!/^[0-9a-f]{40}$/u.test(revision)) {
+    throw new Error('Worktree Git HEAD is not a full lowercase commit revision.');
+  }
+  return revision;
+}
+
+function expectedBoardImageDimensions(
+  state: EncounterState,
+  captureTilePx: CaptureTilePx,
+): { readonly width: number; readonly height: number } {
+  const board = projectEncounterBoard(projectDmView(state));
+  return boardChromeDimensions(
+    board.bounds,
+    {
+      combatants: board.combatants.filter(
+        (combatant) => combatant.placementStatus === 'placed',
+      ),
+      objects: board.worldObjects ?? [],
+    },
+    captureTilePx,
+  );
+}
+
 async function runTask(
   task: ProbeTask,
   answerer: ProbeAnswerer,
@@ -3163,6 +3206,7 @@
   readonly boardInput: BoardInput;
   readonly semanticPayloadSha256: string | null;
   readonly png: { readonly sha256: string };
+  readonly imageOverride?: ProbeImageOverride | undefined;
   readonly truth: unknown;
   readonly score: number | null;
 }
@@ -3248,9 +3292,12 @@
     imageOverride: z
       .object({
         manifestPath: z.string().min(1),
+        manifestSha256: z.string().regex(/^[0-9a-f]{64}$/u),
         kind: z.string().min(1),
         version: z.string().min(1),
-        originalPngSha256: z.string().regex(/^[0-9a-f]{64}$/u),
+        sourceRevision: z.string().regex(/^[0-9a-f]{40}$/u),
+        sourceRevisionSource: z.literal('worktree-git-head'),
+        originalPngSha256: z.null(),
       })
       .strict()
       .optional(),
@@ -3499,6 +3546,12 @@
   previousRows: readonly ComparisonProbeRow[],
   mode: ComparisonMode,
 ): void {
+  if (
+    rows.some((row) => row.imageOverride !== undefined) ||
+    previousRows.some((row) => row.imageOverride !== undefined)
+  ) {
+    throw new TypeError('Image override intervention rows cannot be compared.');
+  }
   if (rows.some((row) => row.score === null) || previousRows.some((row) => row.score === null)) {
     throw new TypeError('Blocked transport rows cannot be compared.');
   }
@@ -3918,19 +3971,32 @@
   dependencies: ScreenshotProbeDependencies = {},
 ): Promise<readonly ScreenshotProbeRow[]> {
   let imageOverrideManifest: ImageOverrideManifest | null = null;
+  let imageOverrideManifestSha256: string | null = null;
+  let imageOverrideSourceRevision: string | null = null;
   if (config.imageOverrideManifestPath !== null) {
+    let manifestBytes: Buffer;
+    try {
+      manifestBytes = await readFile(config.imageOverrideManifestPath);
+    } catch (error) {
+      throw new TypeError(
+        `Cannot read image override manifest ${relative(repositoryRoot, config.imageOverrideManifestPath)}.`,
+        { cause: error },
+      );
+    }
     let decoded: unknown;
     try {
-      decoded = JSON.parse(
-        await readFile(config.imageOverrideManifestPath, 'utf8'),
-      ) as unknown;
+      decoded = JSON.parse(manifestBytes.toString('utf8')) as unknown;
     } catch (error) {
       throw new TypeError(
-        `Cannot read image override manifest ${relative(repositoryRoot, config.imageOverrideManifestPath)}.`,
+        `Image override manifest ${relative(repositoryRoot, config.imageOverrideManifestPath)} is not valid JSON.`,
         { cause: error },
       );
     }
     imageOverrideManifest = imageOverrideManifestSchema.parse(decoded);
+    imageOverrideManifestSha256 = createHash('sha256')
+      .update(manifestBytes)
+      .digest('hex');
+    imageOverrideSourceRevision = worktreeGitHead();
   }
   const comparisonRows =
     config.comparePath === null
@@ -3954,15 +4020,18 @@
     config.stateCount,
   );
   const ownedService =
-    dependencies.snapshotService === undefined
+    imageOverrideManifest === null && dependencies.snapshotService === undefined
       ? await BoardSnapshotService.start({
           outputDirectory: config.imagesRoot,
           boardGlyphs: config.boardGlyphs,
           captureTilePx: config.captureTilePx,
         })
       : null;
-  const snapshotService = dependencies.snapshotService ?? ownedService;
-  if (snapshotService === null)
+  const snapshotService =
+    imageOverrideManifest === null
+      ? dependencies.snapshotService ?? ownedService
+      : null;
+  if (imageOverrideManifest === null && snapshotService === null)
     throw new Error('Screenshot probe has no snapshot service.');
   const answerer =
     dependencies.answerer ??
@@ -3972,7 +4041,7 @@
   try {
     const captured: Array<{
       readonly candidate: ProbeStateCandidate;
-      readonly artifact: BoardImageArtifact;
+      readonly artifact: ProbeImageArtifact;
       readonly sheet: ScreenshotFactSheet;
       readonly semanticPayload: string;
       readonly semanticPayloadSha256: string;
@@ -3985,15 +4054,13 @@
       if (candidate === undefined)
         throw new Error('Selected screenshot state vanished.');
       const source = boardSource(candidate.state, index + 1);
-      const artifact = await snapshotService.capture({
-        state: candidate.state,
-        source,
-      });
-      let selectedArtifact = artifact;
+      let artifact: ProbeImageArtifact;
       let imageOverride: ProbeImageOverride | undefined;
       if (
         imageOverrideManifest !== null &&
-        config.imageOverrideManifestPath !== null
+        config.imageOverrideManifestPath !== null &&
+        imageOverrideManifestSha256 !== null &&
+        imageOverrideSourceRevision !== null
       ) {
         const entry = imageOverrideManifest.states[candidate.id];
         if (entry === undefined) {
@@ -4001,16 +4068,31 @@
             `Image override manifest has no entry for selected state ${candidate.id}.`,
           );
         }
-        if (entry.width !== artifact.width || entry.height !== artifact.height) {
+        const expectedDimensions = expectedBoardImageDimensions(
+          candidate.state,
+          config.captureTilePx,
+        );
+        if (
+          entry.width !== expectedDimensions.width ||
+          entry.height < expectedDimensions.height
+        ) {
           throw new Error(
-            `Image override dimensions for ${candidate.id} (${String(entry.width)}x${String(entry.height)}) differ from the real capture (${String(artifact.width)}x${String(artifact.height)}).`,
+            `Image override manifest dimensions for ${candidate.id} (${String(entry.width)}x${String(entry.height)}) differ from the board dimensions (expected width ${String(expectedDimensions.width)} and minimum height ${String(expectedDimensions.height)}).`,
           );
         }
         const overridePath = insideRepository(
           resolve(dirname(config.imageOverrideManifestPath), entry.file),
           `Image override file for ${candidate.id}`,
         );
-        const overrideBytes = await readFile(overridePath);
+        let overrideBytes: Buffer;
+        try {
+          overrideBytes = await readFile(overridePath);
+        } catch (error) {
+          throw new TypeError(
+            `Cannot read image override file for ${candidate.id}.`,
+            { cause: error },
+          );
+        }
         const overrideSha256 = createHash('sha256')
           .update(overrideBytes)
           .digest('hex');
@@ -4019,6 +4101,23 @@
             `Image override digest mismatch for ${candidate.id}: manifest ${entry.sha256}, file ${overrideSha256}.`,
           );
         }
+        let actualDimensions: { readonly width: number; readonly height: number };
+        try {
+          actualDimensions = pngDimensions(overrideBytes);
+        } catch (error) {
+          throw new TypeError(
+            `Image override file for ${candidate.id} is not a valid PNG.`,
+            { cause: error },
+          );
+        }
+        if (
+          actualDimensions.width !== entry.width ||
+          actualDimensions.height !== entry.height
+        ) {
+          throw new Error(
+            `Image override PNG dimensions for ${candidate.id} (${String(actualDimensions.width)}x${String(actualDimensions.height)}) differ from the manifest (${String(entry.width)}x${String(entry.height)}).`,
+          );
+        }
         const overrideRelativePath = `board-images/${entry.sha256}.png` as const;
         const overrideDestination = join(
           config.imagesRoot,
@@ -4047,23 +4146,33 @@
             );
           }
         }
-        selectedArtifact = {
-          ...artifact,
+        artifact = {
           relativePath: overrideRelativePath,
           sha256: entry.sha256,
-          bytes: overrideBytes.byteLength,
           width: entry.width,
           height: entry.height,
+          source,
         };
         imageOverride = {
           manifestPath: relative(
             repositoryRoot,
             config.imageOverrideManifestPath,
           ),
+          manifestSha256: imageOverrideManifestSha256,
           kind: imageOverrideManifest.kind,
           version: imageOverrideManifest.version,
-          originalPngSha256: artifact.sha256,
+          sourceRevision: imageOverrideSourceRevision,
+          sourceRevisionSource: 'worktree-git-head',
+          originalPngSha256: null,
         };
+      } else {
+        if (snapshotService === null) {
+          throw new Error('Screenshot probe has no snapshot service.');
+        }
+        artifact = await snapshotService.capture({
+          state: candidate.state,
+          source,
+        });
       }
       const semanticPayload = semanticBoardJsonForProbeState(candidate.state);
       const semanticPayloadSha256 = createHash('sha256')
@@ -4081,7 +4190,7 @@
       }
       captured.push({
         candidate,
-        artifact: selectedArtifact,
+        artifact,
         sheet: deriveScreenshotFactSheet(
           candidate.state,
           candidate.desiredLineTier,
