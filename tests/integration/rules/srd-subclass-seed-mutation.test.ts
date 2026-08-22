import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import type {
  SrdSubclassDefinition,
  SrdSubclassManifest,
} from '../../../src/rules/srd-subclasses';
import { openTestDatabase } from '../../helpers/open-db';

const IDENTITY_PERTURBATIONS = [
  'class_name',
  'subclass_name',
  'class_level',
  'name',
] as const;

type IdentityPerturbation = (typeof IDENTITY_PERTURBATIONS)[number];

const connections: Database[] = [];

beforeEach(() => {
  // open-db imports the application bootstrap, which loads the real seed
  // module before this file's tests install their narrow parser doubles.
  vi.resetModules();
});

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
  vi.doUnmock('../../../src/rules/srd-subclasses');
  vi.doUnmock('../../../src/rules/draconic-resilience-srd');
  vi.resetModules();
});

function perturbIdentity(
  manifest: SrdSubclassManifest,
  field: IdentityPerturbation,
): SrdSubclassManifest {
  const sorcerer = manifest.by_class.Sorcerer;
  let changed: SrdSubclassDefinition;
  switch (field) {
    case 'class_name':
      changed = { ...sorcerer, class_name: 'Wizard' };
      break;
    case 'subclass_name':
      changed = { ...sorcerer, subclass_name: 'Arcane Sorcery' };
      break;
    case 'class_level':
      changed = {
        ...sorcerer,
        features: sorcerer.features.map((feature) =>
          feature.name === 'Draconic Resilience'
            ? { ...feature, class_level: 4 }
            : feature,
        ),
      };
      break;
    case 'name':
      changed = {
        ...sorcerer,
        features: sorcerer.features.map((feature) =>
          feature.name === 'Draconic Resilience'
            ? { ...feature, name: 'Draconic Fortitude' }
            : feature,
        ),
      };
      break;
  }
  return {
    ...manifest,
    by_class: { ...manifest.by_class, Sorcerer: changed },
  };
}

describe('SRD subclass seed identity mutation guards', () => {
  it('attaches the exact effects and both grant-rule outcome kinds from a fresh module graph', async () => {
    const { ensureBundledSrdSubclassContent } = await import(
      '../../../src/rules/srd-subclass-content'
    );
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    seedClassProgressions(db);

    expect(ensureBundledSrdSubclassContent(db)).toBe(true);
    expect(db.scalar('SELECT count(*) FROM subclass_feature_effects')).toBe(2);
    expect(db.allRaw(
      `SELECT content_key FROM subclass_definitions
        WHERE content_key IN (
          '2024:subclass:life-domain',
          '2024:subclass:champion'
        ) AND grant_rules IS NOT NULL
        ORDER BY content_key`,
    )).toEqual([
      { content_key: '2024:subclass:champion' },
      { content_key: '2024:subclass:life-domain' },
    ]);
  });

  it.each(IDENTITY_PERTURBATIONS)(
    'does not attach Draconic Resilience effects when only %s differs',
    async (field) => {
      vi.doMock(
        '../../../src/rules/srd-subclasses',
        async (importOriginal) => {
          const actual = await importOriginal<
            typeof import('../../../src/rules/srd-subclasses')
          >();
          return {
            ...actual,
            parseSrdSubclasses: () =>
              perturbIdentity(actual.parseSrdSubclasses(), field),
          };
        },
      );
      const { ensureBundledSrdSubclassContent } = await import(
        '../../../src/rules/srd-subclass-content'
      );
      const connection = await openTestDatabase();
      connections.push(connection);
      const db = new DatabaseContext(connection);
      seedClassProgressions(db);

      expect(ensureBundledSrdSubclassContent(db)).toBe(true);
      expect(db.allRaw(
        `SELECT parent.name AS class_name, subclass.name AS subclass_name,
                feature.class_level, feature.name
           FROM subclass_feature_effects AS effect
           JOIN subclass_features AS feature
             ON feature.id = effect.subclass_feature_id
           JOIN subclass_definitions AS subclass
             ON subclass.id = feature.subclass_definition_id
           JOIN class_definitions AS parent
             ON parent.id = subclass.class_definition_id`,
      )).toEqual([]);
    },
  );

  it('parses each immutable seed source only once', async () => {
    const subclassParser = vi.fn();
    const resilienceParser = vi.fn();
    vi.doMock(
      '../../../src/rules/srd-subclasses',
      async (importOriginal) => {
        const actual = await importOriginal<
          typeof import('../../../src/rules/srd-subclasses')
        >();
        subclassParser.mockImplementation(actual.parseSrdSubclasses);
        return { ...actual, parseSrdSubclasses: subclassParser };
      },
    );
    vi.doMock(
      '../../../src/rules/draconic-resilience-srd',
      async (importOriginal) => {
        const actual = await importOriginal<
          typeof import('../../../src/rules/draconic-resilience-srd')
        >();
        resilienceParser.mockImplementation(actual.parseSrdDraconicResilience);
        return { ...actual, parseSrdDraconicResilience: resilienceParser };
      },
    );
    const { bundledSrdSubclassDefinitionContentKeys } = await import(
      '../../../src/rules/srd-subclass-content'
    );

    expect(bundledSrdSubclassDefinitionContentKeys()).toHaveLength(12);
    expect(bundledSrdSubclassDefinitionContentKeys()).toHaveLength(12);
    expect(subclassParser).toHaveBeenCalledOnce();
    expect(resilienceParser).toHaveBeenCalledOnce();
  });
});
