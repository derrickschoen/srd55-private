import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import type { CombatantId } from '../../../src/combat/values';
import { rpcRegistry } from '../../../src/worker/registry';
import { D365_SAMPLE_DUNGEON, composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import {
  loadD365SampleParty,
  type D365SamplePartyLoad,
} from '../../../src/vtt/d365-sample-party';
import { createPartySessionState } from '../../../src/vtt/party-session-state';
import {
  createD365SurvivalPartySessionState,
  equipD365HealingPotions,
  HEALING_POTION_DRINK_THRESHOLD,
  prepareAid,
  shouldDrinkHealingPotion,
} from '../../../src/vtt/survival-policy';
import {
  measureSurvivalFraction,
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

  it('aid_stacks: two level-2 castings cover all four PCs for 8 hours without stacking an overlapping target', () => {
    const base = equipD365HealingPotions(createPartySessionState(sample.party.members));
    const caster = base.characters.find((character) =>
      sample.party.members.find((member) => member.profile.id === character.combatantId)
        ?.source.classes.some((heldClass) => heldClass.classId === 'Cleric'))?.combatantId;
    if (caster === undefined) throw new Error('Survival party has no Cleric.');
    const targets = base.characters.map((character) => character.combatantId);
    const prepared = prepareAid(base, caster, [targets.slice(0, 3), [targets[0] as CombatantId, targets[3] as CombatantId]]);
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
    expect(aid?.targets).toHaveLength(4);
  });

  it('detune_ratio_stale: every D365 recorded ratio equals its final live composition divided by four PCs', () => {
    expect(D365_SAMPLE_DUNGEON.rooms.map((room) => ({
      room: room.room,
      derived: room.monsters.length / 4,
      recorded: room.recordedActionEconomyRatio,
    }))).toEqual([
      { room: 1, derived: 1, recorded: 1 },
      { room: 2, derived: 0.5, recorded: 0.5 },
      { room: 3, derived: 0.75, recorded: 0.75 },
      { room: 4, derived: 0.25, recorded: 0.25 },
    ]);
  });

  it('Bless opens the fight on exactly three targets and ends when Sera ends concentration', () => {
    const prepared = createD365SurvivalPartySessionState(sample.party.members);
    const composed = composeD365Room(
      sample.party.members,
      sample.displayNames,
      prepared.state,
      { useHealingPotions: true, openWithBless: true, reserveClericSlotsForBless: true },
    );
    const sera = prepared.caster;
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
    expect({ successes: measurement.successes, total: measurement.total }).toEqual({ successes: 22, total: 30 });
    expect(measurement.fraction).toBeGreaterThanOrEqual(2 / 3);
  }, 120_000);

  it('pins every applied-and-restored survival mutation to its named killing test', () => {
    const ledger = readFileSync('docs/audits/2026-08-25-survival-mutation-ledger.md', 'utf8');
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
  });
});
