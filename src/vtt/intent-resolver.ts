import { canonicalJson } from '../commands/canonical-json';
import { combatantSpace } from '../combat/combat-rules';
import { minimumSpaceDistanceToCells, minimumSpaceLine } from '../combat/creature-space';
import { traceCombatantLine } from '../combat/cover';
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
  monsterActions,
  monsterBonusActions,
  type EngineQueryPort,
  type EngineTargetSelector,
} from './engine-query-port';
import { engineActorOptions } from './turn-option-registry';
import type { EngineActorOptionPartition } from './turn-option-registry';
import {
  engineActionId,
  engineSpellId,
  type EngineActionSlotUse,
  type EngineActivationChoice,
  type EngineOfferableOption,
  type EngineBonusActionUse,
  type EngineMainActionUse,
  type EngineMovementObjective,
  type EngineMultiattackComponentUse,
  type EngineProposalResolution,
  type EngineTargetedAttackUse,
  type EngineTurnProposal,
  type PureTurnProposalResolver,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from './turn-proposal';
import type { EngineOmittedRider } from './option-modeling';
import { legalMultiattackCombinations } from './offers/offer-declarations';
import type { EngineOptionEnvironment } from './offers/build-offer-environment';

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

const optionEnvironmentDigests = new WeakMap<EngineOfferableOption, string>();

function bindOptionEnvironment(
  option: EngineOfferableOption,
  environment: EngineOptionEnvironment,
): EngineOfferableOption {
  optionEnvironmentDigests.set(option, environment.digest);
  return option;
}

export function engineActorOptionsForEnvironment(
  state: EncounterState,
  actorId: CombatantId,
  environment: EngineOptionEnvironment,
  revision = state.revision,
): EngineActorOptionPartition {
  const partition = engineActorOptions(state, actorId, revision);
  for (const option of partition.offerable) bindOptionEnvironment(option, environment);
  return partition;
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

function savingThrowTargetUse(
  state: EncounterState,
  actorId: CombatantId,
  use: Extract<EngineMultiattackComponentUse, { readonly kind: 'saving_throw' }>,
  queries: EngineQueryPort,
): { readonly targetId: CombatantId; readonly action: MonsterSavingThrowAction } | null {
  const targetId = resolveSelector(state, actorId, use.target, queries);
  const action = monsterActions(state, actorId).find(
    (candidate): candidate is MonsterSavingThrowAction =>
      candidate.kind === 'saving_throw' && candidate.id === use.actionId,
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
      const targets = use.components.map((component) => component.kind === 'attack'
        ? targetUse(state, actorId, component, queries)
        : savingThrowTargetUse(state, actorId, component, queries));
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
): readonly {
  readonly targetId: CombatantId;
  readonly rangeFeet: number;
  readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
}[] | null {
  const actions = monsterActions(state, actorId);
  const constraints: {
    readonly targetId: CombatantId;
    readonly rangeFeet: number;
    readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
  }[] = [];
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
        constraints.push({ targetId: resolved.targetId, source: { kind: 'action', actionId: resolved.action.id }, rangeFeet });
        break;
      }
      case 'multiattack':
        for (const component of use.components) {
          switch (component.kind) {
            case 'attack': {
              const resolved = targetUse(state, actorId, component, queries);
              if (resolved === null) return null;
              const rangeFeet = resolved.action.delivery.kind === 'melee'
                ? resolved.action.delivery.reachFeet
                : resolved.action.delivery.kind === 'ranged'
                  ? resolved.action.delivery.longRangeFeet.kind === 'present'
                    ? resolved.action.delivery.longRangeFeet.value
                    : resolved.action.delivery.rangeFeet
                  : resolved.action.delivery.longRangeFeet;
              constraints.push({ targetId: resolved.targetId, source: { kind: 'action', actionId: resolved.action.id }, rangeFeet });
              break;
            }
            case 'saving_throw': {
              const resolved = savingThrowTargetUse(state, actorId, component, queries);
              if (resolved === null) return null;
              constraints.push({
                targetId: resolved.targetId,
                source: { kind: 'action', actionId: resolved.action.id },
                rangeFeet: resolved.action.target.rangeFeet,
              });
              break;
            }
          }
        }
        break;
      case 'saving_throw': {
        const targetId = resolveSelector(state, actorId, use.target, queries);
        const action = actions.find(
          (candidate): candidate is MonsterSavingThrowAction => candidate.kind === 'saving_throw' && candidate.id === use.actionId,
        );
        if (targetId === null || action === undefined) return null;
        constraints.push({ targetId, source: { kind: 'action', actionId: action.id }, rangeFeet: action.target.rangeFeet });
        break;
      }
      case 'cast_spell': {
        const definition = spellDefinition(use.spellId);
        const targetIds = useTargets(state, actorId, use, queries);
        if (definition === null || targetIds === null) return null;
        const rangeFeet = 'rangeFeet' in definition.targeting ? definition.targeting.rangeFeet : 0;
        for (const targetId of targetIds) {
          const targeting = definition.targeting;
          const requiresSight = targeting.kind !== 'self' && targeting.kind !== 'area' &&
            targeting.kind !== 'area_selected' && targeting.kind !== 'all_in_range' &&
            targeting.kind !== 'remote' && targeting.kind !== 'utility' && targeting.requiresSight === true;
          constraints.push({ targetId, source: { kind: 'spell', requiresSight }, rangeFeet });
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
  constraints: readonly {
    readonly targetId: CombatantId;
    readonly rangeFeet: number;
    readonly source: { readonly kind: 'action'; readonly actionId: string } | { readonly kind: 'spell'; readonly requiresSight: boolean };
  }[],
  movement: EngineMovementObjective,
  queries: EngineQueryPort,
): boolean {
  for (const constraint of constraints) {
    if (constraint.source.kind === 'spell') {
      const distance = queries.spaceDistance(state, actorId, constraint.targetId, position);
      if (distance === null || distance > constraint.rangeFeet ||
        (constraint.source.requiresSight && traceCombatantLine(
          state, actorId, constraint.targetId, { sourceAnchor: position },
        ).blocksSight)) return false;
      continue;
    }
    const reach = queries.reach(state, {
      actorId,
      targetId: constraint.targetId,
      actionId: constraint.source.actionId,
      origin: position,
    });
    if (!reach.legal || reach.distanceFeet > constraint.rangeFeet) return false;
  }
  const anchor = movement.engagement.anchor;
  if (movement.engagement.stance === 'maintain_range' && anchor !== undefined && anchor !== null) {
    const anchorId = resolveSelector(state, actorId, anchor, queries);
    const anchorReach = anchorId === null ? null : queries.combatant(state, anchorId)?.profile.rules.reach;
    const separation = anchorId === null ? null : queries.spaceDistance(state, actorId, anchorId, position);
    if (separation === null || anchorReach === null || anchorReach === undefined || separation <= anchorReach) return false;
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
    if (anchorId === null || queries.tokenPosition(state, anchorId) === null) return null;
    const anchorPosition = minimumSpaceLine(
      combatantSpace(state, actorId),
      combatantSpace(state, anchorId),
    ).targetCell;
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

type MonsterSpellSource = MonsterSpellcastingAction |
  Extract<import('../combat/statblock').MonsterBonusAction, { readonly kind: 'spell_choice' }>;

function sourceSpellcastingAction(
  state: EncounterState,
  actorId: CombatantId,
  slot: 'main' | 'bonus',
  use: Extract<EngineMainActionUse | EngineBonusActionUse, { readonly kind: 'cast_spell' }>,
): MonsterSpellSource | null {
  const source = slot === 'main' ? monsterActions(state, actorId) : monsterBonusActions(state, actorId);
  const action = source.find(
    (candidate): candidate is MonsterSpellSource =>
      (candidate.kind === 'spell_choice'
        ? candidate.id === use.sourceActionId && slot === 'bonus'
        : candidate.kind === 'spellcasting' && candidate.id === use.sourceActionId &&
          candidate.actionEconomy === (slot === 'main' ? 'action' : 'bonus_action')),
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
        use.components.some((component) => component.kind === 'attack'
          ? targetUse(state, actorId, component, queries) === null
          : savingThrowTargetUse(state, actorId, component, queries) === null)) {
        return 'MULTIATTACK_COMBINATION_ILLEGAL';
      }
      const legal = legalMultiattackCombinations(declaration, actions);
      return legal.some((combination) => combination.every((component, index) =>
        component.kind === use.components[index]?.kind && component.id === use.components[index]?.actionId))
        ? null
        : 'MULTIATTACK_COMBINATION_ILLEGAL';
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
        (action.reach === 'adjacent' &&
          minimumSpaceDistanceToCells(combatantSpace(state, actorId), object.footprint) > 5) ||
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
  omittedRiders: readonly EngineOmittedRider[],
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
          resolved.push({
            slot: slot.slot,
            kind: component.kind,
            actionId: component.actionId,
            spellId: null,
            targetIds: [targetId],
            objectId: null,
            omittedRiders: component.omittedRiders,
            multiattackComponent: true,
          });
        }
        break;
      case 'cast_spell': resolved.push({
        slot: slot.slot,
        kind: use.kind,
        actionId: use.sourceActionId,
        spellId: use.spellId,
        targetIds: targets,
        objectId: null,
        omittedRiders: omittedRiders.filter((rider) => rider.sourceActionId === use.sourceActionId),
        ...(!('selectedCondition' in use) || use.selectedCondition === undefined
          ? {}
          : { selectedCondition: use.selectedCondition }),
        ...(use.area === null ? {} : { area: use.area }),
      }); break;
      case 'use_world_object': resolved.push({ slot: slot.slot, kind: use.kind, actionId: use.actionId, spellId: null, targetIds: [], objectId: use.objectId, omittedRiders: [] }); break;
      case 'attack':
      case 'saving_throw': resolved.push({
        slot: slot.slot,
        kind: use.kind,
        actionId: use.actionId,
        spellId: null,
        targetIds: targets,
        objectId: null,
        omittedRiders: omittedRiders.filter((rider) => rider.sourceActionId === use.actionId),
      }); break;
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': resolved.push({ slot: slot.slot, kind: use.kind, actionId: engineActionId(use.kind), spellId: null, targetIds: [], objectId: null, omittedRiders: [] }); break;
    }
  }
  return resolved;
}

export function resolveEngineActorOption(
  state: EncounterState,
  option: EngineOfferableOption,
  environment: EngineOptionEnvironment,
): OptionResolution {
  const boundDigest = optionEnvironmentDigests.get(option);
  if (boundDigest === undefined || boundDigest !== environment.digest) {
    return refused(
      'OFFER_ENVIRONMENT_MISMATCH',
      `${option.actorId}: option was not created by the bound offer environment`,
    );
  }
  const queries = environment.queries;
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
  const actionSlots = resolvedUses(state, option.actorId, option.actionSlots, queries, option.omittedRiders);
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
      omittedRiders: option.omittedRiders,
    },
  };
}

function choiceFitsOption(
  option: EngineOfferableOption,
  choice: EngineActivationChoice | null | undefined,
): boolean {
  const slot = option.activationChoice;
  if (slot === undefined || slot === null) return choice === null || choice === undefined;
  if (choice === null || choice === undefined || choice.kind !== slot.kind) return false;
  switch (slot.kind) {
    case 'command_word':
      return choice.kind === 'command_word' && slot.values.some((value) => value === choice.value);
    case 'unicorns_blessing_spell':
      return choice.kind === 'unicorns_blessing_spell' && slot.values.some((value) => value === choice.value);
    case 'dispel_evil_and_good_mode':
      return choice.kind === 'dispel_evil_and_good_mode' && slot.values.some((value) => value === choice.value);
    case 'calm_emotions_per_target': {
      if (choice.kind !== 'calm_emotions_per_target') return false;
      const expected = [...slot.targetIds].sort();
      const actual = choice.selections.map((entry) => entry.targetId).sort();
      return expected.length === actual.length && expected.every((value, index) => value === actual[index]) &&
        new Set(actual).size === actual.length &&
        choice.selections.every((entry) => slot.values.some((value) => value === entry.mode));
    }
  }
}

export function mechanicsWithChoice(
  mechanics: ResolvedTurnMechanics,
  choice: EngineActivationChoice | null | undefined,
  option: EngineOfferableOption,
): ResolvedTurnMechanics {
  if (choice === null || choice === undefined) return mechanics;
  const owningSpellIds = choice.kind === 'command_word'
    ? ['command']
    : choice.kind === 'unicorns_blessing_spell'
      ? ['cure-wounds', 'lesser-restoration']
      : choice.kind === 'dispel_evil_and_good_mode'
        ? ['dispel-evil-and-good']
        : ['calm-emotions'];
  const owner = option.actionSlots.flatMap((slot) => slot.use.kind === 'cast_spell'
    ? [{ slot: slot.slot, use: slot.use }]
    : []).find((slot) => owningSpellIds.includes(slot.use.spellId) &&
      (choice.kind !== 'unicorns_blessing_spell' || slot.slot === 'bonus'));
  if (owner === undefined) return mechanics;
  return {
    ...mechanics,
    actionSlots: mechanics.actionSlots.map((slot) => {
      if (slot.kind !== 'cast_spell' || slot.slot !== owner.slot ||
        slot.actionId !== owner.use.sourceActionId || slot.spellId !== owner.use.spellId) return slot;
      return {
        ...slot,
        spellId: choice.kind === 'unicorns_blessing_spell' ? engineSpellId(choice.value) : slot.spellId,
        activationChoice: choice,
      };
    }),
  };
}

export function availableEngineActorOptions(
  state: EncounterState,
  actorId: CombatantId,
  environment: EngineOptionEnvironment,
  revision = state.revision,
): readonly EngineOfferableOption[] {
  return engineActorOptionsForEnvironment(state, actorId, environment, revision).offerable
    .filter((option) => resolveEngineActorOption(state, option, environment).valid);
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
  environment: EngineOptionEnvironment,
): PureTurnProposalResolver {
  return Object.freeze({
    resolve(state: EncounterState, proposal: EngineTurnProposal): EngineProposalResolution {
      const options = availableEngineActorOptions(
        state,
        proposal.actorId,
        environment,
        proposal.expectedRevision,
      );
      const primary = options.find((option) => option.optionId === proposal.primaryOptionId);
      if (primary !== undefined) {
        const resolution = resolveEngineActorOption(state, primary, environment);
        if (resolution.valid) {
          const fallback = proposal.fallbackOptionId === null
            ? null
            : options.find((option) => option.optionId === proposal.fallbackOptionId) ?? null;
          if (!choiceFitsOption(primary, proposal.activationChoice)) {
            return { valid: false, selectedBranch: 'none', refusals: [{ branch: 'primary', code: 'ACTIVATION_CHOICE_INVALID', summary: `${proposal.actorId}: activation choice does not match the offered option` }] };
          }
          return accepted('primary', primary, mechanicsWithChoice(resolution.mechanics, proposal.activationChoice, primary), primary, fallback);
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
      const resolution = resolveEngineActorOption(state, fallback, environment);
      return resolution.valid
        ? choiceFitsOption(fallback, proposal.activationChoice)
          ? accepted('fallback', fallback, mechanicsWithChoice(resolution.mechanics, proposal.activationChoice, fallback), primary ?? fallback, fallback, [primaryRefusal])
          : { valid: false, selectedBranch: 'none', refusals: [primaryRefusal, { branch: 'fallback', code: 'ACTIVATION_CHOICE_INVALID', summary: `${proposal.actorId}: activation choice does not match the fallback option` }] }
        : { valid: false, selectedBranch: 'none', refusals: [primaryRefusal, { branch: 'fallback', code: resolution.code, summary: resolution.summary }] };
    },
  });
}
