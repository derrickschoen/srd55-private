import type { Ability } from '../domain/enums';
import { combatantFaction } from './allies';
import type { CombatRulesProfile } from './combatant';
import {
  conditionMechanicalState,
  type AppliedCondition,
  type ExhaustionLevel,
} from './conditions';
import type { EncounterState, EncounterCombatantState } from './encounter';
import { EncounterRuleError } from './encounter-rule-error';
import type { EncounterEffect } from './effects';
import { declaredMonsterTraits } from './monster-traits';
import type { RollMode } from './saving-throw-outcomes';
import { combineRollModes, projectMonsterRollModeSources } from './tactical-evaluator';
import type { CombatantId } from './values';
import { wildShapeRulesLens } from './wild-shape';

function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new EncounterRuleError('validation', `Unknown combatant ${id}.`);
  return found;
}

/** The only combatant-state -> active-rules lens. */
export function effectiveCombatRules(
  state: EncounterState,
  id: CombatantId,
): CombatRulesProfile {
  const subject = combatant(state, id);
  return subject.wildShape === undefined
    ? subject.profile.rules
    : wildShapeRulesLens(subject.profile.rules, subject.wildShape);
}

function appliedConditions(effect: EncounterEffect): readonly AppliedCondition[] {
  switch (effect.payload.kind) {
    case 'summon_lifecycle':
    case 'ability_check_modifier':
    case 'skill_modifier':
    case 'armor_class_modifier':
    case 'roll_defense_modifier':
    case 'attack_roll_modifier':
    case 'attack_roll_mode_modifier':
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'healing_potion':
    case 'cannot_regain_hit_points':
    case 'creature_type_protection':
    case 'd20_test_modifier':
    case 'damage_reduction':
    case 'damage_rider':
    case 'recurring_damage_operation':
    case 'bonus_action_attack_grant':
    case 'extra_attack_count_override':
    case 'action_surge':
    case 'magic_missile_immunity':
    case 'movement_modifier':
    case 'opportunity_attacks_disabled':
    case 'sanctuary':
    case 'saving_throw_modifier':
    case 'shield_defense':
    case 'communication_link':
    case 'sustained_effect':
    case 'conjured_hand':
    case 'illusion':
    case 'light_source':
    case 'minor_magic':
    case 'object_repair':
    case 'alarm_ward':
    case 'appearance_illusion':
    case 'base_armor_class':
    case 'bonus_action_dash':
    case 'commanded_action':
    case 'detection_sense':
    case 'environmental_water':
    case 'falling_protection':
    case 'floating_disk':
    case 'food_purification':
    case 'image_illusion':
    case 'illusory_script':
    case 'jump_movement':
    case 'language_comprehension':
    case 'magic_identification':
    case 'obscured_area':
    case 'summoned_familiar':
    case 'unseen_servant':
    case 'hit_point_maximum_modifier':
    case 'condition_choice':
    case 'form_alteration':
    case 'arcane_lock':
    case 'magic_aura':
    case 'augury':
    case 'attacks_against_target_roll_mode':
    case 'calm_emotions':
    case 'condition_suppression':
    case 'indifferent_toward_monster_side':
    case 'darkvision':
    case 'detect_thoughts':
    case 'granted_breath':
    case 'ability_check_advantage':
    case 'size_alteration':
    case 'trap_detection':
    case 'flaming_sphere':
    case 'corpse_preservation':
    case 'gust_of_wind_area':
    case 'levitation':
    case 'object_location':
    case 'magic_mouth':
    case 'object_unlock':
    case 'magic_weapon':
    case 'location_tracking':
    case 'mirror_images':
    case 'teleport':
    case 'poison_protection':
    case 'ray_enfeeblement':
    case 'rope_trick':
    case 'see_invisibility':
    case 'silence_area':
    case 'spider_climb':
    case 'spiritual_weapon':
    case 'warding_bond':
    case 'truth_zone':
    case 'ongoing_damage':
    case 'temporary_banishment':
    case 'summoned_undead':
    case 'beacon_of_hope':
    case 'bestow_curse':
    case 'blink':
    case 'clairvoyance_sensor':
    case 'created_food_and_water':
    case 'daylight_area':
    case 'flight':
    case 'gaseous_form':
    case 'glyph_of_warding':
    case 'haste':
    case 'magic_circle':
    case 'major_image':
    case 'meld_into_stone':
    case 'nondetection':
    case 'phantom_steed':
    case 'energy_protection':
    case 'sending':
    case 'sleet_storm_area':
    case 'slow':
    case 'speak_with_dead':
    case 'spirit_guardians_area':
    case 'stinking_cloud_area':
    case 'tiny_hut':
    case 'universal_language':
    case 'vampiric_touch':
    case 'water_breathing':
    case 'water_walk':
    case 'arcane_eye':
    case 'aura_of_life':
    case 'black_tentacles_area':
    case 'confusion_area':
    case 'conjure_minor_elementals':
    case 'control_water':
    case 'death_ward':
    case 'dimension_door':
    case 'divination':
    case 'fabricate':
    case 'faithful_hound':
    case 'fire_shield':
    case 'freedom_of_movement':
    case 'guardian_of_faith':
    case 'hallucinatory_terrain':
    case 'ice_storm_terrain':
    case 'locate_creature':
    case 'phantasmal_killer':
    case 'polymorph':
    case 'private_sanctum':
    case 'resilient_sphere':
    case 'secret_chest':
    case 'stone_shape':
    case 'damage_resistances':
    case 'wall_of_fire':
      return [];
    case 'ensnaring_strike':
      return [{ name: effect.payload.condition }];
    case 'banishment':
      return [{ name: effect.payload.condition }];
    case 'charm_monster':
      return [{ name: effect.payload.condition, source: effect.source }];
    case 'hypnotic_pattern':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' ? { name: condition, source: effect.source } : { name: condition });
    case 'fear':
      return [{ name: 'Frightened', source: effect.source }];
    case 'web_area':
      return [{ name: 'Restrained' }];
    case 'condition_bundle':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
          ? { name: condition, source: effect.source }
          : { name: condition });
    case 'sleep_sequence':
      return [{ name: effect.payload.initial }];
    case 'exhaustion':
      return [{ name: 'Exhaustion', level: effect.payload.level }];
    case 'condition':
      switch (effect.payload.condition) {
        case 'Charmed':
        case 'Frightened':
        case 'Grappled':
          return [{ name: effect.payload.condition, source: effect.source }];
        case 'Blinded':
        case 'Deafened':
        case 'Incapacitated':
        case 'Invisible':
        case 'Paralyzed':
        case 'Petrified':
        case 'Poisoned':
        case 'Prone':
        case 'Restrained':
        case 'Stunned':
        case 'Unconscious':
          return [{ name: effect.payload.condition }];
      }
  }
}

export function combatantConditions(
  state: EncounterState,
  id: CombatantId,
): readonly AppliedCondition[] {
  const subject = combatant(state, id);
  const conditions: AppliedCondition[] = [];
  const seenConditions = new Set<string>();
  let exhaustionLevels = 0;
  const suppressed = new Set<string>(state.effects
    .filter((effect) => effect.targets.includes(id) && effect.payload.kind === 'condition_suppression')
    .flatMap((effect) => effect.payload.kind === 'condition_suppression' ? effect.payload.conditions : []));
  for (const effect of state.effects) {
    if (!effect.targets.includes(id)) continue;
    for (const condition of appliedConditions(effect)) {
      if (suppressed.has(condition.name)) continue;
      if (condition.name === 'Exhaustion') {
        exhaustionLevels += condition.level;
        continue;
      }
      if (
        condition.name === 'Invisible' &&
        state.effects.some((candidate) =>
          candidate.targets.includes(id) &&
          candidate.payload.kind === 'faerie_fire' &&
          candidate.payload.preventsInvisibleConditionBenefit)
      ) continue;
      const key =
        'source' in condition
          ? `${condition.name}:${condition.source}`
          : condition.name;
      if (!seenConditions.has(key)) {
        seenConditions.add(key);
        conditions.push(condition);
      }
    }
  }
  if (exhaustionLevels > 0) {
    conditions.push({
      name: 'Exhaustion',
      level: Math.min(6, exhaustionLevels) as ExhaustionLevel,
    });
  }
  if (
    subject.life === 'dying' &&
    !conditions.some((condition) => condition.name === 'Unconscious')
  ) {
    conditions.push({ name: 'Unconscious' });
  }
  return conditions;
}

export function automaticSaveFailure(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
): boolean {
  return conditionMechanicalState(combatantConditions(state, target)).clauses.some(
    (clause) =>
      clause.kind === 'automatic_save_failure' && clause.abilities.includes(ability),
  );
}

export function saveRollMode(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
  base: RollMode,
  cause: 'spell_or_magical_effect' | 'other',
): RollMode {
  const modes: RollMode[] = [base];
  const subject = combatant(state, target);
  const activeHitPoints = subject.wildShape?.physical.hitPoints ??
    subject.form?.hitPoints ?? subject.hitPoints;
  const activeBaseMaximum = subject.wildShape?.physical.hitPointMaximum ??
    subject.form?.hitPointMaximum ?? subject.profile.rules.hitPointMaximum;
  const activeHitPointMaximum = state.effects.reduce((maximum, effect) =>
    effect.targets.includes(target) && effect.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + effect.payload.amount
      : maximum, activeBaseMaximum);
  modes.push(...projectMonsterRollModeSources({
    kind: 'saving_throw',
    traits: declaredMonsterTraits(state, target),
    actor: {
      id: target,
      faction: combatantFaction(state, target),
      hitPoints: activeHitPoints,
      hitPointMaximum: activeHitPointMaximum,
    },
  }).map((source) => source.mode));
  if (cause === 'spell_or_magical_effect' && effectiveCombatRules(state, target).magicResistance === true) {
    modes.push('advantage');
  }
  for (const effect of state.effects) {
    if (
      effect.targets.includes(target) &&
      effect.payload.kind === 'attack_roll_mode_modifier' &&
      effect.payload.appliesTo.kind === 'saving_throws_by_target'
    ) modes.push(effect.payload.mode);
  }
  for (const clause of conditionMechanicalState(combatantConditions(state, target)).clauses) {
    if (
      clause.kind === 'roll_mode' &&
      clause.roll === 'dexterity_save' &&
      ability === 'dexterity' &&
      clause.predicate === 'always'
    ) {
      modes.push(clause.mode);
    }
  }
  return combineRollModes(modes);
}

export interface PlanningSavingThrowFacts {
  readonly bonus: number;
  readonly rollMode: RollMode;
  readonly automaticFailure: boolean;
}

/** Read-only planning lens over the reducer's canonical save bonus and roll-mode sources. */
export function planningSavingThrowFacts(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
  base: RollMode,
  cause: 'spell_or_magical_effect' | 'other',
): PlanningSavingThrowFacts {
  return {
    bonus: effectiveCombatRules(state, target).savingThrowBonuses[ability],
    rollMode: saveRollMode(state, target, ability, base, cause),
    automaticFailure: automaticSaveFailure(state, target, ability),
  };
}
