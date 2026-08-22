/**
 * Parsed spell pages -> directly importable content-pack v1 bytes.
 *
 * This is deliberately a small closed grammar, not a best-effort prose parser.
 * A page is emitted only when every field needed by one of the supported
 * operations is present in the metadata or in one complete, anchored mechanics
 * sentence shape. Extra clauses make the record ambiguous and therefore
 * unemitted; they are never discarded as flavour.
 */
import type { CatalogRecord } from '../../src/catalog/catalog-schema';
import {
  CONTENT_PACK_SCHEMA_VERSION,
  loadContentPackBytes,
  type ContentPackV1,
} from '../../src/content/content-pack';
import { abilities, damageTypes, spellSchools } from '../../src/domain/enums';
import { damageType as brandedDamageType, type DamageType } from '../../src/combat/values';
import type { SpellLevel } from '../../src/combat/spells/types';
import type { BuiltPage, BuildFailure } from './build-catalog';
import { SCRAPED_OWNER_NAMESPACE, SCRAPE_SENTINEL } from './provenance';
import type { QueueItem } from './queue';

export const CONTENT_PACK_UNEMITTED_REASONS = [
  'ambiguous-parameters',
  'out-of-combat',
  'parse-failure',
  'unmapped-vocabulary',
] as const;

export type ContentPackUnemittedReason =
  (typeof CONTENT_PACK_UNEMITTED_REASONS)[number];

type ContentPackSpell = ContentPackV1['spells'][number];
type DirectDamageDice = Extract<
  ContentPackSpell['operation'],
  { readonly kind: 'attack_damage' | 'save_damage' }
>['dice'];

export interface ContentPackUnemittedPage {
  readonly url: string;
  readonly recordId: string | null;
  readonly reason: ContentPackUnemittedReason;
}

export interface ContentPackBuildReport {
  readonly provenance: string;
  readonly pagesSeen: number;
  readonly partial: boolean;
  readonly skippedQueueItems: readonly Pick<QueueItem, 'url' | 'state' | 'reason'>[];
  readonly emitted: number;
  readonly unemitted: number;
  readonly unemittedByReason: Readonly<Record<ContentPackUnemittedReason, number>>;
  readonly unemittedPages: readonly ContentPackUnemittedPage[];
}

export interface ContentPackBuildOutput {
  readonly pack: ContentPackV1;
  readonly packBytes: string;
  readonly report: ContentPackBuildReport;
  readonly reportBytes: string;
}

export interface ContentPackBuildInput {
  readonly pages: readonly BuiltPage[];
  readonly queue: readonly QueueItem[];
  readonly parseFailures: readonly BuildFailure[];
  readonly allowPartial: boolean;
  /** A deterministic timestamp derived by the caller from the cached input. */
  readonly importedAt: string;
}

export type ContentPackMappingResult =
  | { readonly status: 'emitted'; readonly spell: ContentPackSpell }
  | { readonly status: 'unemitted'; readonly reason: ContentPackUnemittedReason };

export class ContentPackBuildRefused extends Error {}

const CONTENT_SOURCE_ID = SCRAPED_OWNER_NAMESPACE;
const CONTENT_PACK_ID = 'scraped-wikidot-spells';
const RECORD_ID = /^[a-z0-9][a-z0-9._-]{0,95}$/u;
const MIN_RANGE_FEET = 1;
const MAX_RANGE_FEET = 100_000;
const MIN_DICE_COUNT = 1;
const MAX_DICE_COUNT = 100;
const MIN_DIE_SIDES = 2;
const MAX_DIE_SIDES = 100;
const MIN_EMITTED_SPELL_LEVEL = 1;
const MAX_EMITTED_SPELL_LEVEL = 9;

type CombatCastingTime = 'action' | 'bonus_action' | 'reaction';

function mapCastingTime(value: string): CombatCastingTime | ContentPackUnemittedReason {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'action' || normalized === 'action or ritual') return 'action';
  if (normalized === 'bonus action') return 'bonus_action';
  if (normalized === 'reaction') return 'reaction';
  if (/^(?:1 minute|10 minutes|1 hour)(?: or ritual)?$/u.test(normalized)) {
    return 'out-of-combat';
  }
  return 'unmapped-vocabulary';
}

function mapRange(value: string): number | ContentPackUnemittedReason {
  const match = /^([0-9]+) (foot|feet)$/iu.exec(value.trim());
  if (match === null) return 'ambiguous-parameters';
  const feet = Number(match[1]);
  const unit = (match[2] as string).toLowerCase();
  if ((feet === 1) !== (unit === 'foot')) return 'ambiguous-parameters';
  return Number.isSafeInteger(feet) && feet >= MIN_RANGE_FEET && feet <= MAX_RANGE_FEET
    ? feet
    : 'ambiguous-parameters';
}

function mapComponents(
  value: string,
): ContentPackSpell['components'] | ContentPackUnemittedReason {
  const tokens = value.split(',').map((token) => token.trim());
  if (tokens.some((token) => /^M(?:\s|\()/u.test(token))) {
    // The page metadata does not say whether the material is consumed. The
    // content-pack type requires that boolean, so choosing false would invent it.
    return 'ambiguous-parameters';
  }
  if (
    tokens.length === 0 ||
    tokens.some((token) => token !== 'V' && token !== 'S') ||
    new Set(tokens).size !== tokens.length
  ) {
    return 'unmapped-vocabulary';
  }
  return {
    verbal: tokens.includes('V'),
    somatic: tokens.includes('S'),
    material: null,
  };
}

interface ParsedDirectDamage {
  readonly operation: ContentPackSpell['operation'];
}

const ATTACK_DAMAGE =
  /^Make a (melee|ranged) spell attack against one creature within range\. On a hit, (?:that creature|the target) takes ([0-9]+)d([0-9]+) ([A-Za-z]+) damage\.$/iu;
const SAVE_DAMAGE =
  /^One creature within range must make a ([A-Za-z]+) saving throw\. On a failed save, (?:that creature|the target) takes ([0-9]+)d([0-9]+) ([A-Za-z]+) damage\. On a successful save, it takes (half as much|no) damage\.$/iu;

function mappedDice(
  countText: string,
  sidesText: string,
): DirectDamageDice | null {
  const count = Number(countText);
  const sides = Number(sidesText);
  if (
    !Number.isSafeInteger(count) || count < MIN_DICE_COUNT || count > MAX_DICE_COUNT ||
    !Number.isSafeInteger(sides) || sides < MIN_DIE_SIDES || sides > MAX_DIE_SIDES
  ) {
    return null;
  }
  return {
    baseCount: count,
    sides,
    modifier: 0,
    perSlotCount: 0,
    perSlotModifier: 0,
    cantripUpgrade: false,
  };
}

function canonicalDamageType(value: string): DamageType | null {
  const found = damageTypes.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
  return found === undefined ? null : brandedDamageType(found);
}

function canonicalAbility(value: string): (typeof abilities)[number] | null {
  return abilities.find((candidate) => candidate.toLowerCase() === value.toLowerCase()) ?? null;
}

function mapDirectDamage(description: string): ParsedDirectDamage | ContentPackUnemittedReason {
  const normalized = description.replace(/\s+/gu, ' ').trim();
  const attack = ATTACK_DAMAGE.exec(normalized);
  if (attack !== null) {
    const dice = mappedDice(attack[2] as string, attack[3] as string);
    if (dice === null) return 'ambiguous-parameters';
    const damageType = canonicalDamageType(attack[4] as string);
    if (damageType === null) return 'unmapped-vocabulary';
    return {
      operation: {
        kind: 'attack_damage',
        attackKind: (attack[1] as string).toLowerCase() === 'melee' ? 'melee' : 'ranged',
        damageType,
        dice,
        rider: null,
      },
    };
  }

  const save = SAVE_DAMAGE.exec(normalized);
  if (save !== null) {
    const ability = canonicalAbility(save[1] as string);
    const dice = mappedDice(save[2] as string, save[3] as string);
    const damageType = canonicalDamageType(save[4] as string);
    if (ability === null || damageType === null) return 'unmapped-vocabulary';
    if (dice === null) return 'ambiguous-parameters';
    return {
      operation: {
        kind: 'save_damage',
        ability,
        onSuccess: (save[5] as string).toLowerCase() === 'half as much' ? 'half' : 'none',
        damageType,
        dice,
        riderOnFailure: null,
        pushFeetOnFailure: 0,
      },
    };
  }

  return /\b(?:damage|saving throw|spell attack)\b/iu.test(normalized)
    ? 'ambiguous-parameters'
    : 'unmapped-vocabulary';
}

function unemitted(reason: ContentPackUnemittedReason): ContentPackMappingResult {
  return { status: 'unemitted', reason };
}

function isEmittedSpellLevel(value: number): value is Exclude<SpellLevel, 0> {
  return Number.isInteger(value) &&
    value >= MIN_EMITTED_SPELL_LEVEL && value <= MAX_EMITTED_SPELL_LEVEL;
}

export function mapParsedSpellToContentPack(record: CatalogRecord, description: string): ContentPackMappingResult {
  if (!RECORD_ID.test(record.identityKey)) return unemitted('ambiguous-parameters');
  if (!isEmittedSpellLevel(record.level)) {
    // A damaging cantrip needs a level-scaling rule. The parsed catalog record
    // intentionally carries no trustworthy scaling ladder, so false is not an
    // honest default for level 0. Values above 9 are outside the pack format.
    return unemitted('ambiguous-parameters');
  }
  const level = record.level;

  if (
    record.castingTime === null || record.range === null ||
    record.components === null || record.duration === null
  ) {
    return unemitted('ambiguous-parameters');
  }
  const castingTime = mapCastingTime(record.castingTime);
  if (castingTime !== 'action' && castingTime !== 'bonus_action' && castingTime !== 'reaction') {
    return unemitted(castingTime);
  }
  const rangeFeet = mapRange(record.range);
  if (typeof rangeFeet !== 'number') return unemitted(rangeFeet);
  const components = mapComponents(record.components);
  if (typeof components === 'string') return unemitted(components);
  if (record.duration.trim().toLowerCase() !== 'instantaneous' || record.concentration) {
    return unemitted('ambiguous-parameters');
  }
  const damage = mapDirectDamage(description);
  if (typeof damage === 'string') return unemitted(damage);
  const knownSchool = spellSchools.find((school) => school === record.school);

  return {
    status: 'emitted',
    spell: {
      sourceId: CONTENT_SOURCE_ID,
      recordId: record.identityKey,
      name: record.name,
      level,
      school: knownSchool === undefined
        ? { kind: 'other', name: record.school }
        : { kind: 'known', name: knownSchool },
      castingTime,
      ...(record.ritual ? { ritual: true as const } : {}),
      range: { kind: 'feet', feet: rangeFeet },
      components,
      duration: { kind: 'instantaneous' },
      concentration: false,
      targeting: { kind: 'single', rangeFeet, willing: false },
      operation: damage.operation,
    },
  };
}

function zeroReasonCounts(): Record<ContentPackUnemittedReason, number> {
  return {
    'ambiguous-parameters': 0,
    'out-of-combat': 0,
    'parse-failure': 0,
    'unmapped-vocabulary': 0,
  };
}

export function buildContentPackDocuments(input: ContentPackBuildInput): ContentPackBuildOutput {
  const skippedQueueItems = input.queue
    .filter((item) => item.state !== 'done')
    .map((item) => ({ url: item.url, state: item.state, reason: item.reason }))
    .sort((left, right) => left.url.localeCompare(right.url));
  if (skippedQueueItems.length > 0 && !input.allowPartial) {
    const sample = skippedQueueItems
      .slice(0, 5)
      .map((item) => `  ${item.state}  ${item.url}${item.reason === null ? '' : ` — ${item.reason}`}`)
      .join('\n');
    throw new ContentPackBuildRefused(
      `refusing to emit content pack: ${skippedQueueItems.length} of ` +
        `${input.queue.length} queue entries are not done. Finish the run or ` +
        `pass --allow-partial.\n${sample}` +
        (skippedQueueItems.length > 5
          ? `\n  …and ${String(skippedQueueItems.length - 5)} more`
          : ''),
    );
  }

  const spells: ContentPackSpell[] = [];
  const unemittedPages: ContentPackUnemittedPage[] = input.parseFailures.map((failure) => ({
    url: failure.url,
    recordId: null,
    reason: 'parse-failure',
  }));

  const byUrl = (left: { readonly url: string }, right: { readonly url: string }): number =>
    left.url < right.url ? -1 : left.url > right.url ? 1 : 0;
  for (const page of [...input.pages].sort(byUrl)) {
    const mapped = mapParsedSpellToContentPack(page.record, page.description);
    if (mapped.status === 'emitted') {
      spells.push(mapped.spell);
    } else {
      unemittedPages.push({
        url: page.url,
        recordId: page.record.identityKey,
        reason: mapped.reason,
      });
    }
  }
  spells.sort((left, right) => left.recordId < right.recordId ? -1 : left.recordId > right.recordId ? 1 : 0);
  unemittedPages.sort(byUrl);

  const unemittedByReason = zeroReasonCounts();
  for (const page of unemittedPages) unemittedByReason[page.reason] += 1;

  const pack: ContentPackV1 = {
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    packId: CONTENT_PACK_ID,
    provenance: {
      sourceName: `Local scraped spell pages — ${SCRAPE_SENTINEL}`,
      sourceKind: 'user_import',
      importedAt: input.importedAt,
    },
    namespaces: [...new Set(spells.map((spell) => spell.sourceId))].sort(),
    spells,
    features: [],
    species: [],
    backgrounds: [],
    subclasses: [],
    monsters: [],
  };
  const packBytes = JSON.stringify(pack, null, 2);
  const validation = loadContentPackBytes(packBytes);
  if (validation.status !== 'loaded') {
    throw new ContentPackBuildRefused(
      `content-pack self-validation failed: ${validation.refusal.reason}`,
    );
  }

  const report: ContentPackBuildReport = {
    provenance: SCRAPE_SENTINEL,
    pagesSeen: input.pages.length + input.parseFailures.length,
    partial: skippedQueueItems.length > 0,
    skippedQueueItems,
    emitted: spells.length,
    unemitted: unemittedPages.length,
    unemittedByReason,
    unemittedPages,
  };
  return {
    pack,
    packBytes,
    report,
    reportBytes: JSON.stringify(report, null, 2),
  };
}
