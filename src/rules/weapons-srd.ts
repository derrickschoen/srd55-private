/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE WEAPON CATALOG IS PARSED, NOT TRANSCRIBED.
 *
 * The two files this module imports are verbatim `pdftotext -layout` extracts,
 * committed with their provenance in `docs/srd/SOURCE.md` (document URL, byte
 * size, SHA-256 and the exact command). Everything this module writes to the
 * database is derived from them by the parser below.
 *
 * WHY PARSING RATHER THAN A HAND-TYPED TABLE. A transcription is a second
 * source that immediately begins to drift from the first, and reviewing it
 * means re-reading 38 rows of numbers against a PDF. A parser makes the seed
 * DIFFABLE AGAINST THE EXTRACT: `git diff` on a `.txt` file under
 * `docs/srd/source/` is the whole review, and a value that is not in that file
 * cannot reach the database at all.
 *
 * THE PARSER FAILS LOUDLY, ON PURPOSE. An unrecognised weapon property, a row
 * that does not match the expected shape, a class table that is not exactly
 * levels 1..20 — every one of these throws. The alternative, skipping what it
 * does not understand, would turn an extraction change into a silently short
 * catalog, which is the failure mode this whole arrangement exists to prevent.
 *
 * WHAT IS DELIBERATELY NOT PARSED. Weight and cost are in the extract and are
 * not modelled: they are encumbrance and economy concepts and this application
 * has no inventory. Because a character stores VALUES and never a template
 * reference, adding them later touches no character row.
 */
import weaponsTableExtract from '../../docs/srd/source/weapons-table.txt?raw';
import masteryProgressionExtract from '../../docs/srd/source/weapon-mastery-progression.txt?raw';
import type { DatabaseContext } from '../db/database';
import {
  isEnumValue,
  weaponMasteryProperties,
  type SrdWeaponGroup,
  type WeaponMasteryGrant,
  type WeaponMasteryProperty,
} from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';

/** The rules edition every bundled weapon belongs to. */
export const BUNDLED_WEAPON_RULES_EDITION = '2024';

/**
 * One parsed row of the source's weapons table.
 *
 * The field names are the `weapon_templates` column names, and that is not
 * laziness: the seeder inserts this object column-wise, and the UI's template
 * pre-fill copies the same names into `character_weapons`. Keeping the three
 * lists identical is what makes the copy need no mapping table.
 */
export interface SrdWeaponTemplate {
  readonly content_key: string;
  readonly name: string;
  readonly srd_group: SrdWeaponGroup;
  readonly damage_dice: string;
  readonly damage_type: string;
  readonly versatile_damage_dice: string | null;
  readonly finesse: boolean;
  readonly heavy: boolean;
  readonly light: boolean;
  readonly loading: boolean;
  readonly reach: boolean;
  readonly thrown: boolean;
  readonly two_handed: boolean;
  readonly ammunition: boolean;
  readonly ammunition_kind: string | null;
  readonly range_normal_feet: number | null;
  readonly range_long_feet: number | null;
  readonly mastery_property: WeaponMasteryProperty;
  readonly other_properties: string | null;
}

export interface SrdMasteryProgression {
  readonly class_name: string;
  /** Absolute count per level, exactly as the class table prints it. */
  readonly counts: ReadonlyMap<number, number>;
}

const GROUP_HEADINGS: Readonly<Record<string, SrdWeaponGroup>> = {
  'Simple Melee Weapons': 'simple_melee',
  'Simple Ranged Weapons': 'simple_ranged',
  'Martial Melee Weapons': 'martial_melee',
  'Martial Ranged Weapons': 'martial_ranged',
};

/**
 * Name, damage and the remainder of the row.
 *
 * The name is LAZY and the separator is `\s+` rather than `\s{2,}`, because the
 * extract's column alignment is not reliable: `Heavy Crossbow 1d10 Piercing`
 * has a single space where every other row has many. Laziness plus the damage
 * anchor resolves `War Pick`, `Light Hammer` and `Heavy Crossbow` correctly
 * without depending on character positions.
 */
const WEAPON_ROW =
  /^\s+(?<name>[A-Za-z][A-Za-z ]*?)\s+(?<dice>\d+d\d+|\d+)\s+(?<damageType>Bludgeoning|Piercing|Slashing)\s+(?<rest>\S.*)$/;

/** Trailing cost, then trailing weight — both stripped and discarded. */
const TRAILING_COST = /\s+\d+(?:\/\d+)?\s+(?:CP|SP|GP)\s*$/;
const TRAILING_WEIGHT = /\s{2,}(?:—|[\d/]+ lb\.)\s*$/;
const TRAILING_MASTERY = /\s{2,}(?<mastery>[A-Z][a-z]+)\s*$/;

const AMMUNITION_PROPERTY =
  /^Ammunition \(Range (?<normal>\d+)\/(?<long>\d+); (?<kind>[A-Za-z]+)\)$/;
const THROWN_PROPERTY = /^Thrown \(Range (?<normal>\d+)\/(?<long>\d+)\)$/;
const VERSATILE_PROPERTY = /^Versatile \((?<dice>\d+d\d+)\)$/;
/** A plain toggle carrying a qualification, e.g. `Two-Handed (unless mounted)`. */
const QUALIFIED_PROPERTY = /^(?<toggle>[A-Za-z-]+) \((?<qualifier>[^)]+)\)$/;

const PLAIN_TOGGLES: Readonly<
  Record<string, keyof Pick<
    SrdWeaponTemplate,
    'finesse' | 'heavy' | 'light' | 'loading' | 'reach' | 'two_handed'
  >>
> = {
  Finesse: 'finesse',
  Heavy: 'heavy',
  Light: 'light',
  Loading: 'loading',
  Reach: 'reach',
  'Two-Handed': 'two_handed',
};

class SrdExtractError extends Error {
  constructor(message: string) {
    super(`SRD extract: ${message}`);
    this.name = 'SrdExtractError';
  }
}

export function weaponContentKey(name: string): string {
  return `${BUNDLED_WEAPON_RULES_EDITION}:weapon:${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

interface MutableTemplate {
  name: string;
  srd_group: SrdWeaponGroup;
  damage_dice: string;
  damage_type: string;
  mastery_property: WeaponMasteryProperty;
  /** Accumulated property text; continuation lines append to it. */
  properties: string;
}

/**
 * Splits a property list on commas that are NOT inside parentheses.
 *
 * The extract happens to use `;` inside its one bracketed list, so a plain
 * `split(',')` would work today. It is written this way because the day a
 * bracketed property contains a comma, the plain split fails by silently
 * producing two garbage tokens rather than by throwing.
 */
function splitProperties(text: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of text) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      tokens.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  tokens.push(current.trim());
  return tokens.filter((token) => token !== '');
}

function applyProperties(
  weapon: MutableTemplate,
): Omit<SrdWeaponTemplate, 'content_key'> {
  const flags = {
    finesse: false,
    heavy: false,
    light: false,
    loading: false,
    reach: false,
    thrown: false,
    two_handed: false,
    ammunition: false,
  };
  let versatile: string | null = null;
  let ammunitionKind: string | null = null;
  let rangeNormal: number | null = null;
  let rangeLong: number | null = null;
  const qualifications: string[] = [];

  const text = weapon.properties.trim();
  for (const token of text === '—' ? [] : splitProperties(text)) {
    const plain = PLAIN_TOGGLES[token];
    if (plain !== undefined) {
      flags[plain] = true;
      continue;
    }

    const ammunition = AMMUNITION_PROPERTY.exec(token)?.groups;
    if (ammunition !== undefined) {
      flags.ammunition = true;
      ammunitionKind = ammunition.kind as string;
      rangeNormal = Number(ammunition.normal);
      rangeLong = Number(ammunition.long);
      continue;
    }

    const thrown = THROWN_PROPERTY.exec(token)?.groups;
    if (thrown !== undefined) {
      flags.thrown = true;
      rangeNormal = Number(thrown.normal);
      rangeLong = Number(thrown.long);
      continue;
    }

    const versatileMatch = VERSATILE_PROPERTY.exec(token)?.groups;
    if (versatileMatch !== undefined) {
      // The die alone records the property. There is no `versatile` boolean,
      // so the impossible pair `versatile = 1, die = NULL` cannot be written.
      versatile = versatileMatch.dice as string;
      continue;
    }

    // A toggle with a qualification — the Lance's `Two-Handed (unless
    // mounted)`, and the single strongest argument for the free-text column.
    // The boolean is set AND the whole token is preserved verbatim, because
    // the boolean on its own is a lie about the weapon.
    const qualified = QUALIFIED_PROPERTY.exec(token)?.groups;
    const qualifiedToggle =
      qualified === undefined
        ? undefined
        : PLAIN_TOGGLES[qualified.toggle as string];
    if (qualified !== undefined && qualifiedToggle !== undefined) {
      flags[qualifiedToggle] = true;
      qualifications.push(token);
      continue;
    }

    throw new SrdExtractError(
      `unrecognised weapon property ${JSON.stringify(token)} on ${weapon.name}.`,
    );
  }

  return {
    name: weapon.name,
    srd_group: weapon.srd_group,
    damage_dice: weapon.damage_dice,
    damage_type: weapon.damage_type,
    versatile_damage_dice: versatile,
    ...flags,
    ammunition_kind: ammunitionKind,
    range_normal_feet: rangeNormal,
    range_long_feet: rangeLong,
    mastery_property: weapon.mastery_property,
    other_properties: qualifications.length === 0 ? null : qualifications.join(', '),
  };
}

/**
 * Parses `docs/srd/source/weapons-table.txt` into template rows.
 *
 * Exported so `tests/unit/rules/weapons-srd.test.ts` can check the parse
 * against rows a human transcribed from the same file by eye. A test that
 * asserted the seeder produced what the seeder produced would be worthless.
 */
export function parseSrdWeaponTemplates(
  extract: string = weaponsTableExtract,
): SrdWeaponTemplate[] {
  const lines = extract.split('\n');
  const start = lines.findIndex((line) =>
    line.startsWith('--- Verbatim extract'),
  );
  if (start === -1) {
    throw new SrdExtractError('weapons table has no verbatim-extract marker.');
  }

  const parsed: Omit<SrdWeaponTemplate, 'content_key'>[] = [];
  let group: SrdWeaponGroup | null = null;
  let pending: MutableTemplate | null = null;

  const flush = (): void => {
    if (pending !== null) {
      parsed.push(applyProperties(pending));
      pending = null;
    }
  };

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.includes('System Reference Document')) {
      continue;
    }

    const heading = GROUP_HEADINGS[trimmed];
    if (heading !== undefined) {
      flush();
      group = heading;
      continue;
    }

    const row = WEAPON_ROW.exec(line)?.groups;
    if (row === undefined) {
      // A continuation line: the property list wrapped. It carries nothing but
      // more property text, so it appends to the row still being built.
      if (pending === null) {
        throw new SrdExtractError(
          `unattached continuation line ${JSON.stringify(trimmed)}.`,
        );
      }
      pending.properties = `${pending.properties} ${trimmed}`.trim();
      continue;
    }

    flush();
    if (group === null) {
      throw new SrdExtractError(
        `weapon ${JSON.stringify(row.name)} appears before any group heading.`,
      );
    }

    // Strip from the right: cost, then weight, then the mastery property. What
    // is left is the property list.
    let rest = (row.rest as string).replace(TRAILING_COST, '');
    if (rest === row.rest) {
      throw new SrdExtractError(`no cost column on ${String(row.name)}.`);
    }
    const withoutWeight = rest.replace(TRAILING_WEIGHT, '');
    if (withoutWeight === rest) {
      throw new SrdExtractError(`no weight column on ${String(row.name)}.`);
    }
    rest = withoutWeight;
    const mastery = TRAILING_MASTERY.exec(rest)?.groups?.mastery;
    if (mastery === undefined || !isEnumValue(weaponMasteryProperties, mastery)) {
      throw new SrdExtractError(
        `no recognised mastery property on ${String(row.name)}.`,
      );
    }

    pending = {
      name: (row.name as string).trim(),
      srd_group: group,
      damage_dice: row.dice as string,
      damage_type: row.damageType as string,
      mastery_property: mastery,
      properties: rest.replace(TRAILING_MASTERY, ''),
    };
  }
  flush();

  const templates = parsed.map((weapon) => ({
    content_key: weaponContentKey(weapon.name),
    ...weapon,
  }));
  const keys = new Set(templates.map((template) => template.content_key));
  if (keys.size !== templates.length) {
    throw new SrdExtractError('weapons table produced a duplicate content key.');
  }
  if (templates.length === 0) {
    throw new SrdExtractError('weapons table produced no rows.');
  }
  return templates;
}

const MASTERY_SECTION = /^--- Verbatim extract: (?<className>[A-Za-z]+) Features/;
/** `level`, a proficiency bonus, then anything, then the trailing count. */
const MASTERY_ROW = /^\s*(?<level>\d{1,2})\s+\+\d+\s+.*\s(?<count>\d+)\s*$/;

/**
 * Parses `docs/srd/source/weapon-mastery-progression.txt`.
 *
 * The Weapon Mastery column is the LAST column of each class table, so the row
 * pattern anchors on the level and the proficiency bonus at the left and takes
 * the final integer at the right. Anchoring on the proficiency bonus is what
 * keeps the page footer — which also begins with a number — out of the parse.
 */
export function parseWeaponMasteryProgressions(
  extract: string = masteryProgressionExtract,
): SrdMasteryProgression[] {
  const progressions: SrdMasteryProgression[] = [];
  let className: string | null = null;
  let counts = new Map<number, number>();

  const flush = (): void => {
    if (className === null) {
      return;
    }
    // Every class table in the source runs 1..20. A short or gappy parse means
    // the extract or the pattern changed, and inventing the missing levels
    // would be exactly the fabrication this module exists to prevent.
    for (let level = 1; level <= 20; level += 1) {
      if (!counts.has(level)) {
        throw new SrdExtractError(
          `${className} weapon mastery table is missing level ${level}.`,
        );
      }
    }
    if (counts.size !== 20) {
      throw new SrdExtractError(
        `${className} weapon mastery table has ${counts.size} levels, expected 20.`,
      );
    }
    progressions.push({ class_name: className, counts });
    className = null;
    counts = new Map();
  };

  for (const line of extract.split('\n')) {
    const section = MASTERY_SECTION.exec(line.trim())?.groups;
    if (section !== undefined) {
      flush();
      className = section.className as string;
      continue;
    }
    if (className === null) {
      continue;
    }
    const row = MASTERY_ROW.exec(line)?.groups;
    if (row === undefined) {
      continue;
    }
    const level = Number(row.level);
    if (level < 1 || level > 20) {
      throw new SrdExtractError(
        `${className} weapon mastery table has an out-of-range level ${level}.`,
      );
    }
    if (counts.has(level)) {
      throw new SrdExtractError(
        `${className} weapon mastery table repeats level ${level}.`,
      );
    }
    counts.set(level, Number(row.count));
  }
  flush();

  if (progressions.length === 0) {
    throw new SrdExtractError('mastery progression extract produced no tables.');
  }
  return progressions;
}

/**
 * THE CLASSES THAT GRANT WEAPON MASTERY, AND WHAT WE HOLD FOR EACH.
 *
 * `counts_known` is asserted by the PARSE, not by this table: a class listed
 * here as `counts_known` whose table is absent from the extract makes the
 * seeder throw. `counts_unsourced` is the honest record of a gap — the class
 * grants the feature and its numbers are not in `docs/srd/source/`.
 *
 * PALADIN, RANGER AND ROGUE ARE `counts_unsourced`, AND THE REASON HAS CHANGED
 * ONCE ALREADY — read this before promoting them.
 *
 * Their counts are stated in level-1 feature PROSE rather than in a table
 * column. When this module was written no such extract existed in the
 * repository at all. One has since appeared:
 * `docs/srd/source/weapon-mastery-flat-classes.txt`. This module deliberately
 * does NOT read it, for two reasons that are worth stating rather than
 * assuming:
 *
 *  1. It is prose, not a column. The number is the English word "two" inside a
 *     sentence, in a two-column page layout that interleaves unrelated text
 *     from the neighbouring column. Extracting a number from that is a
 *     different and much weaker provenance chain than reading a table cell, and
 *     it needs its own design and its own negative controls.
 *  2. Promoting them is a CONTENT decision with a reviewable diff of its own.
 *     Folding it into the commit that ships weapons would mean "we shipped
 *     weapons" and "we started trusting a prose parse for three classes" land
 *     as one change that a reviewer must accept or reject together.
 *
 * Until that lands, the honest answer is the one the UI already gives: the
 * class grants Weapon Mastery and this application does not hold its number.
 * Writing `2` here because it is almost certainly right is the precise failure
 * the provenance record exists to prevent.
 */
export const WEAPON_MASTERY_GRANTS: Readonly<
  Record<string, Exclude<WeaponMasteryGrant, 'not_granted'>>
> = {
  Barbarian: 'counts_known',
  Fighter: 'counts_known',
  Paladin: 'counts_unsourced',
  Ranger: 'counts_unsourced',
  Rogue: 'counts_unsourced',
};

function assertRow(table: 'weapon_templates', row: Record<string, unknown>): void;
function assertRow(
  table: 'class_weapon_mastery_grants' | 'class_weapon_mastery_counts',
  row: Record<string, unknown>,
): void;
function assertRow(
  table:
    | 'weapon_templates'
    | 'class_weapon_mastery_grants'
    | 'class_weapon_mastery_counts',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new SrdExtractError(error);
  }
}

/**
 * Number of templates the extract yields. Read from the parse rather than
 * pinned to a literal here — the literal that matters lives in the TEST, where
 * a human counted the four groups of the source table by hand.
 */
export function bundledWeaponTemplates(): SrdWeaponTemplate[] {
  return parseSrdWeaponTemplates();
}

function sqlBool(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * True when every parsed template is present and every class carries its grant
 * row. Counted rather than merely existence-checked, for the same reason
 * `hasBundledClassContent` counts progression rows: a database holding the 38
 * keys with no mastery content is broken, and a key-only guard would call it
 * healthy and never repair it.
 */
export function hasBundledWeaponContent(db: DatabaseContext): boolean {
  const templates = bundledWeaponTemplates();
  const placeholders = templates.map(() => '?').join(', ');
  const present = Number(
    db.scalar<number>(
      `SELECT count(*) FROM weapon_templates WHERE content_key IN (${placeholders})`,
      templates.map((template) => template.content_key),
    ) ?? 0,
  );
  if (present !== templates.length) {
    return false;
  }
  const grantedClasses = Object.keys(WEAPON_MASTERY_GRANTS);
  const grantRows = Number(
    db.scalar<number>(
      `SELECT count(*) FROM class_weapon_mastery_grants`,
    ) ?? 0,
  );
  // One row per SEEDED class, granting or not — a class with no row resolves to
  // `content_missing`, which the UI shows rather than hiding behind a zero.
  const classCount = Number(
    db.scalar<number>('SELECT count(*) FROM class_definitions') ?? 0,
  );
  if (classCount === 0 || grantRows < classCount) {
    return false;
  }
  const countRows = Number(
    db.scalar<number>('SELECT count(*) FROM class_weapon_mastery_counts') ?? 0,
  );
  const known = grantedClasses.filter(
    (name) => WEAPON_MASTERY_GRANTS[name] === 'counts_known',
  );
  return countRows >= known.length * 20;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledWeaponContent(db: DatabaseContext): boolean {
  if (hasBundledWeaponContent(db)) {
    return false;
  }
  seedWeaponContent(db);
  return true;
}

export function seedWeaponContent(db: DatabaseContext): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    seedWeaponTemplates(db, timestamp);
    seedWeaponMastery(db, timestamp);
  });
}

function seedWeaponTemplates(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledWeaponTemplates()) {
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_WEAPON_RULES_EDITION,
      name: template.name,
      srd_group: template.srd_group,
      damage_dice: template.damage_dice,
      damage_type: template.damage_type,
      versatile_damage_dice: template.versatile_damage_dice,
      finesse: sqlBool(template.finesse),
      heavy: sqlBool(template.heavy),
      light: sqlBool(template.light),
      loading: sqlBool(template.loading),
      reach: sqlBool(template.reach),
      thrown: sqlBool(template.thrown),
      two_handed: sqlBool(template.two_handed),
      ammunition: sqlBool(template.ammunition),
      ammunition_kind: template.ammunition_kind,
      range_normal_feet: template.range_normal_feet,
      range_long_feet: template.range_long_feet,
      mastery_property: template.mastery_property,
      other_properties: template.other_properties,
      created_at: timestamp,
      updated_at: timestamp,
    };
    // The parser is the writer here, so its output is checked against the row
    // contract before it becomes a catalog row. A mis-parse fails the seed
    // instead of producing 38 plausible-looking wrong entries.
    assertRow('weapon_templates', { id: 1, ...row });

    db.exec(
      `INSERT INTO weapon_templates (
         content_key, rules_edition, name, srd_group, damage_dice, damage_type,
         versatile_damage_dice, finesse, heavy, light, loading, reach, thrown,
         two_handed, ammunition, ammunition_kind, range_normal_feet,
         range_long_feet, mastery_property, other_properties,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_key) DO UPDATE SET
         rules_edition = excluded.rules_edition,
         name = excluded.name,
         srd_group = excluded.srd_group,
         damage_dice = excluded.damage_dice,
         damage_type = excluded.damage_type,
         versatile_damage_dice = excluded.versatile_damage_dice,
         finesse = excluded.finesse,
         heavy = excluded.heavy,
         light = excluded.light,
         loading = excluded.loading,
         reach = excluded.reach,
         thrown = excluded.thrown,
         two_handed = excluded.two_handed,
         ammunition = excluded.ammunition,
         ammunition_kind = excluded.ammunition_kind,
         range_normal_feet = excluded.range_normal_feet,
         range_long_feet = excluded.range_long_feet,
         mastery_property = excluded.mastery_property,
         other_properties = excluded.other_properties,
         updated_at = excluded.updated_at`,
      [
        row.content_key,
        row.rules_edition,
        row.name,
        row.srd_group,
        row.damage_dice,
        row.damage_type,
        row.versatile_damage_dice,
        row.finesse,
        row.heavy,
        row.light,
        row.loading,
        row.reach,
        row.thrown,
        row.two_handed,
        row.ammunition,
        row.ammunition_kind,
        row.range_normal_feet,
        row.range_long_feet,
        row.mastery_property,
        row.other_properties,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

function seedWeaponMastery(db: DatabaseContext, timestamp: string): void {
  const progressions = new Map(
    parseWeaponMasteryProgressions().map((progression) => [
      progression.class_name,
      progression.counts,
    ]),
  );
  for (const [name, grant] of Object.entries(WEAPON_MASTERY_GRANTS)) {
    if (grant === 'counts_known' && !progressions.has(name)) {
      throw new SrdExtractError(
        `${name} is declared counts_known but has no table in the progression extract.`,
      );
    }
  }

  const classes = db.all(
    'SELECT id, name FROM class_definitions',
    undefined,
    (row) => ({ id: Number(row.id), name: String(row.name) }),
  );

  for (const definition of classes) {
    const grant: WeaponMasteryGrant =
      WEAPON_MASTERY_GRANTS[definition.name] ?? 'not_granted';
    assertRow('class_weapon_mastery_grants', {
      id: 1,
      class_definition_id: definition.id,
      grant,
      created_at: timestamp,
      updated_at: timestamp,
    });
    db.exec(
      `INSERT INTO class_weapon_mastery_grants (
         class_definition_id, grant, created_at, updated_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(class_definition_id) DO UPDATE SET
         grant = excluded.grant,
         updated_at = excluded.updated_at`,
      [definition.id, grant, timestamp, timestamp],
    );

    if (grant !== 'counts_known') {
      // NOTHING is written for an unsourced class. Not a zero, not a guess —
      // the grant row already says what we do and do not have.
      continue;
    }
    const counts = progressions.get(definition.name);
    /* c8 ignore next 3 -- guarded above; kept so a future edit cannot silently
       skip a counts_known class. */
    if (counts === undefined) {
      throw new SrdExtractError(`${definition.name} has no parsed counts.`);
    }
    for (const [level, count] of [...counts].sort(
      (left, right) => left[0] - right[0],
    )) {
      assertRow('class_weapon_mastery_counts', {
        id: 1,
        class_definition_id: definition.id,
        class_level: level,
        mastery_count: count,
        created_at: timestamp,
        updated_at: timestamp,
      });
      db.exec(
        `INSERT INTO class_weapon_mastery_counts (
           class_definition_id, class_level, mastery_count, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, class_level) DO UPDATE SET
           mastery_count = excluded.mastery_count,
           updated_at = excluded.updated_at`,
        [definition.id, level, count, timestamp, timestamp],
      );
    }
  }
}
