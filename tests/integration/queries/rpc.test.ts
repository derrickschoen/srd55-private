import { afterEach, describe, expect, it } from 'vitest';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import type { Workspace } from '../../../src/domain/read-models';
import { createQueriesClient } from '../../../src/queries/client';
import {
  RpcClient,
  type RpcTransport,
} from '../../../src/rpc/client';
import type {
  RpcRequest,
  RpcResponse,
} from '../../../src/rpc/protocol';
import {
  handlers as catalogHandlers,
} from '../../../src/worker/handlers/catalog';
import {
  handlers as queryHandlers,
} from '../../../src/worker/handlers/queries';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
} from '../reports/build-report-fixture';

class HarnessTransport implements RpcTransport {
  readonly #messageListeners = new Set<
    (event: MessageEvent<RpcResponse>) => void
  >();
  readonly #errorListeners = new Set<
    (event: ErrorEvent) => void
  >();

  constructor(private readonly harness: RpcHarness) {}

  postMessage(message: RpcRequest): void {
    void this.harness
      .call(message.method, message.params)
      .then((response) => {
        const event = { data: response } as MessageEvent<RpcResponse>;
        for (const listener of this.#messageListeners) {
          listener(event);
        }
      })
      .catch((error: unknown) => {
        const event = {
          message: error instanceof Error ? error.message : String(error),
        } as ErrorEvent;
        for (const listener of this.#errorListeners) {
          listener(event);
        }
      });
  }

  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messageListeners.add(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messageListeners.delete(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

describe('typed query RPC integration', () => {
  let harness: RpcHarness | null = null;

  afterEach(() => {
    harness?.close();
    harness = null;
  });

  it('validates character CRUD envelopes and persists create/delete through one surface', async () => {
    harness = await createRpcHarness(queryHandlers);
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
      harness.context.db.oneRaw(
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
      harness.context.db.oneRaw(
        'SELECT id FROM characters WHERE id = ?',
        [characterId],
      ),
    ).toBeNull();
  });

  it('exposes workspace, catalog, eligibility, report, printable, and history as serializable DTOs', async () => {
    harness = await createRpcHarness(queryHandlers);
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

    const before = persistedReportTableHashes(
      harness.context.db,
      fixture.characterId,
    );
    const character = await harness.call(
      'queries.characters.get',
      { character_id: fixture.characterId },
    );
    expect(character).toEqual({
      id: 1,
      ok: true,
      result: expect.objectContaining({
        id: fixture.characterId,
        name: 'R40 Golden',
        allow_legacy: true,
        revision: 0,
      }),
    });
    const list = await harness.call(
      'queries.characters.list',
      {},
    );
    expect(list).toEqual({
      id: 2,
      ok: true,
      result: [{
        id: fixture.characterId,
        name: 'R40 Golden',
        level: 8,
        classes: ['Paladin 1', 'Ranger 1', 'Warlock 5', 'Wizard 1'],
        warning_count: 5,
      }],
    });
    const workspace = await harness.call<
      { character_id: number },
      Workspace
    >('queries.characters.workspace', {
      character_id: fixture.characterId,
    });
    expect(workspace).toMatchObject({
      id: 3,
      ok: true,
      result: {
        revision: 0,
        report: {
          summary: {
            unique_spells: 6,
            access_routes: 8,
            warning_count: 5,
          },
        },
        spell_lists: ['Cleric', 'Druid', 'Wizard'],
        slots: expect.arrayContaining([
          expect.objectContaining({
            id: slotId,
            spell_id: fixture.spellIds.mageHand,
            spell_name: 'Mage Hand',
          }),
        ]),
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
    expect(eligible).toEqual({
      id: 4,
      ok: true,
      result: [
        {
          id: fixture.spellIds.mageHand,
          name: 'Mage Hand',
          level: 0,
          school: 'Abjuration',
          ritual: false,
          concentration: false,
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
    expect(catalog).toMatchObject({
      id: 5,
      ok: true,
      result: {
        spells: expect.arrayContaining([
          expect.objectContaining({
            id: fixture.spellIds.mageHand,
            display_name: 'Mage Hand',
            lists: [],
            tags: [],
          }),
        ]),
      },
    });
    expect(report).toMatchObject({
      id: 6,
      ok: true,
      result: {
        character: {
          id: fixture.characterId,
          name: 'R40 Golden',
          character_level: 8,
          proficiency_bonus: 3,
          abilities: expect.any(Object),
        },
        caster: {
          caster_level: 3,
          slots: [
            { level: 1, count: 4 },
            { level: 2, count: 2 },
          ],
          pact_magic: { level: 3, count: 2 },
        },
      },
    });
    expect(printable).toMatchObject({
      id: 7,
      ok: true,
      result: {
        variant: 'reference',
        text_status: 'not_requested',
        character: { id: fixture.characterId, name: 'R40 Golden' },
        source_groups: expect.arrayContaining([
          expect.objectContaining({ source: 'Magic Initiate: Wizard' }),
          expect.objectContaining({ source: 'Wizard 1' }),
        ]),
      },
    });
    expect(history).toEqual({
      id: 8,
      ok: true,
      result: { operations: [], changes: [] },
    });
    for (const response of [catalog, report, printable]) {
      expect(() => JSON.stringify(response)).not.toThrow();
    }
    expect(
      harness.context.db.oneRaw(
        `SELECT current_spell_version_id, selection_eligibility
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      current_spell_version_id: fixture.spellIds.mageHand,
      selection_eligibility: 'valid',
    });
    expect(
      persistedReportTableHashes(
        harness.context.db,
        fixture.characterId,
      ),
    ).toEqual(before);
  });

  it('persists save points and returns a signed restore DTO bound to the character', async () => {
    harness = await createRpcHarness(queryHandlers);
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
      harness.context.db.oneRaw(
        `SELECT character_id, label, schema_version
         FROM character_save_points WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      character_id: characterId,
      label: 'RPC checkpoint',
      schema_version: 'a7-v5',
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

  it('composes catalog mutation and read through the typed shared client into persisted SQLite', async () => {
    harness = await createRpcHarness([
      ...catalogHandlers,
      ...queryHandlers,
    ]);
    const rpc = new RpcClient(new HarnessTransport(harness));
    const queries = createQueriesClient(rpc);
    const document = JSON.stringify([
      {
        identityKey: 'q60-client-spell',
        versionKey: '2024:q60-client-spell',
        name: 'Q60 Client Spell',
        edition: '2024',
        level: 1,
        school: 'Evocation',
        castingTime: 'Action',
        range: '60 feet',
        components: 'V, S',
        duration: 'Instantaneous',
        concentration: false,
        ritual: false,
        attackModes: ['ranged_spell'],
        saveAbilities: [],
        effectReliabilityCategory: 'attack_roll',
        spellLists: ['Wizard'],
        sourceBooks: ['Q60 Review'],
        sourcePage: 60,
        sourceSlug: 'q60-client-spell',
      },
    ]);

    const imported = await queries.importCatalog([document]);
    expect(imported).toEqual({
      created: 1,
      updated: 0,
      tombstoned: 0,
      identities_created: 1,
      identities_updated: 0,
      publications_created: 1,
      memberships_created: 1,
      tags_created: 0,
      attack_modes_created: 1,
      save_abilities_created: 0,
      subclasses_created: 0,
      subclasses_updated: 0,
      subclass_features_created: 0,
      text_available: false,
      descriptions_loaded: 0,
    });
    expect(
      harness.context.db.oneRaw(
        `SELECT content_key, display_name, is_active
         FROM spell_versions
         WHERE content_key = '2024:q60-client-spell'`,
      ),
    ).toEqual({
      content_key: '2024:q60-client-spell',
      display_name: 'Q60 Client Spell',
      is_active: 1,
    });

    const catalog = await queries.catalog();
    expect(
      catalog.spells.find(
        (spell) => spell.content_key === '2024:q60-client-spell',
      ),
    ).toMatchObject({
      display_name: 'Q60 Client Spell',
      lists: ['Wizard'],
      tags: [],
    });

    const character = await queries.createCharacter('Q60 Client Hero');
    expect(await queries.getCharacter(character.id)).toEqual(character);
    expect(await queries.listCharacters()).toEqual([
      {
        id: character.id,
        name: 'Q60 Client Hero',
        level: 0,
        classes: [],
        warning_count: 0,
      },
    ]);
    expect(
      harness.context.db.oneRaw(
        `SELECT name, strength, revision
         FROM characters
         WHERE id = ?`,
        [character.id],
      ),
    ).toEqual({
      name: 'Q60 Client Hero',
      strength: 10,
      revision: 0,
    });
    expect(await queries.deleteCharacter(character.id)).toEqual({
      id: character.id,
      deleted: true,
    });
    expect(
      harness.context.db.oneRaw(
        'SELECT id FROM characters WHERE id = ?',
        [character.id],
      ),
    ).toBeNull();
    rpc.close();
  });
});
