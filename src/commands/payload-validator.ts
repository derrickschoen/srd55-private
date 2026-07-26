import type { CharacterCommandPayload } from '../domain/command-contracts';
import {
  abilities,
  isEnumValue,
  selectionEligibilities,
  slotStates,
  weaponMasteryProperties,
} from '../domain/enums';
import { canonicalizeJson } from './canonical-json';

type UnknownRecord = Record<string, unknown>;

const commandTypes = [
  'update_ability',
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
  'restore_snapshot',
] as const;

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
  'damage_dice',
  'damage_type',
  'versatile_damage_dice',
  ...weaponToggles,
  'ammunition_kind',
  'range_normal_feet',
  'range_long_feet',
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

function nullableRange(record: UnknownRecord, key: string): void {
  if (!hasOwn(record, key)) {
    invalid(`${key} is required; use null when the weapon has no range.`);
  }
  const value = record[key];
  if (value === null) {
    return;
  }
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    invalid(`${key} must be a non-negative integer or null.`);
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
function validateWeaponFields(value: unknown): void {
  const weapon = objectValue(value, 'Weapon must be an object.');
  rejectUnknown(weapon, weaponFieldKeys, 'weapon');

  nonEmptyString(weapon, 'name', 120);
  // Free text, not a dice pattern: the source's own Blowgun does `1` damage and
  // a user may write whatever their table agreed on.
  nullableString(weapon, 'damage_dice', 40);
  nullableString(weapon, 'damage_type', 40);
  nullableString(weapon, 'versatile_damage_dice', 40);
  for (const toggle of weaponToggles) {
    requiredBoolean(weapon, toggle);
  }
  nullableString(weapon, 'ammunition_kind', 40);
  nullableRange(weapon, 'range_normal_feet');
  nullableRange(weapon, 'range_long_feet');
  if (!hasOwn(weapon, 'mastery_property')) {
    invalid('mastery_property is required; use null for none.');
  }
  if (
    weapon.mastery_property !== null &&
    !isEnumValue(weaponMasteryProperties, weapon.mastery_property)
  ) {
    invalid('Unknown weapon mastery property.');
  }
  nullableString(weapon, 'other_properties', 500);
  nullableString(weapon, 'notes', 2000);
}

function validateAddWeapon(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'weapon',
    'weapon_id',
    'mastery_selected',
    'reason',
  ]);
  validateWeaponFields(record.weapon);
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
  validateWeaponFields(record.weapon);
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
    case 'restore_snapshot':
      validateRestoreSnapshot(record);
      return record;
  }
}

export function validateCharacterCommandPayload(
  payload: unknown,
): CharacterCommandPayload {
  const record = objectValue(payload, 'Character command must be an object.');
  const type = requiredString(record, 'type', 22);
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
