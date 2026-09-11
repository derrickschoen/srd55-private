Implemented all Astra findings F69–F79. The uncommitted change contains 12 files, 638 insertions, and 137 deletions. No git writes were performed.

Key results:

- Exact nine published asset IDs and transparency policies are independently pinned and JSON-Schema validated.
- Result manifests and provenance are constrained to the agreed UUID inbox layout.
- Composite frame uniqueness permits reused indices and multiple animation frames.
- Atomic no-replace promotion uses verified partials, directory `fsync`, and collision-safe linking.
- Staging revalidates request, result, provenance, and review-manifest identities.
- FIFO and descriptor-retention parent-swap controls prove nonblocking anchored reads.
- PNG raw chunk bytes, predictors 1–4, truncated deflate, and inflate bounds are independently exercised.
- Windows cleanup preserves both exact-name collision files.
- `art:validate -- --list` reports complete, partial, blocked, invalid, and completion eligibility.

### Verification

Exact S9 gates:

- UUID/request/contract: 3 files, 15 tests passed.
- PNG/art-validator/contract: 3 files, 20 tests passed.
- Staging/validator/PNG: 3 files, 25 tests passed.
- Windows probe: 1 file, 7 tests passed.
- Touched S9 suite: 5 files, 36 tests passed.

Final cumulative command:

```text
npx vitest run --configLoader runner tests/unit/vtt/handoff-package-contract.test.ts tests/unit/vtt/handoff-bootstrap.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/handoff-publish.test.ts tests/unit/vtt/handoff-examples.test.ts tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/png-validator.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/art-stage.test.ts tests/unit/vtt/windows-probe.test.ts
```

Result: 20 files, 176 tests passed.

Other checks:

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- `art:request -- --check` — 9 verified.
- `art:validate -- --check` — 0 completed results.
- `art:validate -- --list` — empty listing, as the inbox has no deliveries.
- `art:stage -- --check` — 0 completed results/reviews.

PNG mutation controls:

- Predictor-disabled run: 1 intended failure, 5 filtered tests.
- Inflate-bound-disabled run: 1 intended failure, 5 filtered tests.
- `png-validator.ts` restored byte-for-byte afterward; pre/post SHA-256: `36d22b80a7e685038cac63943331a34eb2f1316e35235244d9c57fb294a0420f`.

### Generated requests

- `01a08d4c-a637-7915-8293-82c5668a17d6.request.json` — `tile.stone.floor`
- `01a08d4c-a638-731e-8279-3a26539a62b9.request.json` — `wall.stone`
- `01a08d4c-a638-731f-b2ec-110f16a98988.request.json` — `door.wood`
- `01a08d4c-a638-7320-8abf-f9ae2b071bb3.request.json` — `prop.barrel`
- `01a08d4c-a638-7321-b5b4-180aa32286b4.request.json` — `prop.table`
- `01a08d4c-a638-7322-a7de-a519eca01db2.request.json` — `prop.pillar`
- `01a08d4c-a638-7323-bef7-0a4e0ca2b205.request.json` — `prop.torch`
- `01a08d4c-a638-7324-92bd-fa2486a3c46e.request.json` — `token.adventurer`
- `01a08d4c-a638-7325-8bf1-33caaf7fea89.request.json` — `token.goblin`

All nine validate. Previous R1 requests were preserved under the worktree-local `art/outbox-r1`; no inbox content was deleted or overwritten.

### Assertion replacements

Two existing `expect(` expressions were removed/replaced:

- Implementation-derived asset IDs were replaced by the independent literal `AGREED_ASSET_IDS` set, plus per-request published-schema validation.
- Single zero-pixel filter assertions were replaced by independently calculated 2×2, multi-row predictor fixtures with distinguishable alpha outcomes.

Existing assertions corrected without weakening:

- Transparency and opacity lists now use published IDs.
- Staged-source hashing now uses the UUID bundle anchor.
- `barrel` expectations now require `prop.barrel`.
- New path and composite-frame rejection controls use exact error codes.

Integrity hashes remain unchanged, including the frozen contract and all three protected expectations. Plan SHA-256 remains `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`.

The real Windows interop probe was not run; it remains reserved for the supervisor from the owner checkout.

HANDOFF S9 R2 DONE
diff --git a/tests/helpers/test-filesystem.ts b/tests/helpers/test-filesystem.ts
index 297b47b5b47579596e644500ee54b3983a9c6b8d..8d8e384586ced58abf441ef046712b4ccd26678b
--- a/tests/helpers/test-filesystem.ts
+++ b/tests/helpers/test-filesystem.ts
@@ -3,9 +3,11 @@
  * ephemeral outputs. Stable repository inputs belong in test-inputs.ts.
  */
 export {
+  closeSync,
   existsSync,
   mkdirSync,
   mkdtempSync,
+  openSync,
   readFileSync,
   readdirSync,
   renameSync,
diff --git a/tests/unit/vtt/art-request.test.ts b/tests/unit/vtt/art-request.test.ts
index 5abac2dc4d618870b7ae53792dae14ad8b26e18b..c3e75c93562f9153048dbe77cc143c9c6d7aacd7
--- a/tests/unit/vtt/art-request.test.ts
+++ b/tests/unit/vtt/art-request.test.ts
@@ -5,7 +5,8 @@
   existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
 } from '../../helpers/test-filesystem';
 import { artRequestSchema } from '../../../src/vtt/handoff/v1/contracts';
-import { ART_REQUEST_DEFINITIONS, writeArtRequests } from '../../../tools/vtt-handoff/art-request';
+import { validateJsonSchema } from '../../../src/vtt/handoff/v1/validation';
+import { writeArtRequests } from '../../../tools/vtt-handoff/art-request';
 import { createUuidV7Generator } from '../../../tools/vtt-handoff/uuidv7';
 
 function root(): string {
@@ -20,8 +21,15 @@
   });
 }
 
+const AGREED_ASSET_IDS = [
+  'tile.stone.floor', 'wall.stone', 'door.wood', 'prop.barrel', 'prop.table', 'prop.pillar',
+  'prop.torch', 'token.adventurer', 'token.goblin',
+] as const;
+
+const publishedArtSchema = JSON.parse(readFileSync('contracts/vtt-handoff/v1/art.schema.json', 'utf8')) as object;
+
 describe('handoff art requests', () => {
-  it('exclusively creates the nine schema-valid clean-room requests through partial rename', () => {
+  it('exclusively creates the nine schema-valid clean-room requests through atomic no-replace promotion', () => {
     const handoffRoot = root();
     const result = writeArtRequests({ handoffRoot, generator: generator(), nonce: () => 'fixed' });
     expect(result.status).toBe('created');
@@ -30,19 +38,19 @@
     const requests = result.requestFiles.map((name) => artRequestSchema.parse(
       JSON.parse(readFileSync(join(handoffRoot, 'art/outbox', name), 'utf8')) as unknown,
     ));
-    expect(requests.map((request) => request.assetId).sort())
-      .toEqual(ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId).sort());
+    expect(requests.map((request) => request.assetId).sort()).toEqual([...AGREED_ASSET_IDS].sort());
     for (const request of requests) {
+      expect(validateJsonSchema(publishedArtSchema, request)).toEqual([]);
       expect(request.views).toEqual(['top-down', 'isometric']);
       expect(request.pixelsPerCell).toBe(128);
       expect(request.brief).toContain('ground-centre pivot at [width/2,height]');
       expect(request.brief).toContain('0, 90, 180 and 270 degree facings');
       expect(request.brief).not.toMatch(/copyright|franchise|studio|artist|product/u);
     }
-    for (const id of ['barrel', 'table', 'pillar', 'torch', 'adventurer', 'goblin']) {
+    for (const id of ['prop.barrel', 'prop.table', 'prop.pillar', 'prop.torch', 'token.adventurer', 'token.goblin']) {
       expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background must be transparent');
     }
-    for (const id of ['tile', 'wall', 'door']) {
+    for (const id of ['tile.stone.floor', 'wall.stone', 'door.wood']) {
       expect(requests.find((request) => request.assetId === id)?.brief).toContain('Background may be opaque');
     }
     expect(readdirSync(join(handoffRoot, 'art/outbox')).some((name) => name.includes('.partial'))).toBe(false);
@@ -61,4 +69,31 @@
     expect(readFileSync(destination, 'utf8')).toBe('owner bytes\n');
     expect(existsSync(`${destination}.partial.fixed`)).toBe(false);
   });
+
+  it('never exposes a completion filename before atomic promotion', () => {
+    const handoffRoot = root();
+    const firstId = generator().next();
+    const destination = join(handoffRoot, 'art/outbox', `${firstId}.request.json`);
+    expect(() => writeArtRequests({
+      handoffRoot, generator: generator(), nonce: () => 'fixed',
+      beforePromotion: (path) => {
+        expect(path).toBe(destination);
+        expect(existsSync(path)).toBe(false);
+        throw new Error('SIMULATED_INTERRUPTION');
+      },
+    })).toThrow('SIMULATED_INTERRUPTION');
+    expect(existsSync(destination)).toBe(false);
+    expect(existsSync(`${destination}.partial.fixed`)).toBe(false);
+  });
+
+  it('does not overwrite a destination substituted immediately before promotion', () => {
+    const handoffRoot = root();
+    const firstId = generator().next();
+    const destination = join(handoffRoot, 'art/outbox', `${firstId}.request.json`);
+    expect(() => writeArtRequests({
+      handoffRoot, generator: generator(), nonce: () => 'fixed',
+      beforePromotion: (path) => writeFileSync(path, 'substituted bytes\n'),
+    })).toThrow('ART_REQUEST_COLLISION');
+    expect(readFileSync(destination, 'utf8')).toBe('substituted bytes\n');
+  });
 });
diff --git a/tests/unit/vtt/art-stage.test.ts b/tests/unit/vtt/art-stage.test.ts
index c6d967114610258d5b9b4a2d9e25f9bad808af04..6fa29a58638e91d2df99435bc6d64ae253c501b5
--- a/tests/unit/vtt/art-stage.test.ts
+++ b/tests/unit/vtt/art-stage.test.ts
@@ -1,14 +1,15 @@
 import { createHash } from 'node:crypto';
+import { spawnSync } from 'node:child_process';
 import { join } from 'node:path';
 import { tmpdir } from 'node:os';
 import { describe, expect, it } from 'vitest';
 import {
-  existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync,
+  closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, symlinkSync,
   truncateSync, writeFileSync,
 } from '../../helpers/test-filesystem';
 import { encodePng } from '../../../src/assets/png';
 import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
-import { stageArtResult } from '../../../tools/vtt-handoff/art-stage';
+import { checkArtStage, stageArtResult } from '../../../tools/vtt-handoff/art-stage';
 
 const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';
 
@@ -30,11 +31,11 @@
   const root = mkdtempSync(join(tmpdir(), 'vtt-art-stage-'));
   const outbox = join(root, 'art/outbox');
   const inbox = join(root, 'art/inbox');
-  const bundle = join(inbox, 'bundle');
+  const bundle = join(inbox, requestId);
   mkdirSync(outbox, { recursive: true });
   mkdirSync(bundle, { recursive: true });
   const request: ArtRequest = {
-    schemaVersion: 1, requestId, assetId: 'tile', brief: 'clean-room fixture',
+    schemaVersion: 1, requestId, assetId: 'tile.stone.floor', brief: 'clean-room fixture',
     views: ['top-down', 'isometric'], passes: ['albedo'], pixelsPerCell: 128,
     footprint: { w: 1, h: 1 },
   };
@@ -46,20 +47,20 @@
   let frameIndex = 0;
   for (const view of ['top-down', 'isometric'] as const) {
     for (const facing of [0, 90, 180, 270]) {
-      const path = `bundle/${requestId}__tile-${view}-${String(facing)}.png`;
-      writeFileSync(join(inbox, path), png);
+      const path = `${requestId}__tile-${view}-${String(facing)}.png`;
+      writeFileSync(join(bundle, path), png);
       files.push({ path, sha256: sha256(png) });
       frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
       frameIndex += 1;
     }
   }
-  const source = `bundle/${requestId}__source.txt`;
+  const source = `${requestId}__source.txt`;
   const sourceBytes = Buffer.from('source bytes\n');
-  writeFileSync(join(inbox, source), sourceBytes);
+  writeFileSync(join(bundle, source), sourceBytes);
   files.push({ path: source, sha256: sha256(sourceBytes) });
   const result: ArtResult = {
     schemaVersion: 1, requestId, status: 'complete',
-    assets: [{ assetId: 'tile', footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
+    assets: [{ assetId: 'tile.stone.floor', footprint: { w: 1, h: 1 }, heightCells: 1, pixelsPerCell: 128, frames }],
     provenance: { sourceFiles: [source], files, normalMapConvention: 'none', tool: 'clean-room test tool', notes: '' },
     errors: [],
   };
@@ -95,7 +96,8 @@
     const manifest = JSON.parse(readFileSync(manifestPath(value.root), 'utf8')) as { readonly files: readonly { readonly path: string; readonly sha256: string }[] };
     expect(manifest.files).toHaveLength(9);
     expect(manifest.files.find((entry) => entry.path === value.firstImage)?.sha256)
-      .toBe(sha256(readFileSync(join(value.root, 'art/inbox', value.firstImage))));
+      .toBe(sha256(readFileSync(join(value.bundle, value.firstImage))));
+    expect(checkArtStage({ handoffRoot: value.root })).toEqual({ status: 'verified', completedResults: 1, completedReviews: 1 });
   });
 
   it('rejects changed or stale request/result manifests and publishes no completion', () => {
@@ -118,12 +120,12 @@
     const changed = fixture();
     expect(() => stageArtResult({
       handoffRoot: changed.root, resultRelativePath: changed.resultPath, nonce: () => 'fixed',
-      hooks: { afterCopy: (path) => { if (path === changed.source) writeFileSync(join(changed.root, 'art/inbox', path), 'changed\n'); } },
+      hooks: { afterCopy: (path) => { if (path === changed.source) writeFileSync(join(changed.bundle, path), 'changed\n'); } },
     })).toThrow('ART_PROVENANCE_HASH_MISMATCH');
     expect(existsSync(manifestPath(changed.root))).toBe(false);
 
     const swapped = fixture();
-    const image = join(swapped.root, 'art/inbox', swapped.firstImage);
+    const image = join(swapped.bundle, swapped.firstImage);
     const identical = readFileSync(image);
     expect(() => stageArtResult({
       handoffRoot: swapped.root, resultRelativePath: swapped.resultPath, nonce: () => 'fixed',
@@ -141,12 +143,12 @@
   it('refuses final-file and parent-directory symlink swaps without following outside content', () => {
     const finalSwap = fixture();
     const outside = join(finalSwap.root, 'outside.png');
-    writeFileSync(outside, readFileSync(join(finalSwap.root, 'art/inbox', finalSwap.firstImage)));
+    writeFileSync(outside, readFileSync(join(finalSwap.bundle, finalSwap.firstImage)));
     expect(() => stageArtResult({
       handoffRoot: finalSwap.root, resultRelativePath: finalSwap.resultPath, nonce: () => 'fixed',
       hooks: {
         beforeFinalValidation: () => {
-          const image = join(finalSwap.root, 'art/inbox', finalSwap.firstImage);
+          const image = join(finalSwap.bundle, finalSwap.firstImage);
           rmSync(image);
           symlinkSync(outside, image);
         },
@@ -173,7 +175,7 @@
 
   it('rejects an oversized sparse source before reading and a destination collision without overwrite', () => {
     const oversized = fixture();
-    truncateSync(join(oversized.root, 'art/inbox', oversized.source), 64 * 1024 * 1024 + 1);
+    truncateSync(join(oversized.bundle, oversized.source), 64 * 1024 * 1024 + 1);
     expect(() => stageArtResult({ handoffRoot: oversized.root, resultRelativePath: oversized.resultPath }))
       .toThrow('FILE_SIZE_LIMIT');
     expect(existsSync(manifestPath(oversized.root))).toBe(false);
@@ -199,4 +201,104 @@
     })).toThrow('STAGE_POSTCOPY_MISMATCH');
     expect(existsSync(manifestPath(value.root))).toBe(false);
   });
+
+  it('atomically promotes staged files without an empty completion or overwrite window', () => {
+    const interrupted = fixture();
+    expect(() => stageArtResult({
+      handoffRoot: interrupted.root, resultRelativePath: interrupted.resultPath, nonce: () => 'fixed',
+      hooks: { beforePromotion: () => { throw new Error('SIMULATED_INTERRUPTION'); } },
+    })).toThrow('SIMULATED_INTERRUPTION');
+    expect(existsSync(join(interrupted.root, 'art/review', requestId, 'request.json'))).toBe(false);
+    expect(existsSync(manifestPath(interrupted.root))).toBe(false);
+
+    const substituted = fixture();
+    const completion = manifestPath(substituted.root);
+    expect(() => stageArtResult({
+      handoffRoot: substituted.root, resultRelativePath: substituted.resultPath, nonce: () => 'fixed',
+      hooks: {
+        beforePromotion: (path) => {
+          if (path.endsWith('/review-manifest.json')) writeFileSync(completion, 'substituted bytes\n');
+        },
+      },
+    })).toThrow('DESTINATION_COLLISION');
+    expect(readFileSync(completion, 'utf8')).toBe('substituted bytes\n');
+  });
+
+  it('verifies copied request/result bytes and rejects forged or incomplete review manifests', () => {
+    for (const target of ['request.json', 'result.json'] as const) {
+      const value = fixture();
+      expect(() => stageArtResult({
+        handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
+        hooks: {
+          beforeManifest: () => writeFileSync(join(value.root, 'art/review', requestId, target), 'tampered\n'),
+        },
+      })).toThrow(target === 'request.json' ? 'STAGE_REQUEST_COPY_MISMATCH' : 'STAGE_RESULT_COPY_MISMATCH');
+      expect(existsSync(manifestPath(value.root))).toBe(false);
+    }
+
+    const forged = fixture();
+    stageArtResult({ handoffRoot: forged.root, resultRelativePath: forged.resultPath, nonce: () => 'fixed' });
+    writeFileSync(manifestPath(forged.root), 'null\n');
+    expect(() => checkArtStage({ handoffRoot: forged.root })).toThrow('REVIEW_MANIFEST_INVALID');
+
+    const missing = fixture();
+    stageArtResult({ handoffRoot: missing.root, resultRelativePath: missing.resultPath, nonce: () => 'fixed' });
+    rmSync(join(missing.root, 'art/review', requestId, 'files', missing.firstImage));
+    expect(() => checkArtStage({ handoffRoot: missing.root })).toThrow(/ENOENT/u);
+
+    const hash = fixture();
+    stageArtResult({ handoffRoot: hash.root, resultRelativePath: hash.resultPath, nonce: () => 'fixed' });
+    const manifest = JSON.parse(readFileSync(manifestPath(hash.root), 'utf8')) as { files: { path: string; sha256: string; size: number }[] };
+    manifest.files[0] = { ...manifest.files[0]!, sha256: '0'.repeat(64) };
+    writeFileSync(manifestPath(hash.root), `${JSON.stringify(manifest)}\n`);
+    expect(() => checkArtStage({ handoffRoot: hash.root })).toThrow('REVIEW_FILE_IDENTITY_MISMATCH');
+  });
+
+  it('rejects an unwritten FIFO promptly before any read', () => {
+    const value = fixture();
+    const fifo = join(value.bundle, value.source);
+    rmSync(fifo);
+    expect(spawnSync('mkfifo', [fifo]).status).toBe(0);
+    const started = performance.now();
+    expect(() => stageArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
+      .toThrow('REGULAR_FILE_REQUIRED');
+    expect(performance.now() - started).toBeLessThan(1_000);
+    expect(existsSync(manifestPath(value.root))).toBe(false);
+  });
+
+  it('survives a parent swap after descriptor retention while ordinary traversal reads outside', () => {
+    const value = fixture();
+    const held = `${value.bundle}.held`;
+    const outside = join(value.root, 'outside-bundle');
+    mkdirSync(outside);
+    writeFileSync(join(outside, value.firstImage), 'outside bytes\n');
+    let swapped = false;
+    let outsideReads = 0;
+    expect(() => stageArtResult({
+      handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed',
+      hooks: {
+        safeFileHooks: {
+          beforeChildOpen: (parent, child) => {
+            if (!swapped && parent === `art/inbox/${requestId}` && child === value.firstImage) {
+              swapped = true;
+              renameSync(value.bundle, held);
+              symlinkSync(outside, value.bundle, 'dir');
+            }
+          },
+          onFileRead: (path) => { if (path.startsWith(outside)) outsideReads += 1; },
+        },
+      },
+    })).toThrow('ANCHORED_FILE_MISMATCH');
+    expect(outsideReads).toBe(0);
+    expect(existsSync(manifestPath(value.root))).toBe(false);
+
+    const retainedParent = openSync(join(value.root, 'art/inbox'), 'r');
+    try {
+      const ordinary = readFileSync(join(value.bundle, value.firstImage), 'utf8');
+      if (ordinary === 'outside bytes\n') outsideReads += 1;
+    } finally {
+      closeSync(retainedParent);
+    }
+    expect(outsideReads).toBe(1);
+  });
 });
diff --git a/tests/unit/vtt/art-validator.test.ts b/tests/unit/vtt/art-validator.test.ts
index 8fcaf4bf032f3534c0309e25841ee12ae8e1366a..65cb5b1c487e69f412fc841a01999520fe8586d4
--- a/tests/unit/vtt/art-validator.test.ts
+++ b/tests/unit/vtt/art-validator.test.ts
@@ -7,7 +7,7 @@
 } from '../../helpers/test-filesystem';
 import { encodePng } from '../../../src/assets/png';
 import type { ArtRequest, ArtResult } from '../../../src/vtt/handoff/v1/contracts';
-import { validateArtResult, validateCompletedArtResults } from '../../../tools/vtt-handoff/art-validator';
+import { listArtResults, validateArtResult, validateCompletedArtResults } from '../../../tools/vtt-handoff/art-validator';
 
 const requestId = '018f47a2-7b3c-7abc-8def-0123456789ab';
 
@@ -23,11 +23,11 @@
   readonly bundle: string;
 }
 
-function fixture(assetId: 'tile' | 'barrel' = 'tile', transparent = false): Fixture {
+function fixture(assetId: 'tile.stone.floor' | 'prop.barrel' = 'tile.stone.floor', transparent = false): Fixture {
   const root = mkdtempSync(join(tmpdir(), 'vtt-art-validator-'));
   const outbox = join(root, 'art/outbox');
   const inbox = join(root, 'art/inbox');
-  const bundle = join(inbox, 'bundle');
+  const bundle = join(inbox, requestId);
   mkdirSync(outbox, { recursive: true });
   mkdirSync(bundle, { recursive: true });
   const request: ArtRequest = {
@@ -43,16 +43,16 @@
   let frameIndex = 0;
   for (const view of ['top-down', 'isometric'] as const) {
     for (const facing of [0, 90, 180, 270]) {
-      const path = `bundle/${requestId}__${assetId}-${view}-${String(facing)}.png`;
-      writeFileSync(join(inbox, path), png);
+      const path = `${requestId}__${assetId}-${view}-${String(facing)}.png`;
+      writeFileSync(join(bundle, path), png);
       files.push({ path, sha256: sha256(png) });
       frames.push({ facing, frameIndex, view, width: 1, height: 1, pivotPx: [0.5, 1], albedo: path });
       frameIndex += 1;
     }
   }
-  const source = `bundle/${requestId}__source.txt`;
+  const source = `${requestId}__source.txt`;
   const sourceBytes = Buffer.from('original clean-room source\n');
-  writeFileSync(join(inbox, source), sourceBytes);
+  writeFileSync(join(bundle, source), sourceBytes);
   files.push({ path: source, sha256: sha256(sourceBytes) });
   const result: ArtResult = {
     schemaVersion: 1, requestId, status: 'complete',
@@ -71,19 +71,19 @@
 
 describe('completed art result validation', () => {
   it('accepts a valid opaque floor and a valid transparent prop', () => {
-    const opaque = fixture('tile', false);
+    const opaque = fixture('tile.stone.floor', false);
     const validatedOpaque = validateArtResult({ handoffRoot: opaque.root, resultRelativePath: opaque.resultPath });
     expect(validatedOpaque.totalBytes).toBeGreaterThan(0);
     expect(validatedOpaque.files).toHaveLength(9);
-    const transparent = fixture('barrel', true);
+    const transparent = fixture('prop.barrel', true);
     expect(validateArtResult({ handoffRoot: transparent.root, resultRelativePath: transparent.resultPath }).request.assetId)
-      .toBe('barrel');
+      .toBe('prop.barrel');
   });
 
   it('keeps PNG validity separate from the per-id transparency rule', () => {
-    const value = fixture('barrel', false);
+    const value = fixture('prop.barrel', false);
     expect(() => validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
-      .toThrow('ART_TRANSPARENCY_REQUIRED: barrel');
+      .toThrow('ART_TRANSPARENCY_REQUIRED: prop.barrel');
   });
 
   it('rejects traversal, drive, UNC, absolute and symlinked provenance inputs', () => {
@@ -111,8 +111,8 @@
     const frame = linked.result.assets[0]?.frames[0];
     if (frame === undefined) throw new Error('fixture frame missing');
     const external = join(linked.root, 'external.png');
-    writeFileSync(external, readFileSync(join(linked.root, 'art/inbox', frame.albedo)));
-    const target = join(linked.root, 'art/inbox', frame.albedo);
+    writeFileSync(external, readFileSync(join(linked.bundle, frame.albedo)));
+    const target = join(linked.bundle, frame.albedo);
     rmSync(target);
     symlinkSync(external, target);
     expect(() => validateArtResult({ handoffRoot: linked.root, resultRelativePath: linked.resultPath })).toThrow(/ELOOP|REGULAR_FILE_REQUIRED/u);
@@ -181,11 +181,11 @@
       writeFileSync(join(misaligned.root, 'art/outbox', `${requestId}.request.json`), `${JSON.stringify({ ...misaligned.request, passes: ['albedo', passName] })}\n`);
       const extraFiles: { path: string; sha256: string }[] = [];
       const frames = misaligned.result.assets[0]!.frames.map((entry, index) => {
-        const passPath = `bundle/${requestId}__${passName}-${String(index)}.png`;
+        const passPath = `${requestId}__${passName}-${String(index)}.png`;
         const png = index === 0
           ? Buffer.from(encodePng(2, 1, Uint8Array.of(0, 0, 255, 255, 0, 0, 255, 255)))
           : Buffer.from(encodePng(1, 1, Uint8Array.of(0, 0, 255, 255)));
-        writeFileSync(join(misaligned.root, 'art/inbox', passPath), png);
+        writeFileSync(join(misaligned.bundle, passPath), png);
         extraFiles.push({ path: passPath, sha256: sha256(png) });
         return { ...entry, [passName]: passPath };
       });
@@ -198,4 +198,81 @@
         .toThrow('ART_PASS_DIMENSION_MISMATCH');
     }
   });
+
+  it('enforces the literal owner-agreement manifest and UUID bundle layout', () => {
+    const value = fixture();
+    expect(value.resultPath).toBe(`art/inbox/${requestId}.result.json`);
+    expect(value.bundle).toBe(join(value.root, 'art/inbox', requestId));
+
+    const outside = fixture();
+    const outsidePath = `outside/${requestId}.result.json`;
+    mkdirSync(join(outside.root, 'outside'));
+    writeFileSync(join(outside.root, outsidePath), readFileSync(join(outside.root, outside.resultPath)));
+    expect(() => validateArtResult({ handoffRoot: outside.root, resultRelativePath: outsidePath }))
+      .toThrow('ART_RESULT_LOCATION_INVALID');
+
+    const crossing = fixture();
+    const otherId = '018f47a2-7b3c-7abc-8def-0123456789ac';
+    const frame = crossing.result.assets[0]!.frames[0]!;
+    const escaped = `../${otherId}/${requestId}__escape.png`;
+    rewriteResult(crossing, {
+      ...crossing.result,
+      assets: [{ ...crossing.result.assets[0]!, frames: [{ ...frame, albedo: escaped }, ...crossing.result.assets[0]!.frames.slice(1)] }],
+      provenance: {
+        ...crossing.result.provenance,
+        files: crossing.result.provenance.files.map((entry) => entry.path === frame.albedo ? { ...entry, path: escaped } : entry),
+      },
+    });
+    expect(() => validateArtResult({ handoffRoot: crossing.root, resultRelativePath: crossing.resultPath }))
+      .toThrow('ART_SEMANTIC_NON_RELATIVE_PATH');
+  });
+
+  it('preserves composite frame uniqueness while allowing animation frames and reused indices', () => {
+    const value = fixture();
+    const baseFrames = value.result.assets[0]!.frames.map((frame) => ({ ...frame, frameIndex: 0 }));
+    const extraFiles: { path: string; sha256: string }[] = [];
+    const extraFrames = baseFrames.map((frame) => {
+      const path = frame.albedo.replace('.png', '-animation-1.png');
+      const bytes = readFileSync(join(value.bundle, frame.albedo));
+      writeFileSync(join(value.bundle, path), bytes);
+      extraFiles.push({ path, sha256: sha256(bytes) });
+      return { ...frame, frameIndex: 1, albedo: path };
+    });
+    const accepted: ArtResult = {
+      ...value.result,
+      assets: [{ ...value.result.assets[0]!, frames: [...baseFrames, ...extraFrames] }],
+      provenance: { ...value.result.provenance, files: [...value.result.provenance.files, ...extraFiles] },
+    };
+    rewriteResult(value, accepted);
+    expect(validateArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }).result.assets[0]?.frames)
+      .toHaveLength(16);
+
+    const rejected = fixture();
+    const duplicate = rejected.result.assets[0]!.frames[0]!;
+    rewriteResult(rejected, {
+      ...rejected.result,
+      assets: [{ ...rejected.result.assets[0]!, frames: [...rejected.result.assets[0]!.frames, duplicate] }],
+    });
+    expect(() => validateArtResult({ handoffRoot: rejected.root, resultRelativePath: rejected.resultPath }))
+      .toThrow('ART_SEMANTIC_DUPLICATE_FRAME');
+  });
+
+  it('lists complete, partial and blocked manifests without labeling incomplete assets complete', () => {
+    const complete = fixture();
+    const partialResult = { ...complete.result, status: 'partial' as const, assets: [], provenance: { ...complete.result.provenance, sourceFiles: [], files: [] } };
+    const blockedResult = { ...partialResult, status: 'blocked' as const };
+    const partialId = '018f47a2-7b3c-7abc-8def-0123456789ac';
+    const blockedId = '018f47a2-7b3c-7abc-8def-0123456789ad';
+    for (const [id, result] of [[partialId, partialResult], [blockedId, blockedResult]] as const) {
+      writeFileSync(join(complete.root, 'art/outbox', `${id}.request.json`), `${JSON.stringify({ ...complete.request, requestId: id })}\n`);
+      writeFileSync(join(complete.root, 'art/inbox', `${id}.result.json`), `${JSON.stringify({ ...result, requestId: id })}\n`);
+    }
+    const listing = listArtResults({ handoffRoot: complete.root });
+    expect(listing.map((entry) => ({ id: entry.requestId, status: entry.status, completed: entry.completedAsset }))).toEqual([
+      { id: requestId, status: 'complete', completed: true },
+      { id: partialId, status: 'partial', completed: false },
+      { id: blockedId, status: 'blocked', completed: false },
+    ]);
+    expect(validateCompletedArtResults({ handoffRoot: complete.root })).toHaveLength(1);
+  });
 });
diff --git a/tests/unit/vtt/png-validator.test.ts b/tests/unit/vtt/png-validator.test.ts
index 1b06a1c9337e16764445d742df311a8422044bf1..4ec72217a6249e35545145a8f9c2021ffeb560d7
--- a/tests/unit/vtt/png-validator.test.ts
+++ b/tests/unit/vtt/png-validator.test.ts
@@ -6,7 +6,10 @@
 const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
 
 function chunk(type: string, data: Uint8Array): Buffer {
-  const typeBytes = Buffer.from(type, 'ascii');
+  return chunkBytes(Buffer.from(type, 'ascii'), data);
+}
+
+function chunkBytes(typeBytes: Buffer, data: Uint8Array): Buffer {
   const output = Buffer.alloc(12 + data.length);
   output.writeUInt32BE(data.length, 0);
   typeBytes.copy(output, 4);
@@ -44,8 +47,17 @@
   });
 
   it('unfilters every exact PNG filter 0 through 4 and rejects filter 5', () => {
+    const rowsByFilter = new Map<number, Uint8Array>([
+      [0, Uint8Array.of(0, 10, 20, 30, 255, 40, 50, 60, 255, 0, 70, 80, 90, 255, 100, 110, 120, 255)],
+      [1, Uint8Array.of(1, 10, 20, 30, 255, 30, 30, 30, 0, 1, 70, 80, 90, 255, 30, 30, 30, 0)],
+      [2, Uint8Array.of(2, 10, 20, 30, 255, 40, 50, 60, 255, 2, 60, 60, 60, 0, 60, 60, 60, 0)],
+      [3, Uint8Array.of(3, 10, 20, 30, 255, 35, 40, 45, 128, 3, 65, 70, 75, 128, 45, 45, 45, 0)],
+      [4, Uint8Array.of(4, 10, 20, 30, 255, 30, 30, 30, 0, 4, 60, 60, 60, 0, 30, 30, 30, 0)],
+    ]);
     for (const filter of [0, 1, 2, 3, 4]) {
-      expect(validatePng(pngFromRaw(Uint8Array.of(filter, 0, 0, 0, 0))).hasTransparency).toBe(true);
+      const rows = rowsByFilter.get(filter);
+      if (rows === undefined) throw new Error('filter fixture missing');
+      expect(validatePng(pngFromRaw(rows, ihdr(2, 2))).hasTransparency, `filter ${String(filter)}`).toBe(false);
     }
     expect(() => validatePng(pngFromRaw(Uint8Array.of(5, 0, 0, 0, 0)))).toThrow('PNG_FILTER');
   });
@@ -86,6 +98,14 @@
     expect(() => validatePng(Buffer.concat([
       signature, ihdr(), chunk('ABCD', Buffer.alloc(0)), chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
     ]))).toThrow('PNG_UNKNOWN_CRITICAL_CHUNK');
+    expect(() => validatePng(Buffer.concat([
+      signature, chunkBytes(Buffer.from([0xc9, 0xc8, 0xc4, 0xd2]), Buffer.alloc(13)),
+      chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
+    ]))).toThrow('PNG_CHUNK_TYPE');
+    expect(() => validatePng(Buffer.concat([
+      signature, ihdr(), chunkBytes(Buffer.from('abcd'), Buffer.alloc(0)),
+      chunk('IDAT', deflateSync(Uint8Array.of(0, 0, 0, 0, 0))), chunk('IEND', Buffer.alloc(0)),
+    ]))).toThrow('PNG_CHUNK_TYPE');
     expect(() => validatePng(pngFromRaw(Uint8Array.of(0, 0, 0, 0)))).toThrow('PNG_SCANLINE_LENGTH');
     expect(() => validatePng(pngFromCompressed(Buffer.concat([
       deflateSync(Uint8Array.of(0, 0, 0, 0, 0)), Buffer.from([1, 2, 3]),
@@ -101,5 +121,12 @@
     expect(() => validatePng(Buffer.concat([
       signature, ihdr(), chunk('IDAT', compressedBomb), chunk('IEND', Buffer.alloc(0)),
     ]))).toThrow('PNG_COMPRESSED_LIMIT');
+    const expanded = Buffer.alloc(401);
+    expect(() => validatePng(pngFromCompressed(deflateSync(expanded), ihdr(100, 1)), {
+      maximumInflateOutputBytes: 64,
+    })).toThrow('PNG_INFLATE');
+    const validCompressed = deflateSync(Uint8Array.of(0, 0, 0, 0, 255));
+    expect(() => validatePng(pngFromCompressed(validCompressed.subarray(0, validCompressed.length - 1))))
+      .toThrow('PNG_INFLATE');
   });
 });
diff --git a/tests/unit/vtt/windows-probe.test.ts b/tests/unit/vtt/windows-probe.test.ts
index da597b038f879f4c1f002a61d98aebce827aa5bf..c9a61b6b465b2e6b9fac72e0404991c11ef9159f
--- a/tests/unit/vtt/windows-probe.test.ts
+++ b/tests/unit/vtt/windows-probe.test.ts
@@ -47,6 +47,11 @@
   };
 }
 
+function collisionRandom(): (size: number) => Uint8Array {
+  let payload = 0;
+  return (size) => new Uint8Array(size).fill(size === 16 ? 9 : ++payload);
+}
+
 describe('real Windows interop probe classification', () => {
   it('returns NOT_RUN without the explicit opt-in and invokes no runner', () => {
     const run = vi.fn(() => result(1));
@@ -119,4 +124,35 @@
     expect(report.checks).toEqual([{ name: 'powershell', passed: true, detail: '7.4.0' }]);
     expect(readdirSync(handoffRoot)).toEqual([]);
   });
+
+  it('preserves a pre-existing exact Windows-created probe filename collision', () => {
+    const handoffRoot = root();
+    const token = '09'.repeat(16);
+    const collision = join(handoffRoot, `.vtt-interop-${token}.windows.bin`);
+    writeFileSync(collision, 'pre-existing windows bytes\n');
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: interoperableRunner(handoffRoot),
+      randomBytes: collisionRandom(),
+    });
+    expect(report.status).toBe('FAILED');
+    expect(readFileSync(collision, 'utf8')).toBe('pre-existing windows bytes\n');
+  });
+
+  it('preserves a pre-existing exact Linux-created probe filename collision', () => {
+    const handoffRoot = root();
+    const token = '09'.repeat(16);
+    const collision = join(handoffRoot, `.vtt-interop-${token}.linux.bin`);
+    writeFileSync(collision, 'pre-existing linux bytes\n');
+    const report = windowsInteropProbe({
+      handoffRoot,
+      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
+      runner: interoperableRunner(handoffRoot),
+      randomBytes: collisionRandom(),
+    });
+    expect(report.status).toBe('FAILED');
+    expect(readFileSync(collision, 'utf8')).toBe('pre-existing linux bytes\n');
+    expect(readdirSync(handoffRoot)).toEqual([`.vtt-interop-${token}.linux.bin`]);
+  });
 });
diff --git a/tools/vtt-handoff/art-request.ts b/tools/vtt-handoff/art-request.ts
index a9cc59122e56f5d21be053a04d948485d270a3a1..4305fee73356b1874833f8ea17279d1506334dbc
--- a/tools/vtt-handoff/art-request.ts
+++ b/tools/vtt-handoff/art-request.ts
@@ -1,11 +1,12 @@
 import { randomBytes } from 'node:crypto';
 import {
-  closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync,
-  unlinkSync, writeSync,
+  closeSync, constants, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync,
+  readdirSync, unlinkSync, writeSync,
 } from 'node:fs';
 import { isAbsolute, join, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
 import { artRequestSchema, type ArtRequest } from '../../src/vtt/handoff/v1/contracts.ts';
+import { validateJsonSchema } from '../../src/vtt/handoff/v1/validation.ts';
 import { createUuidV7Generator, type UuidV7Generator } from './uuidv7.ts';
 
 const STYLE = 'Clean-room original fantasy tabletop asset; restrained stone, wood, iron and warm-fire palette; crisp readable silhouette; no text, logos, signatures or references to existing works.';
@@ -21,15 +22,15 @@
 }
 
 export const ART_REQUEST_DEFINITIONS: readonly RequestDefinition[] = [
-  { assetId: 'tile', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'repeatable dungeon ground tile' },
-  { assetId: 'wall', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional dungeon wall segment' },
-  { assetId: 'door', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional closed dungeon door' },
-  { assetId: 'barrel', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding wooden barrel prop' },
-  { assetId: 'table', footprint: { w: 2, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding rectangular wooden table prop' },
-  { assetId: 'pillar', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding stone pillar prop' },
-  { assetId: 'torch', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal', 'emissive'], transparent: true, purpose: 'freestanding lit torch prop' },
-  { assetId: 'adventurer', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable humanoid adventurer token' },
-  { assetId: 'goblin', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable small goblin token' },
+  { assetId: 'tile.stone.floor', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'repeatable dungeon ground tile' },
+  { assetId: 'wall.stone', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional dungeon wall segment' },
+  { assetId: 'door.wood', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: false, purpose: 'directional closed dungeon door' },
+  { assetId: 'prop.barrel', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding wooden barrel prop' },
+  { assetId: 'prop.table', footprint: { w: 2, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding rectangular wooden table prop' },
+  { assetId: 'prop.pillar', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'freestanding stone pillar prop' },
+  { assetId: 'prop.torch', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal', 'emissive'], transparent: true, purpose: 'freestanding lit torch prop' },
+  { assetId: 'token.adventurer', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable humanoid adventurer token' },
+  { assetId: 'token.goblin', footprint: { w: 1, h: 1 }, passes: ['albedo', 'normal'], transparent: true, purpose: 'readable small goblin token' },
 ] as const;
 
 function requestBrief(definition: RequestDefinition): string {
@@ -57,7 +58,22 @@
   return resolve(value);
 }
 
-function writeExclusiveViaPartial(destination: string, bytes: Buffer, nonce: () => string): void {
+function requirePublishedSchema(request: ArtRequest): void {
+  const schema = JSON.parse(readFileSync(resolve(process.cwd(), 'contracts/vtt-handoff/v1/art.schema.json'), 'utf8')) as object;
+  if (validateJsonSchema(schema, request).length > 0) throw new Error(`ART_REQUEST_JSON_SCHEMA_INVALID: ${request.assetId}`);
+}
+
+function syncDirectory(directory: string): void {
+  const handle = openSync(directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
+  try { fsyncSync(handle); } finally { closeSync(handle); }
+}
+
+function writeExclusiveViaPartial(
+  destination: string,
+  bytes: Buffer,
+  nonce: () => string,
+  beforePromotion?: (destination: string) => void,
+): void {
   const partial = `${destination}.partial.${nonce()}`;
   let partialHandle: number;
   try {
@@ -66,18 +82,19 @@
     if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_PARTIAL_COLLISION');
     throw error;
   }
-  let reserved = false;
   try {
-    writeSync(partialHandle, bytes);
+    let offset = 0;
+    while (offset < bytes.length) offset += writeSync(partialHandle, bytes, offset, bytes.length - offset, offset);
+    fsyncSync(partialHandle);
     closeSync(partialHandle);
     partialHandle = -1;
-    const reservation = openSync(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
-    closeSync(reservation);
-    reserved = true;
-    renameSync(partial, destination);
+    if (!readFileSync(partial).equals(bytes)) throw new Error('ART_REQUEST_PARTIAL_MISMATCH');
+    beforePromotion?.(destination);
+    linkSync(partial, destination);
+    unlinkSync(partial);
+    syncDirectory(resolve(destination, '..'));
   } catch (error) {
     if (partialHandle >= 0) closeSync(partialHandle);
-    if (reserved) unlinkSync(destination);
     if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('ART_REQUEST_COLLISION');
     throw error;
   } finally {
@@ -96,6 +113,7 @@
   readonly generator?: UuidV7Generator;
   readonly check?: boolean;
   readonly nonce?: () => string;
+  readonly beforePromotion?: (destination: string) => void;
 } = {}): ArtRequestBatchResult {
   const root = configuredRoot(options.handoffRoot);
   const outbox = join(root, 'art', 'outbox');
@@ -107,6 +125,7 @@
     for (const name of names) {
       const parsed: unknown = JSON.parse(readFileSync(join(outbox, name), 'utf8'));
       const request = artRequestSchema.parse(parsed);
+      requirePublishedSchema(request);
       if (!UUID_V7.test(request.requestId)) throw new Error('ART_REQUEST_ID_INVALID');
       if (name !== `${request.requestId}.request.json`) throw new Error('ART_REQUEST_FILENAME_MISMATCH');
       if (assets.has(request.assetId)) throw new Error('ART_REQUEST_ASSET_DUPLICATE');
@@ -128,8 +147,12 @@
   const nonce = options.nonce ?? (() => `${String(process.pid)}.${randomBytes(8).toString('hex')}`);
   const requestFiles: string[] = [];
   for (const request of requests) {
+    requirePublishedSchema(request);
     const name = `${request.requestId}.request.json`;
-    writeExclusiveViaPartial(join(outbox, name), Buffer.from(`${JSON.stringify(request, null, 2)}\n`), nonce);
+    writeExclusiveViaPartial(
+      join(outbox, name), Buffer.from(`${JSON.stringify(request, null, 2)}\n`), nonce,
+      options.beforePromotion,
+    );
     requestFiles.push(name);
   }
   return { root, requestFiles, status: 'created' };
diff --git a/tools/vtt-handoff/art-stage.ts b/tools/vtt-handoff/art-stage.ts
index b3d28c4a36bdeb093f9159131330f3af42a562c4..325800b39e893b1ad418611c0e90e346eff49b6a
--- a/tools/vtt-handoff/art-stage.ts
+++ b/tools/vtt-handoff/art-stage.ts
@@ -1,18 +1,26 @@
-import { randomBytes } from 'node:crypto';
+import { createHash, randomBytes } from 'node:crypto';
 import { existsSync, mkdirSync, readdirSync } from 'node:fs';
 import { isAbsolute, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
+import { z } from 'zod';
+import { artRequestSchema, artResultSchema } from '../../src/vtt/handoff/v1/contracts.ts';
+import { artSemanticIssues } from '../../src/vtt/handoff/v1/validation.ts';
 import { validateArtResult, validateCompletedArtResults, type ValidatedArtResult } from './art-validator.ts';
 import {
   createAnchoredDirectoryExclusive, createAnchoredFileExclusive, ensureAnchoredDirectory,
   promoteAnchoredPartial, readAnchoredFile, safeRelativeComponents, sameFileIdentity,
+  type SafeFileHooks,
 } from './safe-files.ts';
 
+const ART_STAGE_FILE_LIMIT = 64 * 1024 * 1024;
+
 export interface ArtStageHooks {
   readonly afterInitialValidation?: (validated: ValidatedArtResult) => void;
   readonly afterCopy?: (declaredPath: string) => void;
   readonly beforeFinalValidation?: () => void;
   readonly beforeManifest?: () => void;
+  readonly beforePromotion?: (destinationPath: string) => void;
+  readonly safeFileHooks?: SafeFileHooks;
 }
 
 export interface ArtStageResult {
@@ -31,7 +39,13 @@
   return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
 }
 
-function createStagedFile(root: string, relativePath: string, bytes: Buffer, nonce: string): void {
+function createStagedFile(
+  root: string,
+  relativePath: string,
+  bytes: Buffer,
+  nonce: string,
+  beforePromotion?: (destinationPath: string) => void,
+): void {
   const components = safeRelativeComponents(relativePath);
   const filename = components.at(-1);
   if (filename === undefined) throw new Error('STAGE_PATH_INVALID');
@@ -41,11 +55,38 @@
   const written = createAnchoredFileExclusive(root, partial, bytes);
   const checked = readAnchoredFile(root, partial, bytes.length);
   if (written.sha256 !== checked.identity.sha256 || !checked.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
-  promoteAnchoredPartial(root, partial, relativePath);
+  promoteAnchoredPartial(root, partial, relativePath, beforePromotion);
   const final = readAnchoredFile(root, relativePath, bytes.length);
   if (final.identity.sha256 !== written.sha256 || !final.bytes.equals(bytes)) throw new Error(`STAGE_POSTCOPY_MISMATCH: ${relativePath}`);
 }
 
+const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
+const reviewManifestSchema = z.strictObject({
+  schemaVersion: z.literal(1),
+  requestId: z.string(),
+  requestSha256: sha256Schema,
+  resultSha256: sha256Schema,
+  files: z.array(z.strictObject({
+    path: z.string(), sha256: sha256Schema,
+    size: z.number().int().nonnegative().max(ART_STAGE_FILE_LIMIT),
+  })),
+  totalBytes: z.number().int().nonnegative(),
+});
+
+function requireStagedPayload(
+  root: string,
+  relativePath: string,
+  expected: Buffer,
+  code: string,
+): void {
+  const staged = readAnchoredFile(root, relativePath, Math.max(expected.length, 1024 * 1024));
+  if (staged.identity.sha256 !== sha256(expected) || !staged.bytes.equals(expected)) throw new Error(code);
+}
+
+function sha256(bytes: Uint8Array): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
 function matchingValidation(before: ValidatedArtResult, after: ValidatedArtResult): boolean {
   if (!sameFileIdentity(before.requestFile.identity, after.requestFile.identity) ||
     !sameFileIdentity(before.resultFile.identity, after.resultFile.identity) ||
@@ -64,28 +105,39 @@
   readonly hooks?: ArtStageHooks;
 }): ArtStageResult {
   const root = configuredRoot(options.handoffRoot);
-  const validated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
+  const validationHooks = options.hooks?.safeFileHooks === undefined
+    ? {}
+    : { safeFileHooks: options.hooks.safeFileHooks };
+  const validated = validateArtResult({
+    handoffRoot: root, resultRelativePath: options.resultRelativePath,
+    hooks: validationHooks,
+  });
   options.hooks?.afterInitialValidation?.(validated);
   ensureAnchoredDirectory(root, 'art/review');
   const reviewDirectory = `art/review/${validated.request.requestId}`;
   createAnchoredDirectoryExclusive(root, reviewDirectory);
   const nonce = (options.nonce ?? (() => randomBytes(8).toString('hex')))();
-  createStagedFile(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, nonce);
-  createStagedFile(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, nonce);
+  createStagedFile(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, nonce, options.hooks?.beforePromotion);
+  createStagedFile(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, nonce, options.hooks?.beforePromotion);
   for (const entry of validated.files) {
-    createStagedFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, entry.file.bytes, nonce);
+    createStagedFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, entry.file.bytes, nonce, options.hooks?.beforePromotion);
     options.hooks?.afterCopy?.(entry.declaredPath);
   }
   options.hooks?.beforeFinalValidation?.();
-  const revalidated = validateArtResult({ handoffRoot: root, resultRelativePath: options.resultRelativePath });
+  const revalidated = validateArtResult({
+    handoffRoot: root, resultRelativePath: options.resultRelativePath,
+    hooks: validationHooks,
+  });
   if (!matchingValidation(validated, revalidated)) throw new Error('STAGE_SOURCE_CHANGED');
+  options.hooks?.beforeManifest?.();
+  requireStagedPayload(root, `${reviewDirectory}/request.json`, validated.requestFile.bytes, 'STAGE_REQUEST_COPY_MISMATCH');
+  requireStagedPayload(root, `${reviewDirectory}/result.json`, validated.resultFile.bytes, 'STAGE_RESULT_COPY_MISMATCH');
   for (const entry of validated.files) {
     const staged = readAnchoredFile(root, `${reviewDirectory}/files/${entry.declaredPath}`, ART_STAGE_FILE_LIMIT);
     if (staged.identity.sha256 !== entry.file.identity.sha256 || !staged.bytes.equals(entry.file.bytes)) {
       throw new Error(`STAGE_POSTCOPY_MISMATCH: ${entry.declaredPath}`);
     }
   }
-  options.hooks?.beforeManifest?.();
   const manifest = `${reviewDirectory}/review-manifest.json`;
   createStagedFile(root, manifest, json({
     schemaVersion: 1,
@@ -94,11 +146,51 @@
     resultSha256: validated.resultFile.identity.sha256,
     files: validated.files.map((entry) => ({ path: entry.declaredPath, sha256: entry.file.identity.sha256, size: entry.file.identity.size })),
     totalBytes: validated.totalBytes,
-  }), nonce);
+  }), nonce, options.hooks?.beforePromotion);
   return { requestId: validated.request.requestId, reviewDirectory, manifest, files: validated.files.length };
 }
 
-const ART_STAGE_FILE_LIMIT = 64 * 1024 * 1024;
+function verifyReview(root: string, reviewId: string): void {
+  const directory = `art/review/${reviewId}`;
+  let manifestInput: unknown;
+  try {
+    manifestInput = JSON.parse(
+      readAnchoredFile(root, `${directory}/review-manifest.json`, 1024 * 1024).bytes.toString('utf8'),
+    ) as unknown;
+  } catch {
+    throw new Error('REVIEW_MANIFEST_INVALID');
+  }
+  const parsedManifest = reviewManifestSchema.safeParse(manifestInput);
+  if (!parsedManifest.success) throw new Error('REVIEW_MANIFEST_INVALID');
+  const manifest = parsedManifest.data;
+  if (manifest.requestId !== reviewId) throw new Error('REVIEW_MANIFEST_ID_MISMATCH');
+  const requestFile = readAnchoredFile(root, `${directory}/request.json`, 1024 * 1024);
+  const resultFile = readAnchoredFile(root, `${directory}/result.json`, 1024 * 1024);
+  if (requestFile.identity.sha256 !== manifest.requestSha256) throw new Error('REVIEW_REQUEST_HASH_MISMATCH');
+  if (resultFile.identity.sha256 !== manifest.resultSha256) throw new Error('REVIEW_RESULT_HASH_MISMATCH');
+  const request = artRequestSchema.parse(JSON.parse(requestFile.bytes.toString('utf8')) as unknown);
+  const result = artResultSchema.parse(JSON.parse(resultFile.bytes.toString('utf8')) as unknown);
+  if (request.requestId !== reviewId || result.requestId !== reviewId || result.status !== 'complete') {
+    throw new Error('REVIEW_IDENTITY_MISMATCH');
+  }
+  const issues = artSemanticIssues(request, result);
+  if (issues.length > 0) throw new Error(`REVIEW_SEMANTIC_${issues[0]?.code ?? 'INVALID'}`);
+  const expectedPaths = [...result.provenance.files.map((entry) => entry.path)].sort();
+  const manifestPaths = [...manifest.files.map((entry) => entry.path)].sort();
+  if (new Set(manifestPaths).size !== manifestPaths.length || JSON.stringify(expectedPaths) !== JSON.stringify(manifestPaths)) {
+    throw new Error('REVIEW_FILE_SET_MISMATCH');
+  }
+  let totalBytes = 0;
+  for (const entry of manifest.files) {
+    safeRelativeComponents(entry.path);
+    const staged = readAnchoredFile(root, `${directory}/files/${entry.path}`, ART_STAGE_FILE_LIMIT);
+    if (staged.identity.sha256 !== entry.sha256 || staged.identity.size !== entry.size) {
+      throw new Error(`REVIEW_FILE_IDENTITY_MISMATCH: ${entry.path}`);
+    }
+    totalBytes += entry.size;
+  }
+  if (totalBytes !== manifest.totalBytes) throw new Error('REVIEW_TOTAL_SIZE_MISMATCH');
+}
 
 export function checkArtStage(options: { readonly handoffRoot?: string } = {}): {
   readonly status: 'verified';
@@ -112,13 +204,10 @@
   if (existsSync(review)) {
     for (const entry of readdirSync(review, { withFileTypes: true })) {
       if (!entry.isDirectory()) continue;
-      const path = `art/review/${entry.name}/review-manifest.json`;
-      try {
-        JSON.parse(readAnchoredFile(root, path, 1024 * 1024).bytes.toString('utf8')) as unknown;
-        completedReviews += 1;
-      } catch (error) {
-        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
-      }
+      const names = readdirSync(resolve(review, entry.name));
+      if (!names.includes('review-manifest.json')) continue;
+      verifyReview(root, entry.name);
+      completedReviews += 1;
     }
   }
   return { status: 'verified', completedResults: results.length, completedReviews };
diff --git a/tools/vtt-handoff/art-validator.ts b/tools/vtt-handoff/art-validator.ts
index 90c44f990d5e059f8f5987daa2f6fbf277a7defc..d9039be401f4da4765f53bce693a06989b05b21b
--- a/tools/vtt-handoff/art-validator.ts
+++ b/tools/vtt-handoff/art-validator.ts
@@ -1,19 +1,24 @@
 import { existsSync, lstatSync, readdirSync } from 'node:fs';
-import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
+import { isAbsolute, join, relative, resolve } from 'node:path';
 import { fileURLToPath } from 'node:url';
 import {
   artRequestSchema, artResultSchema, type ArtRequest, type ArtResult, type ArtView,
 } from '../../src/vtt/handoff/v1/contracts.ts';
 import { artSemanticIssues } from '../../src/vtt/handoff/v1/validation.ts';
-import { readAnchoredFile, safeRelativeComponents, type AnchoredFile } from './safe-files.ts';
+import {
+  readAnchoredFile, safeRelativeComponents, type AnchoredFile, type SafeFileHooks,
+} from './safe-files.ts';
 import { validatePng, type ValidatedPng } from './png-validator.ts';
 
 export const ART_FILE_LIMIT = 64 * 1024 * 1024;
 export const ART_BUNDLE_LIMIT = 256 * 1024 * 1024;
 const JSON_LIMIT = 1024 * 1024;
-const TRANSPARENT_ASSETS = new Set(['barrel', 'table', 'pillar', 'torch', 'adventurer', 'goblin']);
-const OPAQUE_ALLOWED_ASSETS = new Set(['tile', 'wall', 'door']);
+const TRANSPARENT_ASSETS = new Set([
+  'prop.barrel', 'prop.table', 'prop.pillar', 'prop.torch', 'token.adventurer', 'token.goblin',
+]);
+const OPAQUE_ALLOWED_ASSETS = new Set(['tile.stone.floor', 'wall.stone', 'door.wood']);
 const FACINGS = [0, 90, 180, 270] as const;
+const ALLOWED_FACINGS: ReadonlySet<number> = new Set(FACINGS);
 
 export interface ValidatedArtFile {
   readonly declaredPath: string;
@@ -36,6 +41,7 @@
 export interface ArtValidationHooks {
   readonly afterManifestRead?: () => void;
   readonly beforeFileRead?: (declaredPath: string) => void;
+  readonly safeFileHooks?: SafeFileHooks;
 }
 
 function configuredRoot(value = process.env.VTT_HANDOFF_ROOT): string {
@@ -84,15 +90,15 @@
     if (asset.pixelsPerCell !== request.pixelsPerCell || asset.footprint.w !== request.footprint.w || asset.footprint.h !== request.footprint.h) {
       throw new Error('ART_ASSET_SCALE_MISMATCH');
     }
-    const frameIndexes = asset.frames.map((frame) => frame.frameIndex);
-    if (new Set(frameIndexes).size !== frameIndexes.length) throw new Error('ART_DUPLICATE_FRAME_INDEX');
     const imagePaths = asset.frames.flatMap((frame) => [frame.albedo, frame.normal, frame.emissive])
       .filter((path): path is string => path !== undefined);
     if (new Set(imagePaths).size !== imagePaths.length) throw new Error('ART_DUPLICATE_IMAGE_PATH');
     for (const view of request.views) {
       const frames = asset.frames.filter((frame) => viewFor(request, result, frame) === view);
-      const facings = frames.map((frame) => frame.facing).sort((left, right) => left - right);
-      if (JSON.stringify(facings) !== JSON.stringify(FACINGS)) throw new Error(`ART_FACING_SET_MISMATCH: ${view}`);
+      const facings = new Set(frames.map((frame) => frame.facing));
+      if (FACINGS.some((facing) => !facings.has(facing)) || [...facings].some((facing) => !ALLOWED_FACINGS.has(facing))) {
+        throw new Error(`ART_FACING_SET_MISMATCH: ${view}`);
+      }
     }
   }
 }
@@ -104,36 +110,38 @@
 }): ValidatedArtResult {
   const root = configuredRoot(options.handoffRoot);
   safeRelativeComponents(options.resultRelativePath);
-  const resultFile = readAnchoredFile(root, options.resultRelativePath, JSON_LIMIT);
+  const location = options.resultRelativePath.match(/^art\/inbox\/([0-9a-f-]+)\.result\.json$/u);
+  if (location?.[1] === undefined) throw new Error('ART_RESULT_LOCATION_INVALID');
+  const resultFile = readAnchoredFile(root, options.resultRelativePath, JSON_LIMIT, options.hooks?.safeFileHooks);
   const result = artResultSchema.parse(parseJson(resultFile.bytes, options.resultRelativePath));
   const resultName = options.resultRelativePath.split('/').at(-1);
   if (resultName !== `${result.requestId}.result.json`) throw new Error('ART_RESULT_FILENAME_MISMATCH');
+  if (location[1] !== result.requestId) throw new Error('ART_RESULT_DIRECTORY_ID_MISMATCH');
   const requestRelativePath = `art/outbox/${result.requestId}.request.json`;
-  const requestFile = readAnchoredFile(root, requestRelativePath, JSON_LIMIT);
+  const requestFile = readAnchoredFile(root, requestRelativePath, JSON_LIMIT, options.hooks?.safeFileHooks);
   const request = artRequestSchema.parse(parseJson(requestFile.bytes, requestRelativePath));
   requireResultSemantics(request, result);
   options.hooks?.afterManifestRead?.();
 
-  const bundleRelativeDirectory = dirname(options.resultRelativePath).replaceAll('\\', '/');
+  // Owner-agreed S9 layout: manifest at art/inbox/<uuid>.result.json and payloads below art/inbox/<uuid>/.
+  const bundleRelativeDirectory = `art/inbox/${result.requestId}`;
   const records = new Map<string, ValidatedArtFile>();
   let totalBytes = 0;
   for (const provenance of result.provenance.files) {
     options.hooks?.beforeFileRead?.(provenance.path);
     const rootRelativePath = resolveInsideBundle(bundleRelativeDirectory, provenance.path);
-    const file = readAnchoredFile(root, rootRelativePath, ART_FILE_LIMIT);
+    const file = readAnchoredFile(root, rootRelativePath, ART_FILE_LIMIT, options.hooks?.safeFileHooks);
     totalBytes += file.identity.size;
     if (!Number.isSafeInteger(totalBytes) || totalBytes > ART_BUNDLE_LIMIT) throw new Error('ART_BUNDLE_SIZE_LIMIT');
     if (file.identity.sha256 !== provenance.sha256) throw new Error(`ART_PROVENANCE_HASH_MISMATCH: ${provenance.path}`);
     records.set(provenance.path, { declaredPath: provenance.path, rootRelativePath, file, png: null });
   }
-  const dimensions = new Map<string, ValidatedPng>();
   for (const asset of result.assets) {
     for (const frame of asset.frames) {
       const albedoRecord = records.get(frame.albedo);
       if (albedoRecord === undefined) throw new Error(`ART_IMAGE_UNRECORDED: ${frame.albedo}`);
       const albedo = validatePng(albedoRecord.file.bytes);
       records.set(frame.albedo, { ...albedoRecord, png: albedo });
-      dimensions.set(frame.albedo, albedo);
       if (albedo.width !== frame.width || albedo.height !== frame.height) throw new Error('ART_FRAME_DIMENSION_MISMATCH');
       if (frame.pivotPx[0] !== frame.width / 2 || frame.pivotPx[1] !== frame.height) throw new Error('ART_GROUND_CENTRE_PIVOT_REQUIRED');
       if (TRANSPARENT_ASSETS.has(asset.assetId) && !albedo.hasTransparency) throw new Error(`ART_TRANSPARENCY_REQUIRED: ${asset.assetId}`);
@@ -157,31 +165,78 @@
   const inbox = join(root, 'art', 'inbox');
   if (!existsSync(inbox)) return [];
   const found: string[] = [];
-  function visit(directory: string): void {
-    for (const entry of readdirSync(directory, { withFileTypes: true })) {
-      const absolute = join(directory, entry.name);
-      if (entry.isSymbolicLink()) {
-        if (entry.name.endsWith('.result.json')) throw new Error(`ART_RESULT_SYMLINK_REFUSED: ${entry.name}`);
-        continue;
-      }
-      if (entry.isDirectory()) visit(absolute);
-      else if (entry.isFile() && entry.name.endsWith('.result.json') && !entry.name.includes('.partial')) {
-        if (!lstatSync(absolute).isFile()) throw new Error(`ART_RESULT_REGULAR_FILE_REQUIRED: ${entry.name}`);
-        found.push(relative(root, absolute).split('\\').join('/'));
-      }
+  for (const entry of readdirSync(inbox, { withFileTypes: true })) {
+    const absolute = join(inbox, entry.name);
+    if (entry.isSymbolicLink() && entry.name.endsWith('.result.json')) {
+      throw new Error(`ART_RESULT_SYMLINK_REFUSED: ${entry.name}`);
+    }
+    if (entry.isFile() && entry.name.endsWith('.result.json') && !entry.name.includes('.partial')) {
+      if (!lstatSync(absolute).isFile()) throw new Error(`ART_RESULT_REGULAR_FILE_REQUIRED: ${entry.name}`);
+      found.push(relative(root, absolute).split('\\').join('/'));
     }
   }
-  visit(inbox);
   return found.sort();
 }
 
+export interface ArtResultListing {
+  readonly resultPath: string;
+  readonly requestId: string | null;
+  readonly assetId: string | null;
+  readonly status: 'complete' | 'partial' | 'blocked' | 'invalid';
+  readonly validation: 'VALID' | 'INVALID';
+  readonly completedAsset: boolean;
+  readonly reason: string | null;
+}
+
+export function listArtResults(options: { readonly handoffRoot?: string } = {}): readonly ArtResultListing[] {
+  const root = configuredRoot(options.handoffRoot);
+  return completedResultPaths(root).map((resultPath): ArtResultListing => {
+    let requestId: string | null = null;
+    let assetId: string | null = null;
+    let status: ArtResultListing['status'] = 'invalid';
+    try {
+      const resultFile = readAnchoredFile(root, resultPath, JSON_LIMIT);
+      const result = artResultSchema.parse(parseJson(resultFile.bytes, resultPath));
+      requestId = result.requestId;
+      status = result.status;
+      if (resultPath !== `art/inbox/${result.requestId}.result.json`) throw new Error('ART_RESULT_FILENAME_MISMATCH');
+      const requestPath = `art/outbox/${result.requestId}.request.json`;
+      const request = artRequestSchema.parse(parseJson(readAnchoredFile(root, requestPath, JSON_LIMIT).bytes, requestPath));
+      assetId = request.assetId;
+      if (request.requestId !== result.requestId) throw new Error('ART_REQUEST_ID_MISMATCH');
+      if (result.status === 'complete') validateArtResult({ handoffRoot: root, resultRelativePath: resultPath });
+      else {
+        const issues = artSemanticIssues(request, result);
+        if (issues.length > 0) throw new Error(`ART_SEMANTIC_${issues[0]?.code ?? 'INVALID'}`);
+      }
+      return {
+        resultPath, requestId, assetId, status,
+        validation: 'VALID', completedAsset: result.status === 'complete', reason: null,
+      };
+    } catch (error) {
+      return {
+        resultPath, requestId, assetId, status, validation: 'INVALID',
+        completedAsset: false, reason: error instanceof Error ? error.message : 'ART_RESULT_INVALID',
+      };
+    }
+  });
+}
+
 export function validateCompletedArtResults(options: { readonly handoffRoot?: string } = {}): readonly ValidatedArtResult[] {
   const root = configuredRoot(options.handoffRoot);
-  return completedResultPaths(root).map((resultRelativePath) => validateArtResult({ handoffRoot: root, resultRelativePath }));
+  const listings = listArtResults({ handoffRoot: root });
+  const invalid = listings.find((entry) => entry.validation === 'INVALID');
+  if (invalid !== undefined) throw new Error(`ART_RESULT_LIST_INVALID: ${invalid.resultPath}: ${invalid.reason ?? ''}`);
+  return listings.filter((entry) => entry.status === 'complete').map((entry) =>
+    validateArtResult({ handoffRoot: root, resultRelativePath: entry.resultPath }));
 }
 
 if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
   (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
-  const results = validateCompletedArtResults();
-  process.stdout.write(`${JSON.stringify({ status: 'validated', completedResults: results.length }, null, 2)}\n`);
+  if (process.argv.includes('--list')) {
+    process.stdout.write(`${JSON.stringify({ results: listArtResults() }, null, 2)}\n`);
+  } else {
+    const results = validateCompletedArtResults();
+    process.stdout.write(`${JSON.stringify({ status: 'validated', completedResults: results.length }, null, 2)}\n`);
+  }
 }
diff --git a/tools/vtt-handoff/png-validator.ts b/tools/vtt-handoff/png-validator.ts
index 0438bc2afb09f25ac3294b076780d47dc9272bc5..0ae5827dad28305175dcf75756301dc7bbfcf736
--- a/tools/vtt-handoff/png-validator.ts
+++ b/tools/vtt-handoff/png-validator.ts
@@ -17,6 +17,10 @@
   readonly compressedBytes: number;
 }
 
+export interface PngValidationOptions {
+  readonly maximumInflateOutputBytes?: number;
+}
+
 function invalid(code: string): never {
   throw new Error(`PNG_${code}`);
 }
@@ -37,7 +41,7 @@
     : aboveDistance <= upperLeftDistance ? above : upperLeft;
 }
 
-export function validatePng(bytes: Uint8Array): ValidatedPng {
+export function validatePng(bytes: Uint8Array, options: PngValidationOptions = {}): ValidatedPng {
   const png = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
   if (png.length < SIGNATURE.length || !png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) invalid('SIGNATURE');
   let offset = SIGNATURE.length;
@@ -60,8 +64,10 @@
     const crcEnd = dataEnd + 4;
     if (!Number.isSafeInteger(crcEnd) || dataEnd < dataStart || crcEnd > png.length) invalid('CHUNK_LENGTH');
     const typeBytes = png.subarray(offset + 4, offset + 8);
+    if (![...typeBytes].every((value) =>
+      (value >= 65 && value <= 90) || (value >= 97 && value <= 122)) ||
+      ((typeBytes[2] ?? 0) & 0x20) !== 0) invalid('CHUNK_TYPE');
     const type = typeBytes.toString('ascii');
-    if (!/^[A-Za-z]{4}$/u.test(type)) invalid('CHUNK_TYPE');
     const expectedCrc = png.readUInt32BE(dataEnd);
     const actualCrc = crc32(png.subarray(offset + 4, dataEnd)) >>> 0;
     if (expectedCrc !== actualCrc) invalid('CRC');
@@ -107,8 +113,11 @@
   let inflated: Buffer;
   let consumed: number;
   try {
+    const maximumInflateOutputBytes = options.maximumInflateOutputBytes ?? PNG_LIMITS.maximumDecodedBytes;
+    if (!Number.isSafeInteger(maximumInflateOutputBytes) || maximumInflateOutputBytes < 1 ||
+      maximumInflateOutputBytes > PNG_LIMITS.maximumDecodedBytes) invalid('INFLATE_BOUND');
     const result: unknown = inflateSync(Buffer.concat(compressedParts), {
-      maxOutputLength: PNG_LIMITS.maximumDecodedBytes,
+      maxOutputLength: maximumInflateOutputBytes,
       info: true,
     });
     if (typeof result !== 'object' || result === null) invalid('INFLATE');
diff --git a/tools/vtt-handoff/safe-files.ts b/tools/vtt-handoff/safe-files.ts
index f852cc8a8ce9d2c092ae84a5c3b6f4d873cb2b76..aae569bafe041903ef7951692f7a905e89afbef2
--- a/tools/vtt-handoff/safe-files.ts
+++ b/tools/vtt-handoff/safe-files.ts
@@ -1,7 +1,7 @@
 import { createHash } from 'node:crypto';
 import {
   closeSync, constants, fstatSync, fsyncSync, mkdirSync, openSync, readSync, realpathSync,
-  renameSync, unlinkSync, writeSync,
+  linkSync, unlinkSync, writeSync,
 } from 'node:fs';
 import { join, resolve, sep } from 'node:path';
 
@@ -18,6 +18,12 @@
   readonly canonicalPath: string;
 }
 
+export interface SafeFileHooks {
+  readonly beforeChildOpen?: (parentRelativePath: string, component: string) => void;
+  readonly afterDirectoryOpen?: (relativePath: string) => void;
+  readonly onFileRead?: (canonicalPath: string) => void;
+}
+
 /*
  * Node has no openat binding. Linux staging therefore depends on /proc/self/fd:
  * every child is opened beneath a retained parent descriptor, then fstat and
@@ -73,7 +79,7 @@
   for (const handle of [...parent.handles].reverse()) closeSync(handle);
 }
 
-function openParent(root: string, components: readonly string[]): OpenParent {
+function openParent(root: string, components: readonly string[], hooks?: SafeFileHooks): OpenParent {
   assertProcFdAvailable();
   const absoluteRoot = resolve(root);
   const rootHandle = openSync(absoluteRoot, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
@@ -85,8 +91,11 @@
     fail('ANCHORED_ROOT_MISMATCH', root);
   }
   let expectedParent = canonicalRoot;
+  let relativePath = '';
+  hooks?.afterDirectoryOpen?.(relativePath);
   try {
     for (const component of components) {
+      hooks?.beforeChildOpen?.(relativePath, component);
       const child = openSync(procChild(handle, component), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
       const stat = fstatSync(child, { bigint: true });
       const expected = join(expectedParent, component);
@@ -97,6 +106,8 @@
       handle = child;
       handles.push(child);
       expectedParent = expected;
+      relativePath = relativePath.length === 0 ? component : `${relativePath}/${component}`;
+      hooks?.afterDirectoryOpen?.(relativePath);
     }
     return { handle, handles, canonicalRoot, expectedParent };
   } catch (error) {
@@ -118,15 +129,24 @@
   return bytes;
 }
 
-export function readAnchoredFile(root: string, relativePath: string, maximumBytes: number): AnchoredFile {
+export function readAnchoredFile(
+  root: string,
+  relativePath: string,
+  maximumBytes: number,
+  hooks?: SafeFileHooks,
+): AnchoredFile {
   if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) fail('INVALID_FILE_BOUND', String(maximumBytes));
   const components = safeRelativeComponents(relativePath);
   const filename = components.at(-1);
   if (filename === undefined) fail('UNSAFE_RELATIVE_PATH', relativePath);
-  const parent = openParent(root, components.slice(0, -1));
+  const parent = openParent(root, components.slice(0, -1), hooks);
   let handle: number | null = null;
   try {
-    handle = openSync(procChild(parent.handle, filename), constants.O_RDONLY | constants.O_NOFOLLOW);
+    hooks?.beforeChildOpen?.(components.slice(0, -1).join('/'), filename);
+    handle = openSync(
+      procChild(parent.handle, filename),
+      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
+    );
     const before = fstatSync(handle, { bigint: true });
     if (!before.isFile()) fail('REGULAR_FILE_REQUIRED', relativePath);
     if (before.size > BigInt(maximumBytes) || before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
@@ -137,6 +157,7 @@
     if (canonicalPath !== expected || !canonicalPath.startsWith(`${parent.canonicalRoot}${sep}`)) {
       fail('ANCHORED_FILE_MISMATCH', relativePath);
     }
+    hooks?.onFileRead?.(canonicalPath);
     const bytes = readBounded(handle, Number(before.size));
     const after = fstatSync(handle, { bigint: true });
     if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs) {
@@ -251,7 +272,12 @@
   }
 }
 
-export function promoteAnchoredPartial(root: string, partialPath: string, destinationPath: string): void {
+export function promoteAnchoredPartial(
+  root: string,
+  partialPath: string,
+  destinationPath: string,
+  beforePromotion?: (destinationPath: string) => void,
+): void {
   const partialComponents = safeRelativeComponents(partialPath);
   const destinationComponents = safeRelativeComponents(destinationPath);
   const partialName = partialComponents.at(-1);
@@ -261,19 +287,13 @@
     fail('ANCHORED_RENAME_PARENT_MISMATCH', destinationPath);
   }
   const parent = openParent(root, partialComponents.slice(0, -1));
-  let reserved = false;
   try {
-    const reservation = openSync(
-      procChild(parent.handle, destinationName),
-      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
-      0o600,
-    );
-    closeSync(reservation);
-    reserved = true;
-    renameSync(procChild(parent.handle, partialName), procChild(parent.handle, destinationName));
-    reserved = false;
+    beforePromotion?.(destinationPath);
+    linkSync(procChild(parent.handle, partialName), procChild(parent.handle, destinationName));
+    fsyncSync(parent.handle);
+    unlinkSync(procChild(parent.handle, partialName));
+    fsyncSync(parent.handle);
   } catch (error) {
-    if (reserved) unlinkSync(procChild(parent.handle, destinationName));
     if ((error as NodeJS.ErrnoException).code === 'EEXIST') fail('DESTINATION_COLLISION', destinationPath);
     throw error;
   } finally {
@@ -289,6 +309,6 @@
   try {
     unlinkSync(procChild(parent.handle, filename));
   } finally {
-    closeSync(parent.handle);
+    closeParent(parent);
   }
 }
diff --git a/tools/vtt-handoff/windows-probe.ts b/tools/vtt-handoff/windows-probe.ts
index ead41d188d92cf9e8d4e7c0e7563d041398fd849..4cc5bd8e95e76720f9ecb69e014801495f068032
--- a/tools/vtt-handoff/windows-probe.ts
+++ b/tools/vtt-handoff/windows-probe.ts
@@ -1,5 +1,5 @@
 import { createHash, randomBytes as systemRandomBytes } from 'node:crypto';
-import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
+import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
 import { isAbsolute, join, resolve } from 'node:path';
 import { spawnSync } from 'node:child_process';
 import { fileURLToPath } from 'node:url';
@@ -47,6 +47,33 @@
   return resolve(value);
 }
 
+interface OwnedProbeFile {
+  readonly path: string;
+  readonly device: bigint;
+  readonly inode: bigint;
+  readonly sha256: string;
+}
+
+function ownedProbe(path: string, expected: Buffer): OwnedProbeFile | null {
+  if (!existsSync(path)) return null;
+  const stat = lstatSync(path, { bigint: true });
+  if (!stat.isFile() || sha256(readFileSync(path)) !== sha256(expected)) return null;
+  return { path, device: stat.dev, inode: stat.ino, sha256: sha256(expected) };
+}
+
+function removeOwnedProbe(owned: OwnedProbeFile | null): boolean {
+  if (owned === null) return true;
+  try {
+    const stat = lstatSync(owned.path, { bigint: true });
+    if (!stat.isFile() || stat.dev !== owned.device || stat.ino !== owned.inode ||
+      sha256(readFileSync(owned.path)) !== owned.sha256) return false;
+    unlinkSync(owned.path);
+    return true;
+  } catch {
+    return false;
+  }
+}
+
 export function windowsInteropProbe(options: {
   readonly handoffRoot?: string;
   readonly environment?: NodeJS.ProcessEnv;
@@ -87,12 +114,15 @@
   }
   let status: WindowsProbeStatus = 'FAILED';
   let reason: string | null = 'WINDOWS_PROBE_FAILED';
+  let windowsOwned: OwnedProbeFile | null = null;
+  let linuxOwned: OwnedProbeFile | null = null;
   try {
     const writeResult = runner.run('powershell.exe', [
       '-NoProfile', '-NonInteractive', '-Command',
       '& { param($p,$b) $bytes=[Convert]::FromBase64String($b); $s=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None); try {$s.Write($bytes,0,$bytes.Length); $s.Flush($true)} finally {$s.Dispose()} }',
       windowsFile, fromWindows.toString('base64'),
     ]);
+    if (writeResult.status === 0) windowsOwned = ownedProbe(windowsLinuxFile, fromWindows);
     const windowsToLinux = writeResult.status === 0 && existsSync(windowsLinuxFile) && sha256(readFileSync(windowsLinuxFile)) === sha256(fromWindows);
     checks.push({ name: 'windows-to-linux', passed: windowsToLinux, detail: windowsToLinux ? sha256(fromWindows) : writeResult.stderr.trim() || 'hash mismatch' });
     if (!windowsToLinux) {
@@ -100,6 +130,7 @@
     } else {
 
       writeFileSync(linuxFile, fromLinux, { flag: 'wx', mode: 0o600 });
+      linuxOwned = ownedProbe(linuxFile, fromLinux);
       const readResult = runner.run('powershell.exe', [
         '-NoProfile', '-NonInteractive', '-Command',
         '& { param($p) $s=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read); try {$h=[Security.Cryptography.SHA256]::Create(); try {([BitConverter]::ToString($h.ComputeHash($s))).Replace(\'-\',\'\').ToLowerInvariant()} finally {$h.Dispose()}} finally {$s.Dispose()} }',
@@ -114,14 +145,9 @@
     status = 'FAILED';
     reason = error instanceof Error ? error.message : 'WINDOWS_PROBE_FAILED';
   }
-  let cleanupPassed = true;
-  for (const path of [windowsLinuxFile, linuxFile]) {
-    try {
-      if (existsSync(path)) unlinkSync(path);
-    } catch {
-      cleanupPassed = false;
-    }
-  }
+  const windowsCleanupPassed = removeOwnedProbe(windowsOwned);
+  const linuxCleanupPassed = removeOwnedProbe(linuxOwned);
+  const cleanupPassed = windowsCleanupPassed && linuxCleanupPassed;
   checks.push({ name: 'cleanup', passed: cleanupPassed, detail: cleanupPassed ? 'named probes removed' : 'named probe cleanup failed' });
   if (!cleanupPassed) return { status: 'FAILED', linuxPath, windowsPath, checks, reason: 'PROBE_CLEANUP_FAILED' };
   return { status, linuxPath, windowsPath, checks, reason };
