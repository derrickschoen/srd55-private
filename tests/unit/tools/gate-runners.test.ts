import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type RunnerKind = 'vitest' | 'playwright';
type Scenario = 'clean' | 'flaky' | 'failed' | 'missing_retry';

interface GateReport {
  readonly phases: {
    readonly initial: { readonly loadAverage: readonly number[]; readonly durationMs: number };
    readonly retry: null | { readonly loadAverage: readonly number[]; readonly durationMs: number };
  };
  readonly verdict: {
    readonly loadFlakes: readonly string[];
    readonly failed: readonly string[];
  };
}

interface StubLog {
  readonly type: 'command' | 'flock';
  readonly kind?: RunnerKind;
  readonly phase?: 'initial' | 'retry';
  readonly arguments: readonly string[];
}

function runGate(kind: RunnerKind, scenario: Scenario): {
  readonly status: number | null;
  readonly stdout: string;
  readonly report: GateReport;
  readonly logs: readonly StubLog[];
  readonly failedFile: string;
  readonly unrelatedFile: string;
} {
  const directory = mkdtempSync(join(tmpdir(), `dnd-${kind}-gate-test-`));
  const logPath = join(directory, 'stub.jsonl');
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
  const result = spawnSync(
    process.execPath,
    [runner, failedFile, unrelatedFile, ...(kind === 'playwright' ? ['--project=chromium'] : [])],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        DND_GATE_REPORT_DIR: directory,
        DND_GATE_FLOCK_MODULE: resolve('tests/fixtures/fake-flock.mjs'),
        DND_GATE_STUB_FILE: failedFile,
        DND_GATE_STUB_LOG: logPath,
        DND_GATE_STUB_SCENARIO: scenario,
        [commandModuleVariable]: resolve('tests/fixtures/fake-gate-command.mjs'),
      },
    },
  );
  const finalReport = readdirSync(directory).find((name) => name.includes('-gate-') && name.endsWith('.json'));
  if (finalReport === undefined) throw new Error(`Gate runner wrote no final report. stderr: ${result.stderr}`);
  const report = JSON.parse(readFileSync(join(directory, finalReport), 'utf8')) as GateReport;
  const logs = readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as StubLog);
  return { status: result.status, stdout: result.stdout, report, logs, failedFile, unrelatedFile };
}

describe.each(['vitest', 'playwright'] as const)('%s load-tolerant gate runner', (kind) => {
  it('distinguishes clean runs, load flakes, and persistent failures with a locked exact-file retry', () => {
    const clean = runGate(kind, 'clean');
    expect(clean.status).toBe(0);
    expect(clean.report.verdict).toEqual({ loadFlakes: [], failed: [] });
    expect(clean.report.phases.retry).toBeNull();
    expect(clean.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial']);
    expect(clean.stdout).toContain('LOAD FLAKES (passed serially)');
    expect(clean.stdout).toContain('FAILED');

    const flaky = runGate(kind, 'flaky');
    expect(flaky.status).toBe(0);
    expect(flaky.report.verdict).toEqual({ loadFlakes: [flaky.failedFile], failed: [] });
    expect(flaky.report.phases.retry?.loadAverage).toHaveLength(3);
    expect(flaky.report.phases.retry?.durationMs).toBeGreaterThanOrEqual(0);
    const flakyCommands = flaky.logs.filter((entry) => entry.type === 'command');
    expect(flakyCommands.map((entry) => entry.phase)).toEqual(['initial', 'retry']);
    const retryCommand = flakyCommands[1];
    expect(retryCommand?.arguments).toContain(flaky.failedFile);
    expect(retryCommand?.arguments).not.toContain(flaky.unrelatedFile);
    expect(retryCommand?.arguments).toContain(kind === 'vitest' ? '--no-file-parallelism' : '--workers=1');
    const retryLock = flaky.logs.filter((entry) => entry.type === 'flock')[1];
    expect(retryLock?.arguments.slice(0, 3)).toEqual(['-w', '7200', '/tmp/dnd-gate.lock']);
    expect(flaky.stdout).toContain(`  ${flaky.failedFile}`);

    const failed = runGate(kind, 'failed');
    expect(failed.status).toBe(1);
    expect(failed.report.verdict).toEqual({ loadFlakes: [], failed: [failed.failedFile] });
    expect(failed.report.phases.initial.loadAverage).toHaveLength(3);
    expect(failed.report.phases.initial.durationMs).toBeGreaterThanOrEqual(0);
    expect(failed.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase)).toEqual(['initial', 'retry']);
    expect(failed.stdout).toContain(`  ${failed.failedFile}`);
  });
});

describe('Vitest retry report completeness', () => {
  it('fails closed when the retry reporter omits an initially failed file', () => {
    const omitted = runGate('vitest', 'missing_retry');

    expect(omitted.logs.filter((entry) => entry.type === 'command').map((entry) => entry.phase))
      .toEqual(['initial', 'retry']);
    expect(omitted.report.verdict).toEqual({
      loadFlakes: [],
      failed: [omitted.failedFile],
    });
    expect(omitted.status).toBe(1);
    expect(omitted.stdout).toContain(`FAILED\n  ${omitted.failedFile}`);
  });
});
