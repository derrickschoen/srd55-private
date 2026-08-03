import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  CharacterItem,
  ItemDefinition,
  ItemsPanel,
} from '../domain/read-models';
import type { AttunementSlot } from '../domain/attunement';
import { readOwnedEffectsByOwner } from '../commands/equipment-effects';
import { equipmentEffectInput, projectStoredEquipmentContentV1 } from '../catalog/equipment-content-projector-v1';
import type { ContentKey } from '../domain/ids';

export class ItemQueries {
  constructor(private readonly db: DatabaseContext) {}

  panel(characterId: number): ItemsPanel {
    const effectsByItem = readOwnedEffectsByOwner(
      this.db,
      characterId,
      'character_item_id',
    );
    const items = this.db.all(
      `SELECT item.id, item.name, item.description, item.quantity,
              item.requires_attunement, item.source_instance_id,
              CASE
                WHEN slots.slot_1_item_id = item.id THEN 1
                WHEN slots.slot_2_item_id = item.id THEN 2
                WHEN slots.slot_3_item_id = item.id THEN 3
                ELSE NULL
              END AS attunement_slot
       FROM character_items AS item
       LEFT JOIN character_attunement_slots AS slots
         ON slots.character_id = item.character_id
       WHERE item.character_id = ?
       ORDER BY item.name, item.id`,
      [characterId],
      (row): CharacterItem => {
        const id = sqlInteger(row, 'id');
        return {
          id,
          name: sqlString(row, 'name'),
          description: sqlNullableString(row, 'description'),
          quantity: sqlInteger(row, 'quantity'),
          requires_attunement: sqlBoolean(row, 'requires_attunement'),
          source_instance_id: sqlNullableInteger(row, 'source_instance_id'),
          attunement_slot:
            sqlNullableInteger(row, 'attunement_slot') as AttunementSlot | null,
          effects: effectsByItem.get(id) ?? [],
        };
      },
    );
    const definitionRoots = this.db.all(
      `SELECT content_key FROM item_definitions ORDER BY name, id`,
      [],
      (row) => sqlString(row, 'content_key') as ContentKey,
    );
    const definitions: ItemDefinition[] = definitionRoots.map((contentKey) => {
      const stored = projectStoredEquipmentContentV1(this.db, {
        kind: 'item',
        contentKey,
      });
      return {
        content_key: contentKey,
        name: stored.aggregate.name,
        description: stored.aggregate.description,
        requires_attunement: stored.aggregate.requires_attunement,
        effects: stored.aggregate.effects.map(equipmentEffectInput),
      };
    });
    return {
      items,
      definitions,
    };
  }
}
