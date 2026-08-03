import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { ContentIdentityCollision } from '../../../src/catalog/content-registry';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';
import { equipmentProjectorV1Vectors } from '../../unit/catalog/fixtures/equipment-projector-v1-vectors';

const records = [
  {
    kind: 'weapon',
    name: 'Storm Pike',
    edition: 'expanded',
    srdGroup: 'martial_melee',
    damage: { kind: 'dice', dice: '1d8' },
    damageType: 'Storm  Fire',
    versatileDamage: { kind: 'dice', dice: '1d10' },
    finesse: false,
    heavy: false,
    light: false,
    loading: false,
    reach: true,
    thrown: true,
    twoHanded: false,
    ammunition: false,
    ammunitionKind: null,
    range: { kind: 'ranged', nearFeet: 20, farFeet: 60 },
    masteryProperty: 'Vex',
    otherProperties: 'Conductive.  \r\nOnly in storms.   \r\n',
  },
  {
    kind: 'armor',
    name: 'Mirror Coat',
    edition: 'expanded',
    category: 'medium',
    armorClass: 15,
    dexBonus: 'capped',
    dexBonusMax: 2,
    strengthRequirement: 11,
    stealthDisadvantage: false,
  },
  {
    kind: 'item',
    name: 'Giant Belt',
    edition: 'expanded',
    description: 'Raises strength.  \r\nWhile worn.   \r\n',
    requiresAttunement: true,
    effects: [{
      kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Giant strength',
      notes: 'Applies while worn.  \r\n',
    }],
  },
] as const;

describe('equipment catalog import', () => {
  let connection: Database | undefined;
  afterEach(() => connection?.close());

  it('installs all hand-pinned aggregates under their derived keys and re-imports as silent exact matches', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    expect(importer.import({
      documents: [JSON.stringify(records)],
      dryRun: true,
    })).toMatchObject({
      weapons_created: 1,
      armors_created: 1,
      items_created: 1,
      item_definition_effects_created: 1,
    });
    expect(db.scalar(
      `SELECT count(*) FROM catalog_content_identities
       WHERE content_kind IN ('weapon', 'armor', 'item')`,
    )).toBe(0);
    const first = importer.import({ documents: [JSON.stringify(records)] });

    expect(first).toMatchObject({
      weapons_created: 1,
      weapons_matched: 0,
      armors_created: 1,
      armors_matched: 0,
      items_created: 1,
      items_matched: 0,
      item_definition_effects_created: 1,
    });
    expect(db.allRaw(
      `SELECT content_kind, content_key
       FROM catalog_content_identities
       WHERE content_kind IN ('weapon', 'armor', 'item')
       ORDER BY content_kind`,
    )).toEqual([
      { content_kind: 'armor', content_key: equipmentProjectorV1Vectors[1].derivedKey },
      { content_kind: 'item', content_key: equipmentProjectorV1Vectors[2].derivedKey },
      { content_kind: 'weapon', content_key: equipmentProjectorV1Vectors[0].derivedKey },
    ]);
    expect(db.oneRaw(
      `SELECT quantity, slot_1_item_id
       FROM character_items
       LEFT JOIN character_attunement_slots ON 0`,
    )).toBeNull();

    expect(importer.import({ documents: [JSON.stringify(records)] })).toMatchObject({
      weapons_created: 0,
      weapons_matched: 1,
      armors_created: 0,
      armors_matched: 1,
      items_created: 0,
      items_matched: 1,
      item_definition_effects_created: 0,
    });
    expect(db.scalar('SELECT count(*) FROM item_definition_effects')).toBe(1);
  });

  it('same-name semantic changes create distinct definitions instead of overwriting', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    const item = records[2];
    importer.import({ documents: [JSON.stringify([item])] });
    importer.import({
      documents: [JSON.stringify([{
        ...item,
        requiresAttunement: false,
      }])],
    });

    expect(db.allRaw(
      `SELECT name, requires_attunement
       FROM item_definitions ORDER BY requires_attunement`,
    )).toEqual([
      { name: 'Giant Belt', requires_attunement: 0 },
      { name: 'Giant Belt', requires_attunement: 1 },
    ]);
  });

  it('equal digest with different canonical bytes throws instead of adopting', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    importer.import({ documents: [JSON.stringify([records[2]])] });
    db.exec(
      `UPDATE catalog_content_fingerprints
       SET canonical_json = '{"tampered":true}'
       WHERE content_kind = 'item'`,
    );

    expect(() =>
      importer.import({ documents: [JSON.stringify([records[2]])] }),
    ).toThrow(ContentIdentityCollision);
  });
});
