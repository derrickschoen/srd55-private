import type { SpellSchool } from '../domain/enums';

/**
 * The complete pure predicate for one spell choice.
 *
 * It deliberately contains no durable row id. A generated slot, a planned
 * logical locator, and a Wizard acquisition can therefore be checked by the
 * same evaluator and searched by the same query.
 */
export interface SpellSelectionConstraint {
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly allowed_spell_lists: readonly string[];
  readonly allowed_schools: readonly SpellSchool[];
  readonly allowed_tags: readonly string[];
  readonly selection_collection: string | null;
}

export interface StoredSpellSelectionConstraint {
  readonly spell_level_min?: number;
  readonly spell_level_max?: number;
  readonly allowed_spell_lists?: string | readonly string[] | null;
  readonly allowed_schools?: string | readonly SpellSchool[] | null;
  readonly allowed_tags?: string | readonly string[] | null;
  readonly selection_collection?: string | null;
}

function decodedList(value: string | readonly string[] | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  const decoded: unknown = JSON.parse(value as string);
  if (!Array.isArray(decoded)) {
    throw new TypeError('A spell-selection list must decode to an array.');
  }
  if (!decoded.every((item) => typeof item === 'string')) {
    throw new TypeError(
      'A spell-selection list must contain only strings.',
    );
  }
  return [...decoded];
}

export function spellSelectionConstraint(
  input: StoredSpellSelectionConstraint,
): SpellSelectionConstraint {
  const minimum = input.spell_level_min ?? 0;
  const maximum = input.spell_level_max ?? 9;
  if (
    !Number.isSafeInteger(minimum) ||
    !Number.isSafeInteger(maximum) ||
    minimum < 0 ||
    maximum > 9 ||
    minimum > maximum
  ) {
    throw new RangeError(
      'A spell-selection level window must be within 0..9 and ordered.',
    );
  }
  return Object.freeze({
    spell_level_min: minimum,
    spell_level_max: maximum,
    allowed_spell_lists: Object.freeze(
      decodedList(input.allowed_spell_lists),
    ),
    allowed_schools: Object.freeze(
      decodedList(input.allowed_schools) as SpellSchool[],
    ),
    allowed_tags: Object.freeze(decodedList(input.allowed_tags)),
    selection_collection: input.selection_collection ?? null,
  });
}

export function storedSpellSelectionConstraint(
  constraint: SpellSelectionConstraint,
): {
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly allowed_spell_lists: string | null;
  readonly allowed_schools: string | null;
  readonly allowed_tags: string | null;
  readonly selection_collection: string | null;
} {
  const encoded = (values: readonly string[]) =>
    values.length === 0 ? null : JSON.stringify(values);
  return {
    spell_level_min: constraint.spell_level_min,
    spell_level_max: constraint.spell_level_max,
    allowed_spell_lists: encoded(constraint.allowed_spell_lists),
    allowed_schools: encoded(constraint.allowed_schools),
    allowed_tags: encoded(constraint.allowed_tags),
    selection_collection: constraint.selection_collection,
  };
}
