import { describe, expect, it } from 'vitest';
import type { EncounterCommand } from '../../../src/combat/events';
import type { CombatantId } from '../../../src/combat/values';
import {
  EncounterSessionService,
  type EncounterSessionHostPort,
  type PlayerSeatRegistration,
  type SessionMutationOutcome,
} from '../../../src/vtt/encounter-session-service';
import {
  DmEncounterHost,
  type HostCoordinatorTransactionOutcome,
  type HostSnapshotNotification,
} from '../../../src/vtt/dm-encounter-host';
import type { PlayerBoardProjection, PlayerSeatBinding } from '../../../src/vtt/encounter-projections';
import {
  MemoryBrowserSessionStore,
  type MirrorSink,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';

class ControlledFlushStore extends MemoryBrowserSessionStore {
  #blocked: Promise<void> | null = null;
  #release: (() => void) | null = null;
  #nextFailure: Error | null = null;

  blockNextFlush(): () => void {
    this.#blocked = new Promise((resolve) => { this.#release = resolve; });
    return () => this.#release?.();
  }

  failNextFlush(error: Error): void {
    this.#nextFailure = error;
  }

  override async flush(): Promise<void> {
    const blocked = this.#blocked;
    this.#blocked = null;
    if (blocked !== null) await blocked;
    const failure = this.#nextFailure;
    this.#nextFailure = null;
    if (failure !== null) throw failure;
  }
}

class FaultInjectingStore extends ControlledFlushStore {
  #appendCountdown: number | null = null;

  failAppendIn(count: number): void {
    this.#appendCountdown = count;
  }

  override append(revision: SessionRevision): void {
    if (this.#appendCountdown !== null) {
      this.#appendCountdown -= 1;
      if (this.#appendCountdown === 0) {
        this.#appendCountdown = null;
        throw new Error('injected store append failure');
      }
    }
    super.append(revision);
  }
}

class FaultInjectingMirror implements MirrorSink {
  #appendCountdown: number | null = null;

  failAppendIn(count: number): void {
    this.#appendCountdown = count;
  }

  append(_revision: SessionRevision): void {
    if (this.#appendCountdown === null) return;
    this.#appendCountdown -= 1;
    if (this.#appendCountdown === 0) {
      this.#appendCountdown = null;
      throw new Error('injected mirror append failure');
    }
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
  it('publishes an autonomous snapshot only after its durability barrier', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-autonomous-durable', store);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const delivered: string[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'autonomous' || event.kind === 'mutation') delivered.push(event.kind);
    });
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    const release = store.blockNextFlush();
    void service.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(delivered).toEqual([]);
    release();
    await offerPromise;
    expect(delivered).toEqual(['autonomous']);
    service.close();
  });

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
    const dmMutations: number[] = [];
    const playerMutations: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') dmMutations.push(event.projection.encounter.revision);
    });
    service.subscribePlayer(offer.playerId, (event) => {
      if (event.kind === 'mutation') playerMutations.push(event.projection.revision);
    });
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
    expect(dmMutations).toEqual([]);
    expect(playerMutations).toEqual([]);
    release();
    const result = await resultPromise;
    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') throw new Error(`Expected commit, received ${result.kind}.`);
    expect(result.revision).toBe(pending.encounterRevision + 1);
    expect(result.event.kind).toBe('mutation');
    expect(result.event.projection.revision).toBe(result.revision);
    expect(dmMutations).toEqual([result.revision]);
    expect(playerMutations).toEqual([result.revision]);
    service.close();
  });

  it('publishes no mutation snapshot for a real coordinator refusal', async () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-real-refusal', store, {
      turnLegalActions: (state, actor) => {
        const other = state.combatants.find((combatant) => combatant.profile.id !== actor)?.profile.id;
        if (other === undefined) throw new Error('Expected a second combatant for refusal control.');
        return { actions: [{ type: 'end_turn', actor: other }] };
      },
    });
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected the deliberately invalid move offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the offered player seat.');
    const dmMutations: number[] = [];
    const playerMutations: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') dmMutations.push(event.projection.encounter.revision);
    });
    service.subscribePlayer(offer.playerId, (event) => {
      if (event.kind === 'mutation') playerMutations.push(event.projection.revision);
    });

    await expect(service.submitOfferedAction({
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[0]!,
    })).resolves.toMatchObject({ kind: 'refused', code: 'ENGINE_REFUSED' });
    expect(dmMutations).toEqual([]);
    expect(playerMutations).toEqual([]);
    expect(host.snapshot().dm.encounter.revision).toBe(pending.encounterRevision);
    service.close();
  });

  it.each(['append', 'mirror', 'flush'] as const)(
    'classifies a real post-application %s failure, emits recovery only, and closes queued work',
    async (failureMode) => {
      const store = new FaultInjectingStore();
      const mirror = new FaultInjectingMirror();
      const host = new DmEncounterHost(`session:service-post-${failureMode}`, store);
      host.connectBridgeMirror(mirror);
      const seats = registrations(host);
      const service = new EncounterSessionService(host, seats);
      const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
      void service.start();
      const offer = await offerPromise;
      const pending = offer.projection.pendingRequest;
      if (pending === null) throw new Error('Expected a real controller offer.');
      const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
      if (seat === undefined) throw new Error('Expected the offered player seat.');
      const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
      if (endTurnIndex < 0) throw new Error('Expected an end-turn offer.');
      if (failureMode === 'append') store.failAppendIn(2);
      if (failureMode === 'mirror') mirror.failAppendIn(2);
      if (failureMode === 'flush') store.failNextFlush(new Error('injected durability failure'));
      const notifications: string[] = [];
      service.subscribePlayer(offer.playerId, (event) => notifications.push(event.kind));
      notifications.length = 0;
      const mutation = {
        playerId: offer.playerId,
        tokenId: seat.controlledTokenIds[0]!,
        requestId: pending.requestId,
        encounterRevision: pending.encounterRevision,
        offeredActionId: pending.offeredActionIds[endTurnIndex]!,
      };

      const failed = service.submitOfferedAction(mutation);
      const queued = service.submitOfferedAction(mutation);
      await expect(failed).resolves.toMatchObject({ kind: 'failed', phase: 'post_apply' });
      await expect(queued).resolves.toEqual({ kind: 'closed' });
      expect(notifications).not.toContain('mutation');
      expect(notifications).toContain('recovery');
      expect(host.snapshot().dm.encounter.revision).toBe(pending.encounterRevision + 1);
      service.close();
    },
  );

  it('keeps the FIFO usable after a real pre-application append failure', async () => {
    const store = new FaultInjectingStore();
    const host = new DmEncounterHost('session:service-pre-apply-continues', store);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected a real controller offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the offered player seat.');
    const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
    if (endTurnIndex < 0) throw new Error('Expected an end-turn offer.');
    const mutation = {
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[endTurnIndex]!,
    };
    const mutations: number[] = [];
    service.subscribePlayer(offer.playerId, (event) => {
      if (event.kind === 'mutation') mutations.push(event.projection.revision);
    });
    store.failAppendIn(1);
    await expect(service.submitOfferedAction(mutation)).resolves.toMatchObject({
      kind: 'failed', phase: 'pre_apply',
    });
    expect(service.playerSnapshot(offer.playerId)?.pendingRequest?.requestId).toBe(pending.requestId);
    expect(mutations).toEqual([]);
    await expect(service.submitOfferedAction(mutation)).resolves.toMatchObject({
      kind: 'committed', revision: pending.encounterRevision + 1,
    });
    expect(mutations).toEqual([pending.encounterRevision + 1]);
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
      subscribeNotifications: (listener: Parameters<DmEncounterHost['subscribeNotifications']>[0]) =>
        real.subscribeNotifications(listener),
      start: () => real.start(),
      submitOfferedActionTransaction: async () => {
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
    let listener: ((notification: HostSnapshotNotification) => void) | null = null;
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
      subscribeNotifications: (next: Parameters<EncounterSessionHostPort['subscribeNotifications']>[0]) => {
        listener = next;
        next({ kind: 'status', snapshot: real.snapshot() });
        return () => { listener = null; };
      },
      start: async () => undefined,
      submitOfferedActionTransaction: async () => {
        const result = outcomes[calls];
        calls += 1;
        if (result === undefined) return { kind: 'closed' };
        if (result.kind === 'failed' && result.phase === 'post_apply') {
          projection = { ...projection, revision: result.currentRevision, pendingRequest: null };
          listener?.({ kind: 'recovery', snapshot: real.snapshot() });
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

  it('delivers immutable detached offers and dispatches only the internal authoritative command', async () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-detached-offers', store);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected a real controller offer.');
    const moveIndex = pending.legalActions.findIndex((action) => action.type === 'move');
    const move = pending.legalActions[moveIndex];
    if (moveIndex < 0 || move?.type !== 'move' || move.path[0] === undefined) {
      throw new Error('Expected a concrete offered movement path.');
    }
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the offered player seat.');
    const originalPath = structuredClone(move.path);
    expect(Object.isFrozen(pending.legalActions)).toBe(true);
    expect(Object.isFrozen(move.path[0])).toBe(true);
    expect(Reflect.set(move.path[0], 'column', 999)).toBe(false);
    const independent = service.playerSnapshot(offer.playerId)?.pendingRequest?.legalActions[moveIndex];
    expect(independent?.type === 'move' ? independent.path : null).toEqual(originalPath);

    await expect(service.submitOfferedAction({
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[moveIndex]!,
    })).resolves.toMatchObject({ kind: 'committed' });
    const applied = [...host.snapshot().dm.history].reverse().find(
      (entry) => entry.transition.kind === 'reducer_applied',
    );
    if (applied?.transition.kind !== 'reducer_applied' || applied.transition.command.type !== 'move') {
      throw new Error('Expected the authoritative movement command in the journal.');
    }
    expect(applied.transition.command.path).toEqual(originalPath);
    service.close();
  });

  it('isolates throwing DM and player subscribers after capturing all seats and settles queued work', async () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-subscriber-isolation', store);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected a real controller offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the offered player seat.');
    const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
    if (endTurnIndex < 0) throw new Error('Expected an end-turn offer.');
    const healthyDm: number[] = [];
    const healthyPlayer: number[] = [];
    let healthyHostSnapshots = 0;
    host.subscribe(() => { throw new Error('throwing host snapshot subscriber'); });
    host.subscribe(() => { healthyHostSnapshots += 1; });
    const hostSnapshotsBefore = healthyHostSnapshots;
    service.subscribeDm(() => { throw new Error('throwing DM subscriber'); });
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') healthyDm.push(event.projection.encounter.revision);
    });
    service.subscribePlayer(offer.playerId, () => { throw new Error('throwing player subscriber'); });
    service.subscribePlayer(offer.playerId, (event) => {
      if (event.kind === 'mutation') healthyPlayer.push(event.projection.revision);
    });
    const mutation = {
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[endTurnIndex]!,
    };

    const committed = service.submitOfferedAction(mutation);
    const queued = service.submitOfferedAction(mutation);
    await expect(committed).resolves.toMatchObject({ kind: 'committed' });
    await expect(queued).resolves.toMatchObject({ kind: 'refused', code: 'STALE_OFFER' });
    expect(healthyDm).toEqual([pending.encounterRevision + 1]);
    expect(healthyPlayer).toEqual([pending.encounterRevision + 1]);
    expect(service.subscriberErrors().map((failure) => failure.audience)).toEqual(
      expect.arrayContaining(['dm', 'player']),
    );
    expect(healthyHostSnapshots).toBeGreaterThan(hostSnapshotsBefore);
    expect(host.subscriberErrors().some((failure) => failure.channel === 'snapshot')).toBe(true);
    service.close();
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
