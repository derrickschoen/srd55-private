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
import type { ContentKey } from '../domain/ids';
import type {
  BackgroundContentAggregate,
  ContentFingerprintReference,
} from '../authoring/contracts';
import {
  projectStoredPortableContentV1,
  storedContentMatchesFingerprintReferenceV1,
} from '../catalog/stored-content-projector-v1';
import {
  weaponAttackKindOf,
  weaponProficiencyCategoryOf,
} from '../rules/weapon-template-fold';

/**
 * THE STARTING-EQUIPMENT MINT — the runtime the seam's
 * `EQUIPMENT_GRANTS_MODULE` names, reshaped by owner ruling D69
 * (`.claude/decisions.md`): weapons and armour carry NO provenance. E-A
 * originally stamped every minted row with its granting source instance and
 * keyed an option-change cleanup on the stamp; the owner rejected the premise
 * — "I don't care where the greatsword came from" — so minted rows arrive as
 * plain rows, exactly like hand-added ones.
 *
 * WHAT ONE APPLY DOES, in one transaction:
 *
 *  1. resolves the RECORDING source instance — the character's active class
 *     instance for `kind: 'class'`, the guided background instance for
 *     `kind: 'background'` (produced HERE when the record-only `applyOrigin`
 *     path left the background without one — the recorded CHOICE needs a
 *     `config` to live in);
 *  2. if that instance already records EXACTLY this choice, stops — a
 *     re-confirmation is a no-op, never a duplicate mint;
 *  3. records the CHOICE in the instance's `config` under the seam's
 *     `EQUIPMENT_CHOICE_CONFIG_KEY` — which is already on the share wire, so
 *     the recorded choice travels for free;
 *  4. mints owned `character_weapons` / `character_armor` rows for the chosen
 *     option's `weapon`/`armor` items, quantities expanded to rows; mints
 *     NOTHING for `gear` (D65) and therefore nothing for a package's trailing
 *     GP line, which IS a gear row (D56).
 *
 * CHANGING THE OPTION DOES NOT CLEAN UP (D69, point 5). With no stamp there
 * is nothing to key a cleanup on, and under the ruling that is correct rather
 * than a gap: the minted rows are the player's, and the player removes what
 * they do not want. A switch whose new option needs an occupied armour slot
 * refuses by name (below) until the player clears the slot themselves.
 */

/**
 * The armour-slot collision, refused by NAME with whole-apply rollback — the
 * shape S-B built for `skill_already_held`, never a raw SQLite constraint
 * violation and never a silent overwrite. Thrown inside the transaction, so
 * the whole apply (choice and every already-minted row) rolls back.
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
  readonly expected_dependency: ContentFingerprintReference<'weapon' | 'armor'> | null;
}

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * The chosen option's rows, from the rules tables the seeders own. An option
 * letter with no rows is legal here — a gold-only option (Wizard B) has gear
 * rows only after D40 retired the coin kind, and some letters simply do not
 * exist for a source — the mint then records the choice and mints nothing,
 * which is exactly what choosing a packageless option means.
 * WHICH options the step OFFERS (suppressing gold-only ones per D56) is
 * E-B's filter, not this module's.
 */
function grantableItems(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
): GrantableItem[] {
  const recordedEquipment = params.kind === 'background'
    ? (() => {
        const projection = projectStoredPortableContentV1(
          db,
          'background',
          params.content_key as ContentKey,
        );
        if (projection.kind !== 'background') {
          throw new Error('Stored background projection returned another content kind.');
        }
        const aggregate = projection.aggregate as BackgroundContentAggregate;
        return params.option === 'a'
          ? aggregate.equipment_option_a
          : aggregate.equipment_option_b;
      })()
    : [];
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
    `SELECT sort_order, item_kind, item_name, quantity, weapon_template_id,
            armor_template_id
     FROM ${table}
     WHERE ${ownerColumn} = ? AND option = ?
     ORDER BY sort_order`,
    [ownerId, params.option],
  ).map((row) => {
    const kind = String(row.item_kind);
    const recorded = recordedEquipment.find(
      (item) => item.sort_order === Number(row.sort_order),
    );
    const expectedDependency =
      (kind === 'weapon' || kind === 'armor') && recorded?.kind === kind
        ? recorded.content
        : null;
    return {
      item_kind: kind,
      item_name: String(row.item_name),
      quantity: Number(row.quantity),
      weapon_template_id:
        row.weapon_template_id === null ? null : Number(row.weapon_template_id),
      armor_template_id:
        row.armor_template_id === null ? null : Number(row.armor_template_id),
      expected_dependency: expectedDependency,
    };
  });
}

function assertDependencyCurrent(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
  item: GrantableItem,
): void {
  if (params.kind !== 'background' || item.item_kind === 'gear') return;
  const dependencyKind = item.item_kind === 'weapon' ? 'weapon' : 'armor';
  const templateId = dependencyKind === 'weapon'
    ? item.weapon_template_id
    : item.armor_template_id;
  const table = dependencyKind === 'weapon' ? 'weapon_templates' : 'armor_templates';
  const contentKey = templateId === null
    ? null
    : db.scalar<string>(`SELECT content_key FROM ${table} WHERE id = ?`, [templateId]);
  if (
    contentKey !== null &&
    item.expected_dependency?.kind === dependencyKind &&
    storedContentMatchesFingerprintReferenceV1(
      db,
      contentKey as ContentKey,
      item.expected_dependency,
    )
  ) {
    return;
  }
  throw new EquipmentGrantRefusal(
    {
      reason: 'equipment_dependency_drift',
      content_key: contentKey ?? params.content_key,
      dependency_kind: dependencyKind,
      item: item.item_name,
    },
    `The ${dependencyKind} dependency for "${item.item_name}" no longer ` +
      'matches the fingerprint recorded by this background.',
  );
}

/**
 * The source instance the CHOICE is recorded on — or, for a background the
 * record-only `applyOrigin` path recorded without one, PRODUCED: the choice
 * lives in a `config` and needs a row to carry it. Since D69 the instance no
 * longer owns any minted row; it owns only the record. The produced instance
 * still carries the guided marker so the next background change deletes it —
 * taking the recorded choice with it, while the minted rows (the player's
 * own, under the ruling) stay.
 */
function recordingSourceInstanceId(
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
          `instance for "${params.content_key}" to record the equipment ` +
          'choice on. The wizard requires a class before anything else ' +
          'happens (D42).',
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
        'database, so its equipment choice cannot be recorded.',
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

/** The instance's parsed `config`, or `{}` for NULL/non-object storage. */
function storedConfig(
  db: DatabaseContext,
  sourceInstanceId: number,
): Record<string, unknown> {
  const stored = db.scalar(
    'SELECT config FROM character_source_instances WHERE id = ?',
    [sourceInstanceId],
  );
  const parsed: unknown =
    typeof stored === 'string' && stored !== '' ? JSON.parse(stored) : {};
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? { ...(parsed as Record<string, unknown>) }
    : {};
}

/** True when the instance already records exactly this choice. */
function choiceAlreadyRecorded(
  config: Record<string, unknown>,
  choice: EquipmentChoiceConfig,
): boolean {
  const recorded = config[EQUIPMENT_CHOICE_CONFIG_KEY];
  return (
    typeof recorded === 'object' &&
    recorded !== null &&
    (recorded as Record<string, unknown>).kind === choice.kind &&
    (recorded as Record<string, unknown>).option === choice.option
  );
}

/** Record the choice in the instance's `config`, preserving every other key. */
function recordChoice(
  db: DatabaseContext,
  sourceInstanceId: number,
  config: Record<string, unknown>,
  choice: EquipmentChoiceConfig,
): void {
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
    // `(character_id, slot)`, and a person who holds worn armour must be
    // told which item collided — never handed a raw SQLite constraint
    // violation, never silently overwritten. Since D69 there is no cleanup
    // and no stamp, so a previously minted grant is indistinguishable from a
    // person's own row; whatever holds the slot, the mint refuses and the
    // player clears the slot themselves.
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
 * module header for the steps; everything happens inside one transaction, so
 * an `EquipmentGrantRefusal` rolls the WHOLE apply back — the recorded
 * choice and every already-minted row.
 */
export function applyEquipmentPackageChoice(
  db: DatabaseContext,
  params: EquipmentChoiceParams,
): void {
  db.transaction(() => {
    const items = grantableItems(db, params);
    for (const item of items) assertDependencyCurrent(db, params, item);
    const sourceInstanceId = recordingSourceInstanceId(db, params);
    const config = storedConfig(db, sourceInstanceId);
    if (choiceAlreadyRecorded(config, params)) {
      // Re-confirming the recorded choice is a NO-OP: with no cleanup (D69)
      // a re-mint would duplicate every row the first apply produced.
      return;
    }
    recordChoice(db, sourceInstanceId, config, params);
    for (const item of items) {
      if (item.item_kind === 'weapon') {
        mintWeapons(db, params.character_id, item);
      } else if (item.item_kind === 'armor') {
        mintArmor(db, params.character_id, item);
      }
      // `gear` mints NOTHING (D65): a Dungeoneer's Pack and a trailing GP
      // line render from the rules tables and are never owned.
    }
  });
}
