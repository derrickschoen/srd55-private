import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  LEVEL_UP_RPC,
  matchesLevelUpRoute,
  type LevelUpFeatApplication,
  type LevelUpFeatCandidate,
  type LevelUpFeatOccurrence,
  type LevelUpGuideableClassOption,
  type LevelUpPendingEpicResolution,
  type LevelUpPermanentWarning,
  type LevelUpStateResult,
  type LevelUpStep,
} from '../../../src/builder/level-up-wizard';
import type {
  CharacterId,
  CharacterLevelFeatChoiceId,
  CharacterRevision,
  ClassDefinitionId,
  ClassLevel,
  ContentKey,
  SubclassDefinitionId,
} from '../../../src/domain/ids';
import type { CharacterLevel } from '../../../src/domain/enums';
import type { RpcClient } from '../../../src/rpc/client';
import { parseRoute, Router } from '../../../src/ui/router';
import {
  renderGainsStep,
} from '../../../src/ui/screens/level-up/class-gains-steps';
import {
  createLevelUpWizard,
} from '../../../src/ui/screens/level-up/level-up-wizard';
import {
  returnToLevelUpLaunchSurface,
  screen,
} from '../../../src/ui/screens/level-up/screen';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
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

function route(path: string) {
  return parseRoute(new URL(path, 'https://level-up.test'));
}

function warning(kind: string, title: string): LevelUpPermanentWarning {
  return {
    kind,
    title,
    detail: `${title} detail from state.`,
    remedy: `${title} remedy from state.`,
  };
}

function classOption(options: {
  readonly id?: number;
  readonly name?: string;
  readonly current?: number;
  readonly steps?: readonly LevelUpStep[];
  readonly hp?: LevelUpGuideableClassOption['gains']['hit_points'];
  readonly subclass?: boolean;
  readonly featOccurrence?: LevelUpFeatOccurrence | null;
} = {}): LevelUpGuideableClassOption {
  const current = options.current ?? 1;
  return {
    guideability: 'guideable',
    class_definition_id: (options.id ?? 11) as ClassDefinitionId,
    content_key: `test:class:${options.name ?? 'wizard'}` as ContentKey,
    name: options.name ?? 'Wizard',
    rules_edition: '2024',
    current_level: current as ClassLevel,
    target_level: (current + 1) as ClassLevel,
    hit_die: 6,
    current_subclass: null,
    gains: {
      current_class_level: current as ClassLevel,
      target_class_level: (current + 1) as ClassLevel,
      current_total_level: current as CharacterLevel,
      target_total_level: (current + 1) as CharacterLevel,
      hit_points: options.hp ?? {
        kind: 'known',
        hit_die: 6,
        fixed_class_base: 4,
        constitution_modifier: 2,
        class_hit_point_change: 6,
        level_scaled_effects: [
          {
            label: 'Dwarven Toughness',
            current_contribution: 1,
            projected_contribution: 2,
            change: 1,
          },
        ],
        current_maximum: 9,
        projected_maximum: { kind: 'known', value: 16 },
      },
      proficiency_bonus_change: null,
      target_features: {
        kind: 'sourced',
        feature_names: ['Scholar'],
      },
    },
    applicable_steps: options.steps ?? ['class', 'gains', 'review', 'complete'],
    subclass_choice: options.subclass
      ? {
          options: [
            {
              subclass_definition_id: 31 as SubclassDefinitionId,
              content_key: 'test:subclass:abjurer' as ContentKey,
              name: 'Abjurer',
              rules_edition: '2024',
            },
          ],
        }
      : null,
    feat_occurrence: options.featOccurrence ?? null,
  };
}

function pendingEpicResolution(
  candidates: readonly LevelUpFeatCandidate[] = [],
): LevelUpPendingEpicResolution {
  return {
    deferred_choice: {
      character_level_feat_choice_id: 19 as CharacterLevelFeatChoiceId,
      class_definition_id: 11 as ClassDefinitionId,
      class_name: 'Wizard',
      class_level: 19 as ClassLevel,
    },
    additional_deferred_count: 0,
    warning: {
      key: 'epic_boon_deferred',
      category: 'outstanding_choice',
      title: 'Epic Boon choice still needed',
    },
    candidates,
    applicable_steps: ['epic_boon', 'review', 'complete'],
  };
}

function boonCandidate(options: {
  readonly key?: string;
  readonly name?: string;
  readonly status?: 'qualified' | 'unmet' | 'unprovable';
} = {}): LevelUpFeatCandidate {
  const key = options.key ?? '2024:feat:boon-of-fate';
  const status = options.status ?? 'qualified';
  const eligibility = status === 'qualified'
    ? { status, reasons: [] } as const
    : status === 'unmet'
      ? {
          status,
          reasons: [{ kind: 'minimum_level', minimum: 19 as CharacterLevel, actual: 18 as CharacterLevel }],
        } as const
      : {
          status,
          reasons: [{ kind: 'ability_score_unknown', abilities: ['wisdom'] as const, minimum: 13 }],
        } as const;
  const application: LevelUpFeatApplication = {
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
        label: 'Boon of Fate: Ability Score Increase',
        notes: null,
      }],
      grant_rules: [],
      text_benefits: [{
        benefit_key: 'improve-fate',
        label: 'Improve Fate',
        text: 'Returned Boon benefit text.',
        gap: 'epic_boon_benefit_text_only',
      }],
      undetermined_numbers: [],
    },
  };
  return {
    definition: {
      content_key: key as ContentKey,
      name: options.name ?? 'Boon of Fate',
      grouping: 'epic_boon',
      min_level: 19 as CharacterLevel,
      ability_points: 1,
      ability_increase_abilities: 'any',
      ability_increase_maximum: 30,
      repeatable: false,
      prerequisites: [],
      grant_rules: [],
      notes: 'Returned Boon benefit text.',
    },
    eligibility,
    is_class_default: false,
    applications: [application],
  };
}

function ready(options: {
  readonly classes?: Extract<LevelUpStateResult, { readonly kind: 'ready' }>['class_options'];
  readonly warnings?: readonly LevelUpPermanentWarning[];
  readonly pendingEpic?: boolean;
  readonly pendingEpicCandidates?: readonly LevelUpFeatCandidate[];
} = {}): Extract<LevelUpStateResult, { readonly kind: 'ready' }> {
  return {
    kind: 'ready',
    character: {
      character_id: 7 as CharacterId,
      name: 'Fixture Mage',
      revision: 4 as CharacterRevision,
      total_level: 1 as CharacterLevel,
      warnings: options.warnings ?? [],
    },
    class_options: options.classes ?? [classOption()],
    pending_epic_resolution: options.pendingEpic
      ? pendingEpicResolution(options.pendingEpicCandidates)
      : null,
  };
}

function click(view: HTMLElement, attribute: string): void {
  const control = interactiveElement(view).querySelector(`[${attribute}]`);
  if (control === null) {
    throw new Error(`No control has ${attribute}.`);
  }
  control.click();
}

function chooseRadio(view: HTMLElement, value: string): void {
  const control = interactiveElement(view).querySelector(`[value="${value}"]`);
  if (control === null) {
    throw new Error(`No radio has value ${value}.`);
  }
  control.checked = true;
  control.dispatchEvent(new Event('change'));
}

function stepNames(view: HTMLElement): readonly string[] {
  return interactiveElement(view)
    .querySelectorAll(`[${LEVEL_UP_ATTR.step}]`)
    .map((item) => item.getAttribute(LEVEL_UP_ATTR.step) ?? '');
}

function currentRailStep(view: HTMLElement): string | null {
  return interactiveElement(view)
    .querySelector('[aria-current="step"]')
    ?.getAttribute(LEVEL_UP_ATTR.step) ?? null;
}

describe('W-ROUTE-EXACT level-up route', () => {
  it('matches only the canonical positive-id level-up path', () => {
    expect(matchesLevelUpRoute('/characters/7/level-up')).toBe(7);
    for (const path of [
      '/characters/7/sheet',
      '/characters/7/print',
      '/characters/7',
      '/characters/0/level-up',
      '/characters/007/level-up',
      '/characters/7/level-up/',
      '/characters/7/level-up/review',
    ]) {
      expect(matchesLevelUpRoute(path), path).toBeNull();
    }
    expect(screen.matches(route('/characters/7/level-up'))).toBe(true);
    expect(screen.matches(route('/characters/7/sheet'))).toBe(false);
  });

  it('loads the exact character state once and returns cleanup', async () => {
    const state = ready({
      classes: [classOption({ id: 11 }), classOption({ id: 12 })],
    });
    const call = vi.fn().mockResolvedValue(state);
    const navigate = vi.fn();
    const root = document.createElement('div');
    const cleanup = await screen.render({
      root,
      route: route('/characters/7/level-up'),
      router: { navigate } as unknown as Router,
      rpc: { call } as unknown as RpcClient,
    });

    expect(call).toHaveBeenCalledOnce();
    expect(call).toHaveBeenCalledWith(LEVEL_UP_RPC.state, {
      character_id: 7,
    });
    expect(typeof cleanup).toBe('function');
    expect(elementText(document.activeElement as unknown as Node)).toBe(
      'Level up — Fixture Mage',
    );
    chooseRadio(root, '11');
    click(root, LEVEL_UP_ATTR.next);
    click(root, LEVEL_UP_ATTR.back);
    expect(call).toHaveBeenCalledOnce();
    cleanup?.();
  });
});

describe('W-STEP-SOURCE returned applicability', () => {
  it('orders only the Wizard 2 steps returned by state', () => {
    const wizard = createLevelUpWizard({
      state: ready({
        classes: [
          classOption({
            name: 'Wizard',
            current: 1,
            steps: ['complete', 'gains', 'class', 'review'],
          }),
        ],
      }),
      cancel: () => undefined,
    });

    expect(stepNames(wizard.element)).toEqual([
      'class',
      'gains',
      'review',
      'complete',
    ]);
    expect(stepNames(wizard.element)).not.toContain('feat');
    expect(stepNames(wizard.element)).not.toContain('epic_boon');
    wizard.cleanup();
  });

  it('renders a returned Fighter feat occurrence without matching its class name', () => {
    const wizard = createLevelUpWizard({
      state: ready({
        classes: [
          classOption({
            name: 'Unexpected Catalog Label',
            current: 5,
            steps: ['class', 'gains', 'feat', 'review', 'complete'],
          }),
        ],
      }),
      cancel: () => undefined,
    });

    expect(stepNames(wizard.element)).toEqual([
      'class',
      'gains',
      'feat',
      'review',
      'complete',
    ]);
    wizard.cleanup();
  });
});

describe('W-HP-UNKNOWN projected Gains', () => {
  it('withholds every projected HP number for a non-hit-die unknown input', () => {
    const view = renderGainsStep(classOption({
      hp: {
        kind: 'unknown',
        reason: 'undetermined_level_scaled_effect',
        missing_hit_dice: [],
      },
    }));
    const text = elementText(view);

    expect(text).toContain('HP change unknown');
    expect(text).toContain('level-scaled effect is undetermined');
    expect(text).not.toContain('d8');
    expect(text).not.toContain('Projected maximum HP');
    expect(text).not.toContain('16');
  });

  it('renders every asymmetric known Gains fixture field verbatim', () => {
    const fixture = {
      ...classOption({ name: 'Sentinel', current: 2 }),
      hit_die: 12,
      target_level: 4 as ClassLevel,
      gains: {
        current_class_level: 2 as ClassLevel,
        target_class_level: 4 as ClassLevel,
        current_total_level: 8 as CharacterLevel,
        target_total_level: 9 as CharacterLevel,
        hit_points: {
          kind: 'known',
          hit_die: 12,
          fixed_class_base: 17,
          constitution_modifier: -3,
          class_hit_point_change: 23,
          level_scaled_effects: [{
            label: 'Sentinel level-scaled effect',
            current_contribution: 29,
            projected_contribution: 31,
            change: -7,
          }],
          current_maximum: 37,
          projected_maximum: { kind: 'known', value: 41 },
        },
        proficiency_bonus_change: { current: 5, projected: 11 },
        target_features: {
          kind: 'sourced',
          feature_names: ['Sentinel feature alpha', 'Sentinel feature omega'],
        },
      },
    } satisfies LevelUpGuideableClassOption;
    const view = renderGainsStep(fixture);
    const facts = interactiveElement(view).querySelector('dl');
    expect(facts).not.toBeNull();
    const rows: string[][] = [];
    for (let index = 0; index < (facts?.children.length ?? 0); index += 2) {
      rows.push([
        elementText(facts!.children[index] as unknown as Node),
        elementText(facts!.children[index + 1] as unknown as Node),
      ]);
    }

    expect(
      elementText(interactiveElement(view).children[1] as unknown as Node),
    ).toBe('Sentinel 2 → 4; total level 8 → 9.');
    expect(rows).toEqual([
      ['Hit die', 'd12'],
      ['Fixed class base', '17'],
      ['Constitution modifier', '-3'],
      ['Class HP change (minimum 1)', '+23'],
      ['Sentinel level-scaled effect', '29 → 31 (-7)'],
      ['Current maximum HP', '37'],
      ['Projected maximum HP', '41'],
    ]);
    expect(
      interactiveElement(view)
        .querySelectorAll('p')
        .map((paragraph) => elementText(paragraph as unknown as Node)),
    ).toContain('Proficiency bonus: +5 → +11');
    expect(
      interactiveElement(view)
        .querySelectorAll('li')
        .map((item) => elementText(item as unknown as Node)),
    ).toEqual(['Sentinel feature alpha', 'Sentinel feature omega']);
  });
});

describe('W-FEAT-17 controller selection', () => {
  it('requires one qualified returned application before leaving an ASI occurrence', () => {
    const base = boonCandidate({
      key: '2024:feat:ability-score-improvement',
      name: 'Ability Score Improvement',
    });
    const asi: LevelUpFeatCandidate = {
      ...base,
      definition: {
        ...base.definition,
        grouping: 'general',
        min_level: 4 as CharacterLevel,
        ability_points: 2,
        ability_increase_maximum: 20,
      },
      is_class_default: true,
    };
    const wizard = createLevelUpWizard({
      state: ready({
        classes: [classOption({
          current: 3,
          steps: ['class', 'gains', 'feat', 'review', 'complete'],
          featOccurrence: { kind: 'asi_level_feat', candidates: [asi] },
        })],
      }),
      cancel: () => undefined,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(currentRailStep(wizard.element)).toBe('feat');
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(elementText(document.activeElement as unknown as Node)).toBe(
      'Choose a feat for this class level.',
    );
    chooseRadio(wizard.element, '2024:feat:ability-score-improvement:0');
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(currentRailStep(wizard.element)).toBe('review');
    wizard.cleanup();
  });
});

describe('W-FOCUS navigation and errors', () => {
  it('moves focus to each new heading after Next and Back', () => {
    const wizard = createLevelUpWizard({ state: ready(), cancel: () => undefined });
    wizard.focusInitial();
    expect(interactiveElement(document.activeElement as unknown as Node).tagName).toBe('h1');
    expect(
      interactiveElement(document.activeElement as unknown as Node).getAttribute('tabindex'),
    ).toBe('-1');
    expect(currentRailStep(wizard.element)).toBe('class');

    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Review level gains');
    expect(
      interactiveElement(document.activeElement as unknown as Node).getAttribute('tabindex'),
    ).toBe('-1');
    expect(currentRailStep(wizard.element)).toBe('gains');

    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Review');
    expect(currentRailStep(wizard.element)).toBe('review');

    click(wizard.element, LEVEL_UP_ATTR.back);
    expect(elementText(document.activeElement as unknown as Node)).toBe('Review level gains');
    expect(currentRailStep(wizard.element)).toBe('gains');
    wizard.cleanup();
  });

  it('focuses a labelled alert and retains the class surface on validation error', () => {
    const wizard = createLevelUpWizard({
      state: ready({ classes: [classOption({ id: 11 }), classOption({ id: 12 })] }),
      cancel: () => undefined,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);

    const alert = interactiveElement(wizard.element).querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(document.activeElement).toBe(alert);
    expect(alert?.getAttribute('tabindex')).toBe('-1');
    expect(elementText(alert as unknown as Node)).toContain('Choose a guideable held class');
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_PANEL_ATTRIBUTE}="${LEVEL_UP_PANEL.class}"]`,
      ),
    ).not.toBeNull();
    chooseRadio(wizard.element, '11');
    expect(
      interactiveElement(document.activeElement as unknown as Node).getAttribute('value'),
    ).toBe('11');
    expect(wizard.element.querySelector('[role="alert"]')).toBeNull();
    wizard.cleanup();
  });

  it('gives class and subclass controls exact accessible names', () => {
    const option = classOption({
      steps: ['class', 'gains', 'subclass', 'review', 'complete'],
      subclass: true,
    });
    const wizard = createLevelUpWizard({
      state: ready({ classes: [option] }),
      cancel: () => undefined,
    });
    const classRadio = interactiveElement(wizard.element).querySelector('[type="radio"]');
    expect(classRadio).not.toBeNull();
    expect(classRadio?.tagName).toBe('input');
    expect(classRadio?.getAttribute('aria-label')).toBe(
      'Wizard 1 → 2, 2024 rules, d6 hit die',
    );

    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    const subclassRadios = interactiveElement(wizard.element).querySelectorAll('[type="radio"]');
    expect(subclassRadios).toHaveLength(2);
    expect(
      subclassRadios.map((radio) => radio.getAttribute('aria-label')),
    ).toEqual([
      'Abjurer — Wizard, 2024 rules',
      'Decide later',
    ]);
    expect(elementText(wizard.element)).toContain('Abjurer — Wizard, 2024 rules');
    expect(elementText(wizard.element)).toContain('Decide later');
    wizard.cleanup();
  });

  it('marks exactly the current rail item with aria-current step', () => {
    const wizard = createLevelUpWizard({ state: ready(), cancel: () => undefined });
    const current = interactiveElement(wizard.element).querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute(LEVEL_UP_ATTR.step)).toBe('class');
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.back}]`)).toBeNull();
    wizard.cleanup();
  });
});

describe('D118 and D119 route choices', () => {
  it('offers both deferred Epic Boon paths without rendering boon cards', () => {
    const wizard = createLevelUpWizard({
      state: ready({ pendingEpic: true }),
      cancel: () => undefined,
    });
    const text = elementText(wizard.element);

    expect(text).toContain('Epic Boon choice still needed');
    expect(text).toContain('Resolve the Epic Boon now');
    expect(text).toContain('Proceed to the next level');
    expect(
      interactiveElement(wizard.element).querySelectorAll(
        '[name="pending-epic-path"]',
      ).map((control) => control.getAttribute('value')),
    ).toEqual(['resolve_now', 'next_level']);
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.featOption}]`)).toBeNull();
    chooseRadio(wizard.element, 'resolve_now');
    expect(
      interactiveElement(document.activeElement as unknown as Node).getAttribute('value'),
    ).toBe('resolve_now');
    expect(stepNames(wizard.element)).toEqual([
      'class',
      'epic_boon',
      'review',
      'complete',
    ]);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_PANEL_ATTRIBUTE}="${LEVEL_UP_PANEL.epicBoon}"]`,
      ),
    ).not.toBeNull();
    wizard.cleanup();
  });

  it('W-EPIC-DEFER carries an explicit defer choice and pinned warning into Review', () => {
    const occurrence: LevelUpFeatOccurrence = {
      kind: 'epic_boon',
      candidates: [boonCandidate()],
    };
    const wizard = createLevelUpWizard({
      state: ready({
        classes: [classOption({
          current: 18,
          steps: ['class', 'gains', 'epic_boon', 'review', 'complete'],
          featOccurrence: occurrence,
        })],
      }),
      cancel: () => undefined,
    });

    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(elementText(wizard.element)).toContain('Choose an Epic Boon');
    expect(elementText(wizard.element)).toContain('Decide later');
    chooseRadio(wizard.element, 'defer_epic_boon');
    expect(elementText(wizard.element)).toContain('Epic Boon choice still needed');
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(currentRailStep(wizard.element)).toBe('review');
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_ATTR.warning}="epic_boon_deferred"]`,
      ),
    ).not.toBeNull();
    expect(elementText(wizard.element)).toContain('Epic Boon choice still needed');
    wizard.cleanup();
  });

  it('renders qualified Boon cards in the no-level resolution pass with the exact rail', () => {
    const qualifiedBoon = boonCandidate();
    const unprovableBoon = boonCandidate({
      key: '2024:feat:boon-of-truesight',
      name: 'Boon of Truesight',
      status: 'unprovable',
    });
    const wizard = createLevelUpWizard({
      state: ready({
        pendingEpic: true,
        pendingEpicCandidates: [qualifiedBoon, unprovableBoon],
      }),
      cancel: () => undefined,
    });
    chooseRadio(wizard.element, 'resolve_now');
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(stepNames(wizard.element)).toEqual(['epic_boon', 'review', 'complete']);
    expect(stepNames(wizard.element)).not.toContain('class');
    expect(stepNames(wizard.element)).not.toContain('gains');
    expect(elementText(wizard.element)).toContain('Returned Boon benefit text.');
    const unprovableCard = interactiveElement(wizard.element).querySelector(
      '[data-level-up-feat-card="2024:feat:boon-of-truesight"]',
    );
    expect(unprovableCard).toBeNull();
    chooseRadio(wizard.element, '2024:feat:boon-of-fate:0');
    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(currentRailStep(wizard.element)).toBe('review');
    expect(elementText(wizard.element)).not.toContain('level 20 complete');
    wizard.cleanup();
  });

  it('keeps the pinned deferred warning visible while proceeding to the next level', () => {
    const wizard = createLevelUpWizard({
      state: ready({
        pendingEpic: true,
        pendingEpicCandidates: [boonCandidate()],
      }),
      cancel: () => undefined,
    });
    chooseRadio(wizard.element, 'next_level');
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(currentRailStep(wizard.element)).toBe('gains');
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_ATTR.warning}="epic_boon_deferred"]`,
      ),
    ).not.toBeNull();
    expect(elementText(wizard.element)).toContain('Epic Boon choice still needed');
    wizard.cleanup();
  });

  it('renders a disabled class explanation with no selection control', () => {
    const state = ready({
      classes: [
        {
          guideability: 'disabled',
          class_definition_id: 44 as ClassDefinitionId,
          content_key: 'test:class:no-die' as ContentKey,
          name: 'Unrecorded Class',
          rules_edition: '2024',
          current_level: 2 as ClassLevel,
          hit_die: null,
          current_subclass: null,
          reason: 'missing_hit_die',
          explanation: 'Fixed HP cannot be derived until the hit die is catalogued.',
        },
      ],
    });
    const wizard = createLevelUpWizard({ state, cancel: () => undefined });
    const card = interactiveElement(wizard.element).querySelector(
      `[${LEVEL_UP_ATTR.classOption}="44"]`,
    );

    expect(card).not.toBeNull();
    expect(card?.tagName).toBe('article');
    expect(card?.getAttribute('tabindex')).toBe('0');
    expect(card?.querySelector('input')).toBeNull();
    expect(elementText(card as unknown as Node)).toContain('Fixed HP cannot be derived');
    wizard.cleanup();
  });

  it('renders no-guideable-class as an explanatory terminal with All characters', () => {
    const state: LevelUpStateResult = {
      kind: 'no_guideable_class',
      character: {
        character_id: 7 as CharacterId,
        name: 'No Die Character',
        revision: 1 as CharacterRevision,
        total_level: 2 as CharacterLevel,
        warnings: [],
      },
      explanation: 'No held class has a recorded hit die.',
      class_options: [
        {
          guideability: 'disabled',
          class_definition_id: 44 as ClassDefinitionId,
          content_key: 'test:class:no-die' as ContentKey,
          name: 'Unrecorded Class',
          rules_edition: '2024',
          current_level: 2 as ClassLevel,
          hit_die: null,
          current_subclass: null,
          reason: 'missing_hit_die',
          explanation: 'Fixed HP cannot be derived.',
        },
      ],
      pending_epic_resolution: null,
    };
    const wizard = createLevelUpWizard({ state, cancel: () => undefined });

    expect(elementText(wizard.element)).toContain('No held class can be guided');
    expect(elementText(wizard.element)).toContain('All characters');
    expect(wizard.element.querySelector('input')).toBeNull();
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.next}]`)).toBeNull();
    wizard.cleanup();
  });

  it.each([
    {
      label: 'no-guideable-class',
      state: {
        kind: 'no_guideable_class',
        character: {
          character_id: 7 as CharacterId,
          name: 'No Die Epic Character',
          revision: 1 as CharacterRevision,
          total_level: 19 as CharacterLevel,
          warnings: [],
        },
        explanation: 'No held class has a recorded hit die.',
        class_options: [{
          guideability: 'disabled',
          class_definition_id: 44 as ClassDefinitionId,
          content_key: 'test:class:no-die' as ContentKey,
          name: 'Unrecorded Class',
          rules_edition: '2024',
          current_level: 19 as ClassLevel,
          hit_die: null,
          current_subclass: null,
          reason: 'missing_hit_die',
          explanation: 'Fixed HP cannot be derived.',
        }],
        pending_epic_resolution: pendingEpicResolution(),
      } satisfies LevelUpStateResult,
    },
    {
      label: 'maximum-level',
      state: {
        kind: 'maximum_level',
        character: {
          character_id: 7 as CharacterId,
          name: 'Maximum Epic Character',
          revision: 20 as CharacterRevision,
          total_level: 20,
          warnings: [],
        },
        held_classes: [],
        pending_epic_resolution: pendingEpicResolution(),
      } satisfies LevelUpStateResult,
    },
  ])('keeps the deferred Epic resolution path reachable from $label without rendering boon cards', ({ state }) => {
    const wizard = createLevelUpWizard({ state, cancel: () => undefined });

    expect(elementText(wizard.element)).toContain('Resolve the Epic Boon now');
    expect(
      interactiveElement(wizard.element)
        .querySelector('[name="pending-epic-path"]')
        ?.getAttribute('value'),
    ).toBe('resolve_now');
    expect(
      interactiveElement(wizard.element).querySelector('[value="next_level"]'),
    ).toBeNull();
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.featOption}]`)).toBeNull();

    click(wizard.element, LEVEL_UP_ATTR.next);
    expect(
      wizard.element.querySelector(
        `[${LEVEL_UP_PANEL_ATTRIBUTE}="${LEVEL_UP_PANEL.epicBoon}"]`,
      ),
    ).not.toBeNull();
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.featOption}]`)).toBeNull();
    wizard.cleanup();
  });
});

describe('§3.1 Cancel returns to its launch surface', () => {
  it('uses browser Back for a same-origin in-app launch and the sheet fallback for direct entry', () => {
    const back = vi.fn();
    const fallback = vi.fn();
    const location = {
      href: 'https://level-up.test/characters/7/sheet',
      origin: 'https://level-up.test',
    };
    const history = {
      state: null as unknown,
      pushState(state: unknown, _unused: string, url: URL): void {
        this.state = state;
        location.href = String(url);
      },
      replaceState(state: unknown, _unused: string, url: URL): void {
        this.state = state;
        location.href = String(url);
      },
      back,
    };
    const router = new Router({
      location,
      history,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window);
    router.navigate('/characters/7/level-up');
    returnToLevelUpLaunchSurface({
      historyState: history.state,
      currentOrigin: location.origin,
      back: () => history.back(),
      fallback,
    });
    expect(back).toHaveBeenCalledOnce();
    expect(fallback).not.toHaveBeenCalled();

    back.mockClear();
    returnToLevelUpLaunchSurface({
      historyState: null,
      currentOrigin: 'https://level-up.test',
      back,
      fallback,
    });
    expect(back).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledOnce();
  });
});

describe('static route states', () => {
  it('renders not-found with only an All characters remedy', () => {
    const wizard = createLevelUpWizard({
      state: { kind: 'not_found', character_id: 404 as CharacterId },
      cancel: () => undefined,
    });
    expect(elementText(wizard.element)).toContain('Character not found');
    expect(elementText(wizard.element)).toContain('All characters');
    expect(wizard.element.querySelector('button')).toBeNull();
    wizard.cleanup();
  });

  it('renders classless state with the advanced planner door and no command control', () => {
    const wizard = createLevelUpWizard({
      state: {
        kind: 'no_held_class',
        character: {
          character_id: 7 as CharacterId,
          name: 'Classless Fixture',
          revision: 1 as CharacterRevision,
          total_level: null,
          warnings: [],
        },
      },
      cancel: () => undefined,
    });
    const text = elementText(wizard.element);
    expect(text).toContain('This character has no held class');
    expect(text).toContain('Advanced: open planner');
    expect(text).toContain('All characters');
    expect(wizard.element.querySelector('button')).toBeNull();
    wizard.cleanup();
  });

  it('renders maximum level with a sheet remedy and no next action', () => {
    const wizard = createLevelUpWizard({
      state: {
        kind: 'maximum_level',
        character: {
          character_id: 7 as CharacterId,
          name: 'Maximum Fixture',
          revision: 20 as CharacterRevision,
          total_level: 20,
          warnings: [],
        },
        held_classes: [],
        pending_epic_resolution: null,
      },
      cancel: () => undefined,
    });
    expect(elementText(wizard.element)).toContain('Maximum level reached');
    expect(elementText(wizard.element)).toContain('Open character sheet');
    expect(wizard.element.querySelector(`[${LEVEL_UP_ATTR.next}]`)).toBeNull();
    wizard.cleanup();
  });
});

describe('in-memory draft loss', () => {
  it('Cancel invokes navigation without a write and a new controller starts fresh', () => {
    const cancel = vi.fn();
    const state = ready({
      classes: [classOption({ id: 11 }), classOption({ id: 12 })],
    });
    const first = createLevelUpWizard({ state, cancel });
    chooseRadio(first.element, '12');
    click(first.element, LEVEL_UP_ATTR.cancel);
    expect(cancel).toHaveBeenCalledOnce();
    first.cleanup();

    const reloaded = createLevelUpWizard({ state, cancel: () => undefined });
    const checked = interactiveElement(reloaded.element)
      .querySelectorAll('[type="radio"]')
      .filter(
        (control: InteractiveTestElement) =>
          control.getAttribute('checked') !== null,
      );
    expect(checked).toHaveLength(0);
    reloaded.cleanup();
  });

  it('surfaces the named subclass warning supplied by state', () => {
    const wizard = createLevelUpWizard({
      state: ready({
        classes: [classOption({
          steps: ['class', 'gains', 'subclass', 'review', 'complete'],
          subclass: true,
        })],
        warnings: [warning('subclass_unselected', 'Subclass choice still needed')],
      }),
      cancel: () => undefined,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(elementText(wizard.element)).toContain('Subclass choice still needed');
    expect(elementText(wizard.element)).toContain('detail from state');
    wizard.cleanup();
  });

  it('keeps an empty subclass catalog traversable with a Continue action', () => {
    const emptySubclass = {
      ...classOption({
        steps: ['class', 'gains', 'subclass', 'review', 'complete'],
        subclass: true,
      }),
      subclass_choice: { options: [] },
    } satisfies LevelUpGuideableClassOption;
    const wizard = createLevelUpWizard({
      state: ready({ classes: [emptySubclass] }),
      cancel: () => undefined,
    });
    click(wizard.element, LEVEL_UP_ATTR.next);
    click(wizard.element, LEVEL_UP_ATTR.next);

    expect(elementText(wizard.element)).toContain('No subclass options are available');
    const next = interactiveElement(wizard.element).querySelector(
      `[${LEVEL_UP_ATTR.next}]`,
    );
    expect(elementText(next as unknown as Node)).toBe('Continue');
    next?.click();
    expect(elementText(document.activeElement as unknown as Node)).toBe('Review');
    wizard.cleanup();
  });
});
