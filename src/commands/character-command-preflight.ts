import type { DatabaseContext } from '../db/database';
import type { CharacterCommandPayload } from '../domain/command-contracts';
import {
  CharacterCommandFactory,
  type ConstructedCharacterCommand,
} from './character-command-factory';
import type { CharacterCommandIntegrity } from './integrity';
import {
  CharacterCommandPayloadValidator,
} from './payload-validator';
import { RevisionConflict } from './revision-conflict';

export interface CharacterCommandPreflightRequest {
  readonly character_id: number;
  readonly expected_revision: number;
  readonly command: unknown;
}

export interface PreparedCharacterCommand {
  readonly payload: CharacterCommandPayload;
  readonly command: ConstructedCharacterCommand;
}

export interface CharacterCommandPreflightOptions {
  readonly factory?: CharacterCommandFactory;
  readonly validator?: CharacterCommandPayloadValidator;
}

export class CharacterArchivedRefusal extends Error {
  readonly reason = 'character_archived' as const;

  constructor(readonly currentRevision: number) {
    super('Archived characters cannot be changed.');
    this.name = 'CharacterArchivedRefusal';
  }
}

/**
 * The shared command boundary used by durable execution and rollback preview.
 *
 * Validation and factory/integrity construction happen once through this
 * service. The revision assertion is deliberately public because both callers
 * repeat it inside their transaction immediately before applying the command.
 */
export class CharacterCommandPreflight {
  readonly #factory: CharacterCommandFactory;
  readonly #validator: CharacterCommandPayloadValidator;

  constructor(
    private readonly db: DatabaseContext,
    integrity: CharacterCommandIntegrity,
    options: CharacterCommandPreflightOptions = {},
  ) {
    this.#validator = options.validator ?? new CharacterCommandPayloadValidator();
    this.#factory = options.factory ?? new CharacterCommandFactory(
      db,
      integrity,
      this.#validator,
    );
  }

  async prepare(
    request: CharacterCommandPreflightRequest,
  ): Promise<PreparedCharacterCommand> {
    this.assertExpectedRevision(request, request.command);
    return this.preparePayload(request.character_id, request.command);
  }

  /**
   * Validation/construction without a revision assertion. Internal undo uses
   * this while preparing persisted bytes, then performs all authorization in
   * the same transaction as the eventual write.
   */
  async preparePayload(
    characterId: number,
    input: unknown,
  ): Promise<PreparedCharacterCommand> {
    const payload = this.#validator.validate(input);
    const command = await this.#factory.make(characterId, payload);
    return { payload, command };
  }

  assertExpectedRevision(
    request: Pick<
      CharacterCommandPreflightRequest,
      'character_id' | 'expected_revision'
    >,
    input: unknown,
  ): void {
    const currentRevision = this.currentMutableRevision(request.character_id);
    if (
      currentRevision !== request.expected_revision &&
      !this.canMergeStaleSlotCommand(
        request.character_id,
        input,
        request.expected_revision,
        currentRevision,
      )
    ) {
      throw new RevisionConflict(currentRevision);
    }
  }

  currentRevision(characterId: number): number {
    const revision = this.db.scalar(
      'SELECT revision FROM characters WHERE id = ?',
      [characterId],
    );
    if (revision === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }
    return Number(revision);
  }

  private currentMutableRevision(characterId: number): number {
    const character = this.db.oneRaw(
      'SELECT revision, archived_at FROM characters WHERE id = ?',
      [characterId],
    );
    if (character === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }
    const revision = Number(character.revision);
    if (character.archived_at !== null) {
      throw new CharacterArchivedRefusal(revision);
    }
    return revision;
  }

  private canMergeStaleSlotCommand(
    characterId: number,
    input: unknown,
    expectedRevision: number,
    currentRevision: number,
  ): boolean {
    if (
      expectedRevision >= currentRevision ||
      input === null ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      (input as { type?: unknown }).type !== 'set_slot'
    ) {
      return false;
    }
    const slotId = (input as { slot_id?: unknown }).slot_id;
    if (
      !Number.isSafeInteger(slotId) ||
      Number(slotId) < 1 ||
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1
             FROM spell_selection_slots
             WHERE character_id = ? AND id = ?
           )`,
          [characterId, Number(slotId)],
        ) ?? 0,
      ) !== 1
    ) {
      return false;
    }

    return (
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1
             FROM change_log AS change
             INNER JOIN character_operations AS operation
               ON operation.operation_uuid = change.operation_uuid
             WHERE operation.character_id = ?
               AND operation.resulting_revision > ?
               AND change.entity_type = 'spell_selection_slots'
               AND change.entity_id = ?
           )`,
          [characterId, expectedRevision, Number(slotId)],
        ) ?? 0,
      ) === 0
    );
  }
}
