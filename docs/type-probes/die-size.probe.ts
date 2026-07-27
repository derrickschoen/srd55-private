/**
 * A NEGATIVE PROBE: every statement in this file is EXPECTED TO FAIL TO
 * COMPILE, and `tests/unit/rules/die-sizes.test.ts` runs `tsc` over it and
 * asserts that each one does.
 *
 * WHY IT LIVES UNDER `docs/` AND NOT UNDER `tests/`. A file whose whole purpose
 * is to be rejected by the compiler cannot sit inside a compiled project — it
 * would break `npm run build` by design. `tsconfig.node.json` includes `db`,
 * `scripts`, `tests` and `tools`; `docs` is in neither project, so this file is
 * invisible to `tsc -b` and to `vite build`, and the ONLY thing that ever
 * compiles it is the test that expects it to fail. Excluding it from a tsconfig
 * instead would have been a config edit made to reach green.
 *
 * IT IS NOT DEAD CODE AND CANNOT ROT UNNOTICED: if any line here starts
 * compiling — because a die size was added, a parameter was widened back to
 * `number`, or a subset stopped being a subset — the test fails with the line
 * that no longer errors.
 */
import { fixedHitPointsPerLevel } from '../../src/rules/sheet';
import type {
  DieSize,
  HitDieSize,
  MartialArtsDieSize,
} from '../../src/domain/enums';
import type { DiceConfig } from '../../src/ui/screens/planner/dice';

/* --- fixedHitPointsPerLevel: F12's four wrong numbers, now four errors ----- */
/** F12 measured this returning 4.5 hit points per level. */
export const d7 = fixedHitPointsPerLevel(7);
/** F12 measured this returning 501.5. */
export const d1001 = fixedHitPointsPerLevel(1001);
/** A real die size, but not a HIT die: no class prints a d4. */
export const d4 = fixedHitPointsPerLevel(4);
/** A real die size, but not a HIT die: no class prints a d20. */
export const d20 = fixedHitPointsPerLevel(20);

/* --- the two subsets refuse the sizes their own sources never print ------- */
export const hitD4: HitDieSize = 4;
export const martialD4: MartialArtsDieSize = 4;
export const martialD20: MartialArtsDieSize = 20;

/* --- the vocabulary is the owner's list, no wider ------------------------- */
export const seven: DieSize = 7;
export const two: DieSize = 2;

/* --- the calculator's die-size field is not an integer range -------------- */
export const config: Pick<DiceConfig, 'basicDieSize'> = { basicDieSize: 7 };

/* --- a bare `number` off the disk is not a hit die until it is tested ----- */
declare const stored: number;
export const untested: HitDieSize = stored;

/* --- the SUBSET RELATION itself: a typo in either list ---------------------
 * These two mimic `hitDieSizes` / `martialArtsDieSizes` in
 * `src/domain/enums.ts`, which are declared `as const satisfies readonly
 * DieSize[]`. That clause is the only thing stating that the subsets ARE
 * subsets, so it is probed here rather than assumed. */
export const typo = [6, 8, 7, 12] as const satisfies readonly DieSize[];
export const wider = [6, 8, 3] as const satisfies readonly DieSize[];
