import { describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import type {
  BackgroundAuthoringDraft,
  BackgroundAuthoringReferences,
  DraftRevision,
  PublishPreview,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftItemUuid, HomebrewDraftUuid } from '../../../src/authoring/ids';
import type { ContentKey } from '../../../src/domain/ids';
import { parseRoute, Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredBackgroundDraft,
  renderBackgroundForm,
} from '../../../src/ui/screens/homebrew/background-form';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

const hostile = '</textarea><img data-ha9-hostile src=x> "quoted" 🐲 \u202eRTL\u202c nul\u0000\u0001tail';

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function documentFixture(): BackgroundAuthoringDraft {
  return {
    kind: 'background',
    document_version: 1,
    name: hostile,
    rules_edition: '2024',
    reference_text: hostile,
    suggested_abilities: ['strength', 'dexterity', 'wisdom'],
    default_origin_feat_content_key: '2024:feat:alert' as ContentKey,
    default_origin_feat_display_name: hostile,
    skill_proficiencies: ['arcana', 'survival'],
    tool_reference_text: hostile,
    equipment_option_a_description: hostile,
    equipment_option_b_description: 'Armor package',
    equipment_option_a: [
      {
        kind: 'weapon',
        draft_item_uuid: itemUuid('weapon-a'),
        quantity: 1,
        printed_name: hostile,
        content_key: '2024:weapon:club' as ContentKey,
      },
      {
        kind: 'gear',
        draft_item_uuid: itemUuid('gear-a'),
        quantity: 2,
        printed_name: 'Map case',
      },
    ],
    equipment_option_b: [{
      kind: 'armor',
      draft_item_uuid: itemUuid('armor-b'),
      quantity: 1,
      printed_name: 'Leather Armor',
      content_key: '2024:armor:leather-armor' as ContentKey,
    }],
    effects: [
      {
        kind: 'armor_class_bonus',
        draft_item_uuid: itemUuid('effect-ac'),
        label: hostile,
        notes: hostile,
        amount: 1,
      },
      {
        kind: 'damage_resistance',
        draft_item_uuid: itemUuid('effect-resistance'),
        label: 'Void ward',
        notes: null,
        damage_type: 'Void' as never,
      },
    ],
  };
}

function stored(
  document = documentFixture(),
  revision = 0 as DraftRevision,
): StoredHomebrewDraft {
  return {
    draft_uuid: 'ha9-background-draft' as HomebrewDraftUuid,
    content_kind: 'background',
    document_version: 1,
    base_content_key: null,
    revision,
    document,
    created_at: '2026-08-06T12:00:00.000Z',
    updated_at: '2026-08-06T12:00:00.000Z',
  };
}

const references: BackgroundAuthoringReferences = {
  origin_feats: [{ content_key: '2024:feat:alert' as ContentKey, name: 'Alert', rules_edition: '2024', catalog_layer: 'bundled' }],
  weapons: [{ content_key: '2024:weapon:club' as ContentKey, name: hostile, rules_edition: '2024', catalog_layer: 'external' }],
  armors: [{ content_key: '2024:armor:leather-armor' as ContentKey, name: 'Leather Armor', rules_edition: '2024', catalog_layer: 'unknown' }],
};

function unused<T>(): Promise<T> {
  return Promise.reject(new Error('Unused authoring client method.'));
}

function client(overrides: Partial<AuthoringClient> = {}): AuthoringClient {
  return {
    list: () => unused(),
    backgroundReferences: () => Promise.resolve(references),
    createDraft: () => unused(),
    readDraft: () => unused(),
    saveDraft: () => unused(),
    discardDraft: () => unused(),
    previewPublish: () => unused(),
    commitPublish: () => unused(),
    usages: () => unused(),
    previewReplacement: () => unused(),
    commitReplacement: () => unused(),
    ...overrides,
  };
}

function context(router?: Router): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: router?.current ?? parseRoute(new URL('https://example.test/homebrew/drafts/ha9-background-draft')),
    router: router ?? ({ navigate: () => undefined } as unknown as Router),
    rpc: null as never,
    registerNavigationGuard: router === undefined
      ? () => () => undefined
      : (guard) => router.registerNavigationGuard(guard),
  };
}

function routerWindow(initialUrl: string): Window {
  const events = new EventTarget();
  const location = { href: initialUrl, origin: new URL(initialUrl).origin };
  let state: unknown = null;
  const history = {
    get state(): unknown { return state; },
    pushState(next: unknown, _title: string, target?: string | URL | null): void {
      state = next;
      if (target !== undefined && target !== null) location.href = new URL(String(target), location.href).href;
    },
    replaceState(next: unknown, _title: string, target?: string | URL | null): void {
      state = next;
      if (target !== undefined && target !== null) location.href = new URL(String(target), location.href).href;
    },
  };
  return {
    location,
    history,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => events.addEventListener(type, listener),
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => events.removeEventListener(type, listener),
  } as unknown as Window;
}

function render(
  authoring = client(),
  draft = stored(),
  screenContext = context(),
  randomUuid?: () => string,
): { readonly root: InteractiveTestElement; readonly cleanup: () => void } {
  if (!isStoredBackgroundDraft(draft)) throw new Error('Background fixture did not narrow.');
  const mount = document.createElement('div');
  mount.setAttribute('aria-label', 'Background authoring form');
  screenContext.root.append(mount);
  const cleanup = renderBackgroundForm({
    context: screenContext,
    client: authoring,
    mount,
    draft,
    references,
    ...(randomUuid === undefined ? {} : { randomUuid }),
    confirmLeave: () => false,
    windowObject: new EventTarget() as unknown as Window,
  });
  return { root: interactiveElement(mount), cleanup };
}

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const found = root.querySelectorAll('button').find((candidate) => candidate.textContent === label);
  if (found === undefined) throw new Error(`Missing ${label} button.`);
  return found;
}

function byId(root: InteractiveTestElement, tag: string, id: string): InteractiveTestElement {
  const found = root.querySelectorAll(tag).find((candidate) => candidate.getAttribute('id') === id);
  if (found === undefined) throw new Error(`Missing ${tag}#${id}.`);
  return found;
}

function input(target: InteractiveTestElement, value: string): void {
  target.value = value;
  target.dispatchEvent(new Event('input'));
}

function keyboardActivate(target: InteractiveTestElement): void {
  target.focus();
  const enter = new Event('keydown', { cancelable: true }) as KeyboardEvent;
  Object.defineProperty(enter, 'key', { value: 'Enter' });
  // The lightweight DOM has no user-agent default actions, so model the
  // native Enter activation after giving application listeners first refusal.
  if (target.dispatchEvent(enter)) target.click();
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
}

function preview(): PublishPreview {
  return {
    token: 'ha9-preview-token' as never,
    facts: {
      draft_uuid: 'ha9-background-draft' as HomebrewDraftUuid,
      draft_revision: 1 as DraftRevision,
      content_kind: 'background',
      canonical_json: '{}' as never,
      candidate_content_keys: [],
      candidate_identities: [],
    },
    aggregate: {
      kind: 'background',
      name: hostile,
      rules_edition: '2024',
      reference_text: hostile,
      repeatable: false,
      grants: [],
      suggested_abilities: ['strength', 'dexterity', 'wisdom'],
      default_origin_feat_content_key: '2024:feat:alert' as ContentKey,
      default_origin_feat: { kind: 'feat', scheme: 'content-v1' as never, digest: 'feat' as never },
      default_origin_feat_display_name: hostile,
      skill_proficiencies: ['arcana', 'survival'],
      tool_reference_text: hostile,
      equipment_option_a_description: hostile,
      equipment_option_b_description: 'Armor package',
      equipment_option_a: [{ kind: 'gear', sort_order: 1, quantity: 2, printed_name: hostile }],
      equipment_option_b: [],
      effects: [{ kind: 'armor_class_bonus', sort_order: 1, label: hostile, notes: hostile, amount: 1 }],
    },
    review: [],
  };
}

describe('HA-9 background authoring form', () => {
  it('renders only the exact draft contract, labels every control, and keeps hostile catalog and preview text inert', async () => {
    const restore = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const rendered = render(client({
        previewPublish: async () => { calls.push('preview'); return preview(); },
        commitPublish: async () => {
          calls.push('commit');
          return {
            outcome: 'created', content_key: '2024:content.background:ward' as ContentKey,
            name: hostile, catalog_layer: 'external', previous_key_usage_count: 0,
          };
        },
      }));
      const form = rendered.root.querySelector('form');
      expect(rendered.root.getAttribute('aria-label')).toBe('Background authoring form');
      expect(form?.getAttribute('aria-label')).toBeNull();
      expect(elementText(rendered.root as unknown as Node)).toContain('Choose exactly 3.');
      expect(elementText(rendered.root as unknown as Node)).toContain('Choose exactly 2.');
      expect(elementText(rendered.root as unknown as Node)).not.toContain('Feature name');
      expect(elementText(rendered.root as unknown as Node)).not.toContain('Language grant');
      const labelTargets = new Set(rendered.root.querySelectorAll('label').map((label) => label.getAttribute('for')));
      const controls = rendered.root.querySelectorAll('input').concat(
        rendered.root.querySelectorAll('select'), rendered.root.querySelectorAll('textarea'),
      );
      expect(controls.filter((control) => {
        const id = control.getAttribute('id');
        return id === null || !labelTargets.has(id);
      }).map((control) => `${control.tagName}#${control.getAttribute('id') ?? ''}`)).toEqual([]);
      expect(rendered.root.querySelectorAll('img')).toHaveLength(0);
      expect(rendered.root.querySelectorAll('[data-ha9-hostile]')).toHaveLength(0);
      const optionLabels = rendered.root.querySelectorAll('option').map(
        (option) => elementText(option as unknown as Node),
      );
      expect(optionLabels).toContain('Alert (2024) — SRD · bundled layer');
      expect(optionLabels).toContain(
        `${hostile} (2024) — Homebrew · external layer`,
      );
      expect(optionLabels).toContain(
        'Leather Armor (2024) — Unknown catalog layer',
      );

      form?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(calls).toEqual(['preview']);
      expect(elementText(rendered.root as unknown as Node)).toContain('Publish preview');
      expect(rendered.root.querySelectorAll('img')).toHaveLength(0);
      expect(rendered.root.querySelectorAll('[data-ha9-hostile]')).toHaveLength(0);
      button(rendered.root, 'Publish background').click();
      await settle();
      expect(calls).toEqual(['preview', 'commit']);
      expect(elementText(rendered.root as unknown as Node)).toContain('Background published');
      expect(rendered.root.querySelectorAll('img')).toHaveLength(0);
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('adds, changes, keyboard-reorders, and removes equipment and shared flat effects', async () => {
    const restore = installInteractiveDocument();
    try {
      const saved: BackgroundAuthoringDraft[] = [];
      let sequence = 0;
      const rendered = render(client({
        saveDraft: async (params) => {
          if (params.document.kind !== 'background') throw new Error('Expected background.');
          saved.push(params.document);
          return stored(params.document, 1 as DraftRevision);
        },
      }), stored({
        ...documentFixture(), equipment_option_a: [], equipment_option_b: [], effects: [],
      }), undefined, () => `ha9-item-${String(++sequence)}`);
      button(rendered.root, 'Add equipment to option A').click();
      input(byId(rendered.root, 'input', 'background-equipment-a-ha9-item-1-printed-name'), 'Rope');
      input(byId(rendered.root, 'input', 'background-equipment-a-ha9-item-1-quantity'), '2');
      button(rendered.root, 'Add equipment to option A').click();
      const secondKind = byId(rendered.root, 'select', 'background-equipment-a-ha9-item-2-kind');
      secondKind.value = 'weapon';
      secondKind.dispatchEvent(new Event('change'));
      input(byId(rendered.root, 'input', 'background-equipment-a-ha9-item-2-printed-name'), 'Club');
      input(byId(rendered.root, 'input', 'background-equipment-a-ha9-item-2-quantity'), '1');
      const catalog = byId(rendered.root, 'select', 'background-equipment-a-ha9-item-2-catalog');
      catalog.value = '2024:weapon:club';
      catalog.dispatchEvent(new Event('change'));
      const moveUp = rendered.root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up option A item 2, item 2 of 2');
      if (moveUp === undefined) throw new Error('Equipment reorder is missing.');
      keyboardActivate(moveUp);
      expect(document.activeElement).toBe(moveUp);
      const moveDown = rendered.root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move down option A Club, item 1 of 2');
      if (moveDown === undefined) throw new Error('Equipment move-down control is missing.');
      keyboardActivate(moveDown);
      expect(document.activeElement).toBe(moveDown);
      const removeRope = rendered.root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Remove option A Rope, item 1 of 2');
      if (removeRope === undefined) throw new Error('Equipment removal control is missing.');
      keyboardActivate(removeRope);

      button(rendered.root, 'Add equipment to option B').click();
      const armorKind = byId(rendered.root, 'select', 'background-equipment-b-ha9-item-3-kind');
      armorKind.value = 'armor';
      armorKind.dispatchEvent(new Event('change'));
      input(byId(rendered.root, 'input', 'background-equipment-b-ha9-item-3-printed-name'), 'Leather Armor');
      input(byId(rendered.root, 'input', 'background-equipment-b-ha9-item-3-quantity'), '1');
      const armorCatalog = byId(rendered.root, 'select', 'background-equipment-b-ha9-item-3-catalog');
      expect(armorCatalog.querySelectorAll('option').map((option) => option.getAttribute('value')))
        .toEqual(['', '2024:armor:leather-armor']);
      expect(elementText(armorCatalog as unknown as Node)).toContain('Leather Armor');
      expect(elementText(armorCatalog as unknown as Node)).not.toContain(hostile);
      armorCatalog.value = '2024:armor:leather-armor';
      armorCatalog.dispatchEvent(new Event('change'));

      button(rendered.root, 'Add effect').click();
      input(byId(rendered.root, 'input', 'authoring-effect-ha9-item-4-label'), 'Route armor');
      input(byId(rendered.root, 'input', 'authoring-effect-ha9-item-4-amount'), '2');
      byId(rendered.root, 'input', 'authoring-effect-ha9-item-4-amount').dispatchEvent(new Event('change'));
      button(rendered.root, 'Add effect').click();
      const secondEffectKind = byId(rendered.root, 'select', 'authoring-effect-ha9-item-5-kind');
      secondEffectKind.value = 'damage_resistance';
      secondEffectKind.dispatchEvent(new Event('change'));
      input(byId(rendered.root, 'input', 'authoring-effect-ha9-item-5-label'), 'Void ward');
      input(byId(rendered.root, 'input', 'authoring-effect-ha9-item-5-damage_type'), 'Void');
      byId(rendered.root, 'input', 'authoring-effect-ha9-item-5-damage_type').dispatchEvent(new Event('change'));
      const removeFirst = rendered.root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Remove Route armor, item 1 of 2');
      if (removeFirst === undefined) throw new Error('Effect removal is missing.');
      removeFirst.focus();
      expect(document.activeElement).toBe(removeFirst);
      removeFirst.click();
      button(rendered.root, 'Save draft').click();
      await settle();
      expect(saved[0]?.equipment_option_a).toEqual([
        {
          kind: 'weapon', draft_item_uuid: itemUuid('ha9-item-2'),
          printed_name: 'Club', quantity: 1,
          content_key: '2024:weapon:club' as ContentKey,
        },
      ]);
      expect(saved[0]?.equipment_option_b).toEqual([
        {
          kind: 'armor', draft_item_uuid: itemUuid('ha9-item-3'),
          printed_name: 'Leather Armor', quantity: 1,
          content_key: '2024:armor:leather-armor' as ContentKey,
        },
      ]);
      expect(saved[0]?.effects).toEqual([
        expect.objectContaining({ kind: 'damage_resistance', label: 'Void ward', damage_type: 'Void' }),
      ]);
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('preserves edits made during a late save and advances the stored revision for the next save', async () => {
    const restore = installInteractiveDocument();
    try {
      const saveControl: {
        finish: ((value: StoredHomebrewDraft) => void) | null;
      } = { finish: null };
      const expected: DraftRevision[] = [];
      const documents: BackgroundAuthoringDraft[] = [];
      const rendered = render(client({
        saveDraft: (params) => {
          if (params.document.kind !== 'background') throw new Error('Expected background.');
          expected.push(params.expected_revision);
          documents.push(params.document);
          if (expected.length === 1) {
            return new Promise((resolve) => { saveControl.finish = resolve; });
          }
          return Promise.resolve(stored(params.document, 2 as DraftRevision));
        },
      }));
      input(byId(rendered.root, 'input', 'background-name'), 'First snapshot');
      button(rendered.root, 'Save draft').click();
      input(byId(rendered.root, 'input', 'background-name'), 'Newer local edit');
      if (saveControl.finish === null) throw new Error('Late save resolver is missing.');
      saveControl.finish(stored({ ...documentFixture(), name: 'First snapshot' }, 1 as DraftRevision));
      await settle();
      expect(byId(rendered.root, 'input', 'background-name').value).toBe('Newer local edit');
      expect(rendered.root.querySelector('.background-authoring-status')?.textContent)
        .toContain('newer unsaved changes remain');
      button(rendered.root, 'Save draft').click();
      await settle();
      expect(expected).toEqual([0, 1]);
      expect(documents[1]?.name).toBe('Newer local edit');
      rendered.cleanup();
    } finally {
      restore();
    }
  });

  it('discards stale preview success and failure with the shared live notice', async () => {
    const restore = installInteractiveDocument();
    try {
      for (const outcome of ['success', 'failure'] as const) {
        const previewControl: {
          finish: ((value: PublishPreview) => void) | null;
          fail: ((reason: unknown) => void) | null;
        } = { finish: null, fail: null };
        const rendered = render(client({
          previewPublish: () => new Promise((resolve, reject) => {
            previewControl.finish = resolve;
            previewControl.fail = reject;
          }),
        }));
        const previewForm = rendered.root.querySelector('form');
        previewForm?.dispatchEvent(new Event('submit', { cancelable: true }));
        const strength = byId(
          rendered.root, 'input', 'background-suggested_abilities-strength',
        );
        strength.checked = false;
        strength.dispatchEvent(new Event('change'));
        if (outcome === 'success') {
          if (previewControl.finish === null) throw new Error('Preview resolver missing.');
          previewControl.finish(preview());
        } else {
          if (previewControl.fail === null) throw new Error('Preview rejecter missing.');
          previewControl.fail(new Error('Preview failure.'));
        }
        await settle();
        const attachedForm = rendered.root.querySelector('form');
        expect(previewForm?.isConnected).toBe(false);
        expect(attachedForm?.isConnected).toBe(true);
        expect(rendered.root.querySelector('[data-authoring-action="publish-background"]')).toBeNull();
        expect(attachedForm?.querySelector('.background-authoring-status')?.textContent)
          .toBe('Draft changed; preview again.');
        rendered.cleanup();
      }
    } finally {
      restore();
    }
  });

  it('keeps dirty navigation blocked until a successful save and clears it through a connected publish flow', async () => {
    const restore = installInteractiveDocument();
    try {
      const router = new Router(routerWindow('https://example.test/homebrew/drafts/ha9-background-draft'));
      const publishControl: {
        finish: ((value: Awaited<ReturnType<AuthoringClient['commitPublish']>>) => void) | null;
      } = { finish: null };
      const authoring = client({
        saveDraft: async (params) => stored(params.document as BackgroundAuthoringDraft, 1 as DraftRevision),
        previewPublish: async () => preview(),
        commitPublish: () => new Promise((resolve) => { publishControl.finish = resolve; }),
      });
      const rendered = render(authoring, stored(), context(router));
      input(byId(rendered.root, 'input', 'background-name'), 'Dirty background');
      expect(router.navigate('/blocked-after-edit')).toBe(false);
      button(rendered.root, 'Save draft').click();
      await settle();
      expect(router.navigate('/clean-after-save')).toBe(true);
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const publish = button(rendered.root, 'Publish background');
      expect(publish.isConnected).toBe(true);
      publish.click();
      input(byId(rendered.root, 'input', 'background-name'), 'Dirty while publishing');
      expect(router.navigate('/blocked-while-publishing')).toBe(false);
      if (publishControl.finish === null) throw new Error('Publish resolver is missing.');
      publishControl.finish({
        outcome: 'created', content_key: '2024:content.background:dirty' as ContentKey,
        name: 'Dirty background', catalog_layer: 'external', previous_key_usage_count: 0,
      });
      await settle();
      expect(router.navigate('/clean-after-publish')).toBe(true);
      rendered.cleanup();
      router.stop();
    } finally {
      restore();
    }
  });

  it('opens the shared focus-trapped adoption dialog for a reviewed background publish', async () => {
    const restore = installInteractiveDocument();
    try {
      const reviewed: PublishPreview = {
        ...preview(),
        review: [{
          candidate_content_key: '2024:alternate:background' as ContentKey,
          candidate_name: hostile,
          candidate_catalog_layer: 'external',
          reason: 'alias',
          default_decision: 'match',
        }],
      };
      const rendered = render(client({
        previewPublish: async () => reviewed,
        commitPublish: async () => ({
          outcome: 'matched_existing',
          content_key: '2024:alternate:background' as ContentKey,
          name: hostile,
          catalog_layer: 'external',
          previous_key_usage_count: 0,
        }),
      }));
      rendered.root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(rendered.root, 'Publish background').click();
      const modal = interactiveElement(document.body).querySelector('[data-testid="content-adoption-modal"]');
      if (modal === null) throw new Error('Adoption dialog missing.');
      expect(modal.open).toBe(true);
      expect(document.activeElement?.parentElement?.isConnected).toBe(true);
      expect(modal.querySelector('legend')?.textContent).toBe(
        `${hostile} — Homebrew · external layer`,
      );
      expect(modal.querySelector('[data-ha9-hostile]')).toBeNull();
      expect(modal.querySelectorAll('img')).toHaveLength(0);
      button(modal, 'Publish with these choices').click();
      await settle();
      expect(elementText(rendered.root as unknown as Node)).toContain('Matched existing content');
      rendered.cleanup();
    } finally {
      restore();
    }
  });
});
