import { describe, expect, it } from 'vitest';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { EngineRoundSession, type EngineRoundCapsuleRequest } from '../../../src/vtt/engine-round-session';
import { pureIntentResolver } from '../../../src/vtt/intent-resolver';
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
});
