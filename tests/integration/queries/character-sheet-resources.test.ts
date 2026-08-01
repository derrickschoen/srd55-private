import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedClassResources } from '../../../src/rules/class-resources-srd';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import type { SheetResourceMaximum } from '../../../src/rules/sheet';
import { openTestDatabase } from '../../helpers/open-db';

describe('character sheet resource projection', () => {
  let connection: Database;
  let db: DatabaseContext;
  let builder: CharacterSheetBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    seedClassResources(db);
    builder = new CharacterSheetBuilder(db);
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    const id = db.scalar<number>(
      'SELECT id FROM class_definitions WHERE name = ?',
      [name],
    );
    if (id === null) {
      throw new Error(`Missing seeded class ${name}.`);
    }
    return id;
  }

  function character(
    name: string,
    classes: readonly {
      readonly name: string;
      readonly level: number;
      readonly subclass?: string;
    }[],
    abilities: { readonly charisma?: number; readonly wisdom?: number } = {},
  ): number {
    const id = db.exec(
      `INSERT INTO characters (name, charisma, wisdom)
       VALUES (?, ?, ?)`,
      [name, abilities.charisma ?? 10, abilities.wisdom ?? 10],
    ).lastInsertId;
    classes.forEach((entry, index) => {
      const definitionId = classId(entry.name);
      const subclassId =
        entry.subclass === undefined
          ? null
          : db.scalar<number>(
              `SELECT id FROM subclass_definitions
               WHERE class_definition_id = ? AND name = ?`,
              [definitionId, entry.subclass],
            );
      db.exec(
        `INSERT INTO character_class_levels (
           character_id, class_definition_id, subclass_definition_id,
           level, is_starting_class
         ) VALUES (?, ?, ?, ?, ?)`,
        [id, definitionId, subclassId, entry.level, index === 0 ? 1 : 0],
      );
    });
    return id;
  }

  function computed(
    resources: readonly SheetResourceMaximum[],
    kind: string,
  ): Extract<SheetResourceMaximum, { status: 'computed' }>[] {
    return resources.filter(
      (entry): entry is Extract<SheetResourceMaximum, { status: 'computed' }> =>
        entry.status === 'computed' && entry.kind === kind,
    );
  }

  it('uses owning class levels, keeps Channel Divinity separate, and consumes known zero', () => {
    const mixed = character('Own levels', [
      { name: 'Barbarian', level: 3 },
      { name: 'Monk', level: 2 },
      { name: 'Cleric', level: 6 },
      { name: 'Paladin', level: 3 },
    ]);
    const resources = builder.build(mixed).resources;

    expect(computed(resources, 'rage').map((entry) => entry.maximum)).toEqual([3]);
    expect(computed(resources, 'focus_points').map((entry) => entry.maximum)).toEqual([2]);
    expect(
      computed(resources, 'channel_divinity').map((entry) => [
        entry.class_definition_id,
        entry.maximum,
      ]),
    ).toEqual([
      [classId('Cleric'), 3],
      [classId('Paladin'), 2],
    ]);

    const monkOne = character('Known zero', [{ name: 'Monk', level: 1 }]);
    const focus = builder
      .build(monkOne)
      .resources.filter(
        (entry) =>
          (entry.status === 'computed' && entry.kind === 'focus_points') ||
          (entry.status === 'absent' && entry.id.endsWith(':focus_points')),
      );
    expect(focus).toEqual([]);
  });

  it('evaluates formula maxima from live resolved abilities and owning Paladin level', () => {
    const id = character(
      'Formula hero',
      [
        { name: 'Bard', level: 5 },
        { name: 'Paladin', level: 5 },
      ],
      { charisma: 14 },
    );
    const before = builder.build(id).resources;
    expect(computed(before, 'bardic_inspiration')[0]?.maximum).toBe(2);
    expect(computed(before, 'lay_on_hands')[0]?.maximum).toBe(25);

    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name, state
       ) VALUES (?, ?, 'feat', 'Resolved Charisma increase', 'active')`,
      [id, crypto.randomUUID()],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (?, 1, 'ability_increase', 'charisma', 4, 20, ?, 'Resolved Charisma increase')`,
      [id, sourceId],
    );
    const after = builder.build(id).resources;
    expect(computed(after, 'bardic_inspiration')[0]?.maximum).toBe(4);
    expect(computed(after, 'lay_on_hands')[0]?.maximum).toBe(25);
  });

  it('combines shared slots, guards a sole subclass caster, and keeps Pact slots separate', () => {
    const multiclass = character('Spell resources', [
      { name: 'Wizard', level: 3 },
      { name: 'Cleric', level: 2 },
      { name: 'Warlock', level: 3 },
    ]);
    const resources = builder.build(multiclass).resources;
    expect(
      computed(resources, 'spell_slot').map((entry) => [
        entry.spell_level,
        entry.maximum,
      ]),
    ).toEqual([
      [1, 4],
      [2, 3],
      [3, 2],
    ]);
    expect(
      computed(resources, 'pact_slot').map((entry) => [
        entry.spell_level,
        entry.maximum,
      ]),
    ).toEqual([[2, 2]]);

    const subclass = character('Subclass caster', [
      { name: 'Fighter', level: 3, subclass: 'Eldritch Knight' },
    ]);
    expect(
      computed(builder.build(subclass).resources, 'spell_slot').map((entry) => [
        entry.spell_level,
        entry.maximum,
      ]),
    ).toEqual([[1, 2]]);
  });

  it('keeps unknown catalogs, missing rows, invalid formulas, and invalid spell content distinct', () => {
    const barbarian = character('Missing ladder', [
      { name: 'Barbarian', level: 4 },
    ]);
    db.exec(
      `DELETE FROM class_resources
       WHERE class_definition_id = ? AND class_level = 4 AND resource_kind = 'rage'`,
      [classId('Barbarian')],
    );
    expect(builder.build(barbarian).resources).toContainEqual(
      expect.objectContaining({
        status: 'absent',
        reason: 'resource_level_row_missing_or_invalid',
      }),
    );

    const bard = character('Missing formula', [{ name: 'Bard', level: 4 }]);
    db.exec(
      `DELETE FROM class_resource_formulas
       WHERE class_definition_id = ? AND resource_kind = 'bardic_inspiration'`,
      [classId('Bard')],
    );
    expect(builder.build(bard).resources).toContainEqual(
      expect.objectContaining({
        status: 'absent',
        reason: 'resource_formula_missing_or_invalid',
      }),
    );

    db.exec(
      `INSERT INTO catalog_content_identities (
         content_key, content_kind, key_kind, catalog_layer, normalized_name
       ) VALUES ('homebrew:class:chronomancer', 'class', 'legacy-opaque', 'external', 'chronomancer')`,
    );
    const homebrewId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type
       ) VALUES ('homebrew:class:chronomancer', 'Chronomancer', 'expanded', 'none')`,
    ).lastInsertId;
    const unknown = db.exec(
      `INSERT INTO characters (name) VALUES ('Unknown catalog')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 4, 1)`,
      [unknown, homebrewId],
    );
    expect(builder.build(unknown).resources).toContainEqual(
      expect.objectContaining({
        status: 'absent',
        reason: 'resource_catalog_not_recorded',
      }),
    );

    const wizard = character('Invalid spell row', [{ name: 'Wizard', level: 3 }]);
    db.exec(
      `UPDATE class_progressions SET slots = '{}'
       WHERE class_definition_id = ? AND class_level = 3`,
      [classId('Wizard')],
    );
    expect(builder.build(wizard).resources).toContainEqual(
      expect.objectContaining({
        status: 'absent',
        reason: 'spell_progression_missing_or_invalid',
      }),
    );
  });
});
