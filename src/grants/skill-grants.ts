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
  SPECIES_SKILL_GRANT_KEYS,
  SPECIES_SKILL_GRANT_PLANS,
  type ResolvedSkillGrants,
  type SkillGrantRefusalReason,
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
  const desired: DesiredSkillGrant[] = [];
  for (let ordinal = 1; ordinal <= (entitlement?.count ?? 0); ordinal += 1) {
    desired.push({ grantKey: String(entitlement?.grantKey), ordinal });
  }
  syncScopedSkillGrants(db, source, [...CLASS_SKILL_GRANT_KEYS], desired);
}

/**
 * THE GENERATOR'S SPECIES ARM (S-B, §3.4) — the same sync/revive as the class
 * arm, scoped to the two SPECIES grant keys, with the desired set read from
 * the seam's `SPECIES_SKILL_GRANT_PLANS` literal (Elf's Keen Senses, Human's
 * Skillful) keyed by the source definition's content key. A species with no
 * plan — Gnome, Tiefling, every homebrew — desires nothing, and a source that
 * is not a species desires nothing, so the call is a no-op everywhere the
 * plan does not reach. §3.8 pins the GENERATOR as the minter of unfilled
 * grants, which is why this is an arm rather than code in the guided apply:
 * the expert `add_source` path reaches it identically.
 */
export function syncSpeciesSkillGrants(
  db: DatabaseContext,
  source: SkillGrantSource,
): void {
  const desired: DesiredSkillGrant[] = [];
  if (source.sourceType === 'species' && source.sourceDefinitionId !== null) {
    const contentKey = db.scalar<string>(
      'SELECT content_key FROM species_definitions WHERE id = ?',
      [source.sourceDefinitionId],
    );
    const plan =
      contentKey === null
        ? undefined
        : SPECIES_SKILL_GRANT_PLANS[String(contentKey)];
    for (let ordinal = 1; ordinal <= (plan?.count ?? 0); ordinal += 1) {
      desired.push({ grantKey: String(plan?.grant_key), ordinal });
    }
  }
  syncScopedSkillGrants(db, source, [...SPECIES_SKILL_GRANT_KEYS], desired);
}

interface DesiredSkillGrant {
  readonly grantKey: string;
  readonly ordinal: number;
}

/**
 * The shared sync/revive body both arms call. SCOPED: it reads and reconciles
 * ONLY grants whose `grant_key` is in `scopeKeys`, so the class arm cannot
 * orphan a species or background grant on regeneration and vice versa — the
 * exact widening the S-B dispatch forbids.
 */
function syncScopedSkillGrants(
  db: DatabaseContext,
  source: SkillGrantSource,
  scopeKeys: readonly string[],
  desired: readonly DesiredSkillGrant[],
): void {
  const desiredByIdentity = new Map(
    desired.map((want) => [`${want.grantKey}:${want.ordinal}`, want]),
  );

  const existing = db.all(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE source_instance_id = ?
       AND grant_key IN (${scopeKeys.map(() => '?').join(', ')})
     ORDER BY grant_key, ordinal`,
    [source.id, ...scopeKeys],
    skillGrantRow,
  );
  const byIdentity = new Map(
    existing.map((row) => [`${row.grant_key}:${row.ordinal}`, row]),
  );

  for (const [identity, want] of desiredByIdentity) {
    const row = byIdentity.get(identity);
    if (row === undefined) {
      const now = timestamp();
      db.exec(
        `INSERT INTO character_skill_grants (
           character_id, source_instance_id, grant_key, ordinal,
           skill, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, NULL, 'active', ?, ?)`,
        [source.characterId, source.id, want.grantKey, want.ordinal, now, now],
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
      desiredByIdentity.has(`${row.grant_key}:${row.ordinal}`)
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

/**
 * A DOMAIN refusal of a skill-grant write, distinct from an unexpected
 * failure — the `GuidedCreationRefusal` pattern with the seam's
 * `SkillGrantRefusalReason` vocabulary (§3.6). `skill` NAMES the conflicting
 * or offending skill where one is at issue (§3.3 pins that
 * `skill_already_held` names it so the step can offer to clear it); null
 * where none is (`grant_not_found`).
 *
 * Lives here rather than in the seam because the seam pins shapes, not
 * runtime classes, and rather than beside the command because the background
 * producer raises the same refusal on its §3.3 collision.
 */
export class SkillGrantRefusal extends Error {
  constructor(
    readonly reason: SkillGrantRefusalReason,
    readonly skill: Skill | null,
    message: string,
  ) {
    super(message);
    this.name = 'SkillGrantRefusal';
  }
}

/**
 * The pool an ADDRESSED grant may be filled from, before removing held
 * skills: the class pool for the two class keys (§4 S-B: "validates the
 * choice against the class pool"), the seam's literal plans for the two
 * species keys. Null for any other key — `background_skill` grants are minted
 * FILLED and have no fillable pool, so addressing one falls to the
 * `grant_already_filled` refusal before this is ever consulted.
 */
function fillablePool(
  db: DatabaseContext,
  grant: SkillGrantRow,
): Skill[] | null {
  if (isEnumValue(CLASS_SKILL_GRANT_KEYS, grant.grant_key)) {
    const classDefinitionId = db.scalar<number>(
      `SELECT source_definition_id FROM character_source_instances
       WHERE id = ?`,
      [grant.source_instance_id],
    );
    if (classDefinitionId === null) {
      return null;
    }
    return classSkillPool(db, grant.grant_key, Number(classDefinitionId));
  }
  if (isEnumValue(SPECIES_SKILL_GRANT_KEYS, grant.grant_key)) {
    const plan = Object.values(SPECIES_SKILL_GRANT_PLANS).find(
      (candidate) => candidate.grant_key === grant.grant_key,
    );
    if (plan === undefined) {
      return null;
    }
    return plan.pool === 'any_skill' ? [...skills] : [...plan.pool];
  }
  return null;
}

/**
 * THE FILL/CLEAR WRITE (§3.3, §3.6) — the guided step's command body.
 *
 * The grant is ADDRESSED by its own stable id and the write lands on exactly
 * that row: with two entered classes whose pools overlap, filling through the
 * second class's form fills THAT class's ordinal and leaves the first's
 * unfilled — right totals on the WRONG source is §5's second trap, and
 * `S-GRANT-IDENTITY` is written against it.
 *
 * Refusals, in the order they are checked:
 *  - `grant_not_found` — no ACTIVE grant with this id on this character. An
 *    orphaned grant is deliberately not addressable: its source is gone and
 *    filling it would resurrect provenance the tombstone retired.
 *  - `grant_already_filled` — fills are NOT overwrites; changing a choice is
 *    clear-then-fill, so an overwrite cannot masquerade as a first fill.
 *  - `skill_not_in_pool` — the addressed grant's own pool, per key.
 *  - `skill_already_held` — some other ACTIVE grant holds the skill; the
 *    refusal names it. Checked here so the person gets a named reason, and
 *    enforced again by the partial unique index for any writer that skips
 *    this function.
 *
 * `skill: null` CLEARS: an already-unfilled grant clears to itself (a no-op,
 * not a refusal — clearing means "make unfilled", which it already is).
 */
export function fillSkillGrant(
  db: DatabaseContext,
  characterId: number,
  grantId: number,
  skill: Skill | null,
): void {
  const grant = db.one(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE id = ? AND character_id = ?`,
    [grantId, characterId],
    skillGrantRow,
  );
  if (grant === null || grant.state !== 'active') {
    throw new SkillGrantRefusal(
      'grant_not_found',
      null,
      `No active skill grant ${grantId} exists on character ${characterId}.`,
    );
  }

  if (skill === null) {
    if (grant.skill !== null) {
      db.exec(
        `UPDATE character_skill_grants
         SET skill = NULL, updated_at = ?
         WHERE id = ?`,
        [timestamp(), grant.id],
      );
      rebuildSkillProjection(db, characterId);
    }
    return;
  }

  if (grant.skill !== null) {
    throw new SkillGrantRefusal(
      'grant_already_filled',
      grant.skill,
      `Grant ${grantId} already holds ${grant.skill}; clear it first.`,
    );
  }
  const pool = fillablePool(db, grant);
  if (pool === null || !pool.includes(skill)) {
    throw new SkillGrantRefusal(
      'skill_not_in_pool',
      skill,
      `${skill} is not in the pool grant ${grantId} may be filled from.`,
    );
  }
  if (skillHeldByOtherActiveGrant(db, characterId, skill, grant.id)) {
    throw new SkillGrantRefusal(
      'skill_already_held',
      skill,
      `${skill} is already held by another active grant.`,
    );
  }
  db.exec(
    `UPDATE character_skill_grants
     SET skill = ?, updated_at = ?
     WHERE id = ?`,
    [skill, timestamp(), grant.id],
  );
  rebuildSkillProjection(db, characterId);
}

/**
 * THE BACKGROUND PRODUCER'S MINT (§4 S-B): the background's printed skills,
 * written as FILLED grants under its own source instance, ordinals in printed
 * order. The §3.3 collision is checked per skill BEFORE inserting so a
 * background whose skill is already held refuses with the NAMED
 * `skill_already_held` — never a raw SQLite constraint error — and the whole
 * apply rolls back with it (the caller owns the transaction).
 *
 * The caller passes VERIFIED `Skill` values — normalisation from prose lives
 * with the producer, which is the only party that knows the prose's source.
 */
export function mintFilledSkillGrants(
  db: DatabaseContext,
  characterId: number,
  sourceInstanceId: number,
  grantKey: string,
  granted: readonly Skill[],
): void {
  for (const [index, skill] of granted.entries()) {
    if (granted.indexOf(skill) !== index) {
      throw new Error(
        `Duplicate skill ${skill} in one source's grant list — the printed ` +
          'content never repeats a skill, so this is a data defect, not a ' +
          'choice to reconcile.',
      );
    }
    if (skillHeldByOtherActiveGrant(db, characterId, skill, -1)) {
      throw new SkillGrantRefusal(
        'skill_already_held',
        skill,
        `${skill} is already held by another active grant on this character.`,
      );
    }
    const now = timestamp();
    db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal,
         skill, state, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [characterId, sourceInstanceId, grantKey, index + 1, skill, now, now],
    );
  }
  rebuildSkillProjection(db, characterId);
}
