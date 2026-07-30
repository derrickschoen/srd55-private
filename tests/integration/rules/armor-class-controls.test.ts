import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { createGuidedCharacter } from '../../../src/builder/guided-creation';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../../../src/domain/source-markers';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { AbilityScores } from '../../../src/rules/ability-scores';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { readEligibleCharacterEffects } from '../../../src/rules/eligible-character-effects';
import {
  armorClass,
  type ArmorClassFormulaCandidate,
} from '../../../src/rules/sheet';
import { seedSheetContent } from '../../../src/rules/sheet-srd';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
const integrity = new CharacterCommandIntegrity(
  'unarmored-defense-real-content-test-key',
);

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  seedClassProgressions(db);
  seedSheetContent(db);
  return db;
}

function sourceId(
  db: DatabaseContext,
  characterId: number,
  sourceType: 'class' | 'species',
): number {
  return Number(
    db.scalar(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND source_type = ? AND state = 'active'`,
      [characterId, sourceType],
    ),
  );
}

function guidedCharacter(
  db: DatabaseContext,
  classContentKey: '2024:class:barbarian' | '2024:class:monk',
  name: string,
): number {
  return createGuidedCharacter(
    db,
    { name, class_content_key: classContentKey },
    integrity,
  ).id;
}

function classId(db: DatabaseContext, className: string): number {
  return Number(
    db.scalar(
      `SELECT id FROM class_definitions
       WHERE name = ? AND rules_edition = '2024'`,
      [className],
    ),
  );
}

type IdBearingFormula = ArmorClassFormulaCandidate & {
  readonly source_instance_id: number | null;
};

function winningFormulaLabel(
  db: DatabaseContext,
  characterId: number,
): string {
  const formulas = readEligibleCharacterEffects(
    db,
    characterId,
    'display',
  )
    .filter((effect) => effect.effect_kind === 'armor_class_formula')
    .map((effect): IdBearingFormula => {
      if (
        effect.base === null ||
        effect.ability_1 === null ||
        effect.allows_shield === null ||
        (effect.source_type !== 'class' &&
          effect.source_type !== 'species')
      ) {
        throw new Error('The AC tie fixture has an incomplete formula.');
      }
      return {
        kind: 'ability_formula',
        label: effect.label,
        source: effect.source_type,
        base: effect.base,
        ability_1: effect.ability_1,
        ability_2: effect.ability_2,
        allows_shield: effect.allows_shield,
        // Production deliberately omits this field. AC-TIE-STABLE's mutant
        // adds it and orders by it, making the constructed inversion below
        // observable without teaching the real resolver about database ids.
        source_instance_id: effect.source_instance_id,
      };
    });
  const result = armorClass({
    equipment: [],
    formulas,
    bonuses: [],
    scores: AbilityScores.fromArray({
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }),
  });
  return result.winner.formula.label;
}

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

describe('Armor Class mutation controls', () => {
  it('gives a guided level-1 Barbarian the sourced shield-compatible formula', async () => {
    const db = await database();
    const characterId = guidedCharacter(
      db,
      '2024:class:barbarian',
      'Shielded Barbarian',
    );
    db.exec(
      `UPDATE characters SET dexterity = 14, constitution = 16 WHERE id = ?`,
      [characterId],
    );

    expect(
      readEligibleCharacterEffects(db, characterId, 'display'),
    ).toMatchObject([
      {
        effect_kind: 'armor_class_formula',
        base: 10,
        ability_1: 'dexterity',
        ability_2: 'constitution',
        allows_shield: true,
        source_type: 'class',
        label: 'Unarmored Defense',
      },
    ]);

    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'shield', 'Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    const resolved = new CharacterSheetBuilder(db).build(characterId)
      .armor_class;
    expect(resolved.value).toBe(17);
    expect(resolved.winner).toEqual({
      label: 'Unarmored Defense',
      source: 'class',
      expression: '10 + DEX + CON',
      total: 15,
    });
    expect(resolved.excluded).toEqual([]);
  });

  it("excludes a guided level-1 Monk's real formula while a shield is held", async () => {
    const db = await database();
    const characterId = guidedCharacter(
      db,
      '2024:class:monk',
      'Shielded Monk',
    );
    db.exec(
      `UPDATE characters SET dexterity = 16, wisdom = 16 WHERE id = ?`,
      [characterId],
    );
    const builder = new CharacterSheetBuilder(db);

    expect(builder.build(characterId).armor_class).toMatchObject({
      value: 16,
      winner: {
        label: 'Unarmored Defense',
        source: 'class',
        expression: '10 + DEX + WIS',
        total: 16,
      },
    });

    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'shield', 'Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    const shielded = builder.build(characterId).armor_class;
    expect(shielded.value).toBe(15);
    expect(shielded.excluded).toEqual([
      {
        formula: {
          label: 'Unarmored Defense',
          source: 'class',
          expression: '10 + DEX + WIS',
          total: null,
        },
        reason: {
          kind: 'shield_not_allowed',
          shield_name: 'Shield',
        },
      },
    ]);
  });

  it('seeds each real formula exactly and re-syncs exactly one generated row per class', async () => {
    const db = await database();
    expect(
      db.allRaw(
        `SELECT class.name AS class_name, effect.class_level, effect.name,
                effect.effect_kind, effect.base, effect.ability_1,
                effect.ability_2, effect.allows_shield
         FROM class_feature_effects AS effect
         JOIN class_definitions AS class
           ON class.id = effect.class_definition_id
         ORDER BY class.name`,
      ),
    ).toEqual([
      {
        class_name: 'Barbarian',
        class_level: 1,
        name: 'Unarmored Defense',
        effect_kind: 'armor_class_formula',
        base: 10,
        ability_1: 'dexterity',
        ability_2: 'constitution',
        allows_shield: 1,
      },
      {
        class_name: 'Monk',
        class_level: 1,
        name: 'Unarmored Defense',
        effect_kind: 'armor_class_formula',
        base: 10,
        ability_1: 'dexterity',
        ability_2: 'wisdom',
        allows_shield: 0,
      },
    ]);

    const barbarianId = guidedCharacter(
      db,
      '2024:class:barbarian',
      'Re-synced Barbarian',
    );
    const monkId = guidedCharacter(
      db,
      '2024:class:monk',
      'Re-synced Monk',
    );
    for (const [characterId, className] of [
      [barbarianId, 'Barbarian'],
      [monkId, 'Monk'],
    ] as const) {
      new UpdateClassCommand(
        db,
        {
          type: 'update_class',
          class_definition_id: classId(db, className),
        },
        integrity,
      ).apply(characterId);
      expect(
        db.allRaw(
          `SELECT effect.label, effect.template_ref
           FROM character_effects AS effect
           JOIN character_source_instances AS source
             ON source.id = effect.source_instance_id
           WHERE effect.character_id = ?
             AND source.source_type = 'class'
             AND effect.template_ref IS NOT NULL`,
          [characterId],
        ),
        className,
      ).toEqual([
        {
          label: 'Unarmored Defense',
          template_ref: expect.stringMatching(
            /^class_feature_effects:\d+$/,
          ),
        },
      ]);
    }
  });

  it('keeps the source-and-label tie winner stable across a clone with inverted source ids', async () => {
    const original = await database();
    const fighterId = Number(
      original.scalar(
        "SELECT id FROM class_definitions WHERE content_key = '2024:class:fighter'",
      ),
    );
    const characterId = original.exec(
      `INSERT INTO characters (
         name, strength, dexterity, constitution, intelligence, wisdom, charisma
       ) VALUES ('Armadillo Tie', 10, 10, 10, 10, 10, 10)`,
    ).lastInsertId;
    original.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 1, 1)`,
      [characterId, fighterId],
    );

    // Acquire class, then species. Reacquiring the class after tombstoning its
    // first source puts species before class by database id in the original.
    const retiredClassId = original.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'tie-class-retired', 'class', ?, 'Fighter 1', '{}', 1, 'active'
       )`,
      [characterId, fighterId],
    ).lastInsertId;
    const originalSpeciesId = original.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name, config,
         acquired_at_character_level, state, notes
       ) VALUES (
         ?, 'tie-species', 'species', 'Armadillo', '{}', 1, 'active', ?
       )`,
      [characterId, GUIDED_SPECIES_SOURCE_MARKER],
    ).lastInsertId;
    original.exec(
      `UPDATE character_source_instances
       SET state = 'tombstoned' WHERE id = ?`,
      [retiredClassId],
    );
    const originalClassId = original.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'tie-class-reacquired', 'class', ?, 'Fighter 1', '{}', 1, 'active'
       )`,
      [characterId, fighterId],
    ).lastInsertId;
    original.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, base, ability_1, ability_2,
         allows_shield, source_instance_id, label
       ) VALUES
         (?, 1, 'armor_class_formula', 10, 'dexterity', NULL, 1, ?,
          'Armadillo Shell'),
         (?, 2, 'armor_class_formula', 10, 'dexterity', NULL, 1, ?,
          'Carapace Discipline')`,
      [characterId, originalSpeciesId, characterId, originalClassId],
    );
    expect(originalSpeciesId).toBeLessThan(originalClassId);

    // Share import canonicalises classes before explicit species sources, so
    // the clone has the opposite database-id order even though it is the same
    // character build.
    const clone = await database();
    const document = await decodeShareFragment(
      await encodeShareFragment(
        exportCharacterShare(original, characterId),
      ),
    );
    const imported = importCharacterShare(clone, document);
    const cloneClassId = sourceId(clone, imported.characterId, 'class');
    const cloneSpeciesId = sourceId(clone, imported.characterId, 'species');
    expect(cloneClassId).toBeLessThan(cloneSpeciesId);

    const originalWinner = winningFormulaLabel(original, characterId);
    const cloneWinner = winningFormulaLabel(clone, imported.characterId);
    expect(originalWinner).toBe('Armadillo Shell');
    expect(cloneWinner).toBe('Armadillo Shell');
    expect(cloneWinner).toBe(originalWinner);
  });
});
