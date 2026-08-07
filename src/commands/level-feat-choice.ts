import type { DatabaseContext } from '../db/database';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type {
  LevelFeatSelection,
} from '../domain/command-contracts';
import {
  abilities,
  featAbilityPoints,
  featGroupings,
  isEnumValue,
  type Ability,
  type CharacterLevel,
  type FeatAbilityPoints,
  type KnownFeatGrouping,
} from '../domain/enums';
import type { ContentKey, SourceInstanceId } from '../domain/ids';
import type { JsonObject } from '../domain/models';
import {
  buildFeatApplicationPlan,
  decodeAbilityIncreaseAbilities,
  featSpellReplacementEntitlement,
} from '../rules/feat-application';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import type {
  ActiveFeatInstance,
  FeatApplicationPlan,
  FeatDefinitionForApplication,
  FeatPrerequisite,
  ProjectedFeatCharacter,
} from '../builder/level-up-wizard';
import {
  featFeatureEvidenceForProjectedClasses,
  type ProjectedBundledClass,
} from '../rules/class-level-features-srd';
import { resolveCharacterAbilities } from '../rules/ability-contributions';
import { GrantRule } from '../grants/grant-rule';
import { decodeGrantJson } from '../grants/source-rule-reader';
import { canonicalJson } from './canonical-json';
import { appendSourceEffects } from './equipment-effects';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function decodedRecord(value: string | null, label: string): JsonObject {
  if (value === null || value === '') {
    return {};
  }
  const decoded = decodeGrantJson(value);
  return record(decoded, label) as JsonObject;
}

function prerequisites(value: string | null): readonly FeatPrerequisite[] {
  const decoded = decodeGrantJson(value);
  if (!Array.isArray(decoded)) {
    throw new TypeError('Feat prerequisites must be a list.');
  }
  return decoded.map((entry): FeatPrerequisite => {
    const item = record(entry, 'Feat prerequisite');
    if (item.kind === 'feature') {
      if (
        item.feature !== 'fighting_style' &&
        item.feature !== 'spellcasting'
      ) {
        throw new TypeError('Feat prerequisite names an unsupported feature.');
      }
      return { kind: 'feature', feature: item.feature };
    }
    if (item.kind === 'ability_score') {
      if (
        !Array.isArray(item.abilities) ||
        item.abilities.length === 0 ||
        !item.abilities.every((ability) => isEnumValue(abilities, ability)) ||
        !Number.isSafeInteger(item.minimum) ||
        Number(item.minimum) < 1 ||
        Number(item.minimum) > 30
      ) {
        throw new TypeError('Feat ability prerequisite is malformed.');
      }
      return {
        kind: 'ability_score',
        abilities: item.abilities as readonly Ability[],
        minimum: Number(item.minimum),
      };
    }
    throw new TypeError('Feat prerequisite kind is unsupported.');
  });
}

export function levelFeatDefinitionFromDatabase(
  db: DatabaseContext,
  contentKey: string,
): FeatDefinitionForApplication & {
  readonly id: number;
  readonly catalog_layer: CatalogLayerDisclosure;
} {
  const row = db.oneRaw(
    `SELECT definition.id, definition.content_key, definition.name,
            definition.category, definition.min_level,
            definition.ability_points, definition.ability_increase_abilities,
            definition.ability_increase_maximum, definition.repeatable,
            definition.prerequisites, definition.grant_rules,
            definition.notes, identity.catalog_layer
     FROM feat_definitions AS definition
     LEFT JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'feat'
      AND identity.content_key = definition.content_key
     WHERE definition.content_key = ?`,
    [contentKey],
  );
  if (row === null) {
    throw new TypeError('The selected feat definition is unavailable.');
  }
  if (!isEnumValue(featGroupings, row.category)) {
    throw new TypeError('The selected feat has an unsupported grouping.');
  }
  const points = sqlInteger(row, 'ability_points');
  if (!(featAbilityPoints as readonly number[]).includes(points)) {
    throw new TypeError('The selected feat has an invalid ability point budget.');
  }
  const rules = decodeGrantJson(sqlNullableString(row, 'grant_rules'));
  if (!Array.isArray(rules)) {
    throw new TypeError('Feat grant rules must be a list.');
  }
  const minimum = row.min_level === null ? null : sqlInteger(row, 'min_level');
  if (minimum !== null && (minimum < 1 || minimum > 20)) {
    throw new TypeError('The selected feat has an invalid minimum level.');
  }
  const maximum =
    row.ability_increase_maximum === null
      ? null
      : sqlInteger(row, 'ability_increase_maximum');
  return {
    id: sqlInteger(row, 'id'),
    content_key: contentKey as ContentKey,
    catalog_layer: catalogLayerDisclosure(
      sqlNullableString(row, 'catalog_layer'),
    ),
    name: sqlString(row, 'name'),
    grouping: row.category as KnownFeatGrouping,
    min_level: minimum as CharacterLevel | null,
    ability_points: points as FeatAbilityPoints,
    ability_increase_abilities: decodeAbilityIncreaseAbilities(
      sqlNullableString(row, 'ability_increase_abilities'),
    ),
    ability_increase_maximum: maximum,
    repeatable: sqlInteger(row, 'repeatable') === 1,
    prerequisites: prerequisites(sqlNullableString(row, 'prerequisites')),
    grant_rules: rules.map((rule) =>
      GrantRule.fromObject(record(rule, 'Feat grant rule')).toObject(),
    ),
    notes: sqlNullableString(row, 'notes') ?? '',
  };
}

function projectedClasses(
  db: DatabaseContext,
  characterId: number,
  advancedClassDefinitionId: number | null,
  targetClassLevel: number | null,
  targetSubclassContentKey: string | null,
): readonly ProjectedBundledClass[] {
  return db.allRaw(
    `SELECT ccl.class_definition_id, ccl.level, cd.name,
            sd.content_key AS subclass_content_key
     FROM character_class_levels ccl
     JOIN class_definitions cd ON cd.id = ccl.class_definition_id
     LEFT JOIN subclass_definitions sd ON sd.id = ccl.subclass_definition_id
     WHERE ccl.character_id = ?
     ORDER BY ccl.id`,
    [characterId],
  ).map((row) => {
    const classDefinitionId = sqlInteger(row, 'class_definition_id');
    const isAdvanced = classDefinitionId === advancedClassDefinitionId;
    const level = isAdvanced && targetClassLevel !== null
      ? targetClassLevel
      : sqlInteger(row, 'level');
    if (level < 1 || level > 20) {
      throw new TypeError('A projected class level must be between 1 and 20.');
    }
    const storedSubclass = sqlNullableString(row, 'subclass_content_key');
    return {
      class_name: sqlString(row, 'name'),
      class_level: level as CharacterLevel,
      subclass_content_key: (
        isAdvanced && targetSubclassContentKey !== null
          ? targetSubclassContentKey
          : storedSubclass
      ) as ContentKey | null,
    };
  });
}

function projectedCharacter(
  db: DatabaseContext,
  characterId: number,
  projectedTotalLevel: number,
  advancedClassDefinitionId: number | null,
  targetClassLevel: number | null,
  targetSubclassContentKey: string | null,
): ProjectedFeatCharacter {
  if (projectedTotalLevel < 1 || projectedTotalLevel > 20) {
    throw new TypeError('Projected character level must be between 1 and 20.');
  }
  const base = db.one(
    `SELECT strength, dexterity, constitution, intelligence, wisdom, charisma
     FROM characters WHERE id = ?`,
    [characterId],
    (row) => Object.fromEntries(
      abilities.map((ability) => [ability, sqlInteger(row, ability)]),
    ) as Record<Ability, number>,
  );
  if (base === null) {
    throw new TypeError('Unknown character.');
  }
  const resolved = resolveCharacterAbilities(db, characterId, base);
  const activeFeats: ActiveFeatInstance[] = db.allRaw(
    `SELECT fd.content_key, csi.config
     FROM character_source_instances csi
     JOIN feat_definitions fd ON fd.id = csi.source_definition_id
     WHERE csi.character_id = ? AND csi.source_type = 'feat'
       AND csi.state = 'active'
     ORDER BY csi.id`,
    [characterId],
  ).map((row) => ({
    feat_content_key: sqlString(row, 'content_key') as ContentKey,
    config: decodedRecord(sqlNullableString(row, 'config'), 'Feat source config'),
  }));
  const classes = projectedClasses(
    db,
    characterId,
    advancedClassDefinitionId,
    targetClassLevel,
    targetSubclassContentKey,
  );
  return {
    total_level: projectedTotalLevel as CharacterLevel,
    ability_scores: Object.fromEntries(
      abilities.map((ability) => [ability, resolved[ability].total]),
    ) as Readonly<Record<Ability, number>>,
    feature_evidence: featFeatureEvidenceForProjectedClasses(classes),
    active_feats: activeFeats,
  };
}

export interface ApplyLevelFeatSelectionInput {
  readonly characterId: number;
  readonly selection: LevelFeatSelection;
  readonly projectedTotalLevel: number;
  readonly advancedClassDefinitionId: number | null;
  readonly targetClassLevel: number | null;
  readonly targetSubclassContentKey: string | null;
  readonly requiredGrouping?: KnownFeatGrouping;
}

function preparedLevelFeatSelection(
  db: DatabaseContext,
  input: ApplyLevelFeatSelectionInput,
) {
  const definition = levelFeatDefinitionFromDatabase(
    db,
    input.selection.feat_content_key,
  );
  if (
    input.requiredGrouping !== undefined &&
    definition.grouping !== input.requiredGrouping
  ) {
    throw new TypeError(
      `This occurrence requires a ${input.requiredGrouping} feat.`,
    );
  }
  const plan = buildFeatApplicationPlan({
    definition,
    character: projectedCharacter(
      db,
      input.characterId,
      input.projectedTotalLevel,
      input.advancedClassDefinitionId,
      input.targetClassLevel,
      input.targetSubclassContentKey,
    ),
    config: input.selection.config,
    ability_increases: input.selection.ability_increases,
  });
  return { definition, plan };
}

/** Trusted pure projection shared by planned search and final persistence. */
export function planLevelFeatSelection(
  db: DatabaseContext,
  input: ApplyLevelFeatSelectionInput,
): FeatApplicationPlan {
  return preparedLevelFeatSelection(db, input).plan;
}

/** Sourced replacement entitlement for one persisted bundled feat. */
export function levelFeatSpellReplacementEntitlement(
  db: DatabaseContext,
  contentKey: string,
) {
  return featSpellReplacementEntitlement(
    levelFeatDefinitionFromDatabase(db, contentKey),
  );
}

/** Recheck, persist, apply effects, then generate every feat-owned grant. */
export function applyLevelFeatSelection(
  db: DatabaseContext,
  generator: GrantRuleSlotGenerator,
  input: ApplyLevelFeatSelectionInput,
): SourceInstanceId {
  const { definition, plan } = preparedLevelFeatSelection(db, input);
  if (plan.eligibility.status !== 'qualified') {
    throw new TypeError(
      `The selected feat is ${plan.eligibility.status} for this character.`,
    );
  }
  const timestamp = new Date().toISOString();
  const list = input.selection.config.chosen_list;
  const displayName =
    typeof list === 'string' && list !== ''
      ? `${definition.name}: ${list}`
      : definition.name;
  const sourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state,
       created_at, updated_at
     ) VALUES (?, ?, 'feat', ?, ?, ?, ?, 'active', ?, ?)`,
    [
      input.characterId,
      crypto.randomUUID(),
      definition.id,
      displayName,
      canonicalJson(plan.config),
      input.projectedTotalLevel,
      timestamp,
      timestamp,
    ],
  ).lastInsertId;
  appendSourceEffects(
    db,
    input.characterId,
    sourceId,
    plan.effects,
  );
  generator.generateForSource(sourceId);
  return sourceId as SourceInstanceId;
}
