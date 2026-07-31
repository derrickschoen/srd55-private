import {
  COLUMN_FACTS,
  type AnyColumnKey,
  type FactTable,
} from './generated/column-facts';

/**
 * WHICH TEXT COLUMNS HOLD SERIALIZED JSON, AND WHAT SHAPE EACH READER NEEDS.
 *
 * WHY THIS FILE EXISTS AT ALL.
 * A first pass gave every JSON-bearing column the same refinement: "parses as
 * JSON". That is syntax, and syntax is the wrong contract in BOTH directions,
 * which was proved by execution rather than argued:
 *
 *  - TOO LOOSE. `spell_selection_slots.allowed_spell_lists = '{}'` is valid JSON
 *    and passes a syntax check. Every reader of that column
 *    (`decodeStringList`, `stringList`, `constraintList`) returns `[]` for any
 *    non-array, and every eligibility check applies a restriction only when the
 *    list is non-empty — so a document carrying `'{}'` SILENTLY DELETES the
 *    spell restrictions on a slot and the import reports success. A syntax check
 *    that lets a semantic violation through fails open, which is the exact
 *    failure mode row contracts exist to end.
 *  - TOO TIGHT. `character_source_instances.config = ''` is refused by a syntax
 *    check, and `jsonRecord` (`src/queries/source-config.ts:5`) DELIBERATELY
 *    maps `''` to `{}`. Refusing a value this codebase's own reader treats as
 *    meaningful is the data-loss bug D6/D6b calls out.
 *
 * So the unit of classification is not "is JSON" but "what does the reader
 * require", and each entry names the reader it mirrors so the claim can be
 * checked rather than believed.
 *
 * HOW DERIVED IT IS, STATED HONESTLY.
 * The KEYS are compile-checked: `satisfies Partial<Record<EveryColumnKey, …>>`
 * rejects a table or column that does not exist in the generated schema facts,
 * so a renamed or deleted column breaks the build here. The MEMBERSHIP is not
 * derivable — `db/schema/*.ts` declares these as `sqlText()`/`TEXT` exactly like
 * every other text column, and no fact drizzle can report distinguishes a TEXT
 * column holding JSON from one holding a note. Moving the marker into the schema
 * declaration would relocate that judgement, not remove it: an author who writes
 * `sqlText()` for a new JSON column is exactly as unguarded either way. What is
 * guaranteed is that the judgement is made ONCE and is used by every consumer:
 * `src/domain/contracts/rows.ts` (portable-backup rows) and
 * `src/db/candidate-audit.ts` (the live tables of a quarantined image) both read
 * this map, so they cannot disagree about what a column may contain.
 */

export type JsonShape = 'object' | 'array' | 'container' | 'value';

export interface JsonColumnFact {
  /** The JSON node type the column's readers require. */
  readonly shape: JsonShape;
  /**
   * Whether `''` is accepted. True only where a reader maps the empty string to
   * the shape's empty value instead of parsing it — refusing it there would
   * reject a value the application itself treats as meaningful.
   */
  readonly allowEmpty: boolean;
  /** The reader this contract mirrors. Provenance, so the entry can be checked. */
  readonly reader: string;
  /** Optional element contract for array readers that require scalar strings. */
  readonly items?: 'string';
}

type EveryColumnKey = { [T in FactTable]: AnyColumnKey<T> }[FactTable];

export const JSON_COLUMNS = {
  // --- character-owned ------------------------------------------------------
  'character_source_instances.config': {
    shape: 'object',
    allowEmpty: true,
    reader: 'jsonRecord (src/queries/source-config.ts) — throws on a non-object, maps "" to {}',
  },
  'spell_selection_slots.allowed_spell_lists': {
    shape: 'array',
    allowEmpty: true,
    reader: 'decodeStringList (src/eligibility/spell-selection-eligibility.ts) — a non-array silently drops the restriction',
  },
  'spell_selection_slots.allowed_schools': {
    shape: 'array',
    allowEmpty: true,
    items: 'string',
    reader: 'decodeStringList (src/eligibility/spell-selection-eligibility.ts)',
  },
  'spell_selection_slots.allowed_tags': {
    shape: 'array',
    allowEmpty: true,
    reader: 'decodeStringList (src/eligibility/spell-selection-eligibility.ts)',
  },
  'wizard_spellbook_entries.allowed_spell_lists': {
    shape: 'array',
    allowEmpty: true,
    reader: 'decodeConstraint (src/eligibility/spell-selection-assignment.ts)',
  },
  'wizard_spellbook_entries.allowed_schools': {
    shape: 'array',
    allowEmpty: true,
    items: 'string',
    reader: 'decodeConstraint (src/eligibility/spell-selection-assignment.ts)',
  },
  'wizard_spellbook_entries.allowed_tags': {
    shape: 'array',
    allowEmpty: true,
    reader: 'decodeConstraint (src/eligibility/spell-selection-assignment.ts)',
  },
  'spell_selection_slots.free_cast': {
    shape: 'object',
    allowEmpty: false,
    reader: 'parseJson (src/access/spell-access-builder.ts:223); written as JSON.stringify(FreeCast.toObject())',
  },
  'spell_selection_slots.prior_config': {
    shape: 'object',
    allowEmpty: true,
    reader: 'written as a copy of character_source_instances.config, so it carries that column\'s contract',
  },
  'character_rule_overrides.value': {
    shape: 'value',
    allowEmpty: false,
    reader: 'JSON.parse (src/sharing/character-share.ts:397) — any JSON value, but "" throws',
  },
  'character_save_points.snapshot': {
    shape: 'object',
    allowEmpty: false,
    reader: 'SavePointReader.restoreCommand (src/queries/save-points.ts:130) — refuses a non-object outright',
  },
  'character_operations.inverse_command': {
    shape: 'object',
    allowEmpty: false,
    reader: 'parseInverse (src/commands/character-command-executor.ts:58) and parseJson (src/queries/operation-history.ts:62)',
  },
  'change_log.previous_value': {
    shape: 'value',
    allowEmpty: false,
    reader: 'sqlNullableJson via nullableJson (src/queries/operation-history.ts:85) — any JSON value, "" throws',
  },
  'change_log.new_value': {
    shape: 'value',
    allowEmpty: false,
    reader: 'sqlNullableJson via nullableJson (src/queries/operation-history.ts:88)',
  },

  // --- catalog content ------------------------------------------------------
  // Every one of these is read through `decodeGrantJson`
  // (src/grants/source-rule-reader.ts:94), which maps null and "" to `[]` and
  // THROWS on anything that is not an array or an object.
  'class_progressions.slots': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeSlotTable (src/reports/build-report-builder.ts:239); written as JSON.stringify of {} or []',
  },
  'class_progressions.pact_slots': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeSlotTable (src/reports/build-report-builder.ts:239)',
  },
  'class_progressions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'subclass_progressions.slots': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeSlotTable (src/reports/build-report-builder.ts:239)',
  },
  'subclass_progressions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'subclass_definitions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'feat_definitions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'feat_definitions.prerequisites': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'species_definitions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'species_definitions.prerequisites': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'background_definitions.grant_rules': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
  'background_definitions.prerequisites': {
    shape: 'container',
    allowEmpty: true,
    reader: 'decodeGrantJson (src/grants/source-rule-reader.ts:94)',
  },
} as const satisfies Partial<Record<EveryColumnKey, JsonColumnFact>>;

export type JsonColumnKey = keyof typeof JSON_COLUMNS;

export const JSON_COLUMN_KEYS = Object.keys(JSON_COLUMNS) as JsonColumnKey[];

/** `table.column` split back out, for the callers that iterate the map. */
export function jsonColumnLocation(key: JsonColumnKey): {
  readonly table: FactTable;
  readonly column: string;
} {
  const separator = key.indexOf('.');
  const table = key.slice(0, separator) as FactTable;
  const column = key.slice(separator + 1);
  /* c8 ignore next 3 -- unreachable: the keys are compile-checked above. */
  if (!Object.hasOwn(COLUMN_FACTS, table)) {
    throw new Error(`No column facts for ${key}.`);
  }
  return { table, column };
}

const SHAPE_MESSAGE: Readonly<Record<JsonShape, string>> = {
  object: 'must be a JSON object',
  array: 'must be a JSON array',
  container: 'must be a JSON array or object',
  value: 'must be JSON text',
};

function matchesShape(shape: JsonShape, decoded: unknown): boolean {
  switch (shape) {
    case 'value':
      return true;
    case 'array':
      return Array.isArray(decoded);
    case 'object':
      return (
        decoded !== null && typeof decoded === 'object' && !Array.isArray(decoded)
      );
    case 'container':
      return decoded !== null && typeof decoded === 'object';
  }
}

/**
 * The single verdict for one stored JSON value.
 *
 * Returns `null` when the value satisfies its column's contract, otherwise the
 * message fragment the caller appends to its own label. Both consumers — the
 * portable-backup row contracts and the quarantined-image audit — call THIS, so
 * a document and an image are held to the same standard by construction.
 */
export function jsonColumnError(
  fact: JsonColumnFact,
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return SHAPE_MESSAGE[fact.shape];
  }
  if (value === '') {
    return fact.allowEmpty ? null : SHAPE_MESSAGE[fact.shape];
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    return SHAPE_MESSAGE[fact.shape];
  }
  if (!matchesShape(fact.shape, decoded)) {
    return SHAPE_MESSAGE[fact.shape];
  }
  if (
    fact.items === 'string' &&
    Array.isArray(decoded) &&
    decoded.some((item) => typeof item !== 'string')
  ) {
    return 'must be a JSON array of strings';
  }
  return null;
}
