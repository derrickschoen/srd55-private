import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { EligibleSpellSearch } from '../../../src/eligibility/eligible-spell-search';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createBuildReportFixture,
  createSlot,
} from '../reports/build-report-fixture';
import { assignSpellSelection } from '../../../src/eligibility/spell-selection-assignment';

let connection: Database | undefined;

afterEach(() => {
  connection?.close();
  connection = undefined;
});

it('agrees with search on every slot of the report fixture, legacy on and off', async () => {
  connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  const fixture = createBuildReportFixture(db);
  const search = new EligibleSpellSearch(db);
  const slotIds = db.all(
    'SELECT id FROM spell_selection_slots WHERE character_id = ? ORDER BY id',
    [fixture.characterId],
    (row) => Number(row.id),
  );
  expect(slotIds.length).toBeGreaterThan(0);

  for (const allowLegacy of [1, 0]) {
    db.exec('UPDATE characters SET allow_legacy = ? WHERE id = ?', [
      allowLegacy,
      fixture.characterId,
    ]);
    const probed = slotIds.map((slotId) =>
      search.hasAny(fixture.characterId, slotId),
    );
    const searched = slotIds.map(
      (slotId) => search.search(fixture.characterId, slotId, '').length > 0,
    );
    expect(probed).toEqual(searched);
    expect(probed).toContain(true);
  }

  // Emptying the catalog must flip every probe, so the agreement above cannot
  // pass by both sides being constantly true.
  db.exec('UPDATE spell_versions SET is_active = 0');
  expect(
    slotIds.map((slotId) => search.hasAny(fixture.characterId, slotId)),
  ).toEqual(slotIds.map(() => false));
  expect(
    slotIds.map(
      (slotId) => search.search(fixture.characterId, slotId, '').length > 0,
    ),
  ).toEqual(slotIds.map(() => false));
});

it('offers and accepts only active spellbook rows for a collection-constrained preparation', async () => {
  connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  const fixture = createBuildReportFixture(db);
  const search = new EligibleSpellSearch(db);
  const slotId = createSlot(
    db,
    fixture.characterId,
    fixture.featSourceId,
    null,
    'collection-prepared:1',
    1,
    { bucket: 'prepared', levelMin: 1, levelMax: 1 },
  );

  const beforeCollection = search.search(fixture.characterId, slotId, '');
  const inBook = beforeCollection[0];
  const outOfBook = beforeCollection[1];
  if (inBook === undefined || outOfBook === undefined) {
    throw new Error('The collection fixture needs two eligible spells.');
  }
  const sourceId = Number(
    db.scalar(
      'SELECT source_instance_id FROM spell_selection_slots WHERE id = ?',
      [slotId],
    ),
  );
  db.exec(
    'DELETE FROM wizard_spellbook_entries WHERE character_id = ?',
    [fixture.characterId],
  );
  db.exec(
    `UPDATE spell_selection_slots
     SET selection_collection = 'wizard_spellbook'
     WHERE id = ?`,
    [slotId],
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries (
       character_id, source_instance_id, rule_key, ordinal,
       spell_version_id, spell_level_min, spell_level_max,
       state, selection_eligibility
     ) VALUES (?, ?, 'test-book', 1, ?, 0, 9, 'active', 'valid')`,
    [fixture.characterId, sourceId, inBook.id],
  );

  expect(search.search(fixture.characterId, slotId, '')).toEqual([inBook]);
  expect(search.hasAny(fixture.characterId, slotId)).toBe(true);
  expect(() => assignSpellSelection(db, {
    address: { kind: 'slot_selection', id: slotId },
    character_id: fixture.characterId,
    spell_version_id: outOfBook.id,
  })).toThrow(
    'Selected Wizard preparation is not in this character’s active spellbook.',
  );
  assignSpellSelection(db, {
    address: { kind: 'slot_selection', id: slotId },
    character_id: fixture.characterId,
    spell_version_id: inBook.id,
  });
  expect(
    db.scalar(
      'SELECT current_spell_version_id FROM spell_selection_slots WHERE id = ?',
      [slotId],
    ),
  ).toBe(inBook.id);

  db.exec(
    `UPDATE character_source_instances SET state = 'tombstoned'
     WHERE id = ?`,
    [sourceId],
  );
  expect(search.search(fixture.characterId, slotId, '')).toEqual([]);
  expect(search.hasAny(fixture.characterId, slotId)).toBe(false);
});
