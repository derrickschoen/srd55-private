import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { resolveCharacterAbilities } from '../../../src/rules/ability-contributions';
import { openTestDatabase } from '../../helpers/open-db';

describe('B2 persisted ability contributions', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;
  let sourceId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec(
      `INSERT INTO characters (name, strength)
       VALUES ('Contribution Layers', 15)`,
    ).lastInsertId;
    const definitionId = db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         'test:background:contribution-layers',
         'Contribution Layers', '2024', 0, '[]'
       )`,
    ).lastInsertId;
    sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'test-source:contribution-layers', 'background', ?,
         'Contribution Layers', '{}', 1, 'active'
       )`,
      [characterId, definitionId],
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  function writeContribution(maximum = 20): void {
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (?, 1, 'ability_increase', 'strength', 2, ?, ?, 'Training')`,
      [characterId, maximum, sourceId],
    );
  }

  function resolvedStrength(): number {
    const base = Number(
      db.scalar('SELECT strength FROM characters WHERE id = ?', [characterId]),
    );
    return resolveCharacterAbilities(
      db,
      characterId,
      {
        strength: base,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    ).strength.total;
  }

  it('B2-BASE records the increase beside base and never writes its total into the character column', () => {
    writeContribution();

    expect(
      db.scalar('SELECT strength FROM characters WHERE id = ?', [characterId]),
    ).toBe(15);
    expect(resolvedStrength()).toBe(17);
  });

  it('B2-CASCADE removes exactly the sourced increase when its granting source is removed', () => {
    writeContribution();

    db.exec('DELETE FROM character_source_instances WHERE id = ?', [sourceId]);

    expect(
      db.scalar(
        `SELECT count(*) FROM character_effects
         WHERE character_id = ? AND effect_kind = 'ability_increase'`,
        [characterId],
      ),
    ).toBe(0);
    expect(resolvedStrength()).toBe(15);
    expect(
      db.scalar('SELECT strength FROM characters WHERE id = ?', [characterId]),
    ).toBe(15);
  });

  it('D83 resolves a maximum-22 increase and source-owned boon override end to end', () => {
    db.exec('UPDATE characters SET strength = 20 WHERE id = ?', [characterId]);
    writeContribution(22);
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum,
         source_instance_id, label
       ) VALUES (
         ?, 2, 'ability_override', 'strength', 24, ?, 'Epic Strength Boon'
       )`,
      [characterId, sourceId],
    );

    const resolved = resolveCharacterAbilities(
      db,
      characterId,
      {
        strength: 20,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    );

    expect(resolved.strength.increased).toBe(22);
    expect(resolved.strength.total).toBe(24);
    expect(resolved.strength.overrides).toEqual([
      expect.objectContaining({
        label: 'Epic Strength Boon',
        set_to: 24,
        source_instance_id: sourceId,
        outcome: 'applied',
      }),
    ]);
  });

  it('D83 keeps an unattuned item override outside the resolver until it holds a slot', () => {
    const itemId = db.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, 'Belt of Giant Strength', 1)`,
      [characterId],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum,
         character_item_id, label
       ) VALUES (
         ?, 1, 'ability_override', 'strength', 24, ?,
         'Belt of Giant Strength'
       )`,
      [characterId, itemId],
    );

    expect(resolvedStrength()).toBe(15);
    expect(
      resolveCharacterAbilities(
        db,
        characterId,
        {
          strength: 15,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
      ).strength.overrides,
    ).toEqual([]);

    db.exec(
      `INSERT INTO character_attunement_slots (
         character_id, slot_1_item_id
       ) VALUES (?, ?)`,
      [characterId, itemId],
    );
    expect(resolvedStrength()).toBe(24);
  });
});
