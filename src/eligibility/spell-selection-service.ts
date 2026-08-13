import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableSpellSchoolList,
  sqlNullableString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  SpellSelectionEligibility,
  type EligibilitySlot,
} from './spell-selection-eligibility';
import { assignSpellSelection } from './spell-selection-assignment';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

interface SelectableSlot extends EligibilitySlot {
  isLocked: boolean;
}

function decodeSlot(row: SqlRow): SelectableSlot {
  return {
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
    allowed_spell_lists: sqlNullableString(
      row,
      'allowed_spell_lists',
    ),
    allowed_schools: sqlNullableSpellSchoolList(row, 'allowed_schools'),
    allowed_tags: sqlNullableString(row, 'allowed_tags'),
    selection_collection: sqlNullableString(
      row,
      'selection_collection',
    ),
    isLocked: sqlBoolean(row, 'is_locked'),
  };
}

export class SpellSelectionService {
  readonly #eligibility: SpellSelectionEligibility;

  constructor(
    private readonly db: DatabaseContext,
    eligibility?: SpellSelectionEligibility,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
  }

  select(slotId: number, spellVersionId: number): void {
    this.db.transaction((transaction) => {
      const slot = transaction.one(
        `SELECT slot.character_id, slot.fixed_spell_version_id,
                slot.current_spell_version_id, slot.spell_level_min,
                slot.spell_level_max, slot.allowed_spell_lists,
                slot.allowed_schools, slot.allowed_tags,
                slot.selection_collection, slot.is_locked
         FROM spell_selection_slots AS slot
         INNER JOIN character_source_instances AS source
           ON source.id = slot.source_instance_id
          AND source.character_id = slot.character_id
         WHERE slot.id = ?
           AND slot.state = 'active'
           AND source.state = ?`,
        [slotId, ACTIVE_SOURCE_INSTANCE_STATE],
        decodeSlot,
      );
      if (slot === null) {
        throw new Error(
          `Active spell selection slot ${slotId} does not exist.`,
        );
      }
      if (slot.isLocked) {
        throw new Error(
          `Spell selection slot ${slotId} is locked.`,
        );
      }

      assignSpellSelection(transaction, {
        address: { kind: 'slot_selection', id: slotId },
        character_id: slot.character_id,
        spell_version_id: spellVersionId,
        eligibility: this.#eligibility,
      });
    });
  }
}
