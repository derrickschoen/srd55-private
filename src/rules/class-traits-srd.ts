/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The per-class sheet content — each class's Core Traits, its Extra Attack
 * rows and the Monk's Martial Arts die — parsed from
 * `docs/srd/source/class-core-traits.txt` and `attack-class-features.txt` AT
 * BUILD TIME by `class-traits-srd-reader.ts` and read here from the generated
 * artifact (`generated/class-traits-srd.ts`, written by `npm run
 * srd:artifacts`). This module imports no SRD text.
 */
import type { MartialArtsDieSize } from '../domain/enums';
import { deepFreeze } from '../domain/deep-freeze';
import { FrozenMap } from '../domain/frozen-map';
import type {
  SrdClassTraits,
  SrdExtraAttackGrant,
} from './class-traits-srd-reader';
import { BUNDLED_SRD_CLASS_TRAITS } from './generated/class-traits-srd';

const ARTIFACT = deepFreeze(BUNDLED_SRD_CLASS_TRAITS);

/** An Extra Attack row as the runtime hands it out: its counts a {@link FrozenMap}. */
export interface BundledSrdExtraAttackGrant extends SrdExtraAttackGrant {
  readonly counts: FrozenMap<number, number>;
}

const EXTRA_ATTACK_GRANTS: readonly BundledSrdExtraAttackGrant[] = Object.freeze(
  ARTIFACT.extra_attack_grants.map((grant) => Object.freeze({
    class_name: grant.class_name,
    counts: new FrozenMap<number, number>(grant.counts),
  })),
);

const MARTIAL_ARTS_DICE: FrozenMap<number, MartialArtsDieSize> = new FrozenMap(
  ARTIFACT.martial_arts_dice.map((die, index) => [index + 1, die] as const),
);

/** The twelve classes' Core Traits, in extract order, shared and deeply frozen. */
export function bundledSrdClassTraits(): readonly SrdClassTraits[] {
  return ARTIFACT.traits;
}

/** Each class's Extra Attack rows: level to TOTAL attacks on the Attack action. */
export function bundledSrdExtraAttackGrants(): readonly BundledSrdExtraAttackGrant[] {
  return EXTRA_ATTACK_GRANTS;
}

/** The Monk's Martial Arts die at each level, 1 through 20: one shared {@link FrozenMap}. */
export function bundledSrdMartialArtsDice(): FrozenMap<number, MartialArtsDieSize> {
  return MARTIAL_ARTS_DICE;
}
