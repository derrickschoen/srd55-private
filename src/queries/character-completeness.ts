import {
  sqlInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { SlotBucket } from '../domain/enums';
import { EligibleSpellSearch } from '../eligibility/eligible-spell-search';
import { CharacterNotFoundError } from './character-crud';
import { orderSources } from './order-sources';

export interface UnfilledChoicesItem {
  readonly kind: 'unfilled_choices';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly rule_key: string;
  readonly bucket: SlotBucket;
  readonly chosen: number;
  readonly required: number;
  readonly missing: number;
}

export interface UnchosenOptionItem {
  readonly kind: 'unchosen_option';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly order_name: string;
  readonly options: readonly string[];
}

export interface NoClassItem {
  readonly kind: 'no_class';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
}

export interface CatalogGapItem {
  readonly kind: 'catalog_gap';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly spell_lists: readonly string[];
  readonly spell_schools: readonly string[];
  readonly spell_tags: readonly string[];
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly sources: readonly string[];
}

export type CompletenessItem =
  | UnfilledChoicesItem
  | UnchosenOptionItem
  | NoClassItem;

export type CompletenessFinding = CompletenessItem | CatalogGapItem;

export interface CompletenessResult {
  readonly character_id: number;
  readonly outstanding_count: number;
  readonly catalog_gap_count: number;
  readonly items: readonly CompletenessItem[];
  readonly catalog_gaps: readonly CatalogGapItem[];
}

export interface CompletenessCount {
  readonly character_id: number;
  readonly outstanding_count: number;
  readonly catalog_gap_count: number;
}

export interface CheckContext {
  readonly db: DatabaseContext;
  readonly characterId: number;
}

export interface CompletenessCheck {
  readonly id: string;
  run(context: CheckContext): readonly CompletenessFinding[];
}

interface SlotConstraint {
  readonly lists: readonly string[];
  readonly schools: readonly string[];
  readonly tags: readonly string[];
  readonly level_min: number;
  readonly level_max: number;
}

interface ChoiceProbe {
  readonly slot_id: number;
  readonly constraint: SlotConstraint;
}

interface ChoiceGroup {
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly rule_key: string;
  readonly bucket: string;
  readonly total: number;
  readonly unfilled: number;
  // One entry per DISTINCT constraint among this group's unfilled slots.
  readonly probes: ReadonlyMap<string, ChoiceProbe>;
}

interface ReportableSlot {
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly rule_key: string;
  readonly bucket: string;
  readonly slot_id: number;
  readonly filled: boolean;
  readonly constraint: SlotConstraint;
}

interface GroupAccumulator {
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly rule_key: string;
  readonly bucket: string;
  readonly probes: Map<string, ChoiceProbe>;
  total: number;
  unfilled: number;
}

interface CatalogGap {
  readonly constraint: SlotConstraint;
  readonly sources: Set<string>;
}

interface BucketWords {
  readonly chosenNoun: string;
  readonly choiceNoun: string;
  readonly remedySingular: string;
  readonly remedyPlural: string;
}

const bucketWords: Readonly<Record<string, BucketWords>> = {
  cantrip_known: {
    chosenNoun: 'cantrips',
    choiceNoun: 'cantrip choices',
    remedySingular: 'cantrip',
    remedyPlural: 'cantrips',
  },
  prepared: {
    chosenNoun: 'prepared spells',
    choiceNoun: 'prepared spell choices',
    remedySingular: 'spell for the prepared list',
    remedyPlural: 'spells for the prepared list',
  },
  known: {
    chosenNoun: 'known spells',
    choiceNoun: 'known spell choices',
    remedySingular: 'known spell',
    remedyPlural: 'known spells',
  },
  spellbook: {
    chosenNoun: 'spellbook spells',
    choiceNoun: 'spellbook choices',
    remedySingular: 'spellbook spell',
    remedyPlural: 'spellbook spells',
  },
};

// Under-filling a prepared list is a legitimate player choice under the 2024
// long-rest rules, so only a wholly empty prepared group is outstanding work.
// Cantrips, known spells and spellbook entries are permanent selections, so a
// partial under-fill there is unfinished. Any other bucket — 'automatic', or a
// value a restored database carries that this build does not know — never
// reports, so an unrecognised bucket can never nag.
export function reportsUnderFill(
  bucket: string,
  unfilled: number,
  total: number,
): boolean {
  if (bucketWords[bucket] === undefined) {
    return false;
  }
  return bucket === 'prepared' ? unfilled === total : unfilled > 0;
}

function sentenceList(values: readonly string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]!}`;
}

// Mirrors `stringList` in EligibleSpellSearch, which treats a non-array JSON
// value as no constraint but throws on text that will not parse. `null` here
// means the slot cannot be probed at all, not that it is unconstrained.
function constraintList(encoded: string | null): string[] | null {
  if (encoded === null || encoded === '') {
    return [];
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(encoded);
  } catch {
    return null;
  }
  return Array.isArray(decoded)
    ? decoded.map((value) => String(value)).sort()
    : [];
}

function slotConstraint(row: SqlRow): SlotConstraint | null {
  const lists = constraintList(
    sqlNullableString(row, 'allowed_spell_lists'),
  );
  const schools = constraintList(sqlNullableString(row, 'allowed_schools'));
  const tags = constraintList(sqlNullableString(row, 'allowed_tags'));
  if (lists === null || schools === null || tags === null) {
    return null;
  }
  return {
    lists,
    schools,
    tags,
    level_min: sqlInteger(row, 'spell_level_min'),
    level_max: sqlInteger(row, 'spell_level_max'),
  };
}

// Lists sort at decode time, so the same constraint written in a different
// array order collapses onto one key instead of splitting into two gaps.
function constraintKey(constraint: SlotConstraint): string {
  return JSON.stringify([
    constraint.lists,
    constraint.schools,
    constraint.tags,
    constraint.level_min,
    constraint.level_max,
  ]);
}

function reportableSlots(context: CheckContext): ReportableSlot[] {
  const rows = context.db.all(
    `SELECT slot.id,
            slot.source_instance_id,
            slot.rule_key,
            slot.bucket,
            slot.spell_level_min,
            slot.spell_level_max,
            slot.allowed_spell_lists,
            slot.allowed_schools,
            slot.allowed_tags,
            slot.current_spell_version_id,
            slot.fixed_spell_version_id,
            slot.selection_eligibility,
            source.display_name AS source_name
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
             ON source.id = slot.source_instance_id
            AND source.character_id = slot.character_id
     WHERE slot.character_id = ?
       AND slot.state = 'active'
       AND source.state = 'active'
       AND slot.required = 1
       AND slot.is_locked = 0
       AND slot.bucket <> 'automatic'
       AND slot.selection_collection IS NULL
     ORDER BY source.display_name, slot.rule_key, slot.bucket, slot.id`,
    [context.characterId],
    (row): ReportableSlot | null => {
      const constraint = slotConstraint(row);
      const filled =
        row.current_spell_version_id !== null ||
        row.fixed_spell_version_id !== null;
      // A slot this build cannot evaluate — an undecodable constraint, or an
      // empty slot a restored database flagged invalid — is the warnings
      // badge's business. It must neither nag nor inflate the chosen count.
      if (
        constraint === null ||
        (!filled && sqlString(row, 'selection_eligibility') === 'invalid')
      ) {
        return null;
      }
      return {
        source_instance_id: sqlInteger(row, 'source_instance_id'),
        source_name: sqlString(row, 'source_name'),
        rule_key: sqlString(row, 'rule_key'),
        bucket: sqlString(row, 'bucket'),
        slot_id: sqlInteger(row, 'id'),
        filled,
        constraint,
      };
    },
  );
  return rows.filter((slot): slot is ReportableSlot => slot !== null);
}

function choiceGroups(context: CheckContext): ChoiceGroup[] {
  const groups = new Map<string, GroupAccumulator>();
  for (const slot of reportableSlots(context)) {
    const groupKey = JSON.stringify([
      slot.source_instance_id,
      slot.rule_key,
      slot.bucket,
    ]);
    const group = groups.get(groupKey) ?? {
      source_instance_id: slot.source_instance_id,
      source_name: slot.source_name,
      rule_key: slot.rule_key,
      bucket: slot.bucket,
      probes: new Map<string, ChoiceProbe>(),
      total: 0,
      unfilled: 0,
    };
    group.total += 1;
    if (!slot.filled) {
      group.unfilled += 1;
      const probeKey = constraintKey(slot.constraint);
      if (!group.probes.has(probeKey)) {
        group.probes.set(probeKey, {
          slot_id: slot.slot_id,
          constraint: slot.constraint,
        });
      }
    }
    groups.set(groupKey, group);
  }
  return [...groups.values()].filter((group) => group.unfilled > 0);
}

function unfilledChoicesItem(
  group: ChoiceGroup,
  words: BucketWords,
): UnfilledChoicesItem {
  const chosen = group.total - group.unfilled;
  const noun =
    group.unfilled === 1 ? words.remedySingular : words.remedyPlural;
  const count = chosen === 0 ? String(group.unfilled) : `${group.unfilled} more`;
  return {
    kind: 'unfilled_choices',
    title: `${group.source_name} — ${chosen} of ${group.total} ${words.chosenNoun} chosen`,
    detail: `This source grants ${group.total} ${words.choiceNoun}; ${group.unfilled} ${
      group.unfilled === 1 ? 'is' : 'are'
    } still empty.`,
    remedy: `Open ${group.source_name} in the planner and choose ${count} ${noun}.`,
    source_instance_id: group.source_instance_id,
    source_name: group.source_name,
    rule_key: group.rule_key,
    bucket: group.bucket as SlotBucket,
    chosen,
    required: group.total,
    missing: group.unfilled,
  };
}

function levelPhrase(minimum: number, maximum: number): string {
  if (minimum === 0 && maximum === 0) {
    return 'cantrips';
  }
  if (minimum === maximum) {
    return `level ${minimum} spells`;
  }
  if (minimum === 0 && maximum === 9) {
    return 'spells';
  }
  return `level ${minimum} to ${maximum} spells`;
}

// Every part of the constraint reaches the wording, so two gaps that differ
// only by level range, school or tag never read as the same sentence.
function constraintPhrase(constraint: SlotConstraint): string {
  const lists = sentenceList(constraint.lists);
  const levels = levelPhrase(constraint.level_min, constraint.level_max);
  const parts = [lists === '' ? levels : `${lists} ${levels}`];
  if (constraint.schools.length > 0) {
    parts.push(
      `from the ${sentenceList(constraint.schools)} ${
        constraint.schools.length === 1 ? 'school' : 'schools'
      }`,
    );
  }
  if (constraint.tags.length > 0) {
    parts.push(`tagged ${sentenceList(constraint.tags)}`);
  }
  return parts.join(' ');
}

function catalogGapItem(gap: CatalogGap): CatalogGapItem {
  const sources = [...gap.sources].sort();
  const phrase = constraintPhrase(gap.constraint);
  const sourcePhrase = sentenceList(sources);
  const asks = sources.length === 1 ? 'asks' : 'ask';
  return {
    kind: 'catalog_gap',
    title: `No eligible ${phrase} in your catalog`,
    detail: `${sourcePhrase} ${asks} for ${phrase}, and no spell in the imported catalog can fill them.`,
    remedy: `Import a catalog file with more ${phrase} (Settings → Import catalog).`,
    spell_lists: [...gap.constraint.lists],
    spell_schools: [...gap.constraint.schools],
    spell_tags: [...gap.constraint.tags],
    spell_level_min: gap.constraint.level_min,
    spell_level_max: gap.constraint.level_max,
    sources,
  };
}

export const unfilledChoices: CompletenessCheck = {
  id: 'unfilled_choices',
  run(context) {
    const search = new EligibleSpellSearch(context.db);
    const items: CompletenessFinding[] = [];
    const suppressed = new Map<string, CatalogGap>();
    for (const group of choiceGroups(context)) {
      const words = bucketWords[group.bucket];
      if (
        words === undefined ||
        !reportsUnderFill(group.bucket, group.unfilled, group.total)
      ) {
        continue;
      }
      // Suppress the group only when EVERY distinct constraint it holds is
      // unfillable; one fillable slot is real work and must still be shown.
      const fillable = [...group.probes.values()].some((probe) =>
        search.hasAny(context.characterId, probe.slot_id),
      );
      if (fillable) {
        items.push(unfilledChoicesItem(group, words));
        continue;
      }
      for (const [key, probe] of group.probes) {
        const gap = suppressed.get(key) ?? {
          constraint: probe.constraint,
          sources: new Set<string>(),
        };
        gap.sources.add(group.source_name);
        suppressed.set(key, gap);
      }
    }
    for (const [, gap] of [...suppressed].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )) {
      items.push(catalogGapItem(gap));
    }
    return items;
  },
};

export const unchosenOrder: CompletenessCheck = {
  id: 'unchosen_option',
  run(context) {
    return orderSources(context.db, context.characterId)
      .filter((source) => source.chosen_option === null)
      .map((source): UnchosenOptionItem => ({
        kind: 'unchosen_option',
        title: `${source.display_name} — ${source.order_name} not chosen`,
        detail: `${source.order_name} is unchosen, so this source has granted no spells yet.`,
        remedy: `Open ${source.display_name} in the planner and choose ${source.options.join(
          ' or ',
        )}.`,
        source_instance_id: source.id,
        source_name: source.display_name,
        order_name: source.order_name,
        options: [...source.options],
      }));
  },
};

export const noClass: CompletenessCheck = {
  id: 'no_class',
  run(context) {
    const present =
      Number(
        context.db.scalar(
          `SELECT EXISTS (
             SELECT 1 FROM character_class_levels WHERE character_id = ?
           )`,
          [context.characterId],
        ) ?? 0,
      ) === 1;
    if (present) {
      return [];
    }
    return [
      {
        kind: 'no_class',
        title: 'No class added yet',
        detail:
          'This character has no class levels, so no class spellcasting is set up.',
        remedy: 'Use Add source in the planner to add a class and its level.',
      },
    ];
  },
};

export const completenessChecks: readonly CompletenessCheck[] = Object.freeze([
  unfilledChoices,
  unchosenOrder,
  noClass,
]);

const kindRank: Readonly<Record<CompletenessItem['kind'], number>> = {
  no_class: 0,
  unchosen_option: 1,
  unfilled_choices: 2,
};

function sortKey(item: CompletenessItem): readonly [string, number, string] {
  if (item.kind === 'no_class') {
    return ['', kindRank.no_class, ''];
  }
  if (item.kind === 'unchosen_option') {
    return [item.source_name, kindRank.unchosen_option, item.order_name];
  }
  return [
    item.source_name,
    kindRank.unfilled_choices,
    `${item.rule_key}:${item.bucket}`,
  ];
}

function compareItems(
  left: CompletenessItem,
  right: CompletenessItem,
): number {
  const a = sortKey(left);
  const b = sortKey(right);
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
  if (a[1] !== b[1]) return a[1] - b[1];
  if (a[2] !== b[2]) return a[2] < b[2] ? -1 : 1;
  return 0;
}

export class CharacterCompletenessQueries {
  constructor(
    private readonly db: DatabaseContext,
    private readonly checks: readonly CompletenessCheck[] = completenessChecks,
  ) {}

  build(characterId: number): CompletenessResult {
    if (
      Number(
        this.db.scalar('SELECT count(*) FROM characters WHERE id = ?', [
          characterId,
        ]) ?? 0,
      ) !== 1
    ) {
      throw new CharacterNotFoundError(characterId);
    }
    const context: CheckContext = { db: this.db, characterId };
    const findings = this.checks.flatMap((check) => check.run(context));
    const items = findings
      .filter(
        (finding): finding is CompletenessItem =>
          finding.kind !== 'catalog_gap',
      )
      .sort(compareItems);
    const catalogGaps = findings.filter(
      (finding): finding is CatalogGapItem => finding.kind === 'catalog_gap',
    );
    return {
      character_id: characterId,
      outstanding_count: items.length,
      catalog_gap_count: catalogGaps.length,
      items,
      catalog_gaps: catalogGaps,
    };
  }

  counts(): CompletenessCount[] {
    return this.db
      .all(
        'SELECT id FROM characters ORDER BY name, id',
        undefined,
        (row) => sqlInteger(row, 'id'),
      )
      .map((characterId) => {
        const result = this.build(characterId);
        return {
          character_id: result.character_id,
          outstanding_count: result.outstanding_count,
          catalog_gap_count: result.catalog_gap_count,
        };
      });
  }
}
