import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { openTestDatabase } from '../../helpers/open-db';

type Rule = Record<string, unknown>;

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
    return db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Generator Feat', '2024', ?, ?)`,
      [
        `feat:${crypto.randomUUID()}`,
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
      db.all(
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
    const persisted = db.all(
      'SELECT * FROM spell_selection_slots ORDER BY id',
    );
    generator.generateForSource(sourceId);
    expect(
      db.all('SELECT * FROM spell_selection_slots ORDER BY id'),
    ).toEqual(persisted);
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
    const before = db.all<{ id: number; slot_key: string }>(
      `SELECT id, slot_key FROM spell_selection_slots ORDER BY ordinal`,
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
      db.all(
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
      db.one(
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
      db.one(
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

  it('merges class progressions by rule key and reactivates the identical orphan with its selection', () => {
    const characterId = character('Progression Character');
    const selectedId = spell('2024:level-four', 'Level Four', {
      level: 1,
      lists: ['Wizard'],
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
    const stable = db.one(
      `SELECT id, spell_level_max FROM spell_selection_slots
       WHERE rule_key = 'stable-prepared'`,
    )!;
    const levelFour = db.one<{ id: number; slot_key: string }>(
      `SELECT id, slot_key FROM spell_selection_slots
       WHERE rule_key = 'level-four-only'`,
    )!;
    new SpellSelectionService(db).select(levelFour.id, selectedId);
    expect(stable.spell_level_max).toBe(2);

    db.exec(
      `UPDATE character_class_levels SET level = 1
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId],
    );
    generator.generateForSource(sourceId);
    const orphan = db.one(
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
      db.one(
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

  it('combines static subclass rules with effective progression rules', () => {
    const characterId = character('Subclass Character');
    const fixedId = spell('2024:subclass-fixed', 'Subclass Fixed');
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
      db.all(
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

    expect(() => generator.generateForSource(sourceId)).toThrow(
      "Grant rule 'inactive-fixed' references an inactive spell version.",
    );
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);

    db.exec('UPDATE spell_versions SET is_active = 1 WHERE id = ?', [
      fixedId,
    ]);
    generator.generateForSource(sourceId);
    const before = db.one(
      `SELECT id, slot_key, fixed_spell_version_id
       FROM spell_selection_slots`,
    );
    db.exec('UPDATE spell_versions SET is_active = 0 WHERE id = ?', [
      fixedId,
    ]);
    generator.generateForSource(sourceId);

    expect(
      db.one(
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
