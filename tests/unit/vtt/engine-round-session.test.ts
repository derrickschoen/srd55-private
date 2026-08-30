import { describe, expect, it } from 'vitest';
import { reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { armorClass, combatantId, encounterBranchId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import {
  EngineRoundSession,
  type AuthorizedEngineTurnIntent,
  type EngineRoundCapsuleRequest,
} from '../../../src/vtt/engine-round-session';
import { pureIntentResolver, type EngineTurnIntent } from '../../../src/vtt/intent-resolver';
import { generateRoom } from '../../../src/vtt/room-generator';

const REQUEST: EngineRoundCapsuleRequest = {
  runId: encounterSessionId('encounter:engine-round-session-test'),
  branchId: encounterBranchId('branch:engine-round-session-test'),
  revision: 1,
  requestId: 'request:engine-round-session-test',
  phase: 'initial',
  room: 1,
  historyKind: 'room_ready',
};

const KILLER_ID = combatantId('combatant:generated-3943001-monster-1');
const BRUTE_ID = combatantId('combatant:generated-3943001-monster-2');
const ARCHER_ID = combatantId('combatant:generated-3943001-monster-3');
const FOCUS_ID = combatantId('combatant:fighter');
const CLERIC_ID = combatantId('combatant:cleric');
const WIZARD_ID = combatantId('combatant:wizard');

function fixedPositions(
  positions: ReadonlyMap<CombatantId, { readonly column: number; readonly row: number }>,
  columns = 40,
): EncounterState {
  const generated = generateRoom(3_943_001).encounter.state;
  return {
    ...generated,
    bounds: { columns, rows: 20 },
    blockedCells: [],
    worldObjects: [],
    persistentAreas: [],
    environment: {
      lightRegions: [], obscurementRegions: [], difficultTerrainRegions: [], movementRegions: [],
    },
    tokens: generated.tokens.map((token, index) => ({
      ...token,
      position: positions.get(token.combatantId) ?? { column: 10 + index, row: 10 },
    })),
  };
}

function attackIntent(
  actorId: CombatantId,
  actionId: string,
  targetId: CombatantId,
): EngineTurnIntent {
  return {
    actorId,
    choice: { kind: 'attack', actionId, target: { kind: 'combatant', combatantId: targetId } },
    movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
    engagement: { stance: 'hold_position' },
    fallback: {
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
    },
  };
}

function authorized(state: EncounterState, intent: EngineTurnIntent): AuthorizedEngineTurnIntent {
  const resolution = pureIntentResolver.resolve(state, intent);
  if (!resolution.valid) throw new Error(`Test intent was not authorizable: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
  return { intent, mechanics: resolution.mechanics, selectedBranch: resolution.selectedBranch };
}

function segmentedState(
  positions: ReadonlyMap<CombatantId, { readonly column: number; readonly row: number }> = new Map(),
): EncounterState {
  const state = fixedPositions(positions);
  const bonuses = new Map<CombatantId, number>([
    [FOCUS_ID, 200],
    [KILLER_ID, 150],
    [ARCHER_ID, 140],
    [CLERIC_ID, 100],
    [BRUTE_ID, 50],
    [WIZARD_ID, 0],
  ]);
  return {
    ...state,
    config: { initiativeMode: 'per_combatant' },
    combatants: state.combatants.map((combatant) => ({
      ...combatant,
      profile: {
        ...combatant.profile,
        rules: {
          ...combatant.profile.rules,
          initiativeBonus: bonuses.get(combatant.profile.id) ?? combatant.profile.rules.initiativeBonus,
        },
      },
    })),
  };
}

function dodgeIntent(actorId: CombatantId): EngineTurnIntent {
  return {
    actorId,
    choice: { kind: 'dodge' },
    movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
    engagement: { stance: 'hold_position' },
    fallback: null,
  };
}

function completeDodge(session: EngineRoundSession, actorId: CombatantId) {
  return session.completeScriptedPcTurn({
    actorId,
    reducerCommands: [{ type: 'dodge', actor: actorId }],
  }, null);
}

describe('authoritative engine round session', () => {
  it('applies canonical long-range disadvantage during attack resolution', () => {
    const state = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [CLERIC_ID, { column: 31, row: 0 }],
    ]));
    const archer = authorized(state, attackIntent(ARCHER_ID, 'longbow', CLERIC_ID));
    const session = new EngineRoundSession(
      state,
      mulberry32(8_274_114),
      { kind: 'unattended', askDefault: 'decline' },
    );
    session.applyResolvedMechanics([archer], null);

    const attack = session.currentState().eventLog.find((event) =>
      event.type === 'attack_resolved' &&
      event.actor === ARCHER_ID &&
      event.target === CLERIC_ID);
    expect(attack?.type).toBe('attack_resolved');
    if (attack?.type !== 'attack_resolved') throw new Error('Missing long-range attack event.');
    // 31 grid intervals are 155 ft: beyond Longbow normal 150, within long 600.
    expect(attack.attack.roll.mode).toBe('disadvantage');
    expect(attack.attack.roll.faces).toHaveLength(2);
  });

  it('applies the evaluator straight roll for an unconscious prone target beyond 5 feet', () => {
    const positioned = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 6, row: 0 }],
    ]));
    const state: EncounterState = {
      ...positioned,
      combatants: positioned.combatants.map((candidate) => candidate.profile.id === FOCUS_ID
        ? {
            ...candidate,
            hitPoints: 0,
            life: 'dying',
            deathSaves: { successes: 0, failures: 0 },
          }
        : candidate),
    };
    const archer = authorized(state, attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));
    const session = new EngineRoundSession(
      state,
      mulberry32(8_274_115),
      { kind: 'unattended', askDefault: 'decline' },
    );
    session.applyResolvedMechanics([archer], null);

    const attack = session.currentState().eventLog.find((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID);
    expect(attack?.type).toBe('attack_resolved');
    if (attack?.type !== 'attack_resolved') throw new Error('Missing attack against dying target.');
    // Unconscious grants Advantage; its Prone state imposes Disadvantage beyond 5 feet.
    expect(attack.attack.roll.mode).toBe('normal');
    expect(attack.attack.roll.faces).toHaveLength(1);
  });

  it('honors exact per-combatant order without skipping PCs and enforces maximal monster mini-blocks', () => {
    const session = new EngineRoundSession(
      segmentedState(),
      mulberry32(8_274_113),
      { kind: 'unattended', askDefault: 'decline' },
    );

    session.beginRoundWithoutSkipping(REQUEST, null);
    expect(session.currentState().initiative.map((entry) => entry.combatant)).toEqual([
      FOCUS_ID, KILLER_ID, ARCHER_ID, CLERIC_ID, BRUTE_ID, WIZARD_ID,
    ]);
    expect(session.currentState().activeCombatant).toBe(FOCUS_ID);

    completeDodge(session, FOCUS_ID);
    const beforeRejectedSegment = session.currentState();
    const killer = authorized(beforeRejectedSegment, dodgeIntent(KILLER_ID));
    const archer = authorized(beforeRejectedSegment, dodgeIntent(ARCHER_ID));
    expect(() => session.applyConsecutiveMonsterSegment([killer], null)).toThrow(
      `Monster initiative segment must contain the maximal consecutive actors: ${KILLER_ID}, ${ARCHER_ID}.`,
    );
    expect(session.currentState()).toEqual(beforeRejectedSegment);

    session.applyConsecutiveMonsterSegment([killer, archer], null);
    expect(session.currentState().activeCombatant).toBe(CLERIC_ID);
    expect(session.currentState().eventLog.flatMap((event) =>
      event.type === 'turn_started' && event.round === 1 ? [event.combatant] : [])).toEqual([
      FOCUS_ID, KILLER_ID, ARCHER_ID, CLERIC_ID,
    ]);
    expect(session.currentState().eventLog.some((event) =>
      event.type === 'turn_ended' && event.combatant === CLERIC_ID)).toBe(false);
  });

  it('keeps the session RNG authoritative across PC turns and monster segments', () => {
    const execute = (): EncounterState['eventLog'] => {
      const session = new EngineRoundSession(
        segmentedState(),
        mulberry32(6_103_921),
        { kind: 'unattended', askDefault: 'decline' },
      );
      session.beginRoundWithoutSkipping(REQUEST, null);
      completeDodge(session, FOCUS_ID);
      session.applyConsecutiveMonsterSegment([
        authorized(session.currentState(), dodgeIntent(KILLER_ID)),
        authorized(session.currentState(), dodgeIntent(ARCHER_ID)),
      ], null);
      completeDodge(session, CLERIC_ID);
      session.applyConsecutiveMonsterSegment([
        authorized(session.currentState(), dodgeIntent(BRUTE_ID)),
      ], null);
      completeDodge(session, WIZARD_ID);
      return session.currentState().eventLog;
    };

    expect(execute()).toEqual(execute());
  });

  it('resolves reactions raised by a scripted PC command through the session boundary policy', () => {
    const state = segmentedState(new Map([
      [KILLER_ID, { column: 5, row: 5 }],
      [CLERIC_ID, { column: 6, row: 5 }],
    ]));
    const session = new EngineRoundSession(
      state,
      mulberry32(7_210_411),
      { kind: 'unattended', askDefault: 'take' },
    );
    session.beginRoundWithoutSkipping(REQUEST, null);
    session.completeScriptedPcTurn({
      actorId: FOCUS_ID,
      reducerCommands: [{ type: 'end_turn', actor: FOCUS_ID }],
    }, null);
    session.applyConsecutiveMonsterSegment([
      authorized(session.currentState(), dodgeIntent(KILLER_ID)),
      authorized(session.currentState(), dodgeIntent(ARCHER_ID)),
    ], null);

    const applied = session.completeScriptedPcTurn({
      actorId: CLERIC_ID,
      reducerCommands: [{
        type: 'move', actor: CLERIC_ID,
        path: [{ column: 7, row: 5 }, { column: 8, row: 5 }],
        cause: 'voluntary',
      }],
    }, null);

    expect(applied.fallbackResolutions).toContainEqual(expect.objectContaining({
      combatant: KILLER_ID,
      reactionKind: 'opportunity_attack',
      resolution: 'accept',
    }));
    expect(session.currentState().eventLog).toContainEqual(expect.objectContaining({
      type: 'pending_decision_resolved',
      combatant: KILLER_ID,
      reactionKind: 'opportunity_attack',
      optionId: 'accept',
    }));
  });

  it.each([3_943_004, 3_943_007])(
    'uses one canonical state for generated room %i capsule, fixture, and authorization',
    (seed) => {
      const session = new EngineRoundSession(
        generateRoom(seed).encounter.state,
        mulberry32(8_274_113),
        { kind: 'unattended', askDefault: 'decline' },
      );

      const prepared = session.prepareRound(REQUEST, null);
      const authorizationCapsule = session.authorizationCapsule({
        ...REQUEST,
        revision: prepared.snapshot.capsule.revision,
      });
      const serialized = JSON.parse(prepared.snapshot.fixtureJson) as {
        readonly encounter: { readonly state: ReturnType<EngineRoundSession['currentState']> };
      };

      expect(prepared.revisionDelta).toBeGreaterThan(0);
      expect(prepared.snapshot.capsule).toEqual(expect.objectContaining({
        revision: authorizationCapsule.revision,
        digest: authorizationCapsule.digest,
      }));
      expect(serialized.encounter.state).toEqual(session.currentState());
      expect(session.currentState().pendingDecisions.some((decision) =>
        decision.kind === 'death_save')).toBe(false);
      for (const actorId of prepared.snapshot.capsule.request?.actors ?? []) {
        const resolution = pureIntentResolver.resolve(session.currentState(), {
          actorId,
          choice: { kind: 'dodge' },
          movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
          engagement: { stance: 'hold_position' },
          fallback: null,
        });
        expect(resolution.valid).toBe(true);
      }
    },
  );

  it('does not consume a pending death-save decision in DM-attended mode', () => {
    const rng = mulberry32(8_274_113);
    const generated = generateRoom(3_943_004).encounter.state;
    let started = reduceEncounter(generated, { type: 'roll_initiative' }, rng).state;
    for (let index = 0; !started.pendingDecisions.some((decision) =>
      decision.kind === 'death_save') && index < started.combatants.length * 2; index += 1) {
      const active = started.activeCombatant;
      if (active === null) throw new Error('Generated room initiative has no active combatant.');
      started = reduceEncounter(started, { type: 'end_turn', actor: active }, rng).state;
    }
    expect(started.pendingDecisions).toContainEqual(expect.objectContaining({ kind: 'death_save' }));
    const session = new EngineRoundSession(started, rng, { kind: 'dm_attended' });

    expect(() => session.prepareRound(REQUEST, null)).toThrow(
      'The turn cannot advance while a pending decision for this boundary is unresolved.',
    );
    expect(session.currentState().pendingDecisions).toContainEqual(
      expect.objectContaining({ kind: 'death_save' }),
    );
  });

  it('does not let a later monster attack a focus target killed earlier in the block', () => {
    const positioned = fixedPositions(new Map([
      [KILLER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 1, row: 0 }],
      [ARCHER_ID, { column: 4, row: 0 }],
    ]));
    const state: EncounterState = {
      ...positioned,
      combatants: positioned.combatants.map((candidate) => candidate.profile.id === FOCUS_ID
        ? {
            ...candidate,
            hitPoints: 1,
            profile: {
              ...candidate.profile,
              rules: { ...candidate.profile.rules, armorClass: armorClass(1), usesDeathSaves: false },
            },
          }
        : candidate),
    };
    const killer = authorized(state, attackIntent(KILLER_ID, 'dagger', FOCUS_ID));
    const archer = authorized(state, attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));
    const session = new EngineRoundSession(state, mulberry32(19), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([killer, archer], null);

    expect(session.currentState().combatants.find((entry) => entry.profile.id === FOCUS_ID)?.life).toBe('dead');
    expect(session.currentState().eventLog.some((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID && event.target === FOCUS_ID)).toBe(false);
    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedTargetId: FOCUS_ID,
      appliedTargetId: null,
      reasonCodes: ['branch_changed', 'target_changed'],
      refusalCodes: ['TARGET_DEAD'],
    }]);
  });

  it('preserves live re-resolution deviation evidence inside a monster segment', () => {
    const positioned = segmentedState(new Map([
      [KILLER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 1, row: 0 }],
      [ARCHER_ID, { column: 4, row: 0 }],
    ]));
    const state: EncounterState = {
      ...positioned,
      combatants: positioned.combatants.map((candidate) => candidate.profile.id === FOCUS_ID
        ? {
            ...candidate,
            hitPoints: 1,
            profile: {
              ...candidate.profile,
              rules: { ...candidate.profile.rules, armorClass: armorClass(1), usesDeathSaves: false },
            },
          }
        : candidate),
    };
    const session = new EngineRoundSession(
      state,
      mulberry32(19),
      { kind: 'unattended', askDefault: 'decline' },
    );
    session.beginRoundWithoutSkipping(REQUEST, null);
    session.completeScriptedPcTurn({
      actorId: FOCUS_ID,
      reducerCommands: [{ type: 'end_turn', actor: FOCUS_ID }],
    }, null);
    const killer = authorized(session.currentState(), attackIntent(KILLER_ID, 'dagger', FOCUS_ID));
    const archer = authorized(session.currentState(), attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));

    const applied = session.applyConsecutiveMonsterSegment([killer, archer], null);

    expect(session.currentState().combatants.find((entry) => entry.profile.id === FOCUS_ID)?.life).toBe('dead');
    expect(session.currentState().eventLog.flatMap((event) =>
      event.type === 'attack_resolved' ? [event.actor] : [])).toEqual([KILLER_ID]);
    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedTargetId: FOCUS_ID,
      appliedTargetId: null,
      reasonCodes: ['branch_changed', 'target_changed'],
      refusalCodes: ['TARGET_DEAD'],
    }]);
  });

  it('falls back after a forced displacement leaves a zero-movement archer out of range', () => {
    const authorizationState = fixedPositions(new Map([
      [KILLER_ID, { column: 10, row: 0 }],
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 30, row: 0 }],
    ]), 130);
    const archer = authorized(authorizationState, attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));
    const displacedState: EncounterState = {
      ...authorizationState,
      tokens: authorizationState.tokens.map((token) => token.combatantId === FOCUS_ID
        ? { ...token, position: { column: 121, row: 0 } }
        : token),
    };
    const earlierDodge = authorized(displacedState, {
      actorId: KILLER_ID,
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
      fallback: null,
    });
    const session = new EngineRoundSession(displacedState, mulberry32(23), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([earlierDodge, archer], null);

    expect(session.currentState().eventLog.some((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID)).toBe(false);
    expect(applied.deviationResolutions).toEqual([expect.objectContaining({
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedTargetId: FOCUS_ID,
      appliedTargetId: null,
      reasonCodes: ['branch_changed', 'target_changed'],
      refusalCodes: ['TARGET_UNREACHABLE'],
    })]);
  });

  it('preserves authorization-time mechanics exactly when no relevant state drifts', () => {
    const state = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 4, row: 0 }],
    ]));
    const archer = authorized(state, attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));
    const session = new EngineRoundSession(state, mulberry32(29), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([archer], null);
    const attack = session.currentState().eventLog.find((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID);

    expect(applied.deviationResolutions).toEqual([]);
    expect(attack).toEqual(expect.objectContaining({ actor: ARCHER_ID, target: archer.mechanics.targetId }));
    expect(session.currentState().tokens.find((token) => token.combatantId === ARCHER_ID)?.position)
      .toEqual(archer.mechanics.finalPosition);
  });

  it('degrades to Dodge with both branch refusal codes when no branch remains legal', () => {
    const authorizationState = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 4, row: 0 }],
    ]), 130);
    const intent: EngineTurnIntent = {
      ...attackIntent(ARCHER_ID, 'longbow', FOCUS_ID),
      fallback: {
        choice: {
          kind: 'attack', actionId: 'longsword',
          target: { kind: 'combatant', combatantId: FOCUS_ID },
        },
        movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
        engagement: { stance: 'hold_position' },
      },
    };
    const archer = authorized(authorizationState, intent);
    const displacedState: EncounterState = {
      ...authorizationState,
      tokens: authorizationState.tokens.map((token) => token.combatantId === FOCUS_ID
        ? { ...token, position: { column: 121, row: 0 } }
        : token),
    };
    const session = new EngineRoundSession(displacedState, mulberry32(31), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([archer], null);

    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'dodge',
      authorizedTargetId: FOCUS_ID,
      appliedTargetId: null,
      reasonCodes: ['degraded_to_dodge'],
      refusalCodes: ['TARGET_UNREACHABLE', 'TARGET_UNREACHABLE'],
    }]);
    expect(session.currentState().combatants.find((entry) => entry.profile.id === ARCHER_ID)?.turn.dodging)
      .toBe(true);
  });
});
