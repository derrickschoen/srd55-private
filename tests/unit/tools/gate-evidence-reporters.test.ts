import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { Reporter as VitestReporter } from 'vitest/reporters';
import type {
  FullConfig,
  FullResult,
  Reporter as PlaywrightReporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

interface NormalizedError {
  readonly name: string;
  readonly message: string;
}

interface VitestEvidence {
  readonly version: 1;
  readonly kind: 'vitest';
  readonly phase: 'initial' | 'retry';
  readonly phaseInvocationId: string;
  readonly passWithNoTests: boolean;
  readonly terminalReason: string | null;
  readonly processTimeoutObserved: boolean;
  readonly fatalReasons: readonly string[];
  readonly specifications: readonly { readonly executionId: string; readonly file: string }[];
  readonly modules: readonly {
    readonly executionId: string;
    readonly file: string;
    readonly state: string;
    readonly errors: readonly NormalizedError[];
  }[];
  readonly globalErrors: readonly NormalizedError[];
  readonly lifecycle: { readonly onInit: boolean; readonly onTestRunStart: boolean; readonly onTestRunEnd: boolean };
}

interface PlaywrightEvidence {
  readonly version: 1;
  readonly kind: 'playwright';
  readonly phase: 'initial' | 'retry';
  readonly phaseInvocationId: string;
  readonly fullResultStatus: string | null;
  readonly globalErrors: readonly NormalizedError[];
  readonly discovered: readonly { readonly executionId: string; readonly file: string }[];
  readonly tests: readonly {
    readonly executionId: string;
    readonly file: string;
    readonly status: string | null;
    readonly outcome: string | null;
    readonly expectedStatus: string | null;
    readonly onTestBeginObserved: boolean;
    readonly onTestEndObserved: boolean;
  }[];
  readonly lifecycle: { readonly onBegin: boolean; readonly onEnd: boolean; readonly onExit: boolean };
}

interface VitestReporterModule {
  readonly default: new () => VitestReporter;
}

interface PlaywrightReporterModule {
  readonly default: new () => PlaywrightReporter;
}

type VitestContext = Parameters<NonNullable<VitestReporter['onInit']>>[0];
type VitestSpecifications = Parameters<NonNullable<VitestReporter['onTestRunStart']>>[0];
type VitestSpecification = VitestSpecifications[number];
type VitestModules = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[0];
type VitestModule = VitestModules[number];
type VitestRunErrors = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[1];
type VitestRunReason = Parameters<NonNullable<VitestReporter['onTestRunEnd']>>[2];

interface ArtifactRead {
  readonly status: 'readable';
  readonly error: null;
}

interface PhaseInput {
  readonly kind: 'vitest' | 'playwright';
  readonly phase: 'initial' | 'retry';
  readonly phaseInvocationId: string;
  readonly reporterPath: string;
  readonly evidencePath: string;
  readonly reporter: unknown;
  readonly evidence: unknown;
  readonly stockRead: ArtifactRead;
  readonly evidenceRead: ArtifactRead;
  readonly exitCode: number;
  readonly signal: null;
  readonly spawnError: null;
  readonly requestedFiles: readonly string[] | null;
}

interface ClassifiedPhase {
  readonly process: { readonly status: string };
  readonly reporterOutcome: { readonly status: string; readonly reasons: readonly string[] };
  readonly discovery: { readonly status: string };
  readonly fileOutcomes: readonly { readonly file: string; readonly status: string }[];
}

interface VerdictModule {
  classifyPhase(value: PhaseInput): ClassifiedPhase;
  reduceGateVerdict(initial: ClassifiedPhase, retry: ClassifiedPhase | null): {
    readonly status: string;
    readonly passedOnRetry: readonly string[];
  };
}

const readable: ArtifactRead = { status: 'readable', error: null };

async function verdictModule(): Promise<VerdictModule> {
  const modulePath = new URL('../../../tools/gate-verdict.mjs', import.meta.url).href;
  return await import(modulePath) as unknown as VerdictModule;
}

interface VitestCase {
  readonly state?: 'passed' | 'failed' | 'skipped' | 'pending' | 'queued';
  readonly moduleErrors?: readonly Error[];
  readonly globalErrors?: readonly Error[];
  readonly reason?: 'passed' | 'failed' | 'interrupted';
  readonly timeout?: boolean;
  readonly passWithNoTests?: boolean;
  readonly empty?: boolean;
  readonly duplicate?: boolean;
}

type RealVitestMode = 'passing' | 'collection' | 'global' | 'process-timeout' | 'duplicate' | 'empty-true' | 'empty-false';

function realVitestEvidence(mode: RealVitestMode): { readonly status: number | null; readonly evidence: VitestEvidence } {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-vitest-evidence-real-'));
  const evidencePath = join(directory, 'evidence.json');
  const reporter = resolve('tools/gate-vitest-evidence-reporter.mjs');
  const ordinaryConfig = 'tests/fixtures/gate-evidence/vitest-reporter.config.mts';
  const config = mode === 'duplicate'
    ? 'tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts'
    : mode === 'process-timeout'
      ? 'tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts'
      : ordinaryConfig;
  const selectors: Record<RealVitestMode, readonly string[]> = {
    passing: ['tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts'],
    collection: ['tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts'],
    global: ['tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts'],
    'process-timeout': [],
    duplicate: [],
    'empty-true': ['tests/fixtures/gate-evidence/does-not-exist.gate-fixture.ts'],
    'empty-false': ['tests/fixtures/gate-evidence/does-not-exist.gate-fixture.ts'],
  };
  const extraReporter = mode === 'process-timeout'
    ? [`--reporter=${resolve('tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs')}`]
    : [];
  const result = spawnSync(process.execPath, [
    resolve('node_modules/vitest/vitest.mjs'),
    'run',
    '--configLoader',
    'runner',
    '--config',
    config,
    `--reporter=${reporter}`,
    ...extraReporter,
    ...selectors[mode],
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      DND_GATE_EVIDENCE_PATH: evidencePath,
      DND_GATE_KIND: 'vitest',
      DND_GATE_PHASE: 'initial',
      DND_GATE_PHASE_INVOCATION_ID: `real-${mode}`,
      DND_GATE_FIXTURE_PASS_WITH_NO_TESTS: mode === 'empty-true' ? '1' : '0',
    },
  });
  const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as VitestEvidence;
  return { status: result.status, evidence };
}

async function vitestEvidence(input: VitestCase = {}): Promise<VitestEvidence> {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-vitest-evidence-unit-'));
  const path = join(directory, 'evidence.json');
  vi.stubEnv('DND_GATE_EVIDENCE_PATH', path);
  vi.stubEnv('DND_GATE_KIND', 'vitest');
  vi.stubEnv('DND_GATE_PHASE', 'initial');
  vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'vitest-unit-id');
  const modulePath = new URL('../../../tools/gate-vitest-evidence-reporter.mjs', import.meta.url).href;
  const imported = await import(modulePath) as unknown as VitestReporterModule;
  const reporter: VitestReporter = new imported.default();
  await reporter.onInit?.({ config: { passWithNoTests: input.passWithNoTests ?? false } } as VitestContext);
  const files = input.empty ? [] : [resolve('tests/example.test.ts')];
  const specs = files.flatMap((file) => {
    const base = [{ taskId: 'task-a', moduleId: file, project: { hash: 'project-a', name: 'unit' } }];
    return input.duplicate
      ? [...base, { taskId: 'task-b', moduleId: file, project: { hash: 'project-b', name: 'other' } }]
      : base;
  }) as VitestSpecification[];
  await reporter.onTestRunStart?.(specs);
  const modules = specs.map((specification) => ({
    id: specification.taskId,
    moduleId: specification.moduleId,
    project: specification.project,
    state: () => input.state ?? 'passed',
    errors: () => [...(input.moduleErrors ?? [])],
  })) as VitestModule[];
  const globalErrors: VitestRunErrors = (input.globalErrors ?? []).map((error) => ({
    name: error.name,
    message: error.message,
    ...(error.stack === undefined ? {} : { stack: error.stack }),
  }));
  await reporter.onTestRunEnd?.(
    modules,
    globalErrors,
    (input.reason ?? 'passed') as VitestRunReason,
  );
  if (input.timeout) await reporter.onProcessTimeout?.();
  return JSON.parse(readFileSync(path, 'utf8')) as VitestEvidence;
}

interface PlaywrightCase {
  readonly status?: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  readonly outcome?: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  readonly expectedStatus?: 'passed' | 'failed' | 'skipped';
  readonly begin?: boolean;
  readonly end?: boolean;
  readonly fullStatus?: 'passed' | 'failed' | 'timedout' | 'interrupted';
  readonly globalError?: Error;
  readonly duplicateUnfinished?: boolean;
  readonly repeatEnd?: boolean;
}

async function playwrightEvidence(input: PlaywrightCase = {}): Promise<PlaywrightEvidence> {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-playwright-evidence-unit-'));
  const path = join(directory, 'evidence.json');
  vi.stubEnv('DND_GATE_EVIDENCE_PATH', path);
  vi.stubEnv('DND_GATE_KIND', 'playwright');
  vi.stubEnv('DND_GATE_PHASE', 'initial');
  vi.stubEnv('DND_GATE_PHASE_INVOCATION_ID', 'playwright-unit-id');
  const modulePath = new URL('../../../tools/gate-playwright-evidence-reporter.mjs', import.meta.url).href;
  const imported = await import(modulePath) as unknown as PlaywrightReporterModule;
  const reporter: PlaywrightReporter = new imported.default();
  const file = resolve('tests/example.spec.ts');
  const makeTest = (id: string, projectName: string) => ({
    id,
    location: { file, line: 1, column: 1 },
    expectedStatus: input.expectedStatus ?? 'passed',
    parent: { project: () => ({ name: projectName }) },
    outcome: () => input.outcome ?? 'expected',
  }) as TestCase;
  const tests: TestCase[] = [makeTest('test-a', 'unit')];
  if (input.duplicateUnfinished) tests.push(makeTest('test-b', 'other'));
  reporter.onBegin?.({} as FullConfig, { allTests: () => tests } as Suite);
  const first = tests[0];
  if (first === undefined) throw new Error('Fixture test missing.');
  const result: TestResult = {
    annotations: [],
    attachments: [],
    duration: 0,
    errors: [],
    parallelIndex: 0,
    retry: 0,
    startTime: new Date(0),
    status: input.status ?? 'passed',
    stderr: [],
    stdout: [],
    steps: [],
    workerIndex: 0,
  };
  if (input.begin ?? true) reporter.onTestBegin?.(first, result);
  if (input.end ?? true) {
    reporter.onTestEnd?.(first, result);
    if (input.repeatEnd) reporter.onTestEnd?.(first, result);
  }
  if (input.globalError !== undefined) {
    const error: TestError = {
      message: input.globalError.message,
      ...(input.globalError.stack === undefined ? {} : { stack: input.globalError.stack }),
    };
    reporter.onError?.(error);
  }
  const fullResult: FullResult = { status: input.fullStatus ?? 'passed', startTime: new Date(0), duration: 0 };
  await reporter.onEnd?.(fullResult);
  await reporter.onExit?.();
  return JSON.parse(readFileSync(path, 'utf8')) as PlaywrightEvidence;
}

async function classifyVitest(evidence: VitestEvidence): Promise<ClassifiedPhase> {
  const fileOutcomes = evidence.modules.map((module) => ({
    name: module.file,
    status: module.state === 'passed' || module.state === 'skipped' ? 'passed' : 'failed',
    assertionResults: [{ status: module.state === 'failed' ? 'failed' : 'passed' }],
  }));
  const reporter = {
    success: evidence.terminalReason === 'passed' && evidence.globalErrors.length === 0 &&
      evidence.modules.every((module) => module.state === 'passed' || module.state === 'skipped'),
    numFailedTestSuites: fileOutcomes.filter((result) => result.status === 'failed').length,
    numFailedTests: fileOutcomes.filter((result) => result.status === 'failed').length,
    testResults: fileOutcomes,
  };
  const module = await verdictModule();
  return module.classifyPhase({
    kind: 'vitest',
    phase: evidence.phase,
    phaseInvocationId: evidence.phaseInvocationId,
    reporterPath: '/tmp/stock.json',
    evidencePath: '/tmp/evidence.json',
    reporter,
    evidence,
    stockRead: readable,
    evidenceRead: readable,
    exitCode: reporter.success ? 0 : 1,
    signal: null,
    spawnError: null,
    requestedFiles: evidence.phase === 'retry' ? evidence.specifications.map((specification) => specification.file) : null,
  });
}

async function classifyPlaywright(evidence: PlaywrightEvidence): Promise<ClassifiedPhase> {
  const files = [...new Set(evidence.tests.map((test) => test.file))];
  const specs = files.map((file) => {
    const matching = evidence.tests.filter((test) => test.file === file);
    const ok = matching.every((test) => test.status === 'passed' ||
      (test.status === 'skipped' && test.expectedStatus === 'skipped') ||
      (test.status === 'failed' && test.outcome === 'expected'));
    return { file: relative(resolve('tests'), file), ok, tests: matching.map((test) => ({ results: [{ status: test.status }] })) };
  });
  const reporter = {
    config: { rootDir: resolve('tests') },
    suites: [{ specs }],
    errors: evidence.globalErrors,
    stats: { expected: specs.filter((spec) => spec.ok).length, unexpected: specs.filter((spec) => !spec.ok).length, flaky: 0, skipped: 0 },
  };
  const module = await verdictModule();
  return module.classifyPhase({
    kind: 'playwright',
    phase: evidence.phase,
    phaseInvocationId: evidence.phaseInvocationId,
    reporterPath: '/tmp/stock.json',
    evidencePath: '/tmp/evidence.json',
    reporter,
    evidence,
    stockRead: readable,
    evidenceRead: readable,
    exitCode: reporter.stats.unexpected === 0 && reporter.errors.length === 0 ? 0 : 1,
    signal: null,
    spawnError: null,
    requestedFiles: evidence.phase === 'retry' ? files : null,
  });
}

describe('Vitest gate evidence reporter', () => {
  it('records a passing module with complete lifecycle provenance', async () => {
    const evidence = await vitestEvidence();
    expect(evidence.phaseInvocationId).toBe('vitest-unit-id');
    expect(evidence.lifecycle).toEqual({ onInit: true, onTestRunStart: true, onTestRunEnd: true });
    expect(evidence.modules[0]).toMatchObject({ state: 'passed', errors: [] });
    const actual = realVitestEvidence('passing');
    expect(actual.status).toBe(0);
    expect(actual.evidence.modules).toHaveLength(1);
    expect(actual.evidence.lifecycle.onTestRunEnd).toBe(true);
    const phase = await classifyVitest(evidence);
    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
    expect(phase.discovery.status).toBe('complete');
  });

  it('records collection/module failure details', async () => {
    const evidence = await vitestEvidence({ state: 'failed', moduleErrors: [new Error('collection failed')], reason: 'failed' });
    expect(evidence.modules[0]?.errors[0]?.message).toBe('collection failed');
    const actual = realVitestEvidence('collection');
    expect(actual.status).toBe(1);
    expect(actual.evidence.modules[0]?.errors.length).toBeGreaterThan(0);
    expect((await classifyVitest(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('records an intentional skipped module', async () => {
    const evidence = await vitestEvidence({ state: 'skipped' });
    expect(evidence.modules[0]?.state).toBe('skipped');
    const phase = await classifyVitest(evidence);
    expect(phase.reporterOutcome.status).toBe('passed');
    expect(phase.discovery.status).toBe('complete');
  });

  it('retains pending as unfinished native evidence', async () => {
    const evidence = await vitestEvidence({ state: 'pending' });
    expect(evidence.modules[0]?.state).toBe('pending');
    const phase = await classifyVitest(evidence);
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.status).toBe('failed');
  });

  it('retains queued as unfinished native evidence', async () => {
    const evidence = await vitestEvidence({ state: 'queued' });
    expect(evidence.modules[0]?.state).toBe('queued');
    const phase = await classifyVitest(evidence);
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.status).toBe('failed');
  });

  it('records global-only errors separately from modules', async () => {
    const evidence = await vitestEvidence({ globalErrors: [new Error('global boom')], reason: 'failed' });
    expect(evidence.globalErrors[0]?.message).toBe('global boom');
    expect(evidence.modules[0]?.state).toBe('passed');
    const actual = realVitestEvidence('global');
    expect(actual.status).toBe(1);
    expect(actual.evidence.globalErrors[0]?.message).toContain('intentional global error');
    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('runner-global-error');
  });

  it('records terminal interruption', async () => {
    const evidence = await vitestEvidence({ reason: 'interrupted' });
    expect(evidence.terminalReason).toBe('interrupted');
    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('runner-interrupted');
  });

  it('atomically rewrites evidence on process timeout', async () => {
    const evidence = await vitestEvidence({ state: 'failed', reason: 'failed', timeout: true });
    expect(evidence.processTimeoutObserved).toBe(true);
    expect(evidence.fatalReasons).toEqual(['vitest-process-timeout']);
    const actual = realVitestEvidence('process-timeout');
    expect(actual.evidence.processTimeoutObserved).toBe(true);
    expect(actual.evidence.fatalReasons).toEqual(['vitest-process-timeout']);
    const initial = await classifyVitest(evidence);
    expect(initial.reporterOutcome.reasons).toContain('vitest-process-timeout');
    const passing = await vitestEvidence();
    const retryEvidence: VitestEvidence = {
      ...passing,
      phase: 'retry',
      phaseInvocationId: 'vitest-retry-id',
    };
    const retry = await classifyVitest(retryEvidence);
    const module = await verdictModule();
    const verdict = module.reduceGateVerdict(initial, retry);
    expect(verdict.status).toBe('failed');
    expect(verdict.passedOnRetry).toEqual(['tests/example.test.ts']);
  });

  it('keeps project-aware identities for a duplicate path', async () => {
    const evidence = await vitestEvidence({ duplicate: true });
    expect(evidence.modules.map((module) => module.executionId)).toHaveLength(2);
    expect(new Set(evidence.modules.map((module) => module.executionId)).size).toBe(2);
    const actual = realVitestEvidence('duplicate');
    expect(actual.status).toBe(0);
    expect(new Set(actual.evidence.modules.map((module) => module.executionId)).size).toBe(2);
    expect((await classifyVitest(evidence)).discovery.status).toBe('complete');
  });

  it('records root passWithNoTests true for an empty run', async () => {
    const evidence = await vitestEvidence({ empty: true, passWithNoTests: true });
    expect(evidence.passWithNoTests).toBe(true);
    expect(evidence.specifications).toEqual([]);
    const actual = realVitestEvidence('empty-true');
    expect(actual.status).toBe(0);
    expect(actual.evidence.passWithNoTests).toBe(true);
    expect(actual.evidence.specifications).toEqual([]);
    const phase = await classifyVitest(evidence);
    expect(phase.reporterOutcome.status).toBe('passed');
    expect(phase.discovery.status).toBe('complete');
  });

  it('records root passWithNoTests false for an empty run', async () => {
    const evidence = await vitestEvidence({ empty: true, passWithNoTests: false, reason: 'failed' });
    expect(evidence.passWithNoTests).toBe(false);
    expect(evidence.specifications).toEqual([]);
    const actual = realVitestEvidence('empty-false');
    expect(actual.status).toBe(1);
    expect(actual.evidence.passWithNoTests).toBe(false);
    expect(actual.evidence.specifications).toEqual([]);
    expect((await classifyVitest(evidence)).reporterOutcome.reasons).toContain('empty-run-not-allowed');
  });
});

describe('Playwright gate evidence reporter', () => {
  it('records an expected pass', async () => {
    const evidence = await playwrightEvidence();
    expect(evidence.tests[0]).toMatchObject({ status: 'passed', outcome: 'expected' });
    const phase = await classifyPlaywright(evidence);
    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
    expect(phase.discovery.status).toBe('complete');
  });

  it('records an unexpected assertion failure', async () => {
    const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed' });
    expect(evidence.tests[0]).toMatchObject({ status: 'failed', outcome: 'unexpected' });
    expect((await classifyPlaywright(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('records an individual timed-out result distinctly', async () => {
    const evidence = await playwrightEvidence({ status: 'timedOut', outcome: 'unexpected', fullStatus: 'failed' });
    expect(evidence.tests[0]?.status).toBe('timedOut');
    expect((await classifyPlaywright(evidence)).fileOutcomes).toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('records intentional skip with callback and expected status', async () => {
    const evidence = await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'skipped' });
    expect(evidence.tests[0]).toMatchObject({ status: 'skipped', expectedStatus: 'skipped', onTestEndObserved: true });
    const phase = await classifyPlaywright(evidence);
    expect(phase.reporterOutcome.status).toBe('passed');
    expect(phase.discovery.status).toBe('complete');
  });

  it('records started without terminal callback', async () => {
    const evidence = await playwrightEvidence({ end: false });
    expect(evidence.tests[0]).toMatchObject({ onTestBeginObserved: true, onTestEndObserved: false });
    const phase = await classifyPlaywright(evidence);
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.status).toBe('failed');
  });

  it('records synthesized skipped nonexecution', async () => {
    const evidence = await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'passed', begin: false });
    expect(evidence.tests[0]).toMatchObject({ status: 'skipped', expectedStatus: 'passed', onTestBeginObserved: false, onTestEndObserved: true });
    const phase = await classifyPlaywright(evidence);
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.status).toBe('failed');
  });

  it('records global FullResult timedout', async () => {
    const evidence = await playwrightEvidence({ fullStatus: 'timedout' });
    expect(evidence.fullResultStatus).toBe('timedout');
    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-global-timeout');
  });

  it('records global FullResult interrupted', async () => {
    const evidence = await playwrightEvidence({ fullStatus: 'interrupted' });
    expect(evidence.fullResultStatus).toBe('interrupted');
    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-interrupted');
  });

  it('records global-only onError', async () => {
    const evidence = await playwrightEvidence({ globalError: new Error('global boom'), fullStatus: 'failed' });
    expect(evidence.globalErrors[0]?.message).toBe('global boom');
    expect((await classifyPlaywright(evidence)).reporterOutcome.reasons).toContain('runner-global-error');
  });

  it('keeps an independent unfinished duplicate-project execution', async () => {
    const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed', duplicateUnfinished: true });
    expect(evidence.discovered.map((test) => test.executionId)).toHaveLength(2);
    expect(evidence.tests.find((test) => test.executionId.includes('test-b'))?.onTestEndObserved).toBe(false);
    const phase = await classifyPlaywright(evidence);
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.status).toBe('failed');
  });

  it('preserves repeated terminal callbacks for classifier rejection', async () => {
    const evidence = await playwrightEvidence({ repeatEnd: true });
    expect(evidence.tests.map((test) => test.executionId)).toHaveLength(2);
    expect((await classifyPlaywright(evidence)).discovery.status).toBe('failed');
  });
});
