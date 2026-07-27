import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import type {
  CharacterCommandPayload,
  WeaponFields,
} from '../../../src/domain/command-contracts';
import { WEAPON_RANGE_MAX_FEET } from '../../../src/domain/weapon-limits';
import { weaponFromTemplate } from '../../../src/ui/screens/planner/weapons';
import { BuildReportBuilder } from '../../../src/reports/build-report-builder';
import { AbilityScores } from '../../../src/rules/ability-scores';
import {
  WeaponQueries,
  type WeaponPanelContext,
} from '../../../src/queries/weapons';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { openTestDatabase } from '../../helpers/open-db';

const key = 'W1-weapon-command-integrity-key';

let operationCounter = 0;
function operationUuid(): string {
  operationCounter += 1;
  return `00000000-0000-4000-8000-${String(operationCounter).padStart(12, '0')}`;
}

describe('weapon commands', () => {
  let connection: Database;
  let db: DatabaseContext;
  let executor: CharacterCommandExecutor;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedWeaponContent(db);
    executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity(key),
    );
    characterId = db.exec("INSERT INTO characters (name) VALUES ('Wielder')")
      .lastInsertId;
  });

  afterEach(() => connection.close());

  async function run(
    command: CharacterCommandPayload,
    forCharacter = characterId,
  ) {
    const revision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [forCharacter]),
    );
    return executor.execute({
      character_id: forCharacter,
      operation_uuid: operationUuid(),
      expected_revision: revision,
      command,
    });
  }

  function queries(): WeaponQueries {
    return new WeaponQueries(db);
  }

  /**
   * The panel's non-weapon inputs, resolved the way the planner resolves them.
   *
   * Built from a real `BuildReportBuilder` run rather than from literals, so
   * these tests read the same proficiency bonus and the same spell access
   * routes the screen does.
   */
  function panelContext(): WeaponPanelContext {
    const report = new BuildReportBuilder(db).build(characterId);
    return {
      routes: report.access_routes,
      scores: AbilityScores.fromArray(report.character.abilities),
      proficiency_bonus: report.character.proficiency_bonus,
    };
  }

  function templateNamed(name: string) {
    const found = queries().templates().find((entry) => entry.name === name);
    if (found === undefined) {
      throw new Error(`No template named ${name}.`);
    }
    return found;
  }

  /**
   * The pre-fill the picker performs, THROUGH THE PRODUCTION FUNCTION.
   *
   * This used to re-implement the copy inline. That was fine while the copy was
   * a spread, and stopped being fine the moment D27 made it a spread PLUS a
   * fold: a re-implementation would have kept passing while `weaponFromTemplate`
   * folded `srd_group` wrongly, which is the one thing these tests exist to
   * catch.
   */
  function fromTemplate(name: string): WeaponFields {
    return weaponFromTemplate(templateNamed(name));
  }

  function custom(overrides: Partial<WeaponFields> = {}): WeaponFields {
    return {
      name: 'Grandfather’s sword',
      // NOT STATED — the state a weapon someone typed in is genuinely in, and
      // the one D27 makes the column nullable for.
      proficiency_category: null,
      damage: { kind: 'not_recorded' },
      damage_type: null,
      versatile_damage: { kind: 'not_applicable' },
      finesse: false,
      heavy: false,
      light: false,
      loading: false,
      reach: false,
      thrown: false,
      two_handed: false,
      ammunition: false,
      ammunition_kind: null,
      range: { kind: 'none' },
      mastery_property: null,
      other_properties: null,
      notes: null,
      ...overrides,
    };
  }

  function weapons() {
    return queries().characterWeapons(characterId);
  }

  // --- the D1b guarantees ---------------------------------------------------

  it('pre-fills every field from a template and leaves every one editable', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    const [added] = weapons();
    expect(added).toMatchObject({
      name: 'Longsword',
      damage: { kind: 'dice', dice: '1d8' },
      damage_type: 'Slashing',
      versatile_damage: { kind: 'dice', dice: '1d10' },
      mastery_property: 'Sap',
      mastery_selected: false,
      // D27's FOLD, on the round trip through the column. The Longsword's
      // template row is `martial_melee`; the character's copy is `martial`,
      // because the four source table headings are not the two categories a
      // class grants proficiency in. Copying the group across verbatim would
      // store a value `character_weapons_proficiency_category_check` refuses.
      proficiency_category: 'martial',
    });
    // The other half of the fold, so a switch that returned `martial` for
    // everything cannot pass. A Club is `simple_melee`.
    await run({ type: 'add_weapon', weapon: fromTemplate('Club') });
    expect(weapons()[1]).toMatchObject({ proficiency_category: 'simple' });

    // Now change EVERY field the template filled, one command, and confirm each
    // one took. "Pre-filled" must not mean "locked".
    await run({
      type: 'update_weapon',
      weapon_id: added!.id,
      weapon: {
        name: 'Heirloom blade',
        // Changed too, and DOWNWARDS to a state the picker never produces: a
        // template-filled weapon always has a category, and the user must be
        // able to take it back to NOT STATED. Without an option for that the
        // undecided state would be unreachable after any pick.
        proficiency_category: null,
        damage: { kind: 'dice', dice: '1d10' },
        damage_type: 'Radiant',
        versatile_damage: { kind: 'dice', dice: '2d6' },
        finesse: true,
        heavy: true,
        light: true,
        loading: true,
        reach: true,
        thrown: true,
        two_handed: true,
        ammunition: true,
        ammunition_kind: 'Bolt',
        range: { kind: 'ranged', near_feet: 15, far_feet: 45 },
        mastery_property: 'Vex',
        other_properties: 'glows faintly',
        notes: 'from the vault',
      },
    });
    expect(weapons()[0]).toMatchObject({
      name: 'Heirloom blade',
      proficiency_category: null,
      damage: { kind: 'dice', dice: '1d10' },
      damage_type: 'Radiant',
      versatile_damage: { kind: 'dice', dice: '2d6' },
      finesse: true,
      heavy: true,
      light: true,
      loading: true,
      reach: true,
      thrown: true,
      two_handed: true,
      ammunition: true,
      ammunition_kind: 'Bolt',
      range: { kind: 'ranged', near_feet: 15, far_feet: 45 },
      mastery_property: 'Vex',
      other_properties: 'glows faintly',
      notes: 'from the vault',
    });
  });

  it('does not touch the template when the weapon copied from it is edited', async () => {
    const before = templateNamed('Longsword');
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    await run({
      type: 'update_weapon',
      weapon_id: weapons()[0]!.id,
      weapon: {
        ...fromTemplate('Longsword'),
        damage: { kind: 'dice', dice: '1d4' },
        name: 'Stub',
      },
    });
    // The catalog row is byte-identical. There is no template id on the weapon
    // for a write to travel back along, and this is the observable proof.
    expect(templateNamed('Longsword')).toEqual(before);
    expect(db.scalar('SELECT count(*) FROM weapon_templates')).toBe(38);
  });

  it('accepts a custom weapon that references no template at all', async () => {
    await run({ type: 'add_weapon', weapon: custom() });
    expect(weapons()[0]).toMatchObject({
      name: 'Grandfather’s sword',
      // Half-entered is a first-class state: no damage, no type, no mastery.
      damage: { kind: 'not_recorded' },
      damage_type: null,
      mastery_property: null,
    });
    expect(weapons()).toHaveLength(1);
  });

  it('deleting a character removes its weapons', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Mace') });
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('DELETE FROM characters WHERE id = ?', [characterId]);
    expect(db.scalar('SELECT count(*) FROM character_weapons')).toBe(0);
  });

  // --- revisions, inverses, undo and redo -----------------------------------

  it('bumps the revision for each of the four commands', async () => {
    const revisions: number[] = [];
    revisions.push((await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') })).revision);
    const id = weapons()[0]!.id;
    revisions.push(
      (await run({
        type: 'update_weapon',
        weapon_id: id,
        weapon: { ...fromTemplate('Longsword'), notes: 'sharpened' },
      })).revision,
    );
    revisions.push(
      (await run({ type: 'set_weapon_mastery', weapon_id: id, selected: true }))
        .revision,
    );
    revisions.push(
      (await run({ type: 'remove_weapon', weapon_id: id })).revision,
    );
    expect(revisions).toEqual([1, 2, 3, 4]);
  });

  it('round-trips add through undo and redo', async () => {
    const added = await run({
      type: 'add_weapon',
      weapon: fromTemplate('Greatsword'),
    });
    const id = weapons()[0]!.id;
    // The inverse names the id SQLite assigned — the reason it is resolved
    // after apply rather than before.
    expect(added.inverse).toEqual({ type: 'remove_weapon', weapon_id: id });

    const undone = await run(added.inverse);
    expect(weapons()).toHaveLength(0);

    await run(undone.inverse);
    expect(weapons()[0]).toMatchObject({ id, name: 'Greatsword' });
  });

  it('restores a removed weapon at its original id, with its mastery choice', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    await run({ type: 'add_weapon', weapon: fromTemplate('Greatsword') });
    const [first, second] = weapons();
    await run({
      type: 'set_weapon_mastery',
      weapon_id: second!.id,
      selected: true,
    });

    const removed = await run({ type: 'remove_weapon', weapon_id: second!.id });
    expect(weapons().map((weapon) => weapon.id)).toEqual([first!.id]);

    await run(removed.inverse);
    const restored = weapons().find((weapon) => weapon.id === second!.id);
    // Same id, so any earlier inverse in the undo stack still points at it.
    expect(restored).toMatchObject({
      id: second!.id,
      name: 'Greatsword',
      mastery_selected: true,
    });
  });

  it('round-trips an edit through undo, restoring every displaced field', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    const id = weapons()[0]!.id;
    const original = weapons()[0]!;

    const edited = await run({
      type: 'update_weapon',
      weapon_id: id,
      weapon: custom({
        name: 'Something else',
        damage: { kind: 'dice', dice: '1d2' },
      }),
    });
    expect(weapons()[0]).toMatchObject({ name: 'Something else' });

    await run(edited.inverse);
    expect(weapons()[0]).toEqual(original);
  });

  it('round-trips a mastery selection through undo', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    const id = weapons()[0]!.id;
    const selected = await run({
      type: 'set_weapon_mastery',
      weapon_id: id,
      selected: true,
    });
    expect(weapons()[0]!.mastery_selected).toBe(true);
    expect(selected.inverse).toEqual({
      type: 'set_weapon_mastery',
      weapon_id: id,
      selected: false,
    });
    await run(selected.inverse);
    expect(weapons()[0]!.mastery_selected).toBe(false);
  });

  // --- negative controls: every guard must be able to REJECT ----------------

  it('refuses to select mastery on a weapon that has none', async () => {
    await run({ type: 'add_weapon', weapon: custom() });
    const id = weapons()[0]!.id;
    await expect(
      run({ type: 'set_weapon_mastery', weapon_id: id, selected: true }),
    ).rejects.toThrow(/no mastery property to select/);
    expect(weapons()[0]!.mastery_selected).toBe(false);
  });

  it('refuses an edit that would strip the mastery property from a selected weapon', async () => {
    await run({ type: 'add_weapon', weapon: fromTemplate('Longsword') });
    const id = weapons()[0]!.id;
    await run({ type: 'set_weapon_mastery', weapon_id: id, selected: true });
    await expect(
      run({
        type: 'update_weapon',
        weapon_id: id,
        weapon: { ...fromTemplate('Longsword'), mastery_property: null },
      }),
    ).rejects.toThrow(/Deselect this weapon’s mastery/);
    // And the selection is still there — the refusal did not half-apply.
    expect(weapons()[0]).toMatchObject({
      mastery_selected: true,
      mastery_property: 'Sap',
    });
  });

  it('lets the schema refuse an incoherent row written behind the commands', () => {
    expect(() =>
      db.exec(
        `INSERT INTO character_weapons
           (character_id, name, mastery_property, mastery_selected)
         VALUES (?, 'Cheat', NULL, 1)`,
        [characterId],
      ),
    ).toThrow(/CHECK constraint failed: character_weapons_mastery_requires_property_check/);
  });

  it('refuses to touch another character’s weapon', async () => {
    const other = db.exec("INSERT INTO characters (name) VALUES ('Someone else')")
      .lastInsertId;
    await run({ type: 'add_weapon', weapon: fromTemplate('Mace') }, other);
    const strangerWeapon = Number(
      db.scalar('SELECT id FROM character_weapons WHERE character_id = ?', [
        other,
      ]),
    );

    for (const command of [
      {
        type: 'update_weapon' as const,
        weapon_id: strangerWeapon,
        weapon: custom(),
      },
      { type: 'remove_weapon' as const, weapon_id: strangerWeapon },
      {
        type: 'set_weapon_mastery' as const,
        weapon_id: strangerWeapon,
        selected: true,
      },
    ]) {
      await expect(run(command)).rejects.toThrow(
        /Weapon does not belong to this character/,
      );
    }
    expect(db.scalar('SELECT count(*) FROM character_weapons WHERE character_id = ?', [other])).toBe(1);
  });

  it('refuses a weapon with a blank name', async () => {
    await expect(
      run({ type: 'add_weapon', weapon: custom({ name: '   ' }) }),
    ).rejects.toThrow(/name must not be empty/);
  });

  it('refuses an unknown mastery property, a negative range and a non-boolean toggle', async () => {
    await expect(
      run({
        type: 'add_weapon',
        weapon: {
          ...custom(),
          mastery_property: 'Sparkle',
        } as unknown as WeaponFields,
      }),
    ).rejects.toThrow(/Unknown weapon mastery property/);

    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: { kind: 'ranged', near_feet: -5, far_feet: null },
        }),
      }),
    ).rejects.toThrow(/near_feet must be a non-negative integer/);

    // The UPPER bound, which the column does not have. It exists so that the
    // share boundary — which must refuse an absurd distance from an untrusted
    // document — can refuse it at the same number rather than a lower one, and
    // so leave no range this app will store but not share. See
    // `WEAPON_RANGE_MAX_FEET`.
    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: {
            kind: 'ranged',
            near_feet: 1,
            far_feet: WEAPON_RANGE_MAX_FEET + 1,
          },
        }),
      }),
    ).rejects.toThrow(/far_feet must be a non-negative integer/);
    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: {
            kind: 'ranged',
            near_feet: 1,
            far_feet: WEAPON_RANGE_MAX_FEET,
          },
        }),
      }),
    ).resolves.toBeDefined();

    await expect(
      run({
        type: 'add_weapon',
        weapon: { ...custom(), finesse: 'yes' } as unknown as WeaponFields,
      }),
    ).rejects.toThrow(/finesse must be a boolean/);
  });

  it('refuses an unknown field rather than writing it', async () => {
    await expect(
      run({
        type: 'add_weapon',
        weapon: { ...custom(), sharpness: 3 } as unknown as WeaponFields,
      }),
    ).rejects.toThrow(/Unknown weapon field: sharpness/);

    await expect(
      run({
        type: 'remove_weapon',
        weapon_id: 1,
        sneaky: true,
      } as unknown as CharacterCommandPayload),
    ).rejects.toThrow(/Unknown command field: sneaky/);
  });

  it('requires an exact, coherent ranged payload', async () => {
    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: {
            kind: 'ranged',
            near_feet: null,
            far_feet: 60,
          } as unknown as WeaponFields['range'],
        }),
      }),
    ).rejects.toThrow(/range\.near_feet is required/);

    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: { kind: 'ranged', near_feet: 60, far_feet: 20 },
        }),
      }),
    ).rejects.toThrow(/range\.far_feet must be at least range\.near_feet/);

    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: {
            kind: 'ranged',
            near_feet: 20,
            far_feet: 60,
            unit: 'feet',
          } as unknown as WeaponFields['range'],
        }),
      }),
    ).rejects.toThrow(/Unknown range field: unit/);
  });

  it('never mints legacy, but preserves or explicitly repairs an imported legacy range', async () => {
    await expect(
      run({
        type: 'add_weapon',
        weapon: custom({
          range: { kind: 'legacy', near_feet: 60, far_feet: 20 },
        }),
      }),
    ).rejects.toThrow(/new weapon cannot use a legacy range/i);

    const weaponId = db.exec(
      `INSERT INTO character_weapons
         (character_id, name, range_kind, range_near_feet, range_far_feet)
       VALUES (?, 'Imported', 'legacy', 60, 20)`,
      [characterId],
    ).lastInsertId;
    await expect(
      run({
        type: 'update_weapon',
        weapon_id: weaponId,
        weapon: custom({
          name: 'Imported, annotated',
          range: { kind: 'legacy', near_feet: 60, far_feet: 20 },
        }),
      }),
    ).resolves.toBeDefined();
    await expect(
      run({
        type: 'update_weapon',
        weapon_id: weaponId,
        weapon: custom({
          range: { kind: 'legacy', near_feet: 60, far_feet: 15 },
        }),
      }),
    ).rejects.toThrow(/preserved exactly or explicitly repaired/);
    await expect(
      run({
        type: 'update_weapon',
        weapon_id: weaponId,
        weapon: custom({
          range: { kind: 'ranged', near_feet: 20, far_feet: 60 },
        }),
      }),
    ).resolves.toBeDefined();
    expect(weapons().find((weapon) => weapon.id === weaponId)?.range).toEqual({
      kind: 'ranged',
      near_feet: 20,
      far_feet: 60,
    });
  });

  it('refuses a weapon body that omits a nullable field instead of nulling it', async () => {
    const { damage: _omitted, ...partial } = custom();
    await expect(
      run({
        type: 'add_weapon',
        weapon: partial as unknown as WeaponFields,
      }),
    ).rejects.toThrow(/damage is required/);
  });

  // --- the mastery allowance is advisory, and the count is derived ----------

  it('compares the selection count against the derived allowance without blocking', async () => {
    const fighter = Number(
      db.scalar("SELECT id FROM class_definitions WHERE name = 'Fighter'"),
    );
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 1, 1)`,
      [characterId, fighter],
    );

    // Fighter 1 allows three, transcribed from the extract.
    for (const name of ['Longsword', 'Greatsword', 'Mace', 'Rapier']) {
      await run({ type: 'add_weapon', weapon: fromTemplate(name) });
    }
    const ids = weapons().map((weapon) => weapon.id);
    for (const id of ids.slice(0, 3)) {
      await run({ type: 'set_weapon_mastery', weapon_id: id, selected: true });
    }
    let panel = queries().panel(characterId, panelContext());
    expect(panel.allowance).toMatchObject({ state: 'known', count: 3 });
    expect(panel.selected_count).toBe(3);

    // A fourth is ALLOWED — the application warns, it does not refuse.
    await run({
      type: 'set_weapon_mastery',
      weapon_id: ids[3]!,
      selected: true,
    });
    panel = queries().panel(characterId, panelContext());
    expect(panel.selected_count).toBe(4);
    expect(panel.allowance).toMatchObject({ state: 'known', count: 3 });
  });
});
