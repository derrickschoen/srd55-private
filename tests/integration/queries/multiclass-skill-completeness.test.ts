import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import {
  CharacterCompletenessQueries,
  type UnfilledSkillGrantsItem,
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
 * THE SKILL CHOICES AS PER-GRANT COMPLETENESS ITEMS (skills-with-provenance
 * §3.3, dispatch S-C).
 *
 * RETARGETED WHOLE from the count-based semantics this file used to pin:
 * classes are added through the REAL `UpdateClassCommand` — the path that
 * mints `character_skill_grants` — and choices are made through the REAL
 * `fill_skill_grant` executor path, never by inserting flat proficiency rows.
 * The entitlement arithmetic (starting class full count, entered class entry
 * count) now lives in the GENERATOR's class arm; what completeness owes is
 * reporting each minted, unfilled grant as outstanding, per grant.
 *
 * ONE TEST FROM THE OLD FILE IS DELETED, NOT RETARGETED — the plan's single
 * authorised deletion (§7): "counts EVERY tick, whatever granted it" pinned
 * the silencing this unit removes (a background tick paying off a class
 * grant). Its replacement subject — a Fighter with a skill-granting
 * background still owing two class choices — is asserted end to end in
 * `tests/integration/builder/guided-skills-step.test.ts`, where the real
 * background producer exists.
 *
 * EVERY EXPECTED COUNT IS WORKED OUT IN THE COMMENT BESIDE IT from the two
 * extracts, never read back from the query.
 */
describe('skill grants as outstanding items', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function addClass(name: string, level: number): void {
    new UpdateClassCommand(
      db,
      {
        type: 'update_class',
        class_definition_id: classId(name),
        level,
      },
      integrity,
    ).apply(characterId);
  }

  async function fillGrant(grantId: number, skill: Skill): Promise<void> {
    const revision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
    );
    await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision,
      command: { type: 'fill_skill_grant', grant_id: grantId, skill },
    });
  }

  function items() {
    return new CharacterCompletenessQueries(db).build(characterId).items;
  }

  function skillItems(): UnfilledSkillGrantsItem[] {
    return items().filter(
      (item): item is UnfilledSkillGrantsItem =>
        item.kind === 'unfilled_skill_grants',
    );
  }

  function skillItemFor(sourceName: string): UnfilledSkillGrantsItem | undefined {
    return skillItems().find((item) => item.source_name === sourceName);
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    integrity = new CharacterCommandIntegrity('skill-completeness-test-key');
    seedClassProgressions(db);
    seedSheetContent(db);
    characterId = db.exec(
      `INSERT INTO characters (name) VALUES ('Dipper')`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('reports a Fighter 5 / Bard 1 as owing THREE choices, each addressed to its own source', () => {
    // Fighter is the starting class, so its FULL count applies: "Choose 2"
    // (`class-core-traits.txt`, Fighter). The Bard was entered by
    // multiclassing, so only its entry clause applies: one skill
    // (`multiclass-entry-grants.txt:37-38`). 2 + 1 = 3 — as THREE addressable
    // grants in TWO per-source groups, never one pooled number.
    addClass('Fighter', 5);
    addClass('Bard', 1);
    const fighter = skillItemFor('Fighter 5');
    const bard = skillItemFor('Bard 1');
    expect(fighter).toMatchObject({
      grant_key: 'class_skill',
      chosen: 0,
      required: 2,
      missing: 2,
    });
    expect(bard).toMatchObject({
      grant_key: 'multiclass_skill',
      chosen: 0,
      required: 1,
      missing: 1,
    });
    expect(
      skillItems().reduce((sum, item) => sum + item.missing, 0),
    ).toBe(3);
  });

  it('offers the Bard grant the whole vocabulary, including Performance', () => {
    addClass('Fighter', 5);
    addClass('Bard', 1);
    expect(
      skillItemFor('Bard 1')?.grants.map((grant) => grant.available_skills),
    ).toEqual([ALL_SKILLS]);
    expect(
      skillItemFor('Bard 1')?.grants[0]?.available_skills,
    ).toContain('performance');
  });

  it("offers the Ranger grant the Ranger's own list — same shape, different pool", () => {
    addClass('Fighter', 5);
    addClass('Ranger', 1);
    expect(
      skillItemFor('Ranger 1')?.grants.map((grant) => grant.available_skills),
    ).toEqual([RANGER_SKILLS]);
  });

  it('offers the Rogue class list, enumerated exactly', () => {
    addClass('Fighter', 5);
    addClass('Rogue', 1);
    expect(
      skillItemFor('Rogue 1')?.grants.map((grant) => grant.available_skills),
    ).toEqual([ROGUE_SKILLS]);
  });

  it('removes every held skill from the offer, without reducing the unfilled count', async () => {
    addClass('Fighter', 5);
    addClass('Ranger', 1);
    const fighter = skillItemFor('Fighter 5');
    await fillGrant(fighter!.grants[0]!.grant_id, 'athletics');
    await fillGrant(fighter!.grants[1]!.grant_id, 'perception');
    // §3.3's two halves in one assertion: the held skills leave the Ranger's
    // AVAILABLE list, and the Ranger's ordinal stays outstanding.
    expect(skillItemFor('Ranger 1')).toMatchObject({ missing: 1 });
    expect(skillItemFor('Ranger 1')?.grants[0]?.available_skills).toEqual([
      'animal_handling',
      'insight',
      'investigation',
      'nature',
      'stealth',
      'survival',
    ]);
  });

  it('mints and requires the seeded count even when it is greater than one', async () => {
    // Traits are edited BEFORE the class is added: the generator mints grants
    // when the source is created, from the structured entitlement.
    db.exec(
      `UPDATE class_sheet_traits
          SET multiclass_skill_choice_count = 2
        WHERE class_definition_id = ?`,
      [classId('Ranger')],
    );
    addClass('Fighter', 5);
    addClass('Ranger', 1);
    const ranger = skillItemFor('Ranger 1');
    expect(ranger).toMatchObject({ required: 2, missing: 2 });

    await fillGrant(ranger!.grants[0]!.grant_id, 'perception');
    expect(skillItemFor('Ranger 1')).toMatchObject({
      chosen: 1,
      missing: 1,
    });
    await fillGrant(
      skillItemFor('Ranger 1')!.grants[0]!.grant_id,
      'stealth',
    );
    expect(skillItemFor('Ranger 1')).toBeUndefined();
  });

  it('swaps the entitlement when the starting class swaps', () => {
    // Bard FIRST: its full "Choose any 3" applies, and the Fighter contributes
    // only its entry clause — which grants NO skill at all
    // (`multiclass-entry-grants.txt:77-80`). 3 + 0 = 3, all under the Bard.
    addClass('Bard', 1);
    addClass('Fighter', 5);
    expect(skillItemFor('Fighter 5')).toBeUndefined();
    expect(skillItemFor('Bard 1')).toMatchObject({
      grant_key: 'class_skill',
      required: 3,
      missing: 3,
    });
  });

  it('stays outstanding through partial fills and goes quiet only when every grant is filled', async () => {
    addClass('Fighter', 5);
    addClass('Bard', 1);
    await fillGrant(
      skillItemFor('Fighter 5')!.grants[0]!.grant_id,
      'athletics',
    );
    // NOT SILENCED BY THE FIRST CHOICE: the Fighter still owes one and the
    // Bard still owes one, each against its own source.
    expect(skillItemFor('Fighter 5')).toMatchObject({ chosen: 1, missing: 1 });
    expect(skillItemFor('Bard 1')).toMatchObject({ missing: 1 });

    await fillGrant(
      skillItemFor('Fighter 5')!.grants[0]!.grant_id,
      'perception',
    );
    expect(skillItemFor('Fighter 5')).toBeUndefined();
    expect(skillItemFor('Bard 1')).toMatchObject({ missing: 1 });

    await fillGrant(
      skillItemFor('Bard 1')!.grants[0]!.grant_id,
      'performance',
    );
    expect(skillItems()).toEqual([]);
  });

  it('reports a single-class character per grant too — two Fighter choices, addressed', () => {
    // The retired `no_skill_proficiencies` fired only at zero ticks and
    // silenced on the first; the per-grant item reports both Fighter ordinals
    // until each is filled, with its own grant id.
    addClass('Fighter', 5);
    const fighter = skillItemFor('Fighter 5');
    expect(fighter).toMatchObject({ required: 2, missing: 2 });
    expect(fighter?.grants.map((grant) => grant.ordinal)).toEqual([1, 2]);
    expect(
      new Set(fighter?.grants.map((grant) => grant.grant_id)).size,
    ).toBe(2);
  });

  it('mints nothing for a second class whose entry clause grants no skill', () => {
    // Fighter 5 / Wizard 3. The Wizard's entry clause is the hit die alone
    // (`:166-167`), so nothing is owed beyond the Fighter's own two.
    addClass('Fighter', 5);
    addClass('Wizard', 3);
    expect(skillItemFor('Wizard 3')).toBeUndefined();
    expect(skillItemFor('Fighter 5')).toMatchObject({ missing: 2 });
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
    addClass('Bard', 1);
    for (const className of fixedGrantClasses) {
      addClass(className, 1);
      expect(skillItemFor(`${className} 1`), className).toBeUndefined();
      // Remove again so the next class enters as a multiclass too.
      new UpdateClassCommand(
        db,
        {
          type: 'update_class',
          class_definition_id: classId(className),
          level: null,
        },
        integrity,
      ).apply(characterId);
    }
  });

  it('reads GRANTS, not flags: a hand-cleared starting flag does not change what was minted', () => {
    // Completeness no longer computes entitlement from `is_starting_class`;
    // the grants are the record of what the generator minted. A hand edit to
    // the flag after the fact changes nothing the player is told.
    addClass('Fighter', 5);
    addClass('Bard', 1);
    db.exec(
      'UPDATE character_class_levels SET is_starting_class = 0 WHERE character_id = ?',
      [characterId],
    );
    expect(skillItemFor('Fighter 5')).toMatchObject({ missing: 2 });
    expect(skillItemFor('Bard 1')).toMatchObject({ missing: 1 });
  });

  it('mints nothing for a class with no traits row, without losing the entered class', () => {
    // A homebrew class's entitlement is genuinely unknown, and inventing 2
    // for it would put a number the user cannot act on into an outstanding
    // item (D33). It must still BE the starting class, so the Bard entered
    // second contributes its ENTRY grant of one — from the whole vocabulary.
    db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('2024:class:runeblade', 'Runeblade', '2024')`,
    );
    addClass('Runeblade', 1);
    addClass('Bard', 1);
    const bard = skillItemFor('Bard 1');
    expect(skillItems()).toHaveLength(1);
    expect(bard).toMatchObject({
      grant_key: 'multiclass_skill',
      missing: 1,
    });
    expect(bard?.grants[0]?.available_skills).toEqual(ALL_SKILLS);
  });
});
