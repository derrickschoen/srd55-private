import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  decodeRoundPlanStructure,
  e01RoundPlanReplyContract,
  e03RoundPlanReplyContract,
} from '../../../src/vtt/dm-bridge/round-plan-contract';
import {
  aggregateExperimentRecords,
  computeTacticalRegretFromCaptures,
  decodeExperimentTableRecord,
  decisionCorrectionMetrics,
  experimentCallRecordSchema,
  type ExperimentTableRecord,
  type ExperimentTableRecordV5,
} from '../../../src/vtt/experiment-telemetry';
import {
  buildExperimentSchedule,
  decodeVttExperimentArguments,
  evaluateEarlyStop,
  EXPERIMENT_REGISTRY,
  E03_TACTICAL_ADVICE_FORBIDDEN_PHRASES,
  e05TypeCheckMode,
  preregisterExperiment,
  runE01Table,
  runE02Table,
  runE03Table,
  runE04Table,
  runE05Table,
  runVttExperiment,
  seededArmOrder,
  type VttExperimentConfig,
} from '../../../tools/vtt-experiment';

const FAKE_CODEX = 'tests/fixtures/fake-codex-dm.mjs';
let directory = '';
let liveRecord: ExperimentTableRecordV5;
let repeatedRecord: ExperimentTableRecordV5;
let e02Record: ExperimentTableRecordV5;
let e03Record: ExperimentTableRecordV5;
let e04Records: readonly ExperimentTableRecordV5[];
let e05Records: readonly ExperimentTableRecordV5[];

function config(outDirectory: string, experimentId: 'E01' | 'E02' | 'E03' | 'E04' | 'E05' = 'E01'): VttExperimentConfig {
  return {
    experimentId,
    outDirectory,
    skipRegret: true,
    codexBinary: FAKE_CODEX,
    model: 'gpt-5.6-terra',
    reasoningEffort: 'medium',
    requestTimeoutMs: 2_000,
    tableTimeoutMs: 15_000,
    candidateTurnK: 64,
  };
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function legacyV1Record(record: ExperimentTableRecordV5): unknown {
  return {
    ...structuredClone(record),
    schemaVersion: 1,
    calls: record.calls.map(({ bytesSent: _bytesSent, reconstructionFailureCount: _reconstructionFailureCount, typeCheckUniqueCatchObservations: _typeCheckUniqueCatchObservations, envelopeNormalizationRule: _envelopeNormalizationRule, typeCheckProgramCounts: _typeCheckProgramCounts, ...call }) => call),
    quality: {
      ...structuredClone(record.quality),
      rolloutInputCaptures: record.quality.rolloutInputCaptures.map((capture) => {
        const {
          serializedEncounterState: _serializedEncounterState,
          candidateTurnK: _candidateTurnK,
          candidateTurns: _candidateTurns,
          ...legacy
        } = capture;
        return legacy;
      }),
    },
  };
}

function legacyV2Record(record: ExperimentTableRecordV5): unknown {
  return {
    ...structuredClone(record),
    schemaVersion: 2,
    calls: record.calls.map(({ bytesSent: _bytesSent, reconstructionFailureCount: _reconstructionFailureCount, typeCheckUniqueCatchObservations: _typeCheckUniqueCatchObservations, envelopeNormalizationRule: _envelopeNormalizationRule, typeCheckProgramCounts: _typeCheckProgramCounts, ...call }) => call),
  };
}

function legacyV3Record(record: ExperimentTableRecordV5): unknown {
  return {
    ...structuredClone(record),
    schemaVersion: 3,
    calls: record.calls.map(({ typeCheckUniqueCatchObservations: _typeCheckUniqueCatchObservations, envelopeNormalizationRule: _envelopeNormalizationRule, typeCheckProgramCounts: _typeCheckProgramCounts, ...call }) => call),
  };
}

function legacyV4Record(record: ExperimentTableRecordV5): unknown {
  return {
    ...structuredClone(record),
    schemaVersion: 4,
    calls: record.calls.map(({ envelopeNormalizationRule: _envelopeNormalizationRule, typeCheckProgramCounts: _typeCheckProgramCounts, ...call }) => call),
  };
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'vtt-experiment-'));
  const execution = config(directory);
  const preregistration = preregisterExperiment(execution);
  const first = buildExperimentSchedule('E01')[0];
  if (first === undefined) throw new Error('E01 schedule is empty.');
  liveRecord = await runE01Table(first, execution, preregistration);
  const repeatedExecution = config(join(directory, 'repeat'));
  repeatedRecord = await runE01Table(
    first,
    repeatedExecution,
    preregisterExperiment(repeatedExecution),
  );
  const e02Execution = config(join(directory, 'e02'), 'E02');
  const firstE02 = buildExperimentSchedule('E02')[0];
  if (firstE02 === undefined) throw new Error('E02 schedule is empty.');
  e02Record = await runE02Table(
    firstE02,
    e02Execution,
    preregisterExperiment(e02Execution),
  );
  const e03Execution = config(join(directory, 'e03'), 'E03');
  const firstE03 = buildExperimentSchedule('E03')[0];
  if (firstE03 === undefined) throw new Error('E03 schedule is empty.');
  e03Record = await runE03Table(
    firstE03,
    e03Execution,
    preregisterExperiment(e03Execution),
  );
  const e04Execution = config(join(directory, 'e04'), 'E04');
  const e04Schedule = buildExperimentSchedule('E04').slice(0, 3);
  const e04Preregistration = preregisterExperiment(e04Execution);
  e04Records = [];
  for (const entry of e04Schedule) {
    e04Records = [...e04Records, await runE04Table(entry, e04Execution, e04Preregistration)];
  }
  const e05Execution = config(join(directory, 'e05'), 'E05');
  const e05Schedule = buildExperimentSchedule('E05').slice(0, 2);
  const e05Preregistration = preregisterExperiment(e05Execution);
  e05Records = [];
  for (const entry of e05Schedule) {
    e05Records = [...e05Records, await runE05Table(entry, e05Execution, e05Preregistration)];
  }
}, 30_000);

afterAll(async () => {
  if (directory.length > 0) await rm(directory, { recursive: true, force: true });
});

describe('E02 worked-example experiment registration', () => {
  it('arms_share_examples: pins all arms and keeps non-empty example blocks separate from byte-identical instructions', () => {
    const arms = EXPERIMENT_REGISTRY.E02.arms;
    expect(arms.map((arm) => [arm.id, arm.exampleCount])).toEqual([
      ['zero-examples', 0],
      ['one-branch-rich-example', 1],
      ['three-worked-examples', 3],
    ]);
    expect(arms.every((arm) => arm.exampleBlock.length > 0)).toBe(true);
    expect(new Set(arms.map((arm) => arm.instructions)).size).toBe(1);
    expect(arms.every((arm) => !arm.instructions.includes(arm.exampleBlock))).toBe(true);
    expect(arms.map((arm) => arm.workedExamples.length)).toEqual([0, 1, 3]);

    const oneExample = canonicalJson(arms[1]?.workedExamples);
    expect(oneExample).toContain('"kind":"priority"');
    expect(oneExample).toContain('"kind":"if"');

    const threeExamples = canonicalJson(arms[2]?.workedExamples);
    expect(threeExamples).toContain('multi-monster-fallback');
    expect(threeExamples).toContain('"value":"living"');
    expect(threeExamples).toContain('"kind":"move_toward"');
    expect(threeExamples).toContain('"kind":"force_save"');
    expect(arms[2]?.workedExamples[0]?.monsters).toHaveLength(2);
  });

  it('e02_reuses_e01_digest: preregistration is stable across runs and distinct from E01', () => {
    const first = preregisterExperiment(config('/tmp/e02-first', 'E02'));
    const second = preregisterExperiment(config('/tmp/e02-second', 'E02'));
    const e01 = preregisterExperiment(config('/tmp/e01-control'));
    expect(first.digest).toBe(second.digest);
    expect(first.digest).not.toBe(e01.digest);
    expect(first.analysisCodeDigest).not.toBe(e01.analysisCodeDigest);
    expect(first.promptComponentHashes).not.toEqual(e01.promptComponentHashes);
  });

  it('seed_pairing_broken: every E02 seed maps all adjacent arms to one fixture', () => {
    const schedule = buildExperimentSchedule('E02');
    expect(schedule).toHaveLength(144);
    for (let index = 0; index < schedule.length; index += 3) {
      const group = schedule.slice(index, index + 3);
      expect(new Set(group.map((entry) => entry.seed)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.fixtureId)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.armId))).toEqual(new Set([
        'zero-examples',
        'one-branch-rich-example',
        'three-worked-examples',
      ]));
    }
  });

  it('emits capture v5 on a synthetic no-LLM E02 table', () => {
    expect(() => decodeExperimentTableRecord(e02Record)).not.toThrow();
    expect(e02Record).toMatchObject({
      schemaVersion: 5,
      experimentId: 'E02',
      schemaVariant: 'compact-grammar-v1',
      status: 'completed',
      completedRounds: 5,
      replayProofPassed: true,
    });
    expect(e02Record.calls).toHaveLength(5);
    expect(e02Record.quality.rolloutInputCaptures).toHaveLength(5);
    expect(e02Record.calls.every((call) => call.promptComponents.schemaGrammar.bytes > 0)).toBe(true);
    expect(e02Record.calls.every((call) => call.promptComponents.instructions.version === 'e02-shared-v1')).toBe(true);
  });

  it('accepts E02 on the otherwise unchanged CLI', () => {
    expect(decodeVttExperimentArguments([
      '--experiment', 'E02',
      '--out', '/tmp/e02',
      '--skip-regret',
    ])).toMatchObject({ experimentId: 'E02', skipRegret: true });
  });
});

function instructionWordCount(value: string): number {
  return value.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length ?? 0;
}

function sentenceCount(value: string): number {
  return value.match(/[.!?]+(?=\s|$)/gu)?.length ?? 0;
}

describe('E03 instruction-length experiment registration', () => {
  it('pins the three instruction arms and their preregistered length bounds', () => {
    const arms = EXPERIMENT_REGISTRY.E03.arms;
    expect(arms.map((arm) => arm.id)).toEqual([
      'two-sentence-imperative',
      'current-instructions',
      'validation-failure-explainer',
    ]);
    expect(arms.map((arm) => arm.description)).toEqual([
      'Use a two-sentence imperative instruction block.',
      'Retain the current instruction block.',
      'Explain common validation failures without tactical advice.',
    ]);
    expect(sentenceCount(arms[0]?.instructions ?? '')).toBeLessThanOrEqual(2);
    expect(instructionWordCount(arms[2]?.instructions ?? '')).toBeGreaterThanOrEqual(350);
    expect(instructionWordCount(arms[2]?.instructions ?? '')).toBeLessThanOrEqual(450);
    expect(arms[1]?.instructions).toBe(
      'You are the DM decision engine. Return exactly one JSON object and no markdown.',
    );
  });

  it('explainer_contains_tactics: rejects every pinned tactical-advice phrase from the explanatory arm', () => {
    expect(E03_TACTICAL_ADVICE_FORBIDDEN_PHRASES).toEqual([
      'focus fire',
      'attack the weakest',
      'target the lowest',
      'target the highest',
      'prioritize enemies',
      'lowest hit points',
      'highest threat',
      'retreat when',
      'use dodge',
      'save resources',
      'spend resources',
    ]);
    const explainer = EXPERIMENT_REGISTRY.E03.arms[2]?.instructions.toLowerCase() ?? '';
    expect(E03_TACTICAL_ADVICE_FORBIDDEN_PHRASES.filter((phrase) => explainer.includes(phrase))).toEqual([]);
  });

  it('shared_block_varies: keeps grammar, examples, state surface, AST surface, fixture, and round limit byte-identical', () => {
    const arms = EXPERIMENT_REGISTRY.E03.arms;
    const contracts = arms.map((arm) => e03RoundPlanReplyContract(
      arm.id,
      arm.instructions,
      arm.workedExamples,
    ));
    const sharedContractBytes = contracts.map(({ instructions: _instructions, promptVariant: _promptVariant, ...shared }) => canonicalJson(shared));
    expect(new Set(sharedContractBytes).size).toBe(1);
    expect(new Set(arms.map((arm) => arm.exampleBlock)).size).toBe(1);
    expect(arms.map((arm) => arm.exampleCount)).toEqual([3, 3, 3]);

    const schedule = buildExperimentSchedule('E03');
    expect(schedule).toHaveLength(144);
    for (let index = 0; index < schedule.length; index += 3) {
      const group = schedule.slice(index, index + 3);
      expect(new Set(group.map((entry) => entry.pairId)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.seed)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.fixtureId)).size).toBe(1);
      expect(new Set(group.map((entry) => entry.armId))).toEqual(new Set([
        'two-sentence-imperative',
        'current-instructions',
        'validation-failure-explainer',
      ]));
    }
    expect(EXPERIMENT_REGISTRY.E03.rounds).toBe(5);
    expect(new Set(contracts.map((contract) => contract.surface))).toEqual(new Set(['json_ast']));
  });

  it('e03_digest_collides: preregistration is stable and distinct from E01 and E02', () => {
    const first = preregisterExperiment(config('/tmp/e03-first', 'E03'));
    const second = preregisterExperiment(config('/tmp/e03-second', 'E03'));
    const e01 = preregisterExperiment(config('/tmp/e01-control'));
    const e02 = preregisterExperiment(config('/tmp/e02-control', 'E02'));
    expect(first.digest).toBe(second.digest);
    expect(first.digest).not.toBe(e01.digest);
    expect(first.digest).not.toBe(e02.digest);
    expect(first.promptComponentHashes).not.toEqual(e01.promptComponentHashes);
    expect(first.promptComponentHashes).not.toEqual(e02.promptComponentHashes);
  });

  it('emits capture v5 on a synthetic no-LLM E03 table', () => {
    expect(() => decodeExperimentTableRecord(e03Record)).not.toThrow();
    expect(e03Record).toMatchObject({
      schemaVersion: 5,
      experimentId: 'E03',
      schemaVariant: 'compact-grammar-v1',
      exampleCount: 3,
      status: 'completed',
      completedRounds: 5,
      replayProofPassed: true,
    });
    expect(e03Record.calls).toHaveLength(5);
    expect(e03Record.quality.rolloutInputCaptures).toHaveLength(5);
    expect(e03Record.calls.every((call) => call.promptComponents.schemaGrammar.bytes > 0)).toBe(true);
    expect(e03Record.calls.every((call) => call.promptComponents.examples.version === 'e03-three-worked-examples-v1')).toBe(true);
    expect(e03Record.calls.every((call) => call.promptComponents.instructions.version?.startsWith('e03-') === true)).toBe(true);
  });

  it('accepts E03 on the otherwise unchanged CLI', () => {
    expect(decodeVttExperimentArguments([
      '--experiment', 'E03',
      '--out', '/tmp/e03',
      '--skip-regret',
    ])).toMatchObject({ experimentId: 'E03', skipRegret: true });
  });
});

describe('E04 state/context compression registration', () => {
  it('registers three projection arms and 180 adjacent paired tables', () => {
    expect(EXPERIMENT_REGISTRY.E04.arms.map((arm) => [arm.id, arm.projectionMode])).toEqual([
      ['full-projection-history', 'verified_full'],
      ['compact-lossless-decision-view', 'compact_lossless'],
      ['initial-snapshot-revision-deltas', 'revision_delta'],
    ]);
    const schedule = buildExperimentSchedule('E04');
    expect(schedule).toHaveLength(180);
    for (let index = 0; index < schedule.length; index += 3) {
      const block = schedule.slice(index, index + 3);
      expect(new Set(block.map((entry) => entry.pairId)).size).toBe(1);
      expect(new Set(block.map((entry) => entry.armId))).toEqual(new Set([
        'full-projection-history',
        'compact-lossless-decision-view',
        'initial-snapshot-revision-deltas',
      ]));
    }
  });

  it('reconstructs the identical canonical state hash in every arm before model use', () => {
    expect(e04Records).toHaveLength(3);
    expect(new Set(e04Records.map((record) => record.projectionMode))).toEqual(new Set([
      'verified_full',
      'compact_lossless',
      'revision_delta',
    ]));
    const hashesByArm = e04Records.map((record) => record.calls.map((call) => call.fullStateHash));
    expect(hashesByArm[1]).toEqual(hashesByArm[0]);
    expect(hashesByArm[2]).toEqual(hashesByArm[0]);
    expect(e04Records.every((record) => record.calls.every((call) => call.reconstructionMatched))).toBe(true);
  });

  it('bytes_counter_constant: records measured, arm-specific wire bytes and zero reconstruction failures', () => {
    const totals = e04Records.map((record) =>
      record.calls.reduce((sum, call) => sum + call.bytesSent, 0));
    expect(new Set(totals).size).toBe(3);
    expect(e04Records.every((record) => record.calls.every((call) =>
      call.bytesSent === call.snapshotBytes + call.deltaBytes &&
      call.reconstructionFailureCount === 0,
    ))).toBe(true);
    const delta = e04Records.find((record) => record.armId === 'initial-snapshot-revision-deltas');
    expect(delta?.calls.filter((call) => call.snapshotBytes > 0)).toHaveLength(1);
    expect(delta?.calls.filter((call) => call.deltaBytes > 0)).toHaveLength(4);
  });

  it('has a stable preregistration digest distinct from all upstream experiments', () => {
    const first = preregisterExperiment(config('/tmp/e04-first', 'E04'));
    const second = preregisterExperiment(config('/tmp/e04-second', 'E04'));
    expect(first.digest).toBe(second.digest);
    expect(first.digest).not.toBe(preregisterExperiment(config('/tmp/e01', 'E01')).digest);
    expect(first.digest).not.toBe(preregisterExperiment(config('/tmp/e02', 'E02')).digest);
    expect(first.digest).not.toBe(preregisterExperiment(config('/tmp/e03', 'E03')).digest);
    expect(first.earlyStopRule).toMatchObject({
      enabled: true,
      confidence: 0.99,
      minimumTableFraction: 0.5,
      preregisteredTableCeiling: 180,
    });
    expect((['E01', 'E02', 'E03'] as const).map((id) =>
      preregisterExperiment(config(`/tmp/${id.toLowerCase()}-completed`, id)).earlyStopRule.enabled,
    )).toEqual([false, false, false]);
  });

  it('early_stop_before_half: stops a clearly separated run at 99% only after 90 tables', async () => {
    const outDirectory = join(directory, 'e04-early-stop');
    const execution = config(outDirectory, 'E04');
    const report = await runVttExperiment(execution, {
      runTable: async (entry, _config, preregistration) => {
        const source = e04Records.find((record) => record.armId === entry.armId);
        if (source === undefined) throw new Error(`Missing E04 source arm ${entry.armId}.`);
        const speed = entry.armId === 'compact-lossless-decision-view'
          ? 300
          : entry.armId === 'initial-snapshot-revision-deltas' ? 200 : 100;
        return decodeExperimentTableRecord({
          ...structuredClone(source),
          preregistrationDigest: preregistration.digest,
          batchId: entry.batchId,
          pairId: entry.pairId,
          replicate: entry.replicate,
          tableIndex: entry.tableIndex,
          seed: entry.seed,
          randomizedArmOrdinal: entry.randomizedArmOrdinal,
          completedRoundsPerHour: speed,
        });
      },
    });
    expect(report.tableCount).toBe(90);
    expect(report.stoppingReason).toMatch(/^leader_compact-lossless-decision-view_clear_at_99_percent/u);
    expect(await readdir(outDirectory)).toHaveLength(93);
  });

  it('does not early-stop a synthetic tied dataset and reaches the hard ceiling', async () => {
    const outDirectory = join(directory, 'e04-tied');
    const execution = config(outDirectory, 'E04');
    const report = await runVttExperiment(execution, {
      runTable: async (entry, _config, preregistration) => {
        const source = e04Records.find((record) => record.armId === entry.armId);
        if (source === undefined) throw new Error(`Missing E04 source arm ${entry.armId}.`);
        return decodeExperimentTableRecord({
          ...structuredClone(source),
          preregistrationDigest: preregistration.digest,
          batchId: entry.batchId,
          pairId: entry.pairId,
          replicate: entry.replicate,
          tableIndex: entry.tableIndex,
          seed: entry.seed,
          randomizedArmOrdinal: entry.randomizedArmOrdinal,
          completedRoundsPerHour: 100,
        });
      },
    });
    expect(report).toMatchObject({
      tableCount: 180,
      preregisteredTableCeiling: 180,
      stoppingReason: 'preregistered_table_ceiling_reached',
    });
    expect(await readdir(outDirectory)).toHaveLength(183);
  });

  it('supports the generic two-proportion 99% check for binary primary metrics', () => {
    const records: ExperimentTableRecord[] = [];
    for (let pair = 0; pair < 30; pair += 1) {
      for (const source of e04Records) {
        records.push(decodeExperimentTableRecord({
          ...structuredClone(source),
          pairId: `proportion:${String(pair)}`,
          tableIndex: pair * 3 + records.length % 3,
          status: source.armId === 'compact-lossless-decision-view' ? 'completed' : 'aborted',
        }));
      }
    }
    expect(evaluateEarlyStop(records, {
      armIds: EXPERIMENT_REGISTRY.E04.arms.map((arm) => arm.id),
      preregisteredTableCeiling: 180,
      method: 'two_proportion',
    })).toMatchObject({
      shouldStop: true,
      leaderArmId: 'compact-lossless-decision-view',
      completedTables: 90,
      confidence: 0.99,
    });
  });

  it('accepts E04 on the experiment CLI', () => {
    expect(decodeVttExperimentArguments([
      '--experiment', 'E04',
      '--out', '/tmp/e04',
      '--skip-regret',
    ])).toMatchObject({ experimentId: 'E04', skipRegret: true });
  });
});

describe('E05 typed versus untyped restricted-JS registration', () => {
  it('registers exactly two mechanism-only arms with 60 paired tables per arm', () => {
    expect(EXPERIMENT_REGISTRY.E05.arms.map((arm) => [arm.id, arm.typeCheckMode])).toEqual([
      ['typed-js', 'typed'],
      ['untyped-js', 'untyped'],
    ]);
    expect(e05TypeCheckMode('typed-js')).toBe('typed');
    expect(e05TypeCheckMode('untyped-js')).toBe('untyped');
    const first = buildExperimentSchedule('E05');
    const repeated = buildExperimentSchedule('E05');
    expect(first).toEqual(repeated);
    expect(first).toHaveLength(120);
    expect(first.filter((entry) => entry.armId === 'typed-js')).toHaveLength(60);
    expect(first.filter((entry) => entry.armId === 'untyped-js')).toHaveLength(60);
    for (let index = 0; index < first.length; index += 2) {
      const pair = first.slice(index, index + 2);
      expect(new Set(pair.map((entry) => entry.pairId)).size).toBe(1);
      expect(new Set(pair.map((entry) => entry.seed)).size).toBe(1);
      expect(new Set(pair.map((entry) => entry.armId))).toEqual(new Set(['typed-js', 'untyped-js']));
    }
  });

  it('preregisters D332.1 metrics, identical prompt components, and the D328.2 stopping rule', () => {
    const first = preregisterExperiment(config('/tmp/e05-first', 'E05'));
    const repeated = preregisterExperiment(config('/tmp/e05-repeated', 'E05'));
    expect(first.digest).toBe(repeated.digest);
    expect(first.digest).toBe('36db1c644b35e2483838f5e2458b2a308a4454e93fdd3cf57bcebc8b6db59f5d');
    expect(first).toMatchObject({
      programVersion: 'D332.1-v1',
      experimentId: 'E05',
      primaryMetrics: ['correctionRate'],
      secondaryMetrics: [
        'firstPassValidity',
        'meanCorrectionRoundsPerDecision',
        'wallClockMsPerCompletedRound',
        'tokenTotals',
        'completionRate',
      ],
      tertiaryMetrics: ['typeCheckUniqueCatchRate', 'typeCheckUniqueDiagnosticCodesAndExamplePrograms'],
      earlyStopRule: {
        enabled: true,
        metric: 'correctionRate',
        method: 'paired_bootstrap',
        confidence: 0.99,
        minimumTableFraction: 0.5,
        preregisteredTableCeiling: 120,
      },
    });
    expect(first.seedList).toHaveLength(30);
    expect(new Set(Object.values(first.promptComponentHashes)).size).toBe(1);
  });

  it('arms_share_typecheck: the table runner selects JS for both arms and compilation only for typed-js', () => {
    expect(e05Records).toHaveLength(2);
    expect(new Set(e05Records.map((record) => record.armId))).toEqual(new Set(['typed-js', 'untyped-js']));
    expect(e05Records.every((record) =>
      record.planSurface === 'js_program' &&
      record.schemaVariant === 'restricted-js-v1' &&
      record.exampleCount === 3 &&
      record.status === 'completed' &&
      record.calls.every((call) => call.typeCheckUniqueCatchObservations.length === 0),
    )).toBe(true);
    const promptDigests = e05Records.map((record) => record.calls.map((call) => ({
      instructions: call.promptComponents.instructions.digest,
      grammar: call.promptComponents.schemaGrammar.digest,
      examples: call.promptComponents.examples.digest,
    })));
    expect(promptDigests[1]).toEqual(promptDigests[0]);
  });

  it('run_count_counts_failures_only: a real E05 fake-model pair records positive typed passes and null untyped counts', () => {
    const typed = e05Records.find((record) => record.armId === 'typed-js');
    const untyped = e05Records.find((record) => record.armId === 'untyped-js');
    if (typed === undefined || untyped === undefined) throw new Error('E05 fake-model pair is incomplete.');
    const typedAggregate = aggregateExperimentRecords([typed])[0];
    const untypedAggregate = aggregateExperimentRecords([untyped])[0];
    expect(typedAggregate?.typeCheckProgramCounts).toEqual({
      checkedProgramCount: 20,
      passedProgramCount: 20,
      failedProgramCount: 0,
    });
    expect(typed.calls.every((call) =>
      call.typeCheckProgramCounts?.checkedProgramCount === 4 &&
      call.typeCheckProgramCounts.passedProgramCount === 4 &&
      call.typeCheckProgramCounts.failedProgramCount === 0,
    )).toBe(true);
    expect(typedAggregate?.typeCheckProgramCounts?.checkedProgramCount).toBeGreaterThan(0);
    expect(untypedAggregate?.typeCheckProgramCounts).toBeNull();
  });

  it('untyped_reports_zero_not_null: every real E05 untyped call records no checker as null', () => {
    const untyped = e05Records.find((record) => record.armId === 'untyped-js');
    if (untyped === undefined) throw new Error('E05 untyped fake-model table is missing.');
    expect(untyped.calls).not.toHaveLength(0);
    expect(untyped.calls.every((call) => call.typeCheckProgramCounts === null)).toBe(true);
  });

  it('failed_result_recorded_as_pass: a real ambient rejection increments typed failures and unique catches while untyped stays null', async () => {
    const schedule = buildExperimentSchedule('E05');
    const typedEntry = schedule.find((candidate) => candidate.armId === 'typed-js');
    const untypedEntry = schedule.find((candidate) => candidate.armId === 'untyped-js');
    if (typedEntry === undefined || untypedEntry === undefined) throw new Error('E05 fake-model pair is incomplete.');

    const previousMode = process.env.FAKE_CODEX_MODE;
    const previousStateFile = process.env.FAKE_CODEX_STATE_FILE;
    process.env.FAKE_CODEX_MODE = 'js_type_error_once';
    let typed: ExperimentTableRecordV5;
    let untyped: ExperimentTableRecordV5;
    try {
      const typedExecution = config(join(directory, 'e05-js-type-error-typed'), 'E05');
      process.env.FAKE_CODEX_STATE_FILE = join(directory, 'e05-js-type-error-typed-state');
      typed = await runE05Table(typedEntry, typedExecution, preregisterExperiment(typedExecution));

      const untypedExecution = config(join(directory, 'e05-js-type-error-untyped'), 'E05');
      process.env.FAKE_CODEX_STATE_FILE = join(directory, 'e05-js-type-error-untyped-state');
      untyped = await runE05Table(untypedEntry, untypedExecution, preregisterExperiment(untypedExecution));
    } finally {
      if (previousMode === undefined) delete process.env.FAKE_CODEX_MODE;
      else process.env.FAKE_CODEX_MODE = previousMode;
      if (previousStateFile === undefined) delete process.env.FAKE_CODEX_STATE_FILE;
      else process.env.FAKE_CODEX_STATE_FILE = previousStateFile;
    }

    expect(typed.status).toBe('completed');
    const typedCounts = aggregateExperimentRecords([typed])[0]?.typeCheckProgramCounts;
    if (typedCounts === null || typedCounts === undefined) throw new Error('E05 typed counts are missing.');
    expect(typedCounts.checkedProgramCount).toBeGreaterThan(typedCounts.failedProgramCount);
    expect(typedCounts.failedProgramCount).toBeGreaterThan(0);
    expect(typedCounts.checkedProgramCount).toBe(
      typedCounts.passedProgramCount + typedCounts.failedProgramCount,
    );
    console.info(
      `[e05-typecheck-failure] checked/passed/failed ${String(typedCounts.checkedProgramCount)}/${String(typedCounts.passedProgramCount)}/${String(typedCounts.failedProgramCount)}`,
    );

    const observations = typed.calls.flatMap((call) => call.typeCheckUniqueCatchObservations);
    expect(observations).toContainEqual(expect.objectContaining({
      source: "emit(move('combatant:not-in-encounter'));",
      diagnosticCodes: expect.arrayContaining([2345]),
      outcome: 'caughtByBoth',
      runtimeError: expect.stringContaining('outside the projection'),
    }));

    expect(untyped.status).toBe('completed');
    expect(aggregateExperimentRecords([untyped])[0]?.typeCheckProgramCounts).toBeNull();
    expect(untyped.calls.every((call) => call.typeCheckProgramCounts === null)).toBe(true);
  });

  it('empty_schema_path_reintroduced: records a root-path failure from the real E05 JS decoder as null or non-empty', async () => {
    const execution = config(join(directory, 'e05-js-schema-error'), 'E05');
    const entry = buildExperimentSchedule('E05').find((candidate) => candidate.armId === 'typed-js');
    if (entry === undefined) throw new Error('E05 typed schedule is empty.');
    const stateFile = join(directory, 'e05-js-schema-error-state');
    const previousMode = process.env.FAKE_CODEX_MODE;
    const previousStateFile = process.env.FAKE_CODEX_STATE_FILE;
    process.env.FAKE_CODEX_MODE = 'js_schema_error_once';
    process.env.FAKE_CODEX_STATE_FILE = stateFile;
    let record: ExperimentTableRecordV5;
    try {
      record = await runE05Table(entry, execution, preregisterExperiment(execution));
    } finally {
      if (previousMode === undefined) delete process.env.FAKE_CODEX_MODE;
      else process.env.FAKE_CODEX_MODE = previousMode;
      if (previousStateFile === undefined) delete process.env.FAKE_CODEX_STATE_FILE;
      else process.env.FAKE_CODEX_STATE_FILE = previousStateFile;
    }
    const invalidCalls = record.calls.filter((call) => call.validationResult === 'invalid');
    expect(record.status).toBe('completed');
    expect(invalidCalls).toHaveLength(1);
    expect(invalidCalls[0]).toMatchObject({
      phase: 'initial_plan',
      validatorErrorCategory: 'unrecognized_key',
      failedSchemaPath: null,
    });
    expect(record.calls.every((call) =>
      call.failedSchemaPath === null || call.failedSchemaPath.length > 0,
    )).toBe(true);
    expect(record.calls.some((call) => call.phase === 'correction' && call.validationResult === 'valid')).toBe(true);
  });

  it('schema_loosened_instead: rejects an empty failed schema path while accepting null', () => {
    const call = e05Records[0]?.calls[0];
    if (call === undefined) throw new Error('E05 fake table has no decision call.');
    expect(experimentCallRecordSchema.safeParse({ ...call, failedSchemaPath: null }).success).toBe(true);
    const empty = experimentCallRecordSchema.safeParse({ ...call, failedSchemaPath: '' });
    expect(empty.success).toBe(false);
    if (empty.success) throw new Error('Experiment call schema accepted an empty failed schema path.');
    expect(empty.error.issues).toContainEqual(expect.objectContaining({
      code: 'too_small',
      path: ['failedSchemaPath'],
    }));
  });

  it('normalization_untracked: records the closed alias rule when the real E05 decoder normalizes a reply', async () => {
    const execution = config(join(directory, 'e05-js-normalized'), 'E05');
    const entry = buildExperimentSchedule('E05').find((candidate) => candidate.armId === 'untyped-js');
    if (entry === undefined) throw new Error('E05 untyped schedule is empty.');
    const stateFile = join(directory, 'e05-js-normalized-state');
    const previousMode = process.env.FAKE_CODEX_MODE;
    const previousStateFile = process.env.FAKE_CODEX_STATE_FILE;
    process.env.FAKE_CODEX_MODE = 'js_alias_once';
    process.env.FAKE_CODEX_STATE_FILE = stateFile;
    let record: ExperimentTableRecordV5;
    try {
      record = await runE05Table(entry, execution, preregisterExperiment(execution));
    } finally {
      if (previousMode === undefined) delete process.env.FAKE_CODEX_MODE;
      else process.env.FAKE_CODEX_MODE = previousMode;
      if (previousStateFile === undefined) delete process.env.FAKE_CODEX_STATE_FILE;
      else process.env.FAKE_CODEX_STATE_FILE = previousStateFile;
    }

    expect(record.status).toBe('completed');
    expect(record.calls[0]).toMatchObject({
      validationResult: 'valid',
      envelopeNormalizationRule: 'plans_collection',
    });
    expect(record.calls.slice(1).every((call) => call.envelopeNormalizationRule === null)).toBe(true);
    expect(experimentCallRecordSchema.safeParse({
      ...record.calls[0],
      envelopeNormalizationRule: '',
    }).success).toBe(false);
  });

  it('correction_undercount: counts a first-reply failure as one corrected decision and one correction round', () => {
    const root = structuredClone(e05Records[0]?.calls[0]);
    if (root === undefined) throw new Error('E05 fake table has no decision call.');
    const correction = {
      ...structuredClone(root),
      logicalCallId: `${root.logicalCallId}:correction`,
      parentCallId: root.logicalCallId,
      phase: 'correction' as const,
    };
    expect(decisionCorrectionMetrics([root, correction])).toEqual({
      decisionPointCount: 1,
      correctedDecisionPointCount: 1,
      correctionRoundCount: 1,
      correctionRate: 1,
      firstPassValidity: 0,
      meanCorrectionRoundsPerDecision: 1,
    });
  });

  it('applies 99% correction-rate stopping only at a completed paired block after 60 tables', () => {
    const typedSource = e05Records.find((record) => record.armId === 'typed-js');
    const untypedSource = e05Records.find((record) => record.armId === 'untyped-js');
    if (typedSource === undefined || untypedSource === undefined) throw new Error('E05 fake arms are incomplete.');
    const records: ExperimentTableRecord[] = [];
    for (let pair = 0; pair < 30; pair += 1) {
      const typed = structuredClone(typedSource);
      const untyped = structuredClone(untypedSource);
      const root = untyped.calls[0];
      if (root === undefined) throw new Error('E05 untyped fake table has no decision call.');
      untyped.calls.push({
        ...structuredClone(root),
        logicalCallId: `${root.logicalCallId}:synthetic:${String(pair)}`,
        parentCallId: root.logicalCallId,
        phase: 'correction',
      });
      records.push(
        decodeExperimentTableRecord({ ...typed, pairId: `e05-pair:${String(pair)}`, tableIndex: pair * 2 }),
        decodeExperimentTableRecord({ ...untyped, pairId: `e05-pair:${String(pair)}`, tableIndex: pair * 2 + 1 }),
      );
    }
    const options = {
      armIds: ['typed-js', 'untyped-js'],
      preregisteredTableCeiling: 120,
      method: 'paired_bootstrap' as const,
      metric: 'correctionRate' as const,
    };
    expect(evaluateEarlyStop(records.slice(0, 58), options)).toMatchObject({
      shouldStop: false,
      completedTables: 58,
      minimumTables: 60,
      reason: 'minimum_table_fraction_not_reached',
    });
    expect(evaluateEarlyStop(records, options)).toMatchObject({
      shouldStop: true,
      leaderArmId: 'typed-js',
      completedTables: 60,
      minimumTables: 60,
      confidence: 0.99,
    });
  });

  it('reports typed-only unique catch rate with ranked diagnostic codes and example programs', () => {
    const typed = structuredClone(e05Records.find((record) => record.armId === 'typed-js'));
    if (typed === undefined || typed.calls[0] === undefined) throw new Error('E05 typed fake table is incomplete.');
    typed.calls[0].typeCheckUniqueCatchObservations = [{
      monsterId: typed.calls[0].actorIds[0] ?? 'combatant:synthetic',
      source: 'emit(move(nearestEnemy(), 31));',
      sourceHash: digest('emit(move(nearestEnemy(), 31));'),
      diagnosticCodes: [2345],
      outcome: 'caughtOnlyByTypeCheck',
      runtimeError: null,
    }, {
      monsterId: typed.calls[0].actorIds[0] ?? 'combatant:synthetic',
      source: 'emit(attack());',
      sourceHash: digest('emit(attack());'),
      diagnosticCodes: [2554],
      outcome: 'caughtByBoth',
      runtimeError: 'attack requires a target.',
    }];
    const aggregate = aggregateExperimentRecords([typed])[0];
    expect(aggregate?.typeCheckUniqueCatch).toEqual({
      rejectedProgramCount: 2,
      caughtByBothCount: 1,
      caughtOnlyByTypeCheckCount: 1,
      rate: 0.5,
      topUniqueDiagnosticCodes: [{
        code: 2345,
        count: 1,
        exampleProgram: 'emit(move(nearestEnemy(), 31));',
      }],
    });
  });

  it('accepts E05 on the experiment CLI', () => {
    expect(decodeVttExperimentArguments([
      '--experiment', 'E05',
      '--out', '/tmp/e05',
      '--skip-regret',
    ])).toMatchObject({ experimentId: 'E05', skipRegret: true });
  });
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
    expect(liveRecord.schemaVersion).toBe(5);
    expect(liveRecord.quality.rolloutInputCaptures.every((capture) =>
      capture.selectedAction.length === 4 &&
      capture.candidateTurnK === 64 &&
      capture.candidateTurns.length === 4 &&
      capture.candidateTurns.every((turnSet) =>
        turnSet.candidates.length > 0 &&
        turnSet.candidates.length <= capture.candidateTurnK &&
        turnSet.candidates.every((candidate, index) =>
          candidate.rank === index + 1 &&
          candidate.stableSortKey === canonicalJson(candidate.program),
        ),
      ),
    )).toBe(true);
  });

  it('state_capture_lossy: captured EncounterState round-trips byte-exact through the session serializer', () => {
    for (const capture of liveRecord.quality.rolloutInputCaptures) {
      const reconstructed: unknown = JSON.parse(capture.serializedEncounterState);
      const call = liveRecord.calls.find((candidate) =>
        candidate.logicalCallId === capture.logicalCallId);
      expect(canonicalJson(reconstructed)).toBe(capture.serializedEncounterState);
      expect(digest(capture.serializedEncounterState)).toBe(capture.stateHash);
      expect(capture.stateHash).toBe(call?.fullStateHash);
      expect(reconstructed).toMatchObject({
        config: { initiativeMode: 'shared_enemy' },
        revision: expect.any(Number),
        nextEventSequence: expect.any(Number),
        nextEffectSequence: expect.any(Number),
        bounds: expect.any(Object),
        blockedCells: expect.any(Array),
        foggedCells: expect.any(Array),
        dmNotes: expect.any(Array),
        combatants: expect.any(Array),
        tokens: expect.any(Array),
        initiative: expect.any(Array),
        activeCombatant: expect.toSatisfy((value: unknown) =>
          value === null || typeof value === 'string'),
        activeInitiativeIndex: expect.toSatisfy((value: unknown) =>
          value === null || typeof value === 'number'),
        round: expect.any(Number),
        effects: expect.any(Array),
        eventLog: expect.any(Array),
      });
    }
  });

  it('candidate_order_unstable: candidate enumeration is identical across two synthetic table runs', () => {
    expect(repeatedRecord.quality.rolloutInputCaptures.map((capture) => capture.candidateTurns))
      .toEqual(liveRecord.quality.rolloutInputCaptures.map((capture) => capture.candidateTurns));
  });

  it('v1_unreadable: the version-window reader loads legacy v1/v2/v3/v4 and current v5 tables', () => {
    const legacy = decodeExperimentTableRecord(legacyV1Record(liveRecord));
    const previous = decodeExperimentTableRecord(legacyV2Record(liveRecord));
    const prior = decodeExperimentTableRecord(legacyV3Record(liveRecord));
    const v4 = decodeExperimentTableRecord(legacyV4Record(liveRecord));
    const current = decodeExperimentTableRecord(structuredClone(liveRecord));
    expect(legacy.schemaVersion).toBe(1);
    expect(previous.schemaVersion).toBe(2);
    expect(prior.schemaVersion).toBe(3);
    expect(v4.schemaVersion).toBe(4);
    expect(current.schemaVersion).toBe(5);
    expect(legacy.quality.rolloutInputCaptures).toHaveLength(5);
    expect(previous.quality.rolloutInputCaptures).toHaveLength(5);
    expect(prior.quality.rolloutInputCaptures).toHaveLength(5);
    expect(v4.quality.rolloutInputCaptures).toHaveLength(5);
    expect(current.quality.rolloutInputCaptures).toHaveLength(5);
  });

  it('keeps representative inline v5 table captures below the sidecar threshold', () => {
    const legacyBytes = Buffer.byteLength(canonicalJson(legacyV1Record(liveRecord)));
    const currentBytes = Buffer.byteLength(canonicalJson(liveRecord));
    expect(currentBytes).toBeGreaterThan(legacyBytes);
    expect(currentBytes).toBeLessThan(5 * 1024 * 1024);
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
      candidateTurnK: 64,
    });
    expect(decodeVttExperimentArguments([
      '--experiment', 'E01',
      '--out', '/tmp/e01',
      '--candidate-turn-k', '7',
    ]).candidateTurnK).toBe(7);
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
