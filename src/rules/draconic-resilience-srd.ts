/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Draconic Sorcery's level-3 Draconic Resilience, parsed from
 * `docs/srd/source/draconic-resilience.txt` AT BUILD TIME by
 * `draconic-resilience-srd-reader.ts` and read here from the generated
 * artifact (`generated/draconic-resilience-srd.ts`, written by
 * `npm run srd:artifacts`). This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { SrdDraconicResilienceFeature } from './draconic-resilience-srd-reader';
import { BUNDLED_SRD_DRACONIC_RESILIENCE } from './generated/draconic-resilience-srd';

const FEATURE: SrdDraconicResilienceFeature = deepFreeze(
  BUNDLED_SRD_DRACONIC_RESILIENCE,
);

/** The one parsed feature, shared and deeply frozen. */
export function bundledSrdDraconicResilience(): SrdDraconicResilienceFeature {
  return FEATURE;
}
