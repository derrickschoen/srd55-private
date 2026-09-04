import type {
  MonsterAttackAction,
  MonsterMultiattackAction,
  MonsterMultiattackComponent,
  MonsterSavingThrowAction,
  MonsterTrait,
} from '../combat/statblock';
import type { EncounterState } from '../combat/encounter';
import { declaredMonsterTraits } from '../combat/monster-traits';
import type { CombatantId } from '../combat/values';
import type { EngineOmittedRider } from './option-modeling';
import { engineActionId, type EngineActionId } from './turn-proposal';

const componentOmissionCache = new Map<
  EngineActionId,
  WeakMap<MonsterMultiattackComponent, readonly EngineOmittedRider[]>
>();
const multiattackOmissionCache = new WeakMap<
  MonsterMultiattackAction,
  Map<string, readonly EngineOmittedRider[]>
>();

export type FeatureSupportDisposition =
  | { readonly kind: 'modeled' }
  | {
      readonly kind: 'offered_with_omission';
      readonly reason: 'secondary_effect_omitted';
    }
  | {
      readonly kind: 'human_only_unmodeled';
      readonly reason:
        | 'zero_hit_point_trait_unmodeled'
        | 'grapple_movement_unmodeled'
        | 'ally_aura_unmodeled'
        | 'incorporeal_movement_unmodeled'
        | 'jump_movement_unmodeled'
        | 'trait_save_aura_unmodeled'
        | 'vertical_movement_unmodeled'
        | 'web_movement_unmodeled'
        | 'companion_life_bond_unmodeled'
        | 'special_space_movement_unmodeled'
        | 'object_damage_trait_unmodeled'
        | 'automatic_grapple_trait_unmodeled'
        | 'equipment_corrosion_trait_unmodeled'
        | 'ethereal_plane_unmodeled'
        | 'equipment_restriction_unmodeled'
        | 'emitted_light_unmodeled';
    }
  | {
      readonly kind: 'encounter_not_applicable';
      readonly reason: 'no_sunlight_state' | 'no_underwater_state';
    };

export interface MonsterTraitSupportRow {
  readonly feature: { readonly kind: 'trait'; readonly trait: MonsterTrait['kind'] };
  readonly disposition: FeatureSupportDisposition;
}

export const B4_MODELED_SPELL_PAYLOADS = [
  'calm-emotions', 'command', 'dispel-evil-and-good', 'entangle', 'unicorns-blessing',
] as const;
export type B4ModeledSpellPayload = (typeof B4_MODELED_SPELL_PAYLOADS)[number];

/** Binding B4 disposition audit: each listed payload has executable mechanics and typed choices where required. */
export function b4SpellPayloadDisposition(
  id: B4ModeledSpellPayload,
): Extract<FeatureSupportDisposition, { readonly kind: 'modeled' }> {
  switch (id) {
    case 'calm-emotions':
    case 'command':
    case 'dispel-evil-and-good':
    case 'entangle':
    case 'unicorns-blessing': return { kind: 'modeled' };
  }
}

/** Exhaustive disposition for each declared monster trait. */
export function monsterTraitSupportDisposition(
  trait: MonsterTrait,
): FeatureSupportDisposition {
  switch (trait.kind) {
    case 'pack_tactics':
    case 'bloodied_frenzy':
    case 'bloodied_fury':
    case 'web_sense':
    case 'keen_sight':
    case 'flyby':
    case 'magic_resistance': return { kind: 'modeled' };
    case 'undead_fortitude': return {
      kind: 'human_only_unmodeled', reason: 'zero_hit_point_trait_unmodeled',
    };
    case 'abduct': return {
      kind: 'human_only_unmodeled', reason: 'grapple_movement_unmodeled',
    };
    case 'aura_of_authority': return {
      kind: 'human_only_unmodeled', reason: 'ally_aura_unmodeled',
    };
    case 'incorporeal_movement': return {
      kind: 'human_only_unmodeled', reason: 'incorporeal_movement_unmodeled',
    };
    case 'running_leap': return {
      kind: 'human_only_unmodeled', reason: 'jump_movement_unmodeled',
    };
    case 'stench': return {
      kind: 'human_only_unmodeled', reason: 'trait_save_aura_unmodeled',
    };
    case 'sunlight_sensitivity': return {
      kind: 'encounter_not_applicable', reason: 'no_sunlight_state',
    };
    case 'amphibious':
    case 'hold_breath':
    case 'water_breathing': return {
      kind: 'encounter_not_applicable', reason: 'no_underwater_state',
    };
    case 'spider_climb': return {
      kind: 'human_only_unmodeled', reason: 'vertical_movement_unmodeled',
    };
    case 'web_walker': return {
      kind: 'human_only_unmodeled', reason: 'web_movement_unmodeled',
    };
    case 'life_bond': return {
      kind: 'human_only_unmodeled', reason: 'companion_life_bond_unmodeled',
    };
    case 'air_form':
    case 'earth_glide':
    case 'amorphous': return {
      kind: 'human_only_unmodeled', reason: 'special_space_movement_unmodeled',
    };
    case 'siege_monster': return {
      kind: 'human_only_unmodeled', reason: 'object_damage_trait_unmodeled',
    };
    case 'adhesive': return {
      kind: 'human_only_unmodeled', reason: 'automatic_grapple_trait_unmodeled',
    };
    case 'corrosive_form': return {
      kind: 'human_only_unmodeled', reason: 'equipment_corrosion_trait_unmodeled',
    };
    case 'ethereal_sight': return {
      kind: 'human_only_unmodeled', reason: 'ethereal_plane_unmodeled',
    };
    case 'ephemeral': return {
      kind: 'human_only_unmodeled', reason: 'equipment_restriction_unmodeled',
    };
    case 'illumination': return {
      kind: 'human_only_unmodeled', reason: 'emitted_light_unmodeled',
    };
  }
}

export function monsterTraitSupportRows(
  state: EncounterState,
  actorId: CombatantId,
): readonly MonsterTraitSupportRow[] {
  return declaredMonsterTraits(state, actorId).map((trait) => ({
    feature: { kind: 'trait', trait: trait.kind },
    disposition: monsterTraitSupportDisposition(trait),
  }));
}

function source(
  sourceActionId: EngineActionId,
  componentActionId: string,
): { readonly sourceActionId: EngineActionId; readonly componentActionId: EngineActionId } {
  return { sourceActionId, componentActionId: engineActionId(componentActionId) };
}

function attackOmissions(
  sourceActionId: EngineActionId,
  action: MonsterAttackAction,
): readonly EngineOmittedRider[] {
  const identity = source(sourceActionId, action.id);
  const damage: EngineOmittedRider[] = action.damage.flatMap((term): readonly EngineOmittedRider[] => {
    switch (term.trigger.kind) {
      case 'always': return [];
      case 'attack_roll_advantage':
      case 'replaces_base_when_target_bloodied': return [{
        ...identity, kind: 'conditional_damage_trigger', trigger: term.trigger.kind,
      }];
      case 'charge': return [{ ...identity, kind: 'conditional_damage_trigger', trigger: 'charge' }];
    }
  });
  const onHit: EngineOmittedRider[] = action.onHit.flatMap((effect) =>
    effect.kind === 'condition' && effect.trigger.kind === 'charge'
      ? [{ ...identity, kind: 'conditional_on_hit_effect', effect: 'condition', trigger: 'charge' }]
      : []);
  const mechanics: EngineOmittedRider[] = (action.mechanics ?? []).map((mechanic) => {
    switch (mechanic.kind) {
      case 'attack_roll_advantage_window': return {
        ...identity, kind: 'attack_advantage_window', window: mechanic.window,
      };
      case 'equipment_corrosion':
      case 'conditional_damage_replacement':
      case 'grapple_escape_disadvantage':
      case 'attachment': return {
        ...identity,
        kind: 'other_explicitly_classified_secondary_effect',
        classification: mechanic.kind,
      };
    }
  });
  return [...damage, ...onHit, ...mechanics];
}

function savingThrowOmissions(
  sourceActionId: EngineActionId,
  action: MonsterSavingThrowAction,
): readonly EngineOmittedRider[] {
  return action.failure.effects.flatMap((effect): readonly EngineOmittedRider[] =>
    effect.kind === 'raises_as_zombie'
      ? [{
          ...source(sourceActionId, action.id),
          kind: 'delayed_zombie_creation',
          targetKind: effect.targetKind,
          delayHours: effect.delayHours,
        }]
      : []);
}

export function omittedRidersForMultiattackComponent(
  sourceActionId: EngineActionId,
  component: MonsterMultiattackComponent,
): readonly EngineOmittedRider[] {
  let sourceCache = componentOmissionCache.get(sourceActionId);
  if (sourceCache === undefined) {
    sourceCache = new WeakMap<MonsterMultiattackComponent, readonly EngineOmittedRider[]>();
    componentOmissionCache.set(sourceActionId, sourceCache);
  }
  const cached = sourceCache.get(component);
  if (cached !== undefined) return cached;
  const omissions = component.kind === 'attack'
    ? attackOmissions(sourceActionId, component)
    : savingThrowOmissions(sourceActionId, component);
  sourceCache.set(component, omissions);
  return omissions;
}

export function omittedRidersForStandaloneAction(
  action: MonsterAttackAction | MonsterSavingThrowAction,
): readonly EngineOmittedRider[] {
  const sourceActionId = engineActionId(action.id);
  return omittedRidersForMultiattackComponent(sourceActionId, action);
}

export function omittedRidersForMultiattack(
  action: MonsterMultiattackAction,
  components: readonly MonsterMultiattackComponent[],
): readonly EngineOmittedRider[] {
  let actionCache = multiattackOmissionCache.get(action);
  if (actionCache === undefined) {
    actionCache = new Map<string, readonly EngineOmittedRider[]>();
    multiattackOmissionCache.set(action, actionCache);
  }
  const componentKey = components.map((component) => `${component.kind}:${component.id}`).join('|');
  const cached = actionCache.get(componentKey);
  if (cached !== undefined) return cached;
  const sourceActionId = engineActionId(action.id);
  const coupled: EngineOmittedRider[] = (action.mechanics ?? []).map((mechanic) => ({
    ...source(sourceActionId, action.id),
    kind: 'other_explicitly_classified_secondary_effect',
    classification: 'coupled_action_use',
    relatedActionId: engineActionId(mechanic.actionId),
  }));
  const omissions = [
    ...components.flatMap((component) => omittedRidersForMultiattackComponent(sourceActionId, component)),
    ...coupled,
  ];
  actionCache.set(componentKey, omissions);
  return omissions;
}
