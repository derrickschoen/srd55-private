import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import type {
  MonsterAttackAction,
  MonsterSavingThrowAction,
  MonsterSpellcastingAction,
} from '../combat/statblock';
import { monsterSpellResourcePoolId } from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import type { CombatantId } from '../combat/values';
import { worldObjectClassAction, worldObjectActionWasUsed } from '../combat/world-object-actions';
import { sha256 } from '../crypto/sha256';
import {
  canonicalEngineQueryPort,
  monsterActions,
  monsterBonusActions,
  type EngineQueryPort,
  type EngineTargetSelector,
} from './engine-query-port';
import { projectEngineActorOptions } from './turn-option-registry';
import {
  engineActionId,
  type EngineActionSlotUse,
  type EngineOfferableOption,
  type EngineBonusActionUse,
  type EngineMainActionUse,
  type EngineMovementObjective,
  type EngineProposalResolution,
  type EngineTargetedAttackUse,
  type EngineTurnProposal,
  type PureTurnProposalResolver,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from './turn-proposal';

export type {
  EngineActionId,
  EngineActionSlotUse,
  EngineOfferableOption,
  EngineBonusActionUse,
  EngineEngagement,
  EngineMainActionUse,
  EngineMovementObjective,
  EngineMovementPreference,
  EngineOptionId,
  EngineProposalResolution,
  EngineSpellId,
  EngineTurnProposal,
  PureTurnProposalResolver,
  ResolvedActionSlotUse,
  ResolvedTurnMechanics,
} from './turn-proposal';

type OptionResolution =
  | { readonly valid: true; readonly mechanics: ResolvedTurnMechanics }
  | { readonly valid: false; readonly code: string; readonly summary: string };

function refused(code: string, summary: string): OptionResolution {
  return { valid: false, code, summary };
}

function resolveSelector(
  state: EncounterState,
  actorId: CombatantId,
  selector: EngineTargetSelector,
  queries: EngineQueryPort,
): CombatantId | null {
  const targetId = queries.resolveTarget(state, actorId, selector);
  return targetId !== null && queries.combatant(state, targetId)?.life !== 'dead' ? targetId : null;
}

function targetUse(
  state: EncounterState,
  actorId: CombatantId,
  use: EngineTargetedAttackUse,
  queries: EngineQueryPort,
): { readonly targetId: CombatantId; readonly action: MonsterAttackAction } | null {
  const targetId = resolveSelector(state, actorId, use.target, queries);
  const action = monsterActions(state, actorId).find(
    (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === use.actionId,
  );
  return targetId === null || action === undefined ? null : { targetId, action };
}

function useTargets(
  state: EncounterState,
  actorId: CombatantId,
  use: EngineMainActionUse | EngineBonusActionUse,
  queries: EngineQueryPort,
): readonly CombatantId[] | null {
  switch (use.kind) {
    case 'attack': {
      const resolved = targetUse(state, actorId, use, queries);
      return resolved === null ? null : [resolved.targetId];
    }
    case 'multiattack': {
      const targets = use.components.map((component) => targetUse(state, actorId, component, queries));
      return targets.some((entry) => entry === null)
        ? null
        : targets.flatMap((entry) => entry === null ? [] : [entry.targetId]);
    }
    case 'saving_throw': {
      const targetId = resolveSelector(state, actorId, use.target, queries);
      return targetId === null ? null : [targetId];
    }
    case 'cast_spell': {
      const targets = use.targets.map((selector) => resolveSelector(state, actorId, selector, queries));
      return targets.some((targetId) => targetId === null)
        ? null
        : targets.flatMap((targetId) => targetId === null ? [] : [targetId]);
    }
    case 'use_world_object':
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'hide':
    case 'end_turn': return [];
  }
}

function targetConstraints(
  state: EncounterState,
  actorId: CombatantId,
  slots: readonly EngineActionSlotUse[],
  queries: EngineQueryPort,
): readonly { readonly targetId: CombatantId; readonly actionId: string; readonly rangeFeet: number }[] | null {
  const actions = monsterActions(state, actorId);
  const constraints: { readonly targetId: CombatantId; readonly actionId: string; readonly rangeFeet: number }[] = [];
  for (const slot of slots) {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': {
        const resolved = targetUse(state, actorId, use, queries);
        if (resolved === null) return null;
        const rangeFeet = resolved.action.delivery.kind === 'melee'
          ? resolved.action.delivery.reachFeet
          : resolved.action.delivery.kind === 'ranged'
            ? resolved.action.delivery.longRangeFeet.kind === 'present'
              ? resolved.action.delivery.longRangeFeet.value
              : resolved.action.delivery.rangeFeet
            : resolved.action.delivery.longRangeFeet;
        constraints.push({ targetId: resolved.targetId, actionId: resolved.action.id, rangeFeet });
        break;
      }
      case 'multiattack':
        for (const component of use.components) {
          const resolved = targetUse(state, actorId, component, queries);
          if (resolved === null) return null;
          const rangeFeet = resolved.action.delivery.kind === 'melee'
            ? resolved.action.delivery.reachFeet
            : resolved.action.delivery.kind === 'ranged'
              ? resolved.action.delivery.longRangeFeet.kind === 'present'
                ? resolved.action.delivery.longRangeFeet.value
                : resolved.action.delivery.rangeFeet
              : resolved.action.delivery.longRangeFeet;
          constraints.push({ targetId: resolved.targetId, actionId: resolved.action.id, rangeFeet });
        }
        break;
      case 'saving_throw': {
        const targetId = resolveSelector(state, actorId, use.target, queries);
        const action = actions.find(
          (candidate): candidate is MonsterSavingThrowAction => candidate.kind === 'saving_throw' && candidate.id === use.actionId,
        );
        if (targetId === null || action === undefined) return null;
        constraints.push({ targetId, actionId: action.id, rangeFeet: action.target.rangeFeet });
        break;
      }
      case 'cast_spell': {
        const definition = spellDefinition(use.spellId);
        const targetIds = useTargets(state, actorId, use, queries);
        if (definition === null || targetIds === null) return null;
        const rangeFeet = 'rangeFeet' in definition.targeting ? definition.targeting.rangeFeet : 0;
        for (const targetId of targetIds) {
          constraints.push({ targetId, actionId: use.sourceActionId, rangeFeet });
        }
        break;
      }
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': break;
    }
  }
  return constraints;
}

function positionFits(
  state: EncounterState,
  actorId: CombatantId,
  position: GridCell,
  constraints: readonly { readonly targetId: CombatantId; readonly rangeFeet: number }[],
  movement: EngineMovementObjective,
  queries: EngineQueryPort,
): boolean {
  for (const constraint of constraints) {
    const targetPosition = queries.tokenPosition(state, constraint.targetId);
    if (targetPosition === null || gridDistance(position, targetPosition) > constraint.rangeFeet) return false;
  }
  const anchor = movement.engagement.anchor;
  if (movement.engagement.stance === 'maintain_range' && anchor !== undefined && anchor !== null) {
    const anchorId = resolveSelector(state, actorId, anchor, queries);
    const anchorPosition = anchorId === null ? null : queries.tokenPosition(state, anchorId);
    const anchorReach = anchorId === null ? null : queries.combatant(state, anchorId)?.profile.rules.reach;
    if (anchorPosition === null || anchorReach === null || anchorReach === undefined ||
      gridDistance(position, anchorPosition) <= anchorReach) return false;
  }
  return true;
}

interface MovementResolution {
  readonly costFeet: number;
  readonly path: readonly GridCell[];
  readonly finalPosition: GridCell;
}

function movementResolution(
  state: EncounterState,
  actorId: CombatantId,
  movement: EngineMovementObjective,
  slots: readonly EngineActionSlotUse[],
  queries: EngineQueryPort,
): MovementResolution | null {
  const origin = queries.tokenPosition(state, actorId);
  const actor = queries.combatant(state, actorId);
  const constraints = targetConstraints(state, actorId, slots, queries);
  if (origin === null || actor === null || constraints === null) return null;
  const anchor = movement.engagement.anchor;
  const productiveClose = constraints.length === 0 &&
    movement.engagement.stance === 'close_to_melee' && anchor !== undefined && anchor !== null;
  if (!productiveClose && positionFits(state, actorId, origin, constraints, movement, queries)) {
    return { costFeet: 0, path: [], finalPosition: origin };
  }
  if (movement.preference.willingness === 'none') return null;
  const maximumFeet = movement.preference.maximumFeet ?? actor.profile.rules.speed;
  const movementKind = slots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dash') ? 'dash' : 'normal';
  if (productiveClose) {
    const anchorId = resolveSelector(state, actorId, anchor, queries);
    const anchorPosition = anchorId === null ? null : queries.tokenPosition(state, anchorId);
    if (anchorPosition === null) return null;
    const approach = queries.approach(state, {
      actorId,
      target: anchorPosition,
      movement: movementKind,
      maximumFeet,
    });
    if (!approach.legal) return null;
    return {
      costFeet: approach.costFeet,
      path: approach.cells,
      finalPosition: approach.cells.at(-1) ?? origin,
    };
  }
  const candidateCells: { readonly lowerBoundFeet: number; readonly finalPosition: GridCell }[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const finalPosition = { column, row };
      if (!positionFits(state, actorId, finalPosition, constraints, movement, queries)) continue;
      const lowerBoundFeet = gridDistance(origin, finalPosition);
      if (lowerBoundFeet <= maximumFeet) candidateCells.push({ lowerBoundFeet, finalPosition });
    }
  }
  candidateCells.sort((left, right) => left.lowerBoundFeet - right.lowerBoundFeet ||
    left.finalPosition.row - right.finalPosition.row || left.finalPosition.column - right.finalPosition.column);
  let best: { readonly costFeet: number; readonly path: readonly GridCell[]; readonly finalPosition: GridCell } | null = null;
  for (const candidate of candidateCells) {
    if (best !== null && candidate.lowerBoundFeet > best.costFeet) break;
    const result = queries.path(state, {
      actorId,
      destination: candidate.finalPosition,
      movement: movementKind,
      maximumFeet,
    });
    if (!result.legal) continue;
    const resolved = { costFeet: result.costFeet, path: result.cells, finalPosition: candidate.finalPosition };
    if (best === null || resolved.costFeet < best.costFeet ||
      resolved.costFeet === best.costFeet && (resolved.finalPosition.row < best.finalPosition.row ||
        resolved.finalPosition.row === best.finalPosition.row && resolved.finalPosition.column < best.finalPosition.column)) {
      best = resolved;
    }
  }
  return best;
}

function sourceSpellcastingAction(
  state: EncounterState,
  actorId: CombatantId,
  slot: 'main' | 'bonus',
  use: Extract<EngineMainActionUse | EngineBonusActionUse, { readonly kind: 'cast_spell' }>,
): MonsterSpellcastingAction | null {
  const source = slot === 'main' ? monsterActions(state, actorId) : monsterBonusActions(state, actorId);
  const action = source.find(
    (candidate): candidate is MonsterSpellcastingAction => candidate.kind === 'spellcasting' &&
      candidate.id === use.sourceActionId && candidate.actionEconomy === (slot === 'main' ? 'action' : 'bonus_action'),
  );
  return action?.spells.some((spell) => spell.id === use.spellId && spell.manifestStatus === 'implemented') === true
    ? action
    : null;
}

function validateUse(
  state: EncounterState,
  actorId: CombatantId,
  slot: EngineActionSlotUse['slot'],
  use: EngineMainActionUse | EngineBonusActionUse,
  queries: EngineQueryPort,
): string | null {
  const actions = monsterActions(state, actorId);
  switch (use.kind) {
    case 'attack': return targetUse(state, actorId, use, queries) === null ? 'ATTACK_UNAVAILABLE' : null;
    case 'multiattack': {
      const declaration = actions.find(
        (candidate): candidate is import('../combat/statblock').MonsterMultiattackAction =>
          candidate.kind === 'multiattack' && candidate.id === use.actionId,
      );
      if (declaration === undefined || use.components.length !== declaration.count ||
        use.components.some((component) => !declaration.actionIds.includes(component.actionId) ||
          targetUse(state, actorId, component, queries) === null)) return 'MULTIATTACK_COMBINATION_ILLEGAL';
      if (declaration.combination === 'fixed' && declaration.actionIds.some(
        (actionId, index) => use.components[index]?.actionId !== actionId,
      )) return 'MULTIATTACK_COMBINATION_ILLEGAL';
      if (declaration.combination === 'one_attack_may_be_replaced') {
        const replacement = declaration.actionIds.at(-1);
        if (replacement !== undefined && use.components.filter((component) => component.actionId === replacement).length > 1) {
          return 'MULTIATTACK_COMBINATION_ILLEGAL';
        }
      }
      return null;
    }
    case 'saving_throw': {
      const source = slot === 'main' ? actions : monsterBonusActions(state, actorId);
      return source.some((candidate) => candidate.kind === 'saving_throw' && candidate.id === use.actionId) &&
        resolveSelector(state, actorId, use.target, queries) !== null ? null : 'SAVE_ACTION_UNAVAILABLE';
    }
    case 'cast_spell': {
      const action = sourceSpellcastingAction(state, actorId, slot, use);
      const reference = action?.spells.find((spell) => spell.id === use.spellId);
      const definition = spellDefinition(use.spellId);
      const requiresArea = definition?.targeting.kind === 'area' || definition?.targeting.kind === 'area_selected';
      if (action === null || reference === undefined || definition === null ||
        requiresArea !== (use.area !== null) || useTargets(state, actorId, use, queries) === null) {
        return 'SPELL_ACTION_UNAVAILABLE';
      }
      const poolId = monsterSpellResourcePoolId(action.id, reference);
      return poolId !== null && (queries.combatant(state, actorId)?.limitedResources?.find(
        (pool) => pool.id === poolId,
      )?.remaining ?? 0) < 1 ? 'LIMITED_USE_SPENT' : null;
    }
    case 'use_world_object': {
      if (slot !== 'main') return 'WORLD_OBJECT_REQUIRES_MAIN_ACTION';
      const object = state.worldObjects.find((candidate) => candidate.id === use.objectId);
      const action = object === undefined ? null : worldObjectClassAction(object, use.actionId);
      const position = queries.tokenPosition(state, actorId);
      if (object === undefined || action === null || position === null ||
        (action.eligibleActor !== 'either' && action.eligibleActor !== 'monster') ||
        (action.reach === 'adjacent' && gridDistance(position, object.position) > 5) ||
        (action.uses === 'once' && worldObjectActionWasUsed(state.eventLog, object.id, action.id))) {
        return 'WORLD_OBJECT_ACTION_UNAVAILABLE';
      }
      return null;
    }
    case 'dodge':
    case 'end_turn': return slot === 'main' ? null : 'ACTION_WRONG_SLOT';
    case 'disengage':
    case 'dash': return null;
    case 'hide': return slot === 'bonus' ? null : 'ACTION_WRONG_SLOT';
  }
}

function resolvedUses(
  state: EncounterState,
  actorId: CombatantId,
  slots: readonly EngineActionSlotUse[],
  queries: EngineQueryPort,
): readonly ResolvedActionSlotUse[] | null {
  const resolved: ResolvedActionSlotUse[] = [];
  for (const slot of slots) {
    const use = slot.use;
    const targets = useTargets(state, actorId, use, queries);
    if (targets === null) return null;
    switch (use.kind) {
      case 'multiattack':
        for (const component of use.components) {
          const targetId = resolveSelector(state, actorId, component.target, queries);
          if (targetId === null) return null;
          resolved.push({ slot: slot.slot, kind: 'attack', actionId: component.actionId, spellId: null, targetIds: [targetId], objectId: null });
        }
        break;
      case 'cast_spell': resolved.push({
        slot: slot.slot,
        kind: use.kind,
        actionId: use.sourceActionId,
        spellId: use.spellId,
        targetIds: targets,
        objectId: null,
        ...(use.area === null ? {} : { area: use.area }),
      }); break;
      case 'use_world_object': resolved.push({ slot: slot.slot, kind: use.kind, actionId: use.actionId, spellId: null, targetIds: [], objectId: use.objectId }); break;
      case 'attack':
      case 'saving_throw': resolved.push({ slot: slot.slot, kind: use.kind, actionId: use.actionId, spellId: null, targetIds: targets, objectId: null }); break;
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': resolved.push({ slot: slot.slot, kind: use.kind, actionId: engineActionId(use.kind), spellId: null, targetIds: [], objectId: null }); break;
    }
  }
  return resolved;
}

export function resolveEngineActorOption(
  state: EncounterState,
  option: EngineOfferableOption,
  queries: EngineQueryPort = canonicalEngineQueryPort,
): OptionResolution {
  const actor = queries.combatant(state, option.actorId);
  if (actor?.profile.kind !== 'monster' || actor.life !== 'living') {
    return refused('ACTOR_NOT_LIVING_MONSTER', `${option.actorId}: actor is not a living monster`);
  }
  const main = option.actionSlots.filter((slot) => slot.slot === 'main');
  const bonus = option.actionSlots.filter((slot) => slot.slot === 'bonus');
  if (main.length !== 1 || bonus.length > 1) {
    return refused('ACTION_SLOT_COMBINATION_ILLEGAL', `${option.actorId}: option must use exactly one main and at most one bonus slot`);
  }
  if (actor.turn.action.kind !== 'available') return refused('MAIN_ACTION_SPENT', `${option.actorId}: main action is spent`);
  if (bonus.length > 0 && !actor.turn.bonusActionAvailable) return refused('BONUS_ACTION_SPENT', `${option.actorId}: bonus action is spent`);
  for (const slot of option.actionSlots) {
    const code = validateUse(state, option.actorId, slot.slot, slot.use, queries);
    if (code !== null) return refused(code, `${option.actorId}: ${option.label} is unavailable`);
  }
  const movement = movementResolution(state, option.actorId, option.movement, option.actionSlots, queries);
  if (movement === null) return refused('OPTION_UNREACHABLE', `${option.actorId}: ${option.label} has no legal movement expansion`);
  const actionSlots = resolvedUses(state, option.actorId, option.actionSlots, queries);
  if (actionSlots === null) return refused('OPTION_TARGET_UNRESOLVED', `${option.actorId}: ${option.label} target did not resolve`);
  return {
    valid: true,
    mechanics: {
      actorId: option.actorId,
      optionId: option.optionId,
      movementCostFeet: movement.costFeet,
      path: movement.path,
      finalPosition: movement.finalPosition,
      actionSlots,
    },
  };
}

export function availableEngineActorOptions(
  state: EncounterState,
  actorId: CombatantId,
  queries: EngineQueryPort = canonicalEngineQueryPort,
  revision = state.revision,
): readonly EngineOfferableOption[] {
  return projectEngineActorOptions(state, actorId, revision, (partition) => partition.offerable)
    .filter((option) => resolveEngineActorOption(state, option, queries).valid);
}

function accepted(
  selectedBranch: 'primary' | 'fallback',
  option: EngineOfferableOption,
  mechanics: ResolvedTurnMechanics,
  primaryOption: EngineOfferableOption,
  fallbackOption: EngineOfferableOption | null,
  refusals: Extract<EngineProposalResolution, { readonly valid: true }>['refusals'] = [],
): EngineProposalResolution {
  const resolutionDigest = sha256(canonicalJson(mechanics));
  return {
    valid: true,
    selectedBranch,
    resolutionDigest,
    summary: `${mechanics.actorId} expands ${option.label} into ${String(mechanics.actionSlots.length)} ordered use(s) after ${String(mechanics.movementCostFeet)} feet`,
    mechanics,
    option,
    primaryOption,
    fallbackOption,
    refusals,
  };
}

export function createPureTurnProposalResolver(
  queries: EngineQueryPort = canonicalEngineQueryPort,
): PureTurnProposalResolver {
  return Object.freeze({
    resolve(state: EncounterState, proposal: EngineTurnProposal): EngineProposalResolution {
      const options = availableEngineActorOptions(state, proposal.actorId, queries, proposal.expectedRevision);
      const primary = options.find((option) => option.optionId === proposal.primaryOptionId);
      if (primary !== undefined) {
        const resolution = resolveEngineActorOption(state, primary, queries);
        if (resolution.valid) {
          const fallback = proposal.fallbackOptionId === null
            ? null
            : options.find((option) => option.optionId === proposal.fallbackOptionId) ?? null;
          return accepted('primary', primary, resolution.mechanics, primary, fallback);
        }
      }
      const primaryRefusal = {
        branch: 'primary' as const,
        code: 'OPTION_NOT_OFFERED',
        summary: `${proposal.actorId}: primary option was not offered at revision ${String(proposal.expectedRevision)}`,
      };
      if (proposal.fallbackOptionId === null) return { valid: false, selectedBranch: 'none', refusals: [primaryRefusal] };
      const fallback = options.find((option) => option.optionId === proposal.fallbackOptionId);
      if (fallback === undefined) {
        return {
          valid: false,
          selectedBranch: 'none',
          refusals: [primaryRefusal, { branch: 'fallback', code: 'OPTION_NOT_OFFERED', summary: `${proposal.actorId}: fallback option was not offered at revision ${String(proposal.expectedRevision)}` }],
        };
      }
      const resolution = resolveEngineActorOption(state, fallback, queries);
      return resolution.valid
        ? accepted('fallback', fallback, resolution.mechanics, primary ?? fallback, fallback, [primaryRefusal])
        : { valid: false, selectedBranch: 'none', refusals: [primaryRefusal, { branch: 'fallback', code: resolution.code, summary: resolution.summary }] };
    },
  });
}

export const pureTurnProposalResolver = createPureTurnProposalResolver();
