import { describe, expect, it } from 'vitest';
import { FrozenMap } from '../../../src/domain/frozen-map';
import {
  POINT_COSTS,
  STANDARD_ARRAY,
} from '../../../src/rules/ability-score-generation-srd';
import {
  bundledSrdExtraAttackGrants,
  bundledSrdMartialArtsDice,
} from '../../../src/rules/class-traits-srd';
import { SKILL_LABELS } from '../../../src/rules/skill-labels';
import { abilityForSkill, skillAbilities } from '../../../src/rules/skills';
import { SRD_CLASS_NAMES } from '../../../src/rules/srd-class-names';
import {
  bundledWeaponMasteryProgressions,
  WEAPON_MASTERY_GRANTS,
} from '../../../src/rules/weapons-srd';

/**
 * THE SHARED RULE MAPS AND RECORDS ARE IMMUTABLE AT RUNTIME (fix round 3, P2).
 *
 * Each export is one value shared by every caller in the process. `ReadonlyMap`
 * and `Readonly<…>` bind only the compiler, so each attempt below writes a
 * PLAUSIBLE WRONG VALUE through the export the way a cast or plain JavaScript
 * could, and must be refused with a TypeError; the value must then read what
 * the SRD prints. Every printed value was read off its extract by hand:
 * `ability-score-generation.txt:31-34` (a 15 costs 9), `skills-table.txt:79`
 * (Athletics is Strength), `attack-class-features.txt:20` (the Monk's Martial
 * Arts die is 1d8 at level 5) and `:85` (the Fighter's Two Extra Attacks at
 * 11, three attacks in all), and `weapon-mastery-progression.txt:15` (a
 * Barbarian masters 3 weapons at level 4).
 */
function outcome(run: () => unknown): string {
  try {
    run();
    return 'no error';
  } catch (error) {
    return error instanceof TypeError ? 'TypeError' : `other: ${String(error)}`;
  }
}

/** Every way to change a shared map from outside; see frozen-map.test.ts. */
function tryToChange<K, V>(map: ReadonlyMap<K, V>, key: K, wrong: V): Readonly<Record<string, string>> {
  const loose = map as unknown as Map<K, V>;
  const prototype = Object.getPrototypeOf(map) as Record<string, unknown>;
  const originalGet = prototype.get;
  const attempts = {
    set: outcome(() => loose.set(key, wrong)),
    delete: outcome(() => loose.delete(key)),
    clear: outcome(() => { loose.clear(); }),
    'Map.prototype.set.call': outcome(() => Map.prototype.set.call(map as never, key, wrong)),
    'define an own get': outcome(() => Object.defineProperty(map, 'get', { value: () => wrong })),
    'replace the prototype get': outcome(() => { prototype.get = () => wrong; }),
  };
  if (Object.hasOwn(map, 'get')) {
    Reflect.deleteProperty(map, 'get');
  }
  if (prototype.get !== originalGet) {
    prototype.get = originalGet;
  }
  return attempts;
}

const REFUSED = {
  set: 'TypeError',
  delete: 'TypeError',
  clear: 'TypeError',
  'Map.prototype.set.call': 'TypeError',
  'define an own get': 'TypeError',
  'replace the prototype get': 'TypeError',
};

describe('the shared SRD rule maps refuse every change', () => {
  it('the point-cost table: a 15 still costs 9', () => {
    expect(tryToChange(POINT_COSTS, 15, 8)).toEqual(REFUSED);
    expect(POINT_COSTS.get(15)).toBe(9);
    expect(POINT_COSTS.size).toBe(8);
  });

  it('the skill-to-ability map: Athletics is still Strength', () => {
    expect(tryToChange(skillAbilities(), 'athletics', 'dexterity')).toEqual(REFUSED);
    expect(skillAbilities().get('athletics')).toBe('strength');
    expect(abilityForSkill('athletics')).toBe('strength');
    expect(skillAbilities().size).toBe(18);
  });

  it('the Martial Arts dice: a level-5 Monk still rolls a d8', () => {
    expect(tryToChange(bundledSrdMartialArtsDice(), 5, 6)).toEqual(REFUSED);
    expect(bundledSrdMartialArtsDice().get(5)).toBe(8);
    expect(bundledSrdMartialArtsDice().size).toBe(20);
  });

  it('every Extra Attack row: a level-11 Fighter still attacks three times', () => {
    const grants = bundledSrdExtraAttackGrants();
    for (const grant of grants) {
      const [key, value] = [...grant.counts][0] ?? [];
      expect(key, grant.class_name).toBeDefined();
      expect(tryToChange(grant.counts, key as number, (value as number) + 1), grant.class_name)
        .toEqual(REFUSED);
      expect(grant.counts.get(key as number), grant.class_name).toBe(value);
    }
    const fighter = grants.find((grant) => grant.class_name === 'Fighter');
    expect(fighter?.counts.get(11)).toBe(3);
    expect(Object.isFrozen(grants)).toBe(true);
    expect(grants.every((grant) => Object.isFrozen(grant))).toBe(true);
  });

  it('every Weapon Mastery column: a level-4 Barbarian still masters three weapons', () => {
    const progressions = bundledWeaponMasteryProgressions();
    for (const progression of progressions) {
      const value = progression.counts.get(4);
      expect(value, progression.class_name).toBeDefined();
      expect(tryToChange(progression.counts, 4, (value as number) - 1), progression.class_name)
        .toEqual(REFUSED);
      expect(progression.counts.get(4), progression.class_name).toBe(value);
    }
    const barbarian = progressions.find((entry) => entry.class_name === 'Barbarian');
    expect(barbarian?.counts.get(4)).toBe(3);
    expect(Object.isFrozen(progressions)).toBe(true);
    expect(progressions.every((entry) => Object.isFrozen(entry))).toBe(true);
  });

  it('every shared map is a FrozenMap, whose prototype is frozen', () => {
    const maps: readonly (readonly [string, ReadonlyMap<unknown, unknown>])[] = [
      ['the point costs', POINT_COSTS],
      ['the skill abilities', skillAbilities()],
      ['the Martial Arts dice', bundledSrdMartialArtsDice()],
      ...bundledSrdExtraAttackGrants().map((grant) =>
        [`${grant.class_name}'s Extra Attack counts`, grant.counts] as const),
      ...bundledWeaponMasteryProgressions().map((entry) =>
        [`${entry.class_name}'s Weapon Mastery counts`, entry.counts] as const),
    ];
    for (const [label, map] of maps) {
      expect(map, label).toBeInstanceOf(FrozenMap);
      expect(Object.isFrozen(map), label).toBe(true);
      expect(Object.isFrozen(Object.getPrototypeOf(map)), label).toBe(true);
    }
    expect(skillAbilities()).toBe(skillAbilities());
    expect(bundledSrdMartialArtsDice()).toBe(bundledSrdMartialArtsDice());
  });
});

describe('the shared SRD records and lists refuse every change', () => {
  it('the skill labels: Athletics is still spelled Athletics, and no label is added', () => {
    const labels = SKILL_LABELS as Record<string, string>;
    expect(outcome(() => { labels.athletics = 'Brawn'; })).toBe('TypeError');
    expect(outcome(() => { labels.artifice = 'Artifice'; })).toBe('TypeError');
    expect(outcome(() => { delete labels.athletics; })).toBe('TypeError');
    expect(SKILL_LABELS.athletics).toBe('Athletics');
    expect(Object.keys(SKILL_LABELS)).toHaveLength(18);
    expect(Object.isFrozen(SKILL_LABELS)).toBe(true);
  });

  it('the twelve SRD classes: no class is added, replaced or reordered', () => {
    const names = SRD_CLASS_NAMES as unknown as string[];
    expect(outcome(() => names.push('Artificer'))).toBe('TypeError');
    expect(outcome(() => { names[0] = 'Artificer'; })).toBe('TypeError');
    expect(outcome(() => names.reverse())).toBe('TypeError');
    expect(SRD_CLASS_NAMES).toHaveLength(12);
    expect(SRD_CLASS_NAMES[0]).toBe('Barbarian');
    expect(SRD_CLASS_NAMES[11]).toBe('Wizard');
    expect(Object.isFrozen(SRD_CLASS_NAMES)).toBe(true);
  });

  it('the Weapon Mastery grants: the Paladin\'s count is still unsourced', () => {
    const grants = WEAPON_MASTERY_GRANTS as Record<string, string>;
    expect(outcome(() => { grants.Paladin = 'counts_known'; })).toBe('TypeError');
    expect(outcome(() => { grants.Monk = 'counts_known'; })).toBe('TypeError');
    expect(WEAPON_MASTERY_GRANTS.Paladin).toBe('counts_unsourced');
    expect(Object.keys(WEAPON_MASTERY_GRANTS)).toEqual(['Barbarian', 'Fighter', 'Paladin', 'Ranger', 'Rogue']);
    expect(Object.isFrozen(WEAPON_MASTERY_GRANTS)).toBe(true);
  });

  it('the Standard Array: no score is added or changed', () => {
    const scores = STANDARD_ARRAY as unknown as number[];
    expect(outcome(() => scores.push(16))).toBe('TypeError');
    expect(outcome(() => { scores[0] = 16; })).toBe('TypeError');
    expect([...STANDARD_ARRAY]).toEqual([15, 14, 13, 12, 10, 8]);
  });
});
