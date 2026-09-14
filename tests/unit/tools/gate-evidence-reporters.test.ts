import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

interface NormalizedError {
  readonly name: string;
  readonly message: string;
}

interface VitestEvidence {
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
  readonly phaseInvocationId: string;
  readonly fullResultStatus: string | null;
  readonly globalErrors: readonly NormalizedError[];
  readonly discovered: readonly { readonly executionId: string; readonly file: string }[];
  readonly tests: readonly {
    readonly executionId: string;
    readonly status: string;
    readonly outcome: string;
    readonly expectedStatus: string;
    readonly onTestBeginObserved: boolean;
    readonly onTestEndObserved: boolean;
  }[];
  readonly lifecycle: { readonly onBegin: boolean; readonly onEnd: boolean; readonly onExit: boolean };
}

interface VitestReporterModule {
  readonly default: new () => {
    onInit(value: unknown): void;
    onTestRunStart(value: readonly unknown[]): void;
    onTestRunEnd(modules: readonly unknown[], errors: readonly unknown[], reason: string): void;
    onProcessTimeout(): void;
  };
}

interface PlaywrightReporterModule {
  readonly default: new () => {
    onBegin(config: unknown, suite: unknown): void;
    onTestBegin(test: unknown, result: unknown): void;
    onTestEnd(test: unknown, result: unknown): void;
    onError(error: unknown): void;
    onEnd(result: unknown): void;
    onExit(): void;
  };
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
  const reporter = new imported.default();
  reporter.onInit({ config: { passWithNoTests: input.passWithNoTests ?? false } });
  const files = input.empty ? [] : [resolve('tests/example.test.ts')];
  const specs = files.flatMap((file) => {
    const base = [{ taskId: 'task-a', moduleId: file, project: { hash: 'project-a', name: 'unit' } }];
    return input.duplicate
      ? [...base, { taskId: 'task-b', moduleId: file, project: { hash: 'project-b', name: 'other' } }]
      : base;
  });
  reporter.onTestRunStart(specs);
  const modules = specs.map((specification) => ({
    id: specification.taskId,
    moduleId: specification.moduleId,
    project: specification.project,
    state: () => input.state ?? 'passed',
    errors: () => [...(input.moduleErrors ?? [])],
  }));
  reporter.onTestRunEnd(modules, [...(input.globalErrors ?? [])], input.reason ?? 'passed');
  if (input.timeout) reporter.onProcessTimeout();
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
  const reporter = new imported.default();
  const file = resolve('tests/example.spec.ts');
  const makeTest = (id: string, projectName: string) => ({
    id,
    location: { file, line: 1, column: 1 },
    expectedStatus: input.expectedStatus ?? 'passed',
    parent: { project: () => ({ name: projectName }) },
    outcome: () => input.outcome ?? 'expected',
  });
  const tests = [makeTest('test-a', 'unit')];
  if (input.duplicateUnfinished) tests.push(makeTest('test-b', 'other'));
  reporter.onBegin({}, { allTests: () => tests });
  const first = tests[0];
  if (first === undefined) throw new Error('Fixture test missing.');
  if (input.begin ?? true) reporter.onTestBegin(first, {});
  if (input.end ?? true) reporter.onTestEnd(first, { status: input.status ?? 'passed', errors: [] });
  if (input.globalError !== undefined) reporter.onError(input.globalError);
  reporter.onEnd({ status: input.fullStatus ?? 'passed' });
  reporter.onExit();
  return JSON.parse(readFileSync(path, 'utf8')) as PlaywrightEvidence;
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
  });

  it('records collection/module failure details', async () => {
    const evidence = await vitestEvidence({ state: 'failed', moduleErrors: [new Error('collection failed')], reason: 'failed' });
    expect(evidence.modules[0]?.errors[0]?.message).toBe('collection failed');
    const actual = realVitestEvidence('collection');
    expect(actual.status).toBe(1);
    expect(actual.evidence.modules[0]?.errors.length).toBeGreaterThan(0);
  });

  it('records an intentional skipped module', async () => {
    expect((await vitestEvidence({ state: 'skipped' })).modules[0]?.state).toBe('skipped');
  });

  it('retains pending as unfinished native evidence', async () => {
    expect((await vitestEvidence({ state: 'pending' })).modules[0]?.state).toBe('pending');
  });

  it('retains queued as unfinished native evidence', async () => {
    expect((await vitestEvidence({ state: 'queued' })).modules[0]?.state).toBe('queued');
  });

  it('records global-only errors separately from modules', async () => {
    const evidence = await vitestEvidence({ globalErrors: [new Error('global boom')], reason: 'failed' });
    expect(evidence.globalErrors[0]?.message).toBe('global boom');
    expect(evidence.modules[0]?.state).toBe('passed');
    const actual = realVitestEvidence('global');
    expect(actual.status).toBe(1);
    expect(actual.evidence.globalErrors[0]?.message).toContain('intentional global error');
  });

  it('records terminal interruption', async () => {
    expect((await vitestEvidence({ reason: 'interrupted' })).terminalReason).toBe('interrupted');
  });

  it('atomically rewrites evidence on process timeout', async () => {
    const evidence = await vitestEvidence({ state: 'failed', reason: 'failed', timeout: true });
    expect(evidence.processTimeoutObserved).toBe(true);
    expect(evidence.fatalReasons).toEqual(['vitest-process-timeout']);
    const actual = realVitestEvidence('process-timeout');
    expect(actual.evidence.processTimeoutObserved).toBe(true);
    expect(actual.evidence.fatalReasons).toEqual(['vitest-process-timeout']);
  });

  it('keeps project-aware identities for a duplicate path', async () => {
    const evidence = await vitestEvidence({ duplicate: true });
    expect(evidence.modules.map((module) => module.executionId)).toHaveLength(2);
    expect(new Set(evidence.modules.map((module) => module.executionId)).size).toBe(2);
    const actual = realVitestEvidence('duplicate');
    expect(actual.status).toBe(0);
    expect(new Set(actual.evidence.modules.map((module) => module.executionId)).size).toBe(2);
  });

  it('records root passWithNoTests true for an empty run', async () => {
    const evidence = await vitestEvidence({ empty: true, passWithNoTests: true });
    expect(evidence.passWithNoTests).toBe(true);
    expect(evidence.specifications).toEqual([]);
    const actual = realVitestEvidence('empty-true');
    expect(actual.status).toBe(0);
    expect(actual.evidence.passWithNoTests).toBe(true);
    expect(actual.evidence.specifications).toEqual([]);
  });

  it('records root passWithNoTests false for an empty run', async () => {
    const evidence = await vitestEvidence({ empty: true, passWithNoTests: false, reason: 'failed' });
    expect(evidence.passWithNoTests).toBe(false);
    expect(evidence.specifications).toEqual([]);
    const actual = realVitestEvidence('empty-false');
    expect(actual.status).toBe(1);
    expect(actual.evidence.passWithNoTests).toBe(false);
    expect(actual.evidence.specifications).toEqual([]);
  });
});

describe('Playwright gate evidence reporter', () => {
  it('records an expected pass', async () => {
    expect((await playwrightEvidence()).tests[0]).toMatchObject({ status: 'passed', outcome: 'expected' });
  });

  it('records an unexpected assertion failure', async () => {
    expect((await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed' })).tests[0])
      .toMatchObject({ status: 'failed', outcome: 'unexpected' });
  });

  it('records an individual timed-out result distinctly', async () => {
    expect((await playwrightEvidence({ status: 'timedOut', outcome: 'unexpected', fullStatus: 'failed' })).tests[0]?.status)
      .toBe('timedOut');
  });

  it('records intentional skip with callback and expected status', async () => {
    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'skipped' })).tests[0])
      .toMatchObject({ status: 'skipped', expectedStatus: 'skipped', onTestEndObserved: true });
  });

  it('records started without terminal callback', async () => {
    expect((await playwrightEvidence({ end: false })).tests[0])
      .toMatchObject({ onTestBeginObserved: true, onTestEndObserved: false });
  });

  it('records synthesized skipped nonexecution', async () => {
    expect((await playwrightEvidence({ status: 'skipped', outcome: 'skipped', expectedStatus: 'passed', begin: false })).tests[0])
      .toMatchObject({ status: 'skipped', expectedStatus: 'passed', onTestBeginObserved: false, onTestEndObserved: true });
  });

  it('records global FullResult timedout', async () => {
    expect((await playwrightEvidence({ fullStatus: 'timedout' })).fullResultStatus).toBe('timedout');
  });

  it('records global FullResult interrupted', async () => {
    expect((await playwrightEvidence({ fullStatus: 'interrupted' })).fullResultStatus).toBe('interrupted');
  });

  it('records global-only onError', async () => {
    expect((await playwrightEvidence({ globalError: new Error('global boom'), fullStatus: 'failed' })).globalErrors[0]?.message)
      .toBe('global boom');
  });

  it('keeps an independent unfinished duplicate-project execution', async () => {
    const evidence = await playwrightEvidence({ status: 'failed', outcome: 'unexpected', fullStatus: 'failed', duplicateUnfinished: true });
    expect(evidence.discovered.map((test) => test.executionId)).toHaveLength(2);
    expect(evidence.tests.find((test) => test.executionId.includes('test-b'))?.onTestEndObserved).toBe(false);
  });
});
