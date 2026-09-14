import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import {
  buildHandoffReport,
  publishHandoffReport,
  type HandoffReport,
  type ReportGitReader,
  type SupervisorReportInput,
} from '../../../tools/vtt-handoff/report';
import {
  REQUIRED_HANDOFF_GATES,
  inventoryEntryDigest,
  parsePlaywrightList,
  prepareDiscoveryEnvironment,
  prepareExecutionEnvironment,
  reconcileGateReceipt,
  reconcileM1Discovery,
  renderGateCommand,
  renderReceiptCommand,
  validateGateInventory,
  type DiscoveryResult,
  type GateExecutionReceipt,
  type InventoryResolution,
  type M1GateReport,
  type RequiredHandoffGate,
} from '../../../tools/vtt-handoff/gate-inventory';
import { type RepositoryIdentityPolicy } from '../../../tools/vtt-handoff/paths';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const OLD_COMMIT = '1123456789abcdef0123456789abcdef01234567';
const REQUEST_ID = '018f0f23-7b5d-7a11-8abc-1234567890ab';

const REPORT_INPUT_PATHS = [
  'contracts/vtt-handoff/v1/protocol.schema.json',
  'contracts/vtt-handoff/v1/art.schema.json',
  'contracts/vtt-handoff/v1/contracts.d.ts',
  'fixtures/scenes/two-room.v1.json',
  'fixtures/scenes/two-room.snapshots.v1.json',
  'fixtures/protocol/examples.v1.json',
] as const;

const EXPECTED_GATE_IDS = [
  'full-typecheck',
  'structural-scan',
  'unit-gate',
  'production-build',
  'node-runtime-launch',
  'worker-dist-playwright',
  'browser-gate',
  'cumulative-targeted-vitest',
  'worker-dev-playwright',
  'runtime-parity-playwright',
  'top-down-smoke-playwright',
] as const;

const EXPECTED_CUMULATIVE_FILES = [
  'tests/unit/tools/d583-contract-inventory.test.ts',
  'tests/unit/vtt/art-request.test.ts',
  'tests/unit/vtt/art-stage.test.ts',
  'tests/unit/vtt/art-validator.test.ts',
  'tests/unit/vtt/controller-assignment.test.ts',
  'tests/unit/vtt/detection-ui.test.ts',
  'tests/unit/vtt/door-intent.test.ts',
  'tests/unit/vtt/encounter-board-projection.test.ts',
  'tests/unit/vtt/encounter-projections.test.ts',
  'tests/unit/vtt/encounter-selectors.test.ts',
  'tests/unit/vtt/encounter-session-service.test.ts',
  'tests/unit/vtt/engine-boundary.test.ts',
  'tests/unit/vtt/handoff-bootstrap.test.ts',
  'tests/unit/vtt/handoff-contract.test.ts',
  'tests/unit/vtt/handoff-examples.test.ts',
  'tests/unit/vtt/handoff-package-contract.test.ts',
  'tests/unit/vtt/handoff-publish.test.ts',
  'tests/unit/vtt/in-process-transport.test.ts',
  'tests/unit/vtt/local-session-store.test.ts',
  'tests/unit/vtt/node-runtime.test.ts',
  'tests/unit/vtt/node-websocket-transport.test.ts',
  'tests/unit/vtt/png-validator.test.ts',
  'tests/unit/vtt/preview-hidden-rolls.test.ts',
  'tests/unit/vtt/protocol-runtime.test.ts',
  'tests/unit/vtt/runtime-parity.test.ts',
  'tests/unit/vtt/scene-snapshot.test.ts',
  'tests/unit/vtt/semantic-board-payload.test.ts',
  'tests/unit/vtt/serve-existing-dist.test.ts',
  'tests/unit/vtt/session-lifecycle.test.ts',
  'tests/unit/vtt/session-persistence.test.ts',
  'tests/unit/vtt/two-room-fixture.test.ts',
  'tests/unit/vtt/uuidv7.test.ts',
  'tests/unit/vtt/windows-probe.test.ts',
  'tests/unit/vtt/worker-boundary.test.ts',
] as const;

const EXPECTED_BROWSER_GATES = {
  'browser-gate': { config: 'playwright.config.ts', selectors: [], artifact: undefined },
  'worker-dist-playwright': { config: 'tests/browser/vtt-handoff/playwright.config.ts', selectors: [
    'worker.spec.ts',
  ], artifact: 'dist' },
  'worker-dev-playwright': { config: 'tests/browser/vtt-handoff/playwright.config.ts', selectors: [
    'worker.spec.ts',
  ], artifact: 'dev' },
  'runtime-parity-playwright': { config: 'tests/browser/vtt-handoff/playwright.config.ts', selectors: [
    'runtime-parity.spec.ts',
  ], artifact: 'dev' },
  'top-down-smoke-playwright': { config: 'tests/browser/vtt-handoff/playwright.config.ts', selectors: [
    'top-down-smoke.spec.ts',
  ], artifact: 'dev' },
} as const;

interface RepositoryFixture {
  readonly root: string;
  readonly policy: RepositoryIdentityPolicy;
}

interface ReceiptScenario {
  readonly revisionBefore?: string;
  readonly revisionAfter?: string;
  readonly outer?: GateExecutionReceipt['outer'];
  readonly failureReasons?: readonly string[];
  readonly transformReport?: (report: M1GateReport) => M1GateReport;
}

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-handoff-report-'));
}

function repository(): RepositoryFixture {
  const fixtureRoot = root();
  mkdirSync(join(fixtureRoot, '.git'));
  writeFileSync(join(fixtureRoot, 'package.json'), '{"name":"srd-55"}\n');
  for (const path of REPORT_INPUT_PATHS) {
    const destination = join(fixtureRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(join(process.cwd(), path)));
  }
  for (const path of ['node_modules/vitest/vitest.mjs', 'node_modules/@playwright/test/cli.js']) {
    const destination = join(fixtureRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, 'export {};\n');
  }
  return {
    root: fixtureRoot,
    policy: { ownerCheckout: fixtureRoot, authorizedWorktrees: [] },
  };
}

function gitReader(options: {
  readonly tracked?: string;
  readonly untracked?: string;
  readonly commit?: string;
} = {}): ReportGitReader {
  return {
    read(_repositoryRoot, args) {
      const operation = args.join(' ');
      if (operation === 'diff --name-only HEAD --') return options.tracked ?? '';
      if (operation === 'ls-files --others --exclude-standard') return options.untracked ?? '';
      if (operation === 'rev-parse HEAD') return options.commit ?? COMMIT;
      throw new Error(`Unexpected Git operation: ${operation}`);
    },
  };
}

function discoveryFor(gate: RequiredHandoffGate, repositoryRoot: string): DiscoveryResult {
  if (gate.discovery.kind === 'none') {
    return { kind: 'none', rootDir: null, files: [], testIdentities: [] };
  }
  const files = gate.discovery.expectedFiles === 'from-config'
    ? [gate.discovery.kind === 'vitest'
      ? 'tests/unit/vtt/handoff-report.test.ts'
      : 'tests/browser/acceptance-walkthrough.spec.ts']
    : [...gate.discovery.expectedFiles];
  const testIdentities = gate.discovery.kind === 'playwright'
    ? files.map((file, index) => `chromium:test-${String(index)}:${resolve(repositoryRoot, file)}`)
    : [];
  return {
    kind: gate.discovery.kind,
    rootDir: gate.discovery.kind === 'playwright'
      ? resolve(repositoryRoot, 'tests/browser')
      : repositoryRoot,
    files,
    testIdentities,
  };
}

function phaseFor(
  gate: RequiredHandoffGate,
  repositoryRoot: string,
  discovery: DiscoveryResult,
  phase: 'initial' | 'retry',
  files = discovery.files,
  statuses: Readonly<Record<string, string>> = {},
): M1GateReport['phases']['initial'] {
  const kind = gate.report.gateVerdict?.kind;
  if (kind === undefined) throw new Error(`Gate ${gate.id} has no M-1 report.`);
  const modulePath = resolve(
    repositoryRoot,
    kind === 'vitest' ? 'node_modules/vitest/vitest.mjs' : 'node_modules/@playwright/test/cli.js',
  );
  const arguments_ = [modulePath, kind === 'vitest' ? 'run' : 'test', ...files];
  const executionIds = kind === 'playwright'
    ? discovery.testIdentities.filter((identity) => files.some((file) =>
      identity.endsWith(resolve(repositoryRoot, file))))
    : [];
  return {
    phase,
    phaseInvocationId: `${phase}-${gate.id}`,
    command: {
      executable: process.execPath,
      arguments: arguments_,
      lock: {
        executable: 'flock',
        arguments: ['-w', '7200', '/tmp/dnd-gate.lock', process.execPath, ...arguments_],
      },
    },
    discovery: {
      requestedExecutionIds: executionIds,
      reportedExecutionIds: executionIds,
      requestedFiles: files,
      reportedFiles: files,
    },
    fileOutcomes: files.map((file) => ({ file, status: statuses[file] ?? 'passed' })),
  };
}

function reportFor(gate: RequiredHandoffGate, repositoryRoot: string): M1GateReport {
  const kind = gate.report.gateVerdict?.kind;
  if (kind === undefined) throw new Error(`Gate ${gate.id} has no M-1 report.`);
  const discovery = discoveryFor(gate, repositoryRoot);
  return {
    version: 2,
    kind,
    phases: { initial: phaseFor(gate, repositoryRoot, discovery, 'initial'), retry: null },
    verdict: { status: 'passed', passedOnRetry: [], failedFiles: [], phaseFailures: [] },
  };
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function writeReceipt(
  fixture: RepositoryFixture,
  evidenceRoot: string,
  gate: RequiredHandoffGate,
  scenario: ReceiptScenario = {},
): string {
  const discovery = discoveryFor(gate, fixture.root);
  let m1Report: GateExecutionReceipt['m1Report'] = null;
  let m1Verdict: GateExecutionReceipt['m1Verdict'] = null;
  let launcherAuthenticated: boolean | null = null;
  if (gate.report.gateVerdict !== null) {
    const baseReport = reportFor(gate, fixture.root);
    const report = scenario.transformReport?.(baseReport) ?? baseReport;
    const reportPath = join(evidenceRoot, `${gate.id}.m1.json`);
    const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(reportPath, bytes);
    m1Report = {
      path: reportPath,
      sha256: sha256(bytes),
      kind: report.kind,
      phaseInvocationIds: [
        report.phases.initial.phaseInvocationId,
        ...(report.phases.retry === null ? [] : [report.phases.retry.phaseInvocationId]),
      ],
    };
    m1Verdict = report.verdict;
    launcherAuthenticated = true;
  }
  const failureReasons = scenario.failureReasons ?? [];
  const receipt: GateExecutionReceipt = {
    version: 1,
    gateId: gate.id,
    tier: gate.tier,
    inventoryDigest: inventoryEntryDigest(gate),
    invocationId: `receipt-${gate.id}`,
    repositoryRoot: fixture.root,
    revisionBefore: scenario.revisionBefore ?? COMMIT,
    revisionAfter: scenario.revisionAfter ?? COMMIT,
    startedAt: '2026-09-14T00:00:00.000Z',
    finishedAt: '2026-09-14T00:00:01.000Z',
    argv: gate.argv,
    env: gate.env,
    cwd: gate.cwd,
    discovery,
    outer: scenario.outer ?? { exitCode: 0, signal: null, spawnError: null },
    m1Report,
    m1Verdict,
    launcherAuthenticated,
    finalStatus: failureReasons.length === 0 ? 'passed' : 'failed',
    failureReasons,
  };
  const receiptPath = join(evidenceRoot, `${gate.id}.receipt.json`);
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return receiptPath;
}

function successfulEvidence(
  fixture: RepositoryFixture,
  evidenceRoot: string,
  scenarios: Readonly<Record<string, ReceiptScenario>> = {},
): SupervisorReportInput {
  return {
    schemaVersion: 2,
    tools: [
      { name: 'node', version: process.version, command: 'node --version' },
      { name: 'vitest', version: '4.1.10', command: 'npx vitest run focused.test.ts' },
    ],
    gateExecutions: REQUIRED_HANDOFF_GATES.map((gate) => ({
      gateId: gate.id,
      receiptPath: writeReceipt(fixture, evidenceRoot, gate, scenarios[gate.id]),
    })),
    artRequests: [{
      requestId: REQUEST_ID,
      requestPath: `art/outbox/${REQUEST_ID}.request.json`,
      resultPath: `art/inbox/${REQUEST_ID}.result.json`,
    }],
    windowsProbe: {
      status: 'PASSED',
      command: 'VTT_WINDOWS_INTEROP=1 npm run windows:probe',
      reason: null,
    },
  };
}

function inputFile(directory: string, value: unknown): string {
  const path = join(directory, 'supervisor-results.json');
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

function buildWith(
  fixture: RepositoryFixture,
  handoffRoot: string,
  input: SupervisorReportInput,
): HandoffReport {
  return buildHandoffReport({
    repositoryRoot: fixture.root,
    inputPath: inputFile(handoffRoot, input),
    gitReader: gitReader(),
  });
}

function gate(id: string): RequiredHandoffGate {
  const found = REQUIRED_HANDOFF_GATES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Missing gate ${id}.`);
  return found;
}

describe('VTT handoff readiness report', () => {
  it('publishes reconciled READY evidence atomically and independently hashes every input', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot);
    const evidence = inputFile(handoffRoot, input);
    const order: string[] = [];
    const result = publishHandoffReport({
      repositoryRoot: fixture.root,
      handoffRoot,
      inputPath: evidence,
      identityPolicy: fixture.policy,
      gitReader: gitReader(),
      hooks: { nonce: () => 'fixed', afterRename: (path) => order.push(path) },
    });
    expect(result).toMatchObject({ status: 'published', readiness: 'READY', files: 2, reasons: [] });
    expect(order).toEqual(['reports/claude/handoff.json', 'reports/claude/READY.md']);
    expect(readdirSync(join(handoffRoot, 'reports/claude')).some((name) => name.includes('.partial.'))).toBe(false);
    const report = buildHandoffReport({
      repositoryRoot: fixture.root,
      inputPath: evidence,
      gitReader: gitReader(),
    });
    expect(report.schemaVersion).toBe(2);
    expect(report.gateOutcomes).toHaveLength(11);
    expect(report.gateOutcomes.every((outcome) => outcome.state === 'passed')).toBe(true);
    expect(report.repository).toEqual({
      name: 'srd-55', root: fixture.root, commit: COMMIT, changedFiles: [],
    });
    for (const digest of report.digests) {
      const bytes = readFileSync(join(fixture.root, digest.path));
      expect(digest).toEqual({
        path: digest.path,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        length: bytes.length,
      });
    }
    const markdown = readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8');
    expect(markdown).toContain('# VTT handoff: READY');
    expect(markdown).toContain('runtime-parity-playwright');
    expect(markdown).toContain('receipt=');
    expect(publishHandoffReport({
      repositoryRoot: fixture.root,
      handoffRoot,
      inputPath: evidence,
      check: true,
      identityPolicy: fixture.policy,
      gitReader: gitReader(),
    })).toMatchObject({ status: 'verified', readiness: 'READY', files: 2 });
  });

  it('records clean and dirty repository evidence through the injected Git reader', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot);
    const evidence = inputFile(handoffRoot, input);
    const dirty = buildHandoffReport({
      repositoryRoot: fixture.root,
      inputPath: evidence,
      gitReader: gitReader({
        tracked: 'src/changed.ts\ndocs/vtt-handoff/runtime-api.md\n',
        untracked: 'tools/new-report-input.json\nsrc/changed.ts\n',
      }),
    });
    expect(dirty.repository.changedFiles).toEqual([
      'docs/vtt-handoff/runtime-api.md',
      'src/changed.ts',
      'tools/new-report-input.json',
    ]);
  });

  it('kills M3-REPORT-MISSING and M3-AFFECTED-SUBSTITUTION for every omitted receipt', () => {
    const fixture = repository();
    for (const omitted of REQUIRED_HANDOFF_GATES) {
      const handoffRoot = root();
      const input = successfulEvidence(fixture, handoffRoot);
      const report = buildWith(fixture, handoffRoot, {
        ...input,
        gateExecutions: input.gateExecutions.filter((execution) => execution.gateId !== omitted.id),
      });
      expect(report.readiness, omitted.id).toBe('PARTIAL');
      expect(report.gateOutcomes.find((outcome) => outcome.id === omitted.id)).toMatchObject({
        state: 'not-run',
        reasons: [`REQUIRED_GATE_NOT_RUN: ${omitted.id}`],
      });
    }
  });

  it('kills M3-REPORT-CLAIM and M3-REPORT-STDOUT claim-only input', () => {
    const fixture = repository();
    const handoffRoot = root();
    const valid = successfulEvidence(fixture, handoffRoot);
    const first = valid.gateExecutions[0];
    if (first === undefined) throw new Error('Missing first gate execution.');
    const duplicate = { ...valid, gateExecutions: [...valid.gateExecutions, first] };
    expect(buildHandoffReport({
      repositoryRoot: fixture.root,
      inputPath: inputFile(handoffRoot, duplicate),
      gitReader: gitReader(),
    })).toMatchObject({ reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null });
    const unknown = {
      ...valid,
      gateExecutions: [{ gateId: 'invented-gate', receiptPath: '/tmp/invented.json' }],
    };
    expect(buildHandoffReport({
      repositoryRoot: fixture.root,
      inputPath: inputFile(handoffRoot, unknown),
      gitReader: gitReader(),
    }).reasons).toEqual(['SUPERVISOR_RESULTS_INVALID']);
    const legacy = { schemaVersion: 1, gates: [{ name: 'unit-gate', status: 'PASSED' }] };
    expect(buildHandoffReport({
      repositoryRoot: fixture.root,
      inputPath: inputFile(handoffRoot, legacy),
      gitReader: gitReader(),
    })).toMatchObject({
      readiness: 'PARTIAL',
      evidence: null,
      reasons: ['SUPERVISOR_RESULTS_INVALID'],
    });
  });

  it.each([
    ['nonzero exit', { exitCode: 2, signal: null, spawnError: null }, ['OUTER_EXIT_NONZERO: 2']],
    ['signal', { exitCode: null, signal: 'SIGTERM', spawnError: null }, ['OUTER_SIGNAL: SIGTERM']],
    [
      'spawn error',
      { exitCode: null, signal: null, spawnError: { code: 'ENOENT', message: 'missing' } },
      ['OUTER_SPAWN_ERROR'],
    ],
  ] as const)('kills M3-REPORT-OUTER-FAIL for passed M-1 evidence after outer %s', (
    _label,
    outer,
    expectedReasons,
  ) => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': { outer },
    });
    const report = buildWith(fixture, handoffRoot, input);
    const outcome = report.gateOutcomes.find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({ state: 'failed', m1Verdict: { status: 'passed' } });
    expect(outcome?.reasons).toEqual(expectedReasons);
  });

  it('kills M3-REPORT-OUTER-FAIL revision drift before stale filtering', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        revisionBefore: OLD_COMMIT,
        revisionAfter: COMMIT,
        failureReasons: ['OUTER_REVISION_CHANGED'],
      },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({
      state: 'failed',
      reasons: ['OUTER_REVISION_CHANGED'],
      m1Verdict: { status: 'passed' },
    });
  });

  it('kills M3-REPORT-STALE when equal completed revisions are from another HEAD', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': { revisionBefore: OLD_COMMIT, revisionAfter: OLD_COMMIT },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({
      state: 'not-run',
      reasons: ['REQUIRED_GATE_STALE_REVISION: unit-gate'],
      m1Verdict: null,
    });
  });

  it('kills M3-REPORT-RETRY-HIDDEN with phase-aware retry accounting', () => {
    const fixture = repository();
    const handoffRoot = root();
    const a = 'tests/unit/a.test.ts';
    const b = 'tests/unit/b.test.ts';
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        transformReport: (report) => ({
          ...report,
          phases: {
            initial: phaseFor(
              gate('unit-gate'),
              fixture.root,
              { kind: 'vitest', rootDir: fixture.root, files: [a, b], testIdentities: [] },
              'initial',
              [a, b],
              { [a]: 'passed', [b]: 'failed' },
            ),
            retry: phaseFor(
              gate('unit-gate'),
              fixture.root,
              { kind: 'vitest', rootDir: fixture.root, files: [b], testIdentities: [] },
              'retry',
              [b],
            ),
          },
          verdict: { status: 'passed', passedOnRetry: [b], failedFiles: [], phaseFailures: [] },
        }),
      },
    });
    const execution = input.gateExecutions.find((candidate) => candidate.gateId === 'unit-gate');
    if (execution === undefined) throw new Error('Missing unit receipt.');
    const receipt = JSON.parse(readFileSync(execution.receiptPath, 'utf8')) as GateExecutionReceipt;
    writeFileSync(execution.receiptPath, `${JSON.stringify({
      ...receipt,
      discovery: { kind: 'vitest', rootDir: fixture.root, files: [a, b], testIdentities: [] },
    }, null, 2)}\n`);
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({
      state: 'passed-on-retry',
      discoveredFiles: [a, b],
      executedFiles: [a, b],
      passedOnRetry: [b],
      failedFiles: [],
    });
  });

  it('kills M3-REPORT-RETRY-SCOPE outside the initially failed files', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        transformReport: (report) => {
          const initial = report.phases.initial;
          const passed = initial.fileOutcomes[0]?.file;
          if (passed === undefined) throw new Error('Missing initial file.');
          return {
            ...report,
            phases: {
              ...report.phases,
              retry: phaseFor(gate('unit-gate'), fixture.root, {
                kind: 'vitest', rootDir: fixture.root, files: [passed], testIdentities: [],
              }, 'retry'),
            },
          };
        },
      },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome?.state).toBe('failed');
    expect(outcome?.reasons).toContain('RETRY_DISCOVERY_SCOPE_MISMATCH');
  });

  it('kills M3-INV-RUNNER-SUBSTITUTE even when its verdict says passed', () => {
    const fixture = repository();
    const fakeModule = join(fixture.root, 'fake-vitest.mjs');
    writeFileSync(fakeModule, 'export {};\n');
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        transformReport: (report) => ({
          ...report,
          phases: {
            ...report.phases,
            initial: {
              ...report.phases.initial,
              command: {
                ...report.phases.initial.command,
                arguments: [fakeModule, ...report.phases.initial.command.arguments.slice(1)],
              },
            },
          },
        }),
      },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({ state: 'failed', m1Verdict: { status: 'passed' } });
    expect(outcome?.reasons).toContain('M1_LAUNCHER_UNAUTHENTICATED');
  });

  it('kills M3-REPORT-FAILED by preserving failedFiles and phaseFailures', () => {
    const fixture = repository();
    const handoffRoot = root();
    const failedFile = 'tests/unit/vtt/handoff-report.test.ts';
    const phaseFailure = { phase: 'initial', domain: 'reporter', reasons: ['runner-global-error'] };
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        transformReport: (report) => ({
          ...report,
          verdict: {
            status: 'failed',
            passedOnRetry: [],
            failedFiles: [failedFile],
            phaseFailures: [phaseFailure],
          },
        }),
      },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome).toMatchObject({
      state: 'failed',
      failedFiles: [failedFile],
      phaseFailures: [phaseFailure],
      m1Verdict: { status: 'failed' },
    });
    expect(outcome?.reasons).toContain('M1_VERDICT_FAILED');
  });

  it.each(['digest', 'phase UUID', 'malformed'] as const)(
    'kills M3-REPORT-UUID and malformed evidence variants: %s',
    (mutation) => {
      const fixture = repository();
      const handoffRoot = root();
      const input = successfulEvidence(fixture, handoffRoot);
      const execution = input.gateExecutions.find((candidate) => candidate.gateId === 'unit-gate');
      if (execution === undefined) throw new Error('Missing unit receipt.');
      const receipt = JSON.parse(readFileSync(execution.receiptPath, 'utf8')) as GateExecutionReceipt;
      if (receipt.m1Report === null) throw new Error('Missing M-1 report reference.');
      if (mutation === 'digest') {
        writeFileSync(execution.receiptPath, `${JSON.stringify({
          ...receipt,
          m1Report: { ...receipt.m1Report, sha256: '0'.repeat(64) },
        }, null, 2)}\n`);
      } else if (mutation === 'phase UUID') {
        writeFileSync(execution.receiptPath, `${JSON.stringify({
          ...receipt,
          m1Report: { ...receipt.m1Report, phaseInvocationIds: ['wrong-phase'] },
        }, null, 2)}\n`);
      } else {
        writeFileSync(receipt.m1Report.path, '{malformed\n');
      }
      const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
        .find((candidate) => candidate.id === 'unit-gate');
      expect(outcome?.state).toBe('failed');
      expect(outcome?.reasons.some((reason) => reason.startsWith('M1_REPORT_'))).toBe(true);
    },
  );

  it('kills M3-REPORT-SUPERVISOR-FOLD for ordinary unit evidence', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot);
    const unit = input.gateExecutions.find((candidate) => candidate.gateId === 'unit-gate');
    if (unit === undefined) throw new Error('Missing unit receipt.');
    const relabeled = {
      ...input,
      gateExecutions: input.gateExecutions.map((execution) => execution.gateId === 'node-runtime-launch'
        ? { ...execution, receiptPath: unit.receiptPath }
        : execution),
    };
    const outcome = buildWith(fixture, handoffRoot, relabeled).gateOutcomes
      .find((candidate) => candidate.id === 'node-runtime-launch');
    expect(outcome).toMatchObject({
      state: 'not-run',
      reasons: ['REQUIRED_GATE_RECEIPT_MISMATCH: node-runtime-launch'],
    });
  });

  it('kills M3-REPORT-SKIP-HIDDEN by keeping skips visible', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot, {
      'unit-gate': {
        transformReport: (report) => ({
          ...report,
          phases: {
            ...report.phases,
            initial: {
              ...report.phases.initial,
              fileOutcomes: report.phases.initial.fileOutcomes.map((outcome) => ({
                ...outcome, status: 'skipped',
              })),
            },
          },
        }),
      },
    });
    const outcome = buildWith(fixture, handoffRoot, input).gateOutcomes
      .find((candidate) => candidate.id === 'unit-gate');
    expect(outcome?.state).toBe('passed');
    expect(outcome?.executedFiles).toEqual([]);
    expect(outcome?.skippedFiles).toEqual(['tests/unit/vtt/handoff-report.test.ts']);
  });

  it('makes absent or invalid evidence PARTIAL and check mode performs no repair', () => {
    const fixture = repository();
    const absent = buildHandoffReport({ repositoryRoot: fixture.root, gitReader: gitReader() });
    expect(absent).toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_MISSING'] });
    const handoffRoot = root();
    const invalid = inputFile(handoffRoot, { schemaVersion: 2, gateExecutions: [] });
    expect(() => publishHandoffReport({
      repositoryRoot: fixture.root,
      handoffRoot,
      inputPath: invalid,
      check: true,
      identityPolicy: fixture.policy,
      gitReader: gitReader(),
    })).toThrow('HANDOFF_REPORT_MISSING');
    expect(existsSync(join(handoffRoot, 'reports'))).toBe(false);
  });

  it('reports Windows unavailability independently of passed gate evidence', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = successfulEvidence(fixture, handoffRoot);
    const report = buildWith(fixture, handoffRoot, {
      ...input,
      windowsProbe: { ...input.windowsProbe, status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE' },
    });
    expect(report.readiness).toBe('PARTIAL');
    expect(report.reasons).toEqual(['WINDOWS_PROBE_UNAVAILABLE']);
  });

  it('detects report drift in check mode without overwriting supplied bytes', () => {
    const fixture = repository();
    const handoffRoot = root();
    const input = inputFile(handoffRoot, successfulEvidence(fixture, handoffRoot));
    publishHandoffReport({
      repositoryRoot: fixture.root,
      handoffRoot,
      inputPath: input,
      identityPolicy: fixture.policy,
      gitReader: gitReader(),
    });
    const ready = join(handoffRoot, 'reports/claude/READY.md');
    writeFileSync(ready, 'pre-existing divergent report\n');
    expect(() => publishHandoffReport({
      repositoryRoot: fixture.root,
      handoffRoot,
      inputPath: input,
      check: true,
      identityPolicy: fixture.policy,
      gitReader: gitReader(),
    })).toThrow('HANDOFF_REPORT_MISMATCH');
    expect(readFileSync(ready, 'utf8')).toBe('pre-existing divergent report\n');
  });
});

function parseRendered(command: string): readonly string[] {
  const tokens: string[] = [];
  let token = '';
  let quote: 'single' | 'double' | null = null;
  let started = false;
  for (const character of command) {
    if (quote === 'single' && character === "'") {
      quote = null;
    } else if (quote === 'double' && character === '"') {
      quote = null;
    } else if (quote === null && character === "'") {
      quote = 'single';
      started = true;
    } else if (quote === null && character === '"') {
      quote = 'double';
      started = true;
    } else if (quote === null && character === ' ') {
      if (started) tokens.push(token);
      token = '';
      started = false;
    } else {
      token += character;
      started = true;
    }
  }
  if (quote !== null) throw new Error('Unclosed quote.');
  if (started) tokens.push(token);
  return tokens;
}

describe('executable handoff gate inventory', () => {
  it('kills M3-INV-GATE-DROP, M3-INV-CUMULATIVE-DROP, and M3-INV-BROWSER-DROP', () => {
    expect(REQUIRED_HANDOFF_GATES.map((candidate) => candidate.id)).toEqual(EXPECTED_GATE_IDS);
    const cumulative = gate('cumulative-targeted-vitest');
    expect(cumulative.discovery.kind).toBe('vitest');
    if (cumulative.discovery.kind !== 'vitest' || cumulative.discovery.expectedFiles === 'from-config') {
      throw new Error('Cumulative discovery is not explicit.');
    }
    expect(cumulative.discovery.expectedFiles).toEqual(EXPECTED_CUMULATIVE_FILES);
    expect(new Set(cumulative.discovery.expectedFiles).size).toBe(34);
    const browserGates = Object.fromEntries(REQUIRED_HANDOFF_GATES.flatMap((candidate) =>
      candidate.discovery.kind === 'playwright' ? [[candidate.id, {
        config: candidate.discovery.configPath,
        selectors: candidate.discovery.selectors,
        artifact: Object.entries(candidate.env)
          .find(([name]) => name === 'VTT_HANDOFF_ARTIFACT')?.[1],
      }]] : []));
    expect(browserGates).toEqual(EXPECTED_BROWSER_GATES);
    expect(REQUIRED_HANDOFF_GATES.map(renderGateCommand).join('\n')).not.toMatch(/<[^>]*>|TODO/u);
  });

  it('kills M3-INV-HAND-COMMAND and round-trips rendered quoting', () => {
    const rendered = renderGateCommand({
      ...gate('full-typecheck'),
      argv: ['node', 'path with spaces', "apostrophe's", ''],
      env: { EMPTY: '', LABEL: "player's gate" },
    });
    expect(parseRendered(rendered)).toEqual([
      'EMPTY=',
      "LABEL=player's gate",
      'node',
      'path with spaces',
      "apostrophe's",
      '',
    ]);
    expect(rendered).not.toContain('full-typecheck:');
    expect(parseRendered(renderReceiptCommand(
      gate('worker-dist-playwright'),
      '/tmp/report directory',
      ["/tmp/build's receipt.json"],
    ))).toEqual([
      'npm', 'run', 'handoff:gate', '--', 'run', 'worker-dist-playwright',
      '--report-dir', '/tmp/report directory', '--prerequisite-receipt', "/tmp/build's receipt.json",
    ]);
  });

  it('kills M3-INV-RUNNER-SUBSTITUTE and M3-INV-DISCOVERY-REDIRECT', () => {
    const selected = gate('runtime-parity-playwright');
    for (const name of [
      'DND_GATE_VITEST_MODULE',
      'DND_GATE_PLAYWRIGHT_MODULE',
      'DND_GATE_FLOCK_MODULE',
    ]) {
      expect(() => prepareExecutionEnvironment({ [name]: 'fake.mjs' }, selected, root()))
        .toThrow(`FORBIDDEN_GATE_MODULE_OVERRIDE: ${name}`);
    }
    const prepared = prepareDiscoveryEnvironment({
      DND_GATE_VITEST_MODULE: 'fake-vitest.mjs',
      DND_GATE_PLAYWRIGHT_MODULE: 'fake-playwright.mjs',
      DND_GATE_FLOCK_MODULE: 'fake-flock.mjs',
      PLAYWRIGHT_JSON_OUTPUT_FILE: '/tmp/redirect.json',
      PLAYWRIGHT_JSON_OUTPUT_NAME: 'redirect.json',
      PLAYWRIGHT_JSON_OUTPUT_DIR: '/tmp/redirect',
    }, selected);
    for (const name of [
      'DND_GATE_VITEST_MODULE',
      'DND_GATE_PLAYWRIGHT_MODULE',
      'DND_GATE_FLOCK_MODULE',
      'PLAYWRIGHT_JSON_OUTPUT_FILE',
      'PLAYWRIGHT_JSON_OUTPUT_NAME',
      'PLAYWRIGHT_JSON_OUTPUT_DIR',
    ]) expect(prepared).not.toHaveProperty(name);
    expect(prepared).toMatchObject({ VTT_HANDOFF_ARTIFACT: 'dev', PLAYWRIGHT_PORT: '4410' });
    const inventoryOverride = {
      ...selected,
      env: { ...selected.env, DND_GATE_PLAYWRIGHT_MODULE: 'fake-playwright.mjs' },
    };
    expect(() => prepareExecutionEnvironment({}, inventoryOverride, root()))
      .toThrow('FORBIDDEN_GATE_MODULE_OVERRIDE: DND_GATE_PLAYWRIGHT_MODULE');
    expect(validateGateInventory(
      REQUIRED_HANDOFF_GATES.map((candidate) => candidate.id === selected.id ? inventoryOverride : candidate),
      process.cwd(),
      { fileExists: () => true, commandPath: () => '/resolved/command', packageScripts: {} },
    ).errors).toContain(`GATE_ENV_FORBIDDEN: ${selected.id}: DND_GATE_PLAYWRIGHT_MODULE`);
    const redirectingGate = {
      ...selected,
      env: { ...selected.env, PLAYWRIGHT_JSON_OUTPUT_FILE: '/tmp/inventory-redirect.json' },
    };
    expect(prepareDiscoveryEnvironment({}, redirectingGate)).not.toHaveProperty('PLAYWRIGHT_JSON_OUTPUT_FILE');
  });

  // M3-INV-PLACEHOLDER, ENV-DROP, ENV-ILLEGAL, CONFIG-MISSING, ARGV-MISSING, TIER-CHANGE, PREREQ-DROP.
  it('kills every M3 inventory validator mutant', () => {
    const packageScripts = {
      build: 'tsc -b && vite build --configLoader runner && node tools/assert-dist-clean.mjs',
      'test:gate': 'node tools/gate-vitest.mjs',
      'test:gate:browser': 'node tools/gate-playwright.mjs',
    };
    const resolution = (missing: string | null): InventoryResolution => ({
      fileExists: (path) => missing === null || !path.endsWith(missing),
      commandPath: () => '/resolved/command',
      packageScripts,
    });
    const replace = (id: string, transform: (candidate: RequiredHandoffGate) => RequiredHandoffGate) =>
      REQUIRED_HANDOFF_GATES.map((candidate) => candidate.id === id ? transform(candidate) : candidate);
    expect(validateGateInventory(REQUIRED_HANDOFF_GATES, process.cwd(), resolution(null)))
      .toEqual({ valid: true, errors: [] });
    expect(validateGateInventory(replace('full-typecheck', (candidate) => ({
      ...candidate, argv: ['npx', 'tsc', '<placeholder>'],
    })), process.cwd(), resolution(null)).errors).toContain('GATE_ARGV_INVALID: full-typecheck');
    expect(validateGateInventory(replace('runtime-parity-playwright', (candidate) => ({
      ...candidate,
      env: { PLAYWRIGHT_PORT: '4410', PLAYWRIGHT_WORKERS: '1' },
    })), process.cwd(), resolution(null)).errors)
      .toContain('GATE_ENV_MISSING: runtime-parity-playwright: VTT_HANDOFF_ARTIFACT');
    expect(validateGateInventory(REQUIRED_HANDOFF_GATES, process.cwd(), resolution('playwright.config.ts')).errors)
      .toContain('GATE_CONFIG_MISSING: browser-gate: playwright.config.ts');
    expect(validateGateInventory(REQUIRED_HANDOFF_GATES, process.cwd(), resolution('tools/gate-vitest.mjs')).errors)
      .toContain('ARGV_NODE_TARGET_MISSING: node-runtime-launch: tools/gate-vitest.mjs');
    expect(validateGateInventory(REQUIRED_HANDOFF_GATES, process.cwd(), resolution('node_modules/.bin/tsc')).errors)
      .toContain('ARGV_LOCAL_EXECUTABLE_MISSING: full-typecheck: tsc');
    for (const env of [
      { PLAYWRIGHT_PORT: '4173', PLAYWRIGHT_WORKERS: '1', VTT_HANDOFF_ARTIFACT: 'dev' },
      { PLAYWRIGHT_PORT: '4410', PLAYWRIGHT_WORKERS: '2', VTT_HANDOFF_ARTIFACT: 'dev' },
      { PLAYWRIGHT_PORT: '4410', PLAYWRIGHT_WORKERS: '1', VTT_HANDOFF_ARTIFACT: 'prod' },
    ]) {
      expect(validateGateInventory(replace('runtime-parity-playwright', (candidate) => ({
        ...candidate, env,
      })), process.cwd(), resolution(null)).valid).toBe(false);
    }
    expect(validateGateInventory(replace('node-runtime-launch', (candidate) => ({
      ...candidate, tier: 'landing',
    })), process.cwd(), resolution(null)).errors).toContain('GATE_SUPERVISOR_TIER_INVALID');
    expect(validateGateInventory(replace('worker-dist-playwright', (candidate) => ({
      ...candidate, prerequisites: [],
    })), process.cwd(), resolution(null)).errors).toContain('GATE_DIST_BUILD_PREREQUISITE_MISSING');
    expect(Object.hasOwn(gate('unit-gate'), 'command')).toBe(false);
  });

  it('kills M3-REPORT-PW-IDENTITY with config.rootDir-relative nested locations', () => {
    const fixture = repository();
    const rootDir = join(fixture.root, 'tests/browser');
    const result = parsePlaywrightList({
      config: { rootDir },
      errors: [],
      suites: [{
        file: 'nested/journey.spec.ts',
        suites: [{
          specs: [{ id: 'test-id', tests: [{ projectName: 'chromium' }] }],
        }],
      }],
    }, fixture.root);
    expect(result.files).toEqual(['tests/browser/nested/journey.spec.ts']);
    expect(result.testIdentities).toEqual([
      `chromium:test-id:${join(rootDir, 'nested/journey.spec.ts')}`,
    ]);
    const selected = gate('worker-dev-playwright');
    const file = result.files[0];
    if (file === undefined) throw new Error('Missing nested Playwright file.');
    const initial = phaseFor(selected, fixture.root, result, 'initial', [file], { [file]: 'failed' });
    const retry = phaseFor(selected, fixture.root, result, 'retry', [file]);
    const report: M1GateReport = {
      version: 2,
      kind: 'playwright',
      phases: { initial, retry },
      verdict: { status: 'passed', passedOnRetry: [file], failedFiles: [], phaseFailures: [] },
    };
    expect(reconcileM1Discovery(selected, result, report))
      .not.toContain('RETRY_DISCOVERY_IDENTITY_MISMATCH');
    expect(reconcileM1Discovery(selected, result, {
      ...report,
      phases: {
        initial,
        retry: {
          ...retry,
          discovery: { ...retry.discovery, reportedExecutionIds: [] },
        },
      },
    })).toContain('RETRY_DISCOVERY_IDENTITY_MISMATCH');
  });

  it('kills M3-REPORT-SUPERVISOR-FOLD in direct reconciliation', () => {
    const fixture = repository();
    const evidenceRoot = root();
    const unitReceipt = writeReceipt(fixture, evidenceRoot, gate('unit-gate'));
    expect(reconcileGateReceipt(gate('node-runtime-launch'), unitReceipt, COMMIT, fixture.root))
      .toMatchObject({ state: 'not-run' });
  });
});
