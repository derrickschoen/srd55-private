import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import {
  LevelUpClassCommand,
  LevelUpRefusal,
} from '../../../src/commands/level-up-class';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { CharacterState } from '../../../src/character/character-state';
import { DatabaseContext } from '../../../src/db/database';
import type {
  LevelUpAbilityIncrease,
  LevelUpClassCommand as LevelUpClassPayload,
} from '../../../src/domain/command-contracts';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { applicationSeed } from '../../../src/db/bootstrap';
import { BUNDLED_HOMEBREW_CATALOG } from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { LevelUpPlannedEligibleSpells } from '../../../src/queries/level-up-planned-eligible-spells';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { EligibleSpellSearch } from '../../../src/eligibility/eligible-spell-search';
import { openTestDatabase } from '../../helpers/open-db';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { LEVEL_UP_RPC } from '../../../src/builder/level-up-wizard';
import { rpcRegistry } from '../../../src/worker/registry';
import { createRpcHarness } from '../../helpers/rpc-harness';

/**
 * THE ONE LEVELLING PATH (straight-class level-up plan §3/§8b, reduced by
 * D77 and D70), against real seeded SRD data.
 *
 * The guards are the subject, and each test names the mutation it must
 * catch:
 *
 *  - B1: clear the allocation method and direct command execution must refuse
 *    before default scores can drive derived values.
 *  - L-STRAIGHT: remove the class-held guard and levelling a class the
 *    character never entered must stop failing — `UpdateClassCommand` has
 *    no such guard, so nothing else would catch it.
 *  - L-ADJACENT: remove the adjacency guard and 2 → 7 in one command must
 *    stop failing.
 *  - L-ASI-LEVELS: hardcode the ASI levels back to `[4]` and the level-6
 *    Fighter case must stop failing — the fixture level is DELIBERATELY not
 *    4 (§8). The Wizard 5 → 6 case is the other face, D78's own correction:
 *    treat the plan's old 4/6/8/10/12/14/16 UNION as every class's set and
 *    a Wizard is wrongly refused at 6.
 *
 * L-SUBCLASS is DELIBERATELY ABSENT — struck by D70, not failing. Level 3
 * proceeds with the choice merely OFFERED; the owed choice is a warning
 * surface (L-B), not a command guard.
 *
 * Hit points are COMPUTED, never written (D77): the fixed value
 * `die / 2 + 1` plus the Constitution modifier per level, live from the
 * sheet. The test asserts both the number and that no
 * `character_hit_point_rolls` row appears.
 */
describe('level_up_class', () => {
  let connection: Database;
  let db: DatabaseContext;
  let integrity: CharacterCommandIntegrity;
  let characterId: number;

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function enterClass(name: string): void {
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: classId(name) },
      integrity,
    ).apply(characterId);
  }

  function levelUp(
    payload: Omit<LevelUpClassPayload, 'type'>,
  ): LevelUpClassCommand {
    const command = new LevelUpClassCommand(
      db,
      { type: 'level_up_class', ...payload },
      integrity,
    );
    command.apply(characterId);
    return command;
  }

  function asiChoice(
    abilityIncreases: readonly LevelUpAbilityIncrease[],
  ): NonNullable<LevelUpClassPayload['feat_choice']> {
    return {
      kind: 'feat',
      feat_content_key: '2024:feat:ability-score-improvement',
      config: {},
      ability_increases: abilityIncreases,
    };
  }

  function featChoice(
    contentKey: string,
  ): NonNullable<LevelUpClassPayload['feat_choice']> & { kind: 'feat' } {
    const row = db.oneRaw(
      `SELECT ability_points, ability_increase_abilities
       FROM feat_definitions WHERE content_key = ?`,
      [contentKey],
    );
    if (row === null) throw new Error(`Missing feat fixture ${contentKey}.`);
    const points = Number(row.ability_points);
    const options = row.ability_increase_abilities === null
      ? null
      : JSON.parse(String(row.ability_increase_abilities)) as unknown;
    const ability = options === 'any'
      ? 'strength'
      : Array.isArray(options)
        ? String(options[0])
        : null;
    return {
      kind: 'feat',
      feat_content_key: contentKey,
      config: contentKey === '2024:feat:magic-initiate'
        ? { chosen_list: 'Wizard', spellcasting_ability: 'intelligence' }
        : contentKey === '2024:feat:skilled'
          ? { selected_skills: [null, null, null] }
          : {},
      ability_increases: points === 0 || ability === null
        ? []
        : [{ ability: ability as LevelUpAbilityIncrease['ability'], amount: points }],
    };
  }

  function stateBytes(): readonly number[] {
    return [...new TextEncoder().encode(
      JSON.stringify(new CharacterState(db).capture(characterId)),
    )];
  }

  function refusalOf(
    payload: Omit<LevelUpClassPayload, 'type'>,
  ): LevelUpRefusal {
    try {
      levelUp(payload);
    } catch (error) {
      if (error instanceof LevelUpRefusal) {
        return error;
      }
      throw error;
    }
    throw new Error('Expected a LevelUpRefusal and none was raised.');
  }

  function storedLevel(name: string): number | null {
    const level = db.scalar<number>(
      `SELECT level FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId(name)],
    );
    return level === null ? null : Number(level);
  }

  function sourceId(name: string): number {
    return Number(
      db.scalar(
        `SELECT source.id
         FROM character_source_instances AS source
         JOIN class_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'class'
           AND definition.name = ? AND source.state = 'active'`,
        [characterId, name],
      ),
    );
  }

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    applicationSeed(db);
    integrity = new CharacterCommandIntegrity('level-up-class-test-key');
    // Constitution 14 (+2), so the computed hit points move with a real
    // modifier rather than a zero that hides a dropped term.
    characterId = db.exec(
      `INSERT INTO characters (
         name, constitution, ability_allocation_method
       ) VALUES ('Level Up Hero', 14, 'manual')`,
    ).lastInsertId;
  });

  afterEach(() => connection.close());

  it('refuses an unallocated held character without changing any state (B1)', () => {
    enterClass('Fighter');
    db.exec(
      'UPDATE characters SET ability_allocation_method = NULL WHERE id = ?',
      [characterId],
    );
    const before = stateBytes();

    const refusal = refusalOf({
      class_definition_id: classId('Fighter'),
      target_level: 2,
    });

    expect(refusal.data).toEqual({ reason: 'incomplete_level_one' });
    expect(storedLevel('Fighter')).toBe(1);
    expect(stateBytes()).toEqual(before);
  });

  it('refuses a class the character does not have, by name (L-STRAIGHT)', () => {
    enterClass('Fighter');
    const before = stateBytes();
    const refusal = refusalOf({
      class_definition_id: classId('Wizard'),
      target_level: 2,
    });
    expect(refusal.data).toEqual({ reason: 'class_not_held' });
    // Nothing was written: no Wizard row appeared and the Fighter is intact.
    expect(storedLevel('Wizard')).toBeNull();
    expect(storedLevel('Fighter')).toBe(1);
    expect(stateBytes()).toEqual(before);
  });

  it('refuses a non-adjacent target level, by name (L-ADJACENT)', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 2);
    const before = stateBytes();
    const skip = refusalOf({
      class_definition_id: classId('Fighter'),
      target_level: 7,
    });
    expect(skip.data).toEqual({ reason: 'level_not_adjacent' });
    // Standing still is not levelling either: the CURRENT level is refused
    // too, so the guard is adjacency, not an upper bound.
    const still = refusalOf({
      class_definition_id: classId('Fighter'),
      target_level: 2,
    });
    expect(still.data).toEqual({ reason: 'level_not_adjacent' });
    expect(storedLevel('Fighter')).toBe(2);
    expect(stateBytes()).toEqual(before);
  });

  it('computes the new level’s hit points as die/2+1 plus Constitution, writing nothing (D77)', () => {
    enterClass('Fighter');
    const builder = new CharacterSheetBuilder(db);
    // Fighter 1, Constitution 14 (+2): 10 + 2 = 12.
    expect(builder.build(characterId).class_hit_points_subtotal.value).toBe(12);

    levelUp({ class_definition_id: classId('Fighter'), target_level: 2 });

    expect(storedLevel('Fighter')).toBe(2);
    // Level 2 adds the d10's fixed value (10 / 2 + 1 = 6) plus 2 — the D77
    // number, computed live: 12 + 8 = 20.
    expect(builder.build(characterId).class_hit_points_subtotal.value).toBe(20);
    // NOTHING per level was recorded. A row here would be the voided D66
    // machinery coming back.
    expect(
      db.scalar(
        'SELECT count(*) FROM character_hit_point_rolls WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('proceeds through level 3 without a subclass — the choice is owed, never refused (D70)', () => {
    enterClass('Wizard');
    raiseClassLevelForTest(db, characterId, classId('Wizard'), 2);
    // The seeded Evoker option is still owed rather than mandatory. A refusal
    // here would make the choice into a command guard.
    levelUp({ class_definition_id: classId('Wizard'), target_level: 3 });
    expect(storedLevel('Wizard')).toBe(3);
    expect(
      db.scalar(
        `SELECT subclass_definition_id FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, classId('Wizard')],
      ),
    ).toBeNull();
  });

  it('applies an offered subclass content key at level 3, and refuses a foreign one', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 2);
    const subclassId = Number(
      db.scalar(
        `SELECT id FROM subclass_definitions WHERE content_key = ?`,
        ['2024:subclass:champion'],
      ),
    );
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description
       ) VALUES (?, 3, 99, 'Fixture Ward', 'A test-owned mechanical feature.')`,
      [subclassId],
    ).lastInsertId;
    const effectId = db.exec(
      `INSERT INTO subclass_feature_effects (
         subclass_feature_id, sort_order, effect_kind, amount, label
       ) VALUES (?, 1, 'armor_class_bonus', 1, 'Fixture Ward')`,
      [featureId],
    ).lastInsertId;
    // Thief belongs to the Rogue: a key of another class must fail loudly,
    // not attach.
    expect(() =>
      levelUp({
        class_definition_id: classId('Fighter'),
        target_level: 3,
        subclass_content_key: '2024:subclass:thief',
      }),
    ).toThrow('That subclass does not belong to the selected class.');

    levelUp({
      class_definition_id: classId('Fighter'),
      target_level: 3,
      subclass_content_key: '2024:subclass:champion',
    });
    expect(storedLevel('Fighter')).toBe(3);
    expect(
      Number(
        db.scalar(
          `SELECT subclass_definition_id FROM character_class_levels
           WHERE character_id = ? AND class_definition_id = ?`,
          [characterId, classId('Fighter')],
        ),
      ),
    ).toBe(subclassId);
    // The subclass source instance exists and is active, with its grants
    // generated by the shared sync — the same state `update_class` produces.
    expect(
      db.scalar(
        `SELECT state FROM character_source_instances
         WHERE character_id = ? AND source_type = 'subclass'
           AND source_definition_id = ?`,
        [characterId, subclassId],
      ),
    ).toBe('active');
    expect(
      db.allRaw(
        `SELECT effect_kind, amount, label, template_ref
         FROM character_effects
         WHERE character_id = ? AND template_ref IS NOT NULL`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'armor_class_bonus',
        amount: 1,
        label: 'Fixture Ward',
        template_ref: `subclass_feature_effects:${String(effectId)}`,
      },
    ]);
  });

  it('requires an increase at a level the SEEDED table names — Fighter 6, not only 4 (L-ASI-LEVELS)', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 5);
    const beforeRefusal = stateBytes();
    // The fixture level is DELIBERATELY 6 (§8): a mutation that hardcodes
    // the ASI levels back to `[4]` makes this refusal vanish, and nothing
    // else would notice.
    const refusal = refusalOf({
      class_definition_id: classId('Fighter'),
      target_level: 6,
    });
    expect(refusal.data).toEqual({ reason: 'ability_increase_required' });
    expect(storedLevel('Fighter')).toBe(5);
    expect(stateBytes()).toEqual(beforeRefusal);

    levelUp({
      class_definition_id: classId('Fighter'),
      target_level: 6,
      feat_choice: asiChoice([
        { ability: 'strength', amount: 1 },
        { ability: 'constitution', amount: 1 },
      ]),
    });
    expect(storedLevel('Fighter')).toBe(6);
  });

  it('does NOT require an increase where the class’s own table has none — Wizard 6 (D78)', () => {
    // D78's correction, made executable: 4/6/8/10/12/14/16 is the UNION
    // across the twelve tables, not any one class's set. Treating it as
    // per-class would refuse a Wizard here, where the Wizard table prints
    // no Ability Score Improvement.
    enterClass('Wizard');
    raiseClassLevelForTest(db, characterId, classId('Wizard'), 5);
    levelUp({ class_definition_id: classId('Wizard'), target_level: 6 });
    expect(storedLevel('Wizard')).toBe(6);
    // And offering one anyway is a wrong program, refused loudly.
    expect(() =>
      levelUp({
        class_definition_id: classId('Wizard'),
        target_level: 7,
        feat_choice: asiChoice([{ ability: 'intelligence', amount: 2 }]),
      }),
    ).toThrow('does not grant an ASI-level feat or Epic Boon');
  });

  it('writes ASI as one ordinary feat source with a durable occurrence pointer', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 3);
    const builder = new CharacterSheetBuilder(db);
    const strengthScore = () =>
      builder
        .build(characterId)
        .ability_scores.find((entry) => entry.ability === 'strength')?.score;
    expect(strengthScore()).toBe(10);

    levelUp({
      class_definition_id: classId('Fighter'),
      target_level: 4,
      feat_choice: asiChoice([{ ability: 'strength', amount: 2 }]),
    });

    const sourceId = Number(
      db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'feat'`,
        [characterId],
      ),
    );
    expect(
      db.allRaw(
        `SELECT effect_kind, ability, amount, maximum, source_instance_id
         FROM character_effects
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'ability_increase',
        ability: 'strength',
        amount: 2,
        maximum: 20,
        source_instance_id: sourceId,
      },
    ]);
    expect(
      db.oneRaw(
        `SELECT class_level, choice_kind, feat_source_instance_id
         FROM character_level_feat_choices WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      class_level: 4,
      choice_kind: 'asi_level_feat',
      feat_source_instance_id: sourceId,
    });
    // The contribution reaches the sheet: base 10 + 2.
    expect(strengthScore()).toBe(12);
  });

  it('runs through the real executor with a snapshot inverse, and undo restores everything', async () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 3);
    const state = new CharacterState(db);
    const before = state.capture(characterId);
    const beforeBytes = stateBytes();

    const executor = new CharacterCommandExecutor(db, integrity);
    const result = await executor.execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: Number(
        db.scalar('SELECT revision FROM characters WHERE id = ?', [
          characterId,
        ]),
      ),
      command: {
        type: 'level_up_class',
        class_definition_id: classId('Fighter'),
        target_level: 4,
        feat_choice: asiChoice([{ ability: 'strength', amount: 2 }]),
      },
    });
    expect(storedLevel('Fighter')).toBe(4);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_level_feat_choices WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(1);
    // The inverse is a SNAPSHOT (§8b), the shape `update_class` uses.
    expect(result.inverse).toMatchObject({
      type: 'internal_snapshot_restore',
    });
    expect(result.inverse).not.toHaveProperty('integrity');

    await executor.undo({
      character_id: characterId,
      operation_uuid: result.operation_uuid,
      expected_revision: Number(
        db.scalar('SELECT revision FROM characters WHERE id = ?', [
          characterId,
        ]),
      ),
    });
    expect(state.capture(characterId)).toEqual(before);
    expect(stateBytes()).toEqual(beforeBytes);
  });

  const everyBundledFeat = [
    '2024:feat:alert',
    '2024:feat:magic-initiate',
    '2024:feat:savage-attacker',
    '2024:feat:skilled',
    '2024:feat:ability-score-improvement',
    '2024:feat:grappler',
    '2024:feat:archery',
    '2024:feat:defense',
    '2024:feat:great-weapon-fighting',
    '2024:feat:two-weapon-fighting',
    '2024:feat:boon-of-combat-prowess',
    '2024:feat:boon-of-dimensional-travel',
    '2024:feat:boon-of-fate',
    '2024:feat:boon-of-irresistible-offense',
    '2024:feat:boon-of-spell-recall',
    '2024:feat:boon-of-the-night-spirit',
    '2024:feat:boon-of-truesight',
  ] as const;

  it.each(everyBundledFeat)(
    'uses the identical ASI command arm for qualified feat %s',
    (contentKey) => {
      db.exec(
        `UPDATE characters SET strength = 18, dexterity = 18,
           constitution = 18, intelligence = 18, wisdom = 18, charisma = 18
         WHERE id = ?`,
        [characterId],
      );
      enterClass('Fighter');
      raiseClassLevelForTest(db, characterId, classId('Fighter'), 13);
      enterClass('Wizard');
      raiseClassLevelForTest(db, characterId, classId('Wizard'), 5);

      levelUp({
        class_definition_id: classId('Fighter'),
        target_level: 14,
        feat_choice: featChoice(contentKey),
      });

      expect(
        db.oneRaw(
          `SELECT definition.content_key, choice.choice_kind
           FROM character_level_feat_choices AS choice
           JOIN character_source_instances AS source
             ON source.id = choice.feat_source_instance_id
           JOIN feat_definitions AS definition
             ON definition.id = source.source_definition_id
           WHERE choice.character_id = ?`,
          [characterId],
        ),
      ).toEqual({
        content_key: contentKey,
        choice_kind: 'asi_level_feat',
      });
    },
  );

  it('saves, reloads, and later resolves an explicitly deferred Epic Boon', async () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 18);
    levelUp({
      class_definition_id: classId('Fighter'),
      target_level: 19,
      feat_choice: { kind: 'defer_epic_boon' },
    });
    const choiceId = Number(
      db.scalar(
        `SELECT id FROM character_level_feat_choices
         WHERE character_id = ? AND choice_kind = 'epic_boon'`,
        [characterId],
      ),
    );
    expect(
      db.scalar(
        'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE id = ?',
        [choiceId],
      ),
    ).toBeNull();

    const state = new CharacterState(db);
    const saved = state.capture(characterId);
    db.exec('DELETE FROM character_level_feat_choices WHERE id = ?', [choiceId]);
    state.restore(characterId, saved);
    expect(
      db.scalar(
        `SELECT feat_source_instance_id FROM character_level_feat_choices
         WHERE character_id = ? AND choice_kind = 'epic_boon'`,
        [characterId],
      ),
    ).toBeNull();

    const executor = new CharacterCommandExecutor(db, integrity);
    const resolved = await executor.execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'resolve_level_feat_choice',
        character_level_feat_choice_id: choiceId,
        feat_choice: featChoice('2024:feat:boon-of-fate'),
      },
    });
    expect(
      db.oneRaw(
        `SELECT choice.feat_source_instance_id, effect.maximum
         FROM character_level_feat_choices AS choice
         JOIN character_effects AS effect
           ON effect.source_instance_id = choice.feat_source_instance_id
         WHERE choice.id = ?`,
        [choiceId],
      ),
    ).toMatchObject({ maximum: 30 });
    await executor.undo({
      character_id: characterId,
      operation_uuid: resolved.operation_uuid,
      expected_revision: 1,
    });
    expect(
      db.scalar(
        'SELECT feat_source_instance_id FROM character_level_feat_choices WHERE id = ?',
        [choiceId],
      ),
    ).toBeNull();
  });

  it('rolls the class, feat source, effects, choice, and grants back together', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 3);
    const before = stateBytes();
    const failingGenerator = {
      generateForSource(): never {
        throw new Error('induced feat grant failure');
      },
    } as unknown as GrantRuleSlotGenerator;
    const command = new LevelUpClassCommand(
      db,
      {
        type: 'level_up_class',
        class_definition_id: classId('Fighter'),
        target_level: 4,
        feat_choice: asiChoice([{ ability: 'strength', amount: 2 }]),
      },
      integrity,
      undefined,
      failingGenerator,
    );
    expect(() => command.apply(characterId)).toThrow(
      'induced feat grant failure',
    );
    expect(stateBytes()).toEqual(before);
  });

  it('refuses the 21st character level even when the step itself is adjacent', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 15);
    enterClass('Wizard');
    raiseClassLevelForTest(db, characterId, classId('Wizard'), 5);
    expect(() =>
      levelUp({ class_definition_id: classId('Wizard'), target_level: 6 }),
    ).toThrow('A character cannot exceed level 20.');
    expect(storedLevel('Wizard')).toBe(5);
  });

  it('regenerates the class source’s grants at the new level in the same transaction', () => {
    // Wizard 2 -> 3 opens second-level slots: the display name and the
    // grant regeneration both move with the level, through the same shared
    // sync `update_class` uses (§6 — no new machinery).
    enterClass('Wizard');
    raiseClassLevelForTest(db, characterId, classId('Wizard'), 2);
    const slotsBefore = Number(
      db.scalar(
        'SELECT count(*) FROM spell_selection_slots WHERE character_id = ?',
        [characterId],
      ),
    );
    levelUp({ class_definition_id: classId('Wizard'), target_level: 3 });
    const slotsAfter = Number(
      db.scalar(
        'SELECT count(*) FROM spell_selection_slots WHERE character_id = ?',
        [characterId],
      ),
    );
    expect(slotsAfter).toBeGreaterThan(slotsBefore);
    expect(
      db.scalar(
        `SELECT display_name FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'`,
        [characterId],
      ),
    ).toBe('Wizard 3');
  });

  it('commits logical skill, Expertise, and new-spell choices in the one level-up revision', async () => {
    enterClass('Bard');
    const bardId = classId('Bard');
    const planned = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as never,
      expected_revision: 0 as never,
      class_definition_id: bardId as never,
      target_class_level: 2 as never,
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'bard-prepared' as never,
        ordinal: 5 as never,
      },
      query: '',
    });
    const offered = planned[0];
    if (offered === undefined) throw new Error('No Bard spell was offered.');

    const result = await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'level_up_class',
        class_definition_id: bardId,
        target_level: 2,
        planned_subchoices: {
          skills: [{
            locator: {
              source: { kind: 'selected_class' },
              rule_key: 'class_skill',
              ordinal: 1,
            },
            skill: 'performance',
          }],
          expertise: [{
            locator: {
              source: { kind: 'selected_class' },
              rule_key: 'class_expertise_2',
              ordinal: 1,
            },
            skill: 'performance',
          }],
          spells: [{
            kind: 'slot_selection',
            locator: {
              source: { kind: 'selected_class' },
              rule_key: 'bard-prepared',
              ordinal: 5,
            },
            spell_version_id: offered.id,
            mode: 'new',
          }],
        },
      },
    });

    expect(result.revision).toBe(1);
    expect(storedLevel('Bard')).toBe(2);
    expect(
      db.oneRaw(
        `SELECT skill FROM character_skill_grants
         WHERE source_instance_id = ? AND grant_key = 'class_skill'
           AND ordinal = 1`,
        [sourceId('Bard')],
      ),
    ).toEqual({ skill: 'performance' });
    expect(
      db.oneRaw(
        `SELECT skill FROM character_skill_expertise_grants
         WHERE source_instance_id = ? AND grant_key = 'class_expertise_2'
           AND ordinal = 1`,
        [sourceId('Bard')],
      ),
    ).toEqual({ skill: 'performance' });
    expect(
      db.oneRaw(
        `SELECT current_spell_version_id FROM spell_selection_slots
         WHERE source_instance_id = ? AND rule_key = 'bard-prepared'
           AND ordinal = 5`,
        [sourceId('Bard')],
      ),
    ).toEqual({ current_spell_version_id: offered.id });
    expect(
      db.scalar(
        `SELECT count(*) FROM character_operations
         WHERE character_id = ? AND resulting_revision = 1`,
        [characterId],
      ),
    ).toBe(1);

    const replacements = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as never,
      expected_revision: 1 as never,
      class_definition_id: bardId as never,
      target_class_level: 3 as never,
      locator: {
        source: { kind: 'selected_class' },
        rule_key: 'bard-prepared' as never,
        ordinal: 5 as never,
      },
      query: '',
    });
    const replacement = replacements.find(
      (candidate) => candidate.id !== offered.id,
    );
    if (replacement === undefined) {
      throw new Error('No Bard replacement spell was offered.');
    }
    const replaced = await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 1,
      command: {
        type: 'level_up_class',
        class_definition_id: bardId,
        target_level: 3,
        planned_subchoices: {
          skills: [],
          expertise: [],
          spells: [{
            kind: 'slot_selection',
            locator: {
              source: { kind: 'selected_class' },
              rule_key: 'bard-prepared',
              ordinal: 5,
            },
            spell_version_id: replacement.id,
            mode: 'replace',
          }],
        },
      },
    });
    expect(replaced.revision).toBe(2);
    expect(
      db.scalar(
        `SELECT current_spell_version_id FROM spell_selection_slots
         WHERE source_instance_id = ? AND rule_key = 'bard-prepared'
           AND ordinal = 5`,
        [sourceId('Bard')],
      ),
    ).toBe(replacement.id);
  });

  it('resolves and fills a new Wizard spellbook acquisition by logical locator', () => {
    enterClass('Wizard');
    const locator = {
      source: { kind: 'selected_class' as const },
      rule_key: 'wizard-spellbook',
      ordinal: 7,
    };
    const planned = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as never,
      expected_revision: 0 as never,
      class_definition_id: classId('Wizard') as never,
      target_class_level: 2 as never,
      locator: locator as never,
      query: '',
    });
    const offered = planned[0];
    if (offered === undefined) {
      throw new Error('Wizard level 2 offered no spellbook acquisition.');
    }

    levelUp({
      class_definition_id: classId('Wizard'),
      target_level: 2,
      planned_subchoices: {
        skills: [],
        expertise: [],
        spells: [{
          kind: 'spellbook_acquisition',
          locator,
          spell_version_id: offered.id,
        }],
      },
    });

    expect(
      db.oneRaw(
        `SELECT spell_version_id, acquired_at_class_level
         FROM wizard_spellbook_entries
         WHERE source_instance_id = ? AND rule_key = 'wizard-spellbook'
           AND ordinal = 7`,
        [sourceId('Wizard')],
      ),
    ).toEqual({
      spell_version_id: offered.id,
      acquired_at_class_level: 2,
    });
  });

  it('rolls class level, feat, skill fills, and Expertise back on a late spell-locator refusal', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 3);
    enterClass('Fighter');
    enterClass('Bard');
    raiseClassLevelForTest(db, characterId, classId('Bard'), 2);
    enterClass('Bard');
    const bardSourceId = sourceId('Bard');
    const before = stateBytes();

    let refusal: unknown;
    try {
      levelUp({
        class_definition_id: classId('Fighter'),
        target_level: 4,
        feat_choice: featChoice('2024:feat:skilled'),
        planned_subchoices: {
          skills: [
            {
              locator: {
                source: { kind: 'existing_source', source_instance_id: bardSourceId },
                rule_key: 'multiclass_skill',
                ordinal: 1,
              },
              skill: 'performance',
            },
            {
              locator: {
                source: { kind: 'selected_feat' },
                rule_key: 'skilled-proficiencies',
                ordinal: 1,
              },
              skill: 'athletics',
            },
          ],
          expertise: [{
            locator: {
              source: { kind: 'existing_source', source_instance_id: bardSourceId },
              rule_key: 'class_expertise_2',
              ordinal: 1,
            },
            skill: 'performance',
          }],
          spells: [{
            kind: 'slot_selection',
            locator: {
              source: { kind: 'selected_feat' },
              rule_key: 'late-missing-spell',
              ordinal: 1,
            },
            spell_version_id: 1,
            mode: 'new',
          }],
        },
      });
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toMatchObject({
      data: {
        reason: 'planned_subchoice_refused',
        subchoice_kind: 'spell',
        index: 0,
        issue: 'locator_not_found',
      },
    });
    expect(stateBytes()).toEqual(before);
  });

  it('uses the same selected-feat locator and eligibility before and after Magic Initiate is durable', () => {
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, classId('Fighter'), 3);
    enterClass('Fighter');
    const selection = featChoice('2024:feat:magic-initiate');
    const locator = {
      source: { kind: 'selected_feat' as const },
      rule_key: 'magic-initiate-cantrips',
      ordinal: 1,
    };
    const planned = new LevelUpPlannedEligibleSpells(db).search({
      character_id: characterId as never,
      expected_revision: 0 as never,
      class_definition_id: classId('Fighter') as never,
      target_class_level: 4 as never,
      feat_choice: selection,
      locator: locator as never,
      query: '',
    });
    const offered = planned[0];
    if (offered === undefined) {
      throw new Error('Magic Initiate offered no Wizard cantrip.');
    }

    levelUp({
      class_definition_id: classId('Fighter'),
      target_level: 4,
      feat_choice: selection,
      planned_subchoices: {
        skills: [],
        expertise: [],
        spells: [{
          kind: 'slot_selection',
          locator,
          spell_version_id: offered.id,
          mode: 'new',
        }],
      },
    });

    const slotId = Number(
      db.scalar(
        `SELECT slot.id FROM spell_selection_slots AS slot
         JOIN character_source_instances AS source
           ON source.id = slot.source_instance_id
         JOIN feat_definitions AS feat
           ON feat.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'feat'
           AND feat.content_key = '2024:feat:magic-initiate'
           AND slot.rule_key = 'magic-initiate-cantrips'
           AND slot.ordinal = 1`,
        [characterId],
      ),
    );
    expect(new EligibleSpellSearch(db).search(characterId, slotId, '')).toEqual(
      planned,
    );
    expect(
      db.scalar(
        'SELECT current_spell_version_id FROM spell_selection_slots WHERE id = ?',
        [slotId],
      ),
    ).toBe(offered.id);
  });

  // Measured alone at 2.59s; 20s retains contention headroom.
  it('resolves published Spell Student by logical locator before its source row exists', async () => {
    const harness = await createRpcHarness([]);
    try {
      db = harness.context.db;
      integrity = new CharacterCommandIntegrity('level-up-class-rpc-test-key');
      characterId = db.exec(
        `INSERT INTO characters (
           name, constitution, ability_allocation_method
         ) VALUES ('Level Up RPC Hero', 14, 'manual')`,
      ).lastInsertId;
      const catalog = BUNDLED_HOMEBREW_CATALOG.filter(
        (entry) => entry.catalog_key === 'spell-student',
      );
      const install = planBundledHomebrewInstall(db, catalog);
      expect(
        commitBundledHomebrewInstall(db, install.token, catalog),
      ).toMatchObject({
        kind: 'committed',
        outcomes: [{
          kind: 'create',
          contentKey: '2024:content.subclass:spell-student-bundled-revision-2',
        }],
      });
      enterClass('Fighter');
      raiseClassLevelForTest(db, characterId, classId('Fighter'), 2);
      enterClass('Fighter');
      const locator = {
        source: { kind: 'selected_class_subclass' as const },
        rule_key: 'spell-student-cantrips',
        ordinal: 1,
      };
      const plannedResponse = await rpcRegistry.dispatch(
        {
          id: 1,
          method: LEVEL_UP_RPC.plannedEligibleSpells,
          params: {
            character_id: characterId,
            expected_revision: 0,
            class_definition_id: classId('Fighter'),
            target_class_level: 3,
            subclass_content_key: '2024:content.subclass:spell-student-bundled-revision-2',
            locator,
            query: '',
          },
        },
        harness.context,
      );
      expect(plannedResponse).toMatchObject({ ok: true });
      if (!plannedResponse.ok) {
        throw new Error(plannedResponse.error.message);
      }
      const planned = plannedResponse.result as ReturnType<
        LevelUpPlannedEligibleSpells['search']
      >;
      const offered = planned[0];
      if (offered === undefined) {
        throw new Error('Spell Student offered no Wizard cantrip.');
      }

      levelUp({
        class_definition_id: classId('Fighter'),
        target_level: 3,
        subclass_content_key: '2024:content.subclass:spell-student-bundled-revision-2',
        planned_subchoices: {
          skills: [],
          expertise: [],
          spells: [{
            kind: 'slot_selection',
            locator,
            spell_version_id: offered.id,
            mode: 'new',
          }],
        },
      });

      const slotId = Number(
        db.scalar(
          `SELECT slot.id FROM spell_selection_slots AS slot
           JOIN character_source_instances AS source
             ON source.id = slot.source_instance_id
           JOIN subclass_definitions AS subclass
             ON subclass.id = source.source_definition_id
           WHERE source.character_id = ? AND source.source_type = 'subclass'
             AND subclass.content_key = '2024:content.subclass:spell-student-bundled-revision-2'
             AND slot.rule_key = 'spell-student-cantrips'
             AND slot.ordinal = 1`,
          [characterId],
        ),
      );
      const durableResponse = await rpcRegistry.dispatch(
        {
          id: 2,
          method: 'queries.eligibleSpells.search',
          params: {
            character_id: characterId,
            slot_id: slotId,
            query: '',
          },
        },
        harness.context,
      );
      expect(durableResponse).toMatchObject({ ok: true });
      if (!durableResponse.ok) {
        throw new Error(durableResponse.error.message);
      }
      expect(durableResponse.result).toEqual(planned);
    } finally {
      harness.close();
    }
  }, 20_000);

  it('commits with omitted owed skill and spell choices and leaves named D70 warnings', () => {
    enterClass('Ranger');
    levelUp({
      class_definition_id: classId('Ranger'),
      target_level: 2,
    });

    expect(storedLevel('Ranger')).toBe(2);
    expect(
      db.scalar(
        `SELECT skill FROM character_skill_grants
         WHERE source_instance_id = ? AND grant_key = 'class_skill'
           AND ordinal = 1`,
        [sourceId('Ranger')],
      ),
    ).toBeNull();
    expect(
      db.scalar(
        `SELECT current_spell_version_id FROM spell_selection_slots
         WHERE source_instance_id = ? AND rule_key = 'ranger-prepared'
           AND ordinal = 3`,
        [sourceId('Ranger')],
      ),
    ).toBeNull();
    const warnings = new CharacterCompletenessQueries(db).build(characterId);
    expect(warnings.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'unfilled_skill_grants',
        grant_key: 'class_skill',
      }),
      expect.objectContaining({
        kind: 'unfilled_choices',
        rule_key: 'ranger-prepared',
      }),
    ]));
  });

  it('copies automatic feature effects once on sync and preserves hand-written ASIs on re-sync', () => {
    const fighterId = classId('Fighter');
    const templateId = db.exec(
      `INSERT INTO class_feature_effects (
         class_definition_id, class_level, name, effect_kind,
         base, ability_1, ability_2, allows_shield
       ) VALUES (?, 4, 'Fixture Defense', 'armor_class_formula',
                 10, 'constitution', 'charisma', 1)`,
      [fighterId],
    ).lastInsertId;
    enterClass('Fighter');
    raiseClassLevelForTest(db, characterId, fighterId, 3);

    levelUp({
      class_definition_id: fighterId,
      target_level: 4,
      feat_choice: asiChoice([{ ability: 'strength', amount: 2 }]),
    });

    // An ordinary update_class apply is a second sync of the same level. It
    // must replace the generated row, not duplicate it, and must not touch the
    // ASI row whose template_ref is NULL.
    enterClass('Fighter');
    expect(
      db.allRaw(
        `SELECT effect_kind, ability, amount, base, ability_1, ability_2,
                allows_shield, template_ref
         FROM character_effects
         WHERE character_id = ?
         ORDER BY effect_kind`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'ability_increase',
        ability: 'strength',
        amount: 2,
        base: null,
        ability_1: null,
        ability_2: null,
        allows_shield: null,
        template_ref: null,
      },
      {
        effect_kind: 'armor_class_formula',
        ability: null,
        amount: null,
        base: 10,
        ability_1: 'constitution',
        ability_2: 'charisma',
        allows_shield: 1,
        template_ref: `class_feature_effects:${String(templateId)}`,
      },
    ]);
    expect(
      db.scalar(
        `SELECT count(*) FROM character_effects
         WHERE character_id = ? AND template_ref IS NOT NULL`,
        [characterId],
      ),
    ).toBe(1);
  });
});
