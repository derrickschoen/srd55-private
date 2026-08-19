/**
 * SUPERVISOR REFUSAL PROBES — written independently of `review-findings.test.ts`
 * while verifying fix round 2, and kept because they cover cases that file does
 * not:
 *
 *  - a heading that is a SUBSTRING of a reviewed heading ('Critical') is refused;
 *  - a heading that genuinely occurs in the bundled document but is NOT in the
 *    reviewed vocabulary ('Spell Descriptions') is refused — proving the
 *    allowlist and the document check are BOTH load-bearing, not either/or;
 *  - the empty string, a non-string, and null are refused;
 *  - a REGISTERED effect citing a DIFFERENT registered effect's evidence
 *    (Fireball citing Acid Splash) is refused — cross-contamination between two
 *    valid manifest entries, distinct from citing an unregistered effect.
 *
 * Every refusal here is paired with a valid-case negative control, because a
 * validator that refuses everything is not a fix.
 */
import {
  bundledSrdSourceRef,
  reviewedSaveEffectStableKeys,
  saveSuccessOutcomeHasEvidence,
  criticalHitHasEvidence,
  publicProbabilityCoverageManifest,
  registerCharacterWeaponAttackClause,
} from '../../../src/simulation/coverage';
import {
  sourceStableKey,
  saveDifficultyClass,
  targetSaveBonus,
  targetArmorClass,
  attackRollModifier,
  positiveDiceCount,
  routineEventId,
  expandedCriticalMinimumRoll,
  type SourceRef,
} from '../../../src/simulation/contracts';
import type { CharacterWeaponId, ContentKey } from '../../../src/domain/ids';
import { foldSavingThrowEvent, foldAttackEvent } from '../../../src/simulation/probability';

import { it, expect } from 'vitest';
const failures: string[] = [];
const results: string[] = [];
const ok = (label: string, cond: boolean) => {
  results.push(`${cond ? 'PASS' : '*** FAIL ***'}  ${label}`);
  if (!cond) failures.push(label);
};
it('supervisor independent probe of simcore fix round 2', () => {
  run();
  console.log(results.join('\n'));
  expect(failures).toEqual([]);
});
function run() {

const src = (key: string): SourceRef => {
  const stableKey = sourceStableKey(key);
  return {
    kind: 'catalog_content',
    // This refusal probe deliberately crosses two distinct branded-ID types so
    // the malformed runtime value reaches the production validation path.
    content_key: stableKey as unknown as ContentKey,
    stable_key: stableKey,
  };
};

// ---------- F1: per-effect save clause ----------
const acidEvidence = bundledSrdSourceRef('Acid Splash');

const saveEvent = (
  stableKey: string,
  evidence: ReturnType<typeof bundledSrdSourceRef>,
): Parameters<typeof foldSavingThrowEvent>[0] =>
  ({
    kind: 'saving_throw_damage',
    event_id: routineEventId('e1'),
    source: src(stableKey),
    ability: 'dexterity',
    save_dc: saveDifficultyClass(15),
    roll_state: 'normal',
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    save_success_clause_id: 'srd-5.2.1:spell:acid-splash:save:damage',
    on_success: {
      kind: 'none',
      evidence,
    },
    damage_on_failed_save: [
      {
        source: src(stableKey),
        damage_type: 'Acid',
        components: [
          { kind: 'dice', pool: { count: positiveDiceCount(1), die: 6 } },
        ],
      },
    ],
  });

const target: Parameters<typeof foldSavingThrowEvent>[1] = {
  save_bonus: targetSaveBonus(0),
  damage_responses: [{ damage_type: 'Acid', response: 'normal' }],
};

// The exact attack codex claimed to have closed: an UNRELATED effect borrowing
// Acid Splash's citation. Must be unavailable, not a zero.
const borrowed = foldSavingThrowEvent(
  saveEvent('srd-5.2.1:spell:scorching-ray', acidEvidence),
  target,
);
ok('F1 unrelated effect borrowing Acid Splash citation is REFUSED', borrowed.status === 'unavailable');

// NEGATIVE CONTROL: the real Acid Splash must still be available.
const genuine = foldSavingThrowEvent(
  saveEvent('srd-5.2.1:spell:acid-splash', acidEvidence),
  target,
);
ok('F1 negative control: genuine Acid Splash still AVAILABLE', genuine.status === 'available');
ok(
  'F1 negative control: genuine Acid Splash is exactly 2.45 damage',
  genuine.status === 'available' && Math.abs(genuine.expected_damage - 2.45) < 1e-12,
);

// Isolate evidence identity: these two events have the same registered source,
// clause ID, save ability, success kind, and failed-save damage. Only the
// evidence citation differs.
const fireballEvidence = bundledSrdSourceRef('Fireball');
const fireballEvent = (
  evidence: ReturnType<typeof bundledSrdSourceRef>,
): Parameters<typeof foldSavingThrowEvent>[0] => ({
  kind: 'saving_throw_damage',
  event_id: routineEventId('fireball-evidence-probe'),
  source: src('srd-5.2.1:spell:fireball'),
  ability: 'dexterity',
  save_dc: saveDifficultyClass(15),
  roll_state: 'normal',
  frequency: { kind: 'each_declared_event' },
  duration: { kind: 'instantaneous' },
  save_success_clause_id: 'srd-5.2.1:spell:fireball:save:damage',
  on_success: { kind: 'half', evidence },
  damage_on_failed_save: [{
    source: src('srd-5.2.1:spell:fireball'),
    damage_type: 'Fire',
    components: [{
      kind: 'dice',
      pool: { count: positiveDiceCount(8), die: 6 },
    }],
  }],
});
const fireTarget: Parameters<typeof foldSavingThrowEvent>[1] = {
  save_bonus: targetSaveBonus(0),
  damage_responses: [{ damage_type: 'Fire', response: 'normal' }],
};
const genuineFireball = foldSavingThrowEvent(
  fireballEvent(fireballEvidence),
  fireTarget,
);
ok(
  'F1 evidence-isolation control: genuine Fireball evidence is AVAILABLE',
  genuineFireball.status === 'available',
);
const crossed = foldSavingThrowEvent(
  fireballEvent(acidEvidence),
  fireTarget,
);
ok(
  'F1 registered effect citing another effect evidence is REFUSED (evidence only)',
  crossed.status === 'unavailable',
);
const acidProofEvent = saveEvent(
  'srd-5.2.1:spell:acid-splash',
  acidEvidence,
);

ok(
  'F1 predicate: unregistered key rejected',
  !saveSuccessOutcomeHasEvidence(
    src('srd-5.2.1:spell:nope'),
    'srd-5.2.1:spell:acid-splash:save:damage',
    {
    kind: 'none',
    evidence: acidEvidence,
  },
    acidProofEvent.ability,
    acidProofEvent.damage_on_failed_save,
    acidProofEvent.duration,
    acidProofEvent.save_dc,
    acidProofEvent.frequency,
  ),
);
ok(
  'F1 predicate: registered key accepted',
  saveSuccessOutcomeHasEvidence(
    src(reviewedSaveEffectStableKeys.acid_splash),
    'srd-5.2.1:spell:acid-splash:save:damage',
    {
    kind: 'none',
    evidence: acidEvidence,
  },
    acidProofEvent.ability,
    acidProofEvent.damage_on_failed_save,
    acidProofEvent.duration,
    acidProofEvent.save_dc,
    acidProofEvent.frequency,
  ),
);

// ---------- F3: critical evidence ----------
const attackSource: SourceRef = {
  kind: 'character_weapon',
  weapon_id: 91 as CharacterWeaponId,
  stable_key: sourceStableKey('srd-5.2.1:weapon:dagger'),
};
const attackRegistration = registerCharacterWeaponAttackClause(attackSource);
const attackEvent = (evidence: unknown) =>
  ({
    kind: 'attack_roll',
    event_id: routineEventId('a1'),
    source: attackSource,
    ...attackRegistration,
    attack_bonus: attackRollModifier(0),
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    critical: { kind: 'natural_20', evidence },
    damage: [
      {
        source: attackSource,
        damage_type: 'piercing',
        components: [
          { kind: 'dice', pool: { count: positiveDiceCount(1), die: 6 }, trigger: 'hit' },
        ],
      },
    ],
  }) as never;

const atkTarget = {
  armor_class: targetArmorClass(0),
  roll_state: 'normal',
  damage_responses: [{ damage_type: 'piercing', response: 'normal' }],
} as never;

const wrongCrit = foldAttackEvent(attackEvent(bundledSrdSourceRef('Saving Throws')), atkTarget);
ok('F3 critical citing Saving Throws is REFUSED', wrongCrit.status === 'unavailable');

const rightCrit = foldAttackEvent(attackEvent(bundledSrdSourceRef('Critical Hits')), atkTarget);
ok('F3 negative control: Critical Hits evidence AVAILABLE', rightCrit.status === 'available');

ok('F3 predicate rejects wrong heading', !criticalHitHasEvidence(bundledSrdSourceRef('Immunity')));
ok('F3 predicate accepts right heading', criticalHitHasEvidence(publicProbabilityCoverageManifest.critical_hit));

// ---------- F4: heading must be reviewed AND in the document ----------
const throws = (h: unknown) => {
  try {
    bundledSrdSourceRef(h);
    return false;
  } catch {
    return true;
  }
};
ok('F4 nonexistent heading REFUSED', throws('This Heading Does Not Exist'));
ok('F4 empty string REFUSED', throws(''));
ok('F4 non-string REFUSED', throws(42));
ok('F4 null REFUSED', throws(null));
// In the document but NOT in the reviewed vocabulary -> must still refuse.
ok('F4 real-but-unreviewed heading REFUSED', throws('Spell Descriptions'));
// Substring of a reviewed heading must not sneak through.
ok('F4 substring of reviewed heading REFUSED', throws('Critical'));
ok('F4 negative control: reviewed heading ACCEPTED', !throws('Critical Hits'));
ok('F4 negative control: Order of Application ACCEPTED', !throws('Order of Application'));

// ---------- ROUND 3: expanded critical ranges (supervisor's own arithmetic) ----------
const critEvent = (crit: unknown) =>
  ({
    kind: 'attack_roll',
    event_id: routineEventId('a2'),
    source: attackSource,
    ...attackRegistration,
    attack_bonus: attackRollModifier(0),
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    critical: crit,
    damage: [
      {
        source: attackSource,
        damage_type: 'piercing',
        components: [
          { kind: 'dice', pool: { count: positiveDiceCount(1), die: 6 }, trigger: 'hit' },
        ],
      },
    ],
  }) as never;

const expanded = (min: number, heading: string) =>
  ({
    kind: 'expanded_range',
    minimum_roll: expandedCriticalMinimumRoll(min),
    evidence: bundledSrdSourceRef(heading),
  }) as never;

const r19 = foldAttackEvent(critEvent(expanded(19, 'Level 3: Improved Critical')), atkTarget);
ok('R3 19-20 available', r19.status === 'available');
ok(
  'R3 19-20 critical probability is exactly 2/20',
  r19.status === 'available' && Math.abs(r19.critical_probability - 0.1) < 1e-12,
);

const r18 = foldAttackEvent(critEvent(expanded(18, 'Level 15: Superior Critical')), atkTarget);
ok(
  'R3 18-20 critical probability is exactly 3/20',
  r18.status === 'available' && Math.abs(r18.critical_probability - 0.15) < 1e-12,
);

// An expanded range citing the GENERIC critical rule proves nothing about the range.
const rBadEvidence = foldAttackEvent(
  critEvent(expanded(19, 'Critical Hits')),
  atkTarget,
);
ok('R3 expanded range citing generic Critical Hits is REFUSED', rBadEvidence.status === 'unavailable');

// Citing the WRONG expanded rule for the range must also refuse.
const rMismatched = foldAttackEvent(
  critEvent(expanded(19, 'Level 15: Superior Critical')),
  atkTarget,
);
ok('R3 19 citing the 18-20 rule is REFUSED', rMismatched.status === 'unavailable');

const ctorThrows = (v: unknown) => {
  try { expandedCriticalMinimumRoll(v); return false; } catch { return true; }
};
ok('R3 minimum_roll 20 REFUSED (that is natural_20)', ctorThrows(20));
ok('R3 minimum_roll 1 REFUSED', ctorThrows(1));
ok('R3 minimum_roll 19 ACCEPTED', !ctorThrows(19));

}
