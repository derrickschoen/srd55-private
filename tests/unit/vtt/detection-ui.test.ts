import { describe, expect, it } from 'vitest';
import { ControllerRegistry, HumanController, type ControllerIdentity } from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { encounterBoardRenderModel, projectEncounterBoard } from '../../../src/vtt/encounter-board';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function face(value: number): () => number {
  return () => (value - 0.5) / 20;
}

function encounter(policy: 'ask' | 'always' = 'ask'): {
  readonly state: EncounterState;
  readonly mover: ReturnType<typeof playerProfile>;
  readonly reactor: ReturnType<typeof monsterProfile>;
} {
  const mover = playerProfile('detection-ui-mover', { initiativeBonus: 20 });
  const reactor = monsterProfile('detection-ui-reactor', { initiativeBonus: -20 });
  const initial = createEncounter({
    bounds: { columns: 6, rows: 3 },
    combatants: [mover, reactor],
    tokens: [placedToken(mover, 1, 1), placedToken(reactor, 0, 1)],
    reactionPolicies: [{ combatant: reactor.id, reactionKind: 'opportunity_attack', policy }],
  });
  return {
    state: reduceEncounter(initial, { type: 'roll_initiative' }, face(10)).state,
    mover,
    reactor,
  };
}

function identities(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((subject) => ({
    combatantId: subject.profile.id,
    controllerId: `${subject.profile.id}:human:test`,
    kind: 'human',
    generation: 0,
  }));
}

describe('D373 detection UI projections', () => {
  it('tray_hides_autofire: always-policy auto-fire remains a non-interactive tray audit entry', () => {
    const setup = encounter('always');
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: setup.mover.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20)).state;
    const projection = projectDmBoard({
      view: projectDmView(moved),
      coordinator: IDLE,
      controllers: identities(moved),
      history: [],
    });

    expect(projection.decisionTray.entries).toContainEqual(expect.objectContaining({
      kind: 'auto_fire_log',
      combatantId: setup.reactor.id,
      reactionKind: 'opportunity_attack',
      policy: 'always',
      resolution: 'accept',
      autoFired: true,
      interactive: false,
    }));
  });

  it('projects queued decision context and the typed turn-boundary refusal highlight', () => {
    const setup = encounter();
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: setup.mover.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20)).state;
    const projection = projectDmBoard({
      view: projectDmView(moved),
      coordinator: IDLE,
      controllers: identities(moved),
      history: [],
      boundaryRefusal: {
        code: 'turn_boundary_blocked',
        message: 'The turn cannot advance while a Reaction offer for this boundary is unresolved.',
      },
    });

    expect(projection.decisionTray.entries[0]).toMatchObject({
      kind: 'pending',
      combatantName: 'detection-ui-reactor',
      triggerContext: expect.stringContaining('moved from 1,1 to 2,1'),
      interactive: true,
    });
    expect(projection.decisionTray.boundaryRefusal).toEqual(expect.objectContaining({
      code: 'turn_boundary_blocked',
    }));
  });

  it('keeps the tray non-blocking until end turn, then allows a retry after resolution', async () => {
    const setup = encounter();
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: setup.mover.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20)).state;
    const moverController = new HumanController();
    const coordinator = new TurnCoordinator(
      moved,
      new ControllerRegistry([
        { combatantId: setup.mover.id, controller: moverController, controllerId: 'controller:mover' },
        { combatantId: setup.reactor.id, controller: new HumanController(), controllerId: 'controller:reactor' },
      ]),
      face(10),
      {
        pendingDecisionTray: true,
        turnLegalActions: (_state, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
      },
    );
    const pendingStep = coordinator.step();
    await Promise.resolve();
    const request = moverController.pendingRequest();
    if (request === null) throw new Error('Expected the mover turn request.');
    moverController.submit({
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: { type: 'end_turn', actor: setup.mover.id },
    });
    const refusal = await pendingStep;
    expect(refusal).toMatchObject({
      kind: 'refused',
      pendingDecisionCode: 'turn_boundary_blocked',
    });

    const decision = coordinator.state().pendingDecisions[0];
    if (decision === undefined) throw new Error('Expected a queued tray decision.');
    expect(coordinator.resolvePendingDecision({
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'decline',
    }).kind).toBe('applied');
    expect(coordinator.state().activeCombatant).toBe(setup.mover.id);
    const resumedStep = coordinator.step();
    await Promise.resolve();
    const resumedRequest = moverController.pendingRequest();
    if (resumedRequest === null) throw new Error('Expected the resumed mover turn request.');
    moverController.submit({
      requestId: resumedRequest.requestId,
      encounterRevision: resumedRequest.encounterRevision,
      action: { type: 'end_turn', actor: setup.mover.id },
    });
    expect((await resumedStep).kind).toBe('applied');
    expect(coordinator.state().activeCombatant).toBe(setup.reactor.id);
  });

  it('hidden_token_rendered: hidden occupants become fog-only cells in DM and shared board data', () => {
    const setup = encounter();
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.reactor.id, stealthTotal: 18, edition: '2024' }],
    };
    const dmBoard = projectEncounterBoard(projectDmView(hidden));
    const dmCell = encounterBoardRenderModel(dmBoard, {
      ...REFERENCE_ENCOUNTER_ART,
      room: { ...REFERENCE_ENCOUNTER_ART.room, columns: 6, rows: 3 },
      combatantTokens: {
        ...REFERENCE_ENCOUNTER_ART.combatantTokens,
        [setup.mover.id]: REFERENCE_ENCOUNTER_ART.combatantTokens['combatant:fighter']!,
        [setup.reactor.id]: REFERENCE_ENCOUNTER_ART.combatantTokens['combatant:training-brute']!,
      },
    }).find((cell) => cell.key === '0,1');
    expect(dmCell?.layers).toContainEqual(expect.objectContaining({ role: 'fog' }));
    expect(dmCell?.token).toBeNull();
    expect(dmBoard.combatants.map((entry) => entry.id)).not.toContain(setup.reactor.id);

    const playerView = projectPlayerView(hidden, {
      seatId: 'seat:detection-ui',
      combatantId: setup.mover.id,
      ownedCombatantIds: [setup.mover.id],
    });
    const playerBoard = projectPlayerBoard(playerView, IDLE);
    expect(playerBoard.concealedCells).toContainEqual({ column: 0, row: 1 });
    expect(playerBoard.combatants.map((entry) => entry.id)).not.toContain(setup.reactor.id);
  });
});
