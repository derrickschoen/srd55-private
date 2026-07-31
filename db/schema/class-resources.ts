import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  sqliteTable,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type {
  ClassDefinitionId,
  ClassResourceFormulaId,
  ClassResourceId,
} from '../../src/domain/ids';
import {
  classFormulaResourceKinds,
  classResourceFormulaKinds,
  classResourceKinds,
  resourceFormulaAbilities,
  type ClassFormulaResourceKind,
  type ClassResourceFormulaKind,
  type ClassResourceKind,
  type ResourceFormulaAbility,
} from '../../src/domain/class-resources';
import {
  datetime,
  integerAtLeast,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  varchar,
} from './columns';
import { class_definitions } from './catalog-classes';

/** One sourced absolute maximum at one exact owning-class level. */
export const class_resources = sqliteTable(
  'class_resources',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassResourceId>(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    class_level: integer('class_level').notNull(),
    resource_kind: varchar<ClassResourceKind>()('resource_kind').notNull(),
    maximum: integer('maximum').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_resources_kind_check',
      oneOf('resource_kind', classResourceKinds),
    ),
    check(
      'class_resources_level_maximum_check',
      sql`typeof(class_level) = 'integer' AND class_level BETWEEN 1 AND 20 AND ${integerAtLeast('maximum', 0)}`,
    ),
    uniqueIndex(
      'class_resources_class_definition_id_class_level_resource_kind_unique',
    ).on(table.class_definition_id, table.class_level, table.resource_kind),
  ],
);

/** One typed source rule for each modeled base-class feature maximum. */
export const class_resource_formulas = sqliteTable(
  'class_resource_formulas',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<ClassResourceFormulaId>(),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id, { onDelete: 'cascade' }),
    resource_kind:
      varchar<ClassFormulaResourceKind>()('resource_kind').notNull(),
    formula_kind:
      varchar<ClassResourceFormulaKind>()('formula_kind').notNull(),
    minimum_class_level: integer('minimum_class_level').notNull(),
    fixed_count: integer('fixed_count'),
    ability: varchar<ResourceFormulaAbility>()('ability'),
    multiplier: integer('multiplier'),
    later_fixed_count_steps: sqlText()('later_fixed_count_steps'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    check(
      'class_resource_formulas_resource_kind_check',
      oneOf('resource_kind', classFormulaResourceKinds),
    ),
    check(
      'class_resource_formulas_formula_kind_check',
      oneOf('formula_kind', classResourceFormulaKinds),
    ),
    check(
      'class_resource_formulas_level_check',
      sql`typeof(minimum_class_level) = 'integer' AND minimum_class_level BETWEEN 1 AND 20`,
    ),
    check(
      'class_resource_formulas_fixed_count_check',
      nullOrIntegerAtLeast('fixed_count', 1),
    ),
    check(
      'class_resource_formulas_ability_check',
      nullOrOneOf('ability', resourceFormulaAbilities),
    ),
    check(
      'class_resource_formulas_multiplier_check',
      nullOrIntegerAtLeast('multiplier', 1),
    ),
    check(
      'class_resource_formulas_payload_check',
      sql`(
        formula_kind IS 'fixed_count'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'fixed_count_by_class_level'
        AND fixed_count IS NOT NULL
        AND ability IS NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NOT NULL
      ) OR (
        formula_kind IS 'ability_modifier_minimum_one'
        AND fixed_count IS NULL
        AND ability IS NOT NULL
        AND multiplier IS NULL
        AND later_fixed_count_steps IS NULL
      ) OR (
        formula_kind IS 'class_level_multiple'
        AND fixed_count IS NULL
        AND ability IS NULL
        AND multiplier IS NOT NULL
        AND later_fixed_count_steps IS NULL
      )`,
    ),
    check(
      'class_resource_formulas_steps_json_check',
      sql`later_fixed_count_steps IS NULL OR (
        json_valid(later_fixed_count_steps)
        AND json_type(later_fixed_count_steps) IS 'array'
        AND json_array_length(later_fixed_count_steps) > 0
      )`,
    ),
    uniqueIndex(
      'class_resource_formulas_class_definition_id_resource_kind_unique',
    ).on(table.class_definition_id, table.resource_kind),
  ],
);
