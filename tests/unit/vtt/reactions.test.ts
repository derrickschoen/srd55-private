import { describe, expect, it } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
  type ReactionDecisionHook,
  type ReactionTriggerEvent,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import {
  damageType,
  dieSides,
  effectStackingIdentity,
  type CombatantId,
} from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { placedToken, playerProfile } from '../combat/fixtures';

const BASE_PACK = 'tests/fixtures/content-pack-v1-homebrew.json';
const { readText: readFileSync } = declareTestInputs({
  fixtures: [BASE_PACK],
}).fixtures;

function dice(count: number, sides: 4 | 6 | 8 | 10 | 12 | 20, perSlotCount = 0) {
  return {
    baseCount: count, sides, modifier: 0, perSlotCount, perSlotModifier: 0,
    cantripUpgrade: false,
  };
}

function reactionPackInput(): unknown {
  const source = JSON.parse(readFileSync(BASE_PACK, 'utf8')) as {
    spells: unknown[];
    features: unknown[];
    species: unknown[];
    backgrounds: unknown[];
    subclasses: unknown[];
    monsters: unknown[];
  };
  source.features = [];
  source.species = [];
  source.backgrounds = [];
  source.subclasses = [];
  source.monsters = [];
  source.spells = [
    {
      sourceId: 'greenforge', recordId: 'reactive-shield', name: 'Reactive Shield', level: 1,
      school: { kind: 'known', name: 'Abjuration' }, castingTime: 'reaction',
      range: { kind: 'self' }, components: { verbal: true, somatic: true, material: null },
      duration: { kind: 'rounds', rounds: 1 }, concentration: false,
      targeting: { kind: 'self' },
      operation: {
        kind: 'reaction', trigger: { kind: 'hit_by_attack' },
        response: {
          kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 5 },
          duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'source_start' },
        },
      },
    },
    {
      sourceId: 'greenforge', recordId: 'ember-rebuke', name: 'Ember Rebuke', level: 1,
      school: { kind: 'known', name: 'Evocation' }, castingTime: 'reaction',
      range: { kind: 'feet', feet: 60 }, components: { verbal: true, somatic: true, material: null },
      duration: { kind: 'instantaneous' }, concentration: false,
      targeting: { kind: 'single', rangeFeet: 60, willing: false },
      operation: {
        kind: 'reaction',
        trigger: { kind: 'damaged_by_creature', rangeFeet: 60, requiresSight: true },
        response: {
          kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: 'Fire',
          dice: dice(2, 10, 1), riderOnFailure: null, pushFeetOnFailure: 0,
        },
      },
    },
    {
      sourceId: 'greenforge', recordId: 'fire-absorption', name: 'Fire Absorption', level: 1,
      school: { kind: 'known', name: 'Abjuration' }, castingTime: 'reaction',
      range: { kind: 'self' }, components: { verbal: false, somatic: true, material: null },
      duration: { kind: 'rounds', rounds: 1 }, concentration: false,
      targeting: { kind: 'self' },
      operation: {
        kind: 'reaction', trigger: { kind: 'taking_damage_of_type', damageTypes: ['Fire'] },
        response: {
          kind: 'damage_response_modifier', damageType: 'Fire', response: 'resistant',
          duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'source_start' },
        },
      },
    },
    {
      sourceId: 'greenforge', recordId: 'spell-interruption', name: 'Spell Interruption', level: 3,
      school: { kind: 'known', name: 'Abjuration' }, castingTime: 'reaction',
      range: { kind: 'feet', feet: 60 }, components: { verbal: false, somatic: true, material: null },
      duration: { kind: 'instantaneous' }, concentration: false,
      targeting: { kind: 'single', rangeFeet: 60, willing: false },
      operation: {
        kind: 'reaction', trigger: {
          kind: 'creature_casts_spell', rangeFeet: 60, requiresSight: true,
          components: 'verbal_somatic_or_material',
        },
        response: { kind: 'reaction_save_cancel', ability: 'constitution' },
      },
    },
    {
      sourceId: 'greenforge', recordId: 'triggering-spark', name: 'Triggering Spark', level: 1,
      school: { kind: 'known', name: 'Evocation' }, castingTime: 'action',
      range: { kind: 'feet', feet: 30 }, components: { verbal: true, somatic: true, material: null },
      duration: { kind: 'instantaneous' }, concentration: false,
      targeting: { kind: 'single', rangeFeet: 30, willing: false },
      operation: {
        kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
        packets: [{
          damageType: { kind: 'fixed', damageType: 'Force' }, dice: dice(1, 4),
          scaling: { kind: 'none' }, thresholdRider: null,
        }],
        timing: { kind: 'immediate' },
      },
    },
  ];
  return source;
}

function reactionPack(): LoadedContentPack {
  const result = loadContentPack(reactionPackInput());
  if (result.status !== 'loaded') throw new Error(`Reaction pack refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

function combatants(options: { readonly defenderInitiative?: number; readonly attacksPerAction?: number } = {}) {
  const attacker = playerProfile('reaction-attacker', {
    hitPoints: 50, initiativeBonus: 20,
    ...(options.attacksPerAction === undefined ? {} : { attacksPerAction: options.attacksPerAction }),
    spellSlots: [{ level: 1, maximum: 3 }],
  });
  const defender = playerProfile('reaction-defender', {
    hitPoints: 50, initiativeBonus: options.defenderInitiative ?? -20,
    spellSlots: [{ level: 1, maximum: 4 }, { level: 3, maximum: 2 }],
  });
  return { attacker, defender };
}

function encounter(attacker: CombatantProfile, defender: CombatantProfile): EncounterState {
  const initial = createEncounter({
    bounds: { columns: 8, rows: 2 }, combatants: [attacker, defender],
    tokens: [placedToken(attacker, 0), placedToken(defender, 1)], contentPacks: [reactionPack()],
  });
  return reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state;
}

function targetsFor(event: ReactionTriggerEvent): readonly CombatantId[] {
  switch (event.kind) {
    case 'hit_by_attack': return [event.target];
    case 'damaged_by_creature': return [event.source];
    case 'taking_damage_of_type': return [event.target];
    case 'creature_casts_spell': return [event.caster];
  }
}

function chooseReaction(
  reactor: CombatantId,
  spellId: string,
  slotLevel: 1 | 3,
): ReactionDecisionHook {
  return ({ event, offers }) => {
    if (!offers.some((offer) => offer.reactor === reactor && offer.spellId === spellId)) return null;
    return {
      type: 'cast_spell', actor: reactor, spellId, slotLevel, castAsRitual: false,
      casterLevel: 7, attackBonus: 7, saveDc: 15, spellcastingModifier: 4,
      targets: targetsFor(event), area: null, weaponAttack: null, selectedOption: null,
      ...(event.kind === 'hit_by_attack' ? { modifierSource: event.attacker } : {}),
    };
  };
}

function attack(
  actor: CombatantId,
  target: CombatantId,
  attackBonus: number,
  type: 'Fire' | 'Cold' = 'Fire',
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack', actor, target, attackBonus, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: damageType(type), dice: { count: 0, sides: dieSides(6), modifier: 10 } }],
      critical: false, responses: [],
    },
  };
}

function incapacitate(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'apply_effect' }> {
  return {
    type: 'apply_effect',
    actor,
    cost: 'none',
    effect: {
      targets: [target],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('condition:incapacitated'),
      stacking: 'replace_any_source',
      repeatedSave: null,
      payload: { kind: 'condition', condition: 'Incapacitated' },
    },
  };
}

function hitPoints(state: EncounterState, id: CombatantId): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Missing combatant ${id}.`);
  return subject.hitPoints;
}

describe('D348.1 imported event-interception reactions', () => {
  it('imports exactly the four established trigger shapes and refuses an invented trigger kind', () => {
    const content = reactionPack();
    expect(content.spells.slice(0, 4).map((spell) => spell.definition.operation)).toMatchObject([
      { kind: 'reaction', trigger: { kind: 'hit_by_attack' } },
      { kind: 'reaction', trigger: { kind: 'damaged_by_creature' } },
      { kind: 'reaction', trigger: { kind: 'taking_damage_of_type' } },
      { kind: 'reaction', trigger: { kind: 'creature_casts_spell' } },
    ]);
    const malformed = reactionPackInput() as { spells: Array<{ operation: { trigger?: { kind: string } } }> };
    const trigger = malformed.spells[0]?.operation.trigger;
    if (trigger === undefined) throw new Error('Reaction trigger fixture missing.');
    trigger.kind = 'turns_back_time';
    const result = loadContentPack(malformed);
    if (result.status !== 'loaded') throw new Error('One malformed record should not reject the pack.');
    expect(result.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', recordId: 'reactive-shield',
      path: ['spells', 0, 'operation', 'trigger', 'kind'],
    }));

    const unsupportedDamage = reactionPackInput() as {
      spells: Array<{ operation: { trigger?: { damageTypes?: string[] } } }>;
    };
    const damageTypes = unsupportedDamage.spells[2]?.operation.trigger?.damageTypes;
    if (damageTypes === undefined) throw new Error('Damage reaction fixture missing.');
    damageTypes[0] = 'Poison';
    const damageResult = loadContentPack(unsupportedDamage);
    if (damageResult.status !== 'loaded') throw new Error('One malformed record should not reject the pack.');
    expect(damageResult.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', recordId: 'fire-absorption',
      path: ['spells', 2, 'operation', 'trigger', 'damageTypes', 0],
    }));
  });

  it('shield_not_retroactive and shield_boundary_exact_tie_hits_one_above_misses: retroactive AC includes the triggering attack', () => {
    const outcomes = [
      { attackBonus: 8, expectedHitPoints: 40, outcome: 'hit' }, // 11 + 8 ties AC 19.
      { attackBonus: 7, expectedHitPoints: 50, outcome: 'miss' }, // AC 19 exceeds total 18.
    ] as const;
    for (const boundary of outcomes) {
      const { attacker, defender } = combatants();
      const result = reduceEncounter(
        encounter(attacker, defender), attack(attacker.id, defender.id, boundary.attackBonus),
        () => 0.5,
        { reactionDecision: chooseReaction(defender.id, 'greenforge:reactive-shield', 1) },
      );
      expect(hitPoints(result.state, defender.id), boundary.outcome).toBe(boundary.expectedHitPoints);
      expect(result.events).toContainEqual(expect.objectContaining({
        type: 'reaction_resolved', combatant: defender.id, spellId: 'greenforge:reactive-shield',
      }));
      expect(result.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
        attack: { outcome: boundary.outcome },
      });
    }
  });

  it('Hellish-Rebuke shape resolves only after triggering damage', () => {
    const { attacker, defender } = combatants();
    const result = reduceEncounter(
      encounter(attacker, defender), attack(attacker.id, defender.id, 100), () => 0.5,
      { reactionDecision: chooseReaction(defender.id, 'greenforge:ember-rebuke', 1) },
    );
    const damageEvents = result.events.filter((event) => event.type === 'damage_applied');
    expect(damageEvents.map((event) => event.target)).toEqual([defender.id, attacker.id]);
    expect(hitPoints(result.state, defender.id)).toBe(40);
    expect(hitPoints(result.state, attacker.id)).toBeLessThan(50);
  });

  it('trigger_kind_ignored and trigger_kind_discrimination: a Fire damage declaration does not fire on Cold', () => {
    for (const [type, expectedHitPoints, expectedOffers] of [
      ['Fire', 45, 1],
      ['Cold', 40, 0],
    ] as const) {
      const { attacker, defender } = combatants();
      const result = reduceEncounter(
        encounter(attacker, defender), attack(attacker.id, defender.id, 100, type), () => 0.5,
        { reactionDecision: chooseReaction(defender.id, 'greenforge:fire-absorption', 1) },
      );
      expect(hitPoints(result.state, defender.id), type).toBe(expectedHitPoints);
      expect(result.events.filter((event) =>
        event.type === 'reaction_offered' && event.spellId === 'greenforge:fire-absorption'), type)
        .toHaveLength(expectedOffers);
    }
  });

  it('Counterspell intercepts the cast before its effect and preserves the triggering slot on a failed Constitution save', () => {
    const { attacker: caster, defender: reactor } = combatants();
    const state = encounter(caster, reactor);
    const command: SpellCastCommand = {
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:triggering-spark',
      slotLevel: 1, castAsRitual: false, casterLevel: 7, attackBonus: 7,
      saveDc: 15, spellcastingModifier: 4, targets: [reactor.id], area: null,
      weaponAttack: null, selectedOption: null,
    };
    const result = reduceEncounter(state, command, () => 0, {
      reactionDecision: chooseReaction(reactor.id, 'greenforge:spell-interruption', 3),
    });
    expect(hitPoints(result.state, reactor.id)).toBe(50);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast_intercepted', caster: caster.id, reactor: reactor.id,
    }));
    expect(result.state.combatants.find((subject) => subject.profile.id === caster.id)
      ?.spellSlots.find((slot) => slot.level === 1)?.remaining).toBe(3);
    expect(result.state.combatants.find((subject) => subject.profile.id === reactor.id)
      ?.spellSlots.find((slot) => slot.level === 3)?.remaining).toBe(1);
  });

  it('second_reaction_same_round: the unified pool refuses the second response and restores at turn start', () => {
    const { attacker, defender } = combatants({ attacksPerAction: 2 });
    let state = encounter(attacker, defender);
    const hook = chooseReaction(defender.id, 'greenforge:reactive-shield', 1);
    const first = reduceEncounter(state, attack(attacker.id, defender.id, 100), () => 0.5, { reactionDecision: hook });
    state = first.state;
    const second = reduceEncounter(state, attack(attacker.id, defender.id, 100), () => 0.5, { reactionDecision: hook });
    expect(second.events).toContainEqual(expect.objectContaining({
      type: 'reaction_refused', combatant: defender.id,
      spellId: 'greenforge:reactive-shield', reason: 'reaction_spent',
    }));
    expect(second.state.combatants.find((subject) => subject.profile.id === defender.id)?.turn.reactionAvailable).toBe(false);
    const restored = reduceEncounter(second.state, { type: 'end_turn', actor: attacker.id }, () => 0.5).state;
    expect(restored.activeCombatant).toBe(defender.id);
    expect(restored.combatants.find((subject) => subject.profile.id === defender.id)?.turn.reactionAvailable).toBe(true);
  });

  it('incapacitated_turn_start_reaction_unavailable: starting a turn Incapacitated does not restore a Reaction', () => {
    // SRD 5.2.1 Rules Glossary, Incapacitated: "You can't take any action, Bonus Action, or Reaction."
    const { attacker, defender } = combatants();
    let state = encounter(attacker, defender);
    state = reduceEncounter(state, incapacitate(attacker.id, defender.id), () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: attacker.id }, () => 0.5).state;

    expect(state.activeCombatant).toBe(defender.id);
    expect(state.combatants.find((subject) => subject.profile.id === defender.id)
      ?.turn.reactionAvailable).toBe(false);

    state = reduceEncounter(state, { type: 'end_turn', actor: defender.id }, () => 0.5).state;
    const triggered = reduceEncounter(
      state,
      attack(attacker.id, defender.id, 100),
      () => 0.5,
      { reactionDecision: chooseReaction(defender.id, 'greenforge:reactive-shield', 1) },
    );
    expect(triggered.events).toContainEqual(expect.objectContaining({
      type: 'reaction_refused', combatant: defender.id,
      spellId: 'greenforge:reactive-shield', reason: 'incapacitated',
    }));
  });

  it('mid_round_incapacitated_pack_reaction_refused: a newly Incapacitated combatant gets the typed trigger refusal', () => {
    // Trigger-time authority is independent of the cached Reaction resource.
    const { attacker, defender } = combatants({ defenderInitiative: 30 });
    let state = encounter(attacker, defender);
    expect(state.activeCombatant).toBe(defender.id);
    expect(state.combatants.find((subject) => subject.profile.id === defender.id)
      ?.turn.reactionAvailable).toBe(true);

    state = reduceEncounter(state, incapacitate(defender.id, defender.id), () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: defender.id }, () => 0.5).state;
    const triggered = reduceEncounter(
      state,
      attack(attacker.id, defender.id, 100),
      () => 0.5,
      { reactionDecision: chooseReaction(defender.id, 'greenforge:reactive-shield', 1) },
    );

    expect(triggered.events).toContainEqual(expect.objectContaining({
      type: 'reaction_offered', combatant: defender.id,
      spellId: 'greenforge:reactive-shield', availability: 'incapacitated',
    }));
    expect(triggered.events).toContainEqual(expect.objectContaining({
      type: 'reaction_refused', combatant: defender.id,
      spellId: 'greenforge:reactive-shield', reason: 'incapacitated',
    }));
    expect(triggered.events).not.toContainEqual(expect.objectContaining({
      type: 'reaction_resolved', combatant: defender.id,
      spellId: 'greenforge:reactive-shield',
    }));
  });

  it('opportunity_attack_separate_pool and opportunity_attack_shared_pool: an OA blocks a later pack reaction in the same round', () => {
    const { attacker: mover, defender: reactor } = combatants({ attacksPerAction: 2 });
    let state = encounter(mover, reactor);
    state = reduceEncounter(state, {
      type: 'opportunity_attack', actor: reactor.id, target: mover.id,
      attackBonus: 100, criticalFloor: 20, rollMode: 'normal',
      attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      damage: {
        terms: [{ type: damageType('Bludgeoning'), dice: { count: 0, sides: dieSides(6), modifier: 1 } }],
        critical: false, responses: [],
      },
    }, () => 0.5).state;
    const later = reduceEncounter(
      state, attack(mover.id, reactor.id, 100), () => 0.5,
      { reactionDecision: chooseReaction(reactor.id, 'greenforge:ember-rebuke', 1) },
    );
    expect(later.events).toContainEqual(expect.objectContaining({
      type: 'reaction_refused', combatant: reactor.id,
      spellId: 'greenforge:ember-rebuke', reason: 'reaction_spent',
    }));
    expect(hitPoints(later.state, mover.id)).toBe(49);
  });
});
