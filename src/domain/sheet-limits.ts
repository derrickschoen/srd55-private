/**
 * THE BOUNDS ON THE FOUR STORED SHEET INPUTS — IN ONE PLACE, FOR EVERY BOUNDARY.
 *
 * Three separate pieces of code bound this data, and they must agree:
 *
 *   - the CHECK constraints in `db/schema/sheet-inputs.ts`, which are what an
 *     already-existing database image, a hand edit or a future writer is held to;
 *   - `validateCharacterCommandPayload` — the WRITE boundary. Nothing reaches
 *     these tables without passing it, so these numbers are the real ceiling on
 *     what a stored row can contain;
 *   - `validateShareDocument` — the SHARE boundary, which MUST accept anything
 *     the write boundary accepted, because the sender's own export runs through
 *     it.
 *
 * A SHARE CAP BELOW A WRITE CAP IS NOT A STRICTER BOUNDARY; IT IS A CHARACTER
 * THE APP WILL LET YOU BUILD AND THEN REFUSE TO SHARE, with the only remedy
 * being to delete something you deliberately typed. That is not hypothetical:
 * it is precisely what happened to `character_weapons`, where `notes` was
 * writable at 2000 and shareable at 1000, and it is why
 * `src/domain/weapon-limits.ts` exists. This module is the same discipline
 * applied up front rather than after the bug — the three boundaries derive from
 * these constants, so divergence is unrepresentable rather than merely fixed.
 *
 * The values themselves are boundary judgements, not restatements of a column.
 */

/** A hit point roll must be a value some die could have shown. */
export const SHEET_ROLL_BOUNDS = Object.freeze({
  /**
   * 1, because every die in `docs/srd/source/` can show a 1 and
   * `hitPointMaximum` floors the per-level contribution at 1 anyway. Zero is
   * not a low roll; it is the absence of one, and absence is already spelled by
   * having no row.
   */
  minimum: 1,
  /**
   * 12 — the largest hit die any class in `class-core-traits.txt` uses (the
   * Barbarian's d12). NOT a per-class check: the roll is stored against a class
   * NAME rather than a class row, so the die size is not knowable from this
   * table alone, and a bound that pretended otherwise would either reject a
   * legitimate roll after a class was renamed or claim a validation it cannot
   * perform. The sheet is where a roll larger than the class's own die is
   * flagged, next to the number it changed: `hitPointMaximum` in
   * `src/rules/sheet.ts` is the first place both the roll and the die are known,
   * and it emits `roll_exceeds_hit_die` there while still counting the roll in
   * full — clamping would rewrite a number the player typed.
   */
  maximum: 12,
});

/** How long the free text on a stored sheet input may be. */
export const SHEET_TEXT_LIMITS = Object.freeze({
  /** An armour's name. Matched to `WEAPON_TEXT_LIMITS.name` — same kind of field. */
  armor_name: 120,
  /** A class name a roll is filed under; sized to the longest printed class name many times over. */
  class_name: 120,
  /** Why the armour is what it is, or where it came from. */
  armor_notes: 2_000,
});

export type SheetTextField = keyof typeof SHEET_TEXT_LIMITS;

/**
 * The largest `armor_class`, `dex_bonus_max` and `strength_requirement` any
 * boundary accepts.
 *
 * The schema's CHECKs bound these BELOW (at least 1, at least 0) and not above,
 * because no printed row suggests a ceiling and inventing one in the database
 * would refuse a house rule outright. The boundaries bound them above anyway,
 * for the reason every other cap here exists: a share document is written by a
 * stranger, and a nine-digit Armor Class is not a house rule.
 */
export const SHEET_ARMOR_MAX = Object.freeze({
  armor_class: 100,
  dex_bonus_max: 20,
  strength_requirement: 30,
});

/** Lower bounds shared by armor CHECKs and every armor input boundary. */
export const SHEET_ARMOR_MIN = Object.freeze({
  armor_class: 1,
  dex_bonus_max: 0,
  strength_requirement: 1,
});

/**
 * How many rows of each kind one share document may carry.
 *
 * `character_armor` and `character_sheet_adjustments` need no count cap — the
 * schema's UNIQUE indexes already bound them at two rows and one row per
 * character, and the share validator enforces the same by rejecting a duplicate
 * slot. The other two are unbounded by cardinality and so are bounded here.
 */
export const SHEET_SHARE_COUNTS = Object.freeze({
  /**
   * 20 classes at 20 levels each is the arithmetic ceiling a legal character
   * could reach; 400 is that number exactly, and it is far past anything
   * playable. The cap exists for the pathological document, not the plausible
   * one, and names the section when it fires.
   */
  hitPointRolls: 400,
  /** There are eighteen skills and the share validator refuses a duplicate. */
  skillProficiencies: 18,
});
