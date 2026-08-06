import { describe, expect, it } from 'vitest';
import type { ItemsPanel } from '../../../src/domain/read-models';
import type { ContentKey } from '../../../src/domain/ids';
import {
  activateAttunementReplacementModal,
  renderItems,
  type PlannerItemActions,
} from '../../../src/ui/screens/planner/items';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const panel: ItemsPanel = {
  definitions: [],
  items: [
    {
      id: 10,
      name: 'Crown',
      description: null,
      quantity: 1,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 1,
      effects: [],
    },
    {
      id: 20,
      name: 'Cloak',
      description: null,
      quantity: 2,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 2,
      effects: [],
    },
    {
      id: 30,
      name: 'Ring',
      description: null,
      quantity: 3,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: 3,
      effects: [],
    },
    {
      id: 40,
      name: 'Boots',
      description: null,
      quantity: 4,
      requires_attunement: true,
      source_instance_id: null,
      attunement_slot: null,
      effects: [],
    },
  ],
};

describe('the item attunement surface', () => {
  it('copies a catalog definition into a quantity-one character item without a live key', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const added: Parameters<PlannerItemActions['addItem']>[0][] = [];
      const rendered = interactiveElement(renderItems({
        panel: {
          items: [],
          definitions: [{
            content_key: 'expanded:content.v1:definition' as ContentKey,
            name: 'Giant Belt',
            description: 'Sets Strength.',
            requires_attunement: true,
            effects: [{
              effect_kind: 'ability_override',
              ability: 'strength',
              maximum: 23,
              label: 'Giant strength',
              notes: 'While worn.',
            }],
          }],
        },
        replacement: null,
        actions: {
          addItem: (item) => added.push(item),
          updateItem: () => undefined,
          removeItem: () => undefined,
          updateQuantity: () => undefined,
          attune: () => undefined,
          unattune: () => undefined,
          replace: () => undefined,
          cancelReplacement: () => undefined,
        },
        disabled: false,
        editing: null,
        onEditingChanged: () => undefined,
      }));

      const catalogButton = rendered
        .querySelectorAll('button')
        .find((button) => button.textContent === 'Add catalog item');
      if (catalogButton === undefined) {
        throw new Error(`Catalog button missing from: ${elementText(rendered as unknown as Node)}`);
      }
      const definitionSelect = rendered.querySelector('select');
      if (definitionSelect === null) throw new Error('Catalog select missing.');
      definitionSelect.value = 'expanded:content.v1:definition';
      catalogButton.click();

      expect(added).toEqual([{
        name: 'Giant Belt',
        description: 'Sets Strength.',
        quantity: 1,
        requires_attunement: true,
        source_instance_id: null,
        effects: [{
          effect_kind: 'ability_override',
          ability: 'strength',
          maximum: 23,
          label: 'Giant strength',
          notes: 'While worn.',
        }],
      }]);
      expect(JSON.stringify(added)).not.toContain('content_key');
    } finally {
      restoreDocument();
    }
  });

  it('renders all three structural slots and dispatches the ordinary controls', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: (itemId, quantity) =>
          calls.push(`quantity:${String(itemId)}:${String(quantity)}`),
        attune: (itemId) => calls.push(`attune:${String(itemId)}`),
        unattune: (itemId) => calls.push(`unattune:${String(itemId)}`),
        replace: () => undefined,
        cancelReplacement: () => undefined,
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions,
          disabled: false,
          editing: null,
          onEditingChanged: () => undefined,
        }),
      );

      expect(elementText(rendered as unknown as Node)).toContain('Slot 1');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 2');
      expect(elementText(rendered as unknown as Node)).toContain('Slot 3');
      rendered.querySelector('[aria-label="Unattune Crown"]')?.click();
      rendered.querySelector('[aria-label="Attune Boots"]')?.click();
      const quantity = rendered.querySelector('[aria-label="Quantity for Cloak"]');
      if (quantity === null) {
        throw new Error('Quantity control did not render.');
      }
      quantity.value = '6';
      quantity.dispatchEvent(new Event('change'));
      expect(calls).toEqual([
        'unattune:10',
        'attune:40',
        'quantity:20:6',
      ]);
    } finally {
      restoreDocument();
    }
  });

  it('traps modal focus, cancels on Escape, and restores the invoking control', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const invoker = document.createElement('button');
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: () => undefined,
        attune: () => undefined,
        unattune: () => undefined,
        replace: (itemId, replacedItemId) =>
          calls.push(`replace:${String(itemId)}:${String(replacedItemId)}`),
        cancelReplacement: () => calls.push('cancel'),
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: {
            item_id: 40,
            occupants: [
              { slot: 1, item_id: 10, name: 'Crown' },
              { slot: 2, item_id: 20, name: 'Cloak' },
              { slot: 3, item_id: 30, name: 'Ring' },
            ],
          },
          actions,
          disabled: false,
          editing: null,
          onEditingChanged: () => undefined,
        }),
      );
      document.body.append(invoker, rendered as unknown as Node);
      invoker.focus();
      // The add-item button follows the modal in the rendered section.
      const dialog = rendered.children.at(-2);
      const choices = dialog?.children[2];

      expect(dialog?.getAttribute('data-testid')).toBe(
        'attunement-replace-modal',
      );
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe(
        'attunement-replace-heading',
      );
      expect(dialog?.getAttribute('aria-describedby')).toBe(
        'attunement-replace-explanation',
      );
      expect(choices?.children).toHaveLength(3);
      if (dialog === undefined) {
        throw new Error('Attunement replacement dialog did not render.');
      }
      const destroy = activateAttunementReplacementModal(
        dialog as unknown as HTMLDialogElement,
        {
          cancel: actions.cancelReplacement,
          restoreFocus: () => invoker.focus(),
        },
      );
      const buttons = dialog.querySelectorAll('button');
      expect(document.activeElement).toBe(buttons[0]);
      expect(
        buttons.map((button) => button.getAttribute('aria-label')),
      ).toEqual([
        'Replace Crown with Boots',
        'Replace Cloak with Boots',
        'Replace Ring with Boots',
        null,
      ]);

      dialog.dispatchEvent(keydown('Tab', true));
      expect(document.activeElement).toBe(buttons.at(-1));
      dialog.dispatchEvent(keydown('Tab'));
      expect(document.activeElement).toBe(buttons[0]);

      choices?.children[1]?.click();
      expect(calls[0]).toBe('replace:40:20');
      dialog.dispatchEvent(keydown('Escape'));
      expect(calls).toEqual(['replace:40:20', 'cancel']);
      expect(document.activeElement).toBe(invoker);
      destroy();
    } finally {
      restoreDocument();
    }
  });

  it('offers ability_override with ability and set-to fields in the item editor', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const actions: PlannerItemActions = {
        addItem: () => undefined,
        updateItem: () => undefined,
        removeItem: () => undefined,
        updateQuantity: () => undefined,
        attune: () => undefined,
        unattune: () => undefined,
        replace: () => undefined,
        cancelReplacement: () => undefined,
      };
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions,
          disabled: false,
          editing: 'new',
          onEditingChanged: () => undefined,
        }),
      );

      expect(elementText(rendered as unknown as Node)).toContain(
        'Ability score override',
      );
      expect(elementText(rendered as unknown as Node)).toContain('Effect kind');
      expect(rendered.querySelectorAll('select')[0]?.children[0]?.value).toBe(
        'ability_override',
      );
      const form = rendered.querySelector('[data-testid="item-form"]');
      if (form === null) {
        throw new Error('Item form did not render.');
      }
      expect(unlabelledFormControls(form)).toEqual([]);
      expect(
        form.querySelectorAll('button').map((button) => button.textContent),
      ).toEqual(['Add effect', 'Add item', 'Cancel']);
      form
        .querySelectorAll('button')
        .find((button) => button.textContent === 'Add effect')
        ?.click();
      expect(unlabelledFormControls(form)).toEqual([]);
      expect(
        form
          .querySelector('[aria-label="Remove effect 1"]')
          ?.textContent,
      ).toBe('Remove effect');
    } finally {
      restoreDocument();
    }
  });

  it('recovers the add affordance when the item under an edit form vanishes', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = interactiveElement(
        renderItems({
          panel,
          replacement: null,
          actions: {
            addItem: () => undefined,
            updateItem: () => undefined,
            removeItem: () => undefined,
            updateQuantity: () => undefined,
            attune: () => undefined,
            unattune: () => undefined,
            replace: () => undefined,
            cancelReplacement: () => undefined,
          },
          disabled: false,
          editing: 99,
          onEditingChanged: () => undefined,
        }),
      );

      expect(
        rendered
          .querySelectorAll('button')
          .some((button) => button.textContent === 'Add item'),
      ).toBe(true);
      expect(rendered.querySelector('[data-testid="item-form"]')).toBeNull();
    } finally {
      restoreDocument();
    }
  });
});

function keydown(key: string, shiftKey = false): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event as KeyboardEvent;
}

function unlabelledFormControls(
  form: ReturnType<typeof interactiveElement>,
): string[] {
  const labels = form.querySelectorAll('label');
  return [
    ...form.querySelectorAll('input'),
    ...form.querySelectorAll('select'),
    ...form.querySelectorAll('textarea'),
  ]
    .filter((control) => {
      if (control.getAttribute('aria-label') !== null) {
        return false;
      }
      return !labels.some(
        (label) =>
          (control.id !== '' && label.htmlFor === control.id) ||
          label.children.includes(control),
      );
    })
    .map((control) => `${control.tagName}#${control.id}`);
}
