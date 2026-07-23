import { describe, expect, it } from 'vitest';
import { CasterContribution } from '../../../src/rules/caster-contribution';
import {
  casterLevel,
  maxPreparableLevelForClass,
  pactMagic,
  slots,
} from '../../../src/rules/spell-slots';
import { proficiencyBonus } from '../../../src/rules/proficiency';
import type { ProgressionType } from '../../../src/domain/enums';

const CASES = 1_000;
const BASE_SEED = 0xe2e11;

class Randomizer {
  #state: number;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  int(min: number, max: number): number {
    this.#state = (Math.imul(this.#state, 1_664_525) + 1_013_904_223) >>> 0;
    return min + (this.#state % (max - min + 1));
  }

  shuffled<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
      const other = this.int(0, index);
      [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
  }
}

const catalog = {
  Barbarian: 'none',
  Bard: 'full',
  Cleric: 'full',
  Druid: 'full',
  Fighter: 'none',
  Monk: 'none',
  Paladin: 'half_up',
  Ranger: 'half_up',
  Rogue: 'none',
  Sorcerer: 'full',
  Warlock: 'pact',
  Wizard: 'full',
} as const satisfies Record<string, ProgressionType>;

function randomBuild(
  random: Randomizer,
  totalLevel = random.int(1, 20),
): CasterContribution[] {
  const names = random.shuffled(Object.keys(catalog));
  const classCount = random.int(1, Math.min(names.length, totalLevel));
  const chosen = names.slice(0, classCount);
  const levels = Array.from({ length: classCount }, () => 1);
  for (let remaining = totalLevel - classCount; remaining > 0; remaining--) {
    const index = random.int(0, classCount - 1);
    levels[index]! += 1;
  }
  return chosen.map(
    (name, index) =>
      new CasterContribution(name, levels[index]!, catalog[name as keyof typeof catalog]),
  );
}

function context(
  property: string,
  seed: number,
  iteration: number,
  builds: readonly CasterContribution[][],
): string {
  return JSON.stringify({
    property,
    seed,
    iteration,
    builds: builds.map((build) =>
      build.map(({ className, classLevel, progressionType }) => ({
        class: className,
        level: classLevel,
        progression: progressionType,
      })),
    ),
  });
}

describe('generated rules properties', () => {
  it('keeps caster level monotonic as any class level increases', () => {
    const seed = BASE_SEED + 1;
    const random = new Randomizer(seed);

    for (let iteration = 0; iteration < CASES; iteration++) {
      const build = randomBuild(random, random.int(1, 19));
      const before = casterLevel(build);
      build.forEach((entry, index) => {
        const raised = [...build];
        raised[index] = new CasterContribution(
          entry.className,
          entry.classLevel + 1,
          entry.progressionType,
        );
        expect(
          casterLevel(raised),
          context('caster-level monotonicity', seed, iteration, [build, raised]),
        ).toBeGreaterThanOrEqual(before);
      });
    }
  });

  it('never adds Pact Magic to shared slots', () => {
    const seed = BASE_SEED + 2;
    const random = new Randomizer(seed);

    for (let iteration = 0; iteration < CASES; iteration++) {
      const warlockLevel = random.int(1, 19);
      const without = randomBuild(random, random.int(1, 20 - warlockLevel)).filter(
        (entry) => entry.className !== 'Warlock',
      );
      if (without.length === 0) {
        without.push(new CasterContribution('Wizard', 1, 'full'));
      }
      const withWarlock = [
        ...without,
        new CasterContribution('Warlock', warlockLevel, 'pact'),
      ];
      const message = context('Pact pool separation', seed, iteration, [
        without,
        withWarlock,
      ]);

      expect(casterLevel(withWarlock), message).toBe(casterLevel(without));
      expect(slots(withWarlock), message).toEqual(slots(without));
      expect(pactMagic(withWarlock), message).not.toBeNull();
    }
  });

  it('makes proficiency depend only on total character level', () => {
    const seed = BASE_SEED + 3;
    const random = new Randomizer(seed);

    for (let iteration = 0; iteration < CASES; iteration++) {
      const total = random.int(1, 20);
      const first = randomBuild(random, total);
      const second = randomBuild(random, total);
      const firstTotal = first.reduce(
        (sum, entry) => sum + entry.classLevel,
        0,
      );
      const secondTotal = second.reduce(
        (sum, entry) => sum + entry.classLevel,
        0,
      );
      const message = context('proficiency by total level', seed, iteration, [
        first,
        second,
      ]);

      expect(firstTotal, message).toBe(total);
      expect(secondTotal, message).toBe(total);
      expect(proficiencyBonus(firstTotal), message).toBe(
        2 + Math.floor((total - 1) / 4),
      );
      expect(proficiencyBonus(firstTotal), message).toBe(
        proficiencyBonus(secondTotal),
      );
    }
  });

  it('does not change shared slots when a non-caster level is added', () => {
    const seed = BASE_SEED + 4;
    const random = new Randomizer(seed);
    const nonCasters = ['Barbarian', 'Fighter', 'Monk', 'Rogue'] as const;

    for (let iteration = 0; iteration < CASES; iteration++) {
      const build = randomBuild(random, random.int(1, 19));
      const name = nonCasters[random.int(0, nonCasters.length - 1)]!;
      const after = [
        ...build,
        new CasterContribution(name, 1, CasterContribution.NONE),
      ];

      expect(
        slots(after),
        context('non-caster slot invariance', seed, iteration, [build, after]),
      ).toEqual(slots(build));
    }
  });

  it('never prepares above possessed slots for a single class', () => {
    const seed = BASE_SEED + 5;
    const random = new Randomizer(seed);
    const casters = Object.entries(catalog).filter(([, type]) => type !== 'none');

    for (let iteration = 0; iteration < CASES; iteration++) {
      const [name, type] = casters[random.int(0, casters.length - 1)]!;
      const entry = new CasterContribution(name, random.int(1, 20), type);
      const sharedLevels = Object.keys(slots([entry])).map(Number);
      const highest = entry.isPactCaster()
        ? pactMagic([entry])!.level
        : Math.max(0, ...sharedLevels);

      expect(
        maxPreparableLevelForClass(entry),
        context('preparation bounded by slots', seed, iteration, [[entry]]),
      ).toBeLessThanOrEqual(highest);
    }
  });

  it('keeps slot counts non-increasing as spell level rises', () => {
    const seed = BASE_SEED + 6;
    const random = new Randomizer(seed);

    for (let iteration = 0; iteration < CASES; iteration++) {
      const build = randomBuild(random);
      const counts = Object.values(slots(build));
      for (let index = 1; index < counts.length; index++) {
        expect(
          counts[index]!,
          context('slot counts non-increasing', seed, iteration, [build]),
        ).toBeLessThanOrEqual(counts[index - 1]!);
      }
    }
  });
});
