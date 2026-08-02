import { WIRE_SCHEMA_V1 } from './v1';
import { WIRE_SCHEMA_V2 } from './v2';
import { WIRE_SCHEMA_V3 } from './v3';
import { WIRE_SCHEMA_V4 } from './v4';
import { WIRE_SCHEMA_V5 } from './v5';
import { WIRE_SCHEMA_V6 } from './v6';
import { WIRE_SCHEMA_V7 } from './v7';
import { WIRE_SCHEMA_V8 } from './v8';
import { WIRE_SCHEMA_V9 } from './v9';
import { WIRE_SCHEMA_V10 } from './v10';
import { WIRE_SCHEMA_V11 } from './v11';
import { WIRE_SCHEMA_V12 } from './v12';
import { WIRE_SCHEMA_V13 } from './v13';
import { WIRE_SCHEMA_V14 } from './v14';
import { WIRE_SCHEMA_V15 } from './v15';
import { WIRE_SCHEMA_V16 } from './v16';
import { WIRE_SCHEMA_V17 } from './v17';
import {
  versatileWeaponDamageFromLegacy,
  weaponDamageFromLegacy,
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../../domain/weapon-damage';
import {
  weaponRangeFromV1Pair,
  type WeaponRange,
} from '../../domain/weapon-range';

/**
 * Any change to tuple field order, meaning, membership, or accepted value
 * domain requires a new schema version, an adjacent migration, and a
 * hand-frozen fragment fixture. Never edit an existing version.
 */
export const CURRENT_CHARACTER_SHARE_VERSION = 17 as const;

/**
 * Any change to tuple field order, meaning, membership, or accepted value
 * domain requires a new schema version, an adjacent migration, and a
 * hand-frozen fragment fixture. Never edit an existing version.
 */
export const SHARE_SCHEMAS = Object.freeze({
  1: WIRE_SCHEMA_V1,
  2: WIRE_SCHEMA_V2,
  3: WIRE_SCHEMA_V3,
  4: WIRE_SCHEMA_V4,
  5: WIRE_SCHEMA_V5,
  6: WIRE_SCHEMA_V6,
  7: WIRE_SCHEMA_V7,
  8: WIRE_SCHEMA_V8,
  9: WIRE_SCHEMA_V9,
  10: WIRE_SCHEMA_V10,
  11: WIRE_SCHEMA_V11,
  12: WIRE_SCHEMA_V12,
  13: WIRE_SCHEMA_V13,
  14: WIRE_SCHEMA_V14,
  15: WIRE_SCHEMA_V15,
  16: WIRE_SCHEMA_V16,
  17: WIRE_SCHEMA_V17,
} as const);

export type SupportedShareVersion = keyof typeof SHARE_SCHEMAS;

type HistoricalVersion =
  Exclude<SupportedShareVersion, typeof CURRENT_CHARACTER_SHARE_VERSION>;

export type AdjacentMigrations = Readonly<{
  [Version in HistoricalVersion]: (
    document: unknown,
  ) => unknown;
}>;

function damageToWire(
  damage: WeaponDamage | VersatileWeaponDamage,
): readonly unknown[] {
  switch (damage.kind) {
    case 'dice':
      return ['dice', damage.dice];
    case 'flat':
      return ['flat', damage.amount];
    case 'custom':
      return ['custom', damage.text];
    case 'not_recorded':
      return ['not_recorded'];
    case 'not_applicable':
      return ['not_applicable'];
  }
}

function rangeToWire(range: WeaponRange): readonly unknown[] {
  switch (range.kind) {
    case 'none':
      return ['none'];
    case 'ranged':
    case 'legacy':
      return [range.kind, range.near_feet, range.far_feet];
  }
}

function v1WeaponToV2(value: unknown): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    !WIRE_SCHEMA_V1.tuples.weapon.variants.some(
      (variant) => variant.arity === value.length,
    )
  ) {
    throw new TypeError('wire weapon has an unsupported v1 tuple length.');
  }
  const normal = value[5];
  const long = value[6];
  if (
    (normal !== null && typeof normal !== 'number') ||
    (long !== null && typeof long !== 'number')
  ) {
    throw new TypeError('wire weapon v1 ranges must be integers or null.');
  }
  const range = weaponRangeFromV1Pair(normal, long);
  const hasTypedDamage = value.length === 22;
  const damage = hasTypedDamage
    ? value[20]
    : damageToWire(
        weaponDamageFromLegacy(
          value[1] === null ? null : String(value[1]),
        ),
      );
  const versatileDamage = hasTypedDamage
    ? value[21]
    : damageToWire(
        versatileWeaponDamageFromLegacy(
          value[3] === null ? null : String(value[3]),
        ),
      );
  return [
    ...value.slice(0, 5),
    rangeToWire(range),
    ...value.slice(7, 19),
    value.length >= 20 ? value[19] : null,
    damage,
    versatileDamage,
  ];
}

function migrateV1ToV2(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V1.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v1 tuple length.');
  }
  const character = document[2];
  if (
    !Array.isArray(character) ||
    !WIRE_SCHEMA_V1.tuples.character.arities.some(
      (arity) => arity === character.length,
    )
  ) {
    throw new TypeError('wire character has an unsupported v1 tuple length.');
  }
  const placeholders = character[10];
  const migratedCharacter = [
    ...character.slice(0, 10),
    character.length === 12 ? character[11] : null,
  ];
  const paddedRoot = [
    ...document,
    ...Array.from(
      { length: WIRE_SCHEMA_V1.tuples.root.fields.length - document.length },
      () => null,
    ),
  ];
  const weapons = paddedRoot[11];
  if (weapons !== null && !Array.isArray(weapons)) {
    throw new TypeError('wire weapons must be null or a list.');
  }
  return [
    paddedRoot[0],
    2,
    migratedCharacter,
    ...paddedRoot.slice(3, 11),
    weapons === null ? null : weapons.map(v1WeaponToV2),
    ...paddedRoot.slice(12),
    placeholders,
  ];
}

/**
 * The v2→v3 migration is the null-pad the appended-field rule promises: a v2
 * character tuple could not carry `ability_allocation_method`, so it arrives
 * as null — which decodes to an absent optional field, which imports as NULL,
 * the never-allocated state. Nothing else in the document moves. The version
 * slot is rewritten to 3 because the decoder validates the root version.
 */
function migrateV2ToV3(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V2.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v2 tuple length.');
  }
  const character = document[2];
  if (
    !Array.isArray(character) ||
    !WIRE_SCHEMA_V2.tuples.character.arities.some(
      (arity) => arity === character.length,
    )
  ) {
    throw new TypeError('wire character has an unsupported v2 tuple length.');
  }
  return [
    document[0],
    3,
    [...character, null],
    ...document.slice(3),
  ];
}

/**
 * The v3→v4 migration is the appended-field null-pad, applied per EFFECT
 * tuple this time rather than to the character: a v3 effect could not carry
 * the `ability_increase` payload, so its three appended slots arrive as null —
 * which decode drops as absent optional fields. Correct unconditionally,
 * because no v3 document can carry the kind that needs them (the kind did not
 * exist). Nothing else in the document moves. The version slot is rewritten to
 * 4 because the decoder validates the root version.
 */
function migrateV3ToV4(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V3.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v3 tuple length.');
  }
  const effectsIndex = WIRE_SCHEMA_V3.tuples.root.fields.findIndex(
    (field) => field.key === 'effects',
  );
  const effects = document[effectsIndex];
  if (effects !== null && !Array.isArray(effects)) {
    throw new TypeError('wire effects must be null or a list.');
  }
  const migratedEffects =
    effects === null
      ? null
      : effects.map((effect: unknown) => {
          if (
            !Array.isArray(effect) ||
            !WIRE_SCHEMA_V3.tuples.effect.arities.some(
              (arity) => arity === effect.length,
            )
          ) {
            throw new TypeError(
              'wire effect has an unsupported v3 tuple length.',
            );
          }
          return [...effect, null, null, null];
        });
  const migrated = [...document];
  migrated[1] = 4;
  migrated[effectsIndex] = migratedEffects;
  return migrated;
}

/**
 * THE RETIREMENT REFUSAL — pre-v5 share documents are RETIRED, not migrated
 * (plan §3.2, D60).
 *
 * Its own named error class so the import surface can tell "this link is from
 * before the provenance model and was deliberately retired" apart from "this
 * link is malformed" without string-matching a message.
 */
export class ShareWireRetirementError extends TypeError {
  constructor() {
    super(
      'Share links from before version 5 are no longer supported: they ' +
        'carry skills as bare names with no record of where each came ' +
        'from, and inventing that attribution would corrupt the character.',
    );
    this.name = 'ShareWireRetirementError';
  }
}

/**
 * v4→v5 EXISTS AND DELIBERATELY THROWS (plan §3.2). The registry's
 * `AdjacentMigrations` type requires a function for every historical version
 * and D41 mandates one per bump, so "refused" cannot mean "omitted" — it
 * would not compile. A v4 document's `skillProficiencies` is a bare string
 * list: no source, no grant key, no ordinal. Migrating it would mean
 * fabricating provenance, and D60 says v1 has zero users and zero exports, so
 * the honest move is a sentence. Every composed pre-v5 path (1→…→4→5) funnels
 * through this throw; the frozen v1–v4 schemas and their fragment fixtures
 * stay untouched — the alternative, dropping v1–v4 from `SHARE_SCHEMAS`, was
 * considered and rejected because it deletes the only proof those schemas
 * still decode.
 */
function migrateV4ToV5(_document: unknown): unknown {
  throw new ShareWireRetirementError();
}

/**
 * The v5→v6 migration is the appended-field null-pad, applied to every WEAPON
 * tuple and every ARMOR tuple: a v5 document predates equipment minting, so
 * its rows could only have been put there by a person, and a null `sourceRef`
 * is the literal truth of that — NOT a fabrication and NOT a retirement (the
 * pre-v5 debate is settled and does not reopen here; see `./v6.ts`). Armour
 * lives inside the SHEET tuple, so the pad reaches through it. Nothing else in
 * the document moves. The version slot is rewritten to 6 because the decoder
 * validates the root version.
 */
function migrateV5ToV6(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V5.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v5 tuple length.');
  }
  const weaponsIndex = WIRE_SCHEMA_V5.tuples.root.fields.findIndex(
    (field) => field.key === 'weapons',
  );
  const sheetIndex = WIRE_SCHEMA_V5.tuples.root.fields.findIndex(
    (field) => field.key === 'sheet',
  );
  const weapons = document[weaponsIndex];
  if (weapons !== null && !Array.isArray(weapons)) {
    throw new TypeError('wire weapons must be null or a list.');
  }
  const migratedWeapons =
    weapons === null
      ? null
      : weapons.map((weapon: unknown) => {
          if (
            !Array.isArray(weapon) ||
            !WIRE_SCHEMA_V5.tuples.weapon.variants.some(
              (variant) => variant.arity === weapon.length,
            )
          ) {
            throw new TypeError(
              'wire weapon has an unsupported v5 tuple length.',
            );
          }
          return [...weapon, null];
        });
  const sheet = document[sheetIndex];
  let migratedSheet = sheet;
  if (sheet !== null) {
    if (
      !Array.isArray(sheet) ||
      !WIRE_SCHEMA_V5.tuples.sheet.arities.some(
        (arity) => arity === sheet.length,
      )
    ) {
      throw new TypeError('wire sheet has an unsupported v5 tuple length.');
    }
    const armorIndex = WIRE_SCHEMA_V5.tuples.sheet.fields.findIndex(
      (field) => field.key === 'armor',
    );
    const armor = sheet[armorIndex];
    if (armor !== null && !Array.isArray(armor)) {
      throw new TypeError('wire armor must be null or a list.');
    }
    const migratedArmor =
      armor === null
        ? null
        : armor.map((row: unknown) => {
            if (
              !Array.isArray(row) ||
              !WIRE_SCHEMA_V5.tuples.armor.arities.some(
                (arity) => arity === row.length,
              )
            ) {
              throw new TypeError(
                'wire armor has an unsupported v5 tuple length.',
              );
            }
            return [...row, null];
          });
    const rewrittenSheet = [...sheet];
    rewrittenSheet[armorIndex] = migratedArmor;
    migratedSheet = rewrittenSheet;
  }
  const migrated = [...document];
  migrated[1] = 6;
  migrated[weaponsIndex] = migratedWeapons;
  migrated[sheetIndex] = migratedSheet;
  return migrated;
}

/**
 * The v6→v7 migration DROPS the appended `sourceRef` slot from every WEAPON
 * tuple (22 → 21) and every ARMOR tuple (10 → 9) — the inverse of the 5→6
 * null-pad, and the wire form of owner ruling D69: weapons carry no
 * provenance, so a non-null value here is a datum the owner struck, not one
 * to preserve. The row itself survives as a plain row, which is exactly the
 * state D69 puts every weapon and armour row in. Armour lives inside the
 * SHEET tuple, so the drop reaches through it. Nothing else in the document
 * moves. The version slot is rewritten to 7 because the decoder validates
 * the root version.
 */
function migrateV6ToV7(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V6.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v6 tuple length.');
  }
  const weaponsIndex = WIRE_SCHEMA_V6.tuples.root.fields.findIndex(
    (field) => field.key === 'weapons',
  );
  const sheetIndex = WIRE_SCHEMA_V6.tuples.root.fields.findIndex(
    (field) => field.key === 'sheet',
  );
  const weapons = document[weaponsIndex];
  if (weapons !== null && !Array.isArray(weapons)) {
    throw new TypeError('wire weapons must be null or a list.');
  }
  const migratedWeapons =
    weapons === null
      ? null
      : weapons.map((weapon: unknown) => {
          if (
            !Array.isArray(weapon) ||
            !WIRE_SCHEMA_V6.tuples.weapon.variants.some(
              (variant) => variant.arity === weapon.length,
            )
          ) {
            throw new TypeError(
              'wire weapon has an unsupported v6 tuple length.',
            );
          }
          return weapon.slice(0, -1);
        });
  const sheet = document[sheetIndex];
  let migratedSheet = sheet;
  if (sheet !== null) {
    if (
      !Array.isArray(sheet) ||
      !WIRE_SCHEMA_V6.tuples.sheet.arities.some(
        (arity) => arity === sheet.length,
      )
    ) {
      throw new TypeError('wire sheet has an unsupported v6 tuple length.');
    }
    const armorIndex = WIRE_SCHEMA_V6.tuples.sheet.fields.findIndex(
      (field) => field.key === 'armor',
    );
    const armor = sheet[armorIndex];
    if (armor !== null && !Array.isArray(armor)) {
      throw new TypeError('wire armor must be null or a list.');
    }
    const migratedArmor =
      armor === null
        ? null
        : armor.map((row: unknown) => {
            if (
              !Array.isArray(row) ||
              !WIRE_SCHEMA_V6.tuples.armor.arities.some(
                (arity) => arity === row.length,
              )
            ) {
              throw new TypeError(
                'wire armor has an unsupported v6 tuple length.',
              );
            }
            return row.slice(0, -1);
          });
    const rewrittenSheet = [...sheet];
    rewrittenSheet[armorIndex] = migratedArmor;
    migratedSheet = rewrittenSheet;
  }
  const migrated = [...document];
  migrated[1] = 7;
  migrated[weaponsIndex] = migratedWeapons;
  migrated[sheetIndex] = migratedSheet;
  return migrated;
}

/**
 * The v7→v8 migration is the appended-field null-pad, applied TWICE over: to
 * every EFFECT tuple (5 new trailing nulls, the identical shape v3→v4's
 * `ability_increase` append used) and to the ROOT itself (a trailing null for
 * the new `items` list — no pre-v8 document could carry one). Nothing else in
 * the document moves. The version slot is rewritten to 8 because the decoder
 * validates the root version.
 */
function migrateV7ToV8(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V7.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v7 tuple length.');
  }
  const effectsIndex = WIRE_SCHEMA_V7.tuples.root.fields.findIndex(
    (field) => field.key === 'effects',
  );
  const effects = document[effectsIndex];
  if (effects !== null && !Array.isArray(effects)) {
    throw new TypeError('wire effects must be null or a list.');
  }
  const migratedEffects =
    effects === null
      ? null
      : effects.map((effect: unknown) => {
          if (
            !Array.isArray(effect) ||
            !WIRE_SCHEMA_V7.tuples.effect.arities.some(
              (arity) => arity === effect.length,
            )
          ) {
            throw new TypeError(
              'wire effect has an unsupported v7 tuple length.',
            );
          }
          return [...effect, null, null, null, null, null];
        });
  const migrated = [...document, null];
  migrated[1] = 8;
  migrated[effectsIndex] = migratedEffects;
  return migrated;
}

/**
 * V8 predates effect ownership, generated-row identity, and the generated-only
 * source marker. All four additions are nullable, so the adjacent migration is
 * an exact append-only null pad: one slot per source and three per effect.
 */
function migrateV8ToV9(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V8.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v8 tuple length.');
  }
  const sourcesIndex = WIRE_SCHEMA_V8.tuples.root.fields.findIndex(
    (field) => field.key === 'sources',
  );
  const effectsIndex = WIRE_SCHEMA_V8.tuples.root.fields.findIndex(
    (field) => field.key === 'effects',
  );
  const sources = document[sourcesIndex];
  const effects = document[effectsIndex];
  if (!Array.isArray(sources)) {
    throw new TypeError('wire sources must be a list.');
  }
  if (effects !== null && !Array.isArray(effects)) {
    throw new TypeError('wire effects must be null or a list.');
  }
  const migrated = [...document];
  migrated[1] = 9;
  migrated[sourcesIndex] = sources.map((source: unknown) => {
    if (
      !Array.isArray(source) ||
      !WIRE_SCHEMA_V8.tuples.source.arities.some(
        (arity) => arity === source.length,
      )
    ) {
      throw new TypeError('wire source has an unsupported v8 tuple length.');
    }
    return [...source, null];
  });
  migrated[effectsIndex] =
    effects === null
      ? null
      : effects.map((effect: unknown) => {
          if (
            !Array.isArray(effect) ||
            !WIRE_SCHEMA_V8.tuples.effect.arities.some(
              (arity) => arity === effect.length,
            )
          ) {
            throw new TypeError(
              'wire effect has an unsupported v8 tuple length.',
            );
          }
          return [...effect, null, null, null];
        });
  return migrated;
}

/**
 * V9's fourth SHEET field is the retired manual Armor Class adjustment. V10
 * removes that field and carries its non-zero value through the one effect
 * vocabulary instead. The old row has no provenance, item, weapon or template
 * owner, so all four ownership slots remain null and the resolver ranks it as
 * manual. A zero value — including zero with a note — deliberately appends
 * nothing.
 */
function migrateV9ToV10(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V9.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v9 tuple length.');
  }
  const sheetIndex = WIRE_SCHEMA_V9.tuples.root.fields.findIndex(
    (field) => field.key === 'sheet',
  );
  const effectsIndex = WIRE_SCHEMA_V9.tuples.root.fields.findIndex(
    (field) => field.key === 'effects',
  );
  const sheet = document[sheetIndex];
  const effects = document[effectsIndex];
  if (effects !== null && !Array.isArray(effects)) {
    throw new TypeError('wire effects must be null or a list.');
  }

  let migratedSheet = sheet;
  let migratedEffects = effects;
  if (sheet !== null) {
    if (
      !Array.isArray(sheet) ||
      !WIRE_SCHEMA_V9.tuples.sheet.arities.some(
        (arity) => arity === sheet.length,
      )
    ) {
      throw new TypeError('wire sheet has an unsupported v9 tuple length.');
    }
    const adjustmentIndex = WIRE_SCHEMA_V9.tuples.sheet.fields.findIndex(
      (field) => field.key === 'sheetAdjustment',
    );
    const adjustment = sheet[adjustmentIndex];
    migratedSheet = sheet.slice(0, adjustmentIndex);
    if (adjustment !== null) {
      if (
        !Array.isArray(adjustment) ||
        !WIRE_SCHEMA_V9.tuples.sheetAdjustment.arities.some(
          (arity) => arity === adjustment.length,
        )
      ) {
        throw new TypeError(
          'wire sheet adjustment has an unsupported v9 tuple length.',
        );
      }
      const amount = adjustment[0];
      const note = adjustment[1];
      if (
        !Number.isSafeInteger(amount) ||
        Number(amount) < -20 ||
        Number(amount) > 20
      ) {
        throw new TypeError(
          'wire sheet adjustment value must be an integer from -20 through 20.',
        );
      }
      if (note !== null && typeof note !== 'string') {
        throw new TypeError(
          'wire sheet adjustment note must be a string or null.',
        );
      }
      if (amount !== 0) {
        const effect: Record<string, unknown> = {
          kind: 'armor_class_bonus',
          label: note ?? 'Manual Armor Class adjustment',
          amount,
        };
        const effectTuple = WIRE_SCHEMA_V9.tuples.effect.fields.map(
          (field) => effect[field.key] ?? null,
        );
        migratedEffects = [
          ...(effects === null ? [] : effects),
          effectTuple,
        ];
      }
    }
  }

  const migrated = [...document];
  migrated[1] = 10;
  migrated[sheetIndex] = migratedSheet;
  migrated[effectsIndex] = migratedEffects;
  return migrated;
}

function migrateV10ToV11(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V10.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v10 tuple length.');
  }
  const itemsIndex = WIRE_SCHEMA_V10.tuples.root.fields.findIndex(
    (field) => field.key === 'items',
  );
  const items = document[itemsIndex];
  if (items !== null && !Array.isArray(items)) {
    throw new TypeError('wire items must be null or a list.');
  }
  const attunedRefs: number[] = [];
  const migratedItems =
    items === null
      ? null
      : items.map((item: unknown, index: number) => {
          if (
            !Array.isArray(item) ||
            !WIRE_SCHEMA_V10.tuples.item.arities.some(
              (arity) => arity === item.length,
            )
          ) {
            throw new TypeError(
              'wire item has an unsupported v10 tuple length.',
            );
          }
          if (item[3] === true && attunedRefs.length < 3) {
            attunedRefs.push(index);
          }
          return [item[0], item[1], item[2], item[4]];
        });
  const migrated = [
    ...document,
    attunedRefs.length === 0
      ? null
      : [
          attunedRefs[0] ?? null,
          attunedRefs[1] ?? null,
          attunedRefs[2] ?? null,
        ],
  ];
  migrated[1] = 11;
  migrated[itemsIndex] = migratedItems;
  return migrated;
}

function migrateV11ToV12(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V11.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v11 tuple length.');
  }
  const itemsIndex = WIRE_SCHEMA_V11.tuples.root.fields.findIndex(
    (field) => field.key === 'items',
  );
  const items = document[itemsIndex];
  if (items !== null && !Array.isArray(items)) {
    throw new TypeError('wire items must be null or a list.');
  }
  const migrated = [...document];
  migrated[1] = 12;
  migrated[itemsIndex] =
    items === null
      ? null
      : items.map((item: unknown) => {
          if (
            !Array.isArray(item) ||
            !WIRE_SCHEMA_V11.tuples.item.arities.some(
              (arity) => arity === item.length,
            )
          ) {
            throw new TypeError(
              'wire item has an unsupported v11 tuple length.',
            );
          }
          return [...item, 1];
        });
  return migrated;
}

const V12_EFFECT_KINDS = Object.freeze([
  'damage_resistance',
  'hp_modifier',
  'speed',
  'ability_increase',
  'armor_class_bonus',
  'armor_class_formula',
  'attack_ability_override',
  'weapon_attack_bonus',
  'weapon_damage_bonus',
] as const);

/**
 * v12→v13 changes no positions. It validates the frozen v12 accepted-value
 * domain before bumping the root version, so `ability_override` can first
 * appear in an honestly versioned v13 document rather than being smuggled
 * through a historical tuple with the same arity.
 */
function migrateV12ToV13(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V12.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v12 tuple length.');
  }
  const effectsIndex = WIRE_SCHEMA_V12.tuples.root.fields.findIndex(
    (field) => field.key === 'effects',
  );
  const versionIndex = WIRE_SCHEMA_V12.tuples.root.fields.findIndex(
    (field) => field.key === 'version',
  );
  const effectKindIndex = WIRE_SCHEMA_V12.tuples.effect.fields.findIndex(
    (field) => field.key === 'kind',
  );
  if (effectsIndex < 0 || versionIndex < 0 || effectKindIndex < 0) {
    throw new TypeError('wire v12 schema is missing a required field.');
  }
  const effects = document[effectsIndex];
  if (effects !== null && !Array.isArray(effects)) {
    throw new TypeError('wire effects must be null or a list.');
  }
  for (const effect of effects ?? []) {
    if (
      !Array.isArray(effect) ||
      !WIRE_SCHEMA_V12.tuples.effect.arities.some(
        (arity) => arity === effect.length,
      )
    ) {
      throw new TypeError('wire effect has an unsupported v12 tuple length.');
    }
    const effectKind = effect[effectKindIndex];
    if (
      typeof effectKind !== 'string' ||
      !V12_EFFECT_KINDS.includes(
        effectKind as (typeof V12_EFFECT_KINDS)[number],
      )
    ) {
      throw new TypeError('wire effect kind is unsupported in v12.');
    }
  }
  const migrated = [...document];
  migrated[versionIndex] = 13;
  return migrated;
}

/**
 * V13 had no acquisition-level field on a selection and represented a
 * spellbook as selected spell keys only. Null-padding is the only honest
 * selection migration. Each spellbook key becomes an address-less acquisition:
 * the spell survives, while provenance the old wire never recorded remains
 * absent rather than fabricated.
 */
function migrateV13ToV14(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V13.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v13 tuple length.');
  }
  const versionIndex = WIRE_SCHEMA_V13.tuples.root.fields.findIndex(
    (field) => field.key === 'version',
  );
  const selectionsIndex = WIRE_SCHEMA_V13.tuples.root.fields.findIndex(
    (field) => field.key === 'selections',
  );
  const spellbookIndex = WIRE_SCHEMA_V13.tuples.root.fields.findIndex(
    (field) => field.key === 'spellbook',
  );
  if (versionIndex < 0 || selectionsIndex < 0 || spellbookIndex < 0) {
    throw new TypeError('wire v13 schema is missing a required field.');
  }
  const selections = document[selectionsIndex];
  const spellbook = document[spellbookIndex];
  if (!Array.isArray(selections) || !Array.isArray(spellbook)) {
    throw new TypeError(
      'wire v13 selections and spellbook must be lists.',
    );
  }
  const migrated = [...document];
  migrated[versionIndex] = 14;
  migrated[selectionsIndex] = selections.map((selection: unknown) => {
    if (
      !Array.isArray(selection) ||
      !WIRE_SCHEMA_V13.tuples.selection.arities.some(
        (arity) => arity === selection.length,
      )
    ) {
      throw new TypeError(
        'wire selection has an unsupported v13 tuple length.',
      );
    }
    return [...selection, null];
  });
  migrated[spellbookIndex] = spellbook.map((spell: unknown) => [
    null,
    null,
    null,
    null,
    spell,
    null,
  ]);
  return migrated;
}

/**
 * V14 had no expertise section. The new root member is appended as null, which
 * decodes as absence without inventing grants the historical document could
 * not prove.
 */
function migrateV14ToV15(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V14.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v14 tuple length.');
  }
  const migrated = [...document, null];
  const versionIndex = WIRE_SCHEMA_V14.tuples.root.fields.findIndex(
    (field) => field.key === 'version',
  );
  if (versionIndex < 0) {
    throw new TypeError('wire v14 schema is missing the version field.');
  }
  migrated[versionIndex] = 15;
  return migrated;
}

/**
 * V15 had no durable level-feat occurrence section. Appending null preserves
 * absence: migration must never infer a feat choice from an older document.
 */
function migrateV15ToV16(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V15.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v15 tuple length.');
  }
  const migrated = [...document, null];
  const versionIndex = WIRE_SCHEMA_V15.tuples.root.fields.findIndex(
    (field) => field.key === 'version',
  );
  if (versionIndex < 0) {
    throw new TypeError('wire v15 schema is missing the version field.');
  }
  migrated[versionIndex] = 16;
  return migrated;
}

/** V16 predates root flavor text; the three appended absences are SQL NULL. */
function migrateV16ToV17(document: unknown): unknown {
  if (
    !Array.isArray(document) ||
    !WIRE_SCHEMA_V16.tuples.root.arities.some(
      (arity) => arity === document.length,
    )
  ) {
    throw new TypeError('wire document has an unsupported v16 tuple length.');
  }
  const character = document[2];
  if (
    !Array.isArray(character) ||
    !WIRE_SCHEMA_V16.tuples.character.arities.some(
      (arity) => arity === character.length,
    )
  ) {
    throw new TypeError('wire character has an unsupported v16 tuple length.');
  }
  const migrated = [...document];
  migrated[1] = 17;
  migrated[2] = [...character, null, null, null];
  return migrated;
}

/**
 * ADJACENT means each migration lifts exactly one version step; the decoder
 * composes them, so a v1 document runs 1→2, then 2→3, then 3→4, then 4→5 —
 * where every pre-v5 document is retired by the deliberate throw above — a
 * v5 document runs 5→6 (the null-pad) then 6→7, a v6 document runs 6→7, the
 * sourceRef drop, then 7→8. V8 appends equipment ownership in v9, and v9
 * retires the sheet adjustment into an effect in v10.
 */
export const MIGRATIONS = Object.freeze({
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
  4: migrateV4ToV5,
  5: migrateV5ToV6,
  6: migrateV6ToV7,
  7: migrateV7ToV8,
  8: migrateV8ToV9,
  9: migrateV9ToV10,
  10: migrateV10ToV11,
  11: migrateV11ToV12,
  12: migrateV12ToV13,
  13: migrateV13ToV14,
  14: migrateV14ToV15,
  15: migrateV15ToV16,
  16: migrateV16ToV17,
}) satisfies AdjacentMigrations;

export { WIRE_SCHEMA_V1 } from './v1';
export { WIRE_SCHEMA_V2 } from './v2';
export { WIRE_SCHEMA_V3 } from './v3';
export { WIRE_SCHEMA_V4 } from './v4';
export { WIRE_SCHEMA_V5 } from './v5';
export { WIRE_SCHEMA_V6 } from './v6';
export { WIRE_SCHEMA_V7 } from './v7';
export { WIRE_SCHEMA_V8 } from './v8';
export { WIRE_SCHEMA_V9 } from './v9';
export { WIRE_SCHEMA_V10 } from './v10';
export { WIRE_SCHEMA_V11 } from './v11';
export { WIRE_SCHEMA_V12 } from './v12';
export { WIRE_SCHEMA_V13 } from './v13';
export { WIRE_SCHEMA_V14 } from './v14';
export { WIRE_SCHEMA_V15 } from './v15';
export { WIRE_SCHEMA_V16 } from './v16';
export { WIRE_SCHEMA_V17 } from './v17';
export type { WireField, WireSchemaV1 } from './v1';
export type { WireSchemaV2 } from './v2';
export type { WireSchemaV14 } from './v14';
export type { WireSchemaV15 } from './v15';
export type { WireSchemaV16 } from './v16';
export type { WireSchemaV17 } from './v17';
export type { WireSchemaV3 } from './v3';
export type { WireSchemaV4 } from './v4';
export type { WireSchemaV5 } from './v5';
export type { WireSchemaV6 } from './v6';
export type { WireSchemaV7 } from './v7';
export type { WireSchemaV8 } from './v8';
export type { WireSchemaV9 } from './v9';
export type { WireSchemaV10 } from './v10';
export type { WireSchemaV11 } from './v11';
export type { WireSchemaV12 } from './v12';
export type { WireSchemaV13 } from './v13';
