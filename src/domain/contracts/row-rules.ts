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
 *    gives it meaning, in both directions (five named CHECKs, listed on
 *    `effectPayloadKindError`). Two columns again, five times.
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

/** A row as it arrives from JSON: keys are strings, values are not yet trusted. */
type UntrustedRow = Readonly<Record<string, unknown>>;

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
 * `character_effects` declares five CHECKs saying so — `damage_type_kind`,
 * `hit_points_kind`, `speed_kind`, `hp_modifier_payload`, `speed_payload` — and
 * a per-column contract cannot see any of them: each is a statement about two
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
