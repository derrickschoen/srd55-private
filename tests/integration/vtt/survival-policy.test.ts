import { readFileSync } from '../../helpers/test-filesystem';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { AlgorithmController, type ControllerRequest } from '../../../src/combat/controllers';
import type { EncounterCommand } from '../../../src/combat/events';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import {
  combatantId,
  encounterEffectId,
  itemId,
  type CombatantId,
} from '../../../src/combat/values';
import { projectPlayerView } from '../../../src/combat/visibility';
import { rpcRegistry } from '../../../src/worker/registry';
import { D365_SAMPLE_DUNGEON, composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import {
  loadD365SampleParty,
  type D365SamplePartyLoad,
} from '../../../src/vtt/d365-sample-party';
import type { LoadedPartyMember } from '../../../src/vtt/party-pack';
import { createPartySessionState, takeShortRest } from '../../../src/vtt/party-session-state';
import {
  averageCureWoundsHealing,
  averageHitDieHealing,
  AID_HIT_POINT_BONUS,
  castBetweenFightCureWounds,
  createD365SurvivalPartySessionState,
  D365_HEALING_POTIONS_PER_CHARACTER,
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

  it('replaces only old healing potions and preserves unrelated consumables exactly', () => {
    const base = createPartySessionState(sample.party.members);
    const first = base.characters[0];
    if (first === undefined) throw new Error('Consumable replacement fixture has no character.');
    const state = {
      ...base,
      characters: base.characters.map((character) => character.combatantId === first.combatantId
        ? {
            ...character,
            consumables: [
              {
                kind: 'potion_of_healing' as const,
                effectId: encounterEffectId('effect:old-potion'),
                itemId: itemId('item:old-potion'),
                remainingUses: 99,
              },
              {
                kind: 'goodberries' as const,
                effectId: encounterEffectId('effect:goodberries'),
                remainingUses: 7,
              },
            ],
          }
        : character),
    };

    const equipped = equipD365HealingPotions(state);
    expect(equipped.characters[0]?.consumables).toEqual([
      {
        kind: 'goodberries',
        effectId: encounterEffectId('effect:goodberries'),
        remainingUses: 7,
      },
      {
        kind: 'potion_of_healing',
        effectId: encounterEffectId(`effect:d365:potion-of-healing:${String(first.characterId)}`),
        itemId: itemId(`item:d365:potion-of-healing:${String(first.characterId)}`),
        remainingUses: D365_HEALING_POTIONS_PER_CHARACTER,
      },
    ]);
    expect(equipped.characters.every((character) =>
      character.consumables.filter((consumable) => consumable.kind === 'potion_of_healing').length === 1
    )).toBe(true);
  });

  it('rejects every malformed Aid plan with its precise boundary error', () => {
    const base = createPartySessionState(sample.party.members);
    const caster = base.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((entry) => entry.classId === 'Druid'))?.combatantId;
    if (caster === undefined) throw new Error('Aid validation fixture has no Druid.');
    const targets = base.characters.map((character) => character.combatantId);
    const outsider = combatantId('combatant:not-in-party');

    expect(() => prepareAid(base, caster, [])).toThrowError(
      'Aid preparation requires at least one casting.',
    );
    for (const invalid of [[], targets.slice(0, 4), [targets[0]!, targets[0]!]]) {
      expect(() => prepareAid(base, caster, [invalid])).toThrowError(
        'Each Aid casting must name one to three distinct creatures.',
      );
    }
    expect(() => prepareAid(base, caster, [[outsider]])).toThrowError(
      `Aid target ${outsider} is not in the party.`,
    );
    expect(() => prepareAid(base, outsider, [[targets[0]!]])).toThrowError(
      `Aid caster ${outsider} is not in the party.`,
    );
    const withoutLevelTwo = {
      ...base,
      characters: base.characters.map((character) => character.combatantId === caster
        ? { ...character, spellSlots: character.spellSlots.filter((slot) => slot.level !== 2) }
        : character),
    };
    expect(() => prepareAid(withoutLevelTwo, caster, [[targets[0]!]])).toThrowError(
      'The prepared Aid caster lacks the level-2 spell slots required for the planned castings.',
    );
    const insufficient = {
      ...base,
      characters: base.characters.map((character) => character.combatantId === caster
        ? {
            ...character,
            spellSlots: character.spellSlots.map((slot) =>
              slot.pool === 'shared' && slot.level === 2 ? { ...slot, remaining: 0 } : slot),
          }
        : character),
    };
    expect(() => prepareAid(insufficient, caster, [[targets[0]!]])).toThrowError(
      'The prepared Aid caster lacks the level-2 spell slots required for the planned castings.',
    );
  });

  it('allows the exact remaining Aid slot and leaves pre-aided and untargeted creatures unchanged', () => {
    const base = createPartySessionState(sample.party.members);
    const caster = base.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((entry) => entry.classId === 'Druid'))?.combatantId;
    if (caster === undefined) throw new Error('Aid exact-slot fixture has no Druid.');
    const preAided = base.characters.find((character) => character.combatantId !== caster);
    const untouched = base.characters.find((character) =>
      character.combatantId !== caster && character.combatantId !== preAided?.combatantId);
    if (preAided === undefined || untouched === undefined) {
      throw new Error('Aid exact-slot fixture lacks comparison targets.');
    }
    const state = {
      ...base,
      characters: base.characters.map((character) => {
        const spellSlots = character.combatantId === caster
          ? character.spellSlots.map((slot) => slot.pool === 'shared' && slot.level === 2
            ? { ...slot, remaining: 1 }
            : slot)
          : character.spellSlots;
        return character.combatantId === preAided.combatantId
          ? {
              ...character,
              spellSlots,
              aid: { source: caster, amount: AID_HIT_POINT_BONUS } as const,
            }
          : { ...character, spellSlots };
      }),
    };
    const beforeCaster = state.characters.find((character) => character.combatantId === caster)!;
    const result = prepareAid(state, caster, [[caster, preAided.combatantId]]);
    const afterCaster = result.state.characters.find((character) => character.combatantId === caster)!;
    const afterPreAided = result.state.characters.find(
      (character) => character.combatantId === preAided.combatantId,
    );
    const afterUntouched = result.state.characters.find(
      (character) => character.combatantId === untouched.combatantId,
    );
    expect([result.levelTwoSlotsBefore, result.levelTwoSlotsAfter]).toEqual([1, 0]);
    expect(afterCaster).toMatchObject({
      currentHitPoints: beforeCaster.currentHitPoints + AID_HIT_POINT_BONUS,
      hitPointMaximum: beforeCaster.hitPointMaximum + AID_HIT_POINT_BONUS,
      aid: { source: caster, amount: AID_HIT_POINT_BONUS },
    });
    expect(afterCaster.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 2)?.remaining)
      .toBe(0);
    expect(afterPreAided).toEqual(state.characters.find(
      (character) => character.combatantId === preAided.combatantId,
    ));
    expect(afterUntouched).toEqual(untouched);
    expect(result.castings).toEqual([{ slotLevel: 2, targets: [caster, preAided.combatantId] }]);
  });

  it('spends only the caster shared level-2 Aid slot without reapplying Aid', () => {
    const base = createPartySessionState(sample.party.members);
    const caster = base.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((entry) => entry.classId === 'Druid'));
    const target = base.characters.find((character) => character.combatantId !== caster?.combatantId);
    if (caster === undefined || target === undefined) {
      throw new Error('Aid slot-isolation fixture is incomplete.');
    }
    const casterSlots = [
      { pool: 'pact_magic' as const, level: 2, maximum: 3, remaining: 3, recharge: 'short_rest' as const },
      { pool: 'shared' as const, level: 1, maximum: 4, remaining: 4, recharge: 'long_rest' as const },
      { pool: 'shared' as const, level: 2, maximum: 1, remaining: 1, recharge: 'long_rest' as const },
    ];
    const targetSlots = [
      { pool: 'shared' as const, level: 2, maximum: 7, remaining: 7, recharge: 'long_rest' as const },
    ];
    const state = {
      ...base,
      characters: base.characters.map((character) => character.combatantId === caster.combatantId
        ? { ...character, spellSlots: casterSlots }
        : character.combatantId === target.combatantId
          ? { ...character, spellSlots: targetSlots }
          : character),
    };

    const untargetedCaster = prepareAid(state, caster.combatantId, [[target.combatantId]]);
    const resultingCaster = untargetedCaster.state.characters.find(
      (character) => character.combatantId === caster.combatantId,
    );
    const resultingTarget = untargetedCaster.state.characters.find(
      (character) => character.combatantId === target.combatantId,
    );
    expect([untargetedCaster.levelTwoSlotsBefore, untargetedCaster.levelTwoSlotsAfter]).toEqual([1, 0]);
    expect(resultingCaster).toMatchObject({
      currentHitPoints: caster.currentHitPoints,
      hitPointMaximum: caster.hitPointMaximum,
      aid: null,
      spellSlots: [
        { pool: 'pact_magic', level: 2, remaining: 3 },
        { pool: 'shared', level: 1, remaining: 4 },
        { pool: 'shared', level: 2, remaining: 0 },
      ],
    });
    expect(resultingTarget).toMatchObject({
      currentHitPoints: target.currentHitPoints + AID_HIT_POINT_BONUS,
      hitPointMaximum: target.hitPointMaximum + AID_HIT_POINT_BONUS,
      spellSlots: targetSlots,
      aid: { source: caster.combatantId, amount: AID_HIT_POINT_BONUS },
    });

    const preAidedState = {
      ...state,
      characters: state.characters.map((character) => character.combatantId === caster.combatantId
        ? {
            ...character,
            aid: { source: caster.combatantId, amount: AID_HIT_POINT_BONUS } as const,
          }
        : character),
    };
    const preAidedCaster = prepareAid(preAidedState, caster.combatantId, [[caster.combatantId]]);
    expect(preAidedCaster.state.characters.find(
      (character) => character.combatantId === caster.combatantId,
    )).toMatchObject({
      currentHitPoints: caster.currentHitPoints,
      hitPointMaximum: caster.hitPointMaximum,
      aid: { source: caster.combatantId, amount: AID_HIT_POINT_BONUS },
      spellSlots: [
        { pool: 'pact_magic', level: 2, remaining: 3 },
        { pool: 'shared', level: 1, remaining: 4 },
        { pool: 'shared', level: 2, remaining: 0 },
      ],
    });
  });

  it('selects only a Druid that actually carries Aid and requires exactly five members', () => {
    const druid = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === 'Druid') &&
      member.spells.some((spell) => spell.id === 'aid'));
    const firstOther = sample.party.members.find((member) => member.profile.id !== druid?.profile.id);
    const secondOther = sample.party.members.find((member) =>
      member.profile.id !== druid?.profile.id && member.profile.id !== firstOther?.profile.id);
    if (druid === undefined || firstOther === undefined || secondOther === undefined) {
      throw new Error('Aid-caster selection fixture is incomplete.');
    }
    const falseClass = {
      ...firstOther,
      spells: druid.spells,
    };
    const falseSpell = {
      ...secondOther,
      source: { ...secondOther.source, classes: druid.source.classes },
      spells: secondOther.spells.filter((spell) => spell.id !== 'aid'),
    };
    const multiclassDruid: LoadedPartyMember = {
      ...druid,
      source: {
        ...druid.source,
        classes: [...druid.source.classes, { classId: 'Fighter', level: 1 }],
      },
    };
    const members = [falseClass, falseSpell, multiclassDruid, ...sample.party.members.filter((member) =>
      member.profile.id !== druid.profile.id &&
      member.profile.id !== firstOther.profile.id &&
      member.profile.id !== secondOther.profile.id)];
    const prepared = createD365SurvivalPartySessionState(members);
    expect(prepared.caster).toBe(druid.profile.id);
    expect(prepared.castings.map((casting) => casting.targets.length)).toEqual([3, 2]);
    expect(() => createD365SurvivalPartySessionState(members.slice(0, 4))).toThrowError(
      'The D385 survival party must contain exactly five characters.',
    );
    expect(() => createD365SurvivalPartySessionState([...members, members[0]!])).toThrowError(
      'An adventuring-day party requires three to five characters.',
    );
    const withoutAid = members.map((member) => ({
      ...member,
      spells: member.spells.filter((spell) => spell.id !== 'aid'),
    }));
    expect(() => createD365SurvivalPartySessionState(withoutAid)).toThrowError(
      'The D385 survival party requires a Druid with prepared Aid.',
    );
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

  it('validates every thrift numeric boundary and preserves exact accepted endpoints', () => {
    for (const missingHitPoints of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
      expect(() => shouldSpendHitDie({
        missingHitPoints,
        sides: 8,
        constitutionModifier: 2,
      })).toThrowError('Hit-Die thrift requires a finite nonnegative Hit Point deficit.');
    }
    expect(shouldSpendHitDie({
      missingHitPoints: 6.5,
      sides: 8,
      constitutionModifier: 2,
    })).toBe(true);

    for (const slotLevel of [Number.NaN, 1.5, 0, 10]) {
      expect(() => averageCureWoundsHealing(slotLevel, 3)).toThrowError(
        'Cure Wounds slot level must be an integer from 1 through 9.',
      );
    }
    expect(averageCureWoundsHealing(1, 3)).toBe(12);
    expect(averageCureWoundsHealing(9, 3)).toBe(84);

    for (const input of [
      { missingHitPoints: Number.NaN, averageHealing: 1 },
      { missingHitPoints: Number.POSITIVE_INFINITY, averageHealing: 1 },
      { missingHitPoints: -1, averageHealing: 1 },
      { missingHitPoints: 1, averageHealing: Number.NaN },
      { missingHitPoints: 1, averageHealing: Number.POSITIVE_INFINITY },
      { missingHitPoints: 1, averageHealing: 0 },
    ]) {
      expect(() => shouldCastAverageHealing(input)).toThrowError(
        'Average-healing thrift requires a nonnegative deficit and positive healing.',
      );
    }
    expect(shouldCastAverageHealing({ missingHitPoints: 1, averageHealing: 1 })).toBe(true);
    expect(shouldCastAverageHealing({ missingHitPoints: 0, averageHealing: 1 })).toBe(false);
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

  it('finds Cure Wounds through prepared, mixed-known, and granted spell access', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const otherSpell = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id !== 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const caster = sample.party.members[0];
    const target = sample.party.members[1];
    if (cureWounds === undefined || otherSpell === undefined || sourceTemplate === undefined ||
        caster === undefined || target === undefined) {
      throw new Error('Cure Wounds access fixture is incomplete.');
    }
    const withAccess = (
      member: LoadedPartyMember,
      access: 'prepared' | 'known' | 'grant',
    ): LoadedPartyMember => ({
      ...member,
      spellcasting: [{
        ...sourceTemplate,
        spellcastingModifier: 3,
        preparedSpells: access === 'prepared' ? [cureWounds] : [],
        knownSpells: access === 'known' ? [otherSpell, cureWounds] : [],
        grants: access === 'grant' ? [{
          spell: cureWounds,
          ability: sourceTemplate.ability,
          spellSaveDc: sourceTemplate.spellSaveDc,
          spellAttackBonus: sourceTemplate.spellAttackBonus,
          spellcastingModifier: 3,
        }] : [],
      }],
    });

    for (const access of ['prepared', 'known', 'grant'] as const) {
      const members = sample.party.members.map((member) => member.profile.id === caster.profile.id
        ? withAccess(member, access)
        : { ...member, spellcasting: [] });
      const base = createPartySessionState(members);
      const state = {
        ...base,
        characters: base.characters.map((character) => ({
          ...character,
          currentHitPoints: character.combatantId === target.profile.id
            ? character.hitPointMaximum - 12
            : character.hitPointMaximum,
          spellSlots: character.combatantId === caster.profile.id
            ? [{ pool: 'shared' as const, level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' as const }]
            : [],
        })),
      };
      const result = castBetweenFightCureWounds(members, state, {
        clericBlessOpeningsReserved: 0,
        clericSpiritGuardiansSlotsReserved: 0,
      });
      expect(result.castings).toEqual([{
        caster: caster.profile.id,
        target: target.profile.id,
        slotLevel: 1,
        averageHealing: 12,
      }]);
    }

    const unrelatedGrantMembers = sample.party.members.map((member): LoadedPartyMember =>
      member.profile.id === caster.profile.id
        ? {
            ...member,
            spellcasting: [{
              ...sourceTemplate,
              spellcastingModifier: 3,
              preparedSpells: [],
              knownSpells: [],
              grants: [{
                spell: otherSpell,
                ability: sourceTemplate.ability,
                spellSaveDc: sourceTemplate.spellSaveDc,
                spellAttackBonus: sourceTemplate.spellAttackBonus,
                spellcastingModifier: 3,
              }],
            }],
          }
        : { ...member, spellcasting: [] });
    const unrelatedBase = createPartySessionState(unrelatedGrantMembers);
    const unrelatedState = {
      ...unrelatedBase,
      characters: unrelatedBase.characters.map((character) => ({
        ...character,
        currentHitPoints: character.combatantId === target.profile.id
          ? character.hitPointMaximum - 20
          : character.hitPointMaximum,
        spellSlots: character.combatantId === caster.profile.id
          ? [{ pool: 'shared' as const, level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' as const }]
          : [],
      })),
    };
    expect(castBetweenFightCureWounds(unrelatedGrantMembers, unrelatedState, {
      clericBlessOpeningsReserved: 0,
      clericSpiritGuardiansSlotsReserved: 0,
    }).castings).toEqual([]);
  });

  it('ignores absent, dead, and spell-less candidate casters', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const caster = sample.party.members[0];
    const target = sample.party.members[1];
    if (cureWounds === undefined || sourceTemplate === undefined || caster === undefined || target === undefined) {
      throw new Error('Unavailable caster fixture is incomplete.');
    }
    const members = sample.party.members.map((member): LoadedPartyMember => member.profile.id === caster.profile.id
      ? {
          ...member,
          spellcasting: [{
            ...sourceTemplate,
            spellcastingModifier: 3,
            preparedSpells: [cureWounds],
            knownSpells: [],
            grants: [],
          }],
        }
      : { ...member, spellcasting: [] });
    const base = createPartySessionState(members);
    const ready = {
      ...base,
      characters: base.characters.map((character) => ({
        ...character,
        currentHitPoints: character.combatantId === target.profile.id
          ? character.hitPointMaximum - 20
          : character.hitPointMaximum,
        spellSlots: character.combatantId === caster.profile.id
          ? [{ pool: 'shared' as const, level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' as const }]
          : [],
      })),
    };
    const policy = { clericBlessOpeningsReserved: 0, clericSpiritGuardiansSlotsReserved: 0 };
    expect(castBetweenFightCureWounds(
      members.map((member) => ({ ...member, spellcasting: [] })),
      ready,
      policy,
    ).castings).toEqual([]);
    expect(castBetweenFightCureWounds(
      members,
      { ...ready, characters: ready.characters.filter((character) => character.combatantId !== caster.profile.id) },
      policy,
    ).castings).toEqual([]);
    expect(castBetweenFightCureWounds(
      members,
      {
        ...ready,
        characters: ready.characters.map((character) => character.combatantId === caster.profile.id
          ? { ...character, life: 'dead' as const }
          : character),
      },
      policy,
    ).castings).toEqual([]);
  });

  it('validates both reserve inputs independently and accepts exact zero reserves', () => {
    const state = createPartySessionState(sample.party.members);
    for (const policy of [
      { clericBlessOpeningsReserved: Number.NaN, clericSpiritGuardiansSlotsReserved: 0 },
      { clericBlessOpeningsReserved: 1.5, clericSpiritGuardiansSlotsReserved: 0 },
      { clericBlessOpeningsReserved: -1, clericSpiritGuardiansSlotsReserved: 0 },
      { clericBlessOpeningsReserved: 0, clericSpiritGuardiansSlotsReserved: Number.NaN },
      { clericBlessOpeningsReserved: 0, clericSpiritGuardiansSlotsReserved: 1.5 },
      { clericBlessOpeningsReserved: 0, clericSpiritGuardiansSlotsReserved: -1 },
    ]) {
      expect(() => castBetweenFightCureWounds(sample.party.members, state, policy)).toThrowError(
        'Between-fight slot reserves must be nonnegative integers.',
      );
    }
    expect(castBetweenFightCureWounds(sample.party.members, state, {
      clericBlessOpeningsReserved: 0,
      clericSpiritGuardiansSlotsReserved: 0,
    }).castings).toEqual([]);
  });

  it('counts only shared slots and preserves the exact combined Cleric reserve boundary', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const cleric = sample.party.members.find((member) =>
      member.source.classes.some((entry) => entry.classId === 'Cleric'));
    const target = sample.party.members.find((member) => member.profile.id !== cleric?.profile.id);
    if (cureWounds === undefined || sourceTemplate === undefined || cleric === undefined || target === undefined) {
      throw new Error('Cleric reserve fixture is incomplete.');
    }
    const members = sample.party.members.map((member): LoadedPartyMember => member.profile.id === cleric.profile.id
      ? {
          ...member,
          source: {
            ...member.source,
            classes: [...member.source.classes, { classId: 'Druid', level: 1 }],
          },
          spellcasting: [{
            ...sourceTemplate,
            spellcastingModifier: 3,
            preparedSpells: [cureWounds],
            knownSpells: [],
            grants: [],
          }],
        }
      : { ...member, spellcasting: [] });
    const makeState = (spellSlots: readonly {
      readonly pool: 'shared' | 'pact_magic';
      readonly level: number;
      readonly maximum: number;
      readonly remaining: number;
      readonly recharge: 'long_rest' | 'short_rest';
    }[]) => {
      const base = createPartySessionState(members);
      return {
        ...base,
        characters: base.characters.map((character) => ({
          ...character,
          currentHitPoints: character.combatantId === target.profile.id
            ? character.hitPointMaximum - 12
            : character.hitPointMaximum,
          spellSlots: character.combatantId === cleric.profile.id ? spellSlots : [],
        })),
      };
    };
    const exact = castBetweenFightCureWounds(members, makeState([
      { pool: 'shared', level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' },
      { pool: 'shared', level: 2, maximum: 1, remaining: 1, recharge: 'long_rest' },
    ]), {
      clericBlessOpeningsReserved: 1,
      clericSpiritGuardiansSlotsReserved: 0,
    });
    expect(exact.castings).toEqual([expect.objectContaining({
      caster: cleric.profile.id,
      slotLevel: 1,
    })]);
    expect(castBetweenFightCureWounds(members, makeState([
      { pool: 'shared', level: 1, maximum: 2, remaining: 2, recharge: 'long_rest' },
    ]), {
      clericBlessOpeningsReserved: 1,
      clericSpiritGuardiansSlotsReserved: 1,
    }).castings).toEqual([]);
    expect(castBetweenFightCureWounds(members, makeState([
      { pool: 'shared', level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' },
      { pool: 'pact_magic', level: 1, maximum: 5, remaining: 5, recharge: 'short_rest' },
    ]), {
      clericBlessOpeningsReserved: 5,
      clericSpiritGuardiansSlotsReserved: 0,
    }).castings).toEqual([]);
  });

  it('selects a positive shared slot, then decrements only its exact pool and level', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const caster = sample.party.members.find((member) =>
      !member.source.classes.some((entry) => entry.classId === 'Cleric'));
    if (cureWounds === undefined || sourceTemplate === undefined || caster === undefined) {
      throw new Error('Shared-slot selection fixture is incomplete.');
    }
    const members = sample.party.members.map((member): LoadedPartyMember => member.profile.id === caster.profile.id
      ? {
          ...member,
          spellcasting: [{
            ...sourceTemplate,
            spellcastingModifier: 3,
            preparedSpells: [cureWounds], knownSpells: [], grants: [],
          }],
        }
      : { ...member, spellcasting: [] });
    const base = createPartySessionState(members);
    const state = {
      ...base,
      characters: base.characters.map((character) => ({
        ...character,
        currentHitPoints: character.combatantId === caster.profile.id
          ? character.hitPointMaximum - 21
          : character.hitPointMaximum,
        spellSlots: character.combatantId === caster.profile.id ? [
          { pool: 'shared' as const, level: 3, maximum: 2, remaining: 2, recharge: 'long_rest' as const },
          { pool: 'shared' as const, level: 1, maximum: 1, remaining: 0, recharge: 'long_rest' as const },
          { pool: 'pact_magic' as const, level: 1, maximum: 5, remaining: 5, recharge: 'short_rest' as const },
          { pool: 'pact_magic' as const, level: 2, maximum: 4, remaining: 4, recharge: 'short_rest' as const },
          { pool: 'shared' as const, level: 2, maximum: 1, remaining: 1, recharge: 'long_rest' as const },
        ] : [],
      })),
    };
    const result = castBetweenFightCureWounds(members, state, {
      clericBlessOpeningsReserved: 0,
      clericSpiritGuardiansSlotsReserved: 0,
    });
    expect(result.castings).toEqual([{
      caster: caster.profile.id,
      target: caster.profile.id,
      slotLevel: 2,
      averageHealing: 21,
    }]);
    expect(result.state.characters.find((character) => character.combatantId === caster.profile.id))
      .toMatchObject({
        currentHitPoints: state.characters.find(
          (character) => character.combatantId === caster.profile.id,
        )!.hitPointMaximum,
        spellSlots: [
          { pool: 'shared', level: 3, remaining: 2 },
          { pool: 'shared', level: 1, remaining: 0 },
          { pool: 'pact_magic', level: 1, remaining: 5 },
          { pool: 'pact_magic', level: 2, remaining: 4 },
          { pool: 'shared', level: 2, remaining: 0 },
        ],
      });
  });

  it('chooses the sufficient caster and the living target with the greatest real deficit', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const ordered = [...sample.party.members].sort((left, right) =>
      left.profile.id.localeCompare(right.profile.id));
    const highAverage = ordered[0];
    const sufficient = ordered[1];
    const greaterDeficit = ordered[2];
    const lesserDeficit = ordered[3];
    const dead = ordered[4];
    if (cureWounds === undefined || sourceTemplate === undefined || highAverage === undefined ||
        sufficient === undefined || greaterDeficit === undefined || lesserDeficit === undefined || dead === undefined) {
      throw new Error('Caster and target ranking fixture is incomplete.');
    }
    const members = sample.party.members.map((member): LoadedPartyMember => {
      const modifier = member.profile.id === highAverage.profile.id
        ? 20
        : member.profile.id === sufficient.profile.id ? 3 : null;
      return modifier === null
        ? { ...member, spellcasting: [] }
        : {
            ...member,
            spellcasting: [{
              ...sourceTemplate,
              spellcastingModifier: modifier,
              preparedSpells: [cureWounds], knownSpells: [], grants: [],
            }],
          };
    });
    const base = createPartySessionState(members);
    const state = {
      ...base,
      characters: base.characters.map((character) => ({
        ...character,
        life: character.combatantId === dead.profile.id ? 'dead' as const : character.life,
        currentHitPoints: character.combatantId === greaterDeficit.profile.id
          ? character.hitPointMaximum - 15
          : character.combatantId === lesserDeficit.profile.id
            ? character.hitPointMaximum - 13
            : character.combatantId === dead.profile.id
              ? character.hitPointMaximum - 30
              : character.hitPointMaximum,
        spellSlots: character.combatantId === highAverage.profile.id ||
          character.combatantId === sufficient.profile.id
          ? [{ pool: 'shared' as const, level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' as const }]
          : [],
      })),
    };
    const result = castBetweenFightCureWounds(members, state, {
      clericBlessOpeningsReserved: 0,
      clericSpiritGuardiansSlotsReserved: 0,
    });
    const greaterBefore = state.characters.find(
      (character) => character.combatantId === greaterDeficit.profile.id,
    );
    const lesserBefore = state.characters.find(
      (character) => character.combatantId === lesserDeficit.profile.id,
    );
    const deadBefore = state.characters.find(
      (character) => character.combatantId === dead.profile.id,
    );
    if (greaterBefore === undefined || lesserBefore === undefined || deadBefore === undefined) {
      throw new Error('Caster and target ranking state lost a target.');
    }
    expect(result.castings).toEqual([{
      caster: sufficient.profile.id,
      target: greaterDeficit.profile.id,
      slotLevel: 1,
      averageHealing: 12,
    }]);
    expect(result.state.characters.find(
      (character) => character.combatantId === greaterDeficit.profile.id,
    )?.currentHitPoints).toBe(greaterBefore.hitPointMaximum - 3);
    expect(result.state.characters.find(
      (character) => character.combatantId === lesserDeficit.profile.id,
    )?.currentHitPoints).toBe(lesserBefore.hitPointMaximum - 13);
    expect(result.state.characters.find(
      (character) => character.combatantId === dead.profile.id,
    )?.currentHitPoints).toBe(deadBefore.hitPointMaximum - 30);
  });

  it('breaks equal slot and target deficits by combatant identity', () => {
    const cureWounds = sample.party.members.flatMap((member) => member.spells)
      .find((spell) => spell.id === 'cure-wounds');
    const sourceTemplate = sample.party.members.flatMap((member) => member.spellcasting)[0];
    const ordered = [...sample.party.members].sort((left, right) =>
      left.profile.id.localeCompare(right.profile.id));
    const firstCaster = ordered[0];
    const secondCaster = ordered[1];
    const firstTarget = ordered[2];
    const secondTarget = ordered[3];
    if (cureWounds === undefined || sourceTemplate === undefined || firstCaster === undefined ||
        secondCaster === undefined || firstTarget === undefined || secondTarget === undefined) {
      throw new Error('Identity tie-break fixture is incomplete.');
    }
    const reversedMembers = [...sample.party.members].reverse().map((member): LoadedPartyMember =>
      member.profile.id === firstCaster.profile.id || member.profile.id === secondCaster.profile.id
        ? {
            ...member,
            spellcasting: [{
              ...sourceTemplate,
              spellcastingModifier: 3,
              preparedSpells: [cureWounds], knownSpells: [], grants: [],
            }],
          }
        : { ...member, spellcasting: [] });
    const base = createPartySessionState(reversedMembers);
    const state = {
      ...base,
      characters: base.characters.map((character) => ({
        ...character,
        currentHitPoints: character.combatantId === firstTarget.profile.id ||
          character.combatantId === secondTarget.profile.id
          ? character.hitPointMaximum - 12
          : character.hitPointMaximum,
        spellSlots: character.combatantId === firstCaster.profile.id ||
          character.combatantId === secondCaster.profile.id
          ? [{ pool: 'shared' as const, level: 1, maximum: 1, remaining: 1, recharge: 'long_rest' as const }]
          : [],
      })),
    };
    const result = castBetweenFightCureWounds(reversedMembers, state, {
      clericBlessOpeningsReserved: 0,
      clericSpiritGuardiansSlotsReserved: 0,
    });
    expect(result.castings[0]).toEqual({
      caster: firstCaster.profile.id,
      target: firstTarget.profile.id,
      slotLevel: 1,
      averageHealing: 12,
    });
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
    expect({ successes: measurement.successes, total: measurement.total }).toEqual({ successes: 29, total: 30 });
    expect(measurement.fraction).toBeGreaterThanOrEqual(2 / 3);
  }, 600_000);

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
