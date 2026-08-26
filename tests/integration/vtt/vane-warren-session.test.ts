import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../src/combat/random';
import { feetPoint } from '../../../src/combat/templates';
import {
  codexSessionId,
  encounterBranchId,
  encounterSessionId,
  feet,
  type CombatantId,
} from '../../../src/combat/values';
import {
  projectPlayerView,
  UnknownPlayerSeatCombatantError,
} from '../../../src/combat/visibility';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { AdventuringDaySession } from '../../../src/vtt/adventuring-day-session';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import { encounterBoardRenderModel } from '../../../src/vtt/encounter-board';
import { loadD365SampleParty, type D365SamplePartyLoad } from '../../../src/vtt/d365-sample-party';
import { loadedPartySpellCastCommand } from '../../../src/vtt/party-pack';
import { createPartySessionState, type PartySessionState } from '../../../src/vtt/party-session-state';
import { createD365SurvivalPartySessionState } from '../../../src/vtt/survival-policy';
import {
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import {
  VANE_WARREN_FIGHT_IDS,
  composeVaneWarrenSessionEncounter,
} from '../../../src/vtt/vane-warren';
import { vaneWarrenArtForCombatants } from '../../../src/vtt/vane-warren-art';
import { rpcRegistry } from '../../../src/worker/registry';
import type { HandlerContext } from '../../../src/worker/handler';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

class RegistryTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void rpcRegistry.dispatch(message, this.context).then((response) => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    }).catch((error: unknown) => {
      const event = new ErrorEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      for (const listener of this.#errors) listener(event);
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.add(listener as (event: ErrorEvent) => void);
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    else this.#errors.delete(listener as (event: ErrorEvent) => void);
  }
}

function roomState(initial: PartySessionState, room: 1 | 2 | 3): PartySessionState {
  return { ...initial, room };
}

function advanceToActor(session: AdventuringDaySession, actor: CombatantId): void {
  if (session.encounter().initiative.length === 0) {
    const rolled = session.apply({ type: 'roll_initiative' });
    expect(rolled.activeCombatant).not.toBeNull();
  }
  let remaining = session.encounter().initiative.length + 1;
  while (session.encounter().activeCombatant !== actor && remaining > 0) {
    const active = session.encounter().activeCombatant;
    if (active === null) throw new Error('Vane Warren encounter lost its active combatant.');
    const advanced = session.apply({ type: 'end_turn', actor: active });
    expect(advanced.activeCombatant).not.toBe(active);
    remaining -= 1;
  }
  if (session.encounter().activeCombatant !== actor) {
    throw new Error(`Vane Warren could not advance to ${actor}.`);
  }
}

function parsedExport(bytes: string): Readonly<Record<string, unknown>> {
  const value: unknown = JSON.parse(bytes);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Vane Warren export is not an object.');
  }
  return value as Readonly<Record<string, unknown>>;
}

async function driveAlgorithmHostToConclusion(
  host: DmEncounterHost,
  maximumDecisionBoundaries = 200,
): Promise<ReturnType<DmEncounterHost['snapshot']>> {
  for (let boundary = 0; boundary < maximumDecisionBoundaries; boundary += 1) {
    const snapshot = await new Promise<ReturnType<DmEncounterHost['snapshot']>>((resolve, reject) => {
      let publications = 0;
      let unsubscribe = (): void => undefined;
      let completedBeforeSubscription = false;
      const timeout = setTimeout(() => {
        unsubscribe();
        host.interrupt();
        const candidate = host.snapshot();
        const latest = candidate.dm.encounter.recentEvents.at(-1);
        const active = candidate.dm.encounter.combatants.find(
          (combatant) => combatant.id === candidate.dm.encounter.activeCombatant,
        );
        reject(new Error(
          `Algorithm host timed out after ${String(publications)} publications at round ` +
          `${String(candidate.dm.encounter.round)} on ${active?.name ?? 'no actor'} after ${latest?.type ?? 'no event'}.`,
        ));
      }, 2_000);
      unsubscribe = host.subscribe((candidate) => {
        publications += 1;
        if (
          candidate.dm.encounter.phase.kind === 'concluded' ||
          candidate.dm.decisionTray.actionRefusal !== null ||
          candidate.dm.decisionTray.entries.some((entry) => entry.kind === 'pending')
        ) {
          completedBeforeSubscription = publications === 1;
          clearTimeout(timeout);
          unsubscribe();
          resolve(candidate);
          return;
        }
        if (publications < 1_000) return;
        unsubscribe();
        host.interrupt();
        clearTimeout(timeout);
        const latest = candidate.dm.encounter.recentEvents.at(-1);
        reject(new Error(
          `Algorithm host published 1,000 times at round ${String(candidate.dm.encounter.round)} ` +
          `after ${latest?.type ?? 'no event'}.`,
        ));
      });
      if (completedBeforeSubscription) unsubscribe();
      void host.start().catch(reject);
    });
    if (snapshot.dm.encounter.phase.kind === 'concluded') return snapshot;
    if (snapshot.dm.decisionTray.actionRefusal !== null) {
      throw new Error(`Algorithm host action refused: ${snapshot.dm.decisionTray.actionRefusal.reason}`);
    }
    const pending = snapshot.dm.decisionTray.entries.find((entry) => entry.kind === 'pending');
    if (pending?.kind !== 'pending') {
      const latest = snapshot.dm.encounter.recentEvents.at(-1);
      throw new Error(
        `Algorithm host stalled at round ${String(snapshot.dm.encounter.round)} after ${latest?.type ?? 'no event'}.`,
      );
    }
    const decision = pending.decision;
    const reactionMoverIsDead = decision.kind === 'reaction_offer' &&
      snapshot.dm.encounter.combatants.find(
        (combatant) => combatant.id === decision.opportunityAttack.mover,
      )?.life === 'dead';
    const option = reactionMoverIsDead
      ? decision.options.find((candidate) => candidate.id === 'decline')
      : decision.options[0];
    if (option === undefined) throw new Error(`Pending ${decision.kind} decision has no option.`);
    await host.resolvePendingDecision(decision.id, option.id);
  }
  throw new Error(`Algorithm host exceeded ${String(maximumDecisionBoundaries)} decision boundaries.`);
}

describe('Vane Warren loader, chaining, seats, and end-session export', () => {
  let harness: RpcHarness;
  let rpc: RpcClient;
  let sample: D365SamplePartyLoad;

  beforeAll(async () => {
    harness = await createSeededRpcHarness([]);
    rpc = new RpcClient(new RegistryTransport(harness.context));
    sample = await loadD365SampleParty(rpc);
  }, 20_000);

  afterAll(() => {
    rpc.close();
    harness.close();
  });

  it('bounds_mismatch_reintroduced: reaches DM controls for all three authored fights with their matching art package', () => {
    const initialParty = createPartySessionState(sample.party.members);
    for (const [index, fightId] of VANE_WARREN_FIGHT_IDS.entries()) {
      const encounter = composeVaneWarrenSessionEncounter(
        sample.party.members,
        sample.displayNames,
        roomState(initialParty, (index + 1) as 1 | 2 | 3),
      );
      const composeRoom = encounter.composeNextRoom;
      if (composeRoom === undefined) throw new Error('Vane Warren encounter chaining is missing.');
      const host = new DmEncounterHost(
        `test:vane-loader:${fightId}`,
        new MemoryBrowserSessionStore(),
        {
          initialState: encounter.state,
          ...(encounter.partyState === null ? {} : { initialPartyState: encounter.partyState }),
          partyMembers: encounter.members,
          partyDisplayNames: encounter.displayNames,
          composeRoom,
          initialControllers: encounter.controllers,
          playerIds: encounter.playerIds,
          turnLegalActions: encounter.turnLegalActions,
          reactionLegalActions: () => [],
        },
      );
      const controlsState = host.snapshot().dm;
      expect(controlsState.encounter.dmOnly.notes[0]).toContain(fightId === 'cinder-rite'
        ? 'The Cinder Rite'
        : fightId === 'iron-voice'
          ? 'The Iron Voice'
          : 'The Last Muster');
      expect(encounterBoardRenderModel(
        controlsState.board,
        vaneWarrenArtForCombatants(controlsState.board.combatants),
      )).toHaveLength(140);
      host.close();
    }
  });

  it('carries controller assignments across a fight boundary and accepts the new roster member assignment', async () => {
    const encounter = composeVaneWarrenSessionEncounter(
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    );
    const composeRoom = encounter.composeNextRoom;
    if (composeRoom === undefined) throw new Error('Vane Warren encounter chaining is missing.');
    const initialPartyState = encounter.partyState;
    if (initialPartyState === null) throw new Error('Vane Warren party state is missing.');
    const host = new DmEncounterHost(
      'test:vane-controller-carryover',
      new MemoryBrowserSessionStore(),
      {
        initialState: encounter.state,
        initialPartyState,
        partyMembers: encounter.members,
        partyDisplayNames: encounter.displayNames,
        composeRoom,
        initialControllers: encounter.controllers,
        playerIds: encounter.playerIds,
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: () => [],
      },
    );
    for (const identity of host.snapshot().dm.controllers) {
      host.replaceController(identity.combatantId, 'algorithm');
    }

    await host.finishRoom(null);
    host.interrupt();
    const afterBoundary = host.snapshot().dm.controllers;
    expect(afterBoundary.filter((identity) => encounter.playerIds.includes(identity.combatantId)))
      .toHaveLength(encounter.playerIds.length);
    expect(afterBoundary.filter(
      (identity) => encounter.playerIds.includes(identity.combatantId) && identity.kind === 'algorithm',
    )).toHaveLength(encounter.playerIds.length);
    const newRoster = afterBoundary.filter((identity) => !encounter.playerIds.includes(identity.combatantId));
    expect(newRoster).toEqual([expect.objectContaining({ kind: 'human' })]);
    const replacement = newRoster[0];
    if (replacement === undefined) throw new Error('The Iron Voice roster is missing.');
    host.replaceController(replacement.combatantId, 'algorithm');
    expect(host.snapshot().dm.controllers.every((identity) => identity.kind === 'algorithm')).toBe(true);
    host.close();
  });

  it('all-algorithm chain concludes Iron Voice and assigns its conditional successor roster', async () => {
    const encounter = composeVaneWarrenSessionEncounter(
      sample.party.members,
      sample.displayNames,
      createD365SurvivalPartySessionState(sample.party.members).state,
    );
    const composeRoom = encounter.composeNextRoom;
    const initialPartyState = encounter.partyState;
    if (composeRoom === undefined || initialPartyState === null) {
      throw new Error('The Vane Warren chained host fixture is incomplete.');
    }
    const host = new DmEncounterHost(
      'test:vane-iron-voice-algorithm-host',
      new MemoryBrowserSessionStore(),
      {
        initialState: encounter.state,
        initialPartyState,
        partyMembers: encounter.members,
        partyDisplayNames: encounter.displayNames,
        composeRoom,
        initialControllers: encounter.controllers.map((identity) => ({
          ...identity,
          controllerId: `${identity.combatantId}:algorithm:iron-voice-regression`,
          kind: 'algorithm' as const,
          generation: 0,
        })),
        playerIds: encounter.playerIds,
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: () => [],
      },
    );

    const cinder = await driveAlgorithmHostToConclusion(host);
    expect(cinder.dm.encounter.phase).toEqual(expect.objectContaining({
      kind: 'concluded',
      outcome: 'victory',
    }));
    await host.finishRoom(null);
    for (const identity of host.snapshot().dm.controllers) {
      if (identity.kind === 'human') host.replaceController(identity.combatantId, 'algorithm');
    }

    const iron = await driveAlgorithmHostToConclusion(host);
    expect(iron.dm.encounter.dmOnly.notes[0]).toContain('The Iron Voice');
    expect(iron.dm.encounter.round).toBeGreaterThanOrEqual(2);
    expect(iron.dm.encounter.phase).toEqual(expect.objectContaining({
      kind: 'concluded',
      outcome: 'victory',
    }));
    await host.finishRoom(null);
    for (const identity of host.snapshot().dm.controllers) {
      if (identity.kind === 'human') host.replaceController(identity.combatantId, 'algorithm');
    }

    const muster = await driveAlgorithmHostToConclusion(host);
    expect(muster.dm.encounter.dmOnly.notes[0]).toContain('The Last Muster');
    expect(muster.dm.encounter.round).toBeGreaterThan(2);
    expect(muster.dm.controllers).toContainEqual(expect.objectContaining({
      combatantId: 'combatant:vane-warren:last-muster:muster-joiner-a',
      kind: 'algorithm',
    }));
    expect(muster.dm.encounter.phase).toEqual(expect.objectContaining({
      kind: 'concluded',
      outcome: 'victory',
    }));
    host.close();
  }, 20_000);

  it('session_forked: keeps one session id while HP and a pact slot carry through all three fights', () => {
    const store = new MemoryBrowserSessionStore();
    const sessionId = encounterSessionId('session:vane-warren-chain-test');
    const session = AdventuringDaySession.create({
      sessionId,
      branchId: encounterBranchId('branch:vane-warren-main'),
      codexSessionId: codexSessionId('codex:vane-warren-test'),
      members: sample.party.members,
      displayNames: sample.displayNames,
      rng: mulberry32(377_6),
      store,
      mirror: new MemoryMirrorSink(),
      composeRoom: composeVaneWarrenSessionEncounter,
    });
    const warlock = sample.party.members[0];
    if (warlock === undefined) throw new Error('The representative Warlock is missing.');
    const damaged = session.apply({
      type: 'adjudicate',
      target: warlock.profile.id,
      subject: 'vane-warren:carry-hp',
      reasoning: 'Deterministic cross-encounter carry test.',
      consequence: { kind: 'hit_point_delta', amount: -6 },
    });
    expect(damaged.combatants.find(
      (combatant) => combatant.profile.id === warlock.profile.id,
    )?.hitPoints).toBe(warlock.profile.rules.hitPointMaximum - 6);
    advanceToActor(session, warlock.profile.id);
    const cast = session.apply(loadedPartySpellCastCommand(warlock, 'burning-hands', {
      slotLevel: 3,
      slotRecharge: 'short_rest',
      castAsRitual: false,
      targets: [],
      area: {
        shape: 'cone',
        template: {
          origin: feetPoint(10, 10),
          direction: { x: 1, y: 0 },
          length: feet(15),
          includeOrigin: false,
        },
      },
      weaponAttack: null,
      selectedOption: null,
    }));
    expect(cast.eventLog).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      caster: warlock.profile.id,
      spellId: 'burning-hands',
      slotLevel: 3,
    }));
    const afterFirst = session.captureRoom();
    const carriedWarlock = afterFirst.characters.find(
      (character) => character.combatantId === warlock.profile.id,
    );
    if (carriedWarlock === undefined) throw new Error('Carried Warlock state is missing.');

    session.enterNextRoom(composeVaneWarrenSessionEncounter);
    expect(session.encounter().dmNotes[0]).toContain('The Iron Voice');
    expect(session.encounter().combatants.find(
      (combatant) => combatant.profile.id === warlock.profile.id,
    )?.hitPoints).toBe(carriedWarlock.currentHitPoints);
    expect(session.party().characters.find(
      (character) => character.combatantId === warlock.profile.id,
    )?.spellSlots).toEqual(carriedWarlock.spellSlots);

    session.captureRoom();
    session.enterNextRoom(composeVaneWarrenSessionEncounter);
    expect(session.encounter().dmNotes[0]).toContain('The Last Muster');
    const revisions = store.revisions(sessionId);
    expect(new Set(revisions.map((revision) => revision.sessionId))).toEqual(new Set([sessionId]));
    expect(revisions.filter((revision) => revision.transition.kind === 'room_composed')).toHaveLength(2);
  });

  it('seat_unbound: resolves the local-party seat in every fight and rejects a missing combatant with a typed error', () => {
    const initialParty = createPartySessionState(sample.party.members);
    for (const room of [1, 2, 3] as const) {
      const encounter = composeVaneWarrenSessionEncounter(
        sample.party.members,
        sample.displayNames,
        roomState(initialParty, room),
      );
      const viewer = encounter.playerIds[0];
      if (viewer === undefined) throw new Error('Vane Warren has no player seat combatant.');
      expect(projectPlayerView(encounter.state, {
        seatId: 'seat:local-party',
        combatantId: viewer,
        ownedCombatantIds: encounter.playerIds,
      }).seat.combatantId).toBe(viewer);
    }
    expect(() => projectPlayerView(
      composeVaneWarrenSessionEncounter(
        sample.party.members,
        sample.displayNames,
        initialParty,
      ).state,
      {
        seatId: 'seat:local-party',
        combatantId: 'combatant:missing' as CombatantId,
      },
    )).toThrowError(UnknownPlayerSeatCombatantError);
  });

  it('export_drops_encounter: End Session emits one parseable export containing all three played encounters', () => {
    const finalEncounter = composeVaneWarrenSessionEncounter(
      sample.party.members,
      sample.displayNames,
      roomState(createPartySessionState(sample.party.members), 3),
    );
    expect(finalEncounter.sessionFlow).toEqual({
      name: 'The Vane Warren',
      encounterCount: 3,
      endControlLabel: 'End Session and export',
    });
    const store = new MemoryBrowserSessionStore();
    const sessionId = encounterSessionId('session:vane-warren-export-test');
    const session = AdventuringDaySession.create({
      sessionId,
      branchId: encounterBranchId('branch:vane-warren-export'),
      codexSessionId: codexSessionId('codex:vane-warren-export'),
      members: sample.party.members,
      displayNames: sample.displayNames,
      rng: mulberry32(377_14),
      store,
      mirror: new MemoryMirrorSink(),
      composeRoom: composeVaneWarrenSessionEncounter,
    });
    session.captureRoom();
    session.enterNextRoom(composeVaneWarrenSessionEncounter);
    session.captureRoom();
    session.enterNextRoom(composeVaneWarrenSessionEncounter);

    const bytes = session.endSession();
    const exported = parsedExport(bytes);
    const record = exported.sessionRecord;
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      throw new TypeError('Vane Warren export has no structured session record.');
    }
    const encounters = Reflect.get(record, 'encounters');
    expect(Array.isArray(encounters)).toBe(true);
    expect(encounters).toHaveLength(3);
    expect(store.revisions(sessionId).at(-1)?.transition).toEqual({ kind: 'session_ended' });
    expect(() => session.endSession()).toThrow('already ended');
  });
});
