import {
  sqlInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  isEnumValue,
  skillGrantStates,
  skills,
  type Skill,
  type SkillGrantState,
} from '../domain/enums';
import {
  CLASS_SKILL_GRANT_KEYS,
  SKILL_GRANT_KEYS,
  SKILL_GRANT_ORPHAN_REASONS,
  type ResolvedSkillGrants,
  type SkillGrantRow,
  type UnfilledClassSkillGrant,
} from '../builder/contracts';

/**
 * THE SKILL GRANTS — resolver, projection reconciler, and the generator's
 * class arm (plan `docs/design/2026-07-29-skills-with-provenance.md`).
 *
 * The source of truth for a character's skill proficiencies is
 * `character_skill_grants` (§3.2). `character_skill_proficiencies` survives as
 * a derived TRANSPORT PROJECTION whose sole DERIVING writer is
 * `rebuildSkillProjection` below. Three transport paths — snapshot restore,
 * backup import and share import — write the projection document-driven and
 * call the reconciler after restoring grants; nothing else may write it from
 * grants, and the sheet never reads it.
 */

const skillGrantRow: RowCodec<SkillGrantRow> = (row) => {
  const skill = sqlNullableString(row, 'skill');
  if (skill !== null && !isEnumValue(skills, skill)) {
    throw new TypeError(`Unknown stored skill '${skill}'.`);
  }
  const state = sqlString(row, 'state');
  if (!isEnumValue(skillGrantStates, state)) {
    throw new TypeError(`Unknown skill grant state '${state}'.`);
  }
  return {
    id: sqlInteger(row, 'id'),
    character_id: sqlInteger(row, 'character_id'),
    source_instance_id: sqlInteger(row, 'source_instance_id'),
    grant_key: sqlString(row, 'grant_key'),
    ordinal: sqlInteger(row, 'ordinal'),
    skill: skill as Skill | null,
    state: state as SkillGrantState,
    orphan_reason_code: sqlNullableString(row, 'orphan_reason_code'),
    orphaned_at: sqlNullableString(row, 'orphaned_at'),
  };
};

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * DISTINCT filled skills from ACTIVE grants — the sheet's read (§4 S-A exit).
 *
 * Deliberately not a read of the projection: S-DISTINCT's mutation is exactly
 * "make the sheet read the projection instead", and a stale projection must be
 * invisible here for grants to be the source of truth in fact rather than in
 * prose.
 */
export function activeGrantedSkills(
  db: DatabaseContext,
  characterId: number,
): Skill[] {
  return db
    .all(
      `SELECT DISTINCT skill FROM character_skill_grants
       WHERE character_id = ? AND state = 'active' AND skill IS NOT NULL
       ORDER BY skill`,
      [characterId],
      (row) => sqlString(row, 'skill'),
    )
    .filter((skill): skill is Skill => isEnumValue(skills, skill));
}

/**
 * THE ONE DERIVING WRITER of `character_skill_proficiencies` (§3.2).
 *
 * Reconciles rather than truncate-and-reinsert so an unchanged projection row
 * keeps its identity and timestamps — a snapshot diff of a no-op reconcile is
 * empty, which is what makes calling this on every grant-changing path cheap.
 */
export function rebuildSkillProjection(
  db: DatabaseContext,
  characterId: number,
): void {
  const now = timestamp();
  db.exec(
    `DELETE FROM character_skill_proficiencies
     WHERE character_id = ?
       AND skill NOT IN (
         SELECT skill FROM character_skill_grants
         WHERE character_id = ? AND state = 'active' AND skill IS NOT NULL
       )`,
    [characterId, characterId],
  );
  db.exec(
    `INSERT INTO character_skill_proficiencies
       (character_id, skill, created_at, updated_at)
     SELECT DISTINCT character_id, skill, ?, ?
     FROM character_skill_grants
     WHERE character_id = ? AND state = 'active' AND skill IS NOT NULL
       AND skill NOT IN (
         SELECT skill FROM character_skill_proficiencies
         WHERE character_id = ?
       )`,
    [now, now, characterId, characterId],
  );
}

interface ClassEntitlement {
  readonly grantKey: string;
  readonly count: number;
}

/**
 * What one class source is entitled to grant, from the structured columns S3
 * proved are seeded: `class_sheet_traits.skill_choice_count` for a STARTING
 * class, `multiclass_skill_choice_count`/`_pool` for an entered one (D44).
 *
 * A class with no traits row, or no `character_class_levels` row, is entitled
 * to nothing — an honest absence, not an error: homebrew classes carry no
 * structured entitlement, and D33 prefers a reported unknown to a guess.
 */
function classEntitlement(
  db: DatabaseContext,
  characterId: number,
  classDefinitionId: number,
): ClassEntitlement | null {
  const startingFlag = db.scalar<number>(
    `SELECT is_starting_class FROM character_class_levels
     WHERE character_id = ? AND class_definition_id = ?`,
    [characterId, classDefinitionId],
  );
  if (startingFlag === null) {
    return null;
  }
  const traits = db.oneRaw(
    `SELECT skill_choice_count, multiclass_skill_choice_count,
            multiclass_skill_choice_pool
     FROM class_sheet_traits
     WHERE class_definition_id = ?`,
    [classDefinitionId],
  );
  if (traits === null) {
    return null;
  }
  if (Number(startingFlag) === 1) {
    return {
      grantKey: SKILL_GRANT_KEYS.classSkill,
      count: Number(traits.skill_choice_count),
    };
  }
  return {
    grantKey: SKILL_GRANT_KEYS.multiclassSkill,
    count:
      String(traits.multiclass_skill_choice_pool) === 'none'
        ? 0
        : Number(traits.multiclass_skill_choice_count),
  };
}

function skillHeldByOtherActiveGrant(
  db: DatabaseContext,
  characterId: number,
  skill: string,
  excludingGrantId: number,
): boolean {
  return (
    Number(
      db.scalar(
        `SELECT EXISTS (
           SELECT 1 FROM character_skill_grants
           WHERE character_id = ? AND skill = ? AND state = 'active'
             AND id != ?
         )`,
        [characterId, skill, excludingGrantId],
      ) ?? 0,
    ) === 1
  );
}

export interface SkillGrantSource {
  readonly id: number;
  readonly characterId: number;
  readonly sourceType: string;
  readonly sourceDefinitionId: number | null;
}

/**
 * THE GENERATOR'S CLASS ARM — a SYNC/REVIVE keyed on
 * `(source_instance_id, grant_key, ordinal)`, mirroring `syncSlot` (§3.8).
 *
 * Creation MINTS unfilled grants; reactivation FLIPS the orphaned rows back to
 * `active` with their selection intact. A revived grant whose remembered skill
 * is already held by another ACTIVE grant revives UNFILLED — never a
 * mid-transaction throw, never a silent steal of the other source's skill.
 * The plan names an insert-shaped arm here as the single most likely dispatch
 * failure: it would violate the `(source, grant_key, ordinal)` unique index
 * inside the generator transaction on the ordinary remove-then-re-add path.
 *
 * SCOPED TO THE CLASS KEYS. This reconcile touches only the grants this arm
 * itself mints (`class_skill` / `multiclass_skill`): background and species
 * grants are minted by their producers under the same source instances, and a
 * desired-set reconcile over ALL keys would orphan them on every regeneration.
 */
export function syncClassSkillGrants(
  db: DatabaseContext,
  source: SkillGrantSource,
): void {
  const entitlement =
    source.sourceType === 'class' && source.sourceDefinitionId !== null
      ? classEntitlement(db, source.characterId, source.sourceDefinitionId)
      : null;
  const desired = new Set<string>();
  const grantKey = entitlement?.grantKey ?? null;
  for (let ordinal = 1; ordinal <= (entitlement?.count ?? 0); ordinal += 1) {
    desired.add(`${String(grantKey)}:${ordinal}`);
  }

  const classKeys = [...CLASS_SKILL_GRANT_KEYS];
  const existing = db.all(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE source_instance_id = ?
       AND grant_key IN (${classKeys.map(() => '?').join(', ')})
     ORDER BY grant_key, ordinal`,
    [source.id, ...classKeys],
    skillGrantRow,
  );
  const byIdentity = new Map(
    existing.map((row) => [`${row.grant_key}:${row.ordinal}`, row]),
  );

  for (const identity of desired) {
    const row = byIdentity.get(identity);
    if (row === undefined) {
      const ordinal = Number(identity.slice(identity.lastIndexOf(':') + 1));
      const now = timestamp();
      db.exec(
        `INSERT INTO character_skill_grants (
           character_id, source_instance_id, grant_key, ordinal,
           skill, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, NULL, 'active', ?, ?)`,
        [source.characterId, source.id, grantKey, ordinal, now, now],
      );
      continue;
    }
    if (row.state === 'active') {
      continue;
    }
    // REVIVE. The selection travels with the row unless another ACTIVE grant
    // now holds it — then the grant revives UNFILLED and the step reports it
    // outstanding (§3.8's corrected policy; the disclosure reason is
    // SKILL_GRANT_REVIVED_UNFILLED_REASON in the seam).
    const revivedSkill =
      row.skill !== null &&
      skillHeldByOtherActiveGrant(db, source.characterId, row.skill, row.id)
        ? null
        : row.skill;
    db.exec(
      `UPDATE character_skill_grants
       SET state = 'active', skill = ?, orphan_reason_code = NULL,
           orphaned_at = NULL, updated_at = ?
       WHERE id = ?`,
      [revivedSkill, timestamp(), row.id],
    );
  }

  for (const row of existing) {
    if (
      row.state !== 'active' ||
      desired.has(`${row.grant_key}:${row.ordinal}`)
    ) {
      continue;
    }
    const now = timestamp();
    db.exec(
      `UPDATE character_skill_grants
       SET state = 'orphaned', orphan_reason_code = ?, orphaned_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [SKILL_GRANT_ORPHAN_REASONS.ruleNoLongerActive, now, now, row.id],
    );
  }
}

/**
 * Orphan every ACTIVE grant of a source whose source is being deactivated —
 * the tombstone path, where `ON DELETE CASCADE` never fires (§3.8). ALL grant
 * keys, not only the class arm's: whatever minted a grant, its source is gone.
 */
export function orphanSkillGrantsForSource(
  db: DatabaseContext,
  sourceInstanceId: number,
): void {
  const now = timestamp();
  db.exec(
    `UPDATE character_skill_grants
     SET state = 'orphaned', orphan_reason_code = ?, orphaned_at = ?,
         updated_at = ?
     WHERE source_instance_id = ? AND state = 'active'`,
    [SKILL_GRANT_ORPHAN_REASONS.sourceRemoved, now, now, sourceInstanceId],
  );
}

/**
 * The per-grant pool a class grant may be filled from, BEFORE removing held
 * skills: the class's own options list, or all eighteen where the structured
 * columns say the choice is unbounded (Bard, D44).
 */
function classSkillPool(
  db: DatabaseContext,
  grantKey: string,
  classDefinitionId: number,
): Skill[] {
  const traits = db.oneRaw(
    `SELECT skill_choice_from_any, multiclass_skill_choice_pool
     FROM class_sheet_traits
     WHERE class_definition_id = ?`,
    [classDefinitionId],
  );
  const fromAny =
    grantKey === SKILL_GRANT_KEYS.classSkill
      ? Number(traits?.skill_choice_from_any) === 1
      : String(traits?.multiclass_skill_choice_pool) === 'any';
  if (fromAny) {
    return [...skills];
  }
  return db
    .all(
      `SELECT skill FROM class_skill_options
       WHERE class_definition_id = ? ORDER BY skill`,
      [classDefinitionId],
      (row) => sqlString(row, 'skill'),
    )
    .filter((skill): skill is Skill => isEnumValue(skills, skill));
}

/**
 * THE RESOLVER (§3.6): four questions, four fields — the grant rows, the
 * filled DISTINCT proficiencies, the unfilled required class grants, and each
 * unfilled grant's available choices. A resolver returning only the third
 * would make the guided step unbuildable, which is why all four ship together.
 *
 * §3.3's rule is enforced in `available`, not in the outstanding count:
 * background and species grants REMOVE skills from a class grant's available
 * choices — you cannot pick what you already have — but they NEVER reduce the
 * number of unfilled class ordinals.
 */
export function resolveSkillGrants(
  db: DatabaseContext,
  characterId: number,
): ResolvedSkillGrants {
  const grants = db.all(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE character_id = ?
     ORDER BY source_instance_id, grant_key, ordinal, id`,
    [characterId],
    skillGrantRow,
  );
  const held = new Set<Skill>();
  for (const grant of grants) {
    if (grant.state === 'active' && grant.skill !== null) {
      held.add(grant.skill);
    }
  }
  const filled = [...held].sort();

  const unfilled: UnfilledClassSkillGrant[] = [];
  for (const grant of grants) {
    if (
      grant.state !== 'active' ||
      grant.skill !== null ||
      !isEnumValue(CLASS_SKILL_GRANT_KEYS, grant.grant_key)
    ) {
      continue;
    }
    const classDefinitionId = db.scalar<number>(
      `SELECT source_definition_id FROM character_source_instances
       WHERE id = ?`,
      [grant.source_instance_id],
    );
    if (classDefinitionId === null) {
      continue;
    }
    const className = db.scalar<string>(
      'SELECT name FROM class_definitions WHERE id = ?',
      [Number(classDefinitionId)],
    );
    const pool = classSkillPool(db, grant.grant_key, Number(classDefinitionId));
    unfilled.push({
      grant_id: grant.id,
      source_instance_id: grant.source_instance_id,
      grant_key: grant.grant_key,
      ordinal: grant.ordinal,
      class_definition_id: Number(classDefinitionId),
      class_name: className === null ? null : String(className),
      available: pool.filter((skill) => !held.has(skill)),
    });
  }

  return {
    grants,
    skills: filled,
    unfilledClassGrants: unfilled,
  };
}
