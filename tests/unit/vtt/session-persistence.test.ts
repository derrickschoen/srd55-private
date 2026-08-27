import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  AlgorithmController,
  AgentController,
  ControllerRegistry,
  HumanController,
  StaleControllerResponseError,
  type Controller,
  type ControllerDecision,
  type ControllerRequest,
} from '../../../src/combat/controllers';
import {
  TurnCoordinator,
  type PersistedCoordinatorState,
} from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { projectPlayerView } from '../../../src/combat/visibility';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import {
  codexSessionId,
  encounterBranchId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import {
  DeferredMirrorSink,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  SqliteBrowserSessionStore,
  SessionFingerprintMismatchError,
  UnknownSessionTransitionKindError,
  exportSavedSession,
  exportSavedSessionV1ForMigrationTest,
  importSavedSession,
  replaySessionRevisions,
  sessionHistory,
  validateVttSessionMigrationRegistry,
  type BrowserSessionStore,
  type MirrorSink,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';
import {
  damageType,
  dieSides,
} from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function pair() {
  const player = playerProfile('persist-player', { initiativeBonus: 20 });
  const monster = monsterProfile('persist-monster', {
    initiativeBonus: -20,
    hitPoints: 20,
  });
  const state = createEncounter({
    bounds: { columns: 6, rows: 2 },
    combatants: [player, monster],
    tokens: [placedToken(player, 0), placedToken(monster, 5)],
  });
  return { player, monster, state };
}

function createJournal(
  store: BrowserSessionStore,
  mirror: MirrorSink,
  registry: ControllerRegistry,
  state = pair().state,
  seed = 9182,
) {
  const rng = mulberry32(seed);
  const journal = EncounterSessionJournal.create({
    sessionId: encounterSessionId('session:persistence-test'),
    branchId: encounterBranchId('branch:main'),
    encounterState: state,
    coordinatorState: INITIAL_COORDINATOR_STATE,
    controllers: registry.identities(),
    codexSessionId: codexSessionId('codex:stable-session'),
    rng,
    store,
    mirror,
  });
  return { journal, rng };
}

function copyPrefix(
  revisions: readonly SessionRevision[],
  count: number,
): MemoryBrowserSessionStore {
  const copy = new MemoryBrowserSessionStore();
  for (const revision of revisions.slice(0, count)) copy.append(revision);
  return copy;
}

function latestProof(
  store: BrowserSessionStore,
  sessionId = encounterSessionId('session:persistence-test'),
): string {
  const revisions = store.revisions(sessionId);
  const latest = revisions.at(-1);
  if (latest === undefined) throw new Error('Expected a persisted revision.');
  return canonicalJson({
    encounterState: latest.encounterState,
    rngState: latest.rngState,
    coordinatorState: latest.coordinatorState,
    controllers: latest.controllers,
    codexSessionId: latest.codexSessionId,
    history: sessionHistory(revisions),
  });
}

function expectEveryRevisionReloads(store: BrowserSessionStore): void {
  const sessionId = encounterSessionId('session:persistence-test');
  const revisions = store.revisions(sessionId);
  for (let count = 1; count <= revisions.length; count += 1) {
    const prefix = copyPrefix(revisions, count);
    const before = latestProof(prefix);
    const resumed = EncounterSessionJournal.resume(
      sessionId,
      prefix,
      new MemoryMirrorSink(),
    );
    expect(resumed.rng.snapshot()).toEqual(
      prefix.revisions(sessionId).at(-1)?.rngState,
    );
    expect(latestProof(prefix)).toBe(before);
    expect(resumed.codexSessionId).toBe(codexSessionId('codex:stable-session'));
  }
}

class ThrowAfterResponseMirror implements MirrorSink {
  append(revision: SessionRevision): void {
    if (revision.transition.kind === 'controller_response_received') {
      throw new Error('simulated crash after browser durability');
    }
  }
}

class CountingController extends HumanController {
  calls = 0;

  async choose(
    _request: ControllerRequest,
    _signal: AbortSignal,
  ): Promise<ControllerDecision> {
    this.calls += 1;
    throw new Error('Persisted accepted response must not call a controller again.');
  }
}

describe('event-sourced encounter persistence', () => {
  it('unknown transition kind refuses the whole session file with a typed refusal naming the kind', () => {
    const source = new MemoryBrowserSessionStore();
    createJournal(source, new MemoryMirrorSink(), new ControllerRegistry([]));
    const bytes = exportSavedSessionV1ForMigrationTest(
      source,
      encounterSessionId('session:persistence-test'),
    );
    const document = JSON.parse(bytes) as {
      revisions: Array<{ transition: { kind: string } }>;
    };
    document.revisions[0]!.transition.kind = 'transition_from_the_future';
    const destination = new MemoryBrowserSessionStore();

    expect(() => importSavedSession(destination, JSON.stringify(document))).toThrowError(
      new UnknownSessionTransitionKindError('transition_from_the_future'),
    );
    expect(destination.revisions(encounterSessionId('session:persistence-test'))).toEqual([]);

    const replayRevision = structuredClone(source.revisions(encounterSessionId('session:persistence-test'))[0]);
    if (replayRevision === undefined) throw new Error('Replay transition fixture is missing.');
    const forged = {
      ...replayRevision,
      transition: { kind: 'transition_from_the_future' },
    } as unknown as SessionRevision;
    expect(() => replaySessionRevisions([forged])).toThrowError(
      new UnknownSessionTransitionKindError('transition_from_the_future'),
    );
  });

  it('fingerprint_not_checked: one flipped bundle byte refuses the whole session file', () => {
    const source = new MemoryBrowserSessionStore();
    createJournal(source, new MemoryMirrorSink(), new ControllerRegistry([]));
    const bytes = exportSavedSession(source, encounterSessionId('session:persistence-test'));
    const document = JSON.parse(bytes) as { sessionId: string };
    document.sessionId = `${document.sessionId.slice(0, -1)}u`;
    const destination = new MemoryBrowserSessionStore();

    expect(() => importSavedSession(destination, JSON.stringify(document))).toThrowError(
      new SessionFingerprintMismatchError(),
    );
    expect(destination.revisions(encounterSessionId('session:persistence-test'))).toEqual([]);
  });

  it('CRASH-PROBE-EVERY-REVISION restores canonical state, RNG, ids, and history byte-for-byte', async () => {
    const fixture = pair();
    const human = new HumanController();
    const registry = new ControllerRegistry([
      {
        combatantId: fixture.player.id,
        controller: human,
        controllerId: 'controller:human-player',
      },
      {
        combatantId: fixture.monster.id,
        controller: new AlgorithmController(),
        controllerId: 'controller:algorithm-monster',
      },
    ]);
    const store = new MemoryBrowserSessionStore();
    const mirror = new MemoryMirrorSink();
    const { journal, rng } = createJournal(store, mirror, registry, fixture.state);
    const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
      persistence: journal,
    });

    await coordinator.step();
    const pendingStep = coordinator.step();
    await Promise.resolve();
    const request = human.pendingRequest();
    if (request === null) throw new Error('Expected a durable turn request.');
    human.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: { type: 'end_turn', actor: fixture.player.id },
    });
    await pendingStep;

    const revisions = store.revisions(encounterSessionId('session:persistence-test'));
    expect(revisions.map((revision) => revision.transition.kind)).toEqual([
      'session_started',
      'reducer_applied',
      'controller_request_issued',
      'controller_response_received',
      'reducer_applied',
    ]);
    expect(mirror.revisions()).toEqual(revisions);

    expectEveryRevisionReloads(store);
  });

  it('PLAYERVIEW-NEVER-SERIALIZED persists canonical state without a player projection', () => {
    const fixture = pair();
    const store = new MemoryBrowserSessionStore();
    createJournal(store, new MemoryMirrorSink(), new ControllerRegistry([]), fixture.state);
    const playerView = projectPlayerView(fixture.state, {
      seatId: 'seat:persistence-negative-control',
      combatantId: fixture.player.id,
    });
    const bytes = exportSavedSession(store, encounterSessionId('session:persistence-test'));
    const document = JSON.parse(bytes) as {
      format: string;
      nodes: unknown[];
      revisions: unknown[];
    };

    expect(canonicalJson(playerView)).toContain('seat:persistence-negative-control');
    expect(bytes).not.toContain('seat:persistence-negative-control');
    expect(bytes).not.toContain('"audience":"player"');
    expect(document).toMatchObject({ format: 'vtt-session-journal-dag' });
    expect(document.nodes.length).toBeGreaterThan(document.revisions.length);
    expect(document.revisions.every((revision) => Number.isSafeInteger(revision))).toBe(true);
  });

  it('RESPONSE-CRASH-DOES-NOT-REPEAT applies a persisted accepted response without another side effect', async () => {
    const fixture = pair();
    const human = new HumanController();
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: human },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(
      store,
      new ThrowAfterResponseMirror(),
      registry,
      fixture.state,
    );
    const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
      persistence: journal,
    });
    await coordinator.step();
    const interrupted = coordinator.step();
    await Promise.resolve();
    const request = human.pendingRequest();
    if (request === null) throw new Error('Expected a turn request.');
    human.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: { type: 'end_turn', actor: fixture.player.id },
    });
    await expect(interrupted).rejects.toThrow('simulated crash');

    const resumed = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      store,
      new MemoryMirrorSink(),
    );
    const counting = new CountingController();
    const resumedRegistry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: counting },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const recovered = new TurnCoordinator(
      resumed.encounterState,
      resumedRegistry,
      resumed.rng,
      {
        persistence: resumed.journal,
        resume: resumed.coordinatorState,
        expectedControllers: resumed.controllers,
      },
    );
    const result = await recovered.step();
    expect(result.kind).toBe('applied');
    expect(counting.calls).toBe(0);
    expect(recovered.state().revision).toBe(2);
    expectEveryRevisionReloads(store);
  });

  it('REACTION-PROMPT-RESUME keeps the unresolved request id and finishes the movement continuation', async () => {
    const mover = monsterProfile('resume-mover', { initiativeBonus: 20 });
    const reactor = playerProfile('resume-reactor', { initiativeBonus: -20 });
    const state = createEncounter({
      bounds: { columns: 5, rows: 2 },
      combatants: [mover, reactor],
      tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
    });
    const originalHuman = new HumanController();
    const registry = new ControllerRegistry([
      { combatantId: mover.id, controller: new AlgorithmController() },
      { combatantId: reactor.id, controller: originalHuman },
    ]);
    const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move',
      actor: mover.id,
      path: [{ column: 2, row: 0 }],
      cause: 'voluntary',
    };
    const opportunityAttack: Extract<
      EncounterCommand,
      { readonly type: 'opportunity_attack' }
    > = {
      type: 'opportunity_attack',
      actor: reactor.id,
      target: mover.id,
      attackBonus: 100,
      criticalFloor: 20,
      rollMode: 'normal',
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      damage: {
        terms: [{
          type: damageType('Force'),
          dice: { count: 0, sides: dieSides(6), modifier: 1 },
        }],
        critical: false,
        responses: [],
      },
    };
    const turnLegalActions = (_current: typeof state, actor: CombatantId) => ({
      actions: actor === mover.id
        ? [move, { type: 'end_turn' as const, actor }]
        : [{ type: 'end_turn' as const, actor }],
    });
    const reactionLegalActions = () => [opportunityAttack];
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(store, new MemoryMirrorSink(), registry, state);
    const coordinator = new TurnCoordinator(state, registry, rng, {
      persistence: journal,
      turnLegalActions,
      reactionLegalActions,
    });
    await coordinator.step();
    void coordinator.step();
    await Promise.resolve();
    await Promise.resolve();
    const originalRequest = originalHuman.pendingRequest();
    if (originalRequest === null || originalRequest.kind !== 'reaction') {
      throw new Error('Expected an unresolved reaction request.');
    }

    const exported = exportSavedSession(
      store,
      encounterSessionId('session:persistence-test'),
    );
    const reloadedStore = new MemoryBrowserSessionStore();
    importSavedSession(reloadedStore, exported);
    const resumed = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      reloadedStore,
      new MemoryMirrorSink(),
    );
    const resumedHuman = new HumanController();
    const resumedRegistry = new ControllerRegistry([
      { combatantId: mover.id, controller: new AlgorithmController() },
      { combatantId: reactor.id, controller: resumedHuman },
    ]);
    const recovered = new TurnCoordinator(
      resumed.encounterState,
      resumedRegistry,
      resumed.rng,
      {
        persistence: resumed.journal,
        resume: resumed.coordinatorState,
        expectedControllers: resumed.controllers,
        turnLegalActions,
        reactionLegalActions,
      },
    );
    const recoveredStep = recovered.step();
    await Promise.resolve();
    const recoveredRequest = resumedHuman.pendingRequest();
    if (recoveredRequest === null) throw new Error('Expected the resumed prompt.');
    expect(recoveredRequest.requestId).toBe(originalRequest.requestId);
    resumedHuman.submit({
      requestId: recoveredRequest.requestId,
      encounterRevision: recoveredRequest.encounterRevision,
      action: { type: 'decline_reaction', actor: reactor.id, mover: mover.id },
    });
    const result = await recoveredStep;
    expect(result.kind).toBe('applied');
    expect(recovered.state().tokens.find((token) => token.combatantId === mover.id)?.position)
      .toEqual({ column: 2, row: 0 });
    expectEveryRevisionReloads(reloadedStore);
  });

  it('UNDO-REDO-RETAINS-VOID-BRANCH appends head moves and never deletes revisions', async () => {
    const fixture = pair();
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: new AlgorithmController() },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(store, new MemoryMirrorSink(), registry, fixture.state);
    const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
      persistence: journal,
    });
    await coordinator.step();
    await coordinator.step();
    const beforeUndo = store.revisions(encounterSessionId('session:persistence-test'));
    const originalHead = beforeUndo.length;
    journal.moveHead('undo', 2, encounterBranchId('branch:undo-a'));
    const afterUndo = journal.history();
    expect(afterUndo).toHaveLength(originalHead + 1);
    expect(afterUndo.find((entry) => entry.revision === originalHead)?.void).toBe(true);
    expect(afterUndo.at(-1)?.transition.kind).toBe('head_moved');

    journal.moveHead('redo', originalHead, encounterBranchId('branch:redo-a'));
    const afterRedo = journal.history();
    expect(afterRedo).toHaveLength(originalHead + 2);
    expect(afterRedo.find((entry) => entry.revision === originalHead)?.void).toBe(false);
    expect(afterRedo.find((entry) => entry.revision === originalHead + 1)?.void).toBe(true);
    expectEveryRevisionReloads(store);
  });

  it('BRANCH-STREAM-PIN derives stable distinct streams from state and branch id', () => {
    const fixture = pair();
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: new AlgorithmController() },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const source = new MemoryBrowserSessionStore();
    const { journal } = createJournal(source, new MemoryMirrorSink(), registry, fixture.state);
    const initial = source.revisions(encounterSessionId('session:persistence-test'));
    expect(initial).toHaveLength(1);
    const persistedBytes = exportSavedSession(
      source,
      encounterSessionId('session:persistence-test'),
    );
    const sameAStore = new MemoryBrowserSessionStore();
    const sameBStore = new MemoryBrowserSessionStore();
    const differentStore = new MemoryBrowserSessionStore();
    importSavedSession(sameAStore, persistedBytes);
    importSavedSession(sameBStore, persistedBytes);
    importSavedSession(differentStore, persistedBytes);
    const sameA = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      sameAStore,
      new MemoryMirrorSink(),
    ).journal.moveHead('undo', 1, encounterBranchId('branch:pinned'));
    const sameB = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      sameBStore,
      new MemoryMirrorSink(),
    ).journal.moveHead('undo', 1, encounterBranchId('branch:pinned'));
    const different = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      differentStore,
      new MemoryMirrorSink(),
    ).journal.moveHead('undo', 1, encounterBranchId('branch:different'));
    const restartedStore = new MemoryBrowserSessionStore();
    const branchedBytes = exportSavedSession(
      sameAStore,
      encounterSessionId('session:persistence-test'),
    );
    importSavedSession(restartedStore, branchedBytes);
    const sameAfterRestart = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      restartedStore,
      new MemoryMirrorSink(),
    );
    expect(exportSavedSession(
      restartedStore,
      encounterSessionId('session:persistence-test'),
    )).toBe(branchedBytes);
    const hiddenRollSource = new MemoryBrowserSessionStore();
    createJournal(
      hiddenRollSource,
      new MemoryMirrorSink(),
      registry,
      { ...fixture.state, hiddenRolls: ['death_saves'] },
    );
    const hiddenRoll = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      hiddenRollSource,
      new MemoryMirrorSink(),
    ).journal.moveHead('undo', 1, encounterBranchId('branch:pinned'));

    expect(sameA.rng.snapshot()).toEqual(sameB.rng.snapshot());
    expect(sameAfterRestart.rng.snapshot()).toEqual(sameA.rng.snapshot());
    expect(different.rng.snapshot()).not.toEqual(sameA.rng.snapshot());
    expect(sameA.rng.snapshot().streamId).toContain('branch:branch:pinned:');
    expect(different.rng.snapshot().streamId).toContain('branch:branch:different:');
    expect(hiddenRoll.rng.snapshot()).toEqual(sameA.rng.snapshot());
    const actual = {
      sameA: [sameA.rng(), sameA.rng(), sameA.rng()],
      sameB: [sameB.rng(), sameB.rng(), sameB.rng()],
      sameAfterRestart: [
        sameAfterRestart.rng(),
        sameAfterRestart.rng(),
        sameAfterRestart.rng(),
      ],
      different: [different.rng(), different.rng(), different.rng()],
    };
    expect(actual.sameB).toEqual(actual.sameA);
    expect(actual.sameAfterRestart).toEqual(actual.sameA);
    expect(actual.different).not.toEqual(actual.sameA);
    expect(journal.history()).toHaveLength(1);
  });

  it('CONTROLLER-SWAP-CANCELS-DURABLY rejects the stale late human response', async () => {
    const fixture = pair();
    const oldHuman = new HumanController();
    const replacement = new HumanController();
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: oldHuman },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(store, new MemoryMirrorSink(), registry, fixture.state);
    const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
      persistence: journal,
    });
    await coordinator.step();
    const step = coordinator.step();
    await Promise.resolve();
    const stale = oldHuman.pendingRequest();
    if (stale === null) throw new Error('Expected the first request.');
    coordinator.replaceController(fixture.player.id, replacement, 'controller:replacement');
    await Promise.resolve();
    await Promise.resolve();
    expect(() => oldHuman.submit({
      requestId: stale.requestId,
      encounterRevision: stale.encounterRevision,
      action: { type: 'end_turn', actor: fixture.player.id },
    })).toThrow(StaleControllerResponseError);
    expect(
      store.revisions(encounterSessionId('session:persistence-test'))
        .map((revision) => revision.transition.kind),
    ).toContain('controller_request_cancelled');
    const current = replacement.pendingRequest();
    if (current === null) throw new Error('Expected the replacement request.');
    replacement.submit({
      requestId: current.requestId,
      encounterRevision: current.encounterRevision,
      action: { type: 'end_turn', actor: fixture.player.id },
    });
    await step;
    expectEveryRevisionReloads(store);
  });

  it('POLICY-AND-REFUSAL-CRASH-PROBES persist non-prompt coordinator transitions', async () => {
    const mover = monsterProfile('policy-mover', { initiativeBonus: 20 });
    const reactor = playerProfile('policy-reactor', { initiativeBonus: -20 });
    const state = createEncounter({
      bounds: { columns: 5, rows: 2 },
      combatants: [mover, reactor],
      tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
    });
    const move: Extract<EncounterCommand, { readonly type: 'move' }> = {
      type: 'move',
      actor: mover.id,
      path: [{ column: 2, row: 0 }],
      cause: 'voluntary',
    };
    const registry = new ControllerRegistry([
      { combatantId: mover.id, controller: new AlgorithmController() },
      { combatantId: reactor.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(store, new MemoryMirrorSink(), registry, state);
    const coordinator = new TurnCoordinator(state, registry, rng, {
      persistence: journal,
      turnLegalActions: (_current, actor) => ({
        actions: actor === mover.id
          ? [move, { type: 'end_turn', actor }]
          : [{ type: 'end_turn', actor }],
      }),
      reactionLegalActions: () => [],
      standingReactionPolicies: new Map([
        [reactor.id, { opportunityAttack: 'decline' as const }],
      ]),
    });
    await coordinator.step();
    await coordinator.step();
    expect(
      store.revisions(encounterSessionId('session:persistence-test'))
        .map((revision) => revision.transition.kind),
    ).toContain('reaction_policy_resolved');
    coordinator.replaceController(
      reactor.id,
      new AlgorithmController(),
      'controller:policy-replacement',
    );
    expect(
      store.revisions(encounterSessionId('session:persistence-test'))
        .map((revision) => revision.transition.kind),
    ).toContain('controller_replaced');
    expectEveryRevisionReloads(store);

    const refusalState = pair();
    const refusalStore = new MemoryBrowserSessionStore();
    const unlistedController: Controller = {
      choose: async (request) => ({
        requestId: request.requestId,
        encounterRevision: request.encounterRevision,
        action: { type: 'end_turn', actor: refusalState.player.id },
      }),
    };
    const refusalRegistry = new ControllerRegistry([
      { combatantId: refusalState.player.id, controller: unlistedController },
      { combatantId: refusalState.monster.id, controller: new AlgorithmController() },
    ]);
    const refusalSessionId = encounterSessionId('session:persistence-test');
    const refusalRng = mulberry32(9182);
    const refusalJournal = EncounterSessionJournal.create({
      sessionId: refusalSessionId,
      branchId: encounterBranchId('branch:main'),
      encounterState: refusalState.state,
      coordinatorState: INITIAL_COORDINATOR_STATE,
      controllers: refusalRegistry.identities(),
      codexSessionId: codexSessionId('codex:stable-session'),
      rng: refusalRng,
      store: refusalStore,
      mirror: new MemoryMirrorSink(),
    });
    const refusing = new TurnCoordinator(
      refusalState.state,
      refusalRegistry,
      refusalRng,
      {
        persistence: refusalJournal,
        turnLegalActions: (_current, actor) => ({
          actions: [{ type: 'dash', actor }],
        }),
      },
    );
    await refusing.step();
    expect((await refusing.step()).kind).toBe('refused');
    expect(
      refusalStore.revisions(refusalSessionId)
        .map((revision) => revision.transition.kind),
    ).toContain('controller_response_refused');
    expectEveryRevisionReloads(refusalStore);
  });

  it('IN-FLIGHT-AGENT-RESUME redispatches the exact durable request envelope', async () => {
    const fixture = pair();
    let originalRequestId: string | null = null;
    const never = new Promise<unknown>(() => undefined);
    const originalAgent = new AgentController({
      exchange: async (request) => {
        originalRequestId = request.requestId;
        return never;
      },
    });
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: originalAgent },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const { journal, rng } = createJournal(store, new MemoryMirrorSink(), registry, fixture.state);
    const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
      persistence: journal,
    });
    await coordinator.step();
    void coordinator.step();
    await Promise.resolve();
    if (originalRequestId === null) throw new Error('Agent request was not dispatched.');
    expectEveryRevisionReloads(store);

    const exported = exportSavedSession(
      store,
      encounterSessionId('session:persistence-test'),
    );
    const reloaded = new MemoryBrowserSessionStore();
    importSavedSession(reloaded, exported);
    const resumed = EncounterSessionJournal.resume(
      encounterSessionId('session:persistence-test'),
      reloaded,
      new MemoryMirrorSink(),
    );
    let recoveredRequestId: string | null = null;
    const recoveredAgent = new AgentController({
      exchange: async (request) => {
        recoveredRequestId = request.requestId;
        return {
          protocolVersion: 1,
          requestId: request.requestId,
          encounterRevision: request.encounterRevision,
          action: request.legalActions.actions[0],
        };
      },
    });
    const recoveredRegistry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: recoveredAgent },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const recovered = new TurnCoordinator(
      resumed.encounterState,
      recoveredRegistry,
      resumed.rng,
      {
        persistence: resumed.journal,
        resume: resumed.coordinatorState,
        expectedControllers: resumed.controllers,
      },
    );
    expect((await recovered.step()).kind).toBe('applied');
    expect(recoveredRequestId).toBe(originalRequestId);
  });

  it('MIRROR-QUEUE-AND-MIGRATION keeps browser authority and deterministic export', () => {
    validateVttSessionMigrationRegistry();
    const fixture = pair();
    const registry = new ControllerRegistry([
      { combatantId: fixture.player.id, controller: new AlgorithmController() },
      { combatantId: fixture.monster.id, controller: new AlgorithmController() },
    ]);
    const store = new MemoryBrowserSessionStore();
    const deferred = new DeferredMirrorSink();
    createJournal(store, deferred, registry, fixture.state);
    expect(deferred.queued()).toHaveLength(1);
    const fileMirror = new MemoryMirrorSink();
    deferred.connect(fileMirror);
    expect(fileMirror.revisions()).toEqual(
      store.revisions(encounterSessionId('session:persistence-test')),
    );

    const v1 = exportSavedSessionV1ForMigrationTest(
      store,
      encounterSessionId('session:persistence-test'),
    );
    const imported = new MemoryBrowserSessionStore();
    const importedId = importSavedSession(imported, v1);
    expect(importedId).toBe(encounterSessionId('session:persistence-test'));
    expect(exportSavedSession(imported, importedId)).toBe(
      exportSavedSession(store, importedId),
    );
  });

  it('SQLITE-BROWSER-STORE appends each revision as a separate local database row', async () => {
    const connection = await openTestDatabase();
    try {
      const fixture = pair();
      const registry = new ControllerRegistry([
        { combatantId: fixture.player.id, controller: new AlgorithmController() },
        { combatantId: fixture.monster.id, controller: new AlgorithmController() },
      ]);
      const database = new DatabaseContext(connection);
      const store = new SqliteBrowserSessionStore(database);
      const { journal, rng } = createJournal(
        store,
        new MemoryMirrorSink(),
        registry,
        fixture.state,
      );
      const coordinator = new TurnCoordinator(fixture.state, registry, rng, {
        persistence: journal,
      });
      await coordinator.step();
      await coordinator.step();

      const rows = database.allRaw(
        `SELECT revision, schema_version
         FROM vtt_session_revisions
         ORDER BY revision`,
      );
      expect(rows).toEqual([
        { revision: 1, schema_version: 7 },
        { revision: 2, schema_version: 7 },
        { revision: 3, schema_version: 7 },
        { revision: 4, schema_version: 7 },
        { revision: 5, schema_version: 7 },
      ]);
      expect(
        EncounterSessionJournal.resume(
          encounterSessionId('session:persistence-test'),
          store,
          new MemoryMirrorSink(),
        ).encounterState,
      ).toEqual(coordinator.state());
    } finally {
      connection.close();
    }
  });
});
