import type { Database } from '@sqlite.org/sqlite-wasm';
import { expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  eligibilityInvalidReasons,
  SpellSelectionEligibility,
} from '../../../src/eligibility/spell-selection-eligibility';
import { SpellSelectionService } from '../../../src/eligibility/spell-selection-service';
import { openTestDatabase } from '../../helpers/open-db';

interface Fixture {
  db: Database;
  context: DatabaseContext;
  eligibility: SpellSelectionEligibility;
  service: SpellSelectionService;
  characterId: number;
  sourceId: number;
  slotId: number;
}

async function fixture(): Promise<Fixture> {
  const db = await openTestDatabase();
  const context = new DatabaseContext(db);
  const characterId = context.exec(
    "INSERT INTO characters (name) VALUES ('Persistence Character')",
  ).lastInsertId;
  const sourceId = context.exec(
    `INSERT INTO character_source_instances
       (character_id, instance_uuid, source_type, display_name)
     VALUES (?, 'persistence-source', 'feat', 'Persistence Source')`,
    [characterId],
  ).lastInsertId;
  const slotId = context.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, bucket,
       eligibility_kind, spell_level_min, spell_level_max,
       allowed_spell_lists
     ) VALUES (
       ?, ?, 'persistence-slot', 'persistence-rule', 'known',
       'choice_from_list', 0, 0, '["Guard"]'
     )`,
    [characterId, sourceId],
  ).lastInsertId;
  const eligibility = new SpellSelectionEligibility(context);
  return {
    db,
    context,
    eligibility,
    service: new SpellSelectionService(context, eligibility),
    characterId,
    sourceId,
    slotId,
  };
}

function spell(
  context: DatabaseContext,
  name: string,
  options: {
    edition?: string;
    active?: boolean;
    list?: string;
  } = {},
): number {
  const identityId = context.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES (?, ?, ?)`,
    [`identity:${name}`, name, name.toLowerCase()],
  ).lastInsertId;
  const id = context.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES (?, ?, ?, ?, 0, 'Evocation', ?)`,
    [
      `version:${name}`,
      identityId,
      name,
      options.edition ?? '2024',
      options.active === false ? 0 : 1,
    ],
  ).lastInsertId;
  if (options.list !== undefined) {
    context.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, ?)`,
      [id, options.list],
    );
  }
  return id;
}

function stored(context: DatabaseContext, slotId: number) {
  return context.one(
    `SELECT current_spell_version_id, selection_eligibility,
            selection_invalid_reason
     FROM spell_selection_slots WHERE id = ?`,
    [slotId],
  );
}

it('direct selection atomically persists valid state and rejects invalid candidates without a write', async () => {
  const test = await fixture();
  const validId = spell(test.context, 'Valid Direct', {
    list: 'Guard',
  });
  const inactiveId = spell(test.context, 'Inactive Direct', {
    active: false,
    list: 'Guard',
  });
  const wrongListId = spell(test.context, 'Wrong List Direct', {
    list: 'Other',
  });

  test.service.select(test.slotId, validId);
  expect(stored(test.context, test.slotId)).toEqual({
    current_spell_version_id: validId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });

  expect(() => test.service.select(test.slotId, inactiveId)).toThrow(
    eligibilityInvalidReasons.inactive,
  );
  expect(() => test.service.select(test.slotId, wrongListId)).toThrow(
    eligibilityInvalidReasons.list,
  );
  expect(stored(test.context, test.slotId)).toEqual({
    current_spell_version_id: validId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });
  test.db.close();
});

it('direct selection enforces locked slot, active slot, and active owning source guards', async () => {
  const test = await fixture();
  const validId = spell(test.context, 'Guarded Direct', {
    list: 'Guard',
  });

  test.context.exec(
    'UPDATE spell_selection_slots SET is_locked = 1 WHERE id = ?',
    [test.slotId],
  );
  expect(() => test.service.select(test.slotId, validId)).toThrow(
    `Spell selection slot ${test.slotId} is locked.`,
  );
  expect(stored(test.context, test.slotId)).toEqual({
    current_spell_version_id: null,
    selection_eligibility: 'unselected',
    selection_invalid_reason: null,
  });

  test.context.exec(
    `UPDATE spell_selection_slots
     SET is_locked = 0, state = 'orphaned'
     WHERE id = ?`,
    [test.slotId],
  );
  expect(() => test.service.select(test.slotId, validId)).toThrow(
    `Active spell selection slot ${test.slotId} does not exist.`,
  );
  test.context.exec(
    `UPDATE spell_selection_slots SET state = 'active' WHERE id = ?`,
    [test.slotId],
  );
  test.context.exec(
    `UPDATE character_source_instances
     SET state = 'tombstoned'
     WHERE id = ?`,
    [test.sourceId],
  );
  expect(() => test.service.select(test.slotId, validId)).toThrow(
    `Active spell selection slot ${test.slotId} does not exist.`,
  );
  expect(
    test.context.one(
      `SELECT slot.current_spell_version_id, slot.state AS slot_state,
              source.state AS source_state
       FROM spell_selection_slots AS slot
       INNER JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.id = ?`,
      [test.slotId],
    ),
  ).toEqual({
    current_spell_version_id: null,
    slot_state: 'active',
    source_state: 'tombstoned',
  });
  test.db.close();
});

it('refresh retains selected IDs while persisted rules invalidate and later revalidate them', async () => {
  const test = await fixture();
  test.context.exec(
    'UPDATE characters SET allow_legacy = 1 WHERE id = ?',
    [test.characterId],
  );
  const legacyId = spell(test.context, 'Retained Legacy', {
    edition: '2014',
    list: 'Guard',
  });
  test.service.select(test.slotId, legacyId);

  test.context.exec(
    'UPDATE characters SET allow_legacy = 0 WHERE id = ?',
    [test.characterId],
  );
  test.eligibility.refresh(test.slotId);
  expect(stored(test.context, test.slotId)).toEqual({
    current_spell_version_id: legacyId,
    selection_eligibility: 'invalid',
    selection_invalid_reason: eligibilityInvalidReasons.legacy,
  });

  test.context.exec(
    'UPDATE characters SET allow_legacy = 1 WHERE id = ?',
    [test.characterId],
  );
  test.eligibility.refresh(test.slotId);
  expect(stored(test.context, test.slotId)).toEqual({
    current_spell_version_id: legacyId,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  });
  test.db.close();
});
