import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GUIDED_RPC,
  type GuidedClassOption,
  type GuidedRefusalData,
} from '../../../src/builder/contracts';
import {
  createGuidedCharacter,
  listGuidedClassOptions,
} from '../../../src/builder/guided-creation';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { bundledClassContentKeys } from '../../../src/rules/class-progression-lookup';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

let harness: RpcHarness | undefined;

afterEach(() => {
  vi.restoreAllMocks();
  harness?.close();
  harness = undefined;
});

async function realApplicationDatabase(): Promise<RpcHarness> {
  harness = await createRpcHarness([]);
  return harness;
}

function firstBundledClassContentKey(): string {
  const contentKey = bundledClassContentKeys().classes[0];
  if (contentKey === undefined) {
    throw new Error('The bundled class catalogue is empty.');
  }
  return contentKey;
}

function optionFor(
  options: readonly GuidedClassOption[],
  contentKey: string,
): GuidedClassOption {
  const option = options.find(
    (candidate) => candidate.content_key === contentKey,
  );
  if (option === undefined) {
    throw new Error(`No guided class option exists for ${contentKey}.`);
  }
  return option;
}

function insertHomebrewClass(
  rpcHarness: RpcHarness,
  contentKey: string,
  name: string,
): void {
  registerFixtureContentIdentity(rpcHarness.context.db, {
    kind: 'class', contentKey, name, keyKind: 'asserted',
  });
  rpcHarness.context.db.exec(
    `INSERT INTO class_definitions (content_key, name, rules_edition)
     VALUES (?, ?, ?)`,
    [contentKey, name, '2024'],
  );
}

function countRows(rpcHarness: RpcHarness, table: string): number {
  return Number(
    rpcHarness.context.db.scalar(`SELECT count(*) FROM ${table}`) ?? 0,
  );
}

function characterIdFromRpcResult(value: unknown): number {
  if (
    typeof value !== 'object' ||
    value === null ||
    !Object.hasOwn(value, 'id')
  ) {
    throw new Error('Guided creation did not return a character row.');
  }
  const id = (value as Record<string, unknown>)['id'];
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('Guided creation returned an invalid character id.');
  }
  return id;
}

function classOptionKeysFromRpcResult(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value)) {
    throw new Error('Guided class options did not return an array.');
  }
  const keys = value.map((candidate) => {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      !Object.hasOwn(candidate, 'content_key')
    ) {
      throw new Error('A guided class option has no content key.');
    }
    const contentKey = (candidate as Record<string, unknown>)['content_key'];
    if (typeof contentKey !== 'string') {
      throw new Error('A guided class option has an invalid content key.');
    }
    return contentKey;
  });
  return new Set(keys);
}

describe('guided class gate', () => {
  it('refuses an existing homebrew class through the real RPC with the domain discriminator', async () => {
    const rpcHarness = await realApplicationDatabase();
    const homebrewContentKey = '2024:test.homebrew:chronomancer';
    const attemptedName = 'Homebrew Refusal';
    insertHomebrewClass(
      rpcHarness,
      homebrewContentKey,
      'Chronomancer',
    );

    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: GUIDED_RPC.create,
        params: {
          name: attemptedName,
          class_content_key: homebrewContentKey,
        },
      },
      rpcHarness.context,
    );
    expect(response).toEqual({
      id: 1,
      ok: false,
      error: {
        code: 'handler_error',
        message: '"Chronomancer" is not a bundled class; the guided builder does not guide homebrew classes.',
        data: {
          reason: 'class_not_bundled',
        } satisfies GuidedRefusalData,
      },
    });
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM characters WHERE name = ?',
        [attemptedName],
      ),
    ).toBe(0);
  });

  it('refuses a content key with no class row as unknown', async () => {
    const rpcHarness = await realApplicationDatabase();
    const missingContentKey = 'test:class:no-such-row';
    const attemptedName = 'Unknown Refusal';

    const response = await rpcRegistry.dispatch(
      {
        id: 2,
        method: GUIDED_RPC.create,
        params: {
          name: attemptedName,
          class_content_key: missingContentKey,
        },
      },
      rpcHarness.context,
    );
    expect(response).toEqual({
      id: 2,
      ok: false,
      error: {
        code: 'handler_error',
        message: `No class exists for content key "${missingContentKey}".`,
        data: {
          reason: 'unknown_class',
        } satisfies GuidedRefusalData,
      },
    });
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM characters WHERE name = ?',
        [attemptedName],
      ),
    ).toBe(0);
  });

  it('creates a character with a genuinely bundled starting class', async () => {
    const rpcHarness = await realApplicationDatabase();
    const contentKey = firstBundledClassContentKey();

    const response = await rpcRegistry.dispatch(
      {
        id: 3,
        method: GUIDED_RPC.create,
        params: {
          name: 'Bundled Success',
          class_content_key: contentKey,
        },
      },
      rpcHarness.context,
    );

    expect(response).toMatchObject({
      ok: true,
      result: {
        name: 'Bundled Success',
        revision: 0,
      },
    });
    if (!response.ok) {
      throw new Error('Bundled guided creation was refused.');
    }
    const characterId = characterIdFromRpcResult(response.result);
    expect(
      rpcHarness.context.db.allRaw(
        `SELECT level, is_starting_class
         FROM character_class_levels
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ level: 1, is_starting_class: 1 }]);
    expect(
      rpcHarness.context.db.scalar(
        `SELECT count(*)
         FROM character_source_instances
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(1);
  });
});

describe('guided creation atomicity', () => {
  it('rolls back the character and every class-owned row when grant generation fails', async () => {
    const rpcHarness = await realApplicationDatabase();
    const attemptedName = 'Rolled Back Creation';
    vi.spyOn(
      GrantRuleSlotGenerator.prototype,
      'generateForSource',
    ).mockImplementation(() => {
      throw new Error('Injected grant generation failure.');
    });

    expect(() =>
      createGuidedCharacter(
        rpcHarness.context.db,
        {
          name: attemptedName,
          class_content_key: firstBundledClassContentKey(),
        },
        new CharacterCommandIntegrity('guided-creation-test-key'),
      ),
    ).toThrow('Injected grant generation failure.');

    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM characters WHERE name = ?',
        [attemptedName],
      ),
    ).toBe(0);
    expect(countRows(rpcHarness, 'characters')).toBe(0);
    expect(countRows(rpcHarness, 'character_class_levels')).toBe(0);
    expect(countRows(rpcHarness, 'character_source_instances')).toBe(0);
    expect(countRows(rpcHarness, 'spell_selection_slots')).toBe(0);
  });
});

describe('listGuidedClassOptions', () => {
  it('returns exactly bundled class membership and excludes an inserted homebrew row', async () => {
    const rpcHarness = await realApplicationDatabase();
    insertHomebrewClass(
      rpcHarness,
      '2024:test.homebrew:cartographer',
      'Cartographer',
    );

    const options = listGuidedClassOptions(rpcHarness.context.db);

    expect(new Set(options.map((option) => option.content_key))).toEqual(
      new Set(bundledClassContentKeys().classes),
    );
    expect(options.every((option) => option.catalog_layer === 'bundled')).toBe(true);
    expect(options.map((option) => option.name)).not.toContain('Cartographer');
  });

  it('reports an unknown hit die as null when the bundled class traits row is absent', async () => {
    const rpcHarness = await realApplicationDatabase();
    const contentKey = firstBundledClassContentKey();
    rpcHarness.context.db.exec(
      `DELETE FROM class_sheet_traits
       WHERE class_definition_id = (
         SELECT id FROM class_definitions WHERE content_key = ?
       )`,
      [contentKey],
    );

    expect(
      optionFor(
        listGuidedClassOptions(rpcHarness.context.db),
        contentKey,
      ).hit_die,
    ).toBeNull();
  });
});

describe('guided creation revision and history', () => {
  it('creates revision zero without audit or operation history', async () => {
    const rpcHarness = await realApplicationDatabase();

    const created = createGuidedCharacter(
      rpcHarness.context.db,
      {
        name: 'Unaudited Creation',
        class_content_key: firstBundledClassContentKey(),
      },
      new CharacterCommandIntegrity('guided-creation-test-key'),
    );

    expect(created.revision).toBe(0);
    expect(
      rpcHarness.context.db.scalar(
        'SELECT revision FROM characters WHERE id = ?',
        [created.id],
      ),
    ).toBe(0);
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM change_log WHERE character_id = ?',
        [created.id],
      ),
    ).toBe(0);
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM character_operations WHERE character_id = ?',
        [created.id],
      ),
    ).toBe(0);
  });
});

describe('guided RPC registry contracts', () => {
  it('registers and serves the seam-defined class-options RPC', async () => {
    const rpcHarness = await realApplicationDatabase();

    expect(rpcRegistry.methods).toContain(GUIDED_RPC.classOptions);
    const response = await rpcRegistry.dispatch(
      {
        id: 4,
        method: GUIDED_RPC.classOptions,
        params: {},
      },
      rpcHarness.context,
    );

    expect(response).toMatchObject({ ok: true });
    if (!response.ok) {
      throw new Error('The guided class-options RPC failed.');
    }
    expect(classOptionKeysFromRpcResult(response.result)).toEqual(
      new Set(bundledClassContentKeys().classes),
    );
  });

  it('rejects malformed create params before they can create a character', async () => {
    const rpcHarness = await realApplicationDatabase();
    const attemptedName = 'Malformed Must Not Run';

    await expect(
      rpcRegistry.dispatch(
        {
          id: 5,
          method: GUIDED_RPC.create,
          params: {
            name: attemptedName,
            class_content_key: firstBundledClassContentKey(),
            extra: true,
          },
        },
        rpcHarness.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM characters WHERE name = ?',
        [attemptedName],
      ),
    ).toBe(0);
  });

  it('rejects malformed class-options params instead of running the handler', async () => {
    const rpcHarness = await realApplicationDatabase();

    await expect(
      rpcRegistry.dispatch(
        {
          id: 6,
          method: GUIDED_RPC.classOptions,
          params: { extra: true },
        },
        rpcHarness.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });
});
