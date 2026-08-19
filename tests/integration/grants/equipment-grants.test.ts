import { afterEach, describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CHOICE_CONFIG_KEY,
  type EquipmentChoiceConfig,
} from '../../../src/builder/contracts';
import {
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedBackgroundChoiceOptions,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { MAGIC_INITIATE_FEAT_CONTENT_KEY } from '../../../src/builder/background-choices';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import type { DatabaseContext } from '../../../src/db/database';
import {
  applyEquipmentPackageChoice,
  EquipmentGrantRefusal,
} from '../../../src/grants/equipment-grants';
import {
  EquipmentClassSourceMissingError,
  EquipmentGrantedRowContractError,
  EquipmentPackageContentMissingError,
  EquipmentTemplateLinkMissingError,
  EquipmentTemplateMissingError,
  EquipmentWeaponGroupError,
} from '../../../src/grants/equipment-grants-errors';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * THE STARTING-EQUIPMENT MINT (plan
 * `docs/design/2026-07-29-starting-equipment.md` §2/§3 dispatch E-A, reduced
 * by owner ruling D69: no provenance stamp, no option-change cleanup),
 * against the full application seed and the real guided applies. These are
 * the fixtures the plan's SURVIVING §6 controls fire against:
 *
 *  - E-NO-GEAR: a pack and a GP line mint nothing, because both are gear;
 *  - E-PLURAL: a Bard's option A mints TWO Daggers as owned weapon rows —
 *    the control whose absence would have shipped a silently disarmed Bard
 *    (§0b);
 *  - the armour-slot collision refuses BY NAME with whole-apply rollback;
 *  - the record-only background path produces a marker-tagged source
 *    instance, because the recorded CHOICE lives in a `config` and needs a
 *    row to carry it.
 *
 * E-SOURCE and E-PRESERVE lived here and are DELETED, not weakened: their
 * subject — granted rows distinguishable on `source_instance_id`, and a
 * cleanup that removes exactly what a source granted — was struck by D69.
 * What replaces the cleanup's contract is asserted below in its own words:
 * an option switch leaves the previous option's rows in place, and the
 * player removes what they do not want.
 */
let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function applicationDatabase(): Promise<RpcHarness> {
  harness = await createSeededRpcHarness([]);
  return harness;
}

const integrity = () =>
  new CharacterCommandIntegrity('equipment-grants-test-key');

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

function classSourceInstanceId(
  db: DatabaseContext,
  characterId: number,
): number {
  const id = db.scalar(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? AND source_type = 'class' AND state = 'active'`,
    [characterId],
  );
  if (typeof id !== 'number') {
    throw new Error('The guided character has no active class source.');
  }
  return id;
}

function ownedWeaponNames(
  db: DatabaseContext,
  characterId: number,
): string[] {
  return db.allRaw(
    `SELECT name FROM character_weapons
     WHERE character_id = ? ORDER BY name, id`,
    [characterId],
  ).map((row) => String(row.name));
}

function ownedArmorNames(db: DatabaseContext, characterId: number): string[] {
  return db.allRaw(
    `SELECT name FROM character_armor
     WHERE character_id = ? ORDER BY slot`,
    [characterId],
  ).map((row) => String(row.name));
}

function recordedChoice(
  db: DatabaseContext,
  sourceInstanceId: number,
): EquipmentChoiceConfig | undefined {
  const stored = db.scalar(
    'SELECT config FROM character_source_instances WHERE id = ?',
    [sourceInstanceId],
  );
  if (typeof stored !== 'string') {
    return undefined;
  }
  const parsed = JSON.parse(stored) as Record<string, unknown>;
  return parsed[EQUIPMENT_CHOICE_CONFIG_KEY] as
    | EquipmentChoiceConfig
    | undefined;
}

/** A minimal hand-added weapon: what the planner's add path would write. */
function handAddWeapon(
  db: DatabaseContext,
  characterId: number,
  name: string,
): void {
  db.exec(
    `INSERT INTO character_weapons (character_id, name)
     VALUES (?, ?)`,
    [characterId, name],
  );
}

describe('the equipment mint (E-A, reduced by D69)', () => {
  it('mints a Fighter option A as plain owned rows, and nothing for gear (E-NO-GEAR)', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Astrid');
    const classSource = classSourceInstanceId(db, characterId);

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    // Chain Mail, Greatsword, Flail, 8 Javelins — and NOTHING for the
    // Dungeoneer's Pack or the trailing 4 GP line, both gear (D65, D56).
    expect(ownedArmorNames(db, characterId)).toEqual(['Chain Mail']);
    expect(ownedWeaponNames(db, characterId)).toEqual([
      'Flail',
      'Greatsword',
      ...Array.from({ length: 8 }, () => 'Javelin'),
    ]);
    // The recorded choice, in the instance's own config (§3, pinned) — the
    // ONLY thing the mint attaches to the source since D69.
    expect(recordedChoice(db, classSource)).toEqual({
      kind: 'class',
      option: 'a',
    });
    // The granted copy carries the fold, not NULL: a granted Greatsword is a
    // checkable martial weapon, unlike a hand-typed one.
    const greatsword = db.oneRaw(
      `SELECT proficiency_category, attack_kind, damage_kind, damage_dice
       FROM character_weapons WHERE character_id = ? AND name = 'Greatsword'`,
      [characterId],
    );
    expect(greatsword).toMatchObject({
      proficiency_category: 'martial',
      attack_kind: 'melee',
      damage_kind: 'dice',
      damage_dice: '2d6',
    });
  });

  it('switching options does NOT clean up (D69): the old armour must be removed by the player, and the old weapons stay', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Brand');
    const classSource = classSourceInstanceId(db, characterId);

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    // Option A's Chain Mail still occupies the worn slot, so the switch to
    // option B (Studded Leather) REFUSES rather than silently eating it —
    // under D69 the minted rows are the player's own.
    let refusal: EquipmentGrantRefusal | undefined;
    try {
      applyEquipmentPackageChoice(db, {
        character_id: characterId,
        content_key: contentKey,
        kind: 'class',
        option: 'b',
      });
    } catch (error) {
      refusal = error as EquipmentGrantRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentGrantRefusal);
    expect(refusal?.data).toMatchObject({
      reason: 'armor_slot_occupied',
      slot: 'worn',
      holder: 'Chain Mail',
    });
    // Whole-apply rollback: the recorded choice is still A and no option-B
    // weapon arrived.
    expect(recordedChoice(db, classSource)).toEqual({
      kind: 'class',
      option: 'a',
    });
    expect(ownedWeaponNames(db, characterId)).not.toContain('Scimitar');

    // The player removes what they do not want (D69, point 5)...
    db.exec(
      `DELETE FROM character_armor WHERE character_id = ? AND slot = 'worn'`,
      [characterId],
    );
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'b',
    });

    // ...and the switch records B and mints B's rows WITHOUT touching A's
    // weapons: no stamp, no cleanup, the Greatsword is theirs now.
    expect(ownedWeaponNames(db, characterId)).toEqual([
      'Flail',
      'Greatsword',
      ...Array.from({ length: 8 }, () => 'Javelin'),
      'Longbow',
      'Scimitar',
      'Shortsword',
    ]);
    expect(ownedArmorNames(db, characterId)).toEqual([
      'Studded Leather Armor',
    ]);
    expect(recordedChoice(db, classSource)).toEqual({
      kind: 'class',
      option: 'b',
    });
  });

  it("mints a Bard's option A as TWO owned Daggers (E-PLURAL)", async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Bard', 'Cadenza');

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    // "2 Daggers" is a WEAPON bundle resolved against the singular template
    // (§0b) — under the old seed classification this minted zero weapons and
    // silently disarmed the Bard.
    expect(ownedWeaponNames(db, characterId)).toEqual(['Dagger', 'Dagger']);
    expect(ownedArmorNames(db, characterId)).toEqual(['Leather Armor']);
  });

  it('refuses an occupied armour slot BY NAME and rolls the whole apply back', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Donn');
    const classSource = classSourceInstanceId(db, characterId);

    // A person's own worn armour, exactly what the wizard cannot overwrite.
    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'worn', 'Family Breastplate', 'medium', 14, 'none')`,
      [characterId],
    );

    let refusal: EquipmentGrantRefusal | undefined;
    try {
      applyEquipmentPackageChoice(db, {
        character_id: characterId,
        content_key: contentKey,
        kind: 'class',
        option: 'a',
      });
    } catch (error) {
      refusal = error as EquipmentGrantRefusal;
    }
    expect(refusal).toBeInstanceOf(EquipmentGrantRefusal);
    expect(refusal?.name).toBe('EquipmentGrantRefusal');
    expect(refusal?.reason).toBe('armor_slot_occupied');
    expect(refusal?.data).toEqual({
      reason: 'armor_slot_occupied',
      slot: 'worn',
      item: 'Chain Mail',
      holder: 'Family Breastplate',
    });

    // WHOLE-APPLY ROLLBACK: no weapon was minted, no choice was recorded,
    // and the person's armour is exactly where they put it.
    expect(ownedWeaponNames(db, characterId)).toEqual([]);
    expect(ownedArmorNames(db, characterId)).toEqual(['Family Breastplate']);
    expect(recordedChoice(db, classSource)).toBeUndefined();
  });

  it('re-confirming the recorded choice is a NO-OP, never a duplicate mint', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Edda');
    const choice = {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    } as const;
    applyEquipmentPackageChoice(db, choice);
    const first = ownedWeaponNames(db, characterId);
    // With no cleanup (D69) a second mint would DUPLICATE every row and
    // collide on the armour slot; the recorded-choice no-op is what makes a
    // double-confirm harmless.
    applyEquipmentPackageChoice(db, choice);
    expect(ownedWeaponNames(db, characterId)).toEqual(first);
    expect(ownedArmorNames(db, characterId)).toHaveLength(1);
  });

  it('pins missing package content and missing active class source by structured fields', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Missing package probes');

    let missingContent: unknown;
    try {
      applyEquipmentPackageChoice(db, {
        character_id: characterId,
        content_key: 'fixture:missing-class-content',
        kind: 'class',
        option: 'a',
      });
    } catch (error) {
      missingContent = error;
    }
    expect(missingContent).toBeInstanceOf(EquipmentPackageContentMissingError);
    expect(missingContent).toMatchObject({
      name: 'EquipmentPackageContentMissingError',
      content_kind: 'class',
      content_key: 'fixture:missing-class-content',
    });

    const sourceId = classSourceInstanceId(db, characterId);
    db.exec("UPDATE character_source_instances SET state = 'tombstoned' WHERE id = ?", [sourceId]);
    let missingSource: unknown;
    try {
      applyEquipmentPackageChoice(db, {
        character_id: characterId,
        content_key: contentKey,
        kind: 'class',
        option: 'a',
      });
    } catch (error) {
      missingSource = error;
    }
    expect(missingSource).toBeInstanceOf(EquipmentClassSourceMissingError);
    expect(missingSource).toMatchObject({
      name: 'EquipmentClassSourceMissingError',
      character_id: characterId,
      content_key: contentKey,
    });
    expect(ownedWeaponNames(db, characterId)).toEqual([]);
    expect(ownedArmorNames(db, characterId)).toEqual([]);
  });

  it('normalizes every nullable, blank, scalar, array, and object stored config shape', async () => {
    const db = (await applicationDatabase()).context.db;
    const cases: readonly {
      readonly stored: string | null;
      readonly retained: Readonly<Record<string, unknown>>;
    }[] = [
      { stored: null, retained: {} },
      { stored: '', retained: {} },
      { stored: 'null', retained: {} },
      { stored: '[]', retained: {} },
      { stored: '"scalar"', retained: {} },
      { stored: '{"other":{"value":7}}', retained: { other: { value: 7 } } },
    ];

    for (const [index, fixture] of cases.entries()) {
      const { characterId, contentKey } = createWithClass(
        db,
        'Wizard',
        `Config shape ${String(index)}`,
      );
      const sourceId = classSourceInstanceId(db, characterId);
      db.exec('UPDATE character_source_instances SET config = ? WHERE id = ?', [
        fixture.stored,
        sourceId,
      ]);

      applyEquipmentPackageChoice(db, {
        character_id: characterId,
        content_key: contentKey,
        kind: 'class',
        option: 'b',
      });

      const stored = db.scalar<string>(
        'SELECT config FROM character_source_instances WHERE id = ?',
        [sourceId],
      );
      expect(typeof stored).toBe('string');
      expect(JSON.parse(String(stored))).toEqual({
        ...fixture.retained,
        [EQUIPMENT_CHOICE_CONFIG_KEY]: { kind: 'class', option: 'b' },
      });
      expect(ownedWeaponNames(db, characterId)).toEqual([]);
      expect(ownedArmorNames(db, characterId)).toEqual([]);
    }
  });

  it('dispatches a shield to the shield slot and pins its complete minted row', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Shield dispatch');
    const shieldId = Number(db.scalar(
      "SELECT id FROM armor_templates WHERE category = 'shield'",
    ));
    db.exec(
      `UPDATE class_equipment_items
       SET item_name = 'Shield', armor_template_id = ?
       WHERE class_definition_id = (
         SELECT id FROM class_definitions WHERE content_key = ?
       ) AND option = 'a' AND item_kind = 'armor'`,
      [shieldId, contentKey],
    );

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    expect(db.allRaw(
      `SELECT slot, name, category, armor_class, dex_bonus,
              dex_bonus_max, strength_requirement, stealth_disadvantage
       FROM character_armor WHERE character_id = ?`,
      [characterId],
    )).toEqual([{
      slot: 'shield',
      name: 'Shield',
      category: 'shield',
      armor_class: 2,
      dex_bonus: 'none',
      dex_bonus_max: null,
      strength_requirement: null,
      stealth_disadvantage: 0,
    }]);
  });

  it('pins missing links, missing templates, invalid weapon groups, and row-contract defects', async () => {
    const scenarios: readonly {
      readonly label: string;
      readonly mutate: (db: DatabaseContext, contentKey: string) => void;
      readonly expected: new (...parameters: never[]) => Error;
      readonly fields: Readonly<Record<string, unknown>>;
    }[] = [
      {
        label: 'missing-link',
        mutate: (fixtureDb, contentKey) => {
          fixtureDb.exec('PRAGMA ignore_check_constraints = ON');
          fixtureDb.exec(
            `UPDATE class_equipment_items SET weapon_template_id = NULL
             WHERE class_definition_id = (
               SELECT id FROM class_definitions WHERE content_key = ?
             ) AND option = 'a' AND item_kind = 'weapon'`,
            [contentKey],
          );
        },
        expected: EquipmentTemplateLinkMissingError,
        fields: { equipment_kind: 'weapon' },
      },
      {
        label: 'missing-template',
        mutate: (fixtureDb, contentKey) => {
          fixtureDb.exec('PRAGMA foreign_keys = OFF');
          fixtureDb.exec(
            `UPDATE class_equipment_items SET weapon_template_id = 999999
             WHERE class_definition_id = (
               SELECT id FROM class_definitions WHERE content_key = ?
             ) AND option = 'a' AND item_kind = 'weapon'`,
            [contentKey],
          );
        },
        expected: EquipmentTemplateMissingError,
        fields: { equipment_kind: 'weapon', template_id: 999_999 },
      },
      {
        label: 'invalid-group',
        mutate: (fixtureDb) => {
          fixtureDb.exec('PRAGMA ignore_check_constraints = ON');
          fixtureDb.exec("UPDATE weapon_templates SET srd_group = 'future_group' WHERE name = 'Dagger'");
        },
        expected: EquipmentWeaponGroupError,
        fields: { template_name: 'Dagger', srd_group: 'future_group' },
      },
      {
        label: 'invalid-row-contract',
        mutate: (fixtureDb) => {
          fixtureDb.exec('PRAGMA ignore_check_constraints = ON');
          fixtureDb.exec("UPDATE weapon_templates SET damage_dice = NULL WHERE name = 'Dagger'");
        },
        expected: EquipmentGrantedRowContractError,
        fields: { table: 'character_weapons', item_name: 'Daggers' },
      },
      {
        label: 'invalid-armor-row-contract',
        mutate: (fixtureDb) => {
          fixtureDb.exec('PRAGMA ignore_check_constraints = ON');
          fixtureDb.exec("UPDATE armor_templates SET category = 'future_armor' WHERE name = 'Leather Armor'");
        },
        expected: EquipmentGrantedRowContractError,
        fields: { table: 'character_armor', item_name: 'Leather Armor' },
      },
    ];

    for (const fixture of scenarios) {
      harness?.close();
      harness = undefined;
      const db = (await applicationDatabase()).context.db;
      const { characterId, contentKey } = createWithClass(
        db,
        'Bard',
        `Equipment defect ${fixture.label}`,
      );
      fixture.mutate(db, contentKey);
      let thrown: unknown;
      try {
        applyEquipmentPackageChoice(db, {
          character_id: characterId,
          content_key: contentKey,
          kind: 'class',
          option: 'a',
        });
      } catch (error) {
        thrown = error;
      }
      expect(thrown, fixture.label).toBeInstanceOf(fixture.expected);
      expect(thrown, fixture.label).toMatchObject(fixture.fields);
      expect(ownedWeaponNames(db, characterId), fixture.label).toEqual([]);
      expect(ownedArmorNames(db, characterId), fixture.label).toEqual([]);
    }
  });
});

function weaponBearingBackground(db: DatabaseContext): string {
  const key = db.scalar(
    `SELECT template.content_key
     FROM background_equipment_items AS item
     JOIN background_templates AS template
       ON template.id = item.background_template_id
     WHERE item.option = 'a' AND item.item_kind = 'weapon'
     ORDER BY template.id`,
  );
  if (typeof key !== 'string') {
    throw new Error('No bundled background grants a weapon in option A.');
  }
  return key;
}

function guidedBackgroundKey(db: DatabaseContext, contentKey: string): string {
  const option = listGuidedOriginOptions(db, 'background').find(
    (candidate) => candidate.content_key === contentKey,
  );
  if (option === undefined) {
    throw new Error(`The guided catalogue has no background ${contentKey}.`);
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

describe('the background arm (E-A, reduced by D69)', () => {
  it('selects background option A versus B exactly, including quantity expansion', async () => {
    const db = (await applicationDatabase()).context.db;
    const backgroundKey = weaponBearingBackground(db);
    expect(backgroundKey).toBe('2024:background:criminal');

    const optionACharacter = createWithClass(db, 'Fighter', 'Background option A').characterId;
    applyEquipmentPackageChoice(db, {
      character_id: optionACharacter,
      content_key: backgroundKey,
      kind: 'background',
      option: 'a',
    });
    expect(ownedWeaponNames(db, optionACharacter)).toEqual(['Dagger', 'Dagger']);
    expect(ownedArmorNames(db, optionACharacter)).toEqual([]);
    const optionASource = Number(db.scalar(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND source_type = 'background'`,
      [optionACharacter],
    ));
    expect(recordedChoice(db, optionASource)).toEqual({
      kind: 'background',
      option: 'a',
    });

    const optionBCharacter = createWithClass(db, 'Fighter', 'Background option B').characterId;
    applyEquipmentPackageChoice(db, {
      character_id: optionBCharacter,
      content_key: backgroundKey,
      kind: 'background',
      option: 'b',
    });
    expect(ownedWeaponNames(db, optionBCharacter)).toEqual([]);
    expect(ownedArmorNames(db, optionBCharacter)).toEqual([]);
    const optionBSource = Number(db.scalar(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND source_type = 'background'`,
      [optionBCharacter],
    ));
    expect(recordedChoice(db, optionBSource)).toEqual({
      kind: 'background',
      option: 'b',
    });
  });

  it('accepts current weapon and armor fingerprints and refuses a drifted weapon exactly', async () => {
    const db = (await applicationDatabase()).context.db;
    const backgroundKey = weaponBearingBackground(db);

    const validCharacter = createWithClass(db, 'Fighter', 'Valid background dependency').characterId;
    applyEquipmentPackageChoice(db, {
      character_id: validCharacter,
      content_key: backgroundKey,
      kind: 'background',
      option: 'a',
    });
    expect(ownedWeaponNames(db, validCharacter)).toEqual(['Dagger', 'Dagger']);

    const shieldId = Number(db.scalar("SELECT id FROM armor_templates WHERE category = 'shield'"));
    db.exec('PRAGMA ignore_check_constraints = ON');
    db.exec(
      `UPDATE background_equipment_items
       SET item_kind = 'armor', item_name = 'Shield',
           weapon_template_id = NULL, armor_template_id = ?
       WHERE background_template_id = (
         SELECT id FROM background_templates WHERE content_key = ?
       ) AND option = 'a' AND sort_order = 2`,
      [shieldId, backgroundKey],
    );
    const armorCharacter = createWithClass(db, 'Fighter', 'Valid armor dependency').characterId;
    applyEquipmentPackageChoice(db, {
      character_id: armorCharacter,
      content_key: backgroundKey,
      kind: 'background',
      option: 'a',
    });
    expect(db.allRaw(
      'SELECT slot, name, category, armor_class FROM character_armor WHERE character_id = ?',
      [armorCharacter],
    )).toEqual([{
      slot: 'shield',
      name: 'Shield',
      category: 'shield',
      armor_class: 2,
    }]);

    db.exec("UPDATE weapon_templates SET damage_type = 'Force' WHERE name = 'Dagger'");
    const driftCharacter = createWithClass(db, 'Fighter', 'Drifted background dependency').characterId;
    let refusal: unknown;
    try {
      applyEquipmentPackageChoice(db, {
        character_id: driftCharacter,
        content_key: backgroundKey,
        kind: 'background',
        option: 'a',
      });
    } catch (error) {
      refusal = error;
    }
    expect(refusal).toBeInstanceOf(EquipmentGrantRefusal);
    expect(refusal).toMatchObject({
      name: 'EquipmentGrantRefusal',
      reason: 'equipment_dependency_drift',
      data: {
        reason: 'equipment_dependency_drift',
        content_key: '2024:weapon:dagger',
        dependency_kind: 'weapon',
        item: 'Daggers',
      },
    });
    expect(ownedWeaponNames(db, driftCharacter)).toEqual([]);
    expect(ownedArmorNames(db, driftCharacter)).toEqual([]);
  });

  it('the record-only applyOrigin path gets an instance PRODUCED, marker-tagged, to carry the recorded choice', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Ferro');
    const backgroundKey = weaponBearingBackground(db);

    // The seam's record-only apply: it writes the printed words and NO
    // source instance — the state the produced-instance path exists for.
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: guidedBackgroundKey(db, backgroundKey),
    });
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'`,
        [characterId],
      ),
    ).toBe(0);

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: backgroundKey,
      kind: 'background',
      option: 'a',
    });

    const backgroundSource = db.oneRaw(
      `SELECT id, notes FROM character_source_instances
       WHERE character_id = ? AND source_type = 'background'
         AND state = 'active'`,
      [characterId],
    );
    expect(backgroundSource).not.toBeNull();
    // Marker-tagged, so the next background change deletes it — and the
    // recorded choice with it.
    expect(String(backgroundSource?.notes)).toBe('guided:background-apply');

    // The background's weapon arrived as a plain owned row (D69), and the
    // choice is recorded on the produced instance.
    expect(ownedWeaponNames(db, characterId).length).toBeGreaterThan(0);
    expect(
      recordedChoice(db, Number(backgroundSource?.id)),
    ).toEqual({ kind: 'background', option: 'a' });
  });

  it('attaches the record to the B3 apply’s existing instance; a background change deletes the record, never the weapons', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Grit');
    const backgroundKey = weaponBearingBackground(db);

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
    const existing = db.scalar(
      `SELECT id FROM character_source_instances
       WHERE character_id = ? AND source_type = 'background'
         AND parent_source_instance_id IS NULL AND state = 'active'`,
      [characterId],
    );
    expect(typeof existing).toBe('number');

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: backgroundKey,
      kind: 'background',
      option: 'a',
    });

    // No second instance was minted: the record hangs off the B3 apply's own.
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'
           AND parent_source_instance_id IS NULL`,
        [characterId],
      ),
    ).toBe(1);
    const minted = ownedWeaponNames(db, characterId);
    expect(minted.length).toBeGreaterThan(0);
    expect(recordedChoice(db, Number(existing))).toEqual({
      kind: 'background',
      option: 'a',
    });

    // Changing the background hard-deletes the instance tree and its
    // recorded choice — but the minted weapons SURVIVE: since D69 they are
    // the player's own rows with no cascade edge back to the source, and
    // the player removes what they do not want.
    const otherBackground = listGuidedOriginOptions(db, 'background').find(
      (candidate) => candidate.content_key !== backgroundKey,
    );
    if (otherBackground === undefined) {
      throw new Error('The bundled catalogue has only one background.');
    }
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'background',
      content_key: otherBackground.content_key,
    });
    expect(ownedWeaponNames(db, characterId)).toEqual(minted);
  });
});

describe('equipment through a share link (D62)', () => {
  it('a round trip carries every weapon and armour row as plain rows, and the recorded choice in config', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Skye');
    handAddWeapon(db, characterId, 'Family Blade');
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    // Through the real fragment, exactly as a link travels.
    const decoded = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(db, characterId)),
    );
    const imported = importCharacterShare(db, decoded);
    const cloneClassSource = classSourceInstanceId(db, imported.characterId);

    // Every row arrives — the hand-added Family Blade and the minted kit
    // alike, indistinguishable by design (D69).
    expect(ownedWeaponNames(db, imported.characterId)).toEqual(
      ownedWeaponNames(db, characterId),
    );
    expect(ownedArmorNames(db, imported.characterId)).toEqual(['Chain Mail']);
    // The recorded CHOICE travelled in the source's own config — an imported
    // clone that lost it would regress to equipment-incomplete the moment
    // E-B reads it (§2's D62 argument).
    expect(recordedChoice(db, cloneClassSource)).toEqual({
      kind: 'class',
      option: 'a',
    });
  });
});
