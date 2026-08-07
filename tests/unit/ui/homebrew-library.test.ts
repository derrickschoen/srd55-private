import { describe, expect, it } from 'vitest';
import type { AuthoringClient } from '../../../src/authoring/client';
import type {
  AuthoringLibrary,
  DraftRevision,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import type { HomebrewDraftUuid } from '../../../src/authoring/ids';
import type { GuidedClassOption } from '../../../src/builder/contracts';
import type { ContentKey } from '../../../src/domain/ids';
import { RpcError } from '../../../src/rpc/protocol';
import { parseRoute, type Router } from '../../../src/ui/router';
import type { ScreenContext } from '../../../src/ui/screen';
import {
  HOMEBREW_LIBRARY_TABS,
  homebrewDraftPath,
  homebrewTabPath,
  renderHomebrewLibrary,
  selectedHomebrewTab,
} from '../../../src/ui/screens/homebrew/homebrew-library';
import { screen as homebrewScreen } from '../../../src/ui/screens/homebrew/screen';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const hostileName = '</h2><img data-hostile-library src=x> "quoted" 🐲 \u202eRTL\u202c nul\u0000\u001ftail';

function speciesDraft(
  draftUuid = 'draft-species' as HomebrewDraftUuid,
  revision = 0 as DraftRevision,
): StoredHomebrewDraft {
  return {
    draft_uuid: draftUuid,
    content_kind: 'species',
    document_version: 1,
    base_content_key: null,
    revision,
    document: {
      kind: 'species',
      document_version: 1,
      name: hostileName,
      rules_edition: null,
      reference_text: '',
      creature_type: '',
      primary_size: '',
      alternate_size: null,
      walking_speed_feet: null,
      traits: [],
      grants: [],
    },
    created_at: '2026-08-06T12:00:00.000Z',
    updated_at: '2026-08-06T12:00:00.000Z',
  };
}

function subclassDraft(): StoredHomebrewDraft {
  return {
    draft_uuid: 'draft-subclass' as HomebrewDraftUuid,
    content_kind: 'subclass',
    document_version: 1,
    base_content_key: null,
    revision: 2 as DraftRevision,
    document: {
      kind: 'subclass',
      document_version: 1,
      name: 'Timeline Ward',
      rules_edition: 'expanded',
      reference_text: '',
      parent_class_content_key: '2024:class:fighter' as ContentKey,
      progression: { mode: 'inherit_parent' },
      features: [],
    },
    created_at: '2026-08-06T12:00:00.000Z',
    updated_at: '2026-08-06T12:00:00.000Z',
  };
}

function backgroundDraft(): StoredHomebrewDraft {
  return {
    draft_uuid: 'draft-background' as HomebrewDraftUuid,
    content_kind: 'background',
    document_version: 1,
    base_content_key: null,
    revision: 1 as DraftRevision,
    document: {
      kind: 'background', document_version: 1, name: 'Route Keeper',
      rules_edition: null, reference_text: '', suggested_abilities: [],
      default_origin_feat_content_key: null, default_origin_feat_display_name: null,
      skill_proficiencies: [], tool_reference_text: null,
      equipment_option_a_description: '', equipment_option_b_description: '',
      equipment_option_a: [], equipment_option_b: [], effects: [],
    },
    created_at: '2026-08-06T12:00:00.000Z',
    updated_at: '2026-08-06T12:00:00.000Z',
  };
}

const parentClasses: readonly GuidedClassOption[] = [{
  content_key: '2024:class:fighter' as ContentKey,
  name: 'Fighter',
  hit_die: 10,
  catalog_layer: 'bundled',
}];

const library: AuthoringLibrary = {
  published: [
    {
      content_key: 'expanded:content.species:hostile' as ContentKey,
      content_kind: 'species',
      name: hostileName,
      rules_edition: 'expanded',
      catalog_layer: 'external',
      superseded_by: null,
    },
    {
      content_key: '2024:content.subclass:warder' as ContentKey,
      content_kind: 'subclass',
      name: 'Warder',
      rules_edition: '2024',
      catalog_layer: 'external',
      superseded_by: null,
    },
    {
      content_key: '2024:content.background:keeper' as ContentKey,
      content_kind: 'background',
      name: 'Keeper',
      rules_edition: '2024',
      catalog_layer: 'external',
      superseded_by: null,
    },
  ],
  drafts: [{
    draft_uuid: 'draft-species' as HomebrewDraftUuid,
    content_kind: 'species',
    base_content_key: null,
    revision: 3 as DraftRevision,
    name: hostileName,
    updated_at: '2026-08-06T12:00:00.000Z',
  }],
};

function unused<T>(): Promise<T> {
  return Promise.reject(new Error('Unused authoring client method.'));
}

function authoringClient(
  overrides: Partial<AuthoringClient> = {},
): AuthoringClient {
  return {
    list: () => Promise.resolve(library),
    backgroundReferences: () => unused(),
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

function context(
  url: string,
  navigated: string[],
): ScreenContext {
  const root = document.createElement('div');
  document.body.append(root);
  return {
    root,
    route: parseRoute(new URL(url)),
    router: {
      navigate: (target: string) => navigated.push(target),
    } as unknown as Router,
    rpc: null as never,
    registerNavigationGuard: () => () => undefined,
  };
}

function keydown(key: string): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true }) as KeyboardEvent;
  Object.defineProperty(event, 'key', { value: key });
  return event;
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 6; turn += 1) await Promise.resolve();
}

describe('HA-6 homebrew library routing and tabs', () => {
  it('defines only the three authored kinds plus Drafts, with no class-authoring route', () => {
    expect(HOMEBREW_LIBRARY_TABS).toEqual([
      { id: 'species', label: 'Species' },
      { id: 'subclass', label: 'Subclasses' },
      { id: 'background', label: 'Backgrounds' },
      { id: 'drafts', label: 'Drafts' },
    ]);
    expect(homebrewTabPath('species')).toBe('/homebrew');
    expect(homebrewTabPath('subclass')).toBe('/homebrew?tab=subclass');
    expect(selectedHomebrewTab('class')).toBe('species');
    expect(homebrewDraftPath('draft / rtl' as HomebrewDraftUuid)).toBe(
      '/homebrew/drafts/draft%20%2F%20rtl',
    );
    expect(homebrewScreen.matches(parseRoute(new URL('https://example.test/homebrew'))))
      .toBe(true);
    expect(homebrewScreen.matches(parseRoute(
      new URL('https://example.test/homebrew/drafts/draft-species'),
    ))).toBe(true);
    expect(homebrewScreen.matches(parseRoute(
      new URL('https://example.test/homebrew/classes/new'),
    ))).toBe(false);
  });

  it('renders labelled keyboard tabs, truthful badges, hostile names as inert text, and new/copy draft navigation', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const navigated: string[] = [];
      const creates: unknown[] = [];
      const client = authoringClient({
        createDraft: async (params) => {
          creates.push(params);
          return speciesDraft(
            params.base_content_key === undefined
              ? 'new-species' as HomebrewDraftUuid
              : 'copy-species' as HomebrewDraftUuid,
          );
        },
      });
      const screenContext = context('https://example.test/homebrew', navigated);
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client,
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);
      const tabs = root.querySelectorAll('[role="tab"]');

      expect(tabs.map((tab) => elementText(tab as unknown as Node))).toEqual([
        'Species', 'Subclasses', 'Backgrounds', 'Drafts',
      ]);
      expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
        'true', 'false', 'false', 'false',
      ]);
      tabs[0]?.focus();
      root.querySelector('[role="tablist"]')?.dispatchEvent(keydown('ArrowRight'));
      expect(document.activeElement).toBe(tabs[1]);

      expect(elementText(root as unknown as Node)).toContain('Homebrew');
      expect(elementText(root as unknown as Node)).not.toContain('New class');
      expect(elementText(root as unknown as Node)).toContain(hostileName);
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('[data-hostile-library]')).toHaveLength(0);
      const marked = root.querySelectorAll('[data-free-text="unverified-origin"]');
      expect(marked.some((entry) => entry.textContent === hostileName)).toBe(true);

      const buttons = root.querySelectorAll('button');
      const directNew = buttons.find((button) => button.textContent === 'New species');
      const copy = buttons.find((button) => button.textContent === 'Make a homebrew copy');
      expect(directNew).toBeDefined();
      expect(copy?.getAttribute('aria-label')).toBe(
        `Make a homebrew copy of ${hostileName}`,
      );
      directNew?.click();
      copy?.click();
      await settle();

      expect(creates).toEqual([
        { content_kind: 'species' },
        {
          content_kind: 'species',
          base_content_key: 'expanded:content.species:hostile',
        },
      ]);
      expect(navigated).toEqual([
        '/homebrew/drafts/new-species',
        '/homebrew/drafts/copy-species',
      ]);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('attaches the revision-conflict dialog before showModal on the real library screen', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const navigated: string[] = [];
      const client = authoringClient({
        discardDraft: () => Promise.reject(new RpcError(
          'handler_error',
          'Draft revision is stale.',
          {
            reason: 'stale_draft_revision',
            draft_uuid: 'draft-species',
            expected_revision: 3,
            actual_revision: 4,
          },
        )),
      });
      const screenContext = context(
        'https://example.test/homebrew?tab=drafts',
        navigated,
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client,
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);
      const card = root.querySelector('.homebrew-card');
      if (card === null) throw new Error('Draft card did not render.');
      expect(elementText(card as unknown as Node)).toContain('Draft');
      expect(elementText(card as unknown as Node)).not.toContain('Homebrew');
      const discard = card.querySelectorAll('button').find(
        (button) => button.textContent === 'Discard draft',
      );
      discard?.click();
      await settle();

      const dialog = root.querySelector('[data-testid="authoring-draft-conflict"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.isConnected).toBe(true);
      expect((dialog as unknown as HTMLDialogElement | null)?.open).toBe(true);
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(elementText(dialog as unknown as Node)).toContain(
        'Nothing was overwritten.',
      );
      expect(elementText(dialog as unknown as Node)).not.toContain('Overwrite');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('restores reachable action-specific focus and removes stale dialog ids across repeated conflicts', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let listCalls = 0;
      let discardCalls = 0;
      const client = authoringClient({
        list: () => {
          listCalls += 1;
          const revision = (listCalls === 1 ? 3 : 4) as DraftRevision;
          return Promise.resolve({
            ...library,
            drafts: library.drafts.map((draft) => ({ ...draft, revision })),
          });
        },
        discardDraft: (params) => {
          discardCalls += 1;
          return Promise.reject(new RpcError(
            'handler_error',
            'Draft revision is stale.',
            {
              reason: 'stale_draft_revision',
              draft_uuid: params.draft_uuid,
              expected_revision: params.expected_revision,
              actual_revision: Number(params.expected_revision) + 1,
            },
          ));
        },
      });
      const screenContext = context(
        'https://example.test/homebrew?tab=drafts',
        [],
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client,
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);
      const discardButton = (): ReturnType<typeof interactiveElement> => {
        const button = root.querySelectorAll('button').find(
          (candidate) => candidate.textContent === 'Discard draft',
        );
        if (button === undefined) throw new Error('Discard button did not render.');
        return button;
      };
      const dialogButton = (label: string): ReturnType<typeof interactiveElement> => {
        const dialog = root.querySelector('[data-testid="authoring-draft-conflict"]');
        const button = dialog?.querySelectorAll('button').find(
          (candidate) => candidate.textContent === label,
        );
        if (button === undefined) throw new Error(`${label} did not render.`);
        return button;
      };

      discardButton().click();
      await settle();
      dialogButton('Load saved revision').click();
      await settle();

      const reloadedDraftLink = root
        .querySelector('.homebrew-tab-panel')
        ?.querySelector('a');
      expect(reloadedDraftLink).not.toBeNull();
      expect(reloadedDraftLink?.isConnected).toBe(true);
      expect(document.activeElement).toBe(reloadedDraftLink);
      expect(root.querySelectorAll('dialog')).toHaveLength(0);

      const reloadedDiscard = discardButton();
      reloadedDiscard.click();
      await settle();

      const dialogs = root.querySelectorAll('dialog');
      expect(dialogs).toHaveLength(1);
      const currentDialog = dialogs[0];
      const describedBy = currentDialog?.getAttribute('aria-describedby');
      if (describedBy === null || describedBy === undefined) {
        throw new Error('Conflict dialog has no description id.');
      }
      const currentDescription = currentDialog?.querySelector(`[id="${describedBy}"]`);
      expect(currentDescription).not.toBeNull();
      expect(elementText(currentDescription as unknown as Node)).toContain(
        'revision 4, but revision 5 is now saved',
      );

      dialogButton('Keep my unsaved changes').click();
      await settle();

      expect(discardCalls).toBe(2);
      expect(reloadedDiscard.disabled).toBe(false);
      expect(reloadedDiscard.isConnected).toBe(true);
      expect(document.activeElement).toBe(reloadedDiscard);
      expect(root.querySelectorAll('dialog')).toHaveLength(0);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('focuses the active tab after Load saved removes the last draft', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let listCalls = 0;
      const client = authoringClient({
        list: () => {
          listCalls += 1;
          return Promise.resolve(listCalls === 1 ? library : { ...library, drafts: [] });
        },
        discardDraft: (params) => Promise.reject(new RpcError(
          'handler_error',
          'Draft revision is stale.',
          {
            reason: 'stale_draft_revision',
            draft_uuid: params.draft_uuid,
            expected_revision: params.expected_revision,
            actual_revision: Number(params.expected_revision) + 1,
          },
        )),
      });
      const screenContext = context(
        'https://example.test/homebrew?tab=drafts',
        [],
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client,
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);
      root.querySelectorAll('button').find(
        (button) => button.textContent === 'Discard draft',
      )?.click();
      await settle();
      root.querySelector('[data-testid="authoring-draft-conflict"]')
        ?.querySelectorAll('button')
        .find((button) => button.textContent === 'Load saved revision')
        ?.click();
      await settle();

      const activeTab = root.querySelector('[aria-selected="true"]');
      expect(root.querySelector('.homebrew-tab-panel')?.querySelector('a')).toBeNull();
      expect(activeTab?.getAttribute('data-homebrew-tab')).toBe('drafts');
      expect(document.activeElement).toBe(activeTab);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('mid-modal navigation teardown closes and removes the dialog without later focus restoration', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let listCalls = 0;
      let resolveReload: ((library: AuthoringLibrary) => void) | undefined;
      const pendingReload = new Promise<AuthoringLibrary>((resolve) => {
        resolveReload = resolve;
      });
      const client = authoringClient({
        list: () => {
          listCalls += 1;
          return listCalls === 1 ? Promise.resolve(library) : pendingReload;
        },
        discardDraft: (params) => Promise.reject(new RpcError(
          'handler_error',
          'Draft revision is stale.',
          {
            reason: 'stale_draft_revision',
            draft_uuid: params.draft_uuid,
            expected_revision: params.expected_revision,
            actual_revision: Number(params.expected_revision) + 1,
          },
        )),
      });
      const navigated: string[] = [];
      const screenContext = context(
        'https://example.test/homebrew?tab=drafts',
        navigated,
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client,
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);
      root.querySelectorAll('button').find(
        (button) => button.textContent === 'Discard draft',
      )?.click();
      await settle();
      const dialog = root.querySelector('[data-testid="authoring-draft-conflict"]');
      if (dialog === null) throw new Error('Conflict dialog did not render.');
      dialog.querySelectorAll('button').find(
        (button) => button.textContent === 'Load saved revision',
      )?.click();
      await Promise.resolve();

      screenContext.router.navigate('/');
      cleanup();
      const focusSentinel = document.createElement('button');
      document.body.append(focusSentinel);
      focusSentinel.focus();
      expect(navigated).toEqual(['/']);
      expect(dialog.open).toBe(false);
      expect(dialog.isConnected).toBe(false);
      expect(root.querySelectorAll('dialog')).toHaveLength(0);

      if (resolveReload === undefined) throw new Error('Reload did not start.');
      resolveReload({ ...library, drafts: [] });
      await settle();
      expect(document.activeElement).toBe(focusSentinel);
      expect(root.querySelectorAll('dialog')).toHaveLength(0);
    } finally {
      restoreDocument();
    }
  });

  it('loads a routed draft shell with stable kind metadata and marked hostile name', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const navigated: string[] = [];
      const screenContext = context(
        'https://example.test/homebrew/drafts/draft-species',
        navigated,
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client: authoringClient({
          readDraft: async () => speciesDraft(),
        }),
        confirmDiscard: () => true,
      });
      const root = interactiveElement(screenContext.root);

      expect(elementText(root as unknown as Node)).toContain(hostileName);
      expect(elementText(root as unknown as Node)).toContain('Saved revision 0.');
      expect(root.querySelector('[data-authoring-form-kind="species"]')).not.toBeNull();
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('[data-free-text="unverified-origin"]'))
        .toHaveLength(1);
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('routes a subclass draft into the timeline form with bundled parent choices', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const screenContext = context(
        'https://example.test/homebrew/drafts/draft-subclass',
        [],
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client: authoringClient({ readDraft: async () => subclassDraft() }),
        parentClasses,
      });
      const root = interactiveElement(screenContext.root);

      const formMount = root.querySelector('[data-authoring-form-kind="subclass"]');
      expect(formMount).not.toBeNull();
      // The accessible name lives on the mount alone (species convention);
      // a second label on the form element is a strict-mode ambiguity.
      expect(formMount?.getAttribute('aria-label')).toBe('Subclass authoring form');
      expect(root.querySelector('form')?.getAttribute('aria-label')).toBeNull();
      expect(root.querySelectorAll('option').map((option) => option.textContent))
        .toContain('Fighter — SRD · bundled layer');
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('keeps a hostile routed subclass parent choice inert beside its exact layer', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const hostileParent = '</option><img data-ha10-parent-class src=x>';
      const screenContext = context(
        'https://example.test/homebrew/drafts/draft-subclass',
        [],
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client: authoringClient({ readDraft: async () => subclassDraft() }),
        parentClasses: [{ ...parentClasses[0]!, name: hostileParent }],
      });
      const root = interactiveElement(screenContext.root);

      expect(root.querySelectorAll('option').map((option) => option.textContent))
        .toContain(`${hostileParent} — SRD · bundled layer`);
      expect(root.querySelector('[data-ha10-parent-class]')).toBeNull();
      cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('routes a background draft through installed references with the accessible name on the mount only', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      let referenceCalls = 0;
      const screenContext = context(
        'https://example.test/homebrew/drafts/draft-background',
        [],
      );
      const cleanup = await renderHomebrewLibrary(screenContext, {
        client: authoringClient({
          readDraft: async () => backgroundDraft(),
          backgroundReferences: async () => {
            referenceCalls += 1;
            return {
              origin_feats: [{ content_key: '2024:feat:alert' as ContentKey, name: 'Alert', rules_edition: '2024', catalog_layer: 'bundled' }],
              weapons: [],
              armors: [],
            };
          },
        }),
      });
      const root = interactiveElement(screenContext.root);
      const formMount = root.querySelector('[data-authoring-form-kind="background"]');
      expect(referenceCalls).toBe(1);
      expect(formMount?.getAttribute('aria-label')).toBe('Background authoring form');
      expect(root.querySelector('form')?.getAttribute('aria-label')).toBeNull();
      expect(root.querySelectorAll('option').map((option) => option.textContent))
        .toContain('Alert (2024) — SRD · bundled layer');
      cleanup();
    } finally {
      restoreDocument();
    }
  });
});
