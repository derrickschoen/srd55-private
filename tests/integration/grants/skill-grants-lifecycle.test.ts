import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import {
  activeGrantedSkills,
  mintFilledSkillGrants,
  rebuildSkillProjection,
  resolveSkillGrants,
} from '../../../src/grants/skill-grants';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE SKILL-GRANT LIFECYCLE, AGAINST A REAL DATABASE AND THE REAL COMMAND
 * LAYER (plan `docs/design/2026-07-29-skills-with-provenance.md` §3.8, S-A,
 * controls S-TOMBSTONE / S-REACTIVATE / S-DISTINCT).
 *
 * `src/grants/skill-grants.ts` shipped in the S-A dispatch with only
 * persistence-shape tests (contracts, schema, sharing) — nothing exercised the
 * resolver, the generator's class arm, or the tombstone/reactivate lifecycle
 * end to end. These three controls close that gap.
 *
 * FIGHTER IS THE FIXTURE CLASS, deliberately: `seedClassProgressions` +
 * `seedSheetContent` seed it from the real, parsed SRD content
 * (`class-traits-srd.ts` reading `docs/srd/source/`), so its
 * `skill_choice_count` and `class_skill_options` are real entitlement data,
 * not an invented fixture — and `UpdateClassCommand` is the real command a
 * player's "remove"/"re-add" actually runs through, tombstoning and
 * reactivating the same `character_source_instances` row exactly as
 * production does.
 *
 * THERE IS NO "FILL A GRANT" COMMAND YET (S-C is a later unit), so a fill is
 * simulated with a direct `UPDATE`, followed by the same
 * `rebuildSkillProjection` call a real fill command will eventually make —
 * simulating the missing writer, not bypassing the read side under test.
 */
describe('the skill-grant lifecycle: tombstone, reactivate, and the projection', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function classSkillPool(name: string): string[] {
    return db.all(
      `SELECT skill FROM class_skill_options
       WHERE class_definition_id = ? ORDER BY skill`,
      [classId(name)],
      (row) => String(row.skill),
    );
  }

  /** The generator's own class arm mints exactly one grant per ordinal. */
  function classGrantId(name: string, ordinal: number): number {
    return Number(
      db.scalar(
        `SELECT g.id FROM character_skill_grants AS g
         INNER JOIN character_source_instances AS s
           ON s.id = g.source_instance_id
         WHERE g.character_id = ? AND s.source_type = 'class'
           AND s.source_definition_id = ? AND g.grant_key = 'class_skill'
           AND g.ordinal = ?`,
        [characterId, classId(name), ordinal],
      ),
    );
  }

  function projectionSkills(): string[] {
    return db
      .allRaw(
        `SELECT skill FROM character_skill_proficiencies
         WHERE character_id = ? ORDER BY skill`,
        [characterId],
      )
      .map((row) => String(row.skill));
  }

  function updateClass(
    classDefinitionId: number,
    level: number | null,
  ): void {
    // `update_class` no longer carries a level (level-up plan §3): entry is
    // at 1, removal is `remove: true`, and a higher fixture level is a
    // direct fixture write — see `raiseClassLevelForTest`.
    if (level === null) {
      new UpdateClassCommand(
        db,
        {
          type: 'update_class',
          class_definition_id: classDefinitionId,
          remove: true,
        },
        integrity,
      ).apply(characterId);
      return;
    }
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: classDefinitionId },
      integrity,
    ).apply(characterId);
    if (level > 1) {
      raiseClassLevelForTest(db, characterId, classDefinitionId, level);
    }
  }

  /** A source with no producer of its own yet (S-B is a later unit) — a manual insert stands in for "acquired from another source". */
  function otherActiveSource(): number {
    return db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name, state
       ) VALUES (?, ?, 'background', 'Other Skill Source', 'active')`,
      [characterId, `other-skill-source-${String(characterId)}`],
    ).lastInsertId;
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    integrity = new CharacterCommandIntegrity('skill-grants-lifecycle-key');
    seedClassProgressions(db);
    seedSheetContent(db);
    characterId = db.exec(
      `INSERT INTO characters (name, strength) VALUES ('Grant Hero', 15)`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('S-TOMBSTONE: removing a class orphans (never deletes) its filled grant, off the sheet, off the active projection — and frees the skill for another source', () => {
    const fighterId = classId('Fighter');
    updateClass(fighterId, 5);

    // FIXTURE-OBSERVABILITY GUARD: Fighter must actually offer a skill, or the
    // rest of this test exercises nothing.
    const pool = classSkillPool('Fighter');
    expect(pool.length).toBeGreaterThan(0);
    const skill = pool[0]!;
    const grantId = classGrantId('Fighter', 1);
    expect(grantId).toBeGreaterThan(0);

    const now = new Date().toISOString();
    db.exec(
      `UPDATE character_skill_grants SET skill = ?, updated_at = ? WHERE id = ?`,
      [skill, now, grantId],
    );
    rebuildSkillProjection(db, characterId);

    // Setup sanity: the skill is really live before removal.
    expect(activeGrantedSkills(db, characterId)).toContain(skill);
    expect(projectionSkills()).toContain(skill);

    // Remove Fighter.
    updateClass(fighterId, null);

    // THE ROW IS RETAINED, ORPHANED — not deleted, not silently forgotten.
    expect(
      db.oneRaw(
        `SELECT state, skill, orphan_reason_code
         FROM character_skill_grants WHERE id = ?`,
        [grantId],
      ),
    ).toEqual({ state: 'orphaned', skill, orphan_reason_code: 'parent_rule_removed' });

    // Leaves the sheet, the active projection, and (via the resolver's own
    // active-only reading) completeness.
    expect(activeGrantedSkills(db, characterId)).not.toContain(skill);
    expect(projectionSkills()).not.toContain(skill);
    const sheet = new CharacterSheetBuilder(db).build(characterId);
    expect(
      sheet.skills.find((entry) => entry.skill === skill)?.proficient,
    ).toBe(false);
    const resolved = resolveSkillGrants(db, characterId);
    expect(resolved.skills).not.toContain(skill);

    // ANOTHER SOURCE CAN NOW GRANT THE SAME SKILL. The partial unique index
    // (`character_id, skill WHERE skill IS NOT NULL AND state = 'active'`)
    // excludes orphaned rows by design — this insert must NOT throw.
    const otherSourceId = otherActiveSource();
    expect(() =>
      db.exec(
        `INSERT INTO character_skill_grants (
           character_id, source_instance_id, grant_key, ordinal, skill, state
         ) VALUES (?, ?, 'background_skill', 1, ?, 'active')`,
        [characterId, otherSourceId, skill],
      ),
    ).not.toThrow();
    expect(activeGrantedSkills(db, characterId)).toContain(skill);
  });

  it('S-REACTIVATE: removing then re-adding a class revives its grant UNFILLED when another source now holds the skill — never a refusal, never a silent steal', () => {
    const fighterId = classId('Fighter');
    updateClass(fighterId, 5);

    const pool = classSkillPool('Fighter');
    expect(pool.length).toBeGreaterThan(0);
    const skill = pool[0]!;
    const grantId = classGrantId('Fighter', 1);
    db.exec(`UPDATE character_skill_grants SET skill = ? WHERE id = ?`, [
      skill,
      grantId,
    ]);
    rebuildSkillProjection(db, characterId);

    // Remove Fighter — orphans the grant (S-TOMBSTONE's own guarantee, proved
    // above; relied on here rather than re-proved).
    updateClass(fighterId, null);

    // Acquire the SAME skill from ANOTHER source.
    const otherSourceId = otherActiveSource();
    db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, 'background_skill', 1, ?, 'active')`,
      [characterId, otherSourceId, skill],
    );
    rebuildSkillProjection(db, characterId);

    // RE-ADD FIGHTER. Must succeed — not a uniqueness violation, not a
    // refusal to re-add. An insert-shaped (rather than revive-shaped) arm
    // throws here, inside the generator's own transaction.
    expect(() => updateClass(fighterId, 5)).not.toThrow();

    // The class re-added successfully.
    expect(
      db.scalar(
        `SELECT level FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, fighterId],
      ),
    ).toBe(5);

    // THE REVIVING GRANT COMES BACK ACTIVE AND UNFILLED — not a silent steal
    // of the other source's skill.
    expect(
      db.oneRaw(
        `SELECT state, skill FROM character_skill_grants WHERE id = ?`,
        [grantId],
      ),
    ).toEqual({ state: 'active', skill: null });

    // The OTHER source's grant is untouched.
    expect(
      db.oneRaw(
        `SELECT state, skill FROM character_skill_grants
         WHERE character_id = ? AND source_instance_id = ?`,
        [characterId, otherSourceId],
      ),
    ).toEqual({ state: 'active', skill });

    // The step reports the revived grant outstanding.
    const resolved = resolveSkillGrants(db, characterId);
    expect(
      resolved.unfilledClassGrants.some((grant) => grant.grant_id === grantId),
    ).toBe(true);
  });

  it('S-DISTINCT: a stale projection row does not reach the grants-reading sheet', () => {
    // A projection row with NO corresponding active grant — the shape a desync
    // between the projection and its one deriving writer would leave behind.
    db.exec(
      `INSERT INTO character_skill_proficiencies (character_id, skill)
       VALUES (?, 'religion')`,
      [characterId],
    );

    expect(activeGrantedSkills(db, characterId)).not.toContain('religion');
    const sheet = new CharacterSheetBuilder(db).build(characterId);
    expect(
      sheet.skills.find((entry) => entry.skill === 'religion')?.proficient,
    ).toBe(false);
  });

  it('S-SOURCE: a grant with no source is refused at the constraint, and a producer always writes one', () => {
    // The constraint limb: the required source is the whole point of the
    // table (§3.1), and NOT NULL is what enforces it against any writer that
    // skips the producers. `S-SOURCE`'s mutation drops the NOT NULL AND makes
    // a producer write null — either half alone would leave the other
    // unexercised.
    expect(() =>
      db.exec(
        `INSERT INTO character_skill_grants (
           character_id, source_instance_id, grant_key, ordinal, skill, state
         ) VALUES (?, NULL, 'background_skill', 1, 'religion', 'active')`,
        [characterId],
      ),
    ).toThrow(/NOT NULL/i);

    // The producer limb: every grant the mint writes carries the source it
    // was given, never an unattributed row.
    const sourceId = otherActiveSource();
    mintFilledSkillGrants(db, characterId, sourceId, 'background_skill', [
      'religion',
      'insight',
    ]);
    const sources = db
      .allRaw(
        `SELECT source_instance_id FROM character_skill_grants
         WHERE character_id = ?`,
        [characterId],
      )
      .map((row) => row.source_instance_id);
    expect(sources).toEqual([sourceId, sourceId]);
  });
});
