import {
  sqlInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { Skill, SlotBucket } from '../domain/enums';
import { SKILL_GRANT_KEYS } from '../builder/contracts';
import {
  resolveSkillGrants,
  unfilledSpeciesSkillGrants,
} from '../grants/skill-grants';
import { resolveSkillExpertiseGrants } from '../grants/skill-expertise-grants';
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

/** One unfilled grant inside an {@link UnfilledSkillGrantsItem} group. */
export interface UnfilledSkillGrantChoice {
  readonly grant_id: number;
  readonly ordinal: number;
  /**
   * The skills this grant may be filled with NOW: its own pool minus every
   * skill an active grant already holds — §3.3's rule, enforced by the
   * partial unique index. Empty is possible (every pool skill held from
   * other sources) and the item's detail says so rather than printing an
   * obligation with an empty remedy.
   */
  readonly available_skills: readonly Skill[];
}

/**
 * A source's unfilled skill CHOICE GRANTS (skills-with-provenance §3.3, S-C).
 *
 * COMPLETION IS PER GRANT, NEVER A COUNT. This item replaces the two retired
 * count-shaped items (`no_skill_proficiencies`, which silenced on ANY flat
 * tick, and `unmade_multiclass_skill_choice`, whose `entitled − chosen`
 * arithmetic let a background tick pay off a class grant). An unfilled class
 * grant is reported outstanding NO MATTER HOW MANY skills the character holds
 * from other sources; held skills reduce only each grant's `available_skills`.
 *
 * Every grant is ADDRESSABLE: `grant_id` is what the planner's per-grant form
 * passes to `fill_skill_grant`, so filling through one class's form fills THAT
 * class's ordinal (§3.5 — the payload gained the grant's addressable identity;
 * `choose_multiclass_skill`, which could not say which grant it filled, is
 * retired).
 *
 * One item per `(source_instance_id, grant_key)` group, the same grouping
 * `unfilled_choices` uses per source and rule. Species choice grants (Keen
 * Senses, Skillful) report here too — they are tracked obligations with a
 * remedy, though they never gate the guided step (§4 pins class ordinals as
 * the gate).
 */
export interface UnfilledSkillGrantsItem {
  readonly kind: 'unfilled_skill_grants';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly grant_key: string;
  /** Filled ordinals in THIS group — never a count of ticks from elsewhere. */
  readonly chosen: number;
  readonly required: number;
  readonly missing: number;
  readonly grants: readonly UnfilledSkillGrantChoice[];
}

export interface ExpertiseGrantItem {
  readonly kind: 'expertise_grant';
  readonly title: string;
  readonly detail: string;
  readonly remedy: string;
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly grant_key: string;
  readonly ordinal: number;
  readonly grant_id: number;
  readonly orphaned: boolean;
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
  | UnfilledSkillGrantsItem
  | ExpertiseGrantItem;

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
 * in `src/queries/character-sheet-builder.ts` and printed on the sheet. Those
 * application-wide gaps would otherwise put permanent entries in everybody's
 * outstanding list forever; the one character-dependent D102 disclosure is
 * selected beside the stored feature prose that makes it relevant.
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
 * The display words per `grant_key`, so a Bard and an Elf are told different
 * things by their titles rather than sharing one generic sentence.
 */
const skillGrantWords: Readonly<
  Record<string, { readonly singular: string; readonly plural: string }>
> = {
  [SKILL_GRANT_KEYS.classSkill]: {
    singular: 'class skill choice',
    plural: 'class skill choices',
  },
  [SKILL_GRANT_KEYS.multiclassSkill]: {
    singular: 'multiclass skill choice',
    plural: 'multiclass skill choices',
  },
  [SKILL_GRANT_KEYS.speciesKeenSenses]: {
    singular: 'Keen Senses skill choice',
    plural: 'Keen Senses skill choices',
  },
  [SKILL_GRANT_KEYS.speciesSkillful]: {
    singular: 'Skillful skill choice',
    plural: 'Skillful skill choices',
  },
};

interface SkillGrantGroup {
  readonly source_instance_id: number;
  readonly grant_key: string;
  readonly grants: UnfilledSkillGrantChoice[];
}

/**
 * THE PER-GRANT SKILL CHECK (skills-with-provenance §3.3, S-C).
 *
 * Reads `character_skill_grants` through the SAME resolver the guided step's
 * completion predicate uses (`resolveSkillGrants` /
 * `unfilledSpeciesSkillGrants`), so the planner and the step cannot disagree
 * about what is outstanding. It NEVER reads the flat projection and it never
 * compares totals: a grant is outstanding because ITS OWN `skill` is null,
 * and no tick from any other source can pay it off — the retired
 * `entitlement − count(*)` arithmetic is §5's trap and `S-SILENCE`'s mutation.
 *
 * A character whose classes minted no grants (a homebrew class with no
 * structured entitlement, or a hand-built image that never ran the generator)
 * reports nothing — an honest absence, exactly as a class with no traits row
 * reported nothing before: the obligation is genuinely unknown (D33).
 */
export const unfilledSkillGrants: CompletenessCheck = {
  id: 'unfilled_skill_grants',
  run(context) {
    const resolved = resolveSkillGrants(context.db, context.characterId);
    const unfilled = [
      ...resolved.unfilledClassGrants.map((grant) => ({
        source_instance_id: grant.source_instance_id,
        grant_key: grant.grant_key,
        grant_id: grant.grant_id,
        ordinal: grant.ordinal,
        available: grant.available,
      })),
      ...unfilledSpeciesSkillGrants(context.db, context.characterId).map(
        (grant) => ({
          source_instance_id: grant.source_instance_id,
          grant_key: grant.grant_key,
          grant_id: grant.grant_id,
          ordinal: grant.ordinal,
          available: grant.available,
        }),
      ),
    ];
    if (unfilled.length === 0) {
      return [];
    }

    const groups = new Map<string, SkillGrantGroup>();
    for (const grant of unfilled) {
      const key = `${String(grant.source_instance_id)}:${grant.grant_key}`;
      const group = groups.get(key) ?? {
        source_instance_id: grant.source_instance_id,
        grant_key: grant.grant_key,
        grants: [],
      };
      group.grants.push({
        grant_id: grant.grant_id,
        ordinal: grant.ordinal,
        available_skills: grant.available,
      });
      groups.set(key, group);
    }

    return [...groups.values()].map((group): UnfilledSkillGrantsItem => {
      const sourceName =
        context.db.scalar<string>(
          'SELECT display_name FROM character_source_instances WHERE id = ?',
          [group.source_instance_id],
        ) ?? 'Unknown source';
      // Filled ordinals in THIS group — the group's own progress, never a
      // count of skills held elsewhere.
      const chosen = resolved.grants.filter(
        (grant) =>
          grant.state === 'active' &&
          grant.skill !== null &&
          grant.source_instance_id === group.source_instance_id &&
          grant.grant_key === group.grant_key,
      ).length;
      const missing = group.grants.length;
      const required = chosen + missing;
      const words = skillGrantWords[group.grant_key] ?? {
        singular: 'skill choice',
        plural: 'skill choices',
      };
      const emptied = group.grants.filter(
        (grant) => grant.available_skills.length === 0,
      ).length;
      const detail =
        `This source grants ${String(required)} ` +
        `${required === 1 ? words.singular : words.plural}; ` +
        `${String(missing)} ${missing === 1 ? 'is' : 'are'} still unchosen. ` +
        'A skill held from another source never fills this choice — it only ' +
        'leaves the list of skills still available to pick.' +
        (emptied > 0
          ? ` ${emptied === 1 ? 'One choice has' : `${String(emptied)} choices have`} ` +
            'no skill left to offer, because every option is already held ' +
            'from another source; clearing one of those choices would free ' +
            'a skill.'
          : '');
      return {
        kind: 'unfilled_skill_grants',
        title:
          `${String(sourceName)} — ${String(chosen)} of ${String(required)} ` +
          `${words.plural} chosen`,
        detail,
        remedy:
          missing === required
            ? `Pick ${String(missing)} ${missing === 1 ? 'skill' : 'skills'} with the choice controls below.`
            : `Pick ${String(missing)} more ${missing === 1 ? 'skill' : 'skills'} with the choice controls below.`,
        source_instance_id: group.source_instance_id,
        source_name: String(sourceName),
        grant_key: group.grant_key,
        chosen,
        required,
        missing,
        grants: [...group.grants].sort((a, b) => a.ordinal - b.ordinal),
      };
    });
  },
};

/** D70: both an unmade expertise choice and a tombstoned choice stay visible. */
export const expertiseGrantWarnings: CompletenessCheck = {
  id: 'expertise_grants',
  run(context) {
    return resolveSkillExpertiseGrants(context.db, context.characterId)
      .filter((grant) => grant.state === 'orphaned' || grant.skill === null)
      .map((grant): ExpertiseGrantItem => {
        const sourceName =
          context.db.scalar<string>(
            'SELECT display_name FROM character_source_instances WHERE id = ?',
            [grant.source_instance_id],
          ) ?? 'Unknown source';
        const orphaned = grant.state === 'orphaned';
        return {
          kind: 'expertise_grant',
          title: orphaned
            ? `${String(sourceName)} — expertise choice needs attention`
            : `${String(sourceName)} — expertise choice not chosen`,
          detail: orphaned
            ? grant.orphan_reason_code === 'underlying_proficiency_removed'
              ? 'The skill chosen for expertise is no longer proficient, so the choice was preserved as an orphan instead of silently changing the sheet.'
              : 'The source or entitlement for this expertise choice is no longer active, so the previous choice was preserved as an orphan.'
            : 'This source grants expertise, but its skill has not been chosen yet.',
          remedy: orphaned
            ? 'Restore the source and underlying proficiency, or make a current expertise choice.'
            : 'Choose one of this source’s skills you are already proficient in.',
          source_instance_id: grant.source_instance_id,
          source_name: String(sourceName),
          grant_key: grant.grant_key,
          ordinal: grant.ordinal,
          grant_id: grant.id,
          orphaned,
        };
      });
  },
};

export const completenessChecks: readonly CompletenessCheck[] = Object.freeze([
  unfilledChoices,
  unchosenOrder,
  noClass,
  orphanHitPointRolls,
  unfilledSkillGrants,
  expertiseGrantWarnings,
]);

const kindRank: Readonly<Record<CompletenessItem['kind'], number>> = {
  no_class: 0,
  unchosen_option: 1,
  unfilled_choices: 2,
  // A LEVEL WITH NO RECORDED ROLL IS DELIBERATELY NOT HERE. Not rolling is a
  // legitimate steady state, not an unfinished decision: no roll means "use the
  // printed fixed value", which is a complete answer. Reporting it would nag
  // every character with a second class level forever and would contradict the
  // reasoning that made the roll an absent ROW rather than a nullable column.
  // The sheet still states which levels use the fixed value, beside the number
  // it changed.
  orphan_hit_point_roll: 3,
  // Sorts among the other per-source items by source name, after that
  // source's spell choices: a class's skill choices sit beside its cantrips
  // rather than in a global bucket at the bottom.
  unfilled_skill_grants: 4,
  expertise_grant: 5,
};

function sortKey(item: CompletenessItem): readonly [string, number, string] {
  if (item.kind === 'no_class') {
    return ['', kindRank.no_class, ''];
  }
  if (item.kind === 'orphan_hit_point_roll') {
    return [item.class_name, kindRank.orphan_hit_point_roll, ''];
  }
  if (item.kind === 'unchosen_option') {
    return [item.source_name, kindRank.unchosen_option, item.order_name];
  }
  if (item.kind === 'unfilled_skill_grants') {
    return [item.source_name, kindRank.unfilled_skill_grants, item.grant_key];
  }
  if (item.kind === 'expertise_grant') {
    return [
      item.source_name,
      kindRank.expertise_grant,
      `${item.grant_key}:${String(item.ordinal)}`,
    ];
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
