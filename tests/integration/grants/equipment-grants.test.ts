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
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import { BackupValidationError } from '../../../src/backup/backup-version';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * THE STARTING-EQUIPMENT MINT AND CLEANUP (plan
 * `docs/design/2026-07-29-starting-equipment.md` §2/§3, dispatch E-A), against
 * the full application seed and the real guided applies. These are the
 * fixtures the plan's §6 controls fire against:
 *
 *  - E-SOURCE: a granted Greatsword is distinguishable from a hand-added one
 *    on `source_instance_id`, never on any count;
 *  - E-PRESERVE: a hand-added weapon whose NAME COLLIDES with a granted one
 *    survives an option switch — only FIGHTER can exercise this, being the
 *    one class with two non-gold options (§0c);
 *  - E-NO-GEAR: a pack and a GP line mint nothing, because both are gear;
 *  - E-PLURAL: a Bard's option A mints TWO Daggers as owned weapon rows with
 *    the class source stamped — the control whose absence would have shipped
 *    a silently disarmed Bard (§0b);
 *  - the armour-slot collision refuses BY NAME with whole-apply rollback;
 *  - the record-only background path produces a source instance before
 *    minting, because a granted row with a NULL source is indistinguishable
 *    from a hand-added one — the entire defect this unit exists to prevent.
 */
let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function applicationDatabase(): Promise<RpcHarness> {
  harness = await createRpcHarness([]);
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

interface OwnedRow {
  readonly name: string;
  readonly source: number | null;
}

function ownedWeapons(
  db: DatabaseContext,
  characterId: number,
): OwnedRow[] {
  return db.allRaw(
    `SELECT name, source_instance_id FROM character_weapons
     WHERE character_id = ? ORDER BY name, id`,
    [characterId],
  ).map((row) => ({
    name: String(row.name),
    source:
      row.source_instance_id === null ? null : Number(row.source_instance_id),
  }));
}

function ownedArmor(db: DatabaseContext, characterId: number): OwnedRow[] {
  return db.allRaw(
    `SELECT name, source_instance_id FROM character_armor
     WHERE character_id = ? ORDER BY slot`,
    [characterId],
  ).map((row) => ({
    name: String(row.name),
    source:
      row.source_instance_id === null ? null : Number(row.source_instance_id),
  }));
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

describe('the equipment mint and cleanup (E-A)', () => {
  it('mints a Fighter option A stamped with the class source, and nothing for gear (E-SOURCE, E-NO-GEAR)', async () => {
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
    expect(ownedArmor(db, characterId)).toEqual([
      { name: 'Chain Mail', source: classSource },
    ]);
    const weapons = ownedWeapons(db, characterId);
    expect(weapons.map((weapon) => weapon.name)).toEqual([
      'Flail',
      'Greatsword',
      ...Array.from({ length: 8 }, () => 'Javelin'),
    ]);
    // E-SOURCE's subject: every granted row carries the granting instance —
    // the assertion is on provenance, not on any count.
    expect(weapons.every((weapon) => weapon.source === classSource)).toBe(
      true,
    );
    // The recorded choice, in the instance's own config (§3, pinned).
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

  it('switching Fighter A to B removes exactly the granted rows; a colliding hand-added weapon survives (E-PRESERVE)', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Brand');
    const classSource = classSourceInstanceId(db, characterId);

    // The fixture the plan pins: a hand-added weapon whose name COLLIDES
    // with a granted one, or the remove-by-name mutation is unobservable.
    handAddWeapon(db, characterId, 'Greatsword');

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });
    expect(
      ownedWeapons(db, characterId).filter(
        (weapon) => weapon.name === 'Greatsword',
      ),
    ).toEqual([
      { name: 'Greatsword', source: null },
      { name: 'Greatsword', source: classSource },
    ]);

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'b',
    });

    // Option A's grant is gone — including its Greatsword — while the
    // player's own survives untouched, and option B's rows arrive.
    expect(ownedWeapons(db, characterId)).toEqual([
      { name: 'Greatsword', source: null },
      { name: 'Longbow', source: classSource },
      { name: 'Scimitar', source: classSource },
      { name: 'Shortsword', source: classSource },
    ]);
    expect(ownedArmor(db, characterId)).toEqual([
      { name: 'Studded Leather Armor', source: classSource },
    ]);
    expect(recordedChoice(db, classSource)).toEqual({
      kind: 'class',
      option: 'b',
    });
  });

  it("mints a Bard's option A as TWO owned Daggers with the class source stamped (E-PLURAL)", async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Bard', 'Cadenza');
    const classSource = classSourceInstanceId(db, characterId);

    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });

    // "2 Daggers" is a WEAPON bundle resolved against the singular template
    // (§0b) — under the old seed classification this minted zero weapons and
    // silently disarmed the Bard.
    expect(ownedWeapons(db, characterId)).toEqual([
      { name: 'Dagger', source: classSource },
      { name: 'Dagger', source: classSource },
    ]);
    expect(ownedArmor(db, characterId)).toEqual([
      { name: 'Leather Armor', source: classSource },
    ]);
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
    expect(refusal?.data).toEqual({
      reason: 'armor_slot_occupied',
      slot: 'worn',
      item: 'Chain Mail',
      holder: 'Family Breastplate',
    });

    // WHOLE-APPLY ROLLBACK: no weapon was minted, no choice was recorded,
    // and the person's armour is exactly where they put it.
    expect(ownedWeapons(db, characterId)).toEqual([]);
    expect(ownedArmor(db, characterId)).toEqual([
      { name: 'Family Breastplate', source: null },
    ]);
    expect(recordedChoice(db, classSource)).toBeUndefined();
  });

  it('re-applying the same option re-mints under the same source, never duplicating', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Edda');
    const choice = {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    } as const;
    applyEquipmentPackageChoice(db, choice);
    const first = ownedWeapons(db, characterId);
    applyEquipmentPackageChoice(db, choice);
    expect(ownedWeapons(db, characterId)).toEqual(first);
    expect(ownedArmor(db, characterId)).toHaveLength(1);
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

describe('the background arm (E-A)', () => {
  it('the record-only applyOrigin path gets an instance PRODUCED before minting — granted rows never carry NULL', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId } = createWithClass(db, 'Fighter', 'Ferro');
    const backgroundKey = weaponBearingBackground(db);

    // The seam's record-only apply: it writes the printed words and NO
    // source instance — the state §3's second refusal names.
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
    // Marker-tagged, so the next background change deletes it — and, by the
    // composite cascade, everything it granted.
    expect(String(backgroundSource?.notes)).toBe('guided:background-apply');

    const granted = ownedWeapons(db, characterId).filter(
      (weapon) => weapon.source !== null,
    );
    expect(granted.length).toBeGreaterThan(0);
    expect(
      granted.every(
        (weapon) => weapon.source === Number(backgroundSource?.id),
      ),
    ).toBe(true);
    expect(
      recordedChoice(db, Number(backgroundSource?.id)),
    ).toEqual({ kind: 'background', option: 'a' });
  });

  it('attaches to the B3 apply’s existing instance, and a background change cascades the grant away', async () => {
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

    // No second instance was minted: the grant hangs off the B3 apply's own.
    expect(
      db.scalar(
        `SELECT COUNT(*) FROM character_source_instances
         WHERE character_id = ? AND source_type = 'background'
           AND parent_source_instance_id IS NULL`,
        [characterId],
      ),
    ).toBe(1);
    const granted = ownedWeapons(db, characterId).filter(
      (weapon) => weapon.source !== null,
    );
    expect(granted.length).toBeGreaterThan(0);
    expect(
      granted.every((weapon) => weapon.source === Number(existing)),
    ).toBe(true);

    // Changing the background through the record-only path hard-deletes the
    // marker-tagged instance tree; the composite FK's ON DELETE CASCADE must
    // take every row it granted with it — the D63-shaped orphan the marker
    // exists to prevent.
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
    expect(
      ownedWeapons(db, characterId).filter(
        (weapon) => weapon.source !== null,
      ),
    ).toEqual([]);
  });
});

describe('equipment provenance through a share link (E-SHARE)', () => {
  it('a v6 round trip preserves which source granted each row, for a character who switched options once', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Skye');
    handAddWeapon(db, characterId, 'Longbow');
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'b',
    });

    // Through the real fragment, exactly as a link travels.
    const decoded = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(db, characterId)),
    );
    const imported = importCharacterShare(db, decoded);
    const cloneClassSource = classSourceInstanceId(db, imported.characterId);

    // The hand-added Longbow arrives NULL-sourced even though the switched-to
    // option grants one of the same name; the three granted weapons and the
    // granted armour all point at the CLONE's own class source. This is the
    // fixture E-SHARE demands: without the switch, stale option-A rows would
    // make the round trip pass for the wrong reason.
    expect(ownedWeapons(db, imported.characterId)).toEqual([
      { name: 'Longbow', source: null },
      { name: 'Longbow', source: cloneClassSource },
      { name: 'Scimitar', source: cloneClassSource },
      { name: 'Shortsword', source: cloneClassSource },
    ]);
    expect(ownedArmor(db, imported.characterId)).toEqual([
      { name: 'Studded Leather Armor', source: cloneClassSource },
    ]);
    // The recorded CHOICE travelled too, in the source's own config — an
    // imported clone that lost it would regress to equipment-incomplete
    // the moment E-B starts reading it (§2's D62 argument).
    expect(recordedChoice(db, cloneClassSource)).toEqual({
      kind: 'class',
      option: 'b',
    });
  });
});

describe('equipment provenance through the portable backup (E-A)', () => {
  it('a full import REMAPS the stamp onto the clone’s own source instance', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Hild');
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });
    handAddWeapon(db, characterId, 'Family Blade');

    const document = exportCharacterBackup(db, characterId);
    const clone = importCharacterBackup(db, document);
    expect(clone.characterId).not.toBe(characterId);

    const cloneClassSource = classSourceInstanceId(db, clone.characterId);
    const originalClassSource = classSourceInstanceId(db, characterId);
    expect(cloneClassSource).not.toBe(originalClassSource);
    const weapons = ownedWeapons(db, clone.characterId);
    // The hand-added row keeps its NULL; every granted row points at the
    // CLONE's class source — not the original's, which the composite FK
    // would refuse (D62's import-as-clone, §2's named line item).
    expect(
      weapons.find((weapon) => weapon.name === 'Family Blade')?.source,
    ).toBeNull();
    expect(
      weapons
        .filter((weapon) => weapon.name !== 'Family Blade')
        .every((weapon) => weapon.source === cloneClassSource),
    ).toBe(true);
    expect(ownedArmor(db, clone.characterId)).toEqual([
      { name: 'Chain Mail', source: cloneClassSource },
    ]);
  });

  it('a full import REFUSES a weapon or armour stamp the document does not describe', async () => {
    const db = (await applicationDatabase()).context.db;
    const { characterId, contentKey } = createWithClass(db, 'Fighter', 'Iva');
    applyEquipmentPackageChoice(db, {
      character_id: characterId,
      content_key: contentKey,
      kind: 'class',
      option: 'a',
    });
    const document = exportCharacterBackup(db, characterId);
    const tampered = JSON.parse(JSON.stringify(document)) as {
      tables: {
        character_weapons: { source_instance_id: unknown }[];
        character_armor: { source_instance_id: unknown }[];
      };
    };
    for (const row of tampered.tables.character_weapons) {
      if (row.source_instance_id !== null) {
        row.source_instance_id = 999_999;
      }
    }
    expect(() => importCharacterBackup(db, tampered)).toThrow(
      BackupValidationError,
    );
    expect(() => importCharacterBackup(db, tampered)).toThrow(
      /weapon source is missing/,
    );

    const armorTampered = JSON.parse(JSON.stringify(document)) as {
      tables: { character_armor: { source_instance_id: unknown }[] };
    };
    for (const row of armorTampered.tables.character_armor) {
      row.source_instance_id = 999_999;
    }
    expect(() => importCharacterBackup(db, armorTampered)).toThrow(
      /armor source is missing/,
    );
  });
});
