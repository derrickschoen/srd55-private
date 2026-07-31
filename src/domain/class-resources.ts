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

export interface ClassResourceFormulaStep {
  readonly minimum_class_level: ClassLevel;
  readonly count: PositiveResourceMaximum;
}

/**
 * The complete D120 expression vocabulary. There is deliberately no generic
 * expression string or fallback arm: unsupported source text is absence.
 */
export type ClassResourceFormula =
  | {
      readonly kind: 'fixed_count';
      readonly minimum_class_level: ClassLevel;
      readonly count: PositiveResourceMaximum;
    }
  | {
      readonly kind: 'fixed_count_by_class_level';
      readonly steps: readonly [
        ClassResourceFormulaStep,
        ...ClassResourceFormulaStep[],
      ];
    }
  | {
      readonly kind: 'ability_modifier_minimum_one';
      readonly minimum_class_level: ClassLevel;
      readonly ability: ResourceFormulaAbility;
    }
  | {
      readonly kind: 'class_level_multiple';
      readonly minimum_class_level: ClassLevel;
      readonly multiplier: PositiveInteger;
    };

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

export interface StoredClassResourceFormula {
  readonly formula_kind: unknown;
  readonly minimum_class_level: unknown;
  readonly fixed_count: unknown;
  readonly ability: unknown;
  readonly multiplier: unknown;
  readonly later_fixed_count_steps: unknown;
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

function nullPayload(value: unknown, field: string): void {
  if (value !== null) {
    throw new ClassResourceFormulaDecodeError(`${field} must be null for this formula kind.`);
  }
}

function parseLaterSteps(value: unknown): readonly ClassResourceFormulaStep[] {
  if (typeof value !== 'string') {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be JSON text.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new ClassResourceFormulaDecodeError('later_fixed_count_steps must be a non-empty array.');
  }
  return parsed.map((entry, index) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      Array.isArray(entry) ||
      Object.keys(entry).sort().join(',') !== 'count,minimum_class_level'
    ) {
      throw new ClassResourceFormulaDecodeError(`later step ${String(index + 1)} has the wrong shape.`);
    }
    const record = entry as Record<string, unknown>;
    return {
      minimum_class_level: classLevel(
        record.minimum_class_level,
        `later step ${String(index + 1)} minimum_class_level`,
      ),
      count: positive(record.count, `later step ${String(index + 1)} count`),
    };
  });
}

/** Decode and jointly validate the formula discriminator and every payload. */
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
      const first: ClassResourceFormulaStep = {
        minimum_class_level: classLevel(row.minimum_class_level, 'minimum_class_level'),
        count: positive(row.fixed_count, 'fixed_count'),
      };
      nullPayload(row.ability, 'ability');
      nullPayload(row.multiplier, 'multiplier');
      const steps = [first, ...parseLaterSteps(row.later_fixed_count_steps)] as const;
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
      return { kind: 'fixed_count_by_class_level', steps };
    }
    case 'ability_modifier_minimum_one': {
      const minimum = classLevel(row.minimum_class_level, 'minimum_class_level');
      nullPayload(row.fixed_count, 'fixed_count');
      if (row.ability !== 'charisma' && row.ability !== 'wisdom') {
        throw new ClassResourceFormulaDecodeError('ability must be charisma or wisdom.');
      }
      nullPayload(row.multiplier, 'multiplier');
      nullPayload(row.later_fixed_count_steps, 'later_fixed_count_steps');
      return {
        kind: 'ability_modifier_minimum_one',
        minimum_class_level: minimum,
        ability: row.ability,
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
