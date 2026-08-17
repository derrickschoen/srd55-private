import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  BroadDamageSaveSuspect,
  DerivedSaveDamageCoverage,
  SourceDerivedSaveDamageCandidate,
} from '../../../src/simulation/spell-source-reader';

/**
 * Near-miss probes for two module-level guards in `src/simulation/coverage.ts`:
 *
 * 1. the corpus parity guard (bundled column-safe reading vs the committed
 *    readable extract, for both parsed bodies and raw digest inputs), and
 * 2. the unreconciled-suspect filter (candidate overlap plus exact-span
 *    exclusion matching).
 *
 * Both run once, at module evaluation. An ordinary top-level import therefore
 * only ever exercises the arm where the corpus already agrees and the real
 * suspects are already reconciled, which is why every branch below has to be
 * driven by resetting the module registry and re-importing the module with a
 * near-miss corpus or a near-miss suspect injected through the reader.
 */

type Reader = typeof import('../../../src/simulation/spell-source-reader');
type Coverage = typeof import('../../../src/simulation/coverage');

const READER_PATH = '../../../src/simulation/spell-source-reader';

const PARITY_FAILURE_MESSAGE =
  'Column-safe full SRD spell reading, including raw digest bodies, does not match the committed readable spell extract.';

/**
 * The exact reviewed exclusion span for `Web`, copied verbatim from
 * `reviewedHighRecallDamageSaveExclusions`. The exclusion list is private, so a
 * test that wants to present a span which *exactly* matches a reviewed
 * exclusion — and a near miss that almost does — has to carry the text.
 */
const WEB_EXCLUSION_SPAN =
  'Webs layered over a flat surface have a depth of 5 feet. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire.';

/**
 * Offsets far past the end of any real spell body, so an injected suspect can
 * only ever overlap the injected candidate and never a real one.
 */
const SYNTHETIC_BASE = 1_000_000;
const SYNTHETIC_HEADING = 'Lane E Synthetic Spell';
const OTHER_SYNTHETIC_HEADING = 'Lane E Other Synthetic Spell';

afterEach(() => {
  vi.doUnmock(READER_PATH);
  vi.resetModules();
});

function droppingOneEntry(
  base: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  return new Map([...base].slice(1));
}

/**
 * Adds a heading the full layout does not carry. Sizes then disagree while
 * every heading the full layout *does* carry still maps to an identical body,
 * which isolates the size comparison from the per-body comparison beside it.
 */
function addingOneEntry(
  base: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  return new Map([
    ...base,
    ['Lane E Heading Absent From The Full Layout', 'Lane E synthetic body.'],
  ]);
}

function alteringOneValue(
  base: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  return new Map(
    [...base].map(([heading, body], index) =>
      index === 0
        ? ([heading, `${body} Lane E near-miss trailing sentence.`] as const)
        : ([heading, body] as const),
    ),
  );
}

async function importCoverageWithReader(
  override: (actual: Reader) => Partial<Reader>,
): Promise<Coverage> {
  vi.resetModules();
  vi.doMock(READER_PATH, async () => {
    const actual = await vi.importActual<Reader>(READER_PATH);
    return { ...actual, ...override(actual) };
  });
  return await import('../../../src/simulation/coverage');
}

function syntheticCandidate(
  heading: string,
  start: number,
  end: number,
): SourceDerivedSaveDamageCandidate {
  return {
    heading,
    span: 'A creature must succeed on a Dexterity saving throw or take 1d6 Fire damage.',
    start,
    end,
    save_start: start,
    ability: 'dexterity',
    success: { status: 'available', kind: 'none' },
    fixed_save_dc: { status: 'available', value: null },
    frequency: { kind: 'each_declared_event' },
    duration: { kind: 'instantaneous' },
    timing_unavailable_reason: null,
    repetitions: { status: 'available', minimum: 1, maximum: 1 },
    failed_damage_signatures: [
      { kind: 'dice', damage_type: 'Fire', count: 1, die: 6 },
    ],
    damage_occurrences: [],
  };
}

function syntheticSuspect(
  heading: string,
  start: number,
  end: number,
  span: string,
): BroadDamageSaveSuspect {
  return { heading, span, start, end };
}

/**
 * Re-imports coverage with one extra candidate and one extra suspect appended
 * to the real derived coverage. Everything else — clause map, counts, bodies —
 * stays exactly as derived, so the module's other module-level invariants keep
 * seeing the real corpus.
 */
async function unreconciledWithInjected(
  candidates: readonly SourceDerivedSaveDamageCandidate[],
  suspects: readonly BroadDamageSaveSuspect[],
): Promise<readonly BroadDamageSaveSuspect[]> {
  const coverage = await importCoverageWithReader((actual) => ({
    deriveSaveDamageCoverageFromBodies: (
      bodies: ReadonlyMap<string, string>,
    ): DerivedSaveDamageCoverage => {
      const derived = actual.deriveSaveDamageCoverageFromBodies(bodies);
      for (const candidate of derived.candidates) {
        // The injected offsets are only meaningful if no real candidate can
        // reach them; prove that rather than assuming it.
        expect(candidate.end).toBeLessThan(SYNTHETIC_BASE);
      }
      return {
        ...derived,
        candidates: [...derived.candidates, ...candidates],
        broad_suspects: [...derived.broad_suspects, ...suspects],
      };
    },
  }));
  return coverage.unreconciledHighRecallDamageSaveSuspects;
}

function hasSuspect(
  list: readonly BroadDamageSaveSuspect[],
  suspect: BroadDamageSaveSuspect,
): boolean {
  return list.some((entry) =>
    entry.heading === suspect.heading &&
    entry.span === suspect.span &&
    entry.start === suspect.start &&
    entry.end === suspect.end,
  );
}

describe('column-safe corpus parity guard', () => {
  it('accepts the committed corpus, so every rejection below is the guard and not the harness', async () => {
    const coverage = await importCoverageWithReader(() => ({}));
    expect(coverage.highRecallDamageSaveSuspects.length).toBeGreaterThan(0);
  });

  it('rejects an extract that is missing one spell body', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellDescriptionsByHeading: (extract: string) =>
          droppingOneEntry(actual.spellDescriptionsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });

  it('rejects an extract that carries one heading the full layout does not, with every shared body identical', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellDescriptionsByHeading: (extract: string) =>
          addingOneEntry(actual.spellDescriptionsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });

  it('rejects an extract whose bodies are all present but one differs in text', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellDescriptionsByHeading: (extract: string) =>
          alteringOneValue(actual.spellDescriptionsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });

  it('rejects an extract that is missing one raw digest input', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellBodyDigestInputsByHeading: (extract: string) =>
          droppingOneEntry(actual.spellBodyDigestInputsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });

  it('rejects an extract carrying one raw digest input the full layout does not, with every shared digest input identical', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellBodyDigestInputsByHeading: (extract: string) =>
          addingOneEntry(actual.spellBodyDigestInputsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });

  it('rejects an extract whose parsed bodies all agree but one raw digest input differs', async () => {
    await expect(
      importCoverageWithReader((actual) => ({
        spellBodyDigestInputsByHeading: (extract: string) =>
          alteringOneValue(actual.spellBodyDigestInputsByHeading(extract)),
      })),
    ).rejects.toThrow(new TypeError(PARITY_FAILURE_MESSAGE));
  });
});

describe('unreconciled suspect filter: candidate overlap', () => {
  const candidate = syntheticCandidate(
    SYNTHETIC_HEADING,
    SYNTHETIC_BASE,
    SYNTHETIC_BASE + 100,
  );

  it('drops a suspect that overlaps a candidate of the same heading', async () => {
    const suspect = syntheticSuspect(
      SYNTHETIC_HEADING,
      SYNTHETIC_BASE + 50,
      SYNTHETIC_BASE + 150,
      'Lane E overlapping suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(false);
  });

  it('keeps a suspect whose offsets overlap a candidate under a different heading', async () => {
    const suspect = syntheticSuspect(
      OTHER_SYNTHETIC_HEADING,
      SYNTHETIC_BASE + 50,
      SYNTHETIC_BASE + 150,
      'Lane E cross-heading suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(true);
  });

  it('keeps a suspect that ends exactly where the candidate starts', async () => {
    const suspect = syntheticSuspect(
      SYNTHETIC_HEADING,
      SYNTHETIC_BASE - 100,
      SYNTHETIC_BASE,
      'Lane E abutting-before suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(true);
  });

  it('drops a suspect that ends one character past where the candidate starts', async () => {
    const suspect = syntheticSuspect(
      SYNTHETIC_HEADING,
      SYNTHETIC_BASE - 100,
      SYNTHETIC_BASE + 1,
      'Lane E one-past-the-start suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(false);
  });

  it('keeps a suspect that starts exactly where the candidate ends', async () => {
    const suspect = syntheticSuspect(
      SYNTHETIC_HEADING,
      SYNTHETIC_BASE + 100,
      SYNTHETIC_BASE + 200,
      'Lane E abutting-after suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(true);
  });

  it('drops a suspect that starts one character before the candidate ends', async () => {
    const suspect = syntheticSuspect(
      SYNTHETIC_HEADING,
      SYNTHETIC_BASE + 99,
      SYNTHETIC_BASE + 200,
      'Lane E one-before-the-end suspect span.',
    );
    const unreconciled = await unreconciledWithInjected([candidate], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(false);
  });
});

describe('unreconciled suspect filter: reviewed exclusion matching', () => {
  it('drops a suspect whose heading and span both match a reviewed exclusion', async () => {
    const suspect = syntheticSuspect(
      'Web',
      SYNTHETIC_BASE,
      SYNTHETIC_BASE + WEB_EXCLUSION_SPAN.length,
      WEB_EXCLUSION_SPAN,
    );
    const unreconciled = await unreconciledWithInjected([], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(false);
  });

  it('keeps a suspect on an excluded heading whose span is one sentence longer', async () => {
    const span = `${WEB_EXCLUSION_SPAN} Lane E near-miss trailing sentence.`;
    const suspect = syntheticSuspect(
      'Web',
      SYNTHETIC_BASE,
      SYNTHETIC_BASE + span.length,
      span,
    );
    const unreconciled = await unreconciledWithInjected([], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(true);
  });

  it('keeps a suspect that reproduces an excluded span verbatim under another heading', async () => {
    const suspect = syntheticSuspect(
      OTHER_SYNTHETIC_HEADING,
      SYNTHETIC_BASE,
      SYNTHETIC_BASE + WEB_EXCLUSION_SPAN.length,
      WEB_EXCLUSION_SPAN,
    );
    const unreconciled = await unreconciledWithInjected([], [suspect]);
    expect(hasSuspect(unreconciled, suspect)).toBe(true);
  });
});
