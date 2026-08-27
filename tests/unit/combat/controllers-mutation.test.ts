import { describe, expect, it, vi } from 'vitest';
import {
  AgentController,
  AlgorithmController,
  ControllerRegistry,
  ControllerRequestCancelledError,
  HumanController,
  StaleControllerResponseError,
  decodeAgentControllerResponse,
  isListedControllerAction,
  type Controller,
  type ControllerRequest,
  type LegalActionSummary,
} from '../../../src/combat/controllers';
import {
  coverTierBetweenObjects,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  armorClass,
  damageType,
  dieSides,
  encounterEffectId,
  feet,
  worldObjectId,
  type CombatantId,
} from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
} from '../../../src/combat/visibility';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

type Profile = ReturnType<typeof playerProfile>;

function startedState(
  combatants: readonly Profile[],
  columns = 16,
  rows = 3,
): EncounterState {
  const initial = createEncounter({
    bounds: { columns, rows },
    combatants,
    tokens: combatants.map((combatant, index) => placedToken(combatant, index * 2, 1)),
  });
  return reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
}

function stateAtPositions(
  entries: readonly { readonly profile: Profile; readonly column: number; readonly row?: number }[],
  columns = 16,
  rows = 3,
): EncounterState {
  const initial = createEncounter({
    bounds: { columns, rows },
    combatants: entries.map((entry) => entry.profile),
    tokens: entries.map((entry) => placedToken(entry.profile, entry.column, entry.row ?? 1)),
  });
  return reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
}

function withHitPoints(
  state: EncounterState,
  id: CombatantId,
  hitPoints: number,
  life: 'living' | 'dying' | 'stable' | 'dead' = hitPoints === 0 ? 'dying' : 'living',
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === id
      ? {
          ...combatant,
          hitPoints,
          life,
          deathSaves: life === 'dying' ? { successes: 0, failures: 0 } : null,
        }
      : combatant),
  };
}

function withEvents(state: EncounterState, events: readonly EncounterEvent[]): EncounterState {
  return {
    ...state,
    eventLog: [...state.eventLog, ...events],
    nextEventSequence: state.nextEventSequence + events.length,
  };
}

function withMovementRemaining(
  state: EncounterState,
  id: CombatantId,
  remaining: number,
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === id
      ? {
          ...combatant,
          turn: {
            ...combatant.turn,
            movement: { ...combatant.turn.movement, remaining: feet(remaining) },
          },
        }
      : combatant),
  };
}

function dmRequest(
  state: EncounterState,
  actorId: CombatantId,
  actions: readonly EncounterCommand[],
): ControllerRequest {
  return {
    kind: 'turn',
    requestId: `request:dm:${actorId}`,
    encounterRevision: state.revision,
    actorId,
    visibleState: dmVisibleEncounter(projectDmView(state)),
    legalActions: { actions },
  };
}

function playerRequest(
  state: EncounterState,
  actorId: CombatantId,
  actions: readonly EncounterCommand[],
  ownedCombatantIds?: readonly CombatantId[],
): ControllerRequest {
  return {
    kind: 'turn',
    requestId: `request:player:${actorId}`,
    encounterRevision: state.revision,
    actorId,
    visibleState: projectPlayerView(state, {
      seatId: String(actorId),
      combatantId: actorId,
      ...(ownedCombatantIds === undefined ? {} : { ownedCombatantIds }),
    }),
    legalActions: { actions },
  };
}

function attack(
  actor: CombatantId,
  target: CombatantId,
  attackId = 'attack:mutation',
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 5,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Force'),
        dice: { count: 1, sides: dieSides(6), modifier: 0 },
      }],
      critical: false,
      responses: [],
    },
    attackId,
  };
}

function opportunityAttack(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'opportunity_attack' }> {
  const command = attack(actor, target);
  return { ...command, type: 'opportunity_attack' };
}

function forceSave(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save',
    actor,
    target,
    ability: 'wisdom',
    dc: 13,
    rollMode: 'normal',
    damage: {
      terms: [{
        type: damageType('Force'),
        dice: { count: 1, sides: dieSides(6), modifier: 0 },
      }],
      critical: false,
      responses: [],
    },
    onSuccess: 'none',
    cost: 'action',
  };
}

function spell(
  actor: CombatantId,
  spellId: string,
  targets: readonly CombatantId[],
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell',
    actor,
    spellId,
    slotLevel: 1,
    castAsRitual: false,
    casterLevel: 5,
    attackBonus: 5,
    saveDc: 13,
    spellcastingModifier: 3,
    targets,
    area: null,
    weaponAttack: null,
    selectedOption: null,
  };
}

function move(
  actor: CombatantId,
  column: number,
  row = 1,
): Extract<EncounterCommand, { readonly type: 'move' }> {
  return { type: 'move', actor, path: [{ column, row }], cause: 'voluntary' };
}

async function chooseAction(
  request: ControllerRequest,
): Promise<EncounterCommand> {
  return (await new AlgorithmController().choose(request, new AbortController().signal)).action;
}

describe('controller mutation contract: HumanController', () => {
  it('reports the pending request, rejects a second request, and resolves only an exact submission', async () => {
    const actor = playerProfile('human-contract', { initiativeBonus: 20 });
    const enemy = monsterProfile('human-contract-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const request = playerRequest(state, actor.id, [{ type: 'end_turn', actor: actor.id }]);
    const controller = new HumanController();
    const signal = new AbortController().signal;
    const pending = controller.choose(request, signal);

    expect(controller.pendingRequest()).toBe(request);
    await expect(controller.choose(request, signal)).rejects.toThrow(
      'HumanController already has a pending request.',
    );
    expect(() => controller.submit({
      requestId: `${request.requestId}:wrong`,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0]!,
    })).toThrow('Human response does not match the pending request.');
    expect(() => controller.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision + 1,
      action: request.legalActions.actions[0]!,
    })).toThrow('Human response does not match the pending request.');

    const decision = {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0]!,
    };
    controller.submit(decision);
    await expect(pending).resolves.toEqual(decision);
    expect(controller.pendingRequest()).toBeNull();
    expect(() => controller.submit(decision)).toThrow(StaleControllerResponseError);
  });

  it('rejects pre-aborted and subsequently aborted requests with the typed cancellation error', async () => {
    const fixture = startedState([
      playerProfile('human-cancel', { initiativeBonus: 20 }),
      monsterProfile('human-cancel-enemy', { initiativeBonus: -20 }),
    ]);
    const actor = fixture.combatants[0]!.profile.id;
    const request = playerRequest(fixture, actor, [{ type: 'end_turn', actor }]);
    const preAborted = new AbortController();
    preAborted.abort();
    await expect(new HumanController().choose(request, preAborted.signal)).rejects.toThrow(
      'Controller request was cancelled.',
    );
    await expect(new HumanController().choose(request, preAborted.signal)).rejects
      .toBeInstanceOf(ControllerRequestCancelledError);

    const controller = new HumanController();
    const abort = new AbortController();
    const pending = controller.choose(request, abort.signal);
    abort.abort();
    await expect(pending).rejects.toThrow('Controller request was cancelled.');
    expect(controller.pendingRequest()).toBeNull();
  });

  it('registers a one-shot abort listener and detaches it after a successful submit', async () => {
    const fixture = startedState([
      playerProfile('human-listener', { initiativeBonus: 20 }),
      monsterProfile('human-listener-enemy', { initiativeBonus: -20 }),
    ]);
    const actor = fixture.combatants[0]!.profile.id;
    const request = playerRequest(fixture, actor, [{ type: 'end_turn', actor }]);
    const abort = new AbortController();
    const add = vi.spyOn(abort.signal, 'addEventListener');
    const remove = vi.spyOn(abort.signal, 'removeEventListener');
    const controller = new HumanController();
    const pending = controller.choose(request, abort.signal);

    expect(add).toHaveBeenCalledOnce();
    expect(add.mock.calls[0]?.[0]).toBe('abort');
    expect(add.mock.calls[0]?.[2]).toEqual({ once: true });
    controller.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0]!,
    });
    await pending;
    expect(remove).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0]?.[0]).toBe('abort');
    expect(remove.mock.calls[0]?.[1]).toBe(add.mock.calls[0]?.[1]);
  });
});

describe('controller mutation contract: movement and listed-action validation', () => {
  it('uses the DM movement budget and rejects a candidate whose first cell exceeds it', async () => {
    const actor = playerProfile('dm-budget', { initiativeBonus: 20 });
    const enemy = monsterProfile('dm-budget-enemy', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: enemy, column: 8 },
    ]);
    const request = dmRequest(state, actor.id, [{
      type: 'move',
      actor: actor.id,
      path: [{ column: 7, row: 1 }],
      cause: 'voluntary',
    }]);

    await expect(new AlgorithmController().choose(request, new AbortController().signal))
      .rejects.toThrow('Controller request has no legal actions.');
  });

  it('uses the owned player movement budget instead of DM-only combatant fields', async () => {
    const actor = playerProfile('player-budget', { initiativeBonus: 20 });
    const enemy = monsterProfile('player-budget-enemy', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: enemy, column: 8 },
    ]);
    const request = playerRequest(state, actor.id, [move(actor.id, 1)]);

    await expect(chooseAction(request)).resolves.toEqual(move(actor.id, 1));
  });

  it('looks up the movement budget for the command actor rather than the first combatant', async () => {
    const first = playerProfile('budget-first', { initiativeBonus: 20 });
    const mover = playerProfile('budget-mover', { initiativeBonus: 0 });
    const enemy = monsterProfile('budget-enemy', { initiativeBonus: -20 });
    let state = stateAtPositions([
      { profile: first, column: 0 },
      { profile: mover, column: 2 },
      { profile: enemy, column: 8 },
    ]);
    state = withMovementRemaining(state, first.id, 30);
    state = withMovementRemaining(state, mover.id, 5);
    const request = dmRequest(state, first.id, [{
      type: 'move',
      actor: mover.id,
      path: [{ column: 4, row: 1 }],
      cause: 'voluntary',
    }]);

    await expect(chooseAction(request)).rejects.toThrow('Controller request has no legal actions.');
  });

  it('accepts exactly listed actions and only strict matching movement prefixes', () => {
    const actor = playerProfile('listed-prefix');
    const other = playerProfile('listed-prefix-other');
    const listed: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move',
      actor: actor.id,
      cause: 'voluntary',
      path: [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }],
    };
    const legalActions: LegalActionSummary = {
      actions: [listed, { type: 'end_turn', actor: actor.id }],
    };

    expect(isListedControllerAction({ type: 'end_turn', actor: actor.id }, legalActions)).toBe(true);
    expect(isListedControllerAction({ ...listed, path: listed.path.slice(0, 2) }, legalActions)).toBe(true);
    expect(isListedControllerAction({ ...listed, actor: other.id, path: listed.path.slice(0, 2) }, legalActions)).toBe(false);
    expect(isListedControllerAction({ ...listed, cause: 'forced', path: listed.path.slice(0, 2) }, legalActions)).toBe(false);
    expect(isListedControllerAction({ ...listed, path: [] }, legalActions)).toBe(false);
    expect(isListedControllerAction({ ...listed, path: [...listed.path] }, legalActions)).toBe(true);
    expect(isListedControllerAction({
      ...listed,
      path: [...listed.path],
      executableOpportunityAttacks: [],
    }, legalActions)).toBe(false);
    expect(isListedControllerAction({ ...listed, path: [...listed.path, { column: 4, row: 1 }] }, legalActions)).toBe(false);
    expect(isListedControllerAction({
      ...listed,
      path: [{ column: 1, row: 2 }, { column: 2, row: 1 }],
    }, legalActions)).toBe(false);
    expect(isListedControllerAction({
      ...listed,
      path: [{ column: 1, row: 1 }, { column: 2, row: 2 }],
    }, legalActions)).toBe(false);
    expect(isListedControllerAction({ type: 'dash', actor: actor.id }, legalActions)).toBe(false);
  });
});

describe('controller mutation contract: player-character ranking', () => {
  it.each([
    ['revivify', 'revivify'],
    ['bless', 'bless'],
    ['slow', 'slow'],
    ['spirit-guardians', 'spirit-guardians'],
  ] as const)('gives %s its exact tactical priority', async (spellId, expected) => {
    const actor = playerProfile(`priority-${spellId}`, { initiativeBonus: 20 });
    const enemy = monsterProfile(`priority-${spellId}-enemy`, { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: enemy, column: 2 },
    ]);
    const actions = spellId === 'revivify'
      ? [spell(actor.id, spellId, [actor.id]), opportunityAttack(actor.id, enemy.id)]
      : spellId === 'bless'
        ? [spell(actor.id, spellId, [actor.id]), opportunityAttack(actor.id, enemy.id)]
        : [spell(actor.id, spellId, [enemy.id]), spell(actor.id, 'bless', [actor.id])];

    await expect(chooseAction(dmRequest(state, actor.id, actions))).resolves.toMatchObject({
      type: 'cast_spell',
      spellId: expected,
    });
  });

  it('ranks command ahead of a potion at the exact second-rank boundary', async () => {
    const actor = playerProfile('priority-command', { initiativeBonus: 20 });
    const enemy = monsterProfile('priority-command-enemy', { initiativeBonus: -20 });
    const state = withHitPoints(startedState([actor, enemy]), actor.id, 0, 'dying');
    const potion: EncounterCommand = {
      type: 'drink_healing_potion',
      actor: actor.id,
      effectId: encounterEffectId('effect:priority-potion'),
    };

    await expect(chooseAction(dmRequest(state, actor.id, [
      potion,
      spell(actor.id, 'command', [enemy.id]),
    ]))).resolves.toMatchObject({ type: 'cast_spell', spellId: 'command' });
  });

  it('keeps bless negative second-rank ahead of an opportunity attack against a zero-HP hostile', async () => {
    const actor = playerProfile('priority-bless-boundary', { initiativeBonus: 20 });
    const enemy = monsterProfile('priority-bless-boundary-enemy', { initiativeBonus: -20 });
    const state = withHitPoints(startedState([actor, enemy]), enemy.id, 0, 'dying');
    await expect(chooseAction(dmRequest(state, actor.id, [
      opportunityAttack(actor.id, enemy.id),
      spell(actor.id, 'bless', [actor.id]),
    ]))).resolves.toMatchObject({ type: 'cast_spell', spellId: 'bless' });
  });

  it('ranks a potion by the actor current hit points ahead of attacks and fallback actions', async () => {
    const actor = playerProfile('priority-potion-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('priority-potion-enemy', { initiativeBonus: -20 });
    const state = withHitPoints(startedState([actor, enemy]), actor.id, 4);
    const potion: EncounterCommand = {
      type: 'drink_healing_potion',
      actor: actor.id,
      effectId: encounterEffectId('effect:priority-potion-current'),
    };
    expect(await chooseAction(dmRequest(state, actor.id, [
      attack(actor.id, enemy.id),
      { type: 'dodge', actor: actor.id },
      potion,
    ]))).toEqual(potion);
  });

  it('heals a DM-visible dying ally, rejects enemy/dead targets, and honors the 75-percent boundary', async () => {
    const healer = playerProfile('priority-healer', { initiativeBonus: 20 });
    const dying = playerProfile('priority-dying', { hitPoints: 20, initiativeBonus: 0 });
    const threshold = playerProfile('priority-threshold', { hitPoints: 20, initiativeBonus: -5 });
    const enemy = monsterProfile('priority-heal-enemy', { hitPoints: 20, initiativeBonus: -10 });
    const deadEnemy = monsterProfile('priority-dead-enemy', { hitPoints: 20, initiativeBonus: -20 });
    let state = startedState([healer, dying, threshold, enemy, deadEnemy]);
    state = withHitPoints(state, dying.id, 0, 'dying');
    state = withHitPoints(state, threshold.id, 15);
    state = withHitPoints(state, deadEnemy.id, 0, 'dead');
    const dyingHeal = spell(healer.id, 'healing-word', [enemy.id, deadEnemy.id, dying.id]);
    const thresholdHeal = spell(healer.id, 'cure-wounds', [threshold.id]);

    expect(await chooseAction(dmRequest(state, healer.id, [
      thresholdHeal,
      attack(healer.id, enemy.id),
      dyingHeal,
    ]))).toBe(dyingHeal);
    expect(await chooseAction(dmRequest(state, healer.id, [
      attack(healer.id, enemy.id),
      thresholdHeal,
    ]))).toBe(thresholdHeal);
    const healthyHeal = spell(healer.id, 'cure-wounds', [healer.id]);
    expect(await chooseAction(dmRequest(state, healer.id, [
      healthyHeal,
      attack(healer.id, enemy.id),
    ]))).toMatchObject({ type: 'attack', target: enemy.id });
  });

  it('sorts healing targets by priority before id and exposes that choice through command rank', async () => {
    const healer = playerProfile('heal-sort-healer', { initiativeBonus: 20 });
    const healthy = playerProfile('heal-sort-z-healthy', { hitPoints: 20, initiativeBonus: 0 });
    const dying = playerProfile('heal-sort-a-dying', { hitPoints: 20, initiativeBonus: -5 });
    const wounded = playerProfile('heal-sort-middle', { hitPoints: 20, initiativeBonus: -10 });
    const enemy = monsterProfile('heal-sort-enemy', { initiativeBonus: -20 });
    let state = startedState([healer, healthy, dying, wounded, enemy]);
    state = withHitPoints(state, dying.id, 0, 'dying');
    state = withHitPoints(state, wounded.id, 5);
    const mixed = spell(healer.id, 'healing-word', [healthy.id, dying.id]);
    const woundedOnly = spell(healer.id, 'healing-word', [wounded.id]);

    expect(await chooseAction(dmRequest(state, healer.id, [woundedOnly, mixed]))).toBe(mixed);
  });

  it('keeps a dying target first when the healing-priority comparator receives dying then wounded', async () => {
    const healer = playerProfile('heal-order-healer', { initiativeBonus: 20 });
    const dying = playerProfile('heal-order-z-dying', { hitPoints: 20, initiativeBonus: 0 });
    const wounded = playerProfile('heal-order-a-wounded', { hitPoints: 20, initiativeBonus: -5 });
    const enemy = monsterProfile('heal-order-enemy', { initiativeBonus: -20 });
    let state = startedState([healer, dying, wounded, enemy]);
    state = withHitPoints(state, dying.id, 0, 'dying');
    state = withHitPoints(state, wounded.id, 5);
    const mixed = spell(healer.id, 'healing-word', [dying.id, wounded.id]);
    const dyingOnly = spell(healer.id, 'healing-word', [dying.id]);

    expect(await chooseAction(dmRequest(state, healer.id, [dyingOnly, mixed]))).toBe(mixed);
  });

  it('uses player-owned hit points before event history when ranking a healing target', async () => {
    const healer = playerProfile('owned-hp-healer', { initiativeBonus: 20 });
    const ally = playerProfile('owned-hp-ally', { hitPoints: 20, initiativeBonus: 0 });
    const enemy = monsterProfile('owned-hp-enemy', { initiativeBonus: -20 });
    const state = withHitPoints(startedState([healer, ally, enemy]), ally.id, 10);
    const heal = spell(healer.id, 'cure-wounds', [ally.id]);

    expect(await chooseAction(playerRequest(
      state,
      healer.id,
      [attack(healer.id, enemy.id), heal],
      [healer.id, ally.id],
    ))).toBe(heal);
  });

  it('derives an unowned ally latest and maximum known HP from matching damage/healing events only', async () => {
    const healer = playerProfile('event-hp-healer', { initiativeBonus: 20 });
    const ally = playerProfile('event-hp-ally', { hitPoints: 20, initiativeBonus: 0 });
    const enemy = monsterProfile('event-hp-enemy', { initiativeBonus: -20 });
    const base = startedState([healer, ally, enemy]);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'damage_applied',
      source: enemy.id,
      target: ally.id,
      amount: 10,
      hitPointsBefore: 20,
      hitPointsAfter: 10,
      lifeState: 'living',
      massiveDamage: false,
    }, {
      sequence: base.nextEventSequence + 1,
      type: 'healing_applied',
      source: healer.id,
      target: ally.id,
      amount: 5,
      hitPointsBefore: 10,
      hitPointsAfter: 15,
    }]);
    const heal = spell(healer.id, 'cure-wounds', [ally.id]);

    expect(await chooseAction(playerRequest(state, healer.id, [
      attack(healer.id, enemy.id),
      heal,
    ]))).toBe(heal);
  });

  it('sorts hostile spell targets by known HP, then distance, then id', async () => {
    const actor = playerProfile('spell-focus-actor', { initiativeBonus: 20 });
    const healthy = monsterProfile('spell-focus-z-healthy', { hitPoints: 9, initiativeBonus: 0 });
    const wounded = monsterProfile('spell-focus-a-wounded', { hitPoints: 2, initiativeBonus: -5 });
    const middle = monsterProfile('spell-focus-middle', { hitPoints: 5, initiativeBonus: -10 });
    const ally = playerProfile('spell-focus-ally', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: healthy, column: 2 },
      { profile: wounded, column: 5 },
      { profile: middle, column: 3 },
      { profile: ally, column: 1 },
    ]);
    const focused = spell(actor.id, 'fire-bolt', [ally.id, healthy.id, wounded.id]);
    const middleOnly = spell(actor.id, 'acid-splash', [middle.id]);

    expect(await chooseAction(dmRequest(state, actor.id, [middleOnly, focused]))).toBe(focused);
  });

  it('keeps the lower-HP hostile first when the focus comparator receives weak then strong', async () => {
    const actor = playerProfile('spell-order-actor', { initiativeBonus: 20 });
    const weak = monsterProfile('spell-order-z-weak', { hitPoints: 2, initiativeBonus: 0 });
    const strong = monsterProfile('spell-order-a-strong', { hitPoints: 9, initiativeBonus: -5 });
    const middle = monsterProfile('spell-order-middle', { hitPoints: 5, initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: weak, column: 4 },
      { profile: strong, column: 2 },
      { profile: middle, column: 3 },
    ]);
    const mixed = spell(actor.id, 'z-mixed-focus', [weak.id, strong.id]);
    const middleOnly = spell(actor.id, 'a-middle-focus', [middle.id]);

    expect(await chooseAction(dmRequest(state, actor.id, [middleOnly, mixed]))).toBe(mixed);
  });

  it('keeps the nearer hostile first when equal HP targets reach the distance comparator', async () => {
    const actor = playerProfile('spell-distance-actor', { initiativeBonus: 20 });
    const near = monsterProfile('spell-distance-z-near', { hitPoints: 5, initiativeBonus: 0 });
    const far = monsterProfile('spell-distance-a-far', { hitPoints: 5, initiativeBonus: -5 });
    const middle = monsterProfile('spell-distance-middle', { hitPoints: 5, initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: near, column: 2 },
      { profile: far, column: 5 },
      { profile: middle, column: 3 },
    ]);
    const mixed = spell(actor.id, 'z-distance-focus', [near.id, far.id]);
    const middleOnly = spell(actor.id, 'a-distance-middle', [middle.id]);

    expect(await chooseAction(dmRequest(state, actor.id, [middleOnly, mixed]))).toBe(mixed);
  });

  it('prefers Topple, then the weakest hostile for ordinary attacks and saves', async () => {
    const actor = playerProfile('weapon-rank-actor', { initiativeBonus: 20 });
    const weak = monsterProfile('weapon-rank-weak', { hitPoints: 2, initiativeBonus: 0 });
    const strong = monsterProfile('weapon-rank-strong', { hitPoints: 9, initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: strong, column: 1 },
      { profile: weak, column: 3 },
    ]);
    const topple = {
      ...attack(actor.id, strong.id, 'attack:topple'),
      weaponMastery: { property: 'Topple' as const, saveDc: 13 },
    };
    expect(await chooseAction(dmRequest(state, actor.id, [
      attack(actor.id, weak.id, 'attack:ordinary'),
      topple,
    ]))).toBe(topple);
    const save = forceSave(actor.id, weak.id);
    expect(await chooseAction(dmRequest(state, actor.id, [
      attack(actor.id, strong.id, 'attack:strong'),
      save,
    ]))).toBe(save);
  });

  it('prefers a hostile opportunity attack to an ordinary attack', async () => {
    const actor = playerProfile('pc-opportunity-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('pc-opportunity-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const opportunity = opportunityAttack(actor.id, enemy.id);
    expect(await chooseAction(dmRequest(state, actor.id, [
      attack(actor.id, enemy.id),
      opportunity,
    ]))).toBe(opportunity);
  });

  it.each(['eldritch-blast', 'ray-of-frost', 'slow', 'spirit-guardians', 'command'])(
    'moves farther from hostiles after the tactical ranged spell %s',
    async (spellId) => {
      const actor = playerProfile(`ranged-spell-${spellId}`, { initiativeBonus: 20 });
      const enemy = monsterProfile(`ranged-spell-${spellId}-enemy`, { initiativeBonus: -20 });
      const base = stateAtPositions([
        { profile: actor, column: 4 },
        { profile: enemy, column: 7 },
      ], 12);
      const state = withEvents(base, [{
        sequence: base.nextEventSequence,
        type: 'spell_cast',
        caster: actor.id,
        spellId,
        slotLevel: null,
        targets: [],
      }]);
      const away = move(actor.id, 3);
      const toward = move(actor.id, 5);
      expect(await chooseAction(dmRequest(state, actor.id, [toward, away]))).toEqual(away);
    },
  );

  it('recognizes any far hostile spell target, but ignores allied targets and events before the latest own turn', async () => {
    const actor = playerProfile('ranged-event-actor', { initiativeBonus: 20 });
    const ally = playerProfile('ranged-event-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('ranged-event-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: ally, column: 5 },
      { profile: enemy, column: 7 },
    ], 12);
    const away = move(actor.id, 3);
    const toward = move(actor.id, 5);
    const afterSpell = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'homebrew-bolt',
      slotLevel: 1,
      targets: [ally.id, enemy.id],
    }]);
    expect(await chooseAction(dmRequest(afterSpell, actor.id, [toward, away]))).toEqual(away);

    const reset = withEvents(afterSpell, [{
      sequence: afterSpell.nextEventSequence,
      type: 'turn_started',
      combatant: actor.id,
      round: 2,
    }]);
    expect(await chooseAction(dmRequest(reset, actor.id, [away, toward]))).toEqual(toward);

    const otherTurn = withEvents(afterSpell, [{
      sequence: afterSpell.nextEventSequence,
      type: 'turn_started',
      combatant: ally.id,
      round: 2,
    }]);
    expect(await chooseAction(dmRequest(otherTurn, actor.id, [toward, away]))).toEqual(away);

    const otherCaster = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: ally.id,
      spellId: 'eldritch-blast',
      slotLevel: null,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(otherCaster, actor.id, [away, toward]))).toEqual(toward);
  });

  it('does not classify an arbitrary spell against an exactly 5-foot target as ranged', async () => {
    const actor = playerProfile('spell-range-boundary-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('spell-range-boundary-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: enemy, column: 5 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'homebrew-touch',
      slotLevel: 1,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 3),
      move(actor.id, 5),
    ]))).toEqual(move(actor.id, 5));
  });

  it('recognizes only the acting PC ranged attack after the latest turn start', async () => {
    const actor = playerProfile('ranged-attack-actor', { initiativeBonus: 20 });
    const ally = playerProfile('ranged-attack-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('ranged-attack-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: ally, column: 5 },
      { profile: enemy, column: 7 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'turn_started',
      combatant: actor.id,
      round: 1,
    }, {
      sequence: base.nextEventSequence + 1,
      type: 'attack_resolved',
      actor: actor.id,
      target: enemy.id,
      attack: {
        outcome: 'hit',
        roll: { mode: 'normal', faces: [10], chosen: 10 },
        total: 15,
      },
      damage: null,
    }]);
    const away = move(actor.id, 3);
    const toward = move(actor.id, 5);
    expect(await chooseAction(dmRequest(state, actor.id, [toward, away]))).toEqual(away);

    const otherActor = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'attack_resolved',
      actor: ally.id,
      target: enemy.id,
      attack: {
        outcome: 'hit',
        roll: { mode: 'normal', faces: [10], chosen: 10 },
        total: 15,
      },
      damage: null,
    }]);
    expect(await chooseAction(dmRequest(otherActor, actor.id, [away, toward]))).toEqual(toward);
  });

  it('does not classify an exactly 5-foot attack as ranged', async () => {
    const actor = playerProfile('ranged-boundary-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('ranged-boundary-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: enemy, column: 5 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'attack_resolved',
      actor: actor.id,
      target: enemy.id,
      attack: {
        outcome: 'hit',
        roll: { mode: 'normal', faces: [10], chosen: 10 },
        total: 15,
      },
      damage: null,
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 3),
      move(actor.id, 5),
    ]))).toEqual(move(actor.id, 5));
  });

  it('keeps an adjacent ranged actor in place and ranks decline/end/fallback distinctly', async () => {
    const actor = playerProfile('ranged-adjacent-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('ranged-adjacent-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: enemy, column: 5 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'eldritch-blast',
      slotLevel: null,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 3),
      { type: 'end_turn', actor: actor.id },
    ]))).toEqual({ type: 'end_turn', actor: actor.id });

    const decline: EncounterCommand = {
      type: 'decline_reaction',
      actor: actor.id,
      mover: enemy.id,
    };
    expect(await chooseAction(dmRequest(base, actor.id, [
      { type: 'end_turn', actor: actor.id },
      { type: 'dodge', actor: actor.id },
      decline,
    ]))).toBe(decline);

    const fallback: EncounterCommand = {
      type: 'activate_action_surge',
      actor: actor.id,
      effectId: encounterEffectId('effect:rank-fallback'),
    };
    expect(await chooseAction(dmRequest(base, actor.id, [fallback, decline]))).toBe(decline);

    const heal: EncounterCommand = {
      type: 'heal',
      actor: actor.id,
      target: actor.id,
      amount: 1,
      cost: 'action',
    };
    expect(await chooseAction(dmRequest(base, actor.id, [
      { type: 'end_turn', actor: actor.id },
      heal,
    ]))).toBe(heal);
  });

  it('ignores an adjacent ally when deciding whether ranged repositioning would provoke', async () => {
    const actor = playerProfile('ranged-adjacent-ally-actor', { initiativeBonus: 20 });
    const ally = playerProfile('ranged-adjacent-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('ranged-adjacent-ally-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: ally, column: 5 },
      { profile: enemy, column: 1 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'eldritch-blast',
      slotLevel: null,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 3),
      move(actor.id, 5),
    ]))).toEqual(move(actor.id, 5));
  });

  it('ignores allies when comparing a ranged actor current nearest-hostile distance', async () => {
    const actor = playerProfile('ranged-current-ally-actor', { initiativeBonus: 20 });
    const ally = playerProfile('ranged-current-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('ranged-current-ally-enemy', { initiativeBonus: -20 });
    const base = stateAtPositions([
      { profile: actor, column: 4 },
      { profile: ally, column: 5 },
      { profile: enemy, column: 1 },
    ], 12);
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'eldritch-blast',
      slotLevel: null,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 3),
      { type: 'end_turn', actor: actor.id },
    ]))).toEqual({ type: 'end_turn', actor: actor.id });
  });

  it('ignores ally-only cover when breaking ranged repositioning ties', async () => {
    const actor = playerProfile('ranged-cover-actor', { initiativeBonus: 20 });
    const ally = playerProfile('ranged-cover-ally', { initiativeBonus: 0 });
    const enemy = monsterProfile('ranged-cover-enemy', { initiativeBonus: -20 });
    const cover: WorldObject = {
      id: worldObjectId('object:ranged-ally-cover'),
      name: 'Ally-only cover',
      kind: 'barrier',
      position: { column: 6, row: 2 },
      footprint: [{ column: 6, row: 2 }],
      durability: { kind: 'indestructible' },
      armorClass: armorClass(12),
      damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'half' },
      createdRevision: 0,
    };
    const initial = createEncounter({
      bounds: { columns: 12, rows: 3 },
      combatants: [actor, ally, enemy],
      tokens: [placedToken(actor, 4, 1), placedToken(ally, 7, 2), placedToken(enemy, 1, 1)],
      worldObjects: [cover],
    });
    const base = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
    const upper = { column: 5, row: 0 };
    const lower = { column: 5, row: 2 };
    expect(coverTierBetweenObjects(base.worldObjects, upper, { column: 1, row: 1 })).toBe('none');
    expect(coverTierBetweenObjects(base.worldObjects, lower, { column: 1, row: 1 })).toBe('none');
    expect(coverTierBetweenObjects(base.worldObjects, upper, { column: 7, row: 2 })).toBe('none');
    expect(coverTierBetweenObjects(base.worldObjects, lower, { column: 7, row: 2 })).toBe('half');
    const state = withEvents(base, [{
      sequence: base.nextEventSequence,
      type: 'spell_cast',
      caster: actor.id,
      spellId: 'eldritch-blast',
      slotLevel: null,
      targets: [enemy.id],
    }]);
    expect(await chooseAction(dmRequest(state, actor.id, [
      { type: 'move', actor: actor.id, path: [lower], cause: 'voluntary' },
      { type: 'move', actor: actor.id, path: [upper], cause: 'voluntary' },
    ]))).toEqual({ type: 'move', actor: actor.id, path: [upper], cause: 'voluntary' });
  });

  it('rejects an already-aborted algorithm request and an empty legal-action set', async () => {
    const actor = playerProfile('algorithm-refusal', { initiativeBonus: 20 });
    const enemy = monsterProfile('algorithm-refusal-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const abort = new AbortController();
    abort.abort();
    await expect(new AlgorithmController().choose(
      dmRequest(state, actor.id, [{ type: 'end_turn', actor: actor.id }]),
      abort.signal,
    )).rejects.toThrow('Controller request was cancelled.');
    await expect(new AlgorithmController().choose(
      dmRequest(state, actor.id, []),
      new AbortController().signal,
    )).rejects.toThrow('Controller request has no legal actions.');
  });
});

describe('controller mutation contract: monster ranking', () => {
  it('prefers a hostile opportunity attack and never treats an ally as hostile', async () => {
    const actor = monsterProfile('monster-rank-actor', { initiativeBonus: 20 });
    const ally = monsterProfile('monster-rank-ally', { initiativeBonus: 0 });
    const enemy = playerProfile('monster-rank-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, ally, enemy]);
    const hostile = opportunityAttack(actor.id, enemy.id);
    expect(await chooseAction(dmRequest(state, actor.id, [
      opportunityAttack(actor.id, ally.id),
      attack(actor.id, enemy.id),
      hostile,
    ]))).toBe(hostile);
  });

  it('prefers the nearest hostile attack, then a move toward the nearest hostile', async () => {
    const actor = monsterProfile('monster-distance-actor', { initiativeBonus: 20 });
    const near = playerProfile('monster-distance-near', { initiativeBonus: 0 });
    const far = playerProfile('monster-distance-far', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: far, column: 5 },
      { profile: near, column: 2 },
    ]);
    const nearAttack = attack(actor.id, near.id, 'attack:near');
    expect(await chooseAction(dmRequest(state, actor.id, [
      attack(actor.id, far.id, 'attack:far'),
      nearAttack,
    ]))).toBe(nearAttack);

    const toward = move(actor.id, 1);
    expect(await chooseAction(dmRequest(state, actor.id, [
      move(actor.id, 6),
      toward,
    ]))).toEqual(toward);
  });

  it('ranks decline, fallback, and end-turn in their exact order', async () => {
    const actor = monsterProfile('monster-fallback-actor', { initiativeBonus: 20 });
    const enemy = playerProfile('monster-fallback-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const decline: EncounterCommand = {
      type: 'decline_reaction',
      actor: actor.id,
      mover: enemy.id,
    };
    expect(await chooseAction(dmRequest(state, actor.id, [
      { type: 'end_turn', actor: actor.id },
      { type: 'dodge', actor: actor.id },
      decline,
    ]))).toBe(decline);
    expect(await chooseAction(dmRequest(state, actor.id, [
      { type: 'end_turn', actor: actor.id },
      { type: 'dodge', actor: actor.id },
    ]))).toEqual({ type: 'dodge', actor: actor.id });

    const fallback: EncounterCommand = {
      type: 'activate_action_surge',
      actor: actor.id,
      effectId: encounterEffectId('effect:monster-rank-fallback'),
    };
    expect(await chooseAction(dmRequest(state, actor.id, [fallback, decline]))).toBe(decline);

    const heal: EncounterCommand = {
      type: 'heal',
      actor: actor.id,
      target: actor.id,
      amount: 1,
      cost: 'action',
    };
    expect(await chooseAction(dmRequest(state, actor.id, [
      { type: 'end_turn', actor: actor.id },
      heal,
    ]))).toBe(heal);
  });
});

describe('controller mutation contract: turn-program enumeration', () => {
  it('enumerates the complete scored PC primitive set and honors a numeric limit', () => {
    const actor = playerProfile('program-pc', { initiativeBonus: 20 });
    const wounded = monsterProfile('program-wounded', { hitPoints: 4, initiativeBonus: -10 });
    const healthy = monsterProfile('program-healthy', { hitPoints: 9, initiativeBonus: -20 });
    const ally = playerProfile('program-ally', { initiativeBonus: 0 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: healthy, column: 4 },
      { profile: ally, column: 1 },
      { profile: wounded, column: 2 },
    ]);
    const controller = new AlgorithmController();
    const candidates = controller.enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      20,
    );

    expect(candidates.map(({ program, score }) => ({ program, score }))).toEqual([
      {
        program: { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: wounded.id } } },
        score: 996,
      },
      {
        program: { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: healthy.id } } },
        score: 991,
      },
      {
        program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: wounded.id } } },
        score: 986,
      },
      {
        program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: healthy.id } } },
        score: 981,
      },
      {
        program: { kind: 'action', action: { kind: 'move_toward', target: { kind: 'combatant', combatantId: wounded.id } } },
        score: 50,
      },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'dash' } }, score: 40 },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } }, score: 0 },
    ]);
    expect(candidates.every((candidate) => candidate.stableSortKey === canonicalJson(candidate.program)))
      .toBe(true);
    expect(controller.enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      2,
    )).toEqual(candidates.slice(0, 2));
  });

  it('derives only hostile programs from legal PC actions and preserves attack ids', () => {
    const actor = playerProfile('legal-program-pc', { initiativeBonus: 20 });
    const enemy = monsterProfile('legal-program-enemy', { hitPoints: 7, initiativeBonus: -20 });
    const ally = playerProfile('legal-program-ally', { initiativeBonus: 0 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: ally, column: 1 },
      { profile: enemy, column: 4 },
    ]);
    const legalActions: LegalActionSummary = { actions: [
      attack(actor.id, ally.id, 'attack:ally'),
      attack(actor.id, enemy.id, 'attack:enemy'),
      forceSave(actor.id, enemy.id),
      forceSave(actor.id, ally.id),
      spell(actor.id, 'ray-of-frost', [enemy.id, enemy.id, ally.id]),
      move(actor.id, 1),
      { type: 'dash', actor: actor.id },
    ] };
    const candidates = new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      legalActions,
      20,
    );

    expect(candidates.map(({ program, score }) => ({ program, score }))).toEqual([
      {
        program: {
          kind: 'action',
          action: {
            kind: 'cast_spell',
            spellId: 'ray-of-frost',
            target: { kind: 'combatant', combatantId: enemy.id },
          },
        },
        score: 1093,
      },
      {
        program: {
          kind: 'action',
          action: {
            kind: 'attack',
            target: { kind: 'combatant', combatantId: enemy.id },
            attackId: 'attack:enemy',
          },
        },
        score: 993,
      },
      {
        program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: enemy.id } } },
        score: 983,
      },
      {
        program: { kind: 'action', action: { kind: 'move_toward', target: { kind: 'combatant', combatantId: enemy.id } } },
        score: 50,
      },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'dash' } }, score: 40 },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } }, score: 0 },
    ]);
    expect(canonicalJson(candidates)).not.toContain(String(ally.id));
  });

  it('uses the specifically targeted hostile when a different enemy is first', () => {
    const actor = playerProfile('legal-specific-pc', { initiativeBonus: 20 });
    const first = monsterProfile('legal-specific-first', { hitPoints: 2, initiativeBonus: 0 });
    const target = monsterProfile('legal-specific-target', { hitPoints: 8, initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: first, column: 1 },
      { profile: target, column: 4 },
    ]);
    const candidates = new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      { actions: [
        attack(actor.id, target.id, 'attack:specific-target'),
        spell(actor.id, 'ray-of-frost', [target.id]),
      ] },
      20,
    );

    expect(candidates.map((candidate) => candidate.program)).toEqual([
      {
        kind: 'action',
        action: {
          kind: 'cast_spell',
          spellId: 'ray-of-frost',
          target: { kind: 'combatant', combatantId: target.id },
        },
      },
      {
        kind: 'action',
        action: {
          kind: 'attack',
          target: { kind: 'combatant', combatantId: target.id },
          attackId: 'attack:specific-target',
        },
      },
      { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    ]);
  });

  it('omits an absent attack id and adds neither move nor dash without matching legal commands', () => {
    const actor = playerProfile('legal-minimal-pc', { initiativeBonus: 20 });
    const enemy = monsterProfile('legal-minimal-enemy', { hitPoints: 7, initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const command = attack(actor.id, enemy.id);
    const withoutAttackId: Extract<EncounterCommand, { readonly type: 'attack' }> = {
      type: command.type,
      actor: command.actor,
      target: command.target,
      attackBonus: command.attackBonus,
      criticalFloor: command.criticalFloor,
      rollMode: command.rollMode,
      attackerCanSeeTarget: command.attackerCanSeeTarget,
      targetCanSeeAttacker: command.targetCanSeeAttacker,
      damage: command.damage,
    };
    const candidates = new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      { actions: [withoutAttackId] },
      20,
    );

    expect(candidates.map((candidate) => candidate.program)).toEqual([
      {
        kind: 'action',
        action: {
          kind: 'attack',
          target: { kind: 'combatant', combatantId: enemy.id },
        },
      },
      { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    ]);
  });

  it('returns only end-turn for a legal PC summary with no actions', () => {
    const actor = playerProfile('legal-empty-pc', { initiativeBonus: 20 });
    const enemy = monsterProfile('legal-empty-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    expect(new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      { actions: [] },
      20,
    ).map((candidate) => candidate.program)).toEqual([
      { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    ]);
  });

  it('enumerates, sorts, and limits the complete monster primitive set', () => {
    const actor = monsterProfile('program-monster', { initiativeBonus: 20 });
    const near = playerProfile('program-near', { initiativeBonus: 0 });
    const far = playerProfile('program-far', { initiativeBonus: -10 });
    const ally = monsterProfile('program-monster-ally', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: far, column: 4 },
      { profile: ally, column: 1 },
      { profile: near, column: 2 },
    ]);
    const controller = new AlgorithmController();
    const candidates = controller.enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      20,
    );

    expect(candidates.map(({ program, score }) => ({ program, score }))).toEqual([
      {
        program: { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: near.id } } },
        score: 90,
      },
      {
        program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: near.id } } },
        score: 86,
      },
      {
        program: { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: far.id } } },
        score: 80,
      },
      {
        program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: far.id } } },
        score: 76,
      },
      {
        program: { kind: 'action', action: { kind: 'move_toward', target: { kind: 'combatant', combatantId: near.id } } },
        score: 40,
      },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'dodge' } }, score: 20 },
      { program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } }, score: 0 },
    ]);
    expect(controller.enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      3,
    )).toEqual(candidates.slice(0, 3));
  });

  it('groups equal-distance monster attacks ahead of saves using score then stable key', () => {
    const actor = monsterProfile('program-tie-monster', { initiativeBonus: 20 });
    const alpha = playerProfile('program-tie-alpha', { initiativeBonus: 0 });
    const beta = playerProfile('program-tie-beta', { initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0, row: 1 },
      { profile: beta, column: 1, row: 2 },
      { profile: alpha, column: 1, row: 0 },
    ]);
    const candidates = new AlgorithmController().enumerateTurnPrograms(
      dmVisibleEncounter(projectDmView(state)),
      actor.id,
      20,
    );

    expect(candidates.slice(0, 4).map((candidate) => candidate.program)).toEqual([
      { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: alpha.id } } },
      { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: beta.id } } },
      { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: alpha.id } } },
      { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: beta.id } } },
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid candidate limit %s with the exact contract error',
    (limit) => {
      const actor = playerProfile('invalid-program-limit', { initiativeBonus: 20 });
      const enemy = monsterProfile('invalid-program-limit-enemy', { initiativeBonus: -20 });
      const visible = dmVisibleEncounter(projectDmView(startedState([actor, enemy])));
      expect(() => new AlgorithmController().enumerateTurnPrograms(visible, actor.id, limit))
        .toThrow('Algorithm turn candidate limit must be a positive integer.');
    },
  );

  it('accepts the exact minimum candidate limit', () => {
    const actor = playerProfile('minimum-program-limit', { initiativeBonus: 20 });
    const enemy = monsterProfile('minimum-program-limit-enemy', { initiativeBonus: -20 });
    const visible = dmVisibleEncounter(projectDmView(startedState([actor, enemy])));

    expect(new AlgorithmController().enumerateTurnPrograms(visible, actor.id, 1)).toHaveLength(1);
  });

  it('rejects missing and non-living actors with the exact contract error', () => {
    const actor = playerProfile('invalid-program-actor', { initiativeBonus: 20 });
    const enemy = monsterProfile('invalid-program-actor-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const visible = dmVisibleEncounter(projectDmView(state));
    const controller = new AlgorithmController();
    expect(() => controller.enumerateTurnPrograms(visible, 'combatant:missing' as CombatantId))
      .toThrow('Algorithm turn candidates require a living combatant in the DM projection.');
    const dead = dmVisibleEncounter(projectDmView(withHitPoints(state, actor.id, 0, 'dead')));
    expect(() => controller.enumerateTurnPrograms(dead, actor.id))
      .toThrow('Algorithm turn candidates require a living combatant in the DM projection.');
  });

  it('proposes the ranked priority program and exact top-action gap', () => {
    const actor = playerProfile('round-proposal', { initiativeBonus: 20 });
    const wounded = monsterProfile('round-proposal-wounded', { hitPoints: 4, initiativeBonus: -10 });
    const healthy = monsterProfile('round-proposal-healthy', { hitPoints: 9, initiativeBonus: -20 });
    const state = stateAtPositions([
      { profile: actor, column: 0 },
      { profile: healthy, column: 4 },
      { profile: wounded, column: 2 },
    ]);
    const visible = dmVisibleEncounter(projectDmView(state));
    const controller = new AlgorithmController();
    const ranked = controller.enumerateTurnPrograms(visible, actor.id, 20);
    const proposal = controller.proposeRoundProgram(visible, actor.id);

    expect(proposal.program).toEqual({
      kind: 'priority',
      choices: ranked.map((candidate) => candidate.program),
    });
    expect(proposal.topActionGapPercent).toBeCloseTo(500 / 996, 12);
  });
});

describe('controller mutation contract: decoding, agents, and registry', () => {
  it.each([
    null,
    [],
    'response',
    { protocolVersion: 2, requestId: 'request', encounterRevision: 1, action: { type: 'end_turn' } },
    { protocolVersion: 1, requestId: 7, encounterRevision: 1, action: { type: 'end_turn' } },
    { protocolVersion: 1, requestId: 'request', encounterRevision: 1.5, action: { type: 'end_turn' } },
  ])('rejects malformed agent envelope %#', (value) => {
    expect(() => decodeAgentControllerResponse(value))
      .toThrow('Malformed agent controller response envelope.');
  });

  it.each([
    undefined,
    null,
    [],
    'end_turn',
    {},
    { type: 7 },
  ])('rejects non-command agent action %#', (action) => {
    expect(() => decodeAgentControllerResponse({
      protocolVersion: 1,
      requestId: 'request:decode',
      encounterRevision: 4,
      action,
    })).toThrow('Agent response action must be an encounter command object.');
  });

  it('rejects an unknown command type and decodes the exact valid envelope', () => {
    expect(() => decodeAgentControllerResponse({
      protocolVersion: 1,
      requestId: 'request:decode',
      encounterRevision: 4,
      action: { type: 'future_command' },
    })).toThrow('Agent response action has an unknown command type.');
    expect(decodeAgentControllerResponse({
      protocolVersion: 1,
      requestId: 'request:decode',
      encounterRevision: 4,
      action: { type: 'end_turn', actor: 'combatant:decode' },
    })).toEqual({
      protocolVersion: 1,
      requestId: 'request:decode',
      encounterRevision: 4,
      action: { type: 'end_turn', actor: 'combatant:decode' },
    });
  });

  it('passes the exact request and signal through AgentController and returns its exact decision', async () => {
    const actor = playerProfile('agent-success', { initiativeBonus: 20 });
    const enemy = monsterProfile('agent-success-enemy', { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const request = playerRequest(state, actor.id, [{ type: 'end_turn', actor: actor.id }]);
    const abort = new AbortController();
    const exchange = vi.fn(async () => ({
      protocolVersion: 1,
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0],
    }));
    const decision = await new AgentController({ exchange }).choose(request, abort.signal);

    expect(exchange).toHaveBeenCalledWith({
      protocolVersion: 1,
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      actorId: request.actorId,
      visibleBoard: request.visibleState,
      legalActions: request.legalActions,
    }, abort.signal);
    expect(decision).toEqual({
      protocolVersion: 1,
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0],
    });
  });

  it.each(['request', 'revision'] as const)('rejects a stale agent %s with the exact typed error', async (field) => {
    const actor = playerProfile(`agent-stale-${field}`, { initiativeBonus: 20 });
    const enemy = monsterProfile(`agent-stale-${field}-enemy`, { initiativeBonus: -20 });
    const state = startedState([actor, enemy]);
    const request = playerRequest(state, actor.id, [{ type: 'end_turn', actor: actor.id }]);
    const controller = new AgentController({
      exchange: async () => ({
        protocolVersion: 1,
        requestId: field === 'request' ? `${request.requestId}:stale` : request.requestId,
        encounterRevision: field === 'revision'
          ? request.encounterRevision + 1
          : request.encounterRevision,
        action: request.legalActions.actions[0],
      }),
    });

    const decision = controller.choose(request, new AbortController().signal);
    await expect(decision).rejects.toBeInstanceOf(StaleControllerResponseError);
    await expect(decision).rejects.toThrow('Agent response is stale.');
  });

  it('exposes exact sorted identities, controller kinds, generations, replacement events, and removal', () => {
    const alpha = playerProfile('registry-alpha');
    const beta = monsterProfile('registry-beta');
    const human = new HumanController();
    const algorithm = new AlgorithmController();
    const registry = new ControllerRegistry([
      { combatantId: beta.id, controller: algorithm },
      { combatantId: alpha.id, controller: human, controllerId: 'controller:explicit-human' },
    ]);

    expect(registry.identities()).toEqual([
      {
        combatantId: alpha.id,
        controllerId: 'controller:explicit-human',
        kind: 'human',
        generation: 0,
      },
      {
        combatantId: beta.id,
        controllerId: `${beta.id}:algorithm:0`,
        kind: 'algorithm',
        generation: 0,
      },
    ]);
    expect(registry.controllerFor(alpha.id)).toBe(human);
    expect(registry.generationFor(alpha.id)).toBe(0);
    expect(registry.kindFor(alpha.id)).toBe('human');

    const listener = vi.fn();
    const unsubscribe = registry.onReplace(listener);
    const agent = new AgentController({ exchange: async () => null });
    registry.replace(alpha.id, agent);
    expect(listener).toHaveBeenCalledExactlyOnceWith(alpha.id);
    expect(registry.controllerFor(alpha.id)).toBe(agent);
    expect(registry.generationFor(alpha.id)).toBe(1);
    expect(registry.kindFor(alpha.id)).toBe('agent');
    expect(registry.identities()[0]?.controllerId).toBe(`${alpha.id}:agent:1`);

    unsubscribe();
    const custom: Controller = {
      controllerKind: 'custom',
      choose: async (request) => ({
        requestId: request.requestId,
        encounterRevision: request.encounterRevision,
        action: request.legalActions.actions[0]!,
      }),
    };
    registry.replace(alpha.id, custom, 'controller:custom');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(registry.identities()[0]).toEqual({
      combatantId: alpha.id,
      controllerId: 'controller:custom',
      kind: 'custom',
      generation: 2,
    });

    registry.remove(beta.id);
    expect(registry.identities()).toHaveLength(1);
    expect(() => registry.remove(beta.id)).toThrow(`No controller assigned to ${beta.id}.`);
  });

  it('assigns a summoned combatant from the exact source seam and rejects every invalid registry target', () => {
    const source = playerProfile('registry-source');
    const summoned = monsterProfile('registry-summoned');
    const missing = 'combatant:registry-missing' as CombatantId;
    const human = new HumanController();
    const registry = new ControllerRegistry([
      { combatantId: source.id, controller: human, controllerId: 'controller:source' },
    ]);

    registry.assignFrom(summoned.id, source.id);
    expect(registry.controllerFor(summoned.id)).toBe(human);
    expect(registry.identities()).toContainEqual({
      combatantId: summoned.id,
      controllerId: 'controller:source',
      kind: 'human',
      generation: 0,
    });
    expect(() => registry.assignFrom(summoned.id, source.id))
      .toThrow(`Controller already assigned to ${summoned.id}.`);
    expect(() => registry.assignFrom(missing, 'combatant:no-source' as CombatantId))
      .toThrow('No controller assigned to combatant:no-source.');
    expect(() => registry.controllerFor(missing)).toThrow(`No controller assigned to ${missing}.`);
    expect(() => registry.generationFor(missing)).toThrow(`No controller assigned to ${missing}.`);
    expect(() => registry.kindFor(missing)).toThrow(`No controller assigned to ${missing}.`);
    expect(() => registry.replace(missing, human)).toThrow(`No controller assigned to ${missing}.`);
  });

  it('rejects duplicate constructor assignments with the exact combatant id', () => {
    const actor = playerProfile('registry-duplicate');
    expect(() => new ControllerRegistry([
      { combatantId: actor.id, controller: new HumanController() },
      { combatantId: actor.id, controller: new AlgorithmController() },
    ])).toThrow(`Duplicate controller assignment for ${actor.id}.`);
  });

  it('uses an explicit controllerKind before class inference and identifies an untagged controller as custom', () => {
    const explicit = playerProfile('registry-explicit-kind');
    const implicit = playerProfile('registry-implicit-custom');
    const choose = async (request: ControllerRequest) => ({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: request.legalActions.actions[0]!,
    });
    const registry = new ControllerRegistry([
      { combatantId: explicit.id, controller: { controllerKind: 'algorithm', choose } },
      { combatantId: implicit.id, controller: { choose } },
    ]);
    expect(registry.kindFor(explicit.id)).toBe('algorithm');
    expect(registry.kindFor(implicit.id)).toBe('custom');
  });
});
