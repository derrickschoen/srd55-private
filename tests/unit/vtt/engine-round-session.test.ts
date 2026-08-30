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
const ARCHER_ID = combatantId('combatant:generated-3943001-monster-3');
const FOCUS_ID = combatantId('combatant:fighter');

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

describe('authoritative engine round session', () => {
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

  it('falls back after a forced displacement leaves a zero-movement archer out of range', () => {
    const authorizationState = fixedPositions(new Map([
      [KILLER_ID, { column: 10, row: 0 }],
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 30, row: 0 }],
    ]));
    const archer = authorized(authorizationState, attackIntent(ARCHER_ID, 'longbow', FOCUS_ID));
    const displacedState: EncounterState = {
      ...authorizationState,
      tokens: authorizationState.tokens.map((token) => token.combatantId === FOCUS_ID
        ? { ...token, position: { column: 35, row: 0 } }
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
    ]));
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
        ? { ...token, position: { column: 35, row: 0 } }
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
