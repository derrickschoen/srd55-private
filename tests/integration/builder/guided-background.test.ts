import { afterEach, describe, expect, it } from 'vitest';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_RPC,
  type GuidedApplyOriginResult,
  type GuidedOriginOption,
  type GuidedRefusalData,
} from '../../../src/builder/contracts';
import {
  applyGuidedOrigin,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { createCharacter } from '../reports/build-report-fixture';

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

function backgrounds(
  rpcHarness: RpcHarness,
): readonly GuidedOriginOption[] {
  return listGuidedOriginOptions(rpcHarness.context.db, 'background');
}

function backgroundAt(
  options: readonly GuidedOriginOption[],
  index: number,
): GuidedOriginOption {
  const option = options[index];
  if (option === undefined) {
    throw new Error(`The bundled background catalogue has no option ${index}.`);
  }
  return option;
}

function createAdvancedCharacter(rpcHarness: RpcHarness, name: string): number {
  const db = rpcHarness.context.db;
  const characterId = createCharacter(db, name);
  db.exec(
    `INSERT INTO character_species
       (character_id, name, creature_type, size, base_speed_feet)
     VALUES (?, 'A5-SOURCED Species', 'Humanoid', 'Medium', 31)`,
    [characterId],
  );
  db.exec(
    `INSERT INTO character_effects
       (character_id, sort_order, effect_kind, speed_bonus_feet, label)
     VALUES (?, 1, 'speed', 3, 'A5-SOURCED Effect')`,
    [characterId],
  );
  db.exec(
    `INSERT INTO character_skill_proficiencies (character_id, skill)
     VALUES (?, 'arcana')`,
    [characterId],
  );
  return characterId;
}

function selectedBackgroundColumns(
  rpcHarness: RpcHarness,
  table: 'background_templates' | 'character_background',
  predicateColumn: 'content_key' | 'character_id',
  predicate: string | number,
) {
  return rpcHarness.context.db.oneRaw(
    `SELECT name, ability_score_1, ability_score_2, ability_score_3,
            feat_name, skill_proficiency_1, skill_proficiency_2,
            tool_proficiency, equipment_option_a, equipment_option_b
     FROM ${table}
     WHERE ${predicateColumn} = ?`,
    [predicate],
  );
}

describe('guided background application', () => {
  it('copies exactly one template row while leaving the real sheet unchanged', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const background = backgroundAt(backgrounds(rpcHarness), 0);
    const characterId = createAdvancedCharacter(
      rpcHarness,
      'Applied Background',
    );
    const before = new CharacterSheetBuilder(db).build(characterId);
    const template = selectedBackgroundColumns(
      rpcHarness,
      'background_templates',
      'content_key',
      background.content_key,
    );

    const result = applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: background.content_key,
    });

    expect(result).toEqual({
      character_id: characterId,
      current_step: seamStep(0),
    } satisfies GuidedApplyOriginResult);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(1);
    expect(
      selectedBackgroundColumns(
        rpcHarness,
        'character_background',
        'character_id',
        characterId,
      ),
    ).toEqual(template);
    expect(new CharacterSheetBuilder(db).build(characterId)).toEqual(before);
  });

  it('replaces the background and spares species, effects, and proficiencies that background apply never wrote', async () => {
    const rpcHarness = await applicationDatabase();
    const db = rpcHarness.context.db;
    const options = backgrounds(rpcHarness);
    const first = backgroundAt(options, 0);
    const second = backgroundAt(options, 1);
    const characterId = createAdvancedCharacter(
      rpcHarness,
      'Replacement Background',
    );

    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: first.content_key,
    });
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: second.content_key,
    });

    expect(
      db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(1);
    expect(
      selectedBackgroundColumns(
        rpcHarness,
        'character_background',
        'character_id',
        characterId,
      ),
    ).toEqual(
      selectedBackgroundColumns(
        rpcHarness,
        'background_templates',
        'content_key',
        second.content_key,
      ),
    );
    expect(
      db.allRaw(
        `SELECT name, creature_type, size, base_speed_feet
         FROM character_species
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([
      {
        name: 'A5-SOURCED Species',
        creature_type: 'Humanoid',
        size: 'Medium',
        base_speed_feet: 31,
      },
    ]);
    expect(
      db.allRaw(
        `SELECT effect_kind, speed_bonus_feet, label
         FROM character_effects
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'speed',
        speed_bonus_feet: 3,
        label: 'A5-SOURCED Effect',
      },
    ]);
    expect(
      db.allRaw(
        `SELECT skill
         FROM character_skill_proficiencies
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual([{ skill: 'arcana' }]);
  });
});

describe('guided background catalogue and gate', () => {
  it('reports grants_lineage_spells false for every background', async () => {
    const rpcHarness = await applicationDatabase();
    const options = backgrounds(rpcHarness);

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.grants_lineage_spells).toBe(false);
    }
  });

  it('refuses a non-bundled background key through the real RPC with the domain discriminator', async () => {
    const rpcHarness = await applicationDatabase();
    const characterId = createCharacter(
      rpcHarness.context.db,
      'Background Refusal',
    );

    await expect(
      rpcRegistry.dispatch(
        {
          id: 1,
          method: GUIDED_RPC.applyOrigin,
          params: {
            character_id: characterId,
            kind: 'background',
            content_key: 'test:background:not-bundled',
          },
        },
        rpcHarness.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'unknown_origin',
        } satisfies GuidedRefusalData,
      },
    });
    expect(
      rpcHarness.context.db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });
});
