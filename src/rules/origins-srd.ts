/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Seeds the nine bundled species and four backgrounds. Both catalogs are
 * parsed from `docs/srd/source/species-descriptions.txt` and `backgrounds.txt`
 * AT BUILD TIME by `origins-srd-reader.ts` (whose header records the layout
 * hazards the parse handles) and read here from the generated artifact
 * (`generated/origins-srd.ts`, written by `npm run srd:artifacts`). This module
 * imports no SRD text.
 */
import type { BindableValue } from '@sqlite.org/sqlite-wasm';
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import { resolveEquipmentTemplateId } from './equipment-packages';
import { rowContractError } from '../domain/contracts/rows';
import { backgroundFeatBaseName } from '../domain/background-feat-name';
import { deepFreeze } from '../domain/deep-freeze';
import {
  bundledFeatDefinitions,
  ensureBundledFeatContent,
} from './feats-srd';
import {
  OriginExtractError,
  type SrdBackgroundTemplate,
  type SrdSpeciesTemplate,
} from './origins-srd-reader';
import { BUNDLED_SRD_ORIGINS } from './generated/origins-srd';

/**
 * The rules edition every bundled species and background belongs to.
 * Declared in `origin-rules-edition.ts` (an extract-free module — see its
 * comment for why that matters) and re-exported here so existing importers
 * keep one import point.
 */
import { BUNDLED_ORIGIN_RULES_EDITION } from './origin-rules-edition';
export { BUNDLED_ORIGIN_RULES_EDITION };

const ARTIFACT = deepFreeze(BUNDLED_SRD_ORIGINS);

/* ==========================================================================
 * SEEDING
 * ========================================================================== */

function assertRow(
  table:
    | 'species_templates'
    | 'species_template_traits'
    | 'species_template_trait_effects'
    | 'background_templates'
    | 'background_equipment_items',
  row: Record<string, unknown>,
): void {
  const error = rowContractError(table, row, `Bundled ${table} row`);
  if (error !== null) {
    throw new OriginExtractError(error);
  }
}

/** The nine parsed species, in extract order, shared and deeply frozen. */
export function bundledSpeciesTemplates(): readonly SrdSpeciesTemplate[] {
  return ARTIFACT.species;
}

/** The four parsed backgrounds, in extract order, shared and deeply frozen. */
export function bundledBackgroundTemplates(): readonly SrdBackgroundTemplate[] {
  return ARTIFACT.backgrounds;
}

/**
 * True when every parsed template AND every one of its traits is present.
 *
 * Counted rather than merely existence-checked, on the same terms as
 * `hasBundledWeaponContent`: a database holding the nine species keys with no
 * trait rows is broken, and a key-only guard would call it healthy and never
 * repair it.
 */
export function hasBundledOriginContent(db: DatabaseContext): boolean {
  const species = bundledSpeciesTemplates();
  const backgrounds = bundledBackgroundTemplates();
  const count = (sql: string, keys: readonly string[]): number =>
    Number(db.scalar<number>(sql, [...keys]) ?? 0);
  const speciesPlaceholders = species.map(() => '?').join(', ');
  if (
    count(
      `SELECT count(*) FROM species_templates WHERE content_key IN (${speciesPlaceholders})`,
      species.map((entry) => entry.content_key),
    ) !== species.length
  ) {
    return false;
  }
  const backgroundPlaceholders = backgrounds.map(() => '?').join(', ');
  if (
    count(
      `SELECT count(*) FROM background_templates WHERE content_key IN (${backgroundPlaceholders})`,
      backgrounds.map((entry) => entry.content_key),
    ) !== backgrounds.length
  ) {
    return false;
  }
  // PER SPECIES, AND EXACT — not a global `>=`, which was the first shape and
  // could not see a shrinking extract. A global count with `>=` is satisfied by
  // STALE rows: delete a trait from the extract and the nine species still hold
  // more rows than the new parse expects, so the guard reports health and the
  // catalog is never repaired. Counting per species and demanding equality
  // makes both directions detectable, and re-seeding is safe because
  // `seedSpecies` DELETEs a species' traits before reinserting them.
  //
  // `hasBundledWeaponContent` still carries the loose form. That is its own
  // change, in a file this track does not own.
  for (const entry of species) {
    if (
      count(
        `SELECT count(*)
           FROM species_template_traits AS traits
           JOIN species_templates AS templates
             ON templates.id = traits.species_template_id
          WHERE templates.content_key = ?`,
        [entry.content_key],
      ) !== entry.traits.length
    ) {
      return false;
    }
  }
  return true;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledOriginContent(db: DatabaseContext): boolean {
  if (hasBundledOriginContent(db)) {
    return false;
  }
  seedOriginContent(db);
  return true;
}

export function seedOriginContent(db: DatabaseContext): void {
  // Background templates now carry a real FK to their printed Origin feat.
  // Direct callers of this seeder therefore need the same prerequisite that
  // application boot supplies, just as the equipment rows need weapons first.
  ensureBundledFeatContent(db);
  const timestamp = new Date().toISOString();
  db.transaction(() => {
    seedSpecies(db, timestamp);
    seedBackgrounds(db, timestamp);
  });
}

function seedSpecies(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledSpeciesTemplates()) {
    ensureBundledStableContentIdentity(db, {
      kind: 'species',
      contentKey: template.content_key,
      normalizedName: normalizeContentIdentityName(template.name),
    });
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_ORIGIN_RULES_EDITION,
      name: template.name,
      creature_type: template.creature_type,
      size: template.size,
      alternate_size: template.alternate_size,
      base_speed_feet: template.base_speed_feet,
      created_at: timestamp,
      updated_at: timestamp,
    };
    // The parser is the writer, so its output is checked against the row
    // contract before it becomes a catalog row. A mis-parse fails the seed
    // instead of producing nine plausible-looking wrong entries.
    assertRow('species_templates', { id: 1, ...row });
    const templateId = Number(
      db.exec(
        `INSERT INTO species_templates (
           content_key, rules_edition, name, creature_type, size,
           alternate_size, base_speed_feet, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(content_key) DO UPDATE SET
           rules_edition = excluded.rules_edition,
           name = excluded.name,
           creature_type = excluded.creature_type,
           size = excluded.size,
           alternate_size = excluded.alternate_size,
           base_speed_feet = excluded.base_speed_feet,
           updated_at = excluded.updated_at
         RETURNING id`,
        [
          row.content_key,
          row.rules_edition,
          row.name,
          row.creature_type,
          row.size,
          row.alternate_size,
          row.base_speed_feet,
          row.created_at,
          row.updated_at,
        ],
      ).lastInsertId,
    );
    const resolvedId = Number(
      db.scalar<number>(
        'SELECT id FROM species_templates WHERE content_key = ?',
        [row.content_key],
      ) ?? templateId,
    );
    // Traits are REPLACED rather than merged. Their identity is the printed
    // order, and a re-seed after an extract change that inserted a trait would
    // otherwise leave the old one behind under a stale `sort_order`.
    db.exec('DELETE FROM species_template_traits WHERE species_template_id = ?', [
      resolvedId,
    ]);
    for (const [index, trait] of template.traits.entries()) {
      const traitRow = {
        species_template_id: resolvedId,
        sort_order: index + 1,
        name: trait.name,
        description: trait.description,
        created_at: timestamp,
        updated_at: timestamp,
      };
      assertRow('species_template_traits', { id: 1, ...traitRow });
      // The trait's own id is needed to parent its effects, and the child rows
      // go in the same loop iteration so a trait can never be written without
      // the effects the extract says it grants. The DELETE above cascades to
      // them, so a re-seed replaces both halves together.
      const traitId = Number(
        db.exec(
          `INSERT INTO species_template_traits (
             species_template_id, sort_order, name, description,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            traitRow.species_template_id,
            traitRow.sort_order,
            traitRow.name,
            traitRow.description,
            traitRow.created_at,
            traitRow.updated_at,
          ],
        ).lastInsertId,
      );
      for (const [effectIndex, effect] of trait.effects.entries()) {
        const effectRow = {
          species_template_trait_id: traitId,
          sort_order: effectIndex + 1,
          effect_kind: effect.effect_kind,
          damage_type: effect.damage_type,
          hit_points_flat: effect.hit_points_flat,
          hit_points_per_level: effect.hit_points_per_level,
          speed_bonus_feet: effect.speed_bonus_feet,
          ability: null,
          amount: null,
          maximum: null,
          base: null,
          ability_1: null,
          ability_2: null,
          allows_shield: null,
          weapon_scope: null,
          label: trait.name,
          notes: null,
          created_at: timestamp,
          updated_at: timestamp,
        };
        assertRow('species_template_trait_effects', { id: 1, ...effectRow });
        db.exec(
          `INSERT INTO species_template_trait_effects (
             species_template_trait_id, sort_order, effect_kind, damage_type,
             hit_points_flat, hit_points_per_level, speed_bonus_feet,
             ability, amount, maximum, base, ability_1, ability_2,
             allows_shield, weapon_scope,
             label, notes, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            effectRow.species_template_trait_id,
            effectRow.sort_order,
            effectRow.effect_kind,
            effectRow.damage_type,
            effectRow.hit_points_flat,
            effectRow.hit_points_per_level,
            effectRow.speed_bonus_feet,
            effectRow.ability,
            effectRow.amount,
            effectRow.maximum,
            effectRow.base,
            effectRow.ability_1,
            effectRow.ability_2,
            effectRow.allows_shield,
            effectRow.weapon_scope,
            effectRow.label,
            effectRow.notes,
            effectRow.created_at,
            effectRow.updated_at,
          ],
        );
      }
    }
  }
}

function seedBackgrounds(db: DatabaseContext, timestamp: string): void {
  for (const template of bundledBackgroundTemplates()) {
    ensureBundledStableContentIdentity(db, {
      kind: 'background',
      contentKey: template.content_key,
      normalizedName: normalizeContentIdentityName(template.name),
    });
    const featName = backgroundFeatBaseName(template.feat_name).base;
    const bundledFeat = bundledFeatDefinitions().find(
      (candidate) => candidate.name === featName && candidate.grouping === 'origin',
    );
    const installedFeat = bundledFeat === undefined ? null : db.oneRaw(
      `SELECT content_key FROM feat_definitions
       WHERE content_key = ? AND category = 'origin' AND rules_edition = ?`,
      [bundledFeat.content_key, BUNDLED_ORIGIN_RULES_EDITION],
    );
    if (bundledFeat === undefined || installedFeat === null) {
      throw new OriginExtractError(
        `Background ${template.name} default feat ${featName} does not ` +
          'resolve to its installed bundled Origin feat.',
      );
    }
    const row = {
      content_key: template.content_key,
      rules_edition: BUNDLED_ORIGIN_RULES_EDITION,
      name: template.name,
      ability_score_1: template.ability_score_1,
      ability_score_2: template.ability_score_2,
      ability_score_3: template.ability_score_3,
      feat_name: template.feat_name,
      default_origin_feat_content_key: bundledFeat.content_key,
      skill_proficiency_1: template.skill_proficiency_1,
      skill_proficiency_2: template.skill_proficiency_2,
      tool_proficiency: template.tool_proficiency,
      equipment_option_a: template.equipment_option_a,
      equipment_option_b: template.equipment_option_b,
      created_at: timestamp,
      updated_at: timestamp,
    };
    assertRow('background_templates', { id: 1, ...row });
    db.exec(
      `INSERT INTO background_templates (
         content_key, rules_edition, name, ability_score_1, ability_score_2,
         ability_score_3, feat_name, default_origin_feat_content_key,
         skill_proficiency_1, skill_proficiency_2,
         tool_proficiency, equipment_option_a, equipment_option_b,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(content_key) DO UPDATE SET
         rules_edition = excluded.rules_edition,
         name = excluded.name,
         ability_score_1 = excluded.ability_score_1,
         ability_score_2 = excluded.ability_score_2,
         ability_score_3 = excluded.ability_score_3,
         feat_name = excluded.feat_name,
         default_origin_feat_content_key = excluded.default_origin_feat_content_key,
         skill_proficiency_1 = excluded.skill_proficiency_1,
         skill_proficiency_2 = excluded.skill_proficiency_2,
         tool_proficiency = excluded.tool_proficiency,
         equipment_option_a = excluded.equipment_option_a,
         equipment_option_b = excluded.equipment_option_b,
         updated_at = excluded.updated_at`,
      [
        row.content_key,
        row.rules_edition,
        row.name,
        row.ability_score_1,
        row.ability_score_2,
        row.ability_score_3,
        row.feat_name,
        row.default_origin_feat_content_key,
        row.skill_proficiency_1,
        row.skill_proficiency_2,
        row.tool_proficiency,
        row.equipment_option_a,
        row.equipment_option_b,
        row.created_at,
        row.updated_at,
      ],
    );
    seedBackgroundEquipment(db, template, timestamp);
  }
}

/**
 * REPLACE ONE BACKGROUND'S EQUIPMENT LINES.
 *
 * A DELETE-THEN-INSERT rather than an upsert, and the reason is the KEY. The
 * parent is upserted on `content_key` because a background keeps its identity
 * across a re-cut of the extract; an equipment LINE has no identity of its own —
 * it is the third entry of package A, and if the extract prints a different
 * third entry the old row is not a row to update, it is a row that no longer
 * exists. Upserting on `(template, option, sort_order)` would leave a package
 * that got SHORTER carrying its old tail.
 *
 * A DECLARED LINK THAT DOES NOT RESOLVE IS A HARD SEED FAILURE. This is the
 * other half of `assertEquipmentLinksAreExercised`: that one proves the extract
 * still prints what the declaration names, and this proves the weapon catalog
 * still holds what the declaration points at. Between them, a link cannot
 * silently become a plain `gear` row. It is also why `src/db/bootstrap.ts` now
 * seeds the weapon and armour catalogs BEFORE this one.
 */
function seedBackgroundEquipment(
  db: DatabaseContext,
  template: SrdBackgroundTemplate,
  timestamp: string,
): void {
  const templateId = db.scalar(
    'SELECT id FROM background_templates WHERE content_key = ?',
    [template.content_key],
  );
  if (typeof templateId !== 'number') {
    throw new OriginExtractError(
      `Background ${template.name} was not written before its equipment.`,
    );
  }
  db.exec(
    'DELETE FROM background_equipment_items WHERE background_template_id = ?',
    [templateId],
  );
  for (const item of template.equipment_items) {
    const row = {
      background_template_id: templateId,
      option: item.option,
      sort_order: item.sort_order,
      quantity: item.quantity,
      item_name: item.item_name,
      item_kind: item.item_kind,
      weapon_template_id: resolveEquipmentTemplateId(
        db,
        'weapon_templates',
        item.weapon_content_key,
        template.name,
        (message) => new OriginExtractError(message),
      ),
      armor_template_id: resolveEquipmentTemplateId(
        db,
        'armor_templates',
        item.armor_content_key,
        template.name,
        (message) => new OriginExtractError(message),
      ),
      created_at: timestamp,
      updated_at: timestamp,
    };
    assertRow('background_equipment_items', { id: 1, ...row });
    const columns = Object.keys(row);
    db.exec(
      `INSERT INTO background_equipment_items (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      Object.values(row) as BindableValue[],
    );
  }
}
