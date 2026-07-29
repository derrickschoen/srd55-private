/**
 * THE GUIDED-BUILDER VIEW — pure renders for the A1 route shell.
 *
 * Everything here is a pure function of seam types; the screen module does the
 * one query and the wiring. Two panels are PINNED by the plan (§8) and their
 * absence-of-a-link is asserted by a negative control, so their intent is
 * spelled out at the panel rather than left to be rediscovered:
 *
 * - the TERMINAL panel (`data-panel="step-not-built"`) — the derived step is
 *   one this group has not built. It says so, and it MUST NOT link into the
 *   planner grid: "go finish in the planner" is the exact dead end the guided
 *   builder exists to remove (§5's trap).
 * - the CLASS-LESS panel (`data-panel="classless-character"`) — a blank-created
 *   character (D42's escape hatch) opened at the build route. The wizard's
 *   class step exists only pre-persistence at `/characters/new`, so the panel
 *   links there — and to nothing in the planner. Its heading and `data-panel`
 *   value deliberately share no wording with the terminal panel so one
 *   assertion cannot satisfy both.
 */

import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_NEW_ROUTE,
  type BuildStep,
  type GuidedBuildStateResult,
} from '../../../builder/contracts';
import { element } from '../../dom';

const STEP_LABELS: Readonly<Record<BuildStep, string>> = {
  class: 'Class',
  abilities: 'Ability scores',
  species: 'Species',
  background: 'Background',
  skills: 'Skills',
  equipment: 'Equipment',
};

/**
 * D55's order, rendered straight from the seam constant — the "step order
 * begins with class" exit criterion is true here by construction, not by copy.
 */
function stepList(currentStep: BuildStep): HTMLOListElement {
  return element(
    'ol',
    {
      className: 'guided-steps',
      attributes: { 'aria-label': 'Level 1 build steps' },
    },
    GUIDED_LEVEL_ONE_STEP_ORDER.map((step) =>
      element('li', {
        text: STEP_LABELS[step],
        className:
          step === currentStep
            ? 'guided-step guided-step-current'
            : 'guided-step',
        attributes:
          step === currentStep
            ? { 'data-step': step, 'aria-current': 'step' }
            : { 'data-step': step },
      }),
    ),
  );
}

/** The one anchor guided panels share. Points at the list; never the planner. */
export function characterListLink(): HTMLParagraphElement {
  return element('p', { className: 'guided-nav' }, [
    element('a', {
      text: 'Back to characters',
      attributes: { href: '/', 'data-router-link': '' },
    }),
  ]);
}

export function guidedShell(
  currentStep: BuildStep,
  panel: HTMLElement,
): HTMLElement {
  return element('main', { className: 'guided-shell' }, [
    element('header', { className: 'guided-header' }, [
      element('h1', { text: 'Guided character builder' }),
    ]),
    stepList(currentStep),
    panel,
  ]);
}

function notFoundView(): HTMLElement {
  return element('main', { className: 'guided-shell' }, [
    element('header', { className: 'guided-header' }, [
      element('h1', { text: 'Guided character builder' }),
    ]),
    element(
      'section',
      {
        className: 'guided-panel',
        attributes: { 'data-panel': 'not-found' },
      },
      [
        element('h2', { text: 'Character not found' }),
        element('p', {
          text: 'No character exists with this id. It may have been deleted.',
        }),
        characterListLink(),
      ],
    ),
  ]);
}

/** The pinned class-less panel. Links to `/characters/new`; never the planner. */
function classlessPanel(): HTMLElement {
  return element(
    'section',
    {
      className: 'guided-panel',
      attributes: { 'data-panel': 'classless-character' },
    },
    [
      element('h2', { text: 'This character has no class' }),
      element('p', {
        text:
          'A guided build starts with a class, and the class is chosen at ' +
          'the moment a character is created. To build with the guide, ' +
          'start a new character from the class step.',
      }),
      element('p', { className: 'guided-nav' }, [
        element('a', {
          text: 'Start a guided character',
          attributes: { href: GUIDED_NEW_ROUTE, 'data-router-link': '' },
        }),
      ]),
    ],
  );
}

/** The pinned terminal panel. Says the step is not built yet; never links to the planner. */
function terminalPanel(step: BuildStep): HTMLElement {
  return element(
    'section',
    {
      className: 'guided-panel',
      attributes: { 'data-panel': 'step-not-built' },
    },
    [
      element('h2', {
        text: `The ${STEP_LABELS[step]} step is not built yet`,
      }),
      element('p', {
        text:
          'This part of the guided builder does not exist yet. The ' +
          'character is saved, and this page will resume at this step ' +
          'once it is built.',
      }),
      characterListLink(),
    ],
  );
}

export function renderGuidedBuildState(
  state: GuidedBuildStateResult,
): HTMLElement {
  if (state.kind === 'not_found') {
    return notFoundView();
  }
  // `class` renders the pinned class-less panel, and `species` never reaches
  // this function — the screen module intercepts it and mounts the live
  // species step (A4), which needs the RPC wiring a pure render cannot hold.
  // A5 intercepts `background` the same way; the terminal panel remains the
  // default for whatever is left.
  const panel =
    state.current_step === 'class'
      ? classlessPanel()
      : terminalPanel(state.current_step);
  return guidedShell(state.current_step, panel);
}
