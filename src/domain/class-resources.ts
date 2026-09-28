import type { CharacterLevel } from './enums';
import type { Brand, ClassLevel } from './ids';

/** Closed bundle-owned vocabulary for the eight sourced level-table ladders. */
export const classResourceKinds = [
  'rage',
  'channel_divinity',
  'wild_shape',
  'second_wind',
  'focus_points',
  'favored_enemy',
  'sorcery_points',
] as const;
export type ClassResourceKind = (typeof classResourceKinds)[number];

/** Closed bundle-owned vocabulary for the eighteen sourced formula features. */
export const classFormulaResourceKinds = [
  'persistent_rage_recovery',
  'bardic_inspiration',
  'divine_intervention',
  'wild_resurgence_conversion',
  'nature_magician_conversion',
  'action_surge',
  'indomitable',
  'uncanny_metabolism',
  'lay_on_hands',
  'paladins_smite',
  'faithful_steed',
  'tireless',
  'natures_veil',
  'stroke_of_luck',
  'innate_sorcery',
  'sorcerous_restoration',
  'magical_cunning',
  'contact_patron',
] as const;
export type ClassFormulaResourceKind =
  (typeof classFormulaResourceKinds)[number];

export const classResourceFormulaKinds = [
  'fixed_count',
  'fixed_count_by_class_level',
  'ability_modifier_minimum_one',
  'class_level_multiple',
] as const;
export type ClassResourceFormulaKind =
  (typeof classResourceFormulaKinds)[number];

export const resourceFormulaAbilities = ['charisma', 'wisdom'] as const;
export type ResourceFormulaAbility =
  (typeof resourceFormulaAbilities)[number];

export type PositiveResourceMaximum = Brand<
  number,
  'PositiveResourceMaximum'
>;
export type PositiveInteger = Brand<number, 'PositiveInteger'>;

/** One step of a stepped count: from this class level on, this many uses. */
export interface ClassResourceFormulaStepOf<
  Level extends number,
  Count extends number,
> {
  readonly minimum_class_level: Level;
  readonly count: Count;
}

/**
 * THE COMPLETE D120 EXPRESSION VOCABULARY, ONCE, over the types a level, a
 * count and a multiplier take. There is deliberately no generic expression
 * string or fallback arm: unsupported source text is absence.
 *
 * Each arm carries exactly its own payload, so a contradictory state (a fixed
 * count with an ability, a stepped count with no steps, steps as text) is not
 * a value of the type.
 *
 * A STEPPED COUNT HAS AT LEAST TWO STEPS. With one step it would be a
 * `fixed_count` under a second name (from that level, that many uses), and it
 * could not be stored: its first step goes in the scalar columns and its later
 * steps in `later_fixed_count_steps`, which the decoder and the table's CHECK
 * both require to be a non-empty array. So the tuple type admits exactly the
 * stepped counts storage round-trips; the one-step value is not a value of
 * the type, rather than a value the writer quietly turns into `[]`.
 *
 * Two instantiations exist: the runtime's
 * {@link ClassResourceFormula}, whose levels and counts are brands minted by
 * a validating constructor, and the build's {@link ClassResourceFormulaRecord},
 * whose bare literals a generated artifact can carry `as const`.
 */
export type ClassResourceFormulaOf<
  Level extends number,
  Count extends number,
  Multiplier extends number,
> =
  | {
      readonly kind: 'fixed_count';
      readonly minimum_class_level: Level;
      readonly count: Count;
    }
  | {
      readonly kind: 'fixed_count_by_class_level';
      readonly steps: readonly [
        ClassResourceFormulaStepOf<Level, Count>,
        ClassResourceFormulaStepOf<Level, Count>,
        ...ClassResourceFormulaStepOf<Level, Count>[],
      ];
    }
  | {
      readonly kind: 'ability_modifier_minimum_one';
      readonly minimum_class_level: Level;
      readonly ability: ResourceFormulaAbility;
    }
  | {
      readonly kind: 'class_level_multiple';
      readonly minimum_class_level: Level;
      readonly multiplier: Multiplier;
    };

export type ClassResourceFormulaStep = ClassResourceFormulaStepOf<
  ClassLevel,
  PositiveResourceMaximum
>;

/** A formula as the runtime holds it: every level and count a checked brand. */
export type ClassResourceFormula = ClassResourceFormulaOf<
  ClassLevel,
  PositiveResourceMaximum,
  PositiveInteger
>;

/**
 * A formula as the build records it in `generated/class-resources-srd.ts`: the
 * same union with literal levels (1..20) and counts, so the artifact carries
 * the discriminated structure itself, never storage columns or JSON text.
 * {@link classResourceFormula} mints it into a {@link ClassResourceFormula}.
 */
export type ClassResourceFormulaRecord = ClassResourceFormulaOf<
  CharacterLevel,
  number,
  number
>;

export function classResourceLabel(kind: ClassResourceKind): string {
  switch (kind) {
    case 'rage':
      return 'Rages';
    case 'channel_divinity':
      return 'Channel Divinity';
    case 'wild_shape':
      return 'Wild Shape';
    case 'second_wind':
      return 'Second Wind';
    case 'focus_points':
      return 'Focus Points';
    case 'favored_enemy':
      return 'Favored Enemy';
    case 'sorcery_points':
      return 'Sorcery Points';
  }
}

export function classFormulaResourceLabel(
  kind: ClassFormulaResourceKind,
): string {
  switch (kind) {
    case 'persistent_rage_recovery':
      return 'Persistent Rage Recovery';
    case 'bardic_inspiration':
      return 'Bardic Inspiration';
    case 'divine_intervention':
      return 'Divine Intervention';
    case 'wild_resurgence_conversion':
      return 'Wild Resurgence Conversion';
    case 'nature_magician_conversion':
      return 'Nature Magician Conversion';
    case 'action_surge':
      return 'Action Surge';
    case 'indomitable':
      return 'Indomitable';
    case 'uncanny_metabolism':
      return 'Uncanny Metabolism';
    case 'lay_on_hands':
      return 'Lay On Hands';
    case 'paladins_smite':
      return "Paladin's Smite";
    case 'faithful_steed':
      return 'Faithful Steed';
    case 'tireless':
      return 'Tireless';
    case 'natures_veil':
      return "Nature's Veil";
    case 'stroke_of_luck':
      return 'Stroke of Luck';
    case 'innate_sorcery':
      return 'Innate Sorcery';
    case 'sorcerous_restoration':
      return 'Sorcerous Restoration';
    case 'magical_cunning':
      return 'Magical Cunning';
    case 'contact_patron':
      return 'Contact Patron';
  }
}

/**
 * A formula's `class_resource_formulas` row AS READ: every column unknown until
 * {@link decodeClassResourceFormula} has checked it. The columns are storage
 * only: the formula itself is the discriminated {@link ClassResourceFormula}.
 */
export interface StoredClassResourceFormula {
  readonly formula_kind: unknown;
  readonly minimum_class_level: unknown;
  readonly fixed_count: unknown;
  readonly ability: unknown;
  readonly multiplier: unknown;
  readonly later_fixed_count_steps: unknown;
}

/**
 * A formula's `class_resource_formulas` row AS WRITTEN, by
 * {@link classResourceFormulaColumns} at the database boundary and nowhere
 * else. The table keeps one nullable column per payload and the later steps
 * of a stepped count as JSON text; no artifact or domain value carries them.
 */
export interface ClassResourceFormulaColumns extends StoredClassResourceFormula {
  readonly formula_kind: ClassResourceFormulaKind;
  readonly minimum_class_level: ClassLevel;
  readonly fixed_count: PositiveResourceMaximum | null;
  readonly ability: ResourceFormulaAbility | null;
  readonly multiplier: PositiveInteger | null;
  readonly later_fixed_count_steps: string | null;
}

export class ClassResourceFormulaDecodeError extends Error {
  constructor(message: string) {
    super(`Class resource formula: ${message}`);
    this.name = 'ClassResourceFormulaDecodeError';
  }
}

function classLevel(value: unknown, field: string): ClassLevel {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 20) {
    throw new ClassResourceFormulaDecodeError(`${field} must be an integer from 1 to 20.`);
  }
  return value as ClassLevel;
}

function positive(value: unknown, field: string): PositiveResourceMaximum {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new ClassResourceFormulaDecodeError(`${field} must be a positive integer.`);
  }
  return value as PositiveResourceMaximum;
}

function positiveInteger(value: unknown, field: string): PositiveInteger {
  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new ClassResourceFormulaDecodeError(`${field} must be a positive integer.`);
  }
  return value as PositiveInteger;
}

function formulaAbility(value: unknown): ResourceFormulaAbility {
  if (value !== 'charisma' && value !== 'wisdom') {
    throw new ClassResourceFormulaDecodeError('ability must be charisma or wisdom.');
  }
  return value;
}

function nullPayload(value: unknown, field: string): void {
  if (value !== null) {
    throw new ClassResourceFormulaDecodeError(`${field} must be null for this formula kind.`);
  }
}

type SteppedCount = Extract<
  ClassResourceFormula,
  { readonly kind: 'fixed_count_by_class_level' }
>['steps'];

/** A stepped count's later steps: at least one, because the count has two or more. */
type LaterSteps = readonly [ClassResourceFormulaStep, ...ClassResourceFormulaStep[]];

/**
 * One step's numbers checked: the first step's under its scalar column names,
 * a later step's under its ordinal among the later steps.
 */
function checkedStep(
  minimumClassLevel: unknown,
  count: unknown,
  laterOrdinal: number | null,
): ClassResourceFormulaStep {
  const later = laterOrdinal === null ? null : `later step ${String(laterOrdinal)}`;
  return {
    minimum_class_level: classLevel(
      minimumClassLevel,
      later === null ? 'minimum_class_level' : `${later} minimum_class_level`,
    ),
    count: positive(count, later === null ? 'fixed_count' : `${later} count`),
  };
}

/** A stepped count's joint rule: each step starts later and changes the count. */
function steppedCount(steps: SteppedCount): SteppedCount {
  for (let index = 1; index < steps.length; index += 1) {
    const previous = steps[index - 1] as ClassResourceFormulaStep;
    const current = steps[index] as ClassResourceFormulaStep;
    if (current.minimum_class_level <= previous.minimum_class_level) {
      throw new ClassResourceFormulaDecodeError('step levels must be strictly increasing.');
    }
    if (current.count === previous.count) {
      throw new ClassResourceFormulaDecodeError('each step must change the count.');
    }
  }
  return steps;
}

function parseLaterSteps(value: unknown): LaterSteps {
  if (typeof value !== 'string') {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be JSON text.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be a non-empty array.');
  }
  const [second, ...rest] = parsed.map((entry: unknown, index) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      Array.isArray(entry) ||
      Object.keys(entry).sort().join(',') !== 'count,minimum_class_level'
    ) {
      throw new ClassResourceFormulaDecodeError(`later step ${String(index + 1)} has the wrong shape.`);
    }
    const record = entry as Record<string, unknown>;
    return checkedStep(record.minimum_class_level, record.count, index + 1);
  });
  if (second === undefined) {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be a non-empty array.');
  }
  return [second, ...rest];
}

/**
 * THE ONE WAY A RECORDED FORMULA BECOMES A RUNTIME ONE: every level and count
 * is checked (a level 1..20, a positive count and multiplier, a stepped count
 * whose steps start later and change the count) before it earns its brand.
 * The artifact's type already refuses a contradictory shape; this refuses a
 * well-shaped wrong number.
 */
export function classResourceFormula(
  record: ClassResourceFormulaRecord,
): ClassResourceFormula {
  switch (record.kind) {
    case 'fixed_count':
      return {
        kind: 'fixed_count',
        minimum_class_level: classLevel(record.minimum_class_level, 'minimum_class_level'),
        count: positive(record.count, 'fixed_count'),
      };
    case 'fixed_count_by_class_level': {
      const [first, second, ...later] = record.steps;
      return {
        kind: 'fixed_count_by_class_level',
        steps: steppedCount([
          checkedStep(first.minimum_class_level, first.count, null),
          checkedStep(second.minimum_class_level, second.count, 1),
          ...later.map((step, index) =>
            checkedStep(step.minimum_class_level, step.count, index + 2),
          ),
        ]),
      };
    }
    case 'ability_modifier_minimum_one':
      return {
        kind: 'ability_modifier_minimum_one',
        minimum_class_level: classLevel(record.minimum_class_level, 'minimum_class_level'),
        ability: formulaAbility(record.ability),
      };
    case 'class_level_multiple':
      return {
        kind: 'class_level_multiple',
        minimum_class_level: classLevel(record.minimum_class_level, 'minimum_class_level'),
        multiplier: positiveInteger(record.multiplier, 'multiplier'),
      };
  }
}

/**
 * THE DATABASE BOUNDARY, WRITING: a formula in its stored columns. The first
 * step of a stepped count goes in the scalar columns and the later steps in
 * `later_fixed_count_steps` as JSON text, never `[]`, because the type holds
 * at least two steps; every column another kind does not use is null.
 * {@link decodeClassResourceFormula} is its inverse over every value of the
 * type, and the table's CHECK constraints accept every row this writes.
 */
export function classResourceFormulaColumns(
  formula: ClassResourceFormula,
): ClassResourceFormulaColumns {
  switch (formula.kind) {
    case 'fixed_count':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: formula.count, ability: null, multiplier: null, later_fixed_count_steps: null };
    case 'fixed_count_by_class_level': {
      const [first, ...later] = formula.steps;
      return { formula_kind: formula.kind, minimum_class_level: first.minimum_class_level, fixed_count: first.count, ability: null, multiplier: null, later_fixed_count_steps: JSON.stringify(later) };
    }
    case 'ability_modifier_minimum_one':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: null, ability: formula.ability, multiplier: null, later_fixed_count_steps: null };
    case 'class_level_multiple':
      return { formula_kind: formula.kind, minimum_class_level: formula.minimum_class_level, fixed_count: null, ability: null, multiplier: formula.multiplier, later_fixed_count_steps: null };
  }
}

/**
 * THE DATABASE BOUNDARY, READING: decode and jointly validate the formula
 * discriminator and every payload column.
 */
export function decodeClassResourceFormula(
  row: StoredClassResourceFormula,
): ClassResourceFormula {
  switch (row.formula_kind) {
    case 'fixed_count': {
      const minimum = classLevel(row.minimum_class_level, 'minimum_class_level');
      const count = positive(row.fixed_count, 'fixed_count');
      nullPayload(row.ability, 'ability');
      nullPayload(row.multiplier, 'multiplier');
      nullPayload(row.later_fixed_count_steps, 'later_fixed_count_steps');
      return { kind: 'fixed_count', minimum_class_level: minimum, count };
    }
    case 'fixed_count_by_class_level': {
      const first = checkedStep(row.minimum_class_level, row.fixed_count, null);
      nullPayload(row.ability, 'ability');
      nullPayload(row.multiplier, 'multiplier');
      return {
        kind: 'fixed_count_by_class_level',
        steps: steppedCount([first, ...parseLaterSteps(row.later_fixed_count_steps)]),
      };
    }
    case 'ability_modifier_minimum_one': {
      const minimum = classLevel(row.minimum_class_level, 'minimum_class_level');
      nullPayload(row.fixed_count, 'fixed_count');
      const ability = formulaAbility(row.ability);
      nullPayload(row.multiplier, 'multiplier');
      nullPayload(row.later_fixed_count_steps, 'later_fixed_count_steps');
      return {
        kind: 'ability_modifier_minimum_one',
        minimum_class_level: minimum,
        ability,
      };
    }
    case 'class_level_multiple': {
      const minimum = classLevel(row.minimum_class_level, 'minimum_class_level');
      nullPayload(row.fixed_count, 'fixed_count');
      nullPayload(row.ability, 'ability');
      const multiplier = positiveInteger(row.multiplier, 'multiplier');
      nullPayload(row.later_fixed_count_steps, 'later_fixed_count_steps');
      return {
        kind: 'class_level_multiple',
        minimum_class_level: minimum,
        multiplier,
      };
    }
    default:
      throw new ClassResourceFormulaDecodeError('formula_kind is not supported.');
  }
}
