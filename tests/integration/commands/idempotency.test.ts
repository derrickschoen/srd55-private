import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { RevisionConflict } from '../../../src/commands/revision-conflict';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';

const operationA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const operationB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const operationC = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('command idempotency and stale-slot merge guards', () => {
  let connection: Database;
  let db: DatabaseContext;
  let executor: CharacterCommandExecutor;
  let characterId: number;
  let otherCharacterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('X50-idempotency-key'),
    );
    characterId = db.exec(
      "INSERT INTO characters (name, wisdom) VALUES ('Replay Hero', 13)",
    ).lastInsertId;
    otherCharacterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Other Hero')",
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('replays a UUID exactly once despite a different command and changed revision', async () => {
    const first = await executor.execute({
      character_id: characterId,
      operation_uuid: operationA,
      expected_revision: 0,
      command: { type: 'update_ability', ability: 'wisdom', score: 16 },
    });
    await executor.execute({
      character_id: characterId,
      operation_uuid: operationB,
      expected_revision: 1,
      command: {
        type: 'update_ability',
        ability: 'intelligence',
        score: 14,
      },
    });
    const persistedBefore = {
      character: db.one('SELECT * FROM characters WHERE id = ?', [
        characterId,
      ]),
      operations: db.all('SELECT * FROM character_operations ORDER BY id'),
      audit: db.all('SELECT * FROM change_log ORDER BY id'),
    };

    const replay = await executor.execute({
      character_id: characterId,
      operation_uuid: operationA,
      expected_revision: Number.MAX_SAFE_INTEGER,
      command: {
        type: 'update_character_rules',
        allow_legacy: true,
      },
    });

    expect(replay).toEqual({
      inverse: first.inverse,
      revision: 2,
      idempotent_replay: true,
    });
    expect({
      character: db.one('SELECT * FROM characters WHERE id = ?', [
        characterId,
      ]),
      operations: db.all('SELECT * FROM character_operations ORDER BY id'),
      audit: db.all('SELECT * FROM change_log ORDER BY id'),
    }).toEqual(persistedBefore);
    expect(
      db.one(
        `SELECT wisdom, intelligence, allow_legacy, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      wisdom: 16,
      intelligence: 14,
      allow_legacy: 0,
      revision: 2,
    });
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM character_operations WHERE operation_uuid = ?',
          [operationA],
        ),
      ),
    ).toBe(1);
    expect(
      Number(
        db.scalar(
          'SELECT count(DISTINCT group_id) FROM change_log WHERE operation_uuid = ?',
          [operationA],
        ),
      ),
    ).toBe(1);
  });

  it('rejects replay across characters without changing either character', async () => {
    await executor.execute({
      character_id: characterId,
      operation_uuid: operationA,
      expected_revision: 0,
      command: { type: 'update_ability', ability: 'wisdom', score: 16 },
    });

    await expect(
      executor.execute({
        character_id: otherCharacterId,
        operation_uuid: operationA,
        expected_revision: 0,
        command: { type: 'update_ability', ability: 'wisdom', score: 20 },
      }),
    ).rejects.toEqual(expect.objectContaining({
      name: 'RevisionConflict',
      currentRevision: 0,
    }));
    expect(
      db.one(
        'SELECT wisdom, revision FROM characters WHERE id = ?',
        [otherCharacterId],
      ),
    ).toEqual({ wisdom: 10, revision: 0 });
    expect(
      Number(db.scalar('SELECT count(*) FROM character_operations')),
    ).toBe(1);
  });

  it('merges only a stale edit whose exact owned slot was untouched', async () => {
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES ('x50:identity', 'X50 Spell', 'x50 spell')`,
    ).lastInsertId;
    const spellId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school
       ) VALUES ('x50:spell', ?, 'X50 Spell', '2024', 0, 'Evocation')`,
      [identityId],
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name
       ) VALUES (?, 'x50-source', 'feat', 'X50 Source')`,
      [characterId],
    ).lastInsertId;
    const slotIds = ['one', 'two'].map((key) =>
      db.exec(
        `INSERT INTO spell_selection_slots (
           character_id, source_instance_id, slot_key, rule_key,
           bucket, eligibility_kind, current_spell_version_id,
           selection_eligibility
         ) VALUES (?, ?, ?, 'x50-rule', 'known',
           'choice_from_query', ?, 'valid')`,
        [characterId, sourceId, `x50-${key}`, spellId],
      ).lastInsertId,
    );
    const firstSlotId = slotIds[0]!;
    const secondSlotId = slotIds[1]!;

    await executor.execute({
      character_id: characterId,
      operation_uuid: operationA,
      expected_revision: 0,
      command: { type: 'set_slot', slot_id: firstSlotId, mode: 'clear' },
    });
    const merged = await executor.execute({
      character_id: characterId,
      operation_uuid: operationB,
      expected_revision: 0,
      command: { type: 'set_slot', slot_id: secondSlotId, mode: 'clear' },
    });
    expect(merged.revision).toBe(2);

    await expect(
      executor.execute({
        character_id: characterId,
        operation_uuid: operationC,
        expected_revision: 0,
        command: { type: 'set_slot', slot_id: firstSlotId, mode: 'clear' },
      }),
    ).rejects.toBeInstanceOf(RevisionConflict);

    expect(
      db.all(
        `SELECT id, current_spell_version_id, selection_eligibility
         FROM spell_selection_slots ORDER BY id`,
      ),
    ).toEqual([
      {
        id: firstSlotId,
        current_spell_version_id: null,
        selection_eligibility: 'unselected',
      },
      {
        id: secondSlotId,
        current_spell_version_id: null,
        selection_eligibility: 'unselected',
      },
    ]);
    expect(
      db.one(
        'SELECT revision FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toEqual({ revision: 2 });
    expect(
      Number(db.scalar('SELECT count(*) FROM character_operations')),
    ).toBe(2);
    expect(
      db.all(
        `SELECT operation_uuid, entity_id
         FROM change_log
         WHERE entity_type = 'spell_selection_slots'
         ORDER BY sequence`,
      ),
    ).toEqual([
      { operation_uuid: operationA, entity_id: firstSlotId },
      { operation_uuid: operationB, entity_id: secondSlotId },
    ]);
  });
});
