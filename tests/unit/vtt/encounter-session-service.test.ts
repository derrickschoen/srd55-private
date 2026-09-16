import { describe, expect, it, vi } from 'vitest';
import type { EncounterCommand } from '../../../src/combat/events';
import {
  createEncounter,
  reduceEncounter,
  REACTION_KINDS,
  type EncounterState,
  type MigrationAdjudicationPending,
} from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  armorClass,
  damageType,
  dieSides,
  worldObjectId,
  type CombatantId,
} from '../../../src/combat/values';
import {
  EncounterSessionService,
  RichEncounterSessionService,
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
import type { PartySessionState } from '../../../src/vtt/party-session-state';
import { DEFAULT_REFUSAL_HANDLING_SETTINGS } from '../../../src/vtt/refusal-handling';
import {
  MemoryBrowserSessionStore,
  type MirrorSink,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import {
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

class ControlledFlushStore extends MemoryBrowserSessionStore {
  #blocked: Promise<void> | null = null;
  #release: (() => void) | null = null;
  #blockCountdown: number | null = null;
  #markReached: (() => void) | null = null;
  #markCompleted: (() => void) | null = null;
  #nextFailure: Error | null = null;

  blockNextFlush(): () => void {
    return this.blockFlushIn(1).release;
  }

  blockFlushIn(count: number): {
    readonly reached: Promise<void>;
    readonly completed: Promise<void>;
    readonly release: () => void;
  } {
    if (count < 1 || !Number.isSafeInteger(count)) throw new RangeError('Flush count must be positive.');
    this.#blockCountdown = count;
    this.#blocked = new Promise((resolve) => { this.#release = resolve; });
    const reached = new Promise<void>((resolve) => { this.#markReached = resolve; });
    const completed = new Promise<void>((resolve) => { this.#markCompleted = resolve; });
    return { reached, completed, release: () => this.#release?.() };
  }

  failNextFlush(error: Error): void {
    this.#nextFailure = error;
  }

  override async flush(): Promise<void> {
    if (this.#blockCountdown !== null) {
      this.#blockCountdown -= 1;
      if (this.#blockCountdown === 0) {
        this.#blockCountdown = null;
        const blocked = this.#blocked;
        this.#blocked = null;
        this.#markReached?.();
        this.#markReached = null;
        if (blocked !== null) await blocked;
        this.#markCompleted?.();
        this.#markCompleted = null;
      }
    }
    const failure = this.#nextFailure;
    this.#nextFailure = null;
    if (failure !== null) throw failure;
  }
}

function refusalPartyState(): PartySessionState {
  const hitPoints = [67, 52, 38] as const;
  return {
    schemaVersion: 1,
    rulesEdition: '2024',
    room: 1,
    adventuringDayStatus: 'active',
    characters: REFERENCE_PLAYER_IDS.map((combatantId, index) => ({
      characterId: index + 1,
      combatantId,
      currentHitPoints: hitPoints[index] ?? 1,
      hitPointMaximum: hitPoints[index] ?? 1,
      exhaustionLevel: 0,
      constitutionModifier: 0,
      life: 'living' as const,
      deathSaves: null,
      spellSlots: [],
      limitedResources: [],
      hitDice: [{ sides: 8 as const, maximum: 1, remaining: 1 }],
      consumables: [],
      aid: null,
      equipment: null,
    })),
    reactionPolicies: REFERENCE_PLAYER_IDS.flatMap((combatant) => REACTION_KINDS.map((reactionKind) => ({
      combatant, reactionKind, policy: 'ask' as const,
    }))),
    refusalHandling: { ...DEFAULT_REFUSAL_HANDLING_SETTINGS, rule_gap: 'default_and_log' },
  };
}

function pendingReactionState(): EncounterState {
  const state = reduceEncounter(
    createEncounter(referenceEncounterSetup()),
    { type: 'roll_initiative' },
    mulberry32(9),
  ).state;
  return {
    ...state,
    pendingDecisions: [{
      kind: 'reaction_offer',
      id: 'service-reaction-fixture',
      combatant: REFERENCE_MONSTER_ID,
      boundary: { activeCombatant: REFERENCE_FIGHTER_ID, round: state.round },
      reactionKind: 'opportunity_attack',
      options: [{ id: 'accept', label: 'Accept' }, { id: 'decline', label: 'Decline' }],
      opportunityAttack: {
        mover: REFERENCE_FIGHTER_ID,
        from: { column: 2, row: 3 },
        to: { column: 2, row: 4 },
        command: {
          type: 'opportunity_attack',
          actor: REFERENCE_MONSTER_ID,
          target: REFERENCE_FIGHTER_ID,
          attackBonus: 0,
          criticalFloor: 20,
          rollMode: 'normal',
          attackerCanSeeTarget: true,
          targetCanSeeAttacker: true,
          damage: {
            terms: [{
              type: damageType('Bludgeoning'),
              dice: { count: 0, sides: dieSides(4), modifier: 1 },
            }],
            critical: false,
            responses: [],
          },
        },
      },
    }],
  };
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

class PersistentlyFailingStore extends MemoryBrowserSessionStore {
  #failNextFlush = false;
  #failed = false;

  failNextFlushAndAllFollowingWrites(): void {
    this.#failNextFlush = true;
  }

  override append(revision: SessionRevision): void {
    if (this.#failed) throw new Error('persistent session store failure');
    super.append(revision);
  }

  override async flush(): Promise<void> {
    if (this.#failNextFlush) {
      this.#failNextFlush = false;
      this.#failed = true;
    }
    if (this.#failed) throw new Error('persistent session store failure');
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

type RichTopDownOperation = 'placement' | 'world_object' | 'adjudication';
let richOperationSequence = 0;

function richTopDownOperation(
  operation: RichTopDownOperation,
  store: ControlledFlushStore,
  onReducerInvocation: (command: EncounterCommand) => void,
): {
  readonly service: RichEncounterSessionService;
  readonly initialRevision: number;
  readonly submit: () => Promise<HostCoordinatorTransactionOutcome>;
} {
  const base = createEncounter(referenceEncounterSetup());
  let initialState: EncounterState = base;
  if (operation === 'placement') {
    const original = base.tokens.find((token) => token.combatantId === REFERENCE_FIGHTER_ID);
    if (original === undefined) throw new Error('Placement fixture is missing the fighter token.');
    const record: MigrationAdjudicationPending = {
      kind: 'legacy_size_required',
      combatant: REFERENCE_FIGHTER_ID,
      sourceSizeText: null,
      suggestedAnchor: { ...original.position },
      originatingToken: {
        id: original.id,
        combatantId: original.combatantId,
        position: { ...original.position },
      },
    };
    initialState = {
      ...base,
      tokens: base.tokens.filter((token) => token.combatantId !== REFERENCE_FIGHTER_ID),
      adjudicationPending: [record],
      phase: {
        kind: 'awaiting_placement',
        combatantId: REFERENCE_FIGHTER_ID,
        reason: 'legacy_size_required',
        originatingRecord: record,
        resumePhase: { kind: 'active' },
      },
    };
  } else if (operation === 'world_object') {
    initialState = {
      ...base,
      worldObjects: [...base.worldObjects, {
        id: worldObjectId('world-object:rich-service-control'),
        name: 'Rich service control',
        kind: 'generic',
        position: { column: 4, row: 4 },
        footprint: [{ column: 4, row: 4 }],
        durability: { kind: 'indestructible' },
        armorClass: armorClass(12),
        damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
        classActions: [{
          id: 'exercise-rich-control',
          label: 'Exercise rich control',
          cost: 'action',
          reach: 'adjacent',
          uses: 'once',
          eligibleActor: 'monster',
          dmOverride: {
            actor: REFERENCE_MONSTER_ID,
            reasoning: 'Exercise the durability-backed rich-service control.',
          },
        }],
        createdRevision: base.revision,
      }],
    };
  }
  richOperationSequence += 1;
  const host = new DmEncounterHost(`session:rich-${operation}-${String(richOperationSequence)}`, store, {
    initialState,
    onReducerInvocation,
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  if (operation === 'placement') host.interrupt();
  const binding = host.rendererTokenBindings()[0];
  if (binding === undefined) throw new Error('Rich service fixture has no renderer binding.');
  const seat: PlayerSeatRegistration = {
    playerId: `player:${binding.combatantId}`,
    seatId: `seat:${binding.combatantId}`,
    observerCombatantId: binding.combatantId,
    ownedCombatantIds: [binding.combatantId],
    controlledTokenIds: [binding.tokenId],
  };
  const service = new RichEncounterSessionService(host, [seat]);
  const projection = service.topDownSnapshot(seat.playerId);
  if (projection === null) throw new Error('Rich service fixture has no top-down projection.');
  const submit = (): Promise<HostCoordinatorTransactionOutcome> => {
    switch (operation) {
      case 'placement': {
        const offered = projection.dm.pendingPlacementRecovery?.sizeOptions[0]?.legalAnchors[0];
        if (offered === undefined) throw new Error('Placement fixture has no offered recovery anchor.');
        return service.submitTopDownPlacement(offered.offeredActionId);
      }
      case 'world_object': {
        const offered = projection.dm.worldObjectControls[0];
        if (offered === undefined) throw new Error('World-object fixture has no offered control.');
        return service.submitTopDownWorldObject(offered.offeredActionId);
      }
      case 'adjudication':
        return service.applyTopDownAdjudication({
          target: REFERENCE_MONSTER_ID,
          hitPointDelta: -1,
          reasoning: 'Exercise durability-backed manual adjudication.',
        });
    }
  };
  return { service, initialRevision: initialState.revision, submit };
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
  it.each(['placement', 'world_object', 'adjudication'] as const)(
    'does not commit the rich %s operation before its durability barrier',
    async (operation) => {
      const store = new ControlledFlushStore();
      const commandType = operation === 'placement'
        ? 'resolve_pending_placement'
        : operation === 'world_object'
          ? 'dm_use_world_object'
          : 'adjudicate';
      let operationReducerCalls = 0;
      const fixture = richTopDownOperation(operation, store, (command) => {
        if (command.type === commandType) operationReducerCalls += 1;
      });
      const mutationRevisions: number[] = [];
      fixture.service.subscribeDm((event) => {
        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
      });
      const barrier = store.blockFlushIn(1);
      let settled = false;
      const outcome = fixture.submit();
      void outcome.then(() => { settled = true; });
      await barrier.reached;
      await Promise.resolve();

      expect({ settled, operationReducerCalls, mutationRevisions }).toEqual({
        settled: false,
        operationReducerCalls: 1,
        mutationRevisions: [],
      });
      barrier.release();
      const committed = await outcome;
      expect(committed).toEqual({ kind: 'committed', revision: fixture.initialRevision + 1 });
      expect(mutationRevisions).toEqual([fixture.initialRevision + 1]);
      expect(operationReducerCalls).toBe(1);
      fixture.service.close();
    },
  );

  it.each(['placement', 'world_object', 'adjudication'] as const)(
    'reports a rejected rich %s write as post-apply failure without retrying',
    async (operation) => {
      const store = new ControlledFlushStore();
      const commandType = operation === 'placement'
        ? 'resolve_pending_placement'
        : operation === 'world_object'
          ? 'dm_use_world_object'
          : 'adjudicate';
      let operationReducerCalls = 0;
      const fixture = richTopDownOperation(operation, store, (command) => {
        if (command.type === commandType) operationReducerCalls += 1;
      });
      const mutationRevisions: number[] = [];
      fixture.service.subscribeDm((event) => {
        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
      });
      store.failNextFlush(new Error(`controlled ${operation} write failure`));

      await expect(fixture.submit()).resolves.toMatchObject({
        kind: 'failed',
        phase: 'post_apply',
        error: expect.objectContaining({ message: `controlled ${operation} write failure` }),
        currentRevision: fixture.initialRevision + 1,
      });
      await expect(fixture.submit()).resolves.toEqual({ kind: 'closed' });
      expect({ operationReducerCalls, mutationRevisions }).toEqual({
        operationReducerCalls: 1,
        mutationRevisions: [],
      });
      fixture.service.close();
    },
  );

  it.each(['placement', 'world_object', 'adjudication'] as const)(
    'settles active and queued rich %s operations before the unresolved write completes',
    async (operation) => {
      const store = new ControlledFlushStore();
      const commandType = operation === 'placement'
        ? 'resolve_pending_placement'
        : operation === 'world_object'
          ? 'dm_use_world_object'
          : 'adjudicate';
      let operationReducerCalls = 0;
      const fixture = richTopDownOperation(operation, store, (command) => {
        if (command.type === commandType) operationReducerCalls += 1;
      });
      const mutationRevisions: number[] = [];
      const publishedKinds: string[] = [];
      fixture.service.subscribeDm((event) => {
        publishedKinds.push(event.kind);
        if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
      });
      const barrier = store.blockFlushIn(1);
      const settlements = [0, 0];
      const active = fixture.submit();
      const queued = fixture.submit();
      void active.then(() => { settlements[0] = (settlements[0] ?? 0) + 1; });
      void queued.then(() => { settlements[1] = (settlements[1] ?? 0) + 1; });
      await barrier.reached;
      fixture.service.close();
      const publicationsAtClosure = publishedKinds.length;

      await expect(Promise.all([active, queued])).resolves.toEqual([
        { kind: 'closed' },
        { kind: 'closed' },
      ]);
      expect({ operationReducerCalls, mutationRevisions, settlements, publicationsAtClosure }).toEqual({
        operationReducerCalls: 1,
        mutationRevisions: [],
        settlements: [1, 1],
        publicationsAtClosure: 2,
      });
      barrier.release();
      await barrier.completed;
      await Promise.resolve();
      await Promise.resolve();
      expect({ operationReducerCalls, mutationRevisions, settlements, publications: publishedKinds.length }).toEqual({
        operationReducerCalls: 1,
        mutationRevisions: [],
        settlements: [1, 1],
        publications: publicationsAtClosure,
      });
    },
  );

  it('delivers the captured durable adjudication revision after later UI state advances', async () => {
    const store = new ControlledFlushStore();
    let adjudicationCalls = 0;
    const fixture = richTopDownOperation('adjudication', store, (command) => {
      if (command.type === 'adjudicate') adjudicationCalls += 1;
    });
    const mutationRevisions: number[] = [];
    fixture.service.subscribeDm((event) => {
      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
    });
    const barrier = store.blockFlushIn(1);
    const outcome = fixture.submit();
    await barrier.reached;
    await fixture.service.setHiddenRollCategory('death_saves', true);
    const advancedRevision = fixture.service.dmSnapshot().encounter.revision;
    expect(advancedRevision).toBe(fixture.initialRevision + 2);
    expect(mutationRevisions).toEqual([]);

    barrier.release();
    const committed = await outcome;
    expect(committed).toEqual({ kind: 'committed', revision: fixture.initialRevision + 1 });
    if (committed.kind !== 'committed') throw new Error(`Expected committed, received ${committed.kind}.`);
    expect(mutationRevisions).toEqual([committed.revision]);
    expect(fixture.service.dmSnapshot().encounter.revision).toBe(advancedRevision);
    expect(adjudicationCalls).toBe(1);
    fixture.service.close();
  });

  it('publishes an autonomous snapshot only after its durability barrier', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-autonomous-durable', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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

  it('classifies a real algorithm decision as autonomous without creating a mutation cache entry', async () => {
    const initialState = createEncounter(referenceEncounterSetup());
    const algorithmId = REFERENCE_PLAYER_IDS[0];
    if (algorithmId === undefined) throw new Error('Expected a reference algorithm combatant.');
    const host = new DmEncounterHost(
      'session:service-algorithm-autonomous',
      new MemoryBrowserSessionStore(),
      {
        initialState,
        initialControllers: initialState.combatants.map((combatant) => ({
          combatantId: combatant.profile.id,
          controllerId: `${combatant.profile.id}:algorithm-classification`,
          kind: combatant.profile.id === algorithmId ? 'algorithm' as const : 'human' as const,
          generation: 0,
        })).sort((left, right) => left.combatantId.localeCompare(right.combatantId)),
        offerEnvironment: OFFER_ENVIRONMENT,
      },
    );
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const autonomousRevisions: number[] = [];
    const mutationRevisions: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'autonomous') autonomousRevisions.push(event.projection.encounter.revision);
      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
    });
    const offerPromise = new Promise<PlayerBoardProjection>((resolve, reject) => {
      const unsubscribers: Array<() => void> = [];
      const timeout = setTimeout(() => reject(new Error('Timed out waiting beyond the algorithm turn.')), 2_000);
      for (const seat of seats) {
        const subscription = service.subscribePlayer(seat.playerId, (event) => {
          const pending = event.projection.pendingRequest;
          if (pending === null || pending.actorId === algorithmId) return;
          clearTimeout(timeout);
          for (const unsubscribe of unsubscribers) unsubscribe();
          resolve(event.projection);
        });
        if (subscription.kind === 'subscribed') unsubscribers.push(subscription.unsubscribe);
      }
    });

    void service.start();
    const offer = await offerPromise;
    expect(offer.pendingRequest?.actorId).not.toBe(algorithmId);
    expect(autonomousRevisions).toContain(1);
    expect(autonomousRevisions.some((revision) => revision > 1)).toBe(true);
    expect(mutationRevisions).toEqual([]);
    expect(service.mutationEventRevisions()).toEqual([]);
    service.close();
  });

  it('closes cleanly when durability fails before the initial human offer is delivered', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-initial-offer-failure', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const notifications: string[] = [];
    service.subscribeDm((event) => {
      notifications.push(event.kind);
      if (event.kind === 'autonomous') {
        store.failNextFlush(new Error('initial offer durability failed'));
      }
    });

    await expect(service.start()).rejects.toThrow('initial offer durability failed');
    expect(notifications).toContain('autonomous');
    expect(notifications).not.toContain('offer');
    expect(notifications).toContain('recovery');
    expect(host.snapshot().dm.coordinator.pendingRequest).toBeNull();
    const seat = seats[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');
    await expect(service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: 'closed-offer',
      encounterRevision: host.snapshot().dm.encounter.revision,
      offeredActionId: 'closed-offer',
    })).resolves.toEqual({ kind: 'closed' });
    service.close();
  });

  it('settles initial-offer cleanup with no human wait when every later store operation fails', async () => {
    const store = new PersistentlyFailingStore();
    const abort = vi.spyOn(AbortController.prototype, 'abort');
    const host = new DmEncounterHost('session:service-persistent-initial-offer-failure', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const notifications: string[] = [];
    service.subscribeDm((event) => {
      notifications.push(event.kind);
      if (event.kind === 'autonomous') store.failNextFlushAndAllFollowingWrites();
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = Promise.race([
      service.start(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('persistent initial-offer cleanup did not settle')), 1_000);
      }),
    ]);

    await expect(start).rejects.toThrow('persistent session store failure');
    if (timeout !== undefined) clearTimeout(timeout);
    expect(notifications).toContain('recovery');
    expect(host.snapshot().dm.coordinator.pendingRequest).toBeNull();
    expect(abort).toHaveBeenCalledTimes(1);
    const seat = seats[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');
    await expect(service.submitOfferedAction({
      playerId: seat.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: 'closed-persistent-offer',
      encounterRevision: host.snapshot().dm.encounter.revision,
      offeredActionId: 'closed-persistent-offer',
    })).resolves.toEqual({ kind: 'closed' });
    abort.mockRestore();
    service.close();
  });

  it('acknowledges the exact consuming revision only after durable flush', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-durable-commit', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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

  it.each(['dm', 'player'] as const)(
    'keeps a pump commit irrevocable when a %s mutation subscriber closes the service',
    async (audience) => {
      const host = new DmEncounterHost(
        `session:service-receipt-close-${audience}`,
        new MemoryBrowserSessionStore(),
        { offerEnvironment: OFFER_ENVIRONMENT },
      );
      const seats = registrations(host);
      const service = new EncounterSessionService(host, seats);
      const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
      void service.start();
      const offer = await offerPromise;
      const pending = offer.projection.pendingRequest;
      if (pending === null) throw new Error('Expected a controller offer for the receipt test.');
      const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
      if (seat === undefined) throw new Error('Expected the offered receipt-test seat.');
      const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
      if (endTurnIndex < 0) throw new Error('Expected an end-turn offer.');
      const observedMutationRevisions: number[] = [];
      const closeOnMutation = (kind: string, revision: number): void => {
        if (kind !== 'mutation') return;
        observedMutationRevisions.push(revision);
        service.close();
      };
      if (audience === 'dm') {
        service.subscribeDm((event) => closeOnMutation(event.kind, event.projection.encounter.revision));
      } else {
        service.subscribePlayer(offer.playerId, (event) => closeOnMutation(event.kind, event.projection.revision));
      }
      const mutation = {
        playerId: offer.playerId,
        tokenId: seat.controlledTokenIds[0]!,
        requestId: pending.requestId,
        encounterRevision: pending.encounterRevision,
        offeredActionId: pending.offeredActionIds[endTurnIndex]!,
      };

      const committed = service.submitOfferedAction(mutation);
      const queued = service.submitOfferedAction(mutation);
      const result = await committed;
      expect(result.kind).toBe('committed');
      if (result.kind !== 'committed') throw new Error(`Expected commit, received ${result.kind}.`);
      await expect(queued).resolves.toEqual({ kind: 'closed' });
      expect(result.event.kind).toBe('mutation');
      expect(result.event.projection.revision).toBe(result.revision);
      expect(observedMutationRevisions).toEqual([result.revision]);
      const revisionAtReceipt = host.snapshot().dm.encounter.revision;
      await Promise.resolve();
      expect(host.snapshot().dm.encounter.revision).toBe(revisionAtReceipt);
      expect(service.mutationEventRevisions()).toEqual([result.revision]);
    },
  );

  it('publishes no mutation snapshot for a real coordinator refusal', async () => {
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:service-real-refusal', store, {
      turnLegalActions: (state, actor) => {
        const other = state.combatants.find((combatant) => combatant.profile.id !== actor)?.profile.id;
        if (other === undefined) throw new Error('Expected a second combatant for refusal control.');
        return { actions: [{ type: 'end_turn', actor: other }] };
      },
      offerEnvironment: OFFER_ENVIRONMENT,
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

  it('flushes an automatic refusal consequence as a separate autonomous change before settling refusal', async () => {
    const action: Extract<EncounterCommand, { readonly type: 'cast_spell' }> = {
      type: 'cast_spell',
      actor: REFERENCE_FIGHTER_ID,
      spellId: 'missing-service-refusal-spell',
      slotLevel: null,
      castAsRitual: false,
      casterLevel: 1,
      attackBonus: 0,
      saveDc: 10,
      spellcastingModifier: 0,
      targets: [REFERENCE_MONSTER_ID],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    };
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-automatic-refusal', store, {
      initialPartyState: refusalPartyState(),
      turnLegalActions: () => ({ actions: [action] }),
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const autonomousRevisions: number[] = [];
    const mutationRevisions: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'autonomous') autonomousRevisions.push(event.projection.encounter.revision);
      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
    });
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected the automatic-refusal offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the automatic-refusal seat.');
    const autonomousBefore = [...autonomousRevisions];
    const barrier = store.blockFlushIn(2);
    let settled = false;
    const result = service.submitOfferedAction({
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[0]!,
    }).then((outcome) => { settled = true; return outcome; });

    await barrier.reached;
    expect(settled).toBe(false);
    expect(autonomousRevisions).toEqual(autonomousBefore);
    expect(mutationRevisions).toEqual([]);
    barrier.release();
    await expect(result).resolves.toMatchObject({ kind: 'refused', code: 'ENGINE_REFUSED' });
    expect(autonomousRevisions.at(-1)).toBe(pending.encounterRevision + 1);
    expect(mutationRevisions).toEqual([]);
    expect(service.mutationEventRevisions()).toEqual([]);
    expect(host.snapshot().dm.encounter.recentEvents.at(-1)).toMatchObject({
      type: 'adjudicated',
      subject: 'dm-override:refusal-default:rule_gap',
    });
    service.close();
  });

  it('classifies reaction host-recording failure after reducer application and settles the refusal independently', async () => {
    const state = pendingReactionState();
    const store = new FaultInjectingStore();
    const mirror = new FaultInjectingMirror();
    const host = new DmEncounterHost('session:service-reaction-record-failure', store, {
      initialState: state,
      initialControllers: state.combatants.map((combatant) => ({
        combatantId: combatant.profile.id,
        controllerId: `${combatant.profile.id}:reaction-classification`,
        kind: combatant.profile.id === REFERENCE_MONSTER_ID ? 'algorithm' as const : 'human' as const,
        generation: 0,
      })).sort((left, right) => left.combatantId.localeCompare(right.combatantId)),
      reactionOfferPolicy: { kind: 'unattended', askDefault: 'decline' },
      turnLegalActions: () => ({ actions: [{ type: 'end_turn', actor: REFERENCE_FIGHTER_ID }] }),
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    host.connectBridgeMirror(mirror);
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const notifications: string[] = [];
    service.subscribeDm((event) => notifications.push(event.kind));
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected the boundary-blocked human offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the boundary-blocked player seat.');
    mirror.failAppendIn(3);
    const mutation = {
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[0]!,
    };

    const refused = service.submitOfferedAction(mutation);
    const queued = service.submitOfferedAction(mutation);
    await expect(refused).resolves.toMatchObject({ kind: 'refused', code: 'ENGINE_REFUSED' });
    await expect(queued).resolves.toEqual({ kind: 'closed' });
    expect(host.snapshot().dm.encounter.revision).toBe(pending.encounterRevision + 1);
    expect(host.snapshot().dm.encounter.recentEvents.at(-1)).toMatchObject({
      type: 'pending_decision_resolved', combatant: REFERENCE_MONSTER_ID,
    });
    expect(notifications).not.toContain('mutation');
    expect(notifications).toContain('recovery');
    service.close();
  });

  it('publishes unattended reaction resolution as autonomous while settling the blocked mutation refused', async () => {
    const state = pendingReactionState();
    const host = new DmEncounterHost(
      'session:service-reaction-autonomous',
      new MemoryBrowserSessionStore(),
      {
        initialState: state,
        initialControllers: state.combatants.map((combatant) => ({
          combatantId: combatant.profile.id,
          controllerId: `${combatant.profile.id}:reaction-autonomous`,
          kind: combatant.profile.id === REFERENCE_MONSTER_ID ? 'algorithm' as const : 'human' as const,
          generation: 0,
        })).sort((left, right) => left.combatantId.localeCompare(right.combatantId)),
        reactionOfferPolicy: { kind: 'unattended', askDefault: 'decline' },
        turnLegalActions: () => ({ actions: [{ type: 'end_turn', actor: REFERENCE_FIGHTER_ID }] }),
        offerEnvironment: OFFER_ENVIRONMENT,
      },
    );
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const autonomousRevisions: number[] = [];
    const mutationRevisions: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'autonomous') autonomousRevisions.push(event.projection.encounter.revision);
      if (event.kind === 'mutation') mutationRevisions.push(event.projection.encounter.revision);
    });
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    void service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected the boundary-blocked human offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the boundary-blocked player seat.');

    await expect(service.submitOfferedAction({
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[0]!,
    })).resolves.toMatchObject({ kind: 'refused', code: 'ENGINE_REFUSED' });
    expect(autonomousRevisions).toContain(pending.encounterRevision + 1);
    expect(mutationRevisions).toEqual([]);
    expect(service.mutationEventRevisions()).toEqual([]);
    expect(host.snapshot().dm.history.map((entry) => entry.transition.kind))
      .toContain('unattended_reaction_auto_resolved');
    service.close();
  });

  it.each(['append', 'mirror', 'flush'] as const)(
    'classifies a real post-application %s failure, emits recovery only, and closes queued work',
    async (failureMode) => {
      const store = new FaultInjectingStore();
      const mirror = new FaultInjectingMirror();
      const host = new DmEncounterHost(`session:service-post-${failureMode}`, store, {
        offerEnvironment: OFFER_ENVIRONMENT,
      });
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

  it('settles active and queued mutations closed before an ordinary post-step barrier is released', async () => {
    const store = new ControlledFlushStore();
    const host = new DmEncounterHost('session:service-close-during-step-flush', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const seats = registrations(host);
    const service = new EncounterSessionService(host, seats);
    const offerPromise = waitForOffer(service, seats.map((seat) => seat.playerId));
    const start = service.start();
    const offer = await offerPromise;
    const pending = offer.projection.pendingRequest;
    if (pending === null) throw new Error('Expected a real controller offer.');
    const seat = seats.find((candidate) => candidate.playerId === offer.playerId);
    if (seat === undefined) throw new Error('Expected the offered player seat.');
    const endTurnIndex = pending.legalActions.findIndex((action) => action.type === 'end_turn');
    if (endTurnIndex < 0) throw new Error('Expected an end-turn offer.');
    const mutationEvents: number[] = [];
    service.subscribeDm((event) => {
      if (event.kind === 'mutation') mutationEvents.push(event.projection.encounter.revision);
    });
    const barrier = store.blockFlushIn(1);
    const mutation = {
      playerId: offer.playerId,
      tokenId: seat.controlledTokenIds[0]!,
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      offeredActionId: pending.offeredActionIds[endTurnIndex]!,
    };
    const active = service.submitOfferedAction(mutation);
    const queued = service.submitOfferedAction(mutation);
    await barrier.reached;
    service.close();

    await expect(active).resolves.toEqual({ kind: 'closed' });
    await expect(queued).resolves.toEqual({ kind: 'closed' });
    const revisionAtClose = host.snapshot().dm.encounter.revision;
    expect(mutationEvents).toEqual([]);
    barrier.release();
    await start;
    expect(host.snapshot().dm.encounter.revision).toBe(revisionAtClose);
    expect(mutationEvents).toEqual([]);
  });

  it('keeps the FIFO usable after a real pre-application append failure', async () => {
    const store = new FaultInjectingStore();
    const host = new DmEncounterHost('session:service-pre-apply-continues', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
    const real = new DmEncounterHost('session:service-auth-boundary', memory, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
    const real = new DmEncounterHost('session:service-terminal-outcomes', memory, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
        next({
          kind: 'status', snapshot: real.snapshot(), playerSnapshot: () => projection,
          rendererTokenBindings: real.rendererTokenBindings(),
        });
        return () => { listener = null; };
      },
      start: async () => undefined,
      submitOfferedActionTransaction: async () => {
        const result = outcomes[calls];
        calls += 1;
        if (result === undefined) return { kind: 'closed' };
        if (result.kind === 'failed' && result.phase === 'post_apply') {
          projection = { ...projection, revision: result.currentRevision, pendingRequest: null };
          listener?.({
            kind: 'recovery', snapshot: real.snapshot(), playerSnapshot: () => projection,
            rendererTokenBindings: real.rendererTokenBindings(),
          });
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
    const host = new DmEncounterHost('session:service-close', memory, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
    const host = new DmEncounterHost('session:service-detached-offers', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
    const host = new DmEncounterHost('session:service-subscriber-isolation', store, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
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
    const host = new DmEncounterHost('session:service-overlapping-seats', memory, {
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const seat = registrations(host)[0];
    if (seat === undefined) throw new Error('Expected an authority seat.');

    expect(() => new EncounterSessionService(host, [
      seat,
      { ...seat, playerId: 'player:duplicate', seatId: 'seat:duplicate' },
    ])).toThrow(`Combatant ${seat.observerCombatantId} is assigned to both`);
    host.close();
  });
});
