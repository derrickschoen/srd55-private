import { describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import type {
  DraftRevision,
  PublishPreview,
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type {
  HomebrewDraftItemUuid,
  HomebrewDraftUuid,
} from '../../../src/authoring/ids';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, type Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredSpeciesDraft,
  renderSpeciesForm,
} from '../../../src/ui/screens/homebrew/species-form';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

const hostile = '</textarea><img data-ha7-hostile src=x> "quoted" 🐉 \u202eRTL\u202c nul\u0000\u0001tail';

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function speciesDocument(): SpeciesAuthoringDraft {
  return {
    kind: 'species',
    document_version: 1,
    name: hostile,
    rules_edition: 'expanded',
    reference_text: hostile,
    creature_type: 'Clockwork',
    primary_size: 'Colossal',
    alternate_size: 'Small',
    walking_speed_feet: 35,
    traits: [{
      draft_item_uuid: itemUuid('trait-one'),
      name: hostile,
      description: hostile,
      effects: [{
        kind: 'damage_resistance',
        draft_item_uuid: itemUuid('effect-one'),
        label: hostile,
        notes: hostile,
        damage_type: 'Void' as never,
      }],
    }],
    grants: [
      {
        kind: 'fixed_spell',
        draft_item_uuid: itemUuid('grant-fixed'),
        rule_key: 'fixed-light',
        spell_content_key: '2024:spell:light' as ContentKey,
        always_prepared: true,
      },
      {
        kind: 'choice_from_list',
        draft_item_uuid: itemUuid('grant-list'),
        rule_key: 'arcane-list',
        list: 'Wizard',
        count: 1,
        maximum_spell_level: 1,
      },
      {
        kind: 'choice_from_query',
        draft_item_uuid: itemUuid('grant-query'),
        rule_key: 'time-query',
        schools: ['Chronomancy' as never],
        tags: ['time'],
        count: 1,
        minimum_spell_level: 0,
        maximum_spell_level: 2,
      },
      {
        kind: 'skill_proficiency',
        draft_item_uuid: itemUuid('grant-skill'),
        rule_key: 'lore-skill',
        count: 1,
        skills: ['arcana', 'history'],
      },
    ],
  };
}

function stored(document = speciesDocument()): StoredHomebrewDraft {
  return {
    draft_uuid: 'ha7-species-draft' as HomebrewDraftUuid,
    content_kind: 'species',
    document_version: 1,
    base_content_key: null,
    revision: 0 as DraftRevision,
    document,
    created_at: '2026-08-06T12:00:00.000Z',
    updated_at: '2026-08-06T12:00:00.000Z',
  };
}

function unused<T>(): Promise<T> {
  return Promise.reject(new Error('Unused authoring client method.'));
}

function client(overrides: Partial<AuthoringClient> = {}): AuthoringClient {
  return {
    list: () => unused(),
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

function context(navigated: string[] = []): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: parseRoute(new URL('https://example.test/homebrew/drafts/ha7-species-draft')),
    router: { navigate: (target: string) => navigated.push(target) } as unknown as Router,
    rpc: null as never,
    registerNavigationGuard: () => () => undefined,
  };
}

function byId(
  root: InteractiveTestElement,
  tag: 'input' | 'select' | 'textarea',
  id: string,
): InteractiveTestElement {
  const control = root.querySelectorAll(tag).find(
    (candidate) => candidate.getAttribute('id') === id,
  );
  if (control === undefined) throw new Error(`Missing ${tag}#${id}.`);
  return control;
}

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const control = root.querySelectorAll('button').find(
    (candidate) => candidate.textContent === label,
  );
  if (control === undefined) throw new Error(`Missing ${label} button.`);
  return control;
}

function input(control: InteractiveTestElement, value: string): void {
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
}

function preview(review: PublishPreview['review'] = []): PublishPreview {
  return {
    token: 'publish-token' as never,
    facts: {
      draft_uuid: 'ha7-species-draft' as HomebrewDraftUuid,
      draft_revision: 1 as DraftRevision,
      content_kind: 'species',
      canonical_json: '{}' as never,
      candidate_content_keys: [],
      candidate_identities: [],
    },
    aggregate: {
      kind: 'species',
      name: hostile,
      rules_edition: 'expanded',
      reference_text: hostile,
      repeatable: false,
      creature_type: 'Clockwork' as never,
      primary_size: 'Colossal' as never,
      alternate_size: 'Small',
      walking_speed_feet: 35,
      traits: [{
        sort_order: 1,
        name: hostile,
        description: hostile,
        effects: [{
          kind: 'damage_resistance',
          sort_order: 1,
          label: hostile,
          notes: hostile,
          damage_type: 'Void' as never,
        }],
      }],
      grants: [{ kind: 'skill_proficiency', rule_key: 'lore-skill', count: 1, skills: ['arcana'] }],
    },
    review,
  };
}

describe('HA-7 species authoring form', () => {
  it('renders every typed section, known-plus-custom values, labelled controls, ordering buttons, and hostile prose inertly', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: client(),
        mount,
        draft,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      expect(elementText(root as unknown as Node)).toContain('Species details');
      expect(elementText(root as unknown as Node)).toContain('Supported grants');
      expect(elementText(root as unknown as Node)).toContain('Fixed spell');
      expect(elementText(root as unknown as Node)).toContain('Choice from list');
      expect(elementText(root as unknown as Node)).toContain('Choice from query');
      expect(elementText(root as unknown as Node)).toContain('Skill proficiency');
      expect(elementText(root as unknown as Node)).not.toContain('Raw grant');
      expect(elementText(root as unknown as Node)).not.toContain('New class');
      expect(byId(root, 'input', 'species-creature-type').value).toBe('Clockwork');
      expect(byId(root, 'input', 'species-primary-size').value).toBe('Colossal');
      expect(root.querySelectorAll('datalist')).toHaveLength(4);
      expect(root.querySelectorAll('datalist')[0]?.querySelectorAll('option')).toHaveLength(14);
      expect(root.querySelectorAll('datalist')[1]?.querySelectorAll('option')).toHaveLength(6);
      expect(root.querySelectorAll('[aria-label="Reorder Clockwork"]')).toHaveLength(0);
      expect(root.querySelectorAll('.authoring-card-controls').length).toBeGreaterThanOrEqual(5);
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('script')).toHaveLength(0);
      expect(root.querySelectorAll('[data-ha7-hostile]')).toHaveLength(0);
      expect(root.querySelectorAll('[data-free-text="unverified-origin"]').length)
        .toBeGreaterThanOrEqual(2);

      const controlIds = root.querySelectorAll('input')
        .filter((control) => control.getAttribute('type') !== 'radio')
        .map((control) => control.getAttribute('id'));
      expect(controlIds.every((id) => id !== null && id !== '')).toBe(true);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('edits custom roots, traits, effects, and skill grants, saves with CAS, previews, publishes, and routes to the library', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const empty: SpeciesAuthoringDraft = {
        kind: 'species', document_version: 1, name: '', rules_edition: null,
        reference_text: '', creature_type: '', primary_size: '', alternate_size: null,
        walking_speed_feet: null, traits: [], grants: [],
      };
      const savedDocuments: SpeciesAuthoringDraft[] = [];
      const calls: string[] = [];
      const authoring = client({
        saveDraft: async (params) => {
          if (params.document.kind !== 'species') throw new Error('Expected species.');
          savedDocuments.push(params.document);
          return { ...stored(params.document), revision: 1 as DraftRevision };
        },
        previewPublish: async () => {
          calls.push('preview');
          return preview();
        },
        commitPublish: async (params) => {
          calls.push(`commit:${String(params.decisions.length)}`);
          return {
            outcome: 'created',
            content_key: 'expanded:species:clockwork-voyager' as ContentKey,
            name: 'Clockwork Voyager',
            catalog_layer: 'external',
            previous_key_usage_count: 0,
          };
        },
      });
      const navigated: string[] = [];
      const screenContext = context(navigated);
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored(empty);
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      let uuid = 0;
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        randomUuid: () => `ha7-item-${String(++uuid)}`,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(byId(root, 'input', 'species-name'), 'Clockwork Voyager');
      const edition = byId(root, 'select', 'species-rules-edition');
      edition.value = 'expanded';
      edition.dispatchEvent(new Event('change'));
      input(byId(root, 'input', 'species-creature-type'), 'Clockwork');
      input(byId(root, 'input', 'species-primary-size'), 'Colossal');
      input(byId(root, 'input', 'species-walking-speed'), '35');

      button(root, 'Add trait').click();
      input(byId(root, 'input', 'species-trait-ha7-item-1-name'), 'Void Ward');
      input(byId(root, 'textarea', 'species-trait-ha7-item-1-description'), 'A ward against the void.');
      button(root, 'Add effect').click();
      input(byId(root, 'input', 'authoring-effect-ha7-item-2-label'), 'Void resistance');
      const damageType = byId(root, 'input', 'authoring-effect-ha7-item-2-damage_type');
      damageType.value = 'Void';
      damageType.dispatchEvent(new Event('change'));

      button(root, 'Add grant').click();
      input(byId(root, 'input', 'species-grant-ha7-item-3-rule-key'), 'clockwork-lore');
      input(byId(root, 'input', 'species-grant-ha7-item-3-count'), '1');
      const arcana = byId(root, 'input', 'species-grant-ha7-item-3-skill-arcana');
      arcana.checked = true;
      arcana.dispatchEvent(new Event('change'));
      button(root, 'Save draft').click();
      await settle();

      const savedDocument = savedDocuments[0];
      if (savedDocument === undefined) throw new Error('The draft was not saved.');
      expect(savedDocument).toEqual(expect.objectContaining({
        name: 'Clockwork Voyager',
        rules_edition: 'expanded',
        creature_type: 'Clockwork',
        primary_size: 'Colossal',
        walking_speed_feet: 35,
      }));
      expect(savedDocument.traits).toEqual([
        expect.objectContaining({
          name: 'Void Ward',
          description: 'A ward against the void.',
          effects: [expect.objectContaining({ label: 'Void resistance', damage_type: 'Void' })],
        }),
      ]);
      expect(savedDocument.grants).toEqual([
        expect.objectContaining({
          kind: 'skill_proficiency',
          rule_key: 'clockwork-lore',
          count: 1,
          skills: ['arcana'],
        }),
      ]);

      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(calls).toEqual(['preview']);
      expect(elementText(root as unknown as Node)).toContain('Publish preview');
      expect(root.querySelectorAll('img')).toHaveLength(0);
      button(root, 'Publish species').click();
      await settle();
      expect(calls).toEqual(['preview', 'commit:0']);
      expect(elementText(root as unknown as Node)).toContain('Species published');
      expect(elementText(root as unknown as Node)).toContain('Homebrew');
      root.querySelector('a')?.click();
      expect(navigated).toEqual(['/homebrew']);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('reports every backend validation path and uses the common adoption modal for review-required publish', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let mode: 'invalid' | 'review' = 'invalid';
      const decisions: unknown[] = [];
      const authoring = client({
        previewPublish: () => mode === 'invalid'
          ? Promise.reject(new RpcError('handler_error', 'Validation failed.', {
              reason: 'validation_failed',
              issues: [
                { path: ['name'], code: 'required', message: 'Name is required.' },
                { path: ['traits', 0, 'name'], code: 'required', message: 'Trait name is required.' },
                {
                  path: ['traits', 0, 'effects', 0, 'damage_type'],
                  code: 'required',
                  message: 'Damage type is required.',
                },
                {
                  path: ['grants', 3, 'skills'],
                  code: 'required',
                  message: 'At least one skill is required.',
                },
              ],
            }))
          : Promise.resolve(preview([{
              candidate_content_key: '2024:species:human' as ContentKey,
              candidate_name: 'Human',
              reason: 'srd-fallback',
              default_decision: 'match',
            }])),
        commitPublish: async (params) => {
          decisions.push(...params.decisions);
          return {
            outcome: 'created',
            content_key: 'expanded:species:private-human' as ContentKey,
            name: 'Private Human',
            catalog_layer: 'external',
            previous_key_usage_count: 0,
          };
        },
      });
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(elementText(root as unknown as Node)).toContain('Name is required.');
      expect(elementText(root as unknown as Node)).toContain('Trait name is required.');
      expect(elementText(root as unknown as Node)).toContain('Damage type is required.');
      expect(elementText(root as unknown as Node)).toContain('At least one skill is required.');
      const damageType = root.querySelectorAll('input').find((control) =>
        control.getAttribute('data-authoring-path') ===
          JSON.stringify(['traits', 0, 'effects', 0, 'damage_type']));
      expect(damageType?.getAttribute('aria-invalid')).toBe('true');
      expect(root.querySelectorAll('[aria-invalid="true"]')).toHaveLength(4);

      mode = 'review';
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(root, 'Publish species').click();
      const dialog = interactiveElement(screenContext.root)
        .querySelector('[data-testid="content-adoption-modal"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.isConnected).toBe(true);
      expect(dialog?.open).toBe(true);
      expect(elementText(dialog as unknown as Node)).toContain('SRD fingerprint fallback');
      const dialogRoot = interactiveElement(dialog as unknown as Element);
      const clone = byId(dialogRoot, 'input', 'publish-adoption-1-clone');
      clone.checked = true;
      clone.dispatchEvent(new Event('change'));
      input(byId(dialogRoot, 'input', 'publish-adoption-1-clone-name'), 'Private Human');
      dialog?.querySelectorAll('button').find(
        (candidate) => candidate.textContent === 'Publish with these choices',
      )?.click();
      await settle();
      expect(decisions).toEqual([{
        candidate_content_key: '2024:species:human',
        decision: 'clone',
        clone_name: 'Private Human',
      }]);
      expect(elementText(root as unknown as Node)).toContain('Species published');
      expect(elementText(root as unknown as Node)).toContain('Homebrew');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('reuses the revision-CAS conflict modal and never force-overwrites a newer saved species draft', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let saveCalls = 0;
      const authoring = client({
        saveDraft: (params) => {
          saveCalls += 1;
          return Promise.reject(new RpcError('handler_error', 'Draft revision is stale.', {
            reason: 'stale_draft_revision',
            draft_uuid: params.draft_uuid,
            expected_revision: params.expected_revision,
            actual_revision: 2,
          }));
        },
      });
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(byId(root, 'input', 'species-name'), 'Local unsaved name');
      button(root, 'Save draft').click();
      await settle();
      const dialog = interactiveElement(screenContext.root)
        .querySelector('[data-testid="authoring-draft-conflict"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.open).toBe(true);
      expect(elementText(dialog as unknown as Node)).toContain('Nothing was overwritten.');
      expect(elementText(dialog as unknown as Node)).not.toContain('Force overwrite');
      dialog?.querySelectorAll('button').find(
        (candidate) => candidate.textContent === 'Keep my unsaved changes',
      )?.click();
      await settle();
      expect(saveCalls).toBe(1);
      expect(byId(root, 'input', 'species-name').value).toBe('Local unsaved name');
      expect(root.querySelector('.species-authoring-status')?.textContent)
        .toBe('The newer saved revision was left unchanged.');
      cleanup();
    } finally {
      restoreDocument();
    }
  });
});
