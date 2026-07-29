import { afterEach, describe, expect, it } from 'vitest';
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
  return createGuidedCharacter(
    db,
    {
      name,
      class_content_key: classOption.content_key,
    },
    new CharacterCommandIntegrity('guided-species-test-key'),
  ).id;
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
                source_instance_id, label
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
        label: 'Old Ward',
      },
      {
        effect_kind: 'damage_resistance',
        damage_type: 'Cold',
        speed_bonus_feet: null,
        source_instance_id: null,
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
