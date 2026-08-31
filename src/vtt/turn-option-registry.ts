import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type {
  MonsterAction,
  MonsterAttackAction,
  MonsterBonusAction,
  MonsterMultiattackAction,
  MonsterSpellcastingAction,
} from '../combat/statblock';
import {
  monsterSpellMaximumUses,
  monsterSpellResourcePoolId,
} from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import type { CombatantId } from '../combat/values';
import { worldObjectActionWasUsed } from '../combat/world-object-actions';
import { gridDistance } from '../combat/grid';
import { sha256 } from '../crypto/sha256';
import { monsterActions, monsterBonusActions } from './engine-query-port';
import {
  engineActionId,
  engineOptionId,
  engineSpellId,
  type EngineActionSlotUse,
  type EngineActorOption,
  type EngineBonusActionUse,
  type EngineMainActionUse,
  type EngineMovementObjective,
  type EngineTargetedAttackUse,
} from './turn-proposal';

export const ACTION_ECONOMY_POLICY_VERSION = 'action-economy-v1' as const;

const HOLD: EngineMovementObjective = {
  preference: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
  engagement: { stance: 'hold_position' },
};

function target(combatantId: CombatantId) {
  return { kind: 'combatant' as const, combatantId };
}

function livingEnemies(state: EncounterState, actorId: CombatantId): readonly CombatantId[] {
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  return state.combatants
    .filter((candidate) => candidate.life !== 'dead' && candidate.profile.kind !== actor?.profile.kind)
    .map((candidate) => candidate.profile.id)
    .sort((left, right) => left.localeCompare(right));
}

function livingAllies(state: EncounterState, actorId: CombatantId): readonly CombatantId[] {
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  return state.combatants
    .filter((candidate) => candidate.life === 'living' && candidate.profile.kind === actor?.profile.kind)
    .map((candidate) => candidate.profile.id)
    .sort((left, right) => left.localeCompare(right));
}

function combinations<T>(values: readonly T[], count: number): readonly (readonly T[])[] {
  if (count === 0) return [[]];
  return values.flatMap((value) => combinations(values, count - 1).map((tail) => [value, ...tail]));
}

export function legalMultiattackCombinations(
  multiattack: MonsterMultiattackAction,
  actions: readonly MonsterAction[],
): readonly (readonly MonsterAttackAction[])[] {
  const attacks = multiattack.actionIds.flatMap((id) => {
    const action = actions.find(
      (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === id,
    );
    return action === undefined ? [] : [action];
  });
  if (attacks.length !== multiattack.actionIds.length || attacks.length === 0) return [];
  switch (multiattack.combination) {
    case 'any': return combinations(attacks, multiattack.count);
    case 'fixed': return attacks.length === multiattack.count ? [attacks] : [];
    case 'one_attack_may_be_replaced': {
      const replacement = attacks.at(-1);
      const ordinary = attacks.slice(0, -1);
      if (replacement === undefined || ordinary.length === 0) return [];
      const base = combinations(ordinary, multiattack.count);
      return [
        ...base,
        ...base.flatMap((entry) => entry.map((_, index) =>
          entry.map((action, actionIndex) => actionIndex === index ? replacement : action),
        )),
      ].filter((entry, index, all) =>
        all.findIndex((candidate) => canonicalJson(candidate.map((action) => action.id)) ===
          canonicalJson(entry.map((action) => action.id))) === index);
    }
  }
}

function mainUses(state: EncounterState, actorId: CombatantId): readonly {
  readonly label: string;
  readonly use: EngineMainActionUse;
  readonly movement: EngineMovementObjective;
  readonly resourceCostLabels: readonly string[];
}[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster' || subject.life !== 'living' || subject.turn.action.kind !== 'available') {
    return [];
  }
  const actions = monsterActions(state, actorId);
  const enemies = livingEnemies(state, actorId);
  const multiattacks = actions.filter(
    (action): action is MonsterMultiattackAction => action.kind === 'multiattack',
  );
  const attacks = multiattacks.length === 0
    ? actions.filter((action): action is MonsterAttackAction => action.kind === 'attack').flatMap((action) =>
        enemies.map((enemy): { readonly label: string; readonly use: EngineMainActionUse; readonly movement: EngineMovementObjective; readonly resourceCostLabels: readonly string[] } => ({
          label: `${action.name} -> ${enemy}`,
          use: { kind: 'attack', actionId: engineActionId(action.id), target: target(enemy) },
          movement: {
            preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
            engagement: { stance: action.delivery.kind === 'melee' ? 'close_to_melee' : 'maintain_range', anchor: target(enemy) },
          },
          resourceCostLabels: [],
        })))
    : multiattacks.flatMap((multiattack) => legalMultiattackCombinations(multiattack, actions).flatMap((combination) =>
        enemies.map((enemy): { readonly label: string; readonly use: EngineMainActionUse; readonly movement: EngineMovementObjective; readonly resourceCostLabels: readonly string[] } => {
          const components: readonly EngineTargetedAttackUse[] = combination.map((action) => ({
            kind: 'attack', actionId: engineActionId(action.id), target: target(enemy),
          }));
          return {
            label: `${combination.map((action) => action.name).join(' + ')} -> ${enemy}`,
            use: { kind: 'multiattack', actionId: engineActionId(multiattack.id), components },
            movement: {
              preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
              engagement: {
                stance: combination.every((action) => action.delivery.kind === 'melee') ? 'close_to_melee' : 'maintain_range',
                anchor: target(enemy),
              },
            },
            resourceCostLabels: [],
          };
        })));
  const savingThrows = actions.flatMap((action) => action.kind !== 'saving_throw' ? [] : enemies.map((enemy) => ({
    label: `${action.name} -> ${enemy}`,
    use: { kind: 'saving_throw' as const, actionId: engineActionId(action.id), target: target(enemy) },
    movement: {
      preference: { willingness: 'only_if_required' as const, maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' as const },
      engagement: { stance: 'close_to_melee' as const, anchor: target(enemy) },
    },
    resourceCostLabels: [],
  })));
  const spellUses = actions.flatMap((action) => action.kind === 'spellcasting'
    ? spellcastingUses(state, actorId, action)
    : []);
  const actorPosition = state.tokens.find((token) => token.combatantId === actorId)?.position;
  const worldObjects = actorPosition === undefined ? [] : state.worldObjects.flatMap((object) =>
    (object.classActions ?? []).flatMap((action) => {
      if (
        (action.eligibleActor !== 'either' && action.eligibleActor !== 'monster') ||
        (action.reach === 'adjacent' && gridDistance(actorPosition, object.position) > 5) ||
        (action.uses === 'once' && worldObjectActionWasUsed(state.eventLog, object.id, action.id))
      ) return [];
      return [{
        label: `${action.id} @ ${object.name}`,
        use: { kind: 'use_world_object' as const, objectId: object.id, actionId: engineActionId(action.id) },
        movement: HOLD,
        resourceCostLabels: action.uses === 'once' ? [`world-object:${String(object.id)}:once`] : [],
      }];
    }));
  return [
    ...attacks,
    ...savingThrows,
    ...spellUses,
    ...worldObjects,
    { label: 'Dodge', use: { kind: 'dodge' }, movement: HOLD, resourceCostLabels: [] },
    { label: 'Disengage', use: { kind: 'disengage' }, movement: HOLD, resourceCostLabels: [] },
    {
      label: 'Dash',
      use: { kind: 'dash' },
      movement: {
        preference: { willingness: 'freely', maximumFeet: subject.profile.rules.speed * 2, opportunityRisk: 'avoid' },
        engagement: { stance: 'close_to_melee', anchor: { kind: 'nearest_visible_enemy' } },
      },
      resourceCostLabels: [],
    },
    { label: 'End Turn', use: { kind: 'end_turn' }, movement: HOLD, resourceCostLabels: [] },
  ];
}

function spellTargets(
  state: EncounterState,
  actorId: CombatantId,
  spellId: string,
): readonly ReturnType<typeof target>[] | null {
  const definition = spellDefinition(spellId);
  if (definition === null) return null;
  const allies = livingAllies(state, actorId);
  const enemies = livingEnemies(state, actorId);
  switch (spellId) {
    case 'bless': return allies.slice(0, 3).map(target);
    case 'healing-word':
    case 'cure-wounds':
    case 'lesser-restoration':
    case 'sanctuary': return allies.slice(0, 1).map(target);
  }
  switch (definition.targeting.kind) {
    case 'self': return [target(actorId)];
    case 'single':
    case 'multiple':
    case 'selected': return enemies.slice(0, 1).map(target);
    case 'all_in_range': return enemies.map(target);
    case 'area':
    case 'area_selected':
    case 'remote':
    case 'utility': return null;
  }
}

function spellcastingUses(
  state: EncounterState,
  actorId: CombatantId,
  action: MonsterSpellcastingAction,
): readonly {
  readonly label: string;
  readonly use: Extract<EngineMainActionUse | EngineBonusActionUse, { readonly kind: 'cast_spell' }>;
  readonly movement: EngineMovementObjective;
  readonly resourceCostLabels: readonly string[];
}[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  return action.spells.flatMap((spell) => {
    if (spell.manifestStatus !== 'implemented') return [];
    const poolId = monsterSpellResourcePoolId(action.id, spell);
    const maximum = monsterSpellMaximumUses(spell);
    const remaining = poolId === null
      ? null
      : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
    if (remaining !== null && remaining < 1) return [];
    const targets = spellTargets(state, actorId, spell.id);
    if (targets === null || targets.length === 0) return [];
    return [{
      label: `${action.id}/${spell.id}${maximum === null ? '' : ` (${String(remaining)}/${String(maximum)})`}`,
      use: {
        kind: 'cast_spell',
        sourceActionId: engineActionId(action.id),
        spellId: engineSpellId(spell.id),
        targets,
      },
      movement: HOLD,
      resourceCostLabels: poolId === null ? [] : [`${String(poolId)}:${String(remaining)}/${String(maximum)}`],
    }];
  });
}

interface BonusUseOption {
  readonly label: string;
  readonly use: EngineBonusActionUse;
  readonly resourceCostLabels: readonly string[];
}

function bonusUses(state: EncounterState, actorId: CombatantId): readonly BonusUseOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster' || subject.life !== 'living' || !subject.turn.bonusActionAvailable) {
    return [];
  }
  return monsterBonusActions(state, actorId).flatMap((action: MonsterBonusAction): readonly BonusUseOption[] => {
    switch (action.kind) {
      case 'spellcasting': return spellcastingUses(state, actorId, action).map(({ label, use, resourceCostLabels }) => ({ label, use, resourceCostLabels }));
      case 'saving_throw': return livingEnemies(state, actorId).map((enemy) => ({
        label: `${action.name} -> ${enemy}`,
        use: { kind: 'saving_throw' as const, actionId: engineActionId(action.id), target: target(enemy) },
        resourceCostLabels: [],
      }));
      case 'nimble_escape': return action.actions.map((choice) => ({
        label: `Nimble Escape/${choice}`,
        use: { kind: choice === 'Disengage' ? 'disengage' as const : 'hide' as const },
        resourceCostLabels: [],
      }));
      case 'cunning_action': return action.actions.map((choice) => ({
        label: `Cunning Action/${choice}`,
        use: { kind: choice === 'Dash' ? 'dash' as const : choice === 'Disengage' ? 'disengage' as const : 'hide' as const },
        resourceCostLabels: [],
      }));
      case 'teleport':
      case 'healing':
      case 'spell_choice':
      case 'shape_shift_retained_statistics':
      case 'swoop':
      case 'consume_life':
      case 'vanish': return [];
    }
  });
}

function option(
  revision: number,
  actorId: CombatantId,
  label: string,
  movement: EngineMovementObjective,
  actionSlots: readonly EngineActionSlotUse[],
  resourceCostLabels: readonly string[],
): EngineActorOption {
  const body = { actorId, revision, label, movement, actionSlots, resourceCostLabels };
  return {
    optionId: engineOptionId(`option:${String(revision)}:${sha256(canonicalJson(body)).slice(0, 48)}`),
    ...body,
  };
}

function movementWithBonusUse(
  movement: EngineMovementObjective,
  bonusUse: EngineBonusActionUse,
  speed: number,
): EngineMovementObjective {
  if (bonusUse.kind !== 'dash') return movement;
  return {
    ...movement,
    preference: {
      ...movement.preference,
      willingness: 'freely',
      maximumFeet: (movement.preference.maximumFeet ?? speed) + speed,
    },
  };
}

export function engineActorOptions(
  state: EncounterState,
  actorId: CombatantId,
  revision = state.revision,
): readonly EngineActorOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster') return [];
  const main = mainUses(state, actorId);
  const bonus = bonusUses(state, actorId);
  const values = main.flatMap((mainUse) => {
    const mainSlot: EngineActionSlotUse = { slot: 'main', use: mainUse.use };
    return [
      option(revision, actorId, mainUse.label, mainUse.movement, [mainSlot], mainUse.resourceCostLabels),
      ...bonus.map((bonusUse) => option(
        revision,
        actorId,
        `${mainUse.label} + ${bonusUse.label}`,
        movementWithBonusUse(mainUse.movement, bonusUse.use, subject.profile.rules.speed),
        [mainSlot, { slot: 'bonus', use: bonusUse.use }],
        [...mainUse.resourceCostLabels, ...bonusUse.resourceCostLabels],
      )),
    ];
  });
  return values.sort((left, right) => left.label.localeCompare(right.label) ||
    left.optionId.localeCompare(right.optionId));
}
