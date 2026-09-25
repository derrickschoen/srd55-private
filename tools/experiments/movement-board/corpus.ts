/**
 * PERF-02 board3 state corpus for the movement-board experiments (differential, bench).
 * Experiment code, never part of the gate.
 *
 * Bases: every encounter file in the arena fixture directories (the challenge rooms through
 * the challenge decoder, their provenance sidecars accounted for and skipped by name), the
 * room8 and arena-scenario encounters, the ten generated brutal-b blind rooms, and generated
 * rooms over seeds x difficulty x terrain profile. Anything else in those directories throws:
 * nothing is skipped silently.
 *
 * Each base is followed by its synthetic variants (tests/helpers/movement-board-variants.ts).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { decodeChallengeRoomProvenanceV1 } from '../../../src/vtt/challenge-room-fixture';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import { movementBoardVariants, type NamedState } from '../../../tests/helpers/movement-board-variants';

export type { NamedState };

const ARENA_DIRS = [
  'arena-basis', 'arena-basis-brutal', 'arena-basis-brutal-2', 'arena-basis-brutal-b', 'arena-basis-challenge',
  'arena-basis-hard', 'arena-basis-hard-2', 'arena-basis-los-cover-v1',
] as const;
const CHALLENGE_DIR = 'arena-basis-challenge';
const EXTRA_ENCOUNTERS = [
  'room8-repro/seed-5117008.SIMULATED.json',
  'arena-scenarios/hypnotic-pattern-cc.json',
] as const;
/** Files in those directories that are not encounters, named so nothing else can be skipped. */
const NOT_ENCOUNTERS = ['room8-repro/failing-round.SIMULATED.json'] as const;

export interface CorpusAccount {
  readonly decoded: string[];
  readonly skippedSidecars: string[];
  readonly skippedNotEncounters: string[];
}

export async function baseStates(account: CorpusAccount): Promise<NamedState[]> {
  const out: NamedState[] = [];
  for (const dir of ARENA_DIRS) {
    for (const file of readdirSync(`tests/fixtures/${dir}`).sort()) {
      const label = `${dir}/${file}`;
      const path = `tests/fixtures/${label}`;
      if (dir === CHALLENGE_DIR && /^seed-\d+\.provenance\.json$/.test(file)) {
        decodeChallengeRoomProvenanceV1(JSON.parse(readFileSync(path, 'utf8')) as unknown);
        account.skippedSidecars.push(label);
        continue;
      }
      if (!/^seed-\d+\.json$/.test(file)) throw new Error(`Unexpected fixture file ${label}.`);
      const state = dir === CHALLENGE_DIR
        ? decodeArenaBasisEnvelopeV1(JSON.parse(readFileSync(path, 'utf8')) as unknown, { mode: 'challenge' }).encounter.state
        : await loadArenaFixture(path);
      account.decoded.push(label);
      out.push({ name: label, state });
    }
  }
  for (const dir of new Set([...EXTRA_ENCOUNTERS, ...NOT_ENCOUNTERS].map((label) => label.split('/')[0] as string))) {
    for (const file of readdirSync(`tests/fixtures/${dir}`).sort()) {
      const label = `${dir}/${file}`;
      if ((NOT_ENCOUNTERS as readonly string[]).includes(label)) {
        account.skippedNotEncounters.push(label);
        continue;
      }
      if (!(EXTRA_ENCOUNTERS as readonly string[]).includes(label)) throw new Error(`Unexpected fixture file ${label}.`);
      out.push({ name: label, state: await loadArenaFixture(`tests/fixtures/${label}`) });
      account.decoded.push(label);
    }
  }
  for (let seed = 6_206_001; seed <= 6_206_010; seed += 1) {
    out.push({ name: `blind-brutal-b/${String(seed)}`, state: generateRoom(seed, { difficulty: 'brutal' }).encounter.state });
  }
  for (const seed of [11, 42, 777, 9001]) {
    for (const difficulty of ['standard', 'hard', 'brutal'] as const) {
      for (const terrainProfile of ['legacy', 'los_cover_v1'] as const) {
        out.push({
          name: `room/${String(seed)}-${difficulty}-${terrainProfile}`,
          state: generateRoom(seed, terrainProfile === 'legacy' ? { difficulty } : { difficulty, terrainProfile }).encounter.state,
        });
      }
    }
  }
  return out;
}

export async function corpus(account: CorpusAccount): Promise<NamedState[]> {
  const bases = await baseStates(account);
  return bases.flatMap((base, index) => [base, ...movementBoardVariants(base, 0x5eed + index)]);
}
