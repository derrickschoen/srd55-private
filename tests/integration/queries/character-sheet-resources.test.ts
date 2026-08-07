import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterSheetBuilder,
  type CharacterSheet,
} from '../../../src/queries/character-sheet-builder';
import { applicationSeed } from '../../../src/db/bootstrap';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import type { SheetResourceMaximum } from '../../../src/rules/sheet';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { rpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness } from '../../helpers/rpc-harness';

describe('character sheet resource projection', () => {
  let connection: Database;
  let db: DatabaseContext;
  let builder: CharacterSheetBuilder;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
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

  // Measured alone at 2.2s; 20s retains contention headroom.
  it('combines shared slots, guards a sole published subclass caster, and keeps Pact slots separate', async () => {
    const harness = await createRpcHarness([]);
    try {
      db = harness.context.db;
      const multiclass = character('Spell resources', [
        { name: 'Wizard', level: 3 },
        { name: 'Cleric', level: 2 },
        { name: 'Warlock', level: 3 },
      ]);
      const multiclassResponse = await rpcRegistry.dispatch(
        {
          id: 1,
          method: 'queries.characters.sheet',
          params: { character_id: multiclass },
        },
        harness.context,
      );
      expect(multiclassResponse).toMatchObject({ ok: true });
      if (!multiclassResponse.ok) {
        throw new Error(multiclassResponse.error.message);
      }
      const resources = (multiclassResponse.result as CharacterSheet).resources;
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

      const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
        (entry) => entry.catalog_key === 'spell-student',
      );
      const plan = planBundledHomebrewInstall(db, catalog);
      expect(
        commitBundledHomebrewInstall(db, plan.token, catalog),
      ).toMatchObject({
        kind: 'committed',
        outcomes: [{
          kind: 'create',
          contentKey: '2024:content.subclass:spell-student',
        }],
      });
      const subclass = character('Subclass caster', [
        { name: 'Fighter', level: 3, subclass: 'Spell Student' },
      ]);
      const response = await rpcRegistry.dispatch(
        {
          id: 2,
          method: 'queries.characters.sheet',
          params: { character_id: subclass },
        },
        harness.context,
      );
      expect(response).toMatchObject({ ok: true });
      if (!response.ok) throw new Error(response.error.message);
      const sheet = response.result as CharacterSheet;
      expect(
        computed(sheet.resources, 'spell_slot').map((entry) => [
          entry.spell_level,
          entry.maximum,
        ]),
      ).toEqual([[1, 2]]);
    } finally {
      harness.close();
    }
  }, 20_000);

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

    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: 'expanded:chronomancer',
      name: 'Chronomancer', keyKind: 'asserted',
    });
    const homebrewId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type
       ) VALUES ('expanded:chronomancer', 'Chronomancer', 'expanded', 'none')`,
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
