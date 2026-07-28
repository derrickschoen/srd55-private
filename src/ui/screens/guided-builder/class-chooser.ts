/**
 * THE CLASS CHOOSER — dispatch A3, the front door's first real control.
 *
 * Replaces A1's `class-chooser-pending` placeholder at `/characters/new`.
 * Everything about its shape is dictated by the plan (§4, §5, §7) and the law:
 *
 * - D48's user-visible invariant: the NAME FIELD DOES NOT EXIST in the DOM
 *   until a class is chosen. Not hidden — not constructed. The form is built
 *   inside the card-click handler and appended to `nameMount`, which is empty
 *   until then, so there is no code path that puts a textbox on screen first.
 * - D33: a null `hit_die` renders as "unknown", never the sheet's assumed 8.
 *   This is the one place a plausible default does real harm — a person
 *   choosing a class would be choosing on a number we invented.
 * - Guided creation is deliberately NOT idempotent (plan §3.3): no
 *   `operation_uuid`, no server-side replay guard. The submit control disables
 *   BEFORE the RPC is awaited and re-enables only on failure, and that UI
 *   guard is the only double-submit protection there is.
 * - §5's trap: no element here links into the planner grid. Success navigates
 *   to the persisted build route; the only anchor goes back to the list.
 */

import {
  GUIDED_PANEL_ATTRIBUTE,
  type GuidedClassOption,
} from '../../../builder/contracts';
import type { CharacterRow } from '../../../domain/models';
import { RpcError } from '../../../rpc/protocol';
import { clear, element, listen, type Cleanup } from '../../dom';
import { characterListLink, guidedShell } from './guided-builder';

/**
 * The seam pins locators for A1's four panels but none for the real chooser —
 * A1's placeholder value described itself as the shell
 * "until A2/A3 land". This value is the implementer's, offered for
 * ratification the same way A1's panel values were.
 */
export const CLASS_CHOOSER_PANEL = 'class-chooser';

/** The persisted build route for a just-created character; `level` is pinned to 1. */
export function guidedBuildPath(characterId: number): string {
  return `/characters/${characterId}/build/levels/1`;
}

/** D33: an absent hit die is said to be unknown, never guessed at. */
export function hitDieLabel(hitDie: number | null): string {
  return hitDie === null ? 'Hit die: unknown' : `Hit die: d${hitDie}`;
}

/**
 * The worker refuses `class_not_bundled` and `unknown_class` as
 * `handler_error` with structured `data.reason` (seam, `GuidedRefusalData`).
 * Anything else — malformed params, SQL failure, transport loss — is not a
 * refusal and falls through to the raw message.
 */
export function guidedCreateRefusalMessage(error: unknown): string | null {
  if (!(error instanceof RpcError) || error.code !== 'handler_error') {
    return null;
  }
  const data: unknown = error.data;
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const reason = (data as Record<string, unknown>)['reason'];
  if (reason === 'class_not_bundled') {
    return (
      'That class is not part of the bundled rules, and the guided builder ' +
      'refuses to guide homebrew classes. No character was created.'
    );
  }
  if (reason === 'unknown_class') {
    return (
      'That class is not available in this database, so no character was ' +
      'created. Reload the page to refresh the class list.'
    );
  }
  return null;
}

export interface ClassChooserDeps {
  readonly options: readonly GuidedClassOption[];
  readonly createGuided: (
    name: string,
    classContentKey: string,
  ) => Promise<CharacterRow>;
  readonly navigate: (path: string) => void;
}

export interface ClassChooser {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

interface NameForm {
  readonly form: HTMLFormElement;
  readonly chosenClass: HTMLParagraphElement;
  readonly input: HTMLInputElement;
  readonly submit: HTMLButtonElement;
}

export function createClassChooser(deps: ClassChooserDeps): ClassChooser {
  const cleanups: Cleanup[] = [];
  const cardsByKey = new Map<string, HTMLButtonElement>();

  let selected: GuidedClassOption | null = null;
  let nameForm: NameForm | null = null;
  let inFlight = false;

  /**
   * The name field's mount point. Empty until a class is chosen; the form is
   * constructed and appended only then, so before the first selection the DOM
   * contains no name textbox at all (D48, control A3-FIRST).
   */
  const nameMount = element('div', { className: 'guided-name-mount' });

  /** Errors exist only while there is one to show, mirroring the name form. */
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
    for (const card of cardsByKey.values()) {
      card.disabled = disabled;
    }
  };

  const submitLabel = 'Create character';

  const handleSubmit = async (): Promise<void> => {
    if (inFlight || selected === null || nameForm === null) {
      return;
    }
    const name = nameForm.input.value.trim();
    if (name === '') {
      return;
    }
    // The one and only double-submit guard (plan §3.3): everything disables
    // before the await, and nothing re-enables unless the call fails.
    inFlight = true;
    setError(null);
    nameForm.submit.disabled = true;
    nameForm.submit.textContent = 'Creating…';
    nameForm.input.disabled = true;
    setCardsDisabled(true);
    try {
      const character = await deps.createGuided(name, selected.content_key);
      deps.navigate(guidedBuildPath(character.id));
    } catch (error) {
      setError(
        guidedCreateRefusalMessage(error) ??
          (error instanceof Error ? error.message : String(error)),
      );
      inFlight = false;
      setCardsDisabled(false);
      nameForm.input.disabled = false;
      nameForm.submit.textContent = submitLabel;
      nameForm.submit.disabled = nameForm.input.value.trim() === '';
    }
  };

  const buildNameForm = (): NameForm => {
    const chosenClass = element('p', { className: 'guided-chosen-class' });
    const input = element('input', {
      className: 'guided-name-input',
      attributes: {
        type: 'text',
        maxlength: '120',
        required: '',
        autocomplete: 'off',
        placeholder: 'e.g. Selene, spellblade',
      },
    });
    const submit = element('button', {
      className: 'guided-submit',
      text: submitLabel,
      attributes: { type: 'submit' },
    });
    submit.disabled = true;
    const form = element(
      'form',
      {
        className: 'guided-name-form',
        attributes: { 'data-guided-name-form': '' },
      },
      [
        chosenClass,
        element('label', { text: 'Character name' }, [input]),
        submit,
      ],
    );
    cleanups.push(
      listen(input, 'input', () => {
        submit.disabled = inFlight || input.value.trim() === '';
      }),
      listen(form, 'submit', (event) => {
        event.preventDefault();
        void handleSubmit();
      }),
    );
    return { form, chosenClass, input, submit };
  };

  const selectClass = (option: GuidedClassOption): void => {
    if (inFlight) {
      return;
    }
    selected = option;
    for (const [key, card] of cardsByKey) {
      card.setAttribute(
        'aria-pressed',
        key === option.content_key ? 'true' : 'false',
      );
    }
    if (nameForm === null) {
      nameForm = buildNameForm();
      nameMount.append(nameForm.form);
    }
    nameForm.chosenClass.textContent = `Chosen class: ${option.name}`;
    nameForm.input.focus();
  };

  const cardList = element(
    'ul',
    {
      className: 'guided-class-options',
      attributes: { 'aria-label': 'Bundled classes' },
    },
    deps.options.map((option) => {
      const card = element(
        'button',
        {
          className: 'guided-class-card',
          attributes: {
            type: 'button',
            'data-class-option': option.content_key,
            'aria-pressed': 'false',
          },
        },
        [
          element('span', {
            className: 'guided-class-name',
            text: option.name,
          }),
          element('span', {
            className: 'guided-class-hit-die',
            text: hitDieLabel(option.hit_die),
          }),
        ],
      );
      cardsByKey.set(option.content_key, card);
      cleanups.push(listen(card, 'click', () => selectClass(option)));
      return element('li', {}, [card]);
    }),
  );

  const panel = element(
    'section',
    {
      className: 'guided-panel',
      attributes: { [GUIDED_PANEL_ATTRIBUTE]: CLASS_CHOOSER_PANEL },
    },
    [
      element('h2', { text: 'Choose a class' }),
      element('p', {
        text:
          'A guided character starts with its class. Nothing is saved until ' +
          'a class is chosen and the character is named.',
      }),
      ...(deps.options.length === 0
        ? [
            element('p', {
              className: 'guided-empty-catalog',
              text:
                'No bundled classes are available in this database, so a ' +
                'guided character cannot be started here.',
            }),
          ]
        : [cardList]),
      nameMount,
      errorMount,
      characterListLink(),
    ],
  );

  return {
    element: guidedShell('class', panel),
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
