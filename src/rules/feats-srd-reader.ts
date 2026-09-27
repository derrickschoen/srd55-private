/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Feat rows are parsed from the complete Feat Descriptions extract. The parser
 * keeps the printed benefit as text and promotes only the mechanics the rules
 * engine consumes or searches: spell choices and skill proficiencies.
 * Fighting Style benefits remain sourced text because today's predicates
 * cannot express their weapon/equipment conditions safely. Level,
 * ability-score points, choices and caps have dedicated columns.
 *
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. This module takes the extract
 * as an argument and imports no SRD text. `npm run srd:artifacts` commits its
 * result as `generated/feats-srd.ts`, which `feats-srd.ts` seeds from; the SRD
 * artifact drift test re-parses the extract and fails on any byte difference.
 */
import type {
  HasContentKey,
  HasName,
  HasProvenance,
} from '../catalog/content-contract-fragments';
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

/**
 * WHAT THE BUILD RECORDS for one feat: every parsed column, with the content
 * key as one of the closed set of printed keys. A bare literal cannot carry the
 * `ContentKey` brand, so the runtime mints it (`bundledFeatContentKey`) and
 * hands out {@link SrdFeatDefinition}.
 */
export interface SrdFeatDefinitionRecord extends HasName {
  readonly content_key: BundledFeatContentKey;
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

export type SrdFeatDefinition = HasContentKey &
  HasProvenance &
  Omit<SrdFeatDefinitionRecord, 'content_key'> & {
    readonly content_key: BundledFeatContentKey & ContentKey;
  };

/**
 * The runtime's constructor for a feat key the build recorded as text: one of
 * the closed set of bundled feat keys, minted as a `ContentKey`.
 */
export function bundledFeatContentKey(
  value: string,
): BundledFeatContentKey & ContentKey {
  if (!isBundledFeatContentKey(value)) {
    throw new SrdFeatError(`${value} is not a registered bundled feat content key.`);
  }
  return value as BundledFeatContentKey & ContentKey;
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
  extract: string,
): SrdFeatDefinitionRecord[] {
  const feats: SrdFeatDefinitionRecord[] = [];
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
      content_key: contentKey,
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
