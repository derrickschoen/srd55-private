import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../../../src/backup/database-backup';
import {
  exportSelectedLibraryContent,
  importLibraryDocument,
} from '../../../src/backup/library-export';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import {
  createLevelFiveHighElf,
  EXPECTED_LEVEL_FIVE_HIGH_ELF,
  importedSpeciesSemanticCensus,
  lineagePortabilityProjection,
  portableElfLibraryDocument,
  PORTABLE_ELF_KEY,
} from '../../helpers/species-lineage-portability';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const lifecycles: DatabaseLifecycle[] = [];

afterEach(() => {
  for (const lifecycle of lifecycles.splice(0)) lifecycle.close();
});

async function lifecycle(): Promise<DatabaseLifecycle> {
  const sqlite3 = await getSqlite3();
  const result = createApplicationLifecycle(
    sqlite3,
    new MemoryDatabaseStorage(sqlite3),
  );
  lifecycles.push(result);
  result.open();
  return result;
}

async function sourceFixture(): Promise<{
  readonly lifecycle: DatabaseLifecycle;
  readonly characterId: number;
}> {
  const source = await lifecycle();
  importLibraryDocument(
    source.database,
    portableElfLibraryDocument(source.database),
  );
  return {
    lifecycle: source,
    characterId: await createLevelFiveHighElf(
      source.database,
      PORTABLE_ELF_KEY,
    ),
  };
}

describe('lineage portability through fresh databases', () => {
  // Measured alone at 2.0s; 2.0 × 1.5 = 3.0s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('round-trips character backup v6 with the exact chosen and gated slot set', async () => {
    const source = await sourceFixture();
    const backup = exportCharacterBackup(
      source.lifecycle.database,
      source.characterId,
      '2042-08-09T00:00:00.000Z',
    );
    expect(backup.version).toBe(6);

    const target = await lifecycle();
    const imported = importCharacterBackup(target.database, backup);
    expect(importedSpeciesSemanticCensus(target.database, PORTABLE_ELF_KEY))
      .toBe(9);
    expect(
      lineagePortabilityProjection(target.database, imported.characterId),
    ).toEqual(EXPECTED_LEVEL_FIVE_HIGH_ELF);
  }, 20_000);

  // Measured alone at 2.0s; 2.0 × 1.5 = 3.0s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('reconciles level-gated lineage slots omitted from an adopted v6 character', async () => {
    const source = await sourceFixture();
    const backup = exportCharacterBackup(
      source.lifecycle.database,
      source.characterId,
      '2042-08-09T00:00:00.000Z',
    );
    const damaged = {
      ...backup,
      tables: {
        ...backup.tables,
        spell_selection_slots: backup.tables.spell_selection_slots.filter(
          (row) => !String(row['rule_key']).includes('detect-magic') &&
            !String(row['rule_key']).includes('misty-step'),
        ),
      },
    };

    const target = await lifecycle();
    const imported = importCharacterBackup(target.database, damaged);
    expect(
      lineagePortabilityProjection(target.database, imported.characterId),
    ).toEqual(EXPECTED_LEVEL_FIVE_HIGH_ELF);
  }, 20_000);

  // Historical snapshots can carry a class source from before the separate
  // class-level relation was recorded. The import boundary preserves that
  // readable state; reconciliation must neither throw nor infer a level.
  it('imports a historical class source without its level relation or invented gated slots', async () => {
    const source = await sourceFixture();
    const backup = exportCharacterBackup(
      source.lifecycle.database,
      source.characterId,
      '2042-08-09T00:00:00.000Z',
    );
    const historical = {
      ...backup,
      tables: {
        ...backup.tables,
        character_class_levels: [],
        character_level_feat_choices: [],
        spell_selection_slots: [],
      },
    };

    const target = await lifecycle();
    const imported = importCharacterBackup(target.database, historical);
    expect(target.database.allRaw(
      `SELECT slot.rule_key
       FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE source.character_id = ?
         AND source.source_type IN ('class', 'subclass')
       ORDER BY slot.rule_key`,
      [imported.characterId],
    )).toEqual([]);
    expect(lineagePortabilityProjection(
      target.database,
      imported.characterId,
    ).slots.map((slot) => slot['rule_key'])).toEqual([
      'elf-lineage:replaceable_spell',
    ]);
  }, 20_000);

  // Measured alone at 1.8s; 1.8 × 1.5 = 2.7s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('round-trips library v2 before the same production writers recreate the exact choice', async () => {
    const source = await sourceFixture();
    const library = exportSelectedLibraryContent(
      source.lifecycle.database,
      [PORTABLE_ELF_KEY],
      '2042-08-09T00:00:00.000Z',
    );
    expect(library.version).toBe(2);

    const target = await lifecycle();
    importLibraryDocument(target.database, library);
    expect(importedSpeciesSemanticCensus(target.database, PORTABLE_ELF_KEY))
      .toBe(9);
    const recreated = await createLevelFiveHighElf(
      target.database,
      PORTABLE_ELF_KEY,
      'Library-restored High Elf',
    );
    expect(lineagePortabilityProjection(target.database, recreated)).toEqual(
      EXPECTED_LEVEL_FIVE_HIGH_ELF,
    );
  }, 20_000);

  // Measured alone at 1.9s; 1.9 × 1.5 = 2.85s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('round-trips a whole database image and post-adoption reconciliation is exact', async () => {
    const source = await sourceFixture();
    const backup = await exportDatabaseBackup(
      source.lifecycle,
      '2042-08-09T00:00:00.000Z',
    );

    const target = await lifecycle();
    await importDatabaseBackup(target, backup);
    expect(importedSpeciesSemanticCensus(target.database, PORTABLE_ELF_KEY))
      .toBe(9);
    const importedId = target.database.scalar<number>(
      `SELECT id FROM characters WHERE name = 'Portable High Elf'`,
    );
    if (importedId === null) throw new Error('Whole-image character is absent.');
    expect(lineagePortabilityProjection(target.database, importedId)).toEqual(
      EXPECTED_LEVEL_FIVE_HIGH_ELF,
    );
  }, 20_000);

  // Measured alone at 1.9s; 1.9 × 1.5 = 2.85s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('reconciles missing gated lineage slots inside an adopted database image', async () => {
    const source = await sourceFixture();
    source.lifecycle.database.exec(
      `DELETE FROM spell_selection_slots
       WHERE character_id = ? AND (
         rule_key LIKE '%detect-magic' OR rule_key LIKE '%misty-step'
       )`,
      [source.characterId],
    );
    const backup = await exportDatabaseBackup(
      source.lifecycle,
      '2042-08-09T00:00:00.000Z',
    );

    const target = await lifecycle();
    await importDatabaseBackup(target, backup);
    const importedId = target.database.scalar<number>(
      `SELECT id FROM characters WHERE name = 'Portable High Elf'`,
    );
    if (importedId === null) throw new Error('Whole-image character is absent.');
    expect(lineagePortabilityProjection(target.database, importedId)).toEqual(
      EXPECTED_LEVEL_FIVE_HIGH_ELF,
    );
  }, 20_000);
});
