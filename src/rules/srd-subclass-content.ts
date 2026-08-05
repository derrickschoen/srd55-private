/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { DatabaseContext } from '../db/database';
import { GrantRule, type GrantRuleObject } from '../grants/grant-rule';
import {
  BUNDLED_RULES_EDITION,
  BUNDLED_SUBCLASS_OVERRIDE_SCHEDULE_CONTENT_KEYS,
  classContentKey,
} from './class-progression-lookup';
import {
  parseSrdSubclasses,
  srdSubclassClassNames,
  type SrdSubclassDefinition,
  type SrdSubclassClassName,
  type SrdSubclassFeatureHeading,
} from './srd-subclasses';
import type { Ability } from '../domain/enums';
import {
  HEADING_ONLY_DESCRIPTION,
  type HeadingOnlyDescription,
} from '../domain/subclass-feature-description';

interface SrdSubclassSeed {
  readonly class_name: string;
  readonly subclass_name: string;
  readonly content_key: string;
  readonly spellcasting_ability: Ability | null;
  readonly features: readonly SrdSubclassFeatureHeading[];
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

function slug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function subclassContentKey(name: string): string {
  return `${BUNDLED_RULES_EDITION}:subclass:${slug(name)}`;
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
  if (definition.mechanical_outcome.kind !== 'unconditional_fixed_spells') {
    return null;
  }
  return normalizedRuleObjects(definition.mechanical_outcome.rule_set.rules);
}

let cachedSeeds: readonly SrdSubclassSeed[] | undefined;

function srdSubclassSeeds(): readonly SrdSubclassSeed[] {
  if (cachedSeeds !== undefined) {
    return cachedSeeds;
  }
  const manifest = parseSrdSubclasses();
  cachedSeeds = Object.freeze(
    srdSubclassClassNames.map((className) => {
      const definition = manifest.by_class[className];
      return Object.freeze({
        class_name: definition.class_name,
        subclass_name: definition.subclass_name,
        content_key: subclassContentKey(definition.subclass_name),
        spellcasting_ability:
          SRD_SUBCLASS_SPELLCASTING_ABILITIES[className],
        features: definition.features,
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

/** Every bundled subclass definition key, independent of progression shape. */
export function bundledSubclassDefinitionContentKeys(): readonly string[] {
  return Object.freeze([
    ...bundledSrdSubclassDefinitionContentKeys(),
    ...BUNDLED_SUBCLASS_OVERRIDE_SCHEDULE_CONTENT_KEYS,
  ]);
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
    throw new TypeError('SRD subclass grant rules must be JSON text or null.');
  }
  const decoded: unknown = JSON.parse(value);
  if (!Array.isArray(decoded)) {
    throw new TypeError('SRD subclass grant rules must decode to an array.');
  }
  return encodedRules(normalizedRuleObjects(decoded));
}

function sameDefinition(
  db: DatabaseContext,
  seed: SrdSubclassSeed,
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
  expected: readonly SrdSubclassFeatureHeading[],
): boolean {
  const stored = db.allRaw(
    `SELECT class_level, sort_order, name, description
       FROM subclass_features
      WHERE subclass_definition_id = ?
      ORDER BY sort_order`,
    [subclassId],
  );
  return (
    stored.length === expected.length &&
    stored.every((row, index) => {
      const feature = expected[index];
      return (
        feature !== undefined &&
        row.class_level === feature.class_level &&
        row.sort_order === feature.sort_position + 1 &&
        row.name === feature.name &&
        row.description === HEADING_ONLY_DESCRIPTION
      );
    }) &&
    Number(
      db.scalar(
        `SELECT count(*)
           FROM subclass_feature_effects AS effect
           JOIN subclass_features AS feature
             ON feature.id = effect.subclass_feature_id
          WHERE feature.subclass_definition_id = ?`,
        [subclassId],
      ) ?? 0,
    ) === 0
  );
}

/** Exact guard for the twelve inherit-parent SRD subclass aggregates. */
export function hasBundledSrdSubclassContent(db: DatabaseContext): boolean {
  for (const seed of srdSubclassSeeds()) {
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

function upsertDefinition(
  db: DatabaseContext,
  seed: SrdSubclassSeed,
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
    throw new Error(`Failed to persist SRD subclass ${seed.content_key}.`);
  }
  return subclassId;
}

function replaceOwnedDescendants(
  db: DatabaseContext,
  subclassId: number,
  features: readonly SrdSubclassFeatureHeading[],
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
    db.exec(
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
    );
  }
}

/** Seeds or exactly repairs only the twelve SC-2 manifest-owned aggregates. */
export function ensureBundledSrdSubclassContent(db: DatabaseContext): boolean {
  if (hasBundledSrdSubclassContent(db)) {
    return false;
  }
  db.transaction((transactionDb) => {
    const timestamp = new Date().toISOString();
    for (const seed of srdSubclassSeeds()) {
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
      throw new TypeError(
        `SRD subclass ${seed.content_key} grant rules are not an array.`,
      );
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
        throw new Error(
          `SRD subclass ${seed.content_key} references missing spell ${String(spellVersionKey)}.`,
        );
      }
    }
  }
}
