import type { DatabaseContext } from '../db/database';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { recordedSourceContentKey } from '../catalog/recorded-source-provenance';
import { isEnumValue, abilities, type Ability } from '../domain/enums';
import type { EligibleSpell } from '../domain/read-models';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';
import { EligibleSpellSearch } from '../eligibility/eligible-spell-search';
import { spellSelectionConstraint } from '../eligibility/spell-selection-constraint';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../grants/configured-choice-rule';
import { decodeGrantJson, valueAtPath } from '../grants/source-rule-reader';
import type {
  GuidedConfiguredChoiceState,
  GuidedReplaceableSpellOption,
  GuidedSpeciesChoiceStateResult,
  SpeciesChoiceResolution,
} from './contracts';

interface GuidedSpeciesSource {
  readonly id: number;
  readonly display_name: string;
  readonly config: string | null;
  readonly grant_rules: string | null;
  readonly definition_content_key: string | null;
  readonly definition_catalog_layer: string | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function selectedAbility(value: unknown): Ability | null {
  return isEnumValue(abilities, value) ? value : null;
}

function isEligibleReplaceableSpell(
  db: DatabaseContext,
  contentKey: string,
  spellList: string,
  spellLevel: number,
): boolean {
  return Number(db.scalar(
    `SELECT EXISTS (
       SELECT 1
       FROM spell_versions AS version
       JOIN spell_list_memberships AS membership
         ON membership.spell_version_id = version.id
       WHERE version.content_key = ? AND version.is_active = 1
         AND version.level = ? AND membership.spell_list_key = ?
     )`,
    [contentKey, spellLevel, spellList],
  ) ?? 0) === 1;
}

function spellDisplayName(db: DatabaseContext, contentKey: string): string {
  return db.scalar<string>(
    `SELECT display_name FROM spell_versions
     WHERE content_key = ? AND is_active = 1`,
    [contentKey],
  ) ?? contentKey;
}

function replaceableEligibleSpells(
  db: DatabaseContext,
  characterId: number | null,
  spellList: string,
  spellLevel: number,
): readonly EligibleSpell[] {
  if (characterId === null) return [];
  return new EligibleSpellSearch(db).searchConstraint(
    characterId,
    spellSelectionConstraint({
      spell_level_min: spellLevel,
      spell_level_max: spellLevel,
      allowed_spell_lists: [spellList],
    }),
    '',
  );
}

function replaceableSpellOptions(
  db: DatabaseContext,
  characterId: number | null,
  spellList: string,
  spellLevel: number,
): readonly GuidedReplaceableSpellOption[] {
  return replaceableEligibleSpells(
    db,
    characterId,
    spellList,
    spellLevel,
  ).map((spell) => ({
    content_key: db.scalar<string>(
      'SELECT content_key FROM spell_versions WHERE id = ?',
      [spell.id],
    ) ?? (() => {
      throw new Error(`Eligible spell ${String(spell.id)} has no content key.`);
    })(),
    spell,
  }));
}

export function guidedConfiguredChoiceState(
  db: DatabaseContext,
  rule: ConfiguredChoiceRule,
  config: unknown,
  characterId: number | null,
): GuidedConfiguredChoiceState {
  const selectedOption = valueAtPath(config, rule.configKey);
  const selected = typeof selectedOption === 'string' ? selectedOption : null;
  const ability = rule.abilityChoice === null
    ? null
    : selectedAbility(valueAtPath(config, rule.abilityChoice.configKey));
  return {
    rule_key: rule.ruleKey,
    label: rule.label,
    config_key: rule.configKey,
    selected_option: selected,
    ability_choice: rule.abilityChoice === null
      ? null
      : {
          config_key: rule.abilityChoice.configKey,
          options: [...rule.abilityChoice.options],
          selected: ability,
        },
    unknown_sheet_fields: [...rule.unknownSheetFields],
    projected_trait_names: [...rule.projectedTraitNames],
    options: rule.options.map((option) => {
      const replaceable = option.replaceableSpellChoice;
      const selectedReplaceable = replaceable === null
        ? null
        : valueAtPath(config, replaceable.configKey);
      return {
        value: option.value,
        label: option.label,
        darkvision_feet: option.darkvisionFeet,
        effects: option.effects.map((effect) => ({
          kind: effect.kind,
          label: effect.label,
          speed_bonus_feet:
            effect.kind === 'speed' ? effect.speed_bonus_feet : null,
          damage_type:
            effect.kind === 'damage_resistance' ? effect.damage_type : null,
        })),
        grants: option.grants.map((grant) => {
          const data = grant.toObject() as Record<string, unknown>;
          const spellVersionKey =
            typeof data['spell_version_key'] === 'string'
              ? data['spell_version_key']
              : null;
          return {
            rule_key: grant.ruleKey,
            kind: grant.kind,
            active_from_character_level: grant.activeFromCharacterLevel,
            spell_version_key: spellVersionKey,
            spell_name: spellVersionKey === null
              ? null
              : spellDisplayName(db, spellVersionKey),
          };
        }),
        replaceable_spell_choice: replaceable === null
          ? null
          : {
              config_key: replaceable.configKey,
              label: replaceable.label,
              spell_list: replaceable.spellList,
              spell_level: replaceable.spellLevel,
              initial_spell_version_key: replaceable.initialSpellVersionKey,
              initial_spell_name: spellDisplayName(
                db,
                replaceable.initialSpellVersionKey,
              ),
              selected_spell_version_key:
                typeof selectedReplaceable === 'string'
                  ? selectedReplaceable
                  : null,
              selected_spell: (() => {
                if (
                  characterId === null ||
                  typeof selectedReplaceable !== 'string'
                ) return null;
                const selectedId = db.scalar<number>(
                  `SELECT id FROM spell_versions
                   WHERE content_key = ? AND is_active = 1`,
                  [selectedReplaceable],
                );
                if (selectedId === null) return null;
                return replaceableSpellOptions(
                  db,
                  characterId,
                  replaceable.spellList,
                  replaceable.spellLevel,
                ).find((candidate) =>
                  candidate.spell.id === Number(selectedId)
                ) ?? null;
              })(),
              eligible_spells: replaceableSpellOptions(
                db,
                characterId,
                replaceable.spellList,
                replaceable.spellLevel,
              ),
            },
      };
    }),
  };
}

function guidedSpeciesSource(
  db: DatabaseContext,
  characterId: number,
): GuidedSpeciesSource | null {
  return db.one(
    `SELECT source.id, source.display_name, source.config,
            definition.grant_rules,
            definition.content_key AS definition_content_key,
            identity.catalog_layer AS definition_catalog_layer
     FROM character_source_instances AS source
     LEFT JOIN species_definitions AS definition
       ON definition.id = source.source_definition_id
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = definition.content_key
     WHERE source.character_id = ?
       AND source.source_type = 'species'
       AND source.state = 'active'
       AND source.notes = ?
     ORDER BY source.id`,
    [characterId, GUIDED_SPECIES_SOURCE_MARKER],
    (row) => ({
      id: sqlInteger(row, 'id'),
      display_name: sqlString(row, 'display_name'),
      config: sqlNullableString(row, 'config'),
      grant_rules: sqlNullableString(row, 'grant_rules'),
      definition_content_key: sqlNullableString(row, 'definition_content_key'),
      definition_catalog_layer: sqlNullableString(
        row,
        'definition_catalog_layer',
      ),
    }),
  );
}

function guidedSpeciesCatalogLayer(
  db: DatabaseContext,
  source: GuidedSpeciesSource,
): CatalogLayerDisclosure {
  if (source.definition_content_key !== null) {
    return catalogLayerDisclosure(source.definition_catalog_layer);
  }
  const recordedContentKey = recordedSourceContentKey(source.config);
  if (recordedContentKey === null) return 'unknown';
  const storedLayer = db.scalar<string>(
    `SELECT identity.catalog_layer
     FROM species_templates AS template
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'species'
      AND identity.content_key = template.content_key
     WHERE template.content_key = ? AND template.name = ?`,
    [recordedContentKey, source.display_name],
  );
  return catalogLayerDisclosure(
    typeof storedLayer === 'string' ? storedLayer : null,
  );
}

export function resolveSpeciesChoice(
  db: DatabaseContext,
  characterId: number,
): SpeciesChoiceResolution {
  const copiedSpecies = db.scalar<number>(
    'SELECT id FROM character_species WHERE character_id = ?',
    [characterId],
  );
  if (copiedSpecies === null) return { kind: 'no_species' };

  const source = guidedSpeciesSource(db, characterId);
  if (source === null) {
    return {
      kind: 'unresolvable',
      source_name: 'Recorded species',
      source_catalog_layer: 'unknown',
      reason: 'The guided species source is missing.',
    };
  }
  const sourceCatalogLayer = guidedSpeciesCatalogLayer(db, source);
  try {
    const rawRules = source.grant_rules === null
      ? []
      : JSON.parse(source.grant_rules) as unknown;
    const configured = parseSourceGrantRules(rawRules).filter(
      (rule): rule is ConfiguredChoiceRule =>
        rule instanceof ConfiguredChoiceRule,
    );
    if (configured.length === 0) {
      return {
        kind: 'complete',
        source_instance_id: source.id,
        source_name: source.display_name,
        source_catalog_layer: sourceCatalogLayer,
        choices: [],
      };
    }
    const decoded = decodeGrantJson(source.config);
    const config = record(decoded) ?? {};
    const choices = configured.map((rule) =>
      guidedConfiguredChoiceState(db, rule, config, characterId)
    );
    const missing = new Set<
      'option' | 'spellcasting_ability' | 'replaceable_spell'
    >();
    for (const [index, rule] of configured.entries()) {
      const choice = choices[index];
      if (choice === undefined) {
        throw new Error('A configured choice disappeared during resolution.');
      }
      const option = rule.options.find(
        (candidate) => candidate.value === choice.selected_option,
      );
      if (option === undefined) {
        missing.add('option');
      }
      if (
        rule.abilityChoice !== null &&
        (choice.ability_choice === null ||
          choice.ability_choice.selected === null ||
          !rule.abilityChoice.options.includes(choice.ability_choice.selected))
      ) {
        missing.add('spellcasting_ability');
      }
      if (option === undefined) {
        continue;
      }
      const replaceable = option.replaceableSpellChoice;
      const selectedReplaceable = replaceable === null
        ? null
        : valueAtPath(config, replaceable.configKey);
      if (
        replaceable !== null &&
        (typeof selectedReplaceable !== 'string' ||
          !isEligibleReplaceableSpell(
            db,
            selectedReplaceable,
            replaceable.spellList,
            replaceable.spellLevel,
          ))
      ) {
        missing.add('replaceable_spell');
      }
    }
    return missing.size === 0
      ? {
          kind: 'complete',
          source_instance_id: source.id,
          source_name: source.display_name,
          source_catalog_layer: sourceCatalogLayer,
          choices,
        }
      : {
          kind: 'incomplete',
          source_instance_id: source.id,
          source_name: source.display_name,
          source_catalog_layer: sourceCatalogLayer,
          missing: [...missing],
          choices,
        };
  } catch (error) {
    return {
      kind: 'unresolvable',
      source_name: source.display_name,
      source_catalog_layer: sourceCatalogLayer,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function guidedSpeciesChoiceState(
  db: DatabaseContext,
  characterId: number,
): GuidedSpeciesChoiceStateResult {
  const revision = db.scalar<number>(
    'SELECT revision FROM characters WHERE id = ?',
    [characterId],
  );
  return revision !== null
    ? {
        kind: 'ready',
        character_id: characterId,
        revision: Number(revision),
        resolution: resolveSpeciesChoice(db, characterId),
      }
    : { kind: 'not_found' };
}
