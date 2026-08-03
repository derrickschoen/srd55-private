import { afterEach, describe, expect, it } from 'vitest';
import { defineRpcHandler, isEmptyParams } from '../../../src/worker/handler';
import {
  createRpcRegistry,
  rpcRegistry,
} from '../../../src/worker/registry';
import {
  createSystemHandlers,
} from '../../../src/worker/handlers/system';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

describe('RPC registry', () => {
  it('eagerly discovers convention modules and exposes sorted methods', () => {
    expect(rpcRegistry.methods).toContain('party.listDocumentStates');
    expect(rpcRegistry.methods).toContain('party.saveDocumentState');
    expect(rpcRegistry.methods).toContain('system.info');
    expect(rpcRegistry.methods).toContain('system.inspectRows');
    expect(rpcRegistry.methods).toEqual([...rpcRegistry.methods].sort());
  });

  it('rejects duplicate method names with the colliding method identified', () => {
    const first = defineRpcHandler('example.ping', isEmptyParams, () => 'a');
    const second = defineRpcHandler('example.ping', isEmptyParams, () => 'b');

    expect(() =>
      createRpcRegistry({
        './handlers/a.ts': { handlers: [first] },
        './handlers/b.ts': { handlers: [second] },
      }),
    ).toThrow('Duplicate RPC method "example.ping".');
  });

  it('dispatches a newly discovered module without registry or client edits', async () => {
    const echo = defineRpcHandler(
      'example.echo',
      (params: unknown): params is { value: string } =>
        params !== null &&
        typeof params === 'object' &&
        Object.keys(params).length === 1 &&
        typeof (params as { value?: unknown }).value === 'string',
      (_context, params) => ({ echoed: params.value }),
    );
    harness = await createRpcHarness([echo]);
    const registry = createRpcRegistry({
      './handlers/example.ts': { handlers: [echo] },
    });

    await expect(
      registry.dispatch(
        { id: 1, method: 'example.echo', params: { value: 'discovered' } },
        harness.context,
      ),
    ).resolves.toEqual({
      id: 1,
      ok: true,
      result: { echoed: 'discovered' },
    });
    await expect(
      registry.dispatch(
        { id: 2, method: 'example.echo', params: { value: 42 } },
        harness.context,
      ),
    ).resolves.toMatchObject({
      id: 2,
      ok: false,
      error: { code: 'invalid_params' },
    });
    await expect(
      registry.dispatch(
        { id: 3, method: 'example.missing', params: {} },
        harness.context,
      ),
    ).resolves.toMatchObject({
      id: 3,
      ok: false,
      error: { code: 'unknown_method' },
    });
  });

  it('omits persisted-row inspection from the production handler set', () => {
    const production = createSystemHandlers({ includeInspectRows: false });
    const development = createSystemHandlers({ includeInspectRows: true });

    expect(production.map((handler) => handler.method)).not.toContain(
      'system.inspectRows',
    );
    expect(development.map((handler) => handler.method)).toContain(
      'system.inspectRows',
    );
  });
});
