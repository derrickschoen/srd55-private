import type { core } from 'zod';
import type { CharacterLevel } from './enums';

/**
 * Branded identifier types.
 *
 * Every id in the codebase is `number`, so a spell VERSION id and a spell
 * IDENTITY id are structurally interchangeable — and the two are conflated in
 * several read models today. Branding is how that confusion becomes a compile
 * error rather than a wrong row at runtime.
 *
 * SCOPE TODAY, PRECISELY. These brands reach the `$type<>()` annotations on the
 * build-time Drizzle columns and NOTHING ELSE. No runtime call site consumes a
 * branded id: `src/domain/read-models.ts` still declares bare `number`, so
 * passing a `spell_identity_id` where a `spell_version_id` belongs is still not
 * a compile error anywhere. What exists is the vocabulary and the schema-side
 * declaration. Threading it through the read models is the work these brands
 * were declared for and has not been done.
 *
 * The brand marker is Zod's, so a Drizzle column declared
 * `.$type<SpellVersionId>()` and a Zod schema declared
 * `.brand<'SpellVersionId'>()` will produce the *same* type — which is what
 * would let a schema/contract binding compare brands with no translation
 * layer. No such binding is written yet.
 *
 * This module is a leaf: it imports nothing but a Zod type (erased at build)
 * and is safe to import from both `db/schema/**` (build-time) and `src/**`
 * (runtime).
 */
export type Brand<T, B extends string> = T & core.$brand<B>;

/** `spell_versions.id` — one spell as printed in ONE rules edition. */
export type SpellVersionId = Brand<number, 'SpellVersionId'>;
/** `spell_identities.id` — the spell concept ACROSS editions. */
export type SpellIdentityId = Brand<number, 'SpellIdentityId'>;
/** `characters.id`. */
export type CharacterId = Brand<number, 'CharacterId'>;
/** Stable random identity minted once for a published party document. */
export type PartyPublicationId = Brand<string, 'PartyPublicationId'>;
/** `spell_selection_slots.id`. */
export type SlotId = Brand<number, 'SlotId'>;
/** `wizard_spellbook_entries.id` — one addressable Wizard acquisition. */
export type WizardSpellbookEntryId = Brand<
  number,
  'WizardSpellbookEntryId'
>;
/** `character_source_instances.id`. */
export type SourceInstanceId = Brand<number, 'SourceInstanceId'>;
/** `character_weapons.id` — a weapon a character owns, values and all. */
export type CharacterWeaponId = Brand<number, 'CharacterWeaponId'>;
/**
 * `weapon_templates.id` — a catalog row a weapon may be COPIED from.
 *
 * Branded separately from `CharacterWeaponId` precisely because the two must
 * never be interchanged: by D1b a character's weapon holds no template id at
 * all, so a template id turning up where a weapon id belongs would mean the
 * code is reading the catalog when it meant to read the character.
 */
export type WeaponTemplateId = Brand<number, 'WeaponTemplateId'>;
/**
 * `armor_templates.id` — a catalog row a character's armour may be COPIED from.
 *
 * Branded for the same reason `WeaponTemplateId` is, and it is not hypothetical
 * here either: by D1b a character holds VALUES, so a template id appearing where
 * a character's own armour is expected means the code is reading the catalog.
 */
export type ArmorTemplateId = Brand<number, 'ArmorTemplateId'>;

/**
 * The four stored sheet inputs, branded apart from each other and from
 * `ArmorTemplateId`.
 *
 * `CharacterArmorId` versus `ArmorTemplateId` is the same D1b severance the
 * weapon pair records: by D1b the character's row holds no template id at all,
 * so a template id turning up where a character's own armour is expected means
 * the code is reading the CATALOG when it meant to read the CHARACTER.
 */
export type CharacterArmorId = Brand<number, 'CharacterArmorId'>;
export type CharacterHitPointRollId = Brand<number, 'CharacterHitPointRollId'>;
export type CharacterSkillProficiencyId = Brand<
  number,
  'CharacterSkillProficiencyId'
>;
/**
 * `character_skill_grants.id` — one addressable skill choice slot, branded
 * apart from `CharacterSkillProficiencyId` because the two must never be
 * interchanged: the grant is the source of truth and the proficiency row is
 * its derived projection (plan §3.2), so a projection id turning up where a
 * grant id belongs means the code is about to fill or orphan the wrong table.
 */
export type CharacterSkillGrantId = Brand<number, 'CharacterSkillGrantId'>;
/** `character_skill_expertise_grants.id` — one addressable Expertise choice. */
export type CharacterSkillExpertiseGrantId = Brand<
  number,
  'CharacterSkillExpertiseGrantId'
>;
/** `character_level_feat_choices.id` — one class-level feat occurrence. */
export type CharacterLevelFeatChoiceId = Brand<
  number,
  'CharacterLevelFeatChoiceId'
>;
export type CharacterSheetAdjustmentId = Brand<
  number,
  'CharacterSheetAdjustmentId'
>;

/**
 * The origins ids, branded on both sides of the same D1b severance and for the
 * same reason: a template id turning up where a character-row id belongs means
 * the code is reading the CATALOG when it meant to read the CHARACTER, and by
 * D1b the character's row holds no template id at all.
 */
export type SpeciesTemplateId = Brand<number, 'SpeciesTemplateId'>;
export type SpeciesTemplateTraitId = Brand<number, 'SpeciesTemplateTraitId'>;
export type BackgroundTemplateId = Brand<number, 'BackgroundTemplateId'>;
/** One authored numeric effect declared directly by a background template. */
export type BackgroundTemplateEffectId = Brand<
  number,
  'BackgroundTemplateEffectId'
>;
/**
 * One printed line of one background's equipment package. A CATALOG id, on the
 * same side of the D1b severance as `BackgroundTemplateId`: nothing a character
 * owns carries one, and when the copy-to-character path is built it must read
 * THROUGH this row and write VALUES, never store this id.
 */
export type BackgroundEquipmentItemId = Brand<
  number,
  'BackgroundEquipmentItemId'
>;
/**
 * One printed line of one class's starting-equipment package. Catalog content,
 * never an id stored on a character.
 */
export type ClassEquipmentItemId = Brand<number, 'ClassEquipmentItemId'>;
export type CharacterSpeciesId = Brand<number, 'CharacterSpeciesId'>;
export type CharacterSpeciesTraitId = Brand<number, 'CharacterSpeciesTraitId'>;
export type CharacterBackgroundId = Brand<number, 'CharacterBackgroundId'>;

/**
 * THE TWO EFFECT IDS, BRANDED APART FOR THE SAME D1b REASON AS THE ROWS ABOVE.
 *
 * A `species_template_trait_effects.id` names something a CATALOG TEMPLATE
 * GRANTS; a `character_effects.id` names something a CHARACTER RECORDS. Those
 * are different questions (see `db/schema/origins.ts`), the copy between them
 * is one-way and column-wise, and a template effect id turning up where a
 * character effect id belongs means the code is reading the catalog when it
 * meant to read the character.
 */
export type SpeciesTemplateTraitEffectId = Brand<
  number,
  'SpeciesTemplateTraitEffectId'
>;
export type CharacterEffectId = Brand<number, 'CharacterEffectId'>;

/**
 * `character_items.id` (AC-1, D72): a THING the character owns that speaks
 * through `character_effects` rather than carrying its own modifier columns —
 * see `db/schema/items.ts`.
 */
export type CharacterItemId = Brand<number, 'CharacterItemId'>;
export type ItemDefinitionId = Brand<number, 'ItemDefinitionId'>;
export type ItemDefinitionEffectId = Brand<number, 'ItemDefinitionEffectId'>;

/** One `*_definitions.id` brand per definition table, so they cannot cross. */
export type ClassDefinitionId = Brand<number, 'ClassDefinitionId'>;
export type SubclassDefinitionId = Brand<number, 'SubclassDefinitionId'>;
export type FeatDefinitionId = Brand<number, 'FeatDefinitionId'>;
export type SpeciesDefinitionId = Brand<number, 'SpeciesDefinitionId'>;
export type BackgroundDefinitionId = Brand<number, 'BackgroundDefinitionId'>;

/**
 * The two class-feature catalog ids (D19).
 *
 * Branded apart because both are `number`, both are read by
 * `src/rules/sheet-content-lookup.ts` in the same pass, and the two tables
 * answer different questions: a `SubclassFeatureId` belongs to a subclass the
 * character HAS chosen, a `NamedFeatureId` to an optional feature this
 * application cannot confirm they have taken. Swapping them swaps "applied" for
 * "surfaced", which is the whole distinction the grant model exists to keep.
 */
export type SubclassFeatureId = Brand<number, 'SubclassFeatureId'>;
export type NamedFeatureId = Brand<number, 'NamedFeatureId'>;
export type SubclassFeatureEffectId = Brand<
  number,
  'SubclassFeatureEffectId'
>;
export type NamedFeatureEffectId = Brand<number, 'NamedFeatureEffectId'>;
export type ClassFeatureEffectId = Brand<number, 'ClassFeatureEffectId'>;
/** One sourced absolute class-resource maximum row (D91). */
export type ClassResourceId = Brand<number, 'ClassResourceId'>;
/** One sourced base-class resource formula row (D120). */
export type ClassResourceFormulaId = Brand<number, 'ClassResourceFormulaId'>;

/**
 * A catalog content key: `<edition>:<slug>` (see `src/catalog/catalog-key.ts`).
 * Branded because a content key and a display name are both `string` and are
 * genuinely confusable.
 */
export type ContentKey = Brand<string, 'ContentKey'>;

/** One class's level in the closed 1..20 ladder. */
export type ClassLevel = Brand<CharacterLevel, 'ClassLevel'>;
/** `characters.revision`, kept distinct from ids and ordinary counts. */
export type CharacterRevision = Brand<number, 'CharacterRevision'>;
/** Stable `rule_key` carried by generated grant rows. */
export type GrantRuleKey = Brand<string, 'GrantRuleKey'>;
/** One 1-based occurrence within a grant rule. */
export type GrantOrdinal = Brand<number, 'GrantOrdinal'>;

/**
 * A SQL `DATETIME` value as SQLite stores and returns it.
 *
 * Declared but not yet applied to any column or model — reserved for the
 * timestamp contract.
 */
export type Timestamp = Brand<string, 'Timestamp'>;

/**
 * A spell level in 0..9, meaningful ONLY for catalog spells: placeholder spells
 * minted by share import carry the sentinel `-1` in `spell_versions.level`
 * (`character-share.ts`, `ensureSharedSpell`).
 *
 * Declared but not yet applied. Nothing narrows `-1` away today, so the sentinel
 * still flows into the read models as a plain `number`.
 */
export type SpellLevel = Brand<number, 'SpellLevel'>;
