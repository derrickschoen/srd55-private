/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Seeds the seventeen bundled feats. The rows are parsed from
 * `docs/srd/source/feats.txt` AT BUILD TIME by `feats-srd-reader.ts` and read
 * here from the generated artifact (`generated/feats-srd.ts`, written by
 * `npm run srd:artifacts`), each key minted through `bundledFeatContentKey`.
 * This module imports no SRD text.
 */
import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import { rowContractError } from '../domain/contracts/rows';
import { deepFreeze } from '../domain/deep-freeze';
import {
  BUNDLED_FEAT_RULES_EDITION,
  bundledFeatContentKey,
  SrdFeatError,
  type SrdFeatDefinition,
} from './feats-srd-reader';
import { BUNDLED_SRD_FEAT_DEFINITIONS } from './generated/feats-srd';

const BUNDLED_FEATS: readonly SrdFeatDefinition[] = deepFreeze(
  BUNDLED_SRD_FEAT_DEFINITIONS.map((record) => ({
    ...record,
    content_key: bundledFeatContentKey(record.content_key),
  })),
);

/** The seventeen parsed feats, in extract order, shared and deeply frozen. */
export function bundledFeatDefinitions(): readonly SrdFeatDefinition[] {
  return BUNDLED_FEATS;
}

function persistedValues(feat: SrdFeatDefinition): {
  readonly content_key: string;
  readonly name: string;
  readonly rules_edition: string;
  readonly category: string | null;
  readonly min_level: number | null;
  readonly ability_points: number;
  readonly ability_increase_abilities: string | null;
  readonly ability_increase_maximum: number | null;
  readonly repeatable: number;
  readonly prerequisites: string | null;
  readonly grant_rules: string;
  readonly notes: string;
} {
  return {
    content_key: feat.content_key,
    name: feat.name,
    rules_edition: BUNDLED_FEAT_RULES_EDITION,
    category: feat.grouping,
    min_level: feat.min_level,
    ability_points: feat.ability_points,
    ability_increase_abilities:
      feat.ability_increase_abilities === null
        ? null
        : JSON.stringify(feat.ability_increase_abilities),
    ability_increase_maximum: feat.ability_increase_maximum,
    repeatable: feat.repeatable ? 1 : 0,
    prerequisites:
      feat.prerequisites.length === 0
        ? null
        : JSON.stringify(feat.prerequisites),
    grant_rules: JSON.stringify(feat.grant_rules),
    notes: feat.notes,
  };
}

function storedFeatMatches(
  db: DatabaseContext,
  feat: SrdFeatDefinition,
): boolean {
  const expected = persistedValues(feat);
  const actual = db.oneRaw(
    `SELECT content_key, name, rules_edition, category, min_level,
            ability_points, ability_increase_abilities,
            ability_increase_maximum, repeatable, prerequisites, grant_rules,
            notes
     FROM feat_definitions WHERE content_key = ?`,
    [feat.content_key],
  );
  return (
    actual !== null &&
    Object.entries(expected).every(
      ([column, value]) => actual[column] === value,
    )
  );
}

export function hasBundledFeatContent(db: DatabaseContext): boolean {
  return bundledFeatDefinitions().every((feat) =>
    storedFeatMatches(db, feat),
  );
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledFeatContent(db: DatabaseContext): boolean {
  if (hasBundledFeatContent(db)) {
    return false;
  }
  return seedFeatContent(db);
}

/**
 * Seeds or repairs the bundled feat rows.
 *
 * Calling this directly is idempotent too: a healthy catalog performs no
 * writes, preserving ids and timestamps as well as values.
 */
export function seedFeatContent(db: DatabaseContext): boolean {
  if (hasBundledFeatContent(db)) {
    return false;
  }
  const timestamp = new Date().toISOString();
  return db.transaction(() => {
    let wrote = false;
    for (const feat of bundledFeatDefinitions()) {
      if (storedFeatMatches(db, feat)) {
        continue;
      }
      const nameHolder = db.scalar<string>(
        `SELECT content_key FROM feat_definitions
         WHERE name = ? AND rules_edition = ?`,
        [feat.name, BUNDLED_FEAT_RULES_EDITION],
      );
      // User-authored content wins its name/edition slot. The bundled key
      // cannot be inserted without deleting or renaming that row, and boot
      // seeding has no authority to do either.
      if (nameHolder !== null && nameHolder !== feat.content_key) {
        continue;
      }
      ensureBundledStableContentIdentity(db, {
        kind: 'feat',
        contentKey: feat.content_key,
        normalizedName: normalizeContentIdentityName(feat.name),
      });

      const values = persistedValues(feat);
      const row = {
        id: 1,
        ...values,
        created_at: timestamp,
        updated_at: timestamp,
      };
      const contractError = rowContractError(
        'feat_definitions',
        row,
        `Bundled feat ${feat.name}`,
      );
      if (contractError !== null) {
        throw new SrdFeatError(contractError);
      }

      const columns = [
        ...Object.keys(values),
        'created_at',
        'updated_at',
      ];
      const bind: BindableValue[] = [
        ...Object.values(values),
        timestamp,
        timestamp,
      ];
      db.exec(
        `INSERT INTO feat_definitions (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})
         ON CONFLICT(content_key) DO UPDATE SET
           name = excluded.name,
           rules_edition = excluded.rules_edition,
           category = excluded.category,
           min_level = excluded.min_level,
           ability_points = excluded.ability_points,
           ability_increase_abilities = excluded.ability_increase_abilities,
           ability_increase_maximum = excluded.ability_increase_maximum,
           repeatable = excluded.repeatable,
           prerequisites = excluded.prerequisites,
           grant_rules = excluded.grant_rules,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
        bind,
      );
      wrote = true;
    }
    return wrote;
  });
}
