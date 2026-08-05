import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { ContentIdentityCollision } from '../../../src/catalog/content-registry';
import {
  UnsupportedItemDefinitionEffect,
} from '../../../src/catalog/equipment-importer';
import { DatabaseContext } from '../../../src/db/database';
import { assertContentImportPlan } from '../../helpers/content-import-plan';
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

  it('installs all hand-pinned aggregates under asserted name-derived keys and re-imports as silent exact matches', async () => {
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
      { content_kind: 'armor', content_key: assertedExternalContentKey('armor', 'expanded', 'Mirror Coat') },
      { content_kind: 'item', content_key: assertedExternalContentKey('item', 'expanded', 'Giant Belt') },
      { content_kind: 'weapon', content_key: assertedExternalContentKey('weapon', 'expanded', 'Storm Pike') },
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

  it('same-name semantic changes require review instead of overwriting the asserted key', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);
    const item = records[2];
    importer.import({ documents: [JSON.stringify([item])] });
    const plan = importer.import({
      documents: [JSON.stringify([{ ...item, requiresAttunement: false }])],
    });
    assertContentImportPlan(
      plan,
      'Expected the asserted item change to require content review.',
    );
    expect(plan.reviews).toEqual([
      expect.objectContaining({ kind: 'item', matchClass: 'key-collision' }),
    ]);

    expect(db.allRaw(
      `SELECT name, requires_attunement
       FROM item_definitions ORDER BY requires_attunement`,
    )).toEqual([{ name: 'Giant Belt', requires_attunement: 1 }]);
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

    const refused = importer.import({
      documents: [JSON.stringify([records[2]])],
    });
    assertContentImportPlan(
      refused,
      'Expected the colliding item import to return a plan.',
    );
    expect(refused.outcomes).toEqual([
      expect.objectContaining({ kind: 'refused', reason: 'identity_collision' }),
    ]);
  });

  it.each([
    {
      label: 'ability_increase without source-instance provenance',
      effect: {
        kind: 'ability_increase',
        ability: 'strength',
        amount: 2,
        maximum: 20,
        label: 'Unowned increase',
        notes: null,
      },
      reason: 'requires_source_instance',
      messageFragment: 'source-instance provenance',
      followUp: 'ITEM-DEFINITION-SOURCE-PROVENANCE',
    },
    {
      label: 'one_bonded_weapon attack_ability_override without a binding',
      effect: {
        kind: 'attack_ability_override',
        ability: 'charisma',
        weaponScope: 'one_bonded_weapon',
        label: 'Unbound attack ability',
        notes: null,
      },
      reason: 'requires_bonded_weapon_binding',
      messageFragment: "weapon_scope 'one_bonded_weapon'",
      followUp: 'ITEM-DEFINITION-BONDED-WEAPON-BINDING',
    },
    {
      label: 'one_bonded_weapon weapon_attack_bonus without a binding',
      effect: {
        kind: 'weapon_attack_bonus',
        amount: 1,
        weaponScope: 'one_bonded_weapon',
        label: 'Unbound attack bonus',
        notes: null,
      },
      reason: 'requires_bonded_weapon_binding',
      messageFragment: "weapon_scope 'one_bonded_weapon'",
      followUp: 'ITEM-DEFINITION-BONDED-WEAPON-BINDING',
    },
    {
      label: 'one_bonded_weapon weapon_damage_bonus without a binding',
      effect: {
        kind: 'weapon_damage_bonus',
        amount: 1,
        weaponScope: 'one_bonded_weapon',
        label: 'Unbound damage bonus',
        notes: null,
      },
      reason: 'requires_bonded_weapon_binding',
      messageFragment: "weapon_scope 'one_bonded_weapon'",
      followUp: 'ITEM-DEFINITION-BONDED-WEAPON-BINDING',
    },
  ] as const)(
    'refuses item definition $label',
    async ({ effect, reason, messageFragment, followUp }) => {
      connection = await openTestDatabase();
      const db = new DatabaseContext(connection);
      const importer = new CatalogImporter(db);
      let refusal: unknown;

      try {
        importer.import({
          documents: [JSON.stringify([{
            kind: 'item',
            name: 'Unsupported Focus',
            edition: 'expanded',
            description: 'Cannot cross the item picker seam.',
            requiresAttunement: true,
            effects: [effect],
          }])],
        });
      } catch (error) {
        refusal = error;
      }

      expect(refusal).toBeInstanceOf(UnsupportedItemDefinitionEffect);
      if (!(refusal instanceof UnsupportedItemDefinitionEffect)) {
        throw new Error('Expected a typed unsupported item-effect refusal.');
      }
      expect(refusal.effectKind).toBe(effect.kind);
      expect(refusal.reason).toBe(reason);
      expect(refusal.message).toContain(`'${effect.kind}'`);
      expect(refusal.message).toContain('Unsupported Focus');
      expect(refusal.message).toContain(messageFragment);
      expect(refusal.message).toContain(followUp);
      expect(db.scalar('SELECT count(*) FROM item_definitions')).toBe(0);
    },
  );

  it('imports any_weapon item effects because they need no binding choice', async () => {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    const importer = new CatalogImporter(db);

    expect(importer.import({
      documents: [JSON.stringify([{
        kind: 'item',
        name: 'Universal Weapon Focus',
        edition: 'expanded',
        description: 'Applies without selecting one bonded weapon.',
        requiresAttunement: true,
        effects: [
          {
            kind: 'attack_ability_override',
            ability: 'charisma',
            weaponScope: 'any_weapon',
            label: 'Universal attack ability',
            notes: null,
          },
          {
            kind: 'weapon_attack_bonus',
            amount: 1,
            weaponScope: 'any_weapon',
            label: 'Universal attack bonus',
            notes: null,
          },
          {
            kind: 'weapon_damage_bonus',
            amount: 1,
            weaponScope: 'any_weapon',
            label: 'Universal damage bonus',
            notes: null,
          },
        ],
      }])],
    })).toMatchObject({
      items_created: 1,
      item_definition_effects_created: 3,
    });
    expect(db.scalar('SELECT count(*) FROM item_definition_effects')).toBe(3);
  });
});
