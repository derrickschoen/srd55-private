import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { LevelUpClassCommand } from '../../../src/commands/level-up-class';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { GrantRule } from '../../../src/grants/grant-rule';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { ChooseFightingStyleCommand } from '../../../src/commands/choose-fighting-style';
import { guidedRequiredFighterChoicesState } from '../../../src/builder/required-fighter-choices';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { ensureBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import { normalizeContentIdentityName } from '../../../src/catalog/content-identity';
import { openTestDatabase } from '../../helpers/open-db';
import { raiseClassLevelForTest } from '../../helpers/class-levels';

/**
 * CHAMPION LEVEL 7 — "ADDITIONAL FIGHTING STYLE".
 *
 * SRD 5.2.1, Fighter Subclass: Champion, printed page 52
 * (`docs/srd/full/srd-5.2.1.txt` lines 2993-2994):
 *
 *   Level 7: Additional Fighting Style
 *   You gain another Fighting Style feat of your choice.
 *
 * The seed carries this as a REAL grant rule on the Champion subclass —
 * `grant_source` over a feat whose definition comes from the source instance's
 * own config, the shape the four backgrounds already use for their Origin
 * feat. So the entitlement, the choice and the resulting feat all travel the
 * existing generator path.
 *
 * The controls, and the mutation each one catches:
 *
 *  - CHAMP-L7-GRANTED: a Champion at Fighter 7 is entitled and the chosen feat
 *    materialises as a real active feat source parented to the subclass.
 *    Delete the seeded rule and this fails.
 *  - CHAMP-L6-NOT-YET: the SAME Champion at Fighter 6 is not entitled. Drop
 *    `active_from_class_level` from the rule and this fails.
 *  - CHAMP-NOT-EVERY-SUBCLASS: a Fighter 7 whose subclass does NOT carry the
 *    rule is not entitled. Decide the entitlement from "Fighter level >= 7"
 *    instead of from the subclass's rules and this fails.
 *  - CHAMP-L7-ANOTHER: the pool excludes the style already held, because the
 *    SRD says ANOTHER Fighting Style feat and a Fighting Style feat is not
 *    Repeatable. Drop the exclusion and this fails.
 *  - CHAMP-L7-NAGS: completeness reports the unmade choice and stops once it
 *    is made. Drop the completeness arm and this fails.
 */
describe('Champion level 7 additional Fighting Style', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function subclassId(contentKey: string): number {
    return Number(
      db.scalar('SELECT id FROM subclass_definitions WHERE content_key = ?', [
        contentKey,
      ]),
    );
  }

  /** Enters Fighter, attaches a subclass, and lands on the given level. */
  function fighterWithSubclass(
    subclassDefinitionId: number | null,
    level: number,
  ): void {
    new UpdateClassCommand(
      db,
      {
        type: 'update_class',
        class_definition_id: classId('Fighter'),
        ...(subclassDefinitionId === null
          ? {}
          : { subclass_definition_id: subclassDefinitionId }),
      },
      integrity,
    ).apply(characterId);
    raiseClassLevelForTest(db, characterId, classId('Fighter'), level);
  }

  function fighterState() {
    const state = guidedRequiredFighterChoicesState(db, characterId);
    if (state.fighter === null) {
      throw new Error('The fixture character is not a Fighter.');
    }
    return state.fighter;
  }

  function chooseStyle(featContentKey: string): void {
    new ChooseFightingStyleCommand(
      db,
      { type: 'choose_fighting_style', feat_content_key: featContentKey },
      integrity,
    ).apply(characterId);
  }

  /** The level-1 Fighting Style, recorded first so the extra one is next. */
  function recordBaseStyle(): string {
    const first = fighterState().fighting_style.options[0];
    if (first === undefined) {
      throw new Error('No Fighting Style feat is installed.');
    }
    chooseStyle(first.content_key);
    return first.content_key;
  }

  /**
   * A Fighter subclass that carries NO grant rules. Inserted directly because
   * its whole job is to be the other case: a Fighter who reaches level 7
   * without the Champion's feature must gain nothing.
   */
  function plainFighterSubclassId(): number {
    const contentKey = '2024:subclass:plain-fighter';
    ensureBundledStableContentIdentity(db, {
      kind: 'subclass',
      contentKey,
      normalizedName: normalizeContentIdentityName('Plain Fighter'),
    });
    return db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition, grant_rules
       ) VALUES (?, ?, 'Plain Fighter', '2024', NULL)`,
      [contentKey, classId('Fighter')],
    ).lastInsertId;
  }

  function fightingStyleFeatSources(): readonly Record<string, unknown>[] {
    return db.allRaw(
      `SELECT definition.content_key AS content_key,
              source.state AS state,
              parent.source_type AS parent_source_type
       FROM character_source_instances AS source
       JOIN feat_definitions AS definition
         ON definition.id = source.source_definition_id
       LEFT JOIN character_source_instances AS parent
         ON parent.id = source.parent_source_instance_id
       WHERE source.character_id = ?
         AND source.source_type = 'feat'
         AND definition.category = 'fighting_style'
       ORDER BY source.id`,
      [characterId],
    );
  }

  function outstandingTitles(): string[] {
    return new CharacterCompletenessQueries(db)
      .build(characterId)
      .items.map((item) => item.title);
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
    integrity = new CharacterCommandIntegrity('champion-l7-test-key');
    characterId = db.exec(
      `INSERT INTO characters (
         name, constitution, ability_allocation_method
       ) VALUES ('Champion Fixture', 14, 'manual')`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('seeds the rule on Champion and nowhere else (CHAMP-L7-GRANTED)', () => {
    const stored: unknown = JSON.parse(
      String(
        db.scalar(
          'SELECT grant_rules FROM subclass_definitions WHERE content_key = ?',
          ['2024:subclass:champion'],
        ),
      ),
    );
    expect(stored).toEqual([
      {
        kind: 'grant_source',
        rule_key: 'champion-additional-fighting-style',
        source_type: 'feat',
        definition_key_config: 'additional_fighting_style_key',
        child_config_config: 'additional_fighting_style_config',
        active_from_class_level: 7,
        allows_pending_choice: true,
        count: 1,
        always_prepared: false,
        with_slots: true,
        free_cast: null,
      },
    ]);
  });

  it('entitles a Champion at Fighter 7 and materialises the chosen feat (CHAMP-L7-GRANTED)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 7);
    const baseKey = recordBaseStyle();

    const additional = fighterState().additional_fighting_style;
    expect(additional.state).toBe('entitled');
    if (additional.state !== 'entitled') return;
    expect(additional.subclass_name).toBe('Champion');
    expect(additional.chosen).toBeNull();

    const extra = additional.options[0];
    if (extra === undefined) throw new Error('No second style is offered.');
    expect(extra.content_key).not.toBe(baseKey);
    chooseStyle(extra.content_key);

    const after = fighterState();
    expect(after.additional_fighting_style.state === 'entitled' &&
      after.additional_fighting_style.chosen?.content_key).toBe(
      extra.content_key,
    );

    // The chosen feat is a REAL source instance produced by the generator, a
    // child of the subclass source the rule lives on — not a display string.
    expect(fightingStyleFeatSources()).toEqual([
      {
        content_key: baseKey,
        state: 'active',
        parent_source_type: 'class',
      },
      {
        content_key: extra.content_key,
        state: 'active',
        parent_source_type: 'subclass',
      },
    ]);
  });

  it('does not entitle the same Champion at Fighter 6 (CHAMP-L6-NOT-YET)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 6);
    recordBaseStyle();
    expect(fighterState().additional_fighting_style).toEqual({
      state: 'not_entitled',
    });
    expect(fightingStyleFeatSources()).toHaveLength(1);
    // The level-1 obligation is the only one; completeness must not invent a
    // second one before level 7.
    expect(outstandingTitles()).not.toContain(
      'Champion — Additional Fighting Style not chosen',
    );
  });

  it('does not entitle a Fighter 7 whose subclass lacks the rule (CHAMP-NOT-EVERY-SUBCLASS)', () => {
    fighterWithSubclass(plainFighterSubclassId(), 7);
    recordBaseStyle();
    expect(fighterState().additional_fighting_style).toEqual({
      state: 'not_entitled',
    });
    expect(fightingStyleFeatSources()).toHaveLength(1);
    expect(() => chooseStyle(fighterState().fighting_style.options[1]!.content_key))
      .toThrow(/already recorded/u);
  });

  it('offers ANOTHER style, never the one already held (CHAMP-L7-ANOTHER)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 7);
    const allKeys = fighterState().fighting_style.options.map(
      (option) => option.content_key,
    );
    expect(allKeys.length).toBeGreaterThan(1);
    const baseKey = recordBaseStyle();

    const additional = fighterState().additional_fighting_style;
    if (additional.state !== 'entitled') {
      throw new Error('The Champion is not entitled.');
    }
    expect(additional.options.map((option) => option.content_key)).toEqual(
      allKeys.filter((key) => key !== baseKey),
    );
    expect(() => chooseStyle(baseKey)).toThrow(
      /not available for this subclass/u,
    );
  });

  /**
   * CHAMP-L7-LEVELUP — the production path, through the real command.
   *
   * The rule becomes ACTIVE the instant Fighter 6 becomes Fighter 7, and the
   * config naming the chosen feat cannot possibly be written yet.
   * `level_up_class` reconciles the subclass source inside its own
   * transaction, so a generator that treated the unwritten config as a fault
   * took the whole level-up down with it — the level-up refusing to happen
   * because a choice it grants has not been made.
   *
   * The fixture-path tests above cannot catch this: `raiseClassLevelForTest`
   * writes the level row and regenerates only the CLASS source, never the
   * subclass one. This test takes no fixture shortcut across that boundary.
   */
  it('survives a real Fighter 6 → 7 level-up with the choice outstanding (CHAMP-L7-LEVELUP)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 6);
    recordBaseStyle();
    expect(fighterState().additional_fighting_style).toEqual({
      state: 'not_entitled',
    });

    new LevelUpClassCommand(
      db,
      {
        type: 'level_up_class',
        class_definition_id: classId('Fighter'),
        target_level: 7,
      },
      integrity,
    ).apply(characterId);

    // The transaction committed: the level really moved, nothing rolled back.
    expect(
      Number(
        db.scalar(
          `SELECT level FROM character_class_levels
           WHERE character_id = ? AND class_definition_id = ?`,
          [characterId, classId('Fighter')],
        ),
      ),
    ).toBe(7);

    // The entitlement is now outstanding, with NOTHING materialised for it.
    const owed = fighterState().additional_fighting_style;
    expect(owed.state).toBe('entitled');
    if (owed.state !== 'entitled') return;
    expect(owed.chosen).toBeNull();
    expect(fightingStyleFeatSources()).toHaveLength(1);
    expect(outstandingTitles()).toContain(
      'Champion — Additional Fighting Style not chosen',
    );

    // And the choice, made afterwards, materialises the real feat source.
    const extra = owed.options[0];
    if (extra === undefined) throw new Error('No second style is offered.');
    chooseStyle(extra.content_key);
    expect(fightingStyleFeatSources()).toEqual([
      expect.objectContaining({ parent_source_type: 'class' }),
      {
        content_key: extra.content_key,
        state: 'active',
        parent_source_type: 'subclass',
      },
    ]);
  });

  /**
   * The other half of the owed state: an unwritten config must mean "nothing
   * granted", never "keep whatever was granted before". Clearing the choice
   * has to withdraw the feat through the existing reconcile path.
   */
  it('withdraws the granted feat when the choice is cleared (CHAMP-L7-LEVELUP)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 7);
    recordBaseStyle();
    const owed = fighterState().additional_fighting_style;
    if (owed.state !== 'entitled') throw new Error('Not entitled.');
    chooseStyle(owed.options[0]!.content_key);
    expect(fightingStyleFeatSources()).toHaveLength(2);

    db.exec(
      `UPDATE character_source_instances SET config = '{}' WHERE id = ?`,
      [owed.source_instance_id],
    );
    new GrantRuleSlotGenerator(db).generateForSource(owed.source_instance_id);

    expect(fightingStyleFeatSources()).toEqual([
      expect.objectContaining({ state: 'active', parent_source_type: 'class' }),
      expect.objectContaining({ parent_source_type: 'subclass' }),
    ]);
    expect(fightingStyleFeatSources()[1]!.state).not.toBe('active');
    expect(fighterState().additional_fighting_style).toEqual(
      expect.objectContaining({ state: 'entitled', chosen: null }),
    );
  });

  /**
   * THE OWED-CHOICE SILENCE IS OPT-IN, AND EVERY OTHER DELEGATING RULE STAYS
   * LOUD.
   *
   * A skip that applied to ANY absent delegated key would have bought the
   * Champion's correctness with everyone else's: only the Champion has an
   * entitlement record and a completeness nag, so anywhere else
   * "materialise nothing" means "grant nothing, forever, with nobody told".
   * These are the cases a blanket skip would have swallowed.
   */
  it('still refuses a background added with no Origin feat chosen', () => {
    // `add_source` validates and persists the config BEFORE generating, so an
    // empty config reaches the generator with the background's seeded
    // grant_source rule already active. That rule declares no pending choice,
    // so it must refuse rather than silently grant no Origin feat.
    const backgroundId = Number(
      db.scalar('SELECT id FROM background_definitions ORDER BY id LIMIT 1'),
    );
    expect(backgroundId).toBeGreaterThan(0);
    expect(() =>
      new AddSourceCommand(
        db,
        {
          type: 'add_source',
          source_type: 'background',
          source_definition_id: backgroundId,
          config: {},
        },
        integrity,
      ).apply(characterId),
    ).toThrow(/could not resolve its definition/u);
  });

  it('still refuses a delegating rule whose config PATH nothing writes', () => {
    // A mistyped PATH (not a mistyped VALUE) resolves to nothing, exactly like
    // an unmade choice. Undeclared, it is a fault, so it refuses — the same
    // Champion rule with its declaration removed and its path misspelt.
    const subclass = subclassId('2024:subclass:champion');
    db.exec(
      'UPDATE subclass_definitions SET grant_rules = ? WHERE id = ?',
      [
        JSON.stringify([
          {
            kind: 'grant_source',
            rule_key: 'champion-additional-fighting-style',
            source_type: 'feat',
            definition_key_config: 'aditional_fighting_style_key',
            active_from_class_level: 7,
          },
        ]),
        subclass,
      ],
    );
    fighterWithSubclass(subclass, 6);
    expect(() =>
      new LevelUpClassCommand(
        db,
        {
          type: 'level_up_class',
          class_definition_id: classId('Fighter'),
          target_level: 7,
        },
        integrity,
      ).apply(characterId),
    ).toThrow(/could not resolve its definition/u);
  });

  it('refuses to build a pending-choice rule that delegates nothing', () => {
    // The declaration is meaningless without `definition_key_config`, so it is
    // refused at the type's own boundary rather than sitting in a seed.
    expect(() =>
      GrantRule.fromObject({
        kind: 'grant_source',
        rule_key: 'nowhere',
        source_type: 'feat',
        source_definition_key: '2024:feat:defense',
        allows_pending_choice: true,
      }),
    ).toThrow(/without delegating its definition/u);
  });

  /**
   * A key that IS written but names nothing is still a fault. The owed-choice
   * skip must not swallow a dangling reference to missing content, even where
   * a pending choice IS declared.
   */
  it('still refuses a written key that resolves to no definition', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 7);
    const source = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'subclass' AND state = 'active'`,
        [characterId],
      ),
    );
    db.exec(
      `UPDATE character_source_instances
       SET config = '{"additional_fighting_style_key":"2024:feat:not-a-feat"}'
       WHERE id = ?`,
      [source],
    );
    expect(() =>
      new GrantRuleSlotGenerator(db).generateForSource(source),
    ).toThrow(/could not resolve its definition/u);
  });

  it('reports the unmade extra choice and stops once it is made (CHAMP-L7-NAGS)', () => {
    fighterWithSubclass(subclassId('2024:subclass:champion'), 7);
    recordBaseStyle();
    expect(outstandingTitles()).toContain(
      'Champion — Additional Fighting Style not chosen',
    );

    const additional = fighterState().additional_fighting_style;
    if (additional.state !== 'entitled') {
      throw new Error('The Champion is not entitled.');
    }
    chooseStyle(additional.options[0]!.content_key);
    expect(outstandingTitles()).not.toContain(
      'Champion — Additional Fighting Style not chosen',
    );
  });
});
