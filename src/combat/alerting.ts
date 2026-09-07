import { minimumSpaceDistance, type CreatureSpace, type KnownCreatureSize } from './creature-space';
import { feet, type CombatantId, type Feet } from './values';

export const ALERTING_POLICY = 'npc-help-calling-v1' as const;

export interface YellingDistance {
  readonly kind: 'yelling_distance';
  readonly radius: Feet;
}

export function yellingDistance(radius: Feet): YellingDistance {
  if (radius <= 0) throw new RangeError('A yelling distance must be greater than 0 feet.');
  return { kind: 'yelling_distance', radius };
}

export const DEFAULT_YELLING_DISTANCE = yellingDistance(feet(60));

/** The discriminant is the extension point for later barrier-aware sound models. */
export type SoundPropagationModel = {
  readonly kind: 'radial';
  readonly occlusion: 'not_modeled';
};

export const RADIAL_SOUND_PROPAGATION: SoundPropagationModel = Object.freeze({
  kind: 'radial',
  occlusion: 'not_modeled',
});

export type CombatMembership =
  | {
      readonly kind: 'participant';
      readonly combatant: CombatantId;
      readonly joinedBy:
        | { readonly kind: 'encounter_start' }
        | { readonly kind: 'help_call'; readonly caller: CombatantId; readonly round: number }
        | { readonly kind: 'summoned'; readonly summoner: CombatantId };
    }
  | {
      readonly kind: 'nearby_npc';
      readonly combatant: CombatantId;
    };

export interface EncounterAlertingState {
  readonly policy: typeof ALERTING_POLICY;
  readonly yellingDistance: YellingDistance;
  readonly soundPropagation: SoundPropagationModel;
  readonly membership: readonly CombatMembership[];
}

export interface EncounterAlertingSetup {
  readonly nearbyNpcIds: readonly CombatantId[];
  readonly yellingDistance?: YellingDistance;
  readonly soundPropagation?: SoundPropagationModel;
}

export function defaultEncounterAlertingState(
  combatants: readonly CombatantId[],
): EncounterAlertingState {
  return {
    policy: ALERTING_POLICY,
    yellingDistance: { ...DEFAULT_YELLING_DISTANCE },
    soundPropagation: { ...RADIAL_SOUND_PROPAGATION },
    membership: combatants.map((combatant) => ({
      kind: 'participant',
      combatant,
      joinedBy: { kind: 'encounter_start' },
    })),
  };
}

export function isEncounterParticipant(
  alerting: EncounterAlertingState | undefined,
  combatant: CombatantId,
): boolean {
  const membership = alerting?.membership.find((entry) => entry.combatant === combatant);
  // Only an explicit D420 nearby-NPC declaration removes a roster member from combat.
  return membership?.kind !== 'nearby_npc';
}

export function helpCallResponders(input: {
  readonly alerting: EncounterAlertingState | undefined;
  readonly caller: CombatantId;
  readonly callerSpace: CreatureSpace<KnownCreatureSize>;
  readonly spaces: ReadonlyMap<CombatantId, CreatureSpace<KnownCreatureSize>>;
}): readonly { readonly combatant: CombatantId; readonly distance: Feet }[] {
  const alerting = input.alerting;
  if (alerting === undefined) return [];
  return alerting.membership
    .flatMap((entry): readonly { readonly combatant: CombatantId; readonly distance: Feet }[] => {
      if (entry.kind !== 'nearby_npc') return [];
      const space = input.spaces.get(entry.combatant);
      if (space === undefined) return [];
      const distance = minimumSpaceDistance(input.callerSpace, space);
      return distance <= alerting.yellingDistance.radius
        ? [{ combatant: entry.combatant, distance }]
        : [];
    })
    .sort((left, right) =>
      left.distance - right.distance || left.combatant.localeCompare(right.combatant));
}
