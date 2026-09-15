import type { EncounterState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import type {
  EngineHumanOnlyOption,
  EngineOfferableOption,
  EngineOptionCandidate,
} from './option-modeling';
import { renderNoModeledEffectReason, renderOmittedRider } from './renderer-profile';
import { engineActorOptionsForEnvironment } from './intent-resolver';
import { projectFutureMonsterTurns } from './monster-planning-state';
import { buildOfferEnvironment } from './offers/build-offer-environment';
import type { EngineOptionEnvironment } from './offers/offer-environment';

const transitionalLegacyOfferEnvironment = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

export type HumanEngineOptionPresentation =
  | {
      readonly availability: 'offerable';
      readonly option: EngineOfferableOption;
      readonly label: string;
    }
  | {
      readonly availability: 'human_only';
      readonly option: EngineHumanOnlyOption;
      readonly label: string;
    };

export interface HumanEngineActorOptions {
  readonly actorId: CombatantId;
  readonly actorName: string;
  readonly options: readonly HumanEngineOptionPresentation[];
}

function presentOption(candidate: EngineOptionCandidate): HumanEngineOptionPresentation {
  if ('noModeledEffect' in candidate) {
    return {
      availability: 'human_only',
      option: candidate,
      label: `${candidate.label} — ${renderNoModeledEffectReason(candidate.noModeledEffect)}`,
    };
  }
  const omissions = candidate.omittedRiders.map(renderOmittedRider);
  return {
    availability: 'offerable',
    option: candidate,
    label: omissions.length === 0
      ? candidate.label
      : `${candidate.label} — omitted rider${omissions.length === 1 ? '' : 's'}: ${omissions.join('; ')}`,
  };
}

/** Human projection retains every declared candidate while keeping executable options first. */
export function projectHumanEngineOptions(
  state: EncounterState,
  actorIds: readonly CombatantId[] = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []),
  revision = state.revision,
  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
): readonly HumanEngineActorOptions[] {
  const requested = new Set(actorIds);
  const optionState = projectFutureMonsterTurns(state, [...requested]);
  return optionState.combatants
    .filter((combatant) => requested.has(combatant.profile.id) && combatant.profile.kind === 'monster')
    .sort((left, right) => left.profile.id.localeCompare(right.profile.id))
    .map((combatant) => {
      const candidates = engineActorOptionsForEnvironment(
        optionState,
        combatant.profile.id,
        offerEnvironment,
        revision,
      ).candidates;
      const presented = candidates.map((candidate, existingOrder) => ({
        existingOrder,
        presentation: presentOption(candidate),
      }));
      presented.sort((left, right) =>
        (left.presentation.availability === 'offerable' ? 0 : 1) -
          (right.presentation.availability === 'offerable' ? 0 : 1) ||
        left.existingOrder - right.existingOrder);
      return {
        actorId: combatant.profile.id,
        actorName: combatant.profile.name,
        options: presented.map((entry) => entry.presentation),
      };
    });
}
