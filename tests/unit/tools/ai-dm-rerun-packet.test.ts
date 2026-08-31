import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  R1_10_PROTOCOL,
  R1_10_SEEDS,
  assertBlindedPacket,
  buildRerunPacket,
  parseRerunPacketArgs,
  validateRerunRows,
} from '../../../tools/ai-dm-rerun-packet';
import { declareTestInputs } from '../../helpers/test-inputs';

const fixtureRowSchema = z.record(z.string(), z.unknown());
type JsonRecord = z.infer<typeof fixtureRowSchema>;

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl',
    'tests/fixtures/ai-dm-rerun/leaked-training.SIMULATED.jsonl',
  ],
});

const tinyProtocol = { seeds: [5_117_001], reps: 1 } as const;

function rowsFromFixture(path: Parameters<typeof inputs.fixtures.readText>[0]): readonly JsonRecord[] {
  return inputs.fixtures.readText(path).trim().split('\n').map((line) => {
    const decoded: unknown = JSON.parse(line);
    return fixtureRowSchema.parse(decoded);
  });
}

function registeredRows(): JsonRecord[] {
  return R1_10_SEEDS.flatMap((seed, room) => [1, 2, 3].flatMap((round) =>
    ['baseline', 'intel'].map((arm) => ({
      seed,
      room: room + 1,
      round,
      arm,
      model: `${arm}-model`,
      cli: 'codex',
      startingRoomDigest: `frozen-room-${String(seed)}`,
      combatModel: 'initiative_segments_v1',
      initiativeOrder: ['monster', 'fighter'],
      outcome: 'authorized',
      plannedBy: { model: `${arm}-model`, effort: 'medium' },
      roundNarrative: null,
      authorizedPlan: null,
      // Era asymmetry is the real R1-10 shape: only the post-intel arm
      // produces engineIntel. Validation must accept both.
      ...(arm === 'intel' ? {
        engineIntel: {
          policy: 'dm-intel-capture-v1',
          policyVersions: { initiative: 'initiative-intel-v1' },
          actors: [],
        },
      } : {}),
    } satisfies JsonRecord)
  )));
}

describe('AI-DM R1-10 rerun packet', () => {
  it('builds the exact blinded packet and separate answer key from hand-built arena rows', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl');
    const result = buildRerunPacket(rows, 1, tinyProtocol);

    const expectedPacket = {
      version: 'ai-dm-rerun-packet-v1',
      judgingOrder: 'interleaved_blinded',
      rubric: {
        targetPriority: { maximum: 3 }, actionEconomy: { maximum: 3 },
        positioning: { maximum: 2 }, coherence: { maximum: 2 }, total: { maximum: 10 },
      },
      entries: [
        {
          blindId: 'blind-001', caseId: 'case-01-1', outcome: 'authorized',
          attribution: 'model_authorized', roundNarrative: 'The ogre attacks the fighter.',
          executedPlan: [{
            actorId: 'monster:ogre', selectedBranch: 'primary',
            resolutionSummary: {
              optionId: 'club-fighter', movementFeet: 0,
              actionSlots: [{ slot: 'main', kind: 'attack', targetIds: ['pc:fighter'] }],
            },
          }],
          rubric: { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null },
        },
        {
          blindId: 'blind-002', caseId: 'case-01-1', outcome: 'auto_resolved',
          attribution: 'engine_default', roundNarrative: 'The ogre takes Dodge.',
          executedPlan: null,
          rubric: { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null },
        },
      ],
    } as const;
    const expectedAnswerKey = {
      version: 'ai-dm-rerun-packet-v1',
      entries: [
        { blindId: 'blind-001', arm: 'baseline' },
        { blindId: 'blind-002', arm: 'intel' },
      ],
    } as const;

    expect(result.packet).toEqual(expectedPacket);
    expect(result.answerKey).toEqual(expectedAnswerKey);
    expect(JSON.stringify(result.packet)).not.toContain('baseline-model');
    expect(JSON.stringify(result.packet)).not.toContain('intel-model');
    expect(JSON.stringify(result.packet)).not.toContain('engineIntel');

    const mutatedRows = rows.map((row, index) => index === 0
      ? { ...row, roundNarrative: 'The ogre retreats.' }
      : row);
    expect(buildRerunPacket(mutatedRows, 1, tinyProtocol).packet).not.toEqual(expectedPacket);
  });

  it('validates the preregistered seed set, three paired reps, frozen artifacts, holdout status, and initiative evidence', () => {
    const rows = registeredRows();
    expect(rows).toHaveLength(60);
    expect(validateRerunRows(rows, R1_10_PROTOCOL)).toHaveLength(60);

    const wrongSeed = [...rows];
    wrongSeed[0] = { ...wrongSeed[0]!, seed: 5_117_011 };
    expect(() => validateRerunRows(wrongSeed, R1_10_PROTOCOL)).toThrow('not an R1-10 holdout seed');

    const missingRep = rows.filter((row) => !(row['seed'] === 5_117_003 && row['round'] === 2 && row['arm'] === 'intel'));
    expect(() => validateRerunRows(missingRep, R1_10_PROTOCOL)).toThrow('requires one row from each arm');

    expect(() => buildRerunPacket(
      rowsFromFixture('tests/fixtures/ai-dm-rerun/leaked-training.SIMULATED.jsonl'), 1, tinyProtocol,
    )).toThrow('permanent holdout');
  });

  it('rejects an identity field if one reaches the blinded packet', () => {
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', model: 'leaked-model' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', engineIntel: { actors: [] } }] }))
      .toThrow('leaks a model-identifying field');
  });

  it('requires explicit, separate CLI paths and a deterministic shuffle seed', () => {
    const directory = join(tmpdir(), 'dnd-rerun-packet-cli');
    expect(parseRerunPacketArgs([
      '--input', join(directory, 'arena-a.jsonl'), '--input', join(directory, 'arena-b.jsonl'),
      '--packet', join(directory, 'packet.json'), '--answer-key', join(directory, 'answer-key.json'),
      '--shuffle-seed', '41',
    ])).toMatchObject({ shuffleSeed: 41, inputPaths: [join(directory, 'arena-a.jsonl'), join(directory, 'arena-b.jsonl')] });
    expect(() => parseRerunPacketArgs(['--input', 'arena.jsonl', '--packet', 'same.json', '--answer-key', 'same.json', '--shuffle-seed', '1']))
      .toThrow('must be different files');
  });
});
