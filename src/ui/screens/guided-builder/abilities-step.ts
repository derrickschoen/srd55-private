/**
 * THE ABILITIES STEP — dispatch B1, per D64 and the plan
 * (`docs/design/2026-07-28-abilities-and-contributions.md` §3.1, §3.2).
 *
 * - STANDARD ARRAY IS THE DEFAULT: it is what a person gets without choosing.
 *   The six printed values arrive pre-assigned in the extract's order, so one
 *   click submits a lawful allocation.
 * - POINT BUY AND MANUAL ENTRY ARE OFFERED AND WARN. ALL 10s IS VALID and
 *   enterable as normal — manual entry accepts it without ceremony (D64).
 * - EVERY WARNING IS A WARNING AND NONE BLOCKS SUBMISSION (D49). Warnings
 *   here are rendered from the same seam predicates the worker uses
 *   (`hasWeakScores`), live, as `role="status"` text — never a disabled
 *   button, never a refusal. The authoritative copy travels as DATA in the
 *   RPC result. The weakness warning fires on the RESULT, not the method: a
 *   weak standard-array assignment warns, a strong manual entry does not.
 * - THE INPUTS READ BASE, NEVER A RESOLVED TOTAL (plan §3.5). The prefill
 *   comes from `CharacterRow`'s six raw columns — the transport/CRUD surface
 *   that keeps carrying base once B2's contribution layer lands. A step
 *   prefilling from totals would re-commit contributions as base.
 * - ONE ATOMIC OPERATION: submission is a single `allocateAbilities` call
 *   carrying all six scores and the method; partial allocation is not a state
 *   this screen can produce.
 *
 * WHAT IS AN ERROR RATHER THAN A WARNING, and why that is not a D49
 * violation: a standard-array submission whose six values are not the printed
 * array, or a point-buy spend over budget, is refused with a sentence. Those
 * are method-integrity failures — the submission does not mean what its
 * method label claims — not the plan's warning classes. The three pinned
 * warning journeys (point buy, manual entry, weak result) never pass through
 * either refusal, and manual entry accepts ANY six lawful scores, so no
 * combination of numbers is unreachable.
 *
 * LOCATOR NOTE, for ratification: the seam pins
 * `GUIDED_PANEL.abilitiesStep` but no method-selector or warning locators
 * (§3.6 promised them; the landed seam omits them — reported with this
 * dispatch). The values here are the implementer's, offered the way A1's and
 * A4's panel values were: `data-ability-method` on each method radio,
 * `data-ability-input` on each score field, `data-ability-warning` on each
 * live warning, `data-ability-submit` on the one button.
 */

import {
  GUIDED_PANEL,
  GUIDED_PANEL_ATTRIBUTE,
  guidedBuildPath,
  hasWeakScores,
  WEAK_SCORES_MIN_COUNT,
  WEAK_SCORES_MIN_SCORE,
  type AbilityAllocationMethod,
  type GuidedAbilityDraft,
  type GuidedAbilityScores,
  type GuidedAllocateAbilitiesResult,
} from '../../../builder/contracts';
import { abilities, type Ability } from '../../../domain/enums';
import type { CharacterRow } from '../../../domain/models';
import {
  POINT_BUY_BUDGET,
  POINT_BUY_MAX_SCORE,
  POINT_BUY_MIN_SCORE,
  pointBuyTotalCost,
  STANDARD_ARRAY,
} from '../../../rules/ability-score-generation-srd';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';

const ABILITY_LABELS: Readonly<Record<Ability, string>> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

const METHOD_LABELS: Readonly<Record<AbilityAllocationMethod, string>> = {
  standard_array: 'Standard array',
  point_buy: 'Point buy',
  manual: 'Manual entry',
};

const METHOD_ORDER: readonly AbilityAllocationMethod[] = [
  'standard_array',
  'point_buy',
  'manual',
];

export interface AbilitiesStepDeps {
  readonly characterId: number;
  /** The character's own row: BASE scores and the revision the command needs. */
  readonly character: CharacterRow;
  readonly draft: GuidedAbilityDraft | null;
  readonly saveDraft: (
    draft: GuidedAbilityDraft,
  ) => Promise<GuidedAbilityDraft>;
  readonly allocateAbilities: (
    method: AbilityAllocationMethod,
    scores: GuidedAbilityScores,
    operationUuid: string,
  ) => Promise<GuidedAllocateAbilitiesResult>;
  readonly navigate: (path: string) => void;
}

export interface AbilitiesStep {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

function sortedMultiset(values: readonly number[]): string {
  return [...values].sort((left, right) => left - right).join(',');
}

export function createAbilitiesStep(deps: AbilitiesStepDeps): AbilitiesStep {
  const cleanups: Cleanup[] = [];
  let method: AbilityAllocationMethod = deps.draft?.method ?? 'standard_array';
  let inFlight = false;
  let draftSaveQueue: Promise<void> = Promise.resolve();

  /** The current entry per method, so switching back does not lose typing. */
  const entries: Record<AbilityAllocationMethod, Record<Ability, number>> = {
    standard_array: Object.fromEntries(
      abilities.map((ability, index) => [
        ability,
        STANDARD_ARRAY[index] ?? 10,
      ]),
    ) as Record<Ability, number>,
    point_buy: Object.fromEntries(
      abilities.map((ability) => [ability, POINT_BUY_MIN_SCORE]),
    ) as Record<Ability, number>,
    manual: Object.fromEntries(
      abilities.map((ability) => [ability, deps.character[ability]]),
    ) as Record<Ability, number>,
  };
  if (deps.draft !== null) {
    entries[deps.draft.method] = { ...deps.draft.scores };
  }

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

  const persistDraft = (): void => {
    const draft: GuidedAbilityDraft = {
      method,
      scores: { ...entries[method] },
    };
    draftSaveQueue = draftSaveQueue
      .catch(() => undefined)
      .then(() => deps.saveDraft(draft))
      .then(() => undefined)
      .catch((error: unknown) => {
        setError(
          `Ability draft could not be saved: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  };

  /**
   * WARNINGS ARE STATUS TEXT, NEVER A CONTROL STATE. This container is
   * re-rendered from the seam predicates on every change; nothing here ever
   * disables the submit button — B1-BLOCK's mutation target is exactly a
   * change that would.
   */
  const warningMount = element('div', {
    className: 'guided-ability-warnings',
    attributes: { 'data-ability-warnings': '', role: 'status' },
  });
  const renderWarnings = (): void => {
    clear(warningMount);
    if (method !== 'standard_array') {
      warningMount.append(
        element('p', {
          className: 'guided-ability-warning',
          text:
            `${METHOD_LABELS[method]} is not the standard method. You can ` +
            'submit these scores as they are; the standard array is the ' +
            'recommended default.',
          attributes: { 'data-ability-warning': 'non_standard_method' },
        }),
      );
    }
    if (hasWeakScores(entries[method])) {
      warningMount.append(
        element('p', {
          className: 'guided-ability-warning',
          text:
            'These scores will make a weak character: fewer than ' +
            `${WEAK_SCORES_MIN_COUNT} abilities are ${WEAK_SCORES_MIN_SCORE} ` +
            'or higher (modifier +2). Consider the standard array or point ' +
            'buy. You can still submit them.',
          attributes: { 'data-ability-warning': 'weak_scores' },
        }),
      );
    }
  };

  const budgetMount = element('p', {
    className: 'guided-point-budget',
    attributes: { 'data-point-buy-budget': '' },
  });
  const renderBudget = (): void => {
    if (method !== 'point_buy') {
      budgetMount.textContent = '';
      budgetMount.hidden = true;
      return;
    }
    budgetMount.hidden = false;
    const spent = pointBuyTotalCost(
      abilities.map((ability) => entries.point_buy[ability]),
    );
    budgetMount.textContent =
      spent === null
        ? `Point buy prices scores from ${POINT_BUY_MIN_SCORE} to ${POINT_BUY_MAX_SCORE}.`
        : `${spent} of ${POINT_BUY_BUDGET} points spent, ` +
          `${POINT_BUY_BUDGET - spent} remaining.`;
  };

  const scoreMount = element('div', { className: 'guided-ability-scores' });

  const renderScoreInputs = (): void => {
    clear(scoreMount);
    // Captured so a listener always writes the entry set it was rendered for,
    // even though switching methods discards these nodes anyway.
    const entryMethod = method;
    const rows = abilities.map((ability) => {
      const value = entries[entryMethod][ability];
      let field: HTMLElement;
      if (entryMethod === 'standard_array') {
        const select = element(
          'select',
          {
            attributes: {
              'data-ability-input': ability,
              'aria-label': ABILITY_LABELS[ability],
            },
          },
          STANDARD_ARRAY.map((score) => {
            const option = element('option', {
              text: String(score),
              attributes: { value: String(score) },
            });
            if (score === value) {
              option.selected = true;
            }
            return option;
          }),
        );
        cleanups.push(
          listen(select, 'change', () => {
            entries.standard_array[ability] = Number(select.value);
            renderWarnings();
            persistDraft();
          }),
        );
        field = select;
      } else {
        const minimum =
          entryMethod === 'point_buy' ? POINT_BUY_MIN_SCORE : 1;
        const maximum =
          entryMethod === 'point_buy' ? POINT_BUY_MAX_SCORE : 30;
        const input = element('input', {
          attributes: {
            type: 'number',
            min: String(minimum),
            max: String(maximum),
            step: '1',
            value: String(value),
            'data-ability-input': ability,
            'aria-label': ABILITY_LABELS[ability],
          },
        });
        cleanups.push(
          listen(input, 'input', () => {
            const parsed = Number(input.value);
            if (Number.isSafeInteger(parsed)) {
              entries[entryMethod][ability] = parsed;
            }
            renderBudget();
            renderWarnings();
            persistDraft();
          }),
        );
        field = input;
      }
      return element('label', { className: 'guided-ability-score' }, [
        element('span', {
          className: 'guided-ability-name',
          text: ABILITY_LABELS[ability],
        }),
        field,
      ]);
    });
    scoreMount.append(...rows);
    renderBudget();
    renderWarnings();
  };

  const methodSelector = element(
    'fieldset',
    { className: 'guided-ability-methods' },
    [
      element('legend', { text: 'How do you want to set the scores?' }),
      ...METHOD_ORDER.map((candidate) => {
        const radio = element('input', {
          attributes: {
            type: 'radio',
            name: 'ability-method',
            value: candidate,
            'data-ability-method': candidate,
          },
        });
        if (candidate === method) {
          radio.checked = true;
        }
        cleanups.push(
          listen(radio, 'change', () => {
            if (!radio.checked) {
              return;
            }
            method = candidate;
            setError(null);
            renderScoreInputs();
            persistDraft();
          }),
        );
        return element('label', { className: 'guided-ability-method' }, [
          radio,
          element('span', { text: METHOD_LABELS[candidate] }),
        ]);
      }),
    ],
  );

  /**
   * Method-integrity refusals, distinct from warnings — see the module
   * comment. Returns null when the entry means what its method label claims.
   */
  const entryError = (): string | null => {
    const scores = entries[method];
    for (const ability of abilities) {
      const score = scores[ability];
      if (!Number.isSafeInteger(score) || score < 1 || score > 30) {
        return `${ABILITY_LABELS[ability]} must be a whole number from 1 to 30.`;
      }
    }
    if (method === 'standard_array') {
      const chosen = abilities.map((ability) => scores[ability]);
      if (sortedMultiset(chosen) !== sortedMultiset(STANDARD_ARRAY)) {
        return (
          'A standard-array assignment uses each of the six printed scores ' +
          `(${STANDARD_ARRAY.join(', ')}) exactly once.`
        );
      }
    }
    if (method === 'point_buy') {
      const spent = pointBuyTotalCost(
        abilities.map((ability) => scores[ability]),
      );
      if (spent === null) {
        return (
          'Point buy prices scores from ' +
          `${POINT_BUY_MIN_SCORE} to ${POINT_BUY_MAX_SCORE}. For other ` +
          'numbers, use manual entry.'
        );
      }
      if (spent > POINT_BUY_BUDGET) {
        return (
          `That spend costs ${spent} points and the budget is ` +
          `${POINT_BUY_BUDGET}. For scores beyond the budget, use manual ` +
          'entry.'
        );
      }
    }
    return null;
  };

  const submit = element('button', {
    className: 'guided-ability-submit',
    text: 'Set ability scores',
    attributes: { type: 'button', 'data-ability-submit': '' },
  });

  const allocate = async (): Promise<void> => {
    if (inFlight) {
      return;
    }
    const refusal = entryError();
    if (refusal !== null) {
      setError(refusal);
      return;
    }
    inFlight = true;
    setError(null);
    submit.disabled = true;
    try {
      await draftSaveQueue;
      await deps.allocateAbilities(
        method,
        { ...entries[method] },
        crypto.randomUUID(),
      );
      // Allocation is recorded; the build route re-derives the step from the
      // database and renders whatever comes next (species, per D55's order).
      deps.navigate(guidedBuildPath(deps.characterId));
    } catch (error) {
      setError(
        error instanceof RpcError || error instanceof Error
          ? error.message
          : String(error),
      );
      inFlight = false;
      submit.disabled = false;
    }
  };
  cleanups.push(listen(submit, 'click', () => void allocate()));

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: GUIDED_PANEL.abilitiesStep },
    },
    [
      element('h2', { text: 'Set ability scores' }),
      element('p', {
        text:
          'All six scores are set together. The standard array is ' +
          'pre-assigned below; reassign its values, or switch to point buy ' +
          'or manual entry.',
      }),
      methodSelector,
      scoreMount,
      budgetMount,
      warningMount,
      submit,
      errorMount,
      characterListLink(),
    ],
  );

  renderScoreInputs();

  return {
    element: guidedShell('abilities', panel, deps.characterId),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
