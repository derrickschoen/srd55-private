import { describe, expect, it } from 'vitest';
import {
  parseEquipmentPackage,
  type EquipmentCatalogLink,
} from '../../../src/rules/equipment-packages';

class EquipmentPackageFixtureError extends Error {
  override readonly name = 'EquipmentPackageFixtureError' as const;
}

const links = new Map<string, EquipmentCatalogLink>([
  ['Arrows', { item_kind: 'weapon', content_key: 'fixture:arrows' }],
]);

function parse(printed: string) {
  return parseEquipmentPackage(
    'Boundary Fixture',
    'a',
    printed,
    (name) => links.get(name) ?? null,
    (message) => new EquipmentPackageFixtureError(message),
  );
}

describe('equipment package list and quantity boundaries', () => {
  it('removes only the final Oxford-comma conjunction and preserves exact rows', () => {
    expect(parse('Rope, and Torch')).toEqual([
      {
        option: 'a',
        sort_order: 1,
        quantity: 1,
        item_name: 'Rope',
        item_kind: 'gear',
        weapon_content_key: null,
        armor_content_key: null,
      },
      {
        option: 'a',
        sort_order: 2,
        quantity: 1,
        item_name: 'Torch',
        item_kind: 'gear',
        weapon_content_key: null,
        armor_content_key: null,
      },
    ]);
    expect(parse('and Rope, Torch').map((item) => item.item_name)).toEqual([
      'and Rope',
      'Torch',
    ]);
  });

  it.each(['', 'Rope,', ',Rope', 'Rope, ,Torch'])(
    'refuses the empty list entry in %j',
    (printed) => {
      expect(() => parse(printed)).toThrow(EquipmentPackageFixtureError);
    },
  );

  it('pins quantity zero as invalid and one as a retained numeric count', () => {
    expect(() => parse('0 Arrows')).toThrow(EquipmentPackageFixtureError);
    expect(parse('1 Arrows')).toEqual([
      {
        option: 'a',
        sort_order: 1,
        quantity: 1,
        item_name: 'Arrows',
        item_kind: 'weapon',
        weapon_content_key: 'fixture:arrows',
        armor_content_key: null,
      },
    ]);
  });
});
