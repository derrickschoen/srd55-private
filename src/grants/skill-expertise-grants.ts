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
  expertiseEntitlementsForClassName,
  type ExpertisePool,
} from '../rules/class-choice-entitlements-srd';
import { activeGrantedSkills, resolveSkillGrants } from './skill-grants';

export const EXPERTISE_GRANT_ORPHAN_REASONS = Object.freeze({
  sourceRemoved: 'source_removed',
  entitlementRemoved: 'entitlement_removed',
  underlyingProficiencyRemoved: 'underlying_proficiency_removed',
} as const);

export interface SkillExpertiseGrantRow {
  readonly id: number;
  readonly character_id: number;
  readonly source_instance_id: number;
  readonly grant_key: string;
  readonly ordinal: number;
  readonly granted_at_class_level: number;
  readonly skill: Skill | null;
  readonly state: SkillGrantState;
  readonly orphan_reason_code: string | null;
  readonly orphaned_at: string | null;
}

const expertiseGrantRow: RowCodec<SkillExpertiseGrantRow> = (row) => {
  const skill = sqlNullableString(row, 'skill');
  if (skill !== null && !isEnumValue(skills, skill)) {
    throw new TypeError(`Unknown stored Expertise skill '${skill}'.`);
  }
  const state = sqlString(row, 'state');
  if (!isEnumValue(skillGrantStates, state)) {
    throw new TypeError(`Unknown Expertise grant state '${state}'.`);
  }
  return {
    id: sqlInteger(row, 'id'),
    character_id: sqlInteger(row, 'character_id'),
    source_instance_id: sqlInteger(row, 'source_instance_id'),
    grant_key: sqlString(row, 'grant_key'),
    ordinal: sqlInteger(row, 'ordinal'),
    granted_at_class_level: sqlInteger(row, 'granted_at_class_level'),
    skill: skill as Skill | null,
    state: state as SkillGrantState,
    orphan_reason_code: sqlNullableString(row, 'orphan_reason_code'),
    orphaned_at: sqlNullableString(row, 'orphaned_at'),
  };
};

function timestamp(): string {
  return new Date().toISOString();
}

function grantKey(classLevel: number): string {
  return `class_expertise_${String(classLevel)}`;
}

interface ExpertiseSource {
  readonly id: number;
  readonly characterId: number;
  readonly sourceType: string;
  readonly sourceDefinitionId: number | null;
}

interface DesiredExpertiseGrant {
  readonly grantKey: string;
  readonly ordinal: number;
  readonly classLevel: number;
}

function desiredForSource(
  db: DatabaseContext,
  source: ExpertiseSource,
): DesiredExpertiseGrant[] {
  if (source.sourceType !== 'class' || source.sourceDefinitionId === null) {
    return [];
  }
  const classRow = db.oneRaw(
    `SELECT definition.name, level.level
     FROM class_definitions AS definition
     INNER JOIN character_class_levels AS level
       ON level.class_definition_id = definition.id
      AND level.character_id = ?
     WHERE definition.id = ?`,
    [source.characterId, source.sourceDefinitionId],
  );
  if (classRow === null) {
    return [];
  }
  const entitlements =
    expertiseEntitlementsForClassName(String(classRow.name)) ?? [];
  const currentLevel = Number(classRow.level);
  return entitlements
    .filter((entitlement) => entitlement.class_level <= currentLevel)
    .flatMap((entitlement) =>
      Array.from({ length: entitlement.count }, (_, index) => ({
        grantKey: grantKey(entitlement.class_level),
        ordinal: index + 1,
        classLevel: entitlement.class_level,
      })),
    );
}

/** Generate/revive/tombstone the sourced Expertise occurrences for one source. */
export function syncExpertiseGrantsForSource(
  db: DatabaseContext,
  source: ExpertiseSource,
): void {
  const desired = desiredForSource(db, source);
  const wanted = new Map(
    desired.map((grant) => [
      `${grant.grantKey}:${String(grant.ordinal)}`,
      grant,
    ]),
  );
  const existing = db.all(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            granted_at_class_level, skill, state, orphan_reason_code,
            orphaned_at
     FROM character_skill_expertise_grants
     WHERE source_instance_id = ?
     ORDER BY grant_key, ordinal`,
    [source.id],
    expertiseGrantRow,
  );
  const held = new Set(activeGrantedSkills(db, source.characterId));
  for (const desiredGrant of desired) {
    const identity =
      `${desiredGrant.grantKey}:${String(desiredGrant.ordinal)}`;
    const row = existing.find(
      (candidate) =>
        `${candidate.grant_key}:${String(candidate.ordinal)}` === identity,
    );
    if (row === undefined) {
      const now = timestamp();
      db.exec(
        `INSERT INTO character_skill_expertise_grants (
           character_id, source_instance_id, grant_key, ordinal,
           granted_at_class_level, skill, state, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, NULL, 'active', ?, ?)`,
        [
          source.characterId,
          source.id,
          desiredGrant.grantKey,
          desiredGrant.ordinal,
          desiredGrant.classLevel,
          now,
          now,
        ],
      );
      continue;
    }
    if (
      (row.skill === null || held.has(row.skill)) &&
      (
        row.state !== 'active' ||
        row.orphan_reason_code !== null ||
        row.orphaned_at !== null ||
        row.granted_at_class_level !== desiredGrant.classLevel
      )
    ) {
      db.exec(
        `UPDATE character_skill_expertise_grants
         SET state = 'active', orphan_reason_code = NULL, orphaned_at = NULL,
             granted_at_class_level = ?, updated_at = ?
         WHERE id = ?`,
        [desiredGrant.classLevel, timestamp(), row.id],
      );
    }
  }
  for (const row of existing) {
    const identity = `${row.grant_key}:${String(row.ordinal)}`;
    if (wanted.has(identity)) {
      continue;
    }
    const now = timestamp();
    db.exec(
      `UPDATE character_skill_expertise_grants
       SET state = 'orphaned', orphan_reason_code = ?, orphaned_at = ?,
           updated_at = ?
       WHERE id = ? AND state = 'active'`,
      [EXPERTISE_GRANT_ORPHAN_REASONS.entitlementRemoved, now, now, row.id],
    );
  }
}

/**
 * Rebuild every provable occurrence, then tombstone selected Expertise whose
 * last active proficiency disappeared. The selection is retained as history.
 */
export function reconcileCharacterSkillExpertise(
  db: DatabaseContext,
  characterId: number,
): void {
  const sources = db.all(
    `SELECT id, source_type, source_definition_id
     FROM character_source_instances
     WHERE character_id = ? AND state = 'active'
     ORDER BY id`,
    [characterId],
    (row) => ({
      id: sqlInteger(row, 'id'),
      sourceType: sqlString(row, 'source_type'),
      sourceDefinitionId:
        row.source_definition_id === null
          ? null
          : sqlInteger(row, 'source_definition_id'),
    }),
  );
  for (const source of sources) {
    syncExpertiseGrantsForSource(db, {
      id: source.id,
      characterId,
      sourceType: source.sourceType,
      sourceDefinitionId: source.sourceDefinitionId,
    });
  }
  const held = new Set(activeGrantedSkills(db, characterId));
  const selected = resolveSkillExpertiseGrants(db, characterId);
  for (const grant of selected) {
    if (
      grant.state !== 'active' ||
      grant.skill === null ||
      held.has(grant.skill)
    ) {
      continue;
    }
    const now = timestamp();
    db.exec(
      `UPDATE character_skill_expertise_grants
       SET state = 'orphaned', orphan_reason_code = ?, orphaned_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        EXPERTISE_GRANT_ORPHAN_REASONS.underlyingProficiencyRemoved,
        now,
        now,
        grant.id,
      ],
    );
  }
}

export function orphanExpertiseGrantsForSource(
  db: DatabaseContext,
  sourceInstanceId: number,
): void {
  const now = timestamp();
  db.exec(
    `UPDATE character_skill_expertise_grants
     SET state = 'orphaned', orphan_reason_code = ?, orphaned_at = ?,
         updated_at = ?
     WHERE source_instance_id = ? AND state = 'active'`,
    [
      EXPERTISE_GRANT_ORPHAN_REASONS.sourceRemoved,
      now,
      now,
      sourceInstanceId,
    ],
  );
}

export function resolveSkillExpertiseGrants(
  db: DatabaseContext,
  characterId: number,
): SkillExpertiseGrantRow[] {
  return db.all(
    `SELECT id, character_id, source_instance_id, grant_key, ordinal,
            granted_at_class_level, skill, state, orphan_reason_code,
            orphaned_at
     FROM character_skill_expertise_grants
     WHERE character_id = ?
     ORDER BY source_instance_id, granted_at_class_level, ordinal, id`,
    [characterId],
    expertiseGrantRow,
  );
}

export function activeExpertiseSkills(
  db: DatabaseContext,
  characterId: number,
): Skill[] {
  return db
    .all(
      `SELECT DISTINCT expertise.skill
       FROM character_skill_expertise_grants AS expertise
       WHERE expertise.character_id = ?
         AND expertise.state = 'active'
         AND expertise.skill IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM character_skill_grants AS proficiency
           WHERE proficiency.character_id = expertise.character_id
             AND proficiency.state = 'active'
             AND proficiency.skill = expertise.skill
         )
       ORDER BY expertise.skill`,
      [characterId],
      (row) => sqlString(row, 'skill'),
    )
    .filter((skill): skill is Skill => isEnumValue(skills, skill));
}

function poolForGrant(
  db: DatabaseContext,
  grant: SkillExpertiseGrantRow,
): ExpertisePool | null {
  const className = db.scalar<string>(
    `SELECT definition.name
     FROM character_source_instances AS source
     INNER JOIN class_definitions AS definition
       ON definition.id = source.source_definition_id
     WHERE source.id = ? AND source.source_type = 'class'`,
    [grant.source_instance_id],
  );
  if (className === null) {
    return null;
  }
  return (
    expertiseEntitlementsForClassName(String(className))?.find(
      (entitlement) =>
        entitlement.class_level === grant.granted_at_class_level,
    )?.pool ?? null
  );
}

/** Current legal choices for one live grant, derived from sourced entitlement. */
export function availableSkillsForExpertiseGrant(
  db: DatabaseContext,
  characterId: number,
  grant: SkillExpertiseGrantRow,
): Skill[] {
  const held = new Set(resolveSkillGrants(db, characterId).skills);
  const expert = new Set(activeExpertiseSkills(db, characterId));
  const pool = poolForGrant(db, grant);
  return [...held]
    .filter((skill) => !expert.has(skill))
    .filter(
      (skill) =>
        pool === null ||
        pool.kind === 'any_proficient_skill' ||
        pool.skills.includes(skill),
    )
    .sort();
}

export class SkillExpertiseGrantRefusal extends Error {
  constructor(
    readonly reason:
      | 'grant_not_found'
      | 'grant_already_filled'
      | 'skill_not_proficient'
      | 'skill_not_in_pool'
      | 'skill_already_has_expertise',
    readonly skill: Skill | null,
    message: string,
  ) {
    super(message);
    this.name = 'SkillExpertiseGrantRefusal';
  }
}

/** The one fill/clear writer shared by guided creation and future level-up. */
export function fillSkillExpertiseGrant(
  db: DatabaseContext,
  characterId: number,
  grantId: number,
  skill: Skill | null,
): void {
  const grant =
    resolveSkillExpertiseGrants(db, characterId).find(
      (candidate) => candidate.id === grantId,
    ) ?? null;
  if (grant === null || grant.state !== 'active') {
    throw new SkillExpertiseGrantRefusal(
      'grant_not_found',
      skill,
      'That active Expertise choice does not exist for this character.',
    );
  }
  if (skill === null) {
    db.exec(
      `UPDATE character_skill_expertise_grants
       SET skill = NULL, updated_at = ?
       WHERE id = ? AND character_id = ?`,
      [timestamp(), grantId, characterId],
    );
    return;
  }
  if (grant.skill !== null) {
    throw new SkillExpertiseGrantRefusal(
      'grant_already_filled',
      skill,
      'Clear this Expertise choice before changing it.',
    );
  }
  if (!activeGrantedSkills(db, characterId).includes(skill)) {
    throw new SkillExpertiseGrantRefusal(
      'skill_not_proficient',
      skill,
      'Expertise requires an active skill proficiency.',
    );
  }
  const pool = poolForGrant(db, grant);
  if (
    pool === null ||
    (pool.kind === 'named_proficient_skills' &&
      !pool.skills.includes(skill))
  ) {
    throw new SkillExpertiseGrantRefusal(
      'skill_not_in_pool',
      skill,
      'That skill is not eligible for this Expertise feature.',
    );
  }
  if (activeExpertiseSkills(db, characterId).includes(skill)) {
    throw new SkillExpertiseGrantRefusal(
      'skill_already_has_expertise',
      skill,
      'That skill already has Expertise.',
    );
  }
  db.exec(
    `UPDATE character_skill_expertise_grants
     SET skill = ?, updated_at = ?
     WHERE id = ? AND character_id = ?`,
    [skill, timestamp(), grantId, characterId],
  );
}
