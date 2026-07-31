import { describe, expect, it } from 'vitest';
import coreTraitsSource from '../../../docs/srd/source/class-core-traits.txt?raw';
import {
  decodePrimaryAbilityExpression,
  encodePrimaryAbilityExpression,
  evaluateMulticlassPrimaryAbilityMinimum,
  MULTICLASS_PRIMARY_ABILITY_MINIMUM,
  type PrimaryAbilityExpression,
} from '../../../src/domain/primary-ability';
import {
  parseSrdClassTraits,
  SrdClassTraitsError,
} from '../../../src/rules/class-traits-srd';

const PRIMARY_ABILITIES: Readonly<Record<string, PrimaryAbilityExpression>> = {
  Barbarian: { kind: 'all_of', abilities: ['strength'] },
  Bard: { kind: 'all_of', abilities: ['charisma'] },
  Cleric: { kind: 'all_of', abilities: ['wisdom'] },
  Druid: { kind: 'all_of', abilities: ['wisdom'] },
  Fighter: {
    kind: 'one_of',
    abilities: ['strength', 'dexterity'],
  },
  Monk: {
    kind: 'all_of',
    abilities: ['dexterity', 'wisdom'],
  },
  Paladin: {
    kind: 'all_of',
    abilities: ['strength', 'charisma'],
  },
  Ranger: {
    kind: 'all_of',
    abilities: ['dexterity', 'wisdom'],
  },
  Rogue: { kind: 'all_of', abilities: ['dexterity'] },
  Sorcerer: { kind: 'all_of', abilities: ['charisma'] },
  Warlock: { kind: 'all_of', abilities: ['charisma'] },
  Wizard: { kind: 'all_of', abilities: ['intelligence'] },
};

describe('sourced primary-ability expressions and D96', () => {
  it('preserves all twelve hand-transcribed one_of/all_of expressions', () => {
    expect(
      Object.fromEntries(
        parseSrdClassTraits().map((entry) => [
          entry.class_name,
          entry.primary_ability_expression,
        ]),
      ),
    ).toEqual(PRIMARY_ABILITIES);
  });

  it('round-trips every sourced expression through catalog JSON', () => {
    for (const expression of Object.values(PRIMARY_ABILITIES)) {
      expect(
        decodePrimaryAbilityExpression(
          encodePrimaryAbilityExpression(expression),
        ),
      ).toEqual({ kind: 'decoded', expression });
    }
  });

  it('refuses an unknown connective instead of collapsing it to one ability', () => {
    expect(() =>
      parseSrdClassTraits(
        coreTraitsSource.replace(
          'Primary Ability            Strength or Dexterity',
          'Primary Ability            Strength xor Dexterity',
        ),
      ),
    ).toThrow(SrdClassTraitsError);
  });

  it('treats a Fighter passing either alternative as met', () => {
    const expression = decodePrimaryAbilityExpression(
      encodePrimaryAbilityExpression(PRIMARY_ABILITIES.Fighter as PrimaryAbilityExpression),
    );
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(expression, {
        strength: 8,
        dexterity: 13,
      }),
    ).toMatchObject({
      status: 'met',
      minimum: MULTICLASS_PRIMARY_ABILITY_MINIMUM,
    });
  });

  it('names both failed Fighter alternatives when neither reaches 13', () => {
    const expression = decodePrimaryAbilityExpression(
      encodePrimaryAbilityExpression(PRIMARY_ABILITIES.Fighter as PrimaryAbilityExpression),
    );
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(expression, {
        strength: 12,
        dexterity: 9,
      }),
    ).toMatchObject({
      status: 'unmet',
      minimum: 13,
      unmet_abilities: ['strength', 'dexterity'],
    });
  });

  it('requires both Monk abilities and names only the unmet minimum', () => {
    const expression = decodePrimaryAbilityExpression(
      encodePrimaryAbilityExpression(PRIMARY_ABILITIES.Monk as PrimaryAbilityExpression),
    );
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(expression, {
        dexterity: 13,
        wisdom: 12,
      }),
    ).toMatchObject({
      status: 'unmet',
      minimum: 13,
      unmet_abilities: ['wisdom'],
    });
  });

  it('warns unprovable for missing expressions, invalid JSON and missing scores', () => {
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(
        decodePrimaryAbilityExpression(null),
        {},
      ),
    ).toMatchObject({
      status: 'unprovable',
      reason: 'missing_expression',
    });
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(
        decodePrimaryAbilityExpression('{"kind":"sometimes"}'),
        {},
      ),
    ).toMatchObject({
      status: 'unprovable',
      reason: 'invalid_expression',
    });
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(
        decodePrimaryAbilityExpression(
          encodePrimaryAbilityExpression(
            PRIMARY_ABILITIES.Ranger as PrimaryAbilityExpression,
          ),
        ),
        { dexterity: 15 },
      ),
    ).toMatchObject({
      status: 'unprovable',
      reason: 'missing_score',
    });
  });

  it('does not let an unknown alternative hide a known all_of failure', () => {
    expect(
      evaluateMulticlassPrimaryAbilityMinimum(
        decodePrimaryAbilityExpression(
          encodePrimaryAbilityExpression(
            PRIMARY_ABILITIES.Paladin as PrimaryAbilityExpression,
          ),
        ),
        { strength: 7 },
      ),
    ).toMatchObject({
      status: 'unmet',
      unmet_abilities: ['strength'],
    });
  });
});
