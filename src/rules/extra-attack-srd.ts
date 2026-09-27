/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The two Eldritch Invocations that grant Extra Attack, parsed from
 * `docs/srd/source/extra-attack-other-sources.txt` AT BUILD TIME by
 * `extra-attack-srd-reader.ts` and read here from the generated artifact
 * (`generated/extra-attack-srd.ts`, written by `npm run srd:artifacts`). This
 * module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { SrdNamedFeature } from './extra-attack-srd-reader';
import { BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES } from './generated/extra-attack-srd';

const FEATURES: readonly SrdNamedFeature[] = deepFreeze(
  BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES,
);

/** Both parsed invocations, ordered by prerequisite level, shared and deeply frozen. */
export function bundledSrdNamedExtraAttackFeatures(): readonly SrdNamedFeature[] {
  return FEATURES;
}
