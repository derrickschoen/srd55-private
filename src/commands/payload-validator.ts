import type { CharacterCommandPayload } from '../domain/command-contracts';
import {
  abilities,
  isEnumValue,
  selectionEligibilities,
  slotStates,
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

function validateRestoreSnapshot(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'snapshot', 'integrity', 'reason']);
  const snapshot = objectValue(
    record.snapshot,
    'Character snapshot must be an object.',
  );
  canonicalizeJson(snapshot);
  validateIntegrity(record);
}

export function validateCharacterCommandPayload(
  payload: unknown,
): CharacterCommandPayload {
  let record = objectValue(payload, 'Character command must be an object.');
  const type = requiredString(record, 'type', 22);
  if (hasOwn(record, 'reason')) {
    requiredString(record, 'reason', 255);
  }
  if (!isEnumValue(commandTypes, type)) {
    return invalid('Unknown character command type.');
  }

  switch (type) {
    case 'update_ability':
      validateUpdateAbility(record);
      break;
    case 'set_slot':
      validateSetSlot(record);
      break;
    case 'update_character_rules':
      validateUpdateCharacterRules(record);
      break;
    case 'update_source_config':
      validateUpdateSourceConfig(record);
      break;
    case 'add_source':
      validateAddSource(record);
      break;
    case 'remove_source':
      validateRemoveSource(record);
      break;
    case 'acknowledge_warning':
      record = validateAcknowledgeWarning(record);
      break;
    case 'update_class':
      validateUpdateClass(record);
      break;
    case 'restore_snapshot':
      validateRestoreSnapshot(record);
      break;
  }

  return record as unknown as CharacterCommandPayload;
}

export class CharacterCommandPayloadValidator {
  validate(payload: unknown): CharacterCommandPayload {
    return validateCharacterCommandPayload(payload);
  }
}
