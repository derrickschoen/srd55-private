import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  LEVEL_UP_RPC,
  type LevelUpFeatCandidate,
  type LevelUpGuideableClassOption,
  type LevelUpPlannedChoiceProjection,
  type PlannedGrantLocator,
  type LevelUpStateResult,
} from '../../../src/builder/level-up-wizard';
import type { CharacterLevel } from '../../../src/domain/enums';
import type {
  CharacterId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  ContentKey,
  SpellVersionId,
} from '../../../src/domain/ids';
import type { EligibleSpell } from '../../../src/domain/read-models';
import type { CharacterSheet } from '../../../src/queries/character-sheet-builder';
import type { RpcClient } from '../../../src/rpc/client';
import { parseRoute, type Router } from '../../../src/ui/router';
import { createLevelUpWizard } from '../../../src/ui/screens/level-up/level-up-wizard';
import {
  createPlannedSkillsStep,
  plannedGrantLocatorKey,
  type SpellPickerFactory,
} from '../../../src/ui/screens/level-up/planned-choice-steps';
import { screen } from '../../../src/ui/screens/level-up/screen';
import { createSpellPicker } from '../../../src/ui/screens/planner/spell-picker';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

let restoreDocument: (() => void) | undefined;
let restoreWindow: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      history: { state: null, back: vi.fn() },
      location: { origin: 'https://level-up.test' },
    },
  });
  restoreWindow = () => {
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', descriptor);
  };
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  restoreWindow?.();
  restoreWindow = undefined;
  vi.restoreAllMocks();
});

const classLocator = (
  ruleKey: string,
  ordinal: number,
): PlannedGrantLocator => ({
  source: { kind: 'selected_class' },
  rule_key: ruleKey,
  ordinal,
});

const sourceLocator = (
  source: PlannedGrantLocator['source'],
  ruleKey: string,
  ordinal: number,
): PlannedGrantLocator => ({
  source,
  rule_key: ruleKey,
  ordinal,
});

const planned = (): LevelUpPlannedChoiceProjection => ({
  skills: [{
    locator: classLocator('scholar-skill', 1),
    source_label: 'Wizard — Scholar',
    source_catalog_layer: 'bundled',
    available_skills: ['arcana', 'history'],
  }],
  expertise: [{
    locator: classLocator('class_expertise_2', 1),
    source_label: 'Wizard — Scholar',
    source_catalog_layer: 'bundled',
    available_skills: ['arcana', 'history'],
  }],
  spells: [
    {
      kind: 'new_slot',
      locator: classLocator('wizard-prepared', 5),
      source_label: 'Wizard',
      source_catalog_layer: 'bundled',
      required: true,
    },
    {
      kind: 'spellbook_acquisition',
      locator: classLocator('wizard-spellbook', 7),
      source_label: 'Wizard spellbook',
      source_catalog_layer: 'bundled',
    },
    {
      kind: 'optional_swap',
      locator: classLocator('wizard-prepared', 1),
      source_label: 'Wizard',
      source_catalog_layer: 'bundled',
      current_spell_version_id: 41 as SpellVersionId,
      current_spell_name: 'Shield',
      current_spell_catalog_layer: 'external',
    },
  ],
});

function classOption(
  choices: LevelUpPlannedChoiceProjection = planned(),
  id = 11,
): LevelUpGuideableClassOption {
  return {
    guideability: 'guideable',
    class_definition_id: id as ClassDefinitionId,
    content_key: 'test:class:wizard' as ContentKey,
    name: 'Wizard',
    catalog_layer: 'bundled',
    rules_edition: '2024',
    current_level: 1 as ClassLevel,
    target_level: 2 as ClassLevel,
    hit_die: 6,
    current_subclass: null,
    multiclass_prerequisite_warning: null,
    gains: {
      current_class_level: 1 as ClassLevel,
      target_class_level: 2 as ClassLevel,
      current_total_level: 1 as CharacterLevel,
      target_total_level: 2 as CharacterLevel,
      hit_points: {
        kind: 'known',
        hit_die: 6,
        fixed_class_base: 4,
        constitution_modifier: 2,
        class_hit_point_change: 6,
        level_scaled_effects: [],
        current_maximum: 9,
        projected_maximum: { kind: 'known', value: 15 },
      },
      proficiency_bonus_change: null,
      target_features: {
        kind: 'sourced',
        features: [{
          kind: 'class_feature',
          name: 'Scholar',
          catalog_layer: 'bundled',
        }],
      },
    },
    applicable_steps: [
      'class',
      'gains',
      'skills',
      'expertise',
      'spells',
      'review',
      'complete',
    ],
    subclass_choice: null,
    feat_occurrence: null,
    planned_choices: choices,
  };
}

function ready(
  choices: LevelUpPlannedChoiceProjection = planned(),
): Extract<LevelUpStateResult, { readonly kind: 'ready' }> {
  return {
    kind: 'ready',
    character: {
      character_id: 7 as CharacterId,
      name: 'Planned Mage',
      revision: 4 as CharacterRevision,
      total_level: 1 as CharacterLevel,
      warnings: [],
    },
    class_options: [classOption(choices)],
    pending_epic_resolution: null,
  };
}

function sheet(level: number): CharacterSheet {
  const number = (id: string, label: string, value: number) => ({
    id,
    label,
    value,
    formula: 'Hand-authored W-DRAFT-FIDELITY fixture.',
  });
  return {
    character_id: 7,
    name: 'Planned Mage',
    total_level: level,
    proficiency_bonus: number('proficiency_bonus', 'Proficiency bonus', 2),
    ability_scores: [],
    class_hit_points_subtotal: number(
      'class_hit_points_subtotal',
      'Class hit points subtotal',
      level === 1 ? 9 : 15,
    ),
    species_hit_points: null,
    hit_point_maximum: number(
      'hit_point_maximum',
      'Hit point maximum',
      level === 1 ? 9 : 15,
    ),
    armor_class: {
      ...number('armor_class', 'Armor Class', 10),
      winner: { label: 'Unarmored', source: 'manual', expression: '10 + DEX', total: 10 },
      shields: [],
      bonuses: [],
      excluded: [],
      tie_break: null,
    },
    initiative: number('initiative', 'Initiative', 0),
    passive_perception: number('passive_perception', 'Passive Perception', 10),
    saves: [],
    skills: [],
    attacks_per_action: { count: 1, unresolved: [] },
    resources: [],
    spells: [],
    martial_arts: [],
    walking_speed: {
      kind: 'known', value: 30,
      detail: 'The species base speed plus every standing bonus.',
    },
    lineage_darkvision: null,
    lineage_damage_resistance: null,
    damage_resistances: [],
    unchosen_damage_resistances: [],
    classes: [{
      class_name: 'Wizard',
      level,
      hit_die: 6,
      is_starting_class: true,
      subclass_name: null,
      saving_throws: ['intelligence', 'wisdom'],
    }],
    catalog_sources: [],
    proficiencies: {
      armor_training: [],
      weapon_proficiencies: [],
      classes: [{ class_name: 'Wizard', via: 'initial' }],
      weapons: [],
    },
    armor: [],
    items: [],
    printed_features: [],
    flavor: {
      alignment: null,
      appearance: null,
      backstory: null,
      notes: null,
    },
    print_appendix_preferences: {
      flavor: false,
      spells: false,
      audit: false,
    },
    hit_point_rolls: [],
    equipment_packages: [],
    warnings: [],
    gaps: [],
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function click(view: HTMLElement, attribute: string): void {
  const control = interactiveElement(view).querySelector(`[${attribute}]`);
  if (control === null) throw new Error(`No control has ${attribute}.`);
  control.click();
}

function chooseSelect(view: HTMLElement, attribute: string, value: string): void {
  const control = interactiveElement(view).querySelector(`[${attribute}]`);
  if (control === null) throw new Error(`No select has ${attribute}.`);
  control.value = value;
  control.dispatchEvent(new Event('change'));
}

function choiceByLocator(
  view: HTMLElement,
  attribute: string,
  locator: PlannedGrantLocator,
): InteractiveTestElement {
  const key = plannedGrantLocatorKey(locator);
  const control = interactiveElement(view)
    .querySelectorAll(`[${attribute}]`)
    .find((candidate) => candidate.getAttribute(attribute) === key);
  if (control === undefined) {
    throw new Error(`No ${attribute} control has locator ${key}.`);
  }
  return control;
}

function chooseSelectByLocator(
  view: HTMLElement,
  attribute: string,
  locator: PlannedGrantLocator,
  value: string,
): void {
  const control = choiceByLocator(view, attribute, locator);
  control.value = value;
  control.dispatchEvent(new Event('change'));
}

function spellCard(
  view: HTMLElement,
  locator: PlannedGrantLocator,
): InteractiveTestElement {
  return choiceByLocator(view, LEVEL_UP_ATTR.spellChoice, locator);
}

function chooseRadio(view: HTMLElement, value: string): void {
  const control = interactiveElement(view).querySelector(`[value="${value}"]`);
  if (control === null) throw new Error(`No radio has value ${value}.`);
  control.checked = true;
  control.dispatchEvent(new Event('change'));
}

const eligible: EligibleSpell = {
  id: 91,
  name: 'Thunderwave',
  level: 1,
  school: 'Evocation',
  ritual: false,
  concentration: false,
  edition: '2024',
  catalog_layer: 'external',
};

const pickerFactory: SpellPickerFactory = (options) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = options.disabled;
  button.textContent = `Select ${options.label}`;
  button.setAttribute('aria-label', options.label);
  button.setAttribute('data-address-key', options.addressKey);
  button.addEventListener('click', () => options.onSelect(eligible));
  if (options.contextDescriptionId !== null) {
    button.setAttribute('aria-describedby', options.contextDescriptionId);
  }
  return {
    element: button,
    focus: () => button.focus(),
    destroy: () => undefined,
  };
};

describe('shared eligible spell picker provenance', () => {
  it('keeps a hostile persistent selected value inert with its exact layer', () => {
    const hostile = '</input><img data-ha10-selected-spell src=x>';
    const picker = createSpellPicker({
      addressKey: 'selected-hostile-spell',
      label: 'Chosen hostile spell',
      contextDescriptionId: null,
      value: hostile,
      valueCatalogLayer: 'external',
      freeTextValue: false,
      invalid: false,
      disabled: false,
      search: async () => [],
      onSelect: () => undefined,
    });
    const view = interactiveElement(picker.element);

    expect(view.querySelector('.spell-picker-input')?.value).toBe(hostile);
    expect(view.querySelector('.spell-picker-current-layer')?.textContent).toBe(
      'Homebrew · external layer',
    );
    expect(view.querySelector('[data-ha10-selected-spell]')).toBeNull();
    picker.destroy();
  });

  it('renders a hostile external spell inert with the exact disclosed layer', async () => {
    const hostile = '</strong><img data-ha10-spell-hostile src=x>';
    const picker = createSpellPicker({
      addressKey: 'hostile-spell',
      label: 'Choose hostile spell',
      contextDescriptionId: null,
      value: null,
      valueCatalogLayer: null,
      freeTextValue: false,
      invalid: false,
      disabled: false,
      search: async () => [{ ...eligible, name: hostile }],
      onSelect: () => undefined,
    });
    document.body.append(picker.element);

    picker.focus();
    await settle();
    expect(elementText(picker.element)).toContain(hostile);
    expect(
      elementText(
        interactiveElement(picker.element).querySelector(
          'small',
        )! as unknown as Node,
      ),
    ).toBe('L1 · Evocation · 2024 · Homebrew · external layer');
    expect(
      interactiveElement(picker.element).querySelector(
        '[data-ha10-spell-hostile]',
      ),
    ).toBeNull();
    picker.destroy();
  });
});

function epicBoonCandidate(key: string, name: string): LevelUpFeatCandidate {
  const eligibility = { status: 'qualified', reasons: [] } as const;
  return {
    catalog_layer: 'bundled',
    definition: {
      content_key: key as ContentKey,
      name,
      catalog_layer: 'bundled',
      grouping: 'epic_boon',
      min_level: 19 as CharacterLevel,
      ability_points: 1,
      ability_increase_abilities: 'any',
      ability_increase_maximum: 30,
      repeatable: false,
      prerequisites: [],
      grant_rules: [],
      notes: `${name} test benefit.`,
    },
    eligibility,
    is_class_default: false,
    applications: [{
      selection: {
        kind: 'feat',
        feat_content_key: key,
        config: {},
        ability_increases: [{ ability: 'wisdom', amount: 1 }],
      },
      plan: {
        feat_content_key: key as ContentKey,
        eligibility,
        config: {},
        effects: [{
          effect_kind: 'ability_increase',
          ability: 'wisdom',
          amount: 1,
          maximum: 30,
          label: `${name}: Ability Score Increase`,
          notes: null,
        }],
        grant_rules: [],
        text_benefits: [],
        undetermined_numbers: [],
      },
    }],
  };
}

describe('W-LU2-DRAFT planned Skills, Expertise, and Spells', () => {
  it('renders an external selected feat layer on its later planned-choice card', () => {
    const hostileFeatName = '</p><img data-ha10-feat-layer src=x>';
    const step = createPlannedSkillsStep({
      projections: [{
        locator: sourceLocator(
          { kind: 'selected_feat' },
          'external-feat-skill',
          1,
        ),
        source_label: hostileFeatName,
        source_catalog_layer: 'external',
        available_skills: ['arcana'],
      }],
      draft: { skills: [], expertise: [], spells: [] },
      onSelect: vi.fn(),
    });

    expect(elementText(step.element)).toContain(
      `Granted by ${hostileFeatName} — Homebrew · external layer.`,
    );
    expect(
      interactiveElement(step.element).querySelector('[data-ha10-feat-layer]'),
    ).toBeNull();
    step.cleanup();
  });

  it('W-DRAFT-FIDELITY carries named planned_subchoices through Review, Confirm, and Complete', async () => {
    const hostileSpell = '</dd><img data-ha10-level-spell src=x>';
    const hostilePickerFactory: SpellPickerFactory = (options) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Select ${options.label}`;
      button.addEventListener('click', () =>
        options.onSelect({ ...eligible, name: hostileSpell })
      );
      return {
        element: button,
        focus: () => button.focus(),
        destroy: () => undefined,
      };
    };
    const before = sheet(1);
    const after = sheet(2);
    const preview = vi.fn().mockResolvedValue({
      before,
      after,
      new_outstanding_choices: [],
      command_fingerprint: 'server-reviewed-planned-command',
    });
    const submit = vi.fn().mockResolvedValue({
      operation_uuid: 'level-up-operation',
      revision: 5,
      idempotent_replay: false,
    });
    const wizard = createLevelUpWizard({
      state: ready(),
      cancel: () => undefined,
      spellPickerFactory: hostilePickerFactory,
      preview,
      submit,
      loadSheet: vi.fn().mockResolvedValue(after),
      randomUuid: () => '51515151-5151-4151-8151-515151515151',
    });

    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'arcana');
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.expertiseChoice, 'history');
    click(wizard.element, LEVEL_UP_ATTR.next);
    for (const locator of [
      classLocator('wizard-prepared', 5),
      classLocator('wizard-spellbook', 7),
    ]) {
      spellCard(wizard.element, locator).querySelector('button')?.click();
    }
    click(wizard.element, LEVEL_UP_ATTR.next);
    await settle();

    const plannedSubchoices = {
      skills: [{ locator: classLocator('scholar-skill', 1), skill: 'arcana' }],
      expertise: [{
        locator: classLocator('class_expertise_2', 1),
        skill: 'history',
      }],
      spells: [
        {
          kind: 'slot_selection',
          locator: classLocator('wizard-prepared', 5),
          spell_version_id: 91,
          mode: 'new',
        },
        {
          kind: 'spellbook_acquisition',
          locator: classLocator('wizard-spellbook', 7),
          spell_version_id: 91,
        },
      ],
    } as const;
    expect(preview).toHaveBeenCalledWith(4, {
      type: 'level_up_class',
      class_definition_id: 11,
      target_level: 2,
      planned_subchoices: plannedSubchoices,
    });
    for (const text of [
      'Skill proficiency Arcana — Wizard — Scholar',
      'Expertise History — Wizard — Scholar',
      `Spell ${hostileSpell} — Wizard — Homebrew · external layer`,
      'New class feature Scholar',
    ]) {
      expect(elementText(wizard.element)).toContain(text);
    }
    expect(
      interactiveElement(wizard.element).querySelector('[data-ha10-level-spell]'),
    ).toBeNull();

    click(wizard.element, LEVEL_UP_ATTR.confirm);
    await settle();
    expect(submit).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ planned_subchoices: plannedSubchoices }),
      '51515151-5151-4151-8151-515151515151',
    );
    for (const text of [
      'Skill proficiency: Arcana — Wizard — Scholar.',
      'Expertise: History — Wizard — Scholar.',
      `Spell: ${hostileSpell} — Wizard — Homebrew · external layer.`,
      'New class feature: Scholar — SRD · bundled layer.',
    ]) {
      expect(elementText(wizard.element)).toContain(text);
    }
    expect(
      interactiveElement(wizard.element).querySelector('[data-ha10-level-spell]'),
    ).toBeNull();
    expect(wizard.element.getAttribute('aria-busy')).toBe('false');
    wizard.cleanup();
  });

  it('keeps colliding rule and ordinal locators distinct across source kinds and existing sources', () => {
    const locators: readonly PlannedGrantLocator[] = [
      sourceLocator({ kind: 'selected_class' }, 'colliding-grant', 1),
      sourceLocator({ kind: 'selected_class_subclass' }, 'colliding-grant', 1),
      sourceLocator({ kind: 'selected_feat' }, 'colliding-grant', 1),
      sourceLocator(
        { kind: 'existing_source', source_instance_id: 41 },
        'colliding-grant',
        1,
      ),
      sourceLocator(
        { kind: 'existing_source', source_instance_id: 42 },
        'colliding-grant',
        1,
      ),
    ];

    expect(new Set(locators.map(plannedGrantLocatorKey)).size).toBe(5);
  });

  it('renders source-labelled logical choices in order with named deferral text', () => {
    const wizard = createLevelUpWizard({
      state: ready(),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });

    expect(
      interactiveElement(wizard.element)
        .querySelectorAll(`[${LEVEL_UP_ATTR.step}]`)
        .map((step) => step.getAttribute(LEVEL_UP_ATTR.step)),
    ).toEqual([
      'class',
      'gains',
      'skills',
      'expertise',
      'spells',
      'review',
      'complete',
    ]);
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(wizard.element)).toContain(
      'Wizard — Scholar skill choice, rule scholar-skill, ordinal 1',
    );
    expect(elementText(wizard.element)).toContain('Rule scholar-skill, choice 1');
    expect(elementText(wizard.element)).toContain('Skill choice still needed');

    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'arcana');
    expect(
      interactiveElement(wizard.element)
        .querySelector(`[${LEVEL_UP_ATTR.warning}="skill_grant_unfilled"]`)
        ?.hidden,
    ).toBe(true);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(wizard.element)).toContain('Choose Expertise');
    expect(elementText(wizard.element)).toContain('active proficient skills');
    expect(elementText(wizard.element)).toContain('Expertise choice still needed');
    chooseSelect(wizard.element, LEVEL_UP_ATTR.expertiseChoice, 'history');
    click(wizard.element, LEVEL_UP_ATTR.next);

    const text = elementText(wizard.element);
    expect(text).toContain('New spell choice — Required');
    expect(text).toContain('Spellbook acquisition — Required');
    expect(text).toContain('Optional spell swap');
    expect(text).toContain('Keep Shield (no swap)');
    expect(text).toContain('generated durable choice remains unfilled and warned');
    expect(wizard.plannedSubchoices().spells).toEqual([]);
    wizard.cleanup();
  });

  it('keeps every logical locator selection only in the controller draft', () => {
    const wizard = createLevelUpWizard({
      state: ready(),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'arcana');
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.expertiseChoice, 'history');
    click(wizard.element, LEVEL_UP_ATTR.next);

    spellCard(wizard.element, classLocator('wizard-prepared', 5))
      .querySelector('button')?.click();
    spellCard(wizard.element, classLocator('wizard-spellbook', 7))
      .querySelector('button')?.click();

    expect(wizard.plannedSubchoices()).toEqual({
      skills: [{
        locator: classLocator('scholar-skill', 1),
        skill: 'arcana',
      }],
      expertise: [{
        locator: classLocator('class_expertise_2', 1),
        skill: 'history',
      }],
      spells: [
        {
          kind: 'slot_selection',
          locator: classLocator('wizard-prepared', 5),
          spell_version_id: 91,
          mode: 'new',
        },
        {
          kind: 'spellbook_acquisition',
          locator: classLocator('wizard-spellbook', 7),
          spell_version_id: 91,
        },
      ],
    });
    wizard.cleanup();
  });

  it('clears stale downstream spell and Expertise selections after upstream edits', () => {
    const wizard = createLevelUpWizard({
      state: ready(),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'arcana');
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.expertiseChoice, 'history');
    click(wizard.element, LEVEL_UP_ATTR.next);
    interactiveElement(wizard.element)
      .querySelector(`[${LEVEL_UP_ATTR.spellChoice}]`)
      ?.querySelector('button')
      ?.click();
    expect(wizard.plannedSubchoices().spells).toHaveLength(1);

    click(wizard.element, LEVEL_UP_ATTR.back);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.expertiseChoice, 'arcana');
    expect(wizard.plannedSubchoices().spells).toEqual([]);
    click(wizard.element, LEVEL_UP_ATTR.back);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'history');
    expect(wizard.plannedSubchoices()).toEqual({
      skills: [{
        locator: classLocator('scholar-skill', 1),
        skill: 'history',
      }],
      expertise: [],
      spells: [],
    });
    wizard.cleanup();
  });

  it('clears planned subchoices when an Epic Boon changes or is deferred', () => {
    const occurrence = {
      kind: 'epic_boon',
      candidates: [
        epicBoonCandidate('test:feat:boon-one', 'Boon One'),
        epicBoonCandidate('test:feat:boon-two', 'Boon Two'),
      ],
    } as const;
    const state = ready();
    const wizard = createLevelUpWizard({
      state: {
        ...state,
        class_options: [{
          ...classOption(),
          applicable_steps: [
            'class',
            'gains',
            'epic_boon',
            'skills',
            'expertise',
            'spells',
            'review',
            'complete',
          ],
          feat_occurrence: occurrence,
        }],
      },
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseRadio(wizard.element, 'test:feat:boon-one:0');
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelectByLocator(
      wizard.element,
      LEVEL_UP_ATTR.skillChoice,
      classLocator('scholar-skill', 1),
      'arcana',
    );
    expect(wizard.plannedSubchoices().skills).toHaveLength(1);

    click(wizard.element, LEVEL_UP_ATTR.back);
    chooseRadio(wizard.element, 'test:feat:boon-two:0');
    expect(wizard.plannedSubchoices()).toEqual({
      skills: [],
      expertise: [],
      spells: [],
    });

    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelectByLocator(
      wizard.element,
      LEVEL_UP_ATTR.skillChoice,
      classLocator('scholar-skill', 1),
      'history',
    );
    click(wizard.element, LEVEL_UP_ATTR.back);
    chooseRadio(wizard.element, 'defer_epic_boon');
    expect(wizard.plannedSubchoices()).toEqual({
      skills: [],
      expertise: [],
      spells: [],
    });
    wizard.cleanup();
  });

  it('clears the draft and removes stale planned steps when the class changes', () => {
    const noChoices: LevelUpPlannedChoiceProjection = {
      skills: [],
      expertise: [],
      spells: [],
    };
    const state = ready();
    const wizard = createLevelUpWizard({
      state: {
        ...state,
        class_options: [classOption(planned(), 11), classOption(noChoices, 12)],
      },
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    chooseRadio(wizard.element, '11');
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    chooseSelect(wizard.element, LEVEL_UP_ATTR.skillChoice, 'arcana');
    expect(wizard.plannedSubchoices().skills).toHaveLength(1);
    click(wizard.element, LEVEL_UP_ATTR.back);
    click(wizard.element, LEVEL_UP_ATTR.back);
    chooseRadio(wizard.element, '12');

    expect(wizard.plannedSubchoices()).toEqual({
      skills: [],
      expertise: [],
      spells: [],
    });
    expect(
      interactiveElement(wizard.element)
        .querySelectorAll(`[${LEVEL_UP_ATTR.step}]`)
        .map((step) => step.getAttribute(LEVEL_UP_ATTR.step)),
    ).toEqual(['class', 'gains', 'review', 'complete']);
    wizard.cleanup();
  });

  it('searches the exact locator and revision while the RPC spy stays command-free', async () => {
    const calls = vi.fn(async (method: string, params: unknown) => {
      if (method === LEVEL_UP_RPC.state) return ready();
      if (method === LEVEL_UP_RPC.plannedEligibleSpells) return [eligible];
      throw new Error(`Unexpected durable RPC ${method}: ${JSON.stringify(params)}`);
    });
    const root = document.createElement('div');
    const cleanup = await screen.render({
      root,
      route: parseRoute(new URL(
        '/characters/7/level-up',
        'https://level-up.test',
      )),
      router: { navigate: vi.fn() } as unknown as Router,
      rpc: { call: calls } as unknown as RpcClient,
      registerNavigationGuard: () => () => undefined,
    });
    click(root, LEVEL_UP_ATTR.next);
    click(root, LEVEL_UP_ATTR.next);
    chooseSelect(root, LEVEL_UP_ATTR.skillChoice, 'arcana');
    click(root, LEVEL_UP_ATTR.next);
    chooseSelect(root, LEVEL_UP_ATTR.expertiseChoice, 'arcana');
    click(root, LEVEL_UP_ATTR.next);
    const input = interactiveElement(root).querySelector('.spell-picker-input');
    input?.dispatchEvent(new Event('focus'));
    await Promise.resolve();
    await Promise.resolve();
    const option = interactiveElement(root).querySelector('[role="option"]');
    expect(option).not.toBeNull();
    option?.dispatchEvent(new Event('mousedown', { cancelable: true }));
    input?.dispatchEvent(new Event('blur'));
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, 130);
    });

    expect(calls.mock.calls).toEqual([
      [LEVEL_UP_RPC.state, { character_id: 7 }],
      [LEVEL_UP_RPC.plannedEligibleSpells, {
        character_id: 7,
        expected_revision: 4,
        class_definition_id: 11,
        target_class_level: 2,
        locator: classLocator('wizard-prepared', 5),
        query: '',
      }],
    ]);
    expect(input?.value).toBe('Thunderwave');
    cleanup?.();
  });

  it('moves focus through planned steps and pins their exact accessible names', () => {
    const wizard = createLevelUpWizard({
      state: ready(),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Choose skills');
    expect(
      interactiveElement(document.activeElement as unknown as Node).getAttribute('tabindex'),
    ).toBe('-1');
    const skill = choiceByLocator(
      wizard.element,
      LEVEL_UP_ATTR.skillChoice,
      classLocator('scholar-skill', 1),
    );
    expect(skill.getAttribute('aria-label')).toBe(
      'Wizard — Scholar skill choice, rule scholar-skill, ordinal 1',
    );
    const skillSource = interactiveElement(wizard.element)
      .querySelectorAll('.level-up-planned-source')
      .find((candidate) =>
        candidate.getAttribute('id') === skill.getAttribute('aria-describedby')
      );
    expect(skillSource?.textContent).toContain(
      'Granted by Wizard — Scholar — SRD · bundled layer.',
    );

    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Choose Expertise');
    const expertise = choiceByLocator(
      wizard.element,
      LEVEL_UP_ATTR.expertiseChoice,
      classLocator('class_expertise_2', 1),
    );
    expect(expertise.getAttribute('aria-label')).toBe(
      'Wizard — Scholar expertise choice, rule class_expertise_2, ordinal 1',
    );
    const expertiseSource = interactiveElement(wizard.element)
      .querySelectorAll('.level-up-planned-source')
      .find((candidate) =>
        candidate.getAttribute('id') === expertise.getAttribute('aria-describedby')
      );
    expect(expertiseSource?.textContent).toContain(
      'Granted by Wizard — Scholar — SRD · bundled layer.',
    );

    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Choose spells');
    expect(
      spellCard(wizard.element, classLocator('wizard-prepared', 5))
        .querySelector('button')?.getAttribute('aria-label'),
    ).toBe(
      'New spell choice — Required from Wizard',
    );
    const describedBy = spellCard(
      wizard.element,
      classLocator('wizard-prepared', 5),
    ).querySelector('button')?.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const description = spellCard(
      wizard.element,
      classLocator('wizard-prepared', 5),
    ).querySelector('.level-up-planned-source');
    expect(description?.getAttribute('id')).toBe(describedBy);
    expect(description?.textContent).toContain(
      'Granted by Wizard — SRD · bundled layer.',
    );
    wizard.cleanup();
  });

  it('addresses spell pickers and optional-swap radio groups by encoded locator identity', () => {
    const classSwap = {
      ...planned().spells[2]!,
      locator: sourceLocator({ kind: 'selected_class' }, 'colliding-swap', 1),
      current_spell_name: 'Shield',
    };
    const featSwap = {
      ...planned().spells[2]!,
      locator: sourceLocator({ kind: 'selected_feat' }, 'colliding-swap', 1),
      current_spell_name: 'Shield',
    };
    const swapsOnly: LevelUpPlannedChoiceProjection = {
      skills: [],
      expertise: [],
      spells: [featSwap, classSwap],
    };
    const wizard = createLevelUpWizard({
      state: ready(swapsOnly),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);

    for (const projection of [classSwap, featSwap]) {
      const card = spellCard(wizard.element, projection.locator);
      const encodedKey = encodeURIComponent(
        plannedGrantLocatorKey(projection.locator),
      );
      expect(card.querySelector('button')?.getAttribute('data-address-key')).toBe(
        `level-up-optional_swap-${encodedKey}`,
      );
      expect(
        card.querySelectorAll('[type="radio"]')
          .map((radio) => radio.getAttribute('name')),
      ).toEqual([
        `level-up-spell-mode-${encodedKey}`,
        `level-up-spell-mode-${encodedKey}`,
      ]);
    }
    const classReplace = spellCard(wizard.element, classSwap.locator)
      .querySelector('[value="replace"]');
    if (classReplace === null) throw new Error('Class swap has no Replace radio.');
    classReplace.checked = true;
    classReplace.dispatchEvent(new Event('change'));
    expect(document.activeElement).toBe(
      spellCard(wizard.element, classSwap.locator)
        .querySelector('[value="replace"]'),
    );
    wizard.cleanup();
  });

  it('supports an injected picker that selects synchronously during construction', () => {
    const requiredSpellOnly: LevelUpPlannedChoiceProjection = {
      skills: [],
      expertise: [],
      spells: [planned().spells[0]!],
    };
    const synchronousPickerFactory: SpellPickerFactory = (options) => {
      options.onSelect(eligible);
      const button = document.createElement('button');
      return {
        element: button,
        focus: () => button.focus(),
        destroy: () => undefined,
      };
    };
    const wizard = createLevelUpWizard({
      state: ready(requiredSpellOnly),
      cancel: () => undefined,
      spellPickerFactory: synchronousPickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(wizard.plannedSubchoices().spells).toEqual([{
      kind: 'slot_selection',
      locator: classLocator('wizard-prepared', 5),
      spell_version_id: 91,
      mode: 'new',
    }]);
    wizard.cleanup();
  });

  it('pins optional-swap radio and picker state and clears Replace selection on Keep', () => {
    const swapsOnly: LevelUpPlannedChoiceProjection = {
      skills: [],
      expertise: [],
      spells: [planned().spells[2]!],
    };
    const wizard = createLevelUpWizard({
      state: ready(swapsOnly),
      cancel: () => undefined,
      spellPickerFactory: pickerFactory,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_PANEL_ATTRIBUTE}="${LEVEL_UP_PANEL.spells}"]`,
      ),
    ).not.toBeNull();
    const locator = planned().spells[2]!.locator;
    let card = spellCard(wizard.element, locator);
    let keep = card.querySelector('[value="keep"]');
    let replace = card.querySelector('[value="replace"]');
    expect(keep?.getAttribute('checked')).toBe('');
    expect(replace?.getAttribute('checked')).toBeNull();
    expect(keep?.getAttribute('aria-label')).toBe('Keep Shield');
    expect(replace?.getAttribute('aria-label')).toBe('Replace Shield');
    expect(card.querySelector('button')?.disabled).toBe(true);
    expect(wizard.plannedSubchoices().spells).toEqual([]);

    chooseRadio(wizard.element, 'replace');
    card = spellCard(wizard.element, locator);
    keep = card.querySelector('[value="keep"]');
    replace = card.querySelector('[value="replace"]');
    expect(keep?.getAttribute('checked')).toBeNull();
    expect(replace?.getAttribute('checked')).toBe('');
    expect(card.querySelector('button')?.disabled).toBe(false);
    card.querySelector('button')?.click();
    expect(wizard.plannedSubchoices().spells).toEqual([{
      kind: 'slot_selection',
      locator,
      spell_version_id: 91,
      mode: 'replace',
    }]);

    chooseRadio(wizard.element, 'keep');
    card = spellCard(wizard.element, locator);
    expect(card.querySelector('[value="keep"]')?.getAttribute('checked')).toBe('');
    expect(card.querySelector('[value="replace"]')?.getAttribute('checked')).toBeNull();
    expect(card.querySelector('button')?.disabled).toBe(true);
    expect(wizard.plannedSubchoices().spells).toEqual([]);
    wizard.cleanup();
  });
});
