import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { sqlBoolean, sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterLevel, WeaponMasteryProperty } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import { WeaponMasteryLookup } from '../rules/weapon-mastery-lookup';
import { selectableCatalogContentSql } from '../queries/selectable-catalog-content';
import { SourceRuleReader } from '../grants/source-rule-reader';
import { GrantRule } from '../grants/grant-rule';
import { ADDITIONAL_FIGHTING_STYLE_KEY_CONFIG } from '../rules/srd-subclasses';
import type {
  GuidedAdditionalFightingStyleState,
  GuidedFightingStyleOption,
  GuidedRequiredFighterChoicesState,
  GuidedWeaponMasteryOption,
} from './equipment-choices';

/** The one Fighter class key every required-choice read is scoped to. */
const FIGHTER_CLASS_CONTENT_KEY = '2024:class:fighter';

function fightingStyleOptions(
  db: DatabaseContext,
): readonly GuidedFightingStyleOption[] {
  return db.all(
    `SELECT definition.content_key, definition.name, identity.catalog_layer
     FROM feat_definitions AS definition
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = definition.content_key
     WHERE definition.category = 'fighting_style'
       AND ${selectableCatalogContentSql('feat', 'definition.content_key')}
     ORDER BY definition.name, definition.id`,
    undefined,
    (row) => ({
      content_key: sqlString(row, 'content_key') as ContentKey,
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
}

function chosenFightingStyle(
  db: DatabaseContext,
  characterId: number,
): GuidedFightingStyleOption | null {
  return db.one(
    `SELECT definition.content_key, definition.name, identity.catalog_layer
     FROM character_source_instances AS source
     JOIN feat_definitions AS definition
       ON definition.id = source.source_definition_id
     JOIN character_source_instances AS fighter_source
       ON fighter_source.id = source.parent_source_instance_id
      AND fighter_source.character_id = source.character_id
      AND fighter_source.source_type = 'class'
      AND fighter_source.state = 'active'
     JOIN class_definitions AS fighter_definition
       ON fighter_definition.id = fighter_source.source_definition_id
      AND fighter_definition.content_key = '2024:class:fighter'
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = definition.content_key
     WHERE source.character_id = ?
       AND source.source_type = 'feat'
       AND source.state = 'active'
       AND source.notes = 'required_fighter_choice:fighting_style'
       AND definition.category = 'fighting_style'
     ORDER BY source.id
     LIMIT 1`,
    [characterId],
    (row) => ({
      content_key: sqlString(row, 'content_key') as ContentKey,
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
}

interface FighterSubclassSource {
  readonly id: number;
  readonly name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly config: string | null;
}

function fighterSubclassSource(
  db: DatabaseContext,
  characterId: number,
): FighterSubclassSource | null {
  return db.one(
    `SELECT source.id, subclass.name, source.config, identity.catalog_layer
     FROM character_source_instances AS source
     JOIN subclass_definitions AS subclass
       ON subclass.id = source.source_definition_id
     JOIN class_definitions AS parent
       ON parent.id = subclass.class_definition_id
      AND parent.content_key = ?
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'subclass'
      AND identity.content_key = subclass.content_key
     WHERE source.character_id = ?
       AND source.source_type = 'subclass'
       AND source.state = 'active'
     ORDER BY source.id
     LIMIT 1`,
    [FIGHTER_CLASS_CONTENT_KEY, characterId],
    (row) => ({
      id: sqlInteger(row, 'id'),
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
      config: sqlNullableString(row, 'config'),
    }),
  );
}

/** Every Fighting Style feat the character already holds, from any source. */
function heldFightingStyleKeys(
  db: DatabaseContext,
  characterId: number,
): ReadonlySet<string> {
  return new Set(
    db.all(
      `SELECT definition.content_key
       FROM character_source_instances AS source
       JOIN feat_definitions AS definition
         ON definition.id = source.source_definition_id
       WHERE source.character_id = ?
         AND source.source_type = 'feat'
         AND source.state = 'active'
         AND definition.category = 'fighting_style'`,
      [characterId],
      (row) => sqlString(row, 'content_key'),
    ),
  );
}

function featOption(
  db: DatabaseContext,
  contentKey: string,
): GuidedFightingStyleOption | null {
  return db.one(
    `SELECT definition.content_key, definition.name, identity.catalog_layer
     FROM feat_definitions AS definition
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = definition.content_key
     WHERE definition.content_key = ?
       AND definition.category = 'fighting_style'`,
    [contentKey],
    (row) => ({
      content_key: sqlString(row, 'content_key') as ContentKey,
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
}

/**
 * The extra-Fighting-Style entitlement, decided by the SUBCLASS'S OWN ACTIVE
 * RULES.
 *
 * `SourceRuleReader.activeRulesForSource` already applies
 * `active_from_class_level`, so a Champion below level 7 reports exactly the
 * same "not entitled" as a Fighter whose subclass never grants one. No level
 * literal and no subclass name is repeated here.
 */
function additionalFightingStyleState(
  db: DatabaseContext,
  characterId: number,
): GuidedAdditionalFightingStyleState {
  const subclass = fighterSubclassSource(db, characterId);
  if (subclass === null) {
    return { state: 'not_entitled' };
  }
  const entitled = new SourceRuleReader(db)
    .activeRulesForSource(subclass.id)
    .some((rule) => {
      const data = rule.toObject();
      return (
        rule.kind === GrantRule.GRANT_SOURCE &&
        data.source_type === 'feat' &&
        data.definition_key_config === ADDITIONAL_FIGHTING_STYLE_KEY_CONFIG
      );
    });
  if (!entitled) {
    return { state: 'not_entitled' };
  }
  const decoded: unknown =
    subclass.config === null || subclass.config === ''
      ? {}
      : JSON.parse(subclass.config);
  const configuredKey =
    decoded !== null &&
    typeof decoded === 'object' &&
    !Array.isArray(decoded)
      ? (decoded as Record<string, unknown>)[
          ADDITIONAL_FIGHTING_STYLE_KEY_CONFIG
        ]
      : undefined;
  const chosen =
    typeof configuredKey === 'string' && configuredKey !== ''
      ? featOption(db, configuredKey)
      : null;
  // "You gain ANOTHER Fighting Style feat" — a style already held is not
  // another one, and a Fighting Style feat is not Repeatable in the SRD
  // corpus, so the pool offered here excludes what the character holds. The
  // chosen style stays visible through `chosen`.
  const held = heldFightingStyleKeys(db, characterId);
  return {
    state: 'entitled',
    subclass_name: subclass.name,
    subclass_catalog_layer: subclass.catalog_layer,
    source_instance_id: subclass.id,
    chosen,
    options: fightingStyleOptions(db).filter(
      (option) => !held.has(option.content_key),
    ),
  };
}

export function guidedRequiredFighterChoicesState(
  db: DatabaseContext,
  characterId: number,
): GuidedRequiredFighterChoicesState {
  const character = db.one(
    'SELECT id, revision FROM characters WHERE id = ?',
    [characterId],
    (row) => ({
      id: sqlInteger(row, 'id'),
      revision: sqlInteger(row, 'revision'),
    }),
  );
  if (character === null) {
    throw new TypeError(`Character ${String(characterId)} does not exist.`);
  }
  const fighter = db.one(
    `SELECT level.level, definition.name, identity.catalog_layer
     FROM character_class_levels AS level
     JOIN class_definitions AS definition
       ON definition.id = level.class_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'class'
      AND identity.content_key = definition.content_key
     WHERE level.character_id = ?
       AND definition.content_key = ?
     ORDER BY level.id
     LIMIT 1`,
    [characterId, FIGHTER_CLASS_CONTENT_KEY],
    (row) => ({
      level: sqlInteger(row, 'level') as CharacterLevel,
      name: sqlString(row, 'name'),
      catalog_layer: catalogLayerDisclosure(
        sqlNullableString(row, 'catalog_layer'),
      ),
    }),
  );
  if (fighter === null) {
    return {
      character_id: character.id,
      revision: character.revision,
      fighter: null,
    };
  }
  const allowance = new WeaponMasteryLookup(db).forCharacter(characterId);
  const weaponRows = db.all(
    `SELECT id, name, mastery_property, mastery_selected
     FROM character_weapons
     WHERE character_id = ? AND mastery_property IS NOT NULL
     ORDER BY name, id`,
    [characterId],
    (row): GuidedWeaponMasteryOption => ({
      weapon_id: sqlInteger(row, 'id'),
      weapon_name: sqlString(row, 'name'),
      mastery_property: sqlString(
        row,
        'mastery_property',
      ) as WeaponMasteryProperty,
      selected: sqlBoolean(row, 'mastery_selected'),
    }),
  );
  const byKind = new Map<string, GuidedWeaponMasteryOption[]>();
  for (const weapon of weaponRows) {
    const key = `${weapon.weapon_name}\u0000${weapon.mastery_property}`;
    const rows = byKind.get(key) ?? [];
    rows.push(weapon);
    byKind.set(key, rows);
  }
  const weapons = [...byKind.values()].map((rows) =>
    rows.find((weapon) => weapon.selected) ?? rows[0]!
  );
  const style = chosenFightingStyle(db, characterId);
  const additional = additionalFightingStyleState(db, characterId);
  const selectedCount = weapons.filter((weapon) => weapon.selected).length;
  return {
    character_id: character.id,
    revision: character.revision,
    fighter: {
      class_name: fighter.name,
      class_catalog_layer: fighter.catalog_layer,
      class_level: fighter.level,
      fighting_style: {
        chosen: style,
        options: fightingStyleOptions(db),
      },
      additional_fighting_style: additional,
      weapon_mastery: {
        ...(allowance.state === 'known'
          ? { state: 'known' as const, required_count: allowance.count }
          : { state: 'unavailable' as const }),
        selected_count: selectedCount,
        options: weapons,
      },
      complete:
        style !== null && allowance.state === 'known' &&
        selectedCount === allowance.count &&
        (additional.state === 'not_entitled' || additional.chosen !== null),
    },
  };
}
