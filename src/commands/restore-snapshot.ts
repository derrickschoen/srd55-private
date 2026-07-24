import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';
import type { RestoreSnapshotCommand as RestoreSnapshotPayload } from '../domain/command-contracts';
import type { CharacterCommandIntegrity } from './integrity';

export class RestoreSnapshotCommand {
  readonly actionType = 'restore_snapshot';

  readonly #state: CharacterState;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    db: DatabaseContext,
    private readonly payload: RestoreSnapshotPayload,
    private readonly integrity: CharacterCommandIntegrity,
    state?: CharacterState,
  ) {
    this.#state = state ?? new CharacterState(db);
  }

  async apply(characterId: number): Promise<void> {
    await this.integrity.assertValid(characterId, this.payload);
    const before = this.#state.capture(characterId);
    this.#state.restore(characterId, this.payload.snapshot);
    this.#before = before;
    this.#characterId = characterId;
  }

  async inverse(): Promise<RestoreSnapshotPayload> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.integrity.attach(this.#characterId, {
      type: 'restore_snapshot',
      snapshot: this.#before,
    }) as unknown as Promise<RestoreSnapshotPayload>;
  }
}
