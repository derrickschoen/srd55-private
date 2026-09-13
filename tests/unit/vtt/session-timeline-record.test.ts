import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import type { ControllerIdentity } from '../../../src/combat/controllers';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { WEB_MATERIAL, type PersistentArea } from '../../../src/combat/persistent-areas';
import { mulberry32 } from '../../../src/combat/random';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { feetPoint } from '../../../src/combat/templates';
import { projectDmView } from '../../../src/combat/visibility';
import {
  combatantId,
  damageType,
  dieSides,
  encounterBranchId,
  encounterEffectId,
  encounterSessionId,
  effectStackingIdentity,
  feet,
  limitedResourcePoolId,
  persistentAreaId,
  statblockId,
} from '../../../src/combat/values';
import { deriveSessionRecord } from '../../../src/vtt/session-record';
import {
  DmEncounterHost,
  type DmEncounterHostSnapshot,
} from '../../../src/vtt/dm-encounter-host';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { parseOptionalEncounterSeed } from '../../../src/vtt/session-seed';
import { projectEncounterTimeline } from '../../../src/vtt/session-timeline';
import { DEFAULT_REFUSAL_HANDLING_SETTINGS } from '../../../src/vtt/refusal-handling';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  deriveBranchRng,
  decodeSavedSessionFingerprint,
  exportSavedSession,
  importSavedSession,
} from '../../../src/vtt/session-persistence';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function pacedState(): EncounterState {
  const first = playerProfile('pace-first', { initiativeBonus: 30 });
  const second = playerProfile('pace-second', { initiativeBonus: 20 });
  const third = monsterProfile('pace-third', { initiativeBonus: 10, hitPoints: 30 });
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 8, rows: 2 },
    combatants: [first, second, third],
    tokens: [placedToken(first, 0), placedToken(second, 2), placedToken(third, 4)],
  }), { type: 'roll_initiative' }, () => 0).state;
}

function journalFixture(key: string, state = pacedState()) {
  const store = new MemoryBrowserSessionStore();
  const sessionId = encounterSessionId(`session:${key}`);
  const journal = EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:main'),
    encounterState: state,
    coordinatorState: IDLE,
    controllers: [],
    rng: mulberry32(7319),
    store,
    mirror: new MemoryMirrorSink(),
  });
  return { store, sessionId, journal };
}

class SameLengthHistoryStore extends MemoryBrowserSessionStore {
  #replacementBranch: ReturnType<typeof encounterBranchId> | null = null;

  replaceFirstBranch(branchId: ReturnType<typeof encounterBranchId>): void {
    this.#replacementBranch = branchId;
  }

  override revisions(sessionId: ReturnType<typeof encounterSessionId>) {
    const revisions = super.revisions(sessionId);
    const replacementBranch = this.#replacementBranch;
    if (replacementBranch === null) return revisions;
    return revisions.map((revision, index) => index === 0
      ? { ...revision, branchId: replacementBranch }
      : revision);
  }
}

function humanIdentities(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((subject): ControllerIdentity => ({
    combatantId: subject.profile.id,
    controllerId: `${subject.profile.id}:human:timeline-test`,
    kind: 'human',
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

async function waitForHostSnapshot(
  host: DmEncounterHost,
  predicate: (snapshot: DmEncounterHostSnapshot) => boolean,
): Promise<DmEncounterHostSnapshot> {
  const current = host.snapshot();
  if (predicate(current)) return current;
  return new Promise<DmEncounterHostSnapshot>((complete, reject) => {
    let matched = false;
    let unsubscribe = (): void => undefined;
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('DM host did not reach the expected state within one second.'));
    }, 1_000);
    unsubscribe = host.subscribe((snapshot) => {
      if (!predicate(snapshot)) return;
      matched = true;
      clearTimeout(timeout);
      unsubscribe();
      complete(snapshot);
    });
    if (matched) unsubscribe();
  });
}

async function endCurrentHumanTurn(host: DmEncounterHost): Promise<void> {
  const snapshot = await waitForHostSnapshot(host, (candidate) =>
    candidate.dm.pendingRequest !== null);
  const pending = snapshot.dm.pendingRequest;
  if (pending === null) throw new Error('Expected human turn request is missing.');
  host.submitHumanDecision(pending.actorId, {
    requestId: pending.requestId,
    encounterRevision: pending.encounterRevision,
    action: { type: 'end_turn', actor: pending.actorId },
  });
}

function previewState(): { readonly state: EncounterState; readonly playerId: ReturnType<typeof playerProfile>['id'] } {
  const player = playerProfile('preview-player', { initiativeBonus: 30, hitPoints: 30 });
  const unicorn = monsterCombatantProfile(UNICORN, {
    combatantId: 'combatant:preview-unicorn',
    tokenId: 'token:preview-unicorn',
  });
  const started = reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 6, rows: 2 },
    combatants: [player, unicorn],
    tokens: [placedToken(player, 0), placedToken(unicorn, 3)],
  }), { type: 'roll_initiative' }, () => 0).state;
  const burningArea: PersistentArea = {
    id: persistentAreaId('area:preview-web'),
    sequence: 1,
    owner: player.id,
    origin: { kind: 'fixed', point: feetPoint(0, 0) },
    shape: { kind: 'sphere', radius: feet(5) },
    duration: { kind: 'rounds', remaining: 10 },
    targetFilter: { kind: 'all' },
    difficultTerrain: true,
    material: WEB_MATERIAL,
    hooks: [],
    movable: null,
    burningCells: [{
      cell: { column: 0, row: 0 },
      burnsAwayAt: { round: 2, initiativeIndex: 0 },
    }],
    burnedAwayCells: [],
    members: [player.id],
    consumedTurnKeys: [],
  };
  return {
    state: {
      ...started,
      persistentAreas: [burningArea],
      effects: [{
        id: encounterEffectId('effect:preview-clock'),
        source: player.id,
        targets: [unicorn.id],
        createdRevision: started.revision,
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: unicorn.id, boundary: 'start', source: 'fixture:typed-clock' },
          remaining: 2,
        },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity('preview-clock'),
        stacking: 'coexist',
        repeatedSave: {
          timing: { combatant: unicorn.id, boundary: 'end', source: 'fixture:typed-clock' },
          ability: 'wisdom',
          dc: 12,
          rollMode: 'normal',
          onSuccess: 'end_effect',
        },
        payload: { kind: 'condition', condition: 'Deafened' },
      }],
    },
    playerId: player.id,
  };
}

describe('D377.3 session timeline and pacing controls', () => {
  it('preview_source_detached: a live DM projection previews the legendary window and Web burn-away at exact rounds', () => {
    // Legendary window: docs/srd/full/srd-5.2.1.txt:16703-16716.
    // A fire-exposed Web cube burns away in one round: docs/srd/full/srd-5.2.1.txt:11162-11165.
    const fixture = previewState();
    let state = fixture.state;
    const initial = projectDmBoard({
      view: projectDmView(state),
      coordinator: IDLE,
      controllers: [],
      history: [],
    }).timeline;
    expect(initial.upcoming).toContainEqual(expect.objectContaining({
      kind: 'legendary_action_window',
      boundary: { round: 1, combatant: fixture.playerId, boundary: 'end' },
    }));
    expect(initial.upcoming).toContainEqual(expect.objectContaining({
      kind: 'burn_away',
      boundary: { round: 2, combatant: fixture.playerId, boundary: 'start' },
    }));
    expect(initial.upcoming).toContainEqual(expect.objectContaining({
      kind: 'repeated_save_prompt',
      boundary: expect.objectContaining({ round: 1, boundary: 'end' }),
    }));
    expect(initial.upcoming).toContainEqual(expect.objectContaining({
      kind: 'effect_expiry',
      boundary: expect.objectContaining({ round: 2, boundary: 'start' }),
    }));

    state = reduceEncounter(state, { type: 'end_turn', actor: fixture.playerId }, () => 0).state;
    expect(projectEncounterTimeline(state, []).upcoming.some(
      (event) => event.kind === 'legendary_action_window',
    )).toBe(false);
    const decision = state.pendingDecisions.find(
      (candidate) => candidate.kind === 'legendary_action_window',
    );
    if (decision === undefined) throw new Error('Legendary preview fixture did not queue its window.');
    state = reduceEncounter(state, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'pass',
    }, () => 0).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: fixture.playerId }, () => 0).state;
    const unicorn = state.activeCombatant;
    if (unicorn === null) throw new Error('Legendary preview fixture has no monster turn.');
    state = reduceEncounter(state, { type: 'end_turn', actor: unicorn }, () => 0).state;
    expect(state.round).toBe(2);
    expect(projectEncounterTimeline(state, []).upcoming.some(
      (event) => event.kind === 'burn_away',
    )).toBe(false);
  });

  it('delay_applies_twice: repositions once, survives resume, and restores the original order next round', () => {
    const fixture = journalFixture('delay');
    const original = fixture.store.revisions(fixture.sessionId)[0]?.encounterState.initiative.map(
      (entry) => entry.combatant,
    );
    if (original === undefined || original.length !== 3) throw new Error('Delay fixture is incomplete.');
    fixture.journal.delayTurn(original[1]!);
    const resumed = EncounterSessionJournal.resume(
      fixture.sessionId,
      fixture.store,
      new MemoryMirrorSink(),
    );
    expect(resumed.encounterState.initiative.map((entry) => entry.combatant)).toEqual([
      original[1], original[0], original[2],
    ]);
    expect(resumed.journal.history().at(-1)?.transition).toMatchObject({
      kind: 'turn_delayed', combatant: original[0], afterCombatant: original[1],
      fromIndex: 0, toIndex: 1,
    });
    resumed.journal.skipTurn();
    resumed.journal.skipTurn();
    const nextRound = resumed.journal.skipTurn();
    expect(nextRound.encounterState.round).toBe(2);
    expect(nextRound.encounterState.initiative.map((entry) => entry.combatant)).toEqual(original);
    expect(nextRound.encounterState.activeCombatant).toBe(original[0]);
  });

  it('skip_turn_logged_and_advances: records the skipped actor and advances exactly one turn', () => {
    const fixture = journalFixture('skip');
    const before = fixture.store.revisions(fixture.sessionId)[0]?.encounterState;
    if (before?.activeCombatant === null || before?.activeCombatant === undefined) {
      throw new Error('Skip fixture has no active combatant.');
    }
    const expectedNext = before.initiative[1]?.combatant;
    const skipped = fixture.journal.skipTurn();
    expect(skipped.encounterState.activeCombatant).toBe(expectedNext);
    expect(fixture.journal.history().at(-1)?.transition).toMatchObject({
      kind: 'turn_skipped', combatant: before.activeCombatant, round: 1,
    });
  });

  it('rewind_deletes_revisions: restores the round boundary, voids later revisions, and derives a distinct branch stream', () => {
    const fixture = journalFixture('rewind');
    for (let turn = 0; turn < 6; turn += 1) fixture.journal.skipTurn();
    const boundary = fixture.journal.roundBoundaries().find((candidate) => candidate.round === 2);
    if (boundary === undefined) throw new Error('Rewind fixture has no round-2 boundary.');
    const target = fixture.store.revisions(fixture.sessionId).find(
      (revision) => revision.revision === boundary.revision,
    );
    if (target === undefined) throw new Error('Rewind target revision is missing.');
    const originalBranchStream = deriveBranchRng(target, target.branchId).snapshot();
    const priorRevisionCount = fixture.store.revisions(fixture.sessionId).length;
    const rewound = fixture.journal.rewindToRound(
      2,
      encounterBranchId('branch:rewind-test'),
    );
    expect(rewound.encounterState).toEqual(target.encounterState);
    const history = fixture.journal.history();
    expect(history).toHaveLength(priorRevisionCount + 1);
    expect(history.filter((entry) =>
      entry.revision > boundary.revision && entry.revision <= priorRevisionCount,
    ).every((entry) => entry.void)).toBe(true);
    expect(rewound.rng.snapshot()).not.toEqual(originalBranchStream);
    expect(history.at(-1)?.transition).toMatchObject({
      kind: 'head_moved', targetRevision: boundary.revision,
    });
    expect(projectEncounterTimeline(rewound.encounterState, history).branchPoints).toContainEqual(
      expect.objectContaining({ targetRevision: boundary.revision, round: 2 }),
    );
  });

  it('forward_after_rewind_blocked: advances a full round and appends the new branch after a round rewind', async () => {
    const state = pacedState();
    const store = new MemoryBrowserSessionStore();
    const playerIds = state.combatants.flatMap((subject) =>
      subject.profile.kind === 'player_character' ? [subject.profile.id] : []);
    const host = new DmEncounterHost('session:rewind-forward', store, {
      initialState: state,
      initialControllers: humanIdentities(state),
      playerIds,
      turnLegalActions: (_current, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
    });
    host.start();
    for (let turn = 0; turn < state.initiative.length * 2; turn += 1) {
      await endCurrentHumanTurn(host);
    }
    await waitForHostSnapshot(host, (snapshot) => snapshot.dm.timeline.round === 3);
    const revisionsBeforeRewind = store.revisions(host.sessionId).length;
    const beforeRewind = host.snapshot();
    await host.rewindToRound(2);
    await waitForHostSnapshot(host, (snapshot) =>
      snapshot.dm.timeline.round === 2 && snapshot.dm.pendingRequest !== null);
    const afterRewind = host.snapshot();
    expect(Object.isFrozen(afterRewind.dm.history)).toBe(true);
    expect(afterRewind.dm.history.every(Object.isFrozen)).toBe(true);
    expect(beforeRewind.dm.history.every((entry) => !entry.void)).toBe(true);
    const headMove = [...afterRewind.dm.history].reverse().find(
      (entry) => entry.transition.kind === 'head_moved',
    )?.transition;
    if (headMove?.kind !== 'head_moved') throw new Error('Rewind snapshot has no head move.');
    expect(afterRewind.dm.history.some((entry) =>
      entry.revision > headMove.targetRevision &&
      entry.revision <= revisionsBeforeRewind && entry.void)).toBe(true);
    for (let turn = 0; turn < state.initiative.length; turn += 1) {
      await endCurrentHumanTurn(host);
    }
    await waitForHostSnapshot(host, (snapshot) => snapshot.dm.timeline.round === 3);

    const revisions = store.revisions(host.sessionId);
    const headMoveIndex = revisions.findIndex((revision) =>
      revision.revision > revisionsBeforeRewind && revision.transition.kind === 'head_moved');
    expect(headMoveIndex).toBeGreaterThanOrEqual(0);
    expect(revisions.at(-1)?.encounterState.round).toBe(3);
    expect(revisions.slice(headMoveIndex + 1).filter((revision) =>
      revision.transition.kind === 'reducer_applied' &&
      revision.transition.command.type === 'end_turn',
    )).toHaveLength(state.initiative.length);

    host.close();
  });

  it('equal_length_history_replaced: projects changed content instead of a same-length cached history', () => {
    const store = new SameLengthHistoryStore();
    const host = new DmEncounterHost('session:equal-length-history', store);
    const beforeReplacement = host.snapshot();
    const replacementBranch = encounterBranchId('branch:equal-length-replacement');

    store.replaceFirstBranch(replacementBranch);
    const afterReplacement = host.snapshot();

    expect(afterReplacement.dm.history).toHaveLength(beforeReplacement.dm.history.length);
    expect(beforeReplacement.dm.history[0]?.branchId).not.toBe(replacementBranch);
    expect(afterReplacement.dm.history[0]?.branchId).toBe(replacementBranch);
    host.close();
  });

  it('seed_not_persisted: chosen start seed survives session state, export, import, and resume', () => {
    const chosenSeed = parseOptionalEncounterSeed('424242');
    const store = new MemoryBrowserSessionStore();
    const host = new DmEncounterHost('session:chosen-seed', store, {
      initialSeed: chosenSeed,
    });
    const first = store.revisions(host.sessionId)[0];
    expect(first?.rngState.initialSeed).toBe(chosenSeed);

    const bytes = exportSavedSession(store, host.sessionId);
    expect(decodeSavedSessionFingerprint(bytes).initialSeed).toBe(chosenSeed);
    const imported = new MemoryBrowserSessionStore();
    const importedSessionId = importSavedSession(imported, bytes);
    const resumed = EncounterSessionJournal.resume(
      importedSessionId,
      imported,
      new MemoryMirrorSink(),
    );
    expect(resumed.rng.snapshot().initialSeed).toBe(chosenSeed);
    host.close();
  });
});

describe('D377.14 structured session record export', () => {
  it('returns an exact empty record when no journal revisions exist', () => {
    expect(deriveSessionRecord([])).toEqual({
      kind: 'end_of_session_summary',
      journalRevisionCount: 0,
      encounters: [],
    });
  });

  it('summary_drops_overrides: totals a hand-computed fixture and retains the DM fiat ruling card', () => {
    const caster = playerProfile('record-caster', {
      initiativeBonus: 30,
      hitPoints: 20,
      spellSlots: [{ level: 2, maximum: 1 }],
    });
    const target = monsterProfile('record-target', { initiativeBonus: 10, hitPoints: 20 });
    const state = reduceEncounter(createEncounter({
      config: { initiativeMode: 'per_combatant' },
      bounds: { columns: 6, rows: 2 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0), placedToken(target, 2)],
    }), { type: 'roll_initiative' }, () => 0).state;
    const fixture = journalFixture('record', state);
    let current = state;
    const record = (command: EncounterCommand): void => {
      const reduction = reduceEncounter(current, command, fixture.journal.rng());
      current = reduction.state;
      fixture.journal.record({
        transition: { kind: 'reducer_applied', command, events: reduction.events },
        encounterState: current,
        coordinatorState: IDLE,
        controllers: [],
      });
    };
    record({
      type: 'cast_spell', actor: caster.id, spellId: 'blur', slotLevel: 2,
      castAsRitual: false, casterLevel: 3, attackBonus: 5, saveDc: 13,
      spellcastingModifier: 3, targets: [], area: null, weaponAttack: null,
      selectedOption: null,
    });
    record({
      type: 'force_save', actor: caster.id, target: target.id,
      ability: 'dexterity', dc: 30, rollMode: 'normal', onSuccess: 'none', cost: 'none',
      damage: {
        terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: 7 } }],
        critical: false,
        responses: [],
      },
    });
    record({
      type: 'adjudicate', target: target.id, subject: 'table:ruling',
      reasoning: 'The cracked ward yields to the stated plan.',
      consequence: { kind: 'hit_point_delta', amount: -2 },
    });

    const revisionsBefore = fixture.store.revisions(fixture.sessionId);
    const summary = deriveSessionRecord(revisionsBefore);
    const casterSummary = summary.encounters[0]?.combatants.find(
      (combatant) => combatant.combatant === caster.id,
    );
    const targetSummary = summary.encounters[0]?.combatants.find(
      (combatant) => combatant.combatant === target.id,
    );
    expect(summary.encounters[0]).toMatchObject({ roundsElapsed: 1 });
    expect(casterSummary).toMatchObject({
      damageDealt: 7,
      damageTaken: 0,
      resourcesSpent: {
        spellSlots: [{ level: 2, count: 1 }],
        legendaryActionUses: 0,
        wildShapeUses: 0,
        limitedResources: [],
      },
    });
    expect(targetSummary).toMatchObject({ damageDealt: 0, damageTaken: 7 });
    expect(summary.encounters[0]?.dmRulings).toEqual([expect.objectContaining({
      target: target.id,
      subject: 'table:ruling',
      reasoning: 'The cracked ward yields to the stated plan.',
    })]);

    const exported = exportSavedSession(fixture.store, fixture.sessionId);
    const imported = new MemoryBrowserSessionStore();
    importSavedSession(imported, exported);
    expect(imported.revisions(fixture.sessionId)).toHaveLength(revisionsBefore.length);
    expect(fixture.store.revisions(fixture.sessionId)).toEqual(revisionsBefore);
    expect(exported).toContain('"sessionRecord":{"encounters"');
    expect(exported).toContain('The cracked ward yields to the stated plan.');
  });

  it('records Revivify and DM un-kill ruling cards as distinct revivals before later deaths', () => {
    const state = pacedState();
    const revivedBySpell = state.combatants[0]?.profile.id;
    const revivedByDm = state.combatants[1]?.profile.id;
    const attacker = state.combatants[2]?.profile.id;
    if (revivedBySpell === undefined || revivedByDm === undefined || attacker === undefined) {
      throw new Error('Recovery record fixture is incomplete.');
    }
    const fixture = journalFixture('recovery-record', state);
    fixture.journal.record({
      transition: {
        kind: 'reducer_applied',
        command: {
          type: 'adjudicate',
          target: revivedByDm,
          subject: 'engine:manual-adjudication',
          reasoning: 'Recovery record fixture.',
          consequence: { kind: 'hit_point_delta', amount: 1 },
        },
        events: [
          {
            sequence: 1,
            type: 'spell_cast',
            caster: revivedByDm,
            spellId: 'revivify',
            slotLevel: 3,
            targets: [revivedBySpell],
          },
          {
            sequence: 2,
            type: 'adjudicated',
            target: revivedByDm,
            subject: 'engine:manual-adjudication',
            reasoning: 'Recovery record fixture.',
            consequence: { kind: 'hit_points', before: 0, after: 1, lifeState: 'living' },
          },
          {
            sequence: 3,
            type: 'damage_applied',
            source: attacker,
            target: revivedBySpell,
            amount: 1,
            hitPointsBefore: 1,
            hitPointsAfter: 0,
            lifeState: 'dead',
            massiveDamage: false,
          },
          {
            sequence: 4,
            type: 'damage_applied',
            source: attacker,
            target: revivedByDm,
            amount: 1,
            hitPointsBefore: 1,
            hitPointsAfter: 0,
            lifeState: 'dead',
            massiveDamage: false,
          },
        ],
      },
      encounterState: state,
      coordinatorState: IDLE,
      controllers: [],
    });

    const record = deriveSessionRecord(fixture.store.revisions(fixture.sessionId)).encounters[0];
    expect(record?.revivals).toEqual([
      { combatant: revivedBySpell, eventSequence: 1, cause: 'revivify', source: revivedByDm },
      { combatant: revivedByDm, eventSequence: 2, cause: 'dm_override', source: null },
    ]);
    expect(record?.deaths).toEqual([
      { combatant: revivedBySpell, eventSequence: 3, cause: 'damage' },
      { combatant: revivedByDm, eventSequence: 4, cause: 'damage' },
    ]);
    const serializedRecord = JSON.stringify(deriveSessionRecord(
      fixture.store.revisions(fixture.sessionId),
    ));
    expect(serializedRecord).toContain('"cause":"revivify"');
    expect(serializedRecord).toContain('"cause":"dm_override"');
  });

  it('summarizes every resource and mortality event while excluding plausible false positives', () => {
    const state = pacedState();
    const first = state.combatants[0]?.profile.id;
    const second = state.combatants[1]?.profile.id;
    const third = state.combatants[2]?.profile.id;
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('Comprehensive session record fixture is incomplete.');
    }
    const unknown = combatantId('combatant:record-unknown');
    const alphaPool = limitedResourcePoolId('resource:alpha');
    const zetaPool = limitedResourcePoolId('resource:zeta');
    const fixture = journalFixture('comprehensive-record', state);
    fixture.journal.record({
      transition: {
        kind: 'reducer_applied',
        command: { type: 'end_turn', actor: first },
        events: [
          {
            sequence: 1, type: 'damage_applied', source: unknown, target: first,
            amount: 4, hitPointsBefore: 20, hitPointsAfter: 16,
            lifeState: 'living', massiveDamage: false,
          },
          {
            sequence: 2, type: 'spell_slot_spent', combatant: first,
            slotLevel: 3, remaining: 1,
          },
          {
            sequence: 3, type: 'spell_slot_spent', combatant: first,
            slotLevel: 1, remaining: 2,
          },
          {
            sequence: 4, type: 'spell_slot_spent', combatant: first,
            slotLevel: 3, remaining: 0,
          },
          {
            sequence: 5, type: 'legendary_action_used', combatant: third,
            actionId: 'legendary:one', cost: 2, remaining: 1,
          },
          {
            sequence: 6, type: 'legendary_action_used', combatant: third,
            actionId: 'legendary:two', cost: 1, remaining: 0,
          },
          {
            sequence: 7, type: 'wild_shape_assumed', combatant: second,
            formId: statblockId('statblock:wolf'), formName: 'Wolf',
            expiresAtRound: 20, usesRemaining: 1,
          },
          {
            sequence: 8, type: 'wild_shape_assumed', combatant: second,
            formId: statblockId('statblock:bear'), formName: 'Bear',
            expiresAtRound: 21, usesRemaining: 0,
          },
          {
            sequence: 9, type: 'limited_resource_spent', combatant: second,
            resourcePoolId: zetaPool, remaining: 1, purpose: 'zeta use',
          },
          {
            sequence: 10, type: 'limited_resource_spent', combatant: second,
            resourcePoolId: alphaPool, remaining: 0, purpose: 'alpha use',
          },
          {
            sequence: 11, type: 'limited_resource_spent', combatant: second,
            resourcePoolId: zetaPool, remaining: 0, purpose: 'zeta use again',
          },
          {
            sequence: 12, type: 'death_save_resolved', combatant: first,
            roll: 4, outcome: 'failure', successes: 1, failures: 3,
            lifeState: 'dead', stableRecovery: null,
          },
          {
            sequence: 13, type: 'death_save_resolved', combatant: second,
            roll: 15, outcome: 'success', successes: 2, failures: 1,
            lifeState: 'dying', stableRecovery: null,
          },
          {
            sequence: 14, type: 'spell_cast', caster: second, spellId: 'blur',
            slotLevel: 2, targets: [first],
          },
          {
            sequence: 15, type: 'spell_cast', caster: second, spellId: 'revivify',
            slotLevel: 3, targets: [first],
          },
          {
            sequence: 16, type: 'adjudicated', target: third,
            subject: 'mark dead', reasoning: 'Exact negative branch.',
            consequence: {
              kind: 'death_override', override: 'mark_dead',
              before: { hitPoints: 1, lifeState: 'living', successes: 0, failures: 0 },
              after: { hitPoints: 0, lifeState: 'dead', successes: 0, failures: 3 },
            },
          },
          {
            sequence: 17, type: 'adjudicated', target: third,
            subject: 'revive', reasoning: 'Exact positive branch.',
            consequence: {
              kind: 'death_override', override: 'revive_at_one_hit_point',
              before: { hitPoints: 0, lifeState: 'dead', successes: 0, failures: 3 },
              after: { hitPoints: 1, lifeState: 'living', successes: 0, failures: 0 },
            },
          },
          {
            sequence: 18, type: 'adjudicated', target: second,
            subject: 'already living', reasoning: 'Before was not zero.',
            consequence: { kind: 'hit_points', before: 1, after: 2, lifeState: 'living' },
          },
          {
            sequence: 19, type: 'adjudicated', target: second,
            subject: 'still down', reasoning: 'After was not positive.',
            consequence: { kind: 'hit_points', before: 0, after: 0, lifeState: 'stable' },
          },
          {
            sequence: 20, type: 'adjudicated', target: second,
            subject: 'restored', reasoning: 'Both numeric boundaries match.',
            consequence: { kind: 'hit_points', before: 0, after: 3, lifeState: 'living' },
          },
          {
            sequence: 21, type: 'initiative_rolled', combatant: first,
            faces: [11], total: 14,
          },
        ],
      },
      encounterState: { ...state, round: 3 },
      coordinatorState: IDLE,
      controllers: [],
    });

    const record = deriveSessionRecord(fixture.store.revisions(fixture.sessionId)).encounters[0];
    expect(record?.roundsElapsed).toBe(3);
    expect(record?.combatants.map((combatant) => combatant.combatant)).toEqual(
      [...state.combatants.map((combatant) => combatant.profile.id), unknown].sort(),
    );
    expect(record?.combatants.find((combatant) => combatant.combatant === unknown)).toMatchObject({
      name: String(unknown), damageDealt: 4, damageTaken: 0,
    });
    expect(record?.combatants.find((combatant) => combatant.combatant === first)?.name).toBe(
      state.combatants.find((combatant) => combatant.profile.id === first)?.profile.name,
    );
    expect(record?.combatants.find((combatant) => combatant.combatant === first)).toMatchObject({
      damageDealt: 0,
      damageTaken: 4,
      resourcesSpent: {
        spellSlots: [{ level: 1, count: 1 }, { level: 3, count: 2 }],
        legendaryActionUses: 0,
        wildShapeUses: 0,
        limitedResources: [],
      },
    });
    expect(record?.combatants.find((combatant) => combatant.combatant === second)?.resourcesSpent)
      .toEqual({
        spellSlots: [],
        legendaryActionUses: 0,
        wildShapeUses: 2,
        limitedResources: [
          { resourcePoolId: alphaPool, count: 1 },
          { resourcePoolId: zetaPool, count: 2 },
        ],
      });
    expect(record?.combatants.find((combatant) => combatant.combatant === third)?.resourcesSpent)
      .toMatchObject({ legendaryActionUses: 3 });
    expect(record?.deathSaves).toEqual([
      {
        combatant: first, eventSequence: 12, outcome: 'failure',
        successes: 1, failures: 3, lifeState: 'dead',
      },
      {
        combatant: second, eventSequence: 13, outcome: 'success',
        successes: 2, failures: 1, lifeState: 'dying',
      },
    ]);
    expect(record?.deaths).toEqual([
      { combatant: first, eventSequence: 12, cause: 'death_save' },
      { combatant: third, eventSequence: 16, cause: 'dm_override' },
    ]);
    expect(record?.revivals).toEqual([
      { combatant: first, eventSequence: 15, cause: 'revivify', source: second },
      { combatant: third, eventSequence: 17, cause: 'dm_override', source: null },
      { combatant: second, eventSequence: 20, cause: 'dm_override', source: null },
    ]);
    expect(record?.dmRulings.map((ruling) => ruling.eventSequence)).toEqual([16, 17, 18, 19, 20]);
  });

  it('follows only the active ancestry and starts a new ordinal at room composition', () => {
    const fixture = journalFixture('record-ancestry');
    const initial = fixture.store.revisions(fixture.sessionId)[0];
    if (initial === undefined) throw new Error('Ancestry fixture has no initial revision.');
    const stray = {
      ...initial,
      revision: 2,
      parentRevision: 1,
      transition: { kind: 'session_ended' as const },
      encounterState: { ...initial.encounterState, round: 99 },
    };
    const partyState = (room: 1 | 2) => ({
      schemaVersion: 1 as const,
      rulesEdition: '2024' as const,
      room,
      adventuringDayStatus: 'active' as const,
      characters: [],
      reactionPolicies: [],
      refusalHandling: DEFAULT_REFUSAL_HANDLING_SETTINGS,
    });
    const continued = {
      ...initial,
      revision: 3,
      parentRevision: 1,
      transition: { kind: 'session_ended' as const },
      encounterState: { ...initial.encounterState, round: 2 },
      partyState: partyState(1),
    };
    const nextRoom = {
      ...initial,
      revision: 4,
      parentRevision: 3,
      transition: { kind: 'room_composed' as const, room: 2 },
      encounterState: { ...initial.encounterState, round: 4 },
      partyState: partyState(2),
    };
    const concluded = {
      ...initial,
      revision: 5,
      parentRevision: 4,
      transition: { kind: 'session_ended' as const },
      encounterState: {
        ...initial.encounterState,
        round: 5,
        phase: {
          kind: 'concluded' as const,
          outcome: 'victory' as const,
          survivingSide: 'player_character' as const,
          round: 5,
          revision: 27,
        },
      },
      partyState: partyState(2),
    };

    const summary = deriveSessionRecord([initial, stray, continued, nextRoom, concluded]);
    expect(summary.journalRevisionCount).toBe(5);
    expect(summary.encounters.map((encounter) => ({
      encounter: encounter.encounter,
      roundsElapsed: encounter.roundsElapsed,
      status: encounter.status,
      room: encounter.room,
    }))).toEqual([
      { encounter: 1, roundsElapsed: 2, status: 'open', room: 1 },
      { encounter: 2, roundsElapsed: 5, status: 'closed', room: 2 },
    ]);
    expect(summary.encounters[1]).toMatchObject({
      conclusion: {
        outcome: 'victory',
        survivingSide: 'player_character',
        round: 5,
        revision: 27,
        journalRevision: 5,
      },
    });
  });

  it('uses the latest revision metadata and sorts combatants independently of encounter order', () => {
    const fixture = journalFixture('record-latest-and-sorted');
    const initial = fixture.store.revisions(fixture.sessionId)[0];
    if (initial === undefined) throw new Error('Latest-record fixture has no initial revision.');
    const encounterState = {
      ...initial.encounterState,
      combatants: [...initial.encounterState.combatants].reverse(),
    };
    const partyState = (room: 1 | 2) => ({
      schemaVersion: 1 as const,
      rulesEdition: '2024' as const,
      room,
      adventuringDayStatus: 'active' as const,
      characters: [],
      reactionPolicies: [],
      refusalHandling: DEFAULT_REFUSAL_HANDLING_SETTINGS,
    });
    const middle = {
      ...initial,
      revision: 2,
      parentRevision: 1,
      transition: { kind: 'session_ended' as const },
      encounterState,
      partyState: partyState(1),
    };
    const latest = {
      ...initial,
      revision: 3,
      parentRevision: 2,
      transition: { kind: 'session_ended' as const },
      encounterState,
      partyState: partyState(2),
    };

    const record = deriveSessionRecord([
      { ...initial, encounterState },
      middle,
      latest,
    ]).encounters[0];

    expect(record?.room).toBe(2);
    expect(record?.combatants.map((combatant) => combatant.combatant)).toEqual(
      encounterState.combatants.map((combatant) => combatant.profile.id).sort(),
    );
  });

  it('rejects missing and out-of-order active ancestry with distinct messages', () => {
    const fixture = journalFixture('record-invalid-ancestry');
    const initial = fixture.store.revisions(fixture.sessionId)[0];
    if (initial === undefined) throw new Error('Invalid ancestry fixture has no initial revision.');
    const missing = { ...initial, revision: 2, parentRevision: 404 };
    expect(() => deriveSessionRecord([initial, missing])).toThrowError(
      'Session record ancestry is incomplete.',
    );

    const parent = { ...initial, revision: 2, parentRevision: 1 };
    const child = { ...initial, revision: 3, parentRevision: 2 };
    expect(() => deriveSessionRecord([parent, initial, child])).toThrowError(
      'Session record encounter ancestry is incomplete.',
    );
  });
});
