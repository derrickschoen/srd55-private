import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { ControllerRequestCancelledError, type ControllerIdentity } from '../../../src/combat/controllers';
import { agentSessionId } from '../../../src/combat/values';
import type { DmBridgeRequest } from '../../../src/vtt/dm-bridge/contracts';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import type { AdjudicationEnvelope } from '../../../src/vtt/mcp/engine-server';
import {
  REFERENCE_CLERIC_ID,
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_PLAYER_IDS,
  REFERENCE_WIZARD_ID,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import { MemoryBrowserSessionStore, type SessionRevision } from '../../../src/vtt/session-persistence';

function identities(): readonly ControllerIdentity[] {
  return [...REFERENCE_PLAYER_IDS, REFERENCE_MONSTER_ID].map((combatantId) => ({
    combatantId,
    controllerId: `${combatantId}:${combatantId === REFERENCE_MONSTER_ID ? 'agent' : 'human'}:test`,
    kind: combatantId === REFERENCE_MONSTER_ID ? 'agent' as const : 'human' as const,
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

async function settleUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  throw new Error('Timed out waiting for host integration state.');
}

describe('engine host adjudication and DM control integration', () => {
  it('journals an engine adjudication request, restores its tray entry, and applies only the DM verdict', () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:engine-adjudication', store);
    const snapshot = host.snapshot();
    const latest = snapshot.dm.history.at(-1);
    if (latest === undefined) throw new Error('Host needs an initial journal revision.');
    const before = snapshot.dm.encounter.combatants.find((entry) => entry.id === REFERENCE_MONSTER_ID)?.hitPoints;
    if (before === undefined) throw new Error('Host needs the reference monster.');
    const request: AdjudicationEnvelope = {
      adjudicationRequestId: 'adjudication:engine-request-0001',
      runId: host.sessionId,
      branchId: latest.branchId,
      requestId: 'request:engine-turn',
      expectedRevision: latest.revision,
      stateDigest: 'a'.repeat(64),
      stateHandle: `engine-state:${'b'.repeat(64)}`,
      actorId: REFERENCE_MONSTER_ID,
      subject: 'Ambiguous terrain consequence',
      reason: 'The engine has no modeled consequence.',
      blocking: true,
      suggestedOutcomes: ['Deal 999 damage'],
      idempotencyKey: 'adjudication-idempotency-0001',
    };

    host.engineAdjudicationSink().append(request);
    expect(host.snapshot().dm.decisionTray.entries).toContainEqual(expect.objectContaining({
      kind: 'engine_adjudication',
      request: expect.objectContaining({ adjudicationRequestId: request.adjudicationRequestId }),
    }));
    expect(host.snapshot().dm.coordinator.pause?.kind).toBe('interrupted');
    expect(host.snapshot().dm.history.map((entry) => entry.transition.kind)).toContain('engine_adjudication_requested');

    host.close();
    const restored = new DmEncounterHost('session:engine-adjudication', store);
    expect(restored.snapshot().dm.decisionTray.entries).toContainEqual(expect.objectContaining({
      kind: 'engine_adjudication',
      request: expect.objectContaining({ adjudicationRequestId: request.adjudicationRequestId }),
    }));

    restored.resolveEngineAdjudication(
      request.adjudicationRequestId,
      { kind: 'hit_point_delta', amount: -1 },
      'The DM rules that only one point is lost.',
    );
    const after = restored.snapshot();
    expect(after.dm.encounter.combatants.find((entry) => entry.id === REFERENCE_MONSTER_ID)?.hitPoints)
      .toBe(before - 1);
    expect(after.dm.encounter.recentEvents.at(-1)).toMatchObject({
      type: 'adjudicated',
      reasoning: 'The DM rules that only one point is lost.',
    });
    expect(after.dm.decisionTray.entries.some((entry) =>
      entry.kind === 'engine_adjudication')).toBe(false);
    expect(after.dm.history.map((entry) => entry.transition.kind)).toEqual(expect.arrayContaining([
      'reducer_applied',
      'engine_adjudication_resolved',
    ]));
    restored.close();
  });

  it('takes over an in-flight agent request immediately and completes handback only after the human transaction', async () => {
    let state = reduceEncounter(
      createEncounter(referenceEncounterSetup()),
      { type: 'roll_initiative' },
      () => 0.5,
    ).state;
    for (const actor of [REFERENCE_FIGHTER_ID, REFERENCE_CLERIC_ID, REFERENCE_WIZARD_ID]) {
      state = reduceEncounter(state, { type: 'end_turn', actor }, () => 0.5).state;
    }
    const requests: DmBridgeRequest[] = [];
    const bridge = {
      append(_revision: SessionRevision) {},
      exchange(request: DmBridgeRequest, signal: AbortSignal): Promise<never> {
        requests.push(request);
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(
            new ControllerRequestCancelledError('SIMULATED takeover cancelled the agent request.'),
          ), { once: true });
        });
      },
    };
    const host = new DmEncounterHost('session:engine-takeover', new MemoryBrowserSessionStore(), {
      initialState: state,
      initialControllers: identities(),
      bridge,
      agentSession: {
        cli: 'codex',
        sessionId: agentSessionId('agent-session:takeover'),
        adapterVersion: 4,
      },
    });

    void host.start();
    await settleUntil(() => requests.length === 1);
    host.takeOverController(REFERENCE_MONSTER_ID);
    await settleUntil(() => host.snapshot().dm.pendingRequest?.actorId === REFERENCE_MONSTER_ID);

    expect(host.snapshot().dm.controllers).toContainEqual(expect.objectContaining({
      combatantId: REFERENCE_MONSTER_ID,
      kind: 'human',
    }));
    expect(host.snapshot().dm.history.map((entry) => entry.transition.kind)).toEqual(expect.arrayContaining([
      'controller_request_cancelled',
      'dm_takeover_started',
    ]));

    host.handBackController(REFERENCE_MONSTER_ID);
    expect(host.snapshot().dm.controllers).toContainEqual(expect.objectContaining({
      combatantId: REFERENCE_MONSTER_ID,
      kind: 'human',
    }));
    expect(host.snapshot().dm.history.map((entry) => entry.transition.kind)).toContain('dm_handback_requested');

    const pending = host.snapshot().dm.pendingRequest;
    if (pending === null) throw new Error('DM takeover needs the human controller request.');
    host.submitHumanDecision(REFERENCE_MONSTER_ID, {
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      action: { type: 'end_turn', actor: REFERENCE_MONSTER_ID },
    });
    await settleUntil(() => host.snapshot().dm.controllers.some((entry) =>
      entry.combatantId === REFERENCE_MONSTER_ID && entry.kind === 'agent'));

    expect(host.snapshot().dm.history.map((entry) => entry.transition.kind)).toContain('dm_handback_completed');
    const takeoverRevision = host.snapshot().dm.history.find((entry) =>
      entry.transition.kind === 'dm_takeover_started')?.revision ?? 0;
    const handbackRevision = host.snapshot().dm.history.find((entry) =>
      entry.transition.kind === 'dm_handback_completed')?.revision ?? 0;
    const humanReducerRevision = host.snapshot().dm.history.find((entry) =>
      entry.revision > takeoverRevision && entry.transition.kind === 'reducer_applied')?.revision ?? 0;
    expect(handbackRevision).toBeGreaterThan(humanReducerRevision);
    host.close();
  });
});
