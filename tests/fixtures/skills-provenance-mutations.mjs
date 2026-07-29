import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const mutation = process.argv[3];
const action = process.argv[2];
const backupPath = resolve(
  '/tmp',
  `dnd-multiclass-spells-static-skills-provenance-${mutation ?? 'unknown'}.json`,
);

const edit = (path, from, to) => ({ path, from, to });

/**
 * Mutations for the skills-with-provenance controls (plan
 * `docs/design/2026-07-29-skills-with-provenance.md` §6): S-TOMBSTONE,
 * S-REACTIVATE, S-DISTINCT, S-SHARE from dispatch S-A; S-SILENCE, S-SOURCE,
 * S-POOL, S-BACKGROUND, S-GRANT-IDENTITY, S-LEGACY from dispatch S-C.
 *
 * Same apply/restore convention as `tests/fixtures/b2-contribution-mutations.mjs`.
 * The S-C mutations are applied for a VITEST run only and are not required to
 * type-check — a mutation deliberately reintroduces retired shapes.
 */
const mutations = {
  // S-SILENCE (§6, §5's trap made executable): replace the per-grant
  // predicate with `class entitlement − count(all filled grants)` — the OLD
  // count semantics rebuilt on the NEW table. A predicate replacement, not a
  // revert: the resolver reports only as many unfilled class grants as the
  // count arithmetic says remain, so a background's two filled grants pay
  // off a Fighter's two class ordinals and the exit test's Acolyte Fighter
  // reads complete.
  silence: [
    edit(
      'src/grants/skill-grants.ts',
      `  return {
    grants,
    skills: filled,
    unfilledClassGrants: unfilled,
  };`,
      `  const entitledCount = grants.filter(
    (grant) =>
      grant.state === 'active' &&
      isEnumValue(CLASS_SKILL_GRANT_KEYS, grant.grant_key),
  ).length;
  return {
    grants,
    skills: filled,
    unfilledClassGrants: unfilled.slice(
      0,
      Math.max(0, entitledCount - filled.length),
    ),
  };`,
    ),
  ],
  // S-SOURCE (§6, retargeted): drop the NOT NULL so an unattributed grant is
  // storable, AND make a producer write null — either half alone leaves the
  // other unexercised (a dropped constraint changes nothing about rows that
  // already have a source).
  source: [
    edit(
      'src/db/schema.sql',
      '\t`source_instance_id` integer NOT NULL,\n\t`grant_key` VARCHAR NOT NULL,',
      '\t`source_instance_id` integer,\n\t`grant_key` VARCHAR NOT NULL,',
    ),
    edit(
      'src/grants/skill-grants.ts',
      `      [characterId, sourceInstanceId, grantKey, index + 1, skill, now, now],`,
      `      [characterId, null, grantKey, index + 1, skill, now, now],`,
    ),
  ],
  // S-POOL: let the guided command accept a skill outside the addressed
  // grant's pool — the refusal is deleted outright.
  pool: [
    edit(
      'src/grants/skill-grants.ts',
      `  const pool = fillablePool(db, grant);
  if (pool === null || !pool.includes(skill)) {
    throw new SkillGrantRefusal(
      'skill_not_in_pool',
      skill,
      \`\${skill} is not in the pool grant \${grantId} may be filled from.\`,
    );
  }`,
      `  void fillablePool;`,
    ),
  ],
  // S-BACKGROUND: stop writing the background's two printed skills as grants.
  background: [
    edit(
      'src/builder/guided-creation.ts',
      `    mintFilledSkillGrants(
      db,
      characterId,
      instanceId,
      SKILL_GRANT_KEYS.backgroundSkill,
      backgroundSkillsFromTemplate(template),
    );`,
      `    void backgroundSkillsFromTemplate;`,
    ),
  ],
  // S-GRANT-IDENTITY (§5's second trap): make the fill command target
  // whichever unfilled active grant comes first rather than the ADDRESSED
  // one — right totals, wrong provenance.
  identity: [
    edit(
      'src/grants/skill-grants.ts',
      `  const grant = db.one(
    \`SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE id = ? AND character_id = ?\`,
    [grantId, characterId],
    skillGrantRow,
  );`,
      `  const grant = db.one(
    \`SELECT id, character_id, source_instance_id, grant_key, ordinal,
            skill, state, orphan_reason_code, orphaned_at
     FROM character_skill_grants
     WHERE id >= min(?, id) AND character_id = ?
       AND state = 'active' AND skill IS NULL
     ORDER BY id
     LIMIT 1\`,
    [grantId, characterId],
    skillGrantRow,
  );`,
    ),
  ],
  // S-LEGACY (§6, retargeted): re-register the retired set_skill_proficiency
  // across the whole write path — validator vocabulary, validator arm,
  // factory construction, executor inverse — so the RPC surface ACCEPTS it
  // again and writes the projection directly, exactly the legacy semantics
  // §3.5 deleted.
  legacy: [
    edit(
      'src/commands/payload-validator.ts',
      `  'set_hit_point_roll',
  // \`set_skill_proficiency\` and \`choose_multiclass_skill\` are RETIRED
  // (skills-with-provenance §3.5): deliberately absent, so both refuse as
  // 'Unknown character command type.' — the S-LEGACY control's assertion.
  'fill_skill_grant',`,
      `  'set_hit_point_roll',
  'set_skill_proficiency',
  'fill_skill_grant',`,
    ),
    edit(
      'src/commands/payload-validator.ts',
      `    case 'fill_skill_grant':
      validateFillSkillGrant(record);
      return record;`,
      `    case 'set_skill_proficiency' as never:
      return record;
    case 'fill_skill_grant':
      validateFillSkillGrant(record);
      return record;`,
    ),
    edit(
      'src/commands/character-command-factory.ts',
      `      case 'fill_skill_grant':
        return new FillSkillGrantCommand(this.db, payload);`,
      `      case 'set_skill_proficiency' as never:
        return {
          actionType: 'set_skill_proficiency',
          apply: (characterId) => {
            this.db.exec(
              \`INSERT OR IGNORE INTO character_skill_proficiencies
                 (character_id, skill, created_at, updated_at)
               VALUES (?, ?, ?, ?)\`,
              [
                characterId,
                payload.skill,
                new Date().toISOString(),
                new Date().toISOString(),
              ],
            );
          },
          inverse: () => payload,
        };
      case 'fill_skill_grant':
        return new FillSkillGrantCommand(this.db, payload);`,
    ),
    edit(
      'src/commands/character-command-executor.ts',
      `      case 'allocate_abilities':
      case 'update_source_config':`,
      `      case 'allocate_abilities':
      case 'set_skill_proficiency' as never:
      case 'update_source_config':`,
    ),
  ],
  // S-TOMBSTONE: mutate orphaning away, so grants keep `state = 'active'`
  // when their source tombstones.
  tombstone: [
    edit(
      'src/grants/grant-rule-slot-generator.ts',
      `    // The tombstone path (§3.8): cascade never fires here, so the grants are
    // orphaned explicitly — every key, not only the class arm's, because
    // whatever minted a grant, its source is now gone. The projection is
    // reconciled in the same pass so a removed class's skills leave the sheet.
    orphanSkillGrantsForSource(this.db, sourceInstanceId);
    rebuildSkillProjection(this.db, source.characterId);`,
      `    // The tombstone path (§3.8): cascade never fires here, so the grants are
    // orphaned explicitly — every key, not only the class arm's, because
    // whatever minted a grant, its source is now gone. The projection is
    // reconciled in the same pass so a removed class's skills leave the sheet.
    rebuildSkillProjection(this.db, source.characterId);`,
    ),
  ],
  // S-REACTIVATE: remove the reactivation collision policy — a naive revive
  // that restores the remembered skill unconditionally, ignoring whether
  // another ACTIVE grant now holds it.
  reactivate: [
    edit(
      'src/grants/skill-grants.ts',
      `    const revivedSkill =
      row.skill !== null &&
      skillHeldByOtherActiveGrant(db, source.characterId, row.skill, row.id)
        ? null
        : row.skill;`,
      '    const revivedSkill = row.skill;',
    ),
  ],
  // S-DISTINCT: make the sheet read the PROJECTION instead of grants.
  distinct: [
    edit(
      'src/grants/skill-grants.ts',
      `      \`SELECT DISTINCT skill FROM character_skill_grants
       WHERE character_id = ? AND state = 'active' AND skill IS NOT NULL
       ORDER BY skill\`,
      [characterId],`,
      `      \`SELECT DISTINCT skill FROM character_skill_proficiencies
       WHERE character_id = ?
       ORDER BY skill\`,
      [characterId],`,
    ),
  ],
  // S-SHARE: scramble the grant's exported source reference so every grant
  // resolves to whichever owner happens to be first, regardless of which
  // source it actually came from — right skill, wrong provenance.
  share: [
    edit(
      'src/sharing/character-share.ts',
      `    .flatMap((row) => {
      const ref = owners.get(Number(row.source_instance_id))?.ref;
      if (ref === undefined) {
        return [];
      }
      return [
        {
          ref,
          grantKey: String(row.grant_key),`,
      `    .flatMap((row) => {
      const ref = [...owners.values()][0]?.ref;
      if (ref === undefined) {
        return [];
      }
      return [
        {
          ref,
          grantKey: String(row.grant_key),`,
    ),
  ],
};

if (mutation === undefined || !(mutation in mutations)) {
  throw new Error(
    `Unknown mutation. Choose one of: ${Object.keys(mutations).join(', ')}`,
  );
}

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Backup already exists: ${backupPath}`);
  }
  const originals = {};
  for (const change of mutations[mutation]) {
    const absolute = resolve(root, change.path);
    const original = readFileSync(absolute, 'utf8');
    if (original.split(change.from).length !== 2) {
      throw new Error(
        `${mutation}: expected exactly one target in ${change.path}`,
      );
    }
    originals[change.path] = original;
    writeFileSync(absolute, original.replace(change.from, change.to));
  }
  writeFileSync(backupPath, JSON.stringify(originals));
  process.stdout.write(`applied ${mutation}\n`);
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`No backup exists: ${backupPath}`);
  }
  const originals = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, contents] of Object.entries(originals)) {
    writeFileSync(resolve(root, path), contents);
  }
  unlinkSync(backupPath);
  process.stdout.write(`restored ${mutation}\n`);
} else {
  throw new Error(
    'Usage: node tests/fixtures/skills-provenance-mutations.mjs apply|restore NAME',
  );
}
