import { canonicalJson } from '../commands/canonical-json';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { monsterAttackCommand, monsterSavingThrowCommand } from '../combat/monster-commands';
import { restoreMulberry32, type SerializableRng } from '../combat/random';
import {
  monsterSpellResourcePoolId,
  type MonsterAttackAction,
  type MonsterSavingThrowAction,
  type MonsterSpellcastingAction,
} from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import { type CombatantId, type EncounterBranchId, type EncounterSessionId } from '../combat/values';
import type {
  EngineOrdinaryRequestKind,
  EnginePlanAdjustmentMetadata,
  EngineStateCapsule,
} from './engine-state-capsule';
import { canonicalEngineQueryPort, monsterActions, monsterBonusActions } from './engine-query-port';
import {
  availableEngineActorOptions,
  mechanicsWithChoice,
  resolveEngineActorOption,
  type EngineOfferableOption,
  type EngineTurnProposal,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from './intent-resolver';
import { createEngineMcpRuntime } from './mcp/entrypoint';
import { projectEngineInitiativeIntel } from './engine-initiative-intel';
import {
  unattendedReactionOfferResolution,
  type AutoResolvedReactionOffer,
  type ReactionOfferHostPolicy,
} from './reaction-offer-host-policy';
import {
  guidedPendingReactionResolution,
  type GuidedReactionResolution,
  type ReactionGuidanceDeclaration,
} from './reaction-guidance';
import { reduceSessionEncounter } from './session-encounter-reducer';
import type { ScriptedPartyTurnMaterialization } from './scripted-party-round';
import type { HostScenario, HostSplitCandidate } from './speculative-plan-types';

export interface EngineOrdinaryRoundCapsuleRequest {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly requestId: string;
  readonly phase: 'initial' | 'correction';
  readonly room: number;
  readonly historyKind: string;
  readonly requestKind?: EngineOrdinaryRequestKind;
  readonly requestedActorIds?: readonly CombatantId[];
  readonly planAdjustment?: EnginePlanAdjustmentMetadata;
}

export interface EngineSpeculativeRoundCapsuleRequest {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly requestId: string;
  readonly phase: 'speculative';
  readonly room: number;
  readonly historyKind: string;
  readonly requestedActorIds: readonly CombatantId[];
  readonly targetMonsterRound: number;
  readonly refreshGeneration: 0 | 1 | 2;
  readonly scenarioMenu: readonly HostSplitCandidate[];
  readonly scenarios: readonly HostScenario[];
}

export type EngineRoundCapsuleRequest =
  | EngineOrdinaryRoundCapsuleRequest
  | EngineSpeculativeRoundCapsuleRequest;

export interface EngineRoundSnapshot {
  readonly capsule: EngineStateCapsule;
  readonly fixtureJson: string;
}

export interface EngineBoundaryResolutions {
  readonly fallbackResolutions: readonly AutoResolvedReactionOffer[];
  readonly guidedResolutions: readonly GuidedReactionResolution[];
}

export type EngineAppliedProposalBranch = 'primary' | 'fallback' | 'dodge';

export interface EngineProposalDeviation {
  readonly actorId: CombatantId;
  readonly authorizedBranch: 'primary' | 'fallback';
  readonly appliedBranch: EngineAppliedProposalBranch;
  readonly authorizedOptionId: string;
  readonly appliedOptionId: string;
  readonly reasonCodes: readonly (
    | 'branch_changed'
    | 'option_changed'
    | 'degraded_to_dodge'
    | 'remaining_attack_target_dead'
  )[];
  readonly refusalCodes: readonly string[];
}

export interface AuthorizedEngineTurnProposal {
  readonly proposal: EngineTurnProposal;
  readonly option: EngineOfferableOption;
  readonly primaryOption: EngineOfferableOption;
  readonly fallbackOption: EngineOfferableOption | null;
  readonly mechanics: ResolvedTurnMechanics;
  readonly selectedBranch: 'primary' | 'fallback';
}

export interface PreparedEngineRound extends EngineBoundaryResolutions {
  readonly snapshot: EngineRoundSnapshot;
  readonly revisionDelta: number;
}

export interface AppliedEngineMechanics extends EngineBoundaryResolutions {
  readonly revisionDelta: number;
  readonly deviationResolutions: readonly EngineProposalDeviation[];
}

export interface AppliedScriptedPcTurn extends EngineBoundaryResolutions {
  readonly revisionDelta: number;
}

type EngineTurnApplication = AuthorizedEngineTurnProposal;

interface CanonicalEncounterState {
  readonly state: EncounterState;
  readonly fixtureJson: string;
}

function canonicalEncounterState(state: EncounterState): CanonicalEncounterState {
  const fixtureJson = canonicalJson({ encounter: { state } });
  const decoded: unknown = JSON.parse(fixtureJson) as unknown;
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new TypeError('Canonical engine fixture root must be an object.');
  }
  const encounter = Reflect.get(decoded, 'encounter');
  if (typeof encounter !== 'object' || encounter === null || Array.isArray(encounter)) {
    throw new TypeError('Canonical engine fixture encounter must be an object.');
  }
  const canonicalState: unknown = Reflect.get(encounter, 'state');
  if (typeof canonicalState !== 'object' || canonicalState === null || Array.isArray(canonicalState) ||
    !Array.isArray(Reflect.get(canonicalState, 'combatants')) ||
    !Array.isArray(Reflect.get(canonicalState, 'tokens')) ||
    typeof Reflect.get(canonicalState, 'revision') !== 'number') {
    throw new TypeError('Canonical engine fixture state is incomplete.');
  }
  return { state: canonicalState as EncounterState, fixtureJson };
}

function livingMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((subject) =>
    subject.profile.kind === 'monster' && subject.life !== 'dead' ? [subject.profile.id] : [],
  ).sort((left, right) => left.localeCompare(right));
}

function reduceOne(state: EncounterState, command: EncounterCommand, rng: SerializableRng): EncounterState {
  return reduceSessionEncounter(state, command, rng).state;
}

function resolveBoundaryDecisions(
  initialState: EncounterState,
  rng: SerializableRng,
  policy: ReactionOfferHostPolicy,
  guidance: ReactionGuidanceDeclaration | null,
  resolveInitiativeSegmentDecisions: boolean,
): { readonly state: EncounterState } & EngineBoundaryResolutions {
  if (policy.kind === 'dm_attended') {
    return { state: initialState, fallbackResolutions: [], guidedResolutions: [] };
  }
  let state = initialState;
  const fallbackResolutions: AutoResolvedReactionOffer[] = [];
  const guidedResolutions: GuidedReactionResolution[] = [];
  let legendaryBoundaryToResume: {
    readonly activeCombatant: CombatantId;
    readonly round: number;
  } | null = null;
  for (;;) {
    let selected:
      | { readonly kind: 'guidance'; readonly resolution: GuidedReactionResolution }
      | { readonly kind: 'fallback'; readonly resolution: AutoResolvedReactionOffer }
      | undefined;
    for (const decision of state.pendingDecisions) {
      if (decision.kind !== 'reaction_offer') continue;
      const guided = guidedPendingReactionResolution(state, decision, 'algorithm', policy, guidance);
      if (guided !== null) {
        selected = { kind: 'guidance', resolution: guided };
        break;
      }
      const fallback = unattendedReactionOfferResolution(state, decision, 'algorithm', policy);
      if (fallback !== null) {
        selected = { kind: 'fallback', resolution: fallback };
        break;
      }
    }
    if (selected !== undefined) {
      state = reduceOne(state, {
        type: 'resolve_pending_decision',
        decisionId: selected.resolution.decisionId,
        optionId: selected.resolution.resolution,
      }, rng);
      if (selected.kind === 'guidance') guidedResolutions.push(selected.resolution);
      else fallbackResolutions.push(selected.resolution);
      continue;
    }
    const legendaryResistance = resolveInitiativeSegmentDecisions &&
      state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_resistance')
      : undefined;
    if (legendaryResistance !== undefined) {
      state = reduceOne(state, {
        type: 'resolve_pending_decision', decisionId: legendaryResistance.id, optionId: 'suffer',
      }, rng);
      continue;
    }
    const legendaryWindow = resolveInitiativeSegmentDecisions &&
      state.config.initiativeMode === 'per_combatant'
      ? state.pendingDecisions.find((decision) => decision.kind === 'legendary_action_window')
      : undefined;
    if (legendaryWindow !== undefined) {
      legendaryBoundaryToResume ??= { ...legendaryWindow.boundary };
      state = reduceOne(state, {
        type: 'resolve_pending_decision', decisionId: legendaryWindow.id, optionId: 'pass',
      }, rng);
      continue;
    }
    const deathSave = state.pendingDecisions.find((decision) => decision.kind === 'death_save');
    if (deathSave !== undefined) {
      state = reduceOne(state, {
        type: 'resolve_pending_decision', decisionId: deathSave.id, optionId: 'roll',
      }, rng);
      continue;
    }
    const boundaryToResume = legendaryBoundaryToResume;
    if (boundaryToResume !== null && state.phase.kind === 'active' &&
      state.activeCombatant === boundaryToResume.activeCombatant &&
      state.round === boundaryToResume.round &&
      !state.pendingDecisions.some((decision) =>
        decision.boundary.activeCombatant === boundaryToResume.activeCombatant &&
        decision.boundary.round === boundaryToResume.round)) {
      legendaryBoundaryToResume = null;
      state = reduceOne(state, { type: 'end_turn', actor: boundaryToResume.activeCombatant }, rng);
      continue;
    }
    return { state, fallbackResolutions, guidedResolutions };
  }
}

function advanceToActor(
  initialState: EncounterState,
  actorId: CombatantId,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
): EncounterState {
  let state = initialState;
  if (state.initiative.length === 0) state = reduce(state, { type: 'roll_initiative' });
  for (let index = 0; state.activeCombatant !== actorId && index < state.combatants.length * 3; index += 1) {
    const active = state.activeCombatant;
    if (active === null) throw new Error('Initiative has no active combatant.');
    state = reduce(state, { type: 'end_turn', actor: active });
  }
  if (state.activeCombatant !== actorId) throw new Error(`Could not advance initiative to ${actorId}.`);
  return state;
}

function advancePastUnavailableActiveCombatant(
  initialState: EncounterState,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
): EncounterState {
  let state = initialState;
  while (state.phase.kind === 'active' && state.activeCombatant !== null) {
    const active = state.combatants.find((entry) => entry.profile.id === state.activeCombatant);
    if (active === undefined) throw new Error(`Active initiative actor ${state.activeCombatant} is absent.`);
    if (active.life === 'living') return state;
    state = reduce(state, { type: 'end_turn', actor: active.profile.id });
  }
  return state;
}

function monsterSpellCommand(
  state: EncounterState,
  use: ResolvedActionSlotUse,
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  if (use.spellId === null) throw new Error('Resolved spell use omitted its spell id.');
  const caster = state.combatants.find((candidate) => candidate.profile.id === state.activeCombatant);
  if (caster?.profile.kind !== 'monster') throw new Error('Resolved statblock spell caster is absent.');
  const sources = use.slot === 'main' ? monsterActions(state, caster.profile.id) : monsterBonusActions(state, caster.profile.id);
  const source = sources.find((candidate): candidate is MonsterSpellcastingAction |
    Extract<import('../combat/statblock').MonsterBonusAction, { readonly kind: 'spell_choice' }> =>
    (candidate.kind === 'spellcasting' || candidate.kind === 'spell_choice') && candidate.id === use.actionId);
  const reference = source?.spells.find((spell) => spell.id === use.spellId);
  const definition = spellDefinition(use.spellId);
  if (source === undefined || reference === undefined || definition === null) {
    throw new Error(`Resolved spell ${use.spellId} is absent from ${use.actionId}.`);
  }
  const abilityScore = caster.profile.rules.abilityScores?.[source.ability] ?? 10;
  const modifier = Math.floor((abilityScore - 10) / 2);
  const proficiency = caster.profile.rules.proficiencyBonus ?? 2;
  const saveDc = source.kind === 'spellcasting' && source.saveDc.kind === 'present'
    ? source.saveDc.value : 8 + proficiency + modifier;
  const attackBonus = source.kind === 'spellcasting' && source.spellAttackBonus.kind === 'present'
    ? source.spellAttackBonus.value : proficiency + modifier;
  const resourcePoolId = monsterSpellResourcePoolId(source.id, reference);
  const placedArea = use.area ?? null;
  const usesPlacedArea = definition.targeting.kind === 'area' || definition.targeting.kind === 'area_selected';
  return {
    type: 'cast_spell', actor: caster.profile.id, spellId: use.spellId,
    slotLevel: definition.level === 0 ? null : definition.level,
    castAsRitual: false, casterLevel: 1, attackBonus, saveDc, spellcastingModifier: modifier,
    targets: usesPlacedArea ? [] : use.targetIds,
    area: usesPlacedArea ? placedArea : null,
    weaponAttack: null,
    selectedOption: use.activationChoice?.kind === 'command_word' ||
      use.activationChoice?.kind === 'dispel_evil_and_good_mode'
      ? use.activationChoice.value
      : use.activationChoice?.kind === 'unicorns_blessing_spell' &&
          use.activationChoice.value === 'lesser-restoration'
        ? use.selectedCondition ?? null
        : null,
    ...(use.activationChoice?.kind === 'calm_emotions_per_target'
      ? { calmEmotionsModes: use.activationChoice.selections.map((entry) => ({ target: entry.targetId, mode: entry.mode })) }
      : {}),
    ...(resourcePoolId === null ? {} : { resourcePoolId }),
    monsterActionId: source.id,
  };
}

function applyOneResolvedProposal(
  initialState: EncounterState,
  mechanics: ResolvedTurnMechanics,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
): { readonly state: EncounterState; readonly remainingAttackTargetDead: boolean } {
  let state = initialState;
  let remainingAttackTargetDead = false;
  const dashesBeforeMovement = mechanics.path.length === 0
    ? []
    : mechanics.actionSlots.filter((use) => use.kind === 'dash');
  for (const dash of dashesBeforeMovement) {
    state = reduce(state, {
      type: 'dash',
      actor: mechanics.actorId,
      cost: dash.slot === 'bonus' ? 'bonus_action' : 'action',
    });
  }
  if (mechanics.path.length > 0) {
    state = reduce(state, {
      type: 'move', actor: mechanics.actorId, path: mechanics.path, cause: 'voluntary',
    });
  }
  if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') {
    return { state, remainingAttackTargetDead };
  }
  for (const use of mechanics.actionSlots) {
    if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') break;
    switch (use.kind) {
    case 'attack': {
      const targetId = use.targetIds[0];
      if (targetId === undefined) throw new Error('Resolved attack omitted its target.');
      if (state.combatants.find((entry) => entry.profile.id === targetId)?.life === 'dead') {
        remainingAttackTargetDead = true;
        break;
      }
      const action = canonicalEngineQueryPort.actions(state, mechanics.actorId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === use.actionId);
      if (action === undefined) throw new Error(`Resolved attack ${use.actionId} is absent.`);
      const evaluation = evaluateMonsterTacticalAttack(state, action, mechanics.actorId, targetId);
      state = reduce(state, monsterAttackCommand(action, mechanics.actorId, targetId, evaluation.rollMode.mode));
      break;
    }
    case 'dodge': state = reduce(state, { type: 'dodge', actor: mechanics.actorId, cost: 'action' }); break;
    case 'disengage': state = reduce(state, {
      type: 'disengage',
      actor: mechanics.actorId,
      cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
    }); break;
    case 'dash': {
      if (!dashesBeforeMovement.includes(use)) {
        state = reduce(state, {
          type: 'dash',
          actor: mechanics.actorId,
          cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
        });
      }
      break;
    }
    case 'hide': state = reduce(state, { type: 'hide', actor: mechanics.actorId, cost: 'bonus_action' }); break;
    case 'end_turn': return {
      state: reduce(state, { type: 'end_turn', actor: mechanics.actorId }),
      remainingAttackTargetDead,
    };
    case 'saving_throw': {
        const targetId = use.targetIds[0];
        if (targetId === undefined) throw new Error(`Resolved save action ${use.actionId} omitted its target.`);
        const sources = use.slot === 'main' ? monsterActions(state, mechanics.actorId) : monsterBonusActions(state, mechanics.actorId);
        const action = canonicalEngineQueryPort.actions(state, mechanics.actorId)
          .find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId) ??
          sources.find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId);
        if (action === undefined) {
          throw new Error(`Saving-throw action ${use.actionId} is absent.`);
        }
        state = reduce(state, monsterSavingThrowCommand(
          action,
          mechanics.actorId,
          targetId,
          use.multiattackComponent === true ? 'none' : use.slot === 'bonus' ? 'bonus_action' : 'action',
        ));
        break;
    }
    case 'cast_spell': state = reduce(state, monsterSpellCommand(state, use)); break;
    case 'use_world_object': {
      if (use.objectId === null) throw new Error(`Resolved world-object action ${use.actionId} omitted its object.`);
      state = reduce(state, { type: 'use_world_object', actor: mechanics.actorId, objectId: use.objectId, actionId: use.actionId });
      break;
    }
    }
  }
  return {
    state: reduce(state, { type: 'end_turn', actor: mechanics.actorId }),
    remainingAttackTargetDead,
  };
}

export class EngineRoundSession {
  #state: EncounterState;
  #rng: SerializableRng;

  constructor(
    initialState: EncounterState,
    rng: SerializableRng,
    private readonly policy: ReactionOfferHostPolicy,
  ) {
    this.#state = structuredClone(initialState);
    this.#rng = rng;
  }

  currentState(): EncounterState {
    return structuredClone(this.#state);
  }

  replaceEncounterState(state: EncounterState): void {
    this.#state = structuredClone(state);
  }

  snapshot(request: EngineRoundCapsuleRequest): EngineRoundSnapshot {
    const canonical = canonicalEncounterState(this.#state);
    this.#state = canonical.state;
    return {
      capsule: this.#capsule(request),
      fixtureJson: canonical.fixtureJson,
    };
  }

  authorizationCapsule(request: EngineRoundCapsuleRequest): EngineStateCapsule {
    return this.#capsule(request);
  }

  prepareRound(
    request: Omit<EngineOrdinaryRoundCapsuleRequest, 'revision'> & { readonly revision: number },
    guidance: ReactionGuidanceDeclaration | null,
  ): PreparedEngineRound {
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance, false);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    const firstMonster = livingMonsterIds(this.#state)[0];
    if (firstMonster === undefined) throw new Error('Encounter has no living monster to prepare.');
    const initialBoundary = resolveBoundaryDecisions(this.#state, trialRng, this.policy, guidance, false);
    fallbackResolutions.push(...initialBoundary.fallbackResolutions);
    guidedResolutions.push(...initialBoundary.guidedResolutions);
    const prepared = advanceToActor(initialBoundary.state, firstMonster, reduce);
    const revisionDelta = prepared.revision - beforeRevision;
    this.#state = prepared;
    this.#rng = trialRng;
    const snapshot = this.snapshot({ ...request, revision: request.revision + revisionDelta });
    return { snapshot, revisionDelta, fallbackResolutions, guidedResolutions };
  }

  beginRoundWithoutSkipping(
    request: Omit<EngineOrdinaryRoundCapsuleRequest, 'revision'> & { readonly revision: number },
    guidance: ReactionGuidanceDeclaration | null,
  ): PreparedEngineRound {
    if (this.#state.config.initiativeMode !== 'per_combatant') {
      throw new Error('Initiative-segment rounds require per_combatant initiative.');
    }
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance, true);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    const initialBoundary = resolveBoundaryDecisions(this.#state, trialRng, this.policy, guidance, true);
    fallbackResolutions.push(...initialBoundary.fallbackResolutions);
    guidedResolutions.push(...initialBoundary.guidedResolutions);
    const begunBeforeDeadActorAdvance = initialBoundary.state.initiative.length === 0
      ? reduce(initialBoundary.state, { type: 'roll_initiative' })
      : initialBoundary.state;
    const begun = advancePastUnavailableActiveCombatant(begunBeforeDeadActorAdvance, reduce);
    if (begun.activeCombatant === null) throw new Error('Initiative has no active combatant.');
    const revisionDelta = begun.revision - beforeRevision;
    this.#state = begun;
    this.#rng = trialRng;
    const snapshot = this.snapshot({ ...request, revision: request.revision + revisionDelta });
    return { snapshot, revisionDelta, fallbackResolutions, guidedResolutions };
  }

  completeScriptedPcTurn(
    turn: Pick<ScriptedPartyTurnMaterialization, 'actorId' | 'reducerCommands'>,
    guidance: ReactionGuidanceDeclaration | null,
  ): AppliedScriptedPcTurn {
    const active = this.#state.combatants.find((entry) => entry.profile.id === this.#state.activeCombatant);
    if (this.#state.activeCombatant !== turn.actorId ||
      active?.profile.kind !== 'player_character' || active.life !== 'living') {
      throw new Error(`Scripted PC turn ${turn.actorId} is not the active living player character.`);
    }
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance, true);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    const initialBoundary = resolveBoundaryDecisions(this.#state, trialRng, this.policy, guidance, true);
    fallbackResolutions.push(...initialBoundary.fallbackResolutions);
    guidedResolutions.push(...initialBoundary.guidedResolutions);
    let state = initialBoundary.state;
    for (const command of turn.reducerCommands) {
      if (state.activeCombatant !== turn.actorId) {
        throw new Error(`Scripted PC turn ${turn.actorId} attempted to cross an initiative boundary.`);
      }
      if (!('actor' in command) || command.actor !== turn.actorId) {
        throw new Error(`Scripted PC turn ${turn.actorId} may apply only that actor's reducer commands.`);
      }
      state = reduce(state, command);
    }
    if (state.activeCombatant === turn.actorId) {
      state = reduce(state, { type: 'end_turn', actor: turn.actorId });
    }
    state = advancePastUnavailableActiveCombatant(state, reduce);
    this.#state = canonicalEncounterState(state).state;
    this.#rng = trialRng;
    return {
      revisionDelta: this.#state.revision - beforeRevision,
      fallbackResolutions,
      guidedResolutions,
    };
  }

  applyConsecutiveMonsterSegment(
    entries: readonly EngineTurnApplication[],
    guidance: ReactionGuidanceDeclaration | null,
  ): AppliedEngineMechanics {
    if (this.#state.config.initiativeMode !== 'per_combatant') {
      throw new Error('Monster initiative segments require per_combatant initiative.');
    }
    const activeIndex = this.#state.activeInitiativeIndex;
    if (activeIndex === null || this.#state.activeCombatant === null) {
      throw new Error('Monster initiative segment requires active initiative.');
    }
    const expectedActors: CombatantId[] = [];
    for (let index = activeIndex; index < this.#state.initiative.length; index += 1) {
      const initiative = this.#state.initiative[index];
      if (initiative === undefined) throw new Error('Monster initiative segment encountered a missing entry.');
      const combatant = this.#state.combatants.find((entry) => entry.profile.id === initiative.combatant);
      if (combatant === undefined) throw new Error(`Initiative combatant ${initiative.combatant} is absent.`);
      if (combatant.life === 'dead') continue;
      if (combatant.profile.kind === 'player_character') break;
      expectedActors.push(combatant.profile.id);
    }
    const actualActors = entries.map((entry) => entry.proposal.actorId);
    if (expectedActors.length === 0 || expectedActors.length !== actualActors.length ||
      expectedActors.some((actorId, index) => actorId !== actualActors[index])) {
      throw new Error(
        `Monster initiative segment must contain the maximal consecutive actors: ${expectedActors.join(', ')}.`,
      );
    }
    return this.applyResolvedMechanics(entries, guidance);
  }

  applyResolvedMechanics(
    entries: readonly EngineTurnApplication[],
    guidance: ReactionGuidanceDeclaration | null,
  ): AppliedEngineMechanics {
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const deviationResolutions: EngineProposalDeviation[] = [];
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance, true);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    let state = this.#state;
    for (const application of entries) {
      const entry = application;
      state = advanceToActor(state, entry.proposal.actorId, reduce);
      const primary = resolveEngineActorOption(state, entry.primaryOption);
      const fallback = primary.valid || entry.fallbackOption === null
        ? null
        : resolveEngineActorOption(state, entry.fallbackOption);
      let mechanics: ResolvedTurnMechanics;
      let appliedBranch: EngineAppliedProposalBranch;
      let refusalCodes: string[];
      if (primary.valid) {
        mechanics = mechanicsWithChoice(primary.mechanics, entry.proposal.activationChoice, entry.primaryOption);
        appliedBranch = 'primary';
        refusalCodes = [];
      } else if (fallback?.valid === true) {
        if (entry.fallbackOption === null) throw new Error('Resolved fallback option is absent.');
        mechanics = mechanicsWithChoice(fallback.mechanics, entry.proposal.activationChoice, entry.fallbackOption);
        appliedBranch = 'fallback';
        refusalCodes = [primary.code];
      } else {
        const dodgeOption = availableEngineActorOptions(state, entry.proposal.actorId).find((option) =>
          option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
        if (dodgeOption === null) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
        const dodge = resolveEngineActorOption(state, dodgeOption);
        if (!dodge.valid) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
        mechanics = dodge.mechanics;
        appliedBranch = 'dodge';
        refusalCodes = [primary.code, ...(fallback !== null && !fallback.valid ? [fallback.code] : [])];
      }

      const reasonCodes: EngineProposalDeviation['reasonCodes'][number][] = [];
      if (appliedBranch === 'dodge') {
        reasonCodes.push('degraded_to_dodge');
      } else {
        if (appliedBranch !== entry.selectedBranch) reasonCodes.push('branch_changed');
        if (mechanics.optionId !== entry.mechanics.optionId) reasonCodes.push('option_changed');
      }
      const appliedProposal = applyOneResolvedProposal(state, mechanics, reduce);
      state = appliedProposal.state;
      if (appliedProposal.remainingAttackTargetDead) {
        reasonCodes.push('remaining_attack_target_dead');
        refusalCodes.push('TARGET_DIED_DURING_OPTION');
      }
      if (reasonCodes.length > 0) {
        deviationResolutions.push({
          actorId: entry.proposal.actorId,
          authorizedBranch: entry.selectedBranch,
          appliedBranch,
          authorizedOptionId: entry.mechanics.optionId,
          appliedOptionId: mechanics.optionId,
          reasonCodes,
          refusalCodes,
        });
      }
    }
    state = advancePastUnavailableActiveCombatant(state, reduce);
    this.#state = canonicalEncounterState(state).state;
    this.#rng = trialRng;
    return {
      revisionDelta: this.#state.revision - beforeRevision,
      fallbackResolutions,
      guidedResolutions,
      deviationResolutions,
    };
  }

  #capsule(request: EngineRoundCapsuleRequest): EngineStateCapsule {
    if (request.phase === 'speculative') {
      return createEngineMcpRuntime(this.#state, {
        runId: request.runId,
        branchId: request.branchId,
        revision: request.revision,
        requestId: request.requestId,
        phase: 'speculative',
        room: request.room,
        historyKind: request.historyKind,
        requestedActorIds: request.requestedActorIds,
        initiativeProjection: projectEngineInitiativeIntel(this.#state, []),
        speculativeRequest: {
          targetRoom: request.room,
          targetMonsterRound: request.targetMonsterRound,
          refreshGeneration: request.refreshGeneration,
          scenarioMenu: request.scenarioMenu,
          scenarios: request.scenarios,
        },
      }).feed.current();
    }
    return createEngineMcpRuntime(this.#state, {
      runId: request.runId,
      branchId: request.branchId,
      revision: request.revision,
      requestId: request.requestId,
      phase: request.phase,
      correctionNumber: request.phase === 'correction' ? 1 : 0,
      room: request.room,
      historyKind: request.historyKind,
      initiativeProjection: projectEngineInitiativeIntel(this.#state, []),
      ...(request.requestKind === undefined ? {} : { requestKind: request.requestKind }),
      ...(request.requestedActorIds === undefined ? {} : {
        requestedActorIds: request.requestedActorIds,
      }),
      ...(request.planAdjustment === undefined ? {} : {
        planAdjustment: request.planAdjustment,
      }),
    }).feed.current();
  }
}
