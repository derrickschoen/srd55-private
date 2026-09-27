/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * THE SPELL CATALOG IS PARSED, NOT TRANSCRIBED. The descriptions extract and
 * eight independently printed class-list extracts are the only content sources
 * below. The parser refuses a malformed heading, metadata line, field sequence,
 * list row, duplicate spell, or dangling class-list name instead of silently
 * shortening the bundled catalog.
 *
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. These parsers take the
 * extracts as arguments and import none. `npm run srd:artifacts` runs them and
 * commits the catalog as `generated/spells-srd.ts`, which `spells-srd.ts`
 * seeds from; `spells-srd-generation.test.ts` re-parses the extracts and fails
 * on any byte difference.
 *
 * THE PRINTED FIELDS ARE DISPLAY TEXT; THE TYPED FIELDS ARE THE FACTS (D918).
 * Casting time, range, components and duration are each kept verbatim for the
 * card and the catalogue, and each is ALSO read here, once, into a closed
 * value: a casting-time unit, a range kind (the domain `SpellRange`), the
 * V/S/M flags with the material clause and its cost, and a duration kind. The
 * SRD's vocabulary for these is closed, so a printed value outside it fails
 * the build instead of reaching a consumer as an unread string. Code reads the
 * typed fields; nothing parses the printed text at runtime.
 */
import {
  normalizeCatalogKeyComponent,
  officialSpellKey,
} from '../catalog/catalog-key';
import {
  spellSchools,
  type KnownSpellSchool,
} from '../domain/enums';
import {
  parseSpellComponents,
  type MaterialCost,
} from '../domain/spell-components';
import { parseSpellRange, type SpellRange } from '../domain/spell-range';

export const BUNDLED_SPELL_RULES_EDITION = '2024';
export const BUNDLED_SPELL_SEED_VERSION = 'srd-5.2.1';

/** The eight independently printed class spell lists, in extract order. */
export const SRD_SPELL_LISTS = [
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
] as const;

export type SrdSpellList = (typeof SRD_SPELL_LISTS)[number];

export class SrdSpellError extends Error {
  constructor(message: string) {
    super(`SRD spells: ${message}`);
    this.name = 'SrdSpellError';
  }
}

/** A bundled spell's version key: the edition, then the name's slug. */
export type SrdSpellContentKey = `${typeof BUNDLED_SPELL_RULES_EDITION}:${string}`;

export const SRD_SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** 0 is a cantrip. */
export type SrdSpellLevel = (typeof SRD_SPELL_LEVELS)[number];

/** The action-economy slot a casting time names, as the catalogue stores it. */
export const SRD_SPELL_ACTION_TYPES = ['Action', 'Bonus Action', 'Reaction'] as const;
export type SrdSpellActionType = (typeof SRD_SPELL_ACTION_TYPES)[number];

/** The units every SRD casting time is counted in. */
export const SRD_CASTING_TIME_UNITS = [
  'action',
  'bonus_action',
  'reaction',
  'minute',
  'hour',
] as const;
export type SrdCastingTimeUnit = (typeof SRD_CASTING_TIME_UNITS)[number];

/**
 * One printed way to cast. An action-economy slot carries the trigger printed
 * after it (`Reaction, which you take when…`), verbatim; a length of time
 * carries its amount. `mode` is the parenthesised name of the option when a
 * spell prints two (Plant Growth: `Action (Overgrowth) or 8 hours (Enrichment)`).
 */
export type SrdCastingOption =
  | {
      readonly unit: Extract<SrdCastingTimeUnit, 'action' | 'bonus_action' | 'reaction'>;
      readonly trigger: string | null;
      readonly mode: string | null;
    }
  | {
      readonly unit: Extract<SrdCastingTimeUnit, 'minute' | 'hour'>;
      readonly amount: number;
      readonly mode: string | null;
    };

export interface SrdSpellCastingTime {
  readonly options: readonly [SrdCastingOption, ...SrdCastingOption[]];
  /** `… or Ritual`: the spell can also be cast as a Ritual. */
  readonly ritual: boolean;
}

/** The V/S/M flags, the material clause verbatim, and its printed cost. */
export interface SrdSpellComponents {
  readonly verbal: boolean;
  readonly somatic: boolean;
  /** What `M (…)` names, or null when the spell has no Material component. */
  readonly material: string | null;
  readonly cost: MaterialCost | null;
}

/** The units every timed SRD duration is counted in. */
export const SRD_DURATION_UNITS = ['round', 'minute', 'hour', 'day'] as const;
export type SrdDurationUnit = (typeof SRD_DURATION_UNITS)[number];

export type SrdSpellDuration =
  | { readonly kind: 'instantaneous' }
  | {
      readonly kind: 'timed';
      readonly amount: number;
      readonly unit: SrdDurationUnit;
      /** `Concentration, up to …`. */
      readonly concentration: boolean;
      /** `Up to …` or `Concentration, up to …`: the duration is a maximum. */
      readonly up_to: boolean;
    }
  | { readonly kind: 'until_dispelled'; readonly or_triggered: boolean }
  | { readonly kind: 'special' };

export interface SrdSpellDescription {
  readonly name: string;
  readonly identity_key: string;
  readonly content_key: SrdSpellContentKey;
  readonly level: SrdSpellLevel;
  readonly school: KnownSpellSchool;
  readonly ritual: boolean;
  readonly concentration: boolean;
  /** Printed, for display. Code reads {@link casting_time_value}. */
  readonly casting_time: string;
  readonly action_type: SrdSpellActionType | null;
  /** Printed, for display. Code reads {@link range_value}. */
  readonly range: string;
  /** Printed, for display. Code reads {@link components_value}. */
  readonly components: string;
  /** Printed, for display. Code reads {@link duration_value}. */
  readonly duration: string;
  readonly description: string;
  readonly casting_time_value: SrdSpellCastingTime;
  readonly range_value: SpellRange;
  readonly components_value: SrdSpellComponents;
  readonly duration_value: SrdSpellDuration;
}

export interface SrdSpellListMembership {
  readonly spell_name: string;
  readonly spell_list_key: SrdSpellList;
}

const SCHOOL_PATTERN = spellSchools.join('|');
const METADATA_START = new RegExp(
  `^\\s*(?:Level [1-9] (?:${SCHOOL_PATTERN})|(?:${SCHOOL_PATTERN}) Cantrip) \\(`,
);
const METADATA = new RegExp(
  `^(?:Level (?<level>[1-9]) (?<leveledSchool>${SCHOOL_PATTERN})|(?<cantripSchool>${SCHOOL_PATTERN}) Cantrip) \\((?<classes>[^)]+)\\)$`,
);
const PAGE_MARKER = /^=== SRD 5\.2\.1 page \d+, (?:left|right) column ===$/;
const CLASS_NAMES = new Set<SrdSpellList>([
  'Bard',
  'Cleric',
  'Druid',
  'Paladin',
  'Ranger',
  'Sorcerer',
  'Warlock',
  'Wizard',
]);
const FIELD_LABELS = [
  'Casting Time:',
  'Range:',
  'Components:',
  'Component:',
  'Duration:',
] as const;

function structural(line: string): boolean {
  return PAGE_MARKER.test(line.trim());
}

function previousContentLine(lines: readonly string[], before: number): number {
  for (let index = before - 1; index >= 0; index -= 1) {
    if (lines[index]?.trim() !== '' && !structural(lines[index] as string)) {
      return index;
    }
  }
  throw new SrdSpellError('metadata appears before a spell name.');
}

function joined(lines: readonly string[]): string {
  return lines
    .filter((line) => line.trim() !== '' && !structural(line))
    .map((line) => line.trim())
    .join(' ')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

function actionType(castingTime: string): SrdSpellActionType | null {
  if (/\bBonus Action\b/iu.test(castingTime)) {
    return 'Bonus Action';
  }
  if (/\bReaction\b/iu.test(castingTime)) {
    return 'Reaction';
  }
  if (/\bAction\b/iu.test(castingTime)) {
    return 'Action';
  }
  return null;
}

function fieldStart(line: string): (typeof FIELD_LABELS)[number] | null {
  const trimmed = line.trim();
  return FIELD_LABELS.find((label) => trimmed.startsWith(label)) ?? null;
}

function fieldValue(
  spellName: string,
  lines: readonly string[],
  from: number,
  labels: readonly (typeof FIELD_LABELS)[number][],
): { readonly value: string; readonly at: number; readonly next: number } {
  let at = from;
  while (
    at < lines.length &&
    (lines[at]?.trim() === '' || structural(lines[at] as string))
  ) {
    at += 1;
  }
  const label = fieldStart(lines[at] ?? '');
  if (label === null || !labels.includes(label)) {
    throw new SrdSpellError(
      `${spellName} expected ${labels.join(' or ')} after metadata.`,
    );
  }
  let next = at + 1;
  if (label !== 'Duration:') {
    while (next < lines.length && fieldStart(lines[next] ?? '') === null) {
      next += 1;
    }
  }
  const first = (lines[at] as string).trim().slice(label.length).trim();
  const value = joined([first, ...lines.slice(at + 1, next)]);
  if (value === '') {
    throw new SrdSpellError(`${spellName} has an empty ${label} field.`);
  }
  return { value, at, next };
}

const CASTING_SLOT: Readonly<Record<string, Extract<SrdCastingTimeUnit, 'action' | 'bonus_action' | 'reaction'>>> = {
  Action: 'action',
  'Bonus Action': 'bonus_action',
  Reaction: 'reaction',
};
const CASTING_SLOT_WITH_TRIGGER = /^(?<slot>Action|Bonus Action|Reaction), (?<trigger>which .+)$/u;
const CASTING_OPTION = /^(?<base>Action|Bonus Action|Reaction|(?<amount>\d+) (?<unit>minute|hour)s?)(?: \((?<mode>[^()]+)\))?$/u;

function castingOption(spellName: string, text: string): SrdCastingOption {
  const groups = CASTING_OPTION.exec(text)?.groups;
  if (groups?.base === undefined) {
    throw new SrdSpellError(
      `${spellName} has casting time ${JSON.stringify(text)}, outside the SRD's closed vocabulary.`,
    );
  }
  const mode = groups.mode ?? null;
  const slot = CASTING_SLOT[groups.base];
  if (slot !== undefined) {
    return { unit: slot, trigger: null, mode };
  }
  return {
    unit: groups.unit === 'hour' ? 'hour' : 'minute',
    amount: Number(groups.amount),
    mode,
  };
}

/** Reads a printed casting time into its closed form, or throws. */
export function parseSrdCastingTime(
  spellName: string,
  printed: string,
): SrdSpellCastingTime {
  const ritual = /^.+ or Ritual$/u.test(printed);
  const text = ritual ? printed.replace(/ or Ritual$/u, '') : printed;
  const triggered = CASTING_SLOT_WITH_TRIGGER.exec(text)?.groups;
  if (triggered?.slot !== undefined && triggered.trigger !== undefined) {
    return {
      options: [{
        unit: CASTING_SLOT[triggered.slot] as Extract<SrdCastingTimeUnit, 'action' | 'bonus_action' | 'reaction'>,
        trigger: triggered.trigger,
        mode: null,
      }],
      ritual,
    };
  }
  const [first, ...rest] = text.split(' or ').map((option) =>
    castingOption(spellName, option),
  );
  if (first === undefined) {
    throw new SrdSpellError(`${spellName} has an empty casting time.`);
  }
  return { options: [first, ...rest], ritual };
}

const COMPONENT_FLAGS = /^(?<flags>[VSM](?:, [VSM])*)(?: \((?<material>.*)\))?$/u;

/** Reads a printed components line into its V/S/M flags and material clause, or throws. */
export function parseSrdSpellComponents(
  spellName: string,
  printed: string,
): SrdSpellComponents {
  const groups = COMPONENT_FLAGS.exec(printed)?.groups;
  const flags = groups?.flags?.split(', ') ?? [];
  const inOrder = ['V', 'S', 'M'].filter((flag) => flags.includes(flag));
  const hasMaterial = flags.includes('M');
  const clause = parseSpellComponents(printed);
  if (
    groups === undefined ||
    flags.join(', ') !== inOrder.join(', ') ||
    hasMaterial !== (groups.material !== undefined) ||
    hasMaterial !== (clause.material !== null)
  ) {
    throw new SrdSpellError(
      `${spellName} has components ${JSON.stringify(printed)}, outside the SRD's V, S, M (…) form.`,
    );
  }
  return {
    verbal: flags.includes('V'),
    somatic: flags.includes('S'),
    material: clause.material,
    cost: clause.cost,
  };
}

const DURATION_TIMED =
  /^(?<qualifier>Concentration,? up to |Up to )?(?<amount>\d+) (?<unit>round|minute|hour|day)s?$/u;

/** Reads a printed duration into its closed form, or throws. */
export function parseSrdSpellDuration(
  spellName: string,
  printed: string,
): SrdSpellDuration {
  switch (printed) {
    case 'Instantaneous':
      return { kind: 'instantaneous' };
    case 'Special':
      return { kind: 'special' };
    case 'Until dispelled':
      return { kind: 'until_dispelled', or_triggered: false };
    case 'Until dispelled or triggered':
      return { kind: 'until_dispelled', or_triggered: true };
  }
  const groups = DURATION_TIMED.exec(printed)?.groups;
  const unit = SRD_DURATION_UNITS.find((candidate) => candidate === groups?.unit);
  if (groups?.amount === undefined || unit === undefined) {
    throw new SrdSpellError(
      `${spellName} has duration ${JSON.stringify(printed)}, outside the SRD's closed vocabulary.`,
    );
  }
  const qualifier = groups.qualifier ?? '';
  return {
    kind: 'timed',
    amount: Number(groups.amount),
    unit,
    concentration: qualifier.startsWith('Concentration'),
    up_to: qualifier !== '',
  };
}

/** Reads a printed range through the domain's range vocabulary, or throws. */
export function parseSrdSpellRange(
  spellName: string,
  printed: string,
): SpellRange {
  const range = parseSpellRange(printed);
  if (range === null) {
    throw new SrdSpellError(
      `${spellName} has range ${JSON.stringify(printed)}, outside the spell-range vocabulary.`,
    );
  }
  return range;
}

function isSrdSpellContentKey(value: string): value is SrdSpellContentKey {
  return value.startsWith(`${BUNDLED_SPELL_RULES_EDITION}:`);
}

function isSrdSpellLevel(value: number): value is SrdSpellLevel {
  return (SRD_SPELL_LEVELS as readonly number[]).includes(value);
}

/**
 * Parse all enumerated spell descriptions. Counts deliberately live in tests:
 * the parser proves shape and uniqueness; the hand-enumerated name oracle
 * proves completeness without deriving its expectation from this function.
 */
export function parseSrdSpellDescriptions(
  extract: string,
): SrdSpellDescription[] {
  if (!extract.includes('--- Verbatim extract: SRD 5.2.1')) {
    throw new SrdSpellError('description extract has no verbatim marker.');
  }
  const lines = extract.split('\n');
  const starts = lines.flatMap((line, index) =>
    METADATA_START.test(line) ? [index] : [],
  );
  if (starts.length === 0) {
    throw new SrdSpellError('description extract contains no spell metadata.');
  }
  const nameIndexes = starts.map((start) => previousContentLine(lines, start));
  const parsed: SrdSpellDescription[] = [];

  for (const [position, metadataStart] of starts.entries()) {
    const nameIndex = nameIndexes[position] as number;
    const name = (lines[nameIndex] as string).trim();
    if (
      name === '' ||
      name.includes(':') ||
      PAGE_MARKER.test(name) ||
      fieldStart(name) !== null
    ) {
      throw new SrdSpellError(
        `invalid spell heading ${JSON.stringify(name)} before line ${String(metadataStart + 1)}.`,
      );
    }

    let metadataEnd = metadataStart;
    while (
      metadataEnd < lines.length &&
      !(lines[metadataEnd] as string).includes(')')
    ) {
      metadataEnd += 1;
    }
    if (metadataEnd >= lines.length) {
      throw new SrdSpellError(`${name} has unterminated metadata.`);
    }
    const metadataText = joined(lines.slice(metadataStart, metadataEnd + 1));
    const metadata = METADATA.exec(metadataText)?.groups;
    if (metadata === undefined) {
      throw new SrdSpellError(
        `${name} has unrecognised metadata ${JSON.stringify(metadataText)}.`,
      );
    }
    const declaredClasses = (metadata.classes as string)
      .split(',')
      .map((entry) => entry.trim());
    if (
      declaredClasses.length === 0 ||
      declaredClasses.some(
        (entry) => !CLASS_NAMES.has(entry as SrdSpellList),
      )
    ) {
      throw new SrdSpellError(
        `${name} names an unrecognised class in its metadata.`,
      );
    }

    const end = nameIndexes[position + 1] ?? lines.length;
    const block = lines.slice(metadataEnd + 1, end);
    const casting = fieldValue(
      name,
      block,
      0,
      ['Casting Time:'],
    );
    const range = fieldValue(name, block, casting.next, ['Range:']);
    const components = fieldValue(name, block, range.next, [
      'Components:',
      'Component:',
    ]);
    const duration = fieldValue(name, block, components.next, ['Duration:']);
    const prose = block
      .slice(duration.next)
      .filter((line) => !structural(line))
      .join('\n')
      .trim();
    if (prose === '') {
      throw new SrdSpellError(`${name} has no description prose.`);
    }

    const school = (metadata.leveledSchool ??
      metadata.cantripSchool) as KnownSpellSchool;
    const level = metadata.level === undefined ? 0 : Number(metadata.level);
    if (!isSrdSpellLevel(level)) {
      throw new SrdSpellError(`${name} has spell level ${String(level)}.`);
    }
    const ritual = /\bor Ritual\b/iu.test(casting.value);
    const concentration = /^Concentration\b/iu.test(duration.value);
    const contentKey = officialSpellKey(BUNDLED_SPELL_RULES_EDITION, name);
    if (!isSrdSpellContentKey(contentKey)) {
      throw new SrdSpellError(`${name} has content key ${contentKey}, outside the bundled edition.`);
    }
    const castingTimeValue = parseSrdCastingTime(name, casting.value);
    const durationValue = parseSrdSpellDuration(name, duration.value);
    if (
      castingTimeValue.ritual !== ritual ||
      (durationValue.kind === 'timed' && durationValue.concentration) !== concentration
    ) {
      throw new SrdSpellError(
        `${name}'s typed casting time or duration disagrees with its printed Ritual or Concentration.`,
      );
    }
    parsed.push({
      name,
      identity_key: normalizeCatalogKeyComponent(name),
      content_key: contentKey,
      level,
      school,
      ritual,
      concentration,
      casting_time: casting.value,
      action_type: actionType(casting.value),
      range: range.value,
      components: components.value,
      duration: duration.value,
      description: prose,
      casting_time_value: castingTimeValue,
      range_value: parseSrdSpellRange(name, range.value),
      components_value: parseSrdSpellComponents(name, components.value),
      duration_value: durationValue,
    });
  }

  const names = new Set(parsed.map((spell) => spell.name));
  const identityKeys = new Set(parsed.map((spell) => spell.identity_key));
  const versionKeys = new Set(parsed.map((spell) => spell.content_key));
  if (
    names.size !== parsed.length ||
    identityKeys.size !== parsed.length ||
    versionKeys.size !== parsed.length
  ) {
    throw new SrdSpellError(
      'description extract produced a duplicate name or content key.',
    );
  }
  return parsed;
}

const LIST_ROW = new RegExp(
  `^\\s*(?<name>.+?)\\s{2,}(?:${SCHOOL_PATTERN})\\s{2,}(?:[CRM](?:, [CRM])*|[—–])\\s*$`,
);
const LEVEL_HEADING =
  /^(?:Cantrips \(Level 0 [A-Za-z]+ Spells\)|Level [1-9] [A-Za-z]+ Spells)$/;
const LIST_TITLE = /^[A-Za-z]+ Spell List$/;
const LIST_HEADER = /^Spell\s+School\s+Special$/;
const LIST_PROSE_STARTS = [
  'This section presents the ',
  'are organized by spell level',
  'and each spell’s school of magic is listed.',
  'cial column, C means ',
  'tion, R means ',
  'specific Material component.',
] as const;

function isKnownListNonRow(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === '' ||
    structural(line) ||
    LIST_TITLE.test(trimmed) ||
    LIST_HEADER.test(trimmed) ||
    LEVEL_HEADING.test(trimmed) ||
    LIST_PROSE_STARTS.some((start) => trimmed.startsWith(start))
  );
}

export function parseSrdSpellList(
  spellListKey: SrdSpellList,
  extract: string,
): SrdSpellListMembership[] {
  if (!extract.includes('--- Verbatim extract: SRD 5.2.1')) {
    throw new SrdSpellError(
      `${spellListKey} list has no verbatim marker.`,
    );
  }
  const memberships: SrdSpellListMembership[] = [];
  let inList = false;
  for (const line of extract.split('\n')) {
    const trimmed = line.trim();
    if (LEVEL_HEADING.test(trimmed)) {
      inList = true;
      continue;
    }
    const row = LIST_ROW.exec(line)?.groups;
    if (row !== undefined) {
      if (!inList) {
        throw new SrdSpellError(
          `${spellListKey} has a spell row before its first level heading.`,
        );
      }
      memberships.push({
        spell_name: (row.name as string).trim(),
        spell_list_key: spellListKey,
      });
      continue;
    }
    // Attribution, extraction notes, the list title, and its explanatory
    // paragraph are outside the tabular content. Strict row handling begins at
    // the first explicit level heading.
    if (!inList) {
      continue;
    }
    if (!isKnownListNonRow(line)) {
      throw new SrdSpellError(
        `${spellListKey} list has unrecognised line ${JSON.stringify(trimmed)}.`,
      );
    }
  }
  if (!inList || memberships.length === 0) {
    throw new SrdSpellError(`${spellListKey} list contains no spells.`);
  }
  const names = new Set(memberships.map((entry) => entry.spell_name));
  if (names.size !== memberships.length) {
    throw new SrdSpellError(`${spellListKey} list contains a duplicate spell.`);
  }
  return memberships;
}

export function parseSrdSpellListMemberships(
  extracts: Readonly<Record<SrdSpellList, string>>,
): SrdSpellListMembership[] {
  return SRD_SPELL_LISTS.flatMap((spellListKey) =>
    parseSrdSpellList(spellListKey, extracts[spellListKey]),
  );
}

/** What the build records: the parsed catalog, in extract order. */
export interface SrdSpellCatalogArtifact {
  readonly descriptions: readonly SrdSpellDescription[];
  readonly memberships: readonly SrdSpellListMembership[];
}

export function deriveSrdSpellCatalogArtifact(
  descriptionExtract: string,
  listExtracts: Readonly<Record<SrdSpellList, string>>,
): SrdSpellCatalogArtifact {
  return {
    descriptions: parseSrdSpellDescriptions(descriptionExtract),
    memberships: parseSrdSpellListMemberships(listExtracts),
  };
}
