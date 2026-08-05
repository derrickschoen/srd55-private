import type { Database } from '@sqlite.org/sqlite-wasm';
import { expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  EligibleSpellSearch,
  EligibleSpellSearchNotFoundError,
} from '../../../src/eligibility/eligible-spell-search';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openTestDatabase } from '../../helpers/open-db';

interface SearchFixture {
  db: Database;
  context: DatabaseContext;
  search: EligibleSpellSearch;
  characterId: number;
  sourceId: number;
  slotId: number;
}

let spellSequence = 0;

async function fixture(
  slotOverrides: Record<string, string | number | null> = {},
): Promise<SearchFixture> {
  const db = await openTestDatabase();
  const context = new DatabaseContext(db);
  const characterId = context.exec(
    "INSERT INTO characters (name) VALUES ('Search Character')",
  ).lastInsertId;
  const sourceId = context.exec(
    `INSERT INTO character_source_instances
       (character_id, instance_uuid, source_type, display_name)
     VALUES (?, 'search-source', 'feat', 'Search Source')`,
    [characterId],
  ).lastInsertId;
  const columns = Object.keys(slotOverrides);
  const slotId = context.exec(
    `INSERT INTO spell_selection_slots (
       character_id, source_instance_id, slot_key, rule_key, bucket,
       eligibility_kind${columns.length === 0 ? '' : `, ${columns.join(', ')}`}
     ) VALUES (
       ?, ?, 'search-slot', 'search-rule', 'known',
       'choice_from_list'${columns.length === 0 ? '' : `, ${columns.map(() => '?').join(', ')}`}
     )`,
    [characterId, sourceId, ...Object.values(slotOverrides)],
  ).lastInsertId;
  return {
    db,
    context,
    search: new EligibleSpellSearch(context),
    characterId,
    sourceId,
    slotId,
  };
}

function spell(
  context: DatabaseContext,
  name: string,
  options: {
    identityId?: number;
    edition?: string;
    level?: number;
    school?: string;
    active?: boolean;
    ritual?: boolean;
    concentration?: boolean;
    lists?: readonly string[];
    tags?: readonly string[];
  } = {},
): number {
  spellSequence += 1;
  const unique = `${name}:${options.edition ?? '2024'}:${spellSequence}`;
  registerFixtureContentIdentity(context, {
    kind: 'spell', contentKey: `version:${unique}`, name,
    keyKind: 'bundled-stable',
  });
  const identityId =
    options.identityId ??
    context.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`identity:${unique}`, name, name.toLowerCase()],
    ).lastInsertId;
  const id = context.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, ritual, concentration, is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `version:${unique}`,
      identityId,
      name,
      options.edition ?? '2024',
      options.level ?? 0,
      options.school ?? 'Evocation',
      options.ritual ? 1 : 0,
      options.concentration ? 1 : 0,
      options.active === false ? 0 : 1,
    ],
  ).lastInsertId;
  for (const list of options.lists ?? []) {
    context.exec(
      `INSERT INTO spell_list_memberships
         (spell_version_id, spell_list_key)
       VALUES (?, ?)`,
      [id, list],
    );
  }
  for (const tag of options.tags ?? []) {
    context.exec(
      'INSERT INTO spell_version_tags (spell_version_id, tag) VALUES (?, ?)',
      [id, tag],
    );
  }
  return id;
}

it('returns exact DTOs, treats wildcard text literally, and follows the persisted legacy switch', async () => {
  const test = await fixture({
    spell_level_min: 0,
    spell_level_max: 0,
    allowed_spell_lists: '["Wizard"]',
  });
  const modernId = spell(test.context, 'Mage Hand', {
    lists: ['Wizard'],
  });
  const identityId = Number(
    test.context.scalar(
      'SELECT spell_identity_id FROM spell_versions WHERE id = ?',
      [modernId],
    ),
  );
  const legacyId = spell(test.context, 'Mage Hand', {
    identityId,
    edition: '2014',
  });
  spell(test.context, 'Mage Hand Inactive', {
    active: false,
    lists: ['Wizard'],
  });
  const wildcardId = spell(test.context, 'Glyph %_ Probe', {
    lists: ['Wizard'],
    ritual: true,
    concentration: true,
  });

  expect(test.search.search(test.characterId, test.slotId, 'Mage')).toEqual([
    {
      id: modernId,
      name: 'Mage Hand',
      level: 0,
      school: 'Evocation',
      ritual: false,
      concentration: false,
      edition: '2024',
    },
  ]);
  expect(test.search.search(test.characterId, test.slotId, '%')).toEqual([
    {
      id: wildcardId,
      name: 'Glyph %_ Probe',
      level: 0,
      school: 'Evocation',
      ritual: true,
      concentration: true,
      edition: '2024',
    },
  ]);

  test.context.exec(
    'UPDATE characters SET allow_legacy = 1 WHERE id = ?',
    [test.characterId],
  );
  expect(
    test.search
      .search(test.characterId, test.slotId, 'Mage Hand')
      .map(({ id, edition }) => ({ id, edition })),
  ).toEqual([
    { id: modernId, edition: '2024' },
    { id: legacyId, edition: '2014' },
  ]);
  expect(
    test.context.oneRaw(
      `SELECT allow_legacy FROM characters WHERE id = ?`,
      [test.characterId],
    ),
  ).toEqual({ allow_legacy: 1 });
  expect(
    test.context.oneRaw(
      `SELECT current_spell_version_id, selection_eligibility
       FROM spell_selection_slots WHERE id = ?`,
      [test.slotId],
    ),
  ).toEqual({
    current_spell_version_id: null,
    selection_eligibility: 'unselected',
  });
  test.db.close();
});

it('applies level, list, school, and every tag before the stable fifty-result cap', async () => {
  const test = await fixture({
    spell_level_min: 1,
    spell_level_max: 1,
    allowed_spell_lists: '["Wizard"]',
    allowed_schools: '["Evocation"]',
    allowed_tags: '["damage","fire"]',
  });

  for (let index = 0; index < 50; index += 1) {
    spell(test.context, `Probe ${String(index).padStart(2, '0')} Crowder`, {
      level: 1,
      school: 'Evocation',
      tags: ['damage', 'fire'],
    });
  }
  for (let index = 0; index < 51; index += 1) {
    spell(test.context, `Probe ${String(index).padStart(2, '0')} Valid`, {
      level: 1,
      school: 'Evocation',
      lists: ['Wizard'],
      tags: ['damage', 'fire'],
    });
  }
  spell(test.context, 'Probe Wrong Level', {
    level: 2,
    lists: ['Wizard'],
    tags: ['damage', 'fire'],
  });
  spell(test.context, 'Probe Wrong School', {
    level: 1,
    school: 'Necromancy',
    lists: ['Wizard'],
    tags: ['damage', 'fire'],
  });
  spell(test.context, 'Probe Missing Tag', {
    level: 1,
    lists: ['Wizard'],
    tags: ['damage'],
  });

  const results = test.search.search(
    test.characterId,
    test.slotId,
    'Probe',
  );
  expect(results).toHaveLength(50);
  expect(results.map(({ name }) => name)).toEqual(
    Array.from(
      { length: 50 },
      (_, index) => `Probe ${String(index).padStart(2, '0')} Valid`,
    ),
  );
  expect(
    test.context.oneRaw(
      `SELECT spell_level_min, spell_level_max, allowed_spell_lists,
              allowed_schools, allowed_tags
       FROM spell_selection_slots WHERE id = ?`,
      [test.slotId],
    ),
  ).toEqual({
    spell_level_min: 1,
    spell_level_max: 1,
    allowed_spell_lists: '["Wizard"]',
    allowed_schools: '["Evocation"]',
    allowed_tags: '["damage","fire"]',
  });
  test.db.close();
});

it('rejects cross-character slot lookup and preserves persisted ownership', async () => {
  const test = await fixture();
  const attackerId = test.context.exec(
    "INSERT INTO characters (name) VALUES ('Search Attacker')",
  ).lastInsertId;
  spell(test.context, 'Ownership Probe');

  expect(() =>
    test.search.search(attackerId, test.slotId, 'Probe'),
  ).toThrow(EligibleSpellSearchNotFoundError);
  expect(
    test.context.oneRaw(
      `SELECT slot.character_id, source.character_id AS source_character_id
       FROM spell_selection_slots AS slot
       INNER JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.id = ?`,
      [test.slotId],
    ),
  ).toEqual({
    character_id: test.characterId,
    source_character_id: test.characterId,
  });
  expect(
    test.context.scalar(
      'SELECT count(*) FROM spell_selection_slots WHERE character_id = ?',
      [attackerId],
    ),
  ).toBe(0);
  test.db.close();
});

it('answers hasAny exactly as search does across list, school, tag, and legacy constraints', async () => {
  const shapes: Record<string, string | number | null>[] = [
    { spell_level_min: 0, spell_level_max: 0 },
    { spell_level_min: 3, spell_level_max: 3 },
    { allowed_spell_lists: '["Wizard"]' },
    { allowed_spell_lists: '["Bard"]' },
    { allowed_schools: '["Evocation"]' },
    { allowed_schools: '["Necromancy"]' },
    { allowed_tags: '["damage"]' },
    { allowed_tags: '["damage","fire"]' },
    { spell_level_min: 1, spell_level_max: 1, allowed_spell_lists: '["Wizard"]' },
  ];
  const probes: boolean[] = [];
  const searches: boolean[] = [];

  for (const allowLegacy of [0, 1]) {
    for (const shape of shapes) {
      const test = await fixture(shape);
      test.context.exec(
        'UPDATE characters SET allow_legacy = ? WHERE id = ?',
        [allowLegacy, test.characterId],
      );
      spell(test.context, 'Legacy Only Bolt', {
        edition: '2014',
        level: 1,
        lists: ['Wizard'],
        tags: ['damage'],
      });
      spell(test.context, 'Modern Cantrip', {
        level: 0,
        lists: ['Wizard'],
        tags: ['damage'],
      });
      spell(test.context, 'Inactive Necromancy', {
        level: 0,
        school: 'Necromancy',
        active: false,
      });
      probes.push(test.search.hasAny(test.characterId, test.slotId));
      searches.push(
        test.search.search(test.characterId, test.slotId, '').length > 0,
      );
      test.db.close();
    }
  }

  expect(probes).toEqual(searches);
  expect(probes).toContain(true);
  expect(probes).toContain(false);
});

it('rejects a cross-character hasAny probe the same way search does', async () => {
  const test = await fixture();
  const attackerId = test.context.exec(
    "INSERT INTO characters (name) VALUES ('Probe Attacker')",
  ).lastInsertId;

  expect(() => test.search.hasAny(attackerId, test.slotId)).toThrow(
    EligibleSpellSearchNotFoundError,
  );
  test.db.close();
});
