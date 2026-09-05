import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { monsterSpellResourcePoolId } from '../../../src/combat/statblock';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import { engineSchemaInternals } from '../../../src/vtt/mcp/schemas';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { projectHumanEngineOptions } from '../../../src/vtt/encounter-board-projection';
import { renderHumanEngineOptionCatalog } from '../../../src/vtt/encounter-app';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import type { EngineActivationChoice } from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { installInteractiveDocument, interactiveElement } from '../../fixtures/interactive-dom';

type OutsideCommandWordIsAccepted = {
  readonly kind: 'command_word';
  readonly value: 'dance';
} extends EngineActivationChoice ? true : false;
const OUTSIDE_COMMAND_WORD_IS_ACCEPTED: OutsideCommandWordIsAccepted = false;

function started(
  combatants: readonly CombatantProfile[],
  columns: readonly number[],
): EncounterState {
  const state = createEncounter({
    bounds: { columns: 30, rows: 12 }, combatants,
    tokens: combatants.map((profile, index) => placedToken(profile, columns[index] ?? 0, 2)),
  });
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
}

function spellCommand(
  caster: CombatantProfile,
  spellId: string,
  slotLevel: number,
  area: SpellCastCommand['area'],
  overrides: Partial<Pick<SpellCastCommand, 'targets' | 'selectedOption' | 'calmEmotionsModes'>> = {},
): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId, slotLevel, castAsRitual: false,
    casterLevel: 5, attackBonus: 7, saveDc: 12, spellcastingModifier: 4,
    targets: overrides.targets ?? [], area, weaponAttack: null,
    selectedOption: overrides.selectedOption ?? null,
    ...(overrides.calmEmotionsModes === undefined ? {} : { calmEmotionsModes: overrides.calmEmotionsModes }),
  };
}

function square20(): NonNullable<SpellCastCommand['area']> {
  return {
    shape: 'cube',
    template: {
      origin: feetPoint(5, 10), center: feetPoint(15, 20), axis: { x: 1, y: 0 },
      size: feet(20), includeOrigin: false,
    },
  };
}

function sphere20(): NonNullable<SpellCastCommand['area']> {
  return { shape: 'sphere', template: { origin: feetPoint(15, 10), radius: feet(20) } };
}

function attack(actor: CombatantProfile, target: CombatantProfile): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack', actor: actor.id, target: target.id, attackBonus: 100, criticalFloor: 20,
    rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: damageType('Bludgeoning'), dice: { count: 0, sides: dieSides(6), modifier: 1 } }],
      critical: false, responses: [],
    },
  };
}

describe('D466 B4 spell payloads', () => {
  it('sphere_radius_15_or_25: Calm Emotions remains a 20-foot-radius sphere', () => {
    expect(spellDefinition('calm-emotions')).toMatchObject({
      targeting: { kind: 'area', shape: 'sphere', baseSizeFeet: 20 },
      operation: { kind: 'save_effect', effect: { concentration: true, durationRounds: 10 } },
    });
  });

  it('humanoid_filter_dropped: Calm Emotions applies per-target modes only to Humanoids', () => {
    const caster = playerProfile('calm-caster', { initiativeBonus: 30, spellSlots: [{ level: 2, maximum: 1 }] });
    const humanoidBase = monsterProfile('calm-humanoid', { initiativeBonus: -10 });
    const beastBase = monsterProfile('calm-beast', { initiativeBonus: -20 });
    const humanoid = { ...humanoidBase, rules: { ...humanoidBase.rules, creatureType: 'Humanoid' } };
    const beast = { ...beastBase, rules: { ...beastBase.rules, creatureType: 'Beast' } };
    let state = started([caster, humanoid, beast], [0, 2, 3]);
    state = reduceEncounter(state, spellCommand(caster, 'calm-emotions', 2, sphere20(), {
      calmEmotionsModes: [{ target: humanoid.id, mode: 'suppress_charmed_frightened' }],
    }), () => 0).state;
    expect(state.effects.some((effect) => effect.targets.includes(humanoid.id) &&
      effect.payload.kind === 'condition_suppression')).toBe(true);
    expect(state.effects.some((effect) => effect.targets.includes(beast.id) &&
      effect.payload.kind === 'condition_suppression')).toBe(false);
  });

  it('indifference_not_ending_on_hostility: a monster-side target attack ends Calm Emotions indifference', () => {
    const caster = playerProfile('indifference-caster', { initiativeBonus: 30, spellSlots: [{ level: 2, maximum: 1 }] });
    const attacker = playerProfile('indifference-attacker', { initiativeBonus: 20 });
    const targetBase = monsterProfile('indifference-target', { initiativeBonus: -10 });
    const target = { ...targetBase, rules: { ...targetBase.rules, creatureType: 'Humanoid' } };
    let state = started([caster, attacker, target], [0, 1, 2]);
    state = reduceEncounter(state, spellCommand(caster, 'calm-emotions', 2, sphere20(), {
      calmEmotionsModes: [{ target: target.id, mode: 'indifferent_toward_monster_side' }],
    }), () => 0).state;
    expect(state.effects.some((effect) => effect.payload.kind === 'indifferent_toward_monster_side')).toBe(true);
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    state = reduceEncounter(state, attack(attacker, target), () => 0.5).state;
    expect(state.effects.some((effect) => effect.payload.kind === 'indifferent_toward_monster_side')).toBe(false);
  });

  it('entangle_terrain_persists_after_concentration: ending concentration removes terrain and restraint', () => {
    const caster = playerProfile('entangle-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('entangle-target', { initiativeBonus: -20 });
    let state = started([caster, target], [0, 3]);
    state = reduceEncounter(state, spellCommand(caster, 'entangle', 1, square20()), () => 0).state;
    expect(state.persistentAreas).toHaveLength(1);
    expect(state.persistentAreas[0]).toMatchObject({ difficultTerrain: true, shape: { kind: 'cube', size: 20 } });
    expect(combatantConditions(state, target.id).map((condition) => condition.name)).toContain('Restrained');
    expect(state.effects.find((effect) => effect.targets.includes(target.id) &&
      effect.payload.kind === 'condition' && effect.payload.condition === 'Restrained')?.escapeCheck)
      .toEqual({ ability: 'strength', skill: 'athletics', dc: 12, cost: 'action' });
    state = reduceEncounter(state, { type: 'end_concentration', actor: caster.id }, () => 0.5).state;
    expect(state.persistentAreas).toHaveLength(0);
    expect(combatantConditions(state, target.id).map((condition) => condition.name)).not.toContain('Restrained');
  });

  it('escape_check_uses_acrobatics: Entangle declares an action-cost Strength (Athletics) escape', () => {
    const definition = spellDefinition('entangle');
    if (definition?.operation.kind !== 'persistent_area') throw new Error('Entangle persistent area is absent.');
    expect(definition.operation.initialEffects[0]).toMatchObject({
      effect: { payload: { escapeCheck: { ability: 'strength', skill: 'athletics', cost: 'action' } } },
    });
  });

  it('choice_slot_accepts_outside_union: compile-time and proposal schema reject values outside the union', () => {
    expect(OUTSIDE_COMMAND_WORD_IS_ACCEPTED).toBe(false);
    expect(engineSchemaInternals.turnProposal.safeParse({
      actor_id: 'combatant:marshal', expected_revision: 1,
      primary_option_id: 'option:command', fallback_option_id: null,
      reason: 'Exercise the invalid command-word choice.', override_justification: null,
      activation_choice: { kind: 'command_word', value: 'dance' },
    }).success).toBe(false);
  });

  it('unicorn_blessing_separate_pools: both choices decrement the same three-use pool', () => {
    const unicornBase = monsterCombatantProfile(UNICORN, {
      combatantId: 'combatant:b4-unicorn', tokenId: 'token:b4-unicorn',
    });
    const unicorn = { ...unicornBase, rules: { ...unicornBase.rules, initiativeBonus: 100 } };
    const ally = playerProfile('b4-ally', { initiativeBonus: -100 });
    let state = freshMonsterPlanningState(started([unicorn, ally], [0, 2]));
    const bonus = UNICORN.sourceDetails.bonusActions.kind === 'present'
      ? UNICORN.sourceDetails.bonusActions.value.find((entry) => entry.kind === 'spell_choice') : undefined;
    if (bonus?.kind !== 'spell_choice') throw new Error('Unicorn blessing declaration is absent.');
    const cure = bonus.spells.find((spell) => spell.id === 'cure-wounds');
    const restoration = bonus.spells.find((spell) => spell.id === 'lesser-restoration');
    if (cure === undefined || restoration === undefined) throw new Error('Unicorn blessing choices are absent.');
    const curePool = monsterSpellResourcePoolId(bonus.id, cure);
    const restorationPool = monsterSpellResourcePoolId(bonus.id, restoration);
    expect(curePool).toBe(restorationPool);
    if (curePool === null) throw new Error('Unicorn blessing pool is absent.');
    const castChoice = (spellId: 'cure-wounds' | 'lesser-restoration', level: 1 | 2): SpellCastCommand => ({
      ...spellCommand(unicorn, spellId, level, null, {
        targets: [unicorn.id], selectedOption: spellId === 'lesser-restoration' ? 'Poisoned' : null,
      }),
      resourcePoolId: curePool, monsterActionId: bonus.id,
    });
    state = reduceEncounter(state, castChoice('cure-wounds', 1), () => 0.5).state;
    expect(state.combatants.find((entry) => entry.profile.id === unicorn.id)?.limitedResources
      ?.find((pool) => pool.id === curePool)?.remaining).toBe(2);
    state = {
      ...state,
      combatants: state.combatants.map((entry) => entry.profile.id === unicorn.id
        ? { ...entry, turn: { ...entry.turn, bonusActionAvailable: true } }
        : entry),
    };
    state = reduceEncounter(state, castChoice('lesser-restoration', 2), () => 0.5).state;
    expect(state.combatants.find((entry) => entry.profile.id === unicorn.id)?.limitedResources
      ?.find((pool) => pool.id === curePool)?.remaining).toBe(1);
  });

  it('command_word_open_set: one offered option carries the exact five-word closed slot', () => {
    expect(spellDefinition('command')).toMatchObject({
      operation: { effect: { payload: { options: ['approach', 'drop', 'flee', 'grovel', 'halt'] } } },
    });
    const unicorn = monsterCombatantProfile(UNICORN, {
      combatantId: 'combatant:option-unicorn', tokenId: 'token:option-unicorn',
    });
    const humanoidBase = playerProfile('option-humanoid', { initiativeBonus: -100 });
    const humanoid = { ...humanoidBase, rules: { ...humanoidBase.rules, creatureType: 'Humanoid' } };
    const state = freshMonsterPlanningState(createEncounter({
      bounds: { columns: 30, rows: 12 }, combatants: [unicorn, humanoid],
      tokens: [placedToken(unicorn, 0, 2), placedToken(humanoid, 3, 2)],
    }));
    const blessingOptions = engineActorOptions(state, unicorn.id).offerable
      .filter((option) => option.activationChoice?.kind === 'unicorns_blessing_spell');
    expect(blessingOptions.length).toBeGreaterThan(0);
    expect(blessingOptions.every((option) => option.activationChoice?.kind === 'unicorns_blessing_spell' &&
      option.activationChoice.values.join('|') === 'cure-wounds|lesser-restoration')).toBe(true);
    expect(blessingOptions.some((option) => option.label.includes('cure-wounds') ||
      option.label.includes('lesser-restoration'))).toBe(false);
  });

  it('choice_values_expand_into_options: the human activation prompt keeps one engine option', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const unicorn = monsterCombatantProfile(UNICORN, {
        combatantId: 'combatant:ui-unicorn', tokenId: 'token:ui-unicorn',
      });
      const ally = playerProfile('ui-ally', { initiativeBonus: -100 });
      const state = freshMonsterPlanningState(createEncounter({
        bounds: { columns: 30, rows: 12 }, combatants: [unicorn, ally],
        tokens: [placedToken(unicorn, 0, 2), placedToken(ally, 2, 2)],
      }));
      const projected = projectHumanEngineOptions(state, [unicorn.id]);
      const optionCount = projected[0]?.options.filter((entry) =>
        entry.availability === 'offerable' && entry.option.activationChoice?.kind === 'unicorns_blessing_spell').length;
      const catalog = interactiveElement(renderHumanEngineOptionCatalog(projected));
      const controls = catalog.querySelectorAll('select').filter((control) =>
        control.dataset['choiceKind'] === 'unicorns_blessing_spell');
      expect(optionCount).toBeGreaterThan(0);
      expect(controls).toHaveLength(optionCount ?? 0);
      expect(controls[0]?.children.map((entry) => entry.value)).toEqual([
        '', 'cure-wounds', 'lesser-restoration',
      ]);
    } finally {
      restoreDocument();
    }
  });
});
