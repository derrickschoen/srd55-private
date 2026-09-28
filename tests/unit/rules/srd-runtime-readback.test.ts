import { describe, expect, it } from 'vitest';
import {
  POINT_BUY_BUDGET,
  POINT_COSTS,
  STANDARD_ARRAY,
} from '../../../src/rules/ability-score-generation-srd';
import {
  parsePointBudget,
  parsePointCosts,
  parseStandardArray,
} from '../../../src/rules/ability-score-generation-srd-reader';
import { bundledArmorTemplates } from '../../../src/rules/armor-srd';
import { parseSrdArmorTemplates } from '../../../src/rules/armor-srd-reader';
import {
  bundledSrdClassSpellReplacementPolicies,
  bundledSrdExpertiseEntitlements,
} from '../../../src/rules/class-choice-entitlements-srd';
import {
  parseSrdClassSpellReplacementPolicies,
  parseSrdExpertiseEntitlements,
} from '../../../src/rules/class-choice-entitlements-srd-reader';
import { bundledSrdClassEquipment } from '../../../src/rules/class-equipment-srd';
import { parseSrdClassEquipment } from '../../../src/rules/class-equipment-srd-reader';
import { parseSrdClassLevelFeatures } from '../../../src/rules/class-level-features-srd-reader';
import {
  bundledSrdClassTraits,
  bundledSrdExtraAttackGrants,
  bundledSrdMartialArtsDice,
} from '../../../src/rules/class-traits-srd';
import {
  parseSrdClassTraits,
  parseSrdExtraAttackGrants,
  parseSrdMartialArtsDice,
} from '../../../src/rules/class-traits-srd-reader';
import { bundledSrdDraconicResilience } from '../../../src/rules/draconic-resilience-srd';
import { parseSrdDraconicResilience } from '../../../src/rules/draconic-resilience-srd-reader';
import { bundledSrdNamedExtraAttackFeatures } from '../../../src/rules/extra-attack-srd';
import { parseSrdNamedExtraAttackFeatures } from '../../../src/rules/extra-attack-srd-reader';
import { bundledFeatDefinitions } from '../../../src/rules/feats-srd';
import { parseSrdFeatDefinitions } from '../../../src/rules/feats-srd-reader';
import { bundledSrdMulticlassEntryGrants } from '../../../src/rules/multiclass-entry-srd';
import { parseSrdMulticlassEntryGrants } from '../../../src/rules/multiclass-entry-srd-reader';
import {
  bundledBackgroundTemplates,
  bundledSpeciesTemplates,
} from '../../../src/rules/origins-srd';
import {
  parseSrdBackgroundTemplates,
  parseSrdSpeciesTemplates,
} from '../../../src/rules/origins-srd-reader';
import { skillAbilities } from '../../../src/rules/skills';
import { parseSkillAbilities } from '../../../src/rules/skills-reader';
import { bundledSrdSubclassManifest } from '../../../src/rules/srd-subclasses';
import { parseSrdSubclasses } from '../../../src/rules/srd-subclasses-reader';
import { bundledSrdUnarmoredDefenseFeatures } from '../../../src/rules/unarmored-defense-srd';
import { parseSrdUnarmoredDefenseFeatures } from '../../../src/rules/unarmored-defense-srd-reader';
import {
  bundledWeaponMasteryProgressions,
  bundledWeaponTemplates,
} from '../../../src/rules/weapons-srd';
import {
  parseSrdWeaponTemplates,
  parseWeaponMasteryProgressions,
} from '../../../src/rules/weapons-srd-reader';
import { SRD_CORPUS_TEXTS } from '../../helpers/srd-corpora';

/**
 * THE RUNTIME READS BACK EXACTLY WHAT THE READERS PARSE, for the fourteen
 * modules that parsed their extract at runtime until fix round 1.
 *
 * The expectation on each line is the reader run over the committed extract
 * now, never the runtime's own output: the artifact is the only thing in
 * between, and several runtime modules rebuild a `Map` from it (skills, the
 * point costs, the Extra Attack rows, the Martial Arts dice, the mastery
 * counts), in the insertion order the parse produced. `toStrictEqual` and a
 * serialised comparison pin values, key order and entry order.
 */
function text(path: string): string {
  const found = SRD_CORPUS_TEXTS[path];
  if (found === undefined) {
    throw new Error(`${path} is not an SRD corpus.`);
  }
  return found;
}

const corpus = {
  abilityScores: text('docs/srd/source/ability-score-generation.txt'),
  armor: text('docs/srd/source/armor-table.txt'),
  attackFeatures: text('docs/srd/source/attack-class-features.txt'),
  backgrounds: text('docs/srd/source/backgrounds.txt'),
  classLevelTables: text('docs/srd/source/class-level-tables.txt'),
  coreTraits: text('docs/srd/source/class-core-traits.txt'),
  draconic: text('docs/srd/source/draconic-resilience.txt'),
  entryGrants: text('docs/srd/source/multiclass-entry-grants.txt'),
  equipment: text('docs/srd/source/class-starting-equipment.txt'),
  expertise: text('docs/srd/source/class-expertise.txt'),
  extraAttack: text('docs/srd/source/extra-attack-other-sources.txt'),
  feats: text('docs/srd/source/feats.txt'),
  mastery: text('docs/srd/source/weapon-mastery-progression.txt'),
  replacement: text('docs/srd/source/class-spell-replacement.txt'),
  skills: text('docs/srd/source/skills-table.txt'),
  species: text('docs/srd/source/species-descriptions.txt'),
  subclasses: text('docs/srd/source/subclasses.txt'),
  unarmored: text('docs/srd/source/unarmored-defense.txt'),
  weapons: text('docs/srd/source/weapons-table.txt'),
};

function same(runtime: unknown, parsed: unknown): void {
  expect(runtime).toStrictEqual(parsed);
  expect(JSON.stringify(runtime)).toBe(JSON.stringify(parsed));
}

/** A map's entries, in order, so insertion order is compared too. */
function entries<K, V>(map: ReadonlyMap<K, V>): [K, V][] {
  return [...map.entries()];
}

describe('the runtime reads back exactly what the readers parse', () => {
  it('ability-score generation: the array, the budget and the cost table in printed order', () => {
    same([...STANDARD_ARRAY], [...parseStandardArray(corpus.abilityScores)]);
    expect(POINT_BUY_BUDGET).toBe(parsePointBudget(corpus.abilityScores));
    same(entries(POINT_COSTS), entries(parsePointCosts(corpus.abilityScores)));
  });

  it('armour', () => {
    same(bundledArmorTemplates(), parseSrdArmorTemplates(corpus.armor));
  });

  it('class-choice entitlements, checked against the class tables', () => {
    const tables = parseSrdClassLevelFeatures(corpus.classLevelTables);
    same(bundledSrdExpertiseEntitlements(), parseSrdExpertiseEntitlements(corpus.expertise, tables));
    same(
      bundledSrdClassSpellReplacementPolicies(),
      parseSrdClassSpellReplacementPolicies(corpus.replacement, tables),
    );
  });

  it('class starting equipment, linked against the weapon and armour parses', () => {
    same(
      bundledSrdClassEquipment(),
      parseSrdClassEquipment(
        corpus.equipment,
        parseSrdWeaponTemplates(corpus.weapons),
        parseSrdArmorTemplates(corpus.armor),
      ),
    );
  });

  it('class traits, the Extra Attack rows and the Martial Arts dice', () => {
    same(bundledSrdClassTraits(), parseSrdClassTraits(corpus.coreTraits));
    const parsedGrants = parseSrdExtraAttackGrants(corpus.attackFeatures);
    expect(bundledSrdExtraAttackGrants().map((grant) => grant.class_name)).toEqual(
      parsedGrants.map((grant) => grant.class_name),
    );
    bundledSrdExtraAttackGrants().forEach((grant, index) => {
      same(entries(grant.counts), entries(parsedGrants[index]?.counts ?? new Map()));
    });
    same(entries(bundledSrdMartialArtsDice()), entries(parseSrdMartialArtsDice(corpus.attackFeatures)));
  });

  it('Draconic Resilience, Unarmored Defense and the Extra Attack invocations', () => {
    same(bundledSrdDraconicResilience(), parseSrdDraconicResilience(corpus.draconic));
    same(bundledSrdUnarmoredDefenseFeatures(), parseSrdUnarmoredDefenseFeatures(corpus.unarmored));
    same(bundledSrdNamedExtraAttackFeatures(), parseSrdNamedExtraAttackFeatures(corpus.extraAttack));
  });

  it('feats, with every key minted as the parse printed it', () => {
    same(bundledFeatDefinitions(), parseSrdFeatDefinitions(corpus.feats));
  });

  it('multiclass entry grants, checked against the Core Traits parse', () => {
    same(
      bundledSrdMulticlassEntryGrants(),
      parseSrdMulticlassEntryGrants(corpus.entryGrants, parseSrdClassTraits(corpus.coreTraits)),
    );
  });

  it('species and backgrounds', () => {
    same(bundledSpeciesTemplates(), parseSrdSpeciesTemplates(corpus.species));
    same(bundledBackgroundTemplates(), parseSrdBackgroundTemplates(corpus.backgrounds));
  });

  it('the skill-to-ability map, in the Skills table order', () => {
    same(entries(skillAbilities()), entries(parseSkillAbilities(corpus.skills)));
  });

  it('the subclass manifest', () => {
    same(bundledSrdSubclassManifest(), parseSrdSubclasses(corpus.subclasses));
  });

  it('weapons and the Weapon Mastery columns', () => {
    same(bundledWeaponTemplates(), parseSrdWeaponTemplates(corpus.weapons));
    const parsed = parseWeaponMasteryProgressions(corpus.mastery);
    expect(bundledWeaponMasteryProgressions().map((entry) => entry.class_name)).toEqual(
      parsed.map((entry) => entry.class_name),
    );
    bundledWeaponMasteryProgressions().forEach((entry, index) => {
      same(entries(entry.counts), entries(parsed[index]?.counts ?? new Map()));
    });
  });

  it('hands out one shared, deeply frozen copy, so no caller can change the catalog for the next one', () => {
    const shared: readonly (readonly [string, unknown])[] = [
      ['the Standard Array', STANDARD_ARRAY],
      ['an armour row', bundledArmorTemplates()[0]],
      ['an Expertise pool', bundledSrdExpertiseEntitlements()[0]?.pool],
      ['a starting-equipment item', bundledSrdClassEquipment()[0]?.items[0]],
      ['a class\'s saving throws', bundledSrdClassTraits()[0]?.saving_throws],
      ['a Draconic Resilience effect', bundledSrdDraconicResilience().effects[1]],
      ['a feat\'s grant rules', bundledFeatDefinitions()[0]?.grant_rules],
      ['a multiclass skill choice', bundledSrdMulticlassEntryGrants()[0]?.skill_choice],
      ['a species trait', bundledSpeciesTemplates()[0]?.traits[0]],
      ['a background equipment item', bundledBackgroundTemplates()[0]?.equipment_items[0]],
      ['a subclass feature', bundledSrdSubclassManifest().by_class.Cleric.features[0]],
      ['an Unarmored Defense row', bundledSrdUnarmoredDefenseFeatures()[1]],
      ['a weapon range', bundledWeaponTemplates()[0]?.range],
    ];
    for (const [label, value] of shared) {
      expect(value, label).toBeDefined();
      expect(Object.isFrozen(value), label).toBe(true);
    }
    expect(bundledArmorTemplates()).toBe(bundledArmorTemplates());
    expect(bundledFeatDefinitions()).toBe(bundledFeatDefinitions());
  });
});
