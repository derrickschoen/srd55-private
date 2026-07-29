import type { CharacterCommandPayload } from '../domain/command-contracts';
import {
  abilities,
  abilityAllocationMethods,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  isEnumValue,
  selectionEligibilities,
  skills,
  slotStates,
  weaponAttackKinds,
  weaponMasteryProperties,
  weaponProficiencyCategories,
} from '../domain/enums';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../domain/weapon-limits';
import {
  SHEET_ADJUSTMENT_BOUNDS,
  SHEET_ARMOR_MAX,
  SHEET_ROLL_BOUNDS,
  SHEET_TEXT_LIMITS,
} from '../domain/sheet-limits';
import { canonicalizeJson } from './canonical-json';

type UnknownRecord = Record<string, unknown>;

const commandTypes = [
  'update_ability',
  'allocate_abilities',
  'set_slot',
  'update_character_rules',
  'update_source_config',
  'add_source',
  'remove_source',
  'acknowledge_warning',
  'update_class',
  'add_weapon',
  'update_weapon',
  'remove_weapon',
  'set_weapon_mastery',
  'set_armor',
  'set_hit_point_roll',
  'set_skill_proficiency',
  'choose_multiclass_skill',
  'fill_skill_grant',
  'set_armor_class_adjustment',
  'restore_snapshot',
] as const;

/**
 * The longest command type, DERIVED.
 *
 * `type` was bounded by a hand-written `22`, which is exactly the length of
 * `update_source_config` plus slack — and `set_armor_class_adjustment` is 26,
 * so adding it would have made every one of those commands fail validation
 * with a message about the string being too long rather than about the command.
 * Deriving the bound means the next command type cannot reintroduce that.
 */
const COMMAND_TYPE_MAX_LENGTH = Math.max(
  ...commandTypes.map((type) => type.length),
);

const slotModes = ['select', 'clear', 'keep_override', 'restore'] as const;
const warningModes = ['acknowledge', 'delete'] as const;
const sourceTypes = ['class', 'feat', 'species', 'background'] as const;
const slotRestoreKeys = [
  'current_spell_version_id',
  'selection_eligibility',
  'selection_invalid_reason',
  'state',
  'override_note',
] as const;

export class CharacterCommandPayloadError extends TypeError {}

function invalid(message: string): never {
  throw new CharacterCommandPayloadError(message);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function objectValue(value: unknown, message: string): UnknownRecord {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    return invalid(message);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return invalid(message);
  }
  return value as UnknownRecord;
}

function rejectUnknown(
  record: UnknownRecord,
  allowed: readonly string[],
  subject = 'command',
): void {
  const unknown = Object.keys(record).find((key) => !allowed.includes(key));
  if (unknown !== undefined) {
    invalid(`Unknown ${subject} field: ${unknown}.`);
  }
}

function requiredString(
  record: UnknownRecord,
  key: string,
  maximum: number,
): string {
  const value = record[key];
  if (!hasOwn(record, key) || typeof value !== 'string') {
    return invalid(`${key} must be a string.`);
  }
  if ([...value].length > maximum) {
    return invalid(`${key} must not exceed ${maximum} characters.`);
  }
  return value;
}

function nonEmptyString(
  record: UnknownRecord,
  key: string,
  maximum: number,
): string {
  const value = requiredString(record, key, maximum);
  if (value.trim() === '') {
    return invalid(`${key} must not be empty.`);
  }
  return value;
}

function requiredInteger(record: UnknownRecord, key: string): number {
  const value = record[key];
  if (!hasOwn(record, key) || !Number.isSafeInteger(value)) {
    return invalid(`${key} must be an integer.`);
  }
  return value as number;
}

function positiveInteger(record: UnknownRecord, key: string): number {
  const value = requiredInteger(record, key);
  if (value < 1) {
    return invalid(`${key} must be a positive integer.`);
  }
  return value;
}

function validateIntegrity(record: UnknownRecord): void {
  const value = requiredString(record, 'integrity', 64);
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    invalid('integrity must be a 64-character hexadecimal signature.');
  }
}

function validateSlotRestoreState(value: unknown): void {
  const state = objectValue(value, 'Slot restore state must be an object.');
  rejectUnknown(state, slotRestoreKeys, 'slot restore state');

  for (const key of slotRestoreKeys) {
    if (!hasOwn(state, key)) {
      invalid(`Slot restore state is missing ${key}.`);
    }
  }

  const spellVersionId = state.current_spell_version_id;
  if (
    spellVersionId !== null &&
    (!Number.isSafeInteger(spellVersionId) || (spellVersionId as number) < 1)
  ) {
    invalid(
      'Slot restore spell_version_id must be a positive integer or null.',
    );
  }

  if (
    !isEnumValue(
      selectionEligibilities,
      state.selection_eligibility,
    )
  ) {
    invalid('Unknown slot selection eligibility.');
  }

  if (
    state.selection_invalid_reason !== null &&
    typeof state.selection_invalid_reason !== 'string'
  ) {
    invalid('Slot selection invalid reason must be a string or null.');
  }

  if (!isEnumValue(slotStates, state.state)) {
    invalid('Unknown restored slot state.');
  }

  if (
    state.override_note !== null &&
    typeof state.override_note !== 'string'
  ) {
    invalid('Slot override note must be a string or null.');
  }
}

function validateUpdateAbility(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'ability', 'score', 'reason']);
  const ability = requiredString(record, 'ability', 40);
  if (!isEnumValue(abilities, ability)) {
    invalid('Unknown ability.');
  }
  requiredInteger(record, 'score');
}

/**
 * The atomic allocation (plan §3.1): EVERY one of the six abilities must be
 * present — a partial map would be exactly the partial allocation the single
 * command exists to make unrepresentable. Bounds are the schema's own 1–30;
 * all 10s is VALID (D64), not an error state.
 */
function validateAllocateAbilities(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'method', 'scores', 'reason']);
  const method = requiredString(record, 'method', 40);
  if (!isEnumValue(abilityAllocationMethods, method)) {
    invalid('Unknown ability allocation method.');
  }
  const scores = objectValue(
    record.scores,
    'Ability scores must be an object.',
  );
  rejectUnknown(scores, abilities, 'ability scores');
  for (const ability of abilities) {
    if (!hasOwn(scores, ability)) {
      invalid(`Ability scores are missing ${ability}.`);
    }
    boundedInteger(scores, ability, 1, 30);
  }
}

function validateSetSlot(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'slot_id',
    'mode',
    'spell_version_id',
    'note',
    'state',
    'integrity',
    'reason',
  ]);
  positiveInteger(record, 'slot_id');
  const mode = requiredString(record, 'mode', 13);
  if (!isEnumValue(slotModes, mode)) {
    invalid('Unknown slot mutation mode.');
  }

  if (mode === 'select') {
    positiveInteger(record, 'spell_version_id');
  } else if (mode === 'keep_override') {
    nonEmptyString(record, 'note', 2000);
  } else if (mode === 'restore') {
    validateSlotRestoreState(record.state);
    validateIntegrity(record);
  }
}

function validateUpdateCharacterRules(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'allow_legacy', 'reason']);
  if (!hasOwn(record, 'allow_legacy') || typeof record.allow_legacy !== 'boolean') {
    invalid('allow_legacy must be a boolean.');
  }
}

function validateChooseMulticlassSkill(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'skill', 'reason']);
  const skill = requiredString(record, 'skill', 40);
  if (!isEnumValue(skills, skill)) {
    invalid('Unknown skill.');
  }
}

function validateUpdateSourceConfig(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'source_instance_id',
    'chosen_list',
    'chosen_option',
    'reason',
  ]);
  positiveInteger(record, 'source_instance_id');
  const hasChosenList = hasOwn(record, 'chosen_list');
  const hasChosenOption = hasOwn(record, 'chosen_option');
  if (hasChosenList === hasChosenOption) {
    invalid(
      'Source configuration must provide exactly one of chosen_list or chosen_option.',
    );
  }
  nonEmptyString(
    record,
    hasChosenList ? 'chosen_list' : 'chosen_option',
    80,
  );
}

function validateAddSource(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'source_type',
    'source_definition_id',
    'config',
    'reason',
  ]);
  const sourceType = requiredString(record, 'source_type', 10);
  if (!isEnumValue(sourceTypes, sourceType)) {
    invalid('Source type must be class, feat, species, or background.');
  }
  positiveInteger(record, 'source_definition_id');
  const config = objectValue(record.config, 'Source config must be an object.');
  canonicalizeJson(config);

  if (sourceType === 'class') {
    rejectUnknown(
      config,
      [
        'level',
        'wizard_spellbook_acquisitions',
        'divine_order',
        'primal_order',
      ],
      'class source config',
    );
    const level = requiredInteger(config, 'level');
    if (level < 1 || level > 20) {
      invalid('Class source level must be between 1 and 20.');
    }
    if (
      hasOwn(config, 'wizard_spellbook_acquisitions') &&
      !Array.isArray(config.wizard_spellbook_acquisitions)
    ) {
      invalid('Wizard spellbook acquisitions must be a list.');
    }
  }
}

function validateRemoveSource(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'source_instance_id', 'reason']);
  positiveInteger(record, 'source_instance_id');
}

function validateAcknowledgeWarning(record: UnknownRecord): UnknownRecord {
  rejectUnknown(record, [
    'type',
    'mode',
    'warning_fingerprint',
    'note',
    'integrity',
    'reason',
  ]);
  nonEmptyString(record, 'warning_fingerprint', 255);
  const mode = hasOwn(record, 'mode')
    ? requiredString(record, 'mode', 11)
    : 'acknowledge';
  if (!isEnumValue(warningModes, mode)) {
    invalid('Unknown warning acknowledgement mode.');
  }

  const normalized = hasOwn(record, 'mode') ? record : { ...record, mode };
  if (mode === 'acknowledge') {
    nonEmptyString(normalized, 'note', 2000);
  } else {
    validateIntegrity(normalized);
  }
  return normalized;
}

function validateUpdateClass(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'class_definition_id',
    'level',
    'subclass_definition_id',
    'reason',
  ]);
  positiveInteger(record, 'class_definition_id');
  if (!hasOwn(record, 'level')) {
    invalid('Class level is required; use null to remove the class.');
  }
  if (record.level !== null) {
    requiredInteger(record, 'level');
  }
  if (
    hasOwn(record, 'subclass_definition_id') &&
    record.subclass_definition_id !== null
  ) {
    positiveInteger(record, 'subclass_definition_id');
  }
}

const weaponToggles = [
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
] as const;

const weaponFieldKeys = [
  'name',
  'proficiency_category',
  'attack_kind',
  'damage',
  'damage_type',
  'versatile_damage',
  ...weaponToggles,
  'ammunition_kind',
  'range',
  'mastery_property',
  'other_properties',
  'notes',
] as const;

function requiredBoolean(record: UnknownRecord, key: string): boolean {
  if (!hasOwn(record, key) || typeof record[key] !== 'boolean') {
    return invalid(`${key} must be a boolean.`);
  }
  return record[key] as boolean;
}

/** A nullable string, present as a key: `undefined` is not the same as `null`. */
function nullableString(
  record: UnknownRecord,
  key: string,
  maximum: number,
): void {
  if (!hasOwn(record, key)) {
    invalid(`${key} is required; use null when it is not known.`);
  }
  if (record[key] === null) {
    return;
  }
  requiredString(record, key, maximum);
}

/**
 * A nullable distance in feet.
 *
 * The upper bound is shared with the share boundary rather than restated, so
 * that a range this accepts is always a range a link can carry — see
 * `WEAPON_RANGE_MAX_FEET`.
 */
function nullableRangeDistance(record: UnknownRecord, key: string): void {
  if (!hasOwn(record, key)) {
    invalid(`${key} is required; use null when the weapon has no range.`);
  }
  const value = record[key];
  if (value === null) {
    return;
  }
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 0 ||
    (value as number) > WEAPON_RANGE_MAX_FEET
  ) {
    invalid(
      `${key} must be a non-negative integer of at most ${WEAPON_RANGE_MAX_FEET}, or null.`,
    );
  }
}

function validateWeaponRange(value: unknown, allowLegacy: boolean): void {
  const range = objectValue(value, 'range must be an object.');
  if (!hasOwn(range, 'kind') || typeof range.kind !== 'string') {
    invalid('range.kind is required.');
  }
  switch (range.kind) {
    case 'none':
      rejectUnknown(range, ['kind'], 'range');
      return;
    case 'ranged':
      rejectUnknown(range, ['kind', 'near_feet', 'far_feet'], 'range');
      nullableRangeDistance(range, 'near_feet');
      nullableRangeDistance(range, 'far_feet');
      if (range.near_feet === null) {
        invalid('range.near_feet is required for a ranged weapon.');
      }
      if (
        range.far_feet !== null &&
        Number(range.far_feet) < Number(range.near_feet)
      ) {
        invalid('range.far_feet must be at least range.near_feet.');
      }
      return;
    case 'legacy':
      if (!allowLegacy) {
        invalid('A new weapon cannot use a legacy range.');
      }
      rejectUnknown(range, ['kind', 'near_feet', 'far_feet'], 'range');
      nullableRangeDistance(range, 'near_feet');
      nullableRangeDistance(range, 'far_feet');
      if (range.far_feet === null) {
        invalid('range.far_feet is required for a legacy weapon range.');
      }
      if (
        range.near_feet !== null &&
        Number(range.far_feet) >= Number(range.near_feet)
      ) {
        invalid('A legacy weapon range must be long-only or inverted.');
      }
      return;
    default:
      invalid('range.kind is unsupported.');
  }
}

function validateDamage(
  value: unknown,
  label: 'damage' | 'versatile_damage',
): void {
  const damage = objectValue(value, `${label} must be an object.`);
  if (!hasOwn(damage, 'kind') || typeof damage.kind !== 'string') {
    invalid(`${label}.kind is required.`);
  }
  switch (damage.kind) {
    case 'dice':
      rejectUnknown(damage, ['kind', 'dice'], label);
      nonEmptyString(damage, 'dice', WEAPON_TEXT_LIMITS.damage_dice);
      return;
    case 'flat':
      rejectUnknown(damage, ['kind', 'amount'], label);
      if (
        !hasOwn(damage, 'amount') ||
        !Number.isSafeInteger(damage.amount) ||
        (damage.amount as number) < 0
      ) {
        invalid(`${label}.amount must be a non-negative integer.`);
      }
      return;
    case 'custom':
      rejectUnknown(damage, ['kind', 'text'], label);
      nonEmptyString(damage, 'text', WEAPON_TEXT_LIMITS.damage_custom);
      return;
    case 'not_recorded':
      if (label !== 'damage') {
        invalid('versatile_damage cannot be not_recorded.');
      }
      rejectUnknown(damage, ['kind'], label);
      return;
    case 'not_applicable':
      if (label !== 'versatile_damage') {
        invalid('damage cannot be not_applicable.');
      }
      rejectUnknown(damage, ['kind'], label);
      return;
    default:
      invalid(`${label}.kind is unsupported.`);
  }
}

/**
 * The weapon body, checked field by field.
 *
 * EVERY key must be present, `null` included. A partial body would let a
 * caller blank a field it never meant to touch, because `update_weapon`
 * replaces the whole row — and "the key was missing" and "the user cleared it"
 * would then be indistinguishable.
 */
function validateWeaponFields(value: unknown, allowLegacy = false): void {
  const weapon = objectValue(value, 'Weapon must be an object.');
  rejectUnknown(weapon, weaponFieldKeys, 'weapon');

  // Every length here comes from `WEAPON_TEXT_LIMITS` rather than a literal, so
  // that the share boundary can accept exactly what this one lets through.
  nonEmptyString(weapon, 'name', WEAPON_TEXT_LIMITS.name);
  if (!hasOwn(weapon, 'damage')) {
    invalid('damage is required.');
  }
  validateDamage(weapon.damage, 'damage');
  nullableString(weapon, 'damage_type', WEAPON_TEXT_LIMITS.damage_type);
  if (!hasOwn(weapon, 'versatile_damage')) {
    invalid('versatile_damage is required.');
  }
  validateDamage(weapon.versatile_damage, 'versatile_damage');
  for (const toggle of weaponToggles) {
    requiredBoolean(weapon, toggle);
  }
  nullableString(weapon, 'ammunition_kind', WEAPON_TEXT_LIMITS.ammunition_kind);
  if (!hasOwn(weapon, 'range')) {
    invalid('range is required.');
  }
  validateWeaponRange(weapon.range, allowLegacy);
  // D27. Present-and-null is the NOT STATED state a template pre-fill never
  // produces and an older payload always does; a MISSING key is refused with the
  // rest, because `update_weapon` replaces the whole row and "the key was
  // absent" would then be indistinguishable from "the user cleared it".
  if (!hasOwn(weapon, 'proficiency_category')) {
    invalid('proficiency_category is required; use null when it is not stated.');
  }
  if (
    weapon.proficiency_category !== null &&
    !isEnumValue(weaponProficiencyCategories, weapon.proficiency_category)
  ) {
    invalid('Weapon proficiency category must be simple, martial or null.');
  }
  if (!hasOwn(weapon, 'attack_kind')) {
    invalid('attack_kind is required; use null when it is not recorded.');
  }
  if (
    weapon.attack_kind !== null &&
    !isEnumValue(weaponAttackKinds, weapon.attack_kind)
  ) {
    invalid('Weapon attack kind must be melee, ranged or null.');
  }
  if (!hasOwn(weapon, 'mastery_property')) {
    invalid('mastery_property is required; use null for none.');
  }
  if (
    weapon.mastery_property !== null &&
    !isEnumValue(weaponMasteryProperties, weapon.mastery_property)
  ) {
    invalid('Unknown weapon mastery property.');
  }
  nullableString(
    weapon,
    'other_properties',
    WEAPON_TEXT_LIMITS.other_properties,
  );
  nullableString(weapon, 'notes', WEAPON_TEXT_LIMITS.notes);
}

function validateAddWeapon(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'weapon',
    'weapon_id',
    'mastery_selected',
    'reason',
  ]);
  validateWeaponFields(record.weapon, hasOwn(record, 'weapon_id'));
  // Both optional keys exist only on the inverse of a `remove_weapon`, so they
  // are checked when present and never required.
  if (hasOwn(record, 'weapon_id')) {
    positiveInteger(record, 'weapon_id');
  }
  if (hasOwn(record, 'mastery_selected')) {
    requiredBoolean(record, 'mastery_selected');
  }
}

function validateUpdateWeapon(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'weapon_id', 'weapon', 'reason']);
  positiveInteger(record, 'weapon_id');
  validateWeaponFields(record.weapon, true);
}

function validateRemoveWeapon(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'weapon_id', 'reason']);
  positiveInteger(record, 'weapon_id');
}

function validateSetWeaponMastery(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'weapon_id', 'selected', 'reason']);
  positiveInteger(record, 'weapon_id');
  requiredBoolean(record, 'selected');
}

/** A nullable signed integer inside an inclusive range, present as a key. */
function nullableBoundedInteger(
  record: UnknownRecord,
  key: string,
  minimum: number,
  maximum: number,
): void {
  if (!hasOwn(record, key)) {
    invalid(`${key} is required; use null when it does not apply.`);
  }
  if (record[key] === null) {
    return;
  }
  boundedInteger(record, key, minimum, maximum);
}

function boundedInteger(
  record: UnknownRecord,
  key: string,
  minimum: number,
  maximum: number,
): void {
  const value = record[key];
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    invalid(
      `${key} must be an integer from ${String(minimum)} to ${String(maximum)}.`,
    );
  }
}

const armorFieldKeys = [
  'name',
  'category',
  'armor_class',
  'dex_bonus',
  'dex_bonus_max',
  'strength_requirement',
  'stealth_disadvantage',
  'notes',
] as const;

/**
 * The armour body, checked field by field, then as a pair.
 *
 * EVERY key must be present, `null` included, for the reason
 * `validateWeaponFields` gives: `set_armor` replaces the whole slot, so "the
 * key was missing" and "the user cleared it" must not be indistinguishable.
 *
 * THE PAIR CHECKS ARE THE DATABASE'S OWN, and they are made here rather than
 * left to the INSERT so that a rejected payload names the field. Every bound
 * comes from `src/domain/sheet-limits.ts`, which the share boundary reads too —
 * so armour this accepts is always armour a link can carry.
 */
function validateArmorFields(value: unknown): void {
  const armor = objectValue(value, 'Armor must be an object.');
  rejectUnknown(armor, armorFieldKeys, 'armor');
  nonEmptyString(armor, 'name', SHEET_TEXT_LIMITS.armor_name);
  if (!isEnumValue(armorCategories, armor.category)) {
    invalid('Unknown armor category.');
  }
  if (!isEnumValue(armorDexBonuses, armor.dex_bonus)) {
    invalid('Unknown armor Dexterity bonus.');
  }
  boundedInteger(armor, 'armor_class', 1, SHEET_ARMOR_MAX.armor_class);
  // Lower bound 0, not 1: a cap of zero is a coherent house rule, and it is the
  // PAIRING below — not the magnitude — that the schema constrains.
  nullableBoundedInteger(
    armor,
    'dex_bonus_max',
    0,
    SHEET_ARMOR_MAX.dex_bonus_max,
  );
  nullableBoundedInteger(
    armor,
    'strength_requirement',
    1,
    SHEET_ARMOR_MAX.strength_requirement,
  );
  requiredBoolean(armor, 'stealth_disadvantage');
  nullableString(armor, 'notes', SHEET_TEXT_LIMITS.armor_notes);
  if ((armor.dex_bonus === 'capped') !== (armor.dex_bonus_max !== null)) {
    invalid('dex_bonus_max is present exactly when dex_bonus is capped.');
  }
  if (armor.category === 'shield' && armor.dex_bonus !== 'none') {
    invalid('A shield carries no Dexterity bonus.');
  }
}

function validateSetArmor(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'slot', 'armor', 'reason']);
  if (!isEnumValue(armorSlots, record.slot)) {
    invalid('Unknown armor slot.');
  }
  if (!hasOwn(record, 'armor')) {
    invalid('armor is required; use null to clear the slot.');
  }
  if (record.armor === null) {
    return;
  }
  validateArmorFields(record.armor);
}

function validateSetHitPointRoll(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'class_name',
    'class_level',
    'rolled_value',
    'reason',
  ]);
  nonEmptyString(record, 'class_name', SHEET_TEXT_LIMITS.class_name);
  boundedInteger(record, 'class_level', 1, 20);
  nullableBoundedInteger(
    record,
    'rolled_value',
    SHEET_ROLL_BOUNDS.minimum,
    SHEET_ROLL_BOUNDS.maximum,
  );
}

function validateFillSkillGrant(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'grant_id', 'skill', 'reason']);
  const grantId = record.grant_id;
  if (!Number.isSafeInteger(grantId) || (grantId as number) < 1) {
    invalid('grant_id must be a positive integer.');
  }
  // `null` is the pinned CLEAR (skills-with-provenance §3.3) — a defended
  // null, not a missing field: the key must be present either way.
  if (!hasOwn(record, 'skill')) {
    invalid('skill must be present (a skill, or null to clear).');
  }
  if (record.skill !== null && !isEnumValue(skills, record.skill)) {
    invalid('Unknown skill.');
  }
}

function validateSetSkillProficiency(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'skill', 'proficient', 'reason']);
  if (!isEnumValue(skills, record.skill)) {
    invalid('Unknown skill.');
  }
  requiredBoolean(record, 'proficient');
}

function validateSetArmorClassAdjustment(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'value', 'note', 'reason']);
  const magnitude = SHEET_ADJUSTMENT_BOUNDS.armorClassMagnitude;
  boundedInteger(record, 'value', -magnitude, magnitude);
  nullableString(record, 'note', SHEET_TEXT_LIMITS.adjustment_note);
}

function validateRestoreSnapshot(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'snapshot', 'integrity', 'reason']);
  const snapshot = objectValue(
    record.snapshot,
    'Character snapshot must be an object.',
  );
  canonicalizeJson(snapshot);
  validateIntegrity(record);
}

/**
 * Returns the validated record, normalized where a validator rewrites it. Every
 * arm returns and nothing follows the switch, so omitting a command type is a
 * compile error (TS2366) rather than a payload that ships unvalidated — the same
 * construction the command factory and prepareInverse rely on.
 */
function validateByType(
  type: (typeof commandTypes)[number],
  record: UnknownRecord,
): UnknownRecord {
  switch (type) {
    case 'update_ability':
      validateUpdateAbility(record);
      return record;
    case 'allocate_abilities':
      validateAllocateAbilities(record);
      return record;
    case 'set_slot':
      validateSetSlot(record);
      return record;
    case 'update_character_rules':
      validateUpdateCharacterRules(record);
      return record;
    case 'update_source_config':
      validateUpdateSourceConfig(record);
      return record;
    case 'add_source':
      validateAddSource(record);
      return record;
    case 'remove_source':
      validateRemoveSource(record);
      return record;
    case 'acknowledge_warning':
      return validateAcknowledgeWarning(record);
    case 'update_class':
      validateUpdateClass(record);
      return record;
    case 'add_weapon':
      validateAddWeapon(record);
      return record;
    case 'update_weapon':
      validateUpdateWeapon(record);
      return record;
    case 'remove_weapon':
      validateRemoveWeapon(record);
      return record;
    case 'set_weapon_mastery':
      validateSetWeaponMastery(record);
      return record;
    case 'set_armor':
      validateSetArmor(record);
      return record;
    case 'set_hit_point_roll':
      validateSetHitPointRoll(record);
      return record;
    case 'set_skill_proficiency':
      validateSetSkillProficiency(record);
      return record;
    case 'choose_multiclass_skill':
      validateChooseMulticlassSkill(record);
      return record;
    case 'fill_skill_grant':
      validateFillSkillGrant(record);
      return record;
    case 'set_armor_class_adjustment':
      validateSetArmorClassAdjustment(record);
      return record;
    case 'restore_snapshot':
      validateRestoreSnapshot(record);
      return record;
  }
}

export function validateCharacterCommandPayload(
  payload: unknown,
): CharacterCommandPayload {
  const record = objectValue(payload, 'Character command must be an object.');
  const type = requiredString(record, 'type', COMMAND_TYPE_MAX_LENGTH);
  if (hasOwn(record, 'reason')) {
    requiredString(record, 'reason', 255);
  }
  if (!isEnumValue(commandTypes, type)) {
    return invalid('Unknown character command type.');
  }

  return validateByType(type, record) as unknown as CharacterCommandPayload;
}

export class CharacterCommandPayloadValidator {
  validate(payload: unknown): CharacterCommandPayload {
    return validateCharacterCommandPayload(payload);
  }
}
