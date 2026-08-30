import { combatantsAreAllies } from '../combat/allies';
import { conditionSpeedPenaltyFeet, exhaustionPenalty, isIncapacitated } from '../combat/conditions';
import { creatureSizes } from '../domain/enums';
import type {
  EncounterCombatantState,
  EncounterState,
} from '../combat/encounter';
import type { AppliedCondition, ExhaustionLevel } from '../combat/conditions';
import { gridDistance, type GridCell } from '../combat/grid';
import { findPath, findPathToAny } from '../combat/movement';
import { persistentAreaContains } from '../combat/persistent-areas';
import type { EffectPayload, EncounterEffect } from '../combat/effects';
import { monsterAttackRange, monsterAttackRollModeSources } from '../combat/monster-commands';
import {
  evaluateTacticalAttack,
  tacticalRangeVerdict,
  type AttackRollModeSource,
  type TacticalAttackEvaluation,
  type TacticalRangeBand,
  type TacticalUnresolvedReason,
} from '../combat/tactical-evaluator';
import type { MonsterAction, MonsterAttackAction, MonsterBonusAction, MonsterSpellReference } from '../combat/statblock';
import { monsterSpellMaximumUses, monsterSpellResourcePoolId } from '../combat/statblock';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import {
  engineZoneId,
  feet,
  type CombatantId,
  type EngineZoneId,
} from '../combat/values';
import { wildShapeRulesLens } from '../combat/wild-shape';
import {
  environmentLightAt,
  environmentObscurementAt,
  isEnvironmentDifficultTerrain,
  type CoverTier,
  type WorldObject,
} from '../combat/world-objects';
import { availableEngineActorOptions } from './intent-resolver';

export type EngineProjectedAttackDelivery = 'melee' | 'ranged' | 'melee_or_ranged';

export type EngineTargetSelector =
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | {
      readonly kind:
        | 'nearest_visible_enemy'
        | 'lowest_hp_visible_enemy'
        | 'most_injured_visible_ally'
        | 'current_threat';
    }
  | {
      readonly kind: 'enemy_threatening_ally';
      readonly allyId: CombatantId;
    };

export interface EnginePathRequest {
  readonly actorId: CombatantId;
  readonly destination: GridCell;
  readonly movement: 'normal' | 'dash';
  readonly maximumFeet?: number;
}

export type EnginePathResult =
  | {
      readonly legal: true;
      readonly cells: readonly GridCell[];
      readonly costFeet: number;
      readonly budgetFeet: number;
    }
  | {
      readonly legal: false;
      readonly code: 'actor_not_placed' | 'destination_unreachable' | 'insufficient_movement';
    };

export interface EngineReachRequest {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly actionId: string;
  readonly origin?: GridCell;
}

export type EngineReachResult =
  | {
      readonly legal: true;
      readonly distanceFeet: number;
      readonly rangeFeet: number;
      readonly rangeBand: Exclude<TacticalRangeBand, 'out'>;
      readonly normalRangeFeet: number;
      readonly longRangeFeet: number | null;
    }
  | {
      readonly legal: false;
      readonly codes: readonly (
        | 'actor_not_placed_monster'
        | 'target_absent'
        | 'target_same_side'
        | 'target_not_placed'
        | 'action_absent'
        | 'action_range_unresolved'
        | 'target_out_of_range'
      )[];
    };

export interface EngineQueryPort {
  combatant(state: EncounterState, id: CombatantId): EncounterCombatantState | null;
  tokenPosition(state: EncounterState, id: CombatantId): GridCell | null;
  sameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean;
  actions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[];
  resolveTarget(
    state: EncounterState,
    actorId: CombatantId,
    selector: EngineTargetSelector,
  ): CombatantId | null;
  path(state: EncounterState, request: EnginePathRequest): EnginePathResult;
  reach(state: EncounterState, request: EngineReachRequest): EngineReachResult;
  tacticalAttack(
    state: EncounterState,
    actorId: CombatantId,
    targetId: CombatantId,
    actionId: string,
  ): TacticalAttackEvaluation | null;
  cover(state: EncounterState, actorId: CombatantId, targetId: CombatantId): {
    readonly tier: 'none' | 'half' | 'three_quarters' | 'total';
    readonly sourceIds: readonly string[];
  } | null;
  visibility(state: EncounterState, actorId: CombatantId, targetId: CombatantId): {
    readonly visible: boolean;
    readonly reciprocal: boolean;
    readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'unknown';
    readonly reason: string | null;
  } | null;
}

type PlanningRollDefenseEffect = EncounterEffect & {
  readonly payload: Extract<EffectPayload, { readonly kind: 'roll_defense_modifier' }>;
};

function isPlanningRollDefenseEffect(effect: EncounterEffect): effect is PlanningRollDefenseEffect {
  return effect.payload.kind === 'roll_defense_modifier';
}

function planningRollDefenseApplies(
  state: EncounterState,
  effect: PlanningRollDefenseEffect,
  eligible: CombatantId,
  opposing: CombatantId,
): boolean {
  const eligibility = effect.payload.eligibility;
  switch (eligibility.kind) {
    case 'effect_targets': return effect.targets.includes(eligible);
    case 'source_against_effect_targets': return effect.source === eligible &&
      effect.targets.includes(opposing);
    case 'effect_targets_against_creatures_other_than_source': return effect.targets.includes(eligible) &&
      opposing !== effect.source;
    case 'allies_within_aura': {
      const eligiblePosition = state.tokens.find((entry) => entry.combatantId === eligible)?.position;
      const sourcePosition = state.tokens.find((entry) => entry.combatantId === effect.source)?.position;
      return eligibility.savingThrowCause === 'any' &&
        eligiblePosition !== undefined && sourcePosition !== undefined &&
        combatantsAreAllies(state, eligible, effect.source) &&
        gridDistance(eligiblePosition, sourcePosition) <= eligibility.radiusFeet;
    }
  }
}

function planningArmorClass(
  state: EncounterState,
  target: EncounterCombatantState,
  attackerId: CombatantId,
): number {
  let bonus = 0;
  let floor = 0;
  let slowPenalty = 0;
  for (const effect of state.effects) {
    if (!effect.targets.includes(target.profile.id)) continue;
    const payload = effect.payload;
    if (payload.kind === 'armor_class_modifier') {
      if ('minimum' in payload) floor = Math.max(floor, payload.minimum);
      else if (payload.againstAttacker === undefined || payload.againstAttacker === attackerId) {
        bonus += payload.amount;
      }
    } else if (payload.kind === 'shield_defense') {
      bonus += payload.armorClassBonus;
    } else if (payload.kind === 'slow') {
      slowPenalty = Math.max(slowPenalty, payload.armorClassPenalty);
    } else if (
      isPlanningRollDefenseEffect(effect) &&
      effect.payload.scopes.includes('armor_class') &&
      effect.payload.modifier.kind === 'flat' &&
      planningRollDefenseApplies(state, effect, target.profile.id, attackerId)
    ) {
      bonus += effect.payload.modifier.amount;
    }
  }
  return Math.max(rulesFor(target).armorClass + bonus - slowPenalty, floor);
}

function planningAttackRollSources(
  state: EncounterState,
  action: MonsterAttackAction,
  actorId: CombatantId,
  targetId: CombatantId,
  visible: { readonly visible: boolean; readonly reciprocal: boolean },
): readonly AttackRollModeSource[] {
  const sources: AttackRollModeSource[] = [];
  if (!visible.visible) {
    sources.push({ mode: 'disadvantage', reason: 'unseen_target_disadvantage' });
  }
  if (!visible.reciprocal) {
    sources.push({ mode: 'advantage', reason: 'unseen_attacker_advantage' });
  }
  const actorPosition = state.tokens.find((entry) => entry.combatantId === actorId)?.position;
  const targetPosition = state.tokens.find((entry) => entry.combatantId === targetId)?.position;
  const distance = actorPosition === undefined || targetPosition === undefined
    ? Number.POSITIVE_INFINITY
    : gridDistance(actorPosition, targetPosition);
  const actor = combatant(state, actorId);
  const piercesVisualIllusion = actor !== null && rulesFor(actor).senses.some((sense) =>
    (sense.kind === 'blindsight' || sense.kind === 'truesight') && distance <= sense.rangeFeet);
  for (const effect of state.effects) {
    const payload = effect.payload;
    if (payload.kind === 'faerie_fire' && effect.targets.includes(targetId)) {
      sources.push({ mode: payload.attackModeAgainstTarget, reason: 'faerie_fire_advantage' });
      continue;
    }
    if (
      payload.kind === 'attacks_against_target_roll_mode' &&
      effect.targets.includes(targetId) &&
      !piercesVisualIllusion
    ) {
      sources.push({ mode: payload.mode, reason: 'effect_disadvantage' });
      continue;
    }
    if (payload.kind === 'attack_roll_mode_modifier') {
      const appliesTo = payload.appliesTo;
      const applies =
        ((appliesTo.kind === 'next_attack_against_target' ||
          appliesTo.kind === 'attacks_against_target') && effect.targets.includes(targetId)) ||
        ((appliesTo.kind === 'next_attack_by_target' ||
          appliesTo.kind === 'all_attacks_by_target') && effect.targets.includes(actorId)) ||
        (appliesTo.kind === 'attacks_by_target' && effect.targets.includes(actorId) &&
          appliesTo.attackIds.includes(action.id));
      if (applies) sources.push({
        mode: payload.mode,
        reason: payload.mode === 'advantage' ? 'effect_advantage' : 'effect_disadvantage',
      });
      continue;
    }
    if (!isPlanningRollDefenseEffect(effect) || effect.payload.modifier.kind !== 'roll_mode') continue;
    const made = effect.payload.scopes.includes('attack_rolls_made') &&
      planningRollDefenseApplies(state, effect, actorId, targetId);
    const against = effect.payload.scopes.includes('attack_rolls_against') &&
      planningRollDefenseApplies(state, effect, targetId, actorId);
    if (made || against) sources.push({
      mode: effect.payload.modifier.mode,
      reason: effect.payload.modifier.mode === 'advantage'
        ? 'roll_defense_advantage'
        : 'roll_defense_disadvantage',
    });
  }
  const target = combatant(state, targetId);
  if (
    target?.turn.dodging === true &&
    visible.reciprocal &&
    enginePlanningSpeedFeet(state, targetId) > 0 &&
    !isIncapacitated(enginePlanningConditions(state, targetId))
  ) {
    sources.push({ mode: 'disadvantage', reason: 'dodge_disadvantage' });
  }
  return sources;
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState | null {
  return state.combatants.find((candidate) => candidate.profile.id === id) ?? null;
}

function rulesFor(subject: EncounterCombatantState): EncounterCombatantState['profile']['rules'] {
  if (subject.wildShape !== undefined) {
    return wildShapeRulesLens(subject.profile.rules, subject.wildShape);
  }
  return subject.profile.rules;
}

/** Canonical active-pool numerator for planning, guards, and projections. */
export function enginePlanningHitPoints(
  state: EncounterState,
  subjectId: CombatantId,
): number {
  const subject = combatant(state, subjectId);
  if (subject === null) return 0;
  if (subject.wildShape !== undefined) return subject.wildShape.physical.hitPoints;
  if (subject.form !== undefined) return subject.form.hitPoints;
  return subject.hitPoints;
}

/** Canonical active-pool denominator; temporary HP is deliberately excluded. */
export function enginePlanningHitPointMaximum(
  state: EncounterState,
  subjectId: CombatantId,
): number {
  const subject = combatant(state, subjectId);
  if (subject === null) return 0;
  const activePoolMaximum = subject.wildShape?.physical.hitPointMaximum ??
    subject.form?.hitPointMaximum ??
    subject.profile.rules.hitPointMaximum;
  return state.effects.reduce((maximum, effect) =>
    effect.targets.includes(subjectId) && effect.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + effect.payload.amount
      : maximum, activePoolMaximum);
}

/** One canonical concentration query covers owned effects and persistent areas. */
export function engineConcentrationActive(
  state: EncounterState,
  subjectId: CombatantId,
): boolean {
  return state.effects.some((effect) => effect.concentrationOwner === subjectId) ||
    state.persistentAreas.some((area) =>
      area.owner === subjectId && area.duration.kind === 'concentration' && area.duration.remaining > 0);
}

export interface EnginePlanningCombatantFacts {
  readonly conditionFlags: readonly AppliedCondition[];
  readonly temporaryHitPoints: number;
  readonly spellSlots: readonly { readonly level: number; readonly remaining: number }[];
  readonly legendaryActionUsesRemaining: number;
  readonly legendaryResistanceUsesRemaining: number;
  readonly concentrating: boolean;
}

function engineAppliedConditions(
  effect: EncounterState['effects'][number],
): readonly AppliedCondition[] {
  const payload = effect.payload;
  if (payload.kind === 'ensnaring_strike' || payload.kind === 'banishment') {
    return [{ name: payload.condition }];
  }
  if (payload.kind === 'charm_monster') {
    return [{ name: payload.condition, source: effect.source }];
  }
  if (payload.kind === 'hypnotic_pattern') {
    return payload.conditions.map((condition) => condition === 'Charmed'
      ? { name: condition, source: effect.source }
      : { name: condition });
  }
  if (payload.kind === 'fear') return [{ name: 'Frightened', source: effect.source }];
  if (payload.kind === 'web_area') return [{ name: 'Restrained' }];
  if (payload.kind === 'condition_bundle') {
    return payload.conditions.map((condition) =>
      condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
        ? { name: condition, source: effect.source }
        : { name: condition });
  }
  if (payload.kind === 'sleep_sequence') return [{ name: payload.initial }];
  if (payload.kind === 'exhaustion') return [{ name: 'Exhaustion', level: payload.level }];
  if (payload.kind !== 'condition') return [];
  switch (payload.condition) {
    case 'Charmed':
    case 'Frightened':
    case 'Grappled': return [{ name: payload.condition, source: effect.source }];
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
    case 'Unconscious': return [{ name: payload.condition }];
  }
}

/** Query-only mirror of the canonical condition identity projection. */
export function enginePlanningConditions(
  state: EncounterState,
  subjectId: CombatantId,
): readonly AppliedCondition[] {
  const subject = combatant(state, subjectId);
  if (subject === null) return [];
  const conditions: AppliedCondition[] = [];
  const seen = new Set<string>();
  let exhaustion = 0;
  for (const effect of state.effects) {
    if (!effect.targets.includes(subjectId)) continue;
    for (const condition of engineAppliedConditions(effect)) {
      if (condition.name === 'Exhaustion') {
        exhaustion += condition.level;
        continue;
      }
      if (condition.name === 'Invisible' && state.effects.some((candidate) =>
        candidate.targets.includes(subjectId) && candidate.payload.kind === 'faerie_fire' &&
        candidate.payload.preventsInvisibleConditionBenefit)) continue;
      const key = 'source' in condition ? `${condition.name}:${condition.source}` : condition.name;
      if (seen.has(key)) continue;
      seen.add(key);
      conditions.push(condition);
    }
  }
  if (exhaustion > 0) {
    conditions.push({
      name: 'Exhaustion',
      level: Math.min(6, exhaustion) as ExhaustionLevel,
    });
  }
  if (subject.life === 'dying' && !conditions.some((condition) => condition.name === 'Unconscious')) {
    conditions.push({ name: 'Unconscious' });
  }
  return conditions;
}

/** Canonical query-only movement speed, including active typed modifiers. */
export function enginePlanningSpeedFeet(
  state: EncounterState,
  subjectId: CombatantId,
): number {
  const subject = combatant(state, subjectId);
  if (subject === null) return 0;
  const penalty = conditionSpeedPenaltyFeet(enginePlanningConditions(state, subjectId));
  if (penalty === Number.NEGATIVE_INFINITY) return 0;
  const modifiers = state.effects.flatMap((effect) =>
    effect.targets.includes(subjectId) && effect.payload.kind === 'movement_modifier'
      ? [effect.payload]
      : []);
  const immuneToReduction = modifiers.some((payload) =>
    'magicalSpeedReductionImmunity' in payload && payload.magicalSpeedReductionImmunity);
  const speeds = new Map<'walking' | 'flying' | 'climbing' | 'swimming', number>([
    ['walking', rulesFor(subject).speed + penalty],
  ]);
  for (const payload of modifiers) {
    if ('speedDeltaFeet' in payload) {
      speeds.set('walking', (speeds.get('walking') ?? 0) + payload.speedDeltaFeet);
      continue;
    }
    switch (payload.speedChange.kind) {
      case 'set':
        for (const mode of speeds.keys()) speeds.set(mode, payload.speedChange.speedFeet);
        break;
      case 'increase':
        for (const [mode, speed] of speeds) speeds.set(mode, speed + payload.speedChange.feet);
        break;
      case 'reduce':
        if (!immuneToReduction) {
          for (const [mode, speed] of speeds) {
            speeds.set(mode, payload.speedChange.reduction.kind === 'feet'
              ? speed - payload.speedChange.reduction.feet
              : speed * payload.speedChange.reduction.multiplier);
          }
        }
        break;
    }
    const walking = Math.max(0, speeds.get('walking') ?? 0);
    for (const grant of payload.modeGrants) {
      speeds.set(grant.mode, grant.speed.kind === 'fixed' ? grant.speed.feet : walking);
    }
  }
  const ordinarySpeed = Math.max(0, ...speeds.values());
  const slowMultiplier = state.effects.reduce((lowest, effect) =>
    effect.targets.includes(subjectId) && effect.payload.kind === 'slow'
      ? Math.min(lowest, effect.payload.speedMultiplier)
      : lowest, 1);
  return ordinarySpeed * slowMultiplier;
}

export interface EnginePlanningSemanticZone {
  readonly id: EngineZoneId;
  readonly kind: 'persistent_area' | 'authored_encounter_zone';
  readonly memberCombatantIds: readonly CombatantId[];
  readonly active: boolean;
}

export function enginePlanningCombatantFacts(
  state: EncounterState,
  subjectId: CombatantId,
): EnginePlanningCombatantFacts {
  const subject = combatant(state, subjectId);
  if (subject === null) {
    return {
      conditionFlags: [],
      temporaryHitPoints: 0,
      spellSlots: [],
      legendaryActionUsesRemaining: 0,
      legendaryResistanceUsesRemaining: 0,
      concentrating: false,
    };
  }
  return {
    conditionFlags: enginePlanningConditions(state, subjectId),
    temporaryHitPoints: subject.temporaryHitPoints,
    spellSlots: subject.spellSlots.map((slot) => ({
      level: slot.level,
      remaining: slot.remaining,
    })),
    legendaryActionUsesRemaining: subject.legendary?.actionUsesRemaining ?? 0,
    legendaryResistanceUsesRemaining: subject.legendary?.resistanceUsesRemaining ?? 0,
    concentrating: engineConcentrationActive(state, subjectId),
  };
}

export function enginePlanningSemanticZones(
  state: EncounterState,
): readonly EnginePlanningSemanticZone[] {
  const persistentAreas = state.persistentAreas.map((area) => ({
      id: engineZoneId(String(area.id)),
      kind: 'persistent_area' as const,
      memberCombatantIds: [...area.members].sort((left, right) => left.localeCompare(right)),
      active: area.duration.remaining > 0,
    }));
  const positions = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
  const authoredZones = (state.environment.movementRegions ?? []).map((region) => ({
    id: engineZoneId(region.id),
    kind: 'authored_encounter_zone' as const,
    memberCombatantIds: state.combatants
      .filter((subject) => subject.life !== 'dead')
      .flatMap((subject) => {
        const position = positions.get(subject.profile.id);
        return position !== undefined && region.cells.some((cell) => cellKey(cell) === cellKey(position))
          ? [subject.profile.id]
          : [];
      })
      .sort((left, right) => left.localeCompare(right)),
    active: true,
  }));
  return [...persistentAreas, ...authoredZones]
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function monsterActions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[] {
  const subject = combatant(state, actorId);
  if (subject === null) return [];
  if (subject.wildShape !== undefined) return subject.wildShape.physical.actions;
  if (subject.form !== undefined) return subject.form.availableActions;
  if (subject.profile.kind !== 'monster') return [];
  const statblockId = subject.profile.statblockId;
  for (const pack of state.contentPacks ?? []) {
    const imported = pack.monsters.find((monster) => monster.statblock.id === statblockId);
    if (imported !== undefined) return imported.actions;
  }
  const lookup = lookupBundledMonster(String(statblockId));
  if (lookup.status !== 'resolved' || lookup.entry.kind !== 'static') return [];
  const actions = lookup.entry.statblock.sourceDetails.actions;
  return actions.kind === 'present' ? actions.value : [];
}

export function monsterBonusActions(
  state: EncounterState,
  actorId: CombatantId,
): readonly MonsterBonusAction[] {
  const subject = combatant(state, actorId);
  if (subject?.profile.kind !== 'monster' || subject.life === 'dead') return [];
  const statblockId = subject.profile.statblockId;
  for (const pack of state.contentPacks ?? []) {
    const imported = pack.monsters.find((monster) => monster.statblock.id === statblockId);
    if (imported !== undefined) {
      const bonusActions = imported.statblock.sourceDetails.bonusActions;
      return bonusActions.kind === 'present' ? bonusActions.value : [];
    }
  }
  const lookup = lookupBundledMonster(String(statblockId));
  if (lookup.status !== 'resolved' || lookup.entry.kind !== 'static') return [];
  const bonusActions = lookup.entry.statblock.sourceDetails.bonusActions;
  return bonusActions.kind === 'present' ? bonusActions.value : [];
}

function interveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const cells: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      cells.push(cell);
    }
  }
  return cells;
}

function objectOccupies(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

function hasLineOfSight(state: EncounterState, from: GridCell, to: GridCell): boolean {
  const blocked = new Set(state.worldObjects
    .flatMap((object) => object.blocking.lineOfSight ? object.footprint : [])
    .map(cellKey));
  return interveningCells(from, to).every((cell) => !blocked.has(cellKey(cell)));
}

const COVER_ORDER: Readonly<Record<CoverTier, number>> = {
  none: 0,
  half: 1,
  three_quarters: 2,
  total: 3,
};

function coverBetweenObjects(objects: readonly WorldObject[], from: GridCell, to: GridCell): CoverTier {
  let cover: CoverTier = 'none';
  for (const cell of interveningCells(from, to)) {
    for (const object of objects) {
      if (objectOccupies(object, cell) && COVER_ORDER[object.blocking.cover] > COVER_ORDER[cover]) {
        cover = object.blocking.cover;
      }
    }
  }
  return cover;
}

function effectConditionNames(state: EncounterState, id: CombatantId): ReadonlySet<string> {
  const names = new Set<string>();
  for (const effect of state.effects) {
    if (!effect.targets.includes(id)) continue;
    const payload = effect.payload;
    if (payload.kind === 'condition') names.add(payload.condition);
    if (payload.kind === 'condition_bundle') for (const condition of payload.conditions) names.add(condition);
    if (payload.kind === 'sleep_sequence') names.add(payload.initial);
    if (payload.kind === 'web_area') names.add('Restrained');
    if (payload.kind === 'fear') names.add('Frightened');
  }
  if (combatant(state, id)?.life === 'dying') names.add('Unconscious');
  return names;
}

function isIncapacitatedByState(state: EncounterState, id: CombatantId): boolean {
  const names = effectConditionNames(state, id);
  return ['Incapacitated', 'Paralyzed', 'Petrified', 'Stunned', 'Unconscious']
    .some((name) => names.has(name));
}

function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
  const observerCell = state.tokens.find((token) => token.combatantId === observer)?.position;
  const subjectCell = state.tokens.find((token) => token.combatantId === subject)?.position;
  if (observerCell === undefined || subjectCell === undefined) return false;
  return state.persistentAreas.some((area) => {
    if (area.material?.id !== 'webs') return false;
    const origin = area.origin;
    const anchor = origin.kind === 'anchored'
      ? state.tokens.find((candidate) => candidate.combatantId === origin.combatant)?.position ?? null
      : origin.kind === 'anchored_to_object'
        ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
        : null;
    return persistentAreaContains(area, observerCell, anchor, state) &&
      persistentAreaContains(area, subjectCell, anchor, state);
  });
}

type Detection =
  | { readonly kind: 'seen'; readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' }
  | { readonly kind: 'located'; readonly sense: 'web_sense' }
  | { readonly kind: 'undetected'; readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range' };

function detect(state: EncounterState, observer: CombatantId, subject: CombatantId): Detection | null {
  const observerState = combatant(state, observer);
  const from = state.tokens.find((token) => token.combatantId === observer)?.position;
  const to = state.tokens.find((token) => token.combatantId === subject)?.position;
  if (observerState === null || combatant(state, subject) === null || from === undefined || to === undefined) return null;
  const distance = gridDistance(from, to);
  const senses = rulesFor(observerState).senses;
  if (senses.some((sense) => sense.kind === 'blindsight' && distance <= sense.rangeFeet) && hasLineOfSight(state, from, to)) {
    return { kind: 'seen', sense: 'blindsight' };
  }
  const truesight = senses.some((sense) => sense.kind === 'truesight' && distance <= sense.rangeFeet);
  if (rulesFor(observerState).detectionTraits.includes('web_sense') && sharesWebArea(state, observer, subject)) {
    return { kind: 'located', sense: 'web_sense' };
  }
  if (!hasLineOfSight(state, from, to)) return { kind: 'undetected', reason: 'blocked' };
  if (effectConditionNames(state, observer).has('Blinded')) return { kind: 'undetected', reason: 'obscured' };
  if (state.hiddenCombatants.some((entry) => entry.combatant === subject) && !truesight) return { kind: 'undetected', reason: 'hidden' };
  if (effectConditionNames(state, subject).has('Invisible') && !truesight) return { kind: 'undetected', reason: 'invisible' };
  const obscurement = environmentObscurementAt(state.environment, to);
  if (obscurement === 'heavy') return { kind: 'undetected', reason: 'obscured' };
  if (truesight) return { kind: 'seen', sense: 'truesight' };
  if (obscurement === 'magical_darkness') return { kind: 'undetected', reason: 'darkness' };
  if (environmentLightAt(state.environment, to) !== 'darkness') return { kind: 'seen', sense: 'normal_sight' };
  const darkvision = senses.some((sense) => sense.kind === 'darkvision' && distance <= sense.rangeFeet);
  return darkvision
    ? { kind: 'seen', sense: 'darkvision' }
    : { kind: 'undetected', reason: senses.some((sense) => sense.kind === 'darkvision') ? 'out_of_range' : 'darkness' };
}

function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
  return state.effects.some((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier' &&
    'modeGrants' in effect.payload && (effect.payload.difficultTerrainImmunity ||
      effect.payload.modeGrants.some((grant) => grant.mode === 'flying')));
}

function movementWorld(state: EncounterState) {
  return {
    bounds: state.bounds,
    canTraverseStep: () => true,
    traversal: (actorId: CombatantId, _from: GridCell, to: GridCell) => {
      const blocked = state.blockedCells.some((candidate) => cellKey(candidate) === cellKey(to)) ||
        state.worldObjects.some((object) => object.blocking.movement && objectOccupies(object, to)) ||
        (state.environment.movementRegions ?? []).some((region) => region.entry === 'blocked' &&
          region.cells.some((candidate) => cellKey(candidate) === cellKey(to)));
      if (blocked) return { kind: 'blocked' as const, reason: 'blocked cell' };
      const actor = combatant(state, actorId);
      if (actor === null) return { kind: 'blocked' as const, reason: 'unknown actor' };
      const occupants = state.tokens.flatMap((token): readonly EncounterCombatantState[] => {
        if (token.combatantId === actorId || cellKey(token.position) !== cellKey(to)) return [];
        const occupant = combatant(state, token.combatantId);
        return occupant === null || occupant.life === 'dead' ? [] : [occupant];
      });
      const actorSize = rulesFor(actor).sizeCategory;
      const canPass = (occupant: EncounterCombatantState): boolean => {
        if (combatantsAreAllies(state, actorId, occupant.profile.id) || isIncapacitatedByState(state, occupant.profile.id)) return true;
        const occupantSize = rulesFor(occupant).sizeCategory;
        if (occupantSize === 'Tiny') return true;
        if (actorSize === undefined || occupantSize === undefined) return false;
        return Math.abs(creatureSizes.indexOf(actorSize) - creatureSizes.indexOf(occupantSize)) >= 2;
      };
      if (occupants.some((occupant) => !canPass(occupant))) {
        return { kind: 'blocked' as const, reason: 'creature space cannot be traversed' };
      }
      const creatureSpaceIsDifficult = occupants.some((occupant) =>
        !combatantsAreAllies(state, actorId, occupant.profile.id) && rulesFor(occupant).sizeCategory !== 'Tiny');
      const areaDifficult = state.persistentAreas.some((area) => {
        if (!area.difficultTerrain) return false;
        const origin = area.origin;
        const anchor = origin.kind === 'anchored'
          ? state.tokens.find((token) => token.combatantId === origin.combatant)?.position ?? null
          : origin.kind === 'anchored_to_object'
            ? state.worldObjects.find((object) => object.id === origin.object)?.position ?? null
            : null;
        return persistentAreaContains(area, to, anchor, state);
      });
      const difficult = !ignoresDifficultTerrain(state, actorId) &&
        (creatureSpaceIsDifficult || isEnvironmentDifficultTerrain(state.environment, to) || areaDifficult);
      return { kind: 'enterable' as const, cost: feet(difficult ? 10 : 5), canEnd: occupants.length === 0 };
    },
  };
}

export function engineAttackRangeFeet(action: MonsterAttackAction): number {
  switch (action.delivery.kind) {
    case 'melee': return action.delivery.reachFeet;
    case 'ranged': return action.delivery.rangeFeet;
    case 'melee_or_ranged': return action.delivery.rangeFeet;
  }
}

function projectedAttackRanges(action: MonsterAction): {
  readonly attackDelivery: EngineProjectedAttackDelivery | null;
  readonly normalRangeFeet: number | null;
  readonly longRangeFeet: number | null;
} {
  if (action.kind !== 'attack') {
    return { attackDelivery: null, normalRangeFeet: null, longRangeFeet: null };
  }
  switch (action.delivery.kind) {
    case 'melee':
      return {
        attackDelivery: action.delivery.kind,
        normalRangeFeet: action.delivery.reachFeet,
        longRangeFeet: null,
      };
    case 'ranged':
      return {
        attackDelivery: action.delivery.kind,
        normalRangeFeet: action.delivery.rangeFeet,
        longRangeFeet: action.delivery.longRangeFeet.kind === 'present'
          ? action.delivery.longRangeFeet.value
          : null,
      };
    case 'melee_or_ranged':
      return {
        attackDelivery: action.delivery.kind,
        normalRangeFeet: action.delivery.rangeFeet,
        longRangeFeet: action.delivery.longRangeFeet,
      };
  }
}

export function engineActionRangeFeet(
  actions: readonly MonsterAction[],
  selected: MonsterAction,
): number | null {
  switch (selected.kind) {
    case 'attack': return engineAttackRangeFeet(selected);
    case 'saving_throw': return selected.target.rangeFeet;
    case 'multiattack': {
      const ranges = selected.actionIds.flatMap((id) => {
        const component = actions.find(
          (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === id,
        );
        return component === undefined ? [] : [engineAttackRangeFeet(component)];
      });
      return ranges.length === selected.actionIds.length && ranges.length > 0
        ? Math.min(...ranges)
        : null;
    }
    case 'spellcasting': return null;
  }
}

/** Canonical registry lens used while minting a read-only state capsule. */
export function engineActionRegistry(state: EncounterState, revision = state.revision): {
  actionsFor(combatantId: CombatantId): readonly {
    readonly actionId: string;
    readonly slot: 'main' | 'bonus';
    readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting' | 'world_object';
    readonly available: boolean;
    readonly usesMaximum: number | null;
    readonly usesRemaining: number | null;
    readonly componentActionIds: readonly string[];
    readonly combination: 'any' | 'fixed' | 'one_attack_may_be_replaced' | null;
    readonly spellIds: readonly string[];
    readonly worldObjectId: string | null;
    readonly rangeFeet: number | null;
    readonly attackDelivery: EngineProjectedAttackDelivery | null;
    readonly normalRangeFeet: number | null;
    readonly longRangeFeet: number | null;
  }[];
  approachesFor(combatantId: CombatantId): readonly {
    readonly actionId: string;
    readonly targetId: CombatantId;
    readonly minimumMovementFeet: number | null;
  }[];
  optionsFor(combatantId: CombatantId): ReturnType<typeof availableEngineActorOptions>;
  planningFactsFor(combatantId: CombatantId): EnginePlanningCombatantFacts;
  planningHitPointsFor(combatantId: CombatantId): number;
  planningHitPointMaximumFor(combatantId: CombatantId): number;
  semanticZones(): readonly EnginePlanningSemanticZone[];
} {
  return {
    actionsFor(combatantId) {
      const subject = combatant(state, combatantId);
      const actions = monsterActions(state, combatantId);
      const mainAvailable = subject?.turn.action.kind === 'available';
      const bonusAvailable = subject?.turn.bonusActionAvailable === true;
      const project = (
        action: MonsterAction | Extract<MonsterBonusAction, { readonly kind: 'saving_throw' | 'spellcasting' }>,
        slot: 'main' | 'bonus',
        spell: MonsterSpellReference | undefined,
      ) => {
        const poolId = action.kind === 'spellcasting' && spell !== undefined
          ? monsterSpellResourcePoolId(action.id, spell)
          : null;
        const usesMaximum = spell === undefined ? null : monsterSpellMaximumUses(spell);
        const usesRemaining = poolId === null
          ? usesMaximum
          : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
        return {
        actionId: action.id,
        kind: action.kind,
        slot,
        available: (slot === 'main' ? mainAvailable : bonusAvailable) &&
          (usesRemaining === null || usesRemaining > 0),
        usesMaximum,
        usesRemaining,
        componentActionIds: action.kind === 'multiattack' ? action.actionIds : [],
        combination: action.kind === 'multiattack' ? action.combination : null,
        spellIds: spell === undefined ? [] : [spell.id],
        worldObjectId: null,
        rangeFeet: engineActionRangeFeet(actions, action),
        ...projectedAttackRanges(action),
        };
      };
      const projectAction = (
        action: MonsterAction | Extract<MonsterBonusAction, { readonly kind: 'saving_throw' | 'spellcasting' }>,
        slot: 'main' | 'bonus',
      ) => action.kind === 'spellcasting'
        ? action.spells.map((spell) => project(action, slot, spell))
        : [project(action, slot, undefined)];
      return [
        ...actions.flatMap((action) => projectAction(action, 'main')),
        ...monsterBonusActions(state, combatantId).flatMap((action) =>
          action.kind === 'saving_throw' || action.kind === 'spellcasting'
            ? projectAction(action, 'bonus')
            : []),
      ].filter((action) => action.available);
    },
    approachesFor(combatantId) {
      const actor = combatant(state, combatantId);
      const start = state.tokens.find((token) => token.combatantId === combatantId)?.position;
      if (actor?.profile.kind !== 'monster' || actor.life === 'dead' || start === undefined) return [];
      const actions = monsterActions(state, combatantId);
      const targets = state.combatants
        .filter((target) => target.life !== 'dead' && !combatantsAreAllies(state, combatantId, target.profile.id))
        .sort((left, right) => left.profile.id.localeCompare(right.profile.id));
      return targets.flatMap((target) => actions.flatMap((action) => {
        const rangeFeet = engineActionRangeFeet(actions, action);
        if (rangeFeet === null) return [];
        const maintainRange = rangeFeet > actor.profile.rules.reach;
        const targetPosition = state.tokens.find(
          (token) => token.combatantId === target.profile.id,
        )?.position;
        if (targetPosition === undefined) return [];
        const result = findPathToAny(movementWorld(state), {
          actorId: combatantId,
          start,
          maximumCost: feet(maximumPathCost(state)),
          isGoal: (origin) => {
            if (maintainRange && gridDistance(origin, targetPosition) <= target.profile.rules.reach) {
              return false;
            }
            return reach(state, {
              actorId: combatantId,
              targetId: target.profile.id,
              actionId: action.id,
              origin,
            }).legal;
          },
        });
        return [{
          actionId: action.id,
          targetId: target.profile.id,
          minimumMovementFeet: result.kind === 'found' ? result.cost : null,
        }];
      }));
    },
    optionsFor(combatantId) {
      return availableEngineActorOptions(state, combatantId, canonicalEngineQueryPort, revision);
    },
    planningFactsFor(combatantId) {
      return enginePlanningCombatantFacts(state, combatantId);
    },
    planningHitPointsFor(combatantId) {
      return enginePlanningHitPoints(state, combatantId);
    },
    planningHitPointMaximumFor(combatantId) {
      return enginePlanningHitPointMaximum(state, combatantId);
    },
    semanticZones() {
      return enginePlanningSemanticZones(state);
    },
  };
}

function positionedCandidates(
  state: EncounterState,
  predicate: (candidate: EncounterCombatantState) => boolean,
): Array<{ readonly combatant: EncounterCombatantState; readonly position: GridCell }> {
  const positions = new Map(
    state.tokens.map((token) => [token.combatantId, token.position] as const),
  );
  return state.combatants.flatMap((candidate) => {
    const position = positions.get(candidate.profile.id);
    return predicate(candidate) && position !== undefined ? [{ combatant: candidate, position }] : [];
  });
}

function resolveTarget(
  state: EncounterState,
  actorId: CombatantId,
  selector: EngineTargetSelector,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const origin = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (actor === undefined || origin === undefined) return null;
  if (selector.kind === 'most_injured_visible_ally') {
    return positionedCandidates(
      state,
      (candidate) => candidate.life !== 'dead' &&
        combatantsAreAllies(state, actorId, candidate.profile.id) &&
        detect(state, actorId, candidate.profile.id)?.kind === 'seen',
    ).sort((left, right) =>
      (left.combatant.hitPoints / left.combatant.profile.rules.hitPointMaximum) -
        (right.combatant.hitPoints / right.combatant.profile.rules.hitPointMaximum) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id))[0]?.combatant.profile.id ?? null;
  }
  const anchor = selector.kind === 'enemy_threatening_ally'
    ? state.tokens.find((token) => token.combatantId === selector.allyId)?.position ?? origin
    : origin;
  const enemies = positionedCandidates(
    state,
    (candidate) => candidate.life !== 'dead' &&
      !combatantsAreAllies(state, actorId, candidate.profile.id) &&
      (
        selector.kind === 'current_threat' ||
        selector.kind === 'enemy_threatening_ally' ||
        detect(state, actorId, candidate.profile.id)?.kind === 'seen'
      ),
  );
  if (selector.kind === 'lowest_hp_visible_enemy') {
    enemies.sort((left, right) =>
      left.combatant.hitPoints - right.combatant.hitPoints ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  } else {
    enemies.sort((left, right) =>
      gridDistance(anchor, left.position) - gridDistance(anchor, right.position) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  }
  return enemies[0]?.combatant.profile.id ?? null;
}

function maximumPathCost(state: EncounterState): number {
  return state.bounds.columns * state.bounds.rows * 10;
}

function path(state: EncounterState, request: EnginePathRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const searchBudget = request.maximumFeet === undefined
    ? availableBudget
    : Math.min(availableBudget, maximumPathCost(state));
  const result = findPath(movementWorld(state), {
    actorId: request.actorId,
    start,
    goal: request.destination,
    maximumCost: feet(searchBudget),
  });
  if (result.kind === 'found') {
    return {
      legal: true,
      cells: result.cells,
      costFeet: result.cost,
      budgetFeet: availableBudget,
    };
  }
  if (request.maximumFeet !== undefined && request.maximumFeet < maximumPathCost(state)) {
    const unbounded = findPath(movementWorld(state), {
      actorId: request.actorId,
      start,
      goal: request.destination,
      maximumCost: feet(maximumPathCost(state)),
    });
    if (unbounded.kind === 'found') return { legal: false, code: 'insufficient_movement' };
  }
  return { legal: false, code: 'destination_unreachable' };
}

function reach(state: EncounterState, request: EngineReachRequest): EngineReachResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const target = state.combatants.find((candidate) => candidate.profile.id === request.targetId);
  const origin = request.origin ?? state.tokens.find(
    (token) => token.combatantId === request.actorId,
  )?.position;
  const targetPosition = state.tokens.find(
    (token) => token.combatantId === request.targetId,
  )?.position;
  const codes: Exclude<EngineReachResult, { readonly legal: true }>['codes'][number][] = [];
  if (actor?.profile.kind !== 'monster' || origin === undefined) codes.push('actor_not_placed_monster');
  if (target === undefined) codes.push('target_absent');
  else if (actor !== undefined && combatantsAreAllies(state, request.actorId, request.targetId)) {
    codes.push('target_same_side');
  }
  if (targetPosition === undefined) codes.push('target_not_placed');
  const actions = actor?.profile.kind === 'monster' ? monsterActions(state, request.actorId) : [];
  const action = actions.find((candidate) => candidate.id === request.actionId);
  if (action === undefined) codes.push('action_absent');
  const rangeFeet = action === undefined ? null : engineActionRangeFeet(actions, action);
  if (action !== undefined && rangeFeet === null) codes.push('action_range_unresolved');
  if (
    codes.length > 0 ||
    action === undefined ||
    origin === undefined ||
    targetPosition === undefined ||
    rangeFeet === null
  ) {
    return { legal: false, codes };
  }
  const distanceFeet = gridDistance(origin, targetPosition);
  if (action.kind === 'attack') {
    const verdict = tacticalRangeVerdict(origin, targetPosition, monsterAttackRange(action));
    if (verdict.status === 'unresolved') {
      return { legal: false, codes: ['action_range_unresolved'] };
    }
    if (!verdict.legal || verdict.band === 'out') {
      return { legal: false, codes: ['target_out_of_range'] };
    }
    const projected = projectedAttackRanges(action);
    return {
      legal: true,
      distanceFeet,
      rangeFeet,
      rangeBand: verdict.band,
      normalRangeFeet: projected.normalRangeFeet ?? rangeFeet,
      longRangeFeet: projected.longRangeFeet,
    };
  }
  return {
    legal: true,
    distanceFeet,
    rangeFeet,
    rangeBand: 'normal',
    normalRangeFeet: rangeFeet,
    longRangeFeet: null,
  };
}

const engineQueryPort: EngineQueryPort = {
  combatant: (state, id) => state.combatants.find((candidate) => candidate.profile.id === id) ?? null,
  tokenPosition: (state, id) => state.tokens.find((token) => token.combatantId === id)?.position ?? null,
  sameSide: (state, left, right) => combatantsAreAllies(state, left, right),
  actions: monsterActions,
  resolveTarget,
  path,
  reach,
  tacticalAttack(state, actorId, targetId, actionId) {
    const actor = combatant(state, actorId);
    const target = combatant(state, targetId);
    const actorPosition = state.tokens.find((entry) => entry.combatantId === actorId)?.position;
    const targetPosition = state.tokens.find((entry) => entry.combatantId === targetId)?.position;
    const action = monsterActions(state, actorId).find(
      (candidate): candidate is MonsterAttackAction =>
        candidate.kind === 'attack' && candidate.id === actionId,
    );
    if (
      actor === null ||
      target === null ||
      actorPosition === undefined ||
      targetPosition === undefined ||
      action === undefined
    ) return null;
    const visible = engineQueryPort.visibility(state, actorId, targetId) ?? {
      visible: false,
      reciprocal: false,
    };
    const cover = coverBetweenObjects(state.worldObjects, actorPosition, targetPosition);
    const coverBonus = cover === 'half' ? 2 : cover === 'three_quarters' ? 5 : 0;
    const madeRollDefense = state.effects.filter((effect): effect is PlanningRollDefenseEffect =>
      isPlanningRollDefenseEffect(effect) &&
      effect.payload.scopes.includes('attack_rolls_made') &&
      planningRollDefenseApplies(state, effect, actorId, targetId));
    const flatAttackBonus = madeRollDefense.reduce((sum, effect) =>
      effect.payload.kind === 'roll_defense_modifier' && effect.payload.modifier.kind === 'flat'
        ? sum + effect.payload.modifier.amount
        : sum, 0);
    const randomAttackModifier = madeRollDefense.some((effect) =>
      effect.payload.modifier.kind === 'die_rider') || state.effects.some((effect) => {
      if (!effect.targets.includes(actorId) || isPlanningRollDefenseEffect(effect)) return false;
      const payload = effect.payload;
      return payload.kind === 'attack_roll_modifier' ||
        (payload.kind === 'd20_test_modifier' && payload.tests.includes('attack_roll'));
    });
    const unresolved: TacticalUnresolvedReason[] = [
      ...(randomAttackModifier ? ['random_attack_modifier_unresolved' as const] : []),
      ...(action.damage.some((term) => term.trigger.kind !== 'always')
        ? ['conditional_damage_rider_unresolved' as const]
        : []),
      ...(cover === 'total' ? ['target_has_total_cover' as const] : []),
    ];
    return evaluateTacticalAttack({
      attackerId: actorId,
      targetId,
      attackerPosition: actorPosition,
      targetPosition,
      range: monsterAttackRange(action),
      attackBonus:
        action.attackBonus +
        exhaustionPenalty(enginePlanningConditions(state, actorId)) +
        flatAttackBonus,
      targetArmorClass: planningArmorClass(state, target, actorId) + coverBonus,
      criticalFloor: 20,
      damageTerms: action.damage
        .filter((term) => term.trigger.kind === 'always')
        .map((term) => ({ dice: term.dice })),
      attackerConditions: enginePlanningConditions(state, actorId),
      targetConditions: enginePlanningConditions(state, targetId),
      attackerCanSeeTarget: visible.visible,
      targetCanSeeAttacker: visible.reciprocal,
      rollModeSources: [
        ...planningAttackRollSources(state, action, actorId, targetId, visible),
        ...monsterAttackRollModeSources(
          action,
          actorId,
          enginePlanningConditions(state, targetId),
          enginePlanningHitPoints(state, targetId),
          enginePlanningHitPointMaximum(state, targetId),
        ),
      ],
      target: {
        hitPoints: enginePlanningHitPoints(state, targetId),
        usesDeathSaves: rulesFor(target).usesDeathSaves,
      },
      unresolvedReasons: unresolved,
    });
  },
  cover(state, actorId, targetId) {
    const from = state.tokens.find((token) => token.combatantId === actorId)?.position;
    const to = state.tokens.find((token) => token.combatantId === targetId)?.position;
    if (from === undefined || to === undefined) return null;
    return {
      tier: coverBetweenObjects(state.worldObjects, from, to),
      sourceIds: state.worldObjects
        .filter((object) => coverBetweenObjects([object], from, to) !== 'none')
        .map((object) => String(object.id))
        .sort(),
    };
  },
  visibility(state, actorId, targetId) {
    if (
      !state.combatants.some((candidate) => candidate.profile.id === actorId) ||
      !state.combatants.some((candidate) => candidate.profile.id === targetId) ||
      !state.tokens.some((token) => token.combatantId === actorId) ||
      !state.tokens.some((token) => token.combatantId === targetId)
    ) return null;
    const detection = detect(state, actorId, targetId);
    const reciprocal = detect(state, targetId, actorId);
    if (detection === null || reciprocal === null) return null;
    return {
      visible: detection.kind === 'seen',
      reciprocal: reciprocal.kind === 'seen',
      sense: detection.kind === 'seen' ? detection.sense : 'unknown',
      reason: detection.kind === 'undetected' ? detection.reason : null,
    };
  },
};

export const canonicalEngineQueryPort: EngineQueryPort = Object.freeze(engineQueryPort);
