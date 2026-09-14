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
import { createConversationRoundDeadline } from '../../../src/vtt/agent-session-lifecycle';
import {
  createEngineMcpRuntime as createDefaultEngineMcpRuntime,
  freshMonsterPlanningState,
} from '../../../src/vtt/mcp/entrypoint';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  createRevisionBoundEngineOptionEnvironment,
  engineOptionEnvironmentFromBinding,
} from '../../../src/vtt/offers/offer-environment';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { MAX_PROPOSAL_CORRECTIONS } from '../../../src/vtt/turn-exhaustion-coordinator';
import { agentSessionIdFromCli } from '../../../src/vtt/agent-session';
import {
  createVaneWarrenFight,
  reduceVaneWarrenEncounter,
  vaneWarrenDmWarDrumControl,
} from '../../../src/vtt/vane-warren';
import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';

const BOUND_OFFER_ENVIRONMENT = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
let offerEnvironmentIdentityChecked = false;

function observeOfferEnvironment(offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT) {
  let bindingReads = 0;
  return {
    environment: new Proxy(offerEnvironment, {
      get(target, property, receiver) {
        if (property === 'binding') bindingReads += 1;
        return Reflect.get(target, property, receiver) as unknown;
      },
    }),
    bindingReads: () => bindingReads,
  };
}

function expectOfferEnvironmentIdentity(
  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
  offerEnvironment: typeof BOUND_OFFER_ENVIRONMENT,
): void {
  const planningState = freshMonsterPlanningState(state);
  const actorId = planningState.combatants.find(
    (candidate) => candidate.profile.kind === 'monster' && candidate.life === 'living',
  )?.profile.id;
  if (actorId === undefined) throw new Error('Offer-environment probe has no living monster.');
  const option = availableEngineActorOptions(planningState, actorId, offerEnvironment)[0];
  if (option === undefined) throw new Error(`Offer-environment probe has no option for ${actorId}.`);
  expect(resolveEngineActorOption(planningState, option, offerEnvironment).valid).toBe(true);
  const equalBindingEnvironment = engineOptionEnvironmentFromBinding(
    offerEnvironment.queries,
    offerEnvironment.binding,
  );
  expect(equalBindingEnvironment).not.toBe(offerEnvironment);
  expect(equalBindingEnvironment.binding).toEqual(offerEnvironment.binding);
  expect(resolveEngineActorOption(planningState, option, equalBindingEnvironment)).toMatchObject({
    valid: false,
    code: 'OFFER_ENVIRONMENT_MISMATCH',
  });
}

function createEngineMcpRuntime(
  state: Parameters<typeof createDefaultEngineMcpRuntime>[0],
  options: NonNullable<Parameters<typeof createDefaultEngineMcpRuntime>[1]> = {},
): ReturnType<typeof createDefaultEngineMcpRuntime> {
  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
  const observed = observeOfferEnvironment(offerEnvironment);
  const runtime = createDefaultEngineMcpRuntime(state, { ...options, offerEnvironment: observed.environment });
  expect(observed.bindingReads()).toBeGreaterThan(0);
  if (!offerEnvironmentIdentityChecked) {
    expectOfferEnvironmentIdentity(state, observed.environment);
    offerEnvironmentIdentityChecked = true;
  }
  return runtime;
}

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
  it('constructs and drives turn exhaustion through the supplied round deadline', async () => {
    const player = playerProfile('host-deadline-player', { initiativeBonus: 20 });
    const monster = monsterProfile('host-deadline-monster', { initiativeBonus: -20 });
    const state = startedEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [player, monster],
      tokens: [placedToken(player, 0), placedToken(monster, 3)],
    });
    const host = new DmEncounterHost(
      'session:host-turn-exhaustion-deadline',
      new MemoryBrowserSessionStore(),
      {
        initialState: state,
        initialControllers: algorithmIdentities(state),
        playerIds: [player.id],
      },
    );
    const runtime = createEngineMcpRuntime(state, {
      phase: 'correction',
      correctionNumber: MAX_PROPOSAL_CORRECTIONS,
      requestedActorIds: [monster.id],
    });
    const capsule = runtime.feed.current();
    const request = capsule.request;
    if (request === null || request.phase !== 'correction') {
      throw new Error('Host deadline integration fixture omitted its correction request.');
    }
    const deadline = createConversationRoundDeadline(180_000, 0, () => 25);
    let receivedDeadline = false;
    let deterministicApplications = 0;

    const outcome = await host.turnExhaustionCoordinator().coordinate({
      initial: {
        kind: 'exhausted',
        requestId: request.requestId,
        initialProposalId: 'proposal:host-deadline-initial',
        actorFailures: [{ actorId: monster.id, fallbackResult: 'absent' }],
      },
      correction: {
        capsule,
        rules: { get: () => null },
        turnContext: { request: { phase: 'correction' } },
        lifecycle: {
          resumeCorrection: async (_invocation, received) => {
            receivedDeadline = received === deadline;
            return {
              resumeSessionId: agentSessionIdFromCli('codex:host-deadline'),
              sessionId: null,
              finalText: '',
              usage: null,
              exit: 'completed',
            };
          },
        },
        invocation: {
          instructionSource: 'none',
          skill: null,
          runId: capsule.runId,
          prompt: 'host deadline boundary',
          model: 'SIMULATED-model',
          reasoningEffort: 'SIMULATED-effort',
          sessionProfile: 'test',
          callPhase: 'correction',
          output: { kind: 'tool_driven' },
          launcherToken: 'SIMULATED-host-deadline-launcher',
          timeoutMs: 180_000,
        },
        activateCapsule: () => undefined,
        takeProposal: () => null,
        validationFailureObserved: () => false,
      },
      escalation: null,
      deadline,
      host: {
        authorize: async () => 'invalid',
        resolveDeterministically: async (actorId) => ({
          actorId,
          expectedRevision: 1,
          resolutionDigest: 'd'.repeat(64),
        }),
        applyAutoResolved: async () => { deterministicApplications += 1; },
        pauseForDmAdjudication: () => undefined,
      },
    });

    expect(receivedDeadline).toBe(true);
    expect(outcome).toEqual({ kind: 'auto_resolved', actorIds: [monster.id] });
    expect(deterministicApplications).toBe(1);
    host.close();
  });

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
        narrowOpeningRegions: [],
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
        placedToken(legendary, 12, 5),
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

  it.each([
    ['decline', 'decline'],
    ['take', 'accept'],
  ] as const)(
    'auto-resolves a non-human ask Reaction with unattended %s and advances the round',
    async (askDefault, resolution) => {
      const mover = playerProfile(`host-unattended-${askDefault}-mover`, { hitPoints: 100, initiativeBonus: 20 });
      const reactor = monsterProfile(`host-unattended-${askDefault}-reactor`, { hitPoints: 100, initiativeBonus: -20 });
      const initialState = startedEncounter({
        bounds: { columns: 5, rows: 2 },
        combatants: [mover, reactor],
        tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
        reactionPolicies: [{
          combatant: reactor.id,
          reactionKind: 'opportunity_attack',
          policy: 'ask',
        }],
      });
      const store = new MemoryBrowserSessionStore();
      const host = new DmEncounterHost(
        `session:host-unattended-reaction-${askDefault}`,
        store,
        {
          initialState,
          initialControllers: algorithmIdentities(initialState),
          playerIds: [mover.id],
          reactionOfferPolicy: { kind: 'unattended', askDefault },
          turnLegalActions: (state, actor) => actor === mover.id
            ? {
                actions: [
                  ...(position(state, actor).column === 1
                    ? [{
                        type: 'move' as const,
                        actor,
                        path: [{ column: 2, row: 0 }],
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
      const advanced = await hostUntil(
        host,
        (snapshot) => snapshot.dm.encounter.round > startedRound ||
          snapshot.dm.decisionTray.boundaryRefusal?.code === 'turn_boundary_blocked',
        60,
      );

      expect(advanced.dm.encounter.round).toBeGreaterThan(startedRound);
      expect(advanced.dm.decisionTray.boundaryRefusal).toBeNull();
      expect(advanced.dm.encounter.recentEvents).toContainEqual(expect.objectContaining({
        type: 'pending_decision_resolved',
        optionId: resolution,
      }));
      expect(store.revisions(host.sessionId).map((revision) => revision.transition))
        .toContainEqual(expect.objectContaining({
          kind: 'unattended_reaction_auto_resolved',
          configuredPolicy: 'ask',
          askDefault,
          resolution,
        }));
      expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
        store.revisions(host.sessionId).at(-1)?.encounterState,
      );
      host.close();
    },
  );

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
