import type { ControllerIdentity, ControllerRequest } from '../combat/controllers';
import type { PersistedCoordinatorState } from '../combat/coordinator';
import { reduceEncounter, type EncounterState } from '../combat/encounter';
import type { EffectApplication } from '../combat/effects';
import type { EncounterCommand } from '../combat/events';
import type { GridCell } from '../combat/grid';
import { mulberry32, type SerializableRng } from '../combat/random';
import { feetPoint } from '../combat/templates';
import {
  codexSessionId,
  combatantId,
  damageType,
  dieSides,
  effectStackingIdentity,
  encounterBranchId,
  encounterSessionId,
  feet,
  type CombatantId,
} from '../combat/values';
import { projectEncounter } from '../combat/visibility';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from './session-persistence';
import {
  createReplayBundle,
  emptyFleetTelemetry,
  modelFleetTelemetry,
  replayBundle,
  ReplayTranscriptRecorder,
  type FleetTelemetry,
  type ReplayBundle,
  type ReplayControllerIdentity,
  type ReplayProof,
  type ReplayRequestLink,
} from './replay';
import {
  encounterStateFromApprovedFixture,
} from './generated-encounter-fixtures';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from './test-approved-first-skirmish';

const INITIAL_COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

const HUMAN_FLEET = emptyFleetTelemetry();
const AGENT_FLEET = modelFleetTelemetry({
  modelId: 'gpt-5.6-terra',
  reasoningEffort: 'medium',
  buildId: 'codex-dm-bridge-v1',
  commit: 'scripted-gate',
  loadLevelTag: 'reference-skirmish',
  latencyMs: 17,
  tokenCounts: { input: 120, cachedInput: 80, output: 32, reasoning: 16 },
});

const SYSTEM_CONTROLLER: ReplayControllerIdentity = {
  kind: 'system',
  controllerId: 'vtt:scripted-reducer',
};

function controllerIdentity(id: CombatantId, kind: 'human' | 'agent'): ReplayControllerIdentity {
  return { kind, controllerId: `${id}:${kind}:scripted` };
}

function durableIdentities(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((subject) => {
    const kind: 'human' | 'agent' = subject.profile.kind === 'player_character'
      ? 'human'
      : 'agent';
    return {
      combatantId: subject.profile.id,
      controllerId: `${subject.profile.id}:${kind}:scripted`,
      kind,
      generation: 0,
    };
  }).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

function requestLink(requestId: string, requestSequence: number): ReplayRequestLink {
  return { requestId, requestSequence };
}

function attack(
  type: 'attack' | 'opportunity_attack',
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'attack' | 'opportunity_attack' }> {
  return {
    type,
    actor,
    target,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Scripted force'),
        dice: { count: 0, sides: dieSides(6), modifier: 1 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function shatter(actor: CombatantId): EncounterCommand {
  return {
    type: 'cast_spell',
    actor,
    spellId: 'shatter',
    slotLevel: 2,
    castAsRitual: false,
    casterLevel: 7,
    attackBonus: 7,
    saveDc: 15,
    spellcastingModifier: 4,
    targets: [],
    area: {
      shape: 'sphere',
      template: { origin: feetPoint(45, 20), radius: feet(10) },
    },
    weaponAttack: null,
    selectedOption: null,
  };
}

function concentrationCondition(source: CombatantId, target: CombatantId): EncounterCommand {
  const effect: EffectApplication = {
    targets: [target],
    duration: { kind: 'permanent' },
    concentration: true,
    stackingIdentity: effectStackingIdentity('scripted:concentration-condition'),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: { kind: 'condition', condition: 'Blinded' },
  };
  return { type: 'apply_effect', actor: source, effect, cost: 'none' };
}

function adjacentOpenCell(state: EncounterState, actor: CombatantId): GridCell | null {
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) return null;
  for (const delta of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
    const cell = { column: token.position.column + delta[0], row: token.position.row + delta[1] };
    if (
      cell.column >= 0 && cell.column < state.bounds.columns &&
      cell.row >= 0 && cell.row < state.bounds.rows &&
      !state.blockedCells.some((blocked) => blocked.column === cell.column && blocked.row === cell.row) &&
      !state.tokens.some((occupied) => occupied.position.column === cell.column && occupied.position.row === cell.row)
    ) {
      return cell;
    }
  }
  return null;
}

function livingNextWrapsRound(state: EncounterState): boolean {
  const current = state.activeInitiativeIndex;
  if (current === null) return false;
  for (let offset = 1; offset <= state.initiative.length; offset += 1) {
    const index = (current + offset) % state.initiative.length;
    const entry = state.initiative[index];
    const subject = state.combatants.find((candidate) => candidate.profile.id === entry?.combatant);
    if (subject !== undefined && subject.life !== 'dead') return index <= current;
  }
  return true;
}

export interface ScriptedSkirmishGateResult {
  readonly bundle: ReplayBundle;
  readonly proof: ReplayProof;
}

/**
 * Deterministic playable-exit gate. It uses only the checked-in test-approved
 * fixture, a fake DM transcript, scripted human decisions, and serializable RNG.
 */
export function recordScriptedReferenceSkirmish(): ScriptedSkirmishGateResult {
  const store = new MemoryBrowserSessionStore();
  const mirror = new MemoryMirrorSink();
  const recorder = new ReplayTranscriptRecorder();
  const sessionId = encounterSessionId('encounter:increment-10-scripted-gate');
  let state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
  let rng: SerializableRng = mulberry32(0x317010);
  const controllers = durableIdentities(state);
  let journal = EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:scripted-main'),
    encounterState: state,
    coordinatorState: INITIAL_COORDINATOR,
    controllers,
    codexSessionId: codexSessionId('codex:increment-10-fake-exchange'),
    rng,
    store,
    mirror,
  });
  let decisionSequence = 1;
  let downedWizard = false;
  let deathSaveObserved = false;
  let concentrationApplied = false;
  let reactionResolved = false;
  let undoCompleted = false;
  let invalidationRecorded = false;
  const plannedRounds = new Set<number>();
  const actedFeatures = new Set<string>();

  const systemReduction = (command: EncounterCommand): void => {
    const reduction = reduceEncounter(state, command, rng);
    state = reduction.state;
    journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: state,
      coordinatorState: INITIAL_COORDINATOR,
      controllers,
    });
    recorder.record({
      kind: command.type === 'adjudicate' ? 'adjudication' : 'narration',
      encounterRevision: state.revision,
      controller: SYSTEM_CONTROLLER,
      requestId: null,
      requestLink: null,
      payload: command.type === 'adjudicate'
        ? { command, events: reduction.events }
        : { sentence: `Applied ${command.type}.`, events: reduction.events },
      fleet: HUMAN_FLEET,
    });
  };

  const decision = (
    actor: CombatantId,
    kind: 'human' | 'agent',
    command: EncounterCommand,
    fleet: FleetTelemetry,
  ): void => {
    const requestId = `${sessionId}:decision:${decisionSequence}`;
    decisionSequence += 1;
    const identity = controllerIdentity(actor, kind);
    const viewer = kind === 'human'
      ? { kind: 'player' as const, combatantId: actor }
      : { kind: 'dm' as const };
    const request: ControllerRequest = {
      kind: 'turn',
      requestId,
      encounterRevision: state.revision,
      actorId: actor,
      visibleState: projectEncounter(state, viewer),
      legalActions: { actions: [command] },
    };
    const requestRecord = recorder.record({
      kind: 'controller_request',
      encounterRevision: state.revision,
      controller: identity,
      requestId,
      requestLink: null,
      payload: request,
      fleet,
    });
    const link = requestLink(requestId, requestRecord.sequence);
    recorder.record({
      kind: 'prompt',
      encounterRevision: state.revision,
      controller: identity,
      requestId: null,
      requestLink: link,
      payload: kind === 'human' ? 'Scripted human UI choice.' : 'Fake-exchange DM action prompt.',
      fleet,
    });
    journal.record({
      transition: { kind: 'controller_request_issued', request },
      encounterState: state,
      coordinatorState: INITIAL_COORDINATOR,
      controllers,
    });
    const response = {
      requestId,
      encounterRevision: state.revision,
      action: command,
    };
    recorder.record({
      kind: kind === 'agent' ? 'policy_result' : 'response',
      encounterRevision: state.revision,
      controller: identity,
      requestId: null,
      requestLink: link,
      payload: response,
      fleet,
    });
    journal.record({
      transition: { kind: 'controller_response_received', decision: response },
      encounterState: state,
      coordinatorState: INITIAL_COORDINATOR,
      controllers,
    });
    const reduction = reduceEncounter(state, command, rng);
    state = reduction.state;
    journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: state,
      coordinatorState: INITIAL_COORDINATOR,
      controllers,
    });
    recorder.record({
      kind: 'narration',
      encounterRevision: state.revision,
      controller: SYSTEM_CONTROLLER,
      requestId: null,
      requestLink: null,
      payload: { sentence: `${actor} resolved ${command.type}.`, events: reduction.events },
      fleet: HUMAN_FLEET,
    });
    if (reduction.events.some((event) => event.type === 'death_save_resolved')) {
      deathSaveObserved = true;
    }
  };

  const roundPlan = (round: number, revision: number, suffix: string): ReplayRequestLink => {
    const requestId = `${sessionId}:round:${round}:${suffix}`;
    const dm = { kind: 'agent' as const, controllerId: 'codex-dm:fake-exchange' };
    const request = recorder.record({
      kind: 'controller_request',
      encounterRevision: revision,
      controller: dm,
      requestId,
      requestLink: null,
      payload: { kind: suffix === 'initial' ? 'round_plan_request' : 'monster_reconsult_request', round },
      fleet: AGENT_FLEET,
    });
    const link = requestLink(requestId, request.sequence);
    recorder.record({
      kind: 'prompt',
      encounterRevision: revision,
      controller: dm,
      requestId: null,
      requestLink: link,
      payload: { projection: projectEncounter(state, { kind: 'dm' }), fakeExchange: true },
      fleet: AGENT_FLEET,
    });
    recorder.record({
      kind: 'response',
      encounterRevision: revision,
      controller: dm,
      requestId: null,
      requestLink: link,
      payload: { kind: 'round_plan', round, expectedRevision: revision },
      fleet: AGENT_FLEET,
    });
    recorder.record({
      kind: 'round_plan',
      encounterRevision: revision,
      controller: dm,
      requestId: null,
      requestLink: link,
      payload: {
        kind: 'priority',
        choices: [
          { kind: 'if', predicate: 'target_living', then: 'attack', else: 'move_toward' },
          { kind: 'action', action: 'end_turn' },
        ],
      },
      fleet: AGENT_FLEET,
    });
    return link;
  };

  systemReduction({ type: 'roll_initiative' });

  while (state.round >= 1 && state.round <= 4) {
    const active = state.activeCombatant;
    if (active === null) throw new Error('Scripted skirmish lost initiative authority.');
    const activeState = state.combatants.find((subject) => subject.profile.id === active);
    if (activeState === undefined) throw new Error('Scripted active combatant is missing.');
    const controllerKind = activeState.profile.kind === 'player_character' ? 'human' : 'agent';
    const fleet = controllerKind === 'human' ? HUMAN_FLEET : AGENT_FLEET;

    if (!plannedRounds.has(state.round)) {
      roundPlan(state.round, state.revision, 'initial');
      plannedRounds.add(state.round);
    }

    if (state.round === 1 && active === combatantId('combatant:fighter') && !actedFeatures.has('movement')) {
      const to = adjacentOpenCell(state, active);
      if (to === null) throw new Error('Scripted fighter has no legal movement cell.');
      decision(active, 'human', { type: 'move', actor: active, path: [to], cause: 'voluntary' }, fleet);
      actedFeatures.add('movement');
      const target = state.combatants.find((subject) => subject.profile.kind === 'monster' && subject.life === 'living');
      if (target !== undefined) {
        decision(active, 'human', attack('attack', active, target.profile.id), fleet);
        actedFeatures.add('weapon_attack');
      }
    }

    if (state.round === 1 && active === combatantId('combatant:wizard') && !actedFeatures.has('aoe')) {
      decision(active, 'human', shatter(active), fleet);
      actedFeatures.add('aoe');
    }

    if (state.round === 1 && active === combatantId('combatant:cleric') && !concentrationApplied) {
      const target = state.combatants.find((subject) => subject.profile.kind === 'monster' && subject.life === 'living');
      if (target === undefined) throw new Error('Scripted condition has no living target.');
      decision(active, 'human', concentrationCondition(active, target.profile.id), fleet);
      concentrationApplied = true;
      actedFeatures.add('condition');
      actedFeatures.add('concentration');
    }

    if (state.round === 2 && !undoCompleted) {
      const targetRevision = store.revisions(sessionId).at(-1)!.revision;
      const target = state.combatants.find((subject) => subject.profile.kind === 'monster' && subject.life === 'living');
      if (target === undefined) throw new Error('Undo branch has no living target.');
      systemReduction({
        type: 'adjudicate',
        target: target.profile.id,
        reasoning: 'Scripted void branch one.',
        consequence: { kind: 'hit_point_delta', amount: -1 },
      });
      systemReduction({
        type: 'adjudicate',
        target: target.profile.id,
        reasoning: 'Scripted void branch two.',
        consequence: { kind: 'hit_point_delta', amount: -1 },
      });
      recorder.record({
        kind: 'undo',
        encounterRevision: state.revision,
        controller: SYSTEM_CONTROLLER,
        requestId: null,
        requestLink: null,
        payload: { targetRevision },
        fleet: HUMAN_FLEET,
      });
      const resumed = journal.moveHead(
        'undo',
        targetRevision,
        encounterBranchId('branch:scripted-after-undo'),
      );
      state = resumed.encounterState;
      rng = resumed.rng;
      const voidRevisions = store.revisions(sessionId)
        .filter((revision) => revision.revision > targetRevision)
        .slice(0, -1)
        .map((revision) => revision.revision);
      recorder.record({
        kind: 'void',
        encounterRevision: state.revision,
        controller: SYSTEM_CONTROLLER,
        requestId: null,
        requestLink: null,
        payload: { revisions: voidRevisions },
        fleet: HUMAN_FLEET,
      });
      const restored = EncounterSessionJournal.resume(sessionId, store, mirror);
      journal = restored.journal;
      state = restored.encounterState;
      rng = restored.rng;
      journal.record({
        transition: { kind: 'coordinator_resumed', pause: { kind: 'interrupted' } },
        encounterState: state,
        coordinatorState: INITIAL_COORDINATOR,
        controllers,
      });
      recorder.record({
        kind: 'resume',
        encounterRevision: state.revision,
        controller: SYSTEM_CONTROLLER,
        requestId: null,
        requestLink: null,
        payload: { recoveredFrom: 'browser-session-store' },
        fleet: HUMAN_FLEET,
      });
      undoCompleted = true;
      continue;
    }

    if (state.round === 2 && activeState.profile.kind === 'monster' && !invalidationRecorded) {
      const initialLink = roundPlan(state.round, state.revision, 'invalidated-program');
      recorder.record({
        kind: 'invalidation',
        encounterRevision: state.revision,
        controller: { kind: 'agent', controllerId: 'codex-dm:fake-exchange' },
        requestId: null,
        requestLink: initialLink,
        payload: { reason: 'Target moved; first priority is no longer legal.', absorbedBy: 'decision-program-dsl' },
        fleet: AGENT_FLEET,
      });
      roundPlan(state.round, state.revision, 'reconsult-same-session');
      invalidationRecorded = true;
    }

    if (state.round === 2 && activeState.profile.kind === 'monster' && !reactionResolved) {
      const fighter = combatantId('combatant:fighter');
      const fighterState = state.combatants.find((subject) => subject.profile.id === fighter);
      if (fighterState?.turn.reactionAvailable === true) {
        const reactionCell = adjacentOpenCell(state, active);
        if (reactionCell === null) throw new Error('Scripted reaction has no adjacent open cell.');
        systemReduction({
          type: 'adjudicate',
          target: fighter,
          reasoning: 'Place the scripted reactor at the declared reaction window.',
          consequence: { kind: 'relocate', to: reactionCell },
        });
        decision(fighter, 'human', attack('opportunity_attack', fighter, active), HUMAN_FLEET);
        const to = adjacentOpenCell(state, active);
        if (to !== null) {
          decision(active, 'agent', { type: 'move', actor: active, path: [to], cause: 'reactions_resolved' }, AGENT_FLEET);
        }
        reactionResolved = true;
        actedFeatures.add('reaction');
      }
    }

    if (state.round === 2 && activeState.profile.kind === 'monster' && concentrationApplied && !actedFeatures.has('concentration_check')) {
      const cleric = combatantId('combatant:cleric');
      const clericState = state.combatants.find((subject) => subject.profile.id === cleric);
      if (clericState?.life === 'living' && activeState.turn.action.kind !== 'spent') {
        decision(active, 'agent', attack('attack', active, cleric), AGENT_FLEET);
        actedFeatures.add('concentration_check');
      }
    }

    if (state.round === 2 && !downedWizard) {
      const wizard = state.combatants.find((subject) => subject.profile.id === combatantId('combatant:wizard'));
      if (wizard?.life === 'living') {
        systemReduction({
          type: 'adjudicate',
          target: wizard.profile.id,
          reasoning: 'Scripted playable-exit death-save branch.',
          consequence: { kind: 'hit_point_delta', amount: -wizard.profile.rules.hitPointMaximum },
        });
        downedWizard = true;
      }
    }

    if (active === combatantId('combatant:wizard') && deathSaveObserved) {
      const wizard = state.combatants.find((subject) => subject.profile.id === active);
      if (wizard !== undefined && wizard.life !== 'living') {
        systemReduction({
          type: 'adjudicate',
          target: active,
          reasoning: 'Resume the scripted PC after the observed death save.',
          consequence: { kind: 'hit_point_delta', amount: 5 },
        });
      }
    }

    if (state.round === 4 && livingNextWrapsRound(state)) break;
    decision(active, controllerKind, { type: 'end_turn', actor: active }, fleet);
  }

  const required = [
    'movement', 'weapon_attack', 'aoe', 'condition', 'concentration',
    'concentration_check', 'reaction',
  ];
  const missing = required.filter((feature) => !actedFeatures.has(feature));
  if (missing.length > 0 || !deathSaveObserved || !undoCompleted || !invalidationRecorded || state.round !== 4) {
    throw new Error(`Scripted skirmish did not cover its gate: ${missing.join(',')}.`);
  }

  const bundle = createReplayBundle({
    fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
    revisions: store.revisions(sessionId),
    transcripts: recorder.records(),
    build: { buildId: 'vtt-phase2-increment-10', commit: 'supervisor-owned' },
    protocolVersions: ['dm-bridge:1', 'encounter-package:1', 'vtt-session:2'],
    licensingVersions: ['SRD-5.2.1-CC-BY-4.0', 'starter-art-CC-BY-4.0'],
  });
  return {
    bundle,
    proof: replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
  };
}
