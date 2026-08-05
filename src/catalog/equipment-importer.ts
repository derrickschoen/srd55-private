import type { DatabaseContext } from '../db/database';
import type { AuthoringCharacterEffect } from '../authoring/effect-forms';
import type { ContentKey } from '../domain/ids';
import type { VersatileWeaponDamage, WeaponDamage } from '../domain/weapon-damage';
import { assertedExternalContentKey } from './catalog-key';
import type {
  CatalogArmorRecord,
  CatalogItemRecord,
  CatalogWeaponRecord,
} from './catalog-schema';
import {
  projectArmorContentV1,
  projectItemContentV1,
  projectWeaponContentV1,
  type ArmorContentAggregate,
  type EquipmentContentAggregate,
  type ItemContentAggregate,
  type WeaponContentAggregate,
} from './equipment-content-projector-v1';
import type {
  ContentImportNode,
  ContentImportProjection,
} from './content-adoption';
import { projectStoredContentV1 } from './stored-content-projector-v1';

export interface EquipmentImportCounters {
  readonly weapons_created: number;
  readonly weapons_matched: number;
  readonly armors_created: number;
  readonly armors_matched: number;
  readonly items_created: number;
  readonly items_matched: number;
  readonly item_definition_effects_created: number;
}

export type MutableEquipmentImportCounters = {
  -readonly [K in keyof EquipmentImportCounters]: EquipmentImportCounters[K];
};

export type UnsupportedItemDefinitionEffectReason =
  | 'requires_source_instance'
  | 'requires_bonded_weapon_binding';

export class UnsupportedItemDefinitionEffect extends Error {
  constructor(
    readonly itemName: string,
    readonly effectKind: AuthoringCharacterEffect['kind'],
    readonly reason: UnsupportedItemDefinitionEffectReason,
  ) {
    const explanation = reason === 'requires_source_instance'
      ? 'character ability increases require source-instance provenance, but item definitions have no source-instance lifecycle'
      : "the item picker has no binding choice for weapon_scope 'one_bonded_weapon'";
    const followUp = reason === 'requires_source_instance'
      ? 'ITEM-DEFINITION-SOURCE-PROVENANCE'
      : 'ITEM-DEFINITION-BONDED-WEAPON-BINDING';
    super(
      `Item definition '${itemName}' effect '${effectKind}' is unsupported: ` +
      `${explanation}. Follow-up unit ${followUp} must land before this ` +
      'shape can be imported.',
    );
    this.name = 'UnsupportedItemDefinitionEffect';
  }
}

function assertItemDefinitionEffectSupported(
  itemName: string,
  effect: AuthoringCharacterEffect,
): void {
  switch (effect.kind) {
    case 'ability_increase':
      // Species/background increases are owned by character_source_instances
      // and cascade with that source. Items have no equivalent source type or
      // lifecycle. Follow-up unit ITEM-DEFINITION-SOURCE-PROVENANCE must
      // define both before the picker may materialise this effect.
      throw new UnsupportedItemDefinitionEffect(
        itemName,
        effect.kind,
        'requires_source_instance',
      );
    case 'attack_ability_override':
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      if (effect.weapon_scope === 'one_bonded_weapon') {
        // Runtime requires a concrete bonded-weapon choice, but item
        // definitions and the picker carry no such binding. Follow-up unit
        // ITEM-DEFINITION-BONDED-WEAPON-BINDING owns that picker/UI and
        // persistence seam; until then importing the shape would create an
        // inert effect.
        throw new UnsupportedItemDefinitionEffect(
          itemName,
          effect.kind,
          'requires_bonded_weapon_binding',
        );
      }
      return;
    case 'damage_resistance':
    case 'hp_modifier':
    case 'speed':
    case 'ability_override':
    case 'armor_class_bonus':
    case 'armor_class_formula':
      return;
  }
}

function timestamp(): string {
  return new Date().toISOString();
}

function weaponAggregate(record: CatalogWeaponRecord): WeaponContentAggregate {
  return {
    kind: record.kind,
    name: record.name,
    rules_edition: record.edition,
    srd_group: record.srdGroup,
    damage: record.damage,
    damage_type: record.damageType,
    versatile_damage: record.versatileDamage,
    finesse: record.finesse,
    heavy: record.heavy,
    light: record.light,
    loading: record.loading,
    reach: record.reach,
    thrown: record.thrown,
    two_handed: record.twoHanded,
    ammunition: record.ammunition,
    ammunition_kind: record.ammunitionKind,
    range: record.range,
    mastery_property: record.masteryProperty,
    other_properties: record.otherProperties,
  };
}

function armorAggregate(record: CatalogArmorRecord): ArmorContentAggregate {
  return {
    kind: record.kind,
    name: record.name,
    rules_edition: record.edition,
    category: record.category,
    armor_class: record.armorClass,
    dex_bonus: record.dexBonus,
    dex_bonus_max: record.dexBonusMax,
    strength_requirement: record.strengthRequirement,
    stealth_disadvantage: record.stealthDisadvantage,
  };
}

function itemAggregate(record: CatalogItemRecord): ItemContentAggregate {
  for (const effect of record.effects) {
    assertItemDefinitionEffectSupported(record.name, effect);
  }
  return {
    kind: record.kind,
    name: record.name,
    rules_edition: record.edition,
    description: record.description,
    requires_attunement: record.requiresAttunement,
    effects: record.effects,
  };
}

function damageColumns(
  value: WeaponDamage | VersatileWeaponDamage,
): readonly [string, string | null, number | null, string | null] {
  switch (value.kind) {
    case 'dice':
      return [value.kind, value.dice, null, null];
    case 'flat':
      return [value.kind, null, value.amount, null];
    case 'custom':
      return [value.kind, null, null, value.text];
    case 'not_recorded':
    case 'not_applicable':
      return [value.kind, null, null, null];
  }
}

export interface EffectColumns {
  readonly damage_type: string | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly ability: string | null;
  readonly amount: number | null;
  readonly maximum: number | null;
  readonly base: number | null;
  readonly ability_1: string | null;
  readonly ability_2: string | null;
  readonly allows_shield: boolean | null;
  readonly weapon_scope: string | null;
}

export function effectColumns(effect: AuthoringCharacterEffect): EffectColumns {
  const empty: EffectColumns = {
    damage_type: null,
    hit_points_flat: null,
    hit_points_per_level: null,
    speed_bonus_feet: null,
    ability: null,
    amount: null,
    maximum: null,
    base: null,
    ability_1: null,
    ability_2: null,
    allows_shield: null,
    weapon_scope: null,
  };
  switch (effect.kind) {
    case 'damage_resistance':
      return { ...empty, damage_type: effect.damage_type };
    case 'hp_modifier':
      return {
        ...empty,
        hit_points_flat: effect.hit_points_flat,
        hit_points_per_level: effect.hit_points_per_level,
      };
    case 'speed':
      return { ...empty, speed_bonus_feet: effect.speed_bonus_feet };
    case 'ability_increase':
      return {
        ...empty,
        ability: effect.ability,
        amount: effect.amount,
        maximum: effect.maximum,
      };
    case 'ability_override':
      return { ...empty, ability: effect.ability, maximum: effect.maximum };
    case 'armor_class_bonus':
      return { ...empty, amount: effect.amount };
    case 'armor_class_formula':
      return {
        ...empty,
        base: effect.base,
        ability_1: effect.ability_1,
        ability_2: effect.ability_2,
        allows_shield: effect.allows_shield,
      };
    case 'attack_ability_override':
      return {
        ...empty,
        ability: effect.ability,
        weapon_scope: effect.weapon_scope,
      };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return {
        ...empty,
        amount: effect.amount,
        weapon_scope: effect.weapon_scope,
      };
  }
}

function insertWeapon(
  db: DatabaseContext,
  aggregate: WeaponContentAggregate,
  contentKey: ContentKey,
): void {
  const damage = damageColumns(aggregate.damage);
  const versatile = damageColumns(aggregate.versatile_damage);
  const near = aggregate.range.kind === 'ranged' ? aggregate.range.near_feet : null;
  const far = aggregate.range.kind === 'ranged' ? aggregate.range.far_feet : null;
  const now = timestamp();
  db.exec(
    `INSERT INTO weapon_templates (
       content_key, rules_edition, name, srd_group,
       damage_kind, damage_dice, damage_flat, damage_custom, damage_type,
       versatile_damage_kind, versatile_damage_dice, versatile_damage_flat,
       versatile_damage_custom, finesse, heavy, light, loading, reach, thrown,
       two_handed, ammunition, ammunition_kind, range_kind, range_near_feet,
       range_far_feet, mastery_property, other_properties, created_at, updated_at
     ) VALUES (${Array.from({ length: 29 }, () => '?').join(', ')})`,
    [
      contentKey, aggregate.rules_edition, aggregate.name, aggregate.srd_group,
      ...damage, aggregate.damage_type, ...versatile,
      aggregate.finesse, aggregate.heavy, aggregate.light, aggregate.loading,
      aggregate.reach, aggregate.thrown, aggregate.two_handed,
      aggregate.ammunition, aggregate.ammunition_kind, aggregate.range.kind,
      near, far, aggregate.mastery_property, aggregate.other_properties, now, now,
    ],
  );
}

function insertArmor(
  db: DatabaseContext,
  aggregate: ArmorContentAggregate,
  contentKey: ContentKey,
): void {
  const now = timestamp();
  db.exec(
    `INSERT INTO armor_templates (
       content_key, rules_edition, name, category, armor_class, dex_bonus,
       dex_bonus_max, strength_requirement, stealth_disadvantage,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contentKey, aggregate.rules_edition, aggregate.name, aggregate.category,
      aggregate.armor_class, aggregate.dex_bonus, aggregate.dex_bonus_max,
      aggregate.strength_requirement, aggregate.stealth_disadvantage, now, now,
    ],
  );
}

function insertItem(
  db: DatabaseContext,
  aggregate: ItemContentAggregate,
  contentKey: ContentKey,
): number {
  const now = timestamp();
  const itemDefinitionId = db.exec(
    `INSERT INTO item_definitions (
       content_key, rules_edition, name, description, requires_attunement,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      contentKey, aggregate.rules_edition, aggregate.name, aggregate.description,
      aggregate.requires_attunement, now, now,
    ],
  ).lastInsertId;
  for (const effect of aggregate.effects) {
    const columns = effectColumns(effect);
    db.exec(
      `INSERT INTO item_definition_effects (
         item_definition_id, sort_order, effect_kind, damage_type,
         hit_points_flat, hit_points_per_level, speed_bonus_feet, ability,
         amount, maximum, base, ability_1, ability_2, allows_shield,
         weapon_scope, label, notes, created_at, updated_at
       ) VALUES (${Array.from({ length: 19 }, () => '?').join(', ')})`,
      [
        itemDefinitionId, effect.sort_order, effect.kind, columns.damage_type,
        columns.hit_points_flat, columns.hit_points_per_level,
        columns.speed_bonus_feet, columns.ability, columns.amount,
        columns.maximum, columns.base, columns.ability_1, columns.ability_2,
        columns.allows_shield, columns.weapon_scope, effect.label, effect.notes,
        now, now,
      ],
    );
  }
  return aggregate.effects.length;
}

function projectionForAggregate(
  aggregate: EquipmentContentAggregate,
  assertedKey: ContentKey,
  counters: MutableEquipmentImportCounters,
): ContentImportProjection {
  const payload = aggregate.kind === 'weapon'
    ? projectWeaponContentV1(aggregate)
    : aggregate.kind === 'armor'
      ? projectArmorContentV1(aggregate)
      : projectItemContentV1(aggregate);
  return {
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    assertedKey,
    payload,
    projectStored: (database, contentKey) =>
      projectStoredContentV1(database, aggregate.kind, contentKey),
    install: (database, contentKey, _projection, phase) => {
      const existing = database.scalar<number>(
        `SELECT 1 FROM ${aggregate.kind === 'weapon'
          ? 'weapon_templates'
          : aggregate.kind === 'armor'
            ? 'armor_templates'
            : 'item_definitions'} WHERE content_key = ?`,
        [contentKey],
      ) === 1;
      if (existing) {
        if (phase === 'commit') {
          counters[`${aggregate.kind}s_matched` as
            | 'weapons_matched'
            | 'armors_matched'
            | 'items_matched'] += 1;
        }
        return;
      }
      let effectsCreated = 0;
      switch (aggregate.kind) {
        case 'weapon': insertWeapon(database, aggregate, contentKey); break;
        case 'armor': insertArmor(database, aggregate, contentKey); break;
        case 'item': effectsCreated = insertItem(database, aggregate, contentKey); break;
      }
      if (phase === 'commit') {
        counters[`${aggregate.kind}s_created` as
          | 'weapons_created'
          | 'armors_created'
          | 'items_created'] += 1;
        counters.item_definition_effects_created += effectsCreated;
      }
    },
  };
}

export function equipmentImportNodes(
  records: {
    readonly weapons: readonly CatalogWeaponRecord[];
    readonly armors: readonly CatalogArmorRecord[];
    readonly items: readonly CatalogItemRecord[];
  },
  counters: MutableEquipmentImportCounters,
): readonly ContentImportNode[] {
  const aggregates: readonly EquipmentContentAggregate[] = [
    ...records.weapons.map(weaponAggregate),
    ...records.armors.map(armorAggregate),
    ...records.items.map(itemAggregate),
  ];
  return Object.freeze(aggregates.map((aggregate) => {
    const assertedKey = assertedExternalContentKey(
      aggregate.kind,
      aggregate.rules_edition,
      aggregate.name,
    );
    const reproject: NonNullable<ContentImportNode['reproject']> =
      ({ name, assertedKey: nextKey }) => {
        const renamed = { ...aggregate, name } as EquipmentContentAggregate;
        return projectionForAggregate(renamed, nextKey, counters);
      };
    const node: ContentImportNode = Object.freeze({
      id: `${aggregate.kind}:${assertedKey}`,
      projection: projectionForAggregate(aggregate, assertedKey, counters),
      reproject,
    });
    return node;
  }));
}
