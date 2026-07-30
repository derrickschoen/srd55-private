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
  ItemsPanel,
} from '../domain/read-models';
import type { AttunementSlot } from '../domain/attunement';

export class ItemQueries {
  constructor(private readonly db: DatabaseContext) {}

  panel(characterId: number): ItemsPanel {
    return {
      items: this.db.all(
        `SELECT item.id, item.name, item.description,
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
        (row): CharacterItem => ({
          id: sqlInteger(row, 'id'),
          name: sqlString(row, 'name'),
          description: sqlNullableString(row, 'description'),
          requires_attunement: sqlBoolean(row, 'requires_attunement'),
          source_instance_id: sqlNullableInteger(row, 'source_instance_id'),
          attunement_slot:
            sqlNullableInteger(row, 'attunement_slot') as AttunementSlot | null,
        }),
      ),
    };
  }
}
