import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../../db/codecs';
import type { DatabaseContext } from '../../db/database';
import type {
  SetSlotCommand as SetSlotPayload,
  SlotRestoreState,
} from '../../domain/command-contracts';
import type {
  SelectionEligibility,
  SlotState,
} from '../../domain/enums';
import { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import type { CharacterCommandIntegrity } from '../integrity';
import type { CommandClock } from '../update-ability';

export type SlotMode = SetSlotPayload['mode'];
export type SlotPayloadFor<Mode extends SlotMode> = Extract<
  SetSlotPayload,
  { mode: Mode }
>;
export type RestoreSlotPayload = SlotPayloadFor<'restore'>;
export type UnsignedRestoreSlotPayload = Omit<RestoreSlotPayload, 'integrity'>;

export interface StoredSlot {
  readonly id: number;
  readonly character_id: number;
  readonly fixed_spell_version_id: number | null;
  readonly current_spell_version_id: number | null;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly allowed_spell_lists: string | null;
  readonly allowed_schools: string | null;
  readonly allowed_tags: string | null;
  readonly selection_collection: string | null;
  readonly is_locked: boolean;
  readonly state: SlotState;
  readonly orphan_reason_code: string | null;
  readonly override_note: string | null;
  readonly selection_eligibility: SelectionEligibility;
  readonly selection_invalid_reason: string | null;
}

export type SlotUpdates = Partial<SlotRestoreState>;

const systemClock: CommandClock = () => new Date().toISOString();

function decodeSlot(row: SqlRow): StoredSlot {
  return {
    id: sqlInteger(row, 'id'),
    character_id: sqlInteger(row, 'character_id'),
    fixed_spell_version_id: sqlNullableInteger(
      row,
      'fixed_spell_version_id',
    ),
    current_spell_version_id: sqlNullableInteger(
      row,
      'current_spell_version_id',
    ),
    spell_level_min: sqlInteger(row, 'spell_level_min'),
    spell_level_max: sqlInteger(row, 'spell_level_max'),
    allowed_spell_lists: sqlNullableString(row, 'allowed_spell_lists'),
    allowed_schools: sqlNullableString(row, 'allowed_schools'),
    allowed_tags: sqlNullableString(row, 'allowed_tags'),
    selection_collection: sqlNullableString(row, 'selection_collection'),
    is_locked: sqlBoolean(row, 'is_locked'),
    state: sqlString(row, 'state') as SlotState,
    orphan_reason_code: sqlNullableString(row, 'orphan_reason_code'),
    override_note: sqlNullableString(row, 'override_note'),
    selection_eligibility: sqlString(
      row,
      'selection_eligibility',
    ) as SelectionEligibility,
    selection_invalid_reason: sqlNullableString(
      row,
      'selection_invalid_reason',
    ),
  };
}

export function previousSlotState(slot: StoredSlot): SlotRestoreState {
  return {
    current_spell_version_id: slot.current_spell_version_id,
    selection_eligibility: slot.selection_eligibility,
    selection_invalid_reason: slot.selection_invalid_reason,
    state: slot.state,
    override_note: slot.override_note,
  };
}

export abstract class SetSlotModeCommand<Mode extends SlotMode> {
  readonly actionType = 'set_slot';

  readonly #eligibility: SpellSelectionEligibility;
  #characterId: number | undefined;
  #previous: SlotRestoreState | undefined;

  constructor(
    protected readonly db: DatabaseContext,
    protected readonly payload: SlotPayloadFor<Mode>,
    private readonly integrity: CharacterCommandIntegrity,
    eligibility?: SpellSelectionEligibility,
    private readonly clock: CommandClock = systemClock,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
  }

  apply(characterId: number): void {
    const slot = this.db.one(
      `SELECT id, character_id, fixed_spell_version_id,
              current_spell_version_id, spell_level_min, spell_level_max,
              allowed_spell_lists, allowed_schools, allowed_tags,
              selection_collection, is_locked, state, orphan_reason_code,
              override_note, selection_eligibility,
              selection_invalid_reason
       FROM spell_selection_slots
       WHERE character_id = ? AND id = ?`,
      [characterId, this.payload.slot_id],
      decodeSlot,
    );
    if (slot === null) {
      throw new Error('Spell slot does not belong to this character.');
    }
    if (slot.is_locked) {
      throw new Error('This spell slot is locked.');
    }

    const previous = previousSlotState(slot);
    const next = { ...previous, ...this.updates(slot, this.#eligibility) };
    this.db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?,
           selection_eligibility = ?,
           selection_invalid_reason = ?,
           state = ?,
           override_note = ?,
           updated_at = ?
       WHERE character_id = ? AND id = ?`,
      [
        next.current_spell_version_id,
        next.selection_eligibility,
        next.selection_invalid_reason,
        next.state,
        next.override_note,
        this.clock(),
        characterId,
        slot.id,
      ],
    );

    this.#characterId = characterId;
    this.#previous = previous;
  }

  async inverse(): Promise<RestoreSlotPayload> {
    if (this.#characterId === undefined || this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }

    return this.integrity.attach(this.#characterId, {
      type: 'set_slot',
      slot_id: this.payload.slot_id,
      mode: 'restore',
      state: this.#previous,
    });
  }

  protected abstract updates(
    slot: StoredSlot,
    eligibility: SpellSelectionEligibility,
  ): SlotUpdates;
}
