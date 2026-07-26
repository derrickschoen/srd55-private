import { describe, expect, it } from 'vitest';
import {
  bondedWeaponUnresolved,
  resolveAttacksPerAction,
  selectionUnresolved,
  type ExtraAttackGrant,
  type ExtraAttackGrantingClass,
} from '../../../src/rules/extra-attack';

/**
 * THE COMBINATION RULE, AGAINST THE CASES A NAIVE SUM GETS WRONG.
 *
 * Every expectation in this file was computed BY HAND from two printed
 * passages, and neither of them is a number this code produced:
 *
 *  - `docs/srd/source/attack-class-features.txt`: "If you gain the Extra Attack
 *    feature from more than one class, the features don't stack. You can't make
 *    more than two attacks with this feature unless you have a feature that
 *    says you can (such as the Fighter's Two Extra Attacks feature). Similarly,
 *    the Warlock's Thirsting Blade invocation, which grants you the Extra
 *    Attack feature with your pact weapon, doesn't give you additional attacks
 *    if you also have Extra Attack."
 *  - `docs/srd/source/extra-attack-other-sources.txt`, for the two named
 *    features and their scope.
 *
 * THE `.not.toBe(…)` LINES ARE THE POINT, NOT DECORATION. Each names the sum a
 * plausible implementation would have produced, so a regression to `+` fails
 * with the wrong answer visible beside the right one.
 */

const FIGHTER_GRANTS: readonly ExtraAttackGrant[] = [
  classGrant('Fighter', 5, 2),
  classGrant('Fighter', 11, 3),
  classGrant('Fighter', 20, 4),
];

function classGrant(
  className: string,
  classLevel: number,
  attackCount: number,
): ExtraAttackGrant {
  return {
    source: 'class',
    source_name: className,
    class_level: classLevel,
    attack_count: attackCount,
    weapon_scope: 'any_weapon',
    unresolved: [],
  };
}

function fighter(level: number): ExtraAttackGrantingClass {
  return { class_name: 'Fighter', level, extra_attack_grants: FIGHTER_GRANTS };
}

/** Any of the four classes whose table prints one Extra Attack row, at 5. */
function oneRowClass(
  className: string,
  level: number,
): ExtraAttackGrantingClass {
  return {
    class_name: className,
    level,
    extra_attack_grants: [classGrant(className, 5, 2)],
  };
}

/** A class with no Extra Attack row anywhere on its table. */
function wizard(level: number): ExtraAttackGrantingClass {
  return { class_name: 'Wizard', level };
}

/**
 * The homebrew Bard subclass of `tests/fixtures/homebrew-subclass.ts`, as the
 * lookup would hand it over: a SUBCLASS grant at class level 6, unscoped, and
 * fully resolved because the subclass is recorded on the character.
 */
function bardWithSubclassGrant(level: number): ExtraAttackGrantingClass {
  return {
    class_name: 'Bard',
    level,
    extra_attack_grants: [
      {
        source: 'subclass',
        source_name: 'Hammered Cadence',
        class_level: 6,
        attack_count: 2,
        weapon_scope: 'any_weapon',
        unresolved: [],
      },
    ],
  };
}

/**
 * A Warlock carrying the two bundled named features, exactly as
 * `SheetContentLookup` builds them: both unresolvable, and Thirsting Blade
 * unresolvable TWICE OVER — this application records neither the invocation nor
 * which weapon is the pact weapon.
 */
function warlock(level: number): ExtraAttackGrantingClass {
  return {
    class_name: 'Warlock',
    level,
    extra_attack_grants: [
      featureGrant('Thirsting Blade', 5, 2),
      featureGrant('Devouring Blade', 12, 3),
    ],
  };
}

function featureGrant(
  name: string,
  classLevel: number,
  attackCount: number,
): ExtraAttackGrant {
  return {
    source: 'feature',
    source_name: name,
    class_level: classLevel,
    attack_count: attackCount,
    weapon_scope: 'one_bonded_weapon',
    // ONLY THE SELECTION REASON, because that is all `namedFeatureGrants`
    // writes. The WEAPON reason is derived from `weapon_scope` by the
    // combinator itself, so a builder that restated it here would be describing
    // the same ignorance twice.
    unresolved: [
      selectionUnresolved(name, `Level ${String(classLevel)}+ Warlock`),
    ],
  };
}

/**
 * A weapon-scoped grant carrying NO reason of its own — the shape an importer,
 * a third builder or a hand-edited database image produces.
 *
 * THIS IS THE REGRESSION CASE, and it is a case only because the guard used to
 * be conventional. Nothing about this grant is unresolved except its own
 * `weapon_scope`, so a combinator that reads `unresolved` and nothing else
 * folds it into the character-wide count and puts three attacks on every weapon
 * the character holds.
 */
function unannotatedScopedGrant(
  source: ExtraAttackGrant['source'],
  name: string,
  classLevel: number,
  attackCount: number,
): ExtraAttackGrant {
  return {
    source,
    source_name: name,
    class_level: classLevel,
    attack_count: attackCount,
    weapon_scope: 'one_bonded_weapon',
    unresolved: [],
  };
}

function count(classes: readonly ExtraAttackGrantingClass[]): number {
  return resolveAttacksPerAction(classes).count;
}

function unresolvedNames(
  classes: readonly ExtraAttackGrantingClass[],
): string[] {
  return resolveAttacksPerAction(classes).unresolved.map(
    (grant) => grant.source_name,
  );
}

describe('the floor, and the per-class level filter', () => {
  it('gives one attack to a character with nothing that grants any', () => {
    expect(count([])).toBe(1);
    expect(count([wizard(20)])).toBe(1);
  });

  it('ignores a grant whose prerequisite level is not met', () => {
    expect(count([fighter(4)])).toBe(1);
    expect(count([fighter(5)])).toBe(2);
  });

  it('resolves a class to its highest grant at or below its own level', () => {
    // Absolute totals resolved `class_level <= ?`, so a Fighter 15 is on the
    // level 11 row and not the level 20 one.
    expect(count([fighter(10)])).toBe(2);
    expect(count([fighter(15)])).toBe(3);
    expect(count([fighter(20)])).toBe(4);
  });

  it('reads a subclass grant against the level in ITS OWN class', () => {
    // The distinction a character-level reading gets wrong. Bard 5 / Fighter 1
    // is CHARACTER level 6 and Bard level 5, so the level 6 subclass feature is
    // not theirs: ONE attack.
    expect(count([bardWithSubclassGrant(5), oneRowClass('Fighter', 1)])).toBe(1);
    // Bard 6 alone has it.
    expect(count([bardWithSubclassGrant(6)])).toBe(2);
  });
});

describe('grants do not stack — the multiclass cases a sum gets wrong', () => {
  it('Fighter 5 / Ranger 5 makes two attacks, not three', () => {
    const classes = [fighter(5), oneRowClass('Ranger', 5)];
    expect(count(classes)).toBe(2);
    expect(count(classes)).not.toBe(3);
  });

  it('four granting classes still make two attacks, not five', () => {
    const classes = [
      fighter(5),
      oneRowClass('Ranger', 5),
      oneRowClass('Paladin', 5),
      oneRowClass('Barbarian', 5),
    ];
    expect(count(classes)).toBe(2);
    expect(count(classes)).not.toBe(5);
  });

  it("lets the Fighter's own feature be the 'unless', at three and at four", () => {
    // "…unless you have a feature that says you can (such as the Fighter's Two
    // Extra Attacks feature)." Stored as an absolute 3, so `max` produces the
    // exception with no separate cap rule anywhere.
    expect(count([fighter(11), oneRowClass('Ranger', 5)])).toBe(3);
    expect(count([fighter(11), oneRowClass('Ranger', 5)])).not.toBe(5);
    const three = [fighter(20), oneRowClass('Ranger', 5), oneRowClass('Monk', 5)];
    expect(count(three)).toBe(4);
    expect(count(three)).not.toBe(8);
  });

  it('order of the classes cannot change the answer', () => {
    expect(count([oneRowClass('Ranger', 5), fighter(11)])).toBe(3);
    expect(count([fighter(11), oneRowClass('Ranger', 5)])).toBe(3);
  });

  it('does not stack a SUBCLASS grant with a class one either', () => {
    // The owner's case crossed with a Fighter. Two grants, one feature: two
    // attacks. A sum would give four.
    const classes = [bardWithSubclassGrant(6), fighter(5)];
    expect(count(classes)).toBe(2);
    expect(count(classes)).not.toBe(4);
  });
});

describe('a weapon-scoped grant this application cannot resolve', () => {
  it('never raises the character-wide number', () => {
    // Warlock 5 with Thirsting Blade. The number is ONE, because this
    // application records neither the invocation nor the pact weapon — and a
    // character-wide 2 would be wrong for the crossbow in their other hand.
    const classes = [warlock(5)];
    expect(count(classes)).toBe(1);
    expect(count(classes)).not.toBe(2);
  });

  it('is surfaced instead, with every reason it could not be applied', () => {
    const [grant, ...rest] = resolveAttacksPerAction([warlock(5)]).unresolved;
    expect(rest).toEqual([]);
    expect(grant?.source_name).toBe('Thirsting Blade');
    expect(grant?.source).toBe('feature');
    expect(grant?.attack_count).toBe(2);
    expect(grant?.class_name).toBe('Warlock');
    expect(grant?.at_class_level).toBe(5);
    // BOTH axes, not one: the feature is optional AND it reaches one weapon.
    expect(grant?.unresolved).toHaveLength(2);
    expect(grant?.unresolved.join(' ')).toContain(
      'does not record which optional class features',
    );
    expect(grant?.unresolved.join(' ')).toContain(
      'does not record which of a character’s weapons',
    );
  });

  it('drops a scoped grant that could not beat the number anyway', () => {
    // "…doesn't give you additional attacks if you also have Extra Attack."
    // Fighter 5 / Warlock 5: two attacks with every weapon already, and
    // Thirsting Blade's two adds nothing, so it is not worth a sentence.
    expect(count([fighter(5), warlock(5)])).toBe(2);
    expect(unresolvedNames([fighter(5), warlock(5)])).toEqual([]);
    // Fighter 11 / Warlock 5: three, and still nothing to say.
    expect(count([fighter(11), warlock(5)])).toBe(3);
    expect(unresolvedNames([fighter(11), warlock(5)])).toEqual([]);
  });

  it('reports an UPGRADE as a replacement rather than an addition', () => {
    // Warlock 12 holds Thirsting Blade AND Devouring Blade. BOTH are reported,
    // highest first, and neither is dropped in favour of the other: they carry
    // the same weapon SCOPE, and a scope is not a weapon — two features sharing
    // `one_bonded_weapon` need not share a weapon, so hiding the smaller would
    // be a guess about identity. What refuses to add them is the COUNT.
    expect(unresolvedNames([warlock(12)])).toEqual([
      'Devouring Blade',
      'Thirsting Blade',
    ]);
    expect(
      resolveAttacksPerAction([warlock(12)]).unresolved.map(
        (grant) => grant.attack_count,
      ),
    ).toEqual([3, 2]);
    // The upgrade is expressed as an absolute TOTAL of 3, so nothing anywhere
    // has to add 1 to 2 — and the applied count is still 1, because neither
    // grant could be applied at all.
    expect(count([warlock(12)])).toBe(1);
    expect(count([warlock(12)])).not.toBe(5);
  });

  it('is the case that proves ONE NUMBER CANNOT ANSWER', () => {
    // Fighter 5 / Warlock 12 with both invocations. Two attacks with any
    // weapon; three with the pact weapon. The unscoped maximum and the scoped
    // one differ, so no single number is right for both, and this is why the
    // count lives on the profile and the remainder is stated beside it.
    const classes = [fighter(5), warlock(12)];
    const result = resolveAttacksPerAction(classes);
    expect(result.count).toBe(2);
    expect(result.unresolved.map((grant) => grant.attack_count)).toEqual([3]);
    expect(result.unresolved[0]?.source_name).toBe('Devouring Blade');
    // Not the sum of anything.
    expect(result.count).not.toBe(5);
  });

  it('says nothing once the unscoped number has caught the scoped one', () => {
    // Fighter 11 / Warlock 12 with both: three attacks with EVERY weapon, and
    // the pact weapon's three is no longer worth mentioning.
    const result = resolveAttacksPerAction([fighter(11), warlock(12)]);
    expect(result.count).toBe(3);
    expect(result.unresolved).toEqual([]);
  });
});

describe('the weapon scope is what stops the grant, not a builder’s memory', () => {
  /**
   * A GRANT NO BUILDER ANNOTATED. Both builders in `SheetContentLookup` happen
   * to produce well-formed grants today, so every case above would still pass
   * if `weapon_scope` were inert and the sentences were the only guard. These
   * do not: they hand the combinator the field alone.
   */
  const bonded = (
    source: ExtraAttackGrant['source'],
    count: number,
  ): ExtraAttackGrantingClass => ({
    class_name: 'Bard',
    level: 6,
    extra_attack_grants: [
      unannotatedScopedGrant(source, 'Bound Refrain', 6, count),
    ],
  });

  it('never raises the count for a scoped grant with no reasons attached', () => {
    // ONE, not three. A scope this application cannot resolve is a scope it
    // cannot resolve however the grant reached it.
    expect(count([bonded('subclass', 3)])).toBe(1);
    expect(count([bonded('subclass', 3)])).not.toBe(3);
    expect(count([bonded('feature', 3)])).toBe(1);
    expect(count([bonded('class', 3)])).toBe(1);
  });

  it('surfaces it with the weapon reason the combinator derived', () => {
    const [grant, ...rest] = resolveAttacksPerAction([
      bonded('subclass', 3),
    ]).unresolved;
    expect(rest).toEqual([]);
    expect(grant?.source_name).toBe('Bound Refrain');
    expect(grant?.attack_count).toBe(3);
    // Derived from the field, so it is here even though the grant arrived bare.
    expect(grant?.unresolved).toEqual([bondedWeaponUnresolved('Bound Refrain')]);
  });

  it('does not annotate an unscoped grant, and still applies it', () => {
    // The control. `any_weapon` adds nothing, so the subclass fixture's own
    // grant resolves and raises the number exactly as before.
    const result = resolveAttacksPerAction([bardWithSubclassGrant(6)]);
    expect(result.count).toBe(2);
    expect(result.unresolved).toEqual([]);
  });

  it('states each reason once when the builder supplied the other one', () => {
    // Thirsting Blade: the SELECTION reason comes from the builder, the WEAPON
    // reason from the scope. Two sentences, no duplicate.
    const [grant] = resolveAttacksPerAction([warlock(5)]).unresolved;
    expect(grant?.unresolved).toEqual([
      selectionUnresolved('Thirsting Blade', 'Level 5+ Warlock'),
      bondedWeaponUnresolved('Thirsting Blade'),
    ]);
  });
});

describe('the two unresolved sentences', () => {
  it('name the feature and quote its own printed prerequisite', () => {
    expect(selectionUnresolved('Thirsting Blade', 'Level 5+ Warlock')).toContain(
      'Thirsting Blade',
    );
    expect(selectionUnresolved('Thirsting Blade', 'Level 5+ Warlock')).toContain(
      '“Level 5+ Warlock”',
    );
    expect(bondedWeaponUnresolved('Thirsting Blade')).toContain(
      'one bonded weapon only',
    );
  });

  it('carries no wordmark the licence asks to be left off', () => {
    const text = [
      selectionUnresolved('Thirsting Blade', 'Level 5+ Warlock, Pact of the Blade'),
      bondedWeaponUnresolved('Thirsting Blade'),
    ].join(' ');
    expect(text).not.toMatch(/D&D|Dungeons|Wizards/);
  });
});
