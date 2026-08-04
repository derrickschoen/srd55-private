import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  projectStoredAuthoredContentV1,
  type StoredAuthoredReferenceResolverV1,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { applicationSeed } from '../../../src/db/bootstrap';
import { openTestDatabase } from '../../helpers/open-db';

const unsupported = (): never => {
  throw new Error('Template-only species must not resolve definition references.');
};
const references: StoredAuthoredReferenceResolverV1 = {
  spell: unsupported,
  featByStoredName: unsupported,
  class: unsupported,
  weapon: unsupported,
  armor: unsupported,
  sourceDefinition: unsupported,
};

describe('stored bundled template-only species projection', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
  });

  afterEach(() => connection.close());

  it('projects all five boot-seeded template-only species without fabricating definitions', () => {
    for (const name of ['Dragonborn', 'Dwarf', 'Goliath', 'Halfling', 'Orc']) {
      const contentKey = `2024:species:${name.toLowerCase()}` as ContentKey;
      expect(db.scalar('SELECT COUNT(*) FROM species_definitions WHERE content_key = ?', [contentKey])).toBe(0);
      const projection = projectStoredAuthoredContentV1(db, {
        kind: 'species', contentKey, references,
      });
      expect(projection.aggregate).toMatchObject({
        name, definition_state: 'template_only',
      });
      expect(projection.payload).toMatchObject({ definition_state: 'template_only' });
      expect(projection.payload).not.toHaveProperty('reference_text');
      expect(projection.payload).not.toHaveProperty('grants');
    }
  });
});
