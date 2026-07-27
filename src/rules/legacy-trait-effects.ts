/**
 * READING THE EFFECT PAYLOAD THAT USED TO LIVE ON A TRAIT ROW.
 *
 * Before the inversion, a mechanical effect was five columns ON a species trait:
 * `effect_kind`, `effect_damage_type`, `effect_hit_points_flat`,
 * `effect_hit_points_per_level`, `effect_speed_bonus_feet`. Those columns are
 * gone from both trait tables. Three kinds of artifact a user already holds
 * still carry them, and every one of them must keep working:
 *
 *  1. a PORTABLE BACKUP FILE they downloaded. Its `character_species_traits`
 *     rows carry all five keys, and the row contracts are `z.strictObject` —
 *     an unknown key is rejected, so without this module every backup file
 *     written before today becomes unopenable;
 *  2. a SHARE LINK somebody pasted into a chat. Its trait tuples carry the five
 *     values positionally and the vocabulary they were validated against
 *     included `granted_spells`;
 *  3. a SAVE POINT — inside their own database, inside a `restore_snapshot`
 *     inverse payload, or inside a backup file. `a7-v3` and `a7-v4` snapshots
 *     capture whole trait rows, so `CharacterState.restore` would build an
 *     `INSERT` naming columns the table no longer has.
 *
 * THE RULE IS ACCEPT-AND-MIGRATE, NEVER REJECT. A legacy payload that names a
 * live kind becomes a `character_effects` row labelled with the trait's own
 * name, which is the same information in the new shape and is exactly what the
 * character had. Rejecting instead would be the data loss the whole portability
 * design exists to prevent, inflicted on the people who already trusted it.
 *
 * `granted_spells` IS THE ONE THING THAT IS DROPPED, AND DROPPING IT LOSES
 * NOTHING. It was a marker with no payload; the spells themselves are minted
 * from `species_definitions.grant_rules` by `src/grants/` and were never stored
 * here. Its only consumer produced a list of trait names that no production
 * code read. Migrating it would need a vocabulary member that no longer exists;
 * refusing it would make an existing link undecodable. Dropping it leaves the
 * character with exactly the spells they had — see `effectKinds`.
 *
 * THIS FILE IS APPEND-ONLY BY NATURE. `LEGACY_TRAIT_EFFECT_KINDS` is a
 * HISTORICAL FACT — the vocabulary as it stood when those artifacts were
 * written — and is deliberately written out by hand rather than derived from
 * `effectKinds`. Deriving it would make it silently follow the next vocabulary
 * change and start lying about files already on disk, which is the same mistake
 * `A7_V1_TABLES` is frozen to avoid.
 */
import { effectKinds } from '../domain/enums';

/**
 * The five columns, in the order they were declared on the trait tables. The
 * order is not load-bearing here — the share codec has its own frozen order —
 * but naming them once is what keeps the three call sites from drifting.
 */
export const LEGACY_TRAIT_EFFECT_COLUMNS = [
  'effect_kind',
  'effect_damage_type',
  'effect_hit_points_flat',
  'effect_hit_points_per_level',
  'effect_speed_bonus_feet',
] as const;

/**
 * The vocabulary those artifacts were validated against. FOUR members: the
 * three that survive, plus the retired `granted_spells`.
 */
export const LEGACY_TRAIT_EFFECT_KINDS = [
  'damage_resistance',
  'hp_modifier',
  'speed',
  'granted_spells',
] as const;

/**
 * What a migrated legacy payload becomes: the fillable half of an effect row.
 *
 * A TYPE ALIAS AND NOT AN INTERFACE, which is load-bearing rather than a style
 * choice: an alias carries an implicit index signature, so this can be handed
 * straight to `effectPayloadKindError` — the shared kind/payload rule that
 * takes an untrusted row. Copying it into a fresh object at each call site to
 * satisfy the compiler is how a migrated payload and a JSON one start being
 * checked by two different pieces of code.
 */
export type MigratedEffect = {
  readonly effect_kind: string;
  readonly damage_type: string | null;
  readonly hit_points_flat: number | null;
  readonly hit_points_per_level: number | null;
  readonly speed_bonus_feet: number | null;
  readonly label: string;
};

type UnknownRow = Readonly<Record<string, unknown>>;

function nullableInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : null;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** True when a row carries any of the five retired columns. */
export function hasLegacyTraitEffect(row: UnknownRow): boolean {
  return LEGACY_TRAIT_EFFECT_COLUMNS.some((column) =>
    Object.hasOwn(row, column),
  );
}

/**
 * Splits a possibly-legacy trait row into the row the modern table accepts and
 * the effect it was carrying, if any.
 *
 * `effect` is `null` in three cases that are deliberately not distinguished by
 * the caller, because all three mean "this trait grants no effect the current
 * model has": the row is modern and has no legacy keys at all; the row is
 * legacy with `effect_kind: null`, which was twenty-six of the thirty-three
 * printed traits; or the row names `granted_spells`, which is retired.
 *
 * A legacy kind this build does not recognise AT ALL — a hand-edited file
 * naming `ability_score_increase` — also yields `null` rather than throwing.
 * The old schema's CHECK made such a row unstorable, so a document containing
 * one was already outside what any writer could produce, and the honest
 * response is the same as the old derivation's: treat it as no effect. It
 * cannot reach an `INSERT` from here.
 */
export function splitLegacyTraitEffect(row: UnknownRow): {
  readonly row: UnknownRow;
  readonly effect: MigratedEffect | null;
} {
  if (!hasLegacyTraitEffect(row)) {
    return { row, effect: null };
  }
  const stripped: Record<string, unknown> = { ...row };
  for (const column of LEGACY_TRAIT_EFFECT_COLUMNS) {
    delete stripped[column];
  }
  const kind = row.effect_kind;
  if (
    typeof kind !== 'string' ||
    !(effectKinds as readonly string[]).includes(kind)
  ) {
    return { row: stripped, effect: null };
  }
  // The label is the TRAIT'S name, which is the only name the old model had for
  // the effect — and is exactly what `character_effects.label` exists to hold.
  const label = typeof row.name === 'string' && row.name.length > 0
    ? row.name
    : 'Imported effect';
  return {
    row: stripped,
    effect: {
      effect_kind: kind,
      damage_type: nullableText(row.effect_damage_type),
      hit_points_flat: nullableInteger(row.effect_hit_points_flat),
      hit_points_per_level: nullableInteger(row.effect_hit_points_per_level),
      speed_bonus_feet: nullableInteger(row.effect_speed_bonus_feet),
      label,
    },
  };
}

/**
 * Migrates a whole list of trait rows at once.
 *
 * Returns the stripped rows in their original order, and the effects in the
 * order the traits appeared — which is what makes the migrated `sort_order`
 * reproducible: it is the index in this list, one-based, exactly as the share
 * import derives a trait's `sort_order` from its array position.
 */
export function migrateLegacyTraitRows(rows: readonly UnknownRow[]): {
  readonly rows: readonly UnknownRow[];
  readonly effects: readonly MigratedEffect[];
} {
  const migrated: UnknownRow[] = [];
  const effects: MigratedEffect[] = [];
  for (const row of rows) {
    const split = splitLegacyTraitEffect(row);
    migrated.push(split.row);
    if (split.effect !== null) {
      effects.push(split.effect);
    }
  }
  return { rows: migrated, effects };
}
