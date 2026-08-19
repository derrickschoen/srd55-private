import { describe, expect, it } from 'vitest';
import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type { RowCodec, SqlRow } from '../../../../src/db/codecs';
import type { DatabaseContext } from '../../../../src/db/database';
import type { QueryBindings } from '../../../../src/db/query';
import type { PositiveInteger } from '../../../../src/domain/class-resources';
import type { ClassLevel, ContentKey } from '../../../../src/domain/ids';
import type { ValueEvaluationContext } from '../../../../src/domain/value-expression';
import {
  parsePointBudget,
  parsePointCosts,
  parseStandardArray,
  SrdAbilityScoreGenerationWordingError,
  SrdPointCostDuplicateScoreError,
  SrdPointCostTableMissingError,
  SrdStandardArrayShapeError,
} from '../../../../src/rules/ability-score-generation-srd';
import {
  projectedSubclassFeatureSource,
  SubclassSpellcastingAbilityError,
} from '../../../../src/rules/class-level-features-srd';
import {
  ClassDefinitionPersistenceError,
  seedClassProgressions,
} from '../../../../src/rules/class-progression-lookup';
import {
  CharacterEffectAbilityError,
  CharacterEffectEnumError,
  CharacterEffectKindError,
  EligibleWeaponEffectPayloadError,
  readEligibleCharacterEffects,
  readEligibleWeaponEffects,
} from '../../../../src/rules/eligible-character-effects';
import {
  AuthoredResourceMarkingShapeError,
  resolveSheetAuthoredResources,
  resolveSheetFeatureValues,
  StoredContributionSupersedesReferenceError,
  StoredFeatureValueTargetError,
  type FeatureValueClassInput,
} from '../../../../src/rules/sheet-feature-values';
import {
  assertBundledSrdSubclassSpellReferences,
  BundledSubclassPersistenceError,
  ensureBundledSubclassContent,
  SrdSubclassGrantRulesArrayError,
  type BundledSubclassSeed,
} from '../../../../src/rules/srd-subclass-content';

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a rules-storage defect, but it returned.');
}

function databaseWithRows(rows: readonly SqlRow[]): DatabaseContext {
  return {
    all<T>(
      _sql: string,
      _bind: QueryBindings | undefined,
      codec: RowCodec<T>,
    ): T[] {
      return rows.map((row) => codec(row));
    },
    one<T>(
      _sql: string,
      _bind: QueryBindings | undefined,
      codec: RowCodec<T>,
    ): T | null {
      const first = rows[0];
      return first === undefined ? null : codec(first);
    },
    oneRaw(): SqlRow | null {
      return null;
    },
  } as unknown as DatabaseContext;
}

function effectRow(
  overrides: Readonly<Record<string, SqlValue>> = {},
): SqlRow {
  return {
    id: 1,
    sort_order: 1,
    effect_kind: 'damage_resistance',
    damage_type: null,
    hit_points_flat: null,
    hit_points_per_level: null,
    speed_bonus_feet: null,
    ability: null,
    amount: null,
    maximum: null,
    base: null,
    ability_1: null,
    ability_2: null,
    allows_shield: null,
    source_instance_id: null,
    template_ref: null,
    source_type: null,
    character_item_id: null,
    character_weapon_id: null,
    weapon_scope: null,
    label: 'Corrupt effect',
    ...overrides,
  };
}

const classInput: FeatureValueClassInput = {
  class_definition_id: 7,
  class_content_key: '2024:class:wizard' as ContentKey,
  class_level: 1 as ClassLevel,
  subclass: null,
};

const valueContext: ValueEvaluationContext = {
  character_level: 1,
  proficiency_bonus: 2 as PositiveInteger,
  class_levels: new Map(),
  ability_modifiers: new Map(),
};

describe('rules-storage tagged guards', () => {
  it('tags every malformed ability-score extract guard with its facts', () => {
    const missingStandardArray = defect(() => parseStandardArray(''));
    expect(missingStandardArray).toBeInstanceOf(
      SrdAbilityScoreGenerationWordingError,
    );
    expect(missingStandardArray).toMatchObject({ section: 'standard_array' });

    const malformedStandardArray = defect(() =>
      parseStandardArray(
        'Standard Array. Use the following six scores for your abilities: 15, 14, 13, 12, 10.',
      ),
    );
    expect(malformedStandardArray).toBeInstanceOf(SrdStandardArrayShapeError);

    const missingPointBudget = defect(() => parsePointBudget(''));
    expect(missingPointBudget).toBeInstanceOf(
      SrdAbilityScoreGenerationWordingError,
    );
    expect(missingPointBudget).toMatchObject({ section: 'point_cost' });

    const duplicatePointCost = defect(() =>
      parsePointCosts('  8  0  8  1'),
    );
    expect(duplicatePointCost).toBeInstanceOf(SrdPointCostDuplicateScoreError);
    expect(duplicatePointCost).toMatchObject({ score: 8 });

    const missingPointCosts = defect(() => parsePointCosts(''));
    expect(missingPointCosts).toBeInstanceOf(SrdPointCostTableMissingError);
  });

  it('tags an unknown stored subclass spellcasting ability', () => {
    const error = defect(() =>
      projectedSubclassFeatureSource(
        databaseWithRows([
          { spellcasting_ability: 'luck', catalog_layer: null },
        ]),
        '2024:subclass:corrupt' as ContentKey,
      ),
    );
    expect(error).toBeInstanceOf(SubclassSpellcastingAbilityError);
    expect(error).toMatchObject({ ability: 'luck' });
  });

  it('tags a bundled class definition that cannot be read after persistence', () => {
    const db = {
      transaction<T>(callback: (transactionDb: DatabaseContext) => T): T {
        return callback(this as unknown as DatabaseContext);
      },
      scalar(): null {
        return null;
      },
      one<T>(
        _sql: string,
        _bind: QueryBindings | undefined,
        codec: RowCodec<T>,
      ): T {
        return codec({
          content_key: '2024:class:barbarian',
          key_kind: 'bundled-stable',
          catalog_layer: 'bundled',
        });
      },
      exec(): { changes: number; lastInsertId: number } {
        return { changes: 1, lastInsertId: 0 };
      },
    } as unknown as DatabaseContext;
    const error = defect(() => seedClassProgressions(db));
    expect(error).toBeInstanceOf(ClassDefinitionPersistenceError);
    expect(error).toMatchObject({ class_name: 'Barbarian' });
  });

  it('tags every corrupt character-effect enum field with its facts', () => {
    const unknownKind = defect(() =>
      readEligibleCharacterEffects(
        databaseWithRows([effectRow({ effect_kind: 'teleport' })]),
        1,
        'display',
      ),
    );
    expect(unknownKind).toBeInstanceOf(CharacterEffectKindError);
    expect(unknownKind).toMatchObject({ effect_kind: 'teleport' });

    const unknownAbility = defect(() =>
      readEligibleCharacterEffects(
        databaseWithRows([effectRow({ ability: 'luck' })]),
        1,
        'display',
      ),
    );
    expect(unknownAbility).toBeInstanceOf(CharacterEffectAbilityError);
    expect(unknownAbility).toMatchObject({ ability: 'luck', column: 'ability' });

    const unknownSourceType = defect(() =>
      readEligibleCharacterEffects(
        databaseWithRows([effectRow({ source_type: 'mystery' })]),
        1,
        'display',
      ),
    );
    expect(unknownSourceType).toBeInstanceOf(CharacterEffectEnumError);
    expect(unknownSourceType).toMatchObject({
      field: 'source_type',
      value: 'mystery',
    });

    const unknownWeaponScope = defect(() =>
      readEligibleCharacterEffects(
        databaseWithRows([effectRow({ weapon_scope: 'every_weapon' })]),
        1,
        'display',
      ),
    );
    expect(unknownWeaponScope).toBeInstanceOf(CharacterEffectEnumError);
    expect(unknownWeaponScope).toMatchObject({
      field: 'weapon_scope',
      value: 'every_weapon',
    });
  });

  it.each([
    [
      effectRow({
        effect_kind: 'attack_ability_override',
        weapon_scope: 'any_weapon',
      }),
      'attack_ability_override',
    ],
    [
      effectRow({
        effect_kind: 'weapon_attack_bonus',
        weapon_scope: 'any_weapon',
      }),
      'weapon_bonus',
    ],
    [
      effectRow({
        effect_kind: 'weapon_damage_bonus',
        weapon_scope: 'any_weapon',
      }),
      'weapon_bonus',
    ],
  ] as const)('tags an incomplete eligible weapon payload', (row, payload) => {
    const error = defect(() =>
      readEligibleWeaponEffects(databaseWithRows([row]), 1, 'display'),
    );
    expect(error).toBeInstanceOf(EligibleWeaponEffectPayloadError);
    expect(error).toMatchObject({ label: 'Corrupt effect', payload });
  });

  it('tags corrupt stored feature-value targets and supersession values', () => {
    const invalidTarget = defect(() =>
      resolveSheetFeatureValues(
        databaseWithRows([{
          contribution_key: 'corrupt',
          label: 'Corrupt',
          target_key: 'surprise_dice',
          value_json: '{"kind":"const","amount":1}',
          supersedes_ref: null,
        }]),
        [classInput],
        valueContext,
      ),
    );
    expect(invalidTarget).toBeInstanceOf(StoredFeatureValueTargetError);
    expect(invalidTarget).toMatchObject({ target_key: 'surprise_dice' });

    const invalidSupersedes = defect(() =>
      resolveSheetFeatureValues(
        databaseWithRows([{
          contribution_key: 'corrupt',
          label: 'Corrupt',
          target_key: 'sneak_attack',
          value_json: '{"kind":"const","amount":1}',
          supersedes_ref: 42,
        }]),
        [classInput],
        valueContext,
      ),
    );
    expect(invalidSupersedes).toBeInstanceOf(
      StoredContributionSupersedesReferenceError,
    );
    expect(invalidSupersedes).toMatchObject({ owner: 'feature_value' });
  });

  it('tags corrupt authored-resource display storage', () => {
    const authoredInput: FeatureValueClassInput = {
      ...classInput,
      subclass: {
        id: 11,
        content_key: '2024:subclass:corrupt' as ContentKey,
      },
    };
    const stored = {
      contribution_key: 'corrupt',
      label: 'Corrupt',
      target_key: 'corrupt_resource',
      value_json: '{"kind":"const","amount":1}',
      supersedes_ref: null,
      resource_display_label: 'Corrupt Resource',
      resource_marking_shape: 'circles',
    } satisfies SqlRow;
    const invalidShape = defect(() =>
      resolveSheetAuthoredResources(
        databaseWithRows([stored]),
        [authoredInput],
        valueContext,
      ),
    );
    expect(invalidShape).toBeInstanceOf(AuthoredResourceMarkingShapeError);
    expect(invalidShape).toMatchObject({ marking_shape: 'circles' });

    const invalidSupersedes = defect(() =>
      resolveSheetAuthoredResources(
        databaseWithRows([{
          ...stored,
          supersedes_ref: 42,
          resource_marking_shape: 'boxes',
        }]),
        [authoredInput],
        valueContext,
      ),
    );
    expect(invalidSupersedes).toBeInstanceOf(
      StoredContributionSupersedesReferenceError,
    );
    expect(invalidSupersedes).toMatchObject({ owner: 'authored_resource' });
  });

  it('tags a stored SRD subclass grant-rule payload that is not an array', () => {
    const db = {
      scalar(): string {
        return '{}';
      },
    } as unknown as DatabaseContext;
    const error = defect(() => assertBundledSrdSubclassSpellReferences(db));
    expect(error).toBeInstanceOf(SrdSubclassGrantRulesArrayError);
    expect(error).toMatchObject({
      subclass_content_key: '2024:subclass:path-of-the-berserker',
    });
  });

  it('tags a bundled subclass definition that cannot be read after persistence', () => {
    const seed: BundledSubclassSeed = {
      class_name: 'Wizard',
      subclass_name: 'Corrupt Tradition',
      content_key: '2024:subclass:corrupt-tradition',
      spellcasting_ability: 'intelligence',
      features: [],
      grant_rules: null,
    };
    const db = {
      transaction<T>(callback: (transactionDb: DatabaseContext) => T): T {
        return callback(this as unknown as DatabaseContext);
      },
      oneRaw(): null {
        return null;
      },
      scalar(sql: string): number | null {
        return sql.includes('SELECT id FROM class_definitions') ? 7 : null;
      },
      one<T>(
        _sql: string,
        _bind: QueryBindings | undefined,
        codec: RowCodec<T>,
      ): T {
        return codec({
          content_key: seed.content_key,
          key_kind: 'bundled-stable',
          catalog_layer: 'bundled',
        });
      },
      exec(): { changes: number; lastInsertId: number } {
        return { changes: 1, lastInsertId: 0 };
      },
    } as unknown as DatabaseContext;
    const error = defect(() => ensureBundledSubclassContent(db, [seed]));
    expect(error).toBeInstanceOf(BundledSubclassPersistenceError);
    expect(error).toMatchObject({ content_key: seed.content_key });
  });
});
