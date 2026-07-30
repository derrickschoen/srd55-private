import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import { openTestDatabase } from '../../helpers/open-db';

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

  it('adds, updates, removes, and restores an item with its owned effects', async () => {
    const added = await run({
      type: 'add_item',
      item: {
        name: 'Cloak of the Armadillo',
        description: 'A layered shell cloak.',
        requires_attunement: true,
        source_instance_id: null,
        effects: [{
          effect_kind: 'armor_class_bonus',
          amount: 1,
          label: 'Cloak shell',
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
      requires_attunement: 1,
    });
    const itemId = Number(item?.id);
    const originalEffect = db.oneRaw(
      'SELECT * FROM character_effects WHERE character_item_id = ?',
      [itemId],
    );
    expect(originalEffect).toMatchObject({
      effect_kind: 'armor_class_bonus',
      amount: 1,
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

    await run(updated.inverse);
    expect(
      db.oneRaw(
        'SELECT id, effect_kind, amount FROM character_effects WHERE character_item_id = ?',
        [itemId],
      ),
    ).toEqual({
      id: Number(originalEffect?.id),
      effect_kind: 'armor_class_bonus',
      amount: 1,
    });

    const removed = await run({ type: 'remove_item', item_id: itemId });
    expect(db.scalar('SELECT count(*) FROM character_items')).toBe(0);
    expect(db.scalar('SELECT count(*) FROM character_effects')).toBe(0);

    await run(removed.inverse);
    expect(
      db.oneRaw('SELECT id, name FROM character_items WHERE id = ?', [itemId]),
    ).toEqual({ id: itemId, name: 'Cloak of the Armadillo' });
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

  it('hard-deleting a source cascades through its item into the item effects', () => {
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

    await run(filled.inverse);
    await run(unattuned.inverse);
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

    await run(replaced.inverse);
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
        requires_attunement: true,
        source_instance_id: null,
      },
    });
    if (added.inverse.type !== 'remove_item') {
      throw new Error('Adding an item did not return its remove inverse.');
    }
    const itemId = added.inverse.item_id;
    await run({ type: 'attune_item', item_id: itemId });
    const removed = await run({ type: 'remove_item', item_id: itemId });

    expect(
      db.scalar(
        `SELECT slot_1_item_id FROM character_attunement_slots
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBeNull();

    await run(removed.inverse);
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
