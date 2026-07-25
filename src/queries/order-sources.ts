import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { OrderSource } from '../domain/read-models';
import { jsonRecord, type JsonRecord } from './source-config';

export function orderSources(
  db: DatabaseContext,
  characterId: number,
): OrderSource[] {
  return db.all(
    `SELECT source.id, source.display_name, source.config,
            class.name AS class_name
     FROM character_source_instances AS source
     INNER JOIN class_definitions AS class
       ON class.id = source.source_definition_id
     WHERE source.character_id = ?
       AND source.source_type = 'class'
       AND source.state = 'active'
       AND class.name IN ('Cleric', 'Druid')
     ORDER BY class.name, source.id`,
    [characterId],
    (row): OrderSource => {
      const className = sqlString(row, 'class_name');
      const config = jsonRecord(sqlNullableString(row, 'config'));
      if (className === 'Cleric') {
        const order = config.divine_order as JsonRecord | undefined;
        const chosen = order?.chosen_option;
        return {
          id: sqlInteger(row, 'id'),
          class_name: 'Cleric',
          display_name: sqlString(row, 'display_name'),
          order_name: 'Divine Order',
          chosen_option:
            chosen === 'Protector' || chosen === 'Thaumaturge'
              ? chosen
              : null,
          options: ['Protector', 'Thaumaturge'],
          bonus_option: 'Thaumaturge',
        };
      }
      const order = config.primal_order as JsonRecord | undefined;
      const chosen = order?.chosen_option;
      return {
        id: sqlInteger(row, 'id'),
        class_name: 'Druid',
        display_name: sqlString(row, 'display_name'),
        order_name: 'Primal Order',
        chosen_option:
          chosen === 'Warden' || chosen === 'Magician' ? chosen : null,
        options: ['Warden', 'Magician'],
        bonus_option: 'Magician',
      };
    },
  );
}
