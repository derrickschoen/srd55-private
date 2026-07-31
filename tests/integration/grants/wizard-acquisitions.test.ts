import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { assignSpellSelection } from '../../../src/eligibility/spell-selection-assignment';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * Strict superset replacement for the pre-GF-1 config-acquisition tests: it
 * retains their identity, history, and eligibility controls while proving the
 * addressable nullable acquisition model that replaced config authority.
 */
describe('planned Wizard acquisitions', () => {
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

  function acquisitionRule(count: number): Record<string, unknown> {
    return {
      kind: 'spellbook_acquisition',
      rule_key: 'wizard-spellbook',
      count,
      initial_count: 6,
      count_per_level: 2,
      bucket: 'spellbook',
      list: 'Wizard',
      level_min: 1,
      level_max: 2,
    };
  }

  function wizardSource(
    count: number,
  ): { characterId: number; definitionId: number; sourceId: number } {
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
          acquisitionRule(count),
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
          class_level: 3,
          // Legacy data is deliberately ignored by the planner.
          wizard_spellbook_acquisitions: [{ spell_version_id: 999 }],
        }),
      ],
    ).lastInsertId;
    return { characterId, definitionId, sourceId };
  }

  it('mints stable nullable logical rows with rule, ordinal, and acquisition-level provenance', () => {
    const fixture = wizardSource(10);

    generator.generateForSource(fixture.sourceId);
    const before = db.allRaw(
      `SELECT id, source_instance_id, rule_key, ordinal,
              acquired_at_class_level, spell_version_id, state
       FROM wizard_spellbook_entries ORDER BY ordinal`,
    );
    expect(before).toHaveLength(10);
    expect(before.map((row) => row.acquired_at_class_level)).toEqual([
      1, 1, 1, 1, 1, 1, 2, 2, 3, 3,
    ]);
    expect(before[0]).toMatchObject({
      source_instance_id: fixture.sourceId,
      rule_key: 'wizard-spellbook',
      ordinal: 1,
      spell_version_id: null,
      state: 'active',
    });
    expect(db.scalar('SELECT count(*) FROM spell_selection_slots')).toBe(0);

    generator.generateForSource(fixture.sourceId);
    expect(
      db.allRaw(
        `SELECT id, source_instance_id, rule_key, ordinal,
                acquired_at_class_level, spell_version_id, state
         FROM wizard_spellbook_entries ORDER BY ordinal`,
      ),
    ).toEqual(before);
  });

  it('retains a selected spell while shrinking, orphaning, and reviving the identical acquisition', () => {
    const selectedId = spell('2024:selected-book', { list: 'Wizard' });
    const fixture = wizardSource(3);
    generator.generateForSource(fixture.sourceId);
    const entryId = Number(
      db.scalar(
        `SELECT id FROM wizard_spellbook_entries
         WHERE source_instance_id = ? AND ordinal = 3`,
        [fixture.sourceId],
      ),
    );
    assignSpellSelection(db, {
      address: { kind: 'spellbook_acquisition', id: entryId },
      character_id: fixture.characterId,
      spell_version_id: selectedId,
    });

    db.exec(
      'UPDATE feat_definitions SET grant_rules = ? WHERE id = ?',
      [
        JSON.stringify([acquisitionRule(2)]),
        fixture.definitionId,
      ],
    );
    generator.generateForSource(fixture.sourceId);
    expect(
      db.oneRaw(
        `SELECT id, spell_version_id, acquired_at_class_level, state
         FROM wizard_spellbook_entries WHERE id = ?`,
        [entryId],
      ),
    ).toEqual({
      id: entryId,
      spell_version_id: selectedId,
      acquired_at_class_level: 1,
      state: 'orphaned',
    });

    db.exec(
      'UPDATE feat_definitions SET grant_rules = ? WHERE id = ?',
      [
        JSON.stringify([acquisitionRule(3)]),
        fixture.definitionId,
      ],
    );
    generator.generateForSource(fixture.sourceId);
    expect(
      db.oneRaw(
        `SELECT id, spell_version_id, acquired_at_class_level, state
         FROM wizard_spellbook_entries WHERE id = ?`,
        [entryId],
      ),
    ).toEqual({
      id: entryId,
      spell_version_id: selectedId,
      acquired_at_class_level: 1,
      state: 'active',
    });
  });

  it('shares the strict constraint writer and leaves an invalid attempt byte-for-row unchanged', () => {
    const validId = spell('2024:valid-book', { list: 'Wizard' });
    const offListId = spell('2024:off-list-book', { list: 'Cleric' });
    const inactiveId = spell('2024:inactive-book', {
      list: 'Wizard',
      active: false,
    });
    const fixture = wizardSource(1);
    generator.generateForSource(fixture.sourceId);
    const entryId = Number(
      db.scalar('SELECT id FROM wizard_spellbook_entries'),
    );
    const before = db.oneRaw(
      'SELECT * FROM wizard_spellbook_entries WHERE id = ?',
      [entryId],
    );

    for (const rejectedId of [offListId, inactiveId]) {
      expect(() =>
        assignSpellSelection(db, {
          address: { kind: 'spellbook_acquisition', id: entryId },
          character_id: fixture.characterId,
          spell_version_id: rejectedId,
        }),
      ).toThrow(/Selected spell/);
      expect(
        db.oneRaw(
          'SELECT * FROM wizard_spellbook_entries WHERE id = ?',
          [entryId],
        ),
      ).toEqual(before);
    }

    assignSpellSelection(db, {
      address: { kind: 'spellbook_acquisition', id: entryId },
      character_id: fixture.characterId,
      spell_version_id: validId,
    });
    expect(
      db.oneRaw(
        `SELECT spell_version_id, selection_eligibility
         FROM wizard_spellbook_entries WHERE id = ?`,
        [entryId],
      ),
    ).toEqual({
      spell_version_id: validId,
      selection_eligibility: 'valid',
    });
  });
});
