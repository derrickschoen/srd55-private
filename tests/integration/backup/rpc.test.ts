import { afterEach, describe, expect, it } from 'vitest';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import { createBackupClient } from '../../../src/backup/client';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { HandlerContext } from '../../../src/worker/handler';
import { handlers as backupHandlers } from '../../../src/worker/handlers/backup';
import { createRpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';
import { portableElfLibraryDocument } from '../../helpers/species-lineage-portability';
import type { LibraryExportDocument } from '../../../src/backup/portable-content';

const registry = createRpcRegistry({ backup: { handlers: backupHandlers } });
const harnesses: RpcHarness[] = [];
const clients: RpcClient[] = [];

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const harness of harnesses.splice(0)) harness.close();
});

class WorkerTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void registry.dispatch(message, this.context).then((response) => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    });
  }

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  addEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  removeEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

describe('character backup adoption RPC', () => {
  it('plans and commits through client.ts and the production worker handlers', async () => {
    const harness = await createRpcHarness([]);
    harnesses.push(harness);
    const characterId = harness.context.db.exec(
      `INSERT INTO characters (name) VALUES ('RPC Backup Hero')`,
    ).lastInsertId;
    const document = exportCharacterBackup(
      harness.context.db,
      characterId,
      '2042-03-05T00:00:00.000Z',
    );
    const rpc = new RpcClient(new WorkerTransport(harness.context));
    clients.push(rpc);
    const client = createBackupClient(rpc);

    expect(registry.methods).toEqual(expect.arrayContaining([
      'backup.planCharacterImport',
      'backup.commitCharacterImport',
    ]));
    expect(registry.methods).not.toContain('backup.importCharacter');

    const plan = await client.planCharacterImport(document, {});
    const committed = await client.commitCharacterImport(
      document,
      plan.token,
      {},
    );

    expect(committed).toMatchObject({
      kind: 'committed',
      result: { characterId: 2 },
    });
    expect(harness.context.db.scalar<number>('SELECT count(*) FROM characters')).toBe(2);
  });
});

describe('library adoption RPC', () => {
  // Measured alone at 2.0s; 2.0 x 1.5 = 3.0s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('imports v1 directly and keeps v2 key collisions on preview and commit', async () => {
    const harness = await createRpcHarness([]);
    harnesses.push(harness);
    const rpc = new RpcClient(new WorkerTransport(harness.context));
    clients.push(rpc);
    const client = createBackupClient(rpc);
    const current = portableElfLibraryDocument(harness.context.db);
    const {
      supersessions: _supersessions,
      content: currentContent,
      ...withoutSupersessions
    } = current;
    const legacy: LibraryExportDocument = {
      ...withoutSupersessions,
      version: 1,
      content: currentContent.map(({ provenance: _provenance, ...entry }) => entry),
    };

    expect(registry.methods).toEqual(expect.arrayContaining([
      'backup.exportLibrary',
      'backup.importLibrary',
      'backup.planLibraryImport',
      'backup.commitLibraryImport',
    ]));
    await expect(rpc.call('backup.exportLibrary', {
      extra: true,
    })).rejects.toThrow('Invalid params for RPC method "backup.exportLibrary".');
    const emptyExport = await client.exportLibrary();
    expect(Object.keys(emptyExport).sort()).toEqual([
      'content',
      'exported_at',
      'format',
      'selected_content_keys',
      'selection',
      'supersessions',
      'version',
    ]);
    expect(emptyExport).toEqual({
      format: 'dnd-multiclass-spells/library',
      version: 3,
      exported_at: expect.any(String),
      selection: 'all',
      selected_content_keys: [],
      content: [],
      supersessions: [],
    });
    await expect(rpc.call('backup.importLibrary', {
      document: legacy,
      extra: true,
    })).rejects.toThrow('Invalid params for RPC method "backup.importLibrary".');
    await expect(rpc.call('backup.planLibraryImport', {
      document: legacy,
      choices: {},
      extra: true,
    })).rejects.toThrow('Invalid params for RPC method "backup.planLibraryImport".');
    await expect(rpc.call('backup.commitLibraryImport', {
      document: legacy,
      token: 'a'.repeat(64),
    })).rejects.toThrow('Invalid params for RPC method "backup.commitLibraryImport".');
    await expect(client.importLibrary(legacy)).resolves.toMatchObject({
      outcomes: [expect.objectContaining({ kind: 'create' })],
    });

    const currentCollision = portableElfLibraryDocument(harness.context.db, {
      oversized: true,
    });
    const collision: LibraryExportDocument = {
      ...currentCollision,
      version: 2,
      content: currentCollision.content.map(
        ({ provenance: _provenance, ...entry }) => entry,
      ),
    };
    const plan = await client.planLibraryImport(collision, {});
    expect(plan.reviews).toEqual([
      expect.objectContaining({
        kind: 'species',
        incomingName: 'Portable Elf',
        localName: 'Portable Elf',
        localCatalogLayer: 'external',
        matchClass: 'key-collision',
      }),
    ]);
    const reviewId = plan.reviews[0]?.id;
    if (reviewId === undefined) throw new Error('Expected a library collision.');
    await expect(client.commitLibraryImport(collision, plan.token, {
      [reviewId]: { decision: 'match' },
    })).resolves.toMatchObject({
      kind: 'committed',
      outcomes: [expect.objectContaining({ kind: 'review' })],
    });
  }, 20_000);
});
