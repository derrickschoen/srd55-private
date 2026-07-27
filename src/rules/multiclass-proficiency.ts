/**
 * MULTICLASS PROFICIENCY — THE UNION, AND THE WARNING (D28).
 *
 * Nothing here is stored. Every value is derived from the class rows
 * `src/queries/character-sheet-builder.ts` joins and the character's own weapon
 * columns, exactly as the rest of the sheet is.
 *
 * THE RULE, from the owner (D28 §3): *"a character only needs proficiency in a
 * type of weapon from one of its classes to be proficient."* A UNION, never an
 * intersection, and never "the first class only" — which is what saving throws
 * are, and the two rules must not be copied from each other. A Wizard/Fighter is
 * proficient with Martial weapons because the Fighter grants it; a naive
 * implementation reading only the first class would tell them they are not.
 *
 * THE WRINKLE D28 §3 NAMED AS UNBUILT CONTENT IS NOW BUILT. The union is over
 * what each class actually granted THIS character, which
 * `classProficiencyGrants` resolves: the starting class contributes its full
 * Core Traits row, every later class only its multiclass ENTRY subset. D28's
 * "honest interim" — union over weapon proficiencies only, with skills and saves
 * from an entry unmodelled — is superseded, because
 * `docs/srd/source/multiclass-entry-grants.txt` is now parsed and seeded.
 *
 * WARN, NEVER REFUSE (D28 §1). Anyone may CARRY any weapon; owning a Heavy
 * Crossbow as a Wizard is legal. What a Wizard does not get is the proficiency
 * BONUS. So nothing in this module returns a boolean the UI can use to reject a
 * row — it returns a VERDICT with the reason attached, and every verdict is
 * printable.
 */
import type {
  ArmorCategory,
  WeaponProficiencyCategory,
} from '../domain/enums';
import {
  classProficiencyGrants,
  type ClassProficiencyGrant,
  type ClassWeaponProficiency,
  type SheetClass,
  type SheetWarning,
} from './sheet';

/**
 * The weapon columns a proficiency question needs, and NOTHING ELSE.
 *
 * Deliberately not `CharacterWeapon`: the qualifier evaluation reads the group
 * and two boolean property columns, so a type naming exactly those three is what
 * makes it impossible for this module to start guessing from damage dice or a
 * name. The booleans are the ones the SRD's two printed qualifiers use.
 */
export interface ProficiencyWeapon {
  readonly name: string;
  /** `null` is NOT STATED — D27. Never treated as `simple`. */
  readonly proficiency_category: WeaponProficiencyCategory | null;
  readonly finesse: boolean;
  readonly light: boolean;
}

/**
 * The qualifier, PARSED as the set union D28 §2 says it is.
 *
 * *"Martial weapons that have the Finesse or Light property"* is exactly
 * `martial AND (finesse OR light)`. Both flags are already stored as booleans on
 * the weapon, so this needs no expression parser and no AST — codex proposed a
 * small predicate language and the owner's simpler reading covers the only two
 * qualifiers the SRD prints (Rogue: Finesse or Light; Monk: Light).
 *
 * `unevaluated` IS THE THIRD MEMBER AND IT IS NOT DEAD CODE. An imported or
 * homebrew class may qualify its grant with something this does not recognise —
 * "that you are holding in two hands", say — and the honest answer is neither to
 * grant it silently nor to refuse it silently. The verdict then STATES the
 * qualifier verbatim and leaves the reader to adjudicate, which is D26's "the
 * table adjudicates" applied to a string this application cannot read.
 */
export type WeaponQualifier =
  | { readonly kind: 'unqualified' }
  | {
      readonly kind: 'any_property';
      readonly properties: readonly (keyof ProficiencyProperties)[];
      readonly text: string;
    }
  | { readonly kind: 'unevaluated'; readonly text: string };

/** The weapon property columns a qualifier may name. */
type ProficiencyProperties = Pick<ProficiencyWeapon, 'finesse' | 'light'>;

/**
 * Which words this application can evaluate, and what column each reads.
 *
 * TWO ENTRIES, BECAUSE THE SRD PRINTS TWO. Adding `heavy` here would be this
 * application inventing a qualifier no class has; the `unevaluated` arm is what
 * a real third one gets until someone sources it. The map is over COLUMN NAMES
 * rather than free strings so a word with no column cannot be added by accident.
 */
const QUALIFIER_WORDS: Readonly<Record<string, keyof ProficiencyProperties>> = {
  finesse: 'finesse',
  light: 'light',
};

/**
 * `"Finesse or Light"` -> the two columns; `"Light"` -> one.
 *
 * SPLIT ON `or` AND ON NOTHING ELSE. The SRD's two qualifiers are disjunctions,
 * and a conjunction would mean something different — "Finesse and Light" is a
 * far smaller set than "Finesse or Light", so silently treating one as the other
 * would be a wrong answer rather than a missing one. Anything containing `and`,
 * or naming a word with no column, lands in `unevaluated` and gets printed
 * instead of guessed at.
 */
export function parseWeaponQualifier(
  qualifier: string | null,
): WeaponQualifier {
  if (qualifier === null) {
    return { kind: 'unqualified' };
  }
  const text = qualifier.trim();
  if (text === '') {
    return { kind: 'unqualified' };
  }
  const parts = text.split(/\s+or\s+/i).map((part) => part.trim().toLowerCase());
  const properties: (keyof ProficiencyProperties)[] = [];
  for (const part of parts) {
    const column = QUALIFIER_WORDS[part];
    if (column === undefined) {
      return { kind: 'unevaluated', text };
    }
    properties.push(column);
  }
  return { kind: 'any_property', properties, text };
}

/**
 * Does one class's grant cover this weapon?
 *
 * `covers` false with `stated` set is the `unevaluated` case: the class grants
 * the right CATEGORY but under a condition this application will not pretend to
 * evaluate. That is a different answer from "no class grants this category at
 * all", and the sheet prints them differently.
 */
interface GrantVerdict {
  readonly covers: boolean;
  readonly unevaluated: string | null;
}

function grantCovers(
  weapon: ProficiencyWeapon,
  proficiency: ClassWeaponProficiency,
): GrantVerdict {
  if (weapon.proficiency_category !== proficiency.category) {
    return { covers: false, unevaluated: null };
  }
  const qualifier = parseWeaponQualifier(proficiency.property_qualifier);
  switch (qualifier.kind) {
    case 'unqualified':
      return { covers: true, unevaluated: null };
    case 'any_property':
      // THE UNION D28 §2 DESCRIBES, EVALUATED FROM THE WEAPON'S OWN BOOLEAN
      // COLUMNS. `some`, not `every`: "Finesse or Light" is satisfied by either.
      return {
        covers: qualifier.properties.some((property) => weapon[property]),
        unevaluated: null,
      };
    case 'unevaluated':
      return { covers: false, unevaluated: qualifier.text };
  }
}

/**
 * Whether a character is proficient with one weapon, and WHY NOT when they are
 * not.
 *
 * FOUR ANSWERS, NOT TWO, and the two extra ones are the honest states this
 * application is in for real characters:
 *
 *  - `proficient` — some class of theirs grants the weapon's category, and any
 *    qualifier on that grant is satisfied by the weapon's own properties.
 *  - `not_proficient` — no class does. The sheet WARNS; it never refuses the
 *    row, and the proficiency bonus is the thing withheld, not the weapon.
 *  - `category_not_stated` — the weapon has no `proficiency_category` (D27's
 *    null). Nothing can be checked, and saying so is better than assuming
 *    `simple` and printing a bonus nobody sourced.
 *  - `qualifier_not_evaluated` — a class grants the category under a condition
 *    this application does not read. The qualifier travels in the verdict so the
 *    sheet can print it and the player can adjudicate.
 */
export type WeaponProficiencyVerdict =
  | { readonly kind: 'proficient'; readonly via: readonly string[] }
  | { readonly kind: 'not_proficient' }
  | { readonly kind: 'category_not_stated' }
  | {
      readonly kind: 'qualifier_not_evaluated';
      readonly via: readonly string[];
      readonly qualifiers: readonly string[];
    };

export function weaponProficiency(
  weapon: ProficiencyWeapon,
  grants: readonly ClassProficiencyGrant[],
): WeaponProficiencyVerdict {
  if (weapon.proficiency_category === null) {
    return { kind: 'category_not_stated' };
  }
  const via: string[] = [];
  const unevaluated: string[] = [];
  const qualifierClasses: string[] = [];
  for (const grant of grants) {
    for (const proficiency of grant.weapon_proficiencies) {
      const verdict = grantCovers(weapon, proficiency);
      if (verdict.covers) {
        via.push(grant.class_name);
        break;
      }
      if (verdict.unevaluated !== null) {
        unevaluated.push(verdict.unevaluated);
        qualifierClasses.push(grant.class_name);
      }
    }
  }
  if (via.length > 0) {
    // ONE CLASS IS ENOUGH — the union. The others are still listed, because a
    // player asked "why am I proficient with this" wants the whole answer.
    return { kind: 'proficient', via };
  }
  if (unevaluated.length > 0) {
    return {
      kind: 'qualifier_not_evaluated',
      via: [...new Set(qualifierClasses)],
      qualifiers: [...new Set(unevaluated)],
    };
  }
  return { kind: 'not_proficient' };
}

/** Every armour category any of a character's classes trained them in. */
export function armorTrainingUnion(
  grants: readonly ClassProficiencyGrant[],
): ReadonlySet<ArmorCategory> {
  const found = new Set<ArmorCategory>();
  for (const grant of grants) {
    for (const category of grant.armor_training) {
      found.add(category);
    }
  }
  return found;
}

/**
 * Every weapon category any of a character's classes granted, with the
 * qualifiers that came with each.
 *
 * A LIST AND NOT A SET, because two classes can grant the same category on
 * different terms — a Monk/Fighter has `martial` qualified by "Light" from one
 * and unqualified from the other, and collapsing them to one member would have
 * to pick a qualifier to keep. The picked-one would then either over-grant or
 * under-grant depending on which survived.
 */
export interface WeaponProficiencyGrant extends ClassWeaponProficiency {
  readonly class_name: string;
}

export function weaponProficiencyUnion(
  grants: readonly ClassProficiencyGrant[],
): readonly WeaponProficiencyGrant[] {
  const found: WeaponProficiencyGrant[] = [];
  for (const grant of grants) {
    for (const proficiency of grant.weapon_proficiencies) {
      found.push({ class_name: grant.class_name, ...proficiency });
    }
  }
  return found;
}

export interface ProficiencyResult {
  readonly grants: readonly ClassProficiencyGrant[];
  readonly armor_training: ReadonlySet<ArmorCategory>;
  readonly weapon_proficiencies: readonly WeaponProficiencyGrant[];
  readonly weapons: readonly {
    readonly name: string;
    readonly verdict: WeaponProficiencyVerdict;
  }[];
  readonly warnings: readonly SheetWarning[];
}

/**
 * The whole proficiency picture for one character, warnings included.
 *
 * ONE FUNCTION RATHER THAN FOUR CALLS AT THE BUILDER, for the D21 reason: the
 * warning is derived at the single place the verdict is produced, so a caller
 * cannot get the verdict without the sentence explaining it, and a second caller
 * cannot phrase it differently.
 *
 * THE WARNINGS NEVER BLOCK. Each is a `SheetWarning` — the type whose own doc
 * comment says these functions "never throw on incoherent input; they degrade to
 * a stated approximation" — and the weapon row, the armour row and every derived
 * number are produced regardless.
 */
export function characterProficiencies(input: {
  readonly classes: readonly SheetClass[];
  readonly weapons: readonly ProficiencyWeapon[];
  readonly wornArmor: readonly { readonly name: string; readonly category: ArmorCategory }[];
}): ProficiencyResult {
  const { grants, warnings: resolverWarnings } = classProficiencyGrants(
    input.classes,
  );
  const armor = armorTrainingUnion(grants);
  const warnings: SheetWarning[] = [...resolverWarnings];

  const weapons = input.weapons.map((weapon) => {
    const verdict = weaponProficiency(weapon, grants);
    switch (verdict.kind) {
      case 'proficient':
        break;
      case 'category_not_stated':
        warnings.push({
          code: 'weapon_category_not_stated',
          message:
            `No simple/martial category is recorded for ${weapon.name}, so ` +
            'this sheet cannot say whether this character is proficient with ' +
            'it. Set it on the weapon to find out.',
        });
        break;
      case 'not_proficient':
        warnings.push({
          code: 'weapon_not_proficient',
          message:
            `${weapon.name} is a ${String(weapon.proficiency_category)} weapon, and no class ` +
            'this character has grants that. They may still carry and use it; ' +
            'they do not add their proficiency bonus to the attack.',
        });
        break;
      case 'qualifier_not_evaluated':
        warnings.push({
          code: 'weapon_proficiency_qualifier_unread',
          message:
            `${verdict.via.join(' and ')} grants ${String(weapon.proficiency_category)} weapons ` +
            `only "${verdict.qualifiers.join('", "')}", which this application ` +
            `does not evaluate. Decide at the table whether ${weapon.name} ` +
            'qualifies; the sheet has assumed it does not.',
        });
        break;
    }
    return { name: weapon.name, verdict };
  });

  // THE SENTENCE STOPS AT WHAT IS SOURCED, and that is a deliberate stopping
  // point rather than an oversight. The SRD's consequences for wearing armour
  // you lack training in — disadvantage on checks, saves and attacks, and no
  // spellcasting — are NOT in `docs/srd/source/`: the only "Disadvantage" in
  // `armor-table.txt` is the Stealth column of seven specific rows. So the
  // warning states the FACT (no class of theirs trains this) and stops, exactly
  // as `strength_requirement_unmet` beside it states a fact it enforces nowhere.
  // Reciting the penalty from memory is the one thing this application is built
  // not to do (F4), and D26 leaves the adjudication to the table anyway.
  for (const row of input.wornArmor) {
    if (!armor.has(row.category)) {
      warnings.push({
        code: 'armor_not_trained',
        message:
          `${row.name} is ${row.category === 'shield' ? 'a Shield' : `${row.category} armor`}, ` +
          'and no class this character has trains them in it. The Armor Class ' +
          'below still counts it — recording it is allowed — but training is ' +
          'a requirement the table will want to apply.',
      });
    }
  }

  return {
    grants,
    armor_training: armor,
    weapon_proficiencies: weaponProficiencyUnion(grants),
    weapons,
    warnings,
  };
}
