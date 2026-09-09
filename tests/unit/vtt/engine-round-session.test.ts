import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { combatToken, monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import {
  armorClass,
  combatantId,
  damageType,
  dieSides,
  encounterBranchId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import { LION } from '../../../src/combat/statblocks/wild-beasts';
import {
  EngineRoundSession,
  type AuthorizedEngineTurnProposal,
  type EngineRoundCapsuleRequest,
} from '../../../src/vtt/engine-round-session';
import {
  availableEngineActorOptions,
  pureTurnProposalResolver,
  type EngineTurnProposal,
} from '../../../src/vtt/intent-resolver';
import { generateRoom } from '../../../src/vtt/room-generator';
import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

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
  return freshMonsterPlanningState({
    ...generated,
    bounds: { columns, rows: 20 },
    blockedCells: [],
    worldObjects: [],
    persistentAreas: [],
  environment: {
    narrowOpeningRegions: [],
      lightRegions: [], obscurementRegions: [], difficultTerrainRegions: [], movementRegions: [],
    },
    tokens: generated.tokens.map((token, index) => ({
      ...token,
      position: positions.get(token.combatantId) ?? { column: 10 + index, row: 10 },
    })),
  });
}

function attackProposal(
  state: EncounterState,
  actorId: CombatantId,
  actionId: string,
  targetId: CombatantId,
): EngineTurnProposal {
  const planningState = projectFutureMonsterTurns(state, [actorId]);
  const options = availableEngineActorOptions(planningState, actorId);
  const primary = options.find((option) => option.actionSlots.some((slot) => {
    const use = slot.use;
    if (use.kind === 'attack') return use.actionId === actionId && use.target.kind === 'combatant' && use.target.combatantId === targetId;
    return use.kind === 'multiattack' && use.components.some((component) =>
      component.actionId === actionId && component.target.kind === 'combatant' && component.target.combatantId === targetId);
  }));
  const fallback = options.find((option) => option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
  if (primary === undefined) throw new Error(`Test fixture omitted ${actionId} for ${actorId}.`);
  return {
    actorId, expectedRevision: state.revision, primaryOptionId: primary.optionId,
    fallbackOptionId: fallback?.optionId ?? null,
    reason: 'Exercise the round session proposal fixture.', overrideJustification: null,
  };
}

function authorized(state: EncounterState, proposal: EngineTurnProposal): AuthorizedEngineTurnProposal {
  const planningState = projectFutureMonsterTurns(state, [proposal.actorId]);
  const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
  if (!resolution.valid) throw new Error(`Test proposal was not authorizable: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
  return {
    proposal, option: resolution.option, primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption, mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
  };
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

function dodgeProposal(state: EncounterState, actorId: CombatantId): EngineTurnProposal {
  const planningState = projectFutureMonsterTurns(state, [actorId]);
  const dodge = availableEngineActorOptions(planningState, actorId)
    .find((option) => option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
  if (dodge === undefined) throw new Error(`Test fixture omitted Dodge for ${actorId}.`);
  return {
    actorId, expectedRevision: state.revision, primaryOptionId: dodge.optionId,
    fallbackOptionId: null,
    reason: 'Exercise the invalid round session fixture.', overrideJustification: null,
  };
}

function completeDodge(session: EngineRoundSession, actorId: CombatantId) {
  return session.completeScriptedPcTurn({
    actorId,
    reducerCommands: [{ type: 'dodge', actor: actorId }],
  }, null);
}

describe('authoritative engine round session', () => {
  it('preserves a pending legendary window when an empty monster application does no work', () => {
    const activeMonster = monsterProfile('empty-application-active', { initiativeBonus: 100 });
    const legendaryBase = monsterCombatantProfile(UNICORN, {
      combatantId: 'combatant:empty-application-legendary',
      tokenId: 'token:empty-application-legendary',
    });
    const legendaryMonster = {
      ...legendaryBase,
      rules: { ...legendaryBase.rules, initiativeBonus: 50 },
    };
    const player = playerProfile('empty-application-player', { initiativeBonus: 0 });
    const initial = createEncounter({
      bounds: { columns: 16, rows: 5 },
      combatants: [activeMonster, legendaryMonster, player],
      tokens: [
        placedToken(activeMonster, 0, 1),
        placedToken(legendaryMonster, 5, 1),
        placedToken(player, 13, 1),
      ],
      config: { initiativeMode: 'per_combatant' },
    });
    const started = reduceEncounter(
      initial,
      { type: 'roll_initiative' },
      mulberry32(58_410_001),
    ).state;
    expect(started.activeCombatant).toBe(activeMonster.id);
    const queued = reduceEncounter(
      started,
      { type: 'end_turn', actor: activeMonster.id },
      mulberry32(58_410_002),
    ).state;
    expect(queued.combatants.find((entry) => entry.profile.id === activeMonster.id)?.life)
      .toBe('living');
    expect(queued.pendingDecisions).toContainEqual(expect.objectContaining({
      kind: 'legendary_action_window',
      combatant: legendaryMonster.id,
      boundary: { activeCombatant: activeMonster.id, round: 1 },
    }));
    const beforeBytes = canonicalJson(queued);
    const session = new EngineRoundSession(
      queued,
      mulberry32(58_410_003),
      { kind: 'unattended', askDefault: 'decline' },
    );

    const applied = session.applyResolvedMechanics([], null);
    const after = session.currentState();

    expect(applied).toEqual({
      revisionDelta: 0,
      fallbackResolutions: [],
      guidedResolutions: [],
      deviationResolutions: [],
    });
    expect(after.revision).toBe(queued.revision);
    expect(after.activeCombatant).toBe(activeMonster.id);
    expect(after.activeInitiativeIndex).toBe(queued.activeInitiativeIndex);
    expect(after.pendingDecisions).toEqual(queued.pendingDecisions);
    expect(canonicalJson(after)).toBe(beforeBytes);
  });

  it('advances past an active PC killed mid-round before the next segment begins', () => {
    const started = reduceEncounter(
      segmentedState(),
      { type: 'roll_initiative' },
      mulberry32(46_600_003),
    ).state;
    expect(started.activeCombatant).toBe(FOCUS_ID);
    const killed: EncounterState = {
      ...started,
      combatants: started.combatants.map((combatant) => combatant.profile.id === FOCUS_ID
        ? { ...combatant, hitPoints: 0, life: 'dead' as const, deathSaves: null }
        : combatant),
    };
    const session = new EngineRoundSession(killed, mulberry32(46_600_004), {
      kind: 'unattended', askDefault: 'decline',
    });

    session.beginRoundWithoutSkipping({ ...REQUEST, revision: killed.revision }, null);

    expect(session.currentState().activeCombatant).toBe(KILLER_ID);
    expect(session.currentState().combatants.find((combatant) =>
      combatant.profile.id === KILLER_ID)?.life).toBe('living');
  });

  it('executes a mixed multiattack attack child and saving-throw child once each', () => {
    const positioned = fixedPositions(new Map([
      [BRUTE_ID, { column: 1, row: 1 }],
      [FOCUS_ID, { column: 3, row: 1 }],
    ]));
    const lionProfile = monsterCombatantProfile(LION, {
      combatantId: BRUTE_ID,
      tokenId: 'token:generated-3943001-monster-2',
    });
    const state: EncounterState = {
      ...positioned,
      combatants: positioned.combatants.map((candidate) => candidate.profile.id === BRUTE_ID
        ? { ...candidate, hitPoints: LION.hitPointMaximum, profile: lionProfile }
        : candidate),
      tokens: positioned.tokens.map((placed) => placed.combatantId === BRUTE_ID
        ? combatToken(lionProfile, placed.position)
        : placed),
    };
    const lion = authorized(state, attackProposal(state, BRUTE_ID, 'rend', FOCUS_ID));
    expect(lion.mechanics.actionSlots.map((use) => use.kind)).toEqual(['attack', 'attack']);
    const mixedOption = availableEngineActorOptions(state, BRUTE_ID).find((option) =>
      option.label.startsWith('Rend + Roar') && option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'multiattack' &&
        slot.use.components.every((component) => component.target.kind === 'combatant' &&
          component.target.combatantId === FOCUS_ID)));
    if (mixedOption === undefined) throw new Error('Lion mixed option is absent.');
    const mixed = authorized(state, {
      actorId: BRUTE_ID,
      expectedRevision: state.revision,
      primaryOptionId: mixedOption.optionId,
      fallbackOptionId: null,
      reason: 'Exercise the round session resolution fixture.',
      overrideJustification: null,
    });
    expect(mixed.mechanics.actionSlots.map((use) => use.kind)).toEqual(['attack', 'saving_throw']);

    const session = new EngineRoundSession(state, mulberry32(46_600_002), {
      kind: 'unattended', askDefault: 'decline',
    });
    session.applyResolvedMechanics([mixed], null);
    const events = session.currentState().eventLog.filter((event) =>
      (event.type === 'attack_resolved' && event.actor === BRUTE_ID) ||
      (event.type === 'save_resolved' && event.source === BRUTE_ID));
    expect(events.map((event) => event.type)).toEqual(['attack_resolved', 'save_resolved']);
  });

  it('applies canonical long-range disadvantage during attack resolution', () => {
    const state = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [CLERIC_ID, { column: 31, row: 0 }],
    ]));
    const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', CLERIC_ID));
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
    const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', FOCUS_ID));
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
    const killer = authorized(beforeRejectedSegment, dodgeProposal(beforeRejectedSegment, KILLER_ID));
    const archer = authorized(beforeRejectedSegment, dodgeProposal(beforeRejectedSegment, ARCHER_ID));
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
        authorized(session.currentState(), dodgeProposal(session.currentState(), KILLER_ID)),
        authorized(session.currentState(), dodgeProposal(session.currentState(), ARCHER_ID)),
      ], null);
      completeDodge(session, CLERIC_ID);
      session.applyConsecutiveMonsterSegment([
        authorized(session.currentState(), dodgeProposal(session.currentState(), BRUTE_ID)),
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
      authorized(session.currentState(), dodgeProposal(session.currentState(), KILLER_ID)),
      authorized(session.currentState(), dodgeProposal(session.currentState(), ARCHER_ID)),
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

  it('rolls back a failed random-consuming PC turn before a control-identical success', () => {
    const started = reduceEncounter(
      segmentedState(new Map([
        [FOCUS_ID, { column: 0, row: 0 }],
        [KILLER_ID, { column: 1, row: 0 }],
      ])),
      { type: 'roll_initiative' },
      mulberry32(58_420_001),
    ).state;
    expect(started.activeCombatant).toBe(FOCUS_ID);
    const attack: Extract<EncounterCommand, { readonly type: 'attack' }> = {
      type: 'attack',
      actor: FOCUS_ID,
      target: KILLER_ID,
      attackBonus: 100,
      criticalFloor: 20,
      rollMode: 'normal',
      attackerCanSeeTarget: true,
      targetCanSeeAttacker: true,
      damage: {
        terms: [{
          type: damageType('Force'),
          dice: { count: 0, sides: dieSides(6), modifier: 0 },
        }],
        critical: false,
        responses: [],
      },
    };
    const rollbackError = new Error('sentinel scripted PC validation failure');
    const invalidAfterAttack: EncounterCommand = {
      type: 'dodge',
      get actor(): CombatantId {
        throw rollbackError;
      },
    };
    const seed = 58_420_002;
    const failedSession = new EngineRoundSession(
      started,
      mulberry32(seed),
      { kind: 'unattended', askDefault: 'decline' },
    );
    const untouchedControl = new EngineRoundSession(
      started,
      mulberry32(seed),
      { kind: 'unattended', askDefault: 'decline' },
    );
    const beforeFailureBytes = canonicalJson(failedSession.currentState());

    let caught: unknown;
    try {
      failedSession.completeScriptedPcTurn({
        actorId: FOCUS_ID,
        reducerCommands: [attack, invalidAfterAttack],
      }, null);
    } catch (error: unknown) {
      caught = error;
    }

    expect(caught).toBe(rollbackError);
    expect(canonicalJson(failedSession.currentState())).toBe(beforeFailureBytes);
    expect(failedSession.currentState()).toEqual(untouchedControl.currentState());

    const recovered = failedSession.completeScriptedPcTurn({
      actorId: FOCUS_ID,
      reducerCommands: [attack],
    }, null);
    const control = untouchedControl.completeScriptedPcTurn({
      actorId: FOCUS_ID,
      reducerCommands: [attack],
    }, null);
    expect(recovered).toEqual({
      revisionDelta: 2,
      fallbackResolutions: [],
      guidedResolutions: [],
    });
    expect(control).toEqual({
      revisionDelta: 2,
      fallbackResolutions: [],
      guidedResolutions: [],
    });
    expect(canonicalJson(failedSession.currentState()))
      .toBe(canonicalJson(untouchedControl.currentState()));

    const oracle = mulberry32(seed);
    const expectedAttackFace = Math.floor(oracle() * 20) + 1;
    expect(oracle.snapshot().draws).toBe(1);
    const attackEvent = failedSession.currentState().eventLog.find((event) =>
      event.type === 'attack_resolved' && event.actor === FOCUS_ID && event.target === KILLER_ID);
    expect(attackEvent?.type).toBe('attack_resolved');
    if (attackEvent?.type !== 'attack_resolved') throw new Error('Missing recovered PC attack event.');
    expect(attackEvent.attack.roll.faces).toEqual([expectedAttackFace]);
    expect(attackEvent.damage?.terms[0]?.roll.faces).toEqual([]);
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
        const proposal = dodgeProposal(session.currentState(), actorId);
        const resolution = pureTurnProposalResolver.resolve(
          projectFutureMonsterTurns(session.currentState(), [actorId]),
          proposal,
        );
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
    const killer = authorized(state, attackProposal(state, KILLER_ID, 'dagger', FOCUS_ID));
    const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', FOCUS_ID));
    const session = new EngineRoundSession(state, mulberry32(19), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([killer, archer], null);

    expect(session.currentState().combatants.find((entry) => entry.profile.id === FOCUS_ID)?.life).toBe('dead');
    expect(session.currentState().eventLog.some((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID && event.target === FOCUS_ID)).toBe(false);
    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedOptionId: archer.option.optionId,
      appliedOptionId: archer.fallbackOption?.optionId,
      reasonCodes: ['branch_changed', 'option_changed'],
      refusalCodes: ['ATTACK_UNAVAILABLE'],
    }]);
  });

  it('records a typed omission when an earlier attack in one option kills its later target', () => {
    const positioned = fixedPositions(new Map([
      [BRUTE_ID, { column: 1, row: 1 }],
      [FOCUS_ID, { column: 3, row: 1 }],
    ]));
    const lionProfile = monsterCombatantProfile(LION, {
      combatantId: BRUTE_ID,
      tokenId: 'token:generated-3943001-monster-2',
    });
    const state: EncounterState = {
      ...positioned,
      combatants: positioned.combatants.map((candidate) => {
        if (candidate.profile.id === BRUTE_ID) {
          return { ...candidate, hitPoints: LION.hitPointMaximum, profile: lionProfile };
        }
        if (candidate.profile.id === FOCUS_ID) {
          return {
            ...candidate,
            hitPoints: 1,
            profile: {
              ...candidate.profile,
              rules: { ...candidate.profile.rules, armorClass: armorClass(1), usesDeathSaves: false },
            },
          };
        }
        return candidate;
      }),
      tokens: positioned.tokens.map((placed) => placed.combatantId === BRUTE_ID
        ? combatToken(lionProfile, placed.position)
        : placed),
    };
    const lion = authorized(state, attackProposal(state, BRUTE_ID, 'rend', FOCUS_ID));
    const session = new EngineRoundSession(state, mulberry32(46_600_006), {
      kind: 'unattended', askDefault: 'decline',
    });

    const applied = session.applyResolvedMechanics([lion], null);

    expect(session.currentState().eventLog.filter((event) =>
      event.type === 'attack_resolved' && event.actor === BRUTE_ID && event.target === FOCUS_ID))
      .toHaveLength(1);
    expect(applied.deviationResolutions).toContainEqual(expect.objectContaining({
      actorId: BRUTE_ID,
      reasonCodes: ['remaining_attack_target_dead'],
      refusalCodes: ['TARGET_DIED_DURING_OPTION'],
    }));
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
    const killer = authorized(session.currentState(), attackProposal(session.currentState(), KILLER_ID, 'dagger', FOCUS_ID));
    const archer = authorized(session.currentState(), attackProposal(session.currentState(), ARCHER_ID, 'longbow', FOCUS_ID));

    const applied = session.applyConsecutiveMonsterSegment([killer, archer], null);

    expect(session.currentState().combatants.find((entry) => entry.profile.id === FOCUS_ID)?.life).toBe('dead');
    expect(session.currentState().eventLog.flatMap((event) =>
      event.type === 'attack_resolved' ? [event.actor] : [])).toEqual([KILLER_ID]);
    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedOptionId: archer.option.optionId,
      appliedOptionId: archer.fallbackOption?.optionId,
      reasonCodes: ['branch_changed', 'option_changed'],
      refusalCodes: ['ATTACK_UNAVAILABLE'],
    }]);
  });

  it('falls back after a forced displacement leaves an archer out of range after its full movement', () => {
    const authorizationState = fixedPositions(new Map([
      [KILLER_ID, { column: 10, row: 0 }],
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 30, row: 0 }],
    ]), 130);
    const archer = authorized(authorizationState, attackProposal(authorizationState, ARCHER_ID, 'longbow', FOCUS_ID));
    const displacedState: EncounterState = {
      ...authorizationState,
      tokens: authorizationState.tokens.map((token) => token.combatantId === FOCUS_ID
        ? { ...token, position: { column: 129, row: 0 } }
        : token),
    };
    const earlierDodge = authorized(displacedState, dodgeProposal(displacedState, KILLER_ID));
    const session = new EngineRoundSession(displacedState, mulberry32(23), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([earlierDodge, archer], null);

    expect(session.currentState().eventLog.some((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID)).toBe(false);
    expect(applied.deviationResolutions).toEqual([expect.objectContaining({
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'fallback',
      authorizedOptionId: archer.option.optionId,
      appliedOptionId: archer.fallbackOption?.optionId,
      reasonCodes: ['branch_changed', 'option_changed'],
      refusalCodes: ['OPTION_UNREACHABLE'],
    })]);
  });

  it('preserves authorization-time mechanics exactly when no relevant state drifts', () => {
    const state = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 4, row: 0 }],
    ]));
    const archer = authorized(state, attackProposal(state, ARCHER_ID, 'longbow', FOCUS_ID));
    const session = new EngineRoundSession(state, mulberry32(29), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([archer], null);
    const attack = session.currentState().eventLog.find((event) =>
      event.type === 'attack_resolved' && event.actor === ARCHER_ID);

    expect(applied.deviationResolutions).toEqual([]);
    expect(attack).toEqual(expect.objectContaining({
      actor: ARCHER_ID,
      target: archer.mechanics.actionSlots[0]?.targetIds[0],
    }));
    expect(session.currentState().tokens.find((token) => token.combatantId === ARCHER_ID)?.position)
      .toEqual(archer.mechanics.finalPosition);
  });

  it('degrades to Dodge with both branch refusal codes when no branch remains legal', () => {
    const authorizationState = fixedPositions(new Map([
      [ARCHER_ID, { column: 0, row: 0 }],
      [FOCUS_ID, { column: 4, row: 0 }],
    ]), 130);
    const baseProposal = attackProposal(authorizationState, ARCHER_ID, 'longbow', FOCUS_ID);
    const secondOffense = availableEngineActorOptions(authorizationState, ARCHER_ID).find((option) =>
      option.optionId !== baseProposal.primaryOptionId && option.actionSlots.some((slot) =>
        slot.use.kind === 'attack' || slot.use.kind === 'multiattack'));
    if (secondOffense === undefined) throw new Error('Fixture omitted a second offensive option.');
    const proposal: EngineTurnProposal = { ...baseProposal, fallbackOptionId: secondOffense.optionId };
    const archer = authorized(authorizationState, proposal);
    const displacedState: EncounterState = {
      ...authorizationState,
      tokens: authorizationState.tokens.map((token) => {
        if (token.combatantId === FOCUS_ID) return { ...token, position: { column: 129, row: 0 } };
        if (token.combatantId === CLERIC_ID) return { ...token, position: { column: 128, row: 0 } };
        if (token.combatantId === WIZARD_ID) return { ...token, position: { column: 127, row: 0 } };
        return token;
      }),
    };
    const session = new EngineRoundSession(displacedState, mulberry32(31), { kind: 'unattended', askDefault: 'decline' });

    const applied = session.applyResolvedMechanics([archer], null);

    expect(applied.deviationResolutions).toEqual([{
      actorId: ARCHER_ID,
      authorizedBranch: 'primary',
      appliedBranch: 'dodge',
      authorizedOptionId: archer.option.optionId,
      appliedOptionId: expect.any(String),
      reasonCodes: ['degraded_to_dodge'],
      refusalCodes: ['OPTION_UNREACHABLE', 'OPTION_UNREACHABLE'],
    }]);
    expect(session.currentState().combatants.find((entry) => entry.profile.id === ARCHER_ID)?.turn.dodging)
      .toBe(true);
  });
});
