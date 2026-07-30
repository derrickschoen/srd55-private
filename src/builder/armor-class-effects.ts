/**
 * SUPERVISOR-OWNED — PART OF THE SEAM, ratified from AC-1.
 *
 * The seam file said every cross-agent name belongs in it, on the B3 / E-B /
 * L-A precedent: `src/builder/contracts.ts` is scoped to the level-one
 * creation wizard and pins nothing for the Armor Class / items / effects unit
 * (`docs/design/2026-07-29-armor-class-items-and-effects.md`). AC-1 is not a
 * wizard step at all — it is the vocabulary and persistence layer AC-2
 * (the class/subclass producers), AC-3 (the resolver) and AC-B (the sheet
 * surface) all build on — so its names live here and are OFFERED FOR
 * RATIFICATION rather than silently assumed by whichever dispatch runs next.
 * `contracts.ts` re-exports this module so there is one import point.
 *
 * NOTHING HERE IS A NEW VOCABULARY. Every value re-exports (or names, where
 * re-exporting would require a runtime import this module deliberately
 * avoids — see the module-path constants below) something AC-1 already
 * declared as the schema's, the row contracts', or the share wire's own
 * source of truth. Restating it here as a second, hand-copied list is
 * exactly the F22 drift D72 was written to rule out; this module exists so
 * AC-2/AC-3/AC-B have one name to import rather than a reason to invent a
 * parallel one.
 */

import {
  characterEffectKinds,
  extraAttackWeaponScopes,
  type CharacterEffectKind,
  type ExtraAttackWeaponScope,
} from '../domain/enums';

export {
  characterEffectKinds,
  extraAttackWeaponScopes,
  type CharacterEffectKind,
  type ExtraAttackWeaponScope,
};

/**
 * THE FIVE KIND LITERALS `character_effects.effect_kind` gained in this unit,
 * named individually because a future dispatch reading `characterEffectKinds`
 * still has to find these five among the pre-existing four. `oneOf(...)` in
 * `db/schema/origins.ts` is the CHECK; `characterEffectKindEnum` in
 * `src/domain/contracts/rows.ts` is the row contract; both read the same
 * `characterEffectKinds` array re-exported above.
 */
export const ARMOR_CLASS_BONUS_KIND = 'armor_class_bonus' as const;
export const ARMOR_CLASS_FORMULA_KIND = 'armor_class_formula' as const;
export const ATTACK_ABILITY_OVERRIDE_KIND = 'attack_ability_override' as const;
export const WEAPON_ATTACK_BONUS_KIND = 'weapon_attack_bonus' as const;
export const WEAPON_DAMAGE_BONUS_KIND = 'weapon_damage_bonus' as const;

/**
 * THE FIVE NEW `character_effects` PAYLOAD COLUMNS, in the order they were
 * appended to the table (and to the wire's `effect` tuple — see
 * `WIRE_EFFECT_APPENDED_FIELDS` below, which is this exact array under its
 * own name for readers who only care about the wire).
 *
 *  - `base`, `ability_1`, `ability_2`, `allows_shield` — `armor_class_formula`
 *    (D74, D75): a flat base, up to two ability modifiers, and whether a
 *    shield may be carried at all. `ability_1` is required wherever `base`
 *    is; `ability_2` stays optional (one ability or two).
 *  - `weapon_scope` — shared by `attack_ability_override`, `weapon_attack_bonus`
 *    and `weapon_damage_bonus`, reusing `extraAttackWeaponScopes` re-exported
 *    above rather than a second vocabulary for the same question (D72).
 *
 * TWO EXISTING COLUMNS WERE WIDENED, NOT ADDED, AND ARE NAMED HERE SO THE
 * DISTINCTION SURVIVES THE SEAM: `ability` now also carries
 * `attack_ability_override`'s override ability, and `amount` now also
 * carries `armor_class_bonus`'s flat addend and
 * `weapon_attack_bonus` / `weapon_damage_bonus`'s weapon-scoped bonus. Both
 * columns already existed for `ability_increase`; AC-1 widened their
 * kind-scoped CHECKs rather than adding new columns.
 */
export const ARMOR_CLASS_EFFECT_NEW_COLUMNS = [
  'base',
  'ability_1',
  'ability_2',
  'allows_shield',
  'weapon_scope',
] as const;
export type ArmorClassEffectNewColumn =
  (typeof ARMOR_CLASS_EFFECT_NEW_COLUMNS)[number];

export const ARMOR_CLASS_EFFECT_WIDENED_COLUMNS = ['ability', 'amount'] as const;

/**
 * THE `character_items` ROW SHAPE (D72 §1): things that only modify, speaking
 * through `character_effects` rather than carrying their own modifier
 * columns. Declared here as a TYPE — the runtime table lives in
 * `db/schema/items.ts` and this module deliberately imports no Drizzle
 * schema (the seam is loaded by node-side test processes; see the
 * `contracts.ts` note on why `level-up.ts` stays extract-free) — so a future
 * dispatch reading the character's items has one shape to import rather than
 * one to reconstruct from the migration.
 *
 * NO `sort_order`: unlike `character_effects` and `character_species_traits`,
 * the plan's own row shape names exactly five fields beyond identity and
 * timestamps and does not ask for a display order.
 *
 * NO `ac_change`, `to_hit_change` or `flat_damage_bonus` column — D72 rejected
 * that by name (Option A). Every numeric change an item grants is a
 * `character_effects` row instead.
 */
export interface CharacterItemRow {
  readonly id: number;
  readonly character_id: number;
  readonly name: string;
  readonly description: string | null;
  readonly requires_attunement: boolean;
  readonly attuned: boolean;
  readonly source_instance_id: number | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

/** `character_items`' own columns, in declaration order, for a caller building an INSERT/SELECT list without re-deriving it from `CharacterItemRow`'s keys. */
export const CHARACTER_ITEM_COLUMNS = [
  'id',
  'character_id',
  'name',
  'description',
  'requires_attunement',
  'attuned',
  'source_instance_id',
  'created_at',
  'updated_at',
] as const satisfies readonly (keyof CharacterItemRow)[];

/* --------------------------------------------------------- the share wire */

/**
 * THE WIRE VERSION THIS UNIT MINTED. Read `CURRENT_CHARACTER_SHARE_VERSION`
 * in `src/sharing/wire-schemas/index.ts` yourself before assuming this stays
 * current — the binding comment there is what a later dispatch must update,
 * this constant is only what AC-1 shipped.
 */
export const ARMOR_CLASS_EFFECTS_SHARE_WIRE_VERSION = 8;

/**
 * THE EFFECT TUPLE'S FIVE APPENDED WIRE FIELDS, in wire order (arity 12 →
 * 17) — identical to `ARMOR_CLASS_EFFECT_NEW_COLUMNS` above; re-exported
 * under its own name because a caller reasoning about the WIRE shape and a
 * caller reasoning about the COLUMN shape are asking related but different
 * questions, and `src/sharing/wire-schemas/v8.ts` is the actual source of
 * truth either way.
 */
export const WIRE_EFFECT_APPENDED_FIELDS = ARMOR_CLASS_EFFECT_NEW_COLUMNS;

/**
 * THE NEW `item` WIRE TUPLE'S FIELDS, in wire order (arity 5) — see
 * `ShareItem` in `src/sharing/schema.ts` for the validated shape and
 * `src/sharing/wire-schemas/v8.ts` for the tuple itself. `sourceRef` is the
 * SAME share-local reference space `effects[].sourceRef` and
 * `selections[].ref` resolve through; unlike an effect, an item carries no
 * `sourceSubclass` flag — the row shape names one reference column, not two.
 */
export const WIRE_ITEM_FIELDS = [
  'name',
  'description',
  'requires_attunement',
  'attuned',
  'sourceRef',
] as const;

/**
 * THE NEW ROOT ELEMENT (arity 17 → 18): a list of `item` tuples, NULL for a
 * character with none — the same "always written, absent decodes to an
 * absent key" shape every other appended root section uses.
 */
export const WIRE_ROOT_ITEMS_FIELD = 'items' as const;

/* ------------------------------------------------------ what this unit does NOT build */

/**
 * NAMED HERE SO A FUTURE READER OF THIS MODULE DOES NOT ASSUME IT EXISTS:
 * AC-1 is the vocabulary and persistence layer only.
 *
 *  - AC-2 builds the class/subclass template-and-copy path (widening
 *    `subclass_features`, `named_features` and
 *    `species_template_trait_effects`'s CHECKs) — nothing in AC-1 lets a
 *    class or subclass PRODUCE one of the five new kinds.
 *  - AC-3 builds the resolver (eligibility-then-value, the tie-break,
 *    proficiency and attunement gates) — nothing in AC-1 reads a
 *    `character_effects` row of one of these kinds back into an Armor Class
 *    number, and nothing gates an item's effect on `attuned`.
 *  - AC-4 retires the old manual-adjustment columns into bonus effects.
 *  - AC-B builds the sheet surface — no UI, warning or disclosure exists yet.
 *
 * A future module that needs one of these is finding a gap in the plan's own
 * split, not a reason to extend this file past what AC-1 shipped.
 */
export const ARMOR_CLASS_ITEMS_EFFECTS_PLAN_MODULE =
  'docs/design/2026-07-29-armor-class-items-and-effects.md';
