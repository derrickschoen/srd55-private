import type { Brand } from '../domain/ids';

export type Feet = Brand<number, 'Feet'>;

/** Establishes the non-negative, finite invariant for spatial measurements. */
export function feet(value: number): Feet {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Feet must be a finite, non-negative number.');
  }
  return value as Feet;
}
