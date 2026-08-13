import type { DatabaseContext } from '../db/database';
import {
  sqlInteger,
  sqlNullableSpellSchoolList,
  sqlNullableString,
} from '../db/codecs';
import {
  SpellSelectionEligibility,
  type SpellSelectionEvaluation,
} from './spell-selection-eligibility';
import {
  spellSelectionConstraint,
  type SpellSelectionConstraint,
} from './spell-selection-constraint';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

export const WIZARD_SPELLBOOK_COLLECTION = 'wizard_spellbook';
export const WIZARD_OUT_OF_BOOK_REASON =
  'Selected Wizard preparation is not in this character’s active spellbook.';

export interface SelectionCollectionPredicate {
  readonly sql: string;
  /**
   * `number | string`, not `number`: since R4 the predicate binds the source
   * state alongside the character id rather than writing `'active'` into the
   * SQL, where a typo would compile and silently match nothing.
   */
  readonly bindings: readonly (number | string)[];
}

export function supportedSelectionCollection(collection: string): boolean {
  return collection === WIZARD_SPELLBOOK_COLLECTION;
}

/**
 * The one definition of membership in a spell-selection collection.
 *
 * The candidate expression is supplied by the caller because search and
 * point evaluation use different surrounding statements. Everything that
 * makes a spellbook row mechanically live stays here: same character, exact
 * spell version, active acquisition, and, when present, an active owner.
 * Source-less legacy rows remain valid because there is no source to retcon.
 */
export function selectionCollectionPredicate(
  characterId: number,
  collection: string | null,
  candidateExpression: string,
): SelectionCollectionPredicate | null {
  if (collection === null) return null;
  switch (collection) {
    case WIZARD_SPELLBOOK_COLLECTION:
      return {
        sql: `EXISTS (
          SELECT 1
          FROM wizard_spellbook_entries AS collection_entry
          LEFT JOIN character_source_instances AS collection_source
            ON collection_source.id = collection_entry.source_instance_id
           AND collection_source.character_id = collection_entry.character_id
          WHERE collection_entry.character_id = ?
            AND collection_entry.spell_version_id = ${candidateExpression}
            AND collection_entry.state = 'active'
            AND (
              collection_entry.source_instance_id IS NULL
              OR collection_source.state = ?
            )
        )`,
        bindings: [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
      };
  }
  throw new Error(`Unsupported selection collection '${collection}'.`);
}

export function spellBelongsToSelectionCollection(
  db: DatabaseContext,
  characterId: number,
  collection: string,
  spellVersionId: number,
): boolean {
  const predicate = selectionCollectionPredicate(
    characterId,
    collection,
    'version.id',
  );
  if (predicate === null) return true;
  return Number(
    db.scalar(
      `SELECT EXISTS (
         SELECT 1 FROM spell_versions AS version
         WHERE version.id = ? AND ${predicate.sql}
       )`,
      [spellVersionId, ...predicate.bindings],
    ) ?? 0,
  ) === 1;
}

/**
 * Existing Wizard slots predate selection collections. Their durable rule and
 * bundled class identity are the stable discriminator, so they gain the same
 * constraint without rewriting a player's saved character.
 */
export function effectiveSelectionCollectionForSlot(
  db: DatabaseContext,
  characterId: number,
  slotId: number,
): string | null {
  const row = db.oneRaw(
    `SELECT slot.selection_collection, slot.rule_key,
            definition.content_key AS class_content_key
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
       ON source.id = slot.source_instance_id
      AND source.character_id = slot.character_id
     LEFT JOIN class_definitions AS definition
       ON source.source_type = 'class'
      AND definition.id = source.source_definition_id
     WHERE slot.character_id = ? AND slot.id = ?`,
    [characterId, slotId],
  );
  if (row === null) return null;
  const stored = sqlNullableString(row, 'selection_collection');
  if (stored !== null) return stored;
  return row.rule_key === 'wizard-prepared' &&
    row.class_content_key === '2024:class:wizard'
    ? WIZARD_SPELLBOOK_COLLECTION
    : null;
}

export function evaluateSelectionCollectionConstraint(
  db: DatabaseContext,
  characterId: number,
  constraint: SpellSelectionConstraint,
  spellVersionId: number,
  eligibility = new SpellSelectionEligibility(db),
): SpellSelectionEvaluation {
  const collection = constraint.selection_collection;
  const base = eligibility.evaluateConstraint(
    characterId,
    { ...constraint, selection_collection: null },
    spellVersionId,
  );
  if (base.status !== 'valid' || collection === null) return base;
  return spellBelongsToSelectionCollection(
    db,
    characterId,
    collection,
    spellVersionId,
  )
    ? base
    : { status: 'invalid', reason: WIZARD_OUT_OF_BOOK_REASON };
}

/** Refresh every Wizard preparation after a spellbook row changes. */
export function refreshWizardPreparationEligibility(
  db: DatabaseContext,
  characterId: number,
  updatedAt = new Date().toISOString(),
): void {
  const slots = db.all(
    `SELECT slot.id, slot.fixed_spell_version_id,
            slot.current_spell_version_id, slot.spell_level_min,
            slot.spell_level_max, slot.allowed_spell_lists,
            slot.allowed_schools, slot.allowed_tags,
            slot.selection_collection
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
       ON source.id = slot.source_instance_id
      AND source.character_id = slot.character_id
     INNER JOIN class_definitions AS definition
       ON source.source_type = 'class'
      AND definition.id = source.source_definition_id
     WHERE slot.character_id = ?
       AND slot.rule_key = 'wizard-prepared'
       AND slot.state IN ('active', 'kept_override')
       AND source.state = ?
       AND definition.content_key = '2024:class:wizard'
     ORDER BY slot.id`,
    [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
    (row) => ({
      id: sqlInteger(row, 'id'),
      fixed_spell_version_id:
        row.fixed_spell_version_id === null
          ? null
          : sqlInteger(row, 'fixed_spell_version_id'),
      current_spell_version_id:
        row.current_spell_version_id === null
          ? null
          : sqlInteger(row, 'current_spell_version_id'),
      spell_level_min: sqlInteger(row, 'spell_level_min'),
      spell_level_max: sqlInteger(row, 'spell_level_max'),
      allowed_spell_lists: sqlNullableString(row, 'allowed_spell_lists'),
      allowed_schools: sqlNullableSpellSchoolList(row, 'allowed_schools'),
      allowed_tags: sqlNullableString(row, 'allowed_tags'),
      selection_collection: WIZARD_SPELLBOOK_COLLECTION,
    }),
  );
  const eligibility = new SpellSelectionEligibility(db);
  for (const slot of slots) {
    const spellVersionId =
      slot.fixed_spell_version_id ?? slot.current_spell_version_id;
    const result = spellVersionId === null
      ? { status: 'unselected' as const, reason: null }
      : evaluateSelectionCollectionConstraint(
          db,
          characterId,
          spellSelectionConstraint(slot),
          spellVersionId,
          eligibility,
        );
    db.exec(
      `UPDATE spell_selection_slots
       SET selection_eligibility = ?, selection_invalid_reason = ?,
           updated_at = ?
       WHERE id = ?`,
      [result.status, result.reason, updatedAt, slot.id],
    );
  }
}
