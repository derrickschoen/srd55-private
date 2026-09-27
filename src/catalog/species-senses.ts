import type { SpeciesSense } from '../authoring/contracts';
import type { DatabaseContext } from '../db/database';
import { sqlString } from '../db/codecs';
import {
  isEnumValue,
  rangedSenseKinds,
  SENSE_RANGE_FEET,
  type RangedSenseKind,
} from '../domain/enums';
import type { SpeciesTemplateId } from '../domain/ids';
import {
  contentIdentitySet,
  type ContentIdentitySet,
} from './content-identity';

/**
 * THE ONE READER AND WRITER OF A SPECIES' STATED SENSES (owner D923 Q10).
 *
 * A species that states its senses carries `senses: [{ kind, range_feet }]`:
 * each kind one of the engine's ranged senses, at most once, with a range in
 * `SENSE_RANGE_FEET`; `[]` states "normal sight only". The statement lives in
 * one `species_template_senses` row per template, and its absence is
 * "unstated" — never read as normal sight.
 *
 * Every boundary that admits a statement (a portable file, a stored row)
 * decodes it here, so a sense the engine cannot run, a repeated sense or an
 * out-of-range number is refused at the same rule everywhere.
 */

export type SpeciesSensesProblem =
  | 'not_a_list'
  | 'too_many'
  | 'not_an_object'
  | 'unknown_field'
  | 'unknown_kind'
  | 'range_out_of_bounds'
  | 'repeated_kind';

export type SpeciesSensesDecoding =
  | { readonly ok: true; readonly senses: readonly SpeciesSense[] }
  | { readonly ok: false; readonly index: number | null; readonly problem: SpeciesSensesProblem };

const SENSE_FIELDS = ['kind', 'range_feet'] as const;

export function decodeSpeciesSenses(value: unknown): SpeciesSensesDecoding {
  if (!Array.isArray(value)) return { ok: false, index: null, problem: 'not_a_list' };
  if (value.length > rangedSenseKinds.length) return { ok: false, index: null, problem: 'too_many' };
  const stated = new Set<RangedSenseKind>();
  const senses: SpeciesSense[] = [];
  for (const [index, entry] of value.entries()) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      return { ok: false, index, problem: 'not_an_object' };
    }
    const keys = Object.keys(entry);
    if (keys.length !== SENSE_FIELDS.length || !SENSE_FIELDS.every((field) => keys.includes(field))) {
      return { ok: false, index, problem: 'unknown_field' };
    }
    const kind: unknown = Reflect.get(entry, 'kind');
    const range: unknown = Reflect.get(entry, 'range_feet');
    if (!isEnumValue(rangedSenseKinds, kind)) return { ok: false, index, problem: 'unknown_kind' };
    if (
      typeof range !== 'number' || !Number.isSafeInteger(range) ||
      range < SENSE_RANGE_FEET.minimum || range > SENSE_RANGE_FEET.maximum
    ) {
      return { ok: false, index, problem: 'range_out_of_bounds' };
    }
    if (stated.has(kind)) return { ok: false, index, problem: 'repeated_kind' };
    stated.add(kind);
    senses.push(Object.freeze({ kind, range_feet: range }));
  }
  return { ok: true, senses: Object.freeze(senses) };
}

/**
 * The identity form: a SET, because the order an author listed senses in is
 * not a fact about the species. Content that states no senses has no key in
 * its payload at all, so every fingerprint minted before this field — bundled
 * SRD species included — is byte-identical.
 */
export function canonicalSpeciesSenses(
  senses: readonly SpeciesSense[],
): ContentIdentitySet<SpeciesSense> {
  return contentIdentitySet(senses.map(({ kind, range_feet }) => ({ kind, range_feet })));
}

/** The stored statement of one template, `undefined` when it states none. */
export function readStoredSpeciesSenses(
  db: DatabaseContext,
  templateId: SpeciesTemplateId | number,
): SpeciesSensesDecoding | undefined {
  const stored = db.one(
    'SELECT senses_json FROM species_template_senses WHERE species_template_id = ?',
    [templateId],
    (row) => sqlString(row, 'senses_json'),
  );
  if (stored === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored) as unknown;
  } catch {
    return { ok: false, index: null, problem: 'not_a_list' };
  }
  return decodeSpeciesSenses(parsed);
}

/** Writes a template's statement; content that states none writes no row. */
export function insertStoredSpeciesSenses(
  db: DatabaseContext,
  templateId: SpeciesTemplateId | number,
  senses: readonly SpeciesSense[] | undefined,
  now: string,
): void {
  if (senses === undefined) return;
  db.exec(
    `INSERT INTO species_template_senses
       (species_template_id, senses_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [
      templateId,
      JSON.stringify(senses.map(({ kind, range_feet }) => ({ kind, range_feet }))),
      now,
      now,
    ],
  );
}
