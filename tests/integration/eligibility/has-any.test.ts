import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { EligibleSpellSearch } from '../../../src/eligibility/eligible-spell-search';
import { openTestDatabase } from '../../helpers/open-db';
import { createBuildReportFixture } from '../reports/build-report-fixture';

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

it('answers false for a selection collection this build cannot resolve', async () => {
  connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  const fixture = createBuildReportFixture(db);
  const search = new EligibleSpellSearch(db);
  const slotId = db.all(
    `SELECT slot.id
     FROM spell_selection_slots AS slot
     WHERE slot.character_id = ?
       AND slot.selection_collection IS NULL
     ORDER BY slot.id`,
    [fixture.characterId],
    (row) => Number(row.id),
  ).find((candidate) => search.hasAny(fixture.characterId, candidate));
  expect(slotId).toBeDefined();

  db.exec(
    `UPDATE spell_selection_slots
     SET selection_collection = 'wizard_spellbook'
     WHERE id = ?`,
    [slotId!],
  );

  // `search` throws here because `evaluate` refuses the collection, so the
  // picker can offer nothing. `hasAny` must not advertise a choice instead.
  expect(() => search.search(fixture.characterId, slotId!, '')).toThrow(
    "Unsupported selection collection 'wizard_spellbook'.",
  );
  expect(search.hasAny(fixture.characterId, slotId!)).toBe(false);
});
