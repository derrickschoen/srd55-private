import { describe, expect, it } from 'vitest';
import type { ControllerRequest } from '../../../src/combat/controllers';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { feetPoint } from '../../../src/combat/templates';
import { projectEncounter } from '../../../src/combat/visibility';
import { combatantId, feet } from '../../../src/combat/values';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  projectPlayerBoard,
  serializePlayerBoard,
} from '../../../src/vtt/encounter-projections';
import { decodePlayerDecision } from '../../../src/vtt/local-window-channel';
import {
  REFERENCE_CLERIC_ID,
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function hiddenDeathSaveState() {
  const rng = mulberry32(61);
  let state = createEncounter(referenceEncounterSetup());
  state = reduceEncounter(state, { type: 'roll_initiative' }, rng).state;
  state = reduceEncounter(state, {
    type: 'adjudicate',
    target: REFERENCE_FIGHTER_ID,
    subject: 'engine:hit-points',
    reasoning: 'DM-only reason sentinel 9f59',
    consequence: { kind: 'hit_point_delta', amount: -999 },
  }, rng).state;
  for (const actor of [
    REFERENCE_FIGHTER_ID,
    REFERENCE_CLERIC_ID,
    combatantId('combatant:wizard'),
    REFERENCE_MONSTER_ID,
  ]) {
    state = reduceEncounter(state, { type: 'end_turn', actor }, rng).state;
  }
  return state;
}

function hostBoundaryHiddenState() {
  const base = referenceEncounterSetup();
  const setup = {
    ...base,
    dmNotes: ['DM tactics sentinel: ash-owl waits behind the eastern screen.'],
    tokens: base.tokens.map((token) =>
      token.combatantId === REFERENCE_MONSTER_ID
        ? { ...token, position: { column: 8, row: 1 } }
        : token,
    ),
  };
  const rng = mulberry32(8102);
  let state = createEncounter(setup);
  state = reduceEncounter(state, { type: 'roll_initiative' }, rng).state;
  state = reduceEncounter(state, {
    type: 'adjudicate',
    target: REFERENCE_FIGHTER_ID,
    subject: 'engine:hit-points',
    reasoning: 'DM reasoning sentinel: basalt-raven caused the collapse.',
    consequence: { kind: 'hit_point_delta', amount: -999 },
  }, rng).state;
  for (const actor of [
    REFERENCE_FIGHTER_ID,
    REFERENCE_CLERIC_ID,
    combatantId('combatant:wizard'),
    REFERENCE_MONSTER_ID,
  ]) {
    state = reduceEncounter(state, { type: 'end_turn', actor }, rng).state;
  }
  return state;
}

describe('increment 6 projection boundary', () => {
  it('HOST-WIRING-PLAYER-SECRECY serializes only the filtered player half of a DM host snapshot', () => {
    const host = new DmEncounterHost(
      'session:host-wiring-secrecy',
      new MemoryBrowserSessionStore(),
      { initialState: hostBoundaryHiddenState() },
    );
    const player = host.snapshot().player;
    const serialized = serializePlayerBoard(player);

    expect(player.audience).toBe('player');
    expect(player.combatants.map((combatant) => combatant.name)).toEqual([
      'Reference Fighter',
      'Reference Cleric',
      'Reference Wizard',
    ]);
    expect(player.events).toContainEqual(expect.objectContaining({
      type: 'adjudicated',
      target: REFERENCE_FIGHTER_ID,
      consequence: expect.objectContaining({ kind: 'hit_points', after: 0 }),
    }));
    expect(serialized).toContain('Reference Fighter');
    expect(serialized).toContain('"round":2');
    expect(serialized).not.toContain('death_save_resolved');
    expect(serialized).not.toContain('combatant:training-brute');
    expect(serialized).not.toContain('DM tactics sentinel: ash-owl');
    expect(serialized).not.toContain('DM reasoning sentinel: basalt-raven');
    expect(serialized).not.toContain('dmOnly');
    expect(serialized).not.toContain('history');
    host.close();
  });

  it('M37-HIDDEN-ROLL-ABSENT serializes no hidden death-save result or DM facts', () => {
    const projection = projectPlayerBoard(
      hiddenDeathSaveState(),
      IDLE,
      REFERENCE_PLAYER_IDS,
    );
    const serialized = serializePlayerBoard(projection);

    expect(serialized).not.toContain('death_save_resolved');
    expect(serialized).not.toContain('DM-only reason sentinel 9f59');
    expect(serialized).not.toContain('dmNotes');
    expect(serialized).not.toContain('foggedCells');
    expect(serialized).not.toContain('deathSaves');
    expect(serialized).not.toContain('rules');
    expect(projection.events.some((event) => event.type === 'adjudicated')).toBe(true);
  });

  it('M39-ACTIVE-PC-HIGHLIGHT uses the actual active combatant', () => {
    const rng = mulberry32(9);
    let state = createEncounter(referenceEncounterSetup());
    state = reduceEncounter(state, { type: 'roll_initiative' }, rng).state;
    state = reduceEncounter(
      state,
      { type: 'end_turn', actor: REFERENCE_FIGHTER_ID },
      rng,
    ).state;

    const projection = projectPlayerBoard(state, IDLE, REFERENCE_PLAYER_IDS);
    expect(projection.activeCombatant).toBe(REFERENCE_CLERIC_ID);
    expect(projection.highlightedCombatant).toBe(REFERENCE_CLERIC_ID);
    expect(
      projection.combatants.find((combatant) => combatant.id === REFERENCE_CLERIC_ID)?.active,
    ).toBe(true);
  });

  it('M41-ADJUDICATED-LABEL keeps the label and visible consequence but redacts reasoning', () => {
    const projection = projectPlayerBoard(
      hiddenDeathSaveState(),
      IDLE,
      REFERENCE_PLAYER_IDS,
    );
    const event = projection.events.find((candidate) => candidate.type === 'adjudicated');

    expect(event).toEqual(expect.objectContaining({
      type: 'adjudicated',
      target: REFERENCE_FIGHTER_ID,
      consequence: expect.objectContaining({ kind: 'hit_points', after: 0 }),
    }));
    expect(event === undefined ? true : 'reasoning' in event).toBe(false);
  });

  it('OWN-MONSTER-HP-BOUNDARY omits exact hostile HP while retaining owned PC HP', () => {
    const projection = projectPlayerBoard(
      hiddenDeathSaveState(),
      IDLE,
      REFERENCE_PLAYER_IDS,
    );
    const monster = projection.combatants.find((entry) => entry.id === REFERENCE_MONSTER_ID);
    const fighter = projection.combatants.find((entry) => entry.id === REFERENCE_FIGHTER_ID);

    expect(monster === undefined ? false : 'hitPoints' in monster).toBe(false);
    expect(fighter).toEqual(expect.objectContaining({ hitPoints: 0 }));
  });

  it('M40-AOE-CONTROLLER-BOUNDARY accepts only an exact projected HumanController action', () => {
    const legal = {
      type: 'cast_spell',
      actor: combatantId('combatant:wizard'),
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
        template: { origin: feetPoint(20, 20), radius: feet(10) },
      },
      weaponAttack: null,
      selectedOption: null,
    } satisfies EncounterCommand;
    const request: ControllerRequest = {
      kind: 'turn',
      requestId: 'turn:shatter',
      encounterRevision: 7,
      actorId: legal.actor,
      visibleState: projectEncounter(createEncounter(referenceEncounterSetup()), {
        kind: 'player',
        combatantId: legal.actor,
      }),
      legalActions: { actions: [legal] },
    };
    const envelope = {
      kind: 'human_controller_decision',
      sessionId: 'session:test',
      decision: {
        requestId: request.requestId,
        encounterRevision: request.encounterRevision,
        action: legal,
      },
    };

    expect(decodePlayerDecision(envelope, 'session:test', request).action).toEqual(legal);
    expect(() => decodePlayerDecision({
      ...envelope,
      decision: {
        ...envelope.decision,
        action: {
          ...legal,
          area: {
            shape: 'sphere',
            template: { origin: feetPoint(25, 20), radius: feet(10) },
          },
        },
      },
    }, 'session:test', request)).toThrow('not one of the projected legal actions');
  });

  it('M42-ADJUDICATION-PAUSES cancels the pending request and dispatches nothing until resume', async () => {
    const host = new DmEncounterHost('session:adjudication-pause', new MemoryBrowserSessionStore());
    host.start();
    await Promise.resolve();
    await Promise.resolve();
    const before = host.snapshot();
    expect(before.dm.pendingRequest?.actorId).toBe(REFERENCE_FIGHTER_ID);

    host.adjudicate({
      type: 'adjudicate',
      target: REFERENCE_MONSTER_ID,
      subject: 'engine:hit-points',
      reasoning: 'The terrain ruling changes the visible damage.',
      consequence: { kind: 'hit_point_delta', amount: -1 },
    });
    await Promise.resolve();
    const paused = host.snapshot();

    expect(paused.dm.coordinator.pause).toEqual(expect.objectContaining({
      kind: 'adjudicated',
    }));
    expect(paused.dm.pendingRequest).toBeNull();
    expect(paused.dm.encounter.recentEvents.at(-1)).toEqual(expect.objectContaining({
      type: 'adjudicated',
      reasoning: 'The terrain ruling changes the visible damage.',
    }));
    const latestReducer = [...paused.dm.history].reverse().find(
      (entry) => entry.transition.kind === 'reducer_applied',
    );
    expect(
      paused.dm.history
        .filter((entry) => entry.revision > (latestReducer?.revision ?? 0))
        .some((entry) => entry.transition.kind === 'controller_request_issued'),
    ).toBe(false);
    host.close();
  });
});
