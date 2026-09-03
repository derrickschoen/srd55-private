import type { EncounterState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import type {
  EngineHumanOnlyOption,
  EngineOfferableOption,
  EngineOptionCandidate,
} from './option-modeling';
import { renderNoModeledEffectReason } from './renderer-profile';
import { engineActorOptions } from './turn-option-registry';
import { projectFutureMonsterTurns } from './monster-planning-state';

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
  return { availability: 'offerable', option: candidate, label: candidate.label };
}

/** Human projection retains every declared candidate while keeping executable options first. */
export function projectHumanEngineOptions(
  state: EncounterState,
  actorIds: readonly CombatantId[] = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []),
  revision = state.revision,
): readonly HumanEngineActorOptions[] {
  const requested = new Set(actorIds);
  const optionState = projectFutureMonsterTurns(state, [...requested]);
  return optionState.combatants
    .filter((combatant) => requested.has(combatant.profile.id) && combatant.profile.kind === 'monster')
    .sort((left, right) => left.profile.id.localeCompare(right.profile.id))
    .map((combatant) => {
      const candidates = engineActorOptions(optionState, combatant.profile.id, revision).candidates;
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
