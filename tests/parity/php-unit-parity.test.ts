import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FixedSpellGrant,
  SpellSlotAssignment,
  UnassignedSpellSlot,
  UserSpellSelection,
} from '../../src/access/spell-slot-assignment';
import { DatabaseContext } from '../../src/db/database';
import { BuildReportBuilder } from '../../src/reports/build-report-builder';
import { seedClassProgressions } from '../../src/rules/class-progression-lookup';
import { openTestDatabase } from '../helpers/open-db';

describe('PHP Unit cross-slice parity', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => {
    connection.close();
  });

  it('hydrates each assignment value object from its exclusive persisted references without writes', () => {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Assignment parity')",
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 't80:assignment-source', 'feat', 'Assignment source')`,
      [characterId],
    ).lastInsertId;
    const spellIds = ['fixed', 'selected'].map((kind) => {
      const identityId = db.exec(
        `INSERT INTO spell_identities (
           content_key, canonical_name, normalized_name
         ) VALUES (?, ?, ?)`,
        [
          `t80:assignment-${kind}-identity`,
          `Parity ${kind}`,
          `parity ${kind}`,
        ],
      ).lastInsertId;
      return db.exec(
        `INSERT INTO spell_versions (
           content_key, spell_identity_id, display_name, rules_edition,
           level, school
         ) VALUES (?, ?, ?, '2024', 1, 'Abjuration')`,
        [`t80:assignment-${kind}`, identityId, `Parity ${kind}`],
      ).lastInsertId;
    });

    for (const [slotKey, bucket, kind, fixedId, selectedId] of [
      ['empty', 'known', 'choice_from_list', null, null],
      ['fixed', 'automatic', 'fixed_spell', spellIds[0], null],
      ['selected', 'known', 'choice_from_list', null, spellIds[1]],
    ] as const) {
      db.exec(
        `INSERT INTO spell_selection_slots (
           character_id, source_instance_id, slot_key, rule_key, bucket,
           eligibility_kind, fixed_spell_version_id,
           current_spell_version_id
         ) VALUES (?, ?, ?, 't80-assignment', ?, ?, ?, ?)`,
        [characterId, sourceId, slotKey, bucket, kind, fixedId, selectedId],
      );
    }

    const stored = db.all<{
      slot_key: string;
      bucket: string;
      eligibility_kind: string;
      fixed_spell_version_id: number | null;
      current_spell_version_id: number | null;
    }>(
      `SELECT slot_key, bucket, eligibility_kind,
              fixed_spell_version_id, current_spell_version_id
       FROM spell_selection_slots
       WHERE character_id = ?
       ORDER BY slot_key`,
      [characterId],
    );
    expect(stored).toEqual([
      {
        slot_key: 'empty',
        bucket: 'known',
        eligibility_kind: 'choice_from_list',
        fixed_spell_version_id: null,
        current_spell_version_id: null,
      },
      {
        slot_key: 'fixed',
        bucket: 'automatic',
        eligibility_kind: 'fixed_spell',
        fixed_spell_version_id: spellIds[0],
        current_spell_version_id: null,
      },
      {
        slot_key: 'selected',
        bucket: 'known',
        eligibility_kind: 'choice_from_list',
        fixed_spell_version_id: null,
        current_spell_version_id: spellIds[1],
      },
    ]);

    const assignments = stored.map((row) =>
      SpellSlotAssignment.fromReferences(
        row.fixed_spell_version_id,
        row.current_spell_version_id,
      ),
    );

    expect(assignments[0]).toBeInstanceOf(UnassignedSpellSlot);
    expect(assignments[1]).toBeInstanceOf(FixedSpellGrant);
    expect(assignments[2]).toBeInstanceOf(UserSpellSelection);
    expect(assignments.map((assignment) => assignment.spellVersionId())).toEqual(
      [null, spellIds[0], spellIds[1]],
    );
    expect(
      db.all(
        `SELECT slot_key, bucket, eligibility_kind,
                fixed_spell_version_id, current_spell_version_id
         FROM spell_selection_slots
         WHERE character_id = ?
         ORDER BY slot_key`,
        [characterId],
      ),
    ).toEqual(stored);
  });

  it('derives the six-class oracle seed from stored class rows while leaving them unchanged', () => {
    seedClassProgressions(db);
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Six-class parity')",
    ).lastInsertId;
    const classNames = [
      'Sorcerer',
      'Wizard',
      'Bard',
      'Cleric',
      'Druid',
      'Paladin',
    ] as const;

    for (const name of classNames) {
      const definitionId = db.scalar<number>(
        'SELECT id FROM class_definitions WHERE name = ?',
        [name],
      );
      expect(definitionId, `persisted ${name} definition`).not.toBeNull();
      db.exec(
        `INSERT INTO character_class_levels (
           character_id, class_definition_id, level
         ) VALUES (?, ?, 1)`,
        [characterId, definitionId],
      );
    }

    const stored = db.all(
      `SELECT class.name, level.level, class.progression_type
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS class
         ON class.id = level.class_definition_id
       WHERE level.character_id = ?
       ORDER BY class.name`,
      [characterId],
    );
    expect(stored).toEqual([
      { name: 'Bard', level: 1, progression_type: 'full' },
      { name: 'Cleric', level: 1, progression_type: 'full' },
      { name: 'Druid', level: 1, progression_type: 'full' },
      { name: 'Paladin', level: 1, progression_type: 'half_up' },
      { name: 'Sorcerer', level: 1, progression_type: 'full' },
      { name: 'Wizard', level: 1, progression_type: 'full' },
    ]);

    const report = new BuildReportBuilder(db).build(characterId);

    expect(report.character).toEqual({
      id: characterId,
      name: 'Six-class parity',
      character_level: 6,
      proficiency_bonus: 3,
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    });
    expect(report.caster).toEqual({
      caster_level: 6,
      slots: [
        { level: 1, count: 4 },
        { level: 2, count: 3 },
        { level: 3, count: 3 },
      ],
      pact_magic: null,
    });
    expect(
      report.classes.map((entry) => ({
        name: entry.name,
        maximum: entry.max_preparable_level,
      })),
    ).toEqual([
      { name: 'Bard', maximum: 1 },
      { name: 'Cleric', maximum: 1 },
      { name: 'Druid', maximum: 1 },
      { name: 'Paladin', maximum: 1 },
      { name: 'Sorcerer', maximum: 1 },
      { name: 'Wizard', maximum: 1 },
    ]);
    expect(
      db.all(
        `SELECT class.name, level.level, class.progression_type
         FROM character_class_levels AS level
         INNER JOIN class_definitions AS class
           ON class.id = level.class_definition_id
         WHERE level.character_id = ?
         ORDER BY class.name`,
        [characterId],
      ),
    ).toEqual(stored);
  });
});
