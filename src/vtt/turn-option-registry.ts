import { canonicalJson } from '../commands/canonical-json';
import { combatantsAreAllies } from '../combat/allies';
import type { EncounterState } from '../combat/encounter';
import { combatantSpace } from '../combat/combat-rules';
import { minimumSpaceDistanceToCells } from '../combat/creature-space';
import type {
  MonsterAction,
  MonsterAttackAction,
  MonsterBonusAction,
  MonsterMultiattackComponent,
  MonsterMultiattackAction,
  MonsterSpellcastingAction,
} from '../combat/statblock';
import {
  monsterSpellMaximumUses,
  monsterSpellResourcePoolId,
} from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import { affectedCellsAmong, cubeAffectedCellsAmong, feetPoint, type AreaTemplate } from '../combat/templates';
import { feet, type CombatantId } from '../combat/values';
import { worldObjectActionWasUsed } from '../combat/world-object-actions';
import { gridDistance } from '../combat/grid';
import { sha256 } from '../crypto/sha256';
import {
  evaluateHardControlProfile,
  hardControlProfileForDefinition,
  isHardControlDefinition,
} from './intel/option-outcome';
import {
  declaredMonsterActions,
  declaredMonsterBonusActions,
  monsterActions,
  monsterBonusActions,
} from './engine-query-port';
import {
  classifyOptionModeling,
  engineHumanOptionId,
  type EngineDeclaredOptionIdentity,
  type EngineHumanOptionId,
  type EngineHumanOnlyOption,
  type EngineOfferableOption,
  type EngineOptionCandidate,
  type EngineOptionModelingCandidate,
  type EngineOmittedRider,
} from './option-modeling';
import {
  omittedRidersForMultiattack,
  omittedRidersForMultiattackComponent,
  omittedRidersForStandaloneAction,
} from './monster-feature-support';
import {
  engineActionId,
  engineOptionId,
  engineSpellId,
  type EngineActionSlotUse,
  type EngineActivationChoiceSlot,
  type EngineBonusActionUse,
  type EngineMainActionUse,
  type EngineMovementObjective,
  type EngineMultiattackComponentUse,
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
  return state.combatants
    .filter((candidate) => candidate.life !== 'dead' &&
      !combatantsAreAllies(state, actorId, candidate.profile.id))
    .map((candidate) => candidate.profile.id)
    .sort((left, right) => left.localeCompare(right));
}

function livingAllies(state: EncounterState, actorId: CombatantId): readonly CombatantId[] {
  return state.combatants
    .filter((candidate) => candidate.life === 'living' &&
      combatantsAreAllies(state, actorId, candidate.profile.id))
    .map((candidate) => candidate.profile.id)
    .sort((left, right) => left.localeCompare(right));
}

interface SpellUseSelection {
  readonly targets: readonly ReturnType<typeof target>[];
  readonly area: AreaTemplate | null;
  readonly labelSuffix: string;
}

function compareExact(
  left: import('./intel/contracts').ExactRational,
  right: import('./intel/contracts').ExactRational,
): number {
  const leftProduct = BigInt(left.numerator) * BigInt(right.denominator);
  const rightProduct = BigInt(right.numerator) * BigInt(left.denominator);
  return leftProduct < rightProduct ? -1 : leftProduct > rightProduct ? 1 : 0;
}

function hardControlSelection(
  state: EncounterState,
  actorId: CombatantId,
  definition: NonNullable<ReturnType<typeof spellDefinition>>,
  saveDc: number | null,
): SpellUseSelection | null {
  if (definition.targeting.kind !== 'area' || definition.targeting.shape !== 'cube' ||
    !isHardControlDefinition(definition)) return null;
  const targeting = definition.targeting;
  const actorPosition = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (actorPosition === undefined) return null;
  const actorCells = combatantSpace(state, actorId).cells;
  const enemies = new Set(livingEnemies(state, actorId));
  const allies = new Set(livingAllies(state, actorId));
  const positioned = state.tokens
    .filter((token) => state.combatants.some((candidate) =>
      candidate.profile.id === token.combatantId && candidate.life !== 'dead'))
    .map((token) => ({ token, cells: combatantSpace(state, token.combatantId).cells }));
  const templateGrid = {
    bounds: state.bounds,
    blockedCells: [
      ...state.blockedCells,
      ...state.worldObjects.flatMap((object) => object.blocking.lineOfSight ? object.footprint : []),
    ],
  };
  const sizeFeet = targeting.baseSizeFeet;
  const halfSizeFeet = sizeFeet / 2;
  const minimumCenterColumn = halfSizeFeet / 5;
  const maximumCenterColumn = state.bounds.columns - minimumCenterColumn;
  const minimumCenterRow = halfSizeFeet / 5;
  const maximumCenterRow = state.bounds.rows - minimumCenterRow;
  const candidates = Array.from(
    { length: Math.max(0, maximumCenterColumn - minimumCenterColumn + 1) },
    (_column, index) => index + minimumCenterColumn,
  ).flatMap((column) => Array.from(
    { length: Math.max(0, maximumCenterRow - minimumCenterRow + 1) },
    (_row, index) => index + minimumCenterRow,
  ).flatMap((row) => {
    const area: AreaTemplate = {
      shape: 'cube',
      template: {
        origin: feetPoint(column * 5 - halfSizeFeet, row * 5),
        center: feetPoint(column * 5, row * 5),
        axis: { x: 1, y: 0 },
        size: feet(sizeFeet),
        includeOrigin: false,
      },
    };
    const origin = area.template.origin;
    const distanceToOrigin = Math.min(...actorCells.map((cell) => {
      const left = cell.column * 5;
      const right = left + 5;
      const top = cell.row * 5;
      const bottom = top + 5;
      return Math.max(Math.max(left - origin.x, 0, origin.x - right), Math.max(top - origin.y, 0, origin.y - bottom));
    }));
    if (distanceToOrigin > targeting.rangeFeet) return [];
    const affectedCells = new Set(cubeAffectedCellsAmong(
      templateGrid,
      area.template,
      positioned.flatMap((entry) => entry.cells),
    ).map((cell) => `${String(cell.column)},${String(cell.row)}`));
    const affected = positioned.filter((entry) => entry.cells.some((cell) =>
      affectedCells.has(`${String(cell.column)},${String(cell.row)}`)));
    const affectedEnemies = affected.filter((entry) => enemies.has(entry.token.combatantId))
      .map((entry) => entry.token.combatantId)
      .sort((left, right) => left.localeCompare(right));
    if (affectedEnemies.length === 0) return [];
    const affectedAllies = affected.filter((entry) => allies.has(entry.token.combatantId))
      .map((entry) => entry.token.combatantId)
      .sort((left, right) => left.localeCompare(right));
    const affectedIds = [...affectedEnemies, ...affectedAllies]
      .sort((left, right) => left.localeCompare(right));
    return [{ area, affectedEnemies, affectedAllies, affectedIds, column, row }];
  }));
  const deduplicated = candidates.filter((candidate, index, all) =>
    all.findIndex((other) => other.affectedIds.join('|') === candidate.affectedIds.join('|')) === index);
  const valued = deduplicated.flatMap((candidate) => {
    const profile = hardControlProfileForDefinition(definition, candidate.affectedIds, saveDc);
    if (profile === null) return [];
    const evaluation = evaluateHardControlProfile(state, actorId, profile);
    return evaluation.status === 'resolved'
      ? [{ ...candidate, profile, net: evaluation.ledger.netActionEquivalents }]
      : [];
  });
  const chosen = valued.sort((left, right) =>
    -compareExact(left.net, right.net) ||
    left.affectedEnemies.join('|').localeCompare(right.affectedEnemies.join('|')) ||
    left.affectedAllies.join('|').localeCompare(right.affectedAllies.join('|')) ||
    left.row - right.row || left.column - right.column)[0];
  if (chosen === undefined) return null;
  return {
    targets: chosen.affectedIds.map(target),
    area: chosen.area,
    labelSuffix: ` [${String(sizeFeet)}-ft cube -> ${chosen.affectedEnemies.join(', ')}${
      chosen.affectedAllies.length === 0 ? '' : `; allies ${chosen.affectedAllies.join(', ')}`}]`,
  };
}

function combinations<T>(values: readonly T[], count: number): readonly (readonly T[])[] {
  if (count === 0) return [[]];
  return values.flatMap((value) => combinations(values, count - 1).map((tail) => [value, ...tail]));
}

export function legalMultiattackCombinations(
  multiattack: MonsterMultiattackAction,
  actions: readonly MonsterAction[],
): readonly (readonly MonsterMultiattackComponent[])[] {
  const components = multiattack.actionIds.flatMap((id) => {
    const action = actions.find(
      (candidate): candidate is MonsterMultiattackComponent =>
        (candidate.kind === 'attack' || candidate.kind === 'saving_throw') && candidate.id === id,
    );
    return action === undefined ? [] : [action];
  });
  if (components.length !== multiattack.actionIds.length || components.length === 0) return [];
  switch (multiattack.combination) {
    case 'any': return combinations(components, multiattack.count);
    case 'fixed': return components.length === multiattack.count ? [components] : [];
    case 'one_attack_may_be_replaced': {
      const replacement = components.at(-1);
      const ordinary = components.slice(0, -1).filter(
        (component): component is MonsterAttackAction => component.kind === 'attack',
      );
      if (replacement === undefined || replacement.kind !== 'saving_throw' ||
        ordinary.length !== components.length - 1 || ordinary.length === 0) return [];
      const base = combinations(ordinary, multiattack.count);
      return [
        ...base,
        ...base.map((entry) => [...entry.slice(0, -1), replacement]),
      ].filter((entry, index, all) =>
        all.findIndex((candidate) => canonicalJson(candidate.map((action) => [action.kind, action.id])) ===
          canonicalJson(entry.map((action) => [action.kind, action.id]))) === index);
    }
  }
}

interface MainUseOption {
  readonly label: string;
  readonly use: EngineMainActionUse;
  readonly movement: EngineMovementObjective;
  readonly resourceCostLabels: readonly string[];
  readonly omittedRiders: readonly EngineOmittedRider[];
  readonly activationChoice?: EngineActivationChoiceSlot | null;
}

function placedAreaSelection(
  state: EncounterState,
  actorId: CombatantId,
  definition: NonNullable<ReturnType<typeof spellDefinition>>,
): SpellUseSelection | null {
  if (definition.targeting.kind !== 'area' ||
    (definition.targeting.shape !== 'sphere' && definition.targeting.shape !== 'cube')) return null;
  const actorPosition = state.tokens.find((entry) => entry.combatantId === actorId)?.position;
  if (actorPosition === undefined) return null;
  const actorCells = combatantSpace(state, actorId).cells;
  const enemyIds = new Set(livingEnemies(state, actorId));
  const eligibleEnemyIds = new Set(state.combatants
    .filter((entry) => enemyIds.has(entry.profile.id))
    .filter((entry) => definition.id !== 'calm-emotions' || entry.profile.rules.creatureType === 'Humanoid')
    .map((entry) => entry.profile.id));
  const occupied = state.tokens
    .filter((entry) => state.combatants.some((subject) =>
      subject.profile.id === entry.combatantId && subject.life !== 'dead'))
    .map((token) => ({ token, cells: combatantSpace(state, token.combatantId).cells }));
  const grid = {
    bounds: state.bounds,
    blockedCells: [
      ...state.blockedCells,
      ...state.worldObjects.flatMap((object) => object.blocking.lineOfSight ? object.footprint : []),
    ],
  };
  const size = definition.targeting.baseSizeFeet;
  const targeting = definition.targeting;
  const candidates = Array.from({ length: state.bounds.columns + 1 }, (_column, column) => column)
    .flatMap((column) => Array.from({ length: state.bounds.rows + 1 }, (_row, row) => row)
      .flatMap((row) => {
        const center = feetPoint(column * 5, row * 5);
        if (Math.min(...actorCells.map((cell) => gridDistance(cell, { column, row }))) > targeting.rangeFeet) return [];
        if (targeting.shape === 'cube' &&
          (center.x < size / 2 || center.y < size / 2 ||
            center.x > state.bounds.columns * 5 - size / 2 ||
            center.y > state.bounds.rows * 5 - size / 2)) return [];
        const area: AreaTemplate = targeting.shape === 'sphere'
          ? { shape: 'sphere', template: { origin: center, radius: feet(size) } }
          : {
              shape: 'cube',
              template: {
                origin: feetPoint(center.x - size / 2, center.y), center,
                axis: { x: 1, y: 0 }, size: feet(size), includeOrigin: false,
              },
            };
        const cells = new Set(affectedCellsAmong(grid, area, occupied.flatMap((entry) => entry.cells))
          .map((cell) => `${String(cell.column)},${String(cell.row)}`));
        const affected = occupied.filter((entry) => entry.cells.some((cell) =>
          cells.has(`${String(cell.column)},${String(cell.row)}`)));
        const enemies = affected.filter((entry) => eligibleEnemyIds.has(entry.token.combatantId))
          .map((entry) => entry.token.combatantId).sort();
        if (enemies.length === 0) return [];
        const eligible = affected.filter((entry) => definition.id !== 'calm-emotions' ||
          state.combatants.find((subject) => subject.profile.id === entry.token.combatantId)?.profile.rules.creatureType === 'Humanoid')
          .map((entry) => entry.token.combatantId).sort();
        const allies = affected.filter((entry) => combatantsAreAllies(state, actorId, entry.token.combatantId)).length;
        return [{ area, enemies, eligible, allies, row, column }];
      }));
  const chosen = candidates.sort((left, right) =>
    right.enemies.length - left.enemies.length || left.allies - right.allies ||
    left.row - right.row || left.column - right.column)[0];
  if (chosen === undefined) return null;
  return {
    targets: chosen.eligible.map(target), area: chosen.area,
    labelSuffix: ` [${String(size)}-ft ${definition.targeting.shape} -> ${chosen.enemies.join(', ')}]`,
  };
}

function mainUses(state: EncounterState, actorId: CombatantId): readonly MainUseOption[] {
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
        enemies.map((enemy): MainUseOption => ({
          label: `${action.name} -> ${enemy}`,
          use: { kind: 'attack', actionId: engineActionId(action.id), target: target(enemy) },
          movement: {
            preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
            engagement: { stance: action.delivery.kind === 'melee' ? 'close_to_melee' : 'maintain_range', anchor: target(enemy) },
          },
          resourceCostLabels: [],
          omittedRiders: omittedRidersForStandaloneAction(action),
        })))
    : multiattacks.flatMap((multiattack) => legalMultiattackCombinations(multiattack, actions).flatMap((combination) =>
        enemies.map((enemy): MainUseOption => {
          const sourceActionId = engineActionId(multiattack.id);
          const components: readonly EngineMultiattackComponentUse[] = combination.map((action) => ({
            kind: action.kind,
            actionId: engineActionId(action.id),
            target: target(enemy),
            omittedRiders: omittedRidersForMultiattackComponent(sourceActionId, action),
          }));
          return {
            label: `${combination.map((action) => action.name).join(' + ')} -> ${enemy}`,
            use: { kind: 'multiattack', actionId: engineActionId(multiattack.id), components },
            movement: {
              preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
              engagement: {
                stance: combination.every((action) =>
                  action.kind === 'saving_throw' || action.delivery.kind === 'melee') ? 'close_to_melee' : 'maintain_range',
                anchor: target(enemy),
              },
            },
            resourceCostLabels: [],
            omittedRiders: omittedRidersForMultiattack(multiattack, combination),
          };
        })));
  const savingThrows = actions.flatMap((action) => action.kind !== 'saving_throw' ? [] : enemies.map((enemy): MainUseOption => ({
    label: `${action.name} -> ${enemy}`,
    use: { kind: 'saving_throw' as const, actionId: engineActionId(action.id), target: target(enemy) },
    movement: {
      preference: { willingness: 'only_if_required' as const, maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' as const },
      engagement: { stance: 'close_to_melee' as const, anchor: target(enemy) },
    },
    resourceCostLabels: [],
    omittedRiders: omittedRidersForStandaloneAction(action),
  })));
  const spellUses = actions.flatMap((action) => action.kind === 'spellcasting'
    ? spellcastingUses(state, actorId, action)
    : []);
  const actorPosition = state.tokens.find((token) => token.combatantId === actorId)?.position;
  const worldObjects = actorPosition === undefined ? [] : state.worldObjects.flatMap((object) =>
    (object.classActions ?? []).flatMap((action) => {
      if (
        (action.eligibleActor !== 'either' && action.eligibleActor !== 'monster') ||
        (action.reach === 'adjacent' &&
          minimumSpaceDistanceToCells(combatantSpace(state, actorId), object.footprint) > 5) ||
        (action.uses === 'once' && worldObjectActionWasUsed(state.eventLog, object.id, action.id))
      ) return [];
      return [{
        label: `${action.id} @ ${object.name}`,
        use: { kind: 'use_world_object' as const, objectId: object.id, actionId: engineActionId(action.id) },
        movement: HOLD,
        resourceCostLabels: action.uses === 'once' ? [`world-object:${String(object.id)}:once`] : [], omittedRiders: [],
      } satisfies MainUseOption];
    }));
  return [
    ...attacks,
    ...savingThrows,
    ...spellUses,
    ...worldObjects,
    { label: 'Dodge', use: { kind: 'dodge' }, movement: HOLD, resourceCostLabels: [], omittedRiders: [] },
    { label: 'Disengage', use: { kind: 'disengage' }, movement: HOLD, resourceCostLabels: [], omittedRiders: [] },
    {
      label: 'Dash',
      use: { kind: 'dash' },
      movement: {
        preference: { willingness: 'freely', maximumFeet: subject.profile.rules.speed * 2, opportunityRisk: 'avoid' },
        engagement: { stance: 'close_to_melee', anchor: { kind: 'nearest_visible_enemy' } },
      },
      resourceCostLabels: [],
      omittedRiders: [],
    },
    { label: 'End Turn', use: { kind: 'end_turn' }, movement: HOLD, resourceCostLabels: [], omittedRiders: [] },
  ];
}

function spellSelection(
  state: EncounterState,
  actorId: CombatantId,
  spellId: string,
  saveDc: number | null,
): SpellUseSelection | null {
  const definition = spellDefinition(spellId);
  if (definition === null) return null;
  if (isHardControlDefinition(definition)) {
    return hardControlSelection(state, actorId, definition, saveDc);
  }
  if (spellId === 'calm-emotions' || spellId === 'entangle') {
    return placedAreaSelection(state, actorId, definition);
  }
  const allies = livingAllies(state, actorId);
  const enemies = livingEnemies(state, actorId);
  switch (spellId) {
    case 'bless': return { targets: allies.slice(0, 3).map(target), area: null, labelSuffix: '' };
    case 'healing-word':
    case 'cure-wounds':
    case 'lesser-restoration':
    case 'sanctuary': return { targets: allies.slice(0, 1).map(target), area: null, labelSuffix: '' };
  }
  switch (definition.targeting.kind) {
    case 'self': return { targets: [], area: null, labelSuffix: '' };
    case 'single':
    case 'multiple':
    case 'selected': return { targets: enemies.slice(0, 1).map(target), area: null, labelSuffix: '' };
    case 'all_in_range': return { targets: enemies.map(target), area: null, labelSuffix: '' };
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
  readonly omittedRiders: readonly EngineOmittedRider[];
  readonly activationChoice: EngineActivationChoiceSlot | null;
}[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  return action.spells.flatMap((spell) => {
    if (spell.manifestStatus !== 'implemented') return [];
    if (spellDefinition(spell.id)?.operation.kind === 'utility') return [];
    const poolId = monsterSpellResourcePoolId(action.id, spell);
    const maximum = monsterSpellMaximumUses(spell);
    const remaining = poolId === null
      ? null
      : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
    if (remaining !== null && remaining < 1) return [];
    const selection = spellSelection(
      state,
      actorId,
      spell.id,
      action.saveDc.kind === 'present' ? action.saveDc.value : null,
    );
    if (selection === null || (selection.targets.length === 0 &&
      spellDefinition(spell.id)?.targeting.kind !== 'self')) return [];
    return [{
      label: `${action.id}/${spell.id}${maximum === null ? '' : ` (${String(remaining)}/${String(maximum)})`}${selection.labelSuffix}`,
      use: {
        kind: 'cast_spell',
        sourceActionId: engineActionId(action.id),
        spellId: engineSpellId(spell.id),
        targets: selection.targets,
        area: selection.area,
      },
      movement: HOLD,
      resourceCostLabels: poolId === null ? [] : [`${String(poolId)}:${String(remaining)}/${String(maximum)}`],
      omittedRiders: [],
      activationChoice: spell.id === 'command'
        ? { kind: 'command_word', values: ['approach', 'flee', 'grovel', 'halt', 'drop'] }
        : spell.id === 'dispel-evil-and-good'
          ? { kind: 'dispel_evil_and_good_mode', values: ['break_enchantment', 'dismissal'] }
          : spell.id === 'calm-emotions'
            ? {
                kind: 'calm_emotions_per_target',
                targetIds: selection.targets.map((entry) => entry.combatantId),
                values: ['suppress_charmed_frightened', 'indifferent_toward_monster_side'],
              }
            : null,
    }];
  });
}

interface BonusUseOption {
  readonly label: string;
  readonly use: EngineBonusActionUse;
  readonly resourceCostLabels: readonly string[];
  readonly activationChoice?: EngineActivationChoiceSlot | null;
}

function bonusUses(state: EncounterState, actorId: CombatantId): readonly BonusUseOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster' || subject.life !== 'living' || !subject.turn.bonusActionAvailable) {
    return [];
  }
  return monsterBonusActions(state, actorId).flatMap((action: MonsterBonusAction): readonly BonusUseOption[] => {
    switch (action.kind) {
      case 'spellcasting': return spellcastingUses(state, actorId, action).map(({ label, use, resourceCostLabels, activationChoice }) => ({ label, use, resourceCostLabels, activationChoice }));
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
      case 'spell_choice': {
        const remaining = subject.limitedResources?.find((pool) =>
          pool.id === monsterSpellResourcePoolId(action.id, action.spells[0] as (typeof action.spells)[number]))?.remaining ?? action.uses;
        if (remaining < 1 || action.spells.length !== 2 ||
          !action.spells.every((spell) => spell.manifestStatus === 'implemented')) return [];
        const ally = livingAllies(state, actorId)[0];
        if (ally === undefined) return [];
        return [{
          label: `${action.name} (${String(remaining)}/${String(action.uses)})`,
          use: {
            kind: 'cast_spell', sourceActionId: engineActionId(action.id),
            spellId: engineSpellId('cure-wounds'), targets: [target(ally)], area: null,
          },
          resourceCostLabels: [`${String(monsterSpellResourcePoolId(action.id, action.spells[0] as (typeof action.spells)[number]))}:${String(remaining)}/${String(action.uses)}`],
          activationChoice: { kind: 'unicorns_blessing_spell', values: ['cure-wounds', 'lesser-restoration'] },
        }];
      }
      case 'teleport':
      case 'healing':
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
  omittedRiders: readonly EngineOmittedRider[],
  activationChoice: EngineActivationChoiceSlot | null,
): EngineOfferableOption {
  const body = {
    actorId, revision, label, movement, actionSlots, resourceCostLabels, omittedRiders,
    ...(activationChoice === null ? {} : { activationChoice }),
  };
  return {
    optionId: engineOptionId(`option:${String(revision)}:${sha256(canonicalJson(body)).slice(0, 48)}`),
    ...body,
  };
}

function declaredIdentity(optionValue: EngineOfferableOption): EngineDeclaredOptionIdentity {
  const primary = optionValue.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (primary === undefined || primary.kind !== 'disengage') {
    throw new RangeError('Only a no-effect Disengage executable can become human-only during A1.');
  }
  return { kind: 'standard_action', action: 'disengage' };
}

function humanOnlyOption(
  revision: number,
  actorId: CombatantId,
  label: string,
  declaredOption: EngineDeclaredOptionIdentity,
  noModeledEffect: EngineHumanOnlyOption['noModeledEffect'],
): EngineHumanOnlyOption {
  const body = { actorId, revision, label, declaredOption, noModeledEffect };
  return {
    optionId: engineHumanOptionId(`human-option:${String(revision)}:${sha256(canonicalJson(body)).slice(0, 48)}`),
    ...body,
  };
}

function unsupportedSpellCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const actions = [
    ...declaredMonsterActions(state, actorId).map((action) => ({ action, slot: 'main' as const })),
    ...declaredMonsterBonusActions(state, actorId).map((action) => ({ action, slot: 'bonus' as const })),
  ];
  return actions.flatMap(({ action, slot }) => {
    if (action.kind !== 'spellcasting' || action.execution?.kind === 'absent') return [];
    return action.spells.flatMap((spell) => {
      const poolId = monsterSpellResourcePoolId(action.id, spell);
      const remaining = poolId === null
        ? null
        : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
      if (remaining !== null && remaining < 1) return [];
      const definition = spellDefinition(spell.id);
      const limitation: Extract<EngineOptionModelingCandidate, { readonly kind: 'unsupported_spell' }>['limitation'] | null =
        spell.manifestStatus !== 'implemented'
          ? 'not_in_manifest'
          : definition === null
            ? 'definition_unavailable'
            : definition.operation.kind === 'utility'
              ? 'utility_operation_unmodeled'
              : spellSelection(
                  state,
                  actorId,
                  spell.id,
                  action.saveDc.kind === 'present' ? action.saveDc.value : null,
                ) === null
                ? 'targeting_unresolved'
                : null;
      if (limitation === null) return [];
      const modeling = classifyOptionModeling(state, {
        kind: 'unsupported_spell',
        sourceActionId: engineActionId(action.id),
        spellId: engineSpellId(spell.id),
        limitation,
      });
      if (modeling.kind === 'primary_effect_modeled') {
        throw new RangeError('An unsupported spell candidate cannot be offerable.');
      }
      const maximum = monsterSpellMaximumUses(spell);
      const label = `${action.id}/${spell.id}${maximum === null ? '' : ` (${String(remaining)}/${String(maximum)})`}`;
      return [humanOnlyOption(
        revision,
        actorId,
        label,
        {
          kind: 'spell',
          sourceActionId: engineActionId(action.id),
          spellId: engineSpellId(spell.id),
          slot,
        },
        modeling.reason,
      )];
    });
  });
}

function unsupportedActionCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  return declaredMonsterActions(state, actorId).flatMap((action) => {
    if (action.execution?.kind !== 'absent') return [];
    switch (action.kind) {
      case 'attack':
      case 'multiattack': return [];
      case 'saving_throw':
      case 'spellcasting': break;
    }
    const declaredActionId = action.id;
    const actionId = engineActionId(declaredActionId);
    const modeling = classifyOptionModeling(state, {
      kind: 'unsupported_action',
      actionId,
      actionKind: action.kind,
      sourceNote: action.execution.note,
    });
    if (modeling.kind === 'primary_effect_modeled') {
      throw new RangeError('An unsupported action candidate cannot be offerable.');
    }
    return [humanOnlyOption(
      revision,
      actorId,
      declaredActionId,
      { kind: 'action', actionId, actionKind: action.kind },
      modeling.reason,
    )];
  });
}

function unsupportedBonusActionCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  return declaredMonsterBonusActions(state, actorId).flatMap((action) => {
    if (!('execution' in action) || action.execution.kind !== 'absent') return [];
    const declaredActionId = 'id' in action ? action.id : `bonus:${action.kind}`;
    const actionId = engineActionId(declaredActionId);
    const modeling = classifyOptionModeling(state, {
      kind: 'unsupported_action',
      actionId,
      actionKind: action.kind,
      sourceNote: action.execution.note,
    });
    if (modeling.kind === 'primary_effect_modeled') {
      throw new RangeError('An unsupported bonus-action candidate cannot be offerable.');
    }
    return [humanOnlyOption(
      revision,
      actorId,
      declaredActionId,
      { kind: 'action', actionId, actionKind: action.kind },
      modeling.reason,
    )];
  });
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

export interface EngineActorOptionPartition {
  readonly offerable: readonly EngineOfferableOption[];
  readonly humanOnly: readonly EngineHumanOnlyOption[];
  readonly candidates: readonly EngineOptionCandidate[];
}

export interface HiddenOptionRecord {
  readonly actorId: CombatantId;
  readonly humanOptionId: EngineHumanOptionId;
  readonly declaredOption: EngineDeclaredOptionIdentity;
  readonly reason: EngineHumanOnlyOption['noModeledEffect'];
}

export function engineActorOptions(
  state: EncounterState,
  actorId: CombatantId,
  revision = state.revision,
): EngineActorOptionPartition {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster') return { offerable: [], humanOnly: [], candidates: [] };
  const main = mainUses(state, actorId);
  const bonus = bonusUses(state, actorId);
  const values = main.flatMap((mainUse) => {
    const mainSlot: EngineActionSlotUse = { slot: 'main', use: mainUse.use };
    return [
      option(
        revision, actorId, mainUse.label, mainUse.movement, [mainSlot],
        mainUse.resourceCostLabels, mainUse.omittedRiders, mainUse.activationChoice ?? null,
      ),
      ...bonus.filter((bonusUse) => (mainUse.activationChoice ?? null) === null ||
        (bonusUse.activationChoice ?? null) === null).map((bonusUse) => option(
        revision,
        actorId,
        `${mainUse.label} + ${bonusUse.label}`,
        movementWithBonusUse(mainUse.movement, bonusUse.use, subject.profile.rules.speed),
        [mainSlot, { slot: 'bonus', use: bonusUse.use }],
        [...mainUse.resourceCostLabels, ...bonusUse.resourceCostLabels],
        mainUse.omittedRiders,
        mainUse.activationChoice ?? bonusUse.activationChoice ?? null,
      )),
    ];
  });
  const offerable: EngineOfferableOption[] = [];
  const humanOnly: EngineHumanOnlyOption[] = [
    ...unsupportedActionCandidates(state, actorId, revision),
    ...unsupportedBonusActionCandidates(state, actorId, revision),
    ...unsupportedSpellCandidates(state, actorId, revision),
  ];
  for (const candidate of values) {
    const modeling = classifyOptionModeling(state, {
      kind: 'executable',
      actorId: candidate.actorId,
      movement: candidate.movement,
      actionSlots: candidate.actionSlots,
    });
    if (modeling.kind === 'primary_effect_modeled') offerable.push(candidate);
    else humanOnly.push(humanOnlyOption(
      revision,
      actorId,
      candidate.label,
      declaredIdentity(candidate),
      modeling.reason,
    ));
  }
  offerable.sort((left, right) => left.label.localeCompare(right.label) ||
    left.optionId.localeCompare(right.optionId));
  humanOnly.sort((left, right) => left.label.localeCompare(right.label) ||
    left.optionId.localeCompare(right.optionId));
  return { offerable, humanOnly, candidates: [...offerable, ...humanOnly] };
}

export function hiddenOptionRecords(
  state: EncounterState,
  actorIds: readonly CombatantId[],
  revision: number,
): readonly HiddenOptionRecord[] {
  return [...new Set(actorIds)].sort((left, right) => left.localeCompare(right)).flatMap((actorId) =>
    engineActorOptions(state, actorId, revision).humanOnly.map((option) => ({
      actorId,
      humanOptionId: option.optionId,
      declaredOption: option.declaredOption,
      reason: option.noModeledEffect,
    })),
  );
}
