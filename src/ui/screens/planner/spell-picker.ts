import type { EligibleSpell } from '../../../domain/read-models';
import { FREE_TEXT_MARKER } from '../../free-text';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import type { CatalogLayerDisclosure } from '../../../catalog/catalog-disclosure';

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
  addressKey: string;
  label: string;
  value: string | null;
  valueCatalogLayer: CatalogLayerDisclosure | null;
  /** The current value is a share-link name of unverified origin. */
  freeTextValue: boolean;
  invalid: boolean;
  disabled: boolean;
  search(query: string): Promise<EligibleSpell[]>;
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
    options.label,
  );
  // An input's value cannot be wrapped, so the marker goes on the control. The
  // adjacent "Not imported" badge states the same thing in words.
  if (options.freeTextValue) input.dataset.freeText = FREE_TEXT_MARKER;
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-invalid', String(options.invalid));
  input.dataset.focusKey = `spell-${options.addressKey}`;
  const list = document.createElement('div');
  const listId = `spell-options-${options.addressKey}`;
  list.id = listId;
  list.className = 'spell-options';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  input.setAttribute('aria-controls', listId);
  const currentLayer = document.createElement('span');
  const currentLayerId = `spell-current-layer-${options.addressKey}`;
  currentLayer.id = currentLayerId;
  currentLayer.className = 'spell-picker-current-layer';
  currentLayer.textContent = options.valueCatalogLayer === null
    ? ''
    : catalogLayerLabel(options.valueCatalogLayer);
  input.setAttribute('aria-describedby', currentLayerId);
  wrapper.append(input, currentLayer, list);

  let choices: EligibleSpell[] = [];
  let active = 0;
  let requestSequence = 0;
  let debounce: number | undefined;
  let blurTimer: number | undefined;
  let destroyed = false;
  let acceptedValue = options.value;

  const close = (restore: boolean): void => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    if (restore) input.value = acceptedValue ?? '';
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
      choice.id = `spell-option-${options.addressKey}-${index}`;
      choice.className =
        index === active ? 'spell-option is-active' : 'spell-option';
      choice.setAttribute('role', 'option');
      choice.setAttribute('aria-selected', String(index === active));
      choice.setAttribute('aria-label', spell.name);
      const traits = [
        `L${spell.level}`,
        spell.school,
        spell.edition,
        catalogLayerLabel(spell.catalog_layer),
        ...(spell.ritual ? ['Ritual'] : []),
        ...(spell.concentration ? ['Concentration'] : []),
      ];
      const name = document.createElement('strong');
      name.textContent = spell.name;
      const details = document.createElement('small');
      details.id = `spell-option-${options.addressKey}-${index}-details`;
      details.textContent = traits.join(' · ');
      choice.setAttribute('aria-describedby', details.id);
      choice.append(name, details);
      choice.addEventListener('mousedown', (event) => {
        event.preventDefault();
        acceptedValue = spell.name;
        input.value = spell.name;
        currentLayer.textContent = catalogLayerLabel(spell.catalog_layer);
        close(false);
        options.onSelect(spell);
      });
      list.append(choice);
    });
    const activeChoice = choices[active];
    if (activeChoice !== undefined) {
      input.setAttribute(
        'aria-activedescendant',
        `spell-option-${options.addressKey}-${active}`,
      );
    }
  };

  const search = async (): Promise<void> => {
    const sequence = ++requestSequence;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    draw('Searching eligible spells…');
    try {
      const spells = await options.search(input.value);
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
        acceptedValue = spell.name;
        input.value = spell.name;
        currentLayer.textContent = catalogLayerLabel(spell.catalog_layer);
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
