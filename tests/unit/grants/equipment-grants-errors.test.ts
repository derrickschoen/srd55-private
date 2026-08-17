import { describe, expect, it } from 'vitest';
import {
  EquipmentArmorSlotError,
  EquipmentBackgroundDefinitionMissingError,
  EquipmentBackgroundProjectionKindError,
  EquipmentClassSourceMissingError,
  EquipmentGrantedRowContractError,
  EquipmentPackageContentMissingError,
  EquipmentTemplateLinkMissingError,
  EquipmentTemplateMissingError,
  EquipmentWeaponGroupError,
} from '../../../src/grants/equipment-grants-errors';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const invalidArmorRow = { id: 'wrong' };
const cases: readonly FormatterCase[] = [
  {
    error: new EquipmentBackgroundProjectionKindError(),
    message: 'Stored background projection returned another content kind.',
    params: {},
  },
  {
    error: new EquipmentPackageContentMissingError('class', '2024:class:wizard'),
    message: 'No class exists for content key "2024:class:wizard", so its equipment package cannot be resolved.',
    params: { content_kind: 'class', content_key: '2024:class:wizard' },
  },
  {
    error: new EquipmentClassSourceMissingError(7, '2024:class:wizard'),
    message: 'Character 7 has no active class source instance for "2024:class:wizard" to record the equipment choice on. The wizard requires a class before anything else happens (D42).',
    params: { character_id: 7, content_key: '2024:class:wizard' },
  },
  {
    error: new EquipmentBackgroundDefinitionMissingError('2024:background:sage'),
    message: 'The background "2024:background:sage" has no definition in this database, so its equipment choice cannot be recorded.',
    params: { content_key: '2024:background:sage' },
  },
  {
    error: new EquipmentTemplateLinkMissingError('Longsword', 'weapon'),
    message: 'Equipment item "Longsword" is classified as a weapon but links no weapon template — the payload CHECK should have refused the seed.',
    params: { item_name: 'Longsword', equipment_kind: 'weapon' },
  },
  {
    error: new EquipmentTemplateMissingError('armor', 11, 'Chain Mail'),
    message: 'Armor template 11 for "Chain Mail" does not exist.',
    params: { equipment_kind: 'armor', template_id: 11, item_name: 'Chain Mail' },
  },
  {
    error: new EquipmentWeaponGroupError('Longsword', 'future'),
    message: 'Weapon template "Longsword" carries unknown srd_group "future".',
    params: { template_name: 'Longsword', srd_group: 'future' },
  },
  {
    error: new EquipmentArmorSlotError('pack'),
    message: 'Unknown armor slot "pack".',
    params: { slot: 'pack' },
  },
  {
    error: new EquipmentGrantedRowContractError(
      'character_armor',
      invalidArmorRow,
      'Chain Mail',
    ),
    message: 'Granted character_armor row for "Chain Mail".id: Invalid input: expected number, received string.',
    params: {
      table: 'character_armor',
      row: invalidArmorRow,
      item_name: 'Chain Mail',
    },
  },
];

describe('equipment-grant error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });
});
