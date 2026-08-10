import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUNDLED_HOMEBREW_CATALOG,
  type BundledHomebrewCatalogEntry,
} from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import type { SubclassAuthoringDraft } from '../../../src/authoring/contracts';
import type { ContentKey } from '../../../src/domain/ids';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import {
  projectStoredAuthoredContentV1,
  storedAuthoredRegistryReferencesV1,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  CONTENT_FINGERPRINT_SCHEME_V2,
  CONTENT_FINGERPRINT_SCHEME_V1,
  deriveContentIdentityV2,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { eligibilityInvalidReasons } from '../../../src/eligibility/spell-selection-eligibility';
import { sha256 } from '../../../src/crypto/sha256';

const connections: Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  return db;
}

function spellStudent(): SubclassAuthoringDraft {
  const document = BUNDLED_HOMEBREW_CATALOG.find((entry) =>
    entry.catalog_key === 'spell-student')?.revisions[0];
  if (document?.kind !== 'subclass') throw new Error('Spell Student fixture is missing.');
  return document;
}

function spellStudentEntry(): BundledHomebrewCatalogEntry<SubclassAuthoringDraft> {
  const entry = BUNDLED_HOMEBREW_CATALOG.find((candidate) =>
    candidate.catalog_key === 'spell-student');
  if (entry === undefined) throw new Error('Spell Student catalog entry is missing.');
  return entry;
}

function installPortableOrigins(db: DatabaseContext): {
  readonly speciesKey: ContentKey;
  readonly successorSpeciesKey: ContentKey;
  readonly backgroundKey: ContentKey;
} {
  const importer = new CatalogImporter(db);
  importer.import({ documents: [JSON.stringify([{
    kind: 'feat',
    aggregate: { ...featProjectorV1Vector.aggregate, category: 'origin' },
  }])] });
  const featKey = 'expanded:content.feat:keen-memory' as ContentKey;
  const digest = db.scalar<string>(
    `SELECT fingerprint_digest FROM catalog_content_fingerprints
     WHERE content_kind = 'feat' AND content_key = ?
       AND fingerprint_role = 'current'`,
    [featKey],
  );
  if (digest === null) throw new Error('Portable origin feat fingerprint is missing.');
  const featReference = {
    kind: 'feat' as const,
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: digest as ContentFingerprintDigest,
  };
  const species = (name: string, referenceText: string) => ({
    kind: 'species',
    name,
    rules_edition: 'expanded',
    reference_text: referenceText,
    repeatable: false,
    creature_type: 'Chronal Being',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: 30,
    grants: [],
    traits: [{
      sort_order: 1,
      name: 'Temporal Step',
      description: 'Moves between adjacent moments.',
      effects: [],
    }],
  });
  importer.import({ documents: [JSON.stringify([
    { kind: 'species', aggregate: species('Portable Species', 'First edition.') },
    { kind: 'species', aggregate: species('Portable Species Revised', 'Successor edition.') },
    { kind: 'background', aggregate: {
      kind: 'background',
      name: 'Portable Background',
      rules_edition: 'expanded',
      reference_text: 'A complete authored background aggregate.',
      repeatable: false,
      grants: [],
      suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
      default_origin_feat_content_key: featKey,
      default_origin_feat: featReference,
      default_origin_feat_display_name: 'Keen Memory',
      skill_proficiencies: ['arcana', 'insight'],
      tool_reference_text: null,
      equipment_option_a_description: 'A journal.',
      equipment_option_b_description: 'A map.',
      equipment_option_a: [],
      equipment_option_b: [],
      effects: [],
    } },
  ])] });
  const speciesKey = 'expanded:content.species:portable-species' as ContentKey;
  const successorSpeciesKey =
    'expanded:content.species:portable-species-revised' as ContentKey;
  const backgroundKey =
    'expanded:content.background:portable-background' as ContentKey;
  db.exec(
    `INSERT INTO catalog_content_supersessions (
       content_kind, superseded_content_key, successor_content_key, recorded_at
     ) VALUES ('species', ?, ?, '2042-08-07T11:59:00.000Z')`,
    [speciesKey, successorSpeciesKey],
  );
  return { speciesKey, successorSpeciesKey, backgroundKey };
}

function catalogCensus(db: DatabaseContext) {
  return {
    identities: db.allRaw(
      'SELECT content_kind, content_key FROM catalog_content_identities ORDER BY content_kind, content_key',
    ),
    definitions: db.allRaw('SELECT id, content_key FROM subclass_definitions ORDER BY id'),
    progressions: db.allRaw(
      'SELECT id, subclass_definition_id, class_level FROM subclass_progressions ORDER BY id',
    ),
    features: db.allRaw(
      'SELECT id, subclass_definition_id, sort_order FROM subclass_features ORDER BY id',
    ),
    fingerprints: db.allRaw(
      `SELECT content_kind, content_key, fingerprint_scheme, fingerprint_digest, fingerprint_role
       FROM catalog_content_fingerprints
       ORDER BY content_kind, content_key, fingerprint_scheme, fingerprint_digest, fingerprint_role`,
    ),
    aliases: db.allRaw(
      `SELECT content_kind, alias_key, content_key, alias_kind
       FROM catalog_content_aliases ORDER BY content_kind, alias_key`,
    ),
    lineage: db.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key
       FROM catalog_content_supersessions ORDER BY content_kind, superseded_content_key`,
    ),
    drafts: db.allRaw(
      'SELECT draft_uuid, content_kind, revision FROM catalog_content_drafts ORDER BY draft_uuid',
    ),
  };
}

function applySubclass(db: DatabaseContext, contentKey: ContentKey, level: number): number {
  const definition = db.oneRaw(
    'SELECT id, class_definition_id FROM subclass_definitions WHERE content_key = ?',
    [contentKey],
  );
  if (definition === null) throw new Error('Installed subclass definition is missing.');
  const characterId = db.exec("INSERT INTO characters (name) VALUES ('Bundled Subclass Adept')")
    .lastInsertId;
  const classId = Number(definition.class_definition_id);
  const subclassId = Number(definition.id);
  const update = () => new UpdateClassCommand(
    db,
    { type: 'update_class', class_definition_id: classId, subclass_definition_id: subclassId },
    new CharacterCommandIntegrity('bundled-barbed-court-apply'),
  ).apply(characterId);
  update();
  raiseClassLevelForTest(db, characterId, classId, level);
  update();
  return characterId;
}

describe('bundled authored-kind installer', () => {
  it('publishes all three entries atomically through drafts and is an exact-fingerprint no-op on repeat', async () => {
    // Measured alone at 4.62s; 20s retains contention headroom.
    const db = await database();
    const beforeRoots = db.scalar<number>(
      "SELECT count(*) FROM catalog_content_identities WHERE catalog_layer = 'external'",
    );
    const firstPlan = planBundledHomebrewInstall(db);
    const previousCatalog = BUNDLED_HOMEBREW_CATALOG.map((entry) =>
      entry.catalog_key === 'spell-student'
        ? Object.freeze({
            ...entry,
            revisions: Object.freeze([entry.revisions[0]] as const),
          })
        : entry);
    expect(sha256(canonicalJson(previousCatalog))).toBe(
      '8d36536109be8768e2c274958b1ee9eb70a74cb37a988c7f27e88eebb0d8d84a',
    );
    expect(firstPlan.inputHash).toBe(
      '50209f767a55af8331a6ea0397f9ca28023ef1fbd173a5d1045c6277277cf3f4',
    );

    expect(firstPlan.entries.map((entry) => [entry.name, entry.outcome, entry.error])).toEqual([
      ['Veteran', 'create', null],
      ['Warrior of the Barbed Court', 'create', null],
      ['Spell Student', 'create', null],
    ]);
    expect(commitBundledHomebrewInstall(db, firstPlan.token)).toMatchObject({
      kind: 'committed',
      outcomes: [{ kind: 'create' }, { kind: 'create' }, { kind: 'create' }],
    });
    expect(db.scalar<number>("SELECT count(*) FROM catalog_content_identities WHERE catalog_layer = 'external'"))
      .toBe((beforeRoots ?? 0) + 4);
    expect(db.allRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions WHERE content_kind = 'subclass'`,
    )).toEqual([{
      superseded_content_key: '2024:content.subclass:spell-student',
      successor_content_key: '2024:content.subclass:spell-student-bundled-revision-2',
    }]);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);

    const rootsAfterFirst = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');
    const secondPlan = planBundledHomebrewInstall(db);
    expect(secondPlan.entries.map((entry) => entry.outcome)).toEqual([
      'matched_existing', 'matched_existing', 'matched_existing',
    ]);
    expect(commitBundledHomebrewInstall(db, secondPlan.token)).toMatchObject({
      kind: 'committed',
      outcomes: [{ kind: 'match' }, { kind: 'match' }, { kind: 'match' }],
    });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(rootsAfterFirst);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_supersessions')).toBe(1);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);
  }, 20_000);

  it('publishes and applies Barbed Court as a Wisdom third-caster with its curated grants', async () => {
    const db = await database();
    const plan = planBundledHomebrewInstall(db);
    const installed = commitBundledHomebrewInstall(db, plan.token);
    if (installed.kind !== 'committed') throw new Error('Bundled catalog install failed.');
    const outcome = installed.outcomes.find((candidate) =>
      candidate.id === 'subclass:bundled:warrior-of-the-barbed-court');
    if (outcome === undefined || outcome.kind === 'refused' || outcome.kind === 'review') {
      throw new Error('Barbed Court install outcome is missing.');
    }
    const characterId = applySubclass(db, outcome.contentKey, 7);
    const report = new BuildReportBuilder(db).build(characterId);
    expect(report.classes[0]).toMatchObject({
      name: 'Monk',
      subclass: 'Warrior of the Barbed Court',
      class_level: 7,
      spellcasting_ability: 'wisdom',
      progression_type: 'third_down',
    });
    expect(db.allRaw(
      `SELECT class_level FROM subclass_progressions
       WHERE subclass_definition_id = ? ORDER BY class_level`,
      [db.scalar<number>(
        'SELECT id FROM subclass_definitions WHERE content_key = ?',
        [outcome.contentKey],
      )],
    ).map((row) => Number(row.class_level))).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new SpellAccessBuilder(db).buildForCharacter(characterId).map((spell) => ({
      name: spell.spell_name,
      ability: spell.spellcasting_ability,
      alwaysPrepared: spell.always_prepared,
    }))).toEqual(expect.arrayContaining([
      { name: 'Bane', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Command', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Dissonant Whispers', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Hideous Laughter', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Enthrall', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Suggestion', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Prestidigitation', ability: 'wisdom', alwaysPrepared: true },
      { name: 'Vicious Mockery', ability: 'wisdom', alwaysPrepared: true },
    ]));
  }, 20_000);

  it('applies Spell Student through the publisher with its derived level-7 slots', async () => {
    const db = await database();
    const plan = planBundledHomebrewInstall(db);
    const installed = commitBundledHomebrewInstall(db, plan.token);
    if (installed.kind !== 'committed') throw new Error('Bundled catalog install failed.');
    const outcome = installed.outcomes.find((candidate) =>
      candidate.id === 'subclass:bundled:spell-student');
    if (outcome === undefined || outcome.kind === 'refused' || outcome.kind === 'review') {
      throw new Error('Spell Student install outcome is missing.');
    }
    const characterId = applySubclass(db, outcome.contentKey, 7);

    expect(new BuildReportBuilder(db).build(characterId).caster.slots)
      .toEqual([{ level: 1, count: 3 }]);
  }, 20_000);

  it('supersedes Spell Student v1 without retargeting its user and pins both identity schemes', async () => {
    // Measured alone at 2.27s; 20s retains contention headroom.
    const db = await database();
    const entry = spellStudentEntry();
    const first = entry.revisions[0];
    const revised = entry.revisions[1];
    if (first === undefined || revised === undefined) {
      throw new Error('Spell Student requires reviewed v1 and v2 revisions.');
    }
    const v1 = Object.freeze([Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const v2 = Object.freeze([Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first, revised] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const initial = planBundledHomebrewInstall(db, v1);
    const initialCommit = commitBundledHomebrewInstall(db, initial.token, v1);
    if (initialCommit.kind !== 'committed') throw new Error('Initial catalog install failed.');
    const oldKey = initialCommit.outcomes[0];
    if (oldKey?.kind !== 'create') throw new Error('Initial catalog root was not created.');
    const oldCharacterId = applySubclass(db, oldKey.contentKey, 3);
    const oldSpellsSlot = db.oneRaw(
      `SELECT id, spell_level_min, spell_level_max
       FROM spell_selection_slots
       WHERE character_id = ? AND rule_key = 'spell-student-spells'`,
      [oldCharacterId],
    );
    expect(oldSpellsSlot).toMatchObject({ spell_level_min: 0, spell_level_max: 1 });
    if (oldSpellsSlot === null) throw new Error('Spell Student v1 spell slot is missing.');
    const mageHandId = db.scalar<number>(
      "SELECT id FROM spell_versions WHERE display_name = 'Mage Hand' AND rules_edition = '2024'",
    );
    const shieldId = db.scalar<number>(
      "SELECT id FROM spell_versions WHERE display_name = 'Shield' AND rules_edition = '2024'",
    );
    if (mageHandId === null || shieldId === null) throw new Error('Seeded spell fixtures are missing.');
    new SpellSelectionService(db).select(Number(oldSpellsSlot.id), mageHandId);

    const successorPlan = planBundledHomebrewInstall(db, v2);
    expect(successorPlan.entries).toEqual([
      expect.objectContaining({ catalog_key: 'spell-student', outcome: 'successor' }),
    ]);
    const successor = commitBundledHomebrewInstall(db, successorPlan.token, v2);
    if (successor.kind !== 'committed') throw new Error('Successor catalog install failed.');
    const newKey = successor.outcomes[0];
    if (newKey?.kind !== 'create') throw new Error('Successor catalog root was not created.');

    expect(newKey.contentKey).not.toBe(oldKey.contentKey);
    expect(db.oneRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions WHERE content_kind = 'subclass'`,
    )).toEqual({
      superseded_content_key: oldKey.contentKey,
      successor_content_key: newKey.contentKey,
    });
    expect(db.scalar<number>(
      `SELECT count(*) FROM subclass_definitions WHERE name LIKE 'Spell Student%'`,
    )).toBe(2);
    expect(db.oneRaw(
      `SELECT slot.current_spell_version_id, slot.spell_level_min, slot.spell_level_max
       FROM spell_selection_slots AS slot WHERE slot.id = ?`,
      [oldSpellsSlot.id],
    )).toEqual({
      current_spell_version_id: mageHandId,
      spell_level_min: 0,
      spell_level_max: 1,
    });

    const newCharacterId = applySubclass(db, newKey.contentKey, 3);
    const correctedSlots = db.allRaw(
      `SELECT id, rule_key, spell_level_min, spell_level_max
       FROM spell_selection_slots
       WHERE character_id = ? AND rule_key LIKE 'spell-student-%'
       ORDER BY rule_key`,
      [newCharacterId],
    );
    expect(correctedSlots).toEqual([{
      id: expect.any(Number),
      rule_key: 'spell-student-cantrips',
      spell_level_min: 0,
      spell_level_max: 0,
    }, {
      id: expect.any(Number),
      rule_key: 'spell-student-spells',
      spell_level_min: 1,
      spell_level_max: 1,
    }]);
    const selection = new SpellSelectionService(db);
    selection.select(Number(correctedSlots[0]!.id), mageHandId);
    expect(() => selection.select(Number(correctedSlots[0]!.id), shieldId))
      .toThrow(eligibilityInvalidReasons.level);
    expect(() => selection.select(Number(correctedSlots[1]!.id), mageHandId))
      .toThrow(eligibilityInvalidReasons.level);
    selection.select(Number(correctedSlots[1]!.id), shieldId);

    const fingerprints = db.allRaw(
      `SELECT content_key, fingerprint_scheme, fingerprint_digest, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'subclass'
         AND content_key LIKE '2024:content.subclass:spell-student%'
       ORDER BY content_key`,
    );
    expect(fingerprints).toEqual([{
      content_key: oldKey.contentKey,
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      fingerprint_digest: '1eca3febf290f1bb99d1571828ce1d30963e7cb619a1e4af5efce94f5a4236a9',
      fingerprint_role: 'current',
    }, {
      content_key: newKey.contentKey,
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V1,
      fingerprint_digest: 'e8cf1b0c1f39a06acd0df650b41f13856a1dc359c015d3616209e2a3e9644e8f',
      fingerprint_role: 'current',
    }]);
    expect([oldKey.contentKey, newKey.contentKey].map((contentKey) => {
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'subclass',
        contentKey,
        references: storedAuthoredRegistryReferencesV1(db),
      });
      return {
        scheme: CONTENT_FINGERPRINT_SCHEME_V2,
        digest: deriveContentIdentityV2({
          kind: projection.kind,
          edition: projection.aggregate.rules_edition,
          name: projection.aggregate.name,
          payload: projection.payload,
        }).digest,
      };
    })).toEqual([{
      scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      digest: 'ef0d5a588129272fc485ab263296c12ebbd48b7c04fe5e4928015cee1bbad1db',
    }, {
      scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      digest: 'de2a49b86876c71019e9261d94ca47179c120014dac828c6cb1d9b4e4606c4d7',
    }]);
    const repeated = planBundledHomebrewInstall(db, v2);
    expect(repeated.entries[0]?.outcome).toBe('matched_existing');
    expect(commitBundledHomebrewInstall(db, repeated.token, v2)).toMatchObject({
      kind: 'committed', outcomes: [{ kind: 'match', contentKey: newKey.contentKey }],
    });
  }, 20_000);

  it('rolls back every captured catalog row when a later entry fails only during commit', async () => {
    const db = await database();
    const before = catalogCensus(db);
    const catalog = Object.freeze([
      BUNDLED_HOMEBREW_CATALOG[0],
      BUNDLED_HOMEBREW_CATALOG[2],
    ] as const satisfies readonly BundledHomebrewCatalogEntry[]);

    const plan = planBundledHomebrewInstall(db, catalog);
    expect(plan.entries.map((entry) => entry.outcome)).toEqual(['create', 'create']);
    let spellStudentInsertions = 0;
    connections.at(-1)?.createFunction('bundled_commit_probe', () => {
      spellStudentInsertions += 1;
      if (spellStudentInsertions >= 7) throw new Error('Injected commit-only failure.');
      return null;
    });
    db.exec(
      `CREATE TEMP TRIGGER bundled_commit_only_failure
       BEFORE INSERT ON subclass_definitions
       WHEN NEW.name = 'Spell Student'
       BEGIN SELECT bundled_commit_probe(); END`,
    );
    expect(commitBundledHomebrewInstall(db, plan.token, catalog)).toEqual({
      kind: 'refused',
      reason: 'commit_failed',
      outcomes: plan.outcomes,
    });
    expect(spellStudentInsertions).toBeGreaterThanOrEqual(7);
    expect(catalogCensus(db)).toEqual(before);
  }, 20_000);

  it('refuses an unregistered same-key root without leaving any staged draft or partial catalog write', async () => {
    const db = await database();
    const first = spellStudent();
    const unrelated: SubclassAuthoringDraft = {
      ...first,
      reference_text: 'Unrelated user-authored bytes under the same asserted key.',
    };
    const unrelatedCatalog = Object.freeze([Object.freeze({
      catalog_key: 'unrelated',
      revisions: Object.freeze([unrelated] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const unrelatedPlan = planBundledHomebrewInstall(db, unrelatedCatalog);
    expect(commitBundledHomebrewInstall(db, unrelatedPlan.token, unrelatedCatalog).kind).toBe('committed');
    const roots = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');

    const refused = planBundledHomebrewInstall(db, [Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })]);
    expect(refused.outcomes).toEqual([
      expect.objectContaining({ kind: 'refused', reason: 'install_refused' }),
    ]);
    expect(refused.entries).toEqual([{
      catalog_key: 'spell-student',
      kind: 'subclass',
      name: 'Spell Student',
      outcome: 'refused',
      error: 'Installed content at "2024:content.subclass:spell-student" is not a registered revision of bundled entry "spell-student".',
    }]);
    expect(commitBundledHomebrewInstall(db, refused.token, [Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })])).toMatchObject({ kind: 'refused', reason: 'entry_refused' });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(roots);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);
  }, 20_000);

  it('round-trips all three authored kinds, lineage, and their dependent character through full export', async () => {
    // Measured alone at 2.56s; 20s retains contention headroom.
    const source = await database();
    const plan = planBundledHomebrewInstall(source);
    const installed = commitBundledHomebrewInstall(source, plan.token);
    if (installed.kind !== 'committed') throw new Error('Bundled catalog install failed.');
    const barbedCourt = installed.outcomes.find((outcome) =>
      outcome.id === 'subclass:bundled:warrior-of-the-barbed-court');
    if (barbedCourt === undefined || barbedCourt.kind === 'refused' || barbedCourt.kind === 'review') {
      throw new Error('Barbed Court install outcome is missing.');
    }
    const definition = source.oneRaw(
      `SELECT id, class_definition_id FROM subclass_definitions WHERE content_key = ?`,
      [barbedCourt.contentKey],
    );
    if (definition === null) throw new Error('Barbed Court definition is missing.');
    const origins = installPortableOrigins(source);
    const characterId = applySubclass(source, barbedCourt.contentKey, 9);
    const speciesId = source.scalar<number>(
      'SELECT id FROM species_definitions WHERE content_key = ?',
      [origins.speciesKey],
    );
    const backgroundId = source.scalar<number>(
      'SELECT id FROM background_definitions WHERE content_key = ?',
      [origins.backgroundKey],
    );
    if (speciesId === null || backgroundId === null) {
      throw new Error('Portable authored origin definitions are missing.');
    }
    source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name
       ) VALUES
         (?, 'portable-species-source', 'species', ?, 'Portable Species'),
         (?, 'portable-background-source', 'background', ?, 'Portable Background')`,
      [characterId, speciesId, characterId, backgroundId],
    );

    const backup = exportCharacterBackup(
      source,
      characterId,
      '2042-08-07T12:00:00.000Z',
    );
    expect(backup.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'subclass',
        content_key: barbedCourt.contentKey,
        aggregate: expect.objectContaining({ name: 'Warrior of the Barbed Court' }),
      }),
      expect.objectContaining({
        kind: 'species',
        content_key: origins.speciesKey,
        aggregate: expect.objectContaining({ name: 'Portable Species' }),
      }),
      expect.objectContaining({
        kind: 'species',
        content_key: origins.successorSpeciesKey,
        aggregate: expect.objectContaining({ name: 'Portable Species Revised' }),
      }),
      expect.objectContaining({
        kind: 'background',
        content_key: origins.backgroundKey,
        aggregate: expect.objectContaining({ name: 'Portable Background' }),
      }),
    ]));
    expect(backup.supersessions).toEqual([{
      content_kind: 'species',
      superseded_content_key: origins.speciesKey,
      successor_content_key: origins.successorSpeciesKey,
      recorded_at: '2042-08-07T11:59:00.000Z',
    }]);
    const sourceProjection = projectStoredAuthoredContentV1(source, {
      kind: 'subclass',
      contentKey: barbedCourt.contentKey,
      references: storedAuthoredRegistryReferencesV1(source),
    });
    const sourceAggregate = sourceProjection.aggregate;
    const sourceSpecies = projectStoredAuthoredContentV1(source, {
      kind: 'species',
      contentKey: origins.speciesKey,
      references: storedAuthoredRegistryReferencesV1(source),
    });
    const sourceBackground = projectStoredAuthoredContentV1(source, {
      kind: 'background',
      contentKey: origins.backgroundKey,
      references: storedAuthoredRegistryReferencesV1(source),
    });

    const target = await database();
    const imported = importCharacterBackup(target, backup);
    const importedDefinition = target.oneRaw(
      `SELECT subclass.name, subclass.content_key, identity.catalog_layer
       FROM character_class_levels AS level
       JOIN subclass_definitions AS subclass ON subclass.id = level.subclass_definition_id
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass' AND identity.content_key = subclass.content_key
      WHERE level.character_id = ?`,
      [imported.characterId],
    );
    expect(importedDefinition).toMatchObject({
      name: 'Warrior of the Barbed Court', catalog_layer: 'external',
    });
    expect(target.allRaw(
      `SELECT source.source_type, identity.content_key, identity.catalog_layer
       FROM character_source_instances AS source
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = source.source_type
        AND identity.content_key = CASE source.source_type
          WHEN 'species' THEN (
            SELECT content_key FROM species_definitions WHERE id = source.source_definition_id
          )
          WHEN 'background' THEN (
            SELECT content_key FROM background_definitions WHERE id = source.source_definition_id
          )
        END
       WHERE source.character_id = ?
         AND source.source_type IN ('species', 'background')
       ORDER BY source.source_type`,
      [imported.characterId],
    )).toEqual([
      {
        source_type: 'background',
        content_key: origins.backgroundKey,
        catalog_layer: 'external',
      },
      {
        source_type: 'species',
        content_key: origins.speciesKey,
        catalog_layer: 'external',
      },
    ]);
    expect(target.allRaw(
      `SELECT content_kind, superseded_content_key, successor_content_key, recorded_at
       FROM catalog_content_supersessions`,
    )).toEqual(backup.supersessions);
    if (importedDefinition === null) throw new Error('Imported Barbed Court is missing.');
    const destinationProjection = projectStoredAuthoredContentV1(target, {
      kind: 'subclass',
      contentKey: String(importedDefinition.content_key) as ContentKey,
      references: storedAuthoredRegistryReferencesV1(target),
    });
    const destinationAggregate = destinationProjection.aggregate;
    expect(destinationProjection.kind).toBe(sourceProjection.kind);
    expect(destinationAggregate.rules_edition).toBe(sourceAggregate.rules_edition);
    expect(destinationAggregate.name).toBe(sourceAggregate.name);
    expect(destinationProjection.payload).toEqual(sourceProjection.payload);
    expect(destinationAggregate.reference_text).toBe(sourceAggregate.reference_text);
    expect(destinationAggregate.progression).toEqual(sourceAggregate.progression);
    if (
      destinationAggregate.progression.mode !== 'override' ||
      sourceAggregate.progression.mode !== 'override'
    ) {
      throw new Error('Barbed Court round-trip requires dense progressions.');
    }
    expect(destinationAggregate.progression.rows.map((row) => row.slot_counts))
      .toEqual(sourceAggregate.progression.rows.map((row) => row.slot_counts));
    expect(destinationAggregate.progression.rows.map((row) => row.grants))
      .toEqual(sourceAggregate.progression.rows.map((row) => row.grants));
    expect(destinationAggregate.features).toEqual(sourceAggregate.features);
    expect(destinationAggregate.grants).toEqual(sourceAggregate.grants);
    expect(destinationAggregate).toEqual(sourceAggregate);
    expect(projectStoredAuthoredContentV1(target, {
      kind: 'species',
      contentKey: origins.speciesKey,
      references: storedAuthoredRegistryReferencesV1(target),
    })).toEqual(sourceSpecies);
    expect(projectStoredAuthoredContentV1(target, {
      kind: 'background',
      contentKey: origins.backgroundKey,
      references: storedAuthoredRegistryReferencesV1(target),
    })).toEqual(sourceBackground);
  }, 20_000);
});
