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
} from '../../../src/simulation/coverage';
import {
  sourceStableKey,
  encounterRoundCount,
  saveDifficultyClass,
  targetSaveBonus,
  targetArmorClass,
  attackRollModifier,
  positiveDiceCount,
  routineEventId,
  expandedCriticalMinimumRoll,
} from '../../../src/simulation/contracts';
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

const src = (key: string) =>
  ({
    kind: 'character_source',
    source_instance_id: 1 as never,
    stable_key: sourceStableKey(key),
    rounds: encounterRoundCount(1),
    evidence: bundledSrdSourceRef('Saving Throws'),
  }) as never;

// ---------- F1: per-effect save clause ----------
const acidEvidence = bundledSrdSourceRef('Acid Splash');

const saveEvent = (stableKey: string, evidence: unknown) =>
  ({
    kind: 'saving_throw_damage',
    event_id: routineEventId('e1'),
    source: src(stableKey),
    save_dc: saveDifficultyClass(15),
    roll_state: 'normal',
    frequency: { kind: 'at_will' },
    duration: { kind: 'instantaneous' },
    on_success: { kind: 'none', evidence },
    damage_on_failed_save: [
      {
        source: src(stableKey),
        damage_type: 'fire',
        components: [
          { kind: 'dice', pool: { count: positiveDiceCount(1), die: 4 }, trigger: 'hit' },
        ],
      },
    ],
  }) as never;

const target = {
  save_bonus: targetSaveBonus(0),
  damage_responses: [{ damage_type: 'fire', response: 'normal' }],
} as never;

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

// A registered effect citing the WRONG registered evidence must still refuse.
const crossed = foldSavingThrowEvent(
  saveEvent('srd-5.2.1:spell:fireball', acidEvidence),
  target,
);
ok('F1 registered effect citing another effect evidence is REFUSED', crossed.status === 'unavailable');

ok(
  'F1 predicate: unregistered key rejected',
  !saveSuccessOutcomeHasEvidence(src('srd-5.2.1:spell:nope'), {
    kind: 'none',
    evidence: acidEvidence,
  } as never),
);
ok(
  'F1 predicate: registered key accepted',
  saveSuccessOutcomeHasEvidence(src(reviewedSaveEffectStableKeys.acid_splash), {
    kind: 'none',
    evidence: acidEvidence,
  } as never),
);

// ---------- F3: critical evidence ----------
const attackEvent = (evidence: unknown) =>
  ({
    kind: 'attack_roll',
    event_id: routineEventId('a1'),
    source: src('srd-5.2.1:weapon:dagger'),
    attack_bonus: attackRollModifier(0),
    frequency: { kind: 'at_will' },
    duration: { kind: 'instantaneous' },
    critical: { kind: 'natural_20', evidence },
    damage: [
      {
        source: src('srd-5.2.1:weapon:dagger'),
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
    source: src('srd-5.2.1:weapon:greatsword'),
    attack_bonus: attackRollModifier(0),
    frequency: { kind: 'at_will' },
    duration: { kind: 'instantaneous' },
    critical: crit,
    damage: [
      {
        source: src('srd-5.2.1:weapon:greatsword'),
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
