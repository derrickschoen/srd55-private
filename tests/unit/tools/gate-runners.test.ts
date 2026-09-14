import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseCLI } from 'vitest/node';
import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
} from '../../helpers/test-filesystem';

type RunnerKind = 'vitest' | 'playwright';
type VitestArgvProbe =
  | 'default'
  | 'complex'
  | 'initial-file-parallelism'
  | 'initial-serial'
  | 'retry-isolate-false'
  | 'retry-coverage-false'
  | 'retry-config-loader';
type Scenario =
  | 'clean'
  | 'flaky'
  | 'failed'
  | 'missing_retry'
  | 'exit2'
  | 'signal'
  | 'spawn_error'
  | 'global_then_pass'
  | 'stock_missing'
  | 'partial_retry'
  | 'ordinary_retry'
  | 'late_exit1'
  | 'sidecar_missing'
  | 'process_timeout'
  | 'playwright_timeout';

interface PhaseFailure {
  readonly phase: 'initial' | 'retry';
  readonly domain: 'process' | 'reporter' | 'discovery';
  readonly reasons: readonly string[];
}

interface GatePhase {
  readonly loadAverage: readonly number[];
  readonly durationMs: number;
  readonly reporterPath: string;
  readonly evidencePath: string;
  readonly process: {
    readonly status: 'passed' | 'ordinary-file-failure' | 'failed';
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly spawnError: null | { readonly code: string | null; readonly message: string };
    readonly reasons: readonly string[];
  };
  readonly reporterOutcome: { readonly status: 'passed' | 'failed'; readonly reasons: readonly string[] };
  readonly discovery: {
    readonly status: 'complete' | 'failed' | 'uncertified';
    readonly missingExecutionIds: readonly string[];
    readonly requestedFiles: readonly string[];
    readonly reportedFiles: readonly string[];
  };
  readonly fileOutcomes: readonly { readonly file: string; readonly status: string }[];
  readonly command: { readonly arguments: readonly string[] };
}

interface GateReport {
  readonly version: number;
  readonly phases: {
    readonly initial: GatePhase;
    readonly retry: GatePhase | null;
  };
  readonly verdict: {
    readonly status: 'passed' | 'failed';
    readonly passedOnRetry: readonly string[];
    readonly failedFiles: readonly string[];
    readonly phaseFailures: readonly PhaseFailure[];
  };
}

interface StubLog {
  readonly type: 'command' | 'flock';
  readonly kind?: RunnerKind;
  readonly phase?: 'initial' | 'retry';
  readonly arguments: readonly string[];
}

interface GateRun {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly report: GateReport;
  readonly logs: readonly StubLog[];
  readonly failedFile: string;
  readonly unrelatedFile: string;
}

function runGate(kind: RunnerKind, scenario: Scenario, argvProbe: VitestArgvProbe = 'default'): GateRun {
  const directory = mkdtempSync(join(tmpdir(), `dnd-${kind}-gate-test-`));
  const logPath = join(directory, 'stub.jsonl');
  const emptyPath = join(directory, 'empty-path');
  mkdirSync(emptyPath);
  const failedFile = kind === 'vitest'
    ? 'tests/unit/example.test.ts'
    : 'tests/browser/example.spec.ts';
  const unrelatedFile = kind === 'vitest'
    ? 'tests/unit/not-failed.test.ts'
    : 'tests/browser/not-failed.spec.ts';
  const runner = resolve(`tools/gate-${kind}.mjs`);
  const commandModuleVariable = kind === 'vitest'
    ? 'DND_GATE_VITEST_MODULE'
    : 'DND_GATE_PLAYWRIGHT_MODULE';
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DND_GATE_REPORT_DIR: directory,
    DND_GATE_STUB_FILE: failedFile,
    DND_GATE_STUB_UNRELATED_FILE: unrelatedFile,
    DND_GATE_STUB_LOG: logPath,
    DND_GATE_STUB_SCENARIO: scenario,
    [commandModuleVariable]: resolve('tests/fixtures/fake-gate-command.mjs'),
  };
  if (scenario === 'spawn_error') {
    delete environment.DND_GATE_FLOCK_MODULE;
    environment.PATH = emptyPath;
  } else {
    environment.DND_GATE_FLOCK_MODULE = resolve('tests/fixtures/fake-flock.mjs');
  }
  const selectors = kind === 'vitest'
    ? argvProbe === 'complex'
      ? [
        '-c', 'tests/fixtures/gate-vitest-proof.config.mts',
        '--project', 'unit', '--project=other',
        '-t', 'probe name', '--environment=node', '--pool', 'forks',
        '--passWithNoTests', '--shard=1/2', '--changed=false',
      ]
      : argvProbe === 'initial-file-parallelism'
        ? ['--fileParallelism']
        : argvProbe === 'initial-serial'
          ? ['--no-file-parallelism', '--maxWorkers=1']
          : argvProbe === 'retry-isolate-false'
            ? ['--isolate', 'false']
            : argvProbe === 'retry-coverage-false'
              ? ['--coverage', 'false']
              : argvProbe === 'retry-config-loader'
                ? ['--configLoader', 'runner']
                : ['--config', 'tests/fixtures/gate-vitest-proof.config.mts', '--project=unit']
    : ['--project=chromium'];
  const selectedFiles = argvProbe === 'complex' ? [failedFile, unrelatedFile] : [failedFile];
  const tail = argvProbe === 'complex' ? ['--', '--node-tail', 'tail-value'] : [];
  const result = spawnSync(
    process.execPath,
    [runner, ...selectors, ...selectedFiles, ...tail],
    { cwd: process.cwd(), encoding: 'utf8', env: environment },
  );
  const finalReport = readdirSync(directory).find((name) => name.includes('-gate-') && name.endsWith('.json'));
  if (finalReport === undefined) throw new Error(`Gate runner wrote no final report. stderr: ${result.stderr}`);
  const report = JSON.parse(readFileSync(join(directory, finalReport), 'utf8')) as GateReport;
  const logs = existsSync(logPath)
    ? readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as StubLog)
    : [];
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    report,
    logs,
    failedFile,
    unrelatedFile,
  };
}

function reasons(run: GateRun, phase: 'initial' | 'retry', domain: PhaseFailure['domain']): readonly string[] {
  return run.report.verdict.phaseFailures
    .filter((failure) => failure.phase === phase && failure.domain === domain)
    .flatMap((failure) => failure.reasons);
}

describe.each(['vitest', 'playwright'] as const)('%s gate retained behavior', (kind) => {
  it('retains clean, serial retry, lock, phase order, and factual headings', () => {
    const clean = runGate(kind, 'clean');
    expect(clean.report.version).toBe(2);
    expect(clean.status).toBe(0);
    expect(clean.report.verdict).toEqual({ status: 'passed', passedOnRetry: [], failedFiles: [], phaseFailures: [] });
    expect(clean.report.phases.retry).toBeNull();

    const retried = runGate(kind, 'flaky');
    expect(retried.status).toBe(0);
    expect(retried.report.verdict.passedOnRetry).toEqual([retried.failedFile]);
    expect(retried.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial', 'retry']);
    const retryCommand = retried.logs.filter((entry) => entry.type === 'command')[1];
    expect(retryCommand?.arguments).toContain(retried.failedFile);
    expect(retryCommand?.arguments).not.toContain(retried.unrelatedFile);
    expect(retryCommand?.arguments).toContain(kind === 'vitest' ? '--no-file-parallelism' : '--workers=1');
    expect(retried.logs.filter((entry) => entry.type === 'flock')[1]?.arguments.slice(0, 3))
      .toEqual(['-w', '7200', '/tmp/dnd-gate.lock']);
    expect(retried.stdout).toContain('PASSED ON RETRY (cause not inferred)');
    expect(retried.stdout).toContain('FAILED FILES');
    expect(retried.stdout).toContain('PHASE FAILURES');

    const failed = runGate(kind, 'failed');
    expect(failed.status).toBe(1);
    expect(failed.report.verdict.failedFiles).toEqual([failed.failedFile]);
    expect(failed.report.phases.initial.loadAverage).toHaveLength(3);
    expect(failed.report.phases.retry?.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('Vitest retained retry report completeness and option parsing', () => {
  it('fails closed on omission and preserves parsed selectors before exact filters and tail', () => {
    const omitted = runGate('vitest', 'missing_retry');
    expect(omitted.report.version).toBe(2);
    expect(omitted.status).toBe(1);
    expect(omitted.report.verdict.failedFiles).toEqual([omitted.failedFile]);
    expect(omitted.report.phases.retry?.discovery.status).toBe('failed');

    const retried = runGate('vitest', 'ordinary_retry', 'complex');
    const args = retried.report.phases.retry?.command.arguments;
    expect(args).toBeDefined();
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    const parsedOptions = parsed.options as unknown as Record<string, unknown>;
    expect({
      filter: parsed.filter,
      config: parsed.options.config,
      project: parsed.options.project,
      testNamePattern: parsed.options.testNamePattern,
      environment: parsed.options.environment,
      pool: parsed.options.pool,
      passWithNoTests: parsed.options.passWithNoTests,
      shard: parsed.options.shard,
      changed: parsed.options.changed,
      fileParallelism: parsed.options.fileParallelism,
      maxWorkers: parsed.options.maxWorkers,
      tail: parsedOptions['--'],
    }).toEqual({
      filter: [retried.failedFile],
      config: 'tests/fixtures/gate-vitest-proof.config.mts',
      project: ['unit', 'other'],
      testNamePattern: 'probe name',
      environment: 'node',
      pool: 'forks',
      passWithNoTests: true,
      shard: '1/2',
      changed: 'false',
      fileParallelism: false,
      maxWorkers: 1,
      tail: ['--node-tail', 'tail-value'],
    });
    const reporterIndex = args?.findIndex((argument) => argument.startsWith('--reporter=')) ?? -1;
    const failedFileIndex = args?.indexOf(retried.failedFile) ?? -1;
    const delimiterIndex = args?.indexOf('--') ?? -1;
    expect(args?.indexOf('-c')).toBeGreaterThan(1);
    expect(reporterIndex).toBeGreaterThan(args?.indexOf('--changed=false') ?? -1);
    expect(failedFileIndex).toBeGreaterThan(reporterIndex);
    expect(delimiterIndex).toBeGreaterThan(failedFileIndex);
  });

  it('preserves a bare initial --fileParallelism without swallowing its file filter', () => {
    const run = runGate('vitest', 'clean', 'initial-file-parallelism');
    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'initial')?.arguments;
    expect(args).toBeDefined();
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    expect(parsed.filter).toEqual([run.failedFile]);
    expect(parsed.options.fileParallelism).toBe(true);
  });

  it('preserves initial serial scheduling constraints and the file filter', () => {
    const run = runGate('vitest', 'clean', 'initial-serial');
    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'initial')?.arguments;
    expect(args).toBeDefined();
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    expect(parsed.filter).toEqual([run.failedFile]);
    expect(parsed.options.fileParallelism).toBe(false);
    expect(parsed.options.maxWorkers).toBe(1);
  });

  it('preserves separate false for --isolate on retry', () => {
    const run = runGate('vitest', 'ordinary_retry', 'retry-isolate-false');
    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
    expect(args).toBeDefined();
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    expect(parsed.filter).toEqual([run.failedFile]);
    expect(parsed.options.isolate).toBe(false);
  });

  it('preserves separate false for --coverage on retry', () => {
    const run = runGate('vitest', 'ordinary_retry', 'retry-coverage-false');
    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
    expect(args).toBeDefined();
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    expect(parsed.filter).toEqual([run.failedFile]);
    expect(parsed.options.coverage).toEqual({ enabled: false });
  });

  it('emits gate-owned --configLoader runner exactly once on retry', () => {
    const run = runGate('vitest', 'ordinary_retry', 'retry-config-loader');
    const args = run.logs.find((entry) => entry.type === 'command' && entry.phase === 'retry')?.arguments;
    expect(args).toBeDefined();
    expect(args?.filter((argument) => argument === '--configLoader')).toHaveLength(1);
    const parsed = parseCLI(['vitest', ...args!.slice(1)]);
    expect(parsed.filter).toEqual([run.failedFile]);
    expect(parsed.options.configLoader).toBe('runner');
  });
});

describe.each(['vitest', 'playwright'] as const)('%s four-domain counterexamples', (kind) => {
  it('fails solely on child exit 2 after complete passing evidence', () => {
    const run = runGate(kind, 'exit2');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.process).toMatchObject({ status: 'failed', exitCode: 2, signal: null });
    expect(run.report.phases.initial.reporterOutcome.status).toBe('passed');
    expect(run.report.phases.initial.discovery.status).toBe('complete');
    expect(run.report.phases.retry).toBeNull();
    expect(run.report.verdict.phaseFailures.map((failure) => failure.domain)).toEqual(['process']);
  });

  it('retains the exact terminating signal after readable evidence', () => {
    const run = runGate(kind, 'signal');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.process.exitCode).toBeNull();
    expect(run.report.phases.initial.process.signal).toBe('SIGTERM');
    expect(run.report.phases.retry).toBeNull();
  });

  it('records a structured ENOENT spawn failure and uncertified discovery', () => {
    const run = runGate(kind, 'spawn_error');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.process.spawnError?.code).toBe('ENOENT');
    expect(run.report.phases.initial.process.exitCode).toBeNull();
    expect(run.report.phases.initial.discovery.status).toBe('uncertified');
    expect(run.report.phases.retry).toBeNull();
  });

  it('keeps a global reporter failure red while recording a passing diagnostic retry', () => {
    const run = runGate(kind, 'global_then_pass');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
    expect(reasons(run, 'initial', 'reporter')).toContain('runner-global-error');
    expect(run.report.phases.retry).not.toBeNull();
  });

  it('retains sidecar diagnostics but fails when stock JSON is missing', () => {
    const run = runGate(kind, 'stock_missing');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.process).toMatchObject({ status: 'passed', exitCode: 0 });
    expect(run.report.phases.initial.reporterOutcome.reasons).toContain('stock-report-missing');
    expect(run.report.phases.initial.fileOutcomes).toContainEqual(expect.objectContaining({ file: run.failedFile, status: 'failed' }));
    expect(run.report.phases.retry).not.toBeNull();
  });

  it('fails retry discovery when two requested failures produce only one result', () => {
    const run = runGate(kind, 'partial_retry');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.retry?.discovery.status).toBe('failed');
    expect(run.report.phases.retry?.discovery.requestedFiles).toEqual([run.failedFile, run.unrelatedFile].sort());
    expect(run.report.phases.retry?.discovery.reportedFiles).toEqual([run.failedFile]);
  });

  it('allows only ordinary attributable file failure to become green on exact retry', () => {
    const run = runGate(kind, 'ordinary_retry');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(0);
    expect(run.report.phases.initial.process.status).toBe('ordinary-file-failure');
    expect(run.report.verdict).toEqual({
      status: 'passed',
      passedOnRetry: [run.failedFile],
      failedFiles: [],
      phaseFailures: [],
    });
  });

  it('rejects a post-report exit 1 when every file passed and does not retry', () => {
    const run = runGate(kind, 'late_exit1');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.process.status).toBe('failed');
    expect(run.report.phases.initial.reporterOutcome.status).toBe('passed');
    expect(run.report.phases.initial.discovery.status).toBe('complete');
    expect(run.report.phases.retry).toBeNull();
  });

  it('rejects readable stock JSON without the gate evidence sidecar', () => {
    const run = runGate(kind, 'sidecar_missing');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.phases.initial.reporterOutcome.reasons).toContain('evidence-sidecar-missing');
    expect(run.report.phases.initial.discovery.status).toBe('uncertified');
    expect(run.report.phases.retry).toBeNull();
  });
});

describe('runner-specific timeout policy', () => {
  it('keeps Vitest onProcessTimeout fatal after an attributable file passes retry', () => {
    const run = runGate('vitest', 'process_timeout');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(1);
    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
    expect(reasons(run, 'initial', 'reporter')).toEqual(['vitest-process-timeout']);
  });

  it('permits a Playwright individual timedOut result to pass exact serial retry', () => {
    const run = runGate('playwright', 'playwright_timeout');
    expect(run.report.version).toBe(2);
    expect(run.status).toBe(0);
    expect(run.report.verdict.passedOnRetry).toEqual([run.failedFile]);
    expect(run.report.verdict.phaseFailures).toEqual([]);
  });
});
