import type {
  AttunementOccupant,
} from '../../../domain/attunement';
import type { ItemFields } from '../../../domain/command-contracts';
import type { Ability } from '../../../domain/enums';
import { abilities } from '../../../domain/enums';
import type {
  CharacterItem,
  ItemsPanel,
} from '../../../domain/read-models';
import { freeTextSpan } from '../../free-text';

export interface AttunementReplacement {
  readonly item_id: number;
  readonly occupants: readonly AttunementOccupant[];
}

export interface PlannerItemActions {
  addItem(item: ItemFields): void;
  updateItem(itemId: number, item: ItemFields): void;
  removeItem(itemId: number, name: string): void;
  updateQuantity(itemId: number, quantity: number): void;
  attune(itemId: number): void;
  unattune(itemId: number): void;
  replace(itemId: number, replacedItemId: number): void;
  cancelReplacement(): void;
}

interface ItemsPanelOptions {
  readonly panel: ItemsPanel;
  readonly replacement: AttunementReplacement | null;
  readonly actions: PlannerItemActions;
  readonly disabled: boolean;
  readonly editing: number | 'new' | null;
  readonly onEditingChanged: (editing: number | 'new' | null) => void;
}

interface AbilityOverrideDraft {
  readonly ability: Ability;
  readonly maximum: number | null;
  readonly label: string;
  readonly notes: string | null;
}

function blankItem(): ItemFields {
  return {
    name: '',
    description: null,
    quantity: 1,
    requires_attunement: false,
    source_instance_id: null,
    effects: [],
  };
}

function itemFields(item: CharacterItem): ItemFields {
  return {
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    requires_attunement: item.requires_attunement,
    source_instance_id: item.source_instance_id,
    effects: item.effects,
  };
}

function labelled(
  text: string,
  control: HTMLElement,
  id: string,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'planner-field';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = text;
  control.id = id;
  control.classList.add('planner-input');
  wrapper.append(label, control);
  return wrapper;
}

function replacementModal(options: ItemsPanelOptions): HTMLDialogElement | null {
  const replacement = options.replacement;
  if (replacement === null) {
    return null;
  }
  const incoming = options.panel.items.find(
    (item) => item.id === replacement.item_id,
  );
  if (incoming === undefined) {
    return null;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'attunement-replace-modal';
  dialog.open = true;
  dialog.setAttribute('aria-modal', 'true');
  dialog.dataset.testid = 'attunement-replace-modal';
  const heading = document.createElement('h3');
  heading.textContent = 'Replace an attuned item';
  const explanation = document.createElement('p');
  explanation.append(
    'All three attunement slots are full. Choose which item ',
    freeTextSpan(incoming.name),
    ' replaces, or cancel.',
  );
  const choices = document.createElement('div');
  choices.className = 'attunement-replace-choices';
  for (const occupant of replacement.occupants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button-secondary';
    button.disabled = options.disabled;
    button.dataset.attunementSlot = String(occupant.slot);
    button.setAttribute(
      'aria-label',
      `Replace ${occupant.name} with ${incoming.name}`,
    );
    button.append(`Slot ${String(occupant.slot)} — `, freeTextSpan(occupant.name));
    button.addEventListener('click', () =>
      options.actions.replace(incoming.id, occupant.item_id),
    );
    choices.append(button);
  }
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  cancel.disabled = options.disabled;
  cancel.addEventListener('click', options.actions.cancelReplacement);
  dialog.append(heading, explanation, choices, cancel);
  return dialog;
}

export function renderItems(options: ItemsPanelOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel';
  section.dataset.testid = 'items-panel';
  const heading = document.createElement('h2');
  heading.textContent = 'Items and attunement';
  const rule = document.createElement('p');
  rule.textContent =
    'A character has exactly three attunement slots. Attuning a fourth item asks which current item to replace.';
  section.append(heading, rule);

  if (options.panel.items.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No possessions are recorded.';
    section.append(empty);
  } else {
    const table = document.createElement('table');
    table.className = 'item-table';
    const caption = document.createElement('caption');
    caption.textContent = 'Possessions';
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Item', 'Quantity', 'Attunement', 'Actions']) {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = label;
      headRow.append(cell);
    }
    head.append(headRow);
    const body = document.createElement('tbody');
    for (const item of options.panel.items) {
      const row = document.createElement('tr');
      row.dataset.itemId = String(item.id);
      const name = document.createElement('th');
      name.scope = 'row';
      name.append(freeTextSpan(item.name));
      const quantity = document.createElement('td');
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.step = '1';
      quantityInput.value = String(item.quantity);
      quantityInput.disabled = options.disabled;
      quantityInput.setAttribute('aria-label', `Quantity for ${item.name}`);
      quantityInput.addEventListener('change', () => {
        const next = Number(quantityInput.value);
        if (Number.isSafeInteger(next) && next >= 1 && next !== item.quantity) {
          options.actions.updateQuantity(item.id, next);
        } else {
          quantityInput.value = String(item.quantity);
        }
      });
      quantity.append(quantityInput);
      const state = document.createElement('td');
      state.textContent =
        item.attunement_slot === null
          ? item.requires_attunement
            ? 'Not attuned'
            : 'Not required'
          : `Slot ${String(item.attunement_slot)}`;
      const action = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'button-secondary';
      edit.textContent = 'Edit';
      edit.disabled = options.disabled;
      edit.setAttribute('aria-label', `Edit ${item.name}`);
      edit.addEventListener('click', () =>
        options.onEditingChanged(item.id),
      );
      action.append(edit);
      if (item.attunement_slot !== null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button-secondary';
        button.textContent = 'Unattune';
        button.disabled = options.disabled;
        button.setAttribute('aria-label', `Unattune ${item.name}`);
        button.addEventListener('click', () =>
          options.actions.unattune(item.id),
        );
        action.append(button);
      } else if (item.requires_attunement) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button-secondary';
        button.textContent = 'Attune';
        button.disabled = options.disabled;
        button.setAttribute('aria-label', `Attune ${item.name}`);
        button.addEventListener('click', () => options.actions.attune(item.id));
        action.append(button);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary';
      remove.textContent = 'Remove';
      remove.disabled = options.disabled;
      remove.setAttribute('aria-label', `Remove ${item.name}`);
      remove.addEventListener('click', () =>
        options.actions.removeItem(item.id, item.name),
      );
      action.append(remove);
      row.append(name, quantity, state, action);
      body.append(row);
    }
    table.append(caption, head, body);
    section.append(table);
  }

  const modal = replacementModal(options);
  if (modal !== null) {
    section.append(modal);
  }
  const editing =
    options.editing === null || options.editing === 'new'
      ? null
      : (options.panel.items.find(
          (item) => item.id === options.editing,
        ) ?? null);
  if (
    options.editing === null ||
    (options.editing !== 'new' && editing === null)
  ) {
    // The item vanished under the form — removed in another tab, or undone.
    // Showing the add affordance lets the next click heal the stale view state.
    const add = document.createElement('button');
    add.type = 'button';
    add.textContent = 'Add item';
    add.disabled = options.disabled;
    add.dataset.focusKey = 'item-add';
    add.addEventListener('click', () => options.onEditingChanged('new'));
    section.append(add);
  } else {
    section.append(renderItemForm(options, editing));
  }
  return section;
}

function renderItemForm(
  options: ItemsPanelOptions,
  editing: CharacterItem | null,
): HTMLElement {
  const initial = editing === null ? blankItem() : itemFields(editing);
  let nameValue = initial.name;
  let descriptionValue = initial.description;
  let quantityValue = initial.quantity;
  let requiresAttunement = initial.requires_attunement;
  const preservedEffects = (initial.effects ?? []).filter(
    (effect) => effect.effect_kind !== 'ability_override',
  );
  let overrides: AbilityOverrideDraft[] = (initial.effects ?? []).flatMap(
    (effect): AbilityOverrideDraft[] =>
      effect.effect_kind === 'ability_override'
        ? [{
            ability: effect.ability,
            maximum: effect.maximum,
            label: effect.label,
            notes: effect.notes,
          }]
        : [],
  );

  const form = document.createElement('form');
  form.className = 'item-form';
  form.dataset.testid = 'item-form';
  form.noValidate = true;
  const fieldset = document.createElement('fieldset');
  fieldset.disabled = options.disabled;
  const legend = document.createElement('legend');
  legend.textContent = editing === null ? 'Add an item' : `Edit ${editing.name}`;
  fieldset.append(legend);

  const name = document.createElement('input');
  name.type = 'text';
  name.required = true;
  name.value = nameValue;
  name.dataset.focusKey = 'item-name';
  name.addEventListener('input', () => {
    nameValue = name.value;
  });
  const description = document.createElement('textarea');
  description.value = descriptionValue ?? '';
  description.addEventListener('input', () => {
    const trimmed = description.value.trim();
    descriptionValue = trimmed === '' ? null : trimmed;
  });
  const quantity = document.createElement('input');
  quantity.type = 'number';
  quantity.min = '1';
  quantity.step = '1';
  quantity.value = String(quantityValue);
  quantity.addEventListener('input', () => {
    const parsed = Number(quantity.value);
    if (Number.isSafeInteger(parsed) && parsed >= 1) {
      quantityValue = parsed;
    }
  });
  const attunement = document.createElement('input');
  attunement.type = 'checkbox';
  attunement.checked = requiresAttunement;
  attunement.addEventListener('change', () => {
    requiresAttunement = attunement.checked;
  });
  fieldset.append(
    labelled('Name', name, 'item-name'),
    labelled('Description', description, 'item-description'),
    labelled('Quantity', quantity, 'item-quantity'),
    labelled('Requires attunement', attunement, 'item-requires-attunement'),
  );

  const effects = document.createElement('fieldset');
  const effectsLegend = document.createElement('legend');
  effectsLegend.textContent = 'Effects';
  effects.append(effectsLegend);
  if (preservedEffects.length > 0) {
    const preserved = document.createElement('p');
    preserved.textContent =
      `${String(preservedEffects.length)} other recorded effect` +
      `${preservedEffects.length === 1 ? ' is' : 's are'} preserved.`;
    effects.append(preserved);
  }
  const rows = document.createElement('div');
  rows.className = 'item-effect-rows';
  const rebuildEffects = (): void => {
    rows.replaceChildren();
    overrides.forEach((override, index) => {
      const row = document.createElement('fieldset');
      row.dataset.effectKind = 'ability_override';
      const rowLegend = document.createElement('legend');
      rowLegend.textContent = `Ability score override ${String(index + 1)}`;
      const ability = document.createElement('select');
      for (const value of abilities) {
        const entry = document.createElement('option');
        entry.value = value;
        entry.textContent = value;
        entry.selected = override.ability === value;
        ability.append(entry);
      }
      ability.addEventListener('change', () => {
        const current = overrides[index];
        if (current === undefined) {
          return;
        }
        overrides[index] = {
          ...current,
          ability: ability.value as Ability,
        };
      });
      const maximum = document.createElement('input');
      maximum.type = 'number';
      maximum.min = '1';
      maximum.max = '30';
      maximum.step = '1';
      maximum.value =
        override.maximum === null ? '' : String(override.maximum);
      maximum.addEventListener('input', () => {
        const current = overrides[index];
        if (current === undefined) {
          return;
        }
        const parsed = Number(maximum.value);
        overrides[index] = {
          ...current,
          maximum:
            Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 30
              ? parsed
              : null,
        };
      });
      const label = document.createElement('input');
      label.type = 'text';
      label.required = true;
      label.value = override.label;
      label.addEventListener('input', () => {
        const current = overrides[index];
        if (current !== undefined) {
          overrides[index] = { ...current, label: label.value };
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button-secondary';
      remove.textContent = 'Remove effect';
      remove.addEventListener('click', () => {
        overrides = overrides.filter((_, candidate) => candidate !== index);
        rebuildEffects();
      });
      row.append(
        rowLegend,
        labelled(
          'Ability',
          ability,
          `item-effect-${String(index)}-ability`,
        ),
        labelled(
          'Set score to',
          maximum,
          `item-effect-${String(index)}-set-to`,
        ),
        labelled(
          'Source label',
          label,
          `item-effect-${String(index)}-label`,
        ),
        remove,
      );
      rows.append(row);
    });
  };
  rebuildEffects();
  const kind = document.createElement('select');
  const abilityOverride = document.createElement('option');
  abilityOverride.value = 'ability_override';
  abilityOverride.textContent = 'Ability score override';
  kind.append(abilityOverride);
  const addEffect = document.createElement('button');
  addEffect.type = 'button';
  addEffect.textContent = 'Add effect';
  addEffect.addEventListener('click', () => {
    overrides = [
      ...overrides,
      {
        ability: 'strength',
        maximum: null,
        label: '',
        notes: null,
      },
    ];
    rebuildEffects();
  });
  effects.append(
    rows,
    labelled('Effect kind', kind, 'item-effect-kind'),
    addEffect,
  );
  fieldset.append(effects);

  const error = document.createElement('p');
  error.className = 'item-form-error';
  error.setAttribute('role', 'alert');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = editing === null ? 'Add item' : 'Save item';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'button-secondary';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => options.onEditingChanged(null));
  fieldset.append(submit, cancel);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (nameValue.trim() === '') {
      error.textContent = 'An item needs a name.';
      form.append(error);
      return;
    }
    if (
      overrides.some(
        (override) =>
          override.maximum === null || override.label.trim() === '',
      )
    ) {
      error.textContent =
        'Every ability score override needs a source label and a set-to value from 1 to 30.';
      form.append(error);
      return;
    }
    const overrideEffects = overrides.map((override) => {
      if (override.maximum === null) {
        throw new Error('Validated override unexpectedly lacks a set-to value.');
      }
      return {
        effect_kind: 'ability_override' as const,
        ability: override.ability,
        maximum: override.maximum,
        label: override.label,
        notes: override.notes,
      };
    });
    const item: ItemFields = {
      name: nameValue,
      description: descriptionValue,
      quantity: quantityValue,
      requires_attunement: requiresAttunement,
      source_instance_id: initial.source_instance_id,
      effects: [
        ...preservedEffects,
        ...overrideEffects,
      ],
    };
    if (editing === null) {
      options.actions.addItem(item);
    } else {
      options.actions.updateItem(editing.id, item);
    }
    options.onEditingChanged(null);
  });
  form.append(fieldset);
  return form;
}
