import { describe, expect, it } from 'vitest';
import type {
  CharacterRevision,
} from '../../../src/domain/ids';
import { decodeOutcome } from '../../../src/refusals/decode';
import {
  ok,
  refused,
  REFUSALS_WIRE_VERSION,
} from '../../../src/refusals/outcome';
import {
  assertMintedRefusal,
  revisionConflictRefusal,
  UnmintedRefusalDefect,
  type Refusal,
} from '../../../src/refusals/refusal';

type TransportHandler = (
  request: unknown,
) => unknown | Promise<unknown>;

interface TestTransport {
  readonly exchange: (request: unknown) => Promise<unknown>;
  readonly close: () => void;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function createRealCloneTransport(handler: TransportHandler): TestTransport {
  const channel = new MessageChannel();
  let requestQueue: Promise<void> = Promise.resolve();

  channel.port2.addEventListener('message', (event: MessageEvent<unknown>) => {
    const task = requestQueue.then(async () => {
      const response = await handler(event.data);
      try {
        channel.port2.postMessage(response);
      } catch (error) {
        if (errorName(error) !== 'DataCloneError') throw error;
        channel.port2.postMessage({
          kind: 'transport_error',
          error_name: errorName(error),
        });
      }
    });
    requestQueue = task.catch(() => undefined);
  });
  channel.port1.start();
  channel.port2.start();

  return {
    exchange(request: unknown): Promise<unknown> {
      const response = new Promise<unknown>((resolve) => {
        channel.port1.addEventListener(
          'message',
          (event: MessageEvent<unknown>) => resolve(event.data),
          { once: true },
        );
      });
      channel.port1.postMessage(request);
      return response;
    },
    close(): void {
      channel.port1.close();
      channel.port2.close();
    },
  };
}

describe('Outcome structured-clone transport', () => {
  it('round-trips ok and refused outcomes through a real MessageChannel', async () => {
    const transport = createRealCloneTransport((request) => request);
    const expectedRevision = 4 as CharacterRevision;
    const actualRevision = 5 as CharacterRevision;
    const senderRefusal = revisionConflictRefusal(
      expectedRevision,
      actualRevision,
    );

    try {
      expect(() => assertMintedRefusal(senderRefusal)).not.toThrow();

      const receivedOk = await transport.exchange(ok('saved'));
      expect(decodeOutcome(receivedOk, isString)).toEqual({
        kind: 'ok',
        value: 'saved',
      });

      const receivedRefused = await transport.exchange(
        refused(senderRefusal),
      );
      expect(receivedRefused).toEqual({
        kind: 'refused',
        wire_version: REFUSALS_WIRE_VERSION,
        refusal: {
          kind: 'revision_conflict',
          expected: 4,
          actual: 5,
        },
      });
      if (
        receivedRefused === null
        || typeof receivedRefused !== 'object'
        || !('refusal' in receivedRefused)
      ) return expect.fail('Expected a refused wire envelope.');

      const clonedRefusal = receivedRefused.refusal as Refusal;
      expect(clonedRefusal).not.toBe(senderRefusal);
      expect(() => assertMintedRefusal(clonedRefusal)).toThrowError(
        UnmintedRefusalDefect,
      );

      const decoded = decodeOutcome(receivedRefused, isString);
      expect(decoded).toEqual(receivedRefused);
      if (decoded.kind !== 'refused') {
        return expect.fail('Expected decodeOutcome to reconstruct a refusal.');
      }
      expect(decoded.refusal).not.toBe(clonedRefusal);
      expect(() => assertMintedRefusal(decoded.refusal)).not.toThrow();
    } finally {
      transport.close();
    }
  });

  it('rejects a non-cloneable refusal smuggled around its factory before sending', () => {
    const channel = new MessageChannel();
    const smuggled: Refusal & { readonly nonCloneable: () => string } = {
      kind: 'revision_conflict',
      expected: 4 as CharacterRevision,
      actual: 5 as CharacterRevision,
      nonCloneable: () => 'not cloneable',
    };

    try {
      expect(() => channel.port1.postMessage(refused(smuggled))).toThrowError(
        UnmintedRefusalDefect,
      );
    } finally {
      channel.port1.close();
      channel.port2.close();
    }
  });

  it.each([
    {
      kind: 'refused',
      wire_version: REFUSALS_WIRE_VERSION,
      refusal: { kind: 'newer_refusal', detail: 'unknown here' },
    },
    {
      kind: 'refused',
      wire_version: REFUSALS_WIRE_VERSION,
      refusal: { kind: 'revision_conflict', expected: 4 },
    },
  ])('falls back for an unknown wire shape after transport', async (wire) => {
    const transport = createRealCloneTransport((request) => request);

    try {
      const received = await transport.exchange(wire);
      expect(decodeOutcome(received, isString)).toEqual({
        kind: 'incompatible_refusal',
        wire_version: REFUSALS_WIRE_VERSION,
      });
    } finally {
      transport.close();
    }
  });

  it('handles an injected non-cloneable response and keeps serving', async () => {
    const transport = createRealCloneTransport((request) =>
      request === 'non-cloneable'
        ? { kind: 'ok', value: () => 'cannot cross the channel' }
        : ok('served after clone failure'),
    );

    try {
      await expect(transport.exchange('non-cloneable')).resolves.toEqual({
        kind: 'transport_error',
        error_name: 'DataCloneError',
      });
      const received = await transport.exchange('cloneable');
      expect(decodeOutcome(received, isString)).toEqual({
        kind: 'ok',
        value: 'served after clone failure',
      });
    } finally {
      transport.close();
    }
  });
});
