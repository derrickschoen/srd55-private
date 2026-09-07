import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRUTAL_10_SEEDS,
  R1_10_SEEDS,
  createRerunPacket,
  parseRerunPacketArgs,
} from '../../../tools/ai-dm-rerun-packet';
import { mkdtemp, readFile, writeFile } from '../../helpers/test-filesystem-promises';

type ProtocolSeed = typeof BRUTAL_10_SEEDS[number] | typeof R1_10_SEEDS[number];

function pairedRows(seeds: readonly ProtocolSeed[], reps: 1 | 3): readonly Record<string, unknown>[] {
  return seeds.flatMap((seed, room) => Array.from({ length: reps }, (_, index) => index + 1)
    .flatMap((round) => ['control', 'candidate'].map((arm) => ({
      seed,
      room: room + 1,
      round,
      arm,
      instructionSource: 'none',
      skillName: null,
      skillHash: null,
      model: `${arm}-model`,
      cli: 'codex',
      startingRoomDigest: `frozen-room-${String(seed)}`,
      combatModel: 'initiative_segments_v1',
      initiativeOrder: ['monster', 'fighter'],
      outcome: 'authorized',
      plannedBy: { model: `${arm}-model`, effort: 'medium' },
      decisionTransport: 'mcp_minimal',
      firstDecisionAccepted: true,
      decisionAttempts: 1,
      decisionRejectionCodes: [],
      normalizationCodes: [],
      rationale: null,
      roundNarrative: null,
      authorizedPlan: null,
    }))));
}

function jsonl(rows: readonly Record<string, unknown>[]): string {
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

function packetArgs(
  directory: string,
  inputPath: string,
  outputPrefix: string,
  extra: readonly string[] = [],
): readonly string[] {
  return [
    '--input', inputPath,
    '--packet', join(directory, `${outputPrefix}-packet.json`),
    '--answer-key', join(directory, `${outputPrefix}-answer-key.json`),
    '--shuffle-seed', '6203',
    ...extra,
  ];
}

describe('AI-DM rerun packet protocol selection', () => {
  it('accepts brutal room 1 seed 6203001, rejects 5117001, and keeps r1-10 as the default', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dnd-rerun-brutal-protocol-'));
    const inputPath = join(directory, 'brutal.jsonl');
    const rows = pairedRows(BRUTAL_10_SEEDS, 1);
    expect(rows[0]).toMatchObject({ seed: 6_203_001, room: 1 });
    await writeFile(inputPath, jsonl(rows), 'utf8');

    const brutalConfig = parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'brutal', ['--protocol', 'brutal-10', '--reps', '1'],
    ));
    const brutal = await createRerunPacket(brutalConfig);
    expect(brutal.packet).toMatchObject({ protocol: 'brutal-10' });
    expect(brutal.answerKey).toMatchObject({ protocol: 'brutal-10' });
    expect(brutal.packet.entries).toHaveLength(20);

    const wrongSeedRows = rows.map((row, index) => index === 0
      ? { ...row, seed: 5_117_001 }
      : row);
    const wrongSeedPath = join(directory, 'brutal-with-r1-seed.jsonl');
    await writeFile(wrongSeedPath, jsonl(wrongSeedRows), 'utf8');
    await expect(createRerunPacket(parseRerunPacketArgs(packetArgs(
      directory, wrongSeedPath, 'wrong-brutal', ['--protocol', 'brutal-10', '--reps', '1'],
    )))).rejects.toThrow('seed=5117001 is not a brutal-10 holdout seed');

    await expect(createRerunPacket(parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'wrong-default',
    )))).rejects.toThrow('seed=6203001 is not an R1-10 holdout seed');
  });

  it('makes the implicit default packet byte-identical to explicit r1-10', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dnd-rerun-default-protocol-'));
    const inputPath = join(directory, 'r1.jsonl');
    await writeFile(inputPath, jsonl(pairedRows(R1_10_SEEDS, 3)), 'utf8');

    const defaultConfig = parseRerunPacketArgs(packetArgs(directory, inputPath, 'default'));
    const explicitConfig = parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'explicit', ['--protocol', 'r1-10'],
    ));
    await createRerunPacket(defaultConfig);
    await createRerunPacket(explicitConfig);

    expect(await readFile(defaultConfig.packetPath, 'utf8'))
      .toBe(await readFile(explicitConfig.packetPath, 'utf8'));
    expect(await readFile(defaultConfig.answerKeyPath, 'utf8'))
      .toBe(await readFile(explicitConfig.answerKeyPath, 'utf8'));
    expect(JSON.parse(await readFile(defaultConfig.packetPath, 'utf8')))
      .toMatchObject({ protocol: 'r1-10' });
    expect(JSON.parse(await readFile(defaultConfig.answerKeyPath, 'utf8')))
      .toMatchObject({ protocol: 'r1-10' });
  });

  it('allows only one or three reps and only on brutal-10', () => {
    const directory = join(tmpdir(), 'dnd-rerun-protocol-args');
    const inputPath = join(directory, 'rows.jsonl');
    expect(parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'brutal-three', ['--reps', '3', '--protocol', 'brutal-10'],
    ))).toMatchObject({ protocol: 'brutal-10', reps: 3 });
    expect(() => parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'r1-reps', ['--protocol', 'r1-10', '--reps', '3'],
    ))).toThrow('--reps is available only with --protocol brutal-10');
    expect(() => parseRerunPacketArgs(packetArgs(
      directory, inputPath, 'brutal-two', ['--protocol', 'brutal-10', '--reps', '2'],
    ))).toThrow('--reps must be 1 or 3');
  });
});
