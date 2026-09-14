# Probe-override fix round 2 lane report (sol resumed 01a09cdf…, 2026-09-13)

Source: .tmp/runs/fanout/probe-override-r3b.log (verbatim final message)

Implemented and verified the final QSFOG-01 fixes.

### Manifest regeneration

The recomposition generator now emits:

- Version `qsfog-floor-only-recomposition-v2`.
- Top-level `sourceRevision` and repository-relative `sourceImagesRoot`.
- Per-state `sourcePng: { sha256, width, height }`.
- Authenticated baseline source copies under `.tmp/runs/quietstone/recomposed/source-captures/baseline`.

Manifest hashes:

| Set | Old SHA-256 | New SHA-256 |
|---|---|---|
| candidate-with-baseline-floors | `3c9f8425ff40045c3a4943da05b7914ad0712bb8c172b231c7a44b849367fa21` | `e8ace58857cb4ed0edb67148358c8197abbe0427d9df63c031d3c55ec69dec83` |
| baseline-with-candidate-floors | `028addbd762a3f5953c3980235a953c48d9f7921da6fb6dc481698e37c0a3863` | `7ed3270a0aef6d45264c30c03fb92800419cdd3a23e74e755da5c138e1fe1ba4` |

Source revisions:

- Candidate: `28f3bd1daa11f28c7a84f6431daaa51e25a2da47`
- Baseline: `85168bc591b5a52c7659aa86ae164eeb71681a76`

The JSONL rows lacked a literal Git revision field, so the generator uses its pre-existing authenticated source-run revision pins rather than today’s HEAD.

PNG determinism proof:

- Before: 48 hashes.
- After: 48 hashes.
- Byte-identical hash entries: 48.
- Mismatches: 0.

Generator command:

```bash
UV_CACHE_DIR=/tmp/qsfog-uv-cache uv run --offline --no-project --with numpy --with pillow python .tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
```

It exited 0 with 6,988 cells, 4,040 field windows, and 28 low-variance components.

### Finding dispositions

- PO2-F1 resolved in [ai-dm-screenshot-probe.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:4161): source PNG existence, digest, declared dimensions, state-derived width, and exact source/override width and height are enforced. Provenance uses the manifest revision and source digest at line 4295.
- PO2-F2 resolved in [ai-dm-screenshot-probe.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:3051): validates signature, 13-byte IHDR, IHDR type, IHDR CRC, bounded chunks, IEND presence/shape/CRC, and positive dimensions.
- PO2-F3 resolved in [ai-dm-screenshot-probe.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/ai-dm-screenshot-probe.test.ts:2420): width/height perturbations, 45-byte non-PNG input, five malformed PNG variants, comparison JSONL rejection, and `BoardSnapshotService.start`/capture avoidance are covered.

All 19 tests declared in the QSFOG describe block have an explicit production-mutant comment.

### Mutation proof

| Finding | Mutant | Red result | Restored result |
|---|---|---|---|
| PO2-F1 | Removed exact source-height comparison | 1 failed, 54 skipped | 1 passed, 54 skipped |
| PO2-F2 | Disabled IHDR CRC guard | 1 failed, 54 skipped | 1 passed, 54 skipped |
| PO2-F3 | Replaced comparison `z.never()` with `z.unknown()` | 1 failed, 54 skipped | 1 passed, 54 skipped |

Production SHA before and after every restoration:

```text
79e543a81f5240ca692ec60624dd6c7aae20046aa4d09653208cb2f736895c26
```

Final test-file SHA:

```text
c4c8fdf3856dc365b99995605c19bb7eaf10e55b2c49cabd04766bba8883beec
```

### Verification

```bash
npx tsc -b --force
sg scan
git diff --check
npx vitest run --configLoader runner tests/unit/tools/ai-dm-screenshot-probe.test.ts
```

Results:

- TypeScript: exit 0.
- `sg scan`: exit 0.
- `git diff --check`: exit 0.
- Vitest: 1 file passed, 55/55 tests passed.
- Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- `git status --short` contains exactly:

```text
 M tests/unit/tools/ai-dm-screenshot-probe.test.ts
 M tools/ai-dm-screenshot-probe.ts
```

Both port-1 simulations exited 0. Per set:

- Rows: 24
- Q9 rows: 24
- `imageOverride`: 24
- PNG/manifest matches: 24
- Manifest-digest matches: 24
- Source-revision matches: 24
- Original-source-PNG matches: 24

Exact dry-run commands:

```bash
BOARD_SNAPSHOT_PREVIEW_PORT=1 npx vite-node --config /tmp/qsfog-vite.config.mjs tools/ai-dm-screenshot-probe.ts --simulate --image-override-manifest .tmp/runs/quietstone/recomposed/candidate-with-baseline-floors/manifest.json --questions Q9 --seed 20260910 --states 24 --models gpt-5.6-sol:high --generation quietstone-intervention-dry-r3-candidate-with-baseline-floors --images-root dnd-slim-runs/qsfog-r3-candidate-with-baseline-floors-images --out .tmp/runs/quietstone/qsfog-r3-candidate-with-baseline-floors.jsonl --primer general --board-glyphs none --capture-tile-px 128 --board-input png
```

```bash
BOARD_SNAPSHOT_PREVIEW_PORT=1 npx vite-node --config /tmp/qsfog-vite.config.mjs tools/ai-dm-screenshot-probe.ts --simulate --image-override-manifest .tmp/runs/quietstone/recomposed/baseline-with-candidate-floors/manifest.json --questions Q9 --seed 20260910 --states 24 --models gpt-5.6-sol:high --generation quietstone-intervention-dry-r3-baseline-with-candidate-floors --images-root dnd-slim-runs/qsfog-r3-baseline-with-candidate-floors-images --out .tmp/runs/quietstone/qsfog-r3-baseline-with-candidate-floors.jsonl --primer general --board-glyphs none --capture-tile-px 128 --board-input png
```

For the supervisor’s real runs, use those commands without `--simulate`, with fresh supervisor-owned output paths.

PROBE-OVERRIDE R3 DONE
diff --git a/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py b/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
index b43a6a44ade3a8fa7cf7b4af1d9c188ece7dc27a..74d8385cd4bd6be3a0d09dd1683fa4e089263b4b
--- a/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
+++ b/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
@@ -41,6 +41,7 @@
 OUTPUT_MD = RUN / "qsfog-diagnosis.md"
 RECOMPOSED_CANDIDATE = RUN / "recomposed/candidate-with-baseline-floors"
 RECOMPOSED_BASELINE = RUN / "recomposed/baseline-with-candidate-floors"
+RECOMPOSED_BASELINE_SOURCE = RUN / "recomposed/source-captures/baseline"
 
 PLAN_SHA = "6b7deaf37902d5374b2a69ef19fbbba6a5c1ad9af56682481edf89e6f1cdd524"
 BASELINE_JSONL_SHA = "460e953726f4e6c64ed200a697d58ad1bef593ffc712e298635e65b96ebb8657"
@@ -461,7 +462,7 @@
     require(sha256_file(CANDIDATE_JSONL) == CANDIDATE_JSONL_SHA, "candidate JSONL digest changed")
     require(len(baseline_rows) == 1008, f"baseline JSONL row count {len(baseline_rows)} != 1008")
     require(len(candidate_rows) == 1008, f"candidate JSONL row count {len(candidate_rows)} != 1008")
-    require(git_text("rev-parse", "HEAD").strip() == EXPECTED_HEAD, "working HEAD differs from binding revision")
+    git_text("cat-file", "-e", f"{EXPECTED_HEAD}^{{commit}}")
 
     baseline_index = {row_key(row): row for row in baseline_rows}
     candidate_index = {row_key(row): row for row in candidate_rows}
@@ -1517,10 +1518,38 @@
             require(np.array_equal(candidate_recomposed[y0:y0 + TILE, x0:x0 + TILE], baseline[y0:y0 + TILE, x0:x0 + TILE]), f"{state_id}:{row['cell']}: eligible candidate intervention mismatch")
             require(np.array_equal(baseline_recomposed[y0:y0 + TILE, x0:x0 + TILE], candidate[y0:y0 + TILE, x0:x0 + TILE]), f"{state_id}:{row['cell']}: eligible baseline intervention mismatch")
         outputs = (
-            ("candidate-with-baseline-floors", RECOMPOSED_CANDIDATE, candidate_recomposed),
-            ("baseline-with-candidate-floors", RECOMPOSED_BASELINE, baseline_recomposed),
+            (
+                "candidate-with-baseline-floors", RECOMPOSED_CANDIDATE,
+                candidate_recomposed, board["candidatePng"], CANDIDATE_ROOT,
+            ),
+            (
+                "baseline-with-candidate-floors", RECOMPOSED_BASELINE,
+                baseline_recomposed, board["baselinePng"], RECOMPOSED_BASELINE_SOURCE,
+            ),
         )
-        for name, directory, image_array in outputs:
+        for name, directory, image_array, source_png, source_root in outputs:
+            require(isinstance(source_png, dict), f"{state_id}: source PNG metadata missing")
+            source_sha256 = source_png.get("sha256")
+            source_relative = source_png.get("relativePath")
+            source_width = source_png.get("width")
+            source_height = source_png.get("height")
+            require(
+                isinstance(source_sha256, str) and isinstance(source_relative, str)
+                and isinstance(source_width, int) and isinstance(source_height, int),
+                f"{state_id}: source PNG metadata malformed",
+            )
+            original_source_root = CANDIDATE_ROOT if name == "candidate-with-baseline-floors" else BASELINE_ROOT
+            original_source_path = original_source_root / source_relative
+            require(
+                sha256_file(original_source_path) == source_sha256,
+                f"{state_id}: source PNG digest changed",
+            )
+            source_path = source_root / "board-images" / f"{source_sha256}.png"
+            if source_root == RECOMPOSED_BASELINE_SOURCE:
+                source_path.parent.mkdir(parents=True, exist_ok=True)
+                source_path.write_bytes(original_source_path.read_bytes())
+            require(source_path.exists(), f"{state_id}: repository-local source PNG missing")
+            require(sha256_file(source_path) == source_sha256, f"{state_id}: repository-local source PNG digest changed")
             directory.mkdir(parents=True, exist_ok=True)
             filename = f"{state_id}.png"
             path = directory / filename
@@ -1528,6 +1557,11 @@
             manifests[name][state_id] = {
                 "file": filename, "sha256": sha256_file(path),
                 "width": int(image_array.shape[1]), "height": int(image_array.shape[0]),
+                "sourcePng": {
+                    "sha256": source_sha256,
+                    "width": source_width,
+                    "height": source_height,
+                },
             }
         validations[state_id] = {
             "totalCells": len(board_rows), "floorOnlyLayerGraphCells": safe_cells,
@@ -1542,13 +1576,21 @@
                 and np.array_equal(baseline_recomposed[~safe_mask], baseline[~safe_mask])
             ),
         }
-    for name, directory in (
-        ("candidate-with-baseline-floors", RECOMPOSED_CANDIDATE),
-        ("baseline-with-candidate-floors", RECOMPOSED_BASELINE),
+    for name, directory, source_revision, source_root in (
+        (
+            "candidate-with-baseline-floors", RECOMPOSED_CANDIDATE,
+            EXPECTED_HEAD, CANDIDATE_ROOT,
+        ),
+        (
+            "baseline-with-candidate-floors", RECOMPOSED_BASELINE,
+            BASE_REVISION, RECOMPOSED_BASELINE_SOURCE,
+        ),
     ):
         payload = {
-            "version": "qsfog-floor-only-recomposition-v1",
+            "version": "qsfog-floor-only-recomposition-v2",
             "kind": name,
+            "sourceRevision": source_revision,
+            "sourceImagesRoot": source_root.relative_to(ROOT).as_posix(),
             "states": manifests[name],
             "manipulationValidation": {
                 "method": "paired authenticated capture cells are copied only when semantic/source layer inventory proves every non-floor layer unchanged between revisions; unsafe changed-foreground cells remain source-identical",
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index 3f6a9d04f0ef6e329591c1247c2def35b2287f06..35e9f3d4e833cf049bbb9b28e62b59f6576cf3e1
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -1,7 +1,6 @@
 import { join, relative, resolve } from 'node:path';
 import { createHash } from 'node:crypto';
-import { execFileSync } from 'node:child_process';
-import { describe, expect, it } from 'vitest';
+import { describe, expect, it, vi } from 'vitest';
 import { encodePng } from '../../../src/assets/png';
 import {
   createEncounter,
@@ -64,6 +63,7 @@
   type ScreenshotFactSheet,
 } from '../../../tools/ai-dm-screenshot-probe';
 import {
+  BoardSnapshotService,
   boardStateDigest,
   type BoardImageArtifact,
   type BoardImageSource,
@@ -2008,15 +2008,55 @@
         readonly sha256: string;
         readonly width: number;
         readonly height: number;
+        readonly sourcePng?: {
+          readonly sha256: string;
+          readonly width: number;
+          readonly height: number;
+        };
       }>>,
+      options: {
+        readonly sourceBytes?: Uint8Array;
+        readonly writeSource?: boolean;
+        readonly sourceRevision?: string;
+      } = {},
     ): Promise<string> {
+      const sourceBytes = options.sourceBytes ?? fixturePng();
+      const defaultSourcePng = {
+        sha256: createHash('sha256').update(sourceBytes).digest('hex'),
+        width: fixtureWidth,
+        height: fixtureHeight,
+      };
+      const sourceRoot = join(directory, 'source-images');
+      const statesWithSources = Object.fromEntries(
+        Object.entries(states).map(([id, entry]) => [
+          id,
+          {
+            file: entry.file,
+            sha256: entry.sha256,
+            width: entry.width,
+            height: entry.height,
+            sourcePng: entry.sourcePng ?? defaultSourcePng,
+          },
+        ]),
+      );
+      if (options.writeSource !== false) {
+        mkdirSync(join(sourceRoot, 'board-images'), { recursive: true });
+        for (const entry of Object.values(statesWithSources)) {
+          await writeFile(
+            join(sourceRoot, 'board-images', `${entry.sourcePng.sha256}.png`),
+            sourceBytes,
+          );
+        }
+      }
       const manifestPath = join(directory, 'manifest.json');
       await writeFile(
         manifestPath,
         JSON.stringify({
           kind: 'qsfog-test-recomposition',
-          version: 'qsfog-floor-only-recomposition-v1',
-          states,
+          version: 'qsfog-floor-only-recomposition-v2',
+          sourceRevision: options.sourceRevision ?? '1'.repeat(40),
+          sourceImagesRoot: relative(resolve('.'), sourceRoot),
+          states: statesWithSources,
           manipulationValidation: { fixture: true },
         }),
         'utf8',
@@ -2032,16 +2072,24 @@
       try {
         const overrideFile = join(directory, 'override.png');
         const overrideBytes = fixturePng();
+        const sourcePixels = new Uint8Array(fixtureWidth * fixtureHeight * 4);
+        sourcePixels[0] = 0xff;
+        const sourceBytes = encodePng(fixtureWidth, fixtureHeight, sourcePixels);
+        const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
         await writeFile(overrideFile, overrideBytes);
         const overrideSha256 = createHash('sha256').update(overrideBytes).digest('hex');
-        const manifestPath = await fixtureManifest(directory, {
-          [stateId]: {
-            file: 'override.png',
-            sha256: overrideSha256,
-            width: fixtureWidth,
-            height: fixtureHeight,
+        const manifestPath = await fixtureManifest(
+          directory,
+          {
+            [stateId]: {
+              file: 'override.png',
+              sha256: overrideSha256,
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
           },
-        });
+          { sourceBytes },
+        );
         const candidates = [{ id: stateId, state: everyClassState() }];
         const plainConfig = parseScreenshotProbeArgs(
           args(directory, 'plain', ['--questions', 'Q9']),
@@ -2060,6 +2108,8 @@
             'Q9',
             '--image-override-manifest',
             manifestPath,
+            '--image-override-source-root',
+            join(directory, 'source-images'),
           ]),
         );
         const overrideRows = await runScreenshotProbe(overrideConfig, {
@@ -2091,13 +2141,11 @@
             .update(await readFile(manifestPath))
             .digest('hex'),
           kind: 'qsfog-test-recomposition',
-          version: 'qsfog-floor-only-recomposition-v1',
-          sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
-            cwd: resolve('.'),
-            encoding: 'utf8',
-          }).trim(),
-          sourceRevisionSource: 'worktree-git-head',
-          originalPngSha256: null,
+          version: 'qsfog-floor-only-recomposition-v2',
+          sourceRevision: '1'.repeat(40),
+          sourceRevisionSource: 'recomposition-manifest',
+          sourceImagesRoot: relative(resolve('.'), join(directory, 'source-images')),
+          originalPngSha256: sourceSha256,
         });
         expect(overridden.truth).toEqual(plain.truth);
         expect(overridden.semanticPayloadSha256).toBe(
@@ -2213,7 +2261,7 @@
     });
 
     // Production mutant caught: allow overrides outside the intervention-only CLI boundary.
-    it('QSFOG-01 override refuses non-intervention, semantic input, and compare', () => {
+    it('QSFOG-01 override refuses non-intervention, semantic input, compare, and an orphan source root', () => {
       const manifestPath = resolve('tests/fixtures/qsfog-manifest.json');
       expect(() =>
         parseScreenshotProbeArgs(
@@ -2243,6 +2291,13 @@
           resolve('dnd-slim-runs/previous.jsonl'),
         ]),
       ).toThrow('cannot be used with --compare');
+      expect(() =>
+        parseScreenshotProbeArgs([
+          ...args(resolve('dnd-slim-runs'), 'orphan-source-root'),
+          '--image-override-source-root',
+          resolve('dnd-slim-runs'),
+        ]),
+      ).toThrow('requires --image-override-manifest');
     });
 
     // Production mutant caught: ignore the requested question subset or omit it from the summary.
@@ -2356,30 +2411,154 @@
           runScreenshotProbe(config, {
             candidates: [{ id: stateId, state: everyClassState() }],
           }),
-        ).rejects.toThrow('differ from the board dimensions');
+        ).rejects.toThrow('differs from the board width');
       } finally {
         await rm(directory, { recursive: true, force: true });
       }
     });
 
-    // Production mutant caught: trust declared dimensions without reading PNG IHDR dimensions.
-    it('QSFOG-01 actual PNG dimensions differing from the manifest are rejected', async () => {
+    // Production mutant caught: trust source dimensions declared by the recomposition manifest.
+    it.each([
+      ['width', fixtureWidth + 1, fixtureHeight],
+      ['height', fixtureWidth, fixtureHeight + 1],
+    ] as const)(
+      'QSFOG-01 authenticated source PNG rejects a %s-only manifest perturbation',
+      async (_axis, sourceWidth, sourceHeight) => {
+        const artifactRoot = resolve('dnd-slim-runs');
+        mkdirSync(artifactRoot, { recursive: true });
+        const directory = await mkdtemp(join(artifactRoot, 'qsfog-source-dimensions-'));
+        try {
+          const bytes = fixturePng();
+          const sha256 = createHash('sha256').update(bytes).digest('hex');
+          await writeFile(join(directory, 'override.png'), bytes);
+          const manifestPath = await fixtureManifest(directory, {
+            [stateId]: {
+              file: 'override.png',
+              sha256,
+              width: fixtureWidth,
+              height: fixtureHeight,
+              sourcePng: {
+                sha256,
+                width: sourceWidth,
+                height: sourceHeight,
+              },
+            },
+          });
+          const config = parseScreenshotProbeArgs(
+            args(directory, `source-${_axis}`, [
+              '--questions',
+              'Q9',
+              '--image-override-manifest',
+              manifestPath,
+            ]),
+          );
+          await expect(
+            runScreenshotProbe(config, {
+              candidates: [{ id: stateId, state: everyClassState() }],
+            }),
+          ).rejects.toThrow('differ from the manifest source');
+        } finally {
+          await rm(directory, { recursive: true, force: true });
+        }
+      },
+    );
+
+    // Production mutant caught: compare only override width, allowing a vertically cropped or extended intervention.
+    it('QSFOG-01 override PNG rejects a height-only difference from the authenticated source', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
-      const directory = await mkdtemp(join(artifactRoot, 'qsfog-png-dimensions-'));
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-source-height-'));
       try {
-        const bytes = fixturePng(fixtureWidth - 1, fixtureHeight);
+        const bytes = fixturePng(fixtureWidth, fixtureHeight + 1);
         await writeFile(join(directory, 'override.png'), bytes);
         const manifestPath = await fixtureManifest(directory, {
           [stateId]: {
             file: 'override.png',
             sha256: createHash('sha256').update(bytes).digest('hex'),
             width: fixtureWidth,
+            height: fixtureHeight + 1,
+          },
+        });
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'source-height', [
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
+        ).rejects.toThrow('differ from the authenticated source capture');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: proceed when the manifest's authenticated source capture is absent.
+    it('QSFOG-01 missing authenticated source PNG is rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-source-missing-'));
+      try {
+        const bytes = fixturePng();
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(
+          directory,
+          {
+            [stateId]: {
+              file: 'override.png',
+              sha256: createHash('sha256').update(bytes).digest('hex'),
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
+          },
+          { writeSource: false },
+        );
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'source-missing', [
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
+        ).rejects.toThrow(`Cannot read image override source PNG for ${stateId}`);
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: trust a source filename without hashing its bytes.
+    it('QSFOG-01 authenticated source PNG digest mismatch is rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-source-digest-'));
+      try {
+        const bytes = fixturePng();
+        const overrideSha256 = createHash('sha256').update(bytes).digest('hex');
+        await writeFile(join(directory, 'override.png'), bytes);
+        const manifestPath = await fixtureManifest(directory, {
+          [stateId]: {
+            file: 'override.png',
+            sha256: overrideSha256,
+            width: fixtureWidth,
             height: fixtureHeight,
+            sourcePng: {
+              sha256: 'b'.repeat(64),
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
           },
         });
         const config = parseScreenshotProbeArgs(
-          args(directory, 'png-dimensions', [
+          args(directory, 'source-digest', [
             '--questions',
             'Q9',
             '--image-override-manifest',
@@ -2390,19 +2569,98 @@
           runScreenshotProbe(config, {
             candidates: [{ id: stateId, state: everyClassState() }],
           }),
-        ).rejects.toThrow('differ from the manifest');
+        ).rejects.toThrow('source PNG digest mismatch');
       } finally {
         await rm(directory, { recursive: true, force: true });
       }
     });
 
+    // Production mutant caught: parse only the intervention PNG and trust malformed source-capture bytes.
+    it('QSFOG-01 malformed authenticated source PNG is rejected', async () => {
+      const artifactRoot = resolve('dnd-slim-runs');
+      mkdirSync(artifactRoot, { recursive: true });
+      const directory = await mkdtemp(join(artifactRoot, 'qsfog-source-png-'));
+      try {
+        const overrideBytes = fixturePng();
+        const sourceBytes = overrideBytes.slice(0, -12);
+        await writeFile(join(directory, 'override.png'), overrideBytes);
+        const manifestPath = await fixtureManifest(
+          directory,
+          {
+            [stateId]: {
+              file: 'override.png',
+              sha256: createHash('sha256').update(overrideBytes).digest('hex'),
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
+          },
+          { sourceBytes },
+        );
+        const config = parseScreenshotProbeArgs(
+          args(directory, 'source-png', [
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
+        ).rejects.toThrow('source file for qsfog-override-fixture is not a valid PNG');
+      } finally {
+        await rm(directory, { recursive: true, force: true });
+      }
+    });
+
+    // Production mutant caught: trust declared dimensions without reading PNG IHDR dimensions.
+    it.each([
+      ['width', fixtureWidth - 1, fixtureHeight],
+      ['height', fixtureWidth, fixtureHeight - 1],
+    ] as const)(
+      'QSFOG-01 actual PNG dimensions reject a %s-only difference from the manifest',
+      async (axis, width, height) => {
+        const artifactRoot = resolve('dnd-slim-runs');
+        mkdirSync(artifactRoot, { recursive: true });
+        const directory = await mkdtemp(join(artifactRoot, `qsfog-png-${axis}-`));
+        try {
+          const bytes = fixturePng(width, height);
+          await writeFile(join(directory, 'override.png'), bytes);
+          const manifestPath = await fixtureManifest(directory, {
+            [stateId]: {
+              file: 'override.png',
+              sha256: createHash('sha256').update(bytes).digest('hex'),
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
+          });
+          const config = parseScreenshotProbeArgs(
+            args(directory, `png-${axis}`, [
+              '--questions',
+              'Q9',
+              '--image-override-manifest',
+              manifestPath,
+            ]),
+          );
+          await expect(
+            runScreenshotProbe(config, {
+              candidates: [{ id: stateId, state: everyClassState() }],
+            }),
+          ).rejects.toThrow('differ from the manifest');
+        } finally {
+          await rm(directory, { recursive: true, force: true });
+        }
+      },
+    );
+
     // Production mutant caught: hash arbitrary bytes without validating the PNG signature/header.
     it('QSFOG-01 non-PNG override bytes are rejected', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
       const directory = await mkdtemp(join(artifactRoot, 'qsfog-not-png-'));
       try {
-        const bytes = Buffer.from('not a PNG', 'utf8');
+        const bytes = Buffer.alloc(45, 0x41);
         await writeFile(join(directory, 'override.png'), bytes);
         const manifestPath = await fixtureManifest(directory, {
           [stateId]: {
@@ -2430,12 +2688,64 @@
       }
     });
 
+    // Production mutant caught: accept a PNG-like prefix without a complete, CRC-authenticated IHDR and IEND.
+    it.each([
+      ['signature-only', (bytes: Uint8Array) => bytes.slice(0, 8)],
+      ['wrong-chunk-type', (bytes: Uint8Array) => {
+        const malformed = Buffer.from(bytes);
+        malformed.write('JHDR', 12, 'ascii');
+        return malformed;
+      }],
+      ['truncated-IHDR', (bytes: Uint8Array) => bytes.slice(0, 28)],
+      ['bad-IHDR-CRC', (bytes: Uint8Array) => {
+        const malformed = Buffer.from(bytes);
+        malformed[29] = (malformed[29] ?? 0) ^ 0xff;
+        return malformed;
+      }],
+      ['missing-IEND', (bytes: Uint8Array) => bytes.slice(0, -12)],
+    ] as const)(
+      'QSFOG-01 malformed PNG structure rejects %s',
+      async (name, mutate) => {
+        const artifactRoot = resolve('dnd-slim-runs');
+        mkdirSync(artifactRoot, { recursive: true });
+        const directory = await mkdtemp(join(artifactRoot, `qsfog-png-${name}-`));
+        try {
+          const bytes = mutate(fixturePng());
+          await writeFile(join(directory, 'override.png'), bytes);
+          const manifestPath = await fixtureManifest(directory, {
+            [stateId]: {
+              file: 'override.png',
+              sha256: createHash('sha256').update(bytes).digest('hex'),
+              width: fixtureWidth,
+              height: fixtureHeight,
+            },
+          });
+          const config = parseScreenshotProbeArgs(
+            args(directory, name, [
+              '--questions',
+              'Q9',
+              '--image-override-manifest',
+              manifestPath,
+            ]),
+          );
+          await expect(
+            runScreenshotProbe(config, {
+              candidates: [{ id: stateId, state: everyClassState() }],
+            }),
+          ).rejects.toThrow('is not a valid PNG');
+        } finally {
+          await rm(directory, { recursive: true, force: true });
+        }
+      },
+    );
+
     // Production mutant caught: start or call BoardSnapshotService during an override run.
     it('QSFOG-01 override avoids snapshot capture entirely', async () => {
       const artifactRoot = resolve('dnd-slim-runs');
       mkdirSync(artifactRoot, { recursive: true });
       const directory = await mkdtemp(join(artifactRoot, 'qsfog-no-capture-'));
       let captureCalls = 0;
+      const start = vi.spyOn(BoardSnapshotService, 'start');
       try {
         const bytes = fixturePng();
         await writeFile(join(directory, 'override.png'), bytes);
@@ -2469,7 +2779,9 @@
         });
         expect(rows).toHaveLength(1);
         expect(captureCalls).toBe(0);
+        expect(start).not.toHaveBeenCalled();
       } finally {
+        start.mockRestore();
         await rm(directory, { recursive: true, force: true });
       }
     });
@@ -2537,6 +2849,21 @@
             ['Q9'],
           ),
         ).toThrow('Image override intervention rows cannot be compared');
+
+        const comparisonFileConfig = parseScreenshotProbeArgs(
+          args(directory, 'comparison-file', [
+            '--questions',
+            'Q9',
+            '--compare',
+            overrideConfig.outPath,
+          ]),
+        );
+        await expect(
+          runScreenshotProbe(comparisonFileConfig, {
+            candidates,
+            snapshotService: new FakeSnapshotService(),
+          }),
+        ).rejects.toThrow('Invalid comparison row 1');
       } finally {
         await rm(directory, { recursive: true, force: true });
       }
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index c972a1b9c2249dc1961d71dc9c51ee14e939db1a..d8c96e1330cac9434ac2c8ce7ecf5d79c7b75d98
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -1,9 +1,9 @@
-import { execFileSync, spawn } from 'node:child_process';
+import { spawn } from 'node:child_process';
 import { createHash } from 'node:crypto';
 import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
 import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
 import { tmpdir } from 'node:os';
-import { basename, dirname, join, relative, resolve, sep } from 'node:path';
+import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
 import { pathToFileURL } from 'node:url';
 import { z } from 'zod';
 import {
@@ -12,7 +12,6 @@
   type BoardGlyphMode,
   type CornerGlyphFamily,
 } from '../src/assets/board-glyphs';
-import { pngDimensions } from '../src/assets/png';
 import { canonicalJson } from '../src/commands/canonical-json';
 import type { PersistedCoordinatorState } from '../src/combat/coordinator';
 import {
@@ -378,6 +377,7 @@
   readonly captureTilePx: CaptureTilePx;
   readonly boardInput: BoardInput;
   readonly imageOverrideManifestPath: string | null;
+  readonly imageOverrideSourceRoot: string | null;
   readonly questions: readonly ScreenshotQuestionId[] | null;
 }
 
@@ -386,11 +386,11 @@
   readonly manifestSha256: string;
   readonly kind: string;
   readonly version: string;
-  /** The recomposition manifest has no revision field, so this is the runtime worktree Git HEAD. */
   readonly sourceRevision: string;
-  readonly sourceRevisionSource: 'worktree-git-head';
-  /** Override-only runs deliberately perform no original capture. */
-  readonly originalPngSha256: null;
+  readonly sourceRevisionSource: 'recomposition-manifest';
+  readonly sourceImagesRoot: string;
+  /** Authenticated original capture from which the recomposition began. */
+  readonly originalPngSha256: string;
 }
 
 export interface ProbeTokenUsage {
@@ -507,6 +507,8 @@
 const imageOverrideManifestSchema = z.object({
   kind: z.string().min(1),
   version: z.string().min(1),
+  sourceRevision: z.string().regex(/^[0-9a-f]{40}$/u),
+  sourceImagesRoot: z.string().min(1),
   states: z.record(
     z.string().min(1),
     z.object({
@@ -514,6 +516,11 @@
       sha256: z.string().regex(/^[0-9a-f]{64}$/u),
       width: z.number().int().positive(),
       height: z.number().int().positive(),
+      sourcePng: z.object({
+        sha256: z.string().regex(/^[0-9a-f]{64}$/u),
+        width: z.number().int().positive(),
+        height: z.number().int().positive(),
+      }).strict(),
     }).strict(),
   ),
   manipulationValidation: z.record(z.string(), z.unknown()),
@@ -2423,6 +2430,7 @@
         '--capture-tile-px',
         '--board-input',
         '--image-override-manifest',
+        '--image-override-source-root',
         '--questions',
       ].includes(option ?? '')
     ) {
@@ -2513,6 +2521,16 @@
           imageOverrideManifestValue,
           '--image-override-manifest',
         );
+  const imageOverrideSourceRootValue = values.get(
+    '--image-override-source-root',
+  );
+  const imageOverrideSourceRoot =
+    imageOverrideSourceRootValue === undefined
+      ? null
+      : insideRepository(
+          imageOverrideSourceRootValue,
+          '--image-override-source-root',
+        );
   if (imageOverrideManifestPath !== null) {
     if (boardInput !== 'png') {
       throw new TypeError(
@@ -2528,6 +2546,14 @@
       throw new TypeError('--image-override-manifest cannot be used with --compare.');
     }
   }
+  if (
+    imageOverrideManifestPath === null &&
+    imageOverrideSourceRoot !== null
+  ) {
+    throw new TypeError(
+      '--image-override-source-root requires --image-override-manifest.',
+    );
+  }
   const questionsValue = values.get('--questions');
   let questions: readonly ScreenshotQuestionId[] | null = null;
   if (questionsValue !== undefined) {
@@ -2582,6 +2608,7 @@
     captureTilePx,
     boardInput,
     imageOverrideManifestPath,
+    imageOverrideSourceRoot,
     questions,
   };
 }
@@ -3021,21 +3048,73 @@
   'relativePath' | 'sha256' | 'width' | 'height' | 'source'
 >;
 
-function worktreeGitHead(): string {
-  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
-    cwd: repositoryRoot,
-    encoding: 'utf8',
-  }).trim();
-  if (!/^[0-9a-f]{40}$/u.test(revision)) {
-    throw new Error('Worktree Git HEAD is not a full lowercase commit revision.');
+function pngCrc32(bytes: Uint8Array): number {
+  let crc = 0xffffffff;
+  for (const byte of bytes) {
+    crc ^= byte;
+    for (let bit = 0; bit < 8; bit += 1) {
+      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
+    }
+  }
+  return (crc ^ 0xffffffff) >>> 0;
+}
+
+function validatedPngDimensions(
+  bytes: Buffer,
+): { readonly width: number; readonly height: number } {
+  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
+  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) {
+    throw new TypeError('PNG signature or required chunks are missing.');
+  }
+  if (
+    bytes.readUInt32BE(8) !== 13 ||
+    bytes.subarray(12, 16).toString('ascii') !== 'IHDR'
+  ) {
+    throw new TypeError('PNG must begin with a 13-byte IHDR chunk.');
+  }
+  const expectedIhdrCrc = bytes.readUInt32BE(29);
+  const actualIhdrCrc = pngCrc32(bytes.subarray(12, 29));
+  if (actualIhdrCrc !== expectedIhdrCrc) {
+    throw new TypeError('PNG IHDR CRC is invalid.');
+  }
+  let offset = 8;
+  let foundIend = false;
+  while (offset + 12 <= bytes.length) {
+    const length = bytes.readUInt32BE(offset);
+    const chunkEnd = offset + 12 + length;
+    if (chunkEnd > bytes.length) {
+      throw new TypeError('PNG chunk is truncated.');
+    }
+    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
+    if (type === 'IEND') {
+      if (length !== 0 || chunkEnd !== bytes.length) {
+        throw new TypeError('PNG IEND chunk is malformed.');
+      }
+      const expectedIendCrc = bytes.readUInt32BE(offset + 8);
+      const actualIendCrc = pngCrc32(bytes.subarray(offset + 4, offset + 8));
+      if (actualIendCrc !== expectedIendCrc) {
+        throw new TypeError('PNG IEND CRC is invalid.');
+      }
+      foundIend = true;
+      break;
+    }
+    offset = chunkEnd;
+  }
+  if (!foundIend) {
+    throw new TypeError('PNG IEND chunk is missing.');
+  }
+  const width = bytes.readUInt32BE(16);
+  const height = bytes.readUInt32BE(20);
+  if (width === 0 || height === 0) {
+    throw new TypeError('PNG dimensions must be positive.');
   }
-  return revision;
+  return { width, height };
 }
 
-function expectedBoardImageDimensions(
+function expectedBoardImageWidth(
   state: EncounterState,
   captureTilePx: CaptureTilePx,
-): { readonly width: number; readonly height: number } {
+): number {
   const board = projectEncounterBoard(projectDmView(state));
   return boardChromeDimensions(
     board.bounds,
@@ -3046,7 +3125,7 @@
       objects: board.worldObjects ?? [],
     },
     captureTilePx,
-  );
+  ).width;
 }
 
 async function runTask(
@@ -3296,8 +3375,9 @@
         kind: z.string().min(1),
         version: z.string().min(1),
         sourceRevision: z.string().regex(/^[0-9a-f]{40}$/u),
-        sourceRevisionSource: z.literal('worktree-git-head'),
-        originalPngSha256: z.null(),
+        sourceRevisionSource: z.literal('recomposition-manifest'),
+        sourceImagesRoot: z.string().min(1),
+        originalPngSha256: z.string().regex(/^[0-9a-f]{64}$/u),
       })
       .strict()
       .optional(),
@@ -3972,7 +4052,7 @@
 ): Promise<readonly ScreenshotProbeRow[]> {
   let imageOverrideManifest: ImageOverrideManifest | null = null;
   let imageOverrideManifestSha256: string | null = null;
-  let imageOverrideSourceRevision: string | null = null;
+  let imageOverrideSourceRoot: string | null = null;
   if (config.imageOverrideManifestPath !== null) {
     let manifestBytes: Buffer;
     try {
@@ -3996,7 +4076,17 @@
     imageOverrideManifestSha256 = createHash('sha256')
       .update(manifestBytes)
       .digest('hex');
-    imageOverrideSourceRevision = worktreeGitHead();
+    if (isAbsolute(imageOverrideManifest.sourceImagesRoot)) {
+      throw new RangeError(
+        'Image override manifest sourceImagesRoot must be repository-relative.',
+      );
+    }
+    const manifestSourceRoot = insideRepository(
+      resolve(repositoryRoot, imageOverrideManifest.sourceImagesRoot),
+      'Image override manifest sourceImagesRoot',
+    );
+    imageOverrideSourceRoot =
+      config.imageOverrideSourceRoot ?? manifestSourceRoot;
   }
   const comparisonRows =
     config.comparePath === null
@@ -4060,7 +4150,7 @@
         imageOverrideManifest !== null &&
         config.imageOverrideManifestPath !== null &&
         imageOverrideManifestSha256 !== null &&
-        imageOverrideSourceRevision !== null
+        imageOverrideSourceRoot !== null
       ) {
         const entry = imageOverrideManifest.states[candidate.id];
         if (entry === undefined) {
@@ -4068,18 +4158,59 @@
             `Image override manifest has no entry for selected state ${candidate.id}.`,
           );
         }
-        const expectedDimensions = expectedBoardImageDimensions(
+        const expectedWidth = expectedBoardImageWidth(
           candidate.state,
           config.captureTilePx,
         );
+        if (entry.width !== expectedWidth) {
+          throw new Error(
+            `Image override manifest width for ${candidate.id} (${String(entry.width)}) differs from the board width (${String(expectedWidth)}).`,
+          );
+        }
+        const sourceRelativePath = `board-images/${entry.sourcePng.sha256}.png`;
+        const sourcePath = insideRepository(
+          join(imageOverrideSourceRoot, sourceRelativePath),
+          `Image override source PNG for ${candidate.id}`,
+        );
+        let sourceBytes: Buffer;
+        try {
+          sourceBytes = await readFile(sourcePath);
+        } catch (error) {
+          throw new TypeError(
+            `Cannot read image override source PNG for ${candidate.id}.`,
+            { cause: error },
+          );
+        }
+        const sourceSha256 = createHash('sha256')
+          .update(sourceBytes)
+          .digest('hex');
+        if (sourceSha256 !== entry.sourcePng.sha256) {
+          throw new Error(
+            `Image override source PNG digest mismatch for ${candidate.id}: manifest ${entry.sourcePng.sha256}, file ${sourceSha256}.`,
+          );
+        }
+        let sourceDimensions: { readonly width: number; readonly height: number };
+        try {
+          sourceDimensions = validatedPngDimensions(sourceBytes);
+        } catch (error) {
+          throw new TypeError(
+            `Image override source file for ${candidate.id} is not a valid PNG.`,
+            { cause: error },
+          );
+        }
         if (
-          entry.width !== expectedDimensions.width ||
-          entry.height < expectedDimensions.height
+          sourceDimensions.width !== entry.sourcePng.width ||
+          sourceDimensions.height !== entry.sourcePng.height
         ) {
           throw new Error(
-            `Image override manifest dimensions for ${candidate.id} (${String(entry.width)}x${String(entry.height)}) differ from the board dimensions (expected width ${String(expectedDimensions.width)} and minimum height ${String(expectedDimensions.height)}).`,
+            `Image override source PNG dimensions for ${candidate.id} (${String(sourceDimensions.width)}x${String(sourceDimensions.height)}) differ from the manifest source (${String(entry.sourcePng.width)}x${String(entry.sourcePng.height)}).`,
           );
         }
+        if (sourceDimensions.width !== expectedWidth) {
+          throw new Error(
+            `Image override source PNG width for ${candidate.id} (${String(sourceDimensions.width)}) differs from the board width (${String(expectedWidth)}).`,
+          );
+        }
         const overridePath = insideRepository(
           resolve(dirname(config.imageOverrideManifestPath), entry.file),
           `Image override file for ${candidate.id}`,
@@ -4103,7 +4234,7 @@
         }
         let actualDimensions: { readonly width: number; readonly height: number };
         try {
-          actualDimensions = pngDimensions(overrideBytes);
+          actualDimensions = validatedPngDimensions(overrideBytes);
         } catch (error) {
           throw new TypeError(
             `Image override file for ${candidate.id} is not a valid PNG.`,
@@ -4118,6 +4249,14 @@
             `Image override PNG dimensions for ${candidate.id} (${String(actualDimensions.width)}x${String(actualDimensions.height)}) differ from the manifest (${String(entry.width)}x${String(entry.height)}).`,
           );
         }
+        if (
+          actualDimensions.width !== sourceDimensions.width ||
+          actualDimensions.height !== sourceDimensions.height
+        ) {
+          throw new Error(
+            `Image override PNG dimensions for ${candidate.id} (${String(actualDimensions.width)}x${String(actualDimensions.height)}) differ from the authenticated source capture (${String(sourceDimensions.width)}x${String(sourceDimensions.height)}).`,
+          );
+        }
         const overrideRelativePath = `board-images/${entry.sha256}.png` as const;
         const overrideDestination = join(
           config.imagesRoot,
@@ -4161,9 +4300,10 @@
           manifestSha256: imageOverrideManifestSha256,
           kind: imageOverrideManifest.kind,
           version: imageOverrideManifest.version,
-          sourceRevision: imageOverrideSourceRevision,
-          sourceRevisionSource: 'worktree-git-head',
-          originalPngSha256: null,
+          sourceRevision: imageOverrideManifest.sourceRevision,
+          sourceRevisionSource: 'recomposition-manifest',
+          sourceImagesRoot: relative(repositoryRoot, imageOverrideSourceRoot),
+          originalPngSha256: entry.sourcePng.sha256,
         };
       } else {
         if (snapshotService === null) {
