import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  commitCharacterBackupImport,
  importCharacterBackup,
  planCharacterBackupImport,
  type CharacterBackupSpellDefinitions,
} from '../../../src/backup/character-backup';
import { PRE_FLAVOR_CHARACTER_BACKUP_VERSION } from '../../../src/backup/backup-version';
import { DatabaseContext } from '../../../src/db/database';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { registerContentFingerprint } from '../../../src/catalog/content-registry';
import { projectStoredContentV1 } from '../../../src/catalog/stored-content-projector-v1';
import { SPELL_DEFINITION_TABLES } from '../../../src/domain/contracts/tables';
import type { ContentKey } from '../../../src/domain/ids';
import { openTestDatabase } from '../../helpers/open-db';

const opened: Database[] = [];
const timestamp = '2026-07-28 09:15:00';

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

interface SeededSpell {
  readonly identityId: number;
  readonly versionId: number;
  readonly characterId: number;
}

function seedReferencedSpell(
  db: DatabaseContext,
  provenance: 'user' | 'import' | 'srd',
  contentKey: string,
  displayName: string,
  forkedFromContentKey: string | null,
): SeededSpell {
  const identityId = db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name, notes, created_at, updated_at
     ) VALUES (?, ?, ?, 'identity note', ?, ?)`,
    [
      `identity:${contentKey}`,
      `${displayName} Canonical`,
      displayName.toLowerCase(),
      timestamp,
      timestamp,
    ],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_identity_aliases (
       spell_identity_id, alias, normalized_alias, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?)`,
    [
      identityId,
      `${displayName} Alias`,
      `${displayName.toLowerCase()} alias`,
      timestamp,
      timestamp,
    ],
  );
  db.exec(
    `INSERT INTO catalog_content_identities (
       content_key, content_kind, key_kind, catalog_layer, normalized_name
     ) VALUES (?, 'spell', ?, ?, ?)`,
    [
      contentKey,
      provenance === 'srd' ? 'bundled-stable' : 'asserted',
      provenance === 'srd' ? 'bundled' : 'external',
      displayName.toLowerCase(),
    ],
  );
  const versionId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, ritual, concentration, casting_time, action_type, range,
       range_kind, range_feet, area_shape, area_feet, duration, components,
       material_component_summary, material_cost_copper, material_cost_kind,
       healing, short_summary, upcast_summary, cantrip_upgrade_summary,
       requires_mod_for_effect, effect_reliability_category, provenance,
       seed_version, is_active, created_at, updated_at, forked_from_content_key
     ) VALUES (
       ?, ?, ?, '2024', 3, 'Chronomancy', 1, 1, '1 reaction', 'Reaction',
       '90 feet', 'ranged', 90, NULL, NULL, 'Concentration, up to 1 minute',
       'V, S, M (a silver hourglass worth 25+ GP)',
       'a silver hourglass worth 25+ GP', 2500, 'minimum', 0,
       'Complete short summary.', 'Complete upcast summary.',
       'Complete cantrip upgrade summary.', 1, 'mixed', ?, 'seed-17', 1,
       ?, ?, ?
     )`,
    [
      contentKey,
      identityId,
      displayName,
      provenance,
      timestamp,
      timestamp,
      forkedFromContentKey,
    ],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_version_publications (
       spell_version_id, source_book, source_page, source_reference,
       created_at, updated_at
     ) VALUES (?, 'Homebrew Grimoire', 47, 'chapter-seven', ?, ?)`,
    [versionId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO spell_list_memberships (
       spell_version_id, spell_list_key, created_at, updated_at
     ) VALUES (?, 'Wizard', ?, ?)`,
    [versionId, timestamp, timestamp],
  );
  db.exec(
    `INSERT INTO spell_version_tags (spell_version_id, tag)
     VALUES (?, 'time')`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_damage_types (spell_version_id, damage_type)
     VALUES (?, 'Temporal')`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_conditions (spell_version_id, condition_type)
     VALUES (?, 'Aged')`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_attack_modes (spell_version_id, attack_mode)
     VALUES (?, 'ranged_spell')`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_save_abilities (spell_version_id, save_ability)
     VALUES (?, 'wisdom')`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_upcast_levels (spell_version_id, level)
     VALUES (?, 4)`,
    [versionId],
  );
  db.exec(
    `INSERT INTO spell_version_cantrip_upgrade_levels
       (spell_version_id, level)
     VALUES (?, 5)`,
    [versionId],
  );
  const stored = projectStoredContentV1(db, 'spell', contentKey as ContentKey);
  const fingerprint = deriveContentIdentityV1(stored);
  registerContentFingerprint(db, {
    kind: 'spell',
    contentKey: contentKey as ContentKey,
    scheme: fingerprint.envelope.scheme,
    digest: fingerprint.digest,
    canonicalJson: fingerprint.canonicalJson,
    role: 'current',
  });
  const characterId = db.exec(
    `INSERT INTO characters (name, notes, created_at, updated_at)
     VALUES (?, 'portable character', ?, ?)`,
    [`${displayName} User`, timestamp, timestamp],
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_spell_preferences (
       character_id, spell_version_id, favourite, notes, created_at, updated_at
     ) VALUES (?, ?, 1, 'portable preference', ?, ?)`,
    [characterId, versionId, timestamp, timestamp],
  );
  return { identityId, versionId, characterId };
}

function expectedDefinitions(
  provenance: 'user' | 'import',
  contentKey: string,
  displayName: string,
  forkedFromContentKey: string | null,
): CharacterBackupSpellDefinitions {
  return {
    spell_identities: [
      {
        id: 1,
        content_key: `identity:${contentKey}`,
        canonical_name: `${displayName} Canonical`,
        normalized_name: displayName.toLowerCase(),
        notes: 'identity note',
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    spell_identity_aliases: [
      {
        id: 1,
        spell_identity_id: 1,
        alias: `${displayName} Alias`,
        normalized_alias: `${displayName.toLowerCase()} alias`,
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    spell_versions: [
      {
        id: 1,
        content_key: contentKey,
        spell_identity_id: 1,
        display_name: displayName,
        rules_edition: '2024',
        level: 3,
        school: 'Chronomancy',
        ritual: 1,
        concentration: 1,
        casting_time: '1 reaction',
        action_type: 'Reaction',
        range: '90 feet',
        range_kind: 'ranged',
        range_feet: 90,
        area_shape: null,
        area_feet: null,
        duration: 'Concentration, up to 1 minute',
        components: 'V, S, M (a silver hourglass worth 25+ GP)',
        material_component_summary: 'a silver hourglass worth 25+ GP',
        material_cost_copper: 2500,
        material_cost_kind: 'minimum',
        healing: 0,
        short_summary: 'Complete short summary.',
        upcast_summary: 'Complete upcast summary.',
        cantrip_upgrade_summary: 'Complete cantrip upgrade summary.',
        requires_mod_for_effect: 1,
        effect_reliability_category: 'mixed',
        provenance,
        seed_version: 'seed-17',
        is_active: 1,
        created_at: timestamp,
        updated_at: timestamp,
        forked_from_content_key: forkedFromContentKey,
      },
    ],
    spell_version_publications: [
      {
        id: 1,
        spell_version_id: 1,
        source_book: 'Homebrew Grimoire',
        source_page: 47,
        source_reference: 'chapter-seven',
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    spell_list_memberships: [
      {
        id: 1,
        spell_version_id: 1,
        spell_list_key: 'Wizard',
        created_at: timestamp,
        updated_at: timestamp,
      },
    ],
    spell_version_tags: [{ id: 1, spell_version_id: 1, tag: 'time' }],
    spell_version_damage_types: [
      { id: 1, spell_version_id: 1, damage_type: 'Temporal' },
    ],
    spell_version_conditions: [
      { id: 1, spell_version_id: 1, condition_type: 'Aged' },
    ],
    spell_version_attack_modes: [
      { id: 1, spell_version_id: 1, attack_mode: 'ranged_spell' },
    ],
    spell_version_save_abilities: [
      { id: 1, spell_version_id: 1, save_ability: 'wisdom' },
    ],
    spell_version_upcast_levels: [
      { id: 1, spell_version_id: 1, level: 4 },
    ],
    spell_version_cantrip_upgrade_levels: [
      { id: 1, spell_version_id: 1, level: 5 },
    ],
  };
}

function storedDefinitions(db: DatabaseContext): CharacterBackupSpellDefinitions {
  return Object.fromEntries(
    SPELL_DEFINITION_TABLES.map((table) => [
      table,
      db.allRaw(`SELECT * FROM "${table}" ORDER BY id`),
    ]),
  ) as unknown as CharacterBackupSpellDefinitions;
}

function refreshSpellFingerprint(db: DatabaseContext, contentKey: string): void {
  db.exec(
    `DELETE FROM catalog_content_fingerprints
     WHERE content_kind = 'spell' AND content_key = ?`,
    [contentKey],
  );
  const stored = projectStoredContentV1(db, 'spell', contentKey as ContentKey);
  const fingerprint = deriveContentIdentityV1(stored);
  registerContentFingerprint(db, {
    kind: 'spell',
    contentKey: contentKey as ContentKey,
    scheme: fingerprint.envelope.scheme,
    digest: fingerprint.digest,
    canonicalJson: fingerprint.canonicalJson,
    role: 'current',
  });
}

afterEach(() => {
  for (const connection of opened.splice(0)) {
    if (connection.isOpen()) {
      connection.close();
    }
  }
});

describe('portable character backup user-authored spells', () => {
  it('CI5-V2-ABSENT-NOT-INVENTED imports only the spell definition carried by a v2 document', async () => {
    const source = await database();
    const contentKey = '2024:local.dnd-wt:historical-hour';
    const displayName = 'Historical Hour';
    const seeded = seedReferencedSpell(
      source,
      'user',
      contentKey,
      displayName,
      null,
    );
    const historical = structuredClone(
      exportCharacterBackup(source, seeded.characterId),
    ) as unknown as Record<string, unknown>;
    historical.version = PRE_FLAVOR_CHARACTER_BACKUP_VERSION;
    historical.spell_definitions = expectedDefinitions(
      'user',
      contentKey,
      displayName,
      null,
    );
    delete historical.content;
    const character = historical.character as Record<string, unknown>;
    delete character.alignment;
    delete character.appearance;
    delete character.backstory;
    delete character.archived_at;

    const target = await database();
    const imported = importCharacterBackup(target, historical);

    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual([{ content_kind: 'spell', content_key: contentKey }]);
    expect(storedDefinitions(target)).toEqual(
      expectedDefinitions('user', contentKey, displayName, null),
    );
    expect(target.scalar(
      `SELECT spell_version_id FROM character_spell_preferences
       WHERE character_id = ?`,
      [imported.characterId],
    )).toBe(1);
  });

  it.each([
    {
      label: 'fork',
      provenance: 'user' as const,
      contentKey: '2024:local.dnd-wt:forked-hour',
      displayName: 'Forked Hour',
      ancestry: '2024:time-stop',
    },
    {
      label: 'imported homebrew',
      provenance: 'import' as const,
      contentKey: '2024:homebrew.example:borrowed-hour',
      displayName: 'Borrowed Hour',
      ancestry: null,
    },
  ])(
    'round-trips a $label with every identity, version, and pivot field',
    async ({ provenance, contentKey, displayName, ancestry }) => {
      const source = await database();
      const seeded = seedReferencedSpell(
        source,
        provenance,
        contentKey,
        displayName,
        ancestry,
      );
      const document = exportCharacterBackup(
        source,
        seeded.characterId,
        '2026-07-28T13:15:00.000Z',
      );
      expect(document.content.map((entry) => [entry.kind, entry.content_key])).toEqual([
        ['spell', contentKey],
      ]);
      const sourceProjection = projectStoredContentV1(
        source,
        'spell',
        contentKey as ContentKey,
      );
      expect(document.content[0]?.spell_identity).toEqual({
        canonical_name: `${displayName} Canonical`,
        normalized_name: displayName.toLowerCase(),
        aliases: [{
          alias: `${displayName} Alias`,
          normalized_alias: `${displayName.toLowerCase()} alias`,
        }],
      });

      const target = await database();
      const imported = importCharacterBackup(target, document);
      expect(projectStoredContentV1(
        target,
        'spell',
        contentKey as ContentKey,
      )).toEqual(sourceProjection);
      expect(target.oneRaw(
        `SELECT identity.canonical_name, identity.normalized_name
         FROM spell_identities AS identity
         JOIN spell_versions AS version
           ON version.spell_identity_id = identity.id
         WHERE version.content_key = ?`,
        [contentKey],
      )).toEqual({
        canonical_name: `${displayName} Canonical`,
        normalized_name: displayName.toLowerCase(),
      });
      expect(target.allRaw(
        `SELECT alias.alias, alias.normalized_alias
         FROM spell_identity_aliases AS alias
         JOIN spell_identities AS identity
           ON identity.id = alias.spell_identity_id
         JOIN spell_versions AS version
           ON version.spell_identity_id = identity.id
         WHERE version.content_key = ?
         ORDER BY alias.normalized_alias`,
        [contentKey],
      )).toEqual([{
        alias: `${displayName} Alias`,
        normalized_alias: `${displayName.toLowerCase()} alias`,
      }]);
      expect(
        target.oneRaw(
          `SELECT name, notes, created_at, updated_at
           FROM characters WHERE id = ?`,
          [imported.characterId],
        ),
      ).toEqual({
        name: `${displayName} User`,
        notes: 'portable character',
        created_at: timestamp,
        updated_at: timestamp,
      });
      expect(
        target.oneRaw(
          `SELECT character_id, spell_version_id, favourite, notes,
                  created_at, updated_at
           FROM character_spell_preferences WHERE character_id = ?`,
          [imported.characterId],
        ),
      ).toEqual({
        character_id: imported.characterId,
        spell_version_id: 1,
        favourite: 1,
        notes: 'portable preference',
        created_at: timestamp,
        updated_at: timestamp,
      });
      expect(
        exportCharacterBackup(
          target,
          imported.characterId,
          '2026-07-28T13:15:00.000Z',
        ),
      ).toEqual(document);
    },
  );

  it('carries no bundled definition while proving the same instrument carries a fork', async () => {
    const bundledDb = await database();
    const bundled = seedReferencedSpell(
      bundledDb,
      'srd',
      '2024:time-stop',
      'Time Stop',
      null,
    );
    const bundledDocument = exportCharacterBackup(
      bundledDb,
      bundled.characterId,
    );
    expect(
      bundledDocument.content.length === 0,
    ).toBe(true);
    expect(bundledDocument.references.spell_versions).toEqual([
      { id: bundled.versionId, content_key: '2024:time-stop' },
    ]);

    const forkDb = await database();
    const fork = seedReferencedSpell(
      forkDb,
      'user',
      '2024:local.dnd-wt:time-stop-copy',
      'Time Stop (Copy)',
      '2024:time-stop',
    );
    const forkDocument = exportCharacterBackup(forkDb, fork.characterId);
    expect(forkDocument.content).toHaveLength(1);
    expect(forkDocument.content[0]).toMatchObject({
      kind: 'spell',
      content_key: '2024:local.dnd-wt:time-stop-copy',
    });
  });

  it('CI4A-H2 surfaces different-content adoption and restores a new external spell into a fresh database', async () => {
    const source = await database();
    const carried = seedReferencedSpell(
      source,
      'user',
      '2024:local.dnd-wt:carried-version',
      'Carried Version',
      '2024:time-stop',
    );
    const document = exportCharacterBackup(source, carried.characterId);

    const emptyTarget = await database();
    const freshImport = importCharacterBackup(emptyTarget, document);
    expect(freshImport.spellOutcomes).toEqual([{
      contentKey: '2024:local.dnd-wt:carried-version',
      targetContentKey: '2024:local.dnd-wt:carried-version',
      kind: 'adopted',
    }]);
    expect(
      emptyTarget.scalar(
        'SELECT display_name FROM spell_versions WHERE content_key = ?',
        ['2024:local.dnd-wt:carried-version'],
      ),
    ).toBe('Carried Version');

    const collisionTarget = await database();
    const local = seedReferencedSpell(
      collisionTarget,
      'user',
      '2024:local.dnd-wt:carried-version',
      'Carried Version',
      '2024:local-ancestor',
    );
    collisionTarget.exec(
      `UPDATE spell_versions
       SET short_summary = 'Different local rules.'
       WHERE id = ?`,
      [local.versionId],
    );
    refreshSpellFingerprint(
      collisionTarget,
      '2024:local.dnd-wt:carried-version',
    );
    const before = storedDefinitions(collisionTarget);
    const plan = planCharacterBackupImport(collisionTarget, document);
    expect(plan.reviews.map((review) => review.matchClass)).toEqual([
      'key-collision',
    ]);
    const committed = commitCharacterBackupImport(
      collisionTarget,
      document,
      plan.token,
      Object.fromEntries(plan.reviews.map((review) => [
        review.id,
        { decision: 'match' as const },
      ])),
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Expected commit.');
    const imported = committed.result;
    expect(storedDefinitions(collisionTarget)).toEqual(before);
    expect(
      collisionTarget.oneRaw(
        `SELECT display_name, provenance, forked_from_content_key
         FROM spell_versions WHERE id = ?`,
        [local.versionId],
      ),
    ).toEqual({
      display_name: 'Carried Version',
      provenance: 'user',
      forked_from_content_key: '2024:local-ancestor',
    });
    expect(
      collisionTarget.scalar(
        `SELECT spell_version_id
         FROM character_spell_preferences WHERE character_id = ?`,
        [imported.characterId],
      ),
    ).toBe(local.versionId);
  });
});
