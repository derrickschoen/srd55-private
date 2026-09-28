/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE WEAPON CATALOG IS PARSED, NOT TRANSCRIBED.
 *
 * The two files this module parses are verbatim `pdftotext -layout` extracts,
 * committed with their provenance in `docs/srd/SOURCE.md` (document URL, byte
 * size, SHA-256 and the exact command). Everything `weapons-srd.ts` writes to
 * the database is derived from them by the parser below.
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
 *
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. This module takes the extracts
 * as arguments and imports no SRD text. `npm run srd:artifacts` commits its
 * result as `generated/weapons-srd.ts`, which `weapons-srd.ts` seeds from; the
 * SRD artifact drift test re-parses the extracts and fails on any byte
 * difference.
 */
import {
  characterLevels,
  damageTypes,
  isEnumValue,
  weaponMasteryProperties,
  type KnownDamageType,
  type SrdWeaponGroup,
  type WeaponMasteryProperty,
} from '../domain/enums';
import {
  perCharacterLevel,
  type PerCharacterLevel,
} from '../domain/per-level';
import { isSrdClassName, type SrdClassName } from './srd-class-names';
import {
  versatileWeaponDamageFromLegacy,
  weaponDamageFromLegacy,
  type VersatileWeaponDamage,
  type WeaponDamageAmount,
} from '../domain/weapon-damage';
import type { WritableWeaponRange } from '../domain/weapon-range';

/** The rules edition every bundled weapon belongs to. */
export const BUNDLED_WEAPON_RULES_EDITION = '2024';

/**
 * A weapon's content key AS THE PARSER PRINTS IT: the edition, the kind, then
 * a slug. Open, because a parse of any extract produces it; the artifact is
 * checked against the closed union it records (`BundledSrdWeaponContentKeyText`)
 * and the runtime key is that union branded (`BundledWeaponContentKey`).
 */
export type SrdWeaponContentKey =
  `${typeof BUNDLED_WEAPON_RULES_EDITION}:weapon:${string}`;

/**
 * One parsed row of the source's weapons table.
 *
 * The field names are the `weapon_templates` column names, and that is not
 * laziness: the seeder inserts this object column-wise, and the UI's template
 * pre-fill copies the same names into `character_weapons`. Keeping the three
 * lists identical is what makes the copy need no mapping table.
 */
export interface SrdWeaponTemplate<
  Key extends SrdWeaponContentKey = SrdWeaponContentKey,
> {
  readonly content_key: Key;
  readonly name: string;
  readonly srd_group: SrdWeaponGroup;
  readonly damage: WeaponDamageAmount;
  readonly damage_type: KnownDamageType;
  readonly versatile_damage: VersatileWeaponDamage;
  readonly finesse: boolean;
  readonly heavy: boolean;
  readonly light: boolean;
  readonly loading: boolean;
  readonly reach: boolean;
  readonly thrown: boolean;
  readonly two_handed: boolean;
  readonly ammunition: boolean;
  readonly ammunition_kind: string | null;
  readonly range: WritableWeaponRange;
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

export class SrdExtractError extends Error {
  constructor(message: string) {
    super(`SRD extract: ${message}`);
    this.name = 'SrdExtractError';
  }
}

export function weaponContentKey(name: string): SrdWeaponContentKey {
  return `${BUNDLED_WEAPON_RULES_EDITION}:weapon:${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

interface MutableTemplate {
  name: string;
  srd_group: SrdWeaponGroup;
  damage_dice: string;
  damage_type: KnownDamageType;
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
    damage: recordedDamageFromLegacy(weapon.damage_dice),
    damage_type: weapon.damage_type,
    versatile_damage: versatileWeaponDamageFromLegacy(versatile),
    ...flags,
    ammunition_kind: ammunitionKind,
    range:
      rangeNormal === null
        ? { kind: 'none' }
        : {
            kind: 'ranged',
            near_feet: rangeNormal,
            far_feet: rangeLong,
          },
    mastery_property: weapon.mastery_property,
    other_properties: qualifications.length === 0 ? null : qualifications.join(', '),
  };
}

function recordedDamageFromLegacy(value: string): WeaponDamageAmount {
  const damage = weaponDamageFromLegacy(value);
  if (damage.kind === 'not_recorded') {
    throw new SrdExtractError('a weapon table row has no damage.');
  }
  return damage;
}

/**
 * Parses `docs/srd/source/weapons-table.txt` into template rows.
 *
 * Exported so `tests/unit/rules/weapons-srd.test.ts` can check the parse
 * against rows a human transcribed from the same file by eye. A test that
 * asserted the seeder produced what the seeder produced would be worthless.
 */
export function parseSrdWeaponTemplates(
  extract: string,
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
    const parsedDamageType = row.damageType as string;
    if (!isEnumValue(damageTypes, parsedDamageType)) {
      throw new SrdExtractError(
        `unknown damage type ${JSON.stringify(parsedDamageType)} on ${String(row.name)}.`,
      );
    }

    pending = {
      name: (row.name as string).trim(),
      srd_group: group,
      damage_dice: row.dice as string,
      damage_type: parsedDamageType,
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
  extract: string,
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
 * A class's Weapon Mastery column in recordable form: the count at each level,
 * 1 through 20, the order the runtime rebuilds its map in.
 */
export interface SrdMasteryProgressionRecord {
  readonly class_name: SrdClassName;
  readonly counts: PerCharacterLevel<number>;
}

/** WHAT THE BUILD RECORDS: the weapon table and the mastery progressions. */
export interface SrdWeaponsArtifact<
  Key extends SrdWeaponContentKey = SrdWeaponContentKey,
> {
  readonly templates: readonly SrdWeaponTemplate<Key>[];
  readonly mastery_progressions: readonly SrdMasteryProgressionRecord[];
}

export function deriveSrdWeaponsArtifact(
  weaponsTable: string,
  masteryProgression: string,
): SrdWeaponsArtifact {
  return {
    templates: parseSrdWeaponTemplates(weaponsTable),
    mastery_progressions: parseWeaponMasteryProgressions(masteryProgression).map(
      (progression) => {
        const counts = perCharacterLevel(
          characterLevels.map((level) => progression.counts.get(level) as number),
        );
        if (
          !isSrdClassName(progression.class_name) ||
          counts === null ||
          [...progression.counts.keys()].some((level, index) => level !== index + 1)
        ) {
          throw new SrdExtractError(
            `${progression.class_name} weapon mastery table is not an SRD class's levels 1 through 20 in order.`,
          );
        }
        return { class_name: progression.class_name, counts };
      },
    ),
  };
}
