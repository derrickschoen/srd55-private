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
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { ChooseSpeciesLineageCommand } from '../../../src/commands/choose-species-lineage';
import { AllocateAbilitiesCommand } from '../../../src/commands/allocate-abilities';
import { applicationSeed } from '../../../src/db/bootstrap';
import type { DatabaseContext } from '../../../src/db/database';
import type { Ability } from '../../../src/domain/enums';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { CharacterState } from '../../../src/character/character-state';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { sheetFacts } from '../../../src/ui/screens/sheet/sheet-view';
import { guidedSpeciesChoiceState } from '../../../src/builder/species-choice';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import {
  registerAssertedFixtureContentIdentity,
  registerFixtureContentIdentity,
} from '../../helpers/content-identity';
import { characterCatalogDisclosures } from '../../../src/queries/character-catalog-disclosures';
import {
  speciesRuleSemanticCount,
  speciesRuleSemanticCountFromJson,
} from '../../helpers/species-rule-census';

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
  new AllocateAbilitiesCommand(db, {
    type: 'allocate_abilities',
    method: 'standard_array',
    scores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  }).apply(characterId);
  return characterId;
}

function lineageFootprint(db: DatabaseContext, characterId: number) {
  return {
    source: guidedSpeciesSources(db, characterId),
    effects: db.allRaw(
      `SELECT * FROM character_effects
       WHERE character_id = ? AND template_ref LIKE 'configured_choice:%'
       ORDER BY id`,
      [characterId],
    ),
    slots: db.allRaw(
      `SELECT slot.* FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       WHERE source.character_id = ? AND source.notes = 'guided:species-apply'
       ORDER BY slot.id`,
      [characterId],
    ),
  };
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

function generatedClassEffectIdentity(
  db: DatabaseContext,
  characterId: number,
): {
  readonly source_instance_id: number;
  readonly template_ref: string;
} {
  const rows = db.allRaw(
    `SELECT source.id AS source_instance_id,
            'class_feature_effects:' || effect.id AS template_ref
     FROM character_source_instances AS source
     JOIN class_feature_effects AS effect
       ON effect.class_definition_id = source.source_definition_id
     WHERE source.character_id = ?
       AND source.source_type = 'class'
       AND source.state = 'active'
       AND effect.name = 'Unarmored Defense'`,
    [characterId],
  );
  const row = rows[0];
  if (
    rows.length !== 1 ||
    row === undefined ||
    typeof row['source_instance_id'] !== 'number' ||
    typeof row['template_ref'] !== 'string'
  ) {
    throw new Error(
      'The guided class has no unique Unarmored Defense template identity.',
    );
  }
  return {
    source_instance_id: row['source_instance_id'],
    template_ref: row['template_ref'],
  };
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
              damage_type, speed_bonus_feet, label)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            traitId,
            effectIndex + 1,
            effect.kind,
            effect.damageType ?? null,
            effect.speedBonusFeet ?? null,
            trait.name,
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
    expect(sheet.walking_speed).toEqual({
      kind: 'known',
      value: 41,
      detail: 'The species base speed plus every standing bonus.',
    });
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
        effect_kind: 'armor_class_formula',
        damage_type: null,
        speed_bonus_feet: null,
        label: 'Unarmored Defense',
      },
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
    const classEffect = generatedClassEffectIdentity(db, characterId);
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
        effect_kind: 'armor_class_formula',
        damage_type: null,
        speed_bonus_feet: null,
        source_instance_id: classEffect.source_instance_id,
        template_ref: classEffect.template_ref,
        label: 'Unarmored Defense',
      },
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
         WHERE character_id = ?
         ORDER BY sort_order`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'armor_class_formula',
        damage_type: null,
        label: 'Unarmored Defense',
      },
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
      config:
        '{"source_content_key":"2024:species:elf"}',
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
      config:
        '{"source_content_key":"2024:species:dwarf"}',
    });
    expect(Number.isSafeInteger(dwarfSources[0]?.['id'])).toBe(true);
    expect(guidedSpeciesChoiceState(db, characterId)).toMatchObject({
      kind: 'ready',
      resolution: {
        kind: 'complete',
        source_name: 'Dwarf',
        choices: [],
      },
    });
    expect(speciesSpellSlotCount(db, characterId)).toBe(0);
    expect(
      characterCatalogDisclosures(db, characterId).find(
        (disclosure) => disclosure.kind === 'species',
      ),
    ).toEqual({
      kind: 'species',
      name: 'Dwarf',
      content_key: '2024:species:dwarf',
      catalog_layer: 'bundled',
    });
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
        config: JSON.stringify({
          source_content_key: species.content_key,
        }),
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

describe('configured species choice and honest projection', () => {
  const operation = (suffix: string) =>
    `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

  async function choose(
    db: DatabaseContext,
    characterId: number,
    option: string,
    ability: Ability,
    expectedRevision: number,
    suffix: string,
    replaceableSpellVersionKey?: string,
  ) {
    return new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('guided-lineage-command-test-key'),
    ).execute({
      character_id: characterId,
      operation_uuid: operation(suffix),
      expected_revision: expectedRevision,
      command: {
        type: 'choose_species_lineage',
        chosen_option: option,
        spellcasting_ability: ability,
        ...(replaceableSpellVersionKey === undefined
          ? {}
          : { replaceable_spell_version_key: replaceableSpellVersionKey }),
      },
    });
  }

  it('exposes the pending Elven Lineage without gating advancement and projects literal UNKNOWN facts', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Pending Elven Lineage');
    const elf = speciesNamed(db, 'Elf');

    const applied = applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: elf.content_key,
    });
    const state = guidedSpeciesChoiceState(db, characterId);
    const sheet = new CharacterSheetBuilder(db).build(characterId);
    const facts = sheetFacts(sheet);
    const completeness = new CharacterCompletenessQueries(db).build(characterId);

    expect(applied.current_step).toBe('background');
    expect(state).toMatchObject({
      kind: 'ready',
      character_id: characterId,
      resolution: {
        kind: 'incomplete',
        source_name: 'Elf',
        missing: ['option', 'spellcasting_ability'],
        choices: [{
          rule_key: 'elf-lineage',
          label: 'Elven Lineage',
          selected_option: null,
          ability_choice: {
            options: ['intelligence', 'wisdom', 'charisma'],
            selected: null,
          },
          unknown_sheet_fields: ['walking_speed_feet', 'darkvision_feet'],
          options: [
            expect.objectContaining({ value: 'Drow', darkvision_feet: 120 }),
            expect.objectContaining({
              value: 'High Elf',
              replaceable_spell_choice: expect.objectContaining({
                initial_spell_version_key: '2024:prestidigitation',
                selected_spell_version_key: null,
              }),
            }),
            expect.objectContaining({
              value: 'Wood Elf',
              effects: [expect.objectContaining({ speed_bonus_feet: 5 })],
            }),
          ],
        }],
      },
    });
    expect(sheet.walking_speed).toEqual({
      kind: 'unknown',
      detail: 'UNKNOWN until Elven Lineage is chosen',
    });
    expect(sheet.lineage_darkvision).toEqual({
      kind: 'unknown',
      detail: 'UNKNOWN until Elven Lineage is chosen',
    });
    expect(facts['walking_speed_feet']).toBeNull();
    expect(facts['lineage_darkvision_feet']).toBeNull();
    expect(sheet.printed_features.map((feature) => feature.name)).not.toContain(
      'Darkvision',
    );
    expect(completeness.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'required_source_choice',
        title: 'Elf — Elven Lineage not chosen',
        missing: ['option', 'spellcasting_ability'],
      }),
    ]));
    expect(sheet.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'required_source_choice',
        title: 'Elf — Elven Lineage not chosen',
      }),
    ]));
  });

  it.each([
    ['Drow', 'charisma', 30, 120, '11'],
    ['High Elf', 'intelligence', 30, 60, '12'],
    ['Wood Elf', 'wisdom', 35, 60, '13'],
  ] as const)(
    'records %s with its ability and projects exact speed and Darkvision',
    async (option, ability, speed, darkvision, operationSuffix) => {
      const rpcHarness = await applicationDatabase();
      const db = rpcHarness.context.db;
      const characterId = createClassedCharacter(db, `${option} Projection`);
      const elf = speciesNamed(db, 'Elf');
      applyGuidedOrigin(db, {
        character_id: characterId,
        kind: 'species',
        content_key: elf.content_key,
      });

      await choose(db, characterId, option, ability, 0, operationSuffix);
      const sheet = new CharacterSheetBuilder(db).build(characterId);
      const config = JSON.parse(String(guidedSpeciesSources(db, characterId)[0]?.['config']));

      expect(config).toEqual({
        source_content_key: '2024:species:elf',
        lineage: {
          chosen_option: option,
          ...(option === 'High Elf'
            ? { high_elf_cantrip: '2024:prestidigitation' }
            : {}),
        },
        spellcasting_ability: ability,
      });
      expect(sheet.walking_speed).toMatchObject({ kind: 'known', value: speed });
      expect(sheet.lineage_darkvision).toMatchObject({
        kind: 'known',
        value: darkvision,
      });
      expect(
        new CharacterCompletenessQueries(db).build(characterId).items.some(
          (item) => item.kind === 'required_source_choice',
        ),
      ).toBe(false);
      if (option === 'High Elf') {
        expect(
          sheet.spells.flatMap((group) => group.spells.map((spell) => spell.name)),
        ).toContain('Prestidigitation');
      }
    },
  );

  it('replaces the High Elf cantrip through the same command and displays the chosen spell on the sheet', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Replaceable High Elf');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    await choose(db, characterId, 'High Elf', 'intelligence', 0, '101');
    await choose(
      db,
      characterId,
      'High Elf',
      'intelligence',
      1,
      '102',
      '2024:minor-illusion',
    );

    const sheet = new CharacterSheetBuilder(db).build(characterId);
    const names = sheet.spells.flatMap((group) =>
      group.spells.map((spell) => spell.name));
    expect(names).toContain('Minor Illusion');
    expect(names).not.toContain('Prestidigitation');
    expect(guidedSpeciesChoiceState(db, characterId)).toMatchObject({
      resolution: {
        kind: 'complete',
        choices: [{
          options: expect.arrayContaining([
            expect.objectContaining({
              value: 'High Elf',
              replaceable_spell_choice: expect.objectContaining({
                selected_spell_version_key: '2024:minor-illusion',
              }),
            }),
          ]),
        }],
      },
    });
  });

  it('rolls back a late effect failure and undo/redo restores the complete lineage footprint', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Atomic Lineage');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    const before = lineageFootprint(db, characterId);
    const applied = await choose(db, characterId, 'Drow', 'charisma', 0, '201');
    const after = lineageFootprint(db, characterId);

    db.exec(
      `CREATE TRIGGER fail_configured_choice_effect
       BEFORE INSERT ON character_effects
       WHEN NEW.template_ref LIKE 'configured_choice:%'
       BEGIN
         SELECT RAISE(ABORT, 'injected configured choice effect failure');
       END`,
    );
    await expect(
      choose(db, characterId, 'Wood Elf', 'wisdom', 1, '202'),
    ).rejects.toThrow('injected configured choice effect failure');
    expect(lineageFootprint(db, characterId)).toEqual(after);
    db.exec('DROP TRIGGER fail_configured_choice_effect');

    const executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('guided-lineage-command-test-key'),
    );
    const undone = await executor.undo({
      character_id: characterId,
      operation_uuid: applied.operation_uuid,
      expected_revision: 1,
    });
    expect(undone.status).toBe('applied');
    expect(lineageFootprint(db, characterId)).toEqual(before);
    if (undone.status !== 'applied') throw new Error('Lineage undo was refused.');
    const redone = await executor.undo({
      character_id: characterId,
      operation_uuid: undone.operation_uuid,
      expected_revision: 2,
    });
    expect(redone.status).toBe('applied');
    expect(lineageFootprint(db, characterId)).toEqual(after);
  });

  it('rolls config and effects back when the existing generator pipeline fails', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Generator Rollback');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    const before = lineageFootprint(db, characterId);
    class FailingGenerator extends GrantRuleSlotGenerator {
      override generateForSource(): never {
        throw new Error('injected configured choice generator failure');
      }
    }
    const command = new ChooseSpeciesLineageCommand(
      db,
      {
        type: 'choose_species_lineage',
        chosen_option: 'Wood Elf',
        spellcasting_ability: 'wisdom',
      },
      new CharacterCommandIntegrity('guided-lineage-command-test-key'),
      undefined,
      new FailingGenerator(db),
    );
    expect(() => command.apply(characterId)).toThrow(
      'injected configured choice generator failure',
    );
    expect(lineageFootprint(db, characterId)).toEqual(before);
  });

  it('switches Drow to Wood Elf and repeated generation creates no duplicate slot or effect', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Lineage Switch');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    await choose(db, characterId, 'Drow', 'charisma', 0, '251');
    await choose(db, characterId, 'Wood Elf', 'wisdom', 1, '252');
    await choose(db, characterId, 'Wood Elf', 'wisdom', 2, '253');

    const active = new SpellAccessBuilder(db).buildForCharacter(characterId)
      .filter((route) => route.source_name === 'Elf')
      .map((route) => route.spell_name);
    expect(active).toEqual(['Druidcraft']);
    expect(
      db.allRaw(
        `SELECT slot.rule_key, slot.state FROM spell_selection_slots AS slot
         JOIN character_source_instances AS source
           ON source.id = slot.source_instance_id
         WHERE source.character_id = ? AND source.notes = 'guided:species-apply'
         ORDER BY rule_key`,
        [characterId],
      ),
    ).toEqual([
      { rule_key: 'elf-lineage-drow-dancing-lights', state: 'orphaned' },
      { rule_key: 'elf-lineage-wood-elf-druidcraft', state: 'active' },
    ]);
    expect(
      db.allRaw(
        `SELECT effect_kind, speed_bonus_feet, template_ref
         FROM character_effects
         WHERE character_id = ? AND template_ref LIKE 'configured_choice:%'`,
        [characterId],
      ),
    ).toEqual([{
      effect_kind: 'speed',
      speed_bonus_feet: 5,
      template_ref: 'configured_choice:elf-lineage:Wood Elf:0',
    }]);
  });

  it('projects Tiefling resistance as UNKNOWN until the selected legacy effect exists', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Tiefling Resistance');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Tiefling').content_key,
    });
    expect(new CharacterSheetBuilder(db).build(characterId).lineage_damage_resistance)
      .toEqual({
        kind: 'unknown',
        detail: 'UNKNOWN until Fiendish Legacy is chosen',
      });

    await choose(db, characterId, 'Infernal', 'charisma', 0, '301');
    const chosen = new CharacterSheetBuilder(db).build(characterId);
    expect(chosen.lineage_damage_resistance).toEqual({
      kind: 'known',
      values: ['Fire'],
    });
    expect(chosen.damage_resistances).toEqual(['Fire']);
  });

  it('reconciles level-3 lineage spells on real level-up and its snapshot inverse', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Drow Level Arrival');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    await choose(db, characterId, 'Drow', 'charisma', 0, '401');
    const classId = Number(db.scalar(
      'SELECT class_definition_id FROM character_class_levels WHERE character_id = ?',
      [characterId],
    ));
    const executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('guided-lineage-command-test-key'),
    );
    const spellNames = () => new SpellAccessBuilder(db)
      .buildForCharacter(characterId)
      .filter((route) => route.source_name === 'Elf')
      .map((route) => route.spell_name)
      .sort();

    expect(spellNames()).toEqual(['Dancing Lights']);
    await executor.execute({
      character_id: characterId,
      operation_uuid: operation('402'),
      expected_revision: 1,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 2,
      },
    });
    expect(spellNames()).toEqual(['Dancing Lights']);
    await executor.execute({
      character_id: characterId,
      operation_uuid: operation('403'),
      expected_revision: 2,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 3,
      },
    });
    expect(spellNames()).toEqual(['Dancing Lights', 'Faerie Fire']);
    await executor.execute({
      character_id: characterId,
      operation_uuid: operation('404'),
      expected_revision: 3,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 4,
        feat_choice: {
          kind: 'feat',
          feat_content_key: '2024:feat:ability-score-improvement',
          config: {},
          ability_increases: [{ ability: 'strength', amount: 2 }],
        },
      },
    });
    const fifth = await executor.execute({
      character_id: characterId,
      operation_uuid: operation('405'),
      expected_revision: 4,
      command: {
        type: 'level_up_class',
        class_definition_id: classId,
        target_level: 5,
      },
    });
    expect(spellNames()).toEqual(['Dancing Lights', 'Darkness', 'Faerie Fire']);
    const undo = await executor.undo({
      character_id: characterId,
      operation_uuid: fifth.operation_uuid,
      expected_revision: 5,
    });
    expect(undo.status).toBe('applied');
    expect(spellNames()).toEqual(['Dancing Lights', 'Faerie Fire']);
  });

  it('refuses invalid option, crossed ability, stale revision, and extra RPC keys without changing state', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const characterId = createClassedCharacter(db, 'Lineage Refusals');
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: speciesNamed(db, 'Elf').content_key,
    });
    const before = new CharacterState(db).capture(characterId);
    await expect(choose(db, characterId, 'Moon Elf', 'wisdom', 0, '501'))
      .rejects.toMatchObject({ reason: 'invalid_option' });
    await expect(choose(db, characterId, 'Drow', 'strength', 0, '502'))
      .rejects.toMatchObject({ reason: 'invalid_spellcasting_ability' });
    await expect(choose(db, characterId, 'Drow', 'charisma', 1, '503'))
      .rejects.toThrow();
    expect(new CharacterState(db).capture(characterId)).toEqual(before);

    const response = await rpcRegistry.dispatch({
      id: 88,
      method: GUIDED_RPC.chooseSpeciesLineage,
      params: {
        character_id: characterId,
        chosen_option: 'Drow',
        spellcasting_ability: 'charisma',
        operation_uuid: operation('504'),
        expected_revision: 0,
        extra: true,
      },
    }, rpcHarness.context);
    expect(response).toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
    expect(new CharacterState(db).capture(characterId)).toEqual(before);

    const sourceId = Number(guidedSpeciesSources(db, characterId)[0]?.['id']);
    const storeConfig = (config: Record<string, unknown>) => db.exec(
      'UPDATE character_source_instances SET config = ? WHERE id = ?',
      [JSON.stringify(config), sourceId],
    );
    storeConfig({
      source_content_key: '2024:species:elf',
      lineage: { chosen_option: 'Moon Elf' },
      spellcasting_ability: 'wisdom',
    });
    expect(guidedSpeciesChoiceState(db, characterId)).toMatchObject({
      kind: 'ready',
      resolution: { kind: 'incomplete', missing: ['option'] },
    });
    expect(new CharacterSheetBuilder(db).build(characterId)).toMatchObject({
      walking_speed: { kind: 'unknown' },
      lineage_darkvision: { kind: 'unknown' },
    });

    storeConfig({
      source_content_key: '2024:species:elf',
      lineage: { chosen_option: 'Drow' },
      spellcasting_ability: 'strength',
    });
    expect(guidedSpeciesChoiceState(db, characterId)).toMatchObject({
      kind: 'ready',
      resolution: {
        kind: 'incomplete',
        missing: ['spellcasting_ability'],
      },
    });

    storeConfig({
      source_content_key: '2024:species:elf',
      lineage: {
        chosen_option: 'High Elf',
        high_elf_cantrip: '2024:fireball',
      },
      spellcasting_ability: 'intelligence',
    });
    expect(guidedSpeciesChoiceState(db, characterId)).toMatchObject({
      kind: 'ready',
      resolution: { kind: 'incomplete', missing: ['replaceable_spell'] },
    });
  });
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
    const census = before.map((row) => ({
      content_key: row['content_key'],
      name: row['name'],
      top_level_rules: JSON.parse(String(row['grant_rules'])).length,
      semantic_rules: speciesRuleSemanticCountFromJson(row['grant_rules']),
    }));
    expect(census).toEqual([
      {
        content_key: '2024:species:elf',
        name: 'Elf',
        top_level_rules: 1,
        semantic_rules: 9,
      },
      {
        content_key: '2024:species:gnome',
        name: 'Gnome',
        top_level_rules: 1,
        semantic_rules: 4,
      },
      {
        content_key: '2024:species:human',
        name: 'Human',
        top_level_rules: 0,
        semantic_rules: 0,
      },
      {
        content_key: '2024:species:tiefling',
        name: 'Tiefling',
        top_level_rules: 2,
        semantic_rules: 10,
      },
    ]);
    expect(census.reduce((total, row) => total + row.semantic_rules, 0)).toBe(23);

    // Negative control: removing one nested Drow grant must make the fidelity
    // census fall. Counting only definition rows or top-level descriptors
    // would leave this mutation invisible.
    const elf = before.find((row) => row['content_key'] === '2024:species:elf');
    if (elf === undefined) throw new Error('The Elf definition is missing.');
    const withoutOneDrowGrant = JSON.parse(String(elf['grant_rules']));
    withoutOneDrowGrant[0].options[0].grants.pop();
    expect(speciesRuleSemanticCount(withoutOneDrowGrant)).toBe(8);
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
    const homebrewContentKey = registerAssertedFixtureContentIdentity(db, {
      kind: 'species',
      edition: String(bundledSlot['rules_edition']),
      name: String(bundledSlot['name']),
    });
    db.exec(
      `INSERT INTO species_definitions (
         content_key, name, rules_edition, repeatable, grant_rules, notes
       ) VALUES (?, ?, ?, 1, '[]',
                 'homebrew must survive boot')`,
      [homebrewContentKey, bundledSlot['name'], bundledSlot['rules_edition']],
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
        content_key: homebrewContentKey,
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
    expect(db.scalar(
      `SELECT catalog_layer FROM catalog_content_identities
       WHERE content_key = ?`,
      [homebrewContentKey],
    )).toBe('external');
    expect(db.allRaw(
      `SELECT fingerprint_scheme, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'species' AND content_key = ?
       ORDER BY fingerprint_scheme`,
      [elf.content_key],
    )).toEqual([
      { fingerprint_scheme: 'content-v1', fingerprint_role: 'current' },
      { fingerprint_scheme: 'content-v2', fingerprint_role: 'bundled-historical' },
    ]);
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
