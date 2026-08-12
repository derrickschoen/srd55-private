import type {
  LevelUpPlannedExpertiseChoice,
  LevelUpPlannedGrantLocator,
} from '../../../src/domain/command-contracts';

export type AcceptanceLevelUpSpellChoice =
  | {
      readonly kind: 'slot_selection';
      readonly locator: LevelUpPlannedGrantLocator;
      readonly spell_name: string;
      readonly mode: 'new';
    }
  | {
      readonly kind: 'spellbook_acquisition';
      readonly locator: LevelUpPlannedGrantLocator;
      readonly spell_name: string;
    };

export interface AcceptanceWizard2Choices {
  readonly skills: readonly [];
  readonly expertise: readonly LevelUpPlannedExpertiseChoice[];
  readonly spells: readonly AcceptanceLevelUpSpellChoice[];
}

/**
 * Hand-reviewed from Scholar (class-expertise.txt) and the Wizard progression
 * (six initial spellbook acquisitions plus two per gained Wizard level).
 * Spell names are independent acceptance choices, never preview output.
 */
export const ACCEPTANCE_WIZARD_2_CHOICES = {
  skills: [],
  expertise: [{
    locator: {
      source: { kind: 'selected_class' },
      rule_key: 'class_expertise_2',
      ordinal: 1,
    },
    skill: 'arcana',
  }],
  spells: [
    {
      kind: 'spellbook_acquisition',
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'wizard-spellbook',
        ordinal: 7,
      },
      spell_name: 'Thunderwave',
    },
    {
      kind: 'spellbook_acquisition',
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'wizard-spellbook',
        ordinal: 8,
      },
      spell_name: 'Comprehend Languages',
    },
    {
      kind: 'slot_selection',
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'wizard-prepared',
        ordinal: 5,
      },
      spell_name: 'Thunderwave',
      mode: 'new',
    },
  ],
} as const satisfies AcceptanceWizard2Choices;
