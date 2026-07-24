import { afterEach, describe, expect, it } from 'vitest';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import type { Workspace } from '../../../src/domain/read-models';
import { handlers } from '../../../src/worker/handlers/queries';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import {
  createBuildReportFixture,
} from '../reports/build-report-fixture';

describe('typed query RPC integration', () => {
  let harness: RpcHarness | null = null;

  afterEach(() => {
    harness?.close();
    harness = null;
  });

  it('validates character CRUD envelopes and persists create/delete through one surface', async () => {
    harness = await createRpcHarness(handlers);
    const created = await harness.call<{ name: string }, { id: number }>(
      'queries.characters.create',
      { name: 'RPC Hero' },
    );
    expect(created).toMatchObject({
      ok: true,
      result: { id: expect.any(Number), name: 'RPC Hero', revision: 0 },
    });
    if (!created.ok) {
      throw new Error('Character creation unexpectedly failed.');
    }
    const characterId = created.result.id;
    expect(
      harness.context.db.one(
        `SELECT name, strength, revision
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({ name: 'RPC Hero', strength: 10, revision: 0 });

    await expect(
      harness.call('queries.characters.create', {
        name: 'Bad',
        extra: true,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
    expect(
      Number(
        harness.context.db.scalar(
          'SELECT count(*) FROM characters WHERE name = ?',
          ['Bad'],
        ),
      ),
    ).toBe(0);

    const deleted = await harness.call(
      'queries.characters.delete',
      { character_id: characterId },
    );
    expect(deleted).toMatchObject({
      ok: true,
      result: { id: characterId, deleted: true },
    });
    expect(
      harness.context.db.one(
        'SELECT id FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toBeNull();
  });

  it('exposes workspace, catalog, eligibility, report, printable, and history as serializable DTOs', async () => {
    harness = await createRpcHarness(handlers);
    const fixture = createBuildReportFixture(harness.context.db);
    const slotId = Number(
      harness.context.db.scalar(
        `SELECT id
         FROM spell_selection_slots
         WHERE character_id = ? AND spell_level_max = 0
         ORDER BY id LIMIT 1`,
        [fixture.characterId],
      ),
    );

    const list = await harness.call(
      'queries.characters.list',
      {},
    );
    expect(list).toMatchObject({
      ok: true,
      result: [{ id: fixture.characterId, name: 'R40 Golden', level: 8 }],
    });
    const workspace = await harness.call<
      { character_id: number },
      Workspace
    >('queries.characters.workspace', {
      character_id: fixture.characterId,
    });
    expect(workspace).toMatchObject({
      ok: true,
      result: {
        revision: 0,
        report: { summary: { warning_count: 5 } },
        slots: expect.any(Array),
      },
    });
    const eligible = await harness.call(
      'queries.eligibleSpells.search',
      {
        character_id: fixture.characterId,
        slot_id: slotId,
        query: 'mage',
      },
    );
    expect(eligible).toMatchObject({
      ok: true,
      result: [
        {
          id: fixture.spellIds.mageHand,
          name: 'Mage Hand',
          level: 0,
          edition: '2024',
        },
      ],
    });
    const catalog = await harness.call('queries.catalog.read', {});
    const report = await harness.call('queries.reports.build', {
      character_id: fixture.characterId,
    });
    const printable = await harness.call(
      'queries.reports.printable',
      { character_id: fixture.characterId, variant: 'reference' },
    );
    const history = await harness.call('queries.history.read', {
      character_id: fixture.characterId,
    });
    for (const response of [
      list,
      workspace,
      eligible,
      catalog,
      report,
      printable,
      history,
    ]) {
      expect(response.ok).toBe(true);
      expect(() => JSON.stringify(response)).not.toThrow();
    }
    expect(
      harness.context.db.one(
        `SELECT current_spell_version_id, selection_eligibility
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      current_spell_version_id: fixture.spellIds.mageHand,
      selection_eligibility: 'valid',
    });
  });

  it('persists save points and returns a signed restore DTO bound to the character', async () => {
    harness = await createRpcHarness(handlers);
    const created = await harness.call<
      { name: string },
      { id: number }
    >('queries.characters.create', { name: 'RPC Snapshot Hero' });
    if (!created.ok) {
      throw new Error('Character creation unexpectedly failed.');
    }
    const characterId = created.result.id;

    const workspace = await harness.call<
      { character_id: number; label: string },
      Workspace
    >('queries.savePoints.create', {
      character_id: characterId,
      label: 'RPC checkpoint',
    });
    expect(workspace).toMatchObject({
      ok: true,
      result: {
        save_points: [
          { id: expect.any(Number), label: 'RPC checkpoint' },
        ],
      },
    });
    expect(
      harness.context.db.one(
        `SELECT character_id, label, schema_version
         FROM character_save_points WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      character_id: characterId,
      label: 'RPC checkpoint',
      schema_version: 'a7-v1',
    });
    if (!workspace.ok) {
      throw new Error('Save-point creation unexpectedly failed.');
    }
    const savePointId = workspace.result.save_points[0]!.id;
    const command = await harness.call<
      { character_id: number; save_point_id: number },
      CharacterCommandPayload
    >('queries.savePoints.restoreCommand', {
      character_id: characterId,
      save_point_id: savePointId,
    });
    expect(command).toMatchObject({
      ok: true,
      result: {
        type: 'restore_snapshot',
        integrity: expect.stringMatching(/^[a-f0-9]{64}$/),
        snapshot: { character: { name: 'RPC Snapshot Hero' } },
      },
    });
    expect(
      Number(
        harness.context.db.scalar(
          `SELECT count(*)
           FROM character_save_points
           WHERE character_id = ? AND id = ?`,
          [characterId, savePointId],
        ),
      ),
    ).toBe(1);
  });
});
