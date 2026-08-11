import { describe, expect, it } from 'vitest';
import type { AuthoringDraftGrant } from '../../../src/authoring/contracts';
import type { ContentKey } from '../../../src/domain/ids';
import type { HomebrewDraftItemUuid } from '../../../src/authoring/ids';
import { spellGrantControls } from '../../../src/ui/screens/homebrew/spell-grant-controls';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const hostileName = '</option><img data-hostile-spell src=x onerror=alert(1)> Ember';

function fixedGrant(): Extract<AuthoringDraftGrant, { readonly kind: 'fixed_spell' }> {
  return {
    kind: 'fixed_spell',
    draft_item_uuid: 'picker-fixed' as HomebrewDraftItemUuid,
    rule_key: '',
    spell_content_key: null,
    always_prepared: false,
  };
}

describe('shared spell grant author controls', () => {
  it('shows inert installed spell names under visible catalog layers and stores the key', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const grant = fixedGrant();
      const host = document.createElement('div');
      host.append(...spellGrantControls({
        grant,
        prefix: 'fixed',
        path: ['grants', 0],
        pathAttribute: () => ({}),
        references: {
          spells: [{
            content_key: 'expanded:spell:hostile' as ContentKey,
            name: hostileName,
            rules_edition: 'expanded',
            level: 2,
            catalog_layer: 'external',
          }],
          lists: ['Wizard'],
        },
        peerRuleKeys: ['fixed-spell'],
        ruleKeyScope: 'species',
        change: (field, value) => Reflect.set(grant, field, value),
      }));
      const root = interactiveElement(host);

      const selected = root.querySelector('select');
      if (selected === null) throw new Error('Spell selector is missing.');
      const select = interactiveElement(selected as unknown as Node);
      expect(elementText(select as unknown as Node)).toContain(hostileName);
      expect(root.querySelectorAll('[data-hostile-spell]')).toHaveLength(0);
      expect(select.querySelector('optgroup')?.getAttribute('label')).toBe(
        'Level 2 · Expanded rules — Homebrew · external layer',
      );
      select.value = 'expanded:spell:hostile';
      select.dispatchEvent(new Event('change'));
      expect(grant.spell_content_key).toBe('expanded:spell:hostile');
      expect(grant.rule_key).toBe('fixed-option-img-data-hostile-spell-src-x-onerror-alert-1-ember');
      expect(elementText(root as unknown as Node)).not.toContain('content key');
      expect(elementText(root as unknown as Node)).toContain(
        'Every grant for this species must use a different label.',
      );
    } finally {
      restoreDocument();
    }
  });

  it('enumerates installed list names and generates a unique stable label', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const grant: Extract<AuthoringDraftGrant, { readonly kind: 'choice_from_list' }> = {
        kind: 'choice_from_list',
        draft_item_uuid: 'picker-list' as HomebrewDraftItemUuid,
        rule_key: '',
        list: '',
        count: 1,
        minimum_spell_level: 0,
        maximum_spell_level: 0,
      };
      const host = document.createElement('div');
      host.append(...spellGrantControls({
        grant,
        prefix: 'list',
        path: ['grants', 0],
        pathAttribute: () => ({}),
        references: { spells: [], lists: ['Cleric', 'Wizard'] },
        peerRuleKeys: ['wizard-spell-choice'],
        ruleKeyScope: 'subclass_level',
        change: (field, value) => Reflect.set(grant, field, value),
      }));
      const root = interactiveElement(host);
      const selected = root.querySelector('select');
      if (selected === null) throw new Error('Spell-list selector is missing.');
      const select = interactiveElement(selected as unknown as Node);
      expect([...select.querySelectorAll('option')].map((option) =>
        elementText(option as unknown as Node))).toEqual([
        'Choose an installed spell list', 'Cleric', 'Wizard',
      ]);
      select.value = 'Wizard';
      select.dispatchEvent(new Event('change'));
      expect(grant.list).toBe('Wizard');
      expect(grant.rule_key).toBe('wizard-spell-choice-2');
      expect(elementText(root as unknown as Node)).toContain(
        'Reuse it at another class level to continue one choice slot',
      );
    } finally {
      restoreDocument();
    }
  });
});
