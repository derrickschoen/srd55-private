import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EQUIPMENT_RPC,
  type GuidedEquipmentStepState,
} from '../../../src/builder/contracts';
import {
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  createGuidedCharacter,
  guidedBuildState,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
  readGuidedStepEvidence,
} from '../../../src/builder/guided-creation';
import {
  applyGuidedEquipment,
  guidedEquipmentStepState,
  EquipmentStepRefusal,
} from '../../../src/builder/equipment-step';
import { MAGIC_INITIATE_FEAT_CONTENT_KEY } from '../../../src/builder/background-choices';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type { DatabaseContext } from '../../../src/db/database';
import { EquipmentGrantRefusal } from '../../../src/grants/equipment-grants';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { createEquipmentStep } from '../../../src/ui/screens/guided-builder/equipment-step';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * THE EQUIPMENT STEP (plan `docs/design/2026-07-29-starting-equipment.md`
 * §0c/§3/§4/§7, dispatch E-B), against the full application seed. These are
 * the fixtures §6's three E-B controls fire against:
 *
 *  - E-NO-GOLD-OFFERED: a Wizard is offered exactly ONE option — the seeded
 *    gold option exists and is suppressed by the OPTION filter;
 *  - E-NO-GOLD-SHOWN: a Fighter's rendered contents do NOT include "4 GP" —
 *    the seeded coin line exists and is removed by the DISPLAY filter, a
 *    different code path (revision 2 had these as one control and the second
 *    half was unfalsifiable by the first's mutation);
 *  - E-COMPLETE: `equipment` completeness is real evidence — false before a
 *    choice, true only after BOTH sources record one.
 *
 * Every gold assertion is paired with a query proving the seeded rows DO
 * carry the line being filtered, so a filter that lands in nothing cannot
 * pass — the mutation-lands-in-nothing trap §6 names.
 */
let harness: RpcHarness | undefined;
let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  harness?.close();
  harness = undefined;
});

async function applicationDatabase(): Promise<RpcHarness> {
  harness = await createRpcHarness([]);
  return harness;
}

const integrity = () =>
  new CharacterCommandIntegrity('equipment-step-test-key');

function classKey(db: DatabaseContext, name: string): string {
  const option = listGuidedClassOptions(db).find(
    (candidate) => candidate.name === name,
  );
  if (option === undefined) {
    throw new Error(`The bundled class catalogue has no ${name}.`);
  }
  return option.content_key;
}

function createWithClass(
  db: DatabaseContext,
  className: string,
  name: string,
): { characterId: number; contentKey: string } {
  const contentKey = classKey(db, className);
  const characterId = createGuidedCharacter(
    db,
    { name, class_content_key: contentKey },
    integrity(),
  ).id;
  return { characterId, contentKey };
}

function backgroundKeyByName(db: DatabaseContext, name: string): string {
  const option = listGuidedOriginOptions(db, 'background').find(
    (candidate) => candidate.name === name,
  );
  if (option === undefined) {
    throw new Error(`The bundled background catalogue has no ${name}.`);
  }
  return option.content_key;
}

function nonMagicInitiateFeat(db: DatabaseContext): string {
  const feat = listGuidedBackgroundChoiceOptions(db).origin_feats.find(
    (candidate) => candidate.content_key !== MAGIC_INITIATE_FEAT_CONTENT_KEY,
  );
  if (feat === undefined) {
    throw new Error('The seeded Origin feat catalogue has no config-free feat.');
  }
  return feat.content_key;
}

/** The B3 apply: records the background WITH its source instance. */
function applyBackground(
  db: DatabaseContext,
  characterId: number,
  backgroundKey: string,
): void {
  applyGuidedBackgroundChoices(db, {
    character_id: characterId,
    content_key: backgroundKey,
    increases: [
      { ability: 'wisdom', amount: 2 },
      { ability: 'charisma', amount: 1 },
    ],
    origin_feat_content_key: nonMagicInitiateFeat(db),
    origin_feat_config: {},
  });
}

function seededOptionLetters(
  db: DatabaseContext,
  kind: 'class' | 'background',
  contentKey: string,
): string[] {
  return kind === 'class'
    ? db.allRaw(
        `SELECT DISTINCT item.option AS letter
         FROM class_equipment_items AS item
         JOIN class_definitions AS definition
           ON definition.id = item.class_definition_id
         WHERE definition.content_key = ?
         ORDER BY item.option`,
        [contentKey],
      ).map((row) => String(row.letter))
    : db.allRaw(
        `SELECT DISTINCT item.option AS letter
         FROM background_equipment_items AS item
         JOIN background_templates AS template
           ON template.id = item.background_template_id
         WHERE template.content_key = ?
         ORDER BY item.option`,
        [contentKey],
      ).map((row) => String(row.letter));
}

function contentNames(
  state: GuidedEquipmentStepState,
  option: string,
): string[] {
  const offered = state.class_package.offered.find(
    (candidate) => candidate.option === option,
  );
  if (offered === undefined) {
    throw new Error(`The class package offers no option ${option}.`);
  }
  return offered.contents.map((line) => line.item_name);
}

const MONEY = /^\d+\s+GP$/u;

describe('the equipment step read (E-B)', () => {
  it('offers a Wizard exactly ONE option — the seeded gold option exists and is suppressed (E-NO-GOLD-OFFERED)', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(
      db,
      'Wizard',
      'Aldous',
    );

    // The filter has a subject: the seed really does carry a second, gold-only
    // option for the Wizard. Without this line, a filter landing in nothing
    // would pass the assertion below.
    expect(seededOptionLetters(db, 'class', contentKey)).toEqual(['a', 'b']);

    const state = guidedEquipmentStepState(db, characterId);
    expect(state.class_package.source_name).toBe('Wizard');
    expect(state.class_package.offered).toHaveLength(1);
    expect(state.class_package.offered[0]?.option).toBe('a');
    expect(state.class_package.chosen_option).toBeNull();
  });

  it("renders a Fighter's two real options with the pack shown and NO coin line (E-NO-GOLD-SHOWN)", async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(
      db,
      'Fighter',
      'Bertrand',
    );

    // Fighter is the ONLY class with two non-gold options (§0c): A, B and a
    // gold-only C are seeded; A and B survive.
    expect(seededOptionLetters(db, 'class', contentKey)).toEqual([
      'a',
      'b',
      'c',
    ]);
    // The display filter has a subject too: option A's seeded rows really end
    // in the "4 GP" gear line.
    const seededCoin = db.scalar(
      `SELECT COUNT(*)
       FROM class_equipment_items AS item
       JOIN class_definitions AS definition
         ON definition.id = item.class_definition_id
       WHERE definition.content_key = ? AND item.option = 'a'
         AND item.item_name = '4 GP'`,
      [contentKey],
    );
    expect(seededCoin).toBe(1);

    const state = guidedEquipmentStepState(db, characterId);
    expect(
      state.class_package.offered.map((candidate) => candidate.option),
    ).toEqual(['a', 'b']);

    const optionA = contentNames(state, 'a');
    expect(optionA).not.toContain('4 GP');
    expect(optionA).toContain("Dungeoneer’s Pack");
    expect(optionA).toContain('Greatsword');
    const optionB = contentNames(state, 'b');
    expect(optionB).not.toContain('11 GP');
    for (const name of [...optionA, ...optionB]) {
      expect(name).not.toMatch(MONEY);
    }
  });

  it('offers a background exactly ONE option — option B is "50 GP" and is suppressed', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Cutter');
    const backgroundKey = backgroundKeyByName(db, 'Acolyte');
    applyBackground(db, characterId, backgroundKey);

    expect(seededOptionLetters(db, 'background', backgroundKey)).toEqual([
      'a',
      'b',
    ]);

    const state = guidedEquipmentStepState(db, characterId);
    if (state.background_package === null) {
      throw new Error('The applied background resolved to no package.');
    }
    expect(state.background_package.content_key).toBe(backgroundKey);
    expect(state.background_package.offered).toHaveLength(1);
    expect(state.background_package.offered[0]?.option).toBe('a');
    for (const line of state.background_package.offered[0]?.contents ?? []) {
      expect(line.item_name).not.toMatch(MONEY);
    }
  });

  it('completes only when BOTH sources record a choice — false before, true after, per source (E-COMPLETE)', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Dain');
    const backgroundKey = backgroundKeyByName(db, 'Acolyte');
    applyBackground(db, characterId, backgroundKey);

    // Direction one: BEFORE any choice, the evidence is false and the step
    // reports incomplete.
    expect(readGuidedStepEvidence(db, characterId).equipmentChosen).toBe(
      false,
    );
    expect(guidedEquipmentStepState(db, characterId).complete).toBe(false);

    // One source alone is NOT completeness: both are required (§3, D65/D61).
    applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'class',
      content_key: contentKey,
      option: 'a',
    });
    expect(readGuidedStepEvidence(db, characterId).equipmentChosen).toBe(
      false,
    );
    const midway = guidedEquipmentStepState(db, characterId);
    expect(midway.complete).toBe(false);
    expect(midway.class_package.chosen_option).toBe('a');

    // Direction two: AFTER both, the evidence is true and the step says so.
    const result = applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'background',
      content_key: backgroundKey,
      option: 'a',
    });
    expect(readGuidedStepEvidence(db, characterId).equipmentChosen).toBe(true);
    const done = guidedEquipmentStepState(db, characterId);
    expect(done.complete).toBe(true);
    expect(done.background_package?.chosen_option).toBe('a');
    // Completeness never REORDERS the walk: this fixture skipped abilities,
    // species and skills, so the derivation still resumes at the first
    // incomplete step — recorded equipment cannot paper over an earlier one.
    expect(result.current_step).toBe('abilities');
    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: 'abilities',
    });
  });

  it('resolves a record-only background through its unique template name, and the apply produces the instance', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Enid');
    const backgroundKey = backgroundKeyByName(db, 'Acolyte');

    // The record-only arm: printed words, NO source instance (E-A §3).
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: backgroundKey,
    });

    const state = guidedEquipmentStepState(db, characterId);
    if (state.background_package === null) {
      throw new Error(
        'A background recorded by name did not resolve to its template.',
      );
    }
    expect(state.background_package.content_key).toBe(backgroundKey);
    expect(state.background_package.chosen_option).toBeNull();

    applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'background',
      content_key: backgroundKey,
      option: 'a',
    });
    // The choice is recorded on a PRODUCED instance, and the read sees it.
    expect(
      guidedEquipmentStepState(db, characterId).background_package
        ?.chosen_option,
    ).toBe('a');
  });
});

describe('the equipment apply guards (E-B)', () => {
  it('refuses a gold-only option BY NAME and records nothing (D56 as a rule, not a display habit)', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(
      db,
      'Wizard',
      'Fenwick',
    );

    let refusal: EquipmentStepRefusal | undefined;
    try {
      applyGuidedEquipment(db, {
        character_id: characterId,
        kind: 'class',
        content_key: contentKey,
        option: 'b',
      });
    } catch (error) {
      refusal = error as EquipmentStepRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentStepRefusal);
    expect(refusal?.data).toEqual({
      reason: 'equipment_option_not_offered',
      kind: 'class',
      content_key: contentKey,
      option: 'b',
    });
    expect(readGuidedStepEvidence(db, characterId).equipmentChosen).toBe(
      false,
    );
    expect(
      guidedEquipmentStepState(db, characterId).class_package.chosen_option,
    ).toBeNull();
  });

  it("refuses a package that is not the character's own, and produces NO background instance", async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Gorm');
    const strangerBackground = backgroundKeyByName(db, 'Acolyte');

    // The character HAS no background. An unguarded apply would hand E-A's
    // background arm a key it happily produces an instance for — equipping a
    // background the character does not have.
    let refusal: EquipmentStepRefusal | undefined;
    try {
      applyGuidedEquipment(db, {
        character_id: characterId,
        kind: 'background',
        content_key: strangerBackground,
        option: 'a',
      });
    } catch (error) {
      refusal = error as EquipmentStepRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentStepRefusal);
    expect(refusal?.reason).toBe('equipment_source_mismatch');
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'`,
        [characterId],
      ),
    ).toBe(0);

    // Same guard on the class arm: a Wizard kit on a Fighter is refused.
    let classRefusal: EquipmentStepRefusal | undefined;
    try {
      applyGuidedEquipment(db, {
        character_id: characterId,
        kind: 'class',
        content_key: classKey(db, 'Wizard'),
        option: 'a',
      });
    } catch (error) {
      classRefusal = error as EquipmentStepRefusal;
    }
    expect(classRefusal?.reason).toBe('equipment_source_mismatch');
  });

  it("lets E-A's armour-slot collision surface with its own name and data", async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Hild');
    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'worn', 'Family Breastplate', 'medium', 14, 'none')`,
      [characterId],
    );

    let refusal: EquipmentGrantRefusal | undefined;
    try {
      applyGuidedEquipment(db, {
        character_id: characterId,
        kind: 'class',
        content_key: contentKey,
        option: 'a',
      });
    } catch (error) {
      refusal = error as EquipmentGrantRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentGrantRefusal);
    expect(refusal?.data).toEqual({
      reason: 'armor_slot_occupied',
      slot: 'worn',
      item: 'Chain Mail',
      holder: 'Family Breastplate',
    });
  });
});

describe('the sheet says what was chosen and that gear is not itemised (E-B, D33/D65)', () => {
  it('shows both recorded packages with coin-free contents, plus the unconditional gap', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Ivar');
    const backgroundKey = backgroundKeyByName(db, 'Acolyte');
    applyBackground(db, characterId, backgroundKey);

    const builder = new CharacterSheetBuilder(db);
    // Before any choice: no package rows, but the gap says gear is never
    // itemised — the sheet must not imply an empty inventory by silence.
    const before = builder.build(characterId);
    expect(before.equipment_packages).toEqual([]);
    expect(before.gaps.map((gap) => gap.kind)).toContain('gear_not_itemised');

    applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'class',
      content_key: contentKey,
      option: 'a',
    });
    applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'background',
      content_key: backgroundKey,
      option: 'a',
    });

    const sheet = builder.build(characterId);
    expect(
      sheet.equipment_packages.map((pack) => [pack.kind, pack.option]),
    ).toEqual([
      ['class', 'a'],
      ['background', 'a'],
    ]);
    const classPack = sheet.equipment_packages[0];
    expect(classPack?.source_name).toBe('Fighter');
    const names = classPack?.contents.map((line) => line.item_name) ?? [];
    // The package's gear renders (that is the D65 point) …
    expect(names).toContain("Dungeoneer’s Pack");
    // … and the coin line does not: §0c, the sheet must not show a purse
    // that §3 says is never granted.
    expect(names).not.toContain('4 GP');
    for (const pack of sheet.equipment_packages) {
      for (const line of pack.contents) {
        expect(line.item_name).not.toMatch(MONEY);
      }
    }
  });
});

describe('the equipment RPC registry contract', () => {
  it('discovers both seam-defined method names', () => {
    expect(rpcRegistry.methods).toContain(EQUIPMENT_RPC.equipmentStep);
    expect(rpcRegistry.methods).toContain(EQUIPMENT_RPC.applyEquipment);
  });

  it('rejects a background letter outside its closed set as invalid_params', async () => {
    const active = await applicationDatabase();
    await expect(
      rpcRegistry.dispatch(
        {
          id: 1,
          method: EQUIPMENT_RPC.applyEquipment,
          params: {
            character_id: 1,
            kind: 'background',
            content_key: 'anything',
            // 'c' exists for classes; a background has no option C, and the
            // validator knows the difference (the seam's two closed sets).
            option: 'c',
          },
        },
        active.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });

  it('returns the step state and structured refusals through the registry', async () => {
    const active = await applicationDatabase();
    const db = active.context.db;
    const { characterId, contentKey } = createWithClass(db, 'Wizard', 'Jorun');

    const read = await rpcRegistry.dispatch(
      {
        id: 2,
        method: EQUIPMENT_RPC.equipmentStep,
        params: { character_id: characterId },
      },
      active.context,
    );
    expect(read).toMatchObject({
      ok: true,
      result: {
        character_id: characterId,
        complete: false,
        class_package: { content_key: contentKey },
      },
    });

    // A refused gold option arrives as handler_error WITH the structured
    // reason — the step's sentence, never a stack trace.
    await expect(
      rpcRegistry.dispatch(
        {
          id: 3,
          method: EQUIPMENT_RPC.applyEquipment,
          params: {
            character_id: characterId,
            kind: 'class',
            content_key: contentKey,
            option: 'b',
          },
        },
        active.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'handler_error',
        data: {
          reason: 'equipment_option_not_offered',
          kind: 'class',
          option: 'b',
        },
      },
    });

    // The applied choice round-trips through the registry too. The returned
    // step is the derivation's, and this fixture skipped abilities, species
    // and skills — the walk resumes at the first incomplete step.
    await expect(
      rpcRegistry.dispatch(
        {
          id: 4,
          method: EQUIPMENT_RPC.applyEquipment,
          params: {
            character_id: characterId,
            kind: 'class',
            content_key: contentKey,
            option: 'a',
          },
        },
        active.context,
      ),
    ).resolves.toMatchObject({
      ok: true,
      result: { character_id: characterId, current_step: 'abilities' },
    });
    expect(
      guidedEquipmentStepState(db, characterId).class_package.chosen_option,
    ).toBe('a');
  });

  it('carries a hostile weapon layer through the live equipment RPC and renders it inert', async () => {
    const active = await applicationDatabase();
    const db = active.context.db;
    const { characterId, contentKey } = createWithClass(
      db,
      'Fighter',
      'Layered Equipment',
    );
    const hostile = '</li><img data-ha10-equipment-line src=x>';
    db.exec(
      `UPDATE class_equipment_items
       SET item_name = ?
       WHERE class_definition_id = (
         SELECT id FROM class_definitions WHERE content_key = ?
       ) AND option = 'a' AND item_kind = 'weapon'`,
      [hostile, contentKey],
    );
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(
      `DELETE FROM catalog_content_identities
       WHERE content_kind = 'weapon'
         AND content_key IN (
           SELECT weapon.content_key
           FROM class_equipment_items AS item
           JOIN weapon_templates AS weapon ON weapon.id = item.weapon_template_id
           WHERE item.class_definition_id = (
             SELECT id FROM class_definitions WHERE content_key = ?
           ) AND item.option = 'a'
         )`,
      [contentKey],
    );
    db.exec('PRAGMA foreign_keys = ON');

    const response = await rpcRegistry.dispatch(
      {
        id: 5,
        method: EQUIPMENT_RPC.equipmentStep,
        params: { character_id: characterId },
      },
      active.context,
    );
    if (!response.ok) throw new Error(response.error.message);
    const state = response.result as GuidedEquipmentStepState;
    const hostileLine = state.class_package.offered
      .flatMap((option) => option.contents)
      .find((line) => line.item_name === hostile);
    expect(hostileLine).toMatchObject({ catalog_layer: 'unknown' });

    const step = createEquipmentStep({
      characterId,
      state,
      applyEquipment: () => Promise.reject(new Error('not submitted')),
      navigate: () => undefined,
    });
    const renderedLine = interactiveElement(step.element)
      .querySelectorAll('.guided-equipment-line')
      .find((line) =>
        elementText(line as unknown as Node).includes(hostile)
      );
    expect(elementText(renderedLine! as unknown as Node)).toBe(
      `${hostile} — Unknown catalog layer`,
    );
    expect(
      interactiveElement(step.element).querySelector(
        '[data-ha10-equipment-line]',
      ),
    ).toBeNull();
    step.cleanup();
  });
});
