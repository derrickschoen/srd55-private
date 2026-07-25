import {
  sqlBoolean,
  sqlInteger,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { RulesEdition } from '../domain/enums';
import {
  SpellSelectionEligibility,
  type EligibilityList,
  type EligibilitySlot,
} from './spell-selection-eligibility';

export interface EligibleSpell {
  id: number;
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  edition: RulesEdition;
}

export class EligibleSpellSearchNotFoundError extends Error {
  readonly status = 404;

  constructor(characterId: number, slotId: number) {
    super(
      `Spell selection slot ${slotId} does not belong to character ${characterId}.`,
    );
    this.name = 'EligibleSpellSearchNotFoundError';
  }
}

function stringList(value: EligibilityList | undefined): string[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  if (Array.isArray(value)) {
    return [...value];
  }
  const decoded: unknown = JSON.parse(value as string);
  return Array.isArray(decoded) ? ([...decoded] as string[]) : [];
}

function decodeSlot(row: SqlRow): EligibilitySlot {
  const nullableString = (column: string): string | null => {
    const value = row[column];
    return value === null ? null : sqlString(row, column);
  };
  return {
    character_id: sqlInteger(row, 'character_id'),
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
    allowed_spell_lists: nullableString('allowed_spell_lists'),
    allowed_schools: nullableString('allowed_schools'),
    allowed_tags: nullableString('allowed_tags'),
    selection_collection: nullableString('selection_collection'),
  };
}

function decodeCandidate(row: SqlRow): EligibleSpell {
  return {
    id: sqlInteger(row, 'id'),
    name: sqlString(row, 'display_name'),
    level: sqlInteger(row, 'level'),
    school: sqlString(row, 'school'),
    ritual: sqlBoolean(row, 'ritual'),
    concentration: sqlBoolean(row, 'concentration'),
    edition: sqlString(row, 'rules_edition') as RulesEdition,
  };
}

interface CandidatePredicate {
  readonly clauses: readonly string[];
  readonly bindings: ReadonlyArray<string | number>;
}

export class EligibleSpellSearch {
  readonly #eligibility: SpellSelectionEligibility;

  constructor(
    private readonly db: DatabaseContext,
    eligibility?: SpellSelectionEligibility,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
  }

  search(
    characterId: number,
    slotId: number,
    query: string,
  ): EligibleSpell[] {
    const slot = this.#slot(characterId, slotId);
    const { clauses, bindings } = this.#candidatePredicate(
      characterId,
      slot,
      query,
    );

    const candidates = this.db.all(
      `SELECT version.id, version.display_name, version.level,
              version.school, version.ritual, version.concentration,
              version.rules_edition
       FROM spell_versions AS version
       WHERE ${clauses.join('\nAND ')}
       ORDER BY version.level, version.display_name, version.id
       LIMIT 50`,
      [...bindings],
      decodeCandidate,
    );

    return candidates.filter(
      (candidate) =>
        this.#eligibility.evaluate(slot, candidate.id).status ===
        'valid',
    );
  }

  // Whether `search` could offer anything for this slot. It runs the SQL
  // predicate alone, without the `evaluate` post-filter `search` applies;
  // `tests/integration/eligibility/has-any.test.ts` pins the two together.
  // The one place the post-filter can reject every candidate regardless of the
  // catalog is a `selection_collection` this build cannot resolve — `evaluate`
  // throws for those — so the answer there is a plain "nothing offerable".
  hasAny(characterId: number, slotId: number): boolean {
    const slot = this.#slot(characterId, slotId);
    if (
      slot.selection_collection !== null &&
      slot.selection_collection !== undefined
    ) {
      return false;
    }
    const { clauses, bindings } = this.#candidatePredicate(
      characterId,
      slot,
      '',
    );
    return (
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1
             FROM spell_versions AS version
             WHERE ${clauses.join('\nAND ')}
             LIMIT 1
           )`,
          [...bindings],
        ) ?? 0,
      ) === 1
    );
  }

  #slot(characterId: number, slotId: number): EligibilitySlot {
    const slot = this.db.one(
      `SELECT character_id, fixed_spell_version_id,
              current_spell_version_id, spell_level_min, spell_level_max,
              allowed_spell_lists, allowed_schools, allowed_tags,
              selection_collection
       FROM spell_selection_slots
       WHERE character_id = ? AND id = ?`,
      [characterId, slotId],
      decodeSlot,
    );
    if (slot === null) {
      throw new EligibleSpellSearchNotFoundError(characterId, slotId);
    }
    return slot;
  }

  #candidatePredicate(
    characterId: number,
    slot: EligibilitySlot,
    query: string,
  ): CandidatePredicate {
    const allowLegacy =
      Number(
        this.db.scalar(
          'SELECT allow_legacy FROM characters WHERE id = ?',
          [characterId],
        ) ?? 0,
      ) === 1;
    const lists = stringList(slot.allowed_spell_lists);
    const schools = stringList(slot.allowed_schools);
    const tags = stringList(slot.allowed_tags);

    const clauses = [
      'version.is_active = 1',
      'version.level BETWEEN ? AND ?',
    ];
    const bindings: Array<string | number> = [
      slot.spell_level_min ?? 0,
      slot.spell_level_max ?? 9,
    ];

    if (!allowLegacy) {
      clauses.push("version.rules_edition != '2014'");
    }
    if (query !== '') {
      clauses.push(
        'instr(lower(version.display_name), lower(?)) > 0',
      );
      bindings.push(query);
    }
    if (lists.length > 0) {
      const placeholders = lists.map(() => '?').join(', ');
      clauses.push(`(
        EXISTS (
          SELECT 1
          FROM spell_list_memberships AS direct_membership
          WHERE direct_membership.spell_version_id = version.id
            AND direct_membership.spell_list_key IN (${placeholders})
        )
        OR (
          version.rules_edition = '2014'
          AND EXISTS (
            SELECT 1
            FROM spell_list_memberships AS identity_membership
            INNER JOIN spell_versions AS listed_version
              ON listed_version.id = identity_membership.spell_version_id
            WHERE listed_version.spell_identity_id =
                  version.spell_identity_id
              AND identity_membership.spell_list_key
                  IN (${placeholders})
          )
        )
      )`);
      bindings.push(...lists, ...lists);
    }
    if (schools.length > 0) {
      clauses.push(
        `version.school IN (${schools.map(() => '?').join(', ')})`,
      );
      bindings.push(...schools);
    }
    for (const tag of tags) {
      clauses.push(`EXISTS (
        SELECT 1
        FROM spell_version_tags AS required_tag
        WHERE required_tag.spell_version_id = version.id
          AND required_tag.tag = ?
      )`);
      bindings.push(tag);
    }

    return { clauses, bindings };
  }
}
