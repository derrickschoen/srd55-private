import { canonicalJson } from '../commands/canonical-json';
import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { monsterAttackCommand } from '../combat/monster-commands';
import { restoreMulberry32, type SerializableRng } from '../combat/random';
import type { MonsterAttackAction } from '../combat/statblock';
import type { CombatantId, EncounterBranchId, EncounterSessionId } from '../combat/values';
import type { EngineStateCapsule } from './engine-state-capsule';
import { canonicalEngineQueryPort } from './engine-query-port';
import type { EngineActionChoice, ResolvedIntentMechanics } from './intent-resolver';
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

export interface PreparedEngineRound extends EngineBoundaryResolutions {
  readonly snapshot: EngineRoundSnapshot;
  readonly revisionDelta: number;
}

export interface AppliedEngineMechanics extends EngineBoundaryResolutions {
  readonly revisionDelta: number;
}

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

function applyOneResolvedMechanic(
  initialState: EncounterState,
  mechanics: ResolvedIntentMechanics,
  choice: EngineActionChoice,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
): EncounterState {
  let state = advanceToActor(initialState, mechanics.actorId, reduce);
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
    case 'dodge':
    case 'disengage':
    case 'dash': state = reduce(state, { type: choice.kind, actor: mechanics.actorId }); break;
    case 'end_turn': return reduce(state, { type: 'end_turn', actor: mechanics.actorId });
    case 'use_action': {
      if (choice.target !== null || mechanics.targetId !== null) {
        throw new Error(`Utility action ${choice.actionId} cannot authorize a target.`);
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
    entries: readonly { readonly mechanics: ResolvedIntentMechanics; readonly choice: EngineActionChoice }[],
    guidance: ReactionGuidanceDeclaration | null,
  ): AppliedEngineMechanics {
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
    let state = this.#state;
    for (const entry of entries) {
      state = applyOneResolvedMechanic(state, entry.mechanics, entry.choice, reduce);
    }
    this.#state = canonicalEncounterState(state).state;
    this.#rng = trialRng;
    return {
      revisionDelta: this.#state.revision - beforeRevision,
      fallbackResolutions,
      guidedResolutions,
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
