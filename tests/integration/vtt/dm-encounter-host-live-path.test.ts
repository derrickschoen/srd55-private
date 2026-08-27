import { describe, expect, it } from 'vitest';
import type { ControllerIdentity, LegalActionSummary } from '../../../src/combat/controllers';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { gridDistance, type GridCell } from '../../../src/combat/grid';
import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
import { UNICORN, WOLF } from '../../../src/combat/statblocks/monsters';
import {
  DmEncounterHost,
  type DmEncounterHostSnapshot,
} from '../../../src/vtt/dm-encounter-host';
import {
  MemoryBrowserSessionStore,
  replaySessionRevisions,
} from '../../../src/vtt/session-persistence';
import {
  createVaneWarrenFight,
  reduceVaneWarrenEncounter,
  vaneWarrenDmWarDrumControl,
} from '../../../src/vtt/vane-warren';
import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';

function position(state: EncounterState, id: CombatantId): GridCell {
  const token = state.tokens.find((candidate) => candidate.combatantId === id);
  if (token === undefined) throw new Error(`Missing token for ${id}.`);
  return token.position;
}

function attack(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
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

function fullPathLegalActions(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): LegalActionSummary {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actor);
  if (subject === undefined) throw new Error(`Missing combatant ${actor}.`);
  const origin = position(state, actor);
  const destination = position(state, target);
  const actions: EncounterCommand[] = [];
  if (gridDistance(origin, destination) <= 5 && subject.turn.action.kind === 'available') {
    actions.push(attack(actor, target));
  }
  if (gridDistance(origin, destination) > 5) {
    const path: GridCell[] = [];
    let cursor = origin;
    while (gridDistance(cursor, destination) > 5) {
      cursor = {
        column: cursor.column + Math.sign(destination.column - cursor.column),
        row: cursor.row + Math.sign(destination.row - cursor.row),
      };
      path.push(cursor);
    }
    actions.push({ type: 'move', actor, path, cause: 'voluntary' });
  }
  if (subject.turn.action.kind === 'available') actions.push({ type: 'dash', actor });
  actions.push({ type: 'end_turn', actor });
  return { actions };
}

function algorithmIdentities(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((subject) => ({
    combatantId: subject.profile.id,
    controllerId: `${subject.profile.id}:algorithm:host-regression`,
    kind: 'algorithm' as const,
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

function startedEncounter(input: Parameters<typeof createEncounter>[0]): EncounterState {
  return reduceEncounter(createEncounter(input), { type: 'roll_initiative' }, () => 0.5).state;
}

function hostUntil(
  host: DmEncounterHost,
  predicate: (snapshot: DmEncounterHostSnapshot) => boolean,
  maximumPulses: number,
): Promise<DmEncounterHostSnapshot> {
  return new Promise((resolve, reject) => {
    let pulses = 0;
    const timeout = setTimeout(() => {
      unsubscribe();
      host.interrupt();
      reject(new Error(`Host did not reach the expected state within ${String(maximumPulses)} pulses.`));
    }, 2_000);
    const unsubscribe = host.subscribe((snapshot) => {
      pulses += 1;
      if (predicate(snapshot)) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(snapshot);
        return;
      }
      if (pulses < maximumPulses) return;
      clearTimeout(timeout);
      unsubscribe();
      host.interrupt();
      reject(new Error(
        `Host exhausted ${String(maximumPulses)} pulses at round ${String(snapshot.dm.encounter.round)}: ` +
        `${snapshot.dm.decisionTray.actionRefusal?.reason ?? snapshot.dm.decisionTray.boundaryRefusal?.message ?? 'no refusal'}.`,
      ));
    });
    void host.start().catch(reject);
  });
}

describe('DmEncounterHost live algorithm path', () => {
  it('replays the same configured pure reducer used by live host commands', async () => {
    const players = [
      playerProfile('host-replay-player-a', { initiativeBonus: 30, hitPoints: 40 }),
      playerProfile('host-replay-player-b', { initiativeBonus: 20, hitPoints: 40 }),
      playerProfile('host-replay-player-c', { initiativeBonus: 10, hitPoints: 40 }),
      playerProfile('host-replay-player-d', { initiativeBonus: 5, hitPoints: 40 }),
      playerProfile('host-replay-player-e', { initiativeBonus: 0, hitPoints: 40 }),
    ] as const;
    const bundled = createVaneWarrenFight('cinder-rite', players);
    const soundDrum = vaneWarrenDmWarDrumControl(bundled);
    if (soundDrum === null) throw new Error('The Vane Warren war drum control is missing.');
    const alarmed = reduceVaneWarrenEncounter(bundled.encounter, soundDrum, () => 0).state;
    const initialState = { ...alarmed, round: 2 };
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:host-live-custom-reducer-replay', store, {
      initialState,
      initialControllers: algorithmIdentities(initialState),
      playerIds: players.map((player) => player.id),
    });

    await host.setHiddenRollCategory('death_saves', true);

    expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
      store.revisions(host.sessionId).at(-1)?.encounterState,
    );
    host.close();
  });

  it('advances a 14x10 all-algorithm encounter past round 2 without an over-budget refusal', async () => {
    const player = playerProfile('host-large-board-player', { hitPoints: 100, initiativeBonus: 20 });
    const monster = monsterProfile('host-large-board-monster', { hitPoints: 100, initiativeBonus: -20 });
    const initialState = startedEncounter({
      bounds: { columns: 14, rows: 10 },
      combatants: [player, monster],
      tokens: [placedToken(player, 0, 5), placedToken(monster, 13, 5)],
      environment: {
        difficultTerrainRegions: [{
          id: 'host-large-board-rubble',
          cells: [{ column: 5, row: 5 }],
        }],
        lightRegions: [],
        movementRegions: [],
        obscurementRegions: [],
      },
    });
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost(
      'session:host-live-large-board',
      store,
      {
        initialState,
        initialControllers: algorithmIdentities(initialState),
        playerIds: [player.id],
        turnLegalActions: (state, actor) => fullPathLegalActions(
          state,
          actor,
          actor === player.id ? monster.id : player.id,
        ),
      },
    );

    const advanced = await hostUntil(
      host,
      (snapshot) => snapshot.dm.encounter.round > 2 ||
        snapshot.dm.decisionTray.actionRefusal !== null,
      120,
    );

    expect(advanced.dm.encounter.round).toBeGreaterThan(2);
    expect(advanced.dm.decisionTray.actionRefusal).toBeNull();
    expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
      store.revisions(host.sessionId).at(-1)?.encounterState,
    );
    host.close();
  });

  it('resolving the host tray reaction unblocks its turn boundary and advances the round', async () => {
    const mover = playerProfile('host-tray-mover', { hitPoints: 100, initiativeBonus: 20 });
    const reactor = monsterProfile('host-tray-reactor', { hitPoints: 100, initiativeBonus: -20 });
    const legendary = monsterCombatantProfile(UNICORN, {
      combatantId: 'combatant:host-tray-legendary',
      tokenId: 'token:host-tray-legendary',
    });
    const initialState = startedEncounter({
      bounds: { columns: 14, rows: 10 },
      combatants: [mover, reactor, legendary],
      tokens: [
        placedToken(mover, 1, 5),
        placedToken(reactor, 0, 5),
        placedToken(legendary, 13, 5),
      ],
    });
    const host = new DmEncounterHost(
      'session:host-live-reaction-tray',
      new MemoryBrowserSessionStore(),
      {
        initialState,
        initialControllers: algorithmIdentities(initialState),
        playerIds: [mover.id],
        turnLegalActions: (state, actor) => actor === mover.id
          ? {
              actions: [
                ...(position(state, actor).column === 1
                  ? [{
                      type: 'move' as const,
                      actor,
                      path: [{ column: 2, row: 5 }],
                      cause: 'voluntary' as const,
                    }]
                  : []),
                { type: 'end_turn' as const, actor },
              ],
            }
          : { actions: [{ type: 'end_turn', actor }] },
        reactionLegalActions: (_state, reacting, moving) => reacting === reactor.id && moving === mover.id
          ? [{ ...attack(reacting, moving), type: 'opportunity_attack' }]
          : [],
      },
    );

    const startedRound = host.snapshot().dm.encounter.round;
    let blocked = await hostUntil(
      host,
      (snapshot) => snapshot.dm.decisionTray.boundaryRefusal?.code === 'turn_boundary_blocked',
      40,
    );
    expect(blocked.dm.decisionTray.entries).toContainEqual(expect.objectContaining({
      kind: 'pending',
      decision: expect.objectContaining({ kind: 'reaction_offer' }),
    }));

    const resolvedIds: string[] = [];
    for (let resolutions = 0; resolutions < 6; resolutions += 1) {
      const entry = blocked.dm.decisionTray.entries.find((candidate) => candidate.kind === 'pending');
      if (entry?.kind !== 'pending') throw new Error('Expected a pending host tray entry.');
      const option = entry.decision.options[0];
      if (option === undefined) throw new Error('Expected a host tray option.');
      resolvedIds.push(entry.decision.id);
      await host.resolvePendingDecision(entry.decision.id, option.id);
      const next = await hostUntil(
        host,
        (snapshot) => snapshot.dm.encounter.round > startedRound ||
          snapshot.dm.decisionTray.boundaryRefusal?.code === 'turn_boundary_blocked',
        40,
      );
      if (next.dm.encounter.round > startedRound) {
        blocked = next;
        break;
      }
      blocked = next;
    }
    const advanced = blocked;

    expect(advanced.dm.decisionTray.boundaryRefusal).toBeNull();
    expect(advanced.dm.encounter.round).toBeGreaterThan(startedRound);
    expect(resolvedIds.length).toBeGreaterThanOrEqual(2);
    expect(advanced.dm.encounter.recentEvents.filter(
      (event) => event.type === 'pending_decision_resolved' && resolvedIds.includes(event.decisionId),
    )).toHaveLength(resolvedIds.length);
    host.close();
  });

  it('does not queue a Wolf opportunity-attack decision when no attack is executable', async () => {
    const mover = playerProfile('host-wolf-oa-mover', { hitPoints: 100, initiativeBonus: 20 });
    const wolf = monsterCombatantProfile(WOLF, {
      combatantId: 'combatant:host-wolf-oa-reactor',
      tokenId: 'token:host-wolf-oa-reactor',
    });
    const initialState = startedEncounter({
      bounds: { columns: 4, rows: 3 },
      combatants: [mover, wolf],
      tokens: [placedToken(mover, 1, 1), placedToken(wolf, 0, 1)],
    });
    const host = new DmEncounterHost(
      'session:host-wolf-no-executable-oa',
      new MemoryBrowserSessionStore(),
      {
        initialState,
        initialControllers: algorithmIdentities(initialState),
        playerIds: [mover.id],
        turnLegalActions: (state, actor) => actor === mover.id
          ? {
              actions: [
                ...(position(state, actor).column === 1
                  ? [{
                      type: 'move' as const,
                      actor,
                      path: [{ column: 2, row: 1 }],
                      cause: 'voluntary' as const,
                    }]
                  : []),
                { type: 'end_turn' as const, actor },
              ],
            }
          : { actions: [{ type: 'end_turn', actor }] },
        reactionLegalActions: () => [],
      },
    );

    const startedRound = host.snapshot().dm.encounter.round;
    const advanced = await hostUntil(
      host,
      (snapshot) => snapshot.dm.encounter.round > startedRound ||
        snapshot.dm.decisionTray.boundaryRefusal?.code === 'turn_boundary_blocked',
      40,
    );

    expect(advanced.dm.encounter.round).toBeGreaterThan(startedRound);
    expect(advanced.dm.decisionTray.entries.filter((entry) => entry.kind === 'pending')).toEqual([]);
    expect(advanced.dm.decisionTray.boundaryRefusal).toBeNull();
    host.close();
  });
});
