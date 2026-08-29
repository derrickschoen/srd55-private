import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  generateArenaBasis,
  parseBasisGenerationArgs,
} from '../../../tools/generate-arena-basis';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

describe('arena basis generator', () => {
  it('parses the explicit difficulty profile and writes deterministic canonical rooms', async () => {
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
    await generateArenaBasis(config);

    for (const seed of [5_117_001, 5_117_002]) {
      expect(readFileSync(join(outPath, `seed-${String(seed)}.json`), 'utf8')).toBe(
        `${canonicalJson(generateRoom(seed, { difficulty: 'hard' }))}\n`,
      );
    }
  });

  it('rejects unknown difficulty profiles before writing', () => {
    expect(() => parseBasisGenerationArgs([
      '--difficulty', 'nightmare',
      '--seed', '5117001',
      '--rooms', '12',
      '--out', tmpdir(),
    ])).toThrow('--difficulty must be standard or hard.');
  });
});
