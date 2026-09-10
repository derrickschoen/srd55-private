Implemented the S6 production Worker fix at HEAD `db3f6368cee3b622e0bc211d077a749622ed7149`.

### Changes

- [worker-transport.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/worker-transport.ts): inlined `new URL('./worker-entry.ts', import.meta.url)` as the first `Worker` argument, preserving module type and Worker name.
- [vite.config.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/vite.config.ts): extracted strict Worker asset selection. Exactly one `worker-entry-*.js` is required; `.ts`, missing, or ambiguous candidates fail.
- [worker-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/worker-boundary.test.ts): added inline-construction and `.js` asset-selection regression, including `.ts`-only and ambiguous controls.
- [worker.spec.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/browser/vtt-handoff/worker.spec.ts): dist mode now independently requires `.js`, rejects `.ts`/dev markers, fetches the Worker resource, computes its SHA-256, and compares it with the stamp.

No accepted S4/S5 runtime or service files changed. No tests or assertions were removed or weakened.

### Production proof

`npm run build` exited 0:

- 712 modules transformed.
- `dist/assets/worker-entry-C5yOFL5D.js` emitted.
- No `worker-entry-*.ts` emitted.
- 123 dist files scanned.
- 120 PWA shell files transcribed.

Stamp verification:

```text
artifact=dist
commit=db3f6368cee3b622e0bc211d077a749622ed7149
worker=/assets/worker-entry-C5yOFL5D.js
sha256=489346ee2d25fac3a80d5feda5eb87818d2a650fb384ee500528fa79188d850b
actualSha256=489346ee2d25fac3a80d5feda5eb87818d2a650fb384ee500528fa79188d850b
match=true
```

Dist Playwright command:

```sh
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts
```

Result: 1/1 passed in 3.5s.

```text
artifact=dist commit=db3f6368cee3b622e0bc211d077a749622ed7149 worker=http://127.0.0.1:4410/assets/worker-entry-C5yOFL5D.js sha256=489346ee2d25fac3a80d5feda5eb87818d2a650fb384ee500528fa79188d850b
```

Negative controls:

- Tampered stamp hash: underlying Playwright command exited 1; server refused with `Worker hash disagrees with its stamp`.
- Correctly hashed `.ts` stamp target: underlying Playwright command exited 1 specifically at `expect(artifact.worker?.url).toMatch(/\.js$/u)`.
- Byte-identical restoration: dist Playwright returned green, 1/1.

Logs:

- `.tmp/vtt-handoff-s6-r2-dist-hash-mutant-red.log`
- `.tmp/vtt-handoff-s6-r2-dist-ts-mutant-red.log`
- `.tmp/vtt-handoff-s6-r2-playwright-dist-green.log`

### Complete verification

All final commands exited 0:

- `npm run typecheck:fast`
- `sg scan`
- `git diff --check`
- `npm run test:engine` — 4 files, 41/41.
- `npm run test:protocol` — 4 files, 63/63.
- Worker/boundary targeted Vitest — 2 files, 10/10.
- Existing-dist server unit — 1 file, 4/4.
- 22-spec cumulative — 22 files, 257/257.
- Development Playwright — 1/1 in 7.4s.

Development artifact:

```text
artifact=dev page=http://127.0.0.1:4410/vtt-handoff worker=http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts?worker_file&type=module,http://127.0.0.1:4410/src/vtt/handoff/worker-entry.ts?worker_file&type=module
```

The 22-file cumulative run included:

```text
handoff-package-contract
handoff-bootstrap
handoff-contract
scene-snapshot
visibility
encounter-projections
two-room-fixture
handoff-publish
session-persistence
local-session-store
session-lifecycle
save-manager
encounter-session-service
engine-boundary
door-intent
dm-encounter-host-live-path
encounter-selectors
protocol-runtime
in-process-transport
handoff-examples
worker-boundary
serve-existing-dist
```

Protected hashes remain unchanged:

- Frozen contract: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Plan: `25816309e2a5e837611b312c069670ba904886c5111930de1deab441e5383a3d`
- Examples: `9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d`

HANDOFF S6 R2 DONE
diff --git a/src/vtt/handoff/worker-transport.ts b/src/vtt/handoff/worker-transport.ts
index ede1febdc713811f8304d52f2805131b04ac66ef..3f664e3bb16ff31022d97b109fc8198b95be6041
--- a/src/vtt/handoff/worker-transport.ts
+++ b/src/vtt/handoff/worker-transport.ts
@@ -164,8 +164,10 @@
 }
 
 export function createHandoffWorkerTransport(): WorkerSceneTransport {
-  const workerUrl = new URL('./worker-entry.ts', import.meta.url);
-  const worker = new Worker(workerUrl, { type: 'module', name: 'vtt-handoff-worker' });
+  const worker = new Worker(
+    new URL('./worker-entry.ts', import.meta.url),
+    { type: 'module', name: 'vtt-handoff-worker' },
+  );
   const channel = new MessageChannel();
   const connect: WorkerConnectMessage = { kind: 'vtt-handoff.connect', port: channel.port2 };
   worker.postMessage(connect, [channel.port2]);
diff --git a/tests/browser/vtt-handoff/worker.spec.ts b/tests/browser/vtt-handoff/worker.spec.ts
index 547f4ffe590cd9d4f4c84fdba3756523dc102c45..565f50db346843b3a9c9611068b6a7a4ed2064cb
--- a/tests/browser/vtt-handoff/worker.spec.ts
+++ b/tests/browser/vtt-handoff/worker.spec.ts
@@ -1,4 +1,5 @@
 import { expect, test } from '@playwright/test';
+import { createHash } from 'node:crypto';
 import type {} from '../../../src/vtt/handoff/worker-harness';
 
 test('drives the v1 handoff across an actual module Worker', async ({ page }, testInfo) => {
@@ -117,9 +118,24 @@
     expect(artifact.artifact).not.toBe('dev');
     expect(artifact.commit).toMatch(/^[0-9a-f]{40}$/u);
     expect(artifact.worker?.sha256).toMatch(/^[0-9a-f]{64}$/u);
-    expect(new URL(workerUrls[0]!).pathname).toBe(artifact.worker?.url);
+    const workerPath = new URL(workerUrls[0]!).pathname;
+    expect(workerPath).toMatch(/\.js$/u);
+    expect(workerPath).not.toMatch(/\.ts$/u);
+    expect(artifact.worker?.url).toMatch(/\.js$/u);
+    expect(workerPath).toBe(artifact.worker?.url);
+    const workerResponse = await page.context().request.get(workerUrls[0]!);
+    expect(workerResponse.ok()).toBe(true);
+    expect(createHash('sha256').update(await workerResponse.body()).digest('hex'))
+      .toBe(artifact.worker?.sha256);
   }
   const record = JSON.stringify({ artifact, pageUrl: page.url(), workerUrls });
   await testInfo.attach('vtt-handoff-artifact', { body: record, contentType: 'application/json' });
-  console.log(`artifact=${expectedArtifact} page=${page.url()} worker=${workerUrls.join(',')}`);
+  if (artifact.artifact === 'dist') {
+    console.log(
+      `artifact=dist commit=${artifact.commit ?? '<missing>'} worker=${workerUrls[0] ?? '<missing>'} ` +
+      `sha256=${artifact.worker?.sha256 ?? '<missing>'}`,
+    );
+  } else {
+    console.log(`artifact=dev page=${page.url()} worker=${workerUrls.join(',')}`);
+  }
 });
diff --git a/tests/unit/vtt/worker-boundary.test.ts b/tests/unit/vtt/worker-boundary.test.ts
index 5c0cab647081f3acec3606c4dd6ddc6969e5c51d..51019e99951de771d48bf3e0a53ce69e8b29b341
--- a/tests/unit/vtt/worker-boundary.test.ts
+++ b/tests/unit/vtt/worker-boundary.test.ts
@@ -3,8 +3,24 @@
 import { WorkerSceneTransport } from '../../../src/vtt/handoff/worker-transport';
 import { SceneTransportClosedError, SceneTransportFaultError } from '../../../src/vtt/handoff/scene-transport';
 import { readFileSync } from '../../helpers/test-filesystem';
+import { selectVttHandoffWorkerAsset } from '../../../vite.config';
 
 describe('VTT handoff Worker message boundary', () => {
+  it('pins Vite inline Worker discovery and selects only one emitted JavaScript Worker', () => {
+    const source = readFileSync('src/vtt/handoff/worker-transport.ts', 'utf8');
+    expect(source).toMatch(
+      /new Worker\(\s*new URL\('\.\/worker-entry\.ts', import\.meta\.url\),\s*\{ type: 'module', name: 'vtt-handoff-worker' \},\s*\)/u,
+    );
+    expect(source).not.toContain('const workerUrl = new URL');
+    const javascript = { fileName: 'assets/worker-entry-AbCd1234.js', source: 'compiled worker' };
+    const typescript = { fileName: 'assets/worker-entry-AbCd1234.ts', source: 'raw worker' };
+    expect(selectVttHandoffWorkerAsset([typescript, javascript])).toBe(javascript);
+    expect(() => selectVttHandoffWorkerAsset([typescript])).toThrow('Worker asset is unavailable');
+    expect(() => selectVttHandoffWorkerAsset([javascript, {
+      fileName: 'assets/worker-entry-EfGh5678.js', source: 'second compiled worker',
+    }])).toThrow('Worker asset is ambiguous');
+  });
+
   it('crosses one structured-clone boundary per port post without internal re-serialization', async () => {
     const channel = new MessageChannel();
     const clientPosts = vi.spyOn(channel.port1, 'postMessage');
diff --git a/vite.config.ts b/vite.config.ts
index d100e3d643c999c0dc506c8975cb10461f20c54c..46b6ff6541f7a7d6215ff83f84d547e568382b3f
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -88,6 +88,18 @@
   };
 }
 
+export function selectVttHandoffWorkerAsset(assets: readonly BuildAsset[]): BuildAsset {
+  const workers = assets.filter((asset) => /(?:^|\/)worker-entry-[^/]+\.js$/u.test(asset.fileName));
+  if (workers.length !== 1) {
+    throw new Error(
+      workers.length === 0
+        ? 'The built VTT handoff Worker asset is unavailable.'
+        : 'The built VTT handoff Worker asset is ambiguous.',
+    );
+  }
+  return workers[0]!;
+}
+
 function vttHandoffArtifactStamp(): Plugin {
   let outputDirectory: string | undefined;
   return {
@@ -98,9 +110,7 @@
     },
     writeBundle() {
       if (outputDirectory === undefined) throw new Error('VTT handoff output directory is unavailable.');
-      const worker = deployableAssets(outputDirectory).find((asset) =>
-        /(?:^|\/)worker-entry-[^/]+\.js$/u.test(asset.fileName));
-      if (worker === undefined) throw new Error('The built VTT handoff Worker asset is unavailable.');
+      const worker = selectVttHandoffWorkerAsset(deployableAssets(outputDirectory));
       const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
         cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
       }).trim();
