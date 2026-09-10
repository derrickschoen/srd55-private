Implemented only F80 and F81. The uncommitted diff is limited to 2 files: 52 insertions, 5 deletions.

### Fixes

- F80: staged payloads must now match:
  - Review-manifest SHA-256 and size.
  - Copied-result provenance SHA-256 for the same anchored relative path.
- A coherent forgery—changed staged bytes plus updated manifest hash, size, and total—now fails with `REVIEW_PROVENANCE_IDENTITY_MISMATCH`.
- The regression confirms the copied result and original inbox payload remain unchanged.
- Existing manifest-only tamper coverage remains intact.
- F81: FIFO staging now runs in a child process with a 2,000 ms hard kill deadline.
- The test requires exit code `1`, no signal/timeout error, exact `REGULAR_FILE_REQUIRED` diagnostic, and no completion manifest.

The result provenance contract contains no size field, so size is independently checked against the review manifest while SHA-256 is checked against both manifest and result provenance.

### Mutation proof

Command:

```text
npx vitest run --configLoader runner tests/unit/vtt/art-stage.test.ts -t "rejects an unwritten FIFO in a deadline-enforced child before any read"
```

With `O_NONBLOCK` removed:

- Test failed as intended.
- Child status was `null` instead of `1`.
- Child hit the 2,000 ms deadline; test body finished in 2,023 ms.
- Entire command completed in 4.89 seconds rather than hanging.
- Result: 1 failed, 10 filtered.

After restoration:

- Result: 1 passed, 10 filtered.
- Test body: 147 ms.
- `safe-files.ts` pre/post SHA-256: `92ff100b5d6654c251675a504d1036bc8d77c694cb53a1a2298017bffad7fad6`.

### Gates

- UUID/request/contract: 3 files, 15 tests passed.
- PNG/validator/contract: 3 files, 20 tests passed.
- Staging/validator/PNG: 3 files, 26 tests passed.
- Windows probe: 1 file, 7 tests passed.
- Cumulative 20-spec suite: 20 files, 177 tests passed.

Cumulative command:

```text
npx vitest run --configLoader runner tests/unit/vtt/handoff-package-contract.test.ts tests/unit/vtt/handoff-bootstrap.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/handoff-publish.test.ts tests/unit/vtt/handoff-examples.test.ts tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/png-validator.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/art-stage.test.ts tests/unit/vtt/windows-probe.test.ts
```

CLI checks:

- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:request -- --check` — 9 verified requests.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:validate -- --check` — 0 completed results.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:validate -- --list` — empty listing.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff" npm run art:stage -- --check` — 0 completed results and reviews.
- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.

The previous synchronous FIFO `toThrow` plus elapsed-time assertion was replaced by stronger child exit, signal, timeout-error, exact-diagnostic, and completion-absence assertions. No tests, assertions, or timeouts were weakened.

All protected hashes and the binding-plan hash remain unchanged. Protected-path diff is empty. No git writes were performed.

HANDOFF S9 R3 DONE
diff --git a/tests/unit/vtt/art-stage.test.ts b/tests/unit/vtt/art-stage.test.ts
index 6fa29a58638e91d2df99435bc6d64ae253c501b5..d9a1dd6067cc69ab7e087d3a40174d0eb8215a71
--- a/tests/unit/vtt/art-stage.test.ts
+++ b/tests/unit/vtt/art-stage.test.ts
@@ -74,6 +74,18 @@
   return join(root, 'art/review', requestId, 'review-manifest.json');
 }
 
+function runStageChild(root: string, args: readonly string[], timeout: number) {
+  return spawnSync(process.execPath, [
+    '--experimental-strip-types', join(process.cwd(), 'tools/vtt-handoff/art-stage.ts'), ...args,
+  ], {
+    cwd: process.cwd(),
+    encoding: 'utf8',
+    env: { ...process.env, VITEST: undefined, VTT_HANDOFF_ROOT: root },
+    killSignal: 'SIGKILL',
+    timeout,
+  });
+}
+
 describe('descriptor-anchored art staging', () => {
   it('copies through partial files, revalidates, and writes the review manifest strictly last', () => {
     const value = fixture();
@@ -254,15 +266,45 @@
     expect(() => checkArtStage({ handoffRoot: hash.root })).toThrow('REVIEW_FILE_IDENTITY_MISMATCH');
   });
 
-  it('rejects an unwritten FIFO promptly before any read', () => {
+  it('binds staged payload identity to both the review manifest and copied result provenance', () => {
+    const value = fixture();
+    stageArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath, nonce: () => 'fixed' });
+    const inboxResultBefore = readFileSync(value.resultAbsolute);
+    const inboxPayloadBefore = readFileSync(join(value.bundle, value.firstImage));
+    const stagedPath = join(value.root, 'art/review', requestId, 'files', value.firstImage);
+    const changedBytes = Buffer.from('consistently forged staged payload\n');
+    writeFileSync(stagedPath, changedBytes);
+    const manifest = JSON.parse(readFileSync(manifestPath(value.root), 'utf8')) as {
+      files: { path: string; sha256: string; size: number }[];
+      totalBytes: number;
+    };
+    const index = manifest.files.findIndex((entry) => entry.path === value.firstImage);
+    const previous = manifest.files[index];
+    if (index < 0 || previous === undefined) throw new Error('test manifest entry missing');
+    manifest.files[index] = { path: previous.path, sha256: sha256(changedBytes), size: changedBytes.length };
+    manifest.totalBytes += changedBytes.length - previous.size;
+    writeFileSync(manifestPath(value.root), `${JSON.stringify(manifest)}\n`);
+
+    expect(() => checkArtStage({ handoffRoot: value.root })).toThrow('REVIEW_PROVENANCE_IDENTITY_MISMATCH');
+    const child = runStageChild(value.root, ['--check'], 2_000);
+    expect(child.status).toBe(1);
+    expect(child.signal).toBeNull();
+    expect(child.error).toBeUndefined();
+    expect(child.stderr).toContain(`Error: REVIEW_PROVENANCE_IDENTITY_MISMATCH: ${value.firstImage}`);
+    expect(readFileSync(value.resultAbsolute)).toEqual(inboxResultBefore);
+    expect(readFileSync(join(value.bundle, value.firstImage))).toEqual(inboxPayloadBefore);
+  });
+
+  it('rejects an unwritten FIFO in a deadline-enforced child before any read', () => {
     const value = fixture();
     const fifo = join(value.bundle, value.source);
     rmSync(fifo);
     expect(spawnSync('mkfifo', [fifo]).status).toBe(0);
-    const started = performance.now();
-    expect(() => stageArtResult({ handoffRoot: value.root, resultRelativePath: value.resultPath }))
-      .toThrow('REGULAR_FILE_REQUIRED');
-    expect(performance.now() - started).toBeLessThan(1_000);
+    const child = runStageChild(value.root, [value.resultPath], 2_000);
+    expect(child.status).toBe(1);
+    expect(child.signal).toBeNull();
+    expect(child.error).toBeUndefined();
+    expect(child.stderr).toContain(`Error: REGULAR_FILE_REQUIRED: art/inbox/${requestId}/${value.source}`);
     expect(existsSync(manifestPath(value.root))).toBe(false);
   });
 
diff --git a/tools/vtt-handoff/art-stage.ts b/tools/vtt-handoff/art-stage.ts
index 325800b39e893b1ad418611c0e90e346eff49b6a..41423389919d74c40f38adc53f58b3785c17b041
--- a/tools/vtt-handoff/art-stage.ts
+++ b/tools/vtt-handoff/art-stage.ts
@@ -180,6 +180,7 @@
   if (new Set(manifestPaths).size !== manifestPaths.length || JSON.stringify(expectedPaths) !== JSON.stringify(manifestPaths)) {
     throw new Error('REVIEW_FILE_SET_MISMATCH');
   }
+  const provenanceByPath = new Map(result.provenance.files.map((entry) => [entry.path, entry]));
   let totalBytes = 0;
   for (const entry of manifest.files) {
     safeRelativeComponents(entry.path);
@@ -187,6 +188,10 @@
     if (staged.identity.sha256 !== entry.sha256 || staged.identity.size !== entry.size) {
       throw new Error(`REVIEW_FILE_IDENTITY_MISMATCH: ${entry.path}`);
     }
+    const provenance = provenanceByPath.get(entry.path);
+    if (provenance === undefined || staged.identity.sha256 !== provenance.sha256) {
+      throw new Error(`REVIEW_PROVENANCE_IDENTITY_MISMATCH: ${entry.path}`);
+    }
     totalBytes += entry.size;
   }
   if (totalBytes !== manifest.totalBytes) throw new Error('REVIEW_TOTAL_SIZE_MISMATCH');
