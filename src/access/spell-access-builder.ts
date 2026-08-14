import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilities,
  isEnumValue,
  slotBuckets,
  type Ability,
  type CastingMode,
  type RulesEdition,
  type SlotBucket,
} from '../domain/enums';
import type { JsonValue } from '../domain/models';
import type { SpellIdentityId, SpellVersionId } from '../domain/ids';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { SpellSelectionEligibility } from '../eligibility/spell-selection-eligibility';
import {
  effectiveSelectionCollectionForSlot,
  evaluateSelectionCollectionConstraint,
} from '../eligibility/spell-selection-collection';
import { spellSelectionConstraint } from '../eligibility/spell-selection-constraint';
import { SourceRuleReader } from '../grants/source-rule-reader';
import {
  resolveCharacterAbilities,
  resolvedTotals,
} from '../rules/ability-contributions';
import { AbilityScores } from '../rules/ability-scores';
import { characterLevel } from '../rules/character-level';
import { proficiencyBonus } from '../rules/proficiency';
import { SpellSlotAssignment } from './spell-slot-assignment';
import { deduplicateRoutes } from './route-key';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

/**
 * The character as spell access computes with it: RESOLVED scores, not the six
 * raw columns. `buildForCharacter` is reader three of the four raw-score
 * readers (plan §3.4) and runs the row through the one resolver before
 * anything downstream can touch a score — so a casting-ability contribution
 * moves every attack bonus and save DC built here, not just a displayed six.
 */
interface Character {
  readonly id: number;
  readonly scores: AbilityScores;
  readonly proficiencyBonusOverride: number | null;
}

interface CharacterRow {
  readonly id: number;
  readonly base: Readonly<Record<Ability, number>>;
  readonly proficiencyBonusOverride: number | null;
}

interface SlotRouteRow {
  readonly id: number;
  readonly character_id: number;
  readonly source_instance_id: number;
  readonly fixed_spell_version_id: number | null;
  readonly current_spell_version_id: number | null;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly allowed_spell_lists: string | null;
  readonly allowed_schools: string | null;
  readonly allowed_tags: string | null;
  readonly selection_collection: string | null;
  readonly state: string;
  readonly sourceName: string;
  readonly sourceType: string;
  readonly sourceDefinitionId: number | null;
  readonly sourceConfig: string | null;
  readonly routeSpellVersionId: SpellVersionId;
  readonly spellIdentityId: SpellIdentityId;
  readonly spellName: string;
  readonly spellCatalogLayer: CatalogLayerDisclosure;
  readonly spellContentKey: string;
  readonly spellRulesEdition: RulesEdition;
  readonly spellLevel: number;
  readonly identityName: string;
  readonly sourceCatalogLayer: CatalogLayerDisclosure;
  readonly slotKey: string;
  readonly bucket: SlotBucket;
  readonly alwaysPrepared: boolean;
  readonly withSlots: boolean;
  readonly countsAgainstLimit: boolean;
  readonly freeCastJson: string | null;
}

interface PreparedSlotRow {
  readonly character_id: number;
  readonly fixed_spell_version_id: number | null;
  readonly current_spell_version_id: number | null;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly allowed_spell_lists: string | null;
  readonly allowed_schools: string | null;
  readonly allowed_tags: string | null;
  readonly selection_collection: string | null;
  readonly state: string;
}

interface SpellbookEntry {
  readonly id: number;
  readonly spellVersionId: SpellVersionId;
  readonly spellIdentityId: SpellIdentityId;
  readonly spellName: string;
  readonly spellCatalogLayer: CatalogLayerDisclosure;
  readonly spellContentKey: string;
  readonly spellRulesEdition: RulesEdition;
  readonly spellLevel: number;
  readonly identityName: string;
  readonly ritual: boolean;
}

interface RitualCapability {
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly source_catalog_layer: CatalogLayerDisclosure;
  readonly spellcasting_ability: Ability | null;
}

export interface SpellAccessRoute {
  readonly spell_identity_id: SpellIdentityId;
  readonly identity_name: string;
  readonly spell_name: string;
  readonly spell_catalog_layer: CatalogLayerDisclosure;
  readonly spell_content_key: string;
  readonly rules_edition: RulesEdition;
  readonly spell_level: number;
  readonly ability_modifier: number | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
  readonly origin: 'slot' | 'capability';
  readonly casting_mode: CastingMode;
  readonly spell_version_id: SpellVersionId;
  readonly source_instance_id: number;
  readonly source_name: string;
  readonly source_catalog_layer: CatalogLayerDisclosure;
  readonly slot_id: number | null;
  readonly slot_key: string | null;
  readonly selection_key: string | null;
  readonly bucket: SlotBucket | null;
  readonly always_prepared: boolean;
  readonly selection_collection?: string | null;
  readonly is_selection: boolean;
  readonly counts_against_limit: boolean;
  readonly free_cast: JsonValue | null;
  readonly spellcasting_ability: Ability | null;
  readonly spellbook_entry_id?: number;
}

function decodeCharacter(row: SqlRow): CharacterRow {
  return {
    id: sqlInteger(row, 'id'),
    base: Object.fromEntries(
      abilities.map((ability) => [ability, sqlInteger(row, ability)]),
    ) as Record<Ability, number>,
    proficiencyBonusOverride: sqlNullableInteger(
      row,
      'proficiency_bonus_override',
    ),
  };
}

function decodeSlotRoute(row: SqlRow): SlotRouteRow {
  const bucket = sqlString(row, 'bucket');
  if (!isEnumValue(slotBuckets, bucket)) {
    throw new TypeError(`Unknown spell selection bucket ${bucket}.`);
  }
  return {
    id: sqlInteger(row, 'id'),
    character_id: sqlInteger(row, 'character_id'),
    source_instance_id: sqlInteger(row, 'source_instance_id'),
    fixed_spell_version_id: sqlNullableInteger(
      row,
      'fixed_spell_version_id',
    ),
    current_spell_version_id: sqlNullableInteger(
      row,
      'current_spell_version_id',
    ),
    spell_level_min: sqlInteger(row, 'spell_level_min'),
    spell_level_max: sqlInteger(row, 'spell_level_max'),
    allowed_spell_lists: sqlNullableString(row, 'allowed_spell_lists'),
    allowed_schools: sqlNullableString(row, 'allowed_schools'),
    allowed_tags: sqlNullableString(row, 'allowed_tags'),
    selection_collection: sqlNullableString(row, 'selection_collection'),
    state: sqlString(row, 'state'),
    sourceName: sqlString(row, 'source_name'),
    sourceType: sqlString(row, 'source_type'),
    sourceDefinitionId: sqlNullableInteger(row, 'source_definition_id'),
    sourceConfig: sqlNullableString(row, 'source_config'),
    routeSpellVersionId: sqlInteger(row, 'route_spell_version_id') as SpellVersionId,
    spellIdentityId: sqlInteger(row, 'spell_identity_id') as SpellIdentityId,
    spellName: sqlString(row, 'spell_name'),
    spellCatalogLayer: catalogLayerDisclosure(
      sqlNullableString(row, 'spell_catalog_layer'),
    ),
    spellContentKey: sqlString(row, 'spell_content_key'),
    spellRulesEdition: sqlString(
      row,
      'spell_rules_edition',
    ) as RulesEdition,
    spellLevel: sqlInteger(row, 'spell_level'),
    identityName: sqlString(row, 'identity_name'),
    sourceCatalogLayer: catalogLayerDisclosure(
      sqlNullableString(row, 'source_catalog_layer'),
    ),
    slotKey: sqlString(row, 'slot_key'),
    bucket,
    alwaysPrepared: sqlBoolean(row, 'always_prepared'),
    withSlots: sqlBoolean(row, 'with_slots'),
    countsAgainstLimit: sqlBoolean(row, 'counts_against_limit'),
    freeCastJson: sqlNullableString(row, 'free_cast'),
  };
}

function decodePreparedSlot(row: SqlRow): PreparedSlotRow {
  return {
    character_id: sqlInteger(row, 'character_id'),
    fixed_spell_version_id: sqlNullableInteger(
      row,
      'fixed_spell_version_id',
    ),
    current_spell_version_id: sqlNullableInteger(
      row,
      'current_spell_version_id',
    ),
    spell_level_min: sqlInteger(row, 'spell_level_min'),
    spell_level_max: sqlInteger(row, 'spell_level_max'),
    allowed_spell_lists: sqlNullableString(row, 'allowed_spell_lists'),
    allowed_schools: sqlNullableString(row, 'allowed_schools'),
    allowed_tags: sqlNullableString(row, 'allowed_tags'),
    selection_collection: sqlNullableString(row, 'selection_collection'),
    state: sqlString(row, 'state'),
  };
}

function decodeSpellbookEntry(row: SqlRow): SpellbookEntry {
  return {
    id: sqlInteger(row, 'id'),
    spellVersionId: sqlInteger(row, 'spell_version_id') as SpellVersionId,
    spellIdentityId: sqlInteger(row, 'spell_identity_id') as SpellIdentityId,
    spellName: sqlString(row, 'spell_name'),
    spellCatalogLayer: catalogLayerDisclosure(
      sqlNullableString(row, 'spell_catalog_layer'),
    ),
    spellContentKey: sqlString(row, 'spell_content_key'),
    spellRulesEdition: sqlString(
      row,
      'spell_rules_edition',
    ) as RulesEdition,
    spellLevel: sqlInteger(row, 'spell_level'),
    identityName: sqlString(row, 'identity_name'),
    ritual: sqlBoolean(row, 'ritual'),
  };
}

function parseJson(value: string | null): JsonValue | null {
  return value === null ? null : (JSON.parse(value) as JsonValue);
}

function configuredAbility(configJson: string | null): {
  readonly configured: boolean;
  readonly ability: Ability | null;
} {
  const config: unknown =
    configJson === null || configJson === '' ? {} : JSON.parse(configJson);
  if (config === null || Array.isArray(config) || typeof config !== 'object') {
    return { configured: false, ability: null };
  }
  const value = (config as Record<string, unknown>).spellcasting_ability;
  if (typeof value !== 'string' || value === '') {
    return { configured: false, ability: null };
  }
  const normalized = value.toLowerCase();
  return {
    configured: true,
    ability: isEnumValue(abilities, normalized) ? normalized : null,
  };
}

function castingMode(
  spellLevel: number,
  withSlots: boolean,
  freeCast: JsonValue | null,
): CastingMode {
  if (spellLevel === 0) {
    return 'at_will';
  }
  if (withSlots && freeCast !== null) {
    return 'slots_and_free_cast';
  }
  if (withSlots) {
    return 'with_slots';
  }
  if (freeCast !== null) {
    return 'free_cast_only';
  }
  return 'granted';
}

function compareRoutes(
  left: SpellAccessRoute,
  right: SpellAccessRoute,
): number {
  const leftKey = [
    left.spell_name,
    left.origin,
    left.selection_key ?? '',
  ];
  const rightKey = [
    right.spell_name,
    right.origin,
    right.selection_key ?? '',
  ];
  for (let index = 0; index < leftKey.length; index += 1) {
    const leftValue = leftKey[index]!;
    const rightValue = rightKey[index]!;
    if (leftValue !== rightValue) {
      return leftValue < rightValue ? -1 : 1;
    }
  }
  return 0;
}

export class SpellAccessBuilder {
  readonly #eligibility: SpellSelectionEligibility;
  readonly #rules: SourceRuleReader;

  constructor(
    private readonly db: DatabaseContext,
    eligibility?: SpellSelectionEligibility,
    rules?: SourceRuleReader,
  ) {
    this.#rules = rules ?? new SourceRuleReader(db);
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
  }

  buildForCharacter(characterId: number): SpellAccessRoute[] {
    const row = this.db.one(
      `SELECT id, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override
       FROM characters
       WHERE id = ?`,
      [characterId],
      decodeCharacter,
    );
    if (row === null) {
      return [];
    }
    if (characterLevel(this.db, row.id) === null) {
      // A class-less character has no class spellcasting to turn into routes.
      // Returning no routes keeps an undetermined level out of spell math.
      return [];
    }
    // Base plus `ability_increase` contributions, resolved ONCE and carried —
    // see the `Character` comment. Nothing after this line sees a raw score.
    const character: Character = {
      id: row.id,
      scores: AbilityScores.fromArray(
        resolvedTotals(
          resolveCharacterAbilities(this.db, row.id, row.base),
        ),
      ),
      proficiencyBonusOverride: row.proficiencyBonusOverride,
    };

    return deduplicateRoutes([
      ...this.slotRoutes(character),
      ...this.wizardRoutes(character),
    ]).sort(compareRoutes);
  }

  private slotRoutes(character: Character): SpellAccessRoute[] {
    const rows = this.db.all(
      `SELECT slot.id, slot.character_id, slot.source_instance_id,
              slot.fixed_spell_version_id,
              slot.current_spell_version_id, slot.spell_level_min,
              slot.spell_level_max, slot.allowed_spell_lists,
              slot.allowed_schools, slot.allowed_tags,
              slot.selection_collection, slot.state, slot.slot_key,
              slot.bucket, slot.always_prepared, slot.with_slots,
              slot.counts_against_limit,
              slot.free_cast, source.display_name AS source_name,
              source.source_type, source.source_definition_id,
              source.config AS source_config,
              version.id AS route_spell_version_id,
              version.spell_identity_id,
              version.display_name AS spell_name,
              version.content_key AS spell_content_key,
              version.rules_edition AS spell_rules_edition,
              version.level AS spell_level,
              identity.canonical_name AS identity_name,
              spell_catalog_identity.catalog_layer AS spell_catalog_layer,
              source_catalog_identity.catalog_layer AS source_catalog_layer
       FROM spell_selection_slots AS slot
       INNER JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       INNER JOIN spell_versions AS version
         ON version.id = COALESCE(
           slot.fixed_spell_version_id,
           slot.current_spell_version_id
         )
       INNER JOIN spell_identities AS identity
         ON identity.id = version.spell_identity_id
       LEFT JOIN catalog_content_identities AS spell_catalog_identity
         ON spell_catalog_identity.content_kind = 'spell'
        AND spell_catalog_identity.content_key = version.content_key
       LEFT JOIN class_definitions AS source_class
         ON source.source_type = 'class'
        AND source_class.id = source.source_definition_id
       LEFT JOIN subclass_definitions AS source_subclass
         ON source.source_type = 'subclass'
        AND source_subclass.id = source.source_definition_id
       LEFT JOIN feat_definitions AS source_feat
         ON source.source_type = 'feat'
        AND source_feat.id = source.source_definition_id
       LEFT JOIN species_definitions AS source_species
         ON source.source_type = 'species'
        AND source_species.id = source.source_definition_id
       LEFT JOIN background_definitions AS source_background
         ON source.source_type = 'background'
        AND source_background.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS source_catalog_identity
         ON source_catalog_identity.content_kind = source.source_type
        AND source_catalog_identity.content_key = COALESCE(
              source_class.content_key, source_subclass.content_key,
              source_feat.content_key, source_species.content_key,
              source_background.content_key
            )
       WHERE slot.character_id = ?
         AND version.is_active = 1
         AND (
           slot.state = 'kept_override'
           OR (slot.state = 'active' AND source.state = ?)
         )`,
      [character.id, ACTIVE_SOURCE_INSTANCE_STATE],
      decodeSlotRoute,
    );

    const routes: SpellAccessRoute[] = [];
    for (const row of rows) {
      SpellSlotAssignment.fromReferences(
        row.fixed_spell_version_id,
        row.current_spell_version_id,
      );
      const constraint = {
        ...spellSelectionConstraint(row),
        selection_collection: effectiveSelectionCollectionForSlot(
          this.db,
          character.id,
          row.id,
        ),
      };
      if (
        constraint.selection_collection !== null &&
        evaluateSelectionCollectionConstraint(
          this.db,
          character.id,
          constraint,
          row.routeSpellVersionId,
          this.#eligibility,
        ).status !== 'valid'
      ) {
        continue;
      }
      if (
        row.state !== 'kept_override' &&
        this.#eligibility.evaluate({
          ...row,
          selection_collection: null,
        }).status !== 'valid'
      ) {
        continue;
      }

      const freeCast = parseJson(row.freeCastJson);
      const ability = this.spellcastingAbility({
        sourceType: row.sourceType,
        sourceDefinitionId: row.sourceDefinitionId,
        config: row.sourceConfig,
      });
      routes.push(
        this.route(character, row, {
          origin: 'slot',
          casting_mode: castingMode(
            row.spellLevel,
            row.withSlots,
            freeCast,
          ),
          spell_version_id: row.routeSpellVersionId,
          source_instance_id: row.source_instance_id,
          source_name: row.sourceName,
          source_catalog_layer: row.sourceCatalogLayer,
          slot_id: row.id,
          slot_key: row.slotKey,
          selection_key: row.slotKey,
          bucket: row.bucket,
          always_prepared: row.alwaysPrepared,
          selection_collection: constraint.selection_collection,
          is_selection: true,
          counts_against_limit: row.countsAgainstLimit,
          free_cast: freeCast,
          spellcasting_ability: ability,
        }),
      );
    }
    return routes;
  }

  private wizardRoutes(character: Character): SpellAccessRoute[] {
    const preparedVersionIds = new Set(
      this.db
        .all(
          `SELECT slot.character_id, slot.fixed_spell_version_id,
                  slot.current_spell_version_id, slot.spell_level_min,
                  slot.spell_level_max, slot.allowed_spell_lists,
                  slot.allowed_schools, slot.allowed_tags,
                  slot.selection_collection, slot.state
           FROM spell_selection_slots AS slot
           INNER JOIN character_source_instances AS source
             ON source.id = slot.source_instance_id
           INNER JOIN class_definitions AS class
             ON class.id = source.source_definition_id
           WHERE slot.character_id = ?
             AND source.source_type = 'class'
             AND class.name = 'Wizard'
             AND (
               slot.state = 'kept_override'
               OR (slot.state = 'active' AND source.state = ?)
             )
             AND slot.bucket = 'prepared'
             AND slot.current_spell_version_id IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM wizard_spellbook_entries AS entry
               LEFT JOIN character_source_instances AS book_source
                 ON book_source.id = entry.source_instance_id
                AND book_source.character_id = entry.character_id
               WHERE entry.character_id = slot.character_id
                 AND entry.spell_version_id = slot.current_spell_version_id
                 AND entry.state = 'active'
                 AND (
                   entry.source_instance_id IS NULL
                   OR book_source.state = ?
                 )
             )`,
          [
            character.id,
            ACTIVE_SOURCE_INSTANCE_STATE,
            ACTIVE_SOURCE_INSTANCE_STATE,
          ],
          decodePreparedSlot,
        )
        .filter(
          (slot) =>
            slot.state === 'kept_override' ||
            this.#eligibility.evaluate(slot).status === 'valid',
        )
        .map((slot) => slot.current_spell_version_id as number),
    );

    const entries = this.db.all(
      `SELECT entry.id, entry.spell_version_id,
              version.spell_identity_id,
              version.display_name AS spell_name,
              version.content_key AS spell_content_key,
              version.rules_edition AS spell_rules_edition,
              version.level AS spell_level, version.ritual,
              identity.canonical_name AS identity_name,
              spell_catalog_identity.catalog_layer AS spell_catalog_layer
       FROM wizard_spellbook_entries AS entry
       LEFT JOIN character_source_instances AS book_source
         ON book_source.id = entry.source_instance_id
        AND book_source.character_id = entry.character_id
       INNER JOIN spell_versions AS version
         ON version.id = entry.spell_version_id
       INNER JOIN spell_identities AS identity
         ON identity.id = version.spell_identity_id
       LEFT JOIN catalog_content_identities AS spell_catalog_identity
         ON spell_catalog_identity.content_kind = 'spell'
        AND spell_catalog_identity.content_key = version.content_key
       WHERE entry.character_id = ?
         AND entry.state = 'active'
         AND (
           entry.source_instance_id IS NULL
           OR book_source.state = ?
         )
         AND version.is_active = 1
       ORDER BY version.display_name`,
      [character.id, ACTIVE_SOURCE_INSTANCE_STATE],
      decodeSpellbookEntry,
    );
    const capabilities = this.ritualCapabilities(character.id);
    const capability = capabilities[0];
    if (capability === undefined) {
      return [];
    }

    const routes: SpellAccessRoute[] = [];
    for (const entry of entries) {
      const ritual =
        entry.ritual ||
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1 FROM spell_version_tags
               WHERE spell_version_id = ? AND tag = 'ritual'
             )`,
            [entry.spellVersionId],
          ) ?? 0,
        ) === 1;
      if (preparedVersionIds.has(entry.spellVersionId) || !ritual) {
        continue;
      }

      routes.push(
        this.route(character, entry, {
          origin: 'capability',
          casting_mode: 'ritual_only',
          spell_version_id: entry.spellVersionId,
          source_instance_id: capability.source_instance_id,
          source_name: capability.source_name,
          source_catalog_layer: capability.source_catalog_layer,
          slot_id: null,
          slot_key: null,
          selection_key: null,
          bucket: null,
          always_prepared: false,
          is_selection: false,
          counts_against_limit: false,
          free_cast: null,
          spellcasting_ability: capability.spellcasting_ability,
          spellbook_entry_id: entry.id,
        }),
      );
    }
    return routes;
  }

  private ritualCapabilities(characterId: number): RitualCapability[] {
    const sources = this.db.all(
      `SELECT source.id, source.display_name, source.source_type,
              source.source_definition_id, source.config,
              catalog_identity.catalog_layer AS source_catalog_layer
       FROM character_source_instances
       AS source
       LEFT JOIN class_definitions AS source_class
         ON source.source_type = 'class'
        AND source_class.id = source.source_definition_id
       LEFT JOIN subclass_definitions AS source_subclass
         ON source.source_type = 'subclass'
        AND source_subclass.id = source.source_definition_id
       LEFT JOIN feat_definitions AS source_feat
         ON source.source_type = 'feat'
        AND source_feat.id = source.source_definition_id
       LEFT JOIN species_definitions AS source_species
         ON source.source_type = 'species'
        AND source_species.id = source.source_definition_id
       LEFT JOIN background_definitions AS source_background
         ON source.source_type = 'background'
        AND source_background.id = source.source_definition_id
       LEFT JOIN catalog_content_identities AS catalog_identity
         ON catalog_identity.content_kind = source.source_type
        AND catalog_identity.content_key = COALESCE(
              source_class.content_key, source_subclass.content_key,
              source_feat.content_key, source_species.content_key,
              source_background.content_key
            )
       WHERE character_id = ? AND state = 'active'
       ORDER BY source.id`,
      [characterId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        display_name: sqlString(row, 'display_name'),
        source_type: sqlString(row, 'source_type'),
        source_definition_id: sqlNullableInteger(row, 'source_definition_id'),
        config: sqlNullableString(row, 'config'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'source_catalog_layer'),
        ),
      }),
    );
    const capabilities: RitualCapability[] = [];
    for (const source of sources) {
      const sourceId = source.id;
      for (const rule of this.#rules.activeRulesForSource(sourceId)) {
        const data = rule.toObject();
        if (
          rule.kind !== 'capability' ||
          data.collection !== 'wizard_spellbook' ||
          data.access_mode !== 'ritual_only' ||
          !Array.isArray(data.tags) ||
          !data.tags.includes('ritual')
        ) {
          continue;
        }
        capabilities.push({
          source_instance_id: sourceId,
          source_name: source.display_name,
          source_catalog_layer: source.catalog_layer,
          spellcasting_ability: this.spellcastingAbility({
            sourceType: source.source_type,
            sourceDefinitionId: source.source_definition_id,
            config: source.config,
          }),
        });
      }
    }
    return capabilities;
  }

  private route(
    character: Character,
    spell: SlotRouteRow | SpellbookEntry,
    specific: Omit<
      SpellAccessRoute,
      | 'spell_identity_id'
      | 'identity_name'
      | 'spell_name'
      | 'spell_catalog_layer'
      | 'spell_content_key'
      | 'rules_edition'
      | 'spell_level'
      | 'ability_modifier'
      | 'attack_bonus'
      | 'save_dc'
    >,
  ): SpellAccessRoute {
    const ability = specific.spellcasting_ability;
    const level = characterLevel(this.db, character.id);
    if (level === null) {
      throw new Error(
        'Spell access routes require at least one character class.',
      );
    }
    const proficiency =
      character.proficiencyBonusOverride ??
      proficiencyBonus(level);
    const abilityScore =
      ability === null ? null : character.scores.score(ability);

    return {
      spell_identity_id: spell.spellIdentityId,
      identity_name: spell.identityName,
      spell_name: spell.spellName,
      spell_catalog_layer: spell.spellCatalogLayer,
      spell_content_key: spell.spellContentKey,
      rules_edition: spell.spellRulesEdition,
      spell_level: spell.spellLevel,
      ability_modifier: abilityScore?.modifier() ?? null,
      attack_bonus:
        abilityScore?.spellAttackBonus(proficiency).value ?? null,
      save_dc: abilityScore?.spellSaveDC(proficiency).value ?? null,
      ...specific,
    };
  }

  private spellcastingAbility(source: {
    readonly sourceType: string;
    readonly sourceDefinitionId: number | null;
    readonly config: string | null;
  }): Ability | null {
    const configured = configuredAbility(source.config);
    if (configured.configured) {
      return configured.ability;
    }

    const table =
      source.sourceType === 'class'
        ? 'class_definitions'
        : source.sourceType === 'subclass'
          ? 'subclass_definitions'
          : null;
    if (table === null) {
      return null;
    }
    const value = this.db.scalar<string>(
      `SELECT spellcasting_ability FROM ${table} WHERE id = ?`,
      [source.sourceDefinitionId ?? 0],
    );
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.toLowerCase();
    return isEnumValue(abilities, normalized) ? normalized : null;
  }
}
