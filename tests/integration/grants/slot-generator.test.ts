import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { slotIdentity } from '../../helpers/row-codecs';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import {
  GrantGenerationSourceMissingError,
  GrantSelectedSkillsConfigError,
  GrantSourceChildConfigError,
  GrantSourceConfigShapeError,
  GrantSourceDefinitionResolutionError,
  GrantSpellVersionReferenceError,
} from '../../../src/grants/grant-rule-slot-generator-errors';
import { GrantRulesJsonContainerError } from '../../../src/grants/source-rule-reader-errors';

type Rule = Record<string, unknown>;

function thrown(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected an error, but the call returned.');
}

describe('grant-rule slot generation', () => {
  let connection: Database;
  let db: DatabaseContext;
  let generator: GrantRuleSlotGenerator;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    generator = new GrantRuleSlotGenerator(db);
  });

  afterEach(() => {
    connection.close();
  });

  function character(name = 'Grant Character'): number {
    return db.exec('INSERT INTO characters (name) VALUES (?)', [name])
      .lastInsertId;
  }

  function spell(
    key: string,
    name: string,
    options: {
      level?: number;
      school?: string;
      lists?: readonly string[];
      tags?: readonly string[];
      active?: boolean;
    } = {},
  ): number {
    registerFixtureContentIdentity(db, {
      kind: 'spell', contentKey: key, name, keyKind: 'bundled-stable',
    });
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`identity:${key}`, name, name.toLowerCase()],
    ).lastInsertId;
    const versionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES (?, ?, ?, '2024', ?, ?, ?)`,
      [
        key,
        identityId,
        name,
        options.level ?? 0,
        options.school ?? 'Conjuration',
        options.active === false ? 0 : 1,
      ],
    ).lastInsertId;
    for (const list of options.lists ?? []) {
      db.exec(
        `INSERT INTO spell_list_memberships
           (spell_version_id, spell_list_key)
         VALUES (?, ?)`,
        [versionId, list],
      );
    }
    for (const tag of options.tags ?? []) {
      db.exec(
        `INSERT INTO spell_version_tags (spell_version_id, tag)
         VALUES (?, ?)`,
        [versionId, tag],
      );
    }
    return versionId;
  }

  function feat(rules: readonly Rule[], repeatable = false): number {
    const contentKey = `feat:${crypto.randomUUID()}`;
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey, name: 'Generator Feat',
      keyKind: 'bundled-stable',
    });
    return db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Generator Feat', '2024', ?, ?)`,
      [
        contentKey,
        repeatable ? 1 : 0,
        JSON.stringify(rules),
      ],
    ).lastInsertId;
  }

  function source(
    characterId: number,
    definitionId: number,
    config: Record<string, unknown> = {},
  ): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'feat', ?, 'Generator Feat', ?)`,
      [
        characterId,
        crypto.randomUUID(),
        definitionId,
        JSON.stringify(config),
      ],
    ).lastInsertId;
  }

  it('rejects a missing source and only accepts object-equivalent source config', () => {
    const missing = thrown(() => generator.generateForSource(999_999));
    expect(missing).toBeInstanceOf(GrantGenerationSourceMissingError);
    expect(missing).toMatchObject({ source_instance_id: 999_999 });

    const definitionId = feat([]);
    const accepted = [null, '', '[]', '{}'];
    for (const [index, config] of accepted.entries()) {
      const sourceId = source(character(`Accepted ${index}`), definitionId);
      db.exec(
        'UPDATE character_source_instances SET config = ? WHERE id = ?',
        [config, sourceId],
      );
      generator.generateForSource(sourceId);
      expect(
        db.scalar<number>(
          'SELECT count(*) FROM spell_selection_slots WHERE source_instance_id = ?',
          [sourceId],
        ),
      ).toBe(0);
    }

    const nonEmptyArrays = ['[1]', '[{}]', '["value"]'];
    for (const [index, config] of nonEmptyArrays.entries()) {
      const sourceId = source(character(`Array ${index}`), definitionId);
      db.exec(
        'UPDATE character_source_instances SET config = ? WHERE id = ?',
        [config, sourceId],
      );
      const error = thrown(() => generator.generateForSource(sourceId));
      expect(error).toBeInstanceOf(GrantSourceConfigShapeError);
      expect(error).toMatchObject({ source_instance_id: sourceId });
    }

    const nullJsonSource = source(character('Null JSON'), definitionId);
    db.exec(
      'UPDATE character_source_instances SET config = ? WHERE id = ?',
      ['null', nullJsonSource],
    );
    expect(thrown(() => generator.generateForSource(nullJsonSource)))
      .toBeInstanceOf(GrantRulesJsonContainerError);
  });

  it('maps only safe configured class levels 1..20 into acquisition rows', () => {
    const definitionId = feat([{
      kind: 'spellbook_acquisition',
      rule_key: 'level-fallback',
      count: 1,
      bucket: 'spellbook',
      list: 'Wizard',
    }]);
    const levels: readonly unknown[] = [0, 1, 20, 21, 1.5, '1', null];
    const expected = [null, 1, 20, null, null, null, null];
    const sourceIds: number[] = [];
    for (const [index, classLevel] of levels.entries()) {
      const sourceId = source(
        character(`Level ${index}`),
        definitionId,
        { class_level: classLevel },
      );
      sourceIds.push(sourceId);
      generator.generateForSource(sourceId);
    }

    expect(sourceIds.map((sourceId) => db.oneRaw(
      `SELECT rule_key, ordinal, acquired_at_class_level,
              spell_level_min, spell_level_max, allowed_spell_lists,
              state, selection_eligibility
       FROM wizard_spellbook_entries WHERE source_instance_id = ?`,
      [sourceId],
    ))).toEqual(expected.map((acquiredAtClassLevel) => ({
      rule_key: 'level-fallback',
      ordinal: 1,
      acquired_at_class_level: acquiredAtClassLevel,
      spell_level_min: 0,
      spell_level_max: 9,
      allowed_spell_lists: '["Wizard"]',
      state: 'active',
      selection_eligibility: 'unselected',
    })));
  });

  it('validates tool-alternative selected skills and persists exact ordinals', () => {
    const definitionId = feat([{
      kind: 'skill_proficiency',
      rule_key: 'flexible-skills',
      count: 2,
      allows_tool_instead: true,
    }]);
    for (const [index, selectedSkills] of [
      'arcana',
      ['arcana', 'chronomancy'],
      ['arcana', 3],
    ].entries()) {
      const sourceId = source(
        character(`Invalid skills ${index}`),
        definitionId,
        { selected_skills: selectedSkills },
      );
      const error = thrown(() => generator.generateForSource(sourceId));
      expect(error).toBeInstanceOf(GrantSelectedSkillsConfigError);
      expect(error).toMatchObject({ rule_key: 'flexible-skills' });
      expect(db.scalar<number>(
        'SELECT count(*) FROM character_skill_grants WHERE source_instance_id = ?',
        [sourceId],
      )).toBe(0);
    }

    const validSource = source(character('Valid skills'), definitionId, {
      selected_skills: ['arcana', null],
    });
    generator.generateForSource(validSource);
    expect(db.allRaw(
      `SELECT source_instance_id, grant_key, ordinal, skill, state
       FROM character_skill_grants WHERE source_instance_id = ?
       ORDER BY ordinal`,
      [validSource],
    )).toEqual([
      {
        source_instance_id: validSource,
        grant_key: 'flexible-skills',
        ordinal: 1,
        skill: 'arcana',
        state: 'active',
      },
    ]);

    const inertDefinition = feat([{
      kind: 'skill_proficiency',
      rule_key: 'inert-skills',
      count: 2,
      allows_tool_instead: false,
    }]);
    const inertSource = source(character('Inert skills'), inertDefinition, {
      selected_skills: ['arcana', 'history'],
    });
    generator.generateForSource(inertSource);
    expect(db.scalar<number>(
      'SELECT count(*) FROM character_skill_grants WHERE source_instance_id = ?',
      [inertSource],
    )).toBe(0);
  });

  it('persists fixed, list, and query slots while capabilities remain active non-slot rules', () => {
    const fixedId = spell('2024:fixed-gift', 'Fixed Gift');
    const definitionId = feat([
      {
        kind: 'fixed_spell',
        rule_key: 'fixed-gift',
        bucket: 'automatic',
        spell_version_id: fixedId,
        always_prepared: true,
        with_slots: false,
      },
      {
        kind: 'choice_from_list',
        rule_key: 'list-cantrips',
        count: 2,
        bucket: 'cantrip_known',
        list: 'Wizard',
        level_min: 0,
        level_max: 0,
        with_slots: false,
      },
      {
        kind: 'choice_from_query',
        rule_key: 'query-ritual',
        count: 1,
        bucket: 'known',
        schools: ['Divination'],
        tags: ['ritual'],
        level_min: 1,
        level_max: 3,
      },
      {
        kind: 'capability',
        rule_key: 'ritual-adept',
        capability_key: 'wizard-ritual-adept',
        collection: 'wizard_spellbook',
        tags: ['ritual'],
        access_mode: 'ritual_only',
      },
    ]);
    const sourceId = source(character(), definitionId);
    const uuid = db.scalar<string>(
      'SELECT instance_uuid FROM character_source_instances WHERE id = ?',
      [sourceId],
    );

    generator.generateForSource(sourceId);

    expect(
      db.allRaw(
        `SELECT slot_key, rule_key, ordinal, bucket, eligibility_kind,
                fixed_spell_version_id, current_spell_version_id,
                spell_level_min, spell_level_max, allowed_spell_lists,
                allowed_schools, allowed_tags, always_prepared, with_slots,
                required, is_locked, state, selection_eligibility
         FROM spell_selection_slots
         ORDER BY id`,
      ),
    ).toEqual([
      {
        slot_key: `${uuid}:fixed-gift:1`,
        rule_key: 'fixed-gift',
        ordinal: 1,
        bucket: 'automatic',
        eligibility_kind: 'fixed_spell',
        fixed_spell_version_id: fixedId,
        current_spell_version_id: null,
        spell_level_min: 0,
        spell_level_max: 9,
        allowed_spell_lists: null,
        allowed_schools: null,
        allowed_tags: null,
        always_prepared: 1,
        with_slots: 0,
        required: 1,
        is_locked: 1,
        state: 'active',
        selection_eligibility: 'valid',
      },
      ...[1, 2].map((ordinal) => ({
        slot_key: `${uuid}:list-cantrips:${ordinal}`,
        rule_key: 'list-cantrips',
        ordinal,
        bucket: 'cantrip_known',
        eligibility_kind: 'choice_from_list',
        fixed_spell_version_id: null,
        current_spell_version_id: null,
        spell_level_min: 0,
        spell_level_max: 0,
        allowed_spell_lists: '["Wizard"]',
        allowed_schools: null,
        allowed_tags: null,
        always_prepared: 0,
        with_slots: 0,
        required: 1,
        is_locked: 0,
        state: 'active',
        selection_eligibility: 'unselected',
      })),
      {
        slot_key: `${uuid}:query-ritual:1`,
        rule_key: 'query-ritual',
        ordinal: 1,
        bucket: 'known',
        eligibility_kind: 'choice_from_query',
        fixed_spell_version_id: null,
        current_spell_version_id: null,
        spell_level_min: 1,
        spell_level_max: 3,
        allowed_spell_lists: null,
        allowed_schools: '["Divination"]',
        allowed_tags: '["ritual"]',
        always_prepared: 0,
        with_slots: 1,
        required: 1,
        is_locked: 0,
        state: 'active',
        selection_eligibility: 'unselected',
      },
    ]);
    expect(
      generator.activeRulesForSource(sourceId).map((rule) => rule.kind),
    ).toEqual([
      'fixed_spell',
      'choice_from_list',
      'choice_from_query',
      'capability',
    ]);
    expect(
      db.scalar(
        `SELECT count(*) FROM spell_selection_slots
         WHERE eligibility_kind = 'capability'`,
      ),
    ).toBe(0);
    const persisted = db.allRaw(
      'SELECT * FROM spell_selection_slots ORDER BY id',
    );
    generator.generateForSource(sourceId);
    expect(
      db.allRaw('SELECT * FROM spell_selection_slots ORDER BY id'),
    ).toEqual(persisted);
  });

  it('resolves fixed spells by ID or key and pins lock plus limit consumption', () => {
    const byId = spell('2024:fixed-by-id', 'Fixed By ID');
    const byKey = spell('2024:fixed-by-key', 'Fixed By Key');
    const definitionId = feat([
      {
        kind: 'fixed_spell',
        rule_key: 'by-id',
        bucket: 'automatic',
        spell_version_id: byId,
        counts_against_limit: false,
      },
      {
        kind: 'fixed_spell',
        rule_key: 'by-key',
        bucket: 'cantrip_known',
        spell_version_key: '2024:fixed-by-key',
      },
    ]);
    const sourceId = source(character(), definitionId);

    generator.generateForSource(sourceId);

    expect(db.allRaw(
      `SELECT rule_key, fixed_spell_version_id, current_spell_version_id,
              counts_against_limit, required, is_locked,
              selection_eligibility, selection_invalid_reason
       FROM spell_selection_slots ORDER BY rule_key`,
    )).toEqual([
      {
        rule_key: 'by-id',
        fixed_spell_version_id: byId,
        current_spell_version_id: null,
        counts_against_limit: 0,
        required: 1,
        is_locked: 1,
        selection_eligibility: 'valid',
        selection_invalid_reason: null,
      },
      {
        rule_key: 'by-key',
        fixed_spell_version_id: byKey,
        current_spell_version_id: null,
        counts_against_limit: 1,
        required: 1,
        is_locked: 1,
        selection_eligibility: 'valid',
        selection_invalid_reason: null,
      },
    ]);
  });

  it('rejects each missing or inactive fixed-spell reference shape', () => {
    const inactiveKeyId = spell(
      '2024:inactive-by-key',
      'Inactive By Key',
      { active: false },
    );
    const cases: ReadonlyArray<readonly [
      string,
      Rule,
      'missing' | 'inactive',
    ]> = [
      ['missing-id', {
        kind: 'fixed_spell', rule_key: 'missing-id', bucket: 'automatic',
        spell_version_id: inactiveKeyId + 100_000,
      }, 'missing'],
      ['missing-key', {
        kind: 'fixed_spell', rule_key: 'missing-key', bucket: 'automatic',
        spell_version_key: '2024:not-in-catalog',
      }, 'missing'],
      ['inactive-key', {
        kind: 'fixed_spell', rule_key: 'inactive-key', bucket: 'automatic',
        spell_version_key: '2024:inactive-by-key',
      }, 'inactive'],
    ];
    for (const [ruleKey, rule, issue] of cases) {
      const sourceId = source(character(ruleKey), feat([rule]));
      const error = thrown(() => generator.generateForSource(sourceId));
      expect(error).toBeInstanceOf(GrantSpellVersionReferenceError);
      expect(error).toMatchObject({ rule_key: ruleKey, issue });
      expect(db.scalar<number>(
        'SELECT count(*) FROM spell_selection_slots WHERE source_instance_id = ?',
        [sourceId],
      )).toBe(0);
    }
  });

  it('keeps row identities and selections while config changes persist invalid and valid eligibility', () => {
    const selectedId = spell('2024:stable-choice', 'Stable Choice', {
      lists: ['Wizard'],
    });
    const definitionId = feat([
      {
        kind: 'choice_from_list',
        rule_key: 'stable-list',
        count: 2,
        bucket: 'cantrip_known',
        list: '$config.chosen_list',
        level_min: 0,
        level_max: 0,
        with_slots: false,
      },
    ]);
    const sourceId = source(character(), definitionId, {
      chosen_list: 'Wizard',
    });
    generator.generateForSource(sourceId);
    const before = db.all(
      `SELECT id, slot_key FROM spell_selection_slots ORDER BY ordinal`,
      undefined,
      slotIdentity,
    );
    new SpellSelectionService(db).select(before[0]!.id, selectedId);
    db.exec(
      `UPDATE spell_selection_slots
       SET state = 'kept_override', override_note = 'Keep this'
       WHERE id = ?`,
      [before[1]!.id],
    );

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [JSON.stringify({ chosen_list: 'Cleric' }), sourceId],
    );
    generator.generateForSource(sourceId);

    expect(
      db.allRaw(
        `SELECT id, slot_key, current_spell_version_id, allowed_spell_lists,
                state, selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots ORDER BY ordinal`,
      ),
    ).toEqual([
      {
        ...before[0],
        current_spell_version_id: selectedId,
        allowed_spell_lists: '["Cleric"]',
        state: 'active',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is not on an allowed spell list.',
      },
      {
        ...before[1],
        current_spell_version_id: null,
        allowed_spell_lists: '["Cleric"]',
        state: 'kept_override',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [JSON.stringify({ chosen_list: 'Wizard' }), sourceId],
    );
    generator.generateForSource(sourceId);
    expect(
      db.oneRaw(
        `SELECT id, slot_key, current_spell_version_id, state,
                selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE ordinal = 1`,
      ),
    ).toEqual({
      ...before[0],
      current_spell_version_id: selectedId,
      state: 'active',
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
  });

  it('activates exact config and class-level gates then orphans the retained selection when either gate closes', () => {
    const selectedId = spell('2024:gated-choice', 'Gated Choice', {
      lists: ['Wizard'],
    });
    const definitionId = feat([
      {
        kind: 'choice_from_list',
        rule_key: 'gated-choice',
        count: 1,
        bucket: 'known',
        list: 'Wizard',
        level_min: 0,
        level_max: 0,
        active_from_class_level: 3,
        active_if_config: {
          key: 'order.option',
          equals: 'Scholar',
        },
      },
    ]);
    const sourceId = source(character(), definitionId, {
      class_level: 2,
      order: { option: 'Scholar' },
    });

    generator.generateForSource(sourceId);
    expect(generator.activeRulesForSource(sourceId)).toEqual([]);
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({
          class_level: 3,
          order: { option: 'Protector' },
        }),
        sourceId,
      ],
    );
    generator.generateForSource(sourceId);
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({
          class_level: 3,
          order: { option: 'Scholar' },
        }),
        sourceId,
      ],
    );
    generator.generateForSource(sourceId);
    const slotId = Number(
      db.scalar('SELECT id FROM spell_selection_slots'),
    );
    new SpellSelectionService(db).select(slotId, selectedId);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({
          class_level: 3,
          order: { option: 'Protector' },
        }),
        sourceId,
      ],
    );
    generator.generateForSource(sourceId);
    expect(
      db.oneRaw(
        `SELECT id, current_spell_version_id, state, orphan_reason_code,
                prior_config, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots`,
      ),
    ).toEqual({
      id: slotId,
      current_spell_version_id: selectedId,
      state: 'orphaned',
      orphan_reason_code: 'rule_no_longer_active',
      prior_config: JSON.stringify({
        class_level: 3,
        order: { option: 'Protector' },
      }),
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its grant rule is no longer active.',
    });
  });

  it('orphans unselected and fixed slots with exact reference-dependent state', () => {
    const fixedId = spell('2024:gated-fixed', 'Gated Fixed');
    const definitionId = feat([
      {
        kind: 'fixed_spell',
        rule_key: 'gated-fixed',
        bucket: 'automatic',
        spell_version_id: fixedId,
        active_if_config: { key: 'enabled', equals: 'yes' },
      },
      {
        kind: 'choice_from_list',
        rule_key: 'gated-unselected',
        count: 1,
        bucket: 'known',
        list: 'Wizard',
        active_if_config: { key: 'enabled', equals: 'yes' },
      },
    ]);
    const sourceId = source(character(), definitionId, { enabled: 'yes' });
    generator.generateForSource(sourceId);
    const before = db.allRaw(
      `SELECT id, rule_key, fixed_spell_version_id,
              current_spell_version_id
       FROM spell_selection_slots WHERE source_instance_id = ?
       ORDER BY rule_key`,
      [sourceId],
    );

    db.exec(
      'UPDATE character_source_instances SET config = ? WHERE id = ?',
      [JSON.stringify({ enabled: 'no' }), sourceId],
    );
    generator.generateForSource(sourceId);

    expect(db.allRaw(
      `SELECT id, rule_key, fixed_spell_version_id,
              current_spell_version_id, state, orphan_reason_code,
              prior_config, selection_eligibility, selection_invalid_reason
       FROM spell_selection_slots WHERE source_instance_id = ?
       ORDER BY rule_key`,
      [sourceId],
    )).toEqual([
      {
        ...before[0],
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
        prior_config: JSON.stringify({ enabled: 'no' }),
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selection preserved because its grant rule is no longer active.',
      },
      {
        ...before[1],
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
        prior_config: JSON.stringify({ enabled: 'no' }),
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);
  });

  it('merges class progressions by rule key and reactivates the identical orphan with its selection', () => {
    const characterId = character('Progression Character');
    const selectedId = spell('2024:level-four', 'Level Four', {
      level: 1,
      lists: ['Wizard'],
    });
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'class:progression-wizard',
      name: 'Progression Wizard', keyKind: 'bundled-stable',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES ('class:progression-wizard', 'Progression Wizard', '2024', 'full')`,
    ).lastInsertId;
    const levelOneRules = [
      {
        kind: 'choice_from_list',
        rule_key: 'stable-prepared',
        count: 1,
        bucket: 'prepared',
        list: 'Wizard',
        level_min: 1,
        level_max: 1,
      },
    ];
    const levelFourRules = [
      {
        ...levelOneRules[0],
        level_max: 2,
      },
      {
        kind: 'choice_from_list',
        rule_key: 'level-four-only',
        count: 1,
        bucket: 'known',
        list: 'Wizard',
        level_min: 1,
        level_max: 1,
      },
    ];
    for (const [level, rules] of [
      [1, levelOneRules],
      [4, levelFourRules],
    ] as const) {
      db.exec(
        `INSERT INTO class_progressions
           (class_definition_id, class_level, grant_rules)
         VALUES (?, ?, ?)`,
        [classId, level, JSON.stringify(rules)],
      );
    }
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level)
       VALUES (?, ?, 4)`,
      [characterId, classId],
    );
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'class', ?, 'Progression Wizard 4', ?)`,
      [
        characterId,
        crypto.randomUUID(),
        classId,
        JSON.stringify({ level: 4 }),
      ],
    ).lastInsertId;
    generator.generateForSource(sourceId);
    const stable = db.oneRaw(
      `SELECT id, spell_level_max FROM spell_selection_slots
       WHERE rule_key = 'stable-prepared'`,
    )!;
    const levelFour = db.one(
      `SELECT id, slot_key FROM spell_selection_slots
       WHERE rule_key = 'level-four-only'`,
      undefined,
      slotIdentity,
    )!;
    new SpellSelectionService(db).select(levelFour.id, selectedId);
    expect(stable.spell_level_max).toBe(2);

    db.exec(
      `UPDATE character_class_levels SET level = 1
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId],
    );
    generator.generateForSource(sourceId);
    const orphan = db.oneRaw(
      `SELECT id, slot_key, current_spell_version_id, state,
              orphan_reason_code, orphaned_at, prior_config,
              selection_eligibility, selection_invalid_reason
       FROM spell_selection_slots WHERE id = ?`,
      [levelFour.id],
    );
    expect(orphan).toEqual({
      id: levelFour.id,
      slot_key: levelFour.slot_key,
      current_spell_version_id: selectedId,
      state: 'orphaned',
      orphan_reason_code: 'rule_no_longer_active',
      orphaned_at: expect.any(String),
      prior_config: JSON.stringify({ level: 4 }),
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selection preserved because its grant rule is no longer active.',
    });
    expect(
      db.scalar(
        `SELECT spell_level_max FROM spell_selection_slots
         WHERE id = ?`,
        [Number(stable.id)],
      ),
    ).toBe(1);

    db.exec(
      `UPDATE character_class_levels SET level = 4
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId],
    );
    generator.generateForSource(sourceId);
    expect(
      db.oneRaw(
        `SELECT id, slot_key, current_spell_version_id, state,
                orphan_reason_code, orphaned_at, prior_config,
                selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [levelFour.id],
      ),
    ).toEqual({
      id: levelFour.id,
      slot_key: levelFour.slot_key,
      current_spell_version_id: selectedId,
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
      prior_config: JSON.stringify({ level: 4 }),
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
  });

  it('compares distinct scalar, array, and nested-object config exactly', () => {
    const definitionId = feat([{
      kind: 'fighting_style',
      rule_key: 'distinct-style',
      style_key: 'archery',
      distinct_config_by: 'choice',
    }], true);
    const equalPairs: ReadonlyArray<readonly [unknown, string]> = [
      ['Wizard', 'Wizard'],
      [3, '3'],
      [true, 'true'],
      [['Wizard', { level: 3 }], '["Wizard",{"level":3}]'],
      [{ list: 'Wizard', nested: { level: 3 } },
        '{"list":"Wizard","nested":{"level":3}}'],
    ];
    for (const [choice, shown] of equalPairs) {
      const characterId = character(`Equal ${shown}`);
      source(characterId, definitionId, { choice });
      const duplicateId = source(characterId, definitionId, {
        choice: structuredClone(choice),
      });
      const error = thrown(() => generator.generateForSource(duplicateId));
      expect(error).toBeInstanceOf(TypeError);
      expect(error).toMatchObject({
        message:
          `Generator Feat already uses choice '${shown}' for this character.`,
      });
    }

    const unequalPairs: ReadonlyArray<readonly [unknown, unknown]> = [
      [['Wizard'], ['Wizard', 'Cleric']],
      [['Wizard', 3], ['Wizard', 4]],
      [{ list: 'Wizard' }, { list: 'Wizard', level: 3 }],
      [{ list: 'Wizard' }, { school: 'Wizard' }],
      [{ nested: { level: 3 } }, { nested: { level: 4 } }],
      [{ list: 'Wizard' }, ['Wizard']],
    ];
    for (const [left, right] of unequalPairs) {
      const characterId = character('Unequal config');
      source(characterId, definitionId, { choice: left });
      const distinctId = source(characterId, definitionId, { choice: right });
      generator.generateForSource(distinctId);
      expect(generator.activeRulesForSource(distinctId).map(
        (rule) => rule.ruleKey,
      )).toEqual(['distinct-style']);
    }

    const missingId = source(character(), definitionId, {});
    const missingError = thrown(() => generator.generateForSource(missingId));
    expect(missingError).toMatchObject({
      name: 'GrantDistinctConfigMissingError',
      rule_key: 'distinct-style',
      config_path: 'choice',
    });
  });

  it('resolves nested sources by ID, key, and delegated config with stable markers', () => {
    const childDefinitionId = feat([]);
    const childKey = db.scalar<string>(
      'SELECT content_key FROM feat_definitions WHERE id = ?',
      [childDefinitionId],
    )!;
    const parentDefinitionId = feat([
      {
        kind: 'grant_source',
        rule_key: 'child-by-id',
        source_type: 'feat',
        source_definition_id: childDefinitionId,
        child_config: { marker: 'id' },
      },
      {
        kind: 'grant_source',
        rule_key: 'child-by-key',
        source_type: 'feat',
        source_definition_key: childKey,
        child_config: { marker: 'key' },
      },
      {
        kind: 'grant_source',
        rule_key: 'child-delegated',
        source_type: 'feat',
        definition_key_config: 'chosen.key',
        child_config_config: 'chosen.config',
        allows_pending_choice: true,
      },
    ]);
    const parentSourceId = source(character(), parentDefinitionId, {
      chosen: {
        key: childKey,
        config: { chosen_list: 'Wizard', exact: 3 },
      },
    });

    generator.generateForSource(parentSourceId);

    const before = db.allRaw(
      `SELECT id, parent_source_instance_id, source_type,
              source_definition_id, display_name, config, state, notes
       FROM character_source_instances
       WHERE parent_source_instance_id = ? ORDER BY notes`,
      [parentSourceId],
    );
    const expectedBefore = [
      {
        id: expect.any(Number),
        parent_source_instance_id: parentSourceId,
        source_type: 'feat',
        source_definition_id: childDefinitionId,
        display_name: 'Generator Feat: Wizard',
        config: JSON.stringify({ chosen_list: 'Wizard', exact: 3 }),
        state: 'active',
        notes: 'grant_rule:child-delegated:1',
      },
      {
        id: expect.any(Number),
        parent_source_instance_id: parentSourceId,
        source_type: 'feat',
        source_definition_id: childDefinitionId,
        display_name: 'Generator Feat',
        config: JSON.stringify({ marker: 'id' }),
        state: 'active',
        notes: 'grant_rule:child-by-id:1',
      },
      {
        id: expect.any(Number),
        parent_source_instance_id: parentSourceId,
        source_type: 'feat',
        source_definition_id: childDefinitionId,
        display_name: 'Generator Feat',
        config: JSON.stringify({ marker: 'key' }),
        state: 'active',
        notes: 'grant_rule:child-by-key:1',
      },
    ].sort((left, right) => left.notes.localeCompare(right.notes));
    expect(before).toEqual(expectedBefore);

    db.exec(
      'UPDATE character_source_instances SET config = ? WHERE id = ?',
      [JSON.stringify({ chosen: { config: {} } }), parentSourceId],
    );
    generator.generateForSource(parentSourceId);
    expect(db.allRaw(
      `SELECT id, state, notes FROM character_source_instances
       WHERE parent_source_instance_id = ? ORDER BY notes`,
      [parentSourceId],
    )).toEqual(before.map((row) => ({
      id: row.id,
      state: row.notes === 'grant_rule:child-delegated:1'
        ? 'tombstoned'
        : 'active',
      notes: row.notes,
    })));

    db.exec(
      'UPDATE character_source_instances SET config = ? WHERE id = ?',
      [JSON.stringify({
        chosen: {
          key: childKey,
          config: { chosen_list: 'Cleric', exact: 4 },
        },
      }), parentSourceId],
    );
    generator.generateForSource(parentSourceId);
    expect(db.allRaw(
      `SELECT id, display_name, config, state, notes
       FROM character_source_instances
       WHERE parent_source_instance_id = ? ORDER BY notes`,
      [parentSourceId],
    )).toEqual(before.map((row) => ({
      id: row.id,
      display_name: row.notes === 'grant_rule:child-delegated:1'
        ? 'Generator Feat: Cleric'
        : row.display_name,
      config: row.notes === 'grant_rule:child-delegated:1'
        ? JSON.stringify({ chosen_list: 'Cleric', exact: 4 })
        : row.config,
      state: 'active',
      notes: row.notes,
    })));
  });

  it('keeps unresolved and invalid nested-source config failures structured', () => {
    const missingDefinition = feat([{
      kind: 'grant_source',
      rule_key: 'missing-child',
      source_type: 'feat',
      source_definition_key: 'feat:not-present',
    }]);
    const missingSource = source(character(), missingDefinition);
    const missingError = thrown(() => generator.generateForSource(missingSource));
    expect(missingError).toBeInstanceOf(GrantSourceDefinitionResolutionError);
    expect(missingError).toMatchObject({ rule_key: 'missing-child' });

    const childDefinitionId = feat([]);
    const invalidConfigDefinition = feat([{
      kind: 'grant_source',
      rule_key: 'invalid-child-config',
      source_type: 'feat',
      source_definition_id: childDefinitionId,
      child_config: 'scalar',
    }]);
    const invalidConfigSource = source(character(), invalidConfigDefinition);
    const configError = thrown(
      () => generator.generateForSource(invalidConfigSource),
    );
    expect(configError).toBeInstanceOf(GrantSourceChildConfigError);
    expect(configError).toMatchObject({ rule_key: 'invalid-child-config' });
    expect(db.scalar<number>(
      `SELECT count(*) FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [invalidConfigSource],
    )).toBe(0);
  });

  it('combines static subclass rules with effective progression rules', () => {
    const characterId = character('Subclass Character');
    const fixedId = spell('2024:subclass-fixed', 'Subclass Fixed');
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'class:subclass-owner',
      name: 'Subclass Owner', keyKind: 'bundled-stable',
    });
    registerFixtureContentIdentity(db, {
      kind: 'subclass', contentKey: 'subclass:combined', name: 'Combined',
      keyKind: 'bundled-stable',
    });
    const classId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES ('class:subclass-owner', 'Subclass Owner', '2024', 'none')`,
    ).lastInsertId;
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition, grant_rules
       ) VALUES ('subclass:combined', ?, 'Combined', '2024', ?)`,
      [
        classId,
        JSON.stringify([
          {
            kind: 'fixed_spell',
            rule_key: 'static-grant',
            bucket: 'automatic',
            spell_version_id: fixedId,
          },
        ]),
      ],
    ).lastInsertId;
    db.exec(
      `INSERT INTO subclass_progressions (
         subclass_definition_id, class_level, max_spell_level, grant_rules
       ) VALUES (?, 3, 1, ?)`,
      [
        subclassId,
        JSON.stringify([
          {
            kind: 'choice_from_list',
            rule_key: 'progression-grant',
            count: 1,
            bucket: 'cantrip_known',
            list: 'Wizard',
            level_min: 0,
            level_max: 0,
          },
        ]),
      ],
    );
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id, level
       ) VALUES (?, ?, ?, 3)`,
      [characterId, classId, subclassId],
    );
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'subclass', ?, 'Combined', '{}')`,
      [characterId, crypto.randomUUID(), subclassId],
    ).lastInsertId;

    generator.generateForSource(sourceId);

    expect(
      db.allRaw(
        `SELECT rule_key, eligibility_kind, fixed_spell_version_id
         FROM spell_selection_slots
         WHERE source_instance_id = ?
         ORDER BY rule_key`,
        [sourceId],
      ),
    ).toEqual([
      {
        rule_key: 'progression-grant',
        eligibility_kind: 'choice_from_list',
        fixed_spell_version_id: null,
      },
      {
        rule_key: 'static-grant',
        eligibility_kind: 'fixed_spell',
        fixed_spell_version_id: fixedId,
      },
    ]);
  });

  it('reconciles selected and unselected spellbook acquisitions by exact address', () => {
    const selectedId = spell('2024:book-selected', 'Book Selected', {
      level: 1,
      lists: ['Wizard'],
    });
    const rules = [{
      kind: 'spellbook_acquisition',
      rule_key: 'book-growth',
      count: 2,
      bucket: 'spellbook',
      list: 'Wizard',
      level_min: 1,
      level_max: 2,
      initial_count: 1,
      count_per_level: 1,
    }];
    const definitionId = feat(rules);
    const sourceId = source(character(), definitionId, { class_level: 4 });
    generator.generateForSource(sourceId);
    const before = db.allRaw(
      `SELECT id, rule_key, ordinal, acquired_at_class_level,
              spell_version_id, state, selection_eligibility,
              selection_invalid_reason
       FROM wizard_spellbook_entries WHERE source_instance_id = ?
       ORDER BY ordinal`,
      [sourceId],
    );
    expect(before).toEqual([
      {
        id: expect.any(Number),
        rule_key: 'book-growth',
        ordinal: 1,
        acquired_at_class_level: 1,
        spell_version_id: null,
        state: 'active',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
      {
        id: expect.any(Number),
        rule_key: 'book-growth',
        ordinal: 2,
        acquired_at_class_level: 2,
        spell_version_id: null,
        state: 'active',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);
    db.exec(
      'UPDATE wizard_spellbook_entries SET spell_version_id = ? WHERE id = ?',
      [selectedId, before[0]!.id],
    );
    db.exec('UPDATE feat_definitions SET grant_rules = ? WHERE id = ?', [
      '[]', definitionId,
    ]);

    generator.generateForSource(sourceId);

    expect(db.allRaw(
      `SELECT id, rule_key, ordinal, spell_version_id, state,
              orphan_reason_code, orphaned_at, selection_eligibility,
              selection_invalid_reason
       FROM wizard_spellbook_entries WHERE source_instance_id = ?
       ORDER BY ordinal`,
      [sourceId],
    )).toEqual([
      {
        id: before[0]!.id,
        rule_key: 'book-growth',
        ordinal: 1,
        spell_version_id: selectedId,
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
        orphaned_at: expect.any(String),
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selection preserved because its grant rule is no longer active.',
      },
      {
        id: before[1]!.id,
        rule_key: 'book-growth',
        ordinal: 2,
        spell_version_id: null,
        state: 'orphaned',
        orphan_reason_code: 'rule_no_longer_active',
        orphaned_at: expect.any(String),
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);

    db.exec('UPDATE feat_definitions SET grant_rules = ? WHERE id = ?', [
      JSON.stringify(rules), definitionId,
    ]);
    generator.generateForSource(sourceId);
    expect(db.allRaw(
      `SELECT id, ordinal, spell_version_id, state, orphan_reason_code,
              orphaned_at, selection_eligibility, selection_invalid_reason
       FROM wizard_spellbook_entries WHERE source_instance_id = ?
       ORDER BY ordinal`,
      [sourceId],
    )).toEqual([
      {
        id: before[0]!.id,
        ordinal: 1,
        spell_version_id: selectedId,
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
        selection_eligibility: 'valid',
        selection_invalid_reason: null,
      },
      {
        id: before[1]!.id,
        ordinal: 2,
        spell_version_id: null,
        state: 'active',
        orphan_reason_code: null,
        orphaned_at: null,
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);
  });

  it('tombstones a source tree while preserving selected and unselected history', () => {
    const fixedId = spell('2024:tombstone-fixed', 'Tombstone Fixed');
    const selectedId = spell('2024:tombstone-selected', 'Tombstone Selected', {
      lists: ['Wizard'],
    });
    const definitionId = feat([
      {
        kind: 'fixed_spell',
        rule_key: 'tombstone-fixed',
        bucket: 'automatic',
        spell_version_id: fixedId,
      },
      {
        kind: 'choice_from_list',
        rule_key: 'tombstone-choices',
        count: 2,
        bucket: 'known',
        list: 'Wizard',
      },
      {
        kind: 'spellbook_acquisition',
        rule_key: 'tombstone-book',
        count: 2,
        bucket: 'spellbook',
        list: 'Wizard',
      },
    ]);
    const sourceId = source(character(), definitionId, { class_level: 3 });
    generator.generateForSource(sourceId);
    const slots = db.allRaw(
      `SELECT id, rule_key, ordinal, fixed_spell_version_id
       FROM spell_selection_slots WHERE source_instance_id = ?
       ORDER BY rule_key, ordinal`,
      [sourceId],
    );
    const choiceOne = slots.find(
      (slot) => slot.rule_key === 'tombstone-choices' && slot.ordinal === 1,
    )!;
    new SpellSelectionService(db).select(Number(choiceOne.id), selectedId);
    const acquisitions = db.allRaw(
      `SELECT id, ordinal FROM wizard_spellbook_entries
       WHERE source_instance_id = ? ORDER BY ordinal`,
      [sourceId],
    );
    db.exec(
      'UPDATE wizard_spellbook_entries SET spell_version_id = ? WHERE id = ?',
      [selectedId, acquisitions[0]!.id],
    );
    const sentinel = '2001-02-03T04:05:06.000Z';
    db.exec(
      `UPDATE character_source_instances
       SET state = 'tombstoned', updated_at = ? WHERE id = ?`,
      [sentinel, sourceId],
    );

    generator.generateForSource(sourceId);

    expect(db.oneRaw(
      'SELECT state, updated_at FROM character_source_instances WHERE id = ?',
      [sourceId],
    )).toEqual({ state: 'tombstoned', updated_at: sentinel });
    expect(db.allRaw(
      `SELECT rule_key, ordinal, fixed_spell_version_id,
              current_spell_version_id, state, orphan_reason_code,
              prior_config, selection_eligibility, selection_invalid_reason
       FROM spell_selection_slots WHERE source_instance_id = ?
       ORDER BY rule_key, ordinal`,
      [sourceId],
    )).toEqual([
      {
        rule_key: 'tombstone-choices',
        ordinal: 1,
        fixed_spell_version_id: null,
        current_spell_version_id: selectedId,
        state: 'orphaned',
        orphan_reason_code: 'parent_rule_removed',
        prior_config: JSON.stringify({ class_level: 3 }),
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selection preserved because its source is no longer active.',
      },
      {
        rule_key: 'tombstone-choices',
        ordinal: 2,
        fixed_spell_version_id: null,
        current_spell_version_id: null,
        state: 'orphaned',
        orphan_reason_code: 'parent_rule_removed',
        prior_config: JSON.stringify({ class_level: 3 }),
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
      {
        rule_key: 'tombstone-fixed',
        ordinal: 1,
        fixed_spell_version_id: fixedId,
        current_spell_version_id: null,
        state: 'orphaned',
        orphan_reason_code: 'parent_rule_removed',
        prior_config: JSON.stringify({ class_level: 3 }),
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selection preserved because its source is no longer active.',
      },
    ]);
    expect(db.allRaw(
      `SELECT ordinal, spell_version_id, state, orphan_reason_code,
              selection_eligibility, selection_invalid_reason
       FROM wizard_spellbook_entries WHERE source_instance_id = ?
       ORDER BY ordinal`,
      [sourceId],
    )).toEqual([
      {
        ordinal: 1,
        spell_version_id: selectedId,
        state: 'orphaned',
        orphan_reason_code: 'parent_rule_removed',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selection preserved because its source is no longer active.',
      },
      {
        ordinal: 2,
        spell_version_id: null,
        state: 'orphaned',
        orphan_reason_code: 'parent_rule_removed',
        selection_eligibility: 'unselected',
        selection_invalid_reason: null,
      },
    ]);
  });

  it('rejects a new inactive fixed grant but preserves its stable row and persisted invalid eligibility after catalog removal', () => {
    const fixedId = spell('2024:inactive-fixed', 'Inactive Fixed', {
      active: false,
    });
    const definitionId = feat([
      {
        kind: 'fixed_spell',
        rule_key: 'inactive-fixed',
        bucket: 'automatic',
        spell_version_id: fixedId,
      },
    ]);
    const sourceId = source(character(), definitionId);

    const error = thrown(() => generator.generateForSource(sourceId));
    expect(error).toBeInstanceOf(GrantSpellVersionReferenceError);
    expect(error).toMatchObject({
      rule_key: 'inactive-fixed',
      issue: 'inactive',
    });
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);

    db.exec('UPDATE spell_versions SET is_active = 1 WHERE id = ?', [
      fixedId,
    ]);
    generator.generateForSource(sourceId);
    const before = db.oneRaw(
      `SELECT id, slot_key, fixed_spell_version_id
       FROM spell_selection_slots`,
    );
    db.exec('UPDATE spell_versions SET is_active = 0 WHERE id = ?', [
      fixedId,
    ]);
    generator.generateForSource(sourceId);

    expect(
      db.oneRaw(
        `SELECT id, slot_key, fixed_spell_version_id, state,
                selection_eligibility, selection_invalid_reason
         FROM spell_selection_slots`,
      ),
    ).toEqual({
      ...before,
      state: 'active',
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selected spell version is not active in the catalog.',
    });
  });
});
