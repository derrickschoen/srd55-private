// Three-round validation harness for the reviewer-cleared homebrew set dated
// 2026-08-12. This is deliberately separate from sim.ts's four-round,
// level-3/6/11/17 SRD board: the design document fixes levels 5/11/17 and an
// attack distribution of 60% normal hit, 5% critical hit, and 35% miss.

import type { CombatResult, Rng } from './sim';

export type ValidationLevel = 5 | 11 | 17;
export type ChorusLevel = ValidationLevel | 6;

export interface HomebrewTrace {
  triggers: number;
  criticalTriggers: number;
  speedZeroTurns: number;
  reactionLockedTurns: number;
  inspirationSpent: number;
  opportunityCost: number;
  extraAttackDamage: number;
  accuracyDamage: number;
  tempHp: number;
  poolRemaining: number;
  secondWindRegains: number;
  criticalRegains: number;
  roundOneDamage: number;
  bondTargetId: number | null;
  bondRoundsRemaining: number;
  patientEligibleTurns: number;
  extraAttackActive: boolean;
  shapeActive: boolean;
  attackModifier: number;
}

export interface HomebrewResult extends CombatResult {
  trace: HomebrewTrace;
}

export type HomebrewBuild = (rng: Rng, level: ValidationLevel) => HomebrewResult;

interface AttackOutcome {
  roll: number;
  hit: boolean;
  critical: boolean;
}

function emptyTrace(): HomebrewTrace {
  return {
    triggers: 0,
    criticalTriggers: 0,
    speedZeroTurns: 0,
    reactionLockedTurns: 0,
    inspirationSpent: 0,
    opportunityCost: 0,
    extraAttackDamage: 0,
    accuracyDamage: 0,
    tempHp: 0,
    poolRemaining: 0,
    secondWindRegains: 0,
    criticalRegains: 0,
    roundOneDamage: 0,
    bondTargetId: null,
    bondRoundsRemaining: 0,
    patientEligibleTurns: 0,
    extraAttackActive: false,
    shapeActive: false,
    attackModifier: 0,
  };
}

function randInt(rng: Rng, sides: number): number {
  return Math.floor(rng() * sides) + 1;
}

function dice(rng: Rng, count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) total += randInt(rng, sides);
  return total;
}

/** A raw d20 with the design's fixed 65% hit rate: 8-19 hit, 20 crits. */
function attack(rng: Rng, criticalFloor = 20, advantage = false): AttackOutcome {
  const first = randInt(rng, 20);
  const roll = advantage ? Math.max(first, randInt(rng, 20)) : first;
  return {
    roll,
    hit: roll >= 8,
    critical: roll >= criticalFloor,
  };
}

function attacksForFighter(level: ValidationLevel): number {
  // SRD 5.2.1 Fighter: Extra Attack at 5, Two Extra Attacks at 11. The fourth
  // attack is level 20, not level 17; the board separately validates the
  // design document's four-attack aside.
  return level === 5 ? 2 : 3;
}

function riderDamage(rng: Rng, count: number, sides: number, critical: boolean): number {
  return dice(rng, count * (critical ? 2 : 1), sides);
}

/** Oath of the Long Grudge: two-attack paladin, bond rider contribution only. */
export function longGrudge(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const sides = level === 5 ? 6 : level === 11 ? 8 : 10;
  const targetId = 1;
  const bond = { targetId, roundsRemaining: 10 };
  trace.bondTargetId = bond.targetId;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    let used = false;
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng);
      if (bond.roundsRemaining > 0 && bond.targetId === targetId && !used && outcome.hit) {
        used = true;
        trace.triggers++;
        if (outcome.critical) trace.criticalTriggers++;
        dealt += riderDamage(rng, 1, sides, outcome.critical);
      }
    }
    bond.roundsRemaining--;
  }
  trace.bondRoundsRemaining = bond.roundsRemaining;
  return { dealt, prevented: 0, trace };
}

export interface AnchorOptions {
  attacksPerTurn?: number;
}

/** Anchor Point on a greatsword Fighter; only the feat's marginal damage is scored. */
export function anchorPoint(
  rng: Rng,
  level: ValidationLevel,
  options: AnchorOptions = {},
): HomebrewResult {
  const trace = emptyTrace();
  const attacksPerTurn = options.attacksPerTurn ?? attacksForFighter(level);
  const riderDice = level === 17 ? 2 : 1;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    let used = false;
    let speedZero = false;
    let reactionsLocked = false;
    for (let i = 0; i < attacksPerTurn; i++) {
      const outcome = attack(rng);
      if (!used && outcome.hit) {
        used = true;
        speedZero = true;
        reactionsLocked = true;
        trace.triggers++;
        if (outcome.critical) trace.criticalTriggers++;
        dealt += riderDamage(rng, riderDice, 8, outcome.critical);
      }
    }
    if (speedZero) trace.speedZeroTurns++;
    if (reactionsLocked) trace.reactionLockedTurns++;
  }
  return { dealt, prevented: 0, trace };
}

/** Patient Volley on a two-attack longbow Ranger; rider contribution only. */
export function patientVolley(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const riderDice = level === 5 ? 1 : 2;
  let dealt = 0;
  let hitLastTurn = false;
  for (let round = 0; round < 3; round++) {
    const targetHasNotActed = round === 0;
    const eligible = hitLastTurn || targetHasNotActed;
    if (eligible) trace.patientEligibleTurns++;
    let hitThisTurn = false;
    let used = false;
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng);
      hitThisTurn ||= outcome.hit;
      if (eligible && !used && outcome.hit) {
        used = true;
        trace.triggers++;
        if (outcome.critical) trace.criticalTriggers++;
        dealt += riderDamage(rng, riderDice, 8, outcome.critical);
      }
    }
    hitLastTurn = hitThisTurn;
  }
  return { dealt, prevented: 0, trace };
}

interface BoostedAttack {
  baseHit: boolean;
  boostedHit: boolean;
  critical: boolean;
  damage: number;
}

function boostedRapierAttack(rng: Rng, inspirationSides: number): BoostedAttack {
  // The homebrew die is rolled before the attack roll, as specified. A
  // natural 1 remains a miss; only a natural 20 is a critical hit.
  const inspiration = randInt(rng, inspirationSides);
  const roll = randInt(rng, 20);
  const baseHit = roll >= 8;
  const boostedHit = roll !== 1 && roll + inspiration >= 8;
  const critical = roll === 20;
  const damage = boostedHit ? dice(rng, critical ? 2 : 1, 8) + 3 : 0;
  return { baseHit, boostedHit, critical, damage };
}

function unboostedRapierAttack(rng: Rng): BoostedAttack {
  const outcome = attack(rng);
  const damage = outcome.hit ? dice(rng, outcome.critical ? 2 : 1, 8) + 3 : 0;
  return {
    baseHit: outcome.hit,
    boostedHit: outcome.hit,
    critical: outcome.critical,
    damage,
  };
}

function foregoneSameAttackBoost(rng: Rng, inspirationSides: number): number {
  const attackResult = boostedRapierAttack(rng, inspirationSides);
  return attackResult.boostedHit && !attackResult.baseHit ? attackResult.damage : 0;
}

/**
 * College of the Cutting Chorus on a rapier Bard.
 *
 * `dealt` is personal marginal damage versus a one-attack rapier Bard. The
 * opportunity-cost trace is a declared proxy: every self-use displaces the
 * same pre-roll die on an otherwise identical 65%-hit, 1d8+3 ally attack.
 * The report subtracts that trace for its claimed-net comparison.
 */
export function cuttingChorus(rng: Rng, level: ChorusLevel): HomebrewResult {
  const trace = emptyTrace();
  const inspirationSides = level <= 6 ? 8 : level === 11 ? 10 : 12;
  const poolCap = level <= 6 ? 4 : 5;
  const usesPerTurn = level >= 11 ? 2 : 1;
  const attacksPerTurn = level >= 6 ? 2 : 1;
  trace.extraAttackActive = attacksPerTurn === 2;
  let pool = poolCap;
  let dealt = 0;

  // Font of Inspiration can turn spell slots into further uses, but the
  // design gives no spell-slot opportunity cost. This validation therefore
  // uses only the native Charisma-sized pool: five dice means the sixth
  // possible L11/L17 self-use is unavailable in a three-round fight.

  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < attacksPerTurn; i++) {
      const use = i < usesPerTurn && pool > 0;
      const result = use
        ? boostedRapierAttack(rng, inspirationSides)
        : unboostedRapierAttack(rng);
      if (use) {
        pool--;
        trace.inspirationSpent++;
        trace.opportunityCost += foregoneSameAttackBoost(rng, inspirationSides);
      }

      if (i === 1) {
        // The second attack does not exist on the comparison Bard. Its
        // unboosted outcome is the Extra Attack contribution; any conversion
        // from self-inspiration is accounted separately below.
        if (result.baseHit) trace.extraAttackDamage += result.damage;
      }
      if (use && result.boostedHit && !result.baseHit) {
        trace.accuracyDamage += result.damage;
      }
    }
  }
  dealt = trace.extraAttackDamage + trace.accuracyDamage;
  trace.poolRemaining = pool;
  return { dealt, prevented: 0, trace };
}

interface AmbushState {
  spent: boolean;
}

function applyAmbushPrimitive(
  rng: Rng,
  state: AmbushState,
  firstTurn: boolean,
  targetHasNotActed: boolean,
  outcome: AttackOutcome,
  count: number,
  sides: number,
  trace: HomebrewTrace,
): number {
  if (state.spent || !firstTurn || !targetHasNotActed || !outcome.hit) return 0;
  state.spent = true;
  trace.triggers++;
  if (outcome.critical) trace.criticalTriggers++;
  return riderDamage(rng, count, sides, outcome.critical);
}

/** Vanward Conclave: Ambush Primitive on a two-attack longbow Ranger. */
export function vanwardConclave(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const state: AmbushState = { spent: false };
  const count = level === 5 ? 1 : level === 11 ? 2 : 3;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng);
      const added = applyAmbushPrimitive(
        rng,
        state,
        round === 0,
        round === 0,
        outcome,
        count,
        8,
        trace,
      );
      dealt += added;
      if (round === 0) trace.roundOneDamage += added;
    }
  }
  return { dealt, prevented: 0, trace };
}

/** Cold Open: Ambush Primitive on a Steady-Aim/Vex dual-light-weapon Rogue. */
export function coldOpen(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const state: AmbushState = { spent: false };
  const count = level === 5 ? 1 : level === 11 ? 2 : 3;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    let vex = false;
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng, 20, i === 0 || vex);
      const added = applyAmbushPrimitive(
        rng,
        state,
        round === 0,
        round === 0,
        outcome,
        count,
        6,
        trace,
      );
      dealt += added;
      if (round === 0) trace.roundOneDamage += added;
      vex = outcome.hit;
    }
  }
  return { dealt, prevented: 0, trace };
}

/** The explicitly declared L5 Patient Volley + Vanward stack on one Ranger. */
export function vanwardPatientStack(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const ambush: AmbushState = { spent: false };
  const patientDice = level === 5 ? 1 : 2;
  const ambushDice = level === 5 ? 1 : level === 11 ? 2 : 3;
  let hitLastTurn = false;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    const eligible = round === 0 || hitLastTurn;
    let hitThisTurn = false;
    let patientSpent = false;
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng);
      hitThisTurn ||= outcome.hit;
      let added = 0;
      if (eligible && !patientSpent && outcome.hit) {
        patientSpent = true;
        added += riderDamage(rng, patientDice, 8, outcome.critical);
      }
      added += applyAmbushPrimitive(
        rng,
        ambush,
        round === 0,
        round === 0,
        outcome,
        ambushDice,
        8,
        trace,
      );
      dealt += added;
      if (round === 0) trace.roundOneDamage += added;
    }
    hitLastTurn = hitThisTurn;
  }
  return { dealt, prevented: 0, trace };
}

/** Circle of the Broken Tooth: total Wild Shape natural-weapon DPR. */
export function brokenTooth(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const sides = level === 5 ? 8 : level === 11 ? 10 : 12;
  const wisdom = level === 5 ? 3 : level === 11 ? 4 : 5;
  const proficiency = level === 5 ? 3 : level === 11 ? 4 : 6;
  trace.shapeActive = true;
  trace.attackModifier = proficiency + wisdom;
  trace.tempHp = level;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 2; i++) {
      const outcome = attack(rng);
      if (outcome.hit) {
        dealt += dice(rng, outcome.critical ? 2 : 1, sides) + wisdom;
      }
    }
  }
  return { dealt, prevented: 0, trace };
}

/** Cutting Momentum on a greatsword Fighter; marginal package damage only. */
export function cuttingMomentum(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const flat = level >= 13 ? 3 : 2;
  let dealt = 0;
  for (let round = 0; round < 3; round++) {
    let firstHit = true;
    let criticalFloor = 20;
    for (let i = 0; i < attacksForFighter(level); i++) {
      const outcome = attack(rng, criticalFloor);
      if (!outcome.hit) continue;
      if (firstHit) {
        firstHit = false;
        trace.triggers++;
        dealt += flat;
        if (outcome.critical) {
          trace.criticalTriggers++;
          criticalFloor = Math.max(15, criticalFloor - 2);
        }
      } else if (outcome.critical && outcome.roll < 20) {
        // Only the extra greatsword weapon dice caused by the expanded range
        // are marginal damage. Ordinary natural-20 critical damage belongs to
        // the chassis and is intentionally excluded.
        dealt += dice(rng, 2, 6);
      }
    }
  }
  return { dealt, prevented: 0, trace };
}

/** Discipline of the Broken Tempo on a greatsword Fighter; maneuver dice only. */
export function brokenTempo(rng: Rng, level: ValidationLevel): HomebrewResult {
  const trace = emptyTrace();
  const poolCap = level === 5 ? 3 : level === 11 ? 4 : 6;
  const sides = level === 5 ? 6 : level === 11 ? 8 : 10;
  let pool = poolCap;
  let criticalRegainAvailable = true;
  let dealt = 0;

  for (let round = 0; round < 3; round++) {
    let spentThisTurn = false;
    for (let i = 0; i < attacksForFighter(level); i++) {
      const outcome = attack(rng);
      if (!outcome.hit) continue;
      if (!spentThisTurn && pool > 0) {
        spentThisTurn = true;
        pool--;
        trace.triggers++;
        if (outcome.critical) trace.criticalTriggers++;
        dealt += riderDamage(rng, 1, sides, outcome.critical);
      }
      if (outcome.critical && criticalRegainAvailable && pool < poolCap) {
        criticalRegainAvailable = false;
        pool++;
        trace.criticalRegains++;
      }
    }
    if (round === 0 && pool < poolCap) {
      // Declared policy: use Second Wind after turn 1. Its healing is outside
      // this damage-only validation; only the one-die regain is relevant.
      pool++;
      trace.secondWindRegains++;
    }
  }
  trace.poolRemaining = pool;
  return { dealt, prevented: 0, trace };
}

export const HOMEBREW_BUILDS: ReadonlyArray<readonly [string, HomebrewBuild]> = [
  ['Oath of the Long Grudge', longGrudge],
  ['Anchor Point', anchorPoint],
  ['Patient Volley', patientVolley],
  ['College of the Cutting Chorus', cuttingChorus],
  ['Vanward Conclave', vanwardConclave],
  ['Cold Open', coldOpen],
  ['Circle of the Broken Tooth', brokenTooth],
  ['Cutting Momentum', cuttingMomentum],
  ['Discipline of the Broken Tempo', brokenTempo],
];
