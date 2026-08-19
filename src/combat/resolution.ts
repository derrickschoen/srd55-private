import { rollDice, rollDie, type Rng } from './random';
import {
  dieSides,
  type ArmorClass,
  type DamageType,
  type DieSides,
  type DifficultyClass,
} from './values';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceExpression {
  readonly count: number;
  readonly sides: DieSides;
  readonly modifier: number;
}

export interface DiceRollTrace {
  readonly expression: DiceExpression;
  readonly faces: readonly number[];
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

export interface SavingThrowRequest {
  readonly bonus: number;
  readonly dc: DifficultyClass;
  readonly rollMode: RollMode;
}

export interface SavingThrowResult {
  readonly outcome: 'failure' | 'success';
  readonly roll: D20Roll;
  readonly total: number;
}

export type DamageResponse = 'normal' | 'resistant' | 'vulnerable' | 'immune';

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

export function rollD20(rng: Rng, mode: RollMode): D20Roll {
  const first = rollDie(rng, dieSides(20));
  switch (mode) {
    case 'normal':
      return { mode, faces: [first], chosen: first };
    case 'advantage': {
      const second = rollDie(rng, dieSides(20));
      return { mode, faces: [first, second], chosen: Math.max(first, second) };
    }
    case 'disadvantage': {
      const second = rollDie(rng, dieSides(20));
      return { mode, faces: [first, second], chosen: Math.min(first, second) };
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
): AttackRollResult {
  return classifyAttackRoll(request, rollD20(rng, request.rollMode));
}

export function resolveSavingThrow(
  request: SavingThrowRequest,
  rng: Rng,
): SavingThrowResult {
  if (!Number.isFinite(request.bonus)) {
    throw new RangeError('Saving throw bonus must be finite.');
  }
  const roll = rollD20(rng, request.rollMode);
  const total = roll.chosen + request.bonus;
  return total < request.dc
    ? { outcome: 'failure', roll, total }
    : { outcome: 'success', roll, total };
}

function applyDamageResponse(damage: number, response: DamageResponse): number {
  switch (response) {
    case 'normal':
      return damage;
    case 'resistant':
      return Math.floor(damage / 2);
    case 'vulnerable':
      return damage * 2;
    case 'immune':
      return 0;
  }
}

export function resolveDamage(request: DamageRequest, rng: Rng): DamageResult {
  const terms = request.terms.map((term) => {
    const expression = request.critical
      ? { ...term.dice, count: term.dice.count * 2 }
      : term.dice;
    const roll = rollDice(rng, expression);
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
