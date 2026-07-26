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
