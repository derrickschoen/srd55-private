import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from '../../helpers/test-filesystem';
import {
  buildHandoffReport, publishHandoffReport, type SupervisorReportInput,
} from '../../../tools/vtt-handoff/report';

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
    gates: [{
      name: 'focused-contracts', command: 'npx vitest run focused.test.ts', required: true,
      status: gateStatus, summary: gateStatus === 'PASSED' ? '2 tests passed' : '1 test failed',
      preExistingFailures: gateStatus === 'FAILED' ? ['legacy-control: known before handoff'] : [],
    }],
    windowsProbe: {
      status: windowsStatus, command: 'VTT_WINDOWS_INTEROP=1 npm run windows:probe',
      reason: windowsStatus === 'PASSED' ? null : 'POWERSHELL_UNAVAILABLE',
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
      hooks: { nonce: () => 'fixed', afterRename: (path) => order.push(path) },
    });
    expect(result).toMatchObject({ status: 'published', readiness: 'READY', files: 2, reasons: [] });
    expect(order).toEqual(['reports/claude/handoff.json', 'reports/claude/READY.md']);
    expect(readdirSync(join(handoffRoot, 'reports/claude')).some((name) => name.includes('.partial.'))).toBe(false);
    expect(existsSync(join(handoffRoot, 'reports/windows'))).toBe(false);

    const report = JSON.parse(readFileSync(join(handoffRoot, 'reports/claude/handoff.json'), 'utf8')) as {
      readonly readiness: string;
      readonly repository: { readonly commit: string; readonly changedFiles: readonly string[] };
      readonly digests: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
      readonly methods: readonly string[];
      readonly art: { readonly sampleAssetIds: readonly string[] };
      readonly limitations: readonly string[];
    };
    expect(report.readiness).toBe('READY');
    expect(report.repository.commit).toMatch(/^[a-f0-9]{40}$/u);
    expect(report.repository.changedFiles).toContain('tools/vtt-handoff/report.ts');
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
    expect(report.limitations.join('\n')).toContain('F94/F95');
    expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
      .toContain('contract-level contracts/v1/READY.json denotes only the atomic core bundle');
    expect(publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
    })).toMatchObject({ status: 'verified', readiness: 'READY', files: 2 });
  });

  it('reports PARTIAL with failed or not-run required gates instead of planned success', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input('FAILED'));
    const result = publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
    expect(result).toMatchObject({
      readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_FAILED: focused-contracts'],
    });
    const markdown = readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8');
    expect(markdown).toContain('# VTT handoff: PARTIAL');
    expect(markdown).toContain('legacy-control: known before handoff');
    expect(markdown).not.toContain('# VTT handoff: READY\n');

    const notRunEvidence = inputFile(handoffRoot, input('NOT_RUN'));
    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: notRunEvidence }))
      .toMatchObject({ readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_NOT_RUN: focused-contracts'] });
  });

  it('reports PARTIAL when the Windows probe is UNAVAILABLE even though every required gate passed', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input('PASSED', 'UNAVAILABLE'));
    const report = buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: evidence });
    expect(report.readiness).toBe('PARTIAL');
    expect(report.reasons).toEqual(['WINDOWS_PROBE_UNAVAILABLE']);
    expect(report.evidence?.gates.every((gate) => gate.status === 'PASSED')).toBe(true);
    expect(report.evidence?.windowsProbe).toMatchObject({
      status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE',
    });
  });

  it('makes absent or invalid supervisor results PARTIAL and check mode performs no repair', () => {
    const absent = buildHandoffReport({ repositoryRoot: process.cwd() });
    expect(absent).toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_MISSING'], evidence: null });
    const handoffRoot = root();
    const invalid = join(handoffRoot, 'invalid-results.json');
    writeFileSync(invalid, '{"schemaVersion":1,"gates":[]}\n');
    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: invalid }))
      .toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null });
    expect(() => publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: invalid, check: true,
    })).toThrow('HANDOFF_REPORT_MISSING');
    expect(existsSync(join(handoffRoot, 'reports'))).toBe(false);
  });

  it('detects report drift in check mode without overwriting the supplied bytes', () => {
    const handoffRoot = root();
    const evidence = inputFile(handoffRoot, input());
    publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
    const ready = join(handoffRoot, 'reports/claude/READY.md');
    writeFileSync(ready, 'pre-existing divergent report\n');
    expect(() => publishHandoffReport({
      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
    })).toThrow('HANDOFF_REPORT_MISMATCH');
    expect(readFileSync(ready, 'utf8')).toBe('pre-existing divergent report\n');
  });
});
