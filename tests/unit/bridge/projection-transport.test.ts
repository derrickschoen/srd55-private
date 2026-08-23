import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { projectDmView } from '../../../src/combat/visibility';
import { codexSessionId, encounterSessionId } from '../../../src/combat/values';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { LocalhostDmBridgeClient, type BridgeFetch } from '../../../src/vtt/dm-bridge/client';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  ROUND_PLAN_REPLY_CONTRACT,
  type RoundPlanRequest,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  ProjectionTransferReceiver,
  ProjectionTransferSender,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function state(round: number, revision: number): EncounterState {
  const monster = monsterProfile('delta-monster');
  const player = playerProfile('delta-player');
  const base = createEncounter({
    bounds: { columns: 8, rows: 2 },
    combatants: [monster, player],
    tokens: [placedToken(monster, 0), placedToken(player, 4)],
  });
  return { ...base, round, revision, activeCombatant: monster.id };
}

function request(encounterState: EncounterState): RoundPlanRequest {
  const projection = projectDmBoard({
    view: projectDmView(encounterState),
    coordinator: IDLE,
    controllers: [],
    history: [],
  });
  return {
    kind: 'round_plan_request',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: encounterSessionId('encounter:delta'),
    requestId: `request:${encounterState.round}:${encounterState.revision}`,
    expectedRevision: encounterState.revision,
    round: encounterState.round,
    codexSessionId: codexSessionId('codex:delta'),
    model: { model: 'fake', reasoningEffort: 'low' },
    projection,
    history: [],
    livingMonsterIds: projection.encounter.combatants
      .filter((candidate) => candidate.kind === 'monster')
      .map((candidate) => candidate.id),
    surface: 'json_ast',
    replyContract: ROUND_PLAN_REPLY_CONTRACT,
    correctionAttempt: 0,
  };
}

describe('E04 revision-addressed projection transport', () => {
  it('DELTA-RECONSTRUCTION-HASH reconstructs the same canonical full projection before use', () => {
    const sender = new ProjectionTransferSender();
    const receiver = new ProjectionTransferReceiver();
    const first = request(state(1, 4));
    const second = request(state(2, 9));
    const firstResult = receiver.reconstruct(sender.encode(first));
    expect(firstResult.kind).toBe('reconstructed');
    const wire = sender.encode(second);
    expect(wire.projectionTransfer).toMatchObject({
      kind: 'projection_delta',
      baseRevision: 4,
      revision: 9,
    });
    const result = receiver.reconstruct(wire);
    expect(result.kind).toBe('reconstructed');
    if (result.kind !== 'reconstructed') throw new Error('Expected reconstructed delta.');
    expect(canonicalJson(result.request.projection)).toBe(canonicalJson(second.projection));
  });

  it('delta_skips_hash_refusal: requests a full snapshot when corrupted delta bytes miss the full-projection hash', () => {
    const sender = new ProjectionTransferSender();
    const receiver = new ProjectionTransferReceiver();
    receiver.reconstruct(sender.encode(request(state(1, 1))));
    const valid = sender.encode(request(state(2, 2)));
    if (valid.projectionTransfer.kind !== 'projection_delta') throw new Error('Expected a delta transfer.');
    const tampered = {
      ...valid,
      projectionTransfer: {
        ...valid.projectionTransfer,
        stateHash: '0'.repeat(64),
      },
    };
    expect(receiver.reconstruct(tampered)).toEqual({
      kind: 'full_projection_required',
      encounterId: encounterSessionId('encounter:delta'),
      expectedRevision: 2,
    });
    expect(receiver.reconstructionFailures()).toBe(1);
  });

  it('DELTA-MISMATCH-FALLBACK retries the same logical request with a full snapshot and counts telemetry', async () => {
    const receiver = new ProjectionTransferReceiver();
    let calls = 0;
    const bridgeFetch: BridgeFetch = async (_url, init) => {
      calls += 1;
      const wire: ReturnType<ProjectionTransferSender['encode']> = JSON.parse(init.body);
      const candidate = calls === 2 && wire.projectionTransfer.kind === 'projection_delta'
        ? {
            ...wire,
            projectionTransfer: { ...wire.projectionTransfer, stateHash: 'f'.repeat(64) },
          }
        : wire;
      const reconstructed = receiver.reconstruct(candidate);
      if (reconstructed.kind === 'full_projection_required') {
        return { ok: true, status: 200, json: async () => reconstructed };
      }
      return { ok: true, status: 200, json: async () => ({ reply: { marker: reconstructed.request.requestId } }) };
    };
    const client = new LocalhostDmBridgeClient(
      'http://127.0.0.1:43173',
      bridgeFetch,
      () => undefined,
      () => undefined,
      'revision_delta',
    );
    await client.exchange(request(state(1, 1)), new AbortController().signal);
    await expect(client.exchange(request(state(2, 2)), new AbortController().signal)).resolves.toEqual({ marker: 'request:2:2' });
    expect(calls).toBe(3);
    expect(client.projectionTransportTelemetry()).toMatchObject({
      fullSnapshots: 2,
      deltaSnapshots: 1,
      reconstructionFailures: 1,
    });
  });

  it('DELTA-BYTE-IDENTICAL-REPLAY reproduces identical request bytes across independent transports', () => {
    const requests = [request(state(1, 1)), request(state(2, 3)), request(state(3, 7))];
    const replay = () => {
      const sender = new ProjectionTransferSender();
      const receiver = new ProjectionTransferReceiver();
      return requests.map((entry) => {
        const result = receiver.reconstruct(sender.encode(entry));
        if (result.kind !== 'reconstructed') throw new Error('Deterministic replay requested fallback.');
        return canonicalJson(result.request);
      });
    };
    expect(replay()).toEqual(replay());
    expect(replay()).toEqual(requests.map((entry) => canonicalJson(entry)));
  });

  it('FULL-PROJECTION-DEFAULT keeps the existing transport bytes unchanged', async () => {
    const bodies: string[] = [];
    const bridgeFetch: BridgeFetch = async (_url, init) => {
      bodies.push(init.body);
      return { ok: true, status: 200, json: async () => ({ reply: { kind: 'fake' } }) };
    };
    const client = new LocalhostDmBridgeClient('http://localhost:43173', bridgeFetch, () => undefined);
    const full = request(state(2, 8));
    await client.exchange(full, new AbortController().signal);
    expect(bodies).toEqual([JSON.stringify(full)]);
    expect(client.projectionTransportTelemetry()).toEqual({
      bytesSent: 0,
      snapshotBytes: 0,
      deltaBytes: 0,
      fullSnapshots: 0,
      deltaSnapshots: 0,
      reconstructionFailures: 0,
    });
  });
});
