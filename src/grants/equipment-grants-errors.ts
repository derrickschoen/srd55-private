import {
  rowContractError,
  type RowContractTable,
} from '../domain/contracts/rows';

export class EquipmentBackgroundProjectionKindError extends Error {
  override readonly name = 'EquipmentBackgroundProjectionKindError' as const;
  constructor() {
    super('Stored background projection returned another content kind.');
  }
}

export class EquipmentPackageContentMissingError extends Error {
  override readonly name = 'EquipmentPackageContentMissingError' as const;
  constructor(
    readonly content_kind: 'class' | 'background',
    readonly content_key: string,
  ) {
    super(
      `No ${content_kind} exists for content key "${content_key}", ` +
        'so its equipment package cannot be resolved.',
    );
  }
}

export class EquipmentClassSourceMissingError extends Error {
  override readonly name = 'EquipmentClassSourceMissingError' as const;
  constructor(
    readonly character_id: number,
    readonly content_key: string,
  ) {
    super(
      `Character ${String(character_id)} has no active class source ` +
        `instance for "${content_key}" to record the equipment ` +
        'choice on. The wizard requires a class before anything else ' +
        'happens (D42).',
    );
  }
}

export class EquipmentBackgroundDefinitionMissingError extends Error {
  override readonly name = 'EquipmentBackgroundDefinitionMissingError' as const;
  constructor(readonly content_key: string) {
    super(
      `The background "${content_key}" has no definition in this ` +
        'database, so its equipment choice cannot be recorded.',
    );
  }
}

export type GrantableEquipmentKind = 'weapon' | 'armor';

export class EquipmentTemplateLinkMissingError extends Error {
  override readonly name = 'EquipmentTemplateLinkMissingError' as const;
  constructor(
    readonly item_name: string,
    readonly equipment_kind: GrantableEquipmentKind,
  ) {
    const displayedKind = equipment_kind === 'weapon' ? 'a weapon' : 'armor';
    super(
      `Equipment item "${item_name}" is classified as ${displayedKind} but ` +
        `links no ${equipment_kind} template — the payload CHECK should have refused ` +
        'the seed.',
    );
  }
}

export class EquipmentTemplateMissingError extends Error {
  override readonly name = 'EquipmentTemplateMissingError' as const;
  constructor(
    readonly equipment_kind: GrantableEquipmentKind,
    readonly template_id: number,
    readonly item_name: string,
  ) {
    const displayedKind = equipment_kind === 'weapon' ? 'Weapon' : 'Armor';
    super(
      `${displayedKind} template ${String(template_id)} for "${item_name}" does not exist.`,
    );
  }
}

export class EquipmentWeaponGroupError extends Error {
  override readonly name = 'EquipmentWeaponGroupError' as const;
  constructor(
    readonly template_name: string,
    readonly srd_group: string,
  ) {
    super(
      `Weapon template "${template_name}" carries unknown srd_group "${srd_group}".`,
    );
  }
}

export class EquipmentArmorSlotError extends Error {
  override readonly name = 'EquipmentArmorSlotError' as const;
  constructor(readonly slot: string) {
    super(`Unknown armor slot "${slot}".`);
  }
}

function equipmentRowContractMessage(
  table: RowContractTable,
  row: Readonly<Record<string, unknown>>,
  itemName: string,
): string {
  const label = `Granted ${table} row for "${itemName}"`;
  return rowContractError(table, row, label) ?? `${label} violates its row contract.`;
}

export class EquipmentGrantedRowContractError extends Error {
  override readonly name = 'EquipmentGrantedRowContractError' as const;
  constructor(
    readonly table: 'character_weapons' | 'character_armor',
    readonly row: Readonly<Record<string, unknown>>,
    readonly item_name: string,
  ) {
    super(equipmentRowContractMessage(table, row, item_name));
  }
}
