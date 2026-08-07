import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { validateCharacterCommandPayload } from '../../../src/commands/payload-validator';
import { DatabaseContext } from '../../../src/db/database';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import {
  registerAssertedFixtureContentIdentity,
  registerFixtureContentIdentity,
} from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';
import { ItemQueries } from '../../../src/queries/items';

const integrityKey = 'AC-2b-item-command-integrity-key';

describe('item commands and effect ownership', () => {
  let connection: Database;
  let db: DatabaseContext;
  let executor: CharacterCommandExecutor;
  let characterId: number;
  let operation = 0;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity(integrityKey),
    );
    characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Collector')",
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  async function run(command: CharacterCommandPayload) {
    operation += 1;
    return executor.execute({
      character_id: characterId,
      operation_uuid:
        `00000000-0000-4000-8000-${String(operation).padStart(12, '0')}`,
      expected_revision: Number(
        db.scalar('SELECT revision FROM characters WHERE id = ?', [
          characterId,
        ]),
      ),
      command,
    });
  }

  it('picker query copies a definition and effects into severed character rows', async () => {
    const hostile = '</option><img data-ha10-item src=x>';
    const contentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'item',
      edition: 'expanded',
      name: hostile,
    });
    db.exec(
      `INSERT INTO item_definitions (
         content_key, name, rules_edition, description, requires_attunement
       ) VALUES (
         ?, ?, 'expanded',
         'Catalog description', 1
       );
       INSERT INTO item_definition_effects (
         item_definition_id, sort_order, effect_kind, ability, maximum,
         label, notes
       ) VALUES (
         1, 1, 'ability_override', 'strength', 23,
         'Catalog strength', 'Catalog note'
       );`,
      [contentKey, hostile],
    );
    const definition = new ItemQueries(db).panel(characterId).definitions[0];
    if (definition === undefined) throw new Error('Definition was not queryable.');
    expect(definition).toMatchObject({
      name: hostile,
      catalog_layer: 'external',
    });

    await run({
      type: 'add_item',
      item: {
        name: definition.name,
        description: definition.description,
        quantity: 1,
        requires_attunement: definition.requires_attunement,
        source_instance_id: null,
        effects: definition.effects,
      },
    });
    db.exec('DELETE FROM item_definitions WHERE id = 1');

    expect(db.oneRaw(
      `SELECT name, description, quantity, requires_attunement
       FROM character_items WHERE character_id = ?`,
      [characterId],
    )).toEqual({
      name: hostile,
      description: 'Catalog description',
      quantity: 1,
      requires_attunement: 1,
    });
    expect(db.oneRaw(
      `SELECT effect_kind, ability, maximum, label, notes, template_ref
       FROM character_effects WHERE character_id = ?`,
      [characterId],
    )).toEqual({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Catalog strength',
      notes: 'Catalog note',
      template_ref: null,
    });
  });

  it('adds, updates, removes, and restores an item with its owned effects', async () => {
    const added = await run({
      type: 'add_item',
      item: {
        name: 'Cloak of the Armadillo',
        description: 'A layered shell cloak.',
        quantity: 3,
        requires_attunement: true,
        source_instance_id: null,
        effects: [{
          effect_kind: 'ability_override',
          ability: 'strength',
          maximum: 24,
          label: 'Giant strength',
          notes: null,
        }],
      },
    });
    const item = db.oneRaw(
      'SELECT * FROM character_items WHERE character_id = ?',
      [characterId],
    );
    expect(item).toMatchObject({
      name: 'Cloak of the Armadillo',
      quantity: 3,
      requires_attunement: 1,
    });
    const itemId = Number(item?.id);
    const originalEffect = db.oneRaw(
      'SELECT * FROM character_effects WHERE character_item_id = ?',
      [itemId],
    );
    expect(originalEffect).toMatchObject({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 24,
      character_id: characterId,
      character_item_id: itemId,
      character_weapon_id: null,
      template_ref: null,
    });
    expect(added.inverse).toEqual({ type: 'remove_item', item_id: itemId });

    const updated = await run({
      type: 'update_item',
      item_id: itemId,
      item: {
        name: 'Cloak of the Armadillo',
        description: 'Fastened and attuned.',
        quantity: 7,
        requires_attunement: true,
        source_instance_id: null,
        effects: [{
          effect_kind: 'hp_modifier',
          hit_points_flat: 5,
          hit_points_per_level: null,
          label: 'Burrowing vigor',
          notes: null,
        }],
      },
    });
    expect(
      db.oneRaw(
        'SELECT effect_kind, hit_points_flat FROM character_effects WHERE character_item_id = ?',
        [itemId],
      ),
    ).toEqual({ effect_kind: 'hp_modifier', hit_points_flat: 5 });
    expect(updated.inverse).toMatchObject({
      type: 'update_item',
      item: { quantity: 3 },
    });

    await run(validateCharacterCommandPayload(updated.inverse));
    expect(
      db.scalar('SELECT quantity FROM character_items WHERE id = ?', [itemId]),
    ).toBe(3);
    expect(
      db.oneRaw(
        'SELECT id, effect_kind, ability, maximum FROM character_effects WHERE character_item_id = ?',
        [itemId],
      ),
    ).toEqual({
      id: Number(originalEffect?.id),
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 24,
    });

    const removed = await run({ type: 'remove_item', item_id: itemId });
    expect(db.scalar('SELECT count(*) FROM character_items')).toBe(0);
    expect(db.scalar('SELECT count(*) FROM character_effects')).toBe(0);

    await run(validateCharacterCommandPayload(removed.inverse));
    expect(
      db.oneRaw(
        'SELECT id, name, quantity FROM character_items WHERE id = ?',
        [itemId],
      ),
    ).toEqual({
      id: itemId,
      name: 'Cloak of the Armadillo',
      quantity: 3,
    });
    expect(
      db.oneRaw(
        'SELECT id, character_item_id, template_ref FROM character_effects WHERE character_item_id = ?',
        [itemId],
      ),
    ).toEqual({
      id: Number(originalEffect?.id),
      character_item_id: itemId,
      template_ref: null,
    });
  });

  it('accepts a plain possession with zero effect rows', async () => {
    await run({
      type: 'add_item',
      item: {
        name: 'Hempen rope',
        description: null,
        quantity: 2,
        requires_attunement: false,
        source_instance_id: null,
        effects: [],
      },
    });

    expect(
      db.oneRaw(
        'SELECT name, quantity FROM character_items WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual({ name: 'Hempen rope', quantity: 2 });
    expect(db.scalar('SELECT count(*) FROM character_effects')).toBe(0);
  });

  it('hard-deleting a source cascades through its item into the item effects', () => {
    registerFixtureContentIdentity(db, {
      kind: 'feat', contentKey: 'test:cascade-feat', name: 'Cascade Feat',
      keyKind: 'bundled-stable',
    });
    const definitionId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable
       ) VALUES ('test:cascade-feat', 'Cascade Feat', '2024', 0)`,
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'cascade-source', 'feat', ?, 'Cascade Feat', '{}', 1, 'active')`,
      [characterId, definitionId],
    ).lastInsertId;
    const itemId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement, source_instance_id
       ) VALUES (?, 'Cascading Cloak', 0, ?)`,
      [characterId, sourceId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, amount,
         character_item_id, label
       ) VALUES (?, 1, 'armor_class_bonus', 1, ?, 'Cascade bonus')`,
      [characterId, itemId],
    );

    db.exec('DELETE FROM character_source_instances WHERE id = ?', [sourceId]);

    expect(
      db.scalar('SELECT count(*) FROM character_source_instances'),
    ).toBe(0);
    expect(db.scalar('SELECT count(*) FROM character_items')).toBe(0);
    expect(db.scalar('SELECT count(*) FROM character_effects')).toBe(0);
  });

  it('fills the lowest free attunement slot and every inverse restores the exact slot', async () => {
    const itemIds: number[] = [];
    for (const name of ['First', 'Second', 'Third']) {
      const result = await run({
        type: 'add_item',
        item: {
          name,
          description: null,
          quantity: 1,
          requires_attunement: true,
          source_instance_id: null,
        },
      });
      if (result.inverse.type !== 'remove_item') {
        throw new Error('Adding an item did not return its remove inverse.');
      }
      itemIds.push(result.inverse.item_id);
    }

    await run({ type: 'attune_item', item_id: itemIds[0]! });
    await run({ type: 'attune_item', item_id: itemIds[1]! });
    const unattuned = await run({
      type: 'unattune_item',
      item_id: itemIds[0]!,
    });
    const filled = await run({ type: 'attune_item', item_id: itemIds[2]! });

    expect(
      db.oneRaw(
        `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
         FROM character_attunement_slots WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      slot_1_item_id: itemIds[2],
      slot_2_item_id: itemIds[1],
      slot_3_item_id: null,
    });

    await run(validateCharacterCommandPayload(filled.inverse));
    await run(validateCharacterCommandPayload(unattuned.inverse));
    expect(
      db.oneRaw(
        `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
         FROM character_attunement_slots WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      slot_1_item_id: itemIds[0],
      slot_2_item_id: itemIds[1],
      slot_3_item_id: null,
    });
  });

  it('returns all three occupants when full and transactionally replaces the chosen slot', async () => {
    const itemIds: number[] = [];
    for (const name of ['Crown', 'Cloak', 'Ring', 'Boots']) {
      const result = await run({
        type: 'add_item',
        item: {
          name,
          description: null,
          quantity: 1,
          requires_attunement: true,
          source_instance_id: null,
        },
      });
      if (result.inverse.type !== 'remove_item') {
        throw new Error('Adding an item did not return its remove inverse.');
      }
      itemIds.push(result.inverse.item_id);
    }
    for (const itemId of itemIds.slice(0, 3)) {
      await run({ type: 'attune_item', item_id: itemId! });
    }

    await expect(
      run({ type: 'attune_item', item_id: itemIds[3]! }),
    ).rejects.toMatchObject({
      name: 'AttunementSlotsFull',
      data: {
        reason: 'attunement_slots_full',
        occupants: [
          { slot: 1, item_id: itemIds[0], name: 'Crown' },
          { slot: 2, item_id: itemIds[1], name: 'Cloak' },
          { slot: 3, item_id: itemIds[2], name: 'Ring' },
        ],
      },
    });

    const replaced = await run({
      type: 'replace_attuned_item',
      item_id: itemIds[3]!,
      replaced_item_id: itemIds[1]!,
    });
    expect(
      db.oneRaw(
        `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
         FROM character_attunement_slots WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      slot_1_item_id: itemIds[0],
      slot_2_item_id: itemIds[3],
      slot_3_item_id: itemIds[2],
    });

    await run(validateCharacterCommandPayload(replaced.inverse));
    expect(
      db.scalar(
        `SELECT slot_2_item_id FROM character_attunement_slots
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(itemIds[1]);
  });

  it('removes and restores an attuned item without moving its slot', async () => {
    const added = await run({
      type: 'add_item',
      item: {
        name: 'Restorable Ring',
        description: null,
        quantity: 3,
        requires_attunement: true,
        source_instance_id: null,
      },
    });
    if (added.inverse.type !== 'remove_item') {
      throw new Error('Adding an item did not return its remove inverse.');
    }
    const itemId = added.inverse.item_id;
    await run({ type: 'attune_item', item_id: itemId });
    expect(
      db.oneRaw(
        `SELECT item.quantity, slots.slot_1_item_id,
                slots.slot_2_item_id, slots.slot_3_item_id
         FROM character_items AS item
         JOIN character_attunement_slots AS slots
           ON slots.character_id = item.character_id
         WHERE item.id = ?`,
        [itemId],
      ),
    ).toEqual({
      quantity: 3,
      slot_1_item_id: itemId,
      slot_2_item_id: null,
      slot_3_item_id: null,
    });
    const removed = await run({ type: 'remove_item', item_id: itemId });

    expect(
      db.scalar(
        `SELECT slot_1_item_id FROM character_attunement_slots
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBeNull();

    await run(validateCharacterCommandPayload(removed.inverse));
    expect(
      db.scalar(
        `SELECT slot_1_item_id FROM character_attunement_slots
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(itemId);
  });

  it('makes a fourth slot and cross-character occupants unrepresentable in the schema', () => {
    const otherCharacterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Other collector')",
    ).lastInsertId;
    const ownItemId = db.exec(
      `INSERT INTO character_items (character_id, name)
       VALUES (?, 'Own item')`,
      [characterId],
    ).lastInsertId;
    const otherItemId = db.exec(
      `INSERT INTO character_items (character_id, name)
       VALUES (?, 'Other item')`,
      [otherCharacterId],
    ).lastInsertId;

    expect(() =>
      db.exec(
        `INSERT INTO character_attunement_slots (
           character_id, slot_1_item_id
         ) VALUES (?, ?)`,
        [characterId, otherItemId],
      )
    ).toThrow(/FOREIGNKEY/u);

    db.exec(
      `INSERT INTO character_attunement_slots (
         character_id, slot_1_item_id
       ) VALUES (?, ?)`,
      [characterId, ownItemId],
    );
    expect(() =>
      db.exec(
        `INSERT INTO character_attunement_slots (
           character_id, slot_2_item_id
         ) VALUES (?, ?)`,
        [characterId, ownItemId],
      )
    ).toThrow(/PRIMARYKEY|UNIQUE/u);
    expect(
      db.allRaw(
        `SELECT name FROM pragma_table_info('character_attunement_slots')
         WHERE name LIKE 'slot_%_item_id' ORDER BY cid`,
      ).map((row) => row.name),
    ).toEqual([
      'slot_1_item_id',
      'slot_2_item_id',
      'slot_3_item_id',
    ]);
  });
});
