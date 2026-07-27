import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableJson,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  ClassDefinitionRow,
  DefinitionRow,
  SpellVersionRow,
  SubclassDefinitionRow,
} from '../domain/models';
import type {
  Ability,
  EffectReliabilityCategory,
  MaterialCostKind,
  ProgressionType,
  RulesEdition,
  SpellAreaShape,
  SpellRangeKind,
  StandaloneSourceType,
  UpcastScale,
} from '../domain/enums';

/**
 * A spell version plus its aggregated list and tag memberships.
 *
 * NO LONGER `Omit<SpellVersionRow, 'components'>`. That omission existed solely
 * to re-declare `components` as `string | null` against a model type that said
 * `JsonValue | null` while the column was `VARCHAR` and the importer wrote a
 * string. `SpellVersionRow` now agrees with its writer, so there is nothing to
 * omit and nothing to restate.
 *
 * `upcastLevels` IS THE ONE FIELD THAT IS NOT A COLUMN. The levels a spell can
 * be upcast at are rows in `spell_version_upcast_levels`, aggregated in the
 * same way `lists` and `tags` are, and sorted ASCENDING so a consumer never has
 * to sort a "list of levels" itself.
 */
export interface CatalogSpell extends SpellVersionRow {
  readonly lists: string[];
  readonly tags: string[];
  readonly upcastLevels: number[];
}

export interface CatalogSnapshot {
  readonly classes: ClassDefinitionRow[];
  readonly subclasses: SubclassDefinitionRow[];
  readonly sources: Readonly<
    Record<StandaloneSourceType, DefinitionRow[]>
  >;
  readonly spells: CatalogSpell[];
}

function timestamps(row: SqlRow) {
  return {
    created_at: sqlNullableString(row, 'created_at'),
    updated_at: sqlNullableString(row, 'updated_at'),
  };
}

function decodeClass(row: SqlRow): ClassDefinitionRow {
  return {
    id: sqlInteger(row, 'id'),
    content_key: sqlString(row, 'content_key'),
    name: sqlString(row, 'name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    spellcasting_ability: sqlNullableString(
      row,
      'spellcasting_ability',
    ) as Ability | null,
    progression_type: sqlString(
      row,
      'progression_type',
    ) as ProgressionType,
    caster_fraction: sqlNullableString(row, 'caster_fraction'),
    caster_rounding: sqlNullableString(row, 'caster_rounding'),
    prepares_or_knows: sqlNullableString(row, 'prepares_or_knows'),
    supports_ritual_casting: sqlBoolean(
      row,
      'supports_ritual_casting',
    ),
    ritual_casting_mode: sqlNullableString(row, 'ritual_casting_mode'),
    primary_ability_expression: sqlNullableString(
      row,
      'primary_ability_expression',
    ),
    notes: sqlNullableString(row, 'notes'),
    ...timestamps(row),
  };
}

function decodeSubclass(row: SqlRow): SubclassDefinitionRow {
  return {
    id: sqlInteger(row, 'id'),
    content_key: sqlString(row, 'content_key'),
    class_definition_id: sqlInteger(row, 'class_definition_id'),
    name: sqlString(row, 'name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    spellcasting_ability: sqlNullableString(
      row,
      'spellcasting_ability',
    ) as Ability | null,
    caster_fraction: sqlNullableString(row, 'caster_fraction'),
    caster_rounding: sqlNullableString(row, 'caster_rounding'),
    grant_rules: sqlNullableJson(row, 'grant_rules'),
    ...timestamps(row),
  };
}

function decodeDefinition(row: SqlRow): DefinitionRow {
  return {
    id: sqlInteger(row, 'id'),
    content_key: sqlString(row, 'content_key'),
    name: sqlString(row, 'name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    category: sqlNullableString(row, 'category'),
    repeatable: sqlBoolean(row, 'repeatable'),
    prerequisites: sqlNullableJson(row, 'prerequisites'),
    grant_rules: sqlNullableJson(row, 'grant_rules'),
    notes: sqlNullableString(row, 'notes'),
    ...timestamps(row),
  };
}

function stringAggregate(value: string | null): string[] {
  return value === null || value === ''
    ? []
    : value.split('\u001f');
}

/**
 * The upcast levels, aggregated by the query and split back into integers.
 *
 * ANY MEMBER THAT IS NOT AN INTEGER DROPS THE WHOLE LIST rather than yielding a
 * partial one. A half-read "list of levels that can upcast" is worse than none:
 * a consumer cannot tell it apart from a spell that upcasts at fewer levels
 * than it does, so it would print a shorter ladder as though it were complete.
 * The column's CHECK makes this unreachable on any image this build created,
 * which is precisely why it is written for the images it did not (F11).
 */
function numberAggregate(value: string | null): number[] {
  const parts = stringAggregate(value);
  const levels = parts.map(Number);
  return levels.every((level) => Number.isSafeInteger(level) && level >= 1)
    ? levels
    : [];
}

function decodeSpell(row: SqlRow): CatalogSpell {
  return {
    id: sqlInteger(row, 'id'),
    content_key: sqlString(row, 'content_key'),
    spell_identity_id: sqlInteger(row, 'spell_identity_id'),
    display_name: sqlString(row, 'display_name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    level: sqlInteger(row, 'level'),
    school: sqlString(row, 'school'),
    ritual: sqlBoolean(row, 'ritual'),
    concentration: sqlBoolean(row, 'concentration'),
    casting_time: sqlNullableString(row, 'casting_time'),
    action_type: sqlNullableString(row, 'action_type'),
    range: sqlNullableString(row, 'range'),
    duration: sqlNullableString(row, 'duration'),
    components: sqlNullableString(row, 'components'),
    material_component_summary: sqlNullableString(
      row,
      'material_component_summary',
    ),
    healing: sqlBoolean(row, 'healing'),
    short_summary: sqlNullableString(row, 'short_summary'),
    material_cost_copper: sqlNullableInteger(row, 'material_cost_copper'),
    material_cost_kind: sqlNullableString(
      row,
      'material_cost_kind',
    ) as MaterialCostKind | null,
    range_kind: sqlNullableString(row, 'range_kind') as SpellRangeKind | null,
    range_feet: sqlNullableInteger(row, 'range_feet'),
    area_shape: sqlNullableString(row, 'area_shape') as SpellAreaShape | null,
    area_feet: sqlNullableInteger(row, 'area_feet'),
    upcast_scale: sqlNullableString(row, 'upcast_scale') as UpcastScale | null,
    upcast_summary: sqlNullableString(row, 'upcast_summary'),
    upcastLevels: numberAggregate(sqlNullableString(row, 'upcast_levels')),
    requires_mod_for_effect: sqlBoolean(row, 'requires_mod_for_effect'),
    effect_reliability_category: sqlString(
      row,
      'effect_reliability_category',
    ) as EffectReliabilityCategory,
    provenance: sqlString(row, 'provenance'),
    seed_version: sqlNullableString(row, 'seed_version'),
    is_active: sqlBoolean(row, 'is_active'),
    lists: stringAggregate(sqlNullableString(row, 'lists')),
    tags: stringAggregate(sqlNullableString(row, 'tags')),
    ...timestamps(row),
  };
}

export class CatalogQueries {
  constructor(private readonly db: DatabaseContext) {}

  read(): CatalogSnapshot {
    return {
      classes: this.db.all(
        'SELECT * FROM class_definitions ORDER BY name, rules_edition, id',
        undefined,
        decodeClass,
      ),
      subclasses: this.db.all(
        `SELECT *
         FROM subclass_definitions
         ORDER BY class_definition_id, name, rules_edition, id`,
        undefined,
        decodeSubclass,
      ),
      sources: {
        feat: this.definitions('feat_definitions'),
        species: this.definitions('species_definitions'),
        background: this.definitions('background_definitions'),
      },
      spells: this.db.all(
        `SELECT version.*,
                (
                  SELECT group_concat(value, char(31))
                  FROM (
                    SELECT membership.spell_list_key AS value
                    FROM spell_list_memberships AS membership
                    WHERE membership.spell_version_id = version.id
                    ORDER BY membership.spell_list_key
                  )
                ) AS lists,
                (
                  SELECT group_concat(value, char(31))
                  FROM (
                    SELECT tagged.tag AS value
                    FROM spell_version_tags AS tagged
                    WHERE tagged.spell_version_id = version.id
                    ORDER BY tagged.tag
                  )
                ) AS tags,
                (
                  SELECT group_concat(value, char(31))
                  FROM (
                    SELECT upcast.level AS value
                    FROM spell_version_upcast_levels AS upcast
                    WHERE upcast.spell_version_id = version.id
                    ORDER BY upcast.level
                  )
                ) AS upcast_levels
         FROM spell_versions AS version
         ORDER BY version.level, version.display_name,
                  version.rules_edition, version.id`,
        undefined,
        decodeSpell,
      ),
    };
  }

  private definitions(
    table:
      | 'feat_definitions'
      | 'species_definitions'
      | 'background_definitions',
  ): DefinitionRow[] {
    return this.db.all(
      `SELECT * FROM ${table} ORDER BY name, rules_edition, id`,
      undefined,
      decodeDefinition,
    );
  }
}
