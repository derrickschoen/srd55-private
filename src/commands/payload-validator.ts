import type { CharacterCommandPayload } from '../domain/command-contracts';
import {
  abilities,
  abilityAllocationMethods,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  characterEffectKinds,
  extraAttackWeaponScopes,
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
  SHEET_ARMOR_MAX,
  SHEET_ROLL_BOUNDS,
  SHEET_TEXT_LIMITS,
} from '../domain/sheet-limits';
import { canonicalizeJson } from './canonical-json';
import {
  ORIGIN_EFFECT_MAGNITUDE_MAX,
  ORIGIN_TEXT_LIMITS,
} from '../domain/origin-limits';
import { attunementSlots } from '../domain/attunement';

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
  'level_up_class',
  'add_weapon',
  'update_weapon',
  'remove_weapon',
  'set_weapon_mastery',
  'add_item',
  'update_item',
  'remove_item',
  'attune_item',
  'unattune_item',
  'replace_attuned_item',
  'restore_attunement_slot',
  'set_armor',
  'set_hit_point_roll',
  // `set_skill_proficiency` and `choose_multiclass_skill` are RETIRED
  // (skills-with-provenance §3.5): deliberately absent, so both refuse as
  // 'Unknown character command type.' — the S-LEGACY control's assertion.
  'fill_skill_grant',
  'restore_snapshot',
] as const;

/**
 * The longest command type, DERIVED.
 *
 * `type` was bounded by a hand-written `22`, which is exactly the length of
 * `update_source_config` plus slack. Deriving the bound means the next command
 * type cannot make its own name fail validation.
 */
const COMMAND_TYPE_MAX_LENGTH = Math.max(
  // Preserve the retired-command boundary: old RPC names at this length must
  // reach the vocabulary check and receive "unknown command", not a misleading
  // string-length error.
  26,
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

/**
 * `level` is REFUSED HERE, BY NAME (level-up plan §3). The field used to be
 * accepted 1..20, which meant any caller could move a level without a
 * hit-point row and no control would fire — L-STRAIGHT and its siblings
 * guard `level_up_class`, not this command. `rejectUnknown` refuses the key,
 * so a payload still carrying it fails with "Unknown command field: level."
 * rather than being silently ignored.
 */
function validateUpdateClass(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'class_definition_id',
    'subclass_definition_id',
    'remove',
    'reason',
  ]);
  positiveInteger(record, 'class_definition_id');
  if (hasOwn(record, 'remove')) {
    if (record.remove !== true) {
      invalid('remove must be true when present.');
    }
    if (hasOwn(record, 'subclass_definition_id')) {
      invalid('A removed class cannot also set a subclass.');
    }
    return;
  }
  if (
    hasOwn(record, 'subclass_definition_id') &&
    record.subclass_definition_id !== null
  ) {
    positiveInteger(record, 'subclass_definition_id');
  }
}

/**
 * The one levelling payload (level-up plan §8b, reduced by D77: no hit-point
 * field — the fixed value is computed, never carried). Structural facts are
 * checked here — the SRD's +2/+1+1 increase shape — while the four DOMAIN
 * refusals (class held, adjacency, subclass at 3, ASI required) belong to
 * the command, which is the layer every caller shares.
 */
function validateLevelUpClass(record: UnknownRecord): void {
  rejectUnknown(record, [
    'type',
    'class_definition_id',
    'target_level',
    'subclass_content_key',
    'ability_increases',
    'reason',
  ]);
  positiveInteger(record, 'class_definition_id');
  // 2..20: level 1 is creation's, and a target above 20 is not a level.
  boundedInteger(record, 'target_level', 2, 20);

  if (hasOwn(record, 'subclass_content_key')) {
    nonEmptyString(record, 'subclass_content_key', 255);
  }

  if (hasOwn(record, 'ability_increases')) {
    const increases = record.ability_increases;
    if (!Array.isArray(increases)) {
      invalid('ability_increases must be a list.');
    }
    // SRD 2024 ASI: +2 to one ability, or +1 to each of two DIFFERENT
    // abilities. One or two entries, each amount 1 or 2, summing to exactly
    // 2 — a singular field cannot express the +1/+1 arm, which is why the
    // seam pins a LIST.
    if (increases.length < 1 || increases.length > 2) {
      invalid('ability_increases must hold one or two increases.');
    }
    const seen = new Set<string>();
    let total = 0;
    for (const entry of increases) {
      const increase = objectValue(
        entry,
        'Each ability increase must be an object.',
      );
      rejectUnknown(increase, ['ability', 'amount'], 'ability increase');
      if (!isEnumValue(abilities, increase.ability)) {
        invalid('Unknown ability.');
      }
      if (seen.has(increase.ability as string)) {
        invalid('An ability cannot be increased twice in one improvement.');
      }
      seen.add(increase.ability as string);
      boundedInteger(increase, 'amount', 1, 2);
      total += increase.amount as number;
    }
    if (total !== 2) {
      invalid('Ability increases must total exactly 2 (+2, or +1 and +1).');
    }
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
  'effects',
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
  if (hasOwn(weapon, 'effects')) {
    validateEquipmentEffects(weapon.effects);
  }
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

const EFFECT_COMMON_KEYS = [
  'effect_kind',
  'label',
  'notes',
  'effect_id',
  'sort_order',
] as const;

function validateEffectCommon(
  effect: UnknownRecord,
  fields: readonly string[],
): void {
  rejectUnknown(effect, [...EFFECT_COMMON_KEYS, ...fields], 'effect');
  nonEmptyString(effect, 'label', ORIGIN_TEXT_LIMITS.trait_name);
  nullableString(effect, 'notes', ORIGIN_TEXT_LIMITS.notes);
  if (hasOwn(effect, 'effect_id')) {
    positiveInteger(effect, 'effect_id');
  }
  if (hasOwn(effect, 'sort_order')) {
    positiveInteger(effect, 'sort_order');
  }
}

function signedEffectInteger(
  effect: UnknownRecord,
  key: string,
  nullable = false,
): void {
  if (nullable && effect[key] === null) {
    return;
  }
  boundedInteger(
    effect,
    key,
    -ORIGIN_EFFECT_MAGNITUDE_MAX,
    ORIGIN_EFFECT_MAGNITUDE_MAX,
  );
}

function validateEquipmentEffect(value: unknown): void {
  const effect = objectValue(value, 'Effect must be an object.');
  if (
    !hasOwn(effect, 'effect_kind') ||
    !isEnumValue(characterEffectKinds, effect.effect_kind)
  ) {
    invalid('Effect kind is unsupported.');
  }
  switch (effect.effect_kind) {
    case 'damage_resistance':
      validateEffectCommon(effect, ['damage_type']);
      nullableString(
        effect,
        'damage_type',
        ORIGIN_TEXT_LIMITS.name,
      );
      return;
    case 'hp_modifier':
      validateEffectCommon(effect, [
        'hit_points_flat',
        'hit_points_per_level',
      ]);
      signedEffectInteger(effect, 'hit_points_flat', true);
      signedEffectInteger(effect, 'hit_points_per_level', true);
      if (
        effect.hit_points_flat === null &&
        effect.hit_points_per_level === null
      ) {
        invalid('An hp_modifier effect requires a hit point value.');
      }
      return;
    case 'speed':
      validateEffectCommon(effect, ['speed_bonus_feet']);
      signedEffectInteger(effect, 'speed_bonus_feet');
      return;
    case 'ability_increase':
      validateEffectCommon(effect, ['ability', 'amount', 'maximum']);
      if (!isEnumValue(abilities, effect.ability)) {
        invalid('Effect ability is unsupported.');
      }
      signedEffectInteger(effect, 'amount');
      if (effect.amount === 0) {
        invalid('Effect amount must not be zero.');
      }
      boundedInteger(effect, 'maximum', 1, 30);
      return;
    case 'armor_class_bonus':
      validateEffectCommon(effect, ['amount']);
      signedEffectInteger(effect, 'amount');
      if (effect.amount === 0) {
        invalid('Effect amount must not be zero.');
      }
      return;
    case 'armor_class_formula':
      validateEffectCommon(effect, [
        'base',
        'ability_1',
        'ability_2',
        'allows_shield',
      ]);
      boundedInteger(effect, 'base', 1, ORIGIN_EFFECT_MAGNITUDE_MAX);
      if (!isEnumValue(abilities, effect.ability_1)) {
        invalid('Effect ability_1 is unsupported.');
      }
      if (
        effect.ability_2 !== null &&
        !isEnumValue(abilities, effect.ability_2)
      ) {
        invalid('Effect ability_2 is unsupported.');
      }
      requiredBoolean(effect, 'allows_shield');
      return;
    case 'attack_ability_override':
      validateEffectCommon(effect, ['ability', 'weapon_scope']);
      if (!isEnumValue(abilities, effect.ability)) {
        invalid('Effect ability is unsupported.');
      }
      if (!isEnumValue(extraAttackWeaponScopes, effect.weapon_scope)) {
        invalid('Effect weapon_scope is unsupported.');
      }
      return;
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      validateEffectCommon(effect, ['amount', 'weapon_scope']);
      signedEffectInteger(effect, 'amount');
      if (effect.amount === 0) {
        invalid('Effect amount must not be zero.');
      }
      if (!isEnumValue(extraAttackWeaponScopes, effect.weapon_scope)) {
        invalid('Effect weapon_scope is unsupported.');
      }
      return;
  }
}

function validateEquipmentEffects(value: unknown): void {
  if (!Array.isArray(value)) {
    invalid('effects must be a list.');
  }
  if (value.length > 200) {
    invalid('effects must not contain more than 200 rows.');
  }
  for (const effect of value) {
    validateEquipmentEffect(effect);
  }
}

function validateItemFields(value: unknown): void {
  const item = objectValue(value, 'Item must be an object.');
  rejectUnknown(
    item,
    [
      'name',
      'description',
      'quantity',
      'requires_attunement',
      'source_instance_id',
      'effects',
    ],
    'item',
  );
  nonEmptyString(item, 'name', ORIGIN_TEXT_LIMITS.trait_name);
  nullableString(item, 'description', ORIGIN_TEXT_LIMITS.description);
  positiveInteger(item, 'quantity');
  requiredBoolean(item, 'requires_attunement');
  if (!hasOwn(item, 'source_instance_id')) {
    invalid('source_instance_id is required; use null when absent.');
  }
  if (item.source_instance_id !== null) {
    positiveInteger(item, 'source_instance_id');
  }
  if (hasOwn(item, 'effects')) {
    validateEquipmentEffects(item.effects);
  }
}

function validateAddItem(record: UnknownRecord): void {
  rejectUnknown(
    record,
    ['type', 'item', 'item_id', 'attunement_slot', 'reason'],
  );
  validateItemFields(record.item);
  if (hasOwn(record, 'item_id')) {
    positiveInteger(record, 'item_id');
  }
  if (
    hasOwn(record, 'attunement_slot') &&
    !attunementSlots.includes(
      record.attunement_slot as (typeof attunementSlots)[number],
    )
  ) {
    invalid('attunement_slot must be 1, 2, or 3.');
  }
}

function validateUpdateItem(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'item_id', 'item', 'reason']);
  positiveInteger(record, 'item_id');
  validateItemFields(record.item);
}

function validateRemoveItem(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'item_id', 'reason']);
  positiveInteger(record, 'item_id');
}

function validateItemLocator(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'item_id', 'reason']);
  positiveInteger(record, 'item_id');
}

function validateReplaceAttunedItem(record: UnknownRecord): void {
  rejectUnknown(
    record,
    ['type', 'item_id', 'replaced_item_id', 'reason'],
  );
  positiveInteger(record, 'item_id');
  positiveInteger(record, 'replaced_item_id');
  if (record.item_id === record.replaced_item_id) {
    invalid('An item cannot replace itself in an attunement slot.');
  }
}

function validateRestoreAttunementSlot(record: UnknownRecord): void {
  rejectUnknown(record, ['type', 'slot', 'item_id', 'reason']);
  positiveInteger(record, 'item_id');
  if (
    !attunementSlots.includes(
      record.slot as (typeof attunementSlots)[number],
    )
  ) {
    invalid('slot must be 1, 2, or 3.');
  }
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
    case 'level_up_class':
      validateLevelUpClass(record);
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
    case 'add_item':
      validateAddItem(record);
      return record;
    case 'update_item':
      validateUpdateItem(record);
      return record;
    case 'remove_item':
      validateRemoveItem(record);
      return record;
    case 'attune_item':
    case 'unattune_item':
      validateItemLocator(record);
      return record;
    case 'replace_attuned_item':
      validateReplaceAttunedItem(record);
      return record;
    case 'restore_attunement_slot':
      validateRestoreAttunementSlot(record);
      return record;
    case 'set_armor':
      validateSetArmor(record);
      return record;
    case 'set_hit_point_roll':
      validateSetHitPointRoll(record);
      return record;
    case 'fill_skill_grant':
      validateFillSkillGrant(record);
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
