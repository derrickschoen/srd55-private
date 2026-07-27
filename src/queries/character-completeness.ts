import {
  sqlInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { isEnumValue, multiclassSkillPools } from '../domain/enums';
import type { MulticlassSkillPool, SlotBucket } from '../domain/enums';
import { startingClass } from '../rules/sheet';
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

/**
 * A hit point roll recorded against a class the character does not have.
 *
 * THE COST OF KEYING A ROLL ON A CLASS NAME, MADE VISIBLE. A roll survives the
 * deletion of its class row deliberately — a die the player physically rolled
 * must not be destroyed by an edit fixing a typo — but a roll that matches no
 * class is not read by `hitPointMaximum`, so the character's hit points are
 * quietly lower than the player expects. Naming the class here is what turns a
 * silent subtraction into something the user can act on.
 */
export interface OrphanHitPointRollItem {
  readonly kind: 'orphan_hit_point_roll';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly class_name: string;
  readonly levels: readonly number[];
}

export interface NoSkillProficienciesItem {
  readonly kind: 'no_skill_proficiencies';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly choice_count: number;
}

/**
 * A skill this character is owed by a class they MULTICLASSED INTO, and has not
 * ticked (Q11).
 *
 * THREE CLASSES GRANT ONE and no others do — Bard, Ranger and Rogue — so this
 * item exists for a small, real population rather than nagging everybody. It is
 * `outstanding` and not a `catalog_gap` on the line
 * `character-completeness.ts` already draws: only the player can decide which
 * skill they took.
 *
 * IT NAMES THE POOL, which is the whole reason the entry skill needed a
 * discriminator rather than a count. The Bard's entry skill may be ANY of the
 * eighteen; the Ranger's and the Rogue's must come from that class's own list.
 * A remedy that did not say which would send a Ranger to the wrong list.
 *
 * IT CANNOT SAY *WHICH* TICK PAID FOR *WHICH* GRANT, and says so rather than
 * pretending: `character_skill_proficiencies` is a flat set with no provenance,
 * so all this can compare is the TOTAL owed against the TOTAL ticked. That is
 * why `outstanding` is a number and not a list of grants.
 */
export interface UnmadeMulticlassSkillChoiceItem {
  readonly kind: 'unmade_multiclass_skill_choice';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  /** How many skills every class of theirs entitles them to, in total. */
  readonly entitled: number;
  readonly chosen: number;
  readonly outstanding: number;
  /** The multiclass entries that owe a skill, and where each may be drawn from. */
  readonly entries: readonly {
    readonly class_name: string;
    readonly count: number;
    readonly pool: Exclude<MulticlassSkillPool, 'none'>;
  }[];
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
  | NoClassItem
  | OrphanHitPointRollItem
  | NoSkillProficienciesItem
  | UnmadeMulticlassSkillChoiceItem;

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

/**
 * THE SHEET CHECKS. Two registry entries and one object each — the mechanism
 * completeness v1 already has, reused rather than reinvented.
 *
 * BOTH ARE `outstanding`, NOT `catalog_gap`, and the line is the one
 * `character-completeness.ts` already draws: an outstanding item is something
 * the USER must decide, a catalog gap is something their CATALOG lacks. Nobody
 * but the player knows what they rolled, which skills they picked, or which
 * class a stale roll belonged to. What the application itself does not hold —
 * class feature text, subclass coverage, Expertise — is stated by `SHEET_GAPS`
 * in `src/queries/character-sheet-builder.ts` and printed on the sheet, because
 * it is true of every character equally and would otherwise put six permanent
 * entries in everybody's outstanding list forever.
 */
export const orphanHitPointRolls: CompletenessCheck = {
  id: 'orphan_hit_point_roll',
  run(context) {
    const rows = context.db.all(
      `SELECT roll.class_name AS class_name, roll.class_level AS class_level
       FROM character_hit_point_rolls AS roll
       WHERE roll.character_id = ?
         AND NOT EXISTS (
           SELECT 1
           FROM character_class_levels AS level
           JOIN class_definitions AS definition
             ON definition.id = level.class_definition_id
           WHERE level.character_id = roll.character_id
             AND definition.name = roll.class_name
         )
       ORDER BY roll.class_name, roll.class_level`,
      [context.characterId],
      (row) => ({
        class_name: sqlString(row, 'class_name'),
        class_level: sqlInteger(row, 'class_level'),
      }),
    );
    const byClass = new Map<string, number[]>();
    for (const row of rows) {
      const levels = byClass.get(row.class_name) ?? [];
      levels.push(row.class_level);
      byClass.set(row.class_name, levels);
    }
    return [...byClass].map(([className, levels]): OrphanHitPointRollItem => ({
      kind: 'orphan_hit_point_roll',
      title: `Hit point rolls recorded for ${className}, which this character does not have`,
      detail:
        `${String(levels.length)} recorded roll${levels.length === 1 ? '' : 's'} ` +
        `for ${className} at level${levels.length === 1 ? '' : 's'} ` +
        `${levels.join(', ')}. They are not counted in the hit point maximum, ` +
        'so it is lower than those rolls would give.',
      remedy:
        `Add ${className} back, or clear those rolls on the sheet if the ` +
        'class was removed on purpose.',
      class_name: className,
      levels,
    }));
  },
};

/**
 * One class's contribution to a character's skill entitlement, RESOLVED.
 *
 * `via` is what makes the two counts different questions rather than one column
 * read twice: the class the character STARTED in offers its full
 * `skill_choice_count`, and every class they multiclassed into offers only its
 * `multiclass_skill_choice_count`, which is 0 for nine of the twelve.
 */
interface SkillEntitlementLine {
  readonly class_name: string;
  readonly is_starting_class: boolean;
  readonly count: number;
  readonly pool: MulticlassSkillPool | 'initial';
}

/**
 * How many skills this character's classes entitle them to, and from where.
 *
 * THIS REPLACES A LIVE WRONG NUMBER. The previous computation was
 * `sum(traits.skill_choice_count)` across every class with NO reference to
 * `is_starting_class`, so a Fighter 5 / Bard 1 was told they owed 2 + 3 = 5.
 * The SRD entry grant is 2 (Fighter, the starting class) + 1 (the Bard's entry
 * clause) = 3. The multiclass entry columns did not exist when that query was
 * written; they do now, and this is the number they were seeded for.
 *
 * IT REUSES `startingClass` RATHER THAN READING THE FLAG, which is why that
 * resolver was made generic. Reading `is_starting_class` directly here would
 * disagree with the sheet whenever the flag is missing or duplicated — the
 * completeness list would count one class's full row while the sheet counted
 * another's — and two disagreeing answers to "which class did this character
 * start as" is worse than either.
 *
 * A CLASS WITH NO SEEDED TRAITS ROW CONTRIBUTES NOTHING AND IS NOT COUNTED. Its
 * entitlement is genuinely unknown, and inventing 2 for it would put a number
 * the user cannot act on into an outstanding item.
 */
function skillEntitlement(
  context: CheckContext,
): readonly SkillEntitlementLine[] {
  const rows = context.db.all(
    `SELECT definition.name AS class_name,
            level.is_starting_class AS is_starting_class,
            traits.skill_choice_count AS skill_choice_count,
            traits.multiclass_skill_choice_count AS entry_count,
            traits.multiclass_skill_choice_pool AS entry_pool
       FROM character_class_levels AS level
       JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       JOIN class_sheet_traits AS traits
         ON traits.class_definition_id = level.class_definition_id
      WHERE level.character_id = ?
      ORDER BY definition.name, level.id`,
    [context.characterId],
    (row) => ({
      class_name: sqlString(row, 'class_name'),
      is_starting_class: Number(row.is_starting_class) === 1,
      skill_choice_count: sqlInteger(row, 'skill_choice_count'),
      entry_count: sqlInteger(row, 'entry_count'),
      entry_pool: sqlString(row, 'entry_pool'),
    }),
  );
  const { chosen } = startingClass(rows);
  return rows.map((row): SkillEntitlementLine => {
    if (chosen === row) {
      return {
        class_name: row.class_name,
        is_starting_class: true,
        count: row.skill_choice_count,
        pool: 'initial',
      };
    }
    // A stored pool outside the vocabulary is read as `none`, which grants
    // nothing. The CHECK on `class_sheet_traits` ties pool and count together,
    // so this is only reachable on a hand-edited image — and granting a skill
    // from a pool nobody can name would be an outstanding item with no remedy.
    const pool = isEnumValue(multiclassSkillPools, row.entry_pool)
      ? row.entry_pool
      : 'none';
    return {
      class_name: row.class_name,
      is_starting_class: false,
      count: pool === 'none' ? 0 : row.entry_count,
      pool,
    };
  });
}

function chosenSkillCount(context: CheckContext): number {
  return Number(
    context.db.scalar(
      `SELECT count(*) FROM character_skill_proficiencies WHERE character_id = ?`,
      [context.characterId],
    ) ?? 0,
  );
}

/**
 * The multiclass entries that owe a skill, if any of them do.
 *
 * NARROWED to the two pools that actually grant, so the item's `entries` field
 * cannot carry a `none` row — which would be a class listed as owing a skill it
 * does not owe.
 */
function grantingEntries(
  lines: readonly SkillEntitlementLine[],
): readonly UnmadeMulticlassSkillChoiceItem['entries'][number][] {
  const found: UnmadeMulticlassSkillChoiceItem['entries'][number][] = [];
  for (const line of lines) {
    if (line.is_starting_class || line.pool === 'initial' || line.pool === 'none') {
      continue;
    }
    if (line.count > 0) {
      found.push({
        class_name: line.class_name,
        count: line.count,
        pool: line.pool,
      });
    }
  }
  return found;
}

export const unmadeMulticlassSkillChoice: CompletenessCheck = {
  id: 'unmade_multiclass_skill_choice',
  run(context) {
    const lines = skillEntitlement(context);
    const entries = grantingEntries(lines);
    if (entries.length === 0) {
      return [];
    }
    const entitled = lines.reduce((sum, line) => sum + line.count, 0);
    const chosen = chosenSkillCount(context);
    const outstanding = entitled - chosen;
    if (outstanding <= 0) {
      return [];
    }
    const named = entries
      .map(
        (entry) =>
          `${entry.class_name} (${String(entry.count)}, ` +
          `${entry.pool === 'any' ? 'any skill' : `from the ${entry.class_name}'s own skill list`})`,
      )
      .join('; ');
    return [
      {
        kind: 'unmade_multiclass_skill_choice',
        title: 'A skill from multiclassing has not been chosen',
        detail:
          `Multiclassing into ${named} grants a skill proficiency. Across every ` +
          `class this character has ${String(entitled)} skill ` +
          `proficienc${entitled === 1 ? 'y' : 'ies'} ` +
          `${entitled === 1 ? 'is' : 'are'} owed and ${String(chosen)} ` +
          `${chosen === 1 ? 'is' : 'are'} ticked, so ` +
          `${String(outstanding)} remain${outstanding === 1 ? 's' : ''}. ` +
          'Which tick pays for which grant is not recorded, so this compares ' +
          'the totals.',
        remedy:
          'Tick the outstanding skills on the character sheet, choosing them ' +
          'from the list named above.',
        entitled,
        chosen,
        outstanding,
        entries,
      },
    ];
  },
};

export const noSkillProficiencies: CompletenessCheck = {
  id: 'no_skill_proficiencies',
  run(context) {
    const chosen = chosenSkillCount(context);
    if (chosen > 0) {
      return [];
    }
    const lines = skillEntitlement(context);
    // STANDS DOWN WHERE `unmade_multiclass_skill_choice` SPEAKS, so the two
    // partition the population instead of both firing on the same character.
    // That item says everything this one does AND names the classes and their
    // pools, so reporting both would be the same fact twice with one of them
    // less useful.
    if (grantingEntries(lines).length > 0) {
      return [];
    }
    // How many the character's classes ENTITLE them to — the STARTING class's
    // full count plus every other class's entry count, which is what the SRD
    // grants and what the old `sum(skill_choice_count)` got wrong. Zero classes,
    // or classes with no seeded traits row, means there is nothing to say.
    const entitled = lines.reduce((sum, line) => sum + line.count, 0);
    if (entitled === 0) {
      return [];
    }
    return [
      {
        kind: 'no_skill_proficiencies',
        title: 'No skill proficiencies chosen',
        detail:
          `This character's classes offer ${String(entitled)} skill ` +
          'proficiencies and none is recorded, so every skill modifier on ' +
          'the sheet is the bare ability modifier.',
        remedy: 'Tick the skills on the character sheet.',
        choice_count: entitled,
      },
    ];
  },
};

export const completenessChecks: readonly CompletenessCheck[] = Object.freeze([
  unfilledChoices,
  unchosenOrder,
  noClass,
  orphanHitPointRolls,
  noSkillProficiencies,
  unmadeMulticlassSkillChoice,
]);

const kindRank: Readonly<Record<CompletenessItem['kind'], number>> = {
  no_class: 0,
  unchosen_option: 1,
  unfilled_choices: 2,
  // The two sheet items sort after the build items and among themselves in the
  // order a player would act on them: a stale roll is a mistake to correct, an
  // unticked skill list is a decision not yet made.
  //
  // A LEVEL WITH NO RECORDED ROLL IS DELIBERATELY NOT HERE. Not rolling is a
  // legitimate steady state, not an unfinished decision: no roll means "use the
  // printed fixed value", which is a complete answer. Reporting it would nag
  // every character with a second class level forever and would contradict the
  // reasoning that made the roll an absent ROW rather than a nullable column.
  // The sheet still states which levels use the fixed value, beside the number
  // it changed.
  orphan_hit_point_roll: 3,
  no_skill_proficiencies: 4,
  // Beside the skill item it partitions with, and after it: a character with
  // NOTHING ticked is further from done than one who is a single multiclass
  // skill short. The two never appear together.
  unmade_multiclass_skill_choice: 5,
};

function sortKey(item: CompletenessItem): readonly [string, number, string] {
  if (item.kind === 'no_class') {
    return ['', kindRank.no_class, ''];
  }
  if (item.kind === 'no_skill_proficiencies') {
    return ['', kindRank.no_skill_proficiencies, ''];
  }
  if (item.kind === 'unmade_multiclass_skill_choice') {
    return ['', kindRank.unmade_multiclass_skill_choice, ''];
  }
  if (item.kind === 'orphan_hit_point_roll') {
    return [item.class_name, kindRank.orphan_hit_point_roll, ''];
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
