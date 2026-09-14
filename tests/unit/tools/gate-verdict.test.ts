import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from '../../helpers/test-filesystem';

type Kind = 'vitest' | 'playwright';
type Phase = 'initial' | 'retry';

interface ArtifactRead {
  readonly status: 'readable' | 'missing' | 'unreadable' | 'malformed';
  readonly error: string | null;
}

interface PhaseInput {
  readonly kind: Kind;
  readonly phase: Phase;
  readonly phaseInvocationId: string;
  readonly reporterPath: string;
  readonly evidencePath: string;
  readonly reporter: unknown;
  readonly evidence: unknown;
  readonly stockRead: ArtifactRead;
  readonly evidenceRead: ArtifactRead;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly spawnError: null | { readonly code: string | null; readonly message: string };
  readonly requestedFiles: readonly string[] | null;
}

interface ClassifiedPhase {
  readonly phase: Phase;
  readonly process: { readonly status: string; readonly reasons: readonly string[] };
  readonly reporterOutcome: { readonly status: string; readonly reasons: readonly string[] };
  readonly discovery: {
    readonly status: string;
    readonly missingExecutionIds: readonly string[];
    readonly duplicateExecutionIds: readonly string[];
    readonly mismatchedExecutionIds: readonly string[];
    readonly fileSetMismatch: boolean;
  };
  readonly fileOutcomes: readonly { readonly file: string; readonly status: string; readonly executionIds: readonly string[] }[];
}

interface VerdictModule {
  classifyPhase(value: PhaseInput): unknown;
  readJsonArtifact(path: string): { readonly read: ArtifactRead };
  reduceGateVerdict(initial: ClassifiedPhase, retry: ClassifiedPhase | null): {
    readonly status: 'passed' | 'failed';
    readonly passedOnRetry: readonly string[];
    readonly phaseFailures: readonly { readonly phase: Phase; readonly domain: string }[];
  };
}

async function verdictModule(): Promise<VerdictModule> {
  const modulePath = new URL('../../../tools/gate-verdict.mjs', import.meta.url).href;
  return await import(modulePath) as unknown as VerdictModule;
}

const readable: ArtifactRead = { status: 'readable', error: null };

function evidence(kind: Kind, phase: Phase, id: string, status: 'passed' | 'failed' = 'passed'): unknown {
  const file = resolve(kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts');
  const executionId = `unit:test:${file}`;
  if (kind === 'vitest') {
    return {
      version: 1,
      kind,
      phase,
      phaseInvocationId: id,
      lifecycle: { onInit: true, onTestRunStart: true, onTestRunEnd: true },
      passWithNoTests: false,
      specifications: [{ executionId, file, projectName: 'unit', taskId: 'test' }],
      modules: [{ executionId, file, projectName: 'unit', state: status, errors: [] }],
      globalErrors: [],
      terminalReason: status === 'failed' ? 'failed' : 'passed',
      processTimeoutObserved: false,
      fatalReasons: [],
    };
  }
  return {
    version: 1,
    kind,
    phase,
    phaseInvocationId: id,
    lifecycle: { onBegin: true, onEnd: true, onExit: true },
    discovered: [{ executionId, file, projectName: 'unit', testId: 'test' }],
    tests: [{
      executionId,
      file,
      projectName: 'unit',
      testId: 'test',
      status,
      outcome: status === 'failed' ? 'unexpected' : 'expected',
      expectedStatus: 'passed',
      onTestBeginObserved: true,
      onTestEndObserved: true,
      errors: [],
    }],
    globalErrors: [],
    fullResultStatus: status === 'failed' ? 'failed' : 'passed',
    fatalReasons: [],
  };
}

function stock(kind: Kind, status: 'passed' | 'failed' = 'passed'): unknown {
  const file = resolve(kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts');
  if (kind === 'vitest') {
    return {
      success: status === 'passed',
      numFailedTestSuites: status === 'failed' ? 1 : 0,
      numFailedTests: status === 'failed' ? 1 : 0,
      testResults: [{ name: file, status, assertionResults: [{ status }] }],
    };
  }
  return {
    config: { rootDir: resolve('tests/browser') },
    suites: [{ specs: [{ file: 'example.spec.ts', ok: status === 'passed', tests: [{ results: [{ status }] }] }] }],
    errors: [],
    stats: { expected: status === 'passed' ? 1 : 0, unexpected: status === 'failed' ? 1 : 0, flaky: 0, skipped: 0 },
  };
}

function input(kind: Kind, phase: Phase = 'initial', status: 'passed' | 'failed' = 'passed'): PhaseInput {
  return {
    kind,
    phase,
    phaseInvocationId: 'phase-id',
    reporterPath: '/tmp/stock.json',
    evidencePath: '/tmp/evidence.json',
    reporter: stock(kind, status),
    evidence: evidence(kind, phase, 'phase-id', status),
    stockRead: readable,
    evidenceRead: readable,
    exitCode: status === 'failed' ? 1 : 0,
    signal: null,
    spawnError: null,
    requestedFiles: phase === 'retry'
      ? [kind === 'vitest' ? 'tests/unit/example.test.ts' : 'tests/browser/example.spec.ts']
      : null,
  };
}

async function classify(value: PhaseInput): Promise<ClassifiedPhase> {
  const module = await verdictModule();
  return module.classifyPhase(value) as ClassifiedPhase;
}

describe('gate phase classifier', () => {
  it('classifies Vitest exit 1 with an attributable file as ordinary failure', async () => {
    expect((await classify(input('vitest', 'initial', 'failed'))).process.status).toBe('ordinary-file-failure');
  });

  it('classifies Playwright exit 1 with an attributable file as ordinary failure', async () => {
    expect((await classify(input('playwright', 'initial', 'failed'))).process.status).toBe('ordinary-file-failure');
  });

  it('resolves native Playwright stock paths from a validated rootDir', async () => {
    const rootDir = resolve('tests/browser');
    const nativeStock = {
      config: { rootDir },
      suites: [{ specs: [{ file: 'example.spec.ts', ok: true, tests: [{ results: [{ status: 'passed' }] }] }] }],
      errors: [],
      stats: { expected: 1, unexpected: 0, flaky: 0, skipped: 0 },
    };
    const phase = await classify({ ...input('playwright'), reporter: nativeStock });
    expect(phase.reporterOutcome).toEqual(expect.objectContaining({ status: 'passed', reasons: [] }));
    expect(phase.discovery.status).toBe('complete');

    const relativeRoot = await classify({
      ...input('playwright'),
      reporter: { ...nativeStock, config: { rootDir: 'tests/browser' } },
    });
    expect(relativeRoot.reporterOutcome.reasons).toContain('stock-report-malformed');
    const outsideRoot = await classify({
      ...input('playwright'),
      reporter: { ...nativeStock, config: { rootDir: resolve('..') } },
    });
    expect(outsideRoot.reporterOutcome.reasons).toContain('stock-report-malformed');
  });

  it('classifies late exit 1 after successful reports as process failure', async () => {
    const phase = await classify({ ...input('vitest'), exitCode: 1 });
    expect(phase.process.status).toBe('failed');
    expect(phase.reporterOutcome.status).toBe('passed');
  });

  it('classifies exit 2 as process failure', async () => {
    expect((await classify({ ...input('vitest'), exitCode: 2 })).process.reasons).toEqual(['process-exit-2']);
  });

  it('classifies a signal independently of exit status', async () => {
    expect((await classify({ ...input('playwright'), exitCode: null, signal: 'SIGTERM' })).process.reasons)
      .toContain('process-signal-SIGTERM');
  });

  it('classifies a structured spawn error', async () => {
    const phase = await classify({
      ...input('vitest'),
      reporter: null,
      evidence: null,
      stockRead: { status: 'missing', error: 'ENOENT' },
      evidenceRead: { status: 'missing', error: 'ENOENT' },
      exitCode: null,
      spawnError: { code: 'ENOENT', message: 'spawnSync flock ENOENT' },
    });
    expect(phase.process.reasons).toContain('spawn-error-ENOENT');
    expect(phase.discovery.status).toBe('uncertified');
  });

  it('distinguishes malformed JSON', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-gate-malformed-'));
    const path = join(directory, 'bad.json');
    writeFileSync(path, '{not json', 'utf8');
    const module = await verdictModule();
    expect(module.readJsonArtifact(path).read.status).toBe('malformed');
  });

  it('distinguishes unreadable evidence from missing and malformed', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-gate-unreadable-'));
    const path = join(directory, 'evidence-directory');
    mkdirSync(path);
    const module = await verdictModule();
    expect(module.readJsonArtifact(path).read.status).toBe('unreadable');
  });

  it('does not let a retry process failure authorize green', async () => {
    const module = await verdictModule();
    const initial = await classify(input('vitest', 'initial', 'failed'));
    const retry = await classify({ ...input('vitest', 'retry'), exitCode: 2 });
    expect(module.reduceGateVerdict(initial, retry).phaseFailures).toContainEqual(expect.objectContaining({ phase: 'retry', domain: 'process' }));
  });

  it('does not let a retry reporter/global failure authorize green', async () => {
    const module = await verdictModule();
    const initial = await classify(input('vitest', 'initial', 'failed'));
    const badEvidence = evidence('vitest', 'retry', 'phase-id') as { globalErrors: unknown[] };
    badEvidence.globalErrors = [{ name: 'Error', message: 'global' }];
    const retry = await classify({ ...input('vitest', 'retry'), evidence: badEvidence });
    expect(retry.reporterOutcome.reasons).toContain('runner-global-error');
    const verdict = module.reduceGateVerdict(initial, retry);
    expect(verdict.status).toBe('failed');
    expect(verdict.passedOnRetry).toEqual(['tests/unit/example.test.ts']);
    expect(verdict.phaseFailures).toContainEqual(expect.objectContaining({ phase: 'retry', domain: 'reporter' }));
    const unexplainedEvidence = evidence('vitest', 'retry', 'phase-id') as { terminalReason: string };
    unexplainedEvidence.terminalReason = 'failed';
    const unexplained = await classify({ ...input('vitest', 'retry'), reporter: stock('vitest'), evidence: unexplainedEvidence });
    expect(unexplained.reporterOutcome.reasons).toEqual(expect.arrayContaining([
      'runner-unexplained-failure',
      'stock-evidence-mismatch',
    ]));
  });

  it('fails retry discovery when the requested file is omitted', async () => {
    const retryInput = input('playwright', 'retry');
    const omitted = evidence('playwright', 'retry', 'phase-id') as { discovered: unknown[]; tests: unknown[] };
    omitted.discovered = [];
    omitted.tests = [];
    const retry = await classify({ ...retryInput, evidence: omitted });
    expect(retry.discovery.status).toBe('failed');
  });

  it('rejects duplicate terminal execution ids before deduplication', async () => {
    const duplicated = evidence('vitest', 'initial', 'phase-id') as {
      modules: Array<Record<string, unknown>>;
    };
    const first = duplicated.modules[0];
    if (first === undefined) throw new Error('Expected one module fixture.');
    duplicated.modules.push({ ...first });
    const phase = await classify({ ...input('vitest'), evidence: duplicated });
    expect(phase.discovery.status).toBe('failed');
    expect(phase.discovery.duplicateExecutionIds).toEqual([first.executionId]);
  });

  it('rejects a scheduled execution id reported for a substituted file', async () => {
    const substituted = evidence('vitest', 'initial', 'phase-id') as {
      modules: Array<Record<string, unknown>>;
    };
    const module = substituted.modules[0];
    if (module === undefined) throw new Error('Expected one module fixture.');
    const unlisted = resolve('tests/unit/unlisted.test.ts');
    module.file = unlisted;
    const reporter = {
      success: true,
      numFailedTestSuites: 0,
      numFailedTests: 0,
      testResults: [{ name: unlisted, status: 'passed', assertionResults: [{ status: 'passed' }] }],
    };
    const phase = await classify({ ...input('vitest'), reporter, evidence: substituted });
    expect(phase.discovery.status).toBe('failed');
    expect(phase.discovery.mismatchedExecutionIds).toEqual([module.executionId]);
  });

  it('rejects a reported file set different from the scheduled file set', async () => {
    const unlistedEvidence = evidence('vitest', 'initial', 'phase-id') as {
      modules: Array<Record<string, unknown>>;
    };
    const unlisted = resolve('tests/unit/unlisted.test.ts');
    unlistedEvidence.modules = [{
      executionId: `unit:unlisted:${unlisted}`,
      file: unlisted,
      projectName: 'unit',
      state: 'passed',
      errors: [],
    }];
    const reporter = {
      success: true,
      numFailedTestSuites: 0,
      numFailedTests: 0,
      testResults: [{ name: unlisted, status: 'passed', assertionResults: [{ status: 'passed' }] }],
    };
    const phase = await classify({ ...input('vitest'), reporter, evidence: unlistedEvidence });
    expect(phase.discovery.status).toBe('failed');
    expect(phase.discovery.fileSetMismatch).toBe(true);
  });

  it('aggregates duplicate Vitest stock paths with failure dominance in either order and permits exact retry', async () => {
    const module = await verdictModule();
    const file = resolve('tests/unit/example.test.ts');
    const mixedEvidence = evidence('vitest', 'initial', 'phase-id', 'failed') as {
      specifications: Array<Record<string, unknown>>;
      modules: Array<Record<string, unknown>>;
    };
    const secondId = `other:test-b:${file}`;
    mixedEvidence.specifications.push({ executionId: secondId, file, projectName: 'other', taskId: 'test-b' });
    mixedEvidence.modules.push({ executionId: secondId, file, projectName: 'other', state: 'passed', errors: [] });
    const failedResult = { name: file, status: 'failed', assertionResults: [{ status: 'failed' }] };
    const passedResult = { name: file, status: 'passed', assertionResults: [{ status: 'passed' }] };
    const phases = await Promise.all([
      [failedResult, passedResult],
      [passedResult, failedResult],
    ].map((testResults) => classify({
      ...input('vitest', 'initial', 'failed'),
      reporter: { success: false, numFailedTestSuites: 1, numFailedTests: 1, testResults },
      evidence: mixedEvidence,
    })));
    expect(phases.map((phase) => phase.reporterOutcome)).toEqual([
      expect.objectContaining({ status: 'passed', reasons: [] }),
      expect.objectContaining({ status: 'passed', reasons: [] }),
    ]);
    const retry = await classify(input('vitest', 'retry', 'passed'));
    expect(phases.map((phase) => module.reduceGateVerdict(phase, retry).status)).toEqual(['passed', 'passed']);
  });

  it('rejects sidecar invocation UUID mismatch', async () => {
    const phase = await classify({ ...input('vitest'), evidence: evidence('vitest', 'initial', 'other-id') });
    expect(phase.reporterOutcome.reasons).toContain('evidence-invocation-mismatch');
  });

  it('rejects sidecar kind mismatch', async () => {
    const mismatched = evidence('vitest', 'initial', 'phase-id') as { kind: string };
    mismatched.kind = 'playwright';
    expect((await classify({ ...input('vitest'), evidence: mismatched })).reporterOutcome.reasons)
      .toContain('evidence-kind-mismatch');
  });

  it('rejects sidecar phase mismatch', async () => {
    const mismatched = evidence('vitest', 'initial', 'phase-id') as { phase: string };
    mismatched.phase = 'retry';
    expect((await classify({ ...input('vitest'), evidence: mismatched })).reporterOutcome.reasons)
      .toContain('evidence-phase-mismatch');
  });

  it('retains independent unfinished execution beside a failed duplicate path', async () => {
    const value = evidence('playwright', 'initial', 'phase-id', 'failed') as {
      discovered: Array<{ executionId: string; file: string; projectName: string; testId: string }>;
      tests: Array<Record<string, unknown>>;
    };
    const file = resolve('tests/browser/example.spec.ts');
    value.discovered.push({ executionId: `other:test-b:${file}`, file, projectName: 'other', testId: 'test-b' });
    const phase = await classify({ ...input('playwright', 'initial', 'failed'), evidence: value });
    expect(phase.fileOutcomes).toContainEqual(expect.objectContaining({ file: 'tests/browser/example.spec.ts', status: 'failed' }));
    expect(phase.reporterOutcome.reasons).toContain('execution-unfinished');
    expect(phase.discovery.missingExecutionIds).toEqual([`other:test-b:${file}`]);
  });
});
