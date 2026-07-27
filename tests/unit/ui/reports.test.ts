import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { PrintableSpellListBuilder } from '../../../src/reports/printable-spell-list-builder';
import { SRD_ATTRIBUTION_NOTICE } from '../../../src/rules/srd-attribution';
import { renderBuildReport } from '../../../src/ui/screens/build-report/build-report';
import {
  renderPrintableList,
  TEXT_PARTIAL_WARNING,
  TEXT_UNAVAILABLE_WARNING,
} from '../../../src/ui/screens/print/printable-list';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
} from '../../integration/reports/build-report-fixture';
import {
  createPrintableListFixture,
  persistedPrintableTableHashes,
} from '../../integration/reports/printable-list-fixture';

function attributionText(markup: string): string {
  const match = markup.match(
    /<footer[^>]*data-testid="srd-attribution"[^>]*>([\s\S]*?)<\/footer>/,
  );
  if (match?.[1] === undefined) {
    throw new Error('Missing srd-attribution notice.');
  }
  return match[1].replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
}

function noticeText(markup: string, testId: string): string {
  const match = markup.match(
    new RegExp(
      `<aside[^>]*data-testid="${testId}"[^>]*>([\\s\\S]*?)<\\/aside>`,
    ),
  );
  if (match?.[1] === undefined) {
    throw new Error(`Missing ${testId} notice.`);
  }
  return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
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
    expect(attributionText(markup)).toBe(SRD_ATTRIBUTION_NOTICE);
    expect(JSON.stringify(report)).toBe(reportBeforeRender);
    expect(persistedReportTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
  });

  it('renders the reference sheet in deterministic natural source order with route facts and no text', () => {
    const fixture = createPrintableListFixture(db);
    expect(
      db.allRaw(
        `SELECT source.display_name, slot.with_slots, slot.free_cast
         FROM spell_selection_slots AS slot
         INNER JOIN character_source_instances AS source
           ON source.id = slot.source_instance_id
         WHERE slot.id IN (?, ?)
         ORDER BY source.display_name`,
        [fixture.slotIds.mistyStep, fixture.slotIds.faerieFire],
      ),
    ).toEqual([
      {
        display_name: 'Gift 10',
        with_slots: 0,
        free_cast:
          '{"uses":2,"recovery":"dawn","pool_scope":"shared"}',
      },
      {
        display_name: 'Gift 2',
        with_slots: 1,
        free_cast:
          '{"uses":1,"recovery":"long_rest","pool_scope":"per_spell"}',
      },
    ]);

    const before = persistedPrintableTableHashes(db, fixture.characterId);
    const printable = new PrintableSpellListBuilder(db).build(
      fixture.characterId,
    );
    const shuffled = {
      ...printable,
      source_groups: [...printable.source_groups].reverse(),
      unprepared_sections: [...printable.unprepared_sections].reverse(),
    };
    const inputBeforeRender = JSON.stringify(shuffled);
    const markup = renderPrintableList(shuffled);

    expect(markup).toContain('data-variant="reference"');
    expect(markup).toContain('Reference sheet (no spell text)');
    expect(markup).not.toContain('class="spell-description"');
    expect(markup).not.toContain('class="text-notice"');
    expect(markup).toContain('<strong>Access:</strong>');
    expect(markup).toContain('Slots And Free Cast · CHA');
    expect(markup).toContain('Free Cast Only · CHA');
    expect(markup).toContain('DC 12 · WIS');
    expect(markup).toContain('Melee Spell, Ranged Spell');
    // THE UPCAST PROGRESSION, ASCENDING AND NAMING ITS SCALE. The fixture
    // stores `[3, 2, 4]`; printing them in that order would be a list a reader
    // has to re-sort, and printing `2, 3, 4` with no scale word would leave a
    // player unable to tell slot levels from character levels.
    expect(markup).toContain(
      'Upcast: </dt><dd>slot levels 2, 3, 4 · One additional creature per ' +
        'slot level above 2.',
    );
    // ...AND NO LINE AT ALL for the four spells whose document said nothing.
    // `Upcast: —` would assert that they cannot be upcast, which no document
    // claimed. Exactly one `Upcast:` in the whole sheet.
    expect(markup.match(/Upcast: /gu)).toHaveLength(1);
    expect(markup.indexOf('Gift 2</h2>')).toBeLessThan(
      markup.indexOf('Gift 10</h2>'),
    );
    expect(markup.indexOf('Cleric — not prepared')).toBeLessThan(
      markup.indexOf('Druid — not prepared'),
    );
    expect(attributionText(markup)).toBe(SRD_ATTRIBUTION_NOTICE);
    expect(JSON.stringify(shuffled)).toBe(inputBeforeRender);
    expect(persistedPrintableTableHashes(db, fixture.characterId)).toEqual(
      before,
    );
  });

  /**
   * A SCALE THE VOCABULARY DOES NOT CONTAIN MUST NOT REACH THE CARD.
   *
   * `scaleWord` is an exhaustive switch with NO `default` arm, so a value
   * outside `upcastScales` falls through it and returns `undefined`, which
   * `upcastLine` interpolates — the literal word `undefined` printed to a
   * player. The builder used to CAST the column instead of validating it, and a
   * cast cannot fail.
   *
   * THE STATE IS REACHABLE FOR F11'S REASON, and the pragma is how this test
   * reaches it: `spell_versions.upcast_scale` carries a CHECK, and a CHECK
   * constrains no image created before it existed and no hand-edited one. The
   * docblock on `scaleWord` claims the fallback prints the bare word `levels`,
   * which claims neither ladder; this is that claim, executed.
   */
  it('prints the scale-less word rather than "undefined" for a stored scale outside the vocabulary', () => {
    const fixture = createPrintableListFixture(db);
    db.exec('PRAGMA ignore_check_constraints = ON');
    const written = db.exec(
      'UPDATE spell_versions SET upcast_scale = ? WHERE id = ?',
      ['planar_level', fixture.spellIds.bless],
    );
    db.exec('PRAGMA ignore_check_constraints = OFF');
    // The corrupt value really is stored — otherwise this measures nothing.
    expect(written.changes).toBe(1);
    expect(
      db.scalar('SELECT upcast_scale FROM spell_versions WHERE id = ?', [
        fixture.spellIds.bless,
      ]),
    ).toBe('planar_level');

    const markup = renderPrintableList(
      new PrintableSpellListBuilder(db).build(fixture.characterId),
    );
    expect(markup).not.toContain('undefined');
    expect(markup).not.toContain('planar_level');
    // The levels themselves are still true and still print; only the scale is
    // withheld, because that is the part we no longer know.
    expect(markup).toContain(
      'Upcast: </dt><dd>levels 2, 3, 4 · One additional creature per ' +
        'slot level above 2.',
    );
  });

  it('renders the exact partial and unavailable full-reference warnings from persisted text completeness', () => {
    const fixture = createPrintableListFixture(db);
    expect(
      db.oneRaw(
        `SELECT display_name, short_summary
         FROM spell_versions
         WHERE id = ?`,
        [fixture.spellIds.goodberry],
      ),
    ).toEqual({ display_name: 'Goodberry', short_summary: null });

    const partialBefore = persistedPrintableTableHashes(
      db,
      fixture.characterId,
    );
    const partial = new PrintableSpellListBuilder(db).build(
      fixture.characterId,
      true,
    );
    const partialMarkup = renderPrintableList(partial);
    expect(partial.text_status).toBe('partial');
    expect(partialMarkup).toContain('data-testid="text-partial"');
    expect(noticeText(partialMarkup, 'text-partial')).toBe(
      TEXT_PARTIAL_WARNING,
    );
    expect(partialMarkup).toContain('Description unavailable.');
    expect(partialMarkup).toContain('A one-word supernatural command.');
    expect(TEXT_PARTIAL_WARNING).toBe(
      'Some spell descriptions are unavailable. Missing text is identified on the affected spells.',
    );
    expect(
      persistedPrintableTableHashes(db, fixture.characterId),
    ).toEqual(partialBefore);

    db.exec('UPDATE spell_versions SET short_summary = NULL');
    expect(
      db.scalar<number>(
        'SELECT COUNT(*) FROM spell_versions WHERE short_summary IS NOT NULL',
      ),
    ).toBe(0);
    const unavailableBefore = persistedPrintableTableHashes(
      db,
      fixture.characterId,
    );
    const unavailable = new PrintableSpellListBuilder(db).build(
      fixture.characterId,
      true,
    );
    const unavailableMarkup = renderPrintableList(unavailable);
    expect(unavailable.text_status).toBe('unavailable');
    expect(unavailableMarkup).toContain(
      'data-testid="text-unavailable"',
    );
    expect(noticeText(unavailableMarkup, 'text-unavailable')).toBe(
      TEXT_UNAVAILABLE_WARNING,
    );
    expect(unavailableMarkup).toContain(
      '<code>php artisan catalog:import --with-text</code>',
    );
    expect(TEXT_UNAVAILABLE_WARNING).toBe(
      'Spell descriptions are not installed. This full reference includes all spell facts, but no description text. Run php artisan catalog:import --with-text where the local Tier 2 files are available, then print again.',
    );
    expect(
      persistedPrintableTableHashes(db, fixture.characterId),
    ).toEqual(unavailableBefore);
  });
});
