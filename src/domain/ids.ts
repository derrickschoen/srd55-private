import type { core } from 'zod';

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
/** `spell_selection_slots.id`. */
export type SlotId = Brand<number, 'SlotId'>;
/** `character_source_instances.id`. */
export type SourceInstanceId = Brand<number, 'SourceInstanceId'>;

/** One `*_definitions.id` brand per definition table, so they cannot cross. */
export type ClassDefinitionId = Brand<number, 'ClassDefinitionId'>;
export type SubclassDefinitionId = Brand<number, 'SubclassDefinitionId'>;
export type FeatDefinitionId = Brand<number, 'FeatDefinitionId'>;
export type SpeciesDefinitionId = Brand<number, 'SpeciesDefinitionId'>;
export type BackgroundDefinitionId = Brand<number, 'BackgroundDefinitionId'>;

/**
 * A catalog content key: `<edition>:<slug>` (see `src/catalog/catalog-key.ts`).
 * Branded because a content key and a display name are both `string` and are
 * genuinely confusable.
 */
export type ContentKey = Brand<string, 'ContentKey'>;

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
