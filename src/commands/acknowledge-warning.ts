import { SpellAccessBuilder } from '../access/spell-access-builder';
import type { DatabaseContext } from '../db/database';
import {
  DuplicateWarningDetector,
} from '../duplicates/duplicate-warning-detector';
import type { AcknowledgeWarningCommand as AcknowledgeWarningPayload } from '../domain/command-contracts';
import { DeleteWarningAcknowledgementCommand } from './delete-warning-acknowledgement';
import type { CharacterCommandIntegrity } from './integrity';

type AcknowledgePayload = Extract<
  AcknowledgeWarningPayload,
  { mode?: 'acknowledge' }
>;
type DeletePayload = Extract<
  AcknowledgeWarningPayload,
  { mode: 'delete' }
>;

interface AcknowledgementRow {
  readonly note: unknown;
  readonly created_at: unknown;
}

function warningFingerprint(value: string): string {
  const fingerprint = value.trim();
  if (!fingerprint.startsWith('conflicting_versions:')) {
    throw new TypeError('Unknown warning fingerprint.');
  }
  return fingerprint;
}

export class AcknowledgeWarningCommand {
  readonly actionType = 'acknowledge_warning';

  readonly #access: SpellAccessBuilder;
  readonly #duplicates: DuplicateWarningDetector;
  #characterId: number | null = null;
  #previous: AcknowledgementRow | null = null;
  #delete: DeleteWarningAcknowledgementCommand | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AcknowledgeWarningPayload,
    private readonly integrity: CharacterCommandIntegrity,
    access?: SpellAccessBuilder,
    duplicates?: DuplicateWarningDetector,
  ) {
    this.#access = access ?? new SpellAccessBuilder(db);
    this.#duplicates = duplicates ?? new DuplicateWarningDetector();
  }

  async apply(characterId: number): Promise<void> {
    const fingerprint = warningFingerprint(
      this.payload.warning_fingerprint,
    );
    const mode = this.payload.mode ?? 'acknowledge';
    if (mode !== 'acknowledge' && mode !== 'delete') {
      throw new TypeError('Unknown warning acknowledgement mode.');
    }
    if (mode === 'delete') {
      const command = new DeleteWarningAcknowledgementCommand(
        this.db,
        this.payload as DeletePayload,
        this.integrity,
      );
      await command.apply(characterId);
      this.#delete = command;
      this.#characterId = characterId;
      return;
    }

    const active = this.#duplicates
      .classify(this.#access.buildForCharacter(characterId))
      .some(
        (warning) =>
          warning.category === 'conflicting_version' &&
          warning.warning_fingerprint === fingerprint,
      );
    if (!active) {
      throw new TypeError(
        'The conflicting-version warning is no longer active.',
      );
    }

    const note = (this.payload as AcknowledgePayload).note.trim();
    if (note === '') {
      throw new TypeError('An acknowledgement note is required.');
    }

    this.db.transaction(() => {
      const previous = this.db.one<AcknowledgementRow>(
        `SELECT *
         FROM warning_acknowledgements
         WHERE character_id = ? AND warning_fingerprint = ?`,
        [characterId, fingerprint],
      );
      const timestamp = new Date().toISOString();
      if (previous === null) {
        this.db.exec(
          `INSERT INTO warning_acknowledgements (
             character_id, warning_fingerprint, note, invalidated_at,
             created_at, updated_at
           ) VALUES (?, ?, ?, NULL, ?, ?)`,
          [characterId, fingerprint, note, timestamp, timestamp],
        );
      } else {
        this.db.exec(
          `UPDATE warning_acknowledgements
           SET note = ?, invalidated_at = NULL, updated_at = ?
           WHERE character_id = ? AND warning_fingerprint = ?`,
          [note, timestamp, characterId, fingerprint],
        );
      }
      this.#previous = previous;
    });
    this.#characterId = characterId;
  }

  async inverse(): Promise<AcknowledgeWarningPayload> {
    if (this.#characterId === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    if (this.#delete !== null) {
      return this.#delete.inverse();
    }
    if (this.#previous !== null) {
      return {
        type: 'acknowledge_warning',
        warning_fingerprint: this.payload.warning_fingerprint,
        note: String(this.#previous.note ?? ''),
      };
    }
    return this.integrity.attach(this.#characterId, {
      type: 'acknowledge_warning',
      mode: 'delete',
      warning_fingerprint: this.payload.warning_fingerprint,
    });
  }
}
