import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import {
  parseJson,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  CharacterId,
  CharacterRevision,
  ContentKey,
} from '../domain/ids';
import type { JsonObject } from '../domain/models';
import {
  CharacterSheetBuilder,
  type CharacterSheet,
} from '../queries/character-sheet-builder';
import { abilities, isEnumValue, skills, type Skill } from '../domain/enums';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportEntryOutcome,
  type ContentImportNode,
  type ContentImportPlan,
  type ContentImportReviewRow,
} from '../catalog/content-adoption';
import { resolveContentReference } from '../catalog/content-registry';
import { spellCatalogDisclosure } from '../catalog/spell-catalog-disclosure';
import { installedTargetContentReferenceImportNode } from '../backup/portable-content';
import {
  applyGuidedBackgroundChoices,
  applyGuidedOrigin,
  GUIDED_BACKGROUND_SOURCE_MARKER,
  GUIDED_SPECIES_SOURCE_MARKER,
} from '../builder/guided-creation';
import { BACKGROUND_ABILITY_INCREASE_MAXIMUM } from '../builder/background-choices';
import {
  ORIGIN_FEAT_CONFIG_CONFIG,
  ORIGIN_FEAT_KEY_CONFIG,
} from '../rules/background-definitions-srd';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import {
  configuredChoiceSlotGenerator,
  reconcileCharacterLevelDependentSource,
} from '../grants/character-level-source-reconciliation';
import { fillSkillGrant, SkillGrantRefusal } from '../grants/skill-grants';
import {
  fillSkillExpertiseGrant,
  SkillExpertiseGrantRefusal,
} from '../grants/skill-expertise-grants';
import {
  eligibilityInvalidReasons,
  SpellSelectionEligibility,
} from '../eligibility/spell-selection-eligibility';
import { syncSubclassSources } from '../commands/update-class';
import {
  EQUIPMENT_CHOICE_CONFIG_KEY,
  guidedBuildPath,
  SKILL_GRANT_KEYS,
} from '../builder/contracts';
import type {
  AuthoredContentKind,
  AuthoringErrorData,
  ReplacementChoiceSelection,
  ReplacementDecision,
  ReplacementPlan,
  ReplacementNotice,
  ReplacementRuleChange,
  ReplacementReviewItem,
  ReplacementResult,
  ReplacementTokenFacts,
} from './contracts';
import type { ReplacementPlanToken } from './ids';

const NODE_ID = 'authoring:reference-retarget';

export class ReferenceRetargetError extends Error {
  constructor(
    message: string,
    readonly data: AuthoringErrorData,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ReferenceRetargetError';
  }
}

interface CharacterReference {
  readonly kind: AuthoredContentKind;
  readonly characterName: string;
  readonly revision: CharacterRevision;
}

function authoredKind(value: string): AuthoredContentKind {
  switch (value) {
    case 'species':
    case 'background':
    case 'subclass':
      return value;
  }
  throw new ReferenceRetargetError('The content reference is not authorable.', {
    reason: 'invalid_reference',
  });
}

function characterReference(
  db: DatabaseContext,
  input: {
    readonly characterId: CharacterId;
    readonly oldContentKey: ContentKey;
  },
): CharacterReference {
  const identity = db.one(
    `SELECT content_kind, catalog_layer, archived_at
     FROM catalog_content_identities
     WHERE content_key = ? AND content_kind IN ('species', 'background', 'subclass')`,
    [input.oldContentKey],
    (row) => ({
      kind: authoredKind(sqlString(row, 'content_kind')),
      layer: sqlString(row, 'catalog_layer'),
      archivedAt: sqlNullableString(row, 'archived_at'),
    }),
  );
  if (identity === null) {
    throw new ReferenceRetargetError('The old content reference was not found.', {
      reason: 'content_not_found',
    });
  }
  if (identity.layer !== 'external') {
    throw new ReferenceRetargetError('Only external content may be retargeted.', {
      reason: 'invalid_reference',
    });
  }
  if (identity.archivedAt !== null) {
    throw new ReferenceRetargetError('Archived content cannot be retargeted.', {
      reason: 'replacement_refused',
      refusal: 'archived_reference',
    });
  }
  const character = db.one(
    'SELECT name, revision, archived_at FROM characters WHERE id = ?',
    [input.characterId],
    (row) => ({
      name: sqlString(row, 'name'),
      revision: sqlInteger(row, 'revision') as CharacterRevision,
      archivedAt: sqlNullableString(row, 'archived_at'),
    }),
  );
  if (character === null) {
    throw new ReferenceRetargetError('The character was not found.', {
      reason: 'character_not_found',
    });
  }
  if (character.archivedAt !== null) {
    throw new ReferenceRetargetError('Archived characters cannot be retargeted.', {
      reason: 'replacement_refused',
      refusal: 'archived_reference',
    });
  }
  const definitionTable = identity.kind === 'species'
    ? 'species_definitions'
    : identity.kind === 'background'
      ? 'background_definitions'
      : 'subclass_definitions';
  const referenced = identity.kind === 'subclass'
    ? db.scalar<number>(
        `SELECT 1
         FROM character_class_levels AS level
         JOIN ${definitionTable} AS definition
           ON definition.id = level.subclass_definition_id
         WHERE level.character_id = ? AND definition.content_key = ?`,
        [input.characterId, input.oldContentKey],
      )
    : db.scalar<number>(
        `SELECT 1
         FROM character_source_instances AS source
         JOIN ${definitionTable} AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = ?
           AND source.state = 'active' AND definition.content_key = ?`,
        [input.characterId, identity.kind, input.oldContentKey],
      );
  if (referenced !== 1) {
    throw new ReferenceRetargetError('The character does not use the old reference.', {
      reason: 'replacement_refused',
      refusal: 'character_reference_not_found',
    });
  }
  return Object.freeze({
    kind: identity.kind,
    characterName: character.name,
    revision: character.revision,
  });
}

function operationIdentity(facts: ReplacementTokenFacts): string {
  return sha256(canonicalJson({
    operation: 'authoring.reference-retarget',
    facts,
  }));
}

function encodedToken(
  facts: ReplacementTokenFacts,
  importToken: string,
): ReplacementPlanToken {
  const digest = sha256(canonicalJson({
    operation_identity: operationIdentity(facts),
    import_plan_token: importToken,
  }));
  return JSON.stringify([facts, digest]) as ReplacementPlanToken;
}

function decodedFacts(token: ReplacementPlanToken): ReplacementTokenFacts | null {
  let decoded: unknown;
  try {
    decoded = JSON.parse(token);
  } catch {
    return null;
  }
  if (!Array.isArray(decoded) || decoded.length !== 2) return null;
  const facts = decoded[0];
  if (facts === null || typeof facts !== 'object' || Array.isArray(facts)) return null;
  const candidate = facts as Partial<ReplacementTokenFacts>;
  return (
    (candidate.content_kind === 'species' ||
      candidate.content_kind === 'background' ||
      candidate.content_kind === 'subclass') &&
    typeof candidate.old_content_key === 'string' &&
    typeof candidate.new_content_key === 'string' &&
    Number.isSafeInteger(candidate.character_id) &&
    Number.isSafeInteger(candidate.character_revision)
  ) ? candidate as ReplacementTokenFacts : null;
}

function importNodeAndPlan(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  choices: ContentImportChoices = Object.freeze({}),
): { readonly node: ContentImportNode; readonly plan: ContentImportPlan } {
  const resolution = resolveContentReference(db, {
    kind: facts.content_kind,
    contentKey: facts.new_content_key,
  });
  if (resolution.kind === 'missing') {
    throw new ReferenceRetargetError('The target content was not found.', {
      reason: 'content_not_found',
    });
  }
  if (resolution.kind === 'ambiguous') {
    throw new ReferenceRetargetError('The target content reference is ambiguous.', {
      reason: 'replacement_refused',
      refusal: 'ambiguous_target',
    });
  }
  assertActiveReplacementTarget(db, facts.content_kind, resolution.contentKey);
  const node = installedTargetContentReferenceImportNode(db, {
    id: NODE_ID,
    kind: facts.content_kind,
    incomingContentKey: facts.new_content_key,
    localContentKey: resolution.contentKey,
    allowRememberedDecision: false,
  });
  return Object.freeze({
    node,
    plan: planContentImport(
      db,
      [node],
      choices,
      Object.freeze([]),
      operationIdentity(facts),
    ),
  });
}

function assertActiveReplacementTarget(
  db: DatabaseContext,
  kind: AuthoredContentKind,
  contentKey: ContentKey,
): void {
  const archivedAt = db.scalar<string>(
    `SELECT archived_at
     FROM catalog_content_identities
     WHERE content_kind = ? AND content_key = ?`,
    [kind, contentKey],
  );
  if (archivedAt !== null) {
    throw new ReferenceRetargetError(
      'Archived content cannot be a replacement target.',
      {
        reason: 'replacement_refused',
        refusal: 'archived_reference',
      },
    );
  }
}

function nonRefusedOutcome(plan: ContentImportPlan): Exclude<
  ContentImportEntryOutcome,
  { readonly kind: 'refused' }
> {
  const outcome = plan.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') {
    throw new ReferenceRetargetError('The target content could not be resolved safely.', {
      reason: 'replacement_refused',
      refusal: 'target_integrity_refused',
    });
  }
  return outcome;
}

function targetName(db: DatabaseContext, kind: AuthoredContentKind, key: ContentKey): string {
  const table = kind === 'species'
    ? 'species_definitions'
    : kind === 'background'
      ? 'background_definitions'
      : 'subclass_definitions';
  const name = db.scalar<string>(`SELECT name FROM ${table} WHERE content_key = ?`, [key]);
  if (name === null) {
    throw new ReferenceRetargetError('The resolved target aggregate is missing.', {
      reason: 'content_not_found',
    });
  }
  return name;
}

function replacementReviewItem(row: ContentImportReviewRow): ReplacementReviewItem {
  const common = {
    candidate_content_key: row.targetContentKey,
    candidate_name: row.localName,
    candidate_catalog_layer: row.localCatalogLayer,
  };
  switch (row.matchClass) {
    case 'key-collision':
      return Object.freeze({
        ...common,
        reason: row.matchClass,
        default_decision: null,
        clone_name: row.cloneName,
      });
    case 'installed-target':
      return Object.freeze({
        ...common,
        reason: row.matchClass,
        default_decision: 'match',
        clone_name: row.cloneName,
      });
    case 'alias':
    case 'compatible-fingerprint':
    case 'srd-fallback':
    case 'metadata-conflict':
      return Object.freeze({
        ...common,
        reason: row.matchClass,
        default_decision: 'match',
      });
  }
}

function replacementRuleChanges(
  before: CharacterSheet,
  after: CharacterSheet,
): readonly ReplacementRuleChange[] {
  const changes: ReplacementRuleChange[] = [];
  const add = (label: string, previous: string, next: string): void => {
    if (previous === next) return;
    changes.push(Object.freeze({ label, before: previous, after: next }));
  };
  const number = (value: number | null): string =>
    value === null ? 'UNKNOWN' : String(value);
  add('Hit Point Maximum', number(before.hit_point_maximum.value), number(after.hit_point_maximum.value));
  add('Armor Class', String(before.armor_class.value), String(after.armor_class.value));
  add('Initiative', String(before.initiative.value), String(after.initiative.value));
  add('Passive Perception', number(before.passive_perception.value), number(after.passive_perception.value));
  const walkingSpeed = (sheet: CharacterSheet): string =>
    sheet.walking_speed.kind === 'known'
      ? `${String(sheet.walking_speed.value)} feet`
      : 'UNKNOWN';
  add('Walking Speed', walkingSpeed(before), walkingSpeed(after));
  const knownNumber = (value: CharacterSheet['lineage_darkvision']): string => {
    if (value === null) return 'None';
    return value.kind === 'known' ? `${String(value.value)} feet` : 'UNKNOWN';
  };
  add('Darkvision', knownNumber(before.lineage_darkvision), knownNumber(after.lineage_darkvision));
  const list = (values: readonly string[]): string =>
    values.length === 0 ? 'None' : [...values].sort().join(', ');
  add('Damage Resistances', list(before.damage_resistances), list(after.damage_resistances));
  add(
    'Resistances awaiting a choice',
    list(before.unchosen_damage_resistances),
    list(after.unchosen_damage_resistances),
  );
  add(
    'Attacks with the Attack action',
    String(before.attacks_per_action.count),
    String(after.attacks_per_action.count),
  );

  const mapNumbers = <T extends { readonly label: string; readonly value: number | null }>(
    values: readonly T[],
  ): ReadonlyMap<string, string> => new Map(values.map((value) => [
    value.label,
    number(value.value),
  ]));
  const compareMaps = (
    previous: ReadonlyMap<string, string>,
    next: ReadonlyMap<string, string>,
  ): void => {
    const labels = new Set([...previous.keys(), ...next.keys()]);
    for (const label of labels) {
      add(label, previous.get(label) ?? 'Not on the sheet', next.get(label) ?? 'Not on the sheet');
    }
  };
  compareMaps(mapNumbers(before.ability_scores), mapNumbers(after.ability_scores));
  compareMaps(mapNumbers(before.saves), mapNumbers(after.saves));
  compareMaps(mapNumbers(before.skills), mapNumbers(after.skills));

  const featureValues = (sheet: CharacterSheet): ReadonlyMap<string, string> =>
    new Map(sheet.feature_values.map((value) => [
      value.label,
      value.status === 'unavailable'
        ? 'UNKNOWN'
        : 'die_size' in value
          ? `${String(value.value)}d${String(value.die_size)}`
          : String(value.value),
    ]));
  compareMaps(featureValues(before), featureValues(after));

  const authoredResources = (sheet: CharacterSheet): ReadonlyMap<string, string> =>
    new Map(sheet.resources.flatMap((resource) =>
      resource.kind === 'authored'
        ? [[
            resource.label,
            resource.status === 'computed'
              ? `${String(resource.maximum)} uses`
              : 'UNKNOWN',
          ] as const]
        : []
    ));
  compareMaps(authoredResources(before), authoredResources(after));

  const printedFeatures = (sheet: CharacterSheet): ReadonlyMap<string, string> =>
    new Map(sheet.printed_features.map((feature) => [
      `${feature.source_name ?? (feature.source === 'background' ? 'Background' : 'Species')}: ${feature.name}`,
      feature.text ?? 'No rules text provided',
    ]));
  compareMaps(printedFeatures(before), printedFeatures(after));

  const proficiencySummary = (sheet: CharacterSheet): string => [
    `Armor: ${list(sheet.proficiencies.armor_training)}`,
    `Weapons: ${list(sheet.proficiencies.weapon_proficiencies.map((entry) =>
      `${entry.category}${entry.property_qualifier === null ? '' : ` (${entry.property_qualifier})`}`
    ))}`,
  ].join('; ');
  add('Proficiencies', proficiencySummary(before), proficiencySummary(after));

  const spellSummary = (sheet: CharacterSheet): string => {
    const spellNames = sheet.spells.flatMap((group) =>
      group.spells.map((spell) => spell.name)
    );
    const statistics = sheet.spells.flatMap((group) =>
      group.statistics.flatMap((statistic) => statistic.status === 'computed'
        ? [`${statistic.ability}: save DC ${String(statistic.save_dc)}, attack ${statistic.attack_bonus >= 0 ? '+' : ''}${String(statistic.attack_bonus)}`]
        : ['Spellcasting numbers unavailable'])
    );
    return `${list(spellNames)}; ${list(statistics)}`;
  };
  add('Spells and spellcasting', spellSummary(before), spellSummary(after));

  const features = (sheet: CharacterSheet): ReadonlyMap<string, string> =>
    new Map(sheet.subclass_features.map((feature) => [
      `${String(feature.class_level)}\u0000${feature.name}`,
      feature.description,
    ]));
  const previousFeatures = features(before);
  const nextFeatures = features(after);
  const featureKeys = new Set([...previousFeatures.keys(), ...nextFeatures.keys()]);
  for (const key of featureKeys) {
    const separator = key.indexOf('\u0000');
    const level = key.slice(0, separator);
    const label = key.slice(separator + 1);
    const previous = previousFeatures.get(key);
    const next = nextFeatures.get(key);
    if (previous === undefined) {
      add(label, 'Not available', `Available at class level ${level}`);
    } else if (next === undefined) {
      add(label, `Available at class level ${level}`, 'Not available');
    } else if (previous !== next) {
      add(label, previous, next);
    }
  }
  return Object.freeze(changes);
}

function planShape(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  characterName: string,
  plan: ContentImportPlan,
  notices: readonly ReplacementNotice[],
  rulesChanges: readonly ReplacementRuleChange[],
  rulesChangeReview: 'available' | 'unavailable',
  keptAt: string | null,
): ReplacementPlan {
  const outcome = nonRefusedOutcome(plan);
  const oldName = targetName(db, facts.content_kind, facts.old_content_key);
  const newName = targetName(db, facts.content_kind, outcome.contentKey);
  const common = {
    token: encodedToken(facts, plan.token),
    facts,
    character_name: characterName,
    kept_at: keptAt,
    changes: Object.freeze([Object.freeze({
      path: Object.freeze(['content_key']),
      label: `${facts.content_kind} content reference`,
      before: oldName,
      after: newName,
    })]),
    rules_changes: rulesChanges,
    rules_change_review: rulesChangeReview,
    notices,
    required_choices: Object.freeze([]),
    review: Object.freeze(plan.reviews.map(replacementReviewItem)),
  };
  switch (facts.content_kind) {
    case 'species':
      return Object.freeze({
        kind: facts.content_kind,
        ...common,
        facts: Object.freeze({ ...facts, content_kind: 'species' as const }),
        replaces: Object.freeze([
          'root_fields', 'traits', 'effects', 'grants', 'filled_choices',
        ] as const),
      });
    case 'background':
      return Object.freeze({
        kind: facts.content_kind,
        ...common,
        facts: Object.freeze({ ...facts, content_kind: 'background' as const }),
        replaces: Object.freeze([
          'ability_contributions', 'skills', 'origin_feat', 'effects', 'equipment',
        ] as const),
      });
    case 'subclass':
      return Object.freeze({
        kind: facts.content_kind,
        ...common,
        facts: Object.freeze({ ...facts, content_kind: 'subclass' as const }),
        replaces: Object.freeze([
          'subclass_reference', 'source', 'generated_effects', 'eligible_features',
        ] as const),
      });
  }
}

export function previewReferenceRetarget(
  db: DatabaseContext,
  input: {
    readonly old_content_key: ContentKey;
    readonly new_content_key: ContentKey;
    readonly character_id: CharacterId;
  },
  includeRulesReview = true,
): ReplacementPlan {
  const reference = characterReference(db, {
    characterId: input.character_id,
    oldContentKey: input.old_content_key,
  });
  const facts: ReplacementTokenFacts = Object.freeze({
    content_kind: reference.kind,
    old_content_key: input.old_content_key,
    new_content_key: input.new_content_key,
    character_id: input.character_id,
    character_revision: reference.revision,
  });
  const { plan } = importNodeAndPlan(db, facts);
  const outcome = nonRefusedOutcome(plan);
  assertActiveReplacementTarget(db, facts.content_kind, outcome.contentKey);
  if (facts.content_kind === 'subclass') {
    const parentIds = db.one(
      `SELECT old_subclass.class_definition_id AS old_parent_id,
              new_subclass.class_definition_id AS new_parent_id
       FROM subclass_definitions AS old_subclass
       JOIN subclass_definitions AS new_subclass
       WHERE old_subclass.content_key = ? AND new_subclass.content_key = ?`,
      [facts.old_content_key, outcome.contentKey],
      (row) => ({
        oldParentId: sqlInteger(row, 'old_parent_id'),
        newParentId: sqlInteger(row, 'new_parent_id'),
      }),
    );
    if (parentIds === null) {
      throw new ReferenceRetargetError('The resolved subclass aggregate is missing.', {
        reason: 'content_not_found',
      });
    }
    if (parentIds.oldParentId !== parentIds.newParentId) {
      throw new ReferenceRetargetError('The replacement subclass belongs to another class.', {
        reason: 'replacement_refused',
        refusal: 'wrong_parent_class',
      });
    }
  }
  let beforeSheet: CharacterSheet | null = null;
  if (includeRulesReview) {
    try {
      beforeSheet = new CharacterSheetBuilder(db).build(input.character_id);
    } catch {
      beforeSheet = null;
    }
  }
  const evaluated = evaluateRetargetCharacter(
    db,
    facts,
    outcome.contentKey,
    'preview',
    includeRulesReview,
  );
  const keptAt = db.scalar<string>(
    `SELECT decided_at FROM catalog_content_replacement_choices
     WHERE content_kind = ? AND superseded_content_key = ?
       AND successor_content_key = ? AND character_id = ?`,
    [facts.content_kind, facts.old_content_key, facts.new_content_key, facts.character_id],
  );
  return planShape(
    db,
    facts,
    reference.characterName,
    plan,
    evaluated.notices,
    beforeSheet === null || evaluated.afterSheet === null
      ? Object.freeze([])
      : replacementRuleChanges(beforeSheet, evaluated.afterSheet),
    includeRulesReview && beforeSheet !== null && evaluated.afterSheet !== null
      ? 'available'
      : 'unavailable',
    keptAt,
  );
}

function matchChoices(
  preview: ReplacementPlan,
  decisions: readonly ReplacementDecision[],
): ContentImportChoices {
  const candidates = preview.review.map((item) => item.candidate_content_key);
  const reviews = new Map(preview.review.map((item) => [
    item.candidate_content_key,
    item,
  ]));
  if (
    new Set(decisions.map((decision) => decision.candidate_content_key)).size !== decisions.length ||
    decisions.some((decision) => {
      const review = reviews.get(decision.candidate_content_key);
      if (review === undefined) return true;
      return decision.decision === 'clone' &&
        review.reason !== 'key-collision' &&
        review.reason !== 'installed-target';
    }) ||
    preview.review.some((review) =>
      review.reason !== 'installed-target' &&
      !decisions.some((decision) =>
        decision.candidate_content_key === review.candidate_content_key
      )
    )
  ) {
    throw new ReferenceRetargetError('Explicit review decisions are required.', {
      reason: 'replacement_review_required',
      candidates,
    });
  }
  const decision = decisions[0];
  if (decision === undefined) return Object.freeze({});
  return Object.freeze({
    [NODE_ID]: decision.decision === 'match'
      ? Object.freeze({ decision: 'match' as const })
      : Object.freeze({ decision: 'clone' as const, cloneName: decision.clone_name }),
  });
}

function assertNoUnimplementedChoices(
  choices: readonly ReplacementChoiceSelection[],
): void {
  if (choices.length !== 0) {
    throw new ReferenceRetargetError('The replacement choices are unsupported.', {
      reason: 'replacement_refused',
      refusal: 'unsupported_character_choices',
    });
  }
}

function backgroundParams(db: DatabaseContext, facts: ReplacementTokenFacts) {
  const source = db.one(
    `SELECT source.id, source.config
     FROM character_source_instances AS source
     JOIN background_definitions AS definition
       ON definition.id = source.source_definition_id
     WHERE source.character_id = ? AND source.source_type = 'background'
       AND source.state = 'active' AND source.notes = ?
       AND definition.content_key = ?`,
    [facts.character_id, GUIDED_BACKGROUND_SOURCE_MARKER, facts.old_content_key],
    (row) => ({ id: sqlInteger(row, 'id'), config: sqlNullableString(row, 'config') }),
  );
  if (source === null || source.config === null) {
    throw new ReferenceRetargetError('The background reference cannot be safely reapplied.', {
      reason: 'replacement_refused',
      refusal: 'unsupported_character_choices',
    });
  }
  const config = parseJson<JsonObject>(source.config, 'Background source config');
  const originKey = config[ORIGIN_FEAT_KEY_CONFIG];
  const originConfig = config[ORIGIN_FEAT_CONFIG_CONFIG] ?? {};
  if (
    typeof originKey !== 'string' || originConfig === null ||
    typeof originConfig !== 'object' || Array.isArray(originConfig)
  ) {
    throw new ReferenceRetargetError('The background choices cannot be preserved.', {
      reason: 'replacement_refused',
      refusal: 'unsupported_character_choices',
    });
  }
  const increases = db.all(
    `SELECT ability, amount
     FROM character_effects
     WHERE character_id = ? AND source_instance_id = ?
       AND effect_kind = 'ability_increase' AND maximum = ?
     ORDER BY sort_order`,
    [facts.character_id, source.id, BACKGROUND_ABILITY_INCREASE_MAXIMUM],
    (row: SqlRow) => {
      const ability = sqlString(row, 'ability');
      if (!isEnumValue(abilities, ability)) {
        throw new TypeError('Stored background increase has an unknown ability.');
      }
      return { ability, amount: sqlInteger(row, 'amount') };
    },
  );
  return {
    params: {
      character_id: facts.character_id,
      content_key: facts.new_content_key,
      increases,
      origin_feat_content_key: originKey,
      origin_feat_config: originConfig,
    },
    equipmentChoice: config[EQUIPMENT_CHOICE_CONFIG_KEY] ?? null,
  } as const;
}

interface RetargetSourceNode {
  readonly id: number;
  readonly path: readonly string[];
}

interface RetargetSpellSelection {
  readonly sourceId: number;
  readonly path: readonly string[];
  readonly ruleKey: string;
  readonly ordinal: number;
  readonly spellVersionId: number;
}

interface RetargetSkillSelection {
  readonly sourceId: number;
  readonly path: readonly string[];
  readonly ruleKey: string;
  readonly ordinal: number;
  readonly skill: Skill;
}

interface RetargetOwnedRow {
  readonly id: number;
  readonly path: readonly string[];
}

interface RetargetLevelFeatChoice extends RetargetOwnedRow {
  readonly oldSourceId: number;
}

interface RetargetState {
  readonly rootConfig: string | null;
  readonly nodes: readonly RetargetSourceNode[];
  readonly slots: readonly RetargetSpellSelection[];
  readonly spellbook: readonly RetargetSpellSelection[];
  readonly skills: readonly RetargetSkillSelection[];
  readonly expertise: readonly RetargetSkillSelection[];
  readonly manualEffects: readonly RetargetOwnedRow[];
  readonly items: readonly RetargetOwnedRow[];
  readonly levelFeatChoices: readonly RetargetLevelFeatChoice[];
}

function pathKey(path: readonly string[]): string {
  return JSON.stringify(path);
}

/**
 * Enumerates the complete source-instance tree by the generator's durable
 * child address (`grant_rule:...`). An unaddressed child cannot be mapped to a
 * different immutable aggregate, so the whole retarget refuses instead of
 * guessing from row ids or display names.
 */
function retargetSourceTree(
  db: DatabaseContext,
  rootId: number,
): readonly RetargetSourceNode[] {
  const nodes: RetargetSourceNode[] = [];
  const visit = (id: number, path: readonly string[]): void => {
    nodes.push(Object.freeze({ id, path: Object.freeze([...path]) }));
    const children = db.all(
      `SELECT id, notes FROM character_source_instances
       WHERE parent_source_instance_id = ? ORDER BY id`,
      [id],
      (row) => ({
        id: sqlInteger(row, 'id'),
        notes: sqlNullableString(row, 'notes'),
      }),
    );
    const markers = new Set<string>();
    for (const child of children) {
      if (
        child.notes === null ||
        !child.notes.startsWith('grant_rule:') ||
        markers.has(child.notes)
      ) {
        throw new ReferenceRetargetError(
          'The source tree contains a child that cannot be safely retargeted.',
          {
            reason: 'replacement_refused',
            refusal: 'unsupported_character_choices',
          },
        );
      }
      markers.add(child.notes);
      visit(child.id, [...path, child.notes]);
    }
  };
  visit(rootId, []);
  return Object.freeze(nodes);
}

function sourceIds(nodes: readonly RetargetSourceNode[]): readonly number[] {
  return nodes.map((node) => node.id);
}

function sourceIdPlaceholders(nodes: readonly RetargetSourceNode[]): string {
  return nodes.map(() => '?').join(', ');
}

/**
 * The source subtree's character-facing tables are intentionally explicit:
 * spell_selection_slots, wizard_spellbook_entries, character_skill_grants,
 * character_skill_expertise_grants, character_effects, character_items, and
 * character_level_feat_choices. Source instances themselves supply the
 * logical paths. Generated effects are regenerated; filled choices and
 * unsourced-template effects/items are remapped; an unaddressable child
 * refuses before mutation.
 */
function captureRetargetState(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  rootId: number,
): RetargetState {
  const nodes = retargetSourceTree(db, rootId);
  const ids = sourceIds(nodes);
  const placeholders = sourceIdPlaceholders(nodes);
  const paths = new Map(nodes.map((node) => [node.id, node.path]));
  const pathFor = (sourceId: number): readonly string[] => {
    const path = paths.get(sourceId);
    if (path === undefined) throw new Error('Captured source path is missing.');
    return path;
  };
  const slots = db.all(
    `SELECT source_instance_id, rule_key, ordinal, current_spell_version_id
     FROM spell_selection_slots
     WHERE source_instance_id IN (${placeholders})
       AND state IN ('active', 'kept_override')
       AND current_spell_version_id IS NOT NULL
     ORDER BY source_instance_id, rule_key, ordinal`,
    ids,
    (row) => {
      const sourceId = sqlInteger(row, 'source_instance_id');
      return Object.freeze({
        sourceId,
        path: pathFor(sourceId),
        ruleKey: sqlString(row, 'rule_key'),
        ordinal: sqlInteger(row, 'ordinal'),
        spellVersionId: sqlInteger(row, 'current_spell_version_id'),
      });
    },
  );
  const spellbook = db.all(
    `SELECT source_instance_id, rule_key, ordinal, spell_version_id
     FROM wizard_spellbook_entries
     WHERE source_instance_id IN (${placeholders}) AND state = 'active'
       AND spell_version_id IS NOT NULL
     ORDER BY source_instance_id, rule_key, ordinal`,
    ids,
    (row) => {
      const sourceId = sqlInteger(row, 'source_instance_id');
      return Object.freeze({
        sourceId,
        path: pathFor(sourceId),
        ruleKey: sqlString(row, 'rule_key'),
        ordinal: sqlInteger(row, 'ordinal'),
        spellVersionId: sqlInteger(row, 'spell_version_id'),
      });
    },
  );
  const selectedSkills = (
    table: 'character_skill_grants' | 'character_skill_expertise_grants',
  ): readonly RetargetSkillSelection[] => db.all(
    `SELECT source_instance_id, grant_key, ordinal, skill
     FROM ${table}
     WHERE source_instance_id IN (${placeholders}) AND state = 'active'
       AND skill IS NOT NULL
     ORDER BY source_instance_id, grant_key, ordinal`,
    ids,
    (row) => {
      const sourceId = sqlInteger(row, 'source_instance_id');
      const skill = sqlString(row, 'skill');
      if (!isEnumValue(skills, skill)) {
        throw new TypeError('Stored retarget skill choice is unknown.');
      }
      return Object.freeze({
        sourceId,
        path: pathFor(sourceId),
        ruleKey: sqlString(row, 'grant_key'),
        ordinal: sqlInteger(row, 'ordinal'),
        skill,
      });
    },
  );
  const ownedRows = (
    table: 'character_effects' | 'character_items',
    predicate = '',
  ): readonly RetargetOwnedRow[] => db.all(
    `SELECT id, source_instance_id FROM ${table}
     WHERE source_instance_id IN (${placeholders}) ${predicate}
     ORDER BY id`,
    ids,
    (row) => {
      const sourceId = sqlInteger(row, 'source_instance_id');
      return Object.freeze({ id: sqlInteger(row, 'id'), path: pathFor(sourceId) });
    },
  );
  const levelFeatChoices = db.all(
    `SELECT id, feat_source_instance_id
     FROM character_level_feat_choices
     WHERE feat_source_instance_id IN (${placeholders}) ORDER BY id`,
    ids,
    (row) => {
      const oldSourceId = sqlInteger(row, 'feat_source_instance_id');
      return Object.freeze({
        id: sqlInteger(row, 'id'),
        oldSourceId,
        path: pathFor(oldSourceId),
      });
    },
  );
  return Object.freeze({
    rootConfig: db.scalar<string>('SELECT config FROM character_source_instances WHERE id = ?', [rootId]),
    nodes,
    slots: Object.freeze(slots),
    spellbook: Object.freeze(spellbook),
    skills: Object.freeze(selectedSkills('character_skill_grants')),
    expertise: Object.freeze(selectedSkills('character_skill_expertise_grants')),
    manualEffects: Object.freeze(ownedRows(
      'character_effects',
      facts.content_kind === 'background'
        ? `AND template_ref IS NULL
           AND NOT (effect_kind = 'ability_increase' AND maximum = ${String(BACKGROUND_ABILITY_INCREASE_MAXIMUM)})`
        : 'AND template_ref IS NULL',
    )),
    items: Object.freeze(ownedRows('character_items')),
    levelFeatChoices: Object.freeze(levelFeatChoices),
  });
}

function retireDeletableGuidedSource(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  rootId: number,
): void {
  db.exec(
    `UPDATE character_source_instances
     SET notes = ?, state = 'tombstoned', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [`retargeted:${facts.content_kind}:${facts.old_content_key}`, rootId],
  );
  new GrantRuleSlotGenerator(db).generateForSource(rootId);
}

function targetSourceMap(
  db: DatabaseContext,
  rootId: number,
): ReadonlyMap<string, number> {
  return new Map(
    retargetSourceTree(db, rootId).map((node) => [pathKey(node.path), node.id]),
  );
}

function selectionDisclosure(
  db: DatabaseContext,
  table: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['table'],
  selectedValue: number | Skill,
): Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['selected'] {
  if (
    table === 'spell_selection_slots' ||
    table === 'wizard_spellbook_entries'
  ) {
    if (typeof selectedValue !== 'number') {
      throw new Error('A spell replacement notice has no spell version id.');
    }
    const disclosure = spellCatalogDisclosure(db, {
      kind: 'version_id',
      spell_version_id: selectedValue,
    });
    return disclosure === null
      ? Object.freeze({
          kind: 'spell_unknown' as const,
          display_name: null,
          catalog_layer: 'unknown' as const,
        })
      : Object.freeze({
          kind: 'spell' as const,
          display_name: disclosure.name,
          catalog_layer: disclosure.catalog_layer,
        });
  }
  if (typeof selectedValue !== 'string') {
    throw new Error('A skill replacement notice has no skill value.');
  }
  return Object.freeze({ kind: 'skill' as const, skill: selectedValue });
}

function replacementConsequence(
  db: DatabaseContext,
  table: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['table'],
  reason: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['reason'],
  detail: string | null,
  targetChoiceId: number | null,
): string {
  if (
    reason === 'selection_ineligible' &&
    detail === eligibilityInvalidReasons.level &&
    targetChoiceId !== null &&
    (table === 'spell_selection_slots' || table === 'wizard_spellbook_entries')
  ) {
    const levels = db.one(
      `SELECT spell_level_min, spell_level_max FROM ${table} WHERE id = ?`,
      [targetChoiceId],
      (row) => ({
        minimum: sqlInteger(row, 'spell_level_min'),
        maximum: sqlInteger(row, 'spell_level_max'),
      }),
    );
    if (levels !== null) {
      return levels.minimum === levels.maximum
        ? `the replacement allows only level ${String(levels.minimum)} spells`
        : `the replacement allows only spell levels ${String(levels.minimum)}–${String(levels.maximum)}`;
    }
  }
  switch (reason) {
    case 'target_source_missing':
      return 'the replacement has no matching source';
    case 'target_rule_missing':
      return 'the replacement has no matching choice rule';
    case 'target_rule_changed':
      return 'the replacement changed the choice rule';
    case 'selection_ineligible':
      return detail === null
        ? 'the replacement no longer allows this selection'
        : `the replacement no longer allows this selection (${detail})`;
  }
}

function replacementRepairRoute(
  facts: ReplacementTokenFacts,
  table: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['table'],
  targetChoiceId: number | null,
): Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['repair'] {
  const base = guidedBuildPath(facts.character_id);
  if (
    targetChoiceId !== null &&
    (table === 'spell_selection_slots' || table === 'wizard_spellbook_entries')
  ) {
    const addressKind = table === 'spell_selection_slots'
      ? 'slot_selection'
      : 'spellbook_acquisition';
    return Object.freeze({
      kind: 'guided_spell_choice' as const,
      href: `${base}?step=spells&repair=${addressKind}-${String(targetChoiceId)}`,
      label: 'Repair selection',
    });
  }
  return Object.freeze({
    kind: 'guided_character' as const,
    href: base,
    label: 'Review character',
  });
}

function buildInvalidSelectionNotice(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  table: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['table'],
  selection: RetargetSpellSelection | RetargetSkillSelection,
  selectedValue: number | Skill,
  reason: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['reason'],
  detail: string | null = null,
  targetChoiceId: number | null = null,
): ReplacementNotice {
  return Object.freeze({
    kind: 'retargeted_selection_invalid',
    table,
    source_path: selection.path,
    rule_key: selection.ruleKey,
    ordinal: selection.ordinal,
    selected_value: selectedValue,
    selected: selectionDisclosure(db, table, selectedValue),
    reason,
    detail,
    consequence: replacementConsequence(
      db,
      table,
      reason,
      detail,
      targetChoiceId,
    ),
    repair: replacementRepairRoute(facts, table, targetChoiceId),
  });
}

function remapRetargetState(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  state: RetargetState,
  newRootId: number,
): readonly ReplacementNotice[] {
  const notices: ReplacementNotice[] = [];
  const invalidSelectionNotice = (
    table: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['table'],
    selection: RetargetSpellSelection | RetargetSkillSelection,
    selectedValue: number | Skill,
    reason: Extract<ReplacementNotice, { kind: 'retargeted_selection_invalid' }>['reason'],
    detail: string | null = null,
    targetChoiceId: number | null = null,
  ): ReplacementNotice => buildInvalidSelectionNotice(
    db,
    facts,
    table,
    selection,
    selectedValue,
    reason,
    detail,
    targetChoiceId,
  );
  const targets = targetSourceMap(db, newRootId);
  const targetFor = (path: readonly string[]): number | null =>
    targets.get(pathKey(path)) ?? null;
  const requiredTargetFor = (path: readonly string[]): number => {
    const target = targetFor(path);
    if (target === null) {
      throw new ReferenceRetargetError(
        'Source-owned character state cannot be mapped to the replacement.',
        {
          reason: 'replacement_refused',
          refusal: 'unsupported_character_choices',
        },
      );
    }
    return target;
  };

  const manualEffectIds = new Set(state.manualEffects.map((row) => row.id));
  const oldIds = sourceIds(state.nodes);
  const placeholders = sourceIdPlaceholders(state.nodes);
  const generatedPredicate = manualEffectIds.size === 0
    ? ''
    : `AND id NOT IN (${[...manualEffectIds].map(() => '?').join(', ')})`;
  db.exec(
    `DELETE FROM character_effects
     WHERE source_instance_id IN (${placeholders}) ${generatedPredicate}`,
    [...oldIds, ...manualEffectIds],
  );
  for (const effect of state.manualEffects) {
    db.exec(
      'UPDATE character_effects SET source_instance_id = ? WHERE id = ?',
      [requiredTargetFor(effect.path), effect.id],
    );
  }
  for (const item of state.items) {
    db.exec(
      'UPDATE character_items SET source_instance_id = ? WHERE id = ?',
      [requiredTargetFor(item.path), item.id],
    );
  }

  const eligibility = new SpellSelectionEligibility(db);
  for (const selection of state.slots) {
    const sourceId = targetFor(selection.path);
    if (sourceId === null) {
      notices.push(invalidSelectionNotice(
        'spell_selection_slots', selection, selection.spellVersionId,
        'target_source_missing',
      ));
      continue;
    }
    const target = db.one(
      `SELECT id, fixed_spell_version_id, is_locked
       FROM spell_selection_slots
       WHERE source_instance_id = ? AND rule_key = ? AND ordinal = ?
         AND state IN ('active', 'kept_override')`,
      [sourceId, selection.ruleKey, selection.ordinal],
      (row) => ({
        id: sqlInteger(row, 'id'),
        fixedSpellVersionId: sqlNullableInteger(row, 'fixed_spell_version_id'),
        locked: sqlInteger(row, 'is_locked') === 1,
      }),
    );
    if (target === null) {
      notices.push(invalidSelectionNotice(
        'spell_selection_slots', selection, selection.spellVersionId,
        'target_rule_missing',
      ));
      continue;
    }
    if (target.fixedSpellVersionId !== null || target.locked) {
      notices.push(invalidSelectionNotice(
        'spell_selection_slots', selection, selection.spellVersionId,
        'target_rule_changed',
      ));
      continue;
    }
    db.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [selection.spellVersionId, target.id],
    );
    eligibility.refresh(target.id);
    const evaluation = db.one(
      `SELECT selection_eligibility, selection_invalid_reason
       FROM spell_selection_slots WHERE id = ?`,
      [target.id],
      (row) => ({
        status: sqlString(row, 'selection_eligibility'),
        reason: sqlNullableString(row, 'selection_invalid_reason'),
      }),
    );
    if (evaluation?.status === 'invalid') {
      notices.push(invalidSelectionNotice(
        'spell_selection_slots', selection, selection.spellVersionId,
        'selection_ineligible', evaluation.reason, target.id,
      ));
    }
  }

  for (const selection of state.spellbook) {
    const sourceId = targetFor(selection.path);
    if (sourceId === null) {
      notices.push(invalidSelectionNotice(
        'wizard_spellbook_entries', selection, selection.spellVersionId,
        'target_source_missing',
      ));
      continue;
    }
    const targetId = db.scalar<number>(
      `SELECT id FROM wizard_spellbook_entries
       WHERE source_instance_id = ? AND rule_key = ? AND ordinal = ?
         AND state = 'active'`,
      [sourceId, selection.ruleKey, selection.ordinal],
    );
    if (targetId === null) {
      notices.push(invalidSelectionNotice(
        'wizard_spellbook_entries', selection, selection.spellVersionId,
        'target_rule_missing',
      ));
      continue;
    }
    db.exec(
      `UPDATE wizard_spellbook_entries
       SET spell_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [selection.spellVersionId, targetId],
    );
    eligibility.refreshSpellbookAcquisition(targetId);
    const evaluation = db.one(
      `SELECT selection_eligibility, selection_invalid_reason
       FROM wizard_spellbook_entries WHERE id = ?`,
      [targetId],
      (row) => ({
        status: sqlString(row, 'selection_eligibility'),
        reason: sqlNullableString(row, 'selection_invalid_reason'),
      }),
    );
    if (evaluation?.status === 'invalid') {
      notices.push(invalidSelectionNotice(
        'wizard_spellbook_entries', selection, selection.spellVersionId,
        'selection_ineligible', evaluation.reason, targetId,
      ));
    }
  }

  for (const selection of state.skills) {
    const sourceId = targetFor(selection.path);
    if (sourceId === null) {
      notices.push(invalidSelectionNotice(
        'character_skill_grants', selection, selection.skill,
        'target_source_missing',
      ));
      continue;
    }
    const target = db.one(
      `SELECT id, skill FROM character_skill_grants
       WHERE source_instance_id = ? AND grant_key = ? AND ordinal = ?
         AND state = 'active'`,
      [sourceId, selection.ruleKey, selection.ordinal],
      (row) => ({
        id: sqlInteger(row, 'id'),
        skill: sqlNullableString(row, 'skill'),
      }),
    );
    if (target === null) {
      notices.push(invalidSelectionNotice(
        'character_skill_grants', selection, selection.skill,
        'target_rule_missing',
      ));
      continue;
    }
    if (target.skill === selection.skill) continue;
    // A background's printed proficiency is a regenerated fact. Every other
    // non-null row is a remembered choice on a revived target source; replace
    // that remembered choice with the selection from the source being
    // retargeted.
    if (target.skill !== null) {
      if (selection.ruleKey === SKILL_GRANT_KEYS.backgroundSkill) continue;
      fillSkillGrant(db, facts.character_id, target.id, null);
    }
    try {
      fillSkillGrant(db, facts.character_id, target.id, selection.skill);
    } catch (error) {
      if (!(error instanceof SkillGrantRefusal)) throw error;
      notices.push(invalidSelectionNotice(
        'character_skill_grants', selection, selection.skill,
        'selection_ineligible', error.reason,
      ));
    }
  }

  for (const selection of state.expertise) {
    const sourceId = targetFor(selection.path);
    if (sourceId === null) {
      notices.push(invalidSelectionNotice(
        'character_skill_expertise_grants', selection, selection.skill,
        'target_source_missing',
      ));
      continue;
    }
    const target = db.one(
      `SELECT id, skill FROM character_skill_expertise_grants
       WHERE source_instance_id = ? AND grant_key = ? AND ordinal = ?
         AND state = 'active'`,
      [sourceId, selection.ruleKey, selection.ordinal],
      (row) => ({
        id: sqlInteger(row, 'id'),
        skill: sqlNullableString(row, 'skill'),
      }),
    );
    if (target === null) {
      notices.push(invalidSelectionNotice(
        'character_skill_expertise_grants', selection, selection.skill,
        'target_rule_missing',
      ));
      continue;
    }
    if (target.skill === selection.skill) continue;
    try {
      if (target.skill !== null) {
        fillSkillExpertiseGrant(db, facts.character_id, target.id, null);
      }
      fillSkillExpertiseGrant(db, facts.character_id, target.id, selection.skill);
    } catch (error) {
      if (!(error instanceof SkillExpertiseGrantRefusal)) throw error;
      notices.push(invalidSelectionNotice(
        'character_skill_expertise_grants', selection, selection.skill,
        'selection_ineligible', error.reason,
      ));
    }
  }

  for (const choice of state.levelFeatChoices) {
    const targetSourceId = targetFor(choice.path);
    if (targetSourceId === null) {
      db.exec(
        `UPDATE character_level_feat_choices
         SET feat_source_instance_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [choice.id],
      );
      notices.push(Object.freeze({
        kind: 'retargeted_level_feat_invalid',
        source_path: choice.path,
        character_level_feat_choice_id: choice.id,
        reason: 'target_source_missing',
        repair: Object.freeze({
          kind: 'guided_character' as const,
          href: guidedBuildPath(facts.character_id),
          label: 'Review character',
        }),
      }));
      continue;
    }
    db.exec(
      `UPDATE character_level_feat_choices
       SET feat_source_instance_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND feat_source_instance_id = ?`,
      [targetSourceId, choice.id, choice.oldSourceId],
    );
  }
  return Object.freeze(notices);
}

function retargetCharacter(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  targetContentKey: ContentKey,
): { readonly revision: CharacterRevision; readonly notices: readonly ReplacementNotice[] } {
  const resolvedFacts = { ...facts, new_content_key: targetContentKey };
  let retargetState: RetargetState;
  let newRootId: number;
  switch (facts.content_kind) {
    case 'species': {
      const guidedSourceId = db.scalar<number>(
        `SELECT source.id
         FROM character_source_instances AS source
         JOIN species_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'species'
           AND source.state = 'active' AND source.notes = ?
           AND definition.content_key = ?`,
        [facts.character_id, GUIDED_SPECIES_SOURCE_MARKER, facts.old_content_key],
      );
      if (guidedSourceId === null) throw new Error('Species choices cannot be preserved.');
      retargetState = captureRetargetState(db, facts, guidedSourceId);
      retireDeletableGuidedSource(db, facts, guidedSourceId);
      applyGuidedOrigin(db, {
        character_id: facts.character_id,
        kind: 'species',
        content_key: targetContentKey,
      });
      const newSourceId = db.scalar<number>(
        `SELECT source.id
         FROM character_source_instances AS source
         JOIN species_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'species'
           AND source.state = 'active' AND source.notes = ?
           AND definition.content_key = ?`,
        [facts.character_id, GUIDED_SPECIES_SOURCE_MARKER, targetContentKey],
      );
      if (newSourceId === null) {
        throw new Error('Replacement species source is missing.');
      }
      newRootId = newSourceId;
      if (retargetState.rootConfig !== null) {
        const restoredConfig = parseJson<JsonObject>(
          retargetState.rootConfig,
          'Retargeted species config',
        );
        db.exec(
          `UPDATE character_source_instances SET config = ? WHERE id = ?`,
          [JSON.stringify({
            ...restoredConfig,
            source_content_key: targetContentKey,
          }), newRootId],
        );
        const generator = configuredChoiceSlotGenerator(db);
        generator.generateForSource(newRootId);
        reconcileCharacterLevelDependentSource(
          db,
          newRootId,
          generator,
        );
      }
      break;
    }
    case 'background': {
      const background = backgroundParams(db, resolvedFacts);
      const guidedSourceId = db.scalar<number>(
        `SELECT source.id
         FROM character_source_instances AS source
         JOIN background_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'background'
           AND source.state = 'active' AND source.notes = ?
           AND definition.content_key = ?`,
        [facts.character_id, GUIDED_BACKGROUND_SOURCE_MARKER, facts.old_content_key],
      );
      if (guidedSourceId === null) throw new Error('Background choices cannot be preserved.');
      retargetState = captureRetargetState(db, facts, guidedSourceId);
      retireDeletableGuidedSource(db, facts, guidedSourceId);
      applyGuidedBackgroundChoices(db, background.params);
      if (background.equipmentChoice !== null) {
        const source = db.one(
          `SELECT id, config FROM character_source_instances
           WHERE character_id = ? AND source_type = 'background'
             AND state = 'active' AND notes = ?`,
          [facts.character_id, GUIDED_BACKGROUND_SOURCE_MARKER],
          (row) => ({
            id: sqlInteger(row, 'id'),
            config: sqlNullableString(row, 'config'),
          }),
        );
        if (source === null || source.config === null) {
          throw new Error('Replacement background source is missing.');
        }
        const config = parseJson<JsonObject>(source.config, 'Replacement background config');
        db.exec(
          'UPDATE character_source_instances SET config = ? WHERE id = ?',
          [JSON.stringify({
            ...config,
            [EQUIPMENT_CHOICE_CONFIG_KEY]: background.equipmentChoice,
          }), source.id],
        );
      }
      const replacementSourceId = db.scalar<number>(
        `SELECT source.id
         FROM character_source_instances AS source
         JOIN background_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type = 'background'
           AND source.state = 'active' AND source.notes = ?
           AND definition.content_key = ?`,
        [facts.character_id, GUIDED_BACKGROUND_SOURCE_MARKER, targetContentKey],
      );
      if (replacementSourceId === null) throw new Error('Replacement background source is missing.');
      newRootId = replacementSourceId;
      break;
    }
    case 'subclass': {
      const level = db.one(
        `SELECT class_level.class_definition_id, class_level.level,
                class_level.subclass_definition_id
         FROM character_class_levels AS class_level
         JOIN subclass_definitions AS subclass
           ON subclass.id = class_level.subclass_definition_id
         WHERE class_level.character_id = ? AND subclass.content_key = ?`,
        [facts.character_id, facts.old_content_key],
        (row) => ({
          classId: sqlInteger(row, 'class_definition_id'),
          level: sqlInteger(row, 'level'),
          oldSubclassId: sqlInteger(row, 'subclass_definition_id'),
        }),
      );
      const target = db.one(
        'SELECT id, class_definition_id FROM subclass_definitions WHERE content_key = ?',
        [targetContentKey],
        (row) => ({
          id: sqlInteger(row, 'id'),
          classId: sqlInteger(row, 'class_definition_id'),
        }),
      );
      if (level === null || target === null || level.classId !== target.classId) {
        throw new Error('The replacement subclass belongs to another class.');
      }
      const oldSourceId = db.scalar<number>(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'subclass'
           AND source_definition_id = ? AND state = 'active'`,
        [facts.character_id, level.oldSubclassId],
      );
      if (oldSourceId === null) throw new Error('Replacement subclass source is missing.');
      retargetState = captureRetargetState(db, facts, oldSourceId);
      db.exec(
        `UPDATE character_class_levels
         SET subclass_definition_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE character_id = ? AND class_definition_id = ?
           AND subclass_definition_id = ?`,
        [target.id, facts.character_id, level.classId, level.oldSubclassId],
      );
      const generator = configuredChoiceSlotGenerator(db);
      syncSubclassSources(
        db,
        generator,
        facts.character_id,
        level.classId,
        target.id,
        level.level,
        'preserve-for-retarget',
      );
      const newSourceId = db.scalar<number>(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'subclass'
           AND source_definition_id = ? AND state = 'active'`,
        [facts.character_id, target.id],
      );
      if (newSourceId === null) throw new Error('Replacement subclass source is missing.');
      newRootId = newSourceId;
      reconcileCharacterLevelDependentSource(db, newRootId, generator);
      break;
    }
  }
  const notices = remapRetargetState(db, facts, retargetState, newRootId);
  const nextRevision = (Number(facts.character_revision) + 1) as CharacterRevision;
  const updated = db.exec(
    `UPDATE characters SET revision = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND revision = ?`,
    [nextRevision, facts.character_id, facts.character_revision],
  );
  if (updated.changes !== 1) throw new Error('Character revision changed.');
  return Object.freeze({ revision: nextRevision, notices });
}

type RetargetCharacterResult = ReturnType<typeof retargetCharacter>;

interface RetargetCharacterEvaluation extends RetargetCharacterResult {
  readonly afterSheet: CharacterSheet | null;
}

class RetargetPreviewRollback extends Error {
  constructor(readonly result: RetargetCharacterEvaluation) {
    super('Reference retarget preview rollback.');
  }
}

/**
 * Preview and commit execute the same replacement/remapping function. Preview's
 * only distinction is the outer rollback sentinel, so its invalidation result
 * cannot become a parallel predictor that drifts from the committed behavior.
 */
function evaluateRetargetCharacter(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  targetContentKey: ContentKey,
  mode: 'preview' | 'commit',
  includeAfterSheet = true,
): RetargetCharacterEvaluation {
  if (mode === 'commit') {
    return { ...retargetCharacter(db, facts, targetContentKey), afterSheet: null };
  }
  try {
    db.transaction(() => {
      const result = retargetCharacter(db, facts, targetContentKey);
      let afterSheet: CharacterSheet | null = null;
      if (includeAfterSheet) {
        try {
          afterSheet = new CharacterSheetBuilder(db).build(facts.character_id);
        } catch {
          afterSheet = null;
        }
      }
      throw new RetargetPreviewRollback({
        ...result,
        afterSheet,
      });
    });
  } catch (error) {
    if (error instanceof RetargetPreviewRollback) return error.result;
    if (error instanceof ReferenceRetargetError) throw error;
    throw new ReferenceRetargetError(
      'The replacement simulation was refused.',
      { reason: 'replacement_refused', refusal: 'commit_failed' },
      { cause: error },
    );
  }
  throw new Error('Reference retarget preview failed to roll back.');
}

export function commitReferenceRetarget(
  db: DatabaseContext,
  input: {
    readonly token: ReplacementPlanToken;
    readonly decisions: readonly ReplacementDecision[];
    readonly choices: readonly ReplacementChoiceSelection[];
  },
): ReplacementResult {
  const facts = decodedFacts(input.token);
  if (facts === null) {
    throw new ReferenceRetargetError('The replacement token is invalid.', {
      reason: 'invalid_reference',
    });
  }
  const preview = previewReferenceRetarget(db, {
    old_content_key: facts.old_content_key,
    new_content_key: facts.new_content_key,
    character_id: facts.character_id,
  }, false);
  if (preview.token !== input.token) {
    throw new ReferenceRetargetError('The replacement plan is stale.', {
      reason: 'stale_replacement_plan',
      character_id: facts.character_id,
      expected_revision: facts.character_revision,
      actual_revision: preview.facts.character_revision,
    });
  }
  assertNoUnimplementedChoices(input.choices);
  const choices = matchChoices(preview, input.decisions);
  const { node, plan } = importNodeAndPlan(db, facts, choices);
  const outcome = nonRefusedOutcome(plan);
  assertActiveReplacementTarget(db, facts.content_kind, outcome.contentKey);
  let revision: CharacterRevision | null = null;
  let notices: readonly ReplacementNotice[] = Object.freeze([]);
  const committed = commitContentImport(db, {
    nodes: [node],
    token: plan.token,
    choices,
    operationIdentity: operationIdentity(facts),
    afterInstall: (transaction) => {
      const retargeted = evaluateRetargetCharacter(
        transaction,
        facts,
        outcome.contentKey,
        'commit',
      );
      revision = retargeted.revision;
      notices = retargeted.notices;
    },
  });
  if (committed.kind !== 'committed' || revision === null) {
    throw new ReferenceRetargetError('The replacement transaction was refused.', {
      reason: 'replacement_refused',
      refusal: 'commit_failed',
    });
  }
  return Object.freeze({
    content_kind: facts.content_kind,
    character_id: facts.character_id,
    character_revision: revision,
    old_content_key: facts.old_content_key,
    new_content_key: outcome.contentKey,
    notices,
  });
}
