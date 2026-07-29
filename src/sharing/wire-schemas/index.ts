import { WIRE_SCHEMA_V1 } from './v1';
import { WIRE_SCHEMA_V2 } from './v2';
import { WIRE_SCHEMA_V3 } from './v3';
import { WIRE_SCHEMA_V4 } from './v4';
import { WIRE_SCHEMA_V5 } from './v5';
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
export const CURRENT_CHARACTER_SHARE_VERSION = 5 as const;

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
 * ADJACENT means each migration lifts exactly one version step; the decoder
 * composes them, so a v1 document runs 1→2, then 2→3, then 3→4, then 4→5 —
 * where every pre-v5 document is retired by the deliberate throw above.
 */
export const MIGRATIONS = Object.freeze({
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
  4: migrateV4ToV5,
}) satisfies AdjacentMigrations;

export { WIRE_SCHEMA_V1 } from './v1';
export { WIRE_SCHEMA_V2 } from './v2';
export { WIRE_SCHEMA_V3 } from './v3';
export { WIRE_SCHEMA_V4 } from './v4';
export { WIRE_SCHEMA_V5 } from './v5';
export type { WireField, WireSchemaV1 } from './v1';
export type { WireSchemaV2 } from './v2';
export type { WireSchemaV3 } from './v3';
export type { WireSchemaV4 } from './v4';
export type { WireSchemaV5 } from './v5';
