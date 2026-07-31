import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import {
  activeExpertiseSkills,
  fillSkillExpertiseGrant,
  reconcileCharacterSkillExpertise,
  resolveSkillExpertiseGrants,
} from '../../../src/grants/skill-expertise-grants';
import { fillSkillGrant } from '../../../src/grants/skill-grants';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';

describe('GF-2 Expertise grants', () => {
  let connection: Database | undefined;

  afterEach(() => {
    connection?.close();
    connection = undefined;
  });

  async function rogue(): Promise<{
    readonly db: DatabaseContext;
    readonly characterId: number;
  }> {
    connection = await openTestDatabase();
    const db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    const characterId = db.exec(
      `INSERT INTO characters (
         name, dexterity, proficiency_bonus_override,
         rules_edition_preference, allow_legacy
       ) VALUES ('GF-2 Rogue', 16, 2, '2024', 0)`,
    ).lastInsertId;
    const rogueId = Number(
      db.scalar(`SELECT id FROM class_definitions WHERE name = 'Rogue'`),
    );
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: rogueId },
      new CharacterCommandIntegrity('test-secret'),
    ).apply(characterId);
    return { db, characterId };
  }

  it('LU-EXPERTISE-MATH adds the proficiency bonus exactly twice for a trained active choice', async () => {
    const { db, characterId } = await rogue();
    const skillGrant = Number(
      db.scalar(
        `SELECT id FROM character_skill_grants
         WHERE character_id = ? AND grant_key = 'class_skill'
         ORDER BY ordinal LIMIT 1`,
        [characterId],
      ),
    );
    fillSkillGrant(db, characterId, skillGrant, 'stealth');
    reconcileCharacterSkillExpertise(db, characterId);
    const expertiseGrant = resolveSkillExpertiseGrants(db, characterId)
      .find((grant) => grant.state === 'active' && grant.skill === null);
    expect(expertiseGrant).toBeDefined();
    fillSkillExpertiseGrant(
      db,
      characterId,
      Number(expertiseGrant?.id),
      'stealth',
    );

    expect(activeExpertiseSkills(db, characterId)).toEqual(['stealth']);
    const stealth = new CharacterSheetBuilder(db)
      .build(characterId)
      .skills.find((skill) => skill.skill === 'stealth');
    // DEX +3 plus proficiency +2 plus Expertise +2. A mutation that halves
    // Expertise back to ordinary proficiency makes this named fixture fail.
    expect(stealth?.value).toBe(7);
  });

  it('tombstones and warns when the last underlying proficiency is removed', async () => {
    const { db, characterId } = await rogue();
    const skillGrant = Number(
      db.scalar(
        `SELECT id FROM character_skill_grants
         WHERE character_id = ? AND grant_key = 'class_skill'
         ORDER BY ordinal LIMIT 1`,
        [characterId],
      ),
    );
    fillSkillGrant(db, characterId, skillGrant, 'stealth');
    reconcileCharacterSkillExpertise(db, characterId);
    const expertiseGrant = resolveSkillExpertiseGrants(db, characterId)[0]!;
    fillSkillExpertiseGrant(db, characterId, expertiseGrant.id, 'stealth');

    fillSkillGrant(db, characterId, skillGrant, null);
    reconcileCharacterSkillExpertise(db, characterId);

    expect(resolveSkillExpertiseGrants(db, characterId)[0]).toMatchObject({
      skill: 'stealth',
      state: 'orphaned',
      orphan_reason_code: 'underlying_proficiency_removed',
    });
    expect(activeExpertiseSkills(db, characterId)).toEqual([]);
    expect(
      new CharacterCompletenessQueries(db)
        .build(characterId)
        .items,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'expertise_grant',
          orphaned: true,
          detail: expect.stringContaining('no longer proficient') as string,
        }),
      ]),
    );
    expect(
      new CharacterSheetBuilder(db)
        .build(characterId)
        .gaps.map((gap) => gap.kind),
    ).toContain('expertise_proficiency_removed');
  });
});
