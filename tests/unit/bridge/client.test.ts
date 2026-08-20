import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { codexSessionId, encounterSessionId } from '../../../src/combat/values';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  type DmBridgeRequest,
} from '../../../src/vtt/dm-bridge/contracts';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  LocalhostDmBridgeClient,
  type BridgeFetch,
} from '../../../src/vtt/dm-bridge/client';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
import {
  REFERENCE_CLERIC_ID,
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_WIZARD_ID,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import type { SessionRevision } from '../../../src/vtt/session-persistence';

function response(ok: boolean, status: number, body: unknown) {
  return { ok, status, json: async () => body };
}

describe('localhost bridge client and failure containment', () => {
  it('HOST-DM-CONTROLLER executes a monster turn through the shared round-plan bridge', async () => {
    let state = reduceEncounter(
      createEncounter(referenceEncounterSetup()),
      { type: 'roll_initiative' },
      () => 0.5,
    ).state;
    for (const actor of [REFERENCE_FIGHTER_ID, REFERENCE_CLERIC_ID, REFERENCE_WIZARD_ID]) {
      state = reduceEncounter(state, { type: 'end_turn', actor }, () => 0.5).state;
    }
    expect(state.activeCombatant).toBe(REFERENCE_MONSTER_ID);
    const requests: DmBridgeRequest[] = [];
    const mirrored: SessionRevision[] = [];
    const bridge = {
      append(revision: SessionRevision) {
        mirrored.push(revision);
      },
      async exchange(request: DmBridgeRequest) {
        requests.push(request);
        return {
          kind: 'round_plan',
          protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
          encounterId: request.encounterId,
          requestId: request.requestId,
          expectedRevision: request.expectedRevision,
          round: request.round,
          monsters: [{
            monsterId: REFERENCE_MONSTER_ID,
            program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          }],
        };
      },
    };
    const host = new DmEncounterHost('session:host-dm-controller', new MemoryBrowserSessionStore(), {
      initialState: state,
      bridge,
      codexSessionId: codexSessionId('019c-host-persisted-thread'),
    });
    host.start();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      kind: 'round_plan_request',
      codexSessionId: '019c-host-persisted-thread',
      livingMonsterIds: [REFERENCE_MONSTER_ID],
    });
    expect(host.snapshot().dm.encounter.activeCombatant).toBe(REFERENCE_FIGHTER_ID);
    expect(mirrored.map((revision) => revision.transition.kind)).toContain('reducer_applied');
    host.close();
  });

  it('HOST-CORRECTION-EXHAUSTION exports and aborts after two malformed same-session corrections', async () => {
    let state = reduceEncounter(
      createEncounter(referenceEncounterSetup()),
      { type: 'roll_initiative' },
      () => 0.5,
    ).state;
    for (const actor of [REFERENCE_FIGHTER_ID, REFERENCE_CLERIC_ID, REFERENCE_WIZARD_ID]) {
      state = reduceEncounter(state, { type: 'end_turn', actor }, () => 0.5).state;
    }
    const requests: DmBridgeRequest[] = [];
    const store = new MemoryBrowserSessionStore();
    const bridge = {
      append(_revision: SessionRevision) {},
      async exchange(request: DmBridgeRequest) {
        requests.push(request);
        return {
          kind: 'round_plan',
          requestId: request.requestId,
          expectedRevision: request.expectedRevision,
          commands: [{ type: 'end_turn', actor: REFERENCE_MONSTER_ID }],
        };
      },
    };
    const host = new DmEncounterHost('session:host-correction-exhaustion', store, {
      initialState: state,
      bridge,
      codexSessionId: codexSessionId('019c-correction-session'),
    });
    host.start();
    for (let attempt = 0; attempt < 20 && host.bridgeFailureReport() === null; attempt += 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    expect(requests.map((request) => request.correctionAttempt)).toEqual([0, 1, 2]);
    expect(new Set(requests.map((request) => request.codexSessionId))).toEqual(
      new Set([codexSessionId('019c-correction-session')]),
    );
    expect(host.bridgeFailureReport()).toMatchObject({
      kind: 'bridge_export_and_abort',
      error: expect.stringContaining('failed after 2 corrections'),
    });
    expect(host.bridgeFailureReport()?.exportedSession).toContain('"kind":"coordinator_paused"');
    expect(host.snapshot().player.authorityStatus).toBe('hard_paused');
    host.close();
  });

  it('MIRROR-CLIENT-ORDER posts each queued authoritative revision in append order', async () => {
    const bodies: unknown[] = [];
    const bridgeFetch: BridgeFetch = async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return response(true, 200, { result: 'appended' });
    };
    const failures: unknown[] = [];
    const client = new LocalhostDmBridgeClient('http://127.0.0.1:43173', bridgeFetch, (error) => failures.push(error));
    const host = new DmEncounterHost('session:mirror-order', new MemoryBrowserSessionStore());
    host.connectBridgeMirror(client);
    await client.flushMirror();

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ revision: 1, transition: { kind: 'session_started' } });
    expect(failures).toEqual([]);
    host.close();
  });

  it('BRIDGE-FAILURE-EXPORT-AND-ABORT exports the browser authority then hard-stops the encounter', async () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:bridge-failure', store);
    const bridgeFetch: BridgeFetch = async () => response(false, 503, { error: 'bridge_down' });
    const client = new LocalhostDmBridgeClient(
      'http://localhost:43173',
      bridgeFetch,
      (error) => host.exportAndAbortAfterBridgeFailure(error),
    );
    host.connectBridgeMirror(client);

    await expect(client.flushMirror()).rejects.toThrow('HTTP 503');
    const report = host.bridgeFailureReport();
    expect(report).toMatchObject({
      kind: 'bridge_export_and_abort',
      sessionId: host.sessionId,
      error: 'DM bridge mirror failed with HTTP 503.',
    });
    expect(report?.exportedSession).toContain('"format":"vtt-session-revisions"');
    expect(report?.exportedSession).toContain('"kind":"coordinator_paused"');
    expect(host.snapshot().dm.coordinator.pause).toEqual({ kind: 'interrupted' });
    expect(host.snapshot().player.authorityStatus).toBe('hard_paused');
    expect(store.revisions(host.sessionId).map((revision) => revision.transition.kind)).toEqual([
      'session_started',
      'coordinator_paused',
    ]);
    host.close();
  });

  it('LOCALHOST-ONLY refuses remote bridge origins', () => {
    const bridgeFetch: BridgeFetch = async () => response(true, 200, {});
    expect(() => new LocalhostDmBridgeClient('https://bridge.example.test', bridgeFetch, () => undefined)).toThrow('localhost');
  });

  it('SESSION-BOOTSTRAP decodes the real persisted Codex session id before host creation', async () => {
    const bridgeFetch: BridgeFetch = async (url) => {
      expect(url).toBe('http://127.0.0.1:43173/dm/session');
      return response(true, 200, { reply: { codexSessionId: '019c-fake-persisted-thread' } });
    };
    const client = new LocalhostDmBridgeClient('http://127.0.0.1:43173', bridgeFetch, () => undefined);
    await expect(client.createSession(
      encounterSessionId('encounter:session-bootstrap'),
      new AbortController().signal,
    )).resolves.toBe('019c-fake-persisted-thread');
  });

  it('FLEET-TELEMETRY accepts canonical model usage from the bridge response', async () => {
    const telemetry: unknown[] = [];
    const bridgeFetch: BridgeFetch = async () => response(true, 200, {
      reply: { kind: 'round_plan' },
      telemetry: {
        modelId: 'gpt-5.6-terra',
        reasoningEffort: 'medium',
        buildId: 'bridge-build-17',
        commit: 'abc123',
        loadLevelTag: 'playable-exit',
        latencyMs: 42,
        tokenCounts: { input: 120, cachedInput: 80, output: 30, reasoning: 12 },
        correctionAttempts: 1,
      },
    });
    const client = new LocalhostDmBridgeClient(
      'http://127.0.0.1:43173',
      bridgeFetch,
      () => undefined,
      (value) => telemetry.push(value),
    );
    const request = {
      kind: 'round_plan_request',
      model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
    } as unknown as DmBridgeRequest;
    await client.exchange(request, new AbortController().signal);
    expect(telemetry).toEqual([{
      modelId: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
      buildId: 'bridge-build-17',
      commit: 'abc123',
      loadLevelTag: 'playable-exit',
      latencyMs: 42,
      tokenCounts: { input: 120, cachedInput: 80, output: 30, reasoning: 12 },
      correctionAttempts: 1,
    }]);
  });
});
