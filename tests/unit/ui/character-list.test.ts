import { describe, expect, it } from 'vitest';
import type { CharacterRow } from '../../../src/domain/models';
import type { CharacterSummary } from '../../../src/domain/read-models';
import {
  CharacterListController,
  catalogGapLabel,
  characterCardRouteActions,
  classSummary,
  renderClassSummary,
  completenessByCharacter,
  outstandingLabel,
  warningLabel,
} from '../../../src/ui/screens/character-list/character-list';
import {
  createShareControls,
  fragmentFromShareLink,
} from '../../../src/ui/screens/character-list/share-controls';
import {
  ImportBackupController,
  catalogSummary,
  createImportBackupControls,
  type ImportBackupServices,
  type ReadableFile,
  type SavedFile,
} from '../../../src/ui/screens/character-list/import-backup-controls';
import type {
  ContentImportPlan,
  ContentImportPlanToken,
} from '../../../src/catalog/content-adoption';
import type { ContentFingerprintDigest } from '../../../src/catalog/content-identity';
import type { ContentKey } from '../../../src/domain/ids';
import type { PortableImportPlan } from '../../../src/backup/portable-content';
import type { BundledHomebrewInstallPlan } from '../../../src/authoring/bundled-homebrew-installer';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

function character(id: number, name: string): CharacterRow {
  return {
    id,
    name,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    ability_allocation_method: null,
    proficiency_bonus_override: null,
    rules_edition_preference: '2024',
    allow_legacy: false,
    revision: 0,
    alignment: null,
    appearance: null,
    backstory: null,
    notes: null,
    archived_at: null,
    created_at: '2026-07-23T00:00:00.000Z',
    updated_at: '2026-07-23T00:00:00.000Z',
  };
}

function summary(id: number, name: string): CharacterSummary {
  return {
    id,
    name,
    level_one_complete: false,
    level: null,
    classes: [],
    warning_count: 0,
  };
}

function readableFile(
  name: string,
  contents: string | Uint8Array,
): ReadableFile {
  const bytes =
    typeof contents === 'string'
      ? new TextEncoder().encode(contents)
      : contents.slice();
  return {
    name,
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
  };
}

describe('character share links', () => {
  it('accepts full URLs and bare fragments without importing anything', () => {
    expect(fragmentFromShareLink('https://example.test/#abc_123')).toBe(
      'abc_123',
    );
    expect(fragmentFromShareLink('#abc-123')).toBe('abc-123');
    expect(fragmentFromShareLink('abc-123')).toBe('abc-123');
    expect(() => fragmentFromShareLink('https://example.test/')).toThrow(
      /no character fragment/,
    );
  });

  it('HA-12 explains that links try to include external content', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createShareControls({
        rpc: null as never,
        onPersistedChange: () => undefined,
        client: {
          exportDebug: async () => [] as never,
          createFragment: async () => 'fragment',
          createFragmentResult: async () => ({ kind: 'encoded', fragment: 'fragment' }),
          preview: async () => ({}) as never,
          importCharacter: async () => ({}) as never,
          commitCharacter: async () => ({}) as never,
        },
        browser: { baseUrl: 'https://example.test/' },
      });

      expect(elementText(controls.element)).toContain(
        'Share links include referenced external content when it fits.',
      );
      expect(elementText(controls.element)).toContain(
        'If it does not fit, the recipient can import the content named in the warning before opening the link.',
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('CI-SHARE-REFERENCE opens the common adoption dialog for a fallback match', async () => {
    const token = 'a'.repeat(64) as ContentImportPlanToken;
    const plan: ContentImportPlan = {
      token,
      inputHash: 'b'.repeat(64),
      graphHash: 'c'.repeat(64),
      targetHash: 'd'.repeat(64),
      spellActivityChanges: [],
      outcomes: [{
        id: 'spell:share:fallback',
        kind: 'review',
        contentKey: '2024:fireball' as ContentKey,
        matchClass: 'srd-fallback',
      }],
      reviews: [{
        id: 'spell:share:fallback',
        kind: 'spell',
        incomingName: 'Fireball',
        localName: 'Fireball',
        localCatalogLayer: 'bundled',
        targetContentKey: '2024:fireball' as ContentKey,
        incomingFingerprint: 'e'.repeat(64) as ContentFingerprintDigest,
        matchClass: 'srd-fallback',
        defaultChoice: 'match',
        selectedChoice: 'match',
        cloneName: 'Fireball (Private copy)',
        dependencies: [],
        conflictDetails: [],
      }],
    };
    const submitted: unknown[] = [];
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createShareControls({
        rpc: null as never,
        onPersistedChange: () => undefined,
        client: {
          exportDebug: async () => [] as never,
          createFragment: async () => 'fragment',
          createFragmentResult: async () => ({ kind: 'encoded', fragment: 'fragment' }),
          preview: async () => ({
            name: 'Shared Mage',
            classes: [],
            sourceCount: 0,
            selectionCount: 0,
            spellbookCount: 1,
            placeholderCount: 0,
            weaponCount: 0,
            armorCount: 0,
            hitPointRollCount: 0,
            skillProficiencyCount: 0,
            includesAcknowledgements: false,
            includesLoadouts: false,
            includesWrittenText: false,
            adoptionPlan: plan,
          }),
          importCharacter: async () => ({ characterId: 1 }),
          commitCharacter: async (fragment, submittedToken, choices) => {
            submitted.push({ fragment, token: submittedToken, choices });
            return { kind: 'committed', outcomes: plan.outcomes, result: { characterId: 7 } };
          },
        },
        browser: { baseUrl: 'https://example.test/' },
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const input = root.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Character share link',
      );
      const previewButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Preview link',
      );
      const addButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Add to my characters',
      );
      if (input === undefined || previewButton === undefined || addButton === undefined) {
        throw new Error('Share controls are incomplete.');
      }
      input.value = '#fragment';
      previewButton.click();
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      addButton.click();

      const dialog = root.querySelector('[data-testid="content-adoption-modal"]');
      expect(dialog).not.toBeNull();
      expect(elementText(dialog as unknown as Node)).toContain(
        'SRD fingerprint fallback',
      );
      const commit = dialog?.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commit === undefined) throw new Error('Adoption commit button missing.');
      commit.click();
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();

      expect(submitted).toEqual([{
        fragment: 'fragment',
        token,
        choices: {},
      }]);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('links a missing-content refusal to the real library importer route', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createShareControls({
        rpc: null as never,
        onPersistedChange: () => undefined,
        client: {
          exportDebug: async () => [] as never,
          createFragment: async () => 'fragment',
          createFragmentResult: async () => ({ kind: 'encoded', fragment: 'fragment' }),
          preview: async () => Promise.reject({
            data: {
              issues: [{
                code: 'missing_source',
                summary: "your catalog has no species '2024:missing-elf'.",
                remedy: "Import species '2024:missing-elf', then open the link again.",
              }],
            },
          }),
          importCharacter: async () => ({}) as never,
          commitCharacter: async () => ({}) as never,
        },
        browser: { baseUrl: 'https://example.test/' },
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const input = root.querySelectorAll('input').find((candidate) =>
        candidate.getAttribute('aria-label') === 'Character share link'
      );
      const preview = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Preview link'
      );
      if (input === undefined || preview === undefined) {
        throw new Error('Share preview controls are incomplete.');
      }
      input.value = '#reference-only';
      preview.click();
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();

      const remedy = root.querySelector('.share-issue-remedy');
      expect(remedy?.tagName.toLowerCase()).toBe('a');
      expect(remedy?.getAttribute('href')).toBe('/?import=library');
      expect(remedy?.textContent).toBe(
        "Import species '2024:missing-elf', then open the link again.",
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });
});

describe('character list behavior', () => {
  it('routes incomplete cards back to the build and completed cards to level up', () => {
    expect(characterCardRouteActions(73, false)).toEqual([
      {
        label: 'Resume build',
        href: '/characters/73/build/levels/1',
        className: 'button-primary',
      },
      {
        label: 'Open workspace',
        href: '/characters/73',
        className: 'button-secondary',
      },
    ]);
    expect(characterCardRouteActions(73, true)).toEqual([
      {
        label: 'Level Up',
        href: '/characters/73/level-up',
        className: 'button-primary',
      },
      {
        label: 'Open workspace',
        href: '/characters/73',
        className: 'button-secondary',
      },
    ]);
  });

  it('creates the trimmed character in durable data before opening it', async () => {
    const persisted: CharacterRow[] = [];
    const routes: string[] = [];
    const controller = new CharacterListController({
      queries: {
        listCharacters: async () =>
          persisted.map((item) => summary(item.id, item.name)),
        createCharacter: async (name) => {
          const created = character(persisted.length + 1, name);
          persisted.push(created);
          return created;
        },
        deleteCharacter: async (id) => {
          const index = persisted.findIndex((item) => item.id === id);
          if (index < 0) {
            return { id, deleted: false };
          }
          persisted.splice(index, 1);
          return { id, deleted: true };
        },
      },
      navigate: (route) => routes.push(route),
      confirm: () => true,
    });

    await controller.create('  Selene  ');

    expect(persisted).toEqual([
      expect.objectContaining({ id: 1, name: 'Selene', revision: 0 }),
    ]);
    expect(routes).toEqual(['/characters/1']);
  });

  it('requires confirmation and removes the persisted character only when accepted', async () => {
    const persisted = [character(1, 'Selene')];
    let accepted = false;
    const confirmations: string[] = [];
    const controller = new CharacterListController({
      queries: {
        listCharacters: async () =>
          persisted.map((item) => summary(item.id, item.name)),
        createCharacter: async (name) => character(2, name),
        deleteCharacter: async (id) => {
          const index = persisted.findIndex((item) => item.id === id);
          if (index >= 0) {
            persisted.splice(index, 1);
          }
          return { id, deleted: index >= 0 };
        },
      },
      navigate: () => undefined,
      confirm: (message) => {
        confirmations.push(message);
        return accepted;
      },
    });

    await expect(controller.delete(summary(1, 'Selene'))).resolves.toBe(false);
    expect(persisted).toHaveLength(1);
    accepted = true;
    await expect(controller.delete(summary(1, 'Selene'))).resolves.toBe(true);

    expect(confirmations).toEqual([
      'Delete Selene? This cannot be undone.',
      'Delete Selene? This cannot be undone.',
    ]);
    expect(persisted).toEqual([]);
  });

  it('formats the complete oracle card contract, including empty and singular states', () => {
    expect(
      classSummary({
        ...summary(1, 'Sixfold'),
        classes: [
          { name: 'Bard', level: 1, catalog_layer: 'external' },
          { name: 'Wizard', level: 1, catalog_layer: 'unknown' },
        ],
      }),
    ).toBe(
      'Bard 1 — Homebrew · external layer / Wizard 1 — Unknown catalog layer',
    );
    expect(classSummary(summary(2, 'Empty'))).toBe(
      'No classes yet. Open the build to add one.',
    );
    expect(warningLabel(1)).toBe('1 warning');
    expect(warningLabel(0)).toBe('0 warnings');
  });

  it('renders a hostile class name inert with its exact external disclosure', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const hostile = '</p><img data-ha10-character-list-hostile src=x>';
      const row = renderClassSummary({
        ...summary(1, 'Hostile holder'),
        classes: [{ name: hostile, level: 7, catalog_layer: 'external' }],
      });

      expect(elementText(row as unknown as Node)).toBe(
        `${hostile} 7 — Homebrew · external layer`,
      );
      expect(
        interactiveElement(row).querySelector(
          '[data-ha10-character-list-hostile]',
        ),
      ).toBeNull();
    } finally {
      restoreDocument();
    }
  });

  it('labels outstanding work in words that no reader can mistake for a warning', () => {
    expect(outstandingLabel(0)).toBe('nothing outstanding');
    expect(outstandingLabel(1)).toBe('1 unfinished choice');
    expect(outstandingLabel(2)).toBe('2 unfinished choices');
    expect(catalogGapLabel(1)).toBe('1 catalog gap');
    expect(catalogGapLabel(3)).toBe('3 catalog gaps');
    for (const label of [
      outstandingLabel(0),
      outstandingLabel(2),
      catalogGapLabel(1),
    ]) {
      expect(label).not.toMatch(/warning|\u26a0|\u2713/i);
    }
  });

  it('keeps the cards when the completeness batch fails, dropping only the badges', async () => {
    await expect(
      completenessByCharacter(async () => [
        { character_id: 4, outstanding_count: 2, catalog_gap_count: 1 },
      ]),
    ).resolves.toEqual(
      new Map([
        [4, { character_id: 4, outstanding_count: 2, catalog_gap_count: 1 }],
      ]),
    );
    await expect(
      completenessByCharacter(() =>
        Promise.reject(new Error('Character 9 does not exist.')),
      ),
    ).resolves.toEqual(new Map());
  });

});

describe('catalog and backup entry points', () => {
  const emptySourceCounters = {
    classes_matched: 0,
    feats_created: 0,
    feats_matched: 0,
    species_created: 0,
    species_matched: 0,
    backgrounds_created: 0,
    backgrounds_matched: 0,
  } as const;

  function services() {
    const persisted = {
      catalogDocuments: [] as string[],
      database: new Uint8Array([1, 2, 3]),
      characters: [summary(7, 'Backup Hero')],
    };
    const saved: SavedFile[] = [];
    const confirmations: string[] = [];
    let confirmation = true;
    const zeroKinds = {
      class: 0,
      subclass: 0,
      feat: 0,
      species: 0,
      background: 0,
      spell: 0,
      weapon: 0,
      armor: 0,
      item: 0,
    } as const;
    const characterPlan: PortableImportPlan = {
      token: 'c'.repeat(64) as ContentImportPlanToken,
      inputHash: 'input',
      graphHash: 'graph',
      targetHash: 'target',
      spellActivityChanges: [],
      reviews: [],
      outcomes: [],
      preview: {
        new_by_kind: zeroKinds,
        matched_by_kind: zeroKinds,
        review_required_by_kind: zeroKinds,
        refused_by_kind: zeroKinds,
      },
    };
    const value: ImportBackupServices = {
      catalog: {
        importCatalog: async (documents) => {
          persisted.catalogDocuments = [...documents];
          return {
            created: 1,
            updated: 0,
            tombstoned: 0,
            identities_created: 1,
            identities_updated: 0,
            publications_created: 0,
            memberships_created: 0,
            tags_created: 0,
            attack_modes_created: 0,
            save_abilities_created: 0,
            subclasses_created: 0,
            subclasses_updated: 0,
            subclass_features_created: 0,
            weapons_created: 0,
            weapons_matched: 0,
            armors_created: 0,
            armors_matched: 0,
            items_created: 0,
            items_matched: 0,
            item_definition_effects_created: 0,
            ...emptySourceCounters,
            text_available: false,
            descriptions_loaded: 0,
          };
        },
      },
      backup: {
        exportDatabase: async () => ({
          format: 'dnd-multiclass-spells/database',
          version: 1,
          exported_at: '2026-07-23T00:00:00.000Z',
          sqlite: persisted.database.slice(),
        }),
        importDatabase: async (backup) => {
          persisted.database = backup.sqlite.slice();
          return { imported: true };
        },
        exportCharacter: async (characterId) =>
          ({
            format: 'dnd-multiclass-spells/character',
            version: 1,
            exported_at: '2026-07-23T00:00:00.000Z',
            source_character_id: characterId,
            character: { id: characterId, name: 'Backup Hero', strength: 10 },
            tables: {},
            references: {},
          }) as never,
        planCharacterImport: async () => characterPlan,
        commitCharacterImport: async (document) => {
          const id = persisted.characters.length + 7;
          persisted.characters.push(summary(
            id,
            String((document.character as { name?: unknown }).name),
          ));
          return {
            kind: 'committed',
            outcomes: [],
            result: { characterId: id, spellOutcomes: [], notices: [] },
          };
        },
      },
      confirm: (message) => {
        confirmations.push(message);
        return confirmation;
      },
      save: (file) => saved.push(file),
      now: () => '2026-07-23T12:00:00.000Z',
    };
    return {
      persisted,
      saved,
      confirmations,
      value,
      setConfirmation: (next: boolean) => {
        confirmation = next;
      },
    };
  }

  it('labels the complete character JSON input with its rendered accessible name', () => {
    const fixture = services();
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => undefined,
        services: fixture.value,
      });
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      const characterImportLabel = root.querySelectorAll('label').find(
        (label) => label.children.includes(characterInput),
      );
      if (characterImportLabel === undefined) {
        throw new Error('Character import label missing.');
      }

      expect(elementText(characterImportLabel as unknown as Node)).toContain(
        'Import complete character JSON',
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('opens and focuses the library control when the importer route requests it', () => {
    const fixture = services();
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => undefined,
        services: fixture.value,
      });
      document.body.append(controls.element);
      controls.focusLibraryImport();

      expect((controls.element as HTMLDetailsElement).open).toBe(true);
      const libraryLabel = interactiveElement(controls.element)
        .querySelectorAll('label').find((label) =>
          elementText(label as unknown as Node).includes('Library JSON')
        );
      expect(document.activeElement).toBe(
        libraryLabel?.querySelector('input'),
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('directs library and catalog documents to their honest importers both ways', async () => {
    const fixture = services();
    const controller = new ImportBackupController({
      ...fixture.value,
      backup: {
        ...fixture.value.backup,
        planLibraryImport: async () => ({}) as never,
      },
    });
    const library = JSON.stringify({
      format: 'dnd-multiclass-spells/library',
      version: 2,
    });

    await expect(controller.prepareCatalogImport([
      readableFile('library.json', library),
    ])).rejects.toThrow(
      'This file is a library export. Use the Library JSON importer.',
    );
    await expect(controller.prepareLibraryImport(
      readableFile('catalog.json', '[{"kind":"spell"}]'),
    )).rejects.toThrow(
      'This file is a catalog document. Use the Catalog JSON importer.',
    );
    expect(fixture.persisted.catalogDocuments).toEqual([]);
  });

  it('imports catalog JSON and reports the persisted import summary', async () => {
    const fixture = services();
    const controller = new ImportBackupController(fixture.value);

    await expect(
      controller.importCatalog([
        readableFile('catalog.json', '[{"versionKey":"2024:test"}]'),
      ]),
    ).resolves.toBe('1 created, 0 updated, 0 tombstoned');

    expect(fixture.persisted.catalogDocuments).toEqual([
      '[{"versionKey":"2024:test"}]',
    ]);
    expect(
      catalogSummary({
        created: 2,
        updated: 3,
        tombstoned: 4,
        identities_created: 0,
        identities_updated: 0,
        publications_created: 0,
        memberships_created: 0,
        tags_created: 0,
        attack_modes_created: 0,
        save_abilities_created: 0,
        subclasses_created: 0,
        subclasses_updated: 0,
        subclass_features_created: 0,
        weapons_created: 0,
        weapons_matched: 0,
        armors_created: 0,
        armors_matched: 0,
        items_created: 0,
        items_matched: 0,
        item_definition_effects_created: 0,
        ...emptySourceCounters,
        text_available: false,
        descriptions_loaded: 0,
      }),
    ).toBe('2 created, 3 updated, 4 tombstoned');

    // A document that carried subclasses says so, and the spell numbers stay
    // spell numbers — folding a subclass into `created` would print a spell
    // count that is wrong. There is no "tombstoned" clause for subclasses
    // because an import never removes one.
    expect(
      catalogSummary({
        created: 2,
        updated: 3,
        tombstoned: 4,
        identities_created: 0,
        identities_updated: 0,
        publications_created: 0,
        memberships_created: 0,
        tags_created: 0,
        attack_modes_created: 0,
        save_abilities_created: 0,
        subclasses_created: 1,
        subclasses_updated: 5,
        subclass_features_created: 9,
        weapons_created: 0,
        weapons_matched: 0,
        armors_created: 0,
        armors_matched: 0,
        items_created: 0,
        items_matched: 0,
        item_definition_effects_created: 0,
        ...emptySourceCounters,
        text_available: false,
        descriptions_loaded: 0,
      }),
    ).toBe(
      '2 created, 3 updated, 4 tombstoned, 1 subclass created, 5 subclasses updated',
    );

    expect(
      catalogSummary({
        created: 0,
        updated: 0,
        tombstoned: 0,
        identities_created: 0,
        identities_updated: 0,
        publications_created: 0,
        memberships_created: 0,
        tags_created: 0,
        attack_modes_created: 0,
        save_abilities_created: 0,
        subclasses_created: 0,
        subclasses_updated: 0,
        subclass_features_created: 0,
        weapons_created: 1,
        weapons_matched: 0,
        armors_created: 0,
        armors_matched: 1,
        items_created: 1,
        items_matched: 1,
        item_definition_effects_created: 1,
        ...emptySourceCounters,
        text_available: false,
        descriptions_loaded: 0,
      }),
    ).toBe(
      '0 created, 0 updated, 0 tombstoned, 2 equipment definitions created, 2 equipment definitions matched',
    );

    expect(
      catalogSummary({
        created: 0,
        updated: 0,
        tombstoned: 0,
        identities_created: 0,
        identities_updated: 0,
        publications_created: 0,
        memberships_created: 0,
        tags_created: 0,
        attack_modes_created: 0,
        save_abilities_created: 0,
        subclasses_created: 0,
        subclasses_updated: 0,
        subclass_features_created: 0,
        weapons_created: 0,
        weapons_matched: 0,
        armors_created: 0,
        armors_matched: 0,
        items_created: 0,
        items_matched: 0,
        item_definition_effects_created: 0,
        ...emptySourceCounters,
        feats_created: 1,
        species_created: 1,
        classes_matched: 1,
        backgrounds_matched: 1,
        text_available: false,
        descriptions_loaded: 0,
      }),
    ).toBe(
      '0 created, 0 updated, 0 tombstoned, 2 source definitions created, 2 source definitions matched',
    );

    // The singular is the COMMON case — one homebrew subclass in one document —
    // and both clauses inflect independently, so a lone created subclass reads
    // beside a plural updated count without either being wrong.
    expect(
      catalogSummary({
        created: 0,
        updated: 0,
        tombstoned: 0,
        identities_created: 0,
        identities_updated: 0,
        publications_created: 0,
        memberships_created: 0,
        tags_created: 0,
        attack_modes_created: 0,
        save_abilities_created: 0,
        subclasses_created: 0,
        subclasses_updated: 1,
        subclass_features_created: 4,
        weapons_created: 0,
        weapons_matched: 0,
        armors_created: 0,
        armors_matched: 0,
        items_created: 0,
        items_matched: 0,
        item_definition_effects_created: 0,
        ...emptySourceCounters,
        text_available: false,
        descriptions_loaded: 0,
      }),
    ).toBe('0 created, 0 updated, 0 tombstoned, 0 subclasses created, 1 subclass updated');
  });

  it('refreshes the bundled summary on a stale plan while keeping hostile names inert', async () => {
    const fixture = services();
    const plan: BundledHomebrewInstallPlan = {
      token: 'bundled-plan' as ContentImportPlanToken,
      inputHash: 'input',
      graphHash: 'graph',
      targetHash: 'target',
      spellActivityChanges: [],
      reviews: [],
      outcomes: [
        { id: 'subclass:bundled:veteran', kind: 'create', contentKey: '2024:content.subclass:veteran' as ContentKey },
        { id: 'subclass:bundled:barbed', kind: 'create', contentKey: '2024:content.subclass:barbed' as ContentKey },
        { id: 'subclass:bundled:student', kind: 'match', contentKey: '2024:content.subclass:student' as ContentKey },
      ],
      entries: [
        { catalog_key: 'veteran', kind: 'subclass', name: 'Veteran', outcome: 'create', error: null },
        { catalog_key: 'barbed', kind: 'subclass', name: '<img src=x onerror=alert(1)>', outcome: 'create', error: null },
        { catalog_key: 'student', kind: 'subclass', name: 'Spell Student', outcome: 'matched_existing', error: null },
      ],
    };
    const previewHolder: {
      resolve: ((value: BundledHomebrewInstallPlan) => void) | null;
    } = { resolve: null };
    const freshPlan: BundledHomebrewInstallPlan = {
      ...plan,
      token: 'bundled-fresh-plan' as ContentImportPlanToken,
      outcomes: plan.outcomes.map((outcome) => ({
        id: outcome.id,
        kind: 'match' as const,
        contentKey: 'contentKey' in outcome ? outcome.contentKey : '2024:content.subclass:fresh' as ContentKey,
      })),
      entries: plan.entries.map((entry) => ({ ...entry, outcome: 'matched_existing' as const })),
    };
    let commits = 0;
    let persistedChanges = 0;
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => { persistedChanges += 1; },
        services: {
          ...fixture.value,
          authoring: {
            previewBundledHomebrew: () => new Promise((resolve) => {
              previewHolder.resolve = resolve;
            }),
            installBundledHomebrew: async ({ token }) => {
              commits += 1;
              if (commits === 1) {
                expect(token).toBe(plan.token);
                return { kind: 'stale-plan' as const, freshPlan };
              }
              expect(token).toBe(freshPlan.token);
              return { kind: 'committed' as const, outcomes: freshPlan.outcomes };
            },
          },
        },
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const button = root.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Import bundled homebrew');
      if (button === undefined) throw new Error('Bundled homebrew button missing.');
      button.click();
      expect(button.disabled).toBe(true);
      expect(elementText(controls.element)).toContain('Previewing bundled homebrew…');

      previewHolder.resolve?.(plan);
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
      const dialogNode = root.querySelector('[data-testid="content-adoption-modal"]');
      if (dialogNode === null) throw new Error('Shared adoption modal missing.');
      const dialog = interactiveElement(dialogNode as unknown as HTMLElement);
      expect(dialog.open).toBe(true);
      expect(button.disabled).toBe(true);
      expect(elementText(dialogNode as unknown as Node)).toContain('Veteran — subclass; external homebrew; create');
      expect(elementText(dialogNode as unknown as Node)).toContain('<img src=x onerror=alert(1)>');
      expect(dialogNode.querySelector('img')).toBeNull();

      const confirm = dialog.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Import with these choices');
      if (confirm === undefined) throw new Error('Bundled import confirmation missing.');
      confirm.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(commits).toBe(1);
      expect(elementText(dialogNode as unknown as Node)).not.toContain(
        'Veteran — subclass; external homebrew; create',
      );
      expect(elementText(dialogNode as unknown as Node)).toContain(
        'Veteran — subclass; external homebrew; matched existing',
      );
      expect(elementText(dialogNode as unknown as Node)).toContain(
        'The catalog changed. Review the refreshed plan before committing.',
      );
      confirm.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(commits).toBe(2);
      expect(persistedChanges).toBe(1);
      expect(button.disabled).toBe(false);
      expect(elementText(controls.element)).toContain(
        'Bundled homebrew imported: 0 published, 3 matched existing.',
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('announces bundled-homebrew preview errors accessibly and restores the trigger', async () => {
    const fixture = services();
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => undefined,
        services: {
          ...fixture.value,
          authoring: {
            previewBundledHomebrew: async () => { throw new Error('Catalog preview failed.'); },
            installBundledHomebrew: async () => { throw new Error('Unexpected install.'); },
          },
        },
      });
      const root = interactiveElement(controls.element);
      const button = root.querySelectorAll('button').find((candidate) =>
        candidate.textContent === 'Import bundled homebrew');
      if (button === undefined) throw new Error('Bundled homebrew button missing.');
      button.click();
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      const status = root.querySelector('[role="alert"]');

      expect(status?.textContent).toBe('Catalog preview failed.');
      expect(button.disabled).toBe(false);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('opens the real adoption dialog and routes its accepted choice through catalog commit', async () => {
    const fixture = services();
    const committedSummary = await fixture.value.catalog.importCatalog([]);
    if ('token' in committedSummary) throw new Error('Expected summary fixture.');
    const reviewPlan: ContentImportPlan = {
      token: 'initial-plan' as ContentImportPlanToken,
      inputHash: 'input',
      graphHash: 'graph',
      targetHash: 'target',
      spellActivityChanges: [],
      reviews: [{
        id: 'spell:external-fireball',
        kind: 'spell',
        incomingName: 'Fireball',
        localName: 'Fireball',
        localCatalogLayer: 'bundled',
        targetContentKey: '2024:fireball' as ContentKey,
        incomingFingerprint: 'a'.repeat(64) as ContentFingerprintDigest,
        matchClass: 'srd-fallback',
        defaultChoice: 'match',
        selectedChoice: 'match',
        cloneName: 'Fireball (Private copy)',
        dependencies: [],
        conflictDetails: [],
      }],
      outcomes: [{
        id: 'spell:external-fireball',
        kind: 'review',
        contentKey: '2024:fireball' as ContentKey,
        matchClass: 'srd-fallback',
      }],
    };
    const commits: Array<{
      readonly documents: readonly string[];
      readonly token: ContentImportPlanToken;
      readonly choices: unknown;
    }> = [];
    let persistedChanges = 0;
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => { persistedChanges += 1; },
        services: {
          ...fixture.value,
          catalog: {
            importCatalog: async () => reviewPlan,
            planImport: async () => reviewPlan,
            commitImport: async (documents, token, choices) => {
              commits.push({ documents, token, choices });
              return {
                kind: 'committed',
                outcomes: reviewPlan.outcomes,
                summary: committedSummary,
              };
            },
          },
        },
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const catalogInput = root.querySelectorAll('input')[0];
      if (catalogInput === undefined) throw new Error('Catalog input missing.');
      Object.defineProperty(catalogInput, 'files', {
        configurable: true,
        value: [readableFile('catalog.json', '[{"name":"Fireball"}]')],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import catalog',
      );
      if (importButton === undefined) throw new Error('Import button missing.');
      importButton.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      const dialog = root.querySelector('[data-testid="content-adoption-modal"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.isConnected).toBe(true);
      expect(dialog?.open).toBe(true);
      const commitButton = dialog?.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      commitButton.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(commits).toEqual([{
        documents: ['[{"name":"Fireball"}]'],
        token: reviewPlan.token,
        choices: {},
      }]);
      expect(persistedChanges).toBe(1);
      expect(root.querySelectorAll('button').some((button) =>
        button.textContent === 'Forget remembered choice',
      )).toBe(true);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('imports a zero-review, zero-refusal complete character JSON without a dialog', async () => {
    const fixture = services();
    let persistedChanges = 0;
    let persisted!: () => void;
    const persistedSignal = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => {
          persistedChanges += 1;
          persisted();
        },
        services: fixture.value,
      });
      const root = interactiveElement(controls.element);
      expect(elementText(controls.element)).toContain(
        'Character JSON backups include the character and its complete referenced external content.',
      );
      expect(elementText(controls.element)).toContain(
        'Share links include referenced external content when it fits and warn when it does not.',
      );
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({ character: { name: 'Preview Hero' } }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      await persistedSignal;

      expect(fixture.persisted.characters).toHaveLength(2);
      expect(controls.element.querySelector(
        '[data-testid="content-adoption-modal"]',
      )).toBeNull();
      expect(persistedChanges).toBe(1);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('creates another copy only after accepting the structural duplicate notice', async () => {
    const fixture = services();
    let persisted!: () => void;
    const persistedSignal = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [summary(7, 'Backup Hero')],
        onPersistedChange: persisted,
        services: fixture.value,
      });
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({
          source_character_id: 41,
          character: { id: 41, name: 'Backup Hero', strength: 10 },
        }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      await persistedSignal;
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();

      expect(fixture.confirmations).toEqual([
        'This backup appears to have been imported already: a character with the same core saved details as “Backup Hero” is here. ' +
          'It could be a separate identical character. Create another copy?',
      ]);
      expect(fixture.persisted.characters).toHaveLength(2);
      expect(elementText(controls.element)).toContain('Character imported as #8.');
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('DUPLICATE-CANCEL refuses the copy before commit and leaves the count unchanged', async () => {
    const fixture = services();
    fixture.setConfirmation(false);
    let persistedChanges = 0;
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [summary(7, 'Backup Hero')],
        onPersistedChange: () => {
          persistedChanges += 1;
        },
        services: fixture.value,
      });
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({
          source_character_id: 99,
          character: { id: 99, name: 'Backup Hero', strength: 10 },
        }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(fixture.persisted.characters).toHaveLength(1);
      expect(persistedChanges).toBe(0);
      expect(elementText(controls.element)).toContain(
        'Character import cancelled. Nothing was changed.',
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('does not mistake a matching name with different structural details for a prior import', async () => {
    const fixture = services();
    fixture.setConfirmation(false);
    let persisted!: () => void;
    const persistedSignal = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [summary(7, 'Backup Hero')],
        onPersistedChange: persisted,
        services: fixture.value,
      });
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({
          source_character_id: 52,
          character: { id: 52, name: 'Backup Hero', strength: 12 },
        }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      await persistedSignal;

      expect(fixture.confirmations).toEqual([]);
      expect(fixture.persisted.characters).toHaveLength(2);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('does not let an unexportable local character block an otherwise valid import', async () => {
    const fixture = services();
    let persisted!: () => void;
    const persistedSignal = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [summary(7, 'Broken Local Character')],
        onPersistedChange: persisted,
        services: {
          ...fixture.value,
          backup: {
            ...fixture.value.backup,
            exportCharacter: async () => {
              throw new Error('Stored local character cannot be exported.');
            },
          },
        },
      });
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({
          source_character_id: 61,
          character: { id: 61, name: 'Importable Hero', strength: 10 },
        }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      await persistedSignal;

      expect(fixture.confirmations).toEqual([]);
      expect(fixture.persisted.characters).toHaveLength(2);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('keeps the character adoption dialog for a review-required plan', async () => {
    const fixture = services();
    const reviewPlan: ContentImportPlan = {
      token: 'character-review' as ContentImportPlanToken,
      inputHash: 'input',
      graphHash: 'graph',
      targetHash: 'target',
      spellActivityChanges: [],
      reviews: [{
        id: 'portable:item:reviewed',
        kind: 'item',
        incomingName: 'Reviewed Relic',
        localName: 'Reviewed Relic',
        localCatalogLayer: 'external',
        targetContentKey: '2024:item:reviewed' as ContentKey,
        incomingFingerprint: 'b'.repeat(64) as ContentFingerprintDigest,
        matchClass: 'metadata-conflict',
        defaultChoice: 'match',
        selectedChoice: 'match',
        cloneName: 'Reviewed Relic (Private copy)',
        dependencies: [],
        conflictDetails: [],
      }],
      outcomes: [{
        id: 'portable:item:reviewed',
        kind: 'review',
        contentKey: '2024:item:reviewed' as ContentKey,
        matchClass: 'metadata-conflict',
      }],
    };
    let persisted!: () => void;
    const persistedSignal = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: persisted,
        services: {
          ...fixture.value,
          backup: {
            ...fixture.value.backup,
            planCharacterImport: async () => reviewPlan as never,
          },
        },
      });
      document.body.append(controls.element);
      const root = interactiveElement(controls.element);
      const characterInput = root.querySelectorAll('input')[2];
      if (characterInput === undefined) throw new Error('Character input missing.');
      Object.defineProperty(characterInput, 'files', {
        configurable: true,
        value: [readableFile('hero.json', JSON.stringify({ character: { name: 'Modal Hero' } }))],
      });
      const importButton = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Import character backup',
      );
      if (importButton === undefined) throw new Error('Character import button missing.');
      importButton.click();
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();

      expect(fixture.persisted.characters).toHaveLength(1);
      const dialogNode = controls.element.querySelector(
        '[data-testid="content-adoption-modal"]',
      );
      if (dialogNode === null) throw new Error('Adoption dialog missing.');
      const dialog = interactiveElement(dialogNode);
      expect(dialog.isConnected).toBe(true);
      expect(dialog.open).toBe(true);
      const commitButton = dialog
        .querySelectorAll('button')
        .find((button) => button.textContent === 'Import with these choices');
      if (commitButton === undefined) throw new Error('Commit button missing.');
      commitButton.click();
      await persistedSignal;

      expect(fixture.persisted.characters).toHaveLength(2);
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('CI-8 forgets the selected remembered choice and refreshes its management list', async () => {
    const fixture = services();
    const forgotten: unknown[] = [];
    let receipts = [{
      kind: 'item' as const,
      scheme: 'content-v1' as never,
      digest: 'a'.repeat(64) as ContentFingerprintDigest,
      decision: 'match' as const,
      targetContentKey: '2024:item:remembered' as ContentKey,
      reviewedAt: '2026-08-06T00:00:00.000Z',
    }];
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => undefined,
        services: {
          ...fixture.value,
          catalog: {
            ...fixture.value.catalog,
            listMatchDecisions: async () => receipts,
            forgetMatchDecision: async (input) => {
              forgotten.push(input);
              receipts = [];
              return { forgotten: true };
            },
          },
        },
      });
      const root = interactiveElement(controls.element);
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      const forget = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Forget remembered choice',
      );
      if (forget === undefined) throw new Error('Forget button missing.');
      const receiptSelect = root.querySelector(
        '[aria-label="Remembered catalog match choice"]',
      );
      if (receiptSelect === null) throw new Error('Receipt select missing.');
      expect(receiptSelect.querySelector('option')?.textContent).toContain(
        'content-v1 aaaaaaaaaaaa…',
      );
      receiptSelect.value =
        receiptSelect.querySelector('option')?.getAttribute('value') ?? '';
      expect(forget.disabled).toBe(false);
      forget.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(forgotten).toEqual([{
        kind: 'item',
        scheme: 'content-v1',
        digest: 'a'.repeat(64),
      }]);
      expect(forget.disabled).toBe(true);
      expect(elementText(controls.element)).toContain(
        'Remembered catalog choice forgotten.',
      );
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('keeps remembered-choice controls disabled until receipts resolve', async () => {
    const fixture = services();
    let resolveReceipts!: (receipts: readonly never[]) => void;
    const receipts = new Promise<readonly never[]>((resolve) => {
      resolveReceipts = resolve;
    });
    let forgetCalls = 0;
    const restoreDocument = installInteractiveDocument();
    try {
      const controls = createImportBackupControls({
        rpc: null as never,
        characters: [],
        onPersistedChange: () => undefined,
        services: {
          ...fixture.value,
          catalog: {
            ...fixture.value.catalog,
            listMatchDecisions: () => receipts,
            forgetMatchDecision: async () => {
              forgetCalls += 1;
              return { forgotten: false };
            },
          },
        },
      });
      const root = interactiveElement(controls.element);
      const forget = root.querySelectorAll('button').find((button) =>
        button.textContent === 'Forget remembered choice',
      );
      if (forget === undefined) throw new Error('Forget button missing.');
      const receiptSelect = root.querySelector(
        '[aria-label="Remembered catalog match choice"]',
      );
      if (receiptSelect === null) throw new Error('Receipt select missing.');

      expect(forget.disabled).toBe(true);
      expect(receiptSelect.disabled).toBe(true);
      forget.click();
      await Promise.resolve();
      expect(forgetCalls).toBe(0);
      expect(elementText(controls.element)).not.toContain('Unexpected end of JSON input');

      resolveReceipts([]);
      await receipts;
      controls.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('confirms database replacement and persists the selected SQLite bytes', async () => {
    const fixture = services();
    const controller = new ImportBackupController(fixture.value);
    const selected = readableFile(
      'backup.sqlite3',
      new Uint8Array([9, 8, 7, 6]),
    );
    fixture.setConfirmation(false);

    await expect(controller.importDatabase(selected)).resolves.toBe(false);
    expect([...fixture.persisted.database]).toEqual([1, 2, 3]);
    fixture.setConfirmation(true);
    await expect(controller.importDatabase(selected)).resolves.toBe(true);

    expect([...fixture.persisted.database]).toEqual([9, 8, 7, 6]);
  });

  it('round-trips character and database backup downloads through persisted services', async () => {
    const fixture = services();
    const controller = new ImportBackupController(fixture.value);

    await controller.exportDatabase();
    await controller.exportCharacter(summary(7, 'Backup Hero'));
    const characterJson = await fixture.saved[1]?.contents.text();
    expect(characterJson).toContain('"source_character_id": 7');
    expect(characterJson?.endsWith('\n')).toBe(true);

    const prepared = await controller.prepareCharacterImport(
      readableFile('backup-hero.json', characterJson ?? ''),
    );
    await fixture.value.backup.commitCharacterImport(
      prepared.document,
      prepared.plan.token,
      {},
    );

    expect(fixture.saved.map((file) => file.filename)).toEqual([
      'srd-55-database-2026-07-23.sqlite3',
      'backup-hero-character.json',
    ]);
    expect(fixture.persisted.characters).toEqual([
      summary(7, 'Backup Hero'),
      summary(8, 'Backup Hero'),
    ]);
  });
});
