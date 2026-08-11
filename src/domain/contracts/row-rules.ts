/**
 * THE RULES A SET OF UNTRUSTED ROWS MUST SATISFY THAT A PER-ROW CONTRACT CANNOT
 * EXPRESS.
 *
 * `./rows.ts` validates ONE row against ONE table's column contract. Two of the
 * rules the database itself enforces are invisible at that altitude:
 *
 *  - `id` is a PRIMARY KEY, so two rows may not share one. That is a property of
 *    a LIST of rows, not of any row in it.
 *  - `spell_selection_slots` may not hold both `fixed_spell_version_id` and
 *    `current_spell_version_id` (named CHECK `spell_slots_exclusive_assignment_check`
 *    in `db/schema/character.ts:273`, plus the two triggers in
 *    `db/schema/triggers.sql` that produce the product's own message). That is a
 *    property of two columns TOGETHER, and `strictObject` checks each column
 *    alone.
 *  - `character_weapons` may not record a selected mastery without naming which
 *    property was selected (named CHECK
 *    `character_weapons_mastery_requires_property_check`). Two columns again.
 *  - `character_armor` ties `dex_bonus_max` to `dex_bonus = 'capped'` in BOTH
 *    directions, and forbids a shield carrying a Dexterity term at all (named
 *    CHECKs `character_armor_dex_bonus_max_check` and
 *    `character_armor_shield_check`). Two columns again, twice.
 *  - `character_effects` ties each payload column to the `effect_kind` that
 *    gives it meaning, in both directions, and ties `ability_increase` to a
 *    non-null source (the named CHECKs are listed on
 *    `effectPayloadKindError`). Two columns again, several times over.
 *
 * WHY THIS MODULE EXISTS RATHER THAN TWO COPIES OF THE RULES.
 * Both rules were already implemented in `src/backup/character-backup.ts`, for
 * the portable JSON document. The quarantined-image audit
 * (`src/db/candidate-audit.ts`) needs the SAME two rules for the save-point
 * snapshots inside an image, because `CharacterState.restore` turns those rows
 * into INSERT statements exactly as `insertPortableRow` does. Writing them a
 * second time is how a document and an image drift into being held to different
 * standards — which is the failure `./json-columns.ts` was extracted to prevent,
 * for the same reason.
 *
 * WHY THESE RETURN A MESSAGE INSTEAD OF THROWING.
 * The two callers have different error types (`BackupValidationError` versus
 * `CandidateAuditError`) and different labels. Returning `string | null` keeps
 * this module free of either dependency — the convention `rowContractError`
 * already established.
 */
import { WEAPON_RANGE_MAX_FEET } from '../weapon-limits';
import { sha256 } from '../../crypto/sha256';
import { parseDerivedContentKeyV1 } from '../../catalog/content-identity';
import { isAssertedExternalContentKey } from '../../catalog/catalog-key';
import { decodeClassResourceFormula } from '../class-resources';
import { abilities, isEnumValue } from '../enums';
import { FEATURE_VALUE_CONTRIBUTION_LIMITS } from './feature-value-storage-limits';

/** A row as it arrives from JSON: keys are strings, values are not yet trusted. */
type UntrustedRow = Readonly<Record<string, unknown>>;

type StorageJsonObject = Readonly<Record<string, unknown>>;

interface ExpressionDecodeState {
  nodes: number;
}

function encodedBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function storageCodePointLength(value: string): number {
  return [...value].length;
}

function storageObject(value: unknown, label: string): StorageJsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as StorageJsonObject;
}

function exactStorageKeys(
  value: StorageJsonObject,
  required: readonly string[],
  optional: readonly string[],
  label: string,
): void {
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  const missing = required.find((key) => !Object.hasOwn(value, key));
  const extra = keys.find((key) => !allowed.has(key));
  if (missing !== undefined || extra !== undefined) {
    throw new TypeError(
      `${label} must contain exactly ${required.join(', ')}` +
        (optional.length === 0
          ? '.'
          : ` with optional ${optional.join(', ')}.`),
    );
  }
}

function expressionInteger(value: unknown, label: string): number {
  if (
    !Number.isSafeInteger(value) ||
    Math.abs(Number(value)) > FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude
  ) {
    throw new TypeError(
      `${label} must be a safe integer from ` +
        `${String(-FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude)} to ` +
        `${String(FEATURE_VALUE_CONTRIBUTION_LIMITS.magnitude)}.`,
    );
  }
  return Number(value);
}

function positiveExpressionInteger(value: unknown, label: string): number {
  const decoded = expressionInteger(value, label);
  if (decoded < 1) {
    throw new TypeError(`${label} must be a positive integer.`);
  }
  return decoded;
}

function expressionClassLevel(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 20) {
    throw new TypeError(`${label} must be a class level from 1 to 20.`);
  }
  return Number(value);
}

function decodeValueSource(
  value: unknown,
  label: string,
  levelOnly: boolean,
): StorageJsonObject {
  const source = storageObject(value, label);
  if (source.kind === 'class_level') {
    exactStorageKeys(source, ['kind', 'class_content_key'], [], label);
    if (
      typeof source.class_content_key !== 'string' ||
      storageCodePointLength(source.class_content_key) < 1 ||
      storageCodePointLength(source.class_content_key) >
        FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints
    ) {
      throw new TypeError(`${label}.class_content_key must be bounded non-empty text.`);
    }
    return source;
  }
  if (source.kind === 'character_level') {
    exactStorageKeys(source, ['kind'], [], label);
    return source;
  }
  if (!levelOnly && source.kind === 'proficiency_bonus') {
    exactStorageKeys(source, ['kind'], [], label);
    return source;
  }
  if (!levelOnly && source.kind === 'ability_modifier') {
    exactStorageKeys(source, ['kind', 'ability'], [], label);
    if (!isEnumValue(abilities, source.ability)) {
      throw new TypeError(`${label}.ability must be a known ability.`);
    }
    return source;
  }
  throw new TypeError(
    `${label}.kind is not a supported ${levelOnly ? 'level source' : 'value source'}.`,
  );
}

function decodeExpressionBands(
  value: unknown,
  label: string,
  state: ExpressionDecodeState,
  depth: number,
  nestedValues: boolean,
): readonly StorageJsonObject[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > FEATURE_VALUE_CONTRIBUTION_LIMITS.expressionListEntries
  ) {
    throw new TypeError(`${label} must be a bounded non-empty list.`);
  }
  const bands = value.map((entry, index) => {
    const bandLabel = `${label}[${String(index)}]`;
    const band = storageObject(entry, bandLabel);
    exactStorageKeys(
      band,
      nestedValues ? ['from', 'to', 'value'] : ['from', 'to', 'amount'],
      [],
      bandLabel,
    );
    const from = expressionClassLevel(band.from, `${bandLabel}.from`);
    const to = expressionClassLevel(band.to, `${bandLabel}.to`);
    if (from > to) {
      throw new TypeError(`${bandLabel}.from must not exceed its to level.`);
    }
    if (nestedValues) {
      decodeValueExpressionNode(band.value, `${bandLabel}.value`, state, depth + 1);
    } else {
      expressionInteger(band.amount, `${bandLabel}.amount`);
    }
    return band;
  });
  for (let index = 1; index < bands.length; index += 1) {
    const previous = bands[index - 1];
    const current = bands[index];
    if (
      previous === undefined || current === undefined ||
      Number(current.from) !== Number(previous.to) + 1
    ) {
      throw new TypeError(`${label} must be ordered, contiguous, and non-overlapping.`);
    }
  }
  return bands;
}

function decodeValueExpressionNode(
  value: unknown,
  label: string,
  state: ExpressionDecodeState,
  depth: number,
): StorageJsonObject {
  if (depth > FEATURE_VALUE_CONTRIBUTION_LIMITS.expressionDepth) {
    throw new TypeError(`${label} exceeds the expression depth limit.`);
  }
  state.nodes += 1;
  if (state.nodes > FEATURE_VALUE_CONTRIBUTION_LIMITS.expressionNodes) {
    throw new TypeError(`${label} exceeds the expression breadth limit.`);
  }
  const expression = storageObject(value, label);
  switch (expression.kind) {
    case 'const':
      exactStorageKeys(expression, ['kind', 'amount'], [], label);
      expressionInteger(expression.amount, `${label}.amount`);
      return expression;
    case 'ref':
      exactStorageKeys(expression, ['kind', 'source'], [], label);
      decodeValueSource(expression.source, `${label}.source`, false);
      return expression;
    case 'scale':
      exactStorageKeys(
        expression,
        ['kind', 'source', 'round'],
        ['multiply', 'divide'],
        label,
      );
      decodeValueSource(expression.source, `${label}.source`, false);
      if (expression.round !== 'floor' && expression.round !== 'ceiling') {
        throw new TypeError(`${label}.round must be floor or ceiling.`);
      }
      if (Object.hasOwn(expression, 'multiply')) {
        positiveExpressionInteger(expression.multiply, `${label}.multiply`);
      }
      if (Object.hasOwn(expression, 'divide')) {
        positiveExpressionInteger(expression.divide, `${label}.divide`);
      }
      return expression;
    case 'table':
      exactStorageKeys(expression, ['kind', 'level_source', 'rows'], [], label);
      decodeValueSource(expression.level_source, `${label}.level_source`, true);
      decodeExpressionBands(expression.rows, `${label}.rows`, state, depth, false);
      return expression;
    case 'piecewise':
      exactStorageKeys(
        expression,
        ['kind', 'level_source', 'segments'],
        [],
        label,
      );
      decodeValueSource(expression.level_source, `${label}.level_source`, true);
      decodeExpressionBands(
        expression.segments,
        `${label}.segments`,
        state,
        depth,
        true,
      );
      return expression;
    case 'sum': {
      exactStorageKeys(expression, ['kind', 'terms'], [], label);
      if (
        !Array.isArray(expression.terms) ||
        expression.terms.length < 1 ||
        expression.terms.length >
          FEATURE_VALUE_CONTRIBUTION_LIMITS.expressionListEntries
      ) {
        throw new TypeError(`${label}.terms must be a bounded non-empty list.`);
      }
      expression.terms.forEach((term, index) => {
        decodeValueExpressionNode(
          term,
          `${label}.terms[${String(index)}]`,
          state,
          depth + 1,
        );
      });
      return expression;
    }
    case 'clamp': {
      exactStorageKeys(
        expression,
        ['kind', 'value'],
        ['minimum', 'maximum'],
        label,
      );
      if (
        !Object.hasOwn(expression, 'minimum') &&
        !Object.hasOwn(expression, 'maximum')
      ) {
        throw new TypeError(`${label} must declare a minimum or maximum.`);
      }
      decodeValueExpressionNode(expression.value, `${label}.value`, state, depth + 1);
      const minimum = Object.hasOwn(expression, 'minimum')
        ? decodeValueExpressionNode(
            expression.minimum,
            `${label}.minimum`,
            state,
            depth + 1,
          )
        : undefined;
      const maximum = Object.hasOwn(expression, 'maximum')
        ? decodeValueExpressionNode(
            expression.maximum,
            `${label}.maximum`,
            state,
            depth + 1,
          )
        : undefined;
      if (
        minimum?.kind === 'const' && maximum?.kind === 'const' &&
        Number(minimum.amount) > Number(maximum.amount)
      ) {
        throw new TypeError(`${label}.minimum must not exceed maximum.`);
      }
      return expression;
    }
    default:
      throw new TypeError(`${label}.kind is not a supported value expression.`);
  }
}

/**
 * Strict storage decoder for the written E1 JSON contract.
 *
 * It intentionally lives at the row boundary rather than importing E1's
 * concurrently-developed domain module. The parsed object is returned so the
 * stored-content projector hashes semantics rather than JSON whitespace.
 */
export function decodeStoredValueExpression(
  valueJson: unknown,
  label: string,
): StorageJsonObject {
  if (
    typeof valueJson !== 'string' ||
    encodedBytes(valueJson) < 1 ||
    encodedBytes(valueJson) > FEATURE_VALUE_CONTRIBUTION_LIMITS.valueJsonBytes
  ) {
    throw new TypeError(`${label} must be bounded JSON text.`);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(valueJson) as unknown;
  } catch (error) {
    throw new TypeError(`${label} must be valid JSON.`, { cause: error });
  }
  return decodeValueExpressionNode(decoded, label, { nodes: 0 }, 0);
}

export function decodeStoredSupersedesReference(
  value: unknown,
  label: string,
): StorageJsonObject | null {
  if (value === null) {
    return null;
  }
  if (
    typeof value !== 'string' ||
    encodedBytes(value) < 1 ||
    encodedBytes(value) >
      FEATURE_VALUE_CONTRIBUTION_LIMITS.supersedesJsonBytes
  ) {
    throw new TypeError(`${label} must be null or bounded JSON text.`);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(value) as unknown;
  } catch (error) {
    throw new TypeError(`${label} must be valid JSON.`, { cause: error });
  }
  const reference = storageObject(decoded, label);
  exactStorageKeys(
    reference,
    ['content_key', 'contribution_key'],
    [],
    label,
  );
  for (const field of ['content_key', 'contribution_key'] as const) {
    const member = reference[field];
    if (
      typeof member !== 'string' || member.length < 1 ||
      storageCodePointLength(member) >
        FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints
    ) {
      throw new TypeError(`${label}.${field} must be bounded non-empty text.`);
    }
  }
  return reference;
}

/** Kind-first correlated-row validation shared by both migration-0042 tables. */
export function featureValueContributionInvariantError(
  row: UntrustedRow,
  label: string,
): string | null {
  try {
    if (
      typeof row.contribution_key !== 'string' ||
      storageCodePointLength(row.contribution_key) < 1 ||
      storageCodePointLength(row.contribution_key) >
        FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints
    ) {
      throw new TypeError('contribution_key must be bounded non-empty text.');
    }
    if (
      typeof row.label !== 'string' || storageCodePointLength(row.label) < 1 ||
      storageCodePointLength(row.label) >
        FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints
    ) {
      throw new TypeError('label must be bounded non-empty text.');
    }
    if (
      !Number.isSafeInteger(row.active_from_level) ||
      !Number.isSafeInteger(row.active_to_level) ||
      Number(row.active_from_level) < 1 ||
      Number(row.active_to_level) > 20 ||
      Number(row.active_from_level) > Number(row.active_to_level)
    ) {
      throw new TypeError('active level band must be ordered within 1 through 20.');
    }
    if (row.target_kind === 'feature_dice_count') {
      if (row.target_key !== 'sneak_attack' || row.op !== 'add') {
        throw new TypeError(
          'feature_dice_count requires target_key sneak_attack and op add.',
        );
      }
    } else if (row.target_kind === 'resource_maximum') {
      if (
        typeof row.target_key !== 'string' ||
        storageCodePointLength(row.target_key) < 1 ||
        storageCodePointLength(row.target_key) >
          FEATURE_VALUE_CONTRIBUTION_LIMITS.keyCodePoints ||
        row.op !== 'add'
      ) {
        throw new TypeError(
          'resource_maximum requires a bounded target_key and op add.',
        );
      }
    } else {
      throw new TypeError('target_kind is not supported.');
    }
    decodeStoredValueExpression(row.value_json, `${label}.value_json`);
    decodeStoredSupersedesReference(
      row.supersedes_ref,
      `${label}.supersedes_ref`,
    );
    return null;
  } catch (error) {
    return `${label} has an invalid feature-value contribution: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

export function classResourceFormulaInvariantError(
  row: UntrustedRow,
  label: string,
): string | null {
  try {
    decodeClassResourceFormula({
      formula_kind: row.formula_kind,
      minimum_class_level: row.minimum_class_level,
      fixed_count: row.fixed_count,
      ability: row.ability,
      multiplier: row.multiplier,
      later_fixed_count_steps: row.later_fixed_count_steps,
    });
    return null;
  } catch (error) {
    return `${label} has an invalid formula payload: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

export function catalogContentIdentityInvariantError(
  row: UntrustedRow,
  label: string,
): string | null {
  const keyKind = row.key_kind;
  const layer = row.catalog_layer;
  if (
    keyKind === 'derived' &&
    layer === 'external' &&
    typeof row.content_key === 'string' &&
    parseDerivedContentKeyV1(row.content_key) !== null
  ) {
    return null;
  }
  if (keyKind === 'bundled-stable' && layer === 'bundled') {
    return null;
  }
  if (
    keyKind === 'asserted' &&
    layer === 'external' &&
    typeof row.content_key === 'string' &&
    isAssertedExternalContentKey(row.content_key)
  ) {
    return null;
  }
  return `${label} has an invalid key-kind/catalog-layer identity combination.`;
}

export function catalogContentFingerprintInvariantError(
  row: UntrustedRow,
  label: string,
): string | null {
  if (
    typeof row.canonical_json === 'string' &&
    typeof row.fingerprint_digest === 'string' &&
    sha256(row.canonical_json) === row.fingerprint_digest
  ) {
    return null;
  }
  return `${label} has canonical bytes that do not produce its fingerprint digest.`;
}

/**
 * Every row carries a positive integer `id`, and no two rows carry the same one.
 *
 * `ids` is filled as it goes and is the caller's, so a caller that needs the id
 * set for later reference checks — `character-backup.ts` does, to prove a
 * parent or a slot's source belongs to the same character — gets it without a
 * second pass.
 *
 * Returns the FIRST problem, so the message names the offending index.
 */
export function uniqueRowIdError(
  rows: readonly UntrustedRow[],
  label: string,
  ids: Set<number>,
): string | null {
  for (const [index, row] of rows.entries()) {
    const id = row.id;
    if (!Number.isSafeInteger(id) || Number(id) < 1) {
      return `${label}[${index}].id must be a positive integer.`;
    }
    const value = Number(id);
    if (ids.has(value)) {
      return `${label} contains duplicate id ${value}.`;
    }
    ids.add(value);
  }
  return null;
}

/**
 * A slot holds a fixed grant or a user selection, never both.
 *
 * `null` is the only "absent" value this checks for, deliberately: the column
 * contract in `./rows.ts` has already established that each of the two is either
 * `null` or a positive integer by the time this runs, and inventing a second
 * opinion about what counts as empty is how two validators start disagreeing.
 */
export function slotExclusiveAssignmentError(
  row: UntrustedRow,
  label: string,
): string | null {
  if (
    row.fixed_spell_version_id !== null &&
    row.current_spell_version_id !== null
  ) {
    return `${label} contains both a fixed and selected spell.`;
  }
  return null;
}

/**
 * A weapon that records a SELECTED mastery must name the property selected.
 *
 * The database says so itself — CHECK
 * `character_weapons_mastery_requires_property_check` — so a live row can never
 * violate it. The pair only becomes reachable when weapon rows arrive as JSON:
 * inside a portable backup document, inside a save-point snapshot, or as the
 * `weapons` section of a share document. All three end as an INSERT, and
 * without this the failure is a raw `SQLITE_CONSTRAINT_CHECK` from inside a
 * transaction rather than a sentence naming the offending weapon.
 *
 * `mastery_selected` is a NOT NULL integer flag and `mastery_property` is
 * nullable text, so the truthiness test below matches the CHECK exactly
 * (`mastery_selected = 0 OR mastery_property IS NOT NULL`) rather than
 * inventing a second opinion about what "selected" means. Boolean `true` is
 * accepted alongside `1` for the same reason `character.allow_legacy` is: JSON
 * that has been through a codec may carry either.
 */
export function weaponMasterySelectionError(
  row: UntrustedRow,
  label: string,
): string | null {
  const selected = row.mastery_selected;
  if (
    (selected === 1 || selected === true) &&
    (row.mastery_property === null || row.mastery_property === undefined)
  ) {
    return `${label} selects a weapon mastery without naming the property.`;
  }
  return null;
}

export function weaponDamagePayloadError(
  row: UntrustedRow,
  label: string,
  prefix: 'damage' | 'versatile_damage',
): string | null {
  const kind = row[`${prefix}_kind`];
  const dice = row[`${prefix}_dice`];
  const flat = row[`${prefix}_flat`];
  const custom = row[`${prefix}_custom`];
  const emptyPayload = dice === null && flat === null && custom === null;

  if (
    kind === 'dice' &&
    typeof dice === 'string' &&
    flat === null &&
    custom === null
  ) {
    return null;
  }
  if (
    kind === 'flat' &&
    Number.isSafeInteger(flat) &&
    Number(flat) >= 0 &&
    dice === null &&
    custom === null
  ) {
    return null;
  }
  if (
    kind === 'custom' &&
    typeof custom === 'string' &&
    dice === null &&
    flat === null
  ) {
    return null;
  }
  if (
    emptyPayload &&
    ((prefix === 'damage' && kind === 'not_recorded') ||
      (prefix === 'versatile_damage' && kind === 'not_applicable'))
  ) {
    return null;
  }
  return `${label} has an invalid ${prefix} discriminator/payload combination.`;
}

/**
 * Validates the three correlated weapon-range columns for backups, snapshots,
 * share imports, command writes, and SRD template rows.
 */
export function weaponRangePayloadError(
  row: UntrustedRow,
  label: string,
  allowLegacy: boolean,
): string | null {
  const kind = row.range_kind;
  const near = row.range_near_feet;
  const far = row.range_far_feet;
  const validDistance = (value: unknown): boolean =>
    value === null ||
    (Number.isSafeInteger(value) &&
      Number(value) >= 0 &&
      Number(value) <= WEAPON_RANGE_MAX_FEET);

  if (!validDistance(near)) {
    return `${label}.range_near_feet must be an integer from 0 to ${WEAPON_RANGE_MAX_FEET}, or null.`;
  }
  if (!validDistance(far)) {
    return `${label}.range_far_feet must be an integer from 0 to ${WEAPON_RANGE_MAX_FEET}, or null.`;
  }
  if (kind === 'none' && near === null && far === null) {
    return null;
  }
  if (
    kind === 'ranged' &&
    near !== null &&
    (far === null || Number(far) >= Number(near))
  ) {
    return null;
  }
  if (
    allowLegacy &&
    kind === 'legacy' &&
    far !== null &&
    (near === null || Number(far) < Number(near))
  ) {
    return null;
  }
  return `${label} has an invalid weapon range discriminator/payload combination.`;
}

/**
 * An armour row's two correlated pairs, checked the way the database checks them.
 *
 * `dex_bonus_max` IS MEANINGFUL EXACTLY WHEN `dex_bonus` IS `'capped'`, and the
 * pairing runs in both directions: a capped row without its cap and an uncapped
 * row carrying a stray one are both refused. Without the first,
 * `dexterityTerm`'s documented-unreachable `?? 0` becomes reachable and a suit
 * of Light armour silently degrades to Heavy behaviour — a character quietly
 * losing Armor Class with no error anywhere. Without the second, a Heavy row
 * would carry a number nothing reads.
 *
 * A SHIELD CARRIES NO DEXTERITY TERM. `armorClassFrom` returns a shield's
 * contribution as a bonus and never consults `dex_bonus`, so a shield row with
 * `dex_bonus = 'full'` holds a field that reads as meaningful and is ignored.
 *
 * Reachable only when armour rows arrive as JSON — a portable backup document, a
 * save-point snapshot, or the `armor` section of a share document. All three end
 * as an INSERT, and without this the failure is a raw `SQLITE_CONSTRAINT_CHECK`
 * from inside a transaction rather than a sentence naming the offending row.
 */
/**
 * AN EFFECT'S PAYLOAD BELONGS TO ITS KIND, AND ITS KIND REQUIRES ITS PAYLOAD.
 *
 * `character_effects` declares CHECKs saying so — `damage_type_kind`,
 * `hit_points_kind`, `speed_kind`, `hp_modifier_payload`, `speed_payload`,
 * for `ability_increase` the `ability_kind`/`amount_kind`/`maximum_kind` trio,
 * `ability_increase_payload` and `ability_increase_source`, and — AC-1, D72 —
 * the five new kinds' own kind-scope and payload-completeness CHECKs — and a
 * per-column contract cannot see any of them: each is a statement about two
 * columns together. Reaching the INSERT with `effect_kind: 'damage_resistance'`
 * and a hit point value aborts the whole import with a raw
 * `SQLITE_CONSTRAINT_CHECK` naming a constraint, not an effect.
 *
 * REACHABLE FROM MORE DIRECTIONS THAN THE OTHER RULES HERE, which is why it is
 * worth the file. Effect columns arrive as JSON in a portable backup document,
 * in a save-point snapshot inside one, and in a save point inside a quarantined
 * image — and they arrive TWICE OVER in each: as `character_effects` rows, and
 * as the five retired `effect_*` columns on a `character_species_traits` row
 * written before the model was inverted, which
 * `src/rules/legacy-trait-effects.ts` migrates into exactly this shape. Both
 * end as the same INSERT. The share arm applies the identical rules in
 * `src/sharing/schema.ts`; this is what stops the other two arms from being
 * held to a lower standard than a link.
 *
 * `null` and `undefined` are both "absent", because the two callers differ: a
 * JSON row carries `null` for an empty column, and a migrated legacy payload is
 * built by a function that writes `null` too — but a hand-written document may
 * simply omit the key, and the CHECK it is about to meet treats that as NULL.
 *
 * TWO COLUMNS ARE NOW SHARED ACROSS KINDS (AC-1) AND THE OLD FIELD-CENTRIC
 * SHAPE OF THIS FUNCTION COULD NOT SAY SO WITHOUT A BUG: `ability` belongs to
 * `ability_increase` OR `attack_ability_override`; `amount` belongs to
 * `ability_increase`, `armor_class_bonus`, `weapon_attack_bonus` or
 * `weapon_damage_bonus`. The function is therefore written KIND-FIRST below —
 * one block per kind, stating exactly what that kind owns and requires —
 * rather than column-first, which is what let the four-kind `amount` silently
 * stay married to one kind's error message.
 */
export function effectPayloadKindError(
  row: UntrustedRow,
  label: string,
): string | null {
  const kind = row.effect_kind;
  const present = (value: unknown): boolean =>
    value !== null && value !== undefined;

  if (present(row.damage_type) && kind !== 'damage_resistance') {
    return `${label} carries a damage type without effect_kind damage_resistance.`;
  }
  const hasHitPoints =
    present(row.hit_points_flat) || present(row.hit_points_per_level);
  if (hasHitPoints && kind !== 'hp_modifier') {
    return `${label} carries hit points without effect_kind hp_modifier.`;
  }
  if (kind === 'hp_modifier' && !hasHitPoints) {
    return `${label} has effect_kind hp_modifier and no hit point value.`;
  }
  if (present(row.speed_bonus_feet) && kind !== 'speed') {
    return `${label} carries a speed bonus without effect_kind speed.`;
  }
  if (kind === 'speed' && !present(row.speed_bonus_feet)) {
    return `${label} has effect_kind speed and no speed bonus.`;
  }

  // `ability` belongs to exactly two kinds now (AC-1).
  if (
    present(row.ability) &&
    kind !== 'ability_increase' &&
    kind !== 'ability_override' &&
    kind !== 'attack_ability_override'
  ) {
    return `${label} carries an ability without an effect_kind that uses it.`;
  }
  // `amount` belongs to exactly four kinds now (AC-1).
  if (
    present(row.amount) &&
    kind !== 'ability_increase' &&
    kind !== 'armor_class_bonus' &&
    kind !== 'weapon_attack_bonus' &&
    kind !== 'weapon_damage_bonus'
  ) {
    return `${label} carries an amount without a kind that uses one.`;
  }
  // `maximum`, `base`, `ability_1`, `ability_2` and `weapon_scope` each still
  // belong to exactly one or two kinds; checked per-kind below rather than
  // here, alongside that kind's payload-completeness rule.
  if (
    present(row.maximum) &&
    kind !== 'ability_increase' &&
    kind !== 'ability_override'
  ) {
    return `${label} carries a maximum without an effect_kind that uses it.`;
  }
  if (present(row.base) && kind !== 'armor_class_formula') {
    return `${label} carries a base without effect_kind armor_class_formula.`;
  }
  if (present(row.ability_1) && kind !== 'armor_class_formula') {
    return `${label} carries ability_1 without effect_kind armor_class_formula.`;
  }
  if (present(row.ability_2) && kind !== 'armor_class_formula') {
    return `${label} carries ability_2 without effect_kind armor_class_formula.`;
  }
  if (present(row.allows_shield) && kind !== 'armor_class_formula') {
    return `${label} carries allows_shield without effect_kind armor_class_formula.`;
  }
  if (
    present(row.weapon_scope) &&
    kind !== 'attack_ability_override' &&
    kind !== 'weapon_attack_bonus' &&
    kind !== 'weapon_damage_bonus'
  ) {
    return `${label} carries a weapon_scope without a kind that uses one.`;
  }

  // The `ability_increase` pairings (B2), mirroring its schema CHECKs: the
  // three payload columns belong to the kind and the kind requires all three —
  // plus the one rule no other kind has, that THE KIND REQUIRES A SOURCE
  // (`character_effects_ability_increase_source_check`). D63 makes "a
  // contribution knows where it came from" an invariant, and a JSON row that
  // reached the INSERT without a source would fail there with a raw
  // SQLITE_CONSTRAINT_CHECK naming a constraint rather than an effect.
  if (kind === 'ability_increase') {
    if (
      !present(row.ability) ||
      !present(row.amount) ||
      !present(row.maximum)
    ) {
      return `${label} has effect_kind ability_increase without its ability, amount and maximum.`;
    }
    if (!present(row.source_instance_id)) {
      return `${label} has effect_kind ability_increase and no source instance.`;
    }
  }
  if (
    kind === 'ability_override' &&
    (!present(row.ability) || !present(row.maximum))
  ) {
    return `${label} has effect_kind ability_override without its ability and set-to value.`;
  }
  // `armor_class_bonus` requires only its flat addend (AC-1, D72).
  if (kind === 'armor_class_bonus' && !present(row.amount)) {
    return `${label} has effect_kind armor_class_bonus and no amount.`;
  }
  // `armor_class_formula` requires base, ability_1 and allows_shield;
  // `ability_2` stays optional — a formula may use one ability or two.
  if (
    kind === 'armor_class_formula' &&
    (!present(row.base) ||
      !present(row.ability_1) ||
      !present(row.allows_shield))
  ) {
    return `${label} has effect_kind armor_class_formula without its base, ability_1 and allows_shield.`;
  }
  // `attack_ability_override` requires the override ability and a scope.
  if (
    kind === 'attack_ability_override' &&
    (!present(row.ability) || !present(row.weapon_scope))
  ) {
    return `${label} has effect_kind attack_ability_override without its ability and weapon_scope.`;
  }
  // `weapon_attack_bonus` / `weapon_damage_bonus` each require an amount and a
  // scope.
  if (
    (kind === 'weapon_attack_bonus' || kind === 'weapon_damage_bonus') &&
    (!present(row.amount) || !present(row.weapon_scope))
  ) {
    return `${label} has effect_kind ${String(kind)} without its amount and weapon_scope.`;
  }
  return null;
}

export function armorDexBonusPairError(
  row: UntrustedRow,
  label: string,
): string | null {
  const capped = row.dex_bonus === 'capped';
  const hasMaximum = row.dex_bonus_max !== null && row.dex_bonus_max !== undefined;
  if (capped !== hasMaximum) {
    return capped
      ? `${label} caps the Dexterity bonus without saying at what.`
      : `${label} carries a Dexterity cap without a capped Dexterity bonus.`;
  }
  if (row.category === 'shield' && row.dex_bonus !== 'none') {
    return `${label} is a shield, which carries no Dexterity bonus.`;
  }
  return null;
}
