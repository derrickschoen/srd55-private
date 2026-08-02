import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  levelUpWarningPresentation,
  type LevelUpPermanentWarning,
  type LevelUpPreviewResult,
  type LevelUpTargetFeatures,
} from '../../../builder/level-up-wizard';
import type { CharacterSheet } from '../../../queries/character-sheet-builder';
import { element, listen, type Cleanup } from '../../dom';

export interface LevelUpDraftReview {
  readonly subclass:
    | { readonly kind: 'selected'; readonly name: string }
    | {
        readonly kind: 'deferred';
        readonly class_name: string;
        readonly target_level: number;
      }
    | null;
  readonly feats: readonly string[];
  readonly skills: readonly string[];
  readonly expertise: readonly string[];
  readonly spells: readonly string[];
  readonly new_class_features: LevelUpTargetFeatures;
}

function valueChange(
  label: string,
  before: number | null,
  after: number | null,
): HTMLDivElement {
  return element('div', { className: 'level-up-review-change' }, [
    element('dt', { text: label }),
    element('dd', {
      text: before === null || after === null
        ? 'Unknown'
        : `${String(before)} → ${String(after)}`,
    }),
  ]);
}

function classChanges(
  before: CharacterSheet,
  after: CharacterSheet,
): readonly HTMLElement[] {
  const beforeLevels = new Map(
    before.classes.map((entry) => [entry.class_name, entry.level]),
  );
  return after.classes
    .filter(
      (entry) => beforeLevels.get(entry.class_name) !== entry.level,
    )
    .map((entry) =>
      valueChange(
        `${entry.class_name} level`,
        beforeLevels.get(entry.class_name) ?? 0,
        entry.level,
      ),
    );
}

function warningList(
  warnings: readonly LevelUpPermanentWarning[],
): HTMLElement {
  if (warnings.length === 0) {
    return element('p', { text: 'No new outstanding choices.' });
  }
  return element(
    'ul',
    { className: 'level-up-review-warnings' },
    warnings.map((warning) =>
      element('li', { attributes: { [LEVEL_UP_ATTR.warning]: warning.kind } }, [
        element('strong', { text: warning.title }),
        element('p', { text: warning.detail }),
        element('p', { text: warning.remedy }),
      ]),
    ),
  );
}

function deferredSubclassWarning(
  draft: LevelUpDraftReview,
): LevelUpPermanentWarning | null {
  if (draft.subclass?.kind !== 'deferred') return null;
  const presentation = levelUpWarningPresentation('subclass_unselected');
  return {
    kind: presentation.key,
    title: presentation.title,
    detail:
      `${draft.subclass.class_name} level ${String(draft.subclass.target_level)} ` +
      'will be saved without a subclass selection.',
    remedy:
      `Choose a ${draft.subclass.class_name} subclass in the planner when one ` +
      'is available.',
  };
}

function reviewWarnings(options: {
  readonly preview: LevelUpPreviewResult;
  readonly retainedWarnings: readonly LevelUpPermanentWarning[];
  readonly draft: LevelUpDraftReview;
}): readonly LevelUpPermanentWarning[] {
  const warnings = [
    ...options.retainedWarnings,
    ...options.preview.new_outstanding_choices,
  ];
  const subclass = deferredSubclassWarning(options.draft);
  if (
    subclass !== null &&
    !options.preview.new_outstanding_choices.some(
      (warning) => warning.kind === subclass.kind,
    )
  ) {
    warnings.push(subclass);
  }
  return warnings;
}

function namedDraftRows(
  label: string,
  values: readonly string[],
): readonly HTMLDivElement[] {
  return values.map((value) =>
    element('div', { className: 'level-up-review-change' }, [
      element('dt', { text: label }),
      element('dd', { text: value }),
    ]),
  );
}

function draftRows(draft: LevelUpDraftReview): readonly HTMLDivElement[] {
  const subclass = draft.subclass === null
    ? []
    : [
        element('div', { className: 'level-up-review-change' }, [
          element('dt', { text: 'Subclass' }),
          element('dd', {
            text: draft.subclass.kind === 'selected'
              ? draft.subclass.name
              : 'Decide later',
          }),
        ]),
      ];
  const features = draft.new_class_features.kind === 'sourced'
    ? draft.new_class_features.feature_names.length === 0
      ? namedDraftRows('New class features', ['None returned for this level'])
      : namedDraftRows(
          'New class feature',
          draft.new_class_features.feature_names,
        )
    : namedDraftRows('New class features', ['Unavailable from source data']);
  return [
    ...subclass,
    ...namedDraftRows('Feat', draft.feats),
    ...namedDraftRows('Skill proficiency', draft.skills),
    ...namedDraftRows('Expertise', draft.expertise),
    ...namedDraftRows('Spell', draft.spells),
    ...features,
  ];
}

function draftGainLines(draft: LevelUpDraftReview): readonly string[] {
  return draftRows(draft).map((row) => {
    const term = row.querySelector('dt')?.textContent ?? 'Gain';
    const detail = row.querySelector('dd')?.textContent ?? '';
    return `${term}: ${detail}.`;
  });
}

export function renderReviewLoading(): HTMLElement {
  return element(
    'section',
    {
      className: 'level-up-panel',
      attributes: {
        [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.review,
        'aria-busy': 'true',
      },
    },
    [
      element('h2', { text: 'Review' }),
      element('p', {
        text: 'Preparing a fresh rollback preview…',
        attributes: { role: 'status', 'aria-live': 'polite' },
      }),
    ],
  );
}

export function renderReviewFailure(options: {
  readonly stale: boolean;
  readonly reloadState: () => void;
  readonly retryPreview: () => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const action = element('button', {
    text: options.stale ? 'Reload level-up state' : 'Retry preview',
    attributes: {
      type: 'button',
      ...(options.stale
        ? { 'data-level-up-reload-state': '' }
        : { 'data-level-up-retry-preview': '' }),
    },
  });
  const cleanup = listen(
    action,
    'click',
    options.stale ? options.reloadState : options.retryPreview,
  );
  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.review },
      },
      [
        element('h2', { text: 'Review' }),
        element('p', {
          text: options.stale
            ? 'Reload the current character before preparing another preview.'
            : 'No character data was changed. You can retry this rollback preview.',
        }),
        action,
      ],
    ),
    cleanup,
  };
}

export function renderReview(options: {
  readonly preview: LevelUpPreviewResult;
  readonly draft: LevelUpDraftReview;
  readonly retainedWarnings: readonly LevelUpPermanentWarning[];
  readonly stale: boolean;
  readonly reloadState: () => void;
}): { readonly element: HTMLElement; readonly cleanup: Cleanup } {
  const { before, after } = options.preview;
  const changes = [
    valueChange('Total level', before.total_level, after.total_level),
    ...classChanges(before, after),
    valueChange('Hit point maximum', before.hit_points.value, after.hit_points.value),
    valueChange(
      'Proficiency bonus',
      before.proficiency_bonus.value,
      after.proficiency_bonus.value,
    ),
  ];
  const reload = options.stale
    ? element('button', {
        text: 'Reload level-up state',
        attributes: { type: 'button', 'data-level-up-reload-state': '' },
      })
    : null;
  const cleanup = reload === null
    ? () => undefined
    : listen(reload, 'click', options.reloadState);
  return {
    element: element(
      'section',
      {
        className: 'level-up-panel',
        attributes: {
          [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.review,
          'data-level-up-review-fingerprint': options.preview.command_fingerprint,
        },
      },
      [
        element('h2', { text: 'Review' }),
        element('dl', { className: 'level-up-facts' }, changes),
        element('h3', { text: 'Draft choices and gains' }),
        element('dl', { className: 'level-up-facts' }, draftRows(options.draft)),
        element('h3', { text: 'Outstanding warnings' }),
        warningList(reviewWarnings(options)),
        ...(reload === null ? [] : [reload]),
      ],
    ),
    cleanup,
  };
}

export function appendSubmittingStatus(root: HTMLElement): HTMLElement {
  const status = element('p', {
    className: 'level-up-submitting',
    text: 'Submitting this level-up operation…',
    attributes: {
      role: 'status',
      'aria-live': 'assertive',
      tabindex: '-1',
    },
  });
  root.setAttribute('aria-busy', 'true');
  root.append(status);
  status.focus();
  for (const selector of ['button', 'input', 'select'] as const) {
    for (const control of Array.from(root.querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLSelectElement
    >(selector))) {
      control.disabled = true;
    }
  }
  return status;
}

export function clearSubmittingStatus(root: HTMLElement): void {
  root.setAttribute('aria-busy', 'false');
}

function completeWarnings(
  options: {
    readonly preview: LevelUpPreviewResult;
    readonly draft: LevelUpDraftReview;
    readonly retainedWarnings: readonly LevelUpPermanentWarning[];
  },
  sheet: CharacterSheet,
): readonly string[] {
  return [
    ...reviewWarnings(options).map(
      (warning) => `${warning.title}: ${warning.detail}`,
    ),
    ...sheet.warnings.map((warning) => warning.message),
    ...sheet.gaps.map((gap) => `${gap.title}: ${gap.detail}`),
  ];
}

export function renderComplete(options: {
  readonly preview: LevelUpPreviewResult;
  readonly draft: LevelUpDraftReview;
  readonly sheet: CharacterSheet;
  readonly resolution: boolean;
  readonly retainedWarnings: readonly LevelUpPermanentWarning[];
}): HTMLElement {
  const changedClasses = options.sheet.classes.filter((entry) => {
    const before = options.preview.before.classes.find(
      (candidate) => candidate.class_name === entry.class_name,
    );
    return before?.level !== entry.level;
  });
  const heading = options.resolution
    ? 'Epic Boon choice complete'
    : changedClasses.length === 1
      ? `${changedClasses[0]?.class_name ?? 'Class'} level ${String(changedClasses[0]?.level ?? options.sheet.total_level ?? '')} complete`
      : `Level ${String(options.sheet.total_level ?? '')} complete`;
  const gains = [
    ...changedClasses.map(
      (entry) => `${entry.class_name} is now level ${String(entry.level)}.`,
    ),
    ...(options.preview.before.hit_points.value === options.sheet.hit_points.value
      ? []
      : [`Hit point maximum is now ${String(options.sheet.hit_points.value)}.`]),
    ...(options.preview.before.proficiency_bonus.value ===
    options.sheet.proficiency_bonus.value
      ? []
      : [
          options.sheet.proficiency_bonus.value === null
            ? 'Proficiency bonus is undetermined.'
            : `Proficiency bonus is now +${String(options.sheet.proficiency_bonus.value)}.`,
        ]),
    ...draftGainLines(options.draft),
  ];
  if (options.resolution) {
    gains.push('The selected Epic Boon was applied without changing total or class levels.');
  }
  const warnings = completeWarnings(options, options.sheet);
  const completeHeading = element('h2', {
    text: heading,
    attributes: { tabindex: '-1' },
  });
  const view = element(
    'section',
    {
      className: 'level-up-panel level-up-complete',
      attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: LEVEL_UP_PANEL.complete },
    },
    [
      completeHeading,
      element('h3', { text: 'Applied gains' }),
      element(
        'ul',
        {},
        gains.map((gain) => element('li', { text: gain })),
      ),
      element('h3', { text: 'Outstanding warnings' }),
      warnings.length === 0
        ? element('p', { text: 'No outstanding warnings.' })
        : element(
            'ul',
            {},
            warnings.map((warning) => element('li', { text: warning })),
          ),
      element('a', {
        text: 'Open character sheet',
        attributes: {
          href: `/characters/${String(options.sheet.character_id)}/sheet`,
          'data-router-link': '',
        },
      }),
    ],
  );
  completeHeading.focus();
  return view;
}
