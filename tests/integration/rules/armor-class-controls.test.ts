import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../../../src/domain/source-markers';
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
