import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mulberry32, type Rng } from '../../src/combat/random';
import {
  berserker,
  berserkerThrown,
  champion,
  championRanged,
  circleLand,
  devotion,
  devotionThrown,
  domination,
  draconic,
  evoker,
  fiend,
  fiendPatron,
  hunter,
  hunterRanged,
  lifeDomain,
  lore,
  loreCollege,
  monk,
  openHand,
  openHandThrown,
  sorcwiz,
  thief,
  thiefRanged,
  thiefShortbow,
  veteran,
  type CombatResult,
  type Level,
} from './sim';
import { HOMEBREW_BUILDS, vanwardPatientStack, type HomebrewResult } from './homebrew';

type SimBuild = (rng: Rng, level: Level, combats: number) => CombatResult | null;

interface GoldenCase {
  readonly name: string;
  readonly level: number;
  readonly combats?: number;
  readonly result: CombatResult | HomebrewResult | null;
  readonly draws: number;
}

interface GoldenFixture {
  readonly seed: number;
  readonly cases: readonly GoldenCase[];
}

const SEEDS = [1, 1_297_437_780, 42, 4_294_967_295] as const;
const STANDARD_LEVELS = [3, 17] as const;
const HIGH_LEVELS = [11, 17] as const;
const HOMEBREW_LEVELS = [5, 17] as const;

const SIM_BUILDS: ReadonlyArray<readonly [string, SimBuild, readonly Level[]]> = [
  ['devotion', devotion, STANDARD_LEVELS],
  ['devotionThrown', devotionThrown, STANDARD_LEVELS],
  ['domination', domination, STANDARD_LEVELS],
  ['champion', champion, STANDARD_LEVELS],
  ['championRanged', championRanged, STANDARD_LEVELS],
  ['thief', thief, STANDARD_LEVELS],
  ['berserker', berserker, STANDARD_LEVELS],
  ['berserkerThrown', berserkerThrown, STANDARD_LEVELS],
  ['openHand', openHand, STANDARD_LEVELS],
  ['openHandThrown', openHandThrown, STANDARD_LEVELS],
  ['hunter', hunter, STANDARD_LEVELS],
  ['hunterRanged', hunterRanged, STANDARD_LEVELS],
  ['veteran', veteran, STANDARD_LEVELS],
  ['monk', monk, STANDARD_LEVELS],
  ['thiefShortbow', thiefShortbow, STANDARD_LEVELS],
  ['thiefRanged', thiefRanged, STANDARD_LEVELS],
  ['fiend', fiend, STANDARD_LEVELS],
  ['fiendPatron', fiendPatron, STANDARD_LEVELS],
  ['lifeDomain', lifeDomain, STANDARD_LEVELS],
  ['circleLand', circleLand, STANDARD_LEVELS],
  ['evoker', evoker, STANDARD_LEVELS],
  ['draconic', draconic, STANDARD_LEVELS],
  ['sorcwiz', sorcwiz, HIGH_LEVELS],
  ['lore', lore, HIGH_LEVELS],
  ['loreCollege', loreCollege, STANDARD_LEVELS],
];

function countedRng(seed: number): { readonly rng: Rng; readonly draws: () => number } {
  const seeded = mulberry32(seed);
  let count = 0;
  return {
    rng: () => {
      count += 1;
      return seeded();
    },
    draws: () => count,
  };
}

function capture(seed: number): GoldenFixture {
  const cases: GoldenCase[] = [];
  for (const [name, build, levels] of SIM_BUILDS) {
    for (const level of levels) {
      const counted = countedRng(seed);
      cases.push({
        name: `sim.${name}`,
        level,
        combats: 4,
        result: build(counted.rng, level, 4),
        draws: counted.draws(),
      });
    }
  }
  for (const [name, build] of [
    ...HOMEBREW_BUILDS,
    ['Patient Volley + Vanward declared stack', vanwardPatientStack] as const,
  ]) {
    for (const level of HOMEBREW_LEVELS) {
      const counted = countedRng(seed);
      cases.push({
        name: `homebrew.${name}`,
        level,
        result: build(counted.rng, level),
        draws: counted.draws(),
      });
    }
  }
  return { seed, cases };
}

describe('pre-extraction seeded golden parity', () => {
  it.each(SEEDS)('seed %s reproduces every output and exact RNG draw count', (seed) => {
    const expected: unknown = JSON.parse(
      readFileSync(
        fileURLToPath(new URL(`./golden/seed-${seed}.json`, import.meta.url)),
        'utf8',
      ),
    );
    const actual = capture(seed);
    expect(actual.cases).toHaveLength(70);
    expect(actual).toEqual(expected);
  });
});
