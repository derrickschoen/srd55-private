import {
  rollDice,
  type Rng,
} from './random';
import {
  isTransactionalRollRng,
  rollOperationPath,
  type RollComponentRef,
  type RollProvenanceRequest,
} from './roll-provenance';
import {
  dieSides,
  type ArmorClass,
  type DamageType,
  type DieSides,
} from './values';
import type { RollMode, SavingThrowRequest } from './saving-throw-outcomes';

export {
  savingThrowOutcomeWeights,
  type RollMode,
  type SavingThrowOutcomeWeights,
  type SavingThrowRequest,
} from './saving-throw-outcomes';

export interface DiceExpression {
  readonly count: number;
  readonly sides: DieSides;
  readonly modifier: number;
  /** Applied to the completed expression total, after dice and modifier. */
  readonly minimumTotal?: number;
  /** Applied to the completed expression total, after dice and modifier. */
  readonly maximumTotal?: number;
  readonly rerollBelow?: {
    readonly threshold: number;
    /** A replacement is final even when it is also below the threshold. */
    readonly maximumRerollsPerDie: 1;
  };
  readonly explosion?: {
    readonly triggerFace: 'maximum';
    /** Each original die is independently bounded; added dice never explode again. */
    readonly maximumExplosionsPerDie: 1;
  };
}

export interface DiceRollTrace {
  readonly expression: DiceExpression;
  readonly faces: readonly number[];
  readonly rerolls?: readonly {
    readonly dieIndex: number;
    readonly discarded: number;
    readonly replacement: number;
  }[];
  readonly explosionFaces?: readonly number[];
  readonly total: number;
}

export interface D20Roll {
  readonly mode: RollMode;
  readonly faces: readonly number[];
  readonly chosen: number;
}

interface AttackRollRequestBase {
  readonly rollMode: RollMode;
  readonly criticalFloor: number;
}

export interface ArmorClassAttackRollRequest extends AttackRollRequestBase {
  readonly attackBonus: number;
  readonly targetArmorClass: ArmorClass;
}

export interface ThresholdAttackRollRequest extends AttackRollRequestBase {
  readonly hitFloor: number;
}

export type AttackRollRequest = ArmorClassAttackRollRequest | ThresholdAttackRollRequest;

export type AttackRollResult =
  | { readonly outcome: 'miss'; readonly roll: D20Roll; readonly total: number }
  | { readonly outcome: 'hit'; readonly roll: D20Roll; readonly total: number }
  | { readonly outcome: 'critical'; readonly roll: D20Roll; readonly total: number };

export interface SavingThrowResult {
  readonly outcome: 'failure' | 'success';
  readonly roll: D20Roll;
  readonly total: number;
}

export type DamageResponse = 'normal' | 'resistant' | 'vulnerable' | 'resistant_and_vulnerable' | 'immune';

export interface DamageTerm {
  readonly type: DamageType;
  readonly dice: DiceExpression;
}

export interface DamageRequest {
  readonly terms: readonly DamageTerm[];
  readonly critical: boolean;
  readonly responses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
}

export interface DamageResult {
  readonly terms: readonly {
    readonly type: DamageType;
    readonly roll: DiceRollTrace;
    readonly beforeResponse: number;
    readonly afterResponse: number;
  }[];
  readonly total: number;
}

export function rollD20(
  rng: Rng,
  mode: RollMode,
  provenance: RollProvenanceRequest,
): D20Roll {
  const component = isTransactionalRollRng(rng)
    ? rng.beginComponent(provenance, { kind: 'd20_selection', mode })
    : null;
  const drawCandidate = (candidate: 1 | 2): number => component === null || !isTransactionalRollRng(rng)
    ? Math.floor(rng() * 20) + 1
    : rng.draw({ sides: dieSides(20), provenance: component, role: { kind: 'd20_candidate', candidate } });
  const finish = (roll: D20Roll, active: RollComponentRef | null): D20Roll => {
    if (active !== null && isTransactionalRollRng(rng)) rng.finishComponent(active, roll.chosen);
    return roll;
  };
  const first = drawCandidate(1);
  switch (mode) {
    case 'normal':
      return finish({ mode, faces: [first], chosen: first }, component);
    case 'advantage': {
      const second = drawCandidate(2);
      return finish({ mode, faces: [first, second], chosen: Math.max(first, second) }, component);
    }
    case 'disadvantage': {
      const second = drawCandidate(2);
      return finish({ mode, faces: [first, second], chosen: Math.min(first, second) }, component);
    }
  }
}

export function classifyAttackRoll(
  request: AttackRollRequest,
  roll: D20Roll,
): AttackRollResult {
  if (!Number.isInteger(request.criticalFloor) || request.criticalFloor < 2 || request.criticalFloor > 20) {
    throw new RangeError('Critical floor must be an integer from 2 through 20.');
  }

  const attackBonus = 'attackBonus' in request ? request.attackBonus : 0;
  if (!Number.isFinite(attackBonus)) {
    throw new RangeError('Attack bonus must be finite.');
  }
  if ('hitFloor' in request && (!Number.isInteger(request.hitFloor) || request.hitFloor < 1)) {
    throw new RangeError('Hit floor must be a positive integer.');
  }

  const total = roll.chosen + attackBonus;
  if (roll.chosen === 1) return { outcome: 'miss', roll, total };
  if (roll.chosen >= request.criticalFloor) return { outcome: 'critical', roll, total };

  const hit = 'hitFloor' in request
    ? roll.chosen >= request.hitFloor
    : total >= request.targetArmorClass;
  return hit
    ? { outcome: 'hit', roll, total }
    : { outcome: 'miss', roll, total };
}

export function resolveAttackRoll(
  request: AttackRollRequest,
  rng: Rng,
  provenance: RollProvenanceRequest,
): AttackRollResult {
  return classifyAttackRoll(request, rollD20(rng, request.rollMode, provenance));
}

export function resolveSavingThrow(
  request: SavingThrowRequest,
  rng: Rng,
  provenance: RollProvenanceRequest,
): SavingThrowResult {
  if (!Number.isFinite(request.bonus)) {
    throw new RangeError('Saving throw bonus must be finite.');
  }
  const roll = rollD20(rng, request.rollMode, provenance);
  const total = roll.chosen + request.bonus;
  return total < request.dc
    ? { outcome: 'failure', roll, total }
    : { outcome: 'success', roll, total };
}

export function applyDamageResponse(damage: number, response: DamageResponse): number {
  switch (response) {
    case 'normal':
      return damage;
    case 'resistant':
      return Math.floor(damage / 2);
    case 'vulnerable':
      return damage * 2;
    case 'resistant_and_vulnerable':
      return Math.floor(damage / 2) * 2;
    case 'immune':
      return 0;
  }
}

export function resolveDamage(
  request: DamageRequest,
  rng: Rng,
  provenance: RollProvenanceRequest,
): DamageResult {
  const terms = request.terms.map((term, termIndex) => {
    const expression = request.critical
      ? { ...term.dice, count: term.dice.count * 2 }
      : term.dice;
    const roll = rollDice(rng, expression, {
      ...provenance,
      operationPath: rollOperationPath(`${provenance.operationPath}/term/${String(termIndex)}`),
    });
    const beforeResponse = roll.total;
    const response = request.responses.find(({ type }) => type === term.type)?.response ?? 'normal';
    return {
      type: term.type,
      roll,
      beforeResponse,
      afterResponse: applyDamageResponse(beforeResponse, response),
    };
  });
  return {
    terms,
    total: terms.reduce((sum, term) => sum + term.afterResponse, 0),
  };
}
