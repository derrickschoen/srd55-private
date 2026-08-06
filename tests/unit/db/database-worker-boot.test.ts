import { describe, expect, it } from 'vitest';
import {
  bootDatabaseWorkerWithRetry,
  databaseBootFailureMessage,
  type DatabaseWorkerBootPort,
} from '../../../src/db/database-worker-boot';
import { RpcError } from '../../../src/rpc/protocol';

class BootPort implements DatabaseWorkerBootPort {
  activations = 0;
  restarts = 0;

  activate(): void {
    this.activations += 1;
  }

  restart(): void {
    this.restarts += 1;
    this.activate();
  }
}

describe('database worker boot', () => {
  it('restarts once when the initial system.info call loses its worker transport', async () => {
    const worker = new BootPort();
    let infoCalls = 0;

    await bootDatabaseWorkerWithRetry(worker, () => {
      infoCalls += 1;
      return infoCalls === 1
        ? Promise.reject(new RpcError('transport_error', 'network changed'))
        : Promise.resolve({});
    });

    expect({
      activations: worker.activations,
      restarts: worker.restarts,
      infoCalls,
    }).toEqual({ activations: 2, restarts: 1, infoCalls: 2 });
  });

  it('does not retry a database handler failure', async () => {
    const worker = new BootPort();
    let infoCalls = 0;
    const failure = new RpcError('handler_error', 'schema seed failed');

    await expect(
      bootDatabaseWorkerWithRetry(worker, () => {
        infoCalls += 1;
        return Promise.reject(failure);
      }),
    ).rejects.toBe(failure);

    expect({
      activations: worker.activations,
      restarts: worker.restarts,
      infoCalls,
    }).toEqual({ activations: 1, restarts: 0, infoCalls: 1 });
  });

  it('never formats an empty database boot status', () => {
    expect(
      databaseBootFailureMessage(new RpcError('handler_error', '')),
    ).toBe('Database worker handler error; no details were reported.');
    expect(databaseBootFailureMessage(new Error(''))).toBe(
      'Error; no details were reported.',
    );
    expect(databaseBootFailureMessage('')).toBe(
      'Unknown database boot failure; no details were reported.',
    );
  });
});
