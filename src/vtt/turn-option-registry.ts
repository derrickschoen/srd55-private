import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import { monsterSpellMaximumUses, monsterSpellResourcePoolId } from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { declaredMonsterActions, declaredMonsterBonusActions } from './engine-query-port';
import { standardSpellHasResolvedSelection } from './offers/offer-declarations';
import { generateEngineOfferEnvelopes } from './offers/offer-generator-registry';
import {
  classifyOptionModeling,
  engineHumanOptionId,
  engineOfferableOption,
  type EngineDeclaredOptionIdentity,
  type EngineHumanOptionId,
  type EngineHumanOnlyOption,
  type EngineOfferableOption,
  type EngineOptionCandidate,
  type EngineOptionModelingCandidate,
} from './option-modeling';
import { engineActionId, engineSpellId } from './turn-proposal';

export { legalMultiattackCombinations } from './offers/offer-declarations';

export const ACTION_ECONOMY_POLICY_VERSION = 'action-economy-v1' as const;

function declaredIdentity(optionValue: EngineOfferableOption): EngineDeclaredOptionIdentity {
  const primary = optionValue.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (primary === undefined || primary.kind !== 'disengage') {
    throw new RangeError('Only a no-effect Disengage executable can become human-only during A1.');
  }
  return { kind: 'standard_action', action: 'disengage' };
}

function humanOnlyOption(
  revision: number,
  actorId: CombatantId,
  label: string,
  declaredOption: EngineDeclaredOptionIdentity,
  noModeledEffect: EngineHumanOnlyOption['noModeledEffect'],
): EngineHumanOnlyOption {
  const body = { actorId, revision, label, declaredOption, noModeledEffect };
  return {
    optionId: engineHumanOptionId(`human-option:${String(revision)}:${sha256(canonicalJson(body)).slice(0, 48)}`),
    ...body,
  };
}

function unsupportedSpellCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const actions = [
    ...declaredMonsterActions(state, actorId).map((action) => ({ action, slot: 'main' as const })),
    ...declaredMonsterBonusActions(state, actorId).map((action) => ({ action, slot: 'bonus' as const })),
  ];
  return actions.flatMap(({ action, slot }) => {
    if (action.kind !== 'spellcasting' || action.execution?.kind === 'absent') return [];
    return action.spells.flatMap((spell) => {
      const poolId = monsterSpellResourcePoolId(action.id, spell);
      const remaining = poolId === null
        ? null
        : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
      if (remaining !== null && remaining < 1) return [];
      const definition = spellDefinition(spell.id);
      const limitation: Extract<EngineOptionModelingCandidate, { readonly kind: 'unsupported_spell' }>['limitation'] | null =
        spell.manifestStatus !== 'implemented'
          ? 'not_in_manifest'
          : definition === null
            ? 'definition_unavailable'
            : definition.operation.kind === 'utility'
              ? 'utility_operation_unmodeled'
              : !standardSpellHasResolvedSelection(
                  state,
                  actorId,
                  spell.id,
                  action.saveDc.kind === 'present' ? action.saveDc.value : null,
                )
                ? 'targeting_unresolved'
                : null;
      if (limitation === null) return [];
      const modeling = classifyOptionModeling(state, {
        kind: 'unsupported_spell',
        sourceActionId: engineActionId(action.id),
        spellId: engineSpellId(spell.id),
        limitation,
      });
      if (modeling.kind === 'primary_effect_modeled') {
        throw new RangeError('An unsupported spell candidate cannot be offerable.');
      }
      const maximum = monsterSpellMaximumUses(spell);
      const label = `${action.id}/${spell.id}${maximum === null ? '' : ` (${String(remaining)}/${String(maximum)})`}`;
      return [humanOnlyOption(
        revision,
        actorId,
        label,
        {
          kind: 'spell',
          sourceActionId: engineActionId(action.id),
          spellId: engineSpellId(spell.id),
          slot,
        },
        modeling.reason,
      )];
    });
  });
}

function unsupportedActionCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  return declaredMonsterActions(state, actorId).flatMap((action) => {
    if (action.execution?.kind !== 'absent') return [];
    switch (action.kind) {
      case 'attack':
      case 'multiattack': return [];
      case 'saving_throw':
      case 'spellcasting': break;
    }
    const declaredActionId = action.id;
    const actionId = engineActionId(declaredActionId);
    const modeling = classifyOptionModeling(state, {
      kind: 'unsupported_action',
      actionId,
      actionKind: action.kind,
      sourceNote: action.execution.note,
    });
    if (modeling.kind === 'primary_effect_modeled') {
      throw new RangeError('An unsupported action candidate cannot be offerable.');
    }
    return [humanOnlyOption(
      revision,
      actorId,
      declaredActionId,
      { kind: 'action', actionId, actionKind: action.kind },
      modeling.reason,
    )];
  });
}

function unsupportedBonusActionCandidates(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
): readonly EngineHumanOnlyOption[] {
  return declaredMonsterBonusActions(state, actorId).flatMap((action) => {
    if (!('execution' in action) || action.execution.kind !== 'absent') return [];
    const declaredActionId = 'id' in action ? action.id : `bonus:${action.kind}`;
    const actionId = engineActionId(declaredActionId);
    const modeling = classifyOptionModeling(state, {
      kind: 'unsupported_action',
      actionId,
      actionKind: action.kind,
      sourceNote: action.execution.note,
    });
    if (modeling.kind === 'primary_effect_modeled') {
      throw new RangeError('An unsupported bonus-action candidate cannot be offerable.');
    }
    return [humanOnlyOption(
      revision,
      actorId,
      declaredActionId,
      { kind: 'action', actionId, actionKind: action.kind },
      modeling.reason,
    )];
  });
}

export interface EngineActorOptionPartition {
  readonly offerable: readonly EngineOfferableOption[];
  readonly humanOnly: readonly EngineHumanOnlyOption[];
  readonly candidates: readonly EngineOptionCandidate[];
}

export interface HiddenOptionRecord {
  readonly actorId: CombatantId;
  readonly humanOptionId: EngineHumanOptionId;
  readonly declaredOption: EngineDeclaredOptionIdentity;
  readonly reason: EngineHumanOnlyOption['noModeledEffect'];
}

export function engineActorOptions(
  state: EncounterState,
  actorId: CombatantId,
  revision = state.revision,
): EngineActorOptionPartition {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster') return { offerable: [], humanOnly: [], candidates: [] };
  const values = generateEngineOfferEnvelopes({ state, actorId, revision }).map(engineOfferableOption);
  const offerable: EngineOfferableOption[] = [];
  const humanOnly: EngineHumanOnlyOption[] = [
    ...unsupportedActionCandidates(state, actorId, revision),
    ...unsupportedBonusActionCandidates(state, actorId, revision),
    ...unsupportedSpellCandidates(state, actorId, revision),
  ];
  for (const candidate of values) {
    const modeling = classifyOptionModeling(state, {
      kind: 'executable',
      actorId: candidate.actorId,
      movement: candidate.movement,
      actionSlots: candidate.actionSlots,
    });
    if (modeling.kind === 'primary_effect_modeled') offerable.push(candidate);
    else humanOnly.push(humanOnlyOption(
      revision,
      actorId,
      candidate.label,
      declaredIdentity(candidate),
      modeling.reason,
    ));
  }
  offerable.sort((left, right) => left.label.localeCompare(right.label) ||
    left.optionId.localeCompare(right.optionId));
  humanOnly.sort((left, right) => left.label.localeCompare(right.label) ||
    left.optionId.localeCompare(right.optionId));
  return { offerable, humanOnly, candidates: [...offerable, ...humanOnly] };
}

export function hiddenOptionRecords(
  state: EncounterState,
  actorIds: readonly CombatantId[],
  revision: number,
): readonly HiddenOptionRecord[] {
  return [...new Set(actorIds)].sort((left, right) => left.localeCompare(right)).flatMap((actorId) =>
    engineActorOptions(state, actorId, revision).humanOnly.map((option) => ({
      actorId,
      humanOptionId: option.optionId,
      declaredOption: option.declaredOption,
      reason: option.noModeledEffect,
    })),
  );
}
