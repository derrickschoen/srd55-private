/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * THE SPELL CATALOG IS PARSED, NOT TRANSCRIBED. The descriptions extract and
 * eight independently printed class-list extracts are the only content sources
 * below. The parser refuses a malformed heading, metadata line, field sequence,
 * list row, duplicate spell, or dangling class-list name instead of silently
 * shortening the bundled catalog.
 */
import spellDescriptionsExtract from '../../docs/srd/source/spell-descriptions.txt?raw';
import bardSpellListExtract from '../../docs/srd/source/bard-spell-list.txt?raw';
import clericSpellListExtract from '../../docs/srd/source/cleric-spell-list.txt?raw';
import druidSpellListExtract from '../../docs/srd/source/druid-spell-list.txt?raw';
import paladinSpellListExtract from '../../docs/srd/source/paladin-spell-list.txt?raw';
import rangerSpellListExtract from '../../docs/srd/source/ranger-spell-list.txt?raw';
import sorcererSpellListExtract from '../../docs/srd/source/sorcerer-spell-list.txt?raw';
import warlockSpellListExtract from '../../docs/srd/source/warlock-spell-list.txt?raw';
import wizardSpellListExtract from '../../docs/srd/source/wizard-spell-list.txt?raw';
import {
  normalizeCatalogKeyComponent,
  officialSpellKey,
} from '../catalog/catalog-key';
import { normalizeCatalogName } from '../catalog/catalog-normalize';
import {
  ContentIdentityCollision,
  ensureBundledStableContentIdentity,
  reconcileCurrentContentFingerprintV1,
} from '../catalog/content-registry';
import {
  deriveContentIdentityV1FromNormalizedName,
  normalizeContentIdentityName,
  type DerivedContentIdentityV1,
  type NormalizedContentName,
} from '../catalog/content-identity';
import {
  projectSpellContentAggregateV1,
  projectStoredSpellContentV1,
} from '../catalog/spell-content-projector-v1';
import type { BundledStoredProjectionV1 } from '../catalog/bundled-content-registry-v1';
import { sha256 } from '../crypto/sha256';
import { sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  encodeSpellComponents,
  parseSpellComponents,
} from '../domain/spell-components';
import { encodeSpellRange, parseSpellRange } from '../domain/spell-range';
import {
  spellSchools,
  type KnownSpellSchool,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';

export const BUNDLED_SPELL_RULES_EDITION = '2024';
export const BUNDLED_SPELL_SEED_VERSION = 'srd-5.2.1';

const CLASS_LIST_EXTRACTS = {
  Bard: bardSpellListExtract,
  Cleric: clericSpellListExtract,
  Druid: druidSpellListExtract,
  Paladin: paladinSpellListExtract,
  Ranger: rangerSpellListExtract,
  Sorcerer: sorcererSpellListExtract,
  Warlock: warlockSpellListExtract,
  Wizard: wizardSpellListExtract,
} as const;

export type SrdSpellList = keyof typeof CLASS_LIST_EXTRACTS;

export class SrdSpellError extends Error {
  constructor(message: string) {
    super(`SRD spells: ${message}`);
    this.name = 'SrdSpellError';
  }
}

export interface SrdSpellDescription {
  readonly name: string;
  readonly identity_key: string;
  readonly content_key: string;
  readonly level: number;
  readonly school: KnownSpellSchool;
  readonly ritual: boolean;
  readonly concentration: boolean;
  readonly casting_time: string;
  readonly action_type: string | null;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly description: string;
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

function actionType(castingTime: string): string | null {
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

/**
 * Parse all enumerated spell descriptions. Counts deliberately live in tests:
 * the parser proves shape and uniqueness; the hand-enumerated name oracle
 * proves completeness without deriving its expectation from this function.
 */
export function parseSrdSpellDescriptions(
  extract: string = spellDescriptionsExtract,
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
    parsed.push({
      name,
      identity_key: normalizeCatalogKeyComponent(name),
      content_key: officialSpellKey(BUNDLED_SPELL_RULES_EDITION, name),
      level:
        metadata.level === undefined ? 0 : Number(metadata.level),
      school,
      ritual: /\bor Ritual\b/iu.test(casting.value),
      concentration: /^Concentration\b/iu.test(duration.value),
      casting_time: casting.value,
      action_type: actionType(casting.value),
      range: range.value,
      components: components.value,
      duration: duration.value,
      description: prose,
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
  extract: string = CLASS_LIST_EXTRACTS[spellListKey],
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
  extracts: Readonly<Partial<Record<SrdSpellList, string>>> = {},
): SrdSpellListMembership[] {
  return (Object.keys(CLASS_LIST_EXTRACTS) as SrdSpellList[]).flatMap(
    (spellListKey) =>
      parseSrdSpellList(
        spellListKey,
        extracts[spellListKey] ?? CLASS_LIST_EXTRACTS[spellListKey],
      ),
  );
}

function sqlBool(value: boolean): number {
  return value ? 1 : 0;
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function hasBundledSpellCardinality(db: DatabaseContext): boolean {
  const spells = parseSrdSpellDescriptions();
  const memberships = parseSrdSpellListMemberships();
  const keys = spells.map((spell) => spell.content_key);
  const present = Number(
    db.scalar(
      `SELECT count(*) FROM spell_versions
       WHERE provenance = 'srd'
         AND is_active = 1
         AND content_key IN (${placeholders(keys)})`,
      keys,
    ) ?? 0,
  );
  if (present !== spells.length) {
    return false;
  }
  return (
    Number(
      db.scalar(
        `SELECT count(*)
         FROM spell_list_memberships AS membership
         INNER JOIN spell_versions AS version
           ON version.id = membership.spell_version_id
         WHERE version.provenance = 'srd'`,
      ) ?? 0,
    ) === memberships.length
  );
}

export interface BundledSpellSeedSources {
  readonly descriptionExtract?: string;
  readonly listExtracts?: Readonly<Partial<Record<SrdSpellList, string>>>;
}

export type BundledSpellSeedRefusalReason =
  | 'user-owned-key'
  | 'registry-owned-elsewhere'
  | 'current-fingerprint-integrity'
  | 'replacement-refused';

export type BundledSpellSeedEntryOutcome =
  | {
      readonly kind: 'healthy' | 'updated';
      readonly contentKey: ContentKey;
    }
  | {
      readonly kind: 'refused';
      readonly contentKey: ContentKey;
      readonly reason: BundledSpellSeedRefusalReason;
    };

export interface BundledSpellSeedResult {
  readonly outcomes: readonly BundledSpellSeedEntryOutcome[];
  readonly healthy: number;
  readonly updated: number;
  readonly refused: number;
}

interface ValidatedBundledSpellSource {
  readonly spells: readonly SrdSpellDescription[];
  readonly memberships: readonly SrdSpellListMembership[];
  readonly membershipsByName: ReadonlyMap<
    string,
    readonly SrdSpellListMembership[]
  >;
}

class BundledSpellSeedEntryRefusal extends Error {
  constructor(readonly reason: BundledSpellSeedRefusalReason) {
    super(reason);
    this.name = 'BundledSpellSeedEntryRefusal';
  }
}

function bundledSpellSource(
  sources: BundledSpellSeedSources = Object.freeze({}),
): ValidatedBundledSpellSource {
  const spells = parseSrdSpellDescriptions(sources.descriptionExtract);
  const memberships = parseSrdSpellListMemberships(sources.listExtracts);
  const byName = new Map(spells.map((spell) => [spell.name, spell]));
  const membershipsByName = new Map<string, SrdSpellListMembership[]>();
  for (const membership of memberships) {
    if (!byName.has(membership.spell_name)) {
      throw new SrdSpellError(
        `${membership.spell_list_key} lists ${membership.spell_name}, which has no description.`,
      );
    }
    membershipsByName.set(membership.spell_name, [
      ...(membershipsByName.get(membership.spell_name) ?? []),
      membership,
    ]);
  }
  return Object.freeze({ spells, memberships, membershipsByName });
}

function seedSpellIdentityV1(
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
): DerivedContentIdentityV1<'spell', unknown> {
  const range = encodeSpellRange(parseSpellRange(spell.range));
  const components = encodeSpellComponents(
    parseSpellComponents(spell.components),
  );
  const projection = projectSpellContentAggregateV1({
    kind: 'spell',
    name: spell.name,
    rules_edition: BUNDLED_SPELL_RULES_EDITION,
    spell_identity_key: spell.identity_key,
    spell_version_key: spell.content_key,
    level: spell.level,
    school: spell.school,
    ritual: spell.ritual,
    concentration: spell.concentration,
    casting_time: spell.casting_time,
    action_type: spell.action_type,
    range: spell.range,
    ...range,
    duration: spell.duration,
    components: spell.components,
    ...components,
    healing: false,
    short_summary: spell.description,
    upcast_summary: null,
    cantrip_upgrade_summary: null,
    requires_mod_for_effect: false,
    effect_reliability_category: 'fixed_effect',
    spell_lists: memberships.map((membership) => ({
      value: membership.spell_list_key,
    })),
    tags: [],
    attack_modes: [],
    save_abilities: [],
    upcast_levels: [],
    cantrip_upgrade_levels: [],
  });
  return deriveContentIdentityV1FromNormalizedName({
    kind: 'spell',
    edition: BUNDLED_SPELL_RULES_EDITION,
    normalizedName: normalizeContentIdentityName(spell.name),
    payload: projection.payload,
  });
}

function writeBundledSpell(
  db: DatabaseContext,
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
  timestamp: string,
): number {
  const collision = db.oneRaw(
    `SELECT id, provenance FROM spell_versions WHERE content_key = ?`,
    [spell.content_key],
  );
  if (collision !== null && collision.provenance !== 'srd') {
    throw new SrdSpellError(
      `cannot seed ${spell.content_key}: the key already belongs to provenance ${JSON.stringify(collision.provenance)}.`,
    );
  }

  db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(content_key) DO NOTHING`,
    [
      spell.identity_key,
      spell.name,
      normalizeCatalogName(spell.name),
      timestamp,
      timestamp,
    ],
  );
  const identity = db.oneRaw(
    `SELECT id, canonical_name, normalized_name
     FROM spell_identities WHERE content_key = ?`,
    [spell.identity_key],
  );
  if (
    identity === null ||
    identity.canonical_name !== spell.name ||
    identity.normalized_name !== normalizeCatalogName(spell.name)
  ) {
    throw new SrdSpellError(
      `identity key ${spell.identity_key} belongs to different spell data.`,
    );
  }

  const range = encodeSpellRange(parseSpellRange(spell.range));
  const components = encodeSpellComponents(
    parseSpellComponents(spell.components),
  );
  ensureBundledStableContentIdentity(db, {
    kind: 'spell',
    contentKey: spell.content_key,
    normalizedName: normalizeContentIdentityName(spell.name),
  });
  db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, ritual, concentration, casting_time, action_type,
       range, range_kind, range_feet, area_shape, area_feet,
       duration, components, material_component_summary,
       material_cost_copper, material_cost_kind, short_summary,
       provenance, seed_version, is_active, created_at, updated_at
     ) VALUES (
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       'srd', ?, 1, ?, ?
     )
     ON CONFLICT(content_key) DO UPDATE SET
       spell_identity_id = excluded.spell_identity_id,
       display_name = excluded.display_name,
       rules_edition = excluded.rules_edition,
       level = excluded.level,
       school = excluded.school,
       ritual = excluded.ritual,
       concentration = excluded.concentration,
       casting_time = excluded.casting_time,
       action_type = excluded.action_type,
       range = excluded.range,
       range_kind = excluded.range_kind,
       range_feet = excluded.range_feet,
       area_shape = excluded.area_shape,
       area_feet = excluded.area_feet,
       duration = excluded.duration,
       components = excluded.components,
       material_component_summary = excluded.material_component_summary,
       material_cost_copper = excluded.material_cost_copper,
       material_cost_kind = excluded.material_cost_kind,
       short_summary = excluded.short_summary,
       seed_version = excluded.seed_version,
       is_active = 1,
       updated_at = excluded.updated_at
     WHERE spell_versions.provenance = 'srd'`,
    [
      spell.content_key,
      Number(identity.id),
      spell.name,
      BUNDLED_SPELL_RULES_EDITION,
      spell.level,
      spell.school,
      sqlBool(spell.ritual),
      sqlBool(spell.concentration),
      spell.casting_time,
      spell.action_type,
      spell.range,
      range.range_kind,
      range.range_feet,
      range.area_shape,
      range.area_feet,
      spell.duration,
      spell.components,
      components.material_component_summary,
      components.material_cost_copper,
      components.material_cost_kind,
      spell.description,
      BUNDLED_SPELL_SEED_VERSION,
      timestamp,
      timestamp,
    ],
  );
  const versionId = Number(
    db.scalar(
      `SELECT id FROM spell_versions
       WHERE content_key = ? AND provenance = 'srd'`,
      [spell.content_key],
    ),
  );
  if (!Number.isSafeInteger(versionId) || versionId < 1) {
    throw new SrdSpellError(`failed to seed ${spell.content_key}.`);
  }
  db.exec(
    'DELETE FROM spell_list_memberships WHERE spell_version_id = ?',
    [versionId],
  );
  for (const membership of memberships) {
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key, created_at, updated_at
       ) VALUES (?, ?, ?, ?)`,
      [versionId, membership.spell_list_key, timestamp, timestamp],
    );
  }
  return versionId;
}

/**
 * D205/D208 permit replacing development-era bundled registrations. The
 * pre-fix spell registrar stored catalog-lookup names in the content registry,
 * so remove only those mismatched spell fingerprints and remembered matches
 * before the normal registry pass recreates them from the corrected name.
 */
function repairBundledSpellIdentityRegistrations(
  db: DatabaseContext,
  spells: readonly SrdSpellDescription[],
): void {
  db.transaction(() => {
    for (const spell of spells) {
      const registration = db.oneRaw(
        `SELECT key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?`,
        [spell.content_key],
      );
      const normalizedName = normalizeContentIdentityName(spell.name);
      if (
        registration === null ||
        registration.key_kind !== 'bundled-stable' ||
        registration.catalog_layer !== 'bundled' ||
        registration.normalized_name === normalizedName
      ) {
        continue;
      }
      db.exec(
        `DELETE FROM catalog_content_match_decisions
         WHERE content_kind = 'spell'
           AND (
             target_content_key = ? OR
             incoming_fingerprint_digest IN (
               SELECT fingerprint_digest
               FROM catalog_content_fingerprints
               WHERE content_kind = 'spell' AND content_key = ?
             )
           )`,
        [spell.content_key, spell.content_key],
      );
      db.exec(
        `DELETE FROM catalog_content_fingerprints
         WHERE content_kind = 'spell' AND content_key = ?`,
        [spell.content_key],
      );
      db.exec(
        `UPDATE catalog_content_identities
         SET normalized_name = ?
         WHERE content_kind = 'spell' AND content_key = ?`,
        [normalizedName, spell.content_key],
      );
    }
  });
}

function reconcileBundledSpellEntry(
  db: DatabaseContext,
  spell: SrdSpellDescription,
  memberships: readonly SrdSpellListMembership[],
  storedProjection: BundledStoredProjectionV1 | undefined,
): BundledSpellSeedEntryOutcome {
  const contentKey = spell.content_key as ContentKey;
  try {
    return db.transaction(() => {
      const root = db.oneRaw(
        'SELECT provenance FROM spell_versions WHERE content_key = ?',
        [contentKey],
      );
      if (root !== null && sqlString(root, 'provenance') !== 'srd') {
        return Object.freeze({
          kind: 'refused' as const,
          contentKey,
          reason: 'user-owned-key' as const,
        });
      }
      const registry = db.oneRaw(
        `SELECT content_kind, key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities WHERE content_key = ?`,
        [contentKey],
      );
      if (registry !== null) {
        const isBundled =
          sqlString(registry, 'content_kind') === 'spell' &&
          sqlString(registry, 'key_kind') === 'bundled-stable' &&
          sqlString(registry, 'catalog_layer') === 'bundled';
        if (!isBundled) {
          return Object.freeze({
            kind: 'refused' as const,
            contentKey,
            reason: 'registry-owned-elsewhere' as const,
          });
        }
      }

      const normalizedName = registry === null
        ? null
        : sqlString(registry, 'normalized_name') as NormalizedContentName;
      const desired = normalizedName === null
        ? null
        : seedSpellIdentityV1(spell, memberships);
      if (
        desired !== null &&
        storedProjection !== undefined &&
        storedProjection.identity.digest === desired.digest &&
        storedProjection.identity.canonicalJson === desired.canonicalJson &&
        root !== null
      ) {
        return Object.freeze({ kind: 'healthy' as const, contentKey });
      }
      if (storedProjection === undefined && root !== null) {
        const current = db.oneRaw(
          `SELECT fingerprint_digest, canonical_json
           FROM catalog_content_fingerprints
           WHERE content_kind = 'spell' AND content_key = ?
             AND fingerprint_scheme = 'content-v1'
             AND fingerprint_role = 'current'`,
          [contentKey],
        );
        if (
          current !== null &&
          sha256(sqlString(current, 'canonical_json')) !==
            sqlString(current, 'fingerprint_digest')
        ) {
          throw new BundledSpellSeedEntryRefusal(
            'current-fingerprint-integrity',
          );
        }
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }

      try {
        writeBundledSpell(db, spell, memberships, new Date().toISOString());
      } catch (error) {
        if (error instanceof SrdSpellError) {
          throw new BundledSpellSeedEntryRefusal('replacement-refused');
        }
        throw error;
      }
      const installedRegistry = db.oneRaw(
        `SELECT key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?`,
        [contentKey],
      );
      if (installedRegistry === null) {
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }
      const authoritativeName = sqlString(
        installedRegistry,
        'normalized_name',
      ) as NormalizedContentName;
      const installed = projectStoredSpellContentV1(db, contentKey);
      const installedIdentity = deriveContentIdentityV1FromNormalizedName({
        kind: 'spell',
        edition: installed.aggregate.rules_edition,
        normalizedName: authoritativeName,
        payload: installed.payload,
      });
      const installedDesired = seedSpellIdentityV1(
        spell,
        memberships,
      );
      if (
        installedIdentity.digest !== installedDesired.digest ||
        installedIdentity.canonicalJson !== installedDesired.canonicalJson
      ) {
        throw new BundledSpellSeedEntryRefusal('replacement-refused');
      }
      try {
        reconcileCurrentContentFingerprintV1(db, {
          kind: 'spell',
          contentKey,
          identity: installedDesired,
        });
      } catch (error) {
        if (error instanceof ContentIdentityCollision) {
          throw new BundledSpellSeedEntryRefusal(
            'current-fingerprint-integrity',
          );
        }
        throw error;
      }
      return Object.freeze({ kind: 'updated' as const, contentKey });
    });
  } catch (error) {
    if (error instanceof BundledSpellSeedEntryRefusal) {
      return Object.freeze({
        kind: 'refused',
        contentKey,
        reason: error.reason,
      });
    }
    throw error;
  }
}

/**
 * Compare every shipped spell projection with the stored identities computed
 * by this boot's general bundled reconciliation. Equality therefore means the
 * source, live stored aggregate, and reconciled registry current bytes agree.
 * A difference replaces only the SRD aggregate, validates that write with one
 * new projection, then moves registry history in the same nested transaction.
 */
export function ensureBundledSpellContent(
  db: DatabaseContext,
  storedProjections: readonly BundledStoredProjectionV1[],
  sources: BundledSpellSeedSources = Object.freeze({}),
): BundledSpellSeedResult {
  const source = bundledSpellSource(sources);
  const storedByKey = new Map(
    storedProjections.filter((projection) => projection.kind === 'spell')
      .map((projection) => [projection.contentKey, projection]),
  );
  const outcomes = source.spells.map((spell) => reconcileBundledSpellEntry(
    db,
    spell,
    source.membershipsByName.get(spell.name) ?? Object.freeze([]),
    storedByKey.get(spell.content_key as ContentKey),
  ));
  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    healthy: outcomes.filter((outcome) => outcome.kind === 'healthy').length,
    updated: outcomes.filter((outcome) => outcome.kind === 'updated').length,
    refused: outcomes.filter((outcome) => outcome.kind === 'refused').length,
  });
}

/**
 * Repair pre-fix bundled spell registrations, then install only absent roots
 * before the general registry pass. Present roots are deliberately never
 * rewritten here: reconciliation must observe their actual stored state before
 * the source-wins seeder runs.
 */
export function installMissingBundledSpellContent(
  db: DatabaseContext,
): void {
  const source = bundledSpellSource();
  repairBundledSpellIdentityRegistrations(db, source.spells);
  if (hasBundledSpellCardinality(db)) {
    return;
  }
  const timestamp = new Date().toISOString();
  // One seed pass is one durable transaction. OPFS commits are materially
  // expensive, and committing once per missing spell made a real browser boot
  // pay that cost hundreds of times. This also restores the seed pass's atomic
  // failure semantics: either every absent bundled root is installed for the
  // projector, or none is.
  db.transaction(() => {
    for (const spell of source.spells) {
      if (db.oneRaw(
        'SELECT 1 FROM spell_versions WHERE content_key = ?',
        [spell.content_key],
      ) !== null) {
        continue;
      }
      writeBundledSpell(
        db,
        spell,
        source.membershipsByName.get(spell.name) ?? Object.freeze([]),
        timestamp,
      );
    }
  });
}

/**
 * Seed only keys owned by this bundle.
 *
 * A pre-existing non-SRD version under an official key is USER DATA. Silently
 * converting it to `srd` would overwrite that data; silently skipping it would
 * claim the complete bundled layer exists when it does not. The seed therefore
 * refuses the collision transactionally and leaves the existing row untouched.
 */
export function seedSpellContent(db: DatabaseContext): void {
  const source = bundledSpellSource();
  repairBundledSpellIdentityRegistrations(db, source.spells);
  if (hasBundledSpellCardinality(db)) {
    return;
  }

  db.transaction(() => {
    const timestamp = new Date().toISOString();
    const versionIds = new Map<string, number>();
    for (const spell of source.spells) {
      versionIds.set(spell.name, writeBundledSpell(
        db,
        spell,
        Object.freeze([]),
        timestamp,
      ));
    }
    // Preserve the independently printed class-list order in row ids. The
    // content-v1 projector treats membership as a set, but exports and source
    // provenance tests deliberately retain the source document's ordering.
    for (const membership of source.memberships) {
      const versionId = versionIds.get(membership.spell_name);
      if (versionId === undefined) {
        throw new SrdSpellError(
          `${membership.spell_name} has no seeded version id.`,
        );
      }
      db.exec(
        `INSERT INTO spell_list_memberships (
           spell_version_id, spell_list_key, created_at, updated_at
         ) VALUES (?, ?, ?, ?)`,
        [versionId, membership.spell_list_key, timestamp, timestamp],
      );
    }
  });
}
