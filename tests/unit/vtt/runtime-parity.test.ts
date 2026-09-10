import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from '../../helpers/test-filesystem';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocketSceneTransport } from '../../../src/vtt/handoff/websocket-transport';
import {
  createVttNodeRuntime, type VttNodeRuntime,
} from '../../../tools/vtt-handoff/node-runtime';
import {
  createInProcessConformanceTransport, runDmTransportConformance, TRANSPORT_CONFORMANCE_SCENARIOS,
} from '../../helpers/vtt-handoff/transport-conformance';

const roots: string[] = [];
const runtimes: VttNodeRuntime[] = [];

function tokenFile(token: string): string {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-runtime-parity-'));
  roots.push(root);
  const path = resolve(root, 'tokens.json');
  writeFileSync(path, JSON.stringify([{ tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' }]), { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()));
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function canonicalWithoutSessionIdentity(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalWithoutSessionIdentity);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    key === 'sessionId' || key === 'sceneId' ? '<logical-session>' : canonicalWithoutSessionIdentity(child),
  ]));
}

describe('fixed two-room runtime parity', () => {
  it('runs the shared independent conformance assertions through in-process and WebSocket adapters', async () => {
    expect(TRANSPORT_CONFORMANCE_SCENARIOS).toHaveLength(16);
    const inProcess = createInProcessConformanceTransport();
    const inProcessResultPromise = runDmTransportConformance(inProcess.transport);
    await inProcess.start();
    const inProcessResult = await inProcessResultPromise;

    const token = 'runtime-parity-secret';
    const nodeRuntime = createVttNodeRuntime({ tokensFile: tokenFile(token), allowedOrigins: new Set(), allowOriginless: true });
    runtimes.push(nodeRuntime);
    const address = await nodeRuntime.listen(0);
    const websocketResult = await runDmTransportConformance(new WebSocketSceneTransport(address.websocketUrl, token));

    expect(websocketResult.seed).toBe(603_020_001);
    expect(websocketResult.clock).toBe('2026-09-09T12:00:00.000Z');
    expect(websocketResult.canonical.map((response) => ({
      id: response.id,
      ok: response.ok,
      code: response.ok ? null : response.error.code,
    }))).toEqual(inProcessResult.canonical.map((response) => ({
      id: response.id,
      ok: response.ok,
      code: response.ok ? null : response.error.code,
    })));
    expect(canonicalWithoutSessionIdentity(websocketResult.canonical))
      .toEqual(canonicalWithoutSessionIdentity(inProcessResult.canonical));
    expect(websocketResult.outcomes).toMatchObject({
      open: 'ok', correlation: 'ok', structuralValidation: 'INVALID_REQUEST',
      doorChange: 'committed', doorNoOp: 'committed', light: 'UNSUPPORTED', malformed: 'typed-fault',
    });
    expect(nodeRuntime.sessionCounts()).toEqual({ created: 1, active: 0 });
  });
});
