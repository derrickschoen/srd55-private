import type { Database } from '@sqlite.org/sqlite-wasm';
import { expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  eligibilityInvalidReasons,
  SpellSelectionEligibility,
} from '../../../src/eligibility/spell-selection-eligibility';
import { openTestDatabase } from '../../helpers/open-db';

interface Fixture {
  db: Database;
  context: DatabaseContext;
  eligibility: SpellSelectionEligibility;
  characterId: number;
  sourceId: number;
  slotId: number;
}

async function fixture(
  slotOverrides: Record<string, string | number | null> = {},
): Promise<Fixture> {
  const db = await openTestDatabase();
  const context = new DatabaseContext(db);
  const characterId = context.exec(
    "INSERT INTO characters (name) VALUES ('Eligibility Test')",
  ).lastInsertId;
  const sourceId = context.exec(
    `INSERT INTO character_source_instances
       (character_id, instance_uuid, source_type, display_name)
     VALUES (?, 'eligibility-source', 'feat', 'Eligibility Source')`,
    [characterId],
  ).lastInsertId;
  const columns = Object.keys(slotOverrides);
  const slotId = context.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, bucket,
       eligibility_kind${columns.length === 0 ? '' : `, ${columns.join(', ')}`}
     ) VALUES (
       ?, ?, 'eligibility-slot', 'eligibility-rule', 'known',
       'choice_from_query'${columns.length === 0 ? '' : `, ${columns.map(() => '?').join(', ')}`}
     )`,
    [characterId, sourceId, ...Object.values(slotOverrides)],
  ).lastInsertId;
  return {
    db,
    context,
    eligibility: new SpellSelectionEligibility(context),
    characterId,
    sourceId,
    slotId,
  };
}

function spell(
  context: DatabaseContext,
  key: string,
  options: {
    identityId?: number;
    edition?: string;
    level?: number;
    school?: string;
    active?: boolean;
    lists?: readonly string[];
    tags?: readonly string[];
  } = {},
): number {
  const identityId =
    options.identityId ??
    context.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`identity:${key}`, key, key.toLowerCase()],
    ).lastInsertId;
  const versionId = context.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `version:${key}`,
      identityId,
      key,
      options.edition ?? '2024',
      options.level ?? 1,
      options.school ?? 'Evocation',
      options.active === false ? 0 : 1,
    ],
  ).lastInsertId;
  for (const list of options.lists ?? []) {
    context.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, ?)`,
      [versionId, list],
    );
  }
  for (const tag of options.tags ?? []) {
    context.exec(
      `INSERT INTO spell_version_tags (spell_version_id, tag)
       VALUES (?, ?)`,
      [versionId, tag],
    );
  }
  return versionId;
}

function storedEligibility(context: DatabaseContext, slotId: number) {
  return context.oneRaw(
    `SELECT current_spell_version_id, selection_eligibility,
            selection_invalid_reason
     FROM spell_selection_slots
     WHERE id = ?`,
    [slotId],
  );
}

it('persists unselected and valid refresh states without replacing the retained selection', async () => {
  const test = await fixture({
    selection_eligibility: 'invalid',
    selection_invalid_reason: 'stale reason',
    updated_at: '2000-01-01 00:00:00',
  });
  const validId = spell(test.context, 'Valid Choice');

  test.eligibility.refresh(test.slotId);
  expect(storedEligibility(test.context, test.slotId)).toEqual({
    current_spell_version_id: null,
    selection_eligibility: 'unselected',
    selection_invalid_reason: null,
  });

  test.context.exec(
    `UPDATE spell_selection_slots
     SET current_spell_version_id = ?,
         selection_eligibility = 'invalid',
         selection_invalid_reason = 'stale reason'
     WHERE id = ?`,
    [validId, test.slotId],
  );
  test.eligibility.refresh(test.slotId);

  expect(storedEligibility(test.context, test.slotId)).toEqual({
    current_spell_version_id: validId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });
  expect(
    test.context.scalar(
      'SELECT updated_at FROM spell_selection_slots WHERE id = ?',
      [test.slotId],
    ),
  ).not.toBe('2000-01-01 00:00:00');
  test.db.close();
});

it('persists each active, legacy, level, list, school, and conjunctive-tag failure reason', async () => {
  const test = await fixture({
    spell_level_min: 1,
    spell_level_max: 2,
    allowed_spell_lists: '["Wizard"]',
    allowed_schools: '["Evocation"]',
    allowed_tags: '["fire","damage"]',
  });
  const versions = [
    [
      spell(test.context, 'Inactive', {
        active: false,
        lists: ['Wizard'],
        tags: ['fire', 'damage'],
      }),
      eligibilityInvalidReasons.inactive,
    ],
    [
      spell(test.context, 'Legacy', {
        edition: '2014',
        lists: ['Wizard'],
        tags: ['fire', 'damage'],
      }),
      eligibilityInvalidReasons.legacy,
    ],
    [
      spell(test.context, 'Too High', {
        level: 3,
        lists: ['Wizard'],
        tags: ['fire', 'damage'],
      }),
      eligibilityInvalidReasons.level,
    ],
    [
      spell(test.context, 'Wrong List', {
        lists: ['Cleric'],
        tags: ['fire', 'damage'],
      }),
      eligibilityInvalidReasons.list,
    ],
    [
      spell(test.context, 'Wrong School', {
        school: 'Necromancy',
        lists: ['Wizard'],
        tags: ['fire', 'damage'],
      }),
      eligibilityInvalidReasons.school,
    ],
    [
      spell(test.context, 'Missing Tag', {
        lists: ['Wizard'],
        tags: ['fire'],
      }),
      eligibilityInvalidReasons.tags,
    ],
  ] as const;

  for (const [versionId, reason] of versions) {
    test.context.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?,
           selection_eligibility = 'valid',
           selection_invalid_reason = NULL
       WHERE id = ?`,
      [versionId, test.slotId],
    );
    test.eligibility.refresh(test.slotId);
    expect(storedEligibility(test.context, test.slotId)).toEqual({
      current_spell_version_id: versionId,
      selection_eligibility: 'invalid',
      selection_invalid_reason: reason,
    });
  }
  test.db.close();
});

it('accepts legacy identity-list membership and rejects unsupported collections without overwriting state', async () => {
  const test = await fixture({
    allowed_spell_lists: '["Wizard"]',
    selection_eligibility: 'invalid',
    selection_invalid_reason: 'before refresh',
  });
  test.context.exec(
    'UPDATE characters SET allow_legacy = 1 WHERE id = ?',
    [test.characterId],
  );
  const modernId = spell(test.context, 'Shared Modern', {
    lists: ['Wizard'],
  });
  const identityId = Number(
    test.context.scalar(
      'SELECT spell_identity_id FROM spell_versions WHERE id = ?',
      [modernId],
    ),
  );
  const legacyId = spell(test.context, 'Shared Legacy', {
    identityId,
    edition: '2014',
  });
  test.context.exec(
    `UPDATE spell_selection_slots
     SET current_spell_version_id = ?
     WHERE id = ?`,
    [legacyId, test.slotId],
  );

  test.eligibility.refresh(test.slotId);
  expect(storedEligibility(test.context, test.slotId)).toEqual({
    current_spell_version_id: legacyId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });

  test.context.exec(
    `UPDATE spell_selection_slots
     SET selection_collection = 'wizard_spellbook'
     WHERE id = ?`,
    [test.slotId],
  );
  expect(() => test.eligibility.refresh(test.slotId)).toThrow(
    "Unsupported selection collection 'wizard_spellbook'.",
  );
  expect(storedEligibility(test.context, test.slotId)).toEqual({
    current_spell_version_id: legacyId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });
  test.db.close();
});
