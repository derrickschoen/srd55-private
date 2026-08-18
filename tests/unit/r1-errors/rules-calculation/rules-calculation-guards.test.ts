import { describe, expect, it } from 'vitest';
import type { DatabaseContext } from '../../../../src/db/database';
import type { EligibleCharacterEffect } from '../../../../src/rules/eligible-character-effects';
import {
  AbilityEffectIncompletePayloadError,
  readAbilityContributions,
  readAbilityOverrides,
} from '../../../../src/rules/ability-contributions';
import {
  AbilityScoreInputError,
  AbilityScores,
} from '../../../../src/rules/ability-scores';
import { AbilityScore } from '../../../../src/rules/ability-score';
import {
  AttackBonus,
  AttackBonusIntegerError,
  AttackBonusProficiencyBonusIntegerError,
} from '../../../../src/rules/attack-bonus';
import {
  attackProfiles,
  ShillelaghCharacterLevelUndeterminedError,
} from '../../../../src/rules/attack-profiles';
import {
  CasterContribution,
  CasterProgressionTypeError,
} from '../../../../src/rules/caster-contribution';
import {
  characterLevel,
  CharacterLevelIdRequiredError,
} from '../../../../src/rules/character-level';
import {
  EquipmentItemKindError,
  readEquipmentPackageOptions,
} from '../../../../src/rules/equipment-package-display';
import {
  ExtraAttackUnhandledWeaponScopeError,
  resolveAttacksPerAction,
  type ExtraAttackGrant,
} from '../../../../src/rules/extra-attack';
import {
  AbilityScoreImprovementFeatMissingError,
  reconcileLegacyLevelFeatChoices,
} from '../../../../src/rules/legacy-level-feat-choices';
import {
  proficiencyBonus,
  ProficiencyCharacterLevelIntegerError,
} from '../../../../src/rules/proficiency';
import {
  maxPreparableLevel,
  ProgressionClassLevelIntegerError,
  sharedCasterLevels,
} from '../../../../src/rules/progression-type';
import {
  SaveDC,
  SaveDCProficiencyBonusIntegerError,
} from '../../../../src/rules/save-dc';
import {
  CasterLevelIntegerError,
  slotsForCasterLevel,
} from '../../../../src/rules/spell-slots';

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect, but the call returned.');
}

const EFFECT: EligibleCharacterEffect = {
  id: 17,
  sort_order: 1,
  effect_kind: 'ability_increase',
  damage_type: null,
  hit_points_flat: null,
  hit_points_per_level: null,
  speed_bonus_feet: null,
  ability: 'strength',
  amount: 2,
  maximum: 20,
  base: null,
  ability_1: null,
  ability_2: null,
  allows_shield: null,
  source_instance_id: 3,
  template_ref: null,
  source_type: 'background',
  character_item_id: null,
  character_weapon_id: null,
  weapon_scope: null,
  label: 'Stored effect',
};

function effectDatabase(effect: EligibleCharacterEffect): DatabaseContext {
  return {
    all: () => [effect],
  } as unknown as DatabaseContext;
}

describe('rules calculation tagged guards', () => {
  it('tags both incomplete stored ability payload guards', () => {
    const increase = defect(() =>
      readAbilityContributions(
        effectDatabase({ ...EFFECT, source_instance_id: null }),
        1,
      ),
    );
    expect(increase).toBeInstanceOf(AbilityEffectIncompletePayloadError);
    expect(increase).toMatchObject({
      effect_kind: 'increase',
      effect_id: 17,
    });

    const override = defect(() =>
      readAbilityOverrides(
        effectDatabase({
          ...EFFECT,
          effect_kind: 'ability_override',
          ability: null,
          amount: null,
        }),
        1,
      ),
    );
    expect(override).toBeInstanceOf(AbilityEffectIncompletePayloadError);
    expect(override).toMatchObject({
      effect_kind: 'override',
      effect_id: 17,
    });
  });

  it('tags an invalid ability score with the rejected field and value', () => {
    const error = defect(() =>
      AbilityScores.fromArray({
        strength: 10,
        dexterity: 'ten',
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      }),
    );
    expect(error).toBeInstanceOf(AbilityScoreInputError);
    expect(error).toMatchObject({ ability: 'dexterity', value: 'ten' });
  });

  it('tags both attack-bonus integer guards with their inputs', () => {
    const value = defect(() => new AttackBonus(2.5));
    expect(value).toBeInstanceOf(AttackBonusIntegerError);
    expect(value).toMatchObject({ value: 2.5 });

    const proficiency = defect(() =>
      AttackBonus.from(new AbilityScore(10), 2.5),
    );
    expect(proficiency).toBeInstanceOf(
      AttackBonusProficiencyBonusIntegerError,
    );
    expect(proficiency).toMatchObject({ proficiency_bonus: 2.5 });
  });

  it('tags a Shillelagh profile with no determined character level', () => {
    const error = defect(() =>
      attackProfiles({
        weapons: [],
        classes: [],
        scores: AbilityScores.fromArray({
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        }),
        proficiencyBonus: null,
        cantrips: {
          true_strike: { state: 'not_known' },
          shillelagh: {
            state: 'known',
            sources: [{
              source_name: 'Druid',
              spellcasting_ability: 'wisdom',
            }],
          },
          unrecognised: [],
        },
        effects: [],
      }),
    );
    expect(error).toBeInstanceOf(
      ShillelaghCharacterLevelUndeterminedError,
    );
  });

  it('tags an unknown caster progression with its class and value', () => {
    const error = defect(() =>
      new CasterContribution('Mystery', 3, 'future'),
    );
    expect(error).toBeInstanceOf(CasterProgressionTypeError);
    expect(error).toMatchObject({
      class_name: 'Mystery',
      progression_type: 'future',
    });
  });

  it('tags a database level read with no character id', () => {
    const databaseRead = characterLevel as (
      db: DatabaseContext,
      characterId?: number,
    ) => number | null;
    const error = defect(() => databaseRead({} as DatabaseContext));
    expect(error).toBeInstanceOf(CharacterLevelIdRequiredError);
  });

  it('tags an unknown stored equipment item kind with its row facts', () => {
    const db = {
      scalar: () => 1,
      allRaw: () => [
        {
          option: 'A',
          item_name: 'Moon Dial',
          quantity: 1,
          item_kind: 'relic',
          catalog_layer: null,
        },
      ],
    } as unknown as DatabaseContext;
    const error = defect(() =>
      readEquipmentPackageOptions(db, 'class', 'test:class:moon'),
    );
    expect(error).toBeInstanceOf(EquipmentItemKindError);
    expect(error).toMatchObject({
      item_name: 'Moon Dial',
      item_kind: 'relic',
    });
  });

  it('tags an unhandled extra-attack weapon scope', () => {
    const grant = {
      source: 'class',
      source_name: 'Fighter',
      class_level: 5,
      attack_count: 2,
      weapon_scope: 'future',
      unresolved: [],
    } as unknown as ExtraAttackGrant;
    const error = defect(() =>
      resolveAttacksPerAction([
        {
          class_name: 'Fighter',
          level: 5,
          extra_attack_grants: [grant],
        },
      ]),
    );
    expect(error).toBeInstanceOf(ExtraAttackUnhandledWeaponScopeError);
    expect(error).toMatchObject({ weapon_scope: 'future' });
  });

  it('tags a missing bundled Ability Score Improvement definition', () => {
    const db = {
      oneRaw: () => null,
    } as unknown as DatabaseContext;
    const error = defect(() => reconcileLegacyLevelFeatChoices(db));
    expect(error).toBeInstanceOf(AbilityScoreImprovementFeatMissingError);
  });

  it('tags the proficiency character-level integer guard', () => {
    const error = defect(() => proficiencyBonus(2.5));
    expect(error).toBeInstanceOf(ProficiencyCharacterLevelIntegerError);
    expect(error).toMatchObject({ character_level: 2.5 });
  });

  it('tags both progression class-level integer guards', () => {
    const shared = defect(() => sharedCasterLevels('full', 2.5));
    expect(shared).toBeInstanceOf(ProgressionClassLevelIntegerError);
    expect(shared).toMatchObject({ class_level: 2.5 });

    const preparation = defect(() => maxPreparableLevel('full', 2.5));
    expect(preparation).toBeInstanceOf(ProgressionClassLevelIntegerError);
    expect(preparation).toMatchObject({ class_level: 2.5 });
  });

  it('tags the save-DC proficiency integer guard', () => {
    const error = defect(() => SaveDC.from(new AbilityScore(10), 2.5));
    expect(error).toBeInstanceOf(SaveDCProficiencyBonusIntegerError);
    expect(error).toMatchObject({ proficiency_bonus: 2.5 });
  });

  it('tags the caster-level integer guard', () => {
    const error = defect(() => slotsForCasterLevel(2.5));
    expect(error).toBeInstanceOf(CasterLevelIntegerError);
    expect(error).toMatchObject({ caster_level: 2.5 });
  });
});
