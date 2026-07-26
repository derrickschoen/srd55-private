/**
 * How long a character's own origin fields may be — in ONE place.
 *
 * The same argument `src/domain/weapon-limits.ts` makes, and the same defect it
 * was written to prevent: `character_species`, `character_species_traits` and
 * `character_background` are plain `VARCHAR`/`TEXT` with no length CHECK, so the
 * database bounds none of this and every boundary that does must agree. A share
 * cap set BELOW a write cap is not a stricter boundary — it is a character the
 * app lets you build and then refuses to share, with the only remedy being to
 * delete text you deliberately typed.
 *
 * Today `validateShareDocument` is the only consumer, because there is no
 * origin write command yet. That is exactly why the numbers live here rather
 * than inline in the share validator: the second consumer must be able to
 * derive from the first rather than invent its own.
 *
 * The values are boundary judgements, not restatements of a column. A printed
 * SRD trait description is up to about 700 characters (the Dragonborn's Draconic
 * Flight is the longest at ~560), so `description` is sized to hold the longest
 * printed one with room for a user's own rewrite; the short fields are sized to
 * what the source's own `Creature Type:` / `Size:` / `Ability Scores:` lines
 * use; `equipment_option_a` holds a full printed package.
 */
export const ORIGIN_TEXT_LIMITS = Object.freeze({
  name: 120,
  creature_type: 60,
  size: 60,
  trait_name: 120,
  description: 4_000,
  ability_score: 60,
  feat_name: 120,
  skill_proficiency: 60,
  tool_proficiency: 200,
  equipment_option: 1_000,
  notes: 2_000,
});

/**
 * The largest `base_speed_feet` either boundary allows.
 *
 * Nine printed species use 30 or 35. This is not a rules claim — it is the
 * point past which a number is not a walking Speed anybody wrote down, chosen
 * on the same terms as `WEAPON_RANGE_MAX_FEET` and well short of anything that
 * could matter numerically.
 */
export const ORIGIN_SPEED_MAX_FEET = 10_000;

/**
 * The largest Hit Point and Speed bonus a trait effect may carry, in either
 * direction.
 *
 * Signed on purpose: Dwarven Toughness is `+1` per level, but a user's own trait
 * may well be a penalty, and refusing one would be inventing a rule. The magnitude bound
 * is what keeps a hostile document from sending a value that overflows a sheet's
 * arithmetic once the class-sheet track starts consuming these.
 */
export const ORIGIN_EFFECT_MAGNITUDE_MAX = 1_000;
