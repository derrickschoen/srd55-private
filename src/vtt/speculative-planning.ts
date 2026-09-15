import { canonicalJson } from '../commands/canonical-json';
import { combatantsAreAllies } from '../combat/allies';
import {
  combatantSpace,
  combatantConditions,
  type EncounterState,
  type LifeState,
} from '../combat/encounter';
import { isIncapacitated } from '../combat/conditions';
import { persistentAreaTouchesSpace } from '../combat/persistent-areas';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  canonicalEngineQueryPort,
  engineConcentrationActive,
  enginePlanningHitPointMaximum,
  enginePlanningHitPoints,
  enginePlanningSemanticZones,
  enginePlanningSpeedFeet,
  type EngineQueryPort,
} from './engine-query-port';
import { availableEngineActorOptions, type EngineOfferableOption, type EngineTurnProposal } from './intent-resolver';
import { projectFutureMonsterTurns } from './monster-planning-state';
import { buildOfferEnvironment } from './offers/build-offer-environment';
import type { EngineOptionEnvironment } from './offers/offer-environment';
import type {
  EngineSelectorRef,
  GuardConditionIdentity,
  GuardResource,
  HostScenario,
  HostSplitCandidate,
  HpThresholdPercent,
  ScenarioFactAtom,
} from './speculative-plan-types';

const transitionalLegacyOfferEnvironment = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

export type GuardNoMatchReason =
  | 'FACT_FALSE'
  | 'SELECTOR_UNRESOLVED'
  | 'SELECTOR_ALIASING'
  | 'TOKEN_UNAVAILABLE'
  | 'SUBJECT_NOT_LIVING'
  | 'HP_MAXIMUM_UNAVAILABLE'
  | 'ACTION_UNAVAILABLE'
  | 'VISIBILITY_UNAVAILABLE'
  | 'ZONE_UNAVAILABLE'
  | 'RESOURCE_UNAVAILABLE';

export type ScenarioFactValue = LifeState | boolean | number | 'inside' | 'outside' | null;

export type GuardAtomEvaluation =
  | { readonly matches: true; readonly actual: ScenarioFactValue }
  | {
      readonly matches: false;
      readonly actual: ScenarioFactValue;
      readonly failure: GuardNoMatchReason;
    };

function resolveSelector(
  state: EncounterState,
  reference: EngineSelectorRef,
  queries: EngineQueryPort,
): CombatantId | null {
  const resolved = queries.resolveTarget(state, reference.actorId, reference.selector);
  return resolved !== null && queries.combatant(state, resolved) !== null ? resolved : null;
}

function failure(
  reason: GuardNoMatchReason,
  actual: ScenarioFactValue = null,
): GuardAtomEvaluation {
  return { matches: false, actual, failure: reason };
}

function compared(actual: ScenarioFactValue, expected: ScenarioFactValue): GuardAtomEvaluation {
  return actual === expected ? { matches: true, actual } : failure('FACT_FALSE', actual);
}

function pair(
  state: EncounterState,
  left: EngineSelectorRef,
  right: EngineSelectorRef,
  queries: EngineQueryPort,
): { readonly left: CombatantId; readonly right: CombatantId } | GuardAtomEvaluation {
  const resolvedLeft = resolveSelector(state, left, queries);
  const resolvedRight = resolveSelector(state, right, queries);
  if (resolvedLeft === null || resolvedRight === null) return failure('SELECTOR_UNRESOLVED');
  if (resolvedLeft === resolvedRight) return failure('SELECTOR_ALIASING');
  return { left: resolvedLeft, right: resolvedRight };
}

function isEvaluation(value: ReturnType<typeof pair>): value is GuardAtomEvaluation {
  return 'matches' in value;
}

function sameCondition(
  left: GuardConditionIdentity,
  right: GuardConditionIdentity,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/** Total, side-effect-free evaluation against the actual canonical encounter state. */
export function evaluateScenarioFact(
  state: EncounterState,
  atom: ScenarioFactAtom,
  queries: EngineQueryPort = canonicalEngineQueryPort,
): GuardAtomEvaluation {
  switch (atom.kind) {
    case 'life_state_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      return compared(queries.combatant(state, subjectId)?.life ?? null, atom.value);
    }
    case 'hp_percent': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const subject = queries.combatant(state, subjectId);
      if (subject?.life !== 'living') return failure('SUBJECT_NOT_LIVING');
      const maximum = enginePlanningHitPointMaximum(state, subjectId);
      if (!Number.isFinite(maximum) || maximum <= 0) return failure('HP_MAXIMUM_UNAVAILABLE');
      const current = enginePlanningHitPoints(state, subjectId);
      const actual = atom.comparison === 'at_most'
        ? current * 100 <= maximum * atom.threshold
        : current * 100 > maximum * atom.threshold;
      return compared(actual, true);
    }
    case 'adjacency_is': {
      const subjects = pair(state, atom.left, atom.right, queries);
      if (isEvaluation(subjects)) return subjects;
      const separation = queries.spaceDistance(state, subjects.left, subjects.right);
      if (separation === null) return failure('TOKEN_UNAVAILABLE');
      return compared(separation <= 5, atom.value);
    }
    case 'within_action_reach_is': {
      const subjects = pair(state, atom.actor, atom.target, queries);
      if (isEvaluation(subjects)) return subjects;
      if (!queries.actions(state, subjects.left).some((action) => action.id === atom.actionId)) {
        return failure('ACTION_UNAVAILABLE');
      }
      const reach = queries.reach(state, {
        actorId: subjects.left,
        targetId: subjects.right,
        actionId: atom.actionId,
      });
      if (!reach.legal && reach.codes.some((code) => code !== 'target_out_of_range')) {
        return failure('ACTION_UNAVAILABLE');
      }
      return compared(reach.legal, atom.value);
    }
    case 'visibility_is': {
      const subjects = pair(state, atom.observer, atom.subject, queries);
      if (isEvaluation(subjects)) return subjects;
      const visibility = queries.visibility(state, subjects.left, subjects.right);
      if (visibility === null) return failure('VISIBILITY_UNAVAILABLE');
      return compared(visibility.visible, atom.value);
    }
    case 'zone_occupancy_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const zone = enginePlanningSemanticZones(state).find((candidate) => candidate.id === atom.zoneId);
      if (zone === undefined || !zone.active) return failure('ZONE_UNAVAILABLE');
      const actual = zone.memberCombatantIds.includes(subjectId) ? 'inside' : 'outside';
      return compared(actual, atom.value);
    }
    case 'condition_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const present = combatantConditions(state, subjectId).some((condition) =>
        sameCondition(condition, atom.condition));
      return compared(present, atom.present);
    }
    case 'resource_available_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const subject = queries.combatant(state, subjectId);
      if (subject === null) return failure('SELECTOR_UNRESOLVED');
      let available: boolean;
      switch (atom.resource.kind) {
        case 'reaction': available = subject.turn.reactionAvailable === true; break;
        case 'legendary_action': {
          if (subject.legendary === undefined) return failure('RESOURCE_UNAVAILABLE');
          available = subject.legendary.actionUsesRemaining > 0;
          break;
        }
        case 'legendary_resistance': {
          if (subject.legendary === undefined) return failure('RESOURCE_UNAVAILABLE');
          available = subject.legendary.resistanceUsesRemaining > 0;
          break;
        }
        case 'spell_slot': {
          const level = atom.resource.level;
          const slot = subject.spellSlots.find((candidate) => candidate.level === level);
          if (slot === undefined) return failure('RESOURCE_UNAVAILABLE');
          available = slot.remaining > 0;
          break;
        }
      }
      return compared(available, atom.available);
    }
    case 'concentration_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      return compared(engineConcentrationActive(state, subjectId), atom.active);
    }
  }
}

function selectorKey(reference: EngineSelectorRef): string {
  return canonicalJson(reference);
}

function compareCanonicalBytes(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const sharedLength = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftByte = leftBytes[index];
    const rightByte = rightBytes[index];
    if (leftByte === undefined || rightByte === undefined) break;
    if (leftByte !== rightByte) return leftByte - rightByte;
  }
  return leftBytes.length - rightBytes.length;
}

/** Canonical identity excludes the atom's truth value but includes its full typed subject. */
export function scenarioFactKey(atom: ScenarioFactAtom): string {
  switch (atom.kind) {
    case 'life_state_is': return `life:${selectorKey(atom.subject)}`;
    case 'hp_percent': return `hp:${selectorKey(atom.subject)}:${String(atom.threshold)}`;
    case 'adjacency_is': return `adjacency:${selectorKey(atom.left)}:${selectorKey(atom.right)}`;
    case 'within_action_reach_is': return `reach:${selectorKey(atom.actor)}:${atom.actionId}:${selectorKey(atom.target)}`;
    case 'visibility_is': return `visibility:${selectorKey(atom.observer)}:${selectorKey(atom.subject)}`;
    case 'zone_occupancy_is': return `zone:${selectorKey(atom.subject)}:${atom.zoneId}`;
    case 'condition_is': return `condition:${selectorKey(atom.subject)}:${canonicalJson(atom.condition)}`;
    case 'resource_available_is': return `resource:${selectorKey(atom.subject)}:${canonicalJson(atom.resource)}`;
    case 'concentration_is': return `concentration:${selectorKey(atom.subject)}`;
  }
}

export function complementScenarioFact(
  atom: ScenarioFactAtom,
  lifeStateFlip?: LifeState,
): ScenarioFactAtom {
  switch (atom.kind) {
    case 'life_state_is': {
      if (lifeStateFlip === undefined || lifeStateFlip === atom.value) {
        throw new RangeError('A life-state complement requires one distinct host-proven reachable state.');
      }
      return { ...atom, value: lifeStateFlip };
    }
    case 'hp_percent': return { ...atom, comparison: atom.comparison === 'at_most' ? 'above' : 'at_most' };
    case 'adjacency_is': return { ...atom, value: !atom.value };
    case 'within_action_reach_is': return { ...atom, value: !atom.value };
    case 'visibility_is': return { ...atom, value: !atom.value };
    case 'zone_occupancy_is': return { ...atom, value: atom.value === 'inside' ? 'outside' : 'inside' };
    case 'condition_is': return { ...atom, present: !atom.present };
    case 'resource_available_is': return { ...atom, available: !atom.available };
    case 'concentration_is': return { ...atom, active: !atom.active };
  }
}

export function scenarioFactsAreComplements(
  left: ScenarioFactAtom,
  right: ScenarioFactAtom,
): boolean {
  if (scenarioFactKey(left) !== scenarioFactKey(right) || left.kind !== right.kind) return false;
  if (left.kind === 'life_state_is' && right.kind === 'life_state_is') return left.value !== right.value;
  try {
    return canonicalJson(complementScenarioFact(left)) === canonicalJson(right);
  } catch {
    return false;
  }
}

function directRef(actorId: CombatantId, subjectId: CombatantId): EngineSelectorRef {
  return { actorId, selector: { kind: 'combatant', combatantId: subjectId } };
}

export interface HostBaselineProposalPlanner {
  plan(
    state: EncounterState,
    actors: readonly CombatantId[],
    environment?: EngineOptionEnvironment | EngineQueryPort,
  ): readonly EngineTurnProposal[];
}

function offerQueries(environment: EngineOptionEnvironment | EngineQueryPort): EngineQueryPort {
  return 'binding' in environment ? environment.queries : environment;
}

function optionIsOffensive(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' &&
    (slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw'));
}

export const hostBaselineProposalPlanner: HostBaselineProposalPlanner = Object.freeze({
  plan(
    state: EncounterState,
    actors: readonly CombatantId[],
    environment: EngineOptionEnvironment | EngineQueryPort = transitionalLegacyOfferEnvironment,
  ): readonly EngineTurnProposal[] {
    const queries = offerQueries(environment);
    const planningState = projectFutureMonsterTurns(state, actors);
    return actors.flatMap((actorId) => {
      const options = availableEngineActorOptions(planningState, actorId, environment);
      const primary = options.find(optionIsOffensive) ?? options[0];
      if (primary === undefined) return [];
      const fallback = options.find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
      return [{ actorId, expectedRevision: state.revision, primaryOptionId: primary.optionId,
        fallbackOptionId: fallback?.optionId ?? null,
        reason: 'Use the strongest currently available offensive option.',
        overrideJustification: null }];
    });
  },
});

export interface ProposalFactDependency {
  readonly proposalActorId: CombatantId;
  readonly baseline: ScenarioFactAtom;
  readonly flipped: ScenarioFactAtom;
}

function hpThreshold(current: number, maximum: number): HpThresholdPercent {
  if (current * 100 <= maximum * 25) return 25;
  if (current * 100 <= maximum * 50) return 50;
  if (current * 100 <= maximum * 75) return 75;
  return 75;
}

function addDependency(
  entries: ProposalFactDependency[],
  proposalActorId: CombatantId,
  baseline: ScenarioFactAtom,
  lifeFlip?: LifeState,
): void {
  entries.push({
    proposalActorId,
    baseline,
    flipped: complementScenarioFact(baseline, lifeFlip),
  });
}

function optionSelectors(option: EngineOfferableOption): readonly EngineSelectorRef[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    const selectors = use.kind === 'attack' || use.kind === 'saving_throw' ? [use.target]
      : use.kind === 'multiattack' ? use.components.map((component) => component.target)
        : use.kind === 'cast_spell' ? use.targets : [];
    return selectors.map((selector) => ({ actorId: option.actorId, selector }));
  });
}

export function extractProposalFactDependencies(
  state: EncounterState,
  options: readonly EngineOfferableOption[],
  queries: EngineQueryPort = canonicalEngineQueryPort,
): readonly ProposalFactDependency[] {
  const entries: ProposalFactDependency[] = [];
  for (const option of options) {
    const actorRef = directRef(option.actorId, option.actorId);
    const actor = queries.combatant(state, option.actorId);
    if (actor === null) continue;
    addDependency(entries, option.actorId, {
      kind: 'life_state_is', subject: actorRef, value: actor.life,
    }, actor.life === 'living' ? 'dead' : 'living');
    addDependency(entries, option.actorId, {
      kind: 'resource_available_is', subject: actorRef,
      resource: { kind: 'reaction' }, available: actor.turn.reactionAvailable,
    });
    addDependency(entries, option.actorId, {
      kind: 'concentration_is', subject: actorRef,
      active: engineConcentrationActive(state, option.actorId),
    });
    if (actor.legendary !== undefined) {
      for (const resource of [{ kind: 'legendary_action' }, { kind: 'legendary_resistance' }] as const) {
        const available = resource.kind === 'legendary_action'
          ? actor.legendary.actionUsesRemaining > 0
          : actor.legendary.resistanceUsesRemaining > 0;
        addDependency(entries, option.actorId, {
          kind: 'resource_available_is', subject: actorRef, resource, available,
        });
      }
    }
    for (const targetRef of optionSelectors(option)) {
    const targetId = resolveSelector(state, targetRef, queries);
    if (targetId === null) continue;
    const target = queries.combatant(state, targetId);
    if (target === null) continue;
    addDependency(entries, option.actorId, {
      kind: 'life_state_is', subject: targetRef, value: target.life,
    }, target.life === 'living' ? 'dead' : 'living');
    if (target.life === 'living') {
      const maximum = enginePlanningHitPointMaximum(state, targetId);
      if (maximum > 0) {
        const threshold = hpThreshold(enginePlanningHitPoints(state, targetId), maximum);
        const comparison = enginePlanningHitPoints(state, targetId) * 100 <= maximum * threshold
          ? 'at_most' as const
          : 'above' as const;
        addDependency(entries, option.actorId, {
          kind: 'hp_percent', subject: targetRef, comparison, threshold,
        });
      }
    }
    const separation = queries.spaceDistance(state, option.actorId, targetId);
    if (separation !== null) {
      addDependency(entries, option.actorId, {
        kind: 'adjacency_is', left: actorRef, right: targetRef,
        value: separation <= 5,
      });
    }
    for (const slot of option.actionSlots) {
      const use = slot.use;
      const actionIds = use.kind === 'multiattack' ? use.components.map((component) => component.actionId)
        : use.kind === 'attack' || use.kind === 'saving_throw' ? [use.actionId] : [];
      for (const actionId of actionIds) if (queries.actions(state, option.actorId).some((action) => action.id === actionId)) {
        addDependency(entries, option.actorId, {
          kind: 'within_action_reach_is', actor: actorRef, actionId, target: targetRef,
          value: queries.reach(state, { actorId: option.actorId, targetId, actionId }).legal,
        });
      }
    }
    const visibility = queries.visibility(state, option.actorId, targetId);
    if (visibility !== null) {
      addDependency(entries, option.actorId, {
        kind: 'visibility_is', observer: actorRef, subject: targetRef, value: visibility.visible,
      });
    }
    for (const zone of enginePlanningSemanticZones(state)) {
      if (!zone.active) continue;
      addDependency(entries, option.actorId, {
        kind: 'zone_occupancy_is', subject: targetRef, zoneId: zone.id,
        value: zone.memberCombatantIds.includes(targetId) ? 'inside' : 'outside',
      });
    }
    for (const condition of combatantConditions(state, targetId)) {
      addDependency(entries, option.actorId, {
        kind: 'condition_is', subject: targetRef, condition, present: true,
      });
    }
    addDependency(entries, option.actorId, {
      kind: 'concentration_is', subject: targetRef,
      active: engineConcentrationActive(state, targetId),
    });
    }
  }
  return entries;
}

function selectorRefs(atom: ScenarioFactAtom): readonly EngineSelectorRef[] {
  switch (atom.kind) {
    case 'life_state_is':
    case 'hp_percent':
    case 'zone_occupancy_is':
    case 'condition_is':
    case 'resource_available_is':
    case 'concentration_is': return [atom.subject];
    case 'adjacency_is': return [atom.left, atom.right];
    case 'within_action_reach_is': return [atom.actor, atom.target];
    case 'visibility_is': return [atom.observer, atom.subject];
  }
}

function candidateAdvertised(
  state: EncounterState,
  baseline: ScenarioFactAtom,
  queries: EngineQueryPort,
): boolean {
  const resolved = selectorRefs(baseline).map((reference) => resolveSelector(state, reference, queries));
  if (resolved.some((id) => id === null)) return false;
  if (baseline.kind === 'hp_percent') {
    const id = resolved[0];
    return id !== undefined && id !== null && queries.combatant(state, id)?.life === 'living';
  }
  if (baseline.kind === 'within_action_reach_is') {
    const id = resolved[0];
    return id !== undefined && id !== null && queries.actions(state, id).some((action) => action.id === baseline.actionId);
  }
  if (baseline.kind === 'zone_occupancy_is') {
    return enginePlanningSemanticZones(state).some((zone) => zone.id === baseline.zoneId && zone.active);
  }
  if (baseline.kind === 'resource_available_is') {
    const id = resolved[0];
    const subject = id === undefined || id === null ? null : queries.combatant(state, id);
    if (subject === null) return false;
    switch (baseline.resource.kind) {
      case 'reaction': return true;
      case 'legendary_action':
      case 'legendary_resistance': return subject.legendary !== undefined;
      case 'spell_slot': {
        const level = baseline.resource.level;
        return subject.spellSlots.some((slot) => slot.level === level);
      }
    }
  }
  return true;
}

export function maximumInfluenceRadiusFeet(
  state: EncounterState,
  playerId: CombatantId,
): number {
  const player = state.combatants.find((candidate) => candidate.profile.id === playerId);
  if (player?.profile.kind !== 'player_character' || player.life !== 'living') return 0;
  if (isIncapacitated(combatantConditions(state, playerId))) return 0;
  const awaitingOwnTurn = state.activeCombatant !== playerId;
  const speed = enginePlanningSpeedFeet(state, playerId);
  const remaining = awaitingOwnTurn ? speed : player.turn.movement.remaining;
  const dash = awaitingOwnTurn || player.turn.action.kind !== 'spent' ? speed : 0;
  return Math.max(0, remaining + dash);
}

function factCanChangeThroughMovement(atom: ScenarioFactAtom): boolean {
  return atom.kind === 'adjacency_is' || atom.kind === 'within_action_reach_is' ||
    atom.kind === 'visibility_is' || atom.kind === 'zone_occupancy_is';
}

function movedState(
  state: EncounterState,
  playerId: CombatantId,
  destination: { readonly column: number; readonly row: number },
): EncounterState {
  const moved: EncounterState = {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === playerId
      ? { ...token, position: { ...destination } }
      : token),
  };
  return {
    ...moved,
    persistentAreas: moved.persistentAreas.map((area) => {
      const origin = area.origin;
      const anchorCells = origin.kind === 'anchored'
        ? moved.tokens.some((token) => token.combatantId === origin.combatant)
          ? combatantSpace(moved, origin.combatant).cells
          : null
        : origin.kind === 'anchored_to_object'
          ? moved.worldObjects.find((object) => object.id === origin.object)?.footprint ?? null
          : null;
      const eligible = (subjectId: CombatantId): boolean => {
        switch (area.targetFilter.kind) {
          case 'all': return true;
          case 'selected': return area.targetFilter.combatants.includes(subjectId);
          case 'allies': return combatantsAreAllies(moved, subjectId, area.owner);
          case 'enemies': return !combatantsAreAllies(moved, subjectId, area.owner);
        }
      };
      const members = moved.combatants
        .filter((subject) => subject.life !== 'dead' && eligible(subject.profile.id))
        .flatMap((subject) => {
          const token = moved.tokens.find((candidate) => candidate.combatantId === subject.profile.id);
          return token !== undefined && persistentAreaTouchesSpace(
            area,
            combatantSpace(moved, subject.profile.id).cells,
            anchorCells,
            moved,
          )
            ? [subject.profile.id]
            : [];
        })
        .sort(compareCanonicalBytes);
      return { ...area, members };
    }),
  };
}

export function canPlayerFlipScenarioFact(
  state: EncounterState,
  playerId: CombatantId,
  flipped: ScenarioFactAtom,
  queries: EngineQueryPort = canonicalEngineQueryPort,
): boolean {
  if (!factCanChangeThroughMovement(flipped)) return false;
  const radius = maximumInfluenceRadiusFeet(state, playerId);
  if (radius <= 0) return false;
  const ordinary = state.combatants.find((candidate) => candidate.profile.id === playerId)
    ?.turn.movement.remaining ?? 0;
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const candidate = movedState(state, playerId, { column, row });
      if (!evaluateScenarioFact(candidate, flipped, queries).matches) continue;
      const path = queries.path(state, {
        actorId: playerId,
        destination: { column, row },
        movement: radius > ordinary ? 'dash' : 'normal',
        maximumFeet: radius,
      });
      if (path.legal) return true;
    }
  }
  return false;
}

function subjectIdentity(atom: ScenarioFactAtom): string | null {
  switch (atom.kind) {
    case 'life_state_is':
    case 'hp_percent': return selectorKey(atom.subject);
    default: return null;
  }
}

function shadowedBy(higher: ScenarioFactAtom, lower: ScenarioFactAtom): boolean {
  const higherSubject = subjectIdentity(higher);
  return higherSubject !== null && higherSubject === subjectIdentity(lower) &&
    higher.kind !== lower.kind;
}

export function computeHostSplitCandidates(
  state: EncounterState,
  dependencies: readonly ProposalFactDependency[],
  unactedPlayerIds: readonly CombatantId[],
  queries: EngineQueryPort = canonicalEngineQueryPort,
): readonly HostSplitCandidate[] {
  const grouped = new Map<string, {
    readonly baseline: ScenarioFactAtom;
    readonly flipped: ScenarioFactAtom;
    readonly proposalActorIds: Set<CombatantId>;
  }>();
  const canonicalPlayerIds = [...new Set(unactedPlayerIds)].sort(compareCanonicalBytes);
  for (const dependency of dependencies) {
    const key = scenarioFactKey(dependency.baseline);
    if (!scenarioFactsAreComplements(dependency.baseline, dependency.flipped) ||
      !candidateAdvertised(state, dependency.baseline, queries)) continue;
    const prior = grouped.get(key);
    if (prior === undefined) {
      grouped.set(key, {
        baseline: dependency.baseline,
        flipped: dependency.flipped,
        proposalActorIds: new Set([dependency.proposalActorId]),
      });
    } else if (canonicalJson(prior.baseline) === canonicalJson(dependency.baseline) &&
      canonicalJson(prior.flipped) === canonicalJson(dependency.flipped)) {
      prior.proposalActorIds.add(dependency.proposalActorId);
    }
  }
  const scored = [...grouped.entries()].flatMap(([factKey, dependency]) => {
    const influences = canonicalPlayerIds
      .flatMap((playerId) => {
        const radius = maximumInfluenceRadiusFeet(state, playerId);
        const canFlip = canPlayerFlipScenarioFact(state, playerId, dependency.flipped, queries);
        return radius > 0 && canFlip
          ? [{ playerId, radius }]
          : [];
      });
    const referencedProposalCount = dependency.proposalActorIds.size;
    const summedMovementRadiusFeet = influences.reduce((sum, entry) => sum + entry.radius, 0);
    const volatilityScore = referencedProposalCount * summedMovementRadiusFeet;
    return volatilityScore === 0 ? [] : [{
      factKey,
      baseline: dependency.baseline,
      flipped: dependency.flipped,
      referencedProposalCount,
      influencingPlayerIds: influences.map((entry) => entry.playerId),
      summedMovementRadiusFeet,
      volatilityScore,
    }];
  });
  scored.sort((left, right) =>
    right.volatilityScore - left.volatilityScore ||
    right.referencedProposalCount - left.referencedProposalCount ||
    compareCanonicalBytes(left.factKey, right.factKey));
  const retained: typeof scored = [];
  for (const candidate of scored) {
    if (retained.some((higher) => shadowedBy(higher.baseline, candidate.baseline))) continue;
    retained.push(candidate);
  }
  return retained.slice(0, 8).map((candidate, index) => ({
    ...candidate,
    candidateId: `candidate:${sha256(canonicalJson({
      factKey: candidate.factKey,
      baseline: candidate.baseline,
      flipped: candidate.flipped,
    })).slice(0, 32)}`,
    rank: (index + 1) as HostSplitCandidate['rank'],
  }));
}

export function buildHostScenarioMenu(
  state: EncounterState,
  actors: readonly CombatantId[],
  unactedPlayerIds: readonly CombatantId[],
  environment: EngineOptionEnvironment | EngineQueryPort = transitionalLegacyOfferEnvironment,
): {
  readonly baselineProposals: readonly EngineTurnProposal[];
  readonly scenarioMenu: readonly HostSplitCandidate[];
  readonly scenarios: readonly HostScenario[];
} {
  const queries = offerQueries(environment);
  const planningState = projectFutureMonsterTurns(state, actors);
  const baselineProposals = hostBaselineProposalPlanner.plan(planningState, actors, environment);
  const baselineOptions = baselineProposals.flatMap((proposal) =>
    availableEngineActorOptions(planningState, proposal.actorId, environment).filter((option) =>
      option.optionId === proposal.primaryOptionId));
  const scenarioMenu = computeHostSplitCandidates(
    state,
    extractProposalFactDependencies(state, baselineOptions, queries),
    unactedPlayerIds,
    queries,
  );
  return { baselineProposals, scenarioMenu, scenarios: compileHostScenarios(scenarioMenu) };
}

export function compileHostScenarios(
  menu: readonly HostSplitCandidate[],
): readonly HostScenario[] {
  if (menu.length === 0) return [];
  if (menu.length > 8) throw new RangeError('A host scenario menu contains at most eight candidates.');
  const ordered = [...menu].sort((left, right) => left.rank - right.rank);
  if (ordered.some((candidate, index) => candidate.rank !== index + 1)) {
    throw new RangeError('Host split-candidate ranks must be contiguous and canonical.');
  }
  const selected = ordered.slice(0, 3);
  if (new Set(selected.map((candidate) => candidate.factKey)).size !== selected.length ||
    selected.some((candidate) => !scenarioFactsAreComplements(candidate.baseline, candidate.flipped))) {
    throw new RangeError('Host scenarios require unique fact keys and exact complements.');
  }
  const scenarioSetKey = selected.map((candidate) => candidate.candidateId);
  return selected.map((_candidate, index) => {
    const ordinal = (index + 2) as HostScenario['ordinal'];
    return {
      scenarioId: `scenario:${sha256(canonicalJson({ scenarioSetKey, ordinal })).slice(0, 32)}`,
      ordinal,
      kind: 'single_candidate_flip' as const,
      flippedCandidateId: selected[index]?.candidateId ?? null,
      facts: selected.map((candidate, factIndex) =>
        factIndex === index ? candidate.flipped : candidate.baseline),
    };
  }).reduce<HostScenario[]>((scenarios, scenario) => {
    if (scenarios.length === 0) {
      scenarios.push({
        scenarioId: `scenario:${sha256(canonicalJson({ scenarioSetKey, ordinal: 1 })).slice(0, 32)}`,
        ordinal: 1,
        kind: 'no_material_change',
        flippedCandidateId: null,
        facts: selected.map((candidate) => candidate.baseline),
      });
    }
    scenarios.push(scenario);
    return scenarios;
  }, []);
}

export type HostScenarioSelection =
  | {
      readonly kind: 'matched';
      readonly scenario: HostScenario;
      readonly evaluations: readonly GuardAtomEvaluation[];
    }
  | {
      readonly kind: 'no_match';
      readonly reason: 'NO_SCENARIO_MATCH' | 'OVERLAPPING_SCENARIOS';
      readonly evaluations: readonly {
        readonly scenarioId: string;
        readonly facts: readonly GuardAtomEvaluation[];
      }[];
    };

/** Total selection: returns one branch or an explicit no-match value; it never first-matches. */
export function evaluateHostScenarios(
  state: EncounterState,
  scenarios: readonly HostScenario[],
  queries: EngineQueryPort = canonicalEngineQueryPort,
): HostScenarioSelection {
  const evaluations = scenarios.map((scenario) => ({
    scenario,
    facts: scenario.facts.map((fact) => evaluateScenarioFact(state, fact, queries)),
  }));
  const matching = evaluations.filter((entry) => entry.facts.every((fact) => fact.matches));
  if (matching.length === 1) {
    const selected = matching[0];
    if (selected === undefined) throw new Error('One matching scenario was not retained.');
    return { kind: 'matched', scenario: selected.scenario, evaluations: selected.facts };
  }
  return {
    kind: 'no_match',
    reason: matching.length === 0 ? 'NO_SCENARIO_MATCH' : 'OVERLAPPING_SCENARIOS',
    evaluations: evaluations.map((entry) => ({
      scenarioId: entry.scenario.scenarioId,
      facts: entry.facts,
    })),
  };
}

export function guardResourceKey(resource: GuardResource): string {
  return canonicalJson(resource);
}
