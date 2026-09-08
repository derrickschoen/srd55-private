import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  generateArenaBasis,
  parseBasisGenerationArgs,
} from '../../../tools/generate-arena-basis';
import {
  D569_SECOND_FAMILY_SEEDS,
  generatedRoomIntegrityViolations,
} from '../../../tools/d569-second-family-manifest';
import { mkdtempSync, readFileSync, readdirSync } from '../../helpers/test-filesystem';

describe('arena basis generator', () => {
  it('kills M576-E2-LEGACY-DEFAULT-CONSUMES-RNG and writes unchanged legacy rooms', async () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-hard-basis-generator-'));
    const config = parseBasisGenerationArgs([
      '--difficulty', 'hard',
      '--seed', '5117001',
      '--rooms', '2',
      '--out', outPath,
    ]);

    expect(config).toEqual({
      difficulty: 'hard',
      seed: 5_117_001,
      rooms: 2,
      outPath,
    });
    expect(Object.hasOwn(config, 'terrainProfile')).toBe(false);
    await generateArenaBasis(config);

    for (const seed of [5_117_001, 5_117_002]) {
      expect(readFileSync(join(outPath, `seed-${String(seed)}.json`), 'utf8')).toBe(
        `${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`,
      );
    }
  });

  it('parses los_cover_v1 only when explicit and writes the versioned profile', async () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-los-cover-basis-generator-'));
    const config = parseBasisGenerationArgs([
      '--difficulty', 'standard',
      '--terrain-profile', 'los_cover_v1',
      '--seed', '5762001',
      '--rooms', '1',
      '--out', outPath,
    ]);
    expect(config).toEqual({
      difficulty: 'standard',
      terrainProfile: 'los_cover_v1',
      seed: 5_762_001,
      rooms: 1,
      outPath,
    });
    await generateArenaBasis(config);
    expect(readFileSync(join(outPath, 'seed-5762001.json'), 'utf8')).toBe(
      `${canonicalJson(generateRoom(5_762_001, {
        difficulty: 'standard',
        terrainProfile: 'los_cover_v1',
      }))}\n`,
    );
  });

  it('rejects unknown terrain profiles', () => {
    expect(() => parseBasisGenerationArgs([
      '--difficulty', 'hard',
      '--terrain-profile', 'latest',
      '--seed', '5762101',
      '--rooms', '1',
      '--out', tmpdir(),
    ])).toThrow('--terrain-profile must be los_cover_v1.');
  });

  it('rejects unknown difficulty profiles before writing', () => {
    expect(() => parseBasisGenerationArgs([
      '--difficulty', 'nightmare',
      '--seed', '5117001',
      '--rooms', '12',
      '--out', tmpdir(),
    ])).toThrow('--difficulty must be standard, hard, or brutal.');
  });

  it('accepts the brutal difficulty profile', () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-brutal-basis-generator-'));
    expect(parseBasisGenerationArgs([
      '--difficulty', 'brutal',
      '--seed', '6203001',
      '--rooms', '3',
      '--out', outPath,
    ])).toEqual({ difficulty: 'brutal', seed: 6_203_001, rooms: 3, outPath });
  });

  it.each([
    { difficulty: 'hard' as const, seeds: D569_SECOND_FAMILY_SEEDS.hard },
    { difficulty: 'brutal' as const, seeds: D569_SECOND_FAMILY_SEEDS.brutal },
  ])('freezes exactly ten canonical deterministic $difficulty second-family rooms', async ({
    difficulty,
    seeds,
  }) => {
    const firstPath = mkdtempSync(join(tmpdir(), `dnd-d569-${difficulty}-first-`));
    const secondPath = mkdtempSync(join(tmpdir(), `dnd-d569-${difficulty}-second-`));
    const config = {
      difficulty,
      seed: seeds[0],
      rooms: seeds.length,
    } as const;
    await generateArenaBasis({ ...config, outPath: firstPath });
    await generateArenaBasis({ ...config, outPath: secondPath });

    const expectedNames = seeds.map((seed) => `seed-${String(seed)}.json`);
    expect(readdirSync(firstPath).sort()).toEqual(expectedNames);
    expect(readdirSync(secondPath).sort()).toEqual(expectedNames);
    expect(new Set(expectedNames).size).toBe(10);

    for (const seed of seeds) {
      const name = `seed-${String(seed)}.json`;
      const firstBytes = readFileSync(join(firstPath, name), 'utf8');
      const secondBytes = readFileSync(join(secondPath, name), 'utf8');
      const room = JSON.parse(firstBytes) as ReturnType<typeof generateRoom>;
      expect(firstBytes, `${difficulty} seed ${String(seed)} is not canonical`).toBe(
        `${canonicalJson(generateRoom(seed, { difficulty }))}\n`,
      );
      expect(secondBytes, `${difficulty} seed ${String(seed)} independent regeneration differs`)
        .toBe(firstBytes);
      expect(room.spec.seed).toBe(seed);
      expect(room.spec.difficultyProfile).toBe(difficulty);
      expect(generatedRoomIntegrityViolations(room, firstBytes)).toEqual([]);
    }
  });
});
