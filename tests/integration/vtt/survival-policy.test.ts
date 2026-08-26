import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { AlgorithmController, type ControllerRequest } from '../../../src/combat/controllers';
import type { EncounterCommand } from '../../../src/combat/events';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { CombatantId } from '../../../src/combat/values';
import { projectPlayerView } from '../../../src/combat/visibility';
import { rpcRegistry } from '../../../src/worker/registry';
import { D365_SAMPLE_DUNGEON, composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import {
  loadD365SampleParty,
  type D365SamplePartyLoad,
} from '../../../src/vtt/d365-sample-party';
import { createPartySessionState, takeShortRest } from '../../../src/vtt/party-session-state';
import {
  averageCureWoundsHealing,
  averageHitDieHealing,
  castBetweenFightCureWounds,
  createD365SurvivalPartySessionState,
  equipD365HealingPotions,
  HEALING_POTION_DRINK_THRESHOLD,
  prepareAid,
  shouldCastAverageHealing,
  shouldDrinkHealingPotion,
  shouldSpendHitDie,
} from '../../../src/vtt/survival-policy';
import {
  measureSurvivalFraction,
  survivalShortRestPolicy,
  SURVIVAL_MEASUREMENT_SEEDS,
} from '../../../src/vtt/survival-harness';
import type { HandlerContext } from '../../../src/worker/handler';
import { createSeededRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

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

function advanceToActor(state: EncounterState, actor: CombatantId): EncounterState {
  let current = state.initiative.length === 0
    ? reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state
    : state;
  let guard = current.initiative.length + 1;
  while (current.activeCombatant !== actor && guard > 0) {
    const active = current.activeCombatant;
    if (active === null) throw new Error('Survival test encounter lost its active combatant.');
    current = reduceEncounter(current, { type: 'end_turn', actor: active }, () => 0.5).state;
    guard -= 1;
  }
  if (current.activeCombatant !== actor) throw new Error(`Could not advance to ${actor}.`);
  return current;
}

function withHitPoints(state: EncounterState, actor: CombatantId, hitPoints: number): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((candidate) => candidate.profile.id === actor
      ? { ...candidate, hitPoints }
      : candidate),
  };
}

function potionCommand(actions: readonly EncounterCommand[]): Extract<EncounterCommand, { readonly type: 'drink_healing_potion' }> {
  const command = actions.find((candidate) => candidate.type === 'drink_healing_potion');
  if (command?.type !== 'drink_healing_potion') throw new Error('Potion policy did not offer a drink command.');
  return command;
}

describe('D382 survival package', () => {
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

  it('policy drinks strictly below 40 percent HP, not at the boundary or while ally-cast healing is incoming', () => {
    expect(HEALING_POTION_DRINK_THRESHOLD).toBe(0.4);
    expect(shouldDrinkHealingPotion({
      currentHitPoints: 39,
      hitPointMaximum: 100,
      allyCastHealingIncoming: false,
    })).toBe(true);
    expect(shouldDrinkHealingPotion({
      currentHitPoints: 40,
      hitPointMaximum: 100,
      allyCastHealingIncoming: false,
    })).toBe(false);
    expect(shouldDrinkHealingPotion({
      currentHitPoints: 39,
      hitPointMaximum: 100,
      allyCastHealingIncoming: true,
    })).toBe(false);
  });

  it('potion_free_refill: drinking heals exactly 2d4+2, consumes exactly one real item use, and spends the Bonus Action', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      { useHealingPotions: true, openWithBless: true, reserveClericSlotsForBless: true },
    );
    const actor = prepared.state.characters[0]?.combatantId;
    if (actor === undefined) throw new Error('Survival party has no first character.');
    let state = advanceToActor(composed.state, actor);
    const effectiveMaximum = prepared.state.characters[0]?.hitPointMaximum;
    if (effectiveMaximum === undefined) throw new Error('Survival party has no Hit Point maximum.');
    state = withHitPoints(state, actor, 1);
    const command = potionCommand(composed.turnLegalActions(state, actor).actions);
    const before = state.combatants.find((candidate) => candidate.profile.id === actor)?.hitPoints;
    const potionBefore = state.effects.find((effect) => effect.id === command.effectId);
    if (before === undefined || potionBefore?.payload.kind !== 'healing_potion') {
      throw new Error('Potion test fixture is incomplete.');
    }
    const faces = [0, 0.999];
    const result = reduceEncounter(state, command, () => faces.shift() ?? 0);
    const after = result.state.combatants.find((candidate) => candidate.profile.id === actor)?.hitPoints;
    const potionAfter = result.state.effects.find((effect) => effect.id === command.effectId);
    expect(after).toBe(before + 7);
    expect(potionAfter?.payload).toMatchObject({
      kind: 'healing_potion',
      itemId: potionBefore.payload.itemId,
      remainingUses: 1,
      dice: { count: 2, sides: 4, modifier: 2 },
    });
    expect(result.state.combatants.find((candidate) => candidate.profile.id === actor)?.turn.bonusActionAvailable)
      .toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'healing_potion_consumed',
      combatant: actor,
      itemId: potionBefore.payload.itemId,
      remaining: 1,
    }));
  });

  it('the live policy offers a potion below its threshold and not at the threshold', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      { useHealingPotions: true, openWithBless: true, reserveClericSlotsForBless: true },
    );
    const actor = prepared.state.characters[0]?.combatantId;
    const maximum = prepared.state.characters[0]?.hitPointMaximum;
    if (actor === undefined || maximum === undefined) throw new Error('Survival policy fixture is incomplete.');
    const active = advanceToActor(composed.state, actor);
    const below = withHitPoints(active, actor, Math.ceil(maximum * 0.4) - 1);
    expect(composed.turnLegalActions(below, actor).actions.some((action) => action.type === 'drink_healing_potion')).toBe(true);
    const atOrAbove = withHitPoints(active, actor, Math.ceil(maximum * 0.4));
    expect(composed.turnLegalActions(atOrAbove, actor).actions.some((action) => action.type === 'drink_healing_potion')).toBe(false);
  });

  it('aid_stacks: two level-2 castings cover all five PCs for 8 hours without stacking an overlapping target', () => {
    const base = equipD365HealingPotions(createPartySessionState(sample.party.members));
    const caster = base.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((heldClass) => heldClass.classId === 'Druid'))?.combatantId;
    if (caster === undefined) throw new Error('Survival party has no Druid.');
    const targets = base.characters.map((character) => character.combatantId);
    const prepared = prepareAid(base, caster, [targets.slice(0, 3), [targets[0] as CombatantId, ...targets.slice(3, 5)]]);
    expect(prepared.castings).toHaveLength(2);
    expect(prepared.castings.every((casting) => casting.slotLevel === 2 && casting.targets.length <= 3)).toBe(true);
    expect([prepared.levelTwoSlotsBefore, prepared.levelTwoSlotsAfter]).toEqual([3, 1]);
    for (const [index, character] of prepared.state.characters.entries()) {
      const prior = base.characters[index];
      if (prior === undefined) throw new Error('Aid fixture lost a party member.');
      expect(character.hitPointMaximum).toBe(prior.hitPointMaximum + 5);
      expect(character.currentHitPoints).toBe(prior.currentHitPoints + 5);
      expect(character.aid).toEqual({ source: caster, amount: 5 });
    }
    const encounter = composeD365Room(sample.party.members, sample.displayNames, prepared.state).state;
    const aid = encounter.effects.find((effect) => effect.payload.kind === 'hit_point_maximum_modifier');
    expect(aid).toMatchObject({
      source: caster,
      targets: expect.arrayContaining(targets),
      duration: { kind: 'turn_boundaries', remaining: 4_800 },
      concentrationOwner: null,
      payload: { kind: 'hit_point_maximum_modifier', amount: 5 },
    });
    expect(aid?.targets).toHaveLength(5);
  });

  it('detune_ratio_stale: every D365 recorded ratio equals its final live composition divided by five PCs', () => {
    expect(D365_SAMPLE_DUNGEON.rooms.map((room) => ({
      room: room.room,
      derived: room.monsters.length / 5,
      recorded: room.recordedActionEconomyRatio,
    }))).toEqual([
      { room: 1, derived: 0.8, recorded: 0.8 },
      { room: 2, derived: 0.4, recorded: 0.4 },
      { room: 3, derived: 0.6, recorded: 0.6 },
      { room: 4, derived: 0.2, recorded: 0.2 },
    ]);
  });

  it('thrift_spends_anyway: skips a Hit Point Die below its average-healing threshold and spends at the first integer above it', () => {
    expect(averageHitDieHealing(8, 2)).toBe(6.5);
    expect(shouldSpendHitDie({ missingHitPoints: 6, sides: 8, constitutionModifier: 2 })).toBe(false);
    expect(shouldSpendHitDie({ missingHitPoints: 7, sides: 8, constitutionModifier: 2 })).toBe(true);
    const base = createD365SurvivalPartySessionState(sample.party.members).state;
    const subject = base.characters.find((character) => character.constitutionModifier === 2 &&
      character.hitDice.some((pool) => pool.sides === 8));
    if (subject === undefined) throw new Error('Hit-Die thrift fixture has no d8/+2 member.');
    const at = (missing: number) => ({
      ...base,
      characters: base.characters.map((character) => character.combatantId === subject.combatantId
        ? { ...character, currentHitPoints: character.hitPointMaximum - missing }
        : character),
    });
    expect(survivalShortRestPolicy(at(6))).toEqual([]);
    expect(survivalShortRestPolicy(at(7))).toEqual([{
      combatantId: subject.combatantId,
      dice: [{ sides: 8, count: 1 }],
    }]);
  });

  it('overheal_cast: spell thrift casts at exact average healing and refuses one HP below it', () => {
    expect(averageCureWoundsHealing(1, 3)).toBe(12);
    expect(shouldCastAverageHealing({ missingHitPoints: 12, averageHealing: 12 })).toBe(true);
    expect(shouldCastAverageHealing({ missingHitPoints: 11, averageHealing: 12 })).toBe(false);
  });

  it('between-fight Cure Wounds spends the cheapest sufficient slot and preserves Bless plus Spirit Guardians reserves', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members).state;
    const orin = sample.party.members.find((member) => member.source.classes.some((entry) => entry.classId === 'Druid'));
    const sera = sample.party.members.find((member) => member.source.classes.some((entry) => entry.classId === 'Cleric'));
    if (orin === undefined || sera === undefined) throw new Error('Between-fight caster fixture is incomplete.');
    const wounded = prepared.characters[0];
    if (wounded === undefined) throw new Error('Between-fight target fixture is incomplete.');
    const state = {
      ...prepared,
      characters: prepared.characters.map((character) => character.combatantId === wounded.combatantId
        ? { ...character, currentHitPoints: character.hitPointMaximum - 13 }
        : character),
    };
    const seraBefore = state.characters.find((character) => character.combatantId === sera.profile.id)?.spellSlots;
    const cured = castBetweenFightCureWounds(sample.party.members, state, {
      clericBlessOpeningsReserved: 7,
      clericSpiritGuardiansSlotsReserved: 2,
    });
    expect(cured.castings[0]).toEqual({
      caster: orin.profile.id,
      target: wounded.combatantId,
      slotLevel: 1,
      averageHealing: 13,
    });
    expect(cured.state.characters.find((character) => character.combatantId === sera.profile.id)?.spellSlots)
      .toEqual(seraBefore);
    expect(cured.state.characters.find((character) => character.combatantId === wounded.combatantId)?.currentHitPoints)
      .toBe(wounded.hitPointMaximum);
  });

  it('owner ruling: casting Cure Wounds during a Short Rest leaves Hit-Die healing and Short-Rest recharge intact', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members).state;
    const warlock = sample.party.members.find((member) => member.source.classes.some((entry) => entry.classId === 'Warlock'));
    const druid = sample.party.members.find((member) => member.source.classes.some((entry) => entry.classId === 'Druid'));
    if (warlock === undefined || druid === undefined) throw new Error('Short Rest casting fixture is incomplete.');
    const state = {
      ...prepared,
      characters: prepared.characters.map((character) => {
        if (character.combatantId === warlock.profile.id) {
          return {
            ...character,
            currentHitPoints: character.hitPointMaximum - 7,
            spellSlots: character.spellSlots.map((slot) => slot.pool === 'pact_magic' ? { ...slot, remaining: 0 } : slot),
          };
        }
        return character.combatantId === druid.profile.id
          ? { ...character, currentHitPoints: character.hitPointMaximum - 13 }
          : character;
      }),
    };
    const cured = castBetweenFightCureWounds(sample.party.members, state, {
      clericBlessOpeningsReserved: 7,
      clericSpiritGuardiansSlotsReserved: 2,
    });
    const rested = takeShortRest(cured.state, survivalShortRestPolicy(cured.state), () => 0.5);
    expect(cured.castings).toContainEqual(expect.objectContaining({ caster: druid.profile.id, slotLevel: 1 }));
    expect(rested.rolls.some((roll) => roll.combatantId === warlock.profile.id)).toBe(true);
    expect(rested.state.characters.find((character) => character.combatantId === warlock.profile.id)
      ?.spellSlots.find((slot) => slot.pool === 'pact_magic')?.remaining).toBe(2);
  });

  it('Bless opens the fight on exactly three targets and ends when Sera ends concentration', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      { useHealingPotions: true, openWithBless: true, reserveClericSlotsForBless: true },
    );
    const sera = prepared.state.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((entry) => entry.classId === 'Cleric'))?.combatantId;
    if (sera === undefined) throw new Error('Bless fixture has no Cleric.');
    const active = advanceToActor(composed.state, sera);
    const command = composed.turnLegalActions(active, sera).actions.find((candidate) =>
      candidate.type === 'cast_spell' && candidate.spellId === 'bless');
    if (command?.type !== 'cast_spell') throw new Error('Sera has no opening Bless command.');
    expect(command.targets).toHaveLength(3);
    const cast = reduceEncounter(active, command, () => 0).state;
    const blessing = cast.effects.filter((effect) =>
      effect.concentrationOwner === sera && effect.payload.kind === 'd20_test_modifier');
    expect(blessing).toHaveLength(1);
    expect(blessing[0]).toMatchObject({
      targets: command.targets,
      payload: {
        kind: 'd20_test_modifier',
        tests: ['attack_roll', 'saving_throw'],
        count: 1,
        sides: 4,
        sign: 1,
      },
    });
    const ended = reduceEncounter(cast, { type: 'end_concentration', actor: sera }, () => 0).state;
    expect(ended.effects.some((effect) => effect.concentrationOwner === sera)).toBe(false);
  });

  it('slow_on_two: offers Slow for at least three enemies in one 40-foot cube and not for two', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      {
        useHealingPotions: true,
        openWithBless: true,
        reserveClericSlotsForBless: true,
        useWizardTactics: true,
        useClericContingency: true,
      },
    );
    const wizard = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === 'Wizard'));
    if (wizard === undefined) throw new Error('Slow policy fixture has no Wizard.');
    const active = advanceToActor(composed.state, wizard.profile.id);
    const clustered = composed.turnLegalActions(active, wizard.profile.id).actions.find((action) =>
      action.type === 'cast_spell' && action.spellId === 'slow');
    if (clustered?.type !== 'cast_spell') throw new Error('Slow was not offered for the room-1 cluster.');
    expect(clustered.targets.length).toBeGreaterThanOrEqual(3);
    expect(clustered.area).toMatchObject({
      shape: 'cube',
      template: { size: 40 },
    });
    const livingMonsters = active.combatants.filter((combatant) => combatant.profile.kind === 'monster').slice(0, 2);
    const twoEnemies = {
      ...active,
      combatants: active.combatants.map((combatant) =>
        combatant.profile.kind === 'monster' && !livingMonsters.includes(combatant)
          ? { ...combatant, hitPoints: 0, life: 'dead' as const }
          : combatant),
    };
    expect(composed.turnLegalActions(twoEnemies, wizard.profile.id).actions.some((action) =>
      action.type === 'cast_spell' && action.spellId === 'slow')).toBe(false);
    // Slow geometry/effects: docs/srd/source/spell-descriptions.txt:7140-7163.
  });

  it('spirit_guardians_while_blessed: offers Spirit Guardians exactly after Bless concentration breaks', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      {
        useHealingPotions: true,
        openWithBless: true,
        reserveClericSlotsForBless: true,
        useWizardTactics: true,
        useClericContingency: true,
      },
    );
    const sera = prepared.state.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((entry) => entry.classId === 'Cleric'))?.combatantId;
    if (sera === undefined) throw new Error('Spirit Guardians policy fixture has no Cleric.');
    const active = advanceToActor(composed.state, sera);
    const bless = composed.turnLegalActions(active, sera).actions.find((action) =>
      action.type === 'cast_spell' && action.spellId === 'bless');
    if (bless?.type !== 'cast_spell') throw new Error('Spirit Guardians fixture could not cast Bless.');
    const cast = reduceEncounter(active, bless, () => 0).state;
    const afterEnd = reduceEncounter(cast, { type: 'end_turn', actor: sera }, () => 0.5).state;
    const holding = advanceToActor(afterEnd, sera);
    expect(composed.turnLegalActions(holding, sera).actions.some((action) =>
      action.type === 'cast_spell' && action.spellId === 'spirit-guardians')).toBe(false);
    const blessing = holding.effects.find((effect) => effect.concentrationOwner === sera);
    if (blessing === undefined) throw new Error('Bless concentration effect is missing.');
    const broken: EncounterState = {
      ...holding,
      nextEventSequence: holding.nextEventSequence + 1,
      effects: holding.effects.filter((effect) => effect.id !== blessing.id),
      eventLog: [...holding.eventLog, {
        sequence: holding.nextEventSequence,
        type: 'effect_ended',
        effectId: blessing.id,
        reason: 'concentration_broken',
      }],
    };
    const contingencies = composed.turnLegalActions(broken, sera).actions.filter((action) =>
      action.type === 'cast_spell' && action.spellId === 'spirit-guardians');
    expect(contingencies).toHaveLength(1);
    expect(contingencies[0]).toMatchObject({ slotLevel: 3, targets: [], area: { shape: 'emanation' } });
    // Spirit Guardians: docs/srd/source/spell-descriptions.txt:7324-7344.
  });

  it('topple_mastery_ignored: Brann applies Topple and Slow mastery effects from his selected weapons', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(sample.party.members, sample.displayNames, prepared.state, {
      useHealingPotions: true,
      openWithBless: true,
      reserveClericSlotsForBless: true,
      useWizardTactics: true,
      useClericContingency: true,
    });
    const brann = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === 'Fighter'));
    if (brann === undefined) throw new Error('Mastery policy fixture has no Fighter.');
    const active = advanceToActor(composed.state, brann.profile.id);
    const target = active.combatants.find((combatant) => combatant.profile.kind === 'monster');
    const brannToken = active.tokens.find((token) => token.combatantId === brann.profile.id);
    if (target === undefined || brannToken === undefined) throw new Error('Mastery target fixture is incomplete.');
    const adjacent: EncounterState = {
      ...active,
      tokens: active.tokens.map((token) => token.combatantId === target.profile.id
        ? { ...token, position: { column: brannToken.position.column + 1, row: brannToken.position.row + 1 } }
        : token),
    };
    const topple = composed.turnLegalActions(adjacent, brann.profile.id).actions.find((action) =>
      action.type === 'attack' && action.target === target.profile.id && action.weaponMastery?.property === 'Topple');
    if (topple?.type !== 'attack') throw new Error('Brann has no Topple attack command.');
    const toppleDraws = [0.999, 0, 0];
    const toppled = reduceEncounter(adjacent, topple, () => toppleDraws.shift() ?? 0).state;
    expect(toppled.effects).toContainEqual(expect.objectContaining({
      source: brann.profile.id,
      targets: [target.profile.id],
      payload: { kind: 'condition', condition: 'Prone' },
    }));

    const rangedActive = advanceToActor(composed.state, brann.profile.id);
    const slow = composed.turnLegalActions(rangedActive, brann.profile.id).actions.find((action) =>
      action.type === 'attack' && action.weaponMastery?.property === 'Slow');
    if (slow?.type !== 'attack') throw new Error('Brann has no Slow attack command.');
    const slowDraws = [0.999, 0];
    const slowed = reduceEncounter(rangedActive, slow, () => slowDraws.shift() ?? 0).state;
    expect(slowed.effects).toContainEqual(expect.objectContaining({
      source: brann.profile.id,
      payload: expect.objectContaining({ kind: 'movement_modifier' }),
    }));
    // Fighter 5 has four masteries (class-level-tables.txt:99-111); Longbow
    // Slow and Battleaxe Topple are in weapons-table.txt:0; effects at
    // docs/srd/full/srd-5.2.1.txt:12807.
  });

  it('moves Brann toward a body-blocking melee position before using his ranged Slow weapon', async () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(sample.party.members, sample.displayNames, prepared.state, {
      useHealingPotions: true,
      openWithBless: true,
      reserveClericSlotsForBless: true,
      useWizardTactics: true,
      useClericContingency: true,
    });
    const brann = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === 'Fighter'));
    if (brann === undefined) throw new Error('Body-block fixture has no Fighter.');
    const active = advanceToActor(composed.state, brann.profile.id);
    const legalActions = composed.turnLegalActions(active, brann.profile.id);
    expect(legalActions.actions.some((action) =>
      action.type === 'attack' && action.weaponMastery?.property === 'Slow')).toBe(true);
    expect(legalActions.actions.some((action) =>
      action.type === 'attack' && action.weaponMastery?.property === 'Topple')).toBe(false);
    const request: ControllerRequest = {
      kind: 'turn',
      requestId: 'request:d385-body-block',
      encounterRevision: active.revision,
      actorId: brann.profile.id,
      visibleState: projectPlayerView(active, {
        seatId: String(brann.profile.id),
        combatantId: brann.profile.id,
        ownedCombatantIds: composed.playerIds,
      }),
      legalActions,
    };
    const decision = await new AlgorithmController().choose(request, new AbortController().signal);
    expect(decision.action.type).toBe('move');
  });

  it('pins the fixed 30-seed final-encounter survival fraction at or above two thirds', async () => {
    expect(SURVIVAL_MEASUREMENT_SEEDS).toEqual(Array.from(
      { length: 30 },
      (_value, index) => 20_260_801 + index,
    ));
    const measurement = await measureSurvivalFraction(
      sample.party.members,
      sample.displayNames,
      SURVIVAL_MEASUREMENT_SEEDS,
      'survival_package',
    );
    expect({ successes: measurement.successes, total: measurement.total }).toEqual({ successes: 30, total: 30 });
    expect(measurement.fraction).toBeGreaterThanOrEqual(2 / 3);
  }, 120_000);

  it('pins every applied-and-restored survival mutation to its named killing test', () => {
    const ledger = readFileSync('docs/audits/2026-08-25-survival-mutation-ledger.md', 'utf8');
    const wizardLedger = readFileSync('docs/audits/2026-08-25-wizard-tactics-mutation-ledger.md', 'utf8');
    const survivalTests = readFileSync('tests/integration/vtt/survival-policy.test.ts', 'utf8');
    const concentrationTests = readFileSync('tests/unit/vtt/roll-modifiers-d351.test.ts', 'utf8');
    for (const mutation of ['potion_free_refill', 'aid_stacks', 'detune_ratio_stale']) {
      expect(ledger).toContain(`\`${mutation}\``);
      expect(survivalTests).toContain(`${mutation}:`);
    }
    expect(ledger).toContain('`bless_without_concentration`');
    expect(concentrationTests).toContain('bless_without_concentration:');
    expect(ledger.match(/`exit 1`/gu)).toHaveLength(4);
    expect(ledger).toContain('All four mutations were restored.');
    for (const mutation of [
      'thrift_spends_anyway',
      'overheal_cast',
      'slow_on_two',
      'spirit_guardians_while_blessed',
      'topple_mastery_ignored',
    ]) {
      expect(wizardLedger).toContain(`\`${mutation}\``);
      expect(survivalTests).toContain(`${mutation}:`);
    }
    expect(wizardLedger.match(/`exit 1`/gu)).toHaveLength(5);
    expect(wizardLedger).toContain('All five mutations were restored.');
  });
});
