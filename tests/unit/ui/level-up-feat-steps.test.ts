import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  levelUpWarningPresentation,
  type FeatEligibilityResult,
  type LevelUpFeatApplication,
  type LevelUpFeatCandidate,
} from '../../../src/builder/level-up-wizard';
import type { ContentKey } from '../../../src/domain/ids';
import {
  createFeatStep,
} from '../../../src/ui/screens/level-up/feat-steps';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  vi.restoreAllMocks();
});

const qualified = { status: 'qualified', reasons: [] } as const;

function application(options: {
  readonly key: string;
  readonly eligibility?: FeatEligibilityResult;
  readonly config?: LevelUpFeatApplication['selection']['config'];
  readonly abilityIncreases?: LevelUpFeatApplication['selection']['ability_increases'];
}): LevelUpFeatApplication {
  const eligibility = options.eligibility ?? qualified;
  return {
    selection: {
      kind: 'feat',
      feat_content_key: options.key,
      config: options.config ?? {},
      ability_increases: options.abilityIncreases ?? [],
    },
    plan: {
      feat_content_key: options.key as ContentKey,
      eligibility,
      config: options.config ?? {},
      effects: [],
      grant_rules: [],
      text_benefits: [],
      undetermined_numbers: [],
    },
  };
}

function candidate(options: {
  readonly key: string;
  readonly name: string;
  readonly eligibility?: FeatEligibilityResult;
  readonly grouping?: 'origin' | 'general' | 'fighting_style' | 'epic_boon';
  readonly classDefault?: boolean;
  readonly abilityPoints?: 0 | 1 | 2;
  readonly applications?: readonly LevelUpFeatApplication[];
  readonly catalogLayer?: LevelUpFeatCandidate['catalog_layer'];
}): LevelUpFeatCandidate {
  const eligibility = options.eligibility ?? qualified;
  return {
    catalog_layer: options.catalogLayer ?? 'bundled',
    definition: {
      content_key: options.key as ContentKey,
      name: options.name,
      catalog_layer: options.catalogLayer ?? 'bundled',
      grouping: options.grouping ?? 'general',
      min_level: null,
      ability_points: options.abilityPoints ?? 0,
      ability_increase_abilities: options.abilityPoints === undefined || options.abilityPoints === 0
        ? null
        : 'any',
      ability_increase_maximum: options.abilityPoints === undefined || options.abilityPoints === 0
        ? null
        : 20,
      repeatable: false,
      prerequisites: [],
      grant_rules: [],
      notes: '',
    },
    eligibility,
    is_class_default: options.classDefault ?? false,
    applications: options.applications ?? [application({
      key: options.key,
      eligibility,
    })],
  };
}

describe('W-FEAT-17 feat candidate cards', () => {
  it('renders a hostile external feat inert with the exact disclosed layer', () => {
    const hostile = '</h3><img data-ha10-feat-hostile src=x>';
    const view = createFeatStep({
      step: 'feat',
      candidates: [candidate({
        key: 'expanded:content.feat:hostile',
        name: hostile,
        catalogLayer: 'external',
      })],
      draft: null,
      allowDefer: false,
      deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
      onSelect: () => undefined,
    });

    const card = interactiveElement(view.element).querySelector(
      '[data-level-up-feat-card="expanded:content.feat:hostile"]',
    );
    expect(elementText(card! as unknown as Node)).toContain(hostile);
    expect(
      interactiveElement(card! as unknown as Node).querySelectorAll('dd')
        .map((entry) => elementText(entry as unknown as Node)),
    ).toContain('Homebrew · external layer');
    expect(
      interactiveElement(view.element).querySelector('[data-ha10-feat-hostile]'),
    ).toBeNull();
    view.cleanup();
  });

  it('renders one card per returned candidate and keeps refused cards descriptive but inert', () => {
    const candidates = [
      candidate({ key: '2024:feat:alert', name: 'Alert', grouping: 'origin' }),
      candidate({ key: '2024:feat:magic-initiate', name: 'Magic Initiate', grouping: 'origin' }),
      candidate({ key: '2024:feat:savage-attacker', name: 'Savage Attacker', grouping: 'origin' }),
      candidate({ key: '2024:feat:skilled', name: 'Skilled', grouping: 'origin' }),
      candidate({
        key: '2024:feat:ability-score-improvement',
        name: 'Ability Score Improvement',
        classDefault: true,
        abilityPoints: 2,
        applications: [application({
          key: '2024:feat:ability-score-improvement',
          abilityIncreases: [{ ability: 'strength', amount: 2 }],
        })],
      }),
      candidate({
        key: '2024:feat:grappler',
        name: 'Grappler',
        eligibility: {
          status: 'unprovable',
          reasons: [{
            kind: 'ability_score_unknown',
            abilities: ['strength', 'dexterity'],
            minimum: 13,
          }],
        },
      }),
      candidate({
        key: '2024:feat:archery',
        name: 'Archery',
        grouping: 'fighting_style',
      }),
      candidate({
        key: '2024:feat:defense',
        name: 'Defense',
        grouping: 'fighting_style',
        eligibility: {
          status: 'unmet',
          reasons: [{ kind: 'feature_missing', feature: 'fighting_style' }],
        },
      }),
      candidate({ key: '2024:feat:great-weapon-fighting', name: 'Great Weapon Fighting', grouping: 'fighting_style' }),
      candidate({ key: '2024:feat:two-weapon-fighting', name: 'Two-Weapon Fighting', grouping: 'fighting_style' }),
      candidate({ key: '2024:feat:boon-of-combat-prowess', name: 'Boon of Combat Prowess', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-dimensional-travel', name: 'Boon of Dimensional Travel', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-fate', name: 'Boon of Fate', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-irresistible-offense', name: 'Boon of Irresistible Offense', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-spell-recall', name: 'Boon of Spell Recall', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-the-night-spirit', name: 'Boon of the Night Spirit', grouping: 'epic_boon' }),
      candidate({ key: '2024:feat:boon-of-truesight', name: 'Boon of Truesight', grouping: 'epic_boon' }),
    ] as const;
    const view = createFeatStep({
      step: 'feat',
      candidates,
      draft: null,
      allowDefer: false,
      deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
      onSelect: () => undefined,
    });
    const cards = interactiveElement(view.element).querySelectorAll(
      '[data-level-up-feat-card]',
    );
    const grappler = interactiveElement(view.element).querySelector(
      '[data-level-up-feat-card="2024:feat:grappler"]',
    );
    const defense = interactiveElement(view.element).querySelector(
      '[data-level-up-feat-card="2024:feat:defense"]',
    );
    const asi = interactiveElement(view.element).querySelector(
      '[data-level-up-feat-card="2024:feat:ability-score-improvement"]',
    );

    expect(cards).toHaveLength(17);
    expect(cards.map((card) => elementText(card as unknown as Node))).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Alert'),
        expect.stringContaining('Magic Initiate'),
        expect.stringContaining('Ability Score Improvement'),
        expect.stringContaining('Boon of Truesight'),
      ]),
    );
    expect(elementText(asi as unknown as Node)).toContain('Class default');
    expect(asi?.querySelector('input')).not.toBeNull();
    for (const refused of [grappler, defense]) {
      expect(refused?.getAttribute('tabindex')).toBe('0');
      expect(refused?.getAttribute('aria-describedby')).not.toBeNull();
      expect(refused?.querySelector('input')).toBeNull();
    }
    expect(elementText(grappler as unknown as Node)).toContain('Eligibility: Unprovable');
    expect(elementText(grappler as unknown as Node)).toContain('cannot be verified');
    expect(elementText(defense as unknown as Node)).toContain('Eligibility: Unmet');
    expect(elementText(defense as unknown as Node)).toContain('Required feature is missing');
    view.cleanup();
  });

  it('generates exact Magic Initiate configuration and ability controls only from returned applications', () => {
    const cleric = application({
      key: '2024:feat:magic-initiate',
      config: { chosen_list: 'Cleric', spellcasting_ability: 'wisdom' },
    });
    const wizard = application({
      key: '2024:feat:magic-initiate',
      config: { chosen_list: 'Wizard', spellcasting_ability: 'intelligence' },
    });
    const usedDruid = application({
      key: '2024:feat:magic-initiate',
      config: { chosen_list: 'Druid', spellcasting_ability: 'wisdom' },
      eligibility: {
        status: 'unmet',
        reasons: [{
          kind: 'repeat_configuration_already_used',
          field: 'chosen_list',
          value: 'Druid',
        }],
      },
    });
    const onSelect = vi.fn();
    const view = createFeatStep({
      step: 'feat',
      candidates: [candidate({
        key: '2024:feat:magic-initiate',
        name: 'Magic Initiate',
        grouping: 'origin',
        applications: [cleric, wizard, usedDruid],
      })],
      draft: null,
      allowDefer: false,
      deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
      onSelect,
    });
    const radios = interactiveElement(view.element).querySelectorAll('[type="radio"]');

    expect(radios.map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Magic Initiate: Chosen List: Cleric; Spellcasting Ability: Wisdom; No ability increase',
      'Magic Initiate: Chosen List: Wizard; Spellcasting Ability: Intelligence; No ability increase',
    ]);
    radios[1]!.checked = true;
    radios[1]!.dispatchEvent(new Event('change'));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'selected', application: wizard });
    expect(elementText(view.element)).toContain(
      'Chosen List “Druid” has already been used for this repeatable feat.',
    );
    expect(elementText(view.element)).not.toContain('spell locator');
    view.cleanup();
  });
});

describe('W-FEAT-COVERAGE application plan presentation', () => {
  it('renders every returned application-plan section without synthesizing Skilled choices', () => {
    const skilled = application({ key: '2024:feat:skilled' });
    const covered: LevelUpFeatApplication = {
      ...skilled,
      plan: {
        ...skilled.plan,
        effects: [{
          effect_kind: 'ability_increase',
          ability: 'wisdom',
          amount: 1,
          maximum: 20,
          label: 'Sentinel applied effect',
          notes: 'Sentinel effect note',
        }],
        grant_rules: [{
          kind: 'skill_proficiency',
          rule_key: 'skilled-sentinel',
          count: 3,
          allows_tool_instead: true,
        }],
        text_benefits: [{
          benefit_key: 'skilled',
          label: 'Sentinel sourced benefit',
          text: 'You gain proficiency in any combination of three skills or tools of your choice.',
          gap: 'tool_alternative_unmodelled',
        }],
        undetermined_numbers: ['initiative'],
      },
    };
    const view = createFeatStep({
      step: 'feat',
      candidates: [candidate({
        key: '2024:feat:skilled',
        name: 'Skilled',
        grouping: 'origin',
        applications: [covered],
      })],
      draft: null,
      allowDefer: false,
      deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
      onSelect: () => undefined,
    });
    const text = elementText(view.element);

    expect(text).toContain('Ability increase: This feat grants no ability increase.');
    expect(text).toContain('Applied effects');
    expect(text).toContain('Sentinel applied effect');
    expect(text).toContain('Wisdom +1, maximum 20');
    expect(text).toContain('Choices and proficiencies');
    expect(text).toContain('Stable grant label: skilled-sentinel');
    expect(text).toContain('Choose 3 skill proficiencies');
    expect(text).toContain('a tool proficiency may be chosen instead');
    expect(text).toContain('Sourced text benefits');
    expect(text).toContain('You gain proficiency in any combination of three skills or tools of your choice.');
    expect(text).toContain('Tool Alternative Unmodelled');
    expect(text).toContain('Undetermined numbers');
    expect(text).toContain('Initiative (initiative) cannot be determined exactly.');
    expect(view.element.querySelector('select')).toBeNull();
    for (const codecPhrase of [
      'Returned configurations',
      'Grant-rule benefits',
      'Kind choice_from_list',
      'Rule Key',
      'Allows Tool Instead',
    ]) {
      expect(text).not.toContain(codecPhrase);
    }
    view.cleanup();
  });
});

describe('W-COLOR-SIGNAL eligibility presentation', () => {
  it('exposes every named reason as visible text in the card description', () => {
    const eligibility: FeatEligibilityResult = {
      status: 'unmet',
      reasons: [
        { kind: 'minimum_level', minimum: 19, actual: 8 },
        { kind: 'ability_score_minimum', abilities: ['strength', 'dexterity'], minimum: 13, actual: [12, 11] },
        { kind: 'feature_missing', feature: 'spellcasting' },
        { kind: 'already_taken' },
        { kind: 'repeat_configuration_unavailable', field: 'chosen_list' },
        { kind: 'repeat_configuration_already_used', field: 'chosen_list', value: 'Wizard' },
        { kind: 'ability_score_unknown', abilities: ['wisdom'], minimum: 13 },
        { kind: 'feature_unprovable', feature: 'fighting_style' },
        { kind: 'repeat_configuration_unprovable', field: 'chosen_list' },
      ],
    };
    const view = createFeatStep({
      step: 'feat',
      candidates: [candidate({
        key: 'test:feat:all-reasons',
        name: 'All Reasons',
        eligibility,
      })],
      draft: null,
      allowDefer: false,
      deferredWarning: levelUpWarningPresentation('epic_boon_deferred'),
      onSelect: () => undefined,
    });
    const card = interactiveElement(view.element).querySelector(
      '[data-level-up-feat-card="test:feat:all-reasons"]',
    );
    const descriptionId = card?.getAttribute('aria-describedby');
    const description = descriptionId === null || descriptionId === undefined
      ? null
      : interactiveElement(view.element).querySelector(`[id="${descriptionId}"]`);
    const text = elementText(description as unknown as Node);

    expect(text).toContain('Eligibility: Unmet');
    expect(text).toContain('Minimum level 19; projected level is 8');
    expect(text).toContain('returned scores: 12, 11');
    expect(text).toContain('Required feature is missing: Spellcasting');
    expect(text).toContain('nonrepeatable feat has already been taken');
    expect(text).toContain('No unused Chosen List choice remains');
    expect(text).toContain('Chosen List “Wizard” has already been used');
    expect(text).toContain('Wisdom cannot be verified');
    expect(text).toContain('Required feature cannot be verified: Fighting Style');
    expect(text).toContain('Prior Chosen List choices cannot be verified');
    expect(card?.querySelector('input')).toBeNull();
    view.cleanup();
  });
});
