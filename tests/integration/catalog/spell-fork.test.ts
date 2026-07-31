import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import {
  FORK_NAME_REQUIRED_MESSAGE,
  forkSrdSpell,
  type ForkSpellResult,
} from '../../../src/catalog/spell-fork';
import {
  assertSpellVersionCommandAllowed,
} from '../../../src/commands/srd-spell-policy';
import { DatabaseContext } from '../../../src/db/database';
import { seedSpellContent } from '../../../src/rules/spells-srd';
import {
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { handlers } from '../../../src/worker/handlers/catalog';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
let harness: RpcHarness | undefined;

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
  harness?.close();
  harness = undefined;
});

async function seededDatabase(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  seedSpellContent(db);
  return db;
}

function importedRecord(versionKey: string, name: string): string {
  return JSON.stringify([
    {
      identityKey: `identity-${name.toLowerCase().replaceAll(' ', '-')}`,
      versionKey,
      name,
      edition: '2024',
      level: 1,
      school: 'Evocation',
      castingTime: 'Action',
      range: '60 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      attackModes: [],
      saveAbilities: [],
      effectReliabilityCategory: 'fixed_effect',
      spellLists: ['Wizard'],
      sourceBooks: ['Fixture'],
      sourcePage: 1,
      sourceSlug: name.toLowerCase().replaceAll(' ', '-'),
    },
  ]);
}

describe('bundled spell forks', () => {
  it('dispatches an editable user-owned copy with ancestry and enumerated memberships', async () => {
    harness = await createRpcHarness(handlers);
    seedSpellContent(harness.context.db);
    const db = harness.context.db;

    const response = await harness.call<
      { sourceContentKey: string },
      ForkSpellResult
    >('catalog.forkSpell', { sourceContentKey: '2024:fireball' });
    expect(response.ok).toBe(true);
    if (!response.ok) {
      throw new Error(response.error.message);
    }

    expect(
      db.oneRaw(
        `SELECT content_key, display_name, forked_from_content_key,
                provenance, is_active
         FROM spell_versions WHERE id = ?`,
        [response.result.spellVersionId],
      ),
    ).toEqual({
      content_key: response.result.contentKey,
      display_name: 'Fireball (Copy)',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
      is_active: 1,
    });
    expect(response.result.contentKey).toMatch(
      /^2024:local\.dnd-wt:[a-z0-9-]+$/,
    );
    expect(
      db
        .allRaw(
          `SELECT spell_list_key
           FROM spell_list_memberships
           WHERE spell_version_id = ?
           ORDER BY spell_list_key`,
          [response.result.spellVersionId],
        )
        .map((row) => String(row.spell_list_key)),
    ).toEqual(['Sorcerer', 'Wizard']);
    expect(() =>
      assertSpellVersionCommandAllowed(
        db,
        response.result.spellVersionId,
        'edit',
      ),
    ).not.toThrow();
    expect(() =>
      assertSpellVersionCommandAllowed(
        db,
        response.result.spellVersionId,
        'delete',
      ),
    ).not.toThrow();
  });

  it('refuses only the source name and allows another spell name', async () => {
    const db = await seededDatabase();

    expect(() =>
      forkSrdSpell(db, {
        sourceContentKey: '2024:fireball',
        name: 'Fireball',
      }),
    ).toThrow(FORK_NAME_REQUIRED_MESSAGE);

    const fork = forkSrdSpell(db, {
      sourceContentKey: '2024:fireball',
      name: 'Acid Arrow',
    });
    expect(
      db.oneRaw(
        `SELECT display_name, forked_from_content_key, provenance
         FROM spell_versions WHERE id = ?`,
        [fork.spellVersionId],
      ),
    ).toEqual({
      display_name: 'Acid Arrow',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
    });
  });

  it('survives import tombstoning and SRD re-seeding while the import control is tombstoned', async () => {
    const db = await seededDatabase();
    const fork = forkSrdSpell(db, {
      sourceContentKey: '2024:fireball',
    });
    const importer = new CatalogImporter(db);
    importer.import({
      documents: [
        importedRecord('2024:user.test:discarded', 'Discarded Control'),
      ],
    });

    const summary = importer.import({
      documents: [
        importedRecord('2024:user.test:retained', 'Retained Control'),
      ],
    });
    expect(summary.tombstoned).toBe(1);
    expect(
      db.allRaw(
        `SELECT content_key, provenance, is_active
         FROM spell_versions
         WHERE id = ?
            OR content_key IN (
              '2024:user.test:discarded',
              '2024:user.test:retained'
            )
         ORDER BY content_key`,
        [fork.spellVersionId],
      ),
    ).toEqual([
      {
        content_key: fork.contentKey,
        provenance: 'user',
        is_active: 1,
      },
      {
        content_key: '2024:user.test:discarded',
        provenance: 'import',
        is_active: 0,
      },
      {
        content_key: '2024:user.test:retained',
        provenance: 'import',
        is_active: 1,
      },
    ]);

    seedSpellContent(db);
    expect(
      db.oneRaw(
        `SELECT content_key, display_name, forked_from_content_key,
                provenance, is_active
         FROM spell_versions WHERE id = ?`,
        [fork.spellVersionId],
      ),
    ).toEqual({
      content_key: fork.contentKey,
      display_name: 'Fireball (Copy)',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
      is_active: 1,
    });
  });

  it('carries forks and imported homebrew as the same reference-only payload', async () => {
    const sender = await seededDatabase();
    const fork = forkSrdSpell(sender, {
      sourceContentKey: '2024:fireball',
    });
    const importedKey = '2024:user.test:shared-homebrew';
    new CatalogImporter(sender).import({
      documents: [importedRecord(importedKey, 'Shared Homebrew')],
    });
    const importedId = Number(
      sender.scalar(
        'SELECT id FROM spell_versions WHERE content_key = ?',
        [importedKey],
      ),
    );
    const characterId = sender.exec(
      `INSERT INTO characters (name) VALUES ('Fork Sharer')`,
    ).lastInsertId;
    for (const spellVersionId of [fork.spellVersionId, importedId]) {
      sender.exec(
        `INSERT INTO wizard_spellbook_entries (
           character_id, spell_version_id
         ) VALUES (?, ?)`,
        [characterId, spellVersionId],
      );
    }

    const shared = await decodeShareFragment(
      await encodeShareFragment(
        exportCharacterShare(sender, characterId),
      ),
    );
    expect(shared.spellbook).toEqual([
      { spellKey: fork.contentKey },
      { spellKey: importedKey },
    ]);
    expect(Object.hasOwn(shared, 'forks')).toBe(false);
    expect(JSON.stringify(shared)).not.toContain(
      'forked_from_content_key',
    );
    expect(JSON.stringify(shared)).not.toContain(
      'material_component_summary',
    );

    const backup = exportCharacterBackup(sender, characterId);
    expect(
      backup.references.spell_versions.map((reference) => ({
        keys: Object.keys(reference).sort(),
        contentKey: reference.content_key,
      })),
    ).toEqual([
      { keys: ['content_key', 'id'], contentKey: fork.contentKey },
      { keys: ['content_key', 'id'], contentKey: importedKey },
    ]);

    const recipient = await seededDatabase();
    expect(previewCharacterShare(recipient, shared).placeholderCount).toBe(2);
    const imported = importCharacterShare(recipient, shared);
    expect(
      recipient
        .allRaw(
          `SELECT version.content_key, version.provenance,
                  version.forked_from_content_key
           FROM wizard_spellbook_entries AS entry
           INNER JOIN spell_versions AS version
             ON version.id = entry.spell_version_id
           WHERE entry.character_id = ?
           ORDER BY version.content_key`,
          [imported.characterId],
        )
    ).toEqual([
      {
        content_key: fork.contentKey,
        provenance: 'placeholder',
        forked_from_content_key: null,
      },
      {
        content_key: importedKey,
        provenance: 'placeholder',
        forked_from_content_key: null,
      },
    ]);
  });
});
