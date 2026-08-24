import type { HomebrewBeastFamily } from './homebrew-beast-families';

export type BeastFamilyBlockedVocabulary =
  | 'detection_lever'
  | 'elevation_and_flying'
  | 'movement_opportunity_reaction_trigger';

export interface BeastFamilyDeferredUpgrade {
  readonly family: HomebrewBeastFamily;
  readonly blockedSignature: 'web_sense' | 'keen_sight' | 'descent_triggered_dive' | 'flyby';
  readonly blockingVocabulary: BeastFamilyBlockedVocabulary;
  readonly standingInMechanic: 'spider_climb_and_web_walker' | 'perception_skill' | 'raking_pass_charge' | 'nimble_escape';
  readonly standingIn: true;
  readonly reason: string;
}

/**
 * Designed signatures are never silently simplified. Each entry names both
 * the missing engine noun and the landed, visibly temporary replacement.
 */
export const BEAST_FAMILY_DEFERRED_UPGRADES = [
  { family: 'pterosaur', blockedSignature: 'descent_triggered_dive', blockingVocabulary: 'elevation_and_flying', standingInMechanic: 'raking_pass_charge', standingIn: true, reason: 'Straight movement is typed, but descent and elevation are not.' },
] as const satisfies readonly BeastFamilyDeferredUpgrade[];
