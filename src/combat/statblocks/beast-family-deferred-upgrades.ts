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
  { family: 'arachnid', blockedSignature: 'web_sense', blockingVocabulary: 'detection_lever', standingInMechanic: 'spider_climb_and_web_walker', standingIn: true, reason: 'The engine has movement on webs but no web-disturbance detection hook.' },
  { family: 'raptor', blockedSignature: 'keen_sight', blockingVocabulary: 'detection_lever', standingInMechanic: 'perception_skill', standingIn: true, reason: 'Perception bonuses are landed; typed sight-based check advantage is queued.' },
  { family: 'pterosaur', blockedSignature: 'descent_triggered_dive', blockingVocabulary: 'elevation_and_flying', standingInMechanic: 'raking_pass_charge', standingIn: true, reason: 'Straight movement is typed, but descent and elevation are not.' },
  { family: 'pterosaur', blockedSignature: 'flyby', blockingVocabulary: 'movement_opportunity_reaction_trigger', standingInMechanic: 'nimble_escape', standingIn: true, reason: 'Opportunity attacks are commands, but movement/OA is absent from the closed reaction-trigger union.' },
  { family: 'raptor', blockedSignature: 'flyby', blockingVocabulary: 'movement_opportunity_reaction_trigger', standingInMechanic: 'nimble_escape', standingIn: true, reason: 'Opportunity attacks are commands, but movement/OA is absent from the closed reaction-trigger union.' },
] as const satisfies readonly BeastFamilyDeferredUpgrade[];
