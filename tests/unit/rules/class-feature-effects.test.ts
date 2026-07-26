import { describe, expect, it } from 'vitest';
import {
  classFeatureEffect,
  classFeatureEffectKind,
} from '../../../src/rules/class-feature-effects';
import { classFeatureEffectKinds } from '../../../src/domain/enums';

/**
 * THE CONSUMER HALF OF THE CLOSED SET (D12's mechanism, D19's vocabulary).
 *
 * What is under test is not arithmetic — there is none — but the three answers
 * this module gives to a row, and the difference between them:
 *
 *  - a feature with no kind is FREE TEXT and has no effect. The common case.
 *  - a feature with a kind this build does not know has no effect EITHER, which
 *    is why the schema refuses one: this function cannot tell the two apart, so
 *    the database is where the distinction is enforced.
 *  - a feature with a kind and an incomplete payload has no effect, rather than
 *    a defaulted one. That refusal is the interesting behaviour: the plausible
 *    default for a missing scope is `any_weapon`, and it would widen a
 *    one-weapon grant to every weapon the character holds.
 */

const TEXT_ONLY = {
  effect_kind: null,
  effect_attack_count: null,
  effect_weapon_scope: null,
};

describe('reading a stored effect kind', () => {
  it('is null for a free-text feature', () => {
    expect(classFeatureEffectKind(TEXT_ONLY)).toBeNull();
  });

  it('is null for a value outside the closed set', () => {
    expect(
      classFeatureEffectKind({ ...TEXT_ONLY, effect_kind: 'extra_attacks' }),
    ).toBeNull();
    expect(
      classFeatureEffectKind({ ...TEXT_ONLY, effect_kind: 'hp_modifier' }),
    ).toBeNull();
    expect(classFeatureEffectKind({ ...TEXT_ONLY, effect_kind: '' })).toBeNull();
  });

  it('returns every member of the set the enum declares', () => {
    // Reads the enum rather than a retyped list, so a member added without a
    // branch in `classFeatureEffect` fails here as well as at compile time.
    for (const kind of classFeatureEffectKinds) {
      expect(classFeatureEffectKind({ ...TEXT_ONLY, effect_kind: kind })).toBe(
        kind,
      );
    }
  });
});

describe('resolving a feature to an effect', () => {
  it('gives a free-text feature no effect at all', () => {
    expect(classFeatureEffect(TEXT_ONLY)).toBeNull();
  });

  it('reads an extra_attack effect whole', () => {
    expect(
      classFeatureEffect({
        effect_kind: 'extra_attack',
        effect_attack_count: 3,
        effect_weapon_scope: 'one_bonded_weapon',
      }),
    ).toEqual({
      kind: 'extra_attack',
      attack_count: 3,
      weapon_scope: 'one_bonded_weapon',
    });
  });

  it('refuses to default a missing weapon scope to any_weapon', () => {
    // The row is unrepresentable in a database this application created — the
    // payload CHECK refuses it — so this is what happens to a hand-edited
    // image. No effect beats a grant silently widened to every weapon.
    expect(
      classFeatureEffect({
        effect_kind: 'extra_attack',
        effect_attack_count: 2,
        effect_weapon_scope: null,
      }),
    ).toBeNull();
  });

  it('refuses to default a missing attack count', () => {
    expect(
      classFeatureEffect({
        effect_kind: 'extra_attack',
        effect_attack_count: null,
        effect_weapon_scope: 'any_weapon',
      }),
    ).toBeNull();
  });

  it('refuses a weapon scope outside the closed set', () => {
    expect(
      classFeatureEffect({
        effect_kind: 'extra_attack',
        effect_attack_count: 2,
        effect_weapon_scope: 'pact_weapon',
      }),
    ).toBeNull();
  });

  it('gives an unrecognised kind no effect, which is why the schema refuses one', () => {
    expect(
      classFeatureEffect({
        effect_kind: 'granted_spells',
        effect_attack_count: 2,
        effect_weapon_scope: 'any_weapon',
      }),
    ).toBeNull();
  });
});
