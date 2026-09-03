import type {
  MonsterAttackAction,
  MonsterMultiattackAction,
  MonsterMultiattackComponent,
  MonsterSavingThrowAction,
} from '../combat/statblock';
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
