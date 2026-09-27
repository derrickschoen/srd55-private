/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The Barbarian and Monk level-1 Unarmored Defense formulas, parsed from
 * `docs/srd/source/unarmored-defense.txt` AT BUILD TIME by
 * `unarmored-defense-srd-reader.ts` and read here from the generated artifact
 * (`generated/unarmored-defense-srd.ts`, written by `npm run srd:artifacts`).
 * This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { SrdUnarmoredDefenseFeature } from './unarmored-defense-srd-reader';
import { BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES } from './generated/unarmored-defense-srd';

const FEATURES: readonly SrdUnarmoredDefenseFeature[] = deepFreeze(
  BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES,
);

/** Both parsed features, in extract order, shared and deeply frozen. */
export function bundledSrdUnarmoredDefenseFeatures(): readonly SrdUnarmoredDefenseFeature[] {
  return FEATURES;
}
