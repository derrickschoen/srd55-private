import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableJson,
  sqlNullableString,
  sqlSpellSchool,
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
  ClassDefinitionId,
  SpellIdentityId,
  SpellVersionId,
  StandaloneDefinitionId,
  SubclassDefinitionId,
} from '../domain/ids';
import {
  bundledSourceContentKeys,
  type BundledSourceKind,
} from '../catalog/bundled-source-membership';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import {
  isEnumValue,
  materialCostKinds,
  spellAreaShapes,
  spellRangeKinds,
  type Ability,
  type EffectReliabilityCategory,
  type MaterialCostKind,
  type ProgressionType,
  type RulesEdition,
  type SpellAreaShape,
  type SpellRangeKind,
  type StandaloneSourceType,
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
 * `upcastLevels` AND `cantripUpgradeLevels` ARE THE TWO FIELDS THAT ARE NOT
 * COLUMNS. The SLOT levels a spell can be upcast at are rows in
 * `spell_version_upcast_levels`; the CHARACTER levels at which a cantrip's
 * effect changes are rows in `spell_version_cantrip_upgrade_levels`. Both are
 * aggregated in the same way `lists` and `tags` are, and sorted ASCENDING so a
 * consumer never has to sort a "list of levels" itself.
 *
 * TWO FIELDS AND NOT ONE PLUS A SCALE. `upcast_scale` used to say which kind of
 * level a single list held; the owner ruled the Cantrip Upgrade a separate
 * mechanic, so the two lists are separate and the field name carries what the
 * discriminant used to.
 */
export interface CatalogSpell extends SpellVersionRow {
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly lists: string[];
  readonly tags: string[];
  readonly upcastLevels: number[];
  readonly cantripUpgradeLevels: number[];
}

export interface CatalogSnapshot {
  readonly classes: Array<
    ClassDefinitionRow & { readonly catalog_layer: CatalogLayerDisclosure }
  >;
  readonly subclasses: Array<
    SubclassDefinitionRow & { readonly catalog_layer: CatalogLayerDisclosure }
  >;
  readonly sources: Readonly<
    Record<
      StandaloneSourceType,
      Array<DefinitionRow & { readonly catalog_layer: CatalogLayerDisclosure }>
    >
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
    id: sqlInteger(row, 'id') as ClassDefinitionId,
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
    id: sqlInteger(row, 'id') as SubclassDefinitionId,
    content_key: sqlString(row, 'content_key'),
    class_definition_id: sqlInteger(row, 'class_definition_id') as ClassDefinitionId,
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
    id: sqlInteger(row, 'id') as StandaloneDefinitionId,
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
 * One of the two level ladders, aggregated by the query and split back into
 * integers.
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

/**
 * A STORED MEMBER OF A CLOSED VOCABULARY, VALIDATED RATHER THAN CAST.
 *
 * A cast cannot fail: `sqlNullableString(row, 'range_kind') as SpellRangeKind`
 * hands a consumer a value it is entitled to switch on exhaustively, and every
 * one of these three columns can hold something else — a CHECK constrains no
 * image created before it existed and no hand-edited one, which is F11's point
 * and the same argument `decodeSpellRange` and `decodeSpellComponents` are
 * tolerant on. An unreadable member reads as ABSENT here, which is a state each
 * of these columns already has and every consumer already handles.
 */
function enumMember<T extends string>(
  row: SqlRow,
  column: string,
  vocabulary: readonly T[],
): T | null {
  const stored = sqlNullableString(row, column);
  return stored !== null && isEnumValue(vocabulary, stored) ? stored : null;
}

function decodeSpell(row: SqlRow): Omit<CatalogSpell, 'catalog_layer'> {
  return {
    id: sqlInteger(row, 'id') as SpellVersionId,
    content_key: sqlString(row, 'content_key'),
    spell_identity_id: sqlInteger(row, 'spell_identity_id') as SpellIdentityId,
    display_name: sqlString(row, 'display_name'),
    rules_edition: sqlString(row, 'rules_edition') as RulesEdition,
    level: sqlInteger(row, 'level'),
    school: sqlSpellSchool(row, 'school'),
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
    material_cost_kind: enumMember(row, 'material_cost_kind', materialCostKinds),
    range_kind: enumMember(row, 'range_kind', spellRangeKinds),
    range_feet: sqlNullableInteger(row, 'range_feet'),
    area_shape: enumMember(row, 'area_shape', spellAreaShapes),
    area_feet: sqlNullableInteger(row, 'area_feet'),
    upcast_summary: sqlNullableString(row, 'upcast_summary'),
    cantrip_upgrade_summary: sqlNullableString(row, 'cantrip_upgrade_summary'),
    upcastLevels: numberAggregate(sqlNullableString(row, 'upcast_levels')),
    cantripUpgradeLevels: numberAggregate(
      sqlNullableString(row, 'cantrip_upgrade_levels'),
    ),
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
        `SELECT definition.*, identity.catalog_layer
         FROM class_definitions AS definition
         LEFT JOIN catalog_content_identities AS identity
           ON identity.content_kind = 'class'
          AND identity.content_key = definition.content_key
         WHERE identity.archived_at IS NULL
         -- D133: class consumers remain bundled-only in v1.
         ORDER BY definition.name, definition.rules_edition, definition.id`,
        undefined,
        (row) => ({
          ...decodeClass(row),
          catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
        }),
      ).filter((definition) =>
        bundledSourceContentKeys('class').includes(definition.content_key)
      ),
      subclasses: this.db.all(
        `SELECT definition.*, identity.catalog_layer
         FROM subclass_definitions AS definition
         LEFT JOIN catalog_content_identities AS identity
           ON identity.content_kind = 'subclass'
          AND identity.content_key = definition.content_key
         WHERE identity.archived_at IS NULL
         ORDER BY definition.class_definition_id, definition.name,
                  definition.rules_edition, definition.id`,
        undefined,
        (row) => ({
          ...decodeSubclass(row),
          catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
        }),
      ),
      sources: {
        feat: this.definitions('feat_definitions'),
        species: this.definitions('species_definitions'),
        background: this.definitions('background_definitions'),
      },
      spells: this.db.all(
        `SELECT version.*, identity.catalog_layer,
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
                ) AS upcast_levels,
                (
                  SELECT group_concat(value, char(31))
                  FROM (
                    SELECT upgrade.level AS value
                    FROM spell_version_cantrip_upgrade_levels AS upgrade
                    WHERE upgrade.spell_version_id = version.id
                    ORDER BY upgrade.level
                  )
                ) AS cantrip_upgrade_levels
         FROM spell_versions AS version
         LEFT JOIN catalog_content_identities AS identity
           ON identity.content_kind = 'spell'
          AND identity.content_key = version.content_key
         WHERE identity.archived_at IS NULL
         ORDER BY version.level, version.display_name,
                  version.rules_edition, version.id`,
        undefined,
        (row) => ({
          ...decodeSpell(row),
          catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
        }),
      ),
    };
  }

  private definitions(
    table:
      | 'feat_definitions'
      | 'species_definitions'
      | 'background_definitions',
  ): Array<DefinitionRow & { readonly catalog_layer: CatalogLayerDisclosure }> {
    const kind: BundledSourceKind = table === 'feat_definitions'
      ? 'feat'
      : table === 'species_definitions'
        ? 'species'
        : 'background';
    return this.db.all(
      `SELECT definition.*, identity.catalog_layer
       FROM ${table} AS definition
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = '${kind}'
        AND identity.content_key = definition.content_key
       WHERE identity.archived_at IS NULL
       ORDER BY definition.name, definition.rules_edition, definition.id`,
      undefined,
      (row) => ({
        ...decodeDefinition(row),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
      }),
    );
  }
}
