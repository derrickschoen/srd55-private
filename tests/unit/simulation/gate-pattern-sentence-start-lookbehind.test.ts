import { describe, expect, it } from 'vitest';
import bundledSrd521 from '../../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../../docs/srd/source/spell-descriptions.txt?raw';
import {
  GATE_DAMAGE_SAVE_PATTERNS,
  gateDamageSaveClause,
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
  type SourceDerivedSaveClause,
} from '../../../src/simulation/spell-source-reader';
import { PRE_LOOKBEHIND_GATE_PATTERNS } from '../../helpers/pre-lookbehind-gate-patterns';

/**
 * THE SENTENCE-START LOOKBEHIND IS A SPEED CHANGE, AND THIS IS THE PROOF.
 *
 * `GATE_DAMAGE_SAVE_PATTERNS` prefix every gate pattern with `(?<![^.])`, so a
 * match may start only at the start of a body or right after a '.'. The claim
 * is that this prunes only starts that can never win: for /[^.]*R/ the
 * leftmost match always starts at a sentence start, because [^.]* absorbs any
 * later start in the same sentence.
 *
 * Each case below derives the gate clause of every spell body in one SRD
 * corpus twice — once with the live patterns and once with the frozen
 * pre-lookbehind copy in tests/helpers — and requires the two clauses to be
 * identical, span, offsets, save position and damage occurrences included.
 * The two corpora are the two readings coverage.ts derives from.
 *
 * What it kills: a lookbehind that is plausible but wrong. `(?<![^\n])` (line
 * start) refuses sentences that begin mid-line; `(?<=\.)` (after a dot only)
 * refuses a gate sentence that opens a body. Both change which clause a real
 * SRD body gets.
 *
 * Two guards at the end of each case keep the comparison from passing
 * vacuously. Every gate pattern must own at least one body of the corpus, so
 * every pattern's lookbehind is actually exercised on real text. And
 * `gateDamageSaveClause` given NO patterns must find no clause in any body:
 * a clause function that ignored the list it is handed (reading the live
 * constant instead) would compare the live patterns with themselves and pass.
 */

type Divergence = {
  readonly heading: string;
  readonly live: SourceDerivedSaveClause | null;
  readonly frozen: SourceDerivedSaveClause | null;
};

function compareGateClauses(bodies: ReadonlyMap<string, string>): {
  readonly divergences: readonly Divergence[];
  readonly patternsOwningABody: readonly number[];
  readonly headingsWithAClauseFromNoPatterns: readonly string[];
} {
  const divergences: Divergence[] = [];
  const owners = new Set<number>();
  const clauseFromNoPatterns: string[] = [];
  for (const [heading, body] of bodies) {
    if (gateDamageSaveClause(body, []) !== null) {
      clauseFromNoPatterns.push(heading);
    }
    const live = gateDamageSaveClause(body, GATE_DAMAGE_SAVE_PATTERNS);
    const frozen = gateDamageSaveClause(body, PRE_LOOKBEHIND_GATE_PATTERNS);
    if (JSON.stringify(live) !== JSON.stringify(frozen)) {
      divergences.push({ heading, live, frozen });
    }
    const owner = GATE_DAMAGE_SAVE_PATTERNS.findIndex(
      (pattern) => pattern.exec(body) !== null,
    );
    if (owner >= 0) {
      owners.add(owner);
    }
  }
  return {
    divergences,
    patternsOwningABody: [...owners].sort((left, right) => left - right),
    headingsWithAClauseFromNoPatterns: clauseFromNoPatterns,
  };
}

const EVERY_GATE_PATTERN = [0, 1, 2, 3, 4, 5, 6, 7];

describe('gate patterns with the sentence-start lookbehind', () => {
  it('derive the same gate clause as the pre-lookbehind patterns for every spell body of the full SRD layout', () => {
    const bodies = spellDescriptionsFromFullLayout(bundledSrd521);
    const comparison = compareGateClauses(bodies);
    expect(comparison.divergences).toEqual([]);
    expect(comparison.patternsOwningABody).toEqual(EVERY_GATE_PATTERN);
    expect(comparison.headingsWithAClauseFromNoPatterns).toEqual([]);
  });

  it('derive the same gate clause as the pre-lookbehind patterns for every spell body of the committed spell extract', () => {
    const bodies = spellDescriptionsByHeading(bundledSpellDescriptions);
    const comparison = compareGateClauses(bodies);
    expect(comparison.divergences).toEqual([]);
    expect(comparison.patternsOwningABody).toEqual(EVERY_GATE_PATTERN);
    expect(comparison.headingsWithAClauseFromNoPatterns).toEqual([]);
  });
});
