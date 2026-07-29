/**
 * THE BACKGROUND STEP — dispatch A5, the species step's twin, and the one
 * whose honesty carries the whole risk.
 *
 * Unlike a species — which visibly changes speed and effects on the sheet the
 * moment it is applied — NOTHING in production reads `character_background`.
 * Applying a background records its printed text and advances this step, and
 * that is the entire observable consequence. A background that arrived looking
 * finished while its feat, skills, tool, ability increases and equipment were
 * never granted would be a default presented as a fact — the exact D33
 * violation this project keeps rediscovering — so this screen says, in words,
 * that recording is all that happened. The disclosure lives in
 * {@link BACKGROUND_UNAPPLIED_GRANTS} and is panel-level rather than per-card,
 * because every 2024 background carries the same five kinds of benefit and
 * this step applies none of them for any background.
 *
 * The rest follows A4 exactly:
 *
 * - §5's trap: nothing here links into the planner grid. Success re-navigates
 *   to the build route, which re-derives the step from the database (after
 *   background that is `skills`, whose screen is not built — the terminal
 *   panel says so honestly).
 * - Re-applying replaces (§8): the worker owns that semantic; this screen just
 *   shows the options whenever the derived step is `background`.
 * - D56: equipment is the PACKAGE ONLY — there is no gold alternative — and
 *   choosing/applying the package is NOT this dispatch. The disclosure says
 *   the package is not applied yet; it does not invent a selection between the
 *   two printed alternatives.
 */

import {
  guidedBuildPath,
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedOriginOption,
} from '../../../builder/contracts';
import type { GuidedApplyOriginResult } from '../../../builder/guided-creation';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';

/**
 * The seam pins no locator for this panel — the same gap every dispatch has
 * found. This value is the implementer's, offered for ratification the way
 * A1's, A3's and A4's panel values were.
 */
export const BACKGROUND_STEP_PANEL = 'background-step';

/**
 * THE HONESTY LINE. Nothing in production reads `character_background`, so the
 * only thing a person can observe after choosing is that the step advanced.
 * Said plainly, before the choice is made.
 */
export const BACKGROUND_RECORDED_ONLY_DISCLOSURE =
  'Choosing a background records its printed text on the character and ' +
  'marks this step complete. That is the only visible change: nothing on ' +
  'the sheet reads the background yet.';

/**
 * WHAT RECORDING A BACKGROUND DOES NOT APPLY. One list for every background,
 * because every 2024 background carries all five and this step applies none.
 *
 * When a later unit grants one of these for real, its entry here is DELETED
 * rather than reworded — the same rule the species step applies to its unmade
 * choices (plan §3.4): the disclosure exists only while the gap does.
 */
export const BACKGROUND_UNAPPLIED_GRANTS: readonly string[] = [
  'the 2024 ability score increases the background carries — and the ' +
    'Ability scores step before this one is not built either, so no scores ' +
    'have been asked for or chosen anywhere',
  'the Origin feat',
  'the two skill proficiencies',
  'the tool proficiency',
  'the starting equipment package — equipment is the package only, with no ' +
    'gold alternative, and choosing and applying the package is a later ' +
    'step that is not built yet',
];

/**
 * The worker refuses `unknown_origin` as `handler_error` with structured
 * `data.reason` (seam, `GuidedRefusalData`). Anything else is not a refusal
 * and falls through to the raw message. A local twin of the species step's
 * helper rather than a reuse: that one's message names a species, and its
 * wording belongs to A4's tests.
 */
export function applyBackgroundRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const reason = (data as Record<string, unknown>)['reason'];
  if (reason === 'unknown_origin') {
    return (
      'That background is not available in this database, so nothing was ' +
      'recorded. Reload the page to refresh the background list.'
    );
  }
  return null;
}

export interface BackgroundStepDeps {
  readonly characterId: number;
  readonly options: readonly GuidedOriginOption[];
  readonly applyOrigin: (
    contentKey: string,
  ) => Promise<GuidedApplyOriginResult>;
  readonly navigate: (path: string) => void;
}

export interface BackgroundStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export function createBackgroundStep(deps: BackgroundStepDeps): BackgroundStep {
  const cleanups: Cleanup[] = [];
  const cards: HTMLButtonElement[] = [];
  let inFlight = false;

  /** Errors exist only while there is one to show, mirroring the chooser. */
  const errorMount = element('div', { className: 'guided-error-mount' });
  const setError = (message: string | null): void => {
    clear(errorMount);
    if (message !== null) {
      errorMount.append(
        element('p', {
          className: 'guided-error',
          text: message,
          attributes: { role: 'alert' },
        }),
      );
    }
  };

  const setCardsDisabled = (disabled: boolean): void => {
    for (const card of cards) {
      card.disabled = disabled;
    }
  };

  const applyBackground = async (
    option: GuidedOriginOption,
  ): Promise<void> => {
    if (inFlight) {
      return;
    }
    // The same UI-only double-submit guard as creation (plan §3.3): disable
    // before the await, re-enable only on failure.
    inFlight = true;
    setError(null);
    setCardsDisabled(true);
    try {
      await deps.applyOrigin(option.content_key);
      // The background is now recorded; the build route re-derives the step
      // from the database and renders whatever comes next.
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        applyBackgroundRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      setCardsDisabled(false);
    }
  };

  const cardList = element(
    'ul',
    {
      className: 'guided-background-options',
      attributes: { 'aria-label': 'Bundled backgrounds' },
    },
    deps.options.map((option) => {
      const apply = element('button', {
        className: 'guided-background-apply',
        text: `Choose ${option.name}`,
        attributes: {
          type: 'button',
          'data-background-option': option.content_key,
        },
      });
      cards.push(apply);
      cleanups.push(
        listen(apply, 'click', () => void applyBackground(option)),
      );
      return element('li', { className: 'guided-background-card' }, [
        element('h3', {
          className: 'guided-background-name',
          text: option.name,
        }),
        apply,
      ]);
    }),
  );

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: BACKGROUND_STEP_PANEL },
    },
    [
      element('h2', { text: 'Choose a background' }),
      element('p', {
        className: 'guided-background-recorded-only',
        text: BACKGROUND_RECORDED_ONLY_DISCLOSURE,
      }),
      element('div', { className: 'guided-background-unapplied' }, [
        element('p', {
          text:
            'A background carries benefits this step does NOT apply — ' +
            'choosing one puts none of these on the character:',
        }),
        element(
          'ul',
          {},
          BACKGROUND_UNAPPLIED_GRANTS.map((grant) =>
            element('li', { text: grant }),
          ),
        ),
      ]),
      element('p', {
        text: 'Choosing again later replaces the earlier background.',
      }),
      ...(deps.options.length === 0
        ? [
            element('p', {
              className: 'guided-empty-catalog',
              text:
                'No bundled backgrounds are available in this database, so ' +
                'this step cannot offer one.',
            }),
          ]
        : [cardList]),
      errorMount,
      characterListLink(),
    ],
  );

  return {
    element: guidedShell('background', panel),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
