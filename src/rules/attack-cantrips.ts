/**
 * RECOGNISING THE TWO CANTRIPS THAT REWRITE A WEAPON ATTACK.
 *
 * True Strike and Shillelagh ship in the read-only SRD layer. Their official
 * keys are minted by `officialSpellKey`, so `2024:true-strike` and
 * `2024:shillelagh` are sourced facts for bundled rows rather than guesses.
 *
 * IMPORTED CATALOGUES REMAIN OPEN. `catalog-schema.ts` validates an imported
 * `versionKey` only for non-blankness, so the key under which somebody's
 * document files True Strike is whatever that document chose. The existing
 * guess-handling remains for that real path. Three cases follow:
 *
 *  1. THE KEY IS THE ONE WE EXPECT. Recognised, and a profile is derived.
 *  2. THE KEY IS SOMETHING ELSE, BUT THE SPELL IS PLAINLY THE RIGHT ONE — its
 *     canonical name normalises to `true-strike`. NOT recognised, and REPORTED:
 *     "your catalog uses a key this application does not know". Silence here
 *     would be a sheet quietly missing an attack the character has.
 *  3. AN UNRELATED SPELL HAS BEEN RENAMED "True Strike". Not recognised, and
 *     not reported either — its key does not match and neither does its
 *     canonical identity name, so there is nothing to say.
 *
 * WHY NOT MATCH ON THE DISPLAY NAME. `SpellAccessRoute.spell_name` is
 * `spell_versions.display_name`, which the catalog importer overwrites from the
 * document's own `name` field on every re-import. Matching on it means a
 * document that renames an unrelated spell mints a radiant-damage attack
 * profile. `content_key` is UNIQUE and is the column the importer upserts on,
 * so it is the only stable handle a route carries.
 */
import type { SpellAccessRoute } from '../access/spell-access-builder';
import {
  isSpellVersionKey,
  normalizeCatalogKeyComponent,
} from '../catalog/catalog-key';
import type { Ability } from '../domain/enums';

export const attackCantrips = ['true_strike', 'shillelagh'] as const;
export type AttackCantrip = (typeof attackCantrips)[number];

/**
 * The slug each cantrip is expected to be keyed under.
 *
 * A BOUNDED TABLE, not an open name match. `officialSpellKey('2024', 'True
 * Strike')` produces `2024:true-strike`, and a bare identity key is the same
 * slug with no edition, so one slug per cantrip covers both shapes of key this
 * application's own helpers produce.
 */
const CANTRIP_SLUGS: Readonly<Record<AttackCantrip, string>> = {
  true_strike: 'true-strike',
  shillelagh: 'shillelagh',
};

/** The printed name, for messages. Not used for matching. */
export const CANTRIP_NAMES: Readonly<Record<AttackCantrip, string>> = {
  true_strike: 'True Strike',
  shillelagh: 'Shillelagh',
};

/** One route by which the character has the cantrip. */
export interface CantripSource {
  readonly source_name: string;
  /**
   * The ability that route resolved to, or `null` when the source has none —
   * a Fighter's class row has `spellcasting_ability = NULL`, and so does any
   * source instance whose config does not name one.
   */
  readonly spellcasting_ability: Ability | null;
}

export type CantripAccess =
  | { readonly state: 'not_known' }
  | { readonly state: 'known'; readonly sources: readonly CantripSource[] };

/**
 * A spell that looks like one of the two but whose key we do not recognise.
 *
 * Carries the key verbatim so the message can name it, which is the whole
 * point: the user can then see that their catalog filed it under something this
 * application was not looking for.
 */
export interface UnrecognisedCantrip {
  readonly cantrip: AttackCantrip;
  readonly content_key: string;
  readonly spell_name: string;
  readonly source_name: string;
  readonly reason: string;
}

export interface RecognisedAttackCantrips {
  readonly true_strike: CantripAccess;
  readonly shillelagh: CantripAccess;
  readonly unrecognised: readonly UnrecognisedCantrip[];
}

function slugOrNull(value: string): string | null {
  try {
    return normalizeCatalogKeyComponent(value);
  } catch {
    return null;
  }
}

/**
 * The spell slug a content key ends in, or `null` when the key is not one of
 * the two shapes this application produces.
 *
 * ACCEPTED: a bare identity key (`true-strike`) and an official version key
 * (`2024:true-strike`). REFUSED: the three-part homebrew key
 * `2024:someone.homebrew:true-strike`. A homebrew namespace exists so a table
 * can publish its OWN spell under a name that already exists; treating one as
 * the SRD cantrip would let any registered owner claim the profile. It falls
 * through to the unrecognised list instead, where it is reported rather than
 * either honoured or hidden.
 */
export function spellKeySlug(contentKey: string): string | null {
  const parts = contentKey.split(':');
  if (parts.length === 1) {
    const only = parts[0] as string;
    return slugOrNull(only) === only ? only : null;
  }
  if (parts.length !== 2 || !isSpellVersionKey(contentKey)) {
    return null;
  }
  return parts[1] as string;
}

function sourceKey(source: CantripSource): string {
  return `${source.source_name}\u0000${source.spellcasting_ability ?? ''}`;
}

/**
 * Which of the two cantrips a character's spell access routes carry.
 *
 * ONE ENTRY PER DISTINCT (SOURCE, ABILITY), not per route. A prepared-caster's
 * cantrip can arrive on several routes from one source; a Wizard 5 / Cleric 3
 * who knows the same cantrip twice arrives on two, with different abilities,
 * and both of those are kept because they are genuinely different numbers.
 * `docs/srd/source/multiclassing.txt`: "Each spell you prepare is associated
 * with one of your classes, and you use the spellcasting ability of that class
 * when you cast the spell."
 */
export function recogniseAttackCantrips(
  routes: readonly SpellAccessRoute[],
): RecognisedAttackCantrips {
  const found = new Map<AttackCantrip, Map<string, CantripSource>>();
  const unrecognised: UnrecognisedCantrip[] = [];
  const seenUnrecognised = new Set<string>();

  for (const route of routes) {
    const slug = spellKeySlug(route.spell_content_key);
    const identitySlug = slugOrNull(route.identity_name);
    for (const cantrip of attackCantrips) {
      const expected = CANTRIP_SLUGS[cantrip];
      const keyMatches = slug === expected;
      const nameMatches = identitySlug === expected;
      if (!keyMatches && !nameMatches) {
        continue;
      }

      // A level is a fact the catalog states about the spell, and both of these
      // are cantrips. A row keyed `2024:true-strike` at level 3 is not the
      // cantrip whose upgrades scale on total character level, so it is
      // reported rather than treated as one.
      const reason =
        keyMatches && route.spell_level !== 0
          ? `it is recorded at spell level ${String(route.spell_level)}, and ${CANTRIP_NAMES[cantrip]} is a cantrip`
          : keyMatches
            ? null
            : `its content key is '${route.spell_content_key}', which this application does not recognise as ${CANTRIP_NAMES[cantrip]}`;

      if (reason === null) {
        const sources =
          found.get(cantrip) ?? new Map<string, CantripSource>();
        const source: CantripSource = {
          source_name: route.source_name,
          spellcasting_ability: route.spellcasting_ability,
        };
        sources.set(sourceKey(source), source);
        found.set(cantrip, sources);
        continue;
      }

      const fingerprint = `${cantrip}\u0000${route.spell_content_key}\u0000${route.source_name}`;
      if (seenUnrecognised.has(fingerprint)) {
        continue;
      }
      seenUnrecognised.add(fingerprint);
      unrecognised.push({
        cantrip,
        content_key: route.spell_content_key,
        spell_name: route.spell_name,
        source_name: route.source_name,
        reason,
      });
    }
  }

  const access = (cantrip: AttackCantrip): CantripAccess => {
    const sources = found.get(cantrip);
    return sources === undefined || sources.size === 0
      ? { state: 'not_known' }
      : { state: 'known', sources: [...sources.values()] };
  };

  return {
    true_strike: access('true_strike'),
    shillelagh: access('shillelagh'),
    unrecognised,
  };
}
