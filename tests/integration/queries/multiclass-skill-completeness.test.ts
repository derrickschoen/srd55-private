import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  CharacterCompletenessQueries,
  type UnmadeMulticlassSkillChoiceItem,
} from '../../../src/queries/character-completeness';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * Hand-transcribed from `docs/srd/source/skills-table.txt`, not produced by the
 * query under test. Performance is deliberately present: no class list contains
 * it, so it is the load-bearing proof that Bard draws from the vocabulary.
 */
const ALL_SKILLS = [
  'acrobatics',
  'animal_handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight_of_hand',
  'stealth',
  'survival',
] as const;

/** Hand-transcribed from the Core Ranger Traits table. */
const RANGER_SKILLS = [
  'animal_handling',
  'athletics',
  'insight',
  'investigation',
  'nature',
  'perception',
  'stealth',
  'survival',
] as const;

/** Hand-transcribed from the Core Rogue Traits table. */
const ROGUE_SKILLS = [
  'acrobatics',
  'athletics',
  'deception',
  'insight',
  'intimidation',
  'investigation',
  'perception',
  'persuasion',
  'sleight_of_hand',
  'stealth',
] as const;

/**
 * Q11 — THE MULTICLASS SKILL CHOICE AS A COMPLETENESS ITEM.
 *
 * THE ENTITLEMENT ARITHMETIC IS THE SUBJECT, and it is what was WRONG before
 * this change rather than merely absent. `noSkillProficiencies` summed every
 * class's FULL level-1 `skill_choice_count` with no reference to
 * `is_starting_class`, so the app told a Fighter 5 / Bard 1 they owed 5 skills
 * where the SRD grants 3. The Fighter/Bard fixture below is that exact case, and
 * the number is the first thing asserted.
 *
 * EVERY EXPECTED COUNT IS WORKED OUT IN THE COMMENT BESIDE IT from the two
 * extracts, never read back from the query.
 */
describe('the multiclass skill choice as an outstanding item', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function addClass(name: string, level: number, starting: boolean): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, ?)`,
      [characterId, classId(name), level, starting ? 1 : 0],
    );
  }

  function tickSkills(...skills: readonly string[]): void {
    for (const skill of skills) {
      db.exec(
        `INSERT INTO character_skill_proficiencies (character_id, skill)
         VALUES (?, ?)`,
        [characterId, skill],
      );
    }
  }

  function items() {
    return new CharacterCompletenessQueries(db).build(characterId).items;
  }

  function skillItem(): UnmadeMulticlassSkillChoiceItem | undefined {
    return items().find(
      (item): item is UnmadeMulticlassSkillChoiceItem =>
        item.kind === 'unmade_multiclass_skill_choice',
    );
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    characterId = db.exec(
      `INSERT INTO characters (name) VALUES ('Dipper')`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('counts a Fighter 5 / Bard 1 at THREE and not five', () => {
    // Fighter is the starting class, so its FULL count applies: "Choose 2"
    // (`class-core-traits.txt`, Fighter). The Bard was entered by
    // multiclassing, so only its entry clause applies: one skill
    // (`multiclass-entry-grants.txt:37-38`). 2 + 1 = 3.
    //
    // The old computation summed the Bard's FULL "Choose any 3" instead, giving
    // 2 + 3 = 5 — a number the player could act on and be wrong.
    addClass('Fighter', 5, true);
    addClass('Bard', 1, false);
    const item = skillItem();
    expect(item?.entitled).toBe(3);
    expect(item?.chosen).toBe(0);
    expect(item?.outstanding).toBe(3);
  });

  it('names the pool, so the Bard and the Ranger are told different things', () => {
    addClass('Fighter', 5, true);
    addClass('Bard', 1, false);
    expect(skillItem()?.entries).toEqual([
      {
        class_name: 'Bard',
        count: 1,
        pool: 'any',
        available_skills: ALL_SKILLS,
      },
    ]);
    expect(skillItem()?.entries[0]?.available_skills).toContain('performance');
    expect(skillItem()?.detail).toContain('Bard (1, any skill)');

    // Same shape of grant, same count, different pool — which is the whole
    // reason the entry skill needed a discriminator rather than a number.
    db.exec('DELETE FROM character_class_levels WHERE character_id = ?', [
      characterId,
    ]);
    addClass('Fighter', 5, true);
    addClass('Ranger', 1, false);
    expect(skillItem()?.entries).toEqual([
      {
        class_name: 'Ranger',
        count: 1,
        pool: 'class_list',
        available_skills: RANGER_SKILLS,
      },
    ]);
    expect(skillItem()?.detail).toContain(
      "Ranger (1, from the Ranger's own skill list)",
    );
  });

  it('offers the Rogue class list, enumerated exactly', () => {
    addClass('Fighter', 5, true);
    addClass('Rogue', 1, false);
    expect(skillItem()?.entries).toEqual([
      {
        class_name: 'Rogue',
        count: 1,
        pool: 'class_list',
        available_skills: ROGUE_SKILLS,
      },
    ]);
  });

  it('removes every skill the character already holds from the offer', () => {
    addClass('Fighter', 5, true);
    addClass('Ranger', 1, false);
    tickSkills('athletics', 'perception');
    expect(skillItem()?.entries[0]?.available_skills).toEqual([
      'animal_handling',
      'insight',
      'investigation',
      'nature',
      'stealth',
      'survival',
    ]);
  });

  it('requires the seeded count even when it is greater than one', () => {
    db.exec(
      `UPDATE class_sheet_traits
          SET multiclass_skill_choice_count = 2
        WHERE class_definition_id = ?`,
      [classId('Ranger')],
    );
    addClass('Fighter', 5, true);
    addClass('Ranger', 1, false);
    // The Fighter's two initial choices are already paid.
    tickSkills('arcana', 'history');
    expect(skillItem()).toMatchObject({
      outstanding: 2,
      entries: [
        {
          class_name: 'Ranger',
          count: 2,
          pool: 'class_list',
        },
      ],
    });
    tickSkills('perception');
    expect(skillItem()?.outstanding).toBe(1);
    tickSkills('stealth');
    expect(skillItem()).toBeUndefined();
  });

  it('swaps the entitlement when the starting class swaps', () => {
    // Bard FIRST: its full "Choose any 3" applies, and the Fighter contributes
    // only its entry clause — which grants NO skill at all
    // (`multiclass-entry-grants.txt:77-80`). 3 + 0 = 3, and no item, because no
    // multiclass ENTRY owes a skill.
    addClass('Bard', 1, true);
    addClass('Fighter', 5, false);
    expect(skillItem()).toBeUndefined();
    const noSkills = items().find(
      (item) => item.kind === 'no_skill_proficiencies',
    );
    expect(noSkills).toMatchObject({ choice_count: 3 });
  });

  it('goes quiet once enough skills are ticked', () => {
    addClass('Fighter', 5, true);
    addClass('Bard', 1, false);
    expect(skillItem()?.outstanding).toBe(3);
    tickSkills('athletics', 'perception');
    // NOT SILENCED BY THE FIRST TICK, which is the other half of the old
    // defect: `noSkillProficiencies` fired only at zero, so a character who
    // ticked one skill was never told they still owed four.
    expect(skillItem()?.outstanding).toBe(1);
    tickSkills('stealth');
    expect(skillItem()).toBeUndefined();
  });

  it("clears Bard's completeness item on the skill alone", () => {
    addClass('Fighter', 5, true);
    addClass('Bard', 1, false);
    tickSkills('arcana', 'history');
    expect(skillItem()?.outstanding).toBe(1);

    tickSkills('performance');
    expect(skillItem()).toBeUndefined();
  });

  it('counts EVERY tick, whatever granted it, and prints that limitation', () => {
    // A review measured this, and it is a stated limit rather than an error in
    // the arithmetic. `character_skill_proficiencies` has no provenance column,
    // so a skill ticked for a BACKGROUND — which this application does not model
    // at all — is indistinguishable from one ticked for a class grant, and pays
    // off a class grant here.
    //
    // The direction is SAFE: the item can only UNDER-report, never invent an
    // outstanding choice. What it must not do is print the ticked count as
    // though it were the class-sourced count without saying otherwise.
    addClass('Fighter', 5, true);
    addClass('Bard', 1, false);
    tickSkills('athletics', 'perception');
    const item = skillItem();
    expect(item?.entitled).toBe(3);
    expect(item?.chosen).toBe(2);
    expect(item?.detail).toContain(
      'including any ticked for a background or a species',
    );

    // A third tick silences the item whatever granted it. Pinned rather than
    // left implicit, so a future provenance column has to come back through
    // this test and change it deliberately.
    tickSkills('history');
    expect(skillItem()).toBeUndefined();
  });

  it('says nothing for a single-class character, however many they owe', () => {
    // Nine of twelve classes grant no entry skill, and a character who never
    // multiclassed has no entry at all. This item must not become a second
    // "you have not picked your skills" nag for everybody.
    addClass('Fighter', 5, true);
    expect(skillItem()).toBeUndefined();
  });

  it('says nothing when the second class grants no entry skill', () => {
    // Fighter 5 / Wizard 3. The Wizard's entry clause is the hit die alone
    // (`:166-167`), so nothing is owed beyond the Fighter's own two.
    addClass('Fighter', 5, true);
    addClass('Wizard', 3, false);
    expect(skillItem()).toBeUndefined();
    expect(
      items().find((item) => item.kind === 'no_skill_proficiencies'),
    ).toMatchObject({ choice_count: 2 });
  });

  it('offers no choice for each of the nine fixed-grant entries', () => {
    const fixedGrantClasses = [
      'Barbarian',
      'Cleric',
      'Druid',
      'Fighter',
      'Monk',
      'Paladin',
      'Sorcerer',
      'Warlock',
      'Wizard',
    ] as const;
    for (const className of fixedGrantClasses) {
      db.exec('DELETE FROM character_class_levels WHERE character_id = ?', [
        characterId,
      ]);
      addClass('Bard', 1, true);
      addClass(className, 1, false);
      expect(skillItem(), className).toBeUndefined();
    }
  });

  it('does not report both skill items for one character', () => {
    // The two partition the population: `no_skill_proficiencies` stands down
    // where this one speaks, because this one says everything it does and also
    // names the classes and their pools.
    addClass('Fighter', 5, true);
    addClass('Rogue', 1, false);
    const kinds = items().map((item) => item.kind);
    expect(kinds).toContain('unmade_multiclass_skill_choice');
    expect(kinds).not.toContain('no_skill_proficiencies');
  });

  it('still counts when no class is flagged as the starting one', () => {
    // `startingClass` degrades to the first row by class name — Bard here — and
    // still picks ONE, so the entitlement stays computable. A check that gave up
    // would leave the player with no number at all because of a flag they cannot
    // see; one that gave every class its full count would say 3 + 2 = 5 again.
    addClass('Fighter', 5, false);
    addClass('Bard', 1, false);
    // Bard full (3) + Fighter entry (0) = 3.
    expect(skillItem()).toBeUndefined();
    expect(
      items().find((item) => item.kind === 'no_skill_proficiencies'),
    ).toMatchObject({ choice_count: 3 });
  });

  it('counts a class with no traits row as ZERO without losing its place', () => {
    // A homebrew class's entitlement is genuinely unknown, and inventing 2 for
    // it would put a number the user cannot act on into an outstanding item.
    //
    // BUT IT MUST STILL BE THE STARTING CLASS. An inner join would have dropped
    // this row before the resolver saw it, promoted the Bard to starting class,
    // and credited it with its FULL "Choose any 3" — turning an unknown into a
    // wrong number about a different class. Here the Runeblade IS the starting
    // class, contributes 0, and the Bard contributes its ENTRY grant of one.
    const homebrew = db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('2024:class:runeblade', 'Runeblade', '2024')`,
    ).lastInsertId;
    addClass('Bard', 1, false);
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 1, 1)`,
      [characterId, homebrew],
    );
    const item = skillItem();
    expect(item?.entitled).toBe(1);
    expect(item?.entries).toEqual([
      {
        class_name: 'Bard',
        count: 1,
        pool: 'any',
        available_skills: ALL_SKILLS,
      },
    ]);
  });
});
