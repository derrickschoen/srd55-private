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
 * Mutations for the four skills-with-provenance controls (plan
 * `docs/design/2026-07-29-skills-with-provenance.md` §6, dispatch S-A):
 * S-TOMBSTONE, S-REACTIVATE, S-DISTINCT, S-SHARE.
 *
 * Same apply/restore convention as `tests/fixtures/b2-contribution-mutations.mjs`.
 */
const mutations = {
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
