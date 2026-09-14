# M-1 fix round 1 lane report (gpt-5.6-sol, session 01a09d59-d5ae-7a03-af11-36517e912213), harvested 2026-09-13 22:19

Implementation and focused verification succeeded, but the mandated bounded Playwright assertion is internally contradictory.

- RED: 3 files, 70 tests — 18 failed, 52 passed; exit 1.
- GREEN: 3 files, 70 tests — 70 passed; exit 0.
- `npx tsc -b --force`: initial fixture-typing correction exit 2; rerun exit 0.
- `sg scan`: exit 0.
- Six `node --check` commands: exit 0.
- Bounded Playwright command: expected exit 1.
- Stock inventory assertion passed: 1 file, 3 tests.
- Evidence assertion passed: all lifecycle callbacks observed; expected skip, timeout, and synthesized nonexecution present.

Actual classifier result:

```json
{
  "process": "ordinary-file-failure",
  "reporterOutcome": {
    "status": "failed",
    "reasons": ["execution-unfinished"]
  },
  "discovery": {
    "status": "failed",
    "missingExecutionIds": 1,
    "duplicateExecutionIds": [],
    "mismatchedExecutionIds": [],
    "fileSetMismatch": false
  },
  "fileOutcome": {
    "status": "failed",
    "reasons": ["synthesized-nonexecution", "test-timed-out"]
  }
}
```

This confirms F1 is repaired—there is no `stock-evidence-mismatch`—but cannot simultaneously satisfy the requested `status:"passed"`, discovery `complete`, and zero reporter reasons. Doing so would violate accepted F6, which explicitly requires synthesized nonexecution to fail at the verdict boundary, and would weaken the authorized three-test fixture.

Per the required ordering, I stopped before real proofs 1–3, argv probes, and final greps. The last `git status --short` contained only these allowed files:

```text
M tests/fixtures/fake-gate-command.mjs
M tests/unit/tools/gate-evidence-reporters.test.ts
M tests/unit/tools/gate-runners.test.ts
M tests/unit/tools/gate-verdict.test.ts
M tools/gate-playwright-evidence-reporter.mjs
M tools/gate-verdict.mjs
M tools/gate-vitest.mjs
```

Frozen contract hash remained `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

BLOCKED: the required bounded Playwright passing classifier assertion contradicts the fixture’s mandatory synthesized-nonexecution failure and F6 verdict semantics.
diff --git a/tests/fixtures/fake-gate-command.mjs b/tests/fixtures/fake-gate-command.mjs
index 68cf1b50e522bb9f1ea8b88b43e1ec871e55f588..1c5b1dd733237c3d82fce18004e706383b75acae
--- a/tests/fixtures/fake-gate-command.mjs
+++ b/tests/fixtures/fake-gate-command.mjs
@@ -1,5 +1,5 @@
 import { appendFileSync, writeFileSync } from 'node:fs';
-import { resolve } from 'node:path';
+import { relative, resolve } from 'node:path';
 
 const phase = process.env.DND_GATE_PHASE;
 const kind = process.env.DND_GATE_KIND;
@@ -93,11 +93,12 @@
   const outputPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;
   if (outputPath === undefined) throw new Error('Fake Playwright command received no JSON output path.');
   if (scenario !== 'stock_missing') {
+    const rootDir = resolve('tests/browser');
     const specs = selectedFiles.map((file) => {
       const status = resultFor(file);
       return {
         title: `stub ${file}`,
-        file: resolve(file),
+        file: relative(rootDir, resolve(file)),
         ok: status === 'passed',
         tests: [{
           projectName: 'unit',
@@ -109,6 +110,7 @@
     });
     const failures = specs.filter((spec) => !spec.ok).length;
     writeFileSync(outputPath, JSON.stringify({
+      config: { rootDir },
       suites: [{ title: 'stub suite', specs }],
       errors: globalErrors,
       stats: {
@@ -163,5 +165,6 @@
 if (scenario === 'signal' && phase === 'initial') process.kill(process.pid, 'SIGTERM');
 if (scenario === 'exit2' && phase === 'initial') process.exitCode = 2;
 else if (scenario === 'late_exit1' && phase === 'initial') process.exitCode = 1;
+else if (scenario === 'stock_missing' && phase === 'initial') process.exitCode = 0;
 else if (scenario === 'sidecar_missing') process.exitCode = 0;
 else process.exitCode = selectedFiles.some((file) => resultFor(file) === 'failed') ? 1 : 0;
diff --git a/tests/unit/tools/gate-evidence-reporters.test.ts b/tests/unit/tools/gate-evidence-reporters.test.ts
index 5a3899e8cce821c2f57310f25e2a7bdf8131209c..0cf44dcd488d5303e215868261b2155b2b473a01
--- a/tests/unit/tools/gate-evidence-reporters.test.ts
+++ b/tests/unit/tools/gate-evidence-reporters.test.ts
@@ -1,7 +1,17 @@
 import { spawnSync } from 'node:child_process';
 import { tmpdir } from 'node:os';
-import { join, resolve } from 'node:path';
+import { join, relative, resolve } from 'node:path';
 import { describe, expect, it, vi } from 'vitest';
+import type { Reporter as VitestReporter } from 'vitest/reporters';
+import type {
+  FullConfig,
+  FullResult,
+  Reporter as PlaywrightReporter,
+  Suite,
+  TestCase,
+  TestError,
+  TestResult,
+} from '@playwright/test/reporter';
 import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';
 
 interface NormalizedError {
@@ -10,6 +20,9 @@
 }
 
 interface VitestEvidence {
+  readonly version: 1;
+  readonly kind: 'vitest';
+  readonly phase: 'initial' | 'retry';
   readonly phaseInvocationId: string;
   readonly passWithNoTests: boolean;
   readonly terminalReason: string | null;
@@ -27,15 +40,19 @@
 }
 
 interface PlaywrightEvidence {
+  readonly version: 1;
+  readonly kind: 'playwright';
+  readonly phase: 'initial' | 'retry';
   readonly phaseInvocationId: string;
   readonly fullResultStatus: string | null;
   readonly globalErrors: readonly NormalizedError[];
   readonly discovered: readonly { readonly executionId: string; readonly file: string }[];
   readonly tests: readonly {
     readonly executionId: string;
-    readonly status: string;
-    readonly outcome: string;
-    readonly expectedStatus: string;
+    readonly file: string;
+    readonly status: string | null;
+    readonly outcome: string | null;
+    readonly expectedStatus: string | null;
     readonly onTestBeginObserved: boolean;
     readonly onTestEndObserved: boolean;
   }[];
@@ -43,25 +60,64 @@
 }
 
 interface VitestReporterModule {
-  readonly default: new () => {
-    onInit(value: unknown): void;
-    onTestRunStart(value: readonly unknown[]): void;
-    onTestRunEnd(modules: readonly unknown[], errors: readonly unknown[], reason: string): void;
-    onProcessTimeout(): void;
-  };
+  readonly default: new () => VitestReporter;
 }
 
 interface PlaywrightReporterModule {
-  readonly default: new () => {
-    onBegin(config: unknown, suite: unknown): void;
-    onTestBegin(test: unknown, result: unknown): void;
-    onTestEnd(test: unknown, result: unknown): void;
-    onError(error: unknown): void;
-    onEnd(result: unknown): void;
-    onExit(): void;
+  readonly default: new () => PlaywrightReporter;
+}
+
+type VitestContext = Parameters<NonNullable<VitestReporter['onInit']>>[0];
+type VitestSpecifications = Parameters<NonNullable<VitestReporter['onTestRunStart']>>[0];
+type VitestSpecification = VitestSpecifications[number];
+type VitestModules = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[0];
+type VitestModule = VitestModules[number];
+type VitestRunErrors = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[1];
+type VitestRunReason = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[2];
+
+interface ArtifactRead {
+  readonly status: 'readable';
+  readonly error: null;
+}
+
+interface PhaseInput {
+  readonly kind: 'vitest' | 'playwright';
+  readonly phase: 'initial' | 'retry';
+  readonly phaseInvocationId: string;
+  readonly reporterPath: string;
+  readonly evidencePath: string;
+  readonly reporter: unknown;
+  readonly evidence: unknown;
+  readonly stockRead: ArtifactRead;
+  readonly evidenceRead: ArtifactRead;
+  readonly exitCode: number;
+  readonly signal: null;
+  readonly spawnError: null;
+  readonly requestedFiles: readonly string[] | null;
+}
+
+interface ClassifiedPhase {
+  readonly process: { readonly status: string };
+  readonly reporterOutcome: { readonly status: string; readonly reasons: readonly string[] };
+  readonly discovery: { readonly status: string };
+  readonly fileOutcomes: readonly { readonly file: string; readonly status: string }[];
+}
+
+interface VerdictModule {
+  classifyPhase(value: PhaseInput): ClassifiedPhase;
+  reduceGateVerdict(initial: ClassifiedPhase, retry: ClassifiedPhase | null): {
+    readonly status: string;
+    readonly passedOnRetry: readonly string[];
   };
 }
 
+const readable: ArtifactRead = { status: 'readable', error: null };
+
+async function verdictModule(): Promise<VerdictModule> {
+  const modulePath = new URL('../../../tools/gate-verdict.mjs', import.meta.url).href;
+  return await import(modulePath) as unknown as VerdictModule;
+}
+
 interface VitestCase {
   readonly state?: 'passed' | 'failed' | 'skipped' | 'pending' | 'queued';
   readonly moduleErrors?: readonly Error[];
@@ -132,25 +188,29 @@
   vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'vitest-unit-id');
   const modulePath = new URL('../../../tools/gate-vitest-evidence-reporter.mjs', import.meta.url).href;
   const imported = await import(modulePath) as unknown as VitestReporterModule;
-  const reporter = new imported.default();
-  reporter.onInit({ config: { passWithNoTests: input.passWithNoTests ?? false } });
+  const reporter: VitestReporter = new imported.default();
+  await reporter.onInit?.({ config: { passWithNoTests: input.passWithNoTests ?? false } } as VitestContext);
   const files = input.empty ? [] : [resolve('tests/example.test.ts')];
   const specs = files.flatMap((file) => {
     const base = [{ taskId: 'task-a', moduleId: file, project: { hash: 'project-a', name: 'unit' } }];
     return input.duplicate
       ? [...base, { taskId: 'task-b', moduleId: file, project: { hash: 'project-b', name: 'other' } }]
       : base;
-  });
-  reporter.onTestRunStart(specs);
+  }) as VitestSpecification[];
+  await reporter.onTestRunStart?.(specs);
   const modules = specs.map((specification) => ({
     id: specification.taskId,
     moduleId: specification.moduleId,
     project: specification.project,
     state: () => input.state ?? 'passed',
     errors: () => [...(input.moduleErrors ?? [])],
-  }));
-  reporter.onTestRunEnd(modules, [...(input.globalErrors ?? [])], input.reason ?? 'passed');
-  if (input.timeout) reporter.onProcessTimeout();
+  })) as VitestModule[];
+  await reporter.onTestRunEnd?.(
+    modules,
+    [...(input.globalErrors ?? [])] as unknown as VitestRunErrors,
+    (input.reason ?? 'passed') as VitestRunReason,
+  );
+  if (input.timeout) await reporter.onProcessTimeout?.();
   return JSON.parse(readFileSync(path, 'utf8')) as VitestEvidence;
 }
 
@@ -163,6 +223,7 @@
   readonly fullStatus?: 'passed' | 'failed' | 'timedout' | 'interrupted';
   readonly globalError?: Error;
   readonly duplicateUnfinished?: boolean;
+  readonly repeatEnd?: boolean;
 }
 
 async function playwrightEvidence(input: PlaywrightCase = {}): Promise<PlaywrightEvidence> {
@@ -174,7 +235,7 @@
   vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'playwright-unit-id');
   const modulePath = new URL('../../../tools/gate-playwright-evidence-reporter.mjs', import.meta.url).href;
   const imported = await import(modulePath) as unknown as PlaywrightReporterModule;
-  const reporter = new imported.default();
+  const reporter: PlaywrightReporter = new imported.default();
   const file = resolve('tests/example.spec.ts');
   const makeTest = (id: string, projectName: string) => ({
     id,
@@ -182,20 +243,88 @@
     expectedStatus: input.expectedStatus ?? 'passed',
     parent: { project: () => ({ name: projectName }) },
     outcome: () => input.outcome ?? 'expected',
-  });
-  const tests = [makeTest('test-a', 'unit')];
+  }) as TestCase;
+  const tests: TestCase[] = [makeTest('test-a', 'unit')];
   if (input.duplicateUnfinished) tests.push(makeTest('test-b', 'other'));
-  reporter.onBegin({}, { allTests: () => tests });
+  reporter.onBegin?.({} as FullConfig, { allTests: () => tests } as Suite);
   const first = tests[0];
   if (first === undefined) throw new Error('Fixture test missing.');
-  if (input.begin ?? true) reporter.onTestBegin(first, {});
-  if (input.end ?? true) reporter.onTestEnd(first, { status: input.status ?? 'passed', errors: [] });
-  if (input.globalError !== undefined) reporter.onError(input.globalError);
-  reporter.onEnd({ status: input.fullStatus ?? 'passed' });
-  reporter.onExit();
+  const result = { status: input.status ?? 'passed', errors: [] } as unknown as TestResult;
+  if (input.begin ?? true) reporter.onTestBegin?.(first, result);
+  if (input.end ?? true) {
+    reporter.onTestEnd?.(first, result);
+    if (input.repeatEnd) reporter.onTestEnd?.(first, result);
+  }
+  if (input.globalError !== undefined) reporter.onError?.(input.globalError as TestError);
+  await reporter.onEnd?.({ status: input.fullStatus ?? 'passed' } as FullResult);
+  await reporter.onExit?.();
   return JSON.parse(readFileSync(path, 'utf8')) as PlaywrightEvidence;
 }
 
+async function classifyVitest(evidence: VitestEvidence): Promise<ClassifiedPhase> {
+  const fileOutcomes = evidence.modules.map((module) => ({
+    name: module.file,
+    status: module.state === 'passed' || module.state === 'skipped' ? 'passed' : 'failed',
+    assertionResults: [{ status: module.state === 'failed' ? 'failed' : 'passed' }],
+  }));
+  const reporter = {
+    success: evidence.terminalReason === 'passed' && evidence.globalErrors.length === 0 &&
+      evidence.modules.every((module) => module.state === 'passed' || module.state === 'skipped'),
+    numFailedTestSuites: fileOutcomes.filter((result) => result.status === 'failed').length,
+    numFailedTests: fileOutcomes.filter((result) => result.status === 'failed').length,
+    testResults: fileOutcomes,
+  };
+  const module = await verdictModule();
+  return module.classifyPhase({
+    kind: 'vitest',
+    phase: evidence.phase,
+    phaseInvocationId: evidence.phaseInvocationId,
+    reporterPath: '/tmp/stock.json',
+    evidencePath: '/tmp/evidence.json',
+    reporter,
+    evidence,
+    stockRead: readable,
+    evidenceRead: readable,
+    exitCode: reporter.success ? 0 : 1,
+    signal: null,
+    spawnError: null,
+    requestedFiles: evidence.phase === 'retry' ? evidence.specifications.map((specification) => specification.file) : null,
+  });
+}
+
+async function classifyPlaywright(evidence: PlaywrightEvidence): Promise<ClassifiedPhase> {
+  const files = [...new Set(evidence.tests.map((test) => test.file))];
+  const specs = files.map((file) => {
+    const matching = evidence.tests.filter((test) => test.file === file);
+    const ok = matching.every((test) => test.status === 'passed' ||
+      (test.status === 'skipped' && test.expectedStatus === 'skipped') ||
+      (test.status === 'failed' && test.outcome === 'expected'));
+    return { file: relative(resolve('tests'), file), ok, tests: matching.map((test) => ({ results: [{ status: test.status }] })) };
+  });
+  const reporter = {
+    config: { rootDir: resolve('tests') },
+    suites: [{ specs }],
+    errors: evidence.globalErrors,
+    stats: { expected: specs.filter((spec) => spec.ok).length, unexpected: specs.filter((spec) => !spec.ok).length, flaky: 0, skipped: 0 },
+  };
+  const module = await verdictModule();
+  return module.classifyPhase({
+    kind: 'playwright',
+    phase: evidence.phase,
+    phaseInvocationId: evidence.phaseInvocationId,
+    reporterPath: '/tmp/stock.json',
+    evidencePath: '/tmp/evidence.json',
+    reporter,
+    evidence,
+    stockRead: readable,
+    evidenceRead: readable,
+    exitCode: reporter.stats.unexpected === 0 && reporter.errors.length === 0 ? 0 : 1,
+    signal: null,
+    spawnError: null,
+    requestedFiles: evidence.phase === 'retry' ? files : null,
+  });
+}
+
 describe('Vitest gate evidence reporter', () => {
   it('records a passing module with complete lifecycle provenance', async () => {
     const evidence = await vitestEvidence();
@@ -206,6 +335,9 @@
     expect(actual.status).toBe(0);
     expect(actual.evidence.modules).toHaveLength(1);
     expect(actual.evidence.lifecycle.onTestRunEnd).toBe(true);
+    const phase = await classifyVitest(evidence);
+    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
+    expect(phase.discovery.status).toBe('complete');
   });
 
   it('records collection/module failure details', async () => {
@@ -214,18 +346,31 @@
     const actual = realVitestEvidence('collection');
     expect(actual.status).toBe(1);
     expect(actual.evidence.modules[0]?.errors.length).toBeGreaterThan(0);
+    expect((await classifyVitest(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
   });
 
   it('records an intentional skipped module', async () => {
-    expect((await vitestEvidence({ state: 'skipped' })).modules[0]?.state).toBe('skipped');
+    const evidence = await vitestEvidence({ state: 'skipped' });
+    expect(evidence.modules[0]?.state).toBe('skipped');
+    const phase = await classifyVitest(evidence);
+    expect(phase.reporterOutcome.status).toBe('passed');
+    expect(phase.discovery.status).toBe('complete');
   });
 
   it('retains pending as unfinished native evidence', async () => {
-    expect((await vitestEvidence({ state: 'pending' })).modules[0]?.state).toBe('pending');
+    const evidence = await vitestEvidence({ state: 'pending' });
+    expect(evidence.modules[0]?.state).toBe('pending');
+    const phase = await classifyVitest(evidence);
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.status).toBe('failed');
   });
 
   it('retains queued as unfinished native evidence', async () => {
-    expect((await vitestEvidence({ state: 'queued' })).modules[0]?.state).toBe('queued');
+    const evidence = await vitestEvidence({ state: 'queued' });
+    expect(evidence.modules[0]?.state).toBe('queued');
+    const phase = await classifyVitest(evidence);
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.status).toBe('failed');
   });
 
   it('records global-only errors separately from modules', async () => {
@@ -235,10 +380,13 @@
     const actual = realVitestEvidence('global');
     expect(actual.status).toBe(1);
     expect(actual.evidence.globalErrors[0]?.message).toContain('intentional global error');
+    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('runner-global-error');
   });
 
   it('records terminal interruption', async () => {
-    expect((await vitestEvidence({ reason: 'interrupted' })).terminalReason).toBe('interrupted');
+    const evidence = await vitestEvidence({ reason: 'interrupted' });
+    expect(evidence.terminalReason).toBe('interrupted');
+    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('runner-interrupted');
   });
 
   it('atomically rewrites evidence on process timeout', async () => {
@@ -248,6 +396,19 @@
     const actual = realVitestEvidence('process-timeout');
     expect(actual.evidence.processTimeoutObserved).toBe(true);
     expect(actual.evidence.fatalReasons).toEqual(['vitest-process-timeout']);
+    const initial = await classifyVitest(evidence);
+    expect(initial.reporterOutcome.reasons).toContain('vitest-process-timeout');
+    const passing = await vitestEvidence();
+    const retryEvidence: VitestEvidence = {
+      ...passing,
+      phase: 'retry',
+      phaseInvocationId: 'vitest-retry-id',
+    };
+    const retry = await classifyVitest(retryEvidence);
+    const module = await verdictModule();
+    const verdict = module.reduceGateVerdict(initial, retry);
+    expect(verdict.status).toBe('failed');
+    expect(verdict.passedOnRetry).toEqual(['tests/example.test.ts']);
   });
 
   it('keeps project-aware identities for a duplicate path', async () => {
@@ -257,6 +418,7 @@
     const actual = realVitestEvidence('duplicate');
     expect(actual.status).toBe(0);
     expect(new Set(actual.evidence.modules.map((module) => module.executionId)).size).toBe(2);
+    expect((await classifyVitest(evidence)).discovery.status).toBe('complete');
   });
 
   it('records root passWithNoTests true for an empty run', async () => {
@@ -267,6 +429,9 @@
     expect(actual.status).toBe(0);
     expect(actual.evidence.passWithNoTests).toBe(true);
     expect(actual.evidence.specifications).toEqual([]);
+    const phase = await classifyVitest(evidence);
+    expect(phase.reporterOutcome.status).toBe('passed');
+    expect(phase.discovery.status).toBe('complete');
   });
 
   it('records root passWithNoTests false for an empty run', async () => {
@@ -277,55 +442,85 @@
     expect(actual.status).toBe(1);
     expect(actual.evidence.passWithNoTests).toBe(false);
     expect(actual.evidence.specifications).toEqual([]);
+    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('empty-run-not-allowed');
   });
 });
 
 describe('Playwright gate evidence reporter', () => {
   it('records an expected pass', async () => {
-    expect((await playwrightEvidence()).tests[0]).toMatchObject({ status: 'passed', outcome: 'expected' });
+    const evidence = await playwrightEvidence();
+    expect(evidence.tests[0]).toMatchObject({ status: 'passed', outcome: 'expected' });
+    const phase = await classifyPlaywright(evidence);
+    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
+    expect(phase.discovery.status).toBe('complete');
   });
 
   it('records an unexpected assertion failure', async () => {
-    expect((await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed' })).tests[0])
-      .toMatchObject({ status: 'failed', outcome: 'unexpected' });
+    const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed' });
+    expect(evidence.tests[0]).toMatchObject({ status: 'failed', outcome: 'unexpected' });
+    expect((await classifyPlaywright(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
   });
 
   it('records an individual timed-out result distinctly', async () => {
-    expect((await playwrightEvidence({ status: 'timedOut', outcome: 'unexpected', fullStatus: 'failed' })).tests[0]?.status)
-      .toBe('timedOut');
+    const evidence = await playwrightEvidence({ status: 'timedOut', outcome: 'unexpected', fullStatus: 'failed' });
+    expect(evidence.tests[0]?.status).toBe('timedOut');
+    expect((await classifyPlaywright(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
   });
 
   it('records intentional skip with callback and expected status', async () => {
-    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'skipped' })).tests[0])
-      .toMatchObject({ status: 'skipped', expectedStatus: 'skipped', onTestEndObserved: true });
+    const evidence = await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'skipped' });
+    expect(evidence.tests[0]).toMatchObject({ status: 'skipped', expectedStatus: 'skipped', onTestEndObserved: true });
+    const phase = await classifyPlaywright(evidence);
+    expect(phase.reporterOutcome.status).toBe('passed');
+    expect(phase.discovery.status).toBe('complete');
   });
 
   it('records started without terminal callback', async () => {
-    expect((await playwrightEvidence({ end: false })).tests[0])
-      .toMatchObject({ onTestBeginObserved: true, onTestEndObserved: false });
+    const evidence = await playwrightEvidence({ end: false });
+    expect(evidence.tests[0]).toMatchObject({ onTestBeginObserved: true, onTestEndObserved: false });
+    const phase = await classifyPlaywright(evidence);
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.status).toBe('failed');
   });
 
   it('records synthesized skipped nonexecution', async () => {
-    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'passed', begin: false })).tests[0])
-      .toMatchObject({ status: 'skipped', expectedStatus: 'passed', onTestBeginObserved: false, onTestEndObserved: true });
+    const evidence = await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'passed', begin: false });
+    expect(evidence.tests[0]).toMatchObject({ status: 'skipped', expectedStatus: 'passed', onTestBeginObserved: false, onTestEndObserved: true });
+    const phase = await classifyPlaywright(evidence);
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.status).toBe('failed');
   });
 
   it('records global FullResult timedout', async () => {
-    expect((await playwrightEvidence({ fullStatus: 'timedout' })).fullResultStatus).toBe('timedout');
+    const evidence = await playwrightEvidence({ fullStatus: 'timedout' });
+    expect(evidence.fullResultStatus).toBe('timedout');
+    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-global-timeout');
   });
 
   it('records global FullResult interrupted', async () => {
-    expect((await playwrightEvidence({ fullStatus: 'interrupted' })).fullResultStatus).toBe('interrupted');
+    const evidence = await playwrightEvidence({ fullStatus: 'interrupted' });
+    expect(evidence.fullResultStatus).toBe('interrupted');
+    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-interrupted');
   });
 
   it('records global-only onError', async () => {
-    expect((await playwrightEvidence({ globalError: new Error('global boom'), fullStatus: 'failed' })).globalErrors[0]?.message)
-      .toBe('global boom');
+    const evidence = await playwrightEvidence({ globalError: new Error('global boom'), fullStatus: 'failed' });
+    expect(evidence.globalErrors[0]?.message).toBe('global boom');
+    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-global-error');
   });
 
   it('keeps an independent unfinished duplicate-project execution', async () => {
     const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed', duplicateUnfinished: true });
     expect(evidence.discovered.map((test) => test.executionId)).toHaveLength(2);
     expect(evidence.tests.find((test) => test.executionId.includes('test-b'))?.onTestEndObserved).toBe(false);
+    const phase = await classifyPlaywright(evidence);
+    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
+    expect(phase.discovery.status).toBe('failed');
+  });
+
+  it('preserves repeated terminal callbacks for classifier rejection', async () => {
+    const evidence = await playwrightEvidence({ repeatEnd: true });
+    expect(evidence.tests.map((test) => test.executionId)).toHaveLength(2);
+    expect((await classifyPlaywright(evidence)).discovery.status).toBe('failed');
   });
 });
diff --git a/tests/unit/tools/gate-runners.test.ts b/tests/unit/tools/gate-runners.test.ts
index 0ba227f0111630a5766d17d8d77ebb7e72d08b5b..84a282986bd6251d8a8ce2d70f5e88d4f15f8341
--- a/tests/unit/tools/gate-runners.test.ts
+++ b/tests/unit/tools/gate-runners.test.ts
@@ -12,6 +12,14 @@
 } from '../../helpers/test-filesystem';
 
 type RunnerKind = 'vitest' | 'playwright';
+type VitestArgvProbe =
+  | 'default'
+  | 'complex'
+  | 'initial-file-parallelism'
+  | 'initial-serial'
+  | 'retry-isolate-false'
+  | 'retry-coverage-false'
+  | 'retry-config-loader';
 type Scenario =
   | 'clean'
   | 'flaky'
@@ -89,7 +97,7 @@
   readonly unrelatedFile: string;
 }
 
-function runGate(kind: RunnerKind, scenario: Scenario, parserProbe = false): GateRun {
+function runGate(kind: RunnerKind, scenario: Scenario, argvProbe: VitestArgvProbe = 'default'): GateRun {
   const directory = mkdtempSync(join(tmpdir(), `dnd-${kind}-gate-test-`));
   const logPath = join(directory, 'stub.jsonl');
   const emptyPath = join(directory, 'empty-path');
@@ -120,19 +128,30 @@
     environment.DND_GATE_FLOCK_MODULE = resolve('tests/fixtures/fake-flock.mjs');
   }
   const selectors = kind === 'vitest'
-    ? parserProbe
+    ? argvProbe === 'complex'
       ? [
         '-c', 'tests/fixtures/gate-vitest-proof.config.mts',
         '--project', 'unit', '--project=other',
         '-t', 'probe name', '--environment=node', '--pool', 'forks',
         '--passWithNoTests', '--shard=1/2', '--changed=false',
       ]
-      : ['--config', 'tests/fixtures/gate-vitest-proof.config.mts', '--project=unit']
+      : argvProbe === 'initial-file-parallelism'
+        ? ['--fileParallelism']
+        : argvProbe === 'initial-serial'
+          ? ['--no-file-parallelism', '--maxWorkers=1']
+          : argvProbe === 'retry-isolate-false'
+            ? ['--isolate', 'false']
+            : argvProbe === 'retry-coverage-false'
+              ? ['--coverage', 'false']
+              : argvProbe === 'retry-config-loader'
+                ? ['--configLoader', 'runner']
+                : ['--config', 'tests/fixtures/gate-vitest-proof.config.mts', '--project=unit']
     : ['--project=chromium'];
-  const tail = parserProbe ? ['--', '--node-tail', 'tail-value'] : [];
+  const selectedFiles = argvProbe === 'complex' ? [failedFile, unrelatedFile] : [failedFile];
+  const tail = argvProbe === 'complex' ? ['--', '--node-tail', 'tail-value'] : [];
   const result = spawnSync(
     process.execPath,
-    [runner, ...selectors, failedFile, unrelatedFile, ...tail],
+    [runner, ...selectors, ...selectedFiles, ...tail],
     { cwd: process.cwd(), encoding: 'utf8', env: environment },
   );
   const finalReport = readdirSync(directory).find((name) => name.includes('-gate-') && name.endsWith('.json'));
@@ -196,7 +215,7 @@
     expect(omitted.report.verdict.failedFiles).toEqual([omitted.failedFile]);
     expect(omitted.report.phases.retry?.discovery.status).toBe('failed');
 
-    const retried = runGate('vitest', 'ordinary_retry', true);
+    const retried = runGate('vitest', 'ordinary_retry', 'complex');
     const args = retried.report.phases.retry?.command.arguments;
     expect(args).toBeDefined();
     const parsed = parseCLI(['vitest', ...args!.slice(1)]);
@@ -236,6 +255,53 @@
     expect(failedFileIndex).toBeGreaterThan(reporterIndex);
     expect(delimiterIndex).toBeGreaterThan(failedFileIndex);
   });
+
+  it('preserves a bare initial --fileParallelism without swallowing its file filter', () => {
+    const run = runGate('vitest', 'clean', 'initial-file-parallelism');
+    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'initial')?.arguments;
+    expect(args).toBeDefined();
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    expect(parsed.filter).toEqual([run.failedFile]);
+    expect(parsed.options.fileParallelism).toBe(true);
+  });
+
+  it('preserves initial serial scheduling constraints and the file filter', () => {
+    const run = runGate('vitest', 'clean', 'initial-serial');
+    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'initial')?.arguments;
+    expect(args).toBeDefined();
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    expect(parsed.filter).toEqual([run.failedFile]);
+    expect(parsed.options.fileParallelism).toBe(false);
+    expect(parsed.options.maxWorkers).toBe(1);
+  });
+
+  it('preserves separate false for --isolate on retry', () => {
+    const run = runGate('vitest', 'ordinary_retry', 'retry-isolate-false');
+    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
+    expect(args).toBeDefined();
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    expect(parsed.filter).toEqual([run.failedFile]);
+    expect(parsed.options.isolate).toBe(false);
+  });
+
+  it('preserves separate false for --coverage on retry', () => {
+    const run = runGate('vitest', 'ordinary_retry', 'retry-coverage-false');
+    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
+    expect(args).toBeDefined();
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    expect(parsed.filter).toEqual([run.failedFile]);
+    expect(parsed.options.coverage).toEqual({ enabled: false });
+  });
+
+  it('emits gate-owned --configLoader runner exactly once on retry', () => {
+    const run = runGate('vitest', 'ordinary_retry', 'retry-config-loader');
+    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
+    expect(args).toBeDefined();
+    expect(args?.filter((argument) => argument === '--configLoader')).toHaveLength(1);
+    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
+    expect(parsed.filter).toEqual([run.failedFile]);
+    expect(parsed.options.configLoader).toBe('runner');
+  });
 });
 
 describe.each(['vitest', 'playwright'] as const)('%s four-domain counterexamples', (kind) => {
@@ -282,6 +348,7 @@
     const run = runGate(kind, 'stock_missing');
     expect(run.report.version).toBe(2);
     expect(run.status).toBe(1);
+    expect(run.report.phases.initial.process).toMatchObject({ status: 'passed', exitCode: 0 });
     expect(run.report.phases.initial.reporterOutcome.reasons).toContain('stock-report-missing');
     expect(run.report.phases.initial.fileOutcomes).toContainEqual(expect.objectContaining({ file: run.failedFile, status: 'failed' }));
     expect(run.report.phases.retry).not.toBeNull();
diff --git a/tests/unit/tools/gate-verdict.test.ts b/tests/unit/tools/gate-verdict.test.ts
index e61957c8d55f5c03012f7a1c5d2b58a9670f27f2..c8f3ab5789ee9172393fc0aef524ea757fecb4b5
--- a/tests/unit/tools/gate-verdict.test.ts
+++ b/tests/unit/tools/gate-verdict.test.ts
@@ -31,7 +31,13 @@
   readonly phase: Phase;
   readonly process: { readonly status: string; readonly reasons: readonly string[] };
   readonly reporterOutcome: { readonly status: string; readonly reasons: readonly string[] };
-  readonly discovery: { readonly status: string; readonly missingExecutionIds: readonly string[] };
+  readonly discovery: {
+    readonly status: string;
+    readonly missingExecutionIds: readonly string[];
+    readonly duplicateExecutionIds: readonly string[];
+    readonly mismatchedExecutionIds: readonly string[];
+    readonly fileSetMismatch: boolean;
+  };
   readonly fileOutcomes: readonly { readonly file: string; readonly status: string; readonly executionIds: readonly string[] }[];
 }
 
@@ -39,6 +45,8 @@
   classifyPhase(value: PhaseInput): unknown;
   readJsonArtifact(path: string): { readonly read: ArtifactRead };
   reduceGateVerdict(initial: ClassifiedPhase, retry: ClassifiedPhase | null): {
+    readonly status: 'passed' | 'failed';
+    readonly passedOnRetry: readonly string[];
     readonly phaseFailures: readonly { readonly phase: Phase; readonly domain: string }[];
   };
 }
@@ -105,7 +113,8 @@
     };
   }
   return {
-    suites: [{ specs: [{ file, ok: status === 'passed', tests: [{ results: [{ status }] }] }] }],
+    config: { rootDir: resolve('tests/browser') },
+    suites: [{ specs: [{ file: 'example.spec.ts', ok: status === 'passed', tests: [{ results: [{ status }] }] }] }],
     errors: [],
     stats: { expected: status === 'passed' ? 1 : 0, unexpected: status === 'failed' ? 1 : 0, flaky: 0, skipped: 0 },
   };
@@ -145,6 +154,30 @@
     expect((await classify(input('playwright', 'initial', 'failed'))).process.status).toBe('ordinary-file-failure');
   });
 
+  it('resolves native Playwright stock paths from a validated rootDir', async () => {
+    const rootDir = resolve('tests/browser');
+    const nativeStock = {
+      config: { rootDir },
+      suites: [{ specs: [{ file: 'example.spec.ts', ok: true, tests: [{ results: [{ status: 'passed' }] }] }] }],
+      errors: [],
+      stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 },
+    };
+    const phase = await classify({ ...input('playwright'), reporter: nativeStock });
+    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
+    expect(phase.discovery.status).toBe('complete');
+
+    const relativeRoot = await classify({
+      ...input('playwright'),
+      reporter: { ...nativeStock, config: { rootDir: 'tests/browser' } },
+    });
+    expect(relativeRoot.reporterOutcome.reasons).toContain('stock-report-malformed');
+    const outsideRoot = await classify({
+      ...input('playwright'),
+      reporter: { ...nativeStock, config: { rootDir: resolve('..') } },
+    });
+    expect(outsideRoot.reporterOutcome.reasons).toContain('stock-report-malformed');
+  });
+
   it('classifies late exit 1 after successful reports as process failure', async () => {
     const phase = await classify({ ...input('vitest'), exitCode: 1 });
     expect(phase.process.status).toBe('failed');
@@ -198,10 +231,16 @@
   });
 
   it('does not let a retry reporter/global failure authorize green', async () => {
+    const module = await verdictModule();
+    const initial = await classify(input('vitest', 'initial', 'failed'));
     const badEvidence = evidence('vitest', 'retry', 'phase-id') as { globalErrors: unknown[] };
     badEvidence.globalErrors = [{ name: 'Error', message: 'global' }];
     const retry = await classify({ ...input('vitest', 'retry'), evidence: badEvidence });
     expect(retry.reporterOutcome.reasons).toContain('runner-global-error');
+    const verdict = module.reduceGateVerdict(initial, retry);
+    expect(verdict.status).toBe('failed');
+    expect(verdict.passedOnRetry).toEqual(['tests/unit/example.test.ts']);
+    expect(verdict.phaseFailures).toContainEqual(expect.objectContaining({ phase: 'retry', domain: 'reporter' }));
     const unexplainedEvidence = evidence('vitest', 'retry', 'phase-id') as { terminalReason: string };
     unexplainedEvidence.terminalReason = 'failed';
     const unexplained = await classify({ ...input('vitest', 'retry'), reporter: stock('vitest'), evidence: unexplainedEvidence });
@@ -220,6 +259,88 @@
     expect(retry.discovery.status).toBe('failed');
   });
 
+  it('rejects duplicate terminal execution ids before deduplication', async () => {
+    const duplicated = evidence('vitest', 'initial', 'phase-id') as {
+      modules: Array<Record<string, unknown>>;
+    };
+    const first = duplicated.modules[0];
+    if (first === undefined) throw new Error('Expected one module fixture.');
+    duplicated.modules.push({ ...first });
+    const phase = await classify({ ...input('vitest'), evidence: duplicated });
+    expect(phase.discovery.status).toBe('failed');
+    expect(phase.discovery.duplicateExecutionIds).toEqual([first.executionId]);
+  });
+
+  it('rejects a scheduled execution id reported for a substituted file', async () => {
+    const substituted = evidence('vitest', 'initial', 'phase-id') as {
+      modules: Array<Record<string, unknown>>;
+    };
+    const module = substituted.modules[0];
+    if (module === undefined) throw new Error('Expected one module fixture.');
+    const unlisted = resolve('tests/unit/unlisted.test.ts');
+    module.file = unlisted;
+    const reporter = {
+      success: true,
+      numFailedTestSuites: 0,
+      numFailedTests: 0,
+      testResults: [{ name: unlisted, status: 'passed', assertionResults: [{ status: 'passed' }] }],
+    };
+    const phase = await classify({ ...input('vitest'), reporter, evidence: substituted });
+    expect(phase.discovery.status).toBe('failed');
+    expect(phase.discovery.mismatchedExecutionIds).toEqual([module.executionId]);
+  });
+
+  it('rejects a reported file set different from the scheduled file set', async () => {
+    const unlistedEvidence = evidence('vitest', 'initial', 'phase-id') as {
+      modules: Array<Record<string, unknown>>;
+    };
+    const unlisted = resolve('tests/unit/unlisted.test.ts');
+    unlistedEvidence.modules = [{
+      executionId: `unit:unlisted:${unlisted}`,
+      file: unlisted,
+      projectName: 'unit',
+      state: 'passed',
+      errors: [],
+    }];
+    const reporter = {
+      success: true,
+      numFailedTestSuites: 0,
+      numFailedTests: 0,
+      testResults: [{ name: unlisted, status: 'passed', assertionResults: [{ status: 'passed' }] }],
+    };
+    const phase = await classify({ ...input('vitest'), reporter, evidence: unlistedEvidence });
+    expect(phase.discovery.status).toBe('failed');
+    expect(phase.discovery.fileSetMismatch).toBe(true);
+  });
+
+  it('aggregates duplicate Vitest stock paths with failure dominance in either order and permits exact retry', async () => {
+    const module = await verdictModule();
+    const file = resolve('tests/unit/example.test.ts');
+    const mixedEvidence = evidence('vitest', 'initial', 'phase-id', 'failed') as {
+      specifications: Array<Record<string, unknown>>;
+      modules: Array<Record<string, unknown>>;
+    };
+    const secondId = `other:test-b:${file}`;
+    mixedEvidence.specifications.push({ executionId: secondId, file, projectName: 'other', taskId: 'test-b' });
+    mixedEvidence.modules.push({ executionId: secondId, file, projectName: 'other', state: 'passed', errors: [] });
+    const failedResult = { name: file, status: 'failed', assertionResults: [{ status: 'failed' }] };
+    const passedResult = { name: file, status: 'passed', assertionResults: [{ status: 'passed' }] };
+    const phases = await Promise.all([
+      [failedResult, passedResult],
+      [passedResult, failedResult],
+    ].map((testResults) => classify({
+      ...input('vitest', 'initial', 'failed'),
+      reporter: { success: false, numFailedTestSuites: 1, numFailedTests: 1, testResults },
+      evidence: mixedEvidence,
+    })));
+    expect(phases.map((phase) => phase.reporterOutcome)).toEqual([
+      expect.objectContaining({ status: 'passed', reasons: [] }),
+      expect.objectContaining({ status: 'passed', reasons: [] }),
+    ]);
+    const retry = await classify(input('vitest', 'retry', 'passed'));
+    expect(phases.map((phase) => module.reduceGateVerdict(phase, retry).status)).toEqual(['passed', 'passed']);
+  });
+
   it('rejects sidecar invocation UUID mismatch', async () => {
     const phase = await classify({ ...input('vitest'), evidence: evidence('vitest', 'initial', 'other-id') });
     expect(phase.reporterOutcome.reasons).toContain('evidence-invocation-mismatch');
diff --git a/tools/gate-playwright-evidence-reporter.mjs b/tools/gate-playwright-evidence-reporter.mjs
index 5fe6c87fe0637d8ae6fb2b4a442b58e893ba784b..c47b45ef0e96d4ed961e2682d89f663fb5861976
--- a/tools/gate-playwright-evidence-reporter.mjs
+++ b/tools/gate-playwright-evidence-reporter.mjs
@@ -40,6 +40,7 @@
   constructor() {
     this.path = requiredEnvironment('DND_GATE_EVIDENCE_PATH');
     this.testEvidence = new Map();
+    this.terminalEvidence = [];
     this.document = {
       version: 1,
       kind: requiredEnvironment('DND_GATE_KIND'),
@@ -90,6 +91,7 @@
     record.outcome = typeof test.outcome === 'function' ? test.outcome() : record.outcome;
     record.expectedStatus = typeof test.expectedStatus === 'string' ? test.expectedStatus : record.expectedStatus;
     record.errors = Array.isArray(result?.errors) ? result.errors.map(normalizeError) : [];
+    this.terminalEvidence.push({ ...record, errors: [...record.errors] });
   }
 
   onError(error) {
@@ -103,7 +105,10 @@
 
   onExit() {
     this.document.lifecycle.onExit = true;
-    this.document.tests = [...this.testEvidence.values()]
+    this.document.tests = [
+      ...this.terminalEvidence,
+      ...[...this.testEvidence.values()].filter((test) => test.onTestEndObserved !== true),
+    ]
       .sort((left, right) => left.executionId.localeCompare(right.executionId));
     this.write();
   }
diff --git a/tools/gate-verdict.mjs b/tools/gate-verdict.mjs
index 1d7366d3c4de7072db8c6775dfa99769762adda3..84fc4589727abf82bced3a3409b8a8e05adb4dd3
--- a/tools/gate-verdict.mjs
+++ b/tools/gate-verdict.mjs
@@ -1,5 +1,5 @@
 import { readFileSync } from 'node:fs';
-import { resolve } from 'node:path';
+import { isAbsolute, relative, resolve, sep } from 'node:path';
 
 function isRecord(value) {
   return value !== null && typeof value === 'object' && !Array.isArray(value);
@@ -9,6 +9,21 @@
   return [...new Set(values)].sort();
 }
 
+function duplicates(values) {
+  const seen = new Set();
+  const repeated = new Set();
+  for (const value of values) {
+    if (seen.has(value)) repeated.add(value);
+    seen.add(value);
+  }
+  return [...repeated].sort();
+}
+
+function isInsideCwd(path) {
+  const relation = relative(resolve(process.cwd()), resolve(path));
+  return relation === '' || (relation !== '..' && !relation.startsWith(`..${sep}`) && !isAbsolute(relation));
+}
+
 function normalizeFile(path) {
   const absolute = resolve(path);
   const root = `${resolve(process.cwd())}/`;
@@ -91,20 +106,24 @@
 
 function vitestStock(reporter) {
   if (!isRecord(reporter) || typeof reporter.success !== 'boolean' || !Array.isArray(reporter.testResults)) return null;
-  const files = [];
+  const byFile = new Map();
   for (const result of reporter.testResults) {
     if (!isRecord(result) || typeof result.name !== 'string' || typeof result.status !== 'string' || !Array.isArray(result.assertionResults)) return null;
     const assertionFailed = result.assertionResults.some((assertion) => isRecord(assertion) && assertion.status === 'failed');
-    files.push({
-      file: normalizeFile(result.name),
-      status: result.status === 'passed' && !assertionFailed ? 'passed' : 'failed',
-    });
+    const file = normalizeFile(result.name);
+    const status = result.status === 'passed' && !assertionFailed ? 'passed' : 'failed';
+    if (status === 'failed' || byFile.get(file) === undefined) byFile.set(file, status);
   }
+  const files = [...byFile].map(([file, status]) => ({ file, status }))
+    .sort((left, right) => left.file.localeCompare(right.file));
   return { success: reporter.success, files };
 }
 
 function playwrightStock(reporter) {
-  if (!isRecord(reporter) || !Array.isArray(reporter.suites) || !Array.isArray(reporter.errors) || !isRecord(reporter.stats)) return null;
+  if (!isRecord(reporter) || !isRecord(reporter.config) || typeof reporter.config.rootDir !== 'string' ||
+    !isAbsolute(reporter.config.rootDir) || !isInsideCwd(reporter.config.rootDir) ||
+    !Array.isArray(reporter.suites) || !Array.isArray(reporter.errors) || !isRecord(reporter.stats)) return null;
+  const rootDir = resolve(reporter.config.rootDir);
   const byFile = new Map();
   const visit = (suite, inheritedFile) => {
     if (!isRecord(suite)) return false;
@@ -114,7 +133,9 @@
         if (!isRecord(spec) || typeof spec.ok !== 'boolean') return false;
         const file = typeof spec.file === 'string' ? spec.file : suiteFile;
         if (typeof file !== 'string') return false;
-        const normalized = normalizeFile(file);
+        const absolute = isAbsolute(file) ? resolve(file) : resolve(rootDir, file);
+        if (!isInsideCwd(absolute)) return false;
+        const normalized = normalizeFile(absolute);
         const status = spec.ok ? 'passed' : 'failed';
         if (status === 'failed' || byFile.get(normalized) === undefined) byFile.set(normalized, status);
       }
@@ -338,8 +359,10 @@
   if (input.kind === 'playwright' && stock?.errors?.length > 0) reporterReasons.push('runner-global-error');
   crossCheck(stock, native, reporterReasons);
 
-  const scheduledExecutionIds = unique(native?.scheduled.map((item) => item.executionId) ?? []);
-  const reportedExecutionIds = unique(native?.terminalIds ?? []);
+  const rawScheduledExecutionIds = native?.scheduled.map((item) => item.executionId) ?? [];
+  const rawReportedExecutionIds = native?.terminalIds ?? [];
+  const scheduledExecutionIds = unique(rawScheduledExecutionIds);
+  const reportedExecutionIds = unique(rawReportedExecutionIds);
   const scheduledFiles = unique(native?.scheduled.map((item) => item.file) ?? []);
   const evidenceRequestedFiles = scheduledFiles;
   const requestedFiles = input.requestedFiles === null || input.requestedFiles === undefined
@@ -350,9 +373,17 @@
     .map((item) => item.file));
   const missingExecutionIds = scheduledExecutionIds.filter((id) => !reportedExecutionIds.includes(id));
   const unexpectedExecutionIds = reportedExecutionIds.filter((id) => !scheduledExecutionIds.includes(id));
+  const duplicateExecutionIds = duplicates(rawReportedExecutionIds);
+  const scheduledById = new Map((native?.scheduled ?? []).map((item) => [item.executionId, item.file]));
+  const mismatchedExecutionIds = unique((native?.executions ?? [])
+    .filter((item) => rawReportedExecutionIds.includes(item.executionId) &&
+      scheduledById.has(item.executionId) && scheduledById.get(item.executionId) !== item.file)
+    .map((item) => item.executionId));
+  const fileSetMismatch = JSON.stringify(scheduledFiles) !== JSON.stringify(reportedFiles);
   let discoveryStatus = 'complete';
   if (native === null) discoveryStatus = 'uncertified';
   else if (missingExecutionIds.length > 0 || unexpectedExecutionIds.length > 0 ||
+    duplicateExecutionIds.length > 0 || mismatchedExecutionIds.length > 0 || fileSetMismatch ||
     JSON.stringify(requestedFiles) !== JSON.stringify(scheduledFiles)) discoveryStatus = 'failed';
 
   const executions = native?.executions ?? [];
@@ -406,6 +437,9 @@
       reportedFiles,
       missingExecutionIds,
       unexpectedExecutionIds,
+      duplicateExecutionIds,
+      mismatchedExecutionIds,
+      fileSetMismatch,
     },
     fileOutcomes,
   };
diff --git a/tools/gate-vitest.mjs b/tools/gate-vitest.mjs
index 9e36c964c28fa9928c2ba237f30dcf150c8f9aac..32d975628610e181acbc35ec8b9fe571d3e376c4
--- a/tools/gate-vitest.mjs
+++ b/tools/gate-vitest.mjs
@@ -42,18 +42,23 @@
     : { head: argumentsList.slice(0, delimiter), tail: argumentsList.slice(delimiter) };
 }
 
-function controlledOption(argument) {
+function gateOwnedOption(argument) {
   return argument === '--reporter' || argument.startsWith('--reporter=') ||
     argument === '--outputFile' || argument.startsWith('--outputFile=') || argument.startsWith('--outputFile.') ||
+    argument === '--configLoader' || argument.startsWith('--configLoader=');
+}
+
+function retryControlledOption(argument) {
+  return gateOwnedOption(argument) ||
     argument === '--fileParallelism' || argument.startsWith('--fileParallelism=') ||
     argument === '--no-file-parallelism' ||
     argument === '--maxWorkers' || argument.startsWith('--maxWorkers=');
 }
 
-function controlledOptionTakesValue(argument) {
+function optionTakesValue(argument) {
   const name = optionName(argument);
   return name === '--reporter' || name === '--outputFile' || name.startsWith('--outputFile.') ||
-    name === '--maxWorkers' || name === '--fileParallelism';
+    name === '--configLoader' || name === '--maxWorkers';
 }
 
 function optionName(argument) {
@@ -66,11 +71,11 @@
   const retained = [];
   for (let index = 0; index < head.length; index += 1) {
     const argument = head[index];
-    if (!controlledOption(argument)) {
+    if (!gateOwnedOption(argument)) {
       retained.push(argument);
       continue;
     }
-    if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
+    if (!argument.includes('=') && optionTakesValue(argument) &&
       head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
   }
   return [...retained, ...tail];
@@ -81,9 +86,11 @@
   const retained = [];
   for (let index = 0; index < head.length; index += 1) {
     const argument = head[index];
-    if (controlledOption(argument)) {
-      if (!argument.includes('=') && controlledOptionTakesValue(argument) &&
-        head[index + 1] !== undefined && !head[index + 1].startsWith('-')) index += 1;
+    if (retryControlledOption(argument)) {
+      const next = head[index + 1];
+      const consumesBoolean = optionName(argument) === '--fileParallelism' && (next === 'true' || next === 'false');
+      if (!argument.includes('=') && (optionTakesValue(argument) || consumesBoolean) &&
+        next !== undefined && !next.startsWith('-')) index += 1;
       continue;
     }
     if (!argument.startsWith('-')) continue;
@@ -95,6 +102,12 @@
         retained.push(value);
         index += 1;
       }
+    } else if (!argument.includes('=')) {
+      const value = head[index + 1];
+      if (value === 'true' || value === 'false') {
+        retained.push(value);
+        index += 1;
+      }
     }
   }
   return { retained, tail };
