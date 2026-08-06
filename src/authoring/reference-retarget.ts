import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import {
  parseJson,
  sqlInteger,
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
import { abilities, isEnumValue, skills, type Skill } from '../domain/enums';
import {
  commitContentImport,
  planContentImport,
  type ContentImportChoices,
  type ContentImportEntryOutcome,
  type ContentImportNode,
  type ContentImportPlan,
} from '../catalog/content-adoption';
import { resolveContentReference } from '../catalog/content-registry';
import { localContentReferenceImportNode } from '../backup/portable-content';
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
import { fillSkillGrant } from '../grants/skill-grants';
import { syncSubclassSources } from '../commands/update-class';
import { EQUIPMENT_CHOICE_CONFIG_KEY } from '../builder/contracts';
import type {
  AuthoredContentKind,
  AuthoringErrorData,
  ReplacementChoiceSelection,
  ReplacementDecision,
  ReplacementPlan,
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
    `SELECT content_kind, catalog_layer
     FROM catalog_content_identities
     WHERE content_key = ? AND content_kind IN ('species', 'background', 'subclass')`,
    [input.oldContentKey],
    (row) => ({
      kind: authoredKind(sqlString(row, 'content_kind')),
      layer: sqlString(row, 'catalog_layer'),
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
  const character = db.one(
    'SELECT name, revision FROM characters WHERE id = ?',
    [input.characterId],
    (row) => ({
      name: sqlString(row, 'name'),
      revision: sqlInteger(row, 'revision') as CharacterRevision,
    }),
  );
  if (character === null) {
    throw new ReferenceRetargetError('The character was not found.', {
      reason: 'character_not_found',
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
  const node = localContentReferenceImportNode(db, {
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

function planShape(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  characterName: string,
  plan: ContentImportPlan,
): ReplacementPlan {
  const outcome = nonRefusedOutcome(plan);
  const oldName = targetName(db, facts.content_kind, facts.old_content_key);
  const newName = targetName(db, facts.content_kind, outcome.contentKey);
  const common = {
    token: encodedToken(facts, plan.token),
    facts,
    character_name: characterName,
    changes: Object.freeze([Object.freeze({
      path: Object.freeze(['content_key']),
      label: `${facts.content_kind} content reference`,
      before: oldName,
      after: newName,
    })]),
    required_choices: Object.freeze([]),
    review: Object.freeze(plan.reviews.map((row) => Object.freeze({
      candidate_content_key: row.targetContentKey,
      candidate_name: row.localName,
      reason: row.matchClass,
      default_decision: 'match' as const,
    }))),
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
  return planShape(db, facts, reference.characterName, plan);
}

function matchChoices(
  preview: ReplacementPlan,
  decisions: readonly ReplacementDecision[],
): ContentImportChoices {
  const candidates = preview.review.map((item) => item.candidate_content_key);
  if (
    decisions.length !== candidates.length ||
    new Set(decisions.map((decision) => decision.candidate_content_key)).size !== decisions.length ||
    decisions.some((decision) =>
      decision.decision !== 'match' ||
      !candidates.includes(decision.candidate_content_key))
  ) {
    throw new ReferenceRetargetError('Explicit review decisions are required.', {
      reason: 'replacement_review_required',
      candidates,
    });
  }
  return candidates.length === 0
    ? Object.freeze({})
    : Object.freeze({ [NODE_ID]: Object.freeze({ decision: 'match' as const }) });
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

function speciesSelections(
  db: DatabaseContext,
  characterId: CharacterId,
  sourceId: number,
): readonly {
  readonly grantKey: string;
  readonly ordinal: number;
  readonly skill: Skill;
}[] {
  return db.all(
    `SELECT grant_key, ordinal, skill
     FROM character_skill_grants
     WHERE character_id = ? AND source_instance_id = ?
       AND state = 'active' AND skill IS NOT NULL
     ORDER BY grant_key, ordinal`,
    [characterId, sourceId],
    (row) => {
      const skill = sqlString(row, 'skill');
      if (!isEnumValue(skills, skill)) {
        throw new TypeError('Stored species skill choice is unknown.');
      }
      return {
        grantKey: sqlString(row, 'grant_key'),
        ordinal: sqlInteger(row, 'ordinal'),
        skill,
      };
    },
  );
}

function retargetCharacter(
  db: DatabaseContext,
  facts: ReplacementTokenFacts,
  targetContentKey: ContentKey,
): CharacterRevision {
  const resolvedFacts = { ...facts, new_content_key: targetContentKey };
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
      const selections = speciesSelections(db, facts.character_id, guidedSourceId);
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
      if (newSourceId === null && selections.length > 0) {
        throw new Error('Replacement species has no compatible grant source.');
      }
      for (const selection of selections) {
        const grantId = db.scalar<number>(
          `SELECT id FROM character_skill_grants
           WHERE character_id = ? AND source_instance_id = ?
             AND grant_key = ? AND ordinal = ? AND state = 'active'`,
          [facts.character_id, newSourceId, selection.grantKey, selection.ordinal],
        );
        if (grantId === null) throw new Error('Replacement species choice is no longer valid.');
        fillSkillGrant(db, facts.character_id, grantId, selection.skill);
      }
      break;
    }
    case 'background': {
      const background = backgroundParams(db, resolvedFacts);
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
      db.exec(
        `UPDATE character_class_levels
         SET subclass_definition_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE character_id = ? AND class_definition_id = ?
           AND subclass_definition_id = ?`,
        [target.id, facts.character_id, level.classId, level.oldSubclassId],
      );
      syncSubclassSources(
        db,
        new GrantRuleSlotGenerator(db),
        facts.character_id,
        level.classId,
        target.id,
        level.level,
      );
      if (oldSourceId !== null) {
        const newSourceId = db.scalar<number>(
          `SELECT id FROM character_source_instances
           WHERE character_id = ? AND source_type = 'subclass'
             AND source_definition_id = ? AND state = 'active'`,
          [facts.character_id, target.id],
        );
        if (newSourceId === null) throw new Error('Replacement subclass source is missing.');
        db.exec(
          `UPDATE character_effects SET source_instance_id = ?
           WHERE character_id = ? AND source_instance_id = ? AND template_ref IS NULL`,
          [newSourceId, facts.character_id, oldSourceId],
        );
      }
      break;
    }
  }
  const nextRevision = (Number(facts.character_revision) + 1) as CharacterRevision;
  const updated = db.exec(
    `UPDATE characters SET revision = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND revision = ?`,
    [nextRevision, facts.character_id, facts.character_revision],
  );
  if (updated.changes !== 1) throw new Error('Character revision changed.');
  return nextRevision;
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
  });
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
  let revision: CharacterRevision | null = null;
  const committed = commitContentImport(db, {
    nodes: [node],
    token: plan.token,
    choices,
    operationIdentity: operationIdentity(facts),
    afterInstall: (transaction) => {
      revision = retargetCharacter(transaction, facts, outcome.contentKey);
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
  });
}
