import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import { ControllerRegistry, HumanController } from '../../../src/combat/controllers';
import {
  createEncounter,
  EncounterConcludedBoundaryError,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides } from '../../../src/combat/values';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import { loadD365SampleParty } from '../../../src/vtt/d365-sample-party';
import { DmEncounterHost, type DmEncounterHostSnapshot } from '../../../src/vtt/dm-encounter-host';
import { renderDmEncounterOutcome } from '../../../src/vtt/encounter-app';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { IndexedDbBrowserSessionStore } from '../../../src/vtt/local-session-store';
import { createPartySessionState } from '../../../src/vtt/party-session-state';
import { deriveSessionRecord } from '../../../src/vtt/session-record';
import { encounterSeed } from '../../../src/vtt/session-seed';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
import { rpcRegistry } from '../../../src/worker/registry';
import type { HandlerContext } from '../../../src/worker/handler';
import { installInteractiveDocument } from '../../fixtures/interactive-dom';
import { createSeededRpcHarness } from '../../helpers/rpc-harness';
import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>();

  get length(): number { return this.#values.size; }
  clear(): void { this.#values.clear(); }
  getItem(key: string): string | null { return this.#values.get(key) ?? null; }
  key(index: number): string | null { return [...this.#values.keys()][index] ?? null; }
  removeItem(key: string): void { this.#values.delete(key); }
  setItem(key: string, value: string): void { this.#values.set(key, value); }
}

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

function lethalAttack(actor: ReturnType<typeof playerProfile>['id'], target: ReturnType<typeof monsterProfile>['id']): EncounterCommand {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Slashing'),
        dice: { count: 0, sides: dieSides(6), modifier: 2 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function victoryFixture(): {
  readonly state: EncounterState;
  readonly player: ReturnType<typeof playerProfile>;
  readonly monster: ReturnType<typeof monsterProfile>;
} {
  const player = playerProfile('conclusion-player', { hitPoints: 20, initiativeBonus: 30 });
  const monster = monsterProfile('conclusion-monster', { hitPoints: 1, initiativeBonus: -20 });
  const state = reduceEncounter(createEncounter({
    bounds: { columns: 3, rows: 1 },
    combatants: [player, monster],
    tokens: [placedToken(player, 0, 0), placedToken(monster, 1, 0)],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return { state, player, monster };
}

function hostUntilConcluded(
  host: DmEncounterHost,
  timeoutMilliseconds = 1_000,
): Promise<DmEncounterHostSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      host.interrupt();
      const snapshot = host.snapshot().dm;
      reject(new Error(
        `Host did not conclude the encounter: round=${String(snapshot.encounter.round)} ` +
        `active=${String(snapshot.encounter.activeCombatant)} ` +
        `pause=${snapshot.coordinator.pause?.kind ?? 'none'} ` +
        `refusal=${snapshot.decisionTray.actionRefusal?.reason ?? 'none'}.`,
      ));
    }, timeoutMilliseconds);
    const unsubscribe = host.subscribe((snapshot) => {
      if (snapshot.dm.encounter.phase.kind !== 'concluded') return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    });
    void host.start().catch(reject);
  });
}

describe('typed encounter conclusion', () => {
  let restoreDocument: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
  });

  afterEach(() => restoreDocument());

  it('drives to victory, stops turns, renders the outcome, autosaves once, and closes the record', async () => {
    const fixture = victoryFixture();
    const store = await IndexedDbBrowserSessionStore.open(new IDBFactory(), new MemoryStorage(), {
      databaseName: 'encounter-conclusion-host',
    });
    const legalActions = (_state: EncounterState, actor: typeof fixture.player.id): LegalActionSummary => ({
      actions: actor === fixture.player.id
        ? [lethalAttack(fixture.player.id, fixture.monster.id)]
        : [{ type: 'end_turn', actor }],
    });
    const identities = fixture.state.combatants.map((subject) => ({
      combatantId: subject.profile.id,
      controllerId: `${subject.profile.id}:algorithm:conclusion-test`,
      kind: 'algorithm' as const,
      generation: 0,
    })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
    const host = new DmEncounterHost('session:encounter-conclusion-host', store, {
      initialState: fixture.state,
      initialControllers: identities,
      playerIds: [fixture.player.id],
      turnLegalActions: legalActions,
      offerEnvironment: OFFER_ENVIRONMENT,
    });

    const concluded = await hostUntilConcluded(host);
    await host.start();
    await store.flush();

    expect(concluded.dm.encounter.phase).toMatchObject({
      kind: 'concluded', outcome: 'victory', survivingSide: 'player_character', round: 1,
    });
    expect(concluded.dm.timeline.phase.kind).toBe('concluded');
    const revisionCount = store.revisions(host.sessionId).length;
    await host.start();
    expect(store.revisions(host.sessionId)).toHaveLength(revisionCount);

    const phase = concluded.dm.encounter.phase;
    if (phase.kind !== 'concluded') throw new Error('Expected a concluded projection.');
    const banner = renderDmEncounterOutcome(phase);
    expect(banner.dataset.encounterOutcome).toBe('victory');
    expect(banner.dataset.survivingSide).toBe('player_character');
    expect(banner.textContent).toContain('Player characters survive');

    expect(store.savedSessions().filter((save) => save.name.includes('encounter end'))).toHaveLength(1);
    expect(deriveSessionRecord(store.revisions(host.sessionId)).encounters[0]).toMatchObject({
      status: 'closed',
      conclusion: { outcome: 'victory', survivingSide: 'player_character' },
    });
    host.close();
    store.close();
  });

  it('room-3-composition-concludes: all algorithm controllers finish the Ridgewing Gallery without a charge refusal', async () => {
    const harness = await createSeededRpcHarness([]);
    const rpc = new RpcClient(new RegistryTransport(harness.context));
    try {
      const sample = await loadD365SampleParty(rpc);
      const partyState = { ...createPartySessionState(sample.party.members), room: 3 as const };
      const encounter = composeD365Room(sample.party.members, sample.displayNames, partyState);
      const identities = encounter.controllers.map((identity) => ({
        ...identity,
        controllerId: `${identity.combatantId}:algorithm:room-3-conclusion`,
        kind: 'algorithm' as const,
        generation: 0,
      }));
      const store = new MemoryBrowserSessionStore();
      const host = new DmEncounterHost('session:room-3-conclusion', store, {
        initialState: encounter.state,
        initialSeed: encounterSeed(20_260_824),
        initialPartyState: partyState,
        partyMembers: encounter.members,
        partyDisplayNames: encounter.displayNames,
        initialControllers: identities,
        playerIds: encounter.playerIds,
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: () => [],
        offerEnvironment: OFFER_ENVIRONMENT,
      });
      try {
        const concluded = await hostUntilConcluded(host, 10_000);
        expect(concluded.dm.encounter.phase).toMatchObject({ kind: 'concluded' });
        expect(concluded.dm.decisionTray.actionRefusal).toBeNull();
        expect(concluded.dm.encounter.recentEvents).toContainEqual(expect.objectContaining({
          type: 'attack_resolved',
        }));
      } finally {
        host.close();
      }
    } finally {
      rpc.close();
      harness.close();
    }
  }, 20_000);

  it('refuses further turn advancement with typed reducer and coordinator boundaries', async () => {
    const fixture = victoryFixture();
    const concluded = reduceEncounter(
      fixture.state,
      lethalAttack(fixture.player.id, fixture.monster.id),
      () => 0.5,
    ).state;

    expect(() => reduceEncounter(
      concluded,
      { type: 'end_turn', actor: fixture.player.id },
      () => 0.5,
    )).toThrow(EncounterConcludedBoundaryError);

    const registry = new ControllerRegistry(concluded.combatants.map((subject) => ({
      combatantId: subject.profile.id,
      controller: new HumanController(),
    })));
    const coordinator = new TurnCoordinator(concluded, registry, () => 0.5);
    await expect(coordinator.step()).resolves.toMatchObject({
      kind: 'refused',
      encounterConclusionCode: 'encounter_concluded',
      conclusion: { outcome: 'victory' },
    });
  });

  it('keeps a stable-at-zero-only party active while a living enemy remains', () => {
    const fixture = victoryFixture();
    const stableParty: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((subject) => subject.profile.id === fixture.player.id
        ? { ...subject, hitPoints: 0, life: 'stable', deathSaves: null }
        : subject),
    };
    const unchanged = reduceEncounter(stableParty, {
      type: 'adjudicate',
      target: fixture.monster.id,
      subject: 'Stable-party outcome fixture',
      reasoning: 'No mechanical change; exercise conclusion detection.',
      consequence: { kind: 'hit_point_delta', amount: 0 },
    }, () => 0.5).state;

    expect(unchanged.phase).toEqual({ kind: 'active' });
  });
});
