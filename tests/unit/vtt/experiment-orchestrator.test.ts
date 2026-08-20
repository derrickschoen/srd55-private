import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  decodeRoundPlanStructure,
  e01RoundPlanReplyContract,
} from '../../../src/vtt/dm-bridge/round-plan-contract';
import {
  aggregateExperimentRecords,
  computeTacticalRegretFromCaptures,
  decodeExperimentTableRecord,
  type ExperimentTableRecord,
} from '../../../src/vtt/experiment-telemetry';
import {
  buildExperimentSchedule,
  decodeVttExperimentArguments,
  preregisterExperiment,
  runE01Table,
  runVttExperiment,
  seededArmOrder,
  type VttExperimentConfig,
} from '../../../tools/vtt-experiment';

const FAKE_CODEX = 'tests/fixtures/fake-codex-dm.mjs';
let directory = '';
let liveRecord: ExperimentTableRecord;

function config(outDirectory: string): VttExperimentConfig {
  return {
    experimentId: 'E01',
    outDirectory,
    skipRegret: true,
    codexBinary: FAKE_CODEX,
    model: 'gpt-5.6-terra',
    reasoningEffort: 'medium',
    requestTimeoutMs: 2_000,
    tableTimeoutMs: 15_000,
  };
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'vtt-experiment-'));
  const execution = config(directory);
  const preregistration = preregisterExperiment(execution);
  const first = buildExperimentSchedule('E01')[0];
  if (first === undefined) throw new Error('E01 schedule is empty.');
  liveRecord = await runE01Table(first, execution, preregistration);
}, 30_000);

afterAll(async () => {
  if (directory.length > 0) await rm(directory, { recursive: true, force: true });
});

describe('E01 experiment registry and orchestration', () => {
  it('arms_unpaired: every paired seed batch has all three arms adjacent', () => {
    const schedule = buildExperimentSchedule('E01');
    expect(schedule).toHaveLength(144);
    for (let index = 0; index < schedule.length; index += 3) {
      const group = schedule.slice(index, index + 3);
      expect(new Set(group.map((entry) => entry.pairId)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.seed)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.replicate)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.armId))).toEqual(new Set([
        'duplicated-full-contract',
        'contract-once-by-id',
        'compact-grammar',
      ]));
      expect(group.map((entry) => entry.randomizedArmOrdinal)).toEqual([0, 1, 2]);
    }
  });

  it('shuffle_uses_wallclock: seeded arm shuffle is deterministic and remains a permutation', () => {
    const arms = ['duplicated-full-contract', 'contract-once-by-id', 'compact-grammar'] as const;
    const first = seededArmOrder(arms, 0x1234_5678, 1);
    expect(seededArmOrder(arms, 0x1234_5678, 1)).toEqual(first);
    expect(new Set(first)).toEqual(new Set(arms));
    expect(seededArmOrder(arms, 0x1234_5678, 2)).not.toEqual(first);
  });

  it('record_schema_all_fields: stand-in bridge yields five complete round records and regret captures', () => {
    expect(() => decodeExperimentTableRecord(liveRecord)).not.toThrow();
    expect(liveRecord).toMatchObject({
      experimentId: 'E01',
      enemyCountStratum: 4,
      completedRounds: 5,
      status: 'completed',
      replayProofPassed: true,
    });
    expect(liveRecord.calls).toHaveLength(5);
    expect(liveRecord.calls.every((call) => call.transcriptId.length > 0)).toBe(true);
    expect(liveRecord.calls.every((call) => call.promptComponents.projection.bytes > 0)).toBe(true);
    expect(liveRecord.calls.every((call) => call.fullStateHash.length === 64)).toBe(true);
    expect(liveRecord.quality.regretStatus).toBe('deferred');
    expect(liveRecord.quality.rolloutInputCaptures).toHaveLength(5);
  });

  it('report_drops_aborted_tables: aggregate denominators and token totals retain aborted tables', () => {
    const synthetic = [10, 20, 30, 40].map((totalWallMs, index) => decodeExperimentTableRecord({
      ...structuredClone(liveRecord),
      tableIndex: liveRecord.tableIndex + index,
      status: index === 3 ? 'aborted' : 'completed',
      completedRounds: index === 3 ? 0 : 5,
      completedRoundsPerHour: index === 3 ? 0 : 100 + index,
      totalWallMs,
    }));
    const aggregate = aggregateExperimentRecords(synthetic)[0];
    expect(aggregate).toMatchObject({
      tableCount: 4,
      completedCount: 3,
      abortedCount: 1,
      completionRate: 0.75,
      totalWallMs: { q1: 17.5, median: 25, q3: 32.5, iqr: 15 },
    });
    expect(aggregate?.tokenTotals.input).toBe(
      4 * liveRecord.calls.reduce((sum, call) => sum + call.inputTokens, 0),
    );
  });

  it('contract_variant_changes_validator: all prompt shapes retain the same strict decoder', () => {
    const contracts = [
      e01RoundPlanReplyContract('duplicated-full-contract', 2),
      e01RoundPlanReplyContract('contract-once-by-id', 2),
      e01RoundPlanReplyContract('compact-grammar', 2),
    ];
    expect(contracts.map((contract) => contract.contractId)).toEqual([
      'round-plan-json-ast:v1',
      'round-plan-json-ast:v1',
      'round-plan-json-ast:v1',
    ]);
    expect(contracts.map((contract) => contract.delivery)).toEqual(['full', 'reference', 'compact']);
    expect(() => decodeRoundPlanStructure({ kind: 'round_plan', unexpected: true })).toThrow(/unexpected field/u);
  });

  it('parses the fixed E01 CLI without allowing regret to silently default off', () => {
    expect(decodeVttExperimentArguments([
      '--experiment', 'E01',
      '--out', '/tmp/e01',
      '--skip-regret',
      '--codex-bin', FAKE_CODEX,
    ])).toMatchObject({
      experimentId: 'E01',
      skipRegret: true,
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
    });
    expect(decodeVttExperimentArguments([
      '--experiment', 'E01',
      '--out', '/tmp/e01',
    ]).skipRegret).toBe(false);
    expect(() => computeTacticalRegretFromCaptures(liveRecord.quality.rolloutInputCaptures)).toThrow(
      /tactical-regret rollouts are not implemented/u,
    );
  });

  it('writes the preregistration before 144 sequential tables plus JSON and markdown reports', async () => {
    const outDirectory = join(directory, 'synthetic-report');
    const execution = config(outDirectory);
    let active = 0;
    let maximumActive = 0;
    const report = await runVttExperiment(execution, {
      runTable: async (entry, _config, preregistration) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        const record = decodeExperimentTableRecord({
          ...structuredClone(liveRecord),
          preregistrationDigest: preregistration.digest,
          armId: entry.armId,
          batchId: entry.batchId,
          pairId: entry.pairId,
          replicate: entry.replicate,
          tableIndex: entry.tableIndex,
          seed: entry.seed,
          randomizedArmOrdinal: entry.randomizedArmOrdinal,
          promptVariant: entry.armId,
        });
        active -= 1;
        return record;
      },
    });
    expect(maximumActive).toBe(1);
    expect(report.tableCount).toBe(144);
    expect(report.aggregates.map((arm) => [arm.armId, arm.tableCount])).toEqual([
      ['compact-grammar', 48],
      ['contract-once-by-id', 48],
      ['duplicated-full-contract', 48],
    ]);
    expect(await readdir(outDirectory)).toHaveLength(147);
    expect(await readFile(join(outDirectory, 'report.md'), 'utf8')).toContain('Correction rate');
    expect(JSON.parse(await readFile(join(outDirectory, 'report.json'), 'utf8'))).toEqual(report);
  });
});
