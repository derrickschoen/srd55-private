/**
 * EXTRA ATTACK GRANTS, AND THE ONE RULE THAT COMBINES THEM. Nothing here is
 * stored (D11); this module is pure and reads no database.
 *
 * D19 said the model needed three things `class_extra_attack_grants` cannot
 * express: a SOURCE that may be a class, a subclass or a named feature; a
 * prerequisite that is a CLASS level rather than a character level; and a
 * WEAPON SCOPE. This is the shape all three arrive in, after
 * `src/rules/sheet-content-lookup.ts` has read the three tables that hold them.
 *
 * ─── THE COMBINATION RULE ────────────────────────────────────────────────────
 *
 * `docs/srd/source/attack-class-features.txt`, and the identical passage in
 * `docs/srd/source/extra-attack-other-sources.txt`:
 *
 *   "If you gain the Extra Attack feature from more than one class, the
 *    features don't stack. You can't make more than two attacks with this
 *    feature unless you have a feature that says you can (such as the Fighter's
 *    Two Extra Attacks feature). Similarly, the Warlock's Thirsting Blade
 *    invocation, which grants you the Extra Attack feature with your pact
 *    weapon, doesn't give you additional attacks if you also have Extra Attack."
 *
 * So: for a given attack, the number of attacks is the MAXIMUM over the
 * `attack_count` of every grant in scope for it, floored at 1. GRANTS NEVER SUM.
 * A grant that UPGRADES another is expressed as a higher absolute total from the
 * same scope, not as an increment.
 *
 * TWO THINGS FALL OUT OF THAT AND ARE THEREFORE NOT WRITTEN ANYWHERE:
 *
 *  - THE "CAP OF TWO UNLESS A FEATURE SAYS OTHERWISE" NEEDS NO SEPARATE RULE.
 *    Totals are stored absolute, so the Fighter's Two Extra Attacks is a 3 and
 *    not a +1, and `max` produces the exception by itself.
 *  - DEVOURING BLADE NEEDS NO "UPGRADES" RELATION. Its prerequisite IS Thirsting
 *    Blade, so it cannot exist without it; a plain grant of 3 reproduces the
 *    source exactly under `max`, where an increment of +1 on top of Thirsting
 *    Blade's 2 would have needed an edge to know what to increment. The upgrade
 *    is expressed by the TOTAL, which is the same trick the Fighter's own three
 *    rows already use.
 *
 * ─── WHAT THIS APPLICATION CANNOT RESOLVE, AND SURFACES INSTEAD ──────────────
 *
 * A grant carries `unresolved`: the reasons, if any, this application could not
 * APPLY it. An empty list means applied. Two axes produce entries, and they are
 * INDEPENDENT — Thirsting Blade has both at once, which is why neither is a
 * state on a single enum:
 *
 *  1. THE WEAPON. `one_bonded_weapon` names one weapon this schema cannot
 *     identify: `character_weapons` holds no bond, no attunement and by D1b no
 *     link to any catalog row. THIS ONE IS DERIVED FROM `weapon_scope` BY THE
 *     COMBINATOR ITSELF and is never written by a builder — see
 *     `scopeUnresolved` for why that is structural rather than tidy.
 *  2. THE SELECTION. A `feature` grant belongs to an optional feature nothing in
 *     `db/schema/` records the character taking, and its printed prerequisite
 *     ("Level 5+ Warlock, Pact of the Blade") has a second half this schema does
 *     not model either.
 *
 * An unresolved grant NEVER RAISES THE NUMBER. It is reported beside it, which
 * is the posture `WeaponMasteryLookup` established for `content_missing`: state
 * the ignorance, never guess. A Warlock 5 with a Heavy Crossbow reading "the
 * Attack action gives 2 attacks" would be a NEW wrong answer, invented by the
 * fix for the old one.
 */
import type {
  ExtraAttackGrantSource,
  ExtraAttackWeaponScope,
} from '../domain/enums';

/**
 * One grant, as it hangs off one of a character's classes.
 *
 * `class_level` IS THE LEVEL IN THE GRANTING CLASS, NEVER THE CHARACTER'S TOTAL.
 * That is what all three tables store and what every one of these features says,
 * and it is the distinction a naive reading gets wrong: a Bard 5 / Fighter 1 is
 * character level 6 and does NOT have a Bard level 6 subclass feature.
 *
 * THE GRANTING CLASS IS NOT A FIELD HERE. It is the entry these hang off, and
 * `resolveAttacksPerAction` attaches it on the way out — a second copy on the
 * grant could disagree with the class it was read from.
 */
export interface ExtraAttackGrant {
  readonly source: ExtraAttackGrantSource;
  /**
   * What to call it in a sentence. The CLASS's name for a class-table grant —
   * the class table prints no feature name of its own that this application
   * parses — and the FEATURE's name for the other two, because that is the name
   * the user is looking for on their sheet.
   */
  readonly source_name: string;
  readonly class_level: number;
  /** TOTAL attacks on the Attack action, absolute, never extra attacks. */
  readonly attack_count: number;
  readonly weapon_scope: ExtraAttackWeaponScope;
  /**
   * Why this grant was not applied — one sentence per reason, empty when it was.
   *
   * A LIST RATHER THAN A NULLABLE REASON OR A STATE ENUM, and D6d is why: the
   * two axes above are independent and Thirsting Blade trips both, so a single
   * `reason: string | null` would have had to drop one and a `state` union would
   * have needed a member per combination. Emptiness is the discriminator, and it
   * cannot get out of step with the reasons because it IS the reasons.
   *
   * ON A GRANT AS BUILT, THIS HOLDS ONLY THE REASONS NOT VISIBLE IN THE GRANT'S
   * OWN FIELDS. Anything `weapon_scope` already states is added by
   * `resolveAttacksPerAction`, so a builder cannot forget it and cannot state it
   * twice. On a `ResolvedExtraAttackGrant` — what the combinator returns and
   * what the sheet prints — it is complete.
   */
  readonly unresolved: readonly string[];
}

/**
 * A grant with the class it came from and its COMPLETE reasons, as the
 * combinator reports it.
 */
export interface ResolvedExtraAttackGrant extends ExtraAttackGrant {
  readonly class_name: string;
  /** The character's level in `class_name`, which met `class_level`. */
  readonly at_class_level: number;
}

/** The subset of a class entry this combinator reads. */
export interface ExtraAttackGrantingClass {
  readonly class_name: string;
  readonly level: number;
  readonly extra_attack_grants?: readonly ExtraAttackGrant[];
}

/**
 * How many attacks the Attack action gives, and what could not be counted.
 *
 * `count` IS A NUMBER THIS APPLICATION STANDS BEHIND, never an approximation
 * with an asterisk. Everything it could not stand behind is in `unresolved`,
 * which the sheet prints as sentences beside the number.
 */
export interface AttacksPerAction {
  readonly count: number;
  readonly unresolved: readonly ResolvedExtraAttackGrant[];
}

/**
 * The sentence for a grant whose weapon this application cannot identify.
 *
 * EXPORTED FOR THE TESTS THAT ASSERT ON ITS WORDING AND FOR NOTHING ELSE. The
 * only production caller is `scopeUnresolved`, immediately below, and that is
 * deliberate: see its comment.
 */
export function bondedWeaponUnresolved(sourceName: string): string {
  return (
    `${sourceName} applies to one bonded weapon only. This application does ` +
    'not record which of a character’s weapons that is, so the attack count ' +
    'has not been applied to any of them.'
  );
}

/**
 * WHAT A GRANT'S OWN WEAPON SCOPE MAKES UNRESOLVABLE, DERIVED FROM THE FIELD.
 *
 * THIS IS NOT TIDINESS; IT IS THE REASON `weapon_scope` CANNOT LEAK. An earlier
 * shape had the two builders in `src/rules/sheet-content-lookup.ts` write the
 * sentence beside the field, and the field itself was then INERT everywhere
 * downstream: `resolveAttacksPerAction` read `unresolved` and nothing else, so a
 * `one_bonded_weapon` grant that reached it with an empty list — from an
 * importer, from a third builder, from a hand-edited database image — was
 * folded straight into the character-wide count and onto EVERY weapon's
 * profile. That is precisely the D19 §3 answer this module exists to refuse,
 * and a convention held in two hand-written branches is not a defence against
 * it: emptying either branch left the wrong number reachable.
 *
 * So the sentence is derived HERE, at the one place the number is produced, and
 * no builder states it at all. The invariant is now "a grant is applied only if
 * NOTHING, including its own scope, makes it unapplicable", and that sentence
 * is written once in code rather than repeated at every construction site.
 *
 * The switch is exhaustive over `extraAttackWeaponScopes`, so a third scope is a
 * COMPILE ERROR here rather than a silently applied grant.
 */
function scopeUnresolved(grant: ExtraAttackGrant): readonly string[] {
  switch (grant.weapon_scope) {
    case 'any_weapon':
      return [];
    case 'one_bonded_weapon':
      return [bondedWeaponUnresolved(grant.source_name)];
    /* c8 ignore next 4 -- unreachable while the switch is exhaustive; kept so a
       new scope is a compile error here rather than a silent application. */
    default: {
      const unreachable: never = grant.weapon_scope;
      throw new Error(
        `Unhandled extra attack weapon scope ${String(unreachable)}.`,
      );
    }
  }
}

/** The sentence for a feature this application cannot confirm was taken. */
export function selectionUnresolved(
  sourceName: string,
  prerequisite: string,
): string {
  return (
    `${sourceName} is optional and its prerequisite is “${prerequisite}”. ` +
    'This application does not record which optional class features a ' +
    'character has taken, so it cannot confirm this one and has not applied it.'
  );
}

/**
 * THE COMBINATOR. `max` over the grants in scope, floored at 1.
 *
 * PER CLASS, A GRANT COUNTS ONLY IF ITS PREREQUISITE LEVEL IS AT OR BELOW THE
 * CHARACTER'S LEVEL IN THAT CLASS. That filter, and the floor of 1, are the two
 * behaviours carried over unchanged from the function this replaced.
 *
 * A GRANT COUNTS ONLY IF IT IS FULLY RESOLVED, AND ITS OWN `weapon_scope` IS
 * PART OF THAT — this function completes `unresolved` from the scope before it
 * looks at anything, so `one_bonded_weapon` can never raise a character-wide
 * number no matter which builder produced the grant. See `scopeUnresolved`.
 *
 * THE NON-STACKING RULE LIVES IN `count`, WHERE IT BELONGS. `max` and never
 * `sum`, over absolute totals, so an upgrade REPLACES what it upgrades — the
 * Fighter's Two Extra Attacks is stored as 3 and Devouring Blade as 3, and
 * neither adds to anything.
 *
 * THE UNRESOLVED LIST DROPS EXACTLY ONE THING, AND IT IS THE SRD'S OWN
 * SENTENCE: a grant that cannot beat `count` is not reported. "Thirsting Blade
 * … doesn't give you additional attacks if you also have Extra Attack" is that
 * line, and the comparison is against a number this application STANDS BEHIND,
 * never against another grant it could not resolve.
 *
 * NOTHING ELSE IS REDUCED, AND AN EARLIER VERSION OF THIS FUNCTION WAS WRONG TO
 * TRY. It kept only the highest grant per `weapon_scope`, on the reasoning that
 * two grants in one scope cannot stack. THAT IS A GUESS ABOUT WEAPON IDENTITY.
 * `one_bonded_weapon` is a SCOPE SHAPE, not a weapon: two features carrying it
 * — an invocation's pact weapon and a homebrew oath-blade — may well name
 * different weapons, and dropping the smaller would hide an entitlement the
 * character has. Thirsting Blade and Devouring Blade happen to share a weapon,
 * and generalising from the one pair this repository ships is precisely the
 * inference this module exists not to make. Both are listed; `count` is what
 * refuses to add them.
 *
 * Highest first, so the largest number a character might make is read first.
 */
export function resolveAttacksPerAction(
  classes: readonly ExtraAttackGrantingClass[],
): AttacksPerAction {
  const eligible: ResolvedExtraAttackGrant[] = [];
  for (const entry of classes) {
    for (const grant of entry.extra_attack_grants ?? []) {
      if (grant.class_level <= entry.level) {
        // The grant's own scope is turned into reasons HERE, so everything
        // below can go on reading `unresolved` alone and still be right about
        // a scoped grant no builder annotated. See `scopeUnresolved`.
        eligible.push({
          ...grant,
          unresolved: [...grant.unresolved, ...scopeUnresolved(grant)],
          class_name: entry.class_name,
          at_class_level: entry.level,
        });
      }
    }
  }

  let count = 1;
  for (const grant of eligible) {
    if (grant.unresolved.length === 0 && grant.attack_count > count) {
      count = grant.attack_count;
    }
  }

  return {
    count,
    unresolved: eligible
      .filter(
        (grant) => grant.unresolved.length > 0 && grant.attack_count > count,
      )
      .sort((a, b) => b.attack_count - a.attack_count),
  };
}
