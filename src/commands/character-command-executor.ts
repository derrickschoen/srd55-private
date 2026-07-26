import { SpellAccessBuilder } from '../access/spell-access-builder';
import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';
import {
  DuplicateWarningDetector,
} from '../duplicates/duplicate-warning-detector';
import type {
  AcknowledgeWarningCommand,
  CharacterCommandPayload,
  CharacterCommandRequest,
  RestoreSnapshotCommand,
  SetSlotCommand,
} from '../domain/command-contracts';
import type { JsonObject } from '../domain/models';
import {
  CharacterAuditLog,
  type CharacterAuditWriter,
} from './audit-log';
import {
  CharacterCommandFactory,
  type ConstructedCharacterCommand,
} from './character-command-factory';
import type { CharacterCommandIntegrity } from './integrity';
import {
  CharacterCommandPayloadValidator,
} from './payload-validator';
import { RevisionConflict } from './revision-conflict';
import {
  resolvesInverseAfterApply,
  type ResolvesInverseAfterApply,
} from './weapons';

export interface CharacterCommandResult {
  readonly inverse: CharacterCommandPayload;
  readonly revision: number;
  readonly idempotent_replay: boolean;
}

export interface CharacterCommandExecutorOptions {
  readonly factory?: CharacterCommandFactory;
  readonly state?: CharacterState;
  readonly audit?: CharacterAuditWriter;
  readonly clock?: () => string;
}

interface OperationRow {
  readonly character_id: unknown;
  readonly inverse_command: unknown;
}

type SnapshotRow = Readonly<Record<string, unknown>>;

const systemClock = () => new Date().toISOString();

function parseInverse(value: unknown): CharacterCommandPayload {
  if (typeof value !== 'string') {
    throw new Error('Stored inverse command is invalid.');
  }
  return JSON.parse(value) as CharacterCommandPayload;
}

function warningFingerprint(value: string): string {
  const fingerprint = value.trim();
  if (!fingerprint.startsWith('conflicting_versions:')) {
    throw new TypeError('Unknown warning fingerprint.');
  }
  return fingerprint;
}

function slotRestoreState(row: SnapshotRow) {
  return {
    current_spell_version_id:
      row.current_spell_version_id === null
        ? null
        : Number(row.current_spell_version_id),
    selection_eligibility: String(row.selection_eligibility),
    selection_invalid_reason:
      row.selection_invalid_reason === null
        ? null
        : String(row.selection_invalid_reason),
    state: String(row.state),
    override_note:
      row.override_note === null ? null : String(row.override_note),
  } as Extract<SetSlotCommand, { mode: 'restore' }>['state'];
}

/**
 * The inverse actually stored: what the command resolved after applying, when
 * it resolves one, and otherwise the inverse prepared before the transaction.
 *
 * The local annotation is load-bearing. Narrowing `command` gives the
 * INTERSECTION of both interfaces, whose `inverse` is an overload set returning
 * `payload | Promise<payload>`; assigning through the single-signature
 * interface is what recovers the synchronous return type without a cast.
 */
function resolveInverse(
  command: ConstructedCharacterCommand,
  prepared: CharacterCommandPayload,
): CharacterCommandPayload {
  if (!resolvesInverseAfterApply(command)) {
    return prepared;
  }
  const resolver: ResolvesInverseAfterApply = command;
  return resolver.inverse();
}

function snapshotJson(snapshot: CharacterStateSnapshot): JsonObject {
  return snapshot as unknown as JsonObject;
}

export class CharacterCommandExecutor {
  readonly #factory: CharacterCommandFactory;
  readonly #state: CharacterState;
  readonly #audit: CharacterAuditWriter;
  readonly #validator = new CharacterCommandPayloadValidator();
  readonly #clock: () => string;

  constructor(
    private readonly db: DatabaseContext,
    private readonly integrity: CharacterCommandIntegrity,
    options: CharacterCommandExecutorOptions = {},
  ) {
    this.#state = options.state ?? new CharacterState(db);
    this.#factory =
      options.factory ?? new CharacterCommandFactory(db, integrity);
    this.#audit =
      options.audit ?? new CharacterAuditLog(db, this.#state);
    this.#clock = options.clock ?? systemClock;
  }

  async execute(
    request: CharacterCommandRequest,
  ): Promise<CharacterCommandResult> {
    const replay = this.replay(request.character_id, request.operation_uuid);
    if (replay !== null) {
      return replay;
    }

    const currentRevision = this.currentRevision(request.character_id);
    if (
      currentRevision !== request.expected_revision &&
      !this.canMergeStaleSlotCommand(
        request.character_id,
        request.command,
        request.expected_revision,
        currentRevision,
      )
    ) {
      throw new RevisionConflict(currentRevision);
    }

    const payload = this.#validator.validate(request.command);
    const command = await this.#factory.make(
      request.character_id,
      payload,
    );
    const before = this.#state.capture(request.character_id);
    const inverse = await this.prepareInverse(
      request.character_id,
      payload,
      before,
    );

    return this.db.transaction(() =>
      this.commit(request, payload, command, before, inverse),
    );
  }

  private commit(
    request: CharacterCommandRequest,
    payload: CharacterCommandPayload,
    command: ConstructedCharacterCommand,
    before: CharacterStateSnapshot,
    inverse: CharacterCommandPayload,
  ): CharacterCommandResult {
    const replay = this.replay(request.character_id, request.operation_uuid);
    if (replay !== null) {
      return replay;
    }

    const currentRevision = this.currentRevision(request.character_id);
    if (
      currentRevision !== request.expected_revision &&
      !this.canMergeStaleSlotCommand(
        request.character_id,
        payload,
        request.expected_revision,
        currentRevision,
      )
    ) {
      throw new RevisionConflict(currentRevision);
    }

    this.applySynchronously(request.character_id, payload, command);
    // SOME INVERSES ARE ONLY KNOWABLE AFTER THE WRITE. `add_weapon` must name
    // the row id SQLite assigned, and `prepareInverse` ran before this
    // transaction opened. Commands in that position publish the real inverse
    // here; everything else keeps the one prepared up front, unchanged.
    const storedInverse = resolveInverse(command, inverse);
    const nextRevision = currentRevision + 1;
    const timestamp = this.#clock();
    this.db.exec(
      `UPDATE characters
       SET revision = ?, updated_at = ?
       WHERE id = ?`,
      [nextRevision, timestamp, request.character_id],
    );
    const after = this.#state.capture(request.character_id);
    this.#audit.append({
      characterId: request.character_id,
      operationUuid: request.operation_uuid,
      actionType: command.actionType,
      reason: payload.reason ?? null,
      before,
      after,
    });
    this.db.exec(
      `INSERT INTO character_operations (
         character_id, operation_uuid, expected_revision,
         resulting_revision, inverse_command, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        request.character_id,
        request.operation_uuid,
        request.expected_revision,
        nextRevision,
        JSON.stringify(storedInverse),
        timestamp,
        timestamp,
      ],
    );

    return {
      inverse: storedInverse,
      revision: nextRevision,
      idempotent_replay: false,
    };
  }

  private replay(
    characterId: number,
    operationUuid: string,
  ): CharacterCommandResult | null {
    const operation = this.db.one<OperationRow>(
      `SELECT character_id, inverse_command
       FROM character_operations
       WHERE operation_uuid = ?`,
      [operationUuid],
    );
    if (operation === null) {
      return null;
    }
    if (Number(operation.character_id) !== characterId) {
      throw new RevisionConflict(this.currentRevisionOrZero(characterId));
    }
    return {
      inverse: parseInverse(operation.inverse_command),
      revision: this.currentRevision(characterId),
      idempotent_replay: true,
    };
  }

  private currentRevision(characterId: number): number {
    const revision = this.db.scalar(
      'SELECT revision FROM characters WHERE id = ?',
      [characterId],
    );
    if (revision === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }
    return Number(revision);
  }

  private currentRevisionOrZero(characterId: number): number {
    return Number(
      this.db.scalar(
        'SELECT revision FROM characters WHERE id = ?',
        [characterId],
      ) ?? 0,
    );
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

  private async prepareInverse(
    characterId: number,
    payload: CharacterCommandPayload,
    before: CharacterStateSnapshot,
  ): Promise<CharacterCommandPayload> {
    switch (payload.type) {
      case 'update_ability':
        return {
          type: 'update_ability',
          ability: payload.ability,
          score: Number(before.character[payload.ability]),
        };
      case 'set_slot': {
        const slot = before.spell_selection_slots.find(
          (row) => Number(row.id) === payload.slot_id,
        );
        if (slot === undefined) {
          throw new Error('Spell slot does not belong to this character.');
        }
        return this.integrity.attach(characterId, {
          type: 'set_slot',
          slot_id: payload.slot_id,
          mode: 'restore',
          state: slotRestoreState(slot),
        });
      }
      case 'update_character_rules':
        return {
          type: 'update_character_rules',
          allow_legacy: Number(before.character.allow_legacy) === 1,
        };
      case 'acknowledge_warning':
        return this.warningInverse(characterId, payload, before);
      case 'add_weapon':
      case 'update_weapon':
      case 'remove_weapon':
      case 'set_weapon_mastery':
      // The four sheet-input writers join them: each captures the value it
      // displaced during `apply()`, which `prepareInverse` runs too early to
      // see. `character_armor` and the other three ARE snapshot tables, unlike
      // `character_weapons` — the explicit inverse is kept anyway because it is
      // strictly more precise than a whole-character snapshot, and undoing an
      // armour change must not disturb a spell selection made in between.
      case 'set_armor':
      case 'set_hit_point_roll':
      case 'set_skill_proficiency':
      case 'set_armor_class_adjustment':
        // PROVISIONAL AND NEVER STORED. These resolve their inverse after
        // apply (see `commit`). Echoing the payload rather than guessing a
        // plausible inverse means that if the resolution ever stops happening,
        // undo visibly repeats the action instead of quietly doing something
        // almost right.
        return payload;
      case 'update_source_config':
      case 'add_source':
      case 'remove_source':
      case 'update_class':
      case 'restore_snapshot':
        return this.integrity.attach(characterId, {
          type: 'restore_snapshot',
          snapshot: snapshotJson(before),
        }) as Promise<RestoreSnapshotCommand>;
    }
  }

  private async warningInverse(
    characterId: number,
    payload: AcknowledgeWarningCommand,
    before: CharacterStateSnapshot,
  ): Promise<AcknowledgeWarningCommand> {
    const fingerprint = warningFingerprint(payload.warning_fingerprint);
    const previous = before.warning_acknowledgements.find(
      (row) => String(row.warning_fingerprint) === fingerprint,
    );
    if (previous !== undefined) {
      return {
        type: 'acknowledge_warning',
        warning_fingerprint: payload.warning_fingerprint,
        note: String(previous.note ?? ''),
      };
    }
    return this.integrity.attach(characterId, {
      type: 'acknowledge_warning',
      mode: 'delete',
      warning_fingerprint: payload.warning_fingerprint,
    });
  }

  private applySynchronously(
    characterId: number,
    payload: CharacterCommandPayload,
    command: ConstructedCharacterCommand,
  ): void {
    if (payload.type === 'restore_snapshot') {
      this.#state.restore(characterId, payload.snapshot);
      return;
    }
    if (payload.type === 'acknowledge_warning') {
      this.applyWarning(characterId, payload);
      return;
    }
    const result = command.apply(characterId);
    if (result instanceof Promise) {
      throw new Error(
        `Command ${payload.type} cannot execute asynchronously inside SQLite.`,
      );
    }
  }

  private applyWarning(
    characterId: number,
    payload: AcknowledgeWarningCommand,
  ): void {
    const fingerprint = warningFingerprint(payload.warning_fingerprint);
    if (payload.mode === 'delete') {
      const previous = this.db.one(
        `SELECT id
         FROM warning_acknowledgements
         WHERE character_id = ? AND warning_fingerprint = ?`,
        [characterId, fingerprint],
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
      return;
    }

    const active = new DuplicateWarningDetector()
      .classify(new SpellAccessBuilder(this.db).buildForCharacter(characterId))
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
    const note = payload.note.trim();
    if (note === '') {
      throw new TypeError('An acknowledgement note is required.');
    }
    const timestamp = this.#clock();
    if (
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1
             FROM warning_acknowledgements
             WHERE character_id = ? AND warning_fingerprint = ?
           )`,
          [characterId, fingerprint],
        ) ?? 0,
      ) === 1
    ) {
      this.db.exec(
        `UPDATE warning_acknowledgements
         SET note = ?, invalidated_at = NULL, updated_at = ?
         WHERE character_id = ? AND warning_fingerprint = ?`,
        [note, timestamp, characterId, fingerprint],
      );
    } else {
      this.db.exec(
        `INSERT INTO warning_acknowledgements (
           character_id, warning_fingerprint, note, invalidated_at,
           created_at, updated_at
         ) VALUES (?, ?, ?, NULL, ?, ?)`,
        [characterId, fingerprint, note, timestamp, timestamp],
      );
    }
  }
}
