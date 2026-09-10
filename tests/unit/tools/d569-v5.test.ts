import { describe, expect, it } from 'vitest';
import { analysisCells } from '../../../tools/d569-v5/analyze-primary-pair';
import { mergeRepairedHard } from '../../../tools/d569-v5/merge-repaired-hard';
import {
  d569ReconciliationSidecarSchema,
  sha256Text,
  type D569ReconciliationSidecar,
} from '../../../tools/d569-v5/reconciliation';
import { validateD569FirstArm } from '../../../tools/d569-v5/validate-first-arm';

function historical(room: number, rep: number, sessionId: string | null) {
  return { room, round: rep, outcome: 'authorized', sessionId };
}

function current(room: number, rep: number, outcome: 'authorized' | 'service_null' | 'infrastructure_failed') {
  const scheduledCellKey = `${String(room)}:${String(rep)}`;
  const dispatchId = `engine-dispatch:grid-${String(room)}-${String(rep)}-0001`;
  const infrastructure = outcome === 'infrastructure_failed';
  const delivered = outcome === 'authorized';
  return {
    rowContractVersion: 'arena-row-v3',
    room,
    round: rep,
    scheduledCellKey,
    dispatchId,
    outcome,
    sessionId: infrastructure ? null : `agent-session:grid-${String(room)}-${String(rep)}`,
    engineCatalogEvidence: infrastructure
      ? { status: 'absent', basis: 'required_engine_initialization_failed', dispatchId, corroboration: ['startup failed'] }
      : { status: 'ready', basis: 'required_cli_completed_with_valid_catalog', dispatchId, advertisedInvocationCount: 0, resourceOperationCount: 0 },
    turnContextDelivery: infrastructure
      ? { status: 'infrastructure_absent', dispatchId, measurement: null }
      : delivered
        ? { status: 'delivered', dispatchId, contextSha256: 'a'.repeat(64), measurement: { baseBytes: 100, semanticBytes: 10 } }
        : { status: 'not_requested', dispatchId, reason: 'catalog_ready_model_did_not_fetch', measurement: null },
    turnContextConfiguredCaps: { baseBytes: 65_536, semanticBytes: 8_192 },
    hostContextDiagnostic: null,
  };
}

function raw(lines: readonly Readonly<Record<string, unknown>>[]): string {
  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}

function reconciliation(source: string): D569ReconciliationSidecar {
  const lines = source.trimEnd().split('\n');
  const entries = ([6, 19, 20] as const).map((rawLineNumber) => {
    const line = lines[rawLineNumber - 1];
    if (line === undefined) throw new Error('Fixture raw line is absent.');
    const row = JSON.parse(line) as Readonly<Record<string, unknown>>;
    return {
      rawLineNumber,
      rawLineSha256: sha256Text(line),
      scheduledCellKey: `${String(row['room'])}:${String(row['round'])}`,
      recoveredSessionId: `recovered-session-${String(rawLineNumber)}`,
      rolloutPath: `/evidence/rollout-${String(rawLineNumber)}.jsonl`,
      rolloutSha256: String(rawLineNumber).padStart(64, '0'),
      reviewerApproval: {
        reviewer: 'independent-reviewer',
        approvedAt: '2026-09-09T20:00:00.000Z',
        decision: 'approved' as const,
      },
    };
  });
  return d569ReconciliationSidecarSchema.parse({
    version: 'd569-reconciliation-v1', rawFileSha256: sha256Text(source), entries,
  });
}

describe('D569 v5 replacement validation and analysis tools', () => {
  it('validates and analyzes a mixed 27-historical/3-current hard grid without rewriting retained bytes', () => {
    const originalRows = Array.from({ length: 10 }, (_, roomIndex) =>
      [1, 2, 3].map((rep) => historical(
        roomIndex + 1,
        rep,
        [6, 19, 20].includes(roomIndex * 3 + rep) ? null : `historical-session-${String(roomIndex + 1)}-${String(rep)}`,
      ))).flat();
    const original = raw(originalRows);
    const sidecar = reconciliation(original);
    const replacements = raw([
      current(2, 1, 'infrastructure_failed'),
      current(4, 1, 'service_null'),
      current(8, 1, 'authorized'),
    ]);
    const mixed = mergeRepairedHard(original, replacements);
    const originalLines = original.trimEnd().split('\n');
    const mixedLines = mixed.trimEnd().split('\n');

    expect(mixedLines).toHaveLength(30);
    expect(mixedLines.filter((line, index) => line === originalLines[index])).toHaveLength(27);
    const observations = validateD569FirstArm(mixed, sidecar);
    const analyzed = analysisCells(observations);
    expect(analyzed.find((cell) => cell.scheduledCellKey === '2:1')).toEqual({
      scheduledCellKey: '2:1', outcome: 'infrastructure_failed', score: null, excluded: true,
    });
    expect(analyzed.find((cell) => cell.scheduledCellKey === '4:1')).toEqual({
      scheduledCellKey: '4:1', outcome: 'service_failed', score: 0, excluded: false,
    });
    expect(observations.filter((entry) => entry.effectiveSessionId?.startsWith('recovered-session-')))
      .toHaveLength(3);
  });

  it('validates a complete 30-current brutal grid containing diagnosed startup failure', () => {
    const brutal = raw(Array.from({ length: 10 }, (_, roomIndex) =>
      [1, 2, 3].map((rep) => current(
        roomIndex + 1,
        rep,
        roomIndex === 6 && rep === 2 ? 'infrastructure_failed' : 'authorized',
      ))).flat());
    const observations = validateD569FirstArm(brutal);
    expect(observations).toHaveLength(30);
    expect(observations.filter((entry) => entry.infrastructure).map((entry) => entry.scheduledCellKey))
      .toEqual(['7:2']);
  });

  it('rejects partial v3 hybrids and indeterminate integrity before analysis', () => {
    expect(() => validateD569FirstArm(raw([{
      ...historical(1, 1, 'session-1'), scheduledCellKey: '1:1',
    }]))).toThrow('partial arena-row-v3 hybrid');
    expect(() => validateD569FirstArm(raw([{
      ...current(1, 1, 'authorized'),
      outcome: 'integrity_indeterminate',
      engineCatalogEvidence: { status: 'inconclusive', dispatchId: 'engine-dispatch:grid-1-1-0001' },
      turnContextDelivery: { status: 'indeterminate', dispatchId: 'engine-dispatch:grid-1-1-0001', measurement: null },
    }]))).toThrow('cannot enter validation');
  });
});
