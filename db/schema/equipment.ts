import {
  check,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type {
  ArmorTemplateId,
  ClassDefinitionId,
  ClassEquipmentItemId,
  WeaponTemplateId,
} from '../../src/domain/ids';
import type {
  ClassEquipmentOption,
  EquipmentItemKind,
} from '../../src/domain/enums';
import {
  classEquipmentOptions,
  equipmentItemKinds,
} from '../../src/domain/enums';
import {
  datetime,
  equipmentItemPayload,
  integerAtLeast,
  oneOf,
  varchar,
} from './columns';
import { class_definitions } from './catalog-classes';
import { armor_templates } from './sheet';
import { weapon_templates } from './weapons';

/**
 * One printed line of one class starting-equipment package.
 *
 * This is the same package-item model as `background_equipment_items`: ordered
 * quantity-plus-name rows with an optional exact catalog link. The only
 * different rule is the parent and its option vocabulary — Fighter prints C,
 * while backgrounds cannot.
 */
export const class_equipment_items = sqliteTable(
  'class_equipment_items',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassEquipmentItemId>(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    option: varchar<ClassEquipmentOption>()('option').notNull(),
    sort_order: integer('sort_order').notNull(),
    quantity: integer('quantity').notNull(),
    /**
     * Source wording after the leading quantity has moved to `quantity`.
     * Parenthetical qualifiers and pluralisation remain untouched.
     */
    item_name: varchar()('item_name').notNull(),
    item_kind: varchar<EquipmentItemKind>()('item_kind').notNull(),
    weapon_template_id: integer('weapon_template_id')
      .$type<WeaponTemplateId>()
      .references(() => weapon_templates.id, { onDelete: 'restrict' }),
    armor_template_id: integer('armor_template_id')
      .$type<ArmorTemplateId>()
      .references(() => armor_templates.id, { onDelete: 'restrict' }),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_equipment_items_option_check',
      oneOf('option', classEquipmentOptions),
    ),
    check(
      'class_equipment_items_item_kind_check',
      oneOf('item_kind', equipmentItemKinds),
    ),
    check(
      'class_equipment_items_sort_order_check',
      integerAtLeast('sort_order', 1),
    ),
    check(
      'class_equipment_items_quantity_check',
      integerAtLeast('quantity', 1),
    ),
    check(
      'class_equipment_items_payload_check',
      equipmentItemPayload(
        'item_kind',
        'weapon_template_id',
        'armor_template_id',
      ),
    ),
    uniqueIndex(
      'class_equipment_items_class_option_sort_order_unique',
    ).on(table.class_definition_id, table.option, table.sort_order),
    index('class_equipment_items_class_definition_id_index').on(
      table.class_definition_id,
    ),
  ],
);
