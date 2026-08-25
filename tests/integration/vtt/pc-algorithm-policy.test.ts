import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AlgorithmController,
  ControllerRegistry,
  type Controller,
  type ControllerDecision,
  type ControllerRequest,
  type LegalActionSummary,
} from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { gridDistance } from '../../../src/combat/grid';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides, type CombatantId } from '../../../src/combat/values';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
} from '../../../src/combat/visibility';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { rpcRegistry } from '../../../src/worker/registry';
import { composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import { loadD365SampleParty, type D365SamplePartyLoad } from '../../../src/vtt/d365-sample-party';
import { createPartySessionState } from '../../../src/vtt/party-session-state';
import {
  regretReactionLegalActions,
} from '../../../src/vtt/regret/legal-actions';
import type { HandlerContext } from '../../../src/worker/handler';
import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';
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
    if (type === 'message') {
      this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

function attack(
  actor: CombatantId,
  target: CombatantId,
  attackId: string,
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
        type: damageType('Piercing'),
        dice: { count: 0, sides: dieSides(6), modifier: 2 },
      }],
      critical: false,
      responses: [],
    },
    attackId,
  };
}

function startedState(
  combatants: readonly ReturnType<typeof playerProfile>[],
  tokens: readonly ReturnType<typeof placedToken>[],
  columns = 12,
): EncounterState {
  const state = createEncounter({
    bounds: { columns, rows: 3 },
    combatants,
    tokens,
  });
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
}

function requestFor(
  state: EncounterState,
  actor: CombatantId,
  actions: readonly EncounterCommand[],
): ControllerRequest {
  return {
    kind: 'turn',
    requestId: `request:${String(state.revision)}:${actor}`,
    encounterRevision: state.revision,
    actorId: actor,
    visibleState: projectPlayerView(state, { seatId: String(actor), combatantId: actor }),
    legalActions: { actions },
  };
}

class RecordingAlgorithmController implements Controller {
  readonly decisions: EncounterCommand[] = [];
  readonly #algorithm = new AlgorithmController();

  async choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    const decision = await this.#algorithm.choose(request, signal);
    this.decisions.push(decision.action);
    return decision;
  }
}

function combatantPosition(state: EncounterState, id: CombatantId) {
  const token = state.tokens.find((candidate) => candidate.combatantId === id);
  if (token === undefined) throw new Error(`Missing token for ${id}.`);
  return token.position;
}

function meleeOnlyLegalActions(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): LegalActionSummary {
  const acting = state.combatants.find((candidate) => candidate.profile.id === actor);
  if (acting === undefined) throw new Error(`Missing actor ${actor}.`);
  const actions: EncounterCommand[] = [];
  const origin = combatantPosition(state, actor);
  const destination = combatantPosition(state, target);
  if (acting.turn.movement.remaining >= 5 && origin.column + 1 < destination.column) {
    actions.push({
      type: 'move',
      actor,
      path: [{ column: origin.column + 1, row: origin.row }],
      cause: 'voluntary',
    });
  }
  if (acting.turn.action.kind === 'available') {
    if (gridDistance(origin, destination) <= 5) {
      actions.push(attack(actor, target, 'attack:test-melee'));
    }
    // Dash grants extra movement equal to Speed for this turn:
    // docs/srd/full/srd-5.2.1.txt:11589-11596.
    actions.push({ type: 'dash', actor });
  }
  actions.push({ type: 'end_turn', actor });
  return { actions };
}

function combatResolved(state: EncounterState): boolean {
  const playersRemain = state.combatants.some((candidate) =>
    candidate.profile.kind === 'player_character' && candidate.life !== 'dead');
  const monstersRemain = state.combatants.some((candidate) =>
    candidate.profile.kind === 'monster' && candidate.life !== 'dead');
  return !playersRemain || !monstersRemain;
}

interface RoomRun {
  readonly outcome: 'victory' | 'defeat';
  readonly round: number;
  readonly journal: string;
  readonly eventTypes: readonly string[];
  readonly spellSlotLevels: readonly (number | null)[];
}

describe('player-character AlgorithmController policy', () => {
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

  it('pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally', async () => {
    const archer = playerProfile('pc-policy-archer', { initiativeBonus: 20 });
    const ally = playerProfile('pc-policy-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('pc-policy-enemy', { initiativeBonus: -20 });
    const state = startedState(
      [archer, ally, enemy],
      [placedToken(archer, 0, 1), placedToken(ally, 2, 1), placedToken(enemy, 8, 1)],
    );
    const legalActions = {
      actions: [
        attack(archer.id, ally.id, 'attack:test-bow'),
        { type: 'dash' as const, actor: archer.id },
        attack(archer.id, enemy.id, 'attack:test-bow'),
        { type: 'end_turn' as const, actor: archer.id },
      ],
    };
    const algorithm = new AlgorithmController();

    const decision = await algorithm.choose(
      requestFor(state, archer.id, legalActions.actions),
      new AbortController().signal,
    );
    expect(decision.action).toMatchObject({
      type: 'attack',
      actor: archer.id,
      target: enemy.id,
      attackId: 'attack:test-bow',
    });

    const candidates = algorithm.enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      archer.id,
      legalActions,
    );
    expect(candidates[0]?.program).toEqual({
      kind: 'action',
      action: {
        kind: 'attack',
        target: { kind: 'combatant', combatantId: enemy.id },
        attackId: 'attack:test-bow',
      },
    });
    expect(canonicalJson(candidates)).not.toContain(String(ally.id));
  });

  it('never_closes_distance: an out-of-reach melee PC dashes, closes, and attacks on its next turn', async () => {
    const melee = playerProfile('pc-policy-melee', { initiativeBonus: 20 });
    const enemy = monsterProfile('pc-policy-melee-target', { initiativeBonus: -20 });
    const initial = startedState(
      [melee, enemy],
      [placedToken(melee, 0, 1), placedToken(enemy, 8, 1)],
    );
    const recorder = new RecordingAlgorithmController();
    const coordinator = new TurnCoordinator(
      initial,
      new ControllerRegistry([
        { combatantId: melee.id, controller: recorder },
        { combatantId: enemy.id, controller: new AlgorithmController() },
      ]),
      mulberry32(7_311),
      {
        turnLegalActions: (state, actor) => actor === melee.id
          ? meleeOnlyLegalActions(state, actor, enemy.id)
          : { actions: [{ type: 'end_turn', actor }] },
      },
    );

    for (let guard = 0; guard < 30 && !recorder.decisions.some((action) => action.type === 'attack'); guard += 1) {
      const step = await coordinator.step();
      expect(step.kind).toBe('applied');
    }
    const dashIndex = recorder.decisions.findIndex((action) => action.type === 'dash');
    const firstEndIndex = recorder.decisions.findIndex((action) => action.type === 'end_turn');
    const attackIndex = recorder.decisions.findIndex((action) => action.type === 'attack');
    expect(dashIndex).toBeGreaterThanOrEqual(0);
    expect(firstEndIndex).toBeGreaterThan(dashIndex);
    expect(attackIndex).toBeGreaterThan(firstEndIndex);
    expect(recorder.decisions[attackIndex]).toMatchObject({
      type: 'attack',
      target: enemy.id,
    });
  });

  async function runRoomOne(seed: number): Promise<RoomRun> {
    const encounter = composeD365Room(
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    );
    const registry = new ControllerRegistry(encounter.state.combatants.map((candidate) => ({
      combatantId: candidate.profile.id,
      controller: new AlgorithmController(),
    })));
    const coordinator = new TurnCoordinator(
      encounter.state,
      registry,
      mulberry32(seed),
      {
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: regretReactionLegalActions,
      },
    );
    let steps = 0;
    while (!combatResolved(coordinator.state()) && coordinator.state().round <= 20 && steps < 2_000) {
      const step = await coordinator.step();
      if (step.kind === 'refused') throw new Error(step.reason);
      steps += 1;
    }
    const state = coordinator.state();
    if (!combatResolved(state)) {
      throw new Error(`Room 1 did not resolve by round ${String(state.round)} after ${String(steps)} steps.`);
    }
    const monstersRemain = state.combatants.some((candidate) =>
      candidate.profile.kind === 'monster' && candidate.life !== 'dead');
    return {
      outcome: monstersRemain ? 'defeat' : 'victory',
      round: state.round,
      journal: canonicalJson(state.eventLog),
      eventTypes: state.eventLog.map((event) => event.type),
      spellSlotLevels: state.eventLog.flatMap((event) =>
        event.type === 'spell_cast' ? [event.slotLevel] : []),
    };
  }

  it('room-1-terminates: four algorithm PCs versus the bundled pack reaches an end state within 4 rounds', async () => {
    const result = await runRoomOne(20_260_824);
    expect(result.round).toBeLessThanOrEqual(4);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(result.eventTypes).toContain('attack_resolved');
    expect(result.eventTypes).toContain('spell_cast');
    expect(result.spellSlotLevels.length).toBeGreaterThan(0);
    expect(result.spellSlotLevels.every((slotLevel) => slotLevel === null)).toBe(true);
  });

  it('same-seed-determinism: two room-1 runs produce identical journals and outcomes', async () => {
    const first = await runRoomOne(20_260_824);
    const second = await runRoomOne(20_260_824);
    expect(second).toEqual(first);
  });

  it('nondeterministic_pick: canonical tie-breaking is independent of legal-action input order', async () => {
    const actor = playerProfile('pc-policy-tie', { initiativeBonus: 20 });
    const alpha = monsterProfile('pc-policy-alpha', { initiativeBonus: -10 });
    const omega = monsterProfile('pc-policy-omega', { initiativeBonus: -20 });
    const state = startedState(
      [actor, alpha, omega],
      [placedToken(actor, 1, 1), placedToken(alpha, 0, 1), placedToken(omega, 2, 1)],
      4,
    );
    const left = attack(actor.id, alpha.id, 'attack:test-bow');
    const right = attack(actor.id, omega.id, 'attack:test-bow');
    const controller = new AlgorithmController();
    const first = await controller.choose(
      requestFor(state, actor.id, [left, right]),
      new AbortController().signal,
    );
    const second = await controller.choose(
      requestFor(state, actor.id, [right, left]),
      new AbortController().signal,
    );
    expect(second.action).toEqual(first.action);
  });

  it('keeps the monster candidate enumeration and ranking unchanged', () => {
    const monster = monsterProfile('pc-policy-monster-enum', { initiativeBonus: 20 });
    const player = playerProfile('pc-policy-player-enum', { initiativeBonus: -20 });
    const state = startedState(
      [monster, player],
      [placedToken(monster, 0, 1), placedToken(player, 3, 1)],
    );
    const candidates = new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      monster.id,
    );
    expect(candidates.map(({ program, score }) => ({ program, score }))).toEqual([
      {
        program: {
          kind: 'action',
          action: { kind: 'attack', target: { kind: 'combatant', combatantId: player.id } },
        },
        score: 85,
      },
      {
        program: {
          kind: 'action',
          action: { kind: 'force_save', target: { kind: 'combatant', combatantId: player.id } },
        },
        score: 81,
      },
      {
        program: {
          kind: 'action',
          action: { kind: 'move_toward', target: { kind: 'combatant', combatantId: player.id } },
        },
        score: 35,
      },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'dodge' } }, score: 20 },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } }, score: 0 },
    ]);
  });
});
