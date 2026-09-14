import { createHash, randomBytes } from 'node:crypto';
import {
  closeSync, constants, existsSync, fsyncSync, mkdirSync, openSync, readFileSync,
  renameSync, unlinkSync, writeSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { HANDOFF_METHODS } from '../../src/vtt/handoff/v1/contracts.ts';
import { ART_REQUEST_DEFINITIONS } from './art-request.ts';
import { handoffPaths, type RepositoryIdentityPolicy } from './paths.ts';
import {
  REQUIRED_HANDOFF_GATES,
  reconcileGateReceipt,
  renderGateCommand,
  type GateId,
  type GateReconciliation,
} from './gate-inventory.ts';

export { REQUIRED_HANDOFF_GATES } from './gate-inventory.ts';

const resultStatusSchema = z.enum(['PASSED', 'FAILED', 'UNAVAILABLE', 'NOT_RUN']);
const uuidV7Schema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
);

const supervisorReportInputSchema = z.strictObject({
  schemaVersion: z.literal(2),
  tools: z.array(z.strictObject({
    name: z.string().min(1), version: z.string().min(1), command: z.string().min(1),
  })).min(1),
  gateExecutions: z.array(z.strictObject({
    gateId: z.string().refine((value) => REQUIRED_HANDOFF_GATES.some((gate) => gate.id === value), {
      message: 'Unknown gate id.',
    }),
    receiptPath: z.string().min(1),
  })).superRefine((executions, context) => {
    const names = new Set<string>();
    for (const [index, execution] of executions.entries()) {
      if (names.has(execution.gateId)) {
        context.addIssue({
          code: 'custom', path: [index, 'gateId'],
          message: `Duplicate gate execution: ${execution.gateId}`,
        });
      }
      names.add(execution.gateId);
    }
  }),
  artRequests: z.array(z.strictObject({
    requestId: uuidV7Schema,
    requestPath: z.string().min(1),
    resultPath: z.string().min(1).nullable(),
  }).superRefine((request, context) => {
    if (request.requestPath !== `art/outbox/${request.requestId}.request.json`) {
      context.addIssue({ code: 'custom', message: 'Art request path does not match requestId.' });
    }
    if (request.resultPath !== null && request.resultPath !== `art/inbox/${request.requestId}.result.json`) {
      context.addIssue({ code: 'custom', message: 'Art result path does not match requestId.' });
    }
  })).min(1),
  windowsProbe: z.strictObject({
    status: resultStatusSchema, command: z.string().min(1), reason: z.string().nullable(),
  }),
});

export type SupervisorReportInput = z.infer<typeof supervisorReportInputSchema>;
export type HandoffReadiness = 'READY' | 'PARTIAL';

interface DigestRecord {
  readonly path: string;
  readonly sha256: string;
  readonly length: number;
}

export interface HandoffReport {
  readonly schemaVersion: 2;
  readonly readiness: HandoffReadiness;
  readonly reasons: readonly string[];
  readonly repository: {
    readonly name: 'srd-55';
    readonly root: string;
    readonly commit: string;
    readonly changedFiles: readonly string[];
  };
  readonly evidence: SupervisorReportInput | null;
  readonly requiredGates: typeof REQUIRED_HANDOFF_GATES;
  readonly gateOutcomes: readonly GateReconciliation[];
  readonly digests: readonly DigestRecord[];
  readonly adapters: readonly { readonly name: string; readonly path: string }[];
  readonly methods: readonly string[];
  readonly art: {
    readonly outbox: 'art/outbox';
    readonly inbox: 'art/inbox';
    readonly review: 'art/review';
    readonly sampleAssetIds: readonly string[];
    readonly requests: SupervisorReportInput['artRequests'];
  };
  readonly limitations: readonly string[];
  readonly connectionPoints: readonly string[];
}

export interface ReportPublishResult {
  readonly root: string;
  readonly status: 'published' | 'verified';
  readonly readiness: HandoffReadiness;
  readonly files: 2;
  readonly reasons: readonly string[];
}

export interface ReportPublishHooks {
  readonly nonce?: () => string;
  readonly afterRename?: (relativePath: string) => void;
}

export interface ReportGitReader {
  read(repositoryRoot: string, args: readonly string[]): string;
}

const DIGEST_PATHS = [
  'contracts/vtt-handoff/v1/protocol.schema.json',
  'contracts/vtt-handoff/v1/art.schema.json',
  'contracts/vtt-handoff/v1/contracts.d.ts',
  'fixtures/scenes/two-room.v1.json',
  'fixtures/scenes/two-room.snapshots.v1.json',
  'fixtures/protocol/examples.v1.json',
] as const;

const ADAPTERS = [
  { name: 'rich in-process session', path: 'src/vtt/encounter-session-service.ts' },
  { name: 'in-process SceneTransport', path: 'src/vtt/handoff/in-process-transport.ts' },
  { name: 'module Worker SceneTransport', path: 'src/vtt/handoff/worker-transport.ts' },
  { name: 'loopback WebSocket SceneTransport', path: 'src/vtt/handoff/websocket-transport.ts' },
] as const;

export const HANDOFF_LIMITATIONS = [
  'F79/F81: WebSocket identity-capture edge cases remain in the integration ledger.',
  'F82/F87: Worker and terminal-outcome conformance coverage still has known gaps.',
  'F83: JSON-operation measurement proves the client side only.',
  'F88: production build inherits NODE_ENV; the correction is tracked separately on main.',
  'F94/F95: top-down closure and post-close settlement edge cases remain ledgered.',
] as const;

const CONNECTION_POINTS = [
  'Browser in-process: src/vtt/encounter-app.ts -> src/vtt/encounter-session-service.ts',
  'Browser Worker: src/vtt/handoff/worker-transport.ts -> src/vtt/handoff/worker-entry.ts',
  'Node WebSocket: tools/vtt-handoff/node-runtime-main.ts -> tools/vtt-handoff/node-runtime.ts',
  'Windows consumer: contracts/v1, fixtures, art/inbox, art/outbox, and reports/claude under VTT_HANDOFF_ROOT',
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const systemGitReader: ReportGitReader = {
  read(repositoryRoot, args) {
    const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`REPORT_GIT_FAILED: ${result.stderr.trim()}`);
    return result.stdout.trim();
  },
};

function repositoryEvidence(
  repositoryRoot: string,
  gitReader: ReportGitReader,
): HandoffReport['repository'] {
  const changed = [
    ...gitReader.read(repositoryRoot, ['diff', '--name-only', 'HEAD', '--']).split('\n'),
    ...gitReader.read(repositoryRoot, ['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter((path) => path.length > 0);
  return {
    name: 'srd-55', root: repositoryRoot,
    commit: gitReader.read(repositoryRoot, ['rev-parse', 'HEAD']),
    changedFiles: [...new Set(changed)].sort(),
  };
}

function readSupervisorInput(inputPath: string | undefined): {
  readonly input: SupervisorReportInput | null;
  readonly reason: string | null;
} {
  if (inputPath === undefined || inputPath.length === 0) {
    return { input: null, reason: 'SUPERVISOR_RESULTS_MISSING' };
  }
  let candidate: unknown;
  try { candidate = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown; }
  catch { return { input: null, reason: 'SUPERVISOR_RESULTS_UNREADABLE' }; }
  const parsed = supervisorReportInputSchema.safeParse(candidate);
  return parsed.success
    ? { input: parsed.data, reason: null }
    : { input: null, reason: 'SUPERVISOR_RESULTS_INVALID' };
}

function reconcileGates(
  input: SupervisorReportInput | null,
  repository: HandoffReport['repository'],
): readonly GateReconciliation[] {
  const referenced = new Map<GateId, string>();
  for (const execution of input?.gateExecutions ?? []) {
    referenced.set(execution.gateId as GateId, execution.receiptPath);
  }
  const initial = REQUIRED_HANDOFF_GATES.map((gate) => reconcileGateReceipt(
    gate,
    referenced.get(gate.id) ?? null,
    repository.commit,
    repository.root,
  ));
  const byId = new Map(initial.map((outcome) => [outcome.id, outcome]));
  return REQUIRED_HANDOFF_GATES.map((gate, index) => {
    const outcome = initial[index];
    if (outcome === undefined) throw new Error(`MISSING_RECONCILIATION: ${gate.id}`);
    const failedPrerequisite = gate.prerequisites.find((id) => {
      const state = byId.get(id)?.state;
      return state !== 'passed' && state !== 'passed-on-retry';
    });
    if (failedPrerequisite === undefined) return outcome;
    return {
      ...outcome,
      state: outcome.state === 'not-run' ? 'not-run' : 'failed',
      reasons: [...outcome.reasons, `REQUIRED_GATE_PREREQUISITE_FAILED: ${failedPrerequisite}`],
    };
  });
}

function readiness(
  input: SupervisorReportInput | null,
  inputReason: string | null,
  outcomes: readonly GateReconciliation[],
): {
  readonly value: HandoffReadiness;
  readonly reasons: readonly string[];
} {
  const reasons: string[] = [];
  if (input === null) {
    reasons.push(inputReason ?? 'SUPERVISOR_RESULTS_MISSING');
  } else {
    for (const outcome of outcomes) {
      if (outcome.state !== 'passed' && outcome.state !== 'passed-on-retry') {
        reasons.push(...outcome.reasons);
      }
    }
    if (input.windowsProbe.status !== 'PASSED') {
      reasons.push(`WINDOWS_PROBE_${input.windowsProbe.status}`);
    }
  }
  return { value: reasons.length === 0 ? 'READY' : 'PARTIAL', reasons: [...new Set(reasons)] };
}

export function buildHandoffReport(options: {
  readonly repositoryRoot: string;
  readonly inputPath?: string;
  readonly gitReader?: ReportGitReader;
}): HandoffReport {
  const supplied = readSupervisorInput(options.inputPath);
  const repository = repositoryEvidence(options.repositoryRoot, options.gitReader ?? systemGitReader);
  const gateOutcomes = reconcileGates(supplied.input, repository);
  const status = readiness(supplied.input, supplied.reason, gateOutcomes);
  const digests = DIGEST_PATHS.map((path): DigestRecord => {
    const bytes = readFileSync(join(options.repositoryRoot, path));
    return { path, sha256: sha256(bytes), length: bytes.length };
  });
  return {
    schemaVersion: 2,
    readiness: status.value,
    reasons: status.reasons,
    repository,
    evidence: supplied.input,
    requiredGates: REQUIRED_HANDOFF_GATES,
    gateOutcomes,
    digests,
    adapters: ADAPTERS,
    methods: [...HANDOFF_METHODS],
    art: {
      outbox: 'art/outbox', inbox: 'art/inbox', review: 'art/review',
      sampleAssetIds: ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId),
      requests: supplied.input?.artRequests ?? [],
    },
    limitations: HANDOFF_LIMITATIONS,
    connectionPoints: CONNECTION_POINTS,
  };
}

function markdown(report: HandoffReport): Buffer {
  const evidence = report.evidence;
  const gateLines = report.gateOutcomes.flatMap((outcome) => [
    `- ${outcome.id}: ${outcome.state}; required=${String(outcome.required)}; ` +
      `receipt=${outcome.receiptPath ?? 'none'}; invocation=${outcome.invocationId ?? 'none'}; ` +
      `report=${outcome.reportPath ?? 'none'}`,
    `  prerequisites=${outcome.prerequisites.join(',') || 'none'}; ` +
      `phaseInvocationIds=${outcome.phaseInvocationIds.join(',') || 'none'}`,
    `  files required/discovered/executed/failed/skipped=${String(outcome.requiredFiles.length)}/` +
      `${String(outcome.discoveredFiles.length)}/${String(outcome.executedFiles.length)}/` +
      `${String(outcome.failedFiles.length)}/${String(outcome.skippedFiles.length)}`,
    `  requiredFiles=${outcome.requiredFiles.join(',') || 'none'}`,
    `  discoveredFiles=${outcome.discoveredFiles.join(',') || 'none'}`,
    `  executedFiles=${outcome.executedFiles.join(',') || 'none'}`,
    `  failedFiles=${outcome.failedFiles.join(',') || 'none'}`,
    `  skippedFiles=${outcome.skippedFiles.join(',') || 'none'}`,
    `  tests required/executed/failed/skipped/approved=${String(outcome.requiredTestIdentities.length)}/` +
      `${String(outcome.executedTestIdentities.length)}/${String(outcome.failedTestIdentities.length)}/` +
      `${String(outcome.skippedTestIdentities.length)}/` +
      `${String(outcome.approvedSkippedTestIdentities.length)}`,
    `  requiredTests=${outcome.requiredTestIdentities.join(',') || 'none'}`,
    `  executedTests=${outcome.executedTestIdentities.join(',') || 'none'}`,
    `  failedTests=${outcome.failedTestIdentities.join(',') || 'none'}`,
    `  skippedTests=${outcome.skippedTestIdentities.join(',') || 'none'}`,
    `  approvedSkippedTests=${outcome.approvedSkippedTestIdentities.join(',') || 'none'}`,
    `  passedOnRetry=${outcome.passedOnRetry.join(',') || 'none'}`,
    `  phaseFailures=${JSON.stringify(outcome.phaseFailures)}`,
    `  phaseAccounting=${JSON.stringify(outcome.phaseAccounting)}`,
    `  reasons=${outcome.reasons.join('; ') || 'none'}`,
  ]);
  const lines = [
    `# VTT handoff: ${report.readiness}`,
    '',
    `Repository: ${report.repository.name}`,
    `Commit: ${report.repository.commit}`,
    `Root: ${report.repository.root}`,
    '',
    '## Reasons',
    '',
    ...(report.reasons.length === 0 ? ['- None.'] : report.reasons.map((reason) => `- ${reason}`)),
    '',
    '## Changed files',
    '',
    ...(report.repository.changedFiles.length === 0
      ? ['- None.'] : report.repository.changedFiles.map((path) => `- ${path}`)),
    '',
    '## Tool evidence',
    '',
    ...(evidence?.tools.map((tool) => `- ${tool.name} ${tool.version}: ${tool.command}`)
      ?? ['- No supervisor results supplied.']),
    '',
    '## Gate outcomes',
    '',
    ...gateLines,
    '',
    '## Required gate inventory',
    '',
    '- The rendered commands are leaf invocations; the `handoff:gate run` wrapper creates outer receipts.',
    ...report.requiredGates.flatMap((gate) => [`- ${gate.id} [${gate.tier}]`, `  ${renderGateCommand(gate)}`]),
    '',
    '## Windows probe',
    '',
    evidence === null
      ? '- No supervisor results supplied.'
      : `- ${evidence.windowsProbe.status}: ${evidence.windowsProbe.command}; ` +
        `reason=${evidence.windowsProbe.reason ?? 'none'}`,
    '',
    '## Contract and fixture digests',
    '',
    ...report.digests.map((digest) => `- ${digest.path}: sha256=${digest.sha256}; length=${String(digest.length)}`),
    '',
    '## Adapters and methods',
    '',
    ...report.adapters.map((adapter) => `- ${adapter.name}: ${adapter.path}`),
    `- v1 methods: ${report.methods.join(', ')}`,
    '',
    '## Art exchange',
    '',
    `- Paths: ${report.art.outbox}, ${report.art.inbox}, ${report.art.review}`,
    `- Sample asset IDs: ${report.art.sampleAssetIds.join(', ')}`,
    ...(report.art.requests.length === 0
      ? ['- Request bundles: none supplied.']
      : report.art.requests.map((request) =>
        `- Request ${request.requestId}: ${request.requestPath}; result=${request.resultPath ?? 'not supplied'}`)),
    '',
    '## Known limitations',
    '',
    ...report.limitations.map((limitation) => `- ${limitation}`),
    '',
    '## Connection points',
    '',
    ...report.connectionPoints.map((point) => `- ${point}`),
    '',
    'The contract-level contracts/v1/READY.json denotes only the atomic core bundle; ' +
      'it does not assert this overall readiness result.',
    '',
  ];
  return Buffer.from(lines.join('\n'));
}

function json(report: HandoffReport): Buffer {
  return Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
}

function syncDirectory(directory: string): void {
  const descriptor = openSync(directory, 'r');
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function writeAtomic(destination: string, bytes: Buffer, nonce: () => string): void {
  const partial = `${destination}.partial.${nonce()}`;
  const descriptor = openSync(
    partial,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o644,
  );
  try {
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
    }
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  try { renameSync(partial, destination); } finally { if (existsSync(partial)) unlinkSync(partial); }
  syncDirectory(dirname(destination));
}

export function publishHandoffReport(options: {
  readonly repositoryRoot?: string;
  readonly handoffRoot?: string;
  readonly inputPath?: string;
  readonly check?: boolean;
  readonly identityPolicy?: RepositoryIdentityPolicy;
  readonly hooks?: ReportPublishHooks;
  readonly gitReader?: ReportGitReader;
} = {}): ReportPublishResult {
  const paths = handoffPaths({
    ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
    ...(options.handoffRoot === undefined ? {} : { handoffRoot: options.handoffRoot }),
    ...(options.identityPolicy === undefined ? {} : { identityPolicy: options.identityPolicy }),
  });
  const report = buildHandoffReport({
    repositoryRoot: paths.repositoryRoot,
    ...(options.inputPath === undefined ? {} : { inputPath: options.inputPath }),
    ...(options.gitReader === undefined ? {} : { gitReader: options.gitReader }),
  });
  const entries = [
    { path: 'reports/claude/handoff.json', bytes: json(report) },
    { path: 'reports/claude/READY.md', bytes: markdown(report) },
  ] as const;
  if (options.check === true) {
    for (const entry of entries) {
      const destination = join(paths.handoffRoot, entry.path);
      if (!existsSync(destination)) throw new Error(`HANDOFF_REPORT_MISSING: ${entry.path}`);
      if (!readFileSync(destination).equals(entry.bytes)) throw new Error(`HANDOFF_REPORT_MISMATCH: ${entry.path}`);
    }
    return {
      root: paths.handoffRoot,
      status: 'verified',
      readiness: report.readiness,
      files: 2,
      reasons: report.reasons,
    };
  }
  const reportDirectory = join(paths.handoffRoot, 'reports/claude');
  mkdirSync(reportDirectory, { recursive: true });
  const nonce = options.hooks?.nonce ?? (() => `${String(process.pid)}.${randomBytes(12).toString('hex')}`);
  for (const entry of entries) {
    writeAtomic(join(paths.handoffRoot, entry.path), entry.bytes, nonce);
    options.hooks?.afterRename?.(entry.path);
  }
  return {
    root: paths.handoffRoot,
    status: 'published',
    readiness: report.readiness,
    files: 2,
    reasons: report.reasons,
  };
}
