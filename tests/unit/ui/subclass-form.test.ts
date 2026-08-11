import { describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import type {
  DraftRevision,
  PublishPreview,
  StoredHomebrewDraft,
  SubclassAuthoringDraft,
} from '../../../src/authoring/contracts';
import type {
  HomebrewDraftItemUuid,
  HomebrewDraftUuid,
} from '../../../src/authoring/ids';
import type { GuidedClassOption } from '../../../src/builder/contracts';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  isStoredSubclassDraft,
  renderSubclassForm as renderSubclassFormBase,
  subclassProgressionGridIssues,
} from '../../../src/ui/screens/homebrew/subclass-form';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

type TestSubclassFormOptions = Omit<
  Parameters<typeof renderSubclassFormBase>[0],
  'spellGrantReferences'
> & { readonly spellGrantReferences?: Parameters<
  typeof renderSubclassFormBase
>[0]['spellGrantReferences'] };

function renderSubclassForm(options: TestSubclassFormOptions) {
  return renderSubclassFormBase({
    ...options,
    spellGrantReferences: options.spellGrantReferences ?? { spells: [], lists: [] },
  });
}

const hostile = '</textarea><img data-ha8-hostile src=x> "quoted" 🐲 \u202eRTL\u202c nul\u0000\u0001tail';
const fighterKey = '2024:class:fighter' as ContentKey;
const parents: readonly GuidedClassOption[] = [{
  content_key: fighterKey,
  name: 'Fighter',
  hit_die: 10,
  catalog_layer: 'bundled',
}];

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function rows(): Extract<SubclassAuthoringDraft['progression'], { readonly mode: 'override' }>['rows'] {
  return Array.from({ length: 20 }, (_unused, index) => ({
    class_level: index + 1 as never,
    cantrips_known: 0,
    prepared_or_known_count: 0,
    maximum_spell_level: 0,
    slot_counts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    grants: [],
  }));
}

function richDocument(): SubclassAuthoringDraft {
  return {
    kind: 'subclass',
    document_version: 1,
    name: hostile,
    rules_edition: 'expanded',
    reference_text: hostile,
    parent_class_content_key: fighterKey,
    progression: {
      mode: 'override',
      spellcasting_ability: 'intelligence',
      caster_contribution: 'third_down',
      rows: rows(),
    },
    features: [
      {
        draft_item_uuid: itemUuid('feature-three-a'),
        class_level: 3,
        name: hostile,
        description: hostile,
        effects: [
          {
            kind: 'armor_class_bonus',
            draft_item_uuid: itemUuid('effect-three-a'),
            label: hostile,
            notes: hostile,
            amount: 2,
          },
          {
            kind: 'extra_attack',
            draft_item_uuid: itemUuid('effect-three-b'),
            label: 'Second tempo',
            notes: null,
            attack_count: 2,
            weapon_scope: 'any_weapon',
          },
        ],
      },
      {
        draft_item_uuid: itemUuid('feature-three-b'),
        class_level: 3,
        name: 'Second feature',
        description: 'Same-level ordering control.',
        effects: [],
      },
      {
        draft_item_uuid: itemUuid('feature-six'),
        class_level: 6,
        name: 'Threshold feature',
        description: 'Applied only at the later threshold.',
        effects: [],
      },
    ],
  };
}

function stored(document = richDocument()): StoredHomebrewDraft {
  return {
    draft_uuid: 'ha8-subclass-draft' as HomebrewDraftUuid,
    content_kind: 'subclass',
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
    route: parseRoute(new URL('https://example.test/homebrew/drafts/ha8-subclass-draft')),
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
      if (target !== undefined && target !== null) location.href = new URL(String(target), location.href).href;
    },
    replaceState(nextState: unknown, _unused: string, target?: string | URL | null): void {
      state = nextState;
      if (target !== undefined && target !== null) location.href = new URL(String(target), location.href).href;
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

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const found = root.querySelectorAll('button').find((candidate) => candidate.textContent === label);
  if (found === undefined) throw new Error(`Missing ${label} button.`);
  return found;
}

function control(
  root: InteractiveTestElement,
  tag: 'input' | 'select' | 'textarea',
  id: string,
): InteractiveTestElement {
  const found = root.querySelectorAll(tag).find((candidate) => candidate.getAttribute('id') === id);
  if (found === undefined) throw new Error(`Missing ${tag}#${id}.`);
  return found;
}

function input(target: InteractiveTestElement, value: string): void {
  target.value = value;
  target.dispatchEvent(new Event('input'));
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

function preview(): PublishPreview {
  return {
    token: 'ha8-publish-token' as never,
    facts: {
      draft_uuid: 'ha8-subclass-draft' as HomebrewDraftUuid,
      draft_revision: 1 as DraftRevision,
      content_kind: 'subclass',
      canonical_json: '{}' as never,
      candidate_content_keys: [],
      candidate_identities: [],
    },
    aggregate: {
      kind: 'subclass',
      name: hostile,
      rules_edition: 'expanded',
      reference_text: hostile,
      parent_class: { kind: 'class', scheme: 'content-v1' as never, digest: 'digest' as never },
      grants: [],
      progression: {
        mode: 'override',
        spellcasting_ability: 'intelligence',
        caster_contribution: 'third_down',
        rows: rows().map((entry) => ({ ...entry, grants: [] })) as never,
      },
      features: [{
        class_level: 3,
        sort_order: 1,
        name: hostile,
        description: hostile,
        effects: [{
          kind: 'armor_class_bonus',
          sort_order: 1,
          label: hostile,
          notes: hostile,
          amount: 2,
        }],
      }],
    },
    review: [],
  };
}

describe('HA-8 subclass timeline form', () => {
  it('renders the bundled parent, collapsed 20-level grid, labelled timeline ordering, multiple effects, and hostile prose inertly', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client(),
        mount,
        draft,
        parentClasses: parents,
        spellGrantReferences: { spells: [], lists: ['Cleric', 'Wizard'] },
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      expect(control(root, 'select', 'subclass-parent-class').value).toBe(fighterKey);
      expect(root.querySelectorAll('.subclass-progression-row')).toHaveLength(20);
      expect(root.querySelectorAll('.subclass-progression-run')).toHaveLength(1);
      expect(root.querySelector('.subclass-progression-run')?.getAttribute('open')).toBeNull();
      expect(root.querySelectorAll('.subclass-level-group')).toHaveLength(2);
      expect(root.querySelectorAll('.subclass-feature-card')).toHaveLength(3);
      expect(root.querySelectorAll('.authoring-effect-card')).toHaveLength(2);
      expect(root.querySelectorAll('.authoring-card-controls').length).toBeGreaterThanOrEqual(5);
      expect(root.querySelectorAll('.authoring-card-controls').flatMap((controls) =>
        controls.querySelectorAll('button')).every((control) =>
        (control.getAttribute('aria-label') ?? '').includes('item'))).toBe(true);
      const moveSecondFeatureUp = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up Second feature, item 2 of 2');
      if (moveSecondFeatureUp === undefined) throw new Error('Labelled feature move control is missing.');
      expect(moveSecondFeatureUp.getAttribute('type')).toBe('button');
      moveSecondFeatureUp.click();
      expect(root.querySelectorAll('.subclass-feature-card').slice(0, 2).map((card) =>
        card.querySelectorAll('input').find((entry) => entry.getAttribute('id')?.endsWith('-name'))?.value,
      )).toEqual(['Second feature', hostile]);
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('script')).toHaveLength(0);
      expect(root.querySelectorAll('[data-ha8-hostile]')).toHaveLength(0);
      expect(root.querySelectorAll('[data-free-text="unverified-origin"]').length)
        .toBeGreaterThanOrEqual(2);
      expect(root.querySelectorAll('input').every((entry) => entry.getAttribute('id') !== null))
        .toBe(true);
      expect(elementText(root as unknown as Node)).not.toContain('Raw grant');
      expect(elementText(root as unknown as Node)).not.toContain('New class');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('builds a dense override, creates and moves level features, edits multiple effects, saves, previews, and publishes', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const empty: SubclassAuthoringDraft = {
        kind: 'subclass', document_version: 1, name: '', rules_edition: null,
        reference_text: '', parent_class_content_key: null,
        progression: { mode: 'inherit_parent' }, features: [],
      };
      const savedDocuments: SubclassAuthoringDraft[] = [];
      const calls: string[] = [];
      const authoring = client({
        saveDraft: async (params) => {
          if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
          savedDocuments.push(params.document);
          return { ...stored(params.document), revision: 1 as DraftRevision };
        },
        previewPublish: async () => {
          calls.push('preview');
          return preview();
        },
        commitPublish: async () => {
          calls.push('commit');
          return {
            outcome: 'created',
            content_key: 'expanded:subclass:timeline-ward' as ContentKey,
            name: 'Timeline Ward',
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
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      let uuid = 0;
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        parentClasses: parents,
        randomUuid: () => `ha8-item-${String(++uuid)}`,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(control(root, 'input', 'subclass-name'), 'Timeline Ward');
      const edition = control(root, 'select', 'subclass-rules-edition');
      edition.value = 'expanded';
      edition.dispatchEvent(new Event('change'));
      const parent = control(root, 'select', 'subclass-parent-class');
      parent.value = fighterKey;
      parent.dispatchEvent(new Event('change'));
      const mode = control(root, 'select', 'subclass-progression-mode');
      mode.value = 'override';
      mode.dispatchEvent(new Event('change'));
      expect(root.querySelectorAll('.subclass-progression-row')).toHaveLength(20);
      input(control(root, 'input', 'subclass-progression-20-cantrips_known'), '2');
      input(control(root, 'input', 'subclass-progression-20-prepared_or_known_count'), '4');

      const level = control(root, 'select', 'subclass-add-level');
      level.value = '3';
      button(root, 'Add level').click();
      button(root, 'Add feature at level 3').click();
      input(control(root, 'input', 'subclass-feature-ha8-item-1-name'), 'First ward');
      input(control(root, 'textarea', 'subclass-feature-ha8-item-1-description'), 'A mechanical threshold.');
      button(root, 'Add effect').click();
      input(control(root, 'input', 'authoring-effect-ha8-item-2-label'), 'Threshold armor');
      input(control(root, 'input', 'authoring-effect-ha8-item-2-amount'), '2');
      control(root, 'input', 'authoring-effect-ha8-item-2-amount').dispatchEvent(new Event('change'));
      button(root, 'Add effect').click();
      const secondKind = control(root, 'select', 'authoring-effect-ha8-item-3-kind');
      secondKind.value = 'extra_attack';
      secondKind.dispatchEvent(new Event('change'));
      input(control(root, 'input', 'authoring-effect-ha8-item-3-label'), 'Second tempo');
      input(control(root, 'input', 'authoring-effect-ha8-item-3-attack_count'), '2');
      control(root, 'input', 'authoring-effect-ha8-item-3-attack_count').dispatchEvent(new Event('change'));
      const scope = control(root, 'select', 'authoring-effect-ha8-item-3-weapon_scope');
      scope.value = 'any_weapon';
      scope.dispatchEvent(new Event('change'));

      button(root, 'Add feature at level 3').click();
      const movedLevel = control(root, 'select', 'subclass-feature-ha8-item-4-level');
      movedLevel.value = '6';
      movedLevel.dispatchEvent(new Event('change'));
      input(control(root, 'input', 'subclass-feature-ha8-item-4-name'), 'Later ward');
      input(control(root, 'textarea', 'subclass-feature-ha8-item-4-description'), 'Moves to a new explicit threshold.');
      button(root, 'Save draft').click();
      await settle();

      const saved = savedDocuments[0];
      if (saved === undefined || saved.progression.mode !== 'override') {
        throw new Error('Dense override was not saved.');
      }
      expect(saved.progression.rows).toHaveLength(20);
      expect(saved.progression.rows.map((entry) => entry.class_level)).toEqual(
        Array.from({ length: 20 }, (_unused, index) => index + 1),
      );
      expect(saved.progression.rows[19]).toEqual(expect.objectContaining({
        cantrips_known: 2,
        prepared_or_known_count: 4,
      }));
      expect(saved.features).toEqual([
        expect.objectContaining({
          class_level: 3,
          name: 'First ward',
          effects: [
            expect.objectContaining({ kind: 'armor_class_bonus', amount: 2 }),
            expect.objectContaining({ kind: 'extra_attack', attack_count: 2 }),
          ],
        }),
        expect.objectContaining({ class_level: 6, name: 'Later ward' }),
      ]);

      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(calls).toEqual(['preview']);
      expect(elementText(root as unknown as Node)).toContain('Publish preview');
      expect(elementText(root as unknown as Node)).toContain(
        'Spell attack = proficiency bonus + Intelligence modifier',
      );
      expect(root.querySelector('[aria-label="Progression boundary preview"]')).not.toBeNull();
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('[data-ha8-hostile]')).toHaveLength(0);
      button(root, 'Publish subclass').click();
      await settle();
      expect(calls).toEqual(['preview', 'commit']);
      expect(navigated).toEqual([
        '/homebrew?tab=subclass&publishOutcome=created&publishedKey=expanded%3Asubclass%3Atimeline-ward&publishedName=Timeline+Ward&publishedLayer=external&previousUsageCount=0',
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('edits every level in the dense 20-row progression through its grid controls', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const savedDocuments: SubclassAuthoringDraft[] = [];
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          saveDraft: async (params) => {
            if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
            savedDocuments.push(params.document);
            return { ...stored(params.document), revision: 1 as DraftRevision };
          },
        }),
        mount,
        draft,
        parentClasses: parents,
        spellGrantReferences: { spells: [], lists: ['Cleric', 'Wizard'] },
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      for (let level = 1; level <= 20; level += 1) {
        input(control(root, 'input', `subclass-progression-${String(level)}-cantrips_known`), String(level));
        input(control(root, 'input', `subclass-progression-${String(level)}-prepared_or_known_count`), String(level + 1));
      }
      button(root, 'Save draft').click();
      await settle();
      const saved = savedDocuments[0];
      if (saved === undefined || saved.progression.mode !== 'override') {
        throw new Error('Dense progression was not saved.');
      }
      expect(saved.progression.rows.map((entry) => entry.cantrips_known))
        .toEqual(Array.from({ length: 20 }, (_unused, index) => index + 1));
      expect(saved.progression.rows.map((entry) => entry.prepared_or_known_count))
        .toEqual(Array.from({ length: 20 }, (_unused, index) => index + 2));
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('exposes and saves a labelled minimum spell level for list choices', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const progressionRows = [...rows()];
      progressionRows[2] = {
        ...progressionRows[2]!,
        grants: [{
          kind: 'choice_from_list',
          draft_item_uuid: itemUuid('leveled-list'),
          rule_key: 'leveled-list',
          list: 'Wizard',
          count: 1,
          minimum_spell_level: 1,
          maximum_spell_level: 2,
        }],
      };
      const authoredDocument: SubclassAuthoringDraft = {
        ...richDocument(),
        progression: {
          mode: 'override',
          spellcasting_ability: 'intelligence',
          caster_contribution: 'third_down',
          rows: progressionRows,
        },
      };
      const savedDocuments: SubclassAuthoringDraft[] = [];
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored(authoredDocument);
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          saveDraft: async (params) => {
            if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
            savedDocuments.push(params.document);
            return { ...stored(params.document), revision: 1 as DraftRevision };
          },
        }),
        mount,
        draft,
        parentClasses: parents,
        spellGrantReferences: { spells: [], lists: ['Cleric', 'Wizard'] },
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      const minimum = control(
        root,
        'input',
        'subclass-progression-3-grant-leveled-list-minimum',
      );
      expect(elementText(root as unknown as Node))
        .toContain('Minimum spell level (optional)');
      expect(minimum.value).toBe('1');
      const list = control(
        root,
        'select',
        'subclass-progression-3-grant-leveled-list-list',
      );
      expect(list.value).toBe('Wizard');
      expect(list.querySelectorAll('option').map((option) =>
        elementText(option as unknown as Node))).toEqual([
        'Choose an installed spell list', 'Cleric', 'Wizard',
      ]);
      input(minimum, '2');
      button(root, 'Save draft').click();
      await settle();
      const saved = savedDocuments[0];
      if (saved?.progression.mode !== 'override') {
        throw new Error('Dense progression was not saved.');
      }
      expect(saved.progression.rows[2]?.grants[0]).toMatchObject({
        minimum_spell_level: 2,
        maximum_spell_level: 2,
      });
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('generates stable labels per level so repeated labels continue a slot across levels', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const progressionRows = [...rows()];
      const choice = (uuid: string) => ({
        kind: 'choice_from_list' as const,
        draft_item_uuid: itemUuid(uuid),
        rule_key: '',
        list: 'Wizard',
        count: 1,
        minimum_spell_level: 0,
        maximum_spell_level: 0,
      });
      progressionRows[2] = { ...progressionRows[2]!, grants: [choice('level-three')] };
      progressionRows[3] = { ...progressionRows[3]!, grants: [choice('level-four')] };
      progressionRows[4] = {
        ...progressionRows[4]!,
        grants: [choice('level-five-one'), choice('level-five-two')],
      };
      const authoredDocument: SubclassAuthoringDraft = {
        ...richDocument(),
        progression: {
          mode: 'override',
          spellcasting_ability: 'intelligence',
          caster_contribution: 'third_down',
          rows: progressionRows,
        },
      };
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored(authoredDocument);
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client(),
        mount,
        draft,
        parentClasses: parents,
        spellGrantReferences: { spells: [], lists: ['Wizard'] },
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      expect(control(
        root,
        'input',
        'subclass-progression-3-grant-level-three-stable-label',
      ).value).toBe('wizard-spell-choice');
      expect(control(
        root,
        'input',
        'subclass-progression-4-grant-level-four-stable-label',
      ).value).toBe('wizard-spell-choice');
      expect(control(
        root,
        'input',
        'subclass-progression-5-grant-level-five-one-stable-label',
      ).value).toBe('wizard-spell-choice');
      expect(control(
        root,
        'input',
        'subclass-progression-5-grant-level-five-two-stable-label',
      ).value).toBe('wizard-spell-choice-2');
      expect(elementText(root as unknown as Node)).toContain(
        'Reuse it at another class level to continue one choice slot',
      );
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('creates level groups, moves a feature between levels, and reorders same-level features', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const empty: SubclassAuthoringDraft = {
        ...richDocument(),
        progression: { mode: 'inherit_parent' },
        features: [],
      };
      const savedDocuments: SubclassAuthoringDraft[] = [];
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored(empty);
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      let uuid = 0;
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          saveDraft: async (params) => {
            if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
            savedDocuments.push(params.document);
            return { ...stored(params.document), revision: 1 as DraftRevision };
          },
        }),
        mount,
        draft,
        parentClasses: parents,
        randomUuid: () => `timeline-item-${String(++uuid)}`,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      const level = control(root, 'select', 'subclass-add-level');
      level.value = '3';
      button(root, 'Add level').click();
      button(root, 'Add feature at level 3').click();
      button(root, 'Add feature at level 3').click();
      input(control(root, 'input', 'subclass-feature-timeline-item-1-name'), 'First route');
      input(control(root, 'input', 'subclass-feature-timeline-item-2-name'), 'Second route');
      const moveSecondUp = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up level 3 feature 2, item 2 of 2');
      if (moveSecondUp === undefined) throw new Error('Second feature reorder control is missing.');
      moveSecondUp.click();
      const firstLevel = control(root, 'select', 'subclass-feature-timeline-item-1-level');
      firstLevel.value = '6';
      firstLevel.dispatchEvent(new Event('change'));
      expect(root.querySelectorAll('.subclass-level-group')).toHaveLength(2);
      expect(root.querySelectorAll('.subclass-feature-card').map((card) => card.getAttribute('aria-label')))
        .toEqual(['Level 3 feature 1 of 1', 'Level 6 feature 1 of 1']);
      button(root, 'Save draft').click();
      await settle();
      expect(savedDocuments[0]?.features.map((feature) => ({
        level: feature.class_level,
        name: feature.name,
      }))).toEqual([
        { level: 3, name: 'Second route' },
        { level: 6, name: 'First route' },
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('adds, removes, and reorders multiple effects independently on each feature', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const savedDocuments: SubclassAuthoringDraft[] = [];
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      let uuid = 0;
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          saveDraft: async (params) => {
            if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
            savedDocuments.push(params.document);
            return { ...stored(params.document), revision: 1 as DraftRevision };
          },
        }),
        mount,
        draft,
        parentClasses: parents,
        randomUuid: () => `effect-item-${String(++uuid)}`,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      const featureCards = () => root.querySelectorAll('.subclass-feature-card');
      const addEffect = (featureIndex: number): void => {
        const add = featureCards()[featureIndex]?.querySelectorAll('button')
          .find((candidate) => candidate.textContent === 'Add effect');
        if (add === undefined) throw new Error('Feature add-effect control is missing.');
        add.click();
      };
      addEffect(0);
      input(control(root, 'input', 'authoring-effect-effect-item-1-label'), 'Third effect');
      const moveThirdUp = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up Armor Class bonus, item 3 of 3');
      if (moveThirdUp === undefined) throw new Error('First feature effect reorder control is missing.');
      moveThirdUp.click();
      const removeSecondTempo = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Remove Second tempo, item 3 of 3');
      if (removeSecondTempo === undefined) throw new Error('First feature effect remove control is missing.');
      removeSecondTempo.click();

      addEffect(1);
      input(control(root, 'input', 'authoring-effect-effect-item-2-label'), 'Second feature first effect');
      addEffect(1);
      input(control(root, 'input', 'authoring-effect-effect-item-3-label'), 'Second feature second effect');
      const moveSecondFeatureEffectUp = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up Armor Class bonus, item 2 of 2');
      if (moveSecondFeatureEffectUp === undefined) throw new Error('Second feature effect reorder control is missing.');
      moveSecondFeatureEffectUp.click();
      const removeFirstFeatureEffect = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Remove Second feature first effect, item 2 of 2');
      if (removeFirstFeatureEffect === undefined) throw new Error('Second feature effect remove control is missing.');
      removeFirstFeatureEffect.click();

      button(root, 'Save draft').click();
      await settle();
      expect(savedDocuments[0]?.features.slice(0, 2).map((feature) =>
        feature.effects.map((effect) => effect.label))).toEqual([
        [hostile, 'Third effect'],
        ['Second feature second effect'],
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('makes grid and ordering controls keyboard-focusable and applies their actions', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client(),
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      const gridCell = control(root, 'input', 'subclass-progression-20-cantrips_known');
      gridCell.focus();
      expect(document.activeElement).toBe(gridCell);
      input(gridCell, '4');
      expect(gridCell.value).toBe('4');

      const featureMove = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up Second feature, item 2 of 2');
      if (featureMove === undefined) throw new Error('Feature ordering control is missing.');
      featureMove.focus();
      expect(document.activeElement).toBe(featureMove);
      featureMove.click();
      expect(root.querySelectorAll('.subclass-feature-card')[0]?.getAttribute('data-draft-item-uuid'))
        .toBe('feature-three-b');
      expect(document.activeElement?.isConnected).toBe(true);
      expect(document.activeElement?.getAttribute('aria-label'))
        .toBe('Move down Second feature, item 1 of 2');
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Moved Second feature to position 1 of 2.');

      const effectMove = root.querySelectorAll('button').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Move up Second tempo, item 2 of 2');
      if (effectMove === undefined) throw new Error('Effect ordering control is missing.');
      effectMove.focus();
      expect(document.activeElement).toBe(effectMove);
      effectMove.click();
      expect(root.querySelectorAll('.authoring-effect-card').slice(0, 2).map((card) =>
        card.getAttribute('data-draft-item-uuid'))).toEqual(['effect-three-b', 'effect-three-a']);
      expect(document.activeElement?.isConnected).toBe(true);
      expect(document.activeElement?.getAttribute('aria-label'))
        .toBe('Move down Second tempo, item 1 of 2');
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Moved Second tempo to position 1 of 2.');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('surfaces monotonic and slot-gap paths inline and refuses preview until corrected', async () => {
    const progressionRows = [...rows()];
    progressionRows[2] = {
      ...progressionRows[2]!,
      cantrips_known: 2,
      maximum_spell_level: 2,
      slot_counts: [2, 0, 1, 0, 0, 0, 0, 0, 0],
    };
    progressionRows[3] = { ...progressionRows[3]!, cantrips_known: 1 };
    const progression: SubclassAuthoringDraft['progression'] = {
      mode: 'override',
      spellcasting_ability: 'intelligence',
      caster_contribution: 'third_down',
      rows: progressionRows,
    };
    expect(subclassProgressionGridIssues(progression).map((issue) => issue.path))
      .toEqual(expect.arrayContaining([
        ['progression', 'rows', 2, 'slot_counts'],
        ['progression', 'rows', 3, 'cantrips_known'],
      ]));

    const restoreDocument = installInteractiveDocument();
    try {
      let previewCalls = 0;
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored({ ...richDocument(), progression });
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          previewPublish: async () => {
            previewCalls += 1;
            return preview();
          },
        }),
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      const inlineIssues = root.querySelector('.subclass-progression-issues');
      expect(inlineIssues?.querySelectorAll('li').length).toBeGreaterThanOrEqual(2);
      const decreasing = inlineIssues?.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Cantrips known cannot decrease at class level 4.');
      const offendingCell = control(root, 'input', 'subclass-progression-4-cantrips_known');
      if (decreasing === undefined) throw new Error('Linked progression issue control is missing.');
      expect(offendingCell.getAttribute('aria-invalid')).toBe('true');
      decreasing.click();
      expect(document.activeElement).toBe(offendingCell);
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      expect(previewCalls).toBe(0);
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toContain('Fix the progression gaps');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('pins edit, failed-save, successful-save, and publish dirty states through the real Router guard', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const router = new Router(routerWindow(
        'https://example.test/homebrew/drafts/ha8-subclass-draft',
      ));
      const screenRoot = document.createElement('div');
      const mount = document.createElement('div');
      screenRoot.append(mount);
      document.body.append(screenRoot);
      let saveFails = true;
      const authoring = client({
        saveDraft: async (params) => {
          if (saveFails) throw new Error('Storage unavailable.');
          if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
          return { ...stored(params.document), revision: 1 as DraftRevision };
        },
        previewPublish: async () => preview(),
        commitPublish: async () => ({
          outcome: 'created',
          content_key: 'expanded:subclass:router-timeline' as ContentKey,
          name: 'Router Timeline',
          catalog_layer: 'external',
          previous_key_usage_count: 0,
        }),
      });
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
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
        parentClasses: parents,
        confirmLeave: () => false,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(control(root, 'input', 'subclass-name'), 'Dirty timeline');
      expect(router.navigate('/blocked-after-edit')).toBe(false);
      button(root, 'Save draft').click();
      await settle();
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Draft not saved. Storage unavailable.');
      expect(router.navigate('/blocked-after-failed-save')).toBe(false);
      expect(button(root, 'Save draft').disabled).toBe(false);

      saveFails = false;
      button(root, 'Save draft').click();
      await settle();
      expect(router.navigate('/clean-after-save')).toBe(true);

      input(control(root, 'input', 'subclass-name'), 'Publish clears dirty');
      button(root, 'Save draft').click();
      await settle();
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(root, 'Publish subclass').click();
      await settle();
      expect(router.current.path).toBe('/homebrew');
      expect(router.current.query.get('publishedName')).toBe('Router Timeline');
      expect(router.navigate('/clean-after-publish')).toBe(true);

      cleanup();
      router.stop();
    } finally {
      restoreDocument();
    }
  });

  it('ends a validation refusal with human copy and focus on the name', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const mount = document.createElement('div');
      const cleanup = renderSubclassForm({
        context: context(),
        client: client({
          saveDraft: () => Promise.reject(new RpcError(
            'handler_error',
            'Draft validation failed.',
            {
              reason: 'validation_failed',
              issues: [{
                path: ['name'],
                code: 'too_long',
                message: 'Name must be 120 characters or fewer.',
              }],
            },
          )),
        }),
        mount,
        draft,
        parentClasses: parents,
      });
      const root = interactiveElement(mount);
      const name = control(root, 'input', 'subclass-name');

      button(root, 'Save draft').click();
      await settle();

      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Draft not saved.');
      expect(elementText(root as unknown as Node))
        .toContain('Name must be 120 characters or fewer.');
      expect(document.activeElement).toBe(name);
      expect(elementText(root as unknown as Node)).not.toMatch(
        /saving draft|code points|too small|expected number/iu,
      );
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('preserves edits made during an in-flight save and keeps the Router guard dirty', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const router = new Router(routerWindow(
        'https://example.test/homebrew/drafts/ha8-subclass-draft',
      ));
      const screenRoot = document.createElement('div');
      const mount = document.createElement('div');
      screenRoot.append(mount);
      document.body.append(screenRoot);
      const saveControl: {
        finish: ((result: Awaited<ReturnType<AuthoringClient['saveDraft']>>) => void) | null;
      } = { finish: null };
      let saveCalls = 0;
      const saveExpectedRevisions: DraftRevision[] = [];
      const laterSave: { document: SubclassAuthoringDraft | null } = { document: null };
      const authoring = client({
        saveDraft: (params) => {
          if (params.document.kind !== 'subclass') throw new Error('Expected subclass.');
          saveCalls += 1;
          saveExpectedRevisions.push(params.expected_revision);
          if (saveCalls === 1) {
            return new Promise((resolve) => { saveControl.finish = resolve; });
          }
          laterSave.document = params.document;
          return Promise.resolve({ ...stored(params.document), revision: 2 as DraftRevision });
        },
      });
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
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
        parentClasses: parents,
        confirmLeave: () => false,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      input(control(root, 'input', 'subclass-name'), 'Snapshot sent to storage');
      button(root, 'Save draft').click();
      if (saveControl.finish === null) throw new Error('Save resolver was not installed.');
      input(control(root, 'input', 'subclass-name'), 'Newer local edit');
      saveControl.finish({
        ...stored({ ...draft.document, name: 'Snapshot sent to storage' }),
        revision: 1 as DraftRevision,
      });
      await settle();

      expect(control(root, 'input', 'subclass-name').value).toBe('Newer local edit');
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toContain('newer unsaved changes remain');
      expect(router.navigate('/blocked-after-in-flight-save')).toBe(false);
      button(root, 'Save draft').click();
      await settle();
      expect(laterSave.document?.name).toBe('Newer local edit');
      expect(saveExpectedRevisions).toEqual([0, 1]);
      expect(router.navigate('/clean-after-latest-save')).toBe(true);

      cleanup();
      router.stop();
    } finally {
      restoreDocument();
    }
  });

  it('drops a publish preview that resolves after a rerendering feature edit', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const previewControl: {
        finish: ((result: PublishPreview) => void) | null;
      } = { finish: null };
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          previewPublish: () => new Promise((resolve) => { previewControl.finish = resolve; }),
        }),
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      const previewForm = root.querySelector('form');
      previewForm?.dispatchEvent(new Event('submit', { cancelable: true }));
      if (previewControl.finish === null) throw new Error('Preview resolver was not installed.');
      const featureLevel = control(root, 'select', 'subclass-feature-feature-three-a-level');
      featureLevel.value = '4';
      featureLevel.dispatchEvent(new Event('change'));
      previewControl.finish(preview());
      await settle();

      const attachedForm = root.querySelector('form');
      expect(previewForm?.isConnected).toBe(false);
      expect(attachedForm?.isConnected).toBe(true);
      expect(root.querySelector('[data-authoring-action="publish-subclass"]')).toBeNull();
      expect(attachedForm?.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Draft changed; preview again.');
      expect(button(root, 'Preview publish').disabled).toBe(false);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('drops a rejected publish preview after the draft changes', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const previewControl: {
        fail: ((reason?: unknown) => void) | null;
      } = { fail: null };
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client({
          previewPublish: () => new Promise<PublishPreview>((_resolve, reject) => {
            previewControl.fail = reject;
          }),
        }),
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      if (previewControl.fail === null) throw new Error('Preview rejecter was not installed.');
      input(control(root, 'input', 'subclass-name'), 'Changed during rejected preview');
      previewControl.fail(new Error('Preview failed.'));
      await settle();

      expect(root.querySelector('[data-authoring-action="publish-subclass"]')).toBeNull();
      expect(root.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Draft changed; preview again.');
      expect(button(root, 'Preview publish').disabled).toBe(false);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('discards a pending preview when a clean-save conflict loads the saved revision', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const previewControl: {
        finish: ((result: PublishPreview) => void) | null;
      } = { finish: null };
      const remote = {
        ...stored({ ...richDocument(), name: 'Remote saved subclass' }),
        revision: 2 as DraftRevision,
      };
      const authoring = client({
        previewPublish: () => new Promise((resolve) => { previewControl.finish = resolve; }),
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
        readDraft: async () => remote,
      });
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: authoring,
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);

      const previewForm = root.querySelector('form');
      previewForm?.dispatchEvent(new Event('submit', { cancelable: true }));
      if (previewControl.finish === null) throw new Error('Preview resolver was not installed.');
      button(root, 'Save draft').click();
      await settle();
      const conflict = interactiveElement(screenContext.root)
        .querySelector('[data-testid="authoring-draft-conflict"]');
      conflict?.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Load saved revision',
      )?.click();
      await settle();

      // HA-8 accepted the pending preview after "Load saved revision"; HA-9
      // supersedes that behavior because loading changes the document.
      previewControl.finish(preview());
      await settle();
      const attachedForm = root.querySelector('form');
      expect(previewForm?.isConnected).toBe(false);
      expect(attachedForm?.isConnected).toBe(true);
      expect(control(root, 'input', 'subclass-name').value).toBe('Remote saved subclass');
      expect(root.querySelector('[data-authoring-action="publish-subclass"]')).toBeNull();
      expect(attachedForm?.querySelector('.subclass-authoring-status')?.textContent)
        .toBe('Draft changed; preview again.');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('clears a dirty Router guard only when a connected publish resolves', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const router = new Router(routerWindow(
        'https://example.test/homebrew/drafts/ha8-subclass-draft',
      ));
      const screenRoot = document.createElement('div');
      const mount = document.createElement('div');
      screenRoot.append(mount);
      document.body.append(screenRoot);
      const publishControl: {
        finish: ((result: Awaited<ReturnType<AuthoringClient['commitPublish']>>) => void) | null;
      } = { finish: null };
      const authoring = client({
        previewPublish: async () => preview(),
        commitPublish: () => new Promise((resolve) => { publishControl.finish = resolve; }),
      });
      const draft = stored();
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const cleanup = renderSubclassForm({
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
        parentClasses: parents,
        confirmLeave: () => false,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      const publish = button(root, 'Publish subclass');
      expect(publish.isConnected).toBe(true);
      publish.click();
      if (publishControl.finish === null) throw new Error('Publish resolver was not installed.');
      input(control(root, 'input', 'subclass-name'), 'Dirty while publishing');
      expect(router.navigate('/blocked-before-dirty-publish')).toBe(false);
      publishControl.finish({
        outcome: 'created',
        content_key: 'expanded:subclass:dirty-publish' as ContentKey,
        name: 'Dirty publish',
        catalog_layer: 'external',
        previous_key_usage_count: 0,
      });
      await settle();
      expect(router.navigate('/clean-after-in-flight-publish')).toBe(true);
      cleanup();
      router.stop();
    } finally {
      restoreDocument();
    }
  });

  it('lets a malformed fresh root-only draft switch to dense mode before editing', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const rootOnly: SubclassAuthoringDraft = {
        ...richDocument(),
        progression: {
          mode: 'root_only',
          spellcasting_ability: 'charisma',
          caster_fraction: '1/3',
          caster_rounding: 'down',
        },
      };
      const draft = {
        ...stored(rootOnly),
        base_content_key: null,
      };
      if (!isStoredSubclassDraft(draft)) throw new Error('Subclass fixture did not narrow.');
      const screenContext = context();
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      const cleanup = renderSubclassForm({
        context: screenContext,
        client: client(),
        mount,
        draft,
        parentClasses: parents,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      expect(elementText(root as unknown as Node)).toContain(
        'choose the dense progression mode to unlock',
      );
      expect(control(root, 'input', 'subclass-name').disabled).toBe(true);
      expect(control(root, 'select', 'subclass-parent-class').disabled).toBe(true);
      const mode = control(root, 'select', 'subclass-progression-mode');
      expect(mode.disabled).toBe(false);
      expect(mode.querySelectorAll('option').map((option) => option.getAttribute('value')))
        .toEqual(['override', 'root_only']);
      expect(root.querySelectorAll('.subclass-feature-card').flatMap((card) =>
        card.querySelectorAll('input')).every((entry) => entry.disabled)).toBe(true);
      mode.value = 'override';
      mode.dispatchEvent(new Event('change'));
      expect(control(root, 'input', 'subclass-name').disabled).toBe(false);
      expect(control(root, 'select', 'subclass-parent-class').disabled).toBe(false);
      expect(root.querySelectorAll('.subclass-progression-row')).toHaveLength(20);
      expect(root.querySelectorAll('.subclass-feature-card').flatMap((card) =>
        card.querySelectorAll('input')).every((entry) => !entry.disabled)).toBe(true);
      cleanup();
    } finally {
      restoreDocument();
    }
  });
});
