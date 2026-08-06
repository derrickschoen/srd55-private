import { describe, expect, it } from 'vitest';
import type { CharacterRow } from '../../../src/domain/models';
import type { CharacterSummary } from '../../../src/domain/read-models';
import {
  CharacterListController,
  catalogGapLabel,
  characterCardRouteActions,
  classSummary,
  completenessByCharacter,
  outstandingLabel,
  warningLabel,
} from '../../../src/ui/screens/character-list/character-list';
import { fragmentFromShareLink } from '../../../src/ui/screens/character-list/share-controls';
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
import {
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
});

describe('character list behavior', () => {
  it('puts the seam-generated primary Level Up action before the secondary workspace action on every card', () => {
    expect(characterCardRouteActions(73)).toEqual([
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
        classes: ['Bard 1', 'Wizard 1'],
      }),
    ).toBe('Bard 1 / Wizard 1');
    expect(classSummary(summary(2, 'Empty'))).toBe(
      'No classes yet. Open the build to add one.',
    );
    expect(warningLabel(1)).toBe('1 warning');
    expect(warningLabel(0)).toBe('0 warnings');
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
            character: { id: characterId, name: 'Backup Hero' },
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
            result: { characterId: id, spellOutcomes: [] },
          };
        },
      },
      confirm: () => confirmation,
      save: (file) => saved.push(file),
      now: () => '2026-07-23T12:00:00.000Z',
    };
    return {
      persisted,
      saved,
      value,
      setConfirmation: (next: boolean) => {
        confirmation = next;
      },
    };
  }

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
      const commitButton = dialog?.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      commitButton.click();
      for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

      expect(commits).toEqual([{
        documents: ['[{"name":"Fireball"}]'],
        token: reviewPlan.token,
        choices: {
          'spell:external-fireball': {
            decision: 'match',
            cloneName: 'Fireball (Private copy)',
          },
        },
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
