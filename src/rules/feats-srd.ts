/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Feat rows are parsed from the complete Feat Descriptions extract. The parser
 * keeps the printed benefit as text and promotes only the mechanics the rules
 * engine consumes or searches: spell choices and skill proficiencies.
 * Fighting Style benefits remain sourced text because today's predicates
 * cannot express their weapon/equipment conditions safely. Level,
 * ability-score points, choices and caps have dedicated columns.
 */
import featsExtract from '../../docs/srd/source/feats.txt?raw';
import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import { rowContractError } from '../domain/contracts/rows';
import type {
  AbilityIncreaseAbilities,
  FeatPrerequisite,
} from '../builder/level-up-wizard';
import {
  abilities,
  isEnumValue,
  type Ability,
  type CharacterLevel,
  type FeatAbilityPoints,
  type KnownFeatGrouping,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import { GrantRule, type GrantRuleObject } from '../grants/grant-rule';
import {
  isBundledFeatContentKey,
  type BundledFeatContentKey,
} from './feat-application';

export const BUNDLED_FEAT_RULES_EDITION = '2024';

export class SrdFeatError extends Error {
  constructor(message: string) {
    super(`SRD feats: ${message}`);
    this.name = 'SrdFeatError';
  }
}

export type SrdFeatCategory =
  | 'Origin'
  | 'General'
  | 'Fighting Style'
  | 'Epic Boon';

export interface SrdFeatDefinition {
  readonly content_key: BundledFeatContentKey & ContentKey;
  readonly name: string;
  readonly catalog_layer: 'bundled';
  readonly source_category: SrdFeatCategory;
  readonly grouping: KnownFeatGrouping;
  readonly min_level: CharacterLevel | null;
  readonly ability_points: FeatAbilityPoints;
  readonly ability_increase_abilities: AbilityIncreaseAbilities | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: boolean;
  readonly prerequisites: readonly FeatPrerequisite[];
  readonly grant_rules: readonly GrantRuleObject[];
  readonly notes: string;
}

const FEAT_PATTERN =
  /^=== (?<name>[^=\n]+) ===\n(?<category>Origin|General|Fighting Style|Epic Boon) Feat(?: \(Prerequisite: (?<prerequisites>[^)\n]+)\))?\n\n(?<benefit>[\s\S]*?)(?=\n\n=== (?:Origin|General|Fighting Style|Epic Boon) Feats ===|\n\n=== [^=\n]+ ===|(?![\s\S]))/gm;

const EXPECTED_CATEGORY_COUNTS: Readonly<Record<SrdFeatCategory, number>> = {
  Origin: 4,
  General: 2,
  'Fighting Style': 4,
  'Epic Boon': 7,
};

const GROUPING_BY_SOURCE_CATEGORY: Readonly<
  Record<SrdFeatCategory, KnownFeatGrouping>
> = {
  Origin: 'origin',
  General: 'general',
  'Fighting Style': 'fighting_style',
  'Epic Boon': 'epic_boon',
};

const ABILITY_BY_PRINTED_NAME = new Map<string, Ability>(
  abilities.map((ability) => [
    `${ability.slice(0, 1).toUpperCase()}${ability.slice(1)}`,
    ability,
  ]),
);

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePrintedPrerequisites(
  featName: string,
  printed: string | undefined,
): {
  readonly min_level: CharacterLevel | null;
  readonly prerequisites: readonly FeatPrerequisite[];
} {
  if (printed === undefined) {
    return { min_level: null, prerequisites: [] };
  }

  let minLevel: CharacterLevel | null = null;
  const prerequisites: FeatPrerequisite[] = [];
  for (const part of printed.split(',').map((value) => value.trim())) {
    const level = /^Level (?<level>\d+)\+$/u.exec(part)?.groups?.level;
    if (level !== undefined) {
      const parsed = Number(level);
      if (
        minLevel !== null ||
        !Number.isSafeInteger(parsed) ||
        parsed < 1 ||
        parsed > 20
      ) {
        throw new SrdFeatError(
          `${featName} has an invalid or repeated level prerequisite ${JSON.stringify(part)}.`,
        );
      }
      minLevel = parsed as CharacterLevel;
      continue;
    }

    const ability =
      /^(?<first>[A-Z][a-z]+) or (?<second>[A-Z][a-z]+) (?<minimum>\d+)\+$/u.exec(
        part,
      )?.groups;
    if (ability !== undefined) {
      const first = ABILITY_BY_PRINTED_NAME.get(ability.first as string);
      const second = ABILITY_BY_PRINTED_NAME.get(ability.second as string);
      const minimum = Number(ability.minimum);
      if (
        first === undefined ||
        second === undefined ||
        !Number.isSafeInteger(minimum) ||
        minimum < 1 ||
        minimum > 30
      ) {
        throw new SrdFeatError(
          `${featName} has an unreadable ability prerequisite ${JSON.stringify(part)}.`,
        );
      }
      prerequisites.push({
        kind: 'ability_score',
        abilities: [first, second],
        minimum,
      });
      continue;
    }

    if (part === 'Fighting Style Feature') {
      prerequisites.push({ kind: 'feature', feature: 'fighting_style' });
      continue;
    }
    if (part === 'Spellcasting Feature') {
      prerequisites.push({ kind: 'feature', feature: 'spellcasting' });
      continue;
    }

    throw new SrdFeatError(
      `${featName} has an unrecognised prerequisite ${JSON.stringify(part)}.`,
    );
  }
  return { min_level: minLevel, prerequisites };
}

function abilityPoints(
  featName: string,
  category: SrdFeatCategory,
  benefit: string,
): FeatAbilityPoints {
  let points: FeatAbilityPoints = 0;
  if (
    /^Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1\./u.test(
      benefit,
    )
  ) {
    points = 2;
  } else if (
    /(?:^|\n\n)Ability Score Increase\. Increase [^\n]+ by 1, to a maximum of (?:20|30)\./u.test(
      benefit,
    )
  ) {
    points = 1;
  }

  const mustCarryPoints = category === 'General' || category === 'Epic Boon';
  if ((mustCarryPoints && points === 0) || (!mustCarryPoints && points !== 0)) {
    throw new SrdFeatError(
      `${featName} has an ability-score benefit inconsistent with its ${category} category.`,
    );
  }
  return points;
}

function abilityIncreaseOptions(
  featName: string,
  points: FeatAbilityPoints,
  benefit: string,
): {
  readonly abilities: AbilityIncreaseAbilities | null;
  readonly maximum: number | null;
} {
  if (points === 0) {
    return { abilities: null, maximum: null };
  }
  if (
    /^Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1\. This feat can’t increase an ability score above 20\./u.test(
      benefit,
    )
  ) {
    return { abilities: 'any', maximum: 20 };
  }

  const increase =
    /(?:^|\n\n)Ability Score Increase\. Increase (?<choice>one ability score of your choice|your [^.]+ score) by 1, to a maximum of (?<maximum>20|30)\./u.exec(
      benefit,
    )?.groups;
  if (increase === undefined) {
    throw new SrdFeatError(
      `${featName} has points but no readable ability options and cap.`,
    );
  }
  const maximum = Number(increase.maximum);
  if (increase.choice === 'one ability score of your choice') {
    return { abilities: 'any', maximum };
  }

  const printed = increase.choice
    ?.replace(/^your /u, '')
    .replace(/ score$/u, '');
  if (printed === undefined) {
    throw new SrdFeatError(`${featName} has unreadable ability options.`);
  }
  const selected = printed
    .replace(/, or /u, ', ')
    .replace(/ or /u, ', ')
    .split(',')
    .map((name) => ABILITY_BY_PRINTED_NAME.get(name.trim()));
  if (
    selected.length === 0 ||
    selected.some((ability) => ability === undefined)
  ) {
    throw new SrdFeatError(
      `${featName} names an unsupported ability increase option.`,
    );
  }
  return {
    abilities: selected as readonly Ability[],
    maximum,
  };
}

function magicInitiateRules(
  benefit: string,
): readonly GrantRuleObject[] | null {
  if (
    !benefit.includes(
      'Two Cantrips. You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list.',
    ) ||
    !benefit.includes(
      'Level 1 Spell. Choose a level 1 spell from the same list you selected for this feat’s cantrips.',
    )
  ) {
    return null;
  }
  return [
    {
      kind: 'choice_from_list',
      rule_key: 'magic-initiate-cantrips',
      count: 2,
      bucket: 'cantrip_known',
      list: '$config.chosen_list',
      level_min: 0,
      level_max: 0,
      with_slots: false,
    },
    {
      kind: 'choice_from_list',
      rule_key: 'magic-initiate-level-one',
      count: 1,
      bucket: 'known',
      list: '$config.chosen_list',
      level_min: 1,
      level_max: 1,
      with_slots: true,
      free_cast: {
        uses: 1,
        recovery: 'long_rest',
        pool_scope: 'per_spell',
      },
    },
  ].map((rule) => GrantRule.fromObject(rule).toObject());
}

function grantRules(benefit: string): readonly GrantRuleObject[] {
  const spellRules = magicInitiateRules(benefit);
  if (spellRules !== null) {
    return spellRules;
  }

  const proficiencyCount =
    /proficiency in any combination of (?<count>three) skills or tools of your choice\./u.exec(
      benefit,
    )?.groups?.count;
  if (proficiencyCount !== undefined) {
    return [
      GrantRule.fromObject({
        kind: 'skill_proficiency',
        rule_key: 'skilled-proficiencies',
        count: proficiencyCount === 'three' ? 3 : 0,
        allows_tool_instead: true,
      }).toObject(),
    ];
  }

  return [];
}

export function parseSrdFeatDefinitions(
  extract: string = featsExtract,
): SrdFeatDefinition[] {
  const feats: SrdFeatDefinition[] = [];
  const categoryCounts: Record<SrdFeatCategory, number> = {
    Origin: 0,
    General: 0,
    'Fighting Style': 0,
    'Epic Boon': 0,
  };

  for (const match of extract.matchAll(FEAT_PATTERN)) {
    const name = match.groups?.name?.trim();
    const category = match.groups?.category;
    const benefit = match.groups?.benefit?.trim();
    if (
      name === undefined ||
      benefit === undefined ||
      !isEnumValue(
        ['Origin', 'General', 'Fighting Style', 'Epic Boon'] as const,
        category,
      )
    ) {
      throw new SrdFeatError('the extract has an unrecognised feat section.');
    }
    const parsedPrerequisites = parsePrintedPrerequisites(
      name,
      match.groups?.prerequisites,
    );
    categoryCounts[category] += 1;
    const contentKey = `${BUNDLED_FEAT_RULES_EDITION}:feat:${slug(name)}`;
    if (!isBundledFeatContentKey(contentKey)) {
      throw new SrdFeatError(
        `${name} produced an unregistered bundled content key ${contentKey}.`,
      );
    }
    const points = abilityPoints(name, category, benefit);
    const increase = abilityIncreaseOptions(name, points, benefit);
    feats.push({
      content_key: contentKey as BundledFeatContentKey & ContentKey,
      name,
      catalog_layer: 'bundled',
      source_category: category,
      grouping: GROUPING_BY_SOURCE_CATEGORY[category],
      min_level: parsedPrerequisites.min_level,
      ability_points: points,
      ability_increase_abilities: increase.abilities,
      ability_increase_maximum: increase.maximum,
      repeatable: /(?:^|\n\n)Repeatable\./u.test(benefit),
      prerequisites: parsedPrerequisites.prerequisites,
      grant_rules: grantRules(benefit),
      notes: benefit,
    });
  }

  for (const [category, expected] of Object.entries(
    EXPECTED_CATEGORY_COUNTS,
  ) as [SrdFeatCategory, number][]) {
    if (categoryCounts[category] !== expected) {
      throw new SrdFeatError(
        `expected ${String(expected)} ${category} feats, parsed ${String(categoryCounts[category])}.`,
      );
    }
  }
  if (
    feats.length !== 17 ||
    new Set(feats.map((feat) => feat.content_key)).size !== feats.length
  ) {
    throw new SrdFeatError(
      `expected 17 uniquely-keyed feats, parsed ${String(feats.length)}.`,
    );
  }
  return feats;
}

export function bundledFeatDefinitions(): readonly SrdFeatDefinition[] {
  return parseSrdFeatDefinitions();
}

function persistedValues(feat: SrdFeatDefinition): {
  readonly content_key: string;
  readonly name: string;
  readonly rules_edition: string;
  readonly category: string | null;
  readonly min_level: number | null;
  readonly ability_points: number;
  readonly ability_increase_abilities: string | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: number;
  readonly prerequisites: string | null;
  readonly grant_rules: string;
  readonly notes: string;
} {
  return {
    content_key: feat.content_key,
    name: feat.name,
    rules_edition: BUNDLED_FEAT_RULES_EDITION,
    category: feat.grouping,
    min_level: feat.min_level,
    ability_points: feat.ability_points,
    ability_increase_abilities:
      feat.ability_increase_abilities === null
        ? null
        : JSON.stringify(feat.ability_increase_abilities),
    ability_increase_maximum: feat.ability_increase_maximum,
    repeatable: feat.repeatable ? 1 : 0,
    prerequisites:
      feat.prerequisites.length === 0
        ? null
        : JSON.stringify(feat.prerequisites),
    grant_rules: JSON.stringify(feat.grant_rules),
    notes: feat.notes,
  };
}

function storedFeatMatches(
  db: DatabaseContext,
  feat: SrdFeatDefinition,
): boolean {
  const expected = persistedValues(feat);
  const actual = db.oneRaw(
    `SELECT content_key, name, rules_edition, category, min_level,
            ability_points, ability_increase_abilities,
            ability_increase_maximum, repeatable, prerequisites, grant_rules,
            notes
     FROM feat_definitions WHERE content_key = ?`,
    [feat.content_key],
  );
  return (
    actual !== null &&
    Object.entries(expected).every(
      ([column, value]) => actual[column] === value,
    )
  );
}

export function hasBundledFeatContent(db: DatabaseContext): boolean {
  return bundledFeatDefinitions().every((feat) =>
    storedFeatMatches(db, feat),
  );
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledFeatContent(db: DatabaseContext): boolean {
  if (hasBundledFeatContent(db)) {
    return false;
  }
  return seedFeatContent(db);
}

/**
 * Seeds or repairs the bundled feat rows.
 *
 * Calling this directly is idempotent too: a healthy catalog performs no
 * writes, preserving ids and timestamps as well as values.
 */
export function seedFeatContent(db: DatabaseContext): boolean {
  if (hasBundledFeatContent(db)) {
    return false;
  }
  const timestamp = new Date().toISOString();
  return db.transaction(() => {
    let wrote = false;
    for (const feat of bundledFeatDefinitions()) {
      if (storedFeatMatches(db, feat)) {
        continue;
      }
      const nameHolder = db.scalar<string>(
        `SELECT content_key FROM feat_definitions
         WHERE name = ? AND rules_edition = ?`,
        [feat.name, BUNDLED_FEAT_RULES_EDITION],
      );
      // User-authored content wins its name/edition slot. The bundled key
      // cannot be inserted without deleting or renaming that row, and boot
      // seeding has no authority to do either.
      if (nameHolder !== null && nameHolder !== feat.content_key) {
        continue;
      }
      ensureBundledStableContentIdentity(db, {
        kind: 'feat',
        contentKey: feat.content_key,
        normalizedName: normalizeContentIdentityName(feat.name),
      });

      const values = persistedValues(feat);
      const row = {
        id: 1,
        ...values,
        created_at: timestamp,
        updated_at: timestamp,
      };
      const contractError = rowContractError(
        'feat_definitions',
        row,
        `Bundled feat ${feat.name}`,
      );
      if (contractError !== null) {
        throw new SrdFeatError(contractError);
      }

      const columns = [
        ...Object.keys(values),
        'created_at',
        'updated_at',
      ];
      const bind: BindableValue[] = [
        ...Object.values(values),
        timestamp,
        timestamp,
      ];
      db.exec(
        `INSERT INTO feat_definitions (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})
         ON CONFLICT(content_key) DO UPDATE SET
           name = excluded.name,
           rules_edition = excluded.rules_edition,
           category = excluded.category,
           min_level = excluded.min_level,
           ability_points = excluded.ability_points,
           ability_increase_abilities = excluded.ability_increase_abilities,
           ability_increase_maximum = excluded.ability_increase_maximum,
           repeatable = excluded.repeatable,
           prerequisites = excluded.prerequisites,
           grant_rules = excluded.grant_rules,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
        bind,
      );
      wrote = true;
    }
    return wrote;
  });
}
