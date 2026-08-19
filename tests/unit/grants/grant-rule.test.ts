import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FreeCast } from '../../../src/grants/free-cast';
import { GrantRule } from '../../../src/grants/grant-rule';
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
  GrantRuleJsonParseError,
  GrantRuleJsonShapeError,
  GrantRuleKindError,
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
