/**
 * How long a weapon's own fields may be — in ONE place, for both boundaries.
 *
 * `character_weapons` is plain `TEXT` and nullable `INTEGER` with no CHECK on
 * length, so the database bounds none of this. Two separate pieces of code do:
 *
 *   - `validateCharacterCommandPayload` — the WRITE boundary. Nothing reaches
 *     the table without passing it, so these numbers are the real ceiling on
 *     what a stored weapon can contain.
 *   - `validateShareDocument` — the SHARE boundary, which must accept anything
 *     the write boundary accepted, because the sender's own export runs through
 *     it. A share cap set BELOW a write cap is not a stricter boundary; it is a
 *     character the app will happily let you build and then refuse to share,
 *     with the only remedy being to delete text you deliberately typed.
 *
 * That asymmetry is why the two must not be independent numbers. They were:
 * `notes` was writable at 2000 and shareable at 1000, and `range_*_feet` was
 * writable without any bound at all and shareable only to 100,000 — so a
 * 1500-character note or a 200,000-foot range made a character unshareable.
 * Deriving both from here makes the divergence unrepresentable rather than
 * merely fixed once.
 *
 * The values themselves are boundary judgements, not restatements of the
 * column: prose fields are sized to what someone might actually type, the short
 * fields to what the SRD's own weapons table uses, and the range to roughly
 * nineteen miles — past any weapon anyone has written down and well short of
 * anything that could matter numerically.
 */
export const WEAPON_TEXT_LIMITS = Object.freeze({
  name: 120,
  damage_dice: 40,
  damage_custom: 40,
  damage_type: 40,
  versatile_damage_dice: 40,
  versatile_damage_custom: 40,
  ammunition_kind: 40,
  mastery_property: 40,
  other_properties: 500,
  notes: 2_000,
});

export type WeaponTextField = keyof typeof WEAPON_TEXT_LIMITS;

/** The largest `range_normal_feet` / `range_long_feet` either boundary allows. */
export const WEAPON_RANGE_MAX_FEET = 100_000;
