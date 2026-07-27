/**
 * THE DIE VOCABULARY AND ITS TWO SOURCED SUBSETS.
 *
 * Three kinds of assertion live here and they prove different things:
 *
 *  1. THE SETS AGREE WITH THE SRD EXTRACTS. Checked against the bundled source
 *     text, not against our own parse output — the raw file is read here and
 *     searched directly, so a change to the parser cannot make these pass.
 *  2. THE RUNTIME PREDICATES REFUSE WHAT THE TYPES REFUSE. `isHitDieSize` and
 *     friends are the only way a `number` off the disk becomes a die size, so
 *     they are the boundary and are tested as one.
 *  3. THE TYPE ITSELF REFUSES A WRONG PROGRAM. `docs/type-probes/die-size.probe.ts`
 *     is a file of statements that must NOT compile; the last test runs `tsc`
 *     over it and fails if any of them starts compiling. That is the claim D25
 *     actually makes — a wrong program fails to COMPILE rather than producing a
 *     plausible number — and a test asserting a thrown error would not have
 *     proved it.
 */
import { execFileSync } from 'node:child_process';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import coreTraitsExtract from '../../../docs/srd/source/class-core-traits.txt?raw';
import attackFeaturesExtract from '../../../docs/srd/source/attack-class-features.txt?raw';
import {
  dieSizes,
  hitDieSizes,
  isDieSize,
  isHitDieSize,
  isMartialArtsDieSize,
  martialArtsDieSizes,
  type DieSize,
} from '../../../src/domain/enums';
import {
  parseSrdClassTraits,
  parseSrdMartialArtsDice,
} from '../../../src/rules/class-traits-srd';

const PROJECT_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const PROBE = 'docs/type-probes/die-size.probe.ts';

describe('the die vocabulary', () => {
  /**
   * The owner's words, transcribed by hand and not read back from the module:
   * "Do we have an enum for dice type? We only should have 4,6,8,10,12,20,100."
   *
   * NO SRD FILE CAN CLOSE THIS SET — `docs/srd/source/` prints the dice that
   * particular rules use, never the vocabulary — so the owner's sentence IS the
   * oracle, and this is the one list here with no citation because there is
   * none to give.
   */
  it('is exactly the seven sizes the owner named', () => {
    expect([...dieSizes]).toEqual([4, 6, 8, 10, 12, 20, 100]);
  });

  it('admits its own members and nothing between or beyond them', () => {
    for (const size of dieSizes) {
      expect(isDieSize(size), `d${String(size)}`).toBe(true);
    }
    // d2 and d3 are real dice the owner left out; 7 and 13 are not dice at all;
    // 0 and the non-integers are what a mis-parse or a hand-edited document
    // produces.
    for (const rejected of [0, 1, 2, 3, 5, 7, 13, 99, 101, -8, 8.5, Number.NaN, Infinity]) {
      expect(isDieSize(rejected), String(rejected)).toBe(false);
    }
  });

  it('contains both sourced subsets', () => {
    for (const die of hitDieSizes) {
      expect(isDieSize(die), `hit die d${String(die)}`).toBe(true);
    }
    for (const die of martialArtsDieSizes) {
      expect(isDieSize(die), `martial arts d${String(die)}`).toBe(true);
    }
  });

  /**
   * TWO LISTS, NOT ONE, AND THIS TEST IS WHERE THAT IS RECORDED.
   *
   * Their members are equal today and their SUBJECTS are not: one is a class's
   * Hit Point Die, the other one class feature's per-level die, and they are
   * sourced from two different tables. F12 was right that merging them would
   * widen a constraint to match a different constraint's subject; it was wrong
   * only about which of the two carried the unsourced value.
   */
  it('keeps the hit die and the Martial Arts die as separate declarations', () => {
    expect(hitDieSizes).not.toBe(martialArtsDieSizes);
    expect([...hitDieSizes]).toEqual([...martialArtsDieSizes]);
  });
});

describe('the hit die subset', () => {
  /**
   * The oracle is the extract, transcribed here by hand from the twelve Core
   * Traits blocks: `class-core-traits.txt` L21 D12; L125, L176, L202 D10; L46,
   * L72, L99, L151, L229, L279 D8; L255, L306 D6.
   */
  it('is exactly the four sizes the twelve Core Traits rows print', () => {
    expect([...hitDieSizes]).toEqual([6, 8, 10, 12]);
    const printed = new Set(
      [...coreTraitsExtract.matchAll(/Hit Point Die\s+D(?<size>\d+) per/gu)].map(
        (match) => Number(match.groups?.size),
      ),
    );
    expect([...printed].sort((a, b) => a - b)).toEqual([...hitDieSizes]);
  });

  /**
   * NO WIDER AND NO NARROWER. Every declared member is used by some class, so a
   * size could not be added here "just in case"; and the parse cannot yield one
   * that is not declared, because `hitDie` throws.
   */
  it('has no member the twelve classes never use', () => {
    const parsed = new Set(parseSrdClassTraits().map((entry) => entry.hit_die));
    expect([...parsed].sort((a, b) => a - b)).toEqual([...hitDieSizes]);
  });

  it('refuses the d4 and d20 that are dice but are not hit dice', () => {
    expect(isHitDieSize(4)).toBe(false);
    expect(isHitDieSize(20)).toBe(false);
    expect(isHitDieSize(100)).toBe(false);
    expect(isHitDieSize(7)).toBe(false);
    for (const die of hitDieSizes) {
      expect(isHitDieSize(die), `d${String(die)}`).toBe(true);
    }
  });
});

describe('the Martial Arts die subset', () => {
  /**
   * THE ASSERTION THAT PINS THE REMOVAL, AND ITS ORACLE IS THE RAW FILE.
   *
   * `class_martial_arts_dice.martial_arts_die` and the parse guard both admitted
   * a `4` until this change. Nothing pinned it in either direction — the mirror
   * case for `hit_die` WAS pinned (`schema-check-constraints.test.ts`, "a d4 hit
   * die") — so the unsourced value could have been frozen into the type system
   * on the grounds that F12 called the two CHECKs a legitimate distinction.
   *
   * The extract is searched here as TEXT rather than through
   * `parseSrdMartialArtsDice`, deliberately: the parser now REJECTS a 1d4, so
   * asking it whether the source contains one would be asking our own guard
   * about itself.
   */
  it('excludes the d4, because the extract contains no 1d4 at all', () => {
    expect(attackFeaturesExtract).not.toContain('1d4');
    expect(martialArtsDieSizes).not.toContain(4);
    expect(isMartialArtsDieSize(4)).toBe(false);
  });

  /**
   * The twenty rows at `attack-class-features.txt:15-35`: 1d6 at levels 1-4,
   * 1d8 at 5-10, 1d10 at 11-16, 1d12 at 17-20 — four, six, six and four rows.
   * Transcribed from the printed table, then compared with the parse.
   */
  it('is exactly the four sizes the twenty printed rows use', () => {
    expect([...martialArtsDieSizes]).toEqual([6, 8, 10, 12]);
    const parsed = parseSrdMartialArtsDice();
    expect(parsed.size).toBe(20);
    const counts = new Map<number, number>();
    for (const die of parsed.values()) {
      counts.set(die, (counts.get(die) ?? 0) + 1);
    }
    expect([...counts.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [6, 4],
      [8, 6],
      [10, 6],
      [12, 4],
    ]);
  });

  it('refuses a d20, which is a die and is not this feature’s die', () => {
    expect(isMartialArtsDieSize(20)).toBe(false);
    expect(isMartialArtsDieSize(100)).toBe(false);
    for (const die of martialArtsDieSizes) {
      expect(isMartialArtsDieSize(die), `d${String(die)}`).toBe(true);
    }
  });
});

/**
 * THE COMPILE-TIME PROOF.
 *
 * Runs `tsc` over a file whose every statement is meant to be rejected, and
 * requires an error on each one. It is not a substitute for the suite's own
 * `tsc -b`: that proves the code we ship compiles, and this proves the code we
 * must never ship does not.
 *
 * The compiler options mirror `tsconfig.app.json`. They are passed on the
 * command line rather than by `-p` because the probe is deliberately outside
 * every project in `tsconfig.json` — see the probe's own header for why.
 */
describe('the type refuses a wrong die size at compile time', () => {
  /**
   * The 60-second budget is for a COLD compiler under a fully parallel suite,
   * not for the work: this compiles two files with `skipLibCheck` and takes
   * about a second on its own. It is passed as `it`'s third argument rather
   * than raised globally, so no other test's budget moves.
   */
  it('rejects every statement in the probe, one error each', () => {
    const source = readFileSync(`${PROJECT_ROOT}${PROBE}`, 'utf8');
    const expectedLines = source
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter((entry) => /^export const \w+/u.test(entry.line))
      .map((entry) => entry.number);
    // The probe is not empty, and nobody has quietly commented it out.
    expect(expectedLines.length).toBeGreaterThanOrEqual(13);

    let output = '';
    let diagnostics = '';
    try {
      // The compiler is invoked through `node` on the resolved binary rather
      // than through `npx`, which spends longer resolving the package than the
      // compile itself takes.
      execFileSync(
        execPath,
        [
          fileURLToPath(new URL('../../../node_modules/typescript/bin/tsc', import.meta.url)),
          '--noEmit',
          '--strict',
          '--target',
          'ES2022',
          '--lib',
          'ES2022,DOM,WebWorker',
          '--module',
          'ESNext',
          '--moduleResolution',
          'Bundler',
          '--skipLibCheck',
          '--noUncheckedIndexedAccess',
          '--exactOptionalPropertyTypes',
          '--verbatimModuleSyntax',
          '--isolatedModules',
          '--moduleDetection',
          'force',
          'src/vite-env.d.ts',
          PROBE,
        ],
        { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (error) {
      const failure = error as {
        stdout?: string;
        stderr?: string;
        status?: number | null;
        signal?: string | null;
      };
      output = String(failure.stdout ?? '');
      // EVERYTHING THE OPERATOR WOULD OTHERWISE HAVE TO RE-RUN THE COMPILER TO
      // SEE. `stderr` was discarded before, so a tsc that ran out of memory or
      // was killed under a fully parallel suite produced a truncated `stdout`
      // and no clue that anything had gone wrong with the TOOL.
      diagnostics =
        `\n--- tsc exit ${String(failure.status)} signal ${String(failure.signal)}` +
        `\n--- stdout ---\n${output}` +
        `\n--- stderr ---\n${String(failure.stderr ?? '')}`;
    }
    // An empty `output` means tsc exited 0 — the probe compiled, which is the
    // failure this test exists to catch.
    expect(output, 'tsc accepted the probe').not.toBe('');

    // ---------------------------------------------------------------------
    // TOOL FAILURES ARE CHECKED FIRST, AND THE ORDER IS THE POINT.
    //
    // A review saw this test fail once in fifteen full-suite runs with lines
    // 29, 31, 33 and 35 missing — the four `fixedHitPointsPerLevel` probes,
    // which are the ONLY statements whose error depends on `../../src/rules/
    // sheet` resolving. If that import does not resolve, `fixedHitPointsPerLevel`
    // is `any`, those four calls compile, and the failure is INDISTINGUISHABLE
    // from someone widening the parameter back to `number` — the exact
    // regression this file exists to catch. The root cause was not reproduced
    // in fourteen further runs, so what is fixed here is the SIGNAL: a compiler
    // that could not read its inputs now says so, instead of being reported as
    // a type regression.
    // ---------------------------------------------------------------------

    // No OTHER file may error: an unrelated compile break in `src/` would
    // otherwise let this test pass while proving nothing.
    const otherFiles = output
      .split('\n')
      .filter((line) => /error TS/u.test(line) && !line.includes('die-size.probe.ts'));
    expect(otherFiles, `an unrelated file failed to compile${diagnostics}`).toEqual([]);

    // TS2307 is "Cannot find module …". It lands ON the probe, so `otherFiles`
    // cannot see it, and it silently turns every imported symbol into `any`.
    const unresolved = output
      .split('\n')
      .filter((line) => /error TS2307/u.test(line));
    expect(
      unresolved,
      'the probe could not resolve its imports, so it measured NOTHING — ' +
        `this is a tool failure, not a type regression${diagnostics}`,
    ).toEqual([]);

    const erroredLines = new Set(
      [...output.matchAll(/die-size\.probe\.ts\((?<line>\d+),\d+\): error/gu)].map(
        (match) => Number(match.groups?.line),
      ),
    );
    expect(
      [...erroredLines].sort((a, b) => a - b),
      `a probe statement COMPILED that must not${diagnostics}`,
    ).toEqual(expectedLines);

    // The four messages that carry the actual claim.
    expect(output).toContain(
      "Argument of type '7' is not assignable to parameter of type '6 | 8 | 10 | 12'",
    );
    expect(output).toContain(
      "Argument of type '1001' is not assignable to parameter of type '6 | 8 | 10 | 12'",
    );
    expect(output).toContain("Type 'number' is not assignable to type '6 | 8 | 10 | 12'");
    expect(output).toMatch(/Type '7' is not assignable to type '[^']*\b100\b[^']*'/u);
  }, 60_000);

  /**
   * The POSITIVE half, and it costs nothing to run: these compile only while
   * the relations hold, so `tsc -b` in `npm run build` fails if any of them
   * stops being true. Widening `DieSize` to `number` breaks the first;
   * narrowing it below a subset breaks the second.
   */
  it('states the subset relations in the type system', () => {
    type Assert<T extends true> = T;
    type Extends<A, B> = [A] extends [B] ? true : false;

    type _VocabularyIsClosed = Assert<
      Extends<DieSize, 4 | 6 | 8 | 10 | 12 | 20 | 100>
    >;
    type _VocabularyIsComplete = Assert<
      Extends<4 | 6 | 8 | 10 | 12 | 20 | 100, DieSize>
    >;
    type _HitDiceAreDice = Assert<
      Extends<(typeof hitDieSizes)[number], DieSize>
    >;
    type _MartialArtsDiceAreDice = Assert<
      Extends<(typeof martialArtsDieSizes)[number], DieSize>
    >;
    type _SevenIsNotADie = Assert<Extends<7, DieSize> extends true ? false : true>;

    const held: [
      _VocabularyIsClosed,
      _VocabularyIsComplete,
      _HitDiceAreDice,
      _MartialArtsDiceAreDice,
      _SevenIsNotADie,
    ] = [true, true, true, true, true];
    expect(held).toEqual([true, true, true, true, true]);
  });
});
