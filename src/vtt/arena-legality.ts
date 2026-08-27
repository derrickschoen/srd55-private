import type { EncounterState } from '../combat/encounter';
import { adjacentCells, gridDistance, isCellInside, type GridCell } from '../combat/grid';
import type { MonsterAction, MonsterAttackAction } from '../combat/statblock';
import { STARTER_MONSTER_ROSTER } from '../combat/statblocks/roster';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import type { CombatantId } from '../combat/values';
import type { ArenaPromptEnvelope } from './arena-prompt';
import type {
  DecisionProgram,
  PlanAction,
  RoundPlan,
  TargetSelector,
} from './dm-bridge/round-plan-contract';

export interface ArenaPath {
  readonly cells: readonly GridCell[];
  readonly cost: number;
}

export interface ArenaIntentChoice {
  readonly action: string;
  readonly targetId: string;
  readonly maxMovementFeet: number;
  readonly acceptMelee: boolean;
}

export interface ArenaIntent extends ArenaIntentChoice {
  readonly fallback: ArenaIntentChoice | null;
}

export type ArenaIntentResult =
  | {
      readonly legal: true;
      readonly resolvedPath: readonly GridCell[];
      readonly finalPosition: GridCell;
    }
  | {
      readonly legal: false;
      readonly refusals: readonly string[];
    };

export function arenaTokenPosition(state: EncounterState, id: CombatantId): GridCell | null {
  return state.tokens.find((token) => token.combatantId === id)?.position ?? null;
}

export function arenaCombatant(state: EncounterState, id: CombatantId) {
  return state.combatants.find((candidate) => candidate.profile.id === id) ?? null;
}

export function arenaSameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean {
  return arenaCombatant(state, left)?.profile.kind === arenaCombatant(state, right)?.profile.kind;
}

export function resolveArenaTarget(
  state: EncounterState,
  actor: CombatantId,
  selector: TargetSelector,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const origin = arenaTokenPosition(state, actor);
  const acting = arenaCombatant(state, actor);
  if (origin === null || acting === null) return null;
  return state.combatants
    .filter((candidate) => candidate.profile.kind !== acting.profile.kind && candidate.life !== 'dead')
    .map((candidate) => ({
      id: candidate.profile.id,
      position: arenaTokenPosition(state, candidate.profile.id),
    }))
    .filter((candidate): candidate is { readonly id: CombatantId; readonly position: GridCell } =>
      candidate.position !== null)
    .sort((left, right) =>
      gridDistance(origin, left.position) - gridDistance(origin, right.position) ||
      left.id.localeCompare(right.id))[0]?.id ?? null;
}

export function arenaMonsterActions(
  state: EncounterState,
  actor: CombatantId,
): readonly MonsterAction[] {
  const combatant = arenaCombatant(state, actor);
  if (combatant?.profile.kind !== 'monster') return [];
  const profile = combatant.profile;
  const row = STARTER_MONSTER_ROSTER.find(
    (candidate) => candidate.id === profile.statblockId,
  );
  if (row?.statblock.sourceDetails.actions.kind !== 'present') return [];
  return row.statblock.sourceDetails.actions.value;
}

export function arenaAttackRange(action: MonsterAttackAction): number {
  switch (action.delivery.kind) {
    case 'melee': return action.delivery.reachFeet;
    case 'ranged': return action.delivery.rangeFeet;
    case 'melee_or_ranged': return action.delivery.rangeFeet;
  }
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

function blockedCellKeys(state: EncounterState): ReadonlySet<string> {
  return new Set([
    ...state.blockedCells.map(cellKey),
    ...state.worldObjects
      .filter((object) => object.blocking.movement)
      .flatMap((object) => object.footprint)
      .map(cellKey),
  ]);
}

function occupiedCellKeys(state: EncounterState, actor: CombatantId): ReadonlySet<string> {
  return new Set(state.tokens
    .filter((token) => token.combatantId !== actor)
    .map((token) => cellKey(token.position)));
}

function difficultCellKeys(state: EncounterState): ReadonlySet<string> {
  return new Set(state.environment.difficultTerrainRegions
    .flatMap((region) => region.cells)
    .map(cellKey));
}

function reconstructPath(
  origin: GridCell,
  destination: GridCell,
  previous: ReadonlyMap<string, GridCell>,
): readonly GridCell[] {
  const reversed: GridCell[] = [];
  let cursor = destination;
  while (!sameCell(cursor, origin)) {
    reversed.push(cursor);
    const predecessor = previous.get(cellKey(cursor));
    if (predecessor === undefined) throw new Error('Arena path predecessor chain is incomplete.');
    cursor = predecessor;
  }
  return reversed.reverse();
}

/** The shared arena Dijkstra search: eight-way steps cost 5 feet, or 10 in difficult terrain. */
export function arenaPathCost(
  state: EncounterState,
  actor: CombatantId,
  destination: GridCell,
  maximumCost = Number.POSITIVE_INFINITY,
): ArenaPath | null {
  const origin = arenaTokenPosition(state, actor);
  if (origin === null || !isCellInside(state.bounds, destination)) return null;
  const occupied = occupiedCellKeys(state, actor);
  const blocked = blockedCellKeys(state);
  const difficult = difficultCellKeys(state);
  const destinationKey = cellKey(destination);
  if (occupied.has(destinationKey) || blocked.has(destinationKey)) return null;
  const originKey = cellKey(origin);
  const costs = new Map<string, number>([[originKey, 0]]);
  const previous = new Map<string, GridCell>();
  const pending: Array<{ readonly cell: GridCell; readonly cost: number }> = [
    { cell: origin, cost: 0 },
  ];
  while (pending.length > 0) {
    pending.sort((left, right) =>
      left.cost - right.cost ||
      left.cell.row - right.cell.row ||
      left.cell.column - right.cell.column);
    const current = pending.shift();
    if (current === undefined) break;
    const currentKey = cellKey(current.cell);
    if (current.cost !== costs.get(currentKey)) continue;
    if (currentKey === destinationKey) {
      return {
        cells: reconstructPath(origin, destination, previous),
        cost: current.cost,
      };
    }
    for (const next of adjacentCells(state.bounds, current.cell)) {
      const key = cellKey(next);
      if (occupied.has(key) || blocked.has(key)) continue;
      const cost = current.cost + (difficult.has(key) ? 10 : 5);
      if (cost > maximumCost || cost >= (costs.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(key, cost);
      previous.set(key, current.cell);
      pending.push({ cell: next, cost });
    }
  }
  return null;
}

export function arenaMovementCost(
  state: EncounterState,
  actor: CombatantId,
  destination: GridCell,
): number | null {
  return arenaPathCost(state, actor, destination)?.cost ?? null;
}

function actionRange(
  actions: readonly MonsterAction[],
  selected: MonsterAction,
): number | null {
  switch (selected.kind) {
    case 'attack': return arenaAttackRange(selected);
    case 'saving_throw': return selected.target.rangeFeet;
    case 'multiattack': {
      const ranges = selected.actionIds.flatMap((id) => {
        const component = actions.find((candidate) => candidate.kind === 'attack' && candidate.id === id);
        return component?.kind === 'attack' ? [arenaAttackRange(component)] : [];
      });
      return ranges.length === selected.actionIds.length && ranges.length > 0
        ? Math.min(...ranges)
        : null;
    }
    case 'spellcasting': return null;
  }
}

export type ArenaReachResult =
  | {
      readonly legal: true;
      readonly distanceFeet: number;
      readonly rangeFeet: number;
    }
  | { readonly legal: false; readonly refusals: readonly string[] };

export function arenaReachCheck(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  actionId: string,
  originOverride?: GridCell,
): ArenaReachResult {
  const acting = arenaCombatant(state, actor);
  const targetCombatant = arenaCombatant(state, target);
  const origin = originOverride ?? arenaTokenPosition(state, actor);
  const targetPosition = arenaTokenPosition(state, target);
  const refusals: string[] = [];
  if (acting?.profile.kind !== 'monster' || origin === null) {
    refusals.push(`${actor}: actor is not a placed monster`);
  }
  if (targetCombatant === null) refusals.push(`${actor}: target is absent`);
  else if (arenaSameSide(state, actor, target)) refusals.push(`${actor}: target is on the actor's side`);
  if (targetPosition === null) refusals.push(`${actor}: target has no token`);
  const actions = arenaMonsterActions(state, actor);
  const selected = actions.find((candidate) => candidate.id === actionId);
  if (selected === undefined) refusals.push(`${actor}: action ${actionId} is absent from the statblock`);
  const range = selected === undefined ? null : actionRange(actions, selected);
  if (selected !== undefined && range === null) {
    refusals.push(`${actor}: action ${actionId} has no engine-resolvable target range`);
  }
  if (refusals.length > 0 || origin === null || targetPosition === null || range === null) {
    return { legal: false, refusals };
  }
  const distance = gridDistance(origin, targetPosition);
  if (distance > range) {
    return {
      legal: false,
      refusals: [`${actor}: target is outside ${actionId} reach/range`],
    };
  }
  return { legal: true, distanceFeet: distance, rangeFeet: range };
}

function actionRefusals(
  action: PlanAction,
  actor: CombatantId,
  state: EncounterState,
): readonly string[] {
  const acting = arenaCombatant(state, actor);
  const origin = arenaTokenPosition(state, actor);
  if (acting?.profile.kind !== 'monster' || origin === null) return [`${actor}: actor is not a placed monster`];
  const actions = arenaMonsterActions(state, actor);
  const refusals: string[] = [];
  if (action.kind === 'retreat_toward') {
    const budget = action.maximumFeet ?? acting.profile.rules.speed;
    if (budget > acting.profile.rules.speed) refusals.push(`${actor}: movement exceeds speed`);
    const cost = arenaMovementCost(state, actor, action.destination);
    if (cost === null) refusals.push(`${actor}: destination is blocked, occupied, or unreachable`);
    else if (cost > budget) refusals.push(`${actor}: route costs ${String(cost)} feet including difficult terrain`);
    return refusals;
  }
  if (action.kind === 'move_toward' &&
    (action.maximumFeet ?? acting.profile.rules.speed) > acting.profile.rules.speed) {
    refusals.push(`${actor}: movement exceeds speed`);
  }
  if (action.kind === 'use_action' && action.action === 'action_surge') {
    const available = acting.profile.rules.featureEffects?.some(
      (effect) => effect.payload.kind === 'action_surge',
    ) ?? false;
    if (!available) refusals.push(`${actor}: Action Surge is absent from the combatant profile`);
  }
  if (!('target' in action) || action.target === null) return refusals;
  const target = resolveArenaTarget(state, actor, action.target);
  if (target === null || arenaCombatant(state, target) === null) {
    return [...refusals, `${actor}: target is absent`];
  }
  if (arenaSameSide(state, actor, target)) refusals.push(`${actor}: target is on the actor's side`);
  const targetPosition = arenaTokenPosition(state, target);
  if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
  const distance = gridDistance(origin, targetPosition);
  if (action.kind === 'attack' || action.kind === 'bonus_attack') {
    const selected = action.kind === 'attack' && action.attackId !== undefined
      ? actions.find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === action.attackId)
      : actions.find((candidate): candidate is MonsterAttackAction => candidate.kind === 'attack');
    if (selected === undefined) refusals.push(`${actor}: attack is absent from the statblock`);
    else if (distance > arenaAttackRange(selected)) {
      refusals.push(`${actor}: target is outside ${selected.id} reach/range`);
    }
  }
  if (action.kind === 'force_save') {
    const selected = actions.find((candidate) => candidate.kind === 'saving_throw');
    if (selected === undefined) refusals.push(`${actor}: saving-throw action is absent from the statblock`);
    else if (distance > selected.target.rangeFeet) {
      refusals.push(`${actor}: save target is outside action range`);
    }
  }
  if (action.kind === 'cast_spell') {
    const spellcasting = actions.find((candidate) =>
      candidate.kind === 'spellcasting' &&
      candidate.spells.some((spell) => spell.id === action.spellId));
    if (spellcasting === undefined) refusals.push(`${actor}: spell is absent from the statblock`);
  }
  return refusals;
}

function slotCost(action: PlanAction): 0 | 1 {
  if (action.kind !== 'cast_spell') return 0;
  return SPELL_MANIFEST.find((spell) => spell.id === action.spellId)?.level === 0 ? 0 : 1;
}

function maximumSlotActions(program: DecisionProgram): number {
  switch (program.kind) {
    case 'action':
      return slotCost(program.action) +
        (program.riders ?? []).reduce((total, rider) => total + slotCost(rider.followUpAction), 0);
    case 'if':
      return Math.max(maximumSlotActions(program.then), maximumSlotActions(program.else));
    case 'priority':
      return Math.max(...program.choices.map(maximumSlotActions));
  }
}

function programActions(program: DecisionProgram): readonly PlanAction[] {
  switch (program.kind) {
    case 'action': return [program.action, ...(program.riders ?? []).map((rider) => rider.followUpAction)];
    case 'if': return [...programActions(program.then), ...programActions(program.else)];
    case 'priority': return program.choices.flatMap(programActions);
  }
}

export function validateArenaPlan(
  plan: RoundPlan,
  state: EncounterState,
  envelope?: ArenaPromptEnvelope,
): readonly string[] {
  const refusals: string[] = [];
  if (envelope !== undefined && (
    plan.encounterId !== envelope.encounterId ||
    plan.requestId !== envelope.requestId ||
    plan.expectedRevision !== envelope.expectedRevision ||
    plan.round !== envelope.round
  )) refusals.push('round-plan envelope does not match the actual room request');
  const expected = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life !== 'dead'
      ? [combatant.profile.id]
      : []);
  const actual = plan.monsters.map((entry) => entry.monsterId);
  if (new Set(actual).size !== actual.length) refusals.push('monster programs contain duplicate actors');
  for (const id of expected) if (!actual.includes(id)) refusals.push(`${id}: living monster program is missing`);
  for (const entry of plan.monsters) {
    if (!expected.includes(entry.monsterId)) refusals.push(`${entry.monsterId}: actor is not a living monster`);
    if (maximumSlotActions(entry.program) > 1) refusals.push(`${entry.monsterId}: program can spend more than one slot`);
    for (const action of programActions(entry.program)) {
      refusals.push(...actionRefusals(action, entry.monsterId, state));
    }
  }
  return refusals;
}

function choiceRefusals(
  state: EncounterState,
  actor: CombatantId,
  choice: ArenaIntentChoice,
): readonly string[] {
  const acting = arenaCombatant(state, actor);
  const target = arenaCombatant(state, choice.targetId as CombatantId);
  const refusals: string[] = [];
  if (acting?.profile.kind !== 'monster' || acting.life === 'dead') {
    refusals.push(`${actor}: actor is not a living monster`);
  }
  if (target === null || target.life === 'dead') refusals.push(`${actor}: target is absent or dead`);
  else if (arenaSameSide(state, actor, target.profile.id)) {
    refusals.push(`${actor}: target is on the actor's side`);
  }
  if (!Number.isSafeInteger(choice.maxMovementFeet) || choice.maxMovementFeet < 0 ||
    choice.maxMovementFeet % 5 !== 0) {
    refusals.push(`${actor}: maxMovementFeet must be a non-negative 5-foot increment`);
  } else if (acting !== null && choice.maxMovementFeet > acting.profile.rules.speed) {
    refusals.push(`${actor}: movement exceeds speed`);
  }
  return refusals;
}

function resolveChoice(
  state: EncounterState,
  actor: CombatantId,
  choice: ArenaIntentChoice,
): ArenaIntentResult {
  const refusals = [...choiceRefusals(state, actor, choice)];
  const acting = arenaCombatant(state, actor);
  const targetId = choice.targetId as CombatantId;
  const target = arenaCombatant(state, targetId);
  const origin = arenaTokenPosition(state, actor);
  const targetPosition = arenaTokenPosition(state, targetId);
  const actions = arenaMonsterActions(state, actor);
  const selected = actions.find((candidate) => candidate.id === choice.action);
  if (selected === undefined) refusals.push(`${actor}: action ${choice.action} is absent from the statblock`);
  const range = selected === undefined ? null : actionRange(actions, selected);
  if (selected !== undefined && range === null) {
    refusals.push(`${actor}: action ${choice.action} has no engine-resolvable target range`);
  }
  if (origin === null) refusals.push(`${actor}: actor has no token`);
  if (target !== null && targetPosition === null) refusals.push(`${actor}: target has no token`);
  if (refusals.length > 0 || acting === null || target === null || origin === null ||
    targetPosition === null || range === null) {
    return { legal: false, refusals };
  }

  const candidates: Array<{ readonly position: GridCell; readonly path: ArenaPath }> = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const position = { column, row };
      if (gridDistance(position, targetPosition) > range) continue;
      if (!choice.acceptMelee && gridDistance(position, targetPosition) <= target.profile.rules.reach) continue;
      const path = arenaPathCost(state, actor, position, choice.maxMovementFeet);
      if (path !== null) candidates.push({ position, path });
    }
  }
  candidates.sort((left, right) =>
    left.path.cost - right.path.cost ||
    gridDistance(left.position, targetPosition) - gridDistance(right.position, targetPosition) ||
    left.position.row - right.position.row ||
    left.position.column - right.position.column);
  const selectedDestination = candidates[0];
  if (selectedDestination === undefined) {
    return {
      legal: false,
      refusals: [
        `${actor}: ${choice.action} cannot reach ${choice.targetId} within ${String(choice.maxMovementFeet)} feet under the engagement stance`,
      ],
    };
  }
  return {
    legal: true,
    resolvedPath: selectedDestination.path.cells,
    finalPosition: selectedDestination.position,
  };
}

export function declareArenaIntent(
  state: EncounterState,
  actor: CombatantId,
  intent: ArenaIntent,
): ArenaIntentResult {
  const primary = resolveChoice(state, actor, intent);
  if (primary.legal || intent.fallback === null) return primary;
  const fallback = resolveChoice(state, actor, intent.fallback);
  if (fallback.legal) return fallback;
  return {
    legal: false,
    refusals: [
      ...primary.refusals.map((refusal) => `primary: ${refusal}`),
      ...fallback.refusals.map((refusal) => `fallback: ${refusal}`),
    ],
  };
}
