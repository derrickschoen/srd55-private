import { sqlNullableString, type RowCodec } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { AcknowledgeWarningCommand as AcknowledgeWarningPayload } from '../domain/command-contracts';
import type { CharacterCommandIntegrity } from './integrity';

type DeleteWarningPayload = Extract<
  AcknowledgeWarningPayload,
  { mode: 'delete' }
>;

interface AcknowledgementRow {
  readonly note: string | null;
}

/**
 * The stored acknowledgement, decoded.
 *
 * `note` was `unknown` here, which is honest about the column NAME and silent
 * about the value — so every reader wrote `String(row.note ?? '')` and the empty
 * string covered both "no note" and "not a string". `sqlNullableString` makes
 * the nullability explicit and refuses anything that is neither.
 */
const acknowledgementRow: RowCodec<AcknowledgementRow> = (row) => ({
  note: sqlNullableString(row, 'note'),
});

function warningFingerprint(value: string): string {
  const fingerprint = value.trim();
  if (!fingerprint.startsWith('conflicting_versions:')) {
    throw new TypeError('Unknown warning fingerprint.');
  }
  return fingerprint;
}

/**
 * The destructive half of acknowledge_warning is separate so dispatchers can
 * require integrity before allowing the persisted acknowledgement to be
 * consumed.
 */
export class DeleteWarningAcknowledgementCommand {
  readonly actionType = 'acknowledge_warning';

  #characterId: number | null = null;
  #previous: AcknowledgementRow | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: DeleteWarningPayload,
    private readonly integrity: CharacterCommandIntegrity,
  ) {}

  async apply(characterId: number): Promise<void> {
    await this.integrity.assertValid(characterId, this.payload);
    const fingerprint = warningFingerprint(
      this.payload.warning_fingerprint,
    );
    const previous = this.db.one(
      `SELECT *
       FROM warning_acknowledgements
       WHERE character_id = ? AND warning_fingerprint = ?`,
      [characterId, fingerprint],
      acknowledgementRow,
    );
    if (previous === null) {
      throw new TypeError(
        'Warning acknowledgement does not belong to this character.',
      );
    }

    this.db.exec(
      `DELETE FROM warning_acknowledgements
       WHERE character_id = ? AND warning_fingerprint = ?`,
      [characterId, fingerprint],
    );
    this.#characterId = characterId;
    this.#previous = previous;
  }

  inverse(): AcknowledgeWarningPayload {
    if (this.#characterId === null || this.#previous === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'acknowledge_warning',
      warning_fingerprint: this.payload.warning_fingerprint,
      note: this.#previous.note ?? '',
    };
  }
}
