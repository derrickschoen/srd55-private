Implemented S9a–S9d in the designated worktree without git writes, art generation, Playwright, full-suite gates, external reviewers, or owner-checkout mutations.

Key additions:

- RFC 9562 monotonic UUIDv7 generator and nine-request art outbox.
- Bounded PNG and completed-result validators.
- Descriptor-anchored `/proc/self/fd` staging with revalidation and manifest-last publication.
- Structured Windows interoperability probe and doctor integration.
- Six new unit specifications with the required negative controls.
- Central path policy now recognizes this S9 worktree.
- Existing art flow, public assets, docs, workers, S8 surfaces, fixtures, and frozen contracts remain untouched.

Generated requests:

- `01a08d2b-a462-7274-9a36-acbede665050.request.json` — tile
- `01a08d2b-a463-70d9-8a2b-a255069d6639.request.json` — wall
- `01a08d2b-a463-70da-b885-482854ce69e1.request.json` — door
- `01a08d2b-a463-70db-9f20-e89741e7c0cb.request.json` — barrel
- `01a08d2b-a463-70dc-8b0f-c989cd507140.request.json` — table
- `01a08d2b-a463-70dd-8039-7308891c3061.request.json` — pillar
- `01a08d2b-a463-70de-ab74-46f2e3b5f1a3.request.json` — torch
- `01a08d2b-a463-70df-9053-11fd22cc4e8e.request.json` — adventurer
- `01a08d2b-a463-70e0-a1a1-353cce2d993a.request.json` — goblin

All nine validate and no `.partial` files remain.

Verification:

- S9a Vitest command: 3 files, 13 tests passed.
- S9b Vitest command: 3 files, 17 tests passed.
- S9c Vitest command: 3 files, 18 tests passed.
- S9d Vitest command: 1 file, 5 tests passed.
- Cumulative 14 existing + 6 new specs:
  `npx vitest run --configLoader runner <20 named specs>`
  — 20 files, 165 tests passed.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:request -- --check`
  — 9 requests verified.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:validate -- --check`
  — 0 completed results, clean.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:stage -- --check`
  — 0 completed reviews, clean.
- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.

The first cumulative attempt exposed the pre-existing authorization omission for this new worktree: 18 files passed, 2 publication files failed, with 10 assertions reporting `UNAUTHORIZED_REPOSITORY_ROOT`. After narrowly adding the named S9 worktree to the centralized policy, the complete cumulative run passed.

Pinned hashes remain unchanged:

- Frozen contract: `0f0e1d8…ef18e1`
- Plan: `25816309…e5383a3d`
- Starter-art test: `3f1a48f5…7060b`
- Source-greppable test: `0ae2a368…e545`

The real Windows probe and Astra review were not invoked because the binding instructions reserve the former for the supervisor’s owner-checkout run and explicitly prohibit invoking any reviewer in this lane.

HANDOFF S9 DONE
diff --git a/package.json b/package.json
index b4d0403233826a96a33bb176c63082be9e70b53f..13d1a21a923a63cef0b59b49b27c15efcfc3d052
--- a/package.json
+++ b/package.json
@@ -44,7 +44,11 @@
     "test:engine": "vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
     "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
-    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts --"
+    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts --",
+    "art:request": "node --experimental-strip-types tools/vtt-handoff/art-request.ts --",
+    "art:validate": "node --experimental-strip-types tools/vtt-handoff/art-validator.ts --",
+    "art:stage": "node --experimental-strip-types tools/vtt-handoff/art-stage.ts --",
+    "windows:probe": "node --experimental-strip-types tools/vtt-handoff/windows-probe.ts --"
   },
   "dependencies": {
     "@sqlite.org/sqlite-wasm": "3.53.0-build1",
diff --git a/src/vtt/handoff/v1/validation.ts b/src/vtt/handoff/v1/validation.ts
index 5aecbf6a43072505987f13b8a7b1e09388e0372c..3a0e220c37fbcf4b3119ac9e05c7c1bcf75d7f83
--- a/src/vtt/handoff/v1/validation.ts
+++ b/src/vtt/handoff/v1/validation.ts
@@ -2,7 +2,7 @@
 import {
   artRequestSchema, artResultSchema, genericHandoffRequestSchema, handoffRequestSchema,
   sceneSnapshotSchema, type ArtRequest, type ArtResult, type ArtView, type SceneSnapshot,
-} from './contracts';
+} from './contracts.ts';
 
 export interface SemanticIssue {
   readonly code: string;
diff --git a/tests/helpers/test-filesystem.ts b/tests/helpers/test-filesystem.ts
index a1287a05cd77bcaf13132a41b80d085dde0822cb..297b47b5b47579596e644500ee54b3983a9c6b8d
--- a/tests/helpers/test-filesystem.ts
+++ b/tests/helpers/test-filesystem.ts
@@ -8,8 +8,10 @@
   mkdtempSync,
   readFileSync,
   readdirSync,
+  renameSync,
   rmSync,
   symlinkSync,
   statSync,
+  truncateSync,
   writeFileSync,
 } from 'node:fs';
diff --git a/tests/unit/vtt/art-request.test.ts b/tests/unit/vtt/art-request.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5abac2dc4d618870b7ae53792dae14ad8b26e18b
--- /dev/null
+++ b/tests/unit/vtt/art-request.test.ts
@@ -0,0 +1,64 @@
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { describe, expect, it } from 'vitest';
+import {
+  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import { artRequestSchema } from '../../../src/vtt/handoff/v1/contracts';
+import { ART_REQUEST_DEFINITIONS, writeArtRequests } from '../../../tools/vtt-handoff/art-request';
+import { createUuidV7Generator } from '../../../tools/vtt-handoff/uuidv7';
+
+function root(): string {
+  return mkdtempSync(join(tmpdir(), 'vtt-art-request-'));
+}
+
+function generator() {
+  let random = 0;
+  return createUuidV7Generator({
+    now: () => 1_725_984_123_456,
+    randomBytes: (size) => new Uint8Array(size).fill(random++),
+  });
+}
+
+describe('handoff art requests', () => {
+  it('exclusively creates the nine schema-valid clean-room requests through partial rename', () => {
+    const handoffRoot = root();
+    const result = writeArtRequests({ handoffRoot, generator: generator(), nonce: () => 'fixed' });
+    expect(result.status).toBe('created');
+    expect(result.requestFiles).toHaveLength(9);
+    expect(new Set(result.requestFiles).size).toBe(9);
+    const requests = result.requestFiles.map((name) => artRequestSchema.parse(
+      JSON.parse(readFileSync(join(handoffRoot, 'art/outbox', name), 'utf8')) as unknown,
+    ));
+    expect(requests.map((request) => request.assetId).sort())
+      .toEqual(ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId).sort());
+    for (const request of requests) {
+      expect(request.views).toEqual(['top-down', 'isometric']);
+      expect(request.pixelsPerCell).toBe(128);
+      expect(request.brief).toContain('ground-centre pivot at [width/2,height]');
+      expect(request.brief).toContain('0, 90, 180 and 270 degree facings');
+      expect(request.brief).not.toMatch(/copyright|franchise|studio|artist|product/u);
+    }
+    for (const id of ['barrel', 'table', 'pillar', 'torch', 'adventurer', 'goblin']) {
+      expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background must be transparent');
+    }
+    for (const id of ['tile', 'wall', 'door']) {
+      expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background may be opaque');
+    }
+    expect(readdirSync(join(handoffRoot, 'art/outbox')).some((name) => name.includes('.partial'))).toBe(false);
+    expect(writeArtRequests({ handoffRoot, check: true })).toMatchObject({ status: 'verified', requestFiles: result.requestFiles });
+  });
+
+  it('refuses a final collision without changing existing bytes', () => {
+    const handoffRoot = root();
+    const firstId = generator().next();
+    const outbox = join(handoffRoot, 'art/outbox');
+    mkdirSync(outbox, { recursive: true });
+    const destination = join(outbox, `${firstId}.request.json`);
+    writeFileSync(destination, 'owner bytes\n');
+    expect(() => writeArtRequests({ handoffRoot, generator: generator(), nonce: () => 'fixed' }))
+      .toThrow('ART_REQUEST_COLLISION');
+    expect(readFileSync(destination, 'utf8')).toBe('owner bytes\n');
+    expect(existsSync(`${destination}.partial.fixed`)).toBe(false);
+  });
+});
diff --git a/tests/unit/vtt/art-stage.test.ts b/tests/unit/vtt/art-stage.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..c6d967114610258d5b9b4a2d9e25f9bad808af04
--- /dev/null
+++ b/tests/unit/vtt/art-stage.test.ts
@@ -0,0 +1,202 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { describe, expect, it } from 'vitest';
+import {
+  existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync,
+  truncateSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import { encodePng } from '../../../src/assets/png';
+import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
+import { stageArtResult } from '../../../tools/vtt-handoff/art-stage';
+
+const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';
+
+function sha256(bytes: Uint8Array): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+interface Fixture {
+  readonly root: string;
+  readonly requestPath: string;
+  readonly resultPath: string;
+  readonly resultAbsolute: string;
+  readonly bundle: string;
+  readonly source: string;
+  readonly firstImage: string;
+}
+
+function fixture(): Fixture {
+  const root = mkdtempSync(join(tmpdir(), 'vtt-art-stage-'));
+  const outbox = join(root, 'art/outbox');
+  const inbox = join(root, 'art/inbox');
+  const bundle = join(inbox, 'bundle');
+  mkdirSync(outbox, { recursive: true });
+  mkdirSync(bundle, { recursive: true });
+  const request: ArtRequest = {
+    schemaVersion: 1, requestId, assetId: 'tile', brief: 'clean-room fixture',
+    views: ['top-down', 'isometric'], passes: ['albedo'], pixelsPerCell: 128,
+    footprint: { w: 1, h: 1 },
+  };
+  const requestPath = join(outbox, `${requestId}.request.json`);
+  writeFileSync(requestPath, `${JSON.stringify(request)}\n`);
+  const png = Buffer.from(encodePng(1, 1, Uint8Array.of(1, 2, 3, 255)));
+  const files: { path: string; sha256: string }[] = [];
+  const frames: ArtResult['assets'][number]['frames'][number][] = [];
+  let frameIndex = 0;
+  for (const view of ['top-down', 'isometric'] as const) {
+    for (const facing of [0, 90, 180, 270]) {
+      const path = `bundle/${requestId}__tile-${view}-${String(facing)}.png`;
+      writeFileSync(join(inbox, path), png);
+      files.push({ path, sha256: sha256(png) });
+      frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
+      frameIndex += 1;
+    }
+  }
+  const source = `bundle/${requestId}__source.txt`;
+  const sourceBytes = Buffer.from('source bytes\n');
+  writeFileSync(join(inbox, source), sourceBytes);
+  files.push({ path: source, sha256: sha256(sourceBytes) });
+  const result: ArtResult = {
+    schemaVersion: 1, requestId, status: 'complete',
+    assets: [{ assetId: 'tile', footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
+    provenance: { sourceFiles: [source], files, normalMapConvention: 'none', tool: 'clean-room test tool', notes: '' },
+    errors: [],
+  };
+  const resultPath = `art/inbox/${requestId}.result.json`;
+  const resultAbsolute = join(root, resultPath);
+  writeFileSync(resultAbsolute, `${JSON.stringify(result)}\n`);
+  return { root, requestPath, resultPath, resultAbsolute, bundle, source, firstImage: frames[0]!.albedo };
+}
+
+function manifestPath(root: string): string {
+  return join(root, 'art/review', requestId, 'review-manifest.json');
+}
+
+describe('descriptor-anchored art staging', () => {
+  it('copies through partial files, revalidates, and writes the review manifest strictly last', () => {
+    const value = fixture();
+    let observedLast = false;
+    const staged = stageArtResult({
+      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
+      hooks: {
+        beforeManifest: () => {
+          const directory = join(value.root, 'art/review', requestId);
+          expect(existsSync(join(directory, 'request.json'))).toBe(true);
+          expect(existsSync(join(directory, 'result.json'))).toBe(true);
+          expect(existsSync(join(directory, 'files', value.firstImage))).toBe(true);
+          expect(existsSync(manifestPath(value.root))).toBe(false);
+          observedLast = true;
+        },
+      },
+    });
+    expect(observedLast).toBe(true);
+    expect(staged).toMatchObject({ requestId, files: 9, manifest: `art/review/${requestId}/review-manifest.json` });
+    const manifest = JSON.parse(readFileSync(manifestPath(value.root), 'utf8')) as { readonly files: readonly { readonly path: string; readonly sha256: string }[] };
+    expect(manifest.files).toHaveLength(9);
+    expect(manifest.files.find((entry) => entry.path === value.firstImage)?.sha256)
+      .toBe(sha256(readFileSync(join(value.root, 'art/inbox', value.firstImage))));
+  });
+
+  it('rejects changed or stale request/result manifests and publishes no completion', () => {
+    for (const target of ['request', 'result'] as const) {
+      const value = fixture();
+      expect(() => stageArtResult({
+        handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
+        hooks: {
+          afterInitialValidation: () => {
+            const path = target === 'request' ? value.requestPath : value.resultAbsolute;
+            writeFileSync(path, `${readFileSync(path, 'utf8').trim()}  \n`);
+          },
+        },
+      })).toThrow(/STAGE_SOURCE_CHANGED|ART_/u);
+      expect(existsSync(manifestPath(value.root))).toBe(false);
+    }
+  });
+
+  it('rejects a changed provenance source and a same-byte inode swap', () => {
+    const changed = fixture();
+    expect(() => stageArtResult({
+      handoffRoot: changed.root, resultRelativePath: changed.resultPath, nonce: () => 'fixed',
+      hooks: { afterCopy: (path) => { if (path === changed.source) writeFileSync(join(changed.root, 'art/inbox', path), 'changed\n'); } },
+    })).toThrow('ART_PROVENANCE_HASH_MISMATCH');
+    expect(existsSync(manifestPath(changed.root))).toBe(false);
+
+    const swapped = fixture();
+    const image = join(swapped.root, 'art/inbox', swapped.firstImage);
+    const identical = readFileSync(image);
+    expect(() => stageArtResult({
+      handoffRoot: swapped.root, resultRelativePath: swapped.resultPath, nonce: () => 'fixed',
+      hooks: {
+        beforeFinalValidation: () => {
+          const replacement = `${image}.replacement`;
+          writeFileSync(replacement, identical);
+          renameSync(replacement, image);
+        },
+      },
+    })).toThrow('STAGE_SOURCE_CHANGED');
+    expect(existsSync(manifestPath(swapped.root))).toBe(false);
+  });
+
+  it('refuses final-file and parent-directory symlink swaps without following outside content', () => {
+    const finalSwap = fixture();
+    const outside = join(finalSwap.root, 'outside.png');
+    writeFileSync(outside, readFileSync(join(finalSwap.root, 'art/inbox', finalSwap.firstImage)));
+    expect(() => stageArtResult({
+      handoffRoot: finalSwap.root, resultRelativePath: finalSwap.resultPath, nonce: () => 'fixed',
+      hooks: {
+        beforeFinalValidation: () => {
+          const image = join(finalSwap.root, 'art/inbox', finalSwap.firstImage);
+          rmSync(image);
+          symlinkSync(outside, image);
+        },
+      },
+    })).toThrow(/ELOOP|REGULAR_FILE_REQUIRED/u);
+    expect(existsSync(manifestPath(finalSwap.root))).toBe(false);
+
+    const parentSwap = fixture();
+    const held = `${parentSwap.bundle}.held`;
+    const outsideDirectory = join(parentSwap.root, 'outside-directory');
+    mkdirSync(outsideDirectory);
+    expect(() => stageArtResult({
+      handoffRoot: parentSwap.root, resultRelativePath: parentSwap.resultPath, nonce: () => 'fixed',
+      hooks: {
+        beforeFinalValidation: () => {
+          renameSync(parentSwap.bundle, held);
+          symlinkSync(outsideDirectory, parentSwap.bundle, 'dir');
+        },
+      },
+    })).toThrow(/ELOOP|ENOTDIR/u);
+    expect(readFileSync(join(held, requestId + '__source.txt'), 'utf8')).toBe('source bytes\n');
+    expect(existsSync(manifestPath(parentSwap.root))).toBe(false);
+  });
+
+  it('rejects an oversized sparse source before reading and a destination collision without overwrite', () => {
+    const oversized = fixture();
+    truncateSync(join(oversized.root, 'art/inbox', oversized.source), 64 * 1024 * 1024 + 1);
+    expect(() => stageArtResult({ handoffRoot: oversized.root, resultRelativePath: oversized.resultPath }))
+      .toThrow('FILE_SIZE_LIMIT');
+    expect(existsSync(manifestPath(oversized.root))).toBe(false);
+
+    const collision = fixture();
+    const review = join(collision.root, 'art/review', requestId);
+    mkdirSync(review, { recursive: true });
+    writeFileSync(join(review, 'owner.txt'), 'owner bytes\n');
+    expect(() => stageArtResult({ handoffRoot: collision.root, resultRelativePath: collision.resultPath }))
+      .toThrow('DESTINATION_COLLISION');
+    expect(readFileSync(join(review, 'owner.txt'), 'utf8')).toBe('owner bytes\n');
+  });
+
+  it('detects post-copy destination tampering before manifest publication', () => {
+    const value = fixture();
+    expect(() => stageArtResult({
+      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
+      hooks: {
+        afterCopy: (path) => {
+          if (path === value.firstImage) writeFileSync(join(value.root, 'art/review', requestId, 'files', path), 'tampered\n');
+        },
+      },
+    })).toThrow('STAGE_POSTCOPY_MISMATCH');
+    expect(existsSync(manifestPath(value.root))).toBe(false);
+  });
+});
diff --git a/tests/unit/vtt/art-validator.test.ts b/tests/unit/vtt/art-validator.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8fcaf4bf032f3534c0309e25841ee12ae8e1366a
--- /dev/null
+++ b/tests/unit/vtt/art-validator.test.ts
@@ -0,0 +1,201 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { describe, expect, it } from 'vitest';
+import {
+  mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import { encodePng } from '../../../src/assets/png';
+import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
+import { validateArtResult, validateCompletedArtResults } from '../../../tools/vtt-handoff/art-validator';
+
+const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';
+
+function sha256(bytes: Uint8Array): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+interface Fixture {
+  readonly root: string;
+  readonly request: ArtRequest;
+  readonly result: ArtResult;
+  readonly resultPath: string;
+  readonly bundle: string;
+}
+
+function fixture(assetId: 'tile' | 'barrel' = 'tile', transparent = false): Fixture {
+  const root = mkdtempSync(join(tmpdir(), 'vtt-art-validator-'));
+  const outbox = join(root, 'art/outbox');
+  const inbox = join(root, 'art/inbox');
+  const bundle = join(inbox, 'bundle');
+  mkdirSync(outbox, { recursive: true });
+  mkdirSync(bundle, { recursive: true });
+  const request: ArtRequest = {
+    schemaVersion: 1, requestId, assetId, brief: 'clean-room fixture',
+    views: ['top-down', 'isometric'], passes: ['albedo'], pixelsPerCell: 128,
+    footprint: { w: 1, h: 1 },
+  };
+  writeFileSync(join(outbox, `${requestId}.request.json`), `${JSON.stringify(request)}\n`);
+  const rgba = transparent ? Uint8Array.of(10, 20, 30, 0) : Uint8Array.of(10, 20, 30, 255);
+  const png = Buffer.from(encodePng(1, 1, rgba));
+  const files: { path: string; sha256: string }[] = [];
+  const frames: ArtResult['assets'][number]['frames'][number][] = [];
+  let frameIndex = 0;
+  for (const view of ['top-down', 'isometric'] as const) {
+    for (const facing of [0, 90, 180, 270]) {
+      const path = `bundle/${requestId}__${assetId}-${view}-${String(facing)}.png`;
+      writeFileSync(join(inbox, path), png);
+      files.push({ path, sha256: sha256(png) });
+      frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
+      frameIndex += 1;
+    }
+  }
+  const source = `bundle/${requestId}__source.txt`;
+  const sourceBytes = Buffer.from('original clean-room source\n');
+  writeFileSync(join(inbox, source), sourceBytes);
+  files.push({ path: source, sha256: sha256(sourceBytes) });
+  const result: ArtResult = {
+    schemaVersion: 1, requestId, status: 'complete',
+    assets: [{ assetId, footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
+    provenance: { sourceFiles: [source], files, normalMapConvention: 'none', tool: 'clean-room test tool', notes: '' },
+    errors: [],
+  };
+  const resultPath = `art/inbox/${requestId}.result.json`;
+  writeFileSync(join(root, resultPath), `${JSON.stringify(result)}\n`);
+  return { root, request, result, resultPath, bundle };
+}
+
+function rewriteResult(value: Fixture, result: ArtResult): void {
+  writeFileSync(join(value.root, value.resultPath), `${JSON.stringify(result)}\n`);
+}
+
+describe('completed art result validation', () => {
+  it('accepts a valid opaque floor and a valid transparent prop', () => {
+    const opaque = fixture('tile', false);
+    const validatedOpaque = validateArtResult({ handoffRoot: opaque.root, resultRelativePath: opaque.resultPath });
+    expect(validatedOpaque.totalBytes).toBeGreaterThan(0);
+    expect(validatedOpaque.files).toHaveLength(9);
+    const transparent = fixture('barrel', true);
+    expect(validateArtResult({ handoffRoot: transparent.root, resultRelativePath: transparent.resultPath }).request.assetId)
+      .toBe('barrel');
+  });
+
+  it('keeps PNG validity separate from the per-id transparency rule', () => {
+    const value = fixture('barrel', false);
+    expect(() => validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
+      .toThrow('ART_TRANSPARENCY_REQUIRED: barrel');
+  });
+
+  it('rejects traversal, drive, UNC, absolute and symlinked provenance inputs', () => {
+    for (const unsafe of ['../escape.png', 'C:/escape.png', '\\\\server\\share.png', '/escape.png']) {
+      const value = fixture();
+      const frame = value.result.assets[0]?.frames[0];
+      if (frame === undefined) throw new Error('fixture frame missing');
+      const original = frame.albedo;
+      const result: ArtResult = {
+        ...value.result,
+        assets: [{
+          ...value.result.assets[0]!,
+          frames: [{ ...frame, albedo: unsafe }, ...value.result.assets[0]!.frames.slice(1)],
+        }],
+        provenance: {
+          ...value.result.provenance,
+          files: value.result.provenance.files.map((entry) => entry.path === original ? { ...entry, path: unsafe } : entry),
+        },
+      };
+      rewriteResult(value, result);
+      expect(() => validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath })).toThrow(/NON_RELATIVE_PATH|UNSAFE_RELATIVE_PATH/u);
+    }
+
+    const linked = fixture();
+    const frame = linked.result.assets[0]?.frames[0];
+    if (frame === undefined) throw new Error('fixture frame missing');
+    const external = join(linked.root, 'external.png');
+    writeFileSync(external, readFileSync(join(linked.root, 'art/inbox', frame.albedo)));
+    const target = join(linked.root, 'art/inbox', frame.albedo);
+    rmSync(target);
+    symlinkSync(external, target);
+    expect(() => validateArtResult({ handoffRoot: linked.root, resultRelativePath: linked.resultPath })).toThrow(/ELOOP|REGULAR_FILE_REQUIRED/u);
+  });
+
+  it('rejects forged hashes and duplicate provenance paths', () => {
+    const forged = fixture();
+    rewriteResult(forged, {
+      ...forged.result,
+      provenance: { ...forged.result.provenance, files: forged.result.provenance.files.map((entry, index) => index === 0 ? { ...entry, sha256: '0'.repeat(64) } : entry) },
+    });
+    expect(() => validateArtResult({ handoffRoot: forged.root, resultRelativePath: forged.resultPath })).toThrow('ART_PROVENANCE_HASH_MISMATCH');
+
+    const duplicate = fixture();
+    rewriteResult(duplicate, {
+      ...duplicate.result,
+      provenance: { ...duplicate.result.provenance, files: [...duplicate.result.provenance.files, duplicate.result.provenance.files[0]!] },
+    });
+    expect(() => validateArtResult({ handoffRoot: duplicate.root, resultRelativePath: duplicate.resultPath })).toThrow(/PROVENANCE_PATH_SET_MISMATCH|DUPLICATE_PROVENANCE_PATH/u);
+
+    const duplicateSource = fixture();
+    rewriteResult(duplicateSource, {
+      ...duplicateSource.result,
+      provenance: {
+        ...duplicateSource.result.provenance,
+        sourceFiles: [duplicateSource.result.provenance.sourceFiles[0]!, duplicateSource.result.provenance.sourceFiles[0]!],
+      },
+    });
+    expect(() => validateArtResult({ handoffRoot: duplicateSource.root, resultRelativePath: duplicateSource.resultPath }))
+      .toThrow('ART_DUPLICATE_SOURCE_PATH');
+  });
+
+  it('rejects result identity, view, facing and requested-pass failures', () => {
+    const identity = fixture();
+    rewriteResult(identity, { ...identity.result, requestId: '018f47a2-7b3c-7abc-8def-0123456789ac' });
+    expect(() => validateArtResult({ handoffRoot: identity.root, resultRelativePath: identity.resultPath })).toThrow('ART_RESULT_FILENAME_MISMATCH');
+
+    const view = fixture();
+    const onlyTopDown = view.result.assets[0]!.frames.filter((frame) => frame.view === 'top-down');
+    const retained = new Set(onlyTopDown.map((frame) => frame.albedo));
+    const source = view.result.provenance.sourceFiles[0]!;
+    rewriteResult(view, {
+      ...view.result,
+      assets: [{ ...view.result.assets[0]!, frames: onlyTopDown }],
+      provenance: { ...view.result.provenance, files: view.result.provenance.files.filter((entry) => retained.has(entry.path) || entry.path === source) },
+    });
+    expect(() => validateArtResult({ handoffRoot: view.root, resultRelativePath: view.resultPath })).toThrow(/MISSING_REQUESTED_VIEW|FACING_SET_MISMATCH/u);
+
+    const facing = fixture();
+    const changedFrames = facing.result.assets[0]!.frames.map((frame, index) => index === 0 ? { ...frame, facing: 45 } : frame);
+    rewriteResult(facing, { ...facing.result, assets: [{ ...facing.result.assets[0]!, frames: changedFrames }] });
+    expect(() => validateArtResult({ handoffRoot: facing.root, resultRelativePath: facing.resultPath })).toThrow('ART_FACING_SET_MISMATCH');
+
+    const pass = fixture();
+    writeFileSync(join(pass.root, 'art/outbox', `${requestId}.request.json`), `${JSON.stringify({ ...pass.request, passes: ['albedo', 'normal'] })}\n`);
+    expect(() => validateArtResult({ handoffRoot: pass.root, resultRelativePath: pass.resultPath })).toThrow('ART_SEMANTIC_MISSING_REQUESTED_PASS');
+  });
+
+  it('requires normal/emissive maps to align and ignores partial result files during scans', () => {
+    const value = fixture();
+    writeFileSync(join(value.root, 'art/inbox/hostile.result.json.partial'), 'not json');
+    expect(validateCompletedArtResults({ handoffRoot: value.root })).toHaveLength(1);
+
+    for (const passName of ['normal', 'emissive'] as const) {
+      const misaligned = fixture();
+      writeFileSync(join(misaligned.root, 'art/outbox', `${requestId}.request.json`), `${JSON.stringify({ ...misaligned.request, passes: ['albedo', passName] })}\n`);
+      const extraFiles: { path: string; sha256: string }[] = [];
+      const frames = misaligned.result.assets[0]!.frames.map((entry, index) => {
+        const passPath = `bundle/${requestId}__${passName}-${String(index)}.png`;
+        const png = index === 0
+          ? Buffer.from(encodePng(2, 1, Uint8Array.of(0, 0, 255, 255, 0, 0, 255, 255)))
+          : Buffer.from(encodePng(1, 1, Uint8Array.of(0, 0, 255, 255)));
+        writeFileSync(join(misaligned.root, 'art/inbox', passPath), png);
+        extraFiles.push({ path: passPath, sha256: sha256(png) });
+        return { ...entry, [passName]: passPath };
+      });
+      rewriteResult(misaligned, {
+        ...misaligned.result,
+        assets: [{ ...misaligned.result.assets[0]!, frames }],
+        provenance: { ...misaligned.result.provenance, files: [...misaligned.result.provenance.files, ...extraFiles] },
+      });
+      expect(() => validateArtResult({ handoffRoot: misaligned.root, resultRelativePath: misaligned.resultPath }))
+        .toThrow('ART_PASS_DIMENSION_MISMATCH');
+    }
+  });
+});
diff --git a/tests/unit/vtt/png-validator.test.ts b/tests/unit/vtt/png-validator.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..1b06a1c9337e16764445d742df311a8422044bf1
--- /dev/null
+++ b/tests/unit/vtt/png-validator.test.ts
@@ -0,0 +1,105 @@
+import { deflateSync } from 'node:zlib';
+import { describe, expect, it } from 'vitest';
+import { crc32, encodePng } from '../../../src/assets/png';
+import { PNG_LIMITS, validatePng } from '../../../tools/vtt-handoff/png-validator';
+
+const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
+
+function chunk(type: string, data: Uint8Array): Buffer {
+  const typeBytes = Buffer.from(type, 'ascii');
+  const output = Buffer.alloc(12 + data.length);
+  output.writeUInt32BE(data.length, 0);
+  typeBytes.copy(output, 4);
+  Buffer.from(data).copy(output, 8);
+  output.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])) >>> 0, 8 + data.length);
+  return output;
+}
+
+function ihdr(width = 1, height = 1, overrides: Partial<Record<8 | 9 | 10 | 11 | 12, number>> = {}): Buffer {
+  const data = Buffer.alloc(13);
+  data.writeUInt32BE(width, 0);
+  data.writeUInt32BE(height, 4);
+  data[8] = overrides[8] ?? 8;
+  data[9] = overrides[9] ?? 6;
+  data[10] = overrides[10] ?? 0;
+  data[11] = overrides[11] ?? 0;
+  data[12] = overrides[12] ?? 0;
+  return chunk('IHDR', data);
+}
+
+function pngFromCompressed(compressed: Uint8Array, header = ihdr()): Buffer {
+  return Buffer.concat([signature, header, chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
+}
+
+function pngFromRaw(raw: Uint8Array, header = ihdr()): Buffer {
+  return pngFromCompressed(deflateSync(raw), header);
+}
+
+describe('bounded complete PNG validation', () => {
+  it('accepts valid opaque and transparent 8-bit RGBA non-interlaced images independently', () => {
+    const opaque = validatePng(encodePng(1, 1, Uint8Array.of(10, 20, 30, 255)));
+    const transparent = validatePng(encodePng(1, 1, Uint8Array.of(10, 20, 30, 0)));
+    expect(opaque).toMatchObject({ width: 1, height: 1, hasTransparency: false });
+    expect(transparent).toMatchObject({ width: 1, height: 1, hasTransparency: true });
+  });
+
+  it('unfilters every exact PNG filter 0 through 4 and rejects filter 5', () => {
+    for (const filter of [0, 1, 2, 3, 4]) {
+      expect(validatePng(pngFromRaw(Uint8Array.of(filter, 0, 0, 0, 0))).hasTransparency).toBe(true);
+    }
+    expect(() => validatePng(pngFromRaw(Uint8Array.of(5, 0, 0, 0, 0)))).toThrow('PNG_FILTER');
+  });
+
+  it('rejects truncated chunks, false lengths, corrupt CRCs and corrupt deflate streams', () => {
+    const valid = Buffer.from(encodePng(1, 1, Uint8Array.of(1, 2, 3, 255)));
+    expect(() => validatePng(valid.subarray(0, valid.length - 1))).toThrow(/PNG_(CHUNK_LENGTH|TRUNCATED_CHUNK)/u);
+    const falseLength = Buffer.from(valid);
+    falseLength.writeUInt32BE(0xffff_ffff, 8);
+    expect(() => validatePng(falseLength)).toThrow('PNG_CHUNK_LENGTH');
+    const crcBroken = Buffer.from(valid);
+    crcBroken[29] = (crcBroken[29] ?? 0) ^ 1;
+    expect(() => validatePng(crcBroken)).toThrow('PNG_CRC');
+    expect(() => validatePng(pngFromCompressed(Uint8Array.of(1, 2, 3, 4)))).toThrow('PNG_INFLATE');
+  });
+
+  it('requires one first IHDR, contiguous IDAT, and a terminal zero-length IEND', () => {
+    const compressed = deflateSync(Uint8Array.of(0, 0, 0, 0, 255));
+    expect(() => validatePng(Buffer.concat([signature, chunk('IDAT', compressed), ihdr(), chunk('IEND', Buffer.alloc(0))])))
+      .toThrow('PNG_IHDR_NOT_FIRST');
+    expect(() => validatePng(Buffer.concat([signature, ihdr(), ihdr(), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])))
+      .toThrow('PNG_IHDR');
+    const midpoint = Math.floor(compressed.length / 2);
+    expect(() => validatePng(Buffer.concat([
+      signature, ihdr(), chunk('IDAT', compressed.subarray(0, midpoint)), chunk('tEXt', Buffer.from('x')),
+      chunk('IDAT', compressed.subarray(midpoint)), chunk('IEND', Buffer.alloc(0)),
+    ]))).toThrow('PNG_IDAT_ORDER');
+    expect(() => validatePng(Buffer.concat([signature, ihdr(), chunk('IDAT', compressed), chunk('IEND', Buffer.from([0]))])))
+      .toThrow('PNG_IEND');
+    expect(() => validatePng(Buffer.concat([pngFromCompressed(compressed), Buffer.from([0])]))).toThrow('PNG_TRAILING_BYTES');
+  });
+
+  it('rejects illegal IHDR methods, unknown critical chunks, scanline mismatch and zlib trailing data', () => {
+    for (const [index, value] of [[8, 16], [9, 2], [10, 1], [11, 1], [12, 1]] as const) {
+      expect(() => validatePng(pngFromRaw(Uint8Array.of(0, 0, 0, 0, 0), ihdr(1, 1, { [index]: value }))))
+        .toThrow('PNG_IHDR_FORMAT');
+    }
+    expect(() => validatePng(Buffer.concat([
+      signature, ihdr(), chunk('ABCD', Buffer.alloc(0)), chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
+    ]))).toThrow('PNG_UNKNOWN_CRITICAL_CHUNK');
+    expect(() => validatePng(pngFromRaw(Uint8Array.of(0, 0, 0, 0)))).toThrow('PNG_SCANLINE_LENGTH');
+    expect(() => validatePng(pngFromCompressed(Buffer.concat([
+      deflateSync(Uint8Array.of(0, 0, 0, 0, 0)), Buffer.from([1, 2, 3]),
+    ])))).toThrow('PNG_COMPRESSED_TRAILING_DATA');
+  });
+
+  it('rejects dimension, pixel, compressed and decoded bomb inputs before unbounded allocation', () => {
+    expect(() => validatePng(pngFromRaw(Uint8Array.of(0), ihdr(PNG_LIMITS.maximumDimension + 1, 1))))
+      .toThrow('PNG_DIMENSIONS');
+    expect(() => validatePng(pngFromRaw(Uint8Array.of(0), ihdr(8_000, 8_001))))
+      .toThrow('PNG_PIXEL_LIMIT');
+    const compressedBomb = Buffer.alloc(PNG_LIMITS.maximumCompressedBytes + 1);
+    expect(() => validatePng(Buffer.concat([
+      signature, ihdr(), chunk('IDAT', compressedBomb), chunk('IEND', Buffer.alloc(0)),
+    ]))).toThrow('PNG_COMPRESSED_LIMIT');
+  });
+});
diff --git a/tests/unit/vtt/uuidv7.test.ts b/tests/unit/vtt/uuidv7.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..9dcbd426d7675d0bca8637354fe4451d2d2f648d
--- /dev/null
+++ b/tests/unit/vtt/uuidv7.test.ts
@@ -0,0 +1,60 @@
+import { describe, expect, it } from 'vitest';
+import { createUuidV7Generator } from '../../../tools/vtt-handoff/uuidv7';
+
+function fixedRandom(value: number): (size: number) => Uint8Array {
+  return (size) => new Uint8Array(size).fill(value);
+}
+
+describe('RFC 9562 UUIDv7 generator', () => {
+  it('round-trips the 48-bit millisecond timestamp and sets version and variant bits', () => {
+    const timestamp = 1_725_984_123_456;
+    const uuid = createUuidV7Generator({ now: () => timestamp, randomBytes: fixedRandom(0xab) }).next();
+    expect(Number.parseInt(uuid.replaceAll('-', '').slice(0, 12), 16)).toBe(timestamp);
+    expect(uuid[14]).toBe('7');
+    expect(uuid[19]).toBe('a');
+    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
+  });
+
+  it('uses deterministic injected randomness for rand_a seed and all 62 rand_b bits', () => {
+    const generator = createUuidV7Generator({ now: () => 1, randomBytes: fixedRandom(0x12) });
+    expect(generator.next()).toBe('00000000-0001-7212-9212-121212121212');
+  });
+
+  it('orders same-millisecond ids lexically by its monotonic 12-bit counter', () => {
+    const generator = createUuidV7Generator({ now: () => 100, randomBytes: fixedRandom(0) });
+    const ids = Array.from({ length: 100 }, () => generator.next());
+    expect([...ids].sort()).toEqual(ids);
+    expect(new Set(ids).size).toBe(100);
+  });
+
+  it('refuses a rollback clock', () => {
+    const times = [100, 99];
+    const generator = createUuidV7Generator({ now: () => times.shift() ?? 99, randomBytes: fixedRandom(0) });
+    generator.next();
+    expect(() => generator.next()).toThrow('UUIDV7_CLOCK_ROLLBACK');
+  });
+
+  it('waits for a later millisecond on counter exhaustion and never wraps', () => {
+    const times = [100, 100, 100, 101];
+    const generator = createUuidV7Generator({
+      now: () => times.shift() ?? 101,
+      randomBytes: fixedRandom(0xff),
+      maximumClockReads: 3,
+    });
+    const first = generator.next();
+    const second = generator.next();
+    expect(first.slice(0, 13)).not.toBe(second.slice(0, 13));
+    expect(Number.parseInt(second.replaceAll('-', '').slice(0, 12), 16)).toBe(101);
+
+    const stalled = createUuidV7Generator({ now: () => 100, randomBytes: fixedRandom(0xff), maximumClockReads: 2 });
+    stalled.next();
+    expect(() => stalled.next()).toThrow('UUIDV7_COUNTER_EXHAUSTED');
+  });
+
+  it('refuses an exact collision reported by the shared issuance ledger', () => {
+    const issued = new Set<string>();
+    const dependencies = { now: () => 7, randomBytes: fixedRandom(0x22), issued };
+    createUuidV7Generator(dependencies).next();
+    expect(() => createUuidV7Generator(dependencies).next()).toThrow('UUIDV7_COLLISION');
+  });
+});
diff --git a/tests/unit/vtt/windows-probe.test.ts b/tests/unit/vtt/windows-probe.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..da597b038f879f4c1f002a61d98aebce827aa5bf
--- /dev/null
+++ b/tests/unit/vtt/windows-probe.test.ts
@@ -0,0 +1,122 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { tmpdir } from 'node:os';
+import { describe, expect, it, vi } from 'vitest';
+import {
+  existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
+} from '../../helpers/test-filesystem';
+import {
+  windowsInteropProbe, type WindowsCommandResult, type WindowsProbeRunner,
+} from '../../../tools/vtt-handoff/windows-probe';
+
+function root(): string {
+  return mkdtempSync(join(tmpdir(), 'vtt-windows-probe-'));
+}
+
+function result(status: number | null, stdout = '', stderr = ''): WindowsCommandResult {
+  return { status, stdout, stderr };
+}
+
+function localName(windowsPath: string): string {
+  const name = windowsPath.split('\\').at(-1);
+  if (name === undefined || name.length === 0) throw new Error('test path missing');
+  return name;
+}
+
+function interoperableRunner(handoffRoot: string, wrongReadHash = false): WindowsProbeRunner {
+  return {
+    run(command, args) {
+      expect(command).toBe('powershell.exe');
+      const script = args[3] ?? '';
+      if (script.includes('PSVersionTable')) return result(0, '7.4.0\n');
+      if (script.includes('FromBase64String')) {
+        const path = args[4];
+        const payload = args[5];
+        if (path === undefined || payload === undefined) return result(1, '', 'missing arguments');
+        writeFileSync(join(handoffRoot, localName(path)), Buffer.from(payload, 'base64'), { flag: 'wx' });
+        return result(0);
+      }
+      if (script.includes('ComputeHash')) {
+        const path = args[4];
+        if (path === undefined) return result(1, '', 'missing path');
+        const hash = createHash('sha256').update(readFileSync(join(handoffRoot, localName(path)))).digest('hex');
+        return result(0, wrongReadHash ? '0'.repeat(64) : `${hash}\n`);
+      }
+      return result(1, '', 'unexpected command');
+    },
+  };
+}
+
+describe('real Windows interop probe classification', () => {
+  it('returns NOT_RUN without the explicit opt-in and invokes no runner', () => {
+    const run = vi.fn(() => result(1));
+    const report = windowsInteropProbe({
+      handoffRoot: root(), environment: { WSL_DISTRO_NAME: 'Ubuntu' }, runner: { run },
+    });
+    expect(report).toMatchObject({ status: 'NOT_RUN', reason: 'VTT_WINDOWS_INTEROP_NOT_ENABLED', checks: [] });
+    expect(run).not.toHaveBeenCalled();
+  });
+
+  it('returns UNAVAILABLE when WSL or PowerShell is absent and never calls either a pass', () => {
+    const handoffRoot = root();
+    expect(windowsInteropProbe({
+      handoffRoot, environment: { VTT_WINDOWS_INTEROP: '1' }, platform: 'linux',
+    })).toMatchObject({ status: 'UNAVAILABLE', reason: 'WSL_UNAVAILABLE', windowsPath: null });
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: { run: () => result(null, '', 'not found') },
+    });
+    expect(report).toMatchObject({ status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE' });
+    expect(report.checks).toEqual([{ name: 'powershell', passed: false, detail: 'not found' }]);
+  });
+
+  it('proves both byte directions, compares independent hashes and removes only named probes', () => {
+    const handoffRoot = root();
+    const sentinel = join(handoffRoot, 'keep.txt');
+    writeFileSync(sentinel, 'keep\n');
+    let seed = 0;
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: interoperableRunner(handoffRoot),
+      randomBytes: (size) => new Uint8Array(size).fill(seed++),
+    });
+    expect(report.status).toBe('PASSED');
+    expect(report.windowsPath).toContain('\\\\wsl.localhost\\Ubuntu\\');
+    expect(report.checks.map((check) => [check.name, check.passed])).toEqual([
+      ['powershell', true], ['windows-to-linux', true], ['linux-to-windows', true], ['cleanup', true],
+    ]);
+    expect(readdirSync(handoffRoot)).toEqual(['keep.txt']);
+    expect(readFileSync(sentinel, 'utf8')).toBe('keep\n');
+  });
+
+  it('returns FAILED for a real cross-boundary hash mismatch and still cleans named probes', () => {
+    const handoffRoot = root();
+    let seed = 1;
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: interoperableRunner(handoffRoot, true),
+      randomBytes: (size) => new Uint8Array(size).fill(seed++),
+    });
+    expect(report).toMatchObject({ status: 'FAILED', reason: 'LINUX_TO_WINDOWS_FAILED' });
+    expect(report.checks).toContainEqual({ name: 'linux-to-windows', passed: false, detail: 'hash mismatch' });
+    expect(report.checks.at(-1)).toEqual({ name: 'cleanup', passed: true, detail: 'named probes removed' });
+    expect(readdirSync(handoffRoot)).toEqual([]);
+    expect(existsSync(join(handoffRoot, '.vtt-interop'))).toBe(false);
+  });
+
+  it('refuses equal cross-direction random payloads instead of claiming two distinct proofs', () => {
+    const handoffRoot = root();
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: interoperableRunner(handoffRoot),
+      randomBytes: (size) => new Uint8Array(size).fill(7),
+    });
+    expect(report).toMatchObject({ status: 'FAILED', reason: 'PROBE_RANDOM_COLLISION' });
+    expect(report.checks).toEqual([{ name: 'powershell', passed: true, detail: '7.4.0' }]);
+    expect(readdirSync(handoffRoot)).toEqual([]);
+  });
+});
diff --git a/tools/vtt-handoff/art-request.ts b/tools/vtt-handoff/art-request.ts
new file mode 100644
index 0000000000000000000000000000000000000000..a9cc59122e56f5d21be053a04d948485d270a3a1
--- /dev/null
+++ b/tools/vtt-handoff/art-request.ts
@@ -0,0 +1,141 @@
+import { randomBytes } from 'node:crypto';
+import {
+  closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync,
+  unlinkSync, writeSync,
+} from 'node:fs';
+import { isAbsolute, join, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { artRequestSchema, type ArtRequest } from '../../src/vtt/handoff/v1/contracts.ts';
+import { createUuidV7Generator, type UuidV7Generator } from './uuidv7.ts';
+
+const STYLE = 'Clean-room original fantasy tabletop asset; restrained stone, wood, iron and warm-fire palette; crisp readable silhouette; no text, logos, signatures or references to existing works.';
+type ArtPass = ArtRequest['passes'][number];
+const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
+
+interface RequestDefinition {
+  readonly assetId: string;
+  readonly footprint: { readonly w: number; readonly h: number };
+  readonly passes: readonly ArtPass[];
+  readonly transparent: boolean;
+  readonly purpose: string;
+}
+
+export const ART_REQUEST_DEFINITIONS: readonly RequestDefinition[] = [
+  { assetId: 'tile', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'repeatable dungeon ground tile' },
+  { assetId: 'wall', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional dungeon wall segment' },
+  { assetId: 'door', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional closed dungeon door' },
+  { assetId: 'barrel', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding wooden barrel prop' },
+  { assetId: 'table', footprint: { w: 2, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding rectangular wooden table prop' },
+  { assetId: 'pillar', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding stone pillar prop' },
+  { assetId: 'torch', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal', 'emissive'], transparent: true, purpose: 'freestanding lit torch prop' },
+  { assetId: 'adventurer', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable humanoid adventurer token' },
+  { assetId: 'goblin', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable small goblin token' },
+] as const;
+
+function requestBrief(definition: RequestDefinition): string {
+  const background = definition.transparent
+    ? 'Background must be transparent, with at least one alpha value below 255 outside the subject.'
+    : 'Background may be opaque; image validity must not depend on transparency.';
+  return `${STYLE} Purpose: ${definition.purpose}. Produce both top-down and isometric views at 128 pixels per grid cell, each with 0, 90, 180 and 270 degree facings. Use a ground-centre pivot at [width/2,height], consistent physical scale across views, and the requested passes. ${background}`;
+}
+
+export function buildArtRequests(generator: UuidV7Generator = createUuidV7Generator()): readonly ArtRequest[] {
+  return ART_REQUEST_DEFINITIONS.map((definition) => artRequestSchema.parse({
+    schemaVersion: 1,
+    requestId: generator.next(),
+    assetId: definition.assetId,
+    brief: requestBrief(definition),
+    views: ['top-down', 'isometric'],
+    passes: definition.passes,
+    pixelsPerCell: 128,
+    footprint: definition.footprint,
+  }));
+}
+
+function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
+  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
+  return resolve(value);
+}
+
+function writeExclusiveViaPartial(destination: string, bytes: Buffer, nonce: () => string): void {
+  const partial = `${destination}.partial.${nonce()}`;
+  let partialHandle: number;
+  try {
+    partialHandle = openSync(partial, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
+  } catch (error) {
+    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_PARTIAL_COLLISION');
+    throw error;
+  }
+  let reserved = false;
+  try {
+    writeSync(partialHandle, bytes);
+    closeSync(partialHandle);
+    partialHandle = -1;
+    const reservation = openSync(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
+    closeSync(reservation);
+    reserved = true;
+    renameSync(partial, destination);
+  } catch (error) {
+    if (partialHandle >= 0) closeSync(partialHandle);
+    if (reserved) unlinkSync(destination);
+    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_COLLISION');
+    throw error;
+  } finally {
+    if (existsSync(partial)) unlinkSync(partial);
+  }
+}
+
+export interface ArtRequestBatchResult {
+  readonly root: string;
+  readonly requestFiles: readonly string[];
+  readonly status: 'created' | 'verified';
+}
+
+export function writeArtRequests(options: {
+  readonly handoffRoot?: string;
+  readonly generator?: UuidV7Generator;
+  readonly check?: boolean;
+  readonly nonce?: () => string;
+} = {}): ArtRequestBatchResult {
+  const root = configuredRoot(options.handoffRoot);
+  const outbox = join(root, 'art', 'outbox');
+  if (options.check) {
+    if (!existsSync(outbox)) throw new Error('ART_REQUEST_OUTBOX_MISSING');
+    const names = readdirSync(outbox).filter((name) => name.endsWith('.request.json')).sort();
+    if (names.length !== ART_REQUEST_DEFINITIONS.length) throw new Error(`ART_REQUEST_COUNT: ${String(names.length)}`);
+    const assets = new Set<string>();
+    for (const name of names) {
+      const parsed: unknown = JSON.parse(readFileSync(join(outbox, name), 'utf8'));
+      const request = artRequestSchema.parse(parsed);
+      if (!UUID_V7.test(request.requestId)) throw new Error('ART_REQUEST_ID_INVALID');
+      if (name !== `${request.requestId}.request.json`) throw new Error('ART_REQUEST_FILENAME_MISMATCH');
+      if (assets.has(request.assetId)) throw new Error('ART_REQUEST_ASSET_DUPLICATE');
+      assets.add(request.assetId);
+      const definition = ART_REQUEST_DEFINITIONS.find((entry) => entry.assetId === request.assetId);
+      if (definition === undefined || request.brief !== requestBrief(definition) ||
+        JSON.stringify(request.views) !== JSON.stringify(['top-down', 'isometric']) ||
+        JSON.stringify(request.passes) !== JSON.stringify(definition.passes) ||
+        request.pixelsPerCell !== 128 || request.footprint.w !== definition.footprint.w ||
+        request.footprint.h !== definition.footprint.h) {
+        throw new Error(`ART_REQUEST_CONTENT_MISMATCH: ${request.assetId}`);
+      }
+    }
+    for (const definition of ART_REQUEST_DEFINITIONS) if (!assets.has(definition.assetId)) throw new Error(`ART_REQUEST_ASSET_MISSING: ${definition.assetId}`);
+    return { root, requestFiles: names, status: 'verified' };
+  }
+  mkdirSync(outbox, { recursive: true });
+  const requests = buildArtRequests(options.generator);
+  const nonce = options.nonce ?? (() => `${String(process.pid)}.${randomBytes(8).toString('hex')}`);
+  const requestFiles: string[] = [];
+  for (const request of requests) {
+    const name = `${request.requestId}.request.json`;
+    writeExclusiveViaPartial(join(outbox, name), Buffer.from(`${JSON.stringify(request, null, 2)}\n`), nonce);
+    requestFiles.push(name);
+  }
+  return { root, requestFiles, status: 'created' };
+}
+
+if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
+  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
+  process.stdout.write(`${JSON.stringify(writeArtRequests({ check: process.argv.includes('--check') }), null, 2)}\n`);
+}
diff --git a/tools/vtt-handoff/art-stage.ts b/tools/vtt-handoff/art-stage.ts
new file mode 100644
index 0000000000000000000000000000000000000000..b3d28c4a36bdeb093f9159131330f3af42a562c4
--- /dev/null
+++ b/tools/vtt-handoff/art-stage.ts
@@ -0,0 +1,136 @@
+import { randomBytes } from 'node:crypto';
+import { existsSync, mkdirSync, readdirSync } from 'node:fs';
+import { isAbsolute, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { validateArtResult, validateCompletedArtResults, type ValidatedArtResult } from './art-validator.ts';
+import {
+  createAnchoredDirectoryExclusive, createAnchoredFileExclusive, ensureAnchoredDirectory,
+  promoteAnchoredPartial, readAnchoredFile, safeRelativeComponents, sameFileIdentity,
+} from './safe-files.ts';
+
+export interface ArtStageHooks {
+  readonly afterInitialValidation?: (validated: ValidatedArtResult) => void;
+  readonly afterCopy?: (declaredPath: string) => void;
+  readonly beforeFinalValidation?: () => void;
+  readonly beforeManifest?: () => void;
+}
+
+export interface ArtStageResult {
+  readonly requestId: string;
+  readonly reviewDirectory: string;
+  readonly manifest: string;
+  readonly files: number;
+}
+
+function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
+  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
+  return resolve(value);
+}
+
+function json(value: unknown): Buffer {
+  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
+}
+
+function createStagedFile(root: string, relativePath: string, bytes: Buffer, nonce: string): void {
+  const components = safeRelativeComponents(relativePath);
+  const filename = components.at(-1);
+  if (filename === undefined) throw new Error('STAGE_PATH_INVALID');
+  const parent = components.slice(0, -1).join('/');
+  if (parent.length > 0) ensureAnchoredDirectory(root, parent);
+  const partial = `${relativePath}.partial.${nonce}`;
+  const written = createAnchoredFileExclusive(root, partial, bytes);
+  const checked = readAnchoredFile(root, partial, bytes.length);
+  if (written.sha256 !== checked.identity.sha256 || !checked.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
+  promoteAnchoredPartial(root, partial, relativePath);
+  const final = readAnchoredFile(root, relativePath, bytes.length);
+  if (final.identity.sha256 !== written.sha256 || !final.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
+}
+
+function matchingValidation(before: ValidatedArtResult, after: ValidatedArtResult): boolean {
+  if (!sameFileIdentity(before.requestFile.identity, after.requestFile.identity) ||
+    !sameFileIdentity(before.resultFile.identity, after.resultFile.identity) ||
+    before.files.length !== after.files.length) return false;
+  const afterFiles = new Map(after.files.map((entry) => [entry.declaredPath, entry.file.identity]));
+  return before.files.every((entry) => {
+    const later = afterFiles.get(entry.declaredPath);
+    return later !== undefined && sameFileIdentity(entry.file.identity, later);
+  });
+}
+
+export function stageArtResult(options: {
+  readonly handoffRoot?: string;
+  readonly resultRelativePath: string;
+  readonly nonce?: () => string;
+  readonly hooks?: ArtStageHooks;
+}): ArtStageResult {
+  const root = configuredRoot(options.handoffRoot);
+  const validated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
+  options.hooks?.afterInitialValidation?.(validated);
+  ensureAnchoredDirectory(root, 'art/review');
+  const reviewDirectory = `art/review/${validated.request.requestId}`;
+  createAnchoredDirectoryExclusive(root, reviewDirectory);
+  const nonce = (options.nonce ?? (() => randomBytes(8).toString('hex')))();
+  createStagedFile(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, nonce);
+  createStagedFile(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, nonce);
+  for (const entry of validated.files) {
+    createStagedFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, entry.file.bytes, nonce);
+    options.hooks?.afterCopy?.(entry.declaredPath);
+  }
+  options.hooks?.beforeFinalValidation?.();
+  const revalidated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
+  if (!matchingValidation(validated, revalidated)) throw new Error('STAGE_SOURCE_CHANGED');
+  for (const entry of validated.files) {
+    const staged = readAnchoredFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, ART_STAGE_FILE_LIMIT);
+    if (staged.identity.sha256 !== entry.file.identity.sha256 || !staged.bytes.equals(entry.file.bytes)) {
+      throw new Error(`STAGE_POSTCOPY_MISMATCH: ${entry.declaredPath}`);
+    }
+  }
+  options.hooks?.beforeManifest?.();
+  const manifest = `${reviewDirectory}/review-manifest.json`;
+  createStagedFile(root, manifest, json({
+    schemaVersion: 1,
+    requestId: validated.request.requestId,
+    requestSha256: validated.requestFile.identity.sha256,
+    resultSha256: validated.resultFile.identity.sha256,
+    files: validated.files.map((entry) => ({ path: entry.declaredPath, sha256: entry.file.identity.sha256, size: entry.file.identity.size })),
+    totalBytes: validated.totalBytes,
+  }), nonce);
+  return { requestId: validated.request.requestId, reviewDirectory, manifest, files: validated.files.length };
+}
+
+const ART_STAGE_FILE_LIMIT = 64 * 1024 * 1024;
+
+export function checkArtStage(options: { readonly handoffRoot?: string } = {}): {
+  readonly status: 'verified';
+  readonly completedResults: number;
+  readonly completedReviews: number;
+} {
+  const root = configuredRoot(options.handoffRoot);
+  const results = validateCompletedArtResults({ handoffRoot: root });
+  const review = resolve(root, 'art', 'review');
+  let completedReviews = 0;
+  if (existsSync(review)) {
+    for (const entry of readdirSync(review, { withFileTypes: true })) {
+      if (!entry.isDirectory()) continue;
+      const path = `art/review/${entry.name}/review-manifest.json`;
+      try {
+        JSON.parse(readAnchoredFile(root, path, 1024 * 1024).bytes.toString('utf8')) as unknown;
+        completedReviews += 1;
+      } catch (error) {
+        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
+      }
+    }
+  }
+  return { status: 'verified', completedResults: results.length, completedReviews };
+}
+
+if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
+  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
+  if (process.argv.includes('--check')) {
+    process.stdout.write(`${JSON.stringify(checkArtStage(), null, 2)}\n`);
+  } else {
+    const resultPath = process.argv.find((argument) => argument.endsWith('.result.json'));
+    if (resultPath === undefined) throw new Error('ART_RESULT_PATH_REQUIRED');
+    process.stdout.write(`${JSON.stringify(stageArtResult({ resultRelativePath: resultPath }), null, 2)}\n`);
+  }
+}
diff --git a/tools/vtt-handoff/art-validator.ts b/tools/vtt-handoff/art-validator.ts
new file mode 100644
index 0000000000000000000000000000000000000000..90c44f990d5e059f8f5987daa2f6fbf277a7defc
--- /dev/null
+++ b/tools/vtt-handoff/art-validator.ts
@@ -0,0 +1,187 @@
+import { existsSync, lstatSync, readdirSync } from 'node:fs';
+import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import {
+  artRequestSchema, artResultSchema, type ArtRequest, type ArtResult, type ArtView,
+} from '../../src/vtt/handoff/v1/contracts.ts';
+import { artSemanticIssues } from '../../src/vtt/handoff/v1/validation.ts';
+import { readAnchoredFile, safeRelativeComponents, type AnchoredFile } from './safe-files.ts';
+import { validatePng, type ValidatedPng } from './png-validator.ts';
+
+export const ART_FILE_LIMIT = 64 * 1024 * 1024;
+export const ART_BUNDLE_LIMIT = 256 * 1024 * 1024;
+const JSON_LIMIT = 1024 * 1024;
+const TRANSPARENT_ASSETS = new Set(['barrel', 'table', 'pillar', 'torch', 'adventurer', 'goblin']);
+const OPAQUE_ALLOWED_ASSETS = new Set(['tile', 'wall', 'door']);
+const FACINGS = [0, 90, 180, 270] as const;
+
+export interface ValidatedArtFile {
+  readonly declaredPath: string;
+  readonly rootRelativePath: string;
+  readonly file: AnchoredFile;
+  readonly png: ValidatedPng | null;
+}
+
+export interface ValidatedArtResult {
+  readonly request: ArtRequest;
+  readonly result: ArtResult;
+  readonly requestFile: AnchoredFile;
+  readonly resultFile: AnchoredFile;
+  readonly resultRelativePath: string;
+  readonly bundleRelativeDirectory: string;
+  readonly files: readonly ValidatedArtFile[];
+  readonly totalBytes: number;
+}
+
+export interface ArtValidationHooks {
+  readonly afterManifestRead?: () => void;
+  readonly beforeFileRead?: (declaredPath: string) => void;
+}
+
+function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
+  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
+  return resolve(value);
+}
+
+function parseJson(bytes: Buffer, label: string): unknown {
+  try {
+    return JSON.parse(bytes.toString('utf8')) as unknown;
+  } catch {
+    throw new Error(`ART_JSON_INVALID: ${label}`);
+  }
+}
+
+function resolveInsideBundle(bundleRelativeDirectory: string, declaredPath: string): string {
+  safeRelativeComponents(declaredPath);
+  const combined = bundleRelativeDirectory === '.' ? declaredPath : `${bundleRelativeDirectory}/${declaredPath}`;
+  safeRelativeComponents(combined);
+  return combined;
+}
+
+function viewFor(request: ArtRequest, result: ArtResult, frame: ArtResult['assets'][number]['frames'][number]): ArtView {
+  if (frame.view !== undefined) return frame.view;
+  if (request.views.length === 1 && request.views[0] !== undefined) return request.views[0];
+  const matches = result.provenance.frameViews?.filter((entry) => entry.path === frame.albedo) ?? [];
+  if (matches.length !== 1 || matches[0] === undefined) throw new Error(`ART_FRAME_VIEW_UNRESOLVED: ${frame.albedo}`);
+  return matches[0].view;
+}
+
+function requireResultSemantics(request: ArtRequest, result: ArtResult): void {
+  const issues = artSemanticIssues(request, result);
+  if (issues.length > 0) throw new Error(`ART_SEMANTIC_${issues[0]?.code}: ${issues[0]?.message ?? ''}`);
+  if (result.status !== 'complete') throw new Error('ART_RESULT_NOT_COMPLETE');
+  if (result.errors.length !== 0) throw new Error('ART_COMPLETE_RESULT_HAS_ERRORS');
+  if (!OPAQUE_ALLOWED_ASSETS.has(request.assetId) && !TRANSPARENT_ASSETS.has(request.assetId)) {
+    throw new Error(`ART_ASSET_ID_UNSUPPORTED: ${request.assetId}`);
+  }
+  if (new Set(result.provenance.sourceFiles).size !== result.provenance.sourceFiles.length) {
+    throw new Error('ART_DUPLICATE_SOURCE_PATH');
+  }
+  if (result.provenance.files.length > 4_096) throw new Error('ART_FILE_COUNT_LIMIT');
+  const provenancePaths = result.provenance.files.map((entry) => entry.path);
+  if (new Set(provenancePaths).size !== provenancePaths.length) throw new Error('ART_DUPLICATE_PROVENANCE_PATH');
+  for (const asset of result.assets) {
+    if (asset.pixelsPerCell !== request.pixelsPerCell || asset.footprint.w !== request.footprint.w || asset.footprint.h !== request.footprint.h) {
+      throw new Error('ART_ASSET_SCALE_MISMATCH');
+    }
+    const frameIndexes = asset.frames.map((frame) => frame.frameIndex);
+    if (new Set(frameIndexes).size !== frameIndexes.length) throw new Error('ART_DUPLICATE_FRAME_INDEX');
+    const imagePaths = asset.frames.flatMap((frame) => [frame.albedo, frame.normal, frame.emissive])
+      .filter((path): path is string => path !== undefined);
+    if (new Set(imagePaths).size !== imagePaths.length) throw new Error('ART_DUPLICATE_IMAGE_PATH');
+    for (const view of request.views) {
+      const frames = asset.frames.filter((frame) => viewFor(request, result, frame) === view);
+      const facings = frames.map((frame) => frame.facing).sort((left, right) => left - right);
+      if (JSON.stringify(facings) !== JSON.stringify(FACINGS)) throw new Error(`ART_FACING_SET_MISMATCH: ${view}`);
+    }
+  }
+}
+
+export function validateArtResult(options: {
+  readonly handoffRoot?: string;
+  readonly resultRelativePath: string;
+  readonly hooks?: ArtValidationHooks;
+}): ValidatedArtResult {
+  const root = configuredRoot(options.handoffRoot);
+  safeRelativeComponents(options.resultRelativePath);
+  const resultFile = readAnchoredFile(root, options.resultRelativePath, JSON_LIMIT);
+  const result = artResultSchema.parse(parseJson(resultFile.bytes, options.resultRelativePath));
+  const resultName = options.resultRelativePath.split('/').at(-1);
+  if (resultName !== `${result.requestId}.result.json`) throw new Error('ART_RESULT_FILENAME_MISMATCH');
+  const requestRelativePath = `art/outbox/${result.requestId}.request.json`;
+  const requestFile = readAnchoredFile(root, requestRelativePath, JSON_LIMIT);
+  const request = artRequestSchema.parse(parseJson(requestFile.bytes, requestRelativePath));
+  requireResultSemantics(request, result);
+  options.hooks?.afterManifestRead?.();
+
+  const bundleRelativeDirectory = dirname(options.resultRelativePath).replaceAll('\\', '/');
+  const records = new Map<string, ValidatedArtFile>();
+  let totalBytes = 0;
+  for (const provenance of result.provenance.files) {
+    options.hooks?.beforeFileRead?.(provenance.path);
+    const rootRelativePath = resolveInsideBundle(bundleRelativeDirectory, provenance.path);
+    const file = readAnchoredFile(root, rootRelativePath, ART_FILE_LIMIT);
+    totalBytes += file.identity.size;
+    if (!Number.isSafeInteger(totalBytes) || totalBytes > ART_BUNDLE_LIMIT) throw new Error('ART_BUNDLE_SIZE_LIMIT');
+    if (file.identity.sha256 !== provenance.sha256) throw new Error(`ART_PROVENANCE_HASH_MISMATCH: ${provenance.path}`);
+    records.set(provenance.path, { declaredPath: provenance.path, rootRelativePath, file, png: null });
+  }
+  const dimensions = new Map<string, ValidatedPng>();
+  for (const asset of result.assets) {
+    for (const frame of asset.frames) {
+      const albedoRecord = records.get(frame.albedo);
+      if (albedoRecord === undefined) throw new Error(`ART_IMAGE_UNRECORDED: ${frame.albedo}`);
+      const albedo = validatePng(albedoRecord.file.bytes);
+      records.set(frame.albedo, { ...albedoRecord, png: albedo });
+      dimensions.set(frame.albedo, albedo);
+      if (albedo.width !== frame.width || albedo.height !== frame.height) throw new Error('ART_FRAME_DIMENSION_MISMATCH');
+      if (frame.pivotPx[0] !== frame.width / 2 || frame.pivotPx[1] !== frame.height) throw new Error('ART_GROUND_CENTRE_PIVOT_REQUIRED');
+      if (TRANSPARENT_ASSETS.has(asset.assetId) && !albedo.hasTransparency) throw new Error(`ART_TRANSPARENCY_REQUIRED: ${asset.assetId}`);
+      for (const path of [frame.normal, frame.emissive]) {
+        if (path === undefined) continue;
+        const record = records.get(path);
+        if (record === undefined) throw new Error(`ART_IMAGE_UNRECORDED: ${path}`);
+        const png = validatePng(record.file.bytes);
+        records.set(path, { ...record, png });
+        if (png.width !== albedo.width || png.height !== albedo.height) throw new Error(`ART_PASS_DIMENSION_MISMATCH: ${path}`);
+      }
+    }
+  }
+  return {
+    request, result, requestFile, resultFile, resultRelativePath: options.resultRelativePath,
+    bundleRelativeDirectory, files: [...records.values()], totalBytes,
+  };
+}
+
+function completedResultPaths(root: string): readonly string[] {
+  const inbox = join(root, 'art', 'inbox');
+  if (!existsSync(inbox)) return [];
+  const found: string[] = [];
+  function visit(directory: string): void {
+    for (const entry of readdirSync(directory, { withFileTypes: true })) {
+      const absolute = join(directory, entry.name);
+      if (entry.isSymbolicLink()) {
+        if (entry.name.endsWith('.result.json')) throw new Error(`ART_RESULT_SYMLINK_REFUSED: ${entry.name}`);
+        continue;
+      }
+      if (entry.isDirectory()) visit(absolute);
+      else if (entry.isFile() && entry.name.endsWith('.result.json') && !entry.name.includes('.partial')) {
+        if (!lstatSync(absolute).isFile()) throw new Error(`ART_RESULT_REGULAR_FILE_REQUIRED: ${entry.name}`);
+        found.push(relative(root, absolute).split('\\').join('/'));
+      }
+    }
+  }
+  visit(inbox);
+  return found.sort();
+}
+
+export function validateCompletedArtResults(options: { readonly handoffRoot?: string } = {}): readonly ValidatedArtResult[] {
+  const root = configuredRoot(options.handoffRoot);
+  return completedResultPaths(root).map((resultRelativePath) => validateArtResult({ handoffRoot: root, resultRelativePath }));
+}
+
+if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
+  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
+  const results = validateCompletedArtResults();
+  process.stdout.write(`${JSON.stringify({ status: 'validated', completedResults: results.length }, null, 2)}\n`);
+}
diff --git a/tools/vtt-handoff/doctor.ts b/tools/vtt-handoff/doctor.ts
index 57b5a8d1ff2c788c598dadbf86a37f2bb5bd0c36..2eb8251e00e5e975ad154bcde2adc48a20c298ec
--- a/tools/vtt-handoff/doctor.ts
+++ b/tools/vtt-handoff/doctor.ts
@@ -6,6 +6,8 @@
   handoffPaths, inspectNodeModules, type HandoffPaths, type NodeModulesDisposition,
   type RepositoryIdentityPolicy,
 } from './paths.ts';
+import { assertProcFdAvailable } from './safe-files.ts';
+import { windowsInteropProbe, type WindowsProbeResult } from './windows-probe.ts';
 
 export interface DoctorProbe {
   version(command: string): string | null;
@@ -44,6 +46,7 @@
   readonly tools: Readonly<Record<'jq' | 'node' | 'npm' | 'python' | 'uv', string | null>>;
   readonly lockfile: boolean;
   readonly nodeModules: NodeModulesDisposition | null;
+  readonly windowsInterop?: WindowsProbeResult;
 }
 
 export function doctorReport(options: {
@@ -71,6 +74,9 @@
     failures.push(error instanceof Error ? error.message : 'PATH_DISCOVERY_FAILED');
   }
   if (platform !== 'linux') failures.push('LINUX_REQUIRED');
+  if (platform === 'linux') {
+    try { assertProcFdAvailable(); } catch { failures.push('PROC_SELF_FD_UNAVAILABLE'); }
+  }
   const toolVersions = {
     jq: probe.version('jq'), node: probe.version('node'), npm: probe.version('npm'),
     python: probe.version('python3'), uv: probe.version('uv'),
@@ -101,7 +107,10 @@
 
 if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
   (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
-  const report = doctorReport();
+  const base = doctorReport();
+  const report: DoctorReport = process.argv.includes('--windows-probe')
+    ? { ...base, windowsInterop: windowsInteropProbe() }
+    : base;
   process.stdout.write(`${JSON.stringify(report, null, process.argv.includes('--json') ? 2 : 0)}\n`);
-  if (!report.ready) process.exitCode = 1;
+  if (!report.ready || (report.windowsInterop !== undefined && report.windowsInterop.status !== 'PASSED')) process.exitCode = 1;
 }
diff --git a/tools/vtt-handoff/paths.ts b/tools/vtt-handoff/paths.ts
index e475b5f11feb41f6fb228e756c3ccbdae1570f1e..84997265f5e4942d28e29ec101f9b3935c23f6e2
--- a/tools/vtt-handoff/paths.ts
+++ b/tools/vtt-handoff/paths.ts
@@ -3,6 +3,7 @@
 
 export const OWNER_CHECKOUT = '/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static';
 export const AUTHORIZED_WORKTREE = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff';
+export const AUTHORIZED_ART_WORKTREE = '/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s9';
 export const HANDOFF_LAYOUT = [
   'contracts',
   'fixtures',
@@ -20,7 +21,7 @@
 
 export const DEFAULT_REPOSITORY_IDENTITY_POLICY: RepositoryIdentityPolicy = {
   ownerCheckout: OWNER_CHECKOUT,
-  authorizedWorktrees: [AUTHORIZED_WORKTREE],
+  authorizedWorktrees: [AUTHORIZED_WORKTREE, AUTHORIZED_ART_WORKTREE],
 };
 
 export interface HandoffPaths {
diff --git a/tools/vtt-handoff/png-validator.ts b/tools/vtt-handoff/png-validator.ts
new file mode 100644
index 0000000000000000000000000000000000000000..0438bc2afb09f25ac3294b076780d47dc9272bc5
--- /dev/null
+++ b/tools/vtt-handoff/png-validator.ts
@@ -0,0 +1,152 @@
+import { inflateSync } from 'node:zlib';
+import { crc32 } from '../../src/assets/png.ts';
+
+const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
+export const PNG_LIMITS = {
+  maximumDimension: 8_192,
+  maximumPixels: 64_000_000,
+  maximumCompressedBytes: 64 * 1024 * 1024,
+  maximumDecodedBytes: 256 * 1024 * 1024,
+} as const;
+
+export interface ValidatedPng {
+  readonly width: number;
+  readonly height: number;
+  readonly hasTransparency: boolean;
+  readonly decodedBytes: number;
+  readonly compressedBytes: number;
+}
+
+function invalid(code: string): never {
+  throw new Error(`PNG_${code}`);
+}
+
+function checkedProduct(left: number, right: number, code: string): number {
+  const product = left * right;
+  if (!Number.isSafeInteger(product)) invalid(code);
+  return product;
+}
+
+function paeth(left: number, above: number, upperLeft: number): number {
+  const estimate = left + above - upperLeft;
+  const leftDistance = Math.abs(estimate - left);
+  const aboveDistance = Math.abs(estimate - above);
+  const upperLeftDistance = Math.abs(estimate - upperLeft);
+  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
+    ? left
+    : aboveDistance <= upperLeftDistance ? above : upperLeft;
+}
+
+export function validatePng(bytes: Uint8Array): ValidatedPng {
+  const png = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
+  if (png.length < SIGNATURE.length || !png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) invalid('SIGNATURE');
+  let offset = SIGNATURE.length;
+  let width = 0;
+  let height = 0;
+  let chunkIndex = 0;
+  let ihdrCount = 0;
+  let idatStarted = false;
+  let idatEnded = false;
+  let iendSeen = false;
+  let paletteSeen = false;
+  let compressedBytes = 0;
+  const compressedParts: Buffer[] = [];
+  while (offset < png.length) {
+    if (iendSeen) invalid('TRAILING_BYTES');
+    if (png.length - offset < 12) invalid('TRUNCATED_CHUNK');
+    const length = png.readUInt32BE(offset);
+    const dataStart = offset + 8;
+    const dataEnd = dataStart + length;
+    const crcEnd = dataEnd + 4;
+    if (!Number.isSafeInteger(crcEnd) || dataEnd < dataStart || crcEnd > png.length) invalid('CHUNK_LENGTH');
+    const typeBytes = png.subarray(offset + 4, offset + 8);
+    const type = typeBytes.toString('ascii');
+    if (!/^[A-Za-z]{4}$/u.test(type)) invalid('CHUNK_TYPE');
+    const expectedCrc = png.readUInt32BE(dataEnd);
+    const actualCrc = crc32(png.subarray(offset + 4, dataEnd)) >>> 0;
+    if (expectedCrc !== actualCrc) invalid('CRC');
+    const data = png.subarray(dataStart, dataEnd);
+    if (chunkIndex === 0 && type !== 'IHDR') invalid('IHDR_NOT_FIRST');
+    if (type === 'IHDR') {
+      ihdrCount += 1;
+      if (ihdrCount !== 1 || chunkIndex !== 0 || length !== 13) invalid('IHDR');
+      width = data.readUInt32BE(0);
+      height = data.readUInt32BE(4);
+      if (width === 0 || height === 0 || width > PNG_LIMITS.maximumDimension || height > PNG_LIMITS.maximumDimension) invalid('DIMENSIONS');
+      const pixels = checkedProduct(width, height, 'PIXEL_OVERFLOW');
+      if (pixels > PNG_LIMITS.maximumPixels) invalid('PIXEL_LIMIT');
+      if (data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) invalid('IHDR_FORMAT');
+    } else if (type === 'IDAT') {
+      if (ihdrCount !== 1 || idatEnded) invalid('IDAT_ORDER');
+      idatStarted = true;
+      compressedBytes += length;
+      if (!Number.isSafeInteger(compressedBytes) || compressedBytes > PNG_LIMITS.maximumCompressedBytes) invalid('COMPRESSED_LIMIT');
+      compressedParts.push(data);
+    } else {
+      if (idatStarted) idatEnded = true;
+      if (type === 'IEND') {
+        if (!idatStarted || length !== 0) invalid('IEND');
+        iendSeen = true;
+        if (crcEnd !== png.length) invalid('TRAILING_BYTES');
+      } else if (type === 'PLTE') {
+        if (paletteSeen || idatStarted || length === 0 || length % 3 !== 0 || length > 768) invalid('PLTE');
+        paletteSeen = true;
+      } else if ((typeBytes[0] ?? 0) >= 65 && (typeBytes[0] ?? 0) <= 90) {
+        invalid('UNKNOWN_CRITICAL_CHUNK');
+      }
+    }
+    offset = crcEnd;
+    chunkIndex += 1;
+  }
+  if (ihdrCount !== 1 || !iendSeen || !idatStarted) invalid('INCOMPLETE');
+  const rowBytes = checkedProduct(width, 4, 'ROW_OVERFLOW');
+  const scanlineBytes = rowBytes + 1;
+  if (!Number.isSafeInteger(scanlineBytes)) invalid('ROW_OVERFLOW');
+  const decodedLength = checkedProduct(scanlineBytes, height, 'DECODED_OVERFLOW');
+  if (decodedLength > PNG_LIMITS.maximumDecodedBytes) invalid('DECODED_LIMIT');
+  let inflated: Buffer;
+  let consumed: number;
+  try {
+    const result: unknown = inflateSync(Buffer.concat(compressedParts), {
+      maxOutputLength: PNG_LIMITS.maximumDecodedBytes,
+      info: true,
+    });
+    if (typeof result !== 'object' || result === null) invalid('INFLATE');
+    const buffer = Reflect.get(result, 'buffer');
+    const engine = Reflect.get(result, 'engine');
+    const bytesWritten = typeof engine === 'object' && engine !== null ? Reflect.get(engine, 'bytesWritten') : null;
+    if (!Buffer.isBuffer(buffer) || typeof bytesWritten !== 'number') invalid('INFLATE');
+    inflated = buffer;
+    consumed = bytesWritten;
+  } catch {
+    invalid('INFLATE');
+  }
+  if (inflated.length !== decodedLength) invalid('SCANLINE_LENGTH');
+  if (consumed !== compressedBytes) invalid('COMPRESSED_TRAILING_DATA');
+  const prior = Buffer.alloc(rowBytes);
+  const current = Buffer.alloc(rowBytes);
+  let sourceOffset = 0;
+  let hasTransparency = false;
+  for (let row = 0; row < height; row += 1) {
+    const filter = inflated[sourceOffset];
+    if (filter === undefined || filter > 4) invalid('FILTER');
+    sourceOffset += 1;
+    for (let column = 0; column < rowBytes; column += 1) {
+      const raw = inflated[sourceOffset + column];
+      if (raw === undefined) invalid('SCANLINE_LENGTH');
+      const left = column >= 4 ? current[column - 4] ?? 0 : 0;
+      const above = prior[column] ?? 0;
+      const upperLeft = column >= 4 ? prior[column - 4] ?? 0 : 0;
+      const predictor = filter === 0 ? 0
+        : filter === 1 ? left
+          : filter === 2 ? above
+            : filter === 3 ? Math.floor((left + above) / 2)
+              : paeth(left, above, upperLeft);
+      current[column] = (raw + predictor) & 0xff;
+    }
+    for (let alpha = 3; alpha < rowBytes; alpha += 4) if (current[alpha] !== 255) hasTransparency = true;
+    current.copy(prior);
+    sourceOffset += rowBytes;
+  }
+  return { width, height, hasTransparency, decodedBytes: decodedLength, compressedBytes };
+}
diff --git a/tools/vtt-handoff/safe-files.ts b/tools/vtt-handoff/safe-files.ts
new file mode 100644
index 0000000000000000000000000000000000000000..f852cc8a8ce9d2c092ae84a5c3b6f4d873cb2b76
--- /dev/null
+++ b/tools/vtt-handoff/safe-files.ts
@@ -0,0 +1,294 @@
+import { createHash } from 'node:crypto';
+import {
+  closeSync, constants, fstatSync, fsyncSync, mkdirSync, openSync, readSync, realpathSync,
+  renameSync, unlinkSync, writeSync,
+} from 'node:fs';
+import { join, resolve, sep } from 'node:path';
+
+export interface FileIdentity {
+  readonly device: bigint;
+  readonly inode: bigint;
+  readonly size: number;
+  readonly sha256: string;
+}
+
+export interface AnchoredFile {
+  readonly bytes: Buffer;
+  readonly identity: FileIdentity;
+  readonly canonicalPath: string;
+}
+
+/*
+ * Node has no openat binding. Linux staging therefore depends on /proc/self/fd:
+ * every child is opened beneath a retained parent descriptor, then fstat and
+ * proc-fd realpath are checked. Doctor refuses staging when that mount is absent.
+ */
+
+function fail(code: string, detail: string): never {
+  throw new Error(`${code}: ${detail}`);
+}
+
+export function assertProcFdAvailable(): void {
+  if (process.platform !== 'linux') fail('LINUX_REQUIRED', process.platform);
+  let handle: number;
+  try {
+    handle = openSync('/proc/self/fd', constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+  } catch {
+    fail('PROC_SELF_FD_UNAVAILABLE', '/proc/self/fd');
+  }
+  closeSync(handle);
+}
+
+export function safeRelativeComponents(relativePath: string): readonly string[] {
+  if (relativePath.length === 0 || relativePath.length > 4_096 || relativePath.includes('\\') || relativePath.startsWith('/') ||
+    /^[A-Za-z]:/u.test(relativePath) || relativePath.includes('\0')) {
+    fail('UNSAFE_RELATIVE_PATH', relativePath);
+  }
+  const components = relativePath.split('/');
+  if (components.length > 64 || components.some((component) =>
+    component.length === 0 || component.length > 255 || component === '.' || component === '..')) {
+    fail('UNSAFE_RELATIVE_PATH', relativePath);
+  }
+  return components;
+}
+
+function procChild(parent: number, component: string): string {
+  return `/proc/self/fd/${String(parent)}/${component}`;
+}
+
+function procCanonical(handle: number): string {
+  const canonical = realpathSync(`/proc/self/fd/${String(handle)}`);
+  if (canonical.endsWith(' (deleted)')) fail('ANCHORED_PATH_DELETED', canonical);
+  return canonical;
+}
+
+interface OpenParent {
+  readonly handle: number;
+  readonly handles: readonly number[];
+  readonly canonicalRoot: string;
+  readonly expectedParent: string;
+}
+
+function closeParent(parent: OpenParent): void {
+  for (const handle of [...parent.handles].reverse()) closeSync(handle);
+}
+
+function openParent(root: string, components: readonly string[]): OpenParent {
+  assertProcFdAvailable();
+  const absoluteRoot = resolve(root);
+  const rootHandle = openSync(absoluteRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+  let handle = rootHandle;
+  const handles = [rootHandle];
+  const canonicalRoot = procCanonical(rootHandle);
+  if (canonicalRoot !== absoluteRoot) {
+    closeSync(rootHandle);
+    fail('ANCHORED_ROOT_MISMATCH', root);
+  }
+  let expectedParent = canonicalRoot;
+  try {
+    for (const component of components) {
+      const child = openSync(procChild(handle, component), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+      const stat = fstatSync(child, { bigint: true });
+      const expected = join(expectedParent, component);
+      if (!stat.isDirectory() || procCanonical(child) !== expected) {
+        closeSync(child);
+        fail('ANCHORED_DIRECTORY_MISMATCH', expected);
+      }
+      handle = child;
+      handles.push(child);
+      expectedParent = expected;
+    }
+    return { handle, handles, canonicalRoot, expectedParent };
+  } catch (error) {
+    for (const retained of [...handles].reverse()) closeSync(retained);
+    throw error;
+  }
+}
+
+function readBounded(handle: number, size: number): Buffer {
+  const bytes = Buffer.alloc(size);
+  let offset = 0;
+  while (offset < size) {
+    const count = readSync(handle, bytes, offset, size - offset, offset);
+    if (count === 0) fail('ANCHORED_FILE_SHORT_READ', String(size));
+    offset += count;
+  }
+  const extra = Buffer.alloc(1);
+  if (readSync(handle, extra, 0, 1, size) !== 0) fail('ANCHORED_FILE_GREW', String(size));
+  return bytes;
+}
+
+export function readAnchoredFile(root: string, relativePath: string, maximumBytes: number): AnchoredFile {
+  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) fail('INVALID_FILE_BOUND', String(maximumBytes));
+  const components = safeRelativeComponents(relativePath);
+  const filename = components.at(-1);
+  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
+  const parent = openParent(root, components.slice(0, -1));
+  let handle: number | null = null;
+  try {
+    handle = openSync(procChild(parent.handle, filename), constants.O_RDONLY | constants.O_NOFOLLOW);
+    const before = fstatSync(handle, { bigint: true });
+    if (!before.isFile()) fail('REGULAR_FILE_REQUIRED', relativePath);
+    if (before.size > BigInt(maximumBytes) || before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
+      fail('FILE_SIZE_LIMIT', relativePath);
+    }
+    const expected = join(parent.expectedParent, filename);
+    const canonicalPath = procCanonical(handle);
+    if (canonicalPath !== expected || !canonicalPath.startsWith(`${parent.canonicalRoot}${sep}`)) {
+      fail('ANCHORED_FILE_MISMATCH', relativePath);
+    }
+    const bytes = readBounded(handle, Number(before.size));
+    const after = fstatSync(handle, { bigint: true });
+    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) {
+      fail('ANCHORED_FILE_CHANGED', relativePath);
+    }
+    return {
+      bytes,
+      canonicalPath,
+      identity: {
+        device: before.dev,
+        inode: before.ino,
+        size: bytes.length,
+        sha256: createHash('sha256').update(bytes).digest('hex'),
+      },
+    };
+  } finally {
+    if (handle !== null) closeSync(handle);
+    closeParent(parent);
+  }
+}
+
+export function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
+  return left.device === right.device && left.inode === right.inode && left.size === right.size && left.sha256 === right.sha256;
+}
+
+/** Creates trusted staging directories through retained parent descriptors. */
+export function ensureAnchoredDirectory(root: string, relativePath: string): void {
+  const components = safeRelativeComponents(relativePath);
+  let parent = openParent(root, []);
+  try {
+    for (const component of components) {
+      const childPath = procChild(parent.handle, component);
+      try {
+        mkdirSync(childPath, { mode: 0o700 });
+      } catch (error) {
+        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
+      }
+      const next = openSync(childPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+      const expected = join(parent.expectedParent, component);
+      if (!fstatSync(next).isDirectory() || procCanonical(next) !== expected) {
+        closeSync(next);
+        fail('ANCHORED_DIRECTORY_MISMATCH', expected);
+      }
+      parent = {
+        handle: next,
+        handles: [...parent.handles, next],
+        canonicalRoot: parent.canonicalRoot,
+        expectedParent: expected,
+      };
+    }
+  } finally {
+    closeParent(parent);
+  }
+}
+
+export function createAnchoredDirectoryExclusive(root: string, relativePath: string): void {
+  const components = safeRelativeComponents(relativePath);
+  const name = components.at(-1);
+  if (name === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
+  const parent = openParent(root, components.slice(0, -1));
+  try {
+    try {
+      mkdirSync(procChild(parent.handle, name), { mode: 0o700 });
+    } catch (error) {
+      if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', relativePath);
+      throw error;
+    }
+    const child = openSync(procChild(parent.handle, name), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+    try {
+      if (!fstatSync(child).isDirectory() || procCanonical(child) !== join(parent.expectedParent, name)) {
+        fail('ANCHORED_DIRECTORY_MISMATCH', relativePath);
+      }
+    } finally {
+      closeSync(child);
+    }
+  } finally {
+    closeParent(parent);
+  }
+}
+
+export function createAnchoredFileExclusive(root: string, relativePath: string, bytes: Buffer): FileIdentity {
+  const components = safeRelativeComponents(relativePath);
+  const filename = components.at(-1);
+  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
+  const parent = openParent(root, components.slice(0, -1));
+  let handle: number | null = null;
+  try {
+    handle = openSync(
+      procChild(parent.handle, filename),
+      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
+      0o600,
+    );
+    let offset = 0;
+    while (offset < bytes.length) offset += writeSync(handle, bytes, offset, bytes.length - offset, offset);
+    fsyncSync(handle);
+    const stat = fstatSync(handle, { bigint: true });
+    if (!stat.isFile() || Number(stat.size) !== bytes.length || procCanonical(handle) !== join(parent.expectedParent, filename)) {
+      fail('ANCHORED_DESTINATION_MISMATCH', relativePath);
+    }
+    return {
+      device: stat.dev,
+      inode: stat.ino,
+      size: bytes.length,
+      sha256: createHash('sha256').update(bytes).digest('hex'),
+    };
+  } catch (error) {
+    if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', relativePath);
+    throw error;
+  } finally {
+    if (handle !== null) closeSync(handle);
+    closeParent(parent);
+  }
+}
+
+export function promoteAnchoredPartial(root: string, partialPath: string, destinationPath: string): void {
+  const partialComponents = safeRelativeComponents(partialPath);
+  const destinationComponents = safeRelativeComponents(destinationPath);
+  const partialName = partialComponents.at(-1);
+  const destinationName = destinationComponents.at(-1);
+  if (partialName === undefined || destinationName === undefined ||
+    JSON.stringify(partialComponents.slice(0, -1)) !== JSON.stringify(destinationComponents.slice(0, -1))) {
+    fail('ANCHORED_RENAME_PARENT_MISMATCH', destinationPath);
+  }
+  const parent = openParent(root, partialComponents.slice(0, -1));
+  let reserved = false;
+  try {
+    const reservation = openSync(
+      procChild(parent.handle, destinationName),
+      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
+      0o600,
+    );
+    closeSync(reservation);
+    reserved = true;
+    renameSync(procChild(parent.handle, partialName), procChild(parent.handle, destinationName));
+    reserved = false;
+  } catch (error) {
+    if (reserved) unlinkSync(procChild(parent.handle, destinationName));
+    if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', destinationPath);
+    throw error;
+  } finally {
+    closeParent(parent);
+  }
+}
+
+export function unlinkAnchoredFile(root: string, relativePath: string): void {
+  const components = safeRelativeComponents(relativePath);
+  const filename = components.at(-1);
+  if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
+  const parent = openParent(root, components.slice(0, -1));
+  try {
+    unlinkSync(procChild(parent.handle, filename));
+  } finally {
+    closeSync(parent.handle);
+  }
+}
diff --git a/tools/vtt-handoff/uuidv7.ts b/tools/vtt-handoff/uuidv7.ts
new file mode 100644
index 0000000000000000000000000000000000000000..077dd9f55b9b7440f90444ed2c37cbb23afe1b8b
--- /dev/null
+++ b/tools/vtt-handoff/uuidv7.ts
@@ -0,0 +1,108 @@
+import { randomBytes as systemRandomBytes } from 'node:crypto';
+
+const MAX_TIMESTAMP = 0xffff_ffff_ffff;
+const MAX_COUNTER = 0x0fff;
+
+export interface UuidV7Dependencies {
+  readonly now?: () => number;
+  readonly randomBytes?: (size: number) => Uint8Array;
+  readonly maximumClockReads?: number;
+  readonly issued?: Set<string>;
+}
+
+function byte(bytes: Uint8Array, index: number): number {
+  const value = bytes[index];
+  if (value === undefined) throw new Error('UUIDV7_RANDOM_SOURCE_TOO_SHORT');
+  return value;
+}
+
+function checkedTimestamp(value: number): number {
+  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIMESTAMP) {
+    throw new Error('UUIDV7_TIMESTAMP_OUT_OF_RANGE');
+  }
+  return value;
+}
+
+function randomBlock(source: (size: number) => Uint8Array): Uint8Array {
+  const bytes = source(10);
+  if (bytes.length !== 10) throw new Error('UUIDV7_RANDOM_SOURCE_LENGTH');
+  return bytes;
+}
+
+function hexadecimal(bytes: Uint8Array): string {
+  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
+}
+
+export interface UuidV7Generator {
+  next(): string;
+}
+
+/** RFC 9562 UUIDv7 with a monotonic 12-bit rand_a field within each millisecond. */
+export function createUuidV7Generator(dependencies: UuidV7Dependencies = {}): UuidV7Generator {
+  const now = dependencies.now ?? Date.now;
+  const randomness = dependencies.randomBytes ?? systemRandomBytes;
+  const maximumClockReads = dependencies.maximumClockReads ?? 10_000;
+  if (!Number.isSafeInteger(maximumClockReads) || maximumClockReads < 1) {
+    throw new Error('UUIDV7_CLOCK_READ_LIMIT_INVALID');
+  }
+  let lastTimestamp: number | null = null;
+  let counter = 0;
+  const issued = dependencies.issued ?? new Set<string>();
+
+  function readClock(): number {
+    const timestamp = checkedTimestamp(now());
+    if (lastTimestamp !== null && timestamp < lastTimestamp) throw new Error('UUIDV7_CLOCK_ROLLBACK');
+    return timestamp;
+  }
+
+  function nextTimestampAndCounter(): readonly [number, Uint8Array] {
+    let timestamp = readClock();
+    let random = randomBlock(randomness);
+    if (lastTimestamp === null || timestamp > lastTimestamp) {
+      counter = ((byte(random, 0) << 8) | byte(random, 1)) & MAX_COUNTER;
+      lastTimestamp = timestamp;
+      return [timestamp, random];
+    }
+    if (counter < MAX_COUNTER) {
+      counter += 1;
+      return [timestamp, random];
+    }
+    for (let read = 0; read < maximumClockReads; read += 1) {
+      timestamp = readClock();
+      if (timestamp > lastTimestamp) {
+        random = randomBlock(randomness);
+        counter = ((byte(random, 0) << 8) | byte(random, 1)) & MAX_COUNTER;
+        lastTimestamp = timestamp;
+        return [timestamp, random];
+      }
+    }
+    throw new Error('UUIDV7_COUNTER_EXHAUSTED');
+  }
+
+  return {
+    next(): string {
+      const [timestamp, random] = nextTimestampAndCounter();
+      const bytes = new Uint8Array(16);
+      let remaining = timestamp;
+      for (let index = 5; index >= 0; index -= 1) {
+        bytes[index] = remaining % 256;
+        remaining = Math.floor(remaining / 256);
+      }
+      bytes[6] = 0x70 | (counter >>> 8);
+      bytes[7] = counter & 0xff;
+      bytes[8] = 0x80 | (byte(random, 2) & 0x3f);
+      for (let index = 9; index < 16; index += 1) bytes[index] = byte(random, index - 6);
+      const compact = hexadecimal(bytes);
+      const uuid = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
+      if (issued.has(uuid)) throw new Error('UUIDV7_COLLISION');
+      issued.add(uuid);
+      return uuid;
+    },
+  };
+}
+
+const defaultGenerator = createUuidV7Generator();
+
+export function uuidV7(): string {
+  return defaultGenerator.next();
+}
diff --git a/tools/vtt-handoff/windows-probe.ts b/tools/vtt-handoff/windows-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ead41d188d92cf9e8d4e7c0e7563d041398fd849
--- /dev/null
+++ b/tools/vtt-handoff/windows-probe.ts
@@ -0,0 +1,135 @@
+import { createHash, randomBytes as systemRandomBytes } from 'node:crypto';
+import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
+import { isAbsolute, join, resolve } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import { fileURLToPath } from 'node:url';
+import { uncPathFor } from './paths.ts';
+
+export type WindowsProbeStatus = 'PASSED' | 'NOT_RUN' | 'UNAVAILABLE' | 'FAILED';
+
+export interface WindowsProbeCheck {
+  readonly name: 'powershell' | 'windows-to-linux' | 'linux-to-windows' | 'cleanup';
+  readonly passed: boolean;
+  readonly detail: string;
+}
+
+export interface WindowsProbeResult {
+  readonly status: WindowsProbeStatus;
+  readonly linuxPath: string;
+  readonly windowsPath: string | null;
+  readonly checks: readonly WindowsProbeCheck[];
+  readonly reason: string | null;
+}
+
+export interface WindowsCommandResult {
+  readonly status: number | null;
+  readonly stdout: string;
+  readonly stderr: string;
+}
+
+export interface WindowsProbeRunner {
+  run(command: string, args: readonly string[]): WindowsCommandResult;
+}
+
+const systemRunner: WindowsProbeRunner = {
+  run(command, args) {
+    const result = spawnSync(command, args, { encoding: 'utf8' });
+    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
+  },
+};
+
+function sha256(bytes: Uint8Array): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+function configuredRoot(value: string | undefined): string {
+  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
+  return resolve(value);
+}
+
+export function windowsInteropProbe(options: {
+  readonly handoffRoot?: string;
+  readonly environment?: NodeJS.ProcessEnv;
+  readonly platform?: NodeJS.Platform;
+  readonly runner?: WindowsProbeRunner;
+  readonly randomBytes?: (size: number) => Uint8Array;
+} = {}): WindowsProbeResult {
+  const environment = options.environment ?? process.env;
+  const linuxPath = configuredRoot(options.handoffRoot ?? environment.VTT_HANDOFF_ROOT);
+  const distribution = environment.WSL_DISTRO_NAME?.trim();
+  const windowsPath = distribution === undefined || distribution.length === 0 ? null : uncPathFor(linuxPath, distribution);
+  if (environment.VTT_WINDOWS_INTEROP !== '1') {
+    return { status: 'NOT_RUN', linuxPath, windowsPath, checks: [], reason: 'VTT_WINDOWS_INTEROP_NOT_ENABLED' };
+  }
+  if ((options.platform ?? process.platform) !== 'linux' || distribution === undefined || distribution.length === 0) {
+    return { status: 'UNAVAILABLE', linuxPath, windowsPath: null, checks: [], reason: 'WSL_UNAVAILABLE' };
+  }
+  const runner = options.runner ?? systemRunner;
+  const checks: WindowsProbeCheck[] = [];
+  const availability = runner.run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()']);
+  if (availability.status !== 0) {
+    return { status: 'UNAVAILABLE', linuxPath, windowsPath, checks: [{ name: 'powershell', passed: false, detail: availability.stderr.trim() || 'powershell.exe unavailable' }], reason: 'POWERSHELL_UNAVAILABLE' };
+  }
+  checks.push({ name: 'powershell', passed: true, detail: availability.stdout.trim() });
+  const randomness = options.randomBytes ?? systemRandomBytes;
+  const token = Buffer.from(randomness(16)).toString('hex');
+  const windowsName = `.vtt-interop-${token}.windows.bin`;
+  const linuxName = `.vtt-interop-${token}.linux.bin`;
+  const windowsLinuxFile = join(linuxPath, windowsName);
+  const linuxFile = join(linuxPath, linuxName);
+  const windowsFile = `${windowsPath}\\${windowsName}`;
+  const windowsLinuxView = `${windowsPath}\\${linuxName}`;
+  mkdirSync(linuxPath, { recursive: true });
+  const fromWindows = Buffer.from(randomness(64));
+  const fromLinux = Buffer.from(randomness(64));
+  if (fromWindows.equals(fromLinux)) {
+    return { status: 'FAILED', linuxPath, windowsPath, checks, reason: 'PROBE_RANDOM_COLLISION' };
+  }
+  let status: WindowsProbeStatus = 'FAILED';
+  let reason: string | null = 'WINDOWS_PROBE_FAILED';
+  try {
+    const writeResult = runner.run('powershell.exe', [
+      '-NoProfile', '-NonInteractive', '-Command',
+      '& { param($p,$b) $bytes=[Convert]::FromBase64String($b); $s=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None); try {$s.Write($bytes,0,$bytes.Length); $s.Flush($true)} finally {$s.Dispose()} }',
+      windowsFile, fromWindows.toString('base64'),
+    ]);
+    const windowsToLinux = writeResult.status === 0 && existsSync(windowsLinuxFile) && sha256(readFileSync(windowsLinuxFile)) === sha256(fromWindows);
+    checks.push({ name: 'windows-to-linux', passed: windowsToLinux, detail: windowsToLinux ? sha256(fromWindows) : writeResult.stderr.trim() || 'hash mismatch' });
+    if (!windowsToLinux) {
+      reason = 'WINDOWS_TO_LINUX_FAILED';
+    } else {
+
+      writeFileSync(linuxFile, fromLinux, { flag: 'wx', mode: 0o600 });
+      const readResult = runner.run('powershell.exe', [
+        '-NoProfile', '-NonInteractive', '-Command',
+        '& { param($p) $s=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read); try {$h=[Security.Cryptography.SHA256]::Create(); try {([BitConverter]::ToString($h.ComputeHash($s))).Replace(\'-\',\'\').ToLowerInvariant()} finally {$h.Dispose()}} finally {$s.Dispose()} }',
+        windowsLinuxView,
+      ]);
+      const linuxToWindows = readResult.status === 0 && readResult.stdout.trim().toLowerCase() === sha256(fromLinux);
+      checks.push({ name: 'linux-to-windows', passed: linuxToWindows, detail: linuxToWindows ? sha256(fromLinux) : readResult.stderr.trim() || 'hash mismatch' });
+      status = linuxToWindows ? 'PASSED' : 'FAILED';
+      reason = linuxToWindows ? null : 'LINUX_TO_WINDOWS_FAILED';
+    }
+  } catch (error) {
+    status = 'FAILED';
+    reason = error instanceof Error ? error.message : 'WINDOWS_PROBE_FAILED';
+  }
+  let cleanupPassed = true;
+  for (const path of [windowsLinuxFile, linuxFile]) {
+    try {
+      if (existsSync(path)) unlinkSync(path);
+    } catch {
+      cleanupPassed = false;
+    }
+  }
+  checks.push({ name: 'cleanup', passed: cleanupPassed, detail: cleanupPassed ? 'named probes removed' : 'named probe cleanup failed' });
+  if (!cleanupPassed) return { status: 'FAILED', linuxPath, windowsPath, checks, reason: 'PROBE_CLEANUP_FAILED' };
+  return { status, linuxPath, windowsPath, checks, reason };
+}
+
+if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
+  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
+  const report = windowsInteropProbe();
+  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
+  if (report.status !== 'PASSED') process.exitCode = 1;
+}
