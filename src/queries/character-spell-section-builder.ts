import {
  SpellAccessBuilder,
  type SpellAccessRoute,
} from '../access/spell-access-builder';
import {
  sqlBoolean,
  sqlInteger,
  sqlNullableString,
  sqlSpellSchool,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import {
  isEnumValue,
  rulesEditions,
  type Ability,
  type RulesEdition,
  type SlotBucket,
  type SpellSchool,
} from '../domain/enums';
import type {
  ClassDefinitionId,
  SourceInstanceId,
  SpellLevel,
  SpellVersionId,
} from '../domain/ids';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

export type SheetSpellMarker = 'prepared' | 'known';

export type SheetSpellLevel =
  | { readonly status: 'known'; readonly value: SpellLevel }
  | {
      readonly status: 'unknown';
      readonly reason: 'placeholder_level';
    };

export type SheetSpellcastingStatistic =
  | {
      readonly status: 'computed';
      readonly ability: Ability;
      readonly save_dc: number;
      readonly attack_bonus: number;
    }
  | {
      readonly status: 'absent';
      readonly reason: 'spellcasting_ability_not_recorded';
      readonly detail: string;
    };

/** The complete stored reference needed by the later print appendix. */
export interface SheetSpellReference {
  readonly edition: RulesEdition;
  readonly school: SpellSchool;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly duration: string | null;
  readonly components: string | null;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly upcast_levels: readonly number[];
  readonly upcast_summary: string | null;
  readonly cantrip_upgrade_levels: readonly number[];
  readonly cantrip_upgrade_summary: string | null;
  readonly attack_modes: readonly string[];
  readonly save_abilities: readonly string[];
  /** Exact `spell_versions.short_summary` bytes; `null` is honest absence. */
  readonly description: string | null;
}

export interface SheetSpellbookEntry {
  readonly spell_version_id: SpellVersionId;
  readonly name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly level: SheetSpellLevel;
  readonly reference: SheetSpellReference;
}

export interface SheetSpell extends SheetSpellbookEntry {
  readonly marker: SheetSpellMarker;
}

export type SheetSpellGroup =
  | {
      readonly kind: 'class';
      readonly class_definition_id: ClassDefinitionId;
      readonly class_name: string;
      readonly class_catalog_layer: CatalogLayerDisclosure;
      readonly statistics: readonly SheetSpellcastingStatistic[];
      readonly spells: readonly SheetSpell[];
      readonly spellbook: readonly SheetSpellbookEntry[];
    }
  | {
      readonly kind: 'other_source';
      readonly source_instance_id: SourceInstanceId;
      readonly source_name: string;
      readonly source_catalog_layer: CatalogLayerDisclosure;
      readonly statistics: readonly SheetSpellcastingStatistic[];
      readonly spells: readonly SheetSpell[];
    };

/** The typed value rendered by SS-2 from `CharacterSheet.spells`. */
export type CharacterSpellSection = readonly SheetSpellGroup[];

interface SpellFacts {
  readonly spell_version_id: SpellVersionId;
  readonly name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
  readonly level: SheetSpellLevel;
  readonly reference: SheetSpellReference;
}

interface ClassAttribution {
  readonly origin_id: SourceInstanceId;
  readonly class_definition_id: ClassDefinitionId;
  readonly class_name: string;
  readonly class_catalog_layer: CatalogLayerDisclosure;
}

interface SpellbookAcquisition {
  readonly source_instance_id: SourceInstanceId;
  readonly spell_version_id: SpellVersionId;
}

interface MutableClassGroup {
  readonly kind: 'class';
  readonly class_definition_id: ClassDefinitionId;
  readonly class_name: string;
  readonly class_catalog_layer: CatalogLayerDisclosure;
  readonly statistics: Map<string, SheetSpellcastingStatistic>;
  readonly spells: Map<SpellVersionId, SheetSpell>;
  readonly spellbook: Map<SpellVersionId, SheetSpellbookEntry>;
}

interface MutableOtherSourceGroup {
  readonly kind: 'other_source';
  readonly source_instance_id: SourceInstanceId;
  readonly source_name: string;
  readonly source_catalog_layer: CatalogLayerDisclosure;
  readonly statistics: Map<string, SheetSpellcastingStatistic>;
  readonly spells: Map<SpellVersionId, SheetSpell>;
}

type MutableGroup = MutableClassGroup | MutableOtherSourceGroup;

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function spellLevel(value: number): SheetSpellLevel {
  if (value === -1) {
    return { status: 'unknown', reason: 'placeholder_level' };
  }
  if (Number.isInteger(value) && value >= 0 && value <= 9) {
    return { status: 'known', value: value as SpellLevel };
  }
  throw new Error(`Spell level ${value} is outside 0..9 and is not a placeholder.`);
}

function rulesEdition(value: string): RulesEdition {
  if (!isEnumValue(rulesEditions, value)) {
    throw new TypeError(`Unknown spell rules edition ${value}.`);
  }
  return value;
}

function levelOrder(level: SheetSpellLevel): number {
  switch (level.status) {
    case 'known':
      return level.value;
    case 'unknown':
      return 10;
  }
  const unhandled: never = level;
  return unhandled;
}

/** D149's sole spell-row comparator: level, exact name, then branded id. */
export function compareSheetSpells(
  left: SheetSpellbookEntry,
  right: SheetSpellbookEntry,
): number {
  const byLevel = levelOrder(left.level) - levelOrder(right.level);
  if (byLevel !== 0) {
    return byLevel;
  }
  if (left.name !== right.name) {
    return left.name < right.name ? -1 : 1;
  }
  return left.spell_version_id - right.spell_version_id;
}

function markerForBucket(
  bucket: SlotBucket | null,
  alwaysPrepared: boolean,
): SheetSpellMarker | null {
  switch (bucket) {
    case 'prepared':
      return 'prepared';
    case 'cantrip_known':
    case 'known':
    case 'automatic':
      return alwaysPrepared ? 'prepared' : 'known';
    case 'spellbook':
    case null:
      return null;
  }
  const unhandled: never = bucket;
  throw new TypeError(`Unhandled spell selection bucket ${String(unhandled)}.`);
}

/** Selects only the evaluated, slot-backed assignments D149 labels. */
export function sheetSpellMarker(
  route: Pick<
    SpellAccessRoute,
    'origin' | 'bucket' | 'always_prepared'
  >,
): SheetSpellMarker | null {
  if (route.origin === 'capability') {
    return null;
  }
  return markerForBucket(route.bucket, route.always_prepared);
}

function decodeClassAttribution(row: SqlRow): ClassAttribution {
  return {
    origin_id: sqlInteger(row, 'origin_id') as SourceInstanceId,
    class_definition_id: sqlInteger(
      row,
      'class_definition_id',
    ) as ClassDefinitionId,
    class_name: sqlString(row, 'class_name'),
    class_catalog_layer: catalogLayerDisclosure(
      sqlNullableString(row, 'class_catalog_layer'),
    ),
  };
}

function decodeSpellbookAcquisition(row: SqlRow): SpellbookAcquisition {
  return {
    source_instance_id: sqlInteger(
      row,
      'source_instance_id',
    ) as SourceInstanceId,
    spell_version_id: sqlInteger(
      row,
      'spell_version_id',
    ) as SpellVersionId,
  };
}

function decodeSpellFacts(row: SqlRow): Omit<
  SpellFacts,
  'reference'
> & { readonly reference: Omit<
    SheetSpellReference,
    | 'upcast_levels'
    | 'cantrip_upgrade_levels'
    | 'attack_modes'
    | 'save_abilities'
  > } {
  return {
    spell_version_id: sqlInteger(row, 'id') as SpellVersionId,
    name: sqlString(row, 'display_name'),
    catalog_layer: catalogLayerDisclosure(
      sqlNullableString(row, 'catalog_layer'),
    ),
    level: spellLevel(sqlInteger(row, 'level')),
    reference: {
      edition: rulesEdition(sqlString(row, 'rules_edition')),
      school: sqlSpellSchool(row, 'school'),
      casting_time: sqlNullableString(row, 'casting_time'),
      action_type: sqlNullableString(row, 'action_type'),
      range: sqlNullableString(row, 'range'),
      duration: sqlNullableString(row, 'duration'),
      components: sqlNullableString(row, 'components'),
      concentration: sqlBoolean(row, 'concentration'),
      ritual: sqlBoolean(row, 'ritual'),
      upcast_summary: sqlNullableString(row, 'upcast_summary'),
      cantrip_upgrade_summary: sqlNullableString(
        row,
        'cantrip_upgrade_summary',
      ),
      description: sqlNullableString(row, 'short_summary'),
    },
  };
}

function statisticForRoute(
  route: SpellAccessRoute,
): SheetSpellcastingStatistic {
  if (route.spellcasting_ability === null) {
    return {
      status: 'absent',
      reason: 'spellcasting_ability_not_recorded',
      detail: `${route.source_name} has no spellcasting ability recorded.`,
    };
  }
  if (route.save_dc === null || route.attack_bonus === null) {
    throw new Error(
      `Evaluated spell route ${route.spell_version_id} has an ability but incomplete statistics.`,
    );
  }
  return {
    status: 'computed',
    ability: route.spellcasting_ability,
    save_dc: route.save_dc,
    attack_bonus: route.attack_bonus,
  };
}

function statisticKey(statistic: SheetSpellcastingStatistic): string {
  switch (statistic.status) {
    case 'computed':
      return JSON.stringify([
        statistic.status,
        statistic.ability,
        statistic.save_dc,
        statistic.attack_bonus,
      ]);
    case 'absent':
      return JSON.stringify([
        statistic.status,
        statistic.reason,
        statistic.detail,
      ]);
  }
  const unhandled: never = statistic;
  return unhandled;
}

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function naturalParts(value: string): string[] {
  return value.match(/\d+|\D+/g) ?? [];
}

/** Locale-independent natural ordering with exact spelling as the tie-breaker. */
function compareNaturalText(left: string, right: string): number {
  const leftParts = naturalParts(left.toLowerCase());
  const rightParts = naturalParts(right.toLowerCase());
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }
    if (leftPart === rightPart) {
      continue;
    }

    const leftIsNumber = /^\d+$/.test(leftPart);
    const rightIsNumber = /^\d+$/.test(rightPart);
    if (leftIsNumber && rightIsNumber) {
      const leftNumber = Number(leftPart);
      const rightNumber = Number(rightPart);
      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }
      if (leftPart.length !== rightPart.length) {
        return leftPart.length - rightPart.length;
      }
    }
    return compareText(leftPart, rightPart);
  }

  return compareText(left, right);
}

function compareGroups(left: MutableGroup, right: MutableGroup): number {
  if (left.kind === 'class' && right.kind === 'other_source') {
    return -1;
  }
  if (left.kind === 'other_source' && right.kind === 'class') {
    return 1;
  }
  const leftName =
    left.kind === 'class' ? left.class_name : left.source_name;
  const rightName =
    right.kind === 'class' ? right.class_name : right.source_name;
  if (leftName !== rightName) {
    return compareNaturalText(leftName, rightName);
  }
  const leftId =
    left.kind === 'class'
      ? left.class_definition_id
      : left.source_instance_id;
  const rightId =
    right.kind === 'class'
      ? right.class_definition_id
      : right.source_instance_id;
  return leftId - rightId;
}

export class CharacterSpellSectionBuilder {
  readonly #access: SpellAccessBuilder;

  constructor(
    private readonly db: DatabaseContext,
    access?: SpellAccessBuilder,
  ) {
    this.#access = access ?? new SpellAccessBuilder(db);
  }

  build(characterId: number): CharacterSpellSection {
    const spellbook = this.spellbookAcquisitions(characterId);
    const hasStoredAssignment = this.db.scalar<number>(
      `SELECT 1
       FROM spell_selection_slots
       WHERE character_id = ?
         AND (current_spell_version_id IS NOT NULL
              OR fixed_spell_version_id IS NOT NULL)
       LIMIT 1`,
      [characterId],
    );
    const selected = hasStoredAssignment === null
      ? []
      : this.#access
          .buildForCharacter(characterId)
          .map((route) => ({ route, marker: sheetSpellMarker(route) }))
          .filter(
            (
              entry,
            ): entry is {
              readonly route: SpellAccessRoute;
              readonly marker: SheetSpellMarker;
            } => entry.marker !== null,
          );
    if (selected.length === 0 && spellbook.length === 0) {
      return [];
    }

    const sourceIds = [
      ...new Set(
        [
          ...selected.map(
            ({ route }) => route.source_instance_id as SourceInstanceId,
          ),
          ...spellbook.map((entry) => entry.source_instance_id),
        ],
      ),
    ];
    const attributions = this.classAttributions(characterId, sourceIds);
    const facts = this.spellFacts(
      [
        ...new Set([
          ...selected.map(
            ({ route }) => route.spell_version_id as SpellVersionId,
          ),
          ...spellbook.map((entry) => entry.spell_version_id),
        ]),
      ],
    );
    const groups = new Map<string, MutableGroup>();

    for (const { route, marker } of selected) {
      const sourceId = route.source_instance_id as SourceInstanceId;
      const attribution = attributions.get(sourceId);
      const key =
        attribution === undefined
          ? `source:${sourceId}`
          : `class:${attribution.class_definition_id}`;
      let group = groups.get(key);
      if (group === undefined) {
        group =
          attribution === undefined
            ? {
                kind: 'other_source',
                source_instance_id: sourceId,
                source_name: route.source_name,
                source_catalog_layer: route.source_catalog_layer,
                statistics: new Map(),
                spells: new Map(),
              }
            : {
                kind: 'class',
                class_definition_id: attribution.class_definition_id,
                class_name: attribution.class_name,
                class_catalog_layer: attribution.class_catalog_layer,
                statistics: new Map(),
                spells: new Map(),
                spellbook: new Map(),
              };
        groups.set(key, group);
      }

      const statistic = statisticForRoute(route);
      group.statistics.set(statisticKey(statistic), statistic);

      const versionId = route.spell_version_id as SpellVersionId;
      const existing = group.spells.get(versionId);
      if (existing !== undefined) {
        if (existing.marker === 'known' && marker === 'prepared') {
          group.spells.set(versionId, { ...existing, marker });
        }
        continue;
      }
      const spellFacts = facts.get(versionId);
      if (spellFacts === undefined) {
        throw new Error(`Missing sheet facts for spell version ${versionId}.`);
      }
      group.spells.set(versionId, { ...spellFacts, marker });
    }

    for (const entry of spellbook) {
      const attribution = attributions.get(entry.source_instance_id);
      if (attribution === undefined) {
        // A legacy row without class attribution stays stored, but the sheet
        // does not invent a class heading for it (D33).
        continue;
      }
      const key = `class:${attribution.class_definition_id}`;
      let group = groups.get(key);
      if (group === undefined) {
        group = {
          kind: 'class',
          class_definition_id: attribution.class_definition_id,
          class_name: attribution.class_name,
          class_catalog_layer: attribution.class_catalog_layer,
          statistics: new Map(),
          spells: new Map(),
          spellbook: new Map(),
        };
        groups.set(key, group);
      }
      if (group.kind !== 'class' || group.spells.has(entry.spell_version_id)) {
        continue;
      }
      const spellFacts = facts.get(entry.spell_version_id);
      if (spellFacts === undefined) {
        throw new Error(
          `Missing sheet facts for spellbook version ${entry.spell_version_id}.`,
        );
      }
      group.spellbook.set(entry.spell_version_id, spellFacts);
    }

    return [...groups.values()].sort(compareGroups).map((group) => {
      const common = {
        statistics: [...group.statistics.values()],
        spells: [...group.spells.values()].sort(compareSheetSpells),
      };
      if (group.kind === 'class') {
        return {
          kind: group.kind,
          class_definition_id: group.class_definition_id,
          class_name: group.class_name,
          class_catalog_layer: group.class_catalog_layer,
          spellbook: [...group.spellbook.values()].sort(compareSheetSpells),
          ...common,
        };
      }
      return {
        kind: group.kind,
        source_instance_id: group.source_instance_id,
        source_name: group.source_name,
        source_catalog_layer: group.source_catalog_layer,
        ...common,
      };
    });
  }

  private spellbookAcquisitions(
    characterId: number,
  ): SpellbookAcquisition[] {
    return this.db.all(
      `SELECT entry.source_instance_id, entry.spell_version_id
       FROM wizard_spellbook_entries AS entry
       INNER JOIN character_source_instances AS source
         ON source.id = entry.source_instance_id
        AND source.character_id = entry.character_id
        AND source.state = ?
       INNER JOIN spell_versions AS version
         ON version.id = entry.spell_version_id
        AND version.is_active = 1
       WHERE entry.character_id = ?
         AND entry.state = 'active'
         AND entry.spell_version_id IS NOT NULL
       ORDER BY entry.id`,
      [ACTIVE_SOURCE_INSTANCE_STATE, characterId],
      decodeSpellbookAcquisition,
    );
  }

  private classAttributions(
    characterId: number,
    sourceIds: readonly SourceInstanceId[],
  ): Map<SourceInstanceId, ClassAttribution> {
    const rows = this.db.all(
      `WITH RECURSIVE source_ancestry AS (
         SELECT source.id AS origin_id, source.id,
                source.parent_source_instance_id, source.source_type,
                source.source_definition_id, 0 AS depth,
                printf('/%d/', source.id) AS visited
         FROM character_source_instances AS source
         WHERE source.character_id = ?
           AND source.id IN (${placeholders(sourceIds)})

         UNION ALL

         SELECT child.origin_id, parent.id,
                parent.parent_source_instance_id, parent.source_type,
                parent.source_definition_id, child.depth + 1,
                child.visited || printf('%d/', parent.id)
         FROM source_ancestry AS child
         INNER JOIN character_source_instances AS parent
           ON parent.id = child.parent_source_instance_id
          AND parent.character_id = ?
         WHERE instr(child.visited, printf('/%d/', parent.id)) = 0
       ), class_candidates AS (
         SELECT ancestry.origin_id, ancestry.depth,
                CASE ancestry.source_type
                  WHEN 'class' THEN ancestry.source_definition_id
                  WHEN 'subclass' THEN subclass.class_definition_id
                END AS class_definition_id
         FROM source_ancestry AS ancestry
         LEFT JOIN subclass_definitions AS subclass
           ON ancestry.source_type = 'subclass'
          AND subclass.id = ancestry.source_definition_id
       )
       SELECT candidate.origin_id,
              definition.id AS class_definition_id,
              definition.name AS class_name,
              identity.catalog_layer AS class_catalog_layer
       FROM class_candidates AS candidate
       INNER JOIN class_definitions AS definition
         ON definition.id = candidate.class_definition_id
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'class'
        AND identity.content_key = definition.content_key
       ORDER BY candidate.origin_id, candidate.depth, definition.id`,
      [characterId, ...sourceIds, characterId],
      decodeClassAttribution,
    );
    const nearest = new Map<SourceInstanceId, ClassAttribution>();
    for (const row of rows) {
      if (!nearest.has(row.origin_id)) {
        nearest.set(row.origin_id, row);
      }
    }
    return nearest;
  }

  private spellFacts(
    versionIds: readonly SpellVersionId[],
  ): Map<SpellVersionId, SpellFacts> {
    const attackModes = this.groupedStrings(
      'spell_version_attack_modes',
      'attack_mode',
      versionIds,
    );
    const saveAbilities = this.groupedStrings(
      'spell_version_save_abilities',
      'save_ability',
      versionIds,
    );
    const upcastLevels = this.groupedLevels(
      'spell_version_upcast_levels',
      versionIds,
    );
    const cantripUpgradeLevels = this.groupedLevels(
      'spell_version_cantrip_upgrade_levels',
      versionIds,
    );
    const facts = new Map<SpellVersionId, SpellFacts>();

    for (const row of this.db.all(
      `SELECT version.id, version.display_name, version.rules_edition,
              version.level, version.school,
              casting_time, action_type, range, duration, concentration,
              ritual, components, short_summary, upcast_summary,
              cantrip_upgrade_summary, identity.catalog_layer
       FROM spell_versions AS version
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'spell'
        AND identity.content_key = version.content_key
       WHERE version.id IN (${placeholders(versionIds)})
       ORDER BY version.id`,
      [...versionIds],
      decodeSpellFacts,
    )) {
      facts.set(row.spell_version_id, {
        ...row,
        reference: {
          ...row.reference,
          attack_modes: attackModes.get(row.spell_version_id) ?? [],
          save_abilities: saveAbilities.get(row.spell_version_id) ?? [],
          upcast_levels: upcastLevels.get(row.spell_version_id) ?? [],
          cantrip_upgrade_levels:
            cantripUpgradeLevels.get(row.spell_version_id) ?? [],
        },
      });
    }
    return facts;
  }

  private groupedLevels(
    table:
      | 'spell_version_upcast_levels'
      | 'spell_version_cantrip_upgrade_levels',
    versionIds: readonly SpellVersionId[],
  ): Map<SpellVersionId, number[]> {
    const grouped = new Map<SpellVersionId, number[]>();
    for (const row of this.db.all(
      `SELECT spell_version_id, level
       FROM ${table}
       WHERE spell_version_id IN (${placeholders(versionIds)})
       ORDER BY spell_version_id, level`,
      [...versionIds],
      (stored) => ({
        spell_version_id: sqlInteger(
          stored,
          'spell_version_id',
        ) as SpellVersionId,
        level: sqlInteger(stored, 'level'),
      }),
    )) {
      const levels = grouped.get(row.spell_version_id);
      if (levels === undefined) {
        grouped.set(row.spell_version_id, [row.level]);
      } else {
        levels.push(row.level);
      }
    }
    return grouped;
  }

  private groupedStrings(
    table:
      | 'spell_version_attack_modes'
      | 'spell_version_save_abilities',
    column: 'attack_mode' | 'save_ability',
    versionIds: readonly SpellVersionId[],
  ): Map<SpellVersionId, string[]> {
    const grouped = new Map<SpellVersionId, string[]>();
    for (const row of this.db.all(
      `SELECT spell_version_id, ${column} AS value
       FROM ${table}
       WHERE spell_version_id IN (${placeholders(versionIds)})
       ORDER BY spell_version_id, ${column}`,
      [...versionIds],
      (stored) => ({
        spell_version_id: sqlInteger(
          stored,
          'spell_version_id',
        ) as SpellVersionId,
        value: sqlString(stored, 'value'),
      }),
    )) {
      const values = grouped.get(row.spell_version_id);
      if (values === undefined) {
        grouped.set(row.spell_version_id, [row.value]);
      } else {
        values.push(row.value);
      }
    }
    return grouped;
  }
}
