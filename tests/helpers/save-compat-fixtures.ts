/**
 * SAVE-COMPAT witness saves (plan §3). Every save here is RECORDED by the engine, then edited the way an editor or an
 * older build would leave it; each witness states by hand what the edit must produce. Nothing here reads a file: a
 * test declares its fixtures (declareTestInputs) and passes their text in.
 *
 *   S: the FOOTPRINT overhang fixture imported by a store recording `build` (revision 1, the session_migrated root),
 *      the PC moved (0,0) -> (1,0) (revision 2, reducer_applied: movement_completed spent 5, remaining 25), then the
 *      session ended (revision 3).
 *   P: a party session: started, a reaction preference changed, a Short Rest with no spends, the next room composed.
 *   R: a party session: started, the refusal handling changed.
 *   L: lr-squeezed's first revisions (session schema 12); L' has revision 2's events doubled and its v12 checksum
 *      recomputed (it bumps, then fails strict replay); Lx the same with the checksum NOT recomputed.
 */
import { expect } from 'vitest';
import { canonicalJson } from '../../src/commands/canonical-json';
import { reduceEncounter } from '../../src/combat/encounter';
import { mulberry32 } from '../../src/combat/random';
import { combatantId, encounterBranchId, encounterSessionId } from '../../src/combat/values';
import { sha256 } from '../../src/crypto/sha256';
import { engineCommit, type EngineBuild } from '../../src/vtt/engine-build';
import { loadExternalPartyPack, type ExternalPartyPackV2, type LoadedPartyMember } from '../../src/vtt/party-pack';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  type SessionRevision,
} from '../../src/vtt/session-persistence';
import { composeStoredCharacterEncounter } from '../../src/vtt/stored-character-encounter';
import { statedPlainMemberFields } from './party-pack-stated';

export const BUILD_A: EngineBuild = { kind: 'engine_commit', commit: engineCommit('a'.repeat(40)) };
export const BUILD_B: EngineBuild = { kind: 'engine_commit', commit: engineCommit('b'.repeat(40)) };
export const UNRECORDED: EngineBuild = { kind: 'unrecorded', reason: 'build_without_commit' };
export const A40 = 'a'.repeat(40);
export const B40 = 'b'.repeat(40);
export const PC = combatantId('combatant:w21-pc');

export const OVERHANG_V12 = 'tests/fixtures/session-v12-footprint/overhang.revisions.v12.json';
export const LR_SQUEEZED_V12 = 'tests/fixtures/session-v12-footprint/lr-squeezed.revisions.v12.json';

/** A revision as JSON: what a save holds and an editor edits. */
export type Plain = Record<string, any>;

export function plainOf(revisions: readonly SessionRevision[]): Plain[] {
  return revisions.map((revision) => JSON.parse(canonicalJson(revision)) as Plain);
}

/** The revision with its checksum recomputed over the rest (what an editor or an older build writes). */
export function withChecksum(revision: Plain): Plain {
  const { checksum: _checksum, ...body } = revision;
  return { ...body, checksum: sha256(canonicalJson(body)) };
}

export function rehashed(revisions: readonly Plain[]): Plain[] {
  return revisions.map(withChecksum);
}

/** A revision bundle at `schemaVersion` of `revisions` exactly as given, its fingerprint recomputed. */
export function revisionBundleText(schemaVersion: number, revisions: readonly Plain[]): string {
  const body = { format: 'vtt-session-revisions' as const, schemaVersion, sessionId: String(revisions[0]!.sessionId), revisions };
  return canonicalJson({ ...body, fingerprint: sha256(canonicalJson(body)) });
}

/** A v13 revision bundle: every revision checksum and the fingerprint recomputed. */
export function bundle(revisions: readonly Plain[]): string {
  return revisionBundleText(13, rehashed(revisions));
}

/** A v13 revision bundle whose revision checksums are left as they are (only the fingerprint is recomputed). */
export function bundleNotRehashed(revisions: readonly Plain[]): string {
  return revisionBundleText(13, revisions);
}

export function thrown(action: () => unknown): any {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** Imports `text` into a store running `running` and resumes it; the error either step throws, else undefined. */
export function resumeUnder(running: EngineBuild, text: string): any {
  return thrown(() => {
    const store = new MemoryBrowserSessionStore(running);
    const id = importSavedSession(store, text);
    EncounterSessionJournal.resume(id, store, new MemoryMirrorSink());
  });
}

/** S, recorded by `build` from the overhang fixture's text. */
export function recordS(build: EngineBuild, overhangText: string): { readonly sessionId: SessionRevision['sessionId']; readonly plain: Plain[] } {
  const recorder = new MemoryBrowserSessionStore(build);
  const sessionId = importSavedSession(recorder, overhangText);
  const resumed = EncounterSessionJournal.resume(sessionId, recorder, new MemoryMirrorSink());
  const command = { type: 'move', actor: PC, path: [{ column: 1, row: 0 }], cause: 'voluntary' } as const;
  const reduction = reduceEncounter(resumed.encounterState, command, resumed.rng);
  resumed.journal.record({
    transition: { kind: 'reducer_applied', command, events: reduction.events },
    encounterState: reduction.state,
    coordinatorState: resumed.coordinatorState,
    controllers: resumed.controllers,
  });
  resumed.journal.endSession();
  return { sessionId, plain: plainOf(recorder.revisions(sessionId)) };
}

/** S without session_ended (S2): a session that can still take a turn. */
export function recordS2(build: EngineBuild, overhangText: string): { readonly sessionId: SessionRevision['sessionId']; readonly plain: Plain[] } {
  const recorded = recordS(build, overhangText);
  return { sessionId: recorded.sessionId, plain: recorded.plain.slice(0, 2) };
}

/** E1: revision 2's movement_completed `remaining` 25 -> 30 (a changed rules outcome, simulated). */
export function e1(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  const event = (edited[1]!.transition.events as Plain[]).find((candidate) => candidate.type === 'movement_completed');
  expect(event?.remaining).toBe(25);
  event!.remaining = 30;
  return edited;
}

/** E2: revision 2's command path is 7 cells, (1..7, 0): 35 feet against a 30-foot Speed. */
export function e2(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[1]!.transition.command.path = Array.from({ length: 7 }, (_unused, index) => ({ column: index + 1, row: 0 }));
  return edited;
}

/** E3: revision 3 (session_ended) rngState.draws + 1: a recorded fact no rule derives. */
export function e3(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[2]!.rngState.draws += 1;
  return edited;
}

/** E4: revision 2's round + 1 (to be bundled WITHOUT recomputing the revision checksums). */
export function e4(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[1]!.encounterState.round += 1;
  return edited;
}

/** E5: E1, with revision 3 re-attributed to `last`. */
export function e5(plain: readonly Plain[], last: EngineBuild): Plain[] {
  const edited = e1(plain);
  edited[2]!.recordedBy = last;
  return edited;
}

/** E10: revision 1 without `controllers`. */
export function e10(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  delete edited[0]!.controllers;
  return edited;
}

/** E11: revision 2's transition kind from the future. */
export function e11(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[1]!.transition.kind = 'transition_from_the_future';
  return edited;
}

/** E12: revision 2 names revision 3 as its parent. */
export function e12(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[1]!.parentRevision = 3;
  return edited;
}

export function reattributed(plain: readonly Plain[], build: EngineBuild): Plain[] {
  return plain.map((revision) => ({ ...structuredClone(revision), recordedBy: build }));
}

/** A bundle's text with its fingerprint's last hex digit flipped. */
export function withFlippedFingerprint(text: string): string {
  const flipped = JSON.parse(text) as Plain;
  const fingerprint = String(flipped.fingerprint);
  flipped.fingerprint = `${fingerprint.slice(0, -1)}${fingerprint.endsWith('0') ? '1' : '0'}`;
  return canonicalJson(flipped);
}

// A three-character adventuring-day party (as tests/unit/vtt/party-session-state.test.ts builds one).
function member(index: number, classId: 'Wizard' | 'Warlock' | 'Fighter', constitution: number): ExternalPartyPackV2['members'][number] {
  const caster = classId === 'Wizard' || classId === 'Warlock';
  return {
    combatantId: `combatant:advday-${String(index)}`,
    tokenId: `token:advday-${String(index)}`,
    characterId: index,
    classes: [{ classId, level: 2 }],
    hitDice: [{ sides: classId === 'Wizard' ? 6 : classId === 'Warlock' ? 8 : 10, maximum: 2 }],
    abilities: {
      strength: 10, dexterity: 10, constitution, intelligence: classId === 'Wizard' ? 16 : 10, wisdom: 10,
      charisma: classId === 'Warlock' ? 16 : 10,
    },
    armorClass: 12,
    hitPointMaximum: 20,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: classId === 'Wizard' ? 20 : 0,
    savingThrowBonuses: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
    attacksPerAction: 1,
    attacks: [{
      attackId: `attack:advday-${String(index)}`, kind: 'melee', attackBonus: 4, criticalFloor: 20, reachFeet: 5,
      rangeFeet: 5, damage: [{ damageTypeId: 'Bludgeoning', count: 1, sides: 6, modifier: 2 }],
    }],
    startingConditions: [],
    ...statedPlainMemberFields(),
    ...(caster
      ? {
          spellcasting: [{
            ability: classId === 'Wizard' ? 'intelligence' as const : 'charisma' as const, spellSaveDc: 13,
            spellAttackBonus: 5, preparedSpellIds: ['magic-missile'], knownSpellIds: [],
          }],
          sharedSpellSlots: classId === 'Wizard' ? [{ level: 1 as const, count: 3, recharge: 'long_rest' as const }] : [],
          ...(classId === 'Warlock' ? { pactSpellSlots: [{ level: 1 as const, count: 2, recharge: 'short_rest' as const }] } : {}),
        }
      : {}),
  };
}

export function loadedParty(): readonly LoadedPartyMember[] {
  const loaded = loadExternalPartyPack({
    schemaVersion: 2, partyId: 'party:adventuring-day-tests', allowPartial: false,
    members: [member(1, 'Wizard', 14), member(2, 'Warlock', 8), member(3, 'Fighter', 10)],
  });
  if (loaded.status !== 'loaded') throw new Error('The adventuring-day party pack was refused.');
  return loaded.party.members;
}

const IDLE_COORDINATOR = {
  requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' as const }, pause: null,
};

function partyJournal(build: EngineBuild, id: string): {
  readonly journal: EncounterSessionJournal;
  readonly store: MemoryBrowserSessionStore;
  readonly sessionId: SessionRevision['sessionId'];
  readonly members: readonly LoadedPartyMember[];
} {
  const members = loadedParty();
  const room = composeStoredCharacterEncounter(members);
  if (room.partyState === null) throw new Error('The composed room has no party state.');
  const sessionId = encounterSessionId(`session:${id}`);
  const store = new MemoryBrowserSessionStore(build);
  const journal = EncounterSessionJournal.create({
    sessionId, branchId: encounterBranchId(`branch:${id}`), encounterState: room.state, partyState: room.partyState,
    coordinatorState: IDLE_COORDINATOR, controllers: room.controllers, rng: mulberry32(3734), store,
    mirror: new MemoryMirrorSink(),
  });
  return { journal, store, sessionId, members };
}

/** P, recorded by `build`. */
export function recordP(build: EngineBuild): { readonly sessionId: SessionRevision['sessionId']; readonly plain: Plain[] } {
  const { journal, store, sessionId, members } = partyJournal(build, 'savecompat-party');
  journal.updateReactionPreference(combatantId('combatant:advday-1'), 'opportunity_attack', 'never');
  journal.takeShortRest([]);
  const rested = store.revisions(sessionId).at(-1)!.partyState!;
  const next = composeStoredCharacterEncounter(members, new Map(), { ...rested, room: rested.room + 1 } as typeof rested);
  journal.composeNextRoom({ encounterState: next.state, coordinatorState: IDLE_COORDINATOR, controllers: next.controllers });
  return { sessionId, plain: plainOf(store.revisions(sessionId)) };
}

/** R, recorded by `build`. */
export function recordR(build: EngineBuild): { readonly sessionId: SessionRevision['sessionId']; readonly plain: Plain[] } {
  const { journal, store, sessionId } = partyJournal(build, 'savecompat-refusal-handling');
  journal.updateRefusalHandling('validation', 'refuse_with_citation');
  return { sessionId, plain: plainOf(store.revisions(sessionId)) };
}

/** E6: P's Short Rest spends name a combatant who is not in the party. */
export function e6(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited.find((revision) => revision.transition.kind === 'short_rest_completed')!.transition.spends = [
    { combatantId: 'combatant:nobody', dice: [] },
  ];
  return edited;
}

/** E7: P's room_composed party state with one more exhaustion level on its first character. */
export function e7(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited.find((revision) => revision.transition.kind === 'room_composed')!.partyState.characters[0].exhaustionLevel += 1;
  return edited;
}

/** E8: P's recorded reaction policy for the first character's opportunity attack, 'never' -> 'always'. */
export function e8(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  const changed = edited.find((revision) => revision.transition.kind === 'reaction_preference_changed')!;
  const policy = (changed.partyState.reactionPolicies as Plain[])
    .find((entry) => entry.combatant === 'combatant:advday-1' && entry.reactionKind === 'opportunity_attack')!;
  expect(policy.policy).toBe('never');
  policy.policy = 'always';
  return edited;
}

/** E9: R's revision 2 with one more RNG draw and its first character at 1 Hit Point. */
export function e9(plain: readonly Plain[]): Plain[] {
  const edited = structuredClone(plain) as Plain[];
  edited[1]!.rngState.draws += 1;
  edited[1]!.partyState.characters[0].currentHitPoints = 1;
  return edited;
}

/** L: the first `count` revisions of the lr-squeezed v12 fixture, as stored (session schema 12). */
export function lrV12(lrText: string, count: number): Plain[] {
  return (JSON.parse(lrText) as { revisions: Plain[] }).revisions.slice(0, count);
}

/** L': L's revisions 1-2 with revision 2's events written twice and its v12 checksum recomputed. */
export function lrPrime(lrText: string): Plain[] {
  const edited = structuredClone(lrV12(lrText, 2));
  edited[1]!.transition.events = [...edited[1]!.transition.events, ...edited[1]!.transition.events];
  edited[1] = withChecksum(edited[1]!);
  return edited;
}

/** Lx: L' without its v12 checksum recomputed. */
export function lrCross(lrText: string): Plain[] {
  const edited = structuredClone(lrV12(lrText, 2));
  edited[1]!.transition.events = [...edited[1]!.transition.events, ...edited[1]!.transition.events];
  return edited;
}
