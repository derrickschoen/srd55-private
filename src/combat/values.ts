import type { Brand } from '../domain/ids';

export type Feet = Brand<number, 'Feet'>;
export type ArmorClass = Brand<number, 'ArmorClass'>;
export type DifficultyClass = Brand<number, 'DifficultyClass'>;
export type DieSides = Brand<number, 'DieSides'>;
export type DamageType = Brand<string, 'DamageType'>;

const MAX_DAMAGE_TYPE_LENGTH = 100;

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
  return value;
}

/** Establishes the non-negative, finite invariant for spatial measurements. */
export function feet(value: number): Feet {
  return nonNegativeFinite(value, 'Feet') as Feet;
}

export function armorClass(value: number): ArmorClass {
  return nonNegativeFinite(value, 'ArmorClass') as ArmorClass;
}

export function difficultyClass(value: number): DifficultyClass {
  return nonNegativeFinite(value, 'DifficultyClass') as DifficultyClass;
}

export function dieSides(value: number): DieSides {
  if (!Number.isInteger(value) || value < 2) {
    throw new RangeError('DieSides must be an integer greater than or equal to 2.');
  }
  return value as DieSides;
}

export function damageType(value: string): DamageType {
  if (value.trim().length === 0 || value.length > MAX_DAMAGE_TYPE_LENGTH) {
    throw new RangeError(
      `DamageType must be non-empty and at most ${MAX_DAMAGE_TYPE_LENGTH} characters.`,
    );
  }
  return value as DamageType;
}
