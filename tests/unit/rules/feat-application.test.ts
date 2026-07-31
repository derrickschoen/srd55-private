import { describe, expect, it } from 'vitest';
import type {
  FeatDefinitionForApplication,
  FeatFeatureEvidence,
  ProjectedFeatCharacter,
} from '../../../src/builder/level-up-wizard';
import { GrantRulePlanner } from '../../../src/grants/grant-rule-planner';
import type { Ability } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import type { JsonObject } from '../../../src/domain/models';
import {
  buildFeatApplicationPlan,
  decodeAbilityIncreaseAbilities,
  evaluateFeatEligibility,
  featBenefitCoverage,
  featSpellReplacementEntitlement,
  type BundledFeatContentKey,
} from '../../../src/rules/feat-application';
import {
  bundledFeatDefinitions,
  type SrdFeatDefinition,
} from '../../../src/rules/feats-srd';

const PRESENT_FEATURES: FeatFeatureEvidence = {
  fighting_style: 'present',
  spellcasting: 'present',
};

function character(
  values: Partial<ProjectedFeatCharacter> = {},
): ProjectedFeatCharacter {
  return {
    total_level: 19,
    ability_scores: {
      strength: 14,
      dexterity: 14,
      constitution: 14,
      intelligence: 14,
      wisdom: 14,
      charisma: 14,
    },
    feature_evidence: PRESENT_FEATURES,
    active_feats: [],
    ...values,
  };
}

function definition(name: string): SrdFeatDefinition {
  const found = bundledFeatDefinitions().find((feat) => feat.name === name);
  if (found === undefined) {
    throw new Error(`Missing bundled feat fixture ${name}.`);
  }
  return found;
}

function selectedAbility(
  feat: SrdFeatDefinition,
): Ability {
  const options = feat.ability_increase_abilities;
  return options === null || options === 'any'
    ? 'strength'
    : (options[0] as Ability);
}

function configFor(feat: SrdFeatDefinition): JsonObject {
  if (feat.name === 'Magic Initiate') {
    return {
      chosen_list: 'Wizard',
      spellcasting_ability: 'intelligence',
    };
  }
  if (feat.name === 'Skilled') {
    return { selected_skills: ['arcana', null, null] };
  }
  return {};
}

function increasesFor(feat: SrdFeatDefinition) {
  if (feat.ability_points === 0) {
    return [];
  }
  return [
    {
      ability: selectedAbility(feat),
      amount: feat.ability_points,
    },
  ];
}

const APPLICATION_ORACLE = {
  Alert: {
    coverage: {
      'initiative-proficiency': ['text'],
      'initiative-swap': ['text'],
    },
    effects: [],
    grants: [],
    gaps: [
      'initiative_proficiency_unmodelled',
      'initiative_swap_text_only',
    ],
    undetermined: ['initiative'],
  },
  'Magic Initiate': {
    coverage: {
      'two-cantrips': ['grant_rule'],
      'level-1-spell': ['grant_rule'],
      'spell-change': ['text'],
    },
    effects: [],
    grants: ['choice_from_list', 'choice_from_list'],
    gaps: ['spell_change_unmodelled'],
    undetermined: [],
  },
  'Savage Attacker': {
    coverage: { 'savage-attacker': ['text'] },
    effects: [],
    grants: [],
    gaps: ['weapon_reroll_text_only'],
    undetermined: [],
  },
  Skilled: {
    coverage: { skilled: ['grant_rule', 'text'] },
    effects: [],
    grants: ['skill_proficiency'],
    gaps: ['tool_alternative_unmodelled'],
    undetermined: [],
  },
  'Ability Score Improvement': {
    coverage: { 'ability-score-improvement': ['effect'] },
    effects: ['ability_increase'],
    grants: [],
    gaps: [],
    undetermined: [],
  },
  Grappler: {
    coverage: {
      'ability-score-increase': ['effect'],
      'punch-and-grab': ['text'],
      'attack-advantage': ['text'],
      'fast-wrestler': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: [
      'grapple_benefit_text_only',
      'grapple_benefit_text_only',
      'grapple_benefit_text_only',
    ],
    undetermined: [],
  },
  Archery: {
    coverage: { archery: ['text'] },
    effects: [],
    grants: [],
    gaps: ['ranged_weapon_predicate_unmodelled'],
    undetermined: ['ranged_weapon_attack_bonus'],
  },
  Defense: {
    coverage: { defense: ['text'] },
    effects: [],
    grants: [],
    gaps: ['armor_worn_predicate_unmodelled'],
    undetermined: ['armor_class'],
  },
  'Great Weapon Fighting': {
    coverage: { 'great-weapon-fighting': ['text'] },
    effects: [],
    grants: [],
    gaps: ['damage_die_replacement_unmodelled'],
    undetermined: [],
  },
  'Two-Weapon Fighting': {
    coverage: { 'two-weapon-fighting': ['text'] },
    effects: [],
    grants: [],
    gaps: ['light_weapon_attack_predicate_unmodelled'],
    undetermined: [],
  },
  'Boon of Combat Prowess': {
    coverage: {
      'ability-score-increase': ['effect'],
      'peerless-aim': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: ['epic_boon_benefit_text_only'],
    undetermined: [],
  },
  'Boon of Dimensional Travel': {
    coverage: {
      'ability-score-increase': ['effect'],
      'blink-steps': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: ['epic_boon_benefit_text_only'],
    undetermined: [],
  },
  'Boon of Fate': {
    coverage: {
      'ability-score-increase': ['effect'],
      'improve-fate': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: ['epic_boon_benefit_text_only'],
    undetermined: [],
  },
  'Boon of Irresistible Offense': {
    coverage: {
      'ability-score-increase': ['effect'],
      'overcome-defenses': ['text'],
      'overwhelming-strike': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: [
      'epic_boon_benefit_text_only',
      'epic_boon_benefit_text_only',
    ],
    undetermined: [],
  },
  'Boon of Spell Recall': {
    coverage: {
      'ability-score-increase': ['effect'],
      'free-casting': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: ['epic_boon_benefit_text_only'],
    undetermined: [],
  },
  'Boon of the Night Spirit': {
    coverage: {
      'ability-score-increase': ['effect'],
      'merge-with-shadows': ['text'],
      'shadowy-form': ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: [
      'epic_boon_benefit_text_only',
      'conditional_resistance_unmodelled',
    ],
    undetermined: [],
  },
  'Boon of Truesight': {
    coverage: {
      'ability-score-increase': ['effect'],
      truesight: ['text'],
    },
    effects: ['ability_increase'],
    grants: [],
    gaps: ['senses_unmodelled'],
    undetermined: [],
  },
} as const;

describe('LU-0 feat application coverage', () => {
  it('matches the hand-authored 17-row source-to-vocabulary oracle', () => {
    const feats = bundledFeatDefinitions();
    expect(feats.map((feat) => feat.name)).toEqual(
      Object.keys(APPLICATION_ORACLE),
    );

    for (const feat of feats) {
      const oracle =
        APPLICATION_ORACLE[feat.name as keyof typeof APPLICATION_ORACLE];
      const plan = buildFeatApplicationPlan({
        definition: feat,
        character: character(),
        config: configFor(feat),
        ability_increases: increasesFor(feat),
      });
      expect(
        Object.fromEntries(
          featBenefitCoverage(feat).map((benefit) => [
            benefit.benefit_key,
            benefit.classifications,
          ]),
        ),
        `${feat.name} benefit classification`,
      ).toEqual(oracle.coverage);
      expect(
        plan.effects.map((effect) => effect.effect_kind),
        `${feat.name} effects`,
      ).toEqual(oracle.effects);
      expect(
        plan.grant_rules.map((rule) => rule.kind),
        `${feat.name} grant rules`,
      ).toEqual(oracle.grants);
      expect(
        plan.text_benefits.map((benefit) => benefit.gap),
        `${feat.name} named text gaps`,
      ).toEqual(oracle.gaps);
      expect(
        plan.undetermined_numbers,
        `${feat.name} undetermined numbers`,
      ).toEqual(oracle.undetermined);
      expect(
        plan.text_benefits.every((benefit) =>
          feat.notes.includes(benefit.text),
        ),
        `${feat.name} text stays exact source text`,
      ).toBe(true);
      expect(plan.eligibility.status, `${feat.name} eligibility`).toBe(
        'qualified',
      );
    }
  });

  it('emits exactly nine capped ability effects and no tempting broad substitute', () => {
    const plans = bundledFeatDefinitions().map((feat) =>
      buildFeatApplicationPlan({
        definition: feat,
        character: character(),
        config: configFor(feat),
        ability_increases: increasesFor(feat),
      }),
    );
    expect(plans.flatMap((plan) => plan.effects)).toHaveLength(9);
    expect(
      plans.flatMap((plan) =>
        plan.effects.map((effect) => effect.effect_kind),
      ),
    ).toEqual(Array.from({ length: 9 }, () => 'ability_increase'));
    expect(
      plans
        .flatMap((plan) => plan.effects)
        .some((effect) =>
          [
            'weapon_attack_bonus',
            'weapon_damage_bonus',
            'armor_class_bonus',
            'damage_resistance',
          ].includes(effect.effect_kind),
        ),
    ).toBe(false);
  });

  it('feeds Magic Initiate through the shared GF-1 planner as three selected-feat locators', () => {
    const feat = definition('Magic Initiate');
    const plan = buildFeatApplicationPlan({
      definition: feat,
      character: character(),
      config: configFor(feat),
      ability_increases: [],
    });
    const grants = new GrantRulePlanner().plan({
      source: { kind: 'selected_feat' },
      configured_rules: plan.grant_rules,
      config: plan.config,
      effective_class_level: null,
    });
    expect(grants).toHaveLength(3);
    expect(
      grants.map((grant) => [
        grant.locator.source.kind,
        grant.locator.rule_key,
        grant.locator.ordinal,
      ]),
    ).toEqual([
      ['selected_feat', 'magic-initiate-cantrips', 1],
      ['selected_feat', 'magic-initiate-cantrips', 2],
      ['selected_feat', 'magic-initiate-level-one', 1],
    ]);
    expect(featSpellReplacementEntitlement(feat)).toEqual({
      feat_content_key: feat.content_key,
      trigger: 'character_level',
      rule_keys: [
        'magic-initiate-cantrips',
        'magic-initiate-level-one',
      ],
      replacement_constraint: 'same_list_and_level',
      list_config_key: 'chosen_list',
    });
    expect(
      bundledFeatDefinitions()
        .filter((candidate) => candidate.name !== 'Magic Initiate')
        .every(
          (candidate) =>
            featSpellReplacementEntitlement(candidate) === null,
        ),
    ).toBe(true);
  });

  it('rejects zero-point inference, disallowed abilities and cap overflow', () => {
    const alert = definition('Alert');
    expect(() =>
      buildFeatApplicationPlan({
        definition: alert,
        character: character(),
        config: {},
        ability_increases: [{ ability: 'strength', amount: 1 }],
      }),
    ).toThrow(/grants no ability increase/);

    const grappler = definition('Grappler');
    expect(() =>
      buildFeatApplicationPlan({
        definition: grappler,
        character: character(),
        config: {},
        ability_increases: [{ ability: 'wisdom', amount: 1 }],
      }),
    ).toThrow(/invalid or repeated ability choice/);
    expect(() =>
      buildFeatApplicationPlan({
        definition: grappler,
        character: character({
          ability_scores: {
            ...character().ability_scores,
            strength: 20,
          },
        }),
        config: {},
        ability_increases: [{ ability: 'strength', amount: 1 }],
      }),
    ).toThrow(/above 20/);

    expect(() =>
      buildFeatApplicationPlan({
        definition: {
          ...grappler,
          ability_points: 0,
          ability_increase_abilities: null,
          ability_increase_maximum: null,
        },
        character: character(),
        config: {},
        ability_increases: [],
      }),
    ).toThrow(/effect coverage disagrees/);
  });
});

describe('typed feat eligibility', () => {
  it('returns qualified, unmet and unprovable without a fallback', () => {
    const grappler = definition('Grappler');
    expect(
      evaluateFeatEligibility(grappler, character()).status,
    ).toBe('qualified');
    expect(
      evaluateFeatEligibility(
        grappler,
        character({ total_level: 3 }),
      ).status,
    ).toBe('unmet');
    expect(
      evaluateFeatEligibility(
        grappler,
        character({
          ability_scores: {
            ...character().ability_scores,
            strength: null,
            dexterity: null,
          },
        }),
      ).status,
    ).toBe('unprovable');
  });

  it('qualifies exactly at the sourced level boundary and carries unmet eligibility into the plan', () => {
    const grappler = definition('Grappler');
    expect(
      evaluateFeatEligibility(
        grappler,
        character({ total_level: 4 }),
      ).status,
    ).toBe('qualified');
    expect(
      buildFeatApplicationPlan({
        definition: grappler,
        character: character({ total_level: 3 }),
        config: {},
        ability_increases: [{ ability: 'strength', amount: 1 }],
      }).eligibility,
    ).toMatchObject({
      status: 'unmet',
      reasons: [{ kind: 'minimum_level', minimum: 4, actual: 3 }],
    });
  });

  it('keeps unprovable facts visible when a definite unmet reason controls status', () => {
    const grappler = definition('Grappler');
    expect(
      evaluateFeatEligibility(
        grappler,
        character({
          total_level: 3,
          ability_scores: {
            ...character().ability_scores,
            strength: null,
            dexterity: null,
          },
        }),
      ),
    ).toEqual({
      status: 'unmet',
      reasons: [
        { kind: 'minimum_level', minimum: 4, actual: 3 },
        {
          kind: 'ability_score_unknown',
          abilities: ['strength', 'dexterity'],
          minimum: 13,
        },
      ],
    });
  });

  it('distinguishes absent and unprovable feature possession', () => {
    const archery = definition('Archery');
    expect(
      evaluateFeatEligibility(
        archery,
        character({
          feature_evidence: {
            ...PRESENT_FEATURES,
            fighting_style: 'absent',
          },
        }),
      ),
    ).toMatchObject({
      status: 'unmet',
      reasons: [{ kind: 'feature_missing', feature: 'fighting_style' }],
    });
    expect(
      evaluateFeatEligibility(
        archery,
        character({
          feature_evidence: {
            ...PRESENT_FEATURES,
            fighting_style: 'unprovable',
          },
        }),
      ),
    ).toMatchObject({
      status: 'unprovable',
      reasons: [
        { kind: 'feature_unprovable', feature: 'fighting_style' },
      ],
    });
  });

  it('honours non-repeatability and Magic Initiate list uniqueness', () => {
    const alert = definition('Alert');
    expect(
      evaluateFeatEligibility(
        alert,
        character({
          active_feats: [
            { feat_content_key: alert.content_key, config: {} },
          ],
        }),
      ).status,
    ).toBe('unmet');

    const initiate = definition('Magic Initiate');
    const withWizard = character({
      active_feats: [
        {
          feat_content_key: initiate.content_key,
          config: {
            chosen_list: 'Wizard',
            spellcasting_ability: 'intelligence',
          },
        },
      ],
    });
    expect(
      evaluateFeatEligibility(initiate, withWizard, {
        chosen_list: 'Wizard',
        spellcasting_ability: 'wisdom',
      }).status,
    ).toBe('unmet');
    expect(
      evaluateFeatEligibility(initiate, withWizard, {
        chosen_list: 'Cleric',
        spellcasting_ability: 'wisdom',
      }).status,
    ).toBe('qualified');
    expect(
      evaluateFeatEligibility(
        initiate,
        character({
          active_feats: [
            {
              feat_content_key: initiate.content_key,
              config: { legacy_unknown_list: true },
            },
          ],
        }),
      ).status,
    ).toBe('unprovable');
  });

  it('decodes only the typed ability option union', () => {
    expect(decodeAbilityIncreaseAbilities(null)).toBeNull();
    expect(decodeAbilityIncreaseAbilities('"any"')).toBe('any');
    expect(
      decodeAbilityIncreaseAbilities('["strength","dexterity"]'),
    ).toEqual(['strength', 'dexterity']);
    expect(() =>
      decodeAbilityIncreaseAbilities('["strength","strength"]'),
    ).toThrow(/distinct/);
    expect(() =>
      decodeAbilityIncreaseAbilities('["luck"]'),
    ).toThrow(/distinct/);
    expect(() =>
      decodeAbilityIncreaseAbilities('{"ability":"strength"}'),
    ).toThrow(/distinct/);
    expect(() => decodeAbilityIncreaseAbilities(['strength'])).toThrow(
      /stored as JSON text/,
    );
  });

  it('keeps the bundled key set compile-visible through the application definition', () => {
    const key: BundledFeatContentKey = '2024:feat:alert';
    const typed: FeatDefinitionForApplication = {
      ...definition('Alert'),
      content_key: key as ContentKey,
    };
    expect(typed.content_key).toBe(key);
  });
});
