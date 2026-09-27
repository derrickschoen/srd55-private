import { characterLevels, type CharacterLevel } from './enums';

/**
 * ONE VALUE PER CHARACTER LEVEL, 1 THROUGH 20, AS A TUPLE.
 *
 * A class table prints exactly twenty rows. A `readonly T[]` admits nineteen or
 * twenty-one; this type does not, so a generated table missing a row fails to
 * compile rather than reading `undefined` at level 20. Index `level - 1`.
 */
export type PerCharacterLevel<T> = readonly [
  T, T, T, T, T, T, T, T, T, T,
  T, T, T, T, T, T, T, T, T, T,
];

/** Narrows a parsed column to the tuple, or returns null when it is not twenty entries. */
export function perCharacterLevel<T>(
  values: readonly T[],
): PerCharacterLevel<T> | null {
  return values.length === characterLevels.length
    ? (values as unknown as PerCharacterLevel<T>)
    : null;
}

/** The value a per-level column holds at one character level. */
export function atCharacterLevel<T>(
  values: PerCharacterLevel<T>,
  level: CharacterLevel,
): T {
  return values[level - 1] as T;
}
