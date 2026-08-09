import {
  LEVEL_UP_ATTR,
  LEVEL_UP_PANEL,
  LEVEL_UP_PANEL_ATTRIBUTE,
  type LevelUpStateResult,
  type LevelUpStep,
} from '../../../builder/level-up-wizard';
import { guidedBuildPath } from '../../../builder/contracts';
import { element, listen, type Cleanup } from '../../dom';
import { renderDisabledClassOption } from './class-gains-steps';

const STEP_LABELS: Readonly<Record<LevelUpStep, string>> = Object.freeze({
  class: 'Class',
  gains: 'Gains',
  subclass: 'Subclass',
  feat: 'Feat',
  epic_boon: 'Epic Boon',
  skills: 'Skills',
  expertise: 'Expertise',
  spells: 'Spells',
  review: 'Review',
  complete: 'Complete',
});

export interface LevelUpNavigation {
  readonly back?: () => void;
  readonly next?: () => void;
  readonly nextLabel?: string;
  readonly nextKind?: 'next' | 'confirm';
  readonly cancel?: () => void;
}

export interface LevelUpFrame {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
  readonly routeHeading: HTMLHeadingElement;
  readonly stepHeading: HTMLHeadingElement;
  readonly alert: HTMLElement | null;
}

function routerLink(label: string, href: string): HTMLAnchorElement {
  return element('a', {
    text: label,
    attributes: { href, 'data-router-link': '' },
  });
}

function characterListLink(): HTMLAnchorElement {
  return routerLink('All characters', '/');
}

function terminalShell(
  heading: string,
  panel: HTMLElement,
): HTMLElement {
  const routeHeading = element('h1', {
    text: heading,
    attributes: { tabindex: '-1' },
  });
  panel.querySelector('h2')?.setAttribute('tabindex', '-1');
  return element('main', { className: 'level-up-shell' }, [
    element('header', { className: 'level-up-header' }, [routeHeading]),
    panel,
  ]);
}

export function renderLevelUpLoading(): HTMLElement {
  return element(
    'main',
    {
      className: 'level-up-shell',
      attributes: { 'aria-busy': 'true' },
    },
    [
      element('header', { className: 'level-up-header' }, [
        element('h1', { text: 'Level up', attributes: { tabindex: '-1' } }),
      ]),
      element('p', {
        text: 'Loading level-up state…',
        attributes: { role: 'status', 'aria-live': 'polite' },
      }),
    ],
  );
}

function terminalPanel(
  panelName: string,
  heading: string,
  body: string,
  links: readonly HTMLAnchorElement[],
  extra: readonly Node[] = [],
): HTMLElement {
  return element(
    'section',
    {
      className: 'level-up-panel level-up-terminal',
      attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: panelName },
    },
    [
      element('h2', { text: heading }),
      element('p', { text: body }),
      ...extra,
      element(
        'nav',
        { className: 'level-up-terminal-nav', attributes: { 'aria-label': 'Level up navigation' } },
        links,
      ),
    ],
  );
}

function disabledClassExplanations(
  state: Extract<LevelUpStateResult, { readonly kind: 'no_guideable_class' }>,
): HTMLElement {
  return element(
    'div',
    { className: 'level-up-disabled-classes' },
    state.class_options.map((option, index) =>
      renderDisabledClassOption(
        option,
        index,
        'level-up-terminal-disabled-class',
      ),
    ),
  );
}

/** Static route states. None of these panels exposes a command control. */
export function renderLevelUpTerminalState(
  state: Exclude<LevelUpStateResult, { readonly kind: 'ready' }>,
  resolutionSurface: readonly Node[] = [],
): HTMLElement {
  if (state.kind === 'not_found') {
    return terminalShell(
      'Level up',
      terminalPanel(
        LEVEL_UP_PANEL.notFound,
        'Character not found',
        'No character exists with this id. It may have been deleted.',
        [characterListLink()],
      ),
    );
  }

  if (state.kind === 'no_held_class') {
    return terminalShell(
      `Level up — ${state.character.name}`,
      terminalPanel(
        'no-held-class',
        'This character has no held class',
        'Guided level up can advance only a class the character already holds. It never adds a new class.',
        [
          characterListLink(),
          routerLink(
            'Advanced: open planner',
            `/characters/${String(state.character.character_id)}`,
          ),
        ],
      ),
    );
  }

  if (state.kind === 'incomplete_level_one') {
    return terminalShell(
      `Level up — ${state.character.name}`,
      terminalPanel(
        LEVEL_UP_PANEL.incompleteLevelOne,
        'Finish level 1 before leveling up',
        'Ability scores have not been completed, so ability-derived values such as hit points are unknown. Resume the level 1 build first.',
        [
          routerLink(
            'Resume build',
            guidedBuildPath(state.character.character_id),
          ),
          characterListLink(),
        ],
      ),
    );
  }

  if (state.kind === 'no_guideable_class') {
    return terminalShell(
      `Level up — ${state.character.name}`,
      terminalPanel(
        'no-guideable-class',
        'No held class can be guided',
        state.explanation,
        [characterListLink()],
        [disabledClassExplanations(state), ...resolutionSurface],
      ),
    );
  }

  return terminalShell(
    `Level up — ${state.character.name}`,
    terminalPanel(
      LEVEL_UP_PANEL.maximumLevel,
      'Maximum level reached',
      'No further character level can be added through the level-up wizard.',
      [
        routerLink(
          'Open character sheet',
          `/characters/${String(state.character.character_id)}/sheet`,
        ),
      ],
      resolutionSurface,
    ),
  );
}

function stepRail(
  steps: readonly LevelUpStep[],
  currentStep: LevelUpStep,
): HTMLOListElement {
  return element(
    'ol',
    {
      className: 'level-up-steps',
      attributes: { 'aria-label': 'Level up steps' },
    },
    steps.map((step) =>
      element('li', {
        text: STEP_LABELS[step],
        className:
          step === currentStep
            ? 'level-up-step level-up-step-current'
            : 'level-up-step',
        attributes:
          step === currentStep
            ? {
                [LEVEL_UP_ATTR.step]: step,
                'aria-current': 'step',
              }
            : { [LEVEL_UP_ATTR.step]: step },
      }),
    ),
  );
}

export function createLevelUpFrame(options: {
  readonly characterName: string;
  readonly steps: readonly LevelUpStep[];
  readonly currentStep: LevelUpStep;
  readonly panel: HTMLElement;
  readonly navigation: LevelUpNavigation;
  readonly applicableStepStatus: string | null;
  readonly error: string | null;
}): LevelUpFrame {
  const cleanups: Cleanup[] = [];
  const routeHeading = element('h1', {
    text: `Level up — ${options.characterName}`,
    attributes: { tabindex: '-1' },
  });
  const stepHeading = options.panel.querySelector('h2');
  if (stepHeading === null) {
    throw new Error('A level-up step panel must contain an h2 heading.');
  }
  stepHeading.setAttribute('tabindex', '-1');

  const status = element('p', {
    text: options.applicableStepStatus ?? '',
    className: 'level-up-step-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const alert = options.error === null
    ? null
    : element('p', {
        text: options.error,
        className: 'level-up-error',
        attributes: { role: 'alert', tabindex: '-1' },
      });

  const navigationChildren: Node[] = [];
  if (options.navigation.back !== undefined) {
    const back = element('button', {
      text: 'Back',
      attributes: { type: 'button', [LEVEL_UP_ATTR.back]: '' },
    });
    cleanups.push(listen(back, 'click', options.navigation.back));
    navigationChildren.push(back);
  }
  if (options.navigation.cancel !== undefined) {
    const cancel = element('button', {
      text: 'Cancel',
      attributes: { type: 'button', [LEVEL_UP_ATTR.cancel]: '' },
    });
    cleanups.push(listen(cancel, 'click', options.navigation.cancel));
    navigationChildren.push(cancel);
  }
  if (options.navigation.next !== undefined) {
    const actionAttribute = options.navigation.nextKind === 'confirm'
      ? LEVEL_UP_ATTR.confirm
      : LEVEL_UP_ATTR.next;
    const next = element('button', {
      text: options.navigation.nextLabel ?? 'Next',
      attributes: { type: 'button', [actionAttribute]: '' },
    });
    cleanups.push(listen(next, 'click', options.navigation.next));
    navigationChildren.push(next);
  }

  const view = element('main', { className: 'level-up-shell' }, [
    element('header', { className: 'level-up-header' }, [routeHeading]),
    stepRail(options.steps, options.currentStep),
    status,
    ...(alert === null ? [] : [alert]),
    options.panel,
    element(
      'nav',
      {
        className: 'level-up-navigation',
        attributes: { 'aria-label': 'Level up navigation' },
      },
      navigationChildren,
    ),
  ]);

  return {
    element: view,
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
    routeHeading,
    stepHeading,
    alert,
  };
}

export function renderUnimplementedLevelUpStep(
  step: Exclude<LevelUpStep, 'class' | 'gains' | 'subclass'>,
): HTMLElement {
  const panelName = step === 'epic_boon'
    ? LEVEL_UP_PANEL.epicBoon
    : LEVEL_UP_PANEL[step];
  return element(
    'section',
    {
      className: 'level-up-panel',
      attributes: { [LEVEL_UP_PANEL_ATTRIBUTE]: panelName },
    },
    [
      element('h2', { text: STEP_LABELS[step] }),
      element('p', {
        text: 'This applicable step is reserved for the next level-up UI increment.',
      }),
    ],
  );
}
