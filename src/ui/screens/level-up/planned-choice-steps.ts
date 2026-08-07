import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  levelUpWarningPresentation,
  type LevelUpPlannedChoiceProjection,
  type LevelUpPlannedEligibleSpellsParams,
  type LevelUpPlannedExpertiseProjection,
  type LevelUpPlannedSkillProjection,
  type LevelUpPlannedSpellProjection,
  type PlannedExpertiseChoice,
  type PlannedGrantLocator,
  type PlannedSkillChoice,
  type PlannedSpellChoice,
} from '../../../builder/level-up-wizard';
import type { Skill } from '../../../domain/enums';
import type { EligibleSpell } from '../../../domain/read-models';
import type { CatalogLayerDisclosure } from '../../../catalog/catalog-disclosure';
import { element, listen, type Cleanup } from '../../dom';
import {
  createSpellPicker,
  type SpellPicker,
} from '../planner/spell-picker';

export interface PlannedSpellDraft {
  readonly choice: PlannedSpellChoice;
  readonly spell_name: string;
  readonly spell_catalog_layer: CatalogLayerDisclosure;
}

export interface PlannedSubchoiceDraft {
  readonly skills: readonly PlannedSkillChoice[];
  readonly expertise: readonly PlannedExpertiseChoice[];
  readonly spells: readonly PlannedSpellDraft[];
}

export const EMPTY_PLANNED_SUBCHOICE_DRAFT: PlannedSubchoiceDraft =
  Object.freeze({
    skills: Object.freeze([]),
    expertise: Object.freeze([]),
    spells: Object.freeze([]),
  });

export type SpellPickerFactory = (options: Parameters<
  typeof createSpellPicker
>[0]) => SpellPicker;

function plannedGrantSourceKey(
  source: PlannedGrantLocator['source'],
): readonly (string | number)[] {
  switch (source.kind) {
    case 'selected_class':
      return ['selected_class'];
    case 'selected_class_subclass':
      return ['selected_class_subclass'];
    case 'selected_feat':
      return ['selected_feat'];
    case 'existing_source':
      return ['existing_source', source.source_instance_id];
  }
  source satisfies never;
  throw new Error('Unreachable planned grant source.');
}

export function plannedGrantLocatorKey(locator: PlannedGrantLocator): string {
  const source = plannedGrantSourceKey(locator.source);
  return JSON.stringify([source, locator.rule_key, locator.ordinal]);
}

function skillLabel(skill: Skill): string {
  return skill
    .split('_')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function selectedSkill(
  draft: readonly PlannedSkillChoice[],
  locator: PlannedGrantLocator,
): Skill | null {
  const key = plannedGrantLocatorKey(locator);
  return draft.find(
    (choice) => plannedGrantLocatorKey(choice.locator) === key,
  )?.skill ?? null;
}

function selectedExpertise(
  draft: readonly PlannedExpertiseChoice[],
  locator: PlannedGrantLocator,
): Skill | null {
  const key = plannedGrantLocatorKey(locator);
  return draft.find(
    (choice) => plannedGrantLocatorKey(choice.locator) === key,
  )?.skill ?? null;
}

function selectedSpell(
  draft: readonly PlannedSpellDraft[],
  locator: PlannedGrantLocator,
): PlannedSpellDraft | null {
  const key = plannedGrantLocatorKey(locator);
  return draft.find(
    (entry) => plannedGrantLocatorKey(entry.choice.locator) === key,
  ) ?? null;
}

function sourceIdentity(
  sourceLabel: string,
  locator: PlannedGrantLocator,
): HTMLElement {
  return element('p', {
    className: 'level-up-planned-source',
    text:
      `Granted by ${sourceLabel}. Rule ${locator.rule_key}, ` +
      `choice ${String(locator.ordinal)}.`,
  });
}

function unfilledWarning(
  kind: 'skill_grant_unfilled' | 'expertise_grant_unfilled' | 'spell_choice_unfilled',
  detail: string,
): HTMLElement {
  const warning = levelUpWarningPresentation(kind);
  return element(
    'p',
    {
      className: 'level-up-warnings level-up-planned-warning',
      attributes: {
        [LEVEL_UP_ATTR.warning]: warning.key,
        role: 'status',
      },
    },
    [
      element('strong', { text: `${warning.title}. ` }),
      element('span', { text: detail }),
    ],
  );
}

function plannedSelect(options: {
  readonly projection:
    | LevelUpPlannedSkillProjection
    | LevelUpPlannedExpertiseProjection;
  readonly kind: 'skill' | 'expertise';
  readonly selected: Skill | null;
  readonly onSelect: (skill: Skill | null) => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const { projection } = options;
  const labelText =
    `${projection.source_label} ${options.kind} choice, rule ` +
    `${projection.locator.rule_key}, ordinal ` +
    `${String(projection.locator.ordinal)}`;
  const warning = unfilledWarning(
    options.kind === 'skill'
      ? 'skill_grant_unfilled'
      : 'expertise_grant_unfilled',
    `Continuing leaves this ${options.kind} choice unfilled; the warning remains until the choice is completed.`,
  );
  warning.hidden = options.selected !== null;
  const select = element(
    'select',
    {
      attributes: {
        'aria-label': labelText,
        [options.kind === 'skill'
          ? LEVEL_UP_ATTR.skillChoice
          : LEVEL_UP_ATTR.expertiseChoice]: plannedGrantLocatorKey(
            projection.locator,
          ),
      },
    },
    [
      element('option', {
        text: `Decide later — leave this ${options.kind} choice unfilled`,
        attributes: { value: '' },
      }),
      ...projection.available_skills.map((skill) =>
        element('option', {
          text: skillLabel(skill),
          attributes: {
            value: skill,
            ...(options.selected === skill ? { selected: '' } : {}),
          },
        }),
      ),
    ],
  );
  select.value = options.selected ?? '';
  const cleanup = listen(select, 'change', () => {
    const selected = projection.available_skills.find(
      (skill) => skill === select.value,
    );
    options.onSelect(selected ?? null);
    warning.hidden = selected !== undefined;
  });
  return {
    element: element('article', { className: 'level-up-planned-choice' }, [
      element('label', {}, [element('span', { text: labelText }), select]),
      sourceIdentity(projection.source_label, projection.locator),
      warning,
    ]),
    cleanup,
  };
}

export function createPlannedSkillsStep(options: {
  readonly projections: readonly LevelUpPlannedSkillProjection[];
  readonly draft: PlannedSubchoiceDraft;
  readonly onSelect: (
    projection: LevelUpPlannedSkillProjection,
    skill: Skill | null,
  ) => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const choices = options.projections.map((projection) =>
    plannedSelect({
      projection,
      kind: 'skill',
      selected: selectedSkill(options.draft.skills, projection.locator),
      onSelect: (skill) => options.onSelect(projection, skill),
    }),
  );
  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.skills },
      },
      [
        element('h2', { text: 'Choose skills' }),
        element('p', {
          text:
            'Each choice keeps the granting source, rule, and ordinal returned by the level-up plan.',
        }),
        ...choices.map((choice) => choice.element),
      ],
    ),
    cleanup: () => choices.forEach((choice) => choice.cleanup()),
  };
}

export function createPlannedExpertiseStep(options: {
  readonly projections: readonly LevelUpPlannedExpertiseProjection[];
  readonly draft: PlannedSubchoiceDraft;
  readonly onSelect: (
    projection: LevelUpPlannedExpertiseProjection,
    skill: Skill | null,
  ) => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const choices = options.projections.map((projection) =>
    plannedSelect({
      projection,
      kind: 'expertise',
      selected: selectedExpertise(options.draft.expertise, projection.locator),
      onSelect: (skill) => options.onSelect(projection, skill),
    }),
  );
  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.expertise },
      },
      [
        element('h2', { text: 'Choose Expertise' }),
        element('p', {
          text:
            'These are only the active proficient skills returned by the level-up plan, excluding skills that already have Expertise.',
        }),
        ...choices.map((choice) => choice.element),
      ],
    ),
    cleanup: () => choices.forEach((choice) => choice.cleanup()),
  };
}

function spellChoiceLabel(choice: LevelUpPlannedSpellProjection): string {
  switch (choice.kind) {
    case 'new_slot':
      return choice.required
        ? 'New spell choice — Required'
        : 'New spell choice — Optional';
    case 'spellbook_acquisition':
      return 'Spellbook acquisition — Required';
    case 'optional_swap':
      return 'Optional spell swap';
  }
}

function plannedSpellChoice(
  projection: LevelUpPlannedSpellProjection,
  spell: EligibleSpell,
): PlannedSpellDraft {
  switch (projection.kind) {
    case 'new_slot':
      return {
        choice: {
          kind: 'slot_selection',
          locator: projection.locator,
          spell_version_id: spell.id,
          mode: 'new',
        },
        spell_name: spell.name,
        spell_catalog_layer: spell.catalog_layer,
      };
    case 'spellbook_acquisition':
      return {
        choice: {
          kind: 'spellbook_acquisition',
          locator: projection.locator,
          spell_version_id: spell.id,
        },
        spell_name: spell.name,
        spell_catalog_layer: spell.catalog_layer,
      };
    case 'optional_swap':
      return {
        choice: {
          kind: 'slot_selection',
          locator: projection.locator,
          spell_version_id: spell.id,
          mode: 'replace',
        },
        spell_name: spell.name,
        spell_catalog_layer: spell.catalog_layer,
      };
  }
}

export function createPlannedSpellsStep(options: {
  readonly projections: readonly LevelUpPlannedSpellProjection[];
  readonly draft: PlannedSubchoiceDraft;
  readonly replacementLocators: ReadonlySet<string>;
  readonly searchParams: Omit<LevelUpPlannedEligibleSpellsParams, 'locator' | 'query'>;
  readonly search: (
    params: LevelUpPlannedEligibleSpellsParams,
  ) => Promise<readonly EligibleSpell[]>;
  readonly onSelect: (
    projection: LevelUpPlannedSpellProjection,
    spell: PlannedSpellDraft | null,
  ) => void;
  readonly onReplacementMode: (
    projection: Extract<LevelUpPlannedSpellProjection, { readonly kind: 'optional_swap' }>,
    replacing: boolean,
  ) => void;
  readonly pickerFactory?: SpellPickerFactory;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const cleanups: Cleanup[] = [];
  const pickers: SpellPicker[] = [];
  const pickerFactory = options.pickerFactory ?? createSpellPicker;
  const choices = options.projections.map((projection) => {
    const key = plannedGrantLocatorKey(projection.locator);
    const encodedKey = encodeURIComponent(key);
    const selected = selectedSpell(options.draft.spells, projection.locator);
    const replacing =
      projection.kind === 'optional_swap' &&
      options.replacementLocators.has(key);
    const owed = projection.kind === 'spellbook_acquisition' ||
      (projection.kind === 'new_slot' && projection.required);
    const unfilledSpellWarning = unfilledWarning(
      'spell_choice_unfilled',
      'Continuing defers this owed choice; the generated durable choice remains unfilled and warned.',
    );
    unfilledSpellWarning.hidden = !owed || selected !== null;
    const picker = pickerFactory({
      addressKey: `level-up-${projection.kind}-${encodedKey}`,
      label: `${spellChoiceLabel(projection)} from ${projection.source_label}`,
      value:
        selected?.spell_name ?? null,
      valueCatalogLayer: selected?.spell_catalog_layer ?? null,
      freeTextValue: false,
      invalid: false,
      disabled: projection.kind === 'optional_swap' && !replacing,
      search: async (query) => [
        ...(await options.search({
          ...options.searchParams,
          locator: projection.locator,
          query,
        })),
      ],
      onSelect: (spell) => {
        options.onSelect(projection, plannedSpellChoice(projection, spell));
        unfilledSpellWarning.hidden = true;
      },
    });
    pickers.push(picker);
    const modeControls: Node[] = [];
    if (projection.kind === 'optional_swap') {
      const keep = element('input', {
        attributes: {
          type: 'radio',
          name: `level-up-spell-mode-${encodedKey}`,
          value: 'keep',
          'aria-label': `Keep ${projection.current_spell_name}`,
          ...(!replacing ? { checked: '' } : {}),
        },
      });
      const replace = element('input', {
        attributes: {
          type: 'radio',
          name: `level-up-spell-mode-${encodedKey}`,
          value: 'replace',
          'aria-label': `Replace ${projection.current_spell_name}`,
          ...(replacing ? { checked: '' } : {}),
        },
      });
      cleanups.push(
        listen(keep, 'change', () => {
          if (keep.checked) options.onReplacementMode(projection, false);
        }),
        listen(replace, 'change', () => {
          if (replace.checked) options.onReplacementMode(projection, true);
        }),
      );
      modeControls.push(
        element('fieldset', { className: 'level-up-spell-swap-modes' }, [
          element('legend', {
            text: `Current spell: ${projection.current_spell_name}`,
          }),
          element('label', {}, [
            keep,
            element('span', {
              text: `Keep ${projection.current_spell_name} (no swap)`,
            }),
          ]),
          element('label', {}, [
            replace,
            element('span', { text: 'Choose a replacement spell' }),
          ]),
        ]),
      );
    }
    const optionalNewChoice =
      projection.kind === 'new_slot' && !projection.required
        ? [element('p', {
            text: 'Optional: leaving this unselected adds no planned spell choice.',
          })]
        : [];
    const card = element(
      'article',
      {
        className: `level-up-planned-choice level-up-spell-${projection.kind}`,
        attributes: { [LEVEL_UP_ATTR.spellChoice]: key },
      },
      [
        element('h3', { text: spellChoiceLabel(projection) }),
        sourceIdentity(projection.source_label, projection.locator),
        ...modeControls,
        picker.element,
        ...(owed ? [unfilledSpellWarning] : []),
        ...optionalNewChoice,
      ],
    );
    return card;
  });
  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.spells },
      },
      [
        element('h2', { text: 'Choose spells' }),
        element('p', {
          text:
            'Search uses this exact draft’s logical locator and character revision. Nothing is assigned until Confirm.',
        }),
        ...choices,
      ],
    ),
    cleanup: () => {
      cleanups.forEach((cleanup) => cleanup());
      pickers.forEach((picker) => picker.destroy());
    },
  };
}

export function mergePlannedChoiceProjections(
  projections: readonly (LevelUpPlannedChoiceProjection | undefined)[],
): LevelUpPlannedChoiceProjection {
  return {
    skills: projections.flatMap((projection) => projection?.skills ?? []),
    expertise: projections.flatMap(
      (projection) => projection?.expertise ?? [],
    ),
    spells: projections.flatMap((projection) => projection?.spells ?? []),
  };
}
