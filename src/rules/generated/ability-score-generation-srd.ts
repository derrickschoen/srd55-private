// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/ability-score-generation-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/ability-score-generation.txt sha256=0999337da9d793311c72fb5198cd7e3f23c6fc72e1dbdd6a6adc6f72d4c6b441
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { deepFreeze } from '../../domain/deep-freeze';
import type { SrdAbilityScoreGenerationArtifact } from '../ability-score-generation-srd-reader';

export const BUNDLED_SRD_ABILITY_SCORE_GENERATION = {
  "standard_array": [
    15,
    14,
    13,
    12,
    10,
    8
  ],
  "point_buy_budget": 27,
  "point_costs": [
    [
      8,
      0
    ],
    [
      12,
      4
    ],
    [
      9,
      1
    ],
    [
      13,
      5
    ],
    [
      10,
      2
    ],
    [
      14,
      7
    ],
    [
      11,
      3
    ],
    [
      15,
      9
    ]
  ]
} as const satisfies SrdAbilityScoreGenerationArtifact;
deepFreeze(BUNDLED_SRD_ABILITY_SCORE_GENERATION);
