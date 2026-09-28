import { describe, expect, it } from 'vitest';
import { BUNDLED_SRD_ABILITY_SCORE_GENERATION } from '../../../src/rules/generated/ability-score-generation-srd';
import { BUNDLED_SRD_ARMOR_TEMPLATES } from '../../../src/rules/generated/armor-srd';
import { BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS } from '../../../src/rules/generated/class-choice-entitlements-srd';
import { BUNDLED_SRD_CLASS_EQUIPMENT } from '../../../src/rules/generated/class-equipment-srd';
import { BUNDLED_SRD_CLASS_LEVEL_FEATURES } from '../../../src/rules/generated/class-level-features-srd';
import { BUNDLED_SRD_CLASS_RESOURCES } from '../../../src/rules/generated/class-resources-srd';
import { BUNDLED_SRD_CLASS_TRAITS } from '../../../src/rules/generated/class-traits-srd';
import { BUNDLED_SRD_DRACONIC_RESILIENCE } from '../../../src/rules/generated/draconic-resilience-srd';
import { BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES } from '../../../src/rules/generated/extra-attack-srd';
import { BUNDLED_SRD_FEAT_DEFINITIONS } from '../../../src/rules/generated/feats-srd';
import { BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS } from '../../../src/rules/generated/multiclass-entry-srd';
import { BUNDLED_SRD_ORIGINS } from '../../../src/rules/generated/origins-srd';
import { BUNDLED_SRD_SKILL_ABILITIES } from '../../../src/rules/generated/skills';
import { BUNDLED_SRD_SPELL_CATALOG } from '../../../src/rules/generated/spells-srd';
import { BUNDLED_SRD_SUBCLASS_MANIFEST } from '../../../src/rules/generated/srd-subclasses';
import { BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES } from '../../../src/rules/generated/unarmored-defense-srd';
import { BUNDLED_SRD_WEAPONS } from '../../../src/rules/generated/weapons-srd';
import { BUNDLED_COVERAGE_SOURCE } from '../../../src/simulation/generated/coverage-source';

/**
 * EVERY GENERATED ARTIFACT IS FROZEN WHERE IT IS DEFINED (fix round 3, P2).
 *
 * This file imports the eighteen artifacts and nothing that reads them, so no
 * runtime module's own `deepFreeze` can freeze an artifact on its behalf: run
 * alone, it sees each artifact exactly as its own module left it. Every object
 * and array reachable from each export must be frozen, and a plausible wrong
 * write must be refused.
 */
const ARTIFACTS: readonly (readonly [string, unknown])[] = [
  ['ability-score-generation-srd', BUNDLED_SRD_ABILITY_SCORE_GENERATION],
  ['armor-srd', BUNDLED_SRD_ARMOR_TEMPLATES],
  ['class-choice-entitlements-srd', BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS],
  ['class-equipment-srd', BUNDLED_SRD_CLASS_EQUIPMENT],
  ['class-level-features-srd', BUNDLED_SRD_CLASS_LEVEL_FEATURES],
  ['class-resources-srd', BUNDLED_SRD_CLASS_RESOURCES],
  ['class-traits-srd', BUNDLED_SRD_CLASS_TRAITS],
  ['draconic-resilience-srd', BUNDLED_SRD_DRACONIC_RESILIENCE],
  ['extra-attack-srd', BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES],
  ['feats-srd', BUNDLED_SRD_FEAT_DEFINITIONS],
  ['multiclass-entry-srd', BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS],
  ['origins-srd', BUNDLED_SRD_ORIGINS],
  ['skills', BUNDLED_SRD_SKILL_ABILITIES],
  ['spells-srd', BUNDLED_SRD_SPELL_CATALOG],
  ['srd-subclasses', BUNDLED_SRD_SUBCLASS_MANIFEST],
  ['unarmored-defense-srd', BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES],
  ['weapons-srd', BUNDLED_SRD_WEAPONS],
  ['coverage-source', BUNDLED_COVERAGE_SOURCE],
];

/** The path of every object or array under `value` that is not frozen. */
function unfrozenPaths(value: unknown, path: string, out: string[] = []): string[] {
  if (value === null || typeof value !== 'object') {
    return out;
  }
  if (!Object.isFrozen(value)) {
    out.push(path);
  }
  for (const [key, child] of Object.entries(value)) {
    unfrozenPaths(child, `${path}.${key}`, out);
  }
  return out;
}

function outcome(run: () => unknown): string {
  try {
    run();
    return 'no error';
  } catch (error) {
    return error instanceof TypeError ? 'TypeError' : `other: ${String(error)}`;
  }
}

describe('the generated SRD artifacts', () => {
  it('are eighteen, and every object and array in each is frozen', () => {
    expect(ARTIFACTS).toHaveLength(18);
    const unfrozen = ARTIFACTS.flatMap(([name, value]) => unfrozenPaths(value, name));
    expect(unfrozen.slice(0, 10)).toEqual([]);
    expect(unfrozen).toHaveLength(0);
  });

  it('refuse a plausible wrong write at the top and deep inside', () => {
    const skills = BUNDLED_SRD_SKILL_ABILITIES as Record<string, string>;
    expect(outcome(() => { skills.athletics = 'dexterity'; })).toBe('TypeError');
    expect(BUNDLED_SRD_SKILL_ABILITIES.athletics).toBe('strength');

    const costs = BUNDLED_SRD_ABILITY_SCORE_GENERATION.point_costs as unknown as number[][];
    const fifteen = costs.find((pair) => pair[0] === 15);
    expect(outcome(() => { (fifteen as number[])[1] = 8; })).toBe('TypeError');
    expect(fifteen?.[1]).toBe(9);

    const mastery = BUNDLED_SRD_WEAPONS.mastery_progressions[0]?.counts as unknown as number[];
    expect(outcome(() => { mastery[3] = 2; })).toBe('TypeError');
    expect(outcome(() => mastery.push(9))).toBe('TypeError');
    expect(mastery[3]).toBe(3);
  });
});
