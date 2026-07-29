import { afterEach, describe, expect, it } from 'vitest';
import {
  BACKGROUND_RPC,
  MAGIC_INITIATE_ABILITIES,
  MAGIC_INITIATE_FEAT_CONTENT_KEY,
  MAGIC_INITIATE_LISTS,
  type GuidedApplyBackgroundParams,
  type GuidedBackgroundChoiceOptions,
  type GuidedBackgroundIncrease,
  type GuidedBackgroundOption,
  type GuidedOriginFeatOption,
} from '../../../src/builder/background-choices';
import {
  applyGuidedBackgroundChoices,
  listGuidedBackgroundChoiceOptions,
} from '../../../src/builder/guided-creation';
import type { DatabaseContext } from '../../../src/db/database';
import { abilities, type Ability } from '../../../src/domain/enums';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import backgroundsExtract from '../../../docs/srd/source/backgrounds.txt?raw';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { createCharacter } from '../reports/build-report-fixture';

const harnesses: RpcHarness[] = [];

afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    harness.close();
  }
});

async function applicationDatabase(): Promise<RpcHarness> {
  const harness = await createRpcHarness([]);
  harnesses.push(harness);
  return harness;
}

function choiceOptions(db: DatabaseContext): GuidedBackgroundChoiceOptions {
  return listGuidedBackgroundChoiceOptions(db);
}

function backgroundWithDifferentMagicInitiateSuggestion(
  options: GuidedBackgroundChoiceOptions,
): GuidedBackgroundOption {
  const background = options.backgrounds.find(
    (candidate) =>
      candidate.pairing.suggested_abilities !== null &&
      candidate.pairing.suggested_feat_content_key !==
        MAGIC_INITIATE_FEAT_CONTENT_KEY,
  );
  if (background === undefined) {
    throw new Error(
      'The seeded background catalogue has no non-Magic-Initiate pairing.',
    );
  }
  return background;
}

function featDifferentFrom(
  options: GuidedBackgroundChoiceOptions,
  printedContentKey: string | null,
): GuidedOriginFeatOption {
  const feat = options.origin_feats.find(
    (candidate) => candidate.content_key !== printedContentKey,
  );
  if (feat === undefined) {
    throw new Error('The seeded Origin feat catalogue has no alternative feat.');
  }
  return feat;
}

function abilitiesOutsidePrintedPairing(
  background: GuidedBackgroundOption,
): readonly [Ability, Ability, Ability] {
  const printed = background.pairing.suggested_abilities;
  if (printed === null) {
    throw new Error(
      `The seeded ${background.name} pairing has no parsed abilities.`,
    );
  }
  const outside = abilities.filter((ability) => !printed.includes(ability));
  const first = outside[0];
  const second = outside[1];
  const third = outside[2];
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error(
      `The seeded ${background.name} pairing leaves fewer than three abilities free.`,
    );
  }
  return [first, second, third];
}

function extractBackgroundIncreaseMaximum(): number {
  const match = /raise a score above\s+(\d+)\./u.exec(backgroundsExtract);
  const printedMaximum = match?.[1];
  if (printedMaximum === undefined) {
    throw new Error(
      'The background extract no longer states its ability-increase maximum.',
    );
  }
  return Number(printedMaximum);
}

function character(db: DatabaseContext, name: string): number {
  return createCharacter(db, name);
}

function magicInitiateConfig(): Readonly<Record<string, unknown>> {
  const chosenList = MAGIC_INITIATE_LISTS[1];
  const castingAbility = MAGIC_INITIATE_ABILITIES[1];
  if (chosenList === undefined || castingAbility === undefined) {
    throw new Error('The ratified Magic Initiate seam has no second choices.');
  }
  return {
    chosen_list: chosenList,
    spellcasting_ability: castingAbility,
  };
}

function guidedBackgroundSources(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT id, parent_source_instance_id, source_type, display_name, notes
     FROM character_source_instances
     WHERE character_id = ?
       AND (
         notes = 'guided:background-apply'
         OR parent_source_instance_id IN (
           SELECT id
           FROM character_source_instances
           WHERE character_id = ?
             AND notes = 'guided:background-apply'
         )
       )
     ORDER BY id`,
    [characterId, characterId],
  );
}

function contributionRows(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT effect.id, effect.ability, effect.amount, effect.maximum,
            effect.source_instance_id, effect.notes,
            source.source_type, source.notes AS source_marker,
            background.content_key AS source_content_key
     FROM character_effects AS effect
     INNER JOIN character_source_instances AS source
       ON source.id = effect.source_instance_id
     INNER JOIN background_definitions AS background
       ON source.source_type = 'background'
      AND background.id = source.source_definition_id
     WHERE effect.character_id = ?
       AND effect.effect_kind = 'ability_increase'
     ORDER BY effect.id`,
    [characterId],
  );
}

function printedParams(
  characterId: number,
  background: GuidedBackgroundOption,
): GuidedApplyBackgroundParams {
  const printedAbilities = background.pairing.suggested_abilities;
  const printedFeat = background.pairing.suggested_feat_content_key;
  if (printedAbilities === null || printedFeat === null) {
    throw new Error(
      `The seeded ${background.name} pairing is not machine-readable.`,
    );
  }
  const [first, second, third] = printedAbilities;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error(
      `The seeded ${background.name} pairing does not name three abilities.`,
    );
  }
  return {
    character_id: characterId,
    content_key: background.content_key,
    increases: [
      { ability: first, amount: 1 },
      { ability: second, amount: 1 },
      { ability: third, amount: 1 },
    ],
    origin_feat_content_key: printedFeat,
    origin_feat_config:
      printedFeat === MAGIC_INITIATE_FEAT_CONTENT_KEY
        ? {
            chosen_list:
              background.pairing.suggested_magic_initiate_list ??
              MAGIC_INITIATE_LISTS[0],
            spellcasting_ability: MAGIC_INITIATE_ABILITIES[0],
          }
        : {},
  };
}

function customMagicInitiateParams(
  characterId: number,
  background: GuidedBackgroundOption,
): GuidedApplyBackgroundParams {
  const [first, second] = abilitiesOutsidePrintedPairing(background);
  return {
    character_id: characterId,
    content_key: background.content_key,
    increases: [
      { ability: first, amount: 2 },
      { ability: second, amount: 1 },
    ],
    origin_feat_content_key: MAGIC_INITIATE_FEAT_CONTENT_KEY,
    origin_feat_config: magicInitiateConfig(),
  };
}

describe('B3 guided background choices on a seeded application database', () => {
  it('writes player-chosen increases as capped contributions owned by the background and grants the non-printed Origin feat as its child', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const characterId = character(db, 'B3 Player Choice');
    const params = customMagicInitiateParams(characterId, background);

    expect(
      params.increases.every(
        (increase) =>
          !background.pairing.suggested_abilities?.includes(increase.ability),
      ),
    ).toBe(true);
    expect(params.origin_feat_content_key).not.toBe(
      background.pairing.suggested_feat_content_key,
    );

    applyGuidedBackgroundChoices(db, params);

    const sources = guidedBackgroundSources(db, characterId);
    const backgroundSource = sources.find(
      (source) => source.source_type === 'background',
    );
    const featSource = sources.find((source) => source.source_type === 'feat');
    expect(backgroundSource).toMatchObject({
      display_name: background.name,
      notes: 'guided:background-apply',
    });
    expect(featSource?.parent_source_instance_id).toBe(backgroundSource?.id);
    expect(
      db.scalar(
        `SELECT definition.content_key
         FROM character_source_instances AS source
         INNER JOIN feat_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.id = ?`,
        [featSource?.id ?? -1],
      ),
    ).toBe(MAGIC_INITIATE_FEAT_CONTENT_KEY);
    expect(
      db.scalar(
        `SELECT count(*)
         FROM spell_selection_slots
         WHERE character_id = ? AND source_instance_id = ?`,
        [characterId, featSource?.id ?? -1],
      ),
    ).toBeGreaterThan(0);

    const contributions = contributionRows(db, characterId);
    expect(contributions).toHaveLength(params.increases.length);
    expect(
      contributions.map((row) => ({
        ability: row.ability,
        amount: row.amount,
        maximum: row.maximum,
        source_instance_id: row.source_instance_id,
      })),
    ).toEqual(
      params.increases.map((increase) => ({
        ...increase,
        maximum: extractBackgroundIncreaseMaximum(),
        source_instance_id: backgroundSource?.id,
      })),
    );
    expect(
      contributions.every(
        (row) =>
          row.source_type === 'background' &&
          row.source_marker === 'guided:background-apply' &&
          row.source_content_key === background.content_key,
      ),
    ).toBe(true);
    expect(
      db.oneRaw(
        `SELECT strength, dexterity, constitution,
                intelligence, wisdom, charisma
         FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    });
  });

  it('B2-CASCADE uses the real B3 producer: replacement removes the old child feat, slots, and contributions without orphans', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const first = backgroundWithDifferentMagicInitiateSuggestion(options);
    const second = options.backgrounds.find(
      (candidate) => candidate.content_key !== first.content_key,
    );
    if (second === undefined) {
      throw new Error('The seeded catalogue has no replacement background.');
    }
    const characterId = character(db, 'B3 Cascade');
    applyGuidedBackgroundChoices(
      db,
      customMagicInitiateParams(characterId, first),
    );
    const oldSources = guidedBackgroundSources(db, characterId);
    const oldSourceIds = oldSources.map((source) => source.id);
    const oldEffectIds = contributionRows(db, characterId).map(
      (effect) => effect.id,
    );
    const oldFeat = oldSources.find(
      (source) => source.source_type === 'feat',
    );
    expect(oldFeat).toBeDefined();
    expect(
      db.scalar(
        'SELECT count(*) FROM spell_selection_slots WHERE source_instance_id = ?',
        [oldFeat?.id ?? -1],
      ),
    ).toBeGreaterThan(0);

    const replacementFeat = featDifferentFrom(
      options,
      second.pairing.suggested_feat_content_key,
    );
    const replacementAbilities = abilitiesOutsidePrintedPairing(second);
    applyGuidedBackgroundChoices(db, {
      character_id: characterId,
      content_key: second.content_key,
      increases: [
        { ability: replacementAbilities[0], amount: 1 },
        { ability: replacementAbilities[1], amount: 1 },
        { ability: replacementAbilities[2], amount: 1 },
      ],
      origin_feat_content_key: replacementFeat.content_key,
      origin_feat_config:
        replacementFeat.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY
          ? magicInitiateConfig()
          : {},
    });

    const newSources = guidedBackgroundSources(db, characterId);
    const newContributions = contributionRows(db, characterId);
    expect(newSources.some((source) => oldSourceIds.includes(source.id))).toBe(
      false,
    );
    expect(
      newContributions.some((effect) => oldEffectIds.includes(effect.id)),
    ).toBe(false);
    expect(
      db.scalar(
        `SELECT count(*)
         FROM spell_selection_slots
         WHERE source_instance_id IN (${oldSourceIds.map(() => '?').join(', ')})`,
        oldSourceIds,
      ),
    ).toBe(0);
    expect(
      db.scalar(
        `SELECT count(*)
         FROM character_source_instances
         WHERE id IN (${oldSourceIds.map(() => '?').join(', ')})`,
        oldSourceIds,
      ),
    ).toBe(0);
    expect(newContributions).toHaveLength(3);
    expect(
      db.scalar(
        `SELECT count(*)
         FROM character_effects AS effect
         LEFT JOIN character_source_instances AS source
           ON source.id = effect.source_instance_id
         WHERE effect.character_id = ?
           AND effect.effect_kind = 'ability_increase'
           AND source.id IS NULL`,
        [characterId],
      ),
    ).toBe(0);
    expect(
      db.scalar(
        'SELECT name FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(second.name);
  });

  it('rolls back the whole replacement when child-feat materialisation fails after deletion begins', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const characterId = character(db, 'B3 Atomic Replacement');
    applyGuidedBackgroundChoices(
      db,
      printedParams(characterId, background),
    );
    const sourcesBefore = guidedBackgroundSources(db, characterId);
    const contributionsBefore = contributionRows(db, characterId);
    const backgroundBefore = db.oneRaw(
      'SELECT * FROM character_background WHERE character_id = ?',
      [characterId],
    );

    db.exec(
      `UPDATE feat_definitions
       SET grant_rules = 'not valid grant-rule JSON'
       WHERE content_key = ?`,
      [MAGIC_INITIATE_FEAT_CONTENT_KEY],
    );

    expect(() =>
      applyGuidedBackgroundChoices(
        db,
        customMagicInitiateParams(characterId, background),
      ),
    ).toThrow();
    expect(guidedBackgroundSources(db, characterId)).toEqual(sourcesBefore);
    expect(contributionRows(db, characterId)).toEqual(contributionsBefore);
    expect(
      db.oneRaw(
        'SELECT * FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual(backgroundBefore);
  });

  it('persists no deviation note for the printed pairing and a house-rule note for a different pairing', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const characterId = character(db, 'B3 Deviation Label');

    applyGuidedBackgroundChoices(
      db,
      printedParams(characterId, background),
    );
    expect(
      contributionRows(db, characterId).map((row) => row.notes),
    ).toEqual([null, null, null]);

    applyGuidedBackgroundChoices(
      db,
      customMagicInitiateParams(characterId, background),
    );
    const notes = contributionRows(db, characterId).map((row) => row.notes);
    expect(notes).toHaveLength(2);
    expect(
      notes.every(
        (note) =>
          typeof note === 'string' &&
          /House rule:.*chosen by the player.*not the SRD's printed pairing/u.test(
            note,
          ),
      ),
    ).toBe(true);
  });

  it.each([
    {
      label: '+2 only',
      increases: [{ ability: 'strength', amount: 2 }],
    },
    {
      label: '+1/+1 only',
      increases: [
        { ability: 'strength', amount: 1 },
        { ability: 'dexterity', amount: 1 },
      ],
    },
    {
      label: '+2/+1/+1',
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'dexterity', amount: 1 },
        { ability: 'constitution', amount: 1 },
      ],
    },
    {
      label: 'a +3 increase',
      increases: [
        { ability: 'strength', amount: 3 },
        { ability: 'dexterity', amount: 1 },
      ],
    },
    {
      label: 'the same ability twice',
      increases: [
        { ability: 'strength', amount: 2 },
        { ability: 'strength', amount: 1 },
      ],
    },
  ])('refuses $label while accepting only the two ratified spread shapes', async ({
    increases,
  }) => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background = options.backgrounds[0];
    const feat = options.origin_feats[0];
    if (background === undefined || feat === undefined) {
      throw new Error('The seeded background choice catalogue is empty.');
    }
    const characterId = character(db, 'B3 Invalid Spread');

    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: BACKGROUND_RPC.applyBackground,
        params: {
          character_id: characterId,
          content_key: background.content_key,
          increases,
          origin_feat_content_key: feat.content_key,
          origin_feat_config:
            feat.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY
              ? magicInitiateConfig()
              : {},
        },
      },
      harness.context,
    );

    expect(response).toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
    expect(contributionRows(db, characterId)).toEqual([]);
  });

  it('accepts both +2/+1 and +1/+1/+1 through the RPC boundary', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const feat = featDifferentFrom(
      options,
      background.pairing.suggested_feat_content_key,
    );
    const outside = abilitiesOutsidePrintedPairing(background);
    const characterId = character(db, 'B3 Valid Spreads');

    for (const increases of [
      [
        { ability: outside[0], amount: 2 },
        { ability: outside[1], amount: 1 },
      ],
      [
        { ability: outside[0], amount: 1 },
        { ability: outside[1], amount: 1 },
        { ability: outside[2], amount: 1 },
      ],
    ] satisfies readonly (readonly GuidedBackgroundIncrease[])[]) {
      const response = await rpcRegistry.dispatch(
        {
          id: 1,
          method: BACKGROUND_RPC.applyBackground,
          params: {
            character_id: characterId,
            content_key: background.content_key,
            increases,
            origin_feat_content_key: feat.content_key,
            origin_feat_config:
              feat.content_key === MAGIC_INITIATE_FEAT_CONTENT_KEY
                ? magicInitiateConfig()
                : {},
          },
        },
        harness.context,
      );
      expect(response.ok).toBe(true);
      expect(contributionRows(db, characterId)).toHaveLength(increases.length);
    }
  });

  it('B2-PROVENANCE exports and re-imports a real background-owned contribution without refusal or source loss', async () => {
    const sourceHarness = await applicationDatabase();
    const source = sourceHarness.context.db;
    const options = choiceOptions(source);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const characterId = character(source, 'B3 Provenance');
    const params = customMagicInitiateParams(characterId, background);
    applyGuidedBackgroundChoices(source, params);

    const decoded = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(source, characterId)),
    );
    const targetHarness = await applicationDatabase();
    const target = targetHarness.context.db;
    const imported = importCharacterShare(target, decoded);

    const importedRows = contributionRows(target, imported.characterId);
    expect(importedRows).toHaveLength(params.increases.length);
    expect(
      importedRows.map((row) => ({
        ability: row.ability,
        amount: row.amount,
        maximum: row.maximum,
        source_type: row.source_type,
        source_content_key: row.source_content_key,
      })),
    ).toEqual(
      params.increases.map((increase) => ({
        ...increase,
        maximum: extractBackgroundIncreaseMaximum(),
        source_type: 'background',
        source_content_key: background.content_key,
      })),
    );
    expect(
      importedRows.every(
        (row) =>
          typeof row.source_instance_id === 'number' &&
          row.source_instance_id > 0,
      ),
    ).toBe(true);
  });

  it('reports unknown Origin feats and missing background definitions with the same reason but distinguishable messages', async () => {
    const harness = await applicationDatabase();
    const db = harness.context.db;
    const options = choiceOptions(db);
    const background =
      backgroundWithDifferentMagicInitiateSuggestion(options);
    const characterId = character(db, 'B3 Refusal Shapes');
    const base = customMagicInitiateParams(characterId, background);

    const unknownFeat = await rpcRegistry.dispatch(
      {
        id: 1,
        method: BACKGROUND_RPC.applyBackground,
        params: {
          ...base,
          origin_feat_content_key: 'test:feat:not-bundled',
          origin_feat_config: {},
        },
      },
      harness.context,
    );
    expect(unknownFeat).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        message: expect.stringMatching(/No bundled Origin feat exists/u),
        data: { reason: 'unknown_origin' },
      },
    });

    db.exec('DELETE FROM background_definitions WHERE content_key = ?', [
      background.content_key,
    ]);
    const missingDefinition = await rpcRegistry.dispatch(
      {
        id: 2,
        method: BACKGROUND_RPC.applyBackground,
        params: base,
      },
      harness.context,
    );
    expect(missingDefinition).toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        message: expect.stringMatching(
          /has no definition in this database/u,
        ),
        data: { reason: 'unknown_origin' },
      },
    });
    expect(unknownFeat).not.toEqual(missingDefinition);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_background WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });
});
