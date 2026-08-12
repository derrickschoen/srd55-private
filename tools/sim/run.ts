// CLI harness for sim.ts. Prints three tables: DAMAGE DEALT, SUPPORT /
// AMPLIFICATION, and their sum, per round.
//
// Statistical reporting (consensus F19):
//   - Every row ends with `±x.x`, the LARGEST 95% CI half-width
//     (1.96·σ/√N) across that row's cells. Differences smaller than two
//     rows' combined ± are noise, not signal.
//   - Every row re-seeds its own mulberry32(seed) stream, so all rows are on
//     common random numbers: row-to-row differences are paired, and a build
//     identical at some level to another produces identical cells.
//
// Run with: npx vite-node run.ts [N]   (N defaults to 2000.)

import {
  type CombatResult,
  type Level,
  type Rng,
  berserker,
  berserkerThrown,
  champion,
  championRanged,
  circleLand,
  devotion,
  devotionThrown,
  domination,
  draconic,
  evoker,
  fiend,
  fiendPatron,
  hunter,
  hunterRanged,
  lifeDomain,
  lore,
  loreCollege,
  monk,
  mulberry32,
  openHand,
  openHandThrown,
  sorcwiz,
  thief,
  thiefShortbow,
  veteran,
} from './sim';

type BuildFn = (rng: Rng, L: Level, nc: number) => CombatResult | null;

interface Row {
  name: string;
  fn: BuildFn;
  minLevel?: Level; // F22: declared instead of probing with a discarded combat
}

const SRD_ROWS: readonly Row[] = [
  { name: 'SRD Berserker — greatsword', fn: berserker },
  { name: 'SRD Berserker — thrown handaxes', fn: berserkerThrown },
  { name: 'SRD Champion — greatsword', fn: champion },
  { name: 'SRD Champion — shortbow', fn: championRanged },
  { name: 'SRD Open Hand — unarmed', fn: openHand },
  { name: 'SRD Open Hand — thrown handaxe', fn: openHandThrown },
  { name: 'SRD Thief — swords', fn: thief },
  { name: 'SRD Thief — shortbow', fn: thiefShortbow },
  { name: 'SRD Devotion — melee', fn: devotion },
  { name: 'SRD Devotion — thrown javelins', fn: devotionThrown },
  { name: 'SRD Hunter — TWF melee', fn: hunter },
  { name: 'SRD Hunter — longbow', fn: hunterRanged },
  { name: 'SRD Life — ranged spell posture', fn: lifeDomain },
  { name: 'SRD Land (Arid) — ranged spells', fn: circleLand },
  { name: 'SRD Evoker — ranged spells', fn: evoker },
  { name: 'SRD Draconic (Fire) — ranged spells', fn: draconic },
  { name: 'SRD Fiend — ranged spell attacks', fn: fiendPatron },
  { name: 'SRD Lore — caster posture', fn: loreCollege },
];

const LEVELS: readonly Level[] = [3, 6, 11, 17];

interface CellStat {
  mean: number;
  ci: number; // 95% half-width
}

function cell(
  f: BuildFn,
  rng: Rng,
  L: Level,
  nc: number,
  N: number,
  idx: 0 | 1,
): CellStat | null {
  const rounds = 4 * nc;
  let sum = 0;
  let sumsq = 0;
  for (let i = 0; i < N; i++) {
    const res = f(rng, L, nc);
    if (res === null) return null;
    const v = (idx === 0 ? res.dealt : res.prevented) / rounds;
    sum += v;
    sumsq += v * v;
  }
  const mean = sum / N;
  const variance = Math.max(0, sumsq / N - mean * mean);
  const ci = 1.96 * Math.sqrt(variance / N);
  return { mean, ci };
}

function fmtCell(v: CellStat | null): string {
  return v === null ? '    - ' : `${v.mean.toFixed(1).padStart(5)} `;
}

function showRow(row: Row, seed: number, N: number, idx: 0 | 1 = 0): void {
  // Fresh stream per row: common random numbers across rows (F19).
  let out = row.name.padEnd(44);
  let maxCi = 0;
  const emit = (L: Level, nc: number, n: number): void => {
    if (row.minLevel !== undefined && L < row.minLevel) {
      out += '    - ';
      return;
    }
    const rng = mulberry32(seed + L); // per-cell reseed keeps cells paired too
    const s = cell(row.fn, rng, L, nc, n, idx);
    out += fmtCell(s);
    if (s !== null) maxCi = Math.max(maxCi, s.ci);
  };
  for (const L of LEVELS) emit(L, 1, N);
  out += ' | day: ';
  for (const L of LEVELS) emit(L, 4, Math.max(1, Math.floor(N / 3)));
  out += ` ±${maxCi.toFixed(1)}`;
  console.log(out);
}

function showCombined(row: Row, seed: number, N: number): void {
  let out = row.name.padEnd(44);
  let maxCi = 0;
  const emit = (L: Level, nc: number, n: number): void => {
    const rng = mulberry32(seed + L);
    const rounds = 4 * nc;
    let sum = 0;
    let sumsq = 0;
    for (let i = 0; i < n; i++) {
      const res = row.fn(rng, L, nc);
      const v = res === null ? 0 : (res.dealt + res.prevented) / rounds;
      sum += v;
      sumsq += v * v;
    }
    const mean = sum / n;
    const variance = Math.max(0, sumsq / n - mean * mean);
    maxCi = Math.max(maxCi, 1.96 * Math.sqrt(variance / n));
    out += `${mean.toFixed(1).padStart(5)} `;
  };
  for (const L of LEVELS) emit(L, 1, N);
  out += ' | day: ';
  for (const L of LEVELS) emit(L, 4, Math.max(1, Math.floor(N / 3)));
  out += ` ±${maxCi.toFixed(1)}`;
  console.log(out);
}

function main(N: number, seed = 31): void {
  const hdr =
    ''.padEnd(44) + 'L3    L6    L11   L17    (burst | day)          max 95% CI';

  const dominationRow = (policy: 'smite' | 'mix' | 'adaptive' | 'control'): BuildFn => {
    return (r, L, nc) => domination(r, L, nc, policy);
  };

  console.log('=== DAMAGE DEALT per round ===');
  console.log(hdr);
  console.log('--- COMPLETE SRD 5.2.1 SUBCLASS BOARD ---');
  for (const row of SRD_ROWS) showRow(row, seed, N);
  console.log('--- HOMEBREW / LEGACY POLICY ROWS ---');
  showRow({ name: 'Domination Paladin (smite-only)', fn: dominationRow('smite') }, seed, N);
  showRow({ name: 'Domination Paladin (mix: Cmd rnd 2)', fn: dominationRow('mix') }, seed, N);
  showRow({ name: 'Domination Paladin (adaptive)', fn: dominationRow('adaptive') }, seed, N);
  showRow({ name: 'Domination Paladin (Command-max)', fn: dominationRow('control') }, seed, N);
  showRow({ name: 'Bladelock (greatsword, Hex)', fn: (r, L, nc) => fiend(r, L, nc, true) }, seed, N);
  showRow(
    { name: 'Bladelock (Darkness variant)', fn: (r, L, nc) => fiend(r, L, nc, true, true) },
    seed,
    N,
  );
  showRow({ name: 'VETERAN melee', fn: veteran }, seed, N);
  showRow({ name: 'BARBED COURT (fights-back env)', fn: monk }, seed, N);
  showRow({ name: 'BARBED COURT (init manifest @17)', fn: (r, L, nc) => monk(r, L, nc, true) }, seed, N);
  console.log('--- LEGACY ALTERNATE POSTURES ---');
  showRow({ name: 'Fiend EB/volley legacy policy', fn: fiend }, seed, N);
  showRow({ name: 'VETERAN ranged (hand crossbows)', fn: (r, L, nc) => veteran(r, L, nc, true) }, seed, N);
  console.log('--- LEGACY CASTER NOVA POSTURES ---');
  showRow({ name: 'Sorc3/Wiz8+ CME nova', fn: sorcwiz, minLevel: 11 }, seed, N);
  showRow({ name: 'Straight Lore Bard CME', fn: lore, minLevel: 11 }, seed, N);
  console.log();

  console.log('=== DAMAGE PREVENTED / SUPPORT / AMPLIFICATION per round (see sim.ts header) ===');
  console.log(hdr);
  for (const row of SRD_ROWS) showRow(row, seed, N, 1);
  console.log('--- HOMEBREW SUPPORT CHANNELS ---');
  showRow({ name: 'Domination Paladin (adaptive)', fn: dominationRow('adaptive') }, seed, N, 1);
  showRow({ name: 'Domination Paladin (Command-max)', fn: dominationRow('control') }, seed, N, 1);
  showRow({ name: 'BARBED COURT (Shield/Mirror/goad)', fn: monk }, seed, N, 1);
  showRow({ name: 'BARBED COURT (init manifest @17)', fn: (r, L, nc) => monk(r, L, nc, true) }, seed, N, 1);
  showRow({ name: 'VETERAN melee (Veteran Reflexes @13+)', fn: veteran }, seed, N, 1);
  console.log();

  console.log('=== DEALT + SUPPORT / AMPLIFICATION per round ===');
  console.log(hdr);
  for (const row of SRD_ROWS) {
    showCombined(
      row.name === 'SRD Lore — caster posture'
        ? { ...row, name: 'SRD Lore — caster posture †' }
        : row,
      seed,
      N,
    );
  }
  console.log('--- HOMEBREW CONTROL-INCLUSIVE ROWS ---');
  showCombined({ name: 'Domination (adaptive)', fn: dominationRow('adaptive') }, seed, N);
  showCombined({ name: 'Domination (Command-max)', fn: dominationRow('control') }, seed, N);
  console.log('† Lore CME burst and day cells are declared upper bounds: burst front-loads the largest remaining slots; day does not pay cross-combat CME recasts.');
}

const rawN = process.argv[2];
const n = rawN === undefined ? 2000 : Number.parseInt(rawN, 10);
if (!Number.isFinite(n) || n < 3) {
  throw new Error(`N must be an integer >= 3, got ${String(rawN)}`); // F20
}
main(n);
