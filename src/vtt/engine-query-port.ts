import { combatantsAreAllies } from '../combat/allies';
import { creatureSizes } from '../domain/enums';
import {
  type EncounterCombatantState,
  type EncounterState,
} from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import { findPath } from '../combat/movement';
import { persistentAreaContains } from '../combat/persistent-areas';
import { attackRangeVerdict } from '../combat/range';
import type { MonsterAction, MonsterAttackAction } from '../combat/statblock';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import { feet, type CombatantId } from '../combat/values';
import { wildShapeRulesLens } from '../combat/wild-shape';
import {
  environmentLightAt,
  environmentObscurementAt,
  isEnvironmentDifficultTerrain,
  type CoverTier,
  type WorldObject,
} from '../combat/world-objects';

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

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState | null {
  return state.combatants.find((candidate) => candidate.profile.id === id) ?? null;
}

function rulesFor(subject: EncounterCombatantState): EncounterCombatantState['profile']['rules'] {
  return subject.wildShape === undefined
    ? subject.profile.rules
    : wildShapeRulesLens(subject.profile.rules, subject.wildShape);
}

function monsterActions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[] {
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
export function engineActionRegistry(state: EncounterState): {
  actionsFor(combatantId: CombatantId): readonly {
    readonly actionId: string;
    readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting';
    readonly rangeFeet: number | null;
  }[];
} {
  return {
    actionsFor(combatantId) {
      const actions = monsterActions(state, combatantId);
      return actions.map((action) => ({
        actionId: action.id,
        kind: action.kind,
        rangeFeet: engineActionRangeFeet(actions, action),
      }));
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
  if (codes.length > 0 || origin === undefined || targetPosition === undefined || rangeFeet === null) {
    return { legal: false, codes };
  }
  const distanceFeet = gridDistance(origin, targetPosition);
  const verdict = action?.kind === 'attack' && action.delivery.kind === 'melee'
    ? attackRangeVerdict(origin, targetPosition, { kind: 'melee', reach: feet(rangeFeet) })
    : attackRangeVerdict(origin, targetPosition, {
        kind: 'ranged', normal: feet(rangeFeet), long: feet(rangeFeet),
      });
  return verdict.kind === 'illegal'
    ? { legal: false, codes: ['target_out_of_range'] }
    : { legal: true, distanceFeet, rangeFeet };
}

const engineQueryPort: EngineQueryPort = {
  combatant: (state, id) => state.combatants.find((candidate) => candidate.profile.id === id) ?? null,
  tokenPosition: (state, id) => state.tokens.find((token) => token.combatantId === id)?.position ?? null,
  sameSide: (state, left, right) => combatantsAreAllies(state, left, right),
  actions: monsterActions,
  resolveTarget,
  path,
  reach,
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
