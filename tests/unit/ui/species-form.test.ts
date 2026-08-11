import { describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import { CatalogAuthoringService } from '../../../src/authoring/draft-service';
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
import { DatabaseContext } from '../../../src/db/database';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredSpeciesDraft,
  renderSpeciesForm as renderSpeciesFormBase,
} from '../../../src/ui/screens/homebrew/species-form';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';
import { openTestDatabase } from '../../helpers/open-db';

type TestSpeciesFormOptions = Omit<
  Parameters<typeof renderSpeciesFormBase>[0],
  'spellGrantReferences'
> & { readonly spellGrantReferences?: Parameters<
  typeof renderSpeciesFormBase
>[0]['spellGrantReferences'] };

function renderSpeciesForm(options: TestSpeciesFormOptions) {
  return renderSpeciesFormBase({
    ...options,
    spellGrantReferences: options.spellGrantReferences ?? { spells: [], lists: [] },
  });
}

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
        minimum_spell_level: 1,
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
    backgroundReferences: () => unused(),
    spellGrantReferences: () => unused(),
    createDraft: () => unused(),
    readDraft: () => unused(),
    saveDraft: () => unused(),
    discardDraft: () => unused(),
    previewPublish: () => unused(),
    commitPublish: () => unused(),
    usages: () => unused(),
    previewReplacement: () => unused(),
    commitReplacement: () => unused(),
    previewReplacementSet: () => unused(),
    commitReplacementSet: () => unused(),
    previewArchiveSet: () => unused(),
    commitArchiveSet: () => unused(),
    listArchivedSets: () => unused(),
    previewRestoreSet: () => unused(),
    commitRestoreSet: () => unused(),
    purgeArchivedSet: () => unused(),
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

function routerWindow(initialUrl: string): Window {
  const events = new EventTarget();
  const location = { href: initialUrl, origin: new URL(initialUrl).origin };
  let state: unknown = null;
  const history = {
    get state(): unknown { return state; },
    pushState(nextState: unknown, _unused: string, target?: string | URL | null): void {
      state = nextState;
      if (target !== undefined && target !== null) {
        location.href = new URL(String(target), location.href).href;
      }
    },
    replaceState(nextState: unknown, _unused: string, target?: string | URL | null): void {
      state = nextState;
      if (target !== undefined && target !== null) {
        location.href = new URL(String(target), location.href).href;
      }
    },
  };
  return {
    location,
    history,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
      events.addEventListener(type, listener),
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
      events.removeEventListener(type, listener),
  } as unknown as Window;
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
        spellGrantReferences: {
          spells: [{
            content_key: '2024:spell:light' as ContentKey,
            name: 'Light', rules_edition: '2024', level: 0, catalog_layer: 'bundled',
          }],
          lists: ['Wizard'],
        },
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
      expect(root.querySelectorAll('select').find((control) =>
        control.getAttribute('id')?.endsWith('-spell'))?.querySelector('optgroup')
        ?.getAttribute('label')).toBe('Cantrip · 2024 — SRD · bundled layer');
      expect(elementText(root as unknown as Node)).not.toContain('Spell content key');
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
      expect(navigated).toEqual([
        '/homebrew?publishOutcome=created&publishedKey=expanded%3Aspecies%3Aclockwork-voyager&publishedName=Clockwork+Voyager&publishedLayer=external&previousUsageCount=0',
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('uses the common adoption modal for review-required publish', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const decisions: unknown[] = [];
      const authoring = client({
        previewPublish: () => Promise.resolve(preview([{
          candidate_content_key: '2024:species:human' as ContentKey,
          candidate_name: 'Human',
          candidate_catalog_layer: 'bundled',
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
      const navigated: string[] = [];
      const screenContext = context(navigated);
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
      expect(navigated).toEqual([
        '/homebrew?publishOutcome=created&publishedKey=expanded%3Aspecies%3Aprivate-human&publishedName=Private+Human&publishedLayer=external&previousUsageCount=0',
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA11-VERSION-RESULT routes an edited publication with usages to the explicit fix review', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const oldKey = 'expanded:content.species:version-old' as ContentKey;
      const newKey = 'expanded:content.species:version-new' as ContentKey;
      const navigated: string[] = [];
      const screenContext = context(navigated);
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = { ...stored(), base_content_key: oldKey };
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: client({
          previewPublish: async () => preview(),
          commitPublish: async () => ({
            outcome: 'created', content_key: newKey, name: 'Clockwork Voyager',
            catalog_layer: 'external', previous_key_usage_count: 2,
          }),
        }),
        mount,
        draft,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(root, 'Publish species').click();
      await settle();
      expect(navigated).toEqual([
        '/homebrew?publishOutcome=created&publishedKey=expanded%3Acontent.species%3Aversion-new&publishedName=Clockwork+Voyager&publishedLayer=external&previousUsageCount=2&previousKey=expanded%3Acontent.species%3Aversion-old',
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('rehydrates the live Save control after loading a conflicting saved revision', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const remote = stored({ ...speciesDocument(), name: 'Remote saved name' });
      const authoring = client({
        saveDraft: (params) => Promise.reject(new RpcError(
          'handler_error',
          'Draft revision is stale.',
          {
            reason: 'stale_draft_revision',
            draft_uuid: params.draft_uuid,
            expected_revision: params.expected_revision,
            actual_revision: 2,
          },
        )),
        readDraft: async () => ({ ...remote, revision: 2 as DraftRevision }),
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
      const disconnectedSave = button(root, 'Save draft');
      disconnectedSave.click();
      await settle();
      const conflict = interactiveElement(screenContext.root)
        .querySelector('[data-testid="authoring-draft-conflict"]');
      conflict?.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Load saved revision',
      )?.click();
      await settle();

      const liveSave = button(root, 'Save draft');
      expect(disconnectedSave.isConnected).toBe(false);
      expect(liveSave.isConnected).toBe(true);
      expect(document.activeElement).toBe(liveSave);
      expect(liveSave.disabled).toBe(false);
      expect(button(root, 'Preview publish').disabled).toBe(false);
      expect(byId(root, 'input', 'species-name').value).toBe('Remote saved name');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('round-trips ordered custom vocabulary and every species grant/effect variant through save, reload, and rehydration', async () => {
    const connection = await openTestDatabase();
    const restoreDocument = installInteractiveDocument();
    try {
      const effects: SpeciesAuthoringDraft['traits'][number]['effects'] = [
        { kind: 'damage_resistance', draft_item_uuid: itemUuid('effect-01'), label: 'Void ward', notes: 'one', damage_type: 'Void' as never },
        { kind: 'hp_modifier', draft_item_uuid: itemUuid('effect-02'), label: 'Dense', notes: 'two', hit_points_flat: 2, hit_points_per_level: 1 },
        { kind: 'speed', draft_item_uuid: itemUuid('effect-03'), label: 'Fast', notes: 'three', speed_bonus_feet: 5 },
        { kind: 'ability_increase', draft_item_uuid: itemUuid('effect-04'), label: 'Clever', notes: 'four', ability: 'intelligence', amount: 2, maximum: 22 },
        { kind: 'ability_override', draft_item_uuid: itemUuid('effect-05'), label: 'Strong', notes: 'five', ability: 'strength', maximum: 23 },
        { kind: 'armor_class_bonus', draft_item_uuid: itemUuid('effect-06'), label: 'Guarded', notes: 'six', amount: 1 },
        { kind: 'armor_class_formula', draft_item_uuid: itemUuid('effect-07'), label: 'Shell', notes: 'seven', base: 13, ability_1: 'dexterity', ability_2: 'constitution', allows_shield: true },
        { kind: 'attack_ability_override', draft_item_uuid: itemUuid('effect-08'), label: 'Bonded', notes: 'eight', ability: 'charisma', weapon_scope: 'one_bonded_weapon' },
        { kind: 'weapon_attack_bonus', draft_item_uuid: itemUuid('effect-09'), label: 'Accurate', notes: 'nine', amount: 1, weapon_scope: 'any_weapon' },
        { kind: 'weapon_damage_bonus', draft_item_uuid: itemUuid('effect-10'), label: 'Forceful', notes: 'ten', amount: 2, weapon_scope: 'one_bonded_weapon' },
      ];
      const roundTripDocument: SpeciesAuthoringDraft = {
        ...speciesDocument(),
        name: 'Round Trip Voyager',
        traits: [{
          draft_item_uuid: itemUuid('trait-round-trip'),
          name: 'Ordered machinery',
          description: 'Every supported effect remains ordered.',
          effects,
        }],
      };
      const database = new DatabaseContext(connection);
      let uuid = 0;
      const service = new CatalogAuthoringService(database, {
        randomUuid: () => `ha7-round-trip-${String(++uuid)}`,
        now: () => '2042-08-06T12:00:00.000Z',
      });
      const created = service.createDraft({ content_kind: 'species' });
      const initial = service.saveDraft({
        draft_uuid: created.draft_uuid,
        expected_revision: created.revision,
        document: roundTripDocument,
      });
      const authoring = client({
        saveDraft: (params) => Promise.resolve(service.saveDraft(params)),
        readDraft: (params) => Promise.resolve(service.readDraft(params.draft_uuid)),
      });
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = initial;
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const firstCleanup = renderSpeciesForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      button(root, 'Save draft').click();
      await settle();
      const reloaded = await authoring.readDraft({ draft_uuid: draft.draft_uuid });
      if (!isStoredSpeciesDraft(reloaded)) throw new Error('Reloaded draft is not species.');
      expect(reloaded.document).toEqual(roundTripDocument);
      const firstSavedDocument = structuredClone(reloaded.document);
      const firstEncodedDocument = database.scalar<string>(
        'SELECT document_json FROM catalog_content_drafts WHERE draft_uuid = ?',
        [draft.draft_uuid],
      );
      if (firstEncodedDocument === null) throw new Error('First encoded draft is missing.');
      firstCleanup();
      mount.replaceChildren();
      const secondCleanup = renderSpeciesForm({
        context: screenContext,
        client: authoring,
        mount,
        draft: reloaded,
        windowObject: new EventTarget() as unknown as Window,
      });

      expect(byId(root, 'input', 'species-creature-type').value).toBe('Clockwork');
      expect(byId(root, 'input', 'species-primary-size').value).toBe('Colossal');
      const effectCards = root.querySelectorAll('.authoring-effect-card');
      expect(effectCards.map((card) => card.getAttribute('data-draft-item-uuid')))
        .toEqual(effects.map((effect) => effect.draft_item_uuid));
      expect(effectCards.map((card) => card.querySelectorAll('select')[0]?.value))
        .toEqual(effects.map((effect) => effect.kind));
      expect(byId(root, 'input', 'authoring-effect-effect-01-damage_type').value)
        .toBe('Void');
      const grantCards = root.querySelectorAll('.species-grant-card');
      expect(grantCards.map((card) => card.getAttribute('data-draft-item-uuid')))
        .toEqual(roundTripDocument.grants.map((grant) => grant.draft_item_uuid));
      expect(grantCards.map((card) => card.querySelectorAll('select')[0]?.value))
        .toEqual(['fixed_spell', 'choice_from_list', 'choice_from_query', 'skill_proficiency']);
      expect(elementText(root as unknown as Node))
        .toContain('Minimum spell level (optional)');
      expect(byId(root, 'input', 'species-grant-grant-list-minimum-level').value)
        .toBe('1');
      expect(byId(root, 'textarea', 'species-grant-grant-query-schools').value)
        .toBe('Chronomancy');
      expect(byId(root, 'input', 'species-grant-grant-skill-skill-arcana').checked)
        .toBe(true);
      button(root, 'Save draft').click();
      await settle();
      const savedAgain = await authoring.readDraft({ draft_uuid: draft.draft_uuid });
      if (!isStoredSpeciesDraft(savedAgain)) throw new Error('Second saved draft is not species.');
      const secondEncodedDocument = database.scalar<string>(
        'SELECT document_json FROM catalog_content_drafts WHERE draft_uuid = ?',
        [draft.draft_uuid],
      );
      if (secondEncodedDocument === null) throw new Error('Second encoded draft is missing.');
      expect(savedAgain.revision).toBe(3);
      expect(savedAgain.document).toEqual(firstSavedDocument);
      expect(secondEncodedDocument).toBe(firstEncodedDocument);
      secondCleanup();
    } finally {
      restoreDocument();
      connection.close();
    }
  });

  it('pins the species dirty lifecycle through the real Router guard seam', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const router = new Router(routerWindow(
        'https://example.test/homebrew/drafts/ha7-species-draft',
      ));
      const screenRoot = document.createElement('div');
      const mount = document.createElement('div');
      screenRoot.append(mount);
      document.body.append(screenRoot);
      let saveMode: 'fail' | 'success' | 'conflict' = 'fail';
      const remote = { ...stored({ ...speciesDocument(), name: 'Remote revision' }), revision: 3 as DraftRevision };
      const authoring = client({
        saveDraft: async (params) => {
          if (saveMode === 'fail') throw new Error('Storage unavailable.');
          if (saveMode === 'conflict') {
            throw new RpcError('handler_error', 'Draft revision is stale.', {
              reason: 'stale_draft_revision',
              draft_uuid: params.draft_uuid,
              expected_revision: params.expected_revision,
              actual_revision: 3,
            });
          }
          if (params.document.kind !== 'species') throw new Error('Expected species.');
          return { ...stored(params.document), revision: 2 as DraftRevision };
        },
        readDraft: async () => remote,
        previewPublish: async () => preview(),
        commitPublish: async () => ({
          outcome: 'created',
          content_key: 'expanded:species:router-guard' as ContentKey,
          name: 'Router Guard Species',
          catalog_layer: 'external',
          previous_key_usage_count: 0,
        }),
      });
      const draft = stored();
      if (!isStoredSpeciesDraft(draft)) throw new Error('Species fixture did not narrow.');
      const cleanup = renderSpeciesForm({
        context: {
          root: screenRoot,
          route: router.current,
          router,
          rpc: null as never,
          registerNavigationGuard: (guard) => router.registerNavigationGuard(guard),
        },
        client: authoring,
        mount,
        draft,
        confirmLeave: () => false,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(byId(root, 'input', 'species-name'), 'Dirty local');
      expect(router.navigate('/blocked-after-edit')).toBe(false);
      button(root, 'Save draft').click();
      await settle();
      expect(button(root, 'Save draft').disabled).toBe(false);
      expect(button(root, 'Preview publish').disabled).toBe(false);
      expect(router.navigate('/blocked-after-failed-save')).toBe(false);

      saveMode = 'success';
      button(root, 'Save draft').click();
      await settle();
      expect(router.navigate('/clean-after-save')).toBe(true);

      input(byId(root, 'input', 'species-name'), 'Keep this local');
      saveMode = 'conflict';
      button(root, 'Save draft').click();
      await settle();
      interactiveElement(screenRoot).querySelector('[data-testid="authoring-draft-conflict"]')
        ?.querySelectorAll('button').find((candidate) =>
          candidate.textContent === 'Keep my unsaved changes',
        )?.click();
      await settle();
      expect(router.navigate('/blocked-after-keep-local')).toBe(false);

      button(root, 'Save draft').click();
      await settle();
      interactiveElement(screenRoot).querySelector('[data-testid="authoring-draft-conflict"]')
        ?.querySelectorAll('button').find((candidate) =>
          candidate.textContent === 'Load saved revision',
        )?.click();
      await settle();
      expect(router.navigate('/clean-after-load-saved')).toBe(true);

      input(byId(root, 'input', 'species-name'), 'Publish clears dirty');
      saveMode = 'success';
      button(root, 'Save draft').click();
      await settle();
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(root, 'Publish species').click();
      await settle();
      expect(router.current.path).toBe('/homebrew');
      expect(router.current.query.get('publishedName')).toBe('Router Guard Species');
      expect(router.navigate('/clean-after-publish')).toBe(true);

      cleanup();
      router.stop();
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
