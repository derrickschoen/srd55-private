import type { ControllerIdentity } from '../combat/controllers';
import type { PersistedCoordinatorState } from '../combat/coordinator';
import { reduceEncounter, type EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { SerializableRng } from '../combat/random';
import type { CodexSessionId, EncounterBranchId, EncounterSessionId } from '../combat/values';
import type { LoadedPartyMember } from './party-pack';
import {
  createPartySessionState,
  enterNextRoom as advancePartyRoom,
  type PartySessionState,
  type ShortRestHitDieSpend,
  type ShortRestResult,
} from './party-session-state';
import {
  EncounterSessionJournal,
  type BrowserSessionStore,
  type MirrorSink,
} from './session-persistence';
import {
  composeStoredCharacterEncounter,
  type StoredCharacterEncounter,
} from './stored-character-encounter';

export const ADVENTURING_DAY_INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

export type DmRoomComposer = (
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  partyState: PartySessionState,
) => StoredCharacterEncounter;

/**
 * DM-authoritative four-room flow. It owns the cross-encounter party state;
 * individual EncounterState values remain replaceable room-local reducers.
 */
export class AdventuringDaySession {
  #encounter: StoredCharacterEncounter;
  #partyState: PartySessionState;

  private constructor(
    private readonly members: readonly LoadedPartyMember[],
    private readonly displayNames: ReadonlyMap<number, string>,
    private readonly journal: EncounterSessionJournal,
    initialEncounter: StoredCharacterEncounter,
    initialPartyState: PartySessionState,
  ) {
    this.#encounter = initialEncounter;
    this.#partyState = initialPartyState;
  }

  static create(input: {
    readonly sessionId: EncounterSessionId;
    readonly branchId: EncounterBranchId;
    readonly codexSessionId: CodexSessionId;
    readonly members: readonly LoadedPartyMember[];
    readonly displayNames?: ReadonlyMap<number, string>;
    readonly rng: SerializableRng;
    readonly store: BrowserSessionStore;
    readonly mirror: MirrorSink;
    readonly composeRoom?: DmRoomComposer;
  }): AdventuringDaySession {
    const displayNames = input.displayNames ?? new Map<number, string>();
    const partyState = createPartySessionState(input.members);
    const encounter = (input.composeRoom ?? composeStoredCharacterEncounter)(
      input.members,
      displayNames,
      partyState,
    );
    if (encounter.rulesEdition !== '2024') {
      throw new Error('The adventuring-day encounter chain is locked to the 2024 rules edition.');
    }
    const journal = EncounterSessionJournal.create({
      sessionId: input.sessionId,
      branchId: input.branchId,
      encounterState: encounter.state,
      partyState,
      coordinatorState: ADVENTURING_DAY_INITIAL_COORDINATOR_STATE,
      controllers: encounter.controllers,
      codexSessionId: input.codexSessionId,
      rng: input.rng,
      store: input.store,
      mirror: input.mirror,
    });
    return new AdventuringDaySession(
      input.members,
      displayNames,
      journal,
      encounter,
      partyState,
    );
  }

  encounter(): EncounterState {
    return structuredClone(this.#encounter.state);
  }

  party(): PartySessionState {
    return structuredClone(this.#partyState);
  }

  controllers(): readonly ControllerIdentity[] {
    return structuredClone(this.#encounter.controllers);
  }

  apply(command: EncounterCommand): EncounterState {
    const reduction = reduceEncounter(this.#encounter.state, command, this.journal.rng());
    this.#encounter = { ...this.#encounter, state: reduction.state };
    this.journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: reduction.state,
      coordinatorState: ADVENTURING_DAY_INITIAL_COORDINATOR_STATE,
      controllers: this.#encounter.controllers,
    });
    return structuredClone(reduction.state);
  }

  captureRoom(): PartySessionState {
    this.#partyState = this.journal.capturePartyState();
    return this.party();
  }

  shortRest(spends: readonly ShortRestHitDieSpend[]): ShortRestResult {
    const result = this.journal.takeShortRest(spends);
    this.#partyState = result.state;
    return structuredClone(result);
  }

  enterNextRoom(composeRoom: DmRoomComposer = composeStoredCharacterEncounter): StoredCharacterEncounter {
    const nextPartyState = advancePartyRoom(this.#partyState);
    const encounter = composeRoom(this.members, this.displayNames, nextPartyState);
    if (encounter.rulesEdition !== '2024') {
      throw new Error('Every encounter in the chain must use the locked 2024 rules edition.');
    }
    this.#partyState = this.journal.composeNextRoom({
      encounterState: encounter.state,
      coordinatorState: ADVENTURING_DAY_INITIAL_COORDINATOR_STATE,
      controllers: encounter.controllers,
    });
    this.#encounter = {
      ...encounter,
      partyState: this.#partyState,
    };
    return {
      ...this.#encounter,
      state: structuredClone(this.#encounter.state),
      partyState: structuredClone(this.#partyState),
    };
  }
}
