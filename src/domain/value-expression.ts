import type { PositiveInteger } from './class-resources';
import {
  abilities,
  type Ability,
  type CharacterLevel,
} from './enums';
import type { ClassLevel, ContentKey } from './ids';

export type NonEmpty<T> = readonly [T, ...T[]];

export type ValueSource =
  | { readonly kind: 'class_level'; readonly class_content_key: ContentKey }
  | { readonly kind: 'character_level' }
  | { readonly kind: 'proficiency_bonus' }
  | { readonly kind: 'ability_modifier'; readonly ability: Ability };

export type LevelSource = Extract<
  ValueSource,
  { readonly kind: 'class_level' | 'character_level' }
>;

export interface ValueTableRow {
  readonly from: ClassLevel;
  readonly to: ClassLevel;
  readonly amount: number;
}

export interface ValuePiecewiseSegment {
  readonly from: ClassLevel;
  readonly to: ClassLevel;
  readonly value: ValueExpression;
}

export type ValueExpression =
  | { readonly kind: 'const'; readonly amount: number }
  | { readonly kind: 'ref'; readonly source: ValueSource }
  | {
      readonly kind: 'scale';
      readonly source: ValueSource;
      readonly multiply?: PositiveInteger;
      readonly divide?: PositiveInteger;
      readonly round: 'floor' | 'ceiling';
    }
  | {
      readonly kind: 'table';
      readonly level_source: LevelSource;
      readonly rows: NonEmpty<ValueTableRow>;
    }
  | {
      readonly kind: 'piecewise';
      readonly level_source: LevelSource;
      readonly segments: NonEmpty<ValuePiecewiseSegment>;
    }
  | { readonly kind: 'sum'; readonly terms: NonEmpty<ValueExpression> }
  | {
      readonly kind: 'clamp';
      readonly value: ValueExpression;
      readonly minimum?: ValueExpression;
      readonly maximum?: ValueExpression;
    };

export const VALUE_EXPRESSION_LIMITS = Object.freeze({
  encodedBytes: 16_384,
  depth: 16,
  breadth: 128,
});

export type DecodedValueExpression =
  | { readonly kind: 'decoded'; readonly value: ValueExpression }
  | { readonly kind: 'invalid_data' };

export interface ValueEvaluationContext {
  readonly character_level: CharacterLevel;
  readonly proficiency_bonus: PositiveInteger;
  readonly class_levels: ReadonlyMap<ContentKey, ClassLevel>;
  readonly ability_modifiers: ReadonlyMap<Ability, number>;
}

export type ValueResolution =
  | { readonly kind: 'resolved'; readonly value: number }
  | {
      readonly kind: 'unavailable';
      readonly reason:
        | 'missing_class'
        | 'missing_ability'
        | 'invalid_data'
        | 'overflow';
    };

const valueExpressionKinds = [
  'const',
  'ref',
  'scale',
  'table',
  'piecewise',
  'sum',
  'clamp',
] as const;
type ValueExpressionKind = (typeof valueExpressionKinds)[number];

const valueSourceKinds = [
  'class_level',
  'character_level',
  'proficiency_bonus',
  'ability_modifier',
] as const;
type ValueSourceKind = (typeof valueSourceKinds)[number];

type JsonRecord = Record<string, unknown>;

interface DecodeState {
  breadth: number;
}

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function exactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function enumMember<T extends string>(
  values: readonly T[],
  value: unknown,
): T | null {
  return typeof value === 'string' &&
    values.some((candidate) => candidate === value)
    ? (value as T)
    : null;
}

function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function isPositiveInteger(value: unknown): value is PositiveInteger {
  return isSafeInteger(value) && value > 0;
}

function isClassLevel(value: unknown): value is ClassLevel {
  return isSafeInteger(value) && value >= 1 && value <= 20;
}

function isAbility(value: unknown): value is Ability {
  return (
    typeof value === 'string' &&
    abilities.some((ability) => ability === value)
  );
}

function nonEmpty<T>(values: readonly T[]): NonEmpty<T> | null {
  const first = values[0];
  return first === undefined ? null : [first, ...values.slice(1)];
}

function decodeValueSource(value: unknown): ValueSource | null {
  const input = record(value);
  const kind = enumMember(valueSourceKinds, input?.kind);
  if (input === null || kind === null) return null;

  switch (kind) {
    case 'class_level':
      return exactKeys(input, ['kind', 'class_content_key']) &&
        typeof input.class_content_key === 'string' &&
        input.class_content_key.length > 0
        ? {
            kind,
            class_content_key: input.class_content_key as ContentKey,
          }
        : null;
    case 'character_level':
    case 'proficiency_bonus':
      return exactKeys(input, ['kind']) ? { kind } : null;
    case 'ability_modifier':
      return exactKeys(input, ['kind', 'ability']) && isAbility(input.ability)
        ? { kind, ability: input.ability }
        : null;
    /* c8 ignore next 4 -- the vocabulary above is closed; retaining the
       sentinel turns a new source kind into a compile error here. */
    default: {
      const unreachable: never = kind;
      throw new Error(`Unhandled value source kind ${String(unreachable)}.`);
    }
  }
}

function decodeLevelSource(value: unknown): LevelSource | null {
  const decoded = decodeValueSource(value);
  if (decoded === null) return null;

  switch (decoded.kind) {
    case 'class_level':
    case 'character_level':
      return decoded;
    case 'proficiency_bonus':
    case 'ability_modifier':
      return null;
    /* c8 ignore next 4 -- a new ValueSource arm must make an explicit level
       source decision rather than silently becoming eligible. */
    default: {
      const unreachable: never = decoded;
      throw new Error(`Unhandled level source ${String(unreachable)}.`);
    }
  }
}

function boundedList(
  value: unknown,
  state: DecodeState,
): readonly unknown[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  state.breadth += value.length;
  return state.breadth <= VALUE_EXPRESSION_LIMITS.breadth ? value : null;
}

function decodeTableRows(
  value: unknown,
  state: DecodeState,
): NonEmpty<ValueTableRow> | null {
  const input = boundedList(value, state);
  if (input === null) return null;

  const rows: ValueTableRow[] = [];
  let previousTo: ClassLevel | null = null;
  for (const candidate of input) {
    const row = record(candidate);
    if (
      row === null ||
      !exactKeys(row, ['from', 'to', 'amount']) ||
      !isClassLevel(row.from) ||
      !isClassLevel(row.to) ||
      !isSafeInteger(row.amount) ||
      row.from > row.to ||
      (previousTo !== null && row.from !== previousTo + 1)
    ) {
      return null;
    }
    rows.push({ from: row.from, to: row.to, amount: row.amount });
    previousTo = row.to;
  }
  return nonEmpty(rows);
}

function decodePiecewiseSegments(
  value: unknown,
  depth: number,
  state: DecodeState,
): NonEmpty<ValuePiecewiseSegment> | null {
  const input = boundedList(value, state);
  if (input === null) return null;

  const segments: ValuePiecewiseSegment[] = [];
  let previousTo: ClassLevel | null = null;
  for (const candidate of input) {
    const segment = record(candidate);
    if (
      segment === null ||
      !exactKeys(segment, ['from', 'to', 'value']) ||
      !isClassLevel(segment.from) ||
      !isClassLevel(segment.to) ||
      segment.from > segment.to ||
      (previousTo !== null && segment.from !== previousTo + 1)
    ) {
      return null;
    }
    const decoded = decodeExpression(segment.value, depth + 1, state);
    if (decoded === null) return null;
    segments.push({
      from: segment.from,
      to: segment.to,
      value: decoded,
    });
    previousTo = segment.to;
  }
  return nonEmpty(segments);
}

function optionalKeys(
  input: JsonRecord,
  required: readonly string[],
  optional: readonly string[],
): boolean {
  return exactKeys(input, [
    ...required,
    ...optional.filter((key) => input[key] !== undefined),
  ]);
}

function decodeExpression(
  value: unknown,
  depth: number,
  state: DecodeState,
): ValueExpression | null {
  if (depth > VALUE_EXPRESSION_LIMITS.depth) return null;
  const input = record(value);
  const kind = enumMember(valueExpressionKinds, input?.kind);
  if (input === null || kind === null) return null;

  switch (kind) {
    case 'const':
      return exactKeys(input, ['kind', 'amount']) &&
        isSafeInteger(input.amount)
        ? { kind, amount: input.amount }
        : null;
    case 'ref': {
      const source = exactKeys(input, ['kind', 'source'])
        ? decodeValueSource(input.source)
        : null;
      return source === null ? null : { kind, source };
    }
    case 'scale': {
      if (
        !optionalKeys(
          input,
          ['kind', 'source', 'round'],
          ['multiply', 'divide'],
        ) ||
        (input.round !== 'floor' && input.round !== 'ceiling') ||
        (input.multiply !== undefined &&
          !isPositiveInteger(input.multiply)) ||
        (input.divide !== undefined && !isPositiveInteger(input.divide))
      ) {
        return null;
      }
      const source = decodeValueSource(input.source);
      if (source === null) return null;
      return {
        kind,
        source,
        round: input.round,
        ...(input.multiply === undefined
          ? {}
          : { multiply: input.multiply }),
        ...(input.divide === undefined ? {} : { divide: input.divide }),
      };
    }
    case 'table': {
      if (!exactKeys(input, ['kind', 'level_source', 'rows'])) return null;
      const levelSource = decodeLevelSource(input.level_source);
      const rows = decodeTableRows(input.rows, state);
      return levelSource === null || rows === null
        ? null
        : { kind, level_source: levelSource, rows };
    }
    case 'piecewise': {
      if (!exactKeys(input, ['kind', 'level_source', 'segments'])) return null;
      const levelSource = decodeLevelSource(input.level_source);
      const segments = decodePiecewiseSegments(input.segments, depth, state);
      return levelSource === null || segments === null
        ? null
        : { kind, level_source: levelSource, segments };
    }
    case 'sum': {
      if (!exactKeys(input, ['kind', 'terms'])) return null;
      const candidates = boundedList(input.terms, state);
      if (candidates === null) return null;
      const terms: ValueExpression[] = [];
      for (const candidate of candidates) {
        const decoded = decodeExpression(candidate, depth + 1, state);
        if (decoded === null) return null;
        terms.push(decoded);
      }
      const decodedTerms = nonEmpty(terms);
      return decodedTerms === null ? null : { kind, terms: decodedTerms };
    }
    case 'clamp': {
      if (
        !optionalKeys(input, ['kind', 'value'], ['minimum', 'maximum'])
      ) {
        return null;
      }
      const decodedValue = decodeExpression(input.value, depth + 1, state);
      const minimum =
        input.minimum === undefined
          ? undefined
          : decodeExpression(input.minimum, depth + 1, state);
      const maximum =
        input.maximum === undefined
          ? undefined
          : decodeExpression(input.maximum, depth + 1, state);
      if (
        decodedValue === null ||
        minimum === null ||
        maximum === null ||
        (minimum?.kind === 'const' &&
          maximum?.kind === 'const' &&
          minimum.amount > maximum.amount)
      ) {
        return null;
      }
      return {
        kind,
        value: decodedValue,
        ...(minimum === undefined ? {} : { minimum }),
        ...(maximum === undefined ? {} : { maximum }),
      };
    }
    /* c8 ignore next 4 -- the constructor vocabulary is closed; retaining the
       sentinel turns a new expression kind into a compile error here. */
    default: {
      const unreachable: never = kind;
      throw new Error(
        `Unhandled value expression kind ${String(unreachable)}.`,
      );
    }
  }
}

export function decodedValueExpression(json: string): DecodedValueExpression {
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes < 1 || bytes > VALUE_EXPRESSION_LIMITS.encodedBytes) {
    return { kind: 'invalid_data' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { kind: 'invalid_data' };
  }
  const value = decodeExpression(parsed, 0, { breadth: 0 });
  return value === null
    ? { kind: 'invalid_data' }
    : { kind: 'decoded', value };
}

function invalidData(): ValueResolution {
  return { kind: 'unavailable', reason: 'invalid_data' };
}

function resolvedInput(value: unknown): ValueResolution {
  return isSafeInteger(value) ? { kind: 'resolved', value } : invalidData();
}

function resolveSource(
  source: ValueSource,
  context: ValueEvaluationContext,
): ValueResolution {
  switch (source.kind) {
    case 'class_level': {
      const level = context.class_levels.get(source.class_content_key);
      if (level === undefined) {
        return { kind: 'unavailable', reason: 'missing_class' };
      }
      return isClassLevel(level) ? { kind: 'resolved', value: level } : invalidData();
    }
    case 'character_level':
      return isClassLevel(context.character_level)
        ? { kind: 'resolved', value: context.character_level }
        : invalidData();
    case 'proficiency_bonus':
      return isPositiveInteger(context.proficiency_bonus)
        ? { kind: 'resolved', value: context.proficiency_bonus }
        : invalidData();
    case 'ability_modifier': {
      const modifier = context.ability_modifiers.get(source.ability);
      return modifier === undefined
        ? { kind: 'unavailable', reason: 'missing_ability' }
        : resolvedInput(modifier);
    }
    /* c8 ignore next 4 -- the switch is exhaustive so a new source cannot
       silently resolve as a plausible number. */
    default: {
      const unreachable: never = source;
      throw new Error(`Unhandled value source ${String(unreachable)}.`);
    }
  }
}

function validSchedule(
  entries: NonEmpty<{ readonly from: ClassLevel; readonly to: ClassLevel }>,
): boolean {
  let previousTo: ClassLevel | null = null;
  for (const entry of entries) {
    if (
      !isClassLevel(entry.from) ||
      !isClassLevel(entry.to) ||
      entry.from > entry.to ||
      (previousTo !== null && entry.from !== previousTo + 1)
    ) {
      return false;
    }
    previousTo = entry.to;
  }
  return true;
}

function overflowChecked(value: number): ValueResolution {
  return Number.isSafeInteger(value)
    ? { kind: 'resolved', value }
    : { kind: 'unavailable', reason: 'overflow' };
}

export function evaluateValue(
  expression: ValueExpression,
  context: ValueEvaluationContext,
): ValueResolution {
  switch (expression.kind) {
    case 'const':
      return resolvedInput(expression.amount);
    case 'ref':
      return resolveSource(expression.source, context);
    case 'scale': {
      if (
        (expression.multiply !== undefined &&
          !isPositiveInteger(expression.multiply)) ||
        (expression.divide !== undefined &&
          !isPositiveInteger(expression.divide))
      ) {
        return invalidData();
      }
      const source = resolveSource(expression.source, context);
      if (source.kind === 'unavailable') return source;
      const multiplied = source.value * (expression.multiply ?? 1);
      if (!Number.isSafeInteger(multiplied)) {
        return { kind: 'unavailable', reason: 'overflow' };
      }
      const divided = multiplied / (expression.divide ?? 1);
      return overflowChecked(
        expression.round === 'floor'
          ? Math.floor(divided)
          : Math.ceil(divided),
      );
    }
    case 'table': {
      if (
        !validSchedule(expression.rows) ||
        expression.rows.some((row) => !isSafeInteger(row.amount))
      ) {
        return invalidData();
      }
      const level = resolveSource(expression.level_source, context);
      if (level.kind === 'unavailable') return level;
      const selected = expression.rows.find(
        (row) => level.value >= row.from && level.value <= row.to,
      );
      return selected === undefined
        ? invalidData()
        : { kind: 'resolved', value: selected.amount };
    }
    case 'piecewise': {
      if (!validSchedule(expression.segments)) return invalidData();
      const level = resolveSource(expression.level_source, context);
      if (level.kind === 'unavailable') return level;
      const selected = expression.segments.find(
        (segment) =>
          level.value >= segment.from && level.value <= segment.to,
      );
      return selected === undefined
        ? invalidData()
        : evaluateValue(selected.value, context);
    }
    case 'sum': {
      if (expression.terms.length === 0) return invalidData();
      let total = 0;
      for (const term of expression.terms) {
        const resolved = evaluateValue(term, context);
        if (resolved.kind === 'unavailable') return resolved;
        total += resolved.value;
        if (!Number.isSafeInteger(total)) {
          return { kind: 'unavailable', reason: 'overflow' };
        }
      }
      return { kind: 'resolved', value: total };
    }
    case 'clamp': {
      const resolved = evaluateValue(expression.value, context);
      if (resolved.kind === 'unavailable') return resolved;
      const minimum =
        expression.minimum === undefined
          ? undefined
          : evaluateValue(expression.minimum, context);
      if (minimum?.kind === 'unavailable') return minimum;
      const maximum =
        expression.maximum === undefined
          ? undefined
          : evaluateValue(expression.maximum, context);
      if (maximum?.kind === 'unavailable') return maximum;
      if (
        minimum !== undefined &&
        maximum !== undefined &&
        minimum.value > maximum.value
      ) {
        return invalidData();
      }
      return {
        kind: 'resolved',
        value: Math.min(
          maximum?.value ?? Number.MAX_SAFE_INTEGER,
          Math.max(minimum?.value ?? Number.MIN_SAFE_INTEGER, resolved.value),
        ),
      };
    }
    /* c8 ignore next 4 -- the switch is exhaustive so a new constructor
       cannot become a silent no-op. */
    default: {
      const unreachable: never = expression;
      throw new Error(
        `Unhandled value expression ${String(unreachable)}.`,
      );
    }
  }
}
