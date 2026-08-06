import { afterEach, describe, expect, it } from 'vitest';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import { createBackupClient } from '../../../src/backup/client';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { HandlerContext } from '../../../src/worker/handler';
import { handlers as backupHandlers } from '../../../src/worker/handlers/backup';
import { createRpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

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
