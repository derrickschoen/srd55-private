import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import {
  AuthoringServiceError,
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type {
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type {
  HomebrewDraftItemUuid,
} from '../../../src/authoring/ids';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import { registerContentAlias } from '../../../src/catalog/content-registry';
import { portableSourceContentImportNode } from '../../../src/catalog/source-content-importer';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, type Router } from '../../../src/ui/router';
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
import { seedSpellContent } from '../../../src/rules/spells-srd';

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

const connections: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
  uuidSequence = 0;
});

async function authoringService(): Promise<CatalogAuthoringService> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new CatalogAuthoringService(new DatabaseContext(connection), {
    randomUuid: () => `ha7-service-${String(++uuidSequence)}`,
    now: () => '2042-08-06T12:00:00.000Z',
  });
}

function itemUuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

function validDocument(
  created: StoredHomebrewDraft,
  name: string,
): SpeciesAuthoringDraft {
  if (created.document.kind !== 'species') throw new Error('Draft is not species.');
  return {
    ...created.document,
    name,
    rules_edition: 'expanded',
    reference_text: 'Service-driven UI refusal fixture.',
    creature_type: 'Clockwork',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: 30,
    traits: [{
      draft_item_uuid: itemUuid(`${name}-trait`),
      name: 'Service ward',
      description: 'Pins the service through the rendered form.',
      effects: [],
    }],
    grants: [],
  };
}

function savedSpecies(
  service: CatalogAuthoringService,
  name: string,
): StoredHomebrewDraft {
  const created = service.createDraft({ content_kind: 'species' });
  return service.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document: validDocument(created, name),
  });
}

function rpcCall<T>(operation: () => T): Promise<T> {
  try {
    return Promise.resolve(operation());
  } catch (error) {
    if (error instanceof AuthoringServiceError) {
      return Promise.reject(new RpcError(
        'handler_error',
        error.message,
        error.data as never,
      ));
    }
    return Promise.reject(error);
  }
}

function serviceClient(
  service: CatalogAuthoringService,
  overrides: Partial<AuthoringClient> = {},
): AuthoringClient {
  return {
    list: () => rpcCall(() => service.list()),
    backgroundReferences: () => rpcCall(() => service.backgroundReferences()),
    spellGrantReferences: () => rpcCall(() => service.spellGrantReferences()),
    createDraft: (params) => rpcCall(() => service.createDraft(params)),
    readDraft: (params) => rpcCall(() => service.readDraft(params.draft_uuid)),
    saveDraft: (params) => rpcCall(() => service.saveDraft(params)),
    discardDraft: (params) => rpcCall(() =>
      service.discardDraft(params.draft_uuid, params.expected_revision)),
    previewPublish: (params) => rpcCall(() => service.previewPublish(params)),
    commitPublish: (params) => rpcCall(() => service.commitPublish(params)),
    usages: (params) => rpcCall(() => service.usages(params.content_key)),
    previewReplacement: () => Promise.reject(new Error('Unused replacement preview.')),
    commitReplacement: () => Promise.reject(new Error('Unused replacement commit.')),
    previewReplacementSet: () => Promise.reject(new Error('Unused replacement-set preview.')),
    commitReplacementSet: () => Promise.reject(new Error('Unused replacement-set commit.')),
    previewArchiveSet: () => Promise.reject(new Error('Unused archive preview.')),
    commitArchiveSet: () => Promise.reject(new Error('Unused archive commit.')),
    listArchivedSets: () => Promise.reject(new Error('Unused archive list.')),
    previewRestoreSet: () => Promise.reject(new Error('Unused restore preview.')),
    commitRestoreSet: () => Promise.reject(new Error('Unused restore commit.')),
    purgeArchivedSet: () => Promise.reject(new Error('Unused permanent purge.')),
    ...overrides,
  };
}

function context(navigated: string[] = []): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: parseRoute(new URL('https://example.test/homebrew/drafts/ha7-service')),
    router: { navigate: (target: string) => navigated.push(target) } as unknown as Router,
    rpc: null as never,
    registerNavigationGuard: () => () => undefined,
  };
}

function button(root: InteractiveTestElement, label: string): InteractiveTestElement {
  const found = root.querySelectorAll('button').find((candidate) =>
    candidate.textContent === label);
  if (found === undefined) throw new Error(`Missing ${label} button.`);
  return found;
}

function controlById(
  root: InteractiveTestElement,
  tag: 'input' | 'textarea',
  id: string,
): InteractiveTestElement {
  const found = root.querySelectorAll(tag).find((candidate) =>
    candidate.getAttribute('id') === id);
  if (found === undefined) throw new Error(`Missing ${tag}#${id}.`);
  return found;
}

function controlByPath(
  root: InteractiveTestElement,
  tag: 'input' | 'textarea',
  path: readonly (string | number)[],
): InteractiveTestElement {
  const encoded = JSON.stringify(path);
  const found = root.querySelectorAll(tag).find((candidate) =>
    candidate.getAttribute('data-authoring-path') === encoded);
  if (found === undefined) throw new Error(`Missing ${tag} for ${encoded}.`);
  return found;
}

function nameInput(root: InteractiveTestElement): InteractiveTestElement {
  return controlByPath(root, 'input', ['name']);
}

function editName(root: InteractiveTestElement, value: string): void {
  const control = nameInput(root);
  control.value = value;
  control.dispatchEvent(new Event('input'));
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

function render(
  service: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
  overrides: Partial<AuthoringClient> = {},
): {
  readonly root: InteractiveTestElement;
  readonly screenContext: ScreenContext;
  readonly cleanup: () => void;
} {
  if (!isStoredSpeciesDraft(draft)) throw new Error('Stored draft is not species.');
  const screenContext = context();
  const mount = document.createElement('div');
  screenContext.root.append(mount);
  const cleanup = renderSpeciesForm({
    context: screenContext,
    client: serviceClient(service, overrides),
    mount,
    draft,
    windowObject: new EventTarget() as unknown as Window,
  });
  return { root: interactiveElement(mount), screenContext, cleanup };
}

function publishDirectly(
  service: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
): void {
  const preview = service.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  });
  service.commitPublish({ token: preview.token, decisions: [] });
}

describe('HA-7 service-driven refusal and terminal paths', () => {
  it('derives installed spell and spell-list authoring references with catalog disclosure', async () => {
    const service = await authoringService();
    seedSpellContent(service.db);
    const references = service.spellGrantReferences();
    expect(references.spells).toContainEqual(expect.objectContaining({
      name: 'Light',
      rules_edition: '2024',
      level: 0,
      catalog_layer: 'bundled',
    }));
    expect(references.lists).toEqual(expect.arrayContaining(['Cleric', 'Wizard']));
    expect(references.spells.every((spell) => spell.content_key !== '')).toBe(true);
  });

  it('HA7-REFUSAL renders real semantic issues, re-enables Preview, and recovers through corrected UI state', async () => {
    const service = await authoringService();
    const created = service.createDraft({ content_kind: 'species' });
    const invalid = service.saveDraft({
      draft_uuid: created.draft_uuid,
      expected_revision: created.revision,
      document: {
        ...validDocument(created, ''),
        name: '',
        traits: [{
          draft_item_uuid: itemUuid('real-refusal-trait'),
          name: '',
          description: 'The invalid fields are corrected through rendered controls.',
          effects: [{
            kind: 'damage_resistance',
            draft_item_uuid: itemUuid('real-refusal-effect'),
            label: 'Unresolved ward',
            notes: 'Real publisher refusal.',
            damage_type: null,
          }],
        }],
        grants: [{
          kind: 'skill_proficiency',
          draft_item_uuid: itemUuid('real-refusal-grant'),
          rule_key: 'real-refusal-skills',
          count: 1,
          skills: [],
        }],
      },
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, invalid);
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();

      const summary = rendered.root.querySelector('.authoring-validation-summary');
      if (summary === null) throw new Error('Semantic validation summary is missing.');
      const issues = summary.querySelectorAll('li').map((issue) =>
        elementText(issue as unknown as Node).trim());
      expect(issues).toEqual([
        'Must not be empty.',
        'At least one skill is required.',
        'Skill count exceeds the available distinct skills.',
        'Must not be empty.',
        'Damage type is required.',
      ]);
      expect(rendered.root.querySelectorAll('[aria-invalid="true"]')).toHaveLength(5);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);

      editName(rendered.root, 'Recovered Species');
      const traitName = controlByPath(rendered.root, 'input', ['traits', 0, 'name']);
      traitName.value = 'Recovered ward';
      traitName.dispatchEvent(new Event('input'));
      const damageType = controlByPath(
        rendered.root, 'input', ['traits', 0, 'effects', 0, 'damage_type'],
      );
      damageType.value = 'Force';
      damageType.dispatchEvent(new Event('change'));
      const skill = controlById(
        rendered.root, 'input', 'species-grant-real-refusal-grant-skill-arcana',
      );
      skill.checked = true;
      skill.dispatchEvent(new Event('change'));
      button(rendered.root, 'Save draft').click();
      await settle();
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);

      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();
      expect(elementText(rendered.root as unknown as Node)).toContain('Publish preview');
      expect(elementText(rendered.root as unknown as Node)).toContain('Recovered Species');
      expect(rendered.root.querySelector('.authoring-validation-summary')).toBeNull();
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA7-REFUSAL dirty preview and generic preview refusal render alerts with reachable enabled controls', async () => {
    const service = await authoringService();
    const draft = savedSpecies(service, 'Preview Refusal Species');
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, draft);
      editName(rendered.root, 'Dirty Preview Refusal Species');
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('Save the draft before previewing publish.');
      expect(document.activeElement).toBe(button(rendered.root, 'Save draft'));
      expect(button(rendered.root, 'Save draft').disabled).toBe(false);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);

      button(rendered.root, 'Save draft').click();
      await settle();
      const savedAfterUi = service.readDraft(draft.draft_uuid);
      service.saveDraft({
        draft_uuid: savedAfterUi.draft_uuid,
        expected_revision: savedAfterUi.revision,
        document: savedAfterUi.document,
      });
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();
      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('Draft revision is stale.');
      expect(button(rendered.root, 'Save draft').disabled).toBe(false);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      expect(nameInput(rendered.root).isConnected).toBe(true);
      button(rendered.root, 'Save draft').click();
      await settle();
      expect(interactiveElement(rendered.screenContext.root)
        .querySelector('[data-testid="authoring-draft-conflict"]')?.isConnected)
        .toBe(true);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA7-REFUSAL generic commit refusal renders the real service error and enables retry', async () => {
    const service = await authoringService();
    const draft = savedSpecies(service, 'Commit Refusal Species');
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, draft, {
        commitPublish: (params) => rpcCall(() => service.commitPublish({
          token: params.token,
          decisions: [{
            candidate_content_key: 'expanded:species:not-a-review' as ContentKey,
            decision: 'match',
          }],
        })),
      });
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();
      button(rendered.root, 'Publish species').click();
      await settle();

      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('This publish has no review decision to apply.');
      expect(button(rendered.root, 'Publish species').disabled).toBe(false);
      expect(button(rendered.root, 'Save draft').disabled).toBe(false);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA7-REFUSAL stale publish token is alerting and leaves a live retry path', async () => {
    const service = await authoringService();
    const draft = savedSpecies(service, 'Stale Token Species');
    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, draft);
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();
      service.saveDraft({
        draft_uuid: draft.draft_uuid,
        expected_revision: draft.revision,
        document: draft.document,
      });
      button(rendered.root, 'Publish species').click();
      await settle();

      expect(rendered.root.querySelector('[role="alert"]')?.textContent)
        .toBe('The publish plan is stale.');
      expect(button(rendered.root, 'Publish species').disabled).toBe(false);
      expect(button(rendered.root, 'Save draft').disabled).toBe(false);
      expect(button(rendered.root, 'Preview publish').disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA7-REFUSAL adoption commit refusal stays in an alerting, focusable retry modal', async () => {
    const service = await authoringService();
    const incoming = savedSpecies(service, 'Adoption Incoming Species');
    const firstPreview = service.previewPublish({
      draft_uuid: incoming.draft_uuid,
      expected_revision: incoming.revision,
    });
    if (firstPreview.aggregate.kind !== 'species') {
      throw new Error('Incoming preview is not species.');
    }
    const targetKey = 'expanded:alternate.owner:adoption-incoming-species' as ContentKey;
    const targetNode = portableSourceContentImportNode(
      new DatabaseContext(connections[0]!),
      firstPreview.aggregate,
      targetKey,
    );
    const db = new DatabaseContext(connections[0]!);
    const targetPlan = planContentImport(db, [targetNode]);
    expect(commitContentImport(db, {
      nodes: [targetNode],
      token: targetPlan.token,
    }).kind).toBe('committed');
    registerContentAlias(db, {
      kind: 'species',
      aliasKey: assertedExternalContentKey(
        'species',
        'expanded',
        'Adoption Incoming Species',
      ),
      contentKey: targetKey,
      aliasKind: 'declared-legacy',
    });
    const occupied = savedSpecies(service, 'Occupied Clone Species');
    if (occupied.document.kind !== 'species') throw new Error('Occupied draft is not species.');
    const distinctOccupied = service.saveDraft({
      draft_uuid: occupied.draft_uuid,
      expected_revision: occupied.revision,
      document: { ...occupied.document, walking_speed_feet: 40 },
    });
    publishDirectly(service, distinctOccupied);

    const restoreDocument = installInteractiveDocument();
    try {
      const rendered = render(service, incoming);
      rendered.root.querySelector('form')?.dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await settle();
      button(rendered.root, 'Publish species').click();
      const dialog = interactiveElement(rendered.screenContext.root)
        .querySelector('[data-testid="content-adoption-modal"]');
      if (dialog === null) throw new Error('Publish adoption dialog did not open.');
      const clone = dialog.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('value') === 'clone');
      const cloneName = dialog.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('type') === 'text');
      if (clone === undefined || cloneName === undefined) {
        throw new Error('Clone controls are missing.');
      }
      clone.checked = true;
      clone.dispatchEvent(new Event('change'));
      cloneName.value = 'Occupied Clone Species';
      cloneName.dispatchEvent(new Event('input'));
      button(dialog, 'Publish with these choices').click();
      await settle();

      expect(dialog.querySelector('[role="alert"]')?.textContent)
        .toBe('The chosen species publish was refused.');
      expect(dialog.isConnected).toBe(true);
      expect(button(dialog, 'Publish with these choices').disabled).toBe(false);
      expect(button(dialog, 'Cancel').disabled).toBe(false);
      expect(document.activeElement).toBe(button(dialog, 'Publish with these choices'));
      expect(button(rendered.root, 'Publish species').disabled).toBe(false);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('HA7-TERMINAL renders a real matched-existing result with a reachable library route', async () => {
    const service = await authoringService();
    publishDirectly(service, savedSpecies(service, 'Matched Existing Species'));
    const duplicate = savedSpecies(service, 'Matched Existing Species');
    const restoreDocument = installInteractiveDocument();
    try {
      const navigated: string[] = [];
      const screenContext = context(navigated);
      const mount = document.createElement('div');
      screenContext.root.append(mount);
      if (!isStoredSpeciesDraft(duplicate)) throw new Error('Duplicate is not species.');
      const cleanup = renderSpeciesForm({
        context: screenContext,
        client: serviceClient(service),
        mount,
        draft: duplicate,
        windowObject: new EventTarget() as unknown as Window,
      });
      const root = interactiveElement(mount);
      root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      await settle();
      button(root, 'Publish species').click();
      await settle();

      const publishedUrl = new URL(navigated[0] ?? '', 'https://example.test');
      expect(Object.fromEntries(publishedUrl.searchParams)).toEqual({
        publishOutcome: 'matched_existing',
        publishedKey: 'expanded:content.species:matched-existing-species',
        publishedName: 'Matched Existing Species',
        publishedLayer: 'external',
        previousUsageCount: '0',
      });
      cleanup();
    } finally {
      restoreDocument();
    }
  });
});
