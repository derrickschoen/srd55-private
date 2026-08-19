import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectStoredPortableContentV1 } from '../../../src/catalog/stored-content-projector-v1';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { registerFixtureContentIdentity } from '../../helpers/content-identity';
import { openSeededTestDatabase } from '../../helpers/open-db';

const CONTENT_KEY = 'fixture:wrong-projection-owner' as ContentKey;
const PROJECTOR_MODULE = '../../../src/catalog/stored-content-projector-v1';

describe('background equipment projection owner guard', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openSeededTestDatabase();
    db = new DatabaseContext(connection);
    registerFixtureContentIdentity(db, {
      kind: 'background',
      contentKey: CONTENT_KEY,
      name: 'Wrong Projection Owner',
      keyKind: 'bundled-stable',
    });
    db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules, notes
       ) VALUES (?, 'Wrong Projection Owner', 'expanded', 0, '[]', '')`,
      [CONTENT_KEY],
    );
    db.exec(
      `INSERT INTO background_templates (
         content_key, name, rules_edition, ability_score_1, ability_score_2,
         ability_score_3, feat_name, default_origin_feat_content_key,
         skill_proficiency_1, skill_proficiency_2, tool_proficiency,
         equipment_option_a, equipment_option_b
       )
       SELECT ?, 'Wrong Projection Owner', 'expanded', ability_score_1,
              ability_score_2, ability_score_3, feat_name,
              default_origin_feat_content_key, skill_proficiency_1,
              skill_proficiency_2, tool_proficiency, equipment_option_a,
              equipment_option_b
       FROM background_templates
       WHERE content_key = '2024:background:acolyte'`,
      [CONTENT_KEY],
    );
  });

  afterEach(() => {
    vi.doUnmock(PROJECTOR_MODULE);
    vi.resetModules();
    connection.close();
  });

  it('refuses a non-background portable projection before reading package rows', async () => {
    expect(
      projectStoredPortableContentV1(db, 'background', CONTENT_KEY).kind,
    ).toBe('background');

    vi.resetModules();
    vi.doMock(PROJECTOR_MODULE, async (importOriginal) => ({
      ...await importOriginal<typeof import('../../../src/catalog/stored-content-projector-v1')>(),
      projectStoredPortableContentV1: () => ({
        kind: 'species',
        aggregate: {},
      }),
    }));
    const [equipmentGrants, equipmentErrors] = await Promise.all([
      import('../../../src/grants/equipment-grants'),
      import('../../../src/grants/equipment-grants-errors'),
    ]);

    expect(() => equipmentGrants.applyEquipmentPackageChoice(db, {
      character_id: 91,
      content_key: CONTENT_KEY,
      kind: 'background',
      option: 'a',
    })).toThrow(equipmentErrors.EquipmentBackgroundProjectionKindError);
  });
});
