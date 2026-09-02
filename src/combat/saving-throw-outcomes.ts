import type { DifficultyClass } from './values';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface SavingThrowRequest {
  readonly bonus: number;
  readonly dc: DifficultyClass;
  readonly rollMode: RollMode;
}

export interface SavingThrowOutcomeWeights {
  readonly failure: number;
  readonly success: number;
  readonly total: number;
}

/** Exact integer weights for the same selected-face semantics used by resolveSavingThrow. */
export function savingThrowOutcomeWeights(
  request: SavingThrowRequest,
): SavingThrowOutcomeWeights {
  if (!Number.isFinite(request.bonus)) throw new RangeError('Saving throw bonus must be finite.');
  const faces = request.rollMode === 'normal'
    ? Array.from({ length: 20 }, (_unused, index) => index + 1)
    : Array.from({ length: 20 }, (_unused, first) => first + 1).flatMap((first) =>
        Array.from({ length: 20 }, (_unused, second) => request.rollMode === 'advantage'
          ? Math.max(first, second + 1)
          : Math.min(first, second + 1)));
  const failure = faces.filter((face) => face + request.bonus < request.dc).length;
  return { failure, success: faces.length - failure, total: faces.length };
}
