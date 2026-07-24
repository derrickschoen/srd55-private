import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { openTestDatabase } from '../../helpers/open-db';

describe('simplified Wizard acquisitions', () => {
  let connection: Database;
  let db: DatabaseContext;
  let generator: GrantRuleSlotGenerator;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    generator = new GrantRuleSlotGenerator(db);
  });

  afterEach(() => {
    connection.close();
  });

  function spell(
    key: string,
    options: { list?: string; active?: boolean } = {},
  ): number {
    const identityId = db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`identity:${key}`, key, key.toLowerCase()],
    ).lastInsertId;
    const versionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES (?, ?, ?, '2024', 1, 'Abjuration', ?)`,
      [key, identityId, key, options.active === false ? 0 : 1],
    ).lastInsertId;
    if (options.list !== undefined) {
      db.exec(
        `INSERT INTO spell_list_memberships
           (spell_version_id, spell_list_key)
         VALUES (?, ?)`,
        [versionId, options.list],
      );
    }
    return versionId;
  }

  function wizardSource(
    acquisitions: unknown,
  ): { characterId: number; sourceId: number } {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Wizard Acquisition')",
    ).lastInsertId;
    const definitionId = db.exec(
      `INSERT INTO feat_definitions
         (content_key, name, rules_edition, grant_rules)
       VALUES (?, 'Wizard Spellbook', '2024', ?)`,
      [
        `wizard-source:${crypto.randomUUID()}`,
        JSON.stringify([
          {
            kind: 'spellbook_acquisition',
            rule_key: 'wizard-spellbook',
            bucket: 'spellbook',
            list: 'Wizard',
            acquisitions_config: 'wizard_spellbook_acquisitions',
          },
          {
            kind: 'capability',
            rule_key: 'ritual-adept',
            capability_key: 'wizard-ritual-adept',
            collection: 'wizard_spellbook',
            tags: ['ritual'],
            access_mode: 'ritual_only',
          },
        ]),
      ],
    ).lastInsertId;
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config
       ) VALUES (?, ?, 'feat', ?, 'Wizard Spellbook', ?)`,
      [
        characterId,
        crypto.randomUUID(),
        definitionId,
        JSON.stringify({
          wizard_spellbook_acquisitions: acquisitions,
        }),
      ],
    ).lastInsertId;
    return { characterId, sourceId };
  }

  it('persists a stable per-character spell set without minting slots or removing history', () => {
    const firstId = spell('2024:first-book', { list: 'Wizard' });
    const secondId = spell('2024:second-book', { list: 'Wizard' });
    const fixture = wizardSource([
      { spell_version_id: firstId },
      { spell_version_key: '2024:second-book' },
      { spell_version_id: firstId },
    ]);

    generator.generateForSource(fixture.sourceId);
    const before = db.all(
      `SELECT id, character_id, spell_version_id
       FROM wizard_spellbook_entries ORDER BY id`,
    );
    expect(before).toEqual([
      {
        id: expect.any(Number),
        character_id: fixture.characterId,
        spell_version_id: firstId,
      },
      {
        id: expect.any(Number),
        character_id: fixture.characterId,
        spell_version_id: secondId,
      },
    ]);
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);
    expect(
      generator.activeRulesForSource(fixture.sourceId).map(
        (rule) => rule.kind,
      ),
    ).toEqual(['spellbook_acquisition', 'capability']);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({ wizard_spellbook_acquisitions: [] }),
        fixture.sourceId,
      ],
    );
    generator.generateForSource(fixture.sourceId);
    expect(
      db.all(
        `SELECT id, character_id, spell_version_id
         FROM wizard_spellbook_entries ORDER BY id`,
      ),
    ).toEqual(before);
  });

  it('rejects bookkeeping fields and rolls back acquisitions earlier in the same regeneration', () => {
    const existingId = spell('2024:existing-book', { list: 'Wizard' });
    const newId = spell('2024:new-book', { list: 'Wizard' });
    const rejectedId = spell('2024:rejected-book', { list: 'Wizard' });
    const fixture = wizardSource([
      { spell_version_id: existingId },
    ]);
    generator.generateForSource(fixture.sourceId);
    const existingEntry = db.one(
      `SELECT id, spell_version_id FROM wizard_spellbook_entries`,
    );

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({
          wizard_spellbook_acquisitions: [
            { spell_version_id: existingId },
            { spell_version_id: newId },
            {
              spell_version_id: rejectedId,
              acquisition: 'copied',
              copy_cost_gp: 50,
              copy_time_hours: 2,
              notes: 'Removed metadata',
            },
          ],
        }),
        fixture.sourceId,
      ],
    );

    expect(() => generator.generateForSource(fixture.sourceId)).toThrow(
      "Spellbook rule 'wizard-spellbook' acquisition 2 contains unsupported bookkeeping fields: acquisition, copy_cost_gp, copy_time_hours, notes.",
    );
    expect(
      db.all(
        `SELECT id, spell_version_id
         FROM wizard_spellbook_entries ORDER BY id`,
      ),
    ).toEqual([existingEntry]);
    expect(
      db.scalar(
        `SELECT count(*) FROM wizard_spellbook_entries
         WHERE spell_version_id IN (?, ?)`,
        [newId, rejectedId],
      ),
    ).toBe(0);
  });

  it('rejects new inactive or off-list acquisitions but preserves an existing inactive entry', () => {
    const inactiveId = spell('2024:inactive-book', {
      list: 'Wizard',
      active: false,
    });
    const offListId = spell('2024:off-list-book', {
      list: 'Cleric',
    });
    const fixture = wizardSource([
      { spell_version_id: inactiveId },
    ]);

    expect(() => generator.generateForSource(fixture.sourceId)).toThrow(
      "Spellbook rule 'wizard-spellbook' acquisition 0 references an inactive spell version.",
    );
    expect(db.scalar('SELECT count(*) FROM wizard_spellbook_entries')).toBe(0);

    db.exec('UPDATE spell_versions SET is_active = 1 WHERE id = ?', [
      inactiveId,
    ]);
    generator.generateForSource(fixture.sourceId);
    const entry = db.one(
      `SELECT id, character_id, spell_version_id
       FROM wizard_spellbook_entries`,
    );
    db.exec('UPDATE spell_versions SET is_active = 0 WHERE id = ?', [
      inactiveId,
    ]);
    generator.generateForSource(fixture.sourceId);
    expect(
      db.one(
        `SELECT id, character_id, spell_version_id
         FROM wizard_spellbook_entries`,
      ),
    ).toEqual(entry);

    db.exec(
      `UPDATE character_source_instances SET config = ?
       WHERE id = ?`,
      [
        JSON.stringify({
          wizard_spellbook_acquisitions: [
            { spell_version_id: inactiveId },
            { spell_version_id: offListId },
          ],
        }),
        fixture.sourceId,
      ],
    );
    expect(() => generator.generateForSource(fixture.sourceId)).toThrow(
      "Spellbook rule 'wizard-spellbook' acquisition 1 is not on the Wizard list.",
    );
    expect(
      db.all(
        `SELECT id, character_id, spell_version_id
         FROM wizard_spellbook_entries`,
      ),
    ).toEqual([entry]);
  });
});
