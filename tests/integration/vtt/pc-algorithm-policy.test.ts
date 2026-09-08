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
import {
  coverTierBetweenObjects,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { traceTerrainLine } from '../../../src/combat/cover';
import type { EncounterCommand } from '../../../src/combat/events';
import { gridDistance } from '../../../src/combat/grid';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides, feet, type CombatantId } from '../../../src/combat/values';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
} from '../../../src/combat/visibility';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { rpcRegistry } from '../../../src/worker/registry';
import { D365_SAMPLE_DUNGEON, composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import { loadD365SampleParty, type D365SamplePartyLoad } from '../../../src/vtt/d365-sample-party';
import {
  capturePartySessionState,
  createPartySessionState,
  enterNextRoom,
  takeShortRest,
} from '../../../src/vtt/party-session-state';
import {
  regretReactionLegalActions,
} from '../../../src/vtt/regret/legal-actions';
import { composeVaneWarrenFight } from '../../../src/vtt/vane-warren';
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

function spell(
  actor: CombatantId,
  target: CombatantId,
  spellId: 'cure-wounds' | 'healing-word',
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell', actor, spellId, slotLevel: 1, castAsRitual: false,
    casterLevel: 5, attackBonus: 5, saveDc: 13, spellcastingModifier: 3,
    targets: [target], area: null, weaponAttack: null, selectedOption: null,
  };
}

function withHitPointEvent(
  state: EncounterState,
  source: CombatantId,
  target: CombatantId,
  hitPointsAfter: number,
): EncounterState {
  const subject = state.combatants.find((candidate) => candidate.profile.id === target);
  if (subject === undefined) throw new Error(`Missing hit-point event target ${target}.`);
  const hitPointsBefore = subject.hitPoints;
  const lifeState = hitPointsAfter === 0 ? 'dying' as const : 'living' as const;
  return {
    ...state,
    nextEventSequence: state.nextEventSequence + 1,
    combatants: state.combatants.map((candidate) => candidate.profile.id === target
      ? {
          ...candidate,
          hitPoints: hitPointsAfter,
          life: lifeState,
          deathSaves: lifeState === 'dying' ? { successes: 0, failures: 0 } : null,
        }
      : candidate),
    eventLog: [...state.eventLog, {
      sequence: state.nextEventSequence,
      type: 'damage_applied',
      source,
      target,
      amount: hitPointsBefore - hitPointsAfter,
      hitPointsBefore,
      hitPointsAfter,
      lifeState,
      massiveDamage: false,
    }],
  };
}

function startedState(
  combatants: readonly ReturnType<typeof playerProfile>[],
  tokens: readonly ReturnType<typeof placedToken>[],
  columns = 12,
  rows = 3,
): EncounterState {
  const state = createEncounter({
    bounds: { columns, rows },
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

function fullPathMeleeLegalActions(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): LegalActionSummary {
  const acting = state.combatants.find((candidate) => candidate.profile.id === actor);
  if (acting === undefined) throw new Error(`Missing actor ${actor}.`);
  const origin = combatantPosition(state, actor);
  const destination = combatantPosition(state, target);
  const actions: EncounterCommand[] = [];
  if (gridDistance(origin, destination) <= 5 && acting.turn.action.kind === 'available') {
    actions.push(attack(actor, target, 'attack:large-board-melee'));
  }
  if (acting.turn.movement.remaining >= 5 && gridDistance(origin, destination) > 5) {
    const path: Array<{ readonly column: number; readonly row: number }> = [];
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
  if (acting.turn.action.kind === 'available') actions.push({ type: 'dash', actor });
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
  readonly state: EncounterState;
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

  it('focus_fire_inverted: prefers the already-damaged enemy over a healthier closer target', async () => {
    const actor = playerProfile('pc-policy-focus', { initiativeBonus: 20 });
    const wounded = monsterProfile('pc-policy-wounded', { hitPoints: 20, initiativeBonus: -10 });
    const healthy = monsterProfile('pc-policy-healthy', { hitPoints: 20, initiativeBonus: -20 });
    const initial = startedState(
      [actor, wounded, healthy],
      [placedToken(actor, 0, 1), placedToken(wounded, 8, 1), placedToken(healthy, 3, 1)],
    );
    const woundedState = withHitPointEvent(initial, actor.id, wounded.id, 6);
    const state = withHitPointEvent(woundedState, actor.id, healthy.id, 20);
    const decision = await new AlgorithmController().choose(
      requestFor(state, actor.id, [
        attack(actor.id, healthy.id, 'attack:test-bow'),
        attack(actor.id, wounded.id, 'attack:test-bow'),
      ]),
      new AbortController().signal,
    );
    expect(decision.action).toMatchObject({ type: 'attack', target: wounded.id });
  });

  it('heals_enemies: heals a dying ally rather than a dying enemy', async () => {
    const healer = playerProfile('pc-policy-healer', { initiativeBonus: 20 });
    const ally = playerProfile('pc-policy-dying-ally', { hitPoints: 20, initiativeBonus: 0 });
    const enemy = monsterProfile('pc-policy-heal-enemy', { hitPoints: 20, initiativeBonus: -20 });
    const initial = startedState(
      [healer, ally, enemy],
      [placedToken(healer, 0, 1), placedToken(ally, 1, 1), placedToken(enemy, 4, 1)],
    );
    const allyDown = withHitPointEvent(initial, enemy.id, ally.id, 0);
    const state = withHitPointEvent(allyDown, healer.id, enemy.id, 0);
    const decision = await new AlgorithmController().choose(
      requestFor(state, healer.id, [
        attack(healer.id, enemy.id, 'attack:test-mace'),
        spell(healer.id, enemy.id, 'healing-word'),
        spell(healer.id, ally.id, 'healing-word'),
      ]),
      new AbortController().signal,
    );
    expect(decision.action).toMatchObject({
      type: 'cast_spell', spellId: 'healing-word', targets: [ally.id],
    });
  });

  it('heal_never_chosen: heals a dying ally before damaging an enemy', async () => {
    const healer = playerProfile('pc-policy-rescue-healer', { initiativeBonus: 20 });
    const ally = playerProfile('pc-policy-rescue-ally', { hitPoints: 20, initiativeBonus: 0 });
    const enemy = monsterProfile('pc-policy-rescue-enemy', { hitPoints: 20, initiativeBonus: -20 });
    const initial = startedState(
      [healer, ally, enemy],
      [placedToken(healer, 0, 1), placedToken(ally, 1, 1), placedToken(enemy, 4, 1)],
    );
    const state = withHitPointEvent(initial, enemy.id, ally.id, 0);
    const decision = await new AlgorithmController().choose(
      requestFor(state, healer.id, [
        attack(healer.id, enemy.id, 'attack:test-mace'),
        spell(healer.id, ally.id, 'healing-word'),
      ]),
      new AbortController().signal,
    );
    expect(decision.action).toMatchObject({
      type: 'cast_spell', spellId: 'healing-word', targets: [ally.id],
    });
  });

  it('healing_priority: heals a dying ally before an ally at half hit points', async () => {
    const healer = playerProfile('pc-policy-priority-healer', { initiativeBonus: 20 });
    const dyingAlly = playerProfile('pc-policy-priority-dying', {
      hitPoints: 20,
      initiativeBonus: 0,
    });
    const woundedAlly = playerProfile('pc-policy-priority-wounded', {
      hitPoints: 20,
      initiativeBonus: -10,
    });
    const initial = startedState(
      [healer, dyingAlly, woundedAlly],
      [
        placedToken(healer, 1, 1),
        placedToken(dyingAlly, 0, 1),
        placedToken(woundedAlly, 2, 1),
      ],
    );
    const dyingState = withHitPointEvent(initial, healer.id, dyingAlly.id, 0);
    const state = withHitPointEvent(dyingState, healer.id, woundedAlly.id, 10);
    const decision = await new AlgorithmController().choose(
      requestFor(state, healer.id, [
        spell(healer.id, woundedAlly.id, 'healing-word'),
        spell(healer.id, dyingAlly.id, 'healing-word'),
      ]),
      new AbortController().signal,
    );

    expect(decision.action).toMatchObject({
      type: 'cast_spell', spellId: 'healing-word', targets: [dyingAlly.id],
    });
  });

  it('heal_below_threshold: heals an ally at half of its last-known maximum before attacking', async () => {
    const healer = playerProfile('pc-policy-threshold-healer', { initiativeBonus: 20 });
    const ally = playerProfile('pc-policy-threshold-ally', { hitPoints: 20, initiativeBonus: 0 });
    const enemy = monsterProfile('pc-policy-threshold-enemy', { hitPoints: 20, initiativeBonus: -20 });
    const initial = startedState(
      [healer, ally, enemy],
      [placedToken(healer, 0, 1), placedToken(ally, 1, 1), placedToken(enemy, 4, 1)],
    );
    const state = withHitPointEvent(initial, enemy.id, ally.id, 10);
    const decision = await new AlgorithmController().choose(
      requestFor(state, healer.id, [
        attack(healer.id, enemy.id, 'attack:test-mace'),
        spell(healer.id, ally.id, 'cure-wounds'),
      ]),
      new AbortController().signal,
    );
    expect(decision.action).toMatchObject({
      type: 'cast_spell', spellId: 'cure-wounds', targets: [ally.id],
    });
  });

  it('ranged_hugs_melee: after shooting at range, moves farther away and stays put rather than provoking when adjacent', async () => {
    const archer = playerProfile('pc-policy-kiting-archer', { initiativeBonus: 20 });
    const enemy = monsterProfile('pc-policy-kiting-enemy', { hitPoints: 20, initiativeBonus: -20 });
    const initial = startedState(
      [archer, enemy],
      [placedToken(archer, 4, 1), placedToken(enemy, 7, 1)],
      10,
    );
    const rangedState: EncounterState = {
      ...initial,
      nextEventSequence: initial.nextEventSequence + 1,
      eventLog: [...initial.eventLog, {
        sequence: initial.nextEventSequence,
        type: 'spell_cast', caster: archer.id, spellId: 'eldritch-blast',
        slotLevel: null, targets: [enemy.id],
      }],
    };
    const away = { type: 'move' as const, actor: archer.id, path: [{ column: 3, row: 1 }], cause: 'voluntary' as const };
    const toward = { type: 'move' as const, actor: archer.id, path: [{ column: 5, row: 1 }], cause: 'voluntary' as const };
    const controller = new AlgorithmController();
    const kiting = await controller.choose(
      requestFor(rangedState, archer.id, [toward, away, { type: 'end_turn', actor: archer.id }]),
      new AbortController().signal,
    );
    expect(kiting.action).toEqual(away);

    const adjacent = startedState(
      [archer, enemy],
      [placedToken(archer, 4, 1), placedToken(enemy, 5, 1)],
      10,
    );
    const adjacentAfterShot: EncounterState = {
      ...adjacent,
      nextEventSequence: adjacent.nextEventSequence + 1,
      eventLog: [...adjacent.eventLog, {
        sequence: adjacent.nextEventSequence,
        type: 'spell_cast', caster: archer.id, spellId: 'eldritch-blast',
        slotLevel: null, targets: [enemy.id],
      }],
    };
    const doesNotProvoke = await controller.choose(
      requestFor(adjacentAfterShot, archer.id, [
        { type: 'move', actor: archer.id, path: [{ column: 3, row: 1 }], cause: 'voluntary' },
        { type: 'end_turn', actor: archer.id },
      ]),
      new AbortController().signal,
    );
    expect(doesNotProvoke.action).toEqual({ type: 'end_turn', actor: archer.id });
  });

  it('all four D365 rooms expose two fiction-anchored cover cells on live enemy firing lines', () => {
    const expected = [
      { room: 1, cells: ['4,1:three_quarters', '4,5:three_quarters'] },
      { room: 2, cells: ['5,1:half', '5,5:half'] },
      { room: 3, cells: ['4,2:three_quarters', '4,4:three_quarters'] },
      { room: 4, cells: ['5,2:half', '5,4:half'] },
    ] as const;
    for (const anchor of expected) {
      const partyState = { ...createPartySessionState(sample.party.members), room: anchor.room };
      const composed = composeD365Room(sample.party.members, sample.displayNames, partyState);
      const room = D365_SAMPLE_DUNGEON.rooms[anchor.room - 1];
      if (room === undefined) throw new Error(`D365 room ${String(anchor.room)} is missing.`);
      const coverObjects = composed.state.worldObjects.filter((object) => object.kind === 'cover');
      expect(coverObjects.map((object) =>
        `${String(object.position.column)},${String(object.position.row)}:${object.blocking.cover}`,
      )).toEqual(anchor.cells);
      expect(coverObjects).toHaveLength(2);
      for (const placement of room.coverPlacements) {
        const firingLines = placement.shelteredCells.flatMap((sheltered) => room.monsters.map((enemy) => ({
          sheltered,
          target: enemy.position,
          tier: coverTierBetweenObjects(composed.state.worldObjects, sheltered, enemy.position),
        })));
        expect(
          firingLines.some((line) => line.tier !== 'none'),
          `room ${String(room.room)} ${placement.id}: ${JSON.stringify(firingLines)}`,
        ).toBe(true);
      }
    }
  });

  it('pins why every D365 shelter cell provides cover under the corner rule', () => {
    const cases = [
      {
        room: 1,
        placementId: 'north-gate-pillar',
        original: null,
        chosen: { column: 3, row: 1 },
        target: { column: 7, row: 1 },
        chosenSourceCorner: { column: 3, row: 1 },
        objectLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
        liveSourceCorner: { column: 3, row: 1 },
        liveLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
      },
      {
        room: 1,
        placementId: 'south-gate-pillar',
        original: null,
        chosen: { column: 3, row: 5 },
        target: { column: 7, row: 5 },
        chosenSourceCorner: { column: 3, row: 5 },
        objectLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
        liveSourceCorner: { column: 3, row: 5 },
        liveLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
      },
      {
        room: 2,
        placementId: 'north-den-casks',
        original: { cell: { column: 4, row: 1 }, sourceCorner: { column: 4, row: 2 } },
        chosen: { column: 4, row: 0 },
        target: { column: 7, row: 2 },
        chosenSourceCorner: { column: 4, row: 0 },
        objectLineTiers: ['half', 'none', 'half', 'half'],
        liveSourceCorner: { column: 5, row: 0 },
        liveLineTiers: ['none', 'none', 'total', 'none'],
      },
      {
        room: 2,
        placementId: 'south-den-casks',
        original: { cell: { column: 4, row: 5 }, sourceCorner: { column: 4, row: 5 } },
        chosen: { column: 4, row: 6 },
        target: { column: 7, row: 4 },
        chosenSourceCorner: { column: 4, row: 6 },
        objectLineTiers: ['half', 'half', 'half', 'half'],
        liveSourceCorner: { column: 5, row: 7 },
        liveLineTiers: ['total', 'none', 'none', 'none'],
      },
      {
        room: 3,
        placementId: 'north-gallery-pillar',
        original: null,
        chosen: { column: 3, row: 2 },
        target: { column: 7, row: 2 },
        chosenSourceCorner: { column: 3, row: 2 },
        objectLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
        liveSourceCorner: { column: 3, row: 2 },
        liveLineTiers: ['none', 'none', 'total', 'total'],
      },
      {
        room: 3,
        placementId: 'south-gallery-pillar',
        original: null,
        chosen: { column: 3, row: 4 },
        target: { column: 7, row: 4 },
        chosenSourceCorner: { column: 3, row: 4 },
        objectLineTiers: ['none', 'none', 'three_quarters', 'three_quarters'],
        liveSourceCorner: { column: 3, row: 4 },
        liveLineTiers: ['none', 'none', 'total', 'total'],
      },
      {
        room: 4,
        placementId: 'north-crown-rubble',
        original: { cell: { column: 4, row: 2 }, sourceCorner: { column: 4, row: 3 } },
        chosen: { column: 3, row: 1 },
        target: { column: 8, row: 3 },
        chosenSourceCorner: { column: 3, row: 1 },
        objectLineTiers: ['half', 'none', 'half', 'half'],
        liveSourceCorner: { column: 4, row: 1 },
        liveLineTiers: ['none', 'none', 'total', 'total'],
      },
      {
        room: 4,
        placementId: 'south-crown-rubble',
        original: { cell: { column: 4, row: 4 }, sourceCorner: { column: 4, row: 4 } },
        chosen: { column: 3, row: 5 },
        target: { column: 8, row: 3 },
        chosenSourceCorner: { column: 3, row: 5 },
        objectLineTiers: ['half', 'half', 'half', 'half'],
        liveSourceCorner: { column: 4, row: 6 },
        liveLineTiers: ['total', 'total', 'none', 'none'],
      },
    ] as const;

    for (const expected of cases) {
      const partyState = { ...createPartySessionState(sample.party.members), room: expected.room };
      const composed = composeD365Room(sample.party.members, sample.displayNames, partyState);
      const room = D365_SAMPLE_DUNGEON.rooms[expected.room - 1];
      const placement = room?.coverPlacements.find((candidate) => candidate.id === expected.placementId);
      if (room === undefined || placement === undefined) {
        throw new Error(`D365 shelter fixture ${expected.placementId} is missing.`);
      }
      expect(placement.shelteredCells).toEqual([expected.chosen]);

      // Isolate the authored objects because shelteredCells names which cover
      // placement shelters the cell, not the coincident blocked-cell wall.
      const objectOnlyState: EncounterState = { ...composed.state, blockedCells: [] };
      if (expected.original !== null) {
        const original = traceTerrainLine(objectOnlyState, expected.original.cell, expected.target);
        expect({
          sourceCorner: original.sourceCorner,
          lineTiers: original.lines.map((line) => line.tier),
          lineCells: original.lines.map((line) => line.interveningCells),
          tier: original.tier,
        }).toEqual({
          sourceCorner: expected.original.sourceCorner,
          lineTiers: ['none', 'none', 'none', 'none'],
          lineCells: [[], [], [], []],
          tier: 'none',
        });
      }

      // Hand geometry from the listed source corner to the target's corners:
      // every non-None entry crosses the placement cell interior; every None
      // entry bypasses or only grazes it. The obstructed-ray count and authored
      // feature tier independently combine to Half Cover in all eight cases.
      const objectTrace = traceTerrainLine(objectOnlyState, expected.chosen, expected.target);
      expect({
        sourceCorner: objectTrace.sourceCorner,
        lineTiers: objectTrace.lines.map((line) => line.tier),
        lineCells: objectTrace.lines.map((line) => line.interveningCells),
        tier: objectTrace.tier,
      }).toEqual({
        sourceCorner: expected.chosenSourceCorner,
        lineTiers: expected.objectLineTiers,
        lineCells: expected.objectLineTiers.map((tier) => tier === 'none' ? [] : placement.obstacleCells),
        tier: 'half',
      });

      // Where the live room also models a placement cell as blocked, crossed
      // rays become Total individually. At least one ray remains open, so the
      // corner-count rule still aggregates the target's cover to Half.
      const liveTrace = traceTerrainLine(composed.state, expected.chosen, expected.target);
      expect({
        sourceCorner: liveTrace.sourceCorner,
        lineTiers: liveTrace.lines.map((line) => line.tier),
        tier: liveTrace.tier,
        blocksSight: liveTrace.blocksSight,
      }).toEqual({
        sourceCorner: expected.liveSourceCorner,
        lineTiers: expected.liveLineTiers,
        tier: 'half',
        blocksSight: false,
      });
    }
  });

  it.each([
    { classId: 'Warlock', spellId: 'eldritch-blast', cover: { column: 3, row: 5 }, open: { column: 3, row: 4 } },
    { classId: 'Cleric', spellId: 'command', cover: { column: 3, row: 5 }, open: { column: 3, row: 4 } },
    { classId: 'Wizard', spellId: 'slow', cover: { column: 3, row: 5 }, open: { column: 3, row: 4 } },
  ] as const)('policy_ignores_cover: $classId caster selects reachable cover after $spellId', async (scenario) => {
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    );
    const caster = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === scenario.classId));
    const enemy = composed.state.combatants.find((candidate) => candidate.profile.kind === 'monster');
    if (caster === undefined || enemy === undefined) throw new Error(`${scenario.classId} cover policy fixture is incomplete.`);
    const firingLineEnemy = composed.state.combatants.find((candidate) =>
      candidate.profile.kind === 'monster' &&
      coverTierBetweenObjects(
        composed.state.worldObjects,
        scenario.cover,
        combatantPosition(composed.state, candidate.profile.id),
      ) !== 'none');
    if (firingLineEnemy === undefined) throw new Error(`${scenario.classId} has no enemy across the cover placement.`);
    const state: EncounterState = {
      ...composed.state,
      nextEventSequence: composed.state.nextEventSequence + 1,
      combatants: composed.state.combatants.map((candidate) => candidate.profile.id === caster.profile.id
        ? {
            ...candidate,
            turn: {
              ...candidate.turn,
              movement: { speed: caster.profile.rules.speed, spent: feet(0), remaining: caster.profile.rules.speed },
            },
          }
        : candidate),
      tokens: composed.state.tokens.map((token) => token.combatantId === caster.profile.id
        ? { ...token, position: { column: 4, row: 6 } }
        : token),
      eventLog: [...composed.state.eventLog, {
        sequence: composed.state.nextEventSequence,
        type: 'spell_cast',
        caster: caster.profile.id,
        spellId: scenario.spellId,
        slotLevel: scenario.spellId === 'eldritch-blast' ? null : 3,
        targets: [firingLineEnemy.profile.id],
      }],
    };
    const coverMove = {
      type: 'move' as const,
      actor: caster.profile.id,
      path: [scenario.cover],
      cause: 'voluntary' as const,
    };
    const openMove = {
      type: 'move' as const,
      actor: caster.profile.id,
      path: [scenario.open],
      cause: 'voluntary' as const,
    };
    const decision = await new AlgorithmController().choose(
      requestFor(state, caster.profile.id, [openMove, coverMove, { type: 'end_turn', actor: caster.profile.id }]),
      new AbortController().signal,
    );
    expect(coverTierBetweenObjects(
      state.worldObjects,
      scenario.cover,
      combatantPosition(state, firingLineEnemy.profile.id),
    )).not.toBe('none');
    expect(decision.action).toEqual(coverMove);
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

  async function runRoom(
    encounter: ReturnType<typeof composeD365Room>,
    rng: ReturnType<typeof mulberry32>,
  ): Promise<RoomRun> {
    const registry = new ControllerRegistry(encounter.state.combatants.map((candidate) => ({
      combatantId: candidate.profile.id,
      controller: new AlgorithmController(),
    })));
    const coordinator = new TurnCoordinator(
      encounter.state,
      registry,
      rng,
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
      state,
    };
  }

  async function runRoomOne(seed: number): Promise<RoomRun> {
    return runRoom(composeD365Room(
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    ), mulberry32(seed));
  }

  it('room-1-terminates: four algorithm PCs versus the bundled pack reaches an end state within 4 rounds', async () => {
    const result = await runRoomOne(20_260_824);
    expect(result.round).toBeLessThanOrEqual(4);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(result.eventTypes).toContain('attack_resolved');
    expect(result.eventTypes).toContain('spell_cast');
    expect(result.eventTypes).not.toContain('healing_applied');
    expect(result.state.combatants.filter((candidate) =>
      candidate.profile.kind === 'player_character').every((candidate) =>
      candidate.hitPoints * 4 >= candidate.profile.rules.hitPointMaximum * 3)).toBe(true);
    expect(result.spellSlotLevels.length).toBeGreaterThan(0);
    expect(result.spellSlotLevels.some((slotLevel) => slotLevel !== null)).toBe(true);
  });

  it('large-board-terminates: a 14x10 fight clips approach paths, advances rounds, and terminates', async () => {
    const player = playerProfile('large-board-player', { hitPoints: 6, initiativeBonus: 20 });
    const monster = monsterProfile('large-board-monster', { hitPoints: 6, initiativeBonus: -20 });
    const initial = startedState(
      [player, monster],
      [placedToken(player, 0, 5), placedToken(monster, 13, 5)],
      14,
      10,
    );
    const coordinator = new TurnCoordinator(
      initial,
      new ControllerRegistry([
        { combatantId: player.id, controller: new AlgorithmController() },
        { combatantId: monster.id, controller: new AlgorithmController() },
      ]),
      mulberry32(37_510),
      {
        turnLegalActions: (state, actor) => fullPathMeleeLegalActions(
          state,
          actor,
          actor === player.id ? monster.id : player.id,
        ),
      },
    );

    let steps = 0;
    while (!combatResolved(coordinator.state()) && steps < 100) {
      const step = await coordinator.step();
      if (step.kind === 'refused') throw new Error(step.reason);
      steps += 1;
    }

    expect(coordinator.state().round).toBeGreaterThan(1);
    expect(combatResolved(coordinator.state())).toBe(true);
    expect(steps).toBeLessThan(100);
  });

  it('same-seed-determinism: two room-1 runs produce identical journals and outcomes', async () => {
    const first = await runRoomOne(20_260_824);
    const second = await runRoomOne(20_260_824);
    expect(second).toEqual(first);
  });

  it('fixed-seed-room-outcomes: the algorithm party wins rooms 1, 2, 3, and 4 in the live adventuring-day sequence', async () => {
    const rng = mulberry32(20_260_824);
    let partyState = createPartySessionState(sample.party.members);
    const outcomes: Array<{
      readonly room: number;
      readonly outcome: RoomRun['outcome'];
      readonly round: number;
      readonly partyHitPoints: readonly number[];
    }> = [];
    for (let room = 1; room <= 4; room += 1) {
      const encounter = composeD365Room(sample.party.members, sample.displayNames, partyState);
      const result = await runRoom(encounter, rng);
      outcomes.push({
        room,
        outcome: result.outcome,
        round: result.round,
        partyHitPoints: result.state.combatants.flatMap((candidate) =>
          candidate.profile.kind === 'player_character' ? [candidate.hitPoints] : []),
      });
      if (room < 4) {
        const captured = capturePartySessionState(partyState, result.state);
        partyState = enterNextRoom(takeShortRest(captured, [], rng).state);
      }
    }
    expect(outcomes).toEqual([
      expect.objectContaining({ room: 1, outcome: 'victory' }),
      expect.objectContaining({ room: 2, outcome: 'victory' }),
      expect.objectContaining({ room: 3, outcome: 'victory' }),
      expect.objectContaining({ room: 4, outcome: 'victory' }),
    ]);
    expect(outcomes.every((room) => room.round <= 20)).toBe(true);
    expect(outcomes.every((room) => room.partyHitPoints.some((hitPoints) => hitPoints > 0))).toBe(true);
  });

  it('vane-cinder-rite-terminates: both sides receive combat actions and conclude within 20 rounds', async () => {
    const encounter = composeVaneWarrenFight(
      'cinder-rite',
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    );
    const result = await runRoom(encounter, mulberry32(20_260_824));

    expect(result.round).toBeLessThanOrEqual(20);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(result.eventTypes).toContain('attack_resolved');
    expect(result.state.eventLog.some((event) =>
      event.type === 'attack_resolved' &&
      result.state.combatants.some((candidate) =>
        candidate.profile.id === event.actor && candidate.profile.kind === 'monster'))).toBe(true);
  });

  it('vane-tpk-clean-terminates: the doomed composition defeats the party after death saves', async () => {
    const encounter = composeVaneWarrenFight(
      'cinder-rite',
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
      undefined,
      'tpk-clean',
    );
    const coordinator = new TurnCoordinator(
      encounter.state,
      new ControllerRegistry(encounter.state.combatants.map((candidate) => ({
        combatantId: candidate.profile.id,
        controller: new AlgorithmController(),
      }))),
      mulberry32(20_260_824),
      {
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: regretReactionLegalActions,
      },
    );
    for (let steps = 0; !combatResolved(coordinator.state()) && steps < 2_000; steps += 1) {
      const pending = coordinator.state().pendingDecisions[0];
      if (pending !== undefined && pending.kind !== 'adjudication_prompt') {
        const option = pending.options.find((candidate) => candidate.id === (
          pending.kind === 'death_save' ? 'roll' :
            pending.kind === 'reaction_offer' ? 'decline' :
              pending.kind === 'legendary_resistance' ? 'suffer' : 'pass'
        ));
        if (option === undefined) throw new Error(`No test policy for ${pending.kind}.`);
        const resolved = coordinator.resolvePendingDecision({
          type: 'resolve_pending_decision',
          decisionId: pending.id,
          optionId: option.id,
        });
        if (resolved.kind === 'refused') throw new Error(resolved.reason);
      } else {
        const step = await coordinator.step();
        if (step.kind === 'refused') throw new Error(step.reason);
      }
    }
    const state = coordinator.state();

    expect(state.phase).toMatchObject({ kind: 'concluded', outcome: 'defeat' });
    expect(state.round).toBeLessThanOrEqual(4);
    expect(state.eventLog.some((event) => event.type === 'death_save_resolved')).toBe(true);
    expect(state.combatants.filter((candidate) =>
      candidate.profile.kind === 'player_character' && candidate.life === 'dead')).toHaveLength(5);
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
      { program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } }, score: 0 },
    ]);
  });
});
