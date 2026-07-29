import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import {
  EQUIPMENT_CHOICE_CONFIG_KEY,
  type EquipmentChoiceConfig,
  type EquipmentGrantRefusalData,
  type EquipmentGrantRefusalReason,
} from '../builder/contracts';
import { GUIDED_BACKGROUND_SOURCE_MARKER } from '../builder/guided-creation';
import type { ArmorSlot, SrdWeaponGroup } from '../domain/enums';
import { armorSlots, isEnumValue, srdWeaponGroups } from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import {
  weaponAttackKindOf,
  weaponProficiencyCategoryOf,
} from '../rules/weapon-template-fold';

/**
 * THE STARTING-EQUIPMENT MINT AND CLEANUP — dispatch E-A of
 * `docs/design/2026-07-29-starting-equipment.md` (§2, §3), the runtime the
 * seam's `EQUIPMENT_GRANTS_MODULE` names.
 *
 * WHAT ONE APPLY DOES, in one transaction:
 *
 *  1. resolves the GRANTING SOURCE INSTANCE — the character's active class
 *     instance for `kind: 'class'`, the guided background instance for
 *     `kind: 'background'` (produced HERE when the record-only `applyOrigin`
 *     path left the background without one — a granted row with a NULL source
 *     is indistinguishable from a hand-added one, which is the entire defect
 *     this unit exists to prevent);
 *  2. records the CHOICE in that instance's `config` under the seam's
 *     `EQUIPMENT_CHOICE_CONFIG_KEY` — which is already on the share wire, so
 *     the recorded choice travels for free;
 *  3. removes EXACTLY the rows carrying that source instance — rows with a
 *     NULL `source_instance_id` are NEVER touched, because a person put those
 *     there and only a person may remove them (§5's species-cleanup trap);
 *  4. mints owned `character_weapons` / `character_armor` rows for the chosen
 *     option's `weapon`/`armor` items, each stamped with the granting
 *     instance, quantities expanded to rows; mints NOTHING for `gear` (D65)
 *     and therefore nothing for a package's trailing GP line, which IS a gear
 *     row (D56).
 *
 * Changing the option is the same call with a different letter: step 3
 * removes what the previous option minted and step 4 re-mints.
 *
 * THE MINT DOES NOT RIDE THE PLANNER'S ADD-WEAPON PATH, deliberately — §5
 * names that reuse as the trap: it compiles, produces the right AC and attack
 * profile, and stamps nothing, which only an option switch reveals. The copy
 * here is the same column-wise template copy (D1b) with the source stamp made
 * impossible to omit.
 */

/**
 * The armour-slot collision, refused by NAME with whole-apply rollback — the
 * shape S-B built for `skill_already_held`, never a raw SQLite constraint
 * violation and never a silent overwrite. Thrown inside the transaction, so
 * the whole apply (choice, cleanup, every already-minted row) rolls back.
 */
export class EquipmentGrantRefusal extends Error {
  readonly reason: EquipmentGrantRefusalReason;

  constructor(
    readonly data: EquipmentGrantRefusalData,
    message: string,
  ) {
    super(message);
    this.name = 'EquipmentGrantRefusal';
    this.reason = data.reason;
  }
}

export type EquipmentChoiceParams = EquipmentChoiceConfig & {
  readonly character_id: number;
  /** The class's or background's catalog content key. */
  readonly content_key: string;
};

interface GrantableItem {
  readonly item_kind: string;
  readonly item_name: string;
  readonly quantity: number;
  readonly weapon_template_id: number | null;
  readonly armor_template_id: number | null;
}

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * The chosen option's rows, from the rules tables the seeders own. An option
 * letter with no rows is legal here — a gold-only option (Wizard B) has gear
 * rows only after D40 retired the coin kind, and some letters simply do not
 * exist for a source — the mint then removes the previous grant and mints
 * nothing, which is exactly what choosing a packageless option means.
 * WHICH options the step OFFERS (suppressing gold-only ones per D56) is
 * E-B's filter, not this module's.
 */
function grantableItems(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
): GrantableItem[] {
  const [table, ownerColumn, ownerId] =
    params.kind === 'class'
      ? [
          'class_equipment_items',
          'class_definition_id',
          db.scalar(
            'SELECT id FROM class_definitions WHERE content_key = ?',
            [params.content_key],
          ),
        ]
      : [
          'background_equipment_items',
          'background_template_id',
          db.scalar(
            'SELECT id FROM background_templates WHERE content_key = ?',
            [params.content_key],
          ),
        ];
  if (typeof ownerId !== 'number') {
    throw new Error(
      `No ${params.kind} exists for content key "${params.content_key}", ` +
        'so its equipment package cannot be resolved.',
    );
  }
  return db.allRaw(
    `SELECT item_kind, item_name, quantity, weapon_template_id,
            armor_template_id
     FROM ${table}
     WHERE ${ownerColumn} = ? AND option = ?
     ORDER BY sort_order`,
    [ownerId, params.option],
  ).map((row) => ({
    item_kind: String(row.item_kind),
    item_name: String(row.item_name),
    quantity: Number(row.quantity),
    weapon_template_id:
      row.weapon_template_id === null ? null : Number(row.weapon_template_id),
    armor_template_id:
      row.armor_template_id === null ? null : Number(row.armor_template_id),
  }));
}

/**
 * The granting source instance, resolved — or, for a background the
 * record-only `applyOrigin` path recorded without one, PRODUCED (plan §3's
 * second refusal, pinned): minting under NULL would make granted rows
 * indistinguishable from hand-added ones. The produced instance carries the
 * guided marker so the next background change deletes it — and, by the
 * composite cascade, every row it granted.
 */
function grantingSourceInstanceId(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
): number {
  if (params.kind === 'class') {
    const classInstance = db.scalar(
      `SELECT source.id
       FROM character_source_instances AS source
       INNER JOIN class_definitions AS definition
         ON definition.id = source.source_definition_id
       WHERE source.character_id = ?
         AND source.source_type = 'class'
         AND source.state = 'active'
         AND definition.content_key = ?`,
      [params.character_id, params.content_key],
    );
    if (typeof classInstance !== 'number') {
      throw new Error(
        `Character ${params.character_id} has no active class source ` +
          `instance for "${params.content_key}" to stamp equipment with. ` +
          'The wizard requires a class before anything else happens (D42).',
      );
    }
    return classInstance;
  }

  const backgroundInstance = db.scalar(
    `SELECT source.id
     FROM character_source_instances AS source
     INNER JOIN background_definitions AS definition
       ON definition.id = source.source_definition_id
     WHERE source.character_id = ?
       AND source.source_type = 'background'
       AND source.parent_source_instance_id IS NULL
       AND source.state = 'active'
       AND definition.content_key = ?`,
    [params.character_id, params.content_key],
  );
  if (typeof backgroundInstance === 'number') {
    return backgroundInstance;
  }

  const definitionId = db.scalar(
    'SELECT id FROM background_definitions WHERE content_key = ?',
    [params.content_key],
  );
  const displayName = db.scalar(
    'SELECT name FROM background_templates WHERE content_key = ?',
    [params.content_key],
  );
  if (typeof definitionId !== 'number' || typeof displayName !== 'string') {
    throw new Error(
      `The background "${params.content_key}" has no definition in this ` +
        'database, so granted equipment cannot be recorded with an owner.',
    );
  }
  const now = timestamp();
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state, notes,
       created_at, updated_at
     ) VALUES (?, ?, 'background', ?, ?, NULL, 1, 'active', ?, ?, ?)`,
    [
      params.character_id,
      crypto.randomUUID(),
      definitionId,
      displayName,
      GUIDED_BACKGROUND_SOURCE_MARKER,
      now,
      now,
    ],
  ).lastInsertId;
}

/** Record the choice in the instance's `config`, preserving every other key. */
function recordChoice(
  db: DatabaseContext,
  sourceInstanceId: number,
  choice: EquipmentChoiceConfig,
): void {
  const stored = db.scalar(
    'SELECT config FROM character_source_instances WHERE id = ?',
    [sourceInstanceId],
  );
  const parsed: unknown =
    typeof stored === 'string' && stored !== '' ? JSON.parse(stored) : {};
  const config: Record<string, unknown> =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, unknown>) }
      : {};
  config[EQUIPMENT_CHOICE_CONFIG_KEY] = {
    kind: choice.kind,
    option: choice.option,
  };
  db.exec(
    `UPDATE character_source_instances
     SET config = ?, updated_at = ?
     WHERE id = ?`,
    [JSON.stringify(config), timestamp(), sourceInstanceId],
  );
}

/**
 * Remove exactly what this source instance granted. The predicate is the
 * non-null stamp itself, so a NULL-sourced row — a person's own — is
 * unreachable by construction, not by care.
 */
function removeGrantedEquipment(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
): void {
  db.exec(
    `DELETE FROM character_weapons
     WHERE character_id = ? AND source_instance_id = ?`,
    [characterId, sourceInstanceId],
  );
  db.exec(
    `DELETE FROM character_armor
     WHERE character_id = ? AND source_instance_id = ?`,
    [characterId, sourceInstanceId],
  );
}

/** The template columns a character's weapon copies verbatim (D1b). */
const WEAPON_COPY_COLUMNS = [
  'name',
  'damage_kind',
  'damage_dice',
  'damage_flat',
  'damage_custom',
  'damage_type',
  'versatile_damage_kind',
  'versatile_damage_dice',
  'versatile_damage_flat',
  'versatile_damage_custom',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'ammunition_kind',
  'range_kind',
  'range_near_feet',
  'range_far_feet',
  'mastery_property',
  'other_properties',
] as const;

function mintWeapons(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  item: GrantableItem,
): void {
  if (item.weapon_template_id === null) {
    throw new Error(
      `Equipment item "${item.item_name}" is classified as a weapon but ` +
        'links no weapon template — the payload CHECK should have refused ' +
        'the seed.',
    );
  }
  const template = db.oneRaw(
    'SELECT * FROM weapon_templates WHERE id = ?',
    [item.weapon_template_id],
  );
  if (template === null) {
    throw new Error(
      `Weapon template ${item.weapon_template_id} for "${item.item_name}" ` +
        'does not exist.',
    );
  }
  const group = String(template.srd_group);
  if (!isEnumValue(srdWeaponGroups, group)) {
    throw new Error(
      `Weapon template "${String(template.name)}" carries unknown ` +
        `srd_group "${group}".`,
    );
  }
  const now = timestamp();
  const row: Record<string, unknown> = {
    character_id: characterId,
    source_instance_id: sourceInstanceId,
    proficiency_category: weaponProficiencyCategoryOf(group as SrdWeaponGroup),
    attack_kind: weaponAttackKindOf(group as SrdWeaponGroup),
    mastery_selected: 0,
    notes: null,
    created_at: now,
    updated_at: now,
  };
  for (const column of WEAPON_COPY_COLUMNS) {
    row[column] = template[column] ?? null;
  }
  const contract = rowContractError(
    'character_weapons',
    { id: 1, ...row },
    `Granted character_weapons row for "${item.item_name}"`,
  );
  if (contract !== null) {
    throw new Error(contract);
  }
  const columns = Object.keys(row);
  for (let count = 0; count < item.quantity; count += 1) {
    db.exec(
      `INSERT INTO character_weapons (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => row[column]) as BindableValue[],
    );
  }
}

/** The template columns a character's armour copies verbatim (D1b). */
const ARMOR_COPY_COLUMNS = [
  'name',
  'category',
  'armor_class',
  'dex_bonus',
  'dex_bonus_max',
  'strength_requirement',
  'stealth_disadvantage',
] as const;

function mintArmor(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  item: GrantableItem,
): void {
  if (item.armor_template_id === null) {
    throw new Error(
      `Equipment item "${item.item_name}" is classified as armor but links ` +
        'no armor template — the payload CHECK should have refused the seed.',
    );
  }
  const template = db.oneRaw(
    'SELECT * FROM armor_templates WHERE id = ?',
    [item.armor_template_id],
  );
  if (template === null) {
    throw new Error(
      `Armor template ${item.armor_template_id} for "${item.item_name}" ` +
        'does not exist.',
    );
  }
  const slot: ArmorSlot =
    String(template.category) === 'shield' ? 'shield' : 'worn';
  if (!isEnumValue(armorSlots, slot)) {
    throw new Error(`Unknown armor slot "${String(slot)}".`);
  }
  for (let count = 0; count < item.quantity; count += 1) {
    // THE COLLISION REFUSAL (§3, pinned): `character_armor` is UNIQUE on
    // `(character_id, slot)`, and a person who hand-added worn armour must be
    // told which item collided — never handed a raw SQLite constraint
    // violation, never silently overwritten. Our own previous grant is
    // already gone (the cleanup ran first), so any occupant is either a
    // person's own row or another source's grant; both refuse.
    const holder = db.scalar(
      `SELECT name FROM character_armor
       WHERE character_id = ? AND slot = ?`,
      [characterId, slot],
    );
    if (holder !== null) {
      throw new EquipmentGrantRefusal(
        {
          reason: 'armor_slot_occupied',
          slot,
          item: String(template.name),
          holder: String(holder),
        },
        `The ${slot} slot already holds ${String(holder)}, so ` +
          `${String(template.name)} cannot be granted. Remove or reslot the ` +
          'existing item first.',
      );
    }
    const now = timestamp();
    const row: Record<string, unknown> = {
      character_id: characterId,
      source_instance_id: sourceInstanceId,
      slot,
      notes: null,
      created_at: now,
      updated_at: now,
    };
    for (const column of ARMOR_COPY_COLUMNS) {
      row[column] = template[column] ?? null;
    }
    const contract = rowContractError(
      'character_armor',
      { id: 1, ...row },
      `Granted character_armor row for "${item.item_name}"`,
    );
    if (contract !== null) {
      throw new Error(contract);
    }
    const columns = Object.keys(row);
    db.exec(
      `INSERT INTO character_armor (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => row[column]) as BindableValue[],
    );
  }
}

/**
 * Apply (or change) one source's starting-equipment package choice. See the
 * module header for the four steps; everything happens inside one
 * transaction, so an `EquipmentGrantRefusal` rolls the WHOLE apply back —
 * the recorded choice, the cleanup and every already-minted row.
 */
export function applyEquipmentPackageChoice(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
): void {
  db.transaction(() => {
    const items = grantableItems(db, params);
    const sourceInstanceId = grantingSourceInstanceId(db, params);
    recordChoice(db, sourceInstanceId, params);
    removeGrantedEquipment(db, params.character_id, sourceInstanceId);
    for (const item of items) {
      if (item.item_kind === 'weapon') {
        mintWeapons(db, params.character_id, sourceInstanceId, item);
      } else if (item.item_kind === 'armor') {
        mintArmor(db, params.character_id, sourceInstanceId, item);
      }
      // `gear` mints NOTHING (D65): a Dungeoneer's Pack and a trailing GP
      // line render from the rules tables and are never owned.
    }
  });
}
