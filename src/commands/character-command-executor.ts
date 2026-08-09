import { SpellAccessBuilder } from '../access/spell-access-builder';
import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import {
  rowId,
  sqlInteger,
  sqlNullableString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  DuplicateWarningDetector,
} from '../duplicates/duplicate-warning-detector';
import type {
  AcknowledgeWarningCommand,
  CharacterCommandPayload,
  CharacterCommandRequest,
  RestoreCharacterSavePointRequest,
  SetSlotCommand,
  UndoCharacterOperationRequest,
} from '../domain/command-contracts';
import { isEnumValue, skills } from '../domain/enums';
import type { JsonObject } from '../domain/models';
import {
  CharacterAuditLog,
  type CharacterAuditWriter,
} from './audit-log';
import {
  CharacterCommandFactory,
  type ConstructedCharacterCommand,
} from './character-command-factory';
import { CharacterCommandPreflight } from './character-command-preflight';
import type { CharacterCommandIntegrity } from './integrity';
import { CharacterCommandPayloadValidator } from './payload-validator';
import { RevisionConflict } from './revision-conflict';
import {
  resolvesInverseAfterApply,
  type ResolvesInverseAfterApply,
} from './weapons';
import { CharacterSheetBuilder } from '../queries/character-sheet-builder';
import {
  applyStoredCharacterFlavorInverse,
  type StoredCharacterFlavorInverse,
} from './update-character-flavor';
import type {
  StoredCharacterInverse,
  StoredCharacterSnapshotInverse,
  StoredCommandInverse,
  StoredOperationUndoInverse,
} from './stored-inverses';

export interface CharacterCommandPreviewWarning {
  readonly code: 'armor_class_reduced';
  readonly message: string;
  readonly item_name: string;
  readonly previous_armor_class: number;
  readonly new_armor_class: number;
}

export interface CharacterCommandResult {
  readonly inverse: StoredCharacterInverse;
  readonly operation_uuid: string;
  readonly revision: number;
  readonly idempotent_replay: boolean;
  /**
   * Ephemeral facts requiring a before/after pair. They are deliberately
   * absent on idempotent replay: no warning state is persisted or reconstructed.
   */
  readonly preview_warnings?: readonly CharacterCommandPreviewWarning[];
}

export interface CharacterCommandExecutorOptions {
  readonly factory?: CharacterCommandFactory;
  readonly state?: CharacterState;
  readonly audit?: CharacterAuditWriter;
  readonly clock?: () => string;
  readonly randomUuid?: () => string;
}

export interface CharacterCommandRpcResult {
  readonly operation_uuid: string;
  readonly revision: number;
  readonly idempotent_replay: boolean;
  readonly preview_warnings?: readonly CharacterCommandPreviewWarning[];
}

export type UndoCharacterOperationRefusalReason =
  | 'character_not_found'
  | 'character_archived'
  | 'operation_not_found'
  | 'operation_character_mismatch'
  | 'revision_mismatch'
  | 'operation_not_latest'
  | 'legacy_operation';

export type UndoCharacterOperationResult =
  | ({ readonly status: 'applied' } & CharacterCommandRpcResult)
  | {
      readonly status: 'refused';
      readonly reason: UndoCharacterOperationRefusalReason;
      readonly current_revision: number | null;
    };

export type RestoreCharacterSavePointRefusalReason =
  | 'character_not_found'
  | 'character_archived'
  | 'save_point_not_found'
  | 'save_point_character_mismatch'
  | 'revision_mismatch';

export type RestoreCharacterSavePointResult =
  | ({ readonly status: 'applied' } & CharacterCommandRpcResult)
  | {
      readonly status: 'refused';
      readonly reason: RestoreCharacterSavePointRefusalReason;
      readonly current_revision: number | null;
    };

interface OperationRow {
  readonly character_id: number;
  readonly inverse_command: string | null;
  readonly resulting_revision: number;
}

/**
 * `inverse_command` is nullable TEXT: a command with no inverse stores NULL, and
 * `parseInverse` is the one place that turns the absence into a refusal. The
 * columns were `unknown` before, which named them without saying anything about
 * what they hold.
 */
const operationRow: RowCodec<OperationRow> = (row) => ({
  character_id: sqlInteger(row, 'character_id'),
  inverse_command: sqlNullableString(row, 'inverse_command'),
  resulting_revision: sqlInteger(row, 'resulting_revision'),
});

type SnapshotRow = Readonly<Record<string, unknown>>;

const systemClock = () => new Date().toISOString();

function parseInverse(value: unknown): unknown {
  if (typeof value !== 'string') {
    throw new Error('Stored inverse command is invalid.');
  }
  return JSON.parse(value) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storedFlavorInverse(
  value: unknown,
): StoredCharacterFlavorInverse | null {
  if (
    !isRecord(value) ||
    value.type !== 'internal_flavor_restore'
  ) {
    return null;
  }
  const allowed = new Set([
    'type',
    'alignment',
    'appearance',
    'backstory',
    'notes',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('Stored character flavor inverse is invalid.');
  }
  const fields = ['alignment', 'appearance', 'backstory', 'notes'] as const;
  for (const field of fields) {
    if (
      !Object.hasOwn(value, field) ||
      (value[field] !== null && typeof value[field] !== 'string')
    ) {
      throw new Error('Stored character flavor inverse is invalid.');
    }
  }
  return {
    type: 'internal_flavor_restore',
    alignment: value.alignment as string | null,
    appearance: value.appearance as string | null,
    backstory: value.backstory as string | null,
    notes: value.notes as string | null,
  };
}

function storedSnapshotInverse(
  value: unknown,
): StoredCharacterSnapshotInverse | null {
  if (!isRecord(value) || value.type !== 'internal_snapshot_restore') {
    return null;
  }
  if (
    Object.keys(value).some((key) => !['type', 'snapshot'].includes(key)) ||
    !isRecord(value.snapshot)
  ) {
    throw new Error('Stored snapshot inverse is invalid.');
  }
  return {
    type: 'internal_snapshot_restore',
    snapshot: value.snapshot,
  };
}

function isLegacyStoredCommand(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    (
      value.type === 'update_character_flavor' &&
      value.mode === 'restore'
    ) ||
    value.type === 'restore_snapshot'
  );
}

interface DecodedStoredOperationUndoEnvelope {
  readonly type: 'internal_operation_undo';
  readonly action: 'undo' | 'redo';
  readonly target_operation_uuid: string;
  readonly command: Record<string, unknown>;
}

function storedOperationUndoEnvelope(
  value: unknown,
): DecodedStoredOperationUndoEnvelope | null {
  if (!isRecord(value) || value.type !== 'internal_operation_undo') {
    return null;
  }
  if (
    Object.keys(value).some((key) => ![
      'type',
      'action',
      'target_operation_uuid',
      'command',
    ].includes(key)) ||
    (value.action !== 'undo' && value.action !== 'redo') ||
    typeof value.target_operation_uuid !== 'string' ||
    !isRecord(value.command) ||
    value.command.type === 'internal_operation_undo'
  ) {
    throw new Error('Stored operation undo inverse is invalid.');
  }
  return {
    type: 'internal_operation_undo',
    action: value.action,
    target_operation_uuid: value.target_operation_uuid,
    command: value.command,
  };
}

const storedPayloadValidator = new CharacterCommandPayloadValidator();

function storedCommandInverse(value: unknown): StoredCommandInverse {
  const flavor = storedFlavorInverse(value);
  if (flavor !== null) return flavor;
  const snapshot = storedSnapshotInverse(value);
  if (snapshot !== null) return snapshot;
  return storedPayloadValidator.validate(value);
}

function storedCharacterInverse(value: unknown): StoredCharacterInverse {
  const envelope = storedOperationUndoEnvelope(value);
  if (envelope === null) return storedCommandInverse(value);
  if (isLegacyStoredCommand(envelope.command)) {
    throw new Error('Stored operation undo inverse is legacy.');
  }
  return {
    ...envelope,
    command: storedCommandInverse(envelope.command),
  };
}

export function characterCommandRpcResult(
  result: CharacterCommandResult,
): CharacterCommandRpcResult {
  return {
    operation_uuid: result.operation_uuid,
    revision: result.revision,
    idempotent_replay: result.idempotent_replay,
    ...(result.preview_warnings === undefined
      ? {}
      : { preview_warnings: result.preview_warnings }),
  };
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
    selection_acquired_at_class_level:
      row.selection_acquired_at_class_level === null
        ? null
        : Number(row.selection_acquired_at_class_level),
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
  prepared: StoredCommandInverse,
): StoredCommandInverse {
  if (!resolvesInverseAfterApply(command)) {
    return prepared;
  }
  const resolver: ResolvesInverseAfterApply = command;
  return resolver.inverse();
}

function snapshotJson(snapshot: CharacterStateSnapshot): JsonObject {
  return snapshot as unknown as JsonObject;
}

function armorClassReductionWarnings(
  payload: CharacterCommandPayload,
  previousArmorClass: number,
  newArmorClass: number,
): CharacterCommandPreviewWarning[] {
  if (
    payload.type !== 'set_armor' ||
    payload.armor === null ||
    newArmorClass >= previousArmorClass
  ) {
    return [];
  }
  return [{
    code: 'armor_class_reduced',
    message:
      `Equipping ${payload.armor.name} reduces Armor Class from ` +
      `${String(previousArmorClass)} to ${String(newArmorClass)}.`,
    item_name: payload.armor.name,
    previous_armor_class: previousArmorClass,
    new_armor_class: newArmorClass,
  }];
}

export class CharacterCommandExecutor {
  readonly #preflight: CharacterCommandPreflight;
  readonly #state: CharacterState;
  readonly #audit: CharacterAuditWriter;
  readonly #clock: () => string;
  readonly #randomUuid: () => string;

  constructor(
    private readonly db: DatabaseContext,
    private readonly integrity: CharacterCommandIntegrity,
    options: CharacterCommandExecutorOptions = {},
  ) {
    this.#state = options.state ?? new CharacterState(db);
    this.#preflight = new CharacterCommandPreflight(db, integrity, {
      ...(options.factory === undefined ? {} : { factory: options.factory }),
    });
    this.#audit =
      options.audit ?? new CharacterAuditLog(db, this.#state);
    this.#clock = options.clock ?? systemClock;
    this.#randomUuid = options.randomUuid ?? (() => crypto.randomUUID());
  }

  async execute(
    request: CharacterCommandRequest,
  ): Promise<CharacterCommandResult> {
    const replay = this.replay(request.character_id, request.operation_uuid);
    if (replay !== null) {
      return replay;
    }

    const { payload, command } = await this.#preflight.prepare(request);
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

  async undo(
    request: UndoCharacterOperationRequest,
  ): Promise<UndoCharacterOperationResult> {
    const replay = this.replayUndo(request);
    if (replay !== null) return replay;
    const authorized = this.authorizeUndo(request);
    if (authorized.status === 'refused') return authorized;

    const stored = parseInverse(authorized.inverse_command);
    const envelope = storedOperationUndoEnvelope(stored);
    const storedCommand = envelope?.command ?? stored;
    if (isLegacyStoredCommand(storedCommand)) {
      return {
        status: 'refused',
        reason: 'legacy_operation',
        current_revision: request.expected_revision,
      };
    }
    const commandInverse = storedCommandInverse(storedCommand);
    const flavor = storedFlavorInverse(commandInverse);
    const operationUuid = this.#randomUuid();
    if (flavor !== null) {
      return this.db.transaction(() => {
        const current = this.authorizeUndo(request);
        if (current.status === 'refused') return current;
        const result = this.recordUndoEnvelope(
          this.commitStoredFlavorUndo(request, operationUuid, flavor),
          current.action,
          request.operation_uuid,
        );
        return {
          status: 'applied' as const,
          ...characterCommandRpcResult(result),
        };
      });
    }

    const snapshot = storedSnapshotInverse(commandInverse);
    if (snapshot !== null) {
      return this.db.transaction(() => {
        const current = this.authorizeUndo(request);
        if (current.status === 'refused') return current;
        const result = this.recordUndoEnvelope(
          this.commitStoredSnapshot(
            request.character_id,
            request.expected_revision,
            operationUuid,
            snapshot,
          ),
          current.action,
          request.operation_uuid,
        );
        return {
          status: 'applied' as const,
          ...characterCommandRpcResult(result),
        };
      });
    }

    const { payload, command } = await this.#preflight.preparePayload(
      request.character_id,
      commandInverse,
    );
    const executionRequest: CharacterCommandRequest = {
      character_id: request.character_id,
      operation_uuid: operationUuid,
      expected_revision: request.expected_revision,
      command: payload,
    };
    const before = this.#state.capture(request.character_id);
    const inverse = await this.prepareInverse(
      request.character_id,
      payload,
      before,
    );
    return this.db.transaction(() => {
      const current = this.authorizeUndo(request);
      if (current.status === 'refused') return current;
      const result = this.recordUndoEnvelope(
        this.commit(executionRequest, payload, command, before, inverse),
        current.action,
        request.operation_uuid,
      );
      return {
        status: 'applied' as const,
        ...characterCommandRpcResult(result),
      };
    });
  }

  restoreSavePoint(
    request: RestoreCharacterSavePointRequest,
  ): RestoreCharacterSavePointResult {
    return this.db.transaction(() => {
      const authorized = this.authorizeSavePointRestore(request);
      if (authorized.status === 'refused') return authorized;
      const parsed: unknown = JSON.parse(authorized.snapshot);
      const snapshot = storedSnapshotInverse({
        type: 'internal_snapshot_restore',
        snapshot: parsed,
      });
      if (snapshot === null) {
        throw new Error('Stored save-point snapshot is invalid.');
      }
      const result = this.commitStoredSnapshot(
        request.character_id,
        request.expected_revision,
        this.#randomUuid(),
        snapshot,
      );
      return {
        status: 'applied',
        ...characterCommandRpcResult(result),
      };
    });
  }

  private commit(
    request: CharacterCommandRequest,
    payload: CharacterCommandPayload,
    command: ConstructedCharacterCommand,
    before: CharacterStateSnapshot,
    inverse: StoredCommandInverse,
  ): CharacterCommandResult {
    const replay = this.replay(request.character_id, request.operation_uuid);
    if (replay !== null) {
      return replay;
    }

    this.#preflight.assertExpectedRevision(request, payload);
    const currentRevision = this.#preflight.currentRevision(
      request.character_id,
    );

    // D76: the warning is a PREVIEW, not persisted character state. Resolve
    // against the current equipment, apply the pending equip below, then resolve
    // again in the same transaction. Clearing a slot is not equipping an item.
    const previousArmorClass =
      payload.type === 'set_armor' && payload.armor !== null
        ? new CharacterSheetBuilder(this.db).armorClassValue(
            request.character_id,
          )
        : null;
    this.applySynchronously(request.character_id, payload, command);
    const previewWarnings: CharacterCommandPreviewWarning[] =
      previousArmorClass === null
        ? []
        : armorClassReductionWarnings(
            payload,
            previousArmorClass,
            new CharacterSheetBuilder(this.db).armorClassValue(
              request.character_id,
            ),
          );
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
      operation_uuid: request.operation_uuid,
      revision: nextRevision,
      idempotent_replay: false,
      ...(previewWarnings.length === 0
        ? {}
        : { preview_warnings: previewWarnings }),
    };
  }

  private replay(
    characterId: number,
    operationUuid: string,
  ): CharacterCommandResult | null {
    const operation = this.db.one(
      `SELECT character_id, inverse_command, resulting_revision
       FROM character_operations
       WHERE operation_uuid = ?`,
      [operationUuid],
      operationRow,
    );
    if (operation === null) {
      return null;
    }
    if (operation.character_id !== characterId) {
      throw new RevisionConflict(this.currentRevisionOrZero(characterId));
    }
    return {
      inverse: storedCharacterInverse(parseInverse(operation.inverse_command)),
      operation_uuid: operationUuid,
      revision: this.#preflight.currentRevision(characterId),
      idempotent_replay: true,
    };
  }

  private currentRevisionOrZero(characterId: number): number {
    return Number(
      this.db.scalar(
        'SELECT revision FROM characters WHERE id = ?',
        [characterId],
      ) ?? 0,
    );
  }

  private async prepareInverse(
    characterId: number,
    payload: CharacterCommandPayload,
    before: CharacterStateSnapshot,
  ): Promise<StoredCommandInverse> {
    switch (payload.type) {
      // Provisional only: `UpdateAbilityCommand.invertsAfterApply` replaces
      // this with a snapshot when the first workspace edit also changes the
      // allocation signal, or with this precise payload for later edits.
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
      case 'update_character_flavor':
        return {
          type: 'internal_flavor_restore',
          alignment: sqlNullableString(before.character, 'alignment'),
          appearance: sqlNullableString(before.character, 'appearance'),
          backstory: sqlNullableString(before.character, 'backstory'),
          notes: sqlNullableString(before.character, 'notes'),
        };
      case 'acknowledge_warning':
        return this.warningInverse(characterId, payload, before);
      // The PRECISE inverse: the same command with the selection the write
      // displaces, read from the before-snapshot (`character_skill_grants` is
      // snapshot-scoped since a7-v9) — so undo of a fill is a clear, undo of
      // a clear restores the fill, and undoing a skill choice cannot disturb
      // anything else. A grant absent from the snapshot echoes the payload
      // provisionally, exactly like the sheet-input commands: `apply()` will
      // refuse with the named `grant_not_found` and nothing is ever stored.
      case 'fill_skill_grant': {
        const grant = before.character_skill_grants.find(
          (row) => Number(row.id) === payload.grant_id,
        );
        if (grant === undefined) {
          return payload;
        }
        const prior = grant.skill;
        if (prior !== null && !isEnumValue(skills, prior)) {
          // Unreachable past the schema CHECK; a throw beats storing an
          // inverse that would "restore" a value the vocabulary rejects.
          throw new TypeError(`Unknown stored skill '${String(prior)}'.`);
        }
        return {
          type: 'fill_skill_grant',
          grant_id: payload.grant_id,
          skill: prior,
        };
      }
      case 'add_weapon':
      case 'update_weapon':
      case 'remove_weapon':
      case 'set_weapon_mastery':
      case 'add_item':
      case 'update_item':
      case 'remove_item':
      case 'attune_item':
      case 'unattune_item':
      case 'replace_attuned_item':
      case 'restore_attunement_slot':
      // The sheet-input writers join them: each captures the value it
      // displaced during `apply()`, which `prepareInverse` runs too early to
      // see. `character_armor` and the other three ARE snapshot tables, unlike
      // `character_weapons` — the explicit inverse is kept anyway because it is
      // strictly more precise than a whole-character snapshot, and undoing an
      // armour change must not disturb a spell selection made in between.
      case 'set_armor':
      case 'set_hit_point_roll':
        // PROVISIONAL AND NEVER STORED. These resolve their inverse after
        // apply (see `commit`). Echoing the payload rather than guessing a
        // plausible inverse means that if the resolution ever stops happening,
        // undo visibly repeats the action instead of quietly doing something
        // almost right.
        return payload;
      // `allocate_abilities` is PINNED to a snapshot inverse (plan §3.1): root
      // columns come back only through a snapshot whose projection includes
      // them, and `ability_allocation_method` is in `CHARACTER_STATE_COLUMNS`,
      // so undo restores the allocation signal WITH the six scores.
      // A first `update_ability` now resolves the same issue after apply with
      // a snapshot inverse; later edits keep their precise one-field inverse.
      // `level_up_class` is PINNED to a snapshot inverse (level-up plan
      // §8b): the write moves the level row, feat occurrence/effect rows,
      // grants and source instances together, and a field-by-field inverse
      // cannot express that set.
      case 'allocate_abilities':
      case 'update_source_config':
      case 'add_source':
      case 'remove_source':
      case 'update_class':
      case 'level_up_class':
      case 'resolve_level_feat_choice':
        return {
          type: 'internal_snapshot_restore',
          snapshot: snapshotJson(before),
        };
    }
  }

  private authorizeUndo(
    request: UndoCharacterOperationRequest,
  ):
    | {
        readonly status: 'authorized';
        readonly action: 'undo' | 'redo';
        readonly inverse_command: string;
      }
    | Extract<UndoCharacterOperationResult, { status: 'refused' }> {
    const character = this.db.oneRaw(
      'SELECT revision, archived_at FROM characters WHERE id = ?',
      [request.character_id],
    );
    if (character === null) {
      return {
        status: 'refused',
        reason: 'character_not_found',
        current_revision: null,
      };
    }
    const currentRevision = Number(character.revision);
    if (character.archived_at !== null) {
      return {
        status: 'refused',
        reason: 'character_archived',
        current_revision: currentRevision,
      };
    }
    const operation = this.db.oneRaw(
      `SELECT character_id, inverse_command, resulting_revision
       FROM character_operations
       WHERE operation_uuid = ?`,
      [request.operation_uuid],
    );
    if (operation === null) {
      return {
        status: 'refused',
        reason: 'operation_not_found',
        current_revision: currentRevision,
      };
    }
    if (Number(operation.character_id) !== request.character_id) {
      return {
        status: 'refused',
        reason: 'operation_character_mismatch',
        current_revision: currentRevision,
      };
    }
    if (request.expected_revision !== currentRevision) {
      return {
        status: 'refused',
        reason: 'revision_mismatch',
        current_revision: currentRevision,
      };
    }
    // The authorization fact is persisted on the target operation itself.
    // Logical stack reconstruction cannot substitute for this comparison: a
    // compensation write advances the character and makes every older row
    // ineligible, even when a reconstructed stack would put one on top.
    if (Number(operation.resulting_revision) !== currentRevision) {
      return {
        status: 'refused',
        reason: 'operation_not_latest',
        current_revision: currentRevision,
      };
    }
    if (typeof operation.inverse_command !== 'string') {
      throw new Error('Stored inverse command is invalid.');
    }
    const envelope = storedOperationUndoEnvelope(
      parseInverse(operation.inverse_command),
    );
    const action = envelope?.action === 'undo' ? 'redo' : 'undo';
    return {
      status: 'authorized',
      action,
      inverse_command: operation.inverse_command,
    };
  }

  private authorizeSavePointRestore(
    request: RestoreCharacterSavePointRequest,
  ):
    | { readonly status: 'authorized'; readonly snapshot: string }
    | Extract<RestoreCharacterSavePointResult, { status: 'refused' }> {
    const character = this.db.oneRaw(
      'SELECT revision, archived_at FROM characters WHERE id = ?',
      [request.character_id],
    );
    if (character === null) {
      return {
        status: 'refused',
        reason: 'character_not_found',
        current_revision: null,
      };
    }
    const currentRevision = Number(character.revision);
    if (character.archived_at !== null) {
      return {
        status: 'refused',
        reason: 'character_archived',
        current_revision: currentRevision,
      };
    }
    const point = this.db.oneRaw(
      `SELECT character_id, snapshot
       FROM character_save_points
       WHERE id = ?`,
      [request.save_point_id],
    );
    if (point === null) {
      return {
        status: 'refused',
        reason: 'save_point_not_found',
        current_revision: currentRevision,
      };
    }
    if (Number(point.character_id) !== request.character_id) {
      return {
        status: 'refused',
        reason: 'save_point_character_mismatch',
        current_revision: currentRevision,
      };
    }
    if (request.expected_revision !== currentRevision) {
      return {
        status: 'refused',
        reason: 'revision_mismatch',
        current_revision: currentRevision,
      };
    }
    if (typeof point.snapshot !== 'string') {
      throw new Error('Stored save-point snapshot is invalid.');
    }
    return { status: 'authorized', snapshot: point.snapshot };
  }

  private replayUndo(
    request: UndoCharacterOperationRequest,
  ): UndoCharacterOperationResult | null {
    const revision = this.db.scalar(
      'SELECT revision FROM characters WHERE id = ?',
      [request.character_id],
    );
    if (revision === null) return null;
    const latest = this.db.oneRaw(
      `SELECT operation_uuid, expected_revision, resulting_revision,
              inverse_command
       FROM character_operations
       WHERE character_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [request.character_id],
    );
    if (
      latest === null ||
      Number(latest.expected_revision) !== request.expected_revision ||
      Number(latest.resulting_revision) !== Number(revision) ||
      typeof latest.operation_uuid !== 'string' ||
      typeof latest.inverse_command !== 'string'
    ) {
      return null;
    }
    const envelope = storedOperationUndoEnvelope(
      parseInverse(latest.inverse_command),
    );
    if (envelope?.target_operation_uuid !== request.operation_uuid) {
      return null;
    }
    return {
      status: 'applied',
      operation_uuid: latest.operation_uuid,
      revision: Number(revision),
      idempotent_replay: true,
    };
  }

  private recordUndoEnvelope(
    result: CharacterCommandResult,
    action: 'undo' | 'redo',
    targetOperationUuid: string,
  ): CharacterCommandResult {
    if (result.inverse.type === 'internal_operation_undo') {
      throw new Error('An operation undo inverse cannot be nested.');
    }
    const command: StoredCommandInverse = result.inverse;
    const envelope: StoredOperationUndoInverse = {
      type: 'internal_operation_undo',
      action,
      target_operation_uuid: targetOperationUuid,
      command,
    };
    const updated = this.db.exec(
      `UPDATE character_operations
       SET inverse_command = ?
       WHERE operation_uuid = ?`,
      [JSON.stringify(envelope), result.operation_uuid],
    );
    if (updated.changes !== 1) {
      throw new Error('The operation undo inverse was not stored.');
    }
    return { ...result, inverse: envelope };
  }

  private commitStoredFlavorUndo(
    request: UndoCharacterOperationRequest,
    operationUuid: string,
    flavor: StoredCharacterFlavorInverse,
  ): CharacterCommandResult {
    const before = this.#state.capture(request.character_id);
    const inverse: StoredCharacterFlavorInverse = {
      type: 'internal_flavor_restore',
      alignment: sqlNullableString(before.character, 'alignment'),
      appearance: sqlNullableString(before.character, 'appearance'),
      backstory: sqlNullableString(before.character, 'backstory'),
      notes: sqlNullableString(before.character, 'notes'),
    };
    const timestamp = this.#clock();
    applyStoredCharacterFlavorInverse(
      this.db,
      request.character_id,
      flavor,
      timestamp,
    );
    const nextRevision = request.expected_revision + 1;
    this.db.exec(
      'UPDATE characters SET revision = ? WHERE id = ?',
      [nextRevision, request.character_id],
    );
    const after = this.#state.capture(request.character_id);
    this.#audit.append({
      characterId: request.character_id,
      operationUuid,
      actionType: 'update_character_flavor',
      reason: null,
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
        operationUuid,
        request.expected_revision,
        nextRevision,
        JSON.stringify(inverse),
        timestamp,
        timestamp,
      ],
    );
    return {
      inverse,
      operation_uuid: operationUuid,
      revision: nextRevision,
      idempotent_replay: false,
    };
  }

  private commitStoredSnapshot(
    characterId: number,
    expectedRevision: number,
    operationUuid: string,
    stored: StoredCharacterSnapshotInverse,
  ): CharacterCommandResult {
    const before = this.#state.capture(characterId);
    this.#state.restore(characterId, stored.snapshot);
    const inverse: StoredCharacterSnapshotInverse = {
      type: 'internal_snapshot_restore',
      snapshot: snapshotJson(before),
    };
    const nextRevision = expectedRevision + 1;
    const timestamp = this.#clock();
    this.db.exec(
      'UPDATE characters SET revision = ?, updated_at = ? WHERE id = ?',
      [nextRevision, timestamp, characterId],
    );
    const after = this.#state.capture(characterId);
    this.#audit.append({
      characterId,
      operationUuid,
      actionType: 'restore_snapshot',
      reason: null,
      before,
      after,
    });
    this.db.exec(
      `INSERT INTO character_operations (
         character_id, operation_uuid, expected_revision,
         resulting_revision, inverse_command, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        operationUuid,
        expectedRevision,
        nextRevision,
        JSON.stringify(inverse),
        timestamp,
        timestamp,
      ],
    );
    return {
      inverse,
      operation_uuid: operationUuid,
      revision: nextRevision,
      idempotent_replay: false,
    };
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
        rowId,
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
