import { afterEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_RPC,
  LINEAGE_SPELL_SPECIES_CONTENT_KEYS,
  type GuidedApplyOriginResult,
  type GuidedOriginOption,
} from '../../../src/builder/contracts';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { applicationSeed } from '../../../src/db/bootstrap';
import type { DatabaseContext } from '../../../src/db/database';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function applicationDatabase(): Promise<RpcHarness> {
  harness = await createRpcHarness([]);
  return harness;
}

function seamStep(index: number) {
  const step = GUIDED_LEVEL_ONE_STEP_ORDER[index];
  if (step === undefined) {
    throw new Error(`The seam has no guided step at index ${index}.`);
  }
  return step;
}

function speciesNamed(
  db: DatabaseContext,
  name: string,
): GuidedOriginOption {
  const option = listGuidedOriginOptions(db, 'species').find(
    (candidate) => candidate.name === name,
  );
  if (option === undefined) {
    throw new Error(`The bundled species catalogue has no ${name}.`);
  }
  return option;
}

function createClassedCharacter(db: DatabaseContext, name: string): number {
  const classOption = listGuidedClassOptions(db)[0];
  if (classOption === undefined) {
    throw new Error('The bundled class catalogue is empty.');
  }
  const characterId = createGuidedCharacter(
    db,
    {
      name,
      class_content_key: classOption.content_key,
    },
    new CharacterCommandIntegrity('guided-species-test-key'),
  ).id;
  db.exec(
    `UPDATE characters
     SET ability_allocation_method = 'standard_array'
     WHERE id = ?`,
    [characterId],
  );
  return characterId;
}

function guidedSpeciesSources(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT id, display_name, config
     FROM character_source_instances
     WHERE character_id = ?
       AND source_type = 'species'
       AND notes = 'guided:species-apply'
     ORDER BY id`,
    [characterId],
  );
}

function speciesSpellSlotCount(
  db: DatabaseContext,
  characterId: number,
): number {
  return Number(
    db.scalar(
      `SELECT count(*)
       FROM spell_selection_slots AS slot
       INNER JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE slot.character_id = ?
         AND source.source_type = 'species'
         AND source.notes = 'guided:species-apply'`,
      [characterId],
    ),
  );
}

interface FixtureEffect {
  readonly kind: 'damage_resistance' | 'speed';
  readonly damageType?: 'Cold' | 'Fire';
  readonly speedBonusFeet?: number;
}

interface FixtureTrait {
  readonly name: string;
  readonly effects: readonly FixtureEffect[];
}

function replaceTemplateFixture(
  db: DatabaseContext,
  option: GuidedOriginOption,
  speedFeet: number,
  traits: readonly FixtureTrait[],
): void {
  const templateId = Number(
    db.scalar(
      'SELECT id FROM species_templates WHERE content_key = ?',
      [option.content_key],
    ),
  );
  if (!Number.isSafeInteger(templateId) || templateId < 1) {
    throw new Error(`No species template row exists for ${option.content_key}.`);
  }
  db.transaction(() => {
    db.exec(
      `DELETE FROM species_template_trait_effects
       WHERE species_template_trait_id IN (
         SELECT id
         FROM species_template_traits
         WHERE species_template_id = ?
       )`,
      [templateId],
    );
    db.exec(
      'DELETE FROM species_template_traits WHERE species_template_id = ?',
      [templateId],
    );
    db.exec(
      'UPDATE species_templates SET base_speed_feet = ? WHERE id = ?',
      [speedFeet, templateId],
    );
    traits.forEach((trait, traitIndex) => {
      const traitId = db.exec(
        `INSERT INTO species_template_traits
           (species_template_id, sort_order, name, description)
         VALUES (?, ?, ?, ?)`,
        [
          templateId,
          traitIndex + 1,
          trait.name,
          `${trait.name} fixture description.`,
        ],
      ).lastInsertId;
      trait.effects.forEach((effect, effectIndex) => {
        db.exec(
          `INSERT INTO species_template_trait_effects
             (species_template_trait_id, sort_order, effect_kind,
              damage_type, speed_bonus_feet)
           VALUES (?, ?, ?, ?, ?)`,
          [
            traitId,
            effectIndex + 1,
            effect.kind,
            effect.damageType ?? null,
            effect.speedBonusFeet ?? null,
          ],
        );
      });
    });
  });
}

describe('guided species application', () => {
  it('A4-APPLIED changes the real sheet speed and exposes copied effects', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const species = speciesNamed(db, 'Dwarf');
    const characterId = createClassedCharacter(db, 'Applied Species');
    replaceTemplateFixture(db, species, 37, [
      {
        name: 'Applied Ward',
        effects: [{ kind: 'damage_resistance', damageType: 'Fire' }],
      },
      {
        name: 'Applied Stride',
        effects: [{ kind: 'speed', speedBonusFeet: 4 }],
      },
    ]);

    const result = applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: species.content_key,
    });
    const sheet = new CharacterSheetBuilder(db).build(characterId);

    expect(result).toEqual({
      character_id: characterId,
      current_step: seamStep(3),
    } satisfies GuidedApplyOriginResult);
    expect(sheet.walking_speed_feet).toBe(41);
    expect(sheet.damage_resistances).toEqual(['Fire']);
    expect(
      db.allRaw(
        `SELECT effect_kind, damage_type, speed_bonus_feet, label
         FROM character_effects
         WHERE character_id = ?
         ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Fire',
        speed_bonus_feet: null,
        label: 'Applied Ward',
      },
      {
        effect_kind: 'speed',
        damage_type: null,
        speed_bonus_feet: 4,
        label: 'Applied Stride',
      },
    ]);
  });

  it('re-applying replaces the species-owned rows while preserving a source-backed effect with the old trait label', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const first = speciesNamed(db, 'Dwarf');
    const second = speciesNamed(db, 'Goliath');
    const characterId = createClassedCharacter(db, 'Replacement Species');
    replaceTemplateFixture(db, first, 31, [
      {
        name: 'Old Ward',
        effects: [{ kind: 'damage_resistance', damageType: 'Fire' }],
      },
      {
        name: 'Old Stride',
        effects: [{ kind: 'speed', speedBonusFeet: 2 }],
      },
    ]);
    replaceTemplateFixture(db, second, 43, [
      {
        name: 'New Ward',
        effects: [{ kind: 'damage_resistance', damageType: 'Cold' }],
      },
    ]);

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: first.content_key,
    });
    const sourceId = db.exec(
      `INSERT INTO character_source_instances
         (character_id, instance_uuid, source_type, display_name)
       VALUES (?, ?, 'feat', 'Imported Ward Source')`,
      [characterId, crypto.randomUUID()],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_effects
         (character_id, sort_order, effect_kind, damage_type,
          source_instance_id, label)
       VALUES (?, 50, 'damage_resistance', 'Cold', ?, 'Old Ward')`,
      [characterId, sourceId],
    );

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: second.content_key,
    });
    const replacementSources = guidedSpeciesSources(db, characterId);
    expect(replacementSources).toHaveLength(1);
    const replacementSourceId = Number(replacementSources[0]?.['id']);
    const replacementTemplateRef = `species_template_trait_effects:${String(
      db.scalar(
        `SELECT effect.id
         FROM species_template_trait_effects AS effect
         JOIN species_template_traits AS trait
           ON trait.id = effect.species_template_trait_id
         JOIN species_templates AS template
           ON template.id = trait.species_template_id
         WHERE template.content_key = ? AND trait.name = 'New Ward'`,
        [second.content_key],
      ),
    )}`;

    expect(
      db.allRaw(
        `SELECT name, base_speed_feet
         FROM character_species
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ name: second.name, base_speed_feet: 43 }]);
    expect(
      db.allRaw(
        `SELECT sort_order, name
         FROM character_species_traits
         WHERE character_id = ?
         ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([{ sort_order: 1, name: 'New Ward' }]);
    expect(
      db.allRaw(
        `SELECT effect_kind, damage_type, speed_bonus_feet,
                source_instance_id, template_ref, label
         FROM character_effects
         WHERE character_id = ?
         ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Cold',
        speed_bonus_feet: null,
        source_instance_id: sourceId,
        template_ref: null,
        label: 'Old Ward',
      },
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Cold',
        speed_bonus_feet: null,
        source_instance_id: replacementSourceId,
        template_ref: replacementTemplateRef,
        label: 'New Ward',
      },
    ]);
    expect(
      db.scalar(
        `SELECT count(*)
         FROM character_effects
         WHERE character_id = ?
           AND source_instance_id IS NULL
           AND label IN ('Old Ward', 'Old Stride')`,
        [characterId],
      ),
    ).toBe(0);
  });

  it('rolls back the complete replacement when inserting the new species fails', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const first = speciesNamed(db, 'Dwarf');
    const second = speciesNamed(db, 'Goliath');
    const characterId = createClassedCharacter(db, 'Atomic Replacement');
    replaceTemplateFixture(db, first, 29, [
      {
        name: 'Rollback Ward',
        effects: [{ kind: 'damage_resistance', damageType: 'Fire' }],
      },
    ]);
    replaceTemplateFixture(db, second, 47, [
      {
        name: 'Must Not Commit',
        effects: [{ kind: 'speed', speedBonusFeet: 6 }],
      },
    ]);
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: first.content_key,
    });
    db.exec(
      `CREATE TRIGGER fail_guided_species_replacement
       BEFORE INSERT ON character_species
       WHEN NEW.base_speed_feet = 47
       BEGIN
         SELECT RAISE(ABORT, 'injected species replacement failure');
       END`,
    );

    expect(() =>
      applyGuidedOrigin(db, {
        character_id: characterId,
        kind: 'species',
        content_key: second.content_key,
      }),
    ).toThrow('injected species replacement failure');
    expect(
      db.allRaw(
        `SELECT name, base_speed_feet
         FROM character_species
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ name: first.name, base_speed_feet: 29 }]);
    expect(
      db.allRaw(
        `SELECT name
         FROM character_species_traits
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ name: 'Rollback Ward' }]);
    expect(
      db.allRaw(
        `SELECT effect_kind, damage_type, label
         FROM character_effects
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Fire',
        label: 'Rollback Ward',
      },
    ]);
  });
});

describe('guided lineage spell grants', () => {
  it('surfaces Tiefling Thaumaturgy through spell access with species provenance and an unchosen ability', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const tiefling = speciesNamed(db, 'Tiefling');
    const characterId = createClassedCharacter(db, 'Tiefling Access');

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: tiefling.content_key,
    });

    const thaumaturgy = new SpellAccessBuilder(db)
      .buildForCharacter(characterId)
      .filter((route) => route.spell_name === 'Thaumaturgy');
    expect(thaumaturgy).toEqual([
      expect.objectContaining({
        spell_name: 'Thaumaturgy',
        source_name: 'Tiefling',
        origin: 'slot',
        bucket: 'cantrip_known',
        casting_mode: 'at_will',
        spellcasting_ability: null,
        ability_modifier: null,
        attack_bonus: null,
        save_dc: null,
      }),
    ]);
    expect(
      db.allRaw(
        `SELECT source_type, display_name
         FROM character_source_instances
         WHERE id = ?`,
        [thaumaturgy[0]?.source_instance_id ?? 0],
      ),
    ).toEqual([{ source_type: 'species', display_name: 'Tiefling' }]);
  });

  it('removes Tiefling spell access and its guided source when switching to Elf', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const tiefling = speciesNamed(db, 'Tiefling');
    const elf = speciesNamed(db, 'Elf');
    const characterId = createClassedCharacter(db, 'Tiefling To Elf');

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: tiefling.content_key,
    });
    const tieflingSource = guidedSpeciesSources(db, characterId)[0];
    if (tieflingSource === undefined) {
      throw new Error('Applying Tiefling did not create a guided source.');
    }

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: elf.content_key,
    });

    expect(
      new SpellAccessBuilder(db)
        .buildForCharacter(characterId)
        .filter((route) => route.spell_name === 'Thaumaturgy'),
    ).toEqual([]);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_source_instances WHERE id = ?',
        [tieflingSource['id']],
      ),
    ).toBe(0);
    const elfSources = guidedSpeciesSources(db, characterId);
    expect(elfSources).toHaveLength(1);
    expect(elfSources[0]).toMatchObject({
      display_name: 'Elf',
      config: '{"class_level":1}',
    });
    expect(Number.isSafeInteger(elfSources[0]?.['id'])).toBe(true);
    expect(speciesSpellSlotCount(db, characterId)).toBe(0);
  });

  it('replaces the Tiefling source with a spell-free Dwarf source', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const tiefling = speciesNamed(db, 'Tiefling');
    const dwarf = speciesNamed(db, 'Dwarf');
    const characterId = createClassedCharacter(db, 'Tiefling To Dwarf');

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: tiefling.content_key,
    });
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: dwarf.content_key,
    });

    const dwarfSources = guidedSpeciesSources(db, characterId);
    expect(dwarfSources).toHaveLength(1);
    expect(dwarfSources[0]).toMatchObject({
      display_name: 'Dwarf',
      config: '{"class_level":1}',
    });
    expect(Number.isSafeInteger(dwarfSources[0]?.['id'])).toBe(true);
    expect(speciesSpellSlotCount(db, characterId)).toBe(0);
    expect(
      new SpellAccessBuilder(db)
        .buildForCharacter(characterId)
        .filter((route) => route.spell_name === 'Thaumaturgy'),
    ).toEqual([]);
  });

  it('is idempotent when the same species is applied twice', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const tiefling = speciesNamed(db, 'Tiefling');
    const characterId = createClassedCharacter(db, 'Tiefling Twice');
    const apply = () =>
      applyGuidedOrigin(db, {
        character_id: characterId,
        kind: 'species',
        content_key: tiefling.content_key,
      });

    apply();
    apply();

    expect(guidedSpeciesSources(db, characterId)).toHaveLength(1);
    expect(speciesSpellSlotCount(db, characterId)).toBe(1);
    expect(
      new SpellAccessBuilder(db)
        .buildForCharacter(characterId)
        .filter((route) => route.spell_name === 'Thaumaturgy'),
    ).toHaveLength(1);
  });

  it('replaces only marker-owned sources and preserves a planner-added species source', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const tiefling = speciesNamed(db, 'Tiefling');
    const elf = speciesNamed(db, 'Elf');
    const characterId = createClassedCharacter(
      db,
      'Guided And Planner Species',
    );

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: tiefling.content_key,
    });
    const oldGuidedSourceId = Number(
      guidedSpeciesSources(db, characterId)[0]?.['id'],
    );
    const tieflingDefinitionId = Number(
      db.scalar(
        'SELECT id FROM species_definitions WHERE content_key = ?',
        [tiefling.content_key],
      ),
    );
    const plannerSourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes
       ) VALUES (?, ?, 'species', ?, 'Planner Tiefling', ?, 1, 'active',
                 'planner:species-add')`,
      [
        characterId,
        crypto.randomUUID(),
        tieflingDefinitionId,
        JSON.stringify({ class_level: 1 }),
      ],
    ).lastInsertId;

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: elf.content_key,
    });

    const survivingSources = db.allRaw(
      `SELECT id, display_name, notes
       FROM character_source_instances
       WHERE character_id = ? AND source_type = 'species'
       ORDER BY id`,
      [characterId],
    );
    expect(survivingSources).toHaveLength(2);
    expect(survivingSources[0]).toEqual({
      id: plannerSourceId,
      display_name: 'Planner Tiefling',
      notes: 'planner:species-add',
    });
    expect(survivingSources[1]).toMatchObject({
      display_name: 'Elf',
      notes: 'guided:species-apply',
    });
    expect(Number.isSafeInteger(survivingSources[1]?.['id'])).toBe(true);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_source_instances WHERE id = ?',
        [oldGuidedSourceId],
      ),
    ).toBe(0);
  });

  it.each(['Elf', 'Gnome'] as const)(
    'keeps %s lineage rules dormant while its lineage is unchosen',
    async (speciesName) => {
      const rpcHarness = await applicationDatabase();
      const db = rpcHarness.context.db;
      const species = speciesNamed(db, speciesName);
      const characterId = createClassedCharacter(
        db,
        `${speciesName} Dormant`,
      );

      expect(() =>
        applyGuidedOrigin(db, {
          character_id: characterId,
          kind: 'species',
          content_key: species.content_key,
        }),
      ).not.toThrow();
      const sources = guidedSpeciesSources(db, characterId);
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({
        display_name: speciesName,
        config: '{"class_level":1}',
      });
      expect(Number.isSafeInteger(sources[0]?.['id'])).toBe(true);
      expect(speciesSpellSlotCount(db, characterId)).toBe(0);
      expect(
        new SpellAccessBuilder(db)
          .buildForCharacter(characterId)
          .filter((route) => route.source_name === speciesName),
      ).toEqual([]);
    },
  );
});

describe('bundled species definition seed', () => {
  it('is idempotent across repeated application boot seeds', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const before = db.allRaw(
      `SELECT id, content_key, name, rules_edition, grant_rules
       FROM species_definitions
       ORDER BY content_key`,
    );

    applicationSeed(db);
    applicationSeed(db);

    expect(
      db.allRaw(
        `SELECT id, content_key, name, rules_edition, grant_rules
         FROM species_definitions
         ORDER BY content_key`,
      ),
    ).toEqual(before);
    // The three lineage species, plus Human — whose definition row exists so
    // the guided apply can mint the species source instance the Skillful
    // skill grant hangs on (skills-with-provenance §3.4, dispatch S-B). Its
    // empty grant_rules keep the summed rule count below unchanged.
    expect(before).toHaveLength(LINEAGE_SPELL_SPECIES_CONTENT_KEYS.size + 1);
    expect(
      db.scalar(
        `SELECT sum(json_array_length(grant_rules))
         FROM species_definitions`,
      ),
    ).toBe(23);
  });

  it('yields the bundled name-and-edition slot to a homebrew definition', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const elf = speciesNamed(db, 'Elf');
    const bundledSlot = db.allRaw(
      `SELECT name, rules_edition
       FROM species_definitions
       WHERE content_key = ?`,
      [elf.content_key],
    )[0];
    if (bundledSlot === undefined) {
      throw new Error('The real seed did not create the Elf definition.');
    }
    db.exec('DELETE FROM species_definitions WHERE content_key = ?', [
      elf.content_key,
    ]);
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules, notes
       ) VALUES ('homebrew:species:elf', ?, ?, 1, '[]',
                 'homebrew must survive boot')`,
      [bundledSlot['name'], bundledSlot['rules_edition']],
    );

    applicationSeed(db);

    expect(
      db.allRaw(
        `SELECT content_key, repeatable, grant_rules, notes
         FROM species_definitions
         WHERE name = ? AND rules_edition = ?`,
        [bundledSlot['name'], bundledSlot['rules_edition']],
      ),
    ).toEqual([
      {
        content_key: 'homebrew:species:elf',
        repeatable: 1,
        grant_rules: '[]',
        notes: 'homebrew must survive boot',
      },
    ]);
    expect(
      db.scalar(
        'SELECT count(*) FROM species_definitions WHERE content_key = ?',
        [elf.content_key],
      ),
    ).toBe(0);
  });
});

describe('guided species RPC contracts', () => {
  it('classifies every origin option from the seam lineage key set', async () => {
    const rpcHarness = await applicationDatabase();
    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: GUIDED_RPC.originOptions,
        params: { kind: 'species' },
      },
      rpcHarness.context,
    );

    expect(response).toMatchObject({ ok: true });
    if (!response.ok || !Array.isArray(response.result)) {
      throw new Error('The guided species-options RPC did not return a list.');
    }
    const options = response.result as readonly GuidedOriginOption[];
    for (const option of options) {
      expect(option.grants_lineage_spells).toBe(
        LINEAGE_SPELL_SPECIES_CONTENT_KEYS.has(option.content_key),
      );
    }
    expect(
      new Set(
        options
          .filter((option) => option.grants_lineage_spells)
          .map((option) => option.content_key),
      ),
    ).toEqual(LINEAGE_SPELL_SPECIES_CONTENT_KEYS);
  });

  it('applies a species and returns the seam-ordered background step through the real RPC', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'RPC Species');
    const species = speciesNamed(db, 'Dwarf');

    await expect(
      rpcRegistry.dispatch(
        {
          id: 2,
          method: GUIDED_RPC.applyOrigin,
          params: {
            character_id: characterId,
            kind: 'species',
            content_key: species.content_key,
          },
        },
        rpcHarness.context,
      ),
    ).resolves.toEqual({
      id: 2,
      ok: true,
      result: {
        character_id: characterId,
        current_step: seamStep(3),
      },
    });
  });
});
