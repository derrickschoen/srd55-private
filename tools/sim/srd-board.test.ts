// D233 expansion: coverage for every SRD 5.2.1 subclass board identity.
// These assertions are relational or independently structural; none is a
// board-output golden regenerated from the simulator itself.
import { describe, expect, it } from 'vitest';
import {
  berserker,
  berserkerThrown,
  champion,
  championRanged,
  circleLand,
  devotion,
  devotionThrown,
  draconic,
  evoker,
  fiend,
  fiendPatron,
  hunter,
  hunterRanged,
  lifeDomain,
  loreCollege,
  mulberry32,
  openHand,
  openHandThrown,
  thief,
  thiefShortbow,
  type CombatResult,
  type Level,
  type Rng,
} from './sim';
import { sampleMeanPerRound } from './test-helpers';
import { constRng } from './test-helpers';

type Build = (rng: Rng, level: Level, combats: number) => CombatResult;

const BOARD: ReadonlyArray<readonly [string, Build]> = [
  ['Berserker', berserker],
  ['Berserker thrown', berserkerThrown],
  ['Champion', champion],
  ['Champion ranged', championRanged],
  ['Open Hand', openHand],
  ['Open Hand thrown', openHandThrown],
  ['Thief', thief],
  ['Thief shortbow', thiefShortbow],
  ['Devotion', devotion],
  ['Devotion thrown', devotionThrown],
  ['Hunter', hunter],
  ['Hunter ranged', hunterRanged],
  ['Life', lifeDomain],
  ['Land', circleLand],
  ['Evoker', evoker],
  ['Draconic', draconic],
  ['Fiend', fiendPatron],
  ['Fiend slot volleys', fiend],
  ['Lore', loreCollege],
];

describe('all twelve SRD identities are deterministic and total at every board level', () => {
  it.each(BOARD)('%s: same seed gives the same nonnegative result', (_name, build) => {
    for (const level of [3, 6, 11, 17] as const) {
      const first = build(mulberry32(233 + level), level, 4);
      const second = build(mulberry32(233 + level), level, 4);
      expect(second).toEqual(first);
      expect(Number.isFinite(first.dealt)).toBe(true);
      expect(Number.isFinite(first.prevented)).toBe(true);
      expect(first.dealt).toBeGreaterThanOrEqual(0);
      expect(first.prevented).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('ranged/thrown posture identities have independent exact accounting', () => {
  // x=.72 yields d20=15, d6=5, d8=6, d10=8: every listed attack hits
  // without critting and every save succeeds. Expectations below are derived
  // directly from the cited dice, attack counts, and resource queues.
  const X = 0.72;

  it('Berserker L3 thrown: Rage consumes round-one BA; later Light attacks omit Strength', () => {
    // Round 1: main 10 + Frenzy 10 = 20 because entering Rage uses the BA.
    // Rounds 2-4: main 10 + Light 7 + Frenzy 10 = 27 each.
    expect(berserkerThrown(constRng(X), 3, 1)).toEqual({ dealt: 20 + 3 * 27, prevented: 0 });
  });

  it('Open Hand L6 thrown: Martial Arts d8 and two attacks, but no ranged Flurry', () => {
    // Each hit: d8(6)+Dex4+item1=11. Stunning Strike consumes Focus but adds
    // no damage; its successful save still grants Advantage to attack two.
    expect(openHandThrown(constRng(X), 6, 1)).toEqual({ dealt: 4 * 2 * 11, prevented: 0 });
  });

  it('Thief L17 shortbow: five Steady-Aim turns each carry one 9d6 Sneak Attack', () => {
    // Thief's Reflexes: 5 turns. Each = d6(5)+Dex5+item3+9d6(45)=58.
    expect(thiefShortbow(constRng(X), 17, 1)).toEqual({ dealt: 5 * 58, prevented: 0 });
  });

  it('Devotion L17 thrown: the six-javelin starting supply caps attacks and smites', () => {
    // Six weapon hits: d6(5)+Str5+item3+d8(6)=19. The first hit in each of
    // the three stocked rounds consumes the [6,5,5]d8 greediest smites.
    // Sacred Weapon changes accuracy only.
    expect(devotionThrown(constRng(X), 17, 1)).toEqual({
      dealt: 6 * 19 + (6 + 5 + 5) * 6,
      prevented: 0,
    });
  });

  it('Hunter L11 longbow: Archery, Mark, Colossus, and second-target spill', () => {
    // Per round primary: 2*(d8 6 + Dex/item 7 + Mark d6 5) + Colossus d8 6
    // =42. Superior Hunter's Prey adds one off-target Mark d6=5 per round.
    expect(hunterRanged(constRng(X), 11, 1)).toEqual({ dealt: 4 * 42, prevented: 4 * 5 });
  });
});

describe('resource accounting follows the declared rest shape', () => {
  const shortRestBuilds: ReadonlyArray<readonly [string, Build]> = [
    ['Berserker', berserker],
    ['Berserker thrown', berserkerThrown],
    ['Champion', champion],
    ['Champion ranged', championRanged],
    ['Open Hand', openHand],
    ['Open Hand thrown', openHandThrown],
    ['Thief', thief],
    ['Thief shortbow', thiefShortbow],
    ['Hunter', hunter],
    ['Hunter ranged', hunterRanged],
  ];

  it.each(shortRestBuilds)('%s refreshes its damage posture between combats', (name, build) => {
    const burst = sampleMeanPerRound(build, mulberry32(8001), 11, 1, 3000);
    const day = sampleMeanPerRound(build, mulberry32(8001), 11, 4, 750);
    expect(Math.abs(day.mean - burst.mean) / burst.mean, name).toBeLessThan(0.06);
  });

  const finiteLongRestBuilds: ReadonlyArray<readonly [string, Build, Level]> = [
    ['Devotion', devotion, 11],
    ['Devotion thrown', devotionThrown, 11],
    ['Life', lifeDomain, 11],
    ['Land', circleLand, 11],
    ['Evoker', evoker, 11],
    ['Draconic', draconic, 11],
    ['Lore', loreCollege, 11],
  ];

  it.each(finiteLongRestBuilds)('%s does not re-nova its Long-Rest pool each combat', (name, build, level) => {
    const burst = sampleMeanPerRound(build, mulberry32(8100 + level), level, 1, 3000);
    const day = sampleMeanPerRound(build, mulberry32(8100 + level), level, 4, 750);
    expect(day.mean, name).toBeLessThan(burst.mean);
  });

  it('Fiend Pact slots reload Hurl Through Hell across Short Rests at level 17', () => {
    const burst = sampleMeanPerRound(fiendPatron, mulberry32(8117), 17, 1, 3000);
    const day = sampleMeanPerRound(fiendPatron, mulberry32(8117), 17, 4, 750);
    expect(Math.abs(day.mean - burst.mean) / burst.mean).toBeLessThan(0.08);
  });
});

describe('statistical sanity for each sourced damage and support identity', () => {
  it.each(BOARD)('%s deals positive damage at all four board levels', (name, build) => {
    for (const level of [3, 6, 11, 17] as const) {
      const stat = sampleMeanPerRound(build, mulberry32(9000 + level), level, 1, 1500);
      expect(stat.mean, `${name} L${level}`).toBeGreaterThan(0);
    }
  });

  it('support/amplification turns on only where each feature exists', () => {
    const supportMean = (build: Build, level: Level): number =>
      sampleMeanPerRound(build, mulberry32(9200 + level), level, 1, 2000, 'prevented').mean;

    expect(supportMean(berserker, 3)).toBeGreaterThan(0); // Rage resistance
    expect(supportMean(hunter, 6)).toBe(0);
    expect(supportMean(hunter, 11)).toBeGreaterThan(0); // Superior Hunter's Prey
    expect(supportMean(hunterRanged, 6)).toBe(0);
    expect(supportMean(hunterRanged, 11)).toBeGreaterThan(0);
    expect(supportMean(lifeDomain, 3)).toBeGreaterThan(0); // healing
    expect(supportMean(circleLand, 3)).toBeGreaterThan(0); // Land's Aid healing
    expect(supportMean(evoker, 3)).toBe(0);
    expect(supportMean(evoker, 6)).toBeGreaterThan(0); // Sculpt Spells
    expect(supportMean(fiendPatron, 11)).toBe(0);
    expect(supportMean(fiendPatron, 17)).toBeGreaterThan(0); // Hurl incapacitation
    expect(supportMean(loreCollege, 3)).toBeGreaterThan(0); // Cutting Words
  });
});
