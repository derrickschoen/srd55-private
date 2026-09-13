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

const resultStatusSchema = z.enum(['PASSED', 'FAILED', 'UNAVAILABLE', 'NOT_RUN']);
const uuidV7Schema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
);

export const REQUIRED_HANDOFF_GATES = [
  { name: 'full-typecheck', command: 'npx tsc -b --force' },
  { name: 'structural-scan', command: 'sg scan' },
  { name: 'unit-gate', command: 'npm run test:gate' },
  { name: 'production-build', command: 'npm run build' },
  {
    name: 'node-runtime-launch',
    command: 'npx vitest run --configLoader runner --config tests/integration-supervisor/vitest.config.ts tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts',
  },
  {
    name: 'worker-dist-playwright',
    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts',
  },
  {
    name: 'browser-gate',
    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:gate:browser',
  },
  { name: 'cumulative-targeted-vitest', command: 'npx vitest run --configLoader runner <S0-S10 targeted specs>' },
  {
    name: 'worker-dev-playwright',
    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts',
  },
  {
    name: 'runtime-parity-playwright',
    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts',
  },
  {
    name: 'top-down-smoke-playwright',
    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts',
  },
] as const;

const supervisorReportInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  tools: z.array(z.strictObject({
    name: z.string().min(1), version: z.string().min(1), command: z.string().min(1),
  })).min(1),
  gates: z.array(z.strictObject({
    name: z.string().min(1), command: z.string().min(1),
    status: resultStatusSchema, summary: z.string(),
    preExistingFailures: z.array(z.string()),
  })).min(1).superRefine((gates, context) => {
    const names = new Set<string>();
    for (const [index, gate] of gates.entries()) {
      if (names.has(gate.name)) {
        context.addIssue({
          code: 'custom', path: [index, 'name'],
          message: `Duplicate gate result: ${gate.name}`,
        });
      }
      names.add(gate.name);
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
  readonly schemaVersion: 1;
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

function readiness(input: SupervisorReportInput | null, inputReason: string | null): {
  readonly value: HandoffReadiness;
  readonly reasons: readonly string[];
} {
  const reasons: string[] = [];
  if (input === null) {
    reasons.push(inputReason ?? 'SUPERVISOR_RESULTS_MISSING');
  } else {
    for (const required of REQUIRED_HANDOFF_GATES) {
      const gate = input.gates.find((candidate) => candidate.name === required.name);
      if (gate === undefined) reasons.push(`REQUIRED_GATE_MISSING: ${required.name}`);
      else if (gate.status !== 'PASSED') reasons.push(`REQUIRED_GATE_${gate.status}: ${gate.name}`);
    }
    if (input.windowsProbe.status !== 'PASSED') {
      reasons.push(`WINDOWS_PROBE_${input.windowsProbe.status}`);
    }
  }
  return { value: reasons.length === 0 ? 'READY' : 'PARTIAL', reasons };
}

export function buildHandoffReport(options: {
  readonly repositoryRoot: string;
  readonly inputPath?: string;
  readonly gitReader?: ReportGitReader;
}): HandoffReport {
  const supplied = readSupervisorInput(options.inputPath);
  const status = readiness(supplied.input, supplied.reason);
  const digests = DIGEST_PATHS.map((path): DigestRecord => {
    const bytes = readFileSync(join(options.repositoryRoot, path));
    return { path, sha256: sha256(bytes), length: bytes.length };
  });
  return {
    schemaVersion: 1,
    readiness: status.value,
    reasons: status.reasons,
    repository: repositoryEvidence(options.repositoryRoot, options.gitReader ?? systemGitReader),
    evidence: supplied.input,
    requiredGates: REQUIRED_HANDOFF_GATES,
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
    ...(evidence?.gates.map((gate) => {
      const existing = gate.preExistingFailures.length === 0
        ? 'none' : gate.preExistingFailures.join('; ');
      return `- ${gate.name}: ${gate.status}; command=${gate.command}; summary=${gate.summary}; pre-existing failures=${existing}`;
    }) ?? ['- No supervisor results supplied.']),
    '',
    '## Required gate inventory',
    '',
    ...report.requiredGates.map((gate) => `- ${gate.name}: ${gate.command}`),
    '',
    '## Windows probe',
    '',
    evidence === null
      ? '- No supervisor results supplied.'
      : `- ${evidence.windowsProbe.status}: ${evidence.windowsProbe.command}; reason=${evidence.windowsProbe.reason ?? 'none'}`,
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
    'The contract-level contracts/v1/READY.json denotes only the atomic core bundle; it does not assert this overall readiness result.',
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
    return { root: paths.handoffRoot, status: 'verified', readiness: report.readiness, files: 2, reasons: report.reasons };
  }
  const reportDirectory = join(paths.handoffRoot, 'reports/claude');
  mkdirSync(reportDirectory, { recursive: true });
  const nonce = options.hooks?.nonce ?? (() => `${String(process.pid)}.${randomBytes(12).toString('hex')}`);
  for (const entry of entries) {
    writeAtomic(join(paths.handoffRoot, entry.path), entry.bytes, nonce);
    options.hooks?.afterRename?.(entry.path);
  }
  return { root: paths.handoffRoot, status: 'published', readiness: report.readiness, files: 2, reasons: report.reasons };
}
