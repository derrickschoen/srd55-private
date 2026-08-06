import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  decodePrimaryAbilityExpression,
  encodePrimaryAbilityExpression,
} from '../../../src/domain/primary-ability';
import {
  seedClassProgressions,
} from '../../../src/rules/class-progression-lookup';
import {
  ensureBundledSheetContent,
  hasBundledSheetContent,
  seedSheetContent,
} from '../../../src/rules/sheet-srd';
import { parseSrdClassTraits } from '../../../src/rules/class-traits-srd';
import { openTestDatabase } from '../../helpers/open-db';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';

describe('primary-ability catalog seed', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
  });

  afterEach(() => connection.close());

  it('seeds and decodes all twelve sourced expressions', () => {
    const expected = new Map(
      parseSrdClassTraits().map((entry) => [
        entry.class_name,
        entry.primary_ability_expression,
      ]),
    );
    const rows = db.all(
      `SELECT name, primary_ability_expression
         FROM class_definitions
        WHERE rules_edition = '2024'
        ORDER BY name`,
      undefined,
      (row) => ({
        name: String(row.name),
        stored:
          row.primary_ability_expression === null
            ? null
            : String(row.primary_ability_expression),
      }),
    );
    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(decodePrimaryAbilityExpression(row.stored), row.name).toEqual({
        kind: 'decoded',
        expression: expected.get(row.name),
      });
    }
  });

  it('repairs a stale expression without changing schema or ids', () => {
    const fighterId = Number(
      db.scalar(
        "SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'",
      ),
    );
    db.exec(
      `UPDATE class_definitions
          SET primary_ability_expression = ?
        WHERE id = ?`,
      [
        encodePrimaryAbilityExpression({
          kind: 'all_of',
          abilities: ['strength'],
        }),
        fighterId,
      ],
    );
    expect(hasBundledSheetContent(db)).toBe(false);
    expect(ensureBundledSheetContent(db)).toBe(true);
    expect(
      db.scalar(
        "SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'",
      ),
    ).toBe(fighterId);
    expect(
      decodePrimaryAbilityExpression(
        String(
          db.scalar(
            `SELECT primary_ability_expression
               FROM class_definitions
              WHERE id = ?`,
            [fighterId],
          ),
        ),
      ),
    ).toEqual({
      kind: 'decoded',
      expression: {
        kind: 'one_of',
        abilities: ['strength', 'dexterity'],
      },
    });
  });

  it('never seeds a same-named class from another rules edition', () => {
    const timestamp = new Date().toISOString();
    registerFixtureContentIdentity(db, {
      kind: 'class', contentKey: '2014:class:fighter', name: 'Fighter',
      keyKind: 'bundled-stable',
    });
    db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type,
         primary_ability_expression, created_at, updated_at
       ) VALUES (?, 'Fighter', '2014', 'none', NULL, ?, ?)`,
      ['2014:class:fighter', timestamp, timestamp],
    );

    seedSheetContent(db);

    expect(
      db.scalar(
        `SELECT primary_ability_expression
           FROM class_definitions
          WHERE content_key = '2014:class:fighter'`,
      ),
    ).toBeNull();
    expect(hasBundledSheetContent(db)).toBe(true);
  });
});
