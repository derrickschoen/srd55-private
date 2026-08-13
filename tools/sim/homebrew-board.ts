import {
  type ChorusLevel,
  type HomebrewResult,
  type ValidationLevel,
  anchorPoint,
  brokenTempo,
  brokenTooth,
  coldOpen,
  cuttingChorus,
  cuttingMomentum,
  longGrudge,
  patientVolley,
  vanwardConclave,
  vanwardPatientStack,
} from './homebrew';
import { mulberry32, type Rng } from './sim';

interface Stat {
  mean: number;
  ci: number;
}

type AnyLevel = ValidationLevel | ChorusLevel;
type MeasureBuild<L extends AnyLevel = ValidationLevel> = (rng: Rng, level: L) => HomebrewResult;
type Metric = (result: HomebrewResult) => number;

export function measureHomebrew<L extends AnyLevel>(
  build: MeasureBuild<L>,
  level: L,
  trials: number,
  seed: number,
  metric: Metric,
): Stat {
  const rng = mulberry32(seed);
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < trials; i++) {
    const value = metric(build(rng, level));
    sum += value;
    sumSq += value * value;
  }
  const mean = sum / trials;
  const variance = Math.max(0, sumSq / trials - mean * mean);
  return { mean, ci: 1.96 * Math.sqrt(variance / trials) };
}

interface ValidationRow {
  name: string;
  build: MeasureBuild;
  claims: Readonly<Record<ValidationLevel, number>>;
  metric: Metric;
}

const perRound: Metric = (result) => result.dealt / 3;
const roundOne: Metric = (result) => result.trace.roundOneDamage;
const chorusNet: Metric = (result) => (result.dealt - result.trace.opportunityCost) / 3;

const ROWS: readonly ValidationRow[] = [
  {
    name: 'Long Grudge — rider DPR',
    build: longGrudge,
    claims: { 5: 3.3, 11: 4.3, 17: 5.2 },
    metric: perRound,
  },
  {
    name: 'Anchor Point — rider DPR',
    build: anchorPoint,
    claims: { 5: 3.9, 11: 3.9, 17: 7.9 },
    metric: perRound,
  },
  {
    name: 'Patient Volley — rider DPR',
    build: patientVolley,
    claims: { 5: 3.5, 11: 6.9, 17: 6.9 },
    metric: perRound,
  },
  {
    name: 'Cutting Chorus — net DPR proxy',
    build: cuttingChorus,
    claims: { 5: 3.5, 11: 1.6, 17: 1.0 },
    metric: chorusNet,
  },
  {
    name: 'Vanward — 3-round average',
    build: vanwardConclave,
    claims: { 5: 1.3, 11: 2.6, 17: 4.0 },
    metric: perRound,
  },
  {
    name: 'Vanward — round-1 nova',
    build: vanwardConclave,
    claims: { 5: 4.0, 11: 7.9, 17: 11.9 },
    metric: roundOne,
  },
  {
    name: 'Cold Open — round-1 nova',
    build: coldOpen,
    claims: { 5: 3.8, 11: 7.6, 17: 11.8 },
    metric: roundOne,
  },
  {
    name: 'Broken Tooth — total form DPR',
    build: brokenTooth,
    claims: { 5: 9.8, 11: 12.4, 17: 15.0 },
    metric: perRound,
  },
  {
    name: 'Cutting Momentum — package DPR',
    build: cuttingMomentum,
    claims: { 5: 1.8, 11: 1.8, 17: 3.0 },
    metric: perRound,
  },
  {
    name: 'Broken Tempo — maneuver DPR',
    build: brokenTempo,
    claims: { 5: 3.1, 11: 4.0, 17: 4.8 },
    metric: perRound,
  },
];

function comparison(claim: number, stat: Stat): string {
  const measured = Math.abs(stat.mean) < 0.05 ? 0 : stat.mean;
  const rawDelta = measured - claim;
  const delta = Math.abs(rawDelta) < 0.05 ? 0 : rawDelta;
  const sign = delta >= 0 ? '+' : '';
  return `${claim.toFixed(1)}→${measured.toFixed(1)} (${sign}${delta.toFixed(1)}, ±${stat.ci.toFixed(1)})`;
}

export function printHomebrewValidationBoard(trials: number, seed = 82026): void {
  const levels = [5, 11, 17] as const;
  console.log('=== HOMEBREW 3-ROUND CLAIMED → MEASURED (delta, 95% CI) ===');
  console.log(`${''.padEnd(40)}L5                         L11                        L17`);
  for (const [rowIndex, row] of ROWS.entries()) {
    let output = row.name.padEnd(40);
    for (const level of levels) {
      const stat = measureHomebrew(
        row.build,
        level,
        trials,
        seed + rowIndex * 100 + level,
        row.metric,
      );
      output += comparison(row.claims[level], stat).padEnd(27);
    }
    console.log(output);
  }

  console.log('--- EXPLICIT CLAIM DIAGNOSTICS ---');
  const fourAttack = measureHomebrew(
    (rng: Rng, level: ValidationLevel) =>
      anchorPoint(rng, level, { attacksPerTurn: 4 }),
    17,
    trials,
    seed + 9001,
    perRound,
  );
  console.log(`Anchor Point — four attacks, L17       ${comparison(8.9, fourAttack)}`);

  const stack = measureHomebrew(
    vanwardPatientStack,
    5,
    trials,
    seed + 9002,
    roundOne,
  );
  console.log(`Patient + Vanward — round-1 stack, L5  ${comparison(9.4, stack)}`);

  const chorusExtraAttack = measureHomebrew(
    cuttingChorus,
    6,
    trials,
    seed + 9003,
    (result) => result.trace.extraAttackDamage / 3,
  );
  console.log(`Cutting Chorus — Extra Attack, L6      ${comparison(4.9, chorusExtraAttack)}`);

  const chorusAccuracy = measureHomebrew(
    cuttingChorus,
    5,
    trials,
    seed + 9004,
    (result) => result.trace.accuracyDamage / result.trace.inspirationSpent,
  );
  console.log(`Cutting Chorus — accuracy per use, L5  ${comparison(1.5, chorusAccuracy)}`);

  const chorusPersonal = measureHomebrew(
    cuttingChorus,
    11,
    trials,
    seed + 9005,
    perRound,
  );
  console.log(
    `Cutting Chorus — personal DPR, L11     unclaimed→${chorusPersonal.mean.toFixed(1)} (±${chorusPersonal.ci.toFixed(1)})`,
  );
  console.log(
    'Cutting Chorus net uses the declared same-attack ally proxy; the design does not specify an ally attack for its opportunity-cost claim.',
  );
}
