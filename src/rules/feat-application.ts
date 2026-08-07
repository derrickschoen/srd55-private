/**
 * Exhaustive LU-0 projection for the complete bundled feat corpus.
 *
 * This module is deliberately extract-free. The SRD parser supplies sourced
 * definitions; browser/node fixtures may import these types and pure functions
 * without acquiring a Vite `?raw` edge.
 */
import {
  MAGIC_INITIATE_ABILITIES,
  MAGIC_INITIATE_FEAT_CONTENT_KEY,
  SKILLED_FEAT_CONTENT_KEY,
} from '../builder/background-choices';
import { MAGIC_INITIATE_LISTS } from '../domain/background-feat-name';
import type {
  AbilityIncreaseAbilities,
  FeatApplicationPlan,
  FeatDefinitionForApplication,
  FeatEligibilityResult,
  FeatSpellReplacementEntitlement,
  FeatTextBenefit,
  FeatTextGap,
  FeatUnmetReason,
  FeatUnprovableReason,
  ProjectedFeatCharacter,
} from '../builder/level-up-wizard';
import type { LevelUpAbilityIncrease } from '../domain/command-contracts';
import {
  abilities,
  isEnumValue,
  skills,
  type Ability,
} from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { GrantRuleKey } from '../domain/ids';
import type { JsonObject } from '../domain/models';

export const BUNDLED_FEAT_CONTENT_KEYS = [
  '2024:feat:alert',
  '2024:feat:magic-initiate',
  '2024:feat:savage-attacker',
  '2024:feat:skilled',
  '2024:feat:ability-score-improvement',
  '2024:feat:grappler',
  '2024:feat:archery',
  '2024:feat:defense',
  '2024:feat:great-weapon-fighting',
  '2024:feat:two-weapon-fighting',
  '2024:feat:boon-of-combat-prowess',
  '2024:feat:boon-of-dimensional-travel',
  '2024:feat:boon-of-fate',
  '2024:feat:boon-of-irresistible-offense',
  '2024:feat:boon-of-spell-recall',
  '2024:feat:boon-of-the-night-spirit',
  '2024:feat:boon-of-truesight',
] as const;

export type BundledFeatContentKey =
  (typeof BUNDLED_FEAT_CONTENT_KEYS)[number];

export function isBundledFeatContentKey(
  value: string,
): value is BundledFeatContentKey {
  return (BUNDLED_FEAT_CONTENT_KEYS as readonly string[]).includes(value);
}

export interface FeatApplicationInput {
  readonly definition: FeatDefinitionForApplication;
  readonly character: ProjectedFeatCharacter;
  readonly config: JsonObject;
  readonly ability_increases: readonly LevelUpAbilityIncrease[];
}

type CoverageKind = 'effect' | 'grant_rule' | 'text';

export interface FeatBenefitCoverage {
  readonly benefit_key: string;
  readonly classifications: readonly CoverageKind[];
}

interface SourceBenefit {
  readonly benefit_key: string;
  readonly label: string;
  readonly text: string;
}

interface CoveragePlan {
  readonly effect: readonly string[];
  readonly grant_rule: readonly string[];
  readonly text: Readonly<Record<string, FeatTextGap>>;
  readonly undetermined: FeatApplicationPlan['undetermined_numbers'];
}

export class FeatApplicationError extends Error {
  constructor(message: string) {
    super(`Feat application: ${message}`);
    this.name = 'FeatApplicationError';
  }
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceBenefits(definition: FeatDefinitionForApplication): SourceBenefit[] {
  const benefits: SourceBenefit[] = [];
  for (const paragraph of definition.notes.split(/\n\n+/u)) {
    const trimmed = paragraph.trim();
    if (
      trimmed === '' ||
      trimmed === 'You gain the following benefits.' ||
      trimmed.startsWith('Repeatable.')
    ) {
      continue;
    }
    const heading = /^(?<label>[^.\n]{1,40})\.\s+[\s\S]+$/u.exec(
      trimmed,
    )?.groups?.label;
    const headingWords = heading?.split(' ') ?? [];
    const label =
      heading !== undefined &&
      headingWords.every(
        (word) =>
          /^(?:and|of|with)$/u.test(word) ||
          /^[A-Z0-9][A-Za-z0-9’'-]*$/u.test(word),
      )
        ? heading
        : definition.name;
    benefits.push({
      benefit_key: slug(label),
      label,
      text: trimmed,
    });
  }
  return benefits;
}

/**
 * The hand-reviewed switch from plan §0. No default arm: adding an eighteenth
 * bundled key is a compile error until its source-to-vocabulary decision is
 * explicit.
 */
function coverageFor(key: BundledFeatContentKey): CoveragePlan {
  switch (key) {
    case '2024:feat:alert':
      return {
        effect: [],
        grant_rule: [],
        text: {
          'initiative-proficiency': 'initiative_proficiency_unmodelled',
          'initiative-swap': 'initiative_swap_text_only',
        },
        undetermined: ['initiative'],
      };
    case '2024:feat:magic-initiate':
      return {
        effect: [],
        grant_rule: ['two-cantrips', 'level-1-spell'],
        text: { 'spell-change': 'spell_change_unmodelled' },
        undetermined: [],
      };
    case '2024:feat:savage-attacker':
      return {
        effect: [],
        grant_rule: [],
        text: { 'savage-attacker': 'weapon_reroll_text_only' },
        undetermined: [],
      };
    case '2024:feat:skilled':
      return {
        effect: [],
        grant_rule: ['skilled'],
        text: { skilled: 'tool_alternative_unmodelled' },
        undetermined: [],
      };
    case '2024:feat:ability-score-improvement':
      return {
        effect: ['ability-score-improvement'],
        grant_rule: [],
        text: {},
        undetermined: [],
      };
    case '2024:feat:grappler':
      return {
        effect: ['ability-score-increase'],
        grant_rule: [],
        text: {
          'punch-and-grab': 'grapple_benefit_text_only',
          'attack-advantage': 'grapple_benefit_text_only',
          'fast-wrestler': 'grapple_benefit_text_only',
        },
        undetermined: [],
      };
    case '2024:feat:archery':
      return {
        effect: [],
        grant_rule: [],
        text: { archery: 'ranged_weapon_predicate_unmodelled' },
        undetermined: ['ranged_weapon_attack_bonus'],
      };
    case '2024:feat:defense':
      return {
        effect: [],
        grant_rule: [],
        text: { defense: 'armor_worn_predicate_unmodelled' },
        undetermined: ['armor_class'],
      };
    case '2024:feat:great-weapon-fighting':
      return {
        effect: [],
        grant_rule: [],
        text: {
          'great-weapon-fighting': 'damage_die_replacement_unmodelled',
        },
        undetermined: [],
      };
    case '2024:feat:two-weapon-fighting':
      return {
        effect: [],
        grant_rule: [],
        text: {
          'two-weapon-fighting': 'light_weapon_attack_predicate_unmodelled',
        },
        undetermined: [],
      };
    case '2024:feat:boon-of-combat-prowess':
      return boonCoverage('peerless-aim');
    case '2024:feat:boon-of-dimensional-travel':
      return boonCoverage('blink-steps');
    case '2024:feat:boon-of-fate':
      return boonCoverage('improve-fate');
    case '2024:feat:boon-of-irresistible-offense':
      return {
        effect: ['ability-score-increase'],
        grant_rule: [],
        text: {
          'overcome-defenses': 'epic_boon_benefit_text_only',
          'overwhelming-strike': 'epic_boon_benefit_text_only',
        },
        undetermined: [],
      };
    case '2024:feat:boon-of-spell-recall':
      return boonCoverage('free-casting');
    case '2024:feat:boon-of-the-night-spirit':
      return {
        effect: ['ability-score-increase'],
        grant_rule: [],
        text: {
          'merge-with-shadows': 'epic_boon_benefit_text_only',
          'shadowy-form': 'conditional_resistance_unmodelled',
        },
        undetermined: [],
      };
    case '2024:feat:boon-of-truesight':
      return {
        effect: ['ability-score-increase'],
        grant_rule: [],
        text: { truesight: 'senses_unmodelled' },
        undetermined: [],
      };
  }
}

function boonCoverage(textKey: string): CoveragePlan {
  return {
    effect: ['ability-score-increase'],
    grant_rule: [],
    text: { [textKey]: 'epic_boon_benefit_text_only' },
    undetermined: [],
  };
}

function chosenList(config: JsonObject): string | null {
  return typeof config.chosen_list === 'string'
    ? config.chosen_list
    : null;
}

export function evaluateFeatEligibility(
  definition: FeatDefinitionForApplication,
  character: ProjectedFeatCharacter,
  selectedConfig?: JsonObject,
): FeatEligibilityResult {
  const unmet: FeatUnmetReason[] = [];
  const unprovable: FeatUnprovableReason[] = [];

  if (
    definition.min_level !== null &&
    character.total_level < definition.min_level
  ) {
    unmet.push({
      kind: 'minimum_level',
      minimum: definition.min_level,
      actual: character.total_level,
    });
  }

  for (const prerequisite of definition.prerequisites) {
    if (prerequisite.kind === 'ability_score') {
      const actual = prerequisite.abilities.map(
        (ability) => character.ability_scores[ability],
      );
      if (
        actual.some(
          (score) => score !== null && score >= prerequisite.minimum,
        )
      ) {
        continue;
      }
      if (actual.some((score) => score === null)) {
        unprovable.push({
          kind: 'ability_score_unknown',
          abilities: prerequisite.abilities,
          minimum: prerequisite.minimum,
        });
      } else {
        unmet.push({
          kind: 'ability_score_minimum',
          abilities: prerequisite.abilities,
          minimum: prerequisite.minimum,
          actual,
        });
      }
      continue;
    }

    const evidence = character.feature_evidence[prerequisite.feature];
    if (evidence === 'absent') {
      unmet.push({
        kind: 'feature_missing',
        feature: prerequisite.feature,
      });
    } else if (evidence === 'unprovable') {
      unprovable.push({
        kind: 'feature_unprovable',
        feature: prerequisite.feature,
      });
    }
  }

  const active = character.active_feats.filter(
    (instance) => instance.feat_content_key === definition.content_key,
  );
  if (active.length > 0 && !definition.repeatable) {
    unmet.push({ kind: 'already_taken' });
  }

  if (
    definition.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY &&
    active.length > 0
  ) {
    const used = new Set<string>();
    let unknown = false;
    for (const instance of active) {
      const list = chosenList(instance.config);
      if (
        list === null ||
        !(MAGIC_INITIATE_LISTS as readonly string[]).includes(list)
      ) {
        unknown = true;
      } else {
        used.add(list);
      }
    }
    const selected = selectedConfig === undefined
      ? null
      : chosenList(selectedConfig);
    if (selected !== null && used.has(selected)) {
      unmet.push({
        kind: 'repeat_configuration_already_used',
        field: 'chosen_list',
        value: selected,
      });
    } else if (
      selected === null &&
      used.size === MAGIC_INITIATE_LISTS.length
    ) {
      unmet.push({
        kind: 'repeat_configuration_unavailable',
        field: 'chosen_list',
      });
    } else if (unknown) {
      unprovable.push({
        kind: 'repeat_configuration_unprovable',
        field: 'chosen_list',
      });
    }
  }

  if (unmet.length > 0) {
    return {
      status: 'unmet',
      reasons: Object.freeze([...unmet, ...unprovable]),
    };
  }
  if (unprovable.length > 0) {
    return {
      status: 'unprovable',
      reasons: Object.freeze(unprovable),
    };
  }
  return { status: 'qualified', reasons: [] };
}

function exactKeys(config: JsonObject, expected: readonly string[]): boolean {
  const actual = Object.keys(config).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

function validateConfig(
  definition: FeatDefinitionForApplication,
  config: JsonObject,
): void {
  if (definition.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY) {
    if (
      !exactKeys(config, ['chosen_list', 'spellcasting_ability']) ||
      typeof config.chosen_list !== 'string' ||
      !(MAGIC_INITIATE_LISTS as readonly string[]).includes(
        config.chosen_list,
      ) ||
      typeof config.spellcasting_ability !== 'string' ||
      !(MAGIC_INITIATE_ABILITIES as readonly string[]).includes(
        config.spellcasting_ability,
      )
    ) {
      throw new FeatApplicationError(
        'Magic Initiate requires one supported list and casting ability.',
      );
    }
    return;
  }

  if (definition.content_key === SKILLED_FEAT_CONTENT_KEY) {
    if (!exactKeys(config, ['selected_skills'])) {
      throw new FeatApplicationError(
        'Skilled config must contain exactly selected_skills.',
      );
    }
    const selected = config.selected_skills;
    if (
      !Array.isArray(selected) ||
      selected.length > 3 ||
      !selected.every(
        (skill) =>
          skill === null ||
          (typeof skill === 'string' && isEnumValue(skills, skill)),
      ) ||
      new Set(selected.filter((skill) => skill !== null)).size !==
        selected.filter((skill) => skill !== null).length
    ) {
      throw new FeatApplicationError(
        'Skilled selections must be up to three distinct skills or nulls.',
      );
    }
    return;
  }

  if (!exactKeys(config, [])) {
    throw new FeatApplicationError(
      `${definition.name} does not accept feat configuration.`,
    );
  }
}

function allowedAbility(
  options: AbilityIncreaseAbilities,
  ability: Ability,
): boolean {
  return options === 'any' || options.includes(ability);
}

function abilityEffects(
  input: FeatApplicationInput,
): FeatApplicationPlan['effects'] {
  const {
    ability_points: points,
    ability_increase_abilities: options,
    ability_increase_maximum: maximum,
  } = input.definition;
  const increases = input.ability_increases;

  if (points === 0) {
    if (increases.length !== 0) {
      throw new FeatApplicationError(
        `${input.definition.name} grants no ability increase.`,
      );
    }
    return [];
  }
  if (options === null || maximum === null) {
    throw new FeatApplicationError(
      `${input.definition.name} ability options or maximum are unprovable.`,
    );
  }
  const legalShape =
    (points === 1 &&
      increases.length === 1 &&
      increases[0]?.amount === 1) ||
    (points === 2 &&
      ((increases.length === 1 && increases[0]?.amount === 2) ||
        (increases.length === 2 &&
          increases.every((increase) => increase.amount === 1))));
  if (!legalShape) {
    throw new FeatApplicationError(
      `${input.definition.name} ability increases do not spend its point budget.`,
    );
  }
  const selected = new Set<Ability>();
  return increases.map((increase) => {
    if (
      selected.has(increase.ability) ||
      !allowedAbility(options, increase.ability)
    ) {
      throw new FeatApplicationError(
        `${input.definition.name} has an invalid or repeated ability choice.`,
      );
    }
    selected.add(increase.ability);
    const current = input.character.ability_scores[increase.ability];
    if (current === null) {
      throw new FeatApplicationError(
        `${input.definition.name} cannot prove the selected ability score.`,
      );
    }
    if (current + increase.amount > maximum) {
      throw new FeatApplicationError(
        `${input.definition.name} would raise ${increase.ability} above ${String(maximum)}.`,
      );
    }
    return {
      effect_kind: 'ability_increase' as const,
      ability: increase.ability,
      amount: increase.amount,
      maximum,
      label: `${input.definition.name}: Ability Score Increase`,
      notes: null,
    };
  });
}

function checkedBenefits(
  definition: FeatDefinitionForApplication,
): {
  readonly coverage: CoveragePlan;
  readonly benefits: readonly SourceBenefit[];
} {
  const benefits = sourceBenefits(definition);
  if (!isBundledFeatContentKey(definition.content_key)) {
    return {
      coverage: {
        effect: definition.ability_points > 0 ? ['ability-score-increase'] : [],
        grant_rule: [],
        text: Object.fromEntries(
          benefits.map((benefit) => [
            benefit.benefit_key,
            'homebrew_benefit_text_only' as const,
          ]),
        ),
        undetermined: [],
      },
      benefits,
    };
  }
  const coverage = coverageFor(definition.content_key);
  const known = new Set([
    ...coverage.effect,
    ...coverage.grant_rule,
    ...Object.keys(coverage.text),
  ]);
  const actual = new Set(benefits.map((benefit) => benefit.benefit_key));
  if (
    known.size !== actual.size ||
    [...known].some((key) => !actual.has(key))
  ) {
    throw new FeatApplicationError(
      `${definition.name} source benefits no longer match its exhaustive coverage decision.`,
    );
  }
  return { coverage, benefits };
}

export function featBenefitCoverage(
  definition: FeatDefinitionForApplication,
): readonly FeatBenefitCoverage[] {
  const { coverage, benefits } = checkedBenefits(definition);
  return benefits.map((benefit) => {
    const classifications: CoverageKind[] = [];
    if (coverage.effect.includes(benefit.benefit_key)) {
      classifications.push('effect');
    }
    if (coverage.grant_rule.includes(benefit.benefit_key)) {
      classifications.push('grant_rule');
    }
    if (Object.hasOwn(coverage.text, benefit.benefit_key)) {
      classifications.push('text');
    }
    return {
      benefit_key: benefit.benefit_key,
      classifications: Object.freeze(classifications),
    };
  });
}

function textBenefits(
  coverage: CoveragePlan,
  benefits: readonly SourceBenefit[],
): readonly FeatTextBenefit[] {
  return benefits.flatMap((benefit) => {
    const gap = coverage.text[benefit.benefit_key];
    return gap === undefined ? [] : [{ ...benefit, gap }];
  });
}

function expectedGrantRuleKinds(
  key: BundledFeatContentKey,
): readonly string[] {
  switch (key) {
    case '2024:feat:magic-initiate':
      return ['choice_from_list', 'choice_from_list'];
    case '2024:feat:skilled':
      return ['skill_proficiency'];
    case '2024:feat:alert':
    case '2024:feat:savage-attacker':
    case '2024:feat:ability-score-improvement':
    case '2024:feat:grappler':
    case '2024:feat:archery':
    case '2024:feat:defense':
    case '2024:feat:great-weapon-fighting':
    case '2024:feat:two-weapon-fighting':
    case '2024:feat:boon-of-combat-prowess':
    case '2024:feat:boon-of-dimensional-travel':
    case '2024:feat:boon-of-fate':
    case '2024:feat:boon-of-irresistible-offense':
    case '2024:feat:boon-of-spell-recall':
    case '2024:feat:boon-of-the-night-spirit':
    case '2024:feat:boon-of-truesight':
      return [];
  }
}

function checkedGrantRules(
  definition: FeatApplicationInput['definition'],
): FeatApplicationPlan['grant_rules'] {
  if (!isBundledFeatContentKey(definition.content_key)) {
    return definition.grant_rules;
  }
  const expected = expectedGrantRuleKinds(definition.content_key);
  const actual = definition.grant_rules.map((rule) => rule.kind);
  if (
    actual.length !== expected.length ||
    actual.some((kind, index) => kind !== expected[index])
  ) {
    throw new FeatApplicationError(
      `${definition.name} grant rules do not match LU-0's safe vocabulary mapping.`,
    );
  }
  return definition.grant_rules;
}

export function buildFeatApplicationPlan(
  input: FeatApplicationInput,
): FeatApplicationPlan {
  validateConfig(input.definition, input.config);
  const eligibility = evaluateFeatEligibility(
    input.definition,
    input.character,
    input.config,
  );
  const { coverage, benefits } = checkedBenefits(input.definition);
  const effects = abilityEffects(input);
  const grantRules = checkedGrantRules(input.definition);
  const expectsAbilityEffect = input.definition.ability_points > 0;
  if (
    coverage.effect.length !== (expectsAbilityEffect ? 1 : 0) ||
    (effects.length > 0) !== expectsAbilityEffect
  ) {
    throw new FeatApplicationError(
      `${input.definition.name} effect coverage disagrees with its typed ability point model.`,
    );
  }

  return Object.freeze({
    feat_content_key: input.definition.content_key,
    eligibility,
    config: input.config,
    effects: Object.freeze([...effects]),
    grant_rules: Object.freeze([...grantRules]),
    text_benefits: Object.freeze([
      ...textBenefits(coverage, benefits),
    ]),
    undetermined_numbers: Object.freeze([...coverage.undetermined]),
  });
}

/**
 * Magic Initiate's sourced Spell Change entitlement.
 *
 * It is not a third grant rule and creates no slot by itself. GF-1's shared
 * replacement service consumes this normalized same-list/same-level policy
 * for an existing feat source after it has a durable source-instance address.
 */
export function featSpellReplacementEntitlement(
  definition: FeatDefinitionForApplication,
): FeatSpellReplacementEntitlement | null {
  if (!isBundledFeatContentKey(definition.content_key)) return null;
  const key: BundledFeatContentKey = definition.content_key;
  switch (key) {
    case '2024:feat:magic-initiate': {
      const benefit = sourceBenefits(definition).find(
        (entry) => entry.benefit_key === 'spell-change',
      );
      if (benefit === undefined) {
        throw new FeatApplicationError(
          'Magic Initiate is missing its sourced Spell Change benefit.',
        );
      }
      return Object.freeze({
        feat_content_key: definition.content_key,
        trigger: 'character_level',
        rule_keys: Object.freeze([
          'magic-initiate-cantrips' as GrantRuleKey,
          'magic-initiate-level-one' as GrantRuleKey,
        ]),
        replacement_constraint: 'same_list_and_level',
        list_config_key: 'chosen_list',
      });
    }
    case '2024:feat:alert':
    case '2024:feat:savage-attacker':
    case '2024:feat:skilled':
    case '2024:feat:ability-score-improvement':
    case '2024:feat:grappler':
    case '2024:feat:archery':
    case '2024:feat:defense':
    case '2024:feat:great-weapon-fighting':
    case '2024:feat:two-weapon-fighting':
    case '2024:feat:boon-of-combat-prowess':
    case '2024:feat:boon-of-dimensional-travel':
    case '2024:feat:boon-of-fate':
    case '2024:feat:boon-of-irresistible-offense':
    case '2024:feat:boon-of-spell-recall':
    case '2024:feat:boon-of-the-night-spirit':
    case '2024:feat:boon-of-truesight':
      return null;
  }
}

/** Strict decoder used by catalog reads and tests at the untrusted row edge. */
export function decodeAbilityIncreaseAbilities(
  value: unknown,
): AbilityIncreaseAbilities | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError('Feat ability options must be stored as JSON text.');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new TypeError('Feat ability options must be valid JSON.');
  }
  if (decoded === 'any') {
    return 'any';
  }
  if (
    !Array.isArray(decoded) ||
    decoded.length === 0 ||
    !decoded.every(
      (ability) =>
        typeof ability === 'string' && isEnumValue(abilities, ability),
    ) ||
    new Set(decoded).size !== decoded.length
  ) {
    throw new TypeError(
      'Feat ability options must be "any" or a distinct non-empty ability list.',
    );
  }
  return Object.freeze([...decoded]);
}
