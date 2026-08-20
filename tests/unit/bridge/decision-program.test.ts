import { describe, expect, it } from 'vitest';
import type { ControllerRequest } from '../../../src/combat/controllers';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides } from '../../../src/combat/values';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import {
  DmRoundPlanSession,
  StaleRoundPlanError,
} from '../../../src/vtt/dm-bridge/decision-program';
import type {
  DmBridgeExchange,
  DmBridgeRequest,
  RoundPlan,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  codexSessionId,
  combatantId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixture() {
  const monsterA = monsterProfile('bridge-a', { hitPoints: 40 });
  const monsterB = monsterProfile('bridge-b', { hitPoints: 30 });
  const playerA = playerProfile('bridge-player-a');
  const playerB = playerProfile('bridge-player-b');
  const base = createEncounter({
    bounds: { columns: 12, rows: 3 },
    combatants: [monsterA, monsterB, playerA, playerB],
    tokens: [
      placedToken(monsterA, 0),
      placedToken(monsterB, 1),
      placedToken(playerA, 3),
      placedToken(playerB, 7),
    ],
    foggedCells: [{ column: 1, row: 0 }],
    dmNotes: ['hidden bridge tactic sentinel'],
  });
  const state: EncounterState = {
    ...base,
    revision: 9,
    round: 2,
    activeCombatant: monsterA.id,
  };
  return { monsterA, monsterB, playerA, playerB, state };
}

function board(state: EncounterState) {
  return projectDmBoard({ state, coordinator: IDLE, controllers: [], history: [] });
}

function context(state: EncounterState) {
  return {
    encounterId: encounterSessionId('encounter:bridge-test'),
    codexSessionId: codexSessionId('codex:persisted-session-77'),
    projection: board(state),
    history: [],
  };
}

function attack(actor: CombatantId, target: CombatantId): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 5,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Slashing'),
        dice: { count: 1, sides: dieSides(6), modifier: 2 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function controllerRequest(
  state: EncounterState,
  actor: CombatantId,
  actions: readonly EncounterCommand[],
): ControllerRequest {
  return {
    kind: 'turn',
    requestId: `turn:${state.revision}:${actor}`,
    encounterRevision: state.revision,
    actorId: actor,
    visibleState: board(state).encounter,
    legalActions: { actions },
  };
}

function planFor(
  request: DmBridgeRequest,
  programs: readonly { readonly monsterId: CombatantId; readonly program: RoundPlan['monsters'][number]['program'] }[],
): RoundPlan {
  return {
    kind: 'round_plan',
    protocolVersion: 1,
    encounterId: request.encounterId,
    requestId: request.requestId,
    expectedRevision: request.expectedRevision,
    round: request.round,
    monsters: programs,
  };
}

class FakeExchange implements DmBridgeExchange {
  readonly requests: DmBridgeRequest[] = [];

  constructor(private readonly reply: (request: DmBridgeRequest, index: number) => unknown) {}

  async exchange(request: DmBridgeRequest): Promise<unknown> {
    this.requests.push(request);
    return this.reply(request, this.requests.length - 1);
  }
}

describe('typed DM round decision programs', () => {
  it('M43-ONE-INITIAL-ROUND-REQUEST resumes the persisted session and plans all living monsters once', async () => {
    const f = fixture();
    const exchange = new FakeExchange((request) => planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
      monsterId: monster.id,
      program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    }))));
    const session = new DmRoundPlanSession(exchange);

    await Promise.all([
      session.startRound(context(f.state), new AbortController().signal),
      session.startRound(context(f.state), new AbortController().signal),
    ]);

    expect(exchange.requests).toHaveLength(1);
    expect(exchange.requests[0]).toMatchObject({
      kind: 'round_plan_request',
      codexSessionId: 'codex:persisted-session-77',
      model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
      livingMonsterIds: [f.monsterA.id, f.monsterB.id],
    });
    expect(JSON.stringify(exchange.requests[0])).toContain('hidden bridge tactic sentinel');
  });

  it('DSL-DEAD-TARGET-BRANCH resolves a dead target through the else branch without re-consult', async () => {
    const f = fixture();
    const state: EncounterState = {
      ...f.state,
      combatants: f.state.combatants.map((subject) =>
        subject.profile.id === f.playerA.id ? { ...subject, hitPoints: 0, life: 'dead' as const } : subject,
      ),
    };
    const exchange = new FakeExchange((request) => planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
      monsterId: monster.id,
      program: monster.id === f.monsterA.id
        ? {
            kind: 'if',
            predicate: { kind: 'life_is', combatantId: f.playerA.id, value: 'living' },
            then: { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: f.playerA.id } } },
            else: { kind: 'action', action: { kind: 'attack', target: { kind: 'nearest_enemy' } } },
          }
        : { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    }))));
    const session = new DmRoundPlanSession(exchange);
    const selected = await session.choose(
      controllerRequest(state, f.monsterA.id, [attack(f.monsterA.id, f.playerB.id)]),
      context(state),
      new AbortController().signal,
    );

    expect(selected.action).toEqual(attack(f.monsterA.id, f.playerB.id));
    expect(exchange.requests).toHaveLength(1);
  });

  it('DSL-PRIORITY-ORDER selects the first legal program choice, not legal-action input order', async () => {
    const f = fixture();
    const exchange = new FakeExchange((request) => planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
      monsterId: monster.id,
      program: monster.id === f.monsterA.id
        ? {
            kind: 'priority',
            choices: [
              { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: f.playerB.id } } },
              { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: f.playerA.id } } },
            ],
          }
        : { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    }))));
    const selected = await new DmRoundPlanSession(exchange).choose(
      controllerRequest(f.state, f.monsterA.id, [
        attack(f.monsterA.id, f.playerA.id),
        attack(f.monsterA.id, f.playerB.id),
      ]),
      context(f.state),
      new AbortController().signal,
    );

    expect(selected.action).toEqual(attack(f.monsterA.id, f.playerB.id));
  });

  it('DSL-DRY-RECONSULT scopes an unexpressible invalidation to that monster remaining round in the same session', async () => {
    const f = fixture();
    const exchange = new FakeExchange((request, index) => index === 0
      ? planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
          monsterId: monster.id,
          program: monster.id === f.monsterA.id
            ? { kind: 'action', action: { kind: 'force_save', target: { kind: 'combatant', combatantId: f.playerA.id } } }
            : { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        })))
      : planFor(request, [{
          monsterId: f.monsterA.id,
          program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        }]));
    const selected = await new DmRoundPlanSession(exchange).choose(
      controllerRequest(f.state, f.monsterA.id, [{ type: 'end_turn', actor: f.monsterA.id }]),
      context(f.state),
      new AbortController().signal,
    );

    expect(selected.action).toEqual({ type: 'end_turn', actor: f.monsterA.id });
    expect(exchange.requests).toHaveLength(2);
    expect(exchange.requests[1]).toMatchObject({
      kind: 'monster_reconsult_request',
      monsterId: f.monsterA.id,
      scope: 'monster_remaining_round',
      codexSessionId: 'codex:persisted-session-77',
    });
  });

  it('M44-STALE-ROUND-PLAN-REFUSED rejects a reply bound to an older expected revision', async () => {
    const f = fixture();
    const exchange = new FakeExchange((request) => ({
      ...planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
        monsterId: monster.id,
        program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
      }))),
      expectedRevision: request.expectedRevision - 1,
    }));
    await expect(
      new DmRoundPlanSession(exchange).startRound(context(f.state), new AbortController().signal),
    ).rejects.toThrow('stale or malformed');
  });

  it('M45-RECONSULT-RESUMES-SESSION never replaces the persisted Codex session id', async () => {
    const f = fixture();
    const exchange = new FakeExchange((request, index) => index === 0
      ? planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
          monsterId: monster.id,
          program: { kind: 'action', action: { kind: 'force_save', target: { kind: 'nearest_enemy' } } },
        })))
      : planFor(request, [{ monsterId: f.monsterA.id, program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } } }]));
    await new DmRoundPlanSession(exchange).choose(
      controllerRequest(f.state, f.monsterA.id, [{ type: 'end_turn', actor: f.monsterA.id }]),
      context(f.state),
      new AbortController().signal,
    );
    expect(exchange.requests.map((request) => request.codexSessionId)).toEqual([
      codexSessionId('codex:persisted-session-77'),
      codexSessionId('codex:persisted-session-77'),
    ]);
  });

  it('M46-DM-BRIDGE-REJECTS-PLAYER-PROJECTION requires full DM facts at runtime', async () => {
    const f = fixture();
    const playerProjection = projectPlayerBoard(f.state, IDLE, [f.playerA.id]);
    const malformed = { ...context(f.state), projection: playerProjection };
    const exchange = new FakeExchange(() => {
      throw new Error('exchange must not receive a filtered projection');
    });
    await expect(
      new DmRoundPlanSession(exchange).startRound(
        malformed as unknown as ReturnType<typeof context>,
        new AbortController().signal,
      ),
    ).rejects.toThrow('full DM projection');
    expect(exchange.requests).toEqual([]);
  });

  it('DSL-HIDDEN-VOCABULARY-REFUSED rejects predicates outside the full projection vocabulary', async () => {
    const f = fixture();
    const hidden = combatantId('combatant:not-in-projection');
    const exchange = new FakeExchange((request) => planFor(request, [f.monsterA, f.monsterB].map((monster) => ({
      monsterId: monster.id,
      program: {
        kind: 'if',
        predicate: { kind: 'life_is', combatantId: hidden, value: 'living' },
        then: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        else: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
      },
    }))));
    await expect(
      new DmRoundPlanSession(exchange).startRound(context(f.state), new AbortController().signal),
    ).rejects.toThrow('outside the DM projection');
  });
});
