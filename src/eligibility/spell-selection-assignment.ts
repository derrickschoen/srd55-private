import {
  sqlBoolean,
  sqlInteger,
  sqlNullableSpellSchoolList,
  sqlNullableString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { SpellSelectionConstraint } from './spell-selection-constraint';
import { SpellSelectionEligibility } from './spell-selection-eligibility';
import {
  effectiveSelectionCollectionForSlot,
  evaluateSelectionCollectionConstraint,
  refreshWizardPreparationEligibility,
} from './spell-selection-collection';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

export type SpellSelectionAddress =
  | { readonly kind: 'slot_selection'; readonly id: number }
  | { readonly kind: 'spellbook_acquisition'; readonly id: number };

type AssignSpellSelectionInput = {
  readonly character_id: number;
  readonly spell_version_id: number;
  readonly now?: string;
  readonly eligibility?: SpellSelectionEligibility;
} & (
  | {
      readonly address: {
        readonly kind: 'slot_selection';
        readonly id: number;
      };
      readonly acquired_at_class_level?: number | null;
    }
  | {
      readonly address: {
        readonly kind: 'spellbook_acquisition';
        readonly id: number;
      };
      readonly acquired_at_class_level?: never;
    }
);

interface AssignableSelection {
  readonly character_id: number;
  readonly constraint: SpellSelectionConstraint;
  readonly locked: boolean;
}

function decodeConstraint(row: SqlRow): SpellSelectionConstraint {
  const lists = (column: string) => {
    const raw = sqlNullableString(row, column);
    if (raw === null) {
      return [];
    }
    const decoded: unknown = JSON.parse(raw);
    if (
      !Array.isArray(decoded) ||
      !decoded.every((item) => typeof item === 'string')
    ) {
      throw new TypeError(`${column} must contain a string list.`);
    }
    return decoded;
  };
  return {
    spell_level_min: sqlInteger(row, 'spell_level_min'),
    spell_level_max: sqlInteger(row, 'spell_level_max'),
    allowed_spell_lists: lists('allowed_spell_lists'),
    allowed_schools:
      sqlNullableSpellSchoolList(row, 'allowed_schools') ?? [],
    allowed_tags: lists('allowed_tags'),
    selection_collection: sqlNullableString(
      row,
      'selection_collection',
    ),
  };
}

function slotSelection(row: SqlRow): AssignableSelection {
  return {
    character_id: sqlInteger(row, 'character_id'),
    constraint: decodeConstraint(row),
    locked: sqlBoolean(row, 'is_locked'),
  };
}

function spellbookSelection(row: SqlRow): AssignableSelection {
  return {
    character_id: sqlInteger(row, 'character_id'),
    constraint: decodeConstraint(row),
    locked: false,
  };
}

function acquisitionClassLevel(
  db: DatabaseContext,
  sourceInstanceId: number,
): number | null {
  return db.scalar<number>(
    `SELECT level.level
     FROM character_source_instances AS source
     LEFT JOIN subclass_definitions AS subclass
       ON source.source_type = 'subclass'
      AND subclass.id = source.source_definition_id
     INNER JOIN character_class_levels AS level
       ON level.character_id = source.character_id
      AND level.class_definition_id = CASE source.source_type
        WHEN 'class' THEN source.source_definition_id
        WHEN 'subclass' THEN subclass.class_definition_id
      END
     WHERE source.id = ?`,
    [sourceInstanceId],
  );
}

/**
 * The one persisted assignment writer for generated spell choices.
 *
 * Callers differ only in address and transaction ownership. Validation,
 * eligibility state, kept-override clearing, and acquisition provenance are
 * written here together.
 */
export function assignSpellSelection(
  db: DatabaseContext,
  input: AssignSpellSelectionInput,
): void {
  const now = input.now ?? new Date().toISOString();
  const selection =
    input.address.kind === 'slot_selection'
      ? db.one(
          `SELECT slot.character_id, slot.spell_level_min,
                  slot.spell_level_max, slot.allowed_spell_lists,
                  slot.allowed_schools, slot.allowed_tags,
                  slot.selection_collection, slot.is_locked
           FROM spell_selection_slots AS slot
           INNER JOIN character_source_instances AS source
             ON source.id = slot.source_instance_id
            AND source.character_id = slot.character_id
           WHERE slot.id = ?
             AND slot.character_id = ?
             AND slot.state IN ('active', 'kept_override')
             AND source.state = ?`,
          [input.address.id, input.character_id, ACTIVE_SOURCE_INSTANCE_STATE],
          slotSelection,
        )
      : db.one(
          `SELECT entry.character_id, entry.spell_level_min,
                  entry.spell_level_max, entry.allowed_spell_lists,
                  entry.allowed_schools, entry.allowed_tags,
                  NULL AS selection_collection
           FROM wizard_spellbook_entries AS entry
           INNER JOIN character_source_instances AS source
             ON source.id = entry.source_instance_id
            AND source.character_id = entry.character_id
           WHERE entry.id = ?
             AND entry.character_id = ?
             AND entry.state = 'active'
             AND source.state = ?`,
          [input.address.id, input.character_id, ACTIVE_SOURCE_INSTANCE_STATE],
          spellbookSelection,
        );
  if (selection === null) {
    throw new Error(
      `Active ${input.address.kind.replaceAll('_', ' ')} ${input.address.id} does not exist for this character.`,
    );
  }
  if (selection.locked) {
    throw new Error(`Spell selection slot ${input.address.id} is locked.`);
  }

  const constraint = input.address.kind === 'slot_selection'
    ? {
        ...selection.constraint,
        selection_collection: effectiveSelectionCollectionForSlot(
          db,
          input.character_id,
          input.address.id,
        ),
      }
    : selection.constraint;
  const eligibility = evaluateSelectionCollectionConstraint(
    db,
    selection.character_id,
    constraint,
    input.spell_version_id,
    input.eligibility ?? new SpellSelectionEligibility(db),
  );
  if (eligibility.status !== 'valid') {
    throw new Error(
      eligibility.reason ?? 'Spell selection is not valid.',
    );
  }

  if (input.address.kind === 'slot_selection') {
    const sourceId = db.scalar<number>(
      'SELECT source_instance_id FROM spell_selection_slots WHERE id = ?',
      [input.address.id],
    );
    const acquiredAt =
      input.acquired_at_class_level !== undefined
        ? input.acquired_at_class_level
        : sourceId === null
          ? null
          : acquisitionClassLevel(db, sourceId);
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?,
           selection_eligibility = 'valid',
           selection_invalid_reason = NULL,
           selection_acquired_at_class_level = ?,
           state = CASE
             WHEN state = 'kept_override' THEN 'active'
             ELSE state
           END,
           override_note = NULL,
           updated_at = ?
       WHERE id = ? AND character_id = ?`,
      [
        input.spell_version_id,
        acquiredAt,
        now,
        input.address.id,
        input.character_id,
      ],
    );
    return;
  }

  const duplicate = db.scalar<number>(
    `SELECT id FROM wizard_spellbook_entries
     WHERE character_id = ? AND spell_version_id = ?
       AND state = 'active' AND id <> ?
     LIMIT 1`,
    [
      input.character_id,
      input.spell_version_id,
      input.address.id,
    ],
  );
  if (duplicate !== null) {
    throw new Error('That spell is already in this character’s spellbook.');
  }

  db.exec(
    `UPDATE wizard_spellbook_entries
     SET spell_version_id = ?,
         selection_eligibility = 'valid',
         selection_invalid_reason = NULL,
         updated_at = ?
     WHERE id = ? AND character_id = ?`,
    [
      input.spell_version_id,
      now,
      input.address.id,
      input.character_id,
    ],
  );
  refreshWizardPreparationEligibility(db, input.character_id, now);
}
