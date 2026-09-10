import { describe, expect, it } from 'vitest';
import type { EncounterCommand } from '../../../src/combat/events';
import type { CombatantId } from '../../../src/combat/values';
import {
  EncounterSessionService,
  type EncounterSessionHostPort,
  type PlayerSeatRegistration,
  type SessionMutationOutcome,
} from '../../../src/vtt/encounter-session-service';
import { DmEncounterHost, type HostCoordinatorTransactionOutcome } from '../../../src/vtt/dm-encounter-host';
import type { PlayerBoardProjection, PlayerSeatBinding } from '../../../src/vtt/encounter-projections';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

class ControlledFlushStore extends MemoryBrowserSessionStore {
  #blocked: Promise<void> | null = null;
  #release: (() => void) | null = null;

  blockNextFlush(): () => void {
    this.#blocked = new Promise((resolve) => { this.#release = resolve; });
    return () => this.#release?.();
  }

  override async flush(): Promise<void> {
    const blocked = this.#blocked;
    this.#blocked = null;
    if (blocked !== null) await blocked;
  }
}

function registrations(host: DmEncounterHost): readonly PlayerSeatRegistration[] {
  const state = host.snapshot().dm.encounter;
  const tokens = host.rendererTokenBindings();
  return state.combatants.map((combatant) => {
    const token = tokens.find((candidate) => candidate.combatantId === combatant.id);
    if (token === undefined) throw new Error(`Missing token for ${combatant.id}.`);
    return {
      playerId: `player:${combatant.id}`,
      seatId: `seat:${combatant.id}`,
      observerCombatantId: combatant.id,
      ownedCombatantIds: [combatant.id],
      controlledTokenIds: [token.tokenId],
    };
  });
}

function waitForOffer(
  service: EncounterSessionService,
  playerIds: readonly string[],
): Promise<{ readonly playerId: string; readonly projection: PlayerBoardProjection }> {
  return new Promise((resolve, reject) => {
    const unsubscribers: Array<() => void> = [];
    const timeout = setTimeout(() => {
      for (const unsubscribe of unsubscribers) unsubscribe();
      reject(new Error('Timed out waiting for a player offer.'));
    }, 2_000);
    for (const playerId of playerIds) {
      const subscription = service.subscribePlayer(playerId, (event) => {
        if (event.projection.pendingRequest === null) return;
        clearTimeout(timeout);
        for (const unsubscribe of unsubscribers) unsubscribe();
        resolve({ playerId, projection: event.projection });
      });
      if (subscription.kind === 'subscribed') unsubscribers.push(subscription.unsubscribe);
    }
  });
}

describe('encounter session service', () => {
  it('acknowledges the exact consuming revision only after durable flush', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-durable-commit', store);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected pending player request.');
    const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
    if (endTurnIndex < 0) throw new Error('Expected an offered end-turn action.');
    const release = store.blockNextFlush();
    let settled = false;
    const resultPromise = service.submitOfferedAction({
      playerId: offer.playerId,
      tokenId: seats.find((seat) => seat.playerId === offer.playerId)!.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[endTurnIndex]!,
    }).then((result) => { settled = true; return result; });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    const result = await resultPromise;
    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') throw new Error(`Expected commit, received ${result.kind}.`);
    expect(result.revision).toBe(pending.encounterRevision + 1);
    expect(result.event.projection.revision).toBe(result.revision);
    service.close();
  });

  it('refuses missing identity and cross-seat token before reading state or emitting an event', async () => {
    const memory = new MemoryBrowserSessionStore();
    const real = new DmEncounterHost('session:service-auth-boundary', memory);
    const [first, second] = registrations(real);
    if (first === undefined || second === undefined) throw new Error('Expected two authority seats.');
    let playerReads = 0;
    let submissions = 0;
    const host = {
      sessionId: real.sessionId,
      snapshot: () => real.snapshot(),
      playerSnapshot: (binding: PlayerSeatBinding) => {
        playerReads += 1;
        return real.playerSnapshot(binding);
      },
      rendererTokenBindings: () => real.rendererTokenBindings(),
      subscribe: (listener: Parameters<DmEncounterHost['subscribe']>[0]) => real.subscribe(listener),
      start: () => real.start(),
      submitHumanDecisionTransaction: async () => {
        submissions += 1;
        return { kind: 'closed' } as const;
      },
      setDoorOpen: (doorId, open) => real.setDoorOpen(doorId, open),
      close: () => real.close(),
    } satisfies EncounterSessionHostPort;
    const service = new EncounterSessionService(host, [first, second]);
    playerReads = 0;
    const deniedEvents: unknown[] = [];

    await expect(service.submitOfferedAction({
      tokenId: first.controlledTokenIds[0]!, requestId: 'missing', encounterRevision: 0,
      offeredActionId: 'missing',
    })).resolves.toMatchObject({ kind: 'refused', code: 'UNAUTHORIZED' });
    await expect(service.submitOfferedAction({
      playerId: first.playerId, tokenId: second.controlledTokenIds[0]!, requestId: 'cross-seat',
      encounterRevision: 0, offeredActionId: 'cross-seat',
    })).resolves.toMatchObject({ kind: 'refused', code: 'FORBIDDEN' });
    expect(service.subscribePlayer('unknown-player', (event) => deniedEvents.push(event)))
      .toEqual({ kind: 'refused', code: 'UNAUTHORIZED' });
    expect({ playerReads, submissions, deniedEvents }).toEqual({
      playerReads: 0, submissions: 0, deniedEvents: [],
    });
    service.close();
  });

  it('serializes FIFO and gives every noncommitted path a terminal outcome without a mutation event', async () => {
    const memory = new MemoryBrowserSessionStore();
    const real = new DmEncounterHost('session:service-terminal-outcomes', memory);
    const seat = registrations(real)[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');
    const base = real.playerSnapshot(seat);
    const action: EncounterCommand = { type: 'end_turn', actor: seat.observerCombatantId };
    const pending: NonNullable<PlayerBoardProjection['pendingRequest']> = {
      kind: 'turn', requestId: 'request:terminal', encounterRevision: base.revision,
      actorId: seat.observerCombatantId, legalActions: [action],
      offeredActionIds: ['request:terminal:option:0'],
    };
    let projection: PlayerBoardProjection = { ...base, pendingRequest: pending };
    let listener: Parameters<EncounterSessionHostPort['subscribe']>[0] | null = null;
    const outcomes: HostCoordinatorTransactionOutcome[] = [
      { kind: 'refused', reason: 'engine refusal' },
      { kind: 'cancelled', reason: 'controller cancelled' },
      { kind: 'failed', phase: 'pre_apply', error: new Error('pre'), currentRevision: base.revision },
      { kind: 'failed', phase: 'post_apply', error: new Error('post'), currentRevision: base.revision + 1 },
    ];
    let calls = 0;
    const host = {
      sessionId: real.sessionId,
      snapshot: () => real.snapshot(),
      playerSnapshot: () => projection,
      rendererTokenBindings: () => real.rendererTokenBindings(),
      subscribe: (next: Parameters<EncounterSessionHostPort['subscribe']>[0]) => {
        listener = next;
        next(real.snapshot());
        return () => { listener = null; };
      },
      start: async () => undefined,
      submitHumanDecisionTransaction: async () => {
        const result = outcomes[calls];
        calls += 1;
        if (result === undefined) return { kind: 'closed' };
        if (result.kind === 'failed' && result.phase === 'post_apply') {
          projection = { ...projection, revision: result.currentRevision, pendingRequest: null };
          listener?.(real.snapshot());
        }
        return result;
      },
      setDoorOpen: (doorId, open) => real.setDoorOpen(doorId, open),
      close: () => real.close(),
    } satisfies EncounterSessionHostPort;
    const service = new EncounterSessionService(host, [seat]);
    const mutation = (signal?: AbortSignal) => service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[0]!,
      ...(signal === undefined ? {} : { signal }),
    });

    const aborted = new AbortController();
    aborted.abort();
    await expect(mutation(aborted.signal)).resolves.toEqual({
      kind: 'cancelled', reason: 'The queued mutation was cancelled before apply.',
    });
    expect(calls).toBe(0);

    const first = mutation();
    const second = mutation();
    const [refused, cancelled] = await Promise.all([first, second]);
    expect([refused.kind, cancelled.kind]).toEqual(['refused', 'cancelled']);
    expect([calls]).toEqual([2]);
    const failedPre = await mutation();
    const failedPost = await mutation();
    expect(failedPre).toMatchObject({ kind: 'failed', phase: 'pre_apply' });
    expect(failedPost).toMatchObject({ kind: 'failed', phase: 'post_apply' });
    expect('event' in refused).toBe(false);
    expect('event' in cancelled).toBe(false);
    expect('event' in failedPre).toBe(false);
    expect('event' in failedPost).toBe(false);

    const closedAfterDegrade = await mutation(aborted.signal);
    expect(closedAfterDegrade).toEqual({ kind: 'closed' });
    service.close();
  });

  it('settles queued work as closed when the service closes', async () => {
    const memory = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-close', memory);
    const seat = registrations(host)[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');
    const service = new EncounterSessionService(host, [seat]);
    service.close();
    await expect(service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: 'closed', encounterRevision: 0, offeredActionId: 'closed',
    })).resolves.toEqual({ kind: 'closed' });
  });

  it('rejects overlapping authoritative seat ownership at construction', () => {
    const memory = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-overlapping-seats', memory);
    const seat = registrations(host)[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');

    expect(() => new EncounterSessionService(host, [
      seat,
      { ...seat, playerId: 'player:duplicate', seatId: 'seat:duplicate' },
    ])).toThrow(`Combatant ${seat.observerCombatantId} is assigned to both`);
    host.close();
  });
});
