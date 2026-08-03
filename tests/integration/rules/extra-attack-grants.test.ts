import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { AbilityScores } from '../../../src/rules/ability-scores';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { SheetContentLookup } from '../../../src/rules/sheet-content-lookup';
import {
  hasBundledSheetContent,
  seedSheetContent,
} from '../../../src/rules/sheet-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { attacksPerAction } from '../../../src/rules/sheet';
import { attackProfiles } from '../../../src/rules/attack-profiles';
import { openTestDatabase } from '../../helpers/open-db';
import {
  insertHomebrewSubclass,
  HOMEBREW_EXTRA_ATTACK_FEATURE,
  HOMEBREW_SUBCLASS_KEY,
  HOMEBREW_SUBCLASS_NAME,
  HOMEBREW_TEXT_FEATURE,
} from '../../fixtures/homebrew-subclass';

/**
 * THE THREE GRANT SOURCES, OUT OF A REAL DATABASE.
 *
 * `tests/unit/rules/extra-attack.test.ts` proves the combination rule against
 * grants built by hand. This file proves the other half: that the rows the
 * seeder actually writes, and the rows an importer would write, come back out
 * of SQLite in the shape those pure functions expect — and that the two arms
 * behave DIFFERENTLY in the way the model says they should.
 *
 *  - a SUBCLASS grant is applied, because the subclass is recorded;
 *  - a FEATURE grant is surfaced and not applied, because nothing records the
 *    character taking it, and the pact weapon is unidentifiable besides.
 *
 * Every expected number is retyped from `docs/srd/source/` or from the fixture,
 * never imported from the code under test.
 */
describe('the grants a character actually has, read from the database', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedClassProgressions(db);
    seedSheetContent(db);
    seedWeaponContent(db);
    characterId = db.exec("INSERT INTO characters (name) VALUES ('Wielder')")
      .lastInsertId;
  });

  afterEach(() => connection.close());

  function classId(name: string): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE name = ?', [name]),
    );
  }

  function addLevels(
    name: string,
    level: number,
    options: { starting?: boolean; subclassId?: number } = {},
  ): void {
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, subclass_definition_id, level,
          is_starting_class)
       VALUES (?, ?, ?, ?, ?)`,
      [
        characterId,
        classId(name),
        options.subclassId ?? null,
        level,
        options.starting === true ? 1 : 0,
      ],
    );
  }

  function lookup(): SheetContentLookup {
    return new SheetContentLookup(db);
  }

  function classes() {
    return lookup().forCharacter(characterId);
  }

  /* ── the bundled named features ─────────────────────────────────────────── */

  it('seeds exactly the two invocations the extract prints, on the Warlock', () => {
    const rows = db.all(
      `SELECT f.content_key, f.name, f.class_level, f.prerequisite,
              effect.effect_kind, effect.attack_count,
              effect.weapon_scope,
              c.name AS class_name
       FROM named_features AS f
       JOIN named_feature_effects AS effect
         ON effect.named_feature_id = f.id
        AND effect.sort_order = 1
       JOIN class_definitions AS c ON c.id = f.class_definition_id
       ORDER BY f.class_level`,
      undefined,
      (row) => ({
        content_key: String(row.content_key),
        name: String(row.name),
        class_name: String(row.class_name),
        class_level: Number(row.class_level),
        prerequisite: String(row.prerequisite),
        effect_kind: String(row.effect_kind),
        attack_count: Number(row.attack_count),
        weapon_scope: String(row.weapon_scope),
      }),
    );
    // Read off `docs/srd/source/extra-attack-other-sources.txt` by eye.
    expect(rows).toEqual([
      {
        content_key: '2024:feature:thirsting-blade',
        name: 'Thirsting Blade',
        class_name: 'Warlock',
        class_level: 5,
        prerequisite: 'Level 5+ Warlock, Pact of the Blade',
        effect_kind: 'extra_attack',
        attack_count: 2,
        weapon_scope: 'one_bonded_weapon',
      },
      {
        content_key: '2024:feature:devouring-blade',
        name: 'Devouring Blade',
        class_name: 'Warlock',
        class_level: 12,
        prerequisite: 'Level 12+ Warlock, Thirsting Blade',
        effect_kind: 'extra_attack',
        attack_count: 3,
        weapon_scope: 'one_bonded_weapon',
      },
    ]);
  });

  it('seeds no subclass feature at all, which D3 requires', () => {
    // SRD 5.2 carries one subclass per class and not one of them grants Extra
    // Attack. The owner's example is not free-licensed, so the MODEL ships and
    // the CONTENT does not. This is that promise, as a failable claim.
    expect(
      Number(db.scalar('SELECT count(*) FROM subclass_features')),
    ).toBe(0);
  });

  it('never seeds the homebrew fixture, by name or by key, anywhere', () => {
    // The count above would pass while the fixture leaked into some OTHER
    // table, so this looks for the fixture's own identifiers in the two places
    // a subclass can be named. It is also the assertion that survives the day
    // a genuinely free-licensed subclass feature IS bundled.
    seedSheetContent(db);
    expect(
      Number(
        db.scalar(
          'SELECT count(*) FROM subclass_definitions WHERE content_key = ? OR name = ?',
          [HOMEBREW_SUBCLASS_KEY, HOMEBREW_SUBCLASS_NAME],
        ),
      ),
    ).toBe(0);
    expect(
      Number(
        db.scalar('SELECT count(*) FROM subclass_features WHERE name IN (?, ?)', [
          HOMEBREW_EXTRA_ATTACK_FEATURE,
          HOMEBREW_TEXT_FEATURE,
        ]),
      ),
    ).toBe(0);
  });

  it('is idempotent, and repairs a database that lost the rows', () => {
    expect(hasBundledSheetContent(db)).toBe(true);
    seedSheetContent(db);
    expect(Number(db.scalar('SELECT count(*) FROM named_features'))).toBe(2);

    db.exec(
      "DELETE FROM named_features WHERE content_key = '2024:feature:devouring-blade'",
    );
    // COUNTED, not existence-checked: one row of two is a broken database.
    expect(hasBundledSheetContent(db)).toBe(false);
    seedSheetContent(db);
    expect(Number(db.scalar('SELECT count(*) FROM named_features'))).toBe(2);
  });

  it('repairs a row whose PAYLOAD was corrupted, not only a missing one', () => {
    // A key-only health guard reports this database as healthy, and the sheet
    // then prints "would give 4 attacks" — a sourced-looking number that is in
    // no extract anywhere. Each column is broken separately so a guard that
    // compares only some of them fails on the ones it skipped.
    const corruptions: readonly {
      readonly label: string;
      readonly mutate: () => void;
    }[] = [
      {
        label: 'attack_count = 4',
        mutate: () =>
          db.exec(
            `UPDATE named_feature_effects SET attack_count = 4
             WHERE named_feature_id = (
               SELECT id FROM named_features
               WHERE content_key = '2024:feature:thirsting-blade'
             )`,
          ),
      },
      {
        label: "weapon_scope = 'any_weapon'",
        mutate: () =>
          db.exec(
            `UPDATE named_feature_effects SET weapon_scope = 'any_weapon'
             WHERE named_feature_id = (
               SELECT id FROM named_features
               WHERE content_key = '2024:feature:thirsting-blade'
             )`,
          ),
      },
      {
        label: 'effect child missing',
        mutate: () =>
          db.exec(
            `DELETE FROM named_feature_effects
             WHERE named_feature_id = (
               SELECT id FROM named_features
               WHERE content_key = '2024:feature:thirsting-blade'
             )`,
          ),
      },
      ...[
        'class_level = 3',
        "prerequisite = 'Level 5+ Warlock'",
        "description = ''",
        "name = 'Thirsty Blade'",
        "rules_edition = '2014'",
      ].map((setClause) => ({
        label: setClause,
        mutate: () =>
          db.exec(
            `UPDATE named_features SET ${setClause}
             WHERE content_key = '2024:feature:thirsting-blade'`,
          ),
      })),
    ];
    for (const corruption of corruptions) {
      corruption.mutate();
      expect(hasBundledSheetContent(db), corruption.label).toBe(false);
      seedSheetContent(db);
      expect(hasBundledSheetContent(db), corruption.label).toBe(true);
    }
    // And after every repair the row says exactly what the extract says.
    expect(
      db.scalar(
        `SELECT effect.attack_count
         FROM named_feature_effects AS effect
         JOIN named_features AS feature
           ON feature.id = effect.named_feature_id
         WHERE feature.content_key = '2024:feature:thirsting-blade'`,
      ),
    ).toBe(2);
  });

  it('repairs a row parked on the wrong class', () => {
    db.exec(
      `UPDATE named_features SET class_definition_id = ?
       WHERE content_key = '2024:feature:thirsting-blade'`,
      [classId('Fighter')],
    );
    expect(hasBundledSheetContent(db)).toBe(false);
    seedSheetContent(db);
    expect(
      Number(
        db.scalar(
          `SELECT class_definition_id FROM named_features
           WHERE content_key = '2024:feature:thirsting-blade'`,
        ),
      ),
    ).toBe(classId('Warlock'));
  });

  it('yields the name slot to a user rather than aborting the whole seed', () => {
    // `named_features` is unique on (class, name, edition) as well as on
    // content_key. A user's own 2024 Warlock feature called Thirsting Blade
    // would make a blind INSERT fail — and the seed runs in ONE transaction, so
    // the failure would take the armour catalog and every class's sheet content
    // with it on every boot. `upsertThirdCaster` settled this policy: the
    // holder wins.
    db.exec("DELETE FROM named_features WHERE content_key = '2024:feature:thirsting-blade'");
    db.exec(
      `INSERT INTO named_features
         (content_key, class_definition_id, name, rules_edition, prerequisite,
          description, class_level)
       VALUES ('2024:homebrew.fixture:thirsting-blade', ?, 'Thirsting Blade',
               '2024', 'Level 4+ Warlock', 'A feature this user wrote.', 4)`,
      [classId('Warlock')],
    );

    expect(() => seedSheetContent(db)).not.toThrow();
    // The user's row is untouched...
    expect(
      db.scalar(
        `SELECT class_level FROM named_features
         WHERE content_key = '2024:homebrew.fixture:thirsting-blade'`,
      ),
    ).toBe(4);
    // ...the bundled one was not forced in beside it...
    expect(
      db.scalar(
        "SELECT count(*) FROM named_features WHERE content_key = '2024:feature:thirsting-blade'",
      ),
    ).toBe(0);
    // ...and the guard does not then demand it forever.
    expect(hasBundledSheetContent(db)).toBe(true);
    // The rest of the sheet catalog survived the transaction intact.
    expect(
      Number(db.scalar('SELECT count(*) FROM class_sheet_traits')),
    ).toBeGreaterThan(0);
  });

  it('leaves no bundled row parked elsewhere when it yields a slot', () => {
    // Yielding used to abandon a row under the BUNDLED content key wherever it
    // happened to be — on the wrong class, under a mangled name — and the
    // reader would then have surfaced it as sourced content. Here the bundled
    // row is parked on the Fighter under a different name while a user holds
    // the real Warlock slot.
    db.exec(
      `UPDATE named_features
       SET class_definition_id = ?, name = 'Thirsting Edge'
       WHERE content_key = '2024:feature:thirsting-blade'`,
      [classId('Fighter')],
    );
    db.exec(
      `UPDATE named_feature_effects SET attack_count = 4
       WHERE named_feature_id = (
         SELECT id FROM named_features
         WHERE content_key = '2024:feature:thirsting-blade'
       )`,
    );
    db.exec(
      `INSERT INTO named_features
         (content_key, class_definition_id, name, rules_edition, prerequisite,
          description, class_level)
       VALUES ('2024:homebrew.fixture:thirsting-blade', ?, 'Thirsting Blade',
               '2024', 'Level 4+ Warlock', 'A feature this user wrote.', 4)`,
      [classId('Warlock')],
    );

    expect(hasBundledSheetContent(db)).toBe(false);
    seedSheetContent(db);
    // The stale bundled row is GONE rather than left to be read...
    expect(
      db.scalar(
        "SELECT count(*) FROM named_features WHERE content_key = '2024:feature:thirsting-blade'",
      ),
    ).toBe(0);
    // ...the user's row is untouched...
    expect(
      db.scalar(
        `SELECT class_level FROM named_features
         WHERE content_key = '2024:homebrew.fixture:thirsting-blade'`,
      ),
    ).toBe(4);
    // ...and the state is stable rather than repaired-then-broken again.
    expect(hasBundledSheetContent(db)).toBe(true);

    // Nothing on the Fighter surfaces a four-attack grant that is in no extract.
    addLevels('Fighter', 20, { starting: true });
    expect(attacksPerAction(classes()).count).toBe(4);
    expect(
      attacksPerAction(classes()).unresolved.map((g) => g.source_name),
    ).toEqual([]);
  });

  it('repairs a bundled row parked on the OTHER bundled feature’s name slot', () => {
    // The ordering hazard an upsert had and a clear-first pass does not. With
    // the Devouring Blade row renamed to Thirsting Blade, seeding Thirsting
    // Blade first sees an occupied slot; an upsert would yield it, then free it
    // one row later and leave Thirsting Blade missing until the NEXT boot.
    db.exec(
      "DELETE FROM named_features WHERE content_key = '2024:feature:thirsting-blade'",
    );
    db.exec(
      `UPDATE named_features SET name = 'Thirsting Blade'
       WHERE content_key = '2024:feature:devouring-blade'`,
    );

    expect(hasBundledSheetContent(db)).toBe(false);
    // ONE pass, not two.
    seedSheetContent(db);
    expect(hasBundledSheetContent(db)).toBe(true);
    expect(
      db.all(
        'SELECT content_key, name FROM named_features ORDER BY class_level',
        undefined,
        (row) => [String(row.content_key), String(row.name)],
      ),
    ).toEqual([
      ['2024:feature:thirsting-blade', 'Thirsting Blade'],
      ['2024:feature:devouring-blade', 'Devouring Blade'],
    ]);
  });

  it('attaches the bundled features to the class of their OWN edition', () => {
    // `class_definitions` is unique on (name, rules_edition), so two Warlocks
    // legitimately coexist. A name-only lookup picks whichever row the query
    // returned last, which would surface an invocation on a character who
    // cannot take it and hide it from one who can.
    db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('2014:class:warlock', 'Warlock', '2014')`,
    );
    db.exec("DELETE FROM named_features");
    seedSheetContent(db);
    const owners = db.all(
      `SELECT c.rules_edition AS edition FROM named_features AS f
       JOIN class_definitions AS c ON c.id = f.class_definition_id`,
      undefined,
      (row) => String(row.edition),
    );
    expect(owners).toEqual(['2024', '2024']);
  });

  it("does not delete a user's own named feature on the same class", () => {
    // The class-content seeder clears six tables by class id on every reseed,
    // which is right for a SET it wholly owns and would be data loss here.
    db.exec(
      `INSERT INTO named_features
         (content_key, class_definition_id, name, rules_edition, prerequisite,
          description, class_level)
       VALUES ('2024:homebrew.fixture:borrowed-edge', ?, 'Borrowed Edge',
               '2024', 'Level 3+ Warlock', 'A feature this user wrote.', 3)`,
      [classId('Warlock')],
    );
    seedSheetContent(db);
    expect(
      Number(
        db.scalar(
          "SELECT count(*) FROM named_features WHERE name = 'Borrowed Edge'",
        ),
      ),
    ).toBe(1);
  });

  /* ── the feature arm: surfaced, never applied ───────────────────────────── */

  it('surfaces Thirsting Blade against a Warlock 5 without applying it', () => {
    addLevels('Warlock', 5, { starting: true });
    const result = attacksPerAction(classes());
    // ONE attack. This application records neither the invocation nor which
    // weapon is the pact weapon, so two would be wrong for every other weapon.
    expect(result.count).toBe(1);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]?.source).toBe('feature');
    expect(result.unresolved[0]?.source_name).toBe('Thirsting Blade');
    expect(result.unresolved[0]?.attack_count).toBe(2);
    // Both reasons, because both are true at once.
    expect(result.unresolved[0]?.unresolved).toHaveLength(2);
  });

  it('reports both invocations a Warlock 12 holds, highest first', () => {
    addLevels('Warlock', 12, { starting: true });
    const result = attacksPerAction(classes());
    // Still ONE applied attack: neither can be confirmed.
    expect(result.count).toBe(1);
    // Both listed. They share `one_bonded_weapon`, and a scope is not a weapon,
    // so dropping the smaller would be a guess about which weapon each names.
    // The upgrade is expressed by the TOTALS being absolute — 3 and 2, never
    // 2 and +1 — so nothing anywhere has to add them.
    expect(
      result.unresolved.map((grant) => [grant.source_name, grant.attack_count]),
    ).toEqual([
      ['Devouring Blade', 3],
      ['Thirsting Blade', 2],
    ]);
  });

  it('stops mentioning it once a class grant has caught up', () => {
    // "…doesn't give you additional attacks if you also have Extra Attack."
    addLevels('Fighter', 11, { starting: true });
    addLevels('Warlock', 12);
    const result = attacksPerAction(classes());
    expect(result.count).toBe(3);
    expect(result.unresolved).toEqual([]);
  });

  it('is the case one number cannot answer: Fighter 5 / Warlock 12', () => {
    addLevels('Fighter', 5, { starting: true });
    addLevels('Warlock', 12);
    const result = attacksPerAction(classes());
    // Two with any weapon; three with the pact weapon, if they took both
    // invocations. Neither number is right for the other case.
    expect(result.count).toBe(2);
    expect(result.unresolved.map((grant) => grant.attack_count)).toEqual([3]);
  });

  it('gives a Warlock below the prerequisite level nothing to surface', () => {
    addLevels('Warlock', 4, { starting: true });
    const result = attacksPerAction(classes());
    expect(result.count).toBe(1);
    expect(result.unresolved).toEqual([]);
  });

  /* ── the subclass arm: applied, because the subclass is recorded ────────── */

  it('applies a homebrew subclass grant at the level in ITS OWN class', () => {
    const subclassId = insertHomebrewSubclass(db);
    addLevels('Bard', 6, { starting: true, subclassId });

    const [bard] = classes();
    expect(bard?.subclass).toEqual({
      id: subclassId,
      name: HOMEBREW_SUBCLASS_NAME,
    });
    const result = attacksPerAction(classes());
    // TWO, applied outright: a subclass IS recorded on the character, and the
    // fixture's grant reaches every weapon.
    expect(result.count).toBe(2);
    expect(result.unresolved).toEqual([]);
  });

  it('lists the subclass whole, unfiltered, while applying only what is due', () => {
    // `all_subclass_features` IS NOT LEVEL-FILTERED, AND THE NAME SAYS SO. A
    // Bard 3 gets BOTH features back — this is a planner, and the level 6 one
    // is what they are levelling towards — but the number is still 1, because
    // the `class_level <= level` filter lives in `resolveAttacksPerAction` and
    // is stated exactly once. A consumer that wants only what is in hand
    // filters on each entry's own `class_level`, which is why it is carried.
    const subclassId = insertHomebrewSubclass(db);
    addLevels('Bard', 3, { starting: true, subclassId });

    const [bard] = classes();
    expect(
      bard?.all_subclass_features.map((feature) => [
        feature.name,
        feature.class_level,
      ]),
    ).toEqual([
      [HOMEBREW_TEXT_FEATURE, 3],
      [HOMEBREW_EXTRA_ATTACK_FEATURE, 6],
    ]);
    expect(attacksPerAction(classes()).count).toBe(1);
  });

  it('withholds it from a Bard 5 whose CHARACTER level is 6', () => {
    const subclassId = insertHomebrewSubclass(db);
    addLevels('Bard', 5, { starting: true, subclassId });
    addLevels('Fighter', 1);
    // Character level 6, Bard level 5. The grant is at BARD level 6.
    expect(attacksPerAction(classes()).count).toBe(1);
  });

  it('does not stack the subclass grant with a class one', () => {
    const subclassId = insertHomebrewSubclass(db);
    addLevels('Bard', 6, { starting: true, subclassId });
    addLevels('Fighter', 5);
    // Two grants, one feature. A sum would give four.
    expect(attacksPerAction(classes()).count).toBe(2);
  });

  it('reads the text-only feature back with its paragraph and no effect', () => {
    const subclassId = insertHomebrewSubclass(db);
    addLevels('Bard', 6, { starting: true, subclassId });

    const [bard] = classes();
    expect(
      bard?.all_subclass_features.map((feature) => [
        feature.sort_order,
        feature.name,
        feature.class_level,
        feature.effect === null,
      ]),
    ).toEqual([
      [1, HOMEBREW_TEXT_FEATURE, 3, true],
      [2, HOMEBREW_EXTRA_ATTACK_FEATURE, 6, false],
    ]);
    // The paragraph survives the round trip, which is the whole free-text half.
    expect(bard?.all_subclass_features[0]?.description).toContain(
      'nail at your belt',
    );
    expect(bard?.all_subclass_features[1]?.effect).toEqual({
      kind: 'extra_attack',
      attack_count: 2,
      weapon_scope: 'any_weapon',
    });
  });

  it('surfaces a WEAPON-SCOPED subclass grant instead of applying it', () => {
    // No SRD subclass is scoped and the fixture's grant is not either, so this
    // is the one branch of `subclassGrants` neither would ever reach. A
    // homebrew subclass CAN say `one_bonded_weapon`, and when it does the
    // grant must be surfaced with the weapon reason and NOT counted — the same
    // answer an invocation gets, arrived at down a different code path.
    const subclassId = insertHomebrewSubclass(db);
    db.exec(
      `INSERT INTO subclass_features
         (subclass_definition_id, class_level, sort_order, name, description)
       VALUES (?, 6, 3, 'Bound Refrain',
               'A feature this user wrote, tied to one instrument they carry.')`,
      [subclassId],
    );
    db.exec(
      `INSERT INTO subclass_feature_effects
         (subclass_feature_id, sort_order, effect_kind, attack_count,
          weapon_scope, label)
       VALUES (last_insert_rowid(), 1, 'extra_attack', 3,
               'one_bonded_weapon', 'Bound Refrain')`,
    );
    addLevels('Bard', 6, { starting: true, subclassId });

    const result = attacksPerAction(classes());
    // TWO from the fixture's unscoped level 6 grant; the scoped 3 is stated,
    // not counted, and it is listed because it would have beaten the 2.
    expect(result.count).toBe(2);
    expect(
      result.unresolved.map((grant) => [
        grant.source,
        grant.source_name,
        grant.attack_count,
        grant.unresolved.length,
      ]),
    ).toEqual([['subclass', 'Bound Refrain', 3, 1]]);
    expect(result.unresolved[0]?.unresolved[0]).toContain(
      'one bonded weapon only',
    );
    // A SUBCLASS grant carries no selection reason: the subclass is recorded.
    expect(result.unresolved[0]?.unresolved.join(' ')).not.toContain(
      'optional class features',
    );
  });

  it('gives a Bard with no subclass an empty feature list rather than a null', () => {
    addLevels('Bard', 6, { starting: true });
    const [bard] = classes();
    expect(bard?.subclass).toBeNull();
    expect(bard?.all_subclass_features).toEqual([]);
    expect(attacksPerAction(classes()).count).toBe(1);
  });

  /* ── what the weapons panel says about it ───────────────────────────────── */

  it('states the ignorance on the profile AND in a panel warning', () => {
    addLevels('Warlock', 5, { starting: true });
    const result = attackProfiles({
      weapons: [
        {
          id: 1,
          name: 'Heavy Crossbow',
          damage: { kind: 'dice', dice: '1d10' },
          damage_type: 'Piercing',
          versatile_damage: { kind: 'not_applicable' },
          proficiency: { kind: 'proficient', via: ['Warlock'] },
        },
      ],
      classes: classes(),
      scores: AbilityScores.fromArray({
        strength: 10,
        dexterity: 14,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 16,
      }),
      proficiencyBonus: 3,
      cantrips: {
        true_strike: { state: 'not_known' },
        shillelagh: { state: 'not_known' },
        unrecognised: [],
      },
      effects: [],
    });

    // The crossbow gets ONE attack, which is the answer that would have been
    // wrong had the pact-weapon grant been folded into a character-wide number.
    expect(result.attacks_per_action).toBe(1);
    expect(result.has_extra_attack).toBe(false);
    const [profile] = result.weapons[0]?.profiles ?? [];
    expect(profile?.attacks_per_action).toBe(1);
    expect(profile?.unresolved_attacks.map((grant) => grant.source_name)).toEqual(
      ['Thirsting Blade'],
    );

    const warning = result.warnings.find(
      (entry) => entry.code === 'unresolved_extra_attack',
    );
    expect(warning?.message).toContain('Thirsting Blade');
    expect(warning?.message).toContain('would give 2 attacks');
    expect(warning?.message).toContain('one bonded weapon only');
  });

  it('says nothing of the sort for a character with no unresolved grant', () => {
    addLevels('Fighter', 5, { starting: true });
    const result = attackProfiles({
      weapons: [
        {
          id: 1,
          name: 'Longsword',
          damage: { kind: 'dice', dice: '1d8' },
          damage_type: 'Slashing',
          versatile_damage: { kind: 'dice', dice: '1d10' },
          proficiency: { kind: 'proficient', via: ['Fighter'] },
        },
      ],
      classes: classes(),
      scores: AbilityScores.fromArray({
        strength: 16,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      }),
      proficiencyBonus: 3,
      cantrips: {
        true_strike: { state: 'not_known' },
        shillelagh: { state: 'not_known' },
        unrecognised: [],
      },
      effects: [],
    });
    expect(result.attacks_per_action).toBe(2);
    expect(
      result.warnings.filter(
        (entry) => entry.code === 'unresolved_extra_attack',
      ),
    ).toEqual([]);
    expect(result.weapons[0]?.profiles[0]?.unresolved_attacks).toEqual([]);
  });
});
