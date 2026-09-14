# M-1 implementation lane report (sol 01a09d59-d5ae…, 2026-09-13)

Source: .tmp/runs/fanout/impl-m1.log (verbatim final message)

Implemented GATE-INTEGRITY-01 M-1 on `claude/gate-integrity` at `d251e716`.

Key results:

- Version-2 fail-closed verdict model across process, reporter, discovery, and file domains.
- Linked stock JSON and additive UUID-bearing evidence sidecars.
- Exact-file diagnostic retry without clearing prior non-file failures.
- Vitest options preserved across retry, including short/long/equal/array/boolean/`--` forms.
- Native Vitest and Playwright evidence reporters.
- Stock reporter locations retained unchanged.
- New factual headings replace causal load-flake language.

## Verification

| Check | Exit | Result |
|---|---:|---|
| Root fixture discovery | 0 | `[]` — 0 files |
| Dedicated fixture discovery | 0 | Exactly 2 files |
| Installed `parseCLI` proof | 0 | Exact expected JSON |
| RED wrapper run | 1 | 1 file / 23 failed |
| RED cumulative run | 1 | 3 files / 59 failed |
| `npx tsc -b --force` | 0 | No diagnostics |
| `sg scan` | 0 | Clean |
| Six `node --check` commands | 0 each | Clean |
| GREEN cumulative run | 0 | 3 files / 59 passed |
| `git diff --check` | 0 | Clean |

RED/GREEN totals:

| Stage | Files | Passed | Failed | Total |
|---|---:|---:|---:|---:|
| RED wrapper | 1 | 0 | 23 | 23 |
| RED cumulative | 3 | 0 | 59 | 59 |
| GREEN cumulative | 3 | 59 | 0 | 59 |

No RED tests were unexpectedly green. The 36 new reporter/classifier tests failed individually at their missing production boundaries rather than during collection.

Parser output, exit 0:

```json
{
  "filter": [
    "tests/fixtures/gate-vitest-passes-on-retry.fixture.ts"
  ],
  "config": "tests/fixtures/gate-vitest-proof.config.mts",
  "project": [
    "unit"
  ],
  "fileParallelism": false,
  "maxWorkers": 1,
  "tail": [
    "--node-tail",
    "tail-value"
  ]
}
```

All six syntax checks exited 0:

```text
tools/gate-runner-lib.mjs
tools/gate-verdict.mjs
tools/gate-vitest-evidence-reporter.mjs
tools/gate-playwright-evidence-reporter.mjs
tools/gate-vitest.mjs
tools/gate-playwright.mjs
```

## Bounded Playwright proof

The only Playwright invocation used `PLAYWRIGHT_PORT=4470`, one worker, and the one authorized fixture spec.

- Playwright command exit: `1`, caused by the deliberate individual timeout.
- Assertion wrapper exit: `0`.
- Stock JSON: 1 file / 3 tests, `unexpected:1`, `skipped:2`.
- Evidence JSON: 3 tests; `onBegin`, `onEnd`, and `onExit` all true.
- Recorded states: timed out, synthesized skipped/nonexecution, and intentional expected skip.

```json
{
  "stockFiles": 1,
  "stockTests": 3,
  "stockUnexpected": 1,
  "stockSkipped": 2
}
```

```json
{
  "evidenceTests": 3,
  "onBegin": true,
  "onEnd": true,
  "onExit": true,
  "statuses": [
    {"status":"timedOut","expectedStatus":"passed"},
    {"status":"skipped","expectedStatus":"passed"},
    {"status":"skipped","expectedStatus":"skipped"}
  ]
}
```

## Real gate proofs

Proof 1 — successful evidence followed by exit 2:

```json
{
  "gateExit": 1,
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [
      {
        "phase": "initial",
        "domain": "process",
        "reasons": ["process-exit-2"]
      }
    ]
  },
  "process": {
    "status": "failed",
    "exitCode": 2,
    "signal": null,
    "spawnError": null,
    "reasons": ["process-exit-2"]
  },
  "reporter": "passed",
  "discovery": "complete",
  "stock": "readable",
  "evidence": "readable",
  "fileStatus": "passed",
  "retry": null
}
```

Proof 2 — detectable post-report exit 1:

```json
{
  "gateExit": 1,
  "verdict": {
    "status": "failed",
    "passedOnRetry": [],
    "failedFiles": [],
    "phaseFailures": [
      {
        "phase": "initial",
        "domain": "process",
        "reasons": ["process-exit-1"]
      }
    ]
  },
  "process": {
    "status": "failed",
    "exitCode": 1,
    "signal": null,
    "spawnError": null,
    "reasons": ["process-exit-1"]
  },
  "reporter": "passed",
  "discovery": "complete",
  "fileStatus": "passed",
  "retry": null
}
```

Proof 3 — ordinary failure passes exact retry:

```json
{
  "gateExit": 0,
  "verdict": {
    "status": "passed",
    "passedOnRetry": [
      "tests/fixtures/gate-vitest-passes-on-retry.fixture.ts"
    ],
    "failedFiles": [],
    "phaseFailures": []
  },
  "initial": {
    "processStatus": "ordinary-file-failure",
    "exitCode": 1,
    "discovery": "complete",
    "loadValues": 3
  },
  "retry": {
    "processStatus": "passed",
    "exitCode": 0,
    "discovery": "complete",
    "loadValues": 3,
    "preservedConfig": true
  }
}
```

Each proof assertion wrapper exited 0.

## Greps and consumers

Active rename greps returned status 1 with zero matches:

```text
loadFlakes|LOAD FLAKES: 0
load.?flake|load-tolerant|load tolerant: 0
```

The executable final-report consumer grep found only:

```text
tests/unit/tools/gate-runners.test.ts:61
tests/unit/tools/gate-runners.test.ts:138
tests/unit/tools/gate-runners.test.ts:140
```

Forbidden-token audit returned status 1 with zero matches for `any`, TypeScript suppression directives, `.skip`, and `.todo`.

Read-only supervisor script matches requiring owner updates:

```text
/home/vagrant/dnd-slim-runs/browser-main-queued.sh:6
/home/vagrant/dnd-slim-runs/gate-wt4.sh:8
```

Those files were not modified.

Residual risk wording, including P3-F1: **coverage reporting or cleanup after onTestRunEnd, including cleanup with reportOnFailure:false** can still collide with an already-failed Vitest exit status because no universal error-bearing callback exists after that boundary. The specific `onProcessTimeout` path is independently captured and remains fatal.

## Final worktree

```text
 M tests/fixtures/fake-flock.mjs
 M tests/fixtures/fake-gate-command.mjs
 M tests/unit/tools/gate-runners.test.ts
 M tools/gate-playwright.mjs
 M tools/gate-runner-lib.mjs
 M tools/gate-vitest.mjs
?? tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts
?? tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts
?? tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts
?? tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs
?? tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts
?? tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts
?? tests/fixtures/gate-evidence/vitest-reporter-fail.gate-fixture.ts
?? tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts
?? tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts
?? tests/fixtures/gate-evidence/vitest-reporter.config.mts
?? tests/fixtures/gate-vitest-passes-on-retry.fixture.ts
?? tests/fixtures/gate-vitest-post-report-global-setup.mjs
?? tests/fixtures/gate-vitest-proof.config.mts
?? tests/fixtures/gate-vitest-success.fixture.ts
?? tests/unit/tools/gate-evidence-reporters.test.ts
?? tests/unit/tools/gate-verdict.test.ts
?? tools/gate-playwright-evidence-reporter.mjs
?? tools/gate-verdict.mjs
?? tools/gate-vitest-evidence-reporter.mjs
```

All paths are plan-authorized. No git write command was used.

Frozen contract:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

IMPL M1 DONE
diff --git a/tests/fixtures/fake-flock.mjs b/tests/fixtures/fake-flock.mjs
index 97190820d42d9a45aa6611a878da45d10fafc423..232a0b5b14870b3fb99b714b812a7625c21f5439
--- a/tests/fixtures/fake-flock.mjs
+++ b/tests/fixtures/fake-flock.mjs
@@ -17,4 +17,5 @@
   stdio: 'inherit',
 });
 if (result.error !== undefined) throw result.error;
-process.exitCode = result.status ?? 1;
+if (result.signal !== null) process.kill(process.pid, result.signal);
+else process.exitCode = result.status ?? 1;
diff --git a/tests/fixtures/fake-gate-command.mjs b/tests/fixtures/fake-gate-command.mjs
index a5236d388938b31dfec2d490b5c26fdc43e6d52f..68cf1b50e522bb9f1ea8b88b43e1ec871e55f588
--- a/tests/fixtures/fake-gate-command.mjs
+++ b/tests/fixtures/fake-gate-command.mjs
@@ -4,61 +4,164 @@
 const phase = process.env.DND_GATE_PHASE;
 const kind = process.env.DND_GATE_KIND;
 const scenario = process.env.DND_GATE_STUB_SCENARIO;
-const file = process.env.DND_GATE_STUB_FILE;
+const primaryFile = process.env.DND_GATE_STUB_FILE;
+const secondaryFile = process.env.DND_GATE_STUB_UNRELATED_FILE;
 const logPath = process.env.DND_GATE_STUB_LOG;
-if (phase === undefined || kind === undefined || scenario === undefined || file === undefined || logPath === undefined) {
+if (phase === undefined || kind === undefined || scenario === undefined || primaryFile === undefined || secondaryFile === undefined || logPath === undefined) {
   throw new Error('Fake gate command is missing its required environment.');
 }
 
 const argumentsList = process.argv.slice(2);
 appendFileSync(logPath, `${JSON.stringify({ type: 'command', kind, phase, arguments: argumentsList })}\n`);
-const passed = scenario === 'clean' ||
-  ((scenario === 'flaky' || scenario === 'missing_retry') && phase === 'retry');
-const absoluteFile = resolve(file);
 
+const initiallyFailing = scenario === 'failed' ||
+  scenario === 'flaky' ||
+  scenario === 'missing_retry' ||
+  scenario === 'global_then_pass' ||
+  scenario === 'stock_missing' ||
+  scenario === 'process_timeout' ||
+  scenario === 'playwright_timeout' ||
+  scenario === 'ordinary_retry' ||
+  scenario === 'partial_retry';
+const selectedFiles = phase === 'initial'
+  ? [primaryFile, secondaryFile]
+  : [primaryFile];
+const resultFor = (file) => {
+  if (phase === 'retry') return scenario === 'failed' ? 'failed' : 'passed';
+  if (scenario === 'partial_retry') return 'failed';
+  return file === primaryFile && initiallyFailing ? 'failed' : 'passed';
+};
+
+const invocationId = process.env.DND_GATE_PHASE_INVOCATION_ID;
+const evidencePath = process.env.DND_GATE_EVIDENCE_PATH;
+const globalErrors = scenario === 'global_then_pass' && phase === 'initial'
+  ? [{ name: 'Error', message: 'intentional global error' }]
+  : [];
+
 if (kind === 'vitest') {
   const outputArgument = argumentsList.find((argument) => argument.startsWith('--outputFile.json='));
   if (outputArgument === undefined) throw new Error('Fake Vitest command received no JSON output path.');
   const outputPath = outputArgument.slice('--outputFile.json='.length);
-  writeFileSync(outputPath, JSON.stringify({
-    success: passed,
-    numFailedTestSuites: passed ? 0 : 1,
-    testResults: scenario === 'missing_retry' && phase === 'retry' ? [] : [{
-      name: absoluteFile,
-      status: passed ? 'passed' : 'failed',
-      assertionResults: [{ status: passed ? 'passed' : 'failed' }],
-    }],
-  }));
+  if (scenario !== 'stock_missing') {
+    const testResults = scenario === 'missing_retry' && phase === 'retry'
+      ? []
+      : selectedFiles.map((file) => ({
+        name: resolve(file),
+        status: resultFor(file),
+        assertionResults: [{ status: resultFor(file), duration: 1 }],
+        startTime: 1,
+        endTime: 2,
+      }));
+    writeFileSync(outputPath, JSON.stringify({
+      success: testResults.every((result) => result.status === 'passed'),
+      numFailedTestSuites: testResults.filter((result) => result.status === 'failed').length,
+      numFailedTests: testResults.filter((result) => result.status === 'failed').length,
+      testResults,
+    }));
+  }
+  if (evidencePath !== undefined && invocationId !== undefined && scenario !== 'sidecar_missing') {
+    const modules = scenario === 'missing_retry' && phase === 'retry'
+      ? []
+      : selectedFiles.map((file) => ({
+        executionId: `unit:${file}:${file}`,
+        file: resolve(file),
+        projectName: 'unit',
+        state: resultFor(file),
+        errors: [],
+      }));
+    writeFileSync(evidencePath, JSON.stringify({
+      version: 1,
+      kind,
+      phase,
+      phaseInvocationId: invocationId,
+      lifecycle: { onInit: true, onTestRunStart: true, onTestRunEnd: true },
+      passWithNoTests: false,
+      specifications: selectedFiles.map((file) => ({
+        executionId: `unit:${file}:${file}`,
+        file: resolve(file),
+        projectName: 'unit',
+        taskId: file,
+      })),
+      modules,
+      globalErrors,
+      terminalReason: selectedFiles.some((file) => resultFor(file) === 'failed') ? 'failed' : 'passed',
+      processTimeoutObserved: scenario === 'process_timeout' && phase === 'initial',
+      fatalReasons: scenario === 'process_timeout' && phase === 'initial' ? ['vitest-process-timeout'] : [],
+    }));
+  }
 } else if (kind === 'playwright') {
   const outputPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;
   if (outputPath === undefined) throw new Error('Fake Playwright command received no JSON output path.');
-  writeFileSync(outputPath, JSON.stringify({
-    suites: [{
-      title: file,
-      file: absoluteFile,
-      specs: [{
-        title: 'stub case',
-        file: absoluteFile,
-        ok: passed,
+  if (scenario !== 'stock_missing') {
+    const specs = selectedFiles.map((file) => {
+      const status = resultFor(file);
+      return {
+        title: `stub ${file}`,
+        file: resolve(file),
+        ok: status === 'passed',
         tests: [{
+          projectName: 'unit',
           expectedStatus: 'passed',
-          status: passed ? 'expected' : 'unexpected',
-          results: [{ status: passed ? 'passed' : 'failed' }],
+          status: status === 'passed' ? 'expected' : 'unexpected',
+          results: [{ status, duration: 1 }],
         }],
-      }],
-    }],
-    errors: [],
-    stats: {
-      startTime: new Date().toISOString(),
-      duration: 1,
-      expected: passed ? 1 : 0,
-      unexpected: passed ? 0 : 1,
-      flaky: 0,
-      skipped: 0,
-    },
-  }));
+      };
+    });
+    const failures = specs.filter((spec) => !spec.ok).length;
+    writeFileSync(outputPath, JSON.stringify({
+      suites: [{ title: 'stub suite', specs }],
+      errors: globalErrors,
+      stats: {
+        startTime: new Date(0).toISOString(),
+        duration: 1,
+        expected: specs.length - failures,
+        unexpected: failures,
+        flaky: 0,
+        skipped: 0,
+      },
+    }));
+  }
+  if (evidencePath !== undefined && invocationId !== undefined && scenario !== 'sidecar_missing') {
+    const tests = selectedFiles.map((file) => {
+      const status = resultFor(file);
+      const timedOut = scenario === 'playwright_timeout' && phase === 'initial' && file === primaryFile;
+      return {
+        executionId: `unit:${file}:${file}`,
+        file: resolve(file),
+        projectName: 'unit',
+        testId: file,
+        status: timedOut ? 'timedOut' : status,
+        outcome: status === 'passed' ? 'expected' : 'unexpected',
+        expectedStatus: 'passed',
+        onTestBeginObserved: true,
+        onTestEndObserved: true,
+        errors: status === 'failed' ? [{ name: 'Error', message: 'intentional failure' }] : [],
+      };
+    });
+    writeFileSync(evidencePath, JSON.stringify({
+      version: 1,
+      kind,
+      phase,
+      phaseInvocationId: invocationId,
+      lifecycle: { onBegin: true, onEnd: true, onExit: true },
+      discovered: selectedFiles.map((file) => ({
+        executionId: `unit:${file}:${file}`,
+        file: resolve(file),
+        projectName: 'unit',
+        testId: file,
+      })),
+      tests,
+      globalErrors,
+      fullResultStatus: selectedFiles.some((file) => resultFor(file) === 'failed') ? 'failed' : 'passed',
+      fatalReasons: [],
+    }));
+  }
 } else {
   throw new Error(`Unknown fake gate kind: ${kind}`);
 }
 
-process.exitCode = passed ? 0 : 1;
+if (scenario === 'signal' && phase === 'initial') process.kill(process.pid, 'SIGTERM');
+if (scenario === 'exit2' && phase === 'initial') process.exitCode = 2;
+else if (scenario === 'late_exit1' && phase === 'initial') process.exitCode = 1;
+else if (scenario === 'sidecar_missing') process.exitCode = 0;
+else process.exitCode = selectedFiles.some((file) => resultFor(file) === 'failed') ? 1 : 0;
diff --git a/tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts b/tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts
new file mode 100644
index 0000000000000000000000000000000000000000..abc09bbc11079d7ec4c7b1e8bfd2e6aaf4e374ca
--- /dev/null
+++ b/tests/fixtures/gate-evidence/d544-playwright-evidence.spec.ts
@@ -0,0 +1,16 @@
+import { expect, test } from '@playwright/test';
+
+test.describe.serial('D544 reporter evidence fixture', () => {
+  test.fixme('records an intentional expected skip', async () => {
+    expect(true).toBe(false);
+  });
+
+  test('D544 individual timeout is attributable', async () => {
+    test.setTimeout(25);
+    await new Promise((resolve) => setTimeout(resolve, 100));
+  });
+
+  test('records serially synthesized nonexecution', async () => {
+    expect(6 * 7).toBe(42);
+  });
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts b/tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d3aa358837d765c9546dc7f9aafb3a2203dfc1c9
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts
@@ -0,0 +1 @@
+throw new Error('intentional collection failure');
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts b/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..9e1b14a34e6cf33448a7b9859acd142cb0bb8dc0
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts
@@ -0,0 +1,8 @@
+import { createServer } from 'node:net';
+import { expect, it } from 'vitest';
+
+it('D544 leaves one handle open so Vitest emits onProcessTimeout', async () => {
+  const server = createServer();
+  await new Promise<void>((resolveListening) => server.listen(0, resolveListening));
+  expect(server.listening).toBe(true);
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs b/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..965773382e38ae3c61354ccb0d465614c3042727
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs
@@ -0,0 +1,7 @@
+import { createServer } from 'node:net';
+
+export default class D544HangingReporter {
+  onTestRunEnd() {
+    createServer().listen(0);
+  }
+}
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts b/tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts
new file mode 100644
index 0000000000000000000000000000000000000000..8c49b5982d4c9f1b6b1e6a6b4cfbe95aed366753
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts
@@ -0,0 +1,8 @@
+import { defineConfig } from 'vitest/config';
+
+export default defineConfig({
+  test: {
+    include: ['tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts'],
+    teardownTimeout: 50,
+  },
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts b/tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts
new file mode 100644
index 0000000000000000000000000000000000000000..bfb5d890ff794807f3cb35ed203ad50f7eb6d25d
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts
@@ -0,0 +1,12 @@
+import { defineConfig } from 'vitest/config';
+
+const fixture = 'tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts';
+
+export default defineConfig({
+  test: {
+    projects: [
+      { test: { name: 'project-a', include: [fixture] } },
+      { test: { name: 'project-b', include: [fixture] } },
+    ],
+  },
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-fail.gate-fixture.ts b/tests/fixtures/gate-evidence/vitest-reporter-fail.gate-fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..bdb1f2e76b4f051b81465de89822ee2f1f225279
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-fail.gate-fixture.ts
@@ -0,0 +1,5 @@
+import { expect, it } from 'vitest';
+
+it('fails attributably', () => {
+  expect(1).toBe(2);
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts b/tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..46c8f32c4fd7c7a63ed431315fae53c4224a8ef1
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts
@@ -0,0 +1,8 @@
+import { expect, it } from 'vitest';
+
+it('passes before an unhandled error is observed', () => {
+  expect(true).toBe(true);
+  queueMicrotask(() => {
+    throw new Error('intentional global error');
+  });
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts b/tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..55c1f3f5924d16f7a12dbc7173e6f112526efed6
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts
@@ -0,0 +1,5 @@
+import { expect, it } from 'vitest';
+
+it('passes', () => {
+  expect('evidence').toContain('id');
+});
diff --git a/tests/fixtures/gate-evidence/vitest-reporter.config.mts b/tests/fixtures/gate-evidence/vitest-reporter.config.mts
new file mode 100644
index 0000000000000000000000000000000000000000..4208b0ad648076106ab8a486f76f48cf8045fbe3
--- /dev/null
+++ b/tests/fixtures/gate-evidence/vitest-reporter.config.mts
@@ -0,0 +1,9 @@
+import { defineConfig } from 'vitest/config';
+
+export default defineConfig({
+  test: {
+    environment: 'node',
+    include: ['tests/fixtures/gate-evidence/*.gate-fixture.ts'],
+    passWithNoTests: process.env.DND_GATE_FIXTURE_PASS_WITH_NO_TESTS === '1',
+  },
+});
diff --git a/tests/fixtures/gate-vitest-passes-on-retry.fixture.ts b/tests/fixtures/gate-vitest-passes-on-retry.fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..aa10f5b7225bcb1f482fb95dca3c41d0c8b6a238
--- /dev/null
+++ b/tests/fixtures/gate-vitest-passes-on-retry.fixture.ts
@@ -0,0 +1,10 @@
+import { existsSync, writeFileSync } from 'node:fs';
+import { expect, it } from 'vitest';
+
+it('fails once and then passes using an external sentinel', () => {
+  const sentinel = process.env.DND_GATE_RETRY_SENTINEL;
+  if (sentinel === undefined) throw new Error('DND_GATE_RETRY_SENTINEL is required.');
+  const existed = existsSync(sentinel);
+  if (!existed) writeFileSync(sentinel, 'created by initial attempt\n', 'utf8');
+  expect(existed).toBe(true);
+});
diff --git a/tests/fixtures/gate-vitest-post-report-global-setup.mjs b/tests/fixtures/gate-vitest-post-report-global-setup.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..2fc2c72a904ecaf3ff140c3c5487e7d2c9304d62
--- /dev/null
+++ b/tests/fixtures/gate-vitest-post-report-global-setup.mjs
@@ -0,0 +1,10 @@
+export default function gateProofGlobalSetup() {
+  return function gateProofGlobalTeardown() {
+    if (process.env.DND_GATE_PROOF_MODE === 'exit2') process.exitCode = 2;
+    if (process.env.DND_GATE_PROOF_MODE === 'late-exit1') {
+      setImmediate(() => {
+        throw new Error('intentional post-report gate proof failure');
+      });
+    }
+  };
+}
diff --git a/tests/fixtures/gate-vitest-proof.config.mts b/tests/fixtures/gate-vitest-proof.config.mts
new file mode 100644
index 0000000000000000000000000000000000000000..23f91b32d114b71afeed86eaefc1ebef2db9ef28
--- /dev/null
+++ b/tests/fixtures/gate-vitest-proof.config.mts
@@ -0,0 +1,10 @@
+import { defineConfig } from 'vitest/config';
+
+export default defineConfig({
+  test: {
+    environment: 'node',
+    include: ['tests/fixtures/gate-vitest-*.fixture.ts'],
+    globalSetup: ['tests/fixtures/gate-vitest-post-report-global-setup.mjs'],
+    passWithNoTests: false,
+  },
+});
diff --git a/tests/fixtures/gate-vitest-success.fixture.ts b/tests/fixtures/gate-vitest-success.fixture.ts
new file mode 100644
index 0000000000000000000000000000000000000000..3cbc30ab11f079cfbc2d05ee2bee4fc1e671031e
--- /dev/null
+++ b/tests/fixtures/gate-vitest-success.fixture.ts
@@ -0,0 +1,5 @@
+import { expect, it } from 'vitest';
+
+it('provides one independently known passing test', () => {
+  expect(6 * 7).toBe(42);
+});
diff --git a/tests/unit/tools/gate-evidence-reporters.test.ts b/tests/unit/tools/gate-evidence-reporters.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5a3899e8cce821c2f57310f25e2a7bdf8131209c
--- /dev/null
+++ b/tests/unit/tools/gate-evidence-reporters.test.ts
@@ -0,0 +1,331 @@
+import { spawnSync } from 'node:child_process';
+import { tmpdir } from 'node:os';
+import { join, resolve } from 'node:path';
+import { describe, expect, it, vi } from 'vitest';
+import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
+
+interface NormalizedError {
+  readonly name: string;
+  readonly message: string;
+}
+
+interface VitestEvidence {
+  readonly phaseInvocationId: string;
+  readonly passWithNoTests: boolean;
+  readonly terminalReason: string | null;
+  readonly processTimeoutObserved: boolean;
+  readonly fatalReasons: readonly string[];
+  readonly specifications: readonly { readonly executionId: string; readonly file: string }[];
+  readonly modules: readonly {
+    readonly executionId: string;
+    readonly file: string;
+    readonly state: string;
+    readonly errors: readonly NormalizedError[];
+  }[];
+  readonly globalErrors: readonly NormalizedError[];
+  readonly lifecycle: { readonly onInit: boolean; readonly onTestRunStart: boolean; readonly onTestRunEnd: boolean };
+}
+
+interface PlaywrightEvidence {
+  readonly phaseInvocationId: string;
+  readonly fullResultStatus: string | null;
+  readonly globalErrors: readonly NormalizedError[];
+  readonly discovered: readonly { readonly executionId: string; readonly file: string }[];
+  readonly tests: readonly {
+    readonly executionId: string;
+    readonly status: string;
+    readonly outcome: string;
+    readonly expectedStatus: string;
+    readonly onTestBeginObserved: boolean;
+    readonly onTestEndObserved: boolean;
+  }[];
+  readonly lifecycle: { readonly onBegin: boolean; readonly onEnd: boolean; readonly onExit: boolean };
+}
+
+interface VitestReporterModule {
+  readonly default: new () => {
+    onInit(value: unknown): void;
+    onTestRunStart(value: readonly unknown[]): void;
+    onTestRunEnd(modules: readonly unknown[], errors: readonly unknown[], reason: string): void;
+    onProcessTimeout(): void;
+  };
+}
+
+interface PlaywrightReporterModule {
+  readonly default: new () => {
+    onBegin(config: unknown, suite: unknown): void;
+    onTestBegin(test: unknown, result: unknown): void;
+    onTestEnd(test: unknown, result: unknown): void;
+    onError(error: unknown): void;
+    onEnd(result: unknown): void;
+    onExit(): void;
+  };
+}
+
+interface VitestCase {
+  readonly state?: 'passed' | 'failed' | 'skipped' | 'pending' | 'queued';
+  readonly moduleErrors?: readonly Error[];
+  readonly globalErrors?: readonly Error[];
+  readonly reason?: 'passed' | 'failed' | 'interrupted';
+  readonly timeout?: boolean;
+  readonly passWithNoTests?: boolean;
+  readonly empty?: boolean;
+  readonly duplicate?: boolean;
+}
+
+type RealVitestMode = 'passing' | 'collection' | 'global' | 'process-timeout' | 'duplicate' | 'empty-true' | 'empty-false';
+
+function realVitestEvidence(mode: RealVitestMode): { readonly status: number | null; readonly evidence: VitestEvidence } {
+  const directory = mkdtempSync(join(tmpdir(), 'dnd-vitest-evidence-real-'));
+  const evidencePath = join(directory, 'evidence.json');
+  const reporter = resolve('tools/gate-vitest-evidence-reporter.mjs');
+  const ordinaryConfig = 'tests/fixtures/gate-evidence/vitest-reporter.config.mts';
+  const config = mode === 'duplicate'
+    ? 'tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts'
+    : mode === 'process-timeout'
+      ? 'tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts'
+      : ordinaryConfig;
+  const selectors: Record<RealVitestMode, readonly string[]> = {
+    passing: ['tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts'],
+    collection: ['tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts'],
+    global: ['tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts'],
+    'process-timeout': [],
+    duplicate: [],
+    'empty-true': ['tests/fixtures/gate-evidence/does-not-exist.gate-fixture.ts'],
+    'empty-false': ['tests/fixtures/gate-evidence/does-not-exist.gate-fixture.ts'],
+  };
+  const extraReporter = mode === 'process-timeout'
+    ? [`--reporter=${resolve('tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs')}`]
+    : [];
+  const result = spawnSync(process.execPath, [
+    resolve('node_modules/vitest/vitest.mjs'),
+    'run',
+    '--configLoader',
+    'runner',
+    '--config',
+    config,
+    `--reporter=${reporter}`,
+    ...extraReporter,
+    ...selectors[mode],
+  ], {
+    cwd: process.cwd(),
+    encoding: 'utf8',
+    env: {
+      ...process.env,
+      DND_GATE_EVIDENCE_PATH: evidencePath,
+      DND_GATE_KIND: 'vitest',
+      DND_GATE_PHASE: 'initial',
+      DND_GATE_PHASE_INVOCATION_ID: `real-${mode}`,
+      DND_GATE_FIXTURE_PASS_WITH_NO_TESTS: mode === 'empty-true' ? '1' : '0',
+    },
+  });
+  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as VitestEvidence;
+  return { status: result.status, evidence };
+}
+
+async function vitestEvidence(input: VitestCase = {}): Promise<VitestEvidence> {
+  const directory = mkdtempSync(join(tmpdir(), 'dnd-vitest-evidence-unit-'));
+  const path = join(directory, 'evidence.json');
+  vi.stubEnv('DND_GATE_EVIDENCE_PATH', path);
+  vi.stubEnv('DND_GATE_KIND', 'vitest');
+  vi.stubEnv('DND_GATE_PHASE', 'initial');
+  vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'vitest-unit-id');
+  const modulePath = new URL('../../../tools/gate-vitest-evidence-reporter.mjs', import.meta.url).href;
+  const imported = await import(modulePath) as unknown as VitestReporterModule;
+  const reporter = new imported.default();
+  reporter.onInit({ config: { passWithNoTests: input.passWithNoTests ?? false } });
+  const files = input.empty ? [] : [resolve('tests/example.test.ts')];
+  const specs = files.flatMap((file) => {
+    const base = [{ taskId: 'task-a', moduleId: file, project: { hash: 'project-a', name: 'unit' } }];
+    return input.duplicate
+      ? [...base, { taskId: 'task-b', moduleId: file, project: { hash: 'project-b', name: 'other' } }]
+      : base;
+  });
+  reporter.onTestRunStart(specs);
+  const modules = specs.map((specification) => ({
+    id: specification.taskId,
+    moduleId: specification.moduleId,
+    project: specification.project,
+    state: () => input.state ?? 'passed',
+    errors: () => [...(input.moduleErrors ?? [])],
+  }));
+  reporter.onTestRunEnd(modules, [...(input.globalErrors ?? [])], input.reason ?? 'passed');
+  if (input.timeout) reporter.onProcessTimeout();
+  return JSON.parse(readFileSync(path, 'utf8')) as VitestEvidence;
+}
+
+interface PlaywrightCase {
+  readonly status?: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
+  readonly outcome?: 'expected' | 'unexpected' | 'flaky' | 'skipped';
+  readonly expectedStatus?: 'passed' | 'failed' | 'skipped';
+  readonly begin?: boolean;
+  readonly end?: boolean;
+  readonly fullStatus?: 'passed' | 'failed' | 'timedout' | 'interrupted';
+  readonly globalError?: Error;
+  readonly duplicateUnfinished?: boolean;
+}
+
+async function playwrightEvidence(input: PlaywrightCase = {}): Promise<PlaywrightEvidence> {
+  const directory = mkdtempSync(join(tmpdir(), 'dnd-playwright-evidence-unit-'));
+  const path = join(directory, 'evidence.json');
+  vi.stubEnv('DND_GATE_EVIDENCE_PATH', path);
+  vi.stubEnv('DND_GATE_KIND', 'playwright');
+  vi.stubEnv('DND_GATE_PHASE', 'initial');
+  vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'playwright-unit-id');
+  const modulePath = new URL('../../../tools/gate-playwright-evidence-reporter.mjs', import.meta.url).href;
+  const imported = await import(modulePath) as unknown as PlaywrightReporterModule;
+  const reporter = new imported.default();
+  const file = resolve('tests/example.spec.ts');
+  const makeTest = (id: string, projectName: string) => ({
+    id,
+    location: { file, line: 1, column: 1 },
+    expectedStatus: input.expectedStatus ?? 'passed',
+    parent: { project: () => ({ name: projectName }) },
+    outcome: () => input.outcome ?? 'expected',
+  });
+  const tests = [makeTest('test-a', 'unit')];
+  if (input.duplicateUnfinished) tests.push(makeTest('test-b', 'other'));
+  reporter.onBegin({}, { allTests: () => tests });
+  const first = tests[0];
+  if (first === undefined) throw new Error('Fixture test missing.');
+  if (input.begin ?? true) reporter.onTestBegin(first, {});
+  if (input.end ?? true) reporter.onTestEnd(first, { status: input.status ?? 'passed', errors: [] });
+  if (input.globalError !== undefined) reporter.onError(input.globalError);
+  reporter.onEnd({ status: input.fullStatus ?? 'passed' });
+  reporter.onExit();
+  return JSON.parse(readFileSync(path, 'utf8')) as PlaywrightEvidence;
+}
+
+describe('Vitest gate evidence reporter', () => {
+  it('records a passing module with complete lifecycle provenance', async () => {
+    const evidence = await vitestEvidence();
+    expect(evidence.phaseInvocationId).toBe('vitest-unit-id');
+    expect(evidence.lifecycle).toEqual({ onInit: true, onTestRunStart: true, onTestRunEnd: true });
+    expect(evidence.modules[0]).toMatchObject({ state: 'passed', errors: [] });
+    const actual = realVitestEvidence('passing');
+    expect(actual.status).toBe(0);
+    expect(actual.evidence.modules).toHaveLength(1);
+    expect(actual.evidence.lifecycle.onTestRunEnd).toBe(true);
+  });
+
+  it('records collection/module failure details', async () => {
+    const evidence = await vitestEvidence({ state: 'failed', moduleErrors: [new Error('collection failed')], reason: 'failed' });
+    expect(evidence.modules[0]?.errors[0]?.message).toBe('collection failed');
+    const actual = realVitestEvidence('collection');
+    expect(actual.status).toBe(1);
+    expect(actual.evidence.modules[0]?.errors.length).toBeGreaterThan(0);
+  });
+
+  it('records an intentional skipped module', async () => {
+    expect((await vitestEvidence({ state: 'skipped' })).modules[0]?.state).toBe('skipped');
+  });
+
+  it('retains pending as unfinished native evidence', async () => {
+    expect((await vitestEvidence({ state: 'pending' })).modules[0]?.state).toBe('pending');
+  });
+
+  it('retains queued as unfinished native evidence', async () => {
+    expect((await vitestEvidence({ state: 'queued' })).modules[0]?.state).toBe('queued');
+  });
+
+  it('records global-only errors separately from modules', async () => {
+    const evidence = await vitestEvidence({ globalErrors: [new Error('global boom')], reason: 'failed' });
+    expect(evidence.globalErrors[0]?.message).toBe('global boom');
+    expect(evidence.modules[0]?.state).toBe('passed');
+    const actual = realVitestEvidence('global');
+    expect(actual.status).toBe(1);
+    expect(actual.evidence.globalErrors[0]?.message).toContain('intentional global error');
+  });
+
+  it('records terminal interruption', async () => {
+    expect((await vitestEvidence({ reason: 'interrupted' })).terminalReason).toBe('interrupted');
+  });
+
+  it('atomically rewrites evidence on process timeout', async () => {
+    const evidence = await vitestEvidence({ state: 'failed', reason: 'failed', timeout: true });
+    expect(evidence.processTimeoutObserved).toBe(true);
+    expect(evidence.fatalReasons).toEqual(['vitest-process-timeout']);
+    const actual = realVitestEvidence('process-timeout');
+    expect(actual.evidence.processTimeoutObserved).toBe(true);
+    expect(actual.evidence.fatalReasons).toEqual(['vitest-process-timeout']);
+  });
+
+  it('keeps project-aware identities for a duplicate path', async () => {
+    const evidence = await vitestEvidence({ duplicate: true });
+    expect(evidence.modules.map((module) => module.executionId)).toHaveLength(2);
+    expect(new Set(evidence.modules.map((module) => module.executionId)).size).toBe(2);
+    const actual = realVitestEvidence('duplicate');
+    expect(actual.status).toBe(0);
+    expect(new Set(actual.evidence.modules.map((module) => module.executionId)).size).toBe(2);
+  });
+
+  it('records root passWithNoTests true for an empty run', async () => {
+    const evidence = await vitestEvidence({ empty: true, passWithNoTests: true });
+    expect(evidence.passWithNoTests).toBe(true);
+    expect(evidence.specifications).toEqual([]);
+    const actual = realVitestEvidence('empty-true');
+    expect(actual.status).toBe(0);
+    expect(actual.evidence.passWithNoTests).toBe(true);
+    expect(actual.evidence.specifications).toEqual([]);
+  });
+
+  it('records root passWithNoTests false for an empty run', async () => {
+    const evidence = await vitestEvidence({ empty: true, passWithNoTests: false, reason: 'failed' });
+    expect(evidence.passWithNoTests).toBe(false);
+    expect(evidence.specifications).toEqual([]);
+    const actual = realVitestEvidence('empty-false');
+    expect(actual.status).toBe(1);
+    expect(actual.evidence.passWithNoTests).toBe(false);
+    expect(actual.evidence.specifications).toEqual([]);
+  });
+});
+
+describe('Playwright gate evidence reporter', () => {
+  it('records an expected pass', async () => {
+    expect((await playwrightEvidence()).tests[0]).toMatchObject({ status: 'passed', outcome: 'expected' });
+  });
+
+  it('records an unexpected assertion failure', async () => {
+    expect((await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed' })).tests[0])
+      .toMatchObject({ status: 'failed', outcome: 'unexpected' });
+  });
+
+  it('records an individual timed-out result distinctly', async () => {
+    expect((await playwrightEvidence({ status: 'timedOut', outcome: 'unexpected', fullStatus: 'failed' })).tests[0]?.status)
+      .toBe('timedOut');
+  });
+
+  it('records intentional skip with callback and expected status', async () => {
+    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'skipped' })).tests[0])
+      .toMatchObject({ status: 'skipped', expectedStatus: 'skipped', onTestEndObserved: true });
+  });
+
+  it('records started without terminal callback', async () => {
+    expect((await playwrightEvidence({ end: false })).tests[0])
+      .toMatchObject({ onTestBeginObserved: true, onTestEndObserved: false });
+  });
+
+  it('records synthesized skipped nonexecution', async () => {
+    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'passed', begin: false })).tests[0])
+      .toMatchObject({ status: 'skipped', expectedStatus: 'passed', onTestBeginObserved: false, onTestEndObserved: true });
+  });
+
+  it('records global FullResult timedout', async () => {
+    expect((await playwrightEvidence({ fullStatus: 'timedout' })).fullResultStatus).toBe('timedout');
+  });
+
+  it('records global FullResult interrupted', async () => {
+    expect((await playwrightEvidence({ fullStatus: 'interrupted' })).fullResultStatus).toBe('interrupted');
+  });
+
+  it('records global-only onError', async () => {
+    expect((await playwrightEvidence({ globalError: new Error('global boom'), fullStatus: 'failed' })).globalErrors[0]?.message)
+      .toBe('global boom');
+  });
+
+  it('keeps an independent unfinished duplicate-project execution', async () => {
+    const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed', duplicateUnfinished: true });
+    expect(evidence.discovered.map((test) => test.executionId)).toHaveLength(2);
+    expect(evidence.tests.find((test) => test.executionId.includes('test-b'))?.onTestEndObserved).toBe(false);
+  });
+});
diff --git a/tests/unit/tools/gate-runners.test.ts b/tests/unit/tools/gate-runners.test.ts
index cd9fc70190d3974854daabb5dffd819c43595f5d..0ba227f0111630a5766d17d8d77ebb7e72d08b5b
--- a/tests/unit/tools/gate-runners.test.ts
+++ b/tests/unit/tools/gate-runners.test.ts
@@ -1,20 +1,74 @@
 import { spawnSync } from 'node:child_process';
-import { mkdtempSync, readFileSync, readdirSync } from '../../helpers/test-filesystem';
 import { tmpdir } from 'node:os';
 import { join, resolve } from 'node:path';
+import { parseCLI } from 'vitest/node';
 import { describe, expect, it } from 'vitest';
+import {
+  existsSync,
+  mkdirSync,
+  mkdtempSync,
+  readFileSync,
+  readdirSync,
+} from '../../helpers/test-filesystem';
 
 type RunnerKind = 'vitest' | 'playwright';
-type Scenario = 'clean' | 'flaky' | 'failed' | 'missing_retry';
+type Scenario =
+  | 'clean'
+  | 'flaky'
+  | 'failed'
+  | 'missing_retry'
+  | 'exit2'
+  | 'signal'
+  | 'spawn_error'
+  | 'global_then_pass'
+  | 'stock_missing'
+  | 'partial_retry'
+  | 'ordinary_retry'
+  | 'late_exit1'
+  | 'sidecar_missing'
+  | 'process_timeout'
+  | 'playwright_timeout';
 
+interface PhaseFailure {
+  readonly phase: 'initial' | 'retry';
+  readonly domain: 'process' | 'reporter' | 'discovery';
+  readonly reasons: readonly string[];
+}
+
+interface GatePhase {
+  readonly loadAverage: readonly number[];
+  readonly durationMs: number;
+  readonly reporterPath: string;
+  readonly evidencePath: string;
+  readonly process: {
+    readonly status: 'passed' | 'ordinary-file-failure' | 'failed';
+    readonly exitCode: number | null;
+    readonly signal: string | null;
+    readonly spawnError: null | { readonly code: string | null; readonly message: string };
+    readonly reasons: readonly string[];
+  };
+  readonly reporterOutcome: { readonly status: 'passed' | 'failed'; readonly reasons: readonly string[] };
+  readonly discovery: {
+    readonly status: 'complete' | 'failed' | 'uncertified';
+    readonly missingExecutionIds: readonly string[];
+    readonly requestedFiles: readonly string[];
+    readonly reportedFiles: readonly string[];
+  };
+  readonly fileOutcomes: readonly { readonly file: string; readonly status: string }[];
+  readonly command: { readonly arguments: readonly string[] };
+}
+
 interface GateReport {
+  readonly version: number;
   readonly phases: {
-    readonly initial: { readonly loadAverage: readonly number[]; readonly durationMs: number };
-    readonly retry: null | { readonly loadAverage: readonly number[]; readonly durationMs: number };
+    readonly initial: GatePhase;
+    readonly retry: GatePhase | null;
   };
   readonly verdict: {
-    readonly loadFlakes: readonly string[];
-    readonly failed: readonly string[];
+    readonly status: 'passed' | 'failed';
+    readonly passedOnRetry: readonly string[];
+    readonly failedFiles: readonly string[];
+    readonly phaseFailures: readonly PhaseFailure[];
   };
 }
 
@@ -25,16 +79,21 @@
   readonly arguments: readonly string[];
 }
 
-function runGate(kind: RunnerKind, scenario: Scenario): {
+interface GateRun {
   readonly status: number | null;
   readonly stdout: string;
+  readonly stderr: string;
   readonly report: GateReport;
   readonly logs: readonly StubLog[];
   readonly failedFile: string;
   readonly unrelatedFile: string;
-} {
+}
+
+function runGate(kind: RunnerKind, scenario: Scenario, parserProbe = false): GateRun {
   const directory = mkdtempSync(join(tmpdir(), `dnd-${kind}-gate-test-`));
   const logPath = join(directory, 'stub.jsonl');
+  const emptyPath = join(directory, 'empty-path');
+  mkdirSync(emptyPath);
   const failedFile = kind === 'vitest'
     ? 'tests/unit/example.test.ts'
     : 'tests/browser/example.spec.ts';
@@ -45,76 +104,245 @@
   const commandModuleVariable = kind === 'vitest'
     ? 'DND_GATE_VITEST_MODULE'
     : 'DND_GATE_PLAYWRIGHT_MODULE';
+  const environment: NodeJS.ProcessEnv = {
+    ...process.env,
+    DND_GATE_REPORT_DIR: directory,
+    DND_GATE_STUB_FILE: failedFile,
+    DND_GATE_STUB_UNRELATED_FILE: unrelatedFile,
+    DND_GATE_STUB_LOG: logPath,
+    DND_GATE_STUB_SCENARIO: scenario,
+    [commandModuleVariable]: resolve('tests/fixtures/fake-gate-command.mjs'),
+  };
+  if (scenario === 'spawn_error') {
+    delete environment.DND_GATE_FLOCK_MODULE;
+    environment.PATH = emptyPath;
+  } else {
+    environment.DND_GATE_FLOCK_MODULE = resolve('tests/fixtures/fake-flock.mjs');
+  }
+  const selectors = kind === 'vitest'
+    ? parserProbe
+      ? [
+        '-c', 'tests/fixtures/gate-vitest-proof.config.mts',
+        '--project', 'unit', '--project=other',
+        '-t', 'probe name', '--environment=node', '--pool', 'forks',
+        '--passWithNoTests', '--shard=1/2', '--changed=false',
+      ]
+      : ['--config', 'tests/fixtures/gate-vitest-proof.config.mts', '--project=unit']
+    : ['--project=chromium'];
+  const tail = parserProbe ? ['--', '--node-tail', 'tail-value'] : [];
   const result = spawnSync(
     process.execPath,
-    [runner, failedFile, unrelatedFile, ...(kind === 'playwright' ? ['--project=chromium'] : [])],
-    {
-      cwd: process.cwd(),
-      encoding: 'utf8',
-      env: {
-        ...process.env,
-        DND_GATE_REPORT_DIR: directory,
-        DND_GATE_FLOCK_MODULE: resolve('tests/fixtures/fake-flock.mjs'),
-        DND_GATE_STUB_FILE: failedFile,
-        DND_GATE_STUB_LOG: logPath,
-        DND_GATE_STUB_SCENARIO: scenario,
-        [commandModuleVariable]: resolve('tests/fixtures/fake-gate-command.mjs'),
-      },
-    },
+    [runner, ...selectors, failedFile, unrelatedFile, ...tail],
+    { cwd: process.cwd(), encoding: 'utf8', env: environment },
   );
   const finalReport = readdirSync(directory).find((name) => name.includes('-gate-') && name.endsWith('.json'));
   if (finalReport === undefined) throw new Error(`Gate runner wrote no final report. stderr: ${result.stderr}`);
   const report = JSON.parse(readFileSync(join(directory, finalReport), 'utf8')) as GateReport;
-  const logs = readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as StubLog);
-  return { status: result.status, stdout: result.stdout, report, logs, failedFile, unrelatedFile };
+  const logs = existsSync(logPath)
+    ? readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as StubLog)
+    : [];
+  return {
+    status: result.status,
+    stdout: result.stdout,
+    stderr: result.stderr,
+    report,
+    logs,
+    failedFile,
+    unrelatedFile,
+  };
 }
 
-describe.each(['vitest', 'playwright'] as const)('%s load-tolerant gate runner', (kind) => {
-  it('distinguishes clean runs, load flakes, and persistent failures with a locked exact-file retry', () => {
+function reasons(run: GateRun, phase: 'initial' | 'retry', domain: PhaseFailure['domain']): readonly string[] {
+  return run.report.verdict.phaseFailures
+    .filter((failure) => failure.phase === phase && failure.domain === domain)
+    .flatMap((failure) => failure.reasons);
+}
+
+describe.each(['vitest', 'playwright'] as const)('%s gate retained behavior', (kind) => {
+  it('retains clean, serial retry, lock, phase order, and factual headings', () => {
     const clean = runGate(kind, 'clean');
+    expect(clean.report.version).toBe(2);
     expect(clean.status).toBe(0);
-    expect(clean.report.verdict).toEqual({ loadFlakes: [], failed: [] });
+    expect(clean.report.verdict).toEqual({ status: 'passed', passedOnRetry: [], failedFiles: [], phaseFailures: [] });
     expect(clean.report.phases.retry).toBeNull();
-    expect(clean.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial']);
-    expect(clean.stdout).toContain('LOAD FLAKES (passed serially)');
-    expect(clean.stdout).toContain('FAILED');
 
-    const flaky = runGate(kind, 'flaky');
-    expect(flaky.status).toBe(0);
-    expect(flaky.report.verdict).toEqual({ loadFlakes: [flaky.failedFile], failed: [] });
-    expect(flaky.report.phases.retry?.loadAverage).toHaveLength(3);
-    expect(flaky.report.phases.retry?.durationMs).toBeGreaterThanOrEqual(0);
-    const flakyCommands = flaky.logs.filter((entry) => entry.type === 'command');
-    expect(flakyCommands.map((entry) => entry.phase)).toEqual(['initial', 'retry']);
-    const retryCommand = flakyCommands[1];
-    expect(retryCommand?.arguments).toContain(flaky.failedFile);
-    expect(retryCommand?.arguments).not.toContain(flaky.unrelatedFile);
+    const retried = runGate(kind, 'flaky');
+    expect(retried.status).toBe(0);
+    expect(retried.report.verdict.passedOnRetry).toEqual([retried.failedFile]);
+    expect(retried.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial', 'retry']);
+    const retryCommand = retried.logs.filter((entry) => entry.type === 'command')[1];
+    expect(retryCommand?.arguments).toContain(retried.failedFile);
+    expect(retryCommand?.arguments).not.toContain(retried.unrelatedFile);
     expect(retryCommand?.arguments).toContain(kind === 'vitest' ? '--no-file-parallelism' : '--workers=1');
-    const retryLock = flaky.logs.filter((entry) => entry.type === 'flock')[1];
-    expect(retryLock?.arguments.slice(0, 3)).toEqual(['-w', '7200', '/tmp/dnd-gate.lock']);
-    expect(flaky.stdout).toContain(`  ${flaky.failedFile}`);
+    expect(retried.logs.filter((entry) => entry.type === 'flock')[1]?.arguments.slice(0, 3))
+      .toEqual(['-w', '7200', '/tmp/dnd-gate.lock']);
+    expect(retried.stdout).toContain('PASSED ON RETRY (cause not inferred)');
+    expect(retried.stdout).toContain('FAILED FILES');
+    expect(retried.stdout).toContain('PHASE FAILURES');
 
     const failed = runGate(kind, 'failed');
     expect(failed.status).toBe(1);
-    expect(failed.report.verdict).toEqual({ loadFlakes: [], failed: [failed.failedFile] });
+    expect(failed.report.verdict.failedFiles).toEqual([failed.failedFile]);
     expect(failed.report.phases.initial.loadAverage).toHaveLength(3);
-    expect(failed.report.phases.initial.durationMs).toBeGreaterThanOrEqual(0);
-    expect(failed.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial', 'retry']);
-    expect(failed.stdout).toContain(`  ${failed.failedFile}`);
+    expect(failed.report.phases.retry?.durationMs).toBeGreaterThanOrEqual(0);
   });
 });
 
-describe('Vitest retry report completeness', () => {
-  it('fails closed when the retry reporter omits an initially failed file', () => {
+describe('Vitest retained retry report completeness and option parsing', () => {
+  it('fails closed on omission and preserves parsed selectors before exact filters and tail', () => {
     const omitted = runGate('vitest', 'missing_retry');
+    expect(omitted.report.version).toBe(2);
+    expect(omitted.status).toBe(1);
+    expect(omitted.report.verdict.failedFiles).toEqual([omitted.failedFile]);
+    expect(omitted.report.phases.retry?.discovery.status).toBe('failed');
+
+    const retried = runGate('vitest', 'ordinary_retry', true);
+    const args = retried.report.phases.retry?.command.arguments;
+    expect(args).toBeDefined();
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    const parsedOptions = parsed.options as unknown as Record<string, unknown>;
+    expect({
+      filter: parsed.filter,
+      config: parsed.options.config,
+      project: parsed.options.project,
+      testNamePattern: parsed.options.testNamePattern,
+      environment: parsed.options.environment,
+      pool: parsed.options.pool,
+      passWithNoTests: parsed.options.passWithNoTests,
+      shard: parsed.options.shard,
+      changed: parsed.options.changed,
+      fileParallelism: parsed.options.fileParallelism,
+      maxWorkers: parsed.options.maxWorkers,
+      tail: parsedOptions['--'],
+    }).toEqual({
+      filter: [retried.failedFile],
+      config: 'tests/fixtures/gate-vitest-proof.config.mts',
+      project: ['unit', 'other'],
+      testNamePattern: 'probe name',
+      environment: 'node',
+      pool: 'forks',
+      passWithNoTests: true,
+      shard: '1/2',
+      changed: 'false',
+      fileParallelism: false,
+      maxWorkers: 1,
+      tail: ['--node-tail', 'tail-value'],
+    });
+    const reporterIndex = args?.findIndex((argument) => argument.startsWith('--reporter=')) ?? -1;
+    const failedFileIndex = args?.indexOf(retried.failedFile) ?? -1;
+    const delimiterIndex = args?.indexOf('--') ?? -1;
+    expect(args?.indexOf('-c')).toBeGreaterThan(1);
+    expect(reporterIndex).toBeGreaterThan(args?.indexOf('--changed=false') ?? -1);
+    expect(failedFileIndex).toBeGreaterThan(reporterIndex);
+    expect(delimiterIndex).toBeGreaterThan(failedFileIndex);
+  });
+});
+
+describe.each(['vitest', 'playwright'] as const)('%s four-domain counterexamples', (kind) => {
+  it('fails solely on child exit 2 after complete passing evidence', () => {
+    const run = runGate(kind, 'exit2');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.process).toMatchObject({ status: 'failed', exitCode: 2, signal: null });
+    expect(run.report.phases.initial.reporterOutcome.status).toBe('passed');
+    expect(run.report.phases.initial.discovery.status).toBe('complete');
+    expect(run.report.phases.retry).toBeNull();
+    expect(run.report.verdict.phaseFailures.map((failure) => failure.domain)).toEqual(['process']);
+  });
+
+  it('retains the exact terminating signal after readable evidence', () => {
+    const run = runGate(kind, 'signal');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.process.exitCode).toBeNull();
+    expect(run.report.phases.initial.process.signal).toBe('SIGTERM');
+    expect(run.report.phases.retry).toBeNull();
+  });
+
+  it('records a structured ENOENT spawn failure and uncertified discovery', () => {
+    const run = runGate(kind, 'spawn_error');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.process.spawnError?.code).toBe('ENOENT');
+    expect(run.report.phases.initial.process.exitCode).toBeNull();
+    expect(run.report.phases.initial.discovery.status).toBe('uncertified');
+    expect(run.report.phases.retry).toBeNull();
+  });
+
+  it('keeps a global reporter failure red while recording a passing diagnostic retry', () => {
+    const run = runGate(kind, 'global_then_pass');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
+    expect(reasons(run, 'initial', 'reporter')).toContain('runner-global-error');
+    expect(run.report.phases.retry).not.toBeNull();
+  });
 
-    expect(omitted.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase))
-      .toEqual(['initial', 'retry']);
-    expect(omitted.report.verdict).toEqual({
-      loadFlakes: [],
-      failed: [omitted.failedFile],
+  it('retains sidecar diagnostics but fails when stock JSON is missing', () => {
+    const run = runGate(kind, 'stock_missing');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.reporterOutcome.reasons).toContain('stock-report-missing');
+    expect(run.report.phases.initial.fileOutcomes).toContainEqual(expect.objectContaining({ file: run.failedFile, status: 'failed' }));
+    expect(run.report.phases.retry).not.toBeNull();
+  });
+
+  it('fails retry discovery when two requested failures produce only one result', () => {
+    const run = runGate(kind, 'partial_retry');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.retry?.discovery.status).toBe('failed');
+    expect(run.report.phases.retry?.discovery.requestedFiles).toEqual([run.failedFile, run.unrelatedFile].sort());
+    expect(run.report.phases.retry?.discovery.reportedFiles).toEqual([run.failedFile]);
+  });
+
+  it('allows only ordinary attributable file failure to become green on exact retry', () => {
+    const run = runGate(kind, 'ordinary_retry');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(0);
+    expect(run.report.phases.initial.process.status).toBe('ordinary-file-failure');
+    expect(run.report.verdict).toEqual({
+      status: 'passed',
+      passedOnRetry: [run.failedFile],
+      failedFiles: [],
+      phaseFailures: [],
     });
-    expect(omitted.status).toBe(1);
-    expect(omitted.stdout).toContain(`FAILED\n  ${omitted.failedFile}`);
   });
+
+  it('rejects a post-report exit 1 when every file passed and does not retry', () => {
+    const run = runGate(kind, 'late_exit1');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.process.status).toBe('failed');
+    expect(run.report.phases.initial.reporterOutcome.status).toBe('passed');
+    expect(run.report.phases.initial.discovery.status).toBe('complete');
+    expect(run.report.phases.retry).toBeNull();
+  });
+
+  it('rejects readable stock JSON without the gate evidence sidecar', () => {
+    const run = runGate(kind, 'sidecar_missing');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.phases.initial.reporterOutcome.reasons).toContain('evidence-sidecar-missing');
+    expect(run.report.phases.initial.discovery.status).toBe('uncertified');
+    expect(run.report.phases.retry).toBeNull();
+  });
+});
+
+describe('runner-specific timeout policy', () => {
+  it('keeps Vitest onProcessTimeout fatal after an attributable file passes retry', () => {
+    const run = runGate('vitest', 'process_timeout');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(1);
+    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
+    expect(reasons(run, 'initial', 'reporter')).toEqual(['vitest-process-timeout']);
+  });
+
+  it('permits a Playwright individual timedOut result to pass exact serial retry', () => {
+    const run = runGate('playwright', 'playwright_timeout');
+    expect(run.report.version).toBe(2);
+    expect(run.status).toBe(0);
+    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
+    expect(run.report.verdict.phaseFailures).toEqual([]);
+  });
 });
diff --git a/tests/unit/tools/gate-verdict.test.ts b/tests/unit/tools/gate-verdict.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..e61957c8d55f5c03012f7a1c5d2b58a9670f27f2
--- /dev/null
+++ b/tests/unit/tools/gate-verdict.test.ts
@@ -0,0 +1,254 @@
+import { tmpdir } from 'node:os';
+import { join, resolve } from 'node:path';
+import { describe, expect, it } from 'vitest';
+import { mkdirSync, mkdtempSync, writeFileSync } from '../../helpers/test-filesystem';
+
+type Kind = 'vitest' | 'playwright';
+type Phase = 'initial' | 'retry';
+
+interface ArtifactRead {
+  readonly status: 'readable' | 'missing' | 'unreadable' | 'malformed';
+  readonly error: string | null;
+}
+
+interface PhaseInput {
+  readonly kind: Kind;
+  readonly phase: Phase;
+  readonly phaseInvocationId: string;
+  readonly reporterPath: string;
+  readonly evidencePath: string;
+  readonly reporter: unknown;
+  readonly evidence: unknown;
+  readonly stockRead: ArtifactRead;
+  readonly evidenceRead: ArtifactRead;
+  readonly exitCode: number | null;
+  readonly signal: string | null;
+  readonly spawnError: null | { readonly code: string | null; readonly message: string };
+  readonly requestedFiles: readonly string[] | null;
+}
+
+interface ClassifiedPhase {
+  readonly phase: Phase;
+  readonly process: { readonly status: string; readonly reasons: readonly string[] };
+  readonly reporterOutcome: { readonly status: string; readonly reasons: readonly string[] };
+  readonly discovery: { readonly status: string; readonly missingExecutionIds: readonly string[] };
+  readonly fileOutcomes: readonly { readonly file: string; readonly status: string; readonly executionIds: readonly string[] }[];
+}
+
+interface VerdictModule {
+  classifyPhase(value: PhaseInput): unknown;
+  readJsonArtifact(path: string): { readonly read: ArtifactRead };
+  reduceGateVerdict(initial: ClassifiedPhase, retry: ClassifiedPhase | null): {
+    readonly phaseFailures: readonly { readonly phase: Phase; readonly domain: string }[];
+  };
+}
+
+async function verdictModule(): Promise<VerdictModule> {
+  const modulePath = new URL('../../../tools/gate-verdict.mjs', import.meta.url).href;
+  return await import(modulePath) as unknown as VerdictModule;
+}
+
+const readable: ArtifactRead = { status: 'readable', error: null };
+
+function evidence(kind: Kind, phase: Phase, id: string, status: 'passed' | 'failed' = 'passed'): unknown {
+  const file = resolve(kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts');
+  const executionId = `unit:test:${file}`;
+  if (kind === 'vitest') {
+    return {
+      version: 1,
+      kind,
+      phase,
+      phaseInvocationId: id,
+      lifecycle: { onInit: true, onTestRunStart: true, onTestRunEnd: true },
+      passWithNoTests: false,
+      specifications: [{ executionId, file, projectName: 'unit', taskId: 'test' }],
+      modules: [{ executionId, file, projectName: 'unit', state: status, errors: [] }],
+      globalErrors: [],
+      terminalReason: status === 'failed' ? 'failed' : 'passed',
+      processTimeoutObserved: false,
+      fatalReasons: [],
+    };
+  }
+  return {
+    version: 1,
+    kind,
+    phase,
+    phaseInvocationId: id,
+    lifecycle: { onBegin: true, onEnd: true, onExit: true },
+    discovered: [{ executionId, file, projectName: 'unit', testId: 'test' }],
+    tests: [{
+      executionId,
+      file,
+      projectName: 'unit',
+      testId: 'test',
+      status,
+      outcome: status === 'failed' ? 'unexpected' : 'expected',
+      expectedStatus: 'passed',
+      onTestBeginObserved: true,
+      onTestEndObserved: true,
+      errors: [],
+    }],
+    globalErrors: [],
+    fullResultStatus: status === 'failed' ? 'failed' : 'passed',
+    fatalReasons: [],
+  };
+}
+
+function stock(kind: Kind, status: 'passed' | 'failed' = 'passed'): unknown {
+  const file = resolve(kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts');
+  if (kind === 'vitest') {
+    return {
+      success: status === 'passed',
+      numFailedTestSuites: status === 'failed' ? 1 : 0,
+      numFailedTests: status === 'failed' ? 1 : 0,
+      testResults: [{ name: file, status, assertionResults: [{ status }] }],
+    };
+  }
+  return {
+    suites: [{ specs: [{ file, ok: status === 'passed', tests: [{ results: [{ status }] }] }] }],
+    errors: [],
+    stats: { expected: status === 'passed' ? 1 : 0, unexpected: status === 'failed' ? 1 : 0, flaky: 0, skipped: 0 },
+  };
+}
+
+function input(kind: Kind, phase: Phase = 'initial', status: 'passed' | 'failed' = 'passed'): PhaseInput {
+  return {
+    kind,
+    phase,
+    phaseInvocationId: 'phase-id',
+    reporterPath: '/tmp/stock.json',
+    evidencePath: '/tmp/evidence.json',
+    reporter: stock(kind, status),
+    evidence: evidence(kind, phase, 'phase-id', status),
+    stockRead: readable,
+    evidenceRead: readable,
+    exitCode: status === 'failed' ? 1 : 0,
+    signal: null,
+    spawnError: null,
+    requestedFiles: phase === 'retry'
+      ? [kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts']
+      : null,
+  };
+}
+
+async function classify(value: PhaseInput): Promise<ClassifiedPhase> {
+  const module = await verdictModule();
+  return module.classifyPhase(value) as ClassifiedPhase;
+}
+
+describe('gate phase classifier', () => {
+  it('classifies Vitest exit 1 with an attributable file as ordinary failure', async () => {
+    expect((await classify(input('vitest', 'initial', 'failed'))).process.status).toBe('ordinary-file-failure');
+  });
+
+  it('classifies Playwright exit 1 with an attributable file as ordinary failure', async () => {
+    expect((await classify(input('playwright', 'initial', 'failed'))).process.status).toBe('ordinary-file-failure');
+  });
+
+  it('classifies late exit 1 after successful reports as process failure', async () => {
+    const phase = await classify({ ...input('vitest'), exitCode: 1 });
+    expect(phase.process.status).toBe('failed');
+    expect(phase.reporterOutcome.status).toBe('passed');
+  });
+
+  it('classifies exit 2 as process failure', async () => {
+    expect((await classify({ ...input('vitest'), exitCode: 2 })).process.reasons).toEqual(['process-exit-2']);
+  });
+
+  it('classifies a signal independently of exit status', async () => {
+    expect((await classify({ ...input('playwright'), exitCode: null, signal: 'SIGTERM' })).process.reasons)
+      .toContain('process-signal-SIGTERM');
+  });
+
+  it('classifies a structured spawn error', async () => {
+    const phase = await classify({
+      ...input('vitest'),
+      reporter: null,
+      evidence: null,
+      stockRead: { status: 'missing', error: 'ENOENT' },
+      evidenceRead: { status: 'missing', error: 'ENOENT' },
+      exitCode: null,
+      spawnError: { code: 'ENOENT', message: 'spawnSync flock ENOENT' },
+    });
+    expect(phase.process.reasons).toContain('spawn-error-ENOENT');
+    expect(phase.discovery.status).toBe('uncertified');
+  });
+
+  it('distinguishes malformed JSON', async () => {
+    const directory = mkdtempSync(join(tmpdir(), 'dnd-gate-malformed-'));
+    const path = join(directory, 'bad.json');
+    writeFileSync(path, '{not json', 'utf8');
+    const module = await verdictModule();
+    expect(module.readJsonArtifact(path).read.status).toBe('malformed');
+  });
+
+  it('distinguishes unreadable evidence from missing and malformed', async () => {
+    const directory = mkdtempSync(join(tmpdir(), 'dnd-gate-unreadable-'));
+    const path = join(directory, 'evidence-directory');
+    mkdirSync(path);
+    const module = await verdictModule();
+    expect(module.readJsonArtifact(path).read.status).toBe('unreadable');
+  });
+
+  it('does not let a retry process failure authorize green', async () => {
+    const module = await verdictModule();
+    const initial = await classify(input('vitest', 'initial', 'failed'));
+    const retry = await classify({ ...input('vitest', 'retry'), exitCode: 2 });
+    expect(module.reduceGateVerdict(initial, retry).phaseFailures).toContainEqual(expect.objectContaining({ phase: 'retry', domain: 'process' }));
+  });
+
+  it('does not let a retry reporter/global failure authorize green', async () => {
+    const badEvidence = evidence('vitest', 'retry', 'phase-id') as { globalErrors: unknown[] };
+    badEvidence.globalErrors = [{ name: 'Error', message: 'global' }];
+    const retry = await classify({ ...input('vitest', 'retry'), evidence: badEvidence });
+    expect(retry.reporterOutcome.reasons).toContain('runner-global-error');
+    const unexplainedEvidence = evidence('vitest', 'retry', 'phase-id') as { terminalReason: string };
+    unexplainedEvidence.terminalReason = 'failed';
+    const unexplained = await classify({ ...input('vitest', 'retry'), reporter: stock('vitest'), evidence: unexplainedEvidence });
+    expect(unexplained.reporterOutcome.reasons).toEqual(expect.arrayContaining([
+      'runner-unexplained-failure',
+      'stock-evidence-mismatch',
+    ]));
+  });
+
+  it('fails retry discovery when the requested file is omitted', async () => {
+    const retryInput = input('playwright', 'retry');
+    const omitted = evidence('playwright', 'retry', 'phase-id') as { discovered: unknown[]; tests: unknown[] };
+    omitted.discovered = [];
+    omitted.tests = [];
+    const retry = await classify({ ...retryInput, evidence: omitted });
+    expect(retry.discovery.status).toBe('failed');
+  });
+
+  it('rejects sidecar invocation UUID mismatch', async () => {
+    const phase = await classify({ ...input('vitest'), evidence: evidence('vitest', 'initial', 'other-id') });
+    expect(phase.reporterOutcome.reasons).toContain('evidence-invocation-mismatch');
+  });
+
+  it('rejects sidecar kind mismatch', async () => {
+    const mismatched = evidence('vitest', 'initial', 'phase-id') as { kind: string };
+    mismatched.kind = 'playwright';
+    expect((await classify({ ...input('vitest'), evidence: mismatched })).reporterOutcome.reasons)
+      .toContain('evidence-kind-mismatch');
+  });
+
+  it('rejects sidecar phase mismatch', async () => {
+    const mismatched = evidence('vitest', 'initial', 'phase-id') as { phase: string };
+    mismatched.phase = 'retry';
+    expect((await classify({ ...input('vitest'), evidence: mismatched })).reporterOutcome.reasons)
+      .toContain('evidence-phase-mismatch');
+  });
+
+  it('retains independent unfinished execution beside a failed duplicate path', async () => {
+    const value = evidence('playwright', 'initial', 'phase-id', 'failed') as {
+      discovered: Array<{ executionId: string; file: string; projectName: string; testId: string }>;
+      tests: Array<Record<string, unknown>>;
+    };
+    const file = resolve('tests/browser/example.spec.ts');
+    value.discovered.push({ executionId: `other:test-b:${file}`, file, projectName: 'other', testId: 'test-b' });
+    const phase = await classify({ ...input('playwright', 'initial', 'failed'), evidence: value });
+    expect(phase.fileOutcomes).toContainEqual(expect.objectContaining({ file: 'tests/browser/example.spec.ts', status: 'failed' }));
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.missingExecutionIds).toEqual([`other:test-b:${file}`]);
+  });
+});
diff --git a/tools/gate-playwright-evidence-reporter.mjs b/tools/gate-playwright-evidence-reporter.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..5fe6c87fe0637d8ae6fb2b4a442b58e893ba784b
--- /dev/null
+++ b/tools/gate-playwright-evidence-reporter.mjs
@@ -0,0 +1,117 @@
+import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
+import { dirname, resolve } from 'node:path';
+
+function normalizeError(error) {
+  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null };
+  if (error !== null && typeof error === 'object') {
+    return {
+      name: typeof error.name === 'string' ? error.name : 'Error',
+      message: typeof error.message === 'string' ? error.message : String(error),
+      stack: typeof error.stack === 'string' ? error.stack : null,
+    };
+  }
+  return { name: 'Error', message: String(error), stack: null };
+}
+
+function requiredEnvironment(name) {
+  const value = process.env[name];
+  if (value === undefined || value.length === 0) throw new Error(`${name} is required by the gate evidence reporter.`);
+  return value;
+}
+
+function projectName(test) {
+  const project = typeof test?.parent?.project === 'function' ? test.parent.project() : null;
+  return typeof project?.name === 'string' ? project.name : '';
+}
+
+function identity(test) {
+  const file = resolve(test.location.file);
+  const testId = typeof test.id === 'string' ? test.id : `${file}:${test.location.line}:${test.location.column}`;
+  const project = projectName(test);
+  return {
+    executionId: `${project}:${testId}:${file}`,
+    file,
+    projectName: project,
+    testId,
+  };
+}
+
+export default class GatePlaywrightEvidenceReporter {
+  constructor() {
+    this.path = requiredEnvironment('DND_GATE_EVIDENCE_PATH');
+    this.testEvidence = new Map();
+    this.document = {
+      version: 1,
+      kind: requiredEnvironment('DND_GATE_KIND'),
+      phase: requiredEnvironment('DND_GATE_PHASE'),
+      phaseInvocationId: requiredEnvironment('DND_GATE_PHASE_INVOCATION_ID'),
+      lifecycle: { onBegin: false, onEnd: false, onExit: false },
+      discovered: [],
+      tests: [],
+      globalErrors: [],
+      fullResultStatus: null,
+      fatalReasons: [],
+    };
+  }
+
+  ensureTest(test) {
+    const discovered = identity(test);
+    const existing = this.testEvidence.get(discovered.executionId);
+    if (existing !== undefined) return existing;
+    const created = {
+      ...discovered,
+      status: null,
+      outcome: typeof test.outcome === 'function' ? test.outcome() : null,
+      expectedStatus: typeof test.expectedStatus === 'string' ? test.expectedStatus : null,
+      onTestBeginObserved: false,
+      onTestEndObserved: false,
+      errors: [],
+    };
+    this.testEvidence.set(discovered.executionId, created);
+    return created;
+  }
+
+  onBegin(_config, suite) {
+    this.document.lifecycle.onBegin = true;
+    const tests = typeof suite?.allTests === 'function' ? suite.allTests() : [];
+    this.document.discovered = Array.from(tests, (test) => identity(test))
+      .sort((left, right) => left.executionId.localeCompare(right.executionId));
+    for (const test of tests) this.ensureTest(test);
+  }
+
+  onTestBegin(test) {
+    this.ensureTest(test).onTestBeginObserved = true;
+  }
+
+  onTestEnd(test, result) {
+    const record = this.ensureTest(test);
+    record.onTestEndObserved = true;
+    record.status = typeof result?.status === 'string' ? result.status : null;
+    record.outcome = typeof test.outcome === 'function' ? test.outcome() : record.outcome;
+    record.expectedStatus = typeof test.expectedStatus === 'string' ? test.expectedStatus : record.expectedStatus;
+    record.errors = Array.isArray(result?.errors) ? result.errors.map(normalizeError) : [];
+  }
+
+  onError(error) {
+    this.document.globalErrors.push(normalizeError(error));
+  }
+
+  onEnd(result) {
+    this.document.lifecycle.onEnd = true;
+    this.document.fullResultStatus = typeof result?.status === 'string' ? result.status : null;
+  }
+
+  onExit() {
+    this.document.lifecycle.onExit = true;
+    this.document.tests = [...this.testEvidence.values()]
+      .sort((left, right) => left.executionId.localeCompare(right.executionId));
+    this.write();
+  }
+
+  write() {
+    mkdirSync(dirname(this.path), { recursive: true });
+    const temporary = `${this.path}.${process.pid}.tmp`;
+    writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, 'utf8');
+    renameSync(temporary, this.path);
+  }
+}
diff --git a/tools/gate-playwright.mjs b/tools/gate-playwright.mjs
index 1fbac36a224925745f6554be967e9b150c73ed5b..c467133e26baa84f70c27eeb36b69d466aac39bc
--- a/tools/gate-playwright.mjs
+++ b/tools/gate-playwright.mjs
@@ -1,64 +1,13 @@
 #!/usr/bin/env node
 
-/**
- * Load-tolerant Playwright gate.
- *
- * Usage: `npm run test:gate:browser -- <specs/options>`. Both phases acquire
- * `/tmp/dnd-gate.lock`; retries remain disabled, and only failed spec files get
- * one serial (`--workers=1`) second pass. Use `PLAYWRIGHT_PORT` to select a
- * non-4173 port. The final JSON report path is printed.
- */
-
 import { resolve } from 'node:path';
 import {
+  phaseArtifactPaths,
   printVerdict,
-  reportPath,
-  repositoryPath,
   runLockedPhase,
   writeGateReport,
 } from './gate-runner-lib.mjs';
-
-function resultsFromReporter(reporter) {
-  const byFile = new Map();
-  function visitSuite(suite, inheritedFile) {
-    if (suite === null || typeof suite !== 'object') return;
-    const file = typeof suite.file === 'string' ? suite.file : inheritedFile;
-    if (Array.isArray(suite.specs)) {
-      for (const spec of suite.specs) {
-        if (spec === null || typeof spec !== 'object') continue;
-        const specFile = typeof spec.file === 'string' ? spec.file : file;
-        if (specFile === undefined) continue;
-        const normalized = repositoryPath(specFile);
-        const status = spec.ok === true ? 'passed' : 'failed';
-        if (status === 'failed' || byFile.get(normalized) === undefined) byFile.set(normalized, status);
-      }
-    }
-    if (Array.isArray(suite.suites)) {
-      for (const child of suite.suites) visitSuite(child, file);
-    }
-  }
-  if (reporter !== null && typeof reporter === 'object' && Array.isArray(reporter.suites)) {
-    for (const suite of reporter.suites) visitSuite(suite, undefined);
-  }
-  return [...byFile].map(([file, status]) => ({ file, status })).sort((left, right) => left.file.localeCompare(right.file));
-}
-
-function unique(values) {
-  return [...new Set(values)].sort();
-}
-
-function reporterSucceeded(reporter) {
-  return reporter !== null &&
-    typeof reporter === 'object' &&
-    Array.isArray(reporter.errors) &&
-    reporter.errors.length === 0 &&
-    reporter.stats !== null &&
-    typeof reporter.stats === 'object' &&
-    reporter.stats.unexpected === 0;
-}
-
-const playwrightModule = resolve(process.env.DND_GATE_PLAYWRIGHT_MODULE ?? 'node_modules/@playwright/test/cli.js');
-const passthroughArguments = process.argv.slice(2);
+import { classifyPhase, reduceGateVerdict } from './gate-verdict.mjs';
 
 function withoutControlledOptions(argumentsList, controlledNames) {
   const retained = [];
@@ -95,10 +44,7 @@
 ]);
 
 function retryOptionsFrom(argumentsList) {
-  const uncontrolled = withoutControlledOptions(
-    argumentsList,
-    new Set(['--reporter', '--retries', '--workers']),
-  );
+  const uncontrolled = withoutControlledOptions(argumentsList, new Set(['--reporter', '--retries', '--workers']));
   const retained = [];
   for (let index = 0; index < uncontrolled.length; index += 1) {
     const argument = uncontrolled[index];
@@ -115,71 +61,60 @@
   return retained;
 }
 
-const initialArguments = withoutControlledOptions(
-  passthroughArguments,
-  new Set(['--reporter', '--retries']),
-);
+const playwrightModule = resolve(process.env.DND_GATE_PLAYWRIGHT_MODULE ?? 'node_modules/@playwright/test/cli.js');
+const evidenceReporter = resolve('tools/gate-playwright-evidence-reporter.mjs');
+const passthroughArguments = process.argv.slice(2);
+const initialArguments = withoutControlledOptions(passthroughArguments, new Set(['--reporter', '--retries']));
 const retryOptions = retryOptionsFrom(passthroughArguments);
 
-function playwrightEnvironment(path) {
-  return { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: path };
+function playwrightEnvironment(artifacts) {
+  return { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: artifacts.reporterPath };
 }
 
-const initialReporterPath = reportPath('playwright', 'initial');
-const initial = runLockedPhase({
+const initialArtifacts = phaseArtifactPaths('playwright', 'initial');
+const initialRaw = runLockedPhase({
   kind: 'playwright',
   phase: 'initial',
   executable: process.execPath,
-  arguments: [playwrightModule, 'test', '--reporter=json', '--retries=0', ...initialArguments],
-  reporterPath: initialReporterPath,
-  environment: playwrightEnvironment(initialReporterPath),
+  arguments: [
+    playwrightModule,
+    'test',
+    `--reporter=json,${evidenceReporter}`,
+    '--retries=0',
+    ...initialArguments,
+  ],
+  artifacts: initialArtifacts,
+  environment: playwrightEnvironment(initialArtifacts),
 });
-initial.results = resultsFromReporter(initial.reporter);
-
-const initialFailedFiles = unique(
-  initial.results.filter((result) => result.status === 'failed').map((result) => result.file),
-);
-const initialRunnerFailure = initial.reporterReadError !== null ||
-  (initialFailedFiles.length === 0 && !reporterSucceeded(initial.reporter));
+const initial = classifyPhase({ kind: 'playwright', ...initialRaw, requestedFiles: null });
+const initialFailedFiles = initial.fileOutcomes
+  .filter((outcome) => outcome.status === 'failed')
+  .map((outcome) => outcome.file);
 
 let retry = null;
-let loadFlakes = [];
-let failed = [];
 if (initialFailedFiles.length > 0) {
-  const retryReporterPath = reportPath('playwright', 'retry');
-  retry = runLockedPhase({
+  const retryArtifacts = phaseArtifactPaths('playwright', 'retry');
+  const retryRaw = runLockedPhase({
     kind: 'playwright',
     phase: 'retry',
     executable: process.execPath,
     arguments: [
       playwrightModule,
       'test',
-      '--reporter=json',
+      `--reporter=json,${evidenceReporter}`,
       '--retries=0',
       '--workers=1',
       ...retryOptions,
       ...initialFailedFiles,
     ],
-    reporterPath: retryReporterPath,
-    environment: playwrightEnvironment(retryReporterPath),
+    artifacts: retryArtifacts,
+    environment: playwrightEnvironment(retryArtifacts),
   });
-  retry.results = resultsFromReporter(retry.reporter);
-  const retryStatusByFile = new Map(retry.results.map((result) => [result.file, result.status]));
-  loadFlakes = initialFailedFiles.filter((file) => retryStatusByFile.get(file) === 'passed');
-  failed = initialFailedFiles.filter((file) => retryStatusByFile.get(file) !== 'passed');
-  if (retry.reporterReadError !== null || (failed.length === 0 && !reporterSucceeded(retry.reporter))) {
-    failed.push('<playwright retry runner/report failure>');
-  }
+  retry = classifyPhase({ kind: 'playwright', ...retryRaw, requestedFiles: initialFailedFiles });
 }
-if (initialRunnerFailure) failed.push('<playwright runner/report failure>');
-failed = unique(failed);
 
-const report = {
-  version: 1,
-  kind: 'playwright',
-  phases: { initial, retry },
-  verdict: { loadFlakes, failed },
-};
+const verdict = reduceGateVerdict(initial, retry);
+const report = { version: 2, kind: 'playwright', phases: { initial, retry }, verdict };
 const finalReportPath = writeGateReport('playwright', report);
-printVerdict(loadFlakes, failed, finalReportPath);
-process.exitCode = failed.length === 0 ? 0 : 1;
+printVerdict(verdict, finalReportPath);
+process.exitCode = verdict.status === 'passed' ? 0 : 1;
diff --git a/tools/gate-runner-lib.mjs b/tools/gate-runner-lib.mjs
index c7ce7919f21c429e911530962fc87b5957a81bef..d16ac7ea747af7825fd3b6cee758b34a4fc12d02
--- a/tools/gate-runner-lib.mjs
+++ b/tools/gate-runner-lib.mjs
@@ -1,34 +1,26 @@
 import { spawnSync } from 'node:child_process';
-import {
-  mkdirSync,
-  readFileSync,
-  writeFileSync,
-} from 'node:fs';
+import { randomUUID } from 'node:crypto';
+import { mkdirSync, writeFileSync } from 'node:fs';
 import { loadavg, tmpdir } from 'node:os';
 import { join, resolve } from 'node:path';
 import { performance } from 'node:perf_hooks';
-import { randomUUID } from 'node:crypto';
+import { readJsonArtifact } from './gate-verdict.mjs';
 
 export const GATE_LOCK_PATH = '/tmp/dnd-gate.lock';
 export const GATE_LOCK_WAIT_SECONDS = 7_200;
 
 function lockLauncher(environment) {
   const testModule = environment.DND_GATE_FLOCK_MODULE;
-  if (testModule !== undefined) {
-    return { executable: process.execPath, arguments: [resolve(testModule)] };
-  }
+  if (testModule !== undefined) return { executable: process.execPath, arguments: [resolve(testModule)] };
   return { executable: 'flock', arguments: [] };
 }
 
-function readJson(path) {
-  try {
-    return { value: JSON.parse(readFileSync(path, 'utf8')), error: null };
-  } catch (error) {
-    return {
-      value: null,
-      error: error instanceof Error ? error.message : String(error),
-    };
-  }
+function structuredSpawnError(error) {
+  if (error === undefined) return null;
+  return {
+    code: error !== null && typeof error === 'object' && typeof error.code === 'string' ? error.code : null,
+    message: error instanceof Error ? error.message : String(error),
+  };
 }
 
 export function runLockedPhase({
@@ -36,7 +28,7 @@
   phase,
   executable,
   arguments: commandArguments,
-  reporterPath,
+  artifacts,
   environment = process.env,
 }) {
   const startedAt = new Date().toISOString();
@@ -53,36 +45,50 @@
   ];
   const result = spawnSync(launcher.executable, flockArguments, {
     cwd: process.cwd(),
-    env: { ...environment, DND_GATE_KIND: kind, DND_GATE_PHASE: phase },
+    env: {
+      ...environment,
+      DND_GATE_KIND: kind,
+      DND_GATE_PHASE: phase,
+      DND_GATE_PHASE_INVOCATION_ID: artifacts.phaseInvocationId,
+      DND_GATE_EVIDENCE_PATH: artifacts.evidencePath,
+    },
     stdio: 'inherit',
   });
-  const reporter = readJson(reporterPath);
+  const stock = readJsonArtifact(artifacts.reporterPath);
+  const evidence = readJsonArtifact(artifacts.evidencePath);
   return {
     phase,
     startedAt,
     loadAverage,
     durationMs: Math.round((performance.now() - started) * 100) / 100,
-    exitCode: result.status ?? 1,
+    phaseInvocationId: artifacts.phaseInvocationId,
+    exitCode: result.status,
     signal: result.signal,
     command: {
       executable,
       arguments: commandArguments,
-      lock: {
-        executable: launcher.executable,
-        arguments: flockArguments,
-      },
+      lock: { executable: launcher.executable, arguments: flockArguments },
     },
-    reporterPath,
-    reporter: reporter.value,
-    reporterReadError: reporter.error,
-    spawnError: result.error?.message ?? null,
+    reporterPath: artifacts.reporterPath,
+    evidencePath: artifacts.evidencePath,
+    reporter: stock.value,
+    evidence: evidence.value,
+    stockRead: stock.read,
+    evidenceRead: evidence.read,
+    spawnError: structuredSpawnError(result.error),
   };
 }
 
-export function reportPath(kind, phase) {
+export function phaseArtifactPaths(kind, phase) {
   const directory = process.env.DND_GATE_REPORT_DIR ?? join(tmpdir(), 'dnd-gate-reports');
   mkdirSync(directory, { recursive: true });
-  return join(directory, `${kind}-${phase}-${process.pid}-${randomUUID()}.json`);
+  const phaseInvocationId = randomUUID();
+  const stem = `${kind}-${phase}-${process.pid}-${phaseInvocationId}`;
+  return {
+    phaseInvocationId,
+    reporterPath: join(directory, `${stem}.json`),
+    evidencePath: join(directory, `${stem}.evidence.json`),
+  };
 }
 
 export function writeGateReport(kind, report) {
@@ -99,12 +105,18 @@
   return absolute.startsWith(root) ? absolute.slice(root.length) : absolute;
 }
 
-export function printVerdict(loadFlakes, failed, path) {
-  console.log('\nLOAD FLAKES (passed serially)');
-  if (loadFlakes.length === 0) console.log('  (none)');
-  else for (const file of loadFlakes) console.log(`  ${file}`);
-  console.log('\nFAILED');
-  if (failed.length === 0) console.log('  (none)');
-  else for (const file of failed) console.log(`  ${file}`);
+function printItems(items) {
+  if (items.length === 0) console.log('  (none)');
+  else for (const item of items) console.log(`  ${item}`);
+}
+
+export function printVerdict(verdict, path) {
+  console.log('\nPASSED ON RETRY (cause not inferred)');
+  printItems(verdict.passedOnRetry);
+  console.log('\nFAILED FILES');
+  printItems(verdict.failedFiles);
+  console.log('\nPHASE FAILURES');
+  printItems(verdict.phaseFailures.map((failure) =>
+    `${failure.phase}/${failure.domain}: ${failure.reasons.join(', ')}`));
   console.log(`\nJSON report: ${path}`);
 }
diff --git a/tools/gate-verdict.mjs b/tools/gate-verdict.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..1d7366d3c4de7072db8c6775dfa99769762adda3
--- /dev/null
+++ b/tools/gate-verdict.mjs
@@ -0,0 +1,441 @@
+import { readFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+
+function isRecord(value) {
+  return value !== null && typeof value === 'object' && !Array.isArray(value);
+}
+
+function unique(values) {
+  return [...new Set(values)].sort();
+}
+
+function normalizeFile(path) {
+  const absolute = resolve(path);
+  const root = `${resolve(process.cwd())}/`;
+  return absolute.startsWith(root) ? absolute.slice(root.length) : absolute;
+}
+
+function stringValue(record, key) {
+  return isRecord(record) && typeof record[key] === 'string' ? record[key] : null;
+}
+
+function booleanValue(record, key) {
+  return isRecord(record) && typeof record[key] === 'boolean' ? record[key] : null;
+}
+
+function arrayValue(record, key) {
+  return isRecord(record) && Array.isArray(record[key]) ? record[key] : [];
+}
+
+export function readJsonArtifact(path) {
+  try {
+    return {
+      value: JSON.parse(readFileSync(path, 'utf8')),
+      read: { status: 'readable', error: null },
+    };
+  } catch (error) {
+    const message = error instanceof Error ? error.message : String(error);
+    const code = isRecord(error) && typeof error.code === 'string' ? error.code : null;
+    const status = code === 'ENOENT'
+      ? 'missing'
+      : error instanceof SyntaxError
+        ? 'malformed'
+        : 'unreadable';
+    return { value: null, read: { status, error: message } };
+  }
+}
+
+function artifactReason(prefix, read) {
+  if (read.status === 'readable') return null;
+  return `${prefix}-${read.status}`;
+}
+
+function normalizedError(error) {
+  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null };
+  if (isRecord(error)) {
+    return {
+      name: typeof error.name === 'string' ? error.name : 'Error',
+      message: typeof error.message === 'string' ? error.message : JSON.stringify(error),
+      stack: typeof error.stack === 'string' ? error.stack : null,
+    };
+  }
+  return { name: 'Error', message: String(error), stack: null };
+}
+
+function aggregateFileOutcomes(executions) {
+  const priority = { skipped: 0, passed: 1, unfinished: 2, failed: 3 };
+  const byFile = new Map();
+  for (const execution of executions) {
+    const current = byFile.get(execution.file);
+    if (current === undefined) {
+      byFile.set(execution.file, {
+        file: execution.file,
+        status: execution.status,
+        executionIds: [execution.executionId],
+        reasons: [...execution.reasons],
+      });
+      continue;
+    }
+    current.executionIds.push(execution.executionId);
+    current.reasons.push(...execution.reasons);
+    if (priority[execution.status] > priority[current.status]) current.status = execution.status;
+  }
+  return [...byFile.values()]
+    .map((outcome) => ({
+      ...outcome,
+      executionIds: unique(outcome.executionIds),
+      reasons: unique(outcome.reasons),
+    }))
+    .sort((left, right) => left.file.localeCompare(right.file));
+}
+
+function vitestStock(reporter) {
+  if (!isRecord(reporter) || typeof reporter.success !== 'boolean' || !Array.isArray(reporter.testResults)) return null;
+  const files = [];
+  for (const result of reporter.testResults) {
+    if (!isRecord(result) || typeof result.name !== 'string' || typeof result.status !== 'string' || !Array.isArray(result.assertionResults)) return null;
+    const assertionFailed = result.assertionResults.some((assertion) => isRecord(assertion) && assertion.status === 'failed');
+    files.push({
+      file: normalizeFile(result.name),
+      status: result.status === 'passed' && !assertionFailed ? 'passed' : 'failed',
+    });
+  }
+  return { success: reporter.success, files };
+}
+
+function playwrightStock(reporter) {
+  if (!isRecord(reporter) || !Array.isArray(reporter.suites) || !Array.isArray(reporter.errors) || !isRecord(reporter.stats)) return null;
+  const byFile = new Map();
+  const visit = (suite, inheritedFile) => {
+    if (!isRecord(suite)) return false;
+    const suiteFile = typeof suite.file === 'string' ? suite.file : inheritedFile;
+    if (Array.isArray(suite.specs)) {
+      for (const spec of suite.specs) {
+        if (!isRecord(spec) || typeof spec.ok !== 'boolean') return false;
+        const file = typeof spec.file === 'string' ? spec.file : suiteFile;
+        if (typeof file !== 'string') return false;
+        const normalized = normalizeFile(file);
+        const status = spec.ok ? 'passed' : 'failed';
+        if (status === 'failed' || byFile.get(normalized) === undefined) byFile.set(normalized, status);
+      }
+    }
+    if (Array.isArray(suite.suites)) {
+      for (const child of suite.suites) if (!visit(child, suiteFile)) return false;
+    }
+    return true;
+  };
+  for (const suite of reporter.suites) if (!visit(suite, undefined)) return null;
+  return {
+    success: reporter.errors.length === 0 && reporter.stats.unexpected === 0,
+    files: [...byFile].map(([file, status]) => ({ file, status })).sort((left, right) => left.file.localeCompare(right.file)),
+    errors: reporter.errors.map(normalizedError),
+  };
+}
+
+function validEvidenceEnvelope(evidence) {
+  return isRecord(evidence) &&
+    evidence.version === 1 &&
+    typeof evidence.kind === 'string' &&
+    typeof evidence.phase === 'string' &&
+    typeof evidence.phaseInvocationId === 'string';
+}
+
+function vitestEvidence(evidence, reporterReasons) {
+  if (!isRecord(evidence) || !isRecord(evidence.lifecycle) ||
+    !Array.isArray(evidence.specifications) || !Array.isArray(evidence.modules) ||
+    !Array.isArray(evidence.globalErrors) || !Array.isArray(evidence.fatalReasons) ||
+    typeof evidence.passWithNoTests !== 'boolean') return null;
+  const scheduled = [];
+  for (const item of evidence.specifications) {
+    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string') return null;
+    scheduled.push({ executionId: item.executionId, file: normalizeFile(item.file) });
+  }
+  const executions = [];
+  const terminalIds = [];
+  for (const item of evidence.modules) {
+    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string' || typeof item.state !== 'string' || !Array.isArray(item.errors)) return null;
+    const errors = item.errors.map(normalizedError);
+    let status;
+    const reasons = [];
+    if (item.state === 'failed' || errors.length > 0) {
+      status = 'failed';
+      reasons.push('test-failed');
+      terminalIds.push(item.executionId);
+    } else if (item.state === 'passed') {
+      status = 'passed';
+      terminalIds.push(item.executionId);
+    } else if (item.state === 'skipped') {
+      status = 'skipped';
+      terminalIds.push(item.executionId);
+    } else if (item.state === 'queued' || item.state === 'pending') {
+      status = 'unfinished';
+      reasons.push('execution-unfinished');
+      reporterReasons.push('execution-unfinished');
+    } else {
+      status = 'unfinished';
+      reasons.push('invalid-module-state');
+      reporterReasons.push('runner-invalid-terminal-state');
+    }
+    executions.push({ executionId: item.executionId, file: normalizeFile(item.file), status, reasons });
+  }
+  const globalErrors = evidence.globalErrors.map(normalizedError);
+  if (globalErrors.length > 0) reporterReasons.push('runner-global-error');
+  if (evidence.terminalReason === 'interrupted') reporterReasons.push('runner-interrupted');
+  else if (!['passed', 'failed'].includes(evidence.terminalReason)) reporterReasons.push('runner-invalid-terminal-state');
+  if (evidence.terminalReason === 'failed' &&
+    !executions.some((item) => item.status === 'failed') && globalErrors.length === 0) {
+    reporterReasons.push('runner-unexplained-failure');
+  }
+  if (evidence.terminalReason === 'passed' && executions.some((item) => item.status === 'failed')) {
+    reporterReasons.push('runner-evidence-inconsistent');
+  }
+  if (evidence.processTimeoutObserved === true || evidence.fatalReasons.includes('vitest-process-timeout')) {
+    reporterReasons.push('vitest-process-timeout');
+  }
+  if (evidence.lifecycle.onTestRunEnd !== true) reporterReasons.push('terminal-callback-missing');
+  if (scheduled.length === 0 && !(evidence.passWithNoTests === true && evidence.terminalReason === 'passed')) {
+    reporterReasons.push('empty-run-not-allowed');
+  }
+  return {
+    scheduled,
+    executions,
+    terminalIds,
+    runStatus: typeof evidence.terminalReason === 'string' ? evidence.terminalReason : null,
+    globalErrors,
+    terminalCallbackObserved: evidence.lifecycle.onTestRunEnd === true,
+    processTimeoutObserved: evidence.processTimeoutObserved === true,
+  };
+}
+
+function playwrightEvidence(evidence, reporterReasons) {
+  if (!isRecord(evidence) || !isRecord(evidence.lifecycle) ||
+    !Array.isArray(evidence.discovered) || !Array.isArray(evidence.tests) ||
+    !Array.isArray(evidence.globalErrors) || !Array.isArray(evidence.fatalReasons)) return null;
+  const scheduled = [];
+  for (const item of evidence.discovered) {
+    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string') return null;
+    scheduled.push({ executionId: item.executionId, file: normalizeFile(item.file) });
+  }
+  const executions = [];
+  const terminalIds = [];
+  for (const item of evidence.tests) {
+    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string' ||
+      typeof item.onTestBeginObserved !== 'boolean' || typeof item.onTestEndObserved !== 'boolean') return null;
+    let status;
+    const reasons = [];
+    const ended = item.onTestEndObserved === true;
+    if (!ended || item.status === 'interrupted') {
+      status = 'unfinished';
+      reasons.push('execution-unfinished');
+      reporterReasons.push('execution-unfinished');
+    } else if (item.status === 'skipped' && item.expectedStatus === 'skipped') {
+      status = 'skipped';
+      terminalIds.push(item.executionId);
+    } else if (item.status === 'skipped') {
+      status = 'unfinished';
+      reasons.push('synthesized-nonexecution');
+      reporterReasons.push('execution-unfinished');
+    } else if (item.outcome === 'flaky') {
+      status = 'passed';
+      terminalIds.push(item.executionId);
+    } else if (item.outcome === 'unexpected' || item.status === 'timedOut') {
+      status = 'failed';
+      reasons.push(item.status === 'timedOut' ? 'test-timed-out' : 'test-failed');
+      terminalIds.push(item.executionId);
+    } else if (item.status === 'failed' && item.outcome === 'expected') {
+      status = 'passed';
+      terminalIds.push(item.executionId);
+    } else if (item.status === 'passed' && item.outcome === 'expected') {
+      status = 'passed';
+      terminalIds.push(item.executionId);
+    } else {
+      status = 'unfinished';
+      reasons.push('invalid-test-state');
+      reporterReasons.push('runner-invalid-terminal-state');
+    }
+    executions.push({ executionId: item.executionId, file: normalizeFile(item.file), status, reasons });
+  }
+  const globalErrors = evidence.globalErrors.map(normalizedError);
+  if (globalErrors.length > 0) reporterReasons.push('runner-global-error');
+  if (evidence.fullResultStatus === 'timedout') reporterReasons.push('runner-global-timeout');
+  else if (evidence.fullResultStatus === 'interrupted') reporterReasons.push('runner-interrupted');
+  else if (!['passed', 'failed'].includes(evidence.fullResultStatus)) reporterReasons.push('runner-invalid-terminal-state');
+  if (evidence.fullResultStatus === 'failed' &&
+    !executions.some((item) => item.status === 'failed') && globalErrors.length === 0) {
+    reporterReasons.push('runner-unexplained-failure');
+  }
+  if (evidence.fullResultStatus === 'passed' && executions.some((item) => item.status === 'failed')) {
+    reporterReasons.push('runner-evidence-inconsistent');
+  }
+  if (evidence.lifecycle.onExit !== true) reporterReasons.push('terminal-callback-missing');
+  return {
+    scheduled,
+    executions,
+    terminalIds,
+    runStatus: typeof evidence.fullResultStatus === 'string' ? evidence.fullResultStatus : null,
+    globalErrors,
+    terminalCallbackObserved: evidence.lifecycle.onExit === true,
+    processTimeoutObserved: false,
+  };
+}
+
+function crossCheck(stock, normalizedEvidence, reporterReasons) {
+  if (stock === null || normalizedEvidence === null) return;
+  const outcomes = aggregateFileOutcomes(normalizedEvidence.executions);
+  const evidenceHasFailure = outcomes.some((outcome) => outcome.status === 'failed' || outcome.status === 'unfinished');
+  if ((stock.success === true && (evidenceHasFailure ||
+    (normalizedEvidence.runStatus === 'failed' && normalizedEvidence.globalErrors.length === 0))) ||
+    (stock.success === false && !evidenceHasFailure && normalizedEvidence.runStatus === 'passed' && normalizedEvidence.globalErrors.length === 0)) {
+    reporterReasons.push('stock-evidence-mismatch');
+  }
+  const stockByFile = new Map(stock.files.map((file) => [file.file, file.status]));
+  const evidenceFiles = outcomes.map((outcome) => outcome.file);
+  if (JSON.stringify(unique(stock.files.map((file) => file.file))) !== JSON.stringify(unique(evidenceFiles))) {
+    reporterReasons.push('stock-evidence-mismatch');
+    return;
+  }
+  for (const outcome of outcomes) {
+    const stockStatus = stockByFile.get(outcome.file);
+    if ((outcome.status === 'failed' && stockStatus !== 'failed') ||
+      ((outcome.status === 'passed' || outcome.status === 'skipped') && stockStatus !== 'passed')) {
+      reporterReasons.push('stock-evidence-mismatch');
+    }
+  }
+}
+
+export function classifyPhase(input) {
+  const reporterReasons = [];
+  const stockReason = artifactReason('stock-report', input.stockRead);
+  if (stockReason !== null) reporterReasons.push(stockReason);
+  const evidenceReason = artifactReason('evidence-sidecar', input.evidenceRead);
+  if (evidenceReason !== null) reporterReasons.push(evidenceReason);
+
+  let stock = null;
+  if (input.stockRead.status === 'readable') {
+    stock = input.kind === 'vitest' ? vitestStock(input.reporter) : playwrightStock(input.reporter);
+    if (stock === null) reporterReasons.push('stock-report-malformed');
+  }
+
+  let native = null;
+  if (input.evidenceRead.status === 'readable') {
+    if (!validEvidenceEnvelope(input.evidence)) {
+      reporterReasons.push('evidence-sidecar-malformed');
+    } else {
+      const provenanceMatches = input.evidence.phaseInvocationId === input.phaseInvocationId &&
+        input.evidence.kind === input.kind && input.evidence.phase === input.phase;
+      if (input.evidence.phaseInvocationId !== input.phaseInvocationId) reporterReasons.push('evidence-invocation-mismatch');
+      if (input.evidence.kind !== input.kind) reporterReasons.push('evidence-kind-mismatch');
+      if (input.evidence.phase !== input.phase) reporterReasons.push('evidence-phase-mismatch');
+      if (provenanceMatches) {
+        native = input.kind === 'vitest'
+          ? vitestEvidence(input.evidence, reporterReasons)
+          : playwrightEvidence(input.evidence, reporterReasons);
+        if (native === null) reporterReasons.push('evidence-sidecar-malformed');
+      }
+    }
+  }
+
+  if (input.kind === 'playwright' && stock?.errors?.length > 0) reporterReasons.push('runner-global-error');
+  crossCheck(stock, native, reporterReasons);
+
+  const scheduledExecutionIds = unique(native?.scheduled.map((item) => item.executionId) ?? []);
+  const reportedExecutionIds = unique(native?.terminalIds ?? []);
+  const scheduledFiles = unique(native?.scheduled.map((item) => item.file) ?? []);
+  const evidenceRequestedFiles = scheduledFiles;
+  const requestedFiles = input.requestedFiles === null || input.requestedFiles === undefined
+    ? evidenceRequestedFiles
+    : unique(input.requestedFiles.map(normalizeFile));
+  const reportedFiles = unique((native?.executions ?? [])
+    .filter((item) => native.terminalIds.includes(item.executionId))
+    .map((item) => item.file));
+  const missingExecutionIds = scheduledExecutionIds.filter((id) => !reportedExecutionIds.includes(id));
+  const unexpectedExecutionIds = reportedExecutionIds.filter((id) => !scheduledExecutionIds.includes(id));
+  let discoveryStatus = 'complete';
+  if (native === null) discoveryStatus = 'uncertified';
+  else if (missingExecutionIds.length > 0 || unexpectedExecutionIds.length > 0 ||
+    JSON.stringify(requestedFiles) !== JSON.stringify(scheduledFiles)) discoveryStatus = 'failed';
+
+  const executions = native?.executions ?? [];
+  const existingIds = new Set(executions.map((item) => item.executionId));
+  for (const item of native?.scheduled ?? []) {
+    if (!existingIds.has(item.executionId)) {
+      executions.push({ executionId: item.executionId, file: item.file, status: 'unfinished', reasons: ['execution-unfinished'] });
+      reporterReasons.push('execution-unfinished');
+    }
+  }
+  const fileOutcomes = aggregateFileOutcomes(executions);
+  const attributableFailures = fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);
+
+  const processReasons = [];
+  if (input.spawnError !== null) processReasons.push(`spawn-error-${input.spawnError.code ?? 'unknown'}`);
+  if (input.signal !== null) processReasons.push(`process-signal-${input.signal}`);
+  if (input.exitCode === null) processReasons.push('process-exit-missing');
+  else if (input.exitCode !== 0 && !(input.exitCode === 1 && attributableFailures.length > 0)) {
+    processReasons.push(`process-exit-${input.exitCode}`);
+  }
+  const processStatus = processReasons.length > 0
+    ? 'failed'
+    : input.exitCode === 1 && attributableFailures.length > 0
+      ? 'ordinary-file-failure'
+      : 'passed';
+
+  return {
+    ...input,
+    process: {
+      status: processStatus,
+      exitCode: input.exitCode,
+      signal: input.signal,
+      spawnError: input.spawnError,
+      reasons: unique(processReasons),
+    },
+    reporterOutcome: {
+      status: reporterReasons.length === 0 ? 'passed' : 'failed',
+      runStatus: native?.runStatus ?? null,
+      success: stock?.success ?? null,
+      terminalCallbackObserved: native?.terminalCallbackObserved ?? false,
+      processTimeoutObserved: native?.processTimeoutObserved ?? false,
+      globalErrors: native?.globalErrors ?? [],
+      reasons: unique(reporterReasons),
+    },
+    discovery: {
+      status: discoveryStatus,
+      requestedExecutionIds: scheduledExecutionIds,
+      scheduledExecutionIds,
+      reportedExecutionIds,
+      requestedFiles,
+      reportedFiles,
+      missingExecutionIds,
+      unexpectedExecutionIds,
+    },
+    fileOutcomes,
+  };
+}
+
+function phaseFailures(phase) {
+  const failures = [];
+  if (phase.process.status === 'failed') failures.push({ phase: phase.phase, domain: 'process', reasons: phase.process.reasons });
+  if (phase.reporterOutcome.status === 'failed') failures.push({ phase: phase.phase, domain: 'reporter', reasons: phase.reporterOutcome.reasons });
+  if (phase.discovery.status !== 'complete') {
+    const reasons = phase.discovery.status === 'uncertified'
+      ? ['discovery-uncertified']
+      : ['discovery-mismatch'];
+    failures.push({ phase: phase.phase, domain: 'discovery', reasons });
+  }
+  return failures;
+}
+
+export function reduceGateVerdict(initial, retry) {
+  const initialFailed = initial.fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);
+  const retryPassed = retry === null
+    ? []
+    : retry.fileOutcomes.filter((outcome) => outcome.status === 'passed').map((outcome) => outcome.file);
+  const passedOnRetry = unique(initialFailed.filter((file) => retryPassed.includes(file)));
+  const failedFiles = unique(initialFailed.filter((file) => !passedOnRetry.includes(file)));
+  const failures = [...phaseFailures(initial), ...(retry === null ? [] : phaseFailures(retry))];
+  return {
+    status: failedFiles.length === 0 && failures.length === 0 ? 'passed' : 'failed',
+    passedOnRetry,
+    failedFiles,
+    phaseFailures: failures,
+  };
+}
diff --git a/tools/gate-vitest-evidence-reporter.mjs b/tools/gate-vitest-evidence-reporter.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..1875cb43238d9a70a0e4530cc142eac5b28c94d4
--- /dev/null
+++ b/tools/gate-vitest-evidence-reporter.mjs
@@ -0,0 +1,110 @@
+import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
+import { dirname, resolve } from 'node:path';
+
+function normalizeError(error) {
+  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null };
+  if (error !== null && typeof error === 'object') {
+    return {
+      name: typeof error.name === 'string' ? error.name : 'Error',
+      message: typeof error.message === 'string' ? error.message : String(error),
+      stack: typeof error.stack === 'string' ? error.stack : null,
+    };
+  }
+  return { name: 'Error', message: String(error), stack: null };
+}
+
+function projectName(project) {
+  return typeof project?.name === 'string' ? project.name : '';
+}
+
+function projectHash(project) {
+  return typeof project?.hash === 'string' ? project.hash : projectName(project);
+}
+
+function execution(specification) {
+  const file = resolve(specification.moduleId);
+  const taskId = typeof specification.taskId === 'string' ? specification.taskId : file;
+  return {
+    executionId: `${projectHash(specification.project)}:${taskId}:${file}`,
+    file,
+    projectName: projectName(specification.project),
+    taskId,
+  };
+}
+
+function moduleEvidence(module) {
+  const file = resolve(module.moduleId);
+  const taskId = typeof module.id === 'string' ? module.id : file;
+  const state = typeof module.state === 'function' ? module.state() : 'pending';
+  const errors = typeof module.errors === 'function' ? module.errors() : [];
+  return {
+    executionId: `${projectHash(module.project)}:${taskId}:${file}`,
+    file,
+    projectName: projectName(module.project),
+    state,
+    errors: Array.isArray(errors) ? errors.map(normalizeError) : [],
+  };
+}
+
+function requiredEnvironment(name) {
+  const value = process.env[name];
+  if (value === undefined || value.length === 0) throw new Error(`${name} is required by the gate evidence reporter.`);
+  return value;
+}
+
+export default class GateVitestEvidenceReporter {
+  constructor() {
+    this.path = requiredEnvironment('DND_GATE_EVIDENCE_PATH');
+    this.document = {
+      version: 1,
+      kind: requiredEnvironment('DND_GATE_KIND'),
+      phase: requiredEnvironment('DND_GATE_PHASE'),
+      phaseInvocationId: requiredEnvironment('DND_GATE_PHASE_INVOCATION_ID'),
+      lifecycle: { onInit: false, onTestRunStart: false, onTestRunEnd: false },
+      passWithNoTests: false,
+      specifications: [],
+      modules: [],
+      globalErrors: [],
+      terminalReason: null,
+      processTimeoutObserved: false,
+      fatalReasons: [],
+    };
+  }
+
+  onInit(vitest) {
+    this.document.lifecycle.onInit = true;
+    this.document.passWithNoTests = vitest?.config?.passWithNoTests === true;
+  }
+
+  onTestRunStart(specifications) {
+    this.document.lifecycle.onTestRunStart = true;
+    this.document.specifications = Array.isArray(specifications)
+      ? specifications.map(execution).sort((left, right) => left.executionId.localeCompare(right.executionId))
+      : [];
+  }
+
+  onTestRunEnd(modules, globalErrors, reason) {
+    this.document.lifecycle.onTestRunEnd = true;
+    this.document.modules = Array.isArray(modules)
+      ? modules.map(moduleEvidence).sort((left, right) => left.executionId.localeCompare(right.executionId))
+      : [];
+    this.document.globalErrors = Array.isArray(globalErrors) ? globalErrors.map(normalizeError) : [];
+    this.document.terminalReason = typeof reason === 'string' ? reason : null;
+    this.write();
+  }
+
+  onProcessTimeout() {
+    this.document.processTimeoutObserved = true;
+    if (!this.document.fatalReasons.includes('vitest-process-timeout')) {
+      this.document.fatalReasons.push('vitest-process-timeout');
+    }
+    this.write();
+  }
+
+  write() {
+    mkdirSync(dirname(this.path), { recursive: true });
+    const temporary = `${this.path}.${process.pid}.tmp`;
+    writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, 'utf8');
+    renameSync(temporary, this.path);
+  }
+}
diff --git a/tools/gate-vitest.mjs b/tools/gate-vitest.mjs
index c64504ff0839f0d09b45d84001e2af90177a3ae0..9e36c964c28fa9928c2ba237f30dcf150c8f9aac
--- a/tools/gate-vitest.mjs
+++ b/tools/gate-vitest.mjs
@@ -1,45 +1,110 @@
 #!/usr/bin/env node
 
-/**
- * Load-tolerant Vitest gate.
- *
- * Usage: `npm run test:gate`. The complete first pass and the one permitted
- * serial retry both acquire `/tmp/dnd-gate.lock`. JSON reporters are retained
- * in `/tmp/dnd-gate-reports` (or `DND_GATE_REPORT_DIR`) and the printed final
- * report distinguishes load flakes from files that failed both attempts.
- */
-
 import { resolve } from 'node:path';
 import {
+  phaseArtifactPaths,
   printVerdict,
-  reportPath,
-  repositoryPath,
   runLockedPhase,
   writeGateReport,
 } from './gate-runner-lib.mjs';
+import { classifyPhase, reduceGateVerdict } from './gate-verdict.mjs';
 
-function resultsFromReporter(reporter) {
-  if (reporter === null || typeof reporter !== 'object' || !Array.isArray(reporter.testResults)) return [];
-  return reporter.testResults.flatMap((result) => {
-    if (result === null || typeof result !== 'object' || typeof result.name !== 'string') return [];
-    const assertions = Array.isArray(result.assertionResults) ? result.assertionResults : [];
-    const assertionFailed = assertions.some((assertion) =>
-      assertion !== null && typeof assertion === 'object' && assertion.status === 'failed');
-    return [{
-      file: repositoryPath(result.name),
-      status: result.status === 'passed' && !assertionFailed ? 'passed' : 'failed',
-    }];
-  });
+const VALUE_OPTIONS = new Set([
+  '-r', '--root', '-c', '--config', '-u', '--update', '-t', '--testNamePattern',
+  '--dir', '--api', '--silent', '--mode', '--browser', '--browser.name',
+  '--browser.api', '--browser.api.port', '--browser.api.host', '--browser.connectTimeout',
+  '--browser.trace', '--browser.locators', '--pool', '--execArgv', '--vmMemoryLimit',
+  '--environment', '--shard', '--changed', '--sequence', '--sequence.seed',
+  '--sequence.hooks', '--sequence.setupFiles', '--inspect', '--inspectBrk',
+  '--testTimeout', '--hookTimeout', '--bail', '--retry', '--retry.count',
+  '--retry.delay', '--retry.condition', '--diff', '--exclude', '--project',
+  '--slowTestThreshold', '--teardownTimeout', '--maxConcurrency', '--attachmentsDir',
+  '--configLoader', '--mergeReports', '--listTags', '--tagsFilter', '--experimental',
+  '--coverage.provider', '--coverage.include', '--coverage.exclude',
+  '--coverage.reportsDirectory', '--coverage.reporter', '--coverage.thresholds.autoUpdate',
+  '--coverage.thresholds.lines', '--coverage.thresholds.functions',
+  '--coverage.thresholds.branches', '--coverage.thresholds.statements',
+  '--coverage.ignoreClassMethods', '--coverage.processingConcurrency',
+  '--coverage.customProviderModule', '--coverage.watermarks.statements',
+  '--coverage.watermarks.lines', '--coverage.watermarks.branches',
+  '--coverage.watermarks.functions', '--coverage.changed', '--coverage.htmlDir',
+  '--typecheck.checker', '--typecheck.tsconfig', '--typecheck.spawnTimeout',
+  '--expect', '--expect.poll.interval', '--expect.poll.timeout',
+  '--experimental.importDurations.print', '--experimental.importDurations.limit',
+  '--experimental.importDurations.thresholds.warn', '--experimental.importDurations.thresholds.danger',
+  '--experimental.vcsProvider',
+]);
+
+function splitTail(argumentsList) {
+  const delimiter = argumentsList.indexOf('--');
+  return delimiter === -1
+    ? { head: argumentsList, tail: [] }
+    : { head: argumentsList.slice(0, delimiter), tail: argumentsList.slice(delimiter) };
 }
 
-function unique(values) {
-  return [...new Set(values)].sort();
+function controlledOption(argument) {
+  return argument === '--reporter' || argument.startsWith('--reporter=') ||
+    argument === '--outputFile' || argument.startsWith('--outputFile=') || argument.startsWith('--outputFile.') ||
+    argument === '--fileParallelism' || argument.startsWith('--fileParallelism=') ||
+    argument === '--no-file-parallelism' ||
+    argument === '--maxWorkers' || argument.startsWith('--maxWorkers=');
 }
 
+function controlledOptionTakesValue(argument) {
+  const name = optionName(argument);
+  return name === '--reporter' || name === '--outputFile' || name.startsWith('--outputFile.') ||
+    name === '--maxWorkers' || name === '--fileParallelism';
+}
+
+function optionName(argument) {
+  const equals = argument.indexOf('=');
+  return equals === -1 ? argument : argument.slice(0, equals);
+}
+
+function initialArgumentsFrom(argumentsList) {
+  const { head, tail } = splitTail(argumentsList);
+  const retained = [];
+  for (let index = 0; index < head.length; index += 1) {
+    const argument = head[index];
+    if (!controlledOption(argument)) {
+      retained.push(argument);
+      continue;
+    }
+    if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
+      head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
+  }
+  return [...retained, ...tail];
+}
+
+export function retainedVitestRetryTokens(argumentsList) {
+  const { head, tail } = splitTail(argumentsList);
+  const retained = [];
+  for (let index = 0; index < head.length; index += 1) {
+    const argument = head[index];
+    if (controlledOption(argument)) {
+      if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
+        head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
+      continue;
+    }
+    if (!argument.startsWith('-')) continue;
+    retained.push(argument);
+    const name = optionName(argument);
+    if (!argument.includes('=') && VALUE_OPTIONS.has(name)) {
+      const value = head[index + 1];
+      if (value !== undefined && !value.startsWith('-')) {
+        retained.push(value);
+        index += 1;
+      }
+    }
+  }
+  return { retained, tail };
+}
+
 const vitestModule = resolve(process.env.DND_GATE_VITEST_MODULE ?? 'node_modules/vitest/vitest.mjs');
+const evidenceReporter = resolve('tools/gate-vitest-evidence-reporter.mjs');
 const passthroughArguments = process.argv.slice(2);
-const initialReporterPath = reportPath('vitest', 'initial');
-const initial = runLockedPhase({
+const initialArtifacts = phaseArtifactPaths('vitest', 'initial');
+const initialRaw = runLockedPhase({
   kind: 'vitest',
   phase: 'initial',
   executable: process.execPath,
@@ -49,58 +114,46 @@
     '--configLoader',
     'runner',
     '--reporter=json',
-    `--outputFile.json=${initialReporterPath}`,
-    ...passthroughArguments,
+    `--reporter=${evidenceReporter}`,
+    `--outputFile.json=${initialArtifacts.reporterPath}`,
+    ...initialArgumentsFrom(passthroughArguments),
   ],
-  reporterPath: initialReporterPath,
+  artifacts: initialArtifacts,
 });
-initial.results = resultsFromReporter(initial.reporter);
+const initial = classifyPhase({ kind: 'vitest', ...initialRaw, requestedFiles: null });
+const initialFailedFiles = initial.fileOutcomes
+  .filter((outcome) => outcome.status === 'failed')
+  .map((outcome) => outcome.file);
 
-const initialFailedFiles = unique(
-  initial.results.filter((result) => result.status === 'failed').map((result) => result.file),
-);
-const initialRunnerFailure = initial.reporterReadError !== null ||
-  (initialFailedFiles.length === 0 && initial.reporter?.success !== true);
-
 let retry = null;
-let loadFlakes = [];
-let failed = [];
 if (initialFailedFiles.length > 0) {
-  const retryReporterPath = reportPath('vitest', 'retry');
-  retry = runLockedPhase({
+  const retryArtifacts = phaseArtifactPaths('vitest', 'retry');
+  const parsed = retainedVitestRetryTokens(passthroughArguments);
+  const retryRaw = runLockedPhase({
     kind: 'vitest',
     phase: 'retry',
     executable: process.execPath,
     arguments: [
       vitestModule,
       'run',
+      ...parsed.retained,
       '--configLoader',
       'runner',
       '--reporter=json',
-      `--outputFile.json=${retryReporterPath}`,
+      `--reporter=${evidenceReporter}`,
+      `--outputFile.json=${retryArtifacts.reporterPath}`,
       '--no-file-parallelism',
       '--maxWorkers=1',
       ...initialFailedFiles,
+      ...parsed.tail,
     ],
-    reporterPath: retryReporterPath,
+    artifacts: retryArtifacts,
   });
-  retry.results = resultsFromReporter(retry.reporter);
-  const retryStatusByFile = new Map(retry.results.map((result) => [result.file, result.status]));
-  loadFlakes = initialFailedFiles.filter((file) => retryStatusByFile.get(file) === 'passed');
-  failed = initialFailedFiles.filter((file) => retryStatusByFile.get(file) !== 'passed');
-  if (retry.reporterReadError !== null || (failed.length === 0 && retry.reporter?.success !== true)) {
-    failed.push('<vitest retry runner/report failure>');
-  }
+  retry = classifyPhase({ kind: 'vitest', ...retryRaw, requestedFiles: initialFailedFiles });
 }
-if (initialRunnerFailure) failed.push('<vitest runner/report failure>');
-failed = unique(failed);
 
-const report = {
-  version: 1,
-  kind: 'vitest',
-  phases: { initial, retry },
-  verdict: { loadFlakes, failed },
-};
+const verdict = reduceGateVerdict(initial, retry);
+const report = { version: 2, kind: 'vitest', phases: { initial, retry }, verdict };
 const finalReportPath = writeGateReport('vitest', report);
-printVerdict(loadFlakes, failed, finalReportPath);
-process.exitCode = failed.length === 0 ? 0 : 1;
+printVerdict(verdict, finalReportPath);
+process.exitCode = verdict.status === 'passed' ? 0 : 1;
