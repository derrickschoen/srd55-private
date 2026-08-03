import type { DatabaseContext } from '../db/database';
import type { AuthoringCharacterEffect } from '../authoring/effect-forms';
import type { ContentKey } from '../domain/ids';
import type { VersatileWeaponDamage, WeaponDamage } from '../domain/weapon-damage';
import {
  ContentIdentityCollision,
  registerDerivedContentIdentity,
  resolveContentAggregate,
} from './content-registry';
import type {
  CatalogArmorRecord,
  CatalogItemRecord,
  CatalogWeaponRecord,
} from './catalog-schema';
import {
  projectArmorContentV1,
  projectItemContentV1,
  projectStoredEquipmentContentV1,
  projectWeaponContentV1,
  type ArmorContentAggregate,
  type EquipmentContentAggregate,
  type ItemContentAggregate,
  type WeaponContentAggregate,
} from './equipment-content-projector-v1';
import { deriveContentIdentityV1 } from './content-identity';

export interface EquipmentImportCounters {
  readonly weapons_created: number;
  readonly weapons_matched: number;
  readonly armors_created: number;
  readonly armors_matched: number;
  readonly items_created: number;
  readonly items_matched: number;
  readonly item_definition_effects_created: number;
}

export class EquipmentImportReviewRequired extends Error {
  constructor(kind: EquipmentContentAggregate['kind'], name: string) {
    super(`${kind} '${name}' matched reviewable catalog content; import requires an explicit match or clone decision.`);
    this.name = 'EquipmentImportReviewRequired';
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

interface EffectColumns {
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

function effectColumns(effect: AuthoringCharacterEffect): EffectColumns {
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

function assertStoredIdentity(
  db: DatabaseContext,
  aggregate: EquipmentContentAggregate,
  expectedCanonicalJson: string,
  contentKey: ContentKey,
): void {
  const identity = (() => {
    switch (aggregate.kind) {
      case 'weapon': {
        const stored = projectStoredEquipmentContentV1(db, {
          kind: aggregate.kind,
          contentKey,
        });
        return deriveContentIdentityV1({
          kind: stored.kind,
          edition: stored.aggregate.rules_edition,
          name: stored.aggregate.name,
          payload: stored.payload,
        });
      }
      case 'armor': {
        const stored = projectStoredEquipmentContentV1(db, {
          kind: aggregate.kind,
          contentKey,
        });
        return deriveContentIdentityV1({
          kind: stored.kind,
          edition: stored.aggregate.rules_edition,
          name: stored.aggregate.name,
          payload: stored.payload,
        });
      }
      case 'item': {
        const stored = projectStoredEquipmentContentV1(db, {
          kind: aggregate.kind,
          contentKey,
        });
        return deriveContentIdentityV1({
          kind: stored.kind,
          edition: stored.aggregate.rules_edition,
          name: stored.aggregate.name,
          payload: stored.payload,
        });
      }
    }
  })();
  if (identity.canonicalJson !== expectedCanonicalJson) {
    throw new ContentIdentityCollision();
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

function importOne(
  db: DatabaseContext,
  aggregate: EquipmentContentAggregate,
): { readonly created: boolean; readonly effectsCreated: number } {
  const payload = aggregate.kind === 'weapon'
    ? projectWeaponContentV1(aggregate)
    : aggregate.kind === 'armor'
      ? projectArmorContentV1(aggregate)
      : projectItemContentV1(aggregate);
  const resolved = resolveContentAggregate(db, {
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload,
  });
  if (resolved.resolution.kind === 'exact') {
    if (resolved.resolution.matchClass !== 'trivial-self-match') {
      throw new EquipmentImportReviewRequired(aggregate.kind, aggregate.name);
    }
    assertStoredIdentity(
      db,
      aggregate,
      resolved.identity.canonicalJson,
      resolved.resolution.contentKey,
    );
    return { created: false, effectsCreated: 0 };
  }
  if (resolved.resolution.kind !== 'missing') {
    throw new EquipmentImportReviewRequired(aggregate.kind, aggregate.name);
  }
  const identity = registerDerivedContentIdentity(db, {
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload,
  });
  let effectsCreated = 0;
  switch (aggregate.kind) {
    case 'weapon':
      insertWeapon(db, aggregate, identity.derivedKey);
      break;
    case 'armor':
      insertArmor(db, aggregate, identity.derivedKey);
      break;
    case 'item':
      effectsCreated = insertItem(db, aggregate, identity.derivedKey);
      break;
  }
  return { created: true, effectsCreated };
}

export function importEquipmentRecords(
  db: DatabaseContext,
  records: {
    readonly weapons: readonly CatalogWeaponRecord[];
    readonly armors: readonly CatalogArmorRecord[];
    readonly items: readonly CatalogItemRecord[];
  },
): EquipmentImportCounters {
  const counters = {
    weapons_created: 0,
    weapons_matched: 0,
    armors_created: 0,
    armors_matched: 0,
    items_created: 0,
    items_matched: 0,
    item_definition_effects_created: 0,
  };
  for (const record of records.weapons) {
    const result = importOne(db, weaponAggregate(record));
    counters[result.created ? 'weapons_created' : 'weapons_matched'] += 1;
  }
  for (const record of records.armors) {
    const result = importOne(db, armorAggregate(record));
    counters[result.created ? 'armors_created' : 'armors_matched'] += 1;
  }
  for (const record of records.items) {
    const result = importOne(db, itemAggregate(record));
    counters[result.created ? 'items_created' : 'items_matched'] += 1;
    counters.item_definition_effects_created += result.effectsCreated;
  }
  return counters;
}
