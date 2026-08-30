import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { monsterAttackCommand, monsterSavingThrowCommand } from '../combat/monster-commands';
import { restoreMulberry32, type SerializableRng } from '../combat/random';
import type { MonsterAttackAction, MonsterSavingThrowAction } from '../combat/statblock';
import { combatantId, type CombatantId, type EncounterBranchId, type EncounterSessionId } from '../combat/values';
import type { EngineStateCapsule } from './engine-state-capsule';
import { canonicalEngineQueryPort, type EngineTargetSelector } from './engine-query-port';
import {
  createPureIntentResolver,
  type EngineActionChoice,
  type EngineEngagement,
  type EngineIntentBranch,
  type EngineMovementPreference,
  type EngineTurnIntent,
  type ResolvedIntentMechanics,
} from './intent-resolver';
import { createEngineMcpRuntime } from './mcp/entrypoint';
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

export interface EngineRoundCapsuleRequest {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly requestId: string;
  readonly phase: 'initial' | 'correction';
  readonly room: number;
  readonly historyKind: string;
}

export interface EngineRoundSnapshot {
  readonly capsule: EngineStateCapsule;
  readonly fixtureJson: string;
}

export interface EngineBoundaryResolutions {
  readonly fallbackResolutions: readonly AutoResolvedReactionOffer[];
  readonly guidedResolutions: readonly GuidedReactionResolution[];
}

export type EngineAppliedIntentBranch = 'primary' | 'fallback' | 'dodge';

export interface EngineIntentDeviation {
  readonly actorId: CombatantId;
  readonly authorizedBranch: 'primary' | 'fallback';
  readonly appliedBranch: EngineAppliedIntentBranch;
  readonly authorizedTargetId: CombatantId | null;
  readonly appliedTargetId: CombatantId | null;
  readonly reasonCodes: readonly ('branch_changed' | 'target_changed' | 'degraded_to_dodge')[];
  readonly refusalCodes: readonly string[];
}

export interface AuthorizedEngineTurnIntent {
  readonly intent: EngineTurnIntent;
  readonly mechanics: ResolvedIntentMechanics;
  readonly selectedBranch: 'primary' | 'fallback';
}

export interface PreparedEngineRound extends EngineBoundaryResolutions {
  readonly snapshot: EngineRoundSnapshot;
  readonly revisionDelta: number;
}

export interface AppliedEngineMechanics extends EngineBoundaryResolutions {
  readonly revisionDelta: number;
  readonly deviationResolutions: readonly EngineIntentDeviation[];
}

interface ConversationEngineTurnIntent {
  readonly mechanics: ResolvedIntentMechanics;
  readonly choice: EngineActionChoice;
  readonly acceptedIntent?: Readonly<Record<string, unknown>>;
  readonly selectedBranch?: 'primary' | 'fallback';
}

type EngineTurnApplication = AuthorizedEngineTurnIntent | ConversationEngineTurnIntent;

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
): { readonly state: EncounterState } & EngineBoundaryResolutions {
  if (policy.kind === 'dm_attended') {
    return { state: initialState, fallbackResolutions: [], guidedResolutions: [] };
  }
  let state = initialState;
  const fallbackResolutions: AutoResolvedReactionOffer[] = [];
  const guidedResolutions: GuidedReactionResolution[] = [];
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
    const deathSave = state.pendingDecisions.find((decision) => decision.kind === 'death_save');
    if (deathSave === undefined) return { state, fallbackResolutions, guidedResolutions };
    state = reduceOne(state, {
      type: 'resolve_pending_decision', decisionId: deathSave.id, optionId: 'roll',
    }, rng);
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

function intentRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function intentString(input: Readonly<Record<string, unknown>>, field: string): string {
  const value = input[field];
  if (typeof value !== 'string') throw new TypeError(`Authorized intent ${field} must be a string.`);
  return value;
}

function decodeTargetSelector(value: unknown): EngineTargetSelector {
  const input = intentRecord(value, 'Authorized target selector');
  const kind = intentString(input, 'kind');
  switch (kind) {
    case 'combatant': return { kind, combatantId: combatantId(intentString(input, 'combatant_id')) };
    case 'enemy_threatening_ally': return { kind, allyId: combatantId(intentString(input, 'ally_id')) };
    case 'nearest_visible_enemy':
    case 'lowest_hp_visible_enemy':
    case 'most_injured_visible_ally':
    case 'current_threat': return { kind };
    default: throw new TypeError(`Authorized target selector kind ${kind} is unknown.`);
  }
}

function decodeActionChoice(value: unknown): EngineActionChoice {
  const input = intentRecord(value, 'Authorized action choice');
  const kind = intentString(input, 'kind');
  switch (kind) {
    case 'attack': return {
      kind,
      actionId: intentString(input, 'action_id'),
      target: decodeTargetSelector(input['target']),
      ...(input['resource_policy'] === undefined
        ? {}
        : { resourcePolicy: intentString(input, 'resource_policy') as 'conserve' | 'normal' | 'spend_if_useful' }),
    };
    case 'cast_spell': return {
      kind,
      spellId: intentString(input, 'spell_id'),
      target: input['target'] === null ? null : decodeTargetSelector(input['target']),
      ...(input['slot_policy'] === undefined
        ? {}
        : { slotPolicy: intentString(input, 'slot_policy') as 'lowest_legal' | 'conserve' | 'best_effect' }),
    };
    case 'use_action': return {
      kind,
      actionId: intentString(input, 'action_id'),
      target: input['target'] === null ? null : decodeTargetSelector(input['target']),
    };
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'end_turn': return { kind };
    default: throw new TypeError(`Authorized action choice kind ${kind} is unknown.`);
  }
}

function decodeMovement(value: unknown): EngineMovementPreference {
  const input = intentRecord(value, 'Authorized movement');
  const maximumFeet = input['maximum_feet'];
  if (maximumFeet !== undefined && typeof maximumFeet !== 'number') {
    throw new TypeError('Authorized intent maximum_feet must be a number.');
  }
  return {
    willingness: intentString(input, 'willingness') as EngineMovementPreference['willingness'],
    ...(maximumFeet === undefined ? {} : { maximumFeet }),
    opportunityRisk: intentString(input, 'opportunity_risk') as EngineMovementPreference['opportunityRisk'],
  };
}

function decodeEngagement(value: unknown): EngineEngagement {
  const input = intentRecord(value, 'Authorized engagement');
  return {
    stance: intentString(input, 'stance') as EngineEngagement['stance'],
    ...(input['anchor'] === undefined
      ? {}
      : { anchor: input['anchor'] === null ? null : decodeTargetSelector(input['anchor']) }),
  };
}

function decodeIntentBranch(value: unknown): EngineIntentBranch {
  const input = intentRecord(value, 'Authorized intent branch');
  return {
    choice: decodeActionChoice(input['choice']),
    movement: decodeMovement(input['movement']),
    engagement: decodeEngagement(input['engagement']),
  };
}

function decodeAuthorizedIntent(value: Readonly<Record<string, unknown>>): EngineTurnIntent {
  const fallback = value['fallback'];
  return {
    actorId: combatantId(intentString(value, 'actor_id')),
    ...decodeIntentBranch(value),
    fallback: fallback === null ? null : decodeIntentBranch(fallback),
  };
}

function deterministicDodgeIntent(actorId: CombatantId): EngineTurnIntent {
  return {
    actorId,
    choice: { kind: 'dodge' },
    movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
    engagement: { stance: 'hold_position' },
    fallback: null,
  };
}

function normalizedApplication(entry: EngineTurnApplication): AuthorizedEngineTurnIntent {
  if ('intent' in entry) return entry;
  if (entry.acceptedIntent !== undefined) {
    return {
      intent: decodeAuthorizedIntent(entry.acceptedIntent),
      mechanics: entry.mechanics,
      selectedBranch: entry.selectedBranch ?? 'primary',
    };
  }
  if (entry.choice.kind !== 'dodge') {
    throw new TypeError('Engine turn application requires the authorized intent.');
  }
  return {
    intent: deterministicDodgeIntent(entry.mechanics.actorId),
    mechanics: entry.mechanics,
    selectedBranch: 'primary',
  };
}

function selectedChoice(
  intent: EngineTurnIntent,
  branch: 'primary' | 'fallback',
): EngineActionChoice {
  if (branch === 'primary') return intent.choice;
  if (intent.fallback === null) throw new Error('Resolved fallback omitted its declared branch.');
  return intent.fallback.choice;
}

function applyOneResolvedMechanic(
  initialState: EncounterState,
  mechanics: ResolvedIntentMechanics,
  choice: EngineActionChoice,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
): EncounterState {
  let state = initialState;
  const dashBeforeMovement = choice.kind === 'dash' && mechanics.path.length > 0;
  if (dashBeforeMovement) state = reduce(state, { type: 'dash', actor: mechanics.actorId });
  if (mechanics.path.length > 0) {
    state = reduce(state, {
      type: 'move', actor: mechanics.actorId, path: mechanics.path, cause: 'voluntary',
    });
  }
  if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') {
    return state;
  }
  switch (choice.kind) {
    case 'attack': {
      if (mechanics.targetId === null) throw new Error('Resolved attack omitted its target.');
      const action = canonicalEngineQueryPort.actions(state, mechanics.actorId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === mechanics.actionId);
      if (action === undefined) throw new Error(`Resolved attack ${mechanics.actionId} is absent.`);
      state = reduce(state, monsterAttackCommand(action, mechanics.actorId, mechanics.targetId));
      break;
    }
    case 'dodge': state = reduce(state, { type: 'dodge', actor: mechanics.actorId }); break;
    case 'disengage': state = reduce(state, { type: 'disengage', actor: mechanics.actorId }); break;
    case 'dash': {
      if (!dashBeforeMovement) state = reduce(state, { type: 'dash', actor: mechanics.actorId });
      break;
    }
    case 'end_turn': return reduce(state, { type: 'end_turn', actor: mechanics.actorId });
    case 'use_action': {
      if (choice.target !== null || mechanics.targetId !== null) {
        if (choice.target === null || mechanics.targetId === null) {
          throw new Error(`Resolved utility action ${choice.actionId} has inconsistent target bookkeeping.`);
        }
        const action = canonicalEngineQueryPort.actions(state, mechanics.actorId)
          .find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === mechanics.actionId);
        if (action === undefined) {
          throw new Error(`Targeted utility action ${choice.actionId} is absent or has no executable target definition.`);
        }
        state = reduce(state, monsterSavingThrowCommand(
          action,
          mechanics.actorId,
          mechanics.targetId,
        ));
        break;
      }
      switch (choice.actionId) {
        case 'dodge':
        case 'disengage':
        case 'dash': state = reduce(state, { type: choice.actionId, actor: mechanics.actorId }); break;
        case 'end_turn': return reduce(state, { type: 'end_turn', actor: mechanics.actorId });
        default: throw new Error(`Engine round session cannot authorize utility action ${choice.actionId}.`);
      }
      break;
    }
    case 'cast_spell': throw new Error(`Engine round session cannot authorize unresolved ${choice.kind} mechanics.`);
  }
  return reduce(state, { type: 'end_turn', actor: mechanics.actorId });
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
    request: Omit<EngineRoundCapsuleRequest, 'revision'> & { readonly revision: number },
    guidance: ReactionGuidanceDeclaration | null,
  ): PreparedEngineRound {
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    const firstMonster = livingMonsterIds(this.#state)[0];
    if (firstMonster === undefined) throw new Error('Encounter has no living monster to prepare.');
    const initialBoundary = resolveBoundaryDecisions(this.#state, trialRng, this.policy, guidance);
    fallbackResolutions.push(...initialBoundary.fallbackResolutions);
    guidedResolutions.push(...initialBoundary.guidedResolutions);
    const prepared = advanceToActor(initialBoundary.state, firstMonster, reduce);
    const revisionDelta = prepared.revision - beforeRevision;
    this.#state = prepared;
    this.#rng = trialRng;
    const snapshot = this.snapshot({ ...request, revision: request.revision + revisionDelta });
    return { snapshot, revisionDelta, fallbackResolutions, guidedResolutions };
  }

  applyResolvedMechanics(
    entries: readonly EngineTurnApplication[],
    guidance: ReactionGuidanceDeclaration | null,
  ): AppliedEngineMechanics {
    const beforeRevision = this.#state.revision;
    const trialRng = restoreMulberry32(this.#rng.snapshot());
    const fallbackResolutions: AutoResolvedReactionOffer[] = [];
    const guidedResolutions: GuidedReactionResolution[] = [];
    const deviationResolutions: EngineIntentDeviation[] = [];
    const intents = createPureIntentResolver();
    const reduce = (state: EncounterState, command: EncounterCommand): EncounterState => {
      const reduced = reduceOne(state, command, trialRng);
      const resolved = resolveBoundaryDecisions(reduced, trialRng, this.policy, guidance);
      fallbackResolutions.push(...resolved.fallbackResolutions);
      guidedResolutions.push(...resolved.guidedResolutions);
      return resolved.state;
    };
    let state = this.#state;
    for (const application of entries) {
      const entry = normalizedApplication(application);
      state = advanceToActor(state, entry.intent.actorId, reduce);
      const resolution = intents.resolve(state, entry.intent);
      let mechanics: ResolvedIntentMechanics;
      let choice: EngineActionChoice;
      let appliedBranch: EngineAppliedIntentBranch;
      let refusalCodes: readonly string[];
      if (resolution.valid) {
        mechanics = resolution.mechanics;
        choice = selectedChoice(entry.intent, resolution.selectedBranch);
        appliedBranch = resolution.selectedBranch;
        refusalCodes = resolution.refusals.map((refusal) => refusal.code);
      } else {
        const dodge = intents.resolve(state, deterministicDodgeIntent(entry.intent.actorId));
        if (!dodge.valid) throw new Error(`Could not apply deterministic Dodge for ${entry.intent.actorId}.`);
        mechanics = dodge.mechanics;
        choice = { kind: 'dodge' };
        appliedBranch = 'dodge';
        refusalCodes = resolution.refusals.map((refusal) => refusal.code);
      }

      const reasonCodes: EngineIntentDeviation['reasonCodes'][number][] = [];
      if (appliedBranch === 'dodge') {
        reasonCodes.push('degraded_to_dodge');
      } else {
        if (appliedBranch !== entry.selectedBranch) reasonCodes.push('branch_changed');
        if (mechanics.targetId !== entry.mechanics.targetId) reasonCodes.push('target_changed');
      }
      if (reasonCodes.length > 0) {
        deviationResolutions.push({
          actorId: entry.intent.actorId,
          authorizedBranch: entry.selectedBranch,
          appliedBranch,
          authorizedTargetId: entry.mechanics.targetId,
          appliedTargetId: mechanics.targetId,
          reasonCodes,
          refusalCodes,
        });
      }
      state = applyOneResolvedMechanic(state, mechanics, choice, reduce);
    }
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
    return createEngineMcpRuntime(this.#state, {
      runId: request.runId,
      branchId: request.branchId,
      revision: request.revision,
      requestId: request.requestId,
      phase: request.phase,
      correctionNumber: request.phase === 'correction' ? 1 : 0,
      room: request.room,
      historyKind: request.historyKind,
    }).feed.current();
  }
}
