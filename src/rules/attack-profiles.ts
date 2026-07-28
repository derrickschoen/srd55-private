/**
 * ATTACK PROFILES. Nothing here is stored (D11).
 *
 * For each weapon a character owns, the ways that weapon can be swung: the
 * plain attack, and the two cantrips and one class feature that REWRITE it.
 * Every number is derived from ability scores, class levels, the sourced
 * content in `db/schema/sheet.ts` and the character's spell access — so a
 * Dexterity change moves every profile at once and there is no second copy to
 * drift.
 *
 * THE PROVENANCE RULE. Every formula below cites a file in
 * `docs/srd/source/`. Where the source does not answer, this module SAYS SO in
 * its output rather than filling the gap, in the shape `WeaponMasteryLookup`
 * already established: a state, never a number.
 *
 * TWO THINGS THIS APPLICATION CANNOT DECIDE, AND STATES INSTEAD:
 *
 *  1. WHICH MELEE/RANGED BRANCH THIS PROFILE SHOULD PRESENT. The character
 *     copy now stores nullable `attack_kind`, but this persistence-only change
 *     does not alter attack-profile presentation or feed that field into this
 *     input. BOTH branches therefore remain offered here. No fallback from
 *     `thrown`/`ammunition` is permitted when the stored fact is absent.
 *  2. WHAT A WEAPON'S PROPERTIES DO. The Finesse, Thrown and Versatile rule
 *     texts are not in `docs/srd/source/`; only the weapons table's use of the
 *     words is. The source's "unless a weapon's property says otherwise" is
 *     therefore quoted and left unapplied.
 *
 * AND ONE IT CAN DECIDE NOW, WHICH IT COULD NOT WHEN THIS FILE WAS WRITTEN:
 * WHETHER THE CHARACTER IS PROFICIENT. That entry used to sit in the list above
 * as an impossibility, then briefly as a deferral, and it is neither now. D27
 * gave `character_weapons` a `simple | martial` category and D28 gave
 * `src/rules/multiclass-proficiency.ts` the union across a character's classes.
 * So the verdict arrives ON THE WEAPON and `profileProficiency` turns it into
 * the one thing that changes a number here: whether the Proficiency Bonus is in
 * the attack bonus. D28 §1 is what it implements — anyone may CARRY any weapon,
 * and what a Wizard does not get for their Greatsword is the BONUS.
 *
 * The sheet's Proficiencies section and these profiles therefore now agree about
 * the same weapon. They did not before, and the sheet was the one telling the
 * truth: it printed "not proficient" beside a profile that added the bonus
 * anyway. `tests/integration/queries/weapon-proficiency-agreement.test.ts`
 * exists to keep them agreeing.
 *
 * AND ONE THING IT DOES NOT MODEL AT ALL: the Unarmed Strike. Martial Arts
 * covers it, but an Unarmed Strike's own damage is not in `docs/srd/source/`
 * and there is no row for it in `weapon_templates` either, so no Unarmed Strike
 * profile is produced. Recalling the number would be the one thing this module
 * is built not to do.
 */
import type { Ability } from '../domain/enums';
import type { AbilityScores } from './ability-scores';
import { AttackBonus } from './attack-bonus';
import {
  CANTRIP_NAMES,
  type CantripAccess,
  type CantripSource,
  type RecognisedAttackCantrips,
} from './attack-cantrips';
import {
  attacksPerAction,
  martialArtsDice,
  type SheetClassLevels,
} from './sheet';
import { characterLevel } from './character-level';
import type {
  AttacksPerAction,
  ResolvedExtraAttackGrant,
} from './extra-attack';
import type { WeaponProficiencyVerdict } from './multiclass-proficiency';
import {
  formatWeaponDamage,
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../domain/weapon-damage';

export const attackProfileKinds = [
  'normal',
  'true_strike',
  'shillelagh',
  'martial_arts',
] as const;
export type AttackProfileKind = (typeof attackProfileKinds)[number];

/**
 * One ability a profile may be rolled with, and both numbers it produces.
 *
 * `attack_bonus` is modifier + proficiency bonus; `damage_modifier` is the
 * modifier alone. `docs/srd/source/sheet-math.txt`: "You add the same ability
 * modifier you use for attacks with a weapon to your damage rolls with that
 * weapon" — the same MODIFIER, not the same total, so the proficiency bonus
 * appears in exactly one of the two.
 */
export interface AbilityOption {
  readonly ability: Ability;
  readonly attack_bonus: number | null;
  readonly damage_modifier: number;
  /** Why this ability is on offer — the sentence the sheet shows. */
  readonly reason: string;
}

/**
 * Which ability a profile uses.
 *
 * FOUR STATES, AND THE MIDDLE TWO ARE NOT THE SAME THING. `choice` is the SRD
 * handing the player a decision ("you can use your Dexterity modifier instead
 * of your Strength modifier"); `undecided` is this application admitting it
 * cannot tell which one applies. Collapsing them would dress an ignorance up as
 * an entitlement.
 */
export type ProfileAbilities =
  | { readonly state: 'fixed'; readonly options: readonly AbilityOption[] }
  | {
      readonly state: 'choice';
      readonly options: readonly AbilityOption[];
      readonly reason: string;
    }
  | {
      readonly state: 'undecided';
      readonly options: readonly AbilityOption[];
      readonly reason: string;
    }
  | { readonly state: 'unavailable'; readonly reason: string };

/**
 * A profile's damage type.
 *
 * `choice` is the SRD's own — True Strike's "it can be Radiant damage or the
 * weapon's normal damage type (your choice)" and Shillelagh's Force. Neither is
 * silently resolved: `spell_type` and `weapon_type` are both carried so the
 * sheet can print both sides of the choice, and `weapon_type` is `null` when
 * the weapon records none, which is a completeness fact and not a default.
 */
export type ProfileDamageType =
  | { readonly state: 'weapon'; readonly damage_type: string }
  | { readonly state: 'not_recorded' }
  | {
      readonly state: 'choice';
      readonly spell_type: string;
      readonly weapon_type: string | null;
    };

/** Damage added on top of the weapon's own, with no ability modifier. */
export interface ExtraDamage {
  readonly dice: string;
  readonly damage_type: string;
  readonly note: string;
}

export interface ProfileDamage {
  readonly amount: WeaponDamage;
  readonly versatile_note: string | null;
  readonly damage_type: ProfileDamageType;
  readonly extra: readonly ExtraDamage[];
}

export interface AttackProfile {
  readonly kind: AttackProfileKind;
  readonly label: string;
  readonly abilities: ProfileAbilities;
  readonly damage: ProfileDamage;
  /**
   * How many attacks the Attack action gives WITH THIS PROFILE.
   *
   * Carried per profile, not once per character, because True Strike is one
   * attack as an Action however many the Attack action would give. Printing the
   * character-wide number beside a True Strike row would be wrong, and D15's
   * display rule turns on the two being comparable.
   *
   * D19 MADE THAT PLACEMENT LOAD-BEARING FOR A SECOND REASON: a grant may reach
   * ONE WEAPON ONLY, and a profile is the only thing in this derivation that
   * belongs to a weapon. This number is the count over grants that reach EVERY
   * weapon; a grant that does not is in `unresolved_attacks` and has not been
   * added to it.
   */
  readonly attacks_per_action: number;
  /**
   * Grants that would give MORE attacks than `attacks_per_action` if this
   * application could tell they applied — and the sentences saying why it
   * cannot.
   *
   * NEVER FOLDED INTO THE NUMBER, in either direction. Adding them would print
   * two attacks for a Warlock's Heavy Crossbow, which is a NEW wrong answer
   * invented by the fix for the old one; dropping them would hide a real
   * entitlement the character has at the table. So the number stays a number
   * this application stands behind and the ignorance is stated beside it, which
   * is the shape `WeaponMasteryLookup` established with `content_missing`.
   *
   * A grant that cannot beat `attacks_per_action` is not here at all — that is
   * the SRD's own "doesn't give you additional attacks if you also have Extra
   * Attack", applied rather than quoted. Nothing else is filtered: two grants
   * that both name one weapon need not name the SAME weapon, so keeping only
   * the larger would hide an entitlement. They do not add, and the number
   * beside them is what says so.
   */
  readonly unresolved_attacks: readonly ResolvedExtraAttackGrant[];
  /** What must be true at the table for this profile to be legal. */
  readonly preconditions: readonly string[];
  readonly notes: readonly string[];
}

export interface WeaponAttackProfiles {
  /** `null` for a row this application derived rather than one the user owns. */
  readonly weapon_id: number | null;
  readonly weapon_name: string;
  readonly derived: boolean;
  readonly profiles: readonly AttackProfile[];
}

export type AttackProfileWarningCode =
  | 'unrecognised_cantrip'
  | 'no_spellcasting_ability'
  | 'ambiguous_spellcasting_ability'
  /**
   * An Extra Attack grant this character may well have and this application
   * cannot apply. Reported once per grant, at the panel level, because the
   * reason is a fact about this application rather than about any one weapon.
   */
  | 'unresolved_extra_attack';

export interface AttackProfileWarning {
  readonly code: AttackProfileWarningCode;
  readonly message: string;
}

export interface AttackProfileResult {
  readonly weapons: readonly WeaponAttackProfiles[];
  readonly warnings: readonly AttackProfileWarning[];
  /**
   * The character-wide count, for the sheet's own heading.
   *
   * THE UNSCOPED GRANTS ONLY, and after D19 that qualification is the whole
   * meaning of the field. One number cannot answer for a character whose
   * pact-weapon grant beats their class grant, so this is the number that is
   * true of EVERY weapon they hold, and the rest is on the profiles.
   */
  readonly attacks_per_action: number;
  /** D15's predicate, stated once: `attacksPerAction(classes).count > 1`. */
  readonly has_extra_attack: boolean;
}

/** The fields of a character's weapon this derivation reads. */
export interface AttackProfileWeapon {
  readonly id: number;
  readonly name: string;
  readonly damage: WeaponDamage;
  readonly damage_type: string | null;
  readonly versatile_damage: VersatileWeaponDamage;
  /**
   * Whether this character is proficient with this weapon — REQUIRED, and not
   * optional with a generous default.
   *
   * An optional field would let a new call site omit it and silently get the
   * bonus, which is the defect this replaced: every attack a Wizard made with a
   * Greatsword printed a proficiency bonus they do not have. The verdict is
   * computed once, by `weaponProficiency`, from the same union the character
   * sheet prints — so the two screens cannot answer differently.
   */
  readonly proficiency: WeaponProficiencyVerdict;
}

export interface AttackProfileInput {
  readonly weapons: readonly AttackProfileWeapon[];
  readonly classes: readonly SheetClassLevels[];
  readonly scores: AbilityScores;
  readonly proficiencyBonus: number | null;
  readonly cantrips: RecognisedAttackCantrips;
}

/**
 * WHETHER THIS PROFILE'S ATTACK BONUS INCLUDES THE PROFICIENCY BONUS, AND WHY.
 *
 * TWO STATES AND NOT FOUR, deliberately: the verdict has four kinds and this has
 * two, because the only question a NUMBER can answer is whether the bonus is in
 * it. The four kinds do not map onto the two by tidiness — each mapping below is
 * a decision, and two of them are decisions this application could get wrong in
 * a way nobody would see. The `reason` is what carries the difference the number
 * cannot.
 */
export type ProfileProficiency =
  | { readonly state: 'included'; readonly reason: string }
  | { readonly state: 'withheld'; readonly reason: string };

/**
 * The four verdicts, mapped onto the two states. EXHAUSTIVE, NO `default` ARM.
 *
 *  - `proficient` -> INCLUDED. The plain case.
 *  - `not_proficient` -> WITHHELD. D28 §1 exactly: the row is never refused and
 *    the bonus is the thing that goes.
 *  - `category_not_stated` -> INCLUDED, AND SAID OUT LOUD, which is the one
 *    place this file prints a number it cannot source. D27 decided it: *"the
 *    column is NULLABLE, and null means NOT STATED. Where it is null the sheet
 *    keeps its current stated assumption; where it is set the sheet is right."*
 *    Withholding instead would take the bonus off every weapon on every
 *    character imported before that column existed, and off every hand-typed
 *    one — a new wrong number, invented by the fix for the old one, and one
 *    nobody asked for. The assumption travels in the reason instead (D24: an
 *    assumption is never printed as a fact).
 *  - `qualifier_not_evaluated` -> WITHHELD, matching what the sheet already
 *    says it assumed. Only an IMPORTED class can reach this arm — the SRD's two
 *    qualifiers are both evaluated — and the two screens agreeing on the
 *    assumption matters more than which way the assumption falls, since the
 *    reason tells the player to adjudicate either way.
 */
export function profileProficiency(
  verdict: WeaponProficiencyVerdict,
): ProfileProficiency {
  switch (verdict.kind) {
    case 'proficient':
      return {
        state: 'included',
        reason:
          'The Proficiency Bonus is included: a class this character has ' +
          'grants this weapon’s category. One class is enough — proficiency is ' +
          'a union across a character’s classes, and the Proficiencies section ' +
          'of the character sheet names which.',
      };
    case 'not_proficient':
      return {
        state: 'withheld',
        reason:
          'The Proficiency Bonus is NOT included: no class this character has ' +
          'grants this weapon’s category. Carrying and using it is still ' +
          'allowed — nothing here refuses the weapon — and what is withheld is ' +
          'the bonus alone.',
      };
    case 'category_not_stated':
      return {
        state: 'included',
        reason:
          'No simple/martial category is recorded for this weapon, so whether ' +
          'this character is proficient cannot be checked. The Proficiency ' +
          'Bonus is included, which is an ASSUMPTION and not a fact about this ' +
          'character: set the category on the weapon to find out.',
      };
    case 'qualifier_not_evaluated':
      return {
        state: 'withheld',
        reason:
          'A class of this character’s grants this weapon’s category only ' +
          'under a qualifier this application does not read, so the ' +
          'Proficiency Bonus is NOT included — the same assumption the ' +
          'Proficiencies section of the character sheet states. That section ' +
          'prints the qualifier verbatim; if the weapon does qualify, add the ' +
          'bonus at the table.',
      };
  }
}

/**
 * The proficiency state of the DERIVED Shillelagh row.
 *
 * It is not a weapon this character owns, so there is no
 * `character_weapons.proficiency_category` to check and no verdict to read. The
 * bonus is INCLUDED and the row says why it was not checked — the same posture
 * `category_not_stated` takes, for a different reason. Synthesising a `simple`
 * weapon to check against would be this application deciding which weapon the
 * player picked up, which is exactly the name-matching D15 refused.
 */
const DERIVED_ROW_PROFICIENCY: ProfileProficiency = {
  state: 'included',
  reason:
    'This row is derived rather than owned, so there is no weapon record to ' +
    'check a proficiency category against and the Proficiency Bonus is ' +
    'included. The Proficiencies section of the character sheet checks the ' +
    'weapons this character actually holds.',
};

/**
 * One ability's two numbers, with the proficiency decision applied to the first.
 *
 * `damage_modifier` NEVER MOVES. `docs/srd/source/sheet-math.txt` puts the
 * Proficiency Bonus in the attack roll and only the ability MODIFIER in the
 * damage roll, so withholding it changes exactly one of the two numbers. A fix
 * that took it off both would be a second wrong number.
 */
function option(
  input: AttackProfileInput,
  ability: Ability,
  reason: string,
  proficiency: ProfileProficiency,
): AbilityOption {
  const score = input.scores.score(ability);
  const applied =
    proficiency.state === 'included' ? input.proficiencyBonus : 0;
  return {
    ability,
    attack_bonus:
      applied === null ? null : AttackBonus.from(score, applied).value,
    damage_modifier: score.modifier(),
    reason:
      proficiency.state === 'included'
        ? reason
        : `${reason} ${proficiency.reason}`,
  };
}

function weaponDamageType(weapon: AttackProfileWeapon): ProfileDamageType {
  return weapon.damage_type === null
    ? { state: 'not_recorded' }
    : { state: 'weapon', damage_type: weapon.damage_type };
}

function versatileNote(weapon: AttackProfileWeapon): string | null {
  return weapon.versatile_damage.kind === 'not_applicable'
    ? null
    : `Versatile: ${formatWeaponDamage(weapon.versatile_damage)} when wielded with two hands.`;
}

/**
 * THE PLAIN ATTACK.
 *
 * `docs/srd/source/sheet-math.txt`: "The attack roll bonus for a weapon with
 * which you have proficiency is one of the following unless a weapon's property
 * says otherwise: Melee attack bonus = Strength modifier + Proficiency Bonus /
 * Ranged attack bonus = Dexterity modifier + Proficiency Bonus."
 *
 * BOTH FORMULAS ARE SHOWN, AND THE STATE IS `undecided` RATHER THAN `choice`.
 * The source branches on melee versus ranged. The character copy now persists
 * that nullable fact, but this persistence-only increment deliberately leaves
 * this presentation unchanged and does not add it to `AttackProfileWeapon`.
 * The `unless a weapon's property says otherwise` limb is quoted for the same
 * reason as before: the property texts that would override the formula —
 * Finesse, Thrown — are not in `docs/srd/source/`, so nothing here applies them.
 */
function normalProfile(
  input: AttackProfileInput,
  weapon: AttackProfileWeapon,
  attacks: AttacksPerAction,
): AttackProfile {
  const proficiency = profileProficiency(weapon.proficiency);
  // THE PRINTED FORMULA IS QUOTED WHERE IT APPLIES AND NAMED WHERE IT DOES NOT.
  // The source's sentence is about "a weapon with which you have proficiency";
  // printing it verbatim beside a number that deliberately omits its last term
  // would be this application quoting a formula it did not follow.
  const formula = (ability: 'Strength' | 'Dexterity', kind: string): string =>
    proficiency.state === 'included'
      ? `${kind} attack bonus = ${ability} modifier + Proficiency Bonus.`
      : `The printed ${kind.toLowerCase()} formula is ${ability} modifier + ` +
        `Proficiency Bonus; this row is the ${ability} modifier alone.`;
  return {
    kind: 'normal',
    label: 'Attack',
    abilities: {
      state: 'undecided',
      reason:
        'The printed formula is Strength for a melee attack and Dexterity for ' +
        'a ranged one, unless a weapon property says otherwise. This ' +
        'application does not record whether a weapon is melee or ranged, and ' +
        'the property rules that would override the formula are not among its ' +
        'sources, so both are shown.',
      options: [
        option(input, 'strength', formula('Strength', 'Melee'), proficiency),
        option(input, 'dexterity', formula('Dexterity', 'Ranged'), proficiency),
      ],
    },
    damage: {
      amount: weapon.damage,
      versatile_note: versatileNote(weapon),
      damage_type: weaponDamageType(weapon),
      extra: [],
    },
    attacks_per_action: attacks.count,
    unresolved_attacks: attacks.unresolved,
    preconditions: [proficiency.reason],
    notes: [],
  };
}

/**
 * True Strike's extra Radiant damage, on TOTAL CHARACTER LEVEL.
 *
 * `docs/srd/source/weapon-attack-cantrips.txt`: "the attack deals extra Radiant
 * damage when you reach levels 5 (1d6), 11 (2d6), and 17 (3d6)" — thresholds,
 * with no class named. `docs/srd/source/multiclassing.txt` supplies which level
 * those thresholds are read against: "If a cantrip of yours increases in power
 * at higher levels, the increase is based on your total character level, not
 * your level in a particular class, unless the spell says otherwise." The
 * cantrip does not say otherwise.
 */
export function trueStrikeExtraDice(totalLevel: number): string | null {
  if (totalLevel >= 17) {
    return '3d6';
  }
  if (totalLevel >= 11) {
    return '2d6';
  }
  if (totalLevel >= 5) {
    return '1d6';
  }
  return null;
}

/**
 * Shillelagh's damage die, on TOTAL CHARACTER LEVEL.
 *
 * `docs/srd/source/weapon-attack-cantrips.txt`: "the weapon's damage die
 * becomes a d8", then "Cantrip Upgrade. The damage die changes when you reach
 * levels 5 (d10), 11 (d12), and 17 (2d6)." Read against total character level
 * for the same sourced reason as True Strike's.
 *
 * THE LEVEL 17 STEP IS `2d6`, WHICH IS NOT A DIE SIZE. A d4/d6/d8/d10/d12
 * ladder — the shape `class_martial_arts_dice.martial_arts_die` legitimately
 * uses — cannot express it, so this returns the whole expression as text and
 * the level 17 case is pinned by its own test.
 */
export function shillelaghDamageDice(totalLevel: number): string {
  if (totalLevel >= 17) {
    return '2d6';
  }
  if (totalLevel >= 11) {
    return '1d12';
  }
  if (totalLevel >= 5) {
    return '1d10';
  }
  return '1d8';
}

/**
 * The spellcasting ability behind a cantrip, resolved across its sources.
 *
 * `docs/srd/source/multiclassing.txt`: "Each spell you prepare is associated
 * with one of your classes, and you use the spellcasting ability of that class
 * when you cast the spell." One source, one ability, no ambiguity — which is
 * why this is `fixed` for the ordinary case.
 *
 * TWO SOURCES ARE NOT COLLAPSED. A character who knows the cantrip from a class
 * and from a feat has two genuinely different numbers, and the source states no
 * rule for picking between them, so both are returned as `undecided` and named
 * by source. "The best one" would be this application inventing a rule.
 *
 * A SOURCE WITH NO ABILITY IS NOT SILENTLY DROPPED EITHER. A class row whose
 * `spellcasting_ability` is NULL — Barbarian, Fighter, Monk, Rogue — resolves
 * to no ability at all, and the existing spell math already reports `null` for
 * attack bonus and save DC there. Falling back to Strength or Dexterity would
 * invent a rule the cantrip explicitly overrides.
 *
 * AN `extra` OPTION IS ON THE ROW FOR A DIFFERENT REASON, AND SAYS SO. Shillelagh
 * keeps Strength on the list because the cantrip's own word is "you CAN use your
 * spellcasting ability INSTEAD OF Strength" — an entitlement the rules grant.
 * When the spellcasting side ALSO comes out `undecided`, the two land in one
 * list, and a state that means "this application cannot tell" would then be
 * covering an entry that the SRD decides outright. That is exactly the collapse
 * `ProfileAbilities` documents as forbidden. So `extra` carries its OWN sentence,
 * appended to every `undecided` reason it appears under, and the per-option
 * `reason` distinguishes each entry on the row.
 */
function cantripAbilities(
  input: AttackProfileInput,
  sources: readonly CantripSource[],
  cantripName: string,
  fixedPhrasing: string,
  proficiency: ProfileProficiency,
  extra: {
    readonly options: readonly AbilityOption[];
    readonly reason: string;
  } | null = null,
): ProfileAbilities {
  const extraOptions = extra?.options ?? [];
  const resolved = sources.filter(
    (source): source is CantripSource & { spellcasting_ability: Ability } =>
      source.spellcasting_ability !== null,
  );

  if (resolved.length === 0) {
    const named = sources.map((source) => source.source_name).join(', ');
    const reason =
      `No source of ${cantripName} on this character has a spellcasting ` +
      `ability this application can resolve (${named === '' ? 'no source' : named}), ` +
      'so it cannot say what the attack and damage rolls use.';
    return extra === null
      ? { state: 'unavailable', reason }
      : {
          state: 'undecided',
          reason: `${reason} ${extra.reason}`,
          options: extra.options,
        };
  }

  const options = resolved.map((source) =>
    option(
      input,
      source.spellcasting_ability,
      `${fixedPhrasing} (${source.source_name}).`,
      proficiency,
    ),
  );
  const distinct = new Set(options.map((entry) => entry.ability));

  if (distinct.size > 1) {
    const ambiguity =
      `${cantripName} reaches this character from more than one source, and ` +
      'those sources use different spellcasting abilities. Which one applies ' +
      'depends on the source the spell was taken from, so every one is shown.';
    return {
      state: 'undecided',
      reason: extra === null ? ambiguity : `${ambiguity} ${extra.reason}`,
      options: [...options, ...extraOptions],
    };
  }

  const combined = [...options.slice(0, 1), ...extraOptions];
  return extra === null
    ? { state: 'fixed', options: combined }
    : {
        state: 'choice',
        reason: `${fixedPhrasing}.`,
        options: combined,
      };
}

/**
 * TRUE STRIKE, ON ONE OF THE CHARACTER'S OWN WEAPONS.
 *
 * `docs/srd/source/weapon-attack-cantrips.txt`: "you make one attack with the
 * weapon used in the spell's casting. The attack uses your spellcasting ability
 * for the attack and damage rolls instead of using Strength or Dexterity. If
 * the attack deals damage, it can be Radiant damage or the weapon's normal
 * damage type (your choice)."
 *
 * `fixed`, NOT `choice`: the cantrip says the attack USES your spellcasting
 * ability, not that you may. The choice it does grant is over the damage TYPE,
 * and that is where the choice is modelled.
 *
 * ONE ATTACK, ALWAYS. The casting time is an Action, and the cantrip grants one
 * attack — so a character with Extra Attack who casts this gives attacks up. The
 * profile carries `1` where the plain attack carries `attacksPerAction`, and
 * says so in a note when the two differ, which is the comparison D15's display
 * rule exists to make possible.
 *
 * THE VERSATILE NOTE CARRIES OVER, because the attack is made "with the weapon
 * used in the spell's casting" and this profile uses that weapon's OWN damage
 * value. A two-handed Longsword still rolls 1d10 here, so dropping the note
 * would print 1d8 one row below the row that qualified it. Martial Arts is silent on
 * purpose: its die REPLACES the weapon's, which makes Versatile irrelevant
 * there. The note restates a value `character_weapons` records; it does not
 * apply the Versatile rule text, which is not in `docs/srd/source/`.
 */
function trueStrikeProfile(
  input: AttackProfileInput,
  weapon: AttackProfileWeapon,
  sources: readonly CantripSource[],
  attacks: AttacksPerAction,
): AttackProfile {
  const totalLevel = characterLevel(
    input.classes.map((entry) => entry.level),
  );
  const extraDice =
    totalLevel === null ? null : trueStrikeExtraDice(totalLevel);
  const proficiency = profileProficiency(weapon.proficiency);
  const notes: string[] = [];
  if (attacks.count > 1) {
    notes.push(
      `Casting this takes your Action and gives one attack, where the Attack ` +
        `action would give ${String(attacks.count)}.`,
    );
  }

  return {
    kind: 'true_strike',
    label: CANTRIP_NAMES.true_strike,
    abilities: cantripAbilities(
      input,
      sources,
      CANTRIP_NAMES.true_strike,
      'The attack uses your spellcasting ability for the attack and damage ' +
        'rolls instead of Strength or Dexterity',
      proficiency,
    ),
    damage: {
      amount: weapon.damage,
      versatile_note: versatileNote(weapon),
      damage_type: {
        state: 'choice',
        spell_type: 'Radiant',
        weapon_type: weapon.damage_type,
      },
      extra:
        extraDice === null
          ? []
          : [
              {
                dice: extraDice,
                damage_type: 'Radiant',
                note:
                  'Cantrip Upgrade: extra Radiant damage at levels 5, 11 and ' +
                  `17, read against your total character level of ${String(totalLevel)}.`,
              },
            ],
    },
    attacks_per_action: 1,
    // EMPTY EVEN FOR A CHARACTER WHO HAS UNRESOLVED GRANTS, and the reason is
    // the cantrip's own: it grants ONE attack as an Action, so no Extra Attack
    // grant of any source or scope could raise this row. Carrying the
    // character's unresolved grants here would invite the reader to apply them
    // to the one profile they provably do not touch.
    unresolved_attacks: [],
    preconditions: [
      // THE CANTRIP'S OWN PRECONDITION IS PROFICIENCY, WHICH IS NOW ANSWERED
      // RATHER THAN DEFERRED. The coin value is not: no column holds one, and
      // the two halves are kept in one sentence so a reader cannot take the
      // answered half as an answer to both.
      'Requires a weapon you have proficiency with that is worth 1+ CP. ' +
        `${proficiency.reason} This application records no coin value, so it ` +
        'cannot check the second half at all.',
    ],
    notes,
  };
}

/**
 * SHILLELAGH — ONE DERIVED ROW, UNCONDITIONALLY, FOR ANYONE WHO KNOWS IT.
 *
 * D15: the row appears whether or not the character owns a Club or a
 * Quarterstaff, and NOTHING IS WRITTEN TO `character_weapons` to make it
 * appear. D1b's "a weapon is user-defined values" survives intact because this
 * row is computed and thrown away with the rest of the sheet.
 *
 * `docs/srd/source/weapon-attack-cantrips.txt`: "A Club or Quarterstaff you are
 * holding is imbued... you can use your spellcasting ability instead of
 * Strength for the attack and damage rolls of melee attacks using that weapon,
 * and the weapon's damage die becomes a d8. If the attack deals damage, it can
 * be Force damage or the weapon's normal damage type (your choice)."
 *
 * `choice`, NOT `fixed`, and that is the cantrip's own word: "you CAN use your
 * spellcasting ability INSTEAD OF Strength". Strength therefore stays on the
 * row — including when no spellcasting ability resolves, where the row degrades
 * to Strength alone with the reason printed rather than vanishing.
 *
 * NO WEAPON DAMAGE TYPE IS CLAIMED. The row is not tied to a weapon the user
 * owns, so "the weapon's normal damage type" is the Club's or Quarterstaff's,
 * whichever they pick up. Reading it off an owned weapon would mean matching a
 * user-editable name back to the catalog, which is name-matching this
 * application refuses to do.
 */
function shillelaghProfile(
  input: AttackProfileInput,
  sources: readonly CantripSource[],
  attacks: AttacksPerAction,
): WeaponAttackProfiles {
  const totalLevel = characterLevel(
    input.classes.map((entry) => entry.level),
  );
  if (totalLevel === null) {
    throw new Error(
      'A Shillelagh profile requires a determined character level.',
    );
  }
  const strength = option(
    input,
    'strength',
    'Strength, which a melee weapon attack uses when the cantrip is not applied.',
    DERIVED_ROW_PROFICIENCY,
  );

  return {
    weapon_id: null,
    weapon_name: `${CANTRIP_NAMES.shillelagh} (a Club or a Quarterstaff)`,
    derived: true,
    profiles: [
      {
        kind: 'shillelagh',
        label: CANTRIP_NAMES.shillelagh,
        abilities: cantripAbilities(
          input,
          sources,
          CANTRIP_NAMES.shillelagh,
          'You can use your spellcasting ability instead of Strength for the ' +
            'attack and damage rolls of melee attacks with that weapon',
          DERIVED_ROW_PROFICIENCY,
          {
            options: [strength],
            reason:
              'Strength is on this list for a different reason than the rest: ' +
              'the cantrip says you CAN use your spellcasting ability INSTEAD ' +
              'OF Strength, so Strength stays available whichever source ' +
              'applies. That is the rules granting a choice, not this ' +
              'application failing to resolve one.',
          },
        ),
        damage: {
          amount: { kind: 'dice', dice: shillelaghDamageDice(totalLevel) },
          versatile_note:
            "The weapon's own damage die is replaced. The die changes at " +
            `levels 5, 11 and 17, read against your total character level of ${String(totalLevel)}.`,
          damage_type: {
            state: 'choice',
            spell_type: 'Force',
            weapon_type: null,
          },
          extra: [],
        },
        attacks_per_action: attacks.count,
        unresolved_attacks: attacks.unresolved,
        preconditions: [
          'Applies to a Club or a Quarterstaff you are holding, and to melee ' +
            'attacks with it. This row is derived: no weapon has been added to ' +
            'this character to produce it.',
          DERIVED_ROW_PROFICIENCY.reason,
        ],
        notes: [
          'Cast as a Bonus Action and lasts 1 minute. It ends early if you ' +
            'cast it again or let go of the weapon; this application does not ' +
            'track that.',
        ],
      },
    ],
  };
}

/**
 * MARTIAL ARTS, ON ONE OF THE CHARACTER'S OWN WEAPONS.
 *
 * `docs/srd/source/attack-class-features.txt`: "Martial Arts Die. You can roll
 * 1d6 in place of the normal damage of your Unarmed Strike or Monk weapons.
 * This die changes as you gain Monk levels" — and "Dexterous Attacks. You can
 * use your Dexterity modifier instead of your Strength modifier for the attack
 * and damage rolls of your Unarmed Strikes and Monk weapons."
 *
 * BOTH ARE `choice`, because both are printed as "you can".
 *
 * THE DIE IS THE MONK'S LEVEL, NOT THE CHARACTER'S. `martialArtsDice` resolves
 * it per class, and the die on this row is the one number here that does NOT
 * move with total character level — the opposite of the two cantrips above.
 *
 * WHICH WEAPONS QUALIFY IS STILL NOT DECIDED, BUT FOR ONE REASON NOW RATHER
 * THAN TWO. Monk weapons are "Simple Melee weapons" and "Martial Melee weapons
 * that have the Light property". D27 gave `character_weapons` the
 * simple/martial half; the MELEE/RANGED half is still absent, and it is exactly
 * what separates a Monk weapon from a Light Crossbow. Worn armour and a held
 * Shield are persisted (`character_armor`) but are not read here either. All of
 * it is stated as preconditions on every weapon rather than used to filter,
 * which is the same posture D15 took for Shillelagh.
 */
function martialArtsProfile(
  input: AttackProfileInput,
  weapon: AttackProfileWeapon,
  granted: { readonly class_name: string; readonly class_level: number; readonly die: number },
  attacks: AttacksPerAction,
): AttackProfile {
  const proficiency = profileProficiency(weapon.proficiency);
  return {
    kind: 'martial_arts',
    label: `Martial Arts (${granted.class_name})`,
    abilities: {
      state: 'choice',
      reason:
        'You can use your Dexterity modifier instead of your Strength ' +
        'modifier for the attack and damage rolls of your Monk weapons.',
      options: [
        option(
          input,
          'dexterity',
          'Dexterity, by Dexterous Attacks.',
          proficiency,
        ),
        option(
          input,
          'strength',
          'Strength, which a melee weapon attack uses without the feature.',
          proficiency,
        ),
      ],
    },
    damage: {
      amount: { kind: 'dice', dice: `1d${String(granted.die)}` },
      versatile_note:
        "You can roll this in place of the weapon's normal damage. It is the " +
        `die for ${granted.class_name} level ${String(granted.class_level)}, not for your total character level.`,
      damage_type: weaponDamageType(weapon),
      extra: [],
    },
    attacks_per_action: attacks.count,
    unresolved_attacks: attacks.unresolved,
    preconditions: [
      'Monk weapons are Simple Melee weapons and Martial Melee weapons that ' +
        'have the Light property. This application does not record which group ' +
        'a weapon belongs to, so it cannot tell whether this one qualifies.',
      'You must be unarmed or wielding only Monk weapons, and not wearing ' +
        'armor or wielding a Shield. This application does not record worn ' +
        'armor or a held Shield.',
      proficiency.reason,
    ],
    notes: [],
  };
}

function cantripWarnings(
  cantrips: RecognisedAttackCantrips,
): AttackProfileWarning[] {
  const warnings: AttackProfileWarning[] = [];
  for (const entry of cantrips.unrecognised) {
    warnings.push({
      code: 'unrecognised_cantrip',
      message:
        `${entry.source_name} carries a spell named "${entry.spell_name}" that ` +
        `looks like ${CANTRIP_NAMES[entry.cantrip]}, but ${entry.reason}. ` +
        'No attack profile has been derived from it.',
    });
  }
  for (const cantrip of ['true_strike', 'shillelagh'] as const) {
    const access: CantripAccess = cantrips[cantrip];
    if (access.state !== 'known') {
      continue;
    }
    const abilities = new Set(
      access.sources.flatMap((source) =>
        source.spellcasting_ability === null ? [] : [source.spellcasting_ability],
      ),
    );
    if (abilities.size === 0) {
      warnings.push({
        code: 'no_spellcasting_ability',
        message:
          `${CANTRIP_NAMES[cantrip]} is known from ` +
          `${access.sources.map((source) => source.source_name).join(', ')}, which ` +
          'has no spellcasting ability recorded, so its attack and damage ' +
          'numbers cannot be derived.',
      });
    } else if (abilities.size > 1) {
      warnings.push({
        code: 'ambiguous_spellcasting_ability',
        message:
          `${CANTRIP_NAMES[cantrip]} is known from more than one source and ` +
          'those sources use different spellcasting abilities ' +
          `(${access.sources
            .map(
              (source) =>
                `${source.source_name}: ${source.spellcasting_ability ?? 'none'}`,
            )
            .join('; ')}). Every one is shown; this application does not pick.`,
      });
    }
  }
  return warnings;
}

function knownSources(access: CantripAccess): readonly CantripSource[] | null {
  return access.state === 'known' ? access.sources : null;
}

/**
 * The whole picture, in the order the sheet prints it.
 *
 * WEAPONS FIRST, IN THE ORDER THE CHARACTER OWNS THEM, then the derived
 * Shillelagh row last — a row this application produced belongs after the rows
 * the user did.
 *
 * Within a weapon: the plain attack, then True Strike, then Martial Arts. The
 * plain attack leads because it is the one that needs no cantrip, no feature
 * and no precondition beyond proficiency.
 */
export function attackProfiles(
  input: AttackProfileInput,
): AttackProfileResult {
  const trueStrike = knownSources(input.cantrips.true_strike);
  const shillelagh = knownSources(input.cantrips.shillelagh);
  const martialArts = martialArtsDice(input.classes);
  const attacks = attacksPerAction(input.classes);

  const weapons: WeaponAttackProfiles[] = input.weapons.map((weapon) => {
    const profiles: AttackProfile[] = [normalProfile(input, weapon, attacks)];
    if (trueStrike !== null) {
      profiles.push(trueStrikeProfile(input, weapon, trueStrike, attacks));
    }
    for (const granted of martialArts) {
      profiles.push(martialArtsProfile(input, weapon, granted, attacks));
    }
    return {
      weapon_id: weapon.id,
      weapon_name: weapon.name,
      derived: false,
      profiles,
    };
  });

  if (shillelagh !== null) {
    weapons.push(shillelaghProfile(input, shillelagh, attacks));
  }

  return {
    weapons,
    warnings: [
      ...cantripWarnings(input.cantrips),
      ...unresolvedAttackWarnings(attacks),
    ],
    attacks_per_action: attacks.count,
    has_extra_attack: attacks.count > 1,
  };
}

/**
 * One warning per Extra Attack grant this application could not apply.
 *
 * SAID TWICE ON PURPOSE, AND THE TWO SAY DIFFERENT THINGS. The panel-level
 * warning names the grant and prints every reason, because the reasons are
 * facts about this application's schema and belong beside the character-wide
 * sentence that would otherwise read as the whole answer. The profile-level
 * `unresolved_attacks` says WHICH ROWS the grant would have changed, which a
 * panel-level warning cannot.
 */
function unresolvedAttackWarnings(
  attacks: AttacksPerAction,
): AttackProfileWarning[] {
  return attacks.unresolved.map((grant) => ({
    code: 'unresolved_extra_attack' as const,
    message:
      `${grant.source_name} (${grant.class_name} ${String(grant.class_level)}) ` +
      `would give ${String(grant.attack_count)} attacks on the Attack action, ` +
      `where ${String(attacks.count)} ` +
      `${attacks.count === 1 ? 'is' : 'are'} shown. ` +
      grant.unresolved.join(' ') +
      // SAID ON EVERY ONE, because more than one may be listed and the source's
      // own rule is the thing a reader is most likely to get wrong.
      ' Features that grant Extra Attack do not stack: the number is the ' +
      'largest of them, never the sum.',
  }));
}
