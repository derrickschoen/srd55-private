/**
 * PERF-02 cover6 generator differential: experiment evidence, NOT a gate test.
 *
 * Generates los_cover_v1 rooms (the 9 versioned fixture seeds plus seeds 0..N-1 at each
 * difficulty) and writes one sha256 per room of its whole JSON, or the thrown error's
 * class and message. Run it once on the base commit and once on the candidate, then
 * compare the two files with `--compare`: every room must be byte-identical, including
 * which seeds throw and why.
 *
 *   node node_modules/vite-node/vite-node.mjs tools/experiments/cover-walk/generator-digests.ts <out.json> [seedsPerDifficulty]
 *   node node_modules/vite-node/vite-node.mjs tools/experiments/cover-walk/generator-digests.ts --compare <before.json> <after.json>
 *
 * The compare mode exits 1 on any difference, on differing room lists, or on an empty list.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { generateRoom } from '../../../src/vtt/room-generator';

type Difficulty = 'standard' | 'hard' | 'brutal';

interface RoomDigest {
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly outcome: string;
}

interface DigestFile {
  readonly rooms: readonly RoomDigest[];
  readonly generationMs: number;
}

const VERSIONED: readonly (readonly [Difficulty, number])[] = [
  ['standard', 5_762_001], ['standard', 5_762_002], ['standard', 5_762_003],
  ['hard', 5_762_101], ['hard', 5_762_102], ['hard', 5_762_103],
  ['brutal', 5_762_201], ['brutal', 5_762_202], ['brutal', 5_762_203],
];

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function generate(outPath: string, perDifficulty: number): void {
  const cases: (readonly [Difficulty, number])[] = [
    ...VERSIONED,
    ...(['standard', 'hard', 'brutal'] as const).flatMap((difficulty) =>
      Array.from({ length: perDifficulty }, (_unused, seed) => [difficulty, seed] as const)),
  ];
  const rooms: RoomDigest[] = [];
  const started = performance.now();
  for (const [difficulty, seed] of cases) {
    let outcome: string;
    try {
      outcome = `room ${sha256(JSON.stringify(generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' })))}`;
    } catch (error) {
      const name = error instanceof Error ? error.constructor.name : typeof error;
      const message = error instanceof Error ? error.message : String(error);
      outcome = `throw ${name}: ${message}`;
    }
    rooms.push({ difficulty, seed, outcome });
  }
  const file: DigestFile = { rooms, generationMs: Math.round(performance.now() - started) };
  writeFileSync(outPath, `${JSON.stringify(file, null, 1)}\n`);
  const throws = rooms.filter((room) => room.outcome.startsWith('throw')).length;
  console.log(`GENERATOR-DIGESTS rooms=${String(rooms.length)} throws=${String(throws)} generationMs=${String(file.generationMs)} digest=${sha256(JSON.stringify(rooms))}`);
}

function compare(beforePath: string, afterPath: string): number {
  const before = JSON.parse(readFileSync(beforePath, 'utf8')) as DigestFile;
  const after = JSON.parse(readFileSync(afterPath, 'utf8')) as DigestFile;
  if (before.rooms.length === 0) {
    console.log('GENERATOR-COMPARE FAIL: empty room list');
    return 1;
  }
  const key = (room: RoomDigest) => `${room.difficulty}:${String(room.seed)}`;
  if (JSON.stringify(before.rooms.map(key)) !== JSON.stringify(after.rooms.map(key))) {
    console.log('GENERATOR-COMPARE FAIL: the room lists differ');
    return 1;
  }
  let mismatches = 0;
  before.rooms.forEach((room, index) => {
    const other = after.rooms[index];
    if (other?.outcome !== room.outcome) {
      mismatches += 1;
      console.log(`MISMATCH ${key(room)} before=${room.outcome} after=${String(other?.outcome)}`);
    }
  });
  const throws = before.rooms.filter((room) => room.outcome.startsWith('throw')).length;
  console.log(`GENERATOR-COMPARE rooms=${String(before.rooms.length)} throws=${String(throws)} mismatches=${String(mismatches)} beforeMs=${String(before.generationMs)} afterMs=${String(after.generationMs)}`);
  return mismatches === 0 ? 0 : 1;
}

const args = process.argv.slice(2);
if (args[0] === '--compare') {
  const [beforePath, afterPath] = [args[1], args[2]];
  if (beforePath === undefined || afterPath === undefined) throw new Error('usage: --compare <before.json> <after.json>');
  process.exit(compare(beforePath, afterPath));
} else {
  const outPath = args[0];
  if (outPath === undefined) throw new Error('usage: generator-digests.ts <out.json> [seedsPerDifficulty]');
  generate(outPath, Number(args[1] ?? 64));
}
