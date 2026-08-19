import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FreeCast } from '../../../src/grants/free-cast';
import {
  GrantRule,
  grantRuleConsumesConfig,
} from '../../../src/grants/grant-rule';
import {
  GrantRuleActiveConfigKeysError,
  GrantRuleActiveConfigValuesError,
  GrantRuleCapabilityCountError,
  GrantRuleFieldError,
  GrantRuleForbiddenBucketError,
  GrantRuleFixedSpellReferenceRequiredError,
  GrantRuleFreeCastEnumError,
  GrantRuleFreeCastUsesError,
  GrantRuleInvalidBucketError,
  GrantRuleInputTypeError,
  GrantRuleJsonParseError,
  GrantRuleJsonShapeError,
  GrantRuleKindError,
  GrantRulePendingChoiceError,
  GrantRuleQueryPredicateError,
  GrantRuleSelectionCollectionError,
  GrantSourceRuleDefinitionKeyConfigError,
  GrantSourceRuleReferenceRequiredError,
} from '../../../src/grants/grant-rule-errors';
import { DatabaseContext } from '../../../src/db/database';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected an error, but the call returned.');
}

type ErrorConstructor = abstract new (...args: never[]) => Error;

function expectStructuredError(
  run: () => unknown,
  errorClass: ErrorConstructor,
  fields: Readonly<Record<string, unknown>> = {},
): void {
  const error = thrown(run);
  expect(error).toBeInstanceOf(errorClass);
  expect(error).toMatchObject(fields);
}

function fixedRule(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'fixed_spell',
    rule_key: 'fixed-contract',
    bucket: 'automatic',
    spell_version_id: 1,
    ...overrides,
  };
}

describe('GrantRule', () => {
  let connection: Database;
  let db: DatabaseContext;
  let persistedDefinition = 0;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => {
    db.close();
  });

  function persist(
    inputs: readonly unknown[],
  ): ReadonlyArray<Record<string, unknown>> {
    const rules = inputs.map((input) => GrantRule.fromObject(input).toObject());
    persistedDefinition += 1;
    const contentKey = `2024:feat:grant-rule-${persistedDefinition}`;
    const name = `Grant Rule ${persistedDefinition}`;
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey, name, keyKind: 'bundled-stable',
    });

    db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, ?, '2024', ?)`,
      [contentKey, name, JSON.stringify(rules)],
    );

    const stored = db.scalar<string>(
      'SELECT grant_rules FROM feat_definitions WHERE content_key = ?',
      [contentKey],
    );
    expect(stored).not.toBeNull();
    return JSON.parse(stored as string) as ReadonlyArray<
      Record<string, unknown>
    >;
  }

  it('normalizes and stores exactly the nine actual rule kinds', () => {
    const stored = persist([
      {
        kind: 'fixed_spell',
        rule_key: '  fixed  ',
        bucket: 'automatic',
        spell_version_key: 'https://example.test/spell',
        oracle_extension: 'preserved',
      },
      {
        kind: 'choice_from_list',
        rule_key: 'list',
        count: 2,
        bucket: 'known',
        list: 'Wizard',
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query',
        count: 1,
        bucket: 'prepared',
        schools: ['Illusion'],
        tags: ['ritual'],
      },
      {
        kind: 'grant_source',
        rule_key: 'source',
        source_type: 'feat',
        source_definition_id: 1,
      },
      {
        kind: 'capability',
        rule_key: 'capability',
        capability_key: 'ritual',
        collection: 'wizard_spellbook',
        access_mode: 'ritual_only',
        tags: ['ritual'],
      },
      {
        kind: 'spellbook_acquisition',
        rule_key: 'book',
        count: 2,
        bucket: 'spellbook',
        list: 'Wizard',
        initial_count: 1,
        count_per_level: 1,
      },
      {
        kind: 'fighting_style',
        rule_key: 'style',
        style_key: 'archery',
      },
      {
        kind: 'weapon_mastery',
        rule_key: 'mastery',
        count: 1,
        selection_pool: 'owned-weapons',
      },
      {
        kind: 'skill_proficiency',
        rule_key: 'skills',
        count: 3,
        allows_tool_instead: true,
      },
    ]);

    expect(stored).toEqual([
      {
        kind: 'fixed_spell',
        rule_key: 'fixed',
        bucket: 'automatic',
        spell_version_key: 'https://example.test/spell',
        oracle_extension: 'preserved',
        count: 1,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
      {
        kind: 'choice_from_list',
        rule_key: 'list',
        count: 2,
        bucket: 'known',
        list: 'Wizard',
        always_prepared: false,
        with_slots: true,
        free_cast: null,
        level_min: 0,
        level_max: 9,
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query',
        count: 1,
        bucket: 'prepared',
        schools: ['Illusion'],
        tags: ['ritual'],
        always_prepared: false,
        with_slots: true,
        free_cast: null,
        level_min: 0,
        level_max: 9,
      },
      {
        kind: 'grant_source',
        rule_key: 'source',
        source_type: 'feat',
        source_definition_id: 1,
        count: 1,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
      {
        kind: 'capability',
        rule_key: 'capability',
        capability_key: 'ritual',
        collection: 'wizard_spellbook',
        access_mode: 'ritual_only',
        tags: ['ritual'],
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
      {
        kind: 'spellbook_acquisition',
        rule_key: 'book',
        count: 2,
        bucket: 'spellbook',
        list: 'Wizard',
        initial_count: 1,
        count_per_level: 1,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
        level_min: 0,
        level_max: 9,
      },
      {
        kind: 'fighting_style',
        rule_key: 'style',
        style_key: 'archery',
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
      {
        kind: 'weapon_mastery',
        rule_key: 'mastery',
        count: 1,
        selection_pool: 'owned-weapons',
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
      {
        kind: 'skill_proficiency',
        rule_key: 'skills',
        count: 3,
        allows_tool_instead: true,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
    ]);
    expect(stored.map((rule) => rule.kind)).not.toContain(
      'choice_from_school',
    );
    expect(stored.map((rule) => rule.kind)).not.toContain('nested_source');
  });

  it('normalizes and stores activation plus every free-cast recovery and pool scope', () => {
    const recoveries = ['long_rest', 'short_rest', 'dawn', 'at_will'] as const;
    const inputs = recoveries.map((recovery, index) => ({
      kind: 'fixed_spell',
      rule_key: index === 0 ? '  conditional-gift  ' : `gift-${index}`,
      bucket: 'automatic',
      spell_version_id: index + 1,
      always_prepared: true,
      with_slots: false,
      free_cast: {
        uses: index + 1,
        recovery,
        pool_scope: index % 2 === 0 ? 'per_spell' : 'shared',
      },
      ...(index === 0
        ? {
            active_from_class_level: 2,
            active_if_config: {
              equals: '  Thaumaturge  ',
              key: '  divine_order.chosen_option  ',
            },
            distinct_config_by: '  chosen_list  ',
          }
        : {}),
    }));

    const serialized = inputs.map((input) =>
      GrantRule.fromObject(input).toJson(),
    );
    const stored = persist(
      serialized.map((json) => GrantRule.fromJson(json).toObject()),
    );

    expect(stored.map((rule) => rule.free_cast)).toEqual([
      { uses: 1, recovery: 'long_rest', pool_scope: 'per_spell' },
      { uses: 2, recovery: 'short_rest', pool_scope: 'shared' },
      { uses: 3, recovery: 'dawn', pool_scope: 'per_spell' },
      { uses: 4, recovery: 'at_will', pool_scope: 'shared' },
    ]);
    expect(stored[0]).toMatchObject({
      rule_key: 'conditional-gift',
      active_from_class_level: 2,
      active_if_config: {
        key: 'divine_order.chosen_option',
        equals: 'Thaumaturge',
      },
      distinct_config_by: 'chosen_list',
      always_prepared: true,
      with_slots: false,
    });
    expect(serialized[0]).toContain('"pool_scope":"per_spell"');
  });

  it('stores each independent query predicate and granted-source reference', () => {
    const stored = persist([
      {
        kind: 'choice_from_query',
        rule_key: 'query-school',
        count: 1,
        bucket: 'known',
        schools: ['Illusion'],
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query-tags',
        count: 1,
        bucket: 'known',
        tags: ['ritual'],
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query-minimum',
        count: 1,
        bucket: 'known',
        level_min: 1,
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query-maximum',
        count: 1,
        bucket: 'known',
        level_max: 2,
      },
      {
        kind: 'grant_source',
        rule_key: 'source-id',
        source_type: 'feat',
        source_definition_id: 1,
      },
      {
        kind: 'grant_source',
        rule_key: 'source-key',
        source_type: 'feat',
        source_definition_key: '2024:feat:magic-initiate',
      },
      {
        kind: 'grant_source',
        rule_key: 'source-config',
        source_type: 'feat',
        definition_key_config: 'origin_feat_key',
        child_config_config: 'origin_feat_config',
      },
    ]);

    expect(stored.map((rule) => rule.rule_key)).toEqual([
      'query-school',
      'query-tags',
      'query-minimum',
      'query-maximum',
      'source-id',
      'source-key',
      'source-config',
    ]);
    expect(stored[2]).toMatchObject({ level_min: 1, level_max: 9 });
    expect(stored[3]).toMatchObject({ level_min: 0, level_max: 2 });
    expect(stored[6]).toMatchObject({
      definition_key_config: 'origin_feat_key',
      child_config_config: 'origin_feat_config',
      count: 1,
    });
  });

  it('classifies every config-consuming field by exact value shape', () => {
    const cases: ReadonlyArray<readonly [string, Record<string, unknown>, boolean]> = [
      ['unknown future field', { future_config: true }, true],
      ['ordinary mechanical fields', {
        kind: 'choice_from_list', rule_key: 'list', count: 1,
        bucket: 'known', list: 'Wizard',
      }, false],
      ['nullable active config absent', { active_if_config: null }, false],
      ['active config present', {
        active_if_config: { key: 'order', equals: 'Scholar' },
      }, true],
      ['nullable distinct path absent', { distinct_config_by: undefined }, false],
      ['distinct path present', { distinct_config_by: 'chosen_list' }, true],
      ['literal list', { list: 'Wizard' }, false],
      ['config list path', { list: '$config.chosen_list' }, true],
      ['config marker only at suffix', { list: 'Wizard$config.' }, false],
      ['pending choice false', { allows_pending_choice: false }, false],
      ['pending choice true', { allows_pending_choice: true }, true],
      ['tool alternative false', { allows_tool_instead: false }, false],
      ['tool alternative true', { allows_tool_instead: true }, true],
      ['empty object', {}, false],
    ];

    for (const [label, input, expected] of cases) {
      expect(grantRuleConsumesConfig(input), label).toBe(expected);
    }
  });

  it('clones nested lists and objects across input, output, array, and JSON boundaries', () => {
    const input = {
      kind: 'choice_from_query',
      rule_key: 'clone-query',
      count: 1,
      bucket: 'known',
      schools: ['Illusion'],
      tags: ['ritual'],
      active_if_config: { key: 'path.option', equals: 'Moon' },
      extension: { nested: [{ exact: 3 }] },
    };
    const parsed = GrantRule.fromArray(input);
    input.schools[0] = 'Evocation';
    input.active_if_config.equals = 'Sun';
    input.extension.nested[0]!.exact = 99;

    expect(parsed.toObject()).toEqual({
      kind: 'choice_from_query',
      rule_key: 'clone-query',
      count: 1,
      bucket: 'known',
      schools: ['Illusion'],
      tags: ['ritual'],
      active_if_config: { key: 'path.option', equals: 'Moon' },
      extension: { nested: [{ exact: 3 }] },
      always_prepared: false,
      with_slots: true,
      free_cast: null,
      level_min: 0,
      level_max: 9,
    });

    const output = parsed.toArray();
    const outputExtension = Object.fromEntries(
      Object.entries(output),
    ).extension as {
      nested: Array<{ exact: number }>;
    };
    outputExtension.nested[0]!.exact = 7;
    expect(parsed.toObject()).toMatchObject({
      extension: { nested: [{ exact: 3 }] },
    });
    expect(GrantRule.fromJson(parsed.toJson()).toJSON()).toEqual(
      parsed.toObject(),
    );
  });

  it('pins scalar field contracts one invalid value at a time', () => {
    const invalid: ReadonlyArray<readonly [
      string,
      unknown,
      ErrorConstructor,
      Readonly<Record<string, unknown>>,
    ]> = [
      ['null input', null, GrantRuleInputTypeError, {}],
      ['array input', [], GrantRuleInputTypeError, {}],
      ['scalar input', 'fixed_spell', GrantRuleInputTypeError, {}],
      ['missing kind', { rule_key: 'x' }, GrantRuleKindError, { value: undefined }],
      ['null kind', { kind: null, rule_key: 'x' }, GrantRuleKindError, { value: null }],
      ['blank rule key', fixedRule({ rule_key: ' ' }), GrantRuleFieldError, {
        rule_key: null, field: 'rule_key', expected: 'non_empty_string',
      }],
      ['numeric rule key', fixedRule({ rule_key: 1 }), GrantRuleFieldError, {
        rule_key: null, field: 'rule_key', expected: 'non_empty_string',
      }],
      ['zero count', {
        kind: 'choice_from_list', rule_key: 'list', count: 0,
        bucket: 'known', list: 'Wizard',
      }, GrantRuleFieldError, {
        rule_key: 'list', field: 'count', expected: 'positive_integer',
      }],
      ['fractional count', {
        kind: 'choice_from_list', rule_key: 'list', count: 1.5,
        bucket: 'known', list: 'Wizard',
      }, GrantRuleFieldError, {
        rule_key: 'list', field: 'count', expected: 'positive_integer',
      }],
      ['always prepared string', fixedRule({ always_prepared: 'false' }),
        GrantRuleFieldError, {
          rule_key: 'fixed-contract', field: 'always_prepared', expected: 'boolean',
        }],
      ['with slots null', fixedRule({ with_slots: null }), GrantRuleFieldError, {
        rule_key: 'fixed-contract', field: 'with_slots', expected: 'boolean',
      }],
      ['blank distinct path', fixedRule({ distinct_config_by: ' ' }),
        GrantRuleFieldError, {
          rule_key: 'fixed-contract', field: 'distinct_config_by',
          expected: 'non_empty_string',
        }],
      ['selection list null', {
        kind: 'choice_from_list', rule_key: 'list', count: 1,
        bucket: 'known', list: null,
      }, GrantRuleFieldError, {
        rule_key: null, field: 'list', expected: 'non_empty_string',
      }],
      ['selection list blank', {
        kind: 'choice_from_list', rule_key: 'list', count: 1,
        bucket: 'known', list: ' ',
      }, GrantRuleFieldError, {
        rule_key: null, field: 'list', expected: 'non_empty_string',
      }],
    ];

    for (const [label, input, errorClass, fields] of invalid) {
      expectStructuredError(
        () => GrantRule.fromObject(input),
        errorClass,
        fields,
      );
      expect(label).not.toBe('');
    }

    expect(GrantRule.fromObject(fixedRule({
      rule_key: '  trimmed-key  ',
      distinct_config_by: '  nested.choice  ',
    }))).toMatchObject({
      ruleKey: 'trimmed-key',
      count: 1,
      alwaysPrepared: false,
      withSlots: true,
      distinctConfigBy: 'nested.choice',
    });
  });

  it('pins spell and activation levels at every lower and upper boundary', () => {
    for (const [levelMin, levelMax] of [[0, 0], [1, 9], [9, 9]] as const) {
      expect(GrantRule.fromObject({
        kind: 'choice_from_query',
        rule_key: `levels-${levelMin}-${levelMax}`,
        count: 1,
        bucket: 'known',
        level_min: levelMin,
        level_max: levelMax,
      }).toObject()).toMatchObject({ level_min: levelMin, level_max: levelMax });
    }
    for (const [field, value] of [
      ['level_min', -1],
      ['level_min', 1.5],
      ['level_max', 10],
      ['level_max', '9'],
    ] as const) {
      const error = thrown(() => GrantRule.fromObject({
        kind: 'choice_from_query', rule_key: 'bad-level', count: 1,
        bucket: 'known', [field]: value,
      }));
      expect(error).toBeInstanceOf(RangeError);
    }

    for (const activeLevel of [1, 20] as const) {
      expect(GrantRule.fromObject(fixedRule({
        active_from_character_level: activeLevel,
      })).activeFromCharacterLevel).toBe(activeLevel);
    }
    expectStructuredError(
      () => GrantRule.fromObject(fixedRule({ active_from_character_level: 0 })),
      GrantRuleFieldError,
      {
        rule_key: 'fixed-contract', field: 'active_from_character_level',
        expected: 'positive_integer',
      },
    );
    expect(thrown(() => GrantRule.fromObject(fixedRule({
      active_from_character_level: 21,
    })))).toBeInstanceOf(RangeError);
  });

  it('pins active-config object keys and independently blank values', () => {
    const invalid: ReadonlyArray<readonly [unknown, ErrorConstructor]> = [
      [[], GrantRuleActiveConfigKeysError],
      [{}, GrantRuleActiveConfigKeysError],
      [{ key: 'choice' }, GrantRuleActiveConfigKeysError],
      [{ key: 'choice', equals: 'Moon', extra: true }, GrantRuleActiveConfigKeysError],
      [{ key: 1, equals: 'Moon' }, GrantRuleActiveConfigValuesError],
      [{ key: 'choice', equals: 1 }, GrantRuleActiveConfigValuesError],
      [{ key: ' ', equals: 'Moon' }, GrantRuleActiveConfigValuesError],
      [{ key: 'choice', equals: ' ' }, GrantRuleActiveConfigValuesError],
    ];
    for (const [activeIfConfig, errorClass] of invalid) {
      expectStructuredError(
        () => GrantRule.fromObject(fixedRule({ active_if_config: activeIfConfig })),
        errorClass,
        { rule_key: 'fixed-contract' },
      );
    }
    expect(GrantRule.fromObject(fixedRule({
      active_if_config: { key: '  path.choice  ', equals: '  Moon  ' },
    })).activeIfConfig).toEqual({ key: 'path.choice', equals: 'Moon' });
  });

  it('pins required and forbidden kind-specific payloads', () => {
    const cases: ReadonlyArray<readonly [
      string,
      unknown,
      ErrorConstructor,
      Readonly<Record<string, unknown>>,
    ]> = [
      ['fixed missing reference', {
        kind: 'fixed_spell', rule_key: 'fixed', bucket: 'automatic',
      }, GrantRuleFixedSpellReferenceRequiredError, { rule_key: 'fixed' }],
      ['list missing list', {
        kind: 'choice_from_list', rule_key: 'list', count: 1, bucket: 'known',
      }, GrantRuleFieldError, {
        rule_key: null, field: 'list', expected: 'non_empty_string',
      }],
      ['query missing predicate', {
        kind: 'choice_from_query', rule_key: 'query', count: 1, bucket: 'known',
      }, GrantRuleQueryPredicateError, { rule_key: 'query' }],
      ['source missing type', {
        kind: 'grant_source', rule_key: 'source', source_definition_id: 1,
      }, GrantRuleFieldError, {
        rule_key: null, field: 'source_type', expected: 'non_empty_string',
      }],
      ['capability missing key', {
        kind: 'capability', rule_key: 'capability', collection: 'spellbook',
        access_mode: 'ritual', tags: ['ritual'],
      }, GrantRuleFieldError, {
        rule_key: null, field: 'capability_key', expected: 'non_empty_string',
      }],
      ['spellbook acquisition config blank', {
        kind: 'spellbook_acquisition', rule_key: 'book', count: 1,
        bucket: 'spellbook', list: 'Wizard', acquisitions_config: ' ',
      }, GrantRuleFieldError, {
        rule_key: null, field: 'acquisitions_config', expected: 'non_empty_string',
      }],
      ['fighting style missing key', {
        kind: 'fighting_style', rule_key: 'style',
      }, GrantRuleFieldError, {
        rule_key: null, field: 'style_key', expected: 'non_empty_string',
      }],
      ['weapon mastery missing pool', {
        kind: 'weapon_mastery', rule_key: 'mastery', count: 1,
      }, GrantRuleFieldError, {
        rule_key: null, field: 'selection_pool', expected: 'non_empty_string',
      }],
      ['skill alternative wrong type', {
        kind: 'skill_proficiency', rule_key: 'skill', count: 1,
        allows_tool_instead: 1,
      }, GrantRuleFieldError, {
        rule_key: 'skill', field: 'allows_tool_instead', expected: 'boolean',
      }],
    ];
    for (const [label, input, errorClass, fields] of cases) {
      expectStructuredError(
        () => GrantRule.fromObject(input),
        errorClass,
        fields,
      );
      expect(label).not.toBe('');
    }
  });

  it('pins source references, pending-choice declaration, and bucket ownership', () => {
    const references = [
      { source_definition_id: 1 },
      { source_definition_key: '2024:feat:magic-initiate' },
      { definition_key_config: 'origin.feat.key' },
    ];
    for (const reference of references) {
      expect(GrantRule.fromObject({
        kind: 'grant_source', rule_key: 'source', source_type: 'feat',
        ...reference,
      }).toObject()).toMatchObject({
        kind: 'grant_source', rule_key: 'source', source_type: 'feat',
        count: 1,
      });
    }
    for (const sourceDefinitionId of [0, -1, 1.5, '1']) {
      expectStructuredError(
        () => GrantRule.fromObject({
          kind: 'grant_source', rule_key: 'source', source_type: 'feat',
          source_definition_id: sourceDefinitionId,
        }),
        GrantSourceRuleReferenceRequiredError,
        { rule_key: 'source' },
      );
    }
    expect(GrantRule.fromObject({
      kind: 'grant_source', rule_key: 'pending', source_type: 'feat',
      definition_key_config: 'origin.feat.key', allows_pending_choice: true,
    }).toObject()).toMatchObject({
      definition_key_config: 'origin.feat.key', allows_pending_choice: true,
    });
    for (const input of [
      fixedRule({ allows_pending_choice: true }),
      {
        kind: 'grant_source', rule_key: 'pending', source_type: 'feat',
        source_definition_key: '2024:feat:magic-initiate',
        allows_pending_choice: true,
      },
    ]) {
      expectStructuredError(
        () => GrantRule.fromObject(input),
        GrantRulePendingChoiceError,
        { rule_key: input.rule_key },
      );
    }
    expectStructuredError(
      () => GrantRule.fromObject(fixedRule({ allows_pending_choice: 'yes' })),
      GrantRuleFieldError,
      {
        rule_key: 'fixed-contract', field: 'allows_pending_choice',
        expected: 'boolean',
      },
    );
    expectStructuredError(
      () => GrantRule.fromObject({
        kind: 'fighting_style', rule_key: 'style', style_key: 'archery',
        bucket: 'known',
      }),
      GrantRuleForbiddenBucketError,
      { rule_key: 'style' },
    );
    expectStructuredError(
      () => GrantRule.fromObject({
        kind: 'choice_from_list', rule_key: 'list', count: 1, list: 'Wizard',
      }),
      GrantRuleFieldError,
      { rule_key: null, field: 'bucket', expected: 'non_empty_string' },
    );
  });

  it('pins spellbook initial and per-level count boundaries', () => {
    const rule = (initialCount: unknown, countPerLevel: unknown) => ({
      kind: 'spellbook_acquisition',
      rule_key: 'book',
      count: 2,
      bucket: 'spellbook',
      list: 'Wizard',
      initial_count: initialCount,
      count_per_level: countPerLevel,
    });
    expect(GrantRule.fromObject(rule(0, 1)).toObject()).toMatchObject({
      initial_count: 0,
      count_per_level: 1,
    });
    for (const initialCount of [-1, 1.5, '0']) {
      expectStructuredError(
        () => GrantRule.fromObject(rule(initialCount, 1)),
        GrantRuleFieldError,
        {
          rule_key: 'book', field: 'initial_count',
          expected: 'non_negative_integer',
        },
      );
    }
    for (const countPerLevel of [0, -1, 1.5, '1']) {
      expectStructuredError(
        () => GrantRule.fromObject(rule(0, countPerLevel)),
        GrantRuleFieldError,
        {
          rule_key: 'book', field: 'count_per_level',
          expected: 'positive_integer',
        },
      );
    }
  });

  it('rejects malformed and obsolete contracts before any row is stored', () => {
    const malformed: ReadonlyArray<
      readonly [string, unknown, Error | string]
    > = [
      [
        'obsolete school choice',
        { kind: 'choice_from_school', rule_key: 'old' },
        new GrantRuleKindError('choice_from_school'),
      ],
      [
        'obsolete nested source',
        { kind: 'nested_source', rule_key: 'old' },
        new GrantRuleKindError('nested_source'),
      ],
      [
        'missing rule key',
        {
          kind: 'fixed_spell',
          bucket: 'automatic',
          spell_version_id: 1,
        },
        new GrantRuleFieldError(null, 'rule_key', 'non_empty_string'),
      ],
      [
        'fixed count',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          count: 2,
          bucket: 'automatic',
          spell_version_id: 1,
        },
        "Fixed-spell rule 'fixed' must have count 1.",
      ],
      [
        'missing choice count',
        {
          kind: 'choice_from_list',
          rule_key: 'list',
          bucket: 'known',
          list: 'Wizard',
        },
        new GrantRuleFieldError('list', 'count', 'positive_integer'),
      ],
      [
        'invalid bucket',
        {
          kind: 'choice_from_list',
          rule_key: 'list',
          count: 1,
          bucket: 'sometimes',
          list: 'Wizard',
        },
        new GrantRuleInvalidBucketError('list', 'sometimes'),
      ],
      [
        'capability count',
        {
          kind: 'capability',
          rule_key: 'capability',
          count: 1,
          capability_key: 'ritual',
          collection: 'spellbook',
          access_mode: 'ritual_only',
          tags: ['ritual'],
        },
        new GrantRuleCapabilityCountError('capability'),
      ],
      [
        'capability bucket',
        {
          kind: 'capability',
          rule_key: 'capability',
          bucket: 'known',
          capability_key: 'ritual',
          collection: 'spellbook',
          access_mode: 'ritual_only',
          tags: ['ritual'],
        },
        new GrantRuleForbiddenBucketError('capability'),
      ],
      [
        'invalid boolean',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          always_prepared: null,
        },
        new GrantRuleFieldError('fixed', 'always_prepared', 'boolean'),
      ],
      [
        'invalid active level',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          active_from_class_level: 0,
        },
        new GrantRuleFieldError('fixed', 'active_from_class_level', 'positive_integer'),
      ],
      [
        'inverted levels',
        {
          kind: 'choice_from_query',
          rule_key: 'query',
          count: 1,
          bucket: 'known',
          level_min: 3,
          level_max: 1,
        },
        "Grant rule 'query' has level_min greater than level_max.",
      ],
      [
        'query without predicate',
        {
          kind: 'choice_from_query',
          rule_key: 'query',
          count: 1,
          bucket: 'known',
        },
        new GrantRuleQueryPredicateError('query'),
      ],
      [
        'query malformed tags',
        {
          kind: 'choice_from_query',
          rule_key: 'query',
          count: 1,
          bucket: 'known',
          tags: [' '],
        },
        new GrantRuleFieldError('query', 'tags', 'strings_only'),
      ],
      [
        'selection collection',
        {
          kind: 'choice_from_list',
          rule_key: 'list',
          count: 1,
          bucket: 'known',
          list: 'Wizard',
          selection_collection: 'other',
        },
        new GrantRuleSelectionCollectionError('list'),
      ],
      [
        'missing fixed reference',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 0,
        },
        new GrantRuleFixedSpellReferenceRequiredError('fixed'),
      ],
      [
        'missing source reference',
        {
          kind: 'grant_source',
          rule_key: 'source',
          source_type: 'feat',
          definition_key_config: ' ',
        },
        new GrantSourceRuleReferenceRequiredError('source'),
      ],
      [
        'invalid definition key config type',
        {
          kind: 'grant_source',
          rule_key: 'source',
          source_type: 'feat',
          source_definition_key: '2024:feat:magic-initiate',
          definition_key_config: false,
        },
        new GrantSourceRuleDefinitionKeyConfigError('source'),
      ],
      [
        'missing capability tags',
        {
          kind: 'capability',
          rule_key: 'capability',
          capability_key: 'ritual',
          collection: 'spellbook',
          access_mode: 'ritual_only',
          tags: [],
        },
        new GrantRuleFieldError('capability', 'tags', 'non_empty_string_list'),
      ],
      [
        'missing spellbook count',
        {
          kind: 'spellbook_acquisition',
          rule_key: 'book',
          bucket: 'spellbook',
          list: 'Wizard',
        },
        new GrantRuleFieldError('book', 'count', 'positive_integer'),
      ],
      [
        'free cast scalar',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          free_cast: 'once',
        },
        new GrantRuleFieldError('fixed', 'free_cast', 'object_or_null'),
      ],
      [
        'free cast uses',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          free_cast: {
            uses: 0,
            recovery: 'long_rest',
            pool_scope: 'per_spell',
          },
        },
        new GrantRuleFreeCastUsesError('fixed'),
      ],
      [
        'free cast recovery',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          free_cast: {
            uses: 1,
            recovery: 'lunchtime',
            pool_scope: 'per_spell',
          },
        },
        new GrantRuleFreeCastEnumError('fixed', 'recovery', 'lunchtime'),
      ],
      [
        'free cast pool',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 1,
          free_cast: {
            uses: 1,
            recovery: 'dawn',
            pool_scope: [],
          },
        },
        new GrantRuleFreeCastEnumError('fixed', 'pool_scope', []),
      ],
      [
        'activation extra field',
        {
          kind: 'choice_from_list',
          rule_key: 'conditional',
          count: 1,
          bucket: 'known',
          list: 'Wizard',
          active_if_config: {
            key: 'option',
            equals: 'one',
            or: 'two',
          },
        },
        new GrantRuleActiveConfigKeysError('conditional'),
      ],
      [
        'activation empty key',
        {
          kind: 'choice_from_list',
          rule_key: 'conditional',
          count: 1,
          bucket: 'known',
          list: 'Wizard',
          active_if_config: { key: ' ', equals: 'one' },
        },
        new GrantRuleActiveConfigValuesError('conditional'),
      ],
    ];

    for (const [label, input, expected] of malformed) {
      const error = thrown(() => persist([input]));
      if (typeof expected === 'string') {
        expect(error, `${label} should fail validation`).toBeInstanceOf(RangeError);
        expect(error).toMatchObject({ message: expected });
      } else {
        expect(error, `${label} should fail validation`).toBeInstanceOf(
          expected.constructor,
        );
        expect(error).toMatchObject(expected);
      }
      expect(
        db.scalar<number>('SELECT count(*) FROM feat_definitions'),
        `${label} must not persist a definition`,
      ).toBe(0);
    }

    const invalidJson = thrown(() => GrantRule.fromJson('{'));
    expect(invalidJson).toBeInstanceOf(GrantRuleJsonParseError);
    expect(invalidJson).toMatchObject({ reason: expect.any(String) });
    for (const json of ['null', '[]']) {
      const error = thrown(() => GrantRule.fromJson(json));
      expect(error).toBeInstanceOf(GrantRuleJsonShapeError);
      expect(error).toMatchObject({});
      expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
    }
    expect(
      () => new FreeCast(0, 'long_rest', 'per_spell'),
    ).toThrowError('Free-cast uses must be positive.');
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
  });
});
