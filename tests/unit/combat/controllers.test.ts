import { describe, expect, it } from 'vitest';
import {
  AgentController,
  AlgorithmController,
  ControllerRegistry,
  HumanController,
  StaleControllerResponseError,
  evaluateOpportunityAttackPolicy,
  type Controller,
  type ControllerRequest,
  type StandingReactionPolicy,
} from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
import { projectPlayerView } from '../../../src/combat/visibility';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function startedPair() {
  const active = playerProfile('active-controller', { initiativeBonus: 20 });
  const other = monsterProfile('other-controller', { initiativeBonus: -20 });
  const initial = createEncounter({
    bounds: { columns: 6, rows: 2 },
    combatants: [active, other],
    tokens: [placedToken(active, 0), placedToken(other, 5)],
  });
  return {
    active,
    other,
    state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state,
  };
}

function endTurnRequest() {
  const fixture = startedPair();
  const request: ControllerRequest = {
    kind: 'turn',
    requestId: 'request:1',
    encounterRevision: fixture.state.revision,
    actorId: fixture.active.id,
    visibleState: projectPlayerView(fixture.state, {
      seatId: String(fixture.active.id),
      combatantId: fixture.active.id,
    }),
    legalActions: {
      actions: [{ type: 'end_turn', actor: fixture.active.id }],
    },
  };
  return { ...fixture, request };
}

describe('one Controller contract and stale response rejection', () => {
  it.each([
    [{ opportunityAttack: 'use' }, 'use'],
    [{ opportunityAttack: 'decline' }, 'decline'],
    [null, 'prompt'],
  ] as const)('evaluates standing policy %j as %s', (policy, expected) => {
    expect(evaluateOpportunityAttackPolicy(policy)).toBe(expected);
  });

  it('AlgorithmController returns the same decision for the same visible request', async () => {
    const fixture = endTurnRequest();
    const controller: Controller = new AlgorithmController();
    const first = await controller.choose(fixture.request, new AbortController().signal);
    const second = await controller.choose(fixture.request, new AbortController().signal);
    expect(first).toEqual(second);
  });

  it('AgentController refuses a response tied to a superseded request id', async () => {
    const fixture = endTurnRequest();
    const controller: Controller = new AgentController({
      exchange: async (request) => ({
        protocolVersion: 1,
        requestId: `${request.requestId}:stale`,
        encounterRevision: request.encounterRevision,
        action: request.legalActions.actions[0],
      }),
    });
    await expect(
      controller.choose(fixture.request, new AbortController().signal),
    ).rejects.toBeInstanceOf(StaleControllerResponseError);
  });

  it('coordinator refuses a stale encounter revision without applying its action', async () => {
    const fixture = startedPair();
    const staleAgent = new AgentController({
      exchange: async (request) => ({
        protocolVersion: 1,
        requestId: request.requestId,
        encounterRevision: request.encounterRevision - 1,
        action: request.legalActions.actions[0],
      }),
    });
    const coordinator = new TurnCoordinator(
      fixture.state,
      new ControllerRegistry([
        { combatantId: fixture.active.id, controller: staleAgent },
        { combatantId: fixture.other.id, controller: new AlgorithmController() },
      ]),
      () => 0.5,
    );
    const result = await coordinator.step();
    expect(result).toMatchObject({ kind: 'refused', state: fixture.state });
    expect(coordinator.state()).toBe(fixture.state);
  });

  it('M13-AGENT-CHANGES-ACTOR refuses a response whose action belongs to another combatant', async () => {
    const fixture = startedPair();
    const wrongActor = new AgentController({
      exchange: async (request) => ({
        protocolVersion: 1,
        requestId: request.requestId,
        encounterRevision: request.encounterRevision,
        action: { type: 'end_turn', actor: fixture.other.id },
      }),
    });
    const coordinator = new TurnCoordinator(
      fixture.state,
      new ControllerRegistry([
        { combatantId: fixture.active.id, controller: wrongActor },
        { combatantId: fixture.other.id, controller: new AlgorithmController() },
      ]),
      () => 0.5,
    );
    await expect(coordinator.step()).resolves.toMatchObject({
      kind: 'refused',
      state: fixture.state,
    });
    expect(coordinator.state()).toBe(fixture.state);
  });

  it('controller swap aborts the old prompt and reissues at the action boundary', async () => {
    const fixture = startedPair();
    const oldHuman = new HumanController();
    const replacement = new HumanController();
    const registry = new ControllerRegistry([
      { combatantId: fixture.active.id, controller: oldHuman },
      { combatantId: fixture.other.id, controller: new AlgorithmController() },
    ]);
    const coordinator = new TurnCoordinator(fixture.state, registry, () => 0.5);
    const step = coordinator.step();
    await Promise.resolve();
    const oldRequest = oldHuman.pendingRequest();
    if (oldRequest === null) throw new Error('Old controller did not receive its request.');

    coordinator.replaceController(fixture.active.id, replacement);
    await Promise.resolve();
    await Promise.resolve();
    const newRequest = replacement.pendingRequest();
    if (newRequest === null) throw new Error('Replacement controller did not receive a request.');

    expect(newRequest.requestId).not.toBe(oldRequest.requestId);
    expect(() => oldHuman.submit({
      requestId: oldRequest.requestId,
      encounterRevision: oldRequest.encounterRevision,
      action: { type: 'end_turn', actor: fixture.active.id },
    })).toThrow(StaleControllerResponseError);

    replacement.submit({
      requestId: newRequest.requestId,
      encounterRevision: newRequest.encounterRevision,
      action: { type: 'end_turn', actor: fixture.active.id },
    });
    await expect(step).resolves.toMatchObject({ kind: 'applied' });
    expect(coordinator.state().revision).toBe(fixture.state.revision + 1);
  });
});

function reactionFixture(policy: 'use' | 'decline' | null) {
  const mover = monsterProfile('reaction-mover', { initiativeBonus: 20, hitPoints: 20 });
  const reactor = playerProfile('reaction-pc', { initiativeBonus: -20 });
  const state = createEncounter({
    bounds: { columns: 5, rows: 2 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
  });
  const reactorHuman = new HumanController();
  const registry = new ControllerRegistry([
    { combatantId: mover.id, controller: new AlgorithmController() },
    { combatantId: reactor.id, controller: reactorHuman },
  ]);
  const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
    type: 'move',
    actor: mover.id,
    path: [{ column: 2, row: 0 }],
    cause: 'voluntary',
  };
  const opportunityAttack: Extract<
    EncounterCommand,
    { readonly type: 'opportunity_attack' }
  > = {
    type: 'opportunity_attack',
    actor: reactor.id,
    target: mover.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Force'),
        dice: { count: 0, sides: dieSides(6), modifier: 1 },
      }],
      critical: false,
      responses: [],
    },
  };
  const policies = new Map<CombatantId, StandingReactionPolicy>();
  if (policy !== null) policies.set(reactor.id, { opportunityAttack: policy });
  const coordinator = new TurnCoordinator(state, registry, () => 0.5, {
    turnLegalActions: (_current, actor) => ({
      actions: actor === mover.id ? [move, { type: 'end_turn', actor }] : [{ type: 'end_turn', actor }],
    }),
    reactionLegalActions: () => [opportunityAttack],
    standingReactionPolicies: policies,
  });
  return { coordinator, mover, reactor, reactorHuman };
}

describe('reaction policy windows and local turn coordination', () => {
  it('standing use resolves an Opportunity Attack without a HumanController prompt', async () => {
    const fixture = reactionFixture('use');
    await fixture.coordinator.step();
    const result = await fixture.coordinator.step();
    expect(fixture.reactorHuman.pendingRequest()).toBeNull();
    expect(result).toMatchObject({ kind: 'applied' });
    if (result.kind !== 'applied') throw new Error(result.reason);
    expect(result.events.map((event) => event.type)).toEqual([
      'resource_spent',
      'damage_applied',
      'attack_resolved',
      'movement_completed',
    ]);
  });

  it('standing decline records the refusal and moves without a HumanController prompt', async () => {
    const fixture = reactionFixture('decline');
    await fixture.coordinator.step();
    const result = await fixture.coordinator.step();
    expect(fixture.reactorHuman.pendingRequest()).toBeNull();
    expect(result).toMatchObject({ kind: 'applied' });
    if (result.kind !== 'applied') throw new Error(result.reason);
    expect(result.events.map((event) => event.type)).toEqual([
      'reaction_declined',
      'movement_completed',
    ]);
  });

  it('ambiguous reaction creates a durable HumanController prompt instead of auto-declining', async () => {
    const fixture = reactionFixture(null);
    await fixture.coordinator.step();
    const pendingStep = fixture.coordinator.step();
    await Promise.resolve();
    await Promise.resolve();
    const request = fixture.reactorHuman.pendingRequest();
    if (request === null || request.kind !== 'reaction') {
      throw new Error('Ambiguous policy did not create the reaction prompt.');
    }
    expect(request.legalActions.actions.map((action) => action.type)).toEqual([
      'opportunity_attack',
      'decline_reaction',
    ]);
    fixture.reactorHuman.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: { type: 'decline_reaction', actor: fixture.reactor.id, mover: fixture.mover.id },
    });
    const result = await pendingStep;
    expect(result).toMatchObject({ kind: 'applied' });
    expect(fixture.reactorHuman.pendingRequest()).toBeNull();
  });

  it('same seed and controller inputs produce the same complete event stream', async () => {
    async function run(seed: number) {
      const left = playerProfile('deterministic-left', { initiativeBonus: 1 });
      const right = monsterProfile('deterministic-right', { initiativeBonus: 1 });
      const state = createEncounter({
        bounds: { columns: 4, rows: 2 },
        combatants: [left, right],
        tokens: [placedToken(left, 0), placedToken(right, 3)],
      });
      const registry = new ControllerRegistry([
        { combatantId: left.id, controller: new AlgorithmController() },
        { combatantId: right.id, controller: new AlgorithmController() },
      ]);
      const coordinator = new TurnCoordinator(state, registry, mulberry32(seed));
      for (let step = 0; step < 7; step += 1) await coordinator.step();
      return coordinator.state().eventLog;
    }

    expect(await run(4242)).toEqual(await run(4242));
  });
});
