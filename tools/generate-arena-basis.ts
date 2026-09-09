import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import {
  ROOM_DIFFICULTY_PROFILES,
  ROOM_TERRAIN_PROFILES,
  generateRoom,
  type RoomDifficultyProfile,
  type RoomTerrainProfile,
} from '../src/vtt/room-generator';

export interface BasisGenerationConfig {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly rooms: number;
  readonly outPath: string;
  readonly terrainProfile?: RoomTerrainProfile;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function safeInteger(value: string, option: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new TypeError(`${option} must be a safe integer greater than or equal to ${String(minimum)}.`);
  }
  return parsed;
}

export function parseBasisGenerationArgs(argv: readonly string[]): BasisGenerationConfig {
  const argumentsValue = argv[0] === '--' ? argv.slice(1) : argv;
  const values = new Map<string, string>();
  for (let index = 0; index < argumentsValue.length; index += 1) {
    const option = argumentsValue[index];
    if (!['--difficulty', '--seed', '--rooms', '--out', '--terrain-profile'].includes(option ?? '')) {
      throw new TypeError(`Unknown basis-generator option ${option ?? '<missing>'}.`);
    }
    values.set(option ?? '', requiredValue(argumentsValue, index, option ?? '<missing>'));
    index += 1;
  }
  const difficulty = values.get('--difficulty');
  if (!ROOM_DIFFICULTY_PROFILES.includes(difficulty as RoomDifficultyProfile)) {
    throw new TypeError('--difficulty must be standard, hard, or brutal.');
  }
  const out = values.get('--out');
  if (out === undefined) throw new TypeError('--out is required.');
  const terrainProfile = values.get('--terrain-profile');
  if (terrainProfile !== undefined && !ROOM_TERRAIN_PROFILES.includes(
    terrainProfile as RoomTerrainProfile,
  )) {
    throw new TypeError('--terrain-profile must be los_cover_v1.');
  }
  return {
    difficulty: difficulty as RoomDifficultyProfile,
    seed: safeInteger(values.get('--seed') ?? '', '--seed', 0),
    rooms: safeInteger(values.get('--rooms') ?? '', '--rooms', 1),
    outPath: resolve(out),
    ...(terrainProfile === undefined ? {} : { terrainProfile: terrainProfile as RoomTerrainProfile }),
  };
}

export async function generateArenaBasis(config: BasisGenerationConfig): Promise<void> {
  await mkdir(config.outPath, { recursive: true });
  await Promise.all(Array.from({ length: config.rooms }, async (_unused, index) => {
    const seed = config.seed + index;
    const room = generateRoom(seed, {
      difficulty: config.difficulty,
      ...(config.terrainProfile === undefined ? {} : { terrainProfile: config.terrainProfile }),
    });
    await writeFile(
      resolve(config.outPath, `seed-${String(seed)}.json`),
      `${canonicalJson(room)}\n`,
      'utf8',
    );
  }));
}

async function main(argv: readonly string[]): Promise<void> {
  await generateArenaBasis(parseBasisGenerationArgs(argv));
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/generate-arena-basis.ts') || argument.endsWith('\\generate-arena-basis.ts'));
const invokedPath = process.argv[1];
if (scriptIndex >= 0) await main(process.argv.slice(scriptIndex + 1));
else if (invokedPath !== undefined && (
  invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
  invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')
) && process.argv.includes('--difficulty')) await main(process.argv.slice(2));
