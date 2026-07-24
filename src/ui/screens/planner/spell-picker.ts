import type { EligibleSpell } from '../../../domain/read-models';

export interface EligibleSpellClient {
  eligibleSpells(
    characterId: number,
    slotId: number,
    query?: string,
  ): Promise<EligibleSpell[]>;
}

export interface SpellPicker {
  readonly element: HTMLElement;
  focus(): void;
  destroy(): void;
}

export function createSpellPicker(options: {
  characterId: number;
  slotId: number;
  value: string | null;
  invalid: boolean;
  disabled: boolean;
  queries: EligibleSpellClient;
  onSelect(spell: EligibleSpell): void;
}): SpellPicker {
  const wrapper = document.createElement('div');
  wrapper.className = 'spell-picker';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'planner-input spell-picker-input';
  input.value = options.value ?? '';
  input.placeholder = 'Search eligible spells…';
  input.autocomplete = 'off';
  input.disabled = options.disabled;
  input.setAttribute('role', 'combobox');
  input.setAttribute(
    'aria-label',
    `Spell selection for slot ${options.slotId}`,
  );
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-invalid', String(options.invalid));
  input.dataset.focusKey = `spell-${options.slotId}`;
  const list = document.createElement('div');
  const listId = `spell-options-${options.slotId}`;
  list.id = listId;
  list.className = 'spell-options';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  input.setAttribute('aria-controls', listId);
  wrapper.append(input, list);

  let choices: EligibleSpell[] = [];
  let active = 0;
  let requestSequence = 0;
  let debounce: number | undefined;
  let blurTimer: number | undefined;
  let destroyed = false;

  const close = (restore: boolean): void => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (restore) input.value = options.value ?? '';
  };

  const draw = (message?: string): void => {
    list.replaceChildren();
    if (message !== undefined) {
      const status = document.createElement('p');
      status.className = 'spell-options-status';
      status.textContent = message;
      list.append(status);
      return;
    }
    choices.forEach((spell, index) => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.id = `spell-option-${options.slotId}-${index}`;
      choice.className =
        index === active ? 'spell-option is-active' : 'spell-option';
      choice.setAttribute('role', 'option');
      choice.setAttribute('aria-selected', String(index === active));
      const traits = [
        `L${spell.level}`,
        spell.school,
        spell.edition,
        ...(spell.ritual ? ['Ritual'] : []),
        ...(spell.concentration ? ['Concentration'] : []),
      ];
      choice.innerHTML = `<strong></strong><small></small>`;
      choice.querySelector('strong')!.textContent = spell.name;
      choice.querySelector('small')!.textContent = traits.join(' · ');
      choice.addEventListener('mousedown', (event) => {
        event.preventDefault();
        input.value = spell.name;
        close(false);
        options.onSelect(spell);
      });
      list.append(choice);
    });
    const activeChoice = choices[active];
    if (activeChoice !== undefined) {
      input.setAttribute(
        'aria-activedescendant',
        `spell-option-${options.slotId}-${active}`,
      );
    }
  };

  const search = async (): Promise<void> => {
    const sequence = ++requestSequence;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    draw('Searching eligible spells…');
    try {
      const spells = await options.queries.eligibleSpells(
        options.characterId,
        options.slotId,
        input.value,
      );
      if (destroyed || sequence !== requestSequence) return;
      choices = spells;
      active = 0;
      draw(
        choices.length === 0
          ? 'No eligible spells match this search.'
          : undefined,
      );
    } catch (error) {
      if (destroyed || sequence !== requestSequence) return;
      draw(
        error instanceof Error
          ? error.message
          : 'Spell search could not be loaded.',
      );
    }
  };

  input.addEventListener('focus', () => {
    if (!options.disabled) void search();
  });
  input.addEventListener('input', () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void search(), 140);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.hidden) void search();
      else active = Math.min(active + 1, choices.length - 1);
      draw();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(0, active - 1);
      draw();
    } else if (event.key === 'Enter' && !list.hidden) {
      const spell = choices[active];
      if (spell !== undefined) {
        event.preventDefault();
        input.value = spell.name;
        close(false);
        options.onSelect(spell);
      }
    } else if (event.key === 'Escape') {
      close(true);
    }
  });
  input.addEventListener('blur', () => {
    blurTimer = window.setTimeout(() => close(true), 120);
  });

  return {
    element: wrapper,
    focus: () => {
      input.focus();
      void search();
    },
    destroy: () => {
      destroyed = true;
      requestSequence += 1;
      window.clearTimeout(debounce);
      window.clearTimeout(blurTimer);
    },
  };
}
