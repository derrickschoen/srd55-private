import type { EncounterCommand } from '../../combat/events';
import type { CombatantId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(compare);
}

function literalUnion(values: readonly string[]): string {
  return values.length === 0 ? 'never' : values.map((value) => JSON.stringify(value)).join(' | ');
}

/** Covers the 500-foot import cap plus one full Dash while keeping declaration size bounded. */
export const MAX_TURN_PROGRAM_MOVEMENT_FEET = 1_000;

export class TurnProgramMovementDomainError extends RangeError {
  override readonly name = 'TurnProgramMovementDomainError' as const;

  constructor(readonly movementBudgetFeet: number) {
    super(`Turn-program movement budget ${String(movementBudgetFeet)} exceeds the typed maximum ${String(MAX_TURN_PROGRAM_MOVEMENT_FEET)}.`);
  }
}

function numberUnion(maximum: number): string {
  if (!Number.isSafeInteger(maximum) || maximum < 0) return 'never';
  if (maximum > MAX_TURN_PROGRAM_MOVEMENT_FEET) throw new TurnProgramMovementDomainError(maximum);
  return Array.from({ length: maximum + 1 }, (_, value) => String(value)).join(' | ');
}

function actionsForActor(
  projection: DmBoardProjection,
  actorId: CombatantId,
): readonly EncounterCommand[] {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return batch.actions;
  const pending = projection.pendingRequest;
  return pending?.actorId === actorId ? pending.legalActions.actions : [];
}

function visibleCombatantIds(
  projection: DmBoardProjection,
  actorId: CombatantId,
): readonly string[] {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return uniqueSorted(batch.combatantIds);
  const pending = projection.pendingRequest;
  const combatants = pending?.actorId === actorId
    ? pending.visibleState.combatants
    : projection.encounter.combatants;
  return uniqueSorted(combatants.map((combatant) => String(combatant.id)));
}

function movementBudget(projection: DmBoardProjection, actorId: CombatantId): number {
  const batch = projection.turnProgramLegalActions?.find((entry) => entry.actorId === actorId);
  if (batch !== undefined) return batch.movementBudgetFeet;
  const actor = projection.encounter.combatants.find((combatant) => combatant.id === actorId);
  return actor?.turn.movement.remaining ?? 0;
}

export interface TurnProgramAmbientDeclaration {
  readonly actorId: CombatantId;
  readonly combatantIds: readonly string[];
  readonly spellIds: readonly string[];
  readonly attackIds: readonly string[];
  readonly movementBudgetFeet: number;
  readonly source: string;
}

export interface TurnProgramAmbientApiDescription {
  readonly actorId: CombatantId;
  readonly description: string;
}

function turnProgramAmbientFacts(
  projection: DmBoardProjection,
  actorId: CombatantId,
): Omit<TurnProgramAmbientDeclaration, 'source'> {
  const actions = actionsForActor(projection, actorId);
  return {
    actorId,
    combatantIds: visibleCombatantIds(projection, actorId),
    spellIds: uniqueSorted(actions.flatMap((command) =>
      command.type === 'cast_spell' ? [command.spellId] : [])),
    attackIds: uniqueSorted(actions.flatMap((command) =>
      command.type === 'attack' && command.attackId !== undefined ? [command.attackId] : [])),
    movementBudgetFeet: movementBudget(projection, actorId),
  };
}

/** Describes the dynamic ambient facts without loading the TypeScript compiler. */
export function describeTurnProgramAmbientApi(
  projection: DmBoardProjection,
  actorId: CombatantId,
): TurnProgramAmbientApiDescription {
  const facts = turnProgramAmbientFacts(projection, actorId);
  return {
    actorId,
    description: [
      `For actor ${actorId}, the restricted-JS API can reference these visible combatant IDs: ${facts.combatantIds.join(', ') || 'none'}.`,
      `The currently legal spell IDs are: ${facts.spellIds.join(', ') || 'none'}.`,
      `The currently legal named attack IDs are: ${facts.attackIds.join(', ') || 'none'}.`,
      `An explicit move or retreat distance may be an integer from 0 through ${String(facts.movementBudgetFeet)} feet.`,
    ].join(' '),
  };
}

/** Generates the complete ambient API for one actor from its decision-time DM projection. */
export function generateTurnProgramDeclarations(
  projection: DmBoardProjection,
  actorId: CombatantId,
): TurnProgramAmbientDeclaration {
  const { combatantIds, spellIds, attackIds, movementBudgetFeet } = turnProgramAmbientFacts(projection, actorId);
  const source = `declare const movementFeetBrand: unique symbol;
type CombatantId = ${literalUnion(combatantIds)};
type SpellId = ${literalUnion(spellIds)};
type AttackId = ${literalUnion(attackIds)};
type MovementBudgetFeet = ${String(movementBudgetFeet)};
type MovementFeet = (${numberUnion(movementBudgetFeet)}) & { readonly [movementFeetBrand]?: never };
interface Cell { readonly column: number; readonly row: number; }
interface DecisionProgram { readonly __decisionProgram: unique symbol; }
interface StandingRider { readonly __standingRider: unique symbol; }
declare function nearestEnemy(): CombatantId | null;
declare function lowestHp(combatants?: readonly CombatantId[]): CombatantId | null;
declare function alliesWithin(feet: number): readonly CombatantId[];
declare function enemiesWithin(feet: number): readonly CombatantId[];
declare function hpPercent(combatant: CombatantId): number;
declare function distanceTo(combatant: CombatantId): number;
declare function attack(target: CombatantId | null, rider?: StandingRider): DecisionProgram;
declare function attack(attackId: AttackId, target: CombatantId, rider?: StandingRider): DecisionProgram;
declare function bonusAttack(target: CombatantId): DecisionProgram;
declare function forceSave(target: CombatantId): DecisionProgram;
declare function castSpell(spellId: SpellId, target?: CombatantId): DecisionProgram;
declare function move(target: CombatantId, feet?: MovementFeet): DecisionProgram;
declare function retreat(column: number, row: number, feet?: MovementFeet): DecisionProgram;
declare function dash(): DecisionProgram;
declare function disengage(): DecisionProgram;
declare function dodge(): DecisionProgram;
declare function endTurn(): DecisionProgram;
declare function actionSurge(): DecisionProgram;
declare function priority(...programs: readonly DecisionProgram[]): DecisionProgram;
declare function priority(programs: readonly DecisionProgram[]): DecisionProgram;
declare function emit(program: DecisionProgram): DecisionProgram;
declare function focusFire(target: CombatantId | null): DecisionProgram;
declare function retreatWhenBelow(fractionHp: number, destination: Cell): DecisionProgram;
declare function flankWith(ally: CombatantId, target: CombatantId): DecisionProgram;
declare function holdChokepoint(destination: Cell): DecisionProgram;
declare function riderOnCrit(followUpAction: DecisionProgram): StandingRider;
`;
  return { actorId, combatantIds, spellIds, attackIds, movementBudgetFeet, source };
}
