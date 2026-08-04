import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { SRD_ATTRIBUTION_NOTICE } from '../../../src/rules/srd-attribution';
import { renderBuildReport } from '../../../src/ui/screens/build-report/build-report';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
} from '../../integration/reports/build-report-fixture';

function attributionText(markup: string): string {
  const match = markup.match(
    /<footer[^>]*data-testid="srd-attribution"[^>]*>([\s\S]*?)<\/footer>/,
  );
  if (match?.[1] === undefined) {
    throw new Error('Missing srd-attribution notice.');
  }
  return match[1].replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
}

describe('read-only report presentation', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
  });

  afterEach(() => {
    connection.close();
  });

  it('renders classless level and proficiency as undetermined on the build report', () => {
    const characterId = db.exec(
      `INSERT INTO characters (name) VALUES ('Between wizard steps')`,
    ).lastInsertId;
    const report = new BuildReportBuilder(db).build(characterId);
    const markup = renderBuildReport(report);

    expect(report.character).toMatchObject({
      character_level: null,
      proficiency_bonus: null,
    });
    expect(markup).toContain(
      'Character level undetermined · Proficiency bonus undetermined',
    );
    expect(markup).not.toContain(
      'Character level 0 · Proficiency bonus +1',
    );
  });

  it('renders exact source, route, duplicate, and invalid-selection annotations without writes', () => {
    const fixture = createBuildReportFixture(db);
    db.exec(
      `UPDATE characters
       SET name = 'R40 <Golden & Read-only>'
       WHERE id = ?`,
      [fixture.characterId],
    );
    expect(
      db.oneRaw(
        'SELECT id, name, revision FROM characters WHERE id = ?',
        [fixture.characterId],
      ),
    ).toEqual({
      id: fixture.characterId,
      name: 'R40 <Golden & Read-only>',
      revision: 0,
    });
    expect(
      db.allRaw(
        `SELECT id, state, selection_eligibility
         FROM spell_selection_slots
         WHERE id IN (?, ?, ?)
         ORDER BY id`,
        fixture.invalidSlotIds,
      ),
    ).toEqual([
      {
        id: fixture.invalidSlotIds[1],
        state: 'active',
        selection_eligibility: 'invalid',
      },
      {
        id: fixture.invalidSlotIds[0],
        state: 'orphaned',
        selection_eligibility: 'unselected',
      },
      {
        id: fixture.invalidSlotIds[2],
        state: 'kept_override',
        selection_eligibility: 'invalid',
      },
    ]);

    const before = persistedReportTableHashes(db, fixture.characterId);
    const report = new BuildReportBuilder(db).build(fixture.characterId);
    const reportBeforeRender = JSON.stringify(report);
    const markup = renderBuildReport(report);

    expect(markup).toContain('R40 &lt;Golden &amp; Read-only&gt;');
    expect(markup).not.toContain('<Golden & Read-only>');
    expect(markup).toContain('Magic Initiate: Wizard');
    expect(markup).toContain('Slot feat-cantrip:1');
    expect(markup).toContain('Capability route');
    expect(markup).toContain('data-category="wasteful"');
    expect(markup).toContain('data-category="conflicting_version"');
    expect(markup).toContain('Shield (2014)');
    expect(markup).toContain('Shield (2024)');
    expect(markup).toContain(
      'Sources: Magic Initiate: Wizard, Wizard 1 · Slots:',
    );
    expect(markup).toContain(
      'Selected spell is outside the slot level range.',
    );
    expect(markup).toContain('grant_rule_removed');
    expect(markup.indexOf('Mage Armor')).toBeLessThan(
      markup.indexOf('Magic Missile'),
    );
    expect(markup).toContain(
      `href="/characters/${String(fixture.characterId)}/sheet"`,
    );
    expect(markup).toContain('>Character sheet</a>');
    expect(markup).not.toContain(
      `/characters/${String(fixture.characterId)}/print`,
    );
    expect(attributionText(markup)).toBe(SRD_ATTRIBUTION_NOTICE);
    expect(JSON.stringify(report)).toBe(reportBeforeRender);
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
  });
});
