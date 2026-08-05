import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FreeCast } from '../../../src/grants/free-cast';
import { GrantRule } from '../../../src/grants/grant-rule';
import { DatabaseContext } from '../../../src/db/database';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

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
      readonly [string, unknown, string]
    > = [
      [
        'obsolete school choice',
        { kind: 'choice_from_school', rule_key: 'old' },
        "Unknown grant rule kind 'choice_from_school'.",
      ],
      [
        'obsolete nested source',
        { kind: 'nested_source', rule_key: 'old' },
        "Unknown grant rule kind 'nested_source'.",
      ],
      [
        'missing rule key',
        {
          kind: 'fixed_spell',
          bucket: 'automatic',
          spell_version_id: 1,
        },
        "Grant rule field 'rule_key' must be a non-empty string.",
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
        "Grant rule 'list' field 'count' must be a positive integer.",
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
        "Grant rule 'list' has invalid bucket 'sometimes'.",
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
        "Capability rule 'capability' must not define count; capabilities do not mint slots.",
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
        "Grant rule 'capability' must not define a bucket.",
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
        "Grant rule 'fixed' field 'always_prepared' must be boolean.",
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
        "Grant rule 'fixed' field 'active_from_class_level' must be a positive integer.",
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
        "Query rule 'query' requires at least one predicate.",
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
        "Grant rule 'query' field 'tags' must contain only strings.",
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
        "Grant rule 'list' may not constrain a selection collection.",
      ],
      [
        'missing fixed reference',
        {
          kind: 'fixed_spell',
          rule_key: 'fixed',
          bucket: 'automatic',
          spell_version_id: 0,
        },
        "Fixed-spell rule 'fixed' requires spell_version_id or spell_version_key.",
      ],
      [
        'missing source reference',
        {
          kind: 'grant_source',
          rule_key: 'source',
          source_type: 'feat',
          definition_key_config: ' ',
        },
        "Grant-source rule 'source' requires a source definition reference.",
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
        "Grant-source rule 'source' field 'definition_key_config' must be a string or null.",
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
        "Grant rule 'capability' field 'tags' must be a non-empty string list.",
      ],
      [
        'missing spellbook count',
        {
          kind: 'spellbook_acquisition',
          rule_key: 'book',
          bucket: 'spellbook',
          list: 'Wizard',
        },
        "Grant rule 'book' field 'count' must be a positive integer.",
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
        "Grant rule 'fixed' field 'free_cast' must be an object or null.",
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
        "Grant rule 'fixed' free_cast.uses must be a positive integer.",
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
        "Grant rule 'fixed' has invalid free_cast.recovery 'lunchtime'.",
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
        "Grant rule 'fixed' has invalid free_cast.pool_scope 'array'.",
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
        "Grant rule 'conditional' field 'active_if_config' must contain exactly key and equals.",
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
        "Grant rule 'conditional' active_if_config key and equals must be non-empty strings.",
      ],
    ];

    for (const [label, input, message] of malformed) {
      expect(
        () => persist([input]),
        `${label} should fail validation`,
      ).toThrowError(message);
      expect(
        db.scalar<number>('SELECT count(*) FROM feat_definitions'),
        `${label} must not persist a definition`,
      ).toBe(0);
    }

    for (const json of ['{', 'null', '[]']) {
      expect(() => GrantRule.fromJson(json)).toThrow(TypeError);
      expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
    }
    expect(
      () => new FreeCast(0, 'long_rest', 'per_spell'),
    ).toThrowError('Free-cast uses must be positive.');
    expect(db.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(0);
  });
});
