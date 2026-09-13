import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from '../../helpers/test-filesystem';
import {
  buildHandoffReport, publishHandoffReport, REQUIRED_HANDOFF_GATES,
  type ReportGitReader, type SupervisorReportInput,
} from '../../../tools/vtt-handoff/report';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const REQUEST_ID = '018f0f23-7b5d-7a11-8abc-1234567890ab';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-handoff-report-'));
}

function input(
  gateStatus: SupervisorReportInput['gates'][number]['status'] = 'PASSED',
  windowsStatus: SupervisorReportInput['windowsProbe']['status'] = 'PASSED',
): SupervisorReportInput {
  return {
    schemaVersion: 1,
    tools: [
      { name: 'node', version: process.version, command: 'node --version' },
      { name: 'vitest', version: '4.1.10', command: 'npx vitest run focused.test.ts' },
    ],
    gates: REQUIRED_HANDOFF_GATES.map((gate, index) => ({
      name: gate.name, command: gate.command,
      status: index === 0 ? gateStatus : 'PASSED',
      summary: index === 0 && gateStatus !== 'PASSED' ? '1 test failed' : 'required gate passed',
      preExistingFailures: index === 0 && gateStatus === 'FAILED'
        ? ['legacy-control: known before handoff'] : [],
    })),
    artRequests: [{
      requestId: REQUEST_ID,
      requestPath: `art/outbox/${REQUEST_ID}.request.json`,
      resultPath: `art/inbox/${REQUEST_ID}.result.json`,
    }],
    windowsProbe: {
      status: windowsStatus, command: 'VTT_WINDOWS_INTEROP=1 npm run windows:probe',
      reason: windowsStatus === 'PASSED' ? null : 'POWERSHELL_UNAVAILABLE',
    },
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

function inputFile(directory: string, value: SupervisorReportInput): string {
  const path = join(directory, 'supervisor-results.json');
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  return path;
}

describe('VTT handoff readiness report', () => {
  it('writes READY evidence atomically under reports/claude and independently hashes every contract fixture', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input());
    const order: string[] = [];
    const result = publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence,
      gitReader: gitReader(),
      hooks: { nonce: () => 'fixed', afterRename: (path) => order.push(path) },
    });
    expect(result).toMatchObject({ status: 'published', readiness: 'READY', files: 2, reasons: [] });
    expect(order).toEqual(['reports/claude/handoff.json', 'reports/claude/READY.md']);
    expect(readdirSync(join(handoffRoot, 'reports/claude')).some((name) => name.includes('.partial.'))).toBe(false);
    expect(existsSync(join(handoffRoot, 'reports/windows'))).toBe(false);

    const report = JSON.parse(readFileSync(join(handoffRoot, 'reports/claude/handoff.json'), 'utf8')) as {
      readonly readiness: string;
      readonly repository: {
        readonly name: string; readonly root: string;
        readonly commit: string; readonly changedFiles: readonly string[];
      };
      readonly digests: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
      readonly methods: readonly string[];
      readonly art: {
        readonly sampleAssetIds: readonly string[];
        readonly requests: readonly {
          readonly requestId: string; readonly requestPath: string; readonly resultPath: string | null;
        }[];
      };
      readonly limitations: readonly string[];
    };
    expect(report.readiness).toBe('READY');
    expect(report.repository).toEqual({
      name: 'srd-55', root: process.cwd(), commit: COMMIT, changedFiles: [],
    });
    expect(report.digests).toHaveLength(6);
    for (const digest of report.digests) {
      const bytes = readFileSync(join(process.cwd(), digest.path));
      expect(digest).toEqual({
        path: digest.path,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        length: bytes.length,
      });
    }
    expect(report.methods).toEqual(['session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set']);
    expect(report.art.sampleAssetIds).toContain('token.adventurer');
    expect(report.art.requests).toEqual([{
      requestId: REQUEST_ID,
      requestPath: `art/outbox/${REQUEST_ID}.request.json`,
      resultPath: `art/inbox/${REQUEST_ID}.result.json`,
    }]);
    expect(report.limitations.join('\n')).toContain('F94/F95');
    expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
      .toContain('contract-level contracts/v1/READY.json denotes only the atomic core bundle');
    expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
      .toContain(`Request ${REQUEST_ID}: art/outbox/${REQUEST_ID}.request.json`);
    expect(publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
      gitReader: gitReader(),
    })).toMatchObject({ status: 'verified', readiness: 'READY', files: 2 });
  });

  it('records clean and dirty repository evidence through the injected Git reader', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input());
    const clean = buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader() });
    expect(clean.repository).toEqual({
      name: 'srd-55', root: process.cwd(), commit: COMMIT, changedFiles: [],
    });
    const dirty = buildHandoffReport({
      repositoryRoot: process.cwd(), inputPath: evidence,
      gitReader: gitReader({
        tracked: 'src/changed.ts\ndocs/vtt-handoff/runtime-api.md\n',
        untracked: 'tools/new-report-input.json\nsrc/changed.ts\n',
      }),
    });
    expect(dirty.repository).toEqual({
      name: 'srd-55', root: process.cwd(), commit: COMMIT,
      changedFiles: ['docs/vtt-handoff/runtime-api.md', 'src/changed.ts', 'tools/new-report-input.json'],
    });
  });

  it('makes every individually omitted inventory result PARTIAL, including the launch probe', () => {
    const handoffRoot = root();
    for (const omitted of REQUIRED_HANDOFF_GATES) {
      const candidate = input();
      const evidence = inputFile(handoffRoot, {
        ...candidate,
        gates: candidate.gates.filter((gate) => gate.name !== omitted.name),
      });
      const report = buildHandoffReport({
        repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
      });
      expect(report.readiness, omitted.name).toBe('PARTIAL');
      expect(report.reasons, omitted.name).toContain(`REQUIRED_GATE_MISSING: ${omitted.name}`);
    }
    expect(REQUIRED_HANDOFF_GATES.map((gate) => gate.name)).toEqual([
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
    ]);
  });

  it.each(['passed-then-failed', 'failed-then-passed'] as const)(
    'rejects conflicting duplicate gate results ordered %s',
    (order) => {
      const handoffRoot = root();
      const candidate = input();
      const passed = candidate.gates.find((gate) => gate.name === 'unit-gate');
      if (passed === undefined) throw new Error('The unit-gate fixture is unavailable.');
      const failed = {
        ...passed, status: 'FAILED' as const, summary: 'conflicting duplicate failure',
      };
      const gates = order === 'passed-then-failed'
        ? [...candidate.gates, failed]
        : [failed, ...candidate.gates];
      const evidence = inputFile(handoffRoot, { ...candidate, gates });
      const report = buildHandoffReport({
        repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
      });
      expect(report).toMatchObject({
        readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null,
      });
      expect(report.readiness).not.toBe('READY');
    },
  );

  it('reports PARTIAL with failed or not-run required gates instead of planned success', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input('FAILED'));
    const result = publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, gitReader: gitReader(),
    });
    expect(result).toMatchObject({
      readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_FAILED: full-typecheck'],
    });
    const markdown = readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8');
    expect(markdown).toContain('# VTT handoff: PARTIAL');
    expect(markdown).toContain('legacy-control: known before handoff');
    expect(markdown).not.toContain('# VTT handoff: READY\n');

    const notRunEvidence = inputFile(handoffRoot, input('NOT_RUN'));
    expect(buildHandoffReport({
      repositoryRoot: process.cwd(), inputPath: notRunEvidence, gitReader: gitReader(),
    })).toMatchObject({ readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_NOT_RUN: full-typecheck'] });
  });

  it('reports PARTIAL when the Windows probe is UNAVAILABLE even though every required gate passed', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input('PASSED', 'UNAVAILABLE'));
    const report = buildHandoffReport({
      repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
    });
    expect(report.readiness).toBe('PARTIAL');
    expect(report.reasons).toEqual(['WINDOWS_PROBE_UNAVAILABLE']);
    expect(report.evidence?.gates.every((gate) => gate.status === 'PASSED')).toBe(true);
    expect(report.evidence?.windowsProbe).toMatchObject({
      status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE',
    });
  });

  it('makes absent or invalid supervisor results PARTIAL and check mode performs no repair', () => {
    const absent = buildHandoffReport({ repositoryRoot: process.cwd(), gitReader: gitReader() });
    expect(absent).toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_MISSING'], evidence: null });
    expect(absent.art.requests).toEqual([]);
    const handoffRoot = root();
    const invalid = join(handoffRoot, 'invalid-results.json');
    writeFileSync(invalid, '{"schemaVersion":1,"gates":[]}\n');
    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: invalid, gitReader: gitReader() }))
      .toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null });
    const mismatchedArt = input();
    const mismatchedArtPath = inputFile(handoffRoot, {
      ...mismatchedArt,
      artRequests: [{
        ...mismatchedArt.artRequests[0]!,
        requestPath: 'art/outbox/invented.request.json',
      }],
    });
    expect(buildHandoffReport({
      repositoryRoot: process.cwd(), inputPath: mismatchedArtPath, gitReader: gitReader(),
    })).toMatchObject({
      readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'],
      art: { requests: [] },
    });
    expect(() => publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: invalid, check: true,
      gitReader: gitReader(),
    })).toThrow('HANDOFF_REPORT_MISSING');
    expect(existsSync(join(handoffRoot, 'reports'))).toBe(false);
  });

  it('detects report drift in check mode without overwriting the supplied bytes', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input());
    publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, gitReader: gitReader(),
    });
    const ready = join(handoffRoot, 'reports/claude/READY.md');
    writeFileSync(ready, 'pre-existing divergent report\n');
    expect(() => publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
      gitReader: gitReader(),
    })).toThrow('HANDOFF_REPORT_MISMATCH');
    expect(readFileSync(ready, 'utf8')).toBe('pre-existing divergent report\n');
  });
});
