import {
  isEnumValue,
  spellAreaShapes,
  spellRangeKinds,
  type SpellAreaShape,
  type SpellRangeKind,
} from './enums';

/**
 * A SPELL'S PRINTED RANGE LINE, STRUCTURED — with the printed line itself kept
 * verbatim beside it in `spell_versions.range`, ALWAYS.
 *
 * D26's ruling was *"store distance as a number of feet. Shape Type is a
 * separate enum nullable"*. This module is that ruling plus the two things it
 * has no room for, both of which are in this repository today:
 *
 *  1. `Self` and `Touch` are not distances (see {@link SpellRangeKind}). They
 *     get a KIND, not a feet value.
 *  2. `Self (30-foot Cone)` carries an ORIGIN and an AREA at once, and the 30
 *     belongs to the cone rather than to the range. So the distance to the
 *     target point and the size of the area are TWO numbers, not one.
 *
 * WHY `area` IS ITS OWN OBJECT RATHER THAN TWO LOOSE NULLABLE FIELDS. A shape
 * with no size and a size with no shape are both meaningless, and a pair of
 * independent nullables makes both of them representable. `SpellArea` makes
 * them one value that is present or absent, which is the type-system half of
 * the `background_equipment_items`-style correlation CHECK the schema carries
 * for the same pair. AGENTS.md §1: an absence is a type, not a fallback.
 *
 * WHY `ranged` CARRIES A REQUIRED `feet` AND THE OTHER FIVE KINDS HAVE NO SUCH
 * FIELD AT ALL. A zero-foot range and an unrecorded range are different facts,
 * and D24 forbids printing an assumption as one. Making `feet` a field only
 * `ranged` has means `{ kind: 'touch', feet: 0 }` does not typecheck, so the
 * "absent means 0" bug cannot be written here.
 */
export interface SpellArea {
  readonly shape: SpellAreaShape;
  /**
   * The area's ONE printed dimension: a sphere's radius, a cylinder's radius, a
   * cone's length, a line's length. A line's WIDTH and a cylinder's HEIGHT are
   * not modelled — see {@link SpellAreaShape} for why, and note that both
   * survive verbatim in the raw range text.
   */
  readonly feet: number;
}

export type SpellRange =
  | {
      readonly kind: 'ranged';
      readonly feet: number;
      readonly area: SpellArea | null;
    }
  | {
      readonly kind: Exclude<SpellRangeKind, 'ranged'>;
      readonly area: SpellArea | null;
    };

/** The four columns `spell_versions` stores a {@link SpellRange} in. */
export interface SpellRangeColumns {
  readonly range_kind: SpellRangeKind | null;
  readonly range_feet: number | null;
  readonly area_shape: SpellAreaShape | null;
  readonly area_feet: number | null;
}

export const ABSENT_SPELL_RANGE: SpellRangeColumns = {
  range_kind: null,
  range_feet: null,
  area_shape: null,
  area_feet: null,
};

const DISTANCE = /^(?<amount>\d{1,6})[ -]?(?:feet|foot|ft\.?)$/iu;
const AREA =
  /^(?<amount>\d{1,6})[ -]?(?:feet|foot|ft\.?)[ -]?(?:radius[ -]?)?(?<shape>sphere|cylinder|cone|line)$/iu;
const SELF_WITH_AREA = /^self\s*\((?<area>[^()]+)\)$/iu;
const MILES = /^(?<amount>\d{1,6})[ -]?miles?$/iu;

const FEET_PER_MILE = 5280;

/**
 * THE BARE WORDS THIS RECOGNISES, and the reason the map is a `Map` rather than
 * an object literal.
 *
 * D33 found `QUALIFIER_WORDS['constructor']` returning a FUNCTION instead of
 * `undefined`, so a value named `constructor` walked past the guard and was
 * silently dropped. `range` is user-supplied text with no vocabulary check at
 * all (`nullableString` in `src/catalog/catalog-schema.ts` tests only
 * `typeof value === 'string'`), so `constructor` and `__proto__` are both
 * reachable strings here. A `Map` removes the question by construction rather
 * than by a guard someone must remember.
 */
const BARE_KINDS = new Map<string, Exclude<SpellRangeKind, 'ranged'>>([
  ['self', 'self'],
  ['touch', 'touch'],
  ['sight', 'sight'],
  ['unlimited', 'unlimited'],
  ['special', 'special'],
]);

/**
 * Every Unicode dash a printed source uses where an ASCII hyphen is meant, plus
 * the non-breaking space, WRITTEN AS ESCAPES.
 *
 * F14 is why they are escapes rather than literal characters: three source
 * files in this repository were invisible to plain `grep` because they carried
 * literal NUL bytes, and the fix was to spell them. A literal U+2011 in a
 * character class is not invisible, but on screen it is indistinguishable from
 * an ASCII `-`, which is the same defect one step milder — a reader cannot
 * tell whether this line does anything at all.
 */
const DASHES = /[\u2010\u2011\u2012\u2013\u2014\u2212]/gu;
const NON_BREAKING_SPACE = /\u00a0/gu;

function normalise(raw: string): string {
  // A `pdftotext -layout` extract and a hand-written homebrew document disagree
  // about which dash and which space they use. Normalising before matching is
  // what keeps a `30\u2011foot Cone` from silently failing to parse and storing
  // nothing.
  return raw
    .replaceAll(DASHES, '-')
    .replaceAll(NON_BREAKING_SPACE, ' ')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

function parseArea(text: string): SpellArea | null {
  const groups = AREA.exec(text.replaceAll(' ', ''))?.groups;
  if (groups?.amount === undefined || groups.shape === undefined) {
    return null;
  }
  const feet = Number(groups.amount);
  const shape = groups.shape.toLowerCase();
  if (feet <= 0 || !isEnumValue(spellAreaShapes, shape)) {
    return null;
  }
  return { shape, feet };
}

/**
 * READ A PRINTED RANGE LINE. `null` MEANS "NOT RECOGNISED", NOT "NO RANGE".
 *
 * THE PARSE IS DELIBERATELY CONSERVATIVE AND NEVER GUESSES. Anything it cannot
 * read whole returns `null`, which stores four NULLs and leaves the author's
 * text untouched and displayed. That is what makes this safe on a column whose
 * writers admit any string at all: `tools/scrape/parse-spell.ts` assigns
 * whatever text follows `Range:` on a scraped page, and the importer stores it
 * unexamined. `Sight`, `Unlimited`, `500 miles`, `Self (30-foot Cone)`,
 * `Touch`, `` and `Anywhere on this plane` are every one of them accepted by
 * the column today; five of the six are read here and the sixth is preserved.
 *
 * IT IS NOT THE F13 SHAPE. F13 removed two regexes because they OVERRODE an
 * explicit boolean the document was required to carry. There is no explicit
 * field here to override — the Tier 1 document format has no structured range
 * of any kind — so this is the only source, and it can only ADD structure to a
 * string that was previously opaque. It cannot contradict an author, because
 * an author has nothing to say that this could disagree with. The moment such
 * a field is added, IT must win and this becomes the fallback; that ordering is
 * D12/Q4 and is recorded here so the next increment does not have to rediscover
 * it.
 *
 * MILES ARE CONVERTED, and that is the one liberty taken: `1 mile` is a
 * distance in the same units question as `60 feet`, and refusing it would store
 * nothing for a value that is unambiguously a distance. `500 miles` is
 * 2,640,000 feet, which is a large number and a true one.
 */
export function parseSpellRange(raw: string | null): SpellRange | null {
  if (raw === null) {
    return null;
  }
  const text = normalise(raw);
  if (text === '') {
    return null;
  }

  const bare = BARE_KINDS.get(text.toLowerCase());
  if (bare !== undefined) {
    return { kind: bare, area: null };
  }

  const selfArea = SELF_WITH_AREA.exec(text)?.groups?.area;
  if (selfArea !== undefined) {
    const area = parseArea(selfArea);
    return area === null ? null : { kind: 'self', area };
  }

  const compact = text.replaceAll(' ', '');
  const distance = DISTANCE.exec(compact)?.groups?.amount;
  if (distance !== undefined) {
    return { kind: 'ranged', feet: Number(distance), area: null };
  }

  const miles = MILES.exec(compact)?.groups?.amount;
  if (miles !== undefined) {
    return {
      kind: 'ranged',
      feet: Number(miles) * FEET_PER_MILE,
      area: null,
    };
  }

  return null;
}

/** A {@link SpellRange} as the four columns, or four NULLs for `null`. */
export function encodeSpellRange(range: SpellRange | null): SpellRangeColumns {
  if (range === null) {
    return ABSENT_SPELL_RANGE;
  }
  return {
    range_kind: range.kind,
    range_feet: range.kind === 'ranged' ? range.feet : null,
    area_shape: range.area?.shape ?? null,
    area_feet: range.area?.feet ?? null,
  };
}

/**
 * The four columns back into a {@link SpellRange}, or `null` if they do not
 * describe one.
 *
 * TOLERANT ON THE WAY IN, PER D11 PART 2. These columns can come off a
 * hand-edited image whose CHECK constraints were never applied — the pre-CHECK
 * state F11 named — so an unknown `range_kind`, a `ranged` row with no feet, or
 * a shape with no size all read as NO STRUCTURED RANGE rather than throwing or
 * being half-believed. The raw text is unaffected and still prints.
 */
export function decodeSpellRange(columns: SpellRangeColumns): SpellRange | null {
  const { range_kind: kind, range_feet: feet } = columns;
  if (kind === null || !isEnumValue(spellRangeKinds, kind)) {
    return null;
  }
  const area = decodeArea(columns);
  // EXHAUSTIVE, WITH NO `default` ARM, so a seventh SpellRangeKind is a compile
  // error here rather than a range that silently reads as absent. This is the
  // only place in the application that branches on the kind, which is why the
  // guard lives here rather than in a formatter nothing calls.
  switch (kind) {
    case 'ranged':
      return feet === null || !Number.isSafeInteger(feet) || feet < 0
        ? null
        : { kind, feet, area };
    case 'self':
    case 'touch':
    case 'sight':
    case 'unlimited':
    case 'special':
      // A distance on a kind that is not `ranged` is the combination the
      // schema CHECK refuses, so a row holding one came off an image whose
      // CHECKs were never applied. It reads as NO structured range rather than
      // as a range with a number nobody printed.
      return feet === null ? { kind, area } : null;
  }
}

function decodeArea(columns: SpellRangeColumns): SpellArea | null {
  const { area_shape: shape, area_feet: feet } = columns;
  if (shape === null || feet === null) {
    return null;
  }
  if (!isEnumValue(spellAreaShapes, shape)) {
    return null;
  }
  return Number.isSafeInteger(feet) && feet > 0 ? { shape, feet } : null;
}
