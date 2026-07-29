import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import {
  activeGrantedSkills,
  resolveSkillGrants,
  SkillGrantRefusal,
} from '../../../src/grants/skill-grants';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE FILL COMMAND (skills-with-provenance §3.3/§3.6, dispatch S-B), through
 * the REAL command executor — revision check, idempotency envelope, precise
 * inverse — against real seeded SRD entitlement data.
 *
 * THE SUBJECT THAT MATTERS MOST IS ADDRESSING (§5's second trap): with two
 * entered classes whose pools overlap, filling through one class's grant id
 * must fill THAT class's ordinal and leave the other's unfilled. An
 * implementation that fills "whichever grant is available" produces the right
 * skill totals, the right outstanding count, and a faithful round trip of the
 * WRONG provenance — `S-GRANT-IDENTITY` is that trap made executable, and the
 * Fighter/Bard case here is its fixture: Fighter starts (choose 2 from its
 * printed list), Bard enters by multiclass (one skill, pool ANY —
 * `multiclass-entry-grants.txt`), so every Fighter-pool skill is legal for
 * BOTH grants.
 */
describe('fill_skill_grant through the real executor', () => {
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

  function updateClass(name: string, level: number | null): void {
    // `update_class` no longer carries a level (level-up plan §3): entry is
    // at 1, removal is `remove: true`, and a higher fixture level is a
    // direct fixture write — see `raiseClassLevelForTest`.
    if (level === null) {
      new UpdateClassCommand(
        db,
        {
          type: 'update_class',
          class_definition_id: classId(name),
          remove: true,
        },
        integrity,
      ).apply(characterId);
      return;
    }
    new UpdateClassCommand(
      db,
      {
        type: 'update_class',
        class_definition_id: classId(name),
      },
      integrity,
    ).apply(characterId);
    if (level > 1) {
      raiseClassLevelForTest(db, characterId, classId(name), level);
    }
  }

  function grantId(className: string, grantKey: string, ordinal: number): number {
    return Number(
      db.scalar(
        `SELECT g.id FROM character_skill_grants AS g
         INNER JOIN character_source_instances AS s
           ON s.id = g.source_instance_id
         WHERE g.character_id = ? AND s.source_type = 'class'
           AND s.source_definition_id = ? AND g.grant_key = ?
           AND g.ordinal = ?`,
        [characterId, classId(className), grantKey, ordinal],
      ),
    );
  }

  function grantRow(id: number) {
    return db.oneRaw(
      `SELECT skill, state, source_instance_id
       FROM character_skill_grants WHERE id = ?`,
      [id],
    );
  }

  function revision(): number {
    return Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
    );
  }

  async function fill(grant: number, skill: Skill | null) {
    return new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision(),
      command: { type: 'fill_skill_grant', grant_id: grant, skill },
    });
  }

  async function refusalOf(
    grant: number,
    skill: Skill | null,
  ): Promise<SkillGrantRefusal> {
    try {
      await fill(grant, skill);
    } catch (error) {
      if (error instanceof SkillGrantRefusal) {
        return error;
      }
      throw error;
    }
    throw new Error('Expected a SkillGrantRefusal and none was thrown.');
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    integrity = new CharacterCommandIntegrity('fill-skill-grant-test-key');
    seedClassProgressions(db);
    seedSheetContent(db);
    characterId = db.exec(
      `INSERT INTO characters (name, strength) VALUES ('Fill Hero', 15)`,
    ).lastInsertId;
    updateClass('Fighter', 5);
  });

  afterEach(() => connection.close());

  it('fills exactly the ADDRESSED grant and leaves overlapping grants of the other class unfilled (S-GRANT-IDENTITY)', async () => {
    updateClass('Bard', 1);
    const pool = classSkillPool('Fighter');
    expect(pool.length).toBeGreaterThan(0);
    const shared = pool[0]! as Skill;
    const bardGrant = grantId('Bard', 'multiclass_skill', 1);
    const fighterFirst = grantId('Fighter', 'class_skill', 1);
    const fighterSecond = grantId('Fighter', 'class_skill', 2);
    expect(bardGrant).toBeGreaterThan(0);

    // Fill through the BARD's addressed grant, with a skill legal for both
    // (Bard's entry pool is ANY, so every Fighter skill overlaps).
    await fill(bardGrant, shared);

    // The Bard ordinal holds it; BOTH Fighter ordinals are still unfilled —
    // right provenance, not merely right totals.
    expect(grantRow(bardGrant)).toMatchObject({ skill: shared, state: 'active' });
    expect(grantRow(fighterFirst)).toMatchObject({ skill: null });
    expect(grantRow(fighterSecond)).toMatchObject({ skill: null });
    const unfilled = resolveSkillGrants(db, characterId).unfilledClassGrants;
    expect(
      unfilled.map((grant) => grant.grant_id).sort((a, b) => a - b),
    ).toEqual([fighterFirst, fighterSecond].sort((a, b) => a - b));
    expect(activeGrantedSkills(db, characterId)).toContain(shared);
    // The projection derived the fill.
    expect(
      db
        .allRaw(
          `SELECT skill FROM character_skill_proficiencies
           WHERE character_id = ?`,
          [characterId],
        )
        .map((row) => String(row.skill)),
    ).toContain(shared);
  });

  it('refuses a skill outside the addressed class pool with the NAMED skill_not_in_pool (S-POOL subject)', async () => {
    const pool = new Set(classSkillPool('Fighter'));
    // Fighter's printed list omits at least one of the eighteen; find one.
    const outside = (
      ['arcana', 'medicine', 'nature', 'religion', 'performance'] as const
    ).find((skill) => !pool.has(skill));
    if (outside === undefined) {
      throw new Error(
        'Fighter unexpectedly offers every probe skill; the fixture cannot observe the pool.',
      );
    }
    const refusal = await refusalOf(grantId('Fighter', 'class_skill', 1), outside);
    expect(refusal.reason).toBe('skill_not_in_pool');
    expect(refusal.skill).toBe(outside);
    expect(grantRow(grantId('Fighter', 'class_skill', 1))).toMatchObject({
      skill: null,
    });
  });

  it('refuses an overwrite with grant_already_filled; clearing then refilling succeeds (§3.3 CLEAR)', async () => {
    const pool = classSkillPool('Fighter');
    const first = pool[0]! as Skill;
    const second = pool[1]! as Skill;
    const grant = grantId('Fighter', 'class_skill', 1);

    await fill(grant, first);
    const refusal = await refusalOf(grant, second);
    expect(refusal.reason).toBe('grant_already_filled');

    await fill(grant, null);
    expect(grantRow(grant)).toMatchObject({ skill: null, state: 'active' });
    expect(activeGrantedSkills(db, characterId)).not.toContain(first);
    await fill(grant, second);
    expect(grantRow(grant)).toMatchObject({ skill: second });
  });

  it('refuses a skill another active grant already holds, NAMING it (skill_already_held)', async () => {
    const pool = classSkillPool('Fighter');
    const held = pool[0]! as Skill;
    await fill(grantId('Fighter', 'class_skill', 1), held);

    const refusal = await refusalOf(grantId('Fighter', 'class_skill', 2), held);
    expect(refusal.reason).toBe('skill_already_held');
    expect(refusal.skill).toBe(held);
  });

  it('refuses an orphaned grant and a foreign grant alike as grant_not_found', async () => {
    const pool = classSkillPool('Fighter');
    const skill = pool[0]! as Skill;
    const grant = grantId('Fighter', 'class_skill', 1);
    await fill(grant, skill);

    // Remove Fighter: the grant orphans (S-A's tombstone path) and is no
    // longer addressable — filling it would resurrect retired provenance.
    updateClass('Fighter', null);
    const orphaned = await refusalOf(grant, skill);
    expect(orphaned.reason).toBe('grant_not_found');

    // Another character's grant id is equally not-found for THIS character.
    const otherId = db.exec(
      `INSERT INTO characters (name) VALUES ('Other Owner')`,
    ).lastInsertId;
    const other = new UpdateClassCommand(
      db,
      {
        type: 'update_class',
        class_definition_id: classId('Fighter'),
      },
      integrity,
    );
    other.apply(otherId);
    const foreignGrant = Number(
      db.scalar(
        `SELECT id FROM character_skill_grants WHERE character_id = ?
         ORDER BY id LIMIT 1`,
        [otherId],
      ),
    );
    const foreign = await refusalOf(foreignGrant, skill);
    expect(foreign.reason).toBe('grant_not_found');
  });

  it('stores the PRECISE inverse: undoing a fill clears it, undoing a clear restores the displaced skill', async () => {
    const pool = classSkillPool('Fighter');
    const skill = pool[0]! as Skill;
    const grant = grantId('Fighter', 'class_skill', 1);

    const filled = await fill(grant, skill);
    expect(filled.inverse).toEqual({
      type: 'fill_skill_grant',
      grant_id: grant,
      skill: null,
    });

    const cleared = await fill(grant, null);
    expect(cleared.inverse).toEqual({
      type: 'fill_skill_grant',
      grant_id: grant,
      skill,
    });

    // Execute the stored inverse of the clear: the fill comes back.
    await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision(),
      command: cleared.inverse,
    });
    expect(grantRow(grant)).toMatchObject({ skill });
  });
});
