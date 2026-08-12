import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
import { sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  assertedExternalContentKey,
  normalizeCatalogKeyComponent,
} from '../catalog/catalog-key';
import {
  type ContentImportChoices,
  type ContentImportEntryOutcome,
  type ContentImportNode,
  type ContentImportProjection,
} from '../catalog/content-adoption';
import {
  CatalogSupersessionRefusal,
  commitImmutableCatalogPublication,
  planImmutableCatalogPublication,
} from '../catalog/authoring-lifecycle';
import { deriveContentIdentityV1 } from '../catalog/content-identity';
import { portableSourceContentImportNode } from '../catalog/source-content-importer';
import {
  authoredContentProvenance,
  recordContentProvenance,
} from '../catalog/content-provenance';
import { projectAuthoredContentAggregateV1 } from '../catalog/stored-authored-content-projector-v1';
import type { ContentKey } from '../domain/ids';
import { GrantRule } from '../grants/grant-rule';
import type {
  AuthoringValidationIssue,
  BackgroundAuthoringDraft,
  BackgroundAuthoringDraftEquipment,
  BackgroundContentAggregate,
  BackgroundContentEquipment,
  PublishDecision,
  PublishPreview,
  PublishResult,
  StoredHomebrewDraft,
} from './contracts';
import type { HomebrewDraftUuid, PublishPlanToken } from './ids';
import {
  authoringFingerprintReference,
  authoringIssue,
  authoringNonEmpty,
  resolvedAuthoringEffect,
} from './species-publisher';

export class BackgroundSemanticValidationError extends Error {
  constructor(readonly issues: readonly AuthoringValidationIssue[]) {
    super('Background draft semantic validation failed.');
    this.name = 'BackgroundSemanticValidationError';
  }
}

export type BackgroundPublishRefusal =
  | { readonly reason: 'content_key_collision'; readonly content_key: ContentKey }
  | { readonly reason: 'publish_refused'; readonly refusal: string }
  | { readonly reason: 'publish_review_required'; readonly candidates: readonly ContentKey[] }
  | { readonly reason: 'stale_publish_plan'; readonly draft_uuid: HomebrewDraftUuid }
  | { readonly reason: 'invalid_reference' };

export class BackgroundPublishError extends Error {
  constructor(message: string, readonly data: BackgroundPublishRefusal) {
    super(message);
    this.name = 'BackgroundPublishError';
  }
}

function equipmentReference(
  db: DatabaseContext,
  draft: BackgroundAuthoringDraftEquipment,
  index: number,
  option: 'equipment_option_a' | 'equipment_option_b',
  issues: AuthoringValidationIssue[],
): BackgroundContentEquipment | null {
  const path = [option, index] as const;
  const nameReady = authoringNonEmpty(draft.printed_name, [...path, 'printed_name'], issues);
  if (draft.quantity === null) {
    authoringIssue(issues, [...path, 'quantity'], 'required', 'Quantity is required.');
  }
  switch (draft.kind) {
    case 'gear': {
      if (!nameReady || draft.quantity === null) return null;
      return {
        kind: draft.kind,
        sort_order: index + 1,
        quantity: draft.quantity,
        printed_name: draft.printed_name,
      };
    }
    case 'weapon': {
      if (draft.content_key === null) {
        authoringIssue(issues, [...path, 'content_key'], 'required', 'Weapon is required.');
        return null;
      }
      const content = authoringFingerprintReference(db, 'weapon', draft.content_key);
      if (content === null) {
        authoringIssue(issues, [...path, 'content_key'], 'unresolved_reference', 'Weapon content key does not resolve to one current fingerprint.');
        return null;
      }
      if (!nameReady || draft.quantity === null) return null;
      return {
        kind: draft.kind, sort_order: index + 1, quantity: draft.quantity,
        printed_name: draft.printed_name, content,
      };
    }
    case 'armor': {
      if (draft.content_key === null) {
        authoringIssue(issues, [...path, 'content_key'], 'required', 'Armor is required.');
        return null;
      }
      const content = authoringFingerprintReference(db, 'armor', draft.content_key);
      if (content === null) {
        authoringIssue(issues, [...path, 'content_key'], 'unresolved_reference', 'Armor content key does not resolve to one current fingerprint.');
        return null;
      }
      if (!nameReady || draft.quantity === null) return null;
      return {
        kind: draft.kind, sort_order: index + 1, quantity: draft.quantity,
        printed_name: draft.printed_name, content,
      };
    }
  }
}

function duplicateDraftItemUuids(
  draft: BackgroundAuthoringDraft,
  issues: AuthoringValidationIssue[],
): void {
  const seen = new Set<string>();
  const inspect = (value: string, path: readonly (string | number)[]) => {
    if (seen.has(value)) authoringIssue(issues, path, 'duplicate', 'Draft item UUID must be unique.');
    seen.add(value);
  };
  draft.equipment_option_a.forEach((item, index) => inspect(item.draft_item_uuid, ['equipment_option_a', index, 'draft_item_uuid']));
  draft.equipment_option_b.forEach((item, index) => inspect(item.draft_item_uuid, ['equipment_option_b', index, 'draft_item_uuid']));
  draft.effects.forEach((effect, index) => inspect(effect.draft_item_uuid, ['effects', index, 'draft_item_uuid']));
}

export function backgroundDraftToAggregate(
  db: DatabaseContext,
  draft: BackgroundAuthoringDraft,
): BackgroundContentAggregate {
  const issues: AuthoringValidationIssue[] = [];
  authoringNonEmpty(draft.name, ['name'], issues);
  if (draft.rules_edition === null) authoringIssue(issues, ['rules_edition'], 'required', 'Rules edition is required.');
  if (draft.suggested_abilities.length !== 3) {
    authoringIssue(issues, ['suggested_abilities'], 'required', 'Exactly three suggested abilities are required.');
  }
  if (new Set(draft.suggested_abilities).size !== draft.suggested_abilities.length) {
    authoringIssue(issues, ['suggested_abilities'], 'duplicate', 'Suggested abilities must not repeat.');
  }
  if (draft.skill_proficiencies.length !== 2) {
    authoringIssue(issues, ['skill_proficiencies'], 'required', 'Exactly two skill proficiencies are required.');
  }
  if (new Set(draft.skill_proficiencies).size !== draft.skill_proficiencies.length) {
    authoringIssue(issues, ['skill_proficiencies'], 'duplicate', 'Skill proficiencies must not repeat.');
  }
  authoringNonEmpty(draft.equipment_option_a_description, ['equipment_option_a_description'], issues);
  authoringNonEmpty(draft.equipment_option_b_description, ['equipment_option_b_description'], issues);
  duplicateDraftItemUuids(draft, issues);

  let defaultOriginFeat = null;
  let defaultOriginFeatDisplayName = null;
  if (draft.default_origin_feat_content_key === null) {
    authoringIssue(issues, ['default_origin_feat_content_key'], 'required', 'Default Origin feat is required.');
  } else {
    const feat = db.one(
      `SELECT category, name, rules_edition
       FROM feat_definitions WHERE content_key = ?`,
      [draft.default_origin_feat_content_key],
      (row) => ({
        category: sqlString(row, 'category'),
        name: sqlString(row, 'name'),
        rulesEdition: sqlString(row, 'rules_edition'),
      }),
    );
    defaultOriginFeat =
      feat?.category === 'origin' &&
      feat.rulesEdition === draft.rules_edition
        ? authoringFingerprintReference(db, 'feat', draft.default_origin_feat_content_key)
        : null;
    defaultOriginFeatDisplayName = draft.default_origin_feat_display_name === null
      ? feat?.name ?? null
      : draft.default_origin_feat_display_name.trim();
    if (defaultOriginFeatDisplayName === '') {
      authoringIssue(issues, ['default_origin_feat_display_name'], 'required', 'Default Origin feat display name must not be empty.');
      defaultOriginFeatDisplayName = null;
    }
    if (defaultOriginFeat === null) {
      authoringIssue(issues, ['default_origin_feat_content_key'], 'unresolved_reference', 'Default Origin feat must resolve to one current Origin-feat fingerprint.');
    }
  }

  const optionA = draft.equipment_option_a.flatMap((item, index) => {
    const resolved = equipmentReference(db, item, index, 'equipment_option_a', issues);
    return resolved === null ? [] : [resolved];
  });
  const optionB = draft.equipment_option_b.flatMap((item, index) => {
    const resolved = equipmentReference(db, item, index, 'equipment_option_b', issues);
    return resolved === null ? [] : [resolved];
  });
  const effects = draft.effects.flatMap((effect, index) => {
    const resolved = resolvedAuthoringEffect(effect, index + 1, ['effects', index], issues);
    return resolved === null ? [] : [resolved];
  });
  if (issues.length > 0 || draft.rules_edition === null ||
      draft.default_origin_feat_content_key === null || defaultOriginFeat === null ||
      defaultOriginFeatDisplayName === null ||
      draft.suggested_abilities.length !== 3 || draft.skill_proficiencies.length !== 2) {
    throw new BackgroundSemanticValidationError(Object.freeze(issues));
  }
  const backgroundSlug = normalizeCatalogKeyComponent(draft.name);
  const {
    selection_collection: _selectionCollection,
    ...originFeatGrant
  } = GrantRule.fromObject({
    kind: 'grant_source',
    rule_key: `${backgroundSlug}-origin-feat`,
    source_type: 'feat',
    definition_key_config: 'origin_feat_key',
    child_config_config: 'origin_feat_config',
  }).toObject();
  return Object.freeze({
    kind: 'background',
    name: draft.name.trim(),
    rules_edition: draft.rules_edition,
    reference_text: draft.reference_text,
    repeatable: false,
    grants: Object.freeze([
      originFeatGrant as unknown as BackgroundContentAggregate['grants'][number],
    ]),
    suggested_abilities: [
      draft.suggested_abilities[0]!,
      draft.suggested_abilities[1]!,
      draft.suggested_abilities[2]!,
    ] as const,
    default_origin_feat_content_key: draft.default_origin_feat_content_key,
    default_origin_feat: defaultOriginFeat,
    default_origin_feat_display_name: defaultOriginFeatDisplayName,
    skill_proficiencies: [
      draft.skill_proficiencies[0]!,
      draft.skill_proficiencies[1]!,
    ] as const,
    tool_reference_text: draft.tool_reference_text === '' ? null : draft.tool_reference_text,
    equipment_option_a_description: draft.equipment_option_a_description,
    equipment_option_b_description: draft.equipment_option_b_description,
    equipment_option_a: Object.freeze(optionA),
    equipment_option_b: Object.freeze(optionB),
    effects: Object.freeze(effects),
  });
}

function assertedKeyFor(aggregate: BackgroundContentAggregate): ContentKey {
  try {
    return assertedExternalContentKey(aggregate.kind, aggregate.rules_edition, aggregate.name);
  } catch (error) {
    throw new BackgroundSemanticValidationError([Object.freeze({
      path: Object.freeze(['name']),
      code: 'invalid_value',
      message: error instanceof Error ? error.message : 'Name cannot produce a content key.',
    })]);
  }
}

function operationIdentity(draft: StoredHomebrewDraft, aggregate: BackgroundContentAggregate): string {
  return sha256(canonicalJson({
    operation: 'authoring.publish.background',
    draft_uuid: draft.draft_uuid,
    draft_revision: draft.revision,
    aggregate,
  }));
}

function authoringNode(
  db: DatabaseContext,
  aggregate: BackgroundContentAggregate,
  contentKey: ContentKey,
): ContentImportNode {
  const portable = portableSourceContentImportNode(db, aggregate, contentKey);
  const withoutRemembered = (projection: ContentImportProjection): ContentImportProjection => ({
    ...projection,
    kind: 'background',
    allowRememberedDecision: false,
  });
  const base = { id: portable.id, projection: withoutRemembered(portable.projection) };
  if (portable.reproject === undefined) return Object.freeze(base);
  const reproject = portable.reproject;
  return Object.freeze({
    ...base,
    reproject: (input: Parameters<typeof reproject>[0]) =>
      withoutRemembered(reproject({ ...input, dependencies: new Map() })),
  });
}

function encodedToken(
  draft: StoredHomebrewDraft,
  aggregate: BackgroundContentAggregate,
  importToken: string,
): PublishPlanToken {
  const digest = sha256(canonicalJson({
    operation_identity: operationIdentity(draft, aggregate),
    import_plan_token: importToken,
  }));
  return JSON.stringify([draft.draft_uuid, digest]) as PublishPlanToken;
}

export function previewBackgroundPublish(
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
): PublishPreview {
  if (draft.content_kind !== 'background' || draft.document.kind !== 'background') {
    throw new BackgroundPublishError('HA-4 publishes background drafts only.', { reason: 'invalid_reference' });
  }
  const aggregate = backgroundDraftToAggregate(db, draft.document);
  const assertedKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, assertedKey);
  const plan = planImmutableCatalogPublication(db, {
    node,
    operationIdentity: operationIdentity(draft, aggregate),
  });
  const collision = plan.reviews.find((review) => review.matchClass === 'key-collision');
  if (collision !== undefined) {
    throw new BackgroundPublishError('The asserted background key already names different content.', {
      reason: 'content_key_collision',
      content_key: collision.targetContentKey,
    });
  }
  const refused = plan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (refused?.kind === 'refused') {
    throw new BackgroundPublishError('The background publisher refused the aggregate.', {
      reason: 'publish_refused', refusal: refused.reason,
    });
  }
  const projected = projectAuthoredContentAggregateV1(aggregate);
  const identity = deriveContentIdentityV1({
    kind: aggregate.kind,
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  const candidateKeys = [...new Set(plan.outcomes.flatMap((outcome) =>
    outcome.kind === 'refused' ? [] : [outcome.contentKey]))];
  return Object.freeze({
    token: encodedToken(draft, aggregate, plan.token),
    facts: Object.freeze({
      draft_uuid: draft.draft_uuid,
      draft_revision: draft.revision,
      content_kind: 'background',
      canonical_json: identity.canonicalJson,
      candidate_content_keys: Object.freeze(candidateKeys),
      candidate_identities: Object.freeze([{
        kind: 'background' as const,
        scheme: identity.envelope.scheme,
        digest: identity.digest,
      }]),
    }),
    aggregate,
    review: Object.freeze(plan.reviews.map((review) => {
      if (
        review.matchClass === 'key-collision' ||
        review.matchClass === 'installed-target'
      ) {
        throw new BackgroundPublishError('The asserted background key already names different content.', {
          reason: 'content_key_collision', content_key: review.targetContentKey,
        });
      }
      return Object.freeze({
        candidate_content_key: review.targetContentKey,
        candidate_name: review.localName,
        candidate_catalog_layer: review.localCatalogLayer,
        reason: review.matchClass,
        default_decision: 'match' as const,
      });
    })),
  });
}

function choicesFor(
  preview: PublishPreview,
  decisions: readonly PublishDecision[],
  nodeId: string,
): ContentImportChoices {
  if (preview.review.length === 0) {
    if (decisions.length !== 0) throw new BackgroundPublishError('This publish has no review decision to apply.', { reason: 'invalid_reference' });
    return Object.freeze({});
  }
  const review = preview.review[0]!;
  const matching = decisions.filter((decision) => decision.candidate_content_key === review.candidate_content_key);
  if (decisions.length !== 1 || matching.length !== 1) {
    throw new BackgroundPublishError('Publish adoption review is required.', {
      reason: 'publish_review_required',
      candidates: preview.review.map((item) => item.candidate_content_key),
    });
  }
  const decision = matching[0]!;
  return Object.freeze({
    [nodeId]: decision.decision === 'match'
      ? Object.freeze({ decision: 'match' as const })
      : Object.freeze({ decision: 'clone' as const, cloneName: decision.clone_name }),
  });
}

function publishedResultRow(
  db: DatabaseContext,
  contentKey: ContentKey,
): { readonly name: string; readonly catalog_layer: PublishResult['catalog_layer'] } {
  const row = db.oneRaw(
    `SELECT background.name, identity.catalog_layer
     FROM background_definitions AS background
     JOIN catalog_content_identities AS identity
       ON identity.content_kind = 'background'
      AND identity.content_key = background.content_key
     WHERE background.content_key = ?`,
    [contentKey],
  );
  if (row === null || typeof row.name !== 'string' ||
      (row.catalog_layer !== 'bundled' && row.catalog_layer !== 'external')) {
    throw new BackgroundPublishError('Published background result cannot be resolved.', {
      reason: 'publish_refused', refusal: 'missing_result',
    });
  }
  return { name: row.name, catalog_layer: row.catalog_layer };
}

export function commitBackgroundPublish(
  db: DatabaseContext,
  draft: StoredHomebrewDraft,
  token: PublishPlanToken,
  decisions: readonly PublishDecision[],
  previousKeyUsageCount: number,
): PublishResult {
  const preview = previewBackgroundPublish(db, draft);
  if (preview.token !== token || preview.aggregate.kind !== 'background') {
    throw new BackgroundPublishError('The publish plan is stale.', {
      reason: 'stale_publish_plan', draft_uuid: draft.draft_uuid,
    });
  }
  const aggregate = preview.aggregate;
  const assertedKey = assertedKeyFor(aggregate);
  const node = authoringNode(db, aggregate, assertedKey);
  const choices = choicesFor(preview, decisions, node.id);
  const operation = operationIdentity(draft, aggregate);
  const publication = {
    node,
    operationIdentity: operation,
    supersedesContentKey: draft.base_content_key,
    afterInstall: (transaction: DatabaseContext, outcome: ContentImportEntryOutcome) => {
      if (outcome.kind === 'create' || outcome.kind === 'remembered-clone') {
        recordContentProvenance(transaction, {
          kind: 'background', contentKey: outcome.contentKey,
          provenance: authoredContentProvenance(
            transaction, 'background', draft.base_content_key,
          ),
        });
      }
      const deleted = transaction.exec(
        'DELETE FROM catalog_content_drafts WHERE draft_uuid = ? AND revision = ?',
        [draft.draft_uuid, draft.revision],
      );
      if (deleted.changes !== 1) throw new Error('Draft changed before publish commit.');
    },
  } as const;
  const chosenPlan = planImmutableCatalogPublication(db, publication, choices);
  const chosenRefusal = chosenPlan.outcomes.find((outcome) => outcome.kind === 'refused');
  if (chosenRefusal?.kind === 'refused') {
    if (chosenRefusal.reason === 'clone_key_collision') {
      throw new BackgroundPublishError('The cloned background key collides with installed content.', {
        reason: 'content_key_collision', content_key: assertedKey,
      });
    }
    throw new BackgroundPublishError('The chosen background publish was refused.', {
      reason: 'publish_refused', refusal: chosenRefusal.reason,
    });
  }
  let committed;
  try {
    committed = commitImmutableCatalogPublication(db, publication, {
      token: chosenPlan.token,
      choices,
    });
  } catch (error) {
    if (error instanceof CatalogSupersessionRefusal) {
      throw new BackgroundPublishError(error.message, {
        reason: 'publish_refused',
        refusal: error.reason,
      });
    }
    throw error;
  }
  if (committed.kind === 'stale-plan') {
    throw new BackgroundPublishError('The publish plan is stale.', {
      reason: 'stale_publish_plan', draft_uuid: draft.draft_uuid,
    });
  }
  if (committed.kind === 'refused') {
    throw new BackgroundPublishError('The background publish transaction was refused.', {
      reason: 'publish_refused', refusal: committed.reason,
    });
  }
  const outcome = committed.outcomes[0];
  if (outcome === undefined || outcome.kind === 'refused') {
    throw new BackgroundPublishError('The background publisher returned no result.', {
      reason: 'publish_refused', refusal: 'missing_outcome',
    });
  }
  const result = publishedResultRow(db, outcome.contentKey);
  return outcome.kind === 'create' || outcome.kind === 'remembered-clone'
    ? Object.freeze({
        outcome: 'created', content_key: outcome.contentKey, name: result.name,
        catalog_layer: 'external', previous_key_usage_count: previousKeyUsageCount,
      })
    : Object.freeze({
        outcome: 'matched_existing', content_key: outcome.contentKey,
        name: result.name, catalog_layer: result.catalog_layer,
        previous_key_usage_count: previousKeyUsageCount,
      });
}
