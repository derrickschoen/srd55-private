import { expect } from 'vitest';
import type { HandoffResponse, SceneSnapshotEvent } from '../../../src/vtt/handoff/protocol-runtime';
import { SceneTransportClosedError, SceneTransportFaultError, type SceneTransport } from '../../../src/vtt/handoff/scene-transport';
import { TWO_ROOM_CLOCK, TWO_ROOM_SEED } from '../../../src/vtt/handoff/fixtures/two-room';
import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
import { ProtocolRuntime } from '../../../src/vtt/handoff/protocol-runtime';
import { createDefaultNodeRuntimeSession } from '../../../tools/vtt-handoff/node-runtime';

export const TRANSPORT_CONFORMANCE_SCENARIOS = [
  'correlation ids',
  'lawful structural values',
  'structural validation failures',
  'authoritative role mismatch',
  'initial snapshot',
  'token move result and snapshot',
  'canonical door change and same-state no-op',
  'unsupported light mutation',
  'five terminal intent outcomes',
  'reconnect full resnapshot',
  'late subscription',
  'visible-to-hidden entity removal',
  'duplicate mutation id',
  'malformed transport beside empty id',
  'subscription and disposal cleanup',
  'no retry after unknown mutation outcome',
] as const;

export interface ConformanceResult {
  readonly seed: number;
  readonly clock: string;
  readonly outcomes: Readonly<Record<string, string>>;
  readonly canonical: readonly HandoffResponse[];
}

export function createInProcessConformanceTransport(): {
  readonly transport: InProcessSceneTransport;
  readonly start: () => Promise<void>;
} {
  const session = createDefaultNodeRuntimeSession({ role: 'dm' });
  return {
    transport: new InProcessSceneTransport(new ProtocolRuntime({
      service: session.service,
      principal: { role: 'dm' },
      seats: session.seats,
      art: session.art,
    })),
    start: session.start ?? (() => Promise.resolve()),
  };
}

export async function runDmTransportConformance(transport: SceneTransport): Promise<ConformanceResult> {
  const events: SceneSnapshotEvent[] = [];
  const unsubscribe = transport.subscribe((event) => events.push(event));
  const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
  expect(open).toMatchObject({ v: 1, id: '', ok: true });
  const initial = await transport.initialSnapshot();
  expect(initial.revision).toBe(0);
  expect(initial.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
    { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
    { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
  ]);
  expect(events[0]).toMatchObject({ seq: 1, data: { revision: 0 } });
  if (!events.some((event) => event.data.revision > 0)) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { stop(); reject(new Error('Timed out waiting for the fixed autonomous offer.')); }, 2_000);
      const stop = transport.subscribe((event) => {
        if (event.data.revision === 0) return;
        clearTimeout(timeout);
        stop();
        resolve();
      });
    });
  }
  let readyRevision = -1;
  for (let attempt = 0; attempt < 10 && readyRevision < 2; attempt += 1) {
    const ready = await transport.request({
      v: 1, id: `readiness:${String(attempt)}`, method: 'scene.snapshot', params: {},
    });
    readyRevision = ready.ok && typeof ready.result.revision === 'number' ? ready.result.revision : -1;
  }
  expect(readyRevision).toBe(2);

  const correlated = await Promise.all([
    transport.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
    transport.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
  ]);
  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
  expect(correlated.every((response) => response.ok)).toBe(true);
  const invalid = await transport.request({ v: 1, id: 'invalid', method: 'door.set', params: { doorId: 42, open: true } });
  expect(invalid).toMatchObject({ id: 'invalid', ok: false, error: { code: 'INVALID_REQUEST' } });
  const unsupported = await transport.request({
    v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
  });
  expect(unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });

  const beforeDoorEvents = events.length;
  const door = await transport.request({
    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
  });
  expect(door).toMatchObject({ id: 'door', ok: true });
  if (!door.ok || typeof door.result.revision !== 'number') throw new Error('Expected an acknowledged door revision.');
  const committedRevision = door.result.revision;
  expect(events.some((event) => event.data.revision === committedRevision)).toBe(true);
  expect(events.map((event) => event.seq)).toEqual(events.map((_event, index) => index + 1));
  expect(events.at(-1)?.data.doors.find((candidate) => candidate.id === 'object:two-room-door')?.open).toBe(true);

  const lateInitial = await transport.initialSnapshot();
  expect(lateInitial.tokens.map((token) => token.id)).toEqual(initial.tokens.map((token) => token.id));
  const sameState = await transport.request({
    v: 1, id: 'door:no-op', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
  });
  expect(sameState).toMatchObject({ id: 'door:no-op', ok: true, result: { revision: committedRevision } });
  expect(events.length).toBe(beforeDoorEvents + 1);

  const duplicate = await transport.request({
    v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
  });
  expect(duplicate).toMatchObject({ id: 'door', ok: false });
  if (duplicate.ok) throw new Error('A duplicate wire mutation id was accepted.');
  expect(['DUPLICATE_MUTATION', 'DUPLICATE_REQUEST_ID']).toContain(duplicate.error.code);
  expect(events.length).toBe(beforeDoorEvents + 1);

  unsubscribe();
  const malformed = transport.request('{');
  await expect(malformed).rejects.toSatisfy((error: unknown) =>
    error instanceof SceneTransportFaultError || error instanceof SceneTransportClosedError);
  transport.dispose();
  expect(['closed', 'disposed']).toContain(transport.status());
  return {
    seed: TWO_ROOM_SEED,
    clock: TWO_ROOM_CLOCK,
    outcomes: {
      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED',
      duplicate: duplicate.error.code, malformed: 'typed-fault', cleanup: 'terminal',
    },
    canonical: [open, ...correlated, invalid, unsupported, door, sameState],
  };
}
