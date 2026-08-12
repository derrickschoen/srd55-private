import { readFileSync } from 'node:fs';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
  SubclassContentAggregate,
} from '../../../src/authoring/contracts';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  importCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import {
  commitLibraryImport,
  exportSelectedLibraryContent,
  exportWholeLibrary,
  importLibraryDocument,
  planLibraryImport,
} from '../../../src/backup/library-export';
import {
  PRE_LINEAGE_CHARACTER_BACKUP_VERSION,
  PRE_PROVENANCE_CHARACTER_BACKUP_VERSION,
  PRE_FLAVOR_CHARACTER_BACKUP_VERSION,
  PREVIOUS_CHARACTER_BACKUP_VERSION,
} from '../../../src/backup/backup-version';
import {
  libraryContentImportNodes,
  PRE_PROVENANCE_LIBRARY_EXPORT_VERSION,
  portableSubclassContentImportNode,
  restorePortableContentSupersessions,
  validateLibraryDocument,
  type LibraryExportDocument,
} from '../../../src/backup/portable-content';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  commitContentImport,
  planContentImport,
  type ContentImportPlanner,
  type ContentImportPlanToken,
} from '../../../src/catalog/content-adoption';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { applicationSeed, createApplicationLifecycle } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { creatureSize, creatureType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import { workspaceFixtureImage } from '../../browser/fixtures/php-parity';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import {
  getSqlite3,
  MemoryDatabaseStorage,
  openTestDatabase,
} from '../../helpers/open-db';

const opened: Database[] = [];
const exportedAt = '2042-03-05T00:00:00.000Z';
const legacyDoublePlanImportedState = readFileSync(
  new URL('../../fixtures/library-import-double-plan-state.json', import.meta.url),
  'utf8',
).trim();

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
});

function catalogDocument(kind: string, aggregate: object): string {
  return JSON.stringify([{ kind, aggregate }]);
}

function fingerprint(db: DatabaseContext, contentKey: ContentKey) {
  const row = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_key = ? AND fingerprint_role = 'current'`,
    [contentKey],
  );
  if (row === null) throw new Error(`Missing fixture fingerprint for ${contentKey}.`);
  return {
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: String(row.fingerprint_digest) as ContentFingerprintDigest,
  };
}

interface ClosureFixture {
  readonly featKey: ContentKey;
  readonly speciesKey: ContentKey;
  readonly backgroundKey: ContentKey;
  readonly unrelatedKey: ContentKey;
  readonly speciesId: number;
  readonly backgroundId: number;
}

function seedClosureLibrary(db: DatabaseContext): ClosureFixture {
  const importer = new CatalogImporter(db);
  importer.import({
    documents: [catalogDocument('feat', {
      ...featProjectorV1Vector.aggregate,
      category: 'origin',
    })],
  });
  const featKey = 'expanded:content.feat:keen-memory' as ContentKey;

  const species: SpeciesContentAggregate = {
    kind: 'species',
    name: 'Closure Species',
    rules_edition: 'expanded',
    reference_text: 'Carries the transitive feat.',
    repeatable: false,
    creature_type: creatureType('Humanoid'),
    primary_size: creatureSize('Medium'),
    alternate_size: null,
    walking_speed_feet: 30,
    grants: [{
      kind: 'grant_source',
      rule_key: 'closure-species-feat',
      count: 1,
      source_type: 'feat',
      source_definition: { kind: 'feat', ...fingerprint(db, featKey) },
      active_from_class_level: null,
      active_if_config: null,
      distinct_config_by: null,
      always_prepared: false,
      with_slots: false,
      free_cast: null,
    }],
    traits: [],
  };
  importer.import({ documents: [catalogDocument('species', species)] });

  const background: BackgroundContentAggregate = {
    kind: 'background',
    name: 'Closure Background',
    rules_edition: 'expanded',
    reference_text: 'Also carries the transitive feat.',
    repeatable: false,
    grants: [],
    suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
    default_origin_feat_content_key: featKey,
    default_origin_feat: { kind: 'feat', ...fingerprint(db, featKey) },
    default_origin_feat_display_name: 'Portable Origin Feat (Cleric)',
    skill_proficiencies: ['arcana', 'insight'],
    tool_reference_text: null,
    equipment_option_a_description: 'None.',
    equipment_option_b_description: 'None.',
    equipment_option_a: [],
    equipment_option_b: [],
    effects: [],
  };
  importer.import({ documents: [catalogDocument('background', background)] });
  importer.import({
    documents: [catalogDocument('feat', {
      ...featProjectorV1Vector.aggregate,
      name: 'Unreferenced Feat',
    })],
  });

  const speciesKey = 'expanded:content.species:closure-species' as ContentKey;
  const backgroundKey = 'expanded:content.background:closure-background' as ContentKey;
  const unrelatedKey = 'expanded:content.feat:unreferenced-feat' as ContentKey;
  const speciesId = db.scalar<number>(
    'SELECT id FROM species_definitions WHERE content_key = ?', [speciesKey],
  );
  const backgroundId = db.scalar<number>(
    'SELECT id FROM background_definitions WHERE content_key = ?', [backgroundKey],
  );
  if (speciesId === null || backgroundId === null) {
    throw new Error('Closure fixture roots did not install under their asserted keys.');
  }
  return { featKey, speciesKey, backgroundKey, unrelatedKey, speciesId, backgroundId };
}

function seedClosureCharacter(
  db: DatabaseContext,
  fixture: ClosureFixture,
): number {
  const characterId = db.exec(
    `INSERT INTO characters (name, archived_at)
     VALUES ('Closure Hero', '2042-03-04T05:06:07.000Z')`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name
     ) VALUES
       (?, 'closure-species-source', 'species', ?, 'Closure Species'),
       (?, 'closure-background-source', 'background', ?, 'Closure Background')`,
    [characterId, fixture.speciesId, characterId, fixture.backgroundId],
  );
  return characterId;
}

const contributionSubclassKey =
  'expanded:content.subclass:portable-scaling' as ContentKey;

function seedContributionSubclass(
  db: DatabaseContext,
  withContributions = true,
): { readonly contentKey: ContentKey; readonly classId: number; readonly subclassId: number } {
  applicationSeed(db);
  const classKey = '2024:class:fighter' as ContentKey;
  const contentKey = withContributions
    ? contributionSubclassKey
    : 'expanded:content.subclass:portable-plain' as ContentKey;
  const aggregate: SubclassContentAggregate = {
    kind: 'subclass',
    name: withContributions ? 'Portable Scaling' : 'Portable Plain',
    rules_edition: 'expanded',
    reference_text: 'Portable subclass fixture.',
    parent_class: { kind: 'class', ...fingerprint(db, classKey) },
    grants: [],
    progression: { mode: 'inherit_parent' },
    features: [{
      class_level: 3 as never,
      sort_order: 1,
      name: 'Portable feature',
      description: 'Carries authored values.',
      effects: [],
      ...(withContributions ? { contributions: [
        {
          kind: 'feature_value_contribution' as const,
          contribution_key: 'base-dice',
          label: 'Base Dice',
          target: { kind: 'feature_dice_count' as const, key: 'sneak_attack' as const },
          op: 'add' as const,
          active_from_level: 3 as never,
          active_to_level: 20 as never,
          value: { kind: 'const' as const, amount: 1 },
        },
        {
          kind: 'feature_value_contribution' as const,
          contribution_key: 'scaled-dice',
          label: 'Scaled Dice',
          target: { kind: 'feature_dice_count' as const, key: 'sneak_attack' as const },
          op: 'add' as const,
          active_from_level: 9 as never,
          active_to_level: 20 as never,
          value: {
            kind: 'scale' as const,
            source: { kind: 'class_level' as const, class_content_key: classKey },
            multiply: 1 as never,
            divide: 2 as never,
            round: 'ceiling' as const,
          },
          supersedes: {
            kind: 'contribution' as const,
            content_key: contentKey,
            contribution_key: 'base-dice',
          },
        },
        {
          kind: 'feature_value_contribution' as const,
          contribution_key: 'focus-points',
          label: 'Focus Points',
          target: {
            kind: 'resource_maximum' as const,
            resource: {
              fact_key: `${contentKey}\u0000focus-points`,
              display_label: 'Focus Points',
              marking_shape: 'remaining' as const,
            },
          },
          op: 'add' as const,
          active_from_level: 3 as never,
          active_to_level: 20 as never,
          value: {
            kind: 'table' as const,
            level_source: { kind: 'class_level' as const, class_content_key: classKey },
            rows: [
              { from: 3 as never, to: 8 as never, amount: 2 },
              { from: 9 as never, to: 20 as never, amount: 4 },
            ],
          },
        },
      ] } : {}),
    }],
  };
  const node = portableSubclassContentImportNode(db, aggregate, contentKey);
  const plan = planContentImport(db, [node]);
  const committed = commitContentImport(db, { nodes: [node], token: plan.token });
  if (committed.kind !== 'committed') throw new Error('Portable subclass import was refused.');
  const classId = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE content_key = ?', [classKey],
  );
  const subclassId = db.scalar<number>(
    'SELECT id FROM subclass_definitions WHERE content_key = ?', [contentKey],
  );
  if (classId === null || subclassId === null) throw new Error('Portable subclass did not install.');
  return { contentKey, classId, subclassId };
}

function seedContributionCharacter(
  db: DatabaseContext,
  fixture: ReturnType<typeof seedContributionSubclass>,
): number {
  const characterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Portable Scaling Hero')",
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, subclass_definition_id, level,
       is_starting_class
     ) VALUES (?, ?, ?, 10, 1)`,
    [characterId, fixture.classId, fixture.subclassId],
  );
  db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, acquired_at_character_level, state
     ) VALUES
       (?, 'portable-scaling-class', 'class', ?, 'Fighter 10', 1, 'active'),
       (?, 'portable-scaling-subclass', 'subclass', ?, 'Portable Scaling', 3, 'active')`,
    [characterId, fixture.classId, characterId, fixture.subclassId],
  );
  return characterId;
}

function contributionRows(db: DatabaseContext): readonly Readonly<Record<string, unknown>>[] {
  return db.allRaw(
    `SELECT contribution.contribution_key, contribution.label,
            contribution.target_kind, contribution.target_key,
            contribution.resource_display_label,
            contribution.resource_marking_shape, contribution.op,
            contribution.active_from_level, contribution.active_to_level,
            contribution.value_json, contribution.supersedes_ref
       FROM subclass_feature_value_contributions AS contribution
       ORDER BY contribution.contribution_key`,
  ).map((row) => ({
    ...row,
    value_json: canonicalJson(JSON.parse(String(row.value_json))),
    supersedes_ref: row.supersedes_ref === null
      ? null
      : canonicalJson(JSON.parse(String(row.supersedes_ref))),
  }));
}

function rekeyExternalContentAsDerived(
  db: DatabaseContext,
  kind: string,
  assertedKey: ContentKey,
): ContentKey {
  const derivedKey = `expanded:content.v1:${'a'.repeat(64)}` as ContentKey;
  const rootTable = kind === 'feat' ? 'feat_definitions' : null;
  if (rootTable === null) throw new Error(`Unsupported derived fixture ${kind}.`);
  db.transaction((transaction) => {
    transaction.exec('PRAGMA defer_foreign_keys = ON');
    transaction.exec(
      `UPDATE catalog_content_fingerprints SET content_key = ?
       WHERE content_kind = ? AND content_key = ?`,
      [derivedKey, kind, assertedKey],
    );
    transaction.exec(
      `UPDATE ${rootTable} SET content_key = ? WHERE content_key = ?`,
      [derivedKey, assertedKey],
    );
    transaction.exec(
      `UPDATE species_definitions
       SET grant_rules = replace(grant_rules, ?, ?)`,
      [assertedKey, derivedKey],
    );
    transaction.exec(
      `UPDATE background_templates
       SET default_origin_feat_content_key = ?
       WHERE default_origin_feat_content_key = ?`,
      [derivedKey, assertedKey],
    );
    transaction.exec(
      `UPDATE catalog_content_identities
       SET content_key = ?, key_kind = 'derived'
       WHERE content_kind = ? AND content_key = ?`,
      [derivedKey, kind, assertedKey],
    );
  });
  return derivedKey;
}

function manifestEnumeration(document: {
  readonly content: readonly { readonly kind: string; readonly content_key: string }[];
}): readonly string[] {
  return document.content.map((entry) => `${entry.kind}:${entry.content_key}`);
}

function importedLibraryStateProjection(db: DatabaseContext) {
  const library = structuredClone(exportWholeLibrary(db, exportedAt));
  const historicalLibrary = {
    ...library,
    version: 2,
    content: library.content.map(({ provenance: _provenance, ...entry }) => entry),
  };
  return {
    library: historicalLibrary,
    supersessions: db.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key,
              recorded_at
       FROM catalog_content_supersessions
       ORDER BY content_kind, superseded_content_key`,
    ),
  };
}

/** The exact two-plan implementation replaced by this hardening change. */
function commitLibraryImportDoublePlanReference(
  db: DatabaseContext,
  document: LibraryExportDocument,
  token: ContentImportPlanToken,
) {
  const nodes = libraryContentImportNodes(db, document);
  const operationIdentity = sha256(canonicalJson(document));
  const dryRun = planContentImport(
    db,
    nodes,
    Object.freeze({}),
    Object.freeze([]),
    operationIdentity,
  );
  const targets = new Map<string, ContentKey>();
  for (const [index, node] of nodes.entries()) {
    const entry = document.content[index];
    const outcome = dryRun.outcomes.find((candidate) => candidate.id === node.id);
    if (
      entry !== undefined && outcome !== undefined &&
      outcome.kind !== 'refused' && outcome.kind !== 'review'
    ) {
      targets.set(`${entry.kind}\u0000${entry.content_key}`, outcome.contentKey);
    }
  }
  return commitContentImport(db, {
    nodes,
    token,
    operationIdentity,
    afterInstall: (transaction) => restorePortableContentSupersessions(
      transaction,
      { content: document.content, supersessions: document.supersessions },
      targets,
    ),
  });
}

function emptyHistoricalSpellDefinitions() {
  return {
    spell_identities: [], spell_identity_aliases: [], spell_versions: [],
    spell_version_publications: [], spell_list_memberships: [],
    spell_version_tags: [], spell_version_damage_types: [],
    spell_version_conditions: [], spell_version_attack_modes: [],
    spell_version_save_abilities: [], spell_version_upcast_levels: [],
    spell_version_cantrip_upgrade_levels: [],
  };
}

describe('portable content manifests', () => {
  it('carries subclass contributions through library, character backup, and v19 share with exact wire keys', async () => {
    const source = await database();
    const fixture = seedContributionSubclass(source);
    const characterId = seedContributionCharacter(source, fixture);
    const expectedRows = contributionRows(source);

    const library = exportSelectedLibraryContent(source, [fixture.contentKey], exportedAt);
    validateLibraryDocument(library);
    const entry = library.content.find((candidate) => candidate.kind === 'subclass');
    if (entry?.kind !== 'subclass') throw new Error('Subclass was absent from library export.');
    const aggregate = entry.aggregate;
    if (aggregate.kind !== 'subclass') throw new Error('Subclass aggregate kind was lost.');
    const feature = aggregate.features[0]!;
    const contributions = feature.contributions ?? [];
    expect(Object.keys(entry).sort()).toEqual([
      'aggregate', 'content_key', 'fingerprint_digest', 'fingerprint_scheme',
      'key_kind', 'kind', 'provenance',
    ]);
    expect(Object.keys(feature).sort()).toEqual([
      'class_level', 'contributions', 'description', 'effects', 'name', 'sort_order',
    ]);
    expect(contributions).toHaveLength(3);
    expect(Object.keys(contributions[0]!).sort()).toEqual([
      'active_from_level', 'active_to_level', 'contribution_key', 'kind',
      'label', 'op', 'target', 'value',
    ]);
    expect(Object.keys(contributions[1]!).sort()).toEqual([
      'active_from_level', 'active_to_level', 'contribution_key', 'kind',
      'label', 'op', 'supersedes', 'target', 'value',
    ]);
    const resource = contributions.find((candidate) =>
      candidate.target.kind === 'resource_maximum');
    if (resource?.target.kind !== 'resource_maximum' ||
        typeof resource.target.resource === 'string') {
      throw new Error('Authored resource target was absent.');
    }
    expect(Object.keys(resource.target).sort()).toEqual(['kind', 'resource']);
    expect(Object.keys(resource.target.resource).sort()).toEqual([
      'display_label', 'fact_key', 'marking_shape',
    ]);

    const libraryTarget = await database();
    applicationSeed(libraryTarget);
    importLibraryDocument(libraryTarget, library);
    expect(contributionRows(libraryTarget)).toEqual(expectedRows);

    const backup = exportCharacterBackup(source, characterId, exportedAt);
    const backupTarget = await database();
    applicationSeed(backupTarget);
    importCharacterBackup(backupTarget, backup);
    expect(contributionRows(backupTarget)).toEqual(expectedRows);

    const share = exportCharacterShare(source, characterId);
    expect(share.version).toBe(19);
    expect(share.classes).toEqual(expect.arrayContaining([
      expect.objectContaining({ subclassKey: fixture.contentKey }),
    ]));
    expect(share.portableContent?.content.find((candidate) =>
      candidate.kind === 'subclass')?.aggregate).toEqual(entry.aggregate);
    const decoded = await decodeShareFragment(await encodeShareFragment(share));
    expect(decoded).toEqual(share);
    const shareTarget = await database();
    applicationSeed(shareTarget);
    importCharacterShare(shareTarget, decoded);
    expect(contributionRows(shareTarget)).toEqual(expectedRows);
  }, 20_000);

  it('rejects contribution extra keys and still imports an old-format subclass with no contribution field', async () => {
    const source = await database();
    const contributed = seedContributionSubclass(source);
    const library = exportSelectedLibraryContent(source, [contributed.contentKey], exportedAt);
    const hostile = JSON.parse(JSON.stringify(library)) as LibraryExportDocument;
    const hostileEntry = hostile.content.find((candidate) => candidate.kind === 'subclass');
    if (hostileEntry?.kind !== 'subclass') throw new Error('Missing hostile subclass fixture.');
    const hostileAggregate = hostileEntry.aggregate;
    if (hostileAggregate.kind !== 'subclass') throw new Error('Hostile aggregate kind was lost.');
    const hostileContribution = hostileAggregate.features[0]?.contributions?.[0] as
      unknown as Record<string, unknown>;
    hostileContribution.future_contribution_field = true;
    expect(() => validateLibraryDocument(hostile)).toThrow(
      /future_contribution_field|unknown key|exact/u,
    );

    const plainSource = await database();
    const plain = seedContributionSubclass(plainSource, false);
    const oldFormat = exportSelectedLibraryContent(plainSource, [plain.contentKey], exportedAt);
    const plainEntry = oldFormat.content.find((candidate) => candidate.kind === 'subclass');
    if (plainEntry?.kind !== 'subclass') throw new Error('Missing plain subclass fixture.');
    const plainAggregate = plainEntry.aggregate;
    if (plainAggregate.kind !== 'subclass') throw new Error('Plain aggregate kind was lost.');
    expect(plainAggregate.features[0]).not.toHaveProperty('contributions');
    const target = await database();
    applicationSeed(target);
    expect(() => importLibraryDocument(target, oldFormat)).not.toThrow();
    expect(contributionRows(target)).toEqual([]);
  }, 20_000);

  it('rejects supersession bands and derived resource keys before portable installation', async () => {
    const source = await database();
    const contributed = seedContributionSubclass(source);
    const library = exportSelectedLibraryContent(source, [contributed.contentKey], exportedAt);

    const outliving = JSON.parse(JSON.stringify(library)) as LibraryExportDocument;
    const outlivingEntry = outliving.content.find((candidate) => candidate.kind === 'subclass');
    if (outlivingEntry?.kind !== 'subclass') throw new Error('Missing outliving subclass fixture.');
    if (outlivingEntry.aggregate.kind !== 'subclass') throw new Error('Outliving aggregate kind was lost.');
    const outlivingContributions = outlivingEntry.aggregate.features[0]?.contributions ?? [];
    const victim = outlivingContributions.find((candidate) =>
      candidate.contribution_key === 'base-dice');
    if (victim === undefined) throw new Error('Missing supersession victim fixture.');
    (victim as { active_to_level: number }).active_to_level = 8;
    expect(() => validateLibraryDocument(outliving)).toThrow(/outlives/u);

    const oversized = JSON.parse(JSON.stringify(library)) as LibraryExportDocument;
    const oversizedEntry = oversized.content.find((candidate) => candidate.kind === 'subclass');
    if (oversizedEntry?.kind !== 'subclass') throw new Error('Missing resource-key subclass fixture.');
    if (oversizedEntry.aggregate.kind !== 'subclass') throw new Error('Resource-key aggregate kind was lost.');
    const oversizedResource = oversizedEntry.aggregate.features[0]?.contributions?.find((candidate) =>
      candidate.target.kind === 'resource_maximum');
    if (
      oversizedResource?.target.kind !== 'resource_maximum' ||
      typeof oversizedResource.target.resource === 'string'
    ) throw new Error('Missing authored resource fixture.');
    const longKey = 'x'.repeat(200);
    (oversizedResource as { contribution_key: string }).contribution_key = longKey;
    (oversizedResource.target.resource as { fact_key: string }).fact_key =
      `${contributed.contentKey}\u0000${longKey}`;
    expect(() => validateLibraryDocument(oversized)).toThrow(/resource display configuration/u);
  });

  it('CI5-PW-R40-FINGERPRINT finalizes parity fixture spells before portable export', async () => {
    const fixture = await workspaceFixtureImage();
    const sqlite3 = await getSqlite3();
    const storage = new MemoryDatabaseStorage(sqlite3);
    await storage.replaceFile(Uint8Array.from(fixture.bytes));
    const lifecycle = createApplicationLifecycle(sqlite3, storage);
    lifecycle.open();
    try {
      const document = exportCharacterBackup(
        lifecycle.database,
        fixture.ids.character,
        exportedAt,
      );
      expect(document.content.some((entry) =>
        entry.kind === 'spell' &&
        entry.content_key.startsWith('2024:content.spell:'),
      )).toBe(true);
    } finally {
      lifecycle.close();
    }
  });

  it('CI5-CLOSURE-EXACT enumerates exactly two referenced creations plus their transitive external reference', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );

    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'species:expanded:content.species:closure-species',
      'background:expanded:content.background:closure-background',
    ]);
    expect(manifestEnumeration(document)).not.toContain(
      'feat:expanded:content.feat:unreferenced-feat',
    );
    expect(document.character.archived_at).toBe('2042-03-04T05:06:07.000Z');
  });

  it('CI5-D198-PORTABLE-KEY reprojects surviving derived content under an asserted name key', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const derivedKey = rekeyExternalContentAsDerived(
      source,
      'feat',
      fixture.featKey,
    );
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );

    expect(manifestEnumeration(document)).toContain(
      'feat:expanded:content.feat:keen-memory',
    );
    expect(JSON.stringify(document)).not.toContain(derivedKey);

    const target = await database();
    importCharacterBackup(target, document);
    expect(target.oneRaw(
      `SELECT key_kind, content_key FROM catalog_content_identities
       WHERE content_kind = 'feat'`,
    )).toEqual({
      key_kind: 'asserted',
      content_key: fixture.featKey,
    });
  });

  it.each([
    ['wrong slug', 'expanded:content.species:not-closure-species'],
    ['wrong kind segment', 'expanded:content.background:closure-species'],
    ['wrong edition segment', '2024:content.species:closure-species'],
  ])('refuses a portable asserted key with a %s', async (_label, assertedKey) => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    ));
    const species = document.content.find((entry) => entry.kind === 'species');
    if (species === undefined) throw new Error('Species fixture is missing.');
    (species as { content_key: string }).content_key = assertedKey;

    const target = await database();
    expect(() => importCharacterBackup(target, document)).toThrow(
      /content_key does not match its aggregate kind, edition, and name/,
    );
  });

  it('CI5-CROSS-IMPORT-CONVERGENCE imports DB-A export into DB-B twice without duplicate content', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );
    const target = await database();

    importCharacterBackup(target, document);
    const afterFirst = target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    );
    importCharacterBackup(target, document);

    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual(afterFirst);
    expect(afterFirst).toEqual([
      { content_kind: 'background', content_key: fixture.backgroundKey },
      { content_kind: 'feat', content_key: fixture.featKey },
      { content_kind: 'species', content_key: fixture.speciesKey },
    ]);
    expect(target.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(2);
  });

  it('CI5-LIBRARY-SELECTED-SUBSET round-trips the selected creation and its lineage closure', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    source.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES ('feat', ?, ?, 'CI7-SUPERSESSION-SENTINEL')`,
      [fixture.featKey, fixture.unrelatedKey],
    );
    const document = exportSelectedLibraryContent(
      source,
      [fixture.speciesKey],
      exportedAt,
    );
    expect(document.selected_content_keys).toEqual([fixture.speciesKey]);
    expect(JSON.stringify(document)).toContain('CI7-SUPERSESSION-SENTINEL');
    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'feat:expanded:content.feat:unreferenced-feat',
      'species:expanded:content.species:closure-species',
    ]);

    const target = await database();
    importLibraryDocument(target, document);
    const reexported = exportSelectedLibraryContent(
      target,
      [fixture.speciesKey],
      exportedAt,
    );
    expect(reexported).toEqual({
      ...document,
      content: document.content.map((entry) => ({
        ...entry,
        provenance: { ...entry.provenance, received: true },
      })),
    });
    expect(target.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(0);
    expect(target.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key, recorded_at
       FROM catalog_content_supersessions`,
    )).toEqual([{
      content_kind: 'feat',
      superseded_content_key: fixture.featKey,
      successor_content_key: fixture.unrelatedKey,
      recorded_at: 'CI7-SUPERSESSION-SENTINEL',
    }]);
  });

  it('CI5-LIBRARY-WHOLE exports every installed external creation as a library document', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    source.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES ('feat', ?, ?, 'CI7-SUPERSESSION-SENTINEL')`,
      [fixture.featKey, fixture.unrelatedKey],
    );
    const document = exportWholeLibrary(source, exportedAt);

    expect(document.format).toBe('dnd-multiclass-spells/library');
    expect(document.version).toBe(3);
    expect(document.selection).toBe('all');
    expect(JSON.stringify(document)).toContain('CI7-SUPERSESSION-SENTINEL');
    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'feat:expanded:content.feat:unreferenced-feat',
      'species:expanded:content.species:closure-species',
      'background:expanded:content.background:closure-background',
    ]);
    const target = await database();
    importLibraryDocument(target, document);
    expect(target.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key, recorded_at
       FROM catalog_content_supersessions`,
    )).toEqual(document.supersessions);
  });

  it('plans a lineage-bearing authored library commit once and preserves the legacy imported-state bytes', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    source.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES ('feat', ?, ?, 'CI7-SUPERSESSION-SENTINEL')`,
      [fixture.featKey, fixture.unrelatedKey],
    );
    const document = exportWholeLibrary(source, exportedAt);
    const legacyTarget = await database();
    const legacyPreview = planLibraryImport(legacyTarget, document);
    const legacyCommitted = commitLibraryImportDoublePlanReference(
      legacyTarget,
      document,
      legacyPreview.token,
    );
    const legacyBytes = JSON.stringify(
      importedLibraryStateProjection(legacyTarget),
    );

    const target = await database();
    const preview = planLibraryImport(target, document);
    const countedPlanner = vi.fn<ContentImportPlanner>(planContentImport);

    const committed = commitLibraryImport(
      target,
      document,
      preview.token,
      Object.freeze({}),
      countedPlanner,
    );

    expect(legacyCommitted.kind).toBe('committed');
    expect(committed.kind).toBe('committed');
    expect(countedPlanner).toHaveBeenCalledOnce();
    expect(legacyBytes).toBe(legacyDoublePlanImportedState);
    expect(JSON.stringify(importedLibraryStateProjection(target))).toBe(legacyBytes);
  });

  it('HA12-LIBRARY-V1-FROZEN imports the pre-lineage library shape without inventing edges', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    source.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES ('feat', ?, ?, 'CI7-SUPERSESSION-SENTINEL')`,
      [fixture.featKey, fixture.unrelatedKey],
    );
    const previous = structuredClone(
      exportWholeLibrary(source, exportedAt),
    ) as unknown as Record<string, unknown>;
    previous.version = 1;
    delete previous.supersessions;
    previous.content = (previous.content as Array<Record<string, unknown>>)
      .map(({ provenance: _provenance, ...entry }) => entry);

    const target = await database();
    importLibraryDocument(target, previous);
    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual([
      { content_kind: 'background', content_key: fixture.backgroundKey },
      { content_kind: 'feat', content_key: fixture.featKey },
      { content_kind: 'feat', content_key: fixture.unrelatedKey },
      { content_kind: 'species', content_key: fixture.speciesKey },
    ]);
    expect(target.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual([]);
  });

  it('S6-12 imports a v2 library with absent attribution as received and unknown', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const previous = structuredClone(
      exportWholeLibrary(source, exportedAt),
    ) as unknown as Record<string, unknown>;
    previous.version = PRE_PROVENANCE_LIBRARY_EXPORT_VERSION;
    previous.content = (previous.content as Array<Record<string, unknown>>)
      .map(({ provenance: _provenance, ...entry }) => entry);

    const target = await database();
    importLibraryDocument(target, previous);
    expect(PRE_PROVENANCE_LIBRARY_EXPORT_VERSION).toBe(2);
    expect(target.oneRaw(
      `SELECT origin_kind, received, local_derivation, author_label
       FROM catalog_content_provenance
       WHERE content_kind = 'species' AND content_key = ?`,
      [fixture.speciesKey],
    )).toEqual({
      origin_kind: 'unknown',
      received: 1,
      local_derivation: 0,
      author_label: null,
    });
  });

  it('CI5-ITEM-DEFINITION round-trips attunement and the complete ability-override definition effect', async () => {
    const source = await database();
    new CatalogImporter(source).import({
      documents: [JSON.stringify([{
        kind: 'item',
        name: 'Giant Belt',
        edition: 'expanded',
        description: 'Raises strength while worn.',
        requiresAttunement: true,
        effects: [{
          kind: 'ability_override',
          ability: 'strength',
          maximum: 23,
          label: 'Giant strength',
          notes: 'Applies while worn.',
        }],
      }])],
    });
    const itemKey = 'expanded:content.item:giant-belt' as ContentKey;
    const document = exportSelectedLibraryContent(source, [itemKey], exportedAt);
    expect(manifestEnumeration(document)).toEqual([
      'item:expanded:content.item:giant-belt',
    ]);

    const target = await database();
    importLibraryDocument(target, document);
    expect(target.oneRaw(
      `SELECT name, description, requires_attunement
       FROM item_definitions WHERE content_key = ?`,
      [itemKey],
    )).toEqual({
      name: 'Giant Belt',
      description: 'Raises strength while worn.',
      requires_attunement: 1,
    });
    expect(target.allRaw(
      `SELECT sort_order, effect_kind, ability, maximum, label, notes
       FROM item_definition_effects
       WHERE item_definition_id = (
         SELECT id FROM item_definitions WHERE content_key = ?
       )`,
      [itemKey],
    )).toEqual([{
      sort_order: 1,
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Giant strength',
      notes: 'Applies while worn.',
    }]);
  });

  it('CI5-CHARACTER-ITEM-STATE remaps quantities, attunement slots, and ability overrides', async () => {
    const source = await database();
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Equipped Hero')",
    ).lastInsertId;
    const firstItemId = source.exec(
      `INSERT INTO character_items (character_id, name, quantity)
       VALUES (?, 'Potion', 3)`,
      [characterId],
    ).lastInsertId;
    const secondItemId = source.exec(
      `INSERT INTO character_items (character_id, name, quantity)
       VALUES (?, 'Giant Belt', 1)`,
      [characterId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_attunement_slots (
         character_id, slot_1_item_id, slot_2_item_id
       ) VALUES (?, ?, ?)`,
      [characterId, secondItemId, firstItemId],
    );
    source.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum, label
       ) VALUES (?, 1, 'ability_override', 'strength', 23, 'Giant strength')`,
      [characterId],
    );

    const target = await database();
    const imported = importCharacterBackup(
      target,
      exportCharacterBackup(source, characterId, exportedAt),
    );
    const items = target.allRaw(
      `SELECT id, name, quantity FROM character_items
       WHERE character_id = ? ORDER BY id`,
      [imported.characterId],
    );
    expect(items.map(({ name, quantity }) => ({ name, quantity }))).toEqual([
      { name: 'Potion', quantity: 3 },
      { name: 'Giant Belt', quantity: 1 },
    ]);
    expect(target.oneRaw(
      `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
       FROM character_attunement_slots WHERE character_id = ?`,
      [imported.characterId],
    )).toEqual({
      slot_1_item_id: items[1]!.id,
      slot_2_item_id: items[0]!.id,
      slot_3_item_id: null,
    });
    expect(target.oneRaw(
      `SELECT effect_kind, ability, maximum, label FROM character_effects
       WHERE character_id = ?`,
      [imported.characterId],
    )).toEqual({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Giant strength',
    });
  });

  it('CI5-V2-ABSENT-NOT-INVENTED imports carried v2 content without synthesizing a closure', async () => {
    const source = await database();
    const sourceCharacterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Historical Hero')",
    ).lastInsertId;
    const historical = structuredClone(
      exportCharacterBackup(source, sourceCharacterId, exportedAt),
    ) as unknown as Record<string, unknown>;
    historical.version = PRE_FLAVOR_CHARACTER_BACKUP_VERSION;
    historical.spell_definitions = emptyHistoricalSpellDefinitions();
    delete historical.content;
    delete historical.supersessions;
    const character = historical.character as Record<string, unknown>;
    delete character.alignment;
    delete character.appearance;
    delete character.backstory;
    delete character.archived_at;

    const target = await database();
    seedClosureLibrary(target);
    const before = target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    );
    const imported = importCharacterBackup(target, historical);

    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual(before);
    expect(target.oneRaw(
      'SELECT name, archived_at FROM characters WHERE id = ?',
      [imported.characterId],
    )).toEqual({ name: 'Historical Hero', archived_at: null });
  });

  it('CI5-V4-FROZEN imports the pre-content archived character shape through its adapter', async () => {
    const source = await database();
    const characterId = source.exec(
      `INSERT INTO characters (name, archived_at)
       VALUES ('V4 Hero', '2042-03-04T05:06:07.000Z')`,
    ).lastInsertId;
    const previous = structuredClone(
      exportCharacterBackup(source, characterId, exportedAt),
    ) as unknown as Record<string, unknown>;
    previous.version = PREVIOUS_CHARACTER_BACKUP_VERSION;
    previous.spell_definitions = emptyHistoricalSpellDefinitions();
    delete previous.content;
    delete previous.supersessions;

    const target = await database();
    const imported = importCharacterBackup(target, previous);
    expect(PREVIOUS_CHARACTER_BACKUP_VERSION).toBe(4);
    expect(target.oneRaw(
      'SELECT name, archived_at FROM characters WHERE id = ?',
      [imported.characterId],
    )).toEqual({
      name: 'V4 Hero',
      archived_at: '2042-03-04T05:06:07.000Z',
    });
  });

  it('HA12-CHARACTER-V5-FROZEN imports carried content without inventing lineage', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    source.exec(
      `INSERT INTO catalog_content_supersessions (
         content_kind, superseded_content_key, successor_content_key, recorded_at
       ) VALUES ('feat', ?, ?, 'CI7-SUPERSESSION-SENTINEL')`,
      [fixture.featKey, fixture.unrelatedKey],
    );
    const previous = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    )) as unknown as Record<string, unknown>;
    previous.version = PRE_LINEAGE_CHARACTER_BACKUP_VERSION;
    delete previous.supersessions;

    const target = await database();
    importCharacterBackup(target, previous);
    expect(PRE_LINEAGE_CHARACTER_BACKUP_VERSION).toBe(5);
    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual([
      { content_kind: 'background', content_key: fixture.backgroundKey },
      { content_kind: 'feat', content_key: fixture.featKey },
      { content_kind: 'feat', content_key: fixture.unrelatedKey },
      { content_kind: 'species', content_key: fixture.speciesKey },
    ]);
    expect(target.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions`,
    )).toEqual([]);
  });

  it('S6-12 imports a v6 character backup without inventing attribution', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const previous = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    )) as unknown as Record<string, unknown>;
    previous.version = PRE_PROVENANCE_CHARACTER_BACKUP_VERSION;
    previous.content = (previous.content as Array<Record<string, unknown>>)
      .map(({ provenance: _provenance, ...entry }) => entry);

    const target = await database();
    importCharacterBackup(target, previous);
    expect(PRE_PROVENANCE_CHARACTER_BACKUP_VERSION).toBe(6);
    expect(target.oneRaw(
      `SELECT origin_kind, received, local_derivation, author_label
       FROM catalog_content_provenance
       WHERE content_kind = 'background' AND content_key = ?`,
      [fixture.backgroundKey],
    )).toEqual({
      origin_kind: 'unknown',
      received: 1,
      local_derivation: 0,
      author_label: null,
    });
  });

  it('binds a character import plan token to the complete character payload', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const first = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );
    const swapped = structuredClone(first);
    (swapped.character as { name: string }).name = 'Swapped Character';

    const target = await database();
    const plan = planCharacterBackupImport(target, first);
    const committed = commitCharacterBackupImport(target, swapped, plan.token);

    expect(committed).toEqual(expect.objectContaining({ kind: 'stale-plan' }));
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(0);
  });

  it('CI5-ATOMIC refuses an unavailable character reference during planning without writes', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    ));
    const speciesReferences = document.references.species_definitions as unknown as Array<{
      id: number;
      content_key: string;
    }>;
    speciesReferences[0] = {
      ...speciesReferences[0]!,
      content_key: 'expanded:content.species:unavailable',
    };

    const target = await database();
    expect(() => planCharacterBackupImport(target, document)).toThrow(
      'Character backup requires unavailable active species_definitions content_key "expanded:content.species:unavailable".',
    );
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_fingerprints')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions')).toBe(0);
  });
});
