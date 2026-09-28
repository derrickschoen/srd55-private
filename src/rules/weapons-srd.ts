/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * SEEDS THE WEAPON CATALOG AND THE CLASS WEAPON-MASTERY ROWS.
 *
 * The 38 templates and the mastery progressions are parsed from
 * `docs/srd/source/weapons-table.txt` and `weapon-mastery-progression.txt` AT
 * BUILD TIME by `weapons-srd-reader.ts` and read here from the generated
 * artifact (`generated/weapons-srd.ts`, written by `npm run srd:artifacts`).
 * This module imports no SRD text; everything it writes comes from that parse.
 */
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import type { WeaponMasteryGrant } from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import { deepFreeze } from '../domain/deep-freeze';
import { FrozenMap } from '../domain/frozen-map';
import {
  recordedContentKeys,
  type RecordedContentKey,
} from '../domain/recorded-content-keys';
import type {
  VersatileWeaponDamage,
  WeaponDamageAmount,
} from '../domain/weapon-damage';
import {
  BUNDLED_WEAPON_RULES_EDITION,
  SrdExtractError,
  type SrdMasteryProgression,
  type SrdWeaponTemplate,
} from './weapons-srd-reader';
import {
  BUNDLED_SRD_WEAPONS,
  type BundledSrdWeaponContentKeyText,
} from './generated/weapons-srd';

/** A bundled weapon's key: one the build recorded, earned as a `ContentKey`. */
export type BundledWeaponContentKey =
  RecordedContentKey<BundledSrdWeaponContentKeyText>;

/** A bundled weapon template, keyed by a bundled weapon key. */
export type BundledWeaponTemplate = SrdWeaponTemplate<BundledWeaponContentKey>;

const WEAPON_KEYS = recordedContentKeys(
  'weapon',
  BUNDLED_SRD_WEAPONS.templates.map((template) => template.content_key),
);

/** Mints a bundled weapon key; refuses a key the build did not record. */
export function bundledWeaponContentKey(value: string): BundledWeaponContentKey {
  return WEAPON_KEYS.key(value);
}

const TEMPLATES: readonly BundledWeaponTemplate[] = deepFreeze(
  BUNDLED_SRD_WEAPONS.templates.map((template) => ({
    ...template,
    content_key: bundledWeaponContentKey(template.content_key),
  })),
);

/** A Weapon Mastery column as the runtime hands it out: its counts a {@link FrozenMap}. */
export interface BundledMasteryProgression extends SrdMasteryProgression {
  readonly counts: FrozenMap<number, number>;
}

const MASTERY_PROGRESSIONS: readonly BundledMasteryProgression[] = Object.freeze(
  BUNDLED_SRD_WEAPONS.mastery_progressions.map((progression) => Object.freeze({
    class_name: progression.class_name,
    counts: new FrozenMap<number, number>(
      progression.counts.map((count, index) => [index + 1, count] as const),
    ),
  })),
);

/** Every class's parsed Weapon Mastery column, level to count. */
export function bundledWeaponMasteryProgressions(): readonly BundledMasteryProgression[] {
  return MASTERY_PROGRESSIONS;
}

/**
 * THE CLASSES THAT GRANT WEAPON MASTERY, AND WHAT WE HOLD FOR EACH.
 *
 * `counts_known` is asserted by the PARSE, not by this table: a class listed
 * here as `counts_known` whose table is absent from the extract makes the
 * seeder throw. `counts_unsourced` is the honest record of a gap — the class
 * grants the feature and its numbers are not in `docs/srd/source/`.
 *
 * PALADIN, RANGER AND ROGUE ARE `counts_unsourced`, AND THE REASON HAS CHANGED
 * ONCE ALREADY — read this before promoting them.
 *
 * Their counts are stated in level-1 feature PROSE rather than in a table
 * column. When this module was written no such extract existed in the
 * repository at all. One has since appeared:
 * `docs/srd/source/weapon-mastery-flat-classes.txt`. This module deliberately
 * does NOT read it, for two reasons that are worth stating rather than
 * assuming:
 *
 *  1. It is prose, not a column. The number is the English word "two" inside a
 *     sentence, in a two-column page layout that interleaves unrelated text
 *     from the neighbouring column. Extracting a number from that is a
 *     different and much weaker provenance chain than reading a table cell, and
 *     it needs its own design and its own negative controls.
 *  2. Promoting them is a CONTENT decision with a reviewable diff of its own.
 *     Folding it into the commit that ships weapons would mean "we shipped
 *     weapons" and "we started trusting a prose parse for three classes" land
 *     as one change that a reviewer must accept or reject together.
 *
 * Until that lands, the honest answer is the one the UI already gives: the
 * class grants Weapon Mastery and this application does not hold its number.
 * Writing `2` here because it is almost certainly right is the precise failure
 * the provenance record exists to prevent.
 */
export const WEAPON_MASTERY_GRANTS: Readonly<
  Record<string, Exclude<WeaponMasteryGrant, 'not_granted'>>
> = Object.freeze({
  Barbarian: 'counts_known',
  Fighter: 'counts_known',
  Paladin: 'counts_unsourced',
  Ranger: 'counts_unsourced',
  Rogue: 'counts_unsourced',
});

function assertRow(table: 'weapon_templates', row: Record<string, unknown>): void;
function assertRow(
  table: 'class_weapon_mastery_grants' | 'class_weapon_mastery_counts',
  row: Record<string, unknown>,
): void;
function assertRow(
  table:
    | 'weapon_templates'
    | 'class_weapon_mastery_grants'
    | 'class_weapon_mastery_counts',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new SrdExtractError(error);
  }
}

/**
 * The parsed templates, shared and deeply frozen. Their number is read from the
 * parse rather than pinned to a literal here — the literal that matters lives
 * in the TEST, where a human counted the four groups of the source table by
 * hand.
 */
export function bundledWeaponTemplates(): readonly BundledWeaponTemplate[] {
  return TEMPLATES;
}

function sqlBool(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * True when every parsed template is present and every class carries its grant
 * row. Counted rather than merely existence-checked, for the same reason
 * `hasBundledClassContent` counts progression rows: a database holding the 38
 * keys with no mastery content is broken, and a key-only guard would call it
 * healthy and never repair it.
 */
export function hasBundledWeaponContent(db: DatabaseContext): boolean {
  const templates = bundledWeaponTemplates();
  const placeholders = templates.map(() => '?').join(', ');
  const present = Number(
    db.scalar<number>(
      `SELECT count(*) FROM weapon_templates WHERE content_key IN (${placeholders})`,
      templates.map((template) => template.content_key),
    ) ?? 0,
  );
  if (present !== templates.length) {
    return false;
  }
  const grantedClasses = Object.keys(WEAPON_MASTERY_GRANTS);
  const grantRows = Number(
    db.scalar<number>(
      `SELECT count(*) FROM class_weapon_mastery_grants`,
    ) ?? 0,
  );
  // One row per SEEDED class, granting or not — a class with no row resolves to
  // `content_missing`, which the UI shows rather than hiding behind a zero.
  const classCount = Number(
    db.scalar<number>('SELECT count(*) FROM class_definitions') ?? 0,
  );
  if (classCount === 0 || grantRows < classCount) {
    return false;
  }
  const countRows = Number(
    db.scalar<number>('SELECT count(*) FROM class_weapon_mastery_counts') ?? 0,
  );
  const known = grantedClasses.filter(
    (name) => WEAPON_MASTERY_GRANTS[name] === 'counts_known',
  );
  return countRows >= known.length * 20;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledWeaponContent(db: DatabaseContext): boolean {
  if (hasBundledWeaponContent(db)) {
    return false;
  }
  seedWeaponContent(db);
  return true;
}

export function seedWeaponContent(db: DatabaseContext): void {
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    seedWeaponTemplates(db, timestamp);
    seedWeaponMastery(db, timestamp);
  });
}

function seedWeaponTemplates(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledWeaponTemplates()) {
    ensureBundledStableContentIdentity(db, {
      kind: 'weapon',
      contentKey: template.content_key,
      normalizedName: normalizeContentIdentityName(template.name),
    });
    const damage = damageColumnValues(template.damage);
    const versatile = damageColumnValues(template.versatile_damage);
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_WEAPON_RULES_EDITION,
      name: template.name,
      srd_group: template.srd_group,
      damage_kind: damage.kind,
      damage_dice: damage.dice,
      damage_flat: damage.flat,
      damage_custom: damage.custom,
      damage_type: template.damage_type,
      versatile_damage_kind: versatile.kind,
      versatile_damage_dice: versatile.dice,
      versatile_damage_flat: versatile.flat,
      versatile_damage_custom: versatile.custom,
      finesse: sqlBool(template.finesse),
      heavy: sqlBool(template.heavy),
      light: sqlBool(template.light),
      loading: sqlBool(template.loading),
      reach: sqlBool(template.reach),
      thrown: sqlBool(template.thrown),
      two_handed: sqlBool(template.two_handed),
      ammunition: sqlBool(template.ammunition),
      ammunition_kind: template.ammunition_kind,
      range_kind: template.range.kind,
      range_near_feet:
        template.range.kind === 'ranged' ? template.range.near_feet : null,
      range_far_feet:
        template.range.kind === 'ranged' ? template.range.far_feet : null,
      mastery_property: template.mastery_property,
      other_properties: template.other_properties,
      created_at: timestamp,
      updated_at: timestamp,
    };
    // The parser is the writer here, so its output is checked against the row
    // contract before it becomes a catalog row. A mis-parse fails the seed
    // instead of producing 38 plausible-looking wrong entries.
    assertRow('weapon_templates', { id: 1, ...row });

    db.exec(
      `INSERT INTO weapon_templates (
         content_key, rules_edition, name, srd_group,
         damage_kind, damage_dice, damage_flat, damage_custom, damage_type,
         versatile_damage_kind, versatile_damage_dice, versatile_damage_flat,
         versatile_damage_custom, finesse, heavy, light, loading, reach, thrown,
         two_handed, ammunition, ammunition_kind, range_kind,
         range_near_feet, range_far_feet, mastery_property, other_properties,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_key) DO UPDATE SET
         rules_edition = excluded.rules_edition,
         name = excluded.name,
         srd_group = excluded.srd_group,
         damage_kind = excluded.damage_kind,
         damage_dice = excluded.damage_dice,
         damage_flat = excluded.damage_flat,
         damage_custom = excluded.damage_custom,
         damage_type = excluded.damage_type,
         versatile_damage_kind = excluded.versatile_damage_kind,
         versatile_damage_dice = excluded.versatile_damage_dice,
         versatile_damage_flat = excluded.versatile_damage_flat,
         versatile_damage_custom = excluded.versatile_damage_custom,
         finesse = excluded.finesse,
         heavy = excluded.heavy,
         light = excluded.light,
         loading = excluded.loading,
         reach = excluded.reach,
         thrown = excluded.thrown,
         two_handed = excluded.two_handed,
         ammunition = excluded.ammunition,
         ammunition_kind = excluded.ammunition_kind,
         range_kind = excluded.range_kind,
         range_near_feet = excluded.range_near_feet,
         range_far_feet = excluded.range_far_feet,
         mastery_property = excluded.mastery_property,
         other_properties = excluded.other_properties,
         updated_at = excluded.updated_at`,
      [
        row.content_key,
        row.rules_edition,
        row.name,
        row.srd_group,
        row.damage_kind,
        row.damage_dice,
        row.damage_flat,
        row.damage_custom,
        row.damage_type,
        row.versatile_damage_kind,
        row.versatile_damage_dice,
        row.versatile_damage_flat,
        row.versatile_damage_custom,
        row.finesse,
        row.heavy,
        row.light,
        row.loading,
        row.reach,
        row.thrown,
        row.two_handed,
        row.ammunition,
        row.ammunition_kind,
        row.range_kind,
        row.range_near_feet,
        row.range_far_feet,
        row.mastery_property,
        row.other_properties,
        row.created_at,
        row.updated_at,
      ],
    );
  }
}

function damageColumnValues(
  damage: WeaponDamageAmount | VersatileWeaponDamage,
): {
  readonly kind: WeaponDamageAmount['kind'] | 'not_applicable';
  readonly dice: string | null;
  readonly flat: number | null;
  readonly custom: string | null;
} {
  switch (damage.kind) {
    case 'dice':
      return { kind: damage.kind, dice: damage.dice, flat: null, custom: null };
    case 'flat':
      return { kind: damage.kind, dice: null, flat: damage.amount, custom: null };
    case 'custom':
      return { kind: damage.kind, dice: null, flat: null, custom: damage.text };
    case 'not_applicable':
      return { kind: damage.kind, dice: null, flat: null, custom: null };
  }
}

function seedWeaponMastery(db: DatabaseContext, timestamp: string): void {
  const progressions = new Map(
    MASTERY_PROGRESSIONS.map((progression) => [
      progression.class_name,
      progression.counts,
    ]),
  );
  for (const [name, grant] of Object.entries(WEAPON_MASTERY_GRANTS)) {
    if (grant === 'counts_known' && !progressions.has(name)) {
      throw new SrdExtractError(
        `${name} is declared counts_known but has no table in the progression extract.`,
      );
    }
  }

  const classes = db.all(
    'SELECT id, name FROM class_definitions',
    undefined,
    (row) => ({ id: Number(row.id), name: String(row.name) }),
  );

  for (const definition of classes) {
    const grant: WeaponMasteryGrant =
      WEAPON_MASTERY_GRANTS[definition.name] ?? 'not_granted';
    assertRow('class_weapon_mastery_grants', {
      id: 1,
      class_definition_id: definition.id,
      grant,
      created_at: timestamp,
      updated_at: timestamp,
    });
    db.exec(
      `INSERT INTO class_weapon_mastery_grants (
         class_definition_id, grant, created_at, updated_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(class_definition_id) DO UPDATE SET
         grant = excluded.grant,
         updated_at = excluded.updated_at`,
      [definition.id, grant, timestamp, timestamp],
    );

    if (grant !== 'counts_known') {
      // NOTHING is written for an unsourced class. Not a zero, not a guess —
      // the grant row already says what we do and do not have.
      continue;
    }
    const counts = progressions.get(definition.name);
    /* c8 ignore next 3 -- guarded above; kept so a future edit cannot silently
       skip a counts_known class. */
    if (counts === undefined) {
      throw new SrdExtractError(`${definition.name} has no parsed counts.`);
    }
    for (const [level, count] of [...counts].sort(
      (left, right) => left[0] - right[0],
    )) {
      assertRow('class_weapon_mastery_counts', {
        id: 1,
        class_definition_id: definition.id,
        class_level: level,
        mastery_count: count,
        created_at: timestamp,
        updated_at: timestamp,
      });
      db.exec(
        `INSERT INTO class_weapon_mastery_counts (
           class_definition_id, class_level, mastery_count, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(class_definition_id, class_level) DO UPDATE SET
           mastery_count = excluded.mastery_count,
           updated_at = excluded.updated_at`,
        [definition.id, level, count, timestamp, timestamp],
      );
    }
  }
}
