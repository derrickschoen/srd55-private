import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableSpellSchoolList,
  sqlNullableString,
  sqlSpellSchool,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  SelectionEligibility,
  SpellSchool,
} from '../domain/enums';
import {
  spellSelectionConstraint,
  type SpellSelectionConstraint,
  type StoredSpellSelectionConstraint,
} from './spell-selection-constraint';

export const eligibilityInvalidReasons = {
  inactive: 'Selected spell version is not active in the catalog.',
  legacy:
    'Enable legacy rules before selecting a 2014 spell version.',
  level: 'Selected spell is outside the slot level range.',
  list: 'Selected spell is not on an allowed spell list.',
  school: 'Selected spell does not have an allowed school.',
  tags: 'Selected spell does not have every required tag.',
} as const;

export interface SpellSelectionEvaluation {
  status: SelectionEligibility;
  reason: string | null;
}

export type EligibilityList = string | readonly string[] | null;
export type SchoolEligibilityList =
  | string
  | readonly SpellSchool[]
  | null;

export interface EligibilitySlot extends StoredSpellSelectionConstraint {
  character_id: number;
  fixed_spell_version_id: number | null;
  current_spell_version_id: number | null;
}

interface SpellVersion {
  id: number;
  spellIdentityId: number;
  rulesEdition: string;
  level: number;
  school: SpellSchool;
  isActive: boolean;
}

interface RefreshableSlot extends EligibilitySlot {
  selectionEligibility: SelectionEligibility;
  selectionInvalidReason: string | null;
}

function decodeVersion(row: SqlRow): SpellVersion {
  return {
    id: sqlInteger(row, 'id'),
    spellIdentityId: sqlInteger(row, 'spell_identity_id'),
    rulesEdition: sqlString(row, 'rules_edition'),
    level: sqlInteger(row, 'level'),
    school: sqlSpellSchool(row, 'school'),
    isActive: sqlBoolean(row, 'is_active'),
  };
}

function decodeSlot(row: SqlRow): RefreshableSlot {
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
    allowed_spell_lists: sqlNullableString(row, 'allowed_spell_lists'),
    allowed_schools: sqlNullableSpellSchoolList(row, 'allowed_schools'),
    allowed_tags: sqlNullableString(row, 'allowed_tags'),
    selection_collection: sqlNullableString(row, 'selection_collection'),
    selectionEligibility:
      sqlString(row, 'selection_eligibility') as SelectionEligibility,
    selectionInvalidReason: sqlNullableString(
      row,
      'selection_invalid_reason',
    ),
  };
}

function invalid(reason: string): SpellSelectionEvaluation {
  return { status: 'invalid', reason };
}

export class SpellSelectionEligibility {
  constructor(private readonly db: DatabaseContext) {}

  evaluate(
    slot: EligibilitySlot,
    candidateSpellVersionId: number | null = null,
  ): SpellSelectionEvaluation {
    const spellVersionId =
      candidateSpellVersionId ??
      slot.fixed_spell_version_id ??
      slot.current_spell_version_id;
    if (spellVersionId === null) {
      return { status: 'unselected', reason: null };
    }
    return this.evaluateConstraint(
      slot.character_id,
      spellSelectionConstraint(slot),
      spellVersionId,
    );
  }

  evaluateConstraint(
    characterId: number,
    constraint: SpellSelectionConstraint,
    spellVersionId: number,
  ): SpellSelectionEvaluation {
    const version = this.db.one(
      `SELECT id, spell_identity_id, rules_edition, level, school, is_active
       FROM spell_versions
       WHERE id = ?`,
      [spellVersionId],
      decodeVersion,
    );
    if (version === null || !version.isActive) {
      return invalid(eligibilityInvalidReasons.inactive);
    }

    const legacyAllowed =
      Number(
        this.db.scalar(
          'SELECT allow_legacy FROM characters WHERE id = ?',
          [characterId],
        ) ?? 0,
      ) === 1;
    if (version.rulesEdition === '2014' && !legacyAllowed) {
      return invalid(eligibilityInvalidReasons.legacy);
    }

    const minimumLevel = constraint.spell_level_min;
    const maximumLevel = constraint.spell_level_max;
    if (
      version.level < minimumLevel ||
      version.level > maximumLevel
    ) {
      return invalid(eligibilityInvalidReasons.level);
    }

    const lists = constraint.allowed_spell_lists;
    if (lists.length > 0) {
      const placeholders = lists.map(() => '?').join(', ');
      const directMembership =
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1
               FROM spell_list_memberships
               WHERE spell_version_id = ?
                 AND spell_list_key IN (${placeholders})
             )`,
            [version.id, ...lists],
          ) ?? 0,
        ) === 1;
      const identityMembership =
        version.rulesEdition === '2014' &&
        legacyAllowed &&
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1
               FROM spell_list_memberships AS membership
               INNER JOIN spell_versions AS listed
                 ON listed.id = membership.spell_version_id
               WHERE listed.spell_identity_id = ?
                 AND membership.spell_list_key IN (${placeholders})
             )`,
            [version.spellIdentityId, ...lists],
          ) ?? 0,
        ) === 1;
      if (!directMembership && !identityMembership) {
        return invalid(eligibilityInvalidReasons.list);
      }
    }

    const schools = constraint.allowed_schools;
    if (schools.length > 0 && !schools.includes(version.school)) {
      return invalid(eligibilityInvalidReasons.school);
    }

    const requiredTags = constraint.allowed_tags;
    if (requiredTags.length > 0) {
      const placeholders = requiredTags.map(() => '?').join(', ');
      const matchedTags = Number(
        this.db.scalar(
          `SELECT count(DISTINCT tag)
           FROM spell_version_tags
           WHERE spell_version_id = ?
             AND tag IN (${placeholders})`,
          [version.id, ...requiredTags],
        ) ?? 0,
      );
      if (matchedTags !== new Set(requiredTags).size) {
        return invalid(eligibilityInvalidReasons.tags);
      }
    }

    if (constraint.selection_collection !== null) {
      throw new Error(
        `Unsupported selection collection '${constraint.selection_collection}'.`,
      );
    }

    return { status: 'valid', reason: null };
  }

  refresh(slotId: number): void {
    const slot = this.db.one(
      `SELECT character_id, fixed_spell_version_id,
              current_spell_version_id, spell_level_min, spell_level_max,
              allowed_spell_lists, allowed_schools, allowed_tags,
              selection_collection, selection_eligibility,
              selection_invalid_reason
       FROM spell_selection_slots
       WHERE id = ?`,
      [slotId],
      decodeSlot,
    );
    if (slot === null) {
      return;
    }

    const result = this.evaluate(slot);
    if (
      slot.selectionEligibility === result.status &&
      slot.selectionInvalidReason === result.reason
    ) {
      return;
    }

    this.db.exec(
      `UPDATE spell_selection_slots
       SET selection_eligibility = ?,
           selection_invalid_reason = ?,
           updated_at = ?
       WHERE id = ?`,
      [result.status, result.reason, new Date().toISOString(), slotId],
    );
  }

  refreshSpellbookAcquisition(
    entryId: number,
    updatedAt = new Date().toISOString(),
  ): void {
    const acquisition = this.db.one(
      `SELECT character_id, NULL AS fixed_spell_version_id,
              spell_version_id AS current_spell_version_id,
              spell_level_min, spell_level_max, allowed_spell_lists,
              allowed_schools, allowed_tags, NULL AS selection_collection,
              selection_eligibility, selection_invalid_reason
       FROM wizard_spellbook_entries
       WHERE id = ?`,
      [entryId],
      decodeSlot,
    );
    if (acquisition === null) {
      return;
    }

    const result = this.evaluate(acquisition);
    if (
      acquisition.selectionEligibility === result.status &&
      acquisition.selectionInvalidReason === result.reason
    ) {
      return;
    }

    this.db.exec(
      `UPDATE wizard_spellbook_entries
       SET selection_eligibility = ?,
           selection_invalid_reason = ?,
           updated_at = ?
       WHERE id = ?`,
      [result.status, result.reason, updatedAt, entryId],
    );
  }
}
