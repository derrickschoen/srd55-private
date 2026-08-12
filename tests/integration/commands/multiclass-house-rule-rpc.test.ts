import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handlers as commandHandlers } from '../../../src/worker/handlers/commands';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

describe('multiclass prerequisite house rule through commands.execute', () => {
  let harness: RpcHarness;
  let characterId: number;

  beforeEach(async () => {
    harness = await createRpcHarness(commandHandlers);
    characterId = harness.context.db.exec(
      `INSERT INTO characters (
         name, intelligence, wisdom, ability_allocation_method
       ) VALUES ('RPC waiver', 10, 13, 'manual')`,
    ).lastInsertId;
  });

  afterEach(() => harness.close());

  function classId(name: string): number {
    return Number(
      harness.context.db.scalar(
        'SELECT id FROM class_definitions WHERE name = ?',
        [name],
      ),
    );
  }

  it('refuses while off, persists the toggle, then admits the same RPC payload', { timeout: 20_000 }, async () => {
    const clericId = classId('Cleric');
    const wizardId = classId('Wizard');
    const first = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: '51000000-0000-4000-8000-000000000001',
      expected_revision: 0,
      command: {
        type: 'update_class',
        class_definition_id: clericId,
        subclass_definition_id: null,
      },
    });
    expect(first).toMatchObject({ ok: true, result: { revision: 1 } });

    const blocked = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: '51000000-0000-4000-8000-000000000002',
      expected_revision: 1,
      command: {
        type: 'update_class',
        class_definition_id: wizardId,
        subclass_definition_id: null,
      },
    });
    expect(blocked).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        message:
          'Cannot add Wizard. Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
      },
    });
    expect(
      harness.context.db.scalar<number>(
        `SELECT count(*) FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, wizardId],
      ),
    ).toBe(0);

    const toggled = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: '51000000-0000-4000-8000-000000000003',
      expected_revision: 1,
      command: {
        type: 'set_multiclass_prerequisite_house_rule',
        waive: true,
      },
    });
    expect(toggled).toMatchObject({ ok: true, result: { revision: 2 } });
    expect(
      harness.context.db.oneRaw(
        `SELECT rule_key, value, note
         FROM character_rule_overrides
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      rule_key: 'ignore_multiclass_prerequisites',
      value: 'true',
      note: null,
    });

    const admitted = await harness.call('commands.execute', {
      character_id: characterId,
      operation_uuid: '51000000-0000-4000-8000-000000000004',
      expected_revision: 2,
      command: {
        type: 'update_class',
        class_definition_id: wizardId,
        subclass_definition_id: null,
      },
    });
    expect(admitted).toMatchObject({ ok: true, result: { revision: 3 } });
    expect(
      harness.context.db.scalar<number>(
        `SELECT count(*) FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, wizardId],
      ),
    ).toBe(1);
  });

  it('undo restores an imported invalid row exactly instead of canonicalizing it', { timeout: 20_000 }, async () => {
    const prior = {
      value: '{broken',
      note: '</p><img data-house-rule-hostile src=x>',
      created_at: '2031-01-02 03:04:05',
      updated_at: '2031-06-07 08:09:10',
    };
    harness.context.db.exec(
      `INSERT INTO character_rule_overrides (
         character_id, rule_key, value, note, created_at, updated_at
       ) VALUES (?, 'ignore_multiclass_prerequisites', ?, ?, ?, ?)`,
      [
        characterId,
        prior.value,
        prior.note,
        prior.created_at,
        prior.updated_at,
      ],
    );
    const operationUuid = '52000000-0000-4000-8000-000000000001';
    expect(
      await harness.call('commands.execute', {
        character_id: characterId,
        operation_uuid: operationUuid,
        expected_revision: 0,
        command: {
          type: 'set_multiclass_prerequisite_house_rule',
          waive: true,
        },
      }),
    ).toMatchObject({ ok: true, result: { revision: 1 } });

    expect(
      await harness.call('commands.undo', {
        character_id: characterId,
        operation_uuid: operationUuid,
        expected_revision: 1,
      }),
    ).toMatchObject({ ok: true, result: { status: 'applied', revision: 2 } });
    expect(
      harness.context.db.oneRaw(
        `SELECT value, note, created_at, updated_at
         FROM character_rule_overrides
         WHERE character_id = ?
           AND rule_key = 'ignore_multiclass_prerequisites'`,
        [characterId],
      ),
    ).toEqual(prior);
  });
});
