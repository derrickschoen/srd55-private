/**
 * This work includes material from the System Reference Document 5.2
 * ("SRD 5.2") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE BACKGROUND BRIDGE'S FIRST HALF (dispatch B3, per D61 and D63): the
 * `background_definitions` rows the grant machinery reads. Nothing in this
 * repository ever wrote that table before — `background_templates` carries the
 * printed text the guided background step copies, and `background_definitions`
 * carries the GRANT RULES `SourceRuleReader` resolves a background source
 * instance against. The same distinction killed two review rounds on the
 * species side (see `origin-definitions-srd.ts`), so it is restated here where
 * the second writer lives.
 *
 * EACH DEFINITION CARRIES EXACTLY ONE RULE: grant an Origin feat as a CHILD
 * source, reading WHICH feat from the instance's own config. That indirection
 * is D61 made structural — the owner ruled that the feat is the PLAYER'S to
 * choose, not the background's to dictate, so the definition cannot name a
 * feat. The config keys (`origin_feat_key` / `origin_feat_config`) are the
 * vocabulary the expert path already validates (`src/commands/add-source.ts`,
 * `validateSourceConfiguration`) and the workspace already detects
 * (`configurationKind` in `character-workspace-builder.ts`), and the
 * generator's `definition_key_config` / `child_config_config` support is
 * proven by `tests/integration/grants/nested-sources.test.ts` — no new
 * machinery, which is exactly what the dispatch demands.
 *
 * THE ABILITY INCREASES ARE DELIBERATELY NOT RULES. No grant-rule kind writes
 * a `character_effects` row, and inventing one for a choice the player makes
 * directly would be a parallel mechanism; the guided apply writes the
 * `ability_increase` contributions itself, owned by the source instance these
 * definitions give it (`src/builder/guided-creation.ts`).
 */
import {
  sqlNullableString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import { GrantRule } from '../grants/grant-rule';
import {
  bundledBackgroundTemplates,
  BUNDLED_ORIGIN_RULES_EDITION,
} from './origins-srd';

type GrantRuleSeed = Readonly<Record<string, unknown>>;

/**
 * The config path naming the chosen Origin feat, and the path carrying that
 * feat's own configuration (Magic Initiate's spell list and casting ability).
 * THE EXISTING VOCABULARY, not a new one: `add_source` validates these keys
 * and the planner's background editor writes them. Exported so the guided
 * apply writes the keys the seeded rules read.
 */
export const ORIGIN_FEAT_KEY_CONFIG = 'origin_feat_key';
export const ORIGIN_FEAT_CONFIG_CONFIG = 'origin_feat_config';

function slug(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
}

/**
 * "A background gives your character a specified Origin feat" —
 * `docs/srd/source/backgrounds.txt`. The SPECIFICATION is the part D61
 * removes: the rule grants whichever Origin feat the instance config names.
 */
function originFeatRule(backgroundSlug: string): GrantRuleSeed {
  return {
    kind: 'grant_source',
    rule_key: `${backgroundSlug}-origin-feat`,
    source_type: 'feat',
    definition_key_config: ORIGIN_FEAT_KEY_CONFIG,
    child_config_config: ORIGIN_FEAT_CONFIG_CONFIG,
  };
}

export interface BundledBackgroundDefinition {
  readonly content_key: string;
  readonly name: string;
  readonly grant_rules: readonly GrantRuleSeed[];
}

/**
 * All four bundled backgrounds, derived from the SAME parse the template
 * seeder uses so the two sets cannot drift, every rule validated through
 * `GrantRule.fromObject` before it can be seeded — a malformed rule throws at
 * boot instead of sitting in the database until someone's background apply
 * trips on it.
 */
export function bundledBackgroundDefinitions(): readonly BundledBackgroundDefinition[] {
  const definitions = bundledBackgroundTemplates().map((template) => ({
    content_key: template.content_key,
    name: template.name,
    grant_rules: [originFeatRule(slug(template.name))],
  }));
  for (const definition of definitions) {
    for (const rule of definition.grant_rules) {
      GrantRule.fromObject(rule);
    }
  }
  return definitions;
}

const grantRulesColumn: RowCodec<{ readonly grant_rules: string | null }> = (
  row,
) => ({ grant_rules: sqlNullableString(row, 'grant_rules') });

/**
 * True when every bundled definition is present AND carries exactly the rules
 * this build authors — comparing the rules, not counting keys, so a rule
 * correction in a later build actually deploys. Same contract as
 * `hasBundledSpeciesDefinitions`, for the same reasons.
 */
export function hasBundledBackgroundDefinitions(db: DatabaseContext): boolean {
  for (const definition of bundledBackgroundDefinitions()) {
    const row = db.one(
      `SELECT grant_rules FROM background_definitions WHERE content_key = ?`,
      [definition.content_key],
      grantRulesColumn,
    );
    if (
      row === null ||
      row.grant_rules !== JSON.stringify(definition.grant_rules)
    ) {
      return false;
    }
  }
  return true;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledBackgroundDefinitions(
  db: DatabaseContext,
): boolean {
  if (hasBundledBackgroundDefinitions(db)) {
    return false;
  }
  seedBackgroundDefinitions(db);
  return true;
}

/**
 * Upserts the four definitions, YIELDING when the `(name, rules_edition)`
 * slot is held by a DIFFERENT content key — the same non-destructive rule as
 * `seedSpeciesDefinitions` and `upsertClass`: the table is unique on both
 * `content_key` and `(name, rules_edition)`, so a user-authored "Acolyte" and
 * the bundled one cannot coexist, and the bundled row has no claim to win.
 */
export function seedBackgroundDefinitions(db: DatabaseContext): void {
  db.transaction(() => {
    const timestamp = new Date().toISOString();
    for (const definition of bundledBackgroundDefinitions()) {
      const holder = db.scalar<string>(
        `SELECT content_key FROM background_definitions
         WHERE name = ? AND rules_edition = ?`,
        [definition.name, BUNDLED_ORIGIN_RULES_EDITION],
      );
      if (holder !== null && holder !== definition.content_key) {
        continue;
      }
      ensureBundledStableContentIdentity(db, {
        kind: 'background',
        contentKey: definition.content_key,
        normalizedName: normalizeContentIdentityName(definition.name),
      });
      db.exec(
        `INSERT INTO background_definitions (
           content_key, name, rules_edition, repeatable, grant_rules,
           created_at, updated_at
         ) VALUES (?, ?, ?, 0, ?, ?, ?)
         ON CONFLICT(content_key) DO UPDATE SET
           name = excluded.name,
           rules_edition = excluded.rules_edition,
           repeatable = excluded.repeatable,
           grant_rules = excluded.grant_rules,
           updated_at = excluded.updated_at`,
        [
          definition.content_key,
          definition.name,
          BUNDLED_ORIGIN_RULES_EDITION,
          JSON.stringify(definition.grant_rules),
          timestamp,
          timestamp,
        ],
      );
    }
  });
}
