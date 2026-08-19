/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { normalizeCatalogKeyComponent } from '../catalog/catalog-key';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import type { DatabaseContext } from '../db/database';
import { GrantRule, type GrantRuleObject } from '../grants/grant-rule';
import {
  BUNDLED_RULES_EDITION,
  classContentKey,
} from './class-progression-lookup';
import {
  parseSrdSubclasses,
  srdSubclassClassNames,
  type SrdSubclassDefinition,
  type SrdSubclassClassName,
} from './srd-subclasses';
import type { Ability } from '../domain/enums';
import type { CharacterLevel } from '../domain/enums';
import {
  HEADING_ONLY_DESCRIPTION,
  type HeadingOnlyDescription,
} from '../domain/subclass-feature-description';
import {
  parseSrdDraconicResilience,
  type SrdDraconicResilienceEffect,
} from './draconic-resilience-srd';

export type BundledSubclassGrantRulesShape =
  | 'json_text_or_null'
  | 'decoded_array';

const BUNDLED_SUBCLASS_GRANT_RULES_SHAPE_MESSAGES: Readonly<
  Record<BundledSubclassGrantRulesShape, string>
> = {
  json_text_or_null:
    'Bundled subclass grant rules must be JSON text or null.',
  decoded_array: 'Bundled subclass grant rules must decode to an array.',
};

export class BundledSubclassGrantRulesShapeError extends TypeError {
  override readonly name = 'BundledSubclassGrantRulesShapeError' as const;
  constructor(readonly expected: BundledSubclassGrantRulesShape) {
    super(BUNDLED_SUBCLASS_GRANT_RULES_SHAPE_MESSAGES[expected]);
  }
}

export class BundledSubclassPersistenceError extends Error {
  override readonly name = 'BundledSubclassPersistenceError' as const;
  constructor(readonly content_key: string) {
    super(`Failed to persist bundled subclass ${content_key}.`);
  }
}

export class SrdSubclassGrantRulesArrayError extends TypeError {
  override readonly name = 'SrdSubclassGrantRulesArrayError' as const;
  constructor(readonly subclass_content_key: string) {
    super(`SRD subclass ${subclass_content_key} grant rules are not an array.`);
  }
}

export class SrdSubclassMissingSpellError extends Error {
  override readonly name = 'SrdSubclassMissingSpellError' as const;
  constructor(
    readonly subclass_content_key: string,
    readonly spell_version_key: unknown,
  ) {
    super(
      `SRD subclass ${subclass_content_key} references missing spell ${String(spell_version_key)}.`,
    );
  }
}

export interface BundledSubclassFeatureHeading {
  readonly name: string;
  readonly class_level: CharacterLevel;
  /** Zero-based order across the whole subclass. */
  readonly sort_position: number;
}

export interface BundledSubclassFeature
  extends BundledSubclassFeatureHeading {
  readonly effects: readonly SrdDraconicResilienceEffect[];
}

export interface BundledSubclassSeed {
  readonly class_name: string;
  readonly subclass_name: string;
  readonly content_key: string;
  readonly spellcasting_ability: Ability | null;
  readonly features: readonly BundledSubclassFeature[];
  readonly grant_rules: readonly GrantRuleObject[] | null;
}

/**
 * Authoritative SRD class abilities for the inherit-parent subclass rows.
 *
 * These values intentionally do not come from the live parent row. SC-3 owns
 * the subclass aggregate, and a damaged class row must not become the source
 * of truth that repairs a subclass to the same damaged value.
 */
const SRD_SUBCLASS_SPELLCASTING_ABILITIES: Readonly<
  Record<SrdSubclassClassName, Ability | null>
> = Object.freeze({
  Barbarian: null,
  Bard: 'charisma',
  Cleric: 'wisdom',
  Druid: 'wisdom',
  Fighter: null,
  Monk: null,
  Paladin: 'charisma',
  Ranger: 'wisdom',
  Rogue: null,
  Sorcerer: 'charisma',
  Warlock: 'charisma',
  Wizard: 'intelligence',
});

export function subclassContentKey(name: string): string {
  return `${BUNDLED_RULES_EDITION}:subclass:${normalizeCatalogKeyComponent(name)}`;
}

function normalizedRuleObjects(
  rules: readonly unknown[],
): readonly GrantRuleObject[] {
  return Object.freeze(
    rules.map((rule) => Object.freeze(GrantRule.fromObject(rule).toObject())),
  );
}

function grantRulesFor(
  definition: SrdSubclassDefinition,
): readonly GrantRuleObject[] | null {
  const outcome = definition.mechanical_outcome;
  if (
    outcome.kind !== 'unconditional_fixed_spells' &&
    outcome.kind !== 'granted_feat_choice'
  ) {
    return null;
  }
  return normalizedRuleObjects(outcome.rule_set.rules);
}

let cachedSeeds: readonly BundledSubclassSeed[] | undefined;

function srdSubclassSeeds(): readonly BundledSubclassSeed[] {
  if (cachedSeeds !== undefined) {
    return cachedSeeds;
  }
  const manifest = parseSrdSubclasses();
  const draconicResilience = parseSrdDraconicResilience();
  cachedSeeds = Object.freeze(
    srdSubclassClassNames.map((className) => {
      const definition = manifest.by_class[className];
      return Object.freeze({
        class_name: definition.class_name,
        subclass_name: definition.subclass_name,
        content_key: subclassContentKey(definition.subclass_name),
        spellcasting_ability:
          SRD_SUBCLASS_SPELLCASTING_ABILITIES[className],
        features: Object.freeze(
          definition.features.map((feature) => Object.freeze({
            ...feature,
            effects:
              definition.class_name === draconicResilience.class_name &&
              definition.subclass_name === draconicResilience.subclass_name &&
              feature.class_level === draconicResilience.class_level &&
              feature.name === draconicResilience.name
                ? draconicResilience.effects
                : Object.freeze([]),
          })),
        ),
        grant_rules: grantRulesFor(definition),
      });
    }),
  );
  return cachedSeeds;
}

/** The twelve inherit-parent subclass keys derived from SC-2's manifest. */
export function bundledSrdSubclassDefinitionContentKeys(): readonly string[] {
  return Object.freeze(srdSubclassSeeds().map((seed) => seed.content_key));
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  }
  return value;
}

function encodedRules(rules: readonly GrantRuleObject[] | null): string | null {
  return rules === null ? null : JSON.stringify(canonicalValue(rules));
}

function normalizedStoredRules(value: unknown): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BundledSubclassGrantRulesShapeError('json_text_or_null');
  }
  const decoded: unknown = JSON.parse(value);
  if (!Array.isArray(decoded)) {
    throw new BundledSubclassGrantRulesShapeError('decoded_array');
  }
  return encodedRules(normalizedRuleObjects(decoded));
}

function sameDefinition(
  db: DatabaseContext,
  seed: BundledSubclassSeed,
): number | null {
  const row = db.oneRaw(
    `SELECT subclass.id, parent.content_key AS parent_content_key,
            subclass.name, subclass.rules_edition,
            subclass.spellcasting_ability,
            subclass.caster_fraction, subclass.caster_rounding,
            subclass.grant_rules, subclass.notes
       FROM subclass_definitions AS subclass
       JOIN class_definitions AS parent
         ON parent.id = subclass.class_definition_id
      WHERE subclass.content_key = ?`,
    [seed.content_key],
  );
  if (row === null) {
    return null;
  }
  let storedRules: string | null;
  try {
    storedRules = normalizedStoredRules(row.grant_rules);
  } catch {
    return null;
  }
  if (
    row.parent_content_key !== classContentKey(seed.class_name) ||
    row.name !== seed.subclass_name ||
    row.rules_edition !== BUNDLED_RULES_EDITION ||
    row.spellcasting_ability !== seed.spellcasting_ability ||
    row.caster_fraction !== null ||
    row.caster_rounding !== null ||
    row.notes !== null ||
    storedRules !== encodedRules(seed.grant_rules)
  ) {
    return null;
  }
  return Number(row.id);
}

function hasExactFeatures(
  db: DatabaseContext,
  subclassId: number,
  expected: readonly BundledSubclassFeature[],
): boolean {
  const stored = db.allRaw(
    `SELECT id, class_level, sort_order, name, description
       FROM subclass_features
      WHERE subclass_definition_id = ?
      ORDER BY sort_order`,
    [subclassId],
  );
  return (
    stored.length === expected.length &&
    stored.every((row, index) => {
      const feature = expected[index];
      if (
        feature === undefined ||
        row.class_level !== feature.class_level ||
        row.sort_order !== feature.sort_position + 1 ||
        row.name !== feature.name ||
        row.description !== HEADING_ONLY_DESCRIPTION
      ) {
        return false;
      }
      const effects = db.allRaw(
        `SELECT effect_kind, damage_type, hit_points_flat,
                hit_points_per_level, speed_bonus_feet, ability, amount,
                maximum, base, ability_1, ability_2, allows_shield,
                weapon_scope, attack_count, label, notes
           FROM subclass_feature_effects
          WHERE subclass_feature_id = ?
          ORDER BY sort_order`,
        [Number(row.id)],
      );
      return (
        effects.length === feature.effects.length &&
        effects.every((effect, effectIndex) => {
          const expectedEffect = feature.effects[effectIndex];
          return expectedEffect !== undefined &&
            sameBundledSubclassEffect(effect, expectedEffect);
        })
      );
    })
  );
}

function sameBundledSubclassEffect(
  row: Record<string, unknown>,
  effect: SrdDraconicResilienceEffect,
): boolean {
  const common =
    row['effect_kind'] === effect.kind &&
    row['damage_type'] === null &&
    row['speed_bonus_feet'] === null &&
    row['ability'] === null &&
    row['amount'] === null &&
    row['maximum'] === null &&
    row['weapon_scope'] === null &&
    row['attack_count'] === null &&
    row['label'] === effect.label &&
    row['notes'] === null;
  switch (effect.kind) {
    case 'hp_modifier':
      return common &&
        row['hit_points_flat'] === effect.hit_points_flat &&
        row['hit_points_per_level'] === effect.hit_points_per_level &&
        row['base'] === null &&
        row['ability_1'] === null &&
        row['ability_2'] === null &&
        row['allows_shield'] === null;
    case 'armor_class_formula':
      return common &&
        row['hit_points_flat'] === null &&
        row['hit_points_per_level'] === null &&
        row['base'] === effect.base &&
        row['ability_1'] === effect.ability_1 &&
        row['ability_2'] === effect.ability_2 &&
        row['allows_shield'] === Number(effect.allows_shield);
  }
}

/** Exact guard shared by every heading-only bundled subclass aggregate. */
export function hasBundledSubclassContent(
  db: DatabaseContext,
  seeds: readonly BundledSubclassSeed[],
): boolean {
  for (const seed of seeds) {
    const subclassId = sameDefinition(db, seed);
    if (
      subclassId === null ||
      !hasExactFeatures(db, subclassId, seed.features) ||
      Number(
        db.scalar(
          'SELECT count(*) FROM subclass_progressions WHERE subclass_definition_id = ?',
          [subclassId],
        ) ?? 0,
      ) !== 0
    ) {
      return false;
    }
  }
  return true;
}

/** Exact guard for the twelve inherit-parent SRD subclass aggregates. */
export function hasBundledSrdSubclassContent(db: DatabaseContext): boolean {
  return hasBundledSubclassContent(db, srdSubclassSeeds());
}

function upsertDefinition(
  db: DatabaseContext,
  seed: BundledSubclassSeed,
  timestamp: string,
): number | null {
  const parentId = db.scalar<number>(
    `SELECT id FROM class_definitions
      WHERE content_key = ?`,
    [classContentKey(seed.class_name)],
  );
  if (parentId === null) {
    return null;
  }
  const holder = db.scalar<string>(
    `SELECT content_key
       FROM subclass_definitions
      WHERE class_definition_id = ? AND name = ? AND rules_edition = ?`,
    [parentId, seed.subclass_name, BUNDLED_RULES_EDITION],
  );
  if (holder !== null && holder !== seed.content_key) {
    return null;
  }
  ensureBundledStableContentIdentity(db, {
    kind: 'subclass',
    contentKey: seed.content_key,
    normalizedName: normalizeContentIdentityName(seed.subclass_name),
  });
  db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition,
       spellcasting_ability, caster_fraction, caster_rounding, grant_rules,
       created_at, updated_at, notes
     ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, NULL)
     ON CONFLICT(content_key) DO UPDATE SET
       class_definition_id = excluded.class_definition_id,
       name = excluded.name,
       rules_edition = excluded.rules_edition,
       spellcasting_ability = excluded.spellcasting_ability,
       caster_fraction = NULL,
       caster_rounding = NULL,
       grant_rules = excluded.grant_rules,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       notes = NULL`,
    [
      seed.content_key,
      parentId,
      seed.subclass_name,
      BUNDLED_RULES_EDITION,
      seed.spellcasting_ability,
      encodedRules(seed.grant_rules),
      timestamp,
      timestamp,
    ],
  );
  const subclassId = db.scalar<number>(
    'SELECT id FROM subclass_definitions WHERE content_key = ?',
    [seed.content_key],
  );
  if (subclassId === null) {
    throw new BundledSubclassPersistenceError(seed.content_key);
  }
  return subclassId;
}

function replaceOwnedDescendants(
  db: DatabaseContext,
  subclassId: number,
  features: readonly BundledSubclassFeature[],
  description: HeadingOnlyDescription,
  timestamp: string,
): void {
  db.exec(
    'DELETE FROM subclass_progressions WHERE subclass_definition_id = ?',
    [subclassId],
  );
  db.exec('DELETE FROM subclass_features WHERE subclass_definition_id = ?', [
    subclassId,
  ]);
  for (const feature of features) {
    const featureId = db.exec(
      `INSERT INTO subclass_features (
         subclass_definition_id, class_level, sort_order, name, description,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subclassId,
        feature.class_level,
        feature.sort_position + 1,
        feature.name,
        description,
        timestamp,
        timestamp,
      ],
    ).lastInsertId;
    for (const [effectIndex, effect] of feature.effects.entries()) {
      insertBundledSubclassEffect(
        db,
        featureId,
        effectIndex + 1,
        effect,
        timestamp,
      );
    }
  }
}

function insertBundledSubclassEffect(
  db: DatabaseContext,
  featureId: number,
  sortOrder: number,
  effect: SrdDraconicResilienceEffect,
  timestamp: string,
): void {
  switch (effect.kind) {
    case 'hp_modifier':
      db.exec(
        `INSERT INTO subclass_feature_effects (
           subclass_feature_id, sort_order, effect_kind, hit_points_flat,
           hit_points_per_level, label, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [featureId, sortOrder, effect.kind, effect.hit_points_flat,
          effect.hit_points_per_level, effect.label, timestamp, timestamp],
      );
      return;
    case 'armor_class_formula':
      db.exec(
        `INSERT INTO subclass_feature_effects (
           subclass_feature_id, sort_order, effect_kind, base, ability_1,
           ability_2, allows_shield, label, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [featureId, sortOrder, effect.kind, effect.base, effect.ability_1,
          effect.ability_2, Number(effect.allows_shield), effect.label,
          timestamp, timestamp],
      );
      return;
  }
}

/** Seeds or exactly repairs heading-only bundled subclass aggregates. */
export function ensureBundledSubclassContent(
  db: DatabaseContext,
  seeds: readonly BundledSubclassSeed[],
): boolean {
  if (hasBundledSubclassContent(db, seeds)) {
    return false;
  }
  db.transaction((transactionDb) => {
    const timestamp = new Date().toISOString();
    for (const seed of seeds) {
      const subclassId = upsertDefinition(transactionDb, seed, timestamp);
      if (subclassId !== null) {
        replaceOwnedDescendants(
          transactionDb,
          subclassId,
          seed.features,
          HEADING_ONLY_DESCRIPTION,
          timestamp,
        );
      }
    }
  });
  return true;
}

/** Seeds or exactly repairs only the twelve SC-2 manifest-owned aggregates. */
export function ensureBundledSrdSubclassContent(db: DatabaseContext): boolean {
  return ensureBundledSubclassContent(db, srdSubclassSeeds());
}

/**
 * Called after the spell catalog seeds. Definition grants resolve lazily, but
 * a completed application seed may not leave an owned fixed-spell key missing.
 */
export function assertBundledSrdSubclassSpellReferences(
  db: DatabaseContext,
): void {
  for (const seed of srdSubclassSeeds()) {
    const json = db.scalar<string>(
      'SELECT grant_rules FROM subclass_definitions WHERE content_key = ?',
      [seed.content_key],
    );
    if (json === null) {
      continue;
    }
    const decoded: unknown = JSON.parse(json);
    if (!Array.isArray(decoded)) {
      throw new SrdSubclassGrantRulesArrayError(seed.content_key);
    }
    for (const input of decoded) {
      const rule = GrantRule.fromObject(input);
      if (rule.kind !== GrantRule.FIXED_SPELL) {
        continue;
      }
      const spellVersionKey = rule.toObject().spell_version_key;
      if (
        typeof spellVersionKey !== 'string' ||
        db.scalar(
          'SELECT 1 FROM spell_versions WHERE content_key = ?',
          [spellVersionKey],
        ) === null
      ) {
        throw new SrdSubclassMissingSpellError(
          seed.content_key,
          spellVersionKey,
        );
      }
    }
  }
}
